"""
Real analytics, computed from real rows.

Nothing here is estimated or seeded. If a figure cannot be derived from the
database it is not in this file — that is why there are no score, skill-rating,
confidence or distribution endpoints. Those need the scoring engine (Module 7),
which does not exist.
"""

from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.interview import (
    ACTIVE_STATUSES,
    QUESTION_ANSWERED,
    QUESTION_SKIPPED,
    Interview,
    InterviewQuestion,
    SessionStatus,
)
from app.models.resume import Resume, ResumeStatus
from app.models.ticket import Ticket, TicketStatus
from app.models.user import Role, User
from app.schemas.analytics import (
    AdminAnalytics,
    CandidateAnalytics,
    CountPoint,
    LiveInterview,
    RecruiterAnalytics,
    RecruiterCandidate,
    TimePoint,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _counts(db: Session, column, model, **filters) -> dict:
    """GROUP BY helper returning {enum_value: count}."""
    query = db.query(column, func.count()).group_by(column)
    for attr, value in filters.items():
        query = query.filter(getattr(model, attr) == value)
    return {(k.value if hasattr(k, "value") else str(k)): v for k, v in query.all()}


def _technology_counts(resumes: List[Resume]) -> Counter:
    """
    Aggregate technologies across parsed résumés.

    Done in Python rather than SQL because `technologies` is a portable JSON
    column — SQLite has no jsonb operators, and the row counts here are small.
    """
    counter: Counter = Counter()
    for resume in resumes:
        for tech in resume.technologies or []:
            cleaned = str(tech).strip()
            if cleaned:
                counter[cleaned] += 1
    return counter


@router.get(
    "/admin",
    response_model=AdminAnalytics,
    dependencies=[Depends(require_roles(Role.ADMIN))],
)
def admin_analytics(db: Session = Depends(get_db)):
    """Platform-wide counts. Every number is a live COUNT against a table."""
    users_by_role = _counts(db, User.role, User)

    since = datetime.now(timezone.utc) - timedelta(days=13)
    daily = (
        db.query(func.date(Interview.created_at), func.count())
        .filter(Interview.created_at >= since)
        .group_by(func.date(Interview.created_at))
        .all()
    )
    by_day = {str(day): count for day, count in daily}

    today = datetime.now(timezone.utc).date()
    series = []
    for offset in range(13, -1, -1):
        day = str(today - timedelta(days=offset))
        series.append(TimePoint(date=day, count=by_day.get(day, 0)))

    return AdminAnalytics(
        users_total=db.query(User).count(),
        users_by_role=users_by_role,
        users_blocked=db.query(User).filter(User.is_blocked.is_(True)).count(),
        interviews_total=db.query(Interview).count(),
        interviews_by_status=_counts(db, Interview.status, Interview),
        interviews_by_type=_counts(db, Interview.interview_type, Interview),
        interviews_by_difficulty=_counts(db, Interview.difficulty, Interview),
        questions_total=db.query(InterviewQuestion).count(),
        questions_answered=db.query(InterviewQuestion).filter(QUESTION_ANSWERED).count(),
        questions_skipped=db.query(InterviewQuestion).filter(QUESTION_SKIPPED).count(),
        resumes_total=db.query(Resume).count(),
        resumes_by_status=_counts(db, Resume.status, Resume),
        tickets_open=db.query(Ticket).filter(Ticket.status == TicketStatus.OPEN).count(),
        tickets_total=db.query(Ticket).count(),
        interviews_last_14_days=series,
    )


@router.get(
    "/candidate",
    response_model=CandidateAnalytics,
    dependencies=[Depends(require_roles(Role.CANDIDATE))],
)
def candidate_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """The signed-in candidate's own real activity. No scores — none exist."""
    mine = db.query(Interview).filter(Interview.user_id == current_user.id)

    question_q = (
        db.query(InterviewQuestion)
        .join(Interview, InterviewQuestion.interview_id == Interview.id)
        .filter(Interview.user_id == current_user.id)
    )

    last = (
        mine.filter(Interview.started_at.isnot(None))
        .order_by(Interview.started_at.desc())
        .first()
    )

    resume = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id, Resume.status == ResumeStatus.PARSED)
        .order_by(Resume.id.desc())
        .first()
    )

    return CandidateAnalytics(
        interviews_total=mine.count(),
        interviews_by_status=_counts(db, Interview.status, Interview, user_id=current_user.id),
        interviews_by_type=_counts(
            db, Interview.interview_type, Interview, user_id=current_user.id
        ),
        questions_total=question_q.count(),
        questions_answered=question_q.filter(QUESTION_ANSWERED).count(),
        questions_skipped=question_q.filter(QUESTION_SKIPPED).count(),
        last_interview_at=last.started_at if last else None,
        has_resume=resume is not None,
        resume_skills_count=len(resume.skills or []) if resume else 0,
        resume_technologies_count=len(resume.technologies or []) if resume else 0,
        resume_experience_years=resume.total_experience_years if resume else None,
        scoring_available=False,
    )


@router.get(
    "/recruiter",
    response_model=RecruiterAnalytics,
    dependencies=[Depends(require_roles(Role.RECRUITER, Role.ADMIN))],
)
def recruiter_analytics(db: Session = Depends(get_db)):
    """Pool-level counts across all candidates. No scores, no distribution."""
    candidate_ids = [
        row[0] for row in db.query(User.id).filter(User.role == Role.CANDIDATE).all()
    ]

    parsed = (
        db.query(Resume)
        .filter(Resume.user_id.in_(candidate_ids or [0]), Resume.status == ResumeStatus.PARSED)
        .all()
    )
    # one résumé per candidate — the newest parsed one
    newest: dict = {}
    for resume in parsed:
        if resume.user_id not in newest or resume.id > newest[resume.user_id].id:
            newest[resume.user_id] = resume

    interviews = db.query(Interview).filter(Interview.user_id.in_(candidate_ids or [0]))

    tech = _technology_counts(list(newest.values()))

    return RecruiterAnalytics(
        candidates_total=len(candidate_ids),
        candidates_with_resume=len(newest),
        interviews_total=interviews.count(),
        interviews_completed=interviews.filter(
            Interview.status == SessionStatus.COMPLETED
        ).count(),
        # Same definition as GET /analytics/live, so the count and the list it
        # summarises can never disagree — a paused candidate appears in both.
        live_now=interviews.filter(Interview.status.in_(ACTIVE_STATUSES)).count(),
        top_technologies=[
            CountPoint(label=label, count=count) for label, count in tech.most_common(10)
        ],
        scoring_available=False,
    )


@router.get(
    "/recruiter/candidates",
    response_model=List[RecruiterCandidate],
    dependencies=[Depends(require_roles(Role.RECRUITER, Role.ADMIN))],
)
def recruiter_candidates(
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """
    The real candidate list.

    Ordered by activity (most interviews first), not by score — there is no
    score to rank on.
    """
    candidates = (
        db.query(User)
        .filter(User.role == Role.CANDIDATE)
        .order_by(User.id)
        .offset(offset)
        .limit(limit)
        .all()
    )

    out: List[RecruiterCandidate] = []
    for user in candidates:
        mine = db.query(Interview).filter(Interview.user_id == user.id)
        last = mine.order_by(Interview.created_at.desc()).first()

        resume = (
            db.query(Resume)
            .filter(Resume.user_id == user.id, Resume.status == ResumeStatus.PARSED)
            .order_by(Resume.id.desc())
            .first()
        )

        out.append(
            RecruiterCandidate(
                user_id=user.id,
                name=user.name,
                email=user.email,
                interviews_total=mine.count(),
                interviews_completed=mine.filter(
                    Interview.status == SessionStatus.COMPLETED
                ).count(),
                has_resume=resume is not None,
                top_technologies=[str(t) for t in (resume.technologies or [])[:6]] if resume else [],
                last_active_at=last.created_at if last else None,
            )
        )

    out.sort(key=lambda c: c.interviews_total, reverse=True)
    return out


@router.get(
    "/live",
    response_model=List[LiveInterview],
    dependencies=[Depends(require_roles(Role.RECRUITER, Role.ADMIN))],
)
def live_interviews(db: Session = Depends(get_db)):
    """
    Interviews a candidate is currently partway through.

    Includes PAUSED as well as IN_PROGRESS: a paused candidate is still in a
    live session, and dropping them from this list would make someone who
    stepped away for a minute silently disappear from the monitor. The `paused`
    flag on each row is what distinguishes the two.

    Progress is counted from real answered questions, not simulated.
    """
    rows = (
        db.query(Interview, User)
        .join(User, Interview.user_id == User.id)
        .filter(Interview.status.in_(ACTIVE_STATUSES))
        .order_by(Interview.started_at.desc().nullslast())
        .all()
    )

    out: List[LiveInterview] = []
    for interview, user in rows:
        total = (
            db.query(InterviewQuestion)
            .filter(InterviewQuestion.interview_id == interview.id)
            .count()
        )
        answered = (
            db.query(InterviewQuestion)
            .filter(InterviewQuestion.interview_id == interview.id, QUESTION_ANSWERED)
            .count()
        )
        out.append(
            LiveInterview(
                interview_id=interview.id,
                candidate_id=user.id,
                candidate_name=user.name,
                interview_type=interview.interview_type.value,
                domain=interview.domain,
                difficulty=interview.difficulty.value,
                questions_total=total,
                questions_answered=answered,
                started_at=interview.started_at,
                paused=interview.status == SessionStatus.PAUSED,
            )
        )
    return out
