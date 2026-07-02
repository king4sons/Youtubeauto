"""
Persistent memory for Reckoning.

Stores:
- conversation turns (rolling log, for short-term context)
- "facts" — durable notes you tell it ("the inheritance script is in stage 3")
- structured memories — tagged JSON entries (project/category/lesson/date), queryable
- daily status — what you manually tell it is on your plate today
- pipeline status — what stage your active haneef-pipeline project is in
"""
import json
import sqlite3
import datetime
from pathlib import Path
from typing import List, Dict, Optional


class MemoryStore:
    def __init__(self, db_path: Path):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db_path = db_path
        self._init_schema()

    def _conn(self):
        return sqlite3.connect(self.db_path)

    def _init_schema(self):
        with self._conn() as c:
            c.execute("""
                CREATE TABLE IF NOT EXISTS turns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    channel TEXT NOT NULL DEFAULT 'voice',
                    created_at TEXT NOT NULL
                )
            """)
            # Migration: older databases (created before the "channel" column
            # existed, e.g. from before phone access was added) won't have it.
            try:
                c.execute("ALTER TABLE turns ADD COLUMN channel TEXT NOT NULL DEFAULT 'voice'")
            except sqlite3.OperationalError:
                pass  # column already exists
            c.execute("""
                CREATE TABLE IF NOT EXISTS facts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fact TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            c.execute("""
                CREATE TABLE IF NOT EXISTS daily_status (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            c.execute("""
                CREATE TABLE IF NOT EXISTS structured_memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project TEXT NOT NULL,
                    category TEXT NOT NULL,
                    content TEXT NOT NULL,
                    entry_date TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            c.execute("""
                CREATE TABLE IF NOT EXISTS pipeline_status (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project TEXT NOT NULL,
                    stage TEXT NOT NULL,
                    next_step TEXT,
                    updated_at TEXT NOT NULL
                )
            """)
            c.execute("""
                CREATE TABLE IF NOT EXISTS app_launch_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    app_name TEXT NOT NULL,
                    launched_at TEXT NOT NULL
                )
            """)

    # ---- conversation turns ----
    def log_turn(self, role: str, content: str, channel: str = "voice"):
        with self._conn() as c:
            c.execute(
                "INSERT INTO turns (role, content, channel, created_at) VALUES (?, ?, ?, ?)",
                (role, content, channel, datetime.datetime.now().isoformat()),
            )

    def recent_turns(self, limit: int = 10) -> List[Dict]:
        """Returns role/content only — this is spliced directly into the
        Claude messages array, which doesn't accept extra keys."""
        with self._conn() as c:
            rows = c.execute(
                "SELECT role, content FROM turns ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        rows.reverse()
        return [{"role": r, "content": content} for r, content in rows]

    def recent_turns_full(self, limit: int = 10) -> List[Dict]:
        """Same as recent_turns but includes channel + timestamp, for the dashboard."""
        with self._conn() as c:
            rows = c.execute(
                "SELECT role, content, channel, created_at FROM turns ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        rows.reverse()
        return [
            {"role": r, "content": content, "channel": channel, "created_at": created_at}
            for r, content, channel, created_at in rows
        ]

    # ---- durable facts (flat, simple) ----
    def add_fact(self, fact: str):
        with self._conn() as c:
            c.execute(
                "INSERT INTO facts (fact, created_at) VALUES (?, ?)",
                (fact, datetime.datetime.now().isoformat()),
            )

    def all_facts(self) -> List[str]:
        with self._conn() as c:
            rows = c.execute("SELECT fact FROM facts ORDER BY id DESC").fetchall()
        return [r[0] for r in rows]

    # ---- structured memories (tagged, queryable) ----
    def add_memory(self, project: str, category: str, content: str, entry_date: Optional[str] = None):
        """
        category is freeform but typically one of:
        lesson, successful_workflow, failed_workflow, channel_data, revenue_data,
        agent_improvement, conversation_note
        """
        entry_date = entry_date or datetime.date.today().isoformat()
        with self._conn() as c:
            c.execute(
                "INSERT INTO structured_memories (project, category, content, entry_date, created_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (project, category, content, entry_date, datetime.datetime.now().isoformat()),
            )

    def query_memories(self, project: Optional[str] = None, category: Optional[str] = None,
                        limit: int = 20) -> List[Dict]:
        query = "SELECT project, category, content, entry_date FROM structured_memories WHERE 1=1"
        params = []
        if project:
            query += " AND project = ?"
            params.append(project)
        if category:
            query += " AND category = ?"
            params.append(category)
        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)

        with self._conn() as c:
            rows = c.execute(query, params).fetchall()
        return [
            {"project": p, "category": cat, "content": content, "date": d}
            for p, cat, content, d in rows
        ]

    def all_projects(self) -> List[str]:
        with self._conn() as c:
            rows = c.execute("SELECT DISTINCT project FROM structured_memories").fetchall()
        return [r[0] for r in rows]

    # ---- daily status (manual, since no live email/calendar yet) ----
    def set_status(self, status: str):
        with self._conn() as c:
            c.execute(
                "INSERT INTO daily_status (status, created_at) VALUES (?, ?)",
                (status, datetime.datetime.now().isoformat()),
            )

    def latest_status(self) -> str:
        with self._conn() as c:
            row = c.execute(
                "SELECT status, created_at FROM daily_status ORDER BY id DESC LIMIT 1"
            ).fetchone()
        if not row:
            return "No status given yet today."
        status, created_at = row
        return f"(as of {created_at}): {status}"

    # ---- pipeline status (what stage your active project is in) ----
    def set_pipeline_status(self, project: str, stage: str, next_step: Optional[str] = None):
        with self._conn() as c:
            c.execute(
                "INSERT INTO pipeline_status (project, stage, next_step, updated_at) VALUES (?, ?, ?, ?)",
                (project, stage, next_step, datetime.datetime.now().isoformat()),
            )

    def latest_pipeline_status(self) -> Optional[Dict]:
        with self._conn() as c:
            row = c.execute(
                "SELECT project, stage, next_step, updated_at FROM pipeline_status "
                "ORDER BY id DESC LIMIT 1"
            ).fetchone()
        if not row:
            return None
        project, stage, next_step, updated_at = row
        return {"project": project, "stage": stage, "next_step": next_step, "updated_at": updated_at}

    # ---- app launch log (audit trail for the whitelisted launcher) ----
    def log_app_launch(self, app_name: str):
        with self._conn() as c:
            c.execute(
                "INSERT INTO app_launch_log (app_name, launched_at) VALUES (?, ?)",
                (app_name, datetime.datetime.now().isoformat()),
            )

    def recent_app_launches(self, limit: int = 10) -> List[Dict]:
        with self._conn() as c:
            rows = c.execute(
                "SELECT app_name, launched_at FROM app_launch_log ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [{"app": a, "launched_at": t} for a, t in rows]
