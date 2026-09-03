import json

from database import get_db  # noqa: F401  (kept for parity with other services)
from services import scoring_engine

PILLAR_WEIGHTS = {
    "communication": 0.30,
    "confidence": 0.25,
    "technical": 0.30,
    "professionalism": 0.15,
}

CONFIDENCE_PARAM_WEIGHTS = {
    "eye_contact_consistency": 0.25,
    "facial_engagement": 0.20,
    "response_hesitation": 0.15,
    "speaking_confidence": 0.20,
    "attention_level": 0.20,
}

PROFESSIONALISM_PARAM_WEIGHTS = {
    "time_management": 0.25,
    "response_organization": 0.25,
    "professional_communication": 0.25,
    "interview_etiquette": 0.25,
}

ETIQUETTE_PENALTIES = {
    "multi_face_events": 12.0,
    "poor_lighting_events": 8.0,
    "no_face_events": 6.0,
}
ETIQUETTE_FLOOR = 40.0


def _clamp(v):
    return round(max(0.0, min(100.0, float(v))), 1)


def _safe_params(raw):
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except Exception:
        return {}


def _pillar_score(params, weights, fallback):
    total_w = 0.0
    acc = 0.0
    for key, w in weights.items():
        value = params.get(key)
        if not isinstance(value, (int, float)):
            value = fallback
        acc += float(value) * w
        total_w += w
    return round(acc / total_w, 2) if total_w else None


def _time_management_score(elapsed_seconds, duration_minutes):
    """Transparent rule: only overrunning the planned duration costs points."""
    if not isinstance(elapsed_seconds, (int, float)) or elapsed_seconds <= 0:
        return None
    allowed = max(1, int(duration_minutes or 15) * 60)
    overrun_ratio = max(0.0, (elapsed_seconds - allowed) / allowed)
    return _clamp(100.0 - overrun_ratio * 250.0)


def _etiquette_score(summary):
    frames = summary.get("frames_analyzed") or 0
    if frames <= 0:
        return None
    score = 100.0
    score -= ETIQUETTE_PENALTIES["multi_face_events"] * (summary.get("multi_face_events") or 0)
    score -= ETIQUETTE_PENALTIES["poor_lighting_events"] * (summary.get("poor_lighting_events") or 0)
    score -= ETIQUETTE_PENALTIES["no_face_events"] * (summary.get("no_face_events") or 0)
    return _clamp(max(ETIQUETTE_FLOOR, score))


def apply_vision_to_scores(conn, interview_id: int):
    """Incorporate vision metrics into Confidence and Professionalism pillars."""
    row = conn.execute(
        "SELECT * FROM interview_session WHERE id = ?", (interview_id,)
    ).fetchone()
    if not row:
        return None
    if not row["vision_metrics_json"]:
        return None
    try:
        vm_metrics = json.loads(row["vision_metrics_json"])
    except Exception:
        return None

    params = _safe_params(row["detailed_parameters_json"])
    avg_comm = row["communication_score"]
    avg_tech = row["technical_score"]
    fallback_conf = row["confidence_score"] if isinstance(row["confidence_score"], (int, float)) else 0.0
    fallback_prof = row["professionalism_score"] if isinstance(row["professionalism_score"], (int, float)) else 0.0

    eye = vm_metrics.get("eye") or {}
    engagement = vm_metrics.get("engagement") or {}
    eng_components = engagement.get("components") or {}
    ci_block = vm_metrics.get("confidence_indicator") or {}
    ci_components = ci_block.get("components") or {}

    confidence_overrides = {}
    if isinstance(eye.get("contact_pct"), (int, float)):
        confidence_overrides["eye_contact_consistency"] = _clamp(eye["contact_pct"])

    attention = eng_components.get("attention")
    if attention is None:
        attention = ci_components.get("attention")
    if attention is not None:
        confidence_overrides["attention_level"] = _clamp(attention)

    if ci_block.get("score") is not None:
        confidence_overrides["speaking_confidence"] = _clamp(ci_block["score"])

    facial_activity = eng_components.get("facial_activity")
    face_presence = eng_components.get("face_presence")
    if facial_activity is not None and face_presence is not None:
        confidence_overrides["facial_engagement"] = _clamp((facial_activity + face_presence) / 2.0)
    elif face_presence is not None:
        confidence_overrides["facial_engagement"] = _clamp(face_presence)

    professionalism_overrides = {}
    tm = _time_management_score(row["elapsed_seconds"], row["duration"])
    if tm is not None:
        professionalism_overrides["time_management"] = tm

    etiquette = _etiquette_score(vm_metrics)
    if etiquette is not None:
        professionalism_overrides["interview_etiquette"] = etiquette

    params.update(confidence_overrides)
    params.update(professionalism_overrides)

    conf_values = {k: params.get(k, fallback_conf) for k in CONFIDENCE_PARAM_WEIGHTS}
    prof_values = {k: params.get(k, fallback_prof) for k in PROFESSIONALISM_PARAM_WEIGHTS}
    new_conf = _pillar_score(conf_values, CONFIDENCE_PARAM_WEIGHTS, fallback_conf)
    new_prof = _pillar_score(prof_values, PROFESSIONALISM_PARAM_WEIGHTS, fallback_prof)
    if new_conf is None:
        new_conf = fallback_conf
    if new_prof is None:
        new_prof = fallback_prof

    overall = scoring_engine.calculate_weighted_overall(avg_comm, new_conf, avg_tech, new_prof)
    rating = scoring_engine.get_rating_rubric(overall)

    def _analysis(score, weight_key, param_weights, values, overrides, measure_label):
        return {
            f"{weight_key}_score": score,
            "total_interview_weight_pct": round(PILLAR_WEIGHTS[weight_key] * 100, 1),
            "contribution_points": round((score or 0) * PILLAR_WEIGHTS[weight_key], 1),
            "parameters": {
                k: {
                    "value": round(float(values[k]), 1),
                    "internal_weight_pct": round(w * 100, 1),
                    "source": "measured_vision" if k in overrides else measure_label,
                }
                for k, w in param_weights.items()
            },
        }

    confidence_analysis = _analysis(
        new_conf, "confidence", CONFIDENCE_PARAM_WEIGHTS, conf_values,
        set(confidence_overrides), "language_model",
    )
    professionalism_analysis = _analysis(
        new_prof, "professionalism", PROFESSIONALISM_PARAM_WEIGHTS, prof_values,
        set(professionalism_overrides), "language_model",
    )

    session_cols = {r["name"] for r in conn.execute("PRAGMA table_info(interview_session)").fetchall()}
    if "confidence_analysis_json" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN confidence_analysis_json TEXT")
    if "professionalism_analysis_json" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN professionalism_analysis_json TEXT")

    conn.execute(
        """UPDATE interview_session SET
             detailed_parameters_json = ?,
             confidence_score = ?,
             professionalism_score = ?,
             overall_score = ?,
             performance_rating = ?,
             confidence_analysis_json = ?,
             professionalism_analysis_json = ?
           WHERE id = ?""",
        (
            json.dumps(params),
            new_conf,
            new_prof,
            overall,
            rating,
            json.dumps(confidence_analysis),
            json.dumps(professionalism_analysis),
            interview_id,
        ),
    )
    conn.commit()

    return {
        "confidence_overrides": confidence_overrides,
        "professionalism_overrides": professionalism_overrides,
        "new_confidence": new_conf,
        "new_professionalism": new_prof,
        "overall": overall,
        "rating": rating,
    }
