from typing import Optional
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
