"""
Interview Analysis Router
FastAPI endpoints for real-time video frame processing, CNN emotion analysis,
eye/gaze tracking, attention & engagement calculation, and final behavior reports.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from backend.models.emotion_cnn import emotion_pipeline
from backend.services.face_analyzer import face_analyzer
from backend.services.behavior_tracker import behavior_manager
from backend.database import db

router = APIRouter(
    prefix="/api/interview-analysis",
    tags=["AI Interview Vision & Behavior Analysis"]
)


class StartAnalysisRequest(BaseModel):
    session_id: str = Field(..., description="Unique interview session ID")
    candidate_name: Optional[str] = Field("Candidate", description="Candidate name")


class FrameAnalysisRequest(BaseModel):
    session_id: str = Field(..., description="Interview session ID")
    frame_data: str = Field(..., description="Base64-encoded image frame")


class StopAnalysisRequest(BaseModel):
    session_id: str = Field(..., description="Interview session ID")


@router.get("/model-status")
def get_model_status():
    """
    Returns the CNN Emotion Model status, loaded weights info, and disclaimer.
    """
    return emotion_pipeline.get_status()


@router.post("/start")
def start_analysis_session(req: StartAnalysisRequest):
    """
    Initializes a new real-time video analysis session tracker.
    """
    tracker = behavior_manager.get_or_create_session(
        session_id=req.session_id,
        candidate_name=req.candidate_name or "Candidate"
    )
    return {
        "message": "AI interview vision analysis session initialized",
        "session_id": tracker.session_id,
        "candidate_name": tracker.candidate_name,
        "created_at": tracker.created_at,
        "model_status": emotion_pipeline.model_status
    }


@router.post("/frame")
def analyze_video_frame(req: FrameAnalysisRequest):
    """
    Analyzes a single webcam video frame:
    1. Face Detection & Tracking
    2. CNN Emotion Prediction (Nervous, Scared, Confused)
    3. Eye Tracking & Gaze Estimation
    4. Head-Pose Estimation
    5. Facial Activity Measurement
    6. Cumulative Session Metrics (Eye Contact %, Attention %, Engagement %, Confidence Indicators)
    """
    tracker = behavior_manager.get_or_create_session(req.session_id)

    # Execute computer vision pipeline
    frame_result = face_analyzer.analyze_frame(req.frame_data)

    # Accumulate metrics in session tracker
    telemetry = tracker.update_frame(frame_result)

    return {
        "success": True,
        **telemetry
    }


@router.post("/stop")
def stop_analysis_session(req: StopAnalysisRequest):
    """
    Finalizes an active vision analysis session and computes final duration.
    """
    tracker = behavior_manager.get_session(req.session_id)
    if not tracker:
        raise HTTPException(status_code=404, detail="Analysis session not found.")

    tracker.stop_session()
    return {
        "message": "Analysis session stopped successfully",
        "session_id": tracker.session_id,
        "total_frames_analyzed": tracker.total_frames,
        "valid_face_frames": tracker.valid_face_frames,
        "eye_contact_percentage": tracker.get_eye_contact_percentage()
    }


@router.get("/{session_id}")
def get_session_status(session_id: str):
    """
    Retrieves live session metrics for an active or completed session.
    """
    tracker = behavior_manager.get_session(session_id)
    if not tracker:
        raise HTTPException(status_code=404, detail="Analysis session not found.")

    return {
        "session_id": tracker.session_id,
        "is_active": tracker.is_active,
        "total_frames": tracker.total_frames,
        "valid_face_frames": tracker.valid_face_frames,
        "eye_contact_percentage": tracker.get_eye_contact_percentage(),
        "eye_contact_level": tracker.get_eye_contact_level(tracker.get_eye_contact_percentage()),
        "attention_score": tracker.get_smoothed_attention(),
        "head_stability_percentage": tracker.get_head_stability_percentage(),
        "facial_activity_score": tracker.get_smoothed_facial_activity()
    }


@router.get("/{session_id}/report")
def get_session_report(session_id: str):
    """
    Generates the comprehensive Final Interview Behavior Report,
    integrating video telemetry with speech analysis metrics if available.
    """
    tracker = behavior_manager.get_session(session_id)
    if not tracker:
        raise HTTPException(status_code=404, detail="Analysis session not found.")

    # Check if this session matches an interview session in db to integrate speech/eval data
    speech_metrics = None
    for int_id, int_obj in db.interviews.items():
        if int_obj.get("session_id") == session_id or int_id == session_id:
            # Check for associated speech evaluation
            if int_obj.get("report") and "scores" in int_obj["report"]:
                speech_metrics = {
                    "overall_score": int_obj["report"]["scores"].get("overall", 80),
                    "technical_score": int_obj["report"]["scores"].get("technical", 80),
                    "communication_score": int_obj["report"]["scores"].get("communication", 80),
                    "filler_count": int_obj.get("filler_count", 0)
                }
            break

    report = tracker.generate_behavior_report(speech_metrics=speech_metrics)
    return report
