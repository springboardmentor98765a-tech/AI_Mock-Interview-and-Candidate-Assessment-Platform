from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRES_IN_MINUTES, ADMIN_EMAILS

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRES_IN_MINUTES)
    payload["iat"] = datetime.now(timezone.utc)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token: Optional[str] = None
) -> dict:
    raw_token = None
    if credentials:
        raw_token = credentials.credentials
    elif token:
        raw_token = token

    if not raw_token:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    token_user = decode_token(raw_token)

    # Roles in a JWT can become stale after an admin changes a user. Always load
    # the current role from the database and enforce the server-only allowlist.
    from core.database import get_db
    conn = get_db()
    row = conn.execute("SELECT id, name, email, role, is_super_admin FROM users WHERE id = ?", (token_user["id"],)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="User account no longer exists.")

    role = row["role"]
    if role == "admin" and row["email"].strip().lower() not in ADMIN_EMAILS:
        role = "candidate"

    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": role,
        "is_super_admin": bool(row["is_super_admin"]),
    }


def require_role(*roles: str):
    def checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Access denied.")
        return user
    return checker


def require_super_admin(user: dict = Depends(get_current_user)) -> dict:
    from core.database import get_db

    conn = get_db()
    row = conn.execute("SELECT is_super_admin FROM users WHERE id = ?", (user["id"],)).fetchone()
    conn.close()
    if not row or not row["is_super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super-admin access required.")
    return user
