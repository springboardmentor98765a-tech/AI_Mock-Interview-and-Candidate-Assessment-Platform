import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String, nullable=False, default="GENERAL")  # ASSIGNMENT, REMINDER, COMPLETION, REPORT_READY, CONSENT_REQUEST, GENERAL
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=True, index=True)

    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    read_at = Column(DateTime, nullable=True, default=None)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    interview = relationship("Interview", foreign_keys=[interview_id])
