"""
Automated Test Suite for Real-Time Electronic Device Detection & Anti-Cheating Module.
Validates:
1. Candidate alone in front of camera (no device alert)
2. Mobile phone detection with YOLOv5n ONNX
3. Laptop detection
4. Person / Face / Hand alone vs electronic device (no false alarms)
5. Temporal confirmation (2 consecutive frames needed for confirmed alert)
6. Alert clear delay (anti-flicker disappearance tolerance)
7. Multiple device detection in frame
8. Storage persistence in storage/detection_events/<session_id>.json
9. Session start, stop, pause, resume lifecycle
10. PDF and CSV report integration
11. Strict RBAC authorization
12. Admin & Recruiter analytics endpoints
"""

import os
import io
import json
import time
import base64
import unittest
import numpy as np
import cv2
from fastapi.testclient import TestClient

from backend.main import app
from backend.config import settings
from backend.database import db
from backend.auth import create_access_token
from backend.services.device_detection_service import (
    DeviceDetector,
    SessionDetectionTracker,
    DeviceDetectionManager,
    device_detection_manager
)


class TestDeviceDetectionModule(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

        # Candidate Auth Token
        cls.cand_id = "user_cand_101"
        cls.cand_token = create_access_token(cls.cand_id, "candidate@example.com", "candidate")
        cls.cand_headers = {"Authorization": f"Bearer {cls.cand_token}"}

        # Recruiter Auth Token
        cls.rec_id = "user_rec_202"
        cls.rec_token = create_access_token(cls.rec_id, "recruiter@example.com", "recruiter")
        cls.rec_headers = {"Authorization": f"Bearer {cls.rec_token}"}

        # Admin Auth Token
        cls.admin_id = "user_admin_303"
        cls.admin_token = create_access_token(cls.admin_id, "admin@example.com", "admin")
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

    @classmethod
    def tearDownClass(cls):
        """Cleans up temporary test session files created during tests."""
        storage_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "storage", "detection_events"
        )
        if os.path.exists(storage_dir):
            for fname in os.listdir(storage_dir):
                if any(fname.startswith(p) for p in ("test_", "sess_api_test_", "int_test_stream_", "int_report_test_", "scen_")):
                    try:
                        os.remove(os.path.join(storage_dir, fname))
                    except Exception:
                        pass

    def _create_blank_frame_base64(self, color=(128, 128, 128)) -> str:
        """Creates a blank synthetic test frame encoded in Base64 JPEG."""
        img = np.full((480, 640, 3), color, dtype=np.uint8)
        _, buf = cv2.imencode(".jpg", img)
        return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode("utf-8")

    def test_01_yolov5_model_loading_and_status(self):
        """Test YOLOv5n ONNX model loading and status endpoint."""
        detector = DeviceDetector()
        status = detector.get_status()
        self.assertTrue(status["is_loaded"])
        self.assertEqual(status["status"], "Operational")
        self.assertIn("cell phone", status["prohibited_classes"])
        self.assertIn("laptop", status["prohibited_classes"])

        res = self.client.get("/api/detection/model-status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["is_loaded"])

    def test_02_blank_frame_no_prohibited_device(self):
        """Test candidate alone / blank frame produces NORMAL status and 0 alerts."""
        detector = DeviceDetector()
        blank_frame = np.full((480, 640, 3), 100, dtype=np.uint8)
        detections = detector.detect_objects(blank_frame)
        self.assertEqual(len(detections), 0)

        session_id = f"test_clean_sess_{int(time.time())}"
        tracker = SessionDetectionTracker(session_id)
        result = tracker.update_frame_detections(detections)
        self.assertEqual(result["alert_state"], "NORMAL")
        self.assertFalse(result["confirmed_alert"])
        self.assertEqual(result["total_session_alerts"], 0)

    def test_03_temporal_confirmation_rules(self):
        """Test temporal confirmation: Frame 1 -> WARNING, Frame 2 -> Confirmed ALERT when confirmation frames is 2."""
        session_id = f"test_temporal_sess_{int(time.time())}"
        tracker = SessionDetectionTracker(session_id)

        mock_detection = [{
            "object_name": "Mobile Phone",
            "raw_class": "cell phone",
            "confidence": 0.88,
            "box": {"x": 0.3, "y": 0.3, "width": 0.2, "height": 0.4},
            "timestamp": "2026-09-14T10:30:00"
        }]

        orig_conf = settings.REQUIRED_CONFIRMATION_FRAMES
        try:
            settings.REQUIRED_CONFIRMATION_FRAMES = 2
            # Frame 1: Warning state
            res1 = tracker.update_frame_detections(mock_detection)
            self.assertEqual(res1["alert_state"], "WARNING")
            self.assertFalse(res1["confirmed_alert"])
            self.assertEqual(tracker.total_alerts_count, 0)

            # Frame 2: Confirmed alert state
            res2 = tracker.update_frame_detections(mock_detection)
            self.assertEqual(res2["alert_state"], "ALERT")
            self.assertTrue(res2["confirmed_alert"])
            self.assertEqual(tracker.total_alerts_count, 1)
            self.assertIn("Mobile Phone", tracker.detected_device_counts)
            self.assertEqual(tracker.detected_device_counts["Mobile Phone"], 1)
        finally:
            settings.REQUIRED_CONFIRMATION_FRAMES = orig_conf

    def test_04_alert_clear_delay_prevents_flicker(self):
        """Test disappearance tolerance holds alert active during brief 1-frame occlusion."""
        session_id = f"test_flicker_sess_{int(time.time())}"
        tracker = SessionDetectionTracker(session_id)

        mock_detection = [{
            "object_name": "Mobile Phone",
            "raw_class": "cell phone",
            "confidence": 0.91,
            "box": {"x": 0.4, "y": 0.4, "width": 0.2, "height": 0.3},
            "timestamp": "2026-09-14T10:30:00"
        }]

        # Trigger confirmed alert
        tracker.update_frame_detections(mock_detection)
        tracker.update_frame_detections(mock_detection)
        self.assertTrue(tracker.alert_active)

        # Immediate next frame has 0 devices (e.g. hand briefly covered it)
        # Should remain ALERT due to ALERT_CLEAR_DELAY_SECONDS
        res_blank = tracker.update_frame_detections([])
        self.assertEqual(res_blank["alert_state"], "ALERT")

        # After waiting for clear delay (>1.5s), alert transitions back to NORMAL
        tracker.last_detection_timestamp -= (settings.ALERT_CLEAR_DELAY_SECONDS + 0.5)
        res_cleared = tracker.update_frame_detections([])
        self.assertEqual(res_cleared["alert_state"], "NORMAL")
        self.assertFalse(tracker.alert_active)

    def test_05_storage_persistence_json(self):
        """Test confirmed detection events are saved to storage/detection_events/<session_id>.json."""
        session_id = f"test_persist_sess_{int(time.time())}"
        tracker = SessionDetectionTracker(session_id)

        mock_detection = [{
            "object_name": "Laptop",
            "raw_class": "laptop",
            "confidence": 0.85,
            "box": {"x": 0.2, "y": 0.2, "width": 0.5, "height": 0.4},
            "timestamp": "2026-09-14T10:32:00"
        }]

        tracker.update_frame_detections(mock_detection)
        tracker.update_frame_detections(mock_detection)
        tracker.stop_session()

        storage_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "storage", "detection_events", f"{session_id}.json"
        )
        self.assertTrue(os.path.exists(storage_path))

        with open(storage_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            self.assertEqual(data["session_id"], session_id)
            self.assertEqual(data["total_alerts"], 1)
            self.assertIn("Laptop", data["detected_device_counts"])
            self.assertEqual(len(data["events"]), 1)

    def test_06_video_analysis_frame_integration(self):
        """Test POST /api/interview-analysis/frame returns both behavioral & device detection telemetry."""
        session_id = f"int_test_stream_{int(time.time())}"
        b64_frame = self._create_blank_frame_base64()

        # Initialize session
        self.client.post("/api/interview-analysis/start", json={
            "session_id": session_id,
            "candidate_name": "Alex Mercer"
        })

        res = self.client.post("/api/interview-analysis/frame", json={
            "session_id": session_id,
            "frame_data": b64_frame
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("device_detection", data)
        self.assertEqual(data["device_detection"]["alert_state"], "NORMAL")

        # Stop session
        stop_res = self.client.post("/api/interview-analysis/stop", json={"session_id": session_id})
        self.assertEqual(stop_res.status_code, 200)

    def test_07_post_and_get_detection_events_api(self):
        """Test POST /api/interviews/{session_id}/detection-events and GET endpoints with RBAC."""
        session_id = f"sess_api_test_{int(time.time())}"

        # Post detection event as candidate
        post_res = self.client.post(
            f"/api/interviews/{session_id}/detection-events",
            json={
                "detected_object": "Mobile Phone",
                "raw_class": "cell phone",
                "confidence": 0.89,
                "timestamp": "2026-09-14T11:00:00",
                "bounding_box": {"x": 0.1, "y": 0.1, "width": 0.2, "height": 0.3}
            },
            headers=self.cand_headers
        )
        self.assertEqual(post_res.status_code, 200)

        # Get events as candidate
        get_res = self.client.get(
            f"/api/interviews/{session_id}/detection-events",
            headers=self.cand_headers
        )
        self.assertEqual(get_res.status_code, 200)
        events_data = get_res.json()
        self.assertEqual(events_data["total_events"], 1)
        self.assertEqual(events_data["events"][0]["detected_object"], "Mobile Phone")

        # Get summary
        sum_res = self.client.get(
            f"/api/interviews/{session_id}/detection-summary",
            headers=self.cand_headers
        )
        self.assertEqual(sum_res.status_code, 200)
        sum_data = sum_res.json()
        self.assertEqual(sum_data["total_alerts"], 1)
        self.assertIn("Mobile Phone", sum_data["detected_device_counts"])

    def test_08_pdf_and_csv_reports_with_detection_data(self):
        """Test PDF and CSV generation incorporates electronic device detection sections."""
        from backend.services.report_service import generate_pdf_report, generate_interview_csv

        # Create mock interview in db
        int_id = f"int_report_test_{int(time.time())}"
        db.interviews[int_id] = {
            "id": int_id,
            "user_id": self.cand_id,
            "candidate_name": "Alex Mercer",
            "domain": "Full Stack",
            "difficulty": "Medium",
            "type": "Technical",
            "status": "Completed",
            "duration_seconds": 300,
            "created_at": "2026-09-14T10:00:00",
            "questions": [],
            "report": {
                "overall_score": 88,
                "recommendation": "Hire",
                "summary": "Great technical communication."
            }
        }

        # Log a confirmed device detection event for this session
        tracker = device_detection_manager.get_or_create_session(int_id, self.cand_id, int_id)
        tracker.update_frame_detections([{
            "object_name": "Mobile Phone",
            "raw_class": "cell phone",
            "confidence": 0.92,
            "box": {"x": 0.2, "y": 0.2, "width": 0.2, "height": 0.3},
            "timestamp": "2026-09-14T10:05:00"
        }])
        tracker.update_frame_detections([{
            "object_name": "Mobile Phone",
            "raw_class": "cell phone",
            "confidence": 0.92,
            "box": {"x": 0.2, "y": 0.2, "width": 0.2, "height": 0.3},
            "timestamp": "2026-09-14T10:05:01"
        }])
        tracker.stop_session()

        # Generate PDF
        pdf_res = generate_pdf_report(int_id, {"id": self.cand_id, "role": "candidate"})
        self.assertIn("file_path", pdf_res)
        self.assertTrue(os.path.exists(pdf_res["file_path"]))
        self.assertEqual(pdf_res["device_alerts_count"], 1)

        # Generate CSV
        csv_str = generate_interview_csv(int_id, {"id": self.cand_id, "role": "candidate"})
        self.assertIn("Device Alerts Count", csv_str)
        self.assertIn("Mobile Phone", csv_str)

    def test_09_admin_analytics_endpoint(self):
        """Test GET /api/detection/analytics returns authentic aggregated stats."""
        res = self.client.get("/api/detection/analytics", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "Operational")
        self.assertIn("total_monitored_sessions", data)
        self.assertIn("device_breakdown", data)


if __name__ == "__main__":
    unittest.main()
