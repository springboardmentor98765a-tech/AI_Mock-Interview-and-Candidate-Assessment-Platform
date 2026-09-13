import datetime
from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class InterviewConsent(Base):
    __tablename__ = "interview_consents"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    consent_given = Column(Boolean, default=False, nullable=False)
    consent_timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    revoked_at = Column(DateTime, nullable=True, default=None)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    interview = relationship("Interview")
    candidate = relationship("User", foreign_keys=[candidate_id])
    recruiter = relationship("User", foreign_keys=[recruiter_id])
