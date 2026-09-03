import os
from dotenv import load_dotenv

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Ensure .env is found regardless of cwd (e.g. running from backend/ or project root)
load_dotenv(os.path.join(BACKEND_DIR, ".env"))
# Fallback: also try project root
if not os.getenv("GROQ_API_KEY"):
    load_dotenv(os.path.join(BACKEND_DIR, "..", ".env"))

PORT = int(os.getenv("PORT", "8000"))
JWT_SECRET = os.getenv("JWT_SECRET", "smarthire-default-secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRES_IN_MINUTES = int(os.getenv("JWT_EXPIRES_IN_MINUTES", "5"))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
DB_PATH = os.path.join(BACKEND_DIR, os.getenv("DB_PATH", "data/smarthire.db"))
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "")
APP_BASE_URL = os.getenv("APP_BASE_URL", f"http://localhost:{PORT}").rstrip("/")
PASSWORD_RESET_TOKEN_EXPIRES_MINUTES = int(os.getenv("PASSWORD_RESET_TOKEN_EXPIRES_MINUTES", "5"))
MIMO_API_KEY = os.getenv("MIMO_API_KEY", "")
MIMO_BASE_URL = os.getenv("MIMO_BASE_URL", "https://token-plan-sgp.xiaomimimo.com/v1").rstrip("/")
MIMO_CHAT_MODEL = os.getenv("MIMO_CHAT_MODEL", "mimo-v2.5")
AICREDITS_API_KEY = os.getenv("AICREDITS_API_KEY", "")
AICREDITS_BASE_URL = os.getenv("AICREDITS_BASE_URL", "https://aicredits.in/v1").rstrip("/")
AICREDITS_MODEL = os.getenv("AICREDITS_MODEL", "deepseek/deepseek-v4-flash")
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_BASE_URL = os.getenv("SARVAM_BASE_URL", "https://api.sarvam.ai").rstrip("/")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_API_KEY_2 = os.getenv("GEMINI_API_KEY_2", "")
GEMINI_API_KEY_3 = os.getenv("GEMINI_API_KEY_3", "")
GEMINI_API_KEY_4 = os.getenv("GEMINI_API_KEY_4", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
GEMINI_MODEL_2 = os.getenv("GEMINI_MODEL_2", "gemini-3.5-flash")
GEMINI_MODEL_3 = os.getenv("GEMINI_MODEL_3", "gemini-3.5-flash-lite")
GEMINI_MODEL_4 = os.getenv("GEMINI_MODEL_4", "gemini-3.1-flash-lite")
GEMINI_RESUME_KEY = os.getenv("GEMINI_RESUME_KEY", "")
GEMINI_RESUME_KEY_2 = os.getenv("GEMINI_RESUME_KEY_2", "")
GEMINI_RESUME_MODEL = os.getenv("GEMINI_RESUME_MODEL", "gemini-3.5-flash-lite")
GEMINI_RESUME_MODEL_2 = os.getenv("GEMINI_RESUME_MODEL_2", "gemini-3.1-flash-lite")
GEMINI_QUESTION_KEY = os.getenv("GEMINI_QUESTION_KEY", "")
GEMINI_QUESTION_KEY_2 = os.getenv("GEMINI_QUESTION_KEY_2", "")
GEMINI_QUESTION_MODEL = os.getenv("GEMINI_QUESTION_MODEL", "gemini-3.6-flash")
GEMINI_QUESTION_MODEL_2 = os.getenv("GEMINI_QUESTION_MODEL_2", "gemini-3.5-flash")
GEMINI_QUIZ_KEY = os.getenv("GEMINI_QUIZ_KEY", "")
GEMINI_QUIZ_KEY_2 = os.getenv("GEMINI_QUIZ_KEY_2", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
GROQ_RESUME_MODEL = os.getenv("GROQ_RESUME_MODEL", "qwen/qwen3.6-27b")
# Secondary Groq key/model used as automatic failover for the resume analyzer
GROQ_API_KEY_2 = os.getenv("GROQ_API_KEY_2", "")
GROQ_RESUME_MODEL_2 = os.getenv("GROQ_RESUME_MODEL_2", "openai/gpt-oss-120b")




def _csv_env(name: str) -> set[str]:
    """Return normalized, non-empty email addresses from a comma-separated env value."""
    return {email.strip().lower() for email in os.getenv(name, "").split(",") if email.strip()}


# An account must be both stored as an admin and present in this allowlist.
# Keep this value in server/.env; never expose it to the frontend.
ADMIN_EMAILS = _csv_env("ADMIN_EMAILS")
