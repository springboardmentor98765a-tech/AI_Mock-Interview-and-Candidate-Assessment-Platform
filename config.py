import os

class Settings:
    APP_NAME: str = "AI Interview Platform API"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ai_interview_platform_super_secret_key_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = "gemini-2.5-flash"

settings = Settings()
