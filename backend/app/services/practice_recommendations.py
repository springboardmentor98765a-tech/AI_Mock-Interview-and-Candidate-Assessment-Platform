"""
The last two outputs of the AI Feedback spec: practice recommendations and
learning resources.

Rule-based rather than another model call per interview — cheaper,
deterministic, and auditable against the axis scores that produced it. The
mapping below is a fixed table, so a candidate who scores the same twice gets
the same advice twice, and anyone reviewing a report can check the advice
followed from the numbers.

Deliberately keyed on the *weakest* axis only. Advice for all four axes at once
is advice for none of them, and the axis a candidate lost the most on is the one
worth an hour of their week.
"""

from typing import Dict, Optional

WEAK_AXIS_RESOURCES = {
    "communication": {
        "recommendation": (
            "Practice answering out loud and recording yourself — most clarity "
            "issues disappear once you can hear your own rambling."
        ),
        "resources": [
            "Toastmasters speech-clarity exercises",
            "Grammarly for written practice answers",
        ],
    },
    "confidence": {
        "recommendation": (
            "Do 3 mock interviews this week focused only on cutting hedging "
            "language ('I think', 'maybe', 'sort of')."
        ),
        "resources": ["Pramp mock interview practice", "interviewing.io"],
    },
    "technical_relevance": {
        "recommendation": (
            "Pick the weakest-scored question's topic and write a one-page "
            "explanation from memory, then check it against docs."
        ),
        "resources": ["NeetCode for technical rounds", "The System Design Primer (GitHub)"],
    },
    "professionalism": {
        "recommendation": "Time yourself answering 5 practice questions in under 2 minutes each.",
        "resources": ["Big Interview's professionalism module"],
    },
}


def generate_feedback_extras(axes: Dict[str, int]) -> Dict:
    """Practice recommendations + learning resources for the lowest-scoring axis."""
    weakest = min(axes, key=axes.get)
    entry = WEAK_AXIS_RESOURCES[weakest]
    return {
        "practice_recommendations": [entry["recommendation"]],
        "learning_resources": entry["resources"],
        "weakest_axis": weakest,
    }


def average_axes(analyses) -> Optional[Dict[str, int]]:
    """
    Mean of each rubric axis across the answers that were actually graded.

    Returns None when nothing has been graded yet, so the caller can omit the
    whole feedback block rather than recommending practice off no data. Only
    axes present in every graded answer are averaged; a missing axis is skipped
    rather than counted as zero, which would otherwise make whichever axis a
    provider failed to return look like the candidate's weakest area.
    """
    from app.services.scoring import WEIGHTS

    totals: Dict[str, int] = {}
    counts: Dict[str, int] = {}

    for analysis in analyses:
        if not analysis or not analysis.get("available"):
            continue
        score = analysis.get("score") or {}
        if not score.get("available"):
            continue
        for axis in WEIGHTS:
            value = score.get(axis)
            if isinstance(value, (int, float)):
                totals[axis] = totals.get(axis, 0) + value
                counts[axis] = counts.get(axis, 0) + 1

    if not totals:
        return None
    return {axis: round(totals[axis] / counts[axis]) for axis in totals}
