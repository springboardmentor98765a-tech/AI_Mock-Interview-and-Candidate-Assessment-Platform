import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.resume import Resume, ResumeStatus
from app.models.user import Role, User
from app.schemas.resume import ResumeOut
from app.services.ai_provider import (
    AINotConfigured,
    AIQuotaExceeded,
    AIUnavailable,
    AIUnreachable,
    extract_resume,
)
from app.services.pdf_text import UnreadablePDF, extract_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/resumes", tags=["resumes"])

PDF_MAGIC = b"%PDF-"
CHUNK = 64 * 1024


def _max_bytes() -> int:
    return settings.MAX_RESUME_MB * 1024 * 1024


def _latest_parsed(db: Session, user_id: int) -> Resume | None:
    """
    A user's current résumé: the newest one that actually parsed.

    FAILED rows are kept as an audit trail but are never anyone's profile.
    """
    return (
        db.query(Resume)
        .filter(Resume.user_id == user_id, Resume.status == ResumeStatus.PARSED)
        .order_by(Resume.id.desc())
        .first()
    )


async def _store_upload(upload: UploadFile, user_id: int) -> tuple[Path, int]:
    """
    Stream the upload to disk, validating as we go.

    Two things matter here, and both are the reason this is not just trusted
    from the browser:

    * The filename is never used as a path. It comes from the client and could
      be "../../etc/passwd". We write to a uuid4 name we chose and keep the
      original only as a display label in the database.
    * The size cap is enforced while streaming, so an oversized upload is
      rejected mid-flight rather than after it has been fully read into memory.
    """
    directory = Path(settings.RESUME_UPLOAD_DIR) / str(user_id)
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / f"{uuid.uuid4()}.pdf"

    limit = _max_bytes()
    size = 0
    first = b""

    try:
        with destination.open("wb") as handle:
            while chunk := await upload.read(CHUNK):
                if not first:
                    first = chunk[: len(PDF_MAGIC)]
                    # Content-Type is client-supplied and trivially spoofed;
                    # the magic bytes are what the file actually is.
                    if not first.startswith(PDF_MAGIC):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="That file is not a PDF.",
                        )

                size += len(chunk)
                if size > limit:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"File exceeds the {settings.MAX_RESUME_MB} MB limit.",
                    )

                handle.write(chunk)
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    except Exception:
        destination.unlink(missing_ok=True)
        raise

    if size == 0:
        destination.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty."
        )

    return destination, size


@router.post(
    "",
    response_model=ResumeOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(Role.CANDIDATE))],
)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a résumé PDF, extract its text, and parse it into structured data.

    Runs synchronously — expect several seconds. The `status` column exists so
    moving this to a background worker later is a contained change.

    400 not a PDF / too large / empty · 422 no readable text (scanned image)
    · 503 AI not configured.
    """
    destination, size = await _store_upload(file, current_user.id)

    resume = Resume(
        user_id=current_user.id,
        filename=(file.filename or "resume.pdf")[:255],
        stored_path=str(destination),
        size_bytes=size,
        status=ResumeStatus.PENDING,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    # --- text extraction ---
    try:
        raw_text = extract_text(destination)
    except UnreadablePDF as exc:
        resume.status = ResumeStatus.FAILED
        resume.error = str(exc)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        )

    resume.raw_text = raw_text
    db.commit()

    # --- AI extraction ---
    try:
        extracted = extract_resume(raw_text)
    except AIUnavailable as exc:
        resume.status = ResumeStatus.FAILED
        resume.error = str(exc)
        db.commit()
        logger.warning("Résumé %s could not be parsed: %s", resume.id, exc)

        # Three different problems needing three different actions. Collapsing
        # them into one message sent people to check an API key that was fine.
        if isinstance(exc, AINotConfigured):
            detail = (
                "Résumé parsing is not configured on this server. "
                "An administrator needs to set the AI API key."
            )
        elif isinstance(exc, AIUnreachable):
            detail = (
                "The local AI model is unavailable — the server could not be "
                "reached. Check that Ollama is running, then try again."
            )
        elif isinstance(exc, AIQuotaExceeded):
            detail = (
                "Résumé parsing is temporarily unavailable — the AI service "
                "daily quota has been reached. Please try again shortly."
            )
        else:
            detail = "Résumé parsing is temporarily unavailable. Please try again shortly."

        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)

    resume.summary = extracted.summary
    resume.skills = extracted.skills
    resume.technologies = extracted.technologies
    resume.total_experience_years = extracted.total_experience_years
    resume.experience = [e.model_dump() for e in extracted.experience]
    resume.education = [e.model_dump() for e in extracted.education]
    resume.status = ResumeStatus.PARSED
    resume.error = None
    resume.parsed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(resume)

    return ResumeOut.from_model(resume)


@router.get(
    "/me",
    response_model=ResumeOut,
    dependencies=[Depends(require_roles(Role.CANDIDATE))],
)
def my_resume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    The signed-in candidate's current résumé.

    Deliberately the latest *successfully parsed* one, not the latest upload: a
    subsequent bad upload (a scanned PDF, say) must not wipe out the profile
    they already have. The failure is reported by the POST that caused it.
    """
    resume = _latest_parsed(db, current_user.id)
    if resume is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No résumé uploaded yet."
        )
    return ResumeOut.from_model(resume)


@router.get(
    "/candidate/{user_id}",
    response_model=ResumeOut,
    dependencies=[Depends(require_roles(Role.RECRUITER, Role.ADMIN))],
)
def candidate_resume(user_id: int, db: Session = Depends(get_db)):
    """
    A candidate's parsed profile. Recruiters and administrators only — a
    candidate hitting this gets 403 from require_roles.
    """
    resume = _latest_parsed(db, user_id)
    if resume is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="That candidate has no résumé on file.",
        )
    return ResumeOut.from_model(resume)
