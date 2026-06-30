#!/bin/bash
# YoutubeAuto — One-command setup

set -e
echo ""
echo "=== YoutubeAuto AI Content Studio Setup ==="
echo ""

# Backend
echo "[1/3] Installing backend dependencies..."
cd backend
npm install
cd ..

# Frontend
echo "[2/3] Installing frontend dependencies..."
cd frontend
npm install
cd ..

# .env setup
if [ ! -f backend/.env ]; then
  echo "[3/3] Creating .env file..."
  cp backend/.env.example backend/.env
  echo ""
  echo "IMPORTANT: Edit backend/.env and add your API keys:"
  echo "  - ANTHROPIC_API_KEY  (required for script generation)"
  echo "  - KLING_API_KEY      (optional — for Kling video models)"
  echo "  - VEO3_API_KEY       (optional — for Veo 3.1)"
  echo "  - RUNWAY_API_KEY     (optional — for Runway)"
  echo "  - ELEVEN_API_KEY     (optional — for voiceovers)"
  echo ""
  echo "Without API keys the app runs in dev/simulation mode."
else
  echo "[3/3] .env already exists, skipping."
fi

echo ""
echo "=== Setup complete! ==="
echo ""
echo "To start the app, open TWO terminals:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend && npm run dev"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend && npm start"
echo ""
echo "Then open http://localhost:3000"
echo ""
