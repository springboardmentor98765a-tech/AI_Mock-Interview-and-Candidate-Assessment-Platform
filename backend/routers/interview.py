from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.interview import (
    InterviewGenerateRequest,
    InterviewStartRequest,
    InterviewSubmitRequest,
    InterviewSummaryResponse,
    InterviewDetailResponse,
    InterviewQuestionAdminSchema
)
from services.interview_service import (
    generate_interview_service,
    regenerate_entire_interview_service,
    regenerate_single_question_service,
    start_interview_service,
    submit_interview_service,
    list_interviews_service,
    get_interview_details_service,
    delete_interview_service
)
from security.dependencies import get_current_user, require_role

router = APIRouter(prefix="/interviews", tags=["AI Interviews"])

# Dual-mount prefix compatibility helpers for /api/interviews and /api/interview
api_router = APIRouter(prefix="/api/interviews", tags=["AI Interviews"])
singular_api_router = APIRouter(prefix="/api/interview", tags=["AI Interviews"])

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
