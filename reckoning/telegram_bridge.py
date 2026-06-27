#!/usr/bin/env python3
"""
Reckoning — Telegram bridge. This is how you talk to Reckoning from your phone.

How it works:
- This script runs on your Mac, alongside (or instead of) the voice loop.
- It only makes OUTBOUND requests to Telegram's servers (long polling for new
  messages). Nothing is opened up to receive inbound connections — there's no
  port to forward, no server to expose, nothing for a stranger to find.
- Only Telegram user IDs you explicitly whitelist in .env can talk to it.
  Everyone else's messages are logged and silently ignored.
- It reuses the exact same brain as the voice assistant (ask_claude in
  jarvis.py) — same memory, same pipeline awareness, same whitelisted
  app-launcher tool, same audit trail. This is a second front door into the
  same house, not a new house.

Important: this is NOT a cloud service. Your Mac has to be awake and this
script has to be running for it to respond. Think "remote control my home
Reckoning from my phone," not "Reckoning lives on a server now."

Setup: see SETUP.md, "Use Reckoning from your phone."

Run:
    python3 telegram_bridge.py
    (or ./telegram.sh)
"""
import os
import sys
import time
import tempfile
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import requests

from jarvis import ask_claude, transcribe

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
_raw_allowed = os.environ.get("TELEGRAM_ALLOWED_USER_IDS", "").strip()
ALLOWED_USER_IDS = {int(x) for x in _raw_allowed.split(",") if x.strip().lstrip("-").isdigit()}

if not TELEGRAM_BOT_TOKEN:
    sys.exit(
        "Missing TELEGRAM_BOT_TOKEN. Set it in your .env to use Reckoning from your "
        "phone — see SETUP.md, 'Use Reckoning from your phone.'"
    )
if not ALLOWED_USER_IDS:
    sys.exit(
        "Missing TELEGRAM_ALLOWED_USER_IDS. This bridge refuses to start without an "
        "explicit whitelist — without one, anyone who finds your bot's username could "
        "talk to your assistant and your business memory. Add your numeric Telegram "
        "user ID to .env — see SETUP.md."
    )

BASE_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
POLL_TIMEOUT = 30          # seconds — Telegram long-poll window
MAX_MESSAGE_LEN = 4096     # Telegram's hard limit per message


def get_me() -> dict:
    resp = requests.get(f"{BASE_URL}/getMe", timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if not data.get("ok"):
        raise RuntimeError(f"Invalid bot token: {data}")
    return data["result"]


def send_message(chat_id, text: str):
    if not text:
        text = "(no reply)"
    for i in range(0, len(text), MAX_MESSAGE_LEN):
        chunk = text[i:i + MAX_MESSAGE_LEN]
        try:
            requests.post(
                f"{BASE_URL}/sendMessage",
                json={"chat_id": chat_id, "text": chunk},
                timeout=15,
            )
        except requests.RequestException as e:
            print(f"[telegram] failed to send message: {e}")


def download_voice(file_id: str) -> Path:
    """Download a Telegram voice note (OGG/Opus) to a local temp file."""
    resp = requests.get(f"{BASE_URL}/getFile", params={"file_id": file_id}, timeout=15)
    resp.raise_for_status()
    file_path = resp.json()["result"]["file_path"]
    file_url = f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{file_path}"
    audio_resp = requests.get(file_url, timeout=30)
    audio_resp.raise_for_status()
    suffix = Path(file_path).suffix or ".ogg"
    out_path = Path(tempfile.mktemp(suffix=suffix))
    out_path.write_bytes(audio_resp.content)
    return out_path


def handle_update(update: dict):
    message = update.get("message")
    if not message:
        return  # edits, channel posts, etc. — ignore

    from_user = message.get("from", {})
    user_id = from_user.get("id")
    chat_id = message.get("chat", {}).get("id")
    who = from_user.get("username") or from_user.get("first_name") or str(user_id)

    if user_id not in ALLOWED_USER_IDS:
        print(f"[telegram] ignoring message from unauthorized user_id={user_id} ({who})")
        return

    text = message.get("text", "") or ""

    voice = message.get("voice") or message.get("audio")
    if voice and not text:
        try:
            audio_path = download_voice(voice["file_id"])
            text = transcribe(audio_path)  # same local Whisper model as the voice loop
        except Exception as e:
            send_message(chat_id, f"Couldn't transcribe that voice note ({e}). Try text instead?")
            return

    if not text:
        return

    print(f"[telegram] {who}: {text}")

    try:
        reply = ask_claude(text, channel="telegram")
    except Exception as e:
        reply = f"Hit an error processing that — try again? ({e})"

    print(f"[telegram] -> {reply}\n")
    send_message(chat_id, reply)


def main():
    me = get_me()
    print("=" * 50)
    print(" RECKONING — Telegram bridge")
    print("=" * 50)
    print(f"Connected as @{me.get('username')}")
    print(f"Allowed user IDs: {sorted(ALLOWED_USER_IDS)}")
    print("Outbound-only (long polling) — nothing is listening for inbound")
    print("connections. Your Mac must stay awake and this script running.")
    print("Ctrl+C to stop.\n")

    offset = 0
    while True:
        try:
            resp = requests.post(
                f"{BASE_URL}/getUpdates",
                json={"offset": offset, "timeout": POLL_TIMEOUT, "allowed_updates": ["message"]},
                timeout=POLL_TIMEOUT + 10,
            )
            resp.raise_for_status()
            data = resp.json()
            if not data.get("ok"):
                print(f"[telegram] getUpdates returned not-ok: {data}")
                time.sleep(2)
                continue

            for update in data.get("result", []):
                offset = update["update_id"] + 1
                handle_update(update)

        except KeyboardInterrupt:
            print("\n[telegram] shutting down.")
            break
        except requests.RequestException as e:
            print(f"[telegram] network error ({e}), retrying in 5s...")
            time.sleep(5)


if __name__ == "__main__":
    main()
