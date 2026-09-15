from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    Float,
    JSON,
    func
)
from sqlalchemy.sql import func
from datetime import datetime

from database import Base


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(150),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    role = Column(
        String(20),
        nullable=False
    )

    status = Column(
        String(20),
        default="active"
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# ============================================================
# RESUME
# ============================================================

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        nullable=False
    )

    filename = Column(
        String(255),
        nullable=False
    )

    file_path = Column(
        String(500),
        nullable=False
    )

    extracted_text = Column(
        Text,
        nullable=True
    )

    uploaded_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# ============================================================
# APPLICATION
# ============================================================

class Application(Base):
    __tablename__ = "applications"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    candidate_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    job_id = Column(
        Integer,
        ForeignKey("jobs.id"),
        nullable=False
    )

    resume_id = Column(
        Integer,
        ForeignKey("resumes.id"),
        nullable=True
    )

    status = Column(
        String,
        default="applied",
        nullable=False
    )

    applied_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# ============================================================
# JOB
# ============================================================

class Job(Base):
    __tablename__ = "jobs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    recruiter_id = Column(
        Integer,
        nullable=False
    )

    title = Column(
        String(150),
        nullable=False
    )

    company = Column(
        String(150),
        nullable=False
    )

    description = Column(
        Text,
        nullable=False
    )

    required_skills = Column(
        Text,
        nullable=True
    )

    location = Column(
        String(150),
        nullable=True
    )

    status = Column(
        String(20),
        default="active"
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# ============================================================
# INTERVIEW
# ============================================================

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )
    resume_id = Column(
        Integer,
        ForeignKey("resumes.id"),
        nullable=True
    )

    interview_type = Column(
        String(50),
        nullable=False
    )

    domain = Column(
        String(100),
        nullable=False
    )

    difficulty = Column(
        String(20),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

# ============================================================
# INTERVIEW QUESTION
# ============================================================

class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    interview_id = Column(
        Integer,
        ForeignKey("interviews.id"),
        nullable=False
    )

    question_number = Column(
        Integer,
        nullable=False
    )

    question_text = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

# ============================================================
# INTERVIEW SESSION
# ============================================================

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    candidate_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    interview_id = Column(
        Integer,
        ForeignKey("interviews.id"),
        nullable=False
    )

    start_time = Column(
        DateTime(timezone=True),
        nullable=False
    )

    end_time = Column(
        DateTime(timezone=True),
        nullable=True
    )

    duration = Column(
        Integer,
        nullable=True
    )

    status = Column(
        String,
        default="started"
    )

    questions_attempted = Column(
        Integer,
        default=0
    )
        # ========================================================
    # SPEECH ANALYSIS
    # ========================================================

    total_words = Column(
        Integer,
        default=0
    )

    filler_count = Column(
        Integer,
        default=0
    )

    filler_percentage = Column(
        Float,
        default=0.0
    )

    filler_words = Column(
        JSON,
        nullable=True
    )
        # ========================================================
    # VISUAL AI ANALYSIS
    # ========================================================

    eye_contact_percentage = Column(
        Float,
        default=0.0
    )

    attention_score = Column(
        Float,
        default=0.0
    )

    facial_engagement_score = Column(
        Float,
        default=0.0
    )

    dominant_emotion = Column(
        String,
        nullable=True
    )

    emotion_distribution = Column(
        JSON,
        nullable=True
    )
    # ============================================================
    # MODULE 7 SCORING
    # ============================================================

    communication_score = Column(
        Float,
        nullable=True
    )

    confidence_score = Column(
        Float,
        nullable=True
    )

    professionalism_score = Column(
        Float,
        nullable=True
    )

    final_overall_score = Column(
        Float,
        nullable=True
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# ============================================================
# INTERVIEW ANSWER
# ============================================================

class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    session_id = Column(
        Integer,
        ForeignKey("interview_sessions.id"),
        nullable=False
    )

    question_number = Column(
        Integer,
        nullable=False
    )

    question_text = Column(
        Text,
        nullable=False
    )

    answer_text = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

# ============================================================
# INTERVIEW EVALUATION
# ============================================================

class InterviewEvaluation(Base):
    __tablename__ = "interview_evaluations"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    session_id = Column(
        Integer,
        ForeignKey("interview_sessions.id"),
        nullable=False
    )

    question_number = Column(
        Integer,
        nullable=False
    )

    relevance_score = Column(
        Integer,
        nullable=False
    )

    technical_score = Column(
        Integer,
        nullable=False
    )

    answer_quality_score = Column(
        Integer,
        nullable=False
    )

    overall_score = Column(
        Integer,
        nullable=False
    )

    feedback = Column(
        Text,
        nullable=True
    )
    strengths = Column(
    Text,
    nullable=True
    )

    weaknesses = Column(
        Text,
        nullable=True
    )

    improvement_suggestions = Column(
        Text,
        nullable=True
    )

    practice_recommendations = Column(
        Text,
        nullable=True
    )

    learning_resources = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    # ============================================================
# SCHEDULED INTERVIEW
# ============================================================

class ScheduledInterview(Base):
    __tablename__ = "scheduled_interviews"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, nullable=False)

    scheduled_date = Column(String, nullable=False)

    scheduled_time = Column(String, nullable=False)

    status = Column(String, default="scheduled")

    created_at = Column(DateTime, default=datetime.utcnow)