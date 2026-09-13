"""
config.py
==========
Centralised application configuration.
Loads all sensitive/environment-specific values from the .env file
so nothing is ever hardcoded in the source code.
"""

import os
from dotenv import load_dotenv

# Load variables from the .env file into the process environment
load_dotenv()


class Settings:
    # Module 9 email delivery. Gmail API uses HTTPS, so it works on hosts
    # whose free tier blocks outbound SMTP ports. SMTP remains as a local or
    # paid-host fallback.
    GMAIL_CLIENT_ID = os.getenv("GMAIL_CLIENT_ID", "")
    GMAIL_CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET", "")
    GMAIL_REFRESH_TOKEN = os.getenv("GMAIL_REFRESH_TOKEN", "")
    GMAIL_FROM = os.getenv("GMAIL_FROM", "")
    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_FROM = os.getenv("SMTP_FROM", "")
    SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_SSL = os.getenv("SMTP_SSL", "false").lower() == "true"
    NOTIFICATION_WORKER_ENABLED = os.getenv("NOTIFICATION_WORKER_ENABLED", "true").lower() == "true"
    # ---------------- Database ----------------
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/AI_Interview_Pro",
    )

    # ---------------- JWT ----------------
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )

    # ---------------- Google OAuth ----------------
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv(
        "GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback"
    )

    # ---------------- Session (needed by Authlib for OAuth "state") ----------------
    SESSION_SECRET_KEY: str = os.getenv("SESSION_SECRET_KEY", "")

    # ---------------- Gemini (AI interview question generation) ----------------
    # Get a free-tier key at https://aistudio.google.com/app/apikey
    # If left blank, the app falls back to a built-in local question bank
    # so interview generation still works without an API key.
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    _REQUESTED_GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    # Existing users commonly copy an older .env into each release. Upgrade
    # the retired 1.5 alias automatically instead of wasting the timeout on a
    # model that can no longer answer.
    GEMINI_MODEL: str = (
        "gemini-2.5-flash"
        if _REQUESTED_GEMINI_MODEL in {"gemini-1.5-flash", "gemini-1.5-flash-latest"}
        else _REQUESTED_GEMINI_MODEL
    )
    # Keep external AI calls bounded. Live interview navigation must never
    # hang indefinitely because the model API is slow or unavailable.
    AI_REQUEST_TIMEOUT_SECONDS: float = float(os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "4"))
    # Per-question scoring uses the deterministic evidence-based analyzer by
    # default so the next question appears immediately. Gemini still creates
    # questions and enriches the completed report in the background.
    REALTIME_AI_SCORING_ENABLED: bool = os.getenv(
        "REALTIME_AI_SCORING_ENABLED", "false"
    ).lower() == "true"
    BACKGROUND_AI_FEEDBACK_ENABLED: bool = os.getenv(
        "BACKGROUND_AI_FEEDBACK_ENABLED", "true"
    ).lower() == "true"

    # ---------------- Frontend ----------------
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://127.0.0.1:5500")

    # ---------------- Media storage (Module 4 - session recordings) ----------------
    # Where uploaded webcam/microphone session recordings are saved on disk.
    # Streamed through an authenticated endpoint; never mounted publicly.
    MEDIA_ROOT: str = os.getenv(
        "MEDIA_ROOT", os.path.join(os.path.dirname(os.path.dirname(__file__)), "media")
    )
    MAX_RECORDING_SIZE_BYTES: int = int(
        os.getenv("MAX_RECORDING_SIZE_BYTES", str(200 * 1024 * 1024))  # 200 MB
    )

    # ---------------- CORS ----------------
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://127.0.0.1:5500,http://localhost:5500"
        ).split(",")
        if origin.strip()
    ]


settings = Settings()

# Fail fast in production if critical secrets are missing.
if not settings.JWT_SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is not set. Please define it in your .env file."
    )
if not settings.SESSION_SECRET_KEY:
    raise RuntimeError(
        "SESSION_SECRET_KEY is not set. Please define it in your .env file."
    )
