import enum
import uuid

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
    """
    Feature 7: where an interview sits in its lifecycle.

        CREATED ──start──> IN_PROGRESS ──end──> COMPLETED
                               │  ▲
                          pause│  │resume
                               ▼  │
                            PAUSED ──end──> COMPLETED

    ABANDONED is not a transition anyone requests — it is where a session that
    was never finished ends up. COMPLETED is terminal: an interview that has
    been ended cannot be restarted, because the questions have been seen.
    """

    CREATED = "CREATED"
    IN_PROGRESS = "IN_PROGRESS"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    ABANDONED = "ABANDONED"


# The states in which a candidate is partway through: a question may be served,
# and the interview is neither finished nor unstarted. Defined once because the
# REST endpoints, the voice socket and analytics all need the same answer.
ACTIVE_STATUSES = (SessionStatus.IN_PROGRESS, SessionStatus.PAUSED)


class QuestionSource(str, enum.Enum):
    """Whether the questions came from the AI or the built-in bank."""

    AI = "AI"
    FALLBACK = "FALLBACK"


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)

    # An opaque public identifier for this interview session.
    #
    # One interview is one session, so this identifies the same run as `id` —
    # but it is the one that is safe to put in a URL, a log line or a support
    # ticket. A sequential integer tells anyone who sees it roughly how many
    # interviews the platform has ever run, and invites guessing at neighbours;
    # a UUID tells them nothing.
    #
    # Generated in Python rather than by the database so it is available
    # immediately on an unflushed object, and so the SQLite fallback behaves
    # the same as Postgres.
    session_id = Column(
        String(36),
        nullable=False,
        unique=True,
        index=True,
        default=lambda: str(uuid.uuid4()),
    )

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

    # When the current pause began. Null whenever the interview is not paused —
    # this is the open half of a pause interval, not a history of them.
    paused_at = Column(DateTime(timezone=True), nullable=True)

    # Total time spent paused, accumulated on each resume.
    #
    # Without this, pause would be a way to get unlimited thinking time while
    # the countdown quietly kept running, and the elapsed clock would report a
    # duration the candidate did not spend interviewing. Both numbers are meant
    # to describe real time at the keyboard, so paused time is subtracted
    # rather than ignored.
    total_paused_seconds = Column(Integer, nullable=False, default=0, server_default="0")

    # How long the interview actually took, in seconds, stamped when it ends.
    #
    # Derivable from completed_at - started_at - total_paused_seconds, and it
    # is derived exactly that way — but it is *stored* because it is a fact
    # about a finished interview, and a stored fact does not change if the
    # formula is later corrected or if paused time is adjusted. Null while the
    # interview is still running: there is no duration until there is an end.
    duration_seconds = Column(Integer, nullable=True)

    # Module 4: how long the candidate gets per question, in seconds.
    #
    # Snapshotted from PlatformSettings.session_minutes when the interview
    # starts rather than read live, so an administrator editing the platform
    # setting mid-session cannot move the goalposts under a candidate who is
    # already answering. Null on interviews created before timing existed —
    # those simply have no countdown.
    question_seconds = Column(Integer, nullable=True)

    # Module 6: the rubric score for this interview, 0-100 — the average of
    # its answered questions' scores (app.services.scoring.aggregate_score).
    # Stamped once when the interview reaches COMPLETED, the same "stored
    # fact about a finished interview" reasoning as duration_seconds above: it
    # must not silently reinterpret itself if the rubric weights are ever
    # retuned. Null while running, and null forever on an interview where no
    # answer was ever scored (no key, provider down, or every question
    # skipped) — that is a different fact from "scored zero" and must not be
    # displayed as one.
    overall_score = Column(Float, nullable=True)

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
    # How long the candidate actually spoke for, in seconds, as measured by the
    # browser's recorder.
    #
    # Deliberately NOT derived from answered_at - asked_at. That interval also
    # contains thinking time, re-reading the question and hesitation before
    # hitting record. Words-per-minute computed against it would be wrong in a
    # way that always flatters nobody and penalises the careful, so pace uses
    # this measured speaking time or it is not reported at all.
    answer_duration_seconds = Column(Float, nullable=True)

    # Module 5 output for this one answer: filler counts, pace, grammar notes,
    # communication assessment. JSON rather than columns because the shape will
    # churn as the analysis is tuned — same reasoning as the résumé extraction.
    # Null means not analysed, which is not the same as "analysed and clean".
    analysis = Column(JSON, nullable=True)
    analyzed_at = Column(DateTime(timezone=True), nullable=True)

    asked_at = Column(DateTime(timezone=True), nullable=True)
    answered_at = Column(DateTime(timezone=True), nullable=True)
    # Set when the candidate passes on a question. A skip is *not attempted* —
    # deliberately a separate column from answered_at rather than an empty
    # answer, so "said nothing" can never be counted as "answered".
    skipped_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    interview = relationship("Interview", back_populates="questions")

    @property
    def time_on_question_seconds(self):
        """
        Seconds from being asked to being answered or skipped.

        A property rather than a column: it is fully determined by timestamps
        already stored, so persisting it would create a second copy that could
        drift. Lives here so the response schemas pick it up through
        from_attributes without every endpoint recomputing it.

        Imported lazily to keep the model layer free of a service import at
        module scope.
        """
        from app.services.session_timing import question_seconds_spent

        return question_seconds_spent(self)

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
