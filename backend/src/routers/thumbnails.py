from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import threading
import time
from ..database import get_db
from ..models import Thumbnail, Project, User
from ..auth.router import get_current_user

router = APIRouter(prefix="/thumbnails", tags=["thumbnails"])

THUMBNAIL_STYLES = [
    {"id": "cinematic_dark", "name": "Cinematic Dark", "description": "Dark moody with dramatic lighting"},
    {"id": "bold_text", "name": "Bold Impact", "description": "Large text overlay with vibrant colors"},
    {"id": "minimal", "name": "Minimal Clean", "description": "Clean design with subtle elements"},
    {"id": "action_packed", "name": "Action Packed", "description": "Dynamic composition with motion blur"},
    {"id": "documentary", "name": "Documentary", "description": "Authentic photojournalistic style"},
]

class ThumbnailRequest(BaseModel):
    project_id: int
    style: str = "cinematic_dark"
    title_text: Optional[str] = None
    count: int = 4

class ThumbnailResponse(BaseModel):
    id: int
    project_id: int
    image_url: Optional[str]
    style: Optional[str]
    is_selected: bool
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/styles")
def get_thumbnail_styles():
    return THUMBNAIL_STYLES

@router.post("/generate", response_model=List[ThumbnailResponse])
def generate_thumbnails(
    request: ThumbnailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == request.project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    thumbnails = []
    styles = [request.style, "bold_text", "minimal", "action_packed"][:request.count]

    for i, style in enumerate(styles):
        thumb = Thumbnail(
            project_id=request.project_id,
            style=style,
            image_url=f"/media/thumbnails/generated/{request.project_id}_{style}_{i}.jpg",
            is_selected=(i == 0)
        )
        db.add(thumb)
        thumbnails.append(thumb)

    db.commit()
    for t in thumbnails:
        db.refresh(t)

    return thumbnails

@router.put("/{thumbnail_id}/select")
def select_thumbnail(thumbnail_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    thumb = db.query(Thumbnail).filter(Thumbnail.id == thumbnail_id).first()
    if not thumb:
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    db.query(Thumbnail).filter(Thumbnail.project_id == thumb.project_id).update({"is_selected": False})
    thumb.is_selected = True
    db.commit()
    return {"message": "Thumbnail selected"}

@router.get("/project/{project_id}", response_model=List[ThumbnailResponse])
def get_project_thumbnails(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Thumbnail).filter(Thumbnail.project_id == project_id).all()
