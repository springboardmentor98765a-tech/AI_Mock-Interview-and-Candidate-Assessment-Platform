"""
Unit tests for Module 7 scoring (app/scoring_engine.py), focused on the
"candidate answered nothing" bug: compute_score() used to fall back to
question_bank's random 60-97 simulator for any missing category,
including a completely blank interview, producing a plausible-looking
but meaningless high score for zero participation.
"""
import sys
import os
from types import SimpleNamespace

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.scoring_engine import compute_score


def _answer(text="", **overrides):
    defaults = dict(
        answer_text=text,
        grammar_issue_count=0,
        filler_word_count=0,
        speech_wpm=None,
        pronunciation_score=None,
        time_taken_seconds=None,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


# A plausible-looking random fallback, matching what
# question_bank.generate_assessment() actually returns in shape.
_SIMULATOR_FALLBACK = {
    "skill_communication": 82,
    "skill_confidence": 79,
    "skill_technical": 85,
    "skill_professionalism": 80,
    "skill_problem_solving": 83,
    "feedback": {"strengths": ["..."], "weaknesses": [], "improvements": [], "practice_recommendations": [], "learning_resources": []},
    "ai_feedback": "Simulated feedback.",
}


def test_blank_interview_scores_zero_not_the_random_simulator():
    answers = [_answer(""), _answer("   "), _answer(None)]
    result = compute_score(
        proctoring_violations=0,
        answers=answers,
        behavior_metrics=None,
        ai_result=None,
        fallback=_SIMULATOR_FALLBACK,
    )
    assert result["score"] == 0
    assert result["skill_communication"] == 0
    assert result["skill_technical"] == 0
    assert result["scoring_source"] == "no_answers"


def test_real_answers_are_scored_normally_not_forced_to_zero():
    answers = [
        _answer("I have three years of experience building REST APIs with Node and Express, "
                 "and I usually structure my answers around a specific project example."),
        _answer("For state management I reach for Redux when the app is large enough to need it."),
    ]
    result = compute_score(
        proctoring_violations=0,
        answers=answers,
        behavior_metrics={"eyeContactPct": 90, "engagementPct": 85},
        ai_result={"skill_technical": 78, "skill_communication": 80, "skill_confidence": 75, "skill_professionalism": 88},
        fallback=_SIMULATOR_FALLBACK,
    )
    assert result["score"] > 0
    assert result["scoring_source"] == "ai"


def test_partial_answers_still_score_above_zero():
    # One real answer, one blank — should NOT hit the zero-answer path.
    answers = [
        _answer("A reasonably complete answer about my background and relevant projects."),
        _answer(""),
    ]
    result = compute_score(
        proctoring_violations=0,
        answers=answers,
        behavior_metrics=None,
        ai_result=None,
        fallback=_SIMULATOR_FALLBACK,
    )
    assert result["scoring_source"] != "no_answers"
    assert result["score"] > 0
