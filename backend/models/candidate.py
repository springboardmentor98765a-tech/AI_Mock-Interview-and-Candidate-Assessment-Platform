import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from database import Base

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    phone = Column(String, nullable=True)
    college = Column(String, nullable=True)
    degree = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    graduation_year = Column(Integer, nullable=True)
    skills = Column(String, nullable=True)
    preferred_role = Column(String, nullable=True)
    experience_level = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    github = Column(String, nullable=True)
    portfolio = Column(String, nullable=True)
    resume = Column(String, nullable=True)
    ats_score = Column(Float, default=0.0)
    interview_score = Column(Float, default=0.0)
    profile_picture = Column(String, nullable=True)

    user = relationship("User", back_populates="candidate_profile")

class ResumeUpload(Base):
    __tablename__ = "resume_uploads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_format = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

class InterviewHistory(Base):
    __tablename__ = "interview_history"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String, nullable=False)  # Technical, HR, Behavioral
    target_role = Column(String, nullable=True, default="Software Engineer")
    session_type = Column(String, nullable=True, default="Mock Interview")
    status = Column(String, default="COMPLETED")  # COMPLETED, IN_PROGRESS, ABANDONED
    score = Column(Float, default=0.0)
    total_questions = Column(Integer, default=5)
    answered_questions = Column(Integer, default=0)
    time_taken_seconds = Column(Integer, default=0)
    answers_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

