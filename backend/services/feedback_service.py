import logging
from typing import Dict, Any, List

logger = logging.getLogger("feedback_service")


def _is_blank_or_insufficient(evaluation: Dict[str, Any]) -> bool:
    """Helper to detect if evaluation has insufficient data across all categories."""
    cat_scores = evaluation.get("category_scores", {})
    if not cat_scores:
        return True
    
    # Check if all categories are unavailable or have status insufficient_data/no_answers
    all_unavail = True
    for cat_data in cat_scores.values():
        if isinstance(cat_data, dict) and cat_data.get("available", False) and cat_data.get("status") == "evaluated":
            all_unavail = False
            break
            
    return all_unavail


def identify_strengths(evaluation: Dict[str, Any]) -> List[str]:
    """Identifies top 3-5 genuinely highest performing parameters."""
    if _is_blank_or_insufficient(evaluation):
        return ["No sufficient interview data available for evaluation."]

    cat_scores = evaluation.get("category_scores", {})
    comm_metrics = evaluation.get("communication_analysis", {})
    conf_metrics = evaluation.get("confidence_analysis", {})
    tech_metrics = evaluation.get("technical_analysis", {})
    prof_metrics = evaluation.get("professionalism_analysis", {})

    candidates = []

    # Communication
    if comm_metrics.get("speech_clarity", {}).get("available") and comm_metrics.get("speech_clarity", {}).get("score", 0) >= 80:
        candidates.append((comm_metrics["speech_clarity"]["score"], "Clear speech clarity and articulation throughout responses."))
    if comm_metrics.get("grammar_quality", {}).get("available") and comm_metrics.get("grammar_quality", {}).get("score", 0) >= 80:
        candidates.append((comm_metrics["grammar_quality"]["score"], "Strong sentence structure and grammatical correctness."))
    if comm_metrics.get("speaking_pace", {}).get("available") and comm_metrics.get("speaking_pace", {}).get("score", 0) >= 80:
        candidates.append((comm_metrics["speaking_pace"]["score"], "Maintained a steady and optimal speaking pace (120-160 WPM)."))
    if comm_metrics.get("filler_word_control", {}).get("available") and comm_metrics.get("filler_word_control", {}).get("score", 0) >= 80:
        candidates.append((comm_metrics["filler_word_control"]["score"], "Excellent control over filler words and verbal pauses."))

    # Confidence
    if conf_metrics.get("eye_contact_consistency", {}).get("available") and conf_metrics.get("eye_contact_consistency", {}).get("score", 0) >= 75:
        candidates.append((conf_metrics["eye_contact_consistency"]["score"], "Consistent camera-facing eye contact during question responses."))
    if conf_metrics.get("facial_engagement", {}).get("available") and conf_metrics.get("facial_engagement", {}).get("score", 0) >= 75:
        candidates.append((conf_metrics["facial_engagement"]["score"], "Composed and attentive facial engagement during the session."))

    # Technical
    if tech_metrics.get("technical_accuracy", {}).get("available") and tech_metrics.get("technical_accuracy", {}).get("score", 0) >= 75:
        candidates.append((tech_metrics["technical_accuracy"]["score"], "High technical accuracy and sound understanding of core concepts."))
    if tech_metrics.get("keyword_relevance", {}).get("available") and tech_metrics.get("keyword_relevance", {}).get("score", 0) >= 75:
        candidates.append((tech_metrics["keyword_relevance"]["score"], "Effective inclusion of relevant domain terminology and key concepts."))
    if tech_metrics.get("problem_solving_ability", {}).get("available") and tech_metrics.get("problem_solving_ability", {}).get("score", 0) >= 75:
        candidates.append((tech_metrics["problem_solving_ability"]["score"], "Structured problem-solving approach with logical explanations."))

    # Professionalism
    if prof_metrics.get("interview_etiquette", {}).get("available") and prof_metrics.get("interview_etiquette", {}).get("score", 0) >= 90:
        candidates.append((prof_metrics["interview_etiquette"]["score"], "Flawless interview etiquette with zero environment or integrity violations."))
    if prof_metrics.get("time_management", {}).get("available") and prof_metrics.get("time_management", {}).get("score", 0) >= 80:
        candidates.append((prof_metrics["time_management"]["score"], "Effective time management and prompt completion of interview questions."))

    candidates.sort(key=lambda x: x[0], reverse=True)
    strengths = [item[1] for item in candidates[:5]]
    
    if not strengths:
        strengths = ["No sufficient interview performance strengths recorded."]

    return strengths


def identify_weaknesses(evaluation: Dict[str, Any]) -> List[str]:
    """Identifies areas requiring improvement based on low metrics and violations."""
    if _is_blank_or_insufficient(evaluation):
        return [
            "No valid verbal responses were detected.",
            "No meaningful technical answers were provided.",
            "No usable camera or face data was available."
        ]

    weaknesses = []
    comm_metrics = evaluation.get("communication_analysis", {})
    conf_metrics = evaluation.get("confidence_analysis", {})
    tech_metrics = evaluation.get("technical_analysis", {})
    prof_metrics = evaluation.get("professionalism_analysis", {})

    # Communication
    fill_metric = comm_metrics.get("filler_word_control", {})
    if fill_metric.get("available") and fill_metric.get("score") is not None and fill_metric["score"] < 75:
        weaknesses.append("Frequent filler word usage reduced overall verbal clarity.")

    gram_metric = comm_metrics.get("grammar_quality", {})
    if gram_metric.get("available") and gram_metric.get("score") is not None and gram_metric["score"] < 75:
        weaknesses.append("Sentence structure and grammatical accuracy could be improved.")

    pace_metric = comm_metrics.get("speaking_pace", {})
    if pace_metric.get("available") and pace_metric.get("score") is not None and pace_metric["score"] < 75:
        wpm = pace_metric.get("wpm", 0)
        if wpm > 160:
            weaknesses.append(f"Speaking pace was slightly fast ({wpm} WPM). Aim for 120-160 WPM.")
        else:
            weaknesses.append(f"Speaking pace was slightly slow ({wpm} WPM). Aim for 120-160 WPM.")

    # Confidence
    eye_metric = conf_metrics.get("eye_contact_consistency", {})
    if eye_metric.get("available") and eye_metric.get("score") is not None and eye_metric["score"] < 75:
        weaknesses.append("Eye contact consistency decreased during longer technical answers.")

    hes_metric = conf_metrics.get("response_hesitation", {})
    if hes_metric.get("available") and hes_metric.get("score") is not None and hes_metric["score"] < 75:
        weaknesses.append("Noticeable pauses or look-away delays before initiating responses.")

    # Technical
    acc_metric = tech_metrics.get("technical_accuracy", {})
    if acc_metric.get("available") and acc_metric.get("score") is not None and acc_metric["score"] < 75:
        weaknesses.append("Several technical explanations lacked depth or exact concept accuracy.")

    kw_metric = tech_metrics.get("keyword_relevance", {})
    if kw_metric.get("available") and kw_metric.get("score") is not None and kw_metric["score"] < 75:
        weaknesses.append("Domain keyword coverage was lower than expected for the role difficulty.")

    # Professionalism / Etiquette
    et_metric = prof_metrics.get("interview_etiquette", {})
    if et_metric.get("available") and et_metric.get("score") is not None and et_metric["score"] < 85:
        violations = et_metric.get("violations", [])
        if violations:
            weaknesses.append(f"Recorded interview environment flags: {', '.join(violations)}.")
        else:
            weaknesses.append("Interview etiquette score was affected during session execution.")

    if not weaknesses:
        weaknesses.append("No major performance weaknesses were identified in this interview session.")

    return weaknesses


def generate_improvement_suggestions(evaluation: Dict[str, Any], weaknesses: List[str]) -> List[str]:
    """Generates actionable improvement suggestions mapped to identified weaknesses."""
    if _is_blank_or_insufficient(evaluation):
        return [
            "Ensure the camera is working before starting the interview.",
            "Keep your face visible during the interview.",
            "Provide verbal answers to each question.",
            "Check microphone permissions before starting.",
            "Stay engaged throughout the interview session."
        ]

    suggestions = []
    for w in weaknesses:
        w_lower = w.lower()
        if "filler" in w_lower:
            suggestions.append("Pause silently for 1-2 seconds instead of using filler words when gathering your thoughts.")
        elif "grammar" in w_lower or "sentence" in w_lower:
            suggestions.append("Structure answers using complete subject-verb sentences and rehearse technical key points beforehand.")
        elif "pace" in w_lower or "wpm" in w_lower:
            suggestions.append("Practice speaking at a comfortable cadence of 120-160 WPM using a countdown clock.")
        elif "eye contact" in w_lower:
            suggestions.append("Position your webcam at eye level and look directly near the camera lens when speaking.")
        elif "pauses" in w_lower or "hesitation" in w_lower:
            suggestions.append("Use brief 2-second structured thinking frameworks before answering to minimize hesitation.")
        elif "accuracy" in w_lower or "depth" in w_lower:
            suggestions.append("Structure answers using the Concept -> Explanation -> Practical Example framework.")
        elif "keyword" in w_lower:
            suggestions.append("Review core domain terminology and incorporate explicit industry terms into explanations.")
        elif "etiquette" in w_lower or "environment" in w_lower:
            suggestions.append("Maintain full-screen focus and ensure mobile devices are placed outside camera view.")

    if not suggestions:
        suggestions.append("Continue maintaining your strong technical and communication preparation for future interviews.")

    return suggestions


def generate_practice_recommendations(evaluation: Dict[str, Any], weaknesses: List[str]) -> List[str]:
    """Generates targeted drill exercises based on evaluation metrics."""
    if _is_blank_or_insufficient(evaluation):
        return [
            "Complete a full interview session with a working webcam and microphone enabled."
        ]

    drills = []
    cat_scores = evaluation.get("category_scores", {})
    comm = cat_scores.get("communication", {})
    conf = cat_scores.get("confidence", {})
    tech = cat_scores.get("technical_relevance", {})

    if comm.get("available") and comm.get("score") is not None and comm["score"] < 75:
        drills.append("Daily 2-Minute Speech Drill: Record yourself explaining a technical topic for 2 minutes and review filler words.")
    if conf.get("available") and conf.get("score") is not None and conf["score"] < 75:
        drills.append("Webcam Alignment Drill: Practice delivering 90-second responses while keeping eye contact centered near the camera.")
    if tech.get("available") and tech.get("score") is not None and tech["score"] < 75:
        drills.append("Domain Practice Drill: Solve 3 domain-specific technical scenarios daily and explain your step-by-step reasoning aloud.")

    if not drills:
        drills.append("Timed Mock Interview Sessions: Complete 1 full-length mock interview per week to maintain peak performance.")

    return drills


def generate_learning_resources(evaluation: Dict[str, Any], weaknesses: List[str]) -> List[Dict[str, str]]:
    """Generates structured topic and reason resource recommendations."""
    if _is_blank_or_insufficient(evaluation):
        return [
            {
                "topic": "Interview Setup & Hardware Requirements",
                "reason": "Ensure camera and microphone permissions are properly enabled before beginning the interview."
            }
        ]

    resources = []
    cat_scores = evaluation.get("category_scores", {})
    comm = cat_scores.get("communication", {})
    conf = cat_scores.get("confidence", {})
    tech = cat_scores.get("technical_relevance", {})
    prof = cat_scores.get("professionalism", {})

    if comm.get("available") and comm.get("score") is not None and comm["score"] < 75:
        resources.append({
            "topic": "Effective Business & Technical Communication",
            "reason": "Improve verbal clarity, speech pacing, and filler word control."
        })

    if conf.get("available") and conf.get("score") is not None and conf["score"] < 75:
        resources.append({
            "topic": "Executive Presence & Camera Confidence for Online Interviews",
            "reason": "Enhance eye contact consistency, facial composure, and non-verbal delivery."
        })

    if tech.get("available") and tech.get("score") is not None and tech["score"] < 75:
        resources.append({
            "topic": "Domain Architecture & System Design Fundamentals",
            "reason": "Strengthen technical accuracy, keyword relevance, and structured problem-solving."
        })

    if prof.get("available") and prof.get("score") is not None and prof["score"] < 80:
        resources.append({
            "topic": "Professional Interview Etiquette & Time Management",
            "reason": "Master structured answer organization and environment compliance."
        })

    if not resources:
        resources.append({
            "topic": "Advanced Technical Interview Mastery",
            "reason": "Maintain top-tier candidate performance and competitive edge."
        })

    return resources


def generate_complete_ai_feedback(evaluation: Dict[str, Any]) -> Dict[str, Any]:
    """
    Consumes computed performance evaluation metrics and generates the 5 structured feedback sections.
    """
    strengths = identify_strengths(evaluation)
    weaknesses = identify_weaknesses(evaluation)
    suggestions = generate_improvement_suggestions(evaluation, weaknesses)
    drills = generate_practice_recommendations(evaluation, weaknesses)
    resources = generate_learning_resources(evaluation, weaknesses)

    return {
        "strengths": strengths,
        "weaknesses": weaknesses,
        "improvement_suggestions": suggestions,
        "practice_recommendations": drills,
        "learning_resources": resources
    }

