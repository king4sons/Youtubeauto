#!/bin/bash
# Starts the read-only dashboard API, then open dashboard/index.html in your browser.
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "No environment yet. Run this first:  ./bootstrap.sh"
    exit 1
fi

echo "Dashboard API starting on http://localhost:5151"
echo "Now open dashboard/index.html in your browser."
echo "(This screen is view-only — it cannot trigger any action.)"
./venv/bin/python dashboard_server.py
