from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.ticket import TicketStatus

REASONS = [
    "Inappropriate behaviour",
    "Abusive language",
    "Spam or scam",
    "Fake profile",
    "Other",
]


class TicketCreate(BaseModel):
    against_id: int
    reason: str = Field(min_length=2, max_length=120)
    details: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("reason")
    @classmethod
    def _reason(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if cleaned not in REASONS:
            raise ValueError(f"Reason must be one of: {', '.join(REASONS)}")
        return cleaned


class TicketStatusUpdate(BaseModel):
    status: TicketStatus

    @field_validator("status")
    @classmethod
    def _not_open(cls, value: TicketStatus) -> TicketStatus:
        if value == TicketStatus.OPEN:
            raise ValueError("A ticket cannot be moved back to OPEN.")
        return value


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reporter_id: int
    reporter_name: str
    reporter_role: str
    against_id: int
    against_name: str
    against_role: str
    reason: str
    details: Optional[str] = None
    status: TicketStatus
    created_at: datetime
    resolved_at: Optional[datetime] = None

    @classmethod
    def from_model(cls, ticket) -> "TicketOut":
        return cls(
            id=ticket.id,
            reporter_id=ticket.reporter_id,
            reporter_name=ticket.reporter.name if ticket.reporter else "(deleted user)",
            reporter_role=ticket.reporter.role.value if ticket.reporter else "UNKNOWN",
            against_id=ticket.against_id,
            against_name=ticket.against.name if ticket.against else "(deleted user)",
            against_role=ticket.against.role.value if ticket.against else "UNKNOWN",
            reason=ticket.reason,
            details=ticket.details,
            status=ticket.status,
            created_at=ticket.created_at,
            resolved_at=ticket.resolved_at,
        )


class DirectoryEntry(BaseModel):
    """Minimal public-facing user info, for choosing who to report."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    role: str
