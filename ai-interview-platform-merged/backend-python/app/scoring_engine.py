"""
Module 7 — AI Feedback & Scoring.

Overall Score = Communication(30%) + Confidence(25%) + Technical Relevance(30%) + Professionalism(15%)

Where each category comes from a blend of real, measured signals (where
available) and the AI provider chain's qualitative reading of the
transcript — never the AI alone when a deterministic signal exists,
and never blocked on the AI being available:

- Communication (30%): computed ENTIRELY from Module 5 per-answer data
  (grammar_issue_count, filler_word_count, speech_wpm, answer length,
  pronunciation_score) — deterministic, no LLM needed. Blended with the
  AI's own communication read when available, weighted toward the
  measured data since it's the more concrete signal.
- Confidence (25%): from the Module 6 webcam-analytics snapshot the
  frontend sends at finish time (eye contact %, engagement %, attention
  level) when a proctored session was used, blended with the AI's read
  of confidence from the transcript. Falls back to AI-only, then to a
  neutral default, when there's no webcam data (typed/voice-only
  sessions).
- Technical Relevance (30%): the AI's judgment — genuinely requires
  understanding answer content (technical accuracy, keyword relevance,
  problem-solving, domain knowledge), which no offline heuristic can
  reliably do. Falls back to the offline simulator's value if AI is
  unavailable.
- Professionalism (15%): blends real signals (proctoring violations as
  an interview-etiquette proxy, time-per-answer vs a reasonable target
  as a time-management proxy) with the AI's read of response
  organization / professional tone.

If every AI provider is unavailable, whatever this module can't compute
deterministically falls back to question_bank.generate_assessment()'s
values, so a report is always produced — this mirrors the rest of the
project's "always works with zero API keys" design.
"""
from statistics import mean
from typing import Optional

RATING_BANDS = [
    (90, "Excellent"),
    (75, "Good"),
    (60, "Average"),
    (40, "Needs Improvement"),
    (0, "Poor"),
]

_ATTENTION_SCORE_MAP = {"high": 100, "medium": 60, "low": 20}
_CONFIDENCE_LABEL_SCORE_MAP = {"high": 90, "moderate": 65, "low": 35}

# A reasonable target band for time spent on one answer — used only as
# a time-management proxy, not a hard rule (candidates who think deeply
# aren't penalized much; only genuine extremes are).
_TIME_TARGET_MIN_S = 20
_TIME_TARGET_MAX_S = 150


def rating_label(score: int) -> str:
    for threshold, label in RATING_BANDS:
        if score >= threshold:
            return label
    return "Poor"


def _communication_score_from_answers(answers: list) -> Optional[int]:
    scored = [a for a in answers if (a.answer_text or "").strip()]
    if not scored:
        return None

    # Grammar quality: fewer flagged issues per answer -> higher score.
    avg_grammar_issues = mean((a.grammar_issue_count or 0) for a in scored)
    grammar_score = max(0, 100 - avg_grammar_issues * 20)

    # Filler-word frequency: fillers as a % of total words used.
    total_words = sum(len((a.answer_text or "").split()) for a in scored)
    total_fillers = sum((a.filler_word_count or 0) for a in scored)
    filler_rate_pct = (total_fillers / total_words * 100) if total_words else 0
    filler_score = max(0, 100 - filler_rate_pct * 10)

    # Speaking pace: only measured for voice answers; ideal ~110-160 wpm.
    wpm_values = [a.speech_wpm for a in scored if a.speech_wpm]
    if wpm_values:
        def _pace_fit(w):
            if 110 <= w <= 160:
                return 100
            dist = min(abs(w - 110), abs(w - 160))
            return max(0, 100 - dist * 1.5)

        pace_score = mean(_pace_fit(w) for w in wpm_values)
    else:
        pace_score = 75  # neutral when unmeasurable (typed answers)

    # Response completeness: word count relative to a modest floor.
    def _completeness_fit(a):
        words = len((a.answer_text or "").split())
        return min(100, round(words / 25 * 100))

    completeness_score = mean(_completeness_fit(a) for a in scored)

    # Speech clarity: the Module 5 pronunciation/recognition-confidence
    # proxy where available (voice answers only), else neutral.
    clarity_values = [a.pronunciation_score for a in scored if a.pronunciation_score is not None]
    clarity_score = mean(clarity_values) if clarity_values else 75

    return round(mean([grammar_score, filler_score, pace_score, completeness_score, clarity_score]))


def _professionalism_score(proctoring_violations: int, answers: list) -> Optional[int]:
    parts = []

    # Interview etiquette proxy: fewer proctoring violations -> higher score.
    etiquette_score = max(0, 100 - (proctoring_violations or 0) * 15)
    parts.append(etiquette_score)

    # Time management proxy: time spent per answer vs a reasonable band.
    timed = [a.time_taken_seconds for a in answers if a.time_taken_seconds]
    if timed:
        def _time_fit(t):
            if _TIME_TARGET_MIN_S <= t <= _TIME_TARGET_MAX_S:
                return 100
            dist = min(abs(t - _TIME_TARGET_MIN_S), abs(t - _TIME_TARGET_MAX_S))
            return max(0, 100 - dist * 0.8)

        parts.append(mean(_time_fit(t) for t in timed))

    return round(mean(parts)) if parts else None


def _confidence_score_from_behavior(behavior_metrics: Optional[dict]) -> Optional[int]:
    if not behavior_metrics:
        return None
    values = []
    if behavior_metrics.get("eyeContactPct") is not None:
        values.append(behavior_metrics["eyeContactPct"])
    if behavior_metrics.get("engagementPct") is not None:
        values.append(behavior_metrics["engagementPct"])
    attention = (behavior_metrics.get("attentionLevel") or "").lower()
    if attention in _ATTENTION_SCORE_MAP:
        values.append(_ATTENTION_SCORE_MAP[attention])
    confidence_label = (behavior_metrics.get("confidenceLabel") or "").lower()
    if confidence_label in _CONFIDENCE_LABEL_SCORE_MAP:
        values.append(_CONFIDENCE_LABEL_SCORE_MAP[confidence_label])
    return round(mean(values)) if values else None


def _blend(deterministic: Optional[int], ai_opinion: Optional[int], det_weight: float = 0.6) -> Optional[int]:
    if deterministic is not None and ai_opinion is not None:
        return round(deterministic * det_weight + ai_opinion * (1 - det_weight))
    return deterministic if deterministic is not None else ai_opinion


_DEFAULT_FEEDBACK = {
    "strengths": ["Completed the interview and engaged with every question asked."],
    "weaknesses": ["Not enough signal was available yet to pinpoint specific weaknesses."],
    "improvements": ["Try a full session with your camera and microphone enabled for a deeper report."],
    "practice_recommendations": ["Practice answering out loud to build comfort with verbal delivery."],
    "learning_resources": ["Search for STAR-method interview answer structuring guides."],
}


def compute_score(
    proctoring_violations: int,
    answers: list,
    behavior_metrics: Optional[dict],
    ai_result: Optional[dict],
    fallback: dict,
) -> dict:
    """Combines everything into the final Module 7 result. `fallback` is
    question_bank.generate_assessment()'s output, used wherever nothing
    else is available for a category (e.g. AI totally down AND no
    webcam/answer data — should be rare, but the report must always
    render something)."""
    det_communication = _communication_score_from_answers(answers)
    det_professionalism = _professionalism_score(proctoring_violations, answers)
    det_confidence = _confidence_score_from_behavior(behavior_metrics)

    ai_result = ai_result or {}
    communication = _blend(det_communication, ai_result.get("skill_communication"))
    confidence = _blend(det_confidence, ai_result.get("skill_confidence"), det_weight=0.7)
    professionalism = _blend(det_professionalism, ai_result.get("skill_professionalism"))
    technical = ai_result.get("skill_technical")  # no deterministic source — content judgment only

    communication = communication if communication is not None else fallback["skill_communication"]
    confidence = confidence if confidence is not None else fallback["skill_confidence"]
    professionalism = professionalism if professionalism is not None else fallback.get("skill_professionalism", 65)
    technical = technical if technical is not None else fallback["skill_technical"]

    overall = round(communication * 0.30 + confidence * 0.25 + technical * 0.30 + professionalism * 0.15)

    feedback = ai_result.get("feedback") or fallback.get("feedback") or _DEFAULT_FEEDBACK

    return {
        "score": overall,
        "skill_communication": communication,
        "skill_confidence": confidence,
        "skill_technical": technical,
        "skill_professionalism": professionalism,
        "skill_problem_solving": ai_result.get("skill_problem_solving", fallback.get("skill_problem_solving")),
        "rating_label": rating_label(overall),
        "ai_feedback": ai_result.get("ai_feedback") or fallback.get("ai_feedback"),
        "feedback": feedback,
    }
