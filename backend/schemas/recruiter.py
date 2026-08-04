from typing import Optional, List, Any
from pydantic import BaseModel

class RecruiterProfileUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    company_email: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None

class RecruiterProfileResponse(BaseModel):
    id: int
    user_id: int
    name: str
    email: str
    company_name: Optional[str] = None
    company_email: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    verification_status: str
    role: str
    provider: str

    class Config:
        from_attributes = True

class InterviewTemplateCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "Technical"
    difficulty: str = "MEDIUM"
    duration_mins: int = 30
    questions: List[str]

class InterviewTemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    duration_mins: Optional[int] = None
    questions: Optional[List[str]] = None

class InterviewTemplateResponse(BaseModel):
    id: int
    recruiter_id: int
    title: str
    description: Optional[str] = None
    category: str
    difficulty: str
    duration_mins: int
    questions: List[str]
    created_at: str

    class Config:
        from_attributes = True

class CandidateCompareRequest(BaseModel):
    candidate_ids: List[int]

class MonitoringSessionResponse(BaseModel):
    session_id: int
    candidate_id: int
    candidate_name: str
    target_role: str
    category: str
    status: str  # ACTIVE, SCHEDULED, COMPLETED
    progress_percentage: int
    time_remaining_mins: int
    started_at: str

