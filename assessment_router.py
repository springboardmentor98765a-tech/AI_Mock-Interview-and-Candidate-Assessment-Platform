"""
Assessment Router Module
FastAPI endpoints for generating, retrieving, and regenerating comprehensive
AI Feedback & Scoring Assessments for candidate interview sessions.
"""

import uuid
import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from backend.auth import get_current_user, get_optional_user, require_role
from backend.database import db
from backend.models.assessment_models import AssessmentReport
from backend.services.scoring_service import (
    compute_technical_relevance,
    compute_communication_score_module,
    compute_confidence_score_module,
    compute_professionalism_score_module,
    calculate_overall_assessment_scores
)
from backend.services.feedback_service import generate_assessment_feedback
from backend.services.behavior_tracker import behavior_manager

router = APIRouter(
    tags=["AI Assessment, Scoring & Dynamic Feedback"]
)


def _build_or_regenerate_assessment(interview_id: str, current_user: Optional[Dict[str, Any]] = None) -> AssessmentReport:
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail=f"Interview session '{interview_id}' not found.")

    # Authorization check
    if current_user and current_user.get("role") == "candidate":
        if interview.get("user_id") != current_user.get("id"):
            raise HTTPException(status_code=403, detail="Access denied to this interview assessment.")

    questions = interview.get("questions", [])
    domain = interview.get("domain", "Full Stack")
    difficulty = interview.get("difficulty", "Medium")
    candidate_id = interview.get("user_id", "candidate_demo")
    candidate_name = interview.get("candidate_name", "Candidate")
    duration_seconds = float(interview.get("duration_seconds", 0))
    question_times = interview.get("question_times", {})

    # Extract all candidate answer texts
    candidate_answers = [q.get("user_answer", "") for q in questions if q.get("user_answer")]
    combined_transcript = " ".join(candidate_answers).strip()

    # Fetch associated speech analysis data if available
    speech_session_data = None
    for sess_id, sess_obj in getattr(db, "speech_sessions", {}).items():
        if sess_obj.get("question_id") == interview_id or sess_id == interview_id:
            speech_session_data = sess_obj
            break

    # Fetch associated video behavior report if available
    video_session_report = None
    sess_tracker = behavior_manager.get_session(interview_id)
    if not sess_tracker:
        sess_tracker = behavior_manager.get_session(interview.get("session_id", ""))
    if sess_tracker:
        video_session_report = sess_tracker.generate_behavior_report()

    # 1. Evaluate Technical Relevance (30% weight)
    tech_breakdown, question_evaluations = compute_technical_relevance(
        questions=questions,
        domain=domain,
        difficulty=difficulty
    )

    # 2. Evaluate Communication (30% weight)
    comm_breakdown = compute_communication_score_module(
        transcript=combined_transcript,
        duration_seconds=duration_seconds,
        speech_session_data=speech_session_data,
        candidate_answers=candidate_answers
    )

    # 3. Evaluate Confidence (25% weight)
    conf_breakdown = compute_confidence_score_module(
        video_session_report=video_session_report,
        speech_breakdown=comm_breakdown,
        session_duration=duration_seconds
    )

    # 4. Evaluate Professionalism (15% weight)
    prof_breakdown = compute_professionalism_score_module(
        total_duration_seconds=duration_seconds,
        question_times=question_times,
        candidate_answers=candidate_answers,
        speech_breakdown=comm_breakdown,
        questions_count=len(questions)
    )

    # 5. Calculate Final Overall Score & Performance Rating
    overall_score, rating, recommendation = calculate_overall_assessment_scores(
        communication=comm_breakdown,
        confidence=conf_breakdown,
        technical=tech_breakdown,
        professionalism=prof_breakdown
    )

    # 6. Synthesize Dynamic Personalized Feedback & Evidence
    feedback_bundle = generate_assessment_feedback(
        communication=comm_breakdown,
        confidence=conf_breakdown,
        technical=tech_breakdown,
        professionalism=prof_breakdown,
        overall_score=overall_score,
        performance_rating=rating,
        question_evaluations=question_evaluations,
        domain=domain
    )

    # 7. Construct Complete Assessment Entity
    assessment_id = f"assess_{uuid.uuid4().hex[:10]}"
    now_iso = datetime.datetime.now().isoformat()

    assessment_obj = AssessmentReport(
        assessment_id=assessment_id,
        interview_id=interview_id,
        candidate_id=candidate_id,
        candidate_name=candidate_name,
        domain=domain,
        difficulty=difficulty,
        interview_type=interview.get("type", "Technical"),
        communication_score=comm_breakdown.score,
        confidence_score=conf_breakdown.score,
        technical_relevance_score=tech_breakdown.score,
        professionalism_score=prof_breakdown.score,
        overall_score=overall_score,
        performance_rating=rating,
        recommendation=recommendation,
        communication=comm_breakdown,
        confidence=conf_breakdown,
        technical_relevance=tech_breakdown,
        professionalism=prof_breakdown,
        question_evaluations=question_evaluations,
        strengths=feedback_bundle["strengths"],
        weaknesses=feedback_bundle["weaknesses"],
        improvement_suggestions=feedback_bundle["improvement_suggestions"],
        practice_recommendations=feedback_bundle["practice_recommendations"],
        learning_resources=feedback_bundle["learning_resources"],
        evidence=feedback_bundle["evidence"],
        duration_seconds=int(duration_seconds),
        questions_attempted=len([q for q in questions if q.get("user_answer")]),
        total_questions=len(questions),
        video_analysis_available=conf_breakdown.video_analysis_available,
        speech_analysis_available=bool(combined_transcript),
        created_at=now_iso,
        updated_at=now_iso
    )

    # Save to in-memory db
    db.assessments[interview_id] = assessment_obj.model_dump()
    db.assessments[assessment_id] = db.assessments[interview_id]

    # Sync back to interview object for legacy consumers
    interview["report"] = {
        "overall_score": overall_score,
        "performance_rating": rating,
        "recommendation": recommendation,
        "category_scores": {
            "Communication": comm_breakdown.score,
            "Confidence": conf_breakdown.score,
            "Technical Relevance": tech_breakdown.score,
            "Professionalism": prof_breakdown.score
        },
        "strengths": feedback_bundle["strengths"],
        "weaknesses": feedback_bundle["weaknesses"],
        "ai_growth_roadmap": feedback_bundle["improvement_suggestions"]
    }

    return assessment_obj


# ==============================================================================
# Route Endpoints with both singular and plural aliases
# ==============================================================================

@router.post("/api/interviews/{interview_id}/assessment", response_model=AssessmentReport)
@router.post("/api/interview/{interview_id}/assessment", response_model=AssessmentReport)
def generate_interview_assessment(
    interview_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """
    Generates and persists a comprehensive AI Feedback & Scoring Assessment
    derived from real candidate interview session telemetry.
    """
    return _build_or_regenerate_assessment(interview_id, current_user)


@router.get("/api/interviews/{interview_id}/assessment", response_model=AssessmentReport)
@router.get("/api/interview/{interview_id}/assessment", response_model=AssessmentReport)
def get_interview_assessment(
    interview_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """
    Retrieves the saved assessment report for a completed interview.
    Generates dynamic evaluation if not already stored.
    """
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail=f"Interview session '{interview_id}' not found.")

    if current_user and current_user.get("role") == "candidate":
        if interview.get("user_id") != current_user.get("id"):
            raise HTTPException(status_code=403, detail="Access denied to this interview assessment.")

    saved = db.assessments.get(interview_id)
    if saved:
        return saved

    # Auto-generate if missing
    return _build_or_regenerate_assessment(interview_id, current_user)


@router.post("/api/interviews/{interview_id}/assessment/regenerate", response_model=AssessmentReport)
@router.post("/api/interview/{interview_id}/assessment/regenerate", response_model=AssessmentReport)
def regenerate_interview_assessment(
    interview_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """
    Explicitly recalculates and updates the saved assessment with latest session data.
    """
    return _build_or_regenerate_assessment(interview_id, current_user)
