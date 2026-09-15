"""
Detection Router Module
FastAPI endpoints for Electronic Device Detection, Anti-Cheating Telemetry,
and Session Integrity Monitoring.
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field

from backend.auth import get_current_user, require_role
from backend.database import db
from backend.services.device_detection_service import (
    device_detection_manager,
    DeviceDetector
)
from backend.models.detection_models import (
    DeviceDetectionEvent,
    DeviceDetectionSummary,
    FrameDeviceDetectionResult
)

router = APIRouter(
    tags=["Electronic Device Detection & Anti-Cheating Monitoring"]
)


class FrameAnalyzePayload(BaseModel):
    session_id: str = Field(..., description="Interview session ID")
    frame_data: str = Field(..., description="Base64-encoded JPEG image frame")
    candidate_id: Optional[str] = Field(None, description="Optional candidate user ID")
    interview_id: Optional[str] = Field(None, description="Optional interview ID")


class PostDetectionEventPayload(BaseModel):
    detected_object: str = Field(..., description="Name of detected prohibited device")
    raw_class: str = Field(..., description="Raw model class")
    confidence: float = Field(..., description="Confidence score")
    timestamp: Optional[str] = Field(None, description="Detection timestamp")
    bounding_box: Optional[Dict[str, float]] = Field(None, description="Bounding box")


def _verify_session_access(session_id: str, current_user: Dict[str, Any]):
    """Strict RBAC helper to verify candidate owns the interview session."""
    user_role = current_user.get("role")
    if user_role in ["recruiter", "admin"]:
        return True

    user_id = current_user.get("id")
    # Check if session matches an interview belonging to user
    interview = db.interviews.get(session_id)
    if interview:
        if interview.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only access your own interview session telemetry."
            )
        return True

    # If tracker exists, check candidate_id
    tracker = device_detection_manager.get_session(session_id)
    if tracker and tracker.candidate_id and tracker.candidate_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only access your own interview session telemetry."
        )
    return True


@router.get("/api/detection/model-status")
def get_device_detection_model_status():
    """Returns the YOLOv5n deep learning model health and configuration."""
    return device_detection_manager.detector.get_status()


@router.post("/api/detection/analyze-frame", response_model=FrameDeviceDetectionResult)
def analyze_frame_devices(payload: FrameAnalyzePayload):
    """
    Executes real-time YOLOv5n electronic device detection on a webcam frame.
    Applies temporal confirmation (consecutive frames) and anti-flicker delay.
    """
    result = device_detection_manager.analyze_frame_for_session(
        session_id=payload.session_id,
        image_data=payload.frame_data,
        candidate_id=payload.candidate_id,
        interview_id=payload.interview_id or payload.session_id
    )
    return result


@router.post("/api/interviews/{session_id}/detection-events")
def create_detection_event(
    session_id: str,
    payload: PostDetectionEventPayload,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Records a confirmed prohibited device detection event into the session's authentic event history.
    """
    _verify_session_access(session_id, current_user)

    tracker = device_detection_manager.get_or_create_session(
        session_id=session_id,
        candidate_id=current_user.get("id"),
        interview_id=session_id
    )

    now_iso = payload.timestamp or tracker.created_at
    event_dict = {
        "event_id": f"dev_evt_{len(tracker.events) + 1}",
        "event_type": "PROHIBITED_DEVICE_DETECTED",
        "session_id": session_id,
        "interview_id": session_id,
        "candidate_id": current_user.get("id"),
        "detected_object": payload.detected_object,
        "raw_class": payload.raw_class,
        "confidence": payload.confidence,
        "timestamp": now_iso,
        "duration_seconds": 0.0,
        "bounding_box": payload.bounding_box,
        "status": "confirmed"
    }

    tracker.events.append(event_dict)
    tracker.total_alerts_count += 1
    tracker.detected_device_counts[payload.detected_object] = (
        tracker.detected_device_counts.get(payload.detected_object, 0) + 1
    )
    if not tracker.first_detection_iso:
        tracker.first_detection_iso = now_iso
    tracker.last_detection_iso = now_iso
    tracker._save_to_storage()

    return {"message": "Detection event recorded successfully", "event": event_dict}


@router.get("/api/interviews/{session_id}/detection-events")
def get_session_detection_events(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieves all authentic detection events for an interview session.
    """
    _verify_session_access(session_id, current_user)

    tracker = device_detection_manager.get_session(session_id)
    if not tracker:
        # Check if interview exists
        interview = db.interviews.get(session_id)
        if interview:
            return {"session_id": session_id, "total_events": 0, "events": []}
        raise HTTPException(status_code=404, detail="Interview detection session not found.")

    return {
        "session_id": session_id,
        "interview_id": tracker.interview_id,
        "candidate_id": tracker.candidate_id,
        "total_events": len(tracker.events),
        "events": tracker.events
    }


@router.get("/api/interviews/{session_id}/detection-summary")
def get_session_detection_summary(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generates authentic detection summary strictly calculated from stored events.
    """
    _verify_session_access(session_id, current_user)

    tracker = device_detection_manager.get_session(session_id)
    if not tracker:
        interview = db.interviews.get(session_id)
        if interview:
            return {
                "session_id": session_id,
                "interview_id": session_id,
                "candidate_id": interview.get("user_id"),
                "total_alerts": 0,
                "detected_device_counts": {},
                "first_detection_timestamp": None,
                "last_detection_timestamp": None,
                "total_detection_duration_seconds": 0.0,
                "integrity_status": "Clean - No Prohibited Devices Detected",
                "events": []
            }
        raise HTTPException(status_code=404, detail="Interview session detection summary not found.")

    return tracker.generate_summary_dict()


@router.get("/api/detection/analytics")
def get_detection_system_analytics(
    current_user: Dict[str, Any] = Depends(require_role(["admin", "recruiter"]))
):
    """
    Admin & Recruiter endpoint: aggregated device detection metrics across all monitored sessions.
    Strictly calculated from authentic stored data.
    """
    all_sessions = device_detection_manager.get_all_sessions()
    total_sessions_monitored = len(all_sessions)
    total_events_count = 0
    device_breakdown: Dict[str, int] = {}
    flagged_sessions_count = 0
    clean_sessions_count = 0

    for sid, tracker in all_sessions.items():
        summary = tracker.generate_summary_dict()
        alerts = summary.get("total_alerts", 0)
        total_events_count += alerts
        if alerts > 0:
            flagged_sessions_count += 1
        else:
            clean_sessions_count += 1

        for dev, cnt in summary.get("detected_device_counts", {}).items():
            device_breakdown[dev] = device_breakdown.get(dev, 0) + cnt

    return {
        "status": "Operational",
        "model_status": device_detection_manager.detector.get_status(),
        "total_monitored_sessions": total_sessions_monitored,
        "clean_sessions": clean_sessions_count,
        "flagged_sessions": flagged_sessions_count,
        "total_prohibited_device_alerts": total_events_count,
        "device_breakdown": device_breakdown,
        "disclaimer": "Metrics calculated from authentic session computer-vision telemetry."
    }
