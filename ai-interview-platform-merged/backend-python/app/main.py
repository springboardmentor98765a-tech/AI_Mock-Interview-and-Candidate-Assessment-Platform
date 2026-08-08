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
from app.routers import interviews

app = FastAPI(
    title="AI Interview Platform — Module 3 (Python)",
    description="AI Interview Generation, candidate feedback view, and question text-to-speech.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interviews.router)


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
