"""
Module 3: AI Interview Generation — Python service.

Run alongside the existing Node backend (which keeps owning auth,
resumes, jobs, notifications, admin):

    uvicorn app.main:app --reload --port 8001

Both services share the same PostgreSQL database and the same
JWT_SECRET, so a token from POST /api/auth/login (Node, port 5000)
works unchanged against this service (port 8001).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import FRONTEND_ORIGINS
from app.routers import admin_ai, admin_system, analytics, coding, interviews, notifications, templates

app = FastAPI(
    title="AI Interview Platform — Module 3 (Python)",
    description=(
        "AI Interview Generation, candidate feedback view, question text-to-speech, "
        "plus Module 8 (Dashboard & Analytics) and Module 9 (Notifications & Reports)."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_origin_regex=r".*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(templates.router)
app.include_router(interviews.router)
app.include_router(coding.router)
app.include_router(admin_ai.router)
app.include_router(admin_system.router)
app.include_router(analytics.router)
app.include_router(notifications.router)


@app.get("/")
def root():
    return {
        "service": "AI Interview Platform — Module 3 (Python)",
        "status": "ok",
        "docs": "/docs",
        "health": "/api/health",
        "note": "This service only exposes /api/... routes plus interactive docs at /docs.",
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "module3-python"}
