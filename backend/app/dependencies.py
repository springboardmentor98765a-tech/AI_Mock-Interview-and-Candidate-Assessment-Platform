# ============================================================
#  dependencies.py — FastAPI reusable dependencies
# ============================================================
from typing import Annotated

import asyncpg
from fastapi import Cookie, Depends, Header, HTTPException, status
from jose import JWTError

from app.database import get_db
from app.security import decode_access_token


async def get_current_user(
    smarthire_token: Annotated[str | None, Cookie()] = None,
    authorization:   Annotated[str | None, Header()] = None,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Extracts JWT from HTTP-only cookie (preferred) or Authorization header.
    Returns the authenticated user record.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please log in.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    expired_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expired. Please log in again.",
    )

    # Resolve token
    token = smarthire_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]

    if not token:
        raise credentials_exception

    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("id")
        if not user_id:
            raise credentials_exception
    except JWTError as exc:
        if "expired" in str(exc).lower():
            raise expired_exception
        raise credentials_exception

    # Verify user still exists and is active
    user = await db.fetchrow(
        "SELECT id, name, email, role, auth_provider, avatar_url, is_active, last_login_at, created_at "
        "FROM users WHERE id = $1",
        user_id,
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists.")
    if not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account has been deactivated.")

    return dict(user)


def require_role(*roles: str):
    """Factory: returns a dependency that enforces one of the given roles."""

    async def _checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(roles)}. Your role: {current_user['role']}.",
            )
        return current_user

    return _checker


# Convenience aliases
CurrentUser        = Annotated[dict, Depends(get_current_user)]
AdminOnly          = Annotated[dict, Depends(require_role("admin"))]
RecruiterOrAdmin   = Annotated[dict, Depends(require_role("recruiter", "admin"))]
