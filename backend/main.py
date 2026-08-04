# ============================================================
#  main.py — FastAPI Application Entry Point
# ============================================================
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import close_pool, get_pool
from app.routers import auth, oauth, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialise connection pool
    print("[SmartHire] API starting...")
    pool = await get_pool()
    print("[SmartHire] PostgreSQL connected successfully")
    yield
    # Shutdown: close pool
    await close_pool()
    print("[SmartHire] API shut down")


app = FastAPI(
    title="SmartHire API",
    description="Authentication & User Management for SmartHire AI Platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,            # Required for cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ── Routers ──────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(oauth.router)
app.include_router(users.router)


# ── Health check ─────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
async def health():
    return {"success": True, "message": "SmartHire API is running 🚀"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
