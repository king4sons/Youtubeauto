#!/bin/bash
set -e

echo "=== Reckoning Studio Setup ==="

# Build frontend if present
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
  echo "[1/3] Installing frontend dependencies..."
  cd frontend
  npm install --silent
  echo "[2/3] Building frontend..."
  npm run build
  cd ..
else
  echo "[1-2/3] Skipping frontend build (not present)"
fi

# Setup backend
echo "[3/3] Setting up backend..."
cd backend
pip install -r requirements.txt -q

echo ""
echo "=== Starting Reckoning Studio ==="
echo "  App:             http://localhost:8000"
echo "  Telegram bridge: ./telegram.sh  (run in a separate terminal)"
echo "  Press Ctrl+C to stop"
echo ""

python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
