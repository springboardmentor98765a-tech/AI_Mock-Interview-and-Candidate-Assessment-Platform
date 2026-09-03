"""
scoring.py
===========
Real answer analysis for the AI Mock Interview module.

Every submitted answer is scored on four axes (0-100 each):
    technical_score     - how well the answer engages with the technical
                           content of the question / domain / resume skills
    communication_score - structure, length and clarity of the answer
    confidence_score     - presence of hedging / filler language vs.
                           assertive, specific language
    grammar_score        - basic writing-mechanics checks

Primary path: Google Gemini (same model already used for question
generation) is asked to grade the answer and return JSON scores.

Fallback path: if no GEMINI_API_KEY is configured, or the Gemini call
fails for any reason (network, quota, bad response), a deterministic
local heuristic analyzer is used instead. Nothing here is ever a fixed
placeholder number - every score is derived from the actual text the
candidate submitted.
"""

import json
import re
from statistics import mean

from app.config import settings

# ---------------------------------------------------------------------------
# Gemini client (lazy-initialised, shared pattern with ai_question_generator)
# ---------------------------------------------------------------------------
_gemini_model = None
_gemini_init_attempted = False


def _get_gemini_model():
    global _gemini_model, _gemini_init_attempted

    if _gemini_init_attempted:
        return _gemini_model

    _gemini_init_attempted = True

    if not settings.GEMINI_API_KEY:
        return None

    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)
    except Exception:
        _gemini_model = None

    return _gemini_model


# ---------------------------------------------------------------------------
# Local heuristic analyzer (always available, no network required)
# ---------------------------------------------------------------------------
FILLER_PHRASES = [
    "um", "uh", "umm", "uhh", "erm", "hmm",
    "i think", "i guess", "i mean", "sort of", "kind of",
    "maybe", "probably", "not sure", "i don't know", "i dont know",
    "like i said", "basically", "actually", "just", "you know",
]

ASSERTIVE_MARKERS = [
    "because", "therefore", "specifically", "for example", "for instance",
    "in my experience", "i implemented", "i built", "i designed", "i led",
    "i achieved", "the result was", "this means", "in summary",
]

PROFESSIONAL_MARKERS = [
    "thank you", "certainly", "in my experience", "for example",
    "the result", "i learned", "i would", "i can", "i implemented",
]

MODULE7_WEIGHTS = {
    "communication_score": 0.30,
    "confidence_score": 0.25,
    "technical_score": 0.30,
    "professionalism_score": 0.15,
}
SCORING_VERSION = "module7-v1"


def _clamp(value) -> float:
    return max(0.0, min(100.0, float(value)))


def calculate_overall_score(scores: dict) -> float:
    """Apply the Module 7 weights exactly once from the four final axes."""
    return round(sum(_clamp(scores[key]) * weight for key, weight in MODULE7_WEIGHTS.items()), 1)


def performance_rating(score: float) -> str:
    score = _clamp(score)
    if score >= 90:
        return "Excellent"
    if score >= 75:
        return "Good"
    if score >= 60:
        return "Average"
    if score >= 40:
        return "Needs Improvement"
    return "Poor"

STRUCTURE_MARKERS = [
    "first", "second", "third", "next", "then", "finally",
    "for example", "for instance", "because", "therefore", "as a result",
    "in summary", "to summarize", "additionally", "furthermore", "however",
]

STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "to", "of", "in", "on",
    "for", "and", "or", "with", "this", "that", "it", "as", "at", "by",
    "be", "i", "you", "we", "they", "he", "she", "my", "your", "our",
    "so", "but", "if", "can", "do", "does", "how", "what", "why", "which",
    "explain", "describe", "tell", "me", "about", "would", "could", "will",
}


def _words(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z']+", (text or "").lower())


def _keywords(text: str) -> set[str]:
    return {w for w in _words(text) if len(w) > 3 and w not in STOPWORDS}


def _score_communication(answer_text: str) -> float:
    words = _words(answer_text)
    word_count = len(words)
    sentences = [s for s in re.split(r"[.!?]+", answer_text or "") if s.strip()]
    sentence_count = max(len(sentences), 1)

    # Length: ideal answers land roughly 30-180 words. Too short or
    # extremely long answers get penalised.
    if word_count == 0:
        length_score = 0
    elif word_count < 10:
        length_score = 25 + word_count * 2
    elif word_count <= 180:
        length_score = 60 + min(word_count, 100) * 0.4
    else:
        length_score = max(60, 100 - (word_count - 180) * 0.15)

    # Structure: multi-sentence answers with connective/structuring
    # language communicate more clearly than a single unbroken blob.
    structure_hits = sum(1 for m in STRUCTURE_MARKERS if m in (answer_text or "").lower())
    structure_score = min(100, 50 + sentence_count * 8 + structure_hits * 6)

    score = 0.6 * length_score + 0.4 * structure_score
    return max(0, min(100, round(score, 1)))


def _score_technical(question_text: str, answer_text: str, domain: str = None, resume_skills=None) -> float:
    answer_words = _words(answer_text)
    if not answer_words:
        return 0.0

    answer_kw = _keywords(answer_text)
    question_kw = _keywords(question_text)
    domain_kw = _keywords(domain or "")
    resume_kw = {s.lower() for s in (resume_skills or [])}

    reference_kw = question_kw | domain_kw | resume_kw
    if not reference_kw:
        overlap_score = 50.0
    else:
        overlap = len(answer_kw & reference_kw)
        overlap_score = min(100, (overlap / max(1, len(reference_kw))) * 140)

    # Reward concrete, technical-sounding content: numbers, and a
    # reasonably rich (non-repetitive) vocabulary.
    has_numbers = bool(re.search(r"\d", answer_text or ""))
    unique_ratio = len(set(answer_words)) / len(answer_words)
    richness_score = min(100, unique_ratio * 100 + (10 if has_numbers else 0))

    length_factor = min(1.0, len(answer_words) / 20)  # very short answers can't be technical

    score = (0.65 * overlap_score + 0.35 * richness_score) * (0.4 + 0.6 * length_factor)
    return max(0, min(100, round(score, 1)))


def _score_confidence(answer_text: str) -> float:
    text_lower = (answer_text or "").lower()
    word_count = len(_words(answer_text))

    if word_count == 0:
        return 0.0

    filler_hits = sum(text_lower.count(p) for p in FILLER_PHRASES)
    assertive_hits = sum(1 for m in ASSERTIVE_MARKERS if m in text_lower)

    # Normalise filler frequency against answer length so a long,
    # otherwise-strong answer isn't wrecked by one stray "actually".
    filler_ratio = filler_hits / max(1, word_count / 15)

    score = 78 - filler_ratio * 14 + assertive_hits * 5

    if word_count < 8:
        score -= 25  # extremely short answers read as unsure / unprepared

    return max(0, min(100, round(score, 1)))


def _score_grammar(answer_text: str) -> float:
    text = (answer_text or "").strip()
    if not text:
        return 0.0

    score = 100.0
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]

    # Capitalisation: each sentence should start with a capital letter.
    uncapitalised = sum(1 for s in sentences if s and not s[0].isupper())
    score -= min(30, uncapitalised * 8)

    # Terminal punctuation on the answer as a whole.
    if text[-1] not in ".!?":
        score -= 8

    # Run-on detection: very long sentences (no punctuation breaks).
    words = _words(text)
    avg_sentence_len = len(words) / max(1, len(sentences))
    if avg_sentence_len > 45:
        score -= 15
    elif avg_sentence_len > 30:
        score -= 7

    # Repeated-word typo check ("the the", "is is", ...).
    repeats = len(re.findall(r"\b(\w+)\s+\1\b", text.lower()))
    score -= min(20, repeats * 10)

    # Double spaces / stray punctuation spacing.
    if "  " in text:
        score -= 5

    return max(0, min(100, round(score, 1)))


def _score_professionalism(answer_text: str, communication_score: float, time_spent_seconds: int = None) -> float:
    """Measure organization, professional language and measured time use.

    Time is deliberately a small component: a concise correct answer should
    not be punished simply because it was delivered quickly.
    """
    words = _words(answer_text)
    if not words:
        return 0.0

    text_lower = (answer_text or "").lower()
    marker_hits = sum(1 for marker in PROFESSIONAL_MARKERS if marker in text_lower)
    courtesy_and_tone = min(100.0, 68.0 + marker_hits * 6.0)

    time_score = None
    if time_spent_seconds is not None and time_spent_seconds >= 0:
        if 20 <= time_spent_seconds <= 240:
            time_score = 100.0
        elif time_spent_seconds < 20:
            time_score = max(55.0, 100.0 - (20 - time_spent_seconds) * 2.25)
        else:
            time_score = max(45.0, 100.0 - (time_spent_seconds - 240) * 0.12)

    components = [(communication_score, 0.65), (courtesy_and_tone, 0.25)]
    if time_score is not None:
        components.append((time_score, 0.10))
    total_weight = sum(weight for _, weight in components)
    return round(sum(value * weight for value, weight in components) / total_weight, 1)


def _question_feedback(scores: dict) -> str:
    category_labels = {
        "communication_score": "communication and structure",
        "confidence_score": "confidence",
        "technical_score": "technical relevance",
        "professionalism_score": "professional delivery",
    }
    strongest = max(MODULE7_WEIGHTS, key=lambda key: scores[key])
    weakest = min(MODULE7_WEIGHTS, key=lambda key: scores[key])
    if scores[weakest] >= 75:
        return "Strong response overall, especially in " + category_labels[strongest] + ". Add one concrete example to make it even more convincing."
    return "Your strongest area was " + category_labels[strongest] + ". Improve " + category_labels[weakest] + " by giving a direct answer, supporting evidence, and a concise conclusion."


def _heuristic_analyze(
    question_text: str,
    answer_text: str,
    domain: str = None,
    resume_skills=None,
    time_spent_seconds: int = None,
) -> dict:
    communication = _score_communication(answer_text)
    technical = _score_technical(question_text, answer_text, domain, resume_skills)
    confidence = _score_confidence(answer_text)
    grammar = _score_grammar(answer_text)
    # Grammar is a communication sub-score in Module 7, not a separate
    # weighted final category.
    communication = round(0.75 * communication + 0.25 * grammar, 1)
    professionalism = _score_professionalism(answer_text, communication, time_spent_seconds)

    final_scores = {
        "technical_score": technical,
        "communication_score": communication,
        "confidence_score": confidence,
        "professionalism_score": professionalism,
    }
    overall = calculate_overall_score(final_scores)

    return {
        **final_scores,
        "grammar_score": grammar,
        "overall_score": overall,
        "word_count": len(_words(answer_text)),
        "scoring_method": "heuristic",
        "scoring_version": SCORING_VERSION,
        "question_feedback": _question_feedback(final_scores),
    }


# ---------------------------------------------------------------------------
# Module 5 - Speech-to-Text & Communication Analysis
# Blends real, browser-captured speech-delivery metrics (filler-word count,
# speaking pace, recognition-confidence-derived pronunciation clarity) into
# the text-based scores above, when the candidate actually used voice input
# for the answer. A no-op when no speech metrics were supplied (i.e. the
# candidate typed their answer) - nothing here is ever a placeholder.
# ---------------------------------------------------------------------------
IDEAL_WPM_MIN = 110
IDEAL_WPM_MAX = 160


def apply_speech_metrics(
    scores: dict,
    filler_word_count: int = None,
    speaking_pace_wpm: float = None,
    pronunciation_score: float = None,
    word_count: int = None,
) -> dict:
    if filler_word_count is None and speaking_pace_wpm is None and pronunciation_score is None:
        return scores

    result = dict(scores)

    # Pace: full marks inside the ideal conversational range for a spoken
    # interview answer, tapering off the further outside it.
    pace_score = None
    if speaking_pace_wpm is not None and speaking_pace_wpm > 0:
        if IDEAL_WPM_MIN <= speaking_pace_wpm <= IDEAL_WPM_MAX:
            pace_score = 100.0
        elif speaking_pace_wpm < IDEAL_WPM_MIN:
            pace_score = max(0.0, 100 - (IDEAL_WPM_MIN - speaking_pace_wpm) * 1.5)
        else:
            pace_score = max(0.0, 100 - (speaking_pace_wpm - IDEAL_WPM_MAX) * 1.2)

    # Filler-word frequency, normalised per 100 words spoken.
    filler_score = None
    if filler_word_count is not None and word_count:
        filler_ratio = (filler_word_count / max(1, word_count)) * 100
        filler_score = max(0.0, 100 - filler_ratio * 12)

    speech_components = [s for s in (pace_score, filler_score) if s is not None]
    if speech_components:
        speech_communication_score = sum(speech_components) / len(speech_components)
        # Real spoken delivery counts for 40% next to the original
        # text-based communication read.
        result["communication_score"] = round(
            0.6 * scores["communication_score"] + 0.4 * speech_communication_score, 1
        )

    if pronunciation_score is not None:
        # Clear, well-recognised speech reads as more confident delivery.
        result["confidence_score"] = round(
            0.75 * scores["confidence_score"] + 0.25 * max(0, min(100, pronunciation_score)), 1
        )

    if filler_score is not None:
        result["confidence_score"] = round(
            0.85 * result.get("confidence_score", scores["confidence_score"]) + 0.15 * filler_score, 1
        )

    # Professional delivery partly follows the updated communication signal.
    result["professionalism_score"] = round(
        0.8 * result["professionalism_score"] + 0.2 * result["communication_score"], 1
    )
    result["overall_score"] = calculate_overall_score(result)

    return result


# ---------------------------------------------------------------------------
# Module 6 - Emotion Detection & Eye Tracking
# Lightly blends the session's running facial-expression/eye-contact-based
# confidence signal (from face-api.js running client-side, see
# app/routes/session_routes.py::submit_emotion_samples) into the answer's
# confidence_score. Kept to a 15% weight since the text-based signal is the
# primary, always-available read on any single answer.
# ---------------------------------------------------------------------------
def apply_visual_confidence(scores: dict, avg_visual_confidence: float = None) -> dict:
    if avg_visual_confidence is None:
        return scores

    result = dict(scores)
    result["confidence_score"] = round(
        0.85 * scores["confidence_score"] + 0.15 * max(0, min(100, avg_visual_confidence)), 1
    )
    result["overall_score"] = calculate_overall_score(result)
    return result


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
def analyze_answer(
    question_text: str,
    answer_text: str,
    domain: str = None,
    resume_skills=None,
    time_spent_seconds: int = None,
) -> dict:
    """
    Score one candidate answer. Tries Gemini first (if configured),
    always falls back to the local heuristic analyzer so scoring never
    fails or produces a placeholder value.
    """
    model = _get_gemini_model()
    heuristic = _heuristic_analyze(
        question_text, answer_text, domain, resume_skills, time_spent_seconds
    )

    if model is None or not (answer_text or "").strip():
        return heuristic

    prompt = (
        "You are grading one candidate interview answer. Score it honestly "
        "using evidence in the answer only. Return scores from 0 to 100: "
        "technical_score (accuracy, relevance, problem solving and domain knowledge), "
        "communication_score (clarity, structure and completeness), confidence_score "
        "(specific and assured language), grammar_score (a communication sub-score), "
        "and professionalism_score (organization, professional tone and etiquette).\n\n"
        f"Domain: {domain or 'general'}\n"
        f"Question: {question_text}\n"
        f"Candidate answer: {answer_text}\n\n"
        "Respond with ONLY a JSON object, no markdown fences, in exactly "
        "this shape: "
        '{"technical_score": <number>, "communication_score": <number>, '
        '"confidence_score": <number>, "grammar_score": <number>, '
        '"professionalism_score": <number>, "question_feedback": "<one evidence-based sentence>"}'
    )

    try:
        response = model.generate_content(prompt)
        raw = (response.text or "").strip()
        raw = re.sub(r"^```(json)?|```$", "", raw.strip(), flags=re.MULTILINE).strip()
        data = json.loads(raw)

        technical = _clamp(data["technical_score"])
        raw_communication = _clamp(data["communication_score"])
        confidence = _clamp(data["confidence_score"])
        grammar = _clamp(data["grammar_score"])
        communication = round(0.75 * raw_communication + 0.25 * grammar, 1)
        professionalism = round(
            0.8 * _clamp(data["professionalism_score"])
            + 0.2 * heuristic["professionalism_score"],
            1,
        )
        feedback = str(data.get("question_feedback") or "").strip()
        if not feedback or len(feedback) > 600:
            feedback = _question_feedback({
                "technical_score": technical,
                "communication_score": communication,
                "confidence_score": confidence,
                "professionalism_score": professionalism,
            })
        final_scores = {
            "technical_score": technical,
            "communication_score": communication,
            "confidence_score": confidence,
            "professionalism_score": professionalism,
        }
        overall = calculate_overall_score(final_scores)

        return {
            **final_scores,
            "grammar_score": grammar,
            "overall_score": overall,
            "word_count": heuristic["word_count"],
            "scoring_method": "gemini",
            "scoring_version": SCORING_VERSION,
            "question_feedback": feedback,
        }
    except Exception:
        return heuristic


def _average(values):
    clean = [float(value) for value in values if value is not None]
    return round(mean(clean), 1) if clean else None


def _safe_text_list(value, fallback):
    if not isinstance(value, list):
        return fallback
    cleaned = [str(item).strip()[:300] for item in value if str(item).strip()]
    return cleaned[:6] or fallback


def _deterministic_interview_feedback(category_scores: dict, interview) -> dict:
    labels = {
        "communication_score": "Communication",
        "confidence_score": "Confidence",
        "technical_score": "Technical relevance",
        "professionalism_score": "Professionalism",
    }
    ordered = sorted(category_scores, key=category_scores.get, reverse=True)
    strengths = [
        labels[key] + " was a clear strength at " + str(round(category_scores[key])) + "%."
        for key in ordered if category_scores[key] >= 75
    ]
    if not strengths:
        strongest = ordered[0]
        strengths = [labels[strongest] + " was your strongest category at " + str(round(category_scores[strongest])) + "%."]

    weaknesses = [
        labels[key] + " needs focused improvement (" + str(round(category_scores[key])) + "%)."
        for key in reversed(ordered) if category_scores[key] < 60
    ]
    if not weaknesses:
        weakest = ordered[-1]
        weaknesses = [labels[weakest] + " is the clearest opportunity to improve further."]

    suggestion_map = {
        "communication_score": "Structure each response as: direct answer, supporting example, and concise conclusion.",
        "confidence_score": "Reduce hedging and rehearse answers aloud while maintaining steady eye contact.",
        "technical_score": "Explain the reasoning behind your answer and support it with a concrete technical example.",
        "professionalism_score": "Use organized, concise responses and manage the time spent on each question.",
    }
    resource_map = {
        "communication_score": "Practice resource: record a two-minute answer and review its clarity, filler words, and structure.",
        "confidence_score": "Practice resource: complete a daily webcam mock answer focused on posture, pace, and eye contact.",
        "technical_score": "Practice resource: revise the interview domain and solve questions using explain-then-demonstrate answers.",
        "professionalism_score": "Practice resource: use the STAR framework for behavioral answers and timed response drills.",
    }
    improvement_keys = list(reversed(ordered))[:2]
    overall = calculate_overall_score(category_scores)
    return {
        "overall_summary": "You scored " + str(round(overall)) + "% (" + performance_rating(overall) + "). Your feedback is based on " + str(len([q for q in interview.questions if q.answer_text])) + " answered question(s).",
        "strengths": strengths[:3],
        "weaknesses": weaknesses[:3],
        "improvement_suggestions": [suggestion_map[key] for key in improvement_keys],
        "practice_recommendations": ["Repeat the lowest-scoring question and compare the new answer with the saved feedback.", "Complete another interview in the same domain after focused practice."],
        "learning_resources": [resource_map[key] for key in improvement_keys],
        "category_explanations": {
            labels[key]: labels[key] + " contributed " + str(int(MODULE7_WEIGHTS[key] * 100)) + "% of the final score and was measured at " + str(round(value)) + "%."
            for key, value in category_scores.items()
        },
    }


def _enhance_interview_feedback(interview, category_scores: dict, fallback: dict) -> tuple[dict, str]:
    model = _get_gemini_model()
    if model is None:
        return fallback, "heuristic"

    evidence = {
        "domain": interview.domain,
        "interview_type": getattr(interview.interview_type, "value", interview.interview_type),
        "scores": category_scores,
        "answers": [
            {
                "question": q.question_text,
                "answer": q.answer_text,
                "scores": {
                    "communication": q.communication_score,
                    "confidence": q.confidence_score,
                    "technical": q.technical_score,
                    "professionalism": q.professionalism_score,
                },
                "feedback": q.question_feedback,
            }
            for q in interview.questions if q.answer_text
        ],
    }
    prompt = (
        "Create concise interview coaching feedback using ONLY the supplied evidence. "
        "Do not invent technical errors, behavior, or achievements. Return JSON with: "
        "overall_summary (string), strengths (array), weaknesses (array), "
        "improvement_suggestions (array), practice_recommendations (array), "
        "learning_resources (array). Evidence: " + json.dumps(evidence, default=str)
    )
    try:
        response = model.generate_content(prompt)
        raw = re.sub(r"^```(json)?|```$", "", (response.text or "").strip(), flags=re.MULTILINE).strip()
        data = json.loads(raw)
        enhanced = dict(fallback)
        summary = str(data.get("overall_summary") or "").strip()
        if summary and len(summary) <= 800:
            enhanced["overall_summary"] = summary
        for key in ("strengths", "weaknesses", "improvement_suggestions", "practice_recommendations", "learning_resources"):
            enhanced[key] = _safe_text_list(data.get(key), fallback[key])
        return enhanced, "gemini"
    except Exception:
        return fallback, "heuristic"


def build_interview_assessment(interview) -> dict:
    """Build and validate the stored Module 7 assessment from real session data."""
    answered = [q for q in interview.questions if q.answer_text and q.overall_score is not None]
    if not answered:
        return None

    communication = _average([q.communication_score for q in answered]) or 0.0
    technical = _average([q.technical_score for q in answered]) or 0.0
    text_confidence = _average([q.confidence_score for q in answered]) or 0.0
    professionalism_values = [
        q.professionalism_score
        if q.professionalism_score is not None
        else round(0.8 * (q.communication_score or 0) + 0.2 * (q.grammar_score or 0), 1)
        for q in answered
    ]
    professionalism = _average(professionalism_values) or 0.0

    session = interview.session
    confidence_components = [(text_confidence, 0.65)]
    if session and session.avg_visual_confidence is not None:
        confidence_components.append((session.avg_visual_confidence, 0.20))
    if session and session.eye_contact_percentage is not None:
        confidence_components.append((session.eye_contact_percentage, 0.10))
    if session and session.attention_percentage is not None:
        confidence_components.append((session.attention_percentage, 0.05))
    confidence_weight = sum(weight for _, weight in confidence_components)
    confidence = round(sum(value * weight for value, weight in confidence_components) / confidence_weight, 1)

    violation_penalty = min(15.0, float(session.fullscreen_violations * 3)) if session else 0.0
    professionalism = round(max(0.0, professionalism - violation_penalty), 1)
    category_scores = {
        "communication_score": communication,
        "confidence_score": confidence,
        "technical_score": technical,
        "professionalism_score": professionalism,
    }
    overall = calculate_overall_score(category_scores)

    spoken = [q for q in answered if q.speech_duration_seconds]
    missing_data = []
    if not spoken:
        missing_data.append("speech_metrics")
    if not session or not session.emotion_sample_count:
        missing_data.append("camera_behavior_metrics")

    sub_scores = {
        "grammar_quality": _average([q.grammar_score for q in answered]),
        "speech_clarity": _average([q.pronunciation_score for q in spoken]),
        "filler_word_frequency": _average([q.filler_word_count for q in spoken]),
        "speaking_pace_wpm": _average([q.speaking_pace_wpm for q in spoken]),
        "eye_contact_consistency": session.eye_contact_percentage if session else None,
        "facial_engagement": session.avg_engagement if session else None,
        "visual_confidence": session.avg_visual_confidence if session else None,
        "attention_level": session.attention_percentage if session else None,
        "fullscreen_violations": session.fullscreen_violations if session else 0,
        "professionalism_violation_penalty": violation_penalty,
    }

    fallback = _deterministic_interview_feedback(category_scores, interview)
    feedback, feedback_method = _enhance_interview_feedback(interview, category_scores, fallback)
    answer_methods = {q.scoring_method for q in answered if q.scoring_method}
    scoring_method = "gemini" if "gemini" in answer_methods else "heuristic"

    return {
        **category_scores,
        "overall_score": overall,
        "performance_rating": performance_rating(overall),
        "feedback": feedback,
        "sub_scores": sub_scores,
        "missing_data": missing_data,
        "scoring_method": scoring_method,
        "feedback_method": feedback_method,
        "scoring_version": SCORING_VERSION,
    }
