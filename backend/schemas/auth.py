from typing import Optional
from pydantic import BaseModel, EmailStr

class CandidateRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    college: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = 2026
    skills: Optional[str] = None
    preferred_role: Optional[str] = "Software Engineer"
    experience_level: Optional[str] = "Entry-Level"
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None

class RecruiterRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    company_name: str
    company_email: Optional[str] = None
    designation: Optional[str] = "Recruiter"
    phone: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = "Technology"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    token: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    picture: Optional[str] = None

class GoogleRoleCompleteRequest(BaseModel):
    email: EmailStr
    name: str
    picture: Optional[str] = None
    role: str  # CANDIDATE or RECRUITER

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str
    email: str
    role: str
    provider: str
    role_required: Optional[bool] = False
