# ============================================================
#  routers/auth.py — /api/auth endpoints
# ============================================================
from datetime import datetime, timezone

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.database import get_db
from app.dependencies import CurrentUser
from app.schemas import AuthResponse, LoginRequest, MessageResponse, RegisterRequest, UserResponse
from app.security import create_access_token, hash_password, verify_password
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

COOKIE_MAX_AGE = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds


def _set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="smarthire_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=COOKIE_MAX_AGE,
        path="/",
    )


def _row_to_user(row: dict | asyncpg.Record) -> UserResponse:
    return UserResponse(**dict(row))


# ──────────────────────────────────────────────
#  POST /api/auth/register
# ──────────────────────────────────────────────
@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, response: Response, db: asyncpg.Connection = Depends(get_db)):
    # Check duplicate email
    existing = await db.fetchrow("SELECT id FROM users WHERE email = $1", body.email.lower())
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    pw_hash = hash_password(body.password)

    user = await db.fetchrow(
        """
        INSERT INTO users (name, email, password_hash, role, auth_provider)
        VALUES ($1, $2, $3, $4::user_role, 'local')
        RETURNING id, name, email, role, auth_provider, avatar_url, is_active, last_login_at, created_at
        """,
        body.name.strip(), body.email.lower(), pw_hash, body.role.value,
    )

    token = create_access_token({"id": str(user["id"]), "email": user["email"], "role": user["role"], "name": user["name"]})
    _set_auth_cookie(response, token)

    return AuthResponse(success=True, message="Account created successfully.", user=_row_to_user(user))


# ──────────────────────────────────────────────
#  POST /api/auth/login
# ──────────────────────────────────────────────
@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, response: Response, db: asyncpg.Connection = Depends(get_db)):
    user = await db.fetchrow(
        "SELECT id, name, email, password_hash, role, auth_provider, avatar_url, is_active, last_login_at, created_at "
        "FROM users WHERE email = $1",
        body.email.lower(),
    )

    # Generic error — don't reveal if email exists
    if not user or not user["password_hash"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    if not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated. Contact an administrator.")

    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    # Update last_login_at
    await db.execute("UPDATE users SET last_login_at = $1 WHERE id = $2", datetime.now(timezone.utc), user["id"])

    token = create_access_token({"id": str(user["id"]), "email": user["email"], "role": user["role"], "name": user["name"]})
    _set_auth_cookie(response, token)

    return AuthResponse(success=True, message="Login successful.", user=_row_to_user(user))


# ──────────────────────────────────────────────
#  POST /api/auth/logout
# ──────────────────────────────────────────────
@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response):
    response.delete_cookie(
        key="smarthire_token",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )
    return MessageResponse(success=True, message="Logged out successfully.")


# ──────────────────────────────────────────────
#  GET /api/auth/me
# ──────────────────────────────────────────────
@router.get("/me", response_model=AuthResponse)
async def get_me(current_user: CurrentUser):
    return AuthResponse(success=True, message="OK", user=UserResponse(**current_user))
