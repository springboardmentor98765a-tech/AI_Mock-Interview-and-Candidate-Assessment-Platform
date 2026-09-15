"""
Behavior Tracker Module
Computes cumulative session metrics: Eye Contact %, Gaze & Head Direction Distributions,
Attention Score, Engagement Score, Confidence-Related Indicators, and synthesizes the Final Report.
"""

import time
import datetime
import numpy as np
from typing import Dict, Any, Optional, List
from collections import deque


class InterviewSessionTracker:
    """
    Tracks and accumulates real-time computer vision and behavioral telemetry
    for an individual interview session.
    """

    def __init__(self, session_id: str, candidate_name: str = "Candidate"):
        self.session_id = session_id
        self.candidate_name = candidate_name
        self.created_at = datetime.datetime.now().isoformat()
        self.start_time = time.time()
        self.end_time = None
        self.is_active = True

        # Frame counters
        self.total_frames = 0
        self.valid_face_frames = 0
        self.no_face_frames = 0
        self.multiple_face_frames = 0

        # Gaze counters
        self.gaze_counts = {
            "camera": 0,
            "left": 0,
            "right": 0,
            "down": 0,
            "eyes_closed": 0,
            "unknown": 0
        }

        # Head pose counters
        self.head_pose_counts = {
            "forward": 0,
            "turning_left": 0,
            "turning_right": 0,
            "looking_up": 0,
            "looking_down": 0,
            "unknown": 0
        }

        # Emotion observations
        self.emotion_counts = {
            "Nervous": 0,
            "Scared": 0,
            "Confused": 0
        }
        self.emotion_confidence_sum = {
            "Nervous": 0.0,
            "Scared": 0.0,
            "Confused": 0.0
        }

        # Temporal rolling windows for smoothing real-time gauges
        self.recent_attention = deque(maxlen=10)
        self.recent_engagement = deque(maxlen=10)
        self.recent_facial_activity = deque(maxlen=10)

        # Configurable weights for engagement & attention calculations
        self.weights = {
            "eye_contact": 0.35,
            "attention": 0.35,
            "facial_activity": 0.15,
            "head_stability": 0.15
        }

        # Tracking warnings
        self.warnings: List[str] = []

    def update_frame(self, frame_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ingests a single frame analysis dictionary and updates cumulative session stats.
        Returns live real-time dashboard telemetry.
        """
        self.total_frames += 1
        face_detected = frame_analysis.get("face_detected", False)
        faces_count = frame_analysis.get("faces_count", 0)

        if not face_detected:
            self.no_face_frames += 1
            self.gaze_counts["unknown"] += 1
            self.head_pose_counts["unknown"] += 1

            instant_attention = 10
            self.recent_attention.append(instant_attention)

            eye_contact_pct = self.get_eye_contact_percentage()
            smoothed_attention = self.get_smoothed_attention()
            head_stability_pct = self.get_head_stability_percentage()
            smoothed_facial = self.get_smoothed_facial_activity()

            engagement_score = self.compute_engagement(
                eye_contact_pct, smoothed_attention, smoothed_facial, head_stability_pct
            )
            confidence_indicators = self.compute_confidence_indicators(
                eye_contact_pct, head_stability_pct, smoothed_facial
            )

            return {
                "session_id": self.session_id,
                "face_detected": False,
                "face_status": "No Face Detected",
                "faces_count": 0,
                "emotion": frame_analysis.get("emotion"),
                "gaze": {"direction": "unknown", "eyes_closed": False},
                "head_pose": {"direction": "unknown"},
                "eye_contact": {
                    "percentage": eye_contact_pct,
                    "level": self.get_eye_contact_level(eye_contact_pct)
                },
                "attention": {
                    "score": smoothed_attention,
                    "level": self.get_score_level(smoothed_attention)
                },
                "engagement": {
                    "score": engagement_score,
                    "level": self.get_score_level(engagement_score)
                },
                "confidence_indicators": confidence_indicators,
                "facial_activity_score": smoothed_facial,
                "total_frames": self.total_frames
            }

        # Valid face frame
        self.valid_face_frames += 1
        if faces_count > 1:
            self.multiple_face_frames += 1

        # Gaze accumulation
        gaze_data = frame_analysis.get("gaze", {})
        gaze_dir = gaze_data.get("direction", "unknown")
        eyes_closed = gaze_data.get("eyes_closed", False)

        if eyes_closed or gaze_dir == "eyes_closed":
            self.gaze_counts["eyes_closed"] += 1
        elif gaze_dir in self.gaze_counts:
            self.gaze_counts[gaze_dir] += 1
        else:
            self.gaze_counts["unknown"] += 1

        # Head Pose accumulation
        head_data = frame_analysis.get("head_pose", {})
        head_dir = head_data.get("direction", "unknown")
        if head_dir in self.head_pose_counts:
            self.head_pose_counts[head_dir] += 1
        else:
            self.head_pose_counts["unknown"] += 1

        # Emotion accumulation
        emotion_data = frame_analysis.get("emotion", {})
        emotion_label = emotion_data.get("label")
        emotion_conf = emotion_data.get("confidence", 0.0)

        if emotion_label in self.emotion_counts:
            self.emotion_counts[emotion_label] += 1
            self.emotion_confidence_sum[emotion_label] += emotion_conf

        # Facial Activity
        facial_activity = frame_analysis.get("facial_activity_score", 30)
        self.recent_facial_activity.append(facial_activity)

        # Instantaneous Attention Score Computation
        instant_attention = self._calculate_instant_attention(gaze_dir, eyes_closed, head_dir)
        self.recent_attention.append(instant_attention)

        # Running Metrics
        eye_contact_pct = self.get_eye_contact_percentage()
        smoothed_attention = self.get_smoothed_attention()
        head_stability_pct = self.get_head_stability_percentage()
        smoothed_facial = self.get_smoothed_facial_activity()

        engagement_score = self.compute_engagement(
            eye_contact_pct, smoothed_attention, smoothed_facial, head_stability_pct
        )
        self.recent_engagement.append(engagement_score)

        confidence_indicators = self.compute_confidence_indicators(
            eye_contact_pct, head_stability_pct, smoothed_facial
        )

        face_status_msg = "Face Detected" if faces_count <= 1 else f"Multiple Faces ({faces_count}) - Tracking Primary"

        return {
            "session_id": self.session_id,
            "face_detected": True,
            "face_status": face_status_msg,
            "faces_count": faces_count,
            "bbox": frame_analysis.get("bbox"),
            "emotion": frame_analysis.get("emotion"),
            "gaze": {
                "direction": gaze_dir,
                "eyes_closed": eyes_closed
            },
            "head_pose": {
                "direction": head_dir
            },
            "eye_contact": {
                "percentage": eye_contact_pct,
                "level": self.get_eye_contact_level(eye_contact_pct)
            },
            "attention": {
                "score": smoothed_attention,
                "level": self.get_score_level(smoothed_attention)
            },
            "engagement": {
                "score": engagement_score,
                "level": self.get_score_level(engagement_score)
            },
            "confidence_indicators": confidence_indicators,
            "facial_activity_score": smoothed_facial,
            "total_frames": self.total_frames
        }

    def _calculate_instant_attention(self, gaze_dir: str, eyes_closed: bool, head_dir: str) -> int:
        """
        Transparent instantaneous attention calculation based on gaze and head orientation.
        """
        score = 30  # Base face presence

        # Gaze Contribution (0 to 40)
        if gaze_dir == "camera":
            score += 40
        elif gaze_dir in ["left", "right"]:
            score += 15
        elif gaze_dir == "down":
            score += 5
        elif eyes_closed:
            score -= 15

        # Head Pose Contribution (0 to 30)
        if head_dir == "forward":
            score += 30
        elif head_dir in ["turning_left", "turning_right"]:
            score += 10
        elif head_dir in ["looking_up", "looking_down"]:
            score += 5

        return int(min(100, max(0, score)))

    def get_eye_contact_percentage(self) -> float:
        """
        Calculates Eye Contact = camera_looking_time / valid_tracking_time * 100
        """
        if self.valid_face_frames == 0:
            return 0.0
        pct = (self.gaze_counts["camera"] / float(self.valid_face_frames)) * 100.0
        return round(pct, 1)

    def get_head_stability_percentage(self) -> float:
        """
        Calculates Head Stability = forward_frames / valid_tracking_frames * 100
        """
        if self.valid_face_frames == 0:
            return 0.0
        pct = (self.head_pose_counts["forward"] / float(self.valid_face_frames)) * 100.0
        return round(pct, 1)

    def get_smoothed_attention(self) -> int:
        if not self.recent_attention:
            return 0
        return int(round(np.mean(self.recent_attention)))

    def get_smoothed_facial_activity(self) -> int:
        if not self.recent_facial_activity:
            return 0
        return int(round(np.mean(self.recent_facial_activity)))

    def compute_engagement(
        self, eye_contact_pct: float, attention_score: int, facial_activity: int, head_stability_pct: float
    ) -> int:
        """
        Calculates Engagement score (0-100) using configurable weights:
        Engagement = 0.35*EyeContact + 0.35*Attention + 0.15*FacialActivity + 0.15*HeadStability
        """
        w = self.weights
        raw_score = (
            w["eye_contact"] * eye_contact_pct
            + w["attention"] * attention_score
            + w["facial_activity"] * facial_activity
            + w["head_stability"] * head_stability_pct
        )
        return int(min(100, max(0, round(raw_score))))

    def compute_confidence_indicators(
        self, eye_contact_pct: float, head_stability_pct: float, facial_activity: int, response_fluency: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Computes composite observable confidence indicators.
        DISCLAIMER: This is an observable behavior estimate, not a psychological diagnosis.
        """
        # Facial stability is moderate-to-high when facial activity is in balanced zone (30-70)
        facial_stability = max(0, 100 - abs(facial_activity - 50) * 1.6)

        sub_scores = {
            "eye_contact": round(eye_contact_pct, 1),
            "head_stability": round(head_stability_pct, 1),
            "facial_stability": round(facial_stability, 1)
        }

        if response_fluency is not None:
            sub_scores["response_fluency"] = round(response_fluency, 1)
            composite = (
                0.30 * eye_contact_pct
                + 0.30 * head_stability_pct
                + 0.20 * facial_stability
                + 0.20 * response_fluency
            )
        else:
            composite = (
                0.40 * eye_contact_pct
                + 0.35 * head_stability_pct
                + 0.25 * facial_stability
            )

        composite_score = int(min(100, max(0, round(composite))))

        if composite_score >= 72:
            level = "High"
        elif composite_score >= 48:
            level = "Moderate"
        else:
            level = "Low"

        return {
            "score": composite_score,
            "level": level,
            "indicators": sub_scores,
            "disclaimer": "Observable behavioral indicators estimate."
        }

    @staticmethod
    def get_eye_contact_level(pct: float) -> str:
        if pct >= 70.0:
            return "High"
        elif pct >= 45.0:
            return "Moderate"
        return "Low"

    @staticmethod
    def get_score_level(score: int) -> str:
        if score >= 75:
            return "High"
        elif score >= 50:
            return "Medium"
        return "Low"

    def stop_session(self):
        self.end_time = time.time()
        self.is_active = False

    def generate_behavior_report(self, speech_metrics: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Synthesizes the complete Final Interview Behavior Report from actual recorded session telemetry.
        """
        now = time.time()
        start = self.start_time
        end = self.end_time or now
        duration_sec = int(max(1, end - start))

        mins = duration_sec // 60
        secs = duration_sec % 60
        duration_formatted = f"{mins:02d}:{secs:02d}"

        # 1. Emotion distribution percentages
        total_emotion_obs = sum(self.emotion_counts.values())
        emotion_distribution = {}
        if total_emotion_obs > 0:
            for em, count in self.emotion_counts.items():
                pct = round((count / float(total_emotion_obs)) * 100.0, 1)
                emotion_distribution[em] = pct
        else:
            emotion_distribution = {"Nervous": 33.3, "Scared": 33.3, "Confused": 33.4}

        # 2. Gaze distribution percentages
        total_gaze = sum(self.gaze_counts.values())
        gaze_distribution = {}
        if total_gaze > 0:
            for g, count in self.gaze_counts.items():
                gaze_distribution[g] = round((count / float(total_gaze)) * 100.0, 1)
        else:
            gaze_distribution = {"camera": 0.0, "left": 0.0, "right": 0.0, "down": 0.0, "eyes_closed": 0.0, "unknown": 100.0}

        # 3. Head pose distribution percentages
        total_head = sum(self.head_pose_counts.values())
        head_pose_distribution = {}
        if total_head > 0:
            for h, count in self.head_pose_counts.items():
                head_pose_distribution[h] = round((count / float(total_head)) * 100.0, 1)
        else:
            head_pose_distribution = {"forward": 0.0, "turning_left": 0.0, "turning_right": 0.0, "looking_up": 0.0, "looking_down": 0.0, "unknown": 100.0}

        # 4. Final Aggregates
        eye_contact_pct = self.get_eye_contact_percentage()
        eye_contact_level = self.get_eye_contact_level(eye_contact_pct)

        head_stability_pct = self.get_head_stability_percentage()
        attention_score = self.get_smoothed_attention()
        facial_activity_score = self.get_smoothed_facial_activity()

        face_presence_pct = round(
            (self.valid_face_frames / float(max(1, self.total_frames))) * 100.0, 1
        )

        engagement_score = self.compute_engagement(
            eye_contact_pct, attention_score, facial_activity_score, head_stability_pct
        )

        # Extract speech fluency if speech metrics available
        speech_fluency = None
        if speech_metrics:
            speech_fluency = speech_metrics.get("fluency_score") or speech_metrics.get("overall_score")

        confidence_indicators = self.compute_confidence_indicators(
            eye_contact_pct, head_stability_pct, facial_activity_score, response_fluency=speech_fluency
        )

        # 5. Overall Observable Rating
        composite_overall = (eye_contact_pct + attention_score + engagement_score + confidence_indicators["score"]) / 4.0
        if composite_overall >= 78:
            overall_rating = "Excellent / High Engagement"
        elif composite_overall >= 62:
            overall_rating = "Moderate / Good"
        else:
            overall_rating = "Needs Practice / Moderate"

        # 6. Data-Driven Personalized Areas to Improve
        areas_to_improve: List[str] = []
        if eye_contact_pct < 65.0:
            areas_to_improve.append(f"Maintain eye contact with the camera more consistently (measured at {eye_contact_pct}%).")
        if gaze_distribution.get("down", 0.0) > 15.0:
            areas_to_improve.append(f"Reduce prolonged downward gaze ({gaze_distribution['down']}% of session) to project higher confidence.")
        if head_stability_pct < 70.0:
            areas_to_improve.append(f"Maintain a more centered and stable head position (forward posture was {head_stability_pct}%).")
        if attention_score < 70:
            areas_to_improve.append("Minimize external screen distractions during technical question answering.")
        if facial_activity_score < 25:
            areas_to_improve.append("Incorporate natural conversational facial expressions to enhance interviewer engagement.")
        elif facial_activity_score > 80:
            areas_to_improve.append("Moderate rapid head/facial micro-movements for a calmer executive presence.")

        if speech_metrics and speech_metrics.get("filler_count", 0) > 4:
            areas_to_improve.append(f"Reduce filler word frequency ({speech_metrics.get('filler_count')} filler phrases detected).")

        if not areas_to_improve:
            areas_to_improve.append("Outstanding camera presence! Continue maintaining your current eye contact and engagement level.")

        return {
            "session_id": self.session_id,
            "candidate_name": self.candidate_name,
            "interview_duration": duration_formatted,
            "duration_seconds": duration_sec,
            "total_frames_analyzed": self.total_frames,
            "face_presence_percentage": face_presence_pct,
            "emotion_estimates": emotion_distribution,
            "emotion_disclaimer": "Observable facial expression estimates.",
            "eye_contact": {
                "percentage": eye_contact_pct,
                "level": eye_contact_level
            },
            "attention": {
                "score": attention_score,
                "level": self.get_score_level(attention_score)
            },
            "engagement": {
                "score": engagement_score,
                "level": self.get_score_level(engagement_score),
                "formula": "0.35*EyeContact + 0.35*Attention + 0.15*FacialActivity + 0.15*HeadStability"
            },
            "head_stability_percentage": head_stability_pct,
            "facial_activity_score": facial_activity_score,
            "confidence_indicators": confidence_indicators,
            "gaze_distribution": gaze_distribution,
            "head_pose_distribution": head_pose_distribution,
            "speech_integration": speech_metrics,
            "overall_observable_indicators": overall_rating,
            "areas_to_improve": areas_to_improve,
            "generated_at": datetime.datetime.now().isoformat()
        }


class BehaviorManager:
    """
    Global in-memory session registry for active interview analyzers.
    """
    def __init__(self):
        self.sessions: Dict[str, InterviewSessionTracker] = {}

    def get_or_create_session(self, session_id: str, candidate_name: str = "Candidate") -> InterviewSessionTracker:
        if session_id not in self.sessions:
            self.sessions[session_id] = InterviewSessionTracker(session_id, candidate_name)
        return self.sessions[session_id]

    def get_session(self, session_id: str) -> Optional[InterviewSessionTracker]:
        return self.sessions.get(session_id)

    def remove_session(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]


# Global singleton manager
behavior_manager = BehaviorManager()
