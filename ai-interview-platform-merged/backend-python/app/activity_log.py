"""
Module 1 — Admin "Monitor system activities".

Writes to the SAME `activity_log` table the Node service writes to (see
backend/utils/activityLog.js) for registrations/logins/admin actions —
this just covers the events that only happen on this service, mainly
interview completions. Best-effort: a logging failure must never break
the request it's describing.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session


def log_activity(db: Session, user_id: int, role: str, action: str, details: str = "") -> None:
    try:
        db.execute(
            text(
                "INSERT INTO activity_log (actor_user_id, actor_role, action, details) "
                "VALUES (:user_id, :role, :action, :details)"
            ),
            {"user_id": user_id, "role": role, "action": action, "details": details},
        )
        db.commit()
    except Exception:
        db.rollback()
