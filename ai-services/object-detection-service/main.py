from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64, tempfile, os
from typing import List

app = FastAPI(title="SmartHire Prohibited Object Detection Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
MODEL = None
LOAD_ERROR = None
PROHIBITED = {"cell phone", "laptop", "tablet", "remote", "tv", "keyboard", "mouse"}

class ImagePayload(BaseModel):
    image: str

@app.on_event("startup")
def load_model():
    global MODEL, LOAD_ERROR
    try:
        from ultralytics import YOLO
        MODEL = YOLO(os.getenv("YOLO_MODEL", "yolov8n.pt"))
    except Exception as exc:
        LOAD_ERROR = str(exc)

@app.get('/health')
def health():
    return {"status": "ok" if MODEL is not None else "degraded", "provider": "yolo-ultralytics", "error": LOAD_ERROR}

@app.post('/analyze')
def analyze(payload: ImagePayload):
    if MODEL is None:
        return {"provider": "yolo-ultralytics", "available": False, "detections": [], "error": LOAD_ERROR}
    raw = base64.b64decode(payload.image.split(',', 1)[-1])
    fd, path = tempfile.mkstemp(suffix='.jpg'); os.close(fd)
    try:
        with open(path, 'wb') as f: f.write(raw)
        results = MODEL(path, verbose=False, conf=float(os.getenv('YOLO_CONFIDENCE', '0.50')))
        detections: List[dict] = []
        if results:
            names = results[0].names
            boxes = results[0].boxes
            for i in range(len(boxes)):
                cls = int(boxes.cls[i].item())
                conf = float(boxes.conf[i].item())
                label = str(names.get(cls, cls))
                if label in PROHIBITED:
                    detections.append({"label": label, "confidence": round(conf * 100, 1)})
        return {"provider": "yolo-ultralytics", "available": True, "detections": detections}
    finally:
        try: os.remove(path)
        except OSError: pass
