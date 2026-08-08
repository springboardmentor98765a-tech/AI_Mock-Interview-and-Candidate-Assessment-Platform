import enum

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class ResumeStatus(str, enum.Enum):
    PENDING = "PENDING"
    PARSED = "PARSED"
    FAILED = "FAILED"


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # `filename` is what the candidate called it — display only, never used as a
    # path. `stored_path` is our own uuid4 name, which is what is on disk.
    filename = Column(String(255), nullable=False)
    stored_path = Column(String(512), nullable=False)
    size_bytes = Column(Integer, nullable=False)

    status = Column(Enum(ResumeStatus), nullable=False, default=ResumeStatus.PENDING, index=True)
    error = Column(Text, nullable=True)

    # Full text pulled out of the PDF. Kept so a re-parse never needs the file,
    # and so interview questions can later be generated from the real résumé.
    raw_text = Column(Text, nullable=True)

    # --- the six spec components ---
    summary = Column(Text, nullable=True)

    # sqlalchemy.JSON, not JSONB: DATABASE_URL falls back to SQLite, where JSONB
    # does not exist. JSON works on both backends.
    skills = Column(JSON, nullable=True)
    technologies = Column(JSON, nullable=True)
    experience = Column(JSON, nullable=True)
    education = Column(JSON, nullable=True)
    total_experience_years = Column(Float, nullable=True)

    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    parsed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User")

    def __repr__(self) -> str:
        return f"<Resume id={self.id} user_id={self.user_id} status={self.status}>"
