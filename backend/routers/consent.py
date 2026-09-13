from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from security.dependencies import get_current_user, require_role
from services.consent_service import (
    record_candidate_consent,
    revoke_candidate_consent,
    get_candidate_consent_status_list
)
from services.email_service import send_score_sharing_confirmation_email

router = APIRouter(prefix="/api/candidate/consent", tags=["Candidate Privacy & Consent"])

class ConsentRequestSchema(BaseModel):
    interview_id: int = Field(..., description="Target Interview ID")
    consent_given: bool = Field(..., description="True if candidate grants consent to share scores, False to keep private")


@router.post("")
@router.post("/")
def submit_candidate_consent(
    payload: ConsentRequestSchema,
    current_user: User = Depends(require_role(["CANDIDATE"])),
    db: Session = Depends(get_db)
):
    """Submit explicit candidate score-sharing consent (YES / NO)."""
    consent = record_candidate_consent(db, current_user.id, payload.interview_id, payload.consent_given)

    # Optional email confirmation
    try:
        from models.interview import Interview
        interview = db.query(Interview).filter(Interview.id == payload.interview_id).first()
        domain = interview.domain if interview else "Mock Interview"
        send_score_sharing_confirmation_email(current_user.email, current_user.name, domain, payload.consent_given)
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Score sharing preference saved as {'Shared' if payload.consent_given else 'Private'}.",
        "data": {
            "interview_id": consent.interview_id,
            "candidate_id": consent.candidate_id,
            "consent_given": consent.consent_given,
            "consent_timestamp": consent.consent_timestamp.strftime("%Y-%m-%d %H:%M:%S") if consent.consent_timestamp else None
        }
    }


@router.get("/status")
def get_candidate_consent_status(
    current_user: User = Depends(require_role(["CANDIDATE"])),
    db: Session = Depends(get_db)
):
    """Get consent privacy status list for all candidate interviews."""
    status_list = get_candidate_consent_status_list(db, current_user.id)
    return {"success": True, "data": status_list}


@router.put("/{interview_id}/revoke")
def revoke_candidate_score_sharing(
    interview_id: int,
    current_user: User = Depends(require_role(["CANDIDATE"])),
    db: Session = Depends(get_db)
):
    """Revoke candidate score-sharing permission for a specific interview."""
    consent = revoke_candidate_consent(db, current_user.id, interview_id)
    return {
        "success": True,
        "message": f"Score sharing permission revoked for Interview #{interview_id}.",
        "data": {
            "interview_id": consent.interview_id,
            "consent_given": False,
            "revoked_at": consent.revoked_at.strftime("%Y-%m-%d %H:%M:%S") if consent.revoked_at else None
        }
    }
