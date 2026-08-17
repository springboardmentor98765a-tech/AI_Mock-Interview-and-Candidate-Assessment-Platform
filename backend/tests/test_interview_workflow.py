import os
import sys
import pytest
import io
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from main import app
from models.user import User
from models.candidate import CandidateProfile
from models.recruiter import RecruiterProfile
from models.interview import Interview, InterviewQuestion, InterviewSession, InterviewQuestionAttempt, InterviewRecording

from security.password import hash_password
from security.jwt import create_access_token

TEST_DB_URL = "sqlite:///./test_smarthire_workflow.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_workflow_test_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    admin = User(name="WF Admin", email="wf_admin@smarthire.ai", password=hash_password("Admin123!"), role="ADMIN")
    recruiter = User(name="WF Recruiter", email="wf_recruiter@smarthire.ai", password=hash_password("Pass123!"), role="RECRUITER")
    other_recruiter = User(name="Other Recruiter", email="other_recruiter@smarthire.ai", password=hash_password("Pass123!"), role="RECRUITER")
    candidate1 = User(name="WF Candidate 1", email="wf_cand1@smarthire.ai", password=hash_password("Pass123!"), role="CANDIDATE")
    candidate2 = User(name="WF Candidate 2", email="wf_cand2@smarthire.ai", password=hash_password("Pass123!"), role="CANDIDATE")

    db.add_all([admin, recruiter, other_recruiter, candidate1, candidate2])
    db.commit()

    # Create test interview for candidate 1 managed by recruiter
    interview = Interview(
        candidate_id=candidate1.id,
        recruiter_id=recruiter.id,
        interview_type="Technical",
        domain="Software Engineering",
        difficulty="Medium",
        duration_mins=30,
        status="Assigned"
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    # Add questions
    q1 = InterviewQuestion(interview_id=interview.id, question_text="What is FastAPI?", category="Technical", difficulty="Medium", sequence_no=1)
    q2 = InterviewQuestion(interview_id=interview.id, question_text="Explain Python GIL.", category="Technical", difficulty="Medium", sequence_no=2)
    db.add_all([q1, q2])
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_smarthire_workflow.db"):
        try:
            os.remove("./test_smarthire_workflow.db")
        except Exception:
            pass
    app.dependency_overrides.pop(get_db, None)



def get_headers(email: str, role: str, user_id: int):
    token = create_access_token({"sub": str(user_id), "email": email, "role": role})
    return {"Authorization": f"Bearer {token}"}


def test_session_lifecycle_and_state_machine():
    """Verify session creation, state machine transitions, and invalid transition 409 Conflict errors."""
    db = TestingSessionLocal()
    cand1 = db.query(User).filter(User.email == "wf_cand1@smarthire.ai").first()
    interview = db.query(Interview).filter(Interview.candidate_id == cand1.id).first()
    db.close()

    headers = get_headers(cand1.email, cand1.role, cand1.id)

    # 1. Create session -> status CREATED
    res = client.post("/api/interview/sessions", json={"interview_id": interview.id}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    session_id = data["session"]["id"]
    assert data["session"]["status"] == "CREATED"

    # 2. Duplicate session creation returns existing active session
    res_dup = client.post("/api/interview/sessions", json={"interview_id": interview.id}, headers=headers)
    assert res_dup.status_code == 200
    assert res_dup.json()["session"]["id"] == session_id

    # 3. Invalid transition: CREATED -> PAUSED (HTTP 409 Conflict)
    res_inv1 = client.post(f"/api/interview/sessions/{session_id}/pause", headers=headers)
    assert res_inv1.status_code == 409

    # 4. Valid transition: CREATED -> IN_PROGRESS
    res_start = client.post(f"/api/interview/sessions/{session_id}/start", headers=headers)
    assert res_start.status_code == 200
    assert res_start.json()["session"]["status"] == "IN_PROGRESS"

    # 5. Valid transition: IN_PROGRESS -> PAUSED
    res_pause = client.post(f"/api/interview/sessions/{session_id}/pause", headers=headers)
    assert res_pause.status_code == 200
    assert res_pause.json()["session"]["status"] == "PAUSED"

    # 6. Valid transition: PAUSED -> IN_PROGRESS
    res_resume = client.post(f"/api/interview/sessions/{session_id}/resume", headers=headers)
    assert res_resume.status_code == 200
    assert res_resume.json()["session"]["status"] == "IN_PROGRESS"

    # 7. Valid transition: IN_PROGRESS -> COMPLETED
    res_end = client.post(f"/api/interview/sessions/{session_id}/end", headers=headers)
    assert res_end.status_code == 200
    assert res_end.json()["session"]["status"] == "COMPLETED"

    # 8. Invalid transition: COMPLETED -> IN_PROGRESS (HTTP 409 Conflict)
    res_inv2 = client.post(f"/api/interview/sessions/{session_id}/start", headers=headers)
    assert res_inv2.status_code == 409

    # 9. Invalid transition: COMPLETED -> PAUSED (HTTP 409 Conflict)
    res_inv3 = client.post(f"/api/interview/sessions/{session_id}/pause", headers=headers)
    assert res_inv3.status_code == 409


def test_question_attempt_recording_and_non_duplication():
    """Verify question attempts persist active timing and prevent duplicate rows for same question."""
    db = TestingSessionLocal()
    cand1 = db.query(User).filter(User.email == "wf_cand1@smarthire.ai").first()
    interview = db.query(Interview).filter(Interview.candidate_id == cand1.id).first()
    q1 = interview.questions[0]
    db.close()

    headers = get_headers(cand1.email, cand1.role, cand1.id)

    # Get active session
    res_sess = client.get(f"/api/interview/sessions/interview/{interview.id}", headers=headers)
    session_id = res_sess.json()["session"]["id"]

    # Record first attempt for Q1
    res_att1 = client.post(
        f"/api/interview/sessions/{session_id}/attempt",
        json={
            "question_id": q1.id,
            "question_number": 1,
            "time_spent": 15.5,
            "attempted": True,
            "answer": "FastAPI is a modern web framework."
        },
        headers=headers
    )
    assert res_att1.status_code == 200
    att_data1 = res_att1.json()["attempt"]
    assert att_data1["answer"] == "FastAPI is a modern web framework."

    # Record second attempt for Q1 (update existing attempt, non-duplication)
    res_att2 = client.post(
        f"/api/interview/sessions/{session_id}/attempt",
        json={
            "question_id": q1.id,
            "question_number": 1,
            "time_spent": 30.0,
            "attempted": True,
            "answer": "Updated: FastAPI is built on Starlette and Pydantic."
        },
        headers=headers
    )
    assert res_att2.status_code == 200
    att_data2 = res_att2.json()["attempt"]
    assert att_data2["id"] == att_data1["id"]
    assert att_data2["answer"] == "Updated: FastAPI is built on Starlette and Pydantic."
    assert att_data2["time_spent"] == 30.0


def test_recording_upload_and_authorization_matrix():
    """Verify recording file upload validation, ownership check, and role-based access control."""
    db = TestingSessionLocal()
    admin = db.query(User).filter(User.email == "wf_admin@smarthire.ai").first()
    recruiter = db.query(User).filter(User.email == "wf_recruiter@smarthire.ai").first()
    other_rec = db.query(User).filter(User.email == "other_recruiter@smarthire.ai").first()
    cand1 = db.query(User).filter(User.email == "wf_cand1@smarthire.ai").first()
    cand2 = db.query(User).filter(User.email == "wf_cand2@smarthire.ai").first()
    interview = db.query(Interview).filter(Interview.candidate_id == cand1.id).first()
    db.close()

    cand1_headers = get_headers(cand1.email, cand1.role, cand1.id)
    cand2_headers = get_headers(cand2.email, cand2.role, cand2.id)
    rec_headers = get_headers(recruiter.email, recruiter.role, recruiter.id)
    other_rec_headers = get_headers(other_rec.email, other_rec.role, other_rec.id)
    admin_headers = get_headers(admin.email, admin.role, admin.id)

    # Get active session
    res_sess = client.get(f"/api/interview/sessions/interview/{interview.id}", headers=cand1_headers)
    session_id = res_sess.json()["session"]["id"]

    # 1. Candidate 2 attempts to upload recording to Candidate 1's session -> HTTP 403 Forbidden
    fake_video = b"RIFF....WEBMG%..."
    files = {"file": ("recording.webm", io.BytesIO(fake_video), "video/webm")}
    res_up_fail = client.post(
        f"/api/interview/sessions/{session_id}/recordings",
        files=files,
        data={"duration": 45.0},
        headers=cand2_headers
    )
    assert res_up_fail.status_code == 403

    # 2. Candidate 1 (owner) uploads recording -> HTTP 200 OK
    files_ok = {"file": ("candidate_1_rec.webm", io.BytesIO(fake_video), "video/webm")}
    res_up_ok = client.post(
        f"/api/interview/sessions/{session_id}/recordings",
        files=files_ok,
        data={"duration": 45.0},
        headers=cand1_headers
    )
    assert res_up_ok.status_code == 200
    rec_id = res_up_ok.json()["recording"]["id"]
    assert res_up_ok.json()["recording"]["recording_type"] == "VIDEO_AUDIO"

    # 3. Access authorization matrix on GET /api/interview/sessions/{session_id}/recordings/{recording_id}
    # Candidate 1 (owner) -> 200 OK
    res_get_cand1 = client.get(f"/api/interview/sessions/{session_id}/recordings/{rec_id}", headers=cand1_headers)
    assert res_get_cand1.status_code == 200

    # Candidate 2 (other candidate) -> 403 Forbidden
    res_get_cand2 = client.get(f"/api/interview/sessions/{session_id}/recordings/{rec_id}", headers=cand2_headers)
    assert res_get_cand2.status_code == 403

    # Assigned Recruiter -> 200 OK
    res_get_rec = client.get(f"/api/interview/sessions/{session_id}/recordings/{rec_id}", headers=rec_headers)
    assert res_get_rec.status_code == 200

    # Other Recruiter -> 403 Forbidden
    res_get_oth_rec = client.get(f"/api/interview/sessions/{session_id}/recordings/{rec_id}", headers=other_rec_headers)
    assert res_get_oth_rec.status_code == 403

    # Admin -> 200 OK
    res_get_admin = client.get(f"/api/interview/sessions/{session_id}/recordings/{rec_id}", headers=admin_headers)
    assert res_get_admin.status_code == 200

    # Unauthenticated -> 401 Unauthorized
    res_get_unauth = client.get(f"/api/interview/sessions/{session_id}/recordings/{rec_id}")
    assert res_get_unauth.status_code == 401
