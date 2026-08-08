import enum

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    and_,
    or_,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class InterviewType(str, enum.Enum):
    """Features 1-4: the four kinds of interview this module generates."""

    HR = "HR"
    TECHNICAL = "TECHNICAL"
    BEHAVIORAL = "BEHAVIORAL"
    APTITUDE = "APTITUDE"


class Difficulty(str, enum.Enum):
    """Feature 5."""

    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class SessionStatus(str, enum.Enum):
    """Feature 7: where an interview sits in its lifecycle."""

    CREATED = "CREATED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ABANDONED = "ABANDONED"


class QuestionSource(str, enum.Enum):
    """Whether the questions came from the AI or the built-in bank."""

    AI = "AI"
    FALLBACK = "FALLBACK"


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    interview_type = Column(Enum(InterviewType), nullable=False)

    # Feature 6: deliberately a free-text column, not an enum. A new domain is
    # just a new string — no migration and no code change. SUGGESTED_DOMAINS in
    # services/question_bank.py is only a hint list for the UI.
    domain = Column(String(120), nullable=False)

    difficulty = Column(Enum(Difficulty), nullable=False)

    # --- session management (feature 7) ---
    status = Column(
        Enum(SessionStatus), nullable=False, default=SessionStatus.CREATED, index=True
    )
    question_count = Column(Integer, nullable=False, default=0)
    source = Column(Enum(QuestionSource), nullable=False, default=QuestionSource.FALLBACK)

    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    questions = relationship(
        "InterviewQuestion",
        back_populates="interview",
        cascade="all, delete-orphan",
        order_by="InterviewQuestion.sequence_no",
    )

    def __repr__(self) -> str:
        return (
            f"<Interview id={self.id} type={self.interview_type} "
            f"domain={self.domain!r} difficulty={self.difficulty}>"
        )


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    # A question's position within its interview is unique — this is what keeps
    # the voice interviewer from asking the same question twice.
    __table_args__ = (
        UniqueConstraint("interview_id", "sequence_no", name="uq_interview_question_seq"),
    )

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(
        Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True
    )

    question_text = Column(Text, nullable=False)
    category = Column(String(80), nullable=False)
    difficulty = Column(Enum(Difficulty), nullable=False)
    sequence_no = Column(Integer, nullable=False)

    # --- filled in by the voice interviewer (feature 9) ---
    # Written answers are not collected today. The column stays because rows
    # created before answers became audio still hold transcripts here, and a
    # future scoring module will want somewhere to put a written answer.
    answer_text = Column(Text, nullable=True)
    # The candidate's spoken answer is stored as the recording itself — the
    # platform no longer transcribes it. Path is relative to ANSWER_AUDIO_DIR's
    # parent and is always a name the server chose, never a client filename.
    answer_audio_path = Column(String(512), nullable=True)
    answer_audio_mime = Column(String(80), nullable=True)
    asked_at = Column(DateTime(timezone=True), nullable=True)
    answered_at = Column(DateTime(timezone=True), nullable=True)
    # Set when the candidate passes on a question. A skip is *not attempted* —
    # deliberately a separate column from answered_at rather than an empty
    # answer, so "said nothing" can never be counted as "answered".
    skipped_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    interview = relationship("Interview", back_populates="questions")

    def __repr__(self) -> str:
        return f"<InterviewQuestion id={self.id} interview_id={self.interview_id} seq={self.sequence_no}>"


# One definition of each state, shared by the interviewer's progress counter and
# by every analytics endpoint, so the two can never disagree.
#
# Both expressions also read rows written before answers became audio, where a
# transcript in answer_text meant answered and an empty string meant skipped.

# Attempted: the candidate actually said something.
QUESTION_ANSWERED = or_(
    InterviewQuestion.answer_audio_path.isnot(None),
    and_(InterviewQuestion.answer_text.isnot(None), InterviewQuestion.answer_text != ""),
)

# Not attempted: the candidate passed on it.
#
# The IS NOT NULL guard is load-bearing. In SQL, `answer_text = ''` against a
# NULL column evaluates to NULL rather than false, and a NULL here propagates
# through OR into QUESTION_HANDLED — whose negation is then also NULL, so an
# untouched question would match nothing and the interview would look finished
# before it began.
QUESTION_SKIPPED = or_(
    InterviewQuestion.skipped_at.isnot(None),
    and_(InterviewQuestion.answer_text.isnot(None), InterviewQuestion.answer_text == ""),
)

# Dealt with either way — answered or skipped. This is what decides whether the
# interviewer moves on, so a skipped question is never asked twice.
QUESTION_HANDLED = or_(QUESTION_ANSWERED, QUESTION_SKIPPED)
