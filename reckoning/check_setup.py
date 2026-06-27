#!/usr/bin/env python3
"""
Run this BEFORE jarvis.py the first time. Checks each piece independently so
if something's broken, you know exactly what — instead of guessing from the
full pipeline.

Usage: python3 check_setup.py
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()


def check(label, fn):
    print(f"Checking {label}...", end=" ", flush=True)
    try:
        result = fn()
        if result == "skip":
            print("skipped (not configured — optional feature)")
            return None
        print("OK")
        return True
    except Exception as e:
        print(f"FAILED — {e}")
        return False


def check_anthropic_key():
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key or not key.startswith("sk-ant"):
        raise ValueError("ANTHROPIC_API_KEY missing or malformed in .env")
    import anthropic
    client = anthropic.Anthropic(api_key=key)
    client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=10,
        messages=[{"role": "user", "content": "say OK"}],
    )


def check_anthropic_sdk_version():
    """fact_check_script needs a recent enough anthropic SDK to send the
    web_search tool. This doesn't make a network call — it just checks the
    installed package version, so it can't tell you if web search is
    actually *enabled* for your key, only that the SDK can ask for it."""
    import anthropic

    def parse(v):
        # Tiny manual parser — avoids depending on the 'packaging' package,
        # which isn't a declared dependency here, just for one comparison.
        parts = []
        for p in v.split(".")[:3]:
            digits = "".join(ch for ch in p if ch.isdigit())
            parts.append(int(digits) if digits else 0)
        while len(parts) < 3:
            parts.append(0)
        return tuple(parts)

    installed = anthropic.__version__
    minimum = "0.109.0"
    if parse(installed) < parse(minimum):
        raise ValueError(
            f"anthropic SDK is {installed}, need >= {minimum} for script "
            "fact-checking. Run: pip install --upgrade anthropic"
        )


def check_elevenlabs_key():
    key = os.environ.get("ELEVENLABS_API_KEY")
    voice_id = os.environ.get("ELEVENLABS_VOICE_ID")
    if not key or not voice_id:
        raise ValueError("ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID missing in .env")
    import requests
    resp = requests.get(
        "https://api.elevenlabs.io/v1/voices",
        headers={"xi-api-key": key},
        timeout=10,
    )
    resp.raise_for_status()


def check_microphone():
    import sounddevice as sd
    devices = sd.query_devices()
    input_devices = [d for d in devices if d["max_input_channels"] > 0]
    if not input_devices:
        raise RuntimeError("No input (microphone) devices found")


def check_whisper_loads():
    from faster_whisper import WhisperModel
    WhisperModel("small", device="cpu", compute_type="int8")


def check_wake_word_model():
    from openwakeword.model import Model
    Model(wakeword_models=["hey_jarvis"])


def check_dashboard_deps():
    import flask
    import flask_cors


def check_telegram():
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    allowed = os.environ.get("TELEGRAM_ALLOWED_USER_IDS", "").strip()

    if not token and not allowed:
        return "skip"  # phone access is optional — fine to not use it

    if not token:
        raise ValueError("TELEGRAM_ALLOWED_USER_IDS is set but TELEGRAM_BOT_TOKEN is missing")
    if not allowed:
        raise ValueError(
            "TELEGRAM_BOT_TOKEN is set but TELEGRAM_ALLOWED_USER_IDS is missing — "
            "without it the bridge refuses to start, by design"
        )

    import requests
    resp = requests.get(f"https://api.telegram.org/bot{token}/getMe", timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if not data.get("ok"):
        raise ValueError(f"Telegram rejected this bot token: {data}")


def check_youtube():
    key = os.environ.get("YOUTUBE_API_KEY", "").strip()
    channel_id = os.environ.get("YOUTUBE_CHANNEL_ID", "").strip()

    if not key:
        if channel_id:
            raise ValueError("YOUTUBE_CHANNEL_ID is set but YOUTUBE_API_KEY is missing")
        return "skip"  # idea-mining is optional

    import requests
    resp = requests.get(
        "https://www.googleapis.com/youtube/v3/channels",
        params={"part": "id", "id": channel_id or "UC_x5XG1OV2P6uZZ5FSM9Ttw", "key": key},
        timeout=10,
    )
    if resp.status_code == 400 or resp.status_code == 403:
        raise ValueError(f"YouTube rejected this API key (HTTP {resp.status_code}) — check it's enabled for YouTube Data API v3")
    resp.raise_for_status()


def check_reddit():
    client_id = os.environ.get("REDDIT_CLIENT_ID", "").strip()
    client_secret = os.environ.get("REDDIT_CLIENT_SECRET", "").strip()

    if not client_id and not client_secret:
        return "skip"  # Reddit research is optional
    if not client_id:
        raise ValueError("REDDIT_CLIENT_SECRET is set but REDDIT_CLIENT_ID is missing")
    if not client_secret:
        raise ValueError("REDDIT_CLIENT_ID is set but REDDIT_CLIENT_SECRET is missing")

    import requests
    resp = requests.post(
        "https://www.reddit.com/api/v1/access_token",
        data={"grant_type": "client_credentials"},
        auth=(client_id, client_secret),
        headers={"User-Agent": "Reckoning-SetupCheck/1.0"},
        timeout=10,
    )
    if resp.status_code == 401:
        raise ValueError("Reddit rejected REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET — double check both")
    resp.raise_for_status()
    if not resp.json().get("access_token"):
        raise ValueError(f"Reddit didn't return an access token: {resp.json()}")


if __name__ == "__main__":
    print("=" * 50)
    print(" RECKONING SETUP CHECK")
    print("=" * 50)

    results = [
        check("Anthropic API key + connectivity", check_anthropic_key),
        check("Anthropic SDK version (for script fact-checking)", check_anthropic_sdk_version),
        check("ElevenLabs API key + connectivity", check_elevenlabs_key),
        check("Microphone availability", check_microphone),
        check("Whisper model download/load", check_whisper_loads),
        check("Wake word model load", check_wake_word_model),
        check("Dashboard dependencies (flask, flask-cors)", check_dashboard_deps),
        check("Telegram phone access (optional)", check_telegram),
        check("YouTube idea-mining (optional)", check_youtube),
        check("Reddit research (optional)", check_reddit),
    ]

    print()
    failed = [r for r in results if r is False]
    if not failed:
        print("All checks passed. Run `python3 jarvis.py` or `./start.sh` to go live.")
    else:
        print("Some checks failed — fix those before running the full assistant.")
        sys.exit(1)
