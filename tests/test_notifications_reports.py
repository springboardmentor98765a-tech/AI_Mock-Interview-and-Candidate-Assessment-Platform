"""
Comprehensive Automated Test Suite for Notifications & Reports Module
Validates in-app notifications, interview reminders, email notifications,
ReportLab PDF generation, CSV exports, performance summaries, and RBAC data isolation.
"""

import unittest
import os
import datetime
from fastapi.testclient import TestClient

from backend.main import app
from backend.database import db
from backend.auth import create_access_token
from backend.services.report_service import generate_pdf_report, generate_interview_csv
from backend.services.performance_service import (
    compute_user_performance_summary,
    compute_user_performance_trends,
    compute_user_skills_breakdown
)


class TestNotificationsAndReportsModule(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        
        # Auth tokens for candidate Alex Mercer and recruiter Sarah Connor
        cls.candidate_token = create_access_token(
            user_id="user_cand_101",
            email="candidate@example.com",
            role="candidate"
        )
        cls.candidate_headers = {"Authorization": f"Bearer {cls.candidate_token}"}

        cls.recruiter_token = create_access_token(
            user_id="user_rec_202",
            email="recruiter@example.com",
            role="recruiter"
        )
        cls.recruiter_headers = {"Authorization": f"Bearer {cls.recruiter_token}"}

        # Second candidate for isolation testing
        cls.cand2_id = "user_cand_999"
        db.users[cls.cand2_id] = {
            "id": cls.cand2_id,
            "email": "cand2@example.com",
            "full_name": "Second Candidate",
            "role": "candidate",
            "status": "Active",
            "created_at": datetime.datetime.now().isoformat()
        }
        cls.cand2_token = create_access_token(
            user_id=cls.cand2_id,
            email="cand2@example.com",
            role="candidate"
        )
        cls.cand2_headers = {"Authorization": f"Bearer {cls.cand2_token}"}

    # ==========================================================================
    # 1. In-App Notifications Tests
    # ==========================================================================

    def test_01_list_notifications_and_unread_count(self):
        res = self.client.get("/api/notifications", headers=self.candidate_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("notifications", data)
        self.assertIn("unread_count", data)
        self.assertGreaterEqual(data["total_count"], 1)

        res_count = self.client.get("/api/notifications/unread-count", headers=self.candidate_headers)
        self.assertEqual(res_count.status_code, 200)
        self.assertEqual(res_count.json()["unread_count"], data["unread_count"])

    def test_02_mark_single_notification_read(self):
        res = self.client.get("/api/notifications?unread_only=true", headers=self.candidate_headers)
        self.assertEqual(res.status_code, 200)
        notifs = res.json()["notifications"]
        if notifs:
            target_id = notifs[0]["id"]
            patch_res = self.client.patch(f"/api/notifications/{target_id}/read", headers=self.candidate_headers)
            self.assertEqual(patch_res.status_code, 200)
            self.assertTrue(patch_res.json()["notification"]["is_read"])

    def test_03_mark_all_notifications_read(self):
        patch_res = self.client.patch("/api/notifications/read-all", headers=self.candidate_headers)
        self.assertEqual(patch_res.status_code, 200)
        
        # Verify unread count is 0
        res_count = self.client.get("/api/notifications/unread-count", headers=self.candidate_headers)
        self.assertEqual(res_count.json()["unread_count"], 0)

    def test_04_delete_notification(self):
        # Create a temp notification
        temp_notif_id = "notif_temp_delete_test"
        db.notifications[temp_notif_id] = {
            "id": temp_notif_id,
            "user_id": "user_cand_101",
            "title": "Temp Delete",
            "message": "Testing delete",
            "type": "alert",
            "is_read": False,
            "created_at": datetime.datetime.now().isoformat()
        }

        del_res = self.client.delete(f"/api/notifications/{temp_notif_id}", headers=self.candidate_headers)
        self.assertEqual(del_res.status_code, 200)
        self.assertNotIn(temp_notif_id, db.notifications)

    def test_05_notification_user_isolation(self):
        # Candidate 2 cannot access or delete Candidate 1's notification
        temp_notif_id = "notif_cand1_private"
        db.notifications[temp_notif_id] = {
            "id": temp_notif_id,
            "user_id": "user_cand_101",
            "title": "Private Candidate 1 Alert",
            "message": "Secret",
            "type": "alert",
            "is_read": False,
            "created_at": datetime.datetime.now().isoformat()
        }

        # Cand 2 attempts to mark as read
        patch_res = self.client.patch(f"/api/notifications/{temp_notif_id}/read", headers=self.cand2_headers)
        self.assertEqual(patch_res.status_code, 404)

        # Cand 2 attempts to delete
        del_res = self.client.delete(f"/api/notifications/{temp_notif_id}", headers=self.cand2_headers)
        self.assertEqual(del_res.status_code, 404)

    # ==========================================================================
    # 2. Upcoming Interview Scheduling & Reminders Tests
    # ==========================================================================

    def test_06_schedule_upcoming_interview(self):
        target_time = (datetime.datetime.now() + datetime.timedelta(days=2)).isoformat()
        payload = {
            "title": "Backend Microservices Mock Assessment",
            "domain": "Backend Engineering",
            "difficulty": "Hard",
            "type": "Technical",
            "scheduled_time": target_time,
            "duration_minutes": 60,
            "reminder_preferences": ["24h", "1h", "15m"]
        }

        res = self.client.post("/api/interviews/schedule", json=payload, headers=self.candidate_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("scheduled_interview", data)
        sched_id = data["scheduled_interview"]["id"]
        self.assertIn(sched_id, db.scheduled_interviews)
        self.assertEqual(len(data["reminders"]), 3)

    def test_07_list_upcoming_interviews(self):
        res = self.client.get("/api/interviews/upcoming", headers=self.candidate_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("upcoming_interviews", data)
        self.assertGreaterEqual(data["count"], 1)

    def test_08_reminder_duplicate_prevention(self):
        sched_id = "sched_sample_101"
        payload = {
            "interview_id": sched_id,
            "reminder_type": "24h"
        }
        # Attempt to create duplicate 24h reminder
        res = self.client.post("/api/reminders", json=payload, headers=self.candidate_headers)
        self.assertEqual(res.status_code, 200)
        # Should detect existing reminder and return empty list
        self.assertEqual(len(res.json()["reminders"]), 0)

    def test_09_process_due_reminders_trigger(self):
        # Create an artificial due reminder (scheduled in the past)
        past_time = (datetime.datetime.now() - datetime.timedelta(minutes=5)).isoformat()
        due_rem_id = "rem_due_test_101"
        db.reminders[due_rem_id] = {
            "id": due_rem_id,
            "user_id": "user_cand_101",
            "interview_id": "sched_sample_101",
            "reminder_type": "15m",
            "scheduled_time": past_time,
            "target_interview_time": datetime.datetime.now().isoformat(),
            "status": "pending",
            "sent_at": None,
            "created_at": datetime.datetime.now().isoformat()
        }

        res = self.client.post("/api/reminders/process-due", headers=self.candidate_headers)
        self.assertEqual(res.status_code, 200)
        # Verify reminder status changed to sent
        self.assertEqual(db.reminders[due_rem_id]["status"], "sent")
        self.assertIsNotNone(db.reminders[due_rem_id]["sent_at"])

    def test_10_cancel_scheduled_interview(self):
        temp_sched_id = "sched_temp_cancel"
        db.scheduled_interviews[temp_sched_id] = {
            "id": temp_sched_id,
            "user_id": "user_cand_101",
            "candidate_name": "Alex Mercer",
            "title": "Temp Session",
            "domain": "Full Stack",
            "scheduled_time": datetime.datetime.now().isoformat(),
            "status": "Scheduled",
            "created_at": datetime.datetime.now().isoformat()
        }
        db.reminders["rem_temp_cancel"] = {
            "id": "rem_temp_cancel",
            "user_id": "user_cand_101",
            "interview_id": temp_sched_id,
            "reminder_type": "1h",
            "scheduled_time": datetime.datetime.now().isoformat(),
            "status": "pending",
            "created_at": datetime.datetime.now().isoformat()
        }

        del_res = self.client.delete(f"/api/interviews/scheduled/{temp_sched_id}", headers=self.candidate_headers)
        self.assertEqual(del_res.status_code, 200)
        self.assertEqual(db.scheduled_interviews[temp_sched_id]["status"], "Cancelled")
        self.assertEqual(db.reminders["rem_temp_cancel"]["status"], "cancelled")

    # ==========================================================================
    # 3. Email Notifications & Logging Tests
    # ==========================================================================

    def test_11_manual_email_dispatch_and_logging(self):
        payload = {
            "notification_type": "interview_reminder",
            "recipient_email": "candidate@example.com",
            "details": {
                "title": "Full Stack Senior Engineer Mock",
                "reminder_label": "15 minutes",
                "scheduled_time": "Today at 3:00 PM"
            }
        }
        res = self.client.post("/api/emails/send", json=payload, headers=self.candidate_headers)
        self.assertEqual(res.status_code, 200)
        log = res.json()["email_log"]
        self.assertEqual(log["status"], "sent")
        self.assertEqual(log["recipient_email"], "candidate@example.com")
        self.assertIn("Reminder", log["subject"])

        # Fetch email logs from API
        logs_res = self.client.get("/api/email-notifications", headers=self.candidate_headers)
        self.assertEqual(logs_res.status_code, 200)
        self.assertGreaterEqual(logs_res.json()["count"], 1)

    # ==========================================================================
    # 4. Downloadable PDF & CSV Reports Tests
    # ==========================================================================

    def test_12_generate_pdf_report(self):
        # Generate report for sample interview int_sample_001
        payload = {"interview_id": "int_sample_001"}
        res = self.client.post("/api/reports/generate", json=payload, headers=self.candidate_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("report", data)
        rep = data["report"]
        self.assertGreaterEqual(rep["overall_score"], 50)
        self.assertTrue(os.path.exists(rep["file_path"]))

        # Download the PDF file and inspect header
        dl_res = self.client.get(f"/api/reports/{rep['id']}/download", headers=self.candidate_headers)
        self.assertEqual(dl_res.status_code, 200)
        self.assertEqual(dl_res.headers.get("content-type"), "application/pdf")
        # PDF magic bytes
        self.assertTrue(dl_res.content.startswith(b"%PDF"))

    def test_13_download_report_csv(self):
        res = self.client.get("/api/reports/int_sample_001/csv", headers=self.candidate_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("content-type"), "text/csv; charset=utf-8")
        text = res.text
        self.assertIn("Interview ID", text)
        self.assertIn("Alex Mercer", text)
        self.assertIn("int_sample_001", text)

    def test_14_report_authorization_security(self):
        # Candidate 2 cannot download Candidate 1's report
        rep_record = generate_pdf_report("int_sample_001", {"id": "user_cand_101", "role": "candidate"})
        report_id = rep_record["id"]

        dl_res = self.client.get(f"/api/reports/{report_id}/download", headers=self.cand2_headers)
        self.assertEqual(dl_res.status_code, 403)

        csv_res = self.client.get(f"/api/reports/int_sample_001/csv", headers=self.cand2_headers)
        self.assertEqual(csv_res.status_code, 403)

    # ==========================================================================
    # 5. Performance Summaries & Trends Tests (Zero Dummy Data)
    # ==========================================================================

    def test_15_performance_summary_with_real_data(self):
        res = self.client.get("/api/performance/summary", headers=self.candidate_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["has_data"])
        self.assertGreaterEqual(data["completed_interviews"], 1)
        self.assertGreater(data["average_score"], 0.0)
        self.assertGreater(data["highest_score"], 0)
        self.assertIn("category_performance", data)
        self.assertIn("technical", data["category_performance"])

    def test_16_performance_trends_with_real_data(self):
        res = self.client.get("/api/performance/trends", headers=self.candidate_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("trends", data)
        self.assertGreaterEqual(data["count"], 1)
        point = data["trends"][0]
        self.assertGreater(point["overall_score"], 0)
        self.assertEqual(point["domain"], "Full Stack")

    def test_17_skills_breakdown_with_real_data(self):
        res = self.client.get("/api/performance/skills", headers=self.candidate_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("skills", data)
        self.assertGreaterEqual(data["count"], 1)
        skill_names = [s["skill"] for s in data["skills"]]
        self.assertTrue("Technical" in skill_names or "Performance" in skill_names)

    def test_18_empty_state_handling_zero_dummy_data(self):
        # Candidate 2 has no interview records
        res = self.client.get("/api/performance/summary", headers=self.cand2_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["has_data"])
        self.assertEqual(data["completed_interviews"], 0)
        self.assertEqual(data["average_score"], 0.0)


if __name__ == "__main__":
    unittest.main()
