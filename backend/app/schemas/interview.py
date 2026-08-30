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
    # Measured speaking time, not asked-to-answered wall clock. See the column
    # comment on the model for why the distinction matters to pace.
    answer_duration_seconds: Optional[float] = None
    # Time on the question: asked → answered or skipped. Larger than
    # answer_duration_seconds, which is only how long the candidate spoke —
    # this one includes reading and thinking. Null while still open.
    time_on_question_seconds: Optional[float] = None
    # Module 5 output. Null means this answer was never analysed — which is a
    # different thing from "analysed and nothing to report", so the client must
    # not render an absent analysis as a clean one.
    analysis: Optional[dict] = None
    analyzed_at: Optional[datetime] = None
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
    # Opaque public identifier for the session. Same run as `id`, but safe to
    # put in a URL or a log without leaking how many interviews exist.
    session_id: str
    user_id: int
    interview_type: InterviewType
    domain: str
    difficulty: Difficulty
    status: SessionStatus
    question_count: int
    source: QuestionSource
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    # Module 4: seconds allowed per question, fixed when the session started.
    # Null on interviews that have not been started, and on ones created before
    # timing existed — the client shows no countdown rather than inventing one.
    question_seconds: Optional[int] = None
    # Set only while the interview is PAUSED — the open half of the current
    # pause, not a history of them.
    paused_at: Optional[datetime] = None
    # Time spent paused, so a client can show elapsed interview time rather
    # than wall-clock time since the session began.
    total_paused_seconds: int = 0
    # Stamped when the interview ends; null while it is still running.
    duration_seconds: Optional[int] = None
    # Module 5: the rubric score, 0-100 — average of the answered questions'
    # scores. Null while running, and null forever if no answer was ever
    # scored (analysis disabled, provider down, or every question skipped) —
    # a different fact from "scored zero", so it is never displayed as one.
    overall_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def is_paused(self) -> bool:
        return self.status == SessionStatus.PAUSED

    @computed_field
    @property
    def score_rating(self) -> Optional[str]:
        if self.overall_score is None:
            return None
        from app.services.scoring import rating_label

        return rating_label(self.overall_score)


class InterviewDetail(InterviewOut):
    """Interview with its questions — used by GET /interviews/{id}."""

    questions: List[QuestionOut] = []


class StartRequest(BaseModel):
    interview_id: int


class DomainsOut(BaseModel):
    """Suggestions only. The API accepts any domain string."""

    suggested: List[str]
    note: str = "The domain field is free text — any value is accepted."
