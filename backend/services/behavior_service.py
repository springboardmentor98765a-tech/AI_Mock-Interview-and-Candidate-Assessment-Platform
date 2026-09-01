import os
import json
import logging
import datetime
from typing import Optional
from sqlalchemy.orm import Session

from models.interview import InterviewSession, InterviewBehaviorAnalysis

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("behavior_service")

# In-memory session tracking state (synced continuously to database)
SESSION_BEHAVIOR_STATES = {}


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

        SESSION_BEHAVIOR_STATES[session_id] = {
            "session_id": session_id,
            "timeline": reconstructed_timeline,
            "fullscreen_violations": v_count,
            "fullscreen_warnings": w_count,
            "auto_terminated": auto_term,
            "auto_termination_reason": auto_reason,
            "recent_mobile_hits": [],  # Sliding window of last 3 frame samples
            "active_mobile_event": None,
            "confirmed_mobile_events": reconstructed_mobile_events,
            "last_mobile_warning_timestamp": None,
            "look_away_events": [],
            "active_look_away_start": None,
            "look_away_warning_issued": False,
            "face_absence_events": [],
            "active_absence_start": None
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

    face_detected = frame_analysis.get("face_detected", False)
    is_facing_screen = frame_analysis.get("is_facing_screen", False)
    gaze_direction = frame_analysis.get("gaze_direction", "center")
    head_pose = frame_analysis.get("head_pose", {"pitch": 0.0, "yaw": 0.0, "roll": 0.0})
    
    confidence_avail = frame_analysis.get("confidence_analysis_available", True)
    confidence_pred = frame_analysis.get("confidence_prediction", "Neutral")
    confidence_prob = frame_analysis.get("confidence_probability", 0.5)

    emotion_avail = frame_analysis.get("emotion_analysis_available", True)
    emotion_pred = frame_analysis.get("emotion_prediction", "neutral")
    emotion_probs = frame_analysis.get("emotion_probabilities", {})

    mobile_detected = frame_analysis.get("mobile_detected", False)
    mobile_conf = frame_analysis.get("mobile_confidence", 0.0)

    logger.info(f"[MODULE6] Frame received | Session #{session_id} | FaceDetected={face_detected} | FacingScreen={is_facing_screen} | Mobile={mobile_detected} | Confidence={confidence_pred} ({confidence_prob:.2f}) | Emotion={emotion_pred}")

    timeline_entry = {
        "timestamp": now_iso,
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

    # 1. Multi-Frame Mobile Phone Event State Management
    # Requires detection in at least 2 out of 3 consecutive samples
    state["recent_mobile_hits"].append((mobile_detected, mobile_conf, now))
    if len(state["recent_mobile_hits"]) > 3:
        state["recent_mobile_hits"].pop(0)

    recent_detected_count = sum(1 for hit in state["recent_mobile_hits"] if hit[0])
    trigger_mobile_warning = False

    if recent_detected_count >= 2:
        if state["active_mobile_event"] is None:
            # Create single new confirmed mobile event
            state["active_mobile_event"] = {
                "event_id": len(state["confirmed_mobile_events"]) + 1,
                "start_timestamp": now_iso,
                "end_timestamp": now_iso,
                "duration_seconds": 1.5,
                "peak_confidence": max((hit[1] for hit in state["recent_mobile_hits"] if hit[0]), default=mobile_conf),
                "warning_issued": True
            }
            # Cooldown check (15s between warning popups)
            if (state["last_mobile_warning_timestamp"] is None or 
                (now - state["last_mobile_warning_timestamp"]).total_seconds() > 15.0):
                trigger_mobile_warning = True
                state["last_mobile_warning_timestamp"] = now
        else:
            # Update active event duration and peak confidence while phone remains visible
            state["active_mobile_event"]["end_timestamp"] = now_iso
            try:
                st = datetime.datetime.fromisoformat(state["active_mobile_event"]["start_timestamp"])
                state["active_mobile_event"]["duration_seconds"] = round(max(1.5, (now - st).total_seconds()), 1)
            except Exception:
                state["active_mobile_event"]["duration_seconds"] += 1.5
            state["active_mobile_event"]["peak_confidence"] = max(state["active_mobile_event"]["peak_confidence"], mobile_conf)
            trigger_mobile_warning = False  # Prevent popup spam while visible
    else:
        if state["active_mobile_event"] is not None:
            state["confirmed_mobile_events"].append(state["active_mobile_event"])
            state["active_mobile_event"] = None

    # 2. Look-Away Event Management (Consistent 3-second threshold)
    # Brief deviation < 3s -> no warning/event.
    # Continuous camera-facing deviation >= 3s -> create look-away event & popup warning once per event.
    trigger_look_away_warning = False

    if face_detected:
        if state["active_absence_start"] is not None:
            abs_duration = max(1.0, (now - state["active_absence_start"]).total_seconds())
            state["face_absence_events"].append({
                "timestamp": now_iso,
                "duration_seconds": round(abs_duration, 1)
            })
            state["active_absence_start"] = None

        if not is_facing_screen:
            if state["active_look_away_start"] is None:
                state["active_look_away_start"] = now
                state["look_away_warning_issued"] = False
            else:
                dur = (now - state["active_look_away_start"]).total_seconds()
                if dur >= 3.0 and not state["look_away_warning_issued"]:
                    trigger_look_away_warning = True
                    state["look_away_warning_issued"] = True
                    logger.info(f"[MODULE 6] Look-away threshold reached for session {session_id} (duration: {dur:.1f}s)")
        else:
            if state["active_look_away_start"] is not None:
                dur = (now - state["active_look_away_start"]).total_seconds()
                if dur >= 3.0:
                    state["look_away_events"].append({
                        "start_timestamp": state["active_look_away_start"].isoformat(),
                        "end_timestamp": now_iso,
                        "duration_seconds": round(dur, 1)
                    })
                state["active_look_away_start"] = None
                state["look_away_warning_issued"] = False
    else:
        if state["active_absence_start"] is None:
            state["active_absence_start"] = now

    # 3. Continuous DB Sync during interview
    total_frames = len(state["timeline"])
    valid_frames = [f for f in state["timeline"] if f.get("face_detected", False)]
    valid_count = len(valid_frames)

    analysis_rec.total_analyzed_frames = total_frames
    analysis_rec.confident_frames_count = sum(1 for f in valid_frames if f.get("confidence_prediction") == "Confident")
    analysis_rec.unconfident_frames_count = sum(1 for f in valid_frames if f.get("confidence_prediction") == "Unconfident")

    if valid_count > 0:
        analysis_rec.confidence_score = max(0.0, min(100.0, round((analysis_rec.confident_frames_count / valid_count) * 100.0, 1)))
        facing_count = sum(1 for f in valid_frames if f.get("is_facing_screen", False))
        analysis_rec.eye_contact_percentage = max(0.0, min(100.0, round((facing_count / valid_count) * 100.0, 1)))
        analysis_rec.analysis_status = "partial"
    else:
        analysis_rec.analysis_status = "in_progress"

    analysis_rec.mobile_detected = bool(len(state["confirmed_mobile_events"]) > 0 or state["active_mobile_event"] is not None)
    analysis_rec.mobile_event_count = len(state["confirmed_mobile_events"]) + (1 if state["active_mobile_event"] else 0)
    all_mobile_json = list(state["confirmed_mobile_events"])
    if state["active_mobile_event"]:
        all_mobile_json.append(state["active_mobile_event"])
    analysis_rec.mobile_events_json = all_mobile_json

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
        "multi_frame_mobile_confirmed": bool(recent_detected_count >= 2),
        "trigger_mobile_warning": trigger_mobile_warning,
        "trigger_mobile_phone_warning": trigger_mobile_warning,
        "mobile_warning_message": "Mobile Device Detected: Please remove mobile phone from camera view during interview." if trigger_mobile_warning else None,
        "mobile_phone_warning_message": "Mobile Device Detected: Please remove mobile phone from camera view during interview." if trigger_mobile_warning else None,
        "trigger_look_away_warning": trigger_look_away_warning,
        "look_away_warning_message": "Camera-Facing Reminder: Please look towards your screen and maintain focus." if trigger_look_away_warning else None,
        "trigger_face_not_detected_warning": not face_detected,
        "face_not_detected_warning_message": "Face Not Detected: Please remain visible in front of the camera." if not face_detected else None,
        "total_analyzed_frames": total_frames
    }


def record_fullscreen_violation(db: Session, session_id: int):
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session_rec:
        return {"session_id": session_id, "violation_count": 0, "warning_count": 0, "auto_terminate": False, "message": "Session not found."}

    analysis_rec = get_or_create_behavior_analysis(db, session_rec)
    state = get_or_create_session_state(session_id, db=db, session_rec=session_rec)
    
    state["fullscreen_violations"] += 1
    v_count = state["fullscreen_violations"]

    if v_count <= 4:
        state["fullscreen_warnings"] = v_count
        auto_terminate = False
        message = f"Warning {v_count} of 4 allowed warnings. Fullscreen mode is required during the interview."
    else:
        state["fullscreen_warnings"] = 4
        state["auto_terminated"] = True
        state["auto_termination_reason"] = "FIFTH_FULLSCREEN_VIOLATION"
        auto_terminate = True
        message = "Interview Ended: Maximum allowed fullscreen exit attempts reached (5th violation). Interview is being finalized automatically."

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

    # Finalize any ongoing active mobile event
    if state.get("active_mobile_event"):
        state["confirmed_mobile_events"].append(state["active_mobile_event"])
        state["active_mobile_event"] = None

    # Finalize any ongoing active look-away event
    if state.get("active_look_away_start"):
        dur = (datetime.datetime.utcnow() - state["active_look_away_start"]).total_seconds()
        if dur >= 3.0:
            state["look_away_events"].append({
                "start_timestamp": state["active_look_away_start"].isoformat(),
                "end_timestamp": datetime.datetime.utcnow().isoformat(),
                "duration_seconds": round(dur, 1)
            })
        state["active_look_away_start"] = None

    valid_frames = [f for f in timeline if f.get("face_detected", False)]
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

    # 1. Confidence Score & Camera-Facing Estimate
    if valid_count > 0:
        confident_count = sum(1 for f in valid_frames if f.get("confidence_prediction") == "Confident")
        unconfident_count = sum(1 for f in valid_frames if f.get("confidence_prediction") == "Unconfident")
        conf_analyzed_count = confident_count + unconfident_count
        if conf_analyzed_count > 0:
            confidence_score = max(0.0, min(100.0, round((confident_count / conf_analyzed_count) * 100.0, 1)))
        else:
            confidence_score = None

        facing_count = sum(1 for f in valid_frames if f.get("is_facing_screen", False))
        camera_facing_pct = max(0.0, min(100.0, round((facing_count / valid_count) * 100.0, 1)))
        analysis_status = "complete"
    else:
        confident_count = 0
        unconfident_count = 0
        confidence_score = None
        camera_facing_pct = None
        analysis_status = "insufficient_data"

    # 2. Emotion Recognition, Transitions & Consistency
    emotion_transitions_count = 0
    if valid_count > 0:
        happy_count = sum(1 for f in valid_frames if f.get("emotion_prediction") == "happy")
        neutral_count = sum(1 for f in valid_frames if f.get("emotion_prediction") == "neutral")
        pos_ratio = (happy_count / valid_count) * 100.0

        if pos_ratio > 30.0:
            pos_freq = "Frequent"
        elif pos_ratio > 10.0:
            pos_freq = "Occasional"
        else:
            pos_freq = "Low"

        # Calculate actual expression transitions between consecutive valid frames
        prev_emo = None
        for f in valid_frames:
            emo = f.get("emotion_prediction")
            if emo and emo not in ["no_face", "unavailable"]:
                if prev_emo is not None and emo != prev_emo:
                    emotion_transitions_count += 1
                prev_emo = emo

        consistency_pct = max(0.0, min(100.0, round(((neutral_count + happy_count) / valid_count) * 100.0, 1)))
        facial_presentation = "Composed and consistent" if consistency_pct >= 70.0 else "Variable presentation"
        facial_engagement = "High" if (pos_ratio + consistency_pct) / 2 >= 65.0 else "Moderate"
    else:
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

    # 4. Normalized Engagement Score Fusion (Exclude unavailable components safely)
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

    if valid_count > 0:
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

    # Mobile Events
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
    
    # Compile real violations list
    violations_list = []
    v_id = 1

    # 1. Fullscreen Exit Violations
    fs_count = report.fullscreen_violations_count or 0
    if fs_count > 0:
        violations_list.append({
            "id": v_id,
            "type": "FULLSCREEN_EXIT",
            "severity": "High" if fs_count >= 3 else "Medium",
            "timestamp": "During Session",
            "duration": None,
            "description": f"Candidate exited fullscreen mode {fs_count} time(s)."
        })
        v_id += 1

    # 2. Mobile Browser Violations
    mobile_dev_events = state.get("mobile_device_violations", [])
    for dev in mobile_dev_events:
        violations_list.append({
            "id": v_id,
            "type": "MOBILE_DEVICE",
            "severity": "High",
            "timestamp": dev.get("timestamp", "During Session"),
            "duration": None,
            "description": "Attempted to access exam using unsupported mobile device."
        })
        v_id += 1

    # 3. Mobile Phone Webcam Detections
    mobile_events = report.mobile_events_json or []
    for m in mobile_events:
        violations_list.append({
            "id": v_id,
            "type": "MOBILE_PHONE_DETECTED",
            "severity": "High",
            "timestamp": m.get("start_timestamp", "During Session"),
            "duration": m.get("duration_seconds", 1.5),
            "description": f"Mobile phone detected in webcam frame (Peak confidence: {m.get('peak_confidence', 0.8):.2f})."
        })
        v_id += 1

    # 4. Looking Away Events
    look_away_events = state.get("look_away_events", [])
    for la in look_away_events:
        violations_list.append({
            "id": v_id,
            "type": "LOOKING_AWAY",
            "severity": "Medium",
            "timestamp": la.get("start_timestamp", "During Session"),
            "duration": la.get("duration_seconds", 3.0),
            "description": f"Candidate turned head/eyes away from screen for {la.get('duration_seconds', 3.0)}s."
        })
        v_id += 1

    # 5. Face Not Detected Events
    face_absence_events = state.get("face_absence_events", [])
    for fa in face_absence_events:
        violations_list.append({
            "id": v_id,
            "type": "FACE_NOT_DETECTED",
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
        "mobile_device": len(mobile_dev_events),
        "mobile_phone": len(mobile_events),
        "looking_away": len(look_away_events),
        "face_not_detected": len(face_absence_events),
        "fullscreen_exit": fs_count
    }

    speech_records = session_rec.speech_analyses if hasattr(session_rec, "speech_analyses") and session_rec.speech_analyses else []
    if not speech_records:
        from models.interview import SpeechAnalysis
        speech_records = db.query(SpeechAnalysis).filter(SpeechAnalysis.session_id == session_rec.id).all()

    avg_comm_score = 0.0
    avg_wpm = 0.0
    avg_grammar = 0.0
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
        "overall_score": session_rec.score or 0.0,
        "analysis_status": report.analysis_status or "complete",
        "confidence_score": report.confidence_score,
        "confident_frames_count": report.confident_frames_count or 0,
        "unconfident_frames_count": report.unconfident_frames_count or 0,
        "total_analyzed_frames": report.total_analyzed_frames or 0,
        "facial_presentation": report.facial_presentation or "N/A",
        "expression_consistency": report.expression_consistency,
        "positive_expression_frequency": report.positive_expression_frequency or "N/A",
        "facial_engagement": report.facial_engagement or "N/A",
        "dominant_emotion": report.dominant_emotion or "neutral",
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

