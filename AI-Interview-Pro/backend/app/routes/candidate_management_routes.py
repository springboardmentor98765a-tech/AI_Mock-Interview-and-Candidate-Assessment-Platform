"""
routes/candidate_management_routes.py
========================================
Recruiter/admin-facing candidate views.

    GET /candidates/leaderboard        every candidate's resume score and
                                        best interview score - both computed
                                        live from current data (recruiter/admin)
    GET /candidates/{id}/profile       the "View Profile" payload: resume,
                                        performance analytics, interview
                                        history, and session recordings -
                                        all in one place (recruiter/admin)

"Top score" is intentionally never stored: it's re-derived with MAX() /
max() every time this is called, so if a candidate beats their previous
best on a later attempt, the leaderboard reflects it on the very next
load - there's no stale row to separately delete and replace.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import User, Interview, InterviewSession, InterviewStatusEnum, RoleEnum
from app.schemas import (
    CandidateLeaderboardEntryOut,
    CandidateProfileOut,
    ProfileRecordingOut,
    UserOut,
    InterviewOut,
)
from app.auth import require_role
from app.resume_parser import compute_resume_score
from app.routes.interview_routes import compute_analytics_for_user
from app.routes.resume_routes import _to_resume_out

router = APIRouter(prefix="/candidates", tags=["Candidate Management (Recruiter/Admin)"])


def _resume_score_for(user: User):
    if not user.resume_uploaded_at:
        return None
    skills = [s for s in (user.resume_skills or "").split(",") if s]
    return compute_resume_score(
        skills=skills,
        experience_years=user.resume_experience_years,
        experience=user.resume_experience or [],
        education=user.resume_education or [],
        summary=user.resume_summary,
    )


# ---------------------------------------------------------------------------
# GET /candidates/leaderboard
# ---------------------------------------------------------------------------
@router.get("/leaderboard", response_model=list[CandidateLeaderboardEntryOut])
def candidate_leaderboard(
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db),
):
    candidates = (
        db.query(User)
        .options(joinedload(User.interviews))
        .filter(User.role == RoleEnum.candidate)
        .all()
    )

    entries = []
    for candidate in candidates:
        scored_interviews = [
            i for i in candidate.interviews
            if i.status == InterviewStatusEnum.completed and i.overall_score is not None
        ]
        best_interview = max(scored_interviews, key=lambda i: i.overall_score, default=None)
        top_skills = [s for s in (candidate.resume_skills or "").split(",") if s][:5]

        entries.append(
            CandidateLeaderboardEntryOut(
                id=candidate.id,
                full_name=candidate.full_name,
                email=candidate.email,
                profile_picture=candidate.profile_picture,
                resume_score=_resume_score_for(candidate),
                resume_uploaded_at=candidate.resume_uploaded_at,
                top_skills=top_skills,
                best_interview_score=best_interview.overall_score if best_interview else None,
                completed_interviews=len(scored_interviews),
                best_interview_domain=best_interview.domain if best_interview else None,
            )
        )

    return entries


# ---------------------------------------------------------------------------
# GET /candidates/{candidate_id}/profile
# ---------------------------------------------------------------------------
@router.get("/{candidate_id}/profile", response_model=CandidateProfileOut)
def candidate_profile(
    candidate_id: str,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db),
):
    try:
        candidate_uuid = uuid.UUID(candidate_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid candidate id.")

    candidate = db.query(User).filter(User.id == candidate_uuid).first()
    if not candidate or candidate.role != RoleEnum.candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")

    resume = _to_resume_out(candidate) if candidate.resume_uploaded_at else None
    analytics = compute_analytics_for_user(candidate, db)

    interviews = (
        db.query(Interview)
        .options(
            joinedload(Interview.questions),
            joinedload(Interview.session).joinedload(InterviewSession.recordings),
        )
        .filter(Interview.user_id == candidate.id)
        .order_by(Interview.created_at.desc())
        .all()
    )

    # Session recordings, flattened across every one of this candidate's
    # interviews - shown only here in the profile, not as a separate page.
    recordings: list[ProfileRecordingOut] = []
    for interview in interviews:
        if not interview.session:
            continue
        for recording in interview.session.recordings:
            recordings.append(
                ProfileRecordingOut(
                    id=recording.id,
                    recording_type=recording.recording_type.value,
                    recording_url=recording.recording_url,
                    mime_type=recording.mime_type,
                    created_at=recording.created_at,
                    interview_id=interview.id,
                    interview_domain=interview.domain,
                    interview_type=interview.interview_type.value,
                    interview_score=interview.overall_score,
                )
            )
    recordings.sort(key=lambda r: r.created_at, reverse=True)

    return CandidateProfileOut(
        user=UserOut.model_validate(candidate),
        resume=resume,
        analytics=analytics,
        interviews=[InterviewOut.model_validate(i) for i in interviews],
        recordings=recordings,
    )
