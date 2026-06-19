from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import json
import os
from ..database import get_db
from ..models import Script, Project, User
from ..auth.router import get_current_user
from ..config import settings

router = APIRouter(prefix="/scripts", tags=["scripts"])

class ScriptGenerateRequest(BaseModel):
    project_id: int
    title: str
    genre: str = "thriller"
    tone: str = "dramatic"
    duration_minutes: int = 12
    premise: str
    characters: Optional[List[str]] = None
    setting: Optional[str] = None
    additional_notes: Optional[str] = None

class ScriptResponse(BaseModel):
    id: int
    project_id: int
    title: Optional[str]
    content: Optional[str]
    scenes: Optional[list]
    genre: Optional[str]
    tone: Optional[str]
    duration_estimate: Optional[int]
    word_count: Optional[int]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

def generate_script_with_claude(script_id: int, request: ScriptGenerateRequest, db_url: str):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script:
        return
    script.status = "generating"
    db.commit()
    try:
        api_key = settings.ANTHROPIC_API_KEY
        if api_key and api_key != "sk-ant-your-key-here":
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            prompt = f"""Create a cinematic {request.genre} story script for a {request.duration_minutes}-minute video.

Title: {request.title}
Genre: {request.genre}
Tone: {request.tone}
Premise: {request.premise}
Characters: {', '.join(request.characters or ['Protagonist', 'Antagonist'])}
Setting: {request.setting or 'Various cinematic locations'}
Additional Notes: {request.additional_notes or 'None'}

Write a full cinematic script with:
1. A compelling opening hook (0-2 min)
2. Rising tension and world-building (2-7 min)
3. Climactic confrontation (7-10 min)
4. Resolution (10-{request.duration_minutes} min)

Format each scene as:
SCENE [number] - [location]
[Camera direction]
[Action/dialogue]
[Emotional beat]

Also provide a JSON scenes array at the end in this format:
SCENES_JSON:
[{{"scene": 1, "title": "...", "location": "...", "duration": 60, "description": "...", "camera": "...", "mood": "..."}}]"""
            response = client.messages.create(
                model="claude-opus-4-8",
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )
            full_content = response.content[0].text
        else:
            full_content = f"""RECKONING STUDIO DEMO SCRIPT
Title: {request.title}
Genre: {request.genre.upper()} | Tone: {request.tone.upper()}

SCENE 1 - EXT. ABANDONED CITY - DUSK
[Wide establishing shot]
The city breathes its last breath.

NARRATOR (V.O.): "They said the reckoning would come."

SCENES_JSON:
[{{"scene": 1, "title": "The Fallen City", "location": "Abandoned City", "duration": 90, "description": "Establishing shot", "camera": "Drone wide", "mood": "Desolate"}}]"""

        scenes = []
        if "SCENES_JSON:" in full_content:
            try:
                json_part = full_content.split("SCENES_JSON:")[1].strip()
                scenes = json.loads(json_part)
            except Exception:
                pass

        script.content = full_content
        script.scenes = scenes
        script.word_count = len(full_content.split())
        script.duration_estimate = request.duration_minutes * 60
        script.status = "completed"
    except Exception as e:
        script.status = "failed"
        script.content = f"Generation failed: {str(e)}"
    db.commit()
    db.close()

@router.post("/generate", response_model=ScriptResponse)
def generate_script(
    request: ScriptGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == request.project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    script = Script(
        project_id=request.project_id,
        title=request.title,
        genre=request.genre,
        tone=request.tone,
        status="queued"
    )
    db.add(script)
    db.commit()
    db.refresh(script)
    background_tasks.add_task(generate_script_with_claude, script.id, request, "sqlite:///./reckoning.db")
    return script

@router.get("/project/{project_id}", response_model=List[ScriptResponse])
def get_project_scripts(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(Script).filter(Script.project_id == project_id).all()

@router.get("/{script_id}", response_model=ScriptResponse)
def get_script(script_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    return script

@router.put("/{script_id}/content", response_model=ScriptResponse)
def update_script_content(script_id: int, content_data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    if "content" in content_data:
        script.content = content_data["content"]
    if "scenes" in content_data:
        script.scenes = content_data["scenes"]
    script.status = "completed"
    db.commit()
    db.refresh(script)
    return script
