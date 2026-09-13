from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from auth import get_current_user
from services import notification_service
from config import APP_BASE_URL

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class ReminderCreateReq(BaseModel):
    title: Optional[str] = "Interview Practice Reminder"
    message: Optional[str] = "Don't forget to practice your technical and behavioral interview questions today."
    domain: Optional[str] = "Software Engineering"
    send_email: Optional[bool] = False


class TestEmailReq(BaseModel):
    recipient: Optional[str] = None
    subject: Optional[str] = "SmartHire AI Notification Test"
    message: Optional[str] = "This is a test notification from SmartHire AI to verify your email delivery configuration."


@router.get("")
def list_notifications(
    tab: Optional[str] = Query("all", description="Filter tab: all, unread, reports, reminders, alerts, summary"),
    limit: int = Query(40, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user)
):
    conn = get_db()
    user_id = user["id"]
    notification_service.seed_sample_notifications_if_empty(conn, user_id)

    is_read_filter = None
    type_filter = None

    if tab == "unread":
        is_read_filter = False
    elif tab == "reports":
        type_filter = "report_ready"
    elif tab == "reminders":
        type_filter = "interview_reminder"
    elif tab == "alerts":
        type_filter = "session_alert"
    elif tab == "summary":
        type_filter = "performance_summary"

    notifs = notification_service.get_user_notifications(
        conn=conn,
        user_id=user_id,
        is_read=is_read_filter,
        notif_type=type_filter,
        limit=limit,
        offset=offset
    )
    unread_count = notification_service.get_unread_count(conn, user_id)
    total_count = conn.execute("SELECT COUNT(*) FROM notifications WHERE user_id = ?", (user_id,)).fetchone()[0]
    conn.close()

    return {
        "notifications": notifs,
        "unread_count": unread_count,
        "total": total_count
    }


@router.get("/unread-count")
def get_unread_count(user: dict = Depends(get_current_user)):
    conn = get_db()
    user_id = user["id"]
    notification_service.seed_sample_notifications_if_empty(conn, user_id)
    unread_count = notification_service.get_unread_count(conn, user_id)
    conn.close()
    return {"unread_count": unread_count}


@router.put("/read-all")
def mark_all_as_read(user: dict = Depends(get_current_user)):
    conn = get_db()
    count = notification_service.mark_all_notifications_read(conn, user["id"])
    conn.close()
    return {"message": f"Marked {count} notifications as read", "updated_count": count}


@router.put("/{notification_id}/read")
def mark_as_read(notification_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    notification_service.mark_notification_read(conn, user["id"], notification_id)
    unread_count = notification_service.get_unread_count(conn, user["id"])
    conn.close()
    return {"message": "Notification marked as read", "notification_id": notification_id, "unread_count": unread_count}


@router.delete("/{notification_id}")
def delete_notification(notification_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    notification_service.delete_notification(conn, user["id"], notification_id)
    unread_count = notification_service.get_unread_count(conn, user["id"])
    conn.close()
    return {"message": "Notification dismissed", "notification_id": notification_id, "unread_count": unread_count}


@router.delete("")
def clear_all(user: dict = Depends(get_current_user)):
    conn = get_db()
    count = notification_service.clear_all_notifications(conn, user["id"])
    conn.close()
    return {"message": f"Cleared {count} notifications", "deleted_count": count}


@router.post("/send-reminder")
def trigger_reminder(req: ReminderCreateReq, user: dict = Depends(get_current_user)):
    """Trigger a mock interview reminder / alert with optional email dispatch."""
    conn = get_db()
    notif = notification_service.create_notification(
        conn=conn,
        user_id=user["id"],
        notif_type="interview_reminder",
        title=req.title or "Interview Practice Reminder",
        message=req.message or f"Time to practice for your upcoming {req.domain} interview! Take a 15-min mock session now.",
        data={"action_type": "practice", "domain": req.domain},
        send_email=req.send_email or False
    )
    conn.close()
    return {"message": "Interview reminder dispatched successfully", "notification": notif}


@router.post("/test-email")
def test_email(req: TestEmailReq, user: dict = Depends(get_current_user)):
    """Send a test notification email or log in dev mode."""
    from services.email_service import send_notification_email
    recipient = req.recipient or user.get("email")
    if not recipient:
        raise HTTPException(status_code=400, detail="No recipient email specified or found for user.")

    success = send_notification_email(
        recipient=recipient,
        subject=req.subject or "SmartHire AI Notification Test",
        title="SmartHire AI System Notification",
        message=req.message or "This is a test notification to verify your email delivery pipeline.",
        action_label="Open SmartHire AI",
        action_url=APP_BASE_URL,
        badge_label="TEST NOTIFICATION"
    )
    return {
        "success": success,
        "recipient": recipient,
        "message": f"Test email dispatched for {recipient}."
    }

