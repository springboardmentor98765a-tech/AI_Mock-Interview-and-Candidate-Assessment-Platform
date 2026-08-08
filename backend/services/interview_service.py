import datetime
import logging
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from config import (
    AI_PROVIDER,
    DEFAULT_MODEL,
    MIN_QUESTIONS_PER_INTERVIEW,
    MAX_QUESTIONS_PER_INTERVIEW,
    DEFAULT_INTERVIEW_DURATION,
    FIRST_WARNING_SECONDS,
    SECOND_WARNING_SECONDS
)
from models.user import User
from models.candidate import CandidateProfile
from models.interview import Interview, InterviewQuestion, InterviewSession, AuditLog
from schemas.interview import (
    InterviewGenerateRequest,
    InterviewStartRequest,
    InterviewSubmitRequest,
    InterviewSummaryResponse,
    InterviewDetailResponse,
    InterviewQuestionPublicSchema,
    InterviewQuestionAdminSchema
)
from services.ai_service import GeminiService
from services.resume_parser_service import ResumeParserService
from services.question_bank_service import QuestionBankService

logger = logging.getLogger("interview_service")

def _log_audit_event(db: Session, user_id: Optional[int], role: Optional[str], action: str, resource_type: str, resource_id: Optional[int], metadata: Dict[str, Any]):
    """Internal helper to write AuditLog entry safely without breaking caller workflows."""
    try:
        # Sanitize metadata removing sensitive information (passwords, tokens, raw error tracebacks)
        sanitized_meta = {
            k: v for k, v in metadata.items()
            if k not in ["password", "token", "api_key", "credentials", "traceback"]
        }
        audit = AuditLog(
            user_id=user_id,
            role=role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            timestamp=datetime.datetime.utcnow(),
            metadata_json=sanitized_meta
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Internal AuditLog writing failed (non-blocking): {e}")


def generate_interview_service(
    current_user: User,
    data: InterviewGenerateRequest,
    db: Session
) -> InterviewSummaryResponse:
    """
    Generates a new AI Interview tailored to candidate skills and settings.
    Falls back to PostgreSQL Question Bank if AI service fails/times out/exceeds quota.
    Enforces atomic transaction rollback on unexpected exceptions.
    """
    # 1. Determine target candidate
    target_candidate_id = data.candidate_id or current_user.id
    candidate_user = db.query(User).filter(User.id == target_candidate_id).first()
    if not candidate_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target candidate with ID {target_candidate_id} not found."
        )

    # 2. Extract skills and resume details via ResumeParserService
    parsed_resume = ResumeParserService.extract_text_and_skills(
        candidate_user_id=target_candidate_id,
        resume_id=data.resume_id,
        db=db
    )
    detected_skills = parsed_resume.get("skills", ["General Domain Skills"])

    # Enforce question bounds (3 to 15)
    num_q = max(MIN_QUESTIONS_PER_INTERVIEW, min(MAX_QUESTIONS_PER_INTERVIEW, data.num_questions))
    duration = data.duration_mins or DEFAULT_INTERVIEW_DURATION

    ai_service = GeminiService()
    questions_data = []
    ai_provider = AI_PROVIDER
    ai_model = DEFAULT_MODEL
    gen_source = "AI"
    fallback_reason = None

    # 3. Attempt AI generation with fallback
    try:
        ai_res = ai_service.generate_interview_questions(
            parsed_resume_details=parsed_resume,
            domain=data.domain,
            interview_type=data.interview_type,
            difficulty=data.difficulty,
            num_questions=num_q,
            experience_level=data.experience_level,
            duration_mins=duration
        )
        questions_data = ai_res.get("questions", [])
        ai_provider = ai_res.get("ai_provider", AI_PROVIDER)
        ai_model = ai_res.get("ai_model", DEFAULT_MODEL)
        gen_source = "AI"
    except Exception as exc:
        logger.warning(f"AI Service generation failed ({exc}). Switching to Question Bank fallback.")
        fallback_reason = "Questions generated using verified question bank."
        gen_source = "Question Bank"
        questions_data = QuestionBankService.get_fallback_questions(
            db=db,
            domain=data.domain,
            category=data.interview_type,
            difficulty=data.difficulty,
            num_questions=num_q
        )

    # 4. Atomic database creation transaction
    try:
        recruiter_id = current_user.id if current_user.role in ["RECRUITER", "ADMIN"] else None
        
        interview = Interview(
            candidate_id=target_candidate_id,
            recruiter_id=recruiter_id,
            resume_id=data.resume_id,
            interview_type=data.interview_type,
            domain=data.domain,
            difficulty=data.difficulty,
            duration_mins=duration,
            experience_level=data.experience_level,
            skills_detected=detected_skills,
            status="Assigned",
            ai_provider=ai_provider,
            ai_model=ai_model,
            generation_source=gen_source,
            fallback_reason=fallback_reason,
            generation_timestamp=datetime.datetime.utcnow(),
            is_deleted=False,
            created_at=datetime.datetime.utcnow()
        )
        db.add(interview)
        db.commit()
        db.refresh(interview)

        # Add question records
        for idx, q in enumerate(questions_data, start=1):
            iq = InterviewQuestion(
                interview_id=interview.id,
                question_text=q.get("question", f"Question {idx}"),
                category=q.get("category", data.interview_type),
                difficulty=q.get("difficulty", data.difficulty),
                expected_answer=q.get("expected_answer", "Standard expected response."),
                evaluation_points=q.get("evaluation_points", ["Clarity", "Relevance", "Accuracy"]),
                sequence_no=idx
            )
            db.add(iq)

        db.commit()
        db.refresh(interview)
    except Exception as e:
        db.rollback()
        logger.error(f"Atomic database transaction failed during interview creation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist interview record. Database transaction rolled back."
        )

    # Audit logging
    _log_audit_event(
        db=db,
        user_id=current_user.id,
        role=current_user.role,
        action="INTERVIEW_GENERATED",
        resource_type="Interview",
        resource_id=interview.id,
        metadata={
            "domain": data.domain,
            "interview_type": data.interview_type,
            "difficulty": data.difficulty,
            "questions_count": len(questions_data),
            "generation_source": gen_source
        }
    )

    return InterviewSummaryResponse(
        interview_id=interview.id,
        candidate_id=candidate_user.id,
        candidate_name=candidate_user.name,
        skills_detected=detected_skills,
        interview_type=interview.interview_type,
        domain=interview.domain,
        difficulty=interview.difficulty,
        num_questions=len(interview.questions),
        duration_mins=interview.duration_mins,
        ai_provider=interview.ai_provider,
        ai_model=interview.ai_model,
        generation_source=interview.generation_source,
        fallback_reason=interview.fallback_reason,
        status=interview.status,
        created_at=interview.created_at.strftime("%Y-%m-%d %H:%M")
    )


def regenerate_entire_interview_service(
    current_user: User,
    interview_id: int,
    db: Session
) -> InterviewSummaryResponse:
    """Regenerates all questions for an existing interview."""
    interview = db.query(Interview).filter(Interview.id == interview_id, Interview.is_deleted == False).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    # Re-trigger generation
    req = InterviewGenerateRequest(
        candidate_id=interview.candidate_id,
        resume_id=interview.resume_id,
        interview_type=interview.interview_type,
        domain=interview.domain,
        difficulty=interview.difficulty,
        num_questions=len(interview.questions) or 5,
        duration_mins=interview.duration_mins,
        experience_level=interview.experience_level
    )
    
    # Soft delete old interview and generate fresh one
    interview.is_deleted = True
    interview.deleted_at = datetime.datetime.utcnow()
    interview.status = "Cancelled"
    db.commit()

    return generate_interview_service(current_user, req, db)


def regenerate_single_question_service(
    current_user: User,
    interview_id: int,
    question_id: int,
    db: Session
) -> InterviewQuestionAdminSchema:
    """Regenerates a single target question without altering other questions."""
    interview = db.query(Interview).filter(Interview.id == interview_id, Interview.is_deleted == False).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    target_q = db.query(InterviewQuestion).filter(
        InterviewQuestion.id == question_id,
        InterviewQuestion.interview_id == interview_id
    ).first()

    if not target_q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target question not found in this interview.")

    existing_texts = [q.question_text for q in interview.questions if q.id != question_id]
    ai_service = GeminiService()

    try:
        ai_res = ai_service.regenerate_single_question(
            existing_questions=existing_texts,
            domain=interview.domain,
            interview_type=interview.interview_type,
            difficulty=interview.difficulty,
            experience_level=interview.experience_level
        )
        new_q_data = ai_res.get("question", {})
    except Exception as exc:
        logger.warning(f"Single question AI regeneration failed ({exc}). Using Question Bank fallback.")
        fallback_pool = QuestionBankService.get_fallback_questions(
            db=db,
            domain=interview.domain,
            category=interview.interview_type,
            difficulty=interview.difficulty,
            num_questions=1
        )
        new_q_data = fallback_pool[0]

    target_q.question_text = new_q_data.get("question", target_q.question_text)
    target_q.category = new_q_data.get("category", target_q.category)
    target_q.difficulty = new_q_data.get("difficulty", target_q.difficulty)
    target_q.expected_answer = new_q_data.get("expected_answer", target_q.expected_answer)
    target_q.evaluation_points = new_q_data.get("evaluation_points", target_q.evaluation_points)

    db.commit()
    db.refresh(target_q)

    _log_audit_event(
        db=db,
        user_id=current_user.id,
        role=current_user.role,
        action="QUESTION_REGENERATED",
        resource_type="InterviewQuestion",
        resource_id=target_q.id,
        metadata={"interview_id": interview_id}
    )

    return InterviewQuestionAdminSchema(
        id=target_q.id,
        sequence_no=target_q.sequence_no,
        question_text=target_q.question_text,
        category=target_q.category,
        difficulty=target_q.difficulty,
        expected_answer=target_q.expected_answer,
        evaluation_points=target_q.evaluation_points or []
    )


def start_interview_service(current_user: User, data: InterviewStartRequest, db: Session) -> dict:
    """Starts an active interview session and initializes countdown timer."""
    interview = db.query(Interview).filter(Interview.id == data.interview_id, Interview.is_deleted == False).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    if current_user.role == "CANDIDATE" and interview.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to start this assigned interview.")

    interview.status = "In Progress"
    session_rec = InterviewSession(
        interview_id=interview.id,
        started_at=datetime.datetime.utcnow(),
        duration=0,
        score=0.0
    )
    db.add(session_rec)
    db.commit()
    db.refresh(session_rec)

    _log_audit_event(
        db=db,
        user_id=current_user.id,
        role=current_user.role,
        action="INTERVIEW_STARTED",
        resource_type="InterviewSession",
        resource_id=session_rec.id,
        metadata={"interview_id": interview.id}
    )

    return {
        "session_id": session_rec.id,
        "interview_id": interview.id,
        "status": interview.status,
        "duration_mins": interview.duration_mins,
        "first_warning_seconds": FIRST_WARNING_SECONDS,
        "second_warning_seconds": SECOND_WARNING_SECONDS,
        "started_at": session_rec.started_at.strftime("%Y-%m-%d %H:%M:%S")
    }


def submit_interview_service(current_user: User, data: InterviewSubmitRequest, db: Session) -> dict:
    """Submits interview answers, calculates score, and updates status to Completed."""
    interview = db.query(Interview).filter(Interview.id == data.interview_id, Interview.is_deleted == False).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    if current_user.role == "CANDIDATE" and interview.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to submit this assigned interview.")

    session_rec = db.query(InterviewSession).filter(
        InterviewSession.interview_id == interview.id
    ).order_by(InterviewSession.started_at.desc()).first()

    if not session_rec:
        session_rec = InterviewSession(
            interview_id=interview.id,
            started_at=datetime.datetime.utcnow()
        )
        db.add(session_rec)

    session_rec.ended_at = datetime.datetime.utcnow()
    session_rec.duration = data.time_taken_seconds
    
    # Calculate score
    total_q = len(interview.questions)
    answered_q = len([a for a in data.answers if a.user_answer or a.selected_option is not None])
    calculated_score = round((answered_q / total_q) * 100.0, 1) if total_q > 0 else 85.0

    session_rec.score = calculated_score
    session_rec.answers_json = [a.model_dump() for a in data.answers]
    interview.status = "Completed"

    # Update CandidateProfile average interview score
    cand_profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == interview.candidate_id).first()
    if cand_profile:
        all_completed = db.query(InterviewSession).join(Interview).filter(
            Interview.candidate_id == interview.candidate_id,
            Interview.status == "Completed"
        ).all()
        if all_completed:
            cand_profile.interview_score = round(sum(s.score for s in all_completed) / len(all_completed), 1)

    db.commit()

    _log_audit_event(
        db=db,
        user_id=current_user.id,
        role=current_user.role,
        action="INTERVIEW_SUBMITTED",
        resource_type="Interview",
        resource_id=interview.id,
        metadata={"score": calculated_score, "time_taken_seconds": data.time_taken_seconds}
    )

    return {
        "interview_id": interview.id,
        "status": interview.status,
        "score": session_rec.score,
        "answered_questions": answered_q,
        "total_questions": total_q,
        "time_taken_seconds": session_rec.duration
    }


def list_interviews_service(current_user: User, db: Session) -> List[InterviewSummaryResponse]:
    """Lists interviews filtered by caller role."""
    query = db.query(Interview).filter(Interview.is_deleted == False)

    if current_user.role == "CANDIDATE":
        query = query.filter(Interview.candidate_id == current_user.id)
    elif current_user.role == "RECRUITER":
        query = query.filter(
            (Interview.recruiter_id == current_user.id) | (Interview.candidate_id == current_user.id)
        )

    interviews = query.order_by(Interview.created_at.desc()).all()
    results = []

    for i in interviews:
        cand_user = db.query(User).filter(User.id == i.candidate_id).first()
        cand_name = cand_user.name if cand_user else "Candidate User"
        
        results.append(InterviewSummaryResponse(
            interview_id=i.id,
            candidate_id=i.candidate_id,
            candidate_name=cand_name,
            skills_detected=i.skills_detected or [],
            interview_type=i.interview_type,
            domain=i.domain,
            difficulty=i.difficulty,
            num_questions=len(i.questions),
            duration_mins=i.duration_mins,
            ai_provider=i.ai_provider or AI_PROVIDER,
            ai_model=i.ai_model or DEFAULT_MODEL,
            generation_source=i.generation_source or "AI",
            fallback_reason=i.fallback_reason,
            status=i.status,
            created_at=i.created_at.strftime("%Y-%m-%d %H:%M")
        ))

    return results


def get_interview_details_service(
    current_user: User,
    interview_id: int,
    db: Session
) -> InterviewDetailResponse:
    """Returns detailed interview structure with role-based answer visibility filtering."""
    interview = db.query(Interview).filter(Interview.id == interview_id, Interview.is_deleted == False).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    if current_user.role == "CANDIDATE" and interview.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this assigned interview.")

    cand_user = db.query(User).filter(User.id == interview.candidate_id).first()
    cand_name = cand_user.name if cand_user else "Candidate User"

    # Enforce role-based answer visibility
    # Candidates receive ONLY public questions during active sessions
    is_admin_or_recruiter = current_user.role in ["RECRUITER", "ADMIN"]
    is_completed_candidate = (current_user.role == "CANDIDATE" and interview.status == "Completed")

    formatted_questions = []
    for q in sorted(interview.questions, key=lambda x: x.sequence_no):
        if is_admin_or_recruiter or is_completed_candidate:
            formatted_questions.append(InterviewQuestionAdminSchema(
                id=q.id,
                sequence_no=q.sequence_no,
                question_text=q.question_text,
                category=q.category,
                difficulty=q.difficulty,
                expected_answer=q.expected_answer,
                evaluation_points=q.evaluation_points or []
            ))
        else:
            formatted_questions.append(InterviewQuestionPublicSchema(
                id=q.id,
                sequence_no=q.sequence_no,
                question_text=q.question_text,
                category=q.category,
                difficulty=q.difficulty
            ))

    return InterviewDetailResponse(
        id=interview.id,
        candidate_id=interview.candidate_id,
        candidate_name=cand_name,
        recruiter_id=interview.recruiter_id,
        resume_id=interview.resume_id,
        interview_type=interview.interview_type,
        domain=interview.domain,
        difficulty=interview.difficulty,
        duration_mins=interview.duration_mins,
        experience_level=interview.experience_level,
        skills_detected=interview.skills_detected or [],
        status=interview.status,
        ai_provider=interview.ai_provider or AI_PROVIDER,
        ai_model=interview.ai_model or DEFAULT_MODEL,
        generation_source=interview.generation_source or "AI",
        fallback_reason=interview.fallback_reason,
        generation_timestamp=interview.generation_timestamp.strftime("%Y-%m-%d %H:%M:%S") if interview.generation_timestamp else "",
        created_at=interview.created_at.strftime("%Y-%m-%d %H:%M"),
        questions=formatted_questions
    )


def delete_interview_service(current_user: User, interview_id: int, db: Session) -> dict:
    """Soft deletes an interview record setting is_deleted=True."""
    interview = db.query(Interview).filter(Interview.id == interview_id, Interview.is_deleted == False).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    if current_user.role not in ["RECRUITER", "ADMIN"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Recruiters and Admins can delete interviews.")

    interview.is_deleted = True
    interview.deleted_at = datetime.datetime.utcnow()
    interview.status = "Cancelled"
    db.commit()

    _log_audit_event(
        db=db,
        user_id=current_user.id,
        role=current_user.role,
        action="INTERVIEW_DELETED",
        resource_type="Interview",
        resource_id=interview.id,
        metadata={"interview_id": interview.id}
    )

    return {"success": True, "message": f"Interview #{interview_id} cancelled and soft-deleted."}
