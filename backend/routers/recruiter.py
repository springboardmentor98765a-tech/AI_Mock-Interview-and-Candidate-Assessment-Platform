from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.recruiter import RecruiterProfileUpdate, RecruiterProfileResponse
from schemas.candidate import CandidateRankingItem
from services.recruiter_service import (
    get_recruiter_profile_service,
    update_recruiter_profile_service,
    get_candidate_rankings_service
)
from security.dependencies import require_recruiter

router = APIRouter(prefix="/api/recruiter", tags=["Recruiter"])

@router.get("/profile", response_model=RecruiterProfileResponse)
def get_recruiter_profile(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db)
):
    return get_recruiter_profile_service(current_user, db)

@router.put("/profile", response_model=RecruiterProfileResponse)
def update_recruiter_profile(
    data: RecruiterProfileUpdate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db)
):
    return update_recruiter_profile_service(current_user, data, db)

@router.get("/rankings", response_model=List[CandidateRankingItem])
def get_candidate_rankings(
    search: Optional[str] = Query(None, description="Search candidate by name, email, or role"),
    role: Optional[str] = Query(None, description="Filter by target role"),
    min_score: Optional[float] = Query(0.0, description="Minimum overall score"),
    sort_by: Optional[str] = Query("overall", description="Sort by: overall, ats, interview, name"),
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db)
):
    return get_candidate_rankings_service(
        db=db,
        search=search,
        role_filter=role,
        min_score=min_score,
        sort_by=sort_by
    )
