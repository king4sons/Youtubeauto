from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from ..database import get_db
from ..models import Storyboard, Script, Project, User
from ..auth.router import get_current_user

router = APIRouter(prefix="/storyboard", tags=["storyboard"])

class StoryboardGenerateRequest(BaseModel):
    project_id: int
    script_id: int

class StoryboardResponse(BaseModel):
    id: int
    project_id: int
    script_id: Optional[int]
    frames: Optional[list]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

def generate_storyboard_frames(storyboard_id: int, script_id: int):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine("sqlite:///./reckoning.db", connect_args={"check_same_thread": False})
    db = sessionmaker(bind=engine)()
    storyboard = db.query(Storyboard).filter(Storyboard.id == storyboard_id).first()
    script = db.query(Script).filter(Script.id == script_id).first()
    if not storyboard or not script:
        return
    storyboard.status = "generating"
    db.commit()
    frames = []
    scenes = script.scenes or []
    camera_angles = ["Wide Shot", "Medium Shot", "Close-Up", "Extreme Close-Up", "Over-the-Shoulder", "Dutch Angle", "Bird's Eye", "Low Angle", "Tracking Shot", "Dolly Shot"]
    lighting_styles = ["Natural daylight", "Dramatic shadows", "Neon glow", "Golden hour", "Storm lighting", "Candlelight", "Fluorescent", "Backlit silhouette"]
    for i, scene in enumerate(scenes):
        frame_count = max(2, min(5, int(scene.get("duration", 60) / 30)))
        for j in range(frame_count):
            frames.append({
                "id": len(frames) + 1,
                "scene_number": scene.get("scene", i + 1),
                "frame_number": j + 1,
                "title": scene.get("title", f"Scene {i+1}"),
                "location": scene.get("location", "Unknown"),
                "description": scene.get("description", ""),
                "camera_angle": camera_angles[(i * 3 + j) % len(camera_angles)],
                "lighting": lighting_styles[(i + j) % len(lighting_styles)],
                "mood": scene.get("mood", "Dramatic"),
                "duration": scene.get("duration", 60) // max(1, frame_count),
                "notes": f"Frame {j+1} of scene {i+1}",
                "placeholder_color": f"hsl({(i * 45 + j * 20) % 360}, 60%, 25%)"
            })
    if not frames:
        for i in range(8):
            frames.append({
                "id": i + 1,
                "scene_number": i + 1,
                "frame_number": 1,
                "title": f"Scene {i+1}",
                "location": "Location TBD",
                "description": "Scene description pending script generation",
                "camera_angle": camera_angles[i % len(camera_angles)],
                "lighting": lighting_styles[i % len(lighting_styles)],
                "mood": "Dramatic",
                "duration": 90,
                "notes": "Auto-generated placeholder",
                "placeholder_color": f"hsl({i * 45}, 60%, 25%)"
            })
    storyboard.frames = frames
    storyboard.status = "completed"
    db.commit()
    db.close()

@router.post("/generate", response_model=StoryboardResponse)
def generate_storyboard(
    request: StoryboardGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == request.project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    storyboard = Storyboard(project_id=request.project_id, script_id=request.script_id, status="queued")
    db.add(storyboard)
    db.commit()
    db.refresh(storyboard)
    background_tasks.add_task(generate_storyboard_frames, storyboard.id, request.script_id)
    return storyboard

@router.get("/project/{project_id}", response_model=List[StoryboardResponse])
def get_project_storyboards(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(Storyboard).filter(Storyboard.project_id == project_id).all()

@router.get("/{storyboard_id}", response_model=StoryboardResponse)
def get_storyboard(storyboard_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    storyboard = db.query(Storyboard).filter(Storyboard.id == storyboard_id).first()
    if not storyboard:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    return storyboard
