"""
Module 3: AI Interview Generation — Python/FastAPI implementation.

Endpoint layout matches the guideline doc's "Suggested APIs" list
(POST /generate, GET /, GET /{id}, PUT /{id}, DELETE /{id}, POST
/start, GET /history) plus the same session-management endpoints the
Node service already ships (attend/cancel/me/stats/overview/
candidates/review), so this can be adopted as a drop-in Module 3
backend. Two enhancements on top:

  * GET /{id}/feedback              — candidate views recruiter/coach feedback
  * GET /{id}/questions/{qid}/tts   — text-to-speech audio for a question
  * GET /{id}/tts                   — manifest of audio URLs for a whole session
"""
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import ai_providers
from app.database import get_db
from app.models import Interview, InterviewAnswer, InterviewQuestion, User
from app.notify import notify
from app.question_bank import (
    VALID_CATEGORIES,
    VALID_DIFFICULTIES,
    generate_assessment,
    generate_questions,
)
from app.schemas import (
    AnswerIn,
    AnswerOut,
    CandidateSummaryOut,
    FeedbackOut,
    GenerateInterviewRequest,
    InterviewOut,
    InterviewWithQuestionsOut,
    OverviewOut,
    QuestionOut,
    ReviewRequest,
    ScheduleInterviewRequest,
    StartInterviewRequest,
    StatsOut,
    TTSManifestOut,
    UpdateInterviewRequest,
    ViolationIn,
    ViolationOut,
)
from app.security import CurrentUser, get_current_user, require_roles
from app.tts_engine import get_or_create_question_audio, media_type_for

router = APIRouter(prefix="/api/interviews", tags=["interviews"])

STAFF_ROLES = ("coach", "recruiter", "admin")


def _safe_mode(mode: Optional[str], fallback: str = "online") -> str:
    return "offline" if mode == "offline" else "online" if mode == "online" else fallback


def _get_owned_or_staff_interview(db: Session, interview_id: int, user: CurrentUser) -> Interview:
    interview = db.get(Interview, interview_id)
    if interview is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Interview not found")
    is_owner = interview.candidate_id == user.id
    is_staff = user.role in STAFF_ROLES
    if not is_owner and not is_staff:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this interview")
    return interview


def _get_own_editable_interview(db: Session, interview_id: int, user: CurrentUser) -> Interview:
    interview = db.get(Interview, interview_id)
    if interview is None or interview.candidate_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Interview not found")
    return interview


# =================================================================
# Candidate — generate / start / schedule
# =================================================================
@router.post("/generate", response_model=InterviewWithQuestionsOut, status_code=201)
def generate_interview(
    body: GenerateInterviewRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("candidate")),
):
    """POST /interviews/generate — creates a new session and generates
    an AI question set for it (HR / Technical / Behavioral / Aptitude /
    Mixed), customized by domain + difficulty."""
    safe_category = body.category if body.category in [*VALID_CATEGORIES, "Mixed"] else "Mixed"
    safe_difficulty = body.difficulty if body.difficulty in VALID_DIFFICULTIES else "medium"
    safe_count = max(1, min(int(body.questionCount or 5), 20))

    questions = generate_questions(
        category=safe_category,
        difficulty=safe_difficulty,
        domain=body.domain,
        count=safe_count,
        interview_type=body.interviewType,
        use_ai=True,
    )

    interview = Interview(
        candidate_id=user.id,
        interview_type=body.interviewType,
        mode=_safe_mode(body.mode),
        status="scheduled",
        domain=body.domain,
        difficulty=safe_difficulty,
        question_count=len(questions),
        scheduled_at=datetime.now(timezone.utc),
    )
    db.add(interview)
    db.flush()  # assigns interview.id

    inserted: list[InterviewQuestion] = []
    for i, q in enumerate(questions, start=1):
        iq = InterviewQuestion(
            interview_id=interview.id,
            question_text=q["text"],
            category=q["category"],
            difficulty=q["difficulty"],
            sequence_no=i,
        )
        db.add(iq)
        inserted.append(iq)

    db.commit()
    db.refresh(interview)

    notify(
        db,
        user_id=user.id,
        title="Interview Questions Generated",
        message=f'{len(inserted)} AI-generated {safe_category} questions are ready for your "{body.interviewType}" session.',
    )

    return {"interview": interview, "questions": inserted}


@router.post("/start", response_model=InterviewOut, status_code=201)
def start_interview(
    body: StartInterviewRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("candidate")),
):
    """POST /interviews/start — runs an instant AI-scored mock interview."""
    assessment = generate_assessment()
    now = datetime.now(timezone.utc)
    interview = Interview(
        candidate_id=user.id,
        interview_type=body.interviewType,
        mode=_safe_mode(body.mode),
        status="completed",
        score=assessment["score"],
        skill_communication=assessment["skill_communication"],
        skill_technical=assessment["skill_technical"],
        skill_confidence=assessment["skill_confidence"],
        skill_problem_solving=assessment["skill_problem_solving"],
        ai_feedback=assessment["ai_feedback"],
        scheduled_at=now,
        completed_at=now,
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    notify(
        db,
        user_id=user.id,
        title="AI Report Generated",
        message=f'Your "{body.interviewType}" mock interview scored {assessment["score"]}%. Report is ready.',
    )
    return interview


@router.post("/schedule", response_model=InterviewOut, status_code=201)
def schedule_interview(
    body: ScheduleInterviewRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("candidate")),
):
    interview = Interview(
        candidate_id=user.id,
        interview_type=body.interviewType,
        mode=_safe_mode(body.mode),
        status="scheduled",
        scheduled_at=body.scheduledAt,
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    notify(db, role="coach", title="New Session Booked", message=f'A candidate booked a "{body.interviewType}" session.')
    notify(db, role="recruiter", title="Interview Scheduled", message=f'A "{body.interviewType}" interview was scheduled.')
    return interview


# =================================================================
# Candidate — own list / stats / history
# =================================================================
@router.get("/me", response_model=list[InterviewOut])
def list_my_interviews(db: Session = Depends(get_db), user: CurrentUser = Depends(require_roles("candidate"))):
    return (
        db.query(Interview)
        .filter(Interview.candidate_id == user.id)
        .order_by(Interview.scheduled_at.desc())
        .all()
    )


@router.get("/history", response_model=list[InterviewOut])
def interview_history(db: Session = Depends(get_db), user: CurrentUser = Depends(require_roles("candidate"))):
    """GET /interviews/history — candidate's completed sessions, most
    recent first (matches the guideline doc's suggested API name)."""
    return (
        db.query(Interview)
        .filter(Interview.candidate_id == user.id, Interview.status == "completed")
        .order_by(Interview.completed_at.desc())
        .all()
    )


@router.get("/me/stats", response_model=StatsOut)
def my_stats(db: Session = Depends(get_db), user: CurrentUser = Depends(require_roles("candidate"))):
    completed = db.query(Interview).filter(Interview.candidate_id == user.id, Interview.status == "completed")
    completed_count = completed.count()
    upcoming_count = (
        db.query(Interview)
        .filter(
            Interview.candidate_id == user.id,
            Interview.status == "scheduled",
            Interview.scheduled_at >= datetime.now(timezone.utc),
        )
        .count()
    )

    def avg(col):
        val = db.query(func.avg(col)).filter(Interview.candidate_id == user.id, Interview.status == "completed").scalar()
        return round(val) if val is not None else 0

    return StatsOut(
        mockInterviews=completed_count,
        averageScore=avg(Interview.score),
        reportsGenerated=completed_count,
        upcomingInterviews=upcoming_count,
        skills={
            "communication": avg(Interview.skill_communication),
            "technical": avg(Interview.skill_technical),
            "confidence": avg(Interview.skill_confidence),
            "problemSolving": avg(Interview.skill_problem_solving),
        },
    )


# =================================================================
# Shared session CRUD
# =================================================================
@router.get("", response_model=list[InterviewOut])
def list_interviews(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    today: Optional[bool] = Query(default=None),
    date_filter: Optional[str] = Query(default=None, alias="date"),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """GET /interviews — role-aware: candidates get their own sessions,
    staff (coach/recruiter/admin) get every session, optionally
    filtered by ?status= and ?today=true (legacy) or ?date=today|
    tomorrow|week|YYYY-MM-DD for the schedule views' date tabs."""
    q = db.query(Interview)
    if user.role == "candidate":
        q = q.filter(Interview.candidate_id == user.id)
    elif user.role not in STAFF_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to access this resource")

    if status_filter:
        q = q.filter(Interview.status == status_filter)
    if today:
        q = q.filter(func.date(Interview.scheduled_at) == func.current_date())

    if date_filter == "today":
        q = q.filter(func.date(Interview.scheduled_at) == date.today())
    elif date_filter == "tomorrow":
        q = q.filter(func.date(Interview.scheduled_at) == date.today() + timedelta(days=1))
    elif date_filter == "week":
        start = date.today()
        end = start + timedelta(days=7)
        q = q.filter(func.date(Interview.scheduled_at) >= start, func.date(Interview.scheduled_at) < end)
    elif date_filter:
        try:
            target = date.fromisoformat(date_filter)
            q = q.filter(func.date(Interview.scheduled_at) == target)
        except ValueError:
            pass  # unrecognized value — ignore rather than 400, keeps the tabs forgiving

    return q.order_by(Interview.scheduled_at.desc()).all()


@router.get("/{interview_id}", response_model=InterviewWithQuestionsOut)
def get_interview(interview_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    interview = _get_owned_or_staff_interview(db, interview_id, user)
    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.interview_id == interview_id)
        .order_by(InterviewQuestion.sequence_no.asc())
        .all()
    )
    return {"interview": interview, "questions": questions}


@router.put("/{interview_id}", response_model=InterviewWithQuestionsOut)
def update_interview(
    interview_id: int,
    body: UpdateInterviewRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("candidate")),
):
    interview = _get_own_editable_interview(db, interview_id, user)
    if interview.status == "completed":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Completed interviews cannot be edited")

    safe_difficulty = body.difficulty if body.difficulty in VALID_DIFFICULTIES else interview.difficulty

    interview.interview_type = body.interviewType or interview.interview_type
    interview.mode = _safe_mode(body.mode, interview.mode)
    interview.domain = body.domain if body.domain is not None else interview.domain
    interview.difficulty = safe_difficulty
    if body.scheduledAt:
        interview.scheduled_at = body.scheduledAt

    questions_out = None
    if body.regenerate:
        safe_category = body.category if body.category in [*VALID_CATEGORIES, "Mixed"] else "Mixed"
        safe_count = max(1, min(int(body.questionCount or interview.question_count or 5), 20))
        new_questions = generate_questions(
            category=safe_category,
            difficulty=safe_difficulty,
            domain=interview.domain,
            count=safe_count,
            interview_type=interview.interview_type,
            use_ai=True,
        )

        db.query(InterviewQuestion).filter(InterviewQuestion.interview_id == interview_id).delete()
        questions_out = []
        for i, q in enumerate(new_questions, start=1):
            iq = InterviewQuestion(
                interview_id=interview_id,
                question_text=q["text"],
                category=q["category"],
                difficulty=q["difficulty"],
                sequence_no=i,
            )
            db.add(iq)
            questions_out.append(iq)
        interview.question_count = len(questions_out)

    db.commit()
    db.refresh(interview)
    if questions_out is None:
        questions_out = (
            db.query(InterviewQuestion)
            .filter(InterviewQuestion.interview_id == interview_id)
            .order_by(InterviewQuestion.sequence_no.asc())
            .all()
        )
    return {"interview": interview, "questions": questions_out}


@router.delete("/me/clear")
def clear_interview_history(
    include_completed: bool = False,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("candidate")),
):
    """Bulk-deletes the current candidate's own interview history — the
    "Clear History" button on candidate.html. By default only scheduled/
    cancelled interviews are removed, same rule as DELETE /{id}, so a
    real completed report is never lost by accident; pass
    ?include_completed=true to wipe everything including completed
    interviews (and their questions/answers, via the FK's
    ondelete=CASCADE)."""
    q = db.query(Interview).filter(Interview.candidate_id == user.id)
    if not include_completed:
        q = q.filter(Interview.status != "completed")
    deleted = q.delete(synchronize_session=False)
    db.commit()
    return {"message": f"{deleted} interview(s) cleared", "deleted": deleted}


@router.delete("/{interview_id}")
def delete_interview(interview_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(require_roles("candidate"))):
    interview = _get_own_editable_interview(db, interview_id, user)
    if interview.status == "completed":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Completed interviews cannot be deleted")
    db.delete(interview)
    db.commit()
    return {"message": "Interview deleted"}


@router.patch("/{interview_id}/attend", response_model=InterviewOut)
def attend_interview(interview_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(require_roles("candidate"))):
    interview = _get_own_editable_interview(db, interview_id, user)
    if interview.status != "scheduled":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This interview is not in a scheduled state")

    assessment = generate_assessment()
    interview.status = "completed"
    interview.score = assessment["score"]
    interview.skill_communication = assessment["skill_communication"]
    interview.skill_technical = assessment["skill_technical"]
    interview.skill_confidence = assessment["skill_confidence"]
    interview.skill_problem_solving = assessment["skill_problem_solving"]
    interview.ai_feedback = assessment["ai_feedback"]
    interview.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(interview)

    notify(
        db,
        user_id=user.id,
        title="AI Report Generated",
        message=f'Your "{interview.interview_type}" interview scored {interview.score}%. Report is ready.',
    )
    return interview


@router.patch("/{interview_id}/cancel", response_model=InterviewOut)
def cancel_interview(interview_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(require_roles("candidate"))):
    interview = _get_own_editable_interview(db, interview_id, user)
    if interview.status != "scheduled":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Scheduled interview not found")
    interview.status = "cancelled"
    db.commit()
    db.refresh(interview)
    return interview


# =================================================================
# ENHANCEMENT 3 — live interview session: answers, proctoring
# violations, and real (LLM-scored) session completion
# =================================================================
@router.post("/{interview_id}/answers", response_model=AnswerOut)
def submit_answer(
    interview_id: int,
    body: AnswerIn,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("candidate")),
):
    """Saves (or updates) the candidate's answer to one question —
    typed directly, or transcribed client-side from voice via the Web
    Speech API. Called once per question as the candidate moves
    through the live session, so progress survives a page reload."""
    interview = _get_own_editable_interview(db, interview_id, user)
    if interview.status == "completed":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This interview is already completed")

    question = db.get(InterviewQuestion, body.questionId)
    if question is None or question.interview_id != interview.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found in this interview")

    safe_mode = body.inputMode if body.inputMode in ("typed", "voice") else "typed"
    answer = (
        db.query(InterviewAnswer)
        .filter(InterviewAnswer.interview_id == interview.id, InterviewAnswer.question_id == body.questionId)
        .first()
    )
    if answer is None:
        answer = InterviewAnswer(interview_id=interview.id, question_id=body.questionId)
        db.add(answer)

    answer.answer_text = body.answerText or ""
    answer.input_mode = safe_mode
    answer.time_taken_seconds = body.timeTakenSeconds
    db.commit()
    db.refresh(answer)
    return answer


@router.get("/{interview_id}/answers", response_model=list[AnswerOut])
def list_answers(interview_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    interview = _get_owned_or_staff_interview(db, interview_id, user)
    return db.query(InterviewAnswer).filter(InterviewAnswer.interview_id == interview.id).all()


@router.post("/{interview_id}/violation", response_model=ViolationOut)
def log_proctoring_violation(
    interview_id: int,
    body: ViolationIn,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("candidate")),
):
    """The live-interview page calls this every time its proctoring
    checks fire — tab/window switch, fullscreen exit, no face
    detected, more than one face detected, prolonged look-away, or a
    blocked copy/paste. Auto-submit is left as a client-side decision
    (the UI ends the session once its own strike threshold is hit);
    this just persists the running count for the record/report."""
    interview = _get_own_editable_interview(db, interview_id, user)
    if interview.status == "completed":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This interview is already completed")
    interview.proctoring_violations = (interview.proctoring_violations or 0) + 1
    db.commit()
    db.refresh(interview)
    return ViolationOut(violations=interview.proctoring_violations, auto_submit=interview.proctoring_violations >= 5)


@router.patch("/{interview_id}/finish", response_model=InterviewOut)
def finish_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("candidate")),
):
    """Ends a live AI-generated session (started via POST /generate)
    and scores it. If the candidate answered questions, the transcript
    is sent to the LLM provider chain for real scoring + feedback
    grounded in what they actually said; otherwise (or if every
    provider is unreachable) it falls back to the same simulator used
    by /start and /attend, so a report is always produced."""
    interview = _get_own_editable_interview(db, interview_id, user)
    if interview.status == "completed":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This interview is already completed")

    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.interview_id == interview.id)
        .order_by(InterviewQuestion.sequence_no.asc())
        .all()
    )
    answers = db.query(InterviewAnswer).filter(InterviewAnswer.interview_id == interview.id).all()
    answers_by_question = {a.question_id: a for a in answers}

    qa_pairs = [
        {
            "question": q.question_text,
            "category": q.category,
            "answer": (answers_by_question.get(q.id).answer_text or "") if q.id in answers_by_question else "",
        }
        for q in questions
    ]

    assessment = None
    if any(p["answer"].strip() for p in qa_pairs):
        try:
            assessment = ai_providers.score_interview_llm(interview.interview_type, qa_pairs)
        except Exception:
            assessment = None
    if assessment is None:
        assessment = generate_assessment()

    interview.status = "completed"
    interview.score = assessment["score"]
    interview.skill_communication = assessment["skill_communication"]
    interview.skill_technical = assessment["skill_technical"]
    interview.skill_confidence = assessment["skill_confidence"]
    interview.skill_problem_solving = assessment["skill_problem_solving"]
    interview.ai_feedback = assessment["ai_feedback"]
    interview.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(interview)

    notify(
        db,
        user_id=user.id,
        title="AI Report Generated",
        message=f'Your "{interview.interview_type}" interview scored {interview.score}%. Report is ready.',
    )
    return interview


# =================================================================
# ENHANCEMENT 1 — candidate views recruiter/coach feedback
# =================================================================
@router.get("/{interview_id}/feedback", response_model=FeedbackOut)
def get_feedback(interview_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    """Candidate (owner) or staff can view the feedback left on a
    session — the AI-generated feedback plus any human feedback a
    recruiter/coach/admin has added via PATCH /{id}/review."""
    interview = _get_owned_or_staff_interview(db, interview_id, user)

    reviewer_name = None
    reviewer_role = None
    if interview.reviewed_by:
        reviewer = db.get(User, interview.reviewed_by)
        if reviewer:
            reviewer_name = reviewer.full_name
            reviewer_role = reviewer.role

    return FeedbackOut(
        interview_id=interview.id,
        interview_type=interview.interview_type,
        status=interview.status,
        score=interview.score,
        ai_feedback=interview.ai_feedback,
        recruiter_feedback=interview.coach_feedback,
        reviewed_by_name=reviewer_name,
        reviewed_by_role=reviewer_role,
        has_feedback=bool(interview.coach_feedback),
    )


# =================================================================
# ENHANCEMENT 2 — text-to-speech for questions
# =================================================================
@router.get("/{interview_id}/questions/{question_id}/tts")
def question_tts(
    interview_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Streams (and caches) spoken audio for one interview question."""
    interview = _get_owned_or_staff_interview(db, interview_id, user)
    question = db.get(InterviewQuestion, question_id)
    if question is None or question.interview_id != interview.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")

    try:
        audio_path = get_or_create_question_audio(interview.id, question.id, question.question_text)
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc))

    return FileResponse(path=str(audio_path), media_type=media_type_for(audio_path))


@router.get("/{interview_id}/tts", response_model=TTSManifestOut)
def session_tts_manifest(interview_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    """Lists a playable audio URL for every question in the session,
    in order — handy for building a "play through all questions"
    control on the front end."""
    interview = _get_owned_or_staff_interview(db, interview_id, user)
    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.interview_id == interview_id)
        .order_by(InterviewQuestion.sequence_no.asc())
        .all()
    )
    return TTSManifestOut(
        interview_id=interview.id,
        questions=[
            {
                "question_id": q.id,
                "sequence_no": q.sequence_no,
                "category": q.category,
                "audio_url": f"/api/interviews/{interview_id}/questions/{q.id}/tts",
            }
            for q in questions
        ],
    )


# =================================================================
# Staff — coach / recruiter / admin
# =================================================================
@router.get("/staff/overview", response_model=OverviewOut)
def overview_stats(db: Session = Depends(get_db), _: CurrentUser = Depends(require_roles(*STAFF_ROLES))):
    total_candidates = db.query(func.count(func.distinct(Interview.candidate_id))).scalar() or 0
    completed_q = db.query(Interview).filter(Interview.status == "completed")
    completed_count = completed_q.count()
    high_score_count = completed_q.filter(Interview.score >= 85).count()
    today_count = (
        db.query(Interview)
        .filter(Interview.status == "scheduled", func.date(Interview.scheduled_at) == func.current_date())
        .count()
    )

    def avg(col):
        val = db.query(func.avg(col)).filter(Interview.status == "completed").scalar()
        return round(val) if val is not None else 0

    hiring_success = round((high_score_count / completed_count) * 100) if completed_count else 0

    return OverviewOut(
        totalCandidates=total_candidates,
        completedCount=completed_count,
        averageScore=avg(Interview.score),
        todayCount=today_count,
        hiringSuccess=hiring_success,
        skills={
            "communication": avg(Interview.skill_communication),
            "technical": avg(Interview.skill_technical),
            "confidence": avg(Interview.skill_confidence),
            "problemSolving": avg(Interview.skill_problem_solving),
        },
    )


@router.get("/staff/candidates/{candidate_id}/interviews", response_model=list[InterviewOut])
def list_candidate_interviews_for_staff(
    candidate_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
):
    """A specific candidate's full interview list, for the coach/recruiter
    "Review" picker — the summary row on the dashboard only exposes their
    *latest* interview, but a coach may want to leave feedback on an
    earlier completed session instead."""
    candidate = db.get(User, candidate_id)
    if candidate is None or candidate.role != "candidate":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")
    return (
        db.query(Interview)
        .filter(Interview.candidate_id == candidate_id)
        .order_by(Interview.created_at.desc())
        .all()
    )


@router.get("/staff/candidates", response_model=list[CandidateSummaryOut])
def list_candidate_summaries(db: Session = Depends(get_db), _: CurrentUser = Depends(require_roles(*STAFF_ROLES))):
    latest_ids = (
        db.query(Interview.candidate_id, func.max(Interview.scheduled_at).label("latest"))
        .group_by(Interview.candidate_id)
        .subquery()
    )
    rows = (
        db.query(User, Interview)
        .join(Interview, Interview.candidate_id == User.id)
        .join(
            latest_ids,
            (Interview.candidate_id == latest_ids.c.candidate_id)
            & (Interview.scheduled_at == latest_ids.c.latest),
        )
        .filter(User.role == "candidate")
        .all()
    )
    return [
        CandidateSummaryOut(
            candidate_id=u.id,
            full_name=u.full_name,
            email=u.email,
            bio=u.bio,
            latest_interview_id=i.id,
            interview_type=i.interview_type,
            score=i.score,
            status=i.status,
            scheduled_at=i.scheduled_at,
        )
        for u, i in rows
    ]


@router.patch("/{interview_id}/review", response_model=InterviewOut)
def review_interview(
    interview_id: int,
    body: ReviewRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
):
    """A coach/recruiter/admin leaves feedback on a completed session.
    This is what the candidate later reads via GET /{id}/feedback."""
    interview = db.get(Interview, interview_id)
    if interview is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Interview not found")

    interview.coach_feedback = body.feedback.strip()
    interview.reviewed_by = user.id
    db.commit()
    db.refresh(interview)

    notify(
        db,
        user_id=interview.candidate_id,
        title="New Feedback Received",
        message=f'{user.full_name} left feedback on your "{interview.interview_type}" interview.',
    )
    return interview
