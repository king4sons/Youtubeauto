#!/bin/bash
# Starts the Reckoning voice assistant. Run ./bootstrap.sh first (one time).
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "No environment yet. Run this first:  ./bootstrap.sh"
    exit 1
fi

./venv/bin/python jarvis.py
