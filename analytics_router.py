from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from backend.auth import get_current_user, require_role
from backend.database import db

router = APIRouter(prefix="/api/analytics", tags=["Performance Analytics & Reports"])

class UserStatusUpdateRequest(BaseModel):
    status: str

@router.get("/report/{interview_id}")
def get_performance_report(
    interview_id: str,
    current_user: dict = Depends(get_current_user)
):
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview record not found.")

    if current_user["role"] == "candidate" and interview["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied to this report.")

    if not interview.get("report"):
        raise HTTPException(status_code=400, detail="Performance report is not yet generated for this interview.")

    candidate_resume = db.resumes.get(interview["user_id"])
    parsed_skills = candidate_resume["parsed_data"].get("skills", []) if candidate_resume else []

    return {
        "interview_id": interview["id"],
        "session_id": interview.get("session_id"),
        "candidate_name": interview["candidate_name"],
        "domain": interview["domain"],
        "difficulty": interview["difficulty"],
        "type": interview["type"],
        "status": interview.get("status", "Completed"),
        "start_time": interview.get("start_time"),
        "end_time": interview.get("end_time"),
        "duration_seconds": interview.get("duration_seconds", 0),
        "created_at": interview["created_at"],
        "skills": parsed_skills,
        "video_recording_ref": interview.get("video_recording_ref"),
        "audio_recording_ref": interview.get("audio_recording_ref"),
        "questions_attempted": interview.get("questions_attempted", len(interview.get("questions", []))),
        "question_times": interview.get("question_times", {}),
        "report": interview["report"],
        "questions": interview["questions"]
    }

@router.get("/recruiter")
def get_recruiter_dashboard(current_user: dict = Depends(require_role(["recruiter", "admin"]))):
    # Gather candidate submissions & interview performance analytics
    candidate_list = []
    
    total_candidates = sum(1 for u in db.users.values() if u["role"] == "candidate")
    completed_interviews = sum(1 for i in db.interviews.values() if i["status"] == "Completed")
    avg_score = 0
    scores = [i["report"]["overall_score"] for i in db.interviews.values() if i.get("report")]
    if scores:
        avg_score = int(sum(scores) / len(scores))

    for user_id, user in db.users.items():
        if user["role"] == "candidate":
            user_resume = db.resumes.get(user_id)
            user_interviews = [i for i in db.interviews.values() if i["user_id"] == user_id]
            latest_interview = user_interviews[-1] if user_interviews else None
            
            candidate_list.append({
                "user_id": user_id,
                "name": user["full_name"],
                "email": user["email"],
                "status": user.get("status", "Active"),
                "has_resume": bool(user_resume),
                "skills": user_resume["parsed_data"].get("skills", []) if user_resume else [],
                "latest_interview_id": latest_interview["id"] if latest_interview else None,
                "latest_score": latest_interview["report"]["overall_score"] if latest_interview and latest_interview.get("report") else None,
                "recommendation": latest_interview["report"]["recommendation"] if latest_interview and latest_interview.get("report") else "Pending Assessment"
            })

    return {
        "stats": {
            "total_candidates": total_candidates,
            "assessments_completed": completed_interviews,
            "average_score": avg_score,
            "top_skills": ["Python", "FastAPI", "JavaScript", "Docker", "React"]
        },
        "candidates": candidate_list
    }

@router.get("/admin")
def get_admin_dashboard(current_user: dict = Depends(require_role(["admin"]))):
    role_counts = {"candidate": 0, "recruiter": 0, "admin": 0}
    for u in db.users.values():
        r = u.get("role", "candidate")
        role_counts[r] = role_counts.get(r, 0) + 1

    users_data = []
    for u in db.users.values():
        users_data.append({
            "id": u["id"],
            "name": u["full_name"],
            "email": u["email"],
            "role": u["role"],
            "status": u.get("status", "Active"),
            "created_at": u.get("created_at", "")
        })

    total_interviews = len(db.interviews)
    resumes_parsed = len(db.resumes)

    return {
        "stats": {
            "total_users": len(db.users),
            "candidates_count": role_counts.get("candidate", 0),
            "recruiters_count": role_counts.get("recruiter", 0),
            "admins_count": role_counts.get("admin", 0),
            "total_interviews": total_interviews,
            "resumes_parsed": resumes_parsed
        },
        "users": users_data
    }

@router.patch("/admin/users/{user_id}/status")
def update_user_status(
    user_id: str,
    req: UserStatusUpdateRequest,
    current_user: dict = Depends(require_role(["admin"]))
):
    target = db.users.get(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    target["status"] = req.status
    return {
        "message": f"User status updated to {req.status}",
        "user_id": user_id,
        "status": req.status
    }
