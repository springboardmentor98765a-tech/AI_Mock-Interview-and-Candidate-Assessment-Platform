from routers.auth import router as auth_router
from routers.candidate import router as candidate_router
from routers.recruiter import router as recruiter_router
from routers.admin import router as admin_router

__all__ = ["auth_router", "candidate_router", "recruiter_router", "admin_router"]
