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
    # Deterministic MCQ/coding marks sheet totals (see schema.sql) —
    # a straight sum of points earned, separate from the holistic
    # 0-100 `score` above.
    marks_awarded = Column(Numeric(6, 2))
    marks_total = Column(Numeric(6, 2))

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
    # Milestone 3+ — Keyword Answer Analysis. 3-6 short concepts a
    # strong answer should mention, comma-separated. Only populated
    # when the LLM provider generated the question (see
    # ai_providers.generate_questions_llm); NULL for questions pulled
    # from the static fallback bank, since we can't honestly claim to
    # know what "should" be in the answer to a canned question without
    # the model that wrote it.
    expected_keywords = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    # MCQ / Coding round. question_type: 'open' (default, AI-scored) |
    # 'mcq' | 'coding'. options/correct_option back MCQ (JSON array of
    # strings + the correct letter — correct_option is never sent to
    # the client). marks is what this question is worth. test_cases /
    # starter_code back the coding round (JSON).
    question_type = Column(String(10), nullable=False, default="open")
    options = Column(Text)
    correct_option = Column(String(5))
    marks = Column(Numeric(6, 2), nullable=False, default=1)
    test_cases = Column(Text)
    starter_code = Column(Text)


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
    # Milestone 3 — Speech Analysis & AI Monitoring. filler_word_count /
    # words_per_minute computed server-side in speech_analysis.py from
    # answer_text + time_taken_seconds. dominant_emotion / eye_contact_percentage
    # computed client-side (face-api.js) per question and sent up with the
    # answer — best-effort, stay NULL if no face was detected/model didn't load.
    filler_word_count = Column(Integer)
    words_per_minute = Column(Integer)
    dominant_emotion = Column(String(20))
    eye_contact_percentage = Column(Integer)
    # grammar_issue_count computed server-side (speech_analysis.check_grammar,
    # rule-based). pronunciation_confidence is the average Web Speech API
    # recognition confidence for this answer's voice input, sent by the
    # client — a rough clarity proxy, NULL for typed answers.
    grammar_issue_count = Column(Integer)
    pronunciation_confidence = Column(Integer)
    # % of this question's expected_keywords found in the answer text
    # (case-insensitive word match). NULL when the question has no
    # expected_keywords (e.g. from the static fallback bank).
    keyword_match_percentage = Column(Integer)
    created_at = Column(TIMESTAMP, server_default=func.now())
    # MCQ / Coding round grading — see schema.sql for the full story.
    selected_option = Column(String(5))
    code_answer = Column(Text)
    code_language = Column(String(10))
    is_correct = Column(Boolean)
    marks_awarded = Column(Numeric(6, 2))
    test_case_results = Column(Text)


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
