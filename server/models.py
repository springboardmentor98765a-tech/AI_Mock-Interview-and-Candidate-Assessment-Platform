from pydantic import BaseModel, EmailStr, Field
from typing import Literal, Optional
from datetime import datetime


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: Optional[str] = "candidate"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    credential: str


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    provider: str
    google_id: Optional[str] = None
    avatar: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AuthResponse(BaseModel):
    message: str
    token: str
    user: UserResponse


class UpdateUserAdminRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)


class InterviewCreateRequest(BaseModel):
    interview_type: str = Field(..., min_length=1)
    candidate_id: Optional[int] = None
    domain: Optional[str] = None
    difficulty: Optional[str] = None
    duration: int = Field(default=15, ge=1, le=180)


class InterviewGenerateRequest(BaseModel):
    interview_type: Literal["hr", "technical", "behavioral", "aptitude"]
    candidate_id: Optional[int] = None
    domain: Optional[str] = Field(default=None, max_length=100)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    duration: int = Field(default=15, ge=1, le=180)
    num_questions: Optional[int] = Field(default=None, ge=1, le=20)
    time_duration: Optional[int] = Field(default=None, ge=1, le=120)
    skills: list[str] = Field(default_factory=list, max_length=30)
    resume_context: Optional[dict] = None


class InterviewStartRequest(BaseModel):
    interview_id: int = Field(..., gt=0)


class InterviewUpdateRequest(BaseModel):
    candidate_id: Optional[int] = None
    interview_type: Optional[str] = None
    domain: Optional[str] = None
    difficulty: Optional[str] = None
    duration: Optional[int] = None
    status: Optional[str] = None
    elapsed_seconds: Optional[int] = None
    current_question_index: Optional[int] = None


class AnswerSubmitRequest(BaseModel):
    question_id: int
    answer_text: str = Field(..., min_length=1)


class InterviewQuestionRequest(BaseModel):
    question_id: int = Field(..., gt=0)


class VoiceAnswerRequest(InterviewQuestionRequest):
    audio_data: str = Field(..., min_length=32, max_length=12_000_000)


class TranscribeChunkRequest(BaseModel):
    audio_chunk: str = Field(..., min_length=1)
    mime_type: str = Field(default="audio/webm")


class InterviewQuestionCreateRequest(BaseModel):
    question_text: str = Field(..., min_length=1)
    category: Optional[str] = None
    difficulty: Optional[str] = None
    sequence_no: int = Field(..., ge=1)


class InterviewResponse(BaseModel):
    id: int
    user_id: int
    candidate_id: int
    interview_type: str
    domain: Optional[str] = None
    difficulty: Optional[str] = None
    duration: int
    status: Optional[str] = None
    elapsed_seconds: Optional[int] = 0
    current_question_index: Optional[int] = 0
    total_score: Optional[float] = None
    communication_score: Optional[float] = None
    confidence_score: Optional[float] = None
    technical_score: Optional[float] = None
    professionalism_score: Optional[float] = None
    overall_score: Optional[float] = None
    performance_rating: Optional[str] = None
    strengths: Optional[list[str]] = None
    weaknesses: Optional[list[str]] = None
    improvements: Optional[list[str]] = None
    recommendations: Optional[list[str]] = None
    resources: Optional[list[dict]] = None
    detailed_parameters: Optional[dict] = None
    started_at: Optional[str] = None

    completed_at: Optional[str] = None
    created_at: Optional[str] = None




class InterviewQuestionResponse(BaseModel):
    id: int
    interview_id: int
    question_text: str
    category: Optional[str] = None
    difficulty: Optional[str] = None
    sequence_no: int
    answer_text: Optional[str] = None
    score: Optional[float] = None
    communication_score: Optional[float] = None
    confidence_score: Optional[float] = None
    technical_score: Optional[float] = None
    professionalism_score: Optional[float] = None
    parameters: Optional[dict] = None
    feedback: Optional[str] = None


class AssessmentGenerateRequest(BaseModel):
    target_role: str = Field(default="Software Engineer")
    topics: list[str] = Field(default_factory=list)
    difficulty: str = Field(default="medium")
    num_questions: int = Field(default=10, ge=1, le=50)
    time_limit_minutes: int = Field(default=10, ge=1, le=180)
    resume_context: Optional[dict] = None


class AssessmentSubmitRequest(BaseModel):
    answers: dict[str, str] = Field(default_factory=dict)
    integrity_metrics: Optional[dict] = None
    elapsed_seconds: Optional[int] = None


class InterviewRecordingCreateRequest(BaseModel):
    recording_type: str = Field(default="video")
    file_path: str = Field(..., min_length=1)
    duration: Optional[int] = None
    mime_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    status: Optional[str] = "completed"


class InterviewRecordingResponse(BaseModel):
    id: int
    session_id: int
    recording_type: str
    file_path: str
    duration: Optional[int] = None
    mime_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    status: Optional[str] = None
    created_at: Optional[str] = None


