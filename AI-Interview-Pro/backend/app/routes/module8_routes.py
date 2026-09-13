"""Module 8: candidate consent, privacy-safe recruiter review, and analytics."""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.auth import require_role
from app.database import get_db
from app.models import (
    Interview, InterviewAssessment, InterviewQuestion, InterviewSession,
    InterviewShareConsent, InterviewStatusEnum, RoleEnum, ShareStatusEnum, User,
)
from app.schemas import (
    DashboardAnalyticsOut, InterviewDetailOut, InterviewShareBatchCreateRequest, InterviewShareCreateRequest,
    InterviewShareOut, RecruiterOptionOut, RecruiterRankingOut,
    ScoreTrendPointOut, SessionOut, SharedInterviewDetailOut,
    SharedInterviewListItemOut, SkillMetricOut, UserOut, WeakAreaOut,
)
from app.routes.interview_routes import compute_analytics_for_user

router = APIRouter(tags=["Module 8 - Consent and Analytics"])


def _uuid(value: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid {label}.")


def _owned_completed_interview(interview_id: str, candidate: User, db: Session) -> Interview:
    interview = db.query(Interview).filter(Interview.id == _uuid(interview_id, "interview id")).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")
    if interview.user_id != candidate.id:
        raise HTTPException(status_code=403, detail="This interview belongs to another candidate.")
    if interview.status != InterviewStatusEnum.completed:
        raise HTTPException(status_code=400, detail="Only completed interviews can be shared.")
    return interview


def _share_out(share: InterviewShareConsent) -> InterviewShareOut:
    return InterviewShareOut(
        id=share.id,
        interview_id=share.interview_id,
        candidate_id=share.candidate_id,
        recruiter=RecruiterOptionOut(
            id=share.recruiter.id,
            full_name=share.recruiter.full_name,
            email=share.recruiter.email,
            profile_picture=share.recruiter.profile_picture,
        ),
        scope=share.scope,
        status=share.status.value,
        granted_at=share.granted_at,
        revoked_at=share.revoked_at,
    )


def has_active_share(interview_id, recruiter_id, db: Session) -> bool:
    return db.query(InterviewShareConsent).filter(
        InterviewShareConsent.interview_id == interview_id,
        InterviewShareConsent.recruiter_id == recruiter_id,
        InterviewShareConsent.status == ShareStatusEnum.active,
    ).first() is not None


@router.get("/sharing/recruiters", response_model=list[RecruiterOptionOut])
def list_recruiters(
    current_user: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db),
):
    recruiters = db.query(User).filter(
        User.role == RoleEnum.recruiter, User.is_active.is_(True)
    ).order_by(User.full_name.asc()).all()
    return [RecruiterOptionOut(
        id=r.id, full_name=r.full_name, email=r.email, profile_picture=r.profile_picture
    ) for r in recruiters]


@router.get("/interviews/{interview_id}/shares", response_model=list[InterviewShareOut])
def list_interview_shares(
    interview_id: str,
    current_user: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db),
):
    interview = _owned_completed_interview(interview_id, current_user, db)
    shares = db.query(InterviewShareConsent).options(
        joinedload(InterviewShareConsent.recruiter)
    ).filter(InterviewShareConsent.interview_id == interview.id).order_by(
        InterviewShareConsent.updated_at.desc()
    ).all()
    return [_share_out(s) for s in shares]


@router.post(
    "/interviews/{interview_id}/shares",
    response_model=InterviewShareOut,
    status_code=status.HTTP_201_CREATED,
)
def share_interview(
    interview_id: str,
    payload: InterviewShareCreateRequest,
    current_user: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db),
):
    interview = _owned_completed_interview(interview_id, current_user, db)
    recruiter = db.query(User).filter(User.id == payload.recruiter_id).first()
    if not recruiter or recruiter.role != RoleEnum.recruiter or not recruiter.is_active:
        raise HTTPException(status_code=400, detail="Select an active recruiter account.")

    share = db.query(InterviewShareConsent).filter(
        InterviewShareConsent.interview_id == interview.id,
        InterviewShareConsent.recruiter_id == recruiter.id,
    ).first()
    now = datetime.utcnow()
    if share and share.status == ShareStatusEnum.active:
        raise HTTPException(status_code=409, detail="This recruiter already has access.")
    if share:
        share.status = ShareStatusEnum.active
        share.granted_at = now
        share.revoked_at = None
        share.scope = "full_interview"
    else:
        share = InterviewShareConsent(
            interview_id=interview.id,
            candidate_id=current_user.id,
            recruiter_id=recruiter.id,
            scope="full_interview",
            status=ShareStatusEnum.active,
            granted_at=now,
        )
        db.add(share)
    db.commit()
    db.refresh(share)
    share.recruiter = recruiter
    return _share_out(share)


@router.post(
    "/interviews/{interview_id}/shares/batch",
    response_model=list[InterviewShareOut],
    status_code=status.HTTP_201_CREATED,
)
def share_interview_with_multiple_recruiters(
    interview_id: str,
    payload: InterviewShareBatchCreateRequest,
    current_user: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db),
):
    """Grant independent, revocable access to several verified recruiters atomically."""
    interview = _owned_completed_interview(interview_id, current_user, db)
    recruiters = db.query(User).filter(User.id.in_(payload.recruiter_ids)).all()
    recruiter_by_id = {
        recruiter.id: recruiter for recruiter in recruiters
        if recruiter.role == RoleEnum.recruiter and recruiter.is_active
    }
    if len(recruiter_by_id) != len(payload.recruiter_ids):
        raise HTTPException(status_code=400, detail="Every selection must be an active recruiter account.")

    existing = db.query(InterviewShareConsent).filter(
        InterviewShareConsent.interview_id == interview.id,
        InterviewShareConsent.recruiter_id.in_(payload.recruiter_ids),
    ).all()
    existing_by_recruiter = {share.recruiter_id: share for share in existing}
    now = datetime.utcnow()
    granted = []

    for recruiter_id in payload.recruiter_ids:
        share = existing_by_recruiter.get(recruiter_id)
        if share:
            share.status = ShareStatusEnum.active
            share.granted_at = now
            share.revoked_at = None
            share.scope = "full_interview"
        else:
            share = InterviewShareConsent(
                interview_id=interview.id,
                candidate_id=current_user.id,
                recruiter_id=recruiter_id,
                scope="full_interview",
                status=ShareStatusEnum.active,
                granted_at=now,
            )
            db.add(share)
        granted.append((share, recruiter_by_id[recruiter_id]))

    db.commit()
    result = []
    for share, recruiter in granted:
        db.refresh(share)
        share.recruiter = recruiter
        result.append(_share_out(share))
    return result


@router.delete("/interviews/{interview_id}/shares/{share_id}", response_model=InterviewShareOut)
def revoke_interview_share(
    interview_id: str,
    share_id: str,
    current_user: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db),
):
    interview = _owned_completed_interview(interview_id, current_user, db)
    share = db.query(InterviewShareConsent).options(
        joinedload(InterviewShareConsent.recruiter)
    ).filter(
        InterviewShareConsent.id == _uuid(share_id, "share id"),
        InterviewShareConsent.interview_id == interview.id,
        InterviewShareConsent.candidate_id == current_user.id,
    ).first()
    if not share:
        raise HTTPException(status_code=404, detail="Sharing permission not found.")
    if share.status == ShareStatusEnum.active:
        share.status = ShareStatusEnum.revoked
        share.revoked_at = datetime.utcnow()
        db.commit()
        db.refresh(share)
    return _share_out(share)


SKILLS = (
    ("communication", "Communication", "communication_score", "Practice concise, structured answers and review filler words."),
    ("technical", "Technical relevance", "technical_score", "Review weak technical topics and support answers with concrete examples."),
    ("confidence", "Confidence", "confidence_score", "Use timed mock practice, steady pacing, and direct camera eye contact."),
    ("professionalism", "Professionalism", "professionalism_score", "Structure answers, manage time, and finish with a clear conclusion."),
    ("grammar", "Grammar", "grammar_score", "Use shorter sentences and review common grammar mistakes in transcripts."),
)


@router.get("/analytics/dashboard", response_model=DashboardAnalyticsOut)
def candidate_dashboard_analytics(
    current_user: User = Depends(require_role("candidate")),
    db: Session = Depends(get_db),
):
    interviews = db.query(Interview).options(
        joinedload(Interview.questions), joinedload(Interview.assessment)
    ).filter(
        Interview.user_id == current_user.id,
        Interview.status == InterviewStatusEnum.completed,
    ).order_by(Interview.completed_at.asc()).all()
    scored = [i for i in interviews if i.overall_score is not None]
    scores = [float(i.overall_score) for i in scored]
    legacy = compute_analytics_for_user(current_user, db)

    trend = [ScoreTrendPointOut(
        interview_id=i.id,
        date=i.completed_at or i.created_at,
        label=f"{i.interview_type.value.title()} - {i.domain}",
        interview_type=i.interview_type.value,
        domain=i.domain,
        overall_score=round(i.overall_score, 1),
    ) for i in scored]

    metrics, weak = [], []
    for key, label, attr, recommendation in SKILLS:
        values = []
        for interview in interviews:
            if attr == "professionalism_score" and interview.assessment:
                values.append(interview.assessment.professionalism_score)
            else:
                values.extend(getattr(q, attr) for q in interview.questions if getattr(q, attr) is not None)
        average = round(sum(values) / len(values), 1) if values else None
        metrics.append(SkillMetricOut(key=key, label=label, average=average, sample_size=len(values)))
        if average is not None and len(values) >= 2:
            weak.append(WeakAreaOut(
                key=key, label=label, average=average, sample_size=len(values),
                reason=f"This is one of your lowest historical averages ({average}%) across {len(values)} scored samples.",
                recommendation=recommendation,
            ))
    weak.sort(key=lambda item: item.average)
    weak = weak[:3]

    growth = round(scores[-1] - scores[0], 1) if len(scores) >= 2 else 0.0
    return DashboardAnalyticsOut(
        completed_interviews=len(interviews),
        average_score=round(sum(scores) / len(scores), 1) if scores else None,
        latest_score=round(scores[-1], 1) if scores else None,
        best_score=round(max(scores), 1) if scores else None,
        interview_readiness=legacy.interview_readiness,
        growth_percent=growth,
        trend=trend,
        skills=metrics,
        weak_areas=weak,
        data_note=(
            "Weak-area insights require at least two scored samples and are based only on saved interview evidence."
        ),
    )


def _shared_query(recruiter: User, db: Session):
    return db.query(InterviewShareConsent).options(
        joinedload(InterviewShareConsent.candidate),
        joinedload(InterviewShareConsent.interview).joinedload(Interview.assessment),
    ).filter(
        InterviewShareConsent.recruiter_id == recruiter.id,
        InterviewShareConsent.status == ShareStatusEnum.active,
    )


@router.get("/recruiter/shared-interviews", response_model=list[SharedInterviewListItemOut])
def shared_interviews(
    q: Optional[str] = Query(None, max_length=100),
    interview_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    min_score: Optional[float] = Query(None, ge=0, le=100),
    max_score: Optional[float] = Query(None, ge=0, le=100),
    sort: str = Query("newest", pattern="^(newest|oldest|highest|lowest)$"),
    current_user: User = Depends(require_role("recruiter")),
    db: Session = Depends(get_db),
):
    shares = _shared_query(current_user, db).all()
    items = []
    needle = (q or "").strip().lower()
    for share in shares:
        i, c = share.interview, share.candidate
        if needle and needle not in f"{c.full_name} {c.email} {i.domain}".lower():
            continue
        if interview_type and i.interview_type.value != interview_type:
            continue
        if difficulty and i.difficulty.value != difficulty:
            continue
        if min_score is not None and (i.overall_score is None or i.overall_score < min_score):
            continue
        if max_score is not None and (i.overall_score is None or i.overall_score > max_score):
            continue
        items.append(SharedInterviewListItemOut(
            share_id=share.id, interview_id=i.id, candidate_id=c.id,
            candidate_name=c.full_name, candidate_email=c.email,
            candidate_picture=c.profile_picture, interview_type=i.interview_type.value,
            domain=i.domain, difficulty=i.difficulty.value, completed_at=i.completed_at,
            overall_score=i.overall_score,
            performance_rating=i.assessment.performance_rating if i.assessment else None,
            granted_at=share.granted_at,
        ))
    key = (lambda x: x.overall_score if x.overall_score is not None else -1) if sort in {"highest", "lowest"} else (lambda x: x.completed_at or x.granted_at)
    items.sort(key=key, reverse=sort in {"newest", "highest"})
    return items


@router.get("/recruiter/shared-interviews/{interview_id}", response_model=SharedInterviewDetailOut)
def shared_interview_detail(
    interview_id: str,
    current_user: User = Depends(require_role("recruiter")),
    db: Session = Depends(get_db),
):
    share = _shared_query(current_user, db).options(
        joinedload(InterviewShareConsent.interview).joinedload(Interview.questions),
        joinedload(InterviewShareConsent.interview).joinedload(Interview.session).joinedload(InterviewSession.recordings),
    ).filter(InterviewShareConsent.interview_id == _uuid(interview_id, "interview id")).first()
    if not share:
        raise HTTPException(status_code=403, detail="The candidate has not granted access or has revoked it.")
    return SharedInterviewDetailOut(
        share=_share_out(share),
        candidate=UserOut.model_validate(share.candidate),
        interview=InterviewDetailOut.model_validate(share.interview),
        session=SessionOut.model_validate(share.interview.session) if share.interview.session else None,
    )


@router.get("/recruiter/rankings", response_model=list[RecruiterRankingOut])
def recruiter_rankings(
    current_user: User = Depends(require_role("recruiter")),
    db: Session = Depends(get_db),
):
    shares = _shared_query(current_user, db).options(
        joinedload(InterviewShareConsent.interview).joinedload(Interview.questions)
    ).all()
    grouped = {}
    for share in shares:
        grouped.setdefault(share.candidate_id, {"candidate": share.candidate, "interviews": []})["interviews"].append(share.interview)
    rows = []
    for candidate_id, group in grouped.items():
        interviews = sorted(group["interviews"], key=lambda i: i.completed_at or i.created_at)
        scores = [i.overall_score for i in interviews if i.overall_score is not None]
        questions = [q for i in interviews for q in i.questions if q.answer_text]
        avg = lambda values: round(sum(values) / len(values), 1) if values else None
        tech = [q.technical_score for q in questions if q.technical_score is not None]
        comm = [q.communication_score for q in questions if q.communication_score is not None]
        c = group["candidate"]
        rows.append(RecruiterRankingOut(
            rank=0, candidate_id=candidate_id, candidate_name=c.full_name,
            candidate_email=c.email, shared_interviews=len(interviews),
            average_score=avg(scores), best_score=max(scores) if scores else None,
            technical_average=avg(tech), communication_average=avg(comm),
            improvement=round(scores[-1] - scores[0], 1) if len(scores) >= 2 else 0.0,
        ))
    rows.sort(key=lambda row: row.average_score if row.average_score is not None else -1, reverse=True)
    for index, row in enumerate(rows, 1):
        row.rank = index
    return rows
