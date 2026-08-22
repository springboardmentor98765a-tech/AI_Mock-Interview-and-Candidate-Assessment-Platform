"""
Module 6 - Task 8: Interview Behavior Analysis.

Whole-timeline analysis on top of Tasks 1-7. Produces:
  * global behavior metrics (eye contact / attention / visibility /
    head movement / attention breaks / expression distribution /
    confidence indicator / engagement score)
  * time-segmented narrative ("00:00 - 02:00 - Good eye contact")
  * plain-language summary points (check marks / warnings)

All values come from the already-measured session summary; nothing here
re-analyzes frames.
"""

from services.vision_monitor import BEHAVIOR_CONFIG


def _fmt_clock(seconds):
    seconds = int(round(seconds))
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def _segment_label(samples, span_s):
    cfg = BEHAVIOR_CONFIG
    total = len(samples)
    if total == 0 or span_s <= 0:
        return None

    present = sum(1 for s in samples if s.get("status") in ("face_detected", "multiple_faces"))
    presence = present / total * 100.0

    eye_known = [s for s in samples if s.get("eye") and s["eye"] != "?"]
    eye_contact = (sum(1 for s in eye_known if s["eye"] == "cam") / len(eye_known) * 100.0) if eye_known else None

    travel = 0.0
    last = None
    for s in samples:
        ypr = s.get("ypr")
        if not ypr or not all(isinstance(v, (int, float)) for v in ypr[:2]):
            continue
        cur = (float(ypr[0]), float(ypr[1]))
        if last is not None:
            d = abs(cur[0] - last[0]) + abs(cur[1] - last[1])
            if d < 90:
                travel += d
        last = cur
    movement_per_min = travel / (span_s / 60.0) if span_s >= 15 else None

    away_streak = 0
    max_away_streak = 0
    for s in samples:
        code = s.get("eye")
        if code and code not in ("cam", "?"):
            away_streak += 1
            max_away_streak = max(max_away_streak, away_streak)
        elif code == "cam":
            away_streak = 0

    if presence < 50.0:
        return "Candidate frequently off camera"
    if eye_contact is not None:
        if eye_contact >= cfg["good_eye_contact_pct"]:
            base = "Good eye contact"
        elif eye_contact <= cfg["away_eye_contact_pct"]:
            base = "Frequently looking away"
        else:
            base = "Mostly engaged with camera"
    else:
        base = "Limited vision data"

    if movement_per_min is not None and movement_per_min > cfg["movement_high_deg_per_min"]:
        return "Increased movement observed"
    if max_away_streak >= 3 and base == "Mostly engaged with camera":
        return "Repeated gaze away from camera"

    if (
        base == "Mostly engaged with camera"
        and movement_per_min is not None
        and movement_per_min <= cfg["movement_low_deg_per_min"]
    ):
        return "Stable attention"
    return base


def _build_segments(timeline, segment_seconds):
    if not timeline:
        return []
    segments = []
    start_t = 0.0
    window = []
    window_start_t = None

    def flush(window_samples, w_start, w_end):
        if not window_samples:
            return
        label = _segment_label(window_samples, w_end - w_start)
        if label:
            segments.append({
                "from": _fmt_clock(w_start),
                "to": _fmt_clock(w_end),
                "from_s": round(w_start, 1),
                "to_s": round(w_end, 1),
                "label": label,
            })

    for s in timeline:
        t = s.get("t", 0.0)
        if t is None:
            continue
        if window_start_t is None:
            window_start_t = start_t
        window.append(s)
        if t - start_t >= segment_seconds:
            flush(window, window_start_t, t)
            segments[-1]["to_s"] = round(t, 1)
            segments[-1]["to"] = _fmt_clock(t)
            start_t = t
            window = []
            window_start_t = t
    if window:
        end_t = timeline[-1].get("t") or start_t + segment_seconds
        flush(window, window_start_t, end_t)
    return segments


def _metrics_block(summary):
    eye = summary.get("eye") or {}
    engagement = summary.get("engagement") or {}

    contact_s = eye.get("seconds_contact") or 0.0
    away_s = eye.get("seconds_away") or 0.0
    unknown_s = eye.get("seconds_unknown") or 0.0
    measured = contact_s + away_s + unknown_s
    attention_pct = (
        round((contact_s + 0.5 * unknown_s) / measured * 100.0, 1)
        if measured > 0 else None
    )

    duration_s = summary.get("duration_seconds") or 0.0
    travel = 0.0
    last = None
    for s in summary.get("timeline") or []:
        ypr = s.get("ypr")
        if not ypr or not all(isinstance(v, (int, float)) for v in ypr[:2]):
            continue
        cur = (float(ypr[0]), float(ypr[1]))
        if last is not None:
            d = abs(cur[0] - last[0]) + abs(cur[1] - last[1])
            if d < 90:
                travel += d
        last = cur
    avg_movement = round(travel / (duration_s / 60.0), 1) if duration_s >= 30 else None

    emotion = summary.get("emotion") or {}

    return {
        "eye_contact_pct": eye.get("contact_pct"),
        "attention_pct": attention_pct,
        "face_visibility_pct": summary.get("face_detected_pct"),
        "avg_head_movement_deg_per_min": avg_movement,
        "longest_attention_break_s": round(engagement.get("activity_detail", {}).get("longest_away_streak_s") or 0.0, 1),
        "significant_attention_breaks": summary.get("significant_breaks", 0),
        "dominant_expression_distribution": emotion.get("dominant_distribution"),
        "confidence_indicator": (summary.get("confidence_indicator") or {}).get("score"),
        "engagement_score": engagement.get("score"),
    }


def _summary_points(summary, metrics):
    cfg = BEHAVIOR_CONFIG
    eye = summary.get("eye") or {}
    points = []

    ec = metrics.get("eye_contact_pct")
    if ec is not None:
        if ec >= cfg["good_eye_contact_pct"]:
            points.append({"kind": "good", "text": "Maintained good camera focus"})
        elif ec < cfg["away_eye_contact_pct"]:
            points.append({"kind": "warn", "text": "Frequently looked away from the camera"})
        elif (engagement := summary.get("engagement") or {}) and \
                (engagement.get("activity_detail", {}).get("longest_away_streak_s") or 0) >= 3.0:
            points.append({"kind": "warn", "text": "Occasional prolonged gaze away from camera"})
        else:
            points.append({"kind": "good", "text": "Camera focus was generally steady"})

    vis = metrics.get("face_visibility_pct")
    if vis is not None:
        if vis >= cfg["visible_good_pct"]:
            points.append({"kind": "good", "text": "Face remained visible for most of the session"})
        elif vis >= 70.0:
            points.append({"kind": "warn", "text": f"Face was missing from frame {round(100 - vis)}% of the time"})
        else:
            points.append({"kind": "warn", "text": "Candidate was off camera for large parts of the session"})

    att = metrics.get("attention_pct")
    breaks = metrics.get("significant_attention_breaks") or 0
    if att is not None:
        if att >= cfg["attention_consistent_pct"]:
            points.append({"kind": "good", "text": "Attention was generally consistent"})
        elif breaks >= 3:
            points.append({"kind": "warn", "text": f"Attention broke {breaks} times during the session"})
        else:
            points.append({"kind": "warn", "text": "Attention fluctuated through parts of the session"})

    longest = metrics.get("longest_attention_break_s") or 0.0
    if breaks > 0:
        points.append({
            "kind": "warn",
            "text": f"{breaks} significant attention break(s) detected (longest {longest:.0f}s away from camera)",
        })

    move = metrics.get("avg_head_movement_deg_per_min")
    if move is not None:
        if move < cfg["movement_low_deg_per_min"]:
            points.append({"kind": "warn", "text": "Very little movement detected - posture appeared static"})
        elif move > cfg["movement_high_deg_per_min"]:
            points.append({"kind": "warn", "text": "Increased head movement observed during the session"})
        else:
            points.append({"kind": "good", "text": "Natural, composed head movement throughout"})

    lighting_events = summary.get("poor_lighting_events") or 0
    if lighting_events > 0:
        points.append({"kind": "warn", "text": "Lighting quality dropped at points in the session"})

    multi = summary.get("multi_face_events") or 0
    if multi > 0:
        points.append({"kind": "warn", "text": f"Additional faces detected in frame {multi} time(s)"})

    warnings = ((summary.get("attention") or {}).get("warnings_count")) if isinstance(summary.get("attention"), dict) else None
    if warnings:
        points.append({"kind": "warn", "text": f"Received {warnings} attention warning(s) during the interview"})

    integrity_flagged = False
    ci = summary.get("confidence_indicator") or {}
    if ci.get("score") is not None:
        band = ci.get("band")
        if band == "Strong":
            points.append({"kind": "good", "text": f"Confidence Indicator landed in the Strong band ({ci['score']:.0f})"})
        elif band == "Developing":
            points.append({"kind": "warn", "text": f"Confidence Indicator landed in the Developing band ({ci['score']:.0f})"})

    en = summary.get("engagement") or {}
    if en.get("level") == "High":
        points.append({"kind": "good", "text": f"Overall engagement was High ({en['score']:.0f})"})
    elif en.get("level") == "Low":
        points.append({"kind": "warn", "text": f"Overall engagement measured Low ({en['score']:.0f})"})

    return points


def analyze(summary):
    """Build the full Interview Behavior Analysis block from a session summary."""
    if not summary:
        return None
    metrics = _metrics_block(summary)
    segments = _build_segments(
        summary.get("timeline") or [],
        BEHAVIOR_CONFIG["segment_seconds"],
    )
    points = _summary_points(summary, metrics)
    return {
        "metrics": metrics,
        "segments": segments,
        "summary_points": points,
        "method": "timeline_rollup_v1",
    }
