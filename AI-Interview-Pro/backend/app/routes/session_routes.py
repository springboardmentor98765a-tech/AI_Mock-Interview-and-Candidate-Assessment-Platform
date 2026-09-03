"""
routes/session_routes.py
==========================
Module 4 - Interview Session Management.

A "session" is a live/proctored attempt at an Interview: separate from
the Interview itself so pause/resume, webcam/mic state, and recordings
don't get tangled up with question-answering/scoring.

    POST   /sessions                      create (or fetch existing) session for an interview
    GET    /sessions                      list sessions (candidate: own only; recruiter/admin: all)
    GET    /sessions/{id}                 one session incl. its interview + recordings
    POST   /sessions/{id}/start           mark a session active (start_time set on creation already)
    POST   /sessions/{id}/pause           pause a running session
    POST   /sessions/{id}/resume          resume a paused session
    POST   /sessions/{id}/end             end a session early (also completes the interview
                                           and scores whatever was answered so far)
    POST   /sessions/{id}/devices         record camera/mic permission state
    POST   /sessions/{id}/violations      report a full-screen exit; auto-submits the
                                           interview once MAX_FULLSCREEN_VIOLATIONS is exceeded
    POST   /sessions/{id}/recordings      upload a webcam/mic recording (video or audio)
    GET    /sessions/{id}/recordings      list recordings for a session
    DELETE /sessions/{id}/recordings/{recording_id}   delete one recording
    POST   /sessions/{id}/emotion-samples Module 6 - accepts a periodic batch summary of
                                           client-side (face-api.js) emotion/eye-contact
                                           samples and folds it into the session's running
                                           aggregates (no image/video data involved)
    POST   /sessions/{id}/engagement-ticks  Module 6 - CNN + RNN Interview Behavior Analysis:
                                             accepts a small batch of raw per-tick CNN feature
                                             vectors, runs them through the backend RNN (app/ml/)
                                             over a rolling window, and returns live scores +
                                             proctoring flags (eye contact missing / no face /
                                             multiple faces)
"""

import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.models import (
    Interview,
    InterviewSession,
    InterviewRecording,
    InterviewAssessment,
    SessionStatusEnum,
    RecordingTypeEnum,
    InterviewStatusEnum,
    User,
)
from app.schemas import (
    SessionCreateRequest,
    SessionOut,
    SessionDetailOut,
    DeviceStatusUpdateRequest,
    InterviewRecordingOut,
    RecordingUploadOut,
    ViolationReportOut,
    MessageResponse,
    EmotionSampleBatchRequest,
    EngagementTickBatchRequest,
    EngagementTickResponseOut,
)
from app.auth import get_current_user
from app.storage import storage
from app.ml import engagement_engine
from app.scoring import build_interview_assessment

router = APIRouter(prefix="/sessions", tags=["Interview Sessions (Module 4)"])

# Full-screen proctoring: a candidate may exit full-screen this many times
# before the interview is force-submitted on the next exit.
MAX_FULLSCREEN_VIOLATIONS = 3

# MediaRecorder in Chrome/Edge/Firefox produces webm; Safari produces mp4.
ALLOWED_RECORDING_MIME_TYPES = {
    "video/webm": "webm",
    "audio/webm": "webm",
    "video/mp4": "mp4",
    "audio/mp4": "m4a",
    "audio/ogg": "ogg",
}

AUTHORIZED_RECORDING_ROLES = {"recruiter", "admin"}


def _is_authorized_viewer(session: InterviewSession, current_user: User) -> bool:
    """Owner candidate, or a recruiter/admin - i.e. 'authorized users'."""
    if session.candidate_id == current_user.id:
        return True
    return current_user.role is not None and current_user.role.value in AUTHORIZED_RECORDING_ROLES


def _get_session_or_404(session_id: str, db: Session) -> InterviewSession:
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session id.")

    session = (
        db.query(InterviewSession)
        .options(joinedload(InterviewSession.recordings), joinedload(InterviewSession.interview))
        .filter(InterviewSession.id == session_uuid)
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    return session


def _get_viewable_session(session_id: str, current_user: User, db: Session) -> InterviewSession:
    session = _get_session_or_404(session_id, db)
    if not _is_authorized_viewer(session, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this session.")
    return session


def _get_owned_session(session_id: str, current_user: User, db: Session) -> InterviewSession:
    """Only the candidate who owns the session may mutate it (pause/resume/upload/etc)."""
    session = _get_session_or_404(session_id, db)
    if session.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This session belongs to another user.")
    return session


def get_or_create_session(interview: Interview, db: Session) -> InterviewSession:
    """
    Shared helper (also used by interview_routes.start_interview) so
    starting an interview always has a backing InterviewSession without
    the frontend needing to make two separate calls.
    """
    if interview.session:
        return interview.session

    session = InterviewSession(
        candidate_id=interview.user_id,
        interview_id=interview.id,
        status=SessionStatusEnum.active,
        start_time=datetime.utcnow(),
    )
    db.add(session)
    db.flush()
    return session


# ---------------------------------------------------------------------------
# POST /sessions
# ---------------------------------------------------------------------------
@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = db.query(Interview).filter(Interview.id == payload.interview_id).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    if interview.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This interview belongs to another user.")

    session = get_or_create_session(interview, db)
    db.commit()
    db.refresh(session)
    return SessionOut.model_validate(session)


# ---------------------------------------------------------------------------
# GET /sessions
# Candidates see only their own sessions. Recruiters/admins ("authorized
# users") see every session, optionally filtered to one candidate.
# ---------------------------------------------------------------------------
@router.get("", response_model=list[SessionOut])
def list_sessions(
    candidate_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(InterviewSession).options(
        joinedload(InterviewSession.recordings), joinedload(InterviewSession.interview)
    )

    is_authorized_role = current_user.role is not None and current_user.role.value in AUTHORIZED_RECORDING_ROLES

    if is_authorized_role:
        if candidate_id:
            try:
                query = query.filter(InterviewSession.candidate_id == uuid.UUID(candidate_id))
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid candidate id.")
    else:
        query = query.filter(InterviewSession.candidate_id == current_user.id)

    sessions = query.order_by(InterviewSession.created_at.desc()).all()
    return [SessionOut.model_validate(s) for s in sessions]


# ---------------------------------------------------------------------------
# GET /sessions/{session_id}
# ---------------------------------------------------------------------------
@router.get("/{session_id}", response_model=SessionDetailOut)
def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_viewable_session(session_id, current_user, db)
    return SessionDetailOut.model_validate(session)


# ---------------------------------------------------------------------------
# POST /sessions/{session_id}/start
# Spec's explicit "start" step (Create Session -> Camera/Mic Permission ->
# Start Interview). get_or_create_session already sets start_time at
# creation, so for the common case this just confirms the session is
# active; it also covers the case where a session was created via
# POST /sessions ahead of time and is being started later.
# ---------------------------------------------------------------------------
@router.post("/{session_id}/start", response_model=SessionOut)
def start_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_owned_session(session_id, current_user, db)

    if session.status == SessionStatusEnum.completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session has already ended.")

    if not session.start_time:
        session.start_time = datetime.utcnow()
    session.status = SessionStatusEnum.active

    db.commit()
    db.refresh(session)
    return SessionOut.model_validate(session)


# ---------------------------------------------------------------------------
# POST /sessions/{session_id}/pause
# ---------------------------------------------------------------------------
@router.post("/{session_id}/pause", response_model=SessionOut)
def pause_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_owned_session(session_id, current_user, db)

    if session.status == SessionStatusEnum.completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session has already ended.")
    if session.status == SessionStatusEnum.paused:
        return SessionOut.model_validate(session)

    session.status = SessionStatusEnum.paused
    session.paused_at = datetime.utcnow()

    db.commit()
    db.refresh(session)
    return SessionOut.model_validate(session)


# ---------------------------------------------------------------------------
# PATCH /sessions/{session_id}/resume
# ---------------------------------------------------------------------------
@router.post("/{session_id}/resume", response_model=SessionOut)
def resume_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_owned_session(session_id, current_user, db)

    if session.status == SessionStatusEnum.completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session has already ended.")

    if session.status == SessionStatusEnum.paused and session.paused_at:
        elapsed = (datetime.utcnow() - session.paused_at).total_seconds()
        session.total_paused_seconds += int(elapsed)
        session.paused_at = None

    session.status = SessionStatusEnum.active

    db.commit()
    db.refresh(session)
    return SessionOut.model_validate(session)


def _complete_interview(interview: Interview, db: Session) -> None:
    """
    Shared by manual "End Session", timeout (interview_routes), and
    full-screen violation auto-submit: marks the interview completed and
    scores it off however many questions were actually answered.
    """
    if not interview or interview.status == InterviewStatusEnum.completed:
        return

    interview.status = InterviewStatusEnum.completed
    interview.completed_at = datetime.utcnow()

    assessment_data = build_interview_assessment(interview)
    if assessment_data:
        assessment = interview.assessment or InterviewAssessment(interview_id=interview.id)
        for key, value in assessment_data.items():
            setattr(assessment, key, value)
        interview.overall_score = assessment_data["overall_score"]
        db.add(assessment)


# ---------------------------------------------------------------------------
# PATCH /sessions/{session_id}/end
# ---------------------------------------------------------------------------
@router.post("/{session_id}/end", response_model=SessionOut)
def end_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_owned_session(session_id, current_user, db)
    _end_session_internal(session, db)
    _complete_interview(session.interview, db)

    db.commit()
    db.refresh(session)
    return SessionOut.model_validate(session)


def _end_session_internal(session: InterviewSession, db: Session) -> None:
    """Shared with interview_routes (submit_answer / timeout) so the
    session always ends in lock-step with its interview."""
    if session.status == SessionStatusEnum.completed:
        return

    now = datetime.utcnow()

    if session.status == SessionStatusEnum.paused and session.paused_at:
        session.total_paused_seconds += int((now - session.paused_at).total_seconds())
        session.paused_at = None

    session.status = SessionStatusEnum.completed
    session.end_time = now

    if session.start_time:
        total_elapsed = (now - session.start_time).total_seconds()
        session.duration_seconds = max(0, int(total_elapsed) - session.total_paused_seconds)

    # Module 6 - drop this session's in-memory RNN rolling window now
    # that no more ticks are coming, so long-lived processes don't leak.
    engagement_engine.clear_session(str(session.id))


# ---------------------------------------------------------------------------
# POST /sessions/{session_id}/devices
# ---------------------------------------------------------------------------
@router.post("/{session_id}/devices", response_model=SessionOut)
def update_device_status(
    session_id: str,
    payload: DeviceStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_owned_session(session_id, current_user, db)

    session.camera_enabled = payload.camera_enabled
    session.microphone_enabled = payload.microphone_enabled

    db.commit()
    db.refresh(session)
    return SessionOut.model_validate(session)


# ---------------------------------------------------------------------------
# POST /sessions/{session_id}/violations
# Full-screen proctoring: the frontend calls this every time the
# candidate exits full-screen while the interview is active. Once the
# count exceeds MAX_FULLSCREEN_VIOLATIONS, the session/interview are
# auto-submitted server-side (so it can't be bypassed client-side).
# ---------------------------------------------------------------------------
@router.post("/{session_id}/violations", response_model=ViolationReportOut)
def report_violation(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_owned_session(session_id, current_user, db)

    if session.status == SessionStatusEnum.completed:
        return ViolationReportOut(
            session=SessionOut.model_validate(session),
            violation_count=session.fullscreen_violations,
            limit=MAX_FULLSCREEN_VIOLATIONS,
            auto_submitted=True,
        )

    session.fullscreen_violations += 1
    auto_submitted = False

    if session.fullscreen_violations > MAX_FULLSCREEN_VIOLATIONS:
        _end_session_internal(session, db)
        _complete_interview(session.interview, db)
        auto_submitted = True

    db.commit()
    db.refresh(session)

    return ViolationReportOut(
        session=SessionOut.model_validate(session),
        violation_count=session.fullscreen_violations,
        limit=MAX_FULLSCREEN_VIOLATIONS,
        auto_submitted=auto_submitted,
    )
# ---------------------------------------------------------------------------
@router.post("/{session_id}/recordings", response_model=RecordingUploadOut, status_code=status.HTTP_201_CREATED)
async def upload_recording(
    session_id: str,
    recording_type: str = Form("video"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_owned_session(session_id, current_user, db)

    try:
        recording_type_enum = RecordingTypeEnum(recording_type)
    except ValueError:
        recording_type_enum = RecordingTypeEnum.video

    content_type = (file.content_type or "").split(";")[0].strip().lower()
    extension = ALLOWED_RECORDING_MIME_TYPES.get(content_type, "webm")

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty recording upload.")

    if len(file_bytes) > settings.MAX_RECORDING_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recording file is too large (max "
                   + str(settings.MAX_RECORDING_SIZE_BYTES // (1024 * 1024)) + " MB).",
        )

    recordings_dir = os.path.join(settings.MEDIA_ROOT, "recordings")
    os.makedirs(recordings_dir, exist_ok=True)

    file_name = f"{session.id}-{uuid.uuid4().hex[:8]}.{extension}"
    relative_path = storage.save(file_name, file_bytes)

    recording = InterviewRecording(
        session_id=session.id,
        recording_type=recording_type_enum,
        file_path=relative_path,
        mime_type=content_type or file.content_type,
        size_bytes=len(file_bytes),
    )
    db.add(recording)

    db.commit()
    db.refresh(recording)

    return RecordingUploadOut(
        message="Recording saved.",
        recording=InterviewRecordingOut.model_validate(recording),
    )


# ---------------------------------------------------------------------------
# GET /sessions/{session_id}/recordings
# "Allow authorized users to access recordings" - owner candidate, or a
# recruiter/admin reviewing the session.
# ---------------------------------------------------------------------------
@router.get("/{session_id}/recordings", response_model=list[InterviewRecordingOut])
def list_recordings(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_viewable_session(session_id, current_user, db)
    return [InterviewRecordingOut.model_validate(r) for r in session.recordings]


# ---------------------------------------------------------------------------
# DELETE /sessions/{session_id}/recordings/{recording_id}
# ---------------------------------------------------------------------------
@router.delete("/{session_id}/recordings/{recording_id}", response_model=MessageResponse)
def delete_recording(
    session_id: str,
    recording_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_owned_session(session_id, current_user, db)

    try:
        recording_uuid = uuid.UUID(recording_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid recording id.")

    recording = next((r for r in session.recordings if r.id == recording_uuid), None)
    if not recording:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found.")

    storage.delete(recording.file_path)

    db.delete(recording)
    db.commit()
    return MessageResponse(message="Recording deleted.")


# ---------------------------------------------------------------------------
# POST /sessions/{session_id}/emotion-samples
# Module 6 - Emotion Detection & Eye Tracking.
#
# Face detection, expression classification, and an eye-contact heuristic
# all run client-side (face-api.js against the candidate's own webcam
# stream via <video>/<canvas> - see frontend/interview-session.js). The
# frontend accumulates samples locally and periodically posts a small
# batch summary here; raw frames/video never leave the browser. This
# endpoint folds that batch into the session's running totals so
# eye-contact %, dominant emotion, and a visual confidence/engagement
# read are always derived from real, accumulated samples.
# ---------------------------------------------------------------------------
@router.post("/{session_id}/emotion-samples", response_model=SessionOut)
def submit_emotion_samples(
    session_id: str,
    payload: EmotionSampleBatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_owned_session(session_id, current_user, db)

    session.emotion_sample_count += payload.samples_count
    session.face_detected_count += payload.face_detected_count
    session.eye_contact_count += payload.eye_contact_count

    counts = dict(session.emotion_counts or {})
    for emotion, count in payload.emotion_counts.items():
        counts[emotion] = counts.get(emotion, 0) + count
    session.emotion_counts = counts

    # Batch averages are weighted back into running sums by how many
    # face-detected samples they represent (avg_visual_confidence /
    # avg_engagement are only meaningful when a face was found).
    if payload.avg_visual_confidence is not None and payload.face_detected_count:
        session.visual_confidence_sum += payload.avg_visual_confidence * payload.face_detected_count
    if payload.avg_engagement is not None and payload.face_detected_count:
        session.engagement_sum += payload.avg_engagement * payload.face_detected_count

    db.commit()
    db.refresh(session)
    return SessionOut.model_validate(session)


# ---------------------------------------------------------------------------
# POST /sessions/{session_id}/engagement-ticks
# Module 6 - CNN + RNN Interview Behavior Analysis.
#
# The CNN stage (face-api.js) runs per-frame in the browser, same as
# emotion-samples above. This endpoint additionally receives the raw,
# ordered per-tick feature vectors (still just small numbers - never an
# image) for a short recent stretch, feeds them into the backend RNN
# stage (app/ml/engagement_engine.py) which looks at how those vectors
# evolve over a rolling ~30s window, and returns a live temporal
# engagement/risk read plus server-confirmed proctoring flags. Those
# flag counts are persisted so recruiters can see them in review - they
# are informational only and never auto-submit the interview (unlike
# full-screen violations, which do).
# ---------------------------------------------------------------------------
@router.post("/{session_id}/engagement-ticks", response_model=EngagementTickResponseOut)
def submit_engagement_ticks(
    session_id: str,
    payload: EngagementTickBatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_owned_session(session_id, current_user, db)

    result = engagement_engine.process_ticks(
        session_id,
        [tick.model_dump() for tick in payload.ticks],
    )

    session.latest_engagement_score = result.get("engagement_score")
    session.latest_disengagement_risk = result.get("disengagement_risk")
    session.latest_integrity_risk = result.get("integrity_risk")

    flags = result.get("flags", {})
    if flags.get("eye_contact_missing"):
        session.eye_contact_warning_count += 1
    if flags.get("no_face_detected"):
        session.no_face_warning_count += 1
    if flags.get("multiple_faces_detected"):
        session.multiple_faces_warning_count += 1

    db.commit()

    return EngagementTickResponseOut(
        engagement_score=result.get("engagement_score"),
        disengagement_risk=result.get("disengagement_risk"),
        integrity_risk=result.get("integrity_risk"),
        model=result.get("model", "rule_based"),
        flags=flags,
        consecutive_no_eye_contact_ticks=result.get("consecutive_no_eye_contact_ticks", 0),
    )
