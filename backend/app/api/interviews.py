import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.interview import (
    Difficulty,
    Interview,
    InterviewQuestion,
    InterviewType,
    SessionStatus,
)
from app.models.recording import InterviewRecording, RecordingAccess
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
from app.services import question_bank, speech_analysis
from app.services.interview_generator import build_questions
from app.services.session_timing import (
    elapsed_seconds,
    finalise_duration,
    overrun_seconds,
    per_question_seconds,
    question_seconds_spent,
    remaining_seconds,
    session_budget_seconds,
)

logger = logging.getLogger(__name__)

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
    if interview.status == SessionStatus.PAUSED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This interview is paused. Resume it rather than starting it again.",
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

    # A restarted session starts its pause accounting from scratch, so time
    # paused during an earlier abandoned attempt is not carried forward.
    interview.paused_at = None
    interview.total_paused_seconds = 0

    # Snapshot the clock now, from the administrator's session budget divided
    # across this interview's questions. Taken once, here, rather than read
    # live by the client — otherwise an administrator saving a new value
    # mid-interview would change the time remaining for a candidate already
    # part-way through answering.
    interview.question_seconds = per_question_seconds(
        get_settings(db).session_minutes,
        len(interview.questions),
        difficulty=interview.difficulty.value,
        interview_type=interview.interview_type.value,
    )

    db.commit()
    db.refresh(interview)
    return interview


@router.post("/{interview_id}/pause", response_model=InterviewDetail)
def pause_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Put a running interview on hold.

    Only IN_PROGRESS can be paused. Pausing something already paused is a 409
    rather than a silent success, because a second pause would otherwise reset
    `paused_at` and quietly erase the time already accumulated.
    """
    interview = _owned(db, current_user, interview_id, with_questions=True)

    if interview.status == SessionStatus.PAUSED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This interview is already paused.",
        )
    if interview.status != SessionStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Only an interview in progress can be paused (this one is {interview.status.value}).",
        )

    interview.status = SessionStatus.PAUSED
    interview.paused_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(interview)
    return interview


@router.post("/{interview_id}/resume", response_model=InterviewDetail)
def resume_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Pick a paused interview back up.

    The length of this pause is added to `total_paused_seconds` here, which is
    what keeps the elapsed clock honest: paused time is real time, but it is
    not interview time, and the candidate should not be charged for it.
    """
    interview = _owned(db, current_user, interview_id, with_questions=True)

    if interview.status != SessionStatus.PAUSED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This interview is not paused (it is {interview.status.value}).",
        )

    if interview.paused_at is not None:
        # A row could be PAUSED with no paused_at only if it were edited by
        # hand. Guarding rather than crashing keeps a bad row recoverable.
        paused_for = (datetime.now(timezone.utc) - interview.paused_at).total_seconds()
        interview.total_paused_seconds = int(
            (interview.total_paused_seconds or 0) + max(paused_for, 0)
        )

    interview.status = SessionStatus.IN_PROGRESS
    interview.paused_at = None
    db.commit()
    db.refresh(interview)
    return interview


@router.post("/{interview_id}/end", response_model=InterviewDetail)
def end_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Finish a session deliberately, whether or not every question was answered.

    Unanswered questions are left exactly as they are — not marked skipped, not
    back-filled with anything. "The candidate ran out of time on question 6" and
    "the candidate passed on question 6" are different facts, and ending an
    interview must not convert one into the other.

    Ending is idempotent from COMPLETED so a client that retries, or a user who
    clicks twice, does not get an error for asking for the state it is already
    in. `completed_at` keeps its original value in that case.
    """
    interview = _owned(db, current_user, interview_id, with_questions=True)

    if interview.status == SessionStatus.COMPLETED:
        return interview

    if interview.status == SessionStatus.CREATED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This interview has not been started, so there is nothing to end.",
        )

    # Ending straight from PAUSED is allowed — someone who steps away and
    # decides not to come back should not have to resume first just to stop.
    if interview.status == SessionStatus.PAUSED and interview.paused_at is not None:
        paused_for = (datetime.now(timezone.utc) - interview.paused_at).total_seconds()
        interview.total_paused_seconds = int(
            (interview.total_paused_seconds or 0) + max(paused_for, 0)
        )

    interview.status = SessionStatus.COMPLETED
    interview.completed_at = datetime.now(timezone.utc)
    interview.paused_at = None
    # Stamped after completed_at is set, so the duration measures to the end
    # that just happened rather than to now.
    interview.duration_seconds = finalise_duration(interview)
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

    The recording is the primary record of the answer — the transcript beside
    it is a machine's reading of this file, so this endpoint is how anyone
    checks the transcript against what was actually said. Scoped through
    `_owned`, so one candidate cannot fetch another's recording.
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

    _log_access(db, current_user, interview.id, "answer_audio", sequence_no=sequence_no)

    return FileResponse(
        path,
        media_type=question.answer_audio_mime or "application/octet-stream",
        filename=f"interview-{interview.id}-q{sequence_no}{path.suffix}",
    )


@router.get("/{interview_id}/session")
def get_session_record(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    The whole session record in one payload, plus its live clock.

    Everything here is read from stored rows or derived from stored
    timestamps. Nothing is estimated: `duration_seconds` is null until the
    interview ends rather than being guessed from a partial session, and the
    remaining-time figures are null when no clock was ever set.

    `remaining_seconds` is computed here rather than trusted from the browser.
    The client counts down for responsiveness, but a countdown a candidate's
    own machine owns is not a measurement — this is the one the server stands
    behind.
    """
    interview = _owned(db, current_user, interview_id, with_questions=True)

    recording = (
        db.query(InterviewRecording)
        .filter(InterviewRecording.interview_id == interview.id)
        .order_by(InterviewRecording.id.desc())
        .first()
    )

    questions = sorted(interview.questions, key=lambda q: q.sequence_no)
    attempted = [q for q in questions if q.answer_audio_path or (q.answer_text or "").strip()]
    skipped = [q for q in questions if q.skipped_at is not None]

    return {
        # --- identity ---
        "candidate_id": interview.user_id,
        "interview_id": interview.id,
        "session_id": interview.session_id,
        # --- timing ---
        "started_at": interview.started_at,
        "ended_at": interview.completed_at,
        "duration_seconds": interview.duration_seconds,
        "elapsed_seconds": elapsed_seconds(interview),
        "paused_seconds": interview.total_paused_seconds or 0,
        "budget_seconds": session_budget_seconds(interview),
        "remaining_seconds": remaining_seconds(interview),
        "overrun_seconds": overrun_seconds(interview),
        "seconds_per_question": interview.question_seconds,
        # --- state ---
        "status": interview.status.value,
        "is_paused": interview.status == SessionStatus.PAUSED,
        # --- recordings ---
        "video_recording": (
            {
                "id": recording.id,
                "mime_type": recording.mime_type,
                "size_bytes": recording.size_bytes,
                "duration_seconds": recording.duration_seconds,
                "created_at": recording.created_at,
                "url": f"{settings.API_PREFIX}/interviews/{interview.id}/recording",
            }
            if recording
            else None
        ),
        "audio_recordings": [
            {
                "sequence_no": q.sequence_no,
                "mime_type": q.answer_audio_mime,
                "url": (
                    f"{settings.API_PREFIX}/interviews/{interview.id}"
                    f"/answers/{q.sequence_no}/audio"
                ),
            }
            for q in questions
            if q.answer_audio_path
        ],
        # --- progress ---
        "questions_total": len(questions),
        "questions_attempted": len(attempted),
        "questions_skipped": len(skipped),
        # Neither answered nor skipped: never reached, or the session ended
        # early. Counted separately so "not attempted" is never read as
        # "passed on it".
        "questions_unanswered": len(questions) - len(attempted) - len(skipped),
        "questions": [
            {
                "sequence_no": q.sequence_no,
                "category": q.category,
                "attempted": q in attempted,
                "skipped": q.skipped_at is not None,
                "asked_at": q.asked_at,
                "answered_at": q.answered_at,
                "time_on_question_seconds": q.time_on_question_seconds,
                "speaking_seconds": q.answer_duration_seconds,
            }
            for q in questions
        ],
    }


# --------------------------------------------------------------------------
# Session video recording
# --------------------------------------------------------------------------

# What a browser MediaRecorder actually produces for video, and the leading
# bytes each container starts with. Content-Type is client-supplied and
# trivially spoofed, so the magic bytes decide what the file really is.
#
# WebM and Matroska share the EBML header; MP4/QuickTime put an "ftyp" box at
# offset 4. Anything else is refused rather than stored.
EBML_MAGIC = b"\x1a\x45\xdf\xa3"
VIDEO_EXTENSIONS = {
    "video/webm": ".webm",
    "video/x-matroska": ".mkv",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
}


def _looks_like_video(head: bytes) -> bool:
    if head.startswith(EBML_MAGIC):
        return True
    # ....ftyp — the MP4/QuickTime brand box.
    return len(head) >= 12 and head[4:8] == b"ftyp"


def _log_access(db: Session, user: User, interview_id: int, artefact: str,
                sequence_no: Optional[int] = None) -> None:
    """
    Record that someone played a recording back.

    Called only after the bytes are known to exist and the caller is known to
    be allowed them, so a 404 or a rejected request never shows up as an
    access. A failure to write the log must not break playback — but it is
    logged loudly, because a silently-missing audit trail is worse than a
    noisy one.
    """
    try:
        db.add(
            RecordingAccess(
                user_id=user.id,
                interview_id=interview_id,
                artefact=artefact,
                sequence_no=sequence_no,
            )
        )
        db.commit()
    except Exception:  # noqa: BLE001
        logger.exception(
            "Could not write recording access log for interview %s (%s)",
            interview_id,
            artefact,
        )
        db.rollback()


@router.post("/{interview_id}/recording", status_code=status.HTTP_201_CREATED)
async def upload_recording(
    interview_id: int,
    file: UploadFile = File(...),
    duration_seconds: Optional[float] = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Store the webcam video for one interview session.

    Multipart rather than the WebSocket: a ten-minute recording is tens of
    megabytes, and base64 over the interview socket would inflate it by a
    third and block the interview while it transferred.

    One recording per interview. Uploading again replaces the previous one and
    deletes its file — a candidate who re-records should not silently
    accumulate copies of their own face on disk.
    """
    interview = _owned(db, current_user, interview_id)

    declared = (file.content_type or "").split(";")[0].strip().lower()
    extension = VIDEO_EXTENSIONS.get(declared)
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unsupported recording format. Expected one of: "
                f"{', '.join(sorted(VIDEO_EXTENSIONS))}."
            ),
        )

    directory = Path(settings.VIDEO_RECORDING_DIR) / str(interview.id)
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / f"{uuid.uuid4()}{extension}"

    limit = settings.MAX_VIDEO_RECORDING_MB * 1024 * 1024
    size = 0
    checked = False

    try:
        with destination.open("wb") as handle:
            while chunk := await file.read(1024 * 1024):
                if not checked:
                    checked = True
                    if not _looks_like_video(chunk[:12]):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="That file is not a video recording.",
                        )

                size += len(chunk)
                # Enforced while streaming, so an oversized upload is stopped
                # mid-flight rather than after it is all in memory.
                if size > limit:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Recording exceeds the "
                            f"{settings.MAX_VIDEO_RECORDING_MB} MB limit."
                        ),
                    )
                handle.write(chunk)
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    except Exception:
        destination.unlink(missing_ok=True)
        logger.exception("Could not store recording for interview %s", interview.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The recording could not be saved.",
        )

    if size == 0:
        destination.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The recording was empty.",
        )

    previous = (
        db.query(InterviewRecording)
        .filter(InterviewRecording.interview_id == interview.id)
        .all()
    )
    for row in previous:
        Path(row.stored_path).unlink(missing_ok=True)
        db.delete(row)

    recording = InterviewRecording(
        interview_id=interview.id,
        stored_path=str(destination),
        mime_type=declared,
        size_bytes=size,
        duration_seconds=duration_seconds,
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)

    return {
        "id": recording.id,
        "interview_id": interview.id,
        "size_bytes": recording.size_bytes,
        "mime_type": recording.mime_type,
        "duration_seconds": recording.duration_seconds,
        "created_at": recording.created_at,
    }


@router.get("/{interview_id}/recording")
def get_recording(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Play back the session recording.

    Scoped through `_owned`, so **only the candidate who recorded it** can
    fetch it — recruiters and admins receive a 404, the same as for a
    recording that does not exist.

    That is narrower than the module spec's "allow authorized users to access
    recordings", and it is deliberate: widening it means deciding who may
    replay a candidate's face and voice, which is a policy decision rather
    than a coding one. Every access that does happen is logged.
    """
    interview = _owned(db, current_user, interview_id)

    recording = (
        db.query(InterviewRecording)
        .filter(InterviewRecording.interview_id == interview.id)
        .order_by(InterviewRecording.id.desc())
        .first()
    )
    if recording is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No recording for this interview.",
        )

    path = Path(recording.stored_path)
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The recording is no longer on disk.",
        )

    _log_access(db, current_user, interview.id, "video")

    return FileResponse(
        path,
        media_type=recording.mime_type,
        filename=f"interview-{interview.id}-session{path.suffix}",
    )


@router.get("/{interview_id}/analysis")
def get_interview_analysis(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Module 5: the communication analysis for a whole interview.

    Per-question detail plus a session roll-up. Questions that were skipped, or
    answered before analysis existed, appear with available=false and a reason
    rather than being quietly dropped — the count of what was analysed is part
    of how trustworthy the summary is.

    Filler counts and pace are measurements; grammar and communication notes
    are an AI assessment with no number attached. `summary.score` (Module 6)
    IS a number — the rubric-weighted average of the answered questions'
    scores — but it is graded against a fixed, disclosed rubric, not a
    certified evaluation, and every place it is shown says so. The same figure
    is stamped onto Interview.overall_score once the interview completes; this
    endpoint recomputes it live so a still-running interview shows its score
    so far rather than nothing.
    """
    interview = _owned(db, current_user, interview_id, with_questions=True)

    questions = []
    for question in interview.questions:
        analysis = question.analysis
        if analysis is None:
            if question.skipped_at is not None:
                reason = "This question was skipped, so there is nothing to analyse."
            elif question.answered_at is None:
                reason = "This question has not been answered yet."
            else:
                reason = "This answer was recorded but never analysed."
            analysis = {"available": False, "reason": reason}

        questions.append(
            {
                "sequence_no": question.sequence_no,
                "category": question.category,
                "question_text": question.question_text,
                "transcript": question.answer_text,
                "duration_seconds": question.answer_duration_seconds,
                "analyzed_at": question.analyzed_at,
                "analysis": analysis,
            }
        )

    return {
        "interview_id": interview.id,
        "status": interview.status.value,
        "question_seconds": interview.question_seconds,
        "questions": questions,
        "summary": speech_analysis.summarise(
            [q.analysis for q in interview.questions]
        ),
    }


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
    # deleted interview leaves its audio and video on disk forever.
    for question in interview.questions:
        if question.answer_audio_path:
            Path(question.answer_audio_path).unlink(missing_ok=True)

    for recording in (
        db.query(InterviewRecording)
        .filter(InterviewRecording.interview_id == interview.id)
        .all()
    ):
        Path(recording.stored_path).unlink(missing_ok=True)

    # The access log is deliberately NOT deleted. It is a record of who viewed
    # a candidate's recording, and deleting the interview must not erase the
    # evidence of who had already seen it.

    db.delete(interview)
    db.commit()
    return None
