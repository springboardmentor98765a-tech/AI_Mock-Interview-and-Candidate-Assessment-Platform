"""
SQLAlchemy models mapped onto the EXISTING tables created by
backend/db/schema.sql (the Node service owns migrations — this file
only describes/reads the same tables, it never creates or alters
them, so both backends stay in sync automatically).
"""
from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    TIMESTAMP,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    mobile = Column(String(15))
    role = Column(String(20), nullable=False, default="candidate")
    auth_provider = Column(String(20), nullable=False, default="local")
    is_active = Column(Boolean, nullable=False, default=True)
    profile_picture = Column(String(255))
    bio = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP)


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    interview_type = Column(String(100), nullable=False)
    mode = Column(String(20), nullable=False, default="online")
    status = Column(String(20), nullable=False, default="scheduled")
    score = Column(Integer)
    skill_communication = Column(Integer)
    skill_technical = Column(Integer)
    skill_confidence = Column(Integer)
    skill_problem_solving = Column(Integer)
    ai_feedback = Column(Text)
    # Shared feedback column: written by coach OR recruiter OR admin via
    # PATCH /:id/review (see roleMiddleware in the Node service, and
    # require_roles("coach","recruiter","admin") here). Kept as-is —
    # renaming would require a migration both services would need to
    # agree on, and every "human review" role writes through here today.
    coach_feedback = Column(Text)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    scheduled_at = Column(TIMESTAMP)
    completed_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())
    domain = Column(String(100))
    difficulty = Column(String(10), nullable=False, default="medium")
    question_count = Column(Integer, nullable=False, default=0)
    # Proctoring: count of tab-switch / fullscreen-exit / no-face /
    # multi-face warnings raised during a live session (see
    # POST /{id}/violation and frontend/js/interview-session.js).
    proctoring_violations = Column(Integer, nullable=False, default=0)

    questions = relationship(
        "InterviewQuestion",
        backref="interview",
        cascade="all, delete-orphan",
        order_by="InterviewQuestion.sequence_no",
    )
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    candidate = relationship("User", foreign_keys=[candidate_id])

    @property
    def candidate_name(self):
        """Lets InterviewOut expose the candidate's name for staff schedule
        views without every caller having to hand-join Users themselves."""
        return self.candidate.full_name if self.candidate else None


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True)
    interview_id = Column(Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    category = Column(String(20), nullable=False)
    difficulty = Column(String(10), nullable=False, default="medium")
    sequence_no = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())


class InterviewAnswer(Base):
    """One candidate answer (typed or voice-transcribed) per generated
    question. Powers real LLM scoring in ai_providers.score_interview_llm
    instead of the random simulator, whenever answers were captured."""

    __tablename__ = "interview_answers"

    id = Column(Integer, primary_key=True)
    interview_id = Column(Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("interview_questions.id", ondelete="CASCADE"), nullable=False)
    answer_text = Column(Text)
    input_mode = Column(String(10), nullable=False, default="typed")  # typed | voice
    time_taken_seconds = Column(Integer)
    created_at = Column(TIMESTAMP, server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    role = Column(String(20))
    title = Column(String(150), nullable=False)
    message = Column(String(500), nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
