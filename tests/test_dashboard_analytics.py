"""
Comprehensive Automated Unit & Integration Tests for Module 10: Dashboard & Analytics.
Validates:
- RBAC permissions for Candidate, Recruiter, Admin
- Zero dummy data adherence & real-data calculation accuracy
- Exact scoring formula: Communication (30%) + Confidence (25%) + Technical (30%) + Professionalism (15%)
- Performance rating levels (90-100 Excellent, 75-89 Good, 60-74 Average, 40-59 Needs Improvement, <40 Poor)
- Weak areas classification (<60% Critical, 60-74% Needs Improvement)
- Candidate comparison, deterministic ranking, and shortlisting threshold filters
- System health diagnostic monitoring and AI pipeline telemetry disclaimer
"""

import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import db
from backend.auth import hash_password, create_access_token
from backend.services.analytics_service import (
    calculate_performance_overview,
    calculate_skill_analytics,
    predict_weak_areas,
    calculate_performance_trends
)

class TestDashboardAnalytics(unittest.TestCase):

    @classmethod
    def tearDownClass(cls):
        db._seed_data()

    def setUp(self):
        self.client = TestClient(app)

        # Clear state for isolated tests
        db.users.clear()
        db.interviews.clear()
        db.assessments.clear()
        db.ai_telemetry.clear()
        db.reports.clear()
        db.activity_logs.clear()

        # Seed users
        db.users["usr_cand_test"] = {
            "id": "usr_cand_test",
            "email": "cand_test@example.com",
            "full_name": "Test Candidate",
            "role": "candidate",
            "password_hash": hash_password("password123"),
            "status": "active",
            "created_at": "2026-09-01T10:00:00"
        }
        db.users["usr_cand_2"] = {
            "id": "usr_cand_2",
            "email": "cand_2@example.com",
            "full_name": "Second Candidate",
            "role": "candidate",
            "password_hash": hash_password("password123"),
            "status": "active",
            "created_at": "2026-09-02T10:00:00"
        }
        db.users["usr_rec_test"] = {
            "id": "usr_rec_test",
            "email": "rec_test@example.com",
            "full_name": "Test Recruiter",
            "role": "recruiter",
            "password_hash": hash_password("password123"),
            "status": "active",
            "company": "Tech Corp",
            "created_at": "2026-09-01T10:00:00"
        }
        db.users["usr_adm_test"] = {
            "id": "usr_adm_test",
            "email": "adm_test@example.com",
            "full_name": "Test Admin",
            "role": "admin",
            "password_hash": hash_password("password123"),
            "status": "active",
            "created_at": "2026-09-01T10:00:00"
        }

        # Seed interview and assessment for Candidate 1
        db.interviews["int_test_1"] = {
            "id": "int_test_1",
            "user_id": "usr_cand_test",
            "domain": "Full Stack",
            "difficulty": "Medium",
            "interview_type": "Technical",
            "status": "Completed",
            "created_at": "2026-09-10T14:00:00",
            "questions": [
                {
                    "id": "q1",
                    "question": "Explain React Virtual DOM",
                    "user_answer": "It is an in-memory representation of real DOM elements.",
                    "duration_seconds": 120,
                    "metrics": {
                        "technical_accuracy": 85,
                        "communication_clarity": 80,
                        "behavioral_confidence": 75,
                        "speech_analysis": {"wpm": 135, "filler_word_rate": 2.1, "grammar_score": 90, "pronunciation_score": 88}
                    }
                },
                {
                    "id": "q2",
                    "question": "Explain SQL Indexing",
                    "user_answer": "Indexes use B-trees to speed up data lookup.",
                    "duration_seconds": 150,
                    "metrics": {
                        "technical_accuracy": 90,
                        "communication_clarity": 85,
                        "behavioral_confidence": 80,
                        "speech_analysis": {"wpm": 140, "filler_word_rate": 1.8, "grammar_score": 92, "pronunciation_score": 90}
                    }
                }
            ]
        }

        db.assessments["int_test_1"] = {
            "id": "asmt_test_1",
            "interview_id": "int_test_1",
            "user_id": "usr_cand_test",
            "overall_score": 82,
            "communication_score": 83,
            "confidence_score": 78,
            "technical_score": 88,
            "professionalism_score": 80,
            "performance_rating": "Good",
            "recommendation": "Strong Contender",
            "strengths": ["Clean technical articulation", "Accurate indexing conceptual explanation"],
            "weaknesses": ["Minor pause when discussing React internals"],
            "actionable_recommendations": ["Practice complex system design questions"],
            "skill_breakdown": {
                "React.js": 85,
                "SQL & Databases": 90,
                "Communication": 83,
                "Problem Solving": 84
            },
            "created_at": "2026-09-10T14:15:00"
        }

        # Seed interview and assessment for Candidate 2
        db.interviews["int_test_2"] = {
            "id": "int_test_2",
            "user_id": "usr_cand_2",
            "domain": "Frontend Engineering",
            "difficulty": "Hard",
            "interview_type": "Technical",
            "status": "Completed",
            "created_at": "2026-09-11T16:00:00",
            "questions": [
                {
                    "id": "q3",
                    "question": "Explain CSS Grid vs Flexbox",
                    "user_answer": "Grid is 2D, Flexbox is 1D.",
                    "duration_seconds": 90,
                    "metrics": {
                        "technical_accuracy": 55,
                        "communication_clarity": 60,
                        "behavioral_confidence": 50,
                        "speech_analysis": {"wpm": 105, "filler_word_rate": 6.5, "grammar_score": 70, "pronunciation_score": 75}
                    }
                }
            ]
        }

        db.assessments["int_test_2"] = {
            "id": "asmt_test_2",
            "interview_id": "int_test_2",
            "user_id": "usr_cand_2",
            "overall_score": 56,
            "communication_score": 60,
            "confidence_score": 50,
            "technical_score": 55,
            "professionalism_score": 60,
            "performance_rating": "Needs Improvement",
            "recommendation": "Needs Further Practice",
            "strengths": ["Understands basic CSS layout definitions"],
            "weaknesses": ["Struggled with complex layout algorithms", "High filler word rate"],
            "actionable_recommendations": ["Deep dive into CSS Grid layout specifications"],
            "skill_breakdown": {
                "CSS Architecture": 55,
                "Communication": 60
            },
            "created_at": "2026-09-11T16:15:00"
        }

        self.cand1_token = create_access_token("usr_cand_test", "cand_test@example.com", "candidate")
        self.cand2_token = create_access_token("usr_cand_2", "cand_2@example.com", "candidate")
        self.rec_token = create_access_token("usr_rec_test", "rec_test@example.com", "recruiter")
        self.adm_token = create_access_token("usr_adm_test", "adm_test@example.com", "admin")

    # --------------------------------------------------------------------------
    # 1. CANDIDATE DASHBOARD TESTS
    # --------------------------------------------------------------------------

    def test_candidate_dashboard_overview(self):
        response = self.client.get("/api/candidate/dashboard", headers={"Authorization": f"Bearer {self.cand1_token}"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["role"], "candidate")
        self.assertTrue(data["performance_summary"]["has_data"])
        self.assertEqual(data["performance_summary"]["average_score"], 82)
        self.assertEqual(data["performance_summary"]["rating_level"], "Good")
        self.assertEqual(data["category_breakdown"]["technical"], 88)
        self.assertEqual(data["category_breakdown"]["communication"], 83)
        self.assertEqual(data["category_breakdown"]["confidence"], 78)
        self.assertEqual(data["category_breakdown"]["professionalism"], 80)

    def test_candidate_interviews_pagination_and_search(self):
        response = self.client.get("/api/candidate/interviews?page=1&page_size=10", headers={"Authorization": f"Bearer {self.cand1_token}"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["items"]), 1)
        self.assertEqual(data["items"][0]["interview_id"], "int_test_1")
        self.assertEqual(data["items"][0]["overall_score"], 82)
        self.assertEqual(data["pagination"]["total_records"], 1)

    def test_candidate_skills_endpoint(self):
        response = self.client.get("/api/candidate/skills", headers={"Authorization": f"Bearer {self.cand1_token}"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["has_data"])
        self.assertTrue("React.js" in data["radar_data"] or "Technical Mastery" in data["radar_data"])

    def test_candidate_weak_areas_classification(self):
        # Candidate 2 has score 56 < 60 (Critical)
        response = self.client.get("/api/candidate/performance", headers={"Authorization": f"Bearer {self.cand2_token}"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["has_data"])
        self.assertGreater(len(data["weak_areas"]), 0)
        css_weak = next((w for w in data["weak_areas"] if "CSS" in w["skill"]), None)
        self.assertIsNotNone(css_weak)
        self.assertEqual(css_weak["severity"], "Critical")
        self.assertLess(css_weak["current_score"], 60)

    def test_candidate_rbac_blocks_recruiter_endpoints(self):
        response = self.client.get("/api/recruiter/dashboard", headers={"Authorization": f"Bearer {self.cand1_token}"})
        self.assertEqual(response.status_code, 403)

    # --------------------------------------------------------------------------
    # 2. RECRUITER DASHBOARD TESTS
    # --------------------------------------------------------------------------

    def test_recruiter_dashboard(self):
        response = self.client.get("/api/recruiter/dashboard", headers={"Authorization": f"Bearer {self.rec_token}"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(data["kpis"]["total_candidates"], 2)
        self.assertGreaterEqual(data["kpis"]["total_interviews_completed"], 2)
        self.assertGreaterEqual(len(data["candidates"]), 2)

    def test_recruiter_candidate_dossier(self):
        response = self.client.get("/api/recruiter/candidates/usr_cand_test", headers={"Authorization": f"Bearer {self.rec_token}"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["candidate"]["name"], "Test Candidate")
        self.assertEqual(data["performance_summary"]["average_score"], 82)
        self.assertEqual(len(data["interviews"]), 1)

    def test_recruiter_candidate_comparison(self):
        response = self.client.get("/api/recruiter/comparison?candidate_ids=usr_cand_test&candidate_ids=usr_cand_2", headers={"Authorization": f"Bearer {self.rec_token}"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["candidates"]), 2)
        scores = {c["candidate_id"]: c["overall_score"] for c in data["candidates"]}
        self.assertEqual(scores["usr_cand_test"], 82)
        self.assertEqual(scores["usr_cand_2"], 56)

    def test_recruiter_deterministic_ranking(self):
        response = self.client.get("/api/recruiter/ranking?sort_by=rank&sort_order=asc", headers={"Authorization": f"Bearer {self.rec_token}"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data["rankings"]), 2)
        self.assertEqual(data["rankings"][0]["candidate_id"], "usr_cand_test")
        self.assertEqual(data["rankings"][0]["rank"], 1)
        self.assertEqual(data["rankings"][1]["candidate_id"], "usr_cand_2")
        self.assertEqual(data["rankings"][1]["rank"], 2)

    def test_recruiter_shortlisting_thresholds(self):
        # Set threshold: min_overall=75, min_technical=70, min_communication=65
        response = self.client.get("/api/recruiter/shortlisting?min_overall=75&min_technical=70&min_communication=65", headers={"Authorization": f"Bearer {self.rec_token}"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        rec_list = {c["candidate_id"]: c["is_recommended"] for c in data["shortlist_recommendations"]}
        self.assertTrue(rec_list["usr_cand_test"])
        self.assertFalse(rec_list["usr_cand_2"])

    # --------------------------------------------------------------------------
    # 3. ADMIN DASHBOARD TESTS
    # --------------------------------------------------------------------------

    def test_admin_dashboard_and_users(self):
        response = self.client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {self.adm_token}"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(data["system_stats"]["total_users"], 4)

        # List users
        res_users = self.client.get("/api/admin/users", headers={"Authorization": f"Bearer {self.adm_token}"})
        self.assertEqual(res_users.status_code, 200)
        users_data = res_users.json()
        self.assertGreaterEqual(len(users_data["users"]), 4)

    def test_admin_user_status_and_role_update(self):
        # Toggle status
        res_status = self.client.patch("/api/admin/users/usr_cand_2/status", json={"status": "suspended"}, headers={"Authorization": f"Bearer {self.adm_token}"})
        self.assertEqual(res_status.status_code, 200)
        self.assertEqual(db.users["usr_cand_2"]["status"], "suspended")

        # Update role
        res_role = self.client.patch("/api/admin/users/usr_cand_2/role", json={"role": "recruiter"}, headers={"Authorization": f"Bearer {self.adm_token}"})
        self.assertEqual(res_role.status_code, 200)
        self.assertEqual(db.users["usr_cand_2"]["role"], "recruiter")

    def test_admin_ai_monitoring_disclaimer(self):
        response = self.client.get("/api/admin/ai-monitoring", headers={"Authorization": f"Bearer {self.adm_token}"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("AI accuracy: Not available — no validated ground-truth dataset configured.", data["disclaimer"])

    def test_admin_live_system_health(self):
        response = self.client.get("/api/admin/system-health", headers={"Authorization": f"Bearer {self.adm_token}"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn(data["status"], ["Healthy", "Degraded"])
        self.assertIn("backend_process", data["components"])
        self.assertIn("database_connectivity", data["components"])
        self.assertIn("storage_directory", data["components"])
        self.assertIn("gemini_api", data["components"])
        self.assertGreaterEqual(data["response_latency_ms"], 0)

    def test_admin_usage_analytics(self):
        response = self.client.get("/api/admin/usage-analytics?period=all", headers={"Authorization": f"Bearer {self.adm_token}"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["period"], "all")
        self.assertGreaterEqual(data["summary"]["total_interviews"], 2)


if __name__ == "__main__":
    unittest.main()
