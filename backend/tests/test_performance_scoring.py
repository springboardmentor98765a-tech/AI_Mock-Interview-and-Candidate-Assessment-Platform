import pytest
from unittest.mock import MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models.user import User
from models.interview import (
    Interview,
    InterviewSession,
    InterviewQuestion,
    SpeechAnalysis,
    InterviewBehaviorAnalysis,
    InterviewQuestionAttempt,
    CandidatePerformanceReport
)
from services.performance_scoring_service import (
    get_performance_rating,
    calculate_weighted_score,
    calculate_overall_score,
    compute_full_performance_evaluation
)
from services.feedback_service import generate_complete_ai_feedback
from services.interview_service import (
    generate_and_save_candidate_performance_report,
    get_performance_report_service
)


@pytest.fixture
def db_session():
    """Setup clean in-memory SQLite database session for unit tests."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()


def test_performance_rating_exact_boundaries():
    """Tests exact rating boundary cutoffs as required by rubric."""
    assert get_performance_rating(100.0) == "Excellent"
    assert get_performance_rating(90.0) == "Excellent"
    assert get_performance_rating(89.99) == "Good"
    assert get_performance_rating(75.0) == "Good"
    assert get_performance_rating(74.99) == "Average"
    assert get_performance_rating(60.0) == "Average"
    assert get_performance_rating(59.99) == "Needs Improvement"
    assert get_performance_rating(40.0) == "Needs Improvement"
    assert get_performance_rating(39.99) == "Poor"
    assert get_performance_rating(0.0) == "Poor"
    assert get_performance_rating(None) == "N/A"


def test_missing_metric_weight_renormalization():
    """Tests that missing metrics are excluded and weights are re-normalized without artificial defaults."""
    metrics = {
        "speech_clarity": {"score": None, "available": False, "reason": "Unavailable"},
        "grammar_quality": {"score": 80.0, "available": True},
        "filler_word_control": {"score": 90.0, "available": True},
        "speaking_pace": {"score": 70.0, "available": True},
        "response_completeness": {"score": 85.0, "available": True}
    }
    weights = {
        "speech_clarity": 0.20,
        "grammar_quality": 0.25,
        "filler_word_control": 0.15,
        "speaking_pace": 0.15,
        "response_completeness": 0.25
    }

    # Available weights sum = 0.25 + 0.15 + 0.15 + 0.25 = 0.80
    # Expected weighted sum = (80*0.25 + 90*0.15 + 70*0.15 + 85*0.25) / 0.80 = 65.25 / 0.80 = 81.5625 -> 81.6
    score, available = calculate_weighted_score(metrics, weights)
    assert available is True
    assert score == 81.6


def test_all_optional_metrics_missing_no_division_by_zero():
    """Tests that a category returns available=False when all metrics are missing."""
    metrics = {
        "speech_clarity": {"score": None, "available": False},
        "grammar_quality": {"score": None, "available": False},
        "filler_word_control": {"score": None, "available": False},
        "speaking_pace": {"score": None, "available": False},
        "response_completeness": {"score": None, "available": False}
    }
    weights = {
        "speech_clarity": 0.20,
        "grammar_quality": 0.25,
        "filler_word_control": 0.15,
        "speaking_pace": 0.15,
        "response_completeness": 0.25
    }

    score, available = calculate_weighted_score(metrics, weights)
    assert available is False
    assert score == 0.0


def test_scenario_1_high_performer(db_session):
    """Scenario 1: High performer test (Excellent rating)."""
    candidate = User(id=10, name="Alice High", email="alice@test.com", role="CANDIDATE")
    db_session.add(candidate)
    db_session.commit()

    interview = Interview(id=101, candidate_id=candidate.id, domain="System Design", interview_type="Senior Engineer")
    db_session.add(interview)
    db_session.commit()

    session = InterviewSession(id=201, interview_id=interview.id, candidate_id=candidate.id, status="COMPLETED", total_active_seconds=1200)
    db_session.add(session)
    db_session.commit()

    # Question & Answers
    q1 = InterviewQuestion(
        id=301,
        interview_id=interview.id,
        question_text="Explain microservices caching strategies.",
        expected_answer="Use Redis or Memcached distributed caching with optimistic locking and TTL policy.",
        category="Technical",
        sequence_no=1
    )
    db_session.add(q1)
    db_session.commit()

    attempt = InterviewQuestionAttempt(
        session_id=session.id,
        question_id=q1.id,
        answer="I use Redis for distributed caching with optimistic locking to ensure consistency."
    )
    db_session.add(attempt)

    # High Speech Analysis
    speech = SpeechAnalysis(
        session_id=session.id,
        candidate_id=candidate.id,
        word_count=150,
        words_per_minute=140.0,
        filler_word_count=1,
        grammar_score=95.0,
        clarity_score=95.0,
        communication_score=94.0
    )
    db_session.add(speech)

    # High Behavior Analysis
    behavior = InterviewBehaviorAnalysis(
        session_id=session.id,
        interview_id=interview.id,
        candidate_id=candidate.id,
        confidence_score=92.0,
        eye_contact_percentage=90.0,
        attention_score=95.0,
        engagement_score=90.0,
        total_analyzed_frames=100
    )
    db_session.add(behavior)
    db_session.commit()

    eval_data = compute_full_performance_evaluation(db_session, session)
    assert eval_data["overall_score"] >= 80.0
    assert eval_data["performance_rating"] in ["Excellent", "Good"]

    feedback = generate_complete_ai_feedback(eval_data)
    assert len(feedback["strengths"]) >= 1


def test_scenario_5_professionalism_violations(db_session):
    """Scenario 5: Mobile & Fullscreen violations test (Etiquette score deductions)."""
    candidate = User(id=11, name="Bob Violator", email="bob@test.com", role="CANDIDATE")
    db_session.add(candidate)

    interview = Interview(id=102, candidate_id=candidate.id, domain="DevOps", interview_type="Engineer")
    db_session.add(interview)
    db_session.commit()

    session = InterviewSession(
        id=202,
        interview_id=interview.id,
        candidate_id=candidate.id,
        status="COMPLETED",
        total_active_seconds=600,
        answers_json=[{"question_id": 101, "user_answer": "I completed the DevOps tasks."}]
    )
    db_session.add(session)
    db_session.commit()

    behavior = InterviewBehaviorAnalysis(
        session_id=session.id,
        interview_id=interview.id,
        candidate_id=candidate.id,
        confidence_score=80.0,
        eye_contact_percentage=80.0,
        attention_score=80.0,
        mobile_detected=True,
        mobile_event_count=2,  # 2 * 15 = -30
        fullscreen_violations_count=2,  # 2 * 10 = -20
        total_analyzed_frames=50
    )
    db_session.add(behavior)
    db_session.commit()

    eval_data = compute_full_performance_evaluation(db_session, session)
    etiquette_score = eval_data["professionalism_analysis"]["interview_etiquette"]["score"]
    assert etiquette_score == 50.0  # 100 - 30 - 20 = 50.0


def test_reopen_report_idempotency(db_session):
    """Tests that generating the report multiple times is idempotent and creates no duplicates."""
    candidate = User(id=12, name="Carol Repeat", email="carol@test.com", role="CANDIDATE")
    db_session.add(candidate)

    interview = Interview(id=103, candidate_id=candidate.id, domain="Frontend", interview_type="React")
    db_session.add(interview)
    db_session.commit()

    session = InterviewSession(id=203, interview_id=interview.id, candidate_id=candidate.id, status="COMPLETED", total_active_seconds=900)
    db_session.add(session)
    db_session.commit()

    report1 = generate_and_save_candidate_performance_report(db_session, session)
    report2 = generate_and_save_candidate_performance_report(db_session, session)

    assert report1.id == report2.id
    count = db_session.query(CandidatePerformanceReport).filter(CandidatePerformanceReport.session_id == session.id).count()
    assert count == 1


def test_authorization_role_checks(db_session):
    """Tests authorization rules (Candidate own session vs forbidden)."""
    cand1 = User(id=15, name="Cand 1", email="c1@test.com", role="CANDIDATE")
    cand2 = User(id=16, name="Cand 2", email="c2@test.com", role="CANDIDATE")
    db_session.add_all([cand1, cand2])

    interview = Interview(id=104, candidate_id=cand1.id, domain="Security")
    db_session.add(interview)
    db_session.commit()

    session = InterviewSession(id=204, interview_id=interview.id, candidate_id=cand1.id, status="COMPLETED")
    db_session.add(session)
    db_session.commit()

    # Candidate 1 can access own report
    report_data = get_performance_report_service(cand1, session.id, db_session, is_session=True)
    assert report_data["session_id"] == session.id

    # Candidate 2 receives 403 Forbidden
    with pytest.raises(Exception) as exc:
        get_performance_report_service(cand2, session.id, db_session, is_session=True)
    assert "403" in str(exc.value) or "authorized" in str(exc.value).lower()


def test_candidate_a_vs_candidate_b_real_data_differential(db_session):
    """
    Strict accuracy test proving that Candidate A (strong performance, 0 violations)
    receives significantly higher scores and a better performance rating than
    Candidate B (weak performance, high filler words, multiple mobile/fullscreen violations).
    Guarantees no hardcoded or static dummy default scores exist.
    """
    # 1. Candidate A Setup (Strong Candidate)
    cand_a = User(id=30, name="Strong Candidate A", email="cand_a@test.com", role="CANDIDATE")
    db_session.add(cand_a)

    interview_a = Interview(id=301, candidate_id=cand_a.id, domain="Cloud Architecture", interview_type="Senior Architect")
    db_session.add(interview_a)
    db_session.commit()

    session_a = InterviewSession(id=401, interview_id=interview_a.id, candidate_id=cand_a.id, status="COMPLETED", total_active_seconds=1200)
    db_session.add(session_a)
    db_session.commit()

    q_a = InterviewQuestion(
        id=501,
        interview_id=interview_a.id,
        question_text="Explain AWS S3 lifecycle policies and storage classes.",
        expected_answer="Lifecycle policies transition objects from Standard to Glacier or Deep Archive based on age, reducing costs.",
        category="Technical",
        sequence_no=1
    )
    db_session.add(q_a)
    db_session.commit()

    attempt_a = InterviewQuestionAttempt(
        session_id=session_a.id,
        question_id=q_a.id,
        answer="I configure AWS S3 lifecycle policies to transition objects from S3 Standard to Glacier and Deep Archive based on object age and access patterns, optimizing storage costs efficiently."
    )
    db_session.add(attempt_a)

    speech_a = SpeechAnalysis(
        session_id=session_a.id,
        candidate_id=cand_a.id,
        word_count=180,
        words_per_minute=140.0,
        filler_word_count=1,
        grammar_score=95.0,
        clarity_score=96.0,
        communication_score=95.0
    )
    db_session.add(speech_a)

    behavior_a = InterviewBehaviorAnalysis(
        session_id=session_a.id,
        interview_id=interview_a.id,
        candidate_id=cand_a.id,
        confidence_score=95.0,
        eye_contact_percentage=94.0,
        attention_score=96.0,
        engagement_score=92.0,
        mobile_detected=False,
        mobile_event_count=0,
        fullscreen_violations_count=0,
        total_analyzed_frames=200
    )
    db_session.add(behavior_a)
    db_session.commit()

    eval_a = compute_full_performance_evaluation(db_session, session_a)
    feedback_a = generate_complete_ai_feedback(eval_a)

    # 2. Candidate B Setup (Weak Candidate with Violations)
    cand_b = User(id=31, name="Weak Candidate B", email="cand_b@test.com", role="CANDIDATE")
    db_session.add(cand_b)

    interview_b = Interview(id=302, candidate_id=cand_b.id, domain="Cloud Architecture", interview_type="Senior Architect")
    db_session.add(interview_b)
    db_session.commit()

    session_b = InterviewSession(id=402, interview_id=interview_b.id, candidate_id=cand_b.id, status="COMPLETED", total_active_seconds=400)
    db_session.add(session_b)
    db_session.commit()

    q_b = InterviewQuestion(
        id=502,
        interview_id=interview_b.id,
        question_text="Explain AWS S3 lifecycle policies and storage classes.",
        expected_answer="Lifecycle policies transition objects from Standard to Glacier or Deep Archive based on age, reducing costs.",
        category="Technical",
        sequence_no=1
    )
    db_session.add(q_b)
    db_session.commit()

    attempt_b = InterviewQuestionAttempt(
        session_id=session_b.id,
        question_id=q_b.id,
        answer="um like s3 is cloud storage I guess."
    )
    db_session.add(attempt_b)

    speech_b = SpeechAnalysis(
        session_id=session_b.id,
        candidate_id=cand_b.id,
        word_count=20,
        words_per_minute=60.0,
        filler_word_count=8,  # High filler rate: 8/20 = 40%
        grammar_score=40.0,
        clarity_score=45.0,
        communication_score=42.0
    )
    db_session.add(speech_b)

    behavior_b = InterviewBehaviorAnalysis(
        session_id=session_b.id,
        interview_id=interview_b.id,
        candidate_id=cand_b.id,
        confidence_score=35.0,
        eye_contact_percentage=30.0,
        attention_score=30.0,
        engagement_score=30.0,
        mobile_detected=True,
        mobile_event_count=2,  # -30 points deduction
        fullscreen_violations_count=2,  # -20 points deduction
        total_analyzed_frames=80
    )
    db_session.add(behavior_b)
    db_session.commit()

    eval_b = compute_full_performance_evaluation(db_session, session_b)
    feedback_b = generate_complete_ai_feedback(eval_b)

    # 3. Differential Assertions
    score_a = eval_a["overall_score"]
    score_b = eval_b["overall_score"]

    assert score_a > score_b
    assert (score_a - score_b) >= 30.0  # Significant real score gap

    assert eval_a["performance_rating"] in ["Excellent", "Good"]
    assert eval_b["performance_rating"] in ["Needs Improvement", "Poor"]

    # Category Level Gaps
    assert eval_a["category_scores"]["communication"]["score"] > eval_b["category_scores"]["communication"]["score"]
    assert eval_a["category_scores"]["confidence"]["score"] > eval_b["category_scores"]["confidence"]["score"]
    assert eval_a["category_scores"]["technical_relevance"]["score"] > eval_b["category_scores"]["technical_relevance"]["score"]
    assert eval_a["category_scores"]["professionalism"]["score"] > eval_b["category_scores"]["professionalism"]["score"]

    # AI Feedback Customization Verification
    assert feedback_a["strengths"] != feedback_b["strengths"]
    assert len(feedback_b["weaknesses"]) >= 1

