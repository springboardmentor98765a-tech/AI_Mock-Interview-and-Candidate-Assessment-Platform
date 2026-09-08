"""
SQLAlchemy models mapped onto the EXISTING tables created by
backend/db/schema.sql (the Node service owns migrations — this file
only describes/reads the same tables, it never creates or alters
them, so both backends stay in sync automatically).
"""
from sqlalchemy import (
    Boolean,
    Column,
    Float,
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
    # Filename (not a full path) of this session's recorded webcam+mic
    # video under config.RECORDINGS_DIR, e.g. "42.webm" — set once
    # POST /{id}/recording finishes uploading. NULL until then.
    recording_path = Column(String(255))

    # Module 7 — AI Feedback & Scoring. skill_professionalism is the 4th
    # weighted category (Communication 30 / Confidence 25 / Technical
    # Relevance [=skill_technical] 30 / Professionalism 15). feedback_json
    # holds the structured breakdown; ai_feedback stays the short
    # free-text summary. behavior_* is the Module 6 webcam-analytics
    # snapshot sent by the frontend at finish time (null when no webcam
    # session was involved).
    skill_professionalism = Column(Integer)
    rating_label = Column(String(20))
    feedback_json = Column(Text)
    behavior_eye_contact_pct = Column(Integer)
    behavior_engagement_pct = Column(Integer)
    behavior_attention_level = Column(String(10))
    behavior_confidence_label = Column(String(10))
    behavior_dominant_emotion = Column(String(30))

    @property
    def has_recording(self) -> bool:
        return bool(self.recording_path)

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

    # Module 5 — Speech-to-Text & Communication Analysis (see
    # app/communication_analysis.py for how each is computed and its
    # honest scope/limits).
    filler_word_count = Column(Integer, nullable=False, default=0)
    filler_words_found = Column(Text)  # JSON list
    grammar_issue_count = Column(Integer, nullable=False, default=0)
    grammar_feedback = Column(Text)
    speech_wpm = Column(Integer)
    voice_confidence = Column(Float)       # 0-1, avg Web Speech API confidence (voice answers only)
    pronunciation_score = Column(Integer)  # 0-100, derived from voice_confidence
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


class CodingSubmission(Base):
    """One graded attempt at a standalone Coding Practice problem —
    separate from the scored live-interview flow above. Scoring is
    purely algorithmic (judge.py runs the code against test cases and
    compares stdout), never AI-judged."""

    __tablename__ = "coding_submissions"

    id = Column(Integer, primary_key=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(String(100), nullable=False)
    title = Column(String(150), nullable=False)
    role = Column(String(100), nullable=False)
    language = Column(String(20), nullable=False)
    code = Column(Text, nullable=False)
    passed_count = Column(Integer, nullable=False, default=0)
    total_count = Column(Integer, nullable=False, default=0)
    score_percent = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())

    candidate = relationship("User", foreign_keys=[candidate_id])


class GeneratedCodingQuestion(Base):
    """One AI-generated (or offline-fallback) Coding Practice problem.
    Persisted so a later submission can be graded against the exact
    test cases it was generated with — the frontend only ever sees
    title/prompt/starter_code, never test_cases_json."""

    __tablename__ = "generated_coding_questions"

    id = Column(String(64), primary_key=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(100), nullable=False)
    language = Column(String(20), nullable=False)
    difficulty = Column(String(10), nullable=False)
    title = Column(String(200), nullable=False)
    prompt = Column(Text, nullable=False)
    starter_code = Column(Text, nullable=False)
    test_cases_json = Column(Text, nullable=False)
    source = Column(String(10), nullable=False, default="ai")
    created_at = Column(TIMESTAMP, server_default=func.now())

    candidate = relationship("User", foreign_keys=[candidate_id])


class InterviewTemplate(Base):
    """Module 1 — recruiter/coach 'Create interview templates'. A named
    preset for the fields on POST /interviews/generate; picking one in
    the UI just pre-fills that form, nothing more."""

    __tablename__ = "interview_templates"

    id = Column(Integer, primary_key=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    name = Column(String(150), nullable=False)
    interview_type = Column(String(50), nullable=False)
    category = Column(String(50))
    domain = Column(String(100))
    difficulty = Column(String(10), nullable=False, default="medium")
    question_count = Column(Integer, nullable=False, default=5)
    mode = Column(String(20), nullable=False, default="online")
    created_at = Column(TIMESTAMP, server_default=func.now())

    creator = relationship("User", foreign_keys=[created_by])
