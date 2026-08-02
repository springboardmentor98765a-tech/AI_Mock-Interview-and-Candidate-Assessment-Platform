from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.candidate import CandidateProfileUpdate, CandidateProfileResponse
from services.candidate_service import (
    get_candidate_profile_service,
    update_candidate_profile_service,
    upload_resume_service
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
    return upload_resume_service(current_user, file, db)
