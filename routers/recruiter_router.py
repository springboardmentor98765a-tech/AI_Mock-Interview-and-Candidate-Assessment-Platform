"""
Recruiter Dashboard & Talent Analytics Router
Exposes dedicated endpoints for Recruiter Portal:
- GET /api/recruiter/dashboard
- GET /api/recruiter/candidates
- GET /api/recruiter/candidates/{id}
- GET /api/recruiter/comparison
- GET /api/recruiter/skills
- GET /api/recruiter/ranking
- GET /api/recruiter/trends
- GET /api/recruiter/shortlisting
Strict RBAC: Only recruiter and admin roles can access.
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.auth import get_current_user, require_role
from backend.database import db
from backend.services.analytics_service import (
    get_filtered_interviews,
    calculate_performance_overview,
    calculate_skill_analytics,
    predict_weak_areas,
    calculate_performance_trends,
    calculate_candidate_rankings,
    compare_candidates,
    calculate_shortlisting_insights,
    get_performance_level,
    DEFAULT_RANKING_WEIGHTS
)

router = APIRouter(prefix="/api/recruiter", tags=["Recruiter Dashboard & Talent Analytics"])


@router.get("/dashboard")
def get_recruiter_dashboard_summary(
    current_user: dict = Depends(require_role(["recruiter", "admin"]))
):
    """
    Returns recruiter dashboard overview with KPI counters and accessible candidate list.
    """
    all_users = getattr(db, "users", {})
    all_interviews = getattr(db, "interviews", {})
    all_resumes = getattr(db, "resumes", {})

    total_candidates = sum(1 for u in all_users.values() if u.get("role") == "candidate")
    completed_interviews = sum(1 for i in all_interviews.values() if i.get("status") == "Completed")

    candidate_list = []
    all_scores = []
    top_skills_counter: Dict[str, int] = {}

    for user_id, user in all_users.items():
        if user.get("role") != "candidate":
            continue

        user_resume = all_resumes.get(user_id)
        parsed_skills = user_resume["parsed_data"].get("skills", []) if user_resume and "parsed_data" in user_resume else []
        for s in parsed_skills:
            top_skills_counter[s] = top_skills_counter.get(s, 0) + 1

        user_ints = [
            i for i in all_interviews.values()
            if i.get("user_id") == user_id and i.get("status") == "Completed" and (i.get("report") or i.get("id") in getattr(db, "assessments", {}))
        ]
        user_ints.sort(key=lambda x: x.get("created_at") or "")

        overview = calculate_performance_overview(user_ints)
        skills_res = calculate_skill_analytics(user_ints)

        if overview.get("average_score") is not None:
            all_scores.append(overview["average_score"])

        skills_list = skills_res.get("skills", [])
        strongest = skills_list[0]["skill_name"] if skills_list else "N/A"
        weakest = skills_list[-1]["skill_name"] if skills_list else "N/A"

        # Calculate authentic device monitoring alerts across candidate's sessions
        from backend.services.device_detection_service import device_detection_manager
        cand_alerts = 0
        for ui in user_ints:
            ui_id = ui.get("id")
            sess_id = ui.get("session_id")
            dev_trk = device_detection_manager.get_session(ui_id)
            if not dev_trk and sess_id:
                dev_trk = device_detection_manager.get_session(sess_id)
            if dev_trk:
                cand_alerts += dev_trk.total_alerts_count

        candidate_list.append({
            "candidate_id": user_id,
            "name": user.get("full_name") or "Candidate",
            "email": user.get("email"),
            "status": user.get("status", "Active"),
            "has_resume": bool(user_resume),
            "skills": parsed_skills,
            "interview_count": len(user_ints),
            "latest_interview": user_ints[-1].get("created_at") if user_ints else None,
            "latest_score": overview.get("latest_score"),
            "average_score": overview.get("average_score"),
            "performance_level": get_performance_level(overview.get("average_score")),
            "strongest_skill": strongest,
            "weakest_skill": weakest,
            "device_alerts_count": cand_alerts,
            "integrity_status": "Clean" if cand_alerts == 0 else f"Flagged ({cand_alerts} alert{'s' if cand_alerts > 1 else ''})",
            "has_data": overview.get("has_data", False)
        })

    avg_score = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0.0

    kpis = {
        "total_candidates": total_candidates,
        "total_interviews_completed": completed_interviews,
        "assessments_completed": completed_interviews,
        "average_benchmark_score": avg_score,
        "average_score": avg_score,
        "top_skills": sorted([k for k, _ in sorted(top_skills_counter.items(), key=lambda x: x[1], reverse=True)[:6]])
    }

    return {
        "kpis": kpis,
        "stats": kpis,
        "candidates": candidate_list
    }


@router.get("/candidates")
def get_recruiter_candidates(
    domain: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["recruiter", "admin"]))
):
    """
    Returns filterable, searchable list of accessible candidates for the recruiter.
    """
    all_users = getattr(db, "users", {})
    all_interviews = getattr(db, "interviews", {})
    all_resumes = getattr(db, "resumes", {})

    results = []
    for user_id, user in all_users.items():
        if user.get("role") != "candidate":
            continue

        if status_filter and status_filter.lower() != "all" and user.get("status", "Active").lower() != status_filter.lower():
            continue

        if search:
            q = search.lower().strip()
            name_match = q in (user.get("full_name") or "").lower()
            email_match = q in (user.get("email") or "").lower()
            if not (name_match or email_match):
                continue

        user_resume = all_resumes.get(user_id)
        parsed_skills = user_resume["parsed_data"].get("skills", []) if user_resume and "parsed_data" in user_resume else []

        user_ints = [
            i for i in all_interviews.values()
            if i.get("user_id") == user_id and i.get("status") == "Completed" and (i.get("report") or i.get("id") in getattr(db, "assessments", {}))
        ]

        if domain and domain.lower() != "all":
            user_ints = [i for i in user_ints if i.get("domain", "").lower() == domain.lower()]

        user_ints.sort(key=lambda x: x.get("created_at") or "")
        overview = calculate_performance_overview(user_ints)
        skills_res = calculate_skill_analytics(user_ints)

        skills_list = skills_res.get("skills", [])
        strongest = skills_list[0]["skill_name"] if skills_list else "N/A"
        weakest = skills_list[-1]["skill_name"] if skills_list else "N/A"

        results.append({
            "candidate_id": user_id,
            "name": user.get("full_name") or "Candidate",
            "email": user.get("email"),
            "status": user.get("status", "Active"),
            "created_at": user.get("created_at"),
            "skills": parsed_skills,
            "interview_count": len(user_ints),
            "latest_interview": user_ints[-1].get("created_at") if user_ints else None,
            "latest_score": overview.get("latest_score"),
            "average_score": overview.get("average_score"),
            "performance_level": get_performance_level(overview.get("average_score")),
            "strongest_skill": strongest,
            "weakest_skill": weakest,
            "has_data": overview.get("has_data", False)
        })

    return {"candidates": results, "count": len(results)}


@router.get("/candidates/{candidate_id}")
def get_candidate_dossier(
    candidate_id: str,
    current_user: dict = Depends(require_role(["recruiter", "admin"]))
):
    """
    Returns detailed candidate profile dossier: profile info, resume skills,
    full interview history, category scores, skill analytics, weak areas, and AI feedback.
    """
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
            "name": user.get("full_name") or "Candidate",
            "email": user.get("email"),
            "status": user.get("status", "Active"),
            "created_at": user.get("created_at"),
            "resume": resume["parsed_data"] if resume and "parsed_data" in resume else None
        },
        "performance_summary": overview,
        "category_breakdown": {
            "technical": overview.get("average_technical_score"),
            "communication": overview.get("average_communication_score"),
            "confidence": overview.get("average_confidence_score"),
            "professionalism": overview.get("average_professionalism_score")
        },
        "overview": overview,
        "skills": skills.get("skills", []),
        "weak_areas": weak_areas.get("weak_areas", []),
        "trends": trends,
        "interviews": [
            {
                "interview_id": i.get("id"),
                "domain": i.get("domain"),
                "difficulty": i.get("difficulty"),
                "type": i.get("type") or i.get("interview_type"),
                "date": i.get("created_at") or i.get("start_time"),
                "overall_score": i.get("report", {}).get("overall_score") or (db.assessments.get(i.get("id"), {}).get("overall_score")),
                "performance_level": get_performance_level(i.get("report", {}).get("overall_score") or (db.assessments.get(i.get("id"), {}).get("overall_score"))),
                "status": i.get("status", "Completed")
            }
            for i in interviews
        ]
    }


@router.get("/comparison")
def compare_selected_candidates(
    candidate_ids: List[str] = Query(..., description="Candidate user IDs (can be repeated or comma-separated)"),
    current_user: dict = Depends(require_role(["recruiter", "admin"]))
):
    """
    Returns side-by-side comparison matrix across multiple candidates using real database records.
    """
    id_list = []
    for item in candidate_ids:
        for cid in item.split(","):
            cid = cid.strip()
            if cid and cid not in id_list:
                id_list.append(cid)
    if not id_list:
        raise HTTPException(status_code=400, detail="Please provide at least one candidate ID to compare.")
    return compare_candidates(id_list)


@router.get("/skills")
def get_recruiter_skills_analytics(
    domain: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["recruiter", "admin"]))
):
    """
    Returns recruiter-level skill analytics calculated across all completed candidate interviews.
    """
    interviews = get_filtered_interviews(domain=domain)
    return calculate_skill_analytics(interviews)


@router.get("/ranking")
def get_recruiter_candidate_ranking(
    domain: Optional[str] = Query(None),
    sort_by: str = Query("rank"),
    sort_order: str = Query("asc"),
    current_user: dict = Depends(require_role(["recruiter", "admin"]))
):
    """
    Returns deterministic candidate rankings based on actual performance scores.
    Primary ranking: Overall score; Secondary tie-breakers: Technical, Communication, Confidence, Professionalism.
    """
    return calculate_candidate_rankings(
        domain=domain,
        sort_by=sort_by,
        sort_order=sort_order,
        weights=DEFAULT_RANKING_WEIGHTS
    )


@router.get("/trends")
def get_recruiter_performance_trends(
    period: str = Query("all"),
    domain: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["recruiter", "admin"]))
):
    """
    Returns aggregate performance trends across candidate assessments.
    """
    interviews = get_filtered_interviews(domain=domain)
    return calculate_performance_trends(interviews, period=period)


@router.get("/shortlisting")
def get_recruiter_shortlisting_insights(
    min_overall: float = Query(75.0, ge=0, le=100),
    min_technical: float = Query(70.0, ge=0, le=100),
    min_communication: float = Query(65.0, ge=0, le=100),
    domain: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["recruiter", "admin"]))
):
    """
    Returns data-driven shortlisting recommendations with configurable thresholds and transparent reasons.
    """
    return calculate_shortlisting_insights(
        min_overall_score=min_overall,
        min_technical_score=min_technical,
        min_communication_score=min_communication,
        domain=domain
    )
