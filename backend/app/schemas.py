# ============================================================
#  schemas.py — Pydantic request / response models
# ============================================================
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


class UserRole(str, Enum):
    candidate = "candidate"
    recruiter  = "recruiter"
    admin      = "admin"


class AuthProvider(str, Enum):
    local  = "local"
    google = "google"
    github = "github"


# ── Request schemas ──────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.candidate

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        import re
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain an uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain a lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain a number")
        if not re.search(r"[@$!%*?&]", v):
            raise ValueError("Password must contain a special character (@$!%*?&)")
        return v

    @field_validator("role")
    @classmethod
    def no_admin_self_register(cls, v: UserRole) -> UserRole:
        # Prevent self-registration as admin
        if v == UserRole.admin:
            return UserRole.candidate
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UpdateUserRequest(BaseModel):
    name:     Optional[str]      = None
    email:    Optional[EmailStr] = None
    password: Optional[str]      = None
    role:     Optional[UserRole] = None  # Only admin can change


# ── Response schemas ─────────────────────────────────────────

class UserResponse(BaseModel):
    id:            UUID
    name:          str
    email:         str
    role:          UserRole
    auth_provider: AuthProvider
    avatar_url:    Optional[str] = None
    is_active:     bool
    last_login_at: Optional[datetime] = None
    created_at:    datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    success: bool
    message: str
    user:    UserResponse


class MessageResponse(BaseModel):
    success: bool
    message: str
