import os
import cv2
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
    frame_facing = {"face_detected": True, "is_facing_screen": True, "confidence_prediction": "Confident", "emotion_prediction": "neutral", "mobile_detected": False}
    frame_away = {"face_detected": True, "is_facing_screen": False, "confidence_prediction": "Unconfident", "emotion_prediction": "neutral", "mobile_detected": False}

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


def test_mobile_single_vs_multi_frame_state_management(create_fresh_session):
    db, user, interview, session_rec, analysis_rec = create_fresh_session
    session_id = session_rec.id

    frame_single_mobile = {"face_detected": True, "is_facing_screen": True, "confidence_prediction": "Confident", "emotion_prediction": "neutral", "mobile_detected": True, "mobile_confidence": 0.88}
    frame_clear = {"face_detected": True, "is_facing_screen": True, "confidence_prediction": "Confident", "emotion_prediction": "neutral", "mobile_detected": False, "mobile_confidence": 0.0}

    # 1. Single isolated detection does NOT trigger confirmed event
    res1 = process_frame_sample(db, session_rec, frame_single_mobile)
    assert res1["multi_frame_mobile_confirmed"] is False
    assert res1["trigger_mobile_warning"] is False

    process_frame_sample(db, session_rec, frame_clear)
    process_frame_sample(db, session_rec, frame_clear)

    # 2. 2-out-of-3 detection triggers ONE event and one warning
    process_frame_sample(db, session_rec, frame_single_mobile)
    res_m2 = process_frame_sample(db, session_rec, frame_single_mobile)
    assert res_m2["multi_frame_mobile_confirmed"] is True

    # Verify state timestamps & peak confidence stored
    state = get_or_create_session_state(session_id)
    assert state["active_mobile_event"] is not None
    assert state["active_mobile_event"]["peak_confidence"] == 0.88


def test_fullscreen_violations_and_fifth_violation_safe_finalization(create_fresh_session):
    db, user, interview, session_rec, analysis_rec = create_fresh_session
    session_id = session_rec.id

    # Violations 1 to 4
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
