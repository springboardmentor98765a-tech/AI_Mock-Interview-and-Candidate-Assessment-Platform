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
    if not consent:
        consent = InterviewConsent(
            interview_id=interview_id,
            candidate_id=candidate_id,
            recruiter_id=interview.recruiter_id,
            consent_given=False,
            consent_timestamp=now,
            revoked_at=now
        )
        db.add(consent)
    else:
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
            "consent_given": bool(consent and consent.consent_given and consent.revoked_at is None),
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
        logger.warning(f"[RECRUITER ACCESS DENIED] No requester_user provided for interview_id={interview_id}")
        return False

    if requester_user.role == "ADMIN":
        logger.info(f"[RECRUITER ACCESS GRANTED] Admin user #{requester_user.id} granted access for interview #{interview_id}")
        return True

    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        logger.warning(f"[RECRUITER ACCESS DENIED] Interview #{interview_id} not found")
        return False

    if requester_user.role == "CANDIDATE":
        access = (interview.candidate_id == requester_user.id)
        logger.info(f"[RECRUITER ACCESS] Candidate #{requester_user.id} access to interview #{interview_id}: {access}")
        return access

    if requester_user.role == "RECRUITER":
        # Recruiter ownership check: interview.recruiter_id MUST equal requester_user.id
        # (If interview.recruiter_id is set, it MUST match requester_user.id)
        if interview.recruiter_id and interview.recruiter_id != requester_user.id:
            logger.warning(f"[RECRUITER ACCESS DENIED] Recruiter #{requester_user.id} not owner of interview #{interview_id} (owner={interview.recruiter_id})")
            return False

        # Candidate must be associated with the interview
        if not interview.candidate_id:
            logger.warning(f"[RECRUITER ACCESS DENIED] Interview #{interview_id} has no candidate associated.")
            return False

        # Matching InterviewConsent must exist for interview_id and candidate_id
        consent = db.query(InterviewConsent).filter(
            InterviewConsent.interview_id == interview_id,
            InterviewConsent.candidate_id == interview.candidate_id
        ).order_by(InterviewConsent.consent_timestamp.desc()).first()

        consent_found = bool(consent)
        consent_given = bool(consent and consent.consent_given)
        revoked = bool(consent and consent.revoked_at is not None)
        access_granted = consent_given and not revoked

        logger.info(
            f"[RECRUITER ACCESS] recruiter_id={requester_user.id}, candidate_id={interview.candidate_id}, "
            f"interview_id={interview_id}, consent_found={consent_found}, consent_given={consent_given}, "
            f"revoked_at={consent.revoked_at if consent else None}, access_granted={access_granted}"
        )
        return access_granted

    logger.warning(f"[RECRUITER ACCESS DENIED] Unknown user role '{requester_user.role}' for user #{requester_user.id}")
    return False
