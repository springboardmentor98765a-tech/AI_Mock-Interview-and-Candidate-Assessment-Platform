import pytest
from fastapi.testclient import TestClient
from main import app
from database import get_db, Base, engine
from models.user import User
from models.interview import Interview, InterviewSession, CandidatePerformanceReport
from models.consent import InterviewConsent
from security.jwt import create_access_token
from services.interview_service import generate_and_save_candidate_performance_report

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield

def create_user(db, email, role, name):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return existing
    u = User(email=email, password="hashed_pw", role=role, name=name, is_active=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

def test_candidate_report_listing_and_auto_generation():
    db = next(get_db())

    cand = create_user(db, "cand_report@example.com", "CANDIDATE", "Report Candidate")
    rec = create_user(db, "rec_report@example.com", "RECRUITER", "Report Recruiter")

    interview = Interview(
        candidate_id=cand.id,
        recruiter_id=rec.id,
        domain="System Architecture",
        interview_type="Technical",
        status="Completed",
        duration_mins=30
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    session = InterviewSession(
        interview_id=interview.id,
        candidate_id=cand.id,
        status="COMPLETED",
        total_active_seconds=900,
        answers_json=[{"q_id": 1, "answer": "Load balancing using NGINX and microservices architecture."}]
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # 1. Candidate History API call before report exists
    cand_token = create_access_token({"sub": cand.email, "user_id": cand.id, "role": cand.role})
    headers = {"Authorization": f"Bearer {cand_token}"}

    res = client.get("/api/candidate/analytics/history", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    history = data["data"]
    assert len(history) >= 1
    item = next(h for h in history if h["interview_id"] == interview.id)
    assert item["session_id"] == session.id
    assert item["report_available"] is True
    assert item["score_numeric"] is not None

    # 2. Check CandidatePerformanceReport row count in DB (must be exactly 1)
    reports = db.query(CandidatePerformanceReport).filter(CandidatePerformanceReport.session_id == session.id).all()
    assert len(reports) == 1

    # 3. Repeated candidate history call should reuse existing report without duplicate creation
    res2 = client.get("/api/candidate/analytics/history", headers=headers)
    assert res2.status_code == 200
    reports_after = db.query(CandidatePerformanceReport).filter(CandidatePerformanceReport.session_id == session.id).all()
    assert len(reports_after) == 1

    # 4. Candidate can fetch performance report regardless of consent (consent is private)
    res_perf = client.get(f"/api/interviews/{interview.id}/performance-report", headers=headers)
    assert res_perf.status_code == 200
    perf_data = res_perf.json()
    assert perf_data["success"] is True
    assert perf_data["data"]["interview_id"] == interview.id
    assert perf_data["data"]["overall_score"] is not None

    db.close()

def test_recruiter_report_access_and_consent_isolation():
    db = next(get_db())

    cand = create_user(db, "cand_consent@example.com", "CANDIDATE", "Consent Candidate")
    rec_owner = create_user(db, "rec_owner@example.com", "RECRUITER", "Owner Recruiter")
    rec_other = create_user(db, "rec_other@example.com", "RECRUITER", "Other Recruiter")

    interview = Interview(
        candidate_id=cand.id,
        recruiter_id=rec_owner.id,
        domain="DevOps",
        interview_type="Technical",
        status="Completed",
        duration_mins=30
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    session = InterviewSession(
        interview_id=interview.id,
        candidate_id=cand.id,
        status="ENDED",
        answers_json=[{"q_id": 1, "answer": "CI/CD pipelines with GitHub Actions."}]
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Generate report
    generate_and_save_candidate_performance_report(db, session)

    owner_token = create_access_token({"sub": rec_owner.email, "user_id": rec_owner.id, "role": rec_owner.role})
    other_token = create_access_token({"sub": rec_other.email, "user_id": rec_other.id, "role": rec_other.role})

    # Without consent: owner recruiter is denied access
    res_owner_no_consent = client.get(f"/api/interviews/{interview.id}/performance-report", headers={"Authorization": f"Bearer {owner_token}"})
    assert res_owner_no_consent.status_code == 403

    # Grant consent
    consent = InterviewConsent(
        interview_id=interview.id,
        candidate_id=cand.id,
        recruiter_id=rec_owner.id,
        consent_given=True
    )
    db.add(consent)
    db.commit()

    # With consent: owner recruiter gets access
    res_owner_consent = client.get(f"/api/interviews/{interview.id}/performance-report", headers={"Authorization": f"Bearer {owner_token}"})
    assert res_owner_consent.status_code == 200
    assert res_owner_consent.json()["data"]["overall_score"] is not None

    # Other recruiter (not owner) is denied access even with candidate consent
    res_other = client.get(f"/api/interviews/{interview.id}/performance-report", headers={"Authorization": f"Bearer {other_token}"})
    assert res_other.status_code == 403

    db.close()

def test_stale_in_progress_session_auto_finalization_and_precedence():
    import datetime
    db = next(get_db())

    cand = create_user(db, "cand_stale@example.com", "CANDIDATE", "Stale Candidate")
    rec = create_user(db, "rec_stale@example.com", "RECRUITER", "Stale Recruiter")

    interview = Interview(
        candidate_id=cand.id,
        recruiter_id=rec.id,
        domain="Cloud Architecture",
        interview_type="Technical",
        status="Completed",
        duration_mins=30
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    # Completed session created earlier
    completed_session = InterviewSession(
        interview_id=interview.id,
        candidate_id=cand.id,
        status="COMPLETED",
        total_active_seconds=1200,
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
        answers_json=[{"q_id": 1, "answer": "AWS Infrastructure as Code using Terraform."}]
    )
    db.add(completed_session)
    db.commit()

    # Stale abandoned in-progress session created later
    stale_session = InterviewSession(
        interview_id=interview.id,
        candidate_id=cand.id,
        status="IN_PROGRESS",
        started_at=datetime.datetime.utcnow() - datetime.timedelta(days=1),
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
    )
    db.add(stale_session)
    db.commit()

    cand_token = create_access_token({"sub": cand.email, "user_id": cand.id, "role": cand.role})
    headers = {"Authorization": f"Bearer {cand_token}"}

    # 1. Candidate History API should return completed status and prioritize completed session over stale in-progress session
    res_hist = client.get("/api/candidate/analytics/history", headers=headers)
    assert res_hist.status_code == 200
    hist_items = res_hist.json()["data"]
    match = next(h for h in hist_items if h["interview_id"] == interview.id)
    assert match["session_id"] == completed_session.id
    assert match["report_available"] is True

    # 2. Performance report API for interview_id should return completed report and not fail with 400
    res_perf = client.get(f"/api/interviews/{interview.id}/performance-report", headers=headers)
    assert res_perf.status_code == 200
    assert res_perf.json()["data"]["session_id"] == completed_session.id

    db.close()
