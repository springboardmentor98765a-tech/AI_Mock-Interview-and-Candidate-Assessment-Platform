"""Public feedback intake and administrator review endpoints."""

from datetime import datetime, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.orm import Session

from app.auth import require_role
from app.database import get_db
from app.models import FeedbackSubmission


router = APIRouter(prefix="/feedback", tags=["Feedback"])


class FeedbackIn(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    category: Literal["general", "suggestion", "bug", "interview", "dashboard"] = "general"
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    message: str = Field(min_length=10, max_length=2000)

    @field_validator("name", "message")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required")
        return value


@router.post("", status_code=status.HTTP_201_CREATED)
def submit_feedback(payload: FeedbackIn, db: Session = Depends(get_db)):
    email = payload.email.lower()
    recent = (
        db.query(FeedbackSubmission)
        .filter(
            FeedbackSubmission.email == email,
            FeedbackSubmission.created_at >= datetime.utcnow() - timedelta(seconds=60),
        )
        .first()
    )
    if recent:
        raise HTTPException(429, "Please wait one minute before sending another response.")

    entry = FeedbackSubmission(
        name=payload.name,
        email=email,
        category=payload.category,
        rating=payload.rating,
        message=payload.message,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {
        "id": str(entry.id),
        "message": "Thank you. Your feedback was submitted for administrator review.",
    }


@router.get("")
def list_feedback(
    user=Depends(require_role("admin")), db: Session = Depends(get_db)
):
    rows = (
        db.query(FeedbackSubmission)
        .order_by(FeedbackSubmission.created_at.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id": str(row.id),
            "name": row.name,
            "email": row.email,
            "category": row.category,
            "rating": row.rating,
            "message": row.message,
            "status": row.status,
            "created_at": row.created_at.isoformat() + "Z",
        }
        for row in rows
    ]
