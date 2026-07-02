#!/usr/bin/env python3
"""
Read-only status API for the Reckoning dashboard.

This server does ONE thing: reads from the SQLite memory store and serves
it as JSON. It has no write endpoints — the dashboard is a window into
what Reckoning is doing, not a control panel that can trigger actions.

Run:
    python3 dashboard_server.py

Then open dashboard/index.html in a browser, or serve the dashboard folder
with any static file server.
"""
import sys
from pathlib import Path
from datetime import datetime

from flask import Flask, jsonify
from flask_cors import CORS

sys.path.insert(0, str(Path(__file__).parent))
from memory_store import MemoryStore

app = Flask(__name__)
CORS(app)  # dashboard runs as a separate static page, needs CORS to fetch this

memory = MemoryStore(Path(__file__).parent / "memory" / "reckoning.db")

# Updated by jarvis.py while it's running, read by this server.
# Simple file-based heartbeat — avoids needing a shared process or socket.
MIC_STATUS_FILE = Path(__file__).parent / "memory" / "mic_status.txt"


@app.route("/api/status")
def status():
    pipeline = memory.latest_pipeline_status()
    daily_status = memory.latest_status()
    recent_memories = memory.query_memories(limit=10)
    recent_turns = memory.recent_turns_full(limit=6)
    app_launches = memory.recent_app_launches(limit=5)

    mic_status = "unknown"
    if MIC_STATUS_FILE.exists():
        try:
            mic_status = MIC_STATUS_FILE.read_text().strip()
        except Exception:
            pass

    return jsonify({
        "mic_status": mic_status,
        "pipeline": pipeline,
        "daily_status": daily_status,
        "recent_memories": recent_memories,
        "recent_turns": recent_turns,
        "app_launches": app_launches,
        "fetched_at": datetime.now().isoformat(),
    })


@app.route("/api/health")
def health():
    return jsonify({"ok": True})


if __name__ == "__main__":
    print("Dashboard API running at http://localhost:5151")
    print("This is read-only — it cannot trigger any action.")
    app.run(port=5151, debug=False)
