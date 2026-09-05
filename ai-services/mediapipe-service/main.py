from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import math
import os
import cv2
import numpy as np

app = FastAPI(title="SmartHire Eye Tracking Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# MediaPipe is preferred when available. On Python 3.13, the service can run
# with a real OpenCV eye/face tracker so the live interview is not blocked by
# unavailable native MediaPipe wheels.
try:
    import mediapipe as mp  # type: ignore
    _mesh = mp.solutions.face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=5,
        refine_landmarks=True,
        min_detection_confidence=0.5,
    )
    PROVIDER = "mediapipe"
except Exception:
    mp = None
    _mesh = None
    PROVIDER = "opencv-eye-tracker-fallback"

FACE_CASCADE = cv2.CascadeClassifier(
    os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
)
EYE_CASCADE = cv2.CascadeClassifier(
    os.path.join(cv2.data.haarcascades, "haarcascade_eye.xml")
)

class ImagePayload(BaseModel):
    image: str

def clamp(v, a=0, b=100):
    return max(a, min(b, float(v)))

def decode(data_url: str):
    raw = base64.b64decode(data_url.split(',', 1)[-1])
    arr = np.frombuffer(raw, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Invalid image")
    return frame

def mp_analyze(frame):
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = _mesh.process(rgb)
    landmarks = result.multi_face_landmarks or []
    face_count = len(landmarks)
    if not landmarks:
        return {
            "provider": "mediapipe", "available": True, "face_count": 0,
            "eye_contact_percentage": 0, "looking_away_duration_seconds": 0,
            "head_orientation": "Unknown", "attention_level": "Unavailable",
            "engagement_level": "Unavailable", "gaze_direction": "No face",
            "eyes_closed": False, "head_stability_score": 0,
            "facial_activity_score": 0, "engagement_score": 0,
        }
    lm = landmarks[0].landmark
    def dist(a, b):
        return math.hypot(lm[a].x-lm[b].x, lm[a].y-lm[b].y)
    nose = lm[1]
    li, ri = lm[468], lm[473]
    dx = ((li.x + ri.x) / 2) - nose.x
    dy = ((li.y + ri.y) / 2) - nose.y
    if abs(dx) > 0.10:
        gaze = "Looking right" if dx > 0 else "Looking left"
    elif dy > 0.055:
        gaze = "Looking down"
    else:
        gaze = "Looking at camera"
    left_ratio = dist(159, 145) / max(dist(33, 133), 1e-6)
    right_ratio = dist(386, 374) / max(dist(362, 263), 1e-6)
    closed = ((left_ratio + right_ratio) / 2) < 0.16
    eye_pct = 90 if gaze == "Looking at camera" and not closed else 25 if gaze == "Looking down" else 40 if gaze in ("Looking left", "Looking right") else 10
    head_stability = clamp(100 - abs(nose.x - 0.5) * 260 - abs(nose.y - 0.5) * 120)
    attention = "High" if eye_pct >= 70 and head_stability >= 70 and face_count == 1 else "Medium" if eye_pct >= 40 else "Low"
    facial_activity = clamp(65 + (10 if not closed else -20))
    engagement = clamp(0.35*eye_pct + 0.35*(100 if attention == "High" else 65 if attention == "Medium" else 30) + 0.30*facial_activity)
    return {
        "provider": "mediapipe", "available": True, "face_count": face_count,
        "eye_contact_percentage": int(eye_pct),
        "looking_away_duration_seconds": 0 if eye_pct >= 70 else 1,
        "head_orientation": "Front" if gaze == "Looking at camera" else "Away",
        "attention_level": attention,
        "engagement_level": "High" if engagement >= 75 else "Medium" if engagement >= 50 else "Low",
        "gaze_direction": gaze, "eyes_closed": bool(closed),
        "head_stability_score": int(head_stability),
        "facial_activity_score": int(facial_activity), "engagement_score": int(engagement),
    }

def cv_analyze(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = FACE_CASCADE.detectMultiScale(gray, 1.1, 5, minSize=(80, 80))
    face_count = len(faces)
    if face_count == 0:
        return {
            "provider": "opencv-eye-tracker-fallback", "available": True, "face_count": 0,
            "eye_contact_percentage": 0, "looking_away_duration_seconds": 0,
            "head_orientation": "Unknown", "attention_level": "Unavailable",
            "engagement_level": "Unavailable", "gaze_direction": "No face",
            "eyes_closed": False, "head_stability_score": 0,
            "facial_activity_score": 0, "engagement_score": 0,
        }
    x, y, w, h = max(faces, key=lambda r: r[2] * r[3])
    roi = gray[y:y+h, x:x+w]
    upper = roi[: max(1, int(h * 0.62)), :]
    eyes = EYE_CASCADE.detectMultiScale(upper, 1.1, 7, minSize=(18, 18))
    face_center_x = (x + w/2) / max(frame.shape[1], 1)
    face_center_y = (y + h/2) / max(frame.shape[0], 1)
    head_stability = clamp(100 - abs(face_center_x - 0.5) * 220 - abs(face_center_y - 0.5) * 100)
    # Real image evidence only: visible eye regions drive the eye-contact proxy.
    if len(eyes) >= 2:
        centers = [(ex + ew/2, ey + eh/2) for ex, ey, ew, eh in eyes[:2]]
        avg_eye_x = sum(c[0] for c in centers) / len(centers)
        relative = avg_eye_x / max(w, 1)
        if relative < 0.33:
            gaze = "Looking left"
            eye_pct = 40
        elif relative > 0.67:
            gaze = "Looking right"
            eye_pct = 40
        else:
            gaze = "Looking at camera"
            eye_pct = 82
        attention = "High" if eye_pct >= 70 and head_stability >= 70 and face_count == 1 else "Medium"
        engagement = clamp(0.45*eye_pct + 0.35*(100 if attention == "High" else 65) + 0.20*70)
        facial_activity = 70
        closed = False
    elif len(eyes) == 1:
        gaze = "Insufficient eye data"
        eye_pct = 25
        attention = "Low"
        engagement = 35
        facial_activity = 40
        closed = False
    else:
        gaze = "Eyes not detected"
        eye_pct = 0
        attention = "Low"
        engagement = 20
        facial_activity = 20
        closed = True
    return {
        "provider": "opencv-eye-tracker-fallback", "available": True, "face_count": face_count,
        "eye_contact_percentage": int(eye_pct),
        "looking_away_duration_seconds": 0 if eye_pct >= 70 else 1,
        "head_orientation": "Front" if head_stability >= 70 else "Away",
        "attention_level": attention,
        "engagement_level": "High" if engagement >= 75 else "Medium" if engagement >= 50 else "Low",
        "gaze_direction": gaze, "eyes_closed": bool(closed),
        "head_stability_score": int(head_stability),
        "facial_activity_score": int(facial_activity), "engagement_score": int(engagement),
    }

@app.get('/health')
def health():
    return {
        'status': 'ok',
        'available': True,
        'provider': PROVIDER,
        'mediapipe_available': _mesh is not None,
    }

@app.post('/analyze')
def analyze(payload: ImagePayload):
    try:
        frame = decode(payload.image)
        result = mp_analyze(frame) if _mesh is not None else cv_analyze(frame)
        return result
    except Exception as exc:
        return {'provider': PROVIDER, 'available': False, 'face_count': -1, 'error': str(exc)}
