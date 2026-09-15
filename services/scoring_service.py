"""
Scoring Service Module
Calculates deterministic, normalized 0-100 scores for candidate interviews:
- Communication Score (30%)
- Confidence Score (25%)
- Technical Relevance Score (30%)
- Professionalism Score (15%)
- Overall Final Score & Performance Rating
"""

import re
import json
import os
from typing import Dict, Any, List, Optional, Tuple

from google import genai
from google.genai import types

from backend.config import settings
from backend.models.assessment_models import (
    SubMetricDetail,
    CommunicationBreakdown,
    ConfidenceBreakdown,
    TechnicalRelevanceBreakdown,
    ProfessionalismBreakdown,
    QuestionEvaluation
)


# ==============================================================================
# 1. Mathematical Normalization, Clamping & Rating Utilities
# ==============================================================================

def clamp_score(val: float, min_val: float = 0.0, max_val: float = 100.0) -> float:
    """
    Clamps any numerical score strictly between min_val and max_val (default 0.0 to 100.0).
    """
    try:
        f_val = float(val)
        if f_val < min_val:
            return float(min_val)
        if f_val > max_val:
            return float(max_val)
        return round(f_val, 2)
    except (ValueError, TypeError):
        return float(min_val)


def normalize_score(val: float, in_min: float, in_max: float) -> float:
    """
    Safely normalizes an input value from [in_min, in_max] into a 0.0 - 100.0 scale.
    """
    if in_max <= in_min:
        return 50.0
    scaled = ((float(val) - in_min) / (in_max - in_min)) * 100.0
    return clamp_score(scaled)


def calculate_weighted_score(components: Dict[str, float], weights: Dict[str, float]) -> float:
    """
    Calculates the exact weighted sum of component scores.
    Validates that each score is clamped to 0-100 before weighting.
    """
    total = 0.0
    for key, weight in weights.items():
        comp_val = clamp_score(components.get(key, 0.0))
        total += comp_val * weight
    return clamp_score(round(total, 2))


def get_performance_rating(score: float) -> str:
    """
    Determines performance rating tier based on exact 0-100 boundaries:
    - 90.00 – 100.00: "Excellent"
    - 75.00 – 89.99: "Good"
    - 60.00 – 74.99: "Average"
    - 40.00 – 59.99: "Needs Improvement"
    - 0.00 – 39.99: "Poor"
    """
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
# 2. AI / Gemini Client Initialization
# ==============================================================================

def _get_gemini_client():
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if api_key:
        try:
            return genai.Client(api_key=api_key)
        except Exception:
            return None
    return None


# ==============================================================================
# 3. Individual Question Evaluation & Technical Relevance
# ==============================================================================

def evaluate_single_question_answer(
    question_id: int | str,
    question_text: str,
    candidate_answer: str,
    ideal_outline: str = "",
    domain: str = "Full Stack",
    difficulty: str = "Medium"
) -> QuestionEvaluation:
    """
    Evaluates an individual technical answer across 5 sub-metrics:
    1. Technical Accuracy (30%)
    2. Keyword Relevance (15%)
    3. Problem Solving (20%)
    4. Domain Knowledge (20%)
    5. Answer Completeness (15%)
    """
    ans = (candidate_answer or "").strip()
    words = ans.split()
    word_count = len(words)

    # If answer is empty or missing
    if not ans or word_count < 2:
        return QuestionEvaluation(
            question_id=question_id,
            question=question_text,
            candidate_answer=ans if ans else "[No answer submitted]",
            score=0.0,
            technical_accuracy=0.0,
            keyword_relevance=0.0,
            problem_solving=0.0,
            domain_knowledge=0.0,
            answer_completeness=0.0,
            communication_observations="No response recorded.",
            feedback="The question was skipped or no answer was provided.",
            improvement_suggestion="Ensure all interview questions are attempted with structured explanations.",
            missing_points=["Complete conceptual response", "Technical elaboration"],
            matched_keywords=[]
        )

    client = _get_gemini_client()
    if client:
        try:
            prompt = f"""
            You are a Senior Principal Engineer and Technical Interview Assessor.
            Evaluate this candidate answer for a {domain} ({difficulty} level) interview question.

            Question: "{question_text}"
            Ideal Outline / Expected Concepts: "{ideal_outline}"
            Candidate Answer: "{ans}"

            Return ONLY valid JSON matching this schema:
            {{
                "technical_accuracy": 85, // 0 to 100
                "keyword_relevance": 80, // 0 to 100
                "problem_solving": 78, // 0 to 100
                "domain_knowledge": 84, // 0 to 100
                "answer_completeness": 82, // 0 to 100
                "feedback": "Detailed constructive evaluation of technical correctness and depth.",
                "improvement_suggestion": "Specific actionable recommendation to enhance this technical answer.",
                "missing_points": ["Key concept 1 missed", "Key concept 2 to expand"],
                "matched_keywords": ["keyword1", "keyword2"]
            }}
            """
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            if response.text:
                data = json.loads(response.text.strip())
                tech_acc = clamp_score(data.get("technical_accuracy", 75))
                kw_rel = clamp_score(data.get("keyword_relevance", 75))
                prob_sol = clamp_score(data.get("problem_solving", 75))
                dom_kn = clamp_score(data.get("domain_knowledge", 75))
                ans_comp = clamp_score(data.get("answer_completeness", 75))

                weights = {
                    "tech_acc": 0.30,
                    "kw_rel": 0.15,
                    "prob_sol": 0.20,
                    "dom_kn": 0.20,
                    "ans_comp": 0.15
                }
                q_score = calculate_weighted_score({
                    "tech_acc": tech_acc,
                    "kw_rel": kw_rel,
                    "prob_sol": prob_sol,
                    "dom_kn": dom_kn,
                    "ans_comp": ans_comp
                }, weights)

                return QuestionEvaluation(
                    question_id=question_id,
                    question=question_text,
                    candidate_answer=ans,
                    score=q_score,
                    technical_accuracy=tech_acc,
                    keyword_relevance=kw_rel,
                    problem_solving=prob_sol,
                    domain_knowledge=dom_kn,
                    answer_completeness=ans_comp,
                    communication_observations="Clear technical expression with domain vocabulary.",
                    feedback=data.get("feedback", "Good technical response."),
                    improvement_suggestion=data.get("improvement_suggestion", "Elaborate further on architectural trade-offs."),
                    missing_points=data.get("missing_points", []),
                    matched_keywords=data.get("matched_keywords", [])
                )
        except Exception as e:
            print(f"[Scoring Service] Gemini API evaluation error: {e}")

    # Fallback Deterministic Smart Evaluator
    # Extracts keywords from question & ideal outline
    text_corpus = (question_text + " " + ideal_outline).lower()
    candidate_tokens = set(re.findall(r'\b[a-zA-Z]{3,}\b', ans.lower()))
    corpus_tokens = set(re.findall(r'\b[a-zA-Z]{3,}\b', text_corpus)) - {
        "what", "when", "where", "which", "explain", "describe", "discuss", "difference",
        "between", "using", "your", "with", "this", "that", "from", "have", "ideal", "mention"
    }

    matched = list(candidate_tokens.intersection(corpus_tokens))
    match_ratio = (len(matched) / max(1, len(corpus_tokens))) if corpus_tokens else 0.5
    kw_rel = clamp_score(40.0 + min(55.0, match_ratio * 70.0 + (len(matched) * 4.0)))

    # Completeness based on depth and length
    if word_count < 15:
        ans_comp = clamp_score(35.0 + word_count * 2.0)
        tech_acc = clamp_score(45.0 + len(matched) * 5.0)
        prob_sol = 40.0
        dom_kn = 45.0
        feedback = "Answer is very brief. Adding concrete implementation steps and real-world examples will significantly strengthen your response."
        improvement = "Practice providing structured answers that explain both the mechanism and the 'why' behind architectural choices."
        missing_points = ["In-depth technical explanation", "Concrete architectural trade-offs"]
    elif word_count < 40:
        ans_comp = clamp_score(65.0 + (word_count - 15) * 0.8)
        tech_acc = clamp_score(70.0 + len(matched) * 3.0)
        prob_sol = clamp_score(68.0 + len(matched) * 2.5)
        dom_kn = clamp_score(72.0 + len(matched) * 2.5)
        feedback = "Good baseline explanation covering the main concepts. Could be enhanced with edge-case handling and operational considerations."
        improvement = "Elaborate on production failure modes and performance benchmarking."
        missing_points = ["Edge case mitigation strategies", "Performance profiling nuances"]
    else:
        ans_comp = clamp_score(82.0 + min(16.0, (word_count - 40) * 0.3))
        tech_acc = clamp_score(80.0 + min(18.0, len(matched) * 3.0))
        prob_sol = clamp_score(80.0 + min(16.0, len(matched) * 2.5))
        dom_kn = clamp_score(82.0 + min(16.0, len(matched) * 2.5))
        feedback = "Comprehensive and well-articulated technical response demonstrating solid engineering understanding."
        improvement = "Consider mentioning automated testing strategies or deployment telemetry for a complete lifecycle view."
        missing_points = ["Optional mention of telemetry/monitoring integrations"]

    weights = {
        "tech_acc": 0.30,
        "kw_rel": 0.15,
        "prob_sol": 0.20,
        "dom_kn": 0.20,
        "ans_comp": 0.15
    }
    q_score = calculate_weighted_score({
        "tech_acc": tech_acc,
        "kw_rel": kw_rel,
        "prob_sol": prob_sol,
        "dom_kn": dom_kn,
        "ans_comp": ans_comp
    }, weights)

    return QuestionEvaluation(
        question_id=question_id,
        question=question_text,
        candidate_answer=ans,
        score=q_score,
        technical_accuracy=tech_acc,
        keyword_relevance=kw_rel,
        problem_solving=prob_sol,
        domain_knowledge=dom_kn,
        answer_completeness=ans_comp,
        communication_observations=f"Spoken/written length: {word_count} words with {len(matched)} relevant domain concepts.",
        feedback=feedback,
        improvement_suggestion=improvement,
        missing_points=missing_points,
        matched_keywords=matched[:8]
    )


def compute_technical_relevance(
    questions: List[Dict[str, Any]],
    domain: str = "Full Stack",
    difficulty: str = "Medium"
) -> Tuple[TechnicalRelevanceBreakdown, List[QuestionEvaluation]]:
    """
    Computes overall Technical Relevance Score (30% weight) from actual question evaluations.
    """
    question_evaluations: List[QuestionEvaluation] = []
    
    for q in questions:
        q_id = q.get("id", len(question_evaluations) + 1)
        q_text = q.get("question", "")
        cand_ans = q.get("user_answer", "")
        ideal = q.get("ideal_answer_outline", "")

        # Check if already evaluated in target question dict
        existing_eval = q.get("evaluation")
        if isinstance(existing_eval, dict) and "technical_accuracy" in existing_eval:
            q_eval = QuestionEvaluation(**existing_eval)
        else:
            q_eval = evaluate_single_question_answer(
                question_id=q_id,
                question_text=q_text,
                candidate_answer=cand_ans,
                ideal_outline=ideal,
                domain=domain,
                difficulty=difficulty
            )
        question_evaluations.append(q_eval)

    count = len(question_evaluations)
    if count == 0:
        return TechnicalRelevanceBreakdown(
            score=0.0,
            technical_accuracy=0.0,
            keyword_relevance=0.0,
            problem_solving=0.0,
            domain_knowledge=0.0,
            answer_completeness=0.0,
            questions_evaluated_count=0,
            sub_metrics=[]
        ), []

    avg_tech_acc = sum(q.technical_accuracy for q in question_evaluations) / count
    avg_kw_rel = sum(q.keyword_relevance for q in question_evaluations) / count
    avg_prob_sol = sum(q.problem_solving for q in question_evaluations) / count
    avg_dom_kn = sum(q.domain_knowledge for q in question_evaluations) / count
    avg_ans_comp = sum(q.answer_completeness for q in question_evaluations) / count

    weights = {
        "technical_accuracy": 0.30,
        "keyword_relevance": 0.15,
        "problem_solving": 0.20,
        "domain_knowledge": 0.20,
        "answer_completeness": 0.15
    }

    comp_dict = {
        "technical_accuracy": clamp_score(avg_tech_acc),
        "keyword_relevance": clamp_score(avg_kw_rel),
        "problem_solving": clamp_score(avg_prob_sol),
        "domain_knowledge": clamp_score(avg_dom_kn),
        "answer_completeness": clamp_score(avg_ans_comp)
    }
    overall_tech_score = calculate_weighted_score(comp_dict, weights)

    sub_metrics = [
        SubMetricDetail(
            name="Technical Accuracy",
            score=comp_dict["technical_accuracy"],
            weight=0.30,
            status="available",
            description="Correctness of technical explanations, mechanisms, and architectural solutions.",
            evidence=f"Averaged {comp_dict['technical_accuracy']}% across {count} evaluated questions."
        ),
        SubMetricDetail(
            name="Keyword Relevance",
            score=comp_dict["keyword_relevance"],
            weight=0.15,
            status="available",
            description="Use of precise domain terminology, framework terms, and industry concepts.",
            evidence=f"Keyword matching ratio averaged {comp_dict['keyword_relevance']}%."
        ),
        SubMetricDetail(
            name="Problem Solving",
            score=comp_dict["problem_solving"],
            weight=0.20,
            status="available",
            description="Analytical reasoning, root-cause diagnostics, and trade-off considerations.",
            evidence=f"Problem solving depth evaluated at {comp_dict['problem_solving']}%."
        ),
        SubMetricDetail(
            name="Domain Knowledge",
            score=comp_dict["domain_knowledge"],
            weight=0.20,
            status="available",
            description="Grasp of {domain} ecosystem, best practices, and standard protocols.",
            evidence=f"Domain mastery measured at {comp_dict['domain_knowledge']}%."
        ),
        SubMetricDetail(
            name="Answer Completeness",
            score=comp_dict["answer_completeness"],
            weight=0.15,
            status="available",
            description="Comprehensive coverage of all parts of the interview prompt.",
            evidence=f"Answer depth scored at {comp_dict['answer_completeness']}%."
        )
    ]

    breakdown = TechnicalRelevanceBreakdown(
        score=overall_tech_score,
        technical_accuracy=comp_dict["technical_accuracy"],
        keyword_relevance=comp_dict["keyword_relevance"],
        problem_solving=comp_dict["problem_solving"],
        domain_knowledge=comp_dict["domain_knowledge"],
        answer_completeness=comp_dict["answer_completeness"],
        questions_evaluated_count=count,
        sub_metrics=sub_metrics
    )

    return breakdown, question_evaluations


# ==============================================================================
# 4. Communication Score (30% weight)
# ==============================================================================

def compute_communication_score_module(
    transcript: str,
    duration_seconds: float = 0.0,
    speech_session_data: Optional[Dict[str, Any]] = None,
    candidate_answers: Optional[List[str]] = None
) -> CommunicationBreakdown:
    """
    Evaluates verbal communication quality (30% overall weight):
    1. Speech Clarity (25%)
    2. Grammar Quality (20%)
    3. Filler-Word Frequency (15%) [negative metric: higher filler rate -> lower score]
    4. Speaking Pace (15%) [120-160 target range]
    5. Response Completeness (25%)
    """
    full_text = (transcript or "").strip()
    if not full_text and candidate_answers:
        full_text = " ".join(ans for ans in candidate_answers if ans).strip()

    word_count = len(full_text.split()) if full_text else 0
    duration = max(3.0, float(duration_seconds)) if duration_seconds > 0 else max(10.0, word_count / 2.2)

    # 1. Grammar Quality (20%)
    if speech_session_data and "grammar" in speech_session_data:
        grammar_score = float(speech_session_data["grammar"].get("score", 85))
        grammar_mistakes = int(speech_session_data["grammar"].get("mistakes_count", 0))
    else:
        # Base grammar heuristic
        from backend.services.grammar_service import analyze_grammar
        g_res = analyze_grammar(full_text)
        grammar_score = float(g_res.score)
        grammar_mistakes = g_res.mistakes_count

    # 2. Filler-Word Score (15%) [Negative Metric]
    if speech_session_data and "fillers" in speech_session_data:
        filler_rate = float(speech_session_data["fillers"].get("rate", 0.0))
        filler_count = int(speech_session_data["fillers"].get("total", 0))
    else:
        from backend.services.filler_service import analyze_fillers
        f_res = analyze_fillers(full_text)
        filler_rate = float(f_res.rate)
        filler_count = f_res.total

    # High filler rate drops the score:
    # 0% fillers -> 100
    # 2% fillers -> 90
    # 5% fillers -> 70
    # 10%+ fillers -> <= 40
    if filler_rate <= 1.0:
        filler_word_score = 98.0
    elif filler_rate <= 3.0:
        filler_word_score = clamp_score(98.0 - (filler_rate - 1.0) * 6.0)
    elif filler_rate <= 6.0:
        filler_word_score = clamp_score(86.0 - (filler_rate - 3.0) * 8.0)
    elif filler_rate <= 12.0:
        filler_word_score = clamp_score(62.0 - (filler_rate - 6.0) * 5.0)
    else:
        filler_word_score = clamp_score(32.0 - min(25.0, (filler_rate - 12.0) * 2.0))

    # 3. Speaking Pace Score (15%) [Target: 120-160 WPM]
    wpm = (word_count / (duration / 60.0)) if duration > 0 else 135.0
    if speech_session_data and "pace" in speech_session_data:
        wpm = float(speech_session_data["pace"].get("wpm", wpm))

    if 120 <= wpm <= 160:
        speaking_pace_score = 98.0
    elif 100 <= wpm < 120:
        speaking_pace_score = clamp_score(82.0 + ((wpm - 100.0) / 20.0) * 16.0)
    elif 160 < wpm <= 180:
        speaking_pace_score = clamp_score(82.0 + ((180.0 - wpm) / 20.0) * 16.0)
    elif wpm < 100:
        speaking_pace_score = clamp_score(max(30.0, 40.0 + (wpm / 100.0) * 40.0))
    else:  # wpm > 180
        speaking_pace_score = clamp_score(max(30.0, 82.0 - min(50.0, (wpm - 180.0) * 0.9)))

    # 4. Speech Clarity (25%)
    # Combines pronunciation clarity, smooth pace consistency, and sentence formulation
    clarity_base = (grammar_score * 0.4) + (filler_word_score * 0.3) + (speaking_pace_score * 0.3)
    if speech_session_data and "pronunciation" in speech_session_data:
        pron_score = float(speech_session_data["pronunciation"].get("score", 90))
        speech_clarity = clamp_score((clarity_base * 0.7) + (pron_score * 0.3))
    else:
        speech_clarity = clamp_score(clarity_base)

    # 5. Response Completeness (25%)
    # Evaluates how articulately ideas are fleshed out based on average words per response
    if word_count < 20:
        response_completeness = clamp_score(max(20.0, word_count * 2.5))
    elif word_count < 80:
        response_completeness = clamp_score(60.0 + ((word_count - 20) / 60.0) * 25.0)
    else:
        response_completeness = clamp_score(min(98.0, 85.0 + min(13.0, (word_count - 80) * 0.1)))

    weights = {
        "speech_clarity": 0.25,
        "grammar_quality": 0.20,
        "filler_word_score": 0.15,
        "speaking_pace_score": 0.15,
        "response_completeness": 0.25
    }

    comp_dict = {
        "speech_clarity": speech_clarity,
        "grammar_quality": grammar_score,
        "filler_word_score": filler_word_score,
        "speaking_pace_score": speaking_pace_score,
        "response_completeness": response_completeness
    }

    comm_score = calculate_weighted_score(comp_dict, weights)

    sub_metrics = [
        SubMetricDetail(
            name="Speech Clarity",
            score=comp_dict["speech_clarity"],
            weight=0.25,
            status="available",
            description="Audibility, articulate phonetics, and vocal clarity throughout responses.",
            evidence=f"Clarity index scored at {comp_dict['speech_clarity']}% based on phonetics and cadence."
        ),
        SubMetricDetail(
            name="Grammar Quality",
            score=comp_dict["grammar_quality"],
            weight=0.20,
            status="available",
            description="Grammatical precision, sentence syntax, and subject-verb consistency.",
            evidence=f"{grammar_mistakes} grammatical/phrasing inconsistencies detected across spoken transcript."
        ),
        SubMetricDetail(
            name="Filler-Word Frequency",
            score=comp_dict["filler_word_score"],
            weight=0.15,
            status="available",
            description="Verbal crutch word frequency (um, uh, like, you know). Negative metric.",
            evidence=f"Filler word rate measured at {filler_rate:.1f}% ({filler_count} occurrences)."
        ),
        SubMetricDetail(
            name="Speaking Pace",
            score=comp_dict["speaking_pace_score"],
            weight=0.15,
            status="available",
            description="Cadence and speed measured against target range (120-160 WPM).",
            evidence=f"Pace clocked at {wpm:.1f} WPM."
        ),
        SubMetricDetail(
            name="Response Completeness",
            score=comp_dict["response_completeness"],
            weight=0.25,
            status="available",
            description="Elaboration level and structured coverage of discussion points.",
            evidence=f"Candidate generated {word_count} spoken words across session answers."
        )
    ]

    return CommunicationBreakdown(
        score=comm_score,
        speech_clarity=comp_dict["speech_clarity"],
        grammar_quality=comp_dict["grammar_quality"],
        filler_word_score=comp_dict["filler_word_score"],
        speaking_pace_score=comp_dict["speaking_pace_score"],
        response_completeness=comp_dict["response_completeness"],
        wpm=round(wpm, 1),
        filler_rate=round(filler_rate, 2),
        grammar_mistakes_count=grammar_mistakes,
        sub_metrics=sub_metrics
    )


# ==============================================================================
# 5. Confidence Score (25% weight)
# ==============================================================================

def compute_confidence_score_module(
    video_session_report: Optional[Dict[str, Any]] = None,
    speech_breakdown: Optional[CommunicationBreakdown] = None,
    pauses_data: Optional[Dict[str, Any]] = None,
    session_duration: float = 0.0
) -> ConfidenceBreakdown:
    """
    Evaluates candidate confidence (25% overall weight):
    1. Eye-Contact Consistency (20%)
    2. Facial Engagement (20%)
    3. Response Hesitation (20%) [Negative metric: higher hesitation -> lower score]
    4. Speaking Confidence (25%)
    5. Attention Level (15%)
    """
    video_available = False
    eye_contact_val: Optional[float] = None
    facial_engagement_val: Optional[float] = None
    attention_val: Optional[float] = None

    if video_session_report and video_session_report.get("total_frames_analyzed", 0) > 0:
        video_available = True
        eye_contact_val = clamp_score(video_session_report.get("eye_contact", {}).get("percentage", 75.0))
        facial_engagement_val = clamp_score(video_session_report.get("engagement", {}).get("score", 75.0))
        attention_val = clamp_score(video_session_report.get("attention", {}).get("score", 80.0))

    # 3. Response Hesitation Score (20%) [Negative metric]
    # Calculated from silence duration, long pauses, and filler frequency
    hesitation_penalty = 0.0
    if pauses_data:
        long_pauses = int(pauses_data.get("long_pauses", 0))
        silence_pct = float(pauses_data.get("silence_percentage", 10.0))
        hesitation_penalty += min(35.0, long_pauses * 6.0 + (silence_pct * 0.5))

    if speech_breakdown:
        # Fillers contribute to hesitation penalty
        filler_rate = speech_breakdown.filler_rate or 0.0
        hesitation_penalty += min(30.0, filler_rate * 4.0)

    hesitation_score = clamp_score(max(25.0, 95.0 - hesitation_penalty))

    # 4. Speaking Confidence (25%)
    # Measured by smooth cadence, high clarity, and strong vocal presence
    if speech_breakdown:
        speaking_confidence = clamp_score(
            (speech_breakdown.speech_clarity * 0.40) +
            (speech_breakdown.speaking_pace_score * 0.30) +
            (speech_breakdown.filler_word_score * 0.30)
        )
    else:
        speaking_confidence = 75.0

    # Fallbacks for video metrics if video was unavailable
    eye_score_for_calc = eye_contact_val if video_available else speaking_confidence
    engagement_score_for_calc = facial_engagement_val if video_available else clamp_score((speaking_confidence + hesitation_score) / 2.0)
    attention_score_for_calc = attention_val if video_available else 80.0

    weights = {
        "eye_contact": 0.20,
        "facial_engagement": 0.20,
        "hesitation_score": 0.20,
        "speaking_confidence": 0.25,
        "attention_level": 0.15
    }

    comp_dict = {
        "eye_contact": eye_score_for_calc,
        "facial_engagement": engagement_score_for_calc,
        "hesitation_score": hesitation_score,
        "speaking_confidence": speaking_confidence,
        "attention_level": attention_score_for_calc
    }

    conf_score = calculate_weighted_score(comp_dict, weights)

    sub_metrics = [
        SubMetricDetail(
            name="Eye-Contact Consistency",
            score=eye_contact_val if video_available else None,
            weight=0.20,
            status="available" if video_available else "unavailable",
            description="Consistency maintaining visual contact with the interviewer camera.",
            evidence=f"Eye contact sustained at {eye_contact_val}% of recorded session frames." if video_available else "Webcam tracking was inactive; fallback vocal composure benchmark used."
        ),
        SubMetricDetail(
            name="Facial Engagement",
            score=facial_engagement_val if video_available else None,
            weight=0.20,
            status="available" if video_available else "unavailable",
            description="Dynamic expression engagement and natural conversational responsiveness.",
            evidence=f"Facial engagement score computed at {facial_engagement_val}%." if video_available else "Facial telemetry unavailable; estimated from vocal inflection."
        ),
        SubMetricDetail(
            name="Response Hesitation",
            score=hesitation_score,
            weight=0.20,
            status="available",
            description="Absence of prolonged stumbling or disruptive hesitation pauses (Negative metric).",
            evidence=f"Hesitation composure measured at {hesitation_score}%."
        ),
        SubMetricDetail(
            name="Speaking Confidence",
            score=speaking_confidence,
            weight=0.25,
            status="available",
            description="Vocal poise, steady cadence, and assertiveness in explanation delivery.",
            evidence=f"Speaking confidence index evaluated at {speaking_confidence}%."
        ),
        SubMetricDetail(
            name="Attention Level",
            score=attention_val if video_available else None,
            weight=0.15,
            status="available" if video_available else "unavailable",
            description="Continuous focus and absence of external screen/room distractions.",
            evidence=f"Visual attention tracking reached {attention_val}%." if video_available else "Attention telemetry unavailable; standard baseline applied."
        )
    ]

    return ConfidenceBreakdown(
        score=conf_score,
        eye_contact=eye_contact_val,
        facial_engagement=facial_engagement_val,
        hesitation_score=hesitation_score,
        speaking_confidence=speaking_confidence,
        attention_level=attention_val,
        video_analysis_available=video_available,
        sub_metrics=sub_metrics
    )


# ==============================================================================
# 6. Professionalism Score (15% weight)
# ==============================================================================

def compute_professionalism_score_module(
    total_duration_seconds: float = 0.0,
    question_times: Optional[Dict[str, int]] = None,
    candidate_answers: Optional[List[str]] = None,
    speech_breakdown: Optional[CommunicationBreakdown] = None,
    questions_count: int = 1
) -> ProfessionalismBreakdown:
    """
    Evaluates professionalism (15% overall weight):
    1. Time Management (20%)
    2. Response Organization (30%)
    3. Professional Communication (30%)
    4. Interview Etiquette (20%)
    """
    # 1. Time Management (20%)
    # Target 60 - 240 seconds per question
    avg_q_time = (total_duration_seconds / max(1, questions_count)) if total_duration_seconds > 0 else 90.0
    if 60 <= avg_q_time <= 210:
        time_management = 95.0
    elif 40 <= avg_q_time < 60:
        time_management = clamp_score(80.0 + ((avg_q_time - 40.0) / 20.0) * 15.0)
    elif 210 < avg_q_time <= 300:
        time_management = clamp_score(80.0 + ((300.0 - avg_q_time) / 90.0) * 15.0)
    elif avg_q_time < 40:
        time_management = clamp_score(max(40.0, 50.0 + (avg_q_time / 40.0) * 30.0))
    else:  # > 300s
        time_management = clamp_score(max(40.0, 80.0 - min(40.0, (avg_q_time - 300.0) * 0.3)))

    # 2. Response Organization (30%)
    # Evaluates structured progression (introduction, body, technical rationale, conclusion)
    text_corpus = " ".join(candidate_answers or []).lower()
    structural_cues = [
        "first", "secondly", "additionally", "for example", "in conclusion", "furthermore",
        "to begin with", "in my experience", "trade-off", "specifically", "as a result", "therefore"
    ]
    matched_cues = sum(1 for cue in structural_cues if cue in text_corpus)
    words_total = len(text_corpus.split())
    
    if words_total < 20:
        response_organization = 45.0
    else:
        cue_bonus = min(25.0, matched_cues * 6.0)
        length_factor = min(70.0, 50.0 + (words_total / 100.0) * 20.0)
        response_organization = clamp_score(length_factor + cue_bonus)

    # 3. Professional Communication (30%)
    # Formality, polite register, low slang, good grammar
    grammar_score = speech_breakdown.grammar_quality if speech_breakdown else 85.0
    slang_words = ["gonna", "wanna", "kinda", "sorta", "dunno", "ain't", "crap", "stuff"]
    slang_count = sum(1 for s in slang_words if re.search(r'\b' + s + r'\b', text_corpus))
    slang_penalty = min(25.0, slang_count * 6.0)
    professional_communication = clamp_score(max(35.0, (grammar_score * 0.9) + 10.0 - slang_penalty))

    # 4. Interview Etiquette (20%)
    # Attentiveness, willingness to answer, responsiveness
    if words_total > 40:
        interview_etiquette = clamp_score(92.0 - slang_penalty * 0.5)
    elif words_total > 10:
        interview_etiquette = 75.0
    else:
        interview_etiquette = 50.0

    weights = {
        "time_management": 0.20,
        "response_organization": 0.30,
        "professional_communication": 0.30,
        "interview_etiquette": 0.20
    }

    comp_dict = {
        "time_management": time_management,
        "response_organization": response_organization,
        "professional_communication": professional_communication,
        "interview_etiquette": interview_etiquette
    }

    prof_score = calculate_weighted_score(comp_dict, weights)

    sub_metrics = [
        SubMetricDetail(
            name="Time Management",
            score=comp_dict["time_management"],
            weight=0.20,
            status="available",
            description="Pacing and answer duration allocation per question.",
            evidence=f"Average response time was {int(avg_q_time)} seconds per question."
        ),
        SubMetricDetail(
            name="Response Organization",
            score=comp_dict["response_organization"],
            weight=0.30,
            status="available",
            description="Structured framework (STAR method, clear introduction, logical flow).",
            evidence=f"Response organization scored {comp_dict['response_organization']}% with {matched_cues} structural transition cues."
        ),
        SubMetricDetail(
            name="Professional Communication",
            score=comp_dict["professional_communication"],
            weight=0.30,
            status="available",
            description="Formal tone, vocabulary maturity, and constructive phrasing.",
            evidence=f"Professional register scored at {comp_dict['professional_communication']}%."
        ),
        SubMetricDetail(
            name="Interview Etiquette",
            score=comp_dict["interview_etiquette"],
            weight=0.20,
            status="available",
            description="Engagement, readiness to respond, and respectful professional demeanor.",
            evidence=f"Etiquette score evaluated at {comp_dict['interview_etiquette']}%."
        )
    ]

    return ProfessionalismBreakdown(
        score=prof_score,
        time_management=comp_dict["time_management"],
        response_organization=comp_dict["response_organization"],
        professional_communication=comp_dict["professional_communication"],
        interview_etiquette=comp_dict["interview_etiquette"],
        sub_metrics=sub_metrics
    )


# ==============================================================================
# 7. Overall Assessment Calculation
# ==============================================================================

def calculate_overall_assessment_scores(
    communication: CommunicationBreakdown,
    confidence: ConfidenceBreakdown,
    technical: TechnicalRelevanceBreakdown,
    professionalism: ProfessionalismBreakdown
) -> Tuple[float, str, str]:
    """
    Computes final Overall Score using exact weights:
    Overall Score = (Communication * 0.30) + (Confidence * 0.25) + (Technical Relevance * 0.30) + (Professionalism * 0.15)
    Returns: (overall_score, performance_rating, recommendation)
    """
    weights = {
        "communication": 0.30,
        "confidence": 0.25,
        "technical": 0.30,
        "professionalism": 0.15
    }

    comp_dict = {
        "communication": communication.score,
        "confidence": confidence.score,
        "technical": technical.score,
        "professionalism": professionalism.score
    }

    overall_score = calculate_weighted_score(comp_dict, weights)
    rating = get_performance_rating(overall_score)

    if overall_score >= 88.0:
        recommendation = "Strong Hire"
    elif overall_score >= 75.0:
        recommendation = "Hire"
    elif overall_score >= 60.0:
        recommendation = "Consider"
    else:
        recommendation = "Reject"

    return overall_score, rating, recommendation
