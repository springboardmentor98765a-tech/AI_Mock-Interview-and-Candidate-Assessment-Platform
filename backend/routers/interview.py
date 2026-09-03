import logging
try:
    import cv2
except ImportError:
    cv2 = None
import numpy as np
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, File, UploadFile, Form, Body, HTTPException

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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interviews", tags=["AI Interviews"])

# Dual-mount prefix compatibility helpers for /api/interviews, /api/interview, and /interview
api_router = APIRouter(prefix="/api/interviews", tags=["AI Interviews"])
singular_api_router = APIRouter(prefix="/api/interview", tags=["AI Interviews"])
singular_noapi_router = APIRouter(prefix="/interview", tags=["AI Interviews"])


@router.get("/module6/health")
@api_router.get("/module6/health")
@singular_api_router.get("/module6/health")
@singular_noapi_router.get("/module6/health")
def get_module6_health_check():
    """Development/System Health check endpoint for Module 6 runtime status."""
    import sys
    from pathlib import Path
    from services.vision_service import vision_service
    base_dir = Path(__file__).resolve().parent.parent
    conf_path = base_dir / "ml_models" / "confidence_model.pth"
    emo_path = base_dir / "ml_models" / "emotion_model.pth"

    return {
        "module_6": "available",
        "python_executable": sys.executable,
        "confidence_model_exists": conf_path.exists(),
        "confidence_model_loaded": getattr(vision_service, "confidence_model_loaded", False),
        "emotion_model_exists": emo_path.exists(),
        "emotion_model_loaded": getattr(vision_service, "emotion_model_loaded", False),
        "mediapipe_available": getattr(vision_service, "mediapipe_available", False),
        "face_detection_available": getattr(vision_service, "face_detection_available", True),
        "mobile_detection_available": getattr(vision_service, "yolo_model_loaded", False)
    }


@router.get("/module6/behavior-reports")
@api_router.get("/module6/behavior-reports")
@singular_api_router.get("/module6/behavior-reports")
@singular_noapi_router.get("/module6/behavior-reports")
def list_module6_behavior_reports(
    sort_by: Optional[str] = Query("created_at"),
    order: Optional[str] = Query("desc"),
    current_user: User = Depends(require_role(["RECRUITER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """Retrieve list of candidate Module 6 behavior reports with role access control & sorting."""
    from models.interview import Interview, InterviewSession, InterviewBehaviorAnalysis
    from models.user import User as UserModel
    from sqlalchemy import asc, desc, nulls_last

    query = db.query(
        InterviewBehaviorAnalysis,
        InterviewSession,
        Interview,
        UserModel
    ).join(
        InterviewSession, InterviewBehaviorAnalysis.session_id == InterviewSession.id
    ).join(
        Interview, InterviewBehaviorAnalysis.interview_id == Interview.id
    ).join(
        UserModel, InterviewBehaviorAnalysis.candidate_id == UserModel.id
    )

    if current_user.role == "RECRUITER":
        query = query.filter(
            (Interview.recruiter_id == current_user.id) | (Interview.candidate_id != None)
        )

    sort_map = {
        "candidate_name": UserModel.name,
        "interview_title": Interview.domain,
        "position": Interview.interview_type,
        "confidence_score": InterviewBehaviorAnalysis.confidence_score,
        "attention_score": InterviewBehaviorAnalysis.attention_score,
        "eye_contact_percentage": InterviewBehaviorAnalysis.eye_contact_percentage,
        "engagement_score": InterviewBehaviorAnalysis.engagement_score,
        "mobile_event_count": InterviewBehaviorAnalysis.mobile_event_count,
        "fullscreen_violations_count": InterviewBehaviorAnalysis.fullscreen_violations_count,
        "created_at": InterviewBehaviorAnalysis.created_at
    }

    target_col = sort_map.get(sort_by, InterviewBehaviorAnalysis.created_at)
    if order and order.lower() == "asc":
        query = query.order_by(nulls_last(asc(target_col)))
    else:
        query = query.order_by(nulls_last(desc(target_col)))

    results = query.all()
    formatted = []
    for ba, session, interview, cand in results:
        formatted.append({
            "report_id": ba.id,
            "session_id": session.id,
            "interview_id": interview.id,
            "candidate_id": cand.id,
            "candidate_name": cand.name,
            "candidate_email": cand.email,
            "position": interview.interview_type,
            "interview_title": interview.domain,
            "analysis_status": ba.analysis_status or "in_progress",
            "confidence_score": ba.confidence_score,
            "attention_score": ba.attention_score,
            "eye_contact_percentage": ba.eye_contact_percentage,
            "engagement_score": ba.engagement_score,
            "engagement_category": ba.engagement_category,
            "facial_presentation": ba.facial_presentation,
            "mobile_event_count": ba.mobile_event_count or 0,
            "fullscreen_violations_count": ba.fullscreen_violations_count or 0,
            "created_at": ba.created_at.strftime("%Y-%m-%d %H:%M:%S") if ba.created_at else None
        })

    return {"success": True, "data": formatted}



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
    try:
        return get_active_session_by_interview_service(current_user, interview_id, db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[REPORT FETCH ERROR] Error fetching active session for ID {interview_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching report: {str(e)}")


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


# ==========================================
# MODULE 6 — VISION & BEHAVIOR ANALYSIS ENDPOINTS
# ==========================================

from services.behavior_service import process_frame_sample, record_fullscreen_violation, finalize_behavior_analysis, get_behavior_report_dict
from services.vision_service import vision_service
from models.interview import InterviewSession, InterviewBehaviorAnalysis


@router.post("/sessions/{session_id}/analyze-frame")
@api_router.post("/sessions/{session_id}/analyze-frame")
@singular_api_router.post("/sessions/{session_id}/analyze-frame")
@singular_noapi_router.post("/sessions/{session_id}/analyze-frame")
async def analyze_session_webcam_frame(
    session_id: int,
    file: Optional[UploadFile] = File(None),
    frame: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze real-time webcam frame sample using Confidence & Emotion CNNs, MediaPipe, and YOLO."""
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session_rec:
        session_rec = db.query(InterviewSession).filter(InterviewSession.interview_id == session_id).order_by(InterviewSession.created_at.desc()).first()

    if not session_rec:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if current_user.role == "CANDIDATE" and session_rec.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to submit frames for this session.")
    if session_rec.status != "IN_PROGRESS":
        raise HTTPException(status_code=400, detail="Interview session is not active.")

    target_file = file or frame
    if not target_file:
        raise HTTPException(status_code=400, detail="Frame file required.")

    frame_bytes = await target_file.read()
    if not frame_bytes:
        raise HTTPException(status_code=400, detail="Empty frame file uploaded.")

    np_arr = np.frombuffer(frame_bytes, np.uint8)
    bgr_image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if bgr_image is None:
        raise HTTPException(status_code=400, detail="Could not decode image frame.")

    try:
        logger.info(f"[MODULE 6] Frame received for session #{session_rec.id}")
        frame_analysis = vision_service.analyze_frame(bgr_image)
        result = process_frame_sample(db, session_rec, frame_analysis)
        logger.info(f"[MODULE 6] Behavior analysis updated for session #{session_rec.id}")
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"[MODULE 6] Error analyzing webcam frame sample for session {session_id}: {e}", exc_info=True)
        return {"success": True, "status": "skipped", "message": f"Frame sample skipped cleanly: {e}"}


@router.post("/sessions/{session_id}/fullscreen-violation")
@api_router.post("/sessions/{session_id}/fullscreen-violation")
@singular_api_router.post("/sessions/{session_id}/fullscreen-violation")
@singular_noapi_router.post("/sessions/{session_id}/fullscreen-violation")
def log_fullscreen_violation(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log a fullscreen exit violation. Warning on violations 1-4, auto-terminate trigger on 5th."""
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session_rec:
        session_rec = db.query(InterviewSession).filter(InterviewSession.interview_id == session_id).order_by(InterviewSession.created_at.desc()).first()

    if not session_rec:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if current_user.role == "CANDIDATE" and session_rec.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this session.")

    res = record_fullscreen_violation(db, session_rec.id)
    return {"success": True, "data": res}


@router.get("/sessions/{session_id}/behavior-report")
@api_router.get("/sessions/{session_id}/behavior-report")
@singular_api_router.get("/sessions/{session_id}/behavior-report")
@singular_noapi_router.get("/sessions/{session_id}/behavior-report")
def get_session_behavior_report(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve complete Module 6 Recruiter & Candidate behavior analysis report."""
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session_rec:
        # Fallback for callers passing interview_id
        session_rec = db.query(InterviewSession).filter(InterviewSession.interview_id == session_id).order_by(InterviewSession.created_at.desc()).first()

    if not session_rec:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if current_user.role == "CANDIDATE" and session_rec.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this session.")

    logger.info(f"[MODULE 6] Report API called for session #{session_rec.id}")
    report = db.query(InterviewBehaviorAnalysis).filter(InterviewBehaviorAnalysis.session_id == session_rec.id).first()
    if not report:
        report = finalize_behavior_analysis(db, session_rec)

    report_dict = get_behavior_report_dict(db, session_rec, report)
    logger.info(f"[MODULE 6] Report returned to frontend for session #{session_rec.id}")
    return {"success": True, "data": report_dict}


# ==========================================
# PERFORMANCE EVALUATION & AI FEEDBACK REPORT ENDPOINTS
# ==========================================

from services.interview_service import get_performance_report_service

@router.get("/sessions/{session_id}/performance-report")
@api_router.get("/sessions/{session_id}/performance-report")
@singular_api_router.get("/sessions/{session_id}/performance-report")
@singular_noapi_router.get("/sessions/{session_id}/performance-report")
def get_session_performance_report(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve complete candidate performance evaluation report by session ID."""
    report_dict = get_performance_report_service(current_user, session_id, db, is_session=True)
    return {"success": True, "data": report_dict}


@router.get("/{interview_id}/performance-report")
@api_router.get("/{interview_id}/performance-report")
@singular_api_router.get("/{interview_id}/performance-report")
@singular_noapi_router.get("/{interview_id}/performance-report")
def get_interview_performance_report(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve complete candidate performance evaluation report by interview ID."""
    report_dict = get_performance_report_service(current_user, interview_id, db, is_session=False)
    return {"success": True, "data": report_dict}





