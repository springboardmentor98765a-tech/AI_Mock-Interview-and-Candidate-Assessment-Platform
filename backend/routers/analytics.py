from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from security.dependencies import get_current_user, require_role, require_admin
from services.analytics_service import (
    get_candidate_dashboard_analytics,
    get_candidate_interview_history,
    get_candidate_skill_analytics,
    get_candidate_weak_areas,
    get_candidate_performance_trends,
    get_candidate_ai_feedback,
    get_recruiter_candidate_rankings,
    get_recruiter_candidate_comparison,
    get_recruiter_shortlisting_insights,
    get_admin_analytics_summary
)
from services.consent_service import check_recruiter_score_access
from services.interview_service import get_performance_report_service

router = APIRouter(tags=["Analytics & Dashboard"])


# --- CANDIDATE ANALYTICS ENDPOINTS ---

@router.get("/api/candidate/analytics/dashboard")
def get_candidate_analytics_dashboard(
    current_user: User = Depends(require_role(["CANDIDATE"])),
    db: Session = Depends(get_db)
):
    """Retrieve comprehensive candidate performance tracking metrics."""
    data = get_candidate_dashboard_analytics(db, current_user.id)
    return {"success": True, "data": data}


@router.get("/api/candidate/analytics/history")
def get_candidate_analytics_history(
    current_user: User = Depends(require_role(["CANDIDATE"])),
    db: Session = Depends(get_db)
):
    """Retrieve complete candidate interview history."""
    data = get_candidate_interview_history(db, current_user.id)
    return {"success": True, "data": data}


@router.get("/api/candidate/analytics/skills")
def get_candidate_analytics_skills(
    current_user: User = Depends(require_role(["CANDIDATE"])),
    db: Session = Depends(get_db)
):
    """Retrieve skill-wise performance analytics."""
    data = get_candidate_skill_analytics(db, current_user.id)
    return {"success": True, "data": data}


@router.get("/api/candidate/analytics/weak-areas")
def get_candidate_analytics_weak_areas(
    current_user: User = Depends(require_role(["CANDIDATE"])),
    db: Session = Depends(get_db)
):
    """Retrieve data-driven weak-area predictions and recommendations."""
    data = get_candidate_weak_areas(db, current_user.id)
    return {"success": True, "data": data}


@router.get("/api/candidate/analytics/trends")
def get_candidate_analytics_trends(
    current_user: User = Depends(require_role(["CANDIDATE"])),
    db: Session = Depends(get_db)
):
    """Retrieve chronological performance trends across completed interviews."""
    data = get_candidate_performance_trends(db, current_user.id)
    return {"success": True, "data": data}


@router.get("/api/candidate/analytics/ai-feedback")
def get_candidate_analytics_ai_feedback(
    current_user: User = Depends(require_role(["CANDIDATE"])),
    db: Session = Depends(get_db)
):
    """Retrieve candidate AI feedback history and improvement recommendations."""
    data = get_candidate_ai_feedback(db, current_user.id)
    return {"success": True, "data": data}


# --- RECRUITER ANALYTICS ENDPOINTS ---

@router.get("/api/recruiter/analytics/overview")
@router.get("/api/recruiter/analytics/candidates")
def get_recruiter_analytics_candidates(
    sort_by: str = Query("overall_score", description="Sort factor: overall_score, technical_score, communication_score"),
    order: str = Query("desc", description="Sort order: asc, desc"),
    role: Optional[str] = Query(None, description="Filter by candidate target role"),
    status_filter: Optional[str] = Query(None, description="Filter by interview status"),
    current_user: User = Depends(require_role(["RECRUITER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Retrieve recruiter candidate rankings and scores.
    STRICT PRIVACY ENFORCEMENT: Scores for candidates who have NOT granted consent are hidden (null/Scores Private).
    """
    data = get_recruiter_candidate_rankings(
        db=db,
        recruiter_user=current_user,
        sort_by=sort_by,
        order=order,
        role_filter=role,
        status_filter=status_filter
    )
    return {"success": True, "data": data}


@router.post("/api/recruiter/analytics/compare")
def compare_recruiter_candidates(
    interview_ids: List[int] = Body(..., embed=True),
    current_user: User = Depends(require_role(["RECRUITER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """Side-by-side comparison of candidate interview performance metrics."""
    data = get_recruiter_candidate_comparison(db, current_user, interview_ids)
    return {"success": True, "data": data}


@router.get("/api/recruiter/analytics/shortlisting-insights")
def get_recruiter_analytics_shortlisting_insights(
    current_user: User = Depends(require_role(["RECRUITER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """Retrieve data-backed shortlisting insights for candidates."""
    data = get_recruiter_shortlisting_insights(db, current_user)
    return {"success": True, "data": data}


@router.get("/api/recruiter/analytics/report/{interview_id}")
def get_recruiter_candidate_report(
    interview_id: int,
    current_user: User = Depends(require_role(["RECRUITER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Retrieve candidate evaluation report for recruiter.
    STRICT PRIVACY ENFORCEMENT: Enforces candidate score-sharing consent check. Returns 403 Forbidden if consent is absent or revoked.
    """
    # 1. Authorization & Consent Guard
    has_access = check_recruiter_score_access(db, current_user, interview_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Candidate has not granted score-sharing consent for this interview."
        )

    # 2. Reuse existing report service
    report_dict = get_performance_report_service(current_user, interview_id, db, is_session=False)
    return {"success": True, "data": report_dict}


# --- ADMIN ANALYTICS ENDPOINTS ---

@router.get("/api/admin/analytics/summary")
@router.get("/api/admin/analytics/platform")
def get_admin_analytics_summary_route(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Retrieve platform-level usage, interview activity, AI monitoring, and system health analytics."""
    data = get_admin_analytics_summary(db)
    return {"success": True, "data": data}

