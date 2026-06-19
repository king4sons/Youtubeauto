from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from ..database import get_db
from ..models import PublishedItem, SocialConnection, Project, User
from ..auth.router import get_current_user

router = APIRouter(prefix="/publishing", tags=["publishing"])

PLATFORMS = ["youtube", "tiktok", "instagram", "facebook"]

class PublishRequest(BaseModel):
    project_id: int
    platform: str
    content_type: str = "video"
    title: str
    description: str
    tags: Optional[List[str]] = []
    scheduled_at: Optional[datetime] = None

class PublishedItemResponse(BaseModel):
    id: int
    project_id: int
    platform: str
    content_type: str
    title: Optional[str]
    description: Optional[str]
    tags: Optional[list]
    scheduled_at: Optional[datetime]
    published_at: Optional[datetime]
    platform_url: Optional[str]
    status: str
    views: int
    likes: int
    comments: int
    shares: int
    created_at: datetime

    class Config:
        from_attributes = True

class SocialConnectionResponse(BaseModel):
    id: int
    platform: str
    platform_username: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TitleDescriptionRequest(BaseModel):
    project_id: int
    script_content: Optional[str] = None
    genre: Optional[str] = None

@router.get("/platforms")
def get_platforms():
    return [{"id": p, "name": p.title(), "icon": p} for p in PLATFORMS]

@router.post("/generate-metadata")
def generate_title_description(request: TitleDescriptionRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == request.project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "titles": [
            f"{project.title} | Full Cinematic Experience",
            f"The {project.title} Chronicles - Complete Story",
            f"{project.title}: An Epic Cinematic Journey",
            f"MUST WATCH: {project.title} - Full Movie",
        ],
        "descriptions": [
            f"Experience the full cinematic story of {project.title}. Subscribe for more epic content!\n\n#{project.genre or 'cinema'} #film #storytelling",
        ],
        "tags": [project.title.lower().replace(" ", ""), project.genre or "cinema", "reckoning studio", "cinematic story", "full movie"]
    }

@router.post("/schedule", response_model=PublishedItemResponse)
def schedule_publish(request: PublishRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == request.project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if request.platform not in PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform. Use: {PLATFORMS}")
    published_item = PublishedItem(
        project_id=request.project_id,
        platform=request.platform,
        content_type=request.content_type,
        title=request.title,
        description=request.description,
        tags=request.tags,
        scheduled_at=request.scheduled_at or datetime.utcnow(),
        status="scheduled" if request.scheduled_at else "publishing"
    )
    db.add(published_item)
    db.commit()
    db.refresh(published_item)
    return published_item

@router.get("/project/{project_id}", response_model=List[PublishedItemResponse])
def get_project_published(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(PublishedItem).filter(PublishedItem.project_id == project_id).all()

@router.get("/connections", response_model=List[SocialConnectionResponse])
def get_social_connections(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(SocialConnection).filter(SocialConnection.user_id == current_user.id).all()

@router.get("/scheduled")
def get_scheduled_items(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_project_ids = [p.id for p in db.query(Project).filter(Project.owner_id == current_user.id).all()]
    return db.query(PublishedItem).filter(
        PublishedItem.project_id.in_(user_project_ids),
        PublishedItem.status.in_(["scheduled", "publishing"])
    ).order_by(PublishedItem.scheduled_at).all()
