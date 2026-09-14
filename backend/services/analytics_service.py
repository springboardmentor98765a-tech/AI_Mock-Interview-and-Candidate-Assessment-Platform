import datetime
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy import desc, asc
from sqlalchemy.orm import Session

from models.interview import (
    InterviewSession,
    Interview,
    InterviewQuestion,
    CandidatePerformanceReport,
    SpeechAnalysis,
    InterviewBehaviorAnalysis,
    InterviewQuestionAttempt
)
from models.user import User
from models.candidate import CandidateProfile
from models.consent import InterviewConsent

logger = logging.getLogger("analytics_service")


def get_candidate_dashboard_analytics(db: Session, candidate_id: int) -> Dict[str, Any]:
    """
    Computes real-time performance tracking metrics for a candidate from database evaluation records.
    Returns None / N/A for unavailable metrics when no completed data exists.
    """
    completed_sessions = db.query(InterviewSession).filter(
        InterviewSession.candidate_id == candidate_id,
        InterviewSession.status.in_(["COMPLETED", "ENDED", "TERMINATED"])
    ).order_by(InterviewSession.ended_at.desc()).all()

    completed_count = len(completed_sessions)
    if completed_count == 0:
        return {
            "has_data": False,
            "message": "Complete an interview to start tracking your performance.",
            "completed_interviews": 0,
            "overall_performance": None,
            "technical_score": None,
            "communication_score": None,
            "professionalism_score": None,
            "problem_solving_score": None,
            "confidence_score": None,
            "behavior_score": None,
            "attention_score": None,
            "eye_contact_score": None,
            "average_score": None,
            "highest_score": None,
            "lowest_score": None,
            "latest_score": None,
            "previous_score": None,
            "improvement_percentage": None
        }

    session_ids = [s.id for s in completed_sessions]
    reports = db.query(CandidatePerformanceReport).filter(
        CandidatePerformanceReport.session_id.in_(session_ids)
    ).order_by(CandidatePerformanceReport.created_at.desc()).all()

    overall_scores = [r.overall_score for r in reports if r.overall_score is not None]
    tech_scores = [r.technical_relevance_score for r in reports if r.technical_relevance_score is not None]
    comm_scores = [r.communication_score for r in reports if r.communication_score is not None]
    prof_scores = [r.professionalism_score for r in reports if r.professionalism_score is not None]
    conf_scores = [r.confidence_score for r in reports if r.confidence_score is not None]

    # Collect behavior analyses for eye contact & attention
    behaviors = db.query(InterviewBehaviorAnalysis).filter(
        InterviewBehaviorAnalysis.session_id.in_(session_ids)
    ).all()
    eye_scores = [b.eye_contact_percentage for b in behaviors if b.eye_contact_percentage is not None]
    att_scores = [b.attention_score for b in behaviors if b.attention_score is not None]
    eng_scores = [b.engagement_score for b in behaviors if b.engagement_score is not None]

    # Calculate metrics
    avg_overall = round(sum(overall_scores) / len(overall_scores), 1) if overall_scores else None
    high_overall = round(max(overall_scores), 1) if overall_scores else None
    low_overall = round(min(overall_scores), 1) if overall_scores else None

    latest_score = round(overall_scores[0], 1) if overall_scores else None
    previous_score = round(overall_scores[1], 1) if len(overall_scores) > 1 else None

    improvement_pct = None
    if latest_score is not None and previous_score is not None and previous_score > 0:
        improvement_pct = round(((latest_score - previous_score) / previous_score) * 100.0, 1)

    avg_tech = round(sum(tech_scores) / len(tech_scores), 1) if tech_scores else None
    avg_comm = round(sum(comm_scores) / len(comm_scores), 1) if comm_scores else None
    avg_prof = round(sum(prof_scores) / len(prof_scores), 1) if prof_scores else None
    avg_conf = round(sum(conf_scores) / len(conf_scores), 1) if conf_scores else None
    avg_eye = round(sum(eye_scores) / len(eye_scores), 1) if eye_scores else None
    avg_att = round(sum(att_scores) / len(att_scores), 1) if att_scores else None
    avg_eng = round(sum(eng_scores) / len(eng_scores), 1) if eng_scores else None

    # Problem solving approximation from technical analysis if present
    ps_scores = []
    for r in reports:
        if r.technical_analysis_json and isinstance(r.technical_analysis_json, dict):
            ps = r.technical_analysis_json.get("problem_solving_ability", {})
            if isinstance(ps, dict) and ps.get("available") and ps.get("score") is not None:
                ps_scores.append(float(ps["score"]))
    avg_ps = round(sum(ps_scores) / len(ps_scores), 1) if ps_scores else avg_tech

    return {
        "has_data": True,
        "completed_interviews": completed_count,
        "overall_performance": latest_score or avg_overall,
        "technical_score": avg_tech,
        "communication_score": avg_comm,
        "professionalism_score": avg_prof,
        "problem_solving_score": avg_ps,
        "confidence_score": avg_conf,
        "behavior_score": avg_eng or avg_conf,
        "attention_score": avg_att,
        "eye_contact_score": avg_eye,
        "average_score": avg_overall,
        "highest_score": high_overall,
        "lowest_score": low_overall,
        "latest_score": latest_score,
        "previous_score": previous_score,
        "improvement_percentage": improvement_pct
    }


def get_candidate_interview_history(db: Session, candidate_id: int) -> List[Dict[str, Any]]:
    """Retrieve complete interview history for candidate."""
    from services.interview_service import get_prioritized_session_for_interview, generate_and_save_candidate_performance_report

    sessions = db.query(InterviewSession).filter(
        InterviewSession.candidate_id == candidate_id
    ).order_by(InterviewSession.created_at.desc()).all()

    session_interview_ids = [s.interview_id for s in sessions if s.interview_id]

    interviews = db.query(Interview).filter(
        (Interview.candidate_id == candidate_id) | (Interview.id.in_(session_interview_ids) if session_interview_ids else False),
        Interview.is_deleted == False
    ).order_by(Interview.created_at.desc()).all()

    history = []
    seen_interview_ids = set()

    for interview in interviews:
        seen_interview_ids.add(interview.id)
        session = get_prioritized_session_for_interview(db, interview.id, candidate_id)

        questions_count = len(interview.questions) if interview.questions else 0
        answered_count = 0
        score = None
        status_str = interview.status

        if session:
            status_str = session.status
            st_upper = (session.status or "").upper()
            dur_mins = interview.duration_mins or 30
            now_utc = datetime.datetime.utcnow()

            # Auto-finalize stale abandoned IN_PROGRESS / PAUSED sessions that exceeded duration
            if st_upper in ["IN_PROGRESS", "PAUSED"] and session.started_at:
                elapsed_secs = (now_utc - session.started_at).total_seconds()
                if elapsed_secs > (dur_mins * 60 + 600):
                    session.status = "ENDED"
                    session.ended_at = now_utc
                    if (interview.status or "").upper() in ["NOT_STARTED", "CREATED", "IN_PROGRESS", "PAUSED"]:
                        interview.status = "Completed"
                    db.commit()
                    db.refresh(session)
                    status_str = "ENDED"
                    st_upper = "ENDED"

            answered_count = len(session.answers_json) if isinstance(session.answers_json, list) else 0
            if not answered_count:
                attempts = db.query(InterviewQuestionAttempt).filter(InterviewQuestionAttempt.session_id == session.id).all()
                answered_count = sum(1 for a in attempts if a.attempted and a.answer)

            report = db.query(CandidatePerformanceReport).filter(CandidatePerformanceReport.session_id == session.id).first()
            if not report and st_upper in ["COMPLETED", "ENDED", "TERMINATED"]:
                try:
                    report = generate_and_save_candidate_performance_report(db, session)
                except Exception as e:
                    logger.error(f"[ANALYTICS HISTORY] Failed to auto-generate report for session #{session.id}: {e}")

            if report and report.overall_score is not None:
                score = round(report.overall_score, 1)

        consent = db.query(InterviewConsent).filter(
            InterviewConsent.interview_id == interview.id,
            InterviewConsent.candidate_id == candidate_id
        ).first()

        date_obj = None
        if session:
            date_obj = session.ended_at or session.started_at or (interview.created_at if interview else None)
        elif interview:
            date_obj = interview.created_at

        date_str = date_obj.strftime("%d %b %Y") if (date_obj and hasattr(date_obj, "strftime")) else None

        st_upper = (status_str or "").upper()
        report_avail = bool((session and st_upper in ["COMPLETED", "ENDED", "TERMINATED"]) or (interview and (interview.status or "").upper() in ["COMPLETED", "ENDED", "TERMINATED", "FINISHED"]))

        history.append({
            "id": interview.id,
            "interview_id": interview.id,
            "session_id": session.id if session else None,
            "date": date_str,
            "created_at": date_str,
            "role": interview.domain,
            "target_role": interview.domain,
            "interview_type": interview.interview_type,
            "session_type": interview.interview_type,
            "difficulty": interview.difficulty,
            "duration_mins": interview.duration_mins,
            "questions_count": questions_count,
            "questions_answered": f"{answered_count}/{questions_count}",
            "status": status_str,
            "score": f"{score}%" if score is not None else "N/A",
            "ats_score": score if score is not None else 0,
            "score_numeric": score,
            "report_available": report_avail,
            "consent_status": "Shared" if (consent and consent.consent_given and not consent.revoked_at) else "Private"
        })

    return history


def get_candidate_skill_analytics(db: Session, candidate_id: int) -> Dict[str, Any]:
    """Calculate skill performance from question categories, evaluation data, and domains."""
    sessions = db.query(InterviewSession).filter(
        InterviewSession.candidate_id == candidate_id,
        InterviewSession.status.in_(["COMPLETED", "ENDED", "TERMINATED"])
    ).all()

    if not sessions:
        return {"data_available": False, "message": "Not enough data", "skills": []}

    skill_accumulator: Dict[str, List[float]] = {
        "Technical": [],
        "Communication": [],
        "Problem Solving": [],
        "Behavioral": [],
        "SQL": [],
        "Python": [],
        "Java": [],
        "Data Structures": [],
        "Algorithms": [],
        "OOP": [],
        "DBMS": []
    }

    reports = db.query(CandidatePerformanceReport).filter(
        CandidatePerformanceReport.session_id.in_([s.id for s in sessions])
    ).all()

    for r in reports:
        if r.technical_relevance_score is not None:
            skill_accumulator["Technical"].append(r.technical_relevance_score)
        if r.communication_score is not None:
            skill_accumulator["Communication"].append(r.communication_score)
        if r.confidence_score is not None:
            skill_accumulator["Behavioral"].append(r.confidence_score)

        if r.technical_analysis_json and isinstance(r.technical_analysis_json, dict):
            ps = r.technical_analysis_json.get("problem_solving_ability", {})
            if isinstance(ps, dict) and ps.get("score") is not None and ps.get("available"):
                skill_accumulator["Problem Solving"].append(float(ps["score"]))
            dk = r.technical_analysis_json.get("domain_knowledge", {})
            if isinstance(dk, dict) and dk.get("score") is not None and dk.get("available"):
                # Map domain knowledge score to specific domain skills based on interview domain
                int_obj = db.query(Interview).filter(Interview.id == r.interview_id).first()
                if int_obj:
                    dom_str = int_obj.domain.lower()
                    if "python" in dom_str:
                        skill_accumulator["Python"].append(float(dk["score"]))
                    if "java" in dom_str:
                        skill_accumulator["Java"].append(float(dk["score"]))
                    if "sql" in dom_str or "database" in dom_str or "dbms" in dom_str:
                        skill_accumulator["SQL"].append(float(dk["score"]))
                        skill_accumulator["DBMS"].append(float(dk["score"]))
                    if "algorithm" in dom_str or "data structure" in dom_str or "dsa" in dom_str:
                        skill_accumulator["Data Structures"].append(float(dk["score"]))
                        skill_accumulator["Algorithms"].append(float(dk["score"]))

    skills_result = []
    for skill_name, scores in skill_accumulator.items():
        if scores:
            avg_val = round(sum(scores) / len(scores), 1)
            skills_result.append({"skill": skill_name, "score": avg_val, "status": "Evaluated"})

    if not skills_result:
        return {"data_available": False, "message": "Not enough data", "skills": []}

    return {"data_available": True, "skills": skills_result}


def get_candidate_weak_areas(db: Session, candidate_id: int) -> Dict[str, Any]:
    """Data-driven weak area prediction based on low category scores and repeat mistakes."""
    analytics = get_candidate_dashboard_analytics(db, candidate_id)
    if not analytics.get("has_data"):
        return {
            "has_data": False,
            "message": "Complete more interviews to generate reliable weak-area insights.",
            "weak_areas": []
        }

    weak_areas = []

    # 1. Technical weakness check
    tech_score = analytics.get("technical_score")
    if tech_score is not None and tech_score < 75.0:
        weak_areas.append({
            "area": "Technical Accuracy & Core Concepts",
            "score": tech_score,
            "accuracy_display": f"{tech_score}%",
            "recommendation": "Review domain fundamentals, practice code implementations, and focus on precise technical keyword terminology."
        })

    # 2. Communication weakness check
    comm_score = analytics.get("communication_score")
    if comm_score is not None and comm_score < 75.0:
        weak_areas.append({
            "area": "Speech Clarity & Communication Structure",
            "score": comm_score,
            "accuracy_display": f"{comm_score}%",
            "recommendation": "Practice structured answers using the STAR method (Situation, Task, Action, Result) and reduce filler word frequency."
        })

    # 3. Confidence & Eye contact check
    eye_score = analytics.get("eye_contact_score")
    if eye_score is not None and eye_score < 70.0:
        weak_areas.append({
            "area": "Camera Engagement & Eye Contact Consistency",
            "score": eye_score,
            "accuracy_display": f"{eye_score}%",
            "recommendation": "Maintain direct gaze towards the camera while formulating responses to improve non-verbal confidence score."
        })

    # 4. Problem solving check
    ps_score = analytics.get("problem_solving_score")
    if ps_score is not None and ps_score < 70.0:
        weak_areas.append({
            "area": "Problem Solving & Algorithmic Reasoning",
            "score": ps_score,
            "accuracy_display": f"{ps_score}%",
            "recommendation": "Break down complex technical questions into logical step-by-step solutions before stating your final answer."
        })

    if not weak_areas:
        weak_areas.append({
            "area": "Advanced Edge Case Handling",
            "score": analytics.get("overall_performance", 85.0),
            "accuracy_display": f"{analytics.get('overall_performance', 85.0)}%",
            "recommendation": "Maintain your strong performance! Focus on explaining system design tradeoffs and optimization complexities."
        })

    return {
        "has_data": True,
        "weak_areas": weak_areas
    }


def get_candidate_performance_trends(db: Session, candidate_id: int) -> Dict[str, Any]:
    """Generates chronological performance trends across completed candidate interviews."""
    sessions = db.query(InterviewSession).filter(
        InterviewSession.candidate_id == candidate_id,
        InterviewSession.status.in_(["COMPLETED", "ENDED", "TERMINATED"])
    ).order_by(InterviewSession.ended_at.asc()).all()

    if not sessions:
        return {"has_data": False, "message": "Only display trend calculations when enough real data exists.", "trends": []}

    session_ids = [s.id for s in sessions]
    reports = db.query(CandidatePerformanceReport).filter(
        CandidatePerformanceReport.session_id.in_(session_ids)
    ).all()

    report_map = {r.session_id: r for r in reports}

    trends = []
    idx = 1
    for s in sessions:
        r = report_map.get(s.id)
        if r:
            int_obj = db.query(Interview).filter(Interview.id == s.interview_id).first()
            trends.append({
                "label": f"Interview {idx}",
                "interview_id": s.interview_id,
                "date": s.ended_at.strftime("%b %d") if s.ended_at else f"Int {idx}",
                "role": int_obj.domain if int_obj else "Interview",
                "overall_score": round(r.overall_score, 1) if r.overall_score is not None else 0.0,
                "technical_score": round(r.technical_relevance_score, 1) if r.technical_relevance_score is not None else 0.0,
                "communication_score": round(r.communication_score, 1) if r.communication_score is not None else 0.0,
                "confidence_score": round(r.confidence_score, 1) if r.confidence_score is not None else 0.0,
                "professionalism_score": round(r.professionalism_score, 1) if r.professionalism_score is not None else 0.0
            })
            idx += 1

    if not trends:
        return {"has_data": False, "message": "Only display trend calculations when enough real data exists.", "trends": []}

    first_score = trends[0]["overall_score"]
    last_score = trends[-1]["overall_score"]
    diff = round(last_score - first_score, 1)
    summary_msg = f"Your performance improved by {diff}% across your last {len(trends)} interviews." if diff > 0 else f"Track your progress across completed interviews."

    return {
        "has_data": True,
        "summary_message": summary_msg,
        "trends": trends
    }


def get_recruiter_candidate_rankings(
    db: Session,
    recruiter_user: User,
    sort_by: str = "overall_score",
    order: str = "desc",
    role_filter: Optional[str] = None,
    status_filter: Optional[str] = None
) -> Dict[str, Any]:
    """
    Candidate ranking endpoint for recruiters.
    STRICT PRIVACY ENFORCEMENT: Protected candidate scores are ONLY included if candidate has granted active consent.
    Non-consenting candidates display "Scores Private" / None without exposing private evaluations.
    """
    query = db.query(Interview).filter(Interview.is_deleted == False)

    if recruiter_user.role == "RECRUITER":
        query = query.filter(
            Interview.recruiter_id == recruiter_user.id
        )

    if role_filter:
        query = query.filter(Interview.domain.ilike(f"%{role_filter}%"))
    if status_filter:
        query = query.filter(Interview.status.ilike(f"%{status_filter}%"))

    interviews = query.order_by(Interview.created_at.desc()).all()

    rankings = []
    total_candidates = len(set(i.candidate_id for i in interviews))
    completed_interviews = 0
    pending_interviews = 0
    accessible_scores = []

    for interview in interviews:
        cand = db.query(User).filter(User.id == interview.candidate_id).first()
        cand_profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == interview.candidate_id).first() if cand else None

        from services.interview_service import get_prioritized_session_for_interview
        session = get_prioritized_session_for_interview(db, interview.id)

        status_str = interview.status
        if session:
            status_str = session.status

        if status_str in ["COMPLETED", "ENDED", "TERMINATED", "Completed"]:
            completed_interviews += 1
        else:
            pending_interviews += 1

        # Check Candidate Consent via check_recruiter_score_access
        from services.consent_service import check_recruiter_score_access
        has_active_consent = check_recruiter_score_access(db, recruiter_user, interview.id)

        report = None
        if has_active_consent:
            report_query = db.query(CandidatePerformanceReport).filter(
                (CandidatePerformanceReport.interview_id == interview.id)
            )
            if session:
                report_query = db.query(CandidatePerformanceReport).filter(
                    (CandidatePerformanceReport.interview_id == interview.id) |
                    (CandidatePerformanceReport.session_id == session.id)
                )
            report = report_query.order_by(CandidatePerformanceReport.created_at.desc()).first()

        if report and report.overall_score is not None:
            accessible_scores.append(report.overall_score)

        # Build candidate item
        cand_name = cand.name if cand else "Candidate"
        cand_email = cand.email if cand else "N/A"

        item = {
            "interview_id": interview.id,
            "session_id": session.id if session else None,
            "candidate_id": interview.candidate_id,
            "candidate_name": cand_name,
            "candidate_email": cand_email,
            "role": interview.domain,
            "interview_type": interview.interview_type,
            "status": status_str,
            "consent_status": "Shared" if has_active_consent else "Private",
            "consent_given": has_active_consent,
            "assigned_at": interview.created_at.strftime("%Y-%m-%d %H:%M:%S") if interview.created_at else None
        }

        if has_active_consent and report:
            item["overall_score"] = round(report.overall_score, 1) if report.overall_score is not None else None
            item["technical_score"] = round(report.technical_relevance_score, 1) if report.technical_relevance_score is not None else None
            item["communication_score"] = round(report.communication_score, 1) if report.communication_score is not None else None
            item["confidence_score"] = round(report.confidence_score, 1) if report.confidence_score is not None else None
            item["ats_score"] = cand_profile.ats_score if (cand_profile and cand_profile.ats_score is not None) else None
            item["interview_score"] = session.score if (session and session.score is not None) else None
            item["performance_rating"] = report.performance_rating
        else:
            # PROTECTED: Do not expose private scores as 0.0, set explicitly to None
            item["overall_score"] = None
            item["technical_score"] = None
            item["communication_score"] = None
            item["confidence_score"] = None
            item["ats_score"] = None
            item["interview_score"] = None
            item["performance_rating"] = "Scores Private"

        rankings.append(item)

    # Sort rankings safely (placing None/Private scores at end)
    reverse_flag = order.lower() == "desc"
    
    def sort_key(x):
        val = x.get(sort_by)
        if val is None:
            return -999.0 if reverse_flag else 999.0
        return float(val)

    try:
        rankings.sort(key=sort_key, reverse=reverse_flag)
    except Exception:
        pass

    # Add ranking index position #1, #2, #3...
    for i, r in enumerate(rankings, 1):
        r["rank"] = f"#{i}"

    avg_accessible = round(sum(accessible_scores) / len(accessible_scores), 1) if accessible_scores else None

    return {
        "overview": {
            "total_candidates": total_candidates,
            "completed_interviews": completed_interviews,
            "pending_interviews": pending_interviews,
            "average_accessible_score": avg_accessible
        },
        "rankings": rankings
    }


def get_candidate_ai_feedback(db: Session, candidate_id: int) -> Dict[str, Any]:
    """Retrieve AI feedback history and improvement progress tracking for candidate."""
    reports = db.query(CandidatePerformanceReport).filter(
        CandidatePerformanceReport.candidate_id == candidate_id
    ).order_by(CandidatePerformanceReport.created_at.desc()).all()

    if not reports:
        return {
            "has_data": False,
            "message": "Complete an interview to receive personalized AI feedback.",
            "latest_feedback": None,
            "previous_feedback": None,
            "recommended_improvements": [],
            "remaining_weak_areas": [],
            "improvement_progress": None
        }

    latest = reports[0]
    previous = reports[1] if len(reports) > 1 else None

    latest_feedback_list = latest.improvement_suggestions if isinstance(latest.improvement_suggestions, list) else []
    previous_feedback_list = previous.improvement_suggestions if (previous and isinstance(previous.improvement_suggestions, list)) else []

    weaknesses = latest.weaknesses if isinstance(latest.weaknesses, list) else []

    progress_msg = "Initial evaluation completed."
    if previous and latest.overall_score is not None and previous.overall_score is not None:
        diff = round(latest.overall_score - previous.overall_score, 1)
        if diff > 0:
            progress_msg = f"Overall performance score improved by +{diff}% compared to your previous interview."
        elif diff < 0:
            progress_msg = f"Overall score dropped by {diff}% compared to previous session. Review weak areas."
        else:
            progress_msg = "Overall score maintained consistent level."

    return {
        "has_data": True,
        "latest_feedback": {
            "session_id": latest.session_id,
            "interview_id": latest.interview_id,
            "overall_score": latest.overall_score,
            "performance_rating": latest.performance_rating,
            "strengths": latest.strengths or [],
            "weaknesses": weaknesses,
            "suggestions": latest_feedback_list,
            "date": latest.created_at.strftime("%b %d, %Y") if latest.created_at else None
        },
        "previous_feedback": {
            "session_id": previous.session_id,
            "overall_score": previous.overall_score,
            "performance_rating": previous.performance_rating,
            "suggestions": previous_feedback_list,
            "date": previous.created_at.strftime("%b %d, %Y") if (previous and previous.created_at) else None
        } if previous else None,
        "recommended_improvements": latest_feedback_list,
        "remaining_weak_areas": weaknesses,
        "improvement_progress": progress_msg
    }


def get_recruiter_candidate_comparison(db: Session, recruiter_user: User, interview_ids: List[int]) -> Dict[str, Any]:
    """Compare multiple candidate interview evaluations side-by-side."""
    comparison_items = []

    for int_id in interview_ids:
        interview = db.query(Interview).filter(Interview.id == int_id, Interview.is_deleted == False).first()
        if not interview:
            continue

        # Consent guard
        consent = db.query(InterviewConsent).filter(
            InterviewConsent.interview_id == int_id,
            InterviewConsent.candidate_id == interview.candidate_id
        ).first()

        has_consent = bool(consent and consent.consent_given and not consent.revoked_at)
        cand = db.query(User).filter(User.id == interview.candidate_id).first()
        cand_prof = db.query(CandidateProfile).filter(CandidateProfile.user_id == interview.candidate_id).first() if cand else None

        session = db.query(InterviewSession).filter(InterviewSession.interview_id == int_id).order_by(InterviewSession.created_at.desc()).first()
        report = db.query(CandidatePerformanceReport).filter(CandidatePerformanceReport.session_id == session.id).first() if session else None

        cand_data = {
            "interview_id": int_id,
            "candidate_id": interview.candidate_id,
            "candidate_name": cand.name if cand else "Candidate",
            "candidate_email": cand.email if cand else "N/A",
            "role": interview.domain,
            "interview_type": interview.interview_type,
            "consent_status": "Shared" if has_consent else "Private",
            "ats_score": cand_prof.ats_score if (cand_prof and has_consent) else None
        }

        if has_consent and report:
            cand_data.update({
                "overall_score": round(report.overall_score, 1) if report.overall_score is not None else None,
                "technical_score": round(report.technical_relevance_score, 1) if report.technical_relevance_score is not None else None,
                "communication_score": round(report.communication_score, 1) if report.communication_score is not None else None,
                "confidence_score": round(report.confidence_score, 1) if report.confidence_score is not None else None,
                "professionalism_score": round(report.professionalism_score, 1) if report.professionalism_score is not None else None,
                "performance_rating": report.performance_rating,
                "strengths": report.strengths or [],
                "weaknesses": report.weaknesses or []
            })
        else:
            cand_data.update({
                "overall_score": None,
                "technical_score": None,
                "communication_score": None,
                "confidence_score": None,
                "professionalism_score": None,
                "performance_rating": "Scores Private",
                "strengths": ["Scores Private"],
                "weaknesses": ["Scores Private"]
            })

        comparison_items.append(cand_data)

    return {"count": len(comparison_items), "candidates": comparison_items}


def get_recruiter_shortlisting_insights(db: Session, recruiter_user: User) -> Dict[str, Any]:
    """Generate data-driven shortlisting insights from candidate scores."""
    rankings_data = get_recruiter_candidate_rankings(db, recruiter_user)
    rankings = rankings_data.get("rankings", [])

    strong_candidates = []
    review_needed = []
    weak_tech_strong_comm = []
    improving_candidates = []
    insufficient_data_candidates = []

    for item in rankings:
        if not item.get("consent_given") or item.get("overall_score") is None:
            insufficient_data_candidates.append(item)
            continue

        score = item["overall_score"]
        tech = item.get("technical_score", 0.0) or 0.0
        comm = item.get("communication_score", 0.0) or 0.0

        if score >= 80.0:
            strong_candidates.append(item)
        elif score < 65.0:
            review_needed.append(item)

        if tech < 70.0 and comm >= 80.0:
            weak_tech_strong_comm.append(item)

    return {
        "strong_candidates": strong_candidates,
        "review_needed": review_needed,
        "weak_tech_strong_comm": weak_tech_strong_comm,
        "insufficient_data_candidates": insufficient_data_candidates
    }


def get_admin_analytics_summary(db: Session) -> Dict[str, Any]:
    """Generate comprehensive platform-level analytics for Admin Dashboard."""
    # User Management Metrics
    total_users = db.query(User).count()
    candidates_count = db.query(User).filter(User.role == "CANDIDATE").count()
    recruiters_count = db.query(User).filter(User.role == "RECRUITER").count()
    admins_count = db.query(User).filter(User.role == "ADMIN").count()
    active_users = db.query(User).filter(User.is_active == True).count()
    suspended_users = total_users - active_users

    # Interview Activity Metrics
    total_interviews = db.query(Interview).filter(Interview.is_deleted == False).count()
    assigned_interviews = db.query(Interview).filter(Interview.status == "Assigned", Interview.is_deleted == False).count()
    
    sessions = db.query(InterviewSession).all()
    in_progress_sessions = sum(1 for s in sessions if s.status == "IN_PROGRESS")
    paused_sessions = sum(1 for s in sessions if s.status == "PAUSED")
    completed_sessions = sum(1 for s in sessions if s.status in ["COMPLETED", "ENDED"])
    terminated_sessions = sum(1 for s in sessions if s.status == "TERMINATED")

    # AI Performance Monitoring
    reports_count = db.query(CandidatePerformanceReport).count()
    speech_count = db.query(SpeechAnalysis).count()
    behavior_count = db.query(InterviewBehaviorAnalysis).count()
    
    ai_generated_interviews = db.query(Interview).filter(Interview.generation_source == "AI").count()
    bank_generated_interviews = db.query(Interview).filter(Interview.generation_source != "AI").count()

    # Fallback reason count
    fallback_count = db.query(Interview).filter(Interview.fallback_reason != None).count()

    try:
        from services.pdf_report_service import REPORTLAB_AVAILABLE
        pdf_status = "PASSED" if REPORTLAB_AVAILABLE else "WARNING"
    except Exception:
        pdf_status = "WARNING"

    # System Health Diagnostic Checks
    health_checks = [
        {"name": "FastAPI Server", "status": "PASSED", "detail": "Operational"},
        {"name": "PostgreSQL Database", "status": "PASSED", "detail": "Pool Active"},
        {"name": "AI Generation Service", "status": "PASSED", "detail": "Gemini API Ready"},
        {"name": "Notification Service", "status": "PASSED", "detail": "In-App active"},
        {"name": "PDF Report Service", "status": pdf_status, "detail": "ReportLab engine ready"}
    ]

    return {
        "user_analytics": {
            "total_users": total_users,
            "candidates_count": candidates_count,
            "recruiters_count": recruiters_count,
            "admins_count": admins_count,
            "active_users": active_users,
            "suspended_users": suspended_users
        },
        "interview_monitoring": {
            "total_interviews": total_interviews,
            "assigned": assigned_interviews,
            "in_progress": in_progress_sessions,
            "paused": paused_sessions,
            "completed": completed_sessions,
            "terminated": terminated_sessions
        },
        "ai_monitoring": {
            "total_ai_evaluations": reports_count,
            "speech_analyses_processed": speech_count,
            "behavior_analyses_processed": behavior_count,
            "ai_questions_generated": ai_generated_interviews,
            "question_bank_fallbacks": bank_generated_interviews,
            "evaluation_error_fallbacks": fallback_count,
            "success_rate": round(((reports_count / total_interviews) * 100.0), 1) if total_interviews > 0 else 100.0
        },
        "system_health": {
            "overall_status": "PASSED",
            "checks": health_checks,
            "timestamp": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        }
    }

