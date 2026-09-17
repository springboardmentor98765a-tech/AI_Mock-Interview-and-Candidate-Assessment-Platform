"""
Module 10 — Admin Dashboard: "Platform usage analytics" and "System
activity/health reports".

Node's GET /api/admin/analytics already covers users/interviews-wide
usage, and GET /api/admin/activity already serves the append-only
activity log (Module 1) — both stay as-is. This adds the pieces scoped
to what THIS service owns: usage of the Python-only features (coding
practice, interview templates, TTS, recordings, notifications), plus a
basic liveness/health snapshot for this process.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import config
from app.database import get_db
from app.models import (
    CodingSubmission,
    GeneratedCodingQuestion,
    Interview,
    InterviewTemplate,
    Notification,
)
from app.schemas import PlatformUsageOut, SystemHealthOut
from app.security import CurrentUser, require_roles

router = APIRouter(prefix="/api/admin/system", tags=["admin-system"])


def _dir_stats(path) -> tuple[int, float]:
    """(file_count, total_megabytes) for a directory, tolerant of it
    not existing yet on a fresh install."""
    if not path.exists():
        return 0, 0.0
    files = [f for f in path.rglob("*") if f.is_file()]
    total_bytes = sum(f.stat().st_size for f in files)
    return len(files), round(total_bytes / (1024 * 1024), 2)


def _count_resumes(db: Session) -> int:
    """Resumes live in Node/Module 2's table, not modeled here — see
    the same raw-SQL read pattern in app/platform_settings.py."""
    try:
        row = db.execute(text("SELECT COUNT(*) FROM resumes")).first()
        return int(row[0]) if row else 0
    except Exception:
        return 0


@router.get("/usage", response_model=PlatformUsageOut)
def platform_usage(db: Session = Depends(get_db), _: CurrentUser = Depends(require_roles("admin"))):
    interviews_online = db.query(Interview).filter(Interview.mode == "online").count()
    interviews_offline = db.query(Interview).filter(Interview.mode == "offline").count()
    interviews_with_recording = db.query(Interview).filter(Interview.recording_path.isnot(None)).count()

    return PlatformUsageOut(
        interviews_online=interviews_online,
        interviews_offline=interviews_offline,
        interviews_with_recording=interviews_with_recording,
        coding_submissions=db.query(CodingSubmission).count(),
        generated_coding_questions=db.query(GeneratedCodingQuestion).count(),
        interview_templates=db.query(InterviewTemplate).count(),
        resumes_uploaded=_count_resumes(db),
        notifications_sent=db.query(Notification).count(),
        notifications_unread=db.query(Notification).filter(Notification.is_read.is_(False)).count(),
    )


@router.get("/health", response_model=SystemHealthOut)
def system_health(db: Session = Depends(get_db), _: CurrentUser = Depends(require_roles("admin"))):
    try:
        db.execute(text("SELECT 1"))
        database_status = "ok"
    except Exception:
        database_status = "error"

    recordings_count, recordings_mb = _dir_stats(config.RECORDINGS_DIR)
    tts_files, tts_mb = _dir_stats(config.TTS_CACHE_DIR)

    try:
        since = datetime.now(timezone.utc) - timedelta(hours=24)
        activity_last_24h = db.execute(
            text("SELECT COUNT(*) FROM activity_log WHERE created_at >= :since"), {"since": since}
        ).scalar() or 0
    except Exception:
        activity_last_24h = 0

    uptime_seconds = int((datetime.now(timezone.utc) - config.SERVICE_STARTED_AT).total_seconds())

    return SystemHealthOut(
        status="ok" if database_status == "ok" else "degraded",
        database=database_status,
        uptime_seconds=uptime_seconds,
        recordings_count=recordings_count,
        recordings_mb=recordings_mb,
        tts_cache_files=tts_files,
        tts_cache_mb=tts_mb,
        activity_last_24h=int(activity_last_24h),
    )
