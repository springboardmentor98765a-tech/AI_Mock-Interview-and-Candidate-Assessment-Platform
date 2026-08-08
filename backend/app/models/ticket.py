import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class Ticket(Base):
    """
    A report raised by one user against another, for an administrator to review.

    Replaces the localStorage prototype in the frontend, which was invisible to
    anyone but the browser that created it.
    """

    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)

    reporter_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    against_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    reason = Column(String(120), nullable=False)
    details = Column(Text, nullable=True)

    status = Column(Enum(TicketStatus), nullable=False, default=TicketStatus.OPEN, index=True)

    resolved_by_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    reporter = relationship("User", foreign_keys=[reporter_id])
    against = relationship("User", foreign_keys=[against_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])

    def __repr__(self) -> str:
        return f"<Ticket id={self.id} status={self.status} against={self.against_id}>"
