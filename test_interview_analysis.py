"""
Comprehensive Test Suite for AI Interview Vision & Behavioral Analysis
Tests Face Detection, CNN Emotion Inference, Eye Tracking, Gaze Direction,
Eye Contact Math, Head Pose, Attention, Engagement, Confidence Indicators,
Final Report Synthesis, and API Endpoints.
"""

import os
import cv2
import json
import base64
import unittest
import numpy as np
import torch
from fastapi.testclient import TestClient

from backend.main import app
from backend.models.emotion_cnn import EmotionCNN, EmotionPipeline, EMOTION_CLASSES, CHECKPOINT_PATH
from backend.services.face_analyzer import FaceAnalyzer
from backend.services.behavior_tracker import InterviewSessionTracker, BehaviorManager


class TestEmotionCNN(unittest.TestCase):
    """Tests for PyTorch Emotion CNN architecture, preprocessing, and inference."""

    def setUp(self):
        self.pipeline = EmotionPipeline()

    def test_model_architecture_and_forward(self):
        model = EmotionCNN(num_classes=3)
        dummy_input = torch.randn(2, 1, 48, 48)
        output = model(dummy_input)
        self.assertEqual(output.shape, (2, 3))

    def test_face_preprocessing(self):
        # Create a dummy 100x100 BGR face image
        dummy_bgr = np.ones((100, 100, 3), dtype=np.uint8) * 128
        tensor = self.pipeline.preprocess_face(dummy_bgr)
        self.assertIsNotNone(tensor)
        self.assertEqual(tensor.shape, (1, 1, 48, 48))
        self.assertTrue(-1.0 <= tensor.min() <= 1.0)
        self.assertTrue(-1.0 <= tensor.max() <= 1.0)

    def test_emotion_prediction_output_structure(self):
        dummy_bgr = np.ones((80, 80, 3), dtype=np.uint8) * 150
        result = self.pipeline.predict(dummy_bgr)

        self.assertIn("emotion", result)
        self.assertIn("confidence", result)
        self.assertIn("probabilities", result)
        self.assertIn(result["emotion"], EMOTION_CLASSES)
        self.assertTrue(0.0 <= result["confidence"] <= 1.0)

        probs = result["probabilities"]
        for cls_name in EMOTION_CLASSES:
            self.assertIn(cls_name, probs)
            self.assertTrue(0.0 <= probs[cls_name] <= 1.0)

        # Sum of probabilities should be approximately 1.0
        prob_sum = sum(probs.values())
        self.assertAlmostEqual(prob_sum, 1.0, places=2)

    def test_model_status_reporting(self):
        status = self.pipeline.get_status()
        self.assertIn("status", status)
        self.assertIn("classes", status)
        self.assertEqual(status["classes"], EMOTION_CLASSES)
        self.assertIn("disclaimer", status)


class TestFaceAnalyzer(unittest.TestCase):
    """Tests for OpenCV Face Detection, Eye Tracking, Gaze, Head Pose, and Facial Activity."""

    def setUp(self):
        self.analyzer = FaceAnalyzer()

    def _create_synthetic_face_image(self):
        """Creates a synthetic image with face, eyes, and mouth shapes for OpenCV cascade testing."""
        img = np.zeros((300, 300, 3), dtype=np.uint8)
        # Face ellipse / circle
        cv2.circle(img, (150, 150), 90, (200, 200, 200), -1)
        # Eyes
        cv2.circle(img, (115, 130), 18, (40, 40, 40), -1)  # Left eye
        cv2.circle(img, (185, 130), 18, (40, 40, 40), -1)  # Right eye
        # Pupils
        cv2.circle(img, (115, 130), 6, (0, 0, 0), -1)
        cv2.circle(img, (185, 130), 6, (0, 0, 0), -1)
        # Nose
        cv2.circle(img, (150, 160), 10, (140, 140, 140), -1)
        # Mouth
        cv2.ellipse(img, (150, 200), (35, 12), 0, 0, 180, (50, 50, 50), -1)
        return img

    def test_base64_decoding(self):
        img = np.ones((50, 50, 3), dtype=np.uint8) * 100
        _, buf = cv2.imencode(".jpg", img)
        b64_str = "data:image/jpeg;base64," + base64.b64encode(buf).decode("utf-8")

        decoded = self.analyzer.decode_image_base64_or_bytes(b64_str)
        self.assertIsNotNone(decoded)
        self.assertEqual(decoded.shape, (50, 50, 3))

    def test_primary_candidate_selection(self):
        # Two detected faces: one large centered, one small background
        faces = [
            {"bbox": (20, 20, 40, 40), "confidence": 0.8},    # Small top left
            {"bbox": (100, 100, 150, 150), "confidence": 0.9} # Large center
        ]
        primary = self.analyzer.select_primary_candidate(faces, 400, 400)
        self.assertEqual(primary["bbox"], (100, 100, 150, 150))

    def test_facial_activity_score(self):
        face1 = np.ones((60, 60), dtype=np.uint8) * 100
        face2 = np.ones((60, 60), dtype=np.uint8) * 150  # Motion delta

        score1 = self.analyzer.calculate_facial_activity(face1)
        score2 = self.analyzer.calculate_facial_activity(face2)
        self.assertTrue(0 <= score1 <= 100)
        self.assertTrue(0 <= score2 <= 100)

    def test_analyze_frame_no_face(self):
        blank_img = np.zeros((200, 200, 3), dtype=np.uint8)
        _, buf = cv2.imencode(".jpg", blank_img)
        b64_str = base64.b64encode(buf).decode("utf-8")

        res = self.analyzer.analyze_frame(b64_str)
        self.assertFalse(res["face_detected"])
        self.assertEqual(res["gaze"]["direction"], "unknown")
        self.assertEqual(res["head_pose"]["direction"], "unknown")


class TestBehaviorTracker(unittest.TestCase):
    """Tests for Eye Contact %, Attention, Engagement, Confidence, and Report formulas."""

    def setUp(self):
        self.tracker = InterviewSessionTracker(session_id="test_sess_001", candidate_name="Test Candidate")

    def test_eye_contact_percentage_calculation(self):
        # Feed 10 frames: 7 looking at camera, 3 looking left
        for i in range(7):
            self.tracker.update_frame({
                "face_detected": True,
                "faces_count": 1,
                "gaze": {"direction": "camera", "eyes_closed": False},
                "head_pose": {"direction": "forward"},
                "emotion": {"label": "Nervous", "confidence": 0.8},
                "facial_activity_score": 45
            })

        for i in range(3):
            self.tracker.update_frame({
                "face_detected": True,
                "faces_count": 1,
                "gaze": {"direction": "left", "eyes_closed": False},
                "head_pose": {"direction": "forward"},
                "emotion": {"label": "Confused", "confidence": 0.75},
                "facial_activity_score": 45
            })

        eye_contact = self.tracker.get_eye_contact_percentage()
        # 7 / 10 = 70.0%
        self.assertEqual(eye_contact, 70.0)
        self.assertEqual(self.tracker.get_eye_contact_level(eye_contact), "High")

    def test_attention_and_engagement_levels(self):
        # Feed positive signals (Face present, looking at camera, forward head)
        for _ in range(5):
            self.tracker.update_frame({
                "face_detected": True,
                "faces_count": 1,
                "gaze": {"direction": "camera", "eyes_closed": False},
                "head_pose": {"direction": "forward"},
                "emotion": {"label": "Nervous", "confidence": 0.85},
                "facial_activity_score": 40
            })

        att = self.tracker.get_smoothed_attention()
        self.assertTrue(att >= 75)
        self.assertEqual(self.tracker.get_score_level(att), "High")

        eng = self.tracker.compute_engagement(
            eye_contact_pct=self.tracker.get_eye_contact_percentage(),
            attention_score=att,
            facial_activity=40,
            head_stability_pct=100.0
        )
        self.assertTrue(0 <= eng <= 100)

    def test_confidence_indicators(self):
        conf = self.tracker.compute_confidence_indicators(
            eye_contact_pct=75.0,
            head_stability_pct=80.0,
            facial_activity=45
        )
        self.assertIn("score", conf)
        self.assertIn("level", conf)
        self.assertIn("indicators", conf)
        self.assertIn(conf["level"], ["High", "Moderate", "Low"])
        self.assertTrue(0 <= conf["score"] <= 100)

    def test_final_report_generation(self):
        # Ingest frames
        for _ in range(6):
            self.tracker.update_frame({
                "face_detected": True,
                "faces_count": 1,
                "gaze": {"direction": "camera", "eyes_closed": False},
                "head_pose": {"direction": "forward"},
                "emotion": {"label": "Nervous", "confidence": 0.8},
                "facial_activity_score": 35
            })

        report = self.tracker.generate_behavior_report()
        self.assertIn("session_id", report)
        self.assertIn("interview_duration", report)
        self.assertIn("emotion_estimates", report)
        self.assertIn("eye_contact", report)
        self.assertIn("attention", report)
        self.assertIn("engagement", report)
        self.assertIn("confidence_indicators", report)
        self.assertIn("gaze_distribution", report)
        self.assertIn("head_pose_distribution", report)
        self.assertIn("areas_to_improve", report)
        self.assertTrue(len(report["areas_to_improve"]) > 0)


class TestInterviewAnalysisAPI(unittest.TestCase):
    """Integration tests for FastAPI /api/interview-analysis endpoints."""

    def setUp(self):
        self.client = TestClient(app)
        self.session_id = "test_api_session_999"

    def test_model_status_endpoint(self):
        res = self.client.get("/api/interview-analysis/model-status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("status", data)
        self.assertIn("classes", data)
        self.assertEqual(data["classes"], ["Nervous", "Scared", "Confused"])

    def test_start_and_frame_and_report_flow(self):
        # 1. Start session
        start_res = self.client.post("/api/interview-analysis/start", json={
            "session_id": self.session_id,
            "candidate_name": "Alex Mercer"
        })
        self.assertEqual(start_res.status_code, 200)

        # 2. Send a dummy frame (base64 image)
        dummy_img = np.ones((100, 100, 3), dtype=np.uint8) * 120
        _, buf = cv2.imencode(".jpg", dummy_img)
        b64_str = "data:image/jpeg;base64," + base64.b64encode(buf).decode("utf-8")

        frame_res = self.client.post("/api/interview-analysis/frame", json={
            "session_id": self.session_id,
            "frame_data": b64_str
        })
        self.assertEqual(frame_res.status_code, 200)
        frame_data = frame_res.json()
        self.assertTrue(frame_data["success"])
        self.assertIn("attention", frame_data)
        self.assertIn("engagement", frame_data)
        self.assertIn("eye_contact", frame_data)
        self.assertIn("confidence_indicators", frame_data)

        # 3. Stop session
        stop_res = self.client.post("/api/interview-analysis/stop", json={
            "session_id": self.session_id
        })
        self.assertEqual(stop_res.status_code, 200)

        # 4. Get Final Report
        report_res = self.client.get(f"/api/interview-analysis/{self.session_id}/report")
        self.assertEqual(report_res.status_code, 200)
        report = report_res.json()
        self.assertEqual(report["session_id"], self.session_id)
        self.assertIn("interview_duration", report)
        self.assertIn("emotion_estimates", report)
        self.assertIn("eye_contact", report)
        self.assertIn("attention", report)
        self.assertIn("engagement", report)
        self.assertIn("confidence_indicators", report)


if __name__ == "__main__":
    unittest.main()
