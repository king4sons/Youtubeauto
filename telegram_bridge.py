#!/usr/bin/env python3
"""
Telegram bridge for Reckoning Studio.

Run this alongside the Reckoning Studio backend to control your studio
from Telegram. Only users whose IDs are listed in TELEGRAM_ALLOWED_IDS
can interact with the bot — all other senders are silently dropped.

Usage:  python3 telegram_bridge.py
Setup:  ./telegram.sh  (validates env vars first)
"""
import os
import sys
import logging
import httpx
from dotenv import load_dotenv

# Load from backend/.env first, then root .env as fallback
load_dotenv("backend/.env")
load_dotenv()

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
    CallbackQueryHandler,
)

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO,
)
log = logging.getLogger(__name__)

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
ALLOWED_IDS: set[int] = set()
for _raw in os.environ.get("TELEGRAM_ALLOWED_IDS", "").split(","):
    _raw = _raw.strip()
    if _raw:
        try:
            ALLOWED_IDS.add(int(_raw))
        except ValueError:
            log.warning("Ignoring non-integer entry in TELEGRAM_ALLOWED_IDS: %s", _raw)

API_BASE = os.environ.get("TELEGRAM_API_URL", "http://localhost:8000")
BOT_EMAIL = os.environ.get("TELEGRAM_BOT_EMAIL", "telegrambot@reckoning.internal")
BOT_PASSWORD = os.environ.get("TELEGRAM_BOT_PASSWORD", "reckoning-telegram-bridge-2024")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

_jwt_token: str | None = None


async def _get_token() -> str | None:
    """Return a cached JWT, refreshing via login (or auto-register) as needed."""
    global _jwt_token
    if _jwt_token:
        return _jwt_token
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            f"{API_BASE}/api/v1/auth/login",
            json={"email": BOT_EMAIL, "password": BOT_PASSWORD},
        )
        if r.status_code == 200:
            _jwt_token = r.json()["access_token"]
            return _jwt_token
        # First run — register a service account
        r = await client.post(
            f"{API_BASE}/api/v1/auth/register",
            json={
                "email": BOT_EMAIL,
                "username": "telegrambot",
                "password": BOT_PASSWORD,
                "full_name": "Telegram Bridge",
            },
        )
        if r.status_code == 200:
            _jwt_token = r.json()["access_token"]
            return _jwt_token
    return None


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _whitelist(func):
    """Reject any message not from a whitelisted Telegram user ID."""
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        uid = update.effective_user.id if update.effective_user else None
        if uid not in ALLOWED_IDS:
            log.warning("Dropped message from unlisted user_id=%s", uid)
            if update.message:
                await update.message.reply_text("Access denied.")
            return
        return await func(update, context)
    wrapper.__name__ = func.__name__
    return wrapper


@_whitelist
async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [
            InlineKeyboardButton("Projects", callback_data="list_projects"),
            InlineKeyboardButton("Status", callback_data="status"),
        ],
        [InlineKeyboardButton("New Project", callback_data="new_project_prompt")],
    ]
    await update.message.reply_text(
        "<b>Reckoning Studio</b>\n\n"
        "Control your cinematic video studio from Telegram.\n\n"
        "<b>Commands:</b>\n"
        "/projects — list recent projects\n"
        "/new <i>title</i> — create a project\n"
        "/script <i>id premise</i> — generate a script\n"
        "/status — system status\n\n"
        "Or just type a question — I'll use Claude to help.",
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


@_whitelist
async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api_ok = False
    project_count = 0
    try:
        token = await _get_token()
        if token:
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(f"{API_BASE}/health")
                api_ok = r.status_code == 200
                r2 = await client.get(
                    f"{API_BASE}/api/v1/projects/", headers=_auth(token)
                )
                if r2.status_code == 200:
                    project_count = len(r2.json())
    except Exception:
        pass
    lines = [
        "<b>Reckoning Studio Status</b>",
        f"API: {'connected' if api_ok else 'not reachable at ' + API_BASE}",
        f"Projects: {project_count}",
        f"Claude: {'configured' if ANTHROPIC_KEY and ANTHROPIC_KEY != 'sk-ant-your-key-here' else 'not set'}",
    ]
    await update.message.reply_text("\n".join(lines), parse_mode="HTML")


@_whitelist
async def cmd_projects(update: Update, context: ContextTypes.DEFAULT_TYPE):
    token = await _get_token()
    if not token:
        await update.message.reply_text(
            f"Could not connect to the Reckoning Studio API at {API_BASE}.\n"
            "Is the backend running?"
        )
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{API_BASE}/api/v1/projects/", headers=_auth(token)
            )
        if r.status_code != 200:
            await update.message.reply_text(f"API error: {r.status_code}")
            return
        projects = r.json()[:8]
        if not projects:
            await update.message.reply_text(
                "No projects yet. Use /new <title> to create one."
            )
            return
        lines = ["<b>Recent Projects</b>"]
        for p in projects:
            lines.append(f"  [{p['id']}] <b>{p['title']}</b> — {p['status']}")
        lines.append("\nUse /script <id> <premise> to generate a script.")
        await update.message.reply_text("\n".join(lines), parse_mode="HTML")
    except httpx.ConnectError:
        await update.message.reply_text(
            f"Cannot reach the backend at {API_BASE}. Is it running?"
        )


@_whitelist
async def cmd_new(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args or []
    if not args:
        await update.message.reply_text(
            "Usage: /new <title> [genre]\n"
            "Example: /new \"The Betrayal\" thriller"
        )
        return
    # Last word is optional genre if the rest forms a multi-word title
    if len(args) > 1:
        title = " ".join(args[:-1])
        genre = args[-1]
    else:
        title = args[0]
        genre = None
    token = await _get_token()
    if not token:
        await update.message.reply_text(
            f"Could not connect to the Reckoning Studio API at {API_BASE}."
        )
        return
    try:
        payload: dict = {"title": title}
        if genre:
            payload["genre"] = genre
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"{API_BASE}/api/v1/projects/",
                json=payload,
                headers=_auth(token),
            )
        if r.status_code == 200:
            p = r.json()
            await update.message.reply_text(
                f"Project created!\n<b>[{p['id']}] {p['title']}</b>\n\n"
                f"Next: /script {p['id']} &lt;your premise here&gt;",
                parse_mode="HTML",
            )
        else:
            await update.message.reply_text(f"Failed to create project: {r.text[:200]}")
    except httpx.ConnectError:
        await update.message.reply_text(
            f"Cannot reach the backend at {API_BASE}. Is it running?"
        )


@_whitelist
async def cmd_script(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args or []
    if len(args) < 2:
        await update.message.reply_text(
            "Usage: /script <project_id> <premise>\n"
            "Example: /script 1 A spy discovers her handler has been selling secrets"
        )
        return
    try:
        project_id = int(args[0])
    except ValueError:
        await update.message.reply_text("project_id must be a number.")
        return
    premise = " ".join(args[1:])
    token = await _get_token()
    if not token:
        await update.message.reply_text(
            f"Could not connect to the Reckoning Studio API at {API_BASE}."
        )
        return
    await update.message.reply_text(
        f"Generating script for project {project_id}...\n"
        "This runs in the background — check the dashboard for progress."
    )
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{API_BASE}/api/v1/scripts/generate",
                json={
                    "project_id": project_id,
                    "title": premise[:60],
                    "premise": premise,
                    "genre": "thriller",
                    "tone": "dramatic",
                    "duration_minutes": 12,
                },
                headers=_auth(token),
            )
        if r.status_code == 200:
            s = r.json()
            await update.message.reply_text(
                f"Script queued (id {s['id']}, status: {s['status']}).\n"
                "You'll get a message when generation completes."
            )
        else:
            await update.message.reply_text(f"API error: {r.text[:200]}")
    except httpx.ConnectError:
        await update.message.reply_text(
            f"Cannot reach the backend at {API_BASE}. Is it running?"
        )


@_whitelist
async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Route free-form text to Claude for video production advice."""
    text = (update.message.text or "").strip()
    if not text:
        return
    if not ANTHROPIC_KEY or ANTHROPIC_KEY == "sk-ant-your-key-here":
        await update.message.reply_text(
            "No ANTHROPIC_API_KEY set — free-form questions are unavailable.\n"
            "Commands still work: /projects /new /script /status"
        )
        return
    await update.message.reply_text("Thinking...")
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            system=(
                "You are the Reckoning Studio assistant. "
                "Help creators plan, script, and produce cinematic YouTube videos. "
                "Give concise, actionable answers. "
                "When relevant, suggest bot commands: /new, /script, /projects, /status."
            ),
            messages=[{"role": "user", "content": text}],
        )
        await update.message.reply_text(response.content[0].text)
    except Exception as e:
        await update.message.reply_text(f"Claude error: {e}")


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    uid = query.from_user.id if query.from_user else None
    if uid not in ALLOWED_IDS:
        await query.answer("Access denied.")
        return
    await query.answer()
    fake = update  # reuse same Update for the command handlers
    if query.data == "list_projects":
        context.args = []
        await cmd_projects(fake, context)
    elif query.data == "status":
        context.args = []
        await cmd_status(fake, context)
    elif query.data == "new_project_prompt":
        await query.message.reply_text(
            "Send: /new <title> [genre]\nExample: /new The Betrayal thriller"
        )


def main():
    if not BOT_TOKEN:
        print("ERROR: TELEGRAM_BOT_TOKEN is not set. Add it to backend/.env")
        sys.exit(1)
    if not ALLOWED_IDS:
        print(
            "ERROR: TELEGRAM_ALLOWED_IDS is not set.\n"
            "Add at least one Telegram user ID to backend/.env\n"
            "  Find yours by messaging @userinfobot on Telegram."
        )
        sys.exit(1)

    log.info("Starting Reckoning Studio Telegram bridge")
    log.info("Allowed user IDs: %s", ALLOWED_IDS)
    log.info("Backend API: %s", API_BASE)

    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("projects", cmd_projects))
    app.add_handler(CommandHandler("new", cmd_new))
    app.add_handler(CommandHandler("script", cmd_script))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    app.add_handler(CallbackQueryHandler(handle_callback))
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
