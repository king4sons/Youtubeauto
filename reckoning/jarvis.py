#!/usr/bin/env python3
"""
Reckoning — a personal voice assistant.

Loop: wake word -> record -> transcribe (local Whisper) -> Claude -> speak (ElevenLabs)

Run:
    python3 jarvis.py

Stop:
    Ctrl+C, or say "goodbye reckoning"
"""
import os
import sys
import time
import wave
import queue
import signal
import tempfile
import threading
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import numpy as np
import sounddevice as sd
import openwakeword
from openwakeword.model import Model as WakeModel
from faster_whisper import WhisperModel
import anthropic
import requests

from memory_store import MemoryStore
from context import build_system_prompt
from app_launcher import open_app, list_allowed_apps
import youtube_research
import fact_checker
import reddit_research

# ---------- Config ----------
SAMPLE_RATE = 16000
WAKE_WORD_MODEL = "hey_jarvis"  # placeholder model; see SETUP.md to swap in a custom "reckoning" model
SILENCE_THRESHOLD = 500          # RMS threshold to detect end-of-speech
SILENCE_DURATION = 1.2           # seconds of quiet before we stop recording
MAX_RECORD_SECONDS = 30
WHISPER_MODEL_SIZE = "small"     # good speed/accuracy tradeoff on Apple Silicon
ELEVENLABS_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "")  # set in .env
EXIT_PHRASES = ("goodbye reckoning", "shut down reckoning", "stop listening")

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
REDDIT_CLIENT_ID = os.environ.get("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET = os.environ.get("REDDIT_CLIENT_SECRET", "")

if not ANTHROPIC_API_KEY:
    sys.exit("Missing ANTHROPIC_API_KEY. Set it in your .env (see SETUP.md).")
if not ELEVENLABS_API_KEY or not ELEVENLABS_VOICE_ID:
    print("[warn] ElevenLabs not fully configured — falling back to macOS `say` for voice output.")
if not YOUTUBE_API_KEY:
    print("[info] YouTube not configured — comment idea-mining tool is disabled (optional, see SETUP.md).")
if not (REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET):
    print("[info] Reddit not configured — subreddit research tool is disabled (optional, see SETUP.md).")

claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
memory = MemoryStore(Path(__file__).parent / "memory" / "reckoning.db")

MIC_STATUS_FILE = Path(__file__).parent / "memory" / "mic_status.txt"


def set_mic_status(state: str):
    """
    Writes current state to a small heartbeat file so dashboard_server.py
    can report what Reckoning is doing right now. States: idle, listening,
    thinking, speaking, offline.
    """
    try:
        MIC_STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
        MIC_STATUS_FILE.write_text(state)
    except Exception:
        pass  # heartbeat is best-effort, never block the assistant on it


_running = True


def handle_sigint(*_):
    global _running
    print("\n[reckoning] shutting down...")
    _running = False


signal.signal(signal.SIGINT, handle_sigint)


# ---------- Audio capture ----------
def record_until_silence() -> Path:
    """Record from the mic until the user stops talking, return path to a wav file."""
    print("[reckoning] listening...")
    frames = []
    silence_chunks = 0
    chunk_size = 1024
    silence_chunk_target = int(SILENCE_DURATION * SAMPLE_RATE / chunk_size)
    started_talking = False

    with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="int16") as stream:
        start = time.time()
        while time.time() - start < MAX_RECORD_SECONDS:
            chunk, _ = stream.read(chunk_size)
            frames.append(chunk.copy())
            rms = np.sqrt(np.mean(chunk.astype(np.float32) ** 2))

            if rms > SILENCE_THRESHOLD:
                started_talking = True
                silence_chunks = 0
            elif started_talking:
                silence_chunks += 1
                if silence_chunks >= silence_chunk_target:
                    break

    audio = np.concatenate(frames, axis=0)
    tmp_path = Path(tempfile.mktemp(suffix=".wav"))
    with wave.open(str(tmp_path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(audio.tobytes())
    return tmp_path


# ---------- Speech to text ----------
_whisper = None


def get_whisper():
    global _whisper
    if _whisper is None:
        print("[reckoning] loading whisper model (first run only, ~30s)...")
        _whisper = WhisperModel(WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")
    return _whisper


def transcribe(wav_path: Path) -> str:
    model = get_whisper()
    segments, _ = model.transcribe(str(wav_path), language="en")
    text = " ".join(seg.text.strip() for seg in segments)
    wav_path.unlink(missing_ok=True)
    return text.strip()


# ---------- Tools Claude can call ----------
TOOLS = [
    {
        "name": "open_app",
        "description": (
            "Open a whitelisted application on Haneef's Mac. This is the ONLY way to "
            "interact with his computer — there is no file access, no keystroke "
            "simulation, no clicking. Only use this when Haneef clearly asks you to "
            "open a specific app (e.g. 'open Obsidian', 'pull up Claude desktop')."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "app_name": {
                    "type": "string",
                    "description": f"One of: {', '.join(list_allowed_apps())}",
                }
            },
            "required": ["app_name"],
        },
    },
    {
        "name": "fact_check_script",
        "description": (
            "Fact-check a draft script for The Reckoning Files. Pulls out concrete "
            "factual claims (names, dates, events, numbers, quoted statements) and "
            "verifies each against real sources found via live web search — not "
            "recalled from memory. Returns a claim-by-claim VERIFIED / DISPUTED / "
            "UNVERIFIED report. READ-ONLY — it only searches and reads, never posts "
            "or publishes anything. Use this when Haneef asks you to fact-check, "
            "verify, or source-check a script he pastes or sends you. This is a "
            "research aid, not a legal clearance — say so if he's asking about "
            "something with real defamation or legal risk."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "script_text": {
                    "type": "string",
                    "description": "The script (or excerpt) to fact-check.",
                }
            },
            "required": ["script_text"],
        },
    },
]

if YOUTUBE_API_KEY:
    TOOLS.append({
        "name": "mine_video_ideas",
        "description": (
            "Fetch public comments from a YouTube video on The Reckoning Files and "
            "have you (Claude) synthesize recurring themes, audience requests, and "
            "3-5 concrete new video topic ideas grounded in what viewers are actually "
            "asking for. This is READ-ONLY — it can never post, reply to, or moderate "
            "a comment. Use this when Haneef asks things like 'what are people saying "
            "on my last video' or 'mine some video ideas from the comments'. If he "
            "doesn't name a specific video, leave video_id blank to use the most "
            "recent upload on his configured channel."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "video_id": {
                    "type": "string",
                    "description": "YouTube video ID. Leave blank to use the most recent upload.",
                }
            },
            "required": [],
        },
    })

if REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET:
    TOOLS.append({
        "name": "mine_reddit_ideas",
        "description": (
            "Search a subreddit for posts and discussion relevant to The Reckoning "
            "Files (true-crime / dark-storytelling) and have you (Claude) synthesize "
            "case summaries, discussion themes, and concrete new video topic ideas. "
            "This is READ-ONLY — it uses Reddit's official app-only API, never logs "
            "into a personal account, and can never post, comment, vote, or moderate "
            "anything. Use this when Haneef asks things like 'find me cases from "
            "r/UnresolvedMysteries' or 'mine story ideas from r/truecrime'. "
            "subreddit is required; query is optional — leave it blank to pull that "
            "subreddit's current top posts instead of searching for something specific."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "subreddit": {
                    "type": "string",
                    "description": "Subreddit name, without 'r/' (e.g. 'UnresolvedMysteries').",
                },
                "query": {
                    "type": "string",
                    "description": "Optional search term within that subreddit. Leave blank for top posts.",
                },
            },
            "required": ["subreddit"],
        },
    })


def verify_digest_grounded(comments: list[str], digest: str) -> tuple[bool, str]:
    """Self-check: does the digest's analysis actually trace back to the real
    comments, or did the first pass invent themes that aren't really there?
    This is a visible check, not a silent one — its result is always surfaced."""
    comment_block = "\n".join(f"- {c}" for c in comments)
    check = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        messages=[{
            "role": "user",
            "content": (
                "You will check whether an analysis is actually grounded in its "
                "source material, not invented.\n\n"
                f"SOURCE COMMENTS:\n{comment_block}\n\n"
                f"ANALYSIS TO CHECK:\n{digest}\n\n"
                "Does every theme, sentiment claim, and topic idea in the analysis "
                "trace back to something actually present in the source comments "
                "(directly, or as a reasonable inference)? Respond with exactly one "
                "line starting with either 'GROUNDED' or 'UNGROUNDED', followed by a "
                "colon and a short reason."
            ),
        }],
    )
    result_text = "".join(b.text for b in check.content if b.type == "text").strip()
    return result_text.upper().startswith("GROUNDED"), result_text


def mine_video_ideas(video_id: str = "") -> str:
    resolved_id = youtube_research.resolve_video_id(video_id)
    comments = youtube_research.fetch_comments(resolved_id, max_results=50)

    if not comments:
        return f"No comments found on video {resolved_id} (or comments are disabled there)."

    comment_block = "\n".join(f"- {c}" for c in comments)
    analysis = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        messages=[{
            "role": "user",
            "content": (
                "These are public viewer comments from a video on The Reckoning Files, "
                "a true-crime / dark-storytelling YouTube channel. Based only on these "
                "comments, give me:\n"
                "1. Recurring themes or requests\n"
                "2. Overall sentiment\n"
                "3. 3-5 concrete new video topic ideas grounded in what viewers are "
                "actually asking for\n\n"
                f"Comments ({len(comments)} total):\n{comment_block}"
            ),
        }],
    )
    digest = "".join(b.text for b in analysis.content if b.type == "text")

    is_grounded, check_note = verify_digest_grounded(comments, digest)
    if not is_grounded:
        digest += f"\n\n⚠️ Self-check flagged this digest: {check_note}"

    memory.add_memory(
        project="The Reckoning Files",
        category="idea_mining",
        content=digest,
    )

    status = "self-check: grounded in source comments" if is_grounded else "self-check: flagged for review"
    return f"Idea-mining digest for video {resolved_id} ({len(comments)} comments analyzed, {status}):\n\n{digest}"


def mine_reddit_ideas(subreddit: str, query: str = "") -> str:
    posts = reddit_research.search_subreddit(subreddit, query=query, limit=10)

    if not posts:
        return f"No posts found in r/{subreddit}" + (f" matching '{query}'." if query else ".")

    # Pull comments on the highest-scoring match for richer discussion context,
    # the same way mine_video_ideas pulls actual comment text, not just titles.
    top_post = max(posts, key=lambda p: p["score"])
    top_comments = reddit_research.fetch_post_comments(top_post["id"], subreddit, max_results=20)

    posts_block = "\n".join(
        f"- \"{p['title']}\" (score {p['score']}, {p['num_comments']} comments): "
        f"{p['selftext'][:200]}" for p in posts
    )
    comments_block = "\n".join(f"- {c}" for c in top_comments) if top_comments else "(no comments fetched)"

    source_text = f"POSTS:\n{posts_block}\n\nTOP POST DISCUSSION:\n{comments_block}"

    analysis = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        messages=[{
            "role": "user",
            "content": (
                f"These are public Reddit posts (and discussion on the top one) from "
                f"r/{subreddit}, gathered for The Reckoning Files, a true-crime / "
                "dark-storytelling YouTube channel. Based only on this, give me:\n"
                "1. Notable cases or stories worth knowing about\n"
                "2. Recurring discussion themes\n"
                "3. 3-5 concrete new video topic ideas grounded in what's actually here\n\n"
                f"{source_text}"
            ),
        }],
    )
    digest = "".join(b.text for b in analysis.content if b.type == "text")

    # Same self-check as YouTube idea-mining — does this trace back to the real
    # source material, or did the first pass invent something?
    source_lines = [p["title"] for p in posts] + top_comments
    is_grounded, check_note = verify_digest_grounded(source_lines, digest)
    if not is_grounded:
        digest += f"\n\n⚠️ Self-check flagged this digest: {check_note}"

    memory.add_memory(
        project="The Reckoning Files",
        category="reddit_research",
        content=digest,
    )

    status = "self-check: grounded in source posts" if is_grounded else "self-check: flagged for review"
    return f"Reddit research digest for r/{subreddit} ({len(posts)} posts, {status}):\n\n{digest}"


def run_tool(name: str, tool_input: dict) -> str:
    if name == "open_app":
        return open_app(tool_input.get("app_name", ""), memory=memory)
    if name == "fact_check_script":
        try:
            report = fact_checker.fact_check_script(claude, tool_input.get("script_text", ""))
            memory.add_memory(project="The Reckoning Files", category="fact_check", content=report)
            return report
        except fact_checker.FactCheckError as e:
            return f"Couldn't fact-check that: {e}"
    if name == "mine_video_ideas":
        try:
            return mine_video_ideas(tool_input.get("video_id", ""))
        except youtube_research.YouTubeResearchError as e:
            return f"Couldn't mine video ideas: {e}"
    if name == "mine_reddit_ideas":
        try:
            return mine_reddit_ideas(tool_input.get("subreddit", ""), tool_input.get("query", ""))
        except reddit_research.RedditResearchError as e:
            return f"Couldn't mine Reddit ideas: {e}"
    return f"Unknown tool: {name}"


# ---------- Brain ----------
def ask_claude(user_text: str, channel: str = "voice") -> str:
    history = memory.recent_turns(limit=10)
    system = build_system_prompt(memory)

    messages = history + [{"role": "user", "content": user_text}]

    response = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        system=system,
        tools=TOOLS,
        messages=messages,
    )

    # Handle tool calls — loop in case Claude wants to call a tool, see the
    # result, then respond. Capped at a few rounds so a bad loop can't hang.
    rounds = 0
    while response.stop_reason == "tool_use" and rounds < 3:
        rounds += 1
        tool_results = []
        assistant_content = []

        for block in response.content:
            if block.type == "text":
                assistant_content.append({"type": "text", "text": block.text})
            elif block.type == "tool_use":
                assistant_content.append({
                    "type": "tool_use",
                    "id": block.id,
                    "name": block.name,
                    "input": block.input,
                })
                result = run_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

        messages.append({"role": "assistant", "content": assistant_content})
        messages.append({"role": "user", "content": tool_results})

        response = claude.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            system=system,
            tools=TOOLS,
            messages=messages,
        )

    reply = "".join(block.text for block in response.content if block.type == "text")
    memory.log_turn("user", user_text, channel=channel)
    memory.log_turn("assistant", reply, channel=channel)
    return reply


# ---------- Text to speech ----------
def speak(text: str):
    if ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID:
        speak_elevenlabs(text)
    else:
        os.system(f'say "{text}"')


def speak_elevenlabs(text: str):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        out_path = Path(tempfile.mktemp(suffix=".mp3"))
        out_path.write_bytes(resp.content)
        os.system(f"afplay '{out_path}'")
        out_path.unlink(missing_ok=True)
    except Exception as e:
        print(f"[warn] ElevenLabs failed ({e}), falling back to macOS voice.")
        os.system(f'say "{text}"')


# ---------- Wake word ----------
def listen_for_wake_word():
    """Blocks until the wake word is heard. Returns True, or False if shutting down."""
    print(f"[reckoning] idle — waiting for wake word...")
    set_mic_status("idle")
    model = WakeModel(wakeword_models=[WAKE_WORD_MODEL])
    chunk_size = 1280  # openwakeword expects 80ms chunks at 16kHz

    with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="int16") as stream:
        while _running:
            chunk, _ = stream.read(chunk_size)
            audio = chunk.flatten()
            prediction = model.predict(audio)
            for mdl, score in prediction.items():
                if score > 0.5:
                    return True
    return False


# ---------- Main loop ----------
def main():
    print("=" * 50)
    print(" RECKONING — your voice assistant")
    print("=" * 50)
    print("Say the wake word, then speak your request.")
    print("Say 'goodbye reckoning' anytime to exit.\n")

    while _running:
        heard = listen_for_wake_word()
        if not heard or not _running:
            break

        os.system('afplay /System/Library/Sounds/Tink.aiff 2>/dev/null')  # audible cue
        set_mic_status("listening")
        wav_path = record_until_silence()
        user_text = transcribe(wav_path)

        if not user_text:
            print("[reckoning] didn't catch that.")
            continue

        print(f"[you] {user_text}")

        if any(phrase in user_text.lower() for phrase in EXIT_PHRASES):
            set_mic_status("speaking")
            speak("Shutting down. Talk soon.")
            break

        set_mic_status("thinking")
        reply = ask_claude(user_text)
        print(f"[reckoning] {reply}\n")
        set_mic_status("speaking")
        speak(reply)

    set_mic_status("offline")
    print("[reckoning] offline.")


if __name__ == "__main__":
    main()
