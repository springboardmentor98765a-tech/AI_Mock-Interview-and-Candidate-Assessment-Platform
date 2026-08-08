"""
routes/user_routes.py
=======================
Role-protected endpoints, one per dashboard:
    GET /candidate/profile   (role: candidate)
    GET /recruiter/profile   (role: recruiter)
    GET /admin/profile       (role: admin)

Each one demonstrates how a dashboard-specific route is locked down
to only the matching role using the require_role() dependency.
"""

from fastapi import APIRouter, Depends

from app.models import User
from app.auth import require_role
from app.schemas import UserOut

router = APIRouter(tags=["Dashboards"])


@router.get("/candidate/profile", response_model=UserOut)
def candidate_profile(current_user: User = Depends(require_role("candidate"))):
    return UserOut.model_validate(current_user)


@router.get("/recruiter/profile", response_model=UserOut)
def recruiter_profile(current_user: User = Depends(require_role("recruiter"))):
    return UserOut.model_validate(current_user)


@router.get("/admin/profile", response_model=UserOut)
def admin_profile(current_user: User = Depends(require_role("admin"))):
    return UserOut.model_validate(current_user)
