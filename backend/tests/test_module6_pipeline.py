import os
try:
    import cv2
except ImportError:
    cv2 = None
import uuid
import pytest
import datetime
import numpy as np
import torch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models.user import User
from models.candidate import CandidateProfile
from models.interview import (
    Interview,
    InterviewQuestion,
    InterviewSession,
    InterviewQuestionAttempt,
    InterviewBehaviorAnalysis
)
from services.behavior_service import (
    process_frame_sample,
    record_fullscreen_violation,
    finalize_behavior_analysis,
    get_or_create_behavior_analysis,
    get_or_create_session_state
)
from services.interview_service import finalize_session_pipeline
from services.vision_service import vision_service
from ml_models.train_confidence import load_and_preprocess_dataset

TEST_DB_URL = "sqlite:///./test_module6_pipeline.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module")
def setup_module_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    engine.dispose()
    if os.path.exists("./test_module6_pipeline.db"):
        try:
            os.remove("./test_module6_pipeline.db")
        except Exception:
            pass


@pytest.fixture(scope="function")
def create_fresh_session(setup_module_db):
    db = setup_module_db
    unique_email = f"m6_cand_{uuid.uuid4().hex[:8]}@smarthire.ai"
    user = User(name="Module6 Test Candidate", email=unique_email, role="CANDIDATE")
    db.add(user)
    db.commit()
    db.refresh(user)

    cand_profile = CandidateProfile(user_id=user.id, phone="555-0199", ats_score=85.0)
    db.add(cand_profile)
    db.commit()

    interview = Interview(candidate_id=user.id, domain="Software Engineering", interview_type="Technical", status="Assigned")
    db.add(interview)
    db.commit()
    db.refresh(interview)

    q1 = InterviewQuestion(interview_id=interview.id, sequence_no=1, question_text="What is React virtual DOM?", category="Technical", expected_answer="In-memory representation of real DOM.")
    db.add(q1)
    db.commit()

    session_rec = InterviewSession(interview_id=interview.id, candidate_id=user.id, status="IN_PROGRESS")
    db.add(session_rec)
    db.commit()
    db.refresh(session_rec)

    # 1. Behavior analysis record created at session start
    analysis_rec = get_or_create_behavior_analysis(db, session_rec)
    assert analysis_rec is not None
    assert analysis_rec.session_id == session_rec.id
    assert analysis_rec.analysis_status in ["in_progress", "partial"]

    yield db, user, interview, session_rec, analysis_rec


def test_models_loading_and_inference_on_datasets():
    # 1. Confidence model loading & 3-way split dataset test
    assert vision_service is not None
    assert vision_service.confidence_model is not None
    assert vision_service.emotion_model is not None

    train_samples, val_samples, test_samples, stats = load_and_preprocess_dataset()
    assert stats["matched_samples"] > 2000
    assert len(train_samples) > 0 and len(val_samples) > 0 and len(test_samples) > 0

    # 2. Confidence inference on actual dataset sample
    sample_img_path = train_samples[0][0]
    bgr_sample = cv2.imread(sample_img_path)
    assert bgr_sample is not None
    res = vision_service.analyze_frame(bgr_sample)
    assert res["confidence_prediction"] in ["Confident", "Unconfident", "Neutral", "No Face"]
    assert res["emotion_prediction"] in vision_service.emotion_labels + ["no_face"]


def test_look_away_timing_and_cooldown(create_fresh_session):
    db, user, interview, session_rec, analysis_rec = create_fresh_session
    session_id = session_rec.id

    # Brief look-away (<3s) does NOT trigger warning
    frame_facing = {"frame_valid": True, "analysis_status": "OK", "face_detected": True, "gaze_available": True, "is_facing_screen": True, "confidence_prediction": "Confident", "emotion_prediction": "neutral", "mobile_detected": False}
    frame_away = {"frame_valid": True, "analysis_status": "OK", "face_detected": True, "gaze_available": True, "is_facing_screen": False, "confidence_prediction": "Unconfident", "emotion_prediction": "neutral", "mobile_detected": False}

    res_brief = process_frame_sample(db, session_rec, frame_away)
    assert res_brief["trigger_look_away_warning"] is False

    # Continuous camera-facing deviation >= 3s triggers warning once
    state = get_or_create_session_state(session_id)
    state["active_look_away_start"] = datetime.datetime.utcnow() - datetime.timedelta(seconds=3.5)

    res_sustained = process_frame_sample(db, session_rec, frame_away)
    assert res_sustained["trigger_look_away_warning"] is True

    # Immediate second sample does NOT spam popup warning
    res_spam_check = process_frame_sample(db, session_rec, frame_away)
    assert res_spam_check["trigger_look_away_warning"] is False


def test_low_light_frame_handling(create_fresh_session):
    db, user, interview, session_rec, analysis_rec = create_fresh_session

    dark_image = np.zeros((240, 320, 3), dtype=np.uint8)
    res = vision_service.analyze_frame(dark_image)

    assert res["frame_valid"] is False
    assert res["analysis_status"] == "LOW_LIGHT"
    assert res["face_detected"] is False

    # Verify low light frame does NOT trigger face absence violation
    b_res = process_frame_sample(db, session_rec, res)
    assert b_res["trigger_face_not_detected_warning"] is False


def test_mobile_single_vs_multi_frame_state_management(create_fresh_session):
    db, user, interview, session_rec, analysis_rec = create_fresh_session
    session_id = session_rec.id

    frame_single_mobile = {"frame_valid": True, "analysis_status": "OK", "face_detected": True, "is_facing_screen": True, "confidence_prediction": "Confident", "emotion_prediction": "neutral", "mobile_detected": True, "mobile_confidence": 0.88}
    frame_clear = {"frame_valid": True, "analysis_status": "OK", "face_detected": True, "is_facing_screen": True, "confidence_prediction": "Confident", "emotion_prediction": "neutral", "mobile_detected": False, "mobile_confidence": 0.0}

    # 1. Single isolated detection does NOT trigger confirmed event
    res1 = process_frame_sample(db, session_rec, frame_single_mobile)
    assert res1["multi_frame_mobile_confirmed"] is False
    assert res1["trigger_mobile_warning"] is False

    process_frame_sample(db, session_rec, frame_clear)
    process_frame_sample(db, session_rec, frame_clear)

    # 2. 2-out-of-3 detection hit sets active start timer
    process_frame_sample(db, session_rec, frame_single_mobile)
    res_m2 = process_frame_sample(db, session_rec, frame_single_mobile)
    assert res_m2["multi_frame_mobile_confirmed"] is True

    # 3. Simulate sustained duration >= 1.5 seconds
    state = get_or_create_session_state(session_id)
    state["active_mobile_start"] = datetime.datetime.utcnow() - datetime.timedelta(seconds=1.6)

    res_m3 = process_frame_sample(db, session_rec, frame_single_mobile)
    assert res_m3["trigger_mobile_warning"] is True
    assert len(state["confirmed_mobile_events"]) == 1
    assert state["confirmed_mobile_events"][0]["peak_confidence"] == 0.88


def test_fullscreen_violations_and_fifth_violation_safe_finalization(create_fresh_session):
    db, user, interview, session_rec, analysis_rec = create_fresh_session
    session_id = session_rec.id

    # Violations 1 to 4 issue warnings and do NOT auto-terminate
    for v in range(1, 5):
        res = record_fullscreen_violation(db, session_id)
        assert res["violation_count"] == v
        assert res["warning_count"] == v
        assert res["auto_terminate"] is False

    # 5th Violation safely auto-submits without data loss
    res_5th = record_fullscreen_violation(db, session_id)
    assert res_5th["violation_count"] == 5
    assert res_5th["auto_terminate"] is True

    # Unified Finalization Pipeline Execution
    answers_payload = [{"question_id": interview.questions[0].id, "user_answer": "In-memory representation of real DOM."}]
    final_res = finalize_session_pipeline(
        db=db,
        session_rec=session_rec,
        interview=interview,
        answers_payload=answers_payload,
        time_taken_seconds=120.0,
        termination_reason="FIFTH_FULLSCREEN_VIOLATION"
    )

    assert final_res["status"] == "Completed"
    assert final_res["score"] > 0.0
    assert final_res["termination_reason"] == "FIFTH_FULLSCREEN_VIOLATION"

    # Verify answers, recordings, and Module 6 data preserved in DB
    db_analysis = db.query(InterviewBehaviorAnalysis).filter(InterviewBehaviorAnalysis.session_id == session_id).first()
    assert db_analysis is not None
    assert db_analysis.fullscreen_violations_count == 5
    assert db_analysis.auto_terminated is True
    assert db_analysis.auto_termination_reason == "FIFTH_FULLSCREEN_VIOLATION"
    assert db_analysis.analysis_status in ["complete", "insufficient_data"]


def test_report_generation_with_partial_data(create_fresh_session):
    db, user, interview, session_rec, analysis_rec = create_fresh_session

    report = finalize_behavior_analysis(db, session_rec)
    assert report is not None
    assert report.session_id == session_rec.id
    assert report.analysis_status in ["complete", "insufficient_data"]
    assert report.fullscreen_violations_count == 0


def test_gaze_unavailable_eligibility(create_fresh_session):
    """Tests that frames with gaze_available=False do NOT count towards eye contact or trigger violations."""
    db, user, interview, session_rec, analysis_rec = create_fresh_session
    session_id = session_rec.id

    frame_no_gaze = {
        "frame_valid": True,
        "analysis_status": "OK",
        "face_detected": True,
        "gaze_available": False,
        "is_facing_screen": False,
        "confidence_prediction": "Confident"
    }

    res = process_frame_sample(db, session_rec, frame_no_gaze)
    assert res["trigger_look_away_warning"] is False

    state = get_or_create_session_state(session_id)
    assert len(state["look_away_events"]) == 0
    assert analysis_rec.eye_contact_percentage is None


def test_restart_resilience_and_report(create_fresh_session):
    """Tests that server restart reconstructs persistent violations from database state."""
    db, user, interview, session_rec, analysis_rec = create_fresh_session
    session_id = session_rec.id

    # 1. Add sustained face absence with timeline entries
    state = get_or_create_session_state(session_id)
    t_start = (datetime.datetime.utcnow() - datetime.timedelta(seconds=4.0)).isoformat()
    t_now = datetime.datetime.utcnow().isoformat()
    
    state["timeline"].append({"timestamp": t_start, "frame_valid": True, "analysis_status": "NO_FACE", "face_detected": False, "is_facing_screen": False})
    state["timeline"].append({"timestamp": t_now, "frame_valid": True, "analysis_status": "NO_FACE", "face_detected": False, "is_facing_screen": False})
    state["active_absence_start"] = datetime.datetime.utcnow() - datetime.timedelta(seconds=4.0)

    frame_no_face = {
        "frame_valid": True,
        "analysis_status": "NO_FACE",
        "face_detected": False
    }

    process_frame_sample(db, session_rec, frame_no_face)
    assert len(state["face_absence_events"]) >= 1

    # 2. Simulate Backend Server Restart (clear in-memory state dictionary)
    from services.behavior_service import SESSION_BEHAVIOR_STATES
    SESSION_BEHAVIOR_STATES.pop(session_id, None)

    # 3. Fetch state after restart
    new_state = get_or_create_session_state(session_id, db=db, session_rec=session_rec)
    assert len(new_state["face_absence_events"]) >= 1

    # 4. Generate behavior report after restart
    from services.behavior_service import get_behavior_report_dict
    report_data = get_behavior_report_dict(db, session_rec, analysis_rec)
    assert report_data["violations_summary"]["total"] >= 1
    assert report_data["violations_summary"]["face_not_detected"] >= 1


def test_confidence_inference_failure_safe_handling(create_fresh_session):
    """Tests that when confidence model returns None, analyze_frame and process_frame_sample do not crash."""
    from services.vision_service import vision_service
    import numpy as np

    dummy_bgr = np.full((480, 640, 3), 128, dtype=np.uint8)
    # Simulate confidence model failure
    orig_loaded = vision_service.confidence_model_loaded
    vision_service.confidence_model_loaded = False

    try:
        analysis = vision_service.analyze_frame(dummy_bgr)
        assert analysis["confidence_prediction"] in ["unavailable", "No Face"]
        assert analysis["confidence_probability"] is None
        assert analysis["confidence_score"] is None
        assert analysis["analysis_status"] in ["NO_FACE", "OK"]
    finally:
        vision_service.confidence_model_loaded = orig_loaded


def test_sub_3s_deviations_no_violations(create_fresh_session):
    """Tests that face absence < 3s and look away < 3s do not trigger violations."""
    db, user, interview, session_rec, analysis_rec = create_fresh_session
    session_id = session_rec.id

    state = get_or_create_session_state(session_id)
    now = datetime.datetime.utcnow()
    
    # 2.5s face absence
    state["active_absence_start"] = now - datetime.timedelta(seconds=2.5)
    frame_face_returns = {
        "frame_valid": True,
        "analysis_status": "OK",
        "face_detected": True,
        "gaze_available": True,
        "is_facing_screen": True
    }

    process_frame_sample(db, session_rec, frame_face_returns)
    assert len(state["face_absence_events"]) == 0

    # 2.5s look away
    state["active_look_away_start"] = now - datetime.timedelta(seconds=2.5)
    frame_facing_returns = {
        "frame_valid": True,
        "analysis_status": "OK",
        "face_detected": True,
        "gaze_available": True,
        "is_facing_screen": True
    }

    process_frame_sample(db, session_rec, frame_facing_returns)
    assert len(state["look_away_events"]) == 0


