from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.candidate import CandidateProfileUpdate, CandidateProfileResponse, InterviewSubmitRequest
from services.candidate_service import (
    get_candidate_profile_service,
    update_candidate_profile_service,
    upload_resume_service,
    get_questions_service,
    submit_mock_interview_service,
    get_candidate_history_service,
    get_candidate_analytics_service,
    get_candidate_progress_service
)
from security.dependencies import require_candidate

router = APIRouter(prefix="/api/candidate", tags=["Candidate"])

@router.get("/profile", response_model=CandidateProfileResponse)
def get_candidate_profile(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db)
):
    return get_candidate_profile_service(current_user, db)

@router.put("/profile", response_model=CandidateProfileResponse)
def update_candidate_profile(
    data: CandidateProfileUpdate,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db)
):
    return update_candidate_profile_service(current_user, data, db)


@router.post("/resume")
def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db)
):
    res = upload_resume_service(current_user, file, db)
    return {"success": True, "message": "Resume uploaded successfully.", "data": res, "details": None}

@router.get("/questions")
def get_questions(
    category: Optional[str] = Query("Technical", description="Category: Technical, HR, Behavioral"),
    current_user: User = Depends(require_candidate)
):
    questions = get_questions_service(category)
    return {"success": True, "message": f"{category} questions loaded.", "data": questions, "details": None}

@router.post("/mock-interview/submit")
def submit_mock_interview(
    payload: InterviewSubmitRequest,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db)
):
    res = submit_mock_interview_service(current_user, payload, db)
    return {"success": True, "message": "Mock interview submitted successfully.", "data": res, "details": None}

@router.get("/mock-interview/history")
def get_interview_history(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db)
):
    history = get_candidate_history_service(current_user, db)
    return {"success": True, "message": "Interview history retrieved.", "data": history, "details": None}

@router.get("/analytics")
def get_candidate_analytics(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db)
):
    analytics = get_candidate_analytics_service(current_user, db)
    return {"success": True, "message": "Candidate performance analytics retrieved.", "data": analytics, "details": None}

@router.get("/progress")
def get_candidate_progress(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db)
):
    progress = get_candidate_progress_service(current_user, db)
    return {"success": True, "message": "Candidate progress tracking details retrieved.", "data": progress, "details": None}

