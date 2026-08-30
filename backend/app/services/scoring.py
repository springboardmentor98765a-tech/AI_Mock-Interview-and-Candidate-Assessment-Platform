"""
Module 5 — turning per-answer AI scores into an interview result.

app.services.speech_analysis produces the per-answer AnswerScore (via
ai_provider.score_answer) and stores it inside InterviewQuestion.analysis
under a "score" key, alongside the fillers/pace/communication data it already
holds. Everything here is pure arithmetic over that stored data — no AI call,
no database access — so the exact same numbers come out whether they are
requested live (the /analysis endpoint, mid-interview) or computed once at
completion (Interview.overall_score, stored so it survives the rubric being
retuned later).

The rubric weights are fixed by the platform, not configurable per interview,
so unlike Module 4's per-question timer there is nothing here to snapshot —
the same weights always apply to every interview, old or new.
"""

from typing import Dict, List, Optional

# Communication 30, Confidence 25, Technical Relevance 30, Professionalism 15.
WEIGHTS: Dict[str, float] = {
    "communication": 0.30,
    "confidence": 0.25,
    "technical_relevance": 0.30,
    "professionalism": 0.15,
}

# Checked in score order; the first threshold an interview's score clears wins.
RATING_BANDS = (
    (90, "Excellent"),
    (75, "Good"),
    (60, "Average"),
    (40, "Needs Improvement"),
    (0, "Poor"),
)


def weighted_overall(axes: Dict[str, int]) -> float:
    """
    The rubric's weighted composite over one set of axis scores, 0-100.

    A missing axis degrades to 0 for that axis rather than raising — Pydantic
    guarantees all four today, but this must not turn a validation change
    elsewhere into an unhandled 500 here.
    """
    return round(sum(axes.get(key, 0) * weight for key, weight in WEIGHTS.items()), 1)


def rating_label(score: float) -> str:
    for threshold, label in RATING_BANDS:
        if score >= threshold:
            return label
    return "Poor"


def aggregate_score(analyses: List[Optional[dict]]) -> Optional[float]:
    """
    An interview's overall score: the average of its answered questions' scores.

    Takes the same `analyses` shape as speech_analysis.summarise (one entry
    per question, in whatever order, None or {"available": False, ...} for
    anything not analysed) so the live /analysis view and the score stored on
    Interview.overall_score at completion are always computed the same way.

    Skipped and unanswered questions contribute nothing — they were never
    graded, so averaging in a zero would punish ending an interview early
    exactly as hard as answering every question badly. Returns None when no
    answer has a score yet, rather than a misleading 0.

    Checks `score["available"]`, not just `analysis["available"]`: an answer
    can be fully analysed (transcribed, measured) while its score specifically
    failed (provider outage, quota). That score block can still carry a stale
    or placeholder `overall` — trusting it without checking its own
    `available` flag would silently score the candidate on a failed call.
    """
    scores = []
    for analysis in analyses:
        if not analysis or not analysis.get("available"):
            continue
        score = analysis.get("score") or {}
        if not score.get("available"):
            continue
        overall = score.get("overall")
        if overall is not None:
            scores.append(overall)

    if not scores:
        return None
    return round(sum(scores) / len(scores), 1)
