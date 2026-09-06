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

# Bounded so Module 6 — uncalibrated for expression, and eye-contact norms vary
# by culture and neurodivergence — can only nudge the transcript-based
# confidence score, never dominate it or override it when no reliable reading
# exists.
BEHAVIOR_MODIFIER_CAP = 8
BEHAVIOR_MIN_TRACKED_SECONDS = 60  # ignore near-empty sessions

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


def apply_behavior_modifier(base_confidence: int, behavior_report: Optional[dict]) -> int:
    """
    Nudges the transcript-based confidence score using Module 6's measured
    eye-contact and engagement — never decides it outright.

    Returns base_confidence unchanged when there's no usable behavior data: no
    camera, calibration never completed, or too short a session to trust.
    """
    if not behavior_report or not behavior_report.get("available"):
        return base_confidence
    if behavior_report.get("tracked_seconds", 0) < BEHAVIOR_MIN_TRACKED_SECONDS:
        return base_confidence

    eye_contact = behavior_report.get("eye_contact_percent")
    engagement = behavior_report.get("engagement")
    if eye_contact is None:
        return base_confidence

    # Centered on 65% eye contact (roughly "normal" per the calibration notes)
    # so this reads as a nudge around a plausible baseline, not a judgment that
    # only 100% eye contact is good.
    delta = (eye_contact - 65) / 35 * BEHAVIOR_MODIFIER_CAP
    if engagement == "Low":
        delta -= 2
    elif engagement == "High":
        delta += 2

    delta = max(-BEHAVIOR_MODIFIER_CAP, min(BEHAVIOR_MODIFIER_CAP, delta))
    return max(0, min(100, round(base_confidence + delta)))


def time_management_score(interview) -> Optional[int]:
    """
    0-100 from measured overrun, not an AI guess. None when there's no time
    budget to measure against (untimed practice sessions) — better than a
    misleading number.
    """
    from app.services.session_timing import overrun_seconds, session_budget_seconds

    budget = session_budget_seconds(interview)
    if not budget:
        return None
    overrun = overrun_seconds(interview)
    if overrun <= 0:
        return 100
    # A full budget's worth of overrun bottoms out at 40, not 0 — running over
    # is a real ding, not disqualifying on its own.
    penalty = min(60, round(overrun / budget * 60))
    return 100 - penalty


def professionalism_axis(
    ai_tone_score: int, organization_score: int, time_score: Optional[int]
) -> int:
    """
    Professionalism = tone/etiquette (AI) + response organization (AI) + time
    management (measured). Reweighted when there's no timer so an untimed
    practice session isn't penalised for lacking one.
    """
    if time_score is None:
        return round(0.6 * ai_tone_score + 0.4 * organization_score)
    return round(0.45 * ai_tone_score + 0.30 * organization_score + 0.25 * time_score)


def rating_label(score: float) -> str:
    for threshold, label in RATING_BANDS:
        if score >= threshold:
            return label
    return "Poor"


def answer_overall(
    score: dict,
    time_score: Optional[int] = None,
) -> Optional[float]:
    """
    One answer's weighted composite, with the interview-level time adjustment
    applied.

    Time management has to be applied here rather than where the answer was
    first graded, because it does not exist at that moment: one answer has no
    session overrun. The raw AI components are kept in the stored score block
    precisely so this can be recomputed later without a second model call.

    NOTHING FROM MODULE 6 REACHES THIS FUNCTION, and nothing may be added that
    does. `axes["confidence"]` is whatever transcript-based scoring produced,
    full stop. The camera data is submitted by the candidate's own browser and
    is therefore forgeable; the moment it can move `overall_score` it can move
    a leaderboard rank, which is the promise Module 6 made to candidates at
    Gate 1 and the thing test_recruiter_behavior.py exists to enforce. A small
    bound does not make that acceptable — it only makes it smaller.

    With no time score supplied this returns the stored `overall` unchanged,
    which is what keeps mid-interview views and the final stamp consistent.
    """
    axes = {key: score.get(key, 0) for key in WEIGHTS}

    # Re-blend professionalism only when the timer adds something the stored
    # value did not already account for. `professionalism_tone` is absent on
    # answers graded before Section 2 shipped; those keep their stored blend.
    tone = score.get("professionalism_tone")
    organization = score.get("response_organization")
    if time_score is not None and tone is not None and organization is not None:
        axes["professionalism"] = professionalism_axis(tone, organization, time_score)

    if not any(key in score for key in WEIGHTS):
        return score.get("overall")
    return weighted_overall(axes)


def aggregate_score(
    analyses: List[Optional[dict]],
    time_score: Optional[int] = None,
) -> Optional[float]:
    """
    An interview's overall score: the average of its answered questions' scores.

    `time_score` is the one interview-level adjustment, and it is a measured
    figure. Module 6's behaviour data deliberately has no parameter here — see
    answer_overall.

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
        overall = answer_overall(score, time_score)
        if overall is not None:
            scores.append(overall)

    if not scores:
        return None
    return round(sum(scores) / len(scores), 1)
