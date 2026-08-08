from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.models.interview import (
    Difficulty,
    InterviewType,
    QuestionSource,
    SessionStatus,
)
from app.services.interview_generator import MAX_QUESTIONS, MIN_QUESTIONS


def _clean_domain(value: str) -> str:
    """
    Feature 6: any domain string is accepted, so the only job here is to stop
    junk reaching the database — trim it and require something meaningful.
    """
    cleaned = " ".join(value.split()).strip()
    if len(cleaned) < 2:
        raise ValueError("Domain must be at least 2 characters.")
    return cleaned


class GenerateRequest(BaseModel):
    interview_type: InterviewType
    domain: str = Field(
        min_length=2,
        max_length=120,
        description="Free text: developer, sales, HR, or anything else.",
        examples=["backend developer"],
    )
    difficulty: Difficulty = Difficulty.MEDIUM
    question_count: int = Field(default=8, ge=MIN_QUESTIONS, le=MAX_QUESTIONS)

    @field_validator("domain")
    @classmethod
    def _domain(cls, value: str) -> str:
        return _clean_domain(value)


class InterviewUpdate(BaseModel):
    """Every field optional — send only what changes."""

    domain: Optional[str] = Field(default=None, min_length=2, max_length=120)
    difficulty: Optional[Difficulty] = None
    interview_type: Optional[InterviewType] = None
    status: Optional[SessionStatus] = None

    @field_validator("domain")
    @classmethod
    def _domain(cls, value: Optional[str]) -> Optional[str]:
        return None if value is None else _clean_domain(value)


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_text: str
    category: str
    difficulty: Difficulty
    sequence_no: int
    answer_text: Optional[str] = None
    # The recording's path stays server-side; clients get a yes/no and fetch the
    # bytes from /interviews/{id}/answers/{sequence_no}/audio.
    answer_audio_mime: Optional[str] = None
    asked_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None
    skipped_at: Optional[datetime] = None

    @computed_field
    @property
    def has_answer_audio(self) -> bool:
        return bool(self.answer_audio_mime)

    @computed_field
    @property
    def attempted(self) -> bool:
        """False for a skipped question — it was not attempted."""
        return bool(self.answer_audio_mime or (self.answer_text or "").strip())


class InterviewOut(BaseModel):
    """Interview without its questions — used by the list endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    interview_type: InterviewType
    domain: str
    difficulty: Difficulty
    status: SessionStatus
    question_count: int
    source: QuestionSource
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class InterviewDetail(InterviewOut):
    """Interview with its questions — used by GET /interviews/{id}."""

    questions: List[QuestionOut] = []


class StartRequest(BaseModel):
    interview_id: int


class DomainsOut(BaseModel):
    """Suggestions only. The API accepts any domain string."""

    suggested: List[str]
    note: str = "The domain field is free text — any value is accepted."
