"""
Module 4 — the interview clock.

Two jobs: turning the administrator's session budget into a per-question clock,
and answering "how long has this taken, and how long is left".

Every figure here excludes paused time. That is the whole reason the pause
bookkeeping exists — a duration that counts the ten minutes a candidate spent
away from the keyboard is not a measure of the interview.

`PlatformSettings.session_minutes` is a whole-interview budget. The candidate,
though, answers one question at a time, so the number that has to appear on
screen is seconds-per-question. That division happens here, once, so the
countdown the candidate sees and any later duration checks cannot disagree.

The result is snapshotted onto the Interview row when the session starts. An
administrator changing the platform setting halfway through must not move the
goalposts under someone already answering.
"""

from datetime import datetime, timezone
from typing import Optional

# A short interview split across many questions can divide down to a few
# seconds, which is not an interview — it is a stopwatch with a question
# attached. Floor it at something a person can actually answer in.
MIN_QUESTION_SECONDS = 30

# The other end: one question should not be allowed to eat a whole afternoon
# just because an administrator typed 180 minutes and asked for two questions.
#
# Raised from 10 minutes because that ceiling silently flattened the clock for
# short interviews: at a 30-minute budget, 1, 2 and 3 questions all came out at
# exactly 10:00, which reads as "the timer never changes" rather than as a cap.
MAX_QUESTION_SECONDS = 15 * 60

# How the interview's own setup stretches or compresses the clock.
#
# The administrator's session_minutes is the budget for a MEDIUM interview. A
# HARD question genuinely takes longer to think through than an EASY one, so
# difficulty scales the whole session rather than redistributing a fixed pot —
# a hard interview is allowed to run longer than an easy one.
DIFFICULTY_FACTORS = {
    "EASY": 0.75,
    "MEDIUM": 1.0,
    "HARD": 1.35,
}

# Type matters too, and not in the same direction as difficulty.
#
# APTITUDE questions are worked out on paper before they can be answered, so
# they need the most time per question. HR questions are recall — motivation,
# notice period — and need the least. TECHNICAL and BEHAVIORAL sit in between,
# with BEHAVIORAL slightly longer because a STAR answer has four parts to get
# through.
TYPE_FACTORS = {
    "APTITUDE": 1.4,
    "TECHNICAL": 1.1,
    "BEHAVIORAL": 1.15,
    "HR": 0.85,
}


def per_question_seconds(
    session_minutes: int,
    question_count: int,
    *,
    difficulty: Optional[str] = None,
    interview_type: Optional[str] = None,
) -> int:
    """
    Seconds per question for one interview, from the admin budget and the
    interview's own setup.

    The split is the base; `difficulty` and `interview_type` then scale it, so
    two interviews with the same question count but different setups get
    different clocks. Without this the timer was the same 10:00 whatever the
    candidate chose, which is what makes a countdown look decorative.

    Both factors default to 1.0 when the setup is unknown or unrecognised, so
    an unfamiliar value degrades to the plain even split rather than raising.

    Returns a value in [MIN_QUESTION_SECONDS, MAX_QUESTION_SECONDS]. A
    question_count of zero would be a division by zero rather than a
    meaningful answer, so it is rejected by the caller before reaching here —
    but guard anyway, because an interview with no questions has no timer.
    """
    if question_count <= 0:
        return MIN_QUESTION_SECONDS

    budget = max(int(session_minutes), 0) * 60
    share = budget / question_count

    share *= DIFFICULTY_FACTORS.get((difficulty or "").upper(), 1.0)
    share *= TYPE_FACTORS.get((interview_type or "").upper(), 1.0)

    return max(MIN_QUESTION_SECONDS, min(MAX_QUESTION_SECONDS, round(share)))


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    """
    SQLite returns naive datetimes even from a DateTime(timezone=True) column
    — a well-known SQLAlchemy/SQLite quirk — while Postgres does not. Treat a
    naive value as UTC (every datetime this app writes is UTC) so timing math
    never has to guess which database produced it, and mixing it with
    `_now()` never raises.
    """
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def elapsed_seconds(interview) -> Optional[int]:
    """
    Interview time spent so far, excluding pauses.

    For a finished interview this measures to `completed_at`; for a running one,
    to now. Returns None when the interview has not started — zero would be a
    claim that it started and no time has passed, which is a different thing
    from "it has not started".
    """
    started_at = _aware(interview.started_at)
    if started_at is None:
        return None

    end = _aware(interview.completed_at) or _now()
    total = (end - started_at).total_seconds()

    paused = interview.total_paused_seconds or 0
    # A pause that is still open has not been added to the running total yet,
    # so count it here — otherwise the clock would tick on while paused.
    paused_at = _aware(interview.paused_at)
    if paused_at is not None:
        paused += max((_now() - paused_at).total_seconds(), 0)

    return max(int(total - paused), 0)


def session_budget_seconds(interview) -> Optional[int]:
    """
    The whole-interview time budget: the per-question clock across every
    question. None when no clock was ever set for this interview.
    """
    if not interview.question_seconds:
        return None
    return interview.question_seconds * max(len(interview.questions), 0)


def remaining_seconds(interview) -> Optional[int]:
    """
    Time left in the session budget, floored at zero.

    Floored rather than allowed to go negative: the countdown is soft, so
    "overrun" is a state the caller reads from `overrun_seconds`, not a
    negative remaining time that arithmetic elsewhere might trust.
    """
    budget = session_budget_seconds(interview)
    spent = elapsed_seconds(interview)
    if budget is None or spent is None:
        return None
    return max(budget - spent, 0)


def overrun_seconds(interview) -> int:
    """How far past the budget this interview has run. Zero when within it."""
    budget = session_budget_seconds(interview)
    spent = elapsed_seconds(interview)
    if budget is None or spent is None:
        return 0
    return max(spent - budget, 0)


def question_seconds_spent(question) -> Optional[float]:
    """
    Time on one question: from being asked to being answered or skipped.

    Distinct from `answer_duration_seconds`, which is how long the candidate
    *spoke*. This one includes reading and thinking, and is the larger of the
    two. Reporting either as the other would be wrong in opposite directions.

    None while a question is still open — an in-flight question has no
    finished duration, and using "now" would produce a number that changes
    every time it is read.
    """
    if question.asked_at is None:
        return None
    finished = question.answered_at or question.skipped_at
    if finished is None:
        return None
    return round(max((finished - question.asked_at).total_seconds(), 0), 1)


def finalise_duration(interview) -> int:
    """
    The duration to stamp on an interview that is ending.

    Called at the moment of completion, so `elapsed_seconds` is measuring to
    an end that has just been set.
    """
    return elapsed_seconds(interview) or 0
