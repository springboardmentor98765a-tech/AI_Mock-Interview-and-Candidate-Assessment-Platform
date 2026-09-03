import pytest
from unittest.mock import MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from database import Base
from models.interview import InterviewSession, Interview, InterviewQuestion, SpeechAnalysis, InterviewBehaviorAnalysis, InterviewQuestionAttempt
from services.performance_scoring_service import (
    compute_full_performance_evaluation,
    calculate_overall_score,
    get_category_score,
    get_performance_rating,
    STATUS_EVALUATED,
    STATUS_INSUFFICIENT_DATA,
    STATUS_NO_ANSWERS,
    STATUS_EVALUATION_FAILED
)
from services.ai_service import GeminiService


@pytest.fixture(scope="module")
def db_engine():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    SessionLocal = sessionmaker(bind=connection)
    session = SessionLocal()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


def test_1_blank_interview(db_session: Session):
    """Test 1: Blank interview (No camera, no face, no audio, no transcript, no answers)."""
    interview = Interview(
        candidate_id=1,
        interview_type="Technical",
        domain="Software Engineering",
        difficulty="Medium",
        duration_mins=30,
        experience_level="Mid",
        status="COMPLETED"
    )
    db_session.add(interview)
    db_session.commit()

    session_rec = InterviewSession(
        interview_id=interview.id,
        candidate_id=1,
        status="COMPLETED",
        score=0.0,
        total_active_seconds=0,
        answers_json=[]
    )
    db_session.add(session_rec)
    db_session.commit()

    result = compute_full_performance_evaluation(db_session, session_rec)

    assert result["overall_score"] == 0.0
    assert result["performance_rating"] == "Insufficient Data"

    cats = result["category_scores"]
    assert cats["communication"]["score"] == 0.0
    assert cats["communication"]["available"] is False
    assert cats["communication"]["status"] == STATUS_INSUFFICIENT_DATA

    assert cats["confidence"]["score"] == 0.0
    assert cats["confidence"]["available"] is False
    assert cats["confidence"]["status"] == STATUS_INSUFFICIENT_DATA

    assert cats["technical_relevance"]["score"] == 0.0
    assert cats["technical_relevance"]["available"] is False
    assert cats["technical_relevance"]["status"] == STATUS_NO_ANSWERS

    assert cats["professionalism"]["score"] == 0.0
    assert cats["professionalism"]["available"] is False
    assert cats["professionalism"]["status"] == STATUS_INSUFFICIENT_DATA


def test_2_audio_and_answers_no_camera(db_session: Session):
    """Test 2: Audio & meaningful answers, no camera or face detection."""
    interview = Interview(
        candidate_id=1,
        interview_type="Technical",
        domain="Software Engineering",
        difficulty="Medium",
        duration_mins=30,
        experience_level="Mid",
        status="COMPLETED"
    )
    db_session.add(interview)
    db_session.commit()

    q1 = InterviewQuestion(
        interview_id=interview.id,
        sequence_no=1,
        question_text="Explain Python GIL and concurrency.",
        category="Technical",
        difficulty="Medium",
        expected_answer="GIL locks execution to a single thread in CPython.",
        evaluation_points=["Global Interpreter Lock", "Thread safety", "Multiprocessing"]
    )
    db_session.add(q1)
    db_session.commit()

    session_rec = InterviewSession(
        interview_id=interview.id,
        candidate_id=1,
        status="COMPLETED",
        score=0.0,
        total_active_seconds=300,
        answers_json=[{
            "question_id": q1.id,
            "user_answer": "The Global Interpreter Lock prevents multiple native threads from executing Python bytecodes at once.",
            "score": 85.0
        }]
    )
    db_session.add(session_rec)
    db_session.commit()

    speech = SpeechAnalysis(
        session_id=session_rec.id,
        question_id=q1.id,
        candidate_id=1,
        word_count=55,
        filler_word_count=1,
        words_per_minute=135.0,
        clarity_score=90.0,
        grammar_score=88.0
    )
    db_session.add(speech)
    db_session.commit()

    result = compute_full_performance_evaluation(db_session, session_rec)

    cats = result["category_scores"]
    assert cats["communication"]["available"] is True
    assert cats["communication"]["score"] > 0.0

    assert cats["technical_relevance"]["available"] is True
    assert cats["technical_relevance"]["score"] > 0.0

    assert cats["confidence"]["available"] is False
    assert cats["confidence"]["score"] == 0.0
    assert cats["confidence"]["status"] == STATUS_INSUFFICIENT_DATA

    # Fixed weights formula: Comm (30%) + Conf (0%) + Tech (30%) + Prof (15%)
    expected_overall = round(
        cats["communication"]["score"] * 0.30 +
        0.0 * 0.25 +
        cats["technical_relevance"]["score"] * 0.30 +
        cats["professionalism"]["score"] * 0.15,
        1
    )
    assert result["overall_score"] == expected_overall


def test_3_camera_only_no_audio_or_answers(db_session: Session):
    """Test 3: Camera only (face visible), no audio or answers."""
    interview = Interview(
        candidate_id=1,
        interview_type="Technical",
        domain="Software Engineering",
        difficulty="Medium",
        duration_mins=30,
        experience_level="Mid",
        status="COMPLETED"
    )
    db_session.add(interview)
    db_session.commit()

    session_rec = InterviewSession(
        interview_id=interview.id,
        candidate_id=1,
        status="COMPLETED",
        score=0.0,
        total_active_seconds=120,
        answers_json=[]
    )
    db_session.add(session_rec)
    db_session.commit()

    behavior = InterviewBehaviorAnalysis(
        session_id=session_rec.id,
        interview_id=interview.id,
        candidate_id=1,
        analysis_status="complete",
        total_analyzed_frames=50,
        confident_frames_count=45,
        unconfident_frames_count=5,
        confidence_score=90.0,
        eye_contact_percentage=85.0,
        engagement_score=88.0,
        attention_score=90.0
    )
    db_session.add(behavior)
    db_session.commit()

    result = compute_full_performance_evaluation(db_session, session_rec)

    cats = result["category_scores"]
    assert cats["confidence"]["available"] is True
    assert cats["confidence"]["score"] > 0.0

    assert cats["communication"]["available"] is False
    assert cats["communication"]["score"] == 0.0

    assert cats["technical_relevance"]["available"] is False
    assert cats["technical_relevance"]["score"] == 0.0

    assert cats["professionalism"]["available"] is False
    assert cats["professionalism"]["score"] == 0.0


def test_4_full_valid_interview(db_session: Session):
    """Test 4: Full valid interview with camera, audio, and answers."""
    interview = Interview(
        candidate_id=1,
        interview_type="Technical",
        domain="Software Engineering",
        difficulty="Medium",
        duration_mins=30,
        experience_level="Mid",
        status="COMPLETED"
    )
    db_session.add(interview)
    db_session.commit()

    q1 = InterviewQuestion(
        interview_id=interview.id,
        sequence_no=1,
        question_text="Explain REST API principles.",
        category="Technical",
        difficulty="Medium",
        expected_answer="REST uses HTTP methods, stateless requests, standard status codes.",
        evaluation_points=["Statelessness", "HTTP methods", "Resource URIs"]
    )
    db_session.add(q1)
    db_session.commit()

    session_rec = InterviewSession(
        interview_id=interview.id,
        candidate_id=1,
        status="COMPLETED",
        score=85.0,
        total_active_seconds=600,
        answers_json=[{
            "question_id": q1.id,
            "user_answer": "REST APIs operate over HTTP methods such as GET, POST, PUT, DELETE. Requests are stateless and resources are addressed via clear URIs.",
            "score": 90.0
        }]
    )
    db_session.add(session_rec)
    db_session.commit()

    speech = SpeechAnalysis(
        session_id=session_rec.id,
        question_id=q1.id,
        candidate_id=1,
        word_count=60,
        filler_word_count=1,
        words_per_minute=140.0,
        clarity_score=92.0,
        grammar_score=90.0
    )
    db_session.add(speech)

    behavior = InterviewBehaviorAnalysis(
        session_id=session_rec.id,
        interview_id=interview.id,
        candidate_id=1,
        analysis_status="complete",
        total_analyzed_frames=100,
        confident_frames_count=90,
        unconfident_frames_count=10,
        confidence_score=90.0,
        eye_contact_percentage=88.0,
        engagement_score=90.0,
        attention_score=92.0
    )
    db_session.add(behavior)
    db_session.commit()

    result = compute_full_performance_evaluation(db_session, session_rec)

    cats = result["category_scores"]
    assert cats["communication"]["available"] is True
    assert cats["confidence"]["available"] is True
    assert cats["technical_relevance"]["available"] is True
    assert cats["professionalism"]["available"] is True

    assert result["overall_score"] > 80.0
    assert result["performance_rating"] in ["Good", "Excellent"]


def test_5_zero_score_must_not_become_fallback():
    """Test 5: Legitimate zero score preservation regression test."""
    cat_evaluated_zero = {
        "score": 0.0,
        "available": True,
        "status": STATUS_EVALUATED
    }
    assert get_category_score(cat_evaluated_zero) == 0.0

    cat_unavail = {
        "score": None,
        "available": False,
        "status": STATUS_INSUFFICIENT_DATA
    }
    assert get_category_score(cat_unavail) == 0.0

    category_scores = {
        "communication": {"score": 0.0, "available": True},
        "confidence": {"score": 0.0, "available": True},
        "technical_relevance": {"score": 0.0, "available": True},
        "professionalism": {"score": 0.0, "available": True}
    }
    score, rating = calculate_overall_score(category_scores)
    assert score == 0.0
    assert rating == "Poor"


def test_6_ai_evaluation_failure(monkeypatch):
    """Test 6: AI evaluation failure produces evaluation_failed status instead of positive fallback."""
    svc = GeminiService()

    def mock_fail_api(prompt):
        raise RuntimeError("Simulated Gemini API Outage")

    monkeypatch.setattr(svc, "_call_gemini_api", mock_fail_api)

    res = svc.evaluate_answer_correctness(
        question_text="Explain Python GIL",
        expected_answer="Global Interpreter Lock",
        evaluation_points=["Lock"],
        user_answer="The GIL is a mutex."
    )

    assert res["score"] == 0.0
    assert res["available"] is False
    assert res["status"] == STATUS_EVALUATION_FAILED
    assert res["correctness"] == "Unanswered"
    assert "could not be completed" in res["feedback"]
