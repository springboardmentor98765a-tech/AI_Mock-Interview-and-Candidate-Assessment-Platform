import datetime
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models.consent import InterviewConsent
from models.interview import Interview, InterviewSession
from models.user import User

logger = logging.getLogger("consent_service")

def record_candidate_consent(db: Session, candidate_id: int, interview_id: int, consent_given: bool) -> InterviewConsent:
    """Record or update candidate score-sharing consent for a specific interview."""
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Interview #{interview_id} not found.")

    if interview.candidate_id != candidate_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only manage score-sharing consent for your own interviews.")

    consent = db.query(InterviewConsent).filter(
        InterviewConsent.interview_id == interview_id,
        InterviewConsent.candidate_id == candidate_id
    ).first()

    now = datetime.datetime.utcnow()
    recruiter_id = interview.recruiter_id

    if not consent:
        consent = InterviewConsent(
            interview_id=interview_id,
            candidate_id=candidate_id,
            recruiter_id=recruiter_id,
            consent_given=consent_given,
            consent_timestamp=now,
            revoked_at=None if consent_given else now
        )
        db.add(consent)
    else:
        consent.recruiter_id = recruiter_id or consent.recruiter_id
        consent.consent_given = consent_given
        consent.consent_timestamp = now
        consent.revoked_at = None if consent_given else now
        consent.updated_at = now

    db.commit()
    db.refresh(consent)
    logger.info(f"[CONSENT UPDATED] interview_id={interview_id}, candidate_id={candidate_id}, consent_given={consent_given}")
    return consent


def revoke_candidate_consent(db: Session, candidate_id: int, interview_id: int) -> InterviewConsent:
    """Revoke candidate score-sharing consent for an interview."""
    consent = db.query(InterviewConsent).filter(
        InterviewConsent.interview_id == interview_id,
        InterviewConsent.candidate_id == candidate_id
    ).first()

    if not consent:
        # Create explicit revoked consent record
        return record_candidate_consent(db, candidate_id, interview_id, False)

    now = datetime.datetime.utcnow()
    consent.consent_given = False
    consent.revoked_at = now
    consent.updated_at = now

    db.commit()
    db.refresh(consent)
    logger.info(f"[CONSENT REVOKED] interview_id={interview_id}, candidate_id={candidate_id}")
    return consent


def get_candidate_consent_status_list(db: Session, candidate_id: int) -> List[Dict[str, Any]]:
    """Get consent privacy status list for all completed/assigned candidate interviews."""
    interviews = db.query(Interview).filter(
        Interview.candidate_id == candidate_id,
        Interview.is_deleted == False
    ).order_by(Interview.created_at.desc()).all()

    result = []
    for interview in interviews:
        consent = db.query(InterviewConsent).filter(
            InterviewConsent.interview_id == interview.id,
            InterviewConsent.candidate_id == candidate_id
        ).first()

        recruiter_name = interview.recruiter.name if (interview.recruiter and interview.recruiter.name) else "Recruiter"

        result.append({
            "interview_id": interview.id,
            "interview_title": interview.domain,
            "interview_type": interview.interview_type,
            "status": interview.status,
            "recruiter_id": interview.recruiter_id,
            "recruiter_name": recruiter_name,
            "consent_given": consent.consent_given if consent else False,
            "consent_status": "Shared" if (consent and consent.consent_given and not consent.revoked_at) else "Private",
            "consent_timestamp": consent.consent_timestamp.strftime("%Y-%m-%d %H:%M:%S") if (consent and consent.consent_timestamp) else None,
            "revoked_at": consent.revoked_at.strftime("%Y-%m-%d %H:%M:%S") if (consent and consent.revoked_at) else None,
            "created_at": interview.created_at.strftime("%Y-%m-%d %H:%M:%S") if interview.created_at else None
        })

    return result


def check_recruiter_score_access(db: Session, requester_user: User, interview_id: int) -> bool:
    """
    Validates if requester_user is authorized to view protected candidate scores/reports.
    Returns True if permitted, False otherwise.
    """
    if not requester_user:
        return False

    if requester_user.role == "ADMIN":
        return True

    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        return False

    if requester_user.role == "CANDIDATE":
        return interview.candidate_id == requester_user.id

    if requester_user.role == "RECRUITER":
        # Check authorization relationship (assigned by or assigned to recruiter)
        if interview.recruiter_id and interview.recruiter_id != requester_user.id:
            logger.warning(f"[ACCESS DENIED] Recruiter #{requester_user.id} not associated with interview #{interview_id}")
            return False

        # Check candidate score-sharing consent
        consent = db.query(InterviewConsent).filter(
            InterviewConsent.interview_id == interview_id,
            InterviewConsent.candidate_id == interview.candidate_id
        ).first()

        if not consent or not consent.consent_given or consent.revoked_at is not None:
            logger.info(f"[SCORE ACCESS DENIED] Candidate #{interview.candidate_id} has not granted score access for interview #{interview_id}")
            return False

        return True

    return False
