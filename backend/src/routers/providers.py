from fastapi import APIRouter, Depends
from typing import List, Optional
from pydantic import BaseModel
from ..auth.router import get_current_user
from ..models import User

router = APIRouter(prefix="/providers", tags=["providers"])

VIDEO_PROVIDERS = [
    {
        "id": "veo3",
        "name": "Google Veo 3",
        "grade": 10.0,
        "grade_label": "10/10",
        "tagline": "Best overall cinematic quality",
        "color": "#4285F4",
        "icon": "veo",
        "strengths": [
            "Extremely realistic motion",
            "Native audio generation",
            "Strong camera movement control",
            "Hollywood-style cinematic shots",
            "Excellent for trailers and story scenes"
        ],
        "best_for": ["Faceless cinematic channels", "Movie-quality shorts", "High-end storytelling"],
        "shot_types": ["Wide establishing shot", "Drone flyover", "Dolly zoom", "Dutch angle", "Tracking shot"],
        "max_duration": 60,
        "resolutions": ["1080p", "4K"],
        "aspect_ratios": ["16:9", "9:16", "1:1"],
        "api_endpoint": "https://generativelanguage.googleapis.com/v1beta/models/veo-3",
        "api_key_env": "VEO_API_KEY",
        "cost_per_second": 0.08,
        "available": True,
        "recommended_for": ["cinematic", "trailer", "documentary", "epic"]
    },
    {
        "id": "sora",
        "name": "OpenAI Sora",
        "grade": 9.8,
        "grade_label": "9.8/10",
        "tagline": "Best for narrative storytelling",
        "color": "#10a37f",
        "icon": "sora",
        "strengths": [
            "Excellent scene composition",
            "Strong story continuity",
            "Realistic environments",
            "Great for film-like sequences"
        ],
        "best_for": ["Long-form YouTube stories", "Betrayal and revenge narratives", "Character-driven content"],
        "shot_types": ["Over-the-shoulder", "Close-up emotional", "Scene transition", "Interior scene", "Character reveal"],
        "max_duration": 60,
        "resolutions": ["1080p", "4K"],
        "aspect_ratios": ["16:9", "9:16"],
        "api_endpoint": "https://api.openai.com/v1/video/generations",
        "api_key_env": "OPENAI_API_KEY",
        "cost_per_second": 0.12,
        "available": True,
        "recommended_for": ["narrative", "betrayal", "drama", "character"]
    },
    {
        "id": "runway",
        "name": "Runway Gen-4",
        "grade": 9.5,
        "grade_label": "9.5/10",
        "tagline": "Best professional creator tool",
        "color": "#6366f1",
        "icon": "runway",
        "strengths": [
            "Motion Brush control",
            "Camera path customization",
            "Character consistency across scenes",
            "Professional editing workflow",
            "Image-to-video pipeline"
        ],
        "best_for": ["YouTube automation businesses", "Production pipelines", "Commercial-quality content"],
        "shot_types": ["Motion brush", "Camera path", "Consistent character", "Scene transition", "Background replacement"],
        "max_duration": 30,
        "resolutions": ["1080p", "4K"],
        "aspect_ratios": ["16:9", "9:16", "1:1"],
        "api_endpoint": "https://api.runwayml.com/v1/image_to_video",
        "api_key_env": "RUNWAY_API_KEY",
        "cost_per_second": 0.06,
        "available": True,
        "recommended_for": ["assembly", "consistency", "editing", "commercial"]
    },
    {
        "id": "kling",
        "name": "Kling AI",
        "grade": 9.4,
        "grade_label": "9.4/10",
        "tagline": "Best value for long-form creators",
        "color": "#f59e0b",
        "icon": "kling",
        "strengths": [
            "Outstanding human motion",
            "Longer clip generation (up to 3 min)",
            "Strong lip-sync capability",
            "Lower cost than competitors",
            "Great facial expressions"
        ],
        "best_for": ["Long-form YouTube channels", "Cinematic faceless videos", "Budget-conscious creators"],
        "shot_types": ["Lip-sync close-up", "Human motion", "Emotional reaction", "Walk-and-talk", "Crowd scene"],
        "max_duration": 180,
        "resolutions": ["1080p"],
        "aspect_ratios": ["16:9", "9:16"],
        "api_endpoint": "https://api.klingai.com/v1/videos/text2video",
        "api_key_env": "KLING_API_KEY",
        "cost_per_second": 0.02,
        "available": True,
        "recommended_for": ["long-form", "characters", "dialogue", "budget"]
    },
    {
        "id": "luma",
        "name": "Luma Dream Machine",
        "grade": 9.0,
        "grade_label": "9.0/10",
        "tagline": "Best speed-to-quality ratio",
        "color": "#ec4899",
        "icon": "luma",
        "strengths": [
            "Fastest generation time",
            "Good cinematic visuals",
            "Easy image-to-video workflow",
            "Great for testing and B-roll"
        ],
        "best_for": ["Rapid content production", "Shorts and Reels", "B-roll creation"],
        "shot_types": ["Image-to-video", "B-roll insert", "Atmosphere shot", "Quick cut", "Scene filler"],
        "max_duration": 10,
        "resolutions": ["1080p"],
        "aspect_ratios": ["16:9", "9:16", "1:1"],
        "api_endpoint": "https://api.lumalabs.ai/dream-machine/v1/generations/video",
        "api_key_env": "LUMA_API_KEY",
        "cost_per_second": 0.04,
        "available": True,
        "recommended_for": ["shorts", "broll", "speed", "testing"]
    }
]

VOICEOVER_PROVIDERS = [
    {
        "id": "elevenlabs",
        "name": "ElevenLabs",
        "grade": 9.9,
        "tagline": "Industry-leading AI voice synthesis",
        "color": "#f59e0b",
        "strengths": ["Most natural voices", "Voice cloning", "Emotional range", "30+ languages", "Real-time generation"],
        "api_key_env": "ELEVENLABS_API_KEY",
        "available": True,
        "voices": [
            {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Sarah", "style": "warm, conversational"},
            {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel", "style": "calm, professional"},
            {"id": "AZnzlk1XvdvUeBnXmlld", "name": "Domi", "style": "strong, expressive"},
            {"id": "MF3mGyEYCl7XYWbV9V6O", "name": "Elli", "style": "emotional, young"},
            {"id": "TxGEqnHWrfWFTfGW9XjX", "name": "Josh", "style": "deep, authoritative"},
            {"id": "VR6AewLTigWG4xSOukaG", "name": "Arnold", "style": "crisp, narrative"},
        ]
    },
    {
        "id": "openai_tts",
        "name": "OpenAI TTS",
        "grade": 9.2,
        "tagline": "Fast, reliable, consistent",
        "color": "#10a37f",
        "strengths": ["Very fast", "Consistent quality", "6 voices", "Affordable"],
        "api_key_env": "OPENAI_API_KEY",
        "available": True,
        "voices": [
            {"id": "alloy", "name": "Alloy", "style": "neutral, balanced"},
            {"id": "echo", "name": "Echo", "style": "deep, resonant"},
            {"id": "fable", "name": "Fable", "style": "warm, British"},
            {"id": "onyx", "name": "Onyx", "style": "deep, authoritative"},
            {"id": "nova", "name": "Nova", "style": "warm, energetic"},
            {"id": "shimmer", "name": "Shimmer", "style": "clear, expressive"},
        ]
    }
]

RECOMMENDED_WORKFLOW = {
    "name": "Cinematic YouTube Automation Stack",
    "description": "Optimal provider chain for betrayal/revenge narratives targeting $10k-$50k/month",
    "steps": [
        {
            "step": 1,
            "provider": "Claude (Anthropic)",
            "role": "Script & Story Generation",
            "output": "Full screenplay with scene breakdown",
            "icon": "script",
            "color": "#f59e0b"
        },
        {
            "step": 2,
            "provider": "Google Veo 3",
            "role": "Main Cinematic Scenes",
            "output": "High-quality establishing shots, action sequences",
            "icon": "veo",
            "color": "#4285F4"
        },
        {
            "step": 3,
            "provider": "Kling AI",
            "role": "Character & Dialogue Scenes",
            "output": "Human motion, lip-sync, emotional close-ups",
            "icon": "kling",
            "color": "#f59e0b"
        },
        {
            "step": 4,
            "provider": "Runway Gen-4",
            "role": "Assembly & Enhancement",
            "output": "Scene consistency, transitions, Motion Brush effects",
            "icon": "runway",
            "color": "#6366f1"
        },
        {
            "step": 5,
            "provider": "ElevenLabs",
            "role": "Voiceover & Narration",
            "output": "Professional AI voice narration synced to scenes",
            "icon": "elevenlabs",
            "color": "#10a37f"
        },
        {
            "step": 6,
            "provider": "Reckoning Studio",
            "role": "Auto-Publish Everywhere",
            "output": "YouTube, TikTok, Instagram Reels, Facebook Reels",
            "icon": "publish",
            "color": "#ec4899"
        }
    ]
}

NARRATIVE_PRESETS = [
    {
        "id": "betrayal_revenge",
        "name": "Betrayal & Revenge",
        "description": "High-stakes narratives with emotional twists",
        "genre": "Drama/Thriller",
        "recommended_providers": ["sora", "veo3", "kling"],
        "tone": "Dark, Intense, Emotional",
        "shot_style": "Close-ups, Dutch angles, High contrast",
        "avg_views": "2M-15M",
        "monetization": "High -- strong retention",
        "example_titles": [
            "She Trusted Him With Everything -- He Destroyed It All",
            "The Betrayal That Changed Her Forever",
            "When Family Becomes Your Biggest Enemy"
        ]
    },
    {
        "id": "cinematic_documentary",
        "name": "Cinematic Documentary",
        "description": "True-story style with dramatic narration",
        "genre": "Documentary",
        "recommended_providers": ["veo3", "runway"],
        "tone": "Serious, Investigative, Dramatic",
        "shot_style": "Wide establishing, Drone shots, Archival style",
        "avg_views": "500K-5M",
        "monetization": "High CPM -- educational category",
        "example_titles": [
            "The Hidden Truth Behind The World's Biggest Scam",
            "How One Man Fooled Everyone For 20 Years"
        ]
    },
    {
        "id": "dark_fantasy",
        "name": "Dark Fantasy Epic",
        "description": "Fantasy worlds with cinematic scope",
        "genre": "Fantasy",
        "recommended_providers": ["veo3", "sora", "luma"],
        "tone": "Epic, Mystical, Dark",
        "shot_style": "Grand wide shots, Atmospheric lighting",
        "avg_views": "1M-10M",
        "monetization": "Medium-High -- strong subscriber growth",
        "example_titles": [
            "The Last Kingdom -- Full Cinematic Story",
            "Rise of The Shadow Realm"
        ]
    }
]


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


@router.get("/voiceover")
def get_voiceover_providers(current_user: User = Depends(get_current_user)):
    return VOICEOVER_PROVIDERS


@router.get("/workflow/recommended")
def get_recommended_workflow(current_user: User = Depends(get_current_user)):
    return RECOMMENDED_WORKFLOW


@router.get("/narrative-presets")
def get_narrative_presets(current_user: User = Depends(get_current_user)):
    return NARRATIVE_PRESETS


@router.get("/recommend")
def recommend_providers(
    use_case: str = "cinematic",
    budget: str = "medium",
    current_user: User = Depends(get_current_user)
):
    recommendations = []
    for provider in VIDEO_PROVIDERS:
        if any(use_case.lower() in r for r in provider["recommended_for"]):
            recommendations.append(provider)
    if not recommendations:
        recommendations = VIDEO_PROVIDERS[:3]
    return {
        "use_case": use_case,
        "budget": budget,
        "recommended": recommendations,
        "workflow": RECOMMENDED_WORKFLOW
    }
