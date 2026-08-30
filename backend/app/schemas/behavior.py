"""
Module 6 request shapes — what the browser's tracker sends up.

Kept out of schemas/interview.py because only one route uses them, and that
file is already long.

The samples are client-supplied and therefore forgeable. That is accepted
rather than defended against: this feature scores nobody and ranks nobody, so
the only person a candidate could mislead by faking their own gaze data is
themselves. It would stop being acceptable the moment any of this fed the
leaderboard, which is why it must not.

What IS defended against is size: an unbounded array from a client is a memory
problem regardless of intent.
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

# ~80 minutes at the tracker's 4Hz — far beyond any real interview, and small
# enough that the request cannot be used to exhaust memory.
MAX_SAMPLES = 20_000


class BehaviorSample(BaseModel):
    """One tracked moment. Literal types so an unknown label is a 422, not a
    silently-ignored bucket that quietly skews every percentage."""

    gaze: Literal["camera", "down", "side", "away"]
    # Read from MediaPipe's facial action units by thresholds in
    # frontend/src/lib/faceTracker.js. "neutral" means "nothing read" — no face
    # visible — not a measured neutral expression.
    expression: Literal["confident", "nervous", "fear", "neutral"]
    face_present: bool

    # How composed the face looked on this frame, 0-1. Nullable because a
    # frame with no visible face has no reading: null means "not measured",
    # which is a different fact from a measured low confidence and must not be
    # averaged in as zero.
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class BehaviorSubmission(BaseModel):
    samples: List[BehaviorSample] = Field(max_length=MAX_SAMPLES)
    tracked_seconds: float = Field(ge=0)
    alerts_shown: int = Field(ge=0, default=0)
