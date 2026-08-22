"""
models.py
==========
SQLAlchemy ORM models:
    User               - accounts / auth
    Interview          - a generated interview session
    InterviewQuestion  - one question (and, once answered, its transcript)
    belonging to an Interview
    InterviewSession   - Module 4: a live/proctored attempt at an Interview
    InterviewRecording - Module 4: a webcam/mic recording belonging to a
                          session (a session can have more than one, e.g.
                          separate video + audio files)
"""

import enum
import os
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
    # Module 4 - Interview Session Management: one live/proctored session
    # per interview attempt (webcam+mic state, pause/resume, recordings).
    session = relationship(
        "InterviewSession",
        back_populates="interview",
        uselist=False,
        cascade="all, delete-orphan",
    )

    @property
    def total_questions(self) -> int:
        return len(self.questions)

    @property
    def answered_count(self) -> int:
        return sum(1 for q in self.questions if q.answer_text)

    @property
    def has_recording(self) -> bool:
        return bool(self.session and self.session.recordings)


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

    # Module 4 - Timer-Based Workflow: "time spent per question". Set the
    # first time this question is actually served to the candidate as the
    # current question (see interview_routes._mark_question_shown), so the
    # duration reflects real time on-screen rather than server processing.
    question_shown_at = Column(DateTime, nullable=True)
    time_spent_seconds = Column(Integer, nullable=True)

    # Real per-answer analytics (0-100), computed in app/scoring.py the
    # moment the answer is submitted. NULL until answered.
    technical_score = Column(Float, nullable=True)
    communication_score = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    grammar_score = Column(Float, nullable=True)
    overall_score = Column(Float, nullable=True)
    word_count = Column(Integer, nullable=True)

    # ------------- Module 5 - Speech-to-Text & Communication Analysis -------------
    # Real metrics captured client-side (browser Speech Recognition API) while
    # the candidate spoke this answer. NULL whenever they typed instead of
    # speaking, so scoring never fabricates a value for a typed answer.
    filler_word_count = Column(Integer, nullable=True)
    speaking_pace_wpm = Column(Float, nullable=True)
    # Recognition-confidence-derived clarity/pronunciation estimate (0-100).
    pronunciation_score = Column(Float, nullable=True)
    speech_duration_seconds = Column(Integer, nullable=True)

    interview = relationship("Interview", back_populates="questions")


# ---------------------------------------------------------------------------
# Module 4 - Interview Session Management
# ---------------------------------------------------------------------------
class SessionStatusEnum(str, enum.Enum):
    active = "active"
    paused = "paused"
    completed = "completed"


class RecordingTypeEnum(str, enum.Enum):
    video = "video"
    audio = "audio"


class InterviewSession(Base):
    """
    A live, proctored attempt at an Interview: separate from Interview
    itself so that session-management concerns (pause/resume, webcam/mic
    state, recordings, precise timing) don't get tangled up with the
    interview's own question-answering/scoring status.
    """

    __tablename__ = "interview_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    candidate_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    interview_id = Column(UUID(as_uuid=True), ForeignKey("interviews.id"), nullable=False, unique=True)

    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    # Total elapsed time counting only while the session was actively
    # running (i.e. excludes any paused time). Set once the session ends.
    duration_seconds = Column(Integer, nullable=True)

    status = Column(
        Enum(SessionStatusEnum, name="session_status"),
        nullable=False,
        default=SessionStatusEnum.active,
    )

    # Webcam & Microphone: whether the candidate's browser actually
    # granted access for this session.
    camera_enabled = Column(Boolean, nullable=False, default=False)
    microphone_enabled = Column(Boolean, nullable=False, default=False)

    # Pause bookkeeping - when currently paused, paused_at is set; on
    # resume the elapsed pause time is folded into total_paused_seconds
    # and paused_at is cleared.
    paused_at = Column(DateTime, nullable=True)
    total_paused_seconds = Column(Integer, nullable=False, default=0)

    # Full-screen proctoring: how many times the candidate has exited
    # full-screen mode during this session. Enforced server-side so it
    # can't be bypassed by tampering with the client - see
    # session_routes.report_violation / MAX_FULLSCREEN_VIOLATIONS.
    fullscreen_violations = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # ------------- Module 6 - Emotion Detection & Eye Tracking -------------
    # Running aggregates built from periodic client-side webcam analysis
    # batches (face-api.js running entirely in the candidate's browser -
    # see POST /sessions/{id}/emotion-samples). Stored as running totals
    # rather than raw per-frame samples so this never grows unbounded and
    # no video/image data is ever uploaded, only summary numbers.
    emotion_sample_count = Column(Integer, nullable=False, default=0)
    face_detected_count = Column(Integer, nullable=False, default=0)
    eye_contact_count = Column(Integer, nullable=False, default=0)
    emotion_counts = Column(JSON, nullable=True)  # {"neutral": 12, "happy": 4, ...}
    visual_confidence_sum = Column(Float, nullable=False, default=0.0)
    engagement_sum = Column(Float, nullable=False, default=0.0)

    candidate = relationship("User")
    interview = relationship("Interview", back_populates="session")
    recordings = relationship(
        "InterviewRecording",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="InterviewRecording.created_at",
    )

    @property
    def questions_attempted(self) -> int:
        return self.interview.answered_count if self.interview else 0

    # ---- Module 6 derived analytics (all real, computed from stored counts) ----
    @property
    def eye_contact_percentage(self):
        if not self.emotion_sample_count:
            return None
        return round((self.eye_contact_count / self.emotion_sample_count) * 100, 1)

    @property
    def attention_percentage(self):
        if not self.emotion_sample_count:
            return None
        return round((self.face_detected_count / self.emotion_sample_count) * 100, 1)

    @property
    def avg_visual_confidence(self):
        # Averaged over face-detected samples only - there's no
        # expression to read on a frame where no face was found.
        if not self.face_detected_count:
            return None
        return round(self.visual_confidence_sum / self.face_detected_count, 1)

    @property
    def avg_engagement(self):
        if not self.face_detected_count:
            return None
        return round(self.engagement_sum / self.face_detected_count, 1)

    @property
    def dominant_emotion(self):
        if not self.emotion_counts:
            return None
        return max(self.emotion_counts, key=self.emotion_counts.get)

    @property
    def emotion_breakdown(self):
        if not self.emotion_counts or not self.emotion_sample_count:
            return {}
        return {
            k: round(v / self.emotion_sample_count * 100, 1)
            for k, v in self.emotion_counts.items()
        }

    @property
    def behavior_summary(self):
        """
        Module 6 - Interview behavior analysis: a short, rule-based
        sentence synthesised from this session's real, accumulated
        attention/eye-contact/engagement/emotion stats. Not a fabricated
        judgement - every clause is gated on an actual measured number.
        """
        if not self.emotion_sample_count:
            return None

        parts = []

        attention = self.attention_percentage
        if attention is not None:
            if attention >= 80:
                parts.append("stayed consistently in frame")
            elif attention >= 50:
                parts.append("was in frame for most of the session")
            else:
                parts.append("was out of frame for a significant part of the session")

        eye_contact = self.eye_contact_percentage
        if eye_contact is not None:
            if eye_contact >= 70:
                parts.append("maintained strong eye contact with the camera")
            elif eye_contact >= 40:
                parts.append("made moderate eye contact with the camera")
            else:
                parts.append("looked away from the camera frequently")

        engagement = self.avg_engagement
        if engagement is not None:
            if engagement >= 75:
                parts.append("showed high overall engagement")
            elif engagement >= 50:
                parts.append("showed moderate engagement")
            else:
                parts.append("showed low engagement")

        dominant = self.dominant_emotion
        if dominant:
            parts.append("with a predominantly " + dominant + " expression")

        if not parts:
            return None
        return "The candidate " + ", ".join(parts) + "."


class InterviewRecording(Base):
    """
    A single webcam/mic recording file belonging to an InterviewSession.
    Modeled as its own table (rather than columns on Interview) so a
    session can hold more than one recording - e.g. a video recording
    and, if the camera was denied but the mic was granted, an
    audio-only fallback recording.
    """

    __tablename__ = "interview_recordings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id"), nullable=False)

    recording_type = Column(
        Enum(RecordingTypeEnum, name="recording_type"),
        nullable=False,
        default=RecordingTypeEnum.video,
    )
    # Relative path under settings.MEDIA_ROOT, e.g. "recordings/<uuid>.webm"
    file_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=True)
    size_bytes = Column(Integer, nullable=True)
    duration_seconds = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("InterviewSession", back_populates="recordings")

    @property
    def recording_url(self) -> str:
        from app.storage import storage
        return storage.url_for(self.file_path)
