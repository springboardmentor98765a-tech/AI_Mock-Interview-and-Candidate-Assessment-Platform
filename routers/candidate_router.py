"""
Candidate Dashboard & Analytics Router
Exposes dedicated endpoints for the Candidate Portal:
- GET /api/candidate/dashboard
- GET /api/candidate/interviews
- GET /api/candidate/performance
- GET /api/candidate/skills
- GET /api/candidate/trends
- GET /api/candidate/feedback
- GET /api/candidate/reports/{id}
Strict RBAC: Candidate users only have access to their own data.
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.auth import get_current_user, require_role
from backend.database import db
from backend.services.analytics_service import (
    get_filtered_interviews,
    calculate_performance_overview,
    get_paginated_interview_history,
    calculate_skill_analytics,
    predict_weak_areas,
    calculate_performance_trends,
    get_single_interview_breakdown,
    get_performance_level,
    DEFAULT_SCORE_WEIGHTS
)

router = APIRouter(prefix="/api/candidate", tags=["Candidate Dashboard & Analytics"])


@router.get("/dashboard")
def get_candidate_dashboard(
    domain: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns candidate dashboard summary: real calculated overall score, category score breakdown
    with weights (Communication 30%, Confidence 25%, Technical Relevance 30%, Professionalism 15%),
    performance level, latest completed interview date, top skills, weak areas, and latest feedback.
    """
    candidate_id = current_user["id"]
    interviews = get_filtered_interviews(candidate_id=candidate_id, domain=domain)
    completed_interviews = [
        i for i in interviews 
        if i.get("status") == "Completed" and (i.get("report") or i.get("id") in getattr(db, "assessments", {}))
    ]

    overview = calculate_performance_overview(interviews)
    skills = calculate_skill_analytics(interviews)
    weak_areas = predict_weak_areas(interviews)
    trends = calculate_performance_trends(interviews, period="all")

    latest_interview = completed_interviews[-1] if completed_interviews else None
    latest_breakdown = get_single_interview_breakdown(latest_interview["id"]) if latest_interview else None

    # Compare previous and latest interview scores if at least 2 completed
    previous_score = None
    latest_score = None
    score_delta = None
    if len(completed_interviews) >= 2:
        prev_breakdown = get_single_interview_breakdown(completed_interviews[-2]["id"])
        if prev_breakdown and latest_breakdown:
            previous_score = prev_breakdown.get("overall_score")
            latest_score = latest_breakdown.get("overall_score")
            if previous_score is not None and latest_score is not None:
                score_delta = round(latest_score - previous_score, 1)

    return {
        "role": "candidate",
        "candidate": {
            "id": current_user["id"],
            "name": current_user.get("full_name") or "Candidate",
            "email": current_user.get("email"),
            "status": current_user.get("status", "Active")
        },
        "performance_summary": {
            "has_data": overview.get("has_data", False),
            "average_score": overview.get("average_score"),
            "latest_score": overview.get("latest_score"),
            "highest_score": overview.get("highest_score"),
            "lowest_score": overview.get("lowest_score"),
            "completed_interviews": overview.get("completed_interviews", 0),
            "rating_level": get_performance_level(overview.get("average_score")),
            "recommendation": overview.get("recommendation", "Needs Improvement"),
            "score_improvement": overview.get("improvement_pct")
        },
        "category_breakdown": {
            "communication": overview.get("average_communication_score"),
            "confidence": overview.get("average_confidence_score"),
            "technical": overview.get("average_technical_score"),
            "professionalism": overview.get("average_professionalism_score")
        },
        "has_data": overview.get("has_data", False),
        "overall_score": overview.get("average_score"),
        "latest_score": overview.get("latest_score"),
        "performance_level": get_performance_level(overview.get("average_score")),
        "latest_interview_date": latest_interview.get("created_at") or latest_interview.get("start_time") if latest_interview else None,
        "score_weights": DEFAULT_SCORE_WEIGHTS,
        "category_scores": {
            "communication": {
                "score": overview.get("average_communication_score"),
                "weight_pct": 30,
                "weighted_contribution": round((overview.get("average_communication_score") or 0) * 0.30, 2),
                "performance_level": get_performance_level(overview.get("average_communication_score")),
                "explanation": "Evaluates articulation, grammar, fluency, pace and filler-word control."
            },
            "confidence": {
                "score": overview.get("average_confidence_score"),
                "weight_pct": 25,
                "weighted_contribution": round((overview.get("average_confidence_score") or 0) * 0.25, 2),
                "performance_level": get_performance_level(overview.get("average_confidence_score")),
                "explanation": "Evaluates eye contact, facial engagement, posture and speaking poise."
            },
            "technical_relevance": {
                "score": overview.get("average_technical_score"),
                "weight_pct": 30,
                "weighted_contribution": round((overview.get("average_technical_score") or 0) * 0.30, 2),
                "performance_level": get_performance_level(overview.get("average_technical_score")),
                "explanation": "Evaluates correctness of technical concepts, architectural depth and domain knowledge."
            },
            "professionalism": {
                "score": overview.get("average_professionalism_score"),
                "weight_pct": 15,
                "weighted_contribution": round((overview.get("average_professionalism_score") or 0) * 0.15, 2),
                "performance_level": get_performance_level(overview.get("average_professionalism_score")),
                "explanation": "Evaluates structured STAR response organization and time management."
            }
        },
        "overview": overview,
        "skills": skills,
        "weak_areas": weak_areas,
        "trends": trends,
        "latest_feedback": {
            "has_feedback": bool(latest_interview),
            "interview_id": latest_interview["id"] if latest_interview else None,
            "strengths": latest_breakdown.get("strengths", []) if latest_breakdown else [],
            "areas_for_improvement": latest_breakdown.get("weaknesses", []) if latest_breakdown else [],
            "recommendations": latest_breakdown.get("recommendations", []) if latest_breakdown else [],
            "previous_score": previous_score,
            "latest_score": latest_score,
            "score_delta": score_delta
        }
    }


@router.get("/interviews")
def get_candidate_interviews(
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
    Returns candidate's personal interview history with pagination, search, sorting and filtering.
    """
    interviews = get_filtered_interviews(
        candidate_id=current_user["id"],
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


@router.get("/performance")
def get_candidate_performance(
    domain: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns detailed multidimensional performance scores across all 4 pillars and weak areas.
    """
    interviews = get_filtered_interviews(candidate_id=current_user["id"], domain=domain)
    overview = calculate_performance_overview(interviews)
    skills = calculate_skill_analytics(interviews)
    weak_areas = predict_weak_areas(interviews)
    return {
        "has_data": overview.get("has_data", False),
        "overview": overview,
        "skills": skills,
        "weak_areas": weak_areas.get("weak_areas", []),
        "score_weights": DEFAULT_SCORE_WEIGHTS,
        "performance_level": get_performance_level(overview.get("average_score"))
    }


@router.get("/skills")
def get_candidate_skills(
    domain: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns skill-wise analytics extracted from candidate's actual interviews.
    """
    interviews = get_filtered_interviews(candidate_id=current_user["id"], domain=domain)
    return calculate_skill_analytics(interviews)


@router.get("/trends")
def get_candidate_trends(
    period: str = Query("all"),
    domain: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns historical time-series analytics for the candidate.
    """
    interviews = get_filtered_interviews(candidate_id=current_user["id"], domain=domain)
    return calculate_performance_trends(interviews, period=period)


@router.get("/feedback")
def get_candidate_feedback(
    current_user: dict = Depends(get_current_user)
):
    """
    Returns AI feedback, latest strengths, weaknesses, growth suggestions,
    and previous vs. latest interview improvement tracking.
    """
    interviews = get_filtered_interviews(candidate_id=current_user["id"])
    completed = [i for i in interviews if i.get("status") == "Completed" and (i.get("report") or i.get("id") in getattr(db, "assessments", {}))]
    
    if not completed:
        return {
            "has_data": False,
            "has_feedback": False,
            "message": "No completed interview evaluations available yet."
        }

    latest = completed[-1]
    latest_breakdown = get_single_interview_breakdown(latest["id"])

    previous_breakdown = None
    score_delta = None
    if len(completed) >= 2:
        previous_breakdown = get_single_interview_breakdown(completed[-2]["id"])
        if latest_breakdown and previous_breakdown:
            latest_score = latest_breakdown.get("overall_score")
            prev_score = previous_breakdown.get("overall_score")
            if latest_score is not None and prev_score is not None:
                score_delta = round(latest_score - prev_score, 1)

    strengths = latest_breakdown.get("strengths", []) if latest_breakdown else []
    weaknesses = latest_breakdown.get("weaknesses", []) if latest_breakdown else []
    recs = latest_breakdown.get("recommendations", []) if latest_breakdown else []

    return {
        "has_data": True,
        "has_feedback": True,
        "latest_interview_id": latest["id"],
        "latest_score": latest_breakdown.get("overall_score") if latest_breakdown else None,
        "performance_rating": latest_breakdown.get("performance_rating") if latest_breakdown else "Average",
        "recommendation": latest_breakdown.get("recommendation") if latest_breakdown else "Review",
        "strengths": strengths,
        "weaknesses": weaknesses,
        "areas_for_improvement": weaknesses,
        "recommendations": recs,
        "previous_interview_id": completed[-2]["id"] if len(completed) >= 2 else None,
        "previous_score": previous_breakdown.get("overall_score") if previous_breakdown else None,
        "score_delta": score_delta,
        "score_improvement_delta": score_delta
    }


@router.get("/reports/{interview_id}")
def get_candidate_report(
    interview_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns transparent score breakdown and report metadata for a specific interview.
    """
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")

    if current_user["role"] == "candidate" and interview.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied to this interview report.")

    breakdown = get_single_interview_breakdown(interview_id)
    if not breakdown:
        raise HTTPException(status_code=404, detail="Report unavailable for this interview.")

    from backend.services.device_detection_service import device_detection_manager
    dev_tracker = device_detection_manager.get_session(interview_id)
    if not dev_tracker and interview.get("session_id"):
        dev_tracker = device_detection_manager.get_session(interview.get("session_id"))

    breakdown["device_monitoring"] = dev_tracker.generate_summary_dict() if dev_tracker else {
        "session_id": interview_id,
        "total_alerts": 0,
        "detected_device_counts": {},
        "integrity_status": "Clean - No Prohibited Devices Detected",
        "events": []
    }

    return breakdown
