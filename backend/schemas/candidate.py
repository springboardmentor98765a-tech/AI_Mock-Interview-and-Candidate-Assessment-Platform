from typing import Optional, List, Any
from pydantic import BaseModel

class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
    details: Optional[Any] = None

class CandidateProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    college: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    skills: Optional[str] = None
    preferred_role: Optional[str] = None
    experience_level: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    profile_picture: Optional[str] = None

class CandidateProfileResponse(BaseModel):
    id: int
    user_id: int
    name: str
    email: str
    phone: Optional[str] = None
    college: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    skills: Optional[str] = None
    preferred_role: Optional[str] = None
    experience_level: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    resume: Optional[str] = None
    ats_score: float
    interview_score: float
    profile_picture: Optional[str] = None
    role: str
    provider: str

    class Config:
        from_attributes = True

class CandidateRankingItem(BaseModel):
    rank: int
    user_id: int
    candidate_name: str
    email: str
    ats_score: float
    interview_score: float
    overall_score: float
    preferred_role: Optional[str] = None
    skills: Optional[str] = None
    college: Optional[str] = None
    degree: Optional[str] = None
    resume: Optional[str] = None

    class Config:
        from_attributes = True

class AnswerItem(BaseModel):
    question_id: int
    question_text: str
    selected_option: Optional[str] = None
    user_answer: Optional[str] = None

class InterviewSubmitRequest(BaseModel):
    category: str  # Technical, HR, Behavioral
    target_role: Optional[str] = "Software Engineer"
    time_taken_seconds: int = 0
    answers: List[AnswerItem] = []

class InterviewQuestionItem(BaseModel):
    id: int
    question: str
    options: Optional[List[str]] = None
    category: str
    difficulty: str = "MEDIUM"

class InterviewHistoryItem(BaseModel):
    id: int
    candidate_id: int
    candidate_name: Optional[str] = None
    category: str
    target_role: Optional[str] = None
    session_type: Optional[str] = None
    status: str
    score: float
    total_questions: int
    answered_questions: int
    time_taken_seconds: int
    answers_json: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True

