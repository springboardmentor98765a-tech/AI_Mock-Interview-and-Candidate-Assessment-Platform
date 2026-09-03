"""
app/ml/features.py
==========================
Module 6 - CNN + RNN Interview Behavior Analysis (shared feature contract)

Defines the exact 6-number "tick" feature vector that the browser-side
CNN stage (face-api.js, in interview-session.js) computes once per
detection tick, and that the backend RNN stage (rnn.py) consumes as a
sequence. Keeping the field order in one place (mirrored in the frontend
comment block) avoids the classic bug where the two sides silently
disagree on what column 3 means.

    index  name                meaning                                   range
    -----  ------------------  ----------------------------------------  -----
      0    face_detected       a face was found in this frame             0/1
      1    eye_contact         landmarks say the candidate is looking
                                at the camera (EAR + gaze heuristic)       0/1
      2    eye_openness        normalized Eye Aspect Ratio (0=closed/
                                not visible, 1=fully open)                 0..1
      3    gaze_offset         how far the gaze/head is from dead-
                                center (0=centered, 1=far off-axis)        0..1
      4    expression_valence  face-api expression score mapped to a
                                positive/negative affect scale             0..1
      5    multiple_faces      more than one face was detected            0/1

A "no face" tick is still a valid sample: dims 1-4 are just 0 and
dim 0 is 0 - the RNN learns what a run of those means over time.
"""

TICK_FEATURE_NAMES = [
    "face_detected",
    "eye_contact",
    "eye_openness",
    "gaze_offset",
    "expression_valence",
    "multiple_faces",
]

TICK_FEATURE_SIZE = len(TICK_FEATURE_NAMES)

# How many ticks the RNN looks at per inference call. At the frontend's
# ~1.5s detection interval this is roughly a 30-second rolling window -
# long enough to separate "glanced away for a second" from "has not
# looked at the camera in half a minute", short enough to react quickly.
RNN_WINDOW_SIZE = 20

# Consecutive raw ticks (client-side, before any server round trip) with
# eye_contact == 0 before interview-session.js shows the instant
# "Eye contact missing" banner. Kept small so the candidate gets fast
# feedback; the server-side RNN risk score is the slower, smoothed signal
# used for the recruiter-facing proctoring summary.
EYE_CONTACT_WARNING_TICKS = 3
NO_FACE_WARNING_TICKS = 2
MULTI_FACE_WARNING_TICKS = 2


def clamp01(value) -> float:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return 0.0
    if v < 0:
        return 0.0
    if v > 1:
        return 1.0
    return v


def tick_to_vector(tick: dict) -> list:
    """Turn a validated EngagementTick payload (schemas.py) into the
    ordered numeric vector the RNN expects, clamping everything into a
    safe 0..1 / 0-or-1 range so a malformed client payload can't produce
    NaNs or blow up the forward pass."""
    return [
        1.0 if tick.get("face_detected") else 0.0,
        1.0 if tick.get("eye_contact") else 0.0,
        clamp01(tick.get("eye_openness", 0.0)),
        clamp01(tick.get("gaze_offset", 0.0)),
        clamp01(tick.get("expression_valence", 0.0)),
        1.0 if tick.get("multiple_faces") else 0.0,
    ]
