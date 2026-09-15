"""
Notification, Reminder & Email Router
REST API endpoints for candidate in-app notifications, upcoming interview scheduling,
automated reminder preferences, and email notification logs.
"""

import uuid
import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from backend.auth import get_current_user, require_role
from backend.database import db
from backend.services.notification_service import (
    create_in_app_notification,
    get_user_notifications,
    get_unread_notification_count,
    mark_notification_read,
    mark_all_notifications_read,
    delete_notification,
    schedule_interview_reminders,
    get_user_reminders,
    delete_reminder,
    cancel_interview_reminders,
    process_due_reminders
)
from backend.services.email_service import send_email_notification

router = APIRouter(tags=["Notifications, Reminders & Email Communication"])


class ScheduleInterviewRequest(BaseModel):
    title: str = "Full Stack Mock Interview"
    domain: str = "Full Stack"
    difficulty: str = "Medium"
    type: str = "Technical"
    scheduled_time: str
    duration_minutes: int = 45
    reminder_preferences: List[str] = ["24h", "1h", "15m"]


class CreateReminderRequest(BaseModel):
    interview_id: str
    reminder_type: str = "1h"
    scheduled_time: Optional[str] = None


class SendEmailRequest(BaseModel):
    notification_type: str
    recipient_email: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)


# ==============================================================================
# 1. In-App Notifications Endpoints
# ==============================================================================

@router.get("/api/notifications")
def list_notifications(
    unread_only: bool = Query(False),
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves in-app notifications strictly belonging to the authenticated user.
    """
    user_id = current_user["id"]
    notifs = get_user_notifications(user_id=user_id, unread_only=unread_only)
    unread_count = get_unread_notification_count(user_id)
    return {
        "notifications": notifs,
        "unread_count": unread_count,
        "total_count": len(notifs)
    }


@router.get("/api/notifications/unread-count")
def get_unread_count(
    current_user: dict = Depends(get_current_user)
):
    """
    Returns the real-time unread notification count for the authenticated user.
    """
    count = get_unread_notification_count(current_user["id"])
    return {"unread_count": count}


@router.patch("/api/notifications/{notification_id}/read")
def mark_single_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Marks a specific notification as read.
    """
    updated = mark_notification_read(notification_id, current_user["id"])
    if not updated:
        raise HTTPException(status_code=404, detail="Notification not found or access denied.")
    return {"message": "Notification marked as read", "notification": updated}


@router.patch("/api/notifications/read-all")
def mark_all_user_notifications_read(
    current_user: dict = Depends(get_current_user)
):
    """
    Marks all notifications for the authenticated user as read.
    """
    updated_count = mark_all_notifications_read(current_user["id"])
    return {"message": "All notifications marked as read", "updated_count": updated_count}


@router.delete("/api/notifications/{notification_id}")
def delete_single_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Deletes a specific notification belonging to the authenticated user.
    """
    success = delete_notification(notification_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found or access denied.")
    return {"message": "Notification deleted successfully"}


# ==============================================================================
# 2. Upcoming Interview Scheduling & Reminders Endpoints
# ==============================================================================

@router.post("/api/interviews/schedule")
def schedule_upcoming_interview(
    req: ScheduleInterviewRequest,
    current_user: dict = Depends(require_role(["candidate", "recruiter", "admin"]))
):
    """
    Schedules an upcoming mock interview and automatically configures reminder events.
    """
    user_id = current_user["id"]
    sched_id = f"sched_{uuid.uuid4().hex[:8]}"
    now_iso = datetime.datetime.now().isoformat()

    sched_obj = {
        "id": sched_id,
        "user_id": user_id,
        "candidate_name": current_user["full_name"],
        "candidate_email": current_user.get("email", "candidate@example.com"),
        "title": req.title,
        "domain": req.domain,
        "difficulty": req.difficulty,
        "type": req.type,
        "scheduled_time": req.scheduled_time,
        "duration_minutes": req.duration_minutes,
        "status": "Scheduled",
        "reminder_preferences": req.reminder_preferences,
        "created_at": now_iso
    }

    db.scheduled_interviews[sched_id] = sched_obj

    # Schedule associated reminders
    reminders = schedule_interview_reminders(
        user_id=user_id,
        interview_id=sched_id,
        scheduled_time_iso=req.scheduled_time,
        reminder_types=req.reminder_preferences
    )

    # Trigger initial in-app alert & email
    create_in_app_notification(
        user_id=user_id,
        title="Mock Interview Scheduled",
        message=f"Your {req.domain} ({req.type}) interview is scheduled for {req.scheduled_time}.",
        notification_type="reminder",
        related_id=sched_id,
        action_url="#upcoming"
    )

    send_email_notification(
        user_id=user_id,
        recipient_email=current_user.get("email", "candidate@example.com"),
        user_name=current_user["full_name"],
        notification_type="interview_scheduled",
        details={
            "title": req.title,
            "domain": req.domain,
            "difficulty": req.difficulty,
            "type": req.type,
            "scheduled_time": req.scheduled_time,
            "duration_minutes": req.duration_minutes
        }
    )

    return {
        "message": "Interview successfully scheduled",
        "scheduled_interview": sched_obj,
        "reminders": reminders
    }


@router.get("/api/interviews/upcoming")
def get_upcoming_interviews(
    current_user: dict = Depends(get_current_user)
):
    """
    Returns upcoming scheduled interviews for the authenticated user.
    """
    user_id = current_user["id"]
    if current_user["role"] in ["recruiter", "admin"]:
        upcoming = list(db.scheduled_interviews.values())
    else:
        upcoming = [
            intv for intv in db.scheduled_interviews.values()
            if intv.get("user_id") == user_id
        ]

    # Filter out Cancelled
    upcoming = [intv for intv in upcoming if intv.get("status") != "Cancelled"]
    upcoming.sort(key=lambda x: x.get("scheduled_time", ""), reverse=False)

    return {
        "upcoming_interviews": upcoming,
        "count": len(upcoming)
    }


@router.delete("/api/interviews/scheduled/{interview_id}")
def cancel_scheduled_interview(
    interview_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancels a scheduled interview and cancels pending reminders.
    """
    user_id = current_user["id"]
    intv = db.scheduled_interviews.get(interview_id)
    if not intv:
        raise HTTPException(status_code=404, detail="Scheduled interview not found.")

    if current_user["role"] == "candidate" and intv.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    intv["status"] = "Cancelled"
    cancel_interview_reminders(interview_id, intv.get("user_id"))

    # Create Cancellation notification & email
    create_in_app_notification(
        user_id=intv.get("user_id"),
        title="Interview Cancelled",
        message=f"Your scheduled interview '{intv.get('title')}' has been cancelled.",
        notification_type="alert",
        related_id=interview_id,
        action_url="#upcoming"
    )

    send_email_notification(
        user_id=intv.get("user_id"),
        recipient_email=intv.get("candidate_email", "candidate@example.com"),
        user_name=intv.get("candidate_name", "Candidate"),
        notification_type="interview_cancelled",
        details={"title": intv.get("title")}
    )

    return {"message": "Scheduled interview cancelled successfully"}


# ==============================================================================
# 3. Reminders Management Endpoints
# ==============================================================================

@router.get("/api/reminders")
def list_user_reminders(
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves all reminder records configured for the authenticated user.
    """
    # Trigger processing of any due reminders on fetch
    process_due_reminders()
    reminders = get_user_reminders(current_user["id"])
    return {
        "reminders": reminders,
        "count": len(reminders)
    }


@router.post("/api/reminders")
def create_custom_reminder(
    req: CreateReminderRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Creates a reminder entry for a scheduled interview with duplicate prevention.
    """
    user_id = current_user["id"]
    interview = db.scheduled_interviews.get(req.interview_id) or db.interviews.get(req.interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")

    if current_user["role"] == "candidate" and interview.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    target_time = req.scheduled_time or interview.get("scheduled_time") or (datetime.datetime.now() + datetime.timedelta(days=1)).isoformat()
    reminders = schedule_interview_reminders(
        user_id=user_id,
        interview_id=req.interview_id,
        scheduled_time_iso=target_time,
        reminder_types=[req.reminder_type]
    )

    if not reminders:
        return {"message": "Reminder for this timing already exists", "reminders": []}

    return {"message": "Reminder created successfully", "reminders": reminders}


@router.delete("/api/reminders/{reminder_id}")
def remove_reminder(
    reminder_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Deletes a specific reminder.
    """
    success = delete_reminder(reminder_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Reminder not found or access denied.")
    return {"message": "Reminder deleted successfully"}


@router.post("/api/reminders/process-due")
def trigger_due_reminders_check(
    current_user: dict = Depends(get_current_user)
):
    """
    Maintenance endpoint to explicitly trigger due reminder checks.
    """
    dispatched = process_due_reminders()
    return {
        "message": f"Processed due reminders. Dispatched {len(dispatched)} alerts.",
        "dispatched_count": len(dispatched),
        "dispatched": dispatched
    }


# ==============================================================================
# 4. Email Notification Logs & Test Dispatch
# ==============================================================================

@router.get("/api/email-notifications")
def get_email_logs(
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves email logs for the authenticated user without exposing credentials.
    """
    user_id = current_user["id"]
    if current_user["role"] in ["recruiter", "admin"]:
        logs = list(db.email_logs.values())
    else:
        logs = [log for log in db.email_logs.values() if log.get("user_id") == user_id]

    logs.sort(key=lambda x: x.get("sent_at", ""), reverse=True)
    return {
        "email_notifications": logs,
        "count": len(logs)
    }


@router.post("/api/emails/send")
def trigger_manual_email(
    req: SendEmailRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Sends an email notification using real user context.
    """
    user_id = current_user["id"]
    recipient = req.recipient_email or current_user.get("email", "candidate@example.com")
    
    log = send_email_notification(
        user_id=user_id,
        recipient_email=recipient,
        user_name=current_user["full_name"],
        notification_type=req.notification_type,
        details=req.details
    )

    return {
        "message": "Email notification dispatched successfully",
        "email_log": log
    }
