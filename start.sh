#!/bin/bash
set -e

echo "=== Reckoning Studio Setup ==="

# Build frontend
echo "[1/3] Installing frontend dependencies..."
cd frontend
npm install --silent
echo "[2/3] Building frontend..."
npm run build
cd ..

# Setup backend
echo "[3/3] Setting up backend..."
cd backend
pip install -r requirements.txt -q

# Copy built frontend to where backend expects it
echo ""
echo "=== Starting Reckoning Studio ==="
echo "  App will be available at: http://localhost:8000"
echo "  Press Ctrl+C to stop"
echo ""

python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
