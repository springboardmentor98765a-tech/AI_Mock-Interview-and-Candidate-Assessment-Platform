"""
routes/interview_routes.py
============================
Module 3 - AI Interview Generation.

    POST   /interviews/generate       create an interview + AI-generated questions
    GET    /interviews                list the current user's interviews
    GET    /interviews/history        completed interviews only
    GET    /interviews/analytics      real, computed-from-history performance analytics
    GET    /interviews/{id}           one interview with its questions
    PUT    /interviews/{id}           update domain/difficulty (only while "created")
    DELETE /interviews/{id}           delete an interview
    POST   /interviews/start          mark an interview as started, return question 1 + timer deadline
    PUT    /interviews/{id}/questions/{question_id}/answer
                                       save + score a candidate's (voice-transcribed) answer
    POST   /interviews/{id}/timeout   force-end an interview when its time limit runs out
"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import (
    Interview,
    InterviewQuestion,
    InterviewTypeEnum,
    DifficultyEnum,
    InterviewStatusEnum,
    User,
)
from app.schemas import (
    InterviewGenerateRequest,
    InterviewUpdateRequest,
    InterviewOut,
    InterviewDetailOut,
    InterviewQuestionOut,
    InterviewSessionOut,
    AnswerSubmitRequest,
    MessageResponse,
    AnalyticsOut,
)
from app.auth import get_current_user
from app.ai_question_generator import generate_questions
from app.scoring import analyze_answer
from app.resume_parser import compute_resume_score

router = APIRouter(prefix="/interviews", tags=["Interviews"])


def _compute_deadline_at(interview: Interview):
    """
    Returns a timezone-aware UTC datetime (or None if there's no time
    limit / the interview hasn't started). Stored timestamps are naive
    UTC (datetime.utcnow()); we explicitly attach tzinfo=UTC before this
    goes out over the API so the browser's `new Date(...)` parses it as
    UTC instead of silently assuming local time (which was previously
    causing the timer to look like it had already expired for anyone
    not in a UTC+0 timezone).
    """
    if not interview.started_at or not interview.duration_minutes:
        return None
    deadline = interview.started_at + timedelta(minutes=interview.duration_minutes)
    return deadline.replace(tzinfo=timezone.utc)


def _get_owned_interview(interview_id: str, current_user: User, db: Session) -> Interview:
    try:
        interview_uuid = uuid.UUID(interview_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid interview id.")

    interview = (
        db.query(Interview)
        .options(joinedload(Interview.questions))
        .filter(Interview.id == interview_uuid)
        .first()
    )

    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    if interview.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This interview belongs to another user.")

    return interview


# ---------------------------------------------------------------------------
# POST /interviews/generate
# ---------------------------------------------------------------------------
@router.post("/generate", response_model=InterviewDetailOut, status_code=status.HTTP_201_CREATED)
def generate_interview(
    payload: InterviewGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume_skills = None
    domain = payload.domain

    if payload.use_resume_skills:
        if not current_user.resume_skills:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No resume on file yet. Upload one via POST /resume/upload first, "
                       "or set use_resume_skills to false and provide a domain.",
            )
        resume_skills = [s for s in current_user.resume_skills.split(",") if s]
        if not domain:
            domain = ", ".join(resume_skills[:5])  # readable label for the interview record

    interview = Interview(
        user_id=current_user.id,
        interview_type=InterviewTypeEnum(payload.interview_type),
        domain=domain,
        difficulty=DifficultyEnum(payload.difficulty),
        status=InterviewStatusEnum.created,
        duration_minutes=payload.duration_minutes,
    )
    db.add(interview)
    db.flush()  # get interview.id before creating questions

    # Dynamically generated every time (Gemini, or the randomized local
    # fallback) - never the same fixed rows pulled from a static table.
    generated = generate_questions(
        interview_type=payload.interview_type,
        domain=domain,
        difficulty=payload.difficulty,
        num_questions=payload.num_questions,
        resume_skills=resume_skills,
    )

    for index, q in enumerate(generated, start=1):
        db.add(InterviewQuestion(
            interview_id=interview.id,
            question_text=q["question_text"],
            category=q["category"],
            difficulty=DifficultyEnum(q.get("difficulty", payload.difficulty)),
            sequence_no=index,
        ))

    db.commit()
    db.refresh(interview)

    return InterviewDetailOut.model_validate(interview)


# ---------------------------------------------------------------------------
# GET /interviews
# ---------------------------------------------------------------------------
@router.get("", response_model=list[InterviewOut])
def list_interviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interviews = (
        db.query(Interview)
        .options(joinedload(Interview.questions))
        .filter(Interview.user_id == current_user.id)
        .order_by(Interview.created_at.desc())
        .all()
    )
    return [InterviewOut.model_validate(i) for i in interviews]


# ---------------------------------------------------------------------------
# GET /interviews/history  (completed only)
# NOTE: declared before /{interview_id} so "history" isn't parsed as an id
# ---------------------------------------------------------------------------
@router.get("/history", response_model=list[InterviewOut])
def interview_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interviews = (
        db.query(Interview)
        .options(joinedload(Interview.questions))
        .filter(
            Interview.user_id == current_user.id,
            Interview.status == InterviewStatusEnum.completed,
        )
        .order_by(Interview.completed_at.desc())
        .all()
    )
    return [InterviewOut.model_validate(i) for i in interviews]


# ---------------------------------------------------------------------------
# GET /interviews/analytics  (real, computed-from-history dashboard data)
# NOTE: declared before /{interview_id} so "analytics" isn't parsed as an id
# ---------------------------------------------------------------------------
@router.get("/analytics", response_model=AnalyticsOut)
def interview_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    completed = (
        db.query(Interview)
        .options(joinedload(Interview.questions))
        .filter(
            Interview.user_id == current_user.id,
            Interview.status == InterviewStatusEnum.completed,
        )
        .order_by(Interview.completed_at.asc())
        .all()
    )

    resume_score = None
    if current_user.resume_uploaded_at:
        skills = [s for s in (current_user.resume_skills or "").split(",") if s]
        resume_score = compute_resume_score(
            skills=skills,
            experience_years=current_user.resume_experience_years,
            experience=current_user.resume_experience or [],
            education=current_user.resume_education or [],
            summary=current_user.resume_summary,
        )

    if not completed:
        return AnalyticsOut(
            resume_score=resume_score,
            interview_readiness=resume_score,
        )

    answered_questions = [
        q for interview in completed for q in interview.questions if q.answer_text
    ]

    def _avg(values):
        values = [v for v in values if v is not None]
        return round(sum(values) / len(values), 1) if values else None

    scored_interviews = [i for i in completed if i.overall_score is not None]

    average_score = _avg([i.overall_score for i in scored_interviews])
    communication_avg = _avg([q.communication_score for q in answered_questions])
    technical_avg = _avg([q.technical_score for q in answered_questions])
    confidence_avg = _avg([q.confidence_score for q in answered_questions])
    grammar_avg = _avg([q.grammar_score for q in answered_questions])
    last_score = scored_interviews[-1].overall_score if scored_interviews else None

    durations = [
        (i.completed_at - i.started_at).total_seconds() / 60
        for i in completed
        if i.started_at and i.completed_at
    ]
    average_duration_minutes = round(sum(durations) / len(durations), 1) if durations else None

    # Skill growth: compare the average score of the second half of
    # completed interviews (most recent) against the first half.
    skill_growth_percent = 0.0
    if len(scored_interviews) >= 2:
        mid = len(scored_interviews) // 2
        first_half = _avg([i.overall_score for i in scored_interviews[:mid]])
        second_half = _avg([i.overall_score for i in scored_interviews[mid:]])
        if first_half is not None and second_half is not None:
            skill_growth_percent = round(second_half - first_half, 1)

    interview_readiness = None
    if average_score is not None and resume_score is not None:
        interview_readiness = round(0.7 * average_score + 0.3 * resume_score, 1)
    elif average_score is not None:
        interview_readiness = average_score
    elif resume_score is not None:
        interview_readiness = resume_score

    return AnalyticsOut(
        completed_interviews=len(completed),
        total_questions_answered=len(answered_questions),
        average_score=average_score,
        communication_avg=communication_avg,
        technical_avg=technical_avg,
        confidence_avg=confidence_avg,
        grammar_avg=grammar_avg,
        last_score=last_score,
        average_duration_minutes=average_duration_minutes,
        skill_growth_percent=skill_growth_percent,
        resume_score=resume_score,
        interview_readiness=interview_readiness,
    )


# ---------------------------------------------------------------------------
# POST /interviews/start
# ---------------------------------------------------------------------------
@router.post("/start")
def start_interview(
    interview_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = _get_owned_interview(interview_id, current_user, db)

    if interview.status == InterviewStatusEnum.created:
        interview.status = InterviewStatusEnum.in_progress
        interview.started_at = datetime.utcnow()
        db.commit()
        db.refresh(interview)

    first_question = interview.questions[0] if interview.questions else None

    deadline_at = _compute_deadline_at(interview)

    return {
        "interview": InterviewOut.model_validate(interview),
        "first_question": InterviewQuestionOut.model_validate(first_question) if first_question else None,
        "total_questions": len(interview.questions),
        "deadline_at": deadline_at,
    }


# ---------------------------------------------------------------------------
# GET /interviews/{interview_id}/session
# Explicit session state: how far along, and what's the next question -
# what a frontend polls to drive the interview UI question-by-question.
# ---------------------------------------------------------------------------
@router.get("/{interview_id}/session", response_model=InterviewSessionOut)
def get_interview_session(
    interview_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = _get_owned_interview(interview_id, current_user, db)

    answered_count = sum(1 for q in interview.questions if q.answer_text)
    current_question = next((q for q in interview.questions if not q.answer_text), None)
    is_complete = current_question is None and len(interview.questions) > 0

    deadline_at = _compute_deadline_at(interview)

    return InterviewSessionOut(
        interview=InterviewOut.model_validate(interview),
        total_questions=len(interview.questions),
        answered_count=answered_count,
        is_complete=is_complete,
        current_question=InterviewQuestionOut.model_validate(current_question) if current_question else None,
        deadline_at=deadline_at,
    )


# ---------------------------------------------------------------------------
# GET /interviews/{interview_id}
# ---------------------------------------------------------------------------
@router.get("/{interview_id}", response_model=InterviewDetailOut)
def get_interview(
    interview_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = _get_owned_interview(interview_id, current_user, db)
    return InterviewDetailOut.model_validate(interview)


# ---------------------------------------------------------------------------
# PUT /interviews/{interview_id}
# ---------------------------------------------------------------------------
@router.put("/{interview_id}", response_model=InterviewDetailOut)
def update_interview(
    interview_id: str,
    payload: InterviewUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = _get_owned_interview(interview_id, current_user, db)

    if interview.status != InterviewStatusEnum.created:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only interviews that haven't started yet can be edited.",
        )

    if payload.domain is not None:
        interview.domain = payload.domain
    if payload.difficulty is not None:
        interview.difficulty = DifficultyEnum(payload.difficulty)

    db.commit()
    db.refresh(interview)
    return InterviewDetailOut.model_validate(interview)


# ---------------------------------------------------------------------------
# DELETE /interviews/{interview_id}
# ---------------------------------------------------------------------------
@router.delete("/{interview_id}", response_model=MessageResponse)
def delete_interview(
    interview_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = _get_owned_interview(interview_id, current_user, db)
    db.delete(interview)
    db.commit()
    return MessageResponse(message="Interview deleted.")


# ---------------------------------------------------------------------------
# PUT /interviews/{interview_id}/questions/{question_id}/answer
# Saves the candidate's answer (typically the transcript of their spoken
# answer, captured client-side via the browser's speech-to-text).
# ---------------------------------------------------------------------------
@router.put("/{interview_id}/questions/{question_id}/answer", response_model=InterviewQuestionOut)
def submit_answer(
    interview_id: str,
    question_id: str,
    payload: AnswerSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = _get_owned_interview(interview_id, current_user, db)

    try:
        question_uuid = uuid.UUID(question_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid question id.")

    question = next((q for q in interview.questions if q.id == question_uuid), None)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found on this interview.")

    resume_skills = (
        [s for s in current_user.resume_skills.split(",") if s]
        if current_user.resume_skills
        else None
    )
    scores = analyze_answer(
        question_text=question.question_text,
        answer_text=payload.answer_text,
        domain=interview.domain,
        resume_skills=resume_skills,
    )

    question.answer_text = payload.answer_text
    question.answered_at = datetime.utcnow()
    question.technical_score = scores["technical_score"]
    question.communication_score = scores["communication_score"]
    question.confidence_score = scores["confidence_score"]
    question.grammar_score = scores["grammar_score"]
    question.overall_score = scores["overall_score"]
    question.word_count = scores["word_count"]

    # If every question now has an answer, mark the interview completed
    # and compute its real overall score from the answered questions.
    db.flush()
    db.refresh(interview)
    if all(q.answer_text for q in interview.questions):
        interview.status = InterviewStatusEnum.completed
        interview.completed_at = datetime.utcnow()
        answered = [q for q in interview.questions if q.overall_score is not None]
        if answered:
            interview.overall_score = round(
                sum(q.overall_score for q in answered) / len(answered), 1
            )

    db.commit()
    db.refresh(question)
    return InterviewQuestionOut.model_validate(question)


# ---------------------------------------------------------------------------
# POST /interviews/{interview_id}/timeout
# Called by the frontend timer when the candidate's selected time limit
# runs out. Ends the interview immediately with whatever was answered so
# far - it does not fabricate scores for unanswered questions.
# ---------------------------------------------------------------------------
@router.post("/{interview_id}/timeout", response_model=InterviewOut)
def timeout_interview(
    interview_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = _get_owned_interview(interview_id, current_user, db)

    if interview.status == InterviewStatusEnum.completed:
        return InterviewOut.model_validate(interview)

    interview.status = InterviewStatusEnum.completed
    interview.completed_at = datetime.utcnow()
    interview.time_expired = True

    answered = [q for q in interview.questions if q.overall_score is not None]
    if answered:
        interview.overall_score = round(
            sum(q.overall_score for q in answered) / len(answered), 1
        )

    db.commit()
    db.refresh(interview)
    return InterviewOut.model_validate(interview)
