import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    role = Column(String, nullable=True)
    action = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)
    resource_id = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    metadata_json = Column("metadata", JSON, nullable=True)

class QuestionBank(Base):
    __tablename__ = "question_bank"

    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, index=True, nullable=False)
    category = Column(String, nullable=False)
    difficulty = Column(String, nullable=False, default="Medium")
    question = Column(Text, unique=True, nullable=False)
    expected_answer = Column(Text, nullable=True)
    evaluation_points = Column(JSON, nullable=True)
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resume_id = Column(Integer, ForeignKey("resume_uploads.id"), nullable=True)
    
    interview_type = Column(String, nullable=False, default="Technical")
    domain = Column(String, nullable=False, default="Software Engineering")
    difficulty = Column(String, nullable=False, default="Medium")
    duration_mins = Column(Integer, default=30)
    experience_level = Column(String, default="Mid")
    skills_detected = Column(JSON, nullable=True)
    
    status = Column(String, nullable=False, default="Generated")  # Draft, Generated, Assigned, In Progress, Completed, Cancelled
    ai_provider = Column(String, nullable=False, default="Gemini")
    ai_model = Column(String, nullable=False, default="gemini-2.5-flash")
    generation_source = Column(String, nullable=False, default="AI")  # AI or Question Bank
    fallback_reason = Column(Text, nullable=True)
    generation_timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    candidate = relationship("User", foreign_keys=[candidate_id])
    recruiter = relationship("User", foreign_keys=[recruiter_id])
    questions = relationship("InterviewQuestion", back_populates="interview", cascade="all, delete-orphan")
    sessions = relationship("InterviewSession", back_populates="interview", cascade="all, delete-orphan")

class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    difficulty = Column(String, nullable=False, default="Medium")
    expected_answer = Column(Text, nullable=True)
    evaluation_points = Column(JSON, nullable=True)
    sequence_no = Column(Integer, nullable=False, default=1)

    interview = relationship("Interview", back_populates="questions")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    duration = Column(Integer, default=0)  # seconds
    score = Column(Float, default=0.0)
    remarks = Column(Text, nullable=True)
    answers_json = Column(JSON, nullable=True)

    interview = relationship("Interview", back_populates="sessions")
