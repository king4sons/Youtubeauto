from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import httpx
from ..auth.router import get_current_user
from ..models import User
from ..config import settings

router = APIRouter(prefix="/settings", tags=["settings"])

def _masked(key: Optional[str]) -> Optional[str]:
    if not key:
        return None
    return key[:4] + "****" + key[-4:] if len(key) > 8 else "****"

def _is_set(key: Optional[str]) -> bool:
    return bool(key and key not in ("", "sk-ant-your-key-here", "your-key-here"))

@router.get("/api-status")
def get_api_status(current_user: User = Depends(get_current_user)):
    return {
        "anthropic": {"configured": _is_set(settings.ANTHROPIC_API_KEY), "masked_key": _masked(settings.ANTHROPIC_API_KEY), "label": "Claude — Script Generation", "env_var": "ANTHROPIC_API_KEY"},
        "elevenlabs": {"configured": _is_set(settings.ELEVENLABS_API_KEY), "masked_key": _masked(settings.ELEVENLABS_API_KEY), "label": "ElevenLabs — AI Voiceover", "env_var": "ELEVENLABS_API_KEY"},
        "telegram": {"configured": _is_set(getattr(settings, "TELEGRAM_BOT_TOKEN", None)), "label": "Telegram Bridge", "env_var": "TELEGRAM_BOT_TOKEN"},
        "veo": {"configured": _is_set(getattr(settings, "VEO_API_KEY", None)), "label": "Google Veo 3", "env_var": "VEO_API_KEY"},
        "openai": {"configured": _is_set(getattr(settings, "OPENAI_API_KEY", None)), "label": "OpenAI Sora + TTS", "env_var": "OPENAI_API_KEY"},
        "runway": {"configured": _is_set(getattr(settings, "RUNWAY_API_KEY", None)), "label": "Runway Gen-4", "env_var": "RUNWAY_API_KEY"},
        "kling": {"configured": _is_set(getattr(settings, "KLING_API_KEY", None)), "label": "Kling AI", "env_var": "KLING_API_KEY"},
        "luma": {"configured": _is_set(getattr(settings, "LUMA_API_KEY", None)), "label": "Luma Dream Machine", "env_var": "LUMA_API_KEY"},
        "youtube": {"configured": _is_set(settings.YOUTUBE_CLIENT_ID), "label": "YouTube", "env_var": "YOUTUBE_CLIENT_ID"},
        "tiktok": {"configured": _is_set(settings.TIKTOK_CLIENT_KEY), "label": "TikTok", "env_var": "TIKTOK_CLIENT_KEY"},
        "instagram": {"configured": _is_set(settings.INSTAGRAM_APP_ID), "label": "Instagram", "env_var": "INSTAGRAM_APP_ID"},
        "facebook": {"configured": _is_set(settings.FACEBOOK_APP_ID), "label": "Facebook", "env_var": "FACEBOOK_APP_ID"},
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
        return {"status": "connected", "model": "claude-haiku-4-5-20251001", "response": response.content[0].text}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Anthropic API error: {str(e)}")

@router.post("/test/elevenlabs")
async def test_elevenlabs_key(current_user: User = Depends(get_current_user)):
    if not _is_set(settings.ELEVENLABS_API_KEY):
        raise HTTPException(status_code=400, detail="ELEVENLABS_API_KEY not set in .env")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("https://api.elevenlabs.io/v1/user", headers={"xi-api-key": settings.ELEVENLABS_API_KEY}, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return {"status": "connected", "message": "ElevenLabs API key is working."}
        raise HTTPException(status_code=400, detail=f"ElevenLabs returned {response.status_code}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"ElevenLabs API error: {str(e)}")
