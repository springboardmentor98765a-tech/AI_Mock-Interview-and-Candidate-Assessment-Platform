import json
import sqlite3
from typing import Optional, Dict, Any, List
from services.email_service import send_notification_email
from config import APP_BASE_URL


def _safe_json_loads(val, default=None):
    if not val:
        return default
    try:
        return json.loads(val)
    except Exception:
        return default


def row_to_notification(row) -> dict:
    d = dict(row)
    return {
        "id": d["id"],
        "user_id": d["user_id"],
        "type": d["type"],
        "title": d["title"],
        "message": d["message"],
        "data": _safe_json_loads(d.get("data_json"), {}),
        "is_read": bool(d.get("is_read", 0)),
        "created_at": str(d["created_at"]) if d.get("created_at") else None,
    }


def create_notification(
    conn: sqlite3.Connection,
    user_id: int,
    notif_type: str,
    title: str,
    message: str,
    data: Optional[Dict[str, Any]] = None,
    send_email: bool = False
) -> dict:
    """Create a new notification record in the database and optionally dispatch an email."""
    data_json = json.dumps(data or {})
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO notifications (user_id, type, title, message, data_json, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    """, (user_id, notif_type, title, message, data_json))
    notif_id = cursor.lastrowid
    conn.commit()

    # Fetch inserted row
    row = conn.execute("SELECT * FROM notifications WHERE id = ?", (notif_id,)).fetchone()
    notif_dict = row_to_notification(row)

    # Optional email dispatch
    if send_email:
        try:
            user_row = conn.execute("SELECT email, name FROM users WHERE id = ?", (user_id,)).fetchone()
            if user_row and user_row["email"]:
                email = user_row["email"]
                action_url = f"{APP_BASE_URL}"
                if data and "session_id" in data:
                    action_url = f"{APP_BASE_URL}"
                send_notification_email(
                    recipient=email,
                    subject=f"SmartHire AI: {title}",
                    title=title,
                    message=message,
                    action_label="Open SmartHire AI",
                    action_url=action_url,
                    badge_label=notif_type.replace("_", " ").upper()
                )
        except Exception as e:
            print(f"[Warning] Notification email dispatch failed: {e}")

    return notif_dict


def get_user_notifications(
    conn: sqlite3.Connection,
    user_id: int,
    is_read: Optional[bool] = None,
    notif_type: Optional[str] = None,
    limit: int = 40,
    offset: int = 0
) -> List[dict]:
    """Retrieve notifications for a user with optional read/type filters."""
    query = "SELECT * FROM notifications WHERE user_id = ?"
    params: List[Any] = [user_id]

    if is_read is not None:
        query += " AND is_read = ?"
        params.append(1 if is_read else 0)

    if notif_type and notif_type != "all":
        query += " AND type = ?"
        params.append(notif_type)

    query += " ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = conn.execute(query, params).fetchall()
    return [row_to_notification(r) for r in rows]


def get_unread_count(conn: sqlite3.Connection, user_id: int) -> int:
    """Return count of unread notifications for a user."""
    row = conn.execute(
        "SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0",
        (user_id,)
    ).fetchone()
    return row["cnt"] if row else 0


def mark_notification_read(conn: sqlite3.Connection, user_id: int, notif_id: int) -> bool:
    """Mark a single notification as read."""
    conn.execute(
        "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
        (notif_id, user_id)
    )
    conn.commit()
    return True


def mark_all_notifications_read(conn: sqlite3.Connection, user_id: int) -> int:
    """Mark all notifications as read for a user."""
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
        (user_id,)
    )
    updated = cursor.rowcount
    conn.commit()
    return updated


def delete_notification(conn: sqlite3.Connection, user_id: int, notif_id: int) -> bool:
    """Delete a single notification."""
    conn.execute(
        "DELETE FROM notifications WHERE id = ? AND user_id = ?",
        (notif_id, user_id)
    )
    conn.commit()
    return True


def clear_all_notifications(conn: sqlite3.Connection, user_id: int) -> int:
    """Delete all notifications for a user."""
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notifications WHERE user_id = ?", (user_id,))
    deleted = cursor.rowcount
    conn.commit()
    return deleted


def seed_sample_notifications_if_empty(conn: sqlite3.Connection, user_id: int):
    """Seed initial contextual notifications if user has 0 notifications."""
    count = conn.execute("SELECT COUNT(*) FROM notifications WHERE user_id = ?", (user_id,)).fetchone()[0]
    if count > 0:
        return

    # Check for completed sessions to generate realistic report notifications
    completed_sessions = conn.execute(
        "SELECT id, domain, overall_score, performance_rating, created_at FROM interview_session WHERE (user_id = ? OR candidate_id = ?) AND status = 'completed' ORDER BY created_at DESC LIMIT 3",
        (user_id, user_id)
    ).fetchall()

    if completed_sessions:
        for s in completed_sessions:
            score = round(s["overall_score"], 1) if s["overall_score"] is not None else 0.0
            rating = s["performance_rating"] or "Average"
            domain = s["domain"] or "General Engineering"
            create_notification(
                conn=conn,
                user_id=user_id,
                notif_type="report_ready",
                title=f"AI Evaluation Report Ready: {domain}",
                message=f"Your diagnostic evaluation for session #{s['id']} is available with an overall score of {score}% ({rating}). Click to review your detailed 19-parameter analysis.",
                data={"session_id": s["id"], "score": score, "rating": rating, "domain": domain, "action_type": "report"}
            )

    # Add a practice reminder notification
    create_notification(
        conn=conn,
        user_id=user_id,
        notif_type="interview_reminder",
        title="Weekly Practice Recommendation",
        message="Keep your interview momentum going! Master technical and behavioral responses with targeted mock sessions.",
        data={"action_type": "practice", "domain": "Software Engineering"}
    )

    # Add performance summary notification
    create_notification(
        conn=conn,
        user_id=user_id,
        notif_type="performance_summary",
        title="Performance Summary & Telemetry",
        message="SmartHire AI has indexed your communication cadence, grammar fluency, and confidence metrics.",
        data={"action_type": "analytics"}
    )
