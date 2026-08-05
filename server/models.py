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
    domain: Optional[str] = None
    difficulty: Optional[str] = None


class InterviewGenerateRequest(BaseModel):
    interview_type: Literal["hr", "technical", "behavioral", "aptitude"]
    domain: Optional[str] = Field(default=None, max_length=100)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    num_questions: Optional[int] = Field(default=5, ge=1, le=20)
    # The resume parser can pass its extracted skills here.  Keeping this
    # optional also allows candidates to generate a general interview.
    skills: list[str] = Field(default_factory=list, max_length=30)


class InterviewStartRequest(BaseModel):
    interview_id: int = Field(..., gt=0)


class InterviewUpdateRequest(BaseModel):
    interview_type: Optional[str] = None
    domain: Optional[str] = None
    difficulty: Optional[str] = None
    status: Optional[str] = None


class AnswerSubmitRequest(BaseModel):
    question_id: int
    answer_text: str = Field(..., min_length=1)


class InterviewQuestionRequest(BaseModel):
    question_id: int = Field(..., gt=0)


class VoiceAnswerRequest(InterviewQuestionRequest):
    # Browser-recorded mono WAV encoded as a data URL.  Limit protects the API
    # and keeps a single answer within a reasonable upload size.
    audio_data: str = Field(..., min_length=32, max_length=12_000_000)


class InterviewQuestionCreateRequest(BaseModel):
    question_text: str = Field(..., min_length=1)
    category: Optional[str] = None
    difficulty: Optional[str] = None
    sequence_no: int = Field(..., ge=1)


class InterviewResponse(BaseModel):
    id: int
    user_id: int
    interview_type: str
    domain: Optional[str] = None
    difficulty: Optional[str] = None
    status: Optional[str] = None
    total_score: Optional[float] = None
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
    feedback: Optional[str] = None
