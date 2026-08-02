from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api import auth, users
from app.core.config import settings
from app.db.session import Base, engine
from app.models import user as user_model  # noqa: F401  (registers the table)

# Fine for coursework. Use Alembic migrations for anything real.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="SmartHire AI — authentication and role-based access control.",
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authlib stores the OAuth state here between the redirect and the callback.
app.add_middleware(SessionMiddleware, secret_key=settings.JWT_SECRET_KEY)

app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(users.router, prefix=settings.API_PREFIX)


@app.get("/")
def read_root():
    return {"status": "online", "service": settings.PROJECT_NAME, "docs": "/docs"}


@app.get(f"{settings.API_PREFIX}/health")
def health_check():
    dialect = engine.dialect.name
    return {"status": "healthy", "database": dialect, "google_login": settings.google_enabled}
