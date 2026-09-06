"""
backend/ai/cv_service.py
HireAI — Module 6 Computer Vision Analysis Service

Port:  8767
Start: D:\\Role-Based Dashboard System\\tts-venv\\Scripts\\python.exe cv_service.py

Endpoints:
  GET  /health   — liveness + model readiness
  POST /analyze  — JSON {file_path, interview_id} → full CV analysis result

Pipeline (post-interview only, never during live interview):
  WebM video on disk
  → cv2.VideoCapture (no FFmpeg needed — OpenCV 5 handles WebM natively)
  → ~1 FPS frame sampling (read every int(fps) frames)
  → YuNet face detection (cv2.FaceDetectorYN, ONNX model already on disk)
    → face crop → ResNet-18 dual-head (best_checkpoint.pt, PyTorch)
       → 6 sigmoid probabilities:
          affect  head: disquietment, fear, doubt_confusion
          behavior head: confidence,  engagement, disconnection
    → eye region iris centroid → gaze direction estimate
    → 5-landmark solvePnP → head pose (yaw/pitch/roll)
  → frame-level aggregation → interview-level behavioral scores

Engagement Estimate formula (documented below in aggregate_results).
All scores derived from observable signals.  null returned when data is
insufficient rather than fabricating a value.
"""

import argparse
import json
import os
import sys
import time
import traceback
from http.server import BaseHTTPRequestHandler, HTTPServer

import cv2
import numpy as np
import torch
import torch.nn as nn
from torchvision import models
from torchvision.models import ResNet18_Weights


# =============================================================================
# 1. Constants
# =============================================================================

LABEL_NAMES = [
    "disquietment",    # index 0 — affect head (Head A)
    "fear",            # index 1 — affect head (Head A)
    "doubt_confusion", # index 2 — affect head (Head A)
    "confidence",      # index 3 — behavior head (Head B)
    "engagement",      # index 4 — behavior head (Head B)
    "disconnection",   # index 5 — behavior head (Head B)
]

# Must exactly match EVAL_TRANSFORM in train_resnet.py
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]
IMG_SIZE      = 224

# Face sampling
TARGET_FPS      = 1.0      # sample ~1 frame per second
MAX_FRAMES      = 10_000   # safety limit
YUNET_THRESHOLD = 0.55     # confidence threshold for face detection

# Minimum samples for each derived metric
MIN_FACES_FOR_GAZE      = 3
MIN_FACES_FOR_ACTIVITY  = 5

# Head pose: facing-camera thresholds (degrees)
FACING_YAW_DEG   = 30.0
FACING_PITCH_DEG = 25.0

# 3D canonical face model (mm) — order matches YuNet landmarks:
#   nose_tip, right_eye, left_eye, mouth_right, mouth_left
MODEL_3D_POINTS = np.float32([
    [ 0.0,   0.0,   0.0],   # nose tip (origin)
    [-30.0, -30.0, -25.0],  # right eye (YuNet right_eye → model's viewer-left)
    [ 30.0, -30.0, -25.0],  # left eye
    [-20.0,  20.0, -25.0],  # mouth right corner
    [ 20.0,  20.0, -25.0],  # mouth left corner
])

_SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
CHECKPOINT_PATH = os.path.join(_SERVICE_DIR, "cv_model", "best_checkpoint.pt")
YUNET_PATH      = os.path.join(_SERVICE_DIR, "cv_model", "face_detection_yunet_2023mar.onnx")

# =============================================================================
# 2. Model Architecture — must exactly match train_resnet.py
# =============================================================================

class InterviewResNet(nn.Module):
    """
    ResNet-18 dual-head for interview behavioral analysis.

    Backbone: ResNet-18 feature extractor (no final FC layer) → (B,512,1,1)
    affect_head:   Sequential(Dropout(0.3), Linear(512,3)) → 3 logits (Head A)
    behavior_head: Sequential(Dropout(0.3), Linear(512,3)) → 3 logits (Head B)

    forward() returns (affect_logits, behavior_logits), each (B,3).
    Caller applies torch.sigmoid() to get probabilities.

    Label assignment (matches class_labels.json and LABEL_NAMES above):
      affect_logits[:,0] = disquietment
      affect_logits[:,1] = fear
      affect_logits[:,2] = doubt_confusion
      behavior_logits[:,0] = confidence
      behavior_logits[:,1] = engagement
      behavior_logits[:,2] = disconnection
    """

    def __init__(self):
        super().__init__()
        # Load pretrained weights just to build architecture correctly.
        # We will overwrite with our fine-tuned checkpoint immediately after.
        base = models.resnet18(weights=None)
        # Remove the final average pool and FC → keep as Sequential to
        # match train_resnet.py exactly (backbone includes avgpool).
        self.backbone     = nn.Sequential(*list(base.children())[:-1])
        self.affect_head   = nn.Sequential(nn.Dropout(p=0.3), nn.Linear(512, 3))
        self.behavior_head = nn.Sequential(nn.Dropout(p=0.3), nn.Linear(512, 3))

    def forward(self, x):
        feats    = self.backbone(x).flatten(1)    # (B, 512)
        affect   = self.affect_head(feats)         # (B, 3) — logits
        behavior = self.behavior_head(feats)        # (B, 3) — logits
        return affect, behavior


# =============================================================================
# 3. Global state (loaded once at startup, read-only thereafter)
# =============================================================================

_model         = None   # InterviewResNet in eval mode
_device        = None   # torch.device
_checkpoint_meta = {}   # epoch, val_ap from checkpoint
_yunet         = None   # cv2.FaceDetectorYN
_model_ready   = False
_startup_errors = []    # non-fatal warnings


# =============================================================================
# 4. Startup: load model and detectors
# =============================================================================

def load_model():
    """
    Load best_checkpoint.pt into InterviewResNet.
    Sets _model, _device, _checkpoint_meta, _model_ready globals.
    Called once at startup.
    """
    global _model, _device, _checkpoint_meta, _model_ready

    if not os.path.isfile(CHECKPOINT_PATH):
        _startup_errors.append(f"Checkpoint not found: {CHECKPOINT_PATH}")
        return

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[CV] Device: {_device}", flush=True)

    try:
        ckpt = torch.load(CHECKPOINT_PATH, map_location="cpu", weights_only=True)
    except Exception as e:
        _startup_errors.append(f"Failed to load checkpoint: {e}")
        return

    # Verify the checkpoint label order matches our LABEL_NAMES
    ckpt_labels = ckpt.get("label_names", [])
    if ckpt_labels != LABEL_NAMES:
        _startup_errors.append(
            f"Checkpoint label_names mismatch: got {ckpt_labels}, expected {LABEL_NAMES}"
        )
        return

    _checkpoint_meta = {
        "epoch":       ckpt.get("epoch"),
        "val_ap":      ckpt.get("val_ap"),
        "architecture": ckpt.get("architecture"),
    }

    _model = InterviewResNet()
    missing, unexpected = _model.load_state_dict(ckpt["model_state_dict"], strict=True)
    if missing or unexpected:
        _startup_errors.append(f"State dict mismatch: missing={missing} unexpected={unexpected}")
        _model = None
        return

    _model.to(_device)
    _model.eval()

    # Sanity check: forward a dummy batch
    with torch.inference_mode():
        dummy = torch.zeros(2, 3, IMG_SIZE, IMG_SIZE, device=_device)
        a, b  = _model(dummy)
        assert a.shape == (2, 3), f"affect_head shape mismatch: {a.shape}"
        assert b.shape == (2, 3), f"behavior_head shape mismatch: {b.shape}"

    _model_ready = True
    print(
        f"[CV] Model ready — epoch={_checkpoint_meta['epoch']} "
        f"val_ap={_checkpoint_meta['val_ap']:.4f} device={_device}",
        flush=True
    )


def load_detectors():
    """Load YuNet face detector (once at startup)."""
    global _yunet

    if os.path.isfile(YUNET_PATH):
        # Create with a dummy size; will be re-set per-frame in detect_face()
        _yunet = cv2.FaceDetectorYN.create(
            YUNET_PATH, "", (640, 480),
            score_threshold=YUNET_THRESHOLD,
            nms_threshold=0.3,
            top_k=1,
        )
        print(f"[CV] YuNet detector loaded.", flush=True)
    else:
        _startup_errors.append(f"YuNet model not found: {YUNET_PATH}")


# =============================================================================
# 5. Preprocessing — identical to EVAL_TRANSFORM in train_resnet.py
# =============================================================================

def preprocess_face(bgr_crop):
    """
    What enters: BGR face crop (any size, uint8).
    What it computes:
      1. Convert BGR → RGB (model was trained on PIL.Image RGB)
      2. Resize to 224×224
      3. float32 / 255.0
      4. Transpose to CHW
      5. Normalize per-channel with ImageNet mean/std
    What it returns: torch.Tensor (1, 3, 224, 224) on CPU.

    IMPORTANT: No grayscale conversion.  Training used PIL.Image.open().convert("RGB")
    which preserves color.  The old cv_service.py skeleton was wrong to add grayscale.
    """
    rgb  = cv2.cvtColor(bgr_crop, cv2.COLOR_BGR2RGB)
    rgb  = cv2.resize(rgb, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_LINEAR)
    t    = rgb.astype("float32") / 255.0
    t    = t.transpose(2, 0, 1)                  # HWC → CHW
    for c in range(3):
        t[c] = (t[c] - IMAGENET_MEAN[c]) / IMAGENET_STD[c]
    return torch.from_numpy(t).unsqueeze(0)      # (1, 3, 224, 224)


# =============================================================================
# 6. Face Detection
# =============================================================================

def detect_face(bgr_frame):
    """
    What enters: a single BGR video frame (h,w,3 uint8).
    What it computes:
      Run YuNet face detector — returns the highest-confidence face.
    What it returns:
      (bbox, landmarks, conf) where
        bbox       = (x, y, w, h) int tuple
        landmarks  = np.float32 array (5,2):
                     [[right_eye_x, right_eye_y],
                      [left_eye_x,  left_eye_y],
                      [nose_x,      nose_y],
                      [mouth_rx,    mouth_ry],
                      [mouth_lx,    mouth_ly]]
        conf       = float confidence score
      or (None, None, 0.0) if no face detected.
    """
    h, w = bgr_frame.shape[:2]

    if _yunet is None:
        return None, None, 0.0

    _yunet.setInputSize((w, h))
    _, faces = _yunet.detect(bgr_frame)
    if faces is not None and len(faces) > 0:
        f = faces[0]
        bbox = (int(f[0]), int(f[1]), int(f[2]), int(f[3]))
        landmarks = np.float32([
            [f[4],  f[5] ],   # right_eye
            [f[6],  f[7] ],   # left_eye
            [f[8],  f[9] ],   # nose_tip
            [f[10], f[11]],   # mouth_right
            [f[12], f[13]],   # mouth_left
        ])
        conf = float(f[14])
        return bbox, landmarks, conf

    return None, None, 0.0


# =============================================================================
# 7. Gaze Direction Estimate
# =============================================================================

def estimate_gaze(bgr_frame, bbox, landmarks):
    """
    What enters:
      bgr_frame  — full BGR frame
      bbox       — (x, y, w, h) face bounding box
      landmarks  — (5,2) float32 array: right_eye, left_eye, nose, mouth_r, mouth_l

    What it computes:
      For each eye:
        1. Crop a region centered on the eye landmark (width = face_width * 0.25,
           height = face_width * 0.15).
        2. Convert to grayscale, CLAHE-equalize.
        3. Threshold to find the darkest 15% of pixels (iris region).
        4. Compute iris centroid relative to the eye crop center.
        5. Normalized horizontal offset = |iris_cx - crop_center_x| / (crop_w / 2)
           clamped to [0, 1].
      Gaze score = 1 - mean(normalized_offsets for both eyes).
        → 1.0 means iris centered = looking at camera
        → 0.0 means iris at edge  = looking away

    What it returns:
      { "looking_at_camera": bool (score > 0.5),
        "gaze_score": float [0,1] }
      or None if eye crops are too small (<10px in any dimension).
    """
    fx, fy, fw, fh = bbox
    eye_w  = max(10, int(fw * 0.28))
    eye_h  = max(10, int(fh * 0.18))

    offsets = []
    for i in range(2):                          # 0=right_eye, 1=left_eye
        ex, ey = int(landmarks[i, 0]), int(landmarks[i, 1])
        x1 = max(0, ex - eye_w // 2)
        y1 = max(0, ey - eye_h // 2)
        x2 = min(bgr_frame.shape[1], x1 + eye_w)
        y2 = min(bgr_frame.shape[0], y1 + eye_h)

        crop = bgr_frame[y1:y2, x1:x2]
        if crop.shape[0] < 8 or crop.shape[1] < 8:
            continue

        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

        # CLAHE to normalize lighting
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
        gray  = clahe.apply(gray)

        # Find darkest 15% threshold (iris is darker than sclera)
        thresh_val = int(np.percentile(gray, 15))
        _, mask    = cv2.threshold(gray, thresh_val, 255, cv2.THRESH_BINARY_INV)

        M = cv2.moments(mask)
        if M["m00"] < 1.0:
            continue

        iris_cx = M["m10"] / M["m00"]
        center_x = crop.shape[1] / 2.0
        norm_offset = abs(iris_cx - center_x) / (crop.shape[1] / 2.0 + 1e-6)
        offsets.append(min(1.0, norm_offset))

    if not offsets:
        return None

    gaze_score = float(1.0 - np.mean(offsets))
    return {
        "looking_at_camera": gaze_score > 0.50,
        "gaze_score":        round(gaze_score, 4),
    }


# =============================================================================
# 8. Head Pose Estimate (solvePnP)
# =============================================================================

def estimate_head_pose(frame_shape, landmarks):
    """
    What enters:
      frame_shape — (height, width, channels)
      landmarks   — (5,2) float32 array from YuNet:
                    right_eye, left_eye, nose_tip, mouth_right, mouth_left

    What it computes:
      Uses cv2.solvePnP with a canonical 5-point 3D face model to estimate
      the head rotation vector.  Converts to Euler angles via Rodrigues.

      Camera matrix is approximated from frame dimensions:
        focal_length ≈ frame_width (reasonable for webcam FOV ~60°)
        principal point = frame center

    What it returns:
      { "yaw": float (deg), "pitch": float (deg), "roll": float (deg),
        "facing_camera": bool }
      facing_camera = True when |yaw| < 30° AND |pitch| < 25°.
      or None if solvePnP fails.

    NOTE: Absolute angle values from a single-camera approximation are
    not calibrated.  Use only as a relative/ordinal indicator, not a
    precise measurement.
    """
    h, w = frame_shape[:2]
    focal  = float(w)
    cam_mtx = np.float32([
        [focal, 0,     w / 2.0],
        [0,     focal, h / 2.0],
        [0,     0,     1.0    ],
    ])
    dist = np.zeros((4, 1), dtype=np.float32)

    # 6-point 3D model (6th = chin, estimated below face midpoint).
    # OpenCV 5 SOLVEPNP_ITERATIVE requires >= 6 points (changed from 4 in OpenCV 4).
    model_3d_6pt = np.float32([
        [ 0.0,   0.0,   0.0],   # nose tip (origin)
        [-30.0, -30.0, -25.0],  # right eye
        [ 30.0, -30.0, -25.0],  # left eye
        [-20.0,  20.0, -25.0],  # mouth right
        [ 20.0,  20.0, -25.0],  # mouth left
        [  0.0,  45.0, -30.0],  # chin (synthetic — below mouth midpoint)
    ])

    # Chin is estimated in image space as 1.5x the nose->mouth_mid vector
    mouth_mid_x = (landmarks[3, 0] + landmarks[4, 0]) / 2.0
    mouth_mid_y = (landmarks[3, 1] + landmarks[4, 1]) / 2.0
    nose_x, nose_y = landmarks[2, 0], landmarks[2, 1]
    chin_x = nose_x + 1.5 * (mouth_mid_x - nose_x)
    chin_y = nose_y + 1.5 * (mouth_mid_y - nose_y)

    image_pts = np.float32([
        landmarks[2],          # nose_tip
        landmarks[0],          # right_eye
        landmarks[1],          # left_eye
        landmarks[3],          # mouth_right
        landmarks[4],          # mouth_left
        [chin_x, chin_y],      # chin (synthetic)
    ])

    try:
        success, rvec, tvec = cv2.solvePnP(
            model_3d_6pt, image_pts, cam_mtx, dist,
            flags=cv2.SOLVEPNP_ITERATIVE
        )
    except cv2.error:
        return None

    if not success:
        return None

    rmat, _ = cv2.Rodrigues(rvec)

    # Decompose rotation matrix to Euler angles (in radians)
    # Using standard ZYX convention
    sy = float(np.sqrt(rmat[0, 0] ** 2 + rmat[1, 0] ** 2))
    singular = sy < 1e-6

    if not singular:
        pitch = float(np.arctan2(-rmat[2, 0], sy))
        yaw   = float(np.arctan2( rmat[1, 0], rmat[0, 0]))
        roll  = float(np.arctan2( rmat[2, 1], rmat[2, 2]))
    else:
        pitch = float(np.arctan2(-rmat[2, 0], sy))
        yaw   = 0.0
        roll  = float(np.arctan2(-rmat[1, 2], rmat[1, 1]))

    yaw_deg   = float(np.degrees(yaw))
    pitch_deg = float(np.degrees(pitch))
    roll_deg  = float(np.degrees(roll))

    facing = (abs(yaw_deg) < FACING_YAW_DEG) and (abs(pitch_deg) < FACING_PITCH_DEG)

    return {
        "yaw":           round(yaw_deg,   2),
        "pitch":         round(pitch_deg, 2),
        "roll":          round(roll_deg,  2),
        "facing_camera": bool(facing),
    }


# =============================================================================
# 9. Batch CNN Inference
# =============================================================================

@torch.inference_mode()
def run_batch_inference(bgr_crops):
    """
    What enters: list of BGR face crops (variable size, uint8).
    What it computes:
      - Preprocess each crop with preprocess_face() → (1,3,224,224)
      - Stack → (N,3,224,224) batch
      - Forward through InterviewResNet dual-head (no gradient)
      - Concatenate [affect_sigmoid, behavior_sigmoid] → (N,6)
      - Column order matches LABEL_NAMES exactly.
    What it returns:
      np.ndarray (N,6) float32 with values in [0,1].
      Returns empty array shape (0,6) for empty input.
    """
    if not bgr_crops or not _model_ready:
        return np.empty((0, 6), dtype=np.float32)

    tensors = [preprocess_face(c) for c in bgr_crops]  # list of (1,3,224,224)
    batch   = torch.cat(tensors, dim=0).to(_device)     # (N,3,224,224)

    affect_logits, behavior_logits = _model(batch)      # each (N,3)

    affect_probs   = torch.sigmoid(affect_logits).cpu().numpy()    # (N,3)
    behavior_probs = torch.sigmoid(behavior_logits).cpu().numpy()  # (N,3)

    return np.concatenate([affect_probs, behavior_probs], axis=1)  # (N,6)


# =============================================================================
# 10. Video Frame Sampler
# =============================================================================

def sample_frames(video_path):
    """
    What enters: absolute path to a video file (WebM, MP4, etc.).
    What it computes:
      Opens with cv2.VideoCapture (works with WebM without FFmpeg).
      Reads fps; falls back to 15 if unreported.
      Yields every int(fps / TARGET_FPS) decoded frame (~1 per second).
      Stops at MAX_FRAMES sampled frames (safety cap).
    What it yields:
      (frame_index: int, timestamp_s: float, bgr_frame: np.ndarray)
    Raises FileNotFoundError if the path does not exist.
    """
    if not os.path.isfile(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"cv2.VideoCapture could not open: {video_path}")

    reported_fps = cap.get(cv2.CAP_PROP_FPS)
    fps          = reported_fps if reported_fps > 0 else 15.0
    interval     = max(1, int(fps / TARGET_FPS))

    print(f"[CV] Video fps={fps:.2f}  sampling every {interval} frames "
          f"(~{TARGET_FPS} fps)", flush=True)

    raw_idx    = 0
    sampled    = 0
    try:
        while sampled < MAX_FRAMES:
            ok, frame = cap.read()
            if not ok:
                break
            if raw_idx % interval == 0:
                timestamp = raw_idx / fps
                yield raw_idx, round(timestamp, 3), frame
                sampled += 1
            raw_idx += 1
    finally:
        cap.release()

    print(f"[CV] Sampled {sampled} frames from {raw_idx} total frames", flush=True)


# =============================================================================
# 11. Interview-level Aggregation
# =============================================================================

def aggregate_results(frame_records, all_probs):
    """
    What enters:
      frame_records — list of per-frame dicts (from the analysis loop):
        { frame_idx, timestamp_s, face_detected, gaze, head_pose }
      all_probs     — np.ndarray (M, 6) float32 for M frames that had a face.
        Column order = LABEL_NAMES.

    What it computes and returns:
      A dict of interview-level scores.  Each score is either a float
      rounded to 4 decimal places, or None if insufficient data.

    ─── Face presence ──────────────────────────────────────────────────────
      face_detection_rate = frames_with_face / total_frames

    ─── Eye contact ────────────────────────────────────────────────────────
      eye_contact_pct = 100 × (frames where gaze.looking_at_camera) /
                              (frames with face AND gaze data)
      null if fewer than MIN_FACES_FOR_GAZE (=3) frames have gaze data.

    ─── Head pose ──────────────────────────────────────────────────────────
      facing_camera_rate = fraction of frames_with_face where facing_camera=True
      head_movement_deg  = mean( |yaw| + |pitch| ) across frames with pose
      null if no pose available.

    ─── Attention estimate ─────────────────────────────────────────────────
      attention_score = 0.55 × (eye_contact_pct/100) + 0.45 × facing_camera_rate
      null if either component is null.

    ─── CNN mean probabilities ─────────────────────────────────────────────
      cnn_mean_probs = column-wise mean of all_probs (one float per label)
      null per-label if no frames with face.

    ─── Facial activity (temporal variability of affect) ───────────────────
      For each frame i with face, compute affect_mean_i = mean of
      [disquietment, fear, doubt_confusion] probs.
      facial_activity = std(affect_mean_i over all such frames).
      Represents how much the affect head signals vary over time.
      null if fewer than MIN_FACES_FOR_ACTIVITY (=5) frames with face.

    ─── Engagement Estimate (composite — per PDF specification) ────────────
      PDF: Emotion + Eye Contact + Attention + Facial Activity → Engagement.

      Components (only non-null components contribute):
        E1 = cnn_mean_probs["engagement"]          weight 0.35
             (raw CNN signal for "engagement" behavior)
        E2 = eye_contact_pct / 100                 weight 0.30
        E3 = attention_score                        weight 0.20
        E4 = facial_activity_score (normalised)    weight 0.15
             = min(1.0, facial_activity / 0.15)
             (high temporal variability → more animated engagement)

      Weighted mean over available components (weights renormalized).
      Returns null if E1 (CNN) is unavailable (no face frames).

    ─── Confidence-related behavioral indicator ────────────────────────────
      confidence_indicator = cnn_mean_probs["confidence"]
      This is the raw CNN behavioral signal.  It is NOT a psychological
      measurement of the candidate's actual confidence.
      Presented only as a behavioral indicator for recruiter reference.
    """
    total_frames    = len(frame_records)
    frames_with_face = sum(1 for r in frame_records if r["face_detected"])

    face_detection_rate = (
        round(frames_with_face / total_frames, 4) if total_frames > 0 else None
    )

    # ── Eye contact ──────────────────────────────────────────────────────────
    gaze_records = [r["gaze"] for r in frame_records
                    if r["face_detected"] and r["gaze"] is not None]
    n_gaze = len(gaze_records)

    if n_gaze >= MIN_FACES_FOR_GAZE:
        looking = sum(1 for g in gaze_records if g["looking_at_camera"])
        eye_contact_pct = round(100.0 * looking / n_gaze, 2)
    else:
        eye_contact_pct = None

    # ── Head pose ─────────────────────────────────────────────────────────
    pose_records = [r["head_pose"] for r in frame_records
                    if r["face_detected"] and r["head_pose"] is not None]
    n_pose = len(pose_records)

    if n_pose > 0:
        facing_count       = sum(1 for p in pose_records if p["facing_camera"])
        facing_camera_rate = round(facing_count / n_pose, 4)
        head_movement_deg  = round(
            float(np.mean([abs(p["yaw"]) + abs(p["pitch"]) for p in pose_records])), 2
        )
    else:
        facing_camera_rate = None
        head_movement_deg  = None

    # ── Attention ─────────────────────────────────────────────────────────
    if eye_contact_pct is not None and facing_camera_rate is not None:
        attention_score = round(
            0.55 * (eye_contact_pct / 100.0) + 0.45 * facing_camera_rate, 4
        )
    else:
        attention_score = None

    # ── CNN mean probs ────────────────────────────────────────────────────
    M = all_probs.shape[0]
    if M > 0:
        mean_probs = all_probs.mean(axis=0)                          # (6,)
        cnn_mean   = {n: round(float(mean_probs[i]), 4)
                      for i, n in enumerate(LABEL_NAMES)}
    else:
        cnn_mean  = {n: None for n in LABEL_NAMES}
        mean_probs = None

    # ── Facial activity ────────────────────────────────────────────────────
    if M >= MIN_FACES_FOR_ACTIVITY:
        # Affect cols: disquietment=0, fear=1, doubt_confusion=2
        affect_means = all_probs[:, :3].mean(axis=1)  # (M,)
        facial_activity = round(float(np.std(affect_means)), 4)
    else:
        facial_activity = None

    # ── Engagement Estimate (composite) ──────────────────────────────────────
    # E1: CNN engagement prob (raw behavioral signal)
    E1 = cnn_mean.get("engagement") if mean_probs is not None else None

    if E1 is None:
        engagement_estimate = None
    else:
        components = [(E1, 0.35)]

        E2 = (eye_contact_pct / 100.0) if eye_contact_pct is not None else None
        if E2 is not None:
            components.append((E2, 0.30))

        E3 = attention_score
        if E3 is not None:
            components.append((E3, 0.20))

        E4 = None
        if facial_activity is not None:
            # Normalise: 0.15 rad std is treated as full engagement
            E4 = min(1.0, float(facial_activity) / 0.15)
            components.append((E4, 0.15))

        # Weighted mean — renormalise weights over available components
        total_w = sum(w for _, w in components)
        engagement_estimate = round(
            sum(v * w for v, w in components) / total_w, 4
        )

    # ── Confidence-related behavioral indicator ─────────────────────────────
    confidence_indicator = cnn_mean.get("confidence")

    return {
        "frames_total":          total_frames,
        "frames_with_face":      frames_with_face,
        "face_detection_rate":   face_detection_rate,
        "eye_contact_pct":       eye_contact_pct,
        "facing_camera_rate":    facing_camera_rate,
        "head_movement_deg":     head_movement_deg,
        "attention_score":       attention_score,
        "engagement_estimate":   engagement_estimate,
        "confidence_indicator":  confidence_indicator,   # behavioral only
        "disquietment_level":    cnn_mean.get("disquietment"),
        "fear_level":            cnn_mean.get("fear"),
        "doubt_confusion_level": cnn_mean.get("doubt_confusion"),
        "disconnection_level":   cnn_mean.get("disconnection"),
        "facial_activity":       facial_activity,
        "cnn_mean_probs":        cnn_mean,
    }


# =============================================================================
# 12. Main Analysis Entry Point
# =============================================================================

def analyze_video(file_path, interview_id):
    """
    Full CV analysis pipeline for one interview recording.

    What enters: path to the WebM video, integer interview_id.
    What it returns: dict with keys:
      interview_id, status ("ok" | "error"),
      scores (from aggregate_results), per_frame_raw (list),
      analyzed_at (ISO string), error (string or null).

    Processing:
      1. Sample frames at ~1 FPS.
      2. Detect face per frame (YuNet → Haar fallback).
      3. Collect all face crops for batch CNN inference.
      4. Estimate gaze + head pose per frame.
      5. Batch-infer all crops in one GPU pass.
      6. Aggregate to interview-level scores.
      7. Return compact per-frame records for audit trail.
    """
    print(f"\n[CV] Analyzing interview={interview_id}  file={file_path}", flush=True)
    t_start = time.time()

    frame_records = []
    face_crops    = []       # BGR crops in order, for batch inference
    face_frame_idxs = []     # which frame_records indices have a face

    # ── Phase 1: frame-by-frame detection, gaze, head pose ──────────────────
    for frame_idx, ts, bgr in sample_frames(file_path):
        rec = {
            "frame_idx":    frame_idx,
            "timestamp_s":  ts,
            "face_detected": False,
            "face_conf":    0.0,
            "gaze":         None,
            "head_pose":    None,
        }

        bbox, landmarks, conf = detect_face(bgr)

        if bbox is not None:
            x, y, w, h = bbox
            # Clamp crop to frame bounds
            x1 = max(0, x)
            y1 = max(0, y)
            x2 = min(bgr.shape[1], x + w)
            y2 = min(bgr.shape[0], y + h)
            crop = bgr[y1:y2, x1:x2]

            if crop.size > 0:
                rec["face_detected"] = True
                rec["face_conf"]     = round(conf, 3)
                rec["gaze"]          = estimate_gaze(bgr, bbox, landmarks)
                rec["head_pose"]     = estimate_head_pose(bgr.shape, landmarks)

                face_crops.append(crop)
                face_frame_idxs.append(len(frame_records))

        frame_records.append(rec)

    n_face_frames = len(face_crops)
    print(f"[CV] {n_face_frames} frames with face out of {len(frame_records)} sampled",
          flush=True)

    # ── Phase 2: batch CNN inference (one GPU pass) ──────────────────────────
    all_probs = run_batch_inference(face_crops)   # (M, 6) or (0, 6)

    # ── Attach per-frame CNN probs back to frame records ────────────────────
    for batch_i, record_i in enumerate(face_frame_idxs):
        probs = all_probs[batch_i]
        frame_records[record_i]["cnn_probs"] = {
            n: round(float(probs[j]), 4) for j, n in enumerate(LABEL_NAMES)
        }

    # ── Phase 3: interview-level aggregation ────────────────────────────────
    scores = aggregate_results(frame_records, all_probs)
    scores["interview_id"] = interview_id

    elapsed = round(time.time() - t_start, 1)
    print(f"[CV] Analysis done in {elapsed}s — "
          f"engagement_estimate={scores['engagement_estimate']} "
          f"eye_contact_pct={scores['eye_contact_pct']}",
          flush=True)

    # ── Compact per-frame records for DB audit trail ─────────────────────────
    # Keep only non-None fields to minimise JSONB size.
    per_frame_raw = []
    for r in frame_records:
        row = {
            "fi": r["frame_idx"],
            "ts": r["timestamp_s"],
            "fd": r["face_detected"],
        }
        if r["face_detected"]:
            row["fc"] = r["face_conf"]
            if r.get("cnn_probs"):
                row["p"] = list(r["cnn_probs"].values())   # 6 floats, LABEL_NAMES order
            if r["gaze"]:
                row["g"] = {
                    "lac": r["gaze"]["looking_at_camera"],
                    "gs":  r["gaze"]["gaze_score"],
                }
            if r["head_pose"]:
                p = r["head_pose"]
                row["hp"] = {
                    "y": p["yaw"], "p": p["pitch"],
                    "r": p["roll"], "fc": p["facing_camera"],
                }
        per_frame_raw.append(row)

    return {
        "interview_id":    interview_id,
        "status":          "ok",
        "scores":          scores,
        "per_frame_raw":   per_frame_raw,
        "analyzed_at":     time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "elapsed_s":       elapsed,
        "error":           None,
    }


# =============================================================================
# 12. Live Single Frame Analysis (Webcam stream at ~1-2 FPS)
# =============================================================================

def analyze_single_frame(bgr_frame):
    """
    Analyzes a single live webcam frame for the candidate interview screen.
    What enters:
      bgr_frame — numpy ndarray (H, W, 3) uint8 decoded from candidate webcam.
    What it computes:
      1. YuNet face detection -> (bbox, landmarks, conf)
      2. If face found:
         - Gaze direction & score
         - 6-point solvePnP head pose
         - ResNet-18 dual-head CNN inference (1 face crop) -> 6 probabilities
         - Transparent, deterministic Face Visibility %:
             Containment factor (40%) + Orientation factor (40%) + Quality factor (20%)
      3. If no face found:
         - Tests frame brightness for camera blockage detection
    What it returns:
      Dictionary with face_detected, bbox, normalized_bbox, emotions, confidence,
      gaze, head_pose, face_visibility_pct, camera_status.
    """
    if bgr_frame is None or bgr_frame.size == 0:
        return {
            "status": "error",
            "error": "Empty frame provided",
            "face_detected": False,
            "face_visibility_pct": 0.0,
            "camera_status": "unavailable",
        }

    H, W = bgr_frame.shape[:2]
    mean_val = float(np.mean(bgr_frame))
    is_blocked = mean_val < 8.0  # severely dark/obscured camera

    bbox, landmarks, conf = detect_face(bgr_frame)

    if bbox is None:
        return {
            "status": "ok",
            "face_detected": False,
            "bbox": None,
            "normalized_bbox": None,
            "frame_size": [int(W), int(H)],
            "conf": 0.0,
            "emotions": None,
            "confidence": None,
            "gaze": None,
            "head_pose": None,
            "face_visibility_pct": 0.0,
            "camera_status": "blocked" if is_blocked else "no_face",
        }

    x, y, w, h = bbox
    # Clamp crop to frame bounds
    x1, y1 = max(0, x), max(0, y)
    x2, y2 = min(W, x + w), min(H, y + h)
    crop = bgr_frame[y1:y2, x1:x2]

    if crop.size == 0:
        return {
            "status": "ok",
            "face_detected": False,
            "bbox": None,
            "normalized_bbox": None,
            "frame_size": [int(W), int(H)],
            "conf": 0.0,
            "emotions": None,
            "confidence": None,
            "gaze": None,
            "head_pose": None,
            "face_visibility_pct": 0.0,
            "camera_status": "no_face",
        }

    # Gaze & Head pose
    gaze      = estimate_gaze(bgr_frame, bbox, landmarks)
    head_pose = estimate_head_pose(bgr_frame.shape, landmarks)

    # CNN Inference (batch of 1)
    probs_batch = run_batch_inference([crop])  # (1, 6)
    probs = probs_batch[0] if len(probs_batch) > 0 else np.zeros(6, dtype=np.float32)

    # ── Face Visibility % Calculation (Documented Formula) ──────────────────
    # 1. Containment Factor (0..1): Overlap of bounding box with visible frame bounds
    vis_area = max(0, x2 - x1) * max(0, y2 - y1)
    box_area = max(1, w * h)
    f_containment = min(1.0, max(0.0, vis_area / box_area))

    # 2. Orientation Factor (0..1): Penalize head yaw/pitch beyond 15°
    if head_pose is not None:
        yaw = abs(head_pose.get("yaw", 0.0))
        pitch = abs(head_pose.get("pitch", 0.0))
        yaw_score = max(0.0, 1.0 - max(0.0, yaw - 15.0) / 30.0)
        pitch_score = max(0.0, 1.0 - max(0.0, pitch - 15.0) / 30.0)
        f_orientation = min(1.0, max(0.0, 0.60 * yaw_score + 0.40 * pitch_score))
    else:
        f_orientation = 0.80

    # 3. Quality Factor (0..1): Detection confidence
    f_quality = min(1.0, max(0.50, float(conf)))

    # Composite Visibility:
    # If less than 20% of face box is inside the camera frame, visibility is 0%
    if f_containment < 0.20:
        face_visibility_pct = 0.0
    else:
        raw_vis = 0.40 * f_containment + 0.40 * f_orientation + 0.20 * f_quality
        face_visibility_pct = round(100.0 * min(1.0, max(0.0, raw_vis)), 1)

    emotions_dict = {
        LABEL_NAMES[i]: round(float(probs[i]), 4) for i in range(len(LABEL_NAMES))
    }

    norm_bbox = [
        round(x / W, 4),
        round(y / H, 4),
        round(w / W, 4),
        round(h / H, 4),
    ]

    return {
        "status": "ok",
        "face_detected": True,
        "bbox": [int(x), int(y), int(w), int(h)],
        "normalized_bbox": norm_bbox,
        "frame_size": [int(W), int(H)],
        "conf": round(float(conf), 3),
        "emotions": emotions_dict,
        "confidence": emotions_dict["confidence"],
        "gaze": gaze,
        "head_pose": head_pose,
        "face_visibility_pct": face_visibility_pct,
        "camera_status": "active",
    }


# =============================================================================
# 13. HTTP Server
# =============================================================================

class CVHandler(BaseHTTPRequestHandler):
    """Simple HTTP handler — mirrors stt_service.py pattern."""

    def log_message(self, fmt, *args):   # suppress default access log
        pass

    def _send_json(self, code, body):
        payload = json.dumps(body, default=str).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path == "/health":
            status = {
                "status":           "ok" if _model_ready else "degraded",
                "model_ready":      _model_ready,
                "device":           str(_device) if _device else "not_loaded",
                "checkpoint_epoch": _checkpoint_meta.get("epoch"),
                "val_ap":           _checkpoint_meta.get("val_ap"),
                "label_names":      LABEL_NAMES,
                "startup_errors":   _startup_errors,
            }
            self._send_json(200, status)
        else:
            self._send_json(404, {"error": "Not found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body   = self.rfile.read(length)

        try:
            req = json.loads(body)
        except json.JSONDecodeError:
            self._send_json(400, {"error": "Invalid JSON"})
            return

        if self.path == "/analyze_frame":
            # Live single-frame analysis for candidate screen
            if not _model_ready:
                self._send_json(503, {
                    "error": "Model not ready",
                    "startup_errors": _startup_errors,
                })
                return

            img_data = req.get("image")
            if not img_data:
                self._send_json(400, {"error": "image field is required (base64 string)"})
                return

            try:
                import base64
                if "," in img_data:
                    img_data = img_data.split(",", 1)[1]
                raw_bytes = base64.b64decode(img_data)
                np_arr    = np.frombuffer(raw_bytes, np.uint8)
                bgr_frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                if bgr_frame is None:
                    self._send_json(400, {"error": "Could not decode image bytes"})
                    return

                res = analyze_single_frame(bgr_frame)
                self._send_json(200, res)
            except Exception as e:
                traceback.print_exc(file=sys.stderr)
                self._send_json(500, {"status": "error", "error": str(e)})
            return

        elif self.path == "/analyze":
            file_path    = req.get("file_path")
            interview_id = req.get("interview_id")

            if not file_path or interview_id is None:
                self._send_json(400, {
                    "error": "file_path and interview_id are required"
                })
                return

            if not _model_ready:
                self._send_json(503, {
                    "error": "Model not ready",
                    "startup_errors": _startup_errors,
                })
                return

            try:
                result = analyze_video(file_path, interview_id)
                self._send_json(200, result)
            except FileNotFoundError as e:
                self._send_json(404, {
                    "interview_id": interview_id,
                    "status":       "error",
                    "error":        str(e),
                })
            except Exception as e:
                traceback.print_exc(file=sys.stderr)
                self._send_json(500, {
                    "interview_id": interview_id,
                    "status":       "error",
                    "error":        str(e),
                })
        else:
            self._send_json(404, {"error": "Not found"})


# =============================================================================
# 14. Entry Point
# =============================================================================

def main():
    global _args
    parser = argparse.ArgumentParser(description="HireAI CV Analysis Service")
    parser.add_argument("--port", type=int, default=8767)
    parser.add_argument("--host", type=str, default="127.0.0.1")
    _args = parser.parse_args()

    print("=" * 60, flush=True)
    print("HireAI CV Analysis Service", flush=True)
    print(f"  Port   : {_args.host}:{_args.port}", flush=True)
    print(f"  Checkpoint: {CHECKPOINT_PATH}", flush=True)
    print("=" * 60, flush=True)

    load_model()
    load_detectors()

    if _startup_errors:
        print(f"[CV] Startup warnings: {_startup_errors}", flush=True)
    if not _model_ready:
        print("[CV] WARNING: model failed to load — /analyze will return 503",
              flush=True)

    server = HTTPServer((_args.host, _args.port), CVHandler)
    print(f"[CV] Listening on {_args.host}:{_args.port} …", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("[CV] Shutting down.", flush=True)


if __name__ == "__main__":
    main()
