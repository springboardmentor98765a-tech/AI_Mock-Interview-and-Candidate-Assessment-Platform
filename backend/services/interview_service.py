import os
import uuid
import datetime
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from fastapi.responses import FileResponse

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
from models.interview import (
    Interview,
    InterviewQuestion,
    InterviewSession,
    InterviewQuestionAttempt,
    InterviewRecording,
    AuditLog,
    InterviewBehaviorAnalysis
)
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
from services.behavior_service import finalize_behavior_analysis


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
        candidate_id=interview.candidate_id,
        status="IN_PROGRESS",
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


def _evaluate_answer_fallback(q: InterviewQuestion, user_ans: str) -> dict:
    """
    Deterministic semantic concept matching evaluator comparing candidate answer
    against question text, expected answer, and evaluation points.
    """
    ans_clean = user_ans.strip()
    ans_lower = ans_clean.lower()

    if not ans_clean or ans_lower in ["no response provided.", "no response provided", "no answer submitted.", "no answer submitted", "n/a", "none"]:
        return {
            "question_id": q.id,
            "sequence_no": q.sequence_no,
            "question_text": q.question_text,
            "category": q.category,
            "user_answer": "No response provided.",
            "score": 0.0,
            "correctness": "Unanswered",
            "feedback": "No response was provided for this question."
        }
    
    stop_words = {
        "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "to", "in", "for", "of",
        "and", "or", "on", "at", "by", "with", "from", "as", "it", "its",
        "this", "that", "these", "those", "i", "you", "he", "she", "we", "they",
        "my", "your", "his", "her", "our", "their", "what", "which", "who", "whom",
        "am", "so", "if", "not", "no", "can", "will", "just", "should"
    }

    def tokenize(text: str) -> set:
        import re
        words = re.findall(r'\b[a-zA-Z0-9_-]{3,}\b', text.lower())
        return {w for w in words if w not in stop_words}

    ans_tokens = tokenize(ans_clean)
    q_tokens = tokenize(q.question_text or "")
    exp_tokens = tokenize(q.expected_answer or "")
    pts_tokens = set()
    if q.evaluation_points:
        for pt in q.evaluation_points:
            pts_tokens.update(tokenize(str(pt)))

    all_target_tokens = q_tokens | exp_tokens | pts_tokens

    # Safe handling if expected answer and points are unavailable
    if not q.expected_answer and not q.evaluation_points:
        if len(ans_tokens) == 0:
            return {
                "question_id": q.id,
                "sequence_no": q.sequence_no,
                "question_text": q.question_text,
                "category": q.category,
                "user_answer": user_ans,
                "score": 0.0,
                "correctness": "Unanswered",
                "feedback": "No response was provided for this question."
            }
        overlap = len(ans_tokens & q_tokens)
        word_count = len(ans_clean.split())
        score = 70.0 if overlap > 0 else (50.0 if word_count >= 8 else 30.0)
        return {
            "question_id": q.id,
            "sequence_no": q.sequence_no,
            "question_text": q.question_text,
            "category": q.category,
            "user_answer": user_ans,
            "score": score,
            "correctness": "Evaluated without reference answer",
            "feedback": "Evaluated based on domain context (reference answer unavailable)."
        }

    # Check for Irrelevant / Off-topic
    if len(all_target_tokens) > 0:
        overlap_with_target = len(ans_tokens & all_target_tokens)
    else:
        overlap_with_target = 0

    word_count = len(ans_clean.split())

    # Check if answer is completely off-topic
    if overlap_with_target == 0 and word_count >= 3 and len(exp_tokens | pts_tokens) > 0:
        return {
            "question_id": q.id,
            "sequence_no": q.sequence_no,
            "question_text": q.question_text,
            "category": q.category,
            "user_answer": user_ans,
            "score": 10.0,
            "correctness": "Irrelevant",
            "communication_score": 10.0,
            "feedback": "Answer appears off-topic or unrelated to the question."
        }

    # Evaluate concept coverage against expected answer and evaluation points
    key_ref_tokens = exp_tokens | pts_tokens
    if len(key_ref_tokens) > 0:
        ref_overlap = len(ans_tokens & key_ref_tokens)
        coverage = ref_overlap / float(len(key_ref_tokens))
    else:
        coverage = 0.5
        ref_overlap = 0

    negation_words = {"not", "no", "never", "without", "dont", "don't", "neither", "nor", "false", "wrong"}
    has_negation = any(w in ans_lower.split() for w in negation_words)

    # Check coverage ratios & criteria
    if (coverage >= 0.55 or (ref_overlap >= 3 and word_count >= 8)) and not has_negation:
        score = round(85.0 + min(15.0, coverage * 15.0), 1)
        correctness = "Correct"
        feedback = "Demonstrates strong understanding and covers key expected criteria."
    elif coverage >= 0.20 or (ref_overlap >= 1 and word_count >= 5):
        if has_negation and coverage < 0.5:
            score = round(25.0 + min(15.0, coverage * 20.0), 1)
            correctness = "Incorrect"
            feedback = "Response contains negating terms or inaccurate claims regarding the question."
        else:
            score = round(50.0 + min(25.0, coverage * 30.0), 1)
            correctness = "Partially Correct"
            feedback = "Covers some relevant points, but missing complete detail or key criteria."
    else:
        score = round(20.0 + min(20.0, coverage * 30.0), 1)
        correctness = "Incorrect"
        feedback = "Response does not sufficiently address the expected answer requirements."

    return {
        "question_id": q.id,
        "sequence_no": q.sequence_no,
        "question_text": q.question_text,
        "category": q.category,
        "user_answer": user_ans,
        "score": score,
        "correctness": correctness,
        "communication_score": score,
        "feedback": feedback
    }


def evaluate_session_answers(session_rec: InterviewSession, interview: Interview, answers_payload: list, db: Session) -> float:
    """
    Calculates genuine evaluation score strictly comparing actual candidate answers
    against question_text, expected_answer, and evaluation_points.
    Persists evaluation breakdown into session_rec.answers_json.
    """
    questions = interview.questions if (interview and interview.questions) else []
    total_q = len(questions) if len(questions) > 0 else (len(answers_payload) if answers_payload else 1)

    answers_map = {}
    if answers_payload:
        for a in answers_payload:
            if isinstance(a, dict):
                qid = a.get("question_id")
                ans = a.get("user_answer") or a.get("selected_option") or ""
            else:
                qid = getattr(a, "question_id", None)
                ans = getattr(a, "user_answer", "") or getattr(a, "selected_option", "")
            if qid is not None:
                answers_map[qid] = str(ans).strip()

    # Also check stored attempts in DB for any unmapped questions
    db_attempts = db.query(InterviewQuestionAttempt).filter(
        InterviewQuestionAttempt.session_id == session_rec.id
    ).all()
    for att in db_attempts:
        if att.question_id and att.question_id not in answers_map and att.answer:
            answers_map[att.question_id] = str(att.answer).strip()

    if total_q == 0:
        session_rec.answers_json = []
        return 0.0

    evaluations_list = []
    total_score = 0.0

    # Try Gemini Service if API key is present
    gemini_svc = None
    if os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
        try:
            from services.ai_service import GeminiService
            gemini_svc = GeminiService()
        except Exception:
            gemini_svc = None

    if questions:
        for q in questions:
            user_ans = answers_map.get(q.id, "")
            eval_result = None

            # 1. Unanswered / empty check
            if not user_ans or user_ans.lower() in ["no response provided.", "no answer submitted.", "n/a", "none"] or len(user_ans.strip()) == 0:
                eval_result = {
                    "question_id": q.id,
                    "sequence_no": q.sequence_no,
                    "question_text": q.question_text,
                    "category": q.category,
                    "user_answer": "No response provided.",
                    "score": 0.0,
                    "correctness": "Unanswered",
                    "feedback": "No response was provided for this question."
                }
            else:
                # 2. Attempt AI evaluation if available
                if gemini_svc:
                    try:
                        ai_eval = gemini_svc.evaluate_answer_correctness(
                            question_text=q.question_text,
                            expected_answer=q.expected_answer,
                            evaluation_points=q.evaluation_points,
                            user_answer=user_ans
                        )
                        eval_result = {
                            "question_id": q.id,
                            "sequence_no": q.sequence_no,
                            "question_text": q.question_text,
                            "category": q.category,
                            "user_answer": user_ans,
                            "score": ai_eval["score"],
                            "correctness": ai_eval["correctness"],
                            "feedback": ai_eval["feedback"]
                        }
                    except Exception as e:
                        logger.warning(f"AI evaluation failed for question {q.id}, using fallback: {e}")
                        eval_result = None

                # 3. Fallback evaluation if AI unavailable or failed
                if not eval_result:
                    eval_result = _evaluate_answer_fallback(q, user_ans)

            total_score += eval_result["score"]
            evaluations_list.append(eval_result)

        calculated_score = round(total_score / len(questions), 1)
    else:
        # Fallback for dynamic payloads without predefined DB questions
        valid_ans_count = 0
        for qid, ans in answers_map.items():
            has_ans = ans and ans.lower() not in ["no response provided.", "no answer submitted."]
            if has_ans:
                valid_ans_count += 1
            evaluations_list.append({
                "question_id": qid,
                "user_answer": ans or "No response provided.",
                "score": 75.0 if has_ans else 0.0,
                "correctness": "Partially Correct" if has_ans else "Unanswered",
                "feedback": "Response evaluated." if has_ans else "No response provided."
            })
        calculated_score = round((valid_ans_count / total_q) * 100.0, 1)

    session_rec.answers_json = evaluations_list
    return calculated_score


def finalize_session_pipeline(
    db: Session,
    session_rec: InterviewSession,
    interview: Interview,
    answers_payload: Optional[list] = None,
    time_taken_seconds: float = 0.0,
    termination_reason: Optional[str] = None
) -> Dict[str, Any]:
    """
    Unified, idempotent, safe interview completion pipeline (Point 11).
    Executes identical order for normal submit, timer expiry, 5th fullscreen violation, or forced termination:
    1. Stop frame sampling (via session status update)
    2. Preserve answers
    3. Safely stop recordings
    4. Finalize speech analysis
    5. Finalize Module 6 behavior analysis
    6. Commit database data
    7. Mark session completed
    8. Return success payload
    """
    # 1. Update session status to COMPLETED / ENDED
    session_rec.status = "COMPLETED"
    session_rec.ended_at = datetime.datetime.utcnow()
    if time_taken_seconds > 0:
        session_rec.duration = time_taken_seconds

    # 2. Preserve & evaluate answers
    calculated_score = evaluate_session_answers(session_rec, interview, answers_payload, db)
    session_rec.score = calculated_score
    interview.status = "Completed"

    # 3. Candidate profile average update
    cand_profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == interview.candidate_id).first()
    if cand_profile:
        all_completed = db.query(InterviewSession).join(Interview).filter(
            Interview.candidate_id == interview.candidate_id,
            Interview.status == "Completed"
        ).all()
        if all_completed:
            cand_profile.interview_score = round(
                sum(s.score for s in all_completed if s.score is not None) / len(all_completed), 1
            )

    # 4 & 5. Finalize Speech Analysis & Module 6 Behavior Analysis
    try:
        finalize_behavior_analysis(db, session_rec)
    except Exception as e:
        logger.error(f"Behavior analysis finalization error during session completion: {e}")

    # 6. Commit Database Data
    db.commit()

    total_q = len(interview.questions) if (interview and interview.questions) else (len(answers_payload) if answers_payload else 1)
    answered_q = len([a for a in (session_rec.answers_json or []) if a.get("correctness") != "Unanswered"])

    return {
        "interview_id": interview.id,
        "session_id": session_rec.id,
        "status": interview.status,
        "score": session_rec.score,
        "answered_questions": answered_q,
        "total_questions": total_q,
        "time_taken_seconds": session_rec.duration,
        "termination_reason": termination_reason
    }


def submit_interview_service(
    current_user: User,
    data: InterviewSubmitRequest,
    db: Session
) -> Dict[str, Any]:
    """Submits interview answers, calculates score, and updates status to Completed (Idempotent)."""
    interview = db.query(Interview).filter(Interview.id == data.interview_id, Interview.is_deleted == False).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    if current_user.role == "CANDIDATE" and interview.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to submit this assigned interview.")

    session_rec = db.query(InterviewSession).filter(
        InterviewSession.interview_id == interview.id
    ).order_by(InterviewSession.created_at.desc()).first()

    if not session_rec:
        session_rec = InterviewSession(
            interview_id=interview.id,
            candidate_id=interview.candidate_id,
            status="IN_PROGRESS",
            started_at=datetime.datetime.utcnow()
        )
        db.add(session_rec)
        db.commit()

    # Idempotent check
    if session_rec.status in ["COMPLETED", "ENDED"] and session_rec.answers_json and not data.answers:
        total_q = len(interview.questions) if (interview and interview.questions) else 1
        answered_q = len([a for a in session_rec.answers_json if a.get("correctness") != "Unanswered"])
        return {
            "interview_id": interview.id,
            "session_id": session_rec.id,
            "status": "Completed",
            "score": session_rec.score,
            "answered_questions": answered_q,
            "total_questions": total_q,
            "time_taken_seconds": session_rec.duration or data.time_taken_seconds
        }

    res = finalize_session_pipeline(
        db=db,
        session_rec=session_rec,
        interview=interview,
        answers_payload=data.answers,
        time_taken_seconds=data.time_taken_seconds
    )

    _log_audit_event(
        db=db,
        user_id=current_user.id,
        role=current_user.role,
        action="INTERVIEW_SUBMITTED",
        resource_type="Interview",
        resource_id=interview.id,
        metadata={"score": res["score"], "time_taken_seconds": data.time_taken_seconds}
    )

    return res




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


# ==========================================
# STEP 1: INTERVIEW SESSION MANAGEMENT SERVICES
# ==========================================

ALLOWED_RECORDING_MIME_TYPES = [
    "video/webm",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/mp4",
    "video/x-matroska"
]
MAX_RECORDING_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB


def create_interview_session_service(current_user: User, data: Any, db: Session) -> dict:
    """Creates a new interview session in CREATED status or returns existing active session."""
    interview_id = getattr(data, "interview_id", None) or (data.get("interview_id") if isinstance(data, dict) else None)
    if not interview_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="interview_id is required.")

    interview = db.query(Interview).filter(Interview.id == interview_id, Interview.is_deleted == False).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    if current_user.role == "CANDIDATE" and interview.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to create a session for this interview.")

    # Prevent invalid duplicate active sessions for the same interview/candidate
    existing_session = db.query(InterviewSession).filter(
        InterviewSession.interview_id == interview.id,
        InterviewSession.candidate_id == interview.candidate_id,
        InterviewSession.status.in_(["CREATED", "IN_PROGRESS", "PAUSED"])
    ).order_by(InterviewSession.created_at.desc()).first()

    if existing_session:
        return _format_session_response(existing_session, interview, db)

    new_session = InterviewSession(
        interview_id=interview.id,
        candidate_id=interview.candidate_id,
        status="CREATED",
        started_at=None,
        ended_at=None,
        last_resumed_at=None,
        paused_accumulated_seconds=0,
        total_active_seconds=0,
        current_question_index=0,
        created_at=datetime.datetime.utcnow()
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    _log_audit_event(
        db=db,
        user_id=current_user.id,
        role=current_user.role,
        action="SESSION_CREATED",
        resource_type="InterviewSession",
        resource_id=new_session.id,
        metadata={"interview_id": interview.id}
    )

    return _format_session_response(new_session, interview, db)


def start_session_service(current_user: User, session_id: int, db: Session) -> dict:
    """Starts an assigned interview session (CREATED -> IN_PROGRESS)."""
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session_rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    if current_user.role == "CANDIDATE" and session_rec.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to start this interview session.")

    interview = db.query(Interview).filter(Interview.id == session_rec.interview_id).first()

    if session_rec.status in ["COMPLETED", "ENDED"]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This interview session has already been completed.")
    if session_rec.status == "PAUSED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This interview session is paused. Use resume endpoint instead.")
    if session_rec.status == "IN_PROGRESS":
        return _format_session_response(session_rec, interview, db)

    if session_rec.status != "CREATED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Cannot start session with status '{session_rec.status}'.")

    now = datetime.datetime.utcnow()
    session_rec.status = "IN_PROGRESS"
    if not session_rec.started_at:
        session_rec.started_at = now
    session_rec.last_resumed_at = now

    if interview:
        interview.status = "In Progress"

    db.commit()
    db.refresh(session_rec)

    _log_audit_event(
        db=db,
        user_id=current_user.id,
        role=current_user.role,
        action="SESSION_STARTED",
        resource_type="InterviewSession",
        resource_id=session_rec.id,
        metadata={"interview_id": session_rec.interview_id}
    )

    return _format_session_response(session_rec, interview, db)

start_session_service_v2 = start_session_service


def pause_session_service(current_user: User, session_id: int, db: Session) -> dict:
    """Pauses an active interview session (IN_PROGRESS -> PAUSED)."""
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session_rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    if current_user.role == "CANDIDATE" and session_rec.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to pause this interview session.")

    interview = db.query(Interview).filter(Interview.id == session_rec.interview_id).first()

    if session_rec.status == "PAUSED":
        return _format_session_response(session_rec, interview, db)
    if session_rec.status in ["COMPLETED", "ENDED"]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot pause a completed interview session.")
    if session_rec.status == "CREATED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot pause an interview session that has not been started yet.")
    if session_rec.status != "IN_PROGRESS":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Cannot pause session with status '{session_rec.status}'.")

    now = datetime.datetime.utcnow()
    if session_rec.last_resumed_at:
        delta = int((now - session_rec.last_resumed_at).total_seconds())
        session_rec.total_active_seconds = (session_rec.total_active_seconds or 0) + delta

    session_rec.last_resumed_at = None
    session_rec.status = "PAUSED"

    db.commit()
    db.refresh(session_rec)

    _log_audit_event(
        db=db,
        user_id=current_user.id,
        role=current_user.role,
        action="SESSION_PAUSED",
        resource_type="InterviewSession",
        resource_id=session_rec.id,
        metadata={"interview_id": session_rec.interview_id}
    )

    return _format_session_response(session_rec, interview, db)

pause_session_service_v2 = pause_session_service


def resume_session_service(current_user: User, session_id: int, db: Session) -> dict:
    """Resumes a paused interview session (PAUSED -> IN_PROGRESS)."""
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session_rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    if current_user.role == "CANDIDATE" and session_rec.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to resume this interview session.")

    interview = db.query(Interview).filter(Interview.id == session_rec.interview_id).first()

    if session_rec.status == "IN_PROGRESS":
        return _format_session_response(session_rec, interview, db)
    if session_rec.status in ["COMPLETED", "ENDED"]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot resume a completed interview session.")
    if session_rec.status == "CREATED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot resume an interview session that has not been started yet.")
    if session_rec.status != "PAUSED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Cannot resume session with status '{session_rec.status}'.")

    now = datetime.datetime.utcnow()
    session_rec.status = "IN_PROGRESS"
    session_rec.last_resumed_at = now

    db.commit()
    db.refresh(session_rec)

    _log_audit_event(
        db=db,
        user_id=current_user.id,
        role=current_user.role,
        action="SESSION_RESUMED",
        resource_type="InterviewSession",
        resource_id=session_rec.id,
        metadata={"interview_id": session_rec.interview_id}
    )

    return _format_session_response(session_rec, interview, db)

resume_session_service_v2 = resume_session_service


def end_session_service(current_user: User, session_id: int, db: Session, remarks: Optional[str] = None) -> dict:
    """Ends an active or paused interview session (IN_PROGRESS or PAUSED -> COMPLETED, Idempotent)."""
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session_rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    if current_user.role == "CANDIDATE" and session_rec.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to end this interview session.")

    interview = db.query(Interview).filter(Interview.id == session_rec.interview_id).first()
    if interview:
        interview.status = "Completed"

    # Idempotent handling: if session is already completed, update remarks if provided and return response
    if session_rec.status in ["COMPLETED", "ENDED"]:
        if remarks:
            session_rec.remarks = remarks
            db.commit()
        return _format_session_response(session_rec, interview, db)

    if session_rec.status not in ["IN_PROGRESS", "PAUSED"]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot end a session that is not active or paused.")

    now = datetime.datetime.utcnow()

    # Calculate final active segment if session was IN_PROGRESS
    if session_rec.status == "IN_PROGRESS" and session_rec.last_resumed_at:
        delta = int((now - session_rec.last_resumed_at).total_seconds())
        session_rec.total_active_seconds = (session_rec.total_active_seconds or 0) + delta

    session_rec.last_resumed_at = None
    session_rec.status = "COMPLETED"
    if remarks:
        session_rec.remarks = remarks
    session_rec.ended_at = now
    session_rec.duration = session_rec.total_active_seconds or 0

    # Calculate and persist evaluated score
    session_rec.score = evaluate_session_answers(session_rec, interview, [], db)

    # Finalize Module 6 behavior analysis metrics
    try:
        finalize_behavior_analysis(db, session_rec)
    except Exception as e:
        logger.warning(f"Error finalizing behavior analysis: {e}")

    db.commit()
    db.refresh(session_rec)


    _log_audit_event(
        db=db,
        user_id=current_user.id,
        role=current_user.role,
        action="SESSION_ENDED",
        resource_type="InterviewSession",
        resource_id=session_rec.id,
        metadata={"interview_id": session_rec.interview_id}
    )

    return _format_session_response(session_rec, interview, db)

end_session_service_v2 = end_session_service


def get_session_details_service(current_user: User, session_id: int, db: Session) -> dict:
    """Gets details for an interview session including questions and recorded attempts."""
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session_rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    if current_user.role == "CANDIDATE" and session_rec.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to view this interview session.")

    interview = db.query(Interview).filter(Interview.id == session_rec.interview_id, Interview.is_deleted == False).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated interview record not found.")

    return _format_session_response(session_rec, interview, db)

get_session_details_service_v2 = get_session_details_service


def _format_session_response(session_rec: InterviewSession, interview: Optional[Interview], db: Session) -> dict:
    if not interview:
        interview = db.query(Interview).filter(Interview.id == session_rec.interview_id).first()

    formatted_questions = []
    if interview and interview.questions:
        try:
            questions_sorted = sorted(interview.questions, key=lambda x: (x.sequence_no if x.sequence_no is not None else 0))
        except Exception:
            questions_sorted = list(interview.questions)
        for q in questions_sorted:
            formatted_questions.append({
                "id": q.id,
                "sequence_no": q.sequence_no or 1,
                "question_text": q.question_text,
                "category": q.category,
                "difficulty": q.difficulty
            })

    attempts_list = []
    for att in session_rec.attempts:
        attempts_list.append({
            "id": att.id,
            "question_id": att.question_id,
            "question_number": att.question_number,
            "time_spent": att.time_spent,
            "attempted": att.attempted,
            "answer": att.answer
        })

    recordings_list = []
    for rec in session_rec.recordings:
        recordings_list.append({
            "id": rec.id,
            "recording_type": rec.recording_type,
            "file_name": rec.file_name,
            "mime_type": rec.mime_type,
            "file_size": rec.file_size,
            "duration": rec.duration,
            "created_at": rec.created_at.strftime("%Y-%m-%d %H:%M:%S") if rec.created_at else None
        })

    speech_list = []
    if hasattr(session_rec, "speech_analyses") and session_rec.speech_analyses:
        for sa in session_rec.speech_analyses:
            speech_list.append({
                "id": sa.id,
                "question_id": sa.question_id,
                "transcript": sa.transcript,
                "word_count": sa.word_count,
                "duration_seconds": sa.duration_seconds,
                "words_per_minute": sa.words_per_minute,
                "filler_word_count": sa.filler_word_count,
                "filler_words": sa.filler_words or {},
                "grammar_score": sa.grammar_score,
                "pronunciation_score": sa.pronunciation_score, # null per spec
                "clarity_score": sa.clarity_score,
                "communication_score": sa.communication_score,
                "feedback": sa.feedback or {},
                "created_at": sa.created_at.strftime("%Y-%m-%d %H:%M:%S") if sa.created_at else None
            })

    ba = db.query(InterviewBehaviorAnalysis).filter(InterviewBehaviorAnalysis.session_id == session_rec.id).first()
    if not ba and hasattr(session_rec, "behavior_analysis"):
        ba = session_rec.behavior_analysis

    behavior_data = None
    if ba:
        behavior_data = {
            "id": ba.id,
            "session_id": ba.session_id,
            "interview_id": ba.interview_id,
            "candidate_id": ba.candidate_id,
            "confidence_score": ba.confidence_score,
            "confident_frames_count": ba.confident_frames_count,
            "unconfident_frames_count": ba.unconfident_frames_count,
            "total_analyzed_frames": ba.total_analyzed_frames,
            "facial_presentation": ba.facial_presentation,
            "expression_consistency": ba.expression_consistency,
            "positive_expression_frequency": ba.positive_expression_frequency,
            "facial_engagement": ba.facial_engagement,
            "expression_changes_count": ba.expression_changes_count,
            "eye_contact_percentage": ba.eye_contact_percentage,
            "attention_score": ba.attention_score,
            "look_away_events_count": ba.look_away_events_count,
            "look_away_duration_seconds": ba.look_away_duration_seconds,
            "face_absence_events_count": ba.face_absence_events_count,
            "engagement_score": ba.engagement_score,
            "engagement_category": ba.engagement_category,
            "mobile_detected": ba.mobile_detected,
            "mobile_event_count": ba.mobile_event_count,
            "mobile_events_json": ba.mobile_events_json or [],
            "fullscreen_violations_count": ba.fullscreen_violations_count,
            "fullscreen_warnings_count": ba.fullscreen_warnings_count,
            "auto_terminated": ba.auto_terminated,
            "auto_termination_reason": ba.auto_termination_reason,
            "behavior_summary": ba.behavior_summary,
            "created_at": ba.created_at.strftime("%Y-%m-%d %H:%M:%S") if ba.created_at else None
        }

    return {
        "success": True,
        "session": {
            "id": session_rec.id,
            "interview_id": session_rec.interview_id,
            "candidate_id": session_rec.candidate_id,
            "status": session_rec.status,
            "started_at": session_rec.started_at.strftime("%Y-%m-%d %H:%M:%S") if session_rec.started_at else None,
            "ended_at": session_rec.ended_at.strftime("%Y-%m-%d %H:%M:%S") if session_rec.ended_at else None,
            "last_resumed_at": session_rec.last_resumed_at.strftime("%Y-%m-%d %H:%M:%S") if session_rec.last_resumed_at else None,
            "total_active_seconds": session_rec.total_active_seconds or 0,
            "paused_accumulated_seconds": session_rec.paused_accumulated_seconds or 0,
            "current_question_index": session_rec.current_question_index or 0,
            "score": session_rec.score or 0.0,
            "remarks": session_rec.remarks or "",
            "answers_json": session_rec.answers_json or [],
            "created_at": session_rec.created_at.strftime("%Y-%m-%d %H:%M:%S") if session_rec.created_at else None
        },

        "interview": {
            "id": interview.id if interview else session_rec.interview_id,
            "domain": interview.domain if interview else "",
            "interview_type": interview.interview_type if interview else "",
            "difficulty": interview.difficulty if interview else "",
            "duration_mins": interview.duration_mins if interview else 30,
            "questions_count": len(formatted_questions)
        },
        "questions": formatted_questions,
        "attempts": attempts_list,
        "recordings": recordings_list,
        "speech_analyses": speech_list,
        "behavior_analysis": behavior_data
    }


def get_active_session_by_interview_service(current_user: User, interview_id: int, db: Session) -> dict:
    """Returns active/latest session for a given interview."""
    interview = db.query(Interview).filter(Interview.id == interview_id, Interview.is_deleted == False).first()
    if not interview:
        # Fallback: check if passed parameter is actually a session_id
        session_by_id = db.query(InterviewSession).filter(InterviewSession.id == interview_id).first()
        if session_by_id:
            interview = db.query(Interview).filter(Interview.id == session_by_id.interview_id, Interview.is_deleted == False).first()

    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    if current_user.role == "CANDIDATE":
        session_rec = db.query(InterviewSession).filter(
            InterviewSession.interview_id == interview.id,
            InterviewSession.candidate_id == current_user.id
        ).order_by(InterviewSession.created_at.desc()).first()

        if not session_rec:
            session_rec = db.query(InterviewSession).filter(
                InterviewSession.interview_id == interview.id
            ).order_by(InterviewSession.created_at.desc()).first()

        if not session_rec and interview.candidate_id and interview.candidate_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to access this interview.")
    else:
        session_rec = db.query(InterviewSession).filter(
            InterviewSession.interview_id == interview.id
        ).order_by(InterviewSession.created_at.desc()).first()

    if not session_rec:
        return create_interview_session_service(current_user, {"interview_id": interview.id}, db)

    return get_session_details_service(current_user, session_rec.id, db)


def update_session_position_service(current_user: User, session_id: int, position: int, db: Session) -> dict:
    """Persists current question index position for state recovery."""
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session_rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    if current_user.role == "CANDIDATE" and session_rec.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to update this session.")

    interview = db.query(Interview).filter(Interview.id == session_rec.interview_id).first()
    if interview and interview.questions:
        max_idx = len(interview.questions) - 1
        if position < 0 or position > max_idx:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid question index position {position}.")

    session_rec.current_question_index = position
    db.commit()

    return {"success": True, "session_id": session_rec.id, "current_question_index": position}


def record_question_attempt_service(current_user: User, session_id: int, payload: Any, db: Session) -> dict:
    """Records or updates question attempt details, preventing duplicate rows for (session_id, question_id)."""
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session_rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    if current_user.role == "CANDIDATE" and session_rec.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to update attempts for this session.")

    question_id = getattr(payload, "question_id", None) or (payload.get("question_id") if isinstance(payload, dict) else None)
    if not question_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="question_id is required.")

    q_rec = db.query(InterviewQuestion).filter(
        InterviewQuestion.id == question_id,
        InterviewQuestion.interview_id == session_rec.interview_id
    ).first()
    if not q_rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question does not belong to this interview.")

    q_num = getattr(payload, "question_number", None) or (payload.get("question_number") if isinstance(payload, dict) else q_rec.sequence_no)
    time_spent = float(getattr(payload, "time_spent", 0.0) or (payload.get("time_spent") if isinstance(payload, dict) else 0.0))
    answer_text = getattr(payload, "answer", None) or (payload.get("answer") if isinstance(payload, dict) else None)
    is_attempted = getattr(payload, "attempted", True) if getattr(payload, "attempted", None) is not None else True

    existing_attempt = db.query(InterviewQuestionAttempt).filter(
        InterviewQuestionAttempt.session_id == session_rec.id,
        InterviewQuestionAttempt.question_id == question_id
    ).first()

    now = datetime.datetime.utcnow()
    if existing_attempt:
        existing_attempt.time_spent = max(existing_attempt.time_spent or 0.0, time_spent)
        if answer_text is not None:
            existing_attempt.answer = answer_text
        existing_attempt.attempted = is_attempted
        existing_attempt.ended_at = now
        attempt_obj = existing_attempt
    else:
        attempt_obj = InterviewQuestionAttempt(
            session_id=session_rec.id,
            question_id=question_id,
            question_number=q_num,
            started_at=now,
            ended_at=now,
            time_spent=time_spent,
            attempted=is_attempted,
            answer=answer_text,
            created_at=now
        )
        db.add(attempt_obj)

    db.commit()
    db.refresh(attempt_obj)

    return {
        "success": True,
        "attempt": {
            "id": attempt_obj.id,
            "session_id": attempt_obj.session_id,
            "question_id": attempt_obj.question_id,
            "question_number": attempt_obj.question_number,
            "time_spent": attempt_obj.time_spent,
            "attempted": attempt_obj.attempted,
            "answer": attempt_obj.answer
        }
    }


def upload_session_recording_service(
    current_user: User,
    session_id: int,
    file_bytes: bytes,
    original_filename: str,
    mime_type: str,
    duration: float,
    db: Session
) -> dict:
    """Uploads session video+audio recording file securely to server disk and records metadata."""
    session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session_rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    if current_user.role == "CANDIDATE" and session_rec.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to upload recordings for this session.")

    if len(file_bytes) > MAX_RECORDING_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recording file exceeds maximum allowed size limit of 500 MB.")

    ext = "webm"
    if "mp4" in mime_type.lower():
        ext = "mp4"
    elif "mkv" in mime_type.lower() or "matroska" in mime_type.lower():
        ext = "mkv"

    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    recordings_dir = os.path.join(os.getcwd(), "uploads", "recordings")
    os.makedirs(recordings_dir, exist_ok=True)
    full_storage_path = os.path.join(recordings_dir, unique_filename)

    with open(full_storage_path, "wb") as f:
        f.write(file_bytes)

    recording_rec = InterviewRecording(
        session_id=session_rec.id,
        recording_type="VIDEO_AUDIO",
        file_name=unique_filename,
        storage_path=full_storage_path,
        mime_type=mime_type or "video/webm",
        file_size=len(file_bytes),
        duration=duration,
        created_at=datetime.datetime.utcnow()
    )
    db.add(recording_rec)
    db.commit()
    db.refresh(recording_rec)

    _log_audit_event(
        db=db,
        user_id=current_user.id,
        role=current_user.role,
        action="RECORDING_UPLOADED",
        resource_type="InterviewRecording",
        resource_id=recording_rec.id,
        metadata={"session_id": session_rec.id, "file_size": len(file_bytes), "mime_type": mime_type}
    )

    return {
        "success": True,
        "recording": {
            "id": recording_rec.id,
            "session_id": recording_rec.session_id,
            "recording_type": recording_rec.recording_type,
            "file_name": recording_rec.file_name,
            "mime_type": recording_rec.mime_type,
            "file_size": recording_rec.file_size,
            "duration": recording_rec.duration,
            "created_at": recording_rec.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
    }


def get_authorized_recording_service(current_user: User, session_id: int, recording_id: int, db: Session) -> FileResponse:
    """Streams authorized recording file after checking JWT role and ownership permissions."""
    recording_rec = db.query(InterviewRecording).filter(
        InterviewRecording.id == recording_id,
        InterviewRecording.session_id == session_id
    ).first()

    if not recording_rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording file reference not found.")

    session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session_rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated interview session not found.")

    if current_user.role == "CANDIDATE":
        if session_rec.candidate_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Candidate cannot access another candidate's recording.")
    elif current_user.role == "RECRUITER":
        interview = db.query(Interview).filter(Interview.id == session_rec.interview_id).first()
        if not interview:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
        if interview.recruiter_id != current_user.id and interview.candidate_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Recruiter is not authorized to view this recording.")
    elif current_user.role == "ADMIN":
        pass
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Invalid user role.")

    if not os.path.exists(recording_rec.storage_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Physical recording file not found on server.")

    return FileResponse(
        path=recording_rec.storage_path,
        media_type=recording_rec.mime_type or "video/webm",
        filename=recording_rec.file_name
    )


