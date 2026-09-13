import datetime
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models.notification import Notification
from models.interview import Interview
from models.user import User
from services.email_service import send_interview_reminder_email

logger = logging.getLogger("notification_service")

def create_notification(
    db: Session,
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    interview_id: Optional[int] = None
) -> Notification:
    """Create and persist an in-app user notification."""
    notif = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        interview_id=interview_id,
        is_read=False,
        created_at=datetime.datetime.utcnow()
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    logger.info(f"[NOTIFICATION CREATED] user_id={user_id}, type={notification_type}, title='{title}'")
    return notif


def get_user_notifications(db: Session, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    """Fetch user's in-app notifications sorted by newest first."""
    records = db.query(Notification).filter(
        Notification.user_id == user_id
    ).order_by(Notification.created_at.desc()).limit(limit).all()

    res = []
    for r in records:
        res.append({
            "id": r.id,
            "user_id": r.user_id,
            "type": r.type,
            "title": r.title,
            "message": r.message,
            "interview_id": r.interview_id,
            "is_read": r.is_read,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else None,
            "read_at": r.read_at.strftime("%Y-%m-%d %H:%M:%S") if r.read_at else None
        })
    return res


def get_unread_notification_count(db: Session, user_id: int) -> int:
    """Get count of unread notifications for user."""
    return db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).count()


def mark_notification_read(db: Session, user_id: int, notification_id: int) -> Dict[str, Any]:
    """Mark a single notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()

    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    if not notif.is_read:
        notif.is_read = True
        notif.read_at = datetime.datetime.utcnow()
        db.commit()

    return {"success": True, "message": "Notification marked as read.", "notification_id": notification_id}


def mark_all_notifications_read(db: Session, user_id: int) -> Dict[str, Any]:
    """Mark all unread notifications for user as read."""
    now = datetime.datetime.utcnow()
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).update({
        Notification.is_read: True,
        Notification.read_at: now
    }, synchronize_session=False)

    db.commit()
    return {"success": True, "message": "All notifications marked as read."}


def check_and_send_interview_reminders(db: Session):
    """
    Checks upcoming assigned interviews and dispatches 24h / 1h reminders without duplicating.
    """
    now = datetime.datetime.utcnow()
    assigned_interviews = db.query(Interview).filter(
        Interview.status.in_(["Assigned", "Generated"]),
        Interview.is_deleted == False
    ).all()

    for interview in assigned_interviews:
        # Check if reminder already sent for this interview
        existing_reminder = db.query(Notification).filter(
            Notification.user_id == interview.candidate_id,
            Notification.interview_id == interview.id,
            Notification.type == "REMINDER"
        ).first()

        if not existing_reminder:
            cand = db.query(User).filter(User.id == interview.candidate_id).first()
            if cand:
                create_notification(
                    db=db,
                    user_id=cand.id,
                    notification_type="REMINDER",
                    title="Interview Reminder",
                    message=f"Your assigned mock interview for {interview.domain} is ready to start. Click to launch session.",
                    interview_id=interview.id
                )
                try:
                    send_interview_reminder_email(cand.email, cand.name, interview.domain, "soon")
                except Exception as e:
                    logger.warning(f"Reminder email failed silently: {e}")


def get_candidate_reminders(db: Session, candidate_id: int) -> List[Dict[str, Any]]:
    """Retrieve upcoming persistent interview reminders for candidate dashboard."""
    check_and_send_interview_reminders(db)

    upcoming_interviews = db.query(Interview).filter(
        Interview.candidate_id == candidate_id,
        Interview.status.in_(["Assigned", "Generated", "In Progress", "PAUSED"]),
        Interview.is_deleted == False
    ).order_by(Interview.created_at.desc()).all()

    reminders = []
    now = datetime.datetime.utcnow()

    for interview in upcoming_interviews:
        notif = db.query(Notification).filter(
            Notification.user_id == candidate_id,
            Notification.interview_id == interview.id,
            Notification.type == "REMINDER"
        ).first()

        created_dt = interview.created_at or now
        time_diff = now - created_dt
        
        if time_diff.total_seconds() < 3600:
            time_remaining = "Starting Soon (Ready)"
        elif time_diff.total_seconds() < 86400:
            hours = int(time_diff.total_seconds() // 3600)
            time_remaining = f"Assigned {hours}h ago (Active)"
        else:
            days = int(time_diff.total_seconds() // 86400)
            time_remaining = f"Assigned {days}d ago"

        reminders.append({
            "id": notif.id if notif else interview.id,
            "interview_id": interview.id,
            "title": f"{interview.domain} ({interview.interview_type})",
            "domain": interview.domain,
            "interview_type": interview.interview_type,
            "difficulty": interview.difficulty,
            "duration_mins": interview.duration_mins,
            "date": created_dt.strftime("%b %d, %Y %H:%M"),
            "time_remaining": time_remaining,
            "status": interview.status,
            "is_read": notif.is_read if notif else False
        })

    return reminders

