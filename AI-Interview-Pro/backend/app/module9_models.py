"""Additive Module 9 tables; no changes to existing user/interview columns."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    email_enabled = Column(Boolean, default=False, nullable=False)
    reminders_enabled = Column(Boolean, default=True, nullable=False)
    session_alerts_enabled = Column(Boolean, default=True, nullable=False)
    performance_enabled = Column(Boolean, default=True, nullable=False)


class InterviewReminder(Base):
    __tablename__ = "interview_reminders"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(120), nullable=False)
    scheduled_at = Column(DateTime, nullable=False, index=True)
    remind_at = Column(DateTime, nullable=False, index=True)
    status = Column(String(20), default="scheduled", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_key = Column(String(160), unique=True, nullable=False)
    kind = Column(String(20), nullable=False)
    title = Column(String(160), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    read_at = Column(DateTime, nullable=True)
    email_status = Column(String(24), default="pending", nullable=False, index=True)
    attempts = Column(Integer, default=0, nullable=False)
    retry_at = Column(DateTime, nullable=True)
