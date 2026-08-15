"""
SQLAlchemy models mapped onto the EXISTING tables created by
backend/db/schema.sql (the Node service owns migrations — this file
only describes/reads the same tables, it never creates or alters
them, so both backends stay in sync automatically).
"""
from sqlalchemy import (
    BigInteger,
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
    # Module 4: live session lifecycle. started_at is set once (on
    # PATCH /{id}/begin) and never overwritten; paused_at/paused_seconds
    # track pause/resume so the UI can report true active session time.
    started_at = Column(TIMESTAMP)
    paused_at = Column(TIMESTAMP)
    paused_seconds = Column(Integer, nullable=False, default=0)
    domain = Column(String(100))
    difficulty = Column(String(10), nullable=False, default="medium")
    question_count = Column(Integer, nullable=False, default=0)
    # Proctoring: count of tab-switch / fullscreen-exit / no-face /
    # multi-face warnings raised during a live session (see
    # POST /{id}/violation and frontend/js/interview-session.js).
    proctoring_violations = Column(Integer, nullable=False, default=0)
    # Module 4/5: explicit session identifier (distinct from the
    # numeric `id`), the frozen total active-session duration in
    # seconds (set once at /finish), and how many questions the
    # candidate has actually answered so far (vs. question_count,
    # the target/total for the session).
    session_id = Column(String(36), unique=True)
    duration_seconds = Column(Integer)
    questions_attempted = Column(Integer, nullable=False, default=0)

    questions = relationship(
        "InterviewQuestion",
        backref="interview",
        cascade="all, delete-orphan",
        order_by="InterviewQuestion.sequence_no",
    )
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    candidate = relationship("User", foreign_keys=[candidate_id])
    # Module 5 (Recording): one recording per session, pointing at the
    # file on disk (see app/recording_store.py). uselist=False makes
    # this a one-to-one relationship, matching the UNIQUE constraint
    # on interview_recordings.interview_id.
    recording = relationship("InterviewRecording", backref="interview", uselist=False, cascade="all, delete-orphan")

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


class InterviewRecording(Base):
    """Metadata for the proctored session's video+audio recording.
    The file itself lives on disk (app/recording_store.py); this row
    is what the API checks to decide whether a recording exists and
    who is allowed to stream it."""

    __tablename__ = "interview_recordings"

    id = Column(Integer, primary_key=True)
    interview_id = Column(Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, unique=True)
    file_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=False, default="video/webm")
    size_bytes = Column(BigInteger, nullable=False, default=0)
    duration_seconds = Column(Integer)
    started_at = Column(TIMESTAMP)
    ended_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())
    # Audio-only reference, extracted from the uploaded video at save
    # time (see recording_store.extract_audio_track). None if ffmpeg
    # isn't available on the host — the combined video is still the
    # source of truth either way.
    audio_file_path = Column(String(500))
    audio_mime_type = Column(String(100))


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    role = Column(String(20))
    title = Column(String(150), nullable=False)
    message = Column(String(500), nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
