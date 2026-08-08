from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.resume import ResumeStatus


class Experience(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    start_date: Optional[str] = Field(default=None, description="As written on the résumé.")
    end_date: Optional[str] = None
    is_current: bool = False
    highlights: List[str] = []


class Education(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    year: Optional[str] = None
    grade: Optional[str] = None


class ExtractedResume(BaseModel):
    """
    Does double duty: the response shape *and* the schema the model is
    constrained to. Each field maps to one of the six spec components.
    """

    summary: str = ""
    skills: List[str] = []
    technologies: List[str] = []
    total_experience_years: float = 0.0
    experience: List[Experience] = []
    education: List[Education] = []


class ResumeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    filename: str
    size_bytes: int
    status: ResumeStatus
    error: Optional[str] = None
    uploaded_at: datetime
    parsed_at: Optional[datetime] = None
    extracted: Optional[ExtractedResume] = None

    @classmethod
    def from_model(cls, resume) -> "ResumeOut":
        """
        Flatten the model's separate columns back into a nested `extracted`
        object. Only a PARSED résumé has one.
        """
        extracted = None
        if resume.status == ResumeStatus.PARSED:
            extracted = ExtractedResume(
                summary=resume.summary or "",
                skills=resume.skills or [],
                technologies=resume.technologies or [],
                total_experience_years=resume.total_experience_years or 0.0,
                experience=resume.experience or [],
                education=resume.education or [],
            )

        return cls(
            id=resume.id,
            user_id=resume.user_id,
            filename=resume.filename,
            size_bytes=resume.size_bytes,
            status=resume.status,
            error=resume.error,
            uploaded_at=resume.uploaded_at,
            parsed_at=resume.parsed_at,
            extracted=extracted,
        )
