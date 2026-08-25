from datetime import datetime, timedelta, timezone
import hashlib
import secrets

from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import (
    RegisterRequest, LoginRequest, GoogleLoginRequest,
    UpdateProfileRequest, ChangePasswordRequest,
    PasswordResetRequest, PasswordResetConfirmRequest,
    AuthResponse, UserResponse,
)
from auth import hash_password, verify_password, create_token, get_current_user
from config import APP_BASE_URL, PASSWORD_RESET_TOKEN_EXPIRES_MINUTES, ADMIN_EMAILS
from services.email_service import send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


def row_to_user(row) -> dict:
    # A database role alone never grants admin access. This keeps every response
    # (login, Google sign-in, /me, and the UI) aligned with the access policy.
    role = row["role"]
    if role == "admin" and row["email"].strip().lower() not in ADMIN_EMAILS:
        role = "candidate"
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": role,
        "provider": row["provider"],
        "google_id": row["google_id"],
        "avatar": row["avatar"],
        "created_at": str(row["created_at"]) if row["created_at"] else None,
        "updated_at": str(row["updated_at"]) if row["updated_at"] else None,
    }


@router.post("/register")
def register(req: RegisterRequest):
    if req.role not in ("candidate", "recruiter"):
        raise HTTPException(400, "Public registration is available only for candidate or recruiter accounts.")

    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (req.email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(409, "An account with this email already exists.")

    hashed = hash_password(req.password)
    cur = conn.execute(
        "INSERT INTO users (name, email, password, role, provider) VALUES (?, ?, ?, ?, 'LOCAL')",
        (req.name, req.email, hashed, req.role or "candidate"),
    )
    conn.commit()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()

    token = create_token({"id": user["id"], "email": user["email"], "role": user["role"], "name": user["name"]})
    return {"message": "Registration successful.", "token": token, "user": row_to_user(user)}


@router.post("/login")
def login(req: LoginRequest):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (req.email,)).fetchone()
    conn.close()

    if not user:
        raise HTTPException(401, "Invalid email or password.")

    if user["provider"] == "GOOGLE" and not user["password"]:
        raise HTTPException(401, "This account uses Google Sign-In.")

    if not user["password"] or not verify_password(req.password, user["password"]):
        raise HTTPException(401, "Invalid email or password.")

    token = create_token({"id": user["id"], "email": user["email"], "role": user["role"], "name": user["name"]})
    return {"message": "Login successful.", "token": token, "user": row_to_user(user)}


@router.post("/google")
def google_login(req: GoogleLoginRequest):
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as grequests
        from config import GOOGLE_CLIENT_ID

        if not GOOGLE_CLIENT_ID:
            raise HTTPException(503, "Google OAuth is not configured.")

        idinfo = id_token.verify_oauth2_token(req.credential, grequests.Request(), GOOGLE_CLIENT_ID, clock_skew_in_seconds=60)
        google_id = idinfo["sub"]
        email = idinfo["email"]
        name = idinfo.get("name", email.split("@")[0])
        avatar = idinfo.get("picture")

        conn = get_db()
        user = conn.execute("SELECT * FROM users WHERE google_id = ?", (google_id,)).fetchone()

        if not user:
            user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            if user:
                conn.execute("UPDATE users SET google_id=?, avatar=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                             (google_id, avatar, user["id"]))
                user = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
            else:
                cur = conn.execute(
                    "INSERT INTO users (name, email, role, provider, google_id, avatar) VALUES (?, ?, 'candidate', 'GOOGLE', ?, ?)",
                    (name, email, google_id, avatar),
                )
                user = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
            conn.commit()

        conn.close()
        response_user = row_to_user(user)
        token = create_token({"id": user["id"], "email": user["email"], "role": response_user["role"], "name": user["name"]})
        return {"message": "Google login successful.", "token": token, "user": response_user}

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(401, f"Google token validation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Google authentication failed: {str(e)}")


@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "User not found.")
    return {"user": row_to_user(row)}


@router.put("/profile")
def update_profile(req: UpdateProfileRequest, user: dict = Depends(get_current_user)):
    conn = get_db()

    if req.email:
        existing = conn.execute("SELECT id FROM users WHERE email = ? AND id != ?", (req.email, user["id"])).fetchone()
        if existing:
            conn.close()
            raise HTTPException(409, "This email is already in use.")

    updates = []
    values = []
    if req.name:
        updates.append("name = ?")
        values.append(req.name)
    if req.email:
        updates.append("email = ?")
        values.append(req.email)
    if req.avatar is not None:
        updates.append("avatar = ?")
        values.append(req.avatar)

    if updates:
        updates.append("updated_at = CURRENT_TIMESTAMP")
        values.append(user["id"])
        conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()

    row = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    conn.close()
    return {"message": "Profile updated.", "user": row_to_user(row)}


@router.put("/password")
def change_password(req: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()

    if row["provider"] == "GOOGLE" and not row["password"]:
        hashed = hash_password(req.new_password)
        conn.execute("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (hashed, user["id"]))
        conn.commit()
        conn.close()
        return {"message": "Password set successfully."}

    if not row["password"] or not verify_password(req.current_password, row["password"]):
        conn.close()
        raise HTTPException(401, "Current password is incorrect.")

    hashed = hash_password(req.new_password)
    conn.execute("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (hashed, user["id"]))
    conn.commit()
    conn.close()
    return {"message": "Password updated successfully."}


@router.post("/forgot-password")
def forgot_password(req: PasswordResetRequest):
    # Always return the same response so email addresses cannot be enumerated.
    response = {"message": "If an account exists for that email, we sent a password reset link."}
    conn = get_db()
    user = conn.execute("SELECT id, email FROM users WHERE email = ?", (req.email,)).fetchone()
    if not user:
        conn.close()
        return response

    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRES_MINUTES)).isoformat()
    conn.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", (user["id"],))
    conn.execute(
        "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        (user["id"], token_hash, expires_at),
    )
    conn.commit()
    conn.close()

    reset_url = f"{APP_BASE_URL}/?reset_token={token}"
    try:
        send_password_reset_email(user["email"], reset_url, PASSWORD_RESET_TOKEN_EXPIRES_MINUTES)
    except RuntimeError as error:
        # Do not leave a usable reset token behind if the email was not delivered.
        conn = get_db()
        conn.execute("DELETE FROM password_reset_tokens WHERE token_hash = ?", (token_hash,))
        conn.commit()
        conn.close()
        raise HTTPException(503, str(error))
    return response


@router.post("/reset-password")
def reset_password(req: PasswordResetConfirmRequest):
    token_hash = hashlib.sha256(req.token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    reset = conn.execute(
        "SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND expires_at > ?",
        (token_hash, now),
    ).fetchone()
    if not reset:
        conn.close()
        raise HTTPException(400, "This password reset link is invalid or has expired.")

    hashed = hash_password(req.new_password)
    conn.execute("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (hashed, reset["user_id"]))
    conn.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", (reset["user_id"],))
    conn.commit()
    conn.close()
    return {"message": "Password reset successfully. You can now sign in."}
