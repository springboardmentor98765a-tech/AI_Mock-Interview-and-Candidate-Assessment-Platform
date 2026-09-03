import os
import sys
import types
from types import SimpleNamespace

os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
os.environ.setdefault("SESSION_SECRET_KEY", "test-session-secret")
os.environ["GEMINI_API_KEY"] = ""
if "dotenv" not in sys.modules:
    dotenv_stub = types.ModuleType("dotenv")
    dotenv_stub.load_dotenv = lambda: None
    sys.modules["dotenv"] = dotenv_stub

from app.scoring import (  # noqa: E402
    analyze_answer,
    build_interview_assessment,
    calculate_overall_score,
    performance_rating,
)


def test_module7_weights_are_exact():
    scores = {
        "communication_score": 80,
        "confidence_score": 70,
        "technical_score": 90,
        "professionalism_score": 60,
    }
    assert calculate_overall_score(scores) == 77.5


def test_score_clamping_and_rating_boundaries():
    scores = {
        "communication_score": 120,
        "confidence_score": -20,
        "technical_score": 100,
        "professionalism_score": 100,
    }
    assert calculate_overall_score(scores) == 75.0
    assert performance_rating(90) == "Excellent"
    assert performance_rating(75) == "Good"
    assert performance_rating(60) == "Average"
    assert performance_rating(40) == "Needs Improvement"
    assert performance_rating(39.9) == "Poor"


def test_answer_scoring_includes_professionalism_and_feedback():
    result = analyze_answer(
        "Explain how you would improve a slow API.",
        "First, I would measure latency and inspect database queries. For example, I would add indexes after checking the query plan. Finally, I would load test the change and compare the result.",
        domain="Backend Engineering",
        time_spent_seconds=75,
    )
    assert 0 <= result["professionalism_score"] <= 100
    assert result["overall_score"] == calculate_overall_score(result)
    assert result["scoring_method"] == "heuristic"
    assert result["question_feedback"]


def _question(**overrides):
    values = {
        "answer_text": "I implemented a cache because profiling showed repeated database reads.",
        "overall_score": 75.0,
        "communication_score": 76.0,
        "confidence_score": 72.0,
        "technical_score": 82.0,
        "professionalism_score": 78.0,
        "grammar_score": 85.0,
        "pronunciation_score": None,
        "filler_word_count": None,
        "speaking_pace_wpm": None,
        "speech_duration_seconds": None,
        "scoring_method": "heuristic",
        "question_feedback": "Give one measurable result.",
        "question_text": "How did you improve performance?",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_missing_camera_and_speech_data_are_reported_not_fabricated():
    interview = SimpleNamespace(
        questions=[_question()],
        session=None,
        domain="Python",
        interview_type="technical",
    )
    result = build_interview_assessment(interview)
    assert result["sub_scores"]["speech_clarity"] is None
    assert result["sub_scores"]["eye_contact_consistency"] is None
    assert set(result["missing_data"]) == {"speech_metrics", "camera_behavior_metrics"}


def test_fullscreen_penalty_is_limited_to_fifteen_points():
    session = SimpleNamespace(
        avg_visual_confidence=None,
        eye_contact_percentage=None,
        attention_percentage=None,
        avg_engagement=None,
        fullscreen_violations=99,
        emotion_sample_count=0,
    )
    interview = SimpleNamespace(
        questions=[_question(professionalism_score=80.0)],
        session=session,
        domain="General",
        interview_type="hr",
    )
    result = build_interview_assessment(interview)
    assert result["professionalism_score"] == 65.0
    assert result["sub_scores"]["professionalism_violation_penalty"] == 15.0
