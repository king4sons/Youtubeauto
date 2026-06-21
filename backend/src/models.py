from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    avatar_url = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    projects = relationship("Project", back_populates="owner")
    social_connections = relationship("SocialConnection", back_populates="user")

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, default="draft")  # draft, scripting, storyboard, generating, editing, publishing, published
    genre = Column(String)
    duration_target = Column(Integer, default=600)  # seconds
    thumbnail_url = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    owner = relationship("User", back_populates="projects")
    scripts = relationship("Script", back_populates="project")
    storyboards = relationship("Storyboard", back_populates="project")
    videos = relationship("Video", back_populates="project")
    shorts = relationship("Short", back_populates="project")
    published_items = relationship("PublishedItem", back_populates="project")

class Script(Base):
    __tablename__ = "scripts"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String)
    content = Column(Text)
    scenes = Column(JSON)  # list of scene dicts
    genre = Column(String)
    tone = Column(String)
    duration_estimate = Column(Integer)
    word_count = Column(Integer)
    status = Column(String, default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="scripts")

class Storyboard(Base):
    __tablename__ = "storyboards"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    script_id = Column(Integer, ForeignKey("scripts.id"))
    frames = Column(JSON)  # list of frame dicts with descriptions, timing, camera angles
    status = Column(String, default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="storyboards")

class Video(Base):
    __tablename__ = "videos"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String)
    file_url = Column(String)
    thumbnail_url = Column(String)
    duration = Column(Float)
    resolution = Column(String, default="1920x1080")
    status = Column(String, default="queued")  # queued, processing, completed, failed
    pipeline_stage = Column(String)
    generation_params = Column(JSON)
    progress = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    project = relationship("Project", back_populates="videos")

class Short(Base):
    __tablename__ = "shorts"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    video_id = Column(Integer, ForeignKey("videos.id"))
    title = Column(String)
    file_url = Column(String)
    thumbnail_url = Column(String)
    duration = Column(Float)
    platform = Column(String)  # youtube, tiktok, instagram, facebook
    status = Column(String, default="queued")
    start_time = Column(Float)
    end_time = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="shorts")

class Voiceover(Base):
    __tablename__ = "voiceovers"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    script_id = Column(Integer, ForeignKey("scripts.id"))
    voice_id = Column(String)
    voice_name = Column(String)
    file_url = Column(String)
    duration = Column(Float)
    status = Column(String, default="queued")
    created_at = Column(DateTime, default=datetime.utcnow)

class Thumbnail(Base):
    __tablename__ = "thumbnails"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    image_url = Column(String)
    style = Column(String)
    is_selected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class PublishedItem(Base):
    __tablename__ = "published_items"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    platform = Column(String)  # youtube, tiktok, instagram, facebook
    content_type = Column(String)  # video, short
    title = Column(String)
    description = Column(Text)
    tags = Column(JSON)
    scheduled_at = Column(DateTime)
    published_at = Column(DateTime)
    platform_id = Column(String)  # ID on the platform
    platform_url = Column(String)
    status = Column(String, default="scheduled")  # scheduled, publishing, published, failed
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="published_items")

class SocialConnection(Base):
    __tablename__ = "social_connections"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    platform = Column(String)
    platform_user_id = Column(String)
    platform_username = Column(String)
    access_token = Column(String)
    refresh_token = Column(String)
    token_expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="social_connections")
