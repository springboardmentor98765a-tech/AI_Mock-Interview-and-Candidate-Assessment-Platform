import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base

class RecruiterProfile(Base):
    __tablename__ = "recruiter_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    company_name = Column(String, nullable=True)
    company_email = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    verification_status = Column(String, default="VERIFIED")

    user = relationship("User", back_populates="recruiter_profile")

class InterviewTemplate(Base):
    __tablename__ = "interview_templates"

    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=False, default="Technical")
    difficulty = Column(String, nullable=False, default="MEDIUM")
    duration_mins = Column(Integer, default=30)
    questions = Column(Text, nullable=False)  # JSON formatted question list
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

