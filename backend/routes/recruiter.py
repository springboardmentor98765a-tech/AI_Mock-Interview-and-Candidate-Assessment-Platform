from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
import json
from database import get_db
from auth import get_current_user

router = APIRouter()


class StatusUpdateReq(BaseModel):
    status: str
    notes: Optional[str] = None


def clean_stale_sessions(conn):
    """Automatically convert stale abandoned in_progress or paused sessions (older than 1 hour) into completed state."""
    conn.execute("""
        UPDATE interview_session
        SET status = 'completed',
            completed_at = COALESCE(started_at, created_at)
        WHERE status IN ('in_progress', 'paused')
          AND (
            (started_at IS NOT NULL AND strftime('%s', 'now') - strftime('%s', started_at) > 3600)
            OR (started_at IS NULL AND strftime('%s', 'now') - strftime('%s', created_at) > 3600)
          )
    """)
    conn.commit()


@router.get("/summary")
def get_recruiter_summary(user: dict = Depends(get_current_user)):
    user_role = user.get("role", "candidate")
    if user_role not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Access denied. Recruiter role required.")

    conn = get_db()
    clean_stale_sessions(conn)
    recruiter_id = user["id"]

    # 1. Total Candidates
    total_candidates = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'candidate'").fetchone()[0]

    # 2. Shortlisted Count for this recruiter
    shortlisted_count = conn.execute(
        "SELECT COUNT(*) FROM recruiter_candidate_status WHERE recruiter_id = ? AND status = 'shortlisted'",
        (recruiter_id,)
    ).fetchone()[0]

    # 3. Active Live Sessions
    active_live_sessions = conn.execute(
        "SELECT COUNT(*) FROM interview_session WHERE status IN ('in_progress', 'paused')"
    ).fetchone()[0]

    # 4. Platform Average Candidate Score
    avg_row = conn.execute(
        "SELECT AVG(overall_score) FROM interview_session WHERE overall_score IS NOT NULL AND status = 'completed'"
    ).fetchone()
    avg_score = round(avg_row[0], 1) if avg_row and avg_row[0] is not None else 0.0

    # 5. Hiring Funnel Breakdown
    assessed_count = conn.execute(
        "SELECT COUNT(DISTINCT candidate_id) FROM interview_session WHERE status = 'completed'"
    ).fetchone()[0]

    under_review_count = conn.execute(
        "SELECT COUNT(*) FROM recruiter_candidate_status WHERE recruiter_id = ? AND status = 'under_review'",
        (recruiter_id,)
    ).fetchone()[0]

    rejected_count = conn.execute(
        "SELECT COUNT(*) FROM recruiter_candidate_status WHERE recruiter_id = ? AND status = 'rejected'",
        (recruiter_id,)
    ).fetchone()[0]

    hiring_funnel = {
        "applied": total_candidates,
        "assessed": assessed_count,
        "shortlisted": shortlisted_count,
        "under_review": under_review_count,
        "rejected": rejected_count
    }

    # 6. Top Candidates Spotlight
    top_candidates_rows = conn.execute("""
        SELECT 
            u.id, u.name, u.email,
            AVG(s.overall_score) as avg_overall,
            AVG(s.technical_score) as avg_tech,
            COUNT(s.id) as total_sessions,
            MAX(s.domain) as last_domain,
            COALESCE(rcs.status, 'new') as shortlist_status
        FROM users u
        JOIN interview_session s ON u.id = COALESCE(s.candidate_id, s.user_id)
        LEFT JOIN recruiter_candidate_status rcs ON rcs.candidate_id = u.id AND rcs.recruiter_id = ?
        WHERE u.role = 'candidate' AND s.overall_score IS NOT NULL
        GROUP BY u.id
        ORDER BY avg_overall DESC
        LIMIT 5
    """, (recruiter_id,)).fetchall()

    top_candidates = []
    for r in top_candidates_rows:
        top_candidates.append({
            "id": r["id"],
            "name": r["name"],
            "email": r["email"],
            "overall_score": round(r["avg_overall"], 1) if r["avg_overall"] else 0,
            "technical_score": round(r["avg_tech"], 1) if r["avg_tech"] else 0,
            "total_sessions": r["total_sessions"],
            "domain": r["last_domain"] or "Software Engineering",
            "status": r["shortlist_status"]
        })

    conn.close()

    return {
        "total_candidates": total_candidates,
        "shortlisted_count": shortlisted_count,
        "active_live_sessions": active_live_sessions,
        "avg_candidate_score": avg_score,
        "hiring_funnel": hiring_funnel,
        "top_candidates": top_candidates
    }


@router.get("/candidates")
def get_recruiter_candidates(
    search: Optional[str] = None,
    status_filter: Optional[str] = Query("all"),
    user: dict = Depends(get_current_user)
):
    user_role = user.get("role", "candidate")
    if user_role not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Access denied. Recruiter role required.")

    conn = get_db()
    recruiter_id = user["id"]

    query = """
        SELECT 
            u.id, u.name, u.email, u.created_at,
            COALESCE(rcs.status, 'new') as shortlist_status,
            rcs.notes,
            COUNT(DISTINCT s.id) as sessions_count,
            COUNT(DISTINCT a.id) as assessments_count,
            AVG(s.overall_score) as avg_overall,
            AVG(s.technical_score) as avg_technical,
            AVG(s.communication_score) as avg_communication,
            AVG(s.confidence_score) as avg_confidence,
            AVG(a.score_percentage) as avg_assessment,
            MAX(s.domain) as domain,
            MAX(s.created_at) as last_interview_date
        FROM users u
        LEFT JOIN recruiter_candidate_status rcs ON rcs.candidate_id = u.id AND rcs.recruiter_id = ?
        LEFT JOIN interview_session s ON (u.id = s.candidate_id OR u.id = s.user_id) AND s.status = 'completed'
        LEFT JOIN assessment a ON u.id = a.user_id AND a.status = 'completed'
        WHERE u.role = 'candidate'
    """
    params = [recruiter_id]

    if search:
        query += " AND (u.name LIKE ? OR u.email LIKE ? OR s.domain LIKE ?)"
        term = f"%{search.strip()}%"
        params.extend([term, term, term])

    if status_filter and status_filter != "all":
        if status_filter == "new":
            query += " AND rcs.status IS NULL"
        else:
            query += " AND rcs.status = ?"
            params.append(status_filter)

    query += " GROUP BY u.id ORDER BY avg_overall DESC, u.created_at DESC"

    rows = conn.execute(query, params).fetchall()
    candidates = []

    for r in rows:
        overall = round(r["avg_overall"], 1) if r["avg_overall"] is not None else (round(r["avg_assessment"], 1) if r["avg_assessment"] is not None else 0.0)
        tech = round(r["avg_technical"], 1) if r["avg_technical"] is not None else 0.0
        comm = round(r["avg_communication"], 1) if r["avg_communication"] is not None else 0.0
        conf = round(r["avg_confidence"], 1) if r["avg_confidence"] is not None else 0.0
        assess = round(r["avg_assessment"], 1) if r["avg_assessment"] is not None else 0.0

        if overall >= 85:
            rating = "Exceptional"
            trend = "improving"
        elif overall >= 70:
            rating = "Strong"
            trend = "stable"
        elif overall >= 50:
            rating = "Satisfactory"
            trend = "stable"
        elif overall > 0:
            rating = "Needs Work"
            trend = "needs_work"
        else:
            rating = "Not Assessed"
            trend = "stable"

        candidates.append({
            "id": r["id"],
            "name": r["name"],
            "email": r["email"],
            "created_at": r["created_at"],
            "status": r["shortlist_status"],
            "notes": r["notes"] or "",
            "sessions_count": r["sessions_count"],
            "assessments_count": r["assessments_count"],
            "overall_score": overall,
            "technical_score": tech,
            "communication_score": comm,
            "confidence_score": conf,
            "assessment_score": assess,
            "domain": r["domain"] or "General Practice",
            "rating": rating,
            "trend": trend,
            "last_active": r["last_interview_date"] or r["created_at"]
        })

    conn.close()
    return {"candidates": candidates}


@router.put("/candidates/{candidate_id}/status")
def update_candidate_status(
    candidate_id: int,
    req: StatusUpdateReq,
    user: dict = Depends(get_current_user)
):
    user_role = user.get("role", "candidate")
    if user_role not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Access denied. Recruiter role required.")

    if req.status not in ("shortlisted", "under_review", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid status value.")

    conn = get_db()
    recruiter_id = user["id"]

    cand = conn.execute("SELECT id, name FROM users WHERE id = ? AND role = 'candidate'", (candidate_id,)).fetchone()
    if not cand:
        conn.close()
        raise HTTPException(status_code=404, detail="Candidate not found.")

    conn.execute("""
        INSERT INTO recruiter_candidate_status (recruiter_id, candidate_id, status, notes, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(recruiter_id, candidate_id) DO UPDATE SET
            status = excluded.status,
            notes = COALESCE(excluded.notes, recruiter_candidate_status.notes),
            updated_at = CURRENT_TIMESTAMP
    """, (recruiter_id, candidate_id, req.status, req.notes))
    conn.commit()
    conn.close()

    return {"message": f"Candidate status updated to {req.status}", "candidate_id": candidate_id, "status": req.status}


class TemplateCreateReq(BaseModel):
    title: str
    interview_type: str
    domain: Optional[str] = None
    difficulty: Optional[str] = "medium"
    duration_minutes: Optional[int] = 15
    num_questions: Optional[int] = 5
    topics: Optional[List[str]] = []
    description: Optional[str] = None


@router.get("/sessions")
def get_recruiter_sessions(
    status_filter: Optional[str] = Query("all"),
    user: dict = Depends(get_current_user)
):
    user_role = user.get("role", "candidate")
    if user_role not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Access denied. Recruiter role required.")

    conn = get_db()
    clean_stale_sessions(conn)
    query = """
        SELECT 
            s.id as session_id,
            s.interview_type,
            s.domain,
            s.difficulty,
            s.status,
            s.duration,
            s.elapsed_seconds,
            s.current_question_index,
            s.overall_score,
            s.technical_score,
            s.communication_score,
            s.confidence_score,
            s.performance_rating,
            s.created_at,
            s.started_at,
            s.completed_at,
            u.id as candidate_id,
            u.name as candidate_name,
            u.email as candidate_email,
            r.id as recording_id,
            r.mime_type as recording_mime_type,
            r.file_size_bytes as recording_size
        FROM interview_session s
        JOIN users u ON u.id = COALESCE(s.candidate_id, s.user_id)
        LEFT JOIN interview_recording r ON r.session_id = s.id
        WHERE u.role = 'candidate'
    """
    params = []

    if status_filter and status_filter != "all":
        if status_filter == "live":
            query += " AND s.status IN ('in_progress', 'paused')"
        else:
            query += " AND s.status = ?"
            params.append(status_filter)

    query += " ORDER BY s.created_at DESC"
    rows = conn.execute(query, params).fetchall()

    sessions = []
    for r in rows:
        q_count = conn.execute(
            "SELECT COUNT(*) FROM interview_question WHERE interview_id = ?",
            (r["session_id"],)
        ).fetchone()[0]

        q_curr = conn.execute(
            "SELECT question_text FROM interview_question WHERE interview_id = ? AND sequence_no = ?",
            (r["session_id"], (r["current_question_index"] or 0) + 1)
        ).fetchone()

        sessions.append({
            "session_id": r["session_id"],
            "interview_type": r["interview_type"],
            "domain": r["domain"] or "General Domain",
            "difficulty": r["difficulty"] or "medium",
            "status": r["status"],
            "duration": r["duration"] or 15,
            "elapsed_seconds": r["elapsed_seconds"] or 0,
            "current_question_index": r["current_question_index"] or 0,
            "total_questions": q_count or 5,
            "current_question": q_curr["question_text"] if q_curr else "N/A",
            "overall_score": round(r["overall_score"], 1) if r["overall_score"] is not None else None,
            "technical_score": round(r["technical_score"], 1) if r["technical_score"] is not None else None,
            "communication_score": round(r["communication_score"], 1) if r["communication_score"] is not None else None,
            "confidence_score": round(r["confidence_score"], 1) if r["confidence_score"] is not None else None,
            "performance_rating": r["performance_rating"],
            "created_at": r["created_at"],
            "started_at": r["started_at"],
            "completed_at": r["completed_at"],
            "candidate_id": r["candidate_id"],
            "candidate_name": r["candidate_name"],
            "candidate_email": r["candidate_email"],
            "recording_id": r["recording_id"],
            "recording_mime_type": r["recording_mime_type"],
            "recording_size": r["recording_size"]
        })

    conn.close()
    return {"sessions": sessions}


@router.get("/compare")
def get_recruiter_compare(
    candidate_ids: str = Query(..., description="Comma separated candidate user IDs"),
    user: dict = Depends(get_current_user)
):
    user_role = user.get("role", "candidate")
    if user_role not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Access denied. Recruiter role required.")

    try:
        c_ids = [int(x.strip()) for x in candidate_ids.split(",") if x.strip().isdigit()]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid candidate IDs.")

    if not c_ids:
        return {"comparison": []}

    conn = get_db()
    recruiter_id = user["id"]
    placeholders = ",".join(["?"] * len(c_ids))

    query = f"""
        SELECT 
            u.id, u.name, u.email,
            COALESCE(rcs.status, 'new') as shortlist_status,
            COUNT(DISTINCT s.id) as sessions_count,
            AVG(s.overall_score) as avg_overall,
            AVG(s.technical_score) as avg_technical,
            AVG(s.communication_score) as avg_communication,
            AVG(s.confidence_score) as avg_confidence,
            AVG(s.professionalism_score) as avg_professionalism,
            AVG(a.score_percentage) as avg_assessment,
            MAX(s.domain) as domain
        FROM users u
        LEFT JOIN recruiter_candidate_status rcs ON rcs.candidate_id = u.id AND rcs.recruiter_id = ?
        LEFT JOIN interview_session s ON (u.id = s.candidate_id OR u.id = s.user_id) AND s.status = 'completed'
        LEFT JOIN assessment a ON u.id = a.user_id AND a.status = 'completed'
        WHERE u.id IN ({placeholders}) AND u.role = 'candidate'
        GROUP BY u.id
    """
    params = [recruiter_id] + c_ids
    rows = conn.execute(query, params).fetchall()

    comparison = []
    for r in rows:
        tech = round(r["avg_technical"], 1) if r["avg_technical"] is not None else 0.0
        comm = round(r["avg_communication"], 1) if r["avg_communication"] is not None else 0.0
        conf = round(r["avg_confidence"], 1) if r["avg_confidence"] is not None else 0.0
        prof = round(r["avg_professionalism"], 1) if r["avg_professionalism"] is not None else 0.0
        assess = round(r["avg_assessment"], 1) if r["avg_assessment"] is not None else 0.0
        overall = round(r["avg_overall"], 1) if r["avg_overall"] is not None else (assess or 0.0)

        # AI Recommendation Synthesis
        if overall >= 85:
            fit = "Strong Hiring Candidate — High Technical & Communication Aptitude"
            badge = "Top Pick"
        elif overall >= 70:
            fit = "Solid Candidate — Recommending Final Round Technical Review"
            badge = "Good Match"
        elif overall >= 50:
            fit = "Moderate Fit — Additional Skills Assessment Advised"
            badge = "Moderate"
        else:
            fit = "Requires Skill Enhancement & Further Training"
            badge = "Needs Work"

        comparison.append({
            "id": r["id"],
            "name": r["name"],
            "email": r["email"],
            "domain": r["domain"] or "General Engineering",
            "status": r["shortlist_status"],
            "overall_score": overall,
            "technical_score": tech,
            "communication_score": comm,
            "confidence_score": conf,
            "professionalism_score": prof,
            "assessment_score": assess,
            "sessions_count": r["sessions_count"],
            "ai_recommendation": fit,
            "badge": badge
        })

    conn.close()
    return {"comparison": comparison}


@router.get("/sessions/live")
def get_recruiter_live_sessions(user: dict = Depends(get_current_user)):
    return get_recruiter_sessions(status_filter="live", user=user)


# Templates API
@router.get("/templates")
def get_recruiter_templates(user: dict = Depends(get_current_user)):
    user_role = user.get("role", "candidate")
    if user_role not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Access denied. Recruiter role required.")

    conn = get_db()
    recruiter_id = user["id"]

    rows = conn.execute("""
        SELECT * FROM interview_template 
        WHERE recruiter_id IS NULL OR recruiter_id = ?
        ORDER BY id DESC
    """, (recruiter_id,)).fetchall()

    templates = []
    for r in rows:
        topics = []
        if r["topics_json"]:
            try:
                topics = json.loads(r["topics_json"])
            except Exception:
                topics = []

        templates.append({
            "id": r["id"],
            "recruiter_id": r["recruiter_id"],
            "title": r["title"],
            "interview_type": r["interview_type"],
            "domain": r["domain"] or "Software Engineering",
            "difficulty": r["difficulty"] or "medium",
            "duration_minutes": r["duration_minutes"] or 15,
            "num_questions": r["num_questions"] or 5,
            "topics": topics,
            "description": r["description"] or "",
            "is_system": r["recruiter_id"] is None,
            "created_at": r["created_at"]
        })

    conn.close()
    return {"templates": templates}


@router.post("/templates")
def create_recruiter_template(req: TemplateCreateReq, user: dict = Depends(get_current_user)):
    user_role = user.get("role", "candidate")
    if user_role not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Access denied. Recruiter role required.")

    if not req.title.strip() or not req.interview_type.strip():
        raise HTTPException(status_code=400, detail="Title and interview type are required.")

    conn = get_db()
    recruiter_id = user["id"]
    topics_json = json.dumps(req.topics or [])

    cur = conn.execute("""
        INSERT INTO interview_template (recruiter_id, title, interview_type, domain, difficulty, duration_minutes, num_questions, topics_json, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        recruiter_id,
        req.title.strip(),
        req.interview_type.strip(),
        req.domain.strip() if req.domain else "Software Engineering",
        req.difficulty or "medium",
        req.duration_minutes or 15,
        req.num_questions or 5,
        topics_json,
        req.description.strip() if req.description else ""
    ))
    conn.commit()
    template_id = cur.lastrowid
    row = conn.execute("SELECT * FROM interview_template WHERE id = ?", (template_id,)).fetchone()
    conn.close()

    return {
        "message": "Interview template created successfully.",
        "template": {
            "id": row["id"],
            "recruiter_id": row["recruiter_id"],
            "title": row["title"],
            "interview_type": row["interview_type"],
            "domain": row["domain"],
            "difficulty": row["difficulty"],
            "duration_minutes": row["duration_minutes"],
            "num_questions": row["num_questions"],
            "topics": req.topics or [],
            "description": row["description"],
            "is_system": False,
            "created_at": row["created_at"]
        }
    }


@router.delete("/templates/{template_id}")
def delete_recruiter_template(template_id: int, user: dict = Depends(get_current_user)):
    user_role = user.get("role", "candidate")
    if user_role not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Access denied. Recruiter role required.")

    conn = get_db()
    recruiter_id = user["id"]

    tpl = conn.execute("SELECT id, recruiter_id FROM interview_template WHERE id = ?", (template_id,)).fetchone()
    if not tpl:
        conn.close()
        raise HTTPException(status_code=404, detail="Template not found.")

    if tpl["recruiter_id"] is None and user_role != "admin":
        conn.close()
        raise HTTPException(status_code=403, detail="Cannot delete default system template.")

    conn.execute("DELETE FROM interview_template WHERE id = ?", (template_id,))
    conn.commit()
    conn.close()

    return {"message": "Template deleted successfully.", "template_id": template_id}

