import json
import logging
import datetime
from typing import Optional
from sqlalchemy.orm import Session

from models.interview import InterviewSession, InterviewBehaviorAnalysis, Interview

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("behavior_service")

# In-memory session tracking state (synced continuously to database)
SESSION_BEHAVIOR_STATES = {}

# Centralized Module 6 Monitoring Configuration Constants
FACE_MISSING_THRESHOLD_SECONDS = 3.0
EYE_DEVIATION_THRESHOLD_SECONDS = 3.0
MOBILE_DETECTION_THRESHOLD_SECONDS = 1.5
MIN_CONSECUTIVE_DETECTION_FRAMES = 2
MIN_DETECTION_CONFIDENCE = 0.25
VIOLATION_COOLDOWN_SECONDS = 15.0
FULLSCREEN_VIOLATION_LIMIT = 5


def get_or_create_behavior_analysis(db: Session, session_rec: InterviewSession) -> InterviewBehaviorAnalysis:
    """
    Get or create DB record InterviewBehaviorAnalysis at session start/frame start.
    Ensures DB record exists from interview start.
    """
    session_id = session_rec.id
    analysis_rec = db.query(InterviewBehaviorAnalysis).filter(InterviewBehaviorAnalysis.session_id == session_id).first()
    if not analysis_rec:
        logger.info(f"[MODULE 6] Interview session started: {session_id}")
        analysis_rec = InterviewBehaviorAnalysis(
            session_id=session_id,
            interview_id=session_rec.interview_id,
            candidate_id=session_rec.candidate_id,
            analysis_status="in_progress"
        )
        db.add(analysis_rec)
        db.commit()
        db.refresh(analysis_rec)
        logger.info(f"[MODULE 6] Behavior analysis record initialized for session: {session_id}")

    return analysis_rec


def get_or_create_session_state(session_id: int, db: Optional[Session] = None, session_rec: Optional[InterviewSession] = None):
    if session_id not in SESSION_BEHAVIOR_STATES:
        # Reconstruct initial state from database if present (Server Restart Resilience)
        reconstructed_timeline = []
        reconstructed_mobile_events = []
        reconstructed_look_away = []
        reconstructed_face_absence = []
        v_count = 0
        w_count = 0
        auto_term = False
        auto_reason = None

        if db and session_rec:
            analysis_rec = db.query(InterviewBehaviorAnalysis).filter(InterviewBehaviorAnalysis.session_id == session_id).first()
            if analysis_rec:
                if analysis_rec.raw_timeline_json and isinstance(analysis_rec.raw_timeline_json, list):
                    reconstructed_timeline = analysis_rec.raw_timeline_json
                if analysis_rec.mobile_events_json and isinstance(analysis_rec.mobile_events_json, list):
                    reconstructed_mobile_events = analysis_rec.mobile_events_json
                v_count = analysis_rec.fullscreen_violations_count or 0
                w_count = analysis_rec.fullscreen_warnings_count or 0
                auto_term = bool(analysis_rec.auto_terminated)
                auto_reason = analysis_rec.auto_termination_reason

                # Reconstruct look-away and face absence events strictly from valid timeline entries
                if reconstructed_timeline:
                    active_la = None
                    active_fa = None
                    for entry in reconstructed_timeline:
                        ts = entry.get("timestamp")
                        frame_valid = entry.get("frame_valid", True)
                        fd = entry.get("face_detected", False)
                        facing = entry.get("is_facing_screen", False)
                        gaze_avail = entry.get("gaze_available", False)
                        analysis_status = entry.get("analysis_status", "NO_FACE" if not fd else "OK")

                        # Look-away reconstruction (Requires frame_valid, face_detected, gaze_available, is_facing_screen=False)
                        if frame_valid and fd and gaze_avail and not facing:
                            if active_la is None and ts:
                                try:
                                    active_la = datetime.datetime.fromisoformat(ts)
                                except Exception:
                                    pass
                        else:
                            if active_la is not None and ts:
                                try:
                                    t_curr = datetime.datetime.fromisoformat(ts)
                                    dur = (t_curr - active_la).total_seconds()
                                    if dur >= EYE_DEVIATION_THRESHOLD_SECONDS:
                                        reconstructed_look_away.append({
                                            "start_timestamp": active_la.isoformat(),
                                            "end_timestamp": ts,
                                            "duration_seconds": round(dur, 1)
                                        })
                                except Exception:
                                    pass
                                active_la = None

                        # Face absence reconstruction (Requires frame_valid=True, analysis_status="NO_FACE", face_detected=False)
                        if frame_valid and analysis_status == "NO_FACE" and not fd:
                            if active_fa is None and ts:
                                try:
                                    active_fa = datetime.datetime.fromisoformat(ts)
                                except Exception:
                                    pass
                        else:
                            if active_fa is not None and ts:
                                try:
                                    t_curr = datetime.datetime.fromisoformat(ts)
                                    dur = (t_curr - active_fa).total_seconds()
                                    if dur >= FACE_MISSING_THRESHOLD_SECONDS:
                                        reconstructed_face_absence.append({
                                            "timestamp": active_fa.isoformat(),
                                            "duration_seconds": round(dur, 1)
                                        })
                                except Exception:
                                    pass
                                active_fa = None

                    # Finalize any ongoing active events at the end of the timeline
                    last_ts = reconstructed_timeline[-1].get("timestamp") if reconstructed_timeline else None
                    if last_ts:
                        try:
                            t_end = datetime.datetime.fromisoformat(last_ts)
                            if active_la is not None:
                                dur_la = (t_end - active_la).total_seconds()
                                if dur_la >= EYE_DEVIATION_THRESHOLD_SECONDS:
                                    reconstructed_look_away.append({
                                        "start_timestamp": active_la.isoformat(),
                                        "end_timestamp": last_ts,
                                        "duration_seconds": round(dur_la, 1)
                                    })
                            if active_fa is not None:
                                dur_fa = (t_end - active_fa).total_seconds()
                                if dur_fa >= FACE_MISSING_THRESHOLD_SECONDS:
                                    reconstructed_face_absence.append({
                                        "timestamp": active_fa.isoformat(),
                                        "duration_seconds": round(dur_fa, 1)
                                    })
                        except Exception:
                            pass

        SESSION_BEHAVIOR_STATES[session_id] = {
            "session_id": session_id,
            "timeline": reconstructed_timeline,
            "fullscreen_violations": v_count,
            "fullscreen_warnings": w_count,
            "auto_terminated": auto_term,
            "auto_termination_reason": auto_reason,
            "recent_mobile_hits": [],  # Sliding window of last 3 frame samples
            "active_mobile_start": None,
            "active_mobile_event": None,
            "confirmed_mobile_events": reconstructed_mobile_events,
            "last_mobile_warning_timestamp": None,
            "mobile_warning_issued": False,
            "look_away_events": reconstructed_look_away,
            "active_look_away_start": None,
            "look_away_warning_issued": False,
            "face_absence_events": reconstructed_face_absence,
            "active_absence_start": None,
            "face_absence_warning_issued": False
        }
    return SESSION_BEHAVIOR_STATES[session_id]


def process_frame_sample(db: Session, session_rec: InterviewSession, frame_analysis: dict):
    """
    Process a single sampled webcam frame safely.
    Updates DB record InterviewBehaviorAnalysis continuously.
    """
    session_id = session_rec.id
    analysis_rec = get_or_create_behavior_analysis(db, session_rec)
    state = get_or_create_session_state(session_id, db=db, session_rec=session_rec)

    now = datetime.datetime.utcnow()
    now_iso = now.isoformat()

    frame_valid = frame_analysis.get("frame_valid", True)
    analysis_status = frame_analysis.get("analysis_status", "OK")

    face_detected = frame_analysis.get("face_detected", False)
    is_facing_screen = frame_analysis.get("is_facing_screen", False)
    gaze_direction = frame_analysis.get("gaze_direction", "center")
    head_pose = frame_analysis.get("head_pose", {"pitch": 0.0, "yaw": 0.0, "roll": 0.0})
    gaze_avail = frame_analysis.get("gaze_available", False)
    
    confidence_avail = frame_analysis.get("confidence_analysis_available", True)
    confidence_pred = frame_analysis.get("confidence_prediction", "Neutral")
    confidence_prob = frame_analysis.get("confidence_probability", 0.5)

    emotion_avail = frame_analysis.get("emotion_analysis_available", True)
    emotion_pred = frame_analysis.get("emotion_prediction", "neutral")

    mobile_detected = frame_analysis.get("mobile_detected", False)
    mobile_conf = frame_analysis.get("mobile_confidence", 0.0)

    logger.info(f"[MODULE6] Frame received | Session #{session_id} | Status={analysis_status} | FaceDetected={face_detected} | FacingScreen={is_facing_screen} | GazeAvail={gaze_avail} | Mobile={mobile_detected}")

    # Complete timeline entry preserving all availability and status flags
    timeline_entry = {
        "timestamp": now_iso,
        "frame_valid": frame_valid,
        "analysis_status": analysis_status,
        "confidence_analysis_available": confidence_avail,
        "emotion_analysis_available": emotion_avail,
        "mobile_detection_available": frame_analysis.get("mobile_detection_available", True),
        "gaze_available": gaze_avail,
        "face_detected": face_detected,
        "is_facing_screen": is_facing_screen,
        "gaze_direction": gaze_direction,
        "head_pose": head_pose,
        "confidence_prediction": confidence_pred,
        "confidence_probability": confidence_prob,
        "emotion_prediction": emotion_pred,
        "mobile_detected": mobile_detected,
        "mobile_confidence": mobile_conf
    }
    state["timeline"].append(timeline_entry)

    # 1. Multi-Frame & Duration Mobile Phone Event State Management (2-of-3 hits & sustained duration >= 1.5s)
    is_valid_mobile_hit = mobile_detected and (mobile_conf >= MIN_DETECTION_CONFIDENCE)
    state["recent_mobile_hits"].append((is_valid_mobile_hit, mobile_conf, now))
    if len(state["recent_mobile_hits"]) > 3:
        state["recent_mobile_hits"].pop(0)

    recent_detected_count = sum(1 for hit in state["recent_mobile_hits"] if hit[0])
    trigger_mobile_warning = False

    if recent_detected_count >= MIN_CONSECUTIVE_DETECTION_FRAMES:
        if state.get("active_mobile_start") is None:
            state["active_mobile_start"] = now
            state["mobile_warning_issued"] = False

        dur_mobile = (now - state["active_mobile_start"]).total_seconds()

        if dur_mobile >= MOBILE_DETECTION_THRESHOLD_SECONDS:
            if not state.get("mobile_warning_issued", False):
                state["mobile_warning_issued"] = True
                active_event = {
                    "event_id": len(state["confirmed_mobile_events"]) + 1,
                    "start_timestamp": state["active_mobile_start"].isoformat(),
                    "end_timestamp": now_iso,
                    "duration_seconds": round(dur_mobile, 1),
                    "peak_confidence": max((hit[1] for hit in state["recent_mobile_hits"] if hit[0]), default=mobile_conf),
                    "warning_issued": True
                }
                state["active_mobile_event"] = active_event
                state["confirmed_mobile_events"].append(active_event)
                logger.info(f"[MODULE 6] MOBILE_DEVICE_DETECTED confirmed & persisted for session {session_id} ({dur_mobile:.1f}s)")

                # Popup notification cooldown check
                if (state["last_mobile_warning_timestamp"] is None or 
                    (now - state["last_mobile_warning_timestamp"]).total_seconds() > VIOLATION_COOLDOWN_SECONDS):
                    trigger_mobile_warning = True
                    state["last_mobile_warning_timestamp"] = now
            else:
                if state["confirmed_mobile_events"]:
                    state["confirmed_mobile_events"][-1]["end_timestamp"] = now_iso
                    state["confirmed_mobile_events"][-1]["duration_seconds"] = round(dur_mobile, 1)
                    state["confirmed_mobile_events"][-1]["peak_confidence"] = max(state["confirmed_mobile_events"][-1]["peak_confidence"], mobile_conf)
    else:
        state["active_mobile_start"] = None
        state["mobile_warning_issued"] = False
        state["active_mobile_event"] = None

    # 2. Look-Away & Face Absence Event Management
    trigger_look_away_warning = False
    trigger_face_not_detected_warning = False

    if frame_valid and face_detected:
        # Candidate face returned: finalize any pending active face absence event
        if state["active_absence_start"] is not None:
            abs_duration = max(1.0, (now - state["active_absence_start"]).total_seconds())
            if abs_duration >= FACE_MISSING_THRESHOLD_SECONDS and state["face_absence_events"]:
                state["face_absence_events"][-1]["duration_seconds"] = round(abs_duration, 1)
            state["active_absence_start"] = None
            state["face_absence_warning_issued"] = False

        if gaze_avail and not is_facing_screen:
            if state["active_look_away_start"] is None:
                state["active_look_away_start"] = now
                state["look_away_warning_issued"] = False
            else:
                dur = (now - state["active_look_away_start"]).total_seconds()
                if dur >= EYE_DEVIATION_THRESHOLD_SECONDS and not state["look_away_warning_issued"]:
                    trigger_look_away_warning = True
                    state["look_away_warning_issued"] = True
                    state["look_away_events"].append({
                        "start_timestamp": state["active_look_away_start"].isoformat(),
                        "end_timestamp": now_iso,
                        "duration_seconds": round(dur, 1)
                    })
                    logger.info(f"[MODULE 6] EYE_CONTACT_DEVIATION confirmed & persisted for session {session_id} ({dur:.1f}s)")
                elif state["look_away_warning_issued"] and state["look_away_events"]:
                    state["look_away_events"][-1]["end_timestamp"] = now_iso
                    state["look_away_events"][-1]["duration_seconds"] = round(dur, 1)
        else:
            if state["active_look_away_start"] is not None:
                dur = (now - state["active_look_away_start"]).total_seconds()
                if dur >= EYE_DEVIATION_THRESHOLD_SECONDS and state["look_away_events"]:
                    state["look_away_events"][-1]["end_timestamp"] = now_iso
                    state["look_away_events"][-1]["duration_seconds"] = round(dur, 1)
                state["active_look_away_start"] = None
                state["look_away_warning_issued"] = False
    elif frame_valid and analysis_status == "NO_FACE":
        if state["active_look_away_start"] is not None:
            state["active_look_away_start"] = None
            state["look_away_warning_issued"] = False

        if state["active_absence_start"] is None:
            state["active_absence_start"] = now
            state["face_absence_warning_issued"] = False
        else:
            dur = (now - state["active_absence_start"]).total_seconds()
            if dur >= FACE_MISSING_THRESHOLD_SECONDS and not state["face_absence_warning_issued"]:
                trigger_face_not_detected_warning = True
                state["face_absence_warning_issued"] = True
                state["face_absence_events"].append({
                    "timestamp": state["active_absence_start"].isoformat(),
                    "duration_seconds": round(dur, 1)
                })
                logger.info(f"[MODULE 6] FACE_NOT_DETECTED confirmed & persisted for session {session_id} ({dur:.1f}s)")
            elif state["face_absence_warning_issued"] and state["face_absence_events"]:
                state["face_absence_events"][-1]["duration_seconds"] = round(dur, 1)
    else:
        logger.info(f"[MODULE 6] Status '{analysis_status}' — skipping violation timers for session {session_id}")

    # 3. Continuous DB Sync & Eligibility-Based Calculation
    total_frames = len(state["timeline"])
    valid_frames = [f for f in state["timeline"] if f.get("face_detected", False) and f.get("frame_valid", True)]
    
    # Confidence Score Eligibility: only frames where confidence_prediction is Confident or Unconfident
    eligible_conf_frames = [f for f in valid_frames if f.get("confidence_prediction") in ["Confident", "Unconfident"]]
    conf_eligible_count = len(eligible_conf_frames)
    confident_count = sum(1 for f in eligible_conf_frames if f.get("confidence_prediction") == "Confident")
    unconfident_count = sum(1 for f in eligible_conf_frames if f.get("confidence_prediction") == "Unconfident")

    analysis_rec.total_analyzed_frames = total_frames
    analysis_rec.confident_frames_count = confident_count
    analysis_rec.unconfident_frames_count = unconfident_count

    if conf_eligible_count > 0:
        analysis_rec.confidence_score = max(0.0, min(100.0, round((confident_count / conf_eligible_count) * 100.0, 1)))
        analysis_rec.analysis_status = "partial"
    else:
        analysis_rec.confidence_score = None
        analysis_rec.analysis_status = "in_progress"

    # Eye Contact Eligibility: only frames with face_detected == True and gaze_available == True
    eligible_gaze_frames = [f for f in valid_frames if f.get("gaze_available", False) is True]
    gaze_eligible_count = len(eligible_gaze_frames)
    if gaze_eligible_count > 0:
        facing_count = sum(1 for f in eligible_gaze_frames if f.get("is_facing_screen", False) is True)
        analysis_rec.eye_contact_percentage = max(0.0, min(100.0, round((facing_count / gaze_eligible_count) * 100.0, 1)))
    else:
        analysis_rec.eye_contact_percentage = None

    analysis_rec.mobile_detected = bool(len(state["confirmed_mobile_events"]) > 0)
    analysis_rec.mobile_event_count = len(state["confirmed_mobile_events"])
    analysis_rec.mobile_events_json = state["confirmed_mobile_events"]

    analysis_rec.fullscreen_violations_count = state.get("fullscreen_violations", 0)
    analysis_rec.fullscreen_warnings_count = state.get("fullscreen_warnings", 0)
    analysis_rec.raw_timeline_json = state["timeline"]

    db.commit()

    return {
        "session_id": session_id,
        "face_detected": face_detected,
        "is_facing_screen": is_facing_screen,
        "gaze_direction": gaze_direction,
        "head_pose": head_pose,
        "confidence_analysis_available": confidence_avail,
        "confidence_prediction": confidence_pred,
        "confidence_probability": confidence_prob,
        "emotion_analysis_available": emotion_avail,
        "emotion_prediction": emotion_pred,
        "mobile_detected": mobile_detected,
        "multi_frame_mobile_confirmed": bool(recent_detected_count >= MIN_CONSECUTIVE_DETECTION_FRAMES),
        "trigger_mobile_warning": trigger_mobile_warning,
        "trigger_mobile_phone_warning": trigger_mobile_warning,
        "mobile_warning_message": "A mobile phone has been detected in the interview area. Please remove the device and continue the interview." if trigger_mobile_warning else None,
        "mobile_phone_warning_message": "A mobile phone has been detected in the interview area. Please remove the device and continue the interview." if trigger_mobile_warning else None,
        "trigger_look_away_warning": trigger_look_away_warning,
        "look_away_warning_message": "You have been looking away from the interview screen. Please focus on the camera and continue your interview." if trigger_look_away_warning else None,
        "trigger_face_not_detected_warning": trigger_face_not_detected_warning,
        "face_not_detected_warning_message": "Your face is no longer visible in the camera. Please return to the interview frame." if trigger_face_not_detected_warning else None,
        "total_analyzed_frames": total_frames
    }


def record_fullscreen_violation(db: Session, session_id: int):
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session_rec:
        return {"session_id": session_id, "violation_count": 0, "warning_count": 0, "auto_terminate": False, "message": "Session not found."}

    # Decouple violation logging from non-active or terminal states
    st = (session_rec.status or "").upper()
    if st in ["COMPLETED", "ENDED", "TERMINATED", "FINALIZING"]:
        analysis_rec = get_or_create_behavior_analysis(db, session_rec)
        return {
            "session_id": session_id,
            "violation_count": analysis_rec.fullscreen_violations_count or 0,
            "warning_count": analysis_rec.fullscreen_warnings_count or 0,
            "auto_terminate": False,
            "message": "Session is already completed or terminated. Fullscreen violation logging skipped."
        }

    analysis_rec = get_or_create_behavior_analysis(db, session_rec)
    state = get_or_create_session_state(session_id, db=db, session_rec=session_rec)
    
    state["fullscreen_violations"] += 1
    v_count = state["fullscreen_violations"]

    if v_count < FULLSCREEN_VIOLATION_LIMIT:
        state["fullscreen_warnings"] = v_count
        auto_terminate = False
        message = f"Warning {v_count} of {FULLSCREEN_VIOLATION_LIMIT - 1} allowed warnings. Fullscreen mode is required during the interview."
    else:
        state["fullscreen_warnings"] = FULLSCREEN_VIOLATION_LIMIT - 1
        state["auto_terminated"] = True
        state["auto_termination_reason"] = "FIFTH_FULLSCREEN_VIOLATION"
        auto_terminate = True
        message = f"Interview Ended: Maximum allowed fullscreen exit attempts reached ({v_count} violations). Interview is being finalized automatically."

        # Atomic status synchronization for auto-termination
        session_rec.status = "TERMINATED"
        interview = db.query(Interview).filter(Interview.id == session_rec.interview_id).first()
        if interview:
            interview.status = "Terminated"

    analysis_rec.fullscreen_violations_count = v_count
    analysis_rec.fullscreen_warnings_count = state["fullscreen_warnings"]
    analysis_rec.auto_terminated = state["auto_terminated"]
    analysis_rec.auto_termination_reason = state["auto_termination_reason"]
    db.commit()

    return {
        "session_id": session_id,
        "violation_count": v_count,
        "warning_count": state["fullscreen_warnings"],
        "auto_terminate": auto_terminate,
        "message": message
    }


def finalize_behavior_analysis(db: Session, session_rec: InterviewSession):
    """
    Finalize Module 6 behavior analysis at interview completion.
    Calculates duration-based attention, normalized engagement fusion, FER aggregations,
    and updates DB record with analysis_status = 'complete'.
    """
    session_id = session_rec.id
    logger.info(f"[MODULE 6] Finalizing behavior analysis for session: {session_id}")
    analysis_rec = get_or_create_behavior_analysis(db, session_rec)
    state = get_or_create_session_state(session_id, db=db, session_rec=session_rec)
    timeline = state.get("timeline", [])
    now = datetime.datetime.utcnow()
    now_iso = now.isoformat()

    # 1. Finalize any active face absence event up to finalization timestamp
    if state.get("active_absence_start") is not None:
        dur_fa = (now - state["active_absence_start"]).total_seconds()
        if dur_fa >= FACE_MISSING_THRESHOLD_SECONDS:
            if state.get("face_absence_warning_issued") and state.get("face_absence_events"):
                state["face_absence_events"][-1]["duration_seconds"] = round(dur_fa, 1)
            else:
                state["face_absence_events"].append({
                    "timestamp": state["active_absence_start"].isoformat(),
                    "duration_seconds": round(dur_fa, 1)
                })
        state["active_absence_start"] = None

    # 2. Finalize any active look-away event up to finalization timestamp
    if state.get("active_look_away_start") is not None:
        dur_la = (now - state["active_look_away_start"]).total_seconds()
        if dur_la >= EYE_DEVIATION_THRESHOLD_SECONDS:
            if state.get("look_away_warning_issued") and state.get("look_away_events"):
                state["look_away_events"][-1]["end_timestamp"] = now_iso
                state["look_away_events"][-1]["duration_seconds"] = round(dur_la, 1)
            else:
                state["look_away_events"].append({
                    "start_timestamp": state["active_look_away_start"].isoformat(),
                    "end_timestamp": now_iso,
                    "duration_seconds": round(dur_la, 1)
                })
        state["active_look_away_start"] = None

    # 3. Finalize any active mobile event up to finalization timestamp
    if state.get("active_mobile_start") is not None:
        dur_m = (now - state["active_mobile_start"]).total_seconds()
        if dur_m >= MOBILE_DETECTION_THRESHOLD_SECONDS:
            if state["confirmed_mobile_events"]:
                state["confirmed_mobile_events"][-1]["end_timestamp"] = now_iso
                state["confirmed_mobile_events"][-1]["duration_seconds"] = round(dur_m, 1)
        state["active_mobile_start"] = None
        state["active_mobile_event"] = None

    valid_frames = [f for f in timeline if f.get("face_detected", False) and f.get("frame_valid", True)]
    total_frames = len(timeline)
    valid_count = len(valid_frames)

    # Calculate actual analyzed duration from timeline timestamps
    if len(timeline) >= 2:
        try:
            t0 = datetime.datetime.fromisoformat(timeline[0]["timestamp"])
            t_last = datetime.datetime.fromisoformat(timeline[-1]["timestamp"])
            actual_analyzed_duration_sec = max(1.0, (t_last - t0).total_seconds())
        except Exception:
            actual_analyzed_duration_sec = max(1.0, float(total_frames * 1.5))
    else:
        actual_analyzed_duration_sec = max(1.0, float(total_frames * 1.5))

    # 1. Confidence Score & Camera-Facing Estimate Eligibility
    eligible_conf_frames = [f for f in valid_frames if f.get("confidence_prediction") in ["Confident", "Unconfident"]]
    conf_eligible_count = len(eligible_conf_frames)
    if conf_eligible_count > 0:
        confident_count = sum(1 for f in eligible_conf_frames if f.get("confidence_prediction") == "Confident")
        unconfident_count = sum(1 for f in eligible_conf_frames if f.get("confidence_prediction") == "Unconfident")
        confidence_score = max(0.0, min(100.0, round((confident_count / conf_eligible_count) * 100.0, 1)))
        analysis_status = "complete"
    else:
        confident_count = 0
        unconfident_count = 0
        confidence_score = None
        analysis_status = "insufficient_data"

    eligible_gaze_frames = [f for f in valid_frames if f.get("gaze_available", False) is True]
    gaze_eligible_count = len(eligible_gaze_frames)
    if gaze_eligible_count > 0:
        facing_count = sum(1 for f in eligible_gaze_frames if f.get("is_facing_screen", False) is True)
        camera_facing_pct = max(0.0, min(100.0, round((facing_count / gaze_eligible_count) * 100.0, 1)))
    else:
        camera_facing_pct = None

    # 2. Emotion Recognition Eligibility & Transitions
    valid_emotion_frames = [
        f for f in valid_frames 
        if f.get("emotion_analysis_available") is True and f.get("emotion_prediction") in ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
    ]
    emotion_transitions_count = 0
    if valid_emotion_frames:
        emotions = [f.get("emotion_prediction") for f in valid_emotion_frames]
        from collections import Counter
        counts = Counter(emotions)
        dominant_emotion = counts.most_common(1)[0][0]

        happy_count = sum(1 for e in emotions if e in ["happy", "surprise"])
        neutral_count = sum(1 for e in emotions if e == "neutral")
        pos_ratio = (happy_count / len(emotions)) * 100.0

        if pos_ratio > 30.0:
            pos_freq = "Frequent"
        elif pos_ratio > 10.0:
            pos_freq = "Occasional"
        else:
            pos_freq = "Low"

        prev_emo = None
        for emo in emotions:
            if prev_emo is not None and emo != prev_emo:
                emotion_transitions_count += 1
            prev_emo = emo

        consistency_pct = max(0.0, min(100.0, round(((neutral_count + happy_count) / len(emotions)) * 100.0, 1)))
        facial_presentation = "Composed and consistent" if consistency_pct >= 70.0 else "Variable presentation"
        facial_engagement = "High" if (pos_ratio + consistency_pct) / 2 >= 65.0 else "Moderate"
    else:
        dominant_emotion = None
        pos_ratio = 0.0
        pos_freq = "Insufficient data"
        consistency_pct = None
        facial_presentation = "Insufficient analysis data"
        facial_engagement = "Insufficient analysis data"

    # 3. Safe Duration-Based Attention Score Calculation
    confirmed_look_away_sec = sum(e.get("duration_seconds", 0.0) for e in state.get("look_away_events", []))
    confirmed_absence_sec = sum(e.get("duration_seconds", 0.0) for e in state.get("face_absence_events", []))

    look_away_ratio = min(1.0, confirmed_look_away_sec / actual_analyzed_duration_sec)
    absence_ratio = min(1.0, confirmed_absence_sec / actual_analyzed_duration_sec)

    look_away_deduction = min(40.0, (look_away_ratio * 40.0) + (len(state.get("look_away_events", [])) * 5.0))
    absence_deduction = min(40.0, (absence_ratio * 40.0) + (len(state.get("face_absence_events", [])) * 5.0))

    if valid_count > 0:
        raw_attention = 100.0 - look_away_deduction - absence_deduction
        attention_score = max(0.0, min(100.0, round(raw_attention, 1)))
    else:
        attention_score = None

    # 4. Normalized Engagement Score Fusion
    scores_to_fuse = []
    weights = []

    if confidence_score is not None:
        scores_to_fuse.append(confidence_score)
        weights.append(0.30)

    if camera_facing_pct is not None:
        scores_to_fuse.append(camera_facing_pct)
        weights.append(0.30)

    if attention_score is not None:
        scores_to_fuse.append(attention_score)
        weights.append(0.30)

    if valid_emotion_frames:
        norm_pos_exp = min(100.0, pos_ratio * 2.5)
        scores_to_fuse.append(norm_pos_exp)
        weights.append(0.10)

    if len(scores_to_fuse) > 0 and sum(weights) > 0:
        normalized_weights = [w / sum(weights) for w in weights]
        engagement_fusion = sum(s * w for s, w in zip(scores_to_fuse, normalized_weights))
        engagement_score = max(0.0, min(100.0, round(engagement_fusion, 1)))

        if engagement_score >= 75.0:
            engagement_category = "High"
        elif engagement_score >= 50.0:
            engagement_category = "Moderate"
        else:
            engagement_category = "Low"
    else:
        engagement_score = None
        engagement_category = "Insufficient analysis data"

    # Mobile Events - Unique confirmed mobile events single source of truth
    confirmed_mobile_events = state.get("confirmed_mobile_events", [])
    mobile_detected = bool(len(confirmed_mobile_events) > 0)
    mobile_event_count = len(confirmed_mobile_events)

    # Professional Behavioral Summary
    summary_parts = []
    if confidence_score is not None:
        summary_parts.append(f"Confidence Score was measured at {confidence_score}%.")
        summary_parts.append(f"Camera-Facing Estimate consistency was {camera_facing_pct}%.")
        summary_parts.append(f"Attention Score was calculated at {attention_score}% with an overall Engagement category of {engagement_category}.")
    else:
        summary_parts.append("Visual behavioral analysis has insufficient frame data for full scoring.")

    if mobile_detected:
        summary_parts.append(f"Mobile device presence was confirmed {mobile_event_count} time(s) during the session.")
    if state.get("fullscreen_violations", 0) > 0:
        summary_parts.append(f"Recorded {state['fullscreen_violations']} fullscreen exit attempt(s).")
    if state.get("auto_terminated"):
        summary_parts.append(f"Session auto-finalized due to: {state['auto_termination_reason']}.")

    behavior_summary = " ".join(summary_parts)

    # Update DB Record
    analysis_rec.analysis_status = analysis_status
    analysis_rec.confidence_score = confidence_score
    analysis_rec.confident_frames_count = confident_count
    analysis_rec.unconfident_frames_count = unconfident_count
    analysis_rec.total_analyzed_frames = total_frames

    analysis_rec.facial_presentation = facial_presentation
    analysis_rec.expression_consistency = consistency_pct
    analysis_rec.positive_expression_frequency = pos_freq
    analysis_rec.facial_engagement = facial_engagement
    analysis_rec.expression_changes_count = emotion_transitions_count
    analysis_rec.dominant_emotion = dominant_emotion

    analysis_rec.eye_contact_percentage = camera_facing_pct
    analysis_rec.attention_score = attention_score
    analysis_rec.look_away_events_count = len(state.get("look_away_events", []))
    analysis_rec.look_away_duration_seconds = round(confirmed_look_away_sec, 1)
    analysis_rec.face_absence_events_count = len(state.get("face_absence_events", []))

    analysis_rec.engagement_score = engagement_score
    analysis_rec.engagement_category = engagement_category

    analysis_rec.mobile_detected = mobile_detected
    analysis_rec.mobile_event_count = mobile_event_count
    analysis_rec.mobile_events_json = confirmed_mobile_events

    analysis_rec.fullscreen_violations_count = state.get("fullscreen_violations", 0)
    analysis_rec.fullscreen_warnings_count = state.get("fullscreen_warnings", 0)
    analysis_rec.auto_terminated = state.get("auto_terminated", False)
    analysis_rec.auto_termination_reason = state.get("auto_termination_reason")

    analysis_rec.behavior_summary = behavior_summary
    analysis_rec.raw_timeline_json = timeline

    db.commit()
    db.refresh(analysis_rec)
    logger.info(f"[MODULE 6] Final metrics calculated for session {session_id}: Confidence={confidence_score}, Attention={attention_score}, Engagement={engagement_score}")
    logger.info(f"[MODULE 6] Behavior report saved successfully for session {session_id}.")
    return analysis_rec


def get_behavior_report_dict(db: Session, session_rec: InterviewSession, report: InterviewBehaviorAnalysis):
    """
    Format complete Module 6 behavior analysis report into a 100% JSON-serializable dictionary.
    Exposes candidate details, real calculated scores, and real violation tracking logs.
    """
    from models.user import User
    from models.interview import Interview

    user = db.query(User).filter(User.id == session_rec.candidate_id).first()
    interview = db.query(Interview).filter(Interview.id == session_rec.interview_id).first()

    state = get_or_create_session_state(session_rec.id, db=db, session_rec=session_rec)
    
    # Compile real violations list using canonical violation types
    violations_list = []
    v_id = 1

    # 1. Fullscreen Exit Violations
    fs_count = report.fullscreen_violations_count or state.get("fullscreen_violations", 0)
    if fs_count > 0:
        violations_list.append({
            "id": v_id,
            "type": "FULLSCREEN_VIOLATION",
            "canonical_type": "FULLSCREEN_VIOLATION",
            "severity": "High" if fs_count >= FULLSCREEN_VIOLATION_LIMIT else "Medium",
            "timestamp": "During Session",
            "duration": None,
            "description": f"Candidate exited fullscreen mode {fs_count} time(s)."
        })
        v_id += 1

    # 2. Mobile Phone Webcam Detections
    mobile_events = report.mobile_events_json or state.get("confirmed_mobile_events", [])
    for m in mobile_events:
        violations_list.append({
            "id": v_id,
            "type": "MOBILE_DEVICE_DETECTED",
            "canonical_type": "MOBILE_DEVICE_DETECTED",
            "severity": "High",
            "timestamp": m.get("start_timestamp", "During Session"),
            "duration": m.get("duration_seconds", 1.5),
            "description": f"Mobile device detected in camera frame (Peak confidence: {m.get('peak_confidence', 0.8):.2f})."
        })
        v_id += 1

    # 3. Eye / Camera Deviation Events
    look_away_events = state.get("look_away_events", [])
    for la in look_away_events:
        violations_list.append({
            "id": v_id,
            "type": "EYE_CONTACT_DEVIATION",
            "canonical_type": "EYE_CONTACT_DEVIATION",
            "severity": "Medium",
            "timestamp": la.get("start_timestamp", "During Session"),
            "duration": la.get("duration_seconds", 3.0),
            "description": f"Candidate turned eyes/face away from camera focus for {la.get('duration_seconds', 3.0)}s."
        })
        v_id += 1

    # 4. Face Not Detected Events
    face_absence_events = state.get("face_absence_events", [])
    for fa in face_absence_events:
        violations_list.append({
            "id": v_id,
            "type": "FACE_NOT_DETECTED",
            "canonical_type": "FACE_NOT_DETECTED",
            "severity": "High",
            "timestamp": fa.get("timestamp", "During Session"),
            "duration": fa.get("duration_seconds", 3.0),
            "description": f"Candidate face absent from camera frame for {fa.get('duration_seconds', 3.0)}s."
        })
        v_id += 1

    high_count = sum(1 for v in violations_list if v["severity"] == "High")
    med_count = sum(1 for v in violations_list if v["severity"] == "Medium")
    low_count = sum(1 for v in violations_list if v["severity"] == "Low")

    summary = {
        "total": len(violations_list),
        "high": high_count,
        "medium": med_count,
        "low": low_count,
        "mobile_device": len(mobile_events),
        "mobile_phone": len(mobile_events),
        "eye_contact_deviation": len(look_away_events),
        "looking_away": len(look_away_events),
        "face_not_detected": len(face_absence_events),
        "fullscreen_exit": fs_count,
        "fullscreen_violation": fs_count
    }

    speech_records = session_rec.speech_analyses if hasattr(session_rec, "speech_analyses") and session_rec.speech_analyses else []
    if not speech_records:
        from models.interview import SpeechAnalysis
        speech_records = db.query(SpeechAnalysis).filter(SpeechAnalysis.session_id == session_rec.id).all()

    avg_comm_score = None
    avg_wpm = None
    avg_grammar = None
    total_fillers = 0

    if speech_records:
        comm_scores = [s.communication_score for s in speech_records if s.communication_score is not None]
        wpm_scores = [s.words_per_minute for s in speech_records if s.words_per_minute is not None]
        grammar_scores = [s.grammar_score for s in speech_records if s.grammar_score is not None]
        fillers = [s.filler_word_count for s in speech_records if s.filler_word_count is not None]

        if comm_scores:
            avg_comm_score = round(sum(comm_scores) / len(comm_scores), 1)
        if wpm_scores:
            avg_wpm = round(sum(wpm_scores) / len(wpm_scores), 1)
        if grammar_scores:
            avg_grammar = round(sum(grammar_scores) / len(grammar_scores), 1)
        if fillers:
            total_fillers = sum(fillers)

    return {
        "session_id": session_rec.id,
        "candidate_id": session_rec.candidate_id,
        "candidate_name": user.name if user else "Candidate",
        "candidate_email": user.email if user else "N/A",
        "interview_title": interview.domain if interview else "AI Mock Interview",
        "position": interview.interview_type if interview else "Technical Candidate",
        "created_at": session_rec.created_at.isoformat() if session_rec.created_at else None,
        "total_active_seconds": session_rec.total_active_seconds or 0,
        "overall_score": session_rec.score if session_rec.score is not None else None,
        "analysis_status": report.analysis_status or "complete",
        "confidence_score": report.confidence_score,
        "confident_frames_count": report.confident_frames_count or 0,
        "unconfident_frames_count": report.unconfident_frames_count or 0,
        "total_analyzed_frames": report.total_analyzed_frames or 0,
        "facial_presentation": report.facial_presentation or "N/A",
        "expression_consistency": report.expression_consistency,
        "positive_expression_frequency": report.positive_expression_frequency or "N/A",
        "facial_engagement": report.facial_engagement or "N/A",
        "dominant_emotion": report.dominant_emotion,
        "eye_contact_percentage": report.eye_contact_percentage,
        "attention_score": report.attention_score,
        "look_away_events_count": report.look_away_events_count or 0,
        "look_away_duration_seconds": report.look_away_duration_seconds or 0.0,
        "face_absence_events_count": report.face_absence_events_count or 0,
        "engagement_score": report.engagement_score,
        "engagement_category": report.engagement_category or "N/A",
        "mobile_detected": bool(report.mobile_detected),
        "mobile_event_count": report.mobile_event_count or 0,
        "fullscreen_violations_count": report.fullscreen_violations_count or 0,
        "fullscreen_warnings_count": report.fullscreen_warnings_count or 0,
        "auto_terminated": bool(report.auto_terminated),
        "auto_termination_reason": report.auto_termination_reason,
        "behavior_summary": report.behavior_summary or "No behavior summary recorded.",
        "communication": {
            "communication_score": avg_comm_score,
            "words_per_minute": avg_wpm,
            "grammar_score": avg_grammar,
            "filler_word_count": total_fillers
        },
        "violations_summary": summary,
        "violations_list": violations_list,
        "violations_timeline": violations_list
    }
