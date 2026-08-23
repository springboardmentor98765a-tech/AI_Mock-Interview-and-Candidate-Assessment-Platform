import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from main import app
from models.user import User
from models.interview import Interview, InterviewQuestion, InterviewSession, SpeechAnalysis
from security.password import hash_password
from security.jwt import create_access_token
from services.speech_service import (
    analyze_filler_words,
    calculate_speech_pace,
    evaluate_local_grammar,
    run_full_communication_analysis
)

TEST_DB_URL = "sqlite:///./test_smarthire_speech.db"
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
def setup_speech_test_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    cand = User(name="Speech Cand", email="speech_cand@smarthire.ai", password=hash_password("Pass123!"), role="CANDIDATE")
    rec = User(name="Speech Rec", email="speech_rec@smarthire.ai", password=hash_password("Pass123!"), role="RECRUITER")
    db.add_all([cand, rec])
    db.commit()

    interview = Interview(
        candidate_id=cand.id,
        recruiter_id=rec.id,
        interview_type="Technical",
        domain="Software Engineering",
        status="In Progress"
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    q1 = InterviewQuestion(interview_id=interview.id, question_text="Tell me about Python.", category="Technical", sequence_no=1)
    db.add(q1)
    db.commit()

    session_rec = InterviewSession(
        interview_id=interview.id,
        candidate_id=cand.id,
        status="IN_PROGRESS"
    )
    db.add(session_rec)
    db.commit()

    yield

    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_smarthire_speech.db"):
        try:
            os.remove("./test_smarthire_speech.db")
        except Exception:
            pass
    app.dependency_overrides.pop(get_db, None)


def get_headers(email: str, role: str, user_id: int):
    token = create_access_token({"sub": str(user_id), "email": email, "role": role})
    return {"Authorization": f"Bearer {token}"}


def test_filler_word_detection():
    """Verify word-boundary aware filler detection (e.g. 'umbrella' is NOT 'um')."""
    text = "Um, I actually like working with Python, you know, and um umbrella is nice."
    res = analyze_filler_words(text)
    assert res["filler_words"].get("um") == 2
    assert res["filler_words"].get("actually") == 1
    assert res["filler_words"].get("like") == 1
    assert res["filler_words"].get("you know") == 1
    assert "umbrella" not in res["filler_words"]


def test_speech_pace_calculation():
    """Verify WPM calculation and pace classification."""
    res_good = calculate_speech_pace(140, 60.0)  # 140 WPM
    assert res_good["words_per_minute"] == 140.0
    assert res_good["classification"] == "Good"

    res_slow = calculate_speech_pace(40, 60.0)   # 40 WPM
    assert res_slow["classification"] == "Too Slow"

    res_fast = calculate_speech_pace(200, 60.0)  # 200 WPM
    assert res_fast["classification"] == "Too Fast"


def test_grammar_evaluation():
    """Verify grammar quality scoring and issues detection."""
    res = evaluate_local_grammar("I have worked with FastAPI and PostgreSQL for over three years.")
    assert res["score"] >= 80.0

    res_frag = evaluate_local_grammar("FastAPI ok.")
    assert "fragment" in res_frag["issues"][0].lower() or res_frag["score"] < 80.0


def test_pronunciation_null_fallback():
    """Verify pronunciation_score is strictly set to None when phoneme analysis is unavailable (Rule 1 & 17)."""
    text = "I have developed fullstack web applications using React and Node.js."
    res = run_full_communication_analysis(text, duration_seconds=25.0)

    assert res["pronunciation_score"] is None
    assert "Pronunciation evaluation unavailable" in res["feedback"]["pronunciation_notice"]
    assert res["communication_score"] > 0.0


def test_speech_endpoints():
    """Verify POST /api/interview/speech/transcription and GET /api/interview/speech/{session_id}."""
    db = TestingSessionLocal()
    cand = db.query(User).filter(User.email == "speech_cand@smarthire.ai").first()
    session_rec = db.query(InterviewSession).filter(InterviewSession.candidate_id == cand.id).first()
    q = db.query(InterviewQuestion).filter(InterviewQuestion.interview_id == session_rec.interview_id).first()
    db.close()

    headers = get_headers(cand.email, cand.role, cand.id)

    # 1. Post transcription
    payload = {
        "session_id": session_rec.id,
        "question_id": q.id,
        "transcript": "Um, I am experienced in Python and building REST APIs, you know.",
        "duration_seconds": 15.0
    }
    res = client.post("/api/interview/speech/transcription", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["pronunciation_score"] is None
    assert data["filler_word_count"] >= 2

    # 2. Get session speech report
    res_get = client.get(f"/api/interview/speech/{session_rec.id}", headers=headers)
    assert res_get.status_code == 200
    summary = res_get.json()["summary"]
    assert summary["pronunciation_score"] is None
    assert summary["total_filler_words"] >= 2


def test_idempotent_session_submission_and_ending():
    """Verify that ending or submitting an already completed session is idempotent and returns 200 OK."""
    db = TestingSessionLocal()
    cand = db.query(User).filter(User.email == "speech_cand@smarthire.ai").first()
    session_rec = db.query(InterviewSession).filter(InterviewSession.candidate_id == cand.id).first()
    interview = db.query(Interview).filter(Interview.id == session_rec.interview_id).first()
    db.close()

    headers = get_headers(cand.email, cand.role, cand.id)

    # 1. Submit interview session
    res1 = client.post("/api/interviews/submit", json={
        "interview_id": interview.id,
        "answers": [{"question_id": 1, "user_answer": "Python is a powerful high-level programming language."}],
        "time_taken_seconds": 30
    }, headers=headers)
    assert res1.status_code == 200

    # 2. End session (called immediately after submit in finishInterview workflow)
    res2 = client.post(f"/api/interview/sessions/{session_rec.id}/end", json={"remarks": "Completed"}, headers=headers)
    assert res2.status_code == 200  # Must be 200 OK, NOT 409 Conflict

    # 3. Repeated submit (idempotent)
    res3 = client.post("/api/interviews/submit", json={
        "interview_id": interview.id,
        "answers": [{"question_id": 1, "user_answer": "Python is a powerful high-level programming language."}],
        "time_taken_seconds": 30
    }, headers=headers)
    assert res3.status_code == 200
