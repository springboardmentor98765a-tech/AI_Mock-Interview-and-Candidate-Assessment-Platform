"""
Module 8 — Dashboard & Analytics.

GET /api/interviews/me/stats and GET /api/interviews/staff/overview
(Module 1) already cover "Performance tracking" and "Interview
history" with basic counts/averages. This module adds the rest of the
guideline doc's Module 8 bullets on top of the same `interviews` rows
Module 7 already scores — everything here is read-only analysis, it
never writes to the database:

  * Skill-wise analytics   — GET /me/skills, GET /staff/skills
  * Weak-area prediction   — GET /me/weak-areas
  * Score breakdown reports — GET /me/breakdown
  * Performance trends     — GET /me/trend, GET /staff/trend
  * Candidate ranking metrics — GET /staff/rankings (+ /rankings/csv)
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Interview, User
from app.schemas import (
    BreakdownEntryOut,
    CandidateComparisonEntryOut,
    CandidateProfileOut,
    PerformanceSummaryOut,
    RankingEntryOut,
    ResumeSnapshotOut,
    ShortlistEntryOut,
    SkillAnalyticsOut,
    TrendBucketOut,
    TrendPointOut,
    WeakAreaOut,
)
from app.security import CurrentUser, require_roles

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

STAFF_ROLES = ("coach", "recruiter", "admin")

# skill key (used in API responses) -> Interview column name
ATTR_MAP = {
    "communication": "skill_communication",
    "technical": "skill_technical",
    "confidence": "skill_confidence",
    "problemSolving": "skill_problem_solving",
    "professionalism": "skill_professionalism",
}

SKILL_LABELS = {
    "communication": "Communication",
    "technical": "Technical Relevance",
    "confidence": "Confidence",
    "problemSolving": "Problem Solving",
    "professionalism": "Professionalism",
}

# Deliberately generic, canned suggestions — this is a rules-based
# nudge ("your lowest-scoring category is X"), not a claim of deep
# personalized coaching.
RECOMMENDATIONS = {
    "communication": "Practice speaking clearly, slow your pace slightly, and cut filler words in mock sessions.",
    "technical": "Revisit core concepts for your target role and rehearse explaining your solutions out loud.",
    "confidence": "Record a few practice answers and work on steady eye contact, posture, and pacing.",
    "problemSolving": "Practice structured problem-solving (e.g. clarify -> plan -> solve -> verify) before interviews.",
    "professionalism": "Time-box your answers and rehearse a tidy opening/body/close structure for responses.",
}


def _completed_query(db: Session, candidate_id: Optional[int] = None):
    q = db.query(Interview).filter(Interview.status == "completed", Interview.score.isnot(None))
    if candidate_id is not None:
        q = q.filter(Interview.candidate_id == candidate_id)
    return q


def _skill_breakdown(rows: list[Interview]) -> list[SkillAnalyticsOut]:
    """Per-skill average/best/worst/trend across a set of completed,
    scored interviews. `trend` compares the average of the first half
    of the (chronologically ordered) rows against the second half —
    a simple, honest signal rather than a fitted regression."""
    out: list[SkillAnalyticsOut] = []
    for key, attr in ATTR_MAP.items():
        values = [v for r in rows for v in [getattr(r, attr)] if v is not None]
        if not values:
            out.append(
                SkillAnalyticsOut(
                    skill=key, label=SKILL_LABELS[key], average=0, best=0, worst=0, trend="steady", sample_size=0
                )
            )
            continue

        half = max(1, len(values) // 2)
        first_half, second_half = values[:half], values[half:] or values[:half]
        delta = (sum(second_half) / len(second_half)) - (sum(first_half) / len(first_half))
        trend = "improving" if delta > 2 else "declining" if delta < -2 else "steady"

        out.append(
            SkillAnalyticsOut(
                skill=key,
                label=SKILL_LABELS[key],
                average=round(sum(values) / len(values)),
                best=max(values),
                worst=min(values),
                trend=trend,
                sample_size=len(values),
            )
        )
    return out


def _weak_areas(rows: list[Interview], top: int) -> list[WeakAreaOut]:
    breakdown = [b for b in _skill_breakdown(rows) if b.sample_size > 0]
    weakest = sorted(breakdown, key=lambda b: b.average)[:top]
    return [
        WeakAreaOut(skill=b.skill, label=b.label, average=b.average, recommendation=RECOMMENDATIONS[b.skill])
        for b in weakest
    ]


def _rankings(db: Session, limit: int) -> list[RankingEntryOut]:
    rows = (
        db.query(
            Interview.candidate_id,
            func.avg(Interview.score).label("avg_score"),
            func.count(Interview.id).label("completed_count"),
            func.max(Interview.score).label("best_score"),
            func.max(Interview.completed_at).label("last_completed"),
        )
        .filter(Interview.status == "completed", Interview.score.isnot(None))
        .group_by(Interview.candidate_id)
        .order_by(func.avg(Interview.score).desc())
        .limit(limit)
        .all()
    )
    candidate_ids = [r.candidate_id for r in rows]
    users_by_id = {u.id: u for u in db.query(User).filter(User.id.in_(candidate_ids)).all()} if candidate_ids else {}

    entries = []
    for i, r in enumerate(rows):
        u = users_by_id.get(r.candidate_id)
        entries.append(
            RankingEntryOut(
                rank=i + 1,
                candidate_id=r.candidate_id,
                full_name=u.full_name if u else "Unknown",
                email=u.email if u else "",
                average_score=round(r.avg_score),
                completed_count=r.completed_count,
                best_score=r.best_score,
                last_completed=r.last_completed,
            )
        )
    return entries


# =================================================================
# Candidate — Performance trends, skill-wise analytics, weak areas,
# score breakdown reports
# =================================================================
@router.get("/me/trend", response_model=list[TrendPointOut])
def my_trend(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("candidate")),
):
    rows = _completed_query(db, user.id).order_by(Interview.completed_at.asc()).limit(limit).all()
    return [
        TrendPointOut(
            interview_id=r.id,
            date=r.completed_at,
            interview_type=r.interview_type,
            score=r.score,
            communication=r.skill_communication,
            technical=r.skill_technical,
            confidence=r.skill_confidence,
            problemSolving=r.skill_problem_solving,
            professionalism=r.skill_professionalism,
        )
        for r in rows
    ]


@router.get("/me/skills", response_model=list[SkillAnalyticsOut])
def my_skill_analytics(db: Session = Depends(get_db), user: CurrentUser = Depends(require_roles("candidate"))):
    rows = _completed_query(db, user.id).order_by(Interview.completed_at.asc()).all()
    return _skill_breakdown(rows)


@router.get("/me/weak-areas", response_model=list[WeakAreaOut])
def my_weak_areas(
    top: int = Query(default=2, ge=1, le=5),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("candidate")),
):
    rows = _completed_query(db, user.id).all()
    return _weak_areas(rows, top)


@router.get("/me/breakdown", response_model=list[BreakdownEntryOut])
def my_breakdown(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("candidate")),
):
    rows = _completed_query(db, user.id).order_by(Interview.completed_at.desc()).limit(limit).all()
    return [
        BreakdownEntryOut(
            interview_id=r.id,
            interview_type=r.interview_type,
            date=r.completed_at,
            score=r.score,
            rating_label=r.rating_label,
            communication=r.skill_communication,
            confidence=r.skill_confidence,
            technical=r.skill_technical,
            professionalism=r.skill_professionalism,
        )
        for r in rows
    ]


@router.get("/me/summary", response_model=PerformanceSummaryOut)
def my_summary(db: Session = Depends(get_db), user: CurrentUser = Depends(require_roles("candidate"))):
    """Compact dashboard-widget version of the performance summary —
    see also GET /api/notifications/me/summary/pdf for the downloadable
    report (Module 9)."""
    rows = _completed_query(db, user.id).order_by(Interview.completed_at.asc()).all()
    scores = [r.score for r in rows if r.score is not None]
    return PerformanceSummaryOut(
        completed_count=len(rows),
        average_score=round(sum(scores) / len(scores)) if scores else 0,
        best_score=max(scores) if scores else 0,
        skills=_skill_breakdown(rows),
        weak_areas=_weak_areas(rows, top=2),
        recent_scores=scores[-10:],
    )


# =================================================================
# Staff — candidate ranking metrics, platform-wide skill analytics
# and performance trend
# =================================================================
@router.get("/staff/rankings", response_model=list[RankingEntryOut])
def staff_rankings(
    limit: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
):
    return _rankings(db, limit)


@router.get("/staff/rankings/csv")
def staff_rankings_csv(
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
):
    entries = _rankings(db, limit)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Rank", "Candidate", "Email", "Average Score", "Completed Interviews", "Best Score", "Last Completed"])
    for e in entries:
        writer.writerow(
            [
                e.rank,
                e.full_name,
                e.email,
                e.average_score,
                e.completed_count,
                e.best_score if e.best_score is not None else "",
                e.last_completed.strftime("%Y-%m-%d %H:%M") if e.last_completed else "",
            ]
        )

    out = io.BytesIO(buffer.getvalue().encode("utf-8"))
    return StreamingResponse(
        out,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="candidate_rankings.csv"'},
    )


@router.get("/staff/skills", response_model=list[SkillAnalyticsOut])
def staff_skill_analytics(db: Session = Depends(get_db), _: CurrentUser = Depends(require_roles(*STAFF_ROLES))):
    rows = _completed_query(db).order_by(Interview.completed_at.asc()).all()
    return _skill_breakdown(rows)


@router.get("/staff/trend", response_model=list[TrendBucketOut])
def staff_trend(
    weeks: int = Query(default=8, ge=1, le=52),
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
):
    """Platform-wide average score, bucketed by week, for the last
    `weeks` weeks — the org-wide counterpart to GET /me/trend."""
    since = datetime.now(timezone.utc) - timedelta(weeks=weeks)
    rows = (
        db.query(Interview)
        .filter(Interview.status == "completed", Interview.score.isnot(None), Interview.completed_at >= since)
        .order_by(Interview.completed_at.asc())
        .all()
    )

    buckets: dict[str, list[int]] = {}
    for r in rows:
        completed = r.completed_at
        if completed is None:
            continue
        week_start = (completed - timedelta(days=completed.weekday())).date().isoformat()
        buckets.setdefault(week_start, []).append(r.score)

    return [
        TrendBucketOut(period=period, average_score=round(sum(scores) / len(scores)), count=len(scores))
        for period, scores in sorted(buckets.items())
    ]


def _get_latest_resume_snapshot(db: Session, candidate_id: int) -> Optional[ResumeSnapshotOut]:
    """Read-only reflection of the latest row in Node/Module 2's
    `resumes` table. Not modeled in SQLAlchemy here (Node owns that
    table) — mirrors the raw-SQL read pattern already used in
    app/platform_settings.py for tables this service only reads."""
    try:
        row = db.execute(
            text(
                "SELECT id, skills, experience_years, ats_score, summary, created_at "
                "FROM resumes WHERE candidate_id = :cid ORDER BY created_at DESC LIMIT 1"
            ),
            {"cid": candidate_id},
        ).first()
    except Exception:
        return None
    if row is None:
        return None
    skills = row.skills if isinstance(row.skills, list) else []
    return ResumeSnapshotOut(
        resume_id=row.id,
        skills=skills,
        experience_years=float(row.experience_years) if row.experience_years is not None else None,
        ats_score=row.ats_score,
        summary=row.summary,
        uploaded_at=row.created_at,
    )


# =================================================================
# Staff — candidate profiles & reports, candidate comparison,
# shortlisting insights (recruiter-facing, staff-authorized)
# =================================================================
@router.get("/staff/candidates/{candidate_id}/profile", response_model=CandidateProfileOut)
def staff_candidate_profile(
    candidate_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
):
    """Module 10 — recruiter 'Candidate profiles & reports': one place
    combining identity, resume snapshot, score summary, skill
    breakdown, weak areas and recent interviews for a single candidate."""
    candidate = db.get(User, candidate_id)
    if candidate is None or candidate.role != "candidate":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")

    rows = _completed_query(db, candidate_id).order_by(Interview.completed_at.desc()).all()
    scores = [r.score for r in rows if r.score is not None]

    return CandidateProfileOut(
        candidate_id=candidate.id,
        full_name=candidate.full_name,
        email=candidate.email,
        bio=candidate.bio,
        completed_count=len(rows),
        average_score=round(sum(scores) / len(scores)) if scores else 0,
        best_score=max(scores) if scores else 0,
        resume=_get_latest_resume_snapshot(db, candidate_id),
        skills=_skill_breakdown(rows),
        weak_areas=_weak_areas(rows, top=2),
        recent_interviews=[
            BreakdownEntryOut(
                interview_id=r.id,
                interview_type=r.interview_type,
                date=r.completed_at,
                score=r.score,
                rating_label=r.rating_label,
                communication=r.skill_communication,
                confidence=r.skill_confidence,
                technical=r.skill_technical,
                professionalism=r.skill_professionalism,
            )
            for r in rows[:10]
        ],
    )


@router.get("/staff/compare", response_model=list[CandidateComparisonEntryOut])
def staff_compare_candidates(
    candidate_ids: str = Query(..., description="Comma-separated candidate ids, e.g. 3,7,12 (2-10 ids)"),
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
):
    """Module 10 — recruiter 'Candidate comparison': side-by-side
    average score and skill breakdown for a hand-picked set of
    candidates."""
    try:
        ids = [int(x) for x in candidate_ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "candidate_ids must be a comma-separated list of integers")
    ids = list(dict.fromkeys(ids))  # de-dupe, keep order
    if not (2 <= len(ids) <= 10):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Provide between 2 and 10 candidate_ids to compare")

    users_by_id = {u.id: u for u in db.query(User).filter(User.id.in_(ids)).all()}
    entries = []
    for cid in ids:
        u = users_by_id.get(cid)
        if u is None:
            continue
        rows = _completed_query(db, cid).all()
        scores = [r.score for r in rows if r.score is not None]
        skill_breakdown = {b.skill: b.average for b in _skill_breakdown(rows)}
        entries.append(
            CandidateComparisonEntryOut(
                candidate_id=cid,
                full_name=u.full_name,
                email=u.email,
                completed_count=len(rows),
                average_score=round(sum(scores) / len(scores)) if scores else 0,
                best_score=max(scores) if scores else None,
                skills=skill_breakdown,
            )
        )
    return entries


@router.get("/staff/shortlist", response_model=list[ShortlistEntryOut])
def staff_shortlist(
    min_score: int = Query(default=75, ge=0, le=100),
    min_completed: int = Query(default=1, ge=1),
    domain: Optional[str] = Query(default=None, description="Optional filter: only consider interviews matching this type/domain"),
    limit: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
):
    """Module 10 — recruiter 'Shortlisting insights': candidates who
    clear a score bar (and, optionally, have practiced a given
    domain/role), ranked by average score, each with a one-line
    rationale built from their strongest/weakest scored category."""
    q = _completed_query(db)
    if domain:
        q = q.filter(or_(Interview.interview_type.ilike(f"%{domain}%"), Interview.domain.ilike(f"%{domain}%")))

    rows_by_candidate: dict[int, list[Interview]] = {}
    for r in q.all():
        rows_by_candidate.setdefault(r.candidate_id, []).append(r)

    candidate_ids = list(rows_by_candidate.keys())
    users_by_id = {u.id: u for u in db.query(User).filter(User.id.in_(candidate_ids)).all()} if candidate_ids else {}

    entries = []
    for cid, rows in rows_by_candidate.items():
        if len(rows) < min_completed:
            continue
        scores = [r.score for r in rows if r.score is not None]
        avg = round(sum(scores) / len(scores)) if scores else 0
        if avg < min_score:
            continue
        u = users_by_id.get(cid)
        if u is None:
            continue

        breakdown = [b for b in _skill_breakdown(rows) if b.sample_size > 0]
        strongest = max(breakdown, key=lambda b: b.average) if breakdown else None
        weakest = min(breakdown, key=lambda b: b.average) if breakdown else None
        insight = (
            f"Averages {avg}% across {len(rows)} interview(s)"
            + (f", strongest in {strongest.label}" if strongest else "")
            + (f", room to grow in {weakest.label}" if weakest and (not strongest or weakest.skill != strongest.skill) else "")
            + "."
        )

        entries.append(
            ShortlistEntryOut(
                candidate_id=cid,
                full_name=u.full_name,
                email=u.email,
                completed_count=len(rows),
                average_score=avg,
                strongest_skill=strongest.label if strongest else None,
                weakest_skill=weakest.label if weakest else None,
                insight=insight,
            )
        )

    entries.sort(key=lambda e: e.average_score, reverse=True)
    return entries[:limit]
