from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.setting import PlatformSettings, get_settings
from app.models.user import Role, User
from app.services.metrics import metrics

router = APIRouter(tags=["admin"])


class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    max_questions: int
    session_minutes: int
    open_signup: bool
    maintenance: bool
    updated_at: datetime


class SettingsUpdate(BaseModel):
    """Send only what changes."""

    max_questions: Optional[int] = Field(default=None, ge=1, le=25)
    session_minutes: Optional[int] = Field(default=None, ge=1, le=180)
    open_signup: Optional[bool] = None
    maintenance: Optional[bool] = None


@router.get(
    "/settings",
    response_model=SettingsOut,
    dependencies=[Depends(require_roles(Role.ADMIN))],
)
def read_settings(db: Session = Depends(get_db)):
    """Current platform settings. Created with defaults on first read."""
    return get_settings(db)


@router.put(
    "/settings",
    response_model=SettingsOut,
    dependencies=[Depends(require_roles(Role.ADMIN))],
)
def update_settings(
    payload: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Persist settings. Each of these has a real effect:

      max_questions    caps question_count on POST /interviews/generate
      session_minutes  the interview timer the client counts down
      open_signup      when false, public registration is refused
      maintenance      when true, non-admin API calls are refused

    Administrators are always exempt from `maintenance`, so it is not possible
    to lock yourself out by setting it.
    """
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update."
        )

    row = get_settings(db)
    for field, value in fields.items():
        setattr(row, field, value)
    row.updated_by_id = current_user.id
    db.commit()
    db.refresh(row)
    return row


class SettingsPublic(BaseModel):
    """The subset any client may read, so the UI can react before login."""

    open_signup: bool
    maintenance: bool


@router.get("/settings/public", response_model=SettingsPublic)
def public_settings(db: Session = Depends(get_db)):
    row = get_settings(db)
    return SettingsPublic(open_signup=row.open_signup, maintenance=row.maintenance)


@router.get("/metrics", dependencies=[Depends(require_roles(Role.ADMIN))])
def api_metrics():
    """
    Real request telemetry, measured by the timing middleware.

    Counters are in-process and reset when the server restarts, which is why
    `window_start` is returned — present these as "since <window_start>", not
    as all-time totals. Endpoints are the actual route templates this app
    serves; nothing is invented.
    """
    return metrics.snapshot()
