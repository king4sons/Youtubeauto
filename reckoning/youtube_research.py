"""
Reckoning — YouTube comment research, for The Reckoning Files.

This module is READ-ONLY by construction. It only ever calls YouTube Data
API v3 "list" endpoints (channels.list, playlistItems.list, commentThreads.list)
to fetch public data. There is no code path here that posts, replies to, edits,
or moderates a comment — that capability simply doesn't exist in this file,
on purpose. If you ever want Reckoning to be able to reply to comments, that's
a meaningfully bigger decision (an AI acting on your public channel) and
deserves its own conversation, not a quiet addition here.

Quota note: each of these calls costs ~1 unit against YouTube's free daily
quota (10,000 units/day) — personal use won't come close to that.
"""
import os
import requests

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "").strip()
YOUTUBE_CHANNEL_ID = os.environ.get("YOUTUBE_CHANNEL_ID", "").strip()

API_BASE = "https://www.googleapis.com/youtube/v3"


class YouTubeResearchError(Exception):
    """Raised for any YouTube-research failure, with a message safe to show the user."""
    pass


def _require_key():
    if not YOUTUBE_API_KEY:
        raise YouTubeResearchError(
            "YouTube isn't configured — set YOUTUBE_API_KEY in .env (see SETUP.md)."
        )


def get_uploads_playlist_id(channel_id: str) -> str:
    """Resolve a channel's 'uploads' playlist ID — the cheap, correct way to
    list a channel's videos (cheaper than search.list)."""
    _require_key()
    resp = requests.get(
        f"{API_BASE}/channels",
        params={"part": "contentDetails", "id": channel_id, "key": YOUTUBE_API_KEY},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    items = data.get("items", [])
    if not items:
        raise YouTubeResearchError(f"No channel found for ID '{channel_id}'.")
    return items[0]["contentDetails"]["relatedPlaylists"]["uploads"]


def fetch_most_recent_video_id(channel_id: str) -> str:
    """Returns the video ID of the channel's most recent upload."""
    playlist_id = get_uploads_playlist_id(channel_id)
    resp = requests.get(
        f"{API_BASE}/playlistItems",
        params={
            "part": "contentDetails",
            "playlistId": playlist_id,
            "maxResults": 1,
            "key": YOUTUBE_API_KEY,
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    items = data.get("items", [])
    if not items:
        raise YouTubeResearchError("That channel has no uploads yet.")
    return items[0]["contentDetails"]["videoId"]


def fetch_comments(video_id: str, max_results: int = 50) -> list[str]:
    """Fetch up to max_results top-level comment texts, ordered by relevance.
    Read-only — this never writes, replies, or moderates."""
    _require_key()
    resp = requests.get(
        f"{API_BASE}/commentThreads",
        params={
            "part": "snippet",
            "videoId": video_id,
            "maxResults": min(max_results, 100),  # API hard cap per page is 100
            "order": "relevance",
            "textFormat": "plainText",
            "key": YOUTUBE_API_KEY,
        },
        timeout=20,
    )
    if resp.status_code == 403:
        raise YouTubeResearchError(
            "Comments are disabled on that video, or the API key lacks access."
        )
    resp.raise_for_status()
    data = resp.json()
    comments = []
    for item in data.get("items", []):
        try:
            text = item["snippet"]["topLevelComment"]["snippet"]["textDisplay"]
            comments.append(text)
        except (KeyError, IndexError):
            continue
    return comments


def resolve_video_id(video_id: str = "") -> str:
    """If a video_id is given, use it. Otherwise fall back to the most recent
    upload on the configured channel."""
    if video_id:
        return video_id
    if not YOUTUBE_CHANNEL_ID:
        raise YouTubeResearchError(
            "No video_id given and YOUTUBE_CHANNEL_ID isn't set in .env, so there's "
            "no channel to default to. Either specify a video, or set "
            "YOUTUBE_CHANNEL_ID in .env."
        )
    return fetch_most_recent_video_id(YOUTUBE_CHANNEL_ID)
