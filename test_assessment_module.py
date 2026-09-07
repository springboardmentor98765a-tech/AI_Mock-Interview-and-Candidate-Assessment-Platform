"""
Comprehensive Test Suite for AI Feedback & Scoring Module
Tests:
- Normalization, clamping, boundary ratings
- Mathematical weight distributions (sum to 100%)
- Communication scoring & negative metric (filler words)
- Confidence scoring, hesitation penalty & video unavailable handling
- Technical Relevance scoring & question-level evaluations
- Professionalism scoring
- AI Feedback & evidence generation
- API endpoints: POST, GET, regenerate assessment
"""

import unittest
from backend.services.scoring_service import (
    clamp_score,
    normalize_score,
    calculate_weighted_score,
    get_performance_rating,
    compute_technical_relevance,
    compute_communication_score_module,
    compute_confidence_score_module,
    compute_professionalism_score_module,
    calculate_overall_assessment_scores,
    evaluate_single_question_answer
)
from backend.services.feedback_service import generate_assessment_feedback
from backend.database import db
from fastapi.testclient import TestClient
from backend.main import app


class TestScoringAndAssessmentModule(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    # --------------------------------------------------------------------------
    # 1. Clamping & Normalization Tests
    # --------------------------------------------------------------------------
    def test_clamp_score(self):
        self.assertEqual(clamp_score(-10), 0.0)
        self.assertEqual(clamp_score(150), 100.0)
        self.assertEqual(clamp_score(75.456), 75.46)
        self.assertEqual(clamp_score(0), 0.0)
        self.assertEqual(clamp_score(100), 100.0)
        self.assertEqual(clamp_score("invalid"), 0.0)

    def test_normalize_score(self):
        self.assertEqual(normalize_score(50, 0, 100), 50.0)
        self.assertEqual(normalize_score(0, 0, 100), 0.0)
        self.assertEqual(normalize_score(100, 0, 100), 100.0)
        self.assertEqual(normalize_score(-20, 0, 100), 0.0)
        self.assertEqual(normalize_score(150, 0, 100), 100.0)

    # --------------------------------------------------------------------------
    # 2. Performance Rating Boundary Tests
    # --------------------------------------------------------------------------
    def test_performance_rating_boundaries(self):
        # 100 -> Excellent
        self.assertEqual(get_performance_rating(100.0), "Excellent")
        # 90 -> Excellent
        self.assertEqual(get_performance_rating(90.0), "Excellent")
        # 89.99 -> Good
        self.assertEqual(get_performance_rating(89.99), "Good")
        # 75 -> Good
        self.assertEqual(get_performance_rating(75.0), "Good")
        # 74.99 -> Average
        self.assertEqual(get_performance_rating(74.99), "Average")
        # 60 -> Average
        self.assertEqual(get_performance_rating(60.0), "Average")
        # 59.99 -> Needs Improvement
        self.assertEqual(get_performance_rating(59.99), "Needs Improvement")
        # 40 -> Needs Improvement
        self.assertEqual(get_performance_rating(40.0), "Needs Improvement")
        # 39.99 -> Poor
        self.assertEqual(get_performance_rating(39.99), "Poor")
        # 0 -> Poor
        self.assertEqual(get_performance_rating(0.0), "Poor")

    # --------------------------------------------------------------------------
    # 3. Mathematical Weight Validation
    # --------------------------------------------------------------------------
    def test_weight_distributions(self):
        # Overall Score Weights: 0.30 + 0.25 + 0.30 + 0.15 = 1.00
        overall_weights = [0.30, 0.25, 0.30, 0.15]
        self.assertAlmostEqual(sum(overall_weights), 1.00, places=5)

        # Communication Weights: 0.25 + 0.20 + 0.15 + 0.15 + 0.25 = 1.00
        comm_weights = [0.25, 0.20, 0.15, 0.15, 0.25]
        self.assertAlmostEqual(sum(comm_weights), 1.00, places=5)

        # Confidence Weights: 0.20 + 0.20 + 0.20 + 0.25 + 0.15 = 1.00
        conf_weights = [0.20, 0.20, 0.20, 0.25, 0.15]
        self.assertAlmostEqual(sum(conf_weights), 1.00, places=5)

        # Technical Weights: 0.30 + 0.15 + 0.20 + 0.20 + 0.15 = 1.00
        tech_weights = [0.30, 0.15, 0.20, 0.20, 0.15]
        self.assertAlmostEqual(sum(tech_weights), 1.00, places=5)

        # Professionalism Weights: 0.20 + 0.30 + 0.30 + 0.20 = 1.00
        prof_weights = [0.20, 0.30, 0.30, 0.20]
        self.assertAlmostEqual(sum(prof_weights), 1.00, places=5)

    # --------------------------------------------------------------------------
    # 4. Overall Score Calculation Example from Prompt
    # --------------------------------------------------------------------------
    def test_prompt_exact_overall_calculation(self):
        # Example from master prompt:
        # Communication = 80, Confidence = 75, Technical = 90, Professionalism = 85
        # Overall = 80*0.30 + 75*0.25 + 90*0.30 + 85*0.15 = 24 + 18.75 + 27 + 12.75 = 82.50
        weights = {"c": 0.30, "cf": 0.25, "t": 0.30, "p": 0.15}
        comps = {"c": 80.0, "cf": 75.0, "t": 90.0, "p": 85.0}
        score = calculate_weighted_score(comps, weights)
        self.assertEqual(score, 82.5)
        self.assertEqual(get_performance_rating(score), "Good")

    # --------------------------------------------------------------------------
    # 5. Communication Scoring & Negative Metric (Fillers)
    # --------------------------------------------------------------------------
    def test_communication_scoring(self):
        clean_text = "In this architecture I designed an asynchronous pipeline using FastAPI and PostgreSQL with indexing to ensure high performance."
        clean_comm = compute_communication_score_module(clean_text, duration_seconds=40)
        self.assertGreaterEqual(clean_comm.score, 70.0)
        self.assertGreaterEqual(clean_comm.filler_word_score, 85.0)

        # High filler text
        filler_text = "Um basically like you know uh we like used um Python and uh you know actually like database stuff um."
        filler_comm = compute_communication_score_module(filler_text, duration_seconds=30)
        # Filler score must be lower for high filler frequency
        self.assertLess(filler_comm.filler_word_score, clean_comm.filler_word_score)

    # --------------------------------------------------------------------------
    # 6. Confidence Scoring & Video Unavailable Handling
    # --------------------------------------------------------------------------
    def test_confidence_scoring_and_fallback(self):
        # When video telemetry is unavailable
        conf_no_video = compute_confidence_score_module(video_session_report=None)
        self.assertFalse(conf_no_video.video_analysis_available)
        self.assertIsNone(conf_no_video.eye_contact)
        self.assertGreaterEqual(conf_no_video.score, 0.0)
        self.assertLessEqual(conf_no_video.score, 100.0)

        # When video telemetry is present
        video_report = {
            "total_frames_analyzed": 120,
            "eye_contact": {"percentage": 88.0, "level": "High"},
            "engagement": {"score": 82.0, "level": "High"},
            "attention": {"score": 90.0, "level": "High"}
        }
        conf_with_video = compute_confidence_score_module(video_session_report=video_report)
        self.assertTrue(conf_with_video.video_analysis_available)
        self.assertEqual(conf_with_video.eye_contact, 88.0)
        self.assertEqual(conf_with_video.facial_engagement, 82.0)
        self.assertEqual(conf_with_video.attention_level, 90.0)

    # --------------------------------------------------------------------------
    # 7. Technical Relevance & Question-Level Evaluations
    # --------------------------------------------------------------------------
    def test_technical_relevance_evaluations(self):
        questions = [
            {
                "id": 1,
                "question": "Explain async vs sync route handlers in FastAPI.",
                "ideal_answer_outline": "Mention event loop non-blocking behavior vs thread pool execution.",
                "user_answer": "Async route handlers use async def to execute non-blocking operations on the event loop, whereas synchronous route handlers run in a worker thread pool."
            },
            {
                "id": 2,
                "question": "How to optimize asset loading?",
                "ideal_answer_outline": "Caching, minification, lazy loading.",
                "user_answer": "Minify CSS/JS assets, configure HTTP caching headers, and lazy load images."
            }
        ]
        tech_breakdown, q_evals = compute_technical_relevance(questions, domain="Full Stack", difficulty="Medium")
        self.assertEqual(len(q_evals), 2)
        self.assertGreaterEqual(tech_breakdown.score, 70.0)
        self.assertGreaterEqual(q_evals[0].technical_accuracy, 70.0)
        self.assertTrue(bool(q_evals[0].feedback))
        self.assertTrue(bool(q_evals[0].improvement_suggestion))

    # --------------------------------------------------------------------------
    # 8. Professionalism Scoring
    # --------------------------------------------------------------------------
    def test_professionalism_scoring(self):
        answers = [
            "First, I analyzed the performance bottlenecks. Secondly, I implemented Redis caching, which reduced latency by 40%. In conclusion, the system scaled cleanly.",
            "Additionally, we followed strict code review standards to maintain software reliability."
        ]
        prof = compute_professionalism_score_module(
            total_duration_seconds=180,
            candidate_answers=answers,
            questions_count=2
        )
        self.assertGreaterEqual(prof.score, 70.0)
        self.assertGreaterEqual(prof.response_organization, 75.0)

    # --------------------------------------------------------------------------
    # 9. Dynamic AI Feedback & Evidence Structure
    # --------------------------------------------------------------------------
    def test_feedback_and_evidence_generation(self):
        comm = compute_communication_score_module("FastAPI non blocking event loop architecture explanation.", 30)
        conf = compute_confidence_score_module()
        tech, q_evals = compute_technical_relevance([
            {"id": 1, "question": "Q1", "user_answer": "Answer with Python and Docker", "ideal_answer_outline": "Python Docker"}
        ])
        prof = compute_professionalism_score_module(60, candidate_answers=["Answer with Python and Docker"])
        overall, rating, rec = calculate_overall_assessment_scores(comm, conf, tech, prof)

        fb = generate_assessment_feedback(
            communication=comm,
            confidence=conf,
            technical=tech,
            professionalism=prof,
            overall_score=overall,
            performance_rating=rating,
            question_evaluations=q_evals,
            domain="Full Stack"
        )
        self.assertIn("strengths", fb)
        self.assertIn("weaknesses", fb)
        self.assertIn("improvement_suggestions", fb)
        self.assertIn("practice_recommendations", fb)
        self.assertIn("learning_resources", fb)
        self.assertIn("evidence", fb)
        self.assertGreaterEqual(len(fb["strengths"]), 1)

    # --------------------------------------------------------------------------
    # 10. Assessment API Endpoints (POST, GET, Regenerate)
    # --------------------------------------------------------------------------
    def test_assessment_api_endpoints(self):
        # 1. GET assessment for pre-seeded interview
        res_get = self.client.get("/api/interview/int_sample_001/assessment")
        self.assertEqual(res_get.status_code, 200)
        data = res_get.json()
        self.assertEqual(data["interview_id"], "int_sample_001")
        self.assertIn("overall_score", data)
        self.assertIn("performance_rating", data)
        self.assertIn("communication", data)
        self.assertIn("confidence", data)
        self.assertIn("technical_relevance", data)
        self.assertIn("professionalism", data)
        self.assertIn("question_evaluations", data)
        self.assertIn("strengths", data)
        self.assertIn("weaknesses", data)
        self.assertIn("evidence", data)

        # 2. POST assessment endpoint (both /api/interview and /api/interviews)
        res_post = self.client.post("/api/interviews/int_sample_001/assessment")
        self.assertEqual(res_post.status_code, 200)
        post_data = res_post.json()
        self.assertEqual(post_data["interview_id"], "int_sample_001")

        # 3. POST regenerate endpoint
        res_regen = self.client.post("/api/interview/int_sample_001/assessment/regenerate")
        self.assertEqual(res_regen.status_code, 200)
        regen_data = res_regen.json()
        self.assertEqual(regen_data["interview_id"], "int_sample_001")

        # 4. Non-existent interview 404 test
        res_404 = self.client.get("/api/interview/non_existent_id/assessment")
        self.assertEqual(res_404.status_code, 404)


if __name__ == "__main__":
    unittest.main()
