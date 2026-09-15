from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class JobCreateRequest(BaseModel):
    title: str
    company: str
    description: str
    required_skills: str = ""
    location: str = ""

class ApplicationCreateRequest(BaseModel):
    job_id: int

class InterviewGenerateRequest(BaseModel):
    interview_type: str
    domain: str
    difficulty: str
    number_of_questions: int = 5