from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import time
import threading
from ..database import get_db
from ..models import Voiceover, Script, Project, User
from ..auth.router import get_current_user
from ..config import settings

router = APIRouter(prefix="/voiceover", tags=["voiceover"])

AVAILABLE_VOICES = [
    # ElevenLabs voices
    {"id": "el_sarah", "name": "Sarah", "provider": "elevenlabs", "gender": "female", "style": "warm, conversational", "preview_text": "Perfect for emotional narratives", "el_voice_id": "EXAVITQu4vr4xnSDxMaL"},
    {"id": "el_rachel", "name": "Rachel", "provider": "elevenlabs", "gender": "female", "style": "calm, professional", "preview_text": "Ideal for documentary style", "el_voice_id": "21m00Tcm4TlvDq8ikWAM"},
    {"id": "el_josh", "name": "Josh", "provider": "elevenlabs", "gender": "male", "style": "deep, authoritative", "preview_text": "Built for thriller narration", "el_voice_id": "TxGEqnHWrfWFTfGW9XjX"},
    {"id": "el_arnold", "name": "Arnold", "provider": "elevenlabs", "gender": "male", "style": "crisp, narrative", "preview_text": "Classic storyteller voice", "el_voice_id": "VR6AewLTigWG4xSOukaG"},
    # Studio voices
    {"id": "male_deep", "name": "Marcus", "provider": "studio", "gender": "male", "style": "deep, authoritative", "preview_text": "Perfect for cinematic narration", "el_voice_id": None},
    {"id": "female_warm", "name": "Aria", "provider": "studio", "gender": "female", "style": "warm, engaging", "preview_text": "Ideal for documentary style", "el_voice_id": None},
    {"id": "male_dramatic", "name": "Viktor", "provider": "studio", "gender": "male", "style": "dramatic, intense", "preview_text": "Built for thriller content", "el_voice_id": None},
    {"id": "female_crisp", "name": "Nova", "provider": "studio", "gender": "female", "style": "crisp, professional", "preview_text": "Great for news-style delivery", "el_voice_id": None},
    {"id": "male_storyteller", "name": "Caspian", "provider": "studio", "gender": "male", "style": "storyteller, rich", "preview_text": "Classic narrator voice", "el_voice_id": None},
    {"id": "female_ethereal", "name": "Seraph", "provider": "studio", "gender": "female", "style": "ethereal, mysterious", "preview_text": "Perfect for supernatural content", "el_voice_id": None},
]

class VoiceoverRequest(BaseModel):
    project_id: int
    script_id: int
    voice_id: str = "male_deep"

class VoiceoverResponse(BaseModel):
    id: int
    project_id: int
    script_id: Optional[int]
    voice_id: Optional[str]
    voice_name: Optional[str]
    file_url: Optional[str]
    duration: Optional[float]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

def generate_voiceover(voiceover_id: int):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine("sqlite:///./reckoning.db", connect_args={"check_same_thread": False})
    db = sessionmaker(bind=engine)()

    voiceover = db.query(Voiceover).filter(Voiceover.id == voiceover_id).first()
    if not voiceover:
        return

    voiceover.status = "processing"
    db.commit()
    time.sleep(4)

    voiceover.status = "completed"
    voiceover.file_url = f"/media/voiceovers/vo_{voiceover_id}.mp3"
    voiceover.duration = 720.0
    db.commit()
    db.close()

@router.get("/voices")
def get_voices():
    return AVAILABLE_VOICES

@router.post("/generate", response_model=VoiceoverResponse)
def generate_voiceover_audio(
    request: VoiceoverRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    voice = next((v for v in AVAILABLE_VOICES if v["id"] == request.voice_id), AVAILABLE_VOICES[0])

    voiceover = Voiceover(
        project_id=request.project_id,
        script_id=request.script_id,
        voice_id=request.voice_id,
        voice_name=voice["name"],
        status="queued"
    )
    db.add(voiceover)
    db.commit()
    db.refresh(voiceover)

    thread = threading.Thread(target=generate_voiceover, args=(voiceover.id,))
    thread.daemon = True
    thread.start()

    return voiceover

@router.get("/project/{project_id}", response_model=List[VoiceoverResponse])
def get_project_voiceovers(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Voiceover).filter(Voiceover.project_id == project_id).all()
