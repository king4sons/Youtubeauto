"""
Whitelisted app launcher for Reckoning.

DELIBERATE SCOPE LIMIT: this module can do exactly one thing — open an app
from a named whitelist, using macOS `open -a`. That's it.

It does NOT:
- simulate keystrokes or mouse clicks
- create, move, or delete files
- run arbitrary shell commands
- accept app names that aren't on the whitelist below

Why this boundary exists: a voice assistant that can simulate input or touch
the filesystem turns a misheard word or a bad inference into an irreversible
action on your real machine. Opening a known, named app is the one capability
that's both useful and safe — worst case, the wrong app opens and you close it.

To add an app to the whitelist, add it to ALLOWED_APPS below with the exact
name macOS uses for that app (same as what you'd type in Spotlight).
"""
import subprocess
from typing import Optional

from memory_store import MemoryStore

# Edit this list to control exactly what Reckoning is allowed to open.
# Keys are what you say ("open obsidian"), values are the macOS app name.
ALLOWED_APPS = {
    "obsidian": "Obsidian",
    "claude": "Claude",
    "notes": "Notes",
    "finder": "Finder",
    "terminal": "Terminal",
    "calendar": "Calendar",
    "mail": "Mail",
}


def list_allowed_apps() -> list:
    return sorted(ALLOWED_APPS.keys())


def open_app(app_key: str, memory: Optional[MemoryStore] = None) -> str:
    """
    Attempts to open a whitelisted app. Returns a human-readable result string.
    Refuses anything not explicitly on the whitelist — no fuzzy matching,
    no "close enough" guesses, so it can't be tricked into opening something
    unintended.
    """
    key = app_key.strip().lower()

    if key not in ALLOWED_APPS:
        return (
            f"I can't open '{app_key}' — it's not on my whitelist. "
            f"I can open: {', '.join(list_allowed_apps())}."
        )

    macos_app_name = ALLOWED_APPS[key]

    try:
        subprocess.run(["open", "-a", macos_app_name], check=True, timeout=10)
        if memory:
            memory.log_app_launch(macos_app_name)
        return f"Opened {macos_app_name}."
    except subprocess.CalledProcessError:
        return f"Tried to open {macos_app_name} but macOS couldn't find it. Is it installed?"
    except subprocess.TimeoutExpired:
        return f"Opening {macos_app_name} timed out."
    except Exception as e:
        return f"Couldn't open {macos_app_name}: {e}"
