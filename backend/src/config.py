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
    # Telegram bridge
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_ALLOWED_IDS: Optional[str] = None  # comma-separated Telegram user IDs
    TELEGRAM_API_URL: Optional[str] = "http://localhost:8000"
    TELEGRAM_BOT_EMAIL: Optional[str] = "telegrambot@reckoning.internal"
    TELEGRAM_BOT_PASSWORD: Optional[str] = "reckoning-telegram-bridge-2024"

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
