from fastapi import APIRouter, Depends
from typing import List, Optional
from pydantic import BaseModel
from ..auth.router import get_current_user
from ..models import User

router = APIRouter(prefix="/providers", tags=["providers"])

VIDEO_PROVIDERS = [
    {"id": "veo3", "name": "Google Veo 3", "grade": 10.0, "grade_label": "10/10", "tagline": "Best overall cinematic quality", "color": "#4285F4", "max_duration": 60, "resolutions": ["1080p", "4K"], "aspect_ratios": ["16:9", "9:16", "1:1"], "api_key_env": "VEO_API_KEY", "available": True, "recommended_for": ["cinematic", "trailer", "documentary", "epic"]},
    {"id": "sora", "name": "OpenAI Sora", "grade": 9.8, "grade_label": "9.8/10", "tagline": "Best for narrative storytelling", "color": "#10a37f", "max_duration": 60, "resolutions": ["1080p", "4K"], "aspect_ratios": ["16:9", "9:16"], "api_key_env": "OPENAI_API_KEY", "available": True, "recommended_for": ["narrative", "betrayal", "drama", "character"]},
    {"id": "runway", "name": "Runway Gen-4", "grade": 9.5, "grade_label": "9.5/10", "tagline": "Best professional creator tool", "color": "#6366f1", "max_duration": 30, "resolutions": ["1080p", "4K"], "aspect_ratios": ["16:9", "9:16", "1:1"], "api_key_env": "RUNWAY_API_KEY", "available": True, "recommended_for": ["assembly", "consistency", "editing", "commercial"]},
    {"id": "kling", "name": "Kling AI", "grade": 9.4, "grade_label": "9.4/10", "tagline": "Best value for long-form creators", "color": "#f59e0b", "max_duration": 180, "resolutions": ["1080p"], "aspect_ratios": ["16:9", "9:16"], "api_key_env": "KLING_API_KEY", "available": True, "recommended_for": ["long-form", "characters", "dialogue", "budget"]},
    {"id": "luma", "name": "Luma Dream Machine", "grade": 9.0, "grade_label": "9.0/10", "tagline": "Best speed-to-quality ratio", "color": "#ec4899", "max_duration": 10, "resolutions": ["1080p"], "aspect_ratios": ["16:9", "9:16", "1:1"], "api_key_env": "LUMA_API_KEY", "available": True, "recommended_for": ["shorts", "broll", "speed", "testing"]},
]

RECOMMENDED_WORKFLOW = {
    "name": "Cinematic YouTube Automation Stack",
    "steps": [
        {"step": 1, "provider": "Claude (Anthropic)", "role": "Script & Story Generation"},
        {"step": 2, "provider": "Google Veo 3", "role": "Main Cinematic Scenes"},
        {"step": 3, "provider": "Kling AI", "role": "Character & Dialogue Scenes"},
        {"step": 4, "provider": "Runway Gen-4", "role": "Assembly & Enhancement"},
        {"step": 5, "provider": "ElevenLabs", "role": "Voiceover & Narration"},
        {"step": 6, "provider": "Reckoning Studio", "role": "Auto-Publish Everywhere"},
    ]
}

@router.get("/video")
def get_video_providers(current_user: User = Depends(get_current_user)):
    return VIDEO_PROVIDERS

@router.get("/video/{provider_id}")
def get_video_provider(provider_id: str, current_user: User = Depends(get_current_user)):
    provider = next((p for p in VIDEO_PROVIDERS if p["id"] == provider_id), None)
    if not provider:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Provider not found")
    return provider

@router.get("/workflow/recommended")
def get_recommended_workflow(current_user: User = Depends(get_current_user)):
    return RECOMMENDED_WORKFLOW

@router.get("/recommend")
def recommend_providers(use_case: str = "cinematic", current_user: User = Depends(get_current_user)):
    recs = [p for p in VIDEO_PROVIDERS if any(use_case.lower() in r for r in p["recommended_for"])]
    return {"use_case": use_case, "recommended": recs or VIDEO_PROVIDERS[:3], "workflow": RECOMMENDED_WORKFLOW}
