from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, File, UploadFile, Form, Body

from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.interview import (
    InterviewGenerateRequest,
    InterviewStartRequest,
    InterviewSubmitRequest,
    InterviewSummaryResponse,
    InterviewDetailResponse,
    InterviewQuestionAdminSchema,
    InterviewSessionCreateRequest,
    InterviewSessionPositionRequest,
    InterviewQuestionAttemptCreate
)
from services.interview_service import (
    generate_interview_service,
    regenerate_entire_interview_service,
    regenerate_single_question_service,
    start_interview_service,
    submit_interview_service,
    list_interviews_service,
    get_interview_details_service,
    delete_interview_service,
    create_interview_session_service,
    start_session_service,
    pause_session_service,
    resume_session_service,
    end_session_service,
    get_session_details_service,
    get_active_session_by_interview_service,
    update_session_position_service,
    record_question_attempt_service,
    upload_session_recording_service,
    get_authorized_recording_service
)
from security.dependencies import get_current_user, require_role


router = APIRouter(prefix="/interviews", tags=["AI Interviews"])

# Dual-mount prefix compatibility helpers for /api/interviews, /api/interview, and /interview
api_router = APIRouter(prefix="/api/interviews", tags=["AI Interviews"])
singular_api_router = APIRouter(prefix="/api/interview", tags=["AI Interviews"])
singular_noapi_router = APIRouter(prefix="/interview", tags=["AI Interviews"])


@router.post("/generate", response_model=InterviewSummaryResponse)
@api_router.post("/generate", response_model=InterviewSummaryResponse)
@singular_api_router.post("/generate", response_model=InterviewSummaryResponse)
def generate_interview(
    payload: InterviewGenerateRequest,
    current_user: User = Depends(require_role(["RECRUITER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """Generate a new AI Interview (Recruiters & Admins Only)."""
    return generate_interview_service(current_user, payload, db)


@router.post("/{interview_id}/regenerate", response_model=InterviewSummaryResponse)
@api_router.post("/{interview_id}/regenerate", response_model=InterviewSummaryResponse)
def regenerate_entire_interview(
    interview_id: int,
    current_user: User = Depends(require_role(["RECRUITER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """Regenerate all questions for an interview (Recruiters & Admins Only)."""
    return regenerate_entire_interview_service(current_user, interview_id, db)


@router.post("/{interview_id}/questions/{question_id}/regenerate", response_model=InterviewQuestionAdminSchema)
@api_router.post("/{interview_id}/questions/{question_id}/regenerate", response_model=InterviewQuestionAdminSchema)
def regenerate_single_question(
    interview_id: int,
    question_id: int,
    current_user: User = Depends(require_role(["RECRUITER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """Regenerate a single target question (Recruiters & Admins Only)."""
    return regenerate_single_question_service(current_user, interview_id, question_id, db)


@router.post("/start")
@api_router.post("/start")
def start_interview(
    payload: InterviewStartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start an assigned interview session (Assigned Candidate)."""
    res = start_interview_service(current_user, payload, db)
    return {"success": True, "message": "Interview session started successfully.", "data": res, "details": None}


@router.post("/submit")
@api_router.post("/submit")
def submit_interview(
    payload: InterviewSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit interview responses (Assigned Candidate)."""
    res = submit_interview_service(current_user, payload, db)
    return {"success": True, "message": "Interview submitted successfully.", "data": res, "details": None}


@router.get("", response_model=List[InterviewSummaryResponse])
@router.get("/", response_model=List[InterviewSummaryResponse])
@api_router.get("", response_model=List[InterviewSummaryResponse])
@api_router.get("/", response_model=List[InterviewSummaryResponse])
def list_interviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List interviews (Role-filtered: Candidate=assigned; Recruiter=managed; Admin=all)."""
    return list_interviews_service(current_user, db)


@router.get("/history", response_model=List[InterviewSummaryResponse])
@api_router.get("/history", response_model=List[InterviewSummaryResponse])
def get_interview_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get completed interview history."""
    return list_interviews_service(current_user, db)


@router.get("/{interview_id}", response_model=InterviewDetailResponse)
@api_router.get("/{interview_id}", response_model=InterviewDetailResponse)
def get_interview_details(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get interview details (Role-filtered answer visibility)."""
    return get_interview_details_service(current_user, interview_id, db)


@router.delete("/{interview_id}")
@api_router.delete("/{interview_id}")
def delete_interview(
    interview_id: int,
    current_user: User = Depends(require_role(["RECRUITER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """Soft delete an interview (Recruiters & Admins Only)."""
    res = delete_interview_service(current_user, interview_id, db)
    return {"success": True, "message": res["message"], "data": None, "details": None}


# ==========================================
# INTERVIEW SESSION MANAGEMENT ENDPOINTS
# ==========================================

@router.post("/sessions")
@api_router.post("/sessions")
@singular_api_router.post("/sessions")
@singular_noapi_router.post("/sessions")
def create_interview_session(
    payload: InterviewSessionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new interview session or retrieve existing active session."""
    return create_interview_session_service(current_user, payload, db)


@router.get("/sessions/interview/{interview_id}")
@api_router.get("/sessions/interview/{interview_id}")
@singular_api_router.get("/sessions/interview/{interview_id}")
@singular_noapi_router.get("/sessions/interview/{interview_id}")
def get_active_interview_session(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get active or latest session for an interview (specific path matched before generic session_id)."""
    return get_active_session_by_interview_service(current_user, interview_id, db)


@router.get("/sessions/{session_id}")
@api_router.get("/sessions/{session_id}")
@singular_api_router.get("/sessions/{session_id}")
@singular_noapi_router.get("/sessions/{session_id}")
def get_interview_session_details(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details for an interview session."""
    return get_session_details_service(current_user, session_id, db)


@router.post("/sessions/{session_id}/start")
@api_router.post("/sessions/{session_id}/start")
@singular_api_router.post("/sessions/{session_id}/start")
@singular_noapi_router.post("/sessions/{session_id}/start")
def start_interview_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start an interview session (CREATED -> IN_PROGRESS)."""
    return start_session_service(current_user, session_id, db)


@router.post("/sessions/{session_id}/pause")
@api_router.post("/sessions/{session_id}/pause")
@singular_api_router.post("/sessions/{session_id}/pause")
@singular_noapi_router.post("/sessions/{session_id}/pause")
def pause_interview_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Pause an active interview session (IN_PROGRESS -> PAUSED)."""
    return pause_session_service(current_user, session_id, db)


@router.post("/sessions/{session_id}/resume")
@api_router.post("/sessions/{session_id}/resume")
@singular_api_router.post("/sessions/{session_id}/resume")
@singular_noapi_router.post("/sessions/{session_id}/resume")
def resume_interview_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resume a paused interview session (PAUSED -> IN_PROGRESS)."""
    return resume_session_service(current_user, session_id, db)


@router.post("/sessions/{session_id}/end")
@api_router.post("/sessions/{session_id}/end")
@singular_api_router.post("/sessions/{session_id}/end")
@singular_noapi_router.post("/sessions/{session_id}/end")
def end_interview_session(
    session_id: int,
    payload: Optional[dict] = Body(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """End an interview session (IN_PROGRESS/PAUSED -> COMPLETED)."""
    remarks = payload.get("remarks") if payload and isinstance(payload, dict) else None
    return end_session_service(current_user, session_id, db, remarks=remarks)



@router.put("/sessions/{session_id}/position")
@api_router.put("/sessions/{session_id}/position")
@singular_api_router.put("/sessions/{session_id}/position")
@singular_noapi_router.put("/sessions/{session_id}/position")
def update_interview_session_position(
    session_id: int,
    payload: InterviewSessionPositionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update active question index position in session."""
    return update_session_position_service(current_user, session_id, payload.current_question_index, db)


@router.post("/sessions/{session_id}/attempt")
@api_router.post("/sessions/{session_id}/attempt")
@singular_api_router.post("/sessions/{session_id}/attempt")
@singular_noapi_router.post("/sessions/{session_id}/attempt")
def record_question_attempt(
    session_id: int,
    payload: InterviewQuestionAttemptCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record or update a question attempt response and active timing."""
    return record_question_attempt_service(current_user, session_id, payload, db)


@router.post("/sessions/{session_id}/recordings")
@api_router.post("/sessions/{session_id}/recordings")
@singular_api_router.post("/sessions/{session_id}/recordings")
@singular_noapi_router.post("/sessions/{session_id}/recordings")
async def upload_session_recording(
    session_id: int,
    file: UploadFile = File(...),
    duration: float = Form(0.0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload video+audio recording file securely for an interview session."""
    file_bytes = await file.read()
    return upload_session_recording_service(
        current_user=current_user,
        session_id=session_id,
        file_bytes=file_bytes,
        original_filename=file.filename or "recording.webm",
        mime_type=file.content_type or "video/webm",
        duration=duration,
        db=db
    )


@router.get("/sessions/{session_id}/recordings/{recording_id}")
@api_router.get("/sessions/{session_id}/recordings/{recording_id}")
@singular_api_router.get("/sessions/{session_id}/recordings/{recording_id}")
@singular_noapi_router.get("/sessions/{session_id}/recordings/{recording_id}")
def get_authorized_recording(
    session_id: int,
    recording_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Stream authorized video+audio recording file after JWT role validation."""
    return get_authorized_recording_service(current_user, session_id, recording_id, db)



