"""Small activity-feed helper, mirroring backend/utils/notify.js so
notifications created here show up in the same dashboards."""
from sqlalchemy.orm import Session

from app.models import Notification


def notify(db: Session, *, title: str, message: str, user_id: int | None = None, role: str | None = None) -> None:
    if user_id is None and role is None:
        raise ValueError("notify() requires either user_id or role")
    db.add(Notification(user_id=user_id, role=role, title=title, message=message))
    db.commit()
