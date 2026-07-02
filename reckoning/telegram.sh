#!/bin/bash
# Starts the Telegram bridge so you can talk to Reckoning from your phone.
# Your Mac must be awake and this running — see SETUP.md for the one-time
# bot setup (creating the bot, getting your user ID, filling in .env).
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "No environment yet. Run this first:  ./bootstrap.sh"
    exit 1
fi

./venv/bin/python telegram_bridge.py
