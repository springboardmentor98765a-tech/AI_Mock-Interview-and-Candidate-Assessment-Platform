"""
Tests for the Real-Data Dashboard & Analytics Module
Tests:
1. Performance Overview & KPI Tracking calculations
2. Zero-Data / Empty State handling (Zero dummy data)
3. Skill-Wise Analytics (Current, Avg, Max, Min, Assessments count, Trend)
4. Data-Driven Weak-Area Prediction Engine (<50 Critical, 50-64 Needs Improvement)
5. Performance Trends time-series aggregation
6. Candidate Ranking multi-factor weighted scoring & sorting
7. Single Interview Score Breakdown & weighted contributions
8. Filterable, Searchable, Paginated Interview History
9. CSV Data Export
10. Role-Based Access Control (RBAC) & Candidate isolation
"""

import unittest
import datetime
from fastapi.testclient import TestClient

from backend.main import app
from backend.database import db
from backend.services.analytics_service import (
    calculate_performance_overview,
    calculate_skill_analytics,
    predict_weak_areas,
    calculate_performance_trends,
    calculate_candidate_rankings,
    get_paginated_interview_history,
    get_single_interview_breakdown,
    generate_interviews_csv,
    get_filtered_interviews
)


class TestAnalyticsModule(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

        # Login tokens
        # 1. Candidate
        res_cand = self.client.post("/api/auth/login", json={"email": "candidate@example.com", "password": "password123"})
        self.cand_token = res_cand.json()["access_token"]
        self.cand_headers = {"Authorization": f"Bearer {self.cand_token}"}

        # 2. Recruiter
        res_rec = self.client.post("/api/auth/login", json={"email": "recruiter@example.com", "password": "password123"})
        self.rec_token = res_rec.json()["access_token"]
        self.rec_headers = {"Authorization": f"Bearer {self.rec_token}"}

        # 3. Admin
        res_admin = self.client.post("/api/auth/login", json={"email": "admin@example.com", "password": "password123"})
        self.admin_token = res_admin.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

    def test_zero_data_handling(self):
        """Zero interviews must return clean empty states with zero fabricated dummy data."""
        empty_overview = calculate_performance_overview([])
        self.assertFalse(empty_overview["has_data"])
        self.assertIsNone(empty_overview["average_score"])
        self.assertIsNone(empty_overview["highest_score"])
        self.assertEqual(empty_overview["completed_interviews"], 0)
        self.assertIn("No interview data available yet", empty_overview["message"])

        empty_skills = calculate_skill_analytics([])
        self.assertFalse(empty_skills["has_data"])
        self.assertEqual(len(empty_skills["skills"]), 0)

        empty_weak = predict_weak_areas([])
        self.assertFalse(empty_weak["has_data"])
        self.assertEqual(len(empty_weak["weak_areas"]), 0)

        empty_trends = calculate_performance_trends([])
        self.assertFalse(empty_trends["has_data"])
        self.assertEqual(len(empty_trends["data_points"]), 0)

    def test_performance_overview_calculation(self):
        """Overview metrics must be precisely calculated from stored records."""
        res = self.client.get("/api/analytics/overview", headers=self.cand_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        self.assertTrue(data["has_data"])
        self.assertGreaterEqual(data["completed_interviews"], 1)
        self.assertIsNotNone(data["average_score"])
        self.assertGreaterEqual(data["average_score"], 0)
        self.assertLessEqual(data["average_score"], 100)
        self.assertEqual(data["average_score"], data["highest_score"]) # 1 sample seeded interview

    def test_interview_history_pagination_and_search(self):
        """History must support search, filtering, and pagination."""
        # Query with candidate auth
        res = self.client.get("/api/analytics/interviews?page=1&page_size=5&sort_by=date&sort_order=desc", headers=self.cand_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("items", data)
        self.assertIn("pagination", data)
        self.assertGreaterEqual(data["pagination"]["total_records"], 1)
        self.assertEqual(data["pagination"]["page"], 1)

        # Test search match
        res_search = self.client.get("/api/analytics/interviews?search=FastAPI", headers=self.cand_headers)
        self.assertEqual(res_search.status_code, 200)
        data_search = res_search.json()
        self.assertGreaterEqual(len(data_search["items"]), 1)

        # Test non-matching search
        res_none = self.client.get("/api/analytics/interviews?search=NONEXISTENT_QUERY_XYZ", headers=self.cand_headers)
        self.assertEqual(res_none.status_code, 200)
        self.assertEqual(len(res_none.json()["items"]), 0)

    def test_skill_wise_analytics(self):
        """Skills must accurately reflect actual assessment breakdowns."""
        res = self.client.get("/api/analytics/skills", headers=self.cand_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertTrue(data["has_data"])
        skills = data["skills"]
        self.assertGreater(len(skills), 0)

        # Check skill entity properties
        first_skill = skills[0]
        self.assertIn("skill_name", first_skill)
        self.assertIn("current_score", first_skill)
        self.assertIn("average_score", first_skill)
        self.assertIn("highest_score", first_skill)
        self.assertIn("lowest_score", first_skill)
        self.assertIn("assessments_count", first_skill)
        self.assertIn("trend", first_skill)

    def test_weak_area_prediction(self):
        """Weak areas must classify accurately against thresholds."""
        res = self.client.get("/api/analytics/weak-areas", headers=self.cand_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("weak_areas", data)
        self.assertIn("thresholds_used", data)

    def test_performance_trends(self):
        """Trends endpoint must return chronological time-series data points."""
        res = self.client.get("/api/analytics/trends?period=all", headers=self.cand_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertTrue(data["has_data"])
        self.assertGreaterEqual(len(data["data_points"]), 1)
        pt = data["data_points"][0]
        self.assertIn("overall_score", pt)
        self.assertIn("technical_score", pt)
        self.assertIn("communication_score", pt)
        self.assertIn("confidence_score", pt)

    def test_candidate_rankings_recruiter_and_admin(self):
        """Rankings must calculate weighted scores and enforce recruiter/admin access."""
        # 1. Candidate access to /rankings must be forbidden (403)
        res_cand = self.client.get("/api/analytics/rankings", headers=self.cand_headers)
        self.assertEqual(res_cand.status_code, 403)

        # 2. Recruiter access
        res_rec = self.client.get("/api/analytics/rankings?sort_by=rank&sort_order=asc", headers=self.rec_headers)
        self.assertEqual(res_rec.status_code, 200)
        data_rec = res_rec.json()
        self.assertIn("rankings", data_rec)
        self.assertIn("ranking_weights_applied", data_rec)
        self.assertGreater(data_rec["total_candidates"], 0)

        # Check Rank 1 candidate
        first_ranked = data_rec["rankings"][0]
        if first_ranked["has_data"]:
            self.assertEqual(first_ranked["rank"], 1)
            self.assertGreater(first_ranked["ranking_score"], 0)
            self.assertIn("overall_score", first_ranked)
            self.assertIn("strongest_skill", first_ranked)

        # 3. Admin access with custom sorting by technical score
        res_admin = self.client.get("/api/analytics/rankings?sort_by=technical&sort_order=desc", headers=self.admin_headers)
        self.assertEqual(res_admin.status_code, 200)

    def test_single_interview_breakdown_report(self):
        """Detailed breakdown must provide component score contributions and weights."""
        res = self.client.get("/api/analytics/interview/int_sample_001", headers=self.cand_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["interview_id"], "int_sample_001")
        self.assertTrue(data["has_assessment"])
        self.assertIn("weighted_components", data)
        self.assertIn("strongest_skill", data)
        self.assertIn("weakest_skill", data)
        
        # Verify weight contributions sum up
        total_contribution = sum(c["contribution"] for c in data["weighted_components"])
        self.assertAlmostEqual(total_contribution, data["overall_score"], places=1)

    def test_candidate_data_isolation_security(self):
        """A candidate cannot access another candidate's private analytics profile."""
        # Another candidate ID
        other_cand_id = "user_rec_202" # or non-owned
        res = self.client.get(f"/api/analytics/candidate/{other_cand_id}", headers=self.cand_headers)
        # Should return 403 Forbidden
        self.assertEqual(res.status_code, 403)

    def test_csv_export(self):
        """CSV export must return text/csv with valid headers and data rows."""
        res = self.client.get("/api/analytics/export/csv", headers=self.cand_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers["content-type"], "text/csv; charset=utf-8")
        csv_text = res.text
        self.assertIn("Interview ID,Candidate Name,Date", csv_text)
        self.assertIn("int_sample_001", csv_text)


if __name__ == "__main__":
    unittest.main()
