"""
JWT auth, compatible with the Node service's authMiddleware.js.

The Node backend signs tokens with jsonwebtoken (HS256 by default)
containing {id, email, role, fullName}. We decode with the same
secret/algorithm so a candidate who logs in via the existing
/api/auth/login endpoint can call this Python service with the exact
same Bearer token — no separate login required.
"""
from dataclasses import dataclass

import jwt
from fastapi import Depends, Header, HTTPException, status

from app.config import JWT_ALGORITHM, JWT_SECRET


@dataclass
class CurrentUser:
    id: int
    email: str
    role: str
    full_name: str


def get_current_user(authorization: str = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return CurrentUser(
        id=payload.get("id"),
        email=payload.get("email"),
        role=payload.get("role"),
        full_name=payload.get("fullName") or payload.get("full_name") or "",
    )


def require_roles(*allowed_roles: str):
    """Usage: Depends(require_roles("coach", "recruiter", "admin"))"""

    def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )
        return user

    return dependency
