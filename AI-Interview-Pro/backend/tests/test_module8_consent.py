import os
from datetime import datetime

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("JWT_SECRET_KEY", "module8-test-secret")
os.environ.setdefault("SESSION_SECRET_KEY", "module8-test-session")
os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/aiip-module8-import.db")

from app.database import Base
from app.models import (
    AuthProviderEnum, DifficultyEnum, Interview, InterviewQuestion,
    InterviewStatusEnum, InterviewTypeEnum, RoleEnum, User,
)
from app.routes.module8_routes import (
    candidate_dashboard_analytics, recruiter_rankings, revoke_interview_share,
    share_interview, share_interview_with_multiple_recruiters, shared_interview_detail,
)
from app.schemas import InterviewShareBatchCreateRequest, InterviewShareCreateRequest


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


def user(name, email, role):
    return User(
        full_name=name, email=email, role=role, auth_provider=AuthProviderEnum.local,
        password_hash="test", is_active=True,
    )


def completed_interview(candidate, score=78.0):
    interview = Interview(
        user_id=candidate.id, interview_type=InterviewTypeEnum.technical,
        domain="Python", difficulty=DifficultyEnum.medium,
        status=InterviewStatusEnum.completed, created_at=datetime.utcnow(),
        completed_at=datetime.utcnow(), overall_score=score,
    )
    interview.questions.append(InterviewQuestion(
        question_text="Explain a Python generator.", category="python",
        difficulty=DifficultyEnum.medium, sequence_no=1,
        answer_text="It yields values lazily.", technical_score=80,
        communication_score=76, confidence_score=74, grammar_score=82,
        professionalism_score=79, overall_score=78,
    ))
    return interview


def seed(db):
    candidate = user("Candidate One", "candidate@example.com", RoleEnum.candidate)
    recruiter = user("Recruiter One", "recruiter@example.com", RoleEnum.recruiter)
    other = user("Recruiter Two", "other@example.com", RoleEnum.recruiter)
    db.add_all([candidate, recruiter, other])
    db.flush()
    interview = completed_interview(candidate)
    db.add(interview)
    db.commit()
    return candidate, recruiter, other, interview


def test_share_view_revoke_enforces_exact_recruiter(db):
    candidate, recruiter, other, interview = seed(db)
    share = share_interview(
        str(interview.id),
        InterviewShareCreateRequest(recruiter_id=recruiter.id, consent_acknowledged=True),
        candidate, db,
    )
    detail = shared_interview_detail(str(interview.id), recruiter, db)
    assert detail.interview.id == interview.id
    assert detail.candidate.id == candidate.id

    with pytest.raises(HTTPException) as denied:
        shared_interview_detail(str(interview.id), other, db)
    assert denied.value.status_code == 403

    revoke_interview_share(str(interview.id), str(share.id), candidate, db)
    with pytest.raises(HTTPException) as revoked:
        shared_interview_detail(str(interview.id), recruiter, db)
    assert revoked.value.status_code == 403


def test_incomplete_interview_cannot_be_shared(db):
    candidate, recruiter, _, interview = seed(db)
    interview.status = InterviewStatusEnum.in_progress
    db.commit()
    with pytest.raises(HTTPException) as error:
        share_interview(
            str(interview.id),
            InterviewShareCreateRequest(recruiter_id=recruiter.id, consent_acknowledged=True),
            candidate, db,
        )
    assert error.value.status_code == 400


def test_candidate_can_share_with_multiple_recruiters(db):
    candidate, recruiter, other, interview = seed(db)
    shares = share_interview_with_multiple_recruiters(
        str(interview.id),
        InterviewShareBatchCreateRequest(
            recruiter_ids=[recruiter.id, other.id], consent_acknowledged=True
        ),
        candidate,
        db,
    )
    assert {share.recruiter.id for share in shares} == {recruiter.id, other.id}
    assert shared_interview_detail(str(interview.id), recruiter, db).interview.id == interview.id
    assert shared_interview_detail(str(interview.id), other, db).interview.id == interview.id


def test_dashboard_uses_saved_scores_and_sample_threshold(db):
    candidate, _, _, interview = seed(db)
    second = completed_interview(candidate, score=88)
    second.questions[0].technical_score = 90
    second.questions[0].communication_score = 84
    db.add(second)
    db.commit()
    dashboard = candidate_dashboard_analytics(candidate, db)
    assert dashboard.completed_interviews == 2
    assert dashboard.average_score == 83.0
    assert dashboard.best_score == 88.0
    assert dashboard.growth_percent == 10.0
    assert dashboard.trend[0].overall_score == 78.0
    assert all(area.sample_size >= 2 for area in dashboard.weak_areas)


def test_ranking_contains_only_candidates_with_active_consent(db):
    candidate, recruiter, _, interview = seed(db)
    assert recruiter_rankings(recruiter, db) == []
    share_interview(
        str(interview.id),
        InterviewShareCreateRequest(recruiter_id=recruiter.id, consent_acknowledged=True),
        candidate, db,
    )
    rows = recruiter_rankings(recruiter, db)
    assert len(rows) == 1
    assert rows[0].candidate_id == candidate.id
    assert rows[0].rank == 1


def test_shared_resume_visible_updated_and_revoked(db):
    from app.routes.candidate_management_routes import candidate_leaderboard, candidate_profile
    candidate, recruiter, other, interview = seed(db)
    candidate.resume_file_name = "resume.pdf"
    candidate.resume_uploaded_at = datetime.utcnow()
    candidate.resume_skills = "Python,SQL"
    candidate.resume_summary = "Python developer"
    db.commit()
    assert candidate_leaderboard(recruiter, db) == []
    share = share_interview(
        str(interview.id),
        InterviewShareCreateRequest(recruiter_id=recruiter.id, consent_acknowledged=True),
        candidate, db,
    )
    rows = candidate_leaderboard(recruiter, db)
    assert rows[0].resume_score is not None
    assert rows[0].top_skills == ["Python", "SQL"]
    assert candidate_profile(str(candidate.id), recruiter, db).resume.resume_file_name == "resume.pdf"
    candidate.resume_skills = "Python,SQL,Java"
    db.commit()
    assert "Java" in candidate_leaderboard(recruiter, db)[0].top_skills
    assert candidate_leaderboard(other, db) == []
    with pytest.raises(HTTPException) as exc:
        candidate_profile(str(candidate.id), other, db)
    assert exc.value.status_code == 403
    revoke_interview_share(str(interview.id), str(share.id), candidate, db)
    assert candidate_leaderboard(recruiter, db) == []
    with pytest.raises(HTTPException) as exc:
        candidate_profile(str(candidate.id), recruiter, db)
    assert exc.value.status_code == 403
