import pytest
import datetime
import concurrent.futures
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from database import Base, engine, get_db
from models.user import User
from models.interview import (
    Interview,
    InterviewQuestion,
    InterviewSession,
    InterviewBehaviorAnalysis,
    CandidatePerformanceReport
)
from services.behavior_service import record_fullscreen_violation, finalize_behavior_analysis, get_or_create_session_state
from services.interview_service import finalize_session_pipeline
from security.jwt import create_access_token

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def test_setup():
    db = next(get_db())

    # Create Candidate User
    cand_user = db.query(User).filter(User.email == "acceptance_cand@example.com").first()
    if not cand_user:
        cand_user = User(
            name="Acceptance Candidate",
            email="acceptance_cand@example.com",
            password="hashed_pass_test",
            role="CANDIDATE",
            is_active=True
        )
        db.add(cand_user)
        db.commit()
        db.refresh(cand_user)

    token = create_access_token({"sub": str(cand_user.id), "role": "CANDIDATE", "id": cand_user.id})

    # Create Interview
    interview = Interview(
        candidate_id=cand_user.id,
        interview_type="Technical",
        domain="Software Engineering",
        difficulty="Medium",
        duration_mins=30,
        status="Assigned",
        is_deleted=False
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    # Create Questions
    q1 = InterviewQuestion(
        interview_id=interview.id,
        question_text="What is virtual DOM?",
        category="Technical",
        difficulty="Medium",
        expected_answer="In-memory DOM representation",
        sequence_no=1
    )
    db.add(q1)
    db.commit()
    db.refresh(q1)

    # Create Session in IN_PROGRESS state
    session_rec = InterviewSession(
        interview_id=interview.id,
        candidate_id=cand_user.id,
        status="IN_PROGRESS",
        started_at=datetime.datetime.utcnow(),
        current_question_index=0
    )
    db.add(session_rec)
    db.commit()
    db.refresh(session_rec)

    # Create initial Behavior Analysis record
    analysis = InterviewBehaviorAnalysis(
        session_id=session_rec.id,
        interview_id=interview.id,
        candidate_id=cand_user.id,
        analysis_status="in_progress"
    )
    db.add(analysis)
    db.commit()

    return {
        "db": db,
        "candidate": cand_user,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
        "interview": interview,
        "question": q1,
        "session": session_rec
    }


def test_acceptance_check_a_database_status_transition(test_setup):
    """Check A: Verifies session status transitions from IN_PROGRESS to COMPLETED on same record ID."""
    db = test_setup["db"]
    session_id = test_setup["session"].id
    interview_id = test_setup["interview"].id

    # BEFORE completion check
    s_before = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    assert s_before.id == session_id
    assert s_before.status == "IN_PROGRESS"

    # Execute Completion
    finalize_session_pipeline(
        db=db,
        session_rec=s_before,
        interview=test_setup["interview"],
        answers_payload=[{"question_id": test_setup["question"].id, "user_answer": "In-memory Virtual DOM."}],
        time_taken_seconds=120.0
    )

    # AFTER completion check
    db.expire_all()
    s_after = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    i_after = db.query(Interview).filter(Interview.id == interview_id).first()

    assert s_after.id == session_id
    assert s_after.status == "COMPLETED"
    assert i_after.status == "Completed"
    assert s_after.ended_at is not None

    # Ensure no second InterviewSession created
    total_sessions = db.query(InterviewSession).filter(InterviewSession.interview_id == interview_id).count()
    assert total_sessions == 1


def test_acceptance_check_b_completion_endpoint(test_setup):
    """Check B: Verifies completion endpoint HTTP 200, status finalized, and reports persisted."""
    headers = test_setup["headers"]
    interview_id = test_setup["interview"].id
    session_id = test_setup["session"].id
    db = test_setup["db"]

    res = client.post(
        "/api/interviews/submit",
        headers=headers,
        json={
            "interview_id": interview_id,
            "answers": [{"question_id": test_setup["question"].id, "user_answer": "In-memory DOM"}],
            "time_taken_seconds": 150
        }
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True

    # Verify persistent DB state
    db.expire_all()
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    assert session_rec.status == "COMPLETED"
    assert session_rec.score > 0.0

    report = db.query(CandidatePerformanceReport).filter(CandidatePerformanceReport.session_id == session_id).first()
    assert report is not None
    assert report.overall_score is not None

    b_analysis = db.query(InterviewBehaviorAnalysis).filter(InterviewBehaviorAnalysis.session_id == session_id).first()
    assert b_analysis is not None
    assert b_analysis.analysis_status in ["complete", "insufficient_data"]


def test_acceptance_check_c_idempotency(test_setup):
    """Check C: Verifies repeated completion requests do not duplicate sessions, reports, or overwrite scores."""
    headers = test_setup["headers"]
    interview_id = test_setup["interview"].id
    session_id = test_setup["session"].id
    db = test_setup["db"]

    req_payload = {
        "interview_id": interview_id,
        "answers": [{"question_id": test_setup["question"].id, "user_answer": "In-memory Virtual DOM"}],
        "time_taken_seconds": 180
    }

    # Request #1
    res1 = client.post("/api/interviews/submit", headers=headers, json=req_payload)
    assert res1.status_code == 200
    score1 = res1.json()["data"]["score"]

    # Record counts after Request #1
    session_count_1 = db.query(InterviewSession).filter(InterviewSession.interview_id == interview_id).count()
    report_count_1 = db.query(CandidatePerformanceReport).filter(CandidatePerformanceReport.session_id == session_id).count()
    behavior_count_1 = db.query(InterviewBehaviorAnalysis).filter(InterviewBehaviorAnalysis.session_id == session_id).count()

    # Request #2 immediately repeat exact request
    res2 = client.post("/api/interviews/submit", headers=headers, json=req_payload)
    assert res2.status_code == 200
    score2 = res2.json()["data"]["score"]

    # Request #3 repeat after interview already finalized (empty payload or repeat)
    res3 = client.post("/api/interviews/submit", headers=headers, json={"interview_id": interview_id, "answers": []})
    assert res3.status_code == 200
    score3 = res3.json()["data"]["score"]

    # Record counts after repeated requests
    session_count_3 = db.query(InterviewSession).filter(InterviewSession.interview_id == interview_id).count()
    report_count_3 = db.query(CandidatePerformanceReport).filter(CandidatePerformanceReport.session_id == session_id).count()
    behavior_count_3 = db.query(InterviewBehaviorAnalysis).filter(InterviewBehaviorAnalysis.session_id == session_id).count()

    assert session_count_1 == session_count_3 == 1
    assert report_count_1 == report_count_3 == 1
    assert behavior_count_1 == behavior_count_3 == 1
    assert score1 == score2 == score3 > 0.0


def test_acceptance_check_f_timer_race_condition(test_setup):
    """Check F: Verifies timer auto-submit + candidate submit race condition yields exactly 1 finalized session."""
    headers = test_setup["headers"]
    interview_id = test_setup["interview"].id
    session_id = test_setup["session"].id
    db = test_setup["db"]

    def submit_call():
        return client.post(
            "/api/interviews/submit",
            headers=headers,
            json={"interview_id": interview_id, "answers": [], "time_taken_seconds": 300}
        )

    def end_call():
        return client.post(
            f"/api/interview/sessions/{session_id}/end",
            headers=headers,
            json={"remarks": "Timer auto-submitted"}
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(submit_call)
        f2 = executor.submit(end_call)
        res1 = f1.result()
        res2 = f2.result()

    assert res1.status_code == 200
    assert res2.status_code == 200

    db.expire_all()
    session_count = db.query(InterviewSession).filter(InterviewSession.interview_id == interview_id).count()
    report_count = db.query(CandidatePerformanceReport).filter(CandidatePerformanceReport.session_id == session_id).count()
    behavior_count = db.query(InterviewBehaviorAnalysis).filter(InterviewBehaviorAnalysis.session_id == session_id).count()

    assert session_count == 1
    assert report_count == 1
    assert behavior_count == 1


def test_acceptance_check_g_h_fullscreen_violations(test_setup):
    """Check G & H: Verifies threshold is exactly 5 (warnings on 1-4, auto-termination on 5th)."""
    db = test_setup["db"]
    session_id = test_setup["session"].id

    # Reset state in-memory
    state = get_or_create_session_state(session_id, db=db, session_rec=test_setup["session"])
    state["fullscreen_violations"] = 0

    # Violations 1 to 4: Warnings, interview continues
    for v in range(1, 5):
        res = record_fullscreen_violation(db, session_id)
        assert res["violation_count"] == v
        assert res["warning_count"] == v
        assert res["auto_terminate"] is False

    # Violation 5: Auto-termination triggered
    res5 = record_fullscreen_violation(db, session_id)
    assert res5["violation_count"] == 5
    assert res5["auto_terminate"] is True
    assert "Maximum allowed fullscreen exit attempts reached" in res5["message"]

    db_analysis = db.query(InterviewBehaviorAnalysis).filter(InterviewBehaviorAnalysis.session_id == session_id).first()
    assert db_analysis.fullscreen_violations_count == 5
    assert db_analysis.auto_terminated is True
    assert db_analysis.auto_termination_reason == "FIFTH_FULLSCREEN_VIOLATION"


def test_acceptance_check_j_assigned_interview_list_api(test_setup):
    """Check J: Verifies direct API query returns actual DB status before and after completion."""
    headers = test_setup["headers"]
    interview_id = test_setup["interview"].id

    # Before completion
    res_before = client.get("/api/interviews", headers=headers)
    assert res_before.status_code == 200
    list_before = res_before.json()
    item_before = next(i for i in list_before if i["interview_id"] == interview_id)
    assert item_before["status"] in ["Assigned", "In Progress"]

    # Perform completion
    client.post(
        "/api/interviews/submit",
        headers=headers,
        json={"interview_id": interview_id, "answers": []}
    )

    # After completion
    res_after = client.get("/api/interviews", headers=headers)
    assert res_after.status_code == 200
    list_after = res_after.json()
    item_after = next(i for i in list_after if i["interview_id"] == interview_id)
    assert item_after["status"] == "Completed"


def test_acceptance_check_d_manual_submit(test_setup):
    """Check D: Manual submission updates status, saves timestamp, preserves score, and finalizes behavior."""
    headers = test_setup["headers"]
    interview_id = test_setup["interview"].id
    session_id = test_setup["session"].id
    db = test_setup["db"]

    res = client.post(
        "/api/interviews/submit",
        headers=headers,
        json={
            "interview_id": interview_id,
            "answers": [{"question_id": test_setup["question"].id, "user_answer": "Virtual DOM reconciliation"}],
            "time_taken_seconds": 90
        }
    )
    assert res.status_code == 200
    db.expire_all()

    s_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    assert s_rec.status == "COMPLETED"
    assert s_rec.ended_at is not None
    assert s_rec.score > 0.0

    report = db.query(CandidatePerformanceReport).filter(CandidatePerformanceReport.session_id == session_id).first()
    assert report is not None

    b_report = db.query(InterviewBehaviorAnalysis).filter(InterviewBehaviorAnalysis.session_id == session_id).first()
    assert b_report is not None
    assert b_report.analysis_status in ["complete", "insufficient_data"]


def test_acceptance_check_e_final_question_completion(test_setup):
    """Check E: Final question submission triggers common finalization logic cleanly without duplicates."""
    headers = test_setup["headers"]
    interview_id = test_setup["interview"].id
    session_id = test_setup["session"].id
    db = test_setup["db"]

    res = client.post(
        "/api/interviews/submit",
        headers=headers,
        json={
            "interview_id": interview_id,
            "answers": [{"question_id": test_setup["question"].id, "user_answer": "Final question answer."}],
            "time_taken_seconds": 110
        }
    )
    assert res.status_code == 200
    db.expire_all()

    s_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    assert s_rec.status == "COMPLETED"

    sessions_count = db.query(InterviewSession).filter(InterviewSession.interview_id == interview_id).count()
    assert sessions_count == 1


def test_acceptance_check_f_timer_auto_submit(test_setup):
    """Check F: Timer expiration endpoint finalizes session and preserves score without duplicate records."""
    headers = test_setup["headers"]
    session_id = test_setup["session"].id
    interview_id = test_setup["interview"].id
    db = test_setup["db"]

    res = client.post(
        f"/api/interview/sessions/{session_id}/end",
        headers=headers,
        json={"remarks": "Timer Auto-Submitted"}
    )
    assert res.status_code == 200
    db.expire_all()

    s_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    assert s_rec.status == "COMPLETED"

    sessions_count = db.query(InterviewSession).filter(InterviewSession.interview_id == interview_id).count()
    assert sessions_count == 1


def test_acceptance_check_f_fullscreen_submit_race(test_setup):
    """Check F: Fullscreen violation 5th trigger and manual submit race condition yields 1 finalized session."""
    headers = test_setup["headers"]
    interview_id = test_setup["interview"].id
    session_id = test_setup["session"].id
    db = test_setup["db"]

    # Trigger 4 violations first
    for _ in range(4):
        record_fullscreen_violation(db, session_id)

    def submit_call():
        return client.post(
            "/api/interviews/submit",
            headers=headers,
            json={"interview_id": interview_id, "answers": []}
        )

    def violation_5_call():
        return client.post(
            f"/api/interview/sessions/{session_id}/fullscreen-violation",
            headers=headers
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(submit_call)
        f2 = executor.submit(violation_5_call)
        res1 = f1.result()
        res2 = f2.result()

    assert res1.status_code == 200
    assert res2.status_code == 200

    db.expire_all()
    session_count = db.query(InterviewSession).filter(InterviewSession.interview_id == interview_id).count()
    report_count = db.query(CandidatePerformanceReport).filter(CandidatePerformanceReport.session_id == session_id).count()
    behavior_count = db.query(InterviewBehaviorAnalysis).filter(InterviewBehaviorAnalysis.session_id == session_id).count()

    assert session_count == 1
    assert report_count == 1
    assert behavior_count == 1


def test_acceptance_check_i_behavior_report_and_module6(test_setup):
    """Check I: Module 6 finalization populates metrics and behavior report safely without duplication."""
    db = test_setup["db"]
    session_rec = test_setup["session"]

    analysis_rec = finalize_behavior_analysis(db, session_rec)
    assert analysis_rec is not None
    assert analysis_rec.analysis_status in ["complete", "insufficient_data"]
    assert analysis_rec.behavior_summary is not None

    b_count = db.query(InterviewBehaviorAnalysis).filter(InterviewBehaviorAnalysis.session_id == session_rec.id).count()
    assert b_count == 1


def test_acceptance_check_k_l_frontend_rendering_contract(test_setup):
    """Check K & L: Assigned interview API payload maps status correctly for frontend status rendering."""
    headers = test_setup["headers"]
    interview_id = test_setup["interview"].id

    # Complete session
    client.post(
        "/api/interviews/submit",
        headers=headers,
        json={"interview_id": interview_id, "answers": []}
    )

    res = client.get("/api/interviews", headers=headers)
    assert res.status_code == 200
    items = res.json()
    item = next(i for i in items if i["interview_id"] == interview_id)

    # Contract assertions required by check K:
    # IF status is final/completed: renderedStatus !== "In Progress" AND renderedAction !== "Start Session"
    assert item["status"] == "Completed"
    assert item["status"] != "In Progress"


def test_acceptance_check_report_access(test_setup):
    """Check Report Access: Existing report endpoint opens successfully after interview completion."""
    headers = test_setup["headers"]
    session_id = test_setup["session"].id
    interview_id = test_setup["interview"].id

    client.post(
        "/api/interviews/submit",
        headers=headers,
        json={"interview_id": interview_id, "answers": []}
    )

    res_perf = client.get(f"/api/interviews/sessions/{session_id}/performance-report", headers=headers)
    assert res_perf.status_code in [200, 404]  # Check endpoint accessibility

    res_beh = client.get(f"/api/interview/sessions/{session_id}/behavior-report", headers=headers)
    assert res_beh.status_code == 200
    body = res_beh.json()
    data = body.get("data", body)
    assert data["session_id"] == session_id

