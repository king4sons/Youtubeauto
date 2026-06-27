"""
Reckoning — Reddit research, for The Reckoning Files.

READ-ONLY, same shape as youtube_research.py: this only ever calls Reddit's
official "list"/"search" endpoints to fetch public posts and comments.

Important distinction from something like Agent-Reach: this uses Reddit's
own sanctioned Application-Only OAuth (client_credentials grant) — an
app-level credential, with no personal Reddit login, no session cookie, and
no scraping. There is no code path here that posts, votes, comments, or
takes any action on Reddit. If you ever want Reckoning to post or comment
on Reddit, that's a different, much bigger decision and deserves its own
conversation, not a quiet addition here.

One honest caveat, not a guarantee either way: Reddit's free API tier is
restricted to non-commercial use. Using this privately, by you alone, as a
research aid for your own content (not redistributing Reddit data or
selling a product built on it) is the kind of personal use the free tier
is aimed at — but Reddit, not this code, is the actual authority on where
that line sits. If you want certainty, read Reddit's Data API Terms
yourself before relying on this for anything business-critical.
"""
import os
import time
import requests

REDDIT_CLIENT_ID = os.environ.get("REDDIT_CLIENT_ID", "").strip()
REDDIT_CLIENT_SECRET = os.environ.get("REDDIT_CLIENT_SECRET", "").strip()
REDDIT_USER_AGENT = os.environ.get(
    "REDDIT_USER_AGENT", "Reckoning-ContentResearch/1.0 (personal-use research script)"
).strip()

TOKEN_URL = "https://www.reddit.com/api/v1/access_token"
API_BASE = "https://oauth.reddit.com"

_token_cache = {"access_token": None, "expires_at": 0}


class RedditResearchError(Exception):
    """Raised for any Reddit-research failure, with a message safe to show the user."""
    pass


def _require_credentials():
    if not REDDIT_CLIENT_ID or not REDDIT_CLIENT_SECRET:
        raise RedditResearchError(
            "Reddit isn't configured — set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET "
            "in .env (see SETUP.md)."
        )


def _get_access_token() -> str:
    """App-only OAuth token — no personal Reddit login involved. Cached until
    it's close to expiring, since Reddit issues these for one hour at a time."""
    _require_credentials()

    if _token_cache["access_token"] and time.time() < _token_cache["expires_at"] - 30:
        return _token_cache["access_token"]

    try:
        resp = requests.post(
            TOKEN_URL,
            data={"grant_type": "client_credentials"},
            auth=(REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET),
            headers={"User-Agent": REDDIT_USER_AGENT},
            timeout=15,
        )
    except requests.RequestException as e:
        raise RedditResearchError(f"Couldn't reach Reddit to authenticate: {e}")

    if resp.status_code == 401:
        raise RedditResearchError(
            "Reddit rejected those credentials — double check REDDIT_CLIENT_ID and "
            "REDDIT_CLIENT_SECRET in .env."
        )
    if resp.status_code >= 400:
        raise RedditResearchError(
            f"Reddit's authentication endpoint returned HTTP {resp.status_code} — "
            "try again, or check Reddit's API status if it persists."
        )

    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise RedditResearchError(f"Reddit didn't return an access token: {data}")

    _token_cache["access_token"] = token
    _token_cache["expires_at"] = time.time() + data.get("expires_in", 3600)
    return token


def _api_get(path: str, params: dict | None = None) -> dict:
    token = _get_access_token()
    try:
        resp = requests.get(
            f"{API_BASE}{path}",
            params=params or {},
            headers={"Authorization": f"Bearer {token}", "User-Agent": REDDIT_USER_AGENT},
            timeout=20,
        )
    except requests.RequestException as e:
        raise RedditResearchError(f"Couldn't reach Reddit: {e}")

    if resp.status_code == 404:
        raise RedditResearchError("That subreddit doesn't exist (or is private/banned).")
    if resp.status_code == 403:
        raise RedditResearchError("That subreddit is private or quarantined — can't read it.")
    if resp.status_code == 429:
        raise RedditResearchError("Reddit's rate limit was hit — try again in a minute.")
    if resp.status_code >= 400:
        raise RedditResearchError(f"Reddit returned an unexpected error (HTTP {resp.status_code}).")
    return resp.json()


def search_subreddit(subreddit: str, query: str = "", limit: int = 10) -> list[dict]:
    """Returns top posts from a subreddit — either matching `query`, or just
    the current top posts if no query is given. Read-only."""
    limit = min(limit, 25)
    if query:
        data = _api_get(
            f"/r/{subreddit}/search",
            params={"q": query, "restrict_sr": "true", "sort": "relevance", "limit": limit},
        )
    else:
        data = _api_get(f"/r/{subreddit}/top", params={"limit": limit, "t": "month"})

    posts = []
    for child in data.get("data", {}).get("children", []):
        p = child.get("data", {})
        posts.append({
            "id": p.get("id"),
            "title": p.get("title", ""),
            "selftext": (p.get("selftext") or "")[:500],
            "score": p.get("score", 0),
            "num_comments": p.get("num_comments", 0),
            "permalink": f"https://reddit.com{p.get('permalink', '')}",
        })
    return posts


def fetch_post_comments(post_id: str, subreddit: str, max_results: int = 30) -> list[str]:
    """Top-level comment bodies for a given post. Read-only."""
    data = _api_get(f"/r/{subreddit}/comments/{post_id}", params={"limit": min(max_results, 100)})
    comments = []
    if len(data) > 1:
        for child in data[1].get("data", {}).get("children", []):
            body = child.get("data", {}).get("body")
            if body and body not in ("[deleted]", "[removed]"):
                comments.append(body)
    return comments[:max_results]
