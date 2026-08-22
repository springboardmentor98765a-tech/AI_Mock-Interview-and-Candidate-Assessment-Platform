"""
Module 6 - Emotion Detection & Eye Tracking
Task 1: Face Detection & Frame Processing foundation.

Pipeline (server-side):
    base64 frame -> OpenCV decode/preprocess -> quality metrics (brightness /
    contrast / sharpness) -> MediaPipe Face Landmarker (468/478 landmarks,
    multi-face) with OpenCV Haar-cascade fallback -> normalized bounding
    regions + key facial landmarks -> rolling per-session accumulator.

Handles edge cases: no face, multiple faces, poor lighting / low contrast,
blurry frames, invalid payloads and temporary detector failures (graceful
degradation instead of raising).
"""

import base64
import json
import math
import os
import threading
import time
import urllib.request
from collections import deque

import cv2
import numpy as np

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "models")
FACE_LANDMARKER_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)
FACE_LANDMARKER_PATH = os.path.join(MODELS_DIR, "face_landmarker.task")

MAX_ANALYSIS_WIDTH = 640
MAX_ACCUMULATED_SAMPLES = 900

# Brightness (grayscale mean) bands
BRIGHT_DARK_BELOW = 45
BRIGHT_DIM_BELOW = 75
BRIGHT_HIGH_ABOVE = 165
CONTRAST_LOW_BELOW = 20.0
SHARP_BLURRY_BELOW = 25.0
SHARP_SOFT_BELOW = 60.0

# Task 2: head-pose classification thresholds (degrees)
YAW_FORWARD_DEADZONE = 10.0
PITCH_FORWARD_DEADZONE = 10.0
ROLL_TILT_DEADZONE = 14.0
POSE_CALIB_WINDOW = 25

# Task 3: eye-contact tracking
EYE_LEFT_CORNERS = (33, 133)
EYE_RIGHT_CORNERS = (263, 362)
EYE_LEFT_LIDS = (159, 145)
EYE_RIGHT_LIDS = (386, 374)
IRIS_GROUP_A = tuple(range(468, 473))
IRIS_GROUP_B = tuple(range(473, 478))
GAZE_H_AWAY_RATIO = 0.20
GAZE_V_AWAY_RATIO = 0.30
EAR_CLOSED_BELOW = 0.14
HEAD_YAW_GAZE_LIMIT = 14.0
HEAD_PITCH_GAZE_LIMIT = 12.0
BLINK_CARRYOVER_SECONDS = 1.5
MAX_STATE_DT_SECONDS = 6.0
MIN_MEASURED_SECONDS = 5.0

# Task 5: emotion recognition (DeepFace)
EMOTION_CONFIG = {
    "analysis_interval_s": 2.0,
    "crop_max_age_s": 6.0,
}
EMOTION_CROP_MARGIN = 0.25
EMOTION_CATEGORIES = ("angry", "disgust", "fear", "happy", "neutral", "sad", "surprise")

# Task 6: Confidence Indicator (transparent behavioral metric, no ML model)
CONFIDENCE_CONFIG = {
    "weights": {
        "eye_contact": 0.20,
        "head_stability": 0.20,
        "face_visibility": 0.20,
        "attention": 0.20,
        "expression_stability": 0.20,
    },
    "min_components_for_overall": 3,
    "min_pose_samples": 3,
}

# Task 7: Engagement Score (separate composite - participation, not personality)
ENGAGEMENT_CONFIG = {
    "weights": {
        "attention": 0.25,
        "eye_contact": 0.20,
        "face_presence": 0.15,
        "head_orientation": 0.10,
        "facial_activity": 0.15,
        "interaction_continuity": 0.15,
    },
    "min_components_for_score": 4,
    "activity_full_scale_index": 40.0,
    "streak_penalty_per_s": 3.0,
    "streak_penalty_cap": 40.0,
}

# Task 8: Interview Behavior Analysis
BEHAVIOR_CONFIG = {
    "segment_seconds": 120.0,
    "good_eye_contact_pct": 70.0,
    "away_eye_contact_pct": 40.0,
    "visible_good_pct": 90.0,
    "attention_consistent_pct": 75.0,
    "movement_low_deg_per_min": 3.0,
    "movement_high_deg_per_min": 60.0,
}
ATTENTION_BREAK_SIGNIFICANT_S = 2.0


def _engagement_level(score):
    if score is None:
        return None
    if score >= 70:
        return "High"
    if score >= 45:
        return "Moderate"
    return "Low"

# Selected FaceMesh landmark indices (of the standard 468/478 mesh)
KEY_LANDMARK_IDS = {
    "forehead_top": 10,
    "chin": 152,
    "nose_tip": 1,
    "left_eye_outer": 33,
    "left_eye_inner": 133,
    "left_eye_upper_lid": 159,
    "left_eye_lower_lid": 145,
    "right_eye_inner": 362,
    "right_eye_outer": 263,
    "right_eye_upper_lid": 386,
    "right_eye_lower_lid": 374,
    "mouth_left_corner": 61,
    "mouth_right_corner": 291,
    "upper_lip_center": 13,
    "lower_lip_center": 14,
}

_mp_lock = threading.Lock()
_emotion_lock = threading.Lock()
_deepface_available = None


def _try_import_deepface():
    global _deepface_available
    if _deepface_available is not None:
        return _deepface_available
    try:
        import sys
        for stream in (sys.stdout, sys.stderr):
            try:
                if stream and hasattr(stream, "reconfigure"):
                    stream.reconfigure(encoding="utf-8", errors="replace")
            except Exception:  # noqa: BLE001
                pass
        os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
        from deepface import DeepFace  # noqa: F401
        _deepface_available = DeepFace
    except Exception:  # noqa: BLE001 - emotion must never break the pipeline
        _deepface_available = False
    return _deepface_available


def _analyze_emotion(face_crop_rgb):
    """
    Run DeepFace emotion analysis on a cropped face. Returns
    {"dominant": str, "probabilities": {category: percent}} or None.
    """
    df = _try_import_deepface()
    if not df:
        return None
    try:
        with _emotion_lock:
            res = df.analyze(
                face_crop_rgb,
                actions=["emotion"],
                detector_backend="skip",
                enforce_detection=False,
                silent=True,
            )
        entry = res[0] if isinstance(res, list) else res
        probs = {}
        for key in EMOTION_CATEGORIES:
            val = entry.get("emotion", {}).get(key, 0.0)
            probs[key] = round(float(val), 1)
        dominant = entry.get("dominant_emotion")
        if dominant not in EMOTION_CATEGORIES:
            dominant = max(probs, key=probs.get) if any(probs.values()) else None
        if dominant is None:
            return None
        return {"dominant": dominant, "probabilities": probs}
    except Exception:  # noqa: BLE001 - degrade gracefully
        return None


def _try_import_mediapipe():
    try:
        import mediapipe as mp
        from mediapipe.tasks.python import vision as mp_vision

        return mp, mp_vision
    except Exception:
        return None, None


def _ensure_model_downloaded():
    if os.path.exists(FACE_LANDMARKER_PATH) and os.path.getsize(FACE_LANDMARKER_PATH) > 1024:
        return True
    os.makedirs(MODELS_DIR, exist_ok=True)
    tmp_path = FACE_LANDMARKER_PATH + ".tmp"
    try:
        req = urllib.request.Request(
            FACE_LANDMARKER_URL, headers={"User-Agent": "SmartHireAI/1.0"}
        )
        with urllib.request.urlopen(req, timeout=30) as resp, open(tmp_path, "wb") as fh:
            fh.write(resp.read())
        if os.path.getsize(tmp_path) < 1024:
            raise IOError("Downloaded model looks truncated.")
        os.replace(tmp_path, FACE_LANDMARKER_PATH)
        return True
    except Exception:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except OSError:
            pass
        return False


class VisionEngine:
    """Lazy singleton wrapper around the face analysis stack."""

    def __init__(self):
        self._lock = threading.Lock()
        self._landmarker = None
        self._haar = None
        self._detector_name = None
        self._init_error = None
        self._initialized = False

    def initialize(self):
        with self._lock:
            if self._initialized:
                return self._detector_name
            self._initialized = True

            mp, mp_vision = _try_import_mediapipe()
            if mp is not None and _ensure_model_downloaded():
                try:
                    options = mp_vision.FaceLandmarkerOptions(
                        base_options=mp.tasks.BaseOptions(
                            model_asset_path=FACE_LANDMARKER_PATH
                        ),
                        running_mode=mp_vision.RunningMode.IMAGE,
                        num_faces=4,
                        min_face_detection_confidence=0.5,
                        min_face_presence_confidence=0.5,
                        output_face_blendshapes=False,
                        output_facial_transformation_matrixes=True,
                    )
                    self._landmarker = mp_vision.FaceLandmarker.create_from_options(options)
                    self._detector_name = "mediapipe_facelandmarker"
                    return self._detector_name
                except Exception as exc:  # noqa: BLE001 - degrade gracefully
                    self._init_error = f"FaceLandmarker init failed: {exc}"
                    self._landmarker = None

            try:
                haar_path = os.path.join(
                    cv2.data.haarcascades, "haarcascade_frontalface_default.xml"
                )
                self._haar = cv2.CascadeClassifier(haar_path)
                if self._haar.empty():
                    raise IOError("Cascade classifier failed to load.")
                self._detector_name = "opencv_haar"
            except Exception as exc:  # noqa: BLE001
                self._init_error = f"All detectors unavailable: {exc}"
                self._haar = None
                self._detector_name = None
            return self._detector_name

    @property
    def detector(self):
        return self._detector_name

    def analyze(self, image_bytes: bytes, interview_id: int = None) -> dict:
        started = time.time()
        result = {
            "status": "processing_error",
            "face_present": False,
            "face_count": 0,
            "faces": [],
            "landmarks_count": 0,
            "key_points": None,
            "quality": None,
            "head_pose": None,
            "emotion": None,
            "warnings": [],
            "detector": self._detector_name,
            "analysis_ms": None,
        }
        try:
            buffer = np.frombuffer(image_bytes, dtype=np.uint8)
            frame = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
            if frame is None or frame.size == 0:
                result["status"] = "invalid_frame"
                result["warnings"].append("Frame could not be decoded.")
                return result

            height, width = frame.shape[:2]
            if width > MAX_ANALYSIS_WIDTH:
                scale = MAX_ANALYSIS_WIDTH / float(width)
                frame = cv2.resize(
                    frame, (max(1, int(width * scale)), max(1, int(height * scale))),
                    interpolation=cv2.INTER_AREA,
                )
            height, width = frame.shape[:2]

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            brightness = float(np.mean(gray))
            contrast = float(np.std(gray))
            sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())

            lighting_status = "good"
            if brightness < BRIGHT_DARK_BELOW:
                lighting_status = "dark"
            elif brightness < BRIGHT_DIM_BELOW:
                lighting_status = "dim"
            elif brightness > BRIGHT_HIGH_ABOVE:
                lighting_status = "overexposed"

            sharpness_status = "sharp"
            if sharpness < SHARP_BLURRY_BELOW:
                sharpness_status = "blurry"
            elif sharpness < SHARP_SOFT_BELOW:
                sharpness_status = "soft"

            result["quality"] = {
                "brightness": round(brightness, 1),
                "contrast": round(contrast, 1),
                "sharpness": round(sharpness, 1),
                "lighting_status": lighting_status,
                "sharpness_status": sharpness_status,
                "frame_width": int(width),
                "frame_height": int(height),
            }
            if lighting_status in ("dark", "dim"):
                result["warnings"].append(f"Poor lighting detected ({lighting_status}).")
            elif lighting_status == "overexposed":
                result["warnings"].append("Frame is overexposed.")
            if contrast < CONTRAST_LOW_BELOW:
                result["warnings"].append("Very low contrast scene.")
            if sharpness_status == "blurry":
                result["warnings"].append("Blurry frame.")

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            detector_name = self.initialize()
            result["detector"] = detector_name

            faces = []
            landmarks_count = 0
            key_points = None
            detection = None
            transform_matrices = None

            if detector_name == "mediapipe_facelandmarker":
                try:
                    with _mp_lock:
                        mp, mp_vision = _try_import_mediapipe()
                        mp_image = mp.Image(
                            image_format=mp.ImageFormat.SRGB,
                            data=np.ascontiguousarray(rgb),
                        )
                        detection = self._landmarker.detect(mp_image)
                except Exception as exc:  # noqa: BLE001 - temporary failure path
                    result["warnings"].append(
                        "Temporary detector failure; falling back this frame."
                    )
                    result["warnings"].append(str(exc)[:160])
                    detection = None

                if detection is not None:
                    try:
                        transform_matrices = detection.facial_transformation_matrixes
                    except Exception:  # noqa: BLE001
                        transform_matrices = None

                    for lm_list in detection.face_landmarks:
                        xs = [p.x for p in lm_list]
                        ys = [p.y for p in lm_list]
                        x_min, x_max = min(xs), max(xs)
                        y_min, y_max = min(ys), max(ys)
                        faces.append({
                            "bbox_norm": {
                                "x_min": round(x_min, 4),
                                "y_min": round(y_min, 4),
                                "x_max": round(x_max, 4),
                                "y_max": round(y_max, 4),
                            },
                            "bbox_px": {
                                "x": int(round(x_min * width)),
                                "y": int(round(y_min * height)),
                                "width": int(round((x_max - x_min) * width)),
                                "height": int(round((y_max - y_min) * height)),
                            },
                        })
                        if len(faces) == 1:
                            landmarks_count = len(lm_list)
                            key_points = {}
                            for name, idx in KEY_LANDMARK_IDS.items():
                                if idx < len(lm_list):
                                    pt = lm_list[idx]
                                    key_points[name] = {
                                        "x": round(pt.x, 4),
                                        "y": round(pt.y, 4),
                                    }
            else:
                haar = self._ensure_haar()
                if haar is not None:
                    detections = haar.detectMultiScale(
                        gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80)
                    )
                    for (x, y, w, h) in detections:
                        faces.append({
                            "bbox_norm": {
                                "x_min": round(x / width, 4),
                                "y_min": round(y / height, 4),
                                "x_max": round((x + w) / width, 4),
                                "y_max": round((y + h) / height, 4),
                            },
                            "bbox_px": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
                        })

            for face in faces:
                bw = max(0.0001, face["bbox_norm"]["x_max"] - face["bbox_norm"]["x_min"])
                bh = max(0.0001, face["bbox_norm"]["y_max"] - face["bbox_norm"]["y_min"])
                face["area_ratio"] = round(min(1.0, bw * bh), 4)

            result["faces"] = faces
            result["face_count"] = len(faces)
            result["face_present"] = len(faces) >= 1
            result["landmarks_count"] = landmarks_count
            result["key_points"] = key_points

            if interview_id is not None and detection is not None and detection.face_landmarks:
                result["head_pose"] = compute_head_pose(
                    interview_id, detection.face_landmarks, transform_matrices
                )
                try:
                    result["_eye"] = _eye_metrics(detection.face_landmarks[0])
                except Exception:  # noqa: BLE001
                    result["_eye"] = None

            if (
                interview_id is not None
                and len(faces) == 1
                and detector_name == "mediapipe_facelandmarker"
            ):
                bbox = faces[0]["bbox_px"]
                mx = int(bbox["width"] * EMOTION_CROP_MARGIN)
                my = int(bbox["height"] * EMOTION_CROP_MARGIN)
                x0 = max(0, bbox["x"] - mx)
                y0 = max(0, bbox["y"] - my)
                x1 = min(width, bbox["x"] + bbox["width"] + mx)
                y1 = min(height, bbox["y"] + bbox["height"] + my)
                if x1 - x0 > 24 and y1 - y0 > 24:
                    crop = cv2.cvtColor(frame[y0:y1, x0:x1], cv2.COLOR_BGR2RGB)
                    _emotion_scheduler.submit(
                        interview_id, np.ascontiguousarray(crop)
                    )
                result["emotion"] = _emotion_scheduler.get_latest(interview_id)

            if len(faces) == 0:
                result["status"] = "no_face"
            elif len(faces) == 1:
                result["status"] = "face_detected"
            else:
                result["status"] = "multiple_faces"
                result["warnings"].append(
                    f"{len(faces)} faces detected in frame."
                )

            return result
        except Exception as exc:  # noqa: BLE001 - never raise to caller
            result["status"] = "processing_error"
            result["warnings"].append(str(exc)[:160])
            return result
        finally:
            result["analysis_ms"] = int((time.time() - started) * 1000)

    def _ensure_haar(self):
        if self._haar is None:
            try:
                haar_path = os.path.join(
                    cv2.data.haarcascades, "haarcascade_frontalface_default.xml"
                )
                self._haar = cv2.CascadeClassifier(haar_path)
            except Exception:  # noqa: BLE001
                return None
        return None if self._haar.empty() else self._haar


_engine = VisionEngine()


def get_engine() -> VisionEngine:
    return _engine


def warm_up():
    """Pre-download models / load detectors. Safe to call from a daemon thread."""
    try:
        name = _engine.initialize()
        print(f"  [vision] Detector ready: {name}")
    except Exception as exc:  # noqa: BLE001
        print(f"  [vision] Detector warm-up failed: {exc}")
    try:
        if _try_import_deepface():
            import numpy as _np
            tiny = _np.zeros((48, 48, 3), dtype=_np.uint8)
            _analyze_emotion(tiny)
            _emotion_scheduler.start()
            print(f"  [vision] Emotion model ready (DeepFace) - cadence "
                  f"{EMOTION_CONFIG['analysis_interval_s']}s")
        else:
            print("  [vision] DeepFace unavailable - emotion analysis disabled")
    except Exception as exc:  # noqa: BLE001
        print(f"  [vision] Emotion warm-up skipped: {exc}")


def _euler_from_matrix(matrix):
    """Decompose a 4x4 (or 3x3) transform into yaw/pitch/roll degrees."""
    R = [
        [matrix[0][0], matrix[0][1], matrix[0][2]],
        [matrix[1][0], matrix[1][1], matrix[1][2]],
        [matrix[2][0], matrix[2][1], matrix[2][2]],
    ]
    sy = math.sqrt(R[0][0] * R[0][0] + R[1][0] * R[1][0])
    if sy > 1e-6:
        x = math.degrees(math.atan2(R[2][1], R[2][2]))
        y = math.degrees(math.atan2(-R[2][0], sy))
        z = math.degrees(math.atan2(R[1][0], R[0][0]))
    else:
        x = math.degrees(math.atan2(-R[1][2], R[1][1]))
        y = math.degrees(math.atan2(-R[2][0], sy))
        z = 0.0
    return {"pitch": x, "yaw": y, "roll": z}


def _geometric_pose(lm_list):
    """
    Landmark-geometry orientation estimates with provable sign conventions.
      yaw_ratio : nose-tip horizontal offset between cheek landmarks 234/454;
                  positive => candidate turned toward their OWN LEFT
                  (image right).
      f_ratio   : forehead-to-chin vertical compression; deviations from the
                  session baseline give a sign-certain up/down signal.
      roll_deg  : inter-eye line angle; positive => image-right eye sits lower.
    """
    needed = (1, 10, 152, 33, 133, 263, 362, 234, 454)
    if len(lm_list) < max(needed) + 1:
        return None

    nose_x = lm_list[1].x
    cheek_lx = lm_list[234].x
    cheek_rx = lm_list[454].x
    face_w = cheek_rx - cheek_lx
    yaw_ratio = (nose_x - (cheek_lx + cheek_rx) / 2.0) / face_w if abs(face_w) > 1e-6 else 0.0

    fy = lm_list[10].y
    chy = lm_list[152].y
    eyes_mid_y = (
        lm_list[33].y + lm_list[133].y + lm_list[263].y + lm_list[362].y
    ) / 4.0
    denom = chy - eyes_mid_y
    f_ratio = ((eyes_mid_y - fy) / denom) if abs(denom) > 1e-6 else 0.0

    lx = (lm_list[33].x + lm_list[133].x) / 2.0
    ly = (lm_list[33].y + lm_list[133].y) / 2.0
    rx = (lm_list[263].x + lm_list[362].x) / 2.0
    ry = (lm_list[263].y + lm_list[362].y) / 2.0
    roll_deg = round(math.degrees(math.atan2(ry - ly, rx - lx)), 1)

    return {"yaw_ratio": yaw_ratio, "f_ratio": f_ratio, "roll_deg": roll_deg}


class PoseTracker:
    """
    Per-interview head-pose state.

    Primary numeric angles come from the MediaPipe facial-transformation
    matrix; its axis signs are auto-calibrated against the landmark-geometry
    signals using a sliding-window majority vote. Final convention:

        yaw   > 0 -> candidate facing their own LEFT
        pitch > 0 -> candidate looking UP
        roll  > 0 -> head tilted so the image-right eye sits lower
    """

    def __init__(self):
        self.f_baseline = None
        self.samples = deque(maxlen=POSE_CALIB_WINDOW)
        self.signs = {"yaw": 1.0, "pitch": 1.0, "roll": 1.0}

    def update_baseline(self, f_ratio):
        if self.f_baseline is None:
            self.f_baseline = f_ratio
        else:
            self.f_baseline += 0.25 * (f_ratio - self.f_baseline)

    def _recalibrate(self):
        for key in ("yaw", "pitch", "roll"):
            valid = [s[key] for s in self.samples if s[key] is not None]
            if len(valid) < 8:
                continue
            agree = sum(1 for v in valid if v)
            self.signs[key] = 1.0 if agree / float(len(valid)) >= 0.5 else -1.0

    def compute(self, lm_list, matrix):
        geo = _geometric_pose(lm_list)
        if geo is None:
            return None
        mat = _euler_from_matrix(matrix) if matrix is not None else None

        self.update_baseline(geo["f_ratio"])

        if mat is not None:
            yaw_geo_signed = geo["yaw_ratio"]
            up_geo = -(geo["f_ratio"] - self.f_baseline)
            entry = {
                "yaw": (mat["yaw"] > 0) == (yaw_geo_signed > 0),
                "pitch": (mat["pitch"] > 0) == (up_geo > 0),
                "roll": (mat["roll"] > 0) == (geo["roll_deg"] > 0),
            }
            if abs(yaw_geo_signed) > 0.02 or abs(up_geo) > 0.02 or abs(geo["roll_deg"]) > 8.0:
                self.samples.append(entry)
                self._recalibrate()

            yaw = self.signs["yaw"] * mat["yaw"]
            pitch = self.signs["pitch"] * mat["pitch"]
            roll = self.signs["roll"] * mat["roll"]
            source = "facial_transform"
        else:
            yaw = math.degrees(math.asin(max(-1.0, min(1.0, geo["yaw_ratio"] * 2.2))))
            up_dev = -(geo["f_ratio"] - self.f_baseline)
            pitch = math.degrees(math.asin(max(-1.0, min(1.0, up_dev * 6.0))))
            roll = geo["roll_deg"]
            source = "landmarks_geometry"

        return self._classify(yaw, pitch, roll, source)

    @staticmethod
    def _classify(yaw, pitch, roll, source):
        yaw = round(yaw, 1)
        pitch = round(pitch, 1)
        roll = round(roll, 1)

        components = []
        if abs(yaw) >= YAW_FORWARD_DEADZONE:
            components.append("Left" if yaw > 0 else "Right")
        if abs(pitch) >= PITCH_FORWARD_DEADZONE:
            components.append("Up" if pitch > 0 else "Down")
        if abs(roll) >= ROLL_TILT_DEADZONE:
            components.append("Tilted")

        primary = components[0] if components else "Forward"
        return {
            "yaw": yaw,
            "pitch": pitch,
            "roll": roll,
            "primary_label": primary,
            "components": components,
            "source": source,
        }


_pose_trackers_lock = threading.Lock()
_pose_trackers = {}


def _get_pose_tracker(interview_id: int) -> PoseTracker:
    with _pose_trackers_lock:
        tracker = _pose_trackers.get(interview_id)
        if tracker is None:
            tracker = PoseTracker()
            _pose_trackers[interview_id] = tracker
        return tracker


def clear_session_state(interview_id: int):
    with _accumulators_lock:
        _accumulators.pop(interview_id, None)
    with _pose_trackers_lock:
        _pose_trackers.pop(interview_id, None)
    with _gaze_trackers_lock:
        _gaze_trackers.pop(interview_id, None)
    _emotion_scheduler.clear_session(interview_id)


def compute_head_pose(interview_id: int, faces_landmarks, transformation_matrices):
    """Physical head orientation for the primary face only. Never raises."""
    if not faces_landmarks:
        return None
    matrix = None
    if transformation_matrices:
        try:
            matrix = transformation_matrices[0]
        except Exception:  # noqa: BLE001
            matrix = None
    try:
        return _get_pose_tracker(interview_id).compute(faces_landmarks[0], matrix)
    except Exception:  # noqa: BLE001 - pose must never break frame analysis
        return None


def _eye_metrics(lm_list):
    """
    Approximate gaze from iris position inside each eye aperture.

    h_ratio : iris horizontal offset from the eye-corner midpoint, normalized
              by eye width. Positive => irises shifted toward image right ==
              candidate gazing toward their OWN LEFT.
    v_ratio : iris vertical offset normalized by aperture height. Positive =>
              irises lower in the aperture == gazing DOWN.
    openness: mean aperture height/width (blink detector).
    Returns None when refined iris landmarks are unavailable (<478 points).
    """
    if len(lm_list) < 478:
        return None

    a_x = sum(lm_list[i].x for i in IRIS_GROUP_A) / len(IRIS_GROUP_A)
    b_x = sum(lm_list[i].x for i in IRIS_GROUP_B) / len(IRIS_GROUP_B)
    iris_for_image_left = IRIS_GROUP_A if a_x < b_x else IRIS_GROUP_B
    iris_for_image_right = IRIS_GROUP_B if a_x < b_x else IRIS_GROUP_A

    def _eye(corners, lids, iris_group):
        cx_mid = (lm_list[corners[0]].x + lm_list[corners[1]].x) / 2.0
        cy_mid = (lm_list[lids[0]].y + lm_list[lids[1]].y) / 2.0
        width = abs(lm_list[corners[0]].x - lm_list[corners[1]].x)
        height = abs(lm_list[lids[0]].y - lm_list[lids[1]].y)
        if width < 1e-6:
            return None
        iris_cx = sum(lm_list[i].x for i in iris_group) / len(iris_group)
        iris_cy = sum(lm_list[i].y for i in iris_group) / len(iris_group)
        return {
            "h": (iris_cx - cx_mid) / width,
            "v": (iris_cy - cy_mid) / max(height, 1e-6),
            "openness": min(0.6, height / width),
        }

    left = _eye(EYE_LEFT_CORNERS, EYE_LEFT_LIDS, iris_for_image_left)
    right = _eye(EYE_RIGHT_CORNERS, EYE_RIGHT_LIDS, iris_for_image_right)
    if not left or not right:
        return None

    return {
        "h_ratio": round((left["h"] + right["h"]) / 2.0, 4),
        "v_ratio": round((left["v"] + right["v"]) / 2.0, 4),
        "openness": round((left["openness"] + right["openness"]) / 2.0, 4),
    }


class GazeTracker:
    """
    Per-interview eye-contact state machine (physical states only):

      toward_camera | looking_left | looking_right | looking_up |
      looking_down  | unknown

    Decision order:
      1. no face / no landmark data                     -> unknown
      2. eyes closed                                    -> blink carry-over of
         the previous state for short gaps, else unknown
      3. head yaw/pitch beyond limits                   -> looking_* direction
      4. iris offset beyond thresholds                  -> looking_* direction
      5. otherwise                                      -> toward_camera
    """

    STATE_TOWARD_CAMERA = "toward_camera"
    STATE_LOOKING_LEFT = "looking_left"
    STATE_LOOKING_RIGHT = "looking_right"
    STATE_LOOKING_UP = "looking_up"
    STATE_LOOKING_DOWN = "looking_down"
    STATE_UNKNOWN = "unknown"

    def __init__(self):
        self.last_state = self.STATE_UNKNOWN
        self.last_state_ts = None

    def classify(self, face_present, eye, pose, now=None):
        now = now if now is not None else time.time()
        if not face_present or eye is None:
            return self._finish(self.STATE_UNKNOWN, now)

        if eye.get("openness", 0.3) < EAR_CLOSED_BELOW:
            short_gap = (
                self.last_state_ts is not None
                and self.last_state != self.STATE_UNKNOWN
                and (now - self.last_state_ts) <= BLINK_CARRYOVER_SECONDS
            )
            return self._finish(
                self.last_state if short_gap else self.STATE_UNKNOWN, now
            )

        yaw = pose.get("yaw") if pose else None
        pitch = pose.get("pitch") if pose else None
        h = eye.get("h_ratio", 0.0)
        v = eye.get("v_ratio", 0.0)

        if yaw is not None and yaw >= HEAD_YAW_GAZE_LIMIT:
            state = self.STATE_LOOKING_LEFT
        elif yaw is not None and yaw <= -HEAD_YAW_GAZE_LIMIT:
            state = self.STATE_LOOKING_RIGHT
        elif pitch is not None and pitch >= HEAD_PITCH_GAZE_LIMIT:
            state = self.STATE_LOOKING_UP
        elif pitch is not None and pitch <= -HEAD_PITCH_GAZE_LIMIT:
            state = self.STATE_LOOKING_DOWN
        elif h >= GAZE_H_AWAY_RATIO:
            state = self.STATE_LOOKING_LEFT
        elif h <= -GAZE_H_AWAY_RATIO:
            state = self.STATE_LOOKING_RIGHT
        elif v >= GAZE_V_AWAY_RATIO:
            state = self.STATE_LOOKING_DOWN
        elif v <= -GAZE_V_AWAY_RATIO:
            state = self.STATE_LOOKING_UP
        else:
            state = self.STATE_TOWARD_CAMERA

        return self._finish(state, now)

    def _finish(self, state, now):
        self.last_state = state
        self.last_state_ts = now
        return state


_gaze_trackers_lock = threading.Lock()
_gaze_trackers = {}


class EmotionScheduler:
    """
    Task 5 pipeline:  Webcam -> MediaPipe -> frame sampling -> every N
    seconds -> DeepFace -> emotion result.

    analyze() only *submits* the latest face crop; a single daemon thread
    owns the DeepFace cadence (EMOTION_CONFIG["analysis_interval_s"], 2s by
    default) so request latency never depends on emotion inference and the
    interview room can never update faster than the configured window.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._pending = {}
        self._results = {}
        self._thread = None
        self._stop_event = threading.Event()

    def start(self):
        with self._lock:
            if self._thread and self._thread.is_alive():
                return
            self._stop_event.clear()
            self._thread = threading.Thread(
                target=self._loop, name="emotion-scheduler", daemon=True
            )
            self._thread.start()

    def stop(self):
        self._stop_event.set()

    def submit(self, interview_id: int, crop):
        now = time.time()
        with self._lock:
            prev = self._pending.get(interview_id)
            if not prev or now - prev["ts"] >= EMOTION_CONFIG["analysis_interval_s"] / 2.0:
                self._pending[interview_id] = {"crop": crop, "ts": now}
        self.start()

    def get_latest(self, interview_id: int):
        now = time.time()
        with self._lock:
            entry = self._results.get(interview_id)
        if not entry:
            return None
        age = now - entry["ts"]
        if age > EMOTION_CONFIG["crop_max_age_s"] * 2.5:
            return None
        payload = dict(entry["emotion"])
        payload["probabilities"] = dict(payload.get("probabilities") or {})
        payload["analyzed_at"] = round(entry["ts"], 3)
        payload["age_s"] = round(age, 1)
        return payload

    def has_result(self, interview_id: int) -> bool:
        with self._lock:
            return interview_id in self._results

    def clear_session(self, interview_id: int):
        with self._lock:
            self._pending.pop(interview_id, None)
            self._results.pop(interview_id, None)

    def _loop(self):
        while not self._stop_event.wait(EMOTION_CONFIG["analysis_interval_s"]):
            try:
                self._process_once()
            except Exception:  # noqa: BLE001 - scheduler must never die
                continue

    def _process_once(self):
        now = time.time()
        with self._lock:
            batch = self._pending
            self._pending = {}
        for interview_id, item in batch.items():
            if now - item["ts"] > EMOTION_CONFIG["crop_max_age_s"]:
                continue
            result = _analyze_emotion(item["crop"])
            if result:
                with self._lock:
                    self._results[interview_id] = {"emotion": result, "ts": time.time()}


_emotion_scheduler = EmotionScheduler()


def get_emotion_scheduler() -> EmotionScheduler:
    return _emotion_scheduler


def _get_gaze_tracker(interview_id: int) -> GazeTracker:
    with _gaze_trackers_lock:
        t = _gaze_trackers.get(interview_id)
        if t is None:
            t = GazeTracker()
            _gaze_trackers[interview_id] = t
        return t


def compute_eye_state(interview_id: int, result: dict):
    """Physical eye-contact reading for an analyzed frame. Never raises."""
    try:
        tracker = _get_gaze_tracker(interview_id)
        face_present = result.get("status") in ("face_detected", "multiple_faces")
        return tracker.classify(face_present, result.get("_eye"), result.get("head_pose"))
    except Exception:  # noqa: BLE001
        return GazeTracker.STATE_UNKNOWN


class SessionAccumulator:
    def __init__(self):
        self.started_at = time.time()
        self.last_sample_at = None
        self.samples = deque(maxlen=MAX_ACCUMULATED_SAMPLES)
        self.total_frames = 0
        self.face_frames = 0
        self.no_face_frames = 0
        self.multi_face_frames = 0
        self.poor_lighting_frames = 0
        self.blurry_frames = 0
        self.error_frames = 0
        self.multi_face_events = 0
        self.no_face_events = 0
        self.poor_lighting_events = 0
        self._last_multi = False
        self._last_no_face = False
        self._last_poor_light = False
        self.brightness_sum = 0.0
        self.sharpness_sum = 0.0
        self.lighting_counts = {}
        self.orientation_counts = {}
        self.yaw_abs_sum = 0.0
        self.pitch_abs_sum = 0.0
        self.roll_abs_sum = 0.0
        self.pose_frames = 0
        self.eye_seconds = {}
        self.eye_state_frames = {}
        self._last_eye_ts = None
        self.emotion_frames = 0
        self.emotion_dominant_counts = {}
        self.emotion_prob_sums = {}
        self.head_travel_degrees = 0.0
        self._last_ypr = None
        self.emotion_switches = 0
        self._last_emotion_dominant = None
        self.current_away_streak_s = 0.0
        self.longest_away_streak_s = 0.0
        self.significant_break_count = 0
        self._break_flagged_this_episode = False

    def update(self, result: dict):
        self.last_sample_at = time.time()
        self.total_frames += 1
        status = result.get("status")

        if status == "face_detected":
            self.face_frames += 1
        elif status == "no_face":
            self.no_face_frames += 1
        elif status == "multiple_faces":
            self.multi_face_frames += 1
            self.face_frames += 1
        else:
            self.error_frames += 1

        multi = status == "multiple_faces"
        if multi and not self._last_multi:
            self.multi_face_events += 1
        self._last_multi = multi

        no_face = status == "no_face"
        if no_face and not self._last_no_face:
            self.no_face_events += 1
        self._last_no_face = no_face

        quality = result.get("quality") or {}
        lighting = quality.get("lighting_status", "unknown")
        poor = lighting in ("dark", "dim", "overexposed")
        if poor and not self._last_poor_light:
            self.poor_lighting_events += 1
        self._last_poor_light = poor
        if poor:
            self.poor_lighting_frames += 1
        self.lighting_counts[lighting] = self.lighting_counts.get(lighting, 0) + 1

        if quality.get("sharpness_status") == "blurry":
            self.blurry_frames += 1
        if isinstance(quality.get("brightness"), (int, float)):
            self.brightness_sum += quality["brightness"]
        if isinstance(quality.get("sharpness"), (int, float)):
            self.sharpness_sum += quality["sharpness"]

        pose = result.get("head_pose")
        if pose:
            self.pose_frames += 1
            label = pose.get("primary_label") or "Unknown"
            self.orientation_counts[label] = self.orientation_counts.get(label, 0) + 1
            self.yaw_abs_sum += abs(pose.get("yaw", 0.0) or 0.0)
            self.pitch_abs_sum += abs(pose.get("pitch", 0.0) or 0.0)
            self.roll_abs_sum += abs(pose.get("roll", 0.0) or 0.0)

        eye = result.get("eye_contact") or {}
        eye_state = eye.get("state") or GazeTracker.STATE_UNKNOWN
        if self._last_eye_ts is not None:
            dt = min(MAX_STATE_DT_SECONDS, max(0.0, self.last_sample_at - self._last_eye_ts))
        else:
            dt = 0.0
        self._last_eye_ts = self.last_sample_at
        self.eye_seconds[eye_state] = self.eye_seconds.get(eye_state, 0.0) + dt
        self.eye_state_frames[eye_state] = self.eye_state_frames.get(eye_state, 0) + 1

        emotion = result.get("emotion")
        if emotion and emotion.get("dominant"):
            self.emotion_frames += 1
            dom = emotion["dominant"]
            if self._last_emotion_dominant and dom != self._last_emotion_dominant:
                self.emotion_switches += 1
            self._last_emotion_dominant = dom
            self.emotion_dominant_counts[dom] = self.emotion_dominant_counts.get(dom, 0) + 1
            for cat, val in (emotion.get("probabilities") or {}).items():
                self.emotion_prob_sums[cat] = self.emotion_prob_sums.get(cat, 0.0) + float(val)

        pose = result.get("head_pose")
        yaw_val = pose.get("yaw") if pose else None
        pitch_val = pose.get("pitch") if pose else None
        if isinstance(yaw_val, (int, float)) and isinstance(pitch_val, (int, float)):
            cur_ypr = (float(yaw_val), float(pitch_val))
            if self._last_ypr is not None:
                delta = abs(cur_ypr[0] - self._last_ypr[0]) + abs(cur_ypr[1] - self._last_ypr[1])
                if delta < 90.0:
                    self.head_travel_degrees += delta
            self._last_ypr = cur_ypr

        if eye_state == GazeTracker.STATE_TOWARD_CAMERA:
            self.current_away_streak_s = 0.0
            self._break_flagged_this_episode = False
        else:
            self.current_away_streak_s += dt
            self.longest_away_streak_s = max(
                self.longest_away_streak_s, self.current_away_streak_s
            )
            if (
                self.current_away_streak_s >= ATTENTION_BREAK_SIGNIFICANT_S
                and not self._break_flagged_this_episode
                and eye_state != GazeTracker.STATE_UNKNOWN
            ):
                self._break_flagged_this_episode = True
                self.significant_break_count += 1

        sample = {
            "t": round(self.last_sample_at - self.started_at, 1),
            "status": status,
            "faces": result.get("face_count", 0),
            "light": lighting,
        }
        if pose:
            sample["orient"] = pose.get("primary_label")
            sample["ypr"] = [pose.get("yaw"), pose.get("pitch"), pose.get("roll")]
        sample["eye"] = eye_state.replace("toward_camera", "cam").replace("looking_", "").replace("unknown", "?")
        if emotion and emotion.get("dominant"):
            sample["emo"] = emotion["dominant"][:4]
        self.samples.append(sample)

    def summary(self) -> dict:
        return self._build_summary(list(self.samples)[-240:])

    def summary_full(self) -> dict:
        """Full-session summary with the complete sample timeline (persistence)."""
        return self._build_summary(list(self.samples))

    def _build_summary(self, timeline: list) -> dict:
        total = self.total_frames or 1
        dominant_lighting = "unknown"
        if self.lighting_counts:
            dominant_lighting = max(self.lighting_counts.items(), key=lambda kv: kv[1])[0]
        result = {
            "module": "m6_task1_face_detection",
            "frames_analyzed": self.total_frames,
            "face_detected_pct": round(self.face_frames / total * 100.0, 1),
            "no_face_pct": round(self.no_face_frames / total * 100.0, 1),
            "multiple_faces_pct": round(self.multi_face_frames / total * 100.0, 1),
            "poor_lighting_pct": round(self.poor_lighting_frames / total * 100.0, 1),
            "blurry_pct": round(self.blurry_frames / total * 100.0, 1),
            "error_frames": self.error_frames,
            "multi_face_events": self.multi_face_events,
            "no_face_events": self.no_face_events,
            "poor_lighting_events": self.poor_lighting_events,
            "significant_breaks": self.significant_break_count,
            "avg_brightness": round(self.brightness_sum / total, 1),
            "avg_sharpness": round(self.sharpness_sum / total, 1),
            "dominant_lighting": dominant_lighting,
            "dominant_status": (
                "face_detected"
                if self.face_frames >= self.no_face_frames
                else "no_face"
            ),
            "duration_seconds": round(
                (self.last_sample_at or self.started_at) - self.started_at, 1
            ),
            "orientation_counts": dict(self.orientation_counts),
            "pose_frames": self.pose_frames,
            "forward_pct": round(
                self.orientation_counts.get("Forward", 0)
                / (self.pose_frames or 1) * 100.0, 1
            ) if self.pose_frames else None,
            "avg_abs_yaw": round(self.yaw_abs_sum / self.pose_frames, 1) if self.pose_frames else None,
            "avg_abs_pitch": round(self.pitch_abs_sum / self.pose_frames, 1) if self.pose_frames else None,
            "avg_abs_roll": round(self.roll_abs_sum / self.pose_frames, 1) if self.pose_frames else None,
            "eye": _eye_summary_block(self.eye_seconds, self.eye_state_frames),
            "emotion": _emotion_summary_block(
                self.emotion_frames, self.emotion_dominant_counts, self.emotion_prob_sums
            ),
            "timeline": list(self.samples)[-240:],
        }
        result["confidence_indicator"] = _confidence_indicator_block(result)
        result["engagement"] = self._compute_engagement(result)
        return result

    def _compute_engagement(self, summary):
        """
        Task 7: Engagement Score - a separate composite measuring active
        participation. Facial activity counts expressive MOTION (head travel
        + expression transitions), never emotion valence: a neutral
        expression is not disengagement.
        """
        cfg = ENGAGEMENT_CONFIG
        weights = cfg["weights"]
        components = {}

        eye = summary.get("eye") or {}
        contact_s = eye.get("seconds_contact") or 0.0
        away_s = eye.get("seconds_away") or 0.0
        unknown_s = eye.get("seconds_unknown") or 0.0
        measured = contact_s + away_s + unknown_s

        if measured >= MIN_MEASURED_SECONDS:
            components["attention"] = round(
                (contact_s + 0.5 * unknown_s) / measured * 100.0, 1
            )
        else:
            components["attention"] = None

        components["eye_contact"] = eye.get("contact_pct")

        total_frames = summary.get("frames_analyzed") or 0
        if total_frames > 0:
            visible = (
                summary.get("face_detected_pct", 0.0)
                + summary.get("multiple_faces_pct", 0.0)
            )
            components["face_presence"] = round(min(100.0, visible), 1)
        else:
            components["face_presence"] = None

        components["head_orientation"] = summary.get("forward_pct")

        duration_s = summary.get("duration_seconds") or 0.0
        dur_min = duration_s / 60.0
        has_activity_signal = (
            self._last_ypr is not None or self.emotion_frames > 0
        )
        if dur_min >= 0.5 and has_activity_signal:
            travel_per_min = self.head_travel_degrees / dur_min
            switches_per_min = self.emotion_switches / max(dur_min, 0.5)
            activity_index = travel_per_min + 8.0 * switches_per_min
            scale = cfg["activity_full_scale_index"]
            components["facial_activity"] = round(
                min(100.0, activity_index / scale * 100.0), 1
            )
        else:
            components["facial_activity"] = None

        total_samples = len(summary.get("timeline") or [])
        if total_frames > 0:
            tracked = sum(
                v for k, v in self.eye_state_frames.items()
                if k != GazeTracker.STATE_UNKNOWN
            )
            tracked_frames = sum(self.eye_state_frames.values()) or 1
            continuity = min(100.0, tracked / tracked_frames * 100.0)
            penalty = min(
                cfg["streak_penalty_cap"],
                self.longest_away_streak_s * cfg["streak_penalty_per_s"],
            )
            continuity = max(0.0, continuity - penalty)
            components["interaction_continuity"] = round(continuity, 1)
        else:
            components["interaction_continuity"] = None

        used_weight = 0.0
        weighted_sum = 0.0
        present = []
        for name, value in components.items():
            if value is None:
                continue
            w = weights.get(name, 0.0)
            weighted_sum += value * w
            used_weight += w
            present.append(name)

        score = None
        if len(present) >= cfg["min_components_for_score"] and used_weight > 0:
            score = round(weighted_sum / used_weight, 1)

        return {
            "score": score,
            "level": _engagement_level(score),
            "components": components,
            "activity_detail": {
                "head_travel_degrees": round(self.head_travel_degrees, 1),
                "expression_transitions": self.emotion_switches,
                "longest_away_streak_s": round(self.longest_away_streak_s, 1),
                "duration_seconds": round(duration_s, 1),
            },
            "weights_used": {k: weights[k] for k in present},
            "method": "transparent_behavioral_v1",
            "note": "Participation composite from attention, presence, orientation and motion signals; independent of which emotion is shown.",
        }


def _emotion_summary_block(frames, dominant_counts, prob_sums):
    if not frames:
        return None
    distribution = {
        k: round(v / frames * 100.0, 1) for k, v in sorted(
            dominant_counts.items(), key=lambda kv: -kv[1]
        )
    }
    return {
        "frames_analyzed": frames,
        "dominant_distribution": distribution,
        "avg_probabilities": {
            k: round(v / frames, 1) for k, v in sorted(
                prob_sums.items(), key=lambda kv: -kv[1]
            )
        },
        "session_dominant": next(iter(distribution)) if distribution else None,
    }


def _std_dev(values):
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    var = sum((v - mean) ** 2 for v in values) / len(values)
    return math.sqrt(var)


def _confidence_band(score):
    if score is None:
        return None
    if score >= 75:
        return "Strong"
    if score >= 55:
        return "Moderate"
    return "Developing"


def _head_stability_score(timeline):
    """
    Task 2 signal: steadiness of head pose over the session.
    Penalizes yaw/pitch variance (restless motion); roll ignored (tilt is
    not instability). 100 = rock steady, lower = increasingly restless.
    """
    yaws, pitches = [], []
    for sample in timeline:
        ypr = sample.get("ypr")
        if ypr and all(isinstance(v, (int, float)) for v in ypr[:2]):
            yaws.append(float(ypr[0]))
            pitches.append(float(ypr[1]))
    if len(yaws) < CONFIDENCE_CONFIG["min_pose_samples"]:
        return None
    penalty = 2.2 * (_std_dev(yaws) + _std_dev(pitches))
    return round(max(0.0, min(100.0, 100.0 - penalty)), 1)


def _confidence_indicator_block(summary):
    """
    Task 6: Confidence Indicator - a transparent behavioral composite.

        Eye Contact + Head Stability + Face Visibility + Attention
        + Expression Stability   (equal weights by default)

    Each component is a plain 0-100 score from already-measured signals;
    components without enough data are excluded and the remaining weights
    are renormalized. This is an indicator of observable behavior only -
    it never claims to measure internal confidence.
    """
    eye = summary.get("eye") or {}
    emotion = summary.get("emotion") or {}

    components = {}
    components["eye_contact"] = eye.get("contact_pct")

    total_frames = summary.get("frames_analyzed") or 0
    if total_frames > 0:
        visible = (
            summary.get("face_detected_pct", 0.0)
            + summary.get("multiple_faces_pct", 0.0)
        )
        components["face_visibility"] = round(min(100.0, visible), 1)
    else:
        components["face_visibility"] = None

    components["head_stability"] = _head_stability_score(
        summary.get("timeline") or []
    )

    contact_s = eye.get("seconds_contact") or 0.0
    away_s = eye.get("seconds_away") or 0.0
    unknown_s = eye.get("seconds_unknown") or 0.0
    measured = contact_s + away_s + unknown_s
    if measured >= MIN_MEASURED_SECONDS:
        components["attention"] = round(
            (contact_s + 0.5 * unknown_s) / measured * 100.0, 1
        )
    else:
        components["attention"] = None

    distribution = emotion.get("dominant_distribution") or {}
    if distribution:
        components["expression_stability"] = round(max(distribution.values()), 1)
    else:
        components["expression_stability"] = None

    weights = CONFIDENCE_CONFIG["weights"]
    used_weight = 0.0
    weighted_sum = 0.0
    present = []
    for name, value in components.items():
        if value is None:
            continue
        w = weights.get(name, 0.0)
        weighted_sum += value * w
        used_weight += w
        present.append(name)

    overall = None
    if (
        len(present) >= CONFIDENCE_CONFIG["min_components_for_overall"]
        and used_weight > 0
    ):
        overall = round(weighted_sum / used_weight, 1)

    if overall is None:
        band = None
    else:
        band = _confidence_band(overall)

    return {
        "score": overall,
        "band": band,
        "components": components,
        "weights_used": {k: weights[k] for k in present},
        "method": "transparent_behavioral_v1",
        "note": "Behavioral indicator from measurable signals; not a claim about actual confidence.",
    }


def focus_label_for(contact_pct):
    """Subtle quality bucket shown to candidates. Never exposes raw numbers live."""
    if contact_pct is None:
        return "No Data"
    if contact_pct >= 70.0:
        return "Good"
    if contact_pct >= 50.0:
        return "Fair"
    return "Low"


def _eye_summary_block(eye_seconds, eye_state_frames):
    contact = eye_seconds.get(GazeTracker.STATE_TOWARD_CAMERA, 0.0)
    unknown = eye_seconds.get(GazeTracker.STATE_UNKNOWN, 0.0)
    away = sum(v for k, v in eye_seconds.items() if k not in (
        GazeTracker.STATE_TOWARD_CAMERA, GazeTracker.STATE_UNKNOWN))
    measured = contact + away
    contact_pct = (
        round(contact / measured * 100.0, 1) if measured >= MIN_MEASURED_SECONDS else None
    )
    total = sum(eye_seconds.values())
    return {
        "contact_pct": contact_pct,
        "focus_label": focus_label_for(contact_pct),
        "seconds_contact": round(contact, 1),
        "seconds_away": round(away, 1),
        "seconds_unknown": round(unknown, 1),
        "measured_seconds": round(measured, 1),
        "coverage_pct": round((total - unknown) / total * 100.0, 1) if total > 0 else None,
        "state_frames": {k: v for k, v in sorted(eye_state_frames.items())},
    }


_accumulators_lock = threading.Lock()
_accumulators = {}


def record_frame(interview_id: int, result: dict) -> dict:
    state = compute_eye_state(interview_id, result)
    eye = result.pop("_eye", None)
    result["eye_contact"] = {
        "state": state,
        "gaze_h": eye.get("h_ratio") if eye else None,
        "gaze_v": eye.get("v_ratio") if eye else None,
        "openness": eye.get("openness") if eye else None,
    }
    with _accumulators_lock:
        acc = _accumulators.get(interview_id)
        if acc is None:
            acc = SessionAccumulator()
            _accumulators[interview_id] = acc
        acc.update(result)
        return acc.summary()


def get_summary(interview_id: int):
    with _accumulators_lock:
        acc = _accumulators.get(interview_id)
        return acc.summary() if acc else None


def collect_and_clear_session(interview_id: int, full_timeline: bool = False):
    with _accumulators_lock:
        acc = _accumulators.pop(interview_id, None)
    clear_session_state(interview_id)
    if acc is None:
        return None
    return acc.summary_full() if full_timeline else acc.summary()


def decode_data_url(image_data: str):
    """Accepts raw base64 or a data URL; returns decoded bytes or None."""
    if not image_data:
        return None
    payload = image_data.strip()
    if payload.startswith("data:"):
        idx = payload.find(",")
        if idx != -1:
            payload = payload[idx + 1:]
    try:
        return base64.b64decode(payload, validate=False)
    except Exception:  # noqa: BLE001
        return None


def compact_client_payload(result: dict, session_summary: dict) -> dict:
    return {
        "status": result["status"],
        "face_present": result["face_present"],
        "face_count": result["face_count"],
        "faces": [
            {"bbox_norm": f["bbox_norm"], "area_ratio": f.get("area_ratio")}
            for f in result["faces"]
        ],
        "landmarks_count": result["landmarks_count"],
        "key_points": result["key_points"],
        "quality": result["quality"],
        "head_pose": result.get("head_pose"),
        "eye_contact": result.get("eye_contact"),
        "emotion": result.get("emotion"),
        "warnings": result["warnings"],
        "detector": result["detector"],
        "analysis_ms": result["analysis_ms"],
        "summary": {
            k: v for k, v in session_summary.items() if k != "timeline"
        } if session_summary else None,
    }


def serialize_for_db(summary: dict):
    if not summary:
        return None
    try:
        return json.dumps(summary)
    except Exception:  # noqa: BLE001
        return None
