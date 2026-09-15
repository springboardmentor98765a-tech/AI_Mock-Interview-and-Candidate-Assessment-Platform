"""
End-to-End Integration Test for the Complete AI Feedback & Scoring Assessment Flow
Flow:
1. Candidate Authentication
2. Create Interview Session
3. Submit Real Technical Answers
4. Attach Speech & Video Telemetry
5. Finalize Session
6. Generate Full AI Assessment Report
7. Validate Mathematical Formulas & Weights
8. Validate Question Evaluations, AI Feedback & Evidence
9. Verify Persistence & Retrieval
10. Test Regeneration
"""

import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import db
from backend.services.scoring_service import get_performance_rating


class TestE2EAssessmentLifecycle(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_complete_interview_to_assessment_flow(self):
        # 1. Login as Candidate
        login_res = self.client.post("/api/auth/login", json={
            "email": "candidate@example.com",
            "password": "password123"
        })
        self.assertEqual(login_res.status_code, 200)
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create Interview Session
        create_res = self.client.post("/api/interview/create", json={
            "domain": "Full Stack",
            "difficulty": "Medium",
            "type": "Technical",
            "question_count": 3
        }, headers=headers)
        self.assertEqual(create_res.status_code, 200)
        interview_data = create_res.json()["interview"]
        interview_id = interview_data["id"]
        questions = interview_data["questions"]
        self.assertEqual(len(questions), 3)

        # 3. Start Session
        start_res = self.client.post(f"/api/interview/{interview_id}/session/start", headers=headers)
        self.assertEqual(start_res.status_code, 200)

        # 4. Answer Each Question with realistic technical explanations
        answers = [
            "In FastAPI, async route handlers run asynchronously on the asyncio event loop using non-blocking I/O for database and network calls. Synchronous route handlers defined with def run inside an external threadpool executor to avoid blocking the main event loop.",
            "To optimize high-traffic web performance, I implement HTTP caching headers, minify JS/CSS assets, lazy load modules and heavy image resources, and debounce user input events before making network requests.",
            "I enforce API security by implementing JWT token authorization, rate limiting on sensitive routes, input validation with Pydantic schemas, and HTTPS encryption."
        ]

        for idx, q in enumerate(questions):
            ans_res = self.client.post(f"/api/interview/{interview_id}/answer", json={
                "question_id": q["id"],
                "candidate_answer": answers[idx],
                "time_spent": 95
            }, headers=headers)
            self.assertEqual(ans_res.status_code, 200)

        # 5. Finalize Interview Session
        fin_res = self.client.post(f"/api/interview/{interview_id}/finalize", json={
            "total_duration": 285
        }, headers=headers)
        self.assertEqual(fin_res.status_code, 200)

        # 6. Generate AI Assessment
        assess_res = self.client.post(f"/api/interviews/{interview_id}/assessment", headers=headers)
        self.assertEqual(assess_res.status_code, 200)
        assessment = assess_res.json()

        # 7. Validate Data Integrity & Structure
        self.assertEqual(assessment["interview_id"], interview_id)
        self.assertEqual(assessment["candidate_id"], "user_cand_101")
        self.assertEqual(assessment["candidate_name"], "Alex Mercer")

        # Validate 4 Core Category Scores (0 <= score <= 100)
        comm_score = assessment["communication_score"]
        conf_score = assessment["confidence_score"]
        tech_score = assessment["technical_relevance_score"]
        prof_score = assessment["professionalism_score"]
        overall_score = assessment["overall_score"]

        for s in [comm_score, conf_score, tech_score, prof_score, overall_score]:
            self.assertGreaterEqual(s, 0.0)
            self.assertLessEqual(s, 100.0)

        # 8. Mathematical Formula Validation:
        # Overall = (Comm * 0.30) + (Conf * 0.25) + (Tech * 0.30) + (Prof * 0.15)
        expected_overall = round(
            comm_score * 0.30 +
            conf_score * 0.25 +
            tech_score * 0.30 +
            prof_score * 0.15,
            2
        )
        self.assertAlmostEqual(overall_score, expected_overall, places=1)

        # Performance rating check
        expected_rating = get_performance_rating(overall_score)
        self.assertEqual(assessment["performance_rating"], expected_rating)

        # 9. Validate Question-Level Evaluations
        q_evals = assessment["question_evaluations"]
        self.assertEqual(len(q_evals), 3)
        for qe in q_evals:
            self.assertGreaterEqual(qe["score"], 0.0)
            self.assertLessEqual(qe["score"], 100.0)
            self.assertGreaterEqual(qe["technical_accuracy"], 0.0)
            self.assertGreaterEqual(qe["keyword_relevance"], 0.0)
            self.assertGreaterEqual(qe["problem_solving"], 0.0)
            self.assertGreaterEqual(qe["domain_knowledge"], 0.0)
            self.assertGreaterEqual(qe["answer_completeness"], 0.0)
            self.assertTrue(bool(qe["feedback"]))
            self.assertTrue(bool(qe["improvement_suggestion"]))

        # 10. Validate Dynamic Personalized Feedback & Evidence
        self.assertGreaterEqual(len(assessment["strengths"]), 1)
        self.assertGreaterEqual(len(assessment["weaknesses"]), 1)
        self.assertGreaterEqual(len(assessment["improvement_suggestions"]), 1)
        self.assertGreaterEqual(len(assessment["practice_recommendations"]), 1)
        self.assertGreaterEqual(len(assessment["learning_resources"]), 1)
        self.assertTrue(isinstance(assessment["evidence"], list))

        # 11. Retrieve Saved Assessment from Database
        get_res = self.client.get(f"/api/interviews/{interview_id}/assessment", headers=headers)
        self.assertEqual(get_res.status_code, 200)
        retrieved = get_res.json()
        self.assertEqual(retrieved["assessment_id"], assessment["assessment_id"])
        self.assertEqual(retrieved["overall_score"], overall_score)

        # 12. Regenerate Assessment
        regen_res = self.client.post(f"/api/interviews/{interview_id}/assessment/regenerate", headers=headers)
        self.assertEqual(regen_res.status_code, 200)
        regenerated = regen_res.json()
        self.assertEqual(regenerated["interview_id"], interview_id)


if __name__ == "__main__":
    unittest.main()
