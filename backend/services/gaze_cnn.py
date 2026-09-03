import json
import os
import threading

import numpy as np

try:
    import cv2
except Exception:  # noqa: BLE001 - gaze assist must never break the pipeline
    cv2 = None


GAZE_CLASSES = ("toward_camera", "looking_left", "looking_right", "looking_up", "eyes_closed")

MODEL_VERSION = "smarthire-gaze-cnn-v3"
INPUT_SIZE = 160
# CNN decision authority threshold below geometric fallback in GazeTracker
CONFIDENCE_MIN = 0.55

_MODELS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "storage", "models"
)
MODEL_PATH = os.path.join(_MODELS_DIR, "gaze_cnn.keras")

_lock = threading.Lock()
_model = None
_model_error = None


def _load_model():
    global _model, _model_error
    with _lock:
        if _model is not None or _model_error is not None:
            return _model
        if not os.path.exists(MODEL_PATH):
            _model_error = "gaze_cnn.keras not found (train via server/tools/train_gaze_cnn.py)."
            return None
        try:
            from tensorflow import keras

            _model = keras.models.load_model(MODEL_PATH)
            if int(_model.output_shape[-1]) != len(GAZE_CLASSES):
                raise ValueError("gaze head must output %d classes." % len(GAZE_CLASSES))
            print(f"  [gaze] Gaze CNN ready: {MODEL_PATH}")
            return _model
        except Exception as exc:  # noqa: BLE001
            _model_error = f"Gaze CNN load failed: {exc}"
            return None


def warm_up():
    return _load_model()


def is_ready() -> bool:
    return _load_model() is not None


def get_status() -> dict:
    model = _load_model()
    return {
        "ready": model is not None,
        "error": _model_error,
        "config": {
            "version": MODEL_VERSION,
            "input_size": INPUT_SIZE,
            "classes": list(GAZE_CLASSES),
            "confidence_min": CONFIDENCE_MIN,
        },
    }


# (outer_corner, inner_corner, upper_lid, lower_lid) per eye
EYE_LANDMARKS = {
    "left": (33, 133, 159, 145),    # image-left eye
    "right": (362, 263, 386, 374),  # image-right eye (inner, outer, upper, lower)
}


def _single_eye_crop(frame_bgr, outer, inner, upper, lower, width, height):
    """Tight single-eye crop matching the EyeDrive training framing.

    outer/inner/upper/lower are landmark objects with .x/.y normalized coords.
    Returns BGR square crop or None.
    """
    if cv2 is None:
        return None
    x_min, x_max = min(outer.x, inner.x), max(outer.x, inner.x)
    y_mid = (upper.y + lower.y) / 2.0
    bw = x_max - x_min
    if bw < 1e-4:
        return None
    # Framing calibrated to EyeDrive crops: square, eye fills ~80% of the
    # frame. Side = 1.25x eye width, centered on the eye midpoint (pixel
    # space; integer side so both eyes resample identically).
    cx_px = (x_min + x_max) / 2.0 * width
    cy_px = y_mid * height
    side = max(24, int(round(bw * width * 1.25)))
    half = side // 2
    x0 = max(0, int(round(cx_px)) - half)
    y0 = max(0, int(round(cy_px)) - half)
    x1 = min(width, x0 + side)
    y1 = min(height, y0 + side)
    if x1 - x0 < 16 or y1 - y0 < 16:
        return None
    crop = frame_bgr[y0:y1, x0:x1]
    if crop.size == 0:
        return None
    h, w = crop.shape[:2]
    side = max(h, w)
    pad_y, pad_x = (side - h) // 2, (side - w) // 2
    return cv2.copyMakeBorder(crop, pad_y, side - h - pad_y, pad_x, side - w - pad_x,
                              cv2.BORDER_REPLICATE)


def extract_eye_crops(frame_bgr, lm_list, width, height):
    """Per-eye crops from MediaPipe landmarks. Returns [crop, crop] (any may
    be missing) or []. Matches the single-eye EyeDrive training framing."""
    if cv2 is None or frame_bgr is None or not lm_list:
        return []
    crops = []
    for idx in EYE_LANDMARKS.values():
        try:
            outer, inner, upper, lower = (lm_list[i] for i in idx)
        except IndexError:
            continue
        crop = _single_eye_crop(frame_bgr, outer, inner, upper, lower, width, height)
        if crop is not None:
            crops.append(crop)
    return crops


def preprocess(crop_bgr) -> np.ndarray | None:
    if cv2 is None or crop_bgr is None:
        return None
    img = np.asarray(crop_bgr)
    if img.ndim != 3 or img.shape[2] < 3 or img.size == 0:
        return None
    img = cv2.resize(img[:, :, :3], (INPUT_SIZE, INPUT_SIZE))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype("float32")
    return np.expand_dims(img, 0)


def predict(crop_bgr) -> dict | None:
    """Classify one eye crop. Returns {"label", "confidence", "probabilities"}
    (labels are GazeTracker state strings) or None."""
    batch = preprocess(crop_bgr)
    if batch is None:
        return None
    model = _load_model()
    if model is None:
        return None
    try:
        # NOTE: mobilenet_v2.preprocess_input is baked into the saved model
        # graph (applied inside at train time) - pass raw 0-255 RGB only.
        with _lock:
            out = model.predict(batch, verbose=0)
        if out.ndim != 2 or not np.all(np.isfinite(out)):
            return None
        row = out[0].astype(float)
        if abs(row.sum() - 1.0) > 0.05:
            row = np.clip(row, 0.0, None)
            if row.sum() <= 0:
                return None
            row = row / row.sum()
        top = int(row.argmax())
        return {
            "label": GAZE_CLASSES[top],
            "confidence": round(float(row[top]), 4),
            "probabilities": {GAZE_CLASSES[i]: round(float(row[i]) * 100.0, 1)
                              for i in range(len(GAZE_CLASSES))},
        }
    except Exception:  # noqa: BLE001 - degrade gracefully
        return None


def predict_from_landmarks(frame_bgr, lm_list, width, height) -> dict | None:
    """Extract per-eye crops and average their probabilities (batched).

    This is the entry point used by vision_monitor.analyze().
    """
    crops = extract_eye_crops(frame_bgr, lm_list, width, height)
    if not crops:
        return None
    batches = [preprocess(c) for c in crops]
    batches = [b for b in batches if b is not None]
    if not batches:
        return None
    model = _load_model()
    if model is None:
        return None
    try:
        with _lock:
            out = model.predict(np.concatenate(batches, axis=0), verbose=0)
        if out.ndim != 2 or not np.all(np.isfinite(out)):
            return None
        row = out.astype(float).mean(axis=0)  # average across both eyes
        if abs(row.sum() - 1.0) > 0.05:
            row = np.clip(row, 0.0, None)
            if row.sum() <= 0:
                return None
            row = row / row.sum()
        top = int(row.argmax())
        return {
            "label": GAZE_CLASSES[top],
            "confidence": round(float(row[top]), 4),
            "probabilities": {GAZE_CLASSES[i]: round(float(row[i]) * 100.0, 1)
                              for i in range(len(GAZE_CLASSES))},
        }
    except Exception:  # noqa: BLE001 - degrade gracefully
        return None
