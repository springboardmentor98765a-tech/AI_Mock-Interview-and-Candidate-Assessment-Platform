# ============================================================
#  schemas.py — Pydantic request / response models
# ============================================================
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


class UserRole(str, Enum):
    candidate = "candidate"
    recruiter  = "recruiter"
    admin      = "admin"


class AuthProvider(str, Enum):
    local  = "local"
    google = "google"
    github = "github"


# ── Request schemas ──────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.candidate

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        import re
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain an uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain a lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain a number")
        if not re.search(r"[@$!%*?&]", v):
            raise ValueError("Password must contain a special character (@$!%*?&)")
        return v

    @field_validator("role")
    @classmethod
    def no_admin_self_register(cls, v: UserRole) -> UserRole:
        # Prevent self-registration as admin
        if v == UserRole.admin:
            return UserRole.candidate
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UpdateUserRequest(BaseModel):
    name:     Optional[str]      = None
    email:    Optional[EmailStr] = None
    password: Optional[str]      = None
    role:     Optional[UserRole] = None  # Only admin can change


# ── Response schemas ─────────────────────────────────────────

class UserResponse(BaseModel):
    id:            UUID
    name:          str
    email:         str
    role:          UserRole
    auth_provider: AuthProvider
    avatar_url:    Optional[str] = None
    is_active:     bool
    last_login_at: Optional[datetime] = None
    created_at:    datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    success: bool
    message: str
    user:    UserResponse


class MessageResponse(BaseModel):
    success: bool
    message: str


# ── Interview Module Schemas ─────────────────────────────────

class InterviewType(str, Enum):
    hr = "HR Interview"
    technical = "Technical Interview"
    behavioral = "Behavioral Interview"
    aptitude = "Aptitude Interview"


class DifficultyLevel(str, Enum):
    easy = "Easy"
    medium = "Medium"
    hard = "Hard"
    expert = "Expert"


class GenerateQuestionsRequest(BaseModel):
    job_role: str
    domain: str = "Software Development"
    interview_type: str = "Technical Interview"
    difficulty: str = "Medium"
    experience_level: Optional[str] = "Mid Level"
    num_questions: int = 5
    user_skills: Optional[str] = None
    job_description: Optional[str] = None
    resume_text: Optional[str] = None
    generation_seed: Optional[str] = None



class CreateSessionRequest(BaseModel):
    job_role: str
    domain: str = "Software Development"
    interview_type: str = "Technical Interview"
    difficulty: str = "Medium"
    experience_level: Optional[str] = "Mid Level"
    num_questions: int = 5
    user_skills: Optional[str] = None
    job_description: Optional[str] = None
    resume_text: Optional[str] = None
    candidate_id: Optional[UUID] = None
    questions: Optional[list[dict]] = None


class CandidateUserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    avatar_url: Optional[str] = None


class SubmitAnswerRequest(BaseModel):
    question_id: UUID
    user_answer: str
    started_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None


class UpdateSessionRequest(BaseModel):
    status: Optional[str] = None
    score: Optional[float] = None
    current_question_index: Optional[int] = None


class PauseSessionRequest(BaseModel):
    current_question_index: Optional[int] = 0


class RecordingResponse(BaseModel):
    id: UUID
    session_id: UUID
    candidate_id: Optional[UUID] = None
    interview_id: Optional[UUID] = None
    recording_type: str = "video_audio"
    mime_type: str = "video/webm"
    file_size: int = 0
    duration: Optional[int] = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class SubmitTimingRequest(BaseModel):
    question_id: Optional[UUID] = None
    question_number: int
    started_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None
    time_spent: int = 0


class QuestionTimingResponse(BaseModel):
    id: UUID
    session_id: UUID
    question_id: Optional[UUID] = None
    question_number: int
    started_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None
    time_spent: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class QuestionResponse(BaseModel):
    id: Optional[UUID] = None
    session_id: Optional[UUID] = None
    question_number: int
    question_text: str
    interview_type: str
    domain: str
    difficulty: str
    expected_answer_points: list[str] = []
    category: Optional[str] = None
    user_answer: Optional[str] = None
    sample_answer: Optional[str] = None
    feedback: Optional[str] = None
    score: Optional[float] = None
    time_spent: Optional[int] = 0

    model_config = {"from_attributes": True}


class SessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    created_by: Optional[UUID] = None
    candidate_id: Optional[UUID] = None
    job_role: str
    domain: str
    interview_type: str
    difficulty: str
    experience_level: Optional[str] = None
    num_questions: int
    user_skills: Optional[str] = None
    job_description: Optional[str] = None
    resume_text: Optional[str] = None
    status: str
    score: Optional[float] = None
    total_questions: int
    completed_questions: int
    current_question_index: Optional[int] = 0
    started_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    resumed_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration: Optional[int] = 0
    created_at: datetime
    updated_at: datetime
    has_recording: Optional[bool] = False
    recording_id: Optional[UUID] = None
    questions: Optional[list[QuestionResponse]] = None
    timings: Optional[list[QuestionTimingResponse]] = None
    result: Optional["InterviewResultResponse"] = None
    question_results: Optional[list["QuestionResultResponse"]] = None

    model_config = {"from_attributes": True}


class InterviewResultResponse(BaseModel):
    id: UUID
    session_id: UUID
    candidate_id: Optional[UUID] = None
    interview_id: Optional[UUID] = None
    total_questions: int
    questions_completed: int
    completion_percentage: float
    total_duration: int
    average_question_time: float
    technical_score: Optional[float] = None
    communication_score: Optional[float] = None
    behavioral_score: Optional[float] = None
    aptitude_score: Optional[float] = None
    problem_solving_score: Optional[float] = None
    culture_fit_score: Optional[float] = None
    motivation_score: Optional[float] = None
    leadership_score: Optional[float] = None
    adaptability_score: Optional[float] = None
    logical_reasoning_score: Optional[float] = None
    quantitative_score: Optional[float] = None
    overall_score: float
    recommendation: Optional[str] = None
    completed_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuestionResultResponse(BaseModel):
    id: UUID
    session_id: UUID
    result_id: Optional[UUID] = None
    question_id: Optional[UUID] = None
    question_number: int
    question_text: str
    answer_status: str
    time_spent: int
    answer_type: Optional[str] = None
    user_answer: Optional[str] = None
    score: Optional[float] = None
    evaluation: Optional[str] = None

    model_config = {"from_attributes": True}


class RecruiterAnalyticsResponse(BaseModel):
    total_interviews: int
    completed_interviews: int
    in_progress_interviews: int
    pending_interviews: int
    average_score: float
    average_duration: int


class RecruiterCandidateInterviewResponse(BaseModel):
    id: UUID
    session_id: UUID
    candidate_id: Optional[UUID] = None
    candidate_name: str
    candidate_email: str
    job_role: str
    domain: str
    interview_type: str
    difficulty: str
    experience_level: Optional[str] = None
    status: str
    total_questions: int
    completed_questions: int
    completion_percentage: float
    duration: int
    overall_score: Optional[float] = None
    recommendation: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AudioAnswerResponse(BaseModel):
    id: UUID
    session_id: UUID
    candidate_id: Optional[UUID] = None
    question_id: UUID
    question_number: int
    storage_location: str
    mime_type: str
    file_size: int
    duration: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}






