"""
Face Analyzer Module
Performs real-time face detection, 5-point facial landmark tracking (Eyes, Nose, Mouth),
pupil & iris localization, gaze direction estimation, head-pose estimation,
facial activity calculation, and CNN emotion inference using OpenCV and PyTorch.
"""

import os
import cv2
import numpy as np
from typing import Dict, Any, Optional, Tuple, List
from backend.models.emotion_cnn import emotion_pipeline, EMOTION_CLASSES

MODEL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YUNET_PATH = os.path.join(MODEL_DIR, "models", "face_detection_yunet.onnx")


class FaceAnalyzer:
    """
    Real-time Deep Learning Computer Vision analysis pipeline for video frames.
    Uses OpenCV YuNet DNN for 5-point facial landmarks and bounding box tracking.
    """

    def __init__(self, model_path: str = YUNET_PATH):
        self.model_path = model_path
        self.detector = None
        self.input_size = (320, 240)
        self.prev_face_gray = None
        self._init_detector()

    def _init_detector(self):
        """Initializes OpenCV YuNet Face & Landmark Detector if ONNX model is present."""
        if os.path.exists(self.model_path) and hasattr(cv2, "FaceDetectorYN"):
            try:
                self.detector = cv2.FaceDetectorYN.create(
                    self.model_path,
                    "",
                    self.input_size,
                    score_threshold=0.55,
                    nms_threshold=0.3,
                    top_k=5
                )
            except Exception as e:
                print(f"Warning: Could not initialize FaceDetectorYN: {e}")
                self.detector = None

    def decode_image_base64_or_bytes(self, image_data: Any) -> Optional[np.ndarray]:
        """
        Decodes base64 string or raw bytes into an OpenCV BGR numpy array.
        """
        import base64

        if image_data is None:
            return None

        if isinstance(image_data, np.ndarray):
            return image_data

        try:
            if isinstance(image_data, str):
                if "," in image_data:
                    image_data = image_data.split(",", 1)[1]
                raw_bytes = base64.b64decode(image_data)
            elif isinstance(image_data, bytes):
                raw_bytes = image_data
            else:
                return None

            np_arr = np.frombuffer(raw_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            return img
        except Exception:
            return None

    def detect_faces_and_landmarks(self, frame: np.ndarray) -> Tuple[List[Dict[str, Any]], int]:
        """
        Detects faces and 5 facial landmarks:
        Landmarks: Right Eye (candidate's right, viewer's left), Left Eye, Nose Tip, Right Mouth, Left Mouth.
        """
        h, w = frame.shape[:2]

        if self.detector is not None:
            self.detector.setInputSize((w, h))
            _, detections = self.detector.detect(frame)

            if detections is not None and len(detections) > 0:
                results = []
                for det in detections:
                    fx, fy, fw, fh = int(det[0]), int(det[1]), int(det[2]), int(det[3])
                    # Ensure within bounds
                    fx = max(0, fx)
                    fy = max(0, fy)
                    fw = min(w - fx, max(1, fw))
                    fh = min(h - fy, max(1, fh))

                    right_eye = (float(det[4]), float(det[5]))
                    left_eye = (float(det[6]), float(det[7]))
                    nose = (float(det[8]), float(det[9]))
                    right_mouth = (float(det[10]), float(det[11]))
                    left_mouth = (float(det[12]), float(det[13]))
                    conf = float(det[14])

                    results.append({
                        "bbox": (fx, fy, fw, fh),
                        "right_eye": right_eye,
                        "left_eye": left_eye,
                        "nose": nose,
                        "right_mouth": right_mouth,
                        "left_mouth": left_mouth,
                        "confidence": conf
                    })
                return results, len(results)

        # Fallback: geometric / color-based face candidate estimation
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (11, 11), 0)
        _, thresh = cv2.threshold(blurred, 40, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        candidates = []
        for c in contours:
            area = cv2.contourArea(c)
            if area > (w * h * 0.05):
                bx, by, bw, bh = cv2.boundingRect(c)
                candidates.append({
                    "bbox": (bx, by, bw, bh),
                    "right_eye": (bx + bw * 0.35, by + bh * 0.35),
                    "left_eye": (bx + bw * 0.65, by + bh * 0.35),
                    "nose": (bx + bw * 0.5, by + bh * 0.55),
                    "right_mouth": (bx + bw * 0.38, by + bh * 0.75),
                    "left_mouth": (bx + bw * 0.62, by + bh * 0.75),
                    "confidence": 0.6
                })

        return candidates, len(candidates)

    def select_primary_candidate(self, face_results: List[Dict[str, Any]], frame_w: int, frame_h: int) -> Optional[Dict[str, Any]]:
        """
        Selects the primary interview candidate face when multiple faces are detected.
        Prioritizes largest bounding box area and proximity to center of camera frame.
        """
        if not face_results:
            return None
        if len(face_results) == 1:
            return face_results[0]

        center_x, center_y = frame_w / 2.0, frame_h / 2.0
        best_cand = None
        best_score = -float("inf")

        for f in face_results:
            x, y, w, h = f["bbox"]
            area = w * h
            fc_x = x + w / 2.0
            fc_y = y + h / 2.0
            dist_to_center = np.sqrt((fc_x - center_x) ** 2 + (fc_y - center_y) ** 2)

            score = (area / float(frame_w * frame_h)) * 100.0 - (dist_to_center / np.sqrt(frame_w**2 + frame_h**2)) * 30.0
            if score > best_score:
                best_score = score
                best_cand = f

        return best_cand

    def estimate_gaze_direction(
        self, frame: np.ndarray, face_info: Dict[str, Any]
    ) -> Tuple[str, bool, Dict[str, Any]]:
        """
        Estimates Eye Gaze Direction using precise eye landmarks and pupil intensity localization.
        States: 'camera', 'left', 'right', 'down', 'eyes_closed', 'unknown'
        """
        re_x, re_y = face_info["right_eye"]
        le_x, le_y = face_info["left_eye"]
        fx, fy, fw, fh = face_info["bbox"]

        # Eye distance
        eye_dist = np.sqrt((le_x - re_x) ** 2 + (le_y - re_y) ** 2)
        if eye_dist < 5:
            return "camera", False, {"details": "fallback_eye_dist_too_small"}

        eye_radius = max(6, int(eye_dist * 0.25))

        # Sample eye ROI patches
        h_ratios = []
        v_ratios = []
        closed_indicators = []

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame

        for (ex, ey) in [(re_x, re_y), (le_x, le_y)]:
            ix = max(0, int(ex - eye_radius))
            iy = max(0, int(ey - eye_radius * 0.6))
            iw = min(frame.shape[1] - ix, int(eye_radius * 2))
            ih = min(frame.shape[0] - iy, int(eye_radius * 1.2))

            if iw <= 2 or ih <= 2:
                continue

            eye_patch = gray[iy:iy+ih, ix:ix+iw]

            # Check eye closure via intensity contrast & variance
            std_dev = np.std(eye_patch)
            if std_dev < 10.0:
                closed_indicators.append(True)
                continue
            else:
                closed_indicators.append(False)

            # Find dark pupil centroid via Gaussian blur & minMaxLoc
            blurred = cv2.GaussianBlur(eye_patch, (5, 5), 0)
            min_val, _, min_loc, _ = cv2.minMaxLoc(blurred)

            px, py = min_loc
            h_ratio = float(px) / float(max(1, iw))
            v_ratio = float(py) / float(max(1, ih))

            h_ratios.append(h_ratio)
            v_ratios.append(v_ratio)

        if len(closed_indicators) > 0 and all(closed_indicators):
            return "eyes_closed", True, {"eyes_closed": True}

        if not h_ratios:
            return "camera", False, {"details": "centered_fallback"}

        avg_h_ratio = float(np.mean(h_ratios))
        avg_v_ratio = float(np.mean(v_ratios))

        # Gaze direction classification:
        # Looking straight ahead at camera centers pupil around [0.35, 0.65]
        if avg_v_ratio > 0.68:
            direction = "down"
        elif avg_h_ratio < 0.35:
            direction = "left"
        elif avg_h_ratio > 0.65:
            direction = "right"
        else:
            direction = "camera"

        return direction, False, {
            "avg_h_ratio": round(avg_h_ratio, 3),
            "avg_v_ratio": round(avg_v_ratio, 3),
            "eyes_closed": False
        }

    def estimate_head_pose(
        self, face_info: Dict[str, Any], frame_w: int, frame_h: int
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Estimates 3D Head Orientation (Yaw, Pitch) using geometric relationship between
        Nose Tip and Eye Midpoint.
        States: 'forward', 'turning_left', 'turning_right', 'looking_up', 'looking_down'
        """
        re_x, re_y = face_info["right_eye"]
        le_x, le_y = face_info["left_eye"]
        nx, ny = face_info["nose"]
        fx, fy, fw, fh = face_info["bbox"]

        # Eye midpoint
        eye_mid_x = (re_x + le_x) / 2.0
        eye_mid_y = (re_y + le_y) / 2.0
        eye_dist = max(1.0, np.sqrt((le_x - re_x) ** 2 + (le_y - re_y) ** 2))

        # Yaw: Nose horizontal offset relative to eye midpoint normalized by half eye distance
        yaw_offset = (nx - eye_mid_x) / (eye_dist * 0.5)

        # Pitch: Nose vertical position relative to expected facial midline
        expected_nose_y = eye_mid_y + (eye_dist * 0.55)
        pitch_offset = (ny - expected_nose_y) / (eye_dist * 0.55)

        if yaw_offset < -0.22:
            direction = "turning_left"
        elif yaw_offset > 0.22:
            direction = "turning_right"
        elif pitch_offset < -0.25:
            direction = "looking_up"
        elif pitch_offset > 0.25:
            direction = "looking_down"
        else:
            direction = "forward"

        return direction, {
            "yaw_offset": round(float(yaw_offset), 3),
            "pitch_offset": round(float(pitch_offset), 3)
        }

    def calculate_facial_activity(self, current_face_gray: np.ndarray) -> int:
        """
        Calculates facial movement / activity score (0-100) between consecutive frames
        using normalized inter-frame pixel displacement.
        """
        if current_face_gray is None or current_face_gray.size == 0:
            return 0

        curr_small = cv2.resize(current_face_gray, (64, 64), interpolation=cv2.INTER_AREA)

        if self.prev_face_gray is None:
            self.prev_face_gray = curr_small
            return 35  # Initial baseline activity

        diff = cv2.absdiff(curr_small, self.prev_face_gray)
        mean_diff = float(np.mean(diff))
        self.prev_face_gray = curr_small

        # Scale to 0-100 activity score
        score = int(min(100, max(10, round(mean_diff * 7.5))))
        return score

    def analyze_frame(self, image_data: Any) -> Dict[str, Any]:
        """
        Executes complete multi-stage analysis pipeline on a video frame:
        1. Decode frame
        2. Detect faces & landmarks with YuNet DNN
        3. Select primary candidate
        4. Crop face ROI
        5. CNN Emotion Prediction (Nervous, Scared, Confused)
        6. Eye Tracking & Gaze Estimation
        7. Head-Pose Estimation
        8. Facial Activity Score
        """
        frame = self.decode_image_base64_or_bytes(image_data)
        if frame is None:
            return {
                "face_detected": False,
                "faces_count": 0,
                "error": "Failed to decode frame image"
            }

        frame_h, frame_w = frame.shape[:2]
        face_results, faces_count = self.detect_faces_and_landmarks(frame)
        primary_face = self.select_primary_candidate(face_results, frame_w, frame_h)

        if primary_face is None:
            return {
                "face_detected": False,
                "faces_count": 0,
                "bbox": None,
                "emotion": {
                    "label": "Unavailable",
                    "confidence": 0.0,
                    "probabilities": {c: 0.0 for c in EMOTION_CLASSES},
                    "model_status": emotion_pipeline.model_status,
                    "disclaimer": "Observable facial expression estimate."
                },
                "gaze": {
                    "direction": "unknown",
                    "eyes_closed": False,
                    "details": {}
                },
                "head_pose": {
                    "direction": "unknown",
                    "details": {}
                },
                "facial_activity_score": 0
            }

        fx, fy, fw, fh = primary_face["bbox"]
        face_crop_bgr = frame[fy:fy+fh, fx:fx+fw]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        face_crop_gray = gray[fy:fy+fh, fx:fx+fw]

        # 1. CNN Emotion Analysis
        emotion_result = emotion_pipeline.predict(face_crop_bgr)

        # 2. Eye & Gaze Tracking
        gaze_dir, eyes_closed, gaze_details = self.estimate_gaze_direction(
            frame, primary_face
        )

        # 3. Head Pose Estimation
        head_dir, head_details = self.estimate_head_pose(
            primary_face, frame_w, frame_h
        )

        # 4. Facial Activity Measurement
        facial_activity = self.calculate_facial_activity(face_crop_gray)

        return {
            "face_detected": True,
            "faces_count": faces_count,
            "bbox": {
                "x": int(fx),
                "y": int(fy),
                "w": int(fw),
                "h": int(fh),
                "norm_x": round(float(fx) / frame_w, 3),
                "norm_y": round(float(fy) / frame_h, 3),
                "norm_w": round(float(fw) / frame_w, 3),
                "norm_h": round(float(fh) / frame_h, 3)
            },
            "landmarks": {
                "right_eye": [round(float(x), 1) for x in primary_face["right_eye"]],
                "left_eye": [round(float(x), 1) for x in primary_face["left_eye"]],
                "nose": [round(float(x), 1) for x in primary_face["nose"]],
                "right_mouth": [round(float(x), 1) for x in primary_face["right_mouth"]],
                "left_mouth": [round(float(x), 1) for x in primary_face["left_mouth"]]
            },
            "emotion": {
                "label": emotion_result["emotion"],
                "confidence": emotion_result["confidence"],
                "probabilities": emotion_result["probabilities"],
                "model_status": emotion_result["model_status"],
                "disclaimer": "Observable facial expression estimate."
            },
            "gaze": {
                "direction": gaze_dir,
                "eyes_closed": eyes_closed,
                "details": gaze_details
            },
            "head_pose": {
                "direction": head_dir,
                "details": head_details
            },
            "facial_activity_score": facial_activity
        }


# Global singleton instance
face_analyzer = FaceAnalyzer()
