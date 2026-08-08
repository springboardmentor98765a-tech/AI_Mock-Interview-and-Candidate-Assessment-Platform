from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.interview import (
    Difficulty,
    Interview,
    InterviewQuestion,
    InterviewType,
    SessionStatus,
)
from app.models.setting import get_settings
from app.models.user import User
from app.schemas.interview import (
    DomainsOut,
    GenerateRequest,
    InterviewDetail,
    InterviewOut,
    InterviewUpdate,
    StartRequest,
)
from app.services import question_bank
from app.services.interview_generator import build_questions

router = APIRouter(prefix="/interviews", tags=["interviews"])


def _owned(db: Session, user: User, interview_id: int, *, with_questions: bool = False) -> Interview:
    """
    Fetch one interview belonging to `user`, or 404.

    Someone else's interview returns 404 rather than 403 on purpose — a 403
    would confirm that the id exists, which is an enumeration hint.
    """
    query = db.query(Interview)
    if with_questions:
        query = query.options(selectinload(Interview.questions))

    interview = query.filter(
        Interview.id == interview_id, Interview.user_id == user.id
    ).first()

    if interview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found."
        )
    return interview


# --------------------------------------------------------------------------
# Static paths first. FastAPI matches in declaration order, so /history and
# /start must be declared before /{interview_id} or "history" gets parsed as
# an interview id and fails validation.
# --------------------------------------------------------------------------


@router.get("/domains", response_model=DomainsOut)
def list_domains():
    """
    Feature 6. These are suggestions for populating a dropdown — the `domain`
    field on every other endpoint accepts any string, so adding a new domain
    needs no code change here or anywhere else.
    """
    return DomainsOut(suggested=question_bank.SUGGESTED_DOMAINS)


@router.post("/generate", response_model=InterviewDetail, status_code=status.HTTP_201_CREATED)
def generate_interview(
    payload: GenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Features 1-6: generate questions for the requested type, domain and
    difficulty, save them, and return the interview with its questions.

    Falls back to the built-in question bank when the AI is unavailable, so this
    endpoint works end to end with no API key. Check `source` in the response to
    see which path produced the questions.
    """
    # The administrator's max_questions setting is a real cap, not a label.
    cap = get_settings(db).max_questions
    if payload.question_count > cap:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This platform allows at most {cap} questions per interview.",
        )

    pairs, source = build_questions(
        interview_type=payload.interview_type,
        domain=payload.domain,
        difficulty=payload.difficulty,
        count=payload.question_count,
    )

    interview = Interview(
        user_id=current_user.id,
        interview_type=payload.interview_type,
        domain=payload.domain,
        difficulty=payload.difficulty,
        question_count=len(pairs),
        source=source,
    )
    db.add(interview)
    db.flush()  # assigns interview.id without a second round trip

    for index, (category, question_text) in enumerate(pairs, start=1):
        db.add(
            InterviewQuestion(
                interview_id=interview.id,
                question_text=question_text,
                category=category,
                difficulty=payload.difficulty,
                sequence_no=index,
            )
        )

    db.commit()
    db.refresh(interview)
    return interview


@router.get("/history", response_model=List[InterviewOut])
def interview_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """
    Feature 7: past interviews — every session that was actually started, most
    recent first. Interviews still sitting at CREATED have not been attempted
    yet, so they are excluded; use GET /interviews to see those.
    """
    return (
        db.query(Interview)
        .filter(
            Interview.user_id == current_user.id,
            Interview.status != SessionStatus.CREATED,
        )
        .order_by(Interview.started_at.desc().nullslast(), Interview.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.post("/start", response_model=InterviewDetail)
def start_interview(
    payload: StartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Feature 7: begin a session. Moves CREATED (or a previously ABANDONED
    session) to IN_PROGRESS and stamps started_at.

    Returns the questions too, so the client has everything it needs to run the
    interview from this one call.
    """
    interview = _owned(db, current_user, payload.interview_id, with_questions=True)

    if interview.status == SessionStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This interview is already in progress.",
        )
    if interview.status == SessionStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This interview is already complete. Generate a new one to practise again.",
        )
    if not interview.questions:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This interview has no questions to ask.",
        )

    interview.status = SessionStatus.IN_PROGRESS
    interview.started_at = datetime.now(timezone.utc)
    interview.completed_at = None
    db.commit()
    db.refresh(interview)
    return interview


# --------------------------------------------------------------------------
# Collection and item routes
# --------------------------------------------------------------------------


@router.get("", response_model=List[InterviewOut])
def list_interviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    interview_type: Optional[InterviewType] = None,
    difficulty: Optional[Difficulty] = None,
    session_status: Optional[SessionStatus] = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """All of the signed-in user's interviews, newest first, with optional filters."""
    query = db.query(Interview).filter(Interview.user_id == current_user.id)

    if interview_type is not None:
        query = query.filter(Interview.interview_type == interview_type)
    if difficulty is not None:
        query = query.filter(Interview.difficulty == difficulty)
    if session_status is not None:
        query = query.filter(Interview.status == session_status)

    return query.order_by(Interview.id.desc()).offset(offset).limit(limit).all()


@router.get("/{interview_id}", response_model=InterviewDetail)
def get_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """One interview with all of its questions, in sequence order."""
    return _owned(db, current_user, interview_id, with_questions=True)


@router.get("/{interview_id}/answers/{sequence_no}/audio")
def get_answer_audio(
    interview_id: int,
    sequence_no: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Play back the recording of one spoken answer.

    Answers are stored as audio and never transcribed, so this is the only way
    to review what a candidate actually said. Scoped through `_owned`, so one
    candidate cannot fetch another's recording.
    """
    interview = _owned(db, current_user, interview_id)

    question = (
        db.query(InterviewQuestion)
        .filter(
            InterviewQuestion.interview_id == interview.id,
            InterviewQuestion.sequence_no == sequence_no,
        )
        .first()
    )
    if question is None or not question.answer_audio_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No recording for that question.",
        )

    path = Path(question.answer_audio_path)
    if not path.is_file():
        # The row survived but the file did not — a restored database against a
        # wiped uploads directory. Say so rather than returning a broken stream.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The recording is no longer on disk.",
        )

    return FileResponse(
        path,
        media_type=question.answer_audio_mime or "application/octet-stream",
        filename=f"interview-{interview.id}-q{sequence_no}{path.suffix}",
    )


@router.put("/{interview_id}", response_model=InterviewDetail)
def update_interview(
    interview_id: int,
    payload: InterviewUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update an interview's metadata — send only the fields that change.

    Note: this does not regenerate questions. Changing `difficulty` here
    relabels the interview but leaves the existing question text alone, which
    is why each question keeps its own `difficulty` recording what it was
    actually generated at. To get questions at a new level, call
    POST /interviews/generate again.
    """
    interview = _owned(db, current_user, interview_id, with_questions=True)

    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update.",
        )

    for field, value in fields.items():
        setattr(interview, field, value)

    # Keep the timestamps honest when status is driven manually.
    if fields.get("status") == SessionStatus.COMPLETED and interview.completed_at is None:
        interview.completed_at = datetime.now(timezone.utc)
    if fields.get("status") == SessionStatus.IN_PROGRESS and interview.started_at is None:
        interview.started_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(interview)
    return interview


@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an interview. Its questions go with it (FK cascade)."""
    interview = _owned(db, current_user, interview_id, with_questions=True)

    # The cascade only reaches the rows. Take the recordings with them, or a
    # deleted interview leaves its audio on disk forever.
    for question in interview.questions:
        if question.answer_audio_path:
            Path(question.answer_audio_path).unlink(missing_ok=True)

    db.delete(interview)
    db.commit()
    return None
