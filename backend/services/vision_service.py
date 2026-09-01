import os
import cv2
import logging
import numpy as np
import torch
from pathlib import Path
from torchvision import transforms
from PIL import Image
from ultralytics import YOLO

from ml_models.train_confidence import ConfidenceCNN
from ml_models.train_emotion import EmotionCNN

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

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
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

        # 4. Check MediaPipe Availability
        try:
            import mediapipe as mp
            self.mediapipe_available = bool(hasattr(mp, "solutions") and hasattr(mp.solutions, "face_mesh"))
            if self.mediapipe_available:
                logger.info("[MODULE 6] MediaPipe FaceMesh solutions initialized successfully.")
            else:
                logger.info("[MODULE 6] MediaPipe present but solutions module unavailable; using OpenCV fallback.")
        except Exception:
            logger.exception("[MODULE 6] MediaPipe initialization fallback")
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

        if not self.face_detector_available:
            logger.warning("[MODULE 6] Haar Cascade classifier unavailable; enabling baseline skin-color contour detection.")
            self.face_detector_available = True
            self.face_detection_available = True

        # Vision Transforms
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

        self.emotion_labels = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
        logger.info("[MODULE 6] Vision analysis pipeline initialized.")
        self.frame_counter = 0

    def _get_fallback_frame_analysis(self):
        """Default fallback analysis dictionary when image input is missing, black, or malformed."""
        return {
            "face_detected": False,
            "face_present": False,
            "is_facing_screen": False,
            "looking_away": False,
            "gaze_direction": "away",
            "head_pose": {"pitch": 0.0, "yaw": 0.0, "roll": 0.0},
            "confidence_analysis_available": self.confidence_model_loaded,
            "confidence_prediction": "No Face",
            "confidence_probability": 0.0,
            "confidence_score": 0.0,
            "attention_score": 0.0,
            "emotion_analysis_available": self.emotion_model_loaded,
            "emotion_prediction": "no_face",
            "emotion": "no_face",
            "emotion_confidence": 0.0,
            "emotion_probabilities": {k: 0.0 for k in self.emotion_labels},
            "mobile_detected": False,
            "mobile_phone_detected": False,
            "mobile_confidence": 0.0
        }

    def detect_face_bbox_opencv(self, bgr_image):
        """Robust face box detection using OpenCV Haar Cascade with skin color & contour fallback."""
        if bgr_image is None or not isinstance(bgr_image, np.ndarray) or bgr_image.size == 0 or len(bgr_image.shape) < 3:
            return False, (0, 0, 0, 0), None

        try:
            img_h, img_w, _ = bgr_image.shape
            gray = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2GRAY)

            # 1. Primary face detection using OpenCV Haar Cascade
            if self.face_cascade is not None and not self.face_cascade.empty():
                faces = self.face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=5,
                    minSize=(30, 30)
                )
                if len(faces) > 0:
                    largest_face = max(faces, key=lambda rect: rect[2] * rect[3])
                    x, y, w, h = [int(v) for v in largest_face]
                    cropped = bgr_image[y:y+h, x:x+w]
                    if cropped.size > 0:
                        return True, (x, y, w, h), cropped

            # 2. Secondary fallback: Skin-color & contour analysis
            ycrcb = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2YCrCb)
            lower_skin = np.array([0, 133, 77], dtype=np.uint8)
            upper_skin = np.array([255, 173, 127], dtype=np.uint8)
            skin_mask = cv2.inRange(ycrcb, lower_skin, upper_skin)

            contours, _ = cv2.findContours(skin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                largest_contour = max(contours, key=cv2.contourArea)
                area = cv2.contourArea(largest_contour)
                if area >= (img_w * img_h * 0.05) and np.mean(bgr_image) > 30:
                    x, y, w, h = cv2.boundingRect(largest_contour)
                    cropped = bgr_image[y:y+h, x:x+w]
                    if cropped.size > 0:
                        return True, (x, y, w, h), cropped

            return False, (0, 0, img_w, img_h), None
        except Exception as e:
            logger.error(f"[MODULE 6] Face detection exception: {e}")
            return False, (0, 0, 0, 0), None

    def estimate_camera_facing(self, bbox, img_w, img_h):
        """Estimate camera-facing, gaze direction, and head pose angles."""
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
            return False, "away", {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}

    def detect_mobile_phone(self, bgr_image, confidence_threshold=0.25):
        if not self.yolo_model_loaded or self.yolo_model is None or bgr_image is None or not isinstance(bgr_image, np.ndarray) or bgr_image.size == 0:
           return False, 0.0

        try:
           results = self.yolo_model(bgr_image, verbose=False)
           highest_conf = 0.0
           mobile_detected = False

        # Normalize results to a list
           if not isinstance(results, list):
              results = [results]

           for result in results:
               for box in result.boxes:
                   cls_id = int(box.cls.item())
                   conf = float(box.conf.item())
                   class_name = result.names.get(cls_id, "").lower()

                # ✅ This check must be inside the box loop
                   if "phone" in class_name or cls_id == 67:
                       if conf >= confidence_threshold:
                          mobile_detected = True
                          highest_conf = max(highest_conf, conf)
                          logger.info(f"[MODULE 6] Mobile candidate detected: {class_name} ({conf:.2f})")

           return mobile_detected, round(highest_conf, 4)
        except Exception as e:
            logger.error(f"[MODULE 6] Mobile detection error: {e}")
            return False, 0.0


    def analyze_frame(self, bgr_image):
        if not face_detected or np.mean(bgr_image) < 30:
           logger.info("[MODULE 6] No valid face detected or frame too dark — forcing eye contact and attention to 0.")
           return self._get_fallback_frame_analysis()
        if float(np.mean(bgr_image)) < 5.0:
           logger.warning("[MODULE 6] Black frame detected, returning fallback.")
           return self._get_fallback_frame_analysis()

        if bgr_image is None or not isinstance(bgr_image, np.ndarray) or bgr_image.size == 0 or len(bgr_image.shape) < 3:
           logger.warning("[MODULE 6] Invalid image array provided to analyze_frame.")
           return self._get_fallback_frame_analysis()
        if float(np.mean(bgr_image)) < 5.0:
           logger.warning("[MODULE 6] Camera feed is black or nearly empty (mean pixel value < 5). Returning fallback analysis.")
           return self._get_fallback_frame_analysis()
        try:
            self.frame_counter += 1
            img_h, img_w, _ = bgr_image.shape
            
            logger.info(f"[MODULE 6] Frame received for inference (Frame #{self.frame_counter}).")

            face_detected, bbox, cropped_face = self.detect_face_bbox_opencv(bgr_image)
            logger.info(f"[MODULE 6] Face detected: {face_detected}")

            if face_detected and cropped_face is not None and cropped_face.size > 0:
                is_facing_screen, gaze_direction, head_pose = self.estimate_camera_facing(bbox, img_w, img_h)
                logger.info(f"[MODULE 6] Camera-facing analysis executed. Facing screen: {is_facing_screen}, Gaze: {gaze_direction}")

                cropped_face_rgb = cv2.cvtColor(cropped_face, cv2.COLOR_BGR2RGB)
                pil_cropped = Image.fromarray(cropped_face_rgb)

                # 1. Confidence Model Inference
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
                        logger.error(f"[MODULE 6] Confidence model inference error: {e}")
                        confidence_pred = "unavailable"
                        confidence_prob = 0.0
                else:
                    confidence_pred = "unavailable"
                    confidence_prob = 0.0
                    confidence_pred = "No Face"
                    conf_score = 0.0
                    attention_score = 0.0


                # 2. Emotion Model Inference
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
                        logger.error(f"[MODULE 6] Emotion model inference error: {e}")
                        emotion_pred = "unavailable"
                        emotion_probs = {e: 0.0 for e in self.emotion_labels}
                else:
                    emotion_pred = "unavailable"
                    emotion_probs = {e: 0.0 for e in self.emotion_labels}

                conf_score = round(float(confidence_prob * 100.0), 1)
                attention_score = 100.0 if is_facing_screen else 0.0
                emo_conf = float(max(emotion_probs.values())) if emotion_probs else 0.0
            else:
                # 2. No Face Handling
                face_detected = False
                is_facing_screen = False
                gaze_direction = "away"
                head_pose = {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}
                confidence_pred = "No Face"
                confidence_prob = 0.0
                conf_score = 0.0
                emotion_pred = "no_face"
                emo_conf = 0.0
                emotion_probs = {lbl: 0.0 for lbl in self.emotion_labels}
                attention_score = 0.0
                face_message = "Face was not visible during analysis, so visual metrics could not be recorded."

            # 3. Mobile Phone Detection
            mobile_detected, mobile_conf = self.detect_mobile_phone(bgr_image)
            logger.info(f"[MODULE 6] Mobile detection executed: {mobile_detected} (Conf: {mobile_conf})")

            return {
                "face_detected": bool(face_detected),
                "face_present": bool(face_detected),
                "is_facing_screen": bool(is_facing_screen),
                "looking_away": bool(face_detected and not is_facing_screen),
                "gaze_direction": str(gaze_direction),
                "head_pose": head_pose,
                "confidence_analysis_available": bool(self.confidence_model_loaded),
                "confidence_prediction": str(confidence_pred),
                "confidence_probability": round(float(confidence_prob), 4),
                "confidence_score": float(conf_score),
                "attention_score": float(attention_score),
                "emotion_analysis_available": bool(self.emotion_model_loaded),
                "emotion_prediction": str(emotion_pred),
                "emotion": str(emotion_pred),
                "emotion_confidence": round(float(emo_conf), 4),
                "face_message": face_message, 
                "emotion_probabilities": {k: round(float(v), 4) for k, v in emotion_probs.items()},
                "mobile_detected": bool(mobile_detected),
                "mobile_phone_detected": bool(mobile_detected),
                "mobile_confidence": round(float(mobile_conf), 4)
            }
        except Exception as e:
            logger.error(f"[MODULE 6] analyze_frame unexpected error: {e}", exc_info=True)
            return self._get_fallback_frame_analysis()


vision_service = VisionService()

