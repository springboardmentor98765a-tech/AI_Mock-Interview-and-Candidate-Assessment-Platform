"""
Admin Dashboard & System Monitoring Router
Exposes dedicated endpoints for System Administrators:
- GET /api/admin/dashboard
- GET /api/admin/users
- PATCH /api/admin/users/{id}/status
- PATCH /api/admin/users/{id}/role
- GET /api/admin/interviews
- GET /api/admin/ai-monitoring
- GET /api/admin/system-health
- GET /api/admin/usage-analytics
Strict RBAC: Only admin role can access.
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from backend.auth import require_role
from backend.database import db
from backend.services.analytics_service import (
    calculate_interview_activity_monitoring,
    calculate_ai_pipeline_monitoring,
    calculate_platform_usage_analytics
)
from backend.services.system_health_service import check_system_health

router = APIRouter(prefix="/api/admin", tags=["Admin Dashboard & System Monitoring"])


class AdminUserStatusUpdateRequest(BaseModel):
    status: str


class AdminUserRoleUpdateRequest(BaseModel):
    role: str


@router.get("/dashboard")
def get_admin_dashboard_summary(
    current_user: dict = Depends(require_role(["admin"]))
):
    """
    Returns platform-wide administrative summary, user counts, interview volume, and health state.
    """
    all_users = getattr(db, "users", {})
    all_interviews = getattr(db, "interviews", {})
    all_resumes = getattr(db, "resumes", {})

    role_counts = {"candidate": 0, "recruiter": 0, "admin": 0}
    for u in all_users.values():
        r = u.get("role", "candidate")
        role_counts[r] = role_counts.get(r, 0) + 1

    health = check_system_health()
    activity = calculate_interview_activity_monitoring()

    # Aggregate authentic device detection metrics
    from backend.services.device_detection_service import device_detection_manager
    total_device_alerts = 0
    device_breakdown: Dict[str, int] = {}
    all_dev_sessions = device_detection_manager.get_all_sessions()
    for sid, trk in all_dev_sessions.items():
        summary = trk.generate_summary_dict()
        total_device_alerts += summary.get("total_alerts", 0)
        for d, c in summary.get("detected_device_counts", {}).items():
            device_breakdown[d] = device_breakdown.get(d, 0) + c

    model_status = device_detection_manager.detector.get_status()

    stats_data = {
        "total_users": len(all_users),
        "candidates_count": role_counts.get("candidate", 0),
        "recruiters_count": role_counts.get("recruiter", 0),
        "admins_count": role_counts.get("admin", 0),
        "total_interviews": len(all_interviews),
        "completed_interviews": activity.get("completed_interviews", 0),
        "resumes_parsed": len(all_resumes),
        "total_device_detection_alerts": total_device_alerts,
        "device_breakdown": device_breakdown,
        "device_model_status": model_status.get("status", "Operational"),
        "system_health": health.get("status", "Healthy")
    }

    return {
        "stats": stats_data,
        "system_stats": stats_data,
        "device_detection_summary": {
            "total_alerts": total_device_alerts,
            "device_breakdown": device_breakdown,
            "model_status": model_status
        },
        "system_health_quick": {
            "backend": health.get("subsystems", {}).get("backend", {}).get("status"),
            "database": health.get("subsystems", {}).get("database", {}).get("status"),
            "ai_service": health.get("subsystems", {}).get("ai_service", {}).get("status"),
            "storage": health.get("subsystems", {}).get("storage", {}).get("status"),
            "device_detector": model_status.get("status", "Operational")
        }
    }


@router.get("/users")
def get_admin_users(
    role: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["admin"]))
):
    """
    Returns platform user directory. Excludes password hashes and sensitive credentials.
    """
    all_users = getattr(db, "users", {})
    results = []

    for u in all_users.values():
        if role and role.lower() != "all" and u.get("role", "").lower() != role.lower():
            continue

        if status_filter and status_filter.lower() != "all" and u.get("status", "Active").lower() != status_filter.lower():
            continue

        if search:
            q = search.lower().strip()
            name_match = q in (u.get("full_name") or "").lower()
            email_match = q in (u.get("email") or "").lower()
            id_match = q in (u.get("id") or "").lower()
            if not (name_match or email_match or id_match):
                continue

        results.append({
            "id": u["id"],
            "name": u.get("full_name") or "User",
            "email": u.get("email"),
            "role": u.get("role", "candidate"),
            "company": u.get("company"),
            "status": u.get("status", "Active"),
            "created_at": u.get("created_at")
        })

    return {"users": results, "count": len(results)}


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    req: AdminUserStatusUpdateRequest,
    current_user: dict = Depends(require_role(["admin"]))
):
    """
    Activates, suspends, or deactivates a user account.
    """
    target = db.users.get(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    old_status = target.get("status", "Active")
    target["status"] = req.status

    db.log_activity(
        user_id=current_user["id"],
        action="update_user_status",
        entity_type="user",
        entity_id=user_id,
        details={"old_status": old_status, "new_status": req.status}
    )

    return {
        "message": f"User status updated to {req.status}",
        "user_id": user_id,
        "status": req.status
    }


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    req: AdminUserRoleUpdateRequest,
    current_user: dict = Depends(require_role(["admin"]))
):
    """
    Updates a user's role (candidate, recruiter, admin).
    """
    allowed_roles = ["candidate", "recruiter", "admin"]
    if req.role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Allowed: {', '.join(allowed_roles)}")

    target = db.users.get(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    old_role = target.get("role")
    target["role"] = req.role

    db.log_activity(
        user_id=current_user["id"],
        action="update_user_role",
        entity_type="user",
        entity_id=user_id,
        details={"old_role": old_role, "new_role": req.role}
    )

    return {
        "message": f"User role updated to {req.role}",
        "user_id": user_id,
        "role": req.role
    }


@router.get("/interviews")
def get_admin_interview_activity(
    current_user: dict = Depends(require_role(["admin"]))
):
    """
    Returns platform-wide interview activity: total, completed, in-progress, failed, abandoned,
    and domain/difficulty/date breakdowns.
    """
    return calculate_interview_activity_monitoring()


@router.get("/ai-monitoring")
def get_admin_ai_monitoring(
    current_user: dict = Depends(require_role(["admin"]))
):
    """
    Monitors the real AI evaluation pipeline: evaluations completed, failed,
    processing times, transcription/vision telemetry, and explicit accuracy disclosure.
    """
    return calculate_ai_pipeline_monitoring()


@router.get("/system-health")
def get_admin_system_health(
    current_user: dict = Depends(require_role(["admin"]))
):
    """
    Returns live system health diagnostic across Backend, Database, AI Service, Storage, Latency, and Errors.
    """
    return check_system_health()


@router.get("/usage-analytics")
def get_admin_usage_analytics(
    date_filter: str = Query("all", description="today, 7d, 30d, 90d, custom, all"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["admin"]))
):
    """
    Returns platform usage analytics with date range filtering.
    """
    return calculate_platform_usage_analytics(
        date_filter=date_filter,
        custom_from=date_from,
        custom_to=date_to
    )
