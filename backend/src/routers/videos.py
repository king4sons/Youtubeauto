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


@router.get("/providers/list")
def list_video_providers():
    from .providers import VIDEO_PROVIDERS
    return VIDEO_PROVIDERS


class MultiProviderGenerateRequest(BaseModel):
    project_id: int
    title: str
    provider_chain: List[str] = ["veo3", "kling", "runway"]
    scene_provider_map: Optional[dict] = None  # {scene_number: provider_id}
    style: str = "cinematic"
    resolution: str = "1920x1080"
    duration: int = 720
    narrative_preset: Optional[str] = None
    enable_motion_brush: bool = False
    enable_camera_path: bool = False
    enable_character_consistency: bool = True
    enable_lip_sync: bool = False


@router.post("/generate-multi-provider", response_model=VideoResponse)
def generate_video_multi_provider(
    request: MultiProviderGenerateRequest,
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
        pipeline_stage="Initializing multi-provider pipeline",
        progress=0,
        generation_params={
            "style": request.style,
            "provider_chain": request.provider_chain,
            "scene_provider_map": request.scene_provider_map or {},
            "narrative_preset": request.narrative_preset,
            "features": {
                "motion_brush": request.enable_motion_brush,
                "camera_path": request.enable_camera_path,
                "character_consistency": request.enable_character_consistency,
                "lip_sync": request.enable_lip_sync,
            }
        }
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    thread = threading.Thread(target=simulate_multi_provider_pipeline, args=(video.id, request.provider_chain))
    thread.daemon = True
    thread.start()

    return video


def simulate_multi_provider_pipeline(video_id: int, provider_chain: list):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine("sqlite:///./reckoning.db", connect_args={"check_same_thread": False})
    db = sessionmaker(bind=engine)()

    provider_labels = {
        "veo3": "Google Veo 3", "sora": "OpenAI Sora",
        "runway": "Runway Gen-4", "kling": "Kling AI", "luma": "Luma Dream Machine"
    }

    stages = []
    stages.append(("Analyzing script & storyboard", 5))

    total_providers = len(provider_chain)
    for i, provider_id in enumerate(provider_chain):
        provider_name = provider_labels.get(provider_id, provider_id)
        base_progress = 5 + int((i / total_providers) * 70)
        stages.append((f"[{provider_name}] Generating scenes", base_progress + 10))
        stages.append((f"[{provider_name}] Applying cinematic effects", base_progress + 20))

    stages.append(("Runway: Assembling and enhancing continuity", 80))
    stages.append(("Color grading & LUT application", 88))
    stages.append(("Audio mixing & sync", 94))
    stages.append(("Final render & export", 100))

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
        video.file_url = f"/media/videos/video_{video_id}_multi.mp4"
        video.thumbnail_url = f"/media/thumbnails/thumb_{video_id}.jpg"
        db.commit()
    db.close()
