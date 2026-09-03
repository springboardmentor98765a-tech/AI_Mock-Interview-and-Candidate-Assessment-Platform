import pytest
from unittest.mock import MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from database import Base
from models.user import User
from models.interview import Interview, InterviewSession, InterviewQuestion, CandidatePerformanceReport, InterviewBehaviorAnalysis
from schemas.interview import InterviewStartRequest, InterviewSubmitRequest, InterviewSessionCreateRequest
from services.interview_service import (
    start_interview_service,
    submit_interview_service,
    create_interview_session_service,
    list_interviews_service,
    end_session_service,
    get_prioritized_session_for_interview,
    get_active_session_by_interview_service
)
from services.behavior_service import record_fullscreen_violation


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


@pytest.fixture(scope="function")
def candidate_user(db_session: Session):
    user = User(id=101, name="Alice Candidate", email="alice.lifecycle@test.com", role="CANDIDATE")
    db_session.add(user)
    db_session.commit()
    return user


def test_1_normal_completion(db_session: Session, candidate_user: User):
    """Test 1: Start interview -> Submit -> Verify session and interview are permanently COMPLETED."""
    interview = Interview(candidate_id=candidate_user.id, domain="Frontend Engineering", status="Assigned")
    db_session.add(interview)
    db_session.commit()

    q1 = InterviewQuestion(interview_id=interview.id, sequence_no=1, question_text="Explain Virtual DOM", category="Technical")
    db_session.add(q1)
    db_session.commit()

    # Start session
    start_req = InterviewStartRequest(interview_id=interview.id)
    start_res = start_interview_service(candidate_user, start_req, db_session)
    assert start_res["status"] == "In Progress" or start_res["status"] == "IN_PROGRESS"

    # Submit interview
    sub_req = InterviewSubmitRequest(
        interview_id=interview.id,
        answers=[{"question_id": q1.id, "user_answer": "Virtual DOM is a lightweight JS copy of real DOM."}],
        time_taken_seconds=180
    )
    sub_res = submit_interview_service(candidate_user, sub_req, db_session)

    assert sub_res["status"] == "Completed"
    assert sub_res["already_completed"] is False

    # Check DB state
    session_rec = db_session.query(InterviewSession).filter(InterviewSession.interview_id == interview.id).first()
    assert session_rec.status == "COMPLETED"
    assert interview.status == "Completed"


def test_2_page_refresh_list_fetch(db_session: Session, candidate_user: User):
    """Test 2: Fetch assigned interviews after completion -> Verify status remains Completed."""
    interview = Interview(candidate_id=candidate_user.id, domain="Backend Engineering", status="Completed")
    db_session.add(interview)
    db_session.commit()

    session_rec = InterviewSession(interview_id=interview.id, candidate_id=candidate_user.id, status="COMPLETED")
    db_session.add(session_rec)
    db_session.commit()

    items = list_interviews_service(candidate_user, db_session)
    assert len(items) == 1
    assert items[0].status == "Completed"


def test_3_start_after_completion(db_session: Session, candidate_user: User):
    """Test 3: Attempting to start a completed interview returns already_completed and creates no new session."""
    interview = Interview(candidate_id=candidate_user.id, domain="System Design", status="Completed")
    db_session.add(interview)
    db_session.commit()

    original_session = InterviewSession(interview_id=interview.id, candidate_id=candidate_user.id, status="COMPLETED")
    db_session.add(original_session)
    db_session.commit()

    # Call start_interview_service
    start_req = InterviewStartRequest(interview_id=interview.id)
    res1 = start_interview_service(candidate_user, start_req, db_session)

    assert res1["already_completed"] is True
    assert res1["status"] == "COMPLETED"

    # Call create_interview_session_service
    res2 = create_interview_session_service(candidate_user, {"interview_id": interview.id}, db_session)
    assert res2["session"]["status"] == "COMPLETED"

    # Assert ONLY one session exists
    all_sessions = db_session.query(InterviewSession).filter(InterviewSession.interview_id == interview.id).all()
    assert len(all_sessions) == 1
    assert all_sessions[0].id == original_session.id


def test_4_duplicate_submit_request(db_session: Session, candidate_user: User):
    """Test 4: Sending Submit twice returns the existing completed session without duplicate reports."""
    interview = Interview(candidate_id=candidate_user.id, domain="DevOps", status="Assigned")
    db_session.add(interview)
    db_session.commit()

    q1 = InterviewQuestion(interview_id=interview.id, sequence_no=1, question_text="What is Docker?", category="Technical")
    db_session.add(q1)
    db_session.commit()

    sub_req = InterviewSubmitRequest(
        interview_id=interview.id,
        answers=[{"question_id": q1.id, "user_answer": "Docker is a containerization platform."}],
        time_taken_seconds=120
    )

    # First Submit
    res1 = submit_interview_service(candidate_user, sub_req, db_session)
    assert res1["already_completed"] is False
    assert res1["status"] == "Completed"

    # Second Submit (Duplicate)
    res2 = submit_interview_service(candidate_user, sub_req, db_session)
    assert res2["already_completed"] is True
    assert res2["status"] == "Completed"

    # Verify session count is still 1
    all_sessions = db_session.query(InterviewSession).filter(InterviewSession.interview_id == interview.id).all()
    assert len(all_sessions) == 1


def test_5_existing_in_progress_session_reuse(db_session: Session, candidate_user: User):
    """Test 5: Call Create/Start while IN_PROGRESS returns existing session without spawning duplicates."""
    interview = Interview(candidate_id=candidate_user.id, domain="Security", status="In Progress")
    db_session.add(interview)
    db_session.commit()

    sess1 = InterviewSession(interview_id=interview.id, candidate_id=candidate_user.id, status="IN_PROGRESS")
    db_session.add(sess1)
    db_session.commit()

    # Call create_interview_session_service
    res1 = create_interview_session_service(candidate_user, {"interview_id": interview.id}, db_session)
    assert res1["session"]["id"] == sess1.id

    # Call start_interview_service
    res2 = start_interview_service(candidate_user, InterviewStartRequest(interview_id=interview.id), db_session)
    assert res2["session_id"] == sess1.id

    all_sessions = db_session.query(InterviewSession).filter(InterviewSession.interview_id == interview.id).all()
    assert len(all_sessions) == 1


def test_6_terminal_state_precedence(db_session: Session, candidate_user: User):
    """Test 6: Historical duplicate sessions (COMPLETED + IN_PROGRESS) prioritize COMPLETED state."""
    interview = Interview(candidate_id=candidate_user.id, domain="Data Engineering", status="In Progress")
    db_session.add(interview)
    db_session.commit()

    # Older session is COMPLETED
    s1 = InterviewSession(interview_id=interview.id, candidate_id=candidate_user.id, status="COMPLETED")
    db_session.add(s1)
    db_session.commit()

    # Stale duplicate session created by old bug in IN_PROGRESS state
    s2 = InterviewSession(interview_id=interview.id, candidate_id=candidate_user.id, status="IN_PROGRESS")
    db_session.add(s2)
    db_session.commit()

    prioritized = get_prioritized_session_for_interview(db_session, interview.id, candidate_user.id)
    assert prioritized.id == s1.id
    assert prioritized.status == "COMPLETED"

    items = list_interviews_service(candidate_user, db_session)
    assert items[0].status == "Completed"


def test_7_fullscreen_violation_independence_and_5th_termination(db_session: Session, candidate_user: User):
    """Test 7: 4 fullscreen violations issue warnings; 5th violation terminates session to TERMINATED."""
    interview = Interview(candidate_id=candidate_user.id, domain="QA Engineering", status="In Progress")
    db_session.add(interview)
    db_session.commit()

    session_rec = InterviewSession(interview_id=interview.id, candidate_id=candidate_user.id, status="IN_PROGRESS")
    db_session.add(session_rec)
    db_session.commit()

    # Violations 1 to 4
    for i in range(1, 5):
        res = record_fullscreen_violation(db_session, session_rec.id)
        assert res["violation_count"] == i
        assert res["auto_terminate"] is False
        assert session_rec.status == "IN_PROGRESS"

    # 5th Violation -> Auto terminate
    res_5 = record_fullscreen_violation(db_session, session_rec.id)
    assert res_5["violation_count"] == 5
    assert res_5["auto_terminate"] is True
    assert session_rec.status == "TERMINATED"
    assert interview.status == "Terminated"

    # Attempt 6th violation post-termination -> Counter unchanged
    res_6 = record_fullscreen_violation(db_session, session_rec.id)
    assert res_6["auto_terminate"] is False
    assert res_6["violation_count"] == 5


def test_8_post_completion_violation(db_session: Session, candidate_user: User):
    """Test 8: Call fullscreen violation endpoint on completed session -> Skipped without increment."""
    interview = Interview(candidate_id=candidate_user.id, domain="AI Engineering", status="Completed")
    db_session.add(interview)
    db_session.commit()

    session_rec = InterviewSession(interview_id=interview.id, candidate_id=candidate_user.id, status="COMPLETED")
    db_session.add(session_rec)
    db_session.commit()

    res = record_fullscreen_violation(db_session, session_rec.id)
    assert res["auto_terminate"] is False
    assert "skipped" in res["message"].lower() or "completed" in res["message"].lower()
    assert session_rec.status == "COMPLETED"


def test_9_repeated_start_bug_regression(db_session: Session, candidate_user: User):
    """Test 9: Start -> Submit cycle cannot repeat 5 times or spawn duplicate sessions."""
    interview = Interview(candidate_id=candidate_user.id, domain="Cloud Architecture", status="Assigned")
    db_session.add(interview)
    db_session.commit()

    q1 = InterviewQuestion(interview_id=interview.id, sequence_no=1, question_text="What is AWS S3?", category="Technical")
    db_session.add(q1)
    db_session.commit()

    # Cycle 1: Start & Submit
    start_interview_service(candidate_user, InterviewStartRequest(interview_id=interview.id), db_session)
    submit_interview_service(candidate_user, InterviewSubmitRequest(
        interview_id=interview.id,
        answers=[{"question_id": q1.id, "user_answer": "AWS S3 is object storage."}],
        time_taken_seconds=60
    ), db_session)

    # Attempt Cycle 2 to 5
    for attempt in range(2, 6):
        start_res = start_interview_service(candidate_user, InterviewStartRequest(interview_id=interview.id), db_session)
        assert start_res["already_completed"] is True
        assert start_res["status"] == "COMPLETED"

    # Verify only 1 session exists and state is permanently Completed
    all_sessions = db_session.query(InterviewSession).filter(InterviewSession.interview_id == interview.id).all()
    assert len(all_sessions) == 1
    assert interview.status == "Completed"


def test_10_database_api_reload(db_session: Session, candidate_user: User):
    """Test 10: Complete interview and verify fresh database query confirms Completed status."""
    interview = Interview(candidate_id=candidate_user.id, domain="Mobile Engineering", status="Assigned")
    db_session.add(interview)
    db_session.commit()

    q1 = InterviewQuestion(interview_id=interview.id, sequence_no=1, question_text="What is Flutter?", category="Technical")
    db_session.add(q1)
    db_session.commit()

    submit_interview_service(candidate_user, InterviewSubmitRequest(
        interview_id=interview.id,
        answers=[{"question_id": q1.id, "user_answer": "Flutter is a UI toolkit for cross-platform apps."}],
        time_taken_seconds=90
    ), db_session)

    # Fresh query directly from DB
    reloaded_interview = db_session.query(Interview).filter(Interview.id == interview.id).first()
    reloaded_session = db_session.query(InterviewSession).filter(InterviewSession.interview_id == interview.id).first()

    assert reloaded_interview.status == "Completed"
    assert reloaded_session.status == "COMPLETED"
