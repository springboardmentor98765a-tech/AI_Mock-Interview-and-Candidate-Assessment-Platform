from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.recruiter import (
    RecruiterProfileUpdate,
    RecruiterProfileResponse,
    InterviewTemplateCreate,
    InterviewTemplateUpdate,
    CandidateCompareRequest
)
from schemas.candidate import CandidateRankingItem
from services.recruiter_service import (
    get_recruiter_profile_service,
    update_recruiter_profile_service,
    get_candidate_rankings_service,
    get_recruiter_analytics_service,
    get_interview_templates_service,
    create_interview_template_service,
    update_interview_template_service,
    delete_interview_template_service,
    duplicate_interview_template_service,
    compare_candidates_service,
    get_monitoring_sessions_service
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


@router.get("/analytics")
def get_recruiter_analytics(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db)
):
    analytics = get_recruiter_analytics_service(db)
    return {"success": True, "message": "Recruiter analytics retrieved.", "data": analytics, "details": None}

@router.get("/templates")
def get_interview_templates(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db)
):
    templates = get_interview_templates_service(current_user, db)
    return {"success": True, "message": "Interview templates retrieved.", "data": templates, "details": None}

@router.post("/templates")
def create_interview_template(
    payload: InterviewTemplateCreate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db)
):
    template = create_interview_template_service(current_user, payload, db)
    return {"success": True, "message": "Interview template created successfully.", "data": template, "details": None}

@router.put("/templates/{template_id}")
def update_interview_template(
    template_id: int,
    payload: InterviewTemplateUpdate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db)
):
    template = update_interview_template_service(current_user, template_id, payload, db)
    return {"success": True, "message": "Interview template updated successfully.", "data": template, "details": None}

@router.delete("/templates/{template_id}")
def delete_interview_template(
    template_id: int,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db)
):
    res = delete_interview_template_service(current_user, template_id, db)
    return {"success": True, "message": res["message"], "data": None, "details": None}

@router.post("/templates/{template_id}/duplicate")
def duplicate_interview_template(
    template_id: int,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db)
):
    template = duplicate_interview_template_service(current_user, template_id, db)
    return {"success": True, "message": "Interview template duplicated successfully.", "data": template, "details": None}

@router.post("/compare")
def compare_candidates(
    payload: CandidateCompareRequest,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db)
):
    comparison = compare_candidates_service(payload.candidate_ids, db)
    return {"success": True, "message": "Candidate comparison matrix generated.", "data": comparison, "details": None}

@router.get("/monitoring")
def get_monitoring_sessions(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db)
):
    sessions = get_monitoring_sessions_service(db)
    return {"success": True, "message": "Live monitoring sessions retrieved.", "data": sessions, "details": None}

