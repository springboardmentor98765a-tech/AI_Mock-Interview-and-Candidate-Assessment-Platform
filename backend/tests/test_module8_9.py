import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from database import Base, engine, SessionLocal
from models.user import User
from models.interview import Interview, InterviewSession, CandidatePerformanceReport, InterviewBehaviorAnalysis
from models.consent import InterviewConsent
from models.notification import Notification
from security.password import hash_password

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Create test candidate
    cand = db.query(User).filter(User.email == "test_cand_m89@smarthire.ai").first()
    if not cand:
        cand = User(
            name="Test Candidate M89",
            email="test_cand_m89@smarthire.ai",
            password=hash_password("Password123!"),
            role="CANDIDATE",
            provider="LOCAL"
        )
        db.add(cand)
        db.commit()
        db.refresh(cand)

    # Create test recruiter
    rec = db.query(User).filter(User.email == "test_rec_m89@smarthire.ai").first()
    if not rec:
        rec = User(
            name="Test Recruiter M89",
            email="test_rec_m89@smarthire.ai",
            password=hash_password("Password123!"),
            role="RECRUITER",
            provider="LOCAL"
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)

    # Create test interview with 5 minute duration
    int_obj = Interview(
        recruiter_id=rec.id,
        candidate_id=cand.id,
        domain="Java Developer",
        interview_type="Technical",
        difficulty="Medium",
        duration_mins=5,
        status="Completed"
    )
    db.add(int_obj)
    db.commit()
    db.refresh(int_obj)

    # Create test session
    now = datetime.utcnow()
    sess = InterviewSession(
        interview_id=int_obj.id,
        candidate_id=cand.id,
        status="COMPLETED",
        started_at=now - timedelta(minutes=4),
        ended_at=now,
        duration=240,
        score=82.0
    )
    db.add(sess)
    db.commit()
    db.refresh(sess)

    # Create performance report
    rep = CandidatePerformanceReport(
        session_id=sess.id,
        interview_id=int_obj.id,
        candidate_id=cand.id,
        overall_score=82.0,
        performance_rating="Good",
        communication_score=76.0,
        confidence_score=79.0,
        technical_relevance_score=85.0,
        professionalism_score=88.0
    )
    db.add(rep)

    # Create notification
    notif = Notification(
        user_id=cand.id,
        type="REPORT_READY",
        title="Test Report Ready",
        message="Your report is ready",
        interview_id=int_obj.id
    )
    db.add(notif)
    db.commit()

    yield {"candidate": cand, "recruiter": rec, "interview": int_obj, "session": sess, "report": rep}

    # Cleanup
    db.close()


def get_auth_token(email, password="Password123!"):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    if response.status_code == 200:
        return response.json().get("access_token")
    return None


def test_candidate_analytics_endpoints(setup_db):
    cand = setup_db["candidate"]
    token = get_auth_token(cand.email)
    headers = {"Authorization": f"Bearer {token}"}

    # Test Dashboard Analytics
    res = client.get("/api/candidate/analytics/dashboard", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["has_data"] is True
    assert data["completed_interviews"] >= 1
    assert data["overall_performance"] == 82.0

    # Test History
    res = client.get("/api/candidate/analytics/history", headers=headers)
    assert res.status_code == 200
    history = res.json()["data"]
    assert len(history) >= 1
    assert history[0]["role"] == "Java Developer"

    # Test Skills
    res = client.get("/api/candidate/analytics/skills", headers=headers)
    assert res.status_code == 200
    assert "data_available" in res.json()["data"]

    # Test Weak Areas
    res = client.get("/api/candidate/analytics/weak-areas", headers=headers)
    assert res.status_code == 200

    # Test Trends
    res = client.get("/api/candidate/analytics/trends", headers=headers)
    assert res.status_code == 200


def test_consent_and_security_enforcement(setup_db):
    cand = setup_db["candidate"]
    rec = setup_db["recruiter"]
    interview = setup_db["interview"]

    cand_token = get_auth_token(cand.email)
    rec_token = get_auth_token(rec.email)

    cand_headers = {"Authorization": f"Bearer {cand_token}"}
    rec_headers = {"Authorization": f"Bearer {rec_token}"}

    # 1. Recruiter attempts to access report BEFORE consent is given -> Expected 403 Forbidden
    res_denied = client.get(f"/api/recruiter/analytics/report/{interview.id}", headers=rec_headers)
    assert res_denied.status_code == 403

    # 2. Candidate grants consent (YES)
    res_consent = client.post(
        "/api/candidate/consent",
        json={"interview_id": interview.id, "consent_given": True},
        headers=cand_headers
    )
    assert res_consent.status_code == 200
    assert res_consent.json()["data"]["consent_given"] is True

    # 3. Recruiter accesses report AFTER consent -> Expected 200 OK
    res_allowed = client.get(f"/api/recruiter/analytics/report/{interview.id}", headers=rec_headers)
    assert res_allowed.status_code == 200
    assert res_allowed.json()["data"]["overall_score"] == 82.0

    # 4. Candidate REVOKES consent
    res_revoke = client.put(f"/api/candidate/consent/{interview.id}/revoke", headers=cand_headers)
    assert res_revoke.status_code == 200

    # 5. Recruiter attempts report access AFTER revocation -> Expected 403 Forbidden
    res_revoked_denied = client.get(f"/api/recruiter/analytics/report/{interview.id}", headers=rec_headers)
    assert res_revoked_denied.status_code == 403


def test_notifications_api(setup_db):
    cand = setup_db["candidate"]
    token = get_auth_token(cand.email)
    headers = {"Authorization": f"Bearer {token}"}

    # Get notifications
    res = client.get("/api/notifications", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "data" in data
    assert len(data["data"]) >= 1

    notif_id = data["data"][0]["id"]

    # Mark single read
    res_read = client.put(f"/api/notifications/{notif_id}/read", headers=headers)
    assert res_read.status_code == 200

    # Mark all read
    res_all = client.put("/api/notifications/read-all", headers=headers)
    assert res_all.status_code == 200


def test_duration_synchronization(setup_db):
    cand = setup_db["candidate"]
    interview = setup_db["interview"]
    token = get_auth_token(cand.email)
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch active/session details for assigned 5-minute interview
    res = client.get(f"/api/interviews/{interview.id}/performance-report", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["interview_id"] == interview.id
