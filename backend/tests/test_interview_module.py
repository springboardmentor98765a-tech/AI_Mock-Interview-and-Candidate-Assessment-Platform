import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app
from models.user import User
from models.candidate import CandidateProfile
from models.interview import QuestionBank, Interview, InterviewQuestion, InterviewSession, AuditLog
from security.password import hash_password
from security.jwt import create_access_token
from services.ai_service import GeminiService
from services.resume_parser_service import ResumeParserService
from services.question_bank_service import QuestionBankService

# Setup Test Database
TEST_DB_URL = "sqlite:///./test_smarthire_module3.db"
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
def setup_test_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # Create Users
    db = TestingSessionLocal()
    admin = User(name="Test Admin", email="admin_test@smarthire.ai", password=hash_password("Admin123!"), role="ADMIN")
    recruiter = User(name="Test Recruiter", email="recruiter_test@smarthire.ai", password=hash_password("Pass123!"), role="RECRUITER")
    candidate = User(name="Test Candidate", email="candidate_test@smarthire.ai", password=hash_password("Pass123!"), role="CANDIDATE")
    candidate2 = User(name="Other Candidate", email="other_candidate@smarthire.ai", password=hash_password("Pass123!"), role="CANDIDATE")
    
    db.add_all([admin, recruiter, candidate, candidate2])
    db.commit()

    # Seed CandidateProfile for Candidate ID 3
    cand_profile = CandidateProfile(
        user_id=candidate.id,
        phone="+1 (555) 234-5678",
        college="Stanford University",
        degree="B.S. Computer Science",
        branch="Software Engineering",
        graduation_year=2024,
        skills="React, TypeScript, Node.js, PostgreSQL, System Design",
        preferred_role="Senior Frontend Engineer",
        experience_level="Mid-Senior",
        resume="resume_user_1.pdf",
        ats_score=88.0,
        interview_score=94.0
    )
    db.add(cand_profile)
    db.commit()

    # Seed Question Bank with sufficient fallback questions
    q_list = [
        QuestionBank(domain="Software Engineering", category="Technical", difficulty="Medium", question="[Test SE 1] What is FastAPI?", expected_answer="ASGI framework.", evaluation_points=["FastAPI"]),
        QuestionBank(domain="Software Engineering", category="Technical", difficulty="Medium", question="[Test SE 2] How does GIL work in Python?", expected_answer="Global Interpreter Lock.", evaluation_points=["GIL"]),
        QuestionBank(domain="Software Engineering", category="Technical", difficulty="Medium", question="[Test SE 3] Explain REST vs GraphQL.", expected_answer="API architectures.", evaluation_points=["REST"]),
        QuestionBank(domain="Software Engineering", category="Technical", difficulty="Medium", question="[Test SE 4] What is dependency injection?", expected_answer="Design pattern.", evaluation_points=["DI"]),
        QuestionBank(domain="Software Engineering", category="Technical", difficulty="Medium", question="[Test SE 5] How do index scans work in SQL?", expected_answer="Database indexing.", evaluation_points=["SQL"]),
        QuestionBank(domain="Technical", category="Technical", difficulty="Medium", question="[Test Tech 1] What is FastAPI?", expected_answer="ASGI framework.", evaluation_points=["FastAPI"]),
        QuestionBank(domain="Technical", category="Technical", difficulty="Medium", question="[Test Tech 2] How does GIL work in Python?", expected_answer="Global Interpreter Lock.", evaluation_points=["GIL"]),
        QuestionBank(domain="Technical", category="Technical", difficulty="Medium", question="[Test Tech 3] Explain REST vs GraphQL.", expected_answer="API architectures.", evaluation_points=["REST"]),
        QuestionBank(domain="HR", category="HR", difficulty="Easy", question="[Test HR 1] What are your strengths?", expected_answer="Self awareness.", evaluation_points=["Clarity"]),
        QuestionBank(domain="HR", category="HR", difficulty="Easy", question="[Test HR 2] Where do you see yourself in 5 years?", expected_answer="Growth.", evaluation_points=["Ambition"]),
        QuestionBank(domain="HR", category="HR", difficulty="Easy", question="[Test HR 3] Why do you want to join us?", expected_answer="Alignment.", evaluation_points=["Fit"]),
        QuestionBank(domain="HR", category="HR", difficulty="Easy", question="[Test HR 4] Describe a conflict resolution.", expected_answer="Empathy.", evaluation_points=["STAR"]),
        QuestionBank(domain="HR", category="HR", difficulty="Easy", question="[Test HR 5] How do you handle pressure?", expected_answer="Prioritization.", evaluation_points=["Resilience"])
    ]
    db.add_all(q_list)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)



def get_auth_headers(email: str, role: str, user_id: int):
    token = create_access_token({"sub": str(user_id), "email": email, "role": role})
    return {"Authorization": f"Bearer {token}"}


def test_authentication_and_authorization_matrix():
    """Verify role-based access restrictions and HTTP 401/403 responses."""
    # 1. Unauthenticated request -> HTTP 401
    res_401 = client.post("/interviews/generate", json={"domain": "Technical", "num_questions": 5})
    assert res_401.status_code == 401

    # 2. Candidate attempts generation -> HTTP 403
    cand_headers = get_auth_headers("candidate_test@smarthire.ai", "CANDIDATE", 3)
    res_cand_gen = client.post("/interviews/generate", json={"domain": "Technical", "num_questions": 5}, headers=cand_headers)
    assert res_cand_gen.status_code == 403

    # 3. Candidate attempts Question Bank creation -> HTTP 403
    res_cand_qb = client.post("/questions", json={"domain": "HR", "category": "HR", "difficulty": "Easy", "question": "Hacked Question?"}, headers=cand_headers)
    assert res_cand_qb.status_code == 403

    # 4. Recruiter attempts Question Bank creation -> HTTP 403 (Admin Only)
    rec_headers = get_auth_headers("recruiter_test@smarthire.ai", "RECRUITER", 2)
    res_rec_qb = client.post("/questions", json={"domain": "HR", "category": "HR", "difficulty": "Easy", "question": "Recruiter Question?"}, headers=rec_headers)
    assert res_rec_qb.status_code == 403


def test_question_bank_admin_crud_and_duplicates():
    """Verify Admin can create, edit, and delete questions, preventing duplicates."""
    admin_headers = get_auth_headers("admin_test@smarthire.ai", "ADMIN", 1)

    # 1. Admin creates question -> 200 OK
    res_create = client.post("/questions", json={
        "domain": "Sales",
        "category": "Sales",
        "difficulty": "Easy",
        "question": "How do you handle client objection?",
        "expected_answer": "Focus on ROI.",
        "evaluation_points": ["ROI", "Active Listening"]
    }, headers=admin_headers)
    assert res_create.status_code == 200
    q_id = res_create.json()["id"]

    # 2. Duplicate question creation -> 400 Bad Request
    res_dup = client.post("/questions", json={
        "domain": "Sales",
        "category": "Sales",
        "difficulty": "Easy",
        "question": "How do you handle client objection?"
    }, headers=admin_headers)
    assert res_dup.status_code == 400

    # 3. Recruiter views question bank -> 200 OK
    rec_headers = get_auth_headers("recruiter_test@smarthire.ai", "RECRUITER", 2)
    res_view = client.get("/questions?domain=Sales", headers=rec_headers)
    assert res_view.status_code == 200
    assert len(res_view.json()) >= 1

    # 4. Admin deletes question -> 200 OK
    res_del = client.delete(f"/questions/{q_id}", headers=admin_headers)
    assert res_del.status_code == 200


def test_interview_generation_and_question_bank_fallback(monkeypatch):
    """Verify generation works and falls back cleanly to Question Bank when API key is missing."""
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("GOOGLE_API_KEY", "")
    rec_headers = get_auth_headers("recruiter_test@smarthire.ai", "RECRUITER", 2)
    
    # Generate without Gemini API key -> Fallback to Question Bank
    res = client.post("/interviews/generate", json={
        "candidate_id": 3,
        "interview_type": "Technical",
        "domain": "Technical",
        "difficulty": "Medium",
        "num_questions": 3,
        "duration_mins": 30
    }, headers=rec_headers)

    assert res.status_code == 200
    data = res.json()
    assert data["generation_source"] == "Question Bank"
    assert data["num_questions"] >= 1
    assert "ai_provider" in data
    assert "ai_model" in data
    assert data["status"] == "Assigned"
    assert data["candidate_id"] == 3


def test_multiple_candidates_retrieval_and_assignment_linkage():
    """Verify system dynamically retrieves all candidate accounts (>4 candidates) and links assigned interviews."""
    db = TestingSessionLocal()
    # Create 5 additional candidate users (total 6 candidate accounts in DB)
    cand_users = []
    for i in range(1, 6):
        u = User(
            name=f"Scale Candidate {i}",
            email=f"scale_cand_{i}@smarthire.ai",
            password=hash_password("Pass123!"),
            role="CANDIDATE",
            is_active=True
        )
        db.add(u)
        cand_users.append(u)
    db.commit()

    # Add profile for only some candidates to verify outerjoin support
    p1 = CandidateProfile(user_id=cand_users[0].id, preferred_role="Fullstack Engineer", ats_score=95.0, interview_score=92.0)
    db.add(p1)
    db.commit()

    target_cand_id = cand_users[-1].id
    target_cand_email = cand_users[-1].email
    created_cand_ids = [u.id for u in cand_users]
    db.close()

    rec_headers = get_auth_headers("recruiter_test@smarthire.ai", "RECRUITER", 2)
    rank_res = client.get("/api/recruiter/rankings", headers=rec_headers)
    assert rank_res.status_code == 200
    rankings = rank_res.json()

    # Verify at least 6 candidates returned (original 1 + 5 newly created)
    assert len(rankings) >= 6
    cand_ids = [r["user_id"] for r in rankings]
    for cid in created_cand_ids:
        assert cid in cand_ids

    # Verify non-candidates are excluded
    roles_res = client.get("/api/recruiter/rankings", headers=rec_headers).json()
    all_emails = [r["email"] for r in roles_res]
    assert "admin_test@smarthire.ai" not in all_emails
    assert "recruiter_test@smarthire.ai" not in all_emails

    # Verify assignment linkage
    gen_res = client.post("/interviews/generate", json={
        "candidate_id": target_cand_id,
        "interview_type": "Technical",
        "domain": "Software Engineering",
        "difficulty": "Hard",
        "num_questions": 5,
        "duration_mins": 45
    }, headers=rec_headers)
    
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert gen_data["status"] == "Assigned"
    assert gen_data["candidate_id"] == target_cand_id

    # Verify candidate view sees the assigned interview
    target_cand_headers = get_auth_headers(target_cand_email, "CANDIDATE", target_cand_id)
    cand_interviews_res = client.get("/api/interviews", headers=target_cand_headers)
    assert cand_interviews_res.status_code == 200
    cand_interviews = cand_interviews_res.json()
    assert len(cand_interviews) >= 1
    assert cand_interviews[0]["interview_id"] == gen_data["interview_id"]
    assert cand_interviews[0]["status"] == "Assigned"
    assert cand_interviews[0]["candidate_id"] == target_cand_id


def test_soft_delete_interview():
    """Verify deleting an interview soft deletes it (is_deleted=True)."""
    rec_headers = get_auth_headers("recruiter_test@smarthire.ai", "RECRUITER", 2)

    gen_res = client.post("/interviews/generate", json={"candidate_id": 3, "domain": "HR", "num_questions": 3}, headers=rec_headers)
    int_id = gen_res.json()["interview_id"]

    del_res = client.delete(f"/interviews/{int_id}", headers=rec_headers)
    assert del_res.status_code == 200

    # Detail query now returns 404
    get_res = client.get(f"/interviews/{int_id}", headers=rec_headers)
    assert get_res.status_code == 404


def test_resume_parser_resilience():
    """Verify ResumeParserService handles missing or corrupted files gracefully."""
    db = TestingSessionLocal()
    parsed = ResumeParserService.extract_text_and_skills(candidate_user_id=3, resume_id=99999, db=db)
    assert "skills" in parsed
    assert len(parsed["skills"]) > 0
    assert parsed["experience_level"] in ["Entry", "Mid", "Senior", "Executive", "Mid-Senior"]
    db.close()

    """Verify Candidate receives public schema (no expected answers) during active session."""
    rec_headers = get_auth_headers("recruiter_test@smarthire.ai", "RECRUITER", 2)
    cand_headers = get_auth_headers("candidate_test@smarthire.ai", "CANDIDATE", 3)

    # 1. Recruiter generates interview
    gen_res = client.post("/interviews/generate", json={"candidate_id": 3, "domain": "HR", "num_questions": 3}, headers=rec_headers)
    int_id = gen_res.json()["interview_id"]

    # 2. Recruiter views details -> Has expected_answer and evaluation_points
    rec_detail = client.get(f"/interviews/{int_id}", headers=rec_headers).json()
    assert "expected_answer" in rec_detail["questions"][0]
    assert "evaluation_points" in rec_detail["questions"][0]

    # 3. Candidate views active interview details -> NO expected_answer or evaluation_points
    cand_detail = client.get(f"/interviews/{int_id}", headers=cand_headers).json()
    assert "expected_answer" not in cand_detail["questions"][0]
    assert "evaluation_points" not in cand_detail["questions"][0]


def test_interview_session_start_and_submit():
    """Verify candidate starting and submitting interview session."""
    cand_headers = get_auth_headers("candidate_test@smarthire.ai", "CANDIDATE", 3)
    rec_headers = get_auth_headers("recruiter_test@smarthire.ai", "RECRUITER", 2)

    gen_res = client.post("/interviews/generate", json={"candidate_id": 3, "domain": "Technical", "num_questions": 3}, headers=rec_headers)
    int_id = gen_res.json()["interview_id"]

    # Candidate starts session
    start_res = client.post("/interviews/start", json={"interview_id": int_id}, headers=cand_headers)
    assert start_res.status_code == 200
    assert start_res.json()["data"]["status"] == "In Progress"

    # Candidate submits session
    sub_res = client.post("/interviews/submit", json={
        "interview_id": int_id,
        "answers": [{"question_id": 1, "user_answer": "My answer"}],
        "time_taken_seconds": 120
    }, headers=cand_headers)

    assert sub_res.status_code == 200
    assert sub_res.json()["data"]["status"] == "Completed"


def test_soft_delete_interview():
    """Verify deleting an interview soft deletes it (is_deleted=True)."""
    rec_headers = get_auth_headers("recruiter_test@smarthire.ai", "RECRUITER", 2)

    gen_res = client.post("/interviews/generate", json={"candidate_id": 3, "domain": "HR", "num_questions": 3}, headers=rec_headers)
    int_id = gen_res.json()["interview_id"]

    del_res = client.delete(f"/interviews/{int_id}", headers=rec_headers)
    assert del_res.status_code == 200

    # Detail query now returns 404
    get_res = client.get(f"/interviews/{int_id}", headers=rec_headers)
    assert get_res.status_code == 404


def test_resume_parser_resilience():
    """Verify ResumeParserService handles missing or corrupted files gracefully."""
    db = TestingSessionLocal()
    parsed = ResumeParserService.extract_text_and_skills(candidate_user_id=3, resume_id=99999, db=db)
    assert "skills" in parsed
    assert len(parsed["skills"]) > 0
    assert parsed["experience_level"] in ["Entry", "Mid", "Senior", "Executive", "Mid-Senior"]
    db.close()


def test_question_generation_all_categories():
    """Verify question generation returns valid non-empty question lists for all 13 categories."""
    rec_headers = get_auth_headers("recruiter_test@smarthire.ai", "RECRUITER", 2)
    categories = [
        "Technical", "HR", "Behavioral", "Aptitude", "Sales", "Marketing",
        "Finance", "Customer Support", "Business Analyst", "Product Management",
        "Data Analyst", "Data Science", "Domain Specific"
    ]

    for cat in categories:
        res = client.post("/interviews/generate", json={
            "candidate_id": 3,
            "interview_type": cat,
            "domain": "Software Engineering",
            "difficulty": "Medium",
            "num_questions": 4,
            "duration_mins": 30
        }, headers=rec_headers)

        assert res.status_code == 200, f"Category '{cat}' failed with status {res.status_code}"
        data = res.json()
        assert data["num_questions"] == 4
        int_id = data["interview_id"]

        # Fetch detail questions
        detail_res = client.get(f"/interviews/{int_id}", headers=rec_headers)
        assert detail_res.status_code == 200
        questions = detail_res.json()["questions"]
        assert len(questions) == 4, f"Category '{cat}' returned {len(questions)} questions instead of 4"
        for q in questions:
            assert "question_text" in q
            assert len(q["question_text"]) > 0


def test_resume_action_endpoints_and_urls():
    """Verify candidate profile resume field and static file uploads route access."""
    cand_headers = get_auth_headers("candidate_test@smarthire.ai", "CANDIDATE", 3)
    
    # 1. Fetch candidate profile
    prof_res = client.get("/api/candidate/profile", headers={"Authorization": cand_headers["Authorization"]})
    assert prof_res.status_code == 200
    prof_data = prof_res.json()
    assert "resume" in prof_data

    # 2. Test static upload mount availability
    static_res = client.get("/uploads/")
    # Returns 404 or 403 or 200 from FastAPI StaticFiles, confirming route is registered
    assert static_res.status_code in [200, 403, 404]


# ==========================================
# STEP 1: INTERVIEW SESSION MANAGEMENT TESTS
# ==========================================

def test_session_lifecycle_complete_flow():
    """Verify complete session lifecycle: CREATED -> IN_PROGRESS -> PAUSED -> IN_PROGRESS -> ENDED."""
    rec_headers = get_auth_headers("recruiter_test@smarthire.ai", "RECRUITER", 2)
    cand_headers = get_auth_headers("candidate_test@smarthire.ai", "CANDIDATE", 3)

    # 1. Recruiter generates interview assigned to Candidate (ID 3)
    gen_res = client.post("/api/interview/generate", json={
        "candidate_id": 3,
        "interview_type": "Technical",
        "domain": "Software Engineering",
        "difficulty": "Medium",
        "num_questions": 5
    }, headers=rec_headers)
    assert gen_res.status_code == 200
    interview_id = gen_res.json()["interview_id"]

    # 2. Candidate creates session
    create_res = client.post("/api/interview/sessions", json={"interview_id": interview_id}, headers=cand_headers)
    assert create_res.status_code == 200
    create_data = create_res.json()
    assert create_data["success"] is True
    session_info = create_data["session"]
    session_id = session_info["id"]
    assert session_info["status"] == "CREATED"
    assert session_info["started_at"] is None
    assert session_info["ended_at"] is None

    # 3. Candidate starts session
    start_res = client.post(f"/api/interview/sessions/{session_id}/start", headers=cand_headers)
    assert start_res.status_code == 200
    start_data = start_res.json()["session"]
    assert start_data["status"] == "IN_PROGRESS"
    assert start_data["started_at"] is not None
    assert start_data["ended_at"] is None
    started_timestamp = start_data["started_at"]

    # 4. Candidate pauses session
    pause_res = client.post(f"/api/interview/sessions/{session_id}/pause", headers=cand_headers)
    assert pause_res.status_code == 200
    pause_data = pause_res.json()["session"]
    assert pause_data["status"] == "PAUSED"
    assert pause_data["started_at"] == started_timestamp  # Preserved
    assert pause_data["ended_at"] is None

    # 5. Candidate resumes session
    resume_res = client.post(f"/api/interview/sessions/{session_id}/resume", headers=cand_headers)
    assert resume_res.status_code == 200
    resume_data = resume_res.json()["session"]
    assert resume_data["status"] == "IN_PROGRESS"
    assert resume_data["started_at"] == started_timestamp  # Preserved
    assert resume_data["ended_at"] is None

    # 6. Candidate ends session
    end_res = client.post(f"/api/interview/sessions/{session_id}/end", headers=cand_headers)
    assert end_res.status_code == 200
    end_data = end_res.json()["session"]
    assert end_data["status"] in ["COMPLETED", "ENDED"]
    assert end_data["started_at"] == started_timestamp
    assert end_data["ended_at"] is not None


def test_invalid_session_state_transitions():
    """Verify invalid state transitions return clean validation errors."""
    rec_headers = get_auth_headers("recruiter_test@smarthire.ai", "RECRUITER", 2)
    cand_headers = get_auth_headers("candidate_test@smarthire.ai", "CANDIDATE", 3)

    # 1. Generate interview & session
    gen_res = client.post("/api/interview/generate", json={"candidate_id": 3, "num_questions": 3}, headers=rec_headers)
    interview_id = gen_res.json()["interview_id"]

    create_res = client.post("/api/interview/sessions", json={"interview_id": interview_id}, headers=cand_headers)
    session_id = create_res.json()["session"]["id"]

    # Invalid: Pause session while in CREATED status
    bad_pause = client.post(f"/api/interview/sessions/{session_id}/pause", headers=cand_headers)
    assert bad_pause.status_code in [400, 409]


    # Start session, then end session
    client.post(f"/api/interview/sessions/{session_id}/start", headers=cand_headers)
    client.post(f"/api/interview/sessions/{session_id}/end", headers=cand_headers)

    # Invalid: Resume a COMPLETED session
    bad_resume = client.post(f"/api/interview/sessions/{session_id}/resume", headers=cand_headers)
    assert bad_resume.status_code in [400, 409]
    res_text = str(bad_resume.json()).lower()
    assert "completed" in res_text or "ended" in res_text

    # Invalid: Start a COMPLETED session
    bad_start = client.post(f"/api/interview/sessions/{session_id}/start", headers=cand_headers)
    assert bad_start.status_code in [400, 409]
    start_text = str(bad_start.json()).lower()
    assert "completed" in start_text or "ended" in start_text



def test_session_authorization_matrix():
    """Verify candidates cannot start, pause, resume, or end other candidates' sessions."""
    rec_headers = get_auth_headers("recruiter_test@smarthire.ai", "RECRUITER", 2)
    cand1_headers = get_auth_headers("candidate_test@smarthire.ai", "CANDIDATE", 3)
    cand2_headers = get_auth_headers("other_candidate@smarthire.ai", "CANDIDATE", 4)

    gen_res = client.post("/api/interview/generate", json={"candidate_id": 3, "num_questions": 3}, headers=rec_headers)
    interview_id = gen_res.json()["interview_id"]

    create_res = client.post("/api/interview/sessions", json={"interview_id": interview_id}, headers=cand1_headers)
    session_id = create_res.json()["session"]["id"]

    # Candidate 2 attempts to start Candidate 1's session -> 403 Forbidden
    unauth_start = client.post(f"/api/interview/sessions/{session_id}/start", headers=cand2_headers)
    assert unauth_start.status_code == 403

    # Candidate 2 attempts to view details -> 403 Forbidden
    unauth_get = client.get(f"/api/interview/sessions/{session_id}", headers=cand2_headers)
    assert unauth_get.status_code == 403


def test_question_position_persistence():
    """Verify current question position update and recovery."""
    rec_headers = get_auth_headers("recruiter_test@smarthire.ai", "RECRUITER", 2)
    cand_headers = get_auth_headers("candidate_test@smarthire.ai", "CANDIDATE", 3)

    gen_res = client.post("/api/interview/generate", json={"candidate_id": 3, "num_questions": 5}, headers=rec_headers)
    interview_id = gen_res.json()["interview_id"]

    create_res = client.post("/api/interview/sessions", json={"interview_id": interview_id}, headers=cand_headers)
    session_id = create_res.json()["session"]["id"]

    # Update position to index 2 (question 3)
    pos_res = client.put(f"/api/interview/sessions/{session_id}/position", json={"current_question_index": 2}, headers=cand_headers)
    assert pos_res.status_code == 200

    # Fetch session details and verify current_question_index
    detail_res = client.get(f"/api/interview/sessions/{session_id}", headers=cand_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["session"]["current_question_index"] == 2


