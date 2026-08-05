import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", "8000"))
JWT_SECRET = os.getenv("JWT_SECRET", "smarthire-default-secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRES_IN_MINUTES = int(os.getenv("JWT_EXPIRES_IN_MINUTES", "5"))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
DB_PATH = os.path.join(os.path.dirname(__file__), os.getenv("DB_PATH", "data/smarthire.db"))
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "")
APP_BASE_URL = os.getenv("APP_BASE_URL", f"http://localhost:{PORT}").rstrip("/")
PASSWORD_RESET_TOKEN_EXPIRES_MINUTES = int(os.getenv("PASSWORD_RESET_TOKEN_EXPIRES_MINUTES", "5"))
MIMO_API_KEY = os.getenv("MIMO_API_KEY", "")
MIMO_BASE_URL = os.getenv("MIMO_BASE_URL", "https://token-plan-sgp.xiaomimimo.com/v1").rstrip("/")
MIMO_CHAT_MODEL = os.getenv("MIMO_CHAT_MODEL", "mimo-v2.5")
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_BASE_URL = os.getenv("SARVAM_BASE_URL", "https://api.sarvam.ai").rstrip("/")


def _csv_env(name: str) -> set[str]:
    """Return normalized, non-empty email addresses from a comma-separated env value."""
    return {email.strip().lower() for email in os.getenv(name, "").split(",") if email.strip()}


# An account must be both stored as an admin and present in this allowlist.
# Keep this value in server/.env; never expose it to the frontend.
ADMIN_EMAILS = _csv_env("ADMIN_EMAILS")
