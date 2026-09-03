"""
app/ml/engagement_engine.py
==========================
Module 6 - CNN + RNN Interview Behavior Analysis (inference entry point)

Bridges the API layer (routes/session_routes.py) and the RNN (rnn.py):

  1. Keeps a small in-memory rolling window of recent per-tick feature
     vectors for each active session (the CNN output batches the
     frontend posts - see features.py for the vector layout).
  2. Once at least a few ticks are buffered, runs EngagementRNN over the
     window and returns a scored result plus proctoring flags (eye
     contact missing / no face / multiple faces), each gated on a
     minimum number of *consecutive* bad ticks so one noisy frame never
     trips a warning.
  3. Falls back to a simple rule-based estimate (no RNN) if the trained
     weights file isn't present, so the feature keeps working even
     before/without running train_engagement_rnn.py.

State is kept in-process only (a dict keyed by session id) - fine for
this project's scope (a single backend process). For multi-worker
deployment this would move to Redis; noted here rather than hidden.
"""

import os
import threading

import numpy as np

from app.ml.features import (
    TICK_FEATURE_SIZE,
    RNN_WINDOW_SIZE,
    EYE_CONTACT_WARNING_TICKS,
    NO_FACE_WARNING_TICKS,
    MULTI_FACE_WARNING_TICKS,
    tick_to_vector,
)
from app.ml.rnn import EngagementRNN

WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), "weights", "engagement_rnn.npz")

_lock = threading.Lock()
_model = None
_model_load_attempted = False


def _get_model():
    """Lazy-load the trained RNN once per process. Returns None (and the
    engine falls back to rule-based scoring) if no weights file exists
    yet - e.g. train_engagement_rnn.py hasn't been run."""
    global _model, _model_load_attempted
    if _model is not None or _model_load_attempted:
        return _model
    _model_load_attempted = True
    if os.path.exists(WEIGHTS_PATH):
        try:
            _model = EngagementRNN.load(WEIGHTS_PATH)
        except Exception as err:  # pragma: no cover - defensive
            print(f"[engagement_engine] could not load RNN weights: {err}")
            _model = None
    return _model


class _SessionBuffer:
    __slots__ = ("ticks", "consecutive_no_eye_contact", "consecutive_no_face", "consecutive_multi_face")

    def __init__(self):
        self.ticks = []  # list[list[float]] most-recent-last, capped at RNN_WINDOW_SIZE
        self.consecutive_no_eye_contact = 0
        self.consecutive_no_face = 0
        self.consecutive_multi_face = 0


_session_buffers: dict[str, _SessionBuffer] = {}


def _buffer_for(session_id: str) -> _SessionBuffer:
    buf = _session_buffers.get(session_id)
    if buf is None:
        buf = _SessionBuffer()
        _session_buffers[session_id] = buf
    return buf


def clear_session(session_id: str) -> None:
    """Call when a session ends so long-running processes don't leak
    memory across many interviews."""
    _session_buffers.pop(session_id, None)


def _rule_based_scores(window: np.ndarray) -> dict:
    """Simple, explainable fallback used only if the RNN weights aren't
    present - a straight average over the window, same idea as the
    project's original Module 6 aggregate stats, just windowed."""
    if window.shape[0] == 0:
        return {"engagement_score": None, "disengagement_risk": None, "integrity_risk": None}
    face = window[:, 0]
    eye = window[:, 1]
    mult = window[:, 5]
    face_rate = float(face.mean())
    eye_rate = float(eye[face > 0].mean()) if face.sum() > 0 else 0.0
    mult_rate = float(mult.mean())
    engagement = round(100 * (0.5 * face_rate + 0.5 * eye_rate), 1)
    disengagement = round(100 * (1 - (0.5 * face_rate + 0.5 * eye_rate)), 1)
    integrity = round(100 * mult_rate + 100 * (1 - face_rate) * 0.3, 1)
    return {
        "engagement_score": engagement,
        "disengagement_risk": disengagement,
        "integrity_risk": min(100.0, integrity),
    }


def process_ticks(session_id: str, ticks: list[dict]) -> dict:
    """
    Feed a batch of new per-tick CNN feature dicts (already validated by
    the EngagementTick pydantic schema) for a session, update its
    rolling window, run the RNN (or fallback), and return:

        {
          "engagement_score": 0-100 or None,
          "disengagement_risk": 0-100 or None,
          "integrity_risk": 0-100 or None,
          "flags": {
              "eye_contact_missing": bool,
              "no_face_detected": bool,
              "multiple_faces_detected": bool,
          },
          "model": "rnn" | "rule_based",
        }
    """
    with _lock:
        buf = _buffer_for(session_id)

        for tick in ticks:
            vec = tick_to_vector(tick)
            buf.ticks.append(vec)
            if len(buf.ticks) > RNN_WINDOW_SIZE:
                buf.ticks.pop(0)

            face_detected = vec[0] > 0.5
            eye_contact = vec[1] > 0.5
            multi_face = vec[5] > 0.5

            buf.consecutive_no_face = 0 if face_detected else buf.consecutive_no_face + 1
            buf.consecutive_no_eye_contact = 0 if (face_detected and eye_contact) else buf.consecutive_no_eye_contact + 1
            buf.consecutive_multi_face = buf.consecutive_multi_face + 1 if multi_face else 0

        flags = {
            "eye_contact_missing": buf.consecutive_no_eye_contact >= EYE_CONTACT_WARNING_TICKS,
            "no_face_detected": buf.consecutive_no_face >= NO_FACE_WARNING_TICKS,
            "multiple_faces_detected": buf.consecutive_multi_face >= MULTI_FACE_WARNING_TICKS,
        }

        window = np.array(buf.ticks, dtype=np.float64) if buf.ticks else np.zeros((0, TICK_FEATURE_SIZE))

        model = _get_model()
        if model is not None and window.shape[0] >= 4:
            # Pad a short window by repeating the earliest tick, so the
            # RNN always sees a full-length window even early in a
            # session (rather than special-casing variable-length input).
            if window.shape[0] < RNN_WINDOW_SIZE:
                pad = np.repeat(window[0:1], RNN_WINDOW_SIZE - window.shape[0], axis=0)
                window_in = np.concatenate([pad, window], axis=0)
            else:
                window_in = window
            engagement, disengagement, integrity = model.predict(window_in)
            result = {
                "engagement_score": round(float(engagement) * 100, 1),
                "disengagement_risk": round(float(disengagement) * 100, 1),
                "integrity_risk": round(float(integrity) * 100, 1),
                "model": "rnn",
            }
        else:
            result = {**_rule_based_scores(window), "model": "rule_based"}

        result["flags"] = flags
        result["consecutive_no_eye_contact_ticks"] = buf.consecutive_no_eye_contact
        return result
