"""
Reads the same `platform_settings` key/value table the Node service
manages (see backend/utils/settingsStore.js) — this service never
writes to it, only reads, so there's a single source of truth for
platform-wide toggles regardless of which backend a given feature
lives in.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session


def get_platform_setting(db: Session, key: str, default: str = "") -> str:
    try:
        row = db.execute(
            text("SELECT value FROM platform_settings WHERE key = :key"),
            {"key": key},
        ).first()
        return row[0] if row else default
    except Exception:
        # Table may not exist yet on a fresh install that hasn't hit the
        # Node admin settings endpoint once — treat as "use the default".
        return default


def ai_scoring_disabled(db: Session) -> bool:
    return get_platform_setting(db, "disable_ai_scoring", "false") == "true"
