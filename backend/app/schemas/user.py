import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import Provider, Role

PASSWORD_RULES = (
    "Password must be at least 8 characters and include an uppercase letter, "
    "a lowercase letter, a digit and a special character."
)


def validate_password_strength(value: str) -> str:
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password must be 72 bytes or fewer.")
    if (
        len(value) < 8
        or not re.search(r"[A-Z]", value)
        or not re.search(r"[a-z]", value)
        or not re.search(r"\d", value)
        or not re.search(r"[^A-Za-z0-9]", value)
    ):
        raise ValueError(PASSWORD_RULES)
    return value


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str
    # Self-registration is limited to CANDIDATE and RECRUITER; see api/auth.py.
    role: Role = Role.CANDIDATE

    @field_validator("password")
    @classmethod
    def _password(cls, value: str) -> str:
        return validate_password_strength(value)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: Role
    provider: Provider
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    """Profile fields a user may change. Role is deliberately absent."""

    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    password: Optional[str] = None

    @field_validator("password")
    @classmethod
    def _password(cls, value: Optional[str]) -> Optional[str]:
        return None if value is None else validate_password_strength(value)


class RoleUpdate(BaseModel):
    """Admin-only. The one place a role can change."""

    role: Role


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class MessageResponse(BaseModel):
    message: str
    user: UserOut
