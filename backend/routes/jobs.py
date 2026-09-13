import json
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from core.database import get_db
from core.auth import get_current_user
from services import notification_service

router = APIRouter()


class JobCreateReq(BaseModel):
    title: str
    company_name: str
    domain: str
    location_type: str = "Remote"
    job_type: str = "Full-time"
    experience_level: str = "Mid Level"
    salary_range: Optional[str] = None
    skills: Optional[List[str]] = []
    description: str
    requirements: Optional[str] = None
    linked_template_id: Optional[int] = None
    status: Optional[str] = "active"


class JobUpdateReq(BaseModel):
    title: Optional[str] = None
    company_name: Optional[str] = None
    domain: Optional[str] = None
    location_type: Optional[str] = None
    job_type: Optional[str] = None
    experience_level: Optional[str] = None
    salary_range: Optional[str] = None
    skills: Optional[List[str]] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    linked_template_id: Optional[int] = None
    status: Optional[str] = None


class JobApplyReq(BaseModel):
    cover_note: Optional[str] = None


class ApplicationStatusReq(BaseModel):
    status: str
    notes: Optional[str] = None


def _calculate_ai_match(candidate_id: int, job_skills: List[str], job_domain: str, conn) -> float:
    if not job_skills and not job_domain:
        return 80.0

    user_skills_set = set()
    session_topics = conn.execute("""
        SELECT domain, overall_score, technical_score FROM interview_session
        WHERE (user_id = ? OR candidate_id = ?) AND status = 'completed'
    """, (candidate_id, candidate_id)).fetchall()

    assessment_topics = conn.execute("""
        SELECT target_role, topics_json, score_percentage FROM assessment
        WHERE user_id = ? AND status = 'completed'
    """, (candidate_id,)).fetchall()

    for s in session_topics:
        if s["domain"]:
            user_skills_set.add(s["domain"].lower())
            for part in s["domain"].lower().split():
                user_skills_set.add(part)

    for a in assessment_topics:
        if a["target_role"]:
            user_skills_set.add(a["target_role"].lower())
        if a["topics_json"]:
            try:
                t_list = json.loads(a["topics_json"])
                for t in t_list:
                    user_skills_set.add(str(t).lower())
            except Exception:
                pass

    job_skills_lower = [str(s).lower().strip() for s in job_skills]
    if job_skills_lower:
        matched = 0
        for js in job_skills_lower:
            if any(js in us or us in js for us in user_skills_set):
                matched += 1
        skill_score = (matched / len(job_skills_lower)) * 100
    else:
        skill_score = 80.0

    domain_match = 100.0 if any(job_domain.lower() in us for us in user_skills_set) else 65.0

    avg_performance = 75.0
    if session_topics:
        scores = [s["overall_score"] for s in session_topics if s["overall_score"] is not None]
        if scores:
            avg_performance = sum(scores) / len(scores)

    match_percentage = (skill_score * 0.5) + (domain_match * 0.25) + (avg_performance * 0.25)
    return round(max(55.0, min(98.5, match_percentage)), 1)


@router.get("/explore")
def explore_jobs(
    search: Optional[str] = None,
    domain: Optional[str] = None,
    location_type: Optional[str] = None,
    job_type: Optional[str] = None,
    experience_level: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    conn = get_db()
    candidate_id = user["id"]

    query = """
        SELECT jp.*, u.name as recruiter_name, u.email as recruiter_email,
               ja.id as application_id, ja.status as application_status, ja.created_at as applied_at
        FROM job_postings jp
        JOIN users u ON u.id = jp.recruiter_id
        LEFT JOIN job_applications ja ON ja.job_id = jp.id AND ja.candidate_id = ?
        WHERE jp.status = 'active'
    """
    params = [candidate_id]

    if search:
        query += " AND (jp.title LIKE ? OR jp.company_name LIKE ? OR jp.description LIKE ? OR jp.skills_json LIKE ?)"
        term = f"%{search.strip()}%"
        params.extend([term, term, term, term])

    if domain and domain.lower() != "all":
        query += " AND jp.domain = ?"
        params.append(domain)

    if location_type and location_type.lower() != "all":
        query += " AND jp.location_type = ?"
        params.append(location_type)

    if job_type and job_type.lower() != "all":
        query += " AND jp.job_type = ?"
        params.append(job_type)

    if experience_level and experience_level.lower() != "all":
        query += " AND jp.experience_level LIKE ?"
        params.append(f"%{experience_level}%")

    query += " ORDER BY jp.created_at DESC"
    rows = conn.execute(query, params).fetchall()

    jobs = []
    for r in rows:
        skills = []
        if r["skills_json"]:
            try:
                skills = json.loads(r["skills_json"])
            except Exception:
                skills = []

        match_score = _calculate_ai_match(candidate_id, skills, r["domain"], conn)

        jobs.append({
            "id": r["id"],
            "title": r["title"],
            "company_name": r["company_name"],
            "domain": r["domain"],
            "location_type": r["location_type"],
            "job_type": r["job_type"],
            "experience_level": r["experience_level"],
            "salary_range": r["salary_range"] or "Competitive",
            "skills": skills,
            "description": r["description"],
            "requirements": r["requirements"] or "",
            "linked_template_id": r["linked_template_id"],
            "status": r["status"],
            "created_at": r["created_at"],
            "recruiter_name": r["recruiter_name"],
            "ai_match_score": match_score,
            "has_applied": r["application_id"] is not None,
            "application_id": r["application_id"],
            "application_status": r["application_status"],
            "applied_at": r["applied_at"]
        })

    conn.close()
    return {"jobs": jobs, "total": len(jobs)}


@router.post("/{job_id}/apply")
def apply_to_job(job_id: int, req: JobApplyReq, user: dict = Depends(get_current_user)):
    user_role = user.get("role", "candidate")
    if user_role == "recruiter":
        raise HTTPException(status_code=400, detail="Recruiters cannot apply to job postings.")

    conn = get_db()
    candidate_id = user["id"]

    job = conn.execute("SELECT * FROM job_postings WHERE id = ?", (job_id,)).fetchone()
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="Job posting not found.")

    if job["status"] != "active":
        conn.close()
        raise HTTPException(status_code=400, detail="This job posting is no longer active.")

    existing = conn.execute(
        "SELECT id FROM job_applications WHERE job_id = ? AND candidate_id = ?",
        (job_id, candidate_id)
    ).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="You have already applied for this position.")

    skills = []
    if job["skills_json"]:
        try:
            skills = json.loads(job["skills_json"])
        except Exception:
            skills = []

    match_score = _calculate_ai_match(candidate_id, skills, job["domain"], conn)

    cur = conn.execute("""
        INSERT INTO job_applications (job_id, candidate_id, status, cover_note, ai_match_score, created_at, updated_at)
        VALUES (?, ?, 'applied', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    """, (job_id, candidate_id, req.cover_note or "", match_score))

    app_id = cur.lastrowid

    recruiter_id = job["recruiter_id"]
    conn.execute("""
        INSERT INTO notifications (user_id, type, title, message, data_json, created_at)
        VALUES (?, 'report_ready', ?, ?, ?, CURRENT_TIMESTAMP)
    """, (
        recruiter_id,
        f"New Candidate Application: {job['title']}",
        f"{user.get('name', 'A candidate')} has applied for the {job['title']} role ({match_score}% AI Match).",
        json.dumps({"job_id": job_id, "application_id": app_id, "candidate_id": candidate_id})
    ))

    conn.commit()
    conn.close()

    return {
        "message": "Application submitted successfully.",
        "application_id": app_id,
        "job_id": job_id,
        "status": "applied",
        "ai_match_score": match_score
    }


@router.get("/my-applications")
def get_my_applications(user: dict = Depends(get_current_user)):
    conn = get_db()
    candidate_id = user["id"]

    query = """
        SELECT ja.id as application_id, ja.status, ja.cover_note, ja.ai_match_score, ja.created_at as applied_at, ja.updated_at,
               jp.id as job_id, jp.title, jp.company_name, jp.domain, jp.location_type, jp.job_type, jp.salary_range,
               jp.status as job_status, jp.linked_template_id, u.name as recruiter_name
        FROM job_applications ja
        JOIN job_postings jp ON jp.id = ja.job_id
        JOIN users u ON u.id = jp.recruiter_id
        WHERE ja.candidate_id = ?
        ORDER BY ja.created_at DESC
    """
    rows = conn.execute(query, (candidate_id,)).fetchall()

    applications = []
    for r in rows:
        applications.append({
            "application_id": r["application_id"],
            "job_id": r["job_id"],
            "title": r["title"],
            "company_name": r["company_name"],
            "domain": r["domain"],
            "location_type": r["location_type"],
            "job_type": r["job_type"],
            "salary_range": r["salary_range"] or "Competitive",
            "job_status": r["job_status"],
            "linked_template_id": r["linked_template_id"],
            "recruiter_name": r["recruiter_name"],
            "status": r["status"],
            "cover_note": r["cover_note"],
            "ai_match_score": r["ai_match_score"],
            "applied_at": r["applied_at"],
            "updated_at": r["updated_at"]
        })

    conn.close()
    return {"applications": applications, "total": len(applications)}


@router.get("/recruiter")
def get_recruiter_jobs(user: dict = Depends(get_current_user)):
    user_role = user.get("role", "candidate")
    if user_role not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Access denied. Recruiter role required.")

    conn = get_db()
    recruiter_id = user["id"]

    query = """
        SELECT jp.*,
               COUNT(ja.id) as total_applicants,
               SUM(CASE WHEN ja.status = 'shortlisted' THEN 1 ELSE 0 END) as shortlisted_count
        FROM job_postings jp
        LEFT JOIN job_applications ja ON ja.job_id = jp.id
        WHERE jp.recruiter_id = ?
        GROUP BY jp.id
        ORDER BY jp.created_at DESC
    """
    rows = conn.execute(query, (recruiter_id,)).fetchall()

    jobs = []
    for r in rows:
        skills = []
        if r["skills_json"]:
            try:
                skills = json.loads(r["skills_json"])
            except Exception:
                skills = []

        jobs.append({
            "id": r["id"],
            "recruiter_id": r["recruiter_id"],
            "title": r["title"],
            "company_name": r["company_name"],
            "domain": r["domain"],
            "location_type": r["location_type"],
            "job_type": r["job_type"],
            "experience_level": r["experience_level"],
            "salary_range": r["salary_range"] or "Competitive",
            "skills": skills,
            "description": r["description"],
            "requirements": r["requirements"] or "",
            "linked_template_id": r["linked_template_id"],
            "status": r["status"],
            "total_applicants": r["total_applicants"] or 0,
            "shortlisted_count": r["shortlisted_count"] or 0,
            "created_at": r["created_at"],
            "updated_at": r["updated_at"]
        })

    conn.close()
    return {"jobs": jobs}


@router.post("")
def create_job(req: JobCreateReq, user: dict = Depends(get_current_user)):
    user_role = user.get("role", "candidate")
    if user_role not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Access denied. Recruiter role required.")

    if not req.title.strip() or not req.company_name.strip() or not req.description.strip():
        raise HTTPException(status_code=400, detail="Title, company name, and description are required.")

    conn = get_db()
    recruiter_id = user["id"]
    skills_json = json.dumps(req.skills or [])
    job_status = req.status if req.status in ("active", "draft", "paused", "closed") else "active"

    cur = conn.execute("""
        INSERT INTO job_postings (
            recruiter_id, title, company_name, domain, location_type, job_type,
            experience_level, salary_range, skills_json, description, requirements,
            linked_template_id, status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    """, (
        recruiter_id,
        req.title.strip(),
        req.company_name.strip(),
        req.domain.strip() if req.domain else "Software Engineering",
        req.location_type or "Remote",
        req.job_type or "Full-time",
        req.experience_level or "Mid Level",
        req.salary_range.strip() if req.salary_range else "Competitive",
        skills_json,
        req.description.strip(),
        req.requirements.strip() if req.requirements else "",
        req.linked_template_id,
        job_status
    ))
    conn.commit()
    job_id = cur.lastrowid
    row = conn.execute("SELECT * FROM job_postings WHERE id = ?", (job_id,)).fetchone()
    conn.close()

    return {
        "message": "Job posting published successfully.",
        "job": {
            "id": row["id"],
            "recruiter_id": row["recruiter_id"],
            "title": row["title"],
            "company_name": row["company_name"],
            "domain": row["domain"],
            "location_type": row["location_type"],
            "job_type": row["job_type"],
            "experience_level": row["experience_level"],
            "salary_range": row["salary_range"],
            "skills": req.skills or [],
            "description": row["description"],
            "requirements": row["requirements"],
            "linked_template_id": row["linked_template_id"],
            "status": row["status"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }
    }


@router.get("/{job_id}")
def get_job(job_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("""
        SELECT jp.*, u.name as recruiter_name, u.email as recruiter_email,
               COUNT(ja.id) as total_applicants
        FROM job_postings jp
        JOIN users u ON u.id = jp.recruiter_id
        LEFT JOIN job_applications ja ON ja.job_id = jp.id
        WHERE jp.id = ?
        GROUP BY jp.id
    """, (job_id,)).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Job posting not found.")

    skills = []
    if row["skills_json"]:
        try:
            skills = json.loads(row["skills_json"])
        except Exception:
            skills = []

    job_data = {
        "id": row["id"],
        "recruiter_id": row["recruiter_id"],
        "recruiter_name": row["recruiter_name"],
        "title": row["title"],
        "company_name": row["company_name"],
        "domain": row["domain"],
        "location_type": row["location_type"],
        "job_type": row["job_type"],
        "experience_level": row["experience_level"],
        "salary_range": row["salary_range"],
        "skills": skills,
        "description": row["description"],
        "requirements": row["requirements"],
        "linked_template_id": row["linked_template_id"],
        "status": row["status"],
        "total_applicants": row["total_applicants"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"]
    }
    conn.close()
    return {"job": job_data}


@router.put("/{job_id}")
def update_job(job_id: int, req: JobUpdateReq, user: dict = Depends(get_current_user)):
    user_role = user.get("role", "candidate")
    if user_role not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Access denied. Recruiter role required.")

    conn = get_db()
    recruiter_id = user["id"]

    job = conn.execute("SELECT * FROM job_postings WHERE id = ?", (job_id,)).fetchone()
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="Job posting not found.")

    if job["recruiter_id"] != recruiter_id and user_role != "admin":
        conn.close()
        raise HTTPException(status_code=403, detail="Cannot edit another recruiter's job posting.")

    updates = []
    values = []

    if req.title is not None:
        updates.append("title = ?")
        values.append(req.title.strip())
    if req.company_name is not None:
        updates.append("company_name = ?")
        values.append(req.company_name.strip())
    if req.domain is not None:
        updates.append("domain = ?")
        values.append(req.domain.strip())
    if req.location_type is not None:
        updates.append("location_type = ?")
        values.append(req.location_type)
    if req.job_type is not None:
        updates.append("job_type = ?")
        values.append(req.job_type)
    if req.experience_level is not None:
        updates.append("experience_level = ?")
        values.append(req.experience_level)
    if req.salary_range is not None:
        updates.append("salary_range = ?")
        values.append(req.salary_range.strip())
    if req.skills is not None:
        updates.append("skills_json = ?")
        values.append(json.dumps(req.skills))
    if req.description is not None:
        updates.append("description = ?")
        values.append(req.description.strip())
    if req.requirements is not None:
        updates.append("requirements = ?")
        values.append(req.requirements.strip())
    if req.linked_template_id is not None:
        updates.append("linked_template_id = ?")
        values.append(req.linked_template_id)
    if req.status is not None:
        if req.status not in ("active", "draft", "paused", "closed"):
            conn.close()
            raise HTTPException(status_code=400, detail="Invalid status value.")
        updates.append("status = ?")
        values.append(req.status)

    if updates:
        updates.append("updated_at = CURRENT_TIMESTAMP")
        values.append(job_id)
        conn.execute(f"UPDATE job_postings SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()

    row = conn.execute("SELECT * FROM job_postings WHERE id = ?", (job_id,)).fetchone()
    conn.close()

    return {"message": "Job posting updated successfully.", "job_id": job_id, "status": row["status"]}


@router.delete("/{job_id}")
def delete_job(job_id: int, user: dict = Depends(get_current_user)):
    user_role = user.get("role", "candidate")
    if user_role not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Access denied. Recruiter role required.")

    conn = get_db()
    recruiter_id = user["id"]

    job = conn.execute("SELECT * FROM job_postings WHERE id = ?", (job_id,)).fetchone()
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="Job posting not found.")

    if job["recruiter_id"] != recruiter_id and user_role != "admin":
        conn.close()
        raise HTTPException(status_code=403, detail="Cannot delete another recruiter's job posting.")

    conn.execute("DELETE FROM job_postings WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()

    return {"message": "Job posting deleted successfully.", "job_id": job_id}


@router.get("/{job_id}/applicants")
def get_job_applicants(job_id: int, user: dict = Depends(get_current_user)):
    user_role = user.get("role", "candidate")
    if user_role not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Access denied. Recruiter role required.")

    conn = get_db()
    recruiter_id = user["id"]

    job = conn.execute("SELECT * FROM job_postings WHERE id = ?", (job_id,)).fetchone()
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="Job posting not found.")

    if job["recruiter_id"] != recruiter_id and user_role != "admin":
        conn.close()
        raise HTTPException(status_code=403, detail="Access denied for this job posting.")

    query = """
        SELECT ja.id as application_id, ja.status, ja.cover_note, ja.ai_match_score, ja.created_at as applied_at,
               u.id as candidate_id, u.name as candidate_name, u.email as candidate_email, u.avatar as candidate_avatar,
               u.is_recruiter_visible, u.share_recordings_reports,
               COUNT(DISTINCT s.id) as sessions_count,
               COUNT(DISTINCT a.id) as assessments_count,
               AVG(s.overall_score) as avg_overall,
               AVG(s.technical_score) as avg_technical,
               AVG(s.communication_score) as avg_communication,
               AVG(s.confidence_score) as avg_confidence,
               AVG(a.score_percentage) as avg_assessment
        FROM job_applications ja
        JOIN users u ON u.id = ja.candidate_id
        LEFT JOIN interview_session s ON (u.id = s.candidate_id OR u.id = s.user_id) AND s.status = 'completed'
        LEFT JOIN assessment a ON u.id = a.user_id AND a.status = 'completed'
        WHERE ja.job_id = ?
        GROUP BY ja.id
        ORDER BY ja.ai_match_score DESC, ja.created_at DESC
    """
    rows = conn.execute(query, (job_id,)).fetchall()

    applicants = []
    for r in rows:
        overall = round(r["avg_overall"], 1) if r["avg_overall"] is not None else (round(r["avg_assessment"], 1) if r["avg_assessment"] is not None else 0.0)
        applicants.append({
            "application_id": r["application_id"],
            "candidate_id": r["candidate_id"],
            "candidate_name": r["candidate_name"],
            "candidate_email": r["candidate_email"],
            "candidate_avatar": r["candidate_avatar"],
            "status": r["status"],
            "cover_note": r["cover_note"] or "",
            "ai_match_score": r["ai_match_score"],
            "applied_at": r["applied_at"],
            "is_recruiter_visible": bool(r["is_recruiter_visible"]),
            "share_recordings_reports": bool(r["share_recordings_reports"]),
            "sessions_count": r["sessions_count"],
            "assessments_count": r["assessments_count"],
            "overall_score": overall,
            "technical_score": round(r["avg_technical"], 1) if r["avg_technical"] is not None else 0.0,
            "communication_score": round(r["avg_communication"], 1) if r["avg_communication"] is not None else 0.0,
            "confidence_score": round(r["avg_confidence"], 1) if r["avg_confidence"] is not None else 0.0
        })

    conn.close()
    return {"job": {"id": job["id"], "title": job["title"], "company_name": job["company_name"]}, "applicants": applicants, "total": len(applicants)}


@router.put("/applications/{application_id}/status")
def update_application_status(application_id: int, req: ApplicationStatusReq, user: dict = Depends(get_current_user)):
    user_role = user.get("role", "candidate")
    if user_role not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Access denied. Recruiter role required.")

    valid_statuses = ("applied", "screening", "shortlisted", "interview_scheduled", "offered", "rejected")
    if req.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    conn = get_db()
    recruiter_id = user["id"]

    app_row = conn.execute("""
        SELECT ja.*, jp.title as job_title, jp.company_name, jp.recruiter_id
        FROM job_applications ja
        JOIN job_postings jp ON jp.id = ja.job_id
        WHERE ja.id = ?
    """, (application_id,)).fetchone()

    if not app_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Application not found.")

    if app_row["recruiter_id"] != recruiter_id and user_role != "admin":
        conn.close()
        raise HTTPException(status_code=403, detail="Access denied for this application.")

    conn.execute("""
        UPDATE job_applications
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (req.status, application_id))

    stage_display = req.status.replace("_", " ").title()
    try:
        notification_service.create_notification(
            conn=conn,
            user_id=app_row["candidate_id"],
            notif_type="system",
            title=f"Application Update: {app_row['job_title']}",
            message=f"Your application status for {app_row['job_title']} at {app_row['company_name']} is now '{stage_display}'.",
            data={"application_id": application_id, "job_id": app_row["job_id"], "new_status": req.status, "action_type": "jobs"},
            send_email=True
        )
    except Exception as e:
        print(f"[Warning] Application update notification failed: {e}")

    conn.commit()
    conn.close()

    return {
        "message": f"Application status updated to {req.status}.",
        "application_id": application_id,
        "status": req.status
    }
