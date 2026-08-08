"""
models.py
==========
SQLAlchemy ORM models:
    User               - accounts / auth
    Interview          - a generated interview session
    InterviewQuestion  - one question (and, once answered, its transcript)
    belonging to an Interview
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, Enum, Integer, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class RoleEnum(str, enum.Enum):
    candidate = "candidate"
    recruiter = "recruiter"
    admin = "admin"


class AuthProviderEnum(str, enum.Enum):
    local = "local"
    google = "google"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)

    # Nullable because Google-authenticated users never set a local password
    password_hash = Column(String(255), nullable=True)

    # Nullable because a brand-new Google sign-up has no role yet until
    # they complete the "Choose Your Role" step (see /auth/google/select-role).
    role = Column(Enum(RoleEnum, name="user_role"), nullable=True)

    auth_provider = Column(
        Enum(AuthProviderEnum, name="auth_provider"),
        nullable=False,
        default=AuthProviderEnum.local,
    )

    google_id = Column(String(255), unique=True, nullable=True)
    profile_picture = Column(String(500), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # ------------- Resume: Module 2 - Resume Parsing & Analysis -------------
    resume_file_name = Column(String(255), nullable=True)
    resume_text = Column(Text, nullable=True)
    # Comma-separated list of skills extracted from the resume, e.g. "python,sql,react"
    resume_skills = Column(Text, nullable=True)
    # Skills grouped by category, e.g. {"languages": ["Python"], "databases": [...]}
    resume_skills_by_category = Column(JSON, nullable=True)
    # Total years of experience detected from explicit resume phrasing (e.g. "4 years of experience")
    resume_experience_years = Column(Float, nullable=True)
    # Parsed job history: [{"title", "company", "duration"}, ...]
    resume_experience = Column(JSON, nullable=True)
    # Parsed education history: [{"degree", "institution", "year"}, ...]
    resume_education = Column(JSON, nullable=True)
    # Auto-generated short summary of the candidate (Gemini, with a local fallback)
    resume_summary = Column(Text, nullable=True)
    resume_uploaded_at = Column(DateTime, nullable=True)

    interviews = relationship(
        "Interview", back_populates="user", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Module 3 - AI Interview Generation
# ---------------------------------------------------------------------------
class InterviewTypeEnum(str, enum.Enum):
    hr = "hr"
    technical = "technical"
    behavioral = "behavioral"
    aptitude = "aptitude"


class DifficultyEnum(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class InterviewStatusEnum(str, enum.Enum):
    created = "created"
    in_progress = "in_progress"
    completed = "completed"


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    interview_type = Column(Enum(InterviewTypeEnum, name="interview_type"), nullable=False)
    domain = Column(String(150), nullable=False)  # e.g. "Python", "General HR"
    difficulty = Column(Enum(DifficultyEnum, name="interview_difficulty"), nullable=False)

    status = Column(
        Enum(InterviewStatusEnum, name="interview_status"),
        nullable=False,
        default=InterviewStatusEnum.created,
    )

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Timer feature: candidate-selected time limit for the whole interview
    # (minutes). NULL / 0 means "no time limit".
    duration_minutes = Column(Integer, nullable=True)
    # True if this interview was auto-ended because the timer ran out,
    # rather than the candidate answering every question.
    time_expired = Column(Boolean, nullable=False, default=False)

    # Real, computed-from-answers overall score (0-100) - weighted average
    # of every answered question's technical/communication/confidence/
    # grammar scores. NULL until at least one question has been scored.
    overall_score = Column(Float, nullable=True)

    user = relationship("User", back_populates="interviews")
    questions = relationship(
        "InterviewQuestion",
        back_populates="interview",
        cascade="all, delete-orphan",
        order_by="InterviewQuestion.sequence_no",
    )

    @property
    def total_questions(self) -> int:
        return len(self.questions)

    @property
    def answered_count(self) -> int:
        return sum(1 for q in self.questions if q.answer_text)


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interview_id = Column(UUID(as_uuid=True), ForeignKey("interviews.id"), nullable=False)

    question_text = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)  # e.g. "hr", "python", "logical-reasoning"
    difficulty = Column(Enum(DifficultyEnum, name="question_difficulty"), nullable=False)
    sequence_no = Column(Integer, nullable=False)

    # Filled in once the candidate answers (voice -> transcribed text)
    answer_text = Column(Text, nullable=True)
    answered_at = Column(DateTime, nullable=True)

    # Real per-answer analytics (0-100), computed in app/scoring.py the
    # moment the answer is submitted. NULL until answered.
    technical_score = Column(Float, nullable=True)
    communication_score = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    grammar_score = Column(Float, nullable=True)
    overall_score = Column(Float, nullable=True)
    word_count = Column(Integer, nullable=True)

    interview = relationship("Interview", back_populates="questions")
