import json
import os
import threading
import urllib.request

import numpy as np

try:
    import cv2
except Exception:  # noqa: BLE001 - emotion must never break the pipeline
    cv2 = None


TARGET_EMOTIONS = ("nervousness", "confidence", "fear", "confused")

# FER2013 output channel order of the underlying CNN
FER_LABELS = ("angry", "disgust", "fear", "happy", "sad", "surprise", "neutral")

COMPOSITION = {
    "nervousness": {"sad": 0.60, "angry": 0.25, "disgust": 0.15},
    "confidence": {"happy": 1.00},
    "fear": {"fear": 1.00},
    "confused": {"surprise": 0.70, "neutral": 0.30},
}

MODEL_VERSION = "smarthire-emotion-cnn-v2"

_INPUT_SIZE = 48

# Preferred artifact locations (checked in order)
_MODELS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "storage", "models"
)
FOUR_STATE_MODEL_PATH = os.path.join(_MODELS_DIR, "emotion_cnn_4state.keras")
THREE_STATE_MODEL_PATH = os.path.join(_MODELS_DIR, "emotion_cnn_3state.keras")
BACKBONE_PATH = os.path.join(_MODELS_DIR, "facial_expression_model_weights.h5")
DEEPFACE_CACHE_PATH = os.path.join(
    os.environ.get("USERPROFILE", os.path.expanduser("~")),
    ".deepface", "weights", "facial_expression_model_weights.h5",
)
WEIGHTS_URL = os.getenv(
    "EMOTION_WEIGHTS_URL",
    "https://github.com/serengil/deepface_models/releases/download/v1.0/"
    "facial_expression_model_weights.h5",
)

THREE_STATE_CLASSES = ("fear_cluster", "confidence", "confused")

_lock = threading.Lock()
_model = None
_model_error = None
_head_mode = None  # "cnn_4state_head" | "cnn_3state_mirrored" | None (backbone fold)


def get_config():
    return {
        "version": MODEL_VERSION,
        "input_size": _INPUT_SIZE,
        "target_emotions": list(TARGET_EMOTIONS),
        "backbone_classes": list(FER_LABELS),
        "composition": COMPOSITION,
    }


def _ensure_weights_file() -> str | None:
    """Return a usable weights file path, downloading when missing."""
    for candidate in (BACKBONE_PATH, DEEPFACE_CACHE_PATH):
        if os.path.exists(candidate) and os.path.getsize(candidate) > 1024:
            return candidate
    os.makedirs(_MODELS_DIR, exist_ok=True)
    tmp_path = BACKBONE_PATH + ".tmp"
    try:
        req = urllib.request.Request(
            WEIGHTS_URL, headers={"User-Agent": "SmartHireAI/1.0"}
        )
        with urllib.request.urlopen(req, timeout=45) as resp, open(tmp_path, "wb") as fh:
            fh.write(resp.read())
        if os.path.getsize(tmp_path) < 1024:
            raise IOError("Downloaded emotion weights look truncated.")
        os.replace(tmp_path, BACKBONE_PATH)
        return BACKBONE_PATH
    except Exception:  # noqa: BLE001 - degrade gracefully
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except OSError:
            pass
        return None


def _build_backbone():
    """Rebuild the checkpoint's exact Sequential topology (names match the H5)."""
    from tensorflow import keras
    from tensorflow.keras import Sequential
    from tensorflow.keras.layers import (
        AveragePooling2D, Conv2D, Dense, Dropout, Flatten, Input,
        MaxPooling2D,
    )

    m = Sequential(name=MODEL_VERSION)
    m.add(Input(shape=(_INPUT_SIZE, _INPUT_SIZE, 1), name="face_input"))
    m.add(Conv2D(64, (5, 5), activation="relu", name="conv2d_1"))
    m.add(MaxPooling2D(pool_size=(5, 5), strides=(2, 2), name="max_pooling2d_1"))
    m.add(Conv2D(64, (3, 3), activation="relu", name="conv2d_2"))
    m.add(Conv2D(64, (3, 3), activation="relu", name="conv2d_3"))
    m.add(AveragePooling2D(pool_size=(3, 3), strides=(2, 2), name="average_pooling2d_1"))
    m.add(Conv2D(128, (3, 3), activation="relu", name="conv2d_4"))
    m.add(Conv2D(128, (3, 3), activation="relu", name="conv2d_5"))
    m.add(AveragePooling2D(pool_size=(3, 3), strides=(2, 2), name="average_pooling2d_2"))
    m.add(Flatten(name="flatten_1"))
    m.add(Dense(1024, activation="relu", name="dense_1"))
    m.add(Dropout(0.2, name="dropout_1"))
    m.add(Dense(1024, activation="relu", name="dense_2"))
    m.add(Dropout(0.2, name="dropout_2"))
    m.add(Dense(len(FER_LABELS), activation="softmax", name="dense_3"))
    return m


def _load_model():
    """Load a trained head (4-state, else 3-state mirrored), else the backbone."""
    global _model, _model_error, _head_mode
    with _lock:
        if _model is not None or _model_error is not None:
            return _model

        # Preferred: locally trained true 4-class head
        if os.path.exists(FOUR_STATE_MODEL_PATH):
            try:
                from tensorflow import keras

                model = keras.models.load_model(FOUR_STATE_MODEL_PATH)
                if int(model.output_shape[-1]) != len(TARGET_EMOTIONS):
                    raise ValueError("4-state head must output %d classes." % len(TARGET_EMOTIONS))
                _model = model
                _head_mode = "cnn_4state_head"
                print(f"  [emotion] Loaded 4-state CNN head: {FOUR_STATE_MODEL_PATH}")
                return _model
            except Exception as exc:  # noqa: BLE001 - fall through to 3-state
                print(f"  [emotion] 4-state head failed ({exc}); trying 3-state.")

        # Canonical: 3-class head with fear_cluster mirrored into Nervous/Fear
        if os.path.exists(THREE_STATE_MODEL_PATH):
            try:
                from tensorflow import keras

                model = keras.models.load_model(THREE_STATE_MODEL_PATH)
                if int(model.output_shape[-1]) != len(THREE_STATE_CLASSES):
                    raise ValueError(
                        "3-state head must output %d classes." % len(THREE_STATE_CLASSES))
                _model = model
                _head_mode = "cnn_3state_mirrored"
                print(f"  [emotion] Loaded 3-state CNN head (fear mirrored): {THREE_STATE_MODEL_PATH}")
                return _model
            except Exception as exc:  # noqa: BLE001 - fall back to backbone
                print(f"  [emotion] 3-state head failed ({exc}); using backbone.")

        weights_file = _ensure_weights_file()
        if not weights_file:
            _model_error = "FER2013 emotion weights unavailable (no cache, download failed)."
            return None
        try:
            from tensorflow import keras

            backbone = _build_backbone()
            backbone.load_weights(weights_file)
            _model = backbone
            _head_mode = None
            print(f"  [emotion] CNN ready (fer2013 backbone): {weights_file}")
            return _model
        except Exception as exc:  # noqa: BLE001
            _model_error = f"CNN load failed: {exc}"
            return None


def warm_up():
    """Preload weights. Safe to call from a daemon thread."""
    return _load_model()


def is_ready() -> bool:
    return (_load_model() is not None)


def get_status() -> dict:
    model = _load_model()
    if model is None:
        mode = None
    elif _head_mode == "cnn_4state_head":
        mode = "cnn_4state_head"
    elif _head_mode == "cnn_3state_mirrored":
        mode = "cnn_3state_head (fear mirrored)"
    else:
        mode = "fer2013_backbone+fold"
    return {
        "ready": model is not None,
        "mode": mode,
        "error": _model_error,
        "config": get_config(),
    }


def compose_from_fer(fer_probs) -> dict:
    """Fold a 7-channel FER distribution into the 4 interview-readiness states."""
    fer_map = {label: float(fer_probs[i]) for i, label in enumerate(FER_LABELS)}
    raw = {}
    for state, mix in COMPOSITION.items():
        raw[state] = sum(fer_map[src] * share for src, share in mix.items())
    total = sum(raw.values())
    if total <= 0:
        normalized = {state: round(100.0 / len(TARGET_EMOTIONS), 1) for state in TARGET_EMOTIONS}
    else:
        normalized = {state: round(value / total * 100.0, 1) for state, value in raw.items()}
    dominant = max(normalized, key=normalized.get)
    return {"dominant": dominant, "probabilities": normalized}


def preprocess(face_crop) -> np.ndarray | None:
    """RGB/BGR crop -> (1, 48, 48, 1) float32 grayscale in the 0-255 range
    (matching the checkpoint's training-time preprocessing convention)."""
    if cv2 is None or face_crop is None:
        return None
    img = np.asarray(face_crop)
    if img.ndim == 2:
        gray = img
    elif img.ndim == 3 and img.shape[2] >= 3:
        gray = cv2.cvtColor(img[:, :, :3], cv2.COLOR_RGB2GRAY)
    else:
        return None
    if gray.size == 0:
        return None
    gray = cv2.resize(gray, (_INPUT_SIZE, _INPUT_SIZE))
    return gray.astype("float32").reshape(1, _INPUT_SIZE, _INPUT_SIZE, 1)


def predict(face_crop) -> dict | None:
    """Analyze one cropped face. Returns target-state probs or None.

    Output contract mirrors the previous engine:
        {"dominant": str, "probabilities": {state: percent}} over TARGET_EMOTIONS.
    """
    batch = preprocess(face_crop)
    if batch is None:
        return None
    model = _load_model()
    if model is None:
        return None
    try:
        with _lock:
            out = model.predict(batch, verbose=0)
        if out.ndim != 2 or not np.all(np.isfinite(out)):
            return None
        row = out[0].astype(float)
        if abs(row.sum() - 1.0) > 0.05:  # broken/odd output guard
            row = np.clip(row, 0.0, None)
            if row.sum() <= 0:
                return None
            row = row / row.sum()

        if _head_mode == "cnn_4state_head":
            probabilities = {state: round(row[i] * 100.0, 1) for i, state in enumerate(TARGET_EMOTIONS)}
            result = {"dominant": max(probabilities, key=probabilities.get), "probabilities": probabilities}
        elif _head_mode == "cnn_3state_mirrored":
            # fear_cluster split evenly into Nervousness/Fear; others direct
            p3 = {cls: row[i] * 100.0 for i, cls in enumerate(THREE_STATE_CLASSES)}
            half_cluster = round(p3["fear_cluster"] * 0.5, 1)
            probabilities = {
                "nervousness": half_cluster,
                "confidence": round(p3["confidence"], 1),
                "fear": half_cluster,
                "confused": round(p3["confused"], 1),
            }
            result = {"dominant": max(probabilities, key=probabilities.get), "probabilities": probabilities}
        else:  # fer2013 backbone fallback -> fixed composition fold
            result = compose_from_fer(row)

        result["backend_probs"] = {
            (THREE_STATE_CLASSES[i] if _head_mode == "cnn_3state_mirrored"
             else FER_LABELS[i]): round(row[i] * 100.0, 1)
            for i in range(len(row))
        }
        return result
    except Exception:  # noqa: BLE001 - degrade gracefully
        return None


def serialize_result(result) -> str | None:
    if not result:
        return None
    try:
        return json.dumps(result)
    except Exception:  # noqa: BLE001
        return None
