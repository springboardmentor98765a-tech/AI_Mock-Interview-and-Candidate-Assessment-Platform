from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.db.session import Base

# There is only ever one settings row. Pinning the id keeps that true without
# needing a separate constraint or a "which row is current" question.
SETTINGS_ID = 1


class PlatformSettings(Base):
    """
    Administrator-configurable platform settings.

    Every field here has a real effect somewhere — none of them are decorative:
      max_questions    caps question_count on POST /interviews/generate
      session_minutes  drives the interview timer the client counts down
      open_signup      when false, public registration returns 403
      maintenance      when true, non-admin API calls return 503
    """

    __tablename__ = "platform_settings"

    id = Column(Integer, primary_key=True, default=SETTINGS_ID)

    max_questions = Column(Integer, nullable=False, default=12, server_default="12")
    session_minutes = Column(Integer, nullable=False, default=30, server_default="30")
    open_signup = Column(Boolean, nullable=False, default=True, server_default="true")
    maintenance = Column(Boolean, nullable=False, default=False, server_default="false")

    updated_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<PlatformSettings maintenance={self.maintenance} open_signup={self.open_signup}>"


def get_settings(db: Session) -> PlatformSettings:
    """Fetch the singleton row, creating it with defaults on first use."""
    row = db.query(PlatformSettings).filter(PlatformSettings.id == SETTINGS_ID).first()
    if row is None:
        row = PlatformSettings(id=SETTINGS_ID)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row
