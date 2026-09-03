import os
import sys
import types
import unittest
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


def question(**overrides):
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


class Module7ScoringTests(unittest.TestCase):
    def test_exact_weights(self):
        scores = {"communication_score": 80, "confidence_score": 70, "technical_score": 90, "professionalism_score": 60}
        self.assertEqual(calculate_overall_score(scores), 77.5)

    def test_clamping_and_rating_boundaries(self):
        scores = {"communication_score": 120, "confidence_score": -20, "technical_score": 100, "professionalism_score": 100}
        self.assertEqual(calculate_overall_score(scores), 75.0)
        self.assertEqual(performance_rating(90), "Excellent")
        self.assertEqual(performance_rating(75), "Good")
        self.assertEqual(performance_rating(60), "Average")
        self.assertEqual(performance_rating(40), "Needs Improvement")
        self.assertEqual(performance_rating(39.9), "Poor")

    def test_answer_has_professionalism_and_feedback(self):
        result = analyze_answer(
            "Explain how you would improve a slow API.",
            "First, I would measure latency and inspect database queries. For example, I would add indexes after checking the query plan. Finally, I would load test the change.",
            domain="Backend Engineering",
            time_spent_seconds=75,
        )
        self.assertTrue(0 <= result["professionalism_score"] <= 100)
        self.assertEqual(result["overall_score"], calculate_overall_score(result))
        self.assertTrue(result["question_feedback"])

    def test_missing_optional_data_is_not_fabricated(self):
        interview = SimpleNamespace(questions=[question()], session=None, domain="Python", interview_type="technical")
        result = build_interview_assessment(interview)
        self.assertIsNone(result["sub_scores"]["speech_clarity"])
        self.assertIsNone(result["sub_scores"]["eye_contact_consistency"])
        self.assertEqual(set(result["missing_data"]), {"speech_metrics", "camera_behavior_metrics"})

    def test_violation_penalty_is_capped(self):
        session = SimpleNamespace(
            avg_visual_confidence=None, eye_contact_percentage=None,
            attention_percentage=None, avg_engagement=None,
            fullscreen_violations=99, emotion_sample_count=0,
        )
        interview = SimpleNamespace(questions=[question(professionalism_score=80.0)], session=session, domain="General", interview_type="hr")
        result = build_interview_assessment(interview)
        self.assertEqual(result["professionalism_score"], 65.0)
        self.assertEqual(result["sub_scores"]["professionalism_violation_penalty"], 15.0)


if __name__ == "__main__":
    unittest.main()
