"""
Central place for environment configuration.

Deliberately mirrors backend/.env.example (the Node service) for the
DB_* and JWT_SECRET values — this service reads the SAME Postgres
database and trusts the SAME auth tokens, so the two backends can run
side by side against one source of truth.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

PORT = int(os.getenv("PY_PORT", "8001"))

# FRONTEND_URL can be one origin or a comma-separated list (e.g. when the
# frontend dev server picks a different port than 5500, or you also test
# from 127.0.0.1). Trailing slashes are stripped since an origin with one
# never matches the browser's Origin header and CORS fails silently.
_raw_frontend_urls = os.getenv("FRONTEND_URL", "http://localhost:5500")
FRONTEND_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in _raw_frontend_urls.split(",")
    if origin.strip()
]
# Always allow the common local-dev variants too, so a slightly different
# port/host than what's in .env doesn't silently break every request.
for _fallback in ("http://localhost:5500", "http://127.0.0.1:5500"):
    if _fallback not in FRONTEND_ORIGINS:
        FRONTEND_ORIGINS.append(_fallback)
FRONTEND_URL = FRONTEND_ORIGINS[0]

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "ai_interview_platform")

DATABASE_URL = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

JWT_SECRET = os.getenv("JWT_SECRET", "replace_this_with_a_long_random_secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

TTS_CACHE_DIR = BASE_DIR / os.getenv("TTS_CACHE_DIR", "tts_cache")
TTS_LANG = os.getenv("TTS_LANG", "en")
TTS_TLD = os.getenv("TTS_TLD", "co.in")

TTS_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Module 5 (Recording): where proctored-session video+audio recordings
# are stored on disk. See app/recording_store.py for why this is a
# file on disk rather than a bytea column in Postgres.
RECORDINGS_DIR = BASE_DIR / os.getenv("RECORDINGS_DIR", "recordings")
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
MAX_RECORDING_SIZE_MB = int(os.getenv("MAX_RECORDING_SIZE_MB", "300"))

# ============================================================
# Multi-provider AI engine (app/ai_providers.py)
# ------------------------------------------------------------
# Providers are tried in AI_PROVIDER_ORDER, left to right. The first
# one that returns a usable response wins; on any failure (network
# error, rate limit / 429, malformed response) the next provider in
# the chain is tried automatically. This keeps question generation
# working even if one provider is down or rate-limited, and avoids
# repeating the same questions (the #1 complaint with a single key).
#
#   ollama  -> free, local, unlimited — best default primary
#   gemini  -> supports MULTIPLE comma-separated API keys; each
#              generation call rotates to the next key, and a key
#              that fails/rate-limits is skipped in favour of the
#              next one before falling through to the next provider
#   openai  -> single key
#   grok    -> single key (xAI, OpenAI-compatible API)
# ============================================================
AI_PROVIDER_ORDER = [
    p.strip().lower()
    for p in os.getenv("AI_PROVIDER_ORDER", "ollama,gemini,openai,grok").split(",")
    if p.strip()
]

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

# Comma-separated: GEMINI_API_KEYS=key1,key2,key3,key4,key5
GEMINI_API_KEYS = [k.strip() for k in os.getenv("GEMINI_API_KEYS", "").split(",") if k.strip()]
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

GROK_API_KEY = os.getenv("GROK_API_KEY", "").strip()
GROK_MODEL = os.getenv("GROK_MODEL", "grok-2-latest")

AI_REQUEST_TIMEOUT = float(os.getenv("AI_REQUEST_TIMEOUT", "20"))
