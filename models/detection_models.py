"""
Detection Models Module
Pydantic schemas and types for Real-Time Electronic Device Detection,
Anti-Cheating Monitoring, and Session Integrity Telemetry.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import datetime


class BoundingBox(BaseModel):
    x: float = Field(..., description="Normalized top-left x coordinate (0.0 to 1.0)")
    y: float = Field(..., description="Normalized top-left y coordinate (0.0 to 1.0)")
    width: float = Field(..., description="Normalized width (0.0 to 1.0)")
    height: float = Field(..., description="Normalized height (0.0 to 1.0)")


class DetectedObject(BaseModel):
    object_name: str = Field(..., description="Human-readable object name (e.g. Mobile Phone, Laptop)")
    raw_class: str = Field(..., description="Raw COCO class name (e.g. cell phone, laptop)")
    confidence: float = Field(..., description="Detection confidence score between 0.0 and 1.0")
    box: BoundingBox = Field(..., description="Bounding box coordinates")
    timestamp: str = Field(default_factory=lambda: datetime.datetime.now().isoformat())


class DeviceDetectionEvent(BaseModel):
    event_id: str = Field(..., description="Unique event identifier")
    event_type: str = Field("PROHIBITED_DEVICE_DETECTED", description="Event type")
    session_id: str = Field(..., description="Interview session ID")
    interview_id: Optional[str] = Field(None, description="Associated interview ID")
    candidate_id: Optional[str] = Field(None, description="Associated candidate user ID")
    detected_object: str = Field(..., description="Detected prohibited device name")
    raw_class: str = Field(..., description="Raw detection model class")
    confidence: float = Field(..., description="Confidence percentage/float")
    timestamp: str = Field(default_factory=lambda: datetime.datetime.now().isoformat())
    duration_seconds: Optional[float] = Field(0.0, description="Duration the device was visible in seconds")
    bounding_box: Optional[BoundingBox] = None
    status: str = Field("confirmed", description="Event status: confirmed, cleared")


class DeviceDetectionSummary(BaseModel):
    session_id: str
    interview_id: Optional[str] = None
    candidate_id: Optional[str] = None
    total_alerts: int = 0
    detected_device_counts: Dict[str, int] = Field(default_factory=dict)
    first_detection_timestamp: Optional[str] = None
    last_detection_timestamp: Optional[str] = None
    total_detection_duration_seconds: float = 0.0
    integrity_status: str = "Clean - No Prohibited Devices Detected"
    events: List[DeviceDetectionEvent] = Field(default_factory=list)


class FrameDeviceDetectionResult(BaseModel):
    status: str = "active"  # active, unavailable, disabled
    alert_state: str = "NORMAL"  # NORMAL, WARNING, ALERT
    confirmed_alert: bool = False
    detected_devices: List[DetectedObject] = Field(default_factory=list)
    alert_message: str = "🟢 Monitoring Active"
    alert_badge: str = "NORMAL"
    total_session_alerts: int = 0
    model_name: str = "yolov5n"
    disclaimer: str = "Real-time CV object detection for anti-cheating integrity monitoring."
