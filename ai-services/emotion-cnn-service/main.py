from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64, os, shutil, cv2, numpy as np

app = FastAPI(title="SmartHire Custom CNN Emotion Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
MODEL = None
MODEL_LOAD_ERROR = None
CLASS_NAMES = ["Nervous", "Scared", "Confused"]
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.getenv(
    "EMOTION_CNN_MODEL",
    os.path.join(BASE_DIR, "model", "emotion_cnn.keras")
)

def ensure_local_model():
    """Copy the previously trained real CNN model into this build when available."""
    global MODEL_PATH
    if os.path.exists(MODEL_PATH):
        return True
    candidates = [
        os.path.join(
            BASE_DIR, "..", "..", "..", "..",
            "SmartHire-AI-MODULE6-CNN-IMPLEMENTED-2026-08-28",
            "SmartHire-AI", "ai-services", "emotion-cnn-service",
            "model", "emotion_cnn.keras"
        ),
        os.path.join(
            os.path.expanduser("~"), "OneDrive", "Desktop", "Documents", "Downloads",
            "SmartHire-AI-MODULE6-CNN-IMPLEMENTED-2026-08-28",
            "SmartHire-AI", "ai-services", "emotion-cnn-service",
            "model", "emotion_cnn.keras"
        )
    ]
    source = next((candidate for candidate in candidates if os.path.exists(candidate)), None)
    if not source:
        return False
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    shutil.copy2(source, MODEL_PATH)
    return True

class ImagePayload(BaseModel):
    image: str

@app.on_event("startup")
def load_model():
    global MODEL, MODEL_LOAD_ERROR
    try:
        import tensorflow as tf
        if not ensure_local_model():
            MODEL_LOAD_ERROR = f"CNN model not trained. Expected: {MODEL_PATH}"
            MODEL = None
            return
        MODEL = tf.keras.models.load_model(MODEL_PATH)
        MODEL_LOAD_ERROR = None
    except Exception as exc:
        MODEL = None
        MODEL_LOAD_ERROR = str(exc)

@app.get("/health")
def health():
    return {
        "status": "ok" if MODEL is not None else "degraded",
        "available": MODEL is not None,
        "provider": "custom-cnn",
        "classes": CLASS_NAMES,
        "model_path": MODEL_PATH,
        "error": MODEL_LOAD_ERROR,
    }

def decode_image(data_url: str):
    raw = base64.b64decode(data_url.split(',', 1)[-1])
    arr = np.frombuffer(raw, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Unable to decode image")
    return frame

def detect_face(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
    if len(faces) == 0:
        return None, 0
    # Choose the largest face for emotion prediction; retain count for monitoring/proctoring.
    x, y, w, h = max(faces, key=lambda r: r[2] * r[3])
    pad = int(min(w, h) * 0.12)
    x0, y0 = max(0, x-pad), max(0, y-pad)
    x1, y1 = min(frame.shape[1], x+w+pad), min(frame.shape[0], y+h+pad)
    return frame[y0:y1, x0:x1], len(faces)

def preprocess(face):
    img = cv2.resize(face, (96, 96), interpolation=cv2.INTER_AREA)
    # The trained CNN already contains a Keras Rescaling(1./255) layer.
    # Keep API input in the 0..255 pixel range to avoid double normalization.
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32)
    return np.expand_dims(img, axis=0)

@app.post('/analyze')
def analyze(payload: ImagePayload):
    if MODEL is None:
        return {
            "provider": "custom-cnn",
            "available": False,
            "model_ready": False,
            "dominant_emotion": "Unavailable",
            "confidence": 0,
            "scores": {},
            "face_count": -1,
            "error": MODEL_LOAD_ERROR,
        }
    try:
        frame = decode_image(payload.image)
        face, face_count = detect_face(frame)
        if face is None:
            return {
                "provider": "custom-cnn",
                "available": True,
                "model_ready": True,
                "dominant_emotion": "No Face",
                "confidence": 0,
                "scores": {c: 0 for c in CLASS_NAMES},
                "face_count": 0,
            }
        probs = MODEL.predict(preprocess(face), verbose=0)[0]
        probs = np.asarray(probs, dtype=np.float32)
        probs = probs / np.maximum(probs.sum(), 1e-8)
        idx = int(np.argmax(probs))
        scores = {CLASS_NAMES[i]: round(float(probs[i] * 100), 2) for i in range(len(CLASS_NAMES))}
        return {
            "provider": "custom-cnn",
            "available": True,
            "model_ready": True,
            "dominant_emotion": CLASS_NAMES[idx],
            "confidence": round(float(probs[idx] * 100), 2),
            "scores": scores,
            "face_count": int(face_count),
        }
    except Exception as exc:
        return {
            "provider": "custom-cnn",
            "available": False,
            "model_ready": True,
            "dominant_emotion": "Unavailable",
            "confidence": 0,
            "scores": {},
            "face_count": -1,
            "error": str(exc),
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8095")))
