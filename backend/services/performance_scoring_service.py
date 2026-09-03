import re
import math
import logging
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from models.interview import (
    InterviewSession,
    Interview,
    InterviewQuestion,
    SpeechAnalysis,
    InterviewBehaviorAnalysis,
    InterviewQuestionAttempt
)

logger = logging.getLogger("performance_scoring_service")

# Explicit evaluation status constants
STATUS_EVALUATED = "evaluated"
STATUS_INSUFFICIENT_DATA = "insufficient_data"
STATUS_NO_ANSWERS = "no_answers"
STATUS_EVALUATION_FAILED = "evaluation_failed"

# Exact required Overall Category Weights (Fixed, no re-normalization for missing data)
CATEGORY_WEIGHTS = {
    "communication": 0.30,
    "confidence": 0.25,
    "technical_relevance": 0.30,
    "professionalism": 0.15
}

# Sub-parameter internal weights per category
PARAM_WEIGHTS = {
    "communication": {
        "speech_clarity": 0.20,
        "grammar_quality": 0.25,
        "filler_word_control": 0.15,
        "speaking_pace": 0.15,
        "response_completeness": 0.25
    },
    "confidence": {
        "eye_contact_consistency": 0.30,
        "facial_engagement": 0.20,
        "response_hesitation": 0.15,
        "speaking_confidence": 0.20,
        "attention_level": 0.15
    },
    "technical_relevance": {
        "technical_accuracy": 0.30,
        "keyword_relevance": 0.15,
        "problem_solving_ability": 0.20,
        "domain_knowledge": 0.20,
        "answer_completeness": 0.15
    },
    "professionalism": {
        "time_management": 0.25,
        "response_organization": 0.30,
        "professional_communication": 0.25,
        "interview_etiquette": 0.20
    }
}


def get_performance_rating(overall_score: Optional[float], all_unavailable: bool = False) -> str:
    """
    Assigns performance rating based on strict boundary rubric:
      If all categories unavailable -> Insufficient Data
      If overall_score is None -> N/A
      90.0 <= score <= 100.0 -> Excellent
      75.0 <= score < 90.0   -> Good
      60.0 <= score < 75.0   -> Average
      40.0 <= score < 60.0   -> Needs Improvement
      score < 40.0           -> Poor
    """
    if all_unavailable:
        return "Insufficient Data"
    if overall_score is None:
        return "N/A"
    
    score = round(float(overall_score), 2)
    if score >= 90.0:
        return "Excellent"
    elif score >= 75.0:
        return "Good"
    elif score >= 60.0:
        return "Average"
    elif score >= 40.0:
        return "Needs Improvement"
    else:
        return "Poor"


def calculate_weighted_score(metrics_dict: Dict[str, Dict[str, Any]], weights_dict: Dict[str, float]) -> Tuple[float, bool]:
    """
    Calculates category score from available metrics.
    If no valid metrics exist, returns (0.0, False).
    """
    active_weight_sum = 0.0
    weighted_score_sum = 0.0
    has_available = False

    for param_key, weight in weights_dict.items():
        metric = metrics_dict.get(param_key, {})
        if metric.get("available", False) and metric.get("score") is not None:
            score = float(metric["score"])
            clamped_score = max(0.0, min(100.0, score))
            weighted_score_sum += clamped_score * weight
            active_weight_sum += weight
            has_available = True

    if not has_available or active_weight_sum <= 0:
        return 0.0, False

    category_score = round(weighted_score_sum / active_weight_sum, 1)
    return max(0.0, min(100.0, category_score)), True


def collect_communication_metrics(db: Session, session: InterviewSession) -> Dict[str, Dict[str, Any]]:
    """Collects Communication parameters (30% weight) from Module 5 speech analyses."""
    speech_records = db.query(SpeechAnalysis).filter(SpeechAnalysis.session_id == session.id).all()
    
    total_words = sum(r.word_count or 0 for r in speech_records) if speech_records else 0
    if not speech_records or total_words == 0:
        reason_msg = "No valid speech, transcript, or verbal response data was detected."
        return {
            "speech_clarity": {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": reason_msg},
            "grammar_quality": {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": reason_msg},
            "filler_word_control": {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": reason_msg},
            "speaking_pace": {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": reason_msg},
            "response_completeness": {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": reason_msg}
        }

    clarity_scores = [r.clarity_score for r in speech_records if r.clarity_score is not None]
    grammar_scores = [r.grammar_score for r in speech_records if r.grammar_score is not None]
    total_fillers = sum(r.filler_word_count or 0 for r in speech_records)
    wpms = [r.words_per_minute for r in speech_records if r.words_per_minute is not None and r.words_per_minute > 0]
    word_counts = [r.word_count or 0 for r in speech_records]

    # 1. Speech Clarity
    if clarity_scores:
        avg_clarity = round(sum(clarity_scores) / len(clarity_scores), 1)
        clarity_metric = {"score": avg_clarity, "available": True, "status": STATUS_EVALUATED}
    else:
        clarity_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "Speech clarity measurements unavailable."}

    # 2. Grammar Quality
    if grammar_scores:
        avg_grammar = round(sum(grammar_scores) / len(grammar_scores), 1)
        grammar_metric = {"score": avg_grammar, "available": True, "status": STATUS_EVALUATED}
    else:
        grammar_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "Grammar evaluation unavailable."}

    # 3. Filler Word Control
    if total_words > 0:
        filler_rate = (total_fillers / total_words) * 100.0
        if filler_rate <= 2.0:
            filler_score = 95.0
        elif filler_rate <= 5.0:
            filler_score = 85.0
        elif filler_rate <= 8.0:
            filler_score = 75.0
        else:
            filler_score = max(30.0, 75.0 - (filler_rate - 8.0) * 5.0)
        filler_metric = {"score": round(filler_score, 1), "available": True, "status": STATUS_EVALUATED, "filler_rate_percent": round(filler_rate, 1), "filler_count": total_fillers}
    else:
        filler_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "Insufficient spoken words for filler frequency analysis."}

    # 4. Speaking Pace
    if wpms:
        avg_wpm = round(sum(wpms) / len(wpms), 1)
        if 120 <= avg_wpm <= 160:
            pace_score = 95.0
        elif 100 <= avg_wpm < 120:
            pace_score = 80.0
        elif 160 < avg_wpm <= 180:
            pace_score = 80.0
        elif avg_wpm < 100:
            pace_score = max(30.0, 80.0 - (100.0 - avg_wpm) * 0.8)
        else:
            pace_score = max(30.0, 80.0 - (avg_wpm - 180.0) * 0.8)
        pace_metric = {"score": round(pace_score, 1), "available": True, "status": STATUS_EVALUATED, "wpm": avg_wpm}
    else:
        pace_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "Speaking pace (WPM) data unavailable."}

    # 5. Response Completeness
    if word_counts and max(word_counts) > 0:
        avg_words = sum(word_counts) / len(word_counts)
        if avg_words >= 50:
            comp_score = 92.0
        elif avg_words >= 25:
            comp_score = 82.0
        elif avg_words >= 10:
            comp_score = 70.0
        else:
            comp_score = 50.0
        completeness_metric = {"score": round(comp_score, 1), "available": True, "status": STATUS_EVALUATED, "avg_word_count": round(avg_words, 1)}
    else:
        completeness_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "Response length data unavailable."}

    return {
        "speech_clarity": clarity_metric,
        "grammar_quality": grammar_metric,
        "filler_word_control": filler_metric,
        "speaking_pace": pace_metric,
        "response_completeness": completeness_metric
    }


def collect_confidence_metrics(db: Session, session: InterviewSession) -> Dict[str, Dict[str, Any]]:
    """Collects Confidence parameters (25% weight) from Module 6 behavior analysis."""
    behavior_rec = db.query(InterviewBehaviorAnalysis).filter(InterviewBehaviorAnalysis.session_id == session.id).first()

    face_detected_any = False
    if behavior_rec:
        conf_frames = (behavior_rec.confident_frames_count or 0) + (behavior_rec.unconfident_frames_count or 0)
        face_detected_any = conf_frames > 0 or behavior_rec.eye_contact_percentage is not None or behavior_rec.confidence_score is not None

    if not behavior_rec or (behavior_rec.total_analyzed_frames or 0) == 0 or not face_detected_any:
        reason_msg = "No usable camera or face detection data was available."
        return {
            "eye_contact_consistency": {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": reason_msg},
            "facial_engagement": {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": reason_msg},
            "response_hesitation": {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": reason_msg},
            "speaking_confidence": {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": reason_msg},
            "attention_level": {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": reason_msg}
        }

    # 1. Eye-Contact Consistency
    eye_pct = behavior_rec.eye_contact_percentage
    if eye_pct is not None:
        eye_score = round(float(eye_pct), 1)
        eye_metric = {"score": min(100.0, eye_score), "available": True, "status": STATUS_EVALUATED}
    else:
        eye_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "Eye contact data unavailable."}

    # 2. Facial Engagement
    eng_score = behavior_rec.engagement_score
    if eng_score is not None:
        facial_metric = {"score": round(float(eng_score), 1), "available": True, "status": STATUS_EVALUATED, "facial_presentation": behavior_rec.facial_presentation or "Composed"}
    else:
        facial_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "Facial engagement metric unavailable."}

    # 3. Response Hesitation (Evaluated ONLY when face was detected)
    look_away_events = behavior_rec.look_away_events_count or 0
    absence_events = behavior_rec.face_absence_events_count or 0
    if look_away_events == 0 and absence_events == 0:
        hes_score = 95.0
    elif look_away_events <= 2 and absence_events == 0:
        hes_score = 85.0
    elif look_away_events <= 5:
        hes_score = 75.0
    else:
        hes_score = max(30.0, 75.0 - (look_away_events - 5) * 5.0)
    hesitation_metric = {"score": round(hes_score, 1), "available": True, "status": STATUS_EVALUATED, "look_away_events": look_away_events}

    # 4. Speaking Confidence
    conf_score = behavior_rec.confidence_score
    if conf_score is not None:
        confidence_metric = {"score": round(float(conf_score), 1), "available": True, "status": STATUS_EVALUATED}
    else:
        confidence_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "Visual confidence score unavailable."}

    # 5. Attention Level
    att_score = behavior_rec.attention_score
    if att_score is not None:
        final_att = float(att_score)
        if behavior_rec.mobile_detected and (behavior_rec.mobile_event_count or 0) > 0:
            final_att = max(0.0, final_att - (behavior_rec.mobile_event_count * 10.0))
        attention_metric = {"score": round(final_att, 1), "available": True, "status": STATUS_EVALUATED}
    else:
        attention_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "Attention level score unavailable."}

    return {
        "eye_contact_consistency": eye_metric,
        "facial_engagement": facial_metric,
        "response_hesitation": hesitation_metric,
        "speaking_confidence": confidence_metric,
        "attention_level": attention_metric
    }


def _evaluate_answer_deterministic_fallback(question_text: str, expected_answer: Optional[str], evaluation_points: Any, user_answer: str) -> Dict[str, float]:
    """Deterministic answer evaluator returning 0 score for missing/blank answers."""
    ans_clean = (user_answer or "").strip()
    if not ans_clean or ans_clean.lower() in ["no response provided.", "no answer submitted.", "n/a", "none"]:
        return {
            "technical_accuracy": 0.0,
            "keyword_relevance": 0.0,
            "problem_solving": 0.0,
            "domain_knowledge": 0.0,
            "answer_completeness": 0.0
        }

    words = re.findall(r'\b\w+\b', ans_clean.lower())
    word_count = len(words)
    if word_count == 0:
        return {
            "technical_accuracy": 0.0,
            "keyword_relevance": 0.0,
            "problem_solving": 0.0,
            "domain_knowledge": 0.0,
            "answer_completeness": 0.0
        }

    target_source = f"{question_text} {expected_answer or ''}"
    if evaluation_points and isinstance(evaluation_points, list):
        target_source += " " + " ".join(str(p) for p in evaluation_points)
    
    kw_candidates = [w.lower() for w in re.findall(r'\b[a-zA-Z]{4,}\b', target_source)]
    stop_words = {"what", "how", "why", "explain", "describe", "define", "using", "with", "that", "this", "from", "have", "your", "more", "should", "could", "would", "which", "their", "there", "about", "given"}
    keywords = list(set([k for k in kw_candidates if k not in stop_words]))

    if keywords:
        matches = [k for k in keywords if k in ans_clean.lower()]
        kw_ratio = len(matches) / len(keywords)
        kw_score = min(100.0, round(kw_ratio * 120.0, 1))
    else:
        kw_score = 80.0 if word_count >= 15 else 50.0

    if word_count >= 30 and kw_score >= 60.0:
        accuracy_score = min(100.0, kw_score + 10.0)
    elif word_count >= 15:
        accuracy_score = kw_score
    elif word_count >= 5:
        accuracy_score = max(40.0, kw_score - 15.0)
    else:
        accuracy_score = 30.0

    problem_solving_indicators = ["because", "therefore", "first", "second", "then", "step", "approach", "algorithm", "solution", "example", "result", "handle", "ensure"]
    ps_matches = sum(1 for ind in problem_solving_indicators if ind in ans_clean.lower())
    ps_score = min(95.0, 65.0 + (ps_matches * 10.0)) if word_count >= 10 else 40.0

    dk_score = max(accuracy_score, kw_score)

    if word_count >= 40:
        comp_score = 90.0
    elif word_count >= 20:
        comp_score = 78.0
    elif word_count >= 8:
        comp_score = 60.0
    else:
        comp_score = 40.0

    return {
        "technical_accuracy": round(accuracy_score, 1),
        "keyword_relevance": round(kw_score, 1),
        "problem_solving": round(ps_score, 1),
        "domain_knowledge": round(dk_score, 1),
        "answer_completeness": round(comp_score, 1)
    }


def collect_technical_metrics(db: Session, session: InterviewSession) -> Dict[str, Dict[str, Any]]:
    """Collects Technical Relevance parameters (30% weight) across interview questions."""
    interview = db.query(Interview).filter(Interview.id == session.interview_id).first()
    questions = interview.questions if (interview and interview.questions) else []

    answers_json = session.answers_json or []
    db_attempts = db.query(InterviewQuestionAttempt).filter(InterviewQuestionAttempt.session_id == session.id).all()

    answers_map = {}
    if isinstance(answers_json, list):
        for a in answers_json:
            if isinstance(a, dict) and "question_id" in a:
                answers_map[a["question_id"]] = a

    for att in db_attempts:
        if att.question_id and att.question_id not in answers_map and att.answer:
            answers_map[att.question_id] = {
                "question_id": att.question_id,
                "user_answer": att.answer,
                "score": getattr(att, "score", None)
            }

    valid_answers = []
    for item in answers_map.values():
        u_ans = item.get("user_answer") or item.get("answer") or ""
        u_str = str(u_ans).strip()
        if u_str and u_str.lower() not in ["no response provided.", "no answer submitted.", "n/a", "none"]:
            valid_answers.append(u_str)

    if not valid_answers:
        reason_msg = "No meaningful candidate answers were provided."
        return {
            "technical_accuracy": {"score": 0.0, "available": False, "status": STATUS_NO_ANSWERS, "reason": reason_msg},
            "keyword_relevance": {"score": 0.0, "available": False, "status": STATUS_NO_ANSWERS, "reason": reason_msg},
            "problem_solving_ability": {"score": 0.0, "available": False, "status": STATUS_NO_ANSWERS, "reason": reason_msg},
            "domain_knowledge": {"score": 0.0, "available": False, "status": STATUS_NO_ANSWERS, "reason": reason_msg},
            "answer_completeness": {"score": 0.0, "available": False, "status": STATUS_NO_ANSWERS, "reason": reason_msg}
        }

    accuracy_list = []
    kw_list = []
    ps_list = []
    dk_list = []
    comp_list = []

    target_items = questions if questions else list(answers_map.values())

    for item in target_items:
        if isinstance(item, InterviewQuestion):
            qid = item.id
            q_text = item.question_text
            exp_ans = item.expected_answer
            eval_pts = item.evaluation_points
            ans_data = answers_map.get(qid, {})
            u_ans = ans_data.get("user_answer") or ans_data.get("answer") or ""
        else:
            ans_data = item if isinstance(item, dict) else {}
            qid = ans_data.get("question_id")
            q_text = ans_data.get("question_text", "Technical Question")
            exp_ans = ans_data.get("expected_answer")
            eval_pts = ans_data.get("evaluation_points")
            u_ans = ans_data.get("user_answer") or ans_data.get("answer") or ""

        existing_score = ans_data.get("score") if isinstance(ans_data, dict) else None

        if existing_score is not None and isinstance(existing_score, (int, float)) and existing_score > 0:
            acc = float(existing_score)
            eval_res = {
                "technical_accuracy": acc,
                "keyword_relevance": min(100.0, acc + 5.0),
                "problem_solving": acc,
                "domain_knowledge": acc,
                "answer_completeness": acc
            }
        else:
            eval_res = _evaluate_answer_deterministic_fallback(q_text, exp_ans, eval_pts, str(u_ans))

        accuracy_list.append(eval_res["technical_accuracy"])
        kw_list.append(eval_res["keyword_relevance"])
        ps_list.append(eval_res["problem_solving"])
        dk_list.append(eval_res["domain_knowledge"])
        comp_list.append(eval_res["answer_completeness"])

    return {
        "technical_accuracy": {"score": round(sum(accuracy_list) / len(accuracy_list), 1), "available": True, "status": STATUS_EVALUATED},
        "keyword_relevance": {"score": round(sum(kw_list) / len(kw_list), 1), "available": True, "status": STATUS_EVALUATED},
        "problem_solving_ability": {"score": round(sum(ps_list) / len(ps_list), 1), "available": True, "status": STATUS_EVALUATED},
        "domain_knowledge": {"score": round(sum(dk_list) / len(dk_list), 1), "available": True, "status": STATUS_EVALUATED},
        "answer_completeness": {"score": round(sum(comp_list) / len(comp_list), 1), "available": True, "status": STATUS_EVALUATED}
    }


def collect_professionalism_metrics(db: Session, session: InterviewSession) -> Dict[str, Dict[str, Any]]:
    """Collects Professionalism parameters (15% weight) from interview timing and behavioral compliance."""
    behavior_rec = db.query(InterviewBehaviorAnalysis).filter(InterviewBehaviorAnalysis.session_id == session.id).first()
    speech_records = db.query(SpeechAnalysis).filter(SpeechAnalysis.session_id == session.id).all()
    attempts = db.query(InterviewQuestionAttempt).filter(InterviewQuestionAttempt.session_id == session.id).all()

    # Check for actual interaction / evidence
    has_speech = bool(speech_records and sum(s.word_count or 0 for s in speech_records) > 0)
    has_camera = bool(behavior_rec and (behavior_rec.total_analyzed_frames or 0) > 0 and (
        (behavior_rec.confident_frames_count or 0) + (behavior_rec.unconfident_frames_count or 0) > 0 or
        behavior_rec.eye_contact_percentage is not None
    ))
    
    all_answers = []
    if session.answers_json and isinstance(session.answers_json, list):
        for a in session.answers_json:
            if isinstance(a, dict) and a.get("user_answer"):
                ans_str = str(a["user_answer"]).strip()
                if ans_str and ans_str.lower() not in ["no response provided.", "no answer submitted.", "n/a", "none"]:
                    all_answers.append(ans_str)
    for att in attempts:
        if att.answer:
            att_str = str(att.answer).strip()
            if att_str and att_str.lower() not in ["no response provided.", "no answer submitted.", "n/a", "none"] and att_str not in all_answers:
                all_answers.append(att_str)
    
    has_answers = len(all_answers) > 0

    if not (has_speech or has_answers):
        reason_msg = "Insufficient interaction and behavioral evidence to evaluate professionalism."
        return {
            "time_management": {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": reason_msg},
            "response_organization": {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": reason_msg},
            "professional_communication": {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": reason_msg},
            "interview_etiquette": {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": reason_msg}
        }

    # 1. Time Management
    total_active_sec = session.total_active_seconds or session.duration or 0
    if total_active_sec > 0:
        mins = total_active_sec / 60.0
        if 5.0 <= mins <= 45.0:
            tm_score = 95.0
        elif mins < 5.0:
            tm_score = 75.0
        else:
            tm_score = max(50.0, 95.0 - (mins - 45.0) * 1.5)
        tm_metric = {"score": round(tm_score, 1), "available": True, "status": STATUS_EVALUATED, "active_minutes": round(mins, 1)}
    else:
        tm_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "No active session timing captured."}

    # 2. Response Organization
    if all_answers:
        org_scores = []
        for ans in all_answers:
            ans_clean = ans.strip()
            w_count = len(re.findall(r'\b\w+\b', ans_clean))
            if w_count >= 30 and ("first" in ans_clean.lower() or "additionally" in ans_clean.lower() or "in conclusion" in ans_clean.lower() or "." in ans_clean):
                org_scores.append(92.0)
            elif w_count >= 15:
                org_scores.append(82.0)
            elif w_count >= 5:
                org_scores.append(70.0)
            else:
                org_scores.append(50.0)
        org_metric = {"score": round(sum(org_scores) / len(org_scores), 1), "available": True, "status": STATUS_EVALUATED}
    else:
        org_metric = {"score": 0.0, "available": False, "status": STATUS_NO_ANSWERS, "reason": "No candidate responses available for organization evaluation."}

    # 3. Professional Communication
    if speech_records and has_speech:
        grammars = [s.grammar_score for s in speech_records if s.grammar_score is not None]
        if grammars:
            prof_comm_score = round(sum(grammars) / len(grammars), 1)
            prof_comm_metric = {"score": prof_comm_score, "available": True, "status": STATUS_EVALUATED}
        else:
            prof_comm_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "Grammar score unavailable."}
    else:
        prof_comm_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "Speech analysis unavailable for communication tone assessment."}

    # 4. Interview Etiquette
    if has_camera or has_speech or has_answers:
        etiquette_score = 100.0
        violation_notes = []
        if behavior_rec:
            mob_count = behavior_rec.mobile_event_count or 0
            if behavior_rec.mobile_detected and mob_count > 0:
                etiquette_score -= (mob_count * 15.0)
                violation_notes.append(f"{mob_count} confirmed mobile device violation(s)")
            fs_count = behavior_rec.fullscreen_violations_count or 0
            if fs_count > 0:
                etiquette_score -= (fs_count * 10.0)
                violation_notes.append(f"{fs_count} confirmed fullscreen exit violation(s)")

        etiquette_score = max(0.0, min(100.0, etiquette_score))
        etiquette_metric = {"score": round(etiquette_score, 1), "available": True, "status": STATUS_EVALUATED, "violations": violation_notes}
    else:
        etiquette_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "Etiquette evaluation unavailable."}

    return {
        "time_management": tm_metric,
        "response_organization": org_metric,
        "professional_communication": prof_comm_metric,
        "interview_etiquette": etiquette_metric
    }


    # 1. Time Management
    total_active_sec = session.total_active_seconds or session.duration or 0
    if total_active_sec > 0:
        mins = total_active_sec / 60.0
        if 5.0 <= mins <= 45.0:
            tm_score = 95.0
        elif mins < 5.0:
            tm_score = 75.0
        else:
            tm_score = max(50.0, 95.0 - (mins - 45.0) * 1.5)
        tm_metric = {"score": round(tm_score, 1), "available": True, "status": STATUS_EVALUATED, "active_minutes": round(mins, 1)}
    else:
        tm_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "No active session timing captured."}

    # 2. Response Organization
    if all_answers:
        org_scores = []
        for ans in all_answers:
            ans_clean = ans.strip()
            w_count = len(re.findall(r'\b\w+\b', ans_clean))
            if w_count >= 30 and ("first" in ans_clean.lower() or "additionally" in ans_clean.lower() or "in conclusion" in ans_clean.lower() or "." in ans_clean):
                org_scores.append(92.0)
            elif w_count >= 15:
                org_scores.append(82.0)
            elif w_count >= 5:
                org_scores.append(70.0)
            else:
                org_scores.append(50.0)
        org_metric = {"score": round(sum(org_scores) / len(org_scores), 1), "available": True, "status": STATUS_EVALUATED}
    else:
        org_metric = {"score": 0.0, "available": False, "status": STATUS_NO_ANSWERS, "reason": "No candidate responses available for organization evaluation."}

    # 3. Professional Communication
    if speech_records and has_speech:
        grammars = [s.grammar_score for s in speech_records if s.grammar_score is not None]
        if grammars:
            prof_comm_score = round(sum(grammars) / len(grammars), 1)
            prof_comm_metric = {"score": prof_comm_score, "available": True, "status": STATUS_EVALUATED}
        else:
            prof_comm_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "Grammar score unavailable."}
    else:
        prof_comm_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "Speech analysis unavailable for communication tone assessment."}

    # 4. Interview Etiquette
    if has_camera or has_speech or has_answers:
        etiquette_score = 100.0
        violation_notes = []
        if behavior_rec:
            mob_count = behavior_rec.mobile_event_count or 0
            if behavior_rec.mobile_detected and mob_count > 0:
                etiquette_score -= (mob_count * 15.0)
                violation_notes.append(f"{mob_count} confirmed mobile device violation(s)")
            fs_count = behavior_rec.fullscreen_violations_count or 0
            if fs_count > 0:
                etiquette_score -= (fs_count * 10.0)
                violation_notes.append(f"{fs_count} confirmed fullscreen exit violation(s)")

        etiquette_score = max(0.0, min(100.0, etiquette_score))
        etiquette_metric = {"score": round(etiquette_score, 1), "available": True, "status": STATUS_EVALUATED, "violations": violation_notes}
    else:
        etiquette_metric = {"score": 0.0, "available": False, "status": STATUS_INSUFFICIENT_DATA, "reason": "Etiquette evaluation unavailable."}

    return {
        "time_management": tm_metric,
        "response_organization": org_metric,
        "professional_communication": prof_comm_metric,
        "interview_etiquette": etiquette_metric
    }


def get_category_score(category: Dict[str, Any]) -> float:
    """Helper to safely retrieve numeric category score, returning 0.0 if unavailable."""
    if not category or not category.get("available", False):
        return 0.0
    score = category.get("score")
    if score is None:
        return 0.0
    return max(0.0, min(float(score), 100.0))


def calculate_overall_score(category_scores: Dict[str, Dict[str, Any]]) -> Tuple[float, str]:
    """
    Calculates weighted Overall Performance Score using FIXED CATEGORY WEIGHTS:
    Communication (30%), Confidence (25%), Technical (30%), Professionalism (15%).
    DO NOT re-normalize missing categories. Unavailable categories contribute 0.0.
    Returns (overall_score, performance_rating).
    """
    comm = get_category_score(category_scores.get("communication", {}))
    conf = get_category_score(category_scores.get("confidence", {}))
    tech = get_category_score(category_scores.get("technical_relevance", {}))
    prof = get_category_score(category_scores.get("professionalism", {}))

    all_unavailable = all(
        not category_scores.get(cat, {}).get("available", False)
        for cat in CATEGORY_WEIGHTS.keys()
    )

    overall_score = round(
        comm * 0.30 +
        conf * 0.25 +
        tech * 0.30 +
        prof * 0.15,
        1
    )
    overall_score = max(0.0, min(100.0, overall_score))

    rating = get_performance_rating(overall_score, all_unavailable=all_unavailable)
    return overall_score, rating


def compute_full_performance_evaluation(db: Session, session: InterviewSession) -> Dict[str, Any]:
    """
    Centralized primary entry point for complete performance evaluation computation.
    """
    comm_metrics = collect_communication_metrics(db, session)
    conf_metrics = collect_confidence_metrics(db, session)
    tech_metrics = collect_technical_metrics(db, session)
    prof_metrics = collect_professionalism_metrics(db, session)

    comm_score, comm_avail = calculate_weighted_score(comm_metrics, PARAM_WEIGHTS["communication"])
    conf_score, conf_avail = calculate_weighted_score(conf_metrics, PARAM_WEIGHTS["confidence"])
    tech_score, tech_avail = calculate_weighted_score(tech_metrics, PARAM_WEIGHTS["technical_relevance"])
    prof_score, prof_avail = calculate_weighted_score(prof_metrics, PARAM_WEIGHTS["professionalism"])

    category_scores = {
        "communication": {
            "score": comm_score if comm_avail else 0.0,
            "available": comm_avail,
            "status": STATUS_EVALUATED if comm_avail else STATUS_INSUFFICIENT_DATA,
            "reason": None if comm_avail else "No valid speech, transcript, or verbal response data was detected."
        },
        "confidence": {
            "score": conf_score if conf_avail else 0.0,
            "available": conf_avail,
            "status": STATUS_EVALUATED if conf_avail else STATUS_INSUFFICIENT_DATA,
            "reason": None if conf_avail else "No usable camera or face detection data was available."
        },
        "technical_relevance": {
            "score": tech_score if tech_avail else 0.0,
            "available": tech_avail,
            "status": STATUS_EVALUATED if tech_avail else STATUS_NO_ANSWERS,
            "reason": None if tech_avail else "No meaningful candidate answers were provided."
        },
        "professionalism": {
            "score": prof_score if prof_avail else 0.0,
            "available": prof_avail,
            "status": STATUS_EVALUATED if prof_avail else STATUS_INSUFFICIENT_DATA,
            "reason": None if prof_avail else "Insufficient interaction and behavioral evidence to evaluate professionalism."
        }
    }

    overall_score, rating = calculate_overall_score(category_scores)

    return {
        "session_id": session.id,
        "interview_id": session.interview_id,
        "candidate_id": session.candidate_id,
        "overall_score": overall_score,
        "performance_rating": rating,
        "category_scores": category_scores,
        "communication_analysis": comm_metrics,
        "confidence_analysis": conf_metrics,
        "technical_analysis": tech_metrics,
        "professionalism_analysis": prof_metrics
    }
