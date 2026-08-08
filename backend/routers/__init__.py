from routers.auth import router as auth_router
from routers.candidate import router as candidate_router
from routers.recruiter import router as recruiter_router
from routers.admin import router as admin_router
from routers.interview import router as interview_router, api_router as interview_api_router, singular_api_router as interview_singular_api_router
from routers.question import router as question_router, api_router as question_api_router

__all__ = [
    "auth_router",
    "candidate_router",
    "recruiter_router",
    "admin_router",
    "interview_router",
    "interview_api_router",
    "interview_singular_api_router",
    "question_router",
    "question_api_router"
]
