"""
main.py
========
FastAPI application entrypoint for AI Interview Pro.

Run with:
    uvicorn app.main:app --reload
"""

import os
import asyncio
import logging
import time
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine
from app.routes import auth_routes, user_routes, interview_routes, resume_routes, session_routes, candidate_management_routes, module8_routes
from app.routes import module9_routes
from app.routes import dashboard_routes, feedback_routes
from app.notification_service import process_notifications


@asynccontextmanager
async def lifespan(app):
    stop = asyncio.Event()
    async def worker():
        while not stop.is_set():
            try:
                await asyncio.to_thread(process_notifications)
            except Exception:
                logging.getLogger(__name__).exception("Notification worker cycle failed")
            try:
                await asyncio.wait_for(stop.wait(), timeout=30)
            except asyncio.TimeoutError:
                pass
    task = asyncio.create_task(worker()) if settings.NOTIFICATION_WORKER_ENABLED else None
    yield
    stop.set()
    if task:
        with suppress(asyncio.CancelledError):
            await task

# Create all tables on startup if they do not already exist.
# (The provided sql/create_db.sql script does the same thing manually,
#  in case the team prefers to run migrations by hand.)
Base.metadata.create_all(bind=engine)

# Keep existing PostgreSQL installations runnable without requiring users to
# rebuild their database. New tables are handled by create_all; these additive
# columns need a small idempotent compatibility migration.
if engine.dialect.name == "postgresql":
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS professionalism_score REAL"))
        connection.execute(text("ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS scoring_method VARCHAR(30)"))
        connection.execute(text("ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS scoring_version VARCHAR(30)"))
        connection.execute(text("ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS question_feedback TEXT"))
        connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 0"))

# Module 4 - Interview Session Management: local folder that stores
# uploaded webcam/microphone session recordings.
os.makedirs(os.path.join(settings.MEDIA_ROOT, "recordings"), exist_ok=True)

app = FastAPI(
    lifespan=lifespan,
    title="AI Interview Pro API",
    description="Backend API for the AI Interview Platform (auth, users, dashboards).",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

# Required by Authlib to store the OAuth "state" between the redirect to
# Google and the callback.
app.add_middleware(SessionMiddleware, secret_key=settings.SESSION_SECRET_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def operational_headers(request: Request, call_next):
    """Add lightweight timing and baseline browser security headers."""
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time-Ms"] = f"{(time.perf_counter() - started) * 1000:.2f}"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Recordings are intentionally not mounted as public static files. Module 8
# streams them through an authenticated, consent-aware session endpoint.


# ---------------------------------------------------------------------------
# Global error handlers -> consistent, meaningful JSON error responses
# ---------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    # Turn pydantic's verbose error list into a single readable message
    first_error = exc.errors()[0]
    message = first_error.get("msg", "Invalid input.")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": message},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=getattr(exc, "headers", None),
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(interview_routes.router)
app.include_router(resume_routes.router)
app.include_router(session_routes.router)
app.include_router(candidate_management_routes.router)
app.include_router(module8_routes.router)
app.include_router(module9_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(feedback_routes.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "AI Interview Pro API"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/health/live", include_in_schema=False)
def liveness():
    """Process-level probe used by containers and cloud platforms."""
    return {"status": "alive", "service": "api"}


@app.get("/health/ready", include_in_schema=False)
def readiness():
    """Dependency-level probe. A failed database check returns HTTP 503."""
    checks = {
        "database": "unavailable",
        "media_storage": "writable" if os.access(settings.MEDIA_ROOT, os.W_OK) else "not_writable",
        "ai_model": settings.GEMINI_MODEL if settings.GEMINI_API_KEY else "local_fallback",
    }
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception:
        logging.getLogger(__name__).exception("Readiness database check failed")
        return JSONResponse(status_code=503, content={"status": "not_ready", "checks": checks})
    ready = checks["media_storage"] == "writable"
    return JSONResponse(
        status_code=200 if ready else 503,
        content={"status": "ready" if ready else "not_ready", "checks": checks},
    )
