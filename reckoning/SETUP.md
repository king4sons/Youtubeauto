# Setting up Reckoning on your Mac

This is a real, always-listening voice assistant. One-time setup is about 10–15 minutes.

## The fast way (one command)

1. Make sure you have Python 3.10+:
   ```
   python3 --version
   ```
   If it's missing or older, install from https://www.python.org/downloads/macos/
   (or `brew install python` if you use Homebrew), then continue.

2. Unzip this project, open Terminal in the folder:
   ```
   cd path/to/jarvis
   ```

3. Run the setup script:
   ```
   ./bootstrap.sh
   ```
   This creates the virtual environment, installs everything (Whisper, audio
   libraries, etc.), creates your `.env`, and runs a diagnostic. It takes a few
   minutes the first time.

4. Open `.env` and paste in your keys:
   ```
   open -e .env
   ```
   - `ANTHROPIC_API_KEY` — from console.anthropic.com (required)
   - `ELEVENLABS_API_KEY` — from elevenlabs.io (optional; without it, the assistant
     speaks using the built-in macOS voice)
   - `ELEVENLABS_VOICE_ID` — pick a voice in ElevenLabs, copy its Voice ID (optional)

5. Run it again to confirm the keys check out:
   ```
   ./bootstrap.sh
   ```
   When the diagnostic is happy, you're done. Start the assistant with:
   ```
   ./start.sh
   ```
   And the read-only dashboard (separate terminal) with:
   ```
   ./dashboard.sh
   ```
   then open `dashboard/index.html` in your browser.

   > If `bootstrap.sh` ever stops on a PortAudio / sounddevice error, run
   > `brew install portaudio` and then `./bootstrap.sh` again.

---

## The manual way (if you'd rather do it by hand)

<details>
<summary>Click to expand step-by-step manual setup</summary>

### 1. Virtual environment
```
python3 -m venv venv
source venv/bin/activate
```
You'll need that `source venv/bin/activate` line every time you open a new terminal —
or just use `./start.sh`, which handles it for you.

### 2. Install dependencies
```
pip install -r requirements.txt
```
A few minutes — it's pulling in Whisper and audio libraries.

### 3. API keys
```
cp .env.example .env
open -e .env
```
Fill in `ANTHROPIC_API_KEY` (required), and optionally `ELEVENLABS_API_KEY` and
`ELEVENLABS_VOICE_ID`. `jarvis.py` loads `.env` automatically on startup.

</details>

---

## 7. Grant microphone access

The first time you run it, macOS will pop up asking for microphone permission for
Terminal (or iTerm). Click Allow. If you miss it: System Settings → Privacy & Security
→ Microphone → enable your terminal app.

## 8. About the wake word

The code ships with `hey_jarvis` as a placeholder wake word model (openwakeword's
built-in demo model) so you can test the pipeline immediately. To get a real custom
"Reckoning" wake word:

1. Go to https://github.com/dscripka/openWakeWord — it has a Colab notebook for
   training custom wake words for free.
2. Train a model on the word "Reckoning" (takes ~15 min on their free Colab GPU).
3. Download the resulting `.onnx` file, drop it in this project folder.
4. In `jarvis.py`, change `WAKE_WORD_MODEL = "hey_jarvis"` to
   `WAKE_WORD_MODEL = "reckoning.onnx"` (or whatever you named the file).

Until you do that, say "hey Jarvis" to wake it up — fully functional, just not your
custom word yet.

## 9. Run it

```
python3 jarvis.py
```

You should see "waiting for wake word..." Say the wake word, wait for the chime,
then talk. It'll transcribe, think, and speak back.

## 10. Giving it status updates (no live email yet)

Since live Gmail/Calendar wasn't set up, tell it what's going on manually, anytime,
from a separate terminal tab:

```
python3 tell_reckoning.py status "Sourcing music for the inheritance script today, footage downloads done"
```

It'll factor that into conversation until you update it again.

To make it permanently remember something (not just for today):

```
python3 tell_reckoning.py remember "Always check RPM benchmarks against the $12.82 top-tier number before greenlighting a new niche"
```

## 11. Structured memory and pipeline tracking

Beyond flat facts, Reckoning can hold tagged, queryable memories — useful for things
like lessons learned, what worked, what didn't, per project:

```
python3 tell_reckoning.py memory "The Reckoning Files" lesson "Inheritance betrayal scripts outperform workplace sabotage by ~30% in early retention"
python3 tell_reckoning.py memories                       # all recent structured memories
python3 tell_reckoning.py memories "The Reckoning Files"  # filtered to one project
```

Categories are freeform — `lesson`, `successful_workflow`, `failed_workflow`,
`channel_data`, `revenue_data`, `agent_improvement`, `conversation_note` are good
defaults, but use whatever makes sense.

You can also tell it what stage your active haneef-pipeline project is in, so it can
answer "where are we on the inheritance script?" accurately instead of guessing:

```
python3 tell_reckoning.py pipeline "She Was Written Out" "Stage 2 complete — full voiceover script" "voiceover generation, footage downloads, music sourcing"
python3 tell_reckoning.py pipeline-check
```

Both structured memories and the current pipeline status get pulled into Reckoning's
system prompt automatically, so it's aware of them in conversation without you having
to repeat yourself.

## 12. The app launcher — what it can and can't do

Reckoning can open a small, named whitelist of apps when you ask it to (e.g. "open
Obsidian"). This is deliberately the **only** way it can touch your computer:

- ✅ Opens a whitelisted app by name (`open -a AppName`, same as Spotlight)
- ❌ Cannot create, move, or delete files
- ❌ Cannot simulate keystrokes or mouse clicks
- ❌ Cannot run arbitrary shell commands
- ❌ Cannot open anything not explicitly on the whitelist — no fuzzy matching

The whitelist lives in `app_launcher.py`:

```python
ALLOWED_APPS = {
    "obsidian": "Obsidian",
    "claude": "Claude",
    "notes": "Notes",
    "finder": "Finder",
    "terminal": "Terminal",
    "calendar": "Calendar",
    "mail": "Mail",
}
```

To let it open something else, add a line — key is what you'd say, value is the exact
macOS app name. Every launch (success or failure) gets logged; check the history with:

```
python3 tell_reckoning.py app-log
```

## 13. Read-only status dashboard

A small dashboard shows what Reckoning is doing right now — mic status, current
pipeline stage, recent memories, app launch history. It's **view-only**: there are no
buttons that trigger actions, by design.

Two pieces, both need to be running:

```
# Terminal tab 1 — the API that reads your local memory database
python3 dashboard_server.py
```

Then open `dashboard/index.html` directly in your browser (double-click it, or
`open dashboard/index.html` from Terminal). It polls `localhost:5151` every few
seconds and updates automatically. If it shows a connection error, it just means
`dashboard_server.py` isn't running yet — start it and reload the page.

You don't need `jarvis.py` running to view the dashboard — it'll just show whatever
was last recorded. Mic status only updates live while `jarvis.py` is actually running.

## 14. Use Reckoning from your phone (Telegram)

This lets you text (or send a voice note to) Reckoning from your phone, anywhere you
have signal — same memory, same pipeline awareness, same whitelisted app launcher,
same audit trail as talking to it out loud.

**Important — what this is and isn't:** this is *not* a cloud assistant. Your Mac
still has to be awake and `telegram_bridge.py` has to be running for it to respond.
Think of it as remote-controlling your home Reckoning from your phone, not Reckoning
living on a server somewhere. It also never opens up your Mac to incoming
connections — it only makes outbound requests to Telegram's servers to check for new
messages, so there's no port to forward and nothing for a stranger to find.

**One-time setup (about 5 minutes):**

1. In Telegram, message **@BotFather** and send `/newbot`. Follow the prompts (pick
   a name, pick a username ending in `bot`). It'll give you a token that looks like
   `123456789:AAAbcDEF...` — copy it.

2. Message **@userinfobot** and it'll reply with your numeric Telegram user ID
   (something like `987654321`). Copy that too.

3. Open `.env` and fill in:
   ```
   TELEGRAM_BOT_TOKEN=123456789:AAAbcDEF...
   TELEGRAM_ALLOWED_USER_IDS=987654321
   ```
   You can list more than one ID, comma-separated, if you want a trusted person to
   also be able to message it. **Anyone not on this list is silently ignored** —
   the bridge won't even start without this set, so there's no way to accidentally
   leave it open to strangers.

4. Run it:
   ```
   ./telegram.sh
   ```
   You should see "Connected as @yourbotname". Now message your bot from your phone
   — text or a voice note both work (voice notes get transcribed by the same local
   Whisper model the voice assistant uses).

You can run `telegram.sh` and `start.sh` (the voice assistant) at the same time —
they share the same memory database, so a status update you give by voice shows up
when you check in by phone later, and vice versa. The dashboard now tags each recent
conversation turn with which channel it came from (voice or Telegram) so you can
tell them apart at a glance.

If you only want the voice assistant on your Mac, just don't run `telegram.sh` —
leaving the `.env` Telegram fields blank means nothing related to this is active.

## 15. YouTube comment idea-mining (The Reckoning Files)

Ask Reckoning (by voice or by phone) things like "what are people saying on my last
video" or "mine some video ideas from the comments," and it'll pull public comments
from a video, and have Claude pull out recurring themes, sentiment, and concrete new
video topic ideas grounded in what your viewers are actually asking for.

**This is read-only, by design.** It can fetch and analyze comments. It cannot post,
reply to, like, or moderate a comment — that capability doesn't exist anywhere in
this codebase. If you ever want to reply to comments through Reckoning, that's a
bigger decision (an AI posting on your public channel) worth its own conversation
rather than a quiet add-on here.

**One-time setup:**

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create (or
   pick) a project, and enable **"YouTube Data API v3"** under APIs & Services.
2. Under Credentials, create an **API key**. Copy it.
3. (Optional, but recommended) Find your channel ID: go to
   [studio.youtube.com](https://studio.youtube.com) → Settings → Channel →
   Advanced settings. Copy the channel ID (starts with `UC`).
4. Fill in `.env`:
   ```
   YOUTUBE_API_KEY=your-key-here
   YOUTUBE_CHANNEL_ID=UC-your-channel-id-here
   ```
   The channel ID is optional — without it, you'll need to give a specific video ID
   each time instead of just saying "my last video."

5. Restart `jarvis.py` (and/or `telegram_bridge.py`) — the tool only appears once
   `YOUTUBE_API_KEY` is set, and you'll see a `[info]` line at startup confirming
   whether it picked it up.

You can also trigger it directly without going through Claude:
```
python3 tell_reckoning.py mine-ideas              # most recent upload
python3 tell_reckoning.py mine-ideas <video_id>   # a specific video
```

Each digest gets saved as a structured memory under "The Reckoning Files" /
"idea_mining," so it shows up in the dashboard's memory panel and stays available as
context for later conversations — you're not re-running the same analysis from
scratch every time.

**Quota note:** YouTube's free tier gives you 10,000 units/day; each idea-mining run
costs about 3 units total. You will not come close to the limit with personal use.

Since the section above was written, idea-mining also self-checks its own work: after
generating a digest, it runs a second pass asking "does this analysis actually trace
back to the real comments, or did the first pass invent something?" If it flags a
problem, you'll see a warning right in the digest instead of a confident-sounding
answer that's quietly made something up. This happens automatically — there's
nothing to configure.

## 16. Fact-checking your scripts

Ask Reckoning (by voice, by phone, or with `tell_reckoning.py`) to fact-check a
script, and it pulls out the concrete factual claims — names, dates, events,
numbers, quotes — and checks each one against real sources it actually looks up via
live web search. It doesn't rely on Claude's memory of facts, which is exactly the
thing that causes confidently-wrong answers; it goes and checks.

Each claim comes back as one of:
- **VERIFIED** — found a real source that backs it up
- **DISPUTED** — sources say something different, with what they actually say
- **UNVERIFIED** — couldn't find a source either way

**This needs no new setup** — it uses your existing `ANTHROPIC_API_KEY`, nothing
else. It does require a reasonably recent `anthropic` Python package; if you set
this project up a while ago, run `pip install -r requirements.txt` again (or
`./bootstrap.sh`) to pick up the newer version.

**The practical way to use it** — scripts are long, so dictating one by voice isn't
realistic. The straightforward path is:
```
python3 tell_reckoning.py fact-check path/to/your/script.txt
```
This reads the file directly (no AI involved in choosing what to open — you're
telling it exactly which file, the same way you'd tell any other program), checks
it, prints the report, and saves it as a structured memory under "The Reckoning
Files" / "fact_check." You can also paste a shorter excerpt into a Telegram message
and ask it to fact-check that directly, with no file needed.

**Important — read this part.** This is a research aid, not a legal clearance. For
anything with real defamation or legal risk — naming a real living person in
connection with a crime, alleging wrongdoing, anything you'd actually get sued
over — verify it yourself through proper channels too. Treat a "VERIFIED" here as
"a fast first pass found support for this," not as a guarantee.

**Cost note:** each fact-check run does a handful of real web searches (capped at 8
per run) on top of the usual token cost — a few more cents per check than a plain
conversation turn, not a meaningful expense for personal use.

## 17. Reddit research (The Reckoning Files)

Ask Reckoning (by voice or by phone) to mine ideas from a subreddit — "find me cases
from r/UnresolvedMysteries" or "mine story ideas from r/truecrime" — and it searches
that subreddit, pulls in discussion on the strongest match, and has Claude synthesize
notable cases, recurring themes, and concrete new video topic ideas. Same
self-check pattern as YouTube idea-mining: it verifies its own digest actually traces
back to the real posts and comments before handing it to you.

**How it connects to Reddit, and why it's the safe shape:** this uses Reddit's own
official Application-Only OAuth — an app-level credential (a client ID and secret
you register yourself), not your personal Reddit login. There's no cookie, no
session, no scraping, and nothing in this codebase that can post, comment, vote, or
moderate anything. It only ever calls Reddit's read/search endpoints.

**Read this part — an honest caveat, not a guarantee either way:** Reddit's free
API tier is restricted to non-commercial use. The Reckoning Files is a monetized
channel, so there's a real question of where Reddit draws that line for a case like
"private internal research tool, used only by you, not redistributed or sold" versus
what they'd actually consider commercial use. I can't resolve that with certainty —
Reddit's Data API Terms are the actual authority, not this document. If you want to
be fully sure, read them yourself before relying on this for anything you'd be upset
to lose access to: https://support.reddithelp.com/hc/en-us/articles/16160319875092

**One-time setup:**

1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) and click
   **create an app** (or **create another app**) at the bottom.
2. Choose type **script**. Name it whatever you like. For "about url" and
   "redirect uri," any valid URL works — they're not actually used for this flow.
3. After saving, you'll see your app listed. The string under the app's name is
   your **client ID**; the field labeled "secret" is your **client secret**.
4. Fill in `.env`:
   ```
   REDDIT_CLIENT_ID=your-client-id-here
   REDDIT_CLIENT_SECRET=your-client-secret-here
   ```
5. Restart `jarvis.py` (and/or `telegram_bridge.py`) — the tool only appears once
   both are set.

You can also trigger it directly:
```
python3 tell_reckoning.py mine-reddit UnresolvedMysteries
python3 tell_reckoning.py mine-reddit truecrime "inheritance"
```

Each digest is saved as a structured memory under "The Reckoning Files" /
"reddit_research," visible on the dashboard alongside everything else.

**Rate limit:** Reddit's free tier allows 100 requests per minute — far more than
personal use will ever approach.

## Running it in the background (always-on)

Once you've confirmed it works in the foreground, you can run it as a background
process that survives terminal closing:

```
nohup python3 jarvis.py > reckoning.log 2>&1 &
```

To stop it later:
```
pkill -f jarvis.py
```

The same pattern works for the Telegram bridge if you want it always running too:
```
nohup python3 telegram_bridge.py > telegram.log 2>&1 &
```
(stop with `pkill -f telegram_bridge.py`)

## Costs to expect

- Claude API: a few cents per conversation turn, scales with how much you talk to it
  — this applies whether the turn comes from voice or from your phone
- ElevenLabs: charges per character spoken — keep an eye on your usage dashboard
  (note: phone replies are text-only for now, so they don't add ElevenLabs cost)
- Whisper: free, runs locally on your Mac, no per-use cost — same for voice notes
  sent over Telegram
- YouTube Data API: free up to 10,000 units/day; idea-mining costs ~3 units per run
  — Claude's analysis of the comments still costs the same few cents as any
  conversation turn (idea-mining now does two Claude calls per run instead of one,
  since it self-checks its own digest — still just a few cents total)
- Script fact-checking: a few real web searches per run (capped at 8) on top of the
  usual token cost — still a small, per-use amount, not a recurring charge
- Reddit research: free (Reddit's own API, well under the rate limit) — same two
  Claude calls as YouTube idea-mining (analysis + self-check), a few cents total

## Troubleshooting

**"No module named 'sounddevice'" or similar** — you forgot to activate the venv.
Run `source venv/bin/activate` first.

**Mic seems to not pick up anything** — check System Settings → Privacy & Security →
Microphone, make sure Terminal/iTerm is checked.

**It transcribes gibberish** — background noise or talking too fast right after the
chime. Wait half a second after the chime before speaking.

**ElevenLabs fails silently and uses robotic Mac voice instead** — check your API key
and voice ID are both correct in `.env`, and that you have ElevenLabs credits left.

**Dashboard shows "Can't reach the status feed"** — `dashboard_server.py` isn't
running, or it crashed. Check the terminal tab it's running in for errors (usually a
missing `flask`/`flask-cors` install — run `pip install -r requirements.txt` again).

**Telegram bridge won't start, says "Missing TELEGRAM_..."** — both
`TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALLOWED_USER_IDS` need to be set in `.env`. It
refuses to start with only one of them, on purpose — see step 14.

**Sent a message on Telegram but got no reply** — check the terminal `telegram.sh`
is running in. If you see "ignoring message from unauthorized user_id=...", your
numeric Telegram user ID doesn't match what's in `TELEGRAM_ALLOWED_USER_IDS` — double
check it against what @userinfobot gave you (no spaces, comma-separated if more than
one).

**Voice notes over Telegram fail to transcribe** — this should work out of the box
(the same Whisper setup handles it), but if you see a decoding error, run
`pip install av --upgrade` inside the venv and try again.

**"Couldn't mine video ideas: YouTube isn't configured"** — `YOUTUBE_API_KEY` isn't
set in `.env`. See step 15.

**"Couldn't mine video ideas: Comments are disabled..."** — either the specific
video genuinely has comments turned off, or the API key isn't enabled for "YouTube
Data API v3" in Google Cloud Console (Credentials page will show which APIs the
key can call).

**Idea-mining says "no channel to default to"** — you asked it to mine ideas without
naming a video, but `YOUTUBE_CHANNEL_ID` isn't set in `.env`. Either set it (step 15)
or give a specific video ID each time.

**Idea-mining digest has a "Self-check flagged this digest" warning** — that's the
self-check working as intended, not a bug. It means the second pass couldn't
confirm every claim in the first pass's digest actually traces back to the real
comments. Read the flagged reason and treat that part of the digest with more
skepticism — or just re-run it.

**"Couldn't fact-check that: ... unsupported tool type..."** or a version-related
error — your `anthropic` package is too old to use web search. Run:
```
pip install --upgrade anthropic
```
then try again. `./bootstrap.sh` will also catch and report this.

**Fact-check report seems thin or skips things** — it's instructed to skip anything
that isn't a real, checkable factual claim (scene-setting, tone, opinion), so a
script that's mostly narration and short on concrete facts will get a short report.
That's expected, not an error.

**"Couldn't mine Reddit ideas: Reddit rejected those credentials"** —
double-check `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` in `.env` against what's
listed on your app's page at reddit.com/prefs/apps. Make sure the app type is
"script," not "web app" or "installed app" — those use a different flow.

**"That subreddit doesn't exist (or is private/banned)"** — check the spelling, and
that the subreddit is public. Quarantined subreddits aren't readable this way either.

**"Reddit's rate limit was hit"** — you're well under the 100-requests-per-minute
free tier for any normal personal use; this would only happen from rapid repeated
calls in a short window. Wait a minute and try again.
