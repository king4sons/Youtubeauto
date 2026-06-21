from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    SECRET_KEY: str = "reckoning-studio-dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    # AI script generation
    ANTHROPIC_API_KEY: Optional[str] = None
    # AI voiceover
    ELEVENLABS_API_KEY: Optional[str] = None
    # Video generators
    VEO_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    RUNWAY_API_KEY: Optional[str] = None
    KLING_API_KEY: Optional[str] = None
    LUMA_API_KEY: Optional[str] = None
    # Social publishing
    YOUTUBE_CLIENT_ID: Optional[str] = None
    YOUTUBE_CLIENT_SECRET: Optional[str] = None
    TIKTOK_CLIENT_KEY: Optional[str] = None
    TIKTOK_CLIENT_SECRET: Optional[str] = None
    INSTAGRAM_APP_ID: Optional[str] = None
    INSTAGRAM_APP_SECRET: Optional[str] = None
    FACEBOOK_APP_ID: Optional[str] = None
    FACEBOOK_APP_SECRET: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
