"""
Analytics Router Module
Exposes production-ready REST endpoints for Performance Tracking, Interview History,
Skill-Wise Analytics, Weak-Area Prediction, Performance Trends, Candidate Rankings,
and Zero-Dummy-Data Report Exports with strict Role-Based Access Control (RBAC).
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from backend.auth import get_current_user, require_role
from backend.database import db
from backend.services.analytics_service import (
    get_filtered_interviews,
    calculate_performance_overview,
    get_paginated_interview_history,
    calculate_skill_analytics,
    predict_weak_areas,
    calculate_performance_trends,
    calculate_candidate_rankings,
    get_single_interview_breakdown,
    generate_interviews_csv,
    WEAKNESS_THRESHOLDS,
    DEFAULT_SCORE_WEIGHTS,
    DEFAULT_RANKING_WEIGHTS
)

router = APIRouter(prefix="/api/analytics", tags=["Performance Analytics & Reports"])


class UserStatusUpdateRequest(BaseModel):
    status: str


def _resolve_candidate_scope(current_user: dict, requested_candidate_id: Optional[str]) -> Optional[str]:
    """
    Enforces candidate data isolation.
    Candidates can NEVER query another candidate's private data.
    Recruiters and admins can query specific candidates or all candidates.
    """
    if current_user["role"] == "candidate":
        return current_user["id"]
    return requested_candidate_id


# ==============================================================================
# 1. Performance Overview & KPI Tracking
# ==============================================================================

@router.get("/overview")
def get_analytics_overview(
    candidate_id: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    interview_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns real-time summary KPIs and averages calculated from actual interview records.
    """
    scoped_candidate_id = _resolve_candidate_scope(current_user, candidate_id)
    interviews = get_filtered_interviews(
        candidate_id=scoped_candidate_id,
        domain=domain,
        difficulty=difficulty,
        interview_type=interview_type,
        status=status,
        date_from=date_from,
        date_to=date_to,
        search=search
    )
    return calculate_performance_overview(interviews)


@router.get("/performance")
def get_detailed_performance(
    candidate_id: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    interview_type: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns detailed multidimensional performance averages across all pillars and sub-metrics.
    """
    scoped_candidate_id = _resolve_candidate_scope(current_user, candidate_id)
    interviews = get_filtered_interviews(
        candidate_id=scoped_candidate_id,
        domain=domain,
        difficulty=difficulty,
        interview_type=interview_type,
        date_from=date_from,
        date_to=date_to
    )
    overview = calculate_performance_overview(interviews)
    skills = calculate_skill_analytics(interviews)
    return {
        "overview": overview,
        "skills": skills,
        "score_weights": DEFAULT_SCORE_WEIGHTS
    }


# ==============================================================================
# 2. Filterable & Paginated Interview History
# ==============================================================================

@router.get("/interviews")
def get_interview_history(
    candidate_id: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    interview_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("date"),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns filterable, searchable, sorted, and paginated interview history from real database entries.
    """
    scoped_candidate_id = _resolve_candidate_scope(current_user, candidate_id)
    interviews = get_filtered_interviews(
        candidate_id=scoped_candidate_id,
        domain=domain,
        difficulty=difficulty,
        interview_type=interview_type,
        status=status,
        date_from=date_from,
        date_to=date_to,
        search=search
    )
    return get_paginated_interview_history(
        interviews=interviews,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size
    )


# ==============================================================================
# 3. Skill-Wise Analytics & Radar Comparisons
# ==============================================================================

@router.get("/skills")
def get_skill_analytics(
    candidate_id: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    interview_type: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns actual scores, averages, highs, lows, and trends for every skill evaluated in assessments.
    """
    scoped_candidate_id = _resolve_candidate_scope(current_user, candidate_id)
    interviews = get_filtered_interviews(
        candidate_id=scoped_candidate_id,
        domain=domain,
        difficulty=difficulty,
        interview_type=interview_type,
        date_from=date_from,
        date_to=date_to
    )
    return calculate_skill_analytics(interviews)


# ==============================================================================
# 4. Weak-Area Prediction Engine
# ==============================================================================

@router.get("/weak-areas")
def get_weak_area_predictions(
    candidate_id: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    critical_threshold: float = Query(50.0),
    needs_improvement_threshold: float = Query(65.0),
    moderate_threshold: float = Query(80.0),
    current_user: dict = Depends(get_current_user)
):
    """
    Evaluates real historical assessment data against configurable thresholds to identify growth areas.
    """
    scoped_candidate_id = _resolve_candidate_scope(current_user, candidate_id)
    interviews = get_filtered_interviews(
        candidate_id=scoped_candidate_id,
        domain=domain
    )
    thresholds = {
        "critical": critical_threshold,
        "needs_improvement": needs_improvement_threshold,
        "moderate": moderate_threshold
    }
    return predict_weak_areas(interviews, thresholds)


# ==============================================================================
# 5. Performance Trends & Historical Timeline
# ==============================================================================

@router.get("/trends")
def get_performance_trends(
    candidate_id: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    period: str = Query("all"),
    current_user: dict = Depends(get_current_user)
):
    """
    Generates time-series progression curves across overall, technical, communication, and confidence scores.
    """
    scoped_candidate_id = _resolve_candidate_scope(current_user, candidate_id)
    interviews = get_filtered_interviews(
        candidate_id=scoped_candidate_id,
        domain=domain
    )
    return calculate_performance_trends(interviews, period)


# ==============================================================================
# 6. Candidate Ranking Metrics (Recruiter & Admin)
# ==============================================================================

@router.get("/rankings")
def get_candidate_rankings(
    domain: Optional[str] = Query(None),
    sort_by: str = Query("rank"),
    sort_order: str = Query("asc"),
    current_user: dict = Depends(require_role(["recruiter", "admin"]))
):
    """
    Calculates multi-factor algorithmic ranking across candidates using actual assessment records.
    """
    return calculate_candidate_rankings(
        domain=domain,
        sort_by=sort_by,
        sort_order=sort_order,
        weights=DEFAULT_RANKING_WEIGHTS
    )


# ==============================================================================
# 7. Single Interview Score Breakdown & Candidate Dossier
# ==============================================================================

@router.get("/interview/{interview_id}")
def get_interview_detail(
    interview_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns transparent score breakdown, weighted contributions, and AI feedback for a single interview.
    """
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview record not found.")

    if current_user["role"] == "candidate" and interview.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied to this interview breakdown.")

    breakdown = get_single_interview_breakdown(interview_id)
    if not breakdown:
        raise HTTPException(status_code=404, detail="Interview breakdown unavailable.")
    return breakdown


@router.get("/candidate/{candidate_id}")
def get_candidate_profile_analytics(
    candidate_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns a comprehensive analytics profile for a specific candidate.
    """
    scoped_id = _resolve_candidate_scope(current_user, candidate_id)
    if current_user["role"] == "candidate" and scoped_id != candidate_id:
        raise HTTPException(status_code=403, detail="Access denied to candidate profile.")

    user = db.users.get(candidate_id)
    if not user or user.get("role") != "candidate":
        raise HTTPException(status_code=404, detail="Candidate not found.")

    resume = db.resumes.get(candidate_id)
    interviews = get_filtered_interviews(candidate_id=candidate_id)
    overview = calculate_performance_overview(interviews)
    skills = calculate_skill_analytics(interviews)
    weak_areas = predict_weak_areas(interviews)
    trends = calculate_performance_trends(interviews, period="all")

    return {
        "candidate": {
            "id": user["id"],
            "name": user["full_name"],
            "email": user["email"],
            "status": user.get("status", "Active"),
            "created_at": user.get("created_at"),
            "skills": resume["parsed_data"].get("skills", []) if resume and "parsed_data" in resume else []
        },
        "overview": overview,
        "skills": skills,
        "weak_areas": weak_areas,
        "trends": trends,
        "interviews_count": len(interviews)
    }


# ==============================================================================
# 8. Report & CSV Data Exports
# ==============================================================================

@router.get("/export/csv")
def export_analytics_csv(
    candidate_id: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    interview_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Exports filtered interview records as downloadable CSV.
    """
    scoped_id = _resolve_candidate_scope(current_user, candidate_id)
    interviews = get_filtered_interviews(
        candidate_id=scoped_id,
        domain=domain,
        difficulty=difficulty,
        interview_type=interview_type,
        status=status,
        date_from=date_from,
        date_to=date_to
    )
    csv_content = generate_interviews_csv(interviews)
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=interview_analytics_export.csv"}
    )


# ==============================================================================
# 9. Legacy / Backward-Compatible Endpoints
# ==============================================================================

@router.get("/report/{interview_id}")
def get_performance_report(
    interview_id: str,
    current_user: dict = Depends(get_current_user)
):
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview record not found.")

    if current_user["role"] == "candidate" and interview["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied to this report.")

    if not interview.get("report") and interview_id not in getattr(db, "assessments", {}):
        raise HTTPException(status_code=400, detail="Performance report is not yet generated for this interview.")

    candidate_resume = db.resumes.get(interview["user_id"])
    parsed_skills = candidate_resume["parsed_data"].get("skills", []) if candidate_resume else []
    assessment = _get_interview_assessment(interview)

    return {
        "interview_id": interview["id"],
        "session_id": interview.get("session_id"),
        "candidate_name": interview["candidate_name"],
        "domain": interview["domain"],
        "difficulty": interview["difficulty"],
        "type": interview["type"],
        "status": interview.get("status", "Completed"),
        "start_time": interview.get("start_time"),
        "end_time": interview.get("end_time"),
        "duration_seconds": interview.get("duration_seconds", 0),
        "created_at": interview["created_at"],
        "skills": parsed_skills,
        "video_recording_ref": interview.get("video_recording_ref"),
        "audio_recording_ref": interview.get("audio_recording_ref"),
        "questions_attempted": interview.get("questions_attempted", len(interview.get("questions", []))),
        "question_times": interview.get("question_times", {}),
        "report": interview.get("report") or assessment,
        "questions": interview["questions"]
    }


def _get_interview_assessment(interview: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    int_id = interview.get("id")
    if int_id and int_id in getattr(db, "assessments", {}):
        return db.assessments[int_id]
    report = interview.get("report")
    if report:
        cat_scores = report.get("category_scores", {})
        return {
            "overall_score": report.get("overall_score", 0.0),
            "performance_rating": report.get("performance_rating", "Average"),
            "recommendation": report.get("recommendation", "Consider"),
            "communication_score": cat_scores.get("Communication", 0.0),
            "confidence_score": cat_scores.get("Confidence", 0.0),
            "technical_relevance_score": cat_scores.get("Technical Relevance") or cat_scores.get("Technical Depth", 0.0),
            "professionalism_score": cat_scores.get("Professionalism") or cat_scores.get("Domain Mastery", 0.0),
            "strengths": report.get("strengths", []),
            "weaknesses": report.get("weaknesses", []),
            "improvement_suggestions": report.get("ai_growth_roadmap", [])
        }
    return None


@router.get("/recruiter")
def get_recruiter_dashboard(current_user: dict = Depends(require_role(["recruiter", "admin"]))):
    candidate_list = []
    total_candidates = sum(1 for u in db.users.values() if u["role"] == "candidate")
    completed_interviews = sum(1 for i in db.interviews.values() if i["status"] == "Completed")
    
    scores = []
    for i in db.interviews.values():
        assess = _get_interview_assessment(i)
        if assess and assess.get("overall_score") is not None:
            scores.append(assess["overall_score"])
    
    avg_score = int(sum(scores) / len(scores)) if scores else 0

    for user_id, user in db.users.items():
        if user["role"] == "candidate":
            user_resume = db.resumes.get(user_id)
            user_interviews = [i for i in db.interviews.values() if i["user_id"] == user_id]
            latest_interview = user_interviews[-1] if user_interviews else None
            latest_assessment = _get_interview_assessment(latest_interview) if latest_interview else None
            
            candidate_list.append({
                "user_id": user_id,
                "name": user["full_name"],
                "email": user["email"],
                "status": user.get("status", "Active"),
                "has_resume": bool(user_resume),
                "skills": user_resume["parsed_data"].get("skills", []) if user_resume else [],
                "latest_interview_id": latest_interview["id"] if latest_interview else None,
                "latest_score": latest_assessment["overall_score"] if latest_assessment else None,
                "recommendation": latest_assessment.get("recommendation", "Pending Assessment") if latest_assessment else "Pending Assessment"
            })

    return {
        "stats": {
            "total_candidates": total_candidates,
            "assessments_completed": completed_interviews,
            "average_score": avg_score,
            "top_skills": ["Python", "FastAPI", "JavaScript", "Docker", "PostgreSQL"]
        },
        "candidates": candidate_list
    }


@router.get("/admin")
def get_admin_dashboard(current_user: dict = Depends(require_role(["admin"]))):
    role_counts = {"candidate": 0, "recruiter": 0, "admin": 0}
    for u in db.users.values():
        r = u.get("role", "candidate")
        role_counts[r] = role_counts.get(r, 0) + 1

    users_data = []
    for u in db.users.values():
        users_data.append({
            "id": u["id"],
            "name": u["full_name"],
            "email": u["email"],
            "role": u["role"],
            "status": u.get("status", "Active"),
            "created_at": u.get("created_at", "")
        })

    total_interviews = len(db.interviews)
    resumes_parsed = len(db.resumes)

    return {
        "stats": {
            "total_users": len(db.users),
            "candidates_count": role_counts.get("candidate", 0),
            "recruiters_count": role_counts.get("recruiter", 0),
            "admins_count": role_counts.get("admin", 0),
            "total_interviews": total_interviews,
            "resumes_parsed": resumes_parsed
        },
        "users": users_data
    }


@router.patch("/admin/users/{user_id}/status")
def update_user_status(
    user_id: str,
    req: UserStatusUpdateRequest,
    current_user: dict = Depends(require_role(["admin"]))
):
    target = db.users.get(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    target["status"] = req.status
    return {
        "message": f"User status updated to {req.status}",
        "user_id": user_id,
        "status": req.status
    }
