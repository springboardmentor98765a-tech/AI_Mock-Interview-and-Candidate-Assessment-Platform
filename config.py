import os
from typing import List, Dict

class Settings:
    APP_NAME: str = "AI Interview Platform API"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ai_interview_platform_super_secret_key_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # AI & STT Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    STT_PROVIDER: str = os.getenv("STT_PROVIDER", "gemini")  # gemini, whisper, local
    STT_API_KEY: str = os.getenv("STT_API_KEY", "")
    GRAMMAR_API_KEY: str = os.getenv("GRAMMAR_API_KEY", "")
    PRONUNCIATION_API_KEY: str = os.getenv("PRONUNCIATION_API_KEY", "")
    
    # Audio validation
    MAX_AUDIO_SIZE_MB: int = int(os.getenv("MAX_AUDIO_SIZE_MB", "25"))
    MIN_AUDIO_DURATION_SECONDS: float = float(os.getenv("MIN_AUDIO_DURATION_SECONDS", "3.0"))
    MAX_AUDIO_DURATION_SECONDS: float = float(os.getenv("MAX_AUDIO_DURATION_SECONDS", "600.0"))
    ENABLE_PERMANENT_AUDIO_STORAGE: bool = os.getenv("ENABLE_PERMANENT_AUDIO_STORAGE", "false").lower() == "true"
    
    # Configurable Filler Words
    FILLER_WORDS: List[str] = [
        "um", "uh", "hmm", "like", "you know", 
        "actually", "basically", "so", "well", "i mean", "right", "sort of", "kind of"
    ]
    
    # Speech Pace (WPM) Thresholds
    PACE_THRESHOLDS: Dict[str, Dict[str, float]] = {
        "very_slow": {"min": 0, "max": 99},
        "slow": {"min": 100, "max": 119},
        "normal": {"min": 120, "max": 160},
        "fast": {"min": 161, "max": 180},
        "very_fast": {"min": 181, "max": 999}
    }
    
    # Communication Score Component Weights (Sum = 1.0)
    COMMUNICATION_WEIGHTS: Dict[str, float] = {
        "grammar": 0.20,
        "fluency": 0.20,
        "pronunciation": 0.15,
        "pace": 0.15,
        "clarity": 0.15,
        "vocabulary": 0.10,
        "confidence": 0.05
    }

settings = Settings()
