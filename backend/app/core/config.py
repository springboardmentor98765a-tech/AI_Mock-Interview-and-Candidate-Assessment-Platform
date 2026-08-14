from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "SmartHire AI API"
    API_PREFIX: str = "/api"

    # PostgreSQL. Falls back to a local SQLite file so the app still boots
    # before Postgres is configured.
    DATABASE_URL: str = "sqlite:///./smarthire.db"

    JWT_SECRET_KEY: str = "insecure-dev-key-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"

    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/auth/github/callback"

    # Which provider handles question generation and résumé extraction.
    #   ollama  local, no key, no quota
    #   gemini  cloud, needs a key, free-tier daily quota
    # There is no speech provider: the interviewer stores the candidate's
    # recording as-is and does not transcribe or synthesise anything.
    AI_PROVIDER: str = "gemini"

    # --- local Ollama ---
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:7b"
    # A 7B model on CPU can take well over a minute for a long résumé.
    OLLAMA_TIMEOUT_SECONDS: int = 300
    # How long Ollama keeps the model resident in RAM after a request. Ollama's
    # own default is 5 minutes, after which the next request pays a ~40s reload.
    # A longer window keeps a demo responsive at the cost of holding the RAM.
    OLLAMA_KEEP_ALIVE: str = "30m"

    # --- Google Gemini ---
    GEMINI_API_KEY: str = ""

    # Used for question generation AND résumé extraction. A "lite" model is
    # chosen for its larger free-tier daily request allowance — the heavier
    # Flash models exhaust in the low tens of requests per day, which a single
    # demo can burn through.
    #
    # NOTE: free-tier quotas and model availability shift without warning, and
    # models get retired for new projects. Verify the real per-project limit for
    # whatever model is set here in Google AI Studio → Rate limits, rather than
    # trusting any number written in this repo.
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"

    # Module 5. Transcription and the pronunciation notes both read the
    # recording itself, which needs native audio understanding — deliberately
    # NOT a "lite" model, as the lite tiers do not reliably accept audio.
    #
    # This is a per-answer call, so an 8-question interview is 8 requests
    # against the Gemini free tier even when AI_PROVIDER=ollama is handling
    # every text operation. Ollama has no speech models, so there is no local
    # alternative; set ANALYSE_ANSWERS=false to run interviews without it.
    GEMINI_STT_MODEL: str = "gemini-3.6-flash"

    # Master switch for Module 5. Off means answers are recorded and stored
    # exactly as before, with no transcription and no analysis — useful when
    # the Gemini quota is spent and an interview still has to run.
    ANALYSE_ANSWERS: bool = True

    # Résumé upload (Module 2). Files are stored on disk under this directory;
    # the size cap is enforced server-side, not just in the browser.
    RESUME_UPLOAD_DIR: str = "uploads/resumes"
    MAX_RESUME_MB: int = 5

    # Recorded interview answers (Module 3, feature 9). Same arrangement as
    # résumés: bytes on disk, a row in the database pointing at them.
    ANSWER_AUDIO_DIR: str = "uploads/answers"
    MAX_ANSWER_AUDIO_MB: int = 8

    # Session webcam video. Same arrangement again — bytes on disk, a row
    # pointing at them — but the cap is much larger because video is:
    # a ten-minute WebM session runs to tens of megabytes where the audio for
    # the same interview is a couple.
    #
    # This is a person's face, kept on disk. Only the candidate who recorded it
    # can fetch it back (see the recording endpoints), and every playback is
    # written to recording_accesses.
    VIDEO_RECORDING_DIR: str = "uploads/recordings"
    MAX_VIDEO_RECORDING_MB: int = 200

    FRONTEND_URL: str = "http://localhost:5455"
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5453",
        "http://localhost:5455"
    ]

    @property
    def google_enabled(self) -> bool:
        return bool(self.GOOGLE_CLIENT_ID and self.GOOGLE_CLIENT_SECRET)

    @property
    def github_enabled(self) -> bool:
        return bool(self.GITHUB_CLIENT_ID and self.GITHUB_CLIENT_SECRET)

    @property
    def ai_enabled(self) -> bool:
        return bool(self.GEMINI_API_KEY)


settings = Settings()
