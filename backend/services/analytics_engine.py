import json
import sqlite3
from typing import Dict, List, Any, Optional
from core.database import get_db


def _safe_json(val: Any, default: Any = None) -> Any:
    if val is None:
        return default
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return default


def compute_skill_analytics(user_id: int, conn: sqlite3.Connection) -> Dict[str, Any]:
    sessions = conn.execute("""
        SELECT detailed_parameters_json, technical_score, communication_score, confidence_score, professionalism_score, overall_score
        FROM interview_session
        WHERE (user_id = ? OR candidate_id = ?) AND status = 'completed'
        ORDER BY completed_at DESC
    """, (user_id, user_id)).fetchall()

    assessments = conn.execute("""
        SELECT topic_performance_json, score_percentage
        FROM assessment
        WHERE user_id = ? AND status = 'completed'
        ORDER BY completed_at DESC
    """, (user_id,)).fetchall()

    param_sums: Dict[str, float] = {}
    param_counts: Dict[str, int] = {}

    for s in sessions:
        params = _safe_json(s["detailed_parameters_json"], {})
        tech_base = s["technical_score"] or s["overall_score"] or 0
        comm_base = s["communication_score"] or s["overall_score"] or 0
        conf_base = s["confidence_score"] or s["overall_score"] or 0
        prof_base = s["professionalism_score"] or s["overall_score"] or 0

        default_map = {
            "technical_accuracy": tech_base,
            "problem_solving_ability": tech_base,
            "domain_knowledge": tech_base,
            "keyword_relevance": tech_base,
            "answer_completeness": tech_base,
            "speech_clarity": comm_base,
            "grammar_quality": comm_base,
            "speaking_pace": comm_base,
            "filler_word_freq": comm_base,
            "response_completeness": comm_base,
            "eye_contact_consistency": conf_base,
            "speaking_confidence": conf_base,
            "facial_engagement": conf_base,
            "response_hesitation": conf_base,
            "attention_level": conf_base,
            "time_management": prof_base,
            "response_organization": prof_base,
            "interview_etiquette": prof_base,
        }

        for k, default_v in default_map.items():
            val = params.get(k, default_v) if isinstance(params, dict) else default_v
            try:
                val = float(val)
            except (ValueError, TypeError):
                val = float(default_v)
            param_sums[k] = param_sums.get(k, 0.0) + val
            param_counts[k] = param_counts.get(k, 0) + 1

    topic_sums: Dict[str, float] = {}
    topic_counts: Dict[str, int] = {}
    for a in assessments:
        topics = _safe_json(a["topic_performance_json"], {})
        if isinstance(topics, dict):
            for t_name, t_score in topics.items():
                try:
                    score_val = float(t_score)
                    topic_sums[t_name] = topic_sums.get(t_name, 0.0) + score_val
                    topic_counts[t_name] = topic_counts.get(t_name, 0) + 1
                except (ValueError, TypeError):
                    pass

    def get_avg(k: str, fallback: float = 0.0) -> float:
        if k in param_counts and param_counts[k] > 0:
            return round(param_sums[k] / param_counts[k], 1)
        return fallback

    def get_mastery(score: float) -> str:
        if score >= 85.0:
            return "Expert"
        if score >= 70.0:
            return "Proficient"
        if score >= 50.0:
            return "Developing"
        return "Needs Work"

    technical_competencies = [
        {"name": "Technical Accuracy", "key": "technical_accuracy", "score": get_avg("technical_accuracy"), "mastery": get_mastery(get_avg("technical_accuracy")), "category": "Technical Core"},
        {"name": "Problem Solving", "key": "problem_solving_ability", "score": get_avg("problem_solving_ability"), "mastery": get_mastery(get_avg("problem_solving_ability")), "category": "Technical Core"},
        {"name": "Domain Knowledge", "key": "domain_knowledge", "score": get_avg("domain_knowledge"), "mastery": get_mastery(get_avg("domain_knowledge")), "category": "Technical Core"},
        {"name": "Key Terminology", "key": "keyword_relevance", "score": get_avg("keyword_relevance"), "mastery": get_mastery(get_avg("keyword_relevance")), "category": "Technical Core"},
        {"name": "Solution Completeness", "key": "answer_completeness", "score": get_avg("answer_completeness"), "mastery": get_mastery(get_avg("answer_completeness")), "category": "Technical Core"},
    ]

    for t_name, t_total in topic_sums.items():
        avg_t = round(t_total / max(1, topic_counts[t_name]), 1)
        technical_competencies.append({
            "name": t_name,
            "key": f"topic_{t_name.lower().replace(' ', '_')}",
            "score": avg_t,
            "mastery": get_mastery(avg_t),
            "category": "Practice Topics"
        })

    communication_competencies = [
        {"name": "Speech Clarity & Enunciation", "key": "speech_clarity", "score": get_avg("speech_clarity"), "mastery": get_mastery(get_avg("speech_clarity")), "category": "Communication"},
        {"name": "Grammar & Syntactic Precision", "key": "grammar_quality", "score": get_avg("grammar_quality"), "mastery": get_mastery(get_avg("grammar_quality")), "category": "Communication"},
        {"name": "Speaking Cadence & Pacing", "key": "speaking_pace", "score": get_avg("speaking_pace"), "mastery": get_mastery(get_avg("speaking_pace")), "category": "Communication"},
        {"name": "Verbal Fluency & Filler Control", "key": "filler_word_freq", "score": get_avg("filler_word_freq"), "mastery": get_mastery(get_avg("filler_word_freq")), "category": "Communication"},
        {"name": "Response Structure & Articulation", "key": "response_completeness", "score": get_avg("response_completeness"), "mastery": get_mastery(get_avg("response_completeness")), "category": "Communication"},
    ]

    behavioral_competencies = [
        {"name": "Gaze & Eye Contact Consistency", "key": "eye_contact_consistency", "score": get_avg("eye_contact_consistency"), "mastery": get_mastery(get_avg("eye_contact_consistency")), "category": "Behavior & Presence"},
        {"name": "Speaking Confidence", "key": "speaking_confidence", "score": get_avg("speaking_confidence"), "mastery": get_mastery(get_avg("speaking_confidence")), "category": "Behavior & Presence"},
        {"name": "Facial Engagement & Attentiveness", "key": "facial_engagement", "score": get_avg("facial_engagement"), "mastery": get_mastery(get_avg("facial_engagement")), "category": "Behavior & Presence"},
        {"name": "Poise & Hesitation Control", "key": "response_hesitation", "score": get_avg("response_hesitation"), "mastery": get_mastery(get_avg("response_hesitation")), "category": "Behavior & Presence"},
        {"name": "Professional Etiquette", "key": "interview_etiquette", "score": get_avg("interview_etiquette"), "mastery": get_mastery(get_avg("interview_etiquette")), "category": "Behavior & Presence"},
    ]

    radar_axes = [
        {"axis": "Technical Depth", "score": round(sum(c["score"] for c in technical_competencies[:5]) / 5, 1)},
        {"axis": "Problem Solving", "score": get_avg("problem_solving_ability")},
        {"axis": "Speech Clarity", "score": get_avg("speech_clarity")},
        {"axis": "Fluency & Fillers", "score": get_avg("filler_word_freq")},
        {"axis": "Eye Contact", "score": get_avg("eye_contact_consistency")},
        {"axis": "Confidence", "score": get_avg("speaking_confidence")},
    ]

    return {
        "technical_competencies": technical_competencies,
        "communication_competencies": communication_competencies,
        "behavioral_competencies": behavioral_competencies,
        "radar_axes": radar_axes,
        "total_skills_tracked": len(technical_competencies) + len(communication_competencies) + len(behavioral_competencies)
    }


def predict_weak_areas(user_id: int, conn: sqlite3.Connection) -> Dict[str, Any]:
    skills = compute_skill_analytics(user_id, conn)
    all_competencies = (
        skills["technical_competencies"] +
        skills["communication_competencies"] +
        skills["behavioral_competencies"]
    )

    weakness_catalog = {
        "filler_word_freq": {
            "title": "Verbal Filler Words Under Pressure",
            "description": "High frequency of fillers ('um', 'ah', 'you know') detected during explanation of technical topics.",
            "impact": "Reduces perceived communication authority and interviewer confidence in technical competence.",
            "drill": "Timed Verbal Delivery Drill",
            "drill_type": "hr",
            "focus_topics": ["Communication", "Fluency"],
            "difficulty": "medium"
        },
        "eye_contact_consistency": {
            "title": "Gaze Aversion During Difficult Questions",
            "description": "Noticeable drops in direct camera gaze and eye contact when addressing complex problem statements.",
            "impact": "Signals hesitation or lack of readiness to interviewer panels and vision telemetry AI.",
            "drill": "Vision Proctoring Mock Warmup",
            "drill_type": "behavioral",
            "focus_topics": ["Composure", "Eye Contact"],
            "difficulty": "medium"
        },
        "technical_accuracy": {
            "title": "Technical Depth & Edge Case Coverage",
            "description": "Explanations occasionally miss core trade-offs, complexity analysis, and boundary conditions.",
            "impact": "High risk of failing mid-to-senior technical bar in algorithmic and architectural rounds.",
            "drill": "Algorithms & System Design Practice",
            "drill_type": "technical",
            "focus_topics": ["Data Structures", "System Design"],
            "difficulty": "hard"
        },
        "problem_solving_ability": {
            "title": "Unstructured Problem Decomposition",
            "description": "Tendency to jump directly into code or implementation without clarifying constraints first.",
            "impact": "Interviewer confusion; results in unoptimal design choices and rework.",
            "drill": "Structured Problem Solving Warmup",
            "drill_type": "technical",
            "focus_topics": ["Algorithms", "Core CS"],
            "difficulty": "medium"
        },
        "speaking_pace": {
            "title": "Cadence & Pacing Fluctuations",
            "description": "Speaking rate fluctuates beyond optimal 130–160 WPM cadence during nervous intervals.",
            "impact": "Causes auditory fatigue or makes responses difficult to follow clearly.",
            "drill": "Cadence Pacing & Speech Flow",
            "drill_type": "hr",
            "focus_topics": ["Speaking Pace", "Clarity"],
            "difficulty": "easy"
        },
        "grammar_quality": {
            "title": "Grammar & Sentence Completeness",
            "description": "Occasional grammatical omissions or sentence fragments when formulating long answers.",
            "impact": "Minor friction in professional communication scoring.",
            "drill": "Structured Professional Articulation",
            "drill_type": "hr",
            "focus_topics": ["Grammar", "Professionalism"],
            "difficulty": "medium"
        },
        "response_hesitation": {
            "title": "Initial Response Latency",
            "description": "Prolonged hesitation pauses before beginning response delivery.",
            "impact": "May be interpreted as uncertainty or lack of domain familiarity.",
            "drill": "Rapid Scenario Response Challenge",
            "drill_type": "behavioral",
            "focus_topics": ["Adaptability", "Confidence"],
            "difficulty": "medium"
        },
        "answer_completeness": {
            "title": "STAR Structure Adherence",
            "description": "Answers often skip measurable results and business outcomes in behavioral questions.",
            "impact": "Misses critical rubric scoring points in HR and leadership evaluations.",
            "drill": "STAR Method Behavioral Masterclass",
            "drill_type": "behavioral",
            "focus_topics": ["Leadership", "STAR Method"],
            "difficulty": "medium"
        }
    }

    scored_weaknesses = []
    for c in all_competencies:
        key = c["key"]
        score = c["score"]
        if key in weakness_catalog:
            meta = weakness_catalog[key]
            if score < 50.0:
                severity = "High Risk"
                severity_color = "#f43f5e"
            elif score < 70.0:
                severity = "Moderate Risk"
                severity_color = "#f59e0b"
            else:
                severity = "Watchlist"
                severity_color = "#818cf8"

            scored_weaknesses.append({
                "skill_key": key,
                "skill_name": c["name"],
                "current_score": score,
                "severity": severity,
                "severity_color": severity_color,
                "title": meta["title"],
                "description": meta["description"],
                "impact": meta["impact"],
                "recommended_drill": meta["drill"],
                "drill_type": meta["drill_type"],
                "focus_topics": meta["focus_topics"],
                "difficulty": meta["difficulty"]
            })

    scored_weaknesses.sort(key=lambda x: x["current_score"])
    predicted_weak_areas = scored_weaknesses[:4]

    high_risk_count = sum(1 for w in predicted_weak_areas if w["severity"] == "High Risk")
    mod_risk_count = sum(1 for w in predicted_weak_areas if w["severity"] == "Moderate Risk")

    overall_scores_row = conn.execute("""
        SELECT AVG(overall_score) FROM interview_session
        WHERE (user_id = ? OR candidate_id = ?) AND status = 'completed' AND overall_score IS NOT NULL
    """, (user_id, user_id)).fetchone()
    avg_score = round(overall_scores_row[0], 1) if overall_scores_row and overall_scores_row[0] is not None else 0.0

    if avg_score >= 80 and high_risk_count == 0:
        readiness_index = min(95.0, round(avg_score * 1.05, 1))
        readiness_label = "Interview Ready — Low Rejection Risk"
        readiness_color = "#10b981"
    elif avg_score >= 60 and high_risk_count <= 1:
        readiness_index = round(avg_score, 1)
        readiness_label = "Approaching Readiness — Address Moderate Gaps"
        readiness_color = "#f59e0b"
    elif avg_score > 0:
        readiness_index = max(15.0, round(avg_score * 0.9, 1))
        readiness_label = "Elevated Interview Risk — Remedial Practice Recommended"
        readiness_color = "#f43f5e"
    else:
        readiness_index = 0.0
        readiness_label = "Unassessed — Complete Initial Sessions"
        readiness_color = "#94a3b8"

    return {
        "readiness_index": readiness_index,
        "readiness_label": readiness_label,
        "readiness_color": readiness_color,
        "high_risk_count": high_risk_count,
        "moderate_risk_count": mod_risk_count,
        "predicted_weak_areas": predicted_weak_areas,
        "total_analyzed": len(all_competencies)
    }


def compute_performance_trends(user_id: int, conn: sqlite3.Connection) -> Dict[str, Any]:
    rows = conn.execute("""
        SELECT id, interview_type, domain, overall_score, total_score, technical_score, communication_score, confidence_score, completed_at, created_at
        FROM interview_session
        WHERE (user_id = ? OR candidate_id = ?) AND status = 'completed'
        ORDER BY COALESCE(completed_at, created_at) ASC
    """, (user_id, user_id)).fetchall()

    timeline = []
    overall_series = []
    tech_series = []
    comm_series = []
    conf_series = []

    for idx, r in enumerate(rows):
        ov = r["overall_score"] if r["overall_score"] is not None else (r["total_score"] or 0.0)
        tc = r["technical_score"] if r["technical_score"] is not None else ov
        cm = r["communication_score"] if r["communication_score"] is not None else ov
        cf = r["confidence_score"] if r["confidence_score"] is not None else ov

        ov = round(float(ov), 1)
        tc = round(float(tc), 1)
        cm = round(float(cm), 1)
        cf = round(float(cf), 1)

        dt = r["completed_at"] or r["created_at"] or ""
        label = f"#{r['id']}"

        timeline.append({
            "session_id": r["id"],
            "index": idx + 1,
            "label": label,
            "date": dt,
            "interview_type": r["interview_type"],
            "domain": r["domain"] or "General Practice",
            "overall_score": ov,
            "technical_score": tc,
            "communication_score": cm,
            "confidence_score": cf,
        })
        overall_series.append(ov)
        tech_series.append(tc)
        comm_series.append(cm)
        conf_series.append(cf)

    velocity = 0.0
    trajectory = "Steady"
    trajectory_color = "#818cf8"
    if len(overall_series) >= 2:
        diff = overall_series[-1] - overall_series[0]
        velocity = round(diff / (len(overall_series) - 1), 2)
        if velocity >= 3.0:
            trajectory = "Accelerating Improvement"
            trajectory_color = "#10b981"
        elif velocity > 0.5:
            trajectory = "Steady Progress"
            trajectory_color = "#818cf8"
        elif velocity >= -1.0:
            trajectory = "Score Plateau"
            trajectory_color = "#f59e0b"
        else:
            trajectory = "Regressing / High Variance"
            trajectory_color = "#f43f5e"

    return {
        "timeline": timeline,
        "overall_series": overall_series,
        "technical_series": tech_series,
        "communication_series": comm_series,
        "confidence_series": conf_series,
        "velocity": velocity,
        "trajectory": trajectory,
        "trajectory_color": trajectory_color,
        "sessions_count": len(timeline)
    }


def compute_candidate_ranking(user_id: int, conn: sqlite3.Connection) -> Dict[str, Any]:
    user_row = conn.execute("""
        SELECT u.id, u.name,
               AVG(s.overall_score) as avg_overall,
               AVG(s.technical_score) as avg_tech,
               AVG(s.communication_score) as avg_comm,
               AVG(s.confidence_score) as avg_conf,
               MAX(s.domain) as primary_domain,
               COUNT(s.id) as sessions_count
        FROM users u
        LEFT JOIN interview_session s ON (u.id = s.candidate_id OR u.id = s.user_id) AND s.status = 'completed'
        WHERE u.id = ?
        GROUP BY u.id
    """, (user_id,)).fetchone()

    if not user_row or user_row["sessions_count"] == 0:
        return {
            "percentile": 50.0,
            "cohort_standing": "Unranked — Complete Sessions to Unlock",
            "standing_badge": "Developing",
            "domain": "Software Engineering",
            "user_overall": 0.0,
            "user_technical": 0.0,
            "user_communication": 0.0,
            "user_confidence": 0.0,
            "cohort_overall_avg": 0.0,
            "cohort_technical_avg": 0.0,
            "cohort_communication_avg": 0.0,
            "cohort_confidence_avg": 0.0,
            "total_cohort_candidates": 0,
            "rank_position": 0
        }

    user_ov = round(user_row["avg_overall"] or 0.0, 1)
    user_tc = round(user_row["avg_tech"] or 0.0, 1)
    user_cm = round(user_row["avg_comm"] or 0.0, 1)
    user_cf = round(user_row["avg_conf"] or 0.0, 1)
    domain = user_row["primary_domain"] or "Software Engineering"

    cohort_rows = conn.execute("""
        SELECT u.id,
               AVG(s.overall_score) as avg_overall,
               AVG(s.technical_score) as avg_tech,
               AVG(s.communication_score) as avg_comm,
               AVG(s.confidence_score) as avg_conf
        FROM users u
        JOIN interview_session s ON (u.id = s.candidate_id OR u.id = s.user_id) AND s.status = 'completed'
        WHERE u.role = 'candidate' AND s.overall_score IS NOT NULL
        GROUP BY u.id
    """).fetchall()

    if not cohort_rows:
        cohort_rows = [user_row]

    total_candidates = len(cohort_rows)
    lower_count = sum(1 for c in cohort_rows if (c["avg_overall"] or 0.0) < user_ov)
    equal_count = sum(1 for c in cohort_rows if (c["avg_overall"] or 0.0) == user_ov)

    # Standard percentile formula
    percentile = round(((lower_count + (0.5 * equal_count)) / max(1, total_candidates)) * 100, 1)
    percentile = max(5.0, min(99.0, percentile))

    cohort_ov_avg = round(sum(c["avg_overall"] or 0.0 for c in cohort_rows) / total_candidates, 1)
    cohort_tc_avg = round(sum(c["avg_tech"] or 0.0 for c in cohort_rows) / total_candidates, 1)
    cohort_cm_avg = round(sum(c["avg_comm"] or 0.0 for c in cohort_rows) / total_candidates, 1)
    cohort_cf_avg = round(sum(c["avg_conf"] or 0.0 for c in cohort_rows) / total_candidates, 1)

    sorted_cohort = sorted(cohort_rows, key=lambda x: (x["avg_overall"] or 0.0), reverse=True)
    rank_pos = 1
    for idx, c in enumerate(sorted_cohort):
        if c["id"] == user_id:
            rank_pos = idx + 1
            break

    if percentile >= 90.0:
        standing = f"Top 10% in {domain}"
        standing_badge = "Elite Performer"
    elif percentile >= 75.0:
        standing = f"Top 25% (Upper Quartile) in {domain}"
        standing_badge = "Strong Candidate"
    elif percentile >= 50.0:
        standing = f"Top 50% (Above Median) in {domain}"
        standing_badge = "Competitive"
    else:
        standing = f"Growth Cohort in {domain}"
        standing_badge = "Developing"

    return {
        "percentile": percentile,
        "cohort_standing": standing,
        "standing_badge": standing_badge,
        "domain": domain,
        "user_overall": user_ov,
        "user_technical": user_tc,
        "user_communication": user_cm,
        "user_confidence": user_cf,
        "cohort_overall_avg": cohort_ov_avg,
        "cohort_technical_avg": cohort_tc_avg,
        "cohort_communication_avg": cohort_cm_avg,
        "cohort_confidence_avg": cohort_cf_avg,
        "total_cohort_candidates": total_candidates,
        "rank_position": rank_pos
    }


def get_comprehensive_analytics(user_id: int) -> Dict[str, Any]:
    conn = get_db()
    skills = compute_skill_analytics(user_id, conn)
    weak_areas = predict_weak_areas(user_id, conn)
    trends = compute_performance_trends(user_id, conn)
    ranking = compute_candidate_ranking(user_id, conn)

    summary_row = conn.execute("""
        SELECT COUNT(id) as sessions_completed,
               AVG(overall_score) as avg_overall,
               AVG(communication_score) as avg_comm,
               AVG(confidence_score) as avg_conf,
               AVG(technical_score) as avg_tech,
               AVG(professionalism_score) as avg_prof
        FROM interview_session
        WHERE (user_id = ? OR candidate_id = ?) AND status = 'completed'
    """, (user_id, user_id)).fetchone()

    total_sessions = summary_row["sessions_completed"] if summary_row else 0
    avg_ov = round(summary_row["avg_overall"], 1) if summary_row and summary_row["avg_overall"] is not None else 0.0
    avg_cm = round(summary_row["avg_comm"], 1) if summary_row and summary_row["avg_comm"] is not None else 0.0
    avg_cf = round(summary_row["avg_conf"], 1) if summary_row and summary_row["avg_conf"] is not None else 0.0
    avg_tc = round(summary_row["avg_tech"], 1) if summary_row and summary_row["avg_tech"] is not None else 0.0
    avg_pf = round(summary_row["avg_prof"], 1) if summary_row and summary_row["avg_prof"] is not None else 0.0

    if avg_ov >= 90:
        rubric = "Excellent"
    elif avg_ov >= 75:
        rubric = "Good"
    elif avg_ov >= 60:
        rubric = "Average"
    elif avg_ov >= 40:
        rubric = "Needs Improvement"
    else:
        rubric = "Poor"

    skill_averages = {
        "Communication": avg_cm,
        "Confidence": avg_cf,
        "Technical Relevance": avg_tc,
        "Professionalism": avg_pf,
    }
    top_skill = max(skill_averages, key=skill_averages.get) if total_sessions > 0 else "—"

    conn.close()

    return {
        "sessions_completed": total_sessions,
        "avg_overall": avg_ov,
        "avg_communication": avg_cm,
        "avg_confidence": avg_cf,
        "avg_technical": avg_tc,
        "avg_professionalism": avg_pf,
        "performance_rating": rubric if total_sessions > 0 else None,
        "top_skill": top_skill,
        "skills": skills,
        "weak_areas": weak_areas,
        "trends": trends,
        "ranking": ranking
    }
