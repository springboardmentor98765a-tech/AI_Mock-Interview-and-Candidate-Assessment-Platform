from typing import Optional
from pydantic import BaseModel

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

    class Config:
        from_attributes = True
