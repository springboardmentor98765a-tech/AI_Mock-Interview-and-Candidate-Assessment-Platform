"""
schemas.py
===========
Pydantic schemas used for request validation and response serialization.
Keeping these separate from the SQLAlchemy models enforces a clean
separation between the database layer and the API layer.
"""

import re
import uuid
from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, EmailStr, field_validator, model_validator, ConfigDict

Role = Literal["candidate", "recruiter", "admin"]


def validate_password_strength(password: str) -> str:
    """Shared password-strength rule used by the register schema."""
    if len(password) < 6:
        raise ValueError("Password must contain a minimum of 6 characters")
    if not re.search(r"[A-Za-z]", password):
        raise ValueError("Password must contain at least one letter")
    if not re.search(r"[0-9]", password):
        raise ValueError("Password must contain at least one number")
    return password


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    confirm_password: str
    role: Role

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Full name is required")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# ---------------------------------------------------------------------------
# Google role selection
# ---------------------------------------------------------------------------
class GoogleRoleUpdateRequest(BaseModel):
    role: Role

# ---------------------------------------------------------------------------
# User output (never includes password_hash)
# ---------------------------------------------------------------------------
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @field_validator("role", "auth_provider", mode="before")
    @classmethod
    def enum_to_value(cls, v):
        return v.value if hasattr(v, "value") else v

    id: uuid.UUID
    full_name: str
    email: EmailStr
    role: Optional[Role] = None
    auth_provider: str
    profile_picture: Optional[str] = None
    is_active: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Auth responses
# ---------------------------------------------------------------------------
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class MessageResponse(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# Module 3 - AI Interview Generation
# ---------------------------------------------------------------------------
InterviewType = Literal["hr", "technical", "behavioral", "aptitude"]
Difficulty = Literal["easy", "medium", "hard"]
InterviewStatus = Literal["created", "in_progress", "completed"]
SessionStatus = Literal["active", "paused", "completed"]
RecordingType = Literal["video", "audio"]

# Fixed choice sets - the frontend renders these as dropdowns rather than
# free-entry fields, and the backend enforces the same list so a request
# can't sneak in an out-of-range value (e.g. "100 questions").
ALLOWED_NUM_QUESTIONS = (3, 5, 10, 20)
ALLOWED_DURATION_MINUTES = (5, 10, 15, 20, 30, 45, 60)  # 0 / None = no time limit


class InterviewGenerateRequest(BaseModel):
    interview_type: InterviewType
    domain: Optional[str] = None  # e.g. "Python", "General HR"
    difficulty: Difficulty
    num_questions: int = 5
    use_resume_skills: bool = False
    duration_minutes: Optional[int] = None  # None/0 = no time limit

    @field_validator("domain")
    @classmethod
    def domain_not_blank_if_given(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Domain cannot be blank")
        return v.strip() if v else v

    @field_validator("num_questions")
    @classmethod
    def num_questions_in_range(cls, v: int) -> int:
        if v not in ALLOWED_NUM_QUESTIONS:
            raise ValueError(
                "num_questions must be one of: " + ", ".join(str(n) for n in ALLOWED_NUM_QUESTIONS)
            )
        return v

    @field_validator("duration_minutes")
    @classmethod
    def duration_in_allowed_set(cls, v: Optional[int]) -> Optional[int]:
        if v in (None, 0):
            return None
        if v not in ALLOWED_DURATION_MINUTES:
            raise ValueError(
                "duration_minutes must be 'no limit' or one of: "
                + ", ".join(str(n) for n in ALLOWED_DURATION_MINUTES)
            )
        return v

    @model_validator(mode="after")
    def domain_required_unless_using_resume(self):
        if not self.use_resume_skills and not self.domain:
            raise ValueError("Domain is required (or set use_resume_skills to true).")
        return self


class InterviewUpdateRequest(BaseModel):
    domain: Optional[str] = None
    difficulty: Optional[Difficulty] = None


class InterviewQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @field_validator("difficulty", mode="before")
    @classmethod
    def enum_to_value(cls, v):
        return v.value if hasattr(v, "value") else v

    id: uuid.UUID
    question_text: str
    category: str
    difficulty: Difficulty
    sequence_no: int
    answer_text: Optional[str] = None
    answered_at: Optional[datetime] = None

    technical_score: Optional[float] = None
    communication_score: Optional[float] = None
    confidence_score: Optional[float] = None
    grammar_score: Optional[float] = None
    overall_score: Optional[float] = None
    word_count: Optional[int] = None

    # Module 4 - Timer-Based Workflow: time spent per question
    question_shown_at: Optional[datetime] = None
    time_spent_seconds: Optional[int] = None

    # Module 5 - Speech-to-Text & Communication Analysis (null if typed)
    filler_word_count: Optional[int] = None
    speaking_pace_wpm: Optional[float] = None
    pronunciation_score: Optional[float] = None
    speech_duration_seconds: Optional[int] = None


class InterviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @field_validator("interview_type", "difficulty", "status", mode="before")
    @classmethod
    def enum_to_value(cls, v):
        return v.value if hasattr(v, "value") else v

    id: uuid.UUID
    interview_type: InterviewType
    domain: str
    difficulty: Difficulty
    status: InterviewStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    time_expired: bool = False
    overall_score: Optional[float] = None
    total_questions: int = 0
    answered_count: int = 0
    has_recording: bool = False


class InterviewDetailOut(InterviewOut):
    questions: list[InterviewQuestionOut] = []


class AnswerSubmitRequest(BaseModel):
    answer_text: str

    # ------------- Module 5 - Speech-to-Text & Communication Analysis -------------
    # Optional: real metrics captured client-side while the candidate spoke
    # this answer (browser Speech Recognition API). Left null when they
    # typed instead, in which case scoring is unaffected.
    filler_word_count: Optional[int] = None
    speaking_pace_wpm: Optional[float] = None
    pronunciation_score: Optional[float] = None
    speech_duration_seconds: Optional[int] = None

    @field_validator("answer_text")
    @classmethod
    def answer_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Answer text is required")
        return v.strip()


# ---------------------------------------------------------------------------
# Resume upload / analysis - Module 2 (Resume Parsing)
# ---------------------------------------------------------------------------
class ExperienceEntryOut(BaseModel):
    title: str
    company: str = ""
    duration: str = ""


class EducationEntryOut(BaseModel):
    degree: str
    institution: Optional[str] = None
    year: Optional[str] = None


class ResumeOut(BaseModel):
    resume_file_name: Optional[str] = None

    # Technology detection
    resume_skills: list[str] = []
    resume_skills_by_category: dict[str, list[str]] = {}

    # Experience parsing
    resume_experience_years: Optional[float] = None
    resume_experience: list[ExperienceEntryOut] = []

    # Education analysis
    resume_education: list[EducationEntryOut] = []

    # Resume summary generation
    resume_summary: Optional[str] = None

    # Real, computed-from-content completeness score (0-100) - see
    # app/resume_parser.py::compute_resume_score. Not a placeholder.
    resume_score: Optional[float] = None

    resume_uploaded_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Module 4 - Interview Session Management
# (webcam / mic / recording / pause-resume / authorized-access)
# ---------------------------------------------------------------------------
class SessionCreateRequest(BaseModel):
    interview_id: uuid.UUID


class DeviceStatusUpdateRequest(BaseModel):
    camera_enabled: bool = False
    microphone_enabled: bool = False


# ---------------------------------------------------------------------------
# Module 6 - Emotion Detection & Eye Tracking
# Face detection/expression analysis runs entirely client-side (face-api.js
# against the candidate's own webcam feed); the frontend periodically posts
# a batch summary here. No image/video data is ever included.
# ---------------------------------------------------------------------------
class EmotionSampleBatchRequest(BaseModel):
    samples_count: int
    face_detected_count: int = 0
    eye_contact_count: int = 0
    emotion_counts: dict[str, int] = {}
    avg_visual_confidence: Optional[float] = None  # this batch's average (0-100)
    avg_engagement: Optional[float] = None  # this batch's average (0-100)

    @field_validator("samples_count")
    @classmethod
    def samples_count_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("samples_count must be positive")
        return v

    @field_validator("face_detected_count", "eye_contact_count")
    @classmethod
    def counts_not_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("counts cannot be negative")
        return v


class InterviewRecordingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @field_validator("recording_type", mode="before")
    @classmethod
    def enum_to_value(cls, v):
        return v.value if hasattr(v, "value") else v

    id: uuid.UUID
    recording_type: RecordingType
    recording_url: str
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None
    duration_seconds: Optional[int] = None
    created_at: datetime


class RecordingUploadOut(BaseModel):
    message: str
    recording: InterviewRecordingOut


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @field_validator("status", mode="before")
    @classmethod
    def enum_to_value(cls, v):
        return v.value if hasattr(v, "value") else v

    id: uuid.UUID
    candidate_id: uuid.UUID
    interview_id: uuid.UUID

    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None

    status: SessionStatus

    camera_enabled: bool = False
    microphone_enabled: bool = False
    total_paused_seconds: int = 0
    fullscreen_violations: int = 0

    created_at: datetime
    questions_attempted: int = 0

    # Module 6 - Emotion Detection & Eye Tracking (real, computed from the
    # session's stored running totals - see InterviewSession properties).
    emotion_sample_count: int = 0
    eye_contact_percentage: Optional[float] = None
    attention_percentage: Optional[float] = None
    avg_visual_confidence: Optional[float] = None
    avg_engagement: Optional[float] = None
    dominant_emotion: Optional[str] = None
    emotion_breakdown: dict[str, float] = {}
    # Module 6 - Interview behavior analysis: rule-based summary sentence
    # derived from the stats above (see InterviewSession.behavior_summary).
    behavior_summary: Optional[str] = None

    recordings: list[InterviewRecordingOut] = []


class SessionDetailOut(SessionOut):
    interview: InterviewOut


class ViolationReportOut(BaseModel):
    session: SessionOut
    violation_count: int
    limit: int
    auto_submitted: bool


# ---------------------------------------------------------------------------
# Interview session status (explicit "where am I in this interview" state)
# ---------------------------------------------------------------------------
class InterviewSessionOut(BaseModel):
    interview: InterviewOut
    session: Optional[SessionOut] = None
    total_questions: int
    answered_count: int
    is_complete: bool
    is_paused: bool = False
    current_question: Optional[InterviewQuestionOut] = None
    # Timer feature: null when the interview has no time limit.
    deadline_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Dashboard - real performance analytics, computed from actual interview
# history. Every field here is derived from stored data; none of it is a
# fixed/placeholder number.
# ---------------------------------------------------------------------------
class AnalyticsOut(BaseModel):
    completed_interviews: int = 0
    total_questions_answered: int = 0

    average_score: Optional[float] = None
    communication_avg: Optional[float] = None
    technical_avg: Optional[float] = None
    confidence_avg: Optional[float] = None
    grammar_avg: Optional[float] = None

    last_score: Optional[float] = None
    average_duration_minutes: Optional[float] = None

    # Difference between the average score of the most recent interviews
    # and the earlier ones (positive = improving). 0 until there's enough
    # history to compare.
    skill_growth_percent: float = 0.0

    resume_score: Optional[float] = None
    # Composite of average_score and resume_score - only present once
    # there's at least one completed interview or an uploaded resume.
    interview_readiness: Optional[float] = None

    # Module 5 - Speech-to-Text & Communication Analysis (averaged across
    # answers that were actually spoken, not typed)
    avg_filler_word_count: Optional[float] = None
    avg_speaking_pace_wpm: Optional[float] = None
    avg_pronunciation_score: Optional[float] = None

    # Module 6 - Emotion Detection & Eye Tracking (averaged across
    # completed interviews' sessions that have webcam samples)
    avg_eye_contact_percentage: Optional[float] = None
    avg_attention_percentage: Optional[float] = None
    avg_visual_confidence: Optional[float] = None
    avg_engagement: Optional[float] = None


# ---------------------------------------------------------------------------
# Recruiter/admin candidate management - "top score" views.
# Both computed live (MAX over the candidate's history) rather than stored,
# so a new personal-best interview or a re-uploaded resume is reflected
# immediately on next load, with nothing to separately "delete and replace".
# ---------------------------------------------------------------------------
class CandidateLeaderboardEntryOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    profile_picture: Optional[str] = None

    resume_score: Optional[float] = None
    resume_uploaded_at: Optional[datetime] = None
    top_skills: list[str] = []

    best_interview_score: Optional[float] = None
    completed_interviews: int = 0
    best_interview_domain: Optional[str] = None


class ProfileRecordingOut(BaseModel):
    id: uuid.UUID
    recording_type: RecordingType
    recording_url: str
    mime_type: Optional[str] = None
    created_at: datetime

    interview_id: uuid.UUID
    interview_domain: str
    interview_type: str
    interview_score: Optional[float] = None


class CandidateProfileOut(BaseModel):
    user: UserOut
    resume: Optional[ResumeOut] = None
    analytics: AnalyticsOut
    interviews: list[InterviewOut] = []
    recordings: list[ProfileRecordingOut] = []
