#!/bin/bash
# ============================================================
#  Reckoning — one-time setup
#  Run this ONCE on your Mac. After this, use ./start.sh daily.
# ============================================================
cd "$(dirname "$0")"

echo ""
echo "  RECKONING — setup"
echo "  ------------------------------------------"

# 1) Python version check (need 3.10+)
if ! command -v python3 >/dev/null 2>&1; then
    echo "  [X] Python 3 not found."
    echo "      Install it from https://www.python.org/downloads/ (or: brew install python)"
    echo "      then run ./bootstrap.sh again."
    exit 1
fi

PYVER=$(python3 -c 'import sys; print("%d.%d" % sys.version_info[:2])')
PYOK=$(python3 -c 'import sys; print(1 if sys.version_info[:2] >= (3,10) else 0)')
if [ "$PYOK" != "1" ]; then
    echo "  [X] Python $PYVER found, but 3.10 or newer is required."
    echo "      Update Python (brew install python) and run ./bootstrap.sh again."
    exit 1
fi
echo "  [OK] Python $PYVER"

# 2) Virtual environment
if [ -d "venv" ]; then
    echo "  [OK] Virtual environment already exists — reusing it."
else
    echo "  [..] Creating virtual environment..."
    python3 -m venv venv || { echo "  [X] Could not create venv."; exit 1; }
    echo "  [OK] Virtual environment created."
fi

# 3) Dependencies
echo "  [..] Installing dependencies (this can take a few minutes the first time)..."
./venv/bin/pip install --quiet --upgrade pip
if ./venv/bin/pip install --quiet -r requirements.txt; then
    echo "  [OK] Dependencies installed."
else
    echo "  [X] Dependency install failed."
    echo "      If the error mentions PortAudio or sounddevice, run:"
    echo "          brew install portaudio"
    echo "      then run ./bootstrap.sh again."
    exit 1
fi

# 4) Catch the one macOS audio gotcha early
if ! ./venv/bin/python -c "import sounddevice" >/dev/null 2>&1; then
    echo ""
    echo "  [!] 'sounddevice' installed but won't load — usually means PortAudio is missing."
    echo "      Fix it with:   brew install portaudio"
    echo "      then run ./bootstrap.sh again."
    exit 1
fi

# 5) .env scaffold
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "  [!] Created .env — open it and paste in your API keys before first run:"
    echo "        ANTHROPIC_API_KEY   (required)"
    echo "        ELEVENLABS_API_KEY  (optional — falls back to the Mac voice if blank)"
    echo "        ELEVENLABS_VOICE_ID (optional)"
fi

# 6) Hand off to the full diagnostic
echo "  ------------------------------------------"
echo "  Running setup check..."
echo ""
./venv/bin/python check_setup.py

echo ""
echo "  ------------------------------------------"
echo "  Setup done."
echo "    Start the assistant:   ./start.sh"
echo "    Start the dashboard:   ./dashboard.sh   (then open dashboard/index.html)"
echo ""
