"""
Notification & Reminder Service
Handles in-app notification creation, unread counting, status management,
duplicate-safe interview reminder scheduling, and automated due reminder processing.
"""

import uuid
import datetime
from typing import Dict, Any, List, Optional

from backend.database import db
from backend.services.email_service import send_email_notification


def create_in_app_notification(
    user_id: str,
    title: str,
    message: str,
    notification_type: str = "alert",
    related_id: Optional[str] = None,
    action_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Creates and stores a user-specific in-app notification.
    """
    notif_id = f"notif_{uuid.uuid4().hex[:10]}"
    now_iso = datetime.datetime.now().isoformat()

    notif_obj = {
        "id": notif_id,
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notification_type, # reminder, session_start, session_end, assessment, report, alert
        "is_read": False,
        "related_id": related_id,
        "action_url": action_url,
        "created_at": now_iso
    }

    db.notifications[notif_id] = notif_obj
    return notif_obj


def get_user_notifications(user_id: str, unread_only: bool = False) -> List[Dict[str, Any]]:
    """
    Retrieves all notifications for a specific user sorted by latest first.
    """
    user_notifs = [
        n for n in db.notifications.values()
        if n.get("user_id") == user_id
    ]

    if unread_only:
        user_notifs = [n for n in user_notifs if not n.get("is_read")]

    # Sort descending by created_at
    user_notifs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return user_notifs


def get_unread_notification_count(user_id: str) -> int:
    """
    Calculates unread notification count directly from database records.
    """
    return sum(
        1 for n in db.notifications.values()
        if n.get("user_id") == user_id and not n.get("is_read")
    )


def mark_notification_read(notification_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """
    Marks a single notification as read if it belongs to the user.
    """
    notif = db.notifications.get(notification_id)
    if not notif or notif.get("user_id") != user_id:
        return None

    notif["is_read"] = True
    return notif


def mark_all_notifications_read(user_id: str) -> int:
    """
    Marks all notifications for a user as read.
    """
    count = 0
    for notif in db.notifications.values():
        if notif.get("user_id") == user_id and not notif.get("is_read"):
            notif["is_read"] = True
            count += 1
    return count


def delete_notification(notification_id: str, user_id: str) -> bool:
    """
    Deletes a notification if it belongs to the user.
    """
    notif = db.notifications.get(notification_id)
    if not notif or notif.get("user_id") != user_id:
        return False

    del db.notifications[notification_id]
    return True


# ==============================================================================
# Scheduled Interview Reminders Engine
# ==============================================================================

def schedule_interview_reminders(
    user_id: str,
    interview_id: str,
    scheduled_time_iso: str,
    reminder_types: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Generates reminder entries (e.g. 24h, 1h, 15m before target time) with duplicate prevention.
    """
    reminder_types = reminder_types or ["24h", "1h", "15m"]
    created_reminders = []
    
    try:
        target_dt = datetime.datetime.fromisoformat(scheduled_time_iso)
    except Exception:
        target_dt = datetime.datetime.now() + datetime.timedelta(days=1)

    time_deltas = {
        "24h": datetime.timedelta(hours=24),
        "1h": datetime.timedelta(hours=1),
        "15m": datetime.timedelta(minutes=15)
    }

    now = datetime.datetime.now()

    for r_type in reminder_types:
        delta = time_deltas.get(r_type, datetime.timedelta(hours=1))
        rem_trigger_dt = target_dt - delta

        # Check for existing duplicate reminder
        duplicate = any(
            r.get("user_id") == user_id and
            r.get("interview_id") == interview_id and
            r.get("reminder_type") == r_type
            for r in db.reminders.values()
        )
        if duplicate:
            continue

        rem_id = f"rem_{uuid.uuid4().hex[:10]}"
        rem_obj = {
            "id": rem_id,
            "user_id": user_id,
            "interview_id": interview_id,
            "reminder_type": r_type,
            "scheduled_time": rem_trigger_dt.isoformat(),
            "target_interview_time": target_dt.isoformat(),
            "status": "pending", # pending, sent, failed, cancelled
            "sent_at": None,
            "created_at": now.isoformat()
        }

        db.reminders[rem_id] = rem_obj
        created_reminders.append(rem_obj)

    return created_reminders


def get_user_reminders(user_id: str) -> List[Dict[str, Any]]:
    """
    Retrieves all reminders for a user.
    """
    user_rems = [
        r for r in db.reminders.values()
        if r.get("user_id") == user_id
    ]
    user_rems.sort(key=lambda x: x.get("scheduled_time", ""), reverse=False)
    return user_rems


def delete_reminder(reminder_id: str, user_id: str) -> bool:
    """
    Deletes a reminder if it belongs to the user.
    """
    rem = db.reminders.get(reminder_id)
    if not rem or rem.get("user_id") != user_id:
        return False

    del db.reminders[reminder_id]
    return True


def cancel_interview_reminders(interview_id: str, user_id: str) -> int:
    """
    Cancels all pending reminders for a given interview.
    """
    cancelled_count = 0
    for rem in list(db.reminders.values()):
        if rem.get("interview_id") == interview_id and rem.get("user_id") == user_id:
            if rem.get("status") == "pending":
                rem["status"] = "cancelled"
                cancelled_count += 1
    return cancelled_count


def process_due_reminders() -> List[Dict[str, Any]]:
    """
    Evaluates all pending reminders and dispatches notifications/emails for due entries.
    Prevents duplicate delivery.
    """
    now = datetime.datetime.now()
    dispatched = []

    for rem in list(db.reminders.values()):
        if rem.get("status") != "pending":
            continue

        scheduled_time_str = rem.get("scheduled_time")
        if not scheduled_time_str:
            continue

        try:
            sched_dt = datetime.datetime.fromisoformat(scheduled_time_str)
        except Exception:
            continue

        if sched_dt <= now:
            user_id = rem.get("user_id")
            interview_id = rem.get("interview_id")
            user = db.users.get(user_id, {})
            user_name = user.get("full_name", "Candidate")
            user_email = user.get("email", "candidate@example.com")
            
            # Fetch scheduled interview details
            interview = db.scheduled_interviews.get(interview_id) or db.interviews.get(interview_id, {})
            
            if interview.get("status") == "Cancelled":
                rem["status"] = "cancelled"
                continue

            r_type = rem.get("reminder_type", "1h")
            label_map = {"24h": "24 hours", "1h": "1 hour", "15m": "15 minutes"}
            reminder_label = label_map.get(r_type, r_type)

            # 1. Create In-App Notification
            create_in_app_notification(
                user_id=user_id,
                title=f"Interview Reminder ({reminder_label})",
                message=f"Your scheduled interview '{interview.get('title', interview.get('domain', 'Mock Interview'))}' is starting in {reminder_label}.",
                notification_type="reminder",
                related_id=interview_id,
                action_url="#upcoming"
            )

            # 2. Dispatch Email
            send_email_notification(
                user_id=user_id,
                recipient_email=user_email,
                user_name=user_name,
                notification_type="interview_reminder",
                details={
                    "title": interview.get("title", "AI Mock Interview"),
                    "domain": interview.get("domain", "Full Stack"),
                    "type": interview.get("type", "Technical"),
                    "scheduled_time": rem.get("target_interview_time", "Today"),
                    "reminder_label": reminder_label
                }
            )

            rem["status"] = "sent"
            rem["sent_at"] = now.isoformat()
            dispatched.append(rem)

    return dispatched
