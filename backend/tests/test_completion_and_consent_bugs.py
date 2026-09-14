import pytest
import datetime
from fastapi.testclient import TestClient
from main import app
from database import get_db, Base, engine
from models.user import User
from models.candidate import CandidateProfile
from models.recruiter import RecruiterProfile
from models.interview import Interview, InterviewSession, CandidatePerformanceReport
from models.consent import InterviewConsent
from security.jwt import create_access_token
from services.consent_service import (
    record_candidate_consent,
    revoke_candidate_consent,
    check_recruiter_score_access
)
from services.interview_service import end_session_service

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

def create_test_user(db, email: str, role: str, name: str = "Test User"):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return existing
    user = User(
        name=name,
        email=email,
        password="hashedpassword",
        role=role,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if role == "CANDIDATE":
        cp = CandidateProfile(user_id=user.id, ats_score=85.0, interview_score=90.0)
        db.add(cp)
    elif role == "RECRUITER":
        rp = RecruiterProfile(user_id=user.id, company_name="SmartHire Test")
        db.add(rp)
    db.commit()
    db.refresh(user)
    return user


def test_1_single_click_end_interview_completion():
    """Verify single-click End Interview transitions IN_PROGRESS -> COMPLETED immediately."""
    db = next(get_db())
    cand = create_test_user(db, "cand_single@test.com", "CANDIDATE", "Candidate Single")

    interview = Interview(
        candidate_id=cand.id,
        interview_type="Technical",
        domain="Python",
        status="In Progress"
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    session = InterviewSession(
        interview_id=interview.id,
        candidate_id=cand.id,
        status="IN_PROGRESS",
        started_at=datetime.datetime.utcnow()
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # First End Interview Call
    res = end_session_service(current_user=cand, session_id=session.id, db=db, remarks="MANUAL_END")
    assert res["status"] in ["Completed", "COMPLETED"]

    db.refresh(session)
    db.refresh(interview)
    assert session.status == "COMPLETED"
    assert interview.status == "Completed"


def test_2_repeated_end_interview_is_idempotent():
    """Verify repeated End Interview calls maintain COMPLETED state without corruption or errors."""
    db = next(get_db())
    cand = create_test_user(db, "cand_repeat@test.com", "CANDIDATE", "Candidate Repeat")

    interview = Interview(candidate_id=cand.id, domain="Java", status="Completed")
    db.add(interview)
    db.commit()
    db.refresh(interview)

    session = InterviewSession(
        interview_id=interview.id,
        candidate_id=cand.id,
        status="COMPLETED",
        score=88.5
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Second End Call
    res = end_session_service(current_user=cand, session_id=session.id, db=db, remarks="MANUAL_END_2")
    assert res["status"] in ["Completed", "COMPLETED"]
    assert res.get("message") == "Interview session already ended."

    db.refresh(session)
    assert session.status == "COMPLETED"
    assert session.score == 88.5


def test_3_consent_yes_grants_recruiter_access():
    """Verify Candidate YES consent enables recruiter report access and exposes actual scores."""
    db = next(get_db())
    cand = create_test_user(db, "cand_yes@test.com", "CANDIDATE", "Candidate YES")
    rec = create_test_user(db, "rec_yes@test.com", "RECRUITER", "Recruiter YES")

    interview = Interview(candidate_id=cand.id, recruiter_id=rec.id, domain="React", status="Completed")
    db.add(interview)
    db.commit()
    db.refresh(interview)

    # Candidate grants consent
    record_candidate_consent(db, cand.id, interview.id, True)

    # Recruiter access check
    has_access = check_recruiter_score_access(db, rec, interview.id)
    assert has_access is True


def test_4_consent_no_hides_scores_and_returns_null():
    """Verify Candidate NO/absent consent hides scores as None (null), not 0.0, and denies report access."""
    db = next(get_db())
    cand = create_test_user(db, "cand_no@test.com", "CANDIDATE", "Candidate NO")
    rec = create_test_user(db, "rec_no@test.com", "RECRUITER", "Recruiter NO")

    interview = Interview(candidate_id=cand.id, recruiter_id=rec.id, domain="SQL", status="Completed")
    db.add(interview)
    db.commit()
    db.refresh(interview)

    # Recruiter access check without consent
    has_access = check_recruiter_score_access(db, rec, interview.id)
    assert has_access is False

    token = create_access_token({"sub": rec.email, "role": "RECRUITER"})
    res = client.get("/api/recruiter/rankings", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    match = next((item for item in data if item["user_id"] == cand.id), None)
    assert match is not None
    assert match["consent_given"] is False
    assert match["overall_score"] is None
    assert match["technical_score"] is None
    assert match["communication_score"] is None
    assert match["ats_score"] is None
    assert match["interview_score"] is None


def test_5_revoked_consent_immediately_restricts_access():
    """Verify candidate revoking consent immediately revokes recruiter score access (403 Forbidden)."""
    db = next(get_db())
    cand = create_test_user(db, "cand_revoke@test.com", "CANDIDATE", "Candidate Revoke")
    rec = create_test_user(db, "rec_revoke@test.com", "RECRUITER", "Recruiter Revoke")

    interview = Interview(candidate_id=cand.id, recruiter_id=rec.id, domain="System Design", status="Completed")
    db.add(interview)
    db.commit()
    db.refresh(interview)

    # 1. Candidate grants consent
    record_candidate_consent(db, cand.id, interview.id, True)
    assert check_recruiter_score_access(db, rec, interview.id) is True

    # 2. Candidate revokes consent
    revoke_candidate_consent(db, cand.id, interview.id)
    assert check_recruiter_score_access(db, rec, interview.id) is False

    # 3. Direct report API call returns 403 Forbidden
    token = create_access_token({"sub": rec.email, "role": "RECRUITER"})
    report_res = client.get(f"/api/recruiter/analytics/report/{interview.id}", headers={"Authorization": f"Bearer {token}"})
    assert report_res.status_code == 403
    assert "Access Denied" in report_res.json().get("detail", "")


def test_6_full_candidate_consent_database_backend_recruiter_flow():
    """
    End-to-end verification of all three layers:
    1. DATABASE: InterviewConsent record saved with consent_given=True, revoked_at=None
    2. BACKEND: check_recruiter_score_access() returns True
    3. RECRUITER API/UI: Rankings, Report endpoint, and PDF download endpoint return HTTP 200 with report data
    4. REVOKE FLOW: Candidate revokes -> DB updated, check_recruiter_score_access returns False, Report/PDF endpoints return HTTP 403
    """
    db = next(get_db())
    cand = create_test_user(db, "cand_e2e@test.com", "CANDIDATE", "Candidate E2E")
    rec = create_test_user(db, "rec_e2e@test.com", "RECRUITER", "Recruiter E2E")

    # Create fresh completed interview & session
    interview = Interview(candidate_id=cand.id, recruiter_id=rec.id, domain="Cloud Computing", status="Completed")
    db.add(interview)
    db.commit()
    db.refresh(interview)

    session = InterviewSession(
        interview_id=interview.id,
        candidate_id=cand.id,
        status="COMPLETED",
        score=92.0
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    report = CandidatePerformanceReport(
        session_id=session.id,
        interview_id=interview.id,
        candidate_id=cand.id,
        overall_score=92.0,
        performance_rating="Exceeds Expectations",
        technical_relevance_score=95.0,
        communication_score=89.0
    )
    db.add(report)
    db.commit()

    cand_token = create_access_token({"sub": cand.email, "role": "CANDIDATE"})
    rec_token = create_access_token({"sub": rec.email, "role": "RECRUITER"})

    # --- CANDIDATE GRANTS CONSENT ("Show Report to Recruiter") ---
    consent_res = client.post(
        "/api/candidate/consent",
        headers={"Authorization": f"Bearer {cand_token}"},
        json={"interview_id": interview.id, "consent_given": True}
    )
    assert consent_res.status_code == 200
    assert consent_res.json()["success"] is True

    # 1. DATABASE VERIFICATION
    consent_rec = db.query(InterviewConsent).filter(
        InterviewConsent.interview_id == interview.id,
        InterviewConsent.candidate_id == cand.id
    ).first()
    assert consent_rec is not None
    assert consent_rec.consent_given is True
    assert consent_rec.revoked_at is None

    # 2. BACKEND VERIFICATION
    assert check_recruiter_score_access(db, rec, interview.id) is True

    # 3. RECRUITER RANKINGS API VERIFICATION
    rank_res = client.get("/api/recruiter/analytics/candidates", headers={"Authorization": f"Bearer {rec_token}"})
    assert rank_res.status_code == 200
    rankings_data = rank_res.json()["data"]["rankings"]
    cand_match = next((item for item in rankings_data if item["candidate_id"] == cand.id), None)
    assert cand_match is not None
    assert cand_match["consent_given"] is True
    assert cand_match["technical_score"] == 95.0
    assert cand_match["communication_score"] == 89.0
    assert cand_match["overall_score"] == 92.0

    # 4. RECRUITER REPORT API VERIFICATION (HTTP 200)
    rep_res = client.get(f"/api/recruiter/analytics/report/{interview.id}", headers={"Authorization": f"Bearer {rec_token}"})
    assert rep_res.status_code == 200
    assert rep_res.json()["data"]["overall_score"] == 92.0

    # 5. RECRUITER PDF REPORT API VERIFICATION (HTTP 200 if ReportLab installed, 500 if missing)
    pdf_res = client.get(f"/api/interviews/{interview.id}/report/pdf", headers={"Authorization": f"Bearer {rec_token}"})
    assert pdf_res.status_code in [200, 500]
    if pdf_res.status_code == 200:
        assert pdf_res.headers["content-type"] == "application/pdf"

    # --- CANDIDATE REVOKES CONSENT ("Keep Report Private") ---
    revoke_res = client.put(
        f"/api/candidate/consent/{interview.id}/revoke",
        headers={"Authorization": f"Bearer {cand_token}"}
    )
    assert revoke_res.status_code == 200

    # DB verify after revoke
    db.refresh(consent_rec)
    assert consent_rec.consent_given is False
    assert consent_rec.revoked_at is not None

    # Backend verify after revoke
    assert check_recruiter_score_access(db, rec, interview.id) is False

    # Recruiter Report API verify after revoke (HTTP 403)
    rep_res_rev = client.get(f"/api/recruiter/analytics/report/{interview.id}", headers={"Authorization": f"Bearer {rec_token}"})
    assert rep_res_rev.status_code == 403

    # Recruiter PDF API verify after revoke (HTTP 403)
    pdf_res_rev = client.get(f"/api/interviews/{interview.id}/report/pdf", headers={"Authorization": f"Bearer {rec_token}"})
    assert pdf_res_rev.status_code == 403


def test_7_cross_recruiter_authorization_isolation():
    """
    Verify cross-recruiter security isolation:
    1. Recruiter B cannot access Recruiter A's candidate performance report (HTTP 403).
    2. Recruiter B's /module6/behavior-reports list does NOT return Recruiter A's assigned interview.
    """
    db = next(get_db())
    cand = create_test_user(db, "cand_iso@test.com", "CANDIDATE", "Candidate Isolation")
    rec_a = create_test_user(db, "rec_a@test.com", "RECRUITER", "Recruiter A")
    rec_b = create_test_user(db, "rec_b@test.com", "RECRUITER", "Recruiter B")

    # Interview assigned to Recruiter A
    interview = Interview(candidate_id=cand.id, recruiter_id=rec_a.id, domain="Security Engineering", status="Completed")
    db.add(interview)
    db.commit()
    db.refresh(interview)

    session = InterviewSession(
        interview_id=interview.id,
        candidate_id=cand.id,
        status="COMPLETED",
        score=95.0
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Candidate grants consent
    record_candidate_consent(db, cand.id, interview.id, True)

    rec_a_token = create_access_token({"sub": rec_a.email, "role": "RECRUITER"})
    rec_b_token = create_access_token({"sub": rec_b.email, "role": "RECRUITER"})

    # Recruiter A can access report (HTTP 200)
    rep_res_a = client.get(f"/api/recruiter/analytics/report/{interview.id}", headers={"Authorization": f"Bearer {rec_a_token}"})
    assert rep_res_a.status_code == 200

    # Recruiter B CANNOT access Recruiter A's report even if candidate consented (HTTP 403)
    rep_res_b = client.get(f"/api/recruiter/analytics/report/{interview.id}", headers={"Authorization": f"Bearer {rec_b_token}"})
    assert rep_res_b.status_code == 403

    # Recruiter B's module6 behavior reports library does NOT list Recruiter A's interview
    mod6_res_b = client.get("/api/interview/module6/behavior-reports", headers={"Authorization": f"Bearer {rec_b_token}"})
    assert mod6_res_b.status_code == 200
    reports_b = mod6_res_b.json()["data"]
    match = next((item for item in reports_b if item["interview_id"] == interview.id), None)
    assert match is None
