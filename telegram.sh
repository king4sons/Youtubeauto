#!/bin/bash
set -e
cd "$(dirname "$0")"

if [ ! -f backend/.env ]; then
  echo "ERROR: backend/.env not found."
  echo "Copy backend/.env.example to backend/.env and fill in your keys."
  exit 1
fi

# Read only the Telegram vars from .env (avoid full source for safety)
TELEGRAM_BOT_TOKEN=$(grep -E '^TELEGRAM_BOT_TOKEN=' backend/.env | cut -d= -f2- | tr -d '\r\n' || true)
TELEGRAM_ALLOWED_IDS=$(grep -E '^TELEGRAM_ALLOWED_IDS=' backend/.env | cut -d= -f2- | tr -d '\r\n' || true)

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "ERROR: TELEGRAM_BOT_TOKEN is not set in backend/.env"
  echo ""
  echo "Setup steps:"
  echo "  1. Message @BotFather on Telegram: /newbot"
  echo "  2. Follow the prompts and copy the token"
  echo "  3. Add to backend/.env:  TELEGRAM_BOT_TOKEN=<token>"
  exit 1
fi

if [ -z "$TELEGRAM_ALLOWED_IDS" ]; then
  echo "ERROR: TELEGRAM_ALLOWED_IDS is not set in backend/.env"
  echo ""
  echo "Setup steps:"
  echo "  1. Message @userinfobot on Telegram"
  echo "  2. Copy your numeric user ID"
  echo "  3. Add to backend/.env:  TELEGRAM_ALLOWED_IDS=<your_id>"
  echo "  (Multiple users: TELEGRAM_ALLOWED_IDS=111111,222222)"
  exit 1
fi

echo "Installing Telegram bridge dependencies..."
pip install "python-telegram-bot>=20.0" python-dotenv --quiet

echo ""
echo "Starting Reckoning Studio Telegram bridge"
echo "  Token: ${TELEGRAM_BOT_TOKEN:0:10}..."
echo "  Allowed IDs: $TELEGRAM_ALLOWED_IDS"
echo "  Backend: ${TELEGRAM_API_URL:-http://localhost:8000}"
echo ""
echo "Message your bot on Telegram — only listed IDs get through."
echo "Press Ctrl+C to stop."
echo ""

python3 telegram_bridge.py
