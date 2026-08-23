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
import json
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import ai_providers, code_judge, recording_store, speech_analysis
from app.config import BASE_DIR, MAX_RECORDING_SIZE_MB
from app.database import get_db
from app.models import Interview, InterviewAnswer, InterviewQuestion, InterviewRecording, User
from app.notify import notify
from app.question_bank import (
    CODING_MARKS,
    MCQ_MARKS,
    VALID_CATEGORIES,
    VALID_DIFFICULTIES,
    generate_assessment,
    generate_questions,
)
from app.schemas import (
    AnswerIn,
    AnswerOut,
    CandidateSummaryOut,
    CommunicationReportOut,
    CommunicationReportRow,
    FeedbackOut,
    GenerateInterviewRequest,
    InterviewOut,
    InterviewWithQuestionsOut,
    OverviewOut,
    QuestionOut,
    RecordingOut,
    ReviewRequest,
    RunCodeRequest,
    RunCodeResult,
    RunCodeTestCaseResult,
    ScheduleInterviewRequest,
    ScoreSheetOut,
    ScoreSheetRow,
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


def _previously_asked_texts(db: Session, candidate_id: int, exclude_interview_id: Optional[int] = None) -> set[str]:
    """Normalized text of every question this candidate has already
    been asked, across their past sessions — passed to
    question_bank.generate_questions() so a new /generate (or
    regenerate) call doesn't hand back the same questions again. This
    is what actually fixes repeats: the curated fallback bank only has
    5 questions per category/difficulty/domain bucket, so without this
    a candidate sees the same set almost immediately whenever no real
    AI provider key is configured (the bank is a last-resort fallback,
    not the primary source)."""
    from app.question_bank import _norm_text  # local import avoids a circular import at module load

    q = (
        db.query(InterviewQuestion.question_text)
        .join(Interview, Interview.id == InterviewQuestion.interview_id)
        .filter(Interview.candidate_id == candidate_id)
    )
    if exclude_interview_id is not None:
        q = q.filter(Interview.id != exclude_interview_id)
    return {_norm_text(text) for (text,) in q.all()}


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
        exclude_texts=_previously_asked_texts(db, user.id),
    )

    interview = Interview(
        candidate_id=user.id,
        session_id=str(uuid.uuid4()),
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
            expected_keywords=", ".join(q.get("keywords") or []) or None,
            question_type=q.get("question_type", "open"),
            options=json.dumps(q["options"]) if q.get("options") else None,
            correct_option=q.get("correct_option"),
            marks=q.get("marks", 1),
            test_cases=json.dumps(q["test_cases"]) if q.get("test_cases") else None,
            starter_code=json.dumps(q["starter_code"]) if q.get("starter_code") else None,
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
        session_id=str(uuid.uuid4()),
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
        session_id=str(uuid.uuid4()),
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
            exclude_texts=_previously_asked_texts(db, user.id, exclude_interview_id=interview.id),
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
                expected_keywords=", ".join(q.get("keywords") or []) or None,
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
# MODULE 4 — live session lifecycle: begin / pause / resume
# (finish, further down, already ends the session)
# =================================================================
@router.patch("/{interview_id}/begin", response_model=InterviewOut)
def begin_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("candidate")),
):
    """Marks the live session as actually underway. Called once the
    candidate has granted camera/microphone access and the proctored
    session shell is shown (see beginProctoredSession() in
    interview-session.js) — distinct from /generate, which merely
    creates the session and its question set ahead of time."""
    interview = _get_own_editable_interview(db, interview_id, user)
    if interview.status not in ("scheduled", "in_progress", "paused"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This interview cannot be started from its current state")

    # Covers a candidate reloading the pre-start page while the session
    # was paused — treat re-granting camera/mic as an implicit resume
    # rather than leaving a stale paused_at behind.
    if interview.status == "paused" and interview.paused_at is not None:
        elapsed = datetime.now(timezone.utc) - interview.paused_at.replace(tzinfo=timezone.utc)
        interview.paused_seconds = (interview.paused_seconds or 0) + max(0, int(elapsed.total_seconds()))
        interview.paused_at = None

    interview.status = "in_progress"
    if interview.started_at is None:
        interview.started_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(interview)
    return interview


@router.patch("/{interview_id}/pause", response_model=InterviewOut)
def pause_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("candidate")),
):
    """Pauses an in-progress session — question/overall timers and
    proctoring warnings stop on the client until /resume is called."""
    interview = _get_own_editable_interview(db, interview_id, user)
    if interview.status != "in_progress":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only an in-progress interview can be paused")

    interview.status = "paused"
    interview.paused_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(interview)
    return interview


@router.patch("/{interview_id}/resume", response_model=InterviewOut)
def resume_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("candidate")),
):
    """Resumes a paused session, accumulating however long it was
    paused into paused_seconds so reporting can reflect true active
    time later if needed."""
    interview = _get_own_editable_interview(db, interview_id, user)
    if interview.status != "paused":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only a paused interview can be resumed")

    if interview.paused_at is not None:
        elapsed = datetime.now(timezone.utc) - interview.paused_at.replace(tzinfo=timezone.utc)
        interview.paused_seconds = (interview.paused_seconds or 0) + max(0, int(elapsed.total_seconds()))
    interview.paused_at = None
    interview.status = "in_progress"
    db.commit()
    db.refresh(interview)
    return interview


# =================================================================
# ENHANCEMENT 3 — live interview session: answers, proctoring
# violations, and real (LLM-scored) session completion
# =================================================================
@router.post("/{interview_id}/questions/{question_id}/run", response_model=RunCodeResult)
def run_code(
    interview_id: int,
    question_id: int,
    body: RunCodeRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("candidate")),
):
    """Coding round 'Run Code' — executes the candidate's program
    against this question's test cases and returns pass/fail + actual
    output per case, WITHOUT touching interview_answers or scoring
    anything. Lets the candidate iterate on their code before saving
    the final answer via POST /{interview_id}/answers (which re-runs
    the same judge for the real, persisted grading). Owner only, and
    only while the session is still editable."""
    interview = _get_own_editable_interview(db, interview_id, user)
    if interview.status == "completed":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This interview is already completed")

    question = db.get(InterviewQuestion, question_id)
    if question is None or question.interview_id != interview.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found in this interview")
    if question.question_type != "coding":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This question is not a coding question")

    language = body.codeLanguage if body.codeLanguage in ("python", "javascript") else "python"
    test_cases = json.loads(question.test_cases) if question.test_cases else []
    if not test_cases:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This question has no test cases to run against")

    results, passed = code_judge.run_test_cases(body.codeAnswer or "", language, test_cases)
    return RunCodeResult(
        question_id=question.id,
        passed_count=passed,
        total_count=len(test_cases),
        results=[RunCodeTestCaseResult(**r) for r in results],
    )


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
    is_new_answer = answer is None
    if answer is None:
        answer = InterviewAnswer(interview_id=interview.id, question_id=body.questionId)
        db.add(answer)

    answer.answer_text = body.answerText or ""
    answer.input_mode = safe_mode
    answer.time_taken_seconds = body.timeTakenSeconds

    # Milestone 3 — Speech Analysis & AI Monitoring: filler-word count,
    # words-per-minute, and grammar spot-check computed here
    # (deterministic, no API call).
    metrics = speech_analysis.analyze_answer(answer.answer_text, answer.time_taken_seconds)
    answer.filler_word_count = metrics["filler_word_count"]
    answer.words_per_minute = metrics["words_per_minute"]
    grammar = speech_analysis.check_grammar(answer.answer_text)
    answer.grammar_issue_count = grammar["issue_count"]
    answer.keyword_match_percentage = speech_analysis.keyword_match_percentage(
        answer.answer_text, question.expected_keywords
    )

    # Emotion + eye-contact are computed client-side (face-api.js);
    # pronunciation confidence is the average Web Speech API result
    # confidence for this answer — trust but clamp, since these ride
    # in on a request body.
    answer.dominant_emotion = (body.dominantEmotion or None)
    if body.eyeContactPercentage is not None:
        answer.eye_contact_percentage = max(0, min(100, body.eyeContactPercentage))
    if body.pronunciationConfidence is not None:
        answer.pronunciation_confidence = max(0, min(100, body.pronunciationConfidence))

    # MCQ / Coding round — deterministic grading, independent of the
    # holistic AI/simulated score. 1 mark for a correct MCQ pick, 0 for
    # a wrong one; coding gets partial credit for marks * (test cases
    # passed / total), scored by actually running the submission.
    if question.question_type == "mcq":
        selected = (body.selectedOption or "").strip().upper() or None
        answer.selected_option = selected
        answer.is_correct = selected is not None and selected == (question.correct_option or "").strip().upper()
        answer.marks_awarded = float(question.marks) if answer.is_correct else 0.0
    elif question.question_type == "coding":
        code = body.codeAnswer or ""
        language = body.codeLanguage if body.codeLanguage in ("python", "javascript") else "python"
        answer.code_answer = code
        answer.code_language = language
        test_cases = json.loads(question.test_cases) if question.test_cases else []
        if code.strip() and test_cases:
            results, passed = code_judge.run_test_cases(code, language, test_cases)
            answer.test_case_results = json.dumps(results)
            answer.marks_awarded = round(float(question.marks) * passed / len(test_cases), 2)
            answer.is_correct = passed == len(test_cases)
        else:
            answer.test_case_results = None
            answer.marks_awarded = 0.0
            answer.is_correct = False

    # questions_attempted counts distinct questions answered at least
    # once — not edits to an already-answered question — so moving
    # back to revise an earlier answer doesn't inflate the count.
    if is_new_answer:
        interview.questions_attempted = (interview.questions_attempted or 0) + 1
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

    # MCQ/coding questions are graded deterministically (see
    # submit_answer) — they don't feed the holistic AI transcript
    # scoring below, only the open-ended ones do.
    open_questions = [q for q in questions if q.question_type == "open"]

    qa_pairs = [
        {
            "question": q.question_text,
            "category": q.category,
            "answer": (answers_by_question.get(q.id).answer_text or "") if q.id in answers_by_question else "",
            "expected_keywords": q.expected_keywords or "",
            "keyword_match": (
                f"{answers_by_question[q.id].keyword_match_percentage}% of expected keywords mentioned"
                if q.id in answers_by_question and answers_by_question[q.id].keyword_match_percentage is not None
                else "no keyword data"
            ),
            "speech_signal": (
                speech_analysis.communication_signal_summary(
                    answers_by_question[q.id].filler_word_count,
                    answers_by_question[q.id].words_per_minute,
                    len((answers_by_question[q.id].answer_text or "").split()),
                    answers_by_question[q.id].grammar_issue_count,
                    answers_by_question[q.id].pronunciation_confidence,
                )
                if q.id in answers_by_question
                else "no answer given"
            ),
        }
        for q in open_questions
    ]

    # Deterministic MCQ/coding marks sheet — a straight sum of points
    # earned vs. points possible, independent of the 0-100 AI score.
    graded_questions = [q for q in questions if q.question_type in ("mcq", "coding")]
    marks_total = sum(float(q.marks) for q in graded_questions)
    marks_awarded = sum(
        float(answers_by_question[q.id].marks_awarded or 0)
        for q in graded_questions
        if q.id in answers_by_question
    )
    interview.marks_awarded = round(marks_awarded, 2)
    interview.marks_total = round(marks_total, 2)

    assessment = None
    if any(p["answer"].strip() for p in qa_pairs):
        try:
            assessment = ai_providers.score_interview_llm(interview.interview_type, qa_pairs)
        except Exception:
            assessment = None
    if assessment is None:
        assessment = generate_assessment()

    # Milestone 3 — nudge the Communication/Confidence sub-scores using
    # the real, computed filler-word and eye-contact signals rather than
    # trusting the AI's guess (or the random simulator) alone. Small,
    # bounded adjustments — this refines the AI/simulator score, it
    # doesn't replace it, since content quality still matters most.
    answered_with_metrics = [a for a in answers if (a.answer_text or "").strip()]
    if answered_with_metrics:
        filler_counts = [a.filler_word_count for a in answered_with_metrics if a.filler_word_count is not None]
        eye_contacts = [a.eye_contact_percentage for a in answered_with_metrics if a.eye_contact_percentage is not None]
        grammar_issues = [a.grammar_issue_count for a in answered_with_metrics if a.grammar_issue_count is not None]
        pronunciation_scores = [
            a.pronunciation_confidence for a in answered_with_metrics if a.pronunciation_confidence is not None
        ]
        keyword_scores = [
            a.keyword_match_percentage for a in answered_with_metrics if a.keyword_match_percentage is not None
        ]
        word_counts = [len((a.answer_text or "").split()) for a in answered_with_metrics]

        comm_adjust = 0
        if filler_counts and sum(word_counts) > 0:
            filler_ratio = sum(filler_counts) / max(sum(word_counts), 1)
            if filler_ratio > 0.08:
                comm_adjust -= 8
            elif filler_ratio < 0.02:
                comm_adjust += 4
        if grammar_issues:
            avg_grammar_issues = sum(grammar_issues) / len(grammar_issues)
            if avg_grammar_issues >= 2:
                comm_adjust -= 4
            elif avg_grammar_issues == 0:
                comm_adjust += 2

        conf_adjust = 0
        if eye_contacts:
            avg_eye_contact = sum(eye_contacts) / len(eye_contacts)
            if avg_eye_contact >= 70:
                conf_adjust += 5
            elif avg_eye_contact < 40:
                conf_adjust -= 5
        if pronunciation_scores:
            avg_pronunciation = sum(pronunciation_scores) / len(pronunciation_scores)
            if avg_pronunciation >= 80:
                conf_adjust += 4
            elif avg_pronunciation < 55:
                conf_adjust -= 4

        # Keyword coverage reflects answer relevance/content, not
        # delivery — nudges Technical, not Communication/Confidence.
        tech_adjust = 0
        if keyword_scores:
            avg_keyword_match = sum(keyword_scores) / len(keyword_scores)
            if avg_keyword_match >= 75:
                tech_adjust += 6
            elif avg_keyword_match < 30:
                tech_adjust -= 6

        assessment["skill_communication"] = max(0, min(100, assessment["skill_communication"] + comm_adjust))
        assessment["skill_confidence"] = max(0, min(100, assessment["skill_confidence"] + conf_adjust))
        assessment["skill_technical"] = max(0, min(100, assessment["skill_technical"] + tech_adjust))

    interview.status = "completed"
    interview.score = assessment["score"]
    interview.skill_communication = assessment["skill_communication"]
    interview.skill_technical = assessment["skill_technical"]
    interview.skill_confidence = assessment["skill_confidence"]
    interview.skill_problem_solving = assessment["skill_problem_solving"]
    interview.ai_feedback = assessment["ai_feedback"]
    interview.completed_at = datetime.now(timezone.utc)

    # Total active session duration: wall-clock start → end, minus any
    # time spent paused. Frozen here (rather than computed on every
    # read) so it stays stable once the session is over. Only
    # meaningful for the live proctored flow (started_at set via
    # /begin) — instant/unstarted sessions leave this as None.
    if interview.started_at is not None:
        started = interview.started_at.replace(tzinfo=timezone.utc)
        elapsed = (interview.completed_at - started).total_seconds()
        interview.duration_seconds = max(0, int(elapsed) - (interview.paused_seconds or 0))

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
# RECORDING — proctored session video+audio capture
#
# The candidate's browser records the same webcam/mic MediaStream
# already used for proctoring (via the MediaRecorder API), and
# uploads the finished blob once, right when the session ends —
# whether that's the candidate clicking Finish, the overall timer
# hitting zero, or the proctoring-violation auto-submit, since all
# three funnel through finishInterview() in interview-session.js.
#
# The file is stored on disk (see app/recording_store.py for why);
# this table/row is the metadata + access-control record.
# =================================================================
ALLOWED_RECORDING_MIME_TYPES = {"video/webm", "video/mp4", "video/ogg"}
MAX_RECORDING_BYTES = MAX_RECORDING_SIZE_MB * 1024 * 1024


@router.post("/{interview_id}/recording", response_model=RecordingOut, status_code=201)
async def upload_recording(
    interview_id: int,
    file: UploadFile = File(...),
    startedAt: Optional[datetime] = Form(None),
    endedAt: Optional[datetime] = Form(None),
    durationSeconds: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("candidate")),
):
    """Uploads the finished MediaRecorder blob for a live proctored
    session. Only the candidate who owns the session can upload to
    it — same ownership check as every other write on an interview —
    so nobody can attach (or overwrite) a recording on a session that
    isn't theirs. A second upload for the same interview replaces the
    first (there's only ever one recording per session)."""
    interview = _get_own_editable_interview(db, interview_id, user)

    mime_type = file.content_type if file.content_type in ALLOWED_RECORDING_MIME_TYPES else "video/webm"
    dest_path = recording_store.recording_path(interview.id, mime_type)
    recording_store.delete_existing_recording(interview.id)

    size_bytes = 0
    too_large = False
    with open(dest_path, "wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size_bytes += len(chunk)
            if size_bytes > MAX_RECORDING_BYTES:
                too_large = True
                break
            out.write(chunk)
    await file.close()

    if too_large:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Recording exceeds the {MAX_RECORDING_SIZE_MB}MB limit.",
        )
    if size_bytes == 0:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Uploaded recording was empty.")

    relative_path = str(dest_path.relative_to(BASE_DIR))

    # Pull the audio track out into its own file so it can be served
    # (or later transcribed) without demuxing the combined video. Best
    # effort only — a missing/failed extraction (e.g. ffmpeg not on
    # PATH) must never fail the video upload that already succeeded.
    recording_store.delete_existing_audio(interview.id)
    audio_dest = recording_store.extract_audio_track(dest_path, interview.id, mime_type)
    audio_relative_path = str(audio_dest.relative_to(BASE_DIR)) if audio_dest else None
    audio_mime = recording_store.audio_media_type_for(audio_dest) if audio_dest else None

    recording = db.query(InterviewRecording).filter(InterviewRecording.interview_id == interview.id).first()
    if recording is None:
        recording = InterviewRecording(interview_id=interview.id)
        db.add(recording)

    recording.file_path = relative_path
    recording.mime_type = mime_type
    recording.size_bytes = size_bytes
    recording.duration_seconds = durationSeconds
    recording.started_at = startedAt
    recording.ended_at = endedAt
    recording.audio_file_path = audio_relative_path
    recording.audio_mime_type = audio_mime
    db.commit()
    db.refresh(recording)
    return recording


@router.get("/{interview_id}/recording/meta", response_model=RecordingOut)
def recording_meta(
    interview_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Lightweight existence/metadata check — dashboards call this to
    decide whether to render a 'View Recording' button, without
    pulling the video itself. Same owner-or-staff access rule as
    streaming the actual file below."""
    interview = _get_owned_or_staff_interview(db, interview_id, user)
    recording = db.query(InterviewRecording).filter(InterviewRecording.interview_id == interview.id).first()
    if recording is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No recording for this interview")
    return recording


@router.get("/{interview_id}/recording")
def stream_recording(
    interview_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Streams the session recording. Access is restricted to the
    owning candidate or coach/recruiter/admin staff — the same rule
    every other per-interview read in this file uses — so a
    candidate's proctored video is never reachable by anyone outside
    that circle, including other candidates."""
    interview = _get_owned_or_staff_interview(db, interview_id, user)
    recording = db.query(InterviewRecording).filter(InterviewRecording.interview_id == interview.id).first()
    if recording is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No recording for this interview")

    full_path = BASE_DIR / recording.file_path
    if not full_path.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recording file is missing from storage")

    return FileResponse(
        path=str(full_path),
        media_type=recording.mime_type or recording_store.media_type_for(full_path),
        filename=f"interview_{interview.id}_recording{full_path.suffix}",
    )


@router.get("/{interview_id}/recording/audio")
def stream_recording_audio(
    interview_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Streams the audio-only sidecar extracted from the session
    recording, if one exists (requires ffmpeg on the server — see
    recording_store.extract_audio_track). Same owner-or-staff access
    rule as the video stream above."""
    interview = _get_owned_or_staff_interview(db, interview_id, user)
    recording = db.query(InterviewRecording).filter(InterviewRecording.interview_id == interview.id).first()
    if recording is None or not recording.audio_file_path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No audio track available for this interview")

    full_path = BASE_DIR / recording.audio_file_path
    if not full_path.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Audio file is missing from storage")

    return FileResponse(
        path=str(full_path),
        media_type=recording.audio_mime_type or recording_store.audio_media_type_for(full_path),
        filename=f"interview_{interview.id}_audio{full_path.suffix}",
    )


# =================================================================
# MCQ + Coding round — deterministic marks sheet
# =================================================================
@router.get("/{interview_id}/scoresheet", response_model=ScoreSheetOut)
def get_scoresheet(interview_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    """Per-question marks breakdown for the MCQ (1 mark each) + coding
    (10 marks, partial credit per test case) round — the deterministic
    sheet, separate from the holistic 0-100 AI score. Owner or staff
    only; correct_option is only revealed here (post-submission), never
    on the question payload itself."""
    interview = _get_owned_or_staff_interview(db, interview_id, user)

    graded_questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.interview_id == interview.id, InterviewQuestion.question_type.in_(("mcq", "coding")))
        .order_by(InterviewQuestion.sequence_no.asc())
        .all()
    )
    answers_by_question = {
        a.question_id: a
        for a in db.query(InterviewAnswer).filter(InterviewAnswer.interview_id == interview.id).all()
    }

    rows: list[ScoreSheetRow] = []
    for q in graded_questions:
        a = answers_by_question.get(q.id)
        if q.question_type == "mcq":
            rows.append(
                ScoreSheetRow(
                    question_id=q.id,
                    sequence_no=q.sequence_no,
                    question_type="mcq",
                    question_text=q.question_text,
                    marks=float(q.marks),
                    marks_awarded=float(a.marks_awarded) if a and a.marks_awarded is not None else 0.0,
                    is_correct=a.is_correct if a else False,
                    selected_option=a.selected_option if a else None,
                    correct_option=q.correct_option,
                )
            )
        else:  # coding
            test_cases = json.loads(q.test_cases) if q.test_cases else []
            results = json.loads(a.test_case_results) if a and a.test_case_results else []
            rows.append(
                ScoreSheetRow(
                    question_id=q.id,
                    sequence_no=q.sequence_no,
                    question_type="coding",
                    question_text=q.question_text,
                    marks=float(q.marks),
                    marks_awarded=float(a.marks_awarded) if a and a.marks_awarded is not None else 0.0,
                    test_cases_passed=sum(1 for r in results if r.get("passed")),
                    test_cases_total=len(test_cases),
                )
            )

    return ScoreSheetOut(
        interview_id=interview.id,
        marks_awarded=float(interview.marks_awarded or 0),
        marks_total=float(interview.marks_total or 0),
        rows=rows,
    )


# =================================================================
# Module 5 & 6 — Communication & Confidence report
# =================================================================
@router.get("/{interview_id}/communication-report", response_model=CommunicationReportOut)
def get_communication_report(interview_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    """Aggregates every open-ended answer's Module 5 (speech/grammar/
    pace/keyword) and Module 6 (emotion/eye-contact/pronunciation)
    signals into one report — the real, computed counterpart to the
    project spec's Communication Score / Confidence Score parameters.
    Owner (candidate) or staff only, same access rule as the scoresheet."""
    interview = _get_owned_or_staff_interview(db, interview_id, user)

    open_questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.interview_id == interview.id, InterviewQuestion.question_type == "open")
        .order_by(InterviewQuestion.sequence_no.asc())
        .all()
    )
    answers_by_question = {
        a.question_id: a
        for a in db.query(InterviewAnswer).filter(InterviewAnswer.interview_id == interview.id).all()
    }

    rows: list[CommunicationReportRow] = []
    answered = [(q, answers_by_question[q.id]) for q in open_questions if q.id in answers_by_question and (answers_by_question[q.id].answer_text or "").strip()]

    for q, a in answered:
        rows.append(
            CommunicationReportRow(
                question_id=q.id,
                sequence_no=q.sequence_no,
                category=q.category,
                question_text=q.question_text,
                word_count=len((a.answer_text or "").split()),
                filler_word_count=a.filler_word_count,
                words_per_minute=a.words_per_minute,
                grammar_issue_count=a.grammar_issue_count,
                keyword_match_percentage=a.keyword_match_percentage,
                dominant_emotion=a.dominant_emotion,
                eye_contact_percentage=a.eye_contact_percentage,
                pronunciation_confidence=a.pronunciation_confidence,
                input_mode=a.input_mode,
            )
        )

    def _avg(values: list) -> Optional[float]:
        vals = [v for v in values if v is not None]
        return round(sum(vals) / len(vals), 1) if vals else None

    word_counts = [r.word_count for r in rows]
    filler_counts = [r.filler_word_count for r in rows if r.filler_word_count is not None]
    total_filler = sum(filler_counts) if filler_counts else 0
    total_words = sum(word_counts) if word_counts else 0
    filler_ratio = round(total_filler / total_words, 3) if total_words > 0 else None

    avg_wpm = _avg([r.words_per_minute for r in rows])
    avg_grammar = _avg([r.grammar_issue_count for r in rows])
    avg_keyword = _avg([r.keyword_match_percentage for r in rows])
    avg_completeness = _avg([r.word_count for r in rows])
    avg_eye_contact = _avg([r.eye_contact_percentage for r in rows])
    avg_pronunciation = _avg([r.pronunciation_confidence for r in rows])
    voice_count = sum(1 for r in rows if r.input_mode == "voice")

    emotion_tally: dict = {}
    for r in rows:
        if r.dominant_emotion:
            emotion_tally[r.dominant_emotion] = emotion_tally.get(r.dominant_emotion, 0) + 1
    dominant_overall = max(emotion_tally, key=emotion_tally.get) if emotion_tally else None

    pace_label = None
    if avg_wpm is not None:
        pace_label = "slow" if avg_wpm < 90 else "fast" if avg_wpm > 180 else "good"

    filler_label = None
    if filler_ratio is not None:
        filler_label = "heavy" if filler_ratio > 0.08 else "low" if filler_ratio < 0.02 else "moderate"

    confidence_label = None
    if avg_eye_contact is not None:
        confidence_label = "high" if avg_eye_contact >= 70 else "low" if avg_eye_contact < 40 else "moderate"

    return CommunicationReportOut(
        interview_id=interview.id,
        questions_analyzed=len(rows),
        avg_words_per_minute=round(avg_wpm) if avg_wpm is not None else None,
        total_filler_words=total_filler,
        filler_word_ratio=filler_ratio,
        avg_grammar_issues=avg_grammar,
        avg_keyword_match_percentage=round(avg_keyword) if avg_keyword is not None else None,
        avg_response_completeness=round(avg_completeness) if avg_completeness is not None else None,
        avg_eye_contact_percentage=round(avg_eye_contact) if avg_eye_contact is not None else None,
        avg_pronunciation_confidence=round(avg_pronunciation) if avg_pronunciation is not None else None,
        dominant_emotion_overall=dominant_overall,
        emotion_breakdown=emotion_tally,
        voice_answer_ratio=round(voice_count / len(rows), 2) if rows else None,
        proctoring_violations=interview.proctoring_violations or 0,
        pace_label=pace_label,
        filler_label=filler_label,
        confidence_label=confidence_label,
        rows=rows,
    )


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
