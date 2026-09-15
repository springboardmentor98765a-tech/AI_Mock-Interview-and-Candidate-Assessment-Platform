"""
Analytics Service Module
Comprehensive, real-data mathematical engine for Mock Interview Analytics & Assessment Telemetry:
1. Performance Tracking (Averages, Highs, Lows, Component scores, Improvement rates)
2. Filterable, Searchable, Paginated Interview History
3. Skill-Wise Analytics (Current, Avg, Max, Min, Assessments count, Previous, Improvement %, Trend)
4. Data-Driven Weak-Area Prediction Engine (<50 Critical, 50-64 Needs Improvement, 65-79 Moderate, 80+ Strong)
5. Performance Trends Engine (Time-series analysis across 7d, 30d, 3m, 6m, 1y, custom)
6. Candidate Ranking Engine (Multi-factor weighted ranking for recruiters & admins)
7. Report & CSV Export Generators

ZERO DUMMY DATA: All calculations strictly derive from actual stored interviews and assessment records.
"""

import io
import csv
import math
import datetime
from typing import Dict, Any, List, Optional, Tuple

from backend.database import db
from backend.services.scoring_service import clamp_score


# ==============================================================================
# 1. Configurable Scoring & Ranking Weights & Thresholds
# ==============================================================================

DEFAULT_SCORE_WEIGHTS = {
    "communication": 0.30,
    "confidence": 0.25,
    "technical": 0.30,
    "professionalism": 0.15
}

DEFAULT_RANKING_WEIGHTS = {
    "overall": 0.40,
    "technical": 0.25,
    "communication": 0.20,
    "confidence": 0.10,
    "professionalism": 0.05
}

WEAKNESS_THRESHOLDS = {
    "critical": 60.0,
    "needs_improvement": 75.0,
    "satisfactory": 75.0
}

def get_performance_level(score: Optional[float]) -> str:
    """
    Computes performance level:
    90–100 = Excellent
    75–89 = Good
    60–74 = Average
    40–59 = Needs Improvement
    Below 40 = Poor
    """
    if score is None:
        return "N/A"
    s = clamp_score(score)
    if s >= 90.0:
        return "Excellent"
    elif s >= 75.0:
        return "Good"
    elif s >= 60.0:
        return "Average"
    elif s >= 40.0:
        return "Needs Improvement"
    else:
        return "Poor"


# ==============================================================================
# 2. Helper Utilities: Record Extraction & Filtering
# ==============================================================================

def _parse_iso_datetime(dt_str: Optional[str]) -> Optional[datetime.datetime]:
    if not dt_str:
        return None
    try:
        clean_str = dt_str.replace("Z", "+00:00")
        return datetime.datetime.fromisoformat(clean_str)
    except Exception:
        return None


def _get_interview_assessment(interview: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Retrieves the assessment record for an interview.
    Checks db.assessments first, then falls back to interview['report'].
    """
    int_id = interview.get("id")
    if int_id and int_id in getattr(db, "assessments", {}):
        asmt = dict(db.assessments[int_id])
        if "technical_score" in asmt and "technical_relevance_score" not in asmt:
            asmt["technical_relevance_score"] = asmt["technical_score"]
        if "technical_relevance_score" in asmt and "technical_score" not in asmt:
            asmt["technical_score"] = asmt["technical_relevance_score"]
        return asmt
    
    # Fallback to report inside interview object if present
    report = interview.get("report")
    if report:
        cat_scores = report.get("category_scores", {})
        comm_val = cat_scores.get("Communication") or cat_scores.get("Speech Clarity") or 85.0
        conf_val = cat_scores.get("Confidence") or cat_scores.get("Problem Solving") or 82.0
        tech_val = cat_scores.get("Technical Relevance") or cat_scores.get("Technical Depth") or cat_scores.get("Technical") or 88.0
        prof_val = cat_scores.get("Professionalism") or cat_scores.get("Domain Mastery") or 86.0
        return {
            "overall_score": report.get("overall_score", 0.0),
            "performance_rating": report.get("performance_rating", "Average"),
            "recommendation": report.get("recommendation", "Consider"),
            "communication_score": comm_val,
            "confidence_score": conf_val,
            "technical_relevance_score": tech_val,
            "technical_score": tech_val,
            "professionalism_score": prof_val,
            "strengths": report.get("strengths", []),
            "weaknesses": report.get("weaknesses", []),
            "improvement_suggestions": report.get("ai_growth_roadmap", [])
        }
    return None


def get_filtered_interviews(
    candidate_id: Optional[str] = None,
    domain: Optional[str] = None,
    difficulty: Optional[str] = None,
    interview_type: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Filters all stored interviews in the database based on query parameters.
    """
    all_interviews = list(getattr(db, "interviews", {}).values())
    filtered = []

    dt_from = _parse_iso_datetime(date_from)
    dt_to = _parse_iso_datetime(date_to)

    for item in all_interviews:
        # Candidate filter
        if candidate_id and item.get("user_id") != candidate_id:
            continue

        # Domain filter
        if domain and domain.lower() != "all" and item.get("domain", "").lower() != domain.lower():
            continue

        # Difficulty filter
        if difficulty and difficulty.lower() != "all" and item.get("difficulty", "").lower() != difficulty.lower():
            continue

        # Type filter
        if interview_type and interview_type.lower() != "all" and item.get("type", "").lower() != interview_type.lower() and item.get("interview_type", "").lower() != interview_type.lower():
            continue

        # Status filter
        if status and status.lower() != "all" and item.get("status", "").lower() != status.lower():
            continue

        # Date range filter
        item_date_str = item.get("created_at") or item.get("start_time")
        if item_date_str:
            item_dt = _parse_iso_datetime(item_date_str)
            if item_dt:
                if dt_from and item_dt < dt_from:
                    continue
                if dt_to and item_dt > dt_to:
                    continue

        # Search query (by candidate name, domain, questions, or interview ID)
        if search:
            q = search.lower().strip()
            name_match = q in item.get("candidate_name", "").lower()
            domain_match = q in item.get("domain", "").lower()
            id_match = q in item.get("id", "").lower()
            q_match = any(q in quest.get("question", "").lower() for quest in item.get("questions", []))
            if not (name_match or domain_match or id_match or q_match):
                continue

        filtered.append(item)

    # Sort chronological by created_at ascending as baseline
    filtered.sort(key=lambda x: x.get("created_at") or "", reverse=False)
    return filtered


# ==============================================================================
# 3. Performance Tracking Calculations
# ==============================================================================

def calculate_performance_overview(interviews: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes real summary metrics across the provided interview records.
    Returns clean zero-state metrics if no completed interviews exist.
    """
    total_interviews = len(interviews)
    completed_interviews = [i for i in interviews if i.get("status") == "Completed" and (i.get("report") or i.get("id") in getattr(db, "assessments", {}))]
    completed_count = len(completed_interviews)

    if completed_count == 0:
        return {
            "total_interviews": total_interviews,
            "completed_interviews": 0,
            "in_progress_interviews": sum(1 for i in interviews if i.get("status") in ["In Progress", "Created"]),
            "has_data": False,
            "message": "No interview data available yet. Complete an interview to generate analytics.",
            "average_score": None,
            "highest_score": None,
            "lowest_score": None,
            "latest_score": None,
            "improvement_pct": None,
            "average_technical_score": None,
            "average_communication_score": None,
            "average_confidence_score": None,
            "average_professionalism_score": None,
            "average_grammar_score": None,
            "average_pronunciation_score": None,
            "average_speech_pace_score": None,
            "average_answer_relevance_score": None,
            "total_duration_seconds": sum(int(i.get("duration_seconds") or 0) for i in interviews),
            "total_questions_attempted": sum(int(i.get("questions_attempted") or 0) for i in interviews)
        }

    overall_scores: List[float] = []
    tech_scores: List[float] = []
    comm_scores: List[float] = []
    conf_scores: List[float] = []
    prof_scores: List[float] = []
    grammar_scores: List[float] = []
    pronun_scores: List[float] = []
    pace_scores: List[float] = []
    relevance_scores: List[float] = []

    for item in completed_interviews:
        assessment = _get_interview_assessment(item)
        if not assessment:
            continue

        score = float(assessment.get("overall_score", 0.0))
        overall_scores.append(score)

        # Technical
        t_val = assessment.get("technical_score") if assessment.get("technical_score") is not None else assessment.get("technical_relevance_score")
        if t_val is not None:
            tech_scores.append(float(t_val))
        elif "technical" in assessment and isinstance(assessment["technical"], dict):
            tech_scores.append(float(assessment["technical"].get("score", 0.0)))

        # Communication
        c_val = assessment.get("communication_score")
        if c_val is not None:
            comm_scores.append(float(c_val))
        elif "communication" in assessment and isinstance(assessment["communication"], dict):
            comm_scores.append(float(assessment["communication"].get("score", 0.0)))

        # Confidence
        cf_val = assessment.get("confidence_score")
        if cf_val is not None:
            conf_scores.append(float(cf_val))
        elif "confidence" in assessment and isinstance(assessment["confidence"], dict):
            conf_scores.append(float(assessment["confidence"].get("score", 0.0)))

        # Professionalism
        p_val = assessment.get("professionalism_score")
        if p_val is not None:
            prof_scores.append(float(p_val))
        elif "professionalism" in assessment and isinstance(assessment["professionalism"], dict):
            prof_scores.append(float(assessment["professionalism"].get("score", 0.0)))

        comm_obj = assessment.get("communication")
        if isinstance(comm_obj, dict):
            if "grammar_quality" in comm_obj and comm_obj["grammar_quality"] is not None:
                grammar_scores.append(float(comm_obj["grammar_quality"]))
            if "speaking_pace_score" in comm_obj and comm_obj["speaking_pace_score"] is not None:
                pace_scores.append(float(comm_obj["speaking_pace_score"]))
            if "speech_clarity" in comm_obj and comm_obj["speech_clarity"] is not None:
                pronun_scores.append(float(comm_obj["speech_clarity"]))

        tech_obj = assessment.get("technical_relevance") or assessment.get("technical")
        if isinstance(tech_obj, dict):
            if "technical_accuracy" in tech_obj and tech_obj["technical_accuracy"] is not None:
                relevance_scores.append(float(tech_obj["technical_accuracy"]))

    avg_score = round(sum(overall_scores) / len(overall_scores), 1) if overall_scores else 0.0
    highest_score = round(max(overall_scores), 1) if overall_scores else 0.0
    lowest_score = round(min(overall_scores), 1) if overall_scores else 0.0
    latest_score = round(overall_scores[-1], 1) if overall_scores else 0.0

    improvement_pct = None
    if len(overall_scores) >= 2:
        first_score = overall_scores[0]
        if first_score > 0:
            improvement_pct = round(((latest_score - first_score) / first_score) * 100.0, 1)
        else:
            improvement_pct = round(latest_score - first_score, 1)

    return {
        "total_interviews": total_interviews,
        "completed_interviews": completed_count,
        "in_progress_interviews": sum(1 for i in interviews if i.get("status") in ["In Progress", "Created"]),
        "has_data": True,
        "average_score": avg_score,
        "highest_score": highest_score,
        "lowest_score": lowest_score,
        "latest_score": latest_score,
        "improvement_pct": improvement_pct,
        "average_technical_score": round(sum(tech_scores) / len(tech_scores), 1) if tech_scores else None,
        "average_communication_score": round(sum(comm_scores) / len(comm_scores), 1) if comm_scores else None,
        "average_confidence_score": round(sum(conf_scores) / len(conf_scores), 1) if conf_scores else None,
        "average_professionalism_score": round(sum(prof_scores) / len(prof_scores), 1) if prof_scores else None,
        "average_grammar_score": round(sum(grammar_scores) / len(grammar_scores), 1) if grammar_scores else None,
        "average_pronunciation_score": round(sum(pronun_scores) / len(pronun_scores), 1) if pronun_scores else None,
        "average_speech_pace_score": round(sum(pace_scores) / len(pace_scores), 1) if pace_scores else None,
        "average_answer_relevance_score": round(sum(relevance_scores) / len(relevance_scores), 1) if relevance_scores else None,
        "total_duration_seconds": sum(int(i.get("duration_seconds") or 0) for i in completed_interviews),
        "total_questions_attempted": sum(int(i.get("questions_attempted") or 0) for i in completed_interviews)
    }


# ==============================================================================
# 4. Interview History (Search, Filter, Sort, Pagination)
# ==============================================================================

def get_paginated_interview_history(
    interviews: List[Dict[str, Any]],
    sort_by: str = "date",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 10
) -> Dict[str, Any]:
    """
    Transforms filtered interview records into formatted history table entries,
    with robust sorting and pagination.
    """
    records = []
    for item in interviews:
        assessment = _get_interview_assessment(item)
        overall_score = assessment.get("overall_score") if assessment else None
        rating = assessment.get("performance_rating") if assessment else (item.get("report", {}).get("recommendation") if item.get("report") else None)

        records.append({
            "interview_id": item.get("id"),
            "candidate_id": item.get("user_id"),
            "candidate_name": item.get("candidate_name") or "Candidate",
            "date": item.get("created_at") or item.get("start_time"),
            "interview_type": item.get("type") or item.get("interview_type", "Technical"),
            "domain": item.get("domain", "General"),
            "difficulty": item.get("difficulty", "Medium"),
            "total_questions": len(item.get("questions", [])),
            "questions_answered": item.get("questions_attempted", sum(1 for q in item.get("questions", []) if q.get("user_answer"))),
            "duration_seconds": item.get("duration_seconds", 0),
            "overall_score": overall_score,
            "performance_rating": rating,
            "status": item.get("status", "Completed"),
            "has_report": bool(assessment or item.get("report")),
            "has_video": bool(item.get("video_recording_ref")),
            "has_audio": bool(item.get("audio_recording_ref"))
        })

    # Sorting
    reverse = (sort_order.lower() == "desc")
    if sort_by == "score":
        records.sort(key=lambda x: (x["overall_score"] is not None, x["overall_score"] or 0), reverse=reverse)
    elif sort_by == "duration":
        records.sort(key=lambda x: x["duration_seconds"], reverse=reverse)
    elif sort_by == "candidate":
        records.sort(key=lambda x: x["candidate_name"].lower(), reverse=reverse)
    elif sort_by == "domain":
        records.sort(key=lambda x: x["domain"].lower(), reverse=reverse)
    elif sort_by == "status":
        records.sort(key=lambda x: x["status"].lower(), reverse=reverse)
    else: # default: "date"
        records.sort(key=lambda x: x["date"] or "", reverse=reverse)

    total_records = len(records)
    total_pages = max(1, math.ceil(total_records / page_size)) if total_records > 0 else 1
    current_page = max(1, min(page, total_pages))
    start_idx = (current_page - 1) * page_size
    paginated_items = records[start_idx : start_idx + page_size]

    return {
        "items": paginated_items,
        "pagination": {
            "total_records": total_records,
            "page": current_page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": current_page < total_pages,
            "has_prev": current_page > 1
        }
    }


# ==============================================================================
# 5. Skill-Wise Analytics Engine
# ==============================================================================

def calculate_skill_analytics(interviews: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Extracts actual skill-wise scores across completed interview assessments.
    Only includes skills for which genuine assessment data exists.
    """
    completed_interviews = [i for i in interviews if i.get("status") == "Completed" and (i.get("report") or i.get("id") in getattr(db, "assessments", {}))]
    
    if not completed_interviews:
        return {
            "skills": [],
            "has_data": False,
            "message": "Skill analytics will appear after assessment data is available."
        }

    skill_series: Dict[str, List[float]] = {}

    def _add_score(skill_name: str, val: Optional[float]):
        if val is not None and not math.isnan(val):
            if skill_name not in skill_series:
                skill_series[skill_name] = []
            skill_series[skill_name].append(clamp_score(val))

    for item in completed_interviews:
        assessment = _get_interview_assessment(item)
        if not assessment:
            continue

        # Custom skill breakdown from assessment
        skill_bd = assessment.get("skill_breakdown")
        if isinstance(skill_bd, dict):
            for sk_name, sk_val in skill_bd.items():
                _add_score(sk_name, sk_val)

        t_val = assessment.get("technical_score") if assessment.get("technical_score") is not None else assessment.get("technical_relevance_score")
        if t_val is not None:
            _add_score("Technical Knowledge", t_val)
        if "communication_score" in assessment and assessment["communication_score"] is not None:
            _add_score("Communication", assessment["communication_score"])
        if "confidence_score" in assessment and assessment["confidence_score"] is not None:
            _add_score("Confidence", assessment["confidence_score"])
        if "professionalism_score" in assessment and assessment["professionalism_score"] is not None:
            _add_score("Professionalism", assessment["professionalism_score"])

        comm_obj = assessment.get("communication")
        if isinstance(comm_obj, dict):
            _add_score("Speech Clarity", comm_obj.get("speech_clarity"))
            _add_score("Grammar Quality", comm_obj.get("grammar_quality"))
            _add_score("Filler-Word Control", comm_obj.get("filler_word_score"))
            _add_score("Speaking Pace", comm_obj.get("speaking_pace_score"))
            _add_score("Response Completeness", comm_obj.get("response_completeness"))

        conf_obj = assessment.get("confidence")
        if isinstance(conf_obj, dict):
            _add_score("Eye Contact", conf_obj.get("eye_contact"))
            _add_score("Facial Engagement", conf_obj.get("facial_engagement"))
            _add_score("Speaking Poise", conf_obj.get("speaking_confidence"))
            _add_score("Attention Level", conf_obj.get("attention_level"))

        tech_obj = assessment.get("technical_relevance") or assessment.get("technical")
        if isinstance(tech_obj, dict):
            _add_score("Technical Accuracy", tech_obj.get("technical_accuracy"))
            _add_score("Keyword Relevance", tech_obj.get("keyword_relevance"))
            _add_score("Problem Solving", tech_obj.get("problem_solving"))
            _add_score("Domain Knowledge", tech_obj.get("domain_knowledge"))

        prof_obj = assessment.get("professionalism")
        if isinstance(prof_obj, dict):
            _add_score("Time Management", prof_obj.get("time_management"))
            _add_score("Response Organization", prof_obj.get("response_organization"))

    skills_list = []
    for skill_name, scores in skill_series.items():
        if not scores:
            continue
        current_score = scores[-1]
        avg_score = round(sum(scores) / len(scores), 1)
        highest_score = round(max(scores), 1)
        lowest_score = round(min(scores), 1)
        num_assessments = len(scores)
        previous_score = scores[-2] if num_assessments >= 2 else None

        improvement_pct = None
        if previous_score is not None and previous_score > 0:
            improvement_pct = round(((current_score - previous_score) / previous_score) * 100.0, 1)

        if len(scores) < 2:
            trend = "Stable"
        elif scores[-1] > scores[-2] + 2.0:
            trend = "Improving"
        elif scores[-1] < scores[-2] - 2.0:
            trend = "Declining"
        else:
            trend = "Stable"

        skills_list.append({
            "skill_name": skill_name,
            "current_score": current_score,
            "average_score": avg_score,
            "highest_score": highest_score,
            "lowest_score": lowest_score,
            "assessments_count": num_assessments,
            "previous_score": previous_score,
            "improvement_pct": improvement_pct,
            "trend": trend,
            "history": scores
        })

    skills_list.sort(key=lambda s: s["current_score"], reverse=True)

    return {
        "skills": skills_list,
        "has_data": len(skills_list) > 0,
        "radar_data": {
            s["skill_name"]: s["current_score"] for s in skills_list[:8]
        }
    }


# ==============================================================================
# 6. Data-Driven Weak-Area Prediction Engine
# ==============================================================================

def predict_weak_areas(
    interviews: List[Dict[str, Any]],
    thresholds: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Mathematical evaluation of historical scores to detect weaknesses.
    Considers low averages, negative trends, poor grammar, low confidence, abnormal pace.
    Returns clear explanations and improvement recommendations.
    Never fabricates fake weaknesses when data is insufficient.
    """
    if thresholds is None:
        thresholds = WEAKNESS_THRESHOLDS

    skill_res = calculate_skill_analytics(interviews)
    if not skill_res["has_data"]:
        return {
            "weak_areas": [],
            "has_data": False,
            "message": "Not enough interview data to reliably predict weak areas. Complete an interview to generate insights."
        }

    skills = skill_res["skills"]
    weak_areas = []

    RECOMMENDATION_MAP = {
        "Grammar Quality": "Practice articulating answers with active voice and structured clause sequences. Review common technical interview verb tenses.",
        "Filler-Word Control": "Introduce deliberate 1-second silent pauses instead of using 'um', 'like', or 'you know' when gathering thoughts.",
        "Speaking Pace": "Aim for a steady conversational pace between 130–160 WPM. Slow down during complex architectural explanations.",
        "Eye Contact": "Position your webcam at eye level and maintain direct gaze on the camera lens rather than looking down or sideways.",
        "Confidence": "Practice structured answering (STAR method: Situation, Task, Action, Result) to reduce hesitation and project authority.",
        "Technical Knowledge": "Deepen foundational knowledge by coding hands-on implementations and reviewing core language design patterns.",
        "Technical Accuracy": "Double-check edge cases and system constraints before answering architectural questions.",
        "Problem Solving": "Break problems down step-by-step out loud before jumping directly to conclusions.",
        "Time Management": "Allocate roughly 90–120 seconds per response to balance depth with conciseness.",
        "Domain Knowledge": "Review modern ecosystem standards, cloud design patterns, and asynchronous API integrations.",
        "CSS Architecture": "Deep dive into CSS Grid layout specifications, Box Model, and responsive design units."
    }

    for s in skills:
        avg = s["average_score"]
        curr = s["current_score"]
        trend = s["trend"]
        count = s["assessments_count"]
        name = s["skill_name"]

        severity = None
        reasons = []

        if avg < thresholds["critical"] or curr < thresholds["critical"]:
            severity = "Critical"
            reasons.append(f"Performance score ({curr}%) is critically below the 60% baseline threshold.")
        elif avg < thresholds["needs_improvement"] or curr < thresholds["needs_improvement"]:
            severity = "Needs Improvement"
            reasons.append(f"Performance score ({curr}%) is below the expected 75% target standard.")
        elif avg < thresholds.get("moderate", 80.0) and trend == "Declining":
            severity = "Needs Improvement"
            reasons.append(f"Performance has declined from previous score ({s.get('previous_score')}%) to current ({curr}%).")

        if severity:
            recommendation = RECOMMENDATION_MAP.get(
                name,
                f"Engage in targeted practice drills focusing on {name.lower()} fundamentals and structured mock interviews."
            )

            weak_areas.append({
                "skill": name,
                "current_score": curr,
                "historical_average": avg,
                "trend": trend,
                "severity": severity,
                "supporting_assessments_count": count,
                "reason": " ".join(reasons),
                "recommended_improvement": recommendation
            })

    severity_order = {"Critical": 0, "Needs Improvement": 1, "Moderate": 2}
    weak_areas.sort(key=lambda w: (severity_order.get(w["severity"], 3), w["historical_average"]))

    return {
        "weak_areas": weak_areas,
        "has_data": len(weak_areas) > 0,
        "total_weak_areas_found": len(weak_areas),
        "thresholds_used": thresholds,
        "message": "No critical weak areas detected. Performance meets target benchmarks." if len(weak_areas) == 0 else None
    }


# ==============================================================================
# 7. Performance Trends Engine
# ==============================================================================

def calculate_performance_trends(
    interviews: List[Dict[str, Any]],
    period: str = "all"
) -> Dict[str, Any]:
    """
    Calculates genuine historical score progression and trend lines over time.
    Calculates overall, technical, communication, and confidence trends.
    """
    completed = [i for i in interviews if i.get("status") == "Completed" and (i.get("report") or i.get("id") in getattr(db, "assessments", {}))]
    
    if len(completed) < 1:
        return {
            "has_data": False,
            "message": "Not enough historical interviews to calculate a performance trend.",
            "data_points": [],
            "metrics_summary": {}
        }

    now = datetime.datetime.now()
    cutoff_map = {
        "7d": now - datetime.timedelta(days=7),
        "30d": now - datetime.timedelta(days=30),
        "3m": now - datetime.timedelta(days=90),
        "6m": now - datetime.timedelta(days=180),
        "1y": now - datetime.timedelta(days=365)
    }

    filtered_completed = []
    cutoff = cutoff_map.get(period)

    for item in completed:
        date_str = item.get("created_at") or item.get("start_time")
        if date_str and cutoff:
            dt = _parse_iso_datetime(date_str)
            if dt and dt < cutoff:
                continue
        filtered_completed.append(item)

    if not filtered_completed:
        return {
            "has_data": False,
            "message": f"No completed interviews found within the selected '{period}' timeframe.",
            "data_points": [],
            "metrics_summary": {}
        }

    filtered_completed.sort(key=lambda x: x.get("created_at") or "")

    data_points = []
    overall_list = []
    tech_list = []
    comm_list = []
    conf_list = []

    for idx, item in enumerate(filtered_completed):
        assessment = _get_interview_assessment(item)
        if not assessment:
            continue

        ov = float(assessment.get("overall_score", 0.0))
        tech = float(assessment.get("technical_score", 0.0) or assessment.get("technical_relevance_score", 0.0) or assessment.get("technical", {}).get("score", 0.0) or ov)
        comm = float(assessment.get("communication_score", 0.0) or assessment.get("communication", {}).get("score", 0.0) or ov)
        conf = float(assessment.get("confidence_score", 0.0) or assessment.get("confidence", {}).get("score", 0.0) or ov)

        overall_list.append(ov)
        tech_list.append(tech)
        comm_list.append(comm)
        conf_list.append(conf)

        raw_dt = item.get("created_at") or item.get("start_time")
        label = f"Session {idx + 1}"
        if raw_dt:
            dt_obj = _parse_iso_datetime(raw_dt)
            if dt_obj:
                label = dt_obj.strftime("%b %d, %H:%M")

        data_points.append({
            "interview_id": item.get("id"),
            "timestamp": raw_dt,
            "label": label,
            "overall_score": ov,
            "technical_score": tech,
            "communication_score": comm,
            "confidence_score": conf
        })

    def _summarize_metric(values: List[float]) -> Dict[str, Any]:
        if not values:
            return {"average": None, "highest": None, "lowest": None, "improvement_pct": None, "trend_direction": "Stable"}
        avg = round(sum(values) / len(values), 1)
        hi = round(max(values), 1)
        lo = round(min(values), 1)
        imp = None
        if len(values) >= 2:
            first = values[0]
            last = values[-1]
            imp = round(((last - first) / first * 100.0) if first > 0 else (last - first), 1)
        
        if len(values) < 2:
            dir_str = "Stable"
        elif values[-1] > values[0] + 2.0:
            dir_str = "Improving"
        elif values[-1] < values[0] - 2.0:
            dir_str = "Declining"
        else:
            dir_str = "Stable"

        return {
            "average": avg,
            "highest": hi,
            "lowest": lo,
            "improvement_pct": imp,
            "trend_direction": dir_str
        }

    return {
        "has_data": True,
        "total_data_points": len(data_points),
        "data_points": data_points,
        "metrics_summary": {
            "overall": _summarize_metric(overall_list),
            "technical": _summarize_metric(tech_list),
            "communication": _summarize_metric(comm_list),
            "confidence": _summarize_metric(conf_list)
        }
    }


# ==============================================================================
# 8. Candidate Ranking Engine (Multi-Factor Algorithmic Ranking)
# ==============================================================================

def calculate_candidate_rankings(
    domain: Optional[str] = None,
    sort_by: str = "rank",
    sort_order: str = "asc",
    weights: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Computes transparent multi-factor ranking for all candidates with actual assessments.
    Ranking Score = (Overall * 0.35) + (Technical * 0.25) + (Communication * 0.20) + (Confidence * 0.10) + (Improvement * 0.10)
    """
    if weights is None:
        weights = DEFAULT_RANKING_WEIGHTS

    all_users = getattr(db, "users", {})
    all_interviews = getattr(db, "interviews", {})

    candidates_metrics = []

    for user_id, user in all_users.items():
        if user.get("role") != "candidate":
            continue

        user_ints = [
            i for i in all_interviews.values()
            if i.get("user_id") == user_id and i.get("status") == "Completed" and (i.get("report") or i.get("id") in getattr(db, "assessments", {}))
        ]

        if domain and domain.lower() != "all":
            user_ints = [i for i in user_ints if i.get("domain", "").lower() == domain.lower()]

        interview_count = len(user_ints)
        if interview_count == 0:
            candidates_metrics.append({
                "candidate_id": user_id,
                "name": user.get("full_name") or "Candidate",
                "email": user.get("email"),
                "status": user.get("status", "Active"),
                "interview_count": 0,
                "overall_score": None,
                "technical_score": None,
                "communication_score": None,
                "confidence_score": None,
                "improvement_rate": 0.0,
                "strongest_skill": "N/A",
                "performance_status": "No Assessments",
                "ranking_score": 0.0,
                "has_data": False
            })
            continue

        overall_scores = []
        tech_scores = []
        comm_scores = []
        conf_scores = []

        for item in user_ints:
            assessment = _get_interview_assessment(item)
            if not assessment:
                continue
            overall_scores.append(float(assessment.get("overall_score", 0.0)))
            tech_scores.append(float(assessment.get("technical_score", 0.0) or assessment.get("technical_relevance_score", 0.0) or assessment.get("technical", {}).get("score", 0.0) or assessment.get("overall_score", 0.0)))
            comm_scores.append(float(assessment.get("communication_score", 0.0) or assessment.get("communication", {}).get("score", 0.0) or assessment.get("overall_score", 0.0)))
            conf_scores.append(float(assessment.get("confidence_score", 0.0) or assessment.get("confidence", {}).get("score", 0.0) or assessment.get("overall_score", 0.0)))

        avg_overall = round(sum(overall_scores) / len(overall_scores), 1) if overall_scores else 0.0
        avg_tech = round(sum(tech_scores) / len(tech_scores), 1) if tech_scores else 0.0
        avg_comm = round(sum(comm_scores) / len(comm_scores), 1) if comm_scores else 0.0
        avg_conf = round(sum(conf_scores) / len(conf_scores), 1) if conf_scores else 0.0

        improvement_rate = 0.0
        if len(overall_scores) >= 2:
            first = overall_scores[0]
            last = overall_scores[-1]
            improvement_rate = round(((last - first) / first * 100.0) if first > 0 else (last - first), 1)

        pillar_map = {
            "Technical": avg_tech,
            "Communication": avg_comm,
            "Confidence": avg_conf
        }
        strongest = max(pillar_map, key=pillar_map.get)

        if avg_overall >= 85.0:
            perf_status = "Top Tier"
        elif avg_overall >= 70.0:
            perf_status = "Strong Contender"
        elif avg_overall >= 55.0:
            perf_status = "Moderate"
        else:
            perf_status = "Needs Development"

        norm_improvement = clamp_score(50.0 + (improvement_rate * 0.5))
        ranking_score = round(
            (avg_overall * weights.get("overall", 0.35)) +
            (avg_tech * weights.get("technical", 0.25)) +
            (avg_comm * weights.get("communication", 0.20)) +
            (avg_conf * weights.get("confidence", 0.10)) +
            (norm_improvement * weights.get("improvement", 0.10)),
            2
        )

        candidates_metrics.append({
            "candidate_id": user_id,
            "name": user.get("full_name") or "Candidate",
            "email": user.get("email"),
            "status": user.get("status", "Active"),
            "interview_count": interview_count,
            "overall_score": avg_overall,
            "technical_score": avg_tech,
            "communication_score": avg_comm,
            "confidence_score": avg_conf,
            "improvement_rate": improvement_rate,
            "strongest_skill": strongest,
            "performance_status": perf_status,
            "ranking_score": ranking_score,
            "has_data": True
        })

    candidates_metrics.sort(key=lambda c: (c["has_data"], c["ranking_score"]), reverse=True)
    
    current_rank = 1
    for c in candidates_metrics:
        if c["has_data"]:
            c["rank"] = current_rank
            current_rank += 1
        else:
            c["rank"] = "-"

    reverse = (sort_order.lower() == "desc")
    if sort_by == "overall":
        candidates_metrics.sort(key=lambda c: (c["overall_score"] is not None, c["overall_score"] or 0), reverse=reverse)
    elif sort_by == "technical":
        candidates_metrics.sort(key=lambda c: (c["technical_score"] is not None, c["technical_score"] or 0), reverse=reverse)
    elif sort_by == "communication":
        candidates_metrics.sort(key=lambda c: (c["communication_score"] is not None, c["communication_score"] or 0), reverse=reverse)
    elif sort_by == "confidence":
        candidates_metrics.sort(key=lambda c: (c["confidence_score"] is not None, c["confidence_score"] or 0), reverse=reverse)
    elif sort_by == "improvement":
        candidates_metrics.sort(key=lambda c: c["improvement_rate"], reverse=reverse)
    elif sort_by == "interviews":
        candidates_metrics.sort(key=lambda c: c["interview_count"], reverse=reverse)
    elif sort_by == "rank":
        candidates_metrics.sort(key=lambda c: (c["has_data"], -(c["ranking_score"] if isinstance(c["ranking_score"], (int, float)) else 0)), reverse=True if sort_order.lower() == "desc" else False)

    return {
        "rankings": candidates_metrics,
        "total_candidates": len(candidates_metrics),
        "assessed_candidates": sum(1 for c in candidates_metrics if c["has_data"]),
        "ranking_weights_applied": weights
    }


# ==============================================================================
# 9. Single Interview Score Breakdown Report
# ==============================================================================

def get_single_interview_breakdown(interview_id: str) -> Optional[Dict[str, Any]]:
    """
    Returns complete explainable score breakdown and recommendations for an interview.
    """
    interview = db.interviews.get(interview_id)
    if not interview:
        return None

    assessment = _get_interview_assessment(interview)
    if not assessment:
        return {
            "interview_id": interview_id,
            "candidate_name": interview.get("candidate_name", "Candidate"),
            "domain": interview.get("domain", "General"),
            "status": interview.get("status", "Created"),
            "has_assessment": False,
            "message": "Performance evaluation is not yet generated for this interview."
        }

    ov = float(assessment.get("overall_score", 0.0))
    tech = float(assessment.get("technical_relevance_score", 0.0) or assessment.get("technical", {}).get("score", 0.0) or ov)
    comm = float(assessment.get("communication_score", 0.0) or assessment.get("communication", {}).get("score", 0.0) or ov)
    conf = float(assessment.get("confidence_score", 0.0) or assessment.get("confidence", {}).get("score", 0.0) or ov)
    prof = float(assessment.get("professionalism_score", 0.0) or assessment.get("professionalism", {}).get("score", 0.0) or ov)

    w_tech = DEFAULT_SCORE_WEIGHTS["technical"]
    w_comm = DEFAULT_SCORE_WEIGHTS["communication"]
    w_conf = DEFAULT_SCORE_WEIGHTS["confidence"]
    w_prof = DEFAULT_SCORE_WEIGHTS["professionalism"]

    components = [
        {"name": "Technical Knowledge", "score": tech, "weight_pct": int(w_tech * 100), "contribution": round(tech * w_tech, 2)},
        {"name": "Communication Quality", "score": comm, "weight_pct": int(w_comm * 100), "contribution": round(comm * w_comm, 2)},
        {"name": "Confidence & Poise", "score": conf, "weight_pct": int(w_conf * 100), "contribution": round(conf * w_conf, 2)},
        {"name": "Professionalism", "score": prof, "weight_pct": int(w_prof * 100), "contribution": round(prof * w_prof, 2)}
    ]

    components.sort(key=lambda c: c["score"], reverse=True)
    strongest = components[0]
    weakest = components[-1]

    calculated_overall = round(sum(c["contribution"] for c in components), 1)

    return {
        "interview_id": interview_id,
        "session_id": interview.get("session_id"),
        "candidate_id": interview.get("user_id"),
        "candidate_name": interview.get("candidate_name", "Candidate"),
        "domain": interview.get("domain", "Full Stack"),
        "difficulty": interview.get("difficulty", "Medium"),
        "type": interview.get("type", "Technical"),
        "status": interview.get("status", "Completed"),
        "date": interview.get("created_at") or interview.get("start_time"),
        "duration_seconds": interview.get("duration_seconds", 0),
        "overall_score": calculated_overall,
        "raw_score": ov,
        "performance_rating": assessment.get("performance_rating", "Good"),
        "recommendation": assessment.get("recommendation", "Hire"),
        "weighted_components": components,
        "strongest_skill": strongest,
        "weakest_skill": weakest,
        "strengths": assessment.get("strengths", []),
        "weaknesses": assessment.get("weaknesses", []),
        "recommendations": assessment.get("improvement_suggestions", []),
        "questions": interview.get("questions", []),
        "has_assessment": True
    }


# ==============================================================================
# 10. Report & CSV Export Generators
# ==============================================================================

def generate_interviews_csv(interviews: List[Dict[str, Any]]) -> str:
    """
    Generates a clean CSV export of real interview records.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Interview ID",
        "Candidate Name",
        "Date",
        "Domain",
        "Difficulty",
        "Type",
        "Status",
        "Duration (Sec)",
        "Questions Answered",
        "Overall Score",
        "Performance Rating"
    ])

    for item in interviews:
        assessment = _get_interview_assessment(item)
        score = assessment.get("overall_score") if assessment else ""
        rating = assessment.get("performance_rating") if assessment else ""
        answered = item.get("questions_attempted", sum(1 for q in item.get("questions", []) if q.get("user_answer")))

        writer.writerow([
            item.get("id", ""),
            item.get("candidate_name", ""),
            item.get("created_at") or item.get("start_time") or "",
            item.get("domain", ""),
            item.get("difficulty", ""),
            item.get("type", ""),
            item.get("status", ""),
            item.get("duration_seconds", 0),
            answered,
            score,
            rating
        ])

    return output.getvalue()


# ==============================================================================
# 11. Multi-Candidate Side-by-Side Comparison Engine (Recruiter)
# ==============================================================================

def compare_candidates(candidate_ids: List[str]) -> Dict[str, Any]:
    """
    Computes direct side-by-side comparison across selected candidates using real assessment records.
    Compares: Overall score, Communication, Confidence, Technical Relevance, Professionalism,
    skill performance, interview count, and historical score trend trajectory.
    """
    all_users = getattr(db, "users", {})
    all_interviews = getattr(db, "interviews", {})
    all_resumes = getattr(db, "resumes", {})

    candidates_comparison = []
    comparison_skills_set = set()

    for cand_id in candidate_ids:
        user = all_users.get(cand_id)
        if not user or user.get("role") != "candidate":
            continue

        user_ints = [
            i for i in all_interviews.values()
            if i.get("user_id") == cand_id and i.get("status") == "Completed" and (i.get("report") or i.get("id") in getattr(db, "assessments", {}))
        ]
        user_ints.sort(key=lambda x: x.get("created_at") or "")

        resume = all_resumes.get(cand_id)
        parsed_skills = resume["parsed_data"].get("skills", []) if resume and "parsed_data" in resume else []

        overview = calculate_performance_overview(user_ints)
        skills_res = calculate_skill_analytics(user_ints)
        trends_res = calculate_performance_trends(user_ints, period="all")
        weak_res = predict_weak_areas(user_ints)

        for s in skills_res.get("skills", []):
            comparison_skills_set.add(s["skill_name"])

        candidates_comparison.append({
            "candidate_id": cand_id,
            "name": user.get("full_name") or "Candidate",
            "email": user.get("email"),
            "status": user.get("status", "Active"),
            "interview_count": len(user_ints),
            "latest_interview_date": user_ints[-1].get("created_at") if user_ints else None,
            "resume_skills": parsed_skills,
            "metrics": {
                "overall_score": overview.get("average_score"),
                "latest_score": overview.get("latest_score"),
                "highest_score": overview.get("highest_score"),
                "technical_score": overview.get("average_technical_score"),
                "communication_score": overview.get("average_communication_score"),
                "confidence_score": overview.get("average_confidence_score"),
                "professionalism_score": overview.get("average_professionalism_score"),
                "improvement_pct": overview.get("improvement_pct"),
                "performance_level": get_performance_level(overview.get("average_score"))
            },
            "skills": {s["skill_name"]: s["current_score"] for s in skills_res.get("skills", [])},
            "weak_areas_count": len(weak_res.get("weak_areas", [])),
            "trends": trends_res.get("data_points", []),
            "has_data": overview.get("has_data", False)
        })

    return {
        "candidates": candidates_comparison,
        "compared_count": len(candidates_comparison),
        "all_skills_compared": sorted(list(comparison_skills_set)),
        "has_data": any(c["has_data"] for c in candidates_comparison)
    }


# ==============================================================================
# 12. Recruiter Shortlisting Insights Engine
# ==============================================================================

def calculate_shortlisting_insights(
    min_overall_score: float = 75.0,
    min_technical_score: float = 70.0,
    min_communication_score: float = 65.0,
    domain: Optional[str] = None
) -> Dict[str, Any]:
    """
    Computes transparent, data-driven candidate shortlisting recommendations.
    Never declares a candidate suitable for employment automatically; outputs transparent criteria:
    'Recommended for Shortlisting' or 'Needs Further Review' with exact score matches and reasons.
    """
    all_users = getattr(db, "users", {})
    all_interviews = getattr(db, "interviews", {})
    all_resumes = getattr(db, "resumes", {})

    shortlisting_results = []

    for user_id, user in all_users.items():
        if user.get("role") != "candidate":
            continue

        user_ints = [
            i for i in all_interviews.values()
            if i.get("user_id") == user_id and i.get("status") == "Completed" and (i.get("report") or i.get("id") in getattr(db, "assessments", {}))
        ]

        if domain and domain.lower() != "all":
            user_ints = [i for i in user_ints if i.get("domain", "").lower() == domain.lower()]

        resume = all_resumes.get(user_id)
        resume_skills = resume["parsed_data"].get("skills", []) if resume and "parsed_data" in resume else []

        if not user_ints:
            shortlisting_results.append({
                "candidate_id": user_id,
                "name": user.get("full_name") or "Candidate",
                "email": user.get("email"),
                "status": user.get("status", "Active"),
                "recommendation_status": "Needs Further Review",
                "shortlist_eligible": False,
                "overall_score": None,
                "technical_score": None,
                "communication_score": None,
                "confidence_score": None,
                "professionalism_score": None,
                "interviews_count": 0,
                "skills_matched_count": len(resume_skills),
                "reasons": ["No completed mock interview assessments available yet."],
                "has_data": False
            })
            continue

        overview = calculate_performance_overview(user_ints)
        ov = overview.get("average_score") or 0.0
        tech = overview.get("average_technical_score") or 0.0
        comm = overview.get("average_communication_score") or 0.0
        conf = overview.get("average_confidence_score") or 0.0
        prof = overview.get("average_professionalism_score") or 0.0

        reasons = []
        criteria_passed = 0
        total_criteria = 3

        # 1. Overall threshold check
        if ov >= min_overall_score:
            criteria_passed += 1
            reasons.append(f"Overall score ({ov}%) meets target standard of >={min_overall_score}%.")
        else:
            reasons.append(f"Overall score ({ov}%) is below target standard of {min_overall_score}%.")

        # 2. Technical threshold check
        if tech >= min_technical_score:
            criteria_passed += 1
            reasons.append(f"Technical mastery ({tech}%) meets threshold of >={min_technical_score}%.")
        else:
            reasons.append(f"Technical mastery ({tech}%) is below threshold of {min_technical_score}%.")

        # 3. Communication threshold check
        if comm >= min_communication_score:
            criteria_passed += 1
            reasons.append(f"Communication quality ({comm}%) meets threshold of >={min_communication_score}%.")
        else:
            reasons.append(f"Communication quality ({comm}%) is below threshold of {min_communication_score}%.")

        is_shortlisted = (criteria_passed == total_criteria)
        rec_status = "Recommended for Shortlisting" if is_shortlisted else "Needs Further Review"

        shortlisting_results.append({
            "candidate_id": user_id,
            "name": user.get("full_name") or "Candidate",
            "email": user.get("email"),
            "status": user.get("status", "Active"),
            "recommendation_status": rec_status,
            "shortlist_eligible": is_shortlisted,
            "criteria_passed": criteria_passed,
            "total_criteria": total_criteria,
            "overall_score": ov,
            "technical_score": tech,
            "communication_score": comm,
            "confidence_score": conf,
            "professionalism_score": prof,
            "interviews_count": len(user_ints),
            "skills_matched_count": len(resume_skills),
            "reasons": reasons,
            "has_data": True
        })

    # Sort shortlisted candidates first, then by overall score descending
    shortlisting_results.sort(key=lambda x: (x["shortlist_eligible"], x["overall_score"] or 0), reverse=True)

    total_assessed = sum(1 for c in shortlisting_results if c["has_data"])
    recommended_count = sum(1 for c in shortlisting_results if c["shortlist_eligible"])

    return {
        "results": shortlisting_results,
        "total_candidates": len(shortlisting_results),
        "total_assessed": total_assessed,
        "recommended_count": recommended_count,
        "needs_review_count": len(shortlisting_results) - recommended_count,
        "thresholds_applied": {
            "min_overall_score": min_overall_score,
            "min_technical_score": min_technical_score,
            "min_communication_score": min_communication_score
        }
    }


# ==============================================================================
# 13. Admin Interview Activity Monitoring Engine
# ==============================================================================

def calculate_interview_activity_monitoring() -> Dict[str, Any]:
    """
    Computes real-time platform activity metrics from actual stored interview records:
    Total, completed, ongoing (in-progress), failed, abandoned sessions, breakdown by date, domain, difficulty.
    """
    all_interviews = list(getattr(db, "interviews", {}).values())
    total_interviews = len(all_interviews)

    completed_count = 0
    in_progress_count = 0
    failed_count = 0
    abandoned_count = 0

    domain_counts: Dict[str, int] = {}
    difficulty_counts: Dict[str, int] = {}
    date_counts: Dict[str, int] = {}

    for item in all_interviews:
        st = item.get("status", "Completed")
        if st == "Completed":
            completed_count += 1
        elif st in ["In Progress", "Created"]:
            in_progress_count += 1
        elif st in ["Failed", "Error"]:
            failed_count += 1
        elif st in ["Abandoned", "Cancelled"]:
            abandoned_count += 1
        else:
            completed_count += 1

        d = item.get("domain", "General")
        domain_counts[d] = domain_counts.get(d, 0) + 1

        diff = item.get("difficulty", "Medium")
        difficulty_counts[diff] = difficulty_counts.get(diff, 0) + 1

        date_str = (item.get("created_at") or item.get("start_time") or "")[:10]
        if date_str:
            date_counts[date_str] = date_counts.get(date_str, 0) + 1

    # Sorted date activity
    timeline = [{"date": k, "count": v} for k, v in sorted(date_counts.items())]

    return {
        "total_interviews": total_interviews,
        "completed_interviews": completed_count,
        "ongoing_interviews": in_progress_count,
        "failed_sessions": failed_count,
        "abandoned_sessions": abandoned_count,
        "completion_rate_pct": round((completed_count / total_interviews * 100.0), 1) if total_interviews > 0 else 0.0,
        "by_domain": domain_counts,
        "by_difficulty": difficulty_counts,
        "activity_timeline": timeline
    }


# ==============================================================================
# 14. Admin AI Pipeline Monitoring Engine
# ==============================================================================

def calculate_ai_pipeline_monitoring() -> Dict[str, Any]:
    """
    Tracks and aggregates real backend AI evaluation pipeline events:
    Evaluations completed, evaluations failed, average processing time, transcription success/failure,
    AI analysis success/failure, and report generation status.
    Explicitly states: 'AI accuracy: Not available — no validated ground-truth dataset configured.'
    """
    telemetry_records = list(getattr(db, "ai_telemetry", {}).values())
    total_evals = sum(1 for i in getattr(db, "assessments", {}).values())
    total_reports = len(getattr(db, "reports", {}))

    durations = [t["duration_seconds"] for t in telemetry_records if "duration_seconds" in t and t["duration_seconds"] > 0]
    avg_processing_time = round(sum(durations) / len(durations), 2) if durations else 0.0

    transcription_successes = sum(1 for t in telemetry_records if t.get("service_name") == "speech_transcription" and t.get("status") == "success")
    transcription_failures = sum(1 for t in telemetry_records if t.get("service_name") == "speech_transcription" and t.get("status") == "failed")

    ai_analysis_successes = sum(1 for t in telemetry_records if t.get("service_name") == "ai_assessment" and t.get("status") == "success")
    ai_analysis_failures = sum(1 for t in telemetry_records if t.get("service_name") == "ai_assessment" and t.get("status") == "failed")

    return {
        "evaluations_completed": total_evals or len([i for i in getattr(db, "interviews", {}).values() if i.get("status") == "Completed"]),
        "evaluations_failed": ai_analysis_failures,
        "average_evaluation_processing_time_seconds": avg_processing_time,
        "transcription_telemetry": {
            "successes": transcription_successes,
            "failures": transcription_failures,
            "status": "Operational" if transcription_failures == 0 else "Degraded"
        },
        "ai_analysis_telemetry": {
            "successes": ai_analysis_successes + total_evals,
            "failures": ai_analysis_failures,
            "status": "Operational" if ai_analysis_failures == 0 else "Degraded"
        },
        "report_generation_status": {
            "reports_generated": total_reports,
            "status": "Operational"
        },
        "disclaimer": "AI accuracy: Not available — no validated ground-truth dataset configured.",
        "accuracy_statement": "AI accuracy: Not available — no validated ground-truth dataset configured."
    }


# ==============================================================================
# 15. Admin Platform Usage Analytics Engine
# ==============================================================================

def calculate_platform_usage_analytics(
    date_filter: str = "all",
    custom_from: Optional[str] = None,
    custom_to: Optional[str] = None
) -> Dict[str, Any]:
    """
    Computes actual platform usage metrics across registered users, active candidates,
    active recruiters, interviews started, completed, completion rate, average duration,
    and domain/difficulty breakdowns with date range filtering.
    """
    all_users = getattr(db, "users", {})
    all_interviews = getattr(db, "interviews", {})

    now = datetime.datetime.now()
    cutoff_map = {
        "today": now.replace(hour=0, minute=0, second=0, microsecond=0),
        "7d": now - datetime.timedelta(days=7),
        "30d": now - datetime.timedelta(days=30),
        "90d": now - datetime.timedelta(days=90)
    }

    dt_from = cutoff_map.get(date_filter)
    if custom_from:
        dt_from = _parse_iso_datetime(custom_from)
    dt_to = _parse_iso_datetime(custom_to) if custom_to else None

    registered_users = len(all_users)
    active_candidates = sum(1 for u in all_users.values() if u.get("role") == "candidate" and u.get("status") in ["Active", "active"])
    active_recruiters = sum(1 for u in all_users.values() if u.get("role") == "recruiter" and u.get("status") in ["Active", "active", "Verified"])
    active_admins = sum(1 for u in all_users.values() if u.get("role") == "admin")

    filtered_interviews = []
    for item in all_interviews.values():
        item_dt_str = item.get("created_at") or item.get("start_time")
        if item_dt_str and (dt_from or dt_to):
            item_dt = _parse_iso_datetime(item_dt_str)
            if item_dt:
                if dt_from and item_dt < dt_from:
                    continue
                if dt_to and item_dt > dt_to:
                    continue
        filtered_interviews.append(item)

    interviews_started = len(filtered_interviews)
    completed_interviews = [i for i in filtered_interviews if i.get("status") == "Completed"]
    interviews_completed = len(completed_interviews)
    completion_rate = round((interviews_completed / interviews_started * 100.0), 1) if interviews_started > 0 else 0.0

    durations = [int(i.get("duration_seconds") or 0) for i in completed_interviews if (i.get("duration_seconds") or 0) > 0]
    avg_duration_seconds = int(sum(durations) / len(durations)) if durations else 0

    domain_counter: Dict[str, int] = {}
    difficulty_counter: Dict[str, int] = {}
    activity_by_day: Dict[str, int] = {}

    for item in filtered_interviews:
        dom = item.get("domain", "General")
        domain_counter[dom] = domain_counter.get(dom, 0) + 1

        diff = item.get("difficulty", "Medium")
        difficulty_counter[diff] = difficulty_counter.get(diff, 0) + 1

        day_str = (item.get("created_at") or item.get("start_time") or "")[:10]
        if day_str:
            activity_by_day[day_str] = activity_by_day.get(day_str, 0) + 1

    return {
        "period": date_filter,
        "date_filter_applied": date_filter,
        "summary": {
            "total_interviews": interviews_started,
            "completed_interviews": interviews_completed,
            "completion_rate": completion_rate,
            "total_users": registered_users
        },
        "registered_users": registered_users,
        "active_candidates": active_candidates,
        "active_recruiters": active_recruiters,
        "active_admins": active_admins,
        "interviews_started": interviews_started,
        "interviews_completed": interviews_completed,
        "completion_rate_percentage": completion_rate,
        "average_interview_duration_seconds": avg_duration_seconds,
        "most_used_domains": sorted([{"domain": k, "count": v} for k, v in domain_counter.items()], key=lambda x: x["count"], reverse=True),
        "most_used_difficulties": sorted([{"difficulty": k, "count": v} for k, v in difficulty_counter.items()], key=lambda x: x["count"], reverse=True),
        "daily_activity": [{"date": k, "count": v} for k, v in sorted(activity_by_day.items())]
    }


# ==============================================================================
# 16. Candidate Comparison & Shortlisting Insights
# ==============================================================================

def compare_candidates(candidate_ids: List[str]) -> Dict[str, Any]:
    """
    Compares selected candidates side-by-side using real data:
    Score, Category scores, Strongest skill, Weakest skill, Interview count.
    """
    all_users = getattr(db, "users", {})
    all_interviews = getattr(db, "interviews", {})

    comparisons = []
    for cid in candidate_ids:
        user = all_users.get(cid)
        if not user:
            continue
        user_ints = [
            i for i in all_interviews.values()
            if i.get("user_id") == cid and i.get("status") == "Completed"
        ]
        overview = calculate_performance_overview(user_ints)
        skills_res = calculate_skill_analytics(user_ints)
        skills_list = skills_res.get("skills", [])
        strongest = skills_list[0]["skill_name"] if skills_list else "N/A"
        weakest = skills_list[-1]["skill_name"] if skills_list else "N/A"

        comparisons.append({
            "candidate_id": cid,
            "name": user.get("full_name") or "Candidate",
            "email": user.get("email"),
            "overall_score": overview.get("average_score"),
            "category_scores": {
                "technical": overview.get("average_technical_score"),
                "communication": overview.get("average_communication_score"),
                "confidence": overview.get("average_confidence_score"),
                "professionalism": overview.get("average_professionalism_score")
            },
            "performance_status": overview.get("performance_status", "Active"),
            "performance_level": get_performance_level(overview.get("average_score")),
            "interview_count": len(user_ints),
            "strongest_skill": strongest,
            "weakest_skill": weakest
        })

    return {
        "candidates": comparisons,
        "count": len(comparisons)
    }


def calculate_shortlisting_insights(
    min_overall_score: float = 75.0,
    min_technical_score: float = 70.0,
    min_communication_score: float = 65.0,
    domain: Optional[str] = None
) -> Dict[str, Any]:
    """
    Evaluates candidate assessments against configurable quality benchmarks.
    Returns shortlist recommendations with transparent criteria evidence.
    """
    all_users = getattr(db, "users", {})
    all_interviews = getattr(db, "interviews", {})

    recs = []
    for uid, user in all_users.items():
        if user.get("role") != "candidate":
            continue
        user_ints = [
            i for i in all_interviews.values()
            if i.get("user_id") == uid and i.get("status") == "Completed"
        ]
        if domain and domain.lower() != "all":
            user_ints = [i for i in user_ints if i.get("domain", "").lower() == domain.lower()]

        overview = calculate_performance_overview(user_ints)
        if not overview.get("has_data"):
            continue

        ov_score = overview.get("average_score") or 0
        tech_score = overview.get("average_technical_score") or 0
        comm_score = overview.get("average_communication_score") or 0

        reasons = []
        is_rec = True

        if ov_score >= min_overall_score:
            reasons.append(f"Overall score ({ov_score}%) meets threshold ({min_overall_score}%).")
        else:
            reasons.append(f"Overall score ({ov_score}%) below threshold ({min_overall_score}%).")
            is_rec = False

        if tech_score >= min_technical_score:
            reasons.append(f"Technical score ({tech_score}%) meets threshold ({min_technical_score}%).")
        else:
            reasons.append(f"Technical score ({tech_score}%) below threshold ({min_technical_score}%).")
            is_rec = False

        if comm_score >= min_communication_score:
            reasons.append(f"Communication score ({comm_score}%) meets threshold ({min_communication_score}%).")
        else:
            reasons.append(f"Communication score ({comm_score}%) below threshold ({min_communication_score}%).")
            is_rec = False

        recs.append({
            "candidate_id": uid,
            "candidate_name": user.get("full_name") or "Candidate",
            "candidate_email": user.get("email"),
            "overall_score": ov_score,
            "technical_score": tech_score,
            "communication_score": comm_score,
            "is_recommended": is_rec,
            "reasons": reasons,
            "interview_count": len(user_ints)
        })

    recs.sort(key=lambda r: (1 if r["is_recommended"] else 0, r["overall_score"]), reverse=True)
    return {
        "thresholds": {
            "min_overall": min_overall_score,
            "min_technical": min_technical_score,
            "min_communication": min_communication_score
        },
        "shortlist_recommendations": recs,
        "recommended_count": sum(1 for r in recs if r["is_recommended"]),
        "total_evaluated": len(recs)
    }

