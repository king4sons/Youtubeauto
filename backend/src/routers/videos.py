from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import time
import threading
from ..database import get_db
from ..models import Video, Short, Project, User
from ..auth.router import get_current_user

router = APIRouter(prefix="/videos", tags=["videos"])

class VideoGenerateRequest(BaseModel):
    project_id: int
    title: str
    style: str = "cinematic"
    resolution: str = "1920x1080"
    duration: int = 600
    script_id: Optional[int] = None
    storyboard_id: Optional[int] = None

class VideoResponse(BaseModel):
    id: int
    project_id: int
    title: Optional[str]
    file_url: Optional[str]
    thumbnail_url: Optional[str]
    duration: Optional[float]
    resolution: str
    status: str
    pipeline_stage: Optional[str]
    progress: int
    created_at: datetime

    class Config:
        from_attributes = True

class ShortResponse(BaseModel):
    id: int
    project_id: int
    video_id: Optional[int]
    title: Optional[str]
    file_url: Optional[str]
    thumbnail_url: Optional[str]
    duration: Optional[float]
    platform: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

def simulate_video_pipeline(video_id: int):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine("sqlite:///./reckoning.db", connect_args={"check_same_thread": False})
    db = sessionmaker(bind=engine)()

    stages = [
        ("Analyzing script & storyboard", 10),
        ("Generating visual segments", 30),
        ("Applying cinematic effects", 55),
        ("Adding transitions", 70),
        ("Mixing audio layers", 82),
        ("Color grading", 90),
        ("Final render & export", 100),
    ]

    for stage, progress in stages:
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            video.pipeline_stage = stage
            video.progress = progress
            video.status = "processing"
            db.commit()
        time.sleep(2)

    video = db.query(Video).filter(Video.id == video_id).first()
    if video:
        video.status = "completed"
        video.pipeline_stage = "Completed"
        video.progress = 100
        video.completed_at = datetime.utcnow()
        video.file_url = f"/media/videos/video_{video_id}.mp4"
        video.thumbnail_url = f"/media/thumbnails/thumb_{video_id}.jpg"
        db.commit()
    db.close()

@router.post("/generate", response_model=VideoResponse)
def generate_video(
    request: VideoGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == request.project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    video = Video(
        project_id=request.project_id,
        title=request.title,
        resolution=request.resolution,
        duration=float(request.duration),
        status="queued",
        pipeline_stage="Initializing",
        progress=0,
        generation_params={
            "style": request.style,
            "script_id": request.script_id,
            "storyboard_id": request.storyboard_id,
        }
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    thread = threading.Thread(target=simulate_video_pipeline, args=(video.id,))
    thread.daemon = True
    thread.start()

    return video

@router.get("/project/{project_id}", response_model=List[VideoResponse])
def get_project_videos(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(Video).filter(Video.project_id == project_id).all()

@router.get("/{video_id}", response_model=VideoResponse)
def get_video(video_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video

@router.post("/{video_id}/generate-shorts", response_model=List[ShortResponse])
def generate_shorts(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    platforms = ["youtube", "tiktok", "instagram", "facebook"]
    shorts = []
    start_times = [0, 60, 120, 200]
    durations = [58, 55, 30, 60]

    for i, platform in enumerate(platforms):
        short = Short(
            project_id=video.project_id,
            video_id=video_id,
            title=f"{video.title} - {platform.title()} Short",
            platform=platform,
            status="completed",
            start_time=float(start_times[i]),
            end_time=float(start_times[i] + durations[i]),
            duration=float(durations[i]),
            file_url=f"/media/shorts/short_{video_id}_{platform}.mp4",
            thumbnail_url=f"/media/thumbnails/short_thumb_{video_id}_{platform}.jpg"
        )
        db.add(short)
        shorts.append(short)

    db.commit()
    for s in shorts:
        db.refresh(s)
    return shorts

@router.get("/project/{project_id}/shorts", response_model=List[ShortResponse])
def get_project_shorts(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Short).filter(Short.project_id == project_id).all()
