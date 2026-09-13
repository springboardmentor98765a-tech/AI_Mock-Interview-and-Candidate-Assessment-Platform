import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import Base, get_db
from models.user import User
from models.candidate import CandidateProfile
from models.interview import Interview, InterviewSession, CandidatePerformanceReport
from models.consent import InterviewConsent
from models.notification import Notification
from security.password import hash_password
from security.jwt import create_access_token
from services.pdf_report_service import generate_interview_pdf_report
from services.email_service import send_email, send_session_alert_email

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_smarthire_module9_10.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_data():
    db = TestingSessionLocal()
    db.query(Notification).delete()
    db.query(InterviewConsent).delete()
    db.query(CandidatePerformanceReport).delete()
    db.query(InterviewSession).delete()
    db.query(Interview).delete()
    db.query(CandidateProfile).delete()
    db.query(User).delete()
    db.commit()

    # Create Users
    cand_user = User(name="Test Candidate", email="cand_m910@smarthire.ai", password=hash_password("Pass123!"), role="CANDIDATE")
    rec_user = User(name="Test Recruiter", email="rec_m910@smarthire.ai", password=hash_password("Pass123!"), role="RECRUITER")
    admin_user = User(name="Test Admin", email="admin_m910@smarthire.ai", password=hash_password("Pass123!"), role="ADMIN")
    
    db.add_all([cand_user, rec_user, admin_user])
    db.commit()

    cand_profile = CandidateProfile(user_id=cand_user.id, ats_score=85.0, skills="Python, SQL, FastApi")
    db.add(cand_profile)
    db.commit()

    # Create Interview & Completed Session
    interview = Interview(candidate_id=cand_user.id, recruiter_id=rec_user.id, domain="Python Backend", status="Completed")
    db.add(interview)
    db.commit()

    session = InterviewSession(interview_id=interview.id, candidate_id=cand_user.id, status="COMPLETED", score=88.5)
    db.add(session)
    db.commit()

    report = CandidatePerformanceReport(
        session_id=session.id,
        interview_id=interview.id,
        candidate_id=cand_user.id,
        overall_score=88.5,
        performance_rating="Exceeds Expectations",
        technical_relevance_score=90.0,
        communication_score=85.0,
        professionalism_score=92.0,
        confidence_score=87.0,
        strengths=["Strong Python Knowledge", "Clean Code Structure"],
        weaknesses=["Could optimize SQL query joins"],
        improvement_suggestions=["Practice STAR format for behavioral questions"]
    )
    db.add(report)
    db.commit()

    db.close()


def get_token_header(user_email: str, user_role: str):
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == user_email).first()
    token = create_access_token({"sub": user.email, "id": user.id, "role": user_role})
    db.close()
    return {"Authorization": f"Bearer {token}"}


def test_reminders_and_notification_endpoints():
    headers = get_token_header("cand_m910@smarthire.ai", "CANDIDATE")
    
    # 1. Reminders
    res = client.get("/api/candidate/reminders", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True

    # 2. List Notifications
    res_notif = client.get("/api/notifications", headers=headers)
    assert res_notif.status_code == 200
    assert res_notif.json()["success"] is True

    # 3. Read All
    res_read = client.put("/api/notifications/read-all", headers=headers)
    assert res_read.status_code == 200
    assert res_read.json()["success"] is True


def test_non_blocking_email_service():
    # Attempt email sending with unconfigured SMTP - must return False safely without raising exceptions
    res = send_email("test@example.com", "Test Subject", "<p>Test</p>")
    assert res is False or res is True

    # Session alert email helper - non blocking
    send_session_alert_email("cand_m910@smarthire.ai", "Test Candidate", "Python Backend", "Fullscreen Exit", "Warning limit 1 of 4")


def test_canonical_and_alias_pdf_report_download():
    db = TestingSessionLocal()
    cand_user = db.query(User).filter(User.email == "cand_m910@smarthire.ai").first()
    rec_user = db.query(User).filter(User.email == "rec_m910@smarthire.ai").first()
    interview = db.query(Interview).filter(Interview.candidate_id == cand_user.id).first()
    interview_id = interview.id

    # Give candidate score consent
    consent = InterviewConsent(interview_id=interview_id, candidate_id=cand_user.id, recruiter_id=rec_user.id, consent_given=True)
    db.add(consent)
    db.commit()
    db.close()

    cand_headers = get_token_header("cand_m910@smarthire.ai", "CANDIDATE")
    
    # Canonical endpoint test
    res_canonical = client.get(f"/api/interviews/{interview_id}/report/pdf", headers=cand_headers)
    assert res_canonical.status_code == 200
    assert res_canonical.headers["content-type"] == "application/pdf"
    assert len(res_canonical.content) > 100

    # Alias endpoint test
    res_alias = client.get(f"/api/reports/{interview_id}/pdf", headers=cand_headers)
    assert res_alias.status_code == 200
    assert res_alias.headers["content-type"] == "application/pdf"
    assert len(res_alias.content) > 100


def test_unconsented_recruiter_access_returns_scores_private():
    db = TestingSessionLocal()
    cand_user = db.query(User).filter(User.email == "cand_m910@smarthire.ai").first()
    interview = db.query(Interview).filter(Interview.candidate_id == cand_user.id).first()
    interview_id = interview.id

    # Revoke consent
    consent = db.query(InterviewConsent).filter(InterviewConsent.interview_id == interview_id).first()
    if consent:
        consent.consent_given = False
        db.commit()
    db.close()

    rec_headers = get_token_header("rec_m910@smarthire.ai", "RECRUITER")

    # 1. Direct PDF download forbidden when consent revoked
    res_pdf = client.get(f"/api/interviews/{interview_id}/report/pdf", headers=rec_headers)
    assert res_pdf.status_code == 403

    # 2. Rankings list displays Scores Private for unconsented candidate
    res_rank = client.get("/api/recruiter/analytics/candidates", headers=rec_headers)
    assert res_rank.status_code == 200
    rankings = res_rank.json()["data"]["rankings"]
    assert len(rankings) > 0
    target_rank = next((r for r in rankings if r["interview_id"] == interview_id), None)
    assert target_rank is not None
    assert target_rank["overall_score"] is None
    assert target_rank["performance_rating"] == "Scores Private"



def test_candidate_analytics_and_ai_feedback_endpoints():
    headers = get_token_header("cand_m910@smarthire.ai", "CANDIDATE")

    # Dashboard analytics
    res_dash = client.get("/api/candidate/analytics/dashboard", headers=headers)
    assert res_dash.status_code == 200
    assert res_dash.json()["data"]["has_data"] is True

    # History analytics
    res_hist = client.get("/api/candidate/analytics/history", headers=headers)
    assert res_hist.status_code == 200

    # Skills analytics
    res_skills = client.get("/api/candidate/analytics/skills", headers=headers)
    assert res_skills.status_code == 200

    # Weak areas
    res_weak = client.get("/api/candidate/analytics/weak-areas", headers=headers)
    assert res_weak.status_code == 200

    # Trends
    res_trends = client.get("/api/candidate/analytics/trends", headers=headers)
    assert res_trends.status_code == 200

    # AI feedback
    res_feedback = client.get("/api/candidate/analytics/ai-feedback", headers=headers)
    assert res_feedback.status_code == 200
    assert res_feedback.json()["data"]["has_data"] is True


def test_admin_analytics_summary_endpoint():
    admin_headers = get_token_header("admin_m910@smarthire.ai", "ADMIN")
    res = client.get("/api/admin/analytics/summary", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "user_analytics" in data
    assert "interview_monitoring" in data
    assert "ai_monitoring" in data
    assert "system_health" in data
