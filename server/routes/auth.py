from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import (
    RegisterRequest, LoginRequest, GoogleLoginRequest,
    UpdateProfileRequest, ChangePasswordRequest,
    AuthResponse, UserResponse,
)
from auth import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


def row_to_user(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "provider": row["provider"],
        "google_id": row["google_id"],
        "avatar": row["avatar"],
        "created_at": str(row["created_at"]) if row["created_at"] else None,
        "updated_at": str(row["updated_at"]) if row["updated_at"] else None,
    }


@router.post("/register")
def register(req: RegisterRequest):
    if req.role not in ("candidate", "recruiter", "admin"):
        raise HTTPException(400, "Role must be candidate, recruiter, or admin.")

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

        idinfo = id_token.verify_oauth2_token(req.credential, grequests.Request(), GOOGLE_CLIENT_ID, clock_skew_in_seconds=10)
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
            else:
                cur = conn.execute(
                    "INSERT INTO users (name, email, role, provider, google_id, avatar) VALUES (?, ?, 'candidate', 'GOOGLE', ?, ?)",
                    (name, email, google_id, avatar),
                )
                user = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
            conn.commit()

        conn.close()
        token = create_token({"id": user["id"], "email": user["email"], "role": user["role"], "name": user["name"]})
        return {"message": "Google login successful.", "token": token, "user": row_to_user(user)}

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
