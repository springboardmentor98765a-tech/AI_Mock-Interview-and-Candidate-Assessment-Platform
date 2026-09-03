import os
try:
    import cv2
except ImportError:
    cv2 = None
import logging
import numpy as np
from pathlib import Path
from PIL import Image

try:
    import torch
    import torchvision
    from torchvision import transforms
    from ultralytics import YOLO
    from ml_models.train_confidence import ConfidenceCNN
    from ml_models.train_emotion import EmotionCNN
except ImportError:
    torch = None
    torchvision = None
    transforms = None
    YOLO = None
    ConfidenceCNN = None
    EmotionCNN = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("vision_service")

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "ml_models"

CONFIDENCE_MODEL_PATH = MODEL_DIR / "confidence_model.pth"
EMOTION_MODEL_PATH = MODEL_DIR / "emotion_model.pth"
HAAR_CASCADE_PATH = MODEL_DIR / "haarcascade_frontalface_default.xml"


class VisionService:
    def __init__(self):
        logger.info(f"[MODULE 6] Python executable: {os.sys.executable}")
        logger.info(f"[MODULE 6] BASE_DIR: {BASE_DIR}")
        logger.info(f"[MODULE 6] MODEL_DIR: {MODEL_DIR}")
        logger.info(f"[MODULE 6] Confidence path: {CONFIDENCE_MODEL_PATH}")
        logger.info(f"[MODULE 6] Emotion path: {EMOTION_MODEL_PATH}")

        if torch:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = "cpu"
        logger.info(f"[MODULE 6] Compute device selected: {self.device}")

        self.confidence_model_loaded = False
        self.emotion_model_loaded = False
        self.yolo_model_loaded = False
        self.mediapipe_available = False
        self.face_detector_available = False
        self.face_detection_available = False

        # 1. Load Confidence Model
        try:
            self.confidence_model = ConfidenceCNN(num_classes=2).to(self.device)
            if CONFIDENCE_MODEL_PATH.exists():
                logger.info(f"[MODULE 6] Loading confidence model state_dict from {CONFIDENCE_MODEL_PATH}...")
                state_dict = torch.load(CONFIDENCE_MODEL_PATH, map_location=self.device)
                if isinstance(state_dict, dict) and "model_state_dict" in state_dict:
                    state_dict = state_dict["model_state_dict"]
                self.confidence_model.load_state_dict(state_dict)
                self.confidence_model.eval()
                self.confidence_model_loaded = True
                logger.info("[MODULE 6] Confidence model loaded successfully.")
            else:
                logger.warning(f"[MODULE 6] Confidence model file not found at {CONFIDENCE_MODEL_PATH}.")
        except Exception:
            logger.exception("[MODULE 6] Failed loading confidence model")
            self.confidence_model_loaded = False

        # 2. Load Emotion Model
        try:
            self.emotion_model = EmotionCNN(num_classes=7).to(self.device)
            if EMOTION_MODEL_PATH.exists():
                logger.info(f"[MODULE 6] Loading emotion model state_dict from {EMOTION_MODEL_PATH}...")
                state_dict = torch.load(EMOTION_MODEL_PATH, map_location=self.device)
                if isinstance(state_dict, dict) and "model_state_dict" in state_dict:
                    state_dict = state_dict["model_state_dict"]
                self.emotion_model.load_state_dict(state_dict)
                self.emotion_model.eval()
                self.emotion_model_loaded = True
                logger.info("[MODULE 6] Emotion model loaded successfully.")
            else:
                logger.warning(f"[MODULE 6] Emotion model file not found at {EMOTION_MODEL_PATH}.")
        except Exception:
            logger.exception("[MODULE 6] Failed loading emotion model")
            self.emotion_model_loaded = False

        # 3. Load YOLOv8 for Mobile Detection
        try:
            logger.info("[MODULE 6] Initializing mobile detection (YOLOv8)...")
            self.yolo_model = YOLO("yolov8n.pt")
            self.yolo_model_loaded = True
            logger.info("[MODULE 6] Mobile detection initialized successfully.")
        except Exception:
            logger.exception("[MODULE 6] Failed loading YOLO model")
            self.yolo_model = None
            self.yolo_model_loaded = False

        # 4. Check MediaPipe Availability & Initialize FaceMesh
        self.mp_face_mesh = None
        try:
            import mediapipe as mp
            if hasattr(mp, "solutions") and hasattr(mp.solutions, "face_mesh"):
                self.mp_face_mesh = mp.solutions.face_mesh.FaceMesh(
                    static_image_mode=True,
                    max_num_faces=1,
                    refine_landmarks=True,
                    min_detection_confidence=0.5
                )
                self.mediapipe_available = True
                logger.info("[MODULE 6] MediaPipe FaceMesh solutions initialized successfully.")
            else:
                logger.info("[MODULE 6] MediaPipe present but solutions module unavailable; using OpenCV fallback.")
        except Exception as e:
            logger.warning(f"[MODULE 6] MediaPipe initialization fallback: {e}")
            self.mediapipe_available = False

        # 5. Load OpenCV Haar Cascade Face Detector
        self.face_cascade = None
        cascade_paths = [
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml",
            str(HAAR_CASCADE_PATH)
        ]
        for c_path in cascade_paths:
            if os.path.exists(c_path):
                try:
                    cascade = cv2.CascadeClassifier(c_path)
                    if not cascade.empty():
                        self.face_cascade = cascade
                        self.face_detector_available = True
                        self.face_detection_available = True
                        logger.info(f"[MODULE 6] OpenCV Haar Cascade face detector initialized successfully from {c_path}.")
                        break
                except Exception:
                    logger.exception(f"[MODULE 6] Error loading Haar Cascade classifier from {c_path}")

        if not self.face_detector_available and self.mediapipe_available:
            self.face_detector_available = True
            self.face_detection_available = True

        # Vision Transforms
        if transforms:
            self.confidence_transform = transforms.Compose([
                transforms.Resize((128, 128)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])

            self.emotion_transform = transforms.Compose([
                transforms.Grayscale(num_output_channels=1),
                transforms.Resize((48, 48)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.5], std=[0.5])
            ])
        else:
            self.confidence_transform = None
            self.emotion_transform = None

        self.emotion_labels = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
        logger.info("[MODULE 6] Vision analysis pipeline initialized.")
        self.frame_counter = 0

    def _get_fallback_frame_analysis(self):
        """Default fallback analysis dictionary when image input is missing, dark, or malformed."""
        return {
            "frame_valid": False,
            "analysis_status": "UNAVAILABLE",
            "face_detected": False,
            "face_present": False,
            "face_detection_available": self.face_detector_available,
            "gaze_available": False,
            "head_pose_available": False,
            "is_facing_screen": False,
            "looking_away": False,
            "gaze_direction": "away",
            "head_pose": {"pitch": 0.0, "yaw": 0.0, "roll": 0.0},
            "confidence_analysis_available": self.confidence_model_loaded,
            "confidence_prediction": "No Face",
            "confidence_probability": 0.0,
            "confidence_score": 0.0,
            "attention_score": None,
            "emotion_analysis_available": self.emotion_model_loaded,
            "emotion_prediction": "no_face",
            "emotion": "no_face",
            "emotion_confidence": 0.0,
            "emotion_probabilities": {k: 0.0 for k in self.emotion_labels},
            "mobile_detection_available": self.yolo_model_loaded,
            "mobile_detected": False,
            "mobile_phone_detected": False,
            "mobile_confidence": 0.0
        }

    def detect_face_bbox(self, bgr_image):
        """
        Robust face detection using OpenCV Haar Cascade and MediaPipe FaceMesh verification.
        Removes unsafe raw skin-color contour detection to eliminate false face classifications.
        """
        if bgr_image is None or not isinstance(bgr_image, np.ndarray) or bgr_image.size == 0 or len(bgr_image.shape) < 3:
            return False, (0, 0, 0, 0), None

        try:
            img_h, img_w, _ = bgr_image.shape

            # 1. Primary face detection using OpenCV Haar Cascade
            if self.face_cascade is not None and not self.face_cascade.empty():
                gray = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2GRAY)
                faces = self.face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=4,
                    minSize=(40, 40)
                )
                if len(faces) > 0:
                    largest_face = max(faces, key=lambda rect: rect[2] * rect[3])
                    x, y, w, h = [int(v) for v in largest_face]
                    cropped = bgr_image[y:y+h, x:x+w]
                    if cropped.size > 0:
                        return True, (x, y, w, h), cropped

            # 2. Secondary face detection using MediaPipe FaceMesh
            if self.mediapipe_available and self.mp_face_mesh is not None:
                rgb = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)
                results = self.mp_face_mesh.process(rgb)
                if results.multi_face_landmarks:
                    face_landmarks = results.multi_face_landmarks[0]
                    xs = [lm.x * img_w for lm in face_landmarks.landmark]
                    ys = [lm.y * img_h for lm in face_landmarks.landmark]
                    x_min, x_max = int(max(0, min(xs))), int(min(img_w, max(xs)))
                    y_min, y_max = int(max(0, min(ys))), int(min(img_h, max(ys)))
                    w, h = x_max - x_min, y_max - y_min
                    if w > 20 and h > 20:
                        cropped = bgr_image[y_min:y_max, x_min:x_max]
                        if cropped.size > 0:
                            return True, (x_min, y_min, w, h), cropped

            # No verified face detected
            return False, (0, 0, img_w, img_h), None
        except Exception as e:
            logger.error(f"[MODULE 6] Face detection exception: {e}")
            return False, (0, 0, 0, 0), None

    def estimate_head_pose_mediapipe(self, bgr_image):
        """
        Estimate 3D head pose (pitch, yaw, roll) and gaze direction using MediaPipe FaceMesh landmarks.
        Returns: (is_facing_screen, gaze_direction, head_pose, gaze_available)
        """
        if not self.mediapipe_available or self.mp_face_mesh is None:
            return None, "center", {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}, False

        try:
            h, w, _ = bgr_image.shape
            rgb = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)
            results = self.mp_face_mesh.process(rgb)

            if not results.multi_face_landmarks:
                return None, "center", {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}, False

            face_landmarks = results.multi_face_landmarks[0]
            
            # 3D Model Points (standard 6-point facial model)
            model_points = np.array([
                (0.0, 0.0, 0.0),             # Nose tip (landmark 1)
                (0.0, -330.0, -65.0),        # Chin (landmark 152)
                (-225.0, 170.0, -135.0),     # Left eye left corner (landmark 33)
                (225.0, 170.0, -135.0),      # Right eye right corner (landmark 263)
                (-150.0, -150.0, -125.0),    # Left Mouth corner (landmark 61)
                (150.0, -150.0, -125.0)      # Right Mouth corner (landmark 291)
            ], dtype=np.float64)

            # 2D Image Points from MediaPipe
            landmarks_idx = [1, 152, 33, 263, 61, 291]
            image_points = np.array([
                (face_landmarks.landmark[i].x * w, face_landmarks.landmark[i].y * h)
                for i in landmarks_idx
            ], dtype=np.float64)

            focal_length = w
            center = (w / 2.0, h / 2.0)
            camera_matrix = np.array([
                [focal_length, 0, center[0]],
                [0, focal_length, center[1]],
                [0, 0, 1]
            ], dtype=np.float64)

            dist_coeffs = np.zeros((4, 1))

            success, rvec, tvec = cv2.solvePnP(
                model_points, image_points, camera_matrix, dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE
            )

            if not success:
                return None, "center", {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}, False

            rmat, _ = cv2.Rodrigues(rvec)
            proj_matrix = np.hstack((rmat, tvec))
            euler_angles = cv2.decomposeProjectionMatrix(proj_matrix)[6]

            pitch = float(euler_angles[0, 0])
            yaw = float(euler_angles[1, 0])
            roll = float(euler_angles[2, 0])

            head_pose = {
                "pitch": round(pitch, 1),
                "yaw": round(yaw, 1),
                "roll": round(roll, 1)
            }

            abs_yaw = abs(yaw)
            abs_pitch = abs(pitch)

            # Additional Iris Landmark Gaze Tracking (Landmarks 468 & 473)
            iris_gaze_deviated = False
            if len(face_landmarks.landmark) >= 474:
                try:
                    left_outer = face_landmarks.landmark[33].x
                    left_inner = face_landmarks.landmark[133].x
                    left_iris = face_landmarks.landmark[468].x
                    
                    right_inner = face_landmarks.landmark[362].x
                    right_outer = face_landmarks.landmark[263].x
                    right_iris = face_landmarks.landmark[473].x

                    left_width = abs(left_inner - left_outer)
                    right_width = abs(right_outer - right_inner)

                    if left_width > 0 and right_width > 0:
                        left_ratio = (left_iris - min(left_outer, left_inner)) / left_width
                        right_ratio = (right_iris - min(right_outer, right_inner)) / right_width
                        avg_ratio = (left_ratio + right_ratio) / 2.0

                        if avg_ratio < 0.28 or avg_ratio > 0.72:
                            iris_gaze_deviated = True
                except Exception:
                    pass

            is_facing_screen = bool(abs_yaw <= 20.0 and abs_pitch <= 20.0 and not iris_gaze_deviated)

            if is_facing_screen:
                gaze_direction = "center"
            elif iris_gaze_deviated:
                gaze_direction = "side_glance"
            elif abs_yaw > abs_pitch:
                gaze_direction = "right" if yaw > 0 else "left"
            else:
                gaze_direction = "down" if pitch > 0 else "up"

            return is_facing_screen, gaze_direction, head_pose, True

        except Exception as e:
            logger.error(f"[MODULE 6] MediaPipe head pose estimation error: {e}")
            return None, "center", {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}, False

    def estimate_camera_facing(self, bbox, img_w, img_h):
        """Estimate camera-facing offset ratio fallback."""
        try:
            x, y, w, h = bbox
            face_center_x = x + (w / 2.0)
            face_center_y = y + (h / 2.0)
            frame_center_x = max(1.0, img_w / 2.0)
            frame_center_y = max(1.0, img_h / 2.0)

            offset_x_ratio = (face_center_x - frame_center_x) / frame_center_x
            offset_y_ratio = (face_center_y - frame_center_y) / frame_center_y

            abs_x = abs(offset_x_ratio)
            abs_y = abs(offset_y_ratio)

            is_facing_screen = bool(abs_x <= 0.35 and abs_y <= 0.35)

            if abs_x <= 0.35 and abs_y <= 0.35:
                gaze_direction = "center"
            elif abs_x > abs_y:
                gaze_direction = "right" if offset_x_ratio > 0 else "left"
            else:
                gaze_direction = "down" if offset_y_ratio > 0 else "up"

            pitch_est = round(float((face_center_y - frame_center_y) * 0.1), 2)
            yaw_est = round(float((face_center_x - frame_center_x) * 0.1), 2)
            roll_est = 0.0

            head_pose = {"pitch": pitch_est, "yaw": yaw_est, "roll": roll_est}
            return is_facing_screen, gaze_direction, head_pose
        except Exception as e:
            logger.error(f"[MODULE 6] Camera facing estimation error: {e}")
            return False, "unavailable", {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}

    def detect_mobile_phone(self, bgr_image, confidence_threshold=0.25):
        if not self.yolo_model_loaded or self.yolo_model is None or bgr_image is None or not isinstance(bgr_image, np.ndarray) or bgr_image.size == 0:
           return False, 0.0

        try:
           results = self.yolo_model(bgr_image, verbose=False)
           highest_conf = 0.0
           mobile_detected = False

           if not isinstance(results, list):
              results = [results]

           for result in results:
               for box in result.boxes:
                   cls_id = int(box.cls.item())
                   conf = float(box.conf.item())
                   class_name = result.names.get(cls_id, "").lower()

                   if "phone" in class_name or "cell" in class_name or cls_id == 67:
                       if conf >= confidence_threshold:
                          mobile_detected = True
                          highest_conf = max(highest_conf, conf)
                          logger.info(f"[MODULE 6] Mobile candidate detected: {class_name} ({conf:.2f})")

           return mobile_detected, round(highest_conf, 4)
        except Exception as e:
            logger.error(f"[MODULE 6] Mobile detection error: {e}")
            return False, 0.0

    def analyze_frame(self, bgr_image):
        """
        Analyzes single webcam frame safely.
        Distinguishes: OK, NO_FACE, LOW_LIGHT, INVALID_FRAME.
        Provides availability flags: gaze_available, confidence_analysis_available, emotion_analysis_available, mobile_detection_available.
        """
        if bgr_image is None or not isinstance(bgr_image, np.ndarray) or bgr_image.size == 0 or len(bgr_image.shape) < 3:
            logger.warning("[MODULE 6] Invalid image array provided to analyze_frame.")
            fallback = self._get_fallback_frame_analysis()
            fallback["analysis_status"] = "INVALID_FRAME"
            fallback["frame_valid"] = False
            return fallback

        mean_pixel = float(np.mean(bgr_image))
        if mean_pixel < 15.0:
            logger.warning("[MODULE 6] Camera feed is dark/low-light (mean pixel < 15).")
            fallback = self._get_fallback_frame_analysis()
            fallback["analysis_status"] = "LOW_LIGHT"
            fallback["frame_valid"] = False
            return fallback

        try:
            self.frame_counter += 1
            img_h, img_w, _ = bgr_image.shape

            # 1. Primary Face Bounding Box Detection
            face_detected, bbox, cropped_face = self.detect_face_bbox(bgr_image)
            logger.info(f"[MODULE 6] Frame #{self.frame_counter} | Face detected: {face_detected}")

            gaze_available = False
            head_pose_available = False
            face_message = None

            if face_detected and cropped_face is not None and cropped_face.size > 0:
                analysis_status = "OK"
                frame_valid = True

                # Attempt MediaPipe Landmark Head Pose / Gaze Estimation
                is_facing_screen, gaze_direction, head_pose, gaze_available = self.estimate_head_pose_mediapipe(bgr_image)
                
                if not gaze_available:
                    # Fallback pose estimation using bounding box ratio
                    is_facing_screen, gaze_direction, head_pose = self.estimate_camera_facing(bbox, img_w, img_h)
                    gaze_available = False  # Mark gaze tracking as unavailable

                head_pose_available = True if (gaze_available or (head_pose and (head_pose.get("pitch") != 0.0 or head_pose.get("yaw") != 0.0))) else False

                cropped_face_rgb = cv2.cvtColor(cropped_face, cv2.COLOR_BGR2RGB)
                pil_cropped = Image.fromarray(cropped_face_rgb)

                # Confidence Model Inference
                if self.confidence_model_loaded:
                    try:
                        conf_tensor = self.confidence_transform(pil_cropped).unsqueeze(0).to(self.device)
                        with torch.no_grad():
                            conf_logits = self.confidence_model(conf_tensor)
                            conf_probs = torch.softmax(conf_logits, dim=1).squeeze(0).cpu().numpy()
                            pred_idx = int(np.argmax(conf_probs))
                            confidence_pred = "Confident" if pred_idx == 1 else "Unconfident"
                            confidence_prob = float(conf_probs[pred_idx])
                        logger.info(f"[MODULE 6] Confidence inference executed: {confidence_pred} ({confidence_prob:.2f})")
                    except Exception as e:
                        logger.error(f"[MODULE 6] Confidence model error: {e}")
                        confidence_pred = "unavailable"
                        confidence_prob = None
                else:
                    confidence_pred = "unavailable"
                    confidence_prob = None

                # Emotion Model Inference
                if self.emotion_model_loaded:
                    try:
                        emo_tensor = self.emotion_transform(pil_cropped).unsqueeze(0).to(self.device)
                        with torch.no_grad():
                            emo_logits = self.emotion_model(emo_tensor)
                            emo_probs = torch.softmax(emo_logits, dim=1).squeeze(0).cpu().numpy()
                            emo_idx = int(np.argmax(emo_probs))
                            emotion_pred = self.emotion_labels[emo_idx]
                            emotion_probs = {lbl: float(p) for lbl, p in zip(self.emotion_labels, emo_probs)}
                        logger.info(f"[MODULE 6] Emotion inference executed: {emotion_pred}")
                    except Exception as e:
                        logger.error(f"[MODULE 6] Emotion model error: {e}")
                        emotion_pred = "unavailable"
                        emotion_probs = {e: 0.0 for e in self.emotion_labels}
                else:
                    emotion_pred = "unavailable"
                    emotion_probs = {e: 0.0 for e in self.emotion_labels}

                conf_score = round(float(confidence_prob * 100.0), 1) if confidence_prob is not None else None
                attention_score = 100.0 if (is_facing_screen and gaze_available) else (0.0 if gaze_available else None)
                emo_conf = float(max(emotion_probs.values())) if (emotion_probs and any(v > 0 for v in emotion_probs.values())) else None
            else:
                face_detected = False
                analysis_status = "NO_FACE"
                frame_valid = True
                is_facing_screen = False
                gaze_direction = "away"
                head_pose = {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}
                head_pose_available = False
                confidence_pred = "No Face"
                confidence_prob = None
                conf_score = None
                emotion_pred = "no_face"
                emo_conf = None
                emotion_probs = {lbl: 0.0 for lbl in self.emotion_labels}
                attention_score = None
                face_message = "Face was not visible during analysis, so visual metrics could not be recorded."

            # Mobile Phone Detection (YOLOv8)
            mobile_detected, mobile_conf = self.detect_mobile_phone(bgr_image)
            logger.info(f"[MODULE 6] Mobile detection executed: {mobile_detected} (Conf: {mobile_conf})")

            return {
                "frame_valid": frame_valid,
                "analysis_status": analysis_status,
                "face_detected": bool(face_detected),
                "face_present": bool(face_detected),
                "face_detection_available": bool(self.face_detector_available),
                "gaze_available": bool(gaze_available),
                "head_pose_available": bool(head_pose_available),
                "is_facing_screen": bool(is_facing_screen),
                "looking_away": bool(face_detected and gaze_available and not is_facing_screen),
                "gaze_direction": str(gaze_direction),
                "head_pose": head_pose,
                "confidence_analysis_available": bool(self.confidence_model_loaded and confidence_pred in ["Confident", "Unconfident"]),
                "confidence_prediction": str(confidence_pred),
                "confidence_probability": round(float(confidence_prob), 4) if confidence_prob is not None else None,
                "confidence_score": conf_score,
                "attention_score": attention_score,
                "emotion_analysis_available": bool(self.emotion_model_loaded and emotion_pred not in ["no_face", "unavailable"]),
                "emotion_prediction": str(emotion_pred),
                "emotion": str(emotion_pred),
                "emotion_confidence": round(float(emo_conf), 4) if emo_conf is not None else None,
                "face_message": face_message,
                "emotion_probabilities": {k: round(float(v), 4) for k, v in emotion_probs.items()},
                "mobile_detection_available": bool(self.yolo_model_loaded),
                "mobile_detected": bool(mobile_detected),
                "mobile_phone_detected": bool(mobile_detected),
                "mobile_confidence": round(float(mobile_conf), 4)
            }
        except Exception as e:
            logger.error(f"[MODULE 6] analyze_frame unexpected error: {e}", exc_info=True)
            fallback = self._get_fallback_frame_analysis()
            fallback["analysis_status"] = "ANALYSIS_ERROR"
            fallback["frame_valid"] = False
            return fallback


vision_service = VisionService()
