"""
main.py
========
FastAPI application entrypoint for AI Interview Pro.

Run with:
    uvicorn app.main:app --reload
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.database import Base, engine
from app.routes import auth_routes, user_routes, interview_routes, resume_routes

# Create all tables on startup if they do not already exist.
# (The provided sql/create_db.sql script does the same thing manually,
#  in case the team prefers to run migrations by hand.)
Base.metadata.create_all(bind=engine)

app = FastAPI(
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


@app.get("/")
def root():
    return {"status": "ok", "service": "AI Interview Pro API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
