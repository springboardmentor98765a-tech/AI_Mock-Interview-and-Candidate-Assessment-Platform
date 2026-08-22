"""
Module 6 - Task 4: Attention Monitoring.

Combines observable vision signals (face presence, head orientation, gaze,
face visibility, time away from camera) into four attention states:

    ATTENTIVE | PARTIALLY_ATTENTIVE | DISTRACTED | NO_FACE

Attention is evaluated over TIME WINDOWS, never from a single frame:
brief glances away are normal thinking behaviour. All thresholds live in
ATTENTION_CONFIG so they can be tuned without touching the logic.

Warning rules:
  * A counted warning fires ONCE per continuous away episode when the
    candidate-warning threshold is crossed (no duplicate spam).
  * An episode closes only after sustained camera re-engagement.
  * Reaching max_warnings terminates the session (enforced by the API layer)
    and flags the candidate for review.
"""

import threading
import time

ATTENTION_CONFIG = {
    "away_normal_after_s": 1.0,
    "warning_threshold_s": 2.0,
    "significant_threshold_s": 3.0,
    "candidate_warning_s": 4.0,
    "max_warnings": 5,
    "no_face_grace_s": 1.0,
    "reengage_reset_s": 0.6,
    "max_dt_s": 3.0,
}

STATE_ATTENTIVE = "ATTENTIVE"
STATE_PARTIAL = "PARTIALLY_ATTENTIVE"
STATE_DISTRACTED = "DISTRACTED"
STATE_NO_FACE = "NO_FACE"


def get_config():
    return dict(ATTENTION_CONFIG)


class AttentionTracker:
    """Per-interview attention state machine driven by eye-contact states."""

    def __init__(self, config=None):
        self.config = dict(ATTENTION_CONFIG)
        if config:
            self.config.update(config)

        self.state = STATE_ATTENTIVE
        self.away_seconds = 0.0
        self.attentive_seconds = 0.0
        self._last_ts = None
        self._episode_warned = False
        self._episode_started_at = None
        self._return_streak = 0.0
        self.warnings = []
        self.warning_events = []
        self.total_away_seconds = 0.0
        self.longest_away_seconds = 0.0
        self.no_face_seconds = 0.0
        self.terminated = False

    @property
    def max_warnings(self):
        return int(self.config["max_warnings"])

    def _dt(self, now):
        if self._last_ts is None:
            return 0.0
        return min(self.config["max_dt_s"], max(0.0, now - self._last_ts))

    def record_frame(self, eye_state, face_present, now=None):
        """
        Feed one analyzed frame. Returns the current attention snapshot dict.
        eye_state comes from GazeTracker; face_present from frame analysis.
        """
        now = now if now is not None else time.time()
        dt = self._dt(now)
        self._last_ts = now

        away_states = (
            "looking_left", "looking_right", "looking_up",
            "looking_down", "unknown",
        )
        is_toward_camera = eye_state == "toward_camera"
        is_no_face = not face_present

        if is_no_face:
            self.no_face_seconds += dt

        if is_toward_camera and not is_no_face:
            self.attentive_seconds += dt
            self._return_streak += dt
            if self.away_seconds > 0:
                if self._return_streak >= self.config["reengage_reset_s"]:
                    self._close_episode()
                # else: brief glance back — episode stays open, away time held
            if not is_no_face:
                self.state = STATE_ATTENTIVE
        else:
            self._return_streak = 0.0
            effective_away = dt
            if is_no_face and self.no_face_seconds <= self.config["no_face_grace_s"]:
                effective_away = 0.0
            self.away_seconds += effective_away
            self.total_away_seconds += effective_away
            self.longest_away_seconds = max(
                self.longest_away_seconds, self.away_seconds
            )

            if is_no_face and self.no_face_seconds > self.config["no_face_grace_s"]:
                self.state = STATE_NO_FACE
            elif self.away_seconds >= self.config["warning_threshold_s"]:
                self.state = STATE_DISTRACTED
            elif self.away_seconds >= self.config["away_normal_after_s"]:
                self.state = STATE_PARTIAL
            else:
                self.state = STATE_ATTENTIVE

            if (
                self.away_seconds >= self.config["candidate_warning_s"]
                and not self._episode_warned
                and not self.terminated
            ):
                self._episode_warned = True
                self.warning_events.append({
                    "at_second": round(self.away_seconds, 2),
                    "ts": round(now, 3),
                    "state": self.state,
                })
                self.warnings.append(len(self.warnings) + 1)
                if len(self.warnings) >= self.max_warnings:
                    self.terminated = True

        if self._episode_started_at is None and not is_toward_camera:
            self._episode_started_at = round(now, 3)

        return self.snapshot()

    def _close_episode(self):
        self.away_seconds = 0.0
        self._episode_warned = False
        self._episode_started_at = None
        self._return_streak = 0.0

    def reset_episode(self):
        """Called on interview resume so pauses never count as away time."""
        if self.terminated:
            return self.snapshot()
        self._close_episode()
        self.state = STATE_ATTENTIVE
        self._last_ts = None
        return self.snapshot()

    def severity(self):
        if self.away_seconds >= self.config["candidate_warning_s"]:
            return "candidate_warning"
        if self.away_seconds >= self.config["significant_threshold_s"]:
            return "significant"
        if self.away_seconds >= self.config["warning_threshold_s"]:
            return "attention_warning"
        return "normal"

    def snapshot(self):
        cfg = self.config
        return {
            "state": self.state,
            "away_seconds": round(self.away_seconds, 2),
            "severity": self.severity(),
            "thresholds": {
                "normal_after_s": cfg["away_normal_after_s"],
                "attention_warning_s": cfg["warning_threshold_s"],
                "significant_s": cfg["significant_threshold_s"],
                "candidate_warning_s": cfg["candidate_warning_s"],
            },
            "warnings": len(self.warnings),
            "max_warnings": self.max_warnings,
            "should_terminate": self.terminated,
            "events": self.warning_events[-10:],
        }

    def collect_summary(self):
        cfg = self.config
        return {
            "final_state": self.state,
            "warnings_count": len(self.warnings),
            "max_warnings": self.max_warnings,
            "terminated_by_system": self.terminated,
            "total_away_seconds": round(self.total_away_seconds, 1),
            "longest_away_episode_s": round(self.longest_away_seconds, 1),
            "no_face_seconds": round(self.no_face_seconds, 1),
            "attentive_seconds": round(self.attentive_seconds, 1),
            "events": self.warning_events,
            "thresholds_used": {
                "normal_after_s": cfg["away_normal_after_s"],
                "attention_warning_s": cfg["warning_threshold_s"],
                "significant_s": cfg["significant_threshold_s"],
                "candidate_warning_s": cfg["candidate_warning_s"],
            },
        }


_lock = threading.Lock()
_trackers = {}
_terminated_ids = set()


def _get_tracker(interview_id: int) -> AttentionTracker:
    with _lock:
        if interview_id in _terminated_ids:
            t = _trackers.get(interview_id)
            if t is None:
                t = AttentionTracker()
                t.terminated = True
                t.warnings = [1] * int(t.config["max_warnings"])
                _trackers[interview_id] = t
            return t
        t = _trackers.get(interview_id)
        if t is None:
            t = AttentionTracker()
            _trackers[interview_id] = t
        return t


def record_frame(interview_id: int, eye_state: str, face_present: bool, now=None):
    return _get_tracker(interview_id).record_frame(eye_state, face_present, now)


def reset_episode(interview_id: int):
    with _lock:
        t = _trackers.get(interview_id)
    if t:
        return t.reset_episode()
    return None


def get_snapshot(interview_id: int):
    with _lock:
        t = _trackers.get(interview_id)
    return t.snapshot() if t else None


def clear_session(interview_id: int):
    with _lock:
        t = _trackers.pop(interview_id, None)
        _terminated_ids.add(interview_id)
    return t.collect_summary() if t else None


def collect_summary(interview_id: int):
    """Summary WITHOUT releasing the tracker — keeps the termination latch
    so late frames and resume calls can never resurrect a flagged session."""
    with _lock:
        t = _trackers.get(interview_id)
    return t.collect_summary() if t else None


def is_terminated(interview_id: int) -> bool:
    with _lock:
        if interview_id in _terminated_ids:
            return True
        t = _trackers.get(interview_id)
    return bool(t and t.terminated)


def clear_all():
    with _lock:
        _trackers.clear()
