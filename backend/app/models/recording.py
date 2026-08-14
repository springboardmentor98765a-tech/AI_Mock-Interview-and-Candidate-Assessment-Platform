"""
Session recordings and the log of who played them back.

Two separate concerns that belong together:

`InterviewRecording` is the candidate's webcam video for one interview — the
whole session, not one answer. Answer *audio* stays on InterviewQuestion where
it is already, because it is per question and drives the per-answer analysis.

`RecordingAccess` records every playback. Recordings are a person's face and
voice, so "who has listened to this, and when" needs an answer that does not
depend on anyone's memory. It is written on the way out of a successful fetch,
so a 404 or a permission failure never appears as an access.
"""

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import backref, relationship
from sqlalchemy.sql import func

from app.db.session import Base

# The relationship below is declared by class *name*, which SQLAlchemy resolves
# lazily against its registry — so mapping this module fails unless Interview
# has also been imported. Importing it here makes this module usable on its own
# (a script, a test, a shell) instead of only via app.main. Safe from circular
# imports: app.models.interview does not import this module.
from app.models import interview as _interview  # noqa: F401


class InterviewRecording(Base):
    """The webcam video for one interview session."""

    __tablename__ = "interview_recordings"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(
        Integer,
        ForeignKey("interviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Server-chosen path, never a client filename — the same rule as résumés
    # and answer audio, and for the same reason (path traversal).
    stored_path = Column(String(512), nullable=False)
    mime_type = Column(String(80), nullable=False)
    size_bytes = Column(Integer, nullable=False)

    # As measured by the browser's recorder. Advisory: it is a client claim,
    # used for display rather than for any decision.
    duration_seconds = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # passive_deletes is load-bearing, not decoration. Without it SQLAlchemy
    # "helpfully" tries to detach children from a deleted parent by setting
    # interview_id to NULL — which this column forbids, so deleting an
    # interview that had a recording failed with a NotNullViolation instead of
    # letting the database's ON DELETE CASCADE do the job.
    interview = relationship(
        "Interview",
        backref=backref(
            "recordings",
            cascade="all, delete-orphan",
            passive_deletes=True,
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<InterviewRecording id={self.id} interview_id={self.interview_id} "
            f"bytes={self.size_bytes}>"
        )


class RecordingAccess(Base):
    """
    One row per successful playback of a recording.

    `user_id` is ON DELETE SET NULL rather than CASCADE: deleting a user must
    not quietly erase the record that they accessed someone else's recording.
    The row survives with a null user, which is a weaker fact than the original
    but a stronger one than nothing.
    """

    __tablename__ = "recording_accesses"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    interview_id = Column(Integer, nullable=False, index=True)

    # "video" for the session recording, "answer_audio" for one spoken answer.
    # Deliberately a plain string rather than an enum: a new kind of artefact
    # should not need a migration on an audit table.
    artefact = Column(String(40), nullable=False)

    # Which answer, for artefact="answer_audio". Null for the session video.
    sequence_no = Column(Integer, nullable=True)

    # Not a foreign key on purpose. This is an audit record: it has to outlive
    # the interview it describes, and a cascade would delete the evidence
    # along with the thing it is evidence about.
    accessed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return (
            f"<RecordingAccess user={self.user_id} interview={self.interview_id} "
            f"artefact={self.artefact!r}>"
        )
