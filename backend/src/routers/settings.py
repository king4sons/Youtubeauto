from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import httpx
from ..auth.router import get_current_user
from ..models import User
from ..config import settings

router = APIRouter(prefix="/settings", tags=["settings"])

def _masked(key: Optional[str]) -> Optional[str]:
    if not key:
        return None
    if len(key) <= 8:
        return "****"
    return key[:4] + "****" + key[-4:]

def _is_set(key: Optional[str]) -> bool:
    return bool(key and key not in ("", "sk-ant-your-key-here", "your-key-here"))

@router.get("/api-status")
def get_api_status(current_user: User = Depends(get_current_user)):
    return {
        "anthropic": {
            "configured": _is_set(settings.ANTHROPIC_API_KEY),
            "masked_key": _masked(settings.ANTHROPIC_API_KEY),
            "label": "Claude — Script Generation",
            "get_key_url": "https://console.anthropic.com/settings/keys",
            "env_var": "ANTHROPIC_API_KEY",
        },
        "elevenlabs": {
            "configured": _is_set(settings.ELEVENLABS_API_KEY),
            "masked_key": _masked(settings.ELEVENLABS_API_KEY),
            "label": "ElevenLabs — AI Voiceover",
            "get_key_url": "https://elevenlabs.io/app/settings/api-keys",
            "env_var": "ELEVENLABS_API_KEY",
        },
        "veo": {
            "configured": _is_set(getattr(settings, "VEO_API_KEY", None)),
            "label": "Google Veo 3 — Cinematic Video",
            "get_key_url": "https://aistudio.google.com/apikey",
            "env_var": "VEO_API_KEY",
        },
        "openai": {
            "configured": _is_set(getattr(settings, "OPENAI_API_KEY", None)),
            "label": "OpenAI — Sora Video + TTS",
            "get_key_url": "https://platform.openai.com/api-keys",
            "env_var": "OPENAI_API_KEY",
        },
        "runway": {
            "configured": _is_set(getattr(settings, "RUNWAY_API_KEY", None)),
            "label": "Runway Gen-4 — Video Assembly",
            "get_key_url": "https://app.runwayml.com/settings",
            "env_var": "RUNWAY_API_KEY",
        },
        "kling": {
            "configured": _is_set(getattr(settings, "KLING_API_KEY", None)),
            "label": "Kling AI — Character Scenes",
            "get_key_url": "https://platform.klingai.com",
            "env_var": "KLING_API_KEY",
        },
        "luma": {
            "configured": _is_set(getattr(settings, "LUMA_API_KEY", None)),
            "label": "Luma Dream Machine — B-Roll",
            "get_key_url": "https://lumalabs.ai/dream-machine/api",
            "env_var": "LUMA_API_KEY",
        },
        "youtube": {
            "configured": _is_set(settings.YOUTUBE_CLIENT_ID),
            "label": "YouTube — Auto-Upload",
            "get_key_url": "https://console.cloud.google.com/apis/credentials",
            "env_var": "YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET",
        },
        "tiktok": {
            "configured": _is_set(settings.TIKTOK_CLIENT_KEY),
            "label": "TikTok — Auto-Upload",
            "get_key_url": "https://developers.tiktok.com",
            "env_var": "TIKTOK_CLIENT_KEY",
        },
        "instagram": {
            "configured": _is_set(settings.INSTAGRAM_APP_ID),
            "label": "Instagram — Auto-Upload",
            "get_key_url": "https://developers.facebook.com/apps",
            "env_var": "INSTAGRAM_APP_ID",
        },
        "facebook": {
            "configured": _is_set(settings.FACEBOOK_APP_ID),
            "label": "Facebook — Auto-Upload",
            "get_key_url": "https://developers.facebook.com/apps",
            "env_var": "FACEBOOK_APP_ID",
        },
    }

@router.post("/test/anthropic")
async def test_anthropic_key(current_user: User = Depends(get_current_user)):
    if not _is_set(settings.ANTHROPIC_API_KEY):
        raise HTTPException(status_code=400, detail="ANTHROPIC_API_KEY not set in .env")
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=30,
            messages=[{"role": "user", "content": "Reply with just: RECKONING STUDIO READY"}]
        )
        return {
            "status": "connected",
            "model": "claude-haiku-4-5-20251001",
            "response": response.content[0].text,
            "message": "Anthropic API key is working. Script generation is active."
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Anthropic API error: {str(e)}")

@router.post("/test/elevenlabs")
async def test_elevenlabs_key(current_user: User = Depends(get_current_user)):
    if not _is_set(settings.ELEVENLABS_API_KEY):
        raise HTTPException(status_code=400, detail="ELEVENLABS_API_KEY not set in .env")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.elevenlabs.io/v1/user",
                headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
                timeout=10
            )
        if response.status_code == 200:
            data = response.json()
            return {
                "status": "connected",
                "message": "ElevenLabs API key is working. AI voiceover is active.",
                "character_count": data.get("subscription", {}).get("character_count", 0),
                "character_limit": data.get("subscription", {}).get("character_limit", 0),
            }
        raise HTTPException(status_code=400, detail=f"ElevenLabs returned {response.status_code}: {response.text}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"ElevenLabs API error: {str(e)}")

@router.get("/env-template")
def get_env_template(current_user: User = Depends(get_current_user)):
    return {
        "template": """# Reckoning Studio — Environment Variables
# Add this file as: backend/.env

# ── Core (required) ──────────────────────────
SECRET_KEY=change-this-to-a-random-64-char-string

# ── AI Script Generation ─────────────────────
ANTHROPIC_API_KEY=sk-ant-api03-...

# ── AI Voiceover ─────────────────────────────
ELEVENLABS_API_KEY=...

# ── Video Generators ─────────────────────────
VEO_API_KEY=...
OPENAI_API_KEY=sk-proj-...
RUNWAY_API_KEY=...
KLING_API_KEY=...
LUMA_API_KEY=...

# ── Social Publishing ─────────────────────────
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
""",
        "note": "Save this as backend/.env then restart the backend server."
    }
