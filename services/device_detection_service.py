"""
Device Detection Service Module
Real-time Computer Vision Electronic Device Detection & Anti-Cheating Monitoring Engine.
Powered by YOLOv5n ONNX DNN, temporal confirmation filtering, bounding box tracking,
and persistent JSON event telemetry storage.
"""

import os
import time
import json
import uuid
import datetime
import threading
from typing import Dict, Any, Optional, List, Tuple

import cv2
import numpy as np

from backend.config import settings
from backend.models.detection_models import (
    BoundingBox,
    DetectedObject,
    DeviceDetectionEvent,
    DeviceDetectionSummary,
    FrameDeviceDetectionResult,
)

# Standard COCO 80 Class Names
COCO_CLASSES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
    "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
]

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STORAGE_DIR = os.path.join(BASE_DIR, "storage", "detection_events")
os.makedirs(STORAGE_DIR, exist_ok=True)


class DeviceDetector:
    """
    High-Performance Real-Time Object Detection Engine utilizing YOLOv5n ONNX.
    Detects prohibited electronic devices in camera video frames and tracks bounding boxes.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or os.path.join(BASE_DIR, settings.DEVICE_MODEL_PATH)
        self.net = None
        self.model_loaded = False
        self.input_size = (640, 640)
        self.lock = threading.Lock()
        self._init_model()

    def _init_model(self):
        """Initializes OpenCV DNN with YOLOv5n ONNX weights."""
        if os.path.exists(self.model_path):
            try:
                self.net = cv2.dnn.readNet(self.model_path)
                try:
                    self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                except Exception:
                    pass
                self.model_loaded = True
                print(f"[DeviceDetector] YOLOv5n ONNX model loaded successfully from {self.model_path}")
            except Exception as e:
                print(f"[DeviceDetector] Warning: Could not initialize YOLOv5n model: {e}")
                self.net = None
                self.model_loaded = False
        else:
            print(f"[DeviceDetector] Model file not found at: {self.model_path}")
            self.net = None
            self.model_loaded = False

    def decode_image_base64_or_bytes(self, image_data: Any) -> Optional[np.ndarray]:
        """Decodes base64 string or raw bytes into an OpenCV BGR numpy array."""
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
        except Exception as e:
            print(f"[DeviceDetector] Image decode error: {e}")
            return None

    def detect_objects(
        self,
        frame: np.ndarray,
        conf_threshold: Optional[float] = None,
        iou_threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes real YOLOv5n ONNX inference on the input frame.
        Identifies prohibited electronic devices and ignores benign candidate presence.
        Returns detected objects with bounding boxes and confidence scores.
        """
        if not self.model_loaded or self.net is None:
            return []

        conf_thresh = conf_threshold if conf_threshold is not None else settings.DEVICE_CONFIDENCE_THRESHOLD
        iou_thresh = iou_threshold if iou_threshold is not None else settings.DEVICE_IOU_THRESHOLD

        h_orig, w_orig = frame.shape[:2]
        if h_orig == 0 or w_orig == 0:
            return []

        # 1. Preprocess: Create 640x640 blob with RGB channel swap and scaling
        blob = cv2.dnn.blobFromImage(
            frame,
            scalefactor=1.0 / 255.0,
            size=self.input_size,
            swapRB=True,
            crop=False
        )

        with self.lock:
            try:
                self.net.setInput(blob)
                outputs = self.net.forward()
            except Exception as e:
                print(f"[DeviceDetector] Inference forward pass error: {e}")
                return []

        # 2. Parse YOLOv5 predictions: shape is (1, 25200, 85)
        if len(outputs.shape) == 3:
            predictions = outputs[0]
        else:
            predictions = outputs

        boxes = []
        confidences = []
        class_ids = []

        # YOLOv5 output row: [x_center, y_center, w, h, obj_conf, class0_prob, ..., class79_prob]
        for row in predictions:
            obj_conf = float(row[4])
            if obj_conf < 0.15:
                continue

            classes_scores = row[5:]
            class_id = int(np.argmax(classes_scores))
            class_score = float(classes_scores[class_id])
            total_score = obj_conf * class_score

            if total_score < conf_thresh:
                continue

            if class_id >= len(COCO_CLASSES):
                continue

            raw_class_name = COCO_CLASSES[class_id]

            # STRICT ANTI-CHEAT RULE: Person is NEVER treated as a prohibited object
            if raw_class_name == "person":
                continue

            # Check if this class is among the prohibited electronic devices
            if raw_class_name not in settings.PROHIBITED_OBJECTS:
                continue

            # Normalized coordinate parsing from 640x640 model space to original frame space
            cx = float(row[0]) / self.input_size[0]
            cy = float(row[1]) / self.input_size[1]
            w_box = float(row[2]) / self.input_size[0]
            h_box = float(row[3]) / self.input_size[1]

            left = max(0.0, cx - (w_box / 2.0))
            top = max(0.0, cy - (h_box / 2.0))
            w_norm = min(1.0 - left, max(0.01, w_box))
            h_norm = min(1.0 - top, max(0.01, h_box))

            # Scaled pixel coordinates for NMS
            px_left = int(left * w_orig)
            px_top = int(top * h_orig)
            px_w = int(w_norm * w_orig)
            px_h = int(h_norm * h_orig)

            boxes.append([px_left, px_top, px_w, px_h])
            confidences.append(float(total_score))
            class_ids.append(class_id)

        if not boxes:
            return []

        # 3. Apply Non-Maximum Suppression (NMS)
        indices = cv2.dnn.NMSBoxes(boxes, confidences, conf_thresh, iou_thresh)
        if indices is None or len(indices) == 0:
            return []

        # Robust index flattening for all OpenCV versions (numpy array, list of tuples, list of ints)
        if isinstance(indices, np.ndarray):
            flat_indices = indices.flatten().tolist()
        elif isinstance(indices, (tuple, list)):
            flat_indices = [i[0] if isinstance(i, (tuple, list, np.ndarray)) else i for i in indices]
        else:
            flat_indices = list(indices)

        detected_objects: List[Dict[str, Any]] = []
        now_iso = datetime.datetime.now().isoformat()

        for idx in flat_indices:
            if not isinstance(idx, int):
                try:
                    idx = int(idx)
                except Exception:
                    continue
            if idx < 0 or idx >= len(boxes):
                continue

            px_box = boxes[idx]
            conf = round(confidences[idx], 3)
            cid = class_ids[idx]
            raw_class = COCO_CLASSES[cid]
            human_label = settings.DEVICE_LABELS_MAP.get(raw_class, raw_class.title())

            # Convert back to normalized bounding box
            norm_x = round(float(px_box[0]) / float(w_orig), 4)
            norm_y = round(float(px_box[1]) / float(h_orig), 4)
            norm_w = round(float(px_box[2]) / float(w_orig), 4)
            norm_h = round(float(px_box[3]) / float(h_orig), 4)

            # Clamp coordinates cleanly within [0.0, 1.0]
            norm_x = max(0.0, min(0.99, norm_x))
            norm_y = max(0.0, min(0.99, norm_y))
            norm_w = max(0.01, min(1.0 - norm_x, norm_w))
            norm_h = max(0.01, min(1.0 - norm_y, norm_h))

            detected_objects.append({
                "object_name": human_label,
                "raw_class": raw_class,
                "confidence": conf,
                "box": {
                    "x": norm_x,
                    "y": norm_y,
                    "width": norm_w,
                    "height": norm_h
                },
                "timestamp": now_iso
            })

        return detected_objects

    def get_status(self) -> Dict[str, Any]:
        """Returns the current model initialization and configuration status."""
        return {
            "model_name": "YOLOv5n ONNX Real-Time Object Detection",
            "model_path": self.model_path,
            "is_loaded": self.model_loaded,
            "status": "Operational" if self.model_loaded else "Model Unavailable",
            "confidence_threshold": settings.DEVICE_CONFIDENCE_THRESHOLD,
            "iou_threshold": settings.DEVICE_IOU_THRESHOLD,
            "confirmation_frames": settings.REQUIRED_CONFIRMATION_FRAMES,
            "clear_delay_seconds": settings.ALERT_CLEAR_DELAY_SECONDS,
            "prohibited_classes": settings.PROHIBITED_OBJECTS,
            "supported_device_mappings": settings.DEVICE_LABELS_MAP,
            "device_backend": "OpenCV DNN (CPU/Optimized)"
        }


class SessionDetectionTracker:
    """
    Session-level real-time anti-cheating tracking filter.
    Implements temporal confirmation to prevent false one-frame spikes,
    disappearance tolerance to avoid alert flickering, event logging, and duration tracking.
    """

    def __init__(self, session_id: str, candidate_id: Optional[str] = None, interview_id: Optional[str] = None):
        self.session_id = session_id
        self.candidate_id = candidate_id
        self.interview_id = interview_id
        self.created_at = datetime.datetime.now().isoformat()
        self.is_active = True

        # Temporal confirmation state
        self.consecutive_detection_count = 0
        self.last_detection_timestamp = 0.0
        self.last_active_devices: List[Dict[str, Any]] = []
        self.alert_state = "NORMAL"  # NORMAL, WARNING, ALERT
        self.alert_active = False
        self.current_alert_start_time: Optional[float] = None
        self.total_detection_duration_seconds = 0.0

        # Authentic session event history
        self.events: List[Dict[str, Any]] = []
        self.total_alerts_count = 0
        self.detected_device_counts: Dict[str, int] = {}
        self.first_detection_iso: Optional[str] = None
        self.last_detection_iso: Optional[str] = None

        self.storage_file = os.path.join(STORAGE_DIR, f"{session_id}.json")
        self.lock = threading.Lock()
        self._load_existing_storage()

    def _load_existing_storage(self):
        """Loads previous session detection events from JSON storage if present."""
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.events = data.get("events", [])
                    self.total_alerts_count = data.get("total_alerts", len(self.events))
                    self.detected_device_counts = data.get("detected_device_counts", {})
                    self.first_detection_iso = data.get("first_detection_timestamp")
                    self.last_detection_iso = data.get("last_detection_timestamp")
                    self.total_detection_duration_seconds = data.get("total_detection_duration_seconds", 0.0)
                    if data.get("candidate_id") and not self.candidate_id:
                        self.candidate_id = data.get("candidate_id")
                    if data.get("interview_id") and not self.interview_id:
                        self.interview_id = data.get("interview_id")
                    if data.get("created_at"):
                        self.created_at = data.get("created_at")
            except Exception as e:
                print(f"[SessionDetectionTracker] Could not load existing storage for {self.session_id}: {e}")

    def _save_to_storage(self):
        """Persists detection events and session summary safely to JSON file."""
        summary = self.generate_summary_dict()
        try:
            with open(self.storage_file, "w", encoding="utf-8") as f:
                json.dump(summary, f, indent=2)
        except Exception as e:
            print(f"[SessionDetectionTracker] Storage write error for {self.session_id}: {e}")

    def update_frame_detections(self, raw_detections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Ingests frame detections, applies temporal confirmation rules,
        updates alert states, logs confirmed events, and returns live HUD telemetry.
        """
        now = time.time()
        now_iso = datetime.datetime.now().isoformat()

        with self.lock:
            has_devices = len(raw_detections) > 0

            if has_devices:
                self.consecutive_detection_count += 1
                self.last_detection_timestamp = now
                self.last_active_devices = raw_detections

                if self.consecutive_detection_count >= settings.REQUIRED_CONFIRMATION_FRAMES:
                    # CONFIRMED ALERT STATE (🔴)
                    self.alert_state = "ALERT"
                    
                    if not self.alert_active:
                        self.alert_active = True
                        self.current_alert_start_time = now
                        self.total_alerts_count += 1

                        if not self.first_detection_iso:
                            self.first_detection_iso = now_iso
                        self.last_detection_iso = now_iso

                        # Log real detection events for each detected object
                        for obj in raw_detections:
                            dev_name = obj["object_name"]
                            self.detected_device_counts[dev_name] = self.detected_device_counts.get(dev_name, 0) + 1

                            event_record = {
                                "event_id": f"dev_evt_{uuid.uuid4().hex[:10]}",
                                "event_type": "PROHIBITED_DEVICE_DETECTED",
                                "session_id": self.session_id,
                                "interview_id": self.interview_id,
                                "candidate_id": self.candidate_id,
                                "detected_object": dev_name,
                                "raw_class": obj["raw_class"],
                                "confidence": obj["confidence"],
                                "timestamp": now_iso,
                                "duration_seconds": 0.0,
                                "bounding_box": obj["box"],
                                "status": "confirmed"
                            }
                            self.events.append(event_record)

                        self._save_to_storage()
                    else:
                        # Existing active alert continues
                        self.last_detection_iso = now_iso

                    # Build Alert Message
                    if len(raw_detections) == 1:
                        d = raw_detections[0]
                        conf_pct = int(round(d['confidence'] * 100))
                        msg = f"🔴 {d['object_name']} Detected ({conf_pct}%)"
                    else:
                        items = [f"{d['object_name']} ({int(round(d['confidence']*100))}%)" for d in raw_detections]
                        msg = f"🔴 Prohibited Devices Detected: {', '.join(items)}"

                    return {
                        "status": "active",
                        "alert_state": "ALERT",
                        "confirmed_alert": True,
                        "alert_badge": "ALERT",
                        "alert_message": msg,
                        "detected_devices": raw_detections,
                        "total_session_alerts": self.total_alerts_count,
                        "model_name": "yolov5n",
                        "disclaimer": "Real-time CV object detection for anti-cheating integrity monitoring."
                    }
                else:
                    # WARNING STATE (🟡) - Potential detection being confirmed
                    self.alert_state = "WARNING"
                    return {
                        "status": "active",
                        "alert_state": "WARNING",
                        "confirmed_alert": False,
                        "alert_badge": "WARNING",
                        "alert_message": "🟡 Checking Possible Device...",
                        "detected_devices": raw_detections,
                        "total_session_alerts": self.total_alerts_count,
                        "model_name": "yolov5n",
                        "disclaimer": "Real-time CV object detection for anti-cheating integrity monitoring."
                    }
            else:
                # No prohibited device in this frame
                time_since_last = now - self.last_detection_timestamp

                # Disappearance tolerance: keep alert active for ALERT_CLEAR_DELAY_SECONDS to avoid flickering
                if self.alert_active and time_since_last < settings.ALERT_CLEAR_DELAY_SECONDS:
                    return {
                        "status": "active",
                        "alert_state": "ALERT",
                        "confirmed_alert": True,
                        "alert_badge": "ALERT",
                        "alert_message": "🔴 Prohibited Device Detected",
                        "detected_devices": self.last_active_devices,
                        "total_session_alerts": self.total_alerts_count,
                        "model_name": "yolov5n",
                        "disclaimer": "Real-time CV object detection for anti-cheating integrity monitoring."
                    }

                # Clear Alert
                if self.alert_active:
                    self.alert_active = False
                    if self.current_alert_start_time:
                        duration = now - self.current_alert_start_time
                        self.total_detection_duration_seconds += round(duration, 2)
                        self.current_alert_start_time = None
                        self._save_to_storage()

                self.consecutive_detection_count = 0
                self.last_active_devices = []
                self.alert_state = "NORMAL"

                return {
                    "status": "active",
                    "alert_state": "NORMAL",
                    "confirmed_alert": False,
                    "alert_badge": "NORMAL",
                    "alert_message": "🟢 Monitoring Active",
                    "detected_devices": [],
                    "total_session_alerts": self.total_alerts_count,
                    "model_name": "yolov5n",
                    "disclaimer": "Real-time CV object detection for anti-cheating integrity monitoring."
                }

    def stop_session(self):
        """Finalizes detection session tracking and persists final summary."""
        with self.lock:
            self.is_active = False
            if self.alert_active and self.current_alert_start_time:
                duration = time.time() - self.current_alert_start_time
                self.total_detection_duration_seconds += round(duration, 2)
                self.alert_active = False
                self.current_alert_start_time = None
            self._save_to_storage()

    def generate_summary_dict(self) -> Dict[str, Any]:
        """Generates authentic summary dictionary computed strictly from actual detection events."""
        if self.total_alerts_count > 0:
            integrity_status = f"Flagged - {self.total_alerts_count} Prohibited Device Alert(s)"
        else:
            integrity_status = "Clean - No Prohibited Devices Detected"

        return {
            "session_id": self.session_id,
            "interview_id": self.interview_id,
            "candidate_id": self.candidate_id,
            "total_alerts": self.total_alerts_count,
            "detected_device_counts": self.detected_device_counts,
            "first_detection_timestamp": self.first_detection_iso,
            "last_detection_timestamp": self.last_detection_iso,
            "total_detection_duration_seconds": round(self.total_detection_duration_seconds, 2),
            "integrity_status": integrity_status,
            "events": self.events,
            "created_at": self.created_at,
            "updated_at": datetime.datetime.now().isoformat()
        }


class DeviceDetectionManager:
    """Global manager for active session trackers and the YOLOv5n detector singleton."""

    def __init__(self):
        self.detector = DeviceDetector()
        self.sessions: Dict[str, SessionDetectionTracker] = {}
        self.lock = threading.Lock()

    def get_or_create_session(
        self,
        session_id: str,
        candidate_id: Optional[str] = None,
        interview_id: Optional[str] = None
    ) -> SessionDetectionTracker:
        with self.lock:
            if session_id not in self.sessions:
                self.sessions[session_id] = SessionDetectionTracker(
                    session_id=session_id,
                    candidate_id=candidate_id,
                    interview_id=interview_id
                )
            return self.sessions[session_id]

    def get_session(self, session_id: str) -> Optional[SessionDetectionTracker]:
        with self.lock:
            tracker = self.sessions.get(session_id)
            if tracker is None:
                # Check if JSON storage file exists for this session
                storage_file = os.path.join(STORAGE_DIR, f"{session_id}.json")
                if os.path.exists(storage_file):
                    tracker = SessionDetectionTracker(session_id=session_id)
                    self.sessions[session_id] = tracker
            return tracker

    def get_all_sessions(self) -> Dict[str, SessionDetectionTracker]:
        """Loads and returns all active and stored session trackers from disk."""
        with self.lock:
            # Scan storage directory for any persisted sessions not yet in memory
            if os.path.exists(STORAGE_DIR):
                for fname in os.listdir(STORAGE_DIR):
                    if fname.endswith(".json") and not fname.startswith("test_") and not fname.startswith("scen_"):
                        sid = fname[:-5]
                        if sid not in self.sessions:
                            try:
                                self.sessions[sid] = SessionDetectionTracker(session_id=sid)
                            except Exception as e:
                                print(f"[DeviceDetectionManager] Error loading session {sid}: {e}")
            return dict(self.sessions)

    def remove_session(self, session_id: str):
        with self.lock:
            if session_id in self.sessions:
                self.sessions[session_id].stop_session()
                del self.sessions[session_id]

    def analyze_frame_for_session(
        self,
        session_id: str,
        image_data: Any,
        candidate_id: Optional[str] = None,
        interview_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """High-level pipeline: decodes image, runs YOLOv5n, and updates session temporal filter."""
        # Auto-resolve candidate_id / interview_id from database if available
        if not candidate_id or not interview_id:
            try:
                from backend.database import db
                int_obj = db.interviews.get(session_id)
                if int_obj:
                    candidate_id = candidate_id or int_obj.get("user_id")
                    interview_id = interview_id or int_obj.get("id") or session_id
            except Exception:
                pass

        tracker = self.get_or_create_session(session_id, candidate_id, interview_id)
        if candidate_id and not tracker.candidate_id:
            tracker.candidate_id = candidate_id
        if interview_id and not tracker.interview_id:
            tracker.interview_id = interview_id

        frame = self.detector.decode_image_base64_or_bytes(image_data)

        if frame is None:
            return {
                "status": "error",
                "alert_state": "NORMAL",
                "confirmed_alert": False,
                "alert_badge": "NORMAL",
                "alert_message": "Device monitoring temporarily unavailable",
                "detected_devices": [],
                "total_session_alerts": tracker.total_alerts_count,
                "error": "Failed to decode frame image"
            }

        # Run real YOLOv5n inference
        raw_detections = self.detector.detect_objects(frame)
        result = tracker.update_frame_detections(raw_detections)
        return result


# Global Singleton Manager
device_detection_manager = DeviceDetectionManager()
