from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from src.database import engine, Base
from src.models import User, Project, Script, Storyboard, Video, Short, Voiceover, Thumbnail, PublishedItem, SocialConnection
from src.auth.router import router as auth_router
from src.routers.projects import router as projects_router
from src.routers.scripts import router as scripts_router
from src.routers.storyboard import router as storyboard_router
from src.routers.videos import router as videos_router
from src.routers.voiceover import router as voiceover_router
from src.routers.thumbnails import router as thumbnails_router
from src.routers.publishing import router as publishing_router
from src.routers.analytics import router as analytics_router

# Create all tables
Base.metadata.create_all(bind=engine)

# Create media directories
for d in ["media/videos", "media/thumbnails/generated", "media/voiceovers", "media/shorts"]:
    os.makedirs(d, exist_ok=True)

app = FastAPI(
    title="Reckoning Studio API",
    description="Complete cinematic video production platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount media files
if os.path.exists("media"):
    app.mount("/media", StaticFiles(directory="media"), name="media")

app.include_router(auth_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(scripts_router, prefix="/api/v1")
app.include_router(storyboard_router, prefix="/api/v1")
app.include_router(videos_router, prefix="/api/v1")
app.include_router(voiceover_router, prefix="/api/v1")
app.include_router(thumbnails_router, prefix="/api/v1")
app.include_router(publishing_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "Reckoning Studio API", "version": "1.0.0", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}
