from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from security.dependencies import get_current_user
from services.notification_service import (
    get_user_notifications,
    get_unread_notification_count,
    mark_notification_read,
    mark_all_notifications_read,
    check_and_send_interview_reminders,
    get_candidate_reminders
)

router = APIRouter(tags=["In-App Notifications"])


@router.get("/api/notifications")
@router.get("/api/notifications/")
def list_user_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve user in-app notifications and unread count."""
    # Opportunistically check upcoming interview reminders
    try:
        check_and_send_interview_reminders(db)
    except Exception:
        pass

    notifications = get_user_notifications(db, current_user.id)
    unread_count = get_unread_notification_count(db, current_user.id)

    return {
        "success": True,
        "unread_count": unread_count,
        "data": notifications
    }


@router.get("/api/candidate/reminders")
@router.get("/api/notifications/reminders")
def get_candidate_interview_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve candidate upcoming interview reminders with time remaining."""
    data = get_candidate_reminders(db, current_user.id)
    return {"success": True, "data": data}


@router.put("/api/notifications/read-all")
def mark_all_user_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all user notifications as read."""
    res = mark_all_notifications_read(db, current_user.id)
    return res


@router.put("/api/notifications/{notification_id}/read")
def mark_single_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a single notification as read."""
    res = mark_notification_read(db, current_user.id, notification_id)
    return res

