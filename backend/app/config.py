# ============================================================
#  config.py — Application Settings via pydantic-settings
# ============================================================
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/smarthire"

    # JWT
    JWT_SECRET: str = "change_me_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    # App
    ENVIRONMENT: Literal["development", "production"] = "development"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # GitHub OAuth
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    # AI Service Settings
    AI_PROVIDER: str = "gemini" # gemini, openai, ollama
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"


settings = Settings()

