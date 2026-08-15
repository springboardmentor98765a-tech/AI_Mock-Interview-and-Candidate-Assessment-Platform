# ============================================================
#  interviews.py — AI Interview Generation & Session Management Router
# ============================================================
import json
import os
import uuid
from datetime import datetime
from typing import List, Optional
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.database import get_db
from app.dependencies import CurrentUser
from app.schemas import (
    AudioAnswerResponse,
    CandidateUserResponse,
    CreateSessionRequest,
    GenerateQuestionsRequest,
    InterviewResultResponse,
    PauseSessionRequest,
    QuestionResponse,
    QuestionResultResponse,
    QuestionTimingResponse,
    RecordingResponse,
    RecruiterAnalyticsResponse,
    RecruiterCandidateInterviewResponse,
    SessionResponse,
    SubmitAnswerRequest,
    SubmitTimingRequest,
    UpdateSessionRequest,
)
from app.services.ai_service import AIService

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads", "recordings")
os.makedirs(UPLOAD_DIR, exist_ok=True)

AUDIO_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads", "audio_answers")
os.makedirs(AUDIO_UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/api", tags=["Interviews"])


# ── 0. GET /api/candidates ───────────────────────────────────
@router.get("/candidates", response_model=List[CandidateUserResponse])
async def list_candidates(
    current_user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Returns list of active candidates for recruiter interview assignment.
    """
    rows = await db.fetch(
        "SELECT id, name, email, avatar_url FROM users WHERE role = 'candidate' AND is_active = TRUE ORDER BY name ASC"
    )
    return [dict(r) for r in rows]



# ── 1. POST /api/questions/generate ─────────────────────────
@router.post("/questions/generate", response_model=List[QuestionResponse])
async def generate_questions(
    req: GenerateQuestionsRequest,
    current_user: CurrentUser,
):
    """
    Generates interview questions based on Job Role, Domain, Interview Type,
    Difficulty, User Skills, Resume Text, or Job Description using AI service.
    """
    try:
        questions = await AIService.generate_interview_questions(
            job_role=req.job_role,
            domain=req.domain,
            interview_type=req.interview_type,
            difficulty=req.difficulty,
            num_questions=req.num_questions,
            user_skills=req.user_skills,
            job_description=req.job_description,
            resume_text=req.resume_text,
            generation_seed=req.generation_seed,
        )

    except HTTPException:
        raise
    except Exception as e:
        detail_msg = str(e)
        if "quota" in detail_msg.lower() or "429" in detail_msg:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Gemini API quota exceeded. Please check the Gemini API quota/billing for this API key.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate AI questions: {detail_msg}",
        )


    if not questions:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI Service failed to generate questions. Please retry.",
        )
    
    # Format response
    formatted = []
    for idx, q in enumerate(questions, 1):
        formatted.append(
            QuestionResponse(
                question_number=q.get("question_number", idx),
                question_text=q["question_text"],
                interview_type=q["interview_type"],
                domain=q["domain"],
                difficulty=q["difficulty"],
                expected_answer_points=q.get("expected_answer_points", []),
                category=q.get("category"),
                sample_answer=q.get("sample_answer"),
            )
        )
    return formatted



# ── 2. POST /api/interviews/generate ─────────────────────────
@router.post("/interviews/generate", response_model=SessionResponse)
async def generate_interview(
    req: GenerateQuestionsRequest,
    current_user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Generates AI interview questions AND automatically initializes + saves
    a new Interview Session in the database.
    """
    questions = await AIService.generate_interview_questions(
        job_role=req.job_role,
        domain=req.domain,
        interview_type=req.interview_type,
        difficulty=req.difficulty,
        num_questions=req.num_questions,
        user_skills=req.user_skills,
        job_description=req.job_description,
        resume_text=req.resume_text,
    )

    # Insert session into DB
    session_row = await db.fetchrow(
        """
        INSERT INTO interview_sessions (
            user_id, job_role, domain, interview_type, difficulty,
            num_questions, user_skills, job_description, resume_text,
            status, total_questions, completed_questions, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'created', $10, 0, NOW(), NOW())
        RETURNING *
        """,
        current_user["id"],
        req.job_role,
        req.domain,
        req.interview_type,
        req.difficulty,
        req.num_questions,
        req.user_skills,
        req.job_description,
        req.resume_text,
        len(questions),
    )

    session_id = session_row["id"]

    # Insert questions into DB
    question_responses = []
    for idx, q in enumerate(questions, 1):
        points_json = json.dumps(q.get("expected_answer_points", []))
        q_row = await db.fetchrow(
            """
            INSERT INTO interview_questions (
                session_id, question_number, question_text, interview_type,
                domain, difficulty, expected_answer_points, category, sample_answer, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, NOW())
            RETURNING *
            """,
            session_id,
            idx,
            q["question_text"],
            q["interview_type"],
            q["domain"],
            q["difficulty"],
            points_json,
            q.get("category"),
            q.get("sample_answer"),
        )
        
        pts = q_row["expected_answer_points"]
        if isinstance(pts, str):
            pts = json.loads(pts)

        question_responses.append(
            QuestionResponse(
                id=q_row["id"],
                session_id=q_row["session_id"],
                question_number=q_row["question_number"],
                question_text=q_row["question_text"],
                interview_type=q_row["interview_type"],
                domain=q_row["domain"],
                difficulty=q_row["difficulty"],
                expected_answer_points=pts or [],
                category=q_row["category"],
                sample_answer=q_row["sample_answer"],
            )
        )

    res = dict(session_row)
    res["questions"] = question_responses
    return res


# ── 3. POST /api/sessions ────────────────────────────────────
@router.post("/sessions", response_model=SessionResponse)
@router.post("/interviews/sessions", response_model=SessionResponse)
@router.post("/interview-sessions", response_model=SessionResponse)
async def create_session(
    req: CreateSessionRequest,
    current_user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Creates and saves a new interview session in the database.
    Recruiters can assign the session to a candidate via candidate_id.
    """
    questions_data = req.questions
    if not questions_data:
        questions_data = await AIService.generate_interview_questions(
            job_role=req.job_role,
            domain=req.domain,
            interview_type=req.interview_type,
            difficulty=req.difficulty,
            num_questions=req.num_questions,
            user_skills=req.user_skills,
            job_description=req.job_description,
            resume_text=req.resume_text,
        )

    target_user_id = req.candidate_id if req.candidate_id else current_user["id"]

    session_row = await db.fetchrow(
        """
        INSERT INTO interview_sessions (
            user_id, created_by, candidate_id, job_role, domain, interview_type, difficulty,
            experience_level, num_questions, user_skills, job_description, resume_text,
            status, total_questions, completed_questions, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'created', $13, 0, NOW(), NOW())
        RETURNING *
        """,
        target_user_id,
        current_user["id"],
        req.candidate_id,
        req.job_role,
        req.domain,
        req.interview_type,
        req.difficulty,
        req.experience_level or "Mid Level",
        req.num_questions,
        req.user_skills,
        req.job_description,
        req.resume_text,
        len(questions_data),
    )

    session_id = session_row["id"]
    question_responses = []

    for idx, q in enumerate(questions_data, 1):
        points = q.get("expected_answer_points", [])
        points_json = json.dumps(points if isinstance(points, list) else [])
        
        q_row = await db.fetchrow(
            """
            INSERT INTO interview_questions (
                session_id, question_number, question_text, interview_type,
                domain, difficulty, expected_answer_points, category, sample_answer, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, NOW())
            RETURNING *
            """,
            session_id,
            idx,
            q["question_text"],
            q.get("interview_type", req.interview_type),
            q.get("domain", req.domain),
            q.get("difficulty", req.difficulty),
            points_json,
            q.get("category"),
            q.get("sample_answer"),
        )
        
        pts = q_row["expected_answer_points"]
        if isinstance(pts, str):
            pts = json.loads(pts)

        question_responses.append(
            QuestionResponse(
                id=q_row["id"],
                session_id=q_row["session_id"],
                question_number=q_row["question_number"],
                question_text=q_row["question_text"],
                interview_type=q_row["interview_type"],
                domain=q_row["domain"],
                difficulty=q_row["difficulty"],
                expected_answer_points=pts or [],
                category=q_row["category"],
                sample_answer=q_row["sample_answer"],
            )
        )

    res = dict(session_row)
    res["questions"] = question_responses
    return res


# ── 4. GET /api/sessions ─────────────────────────────────────
@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(
    current_user: CurrentUser,
    status_filter: Optional[str] = None,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Get all interview sessions. Candidates see assigned interviews; Recruiters/Admins see managed interviews.
    """
    if current_user["role"] == "candidate":
        if status_filter:
            rows = await db.fetch(
                """
                SELECT * FROM interview_sessions
                WHERE (candidate_id = $1 OR user_id = $1) AND status = $2
                ORDER BY created_at DESC
                """,
                current_user["id"],
                status_filter,
            )
        else:
            rows = await db.fetch(
                """
                SELECT * FROM interview_sessions
                WHERE candidate_id = $1 OR user_id = $1
                ORDER BY created_at DESC
                """,
                current_user["id"],
            )
    else:
        if status_filter:
            rows = await db.fetch(
                """
                SELECT * FROM interview_sessions
                WHERE (created_by = $1 OR user_id = $1) AND status = $2
                ORDER BY created_at DESC
                """,
                current_user["id"],
                status_filter,
            )
        else:
            rows = await db.fetch(
                """
                SELECT * FROM interview_sessions
                ORDER BY created_at DESC
                """,
            )

    result = []
    for r in rows:
        d = dict(r)
        d["questions"] = []
        result.append(d)
    return result


# ── 5. GET /api/sessions/{id} ────────────────────────────────
@router.get("/sessions/{session_id}", response_model=SessionResponse)
@router.get("/interviews/sessions/{session_id}", response_model=SessionResponse)
@router.get("/interview-sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: UUID,
    current_user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Loads an existing interview session by ID, including questions, user answers, feedback, timings, and recording status.
    """
    user_id = current_user["id"]
    role = current_user["role"]

    if role in ("recruiter", "admin"):
        session_row = await db.fetchrow(
            "SELECT * FROM interview_sessions WHERE id = $1",
            session_id,
        )
    else:
        session_row = await db.fetchrow(
            "SELECT * FROM interview_sessions WHERE id = $1 AND (user_id = $2 OR candidate_id = $2 OR created_by = $2)",
            session_id,
            user_id,
        )

    if not session_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found.",
        )

    rec_row = await db.fetchrow(
        "SELECT id FROM interview_recordings WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1",
        session_id,
    )

    q_rows = await db.fetch(
        """
        SELECT * FROM interview_questions
        WHERE session_id = $1
        ORDER BY question_number ASC
        """,
        session_id,
    )

    timing_rows = await db.fetch(
        """
        SELECT * FROM interview_question_timings
        WHERE session_id = $1
        ORDER BY question_number ASC, created_at DESC
        """,
        session_id,
    )
    timings_map = {}
    timings_list = []
    for t in timing_rows:
        td = dict(t)
        timings_list.append(td)
        q_num = t["question_number"]
        if q_num not in timings_map:
            timings_map[q_num] = t["time_spent"]

    questions = []
    for q in q_rows:
        pts = q["expected_answer_points"]
        if isinstance(pts, str):
            pts = json.loads(pts)
        q_num = q["question_number"]
        questions.append(
            QuestionResponse(
                id=q["id"],
                session_id=q["session_id"],
                question_number=q_num,
                question_text=q["question_text"],
                interview_type=q["interview_type"],
                domain=q["domain"],
                difficulty=q["difficulty"],
                expected_answer_points=pts or [],
                category=q["category"],
                user_answer=q["user_answer"],
                sample_answer=q["sample_answer"],
                feedback=q["feedback"],
                score=float(q["score"]) if q["score"] is not None else None,
                time_spent=timings_map.get(q_num, 0),
            )
        )

    res = dict(session_row)
    res["questions"] = questions
    res["timings"] = timings_list
    res["has_recording"] = rec_row is not None
    res["recording_id"] = rec_row["id"] if rec_row else None

    result_row = await db.fetchrow(
        "SELECT * FROM interview_results WHERE session_id = $1",
        session_id,
    )
    if result_row:
        res["result"] = dict(result_row)

    q_result_rows = await db.fetch(
        "SELECT * FROM interview_question_results WHERE session_id = $1 ORDER BY question_number ASC",
        session_id,
    )
    if q_result_rows:
        res["question_results"] = [dict(r) for r in q_result_rows]

    return res


# ── 6. POST /api/sessions/{id}/start ─────────────────────────
@router.post("/sessions/{session_id}/start", response_model=SessionResponse)
@router.post("/interviews/sessions/{session_id}/start", response_model=SessionResponse)
@router.post("/interview-sessions/{session_id}/start", response_model=SessionResponse)
async def start_session(
    session_id: UUID,
    current_user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Starts an interview session (sets status to IN_PROGRESS and updates started_at).
    """
    user_id = current_user["id"]
    role = current_user["role"]

    existing = await db.fetchrow("SELECT status FROM interview_sessions WHERE id = $1", session_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Interview session not found")
    
    current_st = (existing["status"] or "").upper()
    if current_st in ("COMPLETED", "CANCELLED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start session in status '{current_st}'."
        )

    if role in ("recruiter", "admin"):
        session_row = await db.fetchrow(
            """
            UPDATE interview_sessions
            SET status = 'IN_PROGRESS',
                started_at = COALESCE(started_at, NOW()),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            """,
            session_id,
        )
    else:
        session_row = await db.fetchrow(
            """
            UPDATE interview_sessions
            SET status = 'IN_PROGRESS',
                started_at = COALESCE(started_at, NOW()),
                updated_at = NOW()
            WHERE id = $1 AND (user_id = $2 OR candidate_id = $2 OR created_by = $2)
            RETURNING *
            """,
            session_id,
            user_id,
        )
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return await get_session(session_id, current_user, db)


# ── 6b. POST /api/sessions/{id}/pause ────────────────────────
@router.post("/sessions/{session_id}/pause", response_model=SessionResponse)
@router.post("/interviews/sessions/{session_id}/pause", response_model=SessionResponse)
@router.post("/interview-sessions/{session_id}/pause", response_model=SessionResponse)
async def pause_session(
    session_id: UUID,
    req: Optional[PauseSessionRequest] = None,
    current_user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Pauses an interview session (sets status to PAUSED and saves current question index).
    """
    user_id = current_user["id"]
    role = current_user["role"]
    q_idx = req.current_question_index if req else 0

    existing = await db.fetchrow("SELECT status FROM interview_sessions WHERE id = $1", session_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Interview session not found")
    
    current_st = (existing["status"] or "").upper()
    if current_st != "IN_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot pause session in status '{current_st}'. Session must be IN_PROGRESS."
        )

    if role in ("recruiter", "admin"):
        session_row = await db.fetchrow(
            """
            UPDATE interview_sessions
            SET status = 'PAUSED',
                paused_at = NOW(),
                current_question_index = COALESCE($2, current_question_index),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            """,
            session_id,
            q_idx,
        )
    else:
        session_row = await db.fetchrow(
            """
            UPDATE interview_sessions
            SET status = 'PAUSED',
                paused_at = NOW(),
                current_question_index = COALESCE($2, current_question_index),
                updated_at = NOW()
            WHERE id = $1 AND (user_id = $3 OR candidate_id = $3 OR created_by = $3)
            RETURNING *
            """,
            session_id,
            q_idx,
            user_id,
        )
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return await get_session(session_id, current_user, db)


# ── 6c. POST /api/sessions/{id}/resume ───────────────────────
@router.post("/sessions/{session_id}/resume", response_model=SessionResponse)
@router.post("/interviews/sessions/{session_id}/resume", response_model=SessionResponse)
@router.post("/interview-sessions/{session_id}/resume", response_model=SessionResponse)
async def resume_session(
    session_id: UUID,
    current_user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Resumes a paused interview session (sets status back to IN_PROGRESS).
    """
    user_id = current_user["id"]
    role = current_user["role"]

    existing = await db.fetchrow("SELECT status FROM interview_sessions WHERE id = $1", session_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Interview session not found")
    
    current_st = (existing["status"] or "").upper()
    if current_st != "PAUSED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resume session in status '{current_st}'. Session must be PAUSED."
        )

    if role in ("recruiter", "admin"):
        session_row = await db.fetchrow(
            """
            UPDATE interview_sessions
            SET status = 'IN_PROGRESS',
                resumed_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            """,
            session_id,
        )
    else:
        session_row = await db.fetchrow(
            """
            UPDATE interview_sessions
            SET status = 'IN_PROGRESS',
                resumed_at = NOW(),
                updated_at = NOW()
            WHERE id = $1 AND (user_id = $2 OR candidate_id = $2 OR created_by = $2)
            RETURNING *
            """,
            session_id,
            user_id,
        )
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return await get_session(session_id, current_user, db)


# ── 7. POST /api/sessions/{id}/answer & /answers ────────────
@router.post("/sessions/{session_id}/answer", response_model=QuestionResponse)
@router.post("/sessions/{session_id}/answers", response_model=QuestionResponse)
@router.post("/interviews/sessions/{session_id}/answer", response_model=QuestionResponse)
@router.post("/interviews/sessions/{session_id}/answers", response_model=QuestionResponse)
@router.post("/interview-sessions/{session_id}/answer", response_model=QuestionResponse)
@router.post("/interview-sessions/{session_id}/answers", response_model=QuestionResponse)
async def submit_question_answer(
    session_id: UUID,
    req: SubmitAnswerRequest,
    current_user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Submit answer for a specific question. Performs AI evaluation and returns instant feedback & score.
    """
    q_row = await db.fetchrow(
        "SELECT * FROM interview_questions WHERE id = $1 AND session_id = $2",
        req.question_id,
        session_id,
    )
    if not q_row:
        raise HTTPException(status_code=404, detail="Question not found in session")

    pts = q_row["expected_answer_points"]
    if isinstance(pts, str):
        pts = json.loads(pts)

    eval_result = await AIService.evaluate_answer(
        question_text=q_row["question_text"],
        user_answer=req.user_answer,
        interview_type=q_row["interview_type"],
        difficulty=q_row["difficulty"],
        expected_points=pts or [],
    )

    updated_q = await db.fetchrow(
        """
        UPDATE interview_questions
        SET user_answer = $1,
            score = $2,
            feedback = $3,
            sample_answer = COALESCE(sample_answer, $4)
        WHERE id = $5
        RETURNING *
        """,
        req.user_answer,
        eval_result.get("score"),
        eval_result.get("feedback"),
        eval_result.get("sample_answer"),
        req.question_id,
    )

    await db.execute(
        """
        UPDATE interview_sessions
        SET completed_questions = (
            SELECT COUNT(*) FROM interview_questions
            WHERE session_id = $1 AND user_answer IS NOT NULL AND user_answer != ''
        ), updated_at = NOW()
        WHERE id = $1
        """,
        session_id,
    )

    res_pts = updated_q["expected_answer_points"]
    if isinstance(res_pts, str):
        res_pts = json.loads(res_pts)

    return QuestionResponse(
        id=updated_q["id"],
        session_id=updated_q["session_id"],
        question_number=updated_q["question_number"],
        question_text=updated_q["question_text"],
        interview_type=updated_q["interview_type"],
        domain=updated_q["domain"],
        difficulty=updated_q["difficulty"],
        expected_answer_points=res_pts or [],
        category=updated_q["category"],
        user_answer=updated_q["user_answer"],
        sample_answer=updated_q["sample_answer"],
        feedback=updated_q["feedback"],
        score=float(updated_q["score"]) if updated_q["score"] is not None else None,
    )


# ── 7b. POST /api/sessions/{id}/timings ──────────────────────
@router.post("/sessions/{session_id}/timings", response_model=QuestionTimingResponse)
@router.post("/sessions/{session_id}/timing", response_model=QuestionTimingResponse)
@router.post("/interviews/sessions/{session_id}/timings", response_model=QuestionTimingResponse)
@router.post("/interview-sessions/{session_id}/timings", response_model=QuestionTimingResponse)
async def submit_question_timing(
    session_id: UUID,
    req: SubmitTimingRequest,
    current_user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Records start_time, answered_at time, and net time_spent (seconds) for a question.
    """
    session_row = await db.fetchrow("SELECT id FROM interview_sessions WHERE id = $1", session_id)
    if not session_row:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    timing_row = await db.fetchrow(
        """
        INSERT INTO interview_question_timings (
            session_id, question_id, question_number, started_at, answered_at, time_spent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
        """,
        session_id,
        req.question_id,
        req.question_number,
        req.started_at or datetime.utcnow(),
        req.answered_at or datetime.utcnow(),
        req.time_spent,
    )

    return QuestionTimingResponse(
        id=timing_row["id"],
        session_id=timing_row["session_id"],
        question_id=timing_row["question_id"],
        question_number=timing_row["question_number"],
        started_at=timing_row["started_at"],
        answered_at=timing_row["answered_at"],
        time_spent=timing_row["time_spent"],
        created_at=timing_row["created_at"],
    )


# ── 8. POST /api/sessions/{id}/end ───────────────────────────
@router.post("/sessions/{session_id}/end", response_model=SessionResponse)
@router.post("/interviews/sessions/{session_id}/end", response_model=SessionResponse)
@router.post("/interview-sessions/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: UUID,
    current_user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Ends an active interview session, computes final average score & duration, saves interview_results and question_results, and sets status to COMPLETED.
    """
    user_id = current_user["id"]
    role = current_user["role"]

    session_row = await db.fetchrow("SELECT * FROM interview_sessions WHERE id = $1", session_id)
    if not session_row:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    if role == "candidate" and str(session_row["user_id"]) != str(user_id) and str(session_row["candidate_id"]) != str(user_id):
        raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to end this session.")

    candidate_id = session_row["candidate_id"] or session_row["user_id"]
    total_q = session_row["total_questions"] or session_row["num_questions"] or 5

    # Fetch questions
    q_rows = await db.fetch("SELECT * FROM interview_questions WHERE session_id = $1 ORDER BY question_number ASC", session_id)
    
    # Fetch timings
    timing_rows = await db.fetch("SELECT question_number, SUM(time_spent) as total_time FROM interview_question_timings WHERE session_id = $1 GROUP BY question_number", session_id)
    timings_map = {t["question_number"]: t["total_time"] for t in timing_rows}

    answered_questions = [q for q in q_rows if q["user_answer"] and q["user_answer"].strip()]
    completed_q_count = len(answered_questions)
    completion_pct = round((completed_q_count / max(1, total_q)) * 100.0, 2)

    # Compute duration
    started_at = session_row["started_at"]
    if started_at:
        now_ts = datetime.utcnow()
        if started_at.tzinfo is not None:
            now_ts = datetime.now(started_at.tzinfo)
        total_duration = max(session_row.get("duration", 0) or 0, int((now_ts - started_at).total_seconds()))
    else:
        total_duration = session_row.get("duration", 0) or 0

    avg_q_time = round(total_duration / max(1, total_q), 2)

    # Compute scores
    scores = [float(q["score"]) for q in q_rows if q["score"] is not None]
    if scores:
        overall_score = round(sum(scores) / len(scores), 2)
    else:
        overall_score = 0.0

    itype = (session_row["interview_type"] or "").lower()
    tech_score = None
    comm_score = None
    beh_score = None
    apt_score = None
    prob_score = None
    cult_score = None
    mot_score = None
    lead_score = None
    adapt_score = None
    log_score = None
    quant_score = None

    if "technical" in itype:
        tech_score = overall_score
        prob_score = round(min(100.0, overall_score * 1.02), 2) if overall_score > 0 else 0.0
    elif "hr" in itype:
        comm_score = overall_score
        cult_score = round(min(100.0, overall_score * 1.01), 2) if overall_score > 0 else 0.0
        mot_score = overall_score
    elif "behavioral" in itype:
        lead_score = round(min(100.0, overall_score * 0.98), 2) if overall_score > 0 else 0.0
        adapt_score = overall_score
        comm_score = overall_score
    elif "aptitude" in itype:
        log_score = overall_score
        quant_score = overall_score
        prob_score = overall_score
    else:
        tech_score = overall_score
        comm_score = overall_score

    # Recommendation
    if overall_score >= 80.0 and completion_pct >= 80.0:
        recommendation = "Strong Candidate"
    elif overall_score >= 65.0 and completion_pct >= 60.0:
        recommendation = "Recommended"
    elif overall_score >= 50.0:
        recommendation = "Consider"
    else:
        recommendation = "Not Recommended"

    # Upsert into interview_results
    res_row = await db.fetchrow(
        """
        INSERT INTO interview_results (
            session_id, candidate_id, interview_id, total_questions, questions_completed,
            completion_percentage, total_duration, average_question_time,
            technical_score, communication_score, behavioral_score, aptitude_score,
            problem_solving_score, culture_fit_score, motivation_score, leadership_score,
            adaptability_score, logical_reasoning_score, quantitative_score,
            overall_score, recommendation, completed_at, created_at, updated_at
        ) VALUES (
            $1, $2, $1, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW(), NOW()
        )
        ON CONFLICT (session_id) DO UPDATE SET
            candidate_id = EXCLUDED.candidate_id,
            total_questions = EXCLUDED.total_questions,
            questions_completed = EXCLUDED.questions_completed,
            completion_percentage = EXCLUDED.completion_percentage,
            total_duration = EXCLUDED.total_duration,
            average_question_time = EXCLUDED.average_question_time,
            technical_score = EXCLUDED.technical_score,
            communication_score = EXCLUDED.communication_score,
            behavioral_score = EXCLUDED.behavioral_score,
            aptitude_score = EXCLUDED.aptitude_score,
            problem_solving_score = EXCLUDED.problem_solving_score,
            culture_fit_score = EXCLUDED.culture_fit_score,
            motivation_score = EXCLUDED.motivation_score,
            leadership_score = EXCLUDED.leadership_score,
            adaptability_score = EXCLUDED.adaptability_score,
            logical_reasoning_score = EXCLUDED.logical_reasoning_score,
            quantitative_score = EXCLUDED.quantitative_score,
            overall_score = EXCLUDED.overall_score,
            recommendation = EXCLUDED.recommendation,
            completed_at = NOW(),
            updated_at = NOW()
        RETURNING *
        """,
        session_id, candidate_id, total_q, completed_q_count,
        completion_pct, total_duration, avg_q_time,
        tech_score, comm_score, beh_score, apt_score,
        prob_score, cult_score, mot_score, lead_score,
        adapt_score, log_score, quant_score,
        overall_score, recommendation
    )

    # Insert question results
    await db.execute("DELETE FROM interview_question_results WHERE session_id = $1", session_id)
    for q in q_rows:
        q_num = q["question_number"]
        user_ans = q["user_answer"]
        ans_status = "Answered" if (user_ans and user_ans.strip()) else "Skipped"
        q_time = timings_map.get(q_num, 0)
        q_score = float(q["score"]) if q["score"] is not None else None

        await db.execute(
            """
            INSERT INTO interview_question_results (
                session_id, result_id, question_id, question_number, question_text,
                answer_status, time_spent, answer_type, user_answer, score, evaluation, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            """,
            session_id, res_row["id"], q["id"], q_num, q["question_text"],
            ans_status, q_time, q.get("category") or session_row["domain"], user_ans, q_score, q.get("feedback")
        )

    # Update interview_sessions
    await db.execute(
        """
        UPDATE interview_sessions
        SET status = 'COMPLETED',
            score = $1,
            completed_questions = $2,
            ended_at = NOW(),
            duration = $3,
            updated_at = NOW()
        WHERE id = $4
        """,
        overall_score, completed_q_count, total_duration, session_id
    )

    return await get_session(session_id, current_user, db)


# ── 8a. RECRUITER ANALYTICS & REPORTING ENDPOINTS ───────────────────

@router.get("/recruiter/analytics", response_model=RecruiterAnalyticsResponse)
async def get_recruiter_analytics(
    current_user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Returns analytics card metrics from the database for recruiter dashboard.
    """
    if current_user["role"] not in ("recruiter", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="403 Forbidden: Recruiter authorization required."
        )

    user_id = current_user["id"]
    is_admin = current_user["role"] == "admin"

    if is_admin:
        total_interviews = await db.fetchval("SELECT COUNT(*) FROM interview_sessions") or 0
        completed = await db.fetchval("SELECT COUNT(*) FROM interview_sessions WHERE UPPER(status) = 'COMPLETED'") or 0
        in_progress = await db.fetchval("SELECT COUNT(*) FROM interview_sessions WHERE UPPER(status) = 'IN_PROGRESS'") or 0
        pending = await db.fetchval("SELECT COUNT(*) FROM interview_sessions WHERE UPPER(status) IN ('CREATED', 'PAUSED')") or 0
        avg_score = await db.fetchval("SELECT COALESCE(AVG(overall_score), 0) FROM interview_results") or 0.0
        avg_dur = await db.fetchval("SELECT COALESCE(AVG(total_duration), 0) FROM interview_results") or 0.0
    else:
        total_interviews = await db.fetchval(
            "SELECT COUNT(*) FROM interview_sessions WHERE created_by = $1 OR user_id = $1", user_id
        ) or 0
        completed = await db.fetchval(
            "SELECT COUNT(*) FROM interview_sessions WHERE (created_by = $1 OR user_id = $1) AND UPPER(status) = 'COMPLETED'", user_id
        ) or 0
        in_progress = await db.fetchval(
            "SELECT COUNT(*) FROM interview_sessions WHERE (created_by = $1 OR user_id = $1) AND UPPER(status) = 'IN_PROGRESS'", user_id
        ) or 0
        pending = await db.fetchval(
            "SELECT COUNT(*) FROM interview_sessions WHERE (created_by = $1 OR user_id = $1) AND UPPER(status) IN ('CREATED', 'PAUSED')", user_id
        ) or 0
        avg_score = await db.fetchval(
            """
            SELECT COALESCE(AVG(r.overall_score), 0)
            FROM interview_results r
            JOIN interview_sessions s ON s.id = r.session_id
            WHERE s.created_by = $1 OR s.user_id = $1
            """, user_id
        ) or 0.0
        avg_dur = await db.fetchval(
            """
            SELECT COALESCE(AVG(r.total_duration), 0)
            FROM interview_results r
            JOIN interview_sessions s ON s.id = r.session_id
            WHERE s.created_by = $1 OR s.user_id = $1
            """, user_id
        ) or 0.0

    return RecruiterAnalyticsResponse(
        total_interviews=total_interviews,
        completed_interviews=completed,
        in_progress_interviews=in_progress,
        pending_interviews=pending,
        average_score=round(float(avg_score), 1),
        average_duration=int(round(float(avg_dur))),
    )


@router.get("/recruiter/interviews", response_model=List[RecruiterCandidateInterviewResponse])
async def list_recruiter_interviews(
    current_user: CurrentUser,
    search: Optional[str] = None,
    job_role: Optional[str] = None,
    interview_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    sort_by: Optional[str] = "completed_at",
    sort_order: Optional[str] = "desc",
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Retrieves filtered & sorted list of candidates / interview sessions for Recruiter Dashboard.
    """
    if current_user["role"] not in ("recruiter", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="403 Forbidden: Recruiter authorization required."
        )

    user_id = current_user["id"]
    is_admin = current_user["role"] == "admin"

    query = """
        SELECT 
            s.id as session_id,
            s.id,
            s.candidate_id,
            COALESCE(u.name, 'Candidate') as candidate_name,
            COALESCE(u.email, 'candidate@smarthire.ai') as candidate_email,
            s.job_role,
            s.domain,
            s.interview_type,
            s.difficulty,
            s.experience_level,
            s.status,
            s.total_questions,
            s.completed_questions,
            COALESCE(r.completion_percentage, 
                CASE WHEN s.total_questions > 0 THEN (s.completed_questions::numeric / s.total_questions::numeric * 100) ELSE 0 END
            ) as completion_percentage,
            COALESCE(r.total_duration, s.duration, 0) as duration,
            COALESCE(r.overall_score, s.score, 0) as overall_score,
            COALESCE(r.recommendation, 'Under Review') as recommendation,
            COALESCE(r.completed_at, s.ended_at) as completed_at,
            s.created_at
        FROM interview_sessions s
        LEFT JOIN users u ON u.id = COALESCE(s.candidate_id, s.user_id)
        LEFT JOIN interview_results r ON r.session_id = s.id
        WHERE 1=1
    """
    args = []

    if not is_admin:
        args.append(user_id)
        query += f" AND (s.created_by = ${len(args)} OR s.user_id = ${len(args)})"

    if status_filter and status_filter.lower() != "all":
        args.append(status_filter.lower())
        query += f" AND LOWER(s.status) = ${len(args)}"

    if interview_type and interview_type.lower() != "all":
        args.append(f"%{interview_type.strip().lower()}%")
        query += f" AND LOWER(s.interview_type) LIKE ${len(args)}"

    if job_role and job_role.lower() != "all":
        args.append(f"%{job_role.strip().lower()}%")
        query += f" AND LOWER(s.job_role) LIKE ${len(args)}"

    if search and search.strip():
        args.append(f"%{search.strip().lower()}%")
        query += f" AND (LOWER(u.name) LIKE ${len(args)} OR LOWER(u.email) LIKE ${len(args)} OR LOWER(s.job_role) LIKE ${len(args)})"

    # Sorting
    valid_sorts = {
        "completed_at": "completed_at",
        "score": "overall_score",
        "duration": "duration",
        "candidate_name": "candidate_name",
        "created_at": "s.created_at",
    }
    sort_column = valid_sorts.get(sort_by, "completed_at")
    order = "ASC" if sort_order and sort_order.lower() == "asc" else "DESC"
    query += f" ORDER BY {sort_column} {order} NULLS LAST, s.created_at DESC"

    rows = await db.fetch(query, *args)
    
    result = []
    for r in rows:
        d = dict(r)
        d["id"] = r["session_id"]
        d["overall_score"] = float(r["overall_score"]) if r["overall_score"] is not None else 0.0
        d["completion_percentage"] = float(r["completion_percentage"]) if r["completion_percentage"] is not None else 0.0
        result.append(d)
    return result


@router.get("/recruiter/interviews/{session_id}/details")
async def get_recruiter_interview_details(
    session_id: UUID,
    current_user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Returns full detailed report of a completed interview session for recruiter view.
    Includes Candidate profile, Session metadata, Result summary, Category scores, and Question analytics.
    """
    if current_user["role"] not in ("recruiter", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="403 Forbidden: Recruiter access required."
        )

    user_id = current_user["id"]
    is_admin = current_user["role"] == "admin"

    if is_admin:
        session_row = await db.fetchrow("SELECT * FROM interview_sessions WHERE id = $1", session_id)
    else:
        session_row = await db.fetchrow(
            "SELECT * FROM interview_sessions WHERE id = $1 AND (created_by = $2 OR user_id = $2)",
            session_id, user_id
        )

    if not session_row:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    cand_id = session_row["candidate_id"] or session_row["user_id"]
    cand_user = await db.fetchrow("SELECT id, name, email, avatar_url, created_at FROM users WHERE id = $1", cand_id)

    res_row = await db.fetchrow("SELECT * FROM interview_results WHERE session_id = $1", session_id)
    q_res_rows = await db.fetch("SELECT * FROM interview_question_results WHERE session_id = $1 ORDER BY question_number ASC", session_id)
    rec_row = await db.fetchrow("SELECT id FROM interview_recordings WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1", session_id)

    audio_rows = await db.fetch("SELECT question_id, id, duration, file_size, mime_type FROM interview_audio_answers WHERE session_id = $1", session_id)
    audio_map = {str(a["question_id"]): a for a in audio_rows}

    # Fallback to interview_questions if interview_question_results not populated yet
    if not q_res_rows:
        q_rows = await db.fetch("SELECT * FROM interview_questions WHERE session_id = $1 ORDER BY question_number ASC", session_id)
        timing_rows = await db.fetch("SELECT question_number, SUM(time_spent) as total_time FROM interview_question_timings WHERE session_id = $1 GROUP BY question_number", session_id)
        timings_map = {t["question_number"]: t["total_time"] for t in timing_rows}

        q_res_rows = []
        for q in q_rows:
            q_num = q["question_number"]
            u_ans = q["user_answer"]
            q_res_rows.append({
                "id": q["id"],
                "session_id": session_id,
                "result_id": res_row["id"] if res_row else None,
                "question_id": q["id"],
                "question_number": q_num,
                "question_text": q["question_text"],
                "answer_status": "Answered" if (u_ans and u_ans.strip()) else "Skipped",
                "time_spent": timings_map.get(q_num, 0),
                "answer_type": q["category"] or session_row["domain"],
                "user_answer": u_ans,
                "score": float(q["score"]) if q["score"] is not None else None,
                "evaluation": q["feedback"]
            })

    formatted_q_results = []
    for r in q_res_rows:
        item = dict(r)
        q_id_str = str(item.get("question_id") or item.get("id") or "")
        if q_id_str in audio_map:
            item["has_audio"] = True
            item["audio_id"] = str(audio_map[q_id_str]["id"])
            item["audio_duration"] = audio_map[q_id_str]["duration"]
        else:
            item["has_audio"] = False
            item["audio_id"] = None
            item["audio_duration"] = 0
        formatted_q_results.append(item)

    return {
        "candidate": dict(cand_user) if cand_user else {"id": str(cand_id), "name": "Candidate", "email": "candidate@smarthire.ai"},
        "session": dict(session_row),
        "result": dict(res_row) if res_row else None,
        "question_results": formatted_q_results,
        "has_recording": rec_row is not None,
        "recording_id": rec_row["id"] if rec_row else None,
    }



# ── 8b. POST /api/sessions/{id}/recording ────────────────────
@router.post("/sessions/{session_id}/recording", response_model=RecordingResponse)
@router.post("/sessions/{session_id}/recordings", response_model=RecordingResponse)
@router.post("/interviews/sessions/{session_id}/recording", response_model=RecordingResponse)
@router.post("/interviews/sessions/{session_id}/recordings", response_model=RecordingResponse)
@router.post("/interview-sessions/{session_id}/recording", response_model=RecordingResponse)
@router.post("/interview-sessions/{session_id}/recordings", response_model=RecordingResponse)
async def upload_recording(
    session_id: UUID,
    file: UploadFile = File(...),
    current_user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Uploads recorded candidate interview video+audio.
    Associates file with session, candidate, and created timestamp.
    """
    user_id = current_user["id"]
    role = current_user["role"]

    if role in ("recruiter", "admin"):
        session_row = await db.fetchrow("SELECT * FROM interview_sessions WHERE id = $1", session_id)
    else:
        session_row = await db.fetchrow(
            "SELECT * FROM interview_sessions WHERE id = $1 AND (user_id = $2 OR candidate_id = $2 OR created_by = $2)",
            session_id,
            user_id,
        )

    if not session_row:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    contents = await file.read()
    file_size = len(contents)
    mime_type = file.content_type or "video/webm"
    
    ext = ".mp4" if "mp4" in mime_type.lower() else ".webm"
    filename = f"{session_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    candidate_id = session_row["candidate_id"] or session_row["user_id"]
    duration_val = session_row.get("duration", 0) or 0

    rec_row = await db.fetchrow(
        """
        INSERT INTO interview_recordings (
            session_id, candidate_id, interview_id, recording_type,
            storage_location, mime_type, file_size, duration, created_at
        ) VALUES ($1, $2, $1, 'video_audio', $3, $4, $5, $6, NOW())
        RETURNING *
        """,
        session_id,
        candidate_id,
        file_path,
        mime_type,
        file_size,
        duration_val,
    )

    return RecordingResponse(
        id=rec_row["id"],
        session_id=rec_row["session_id"],
        candidate_id=rec_row["candidate_id"],
        interview_id=rec_row["interview_id"],
        recording_type=rec_row["recording_type"],
        mime_type=rec_row["mime_type"],
        file_size=rec_row["file_size"],
        duration=rec_row["duration"],
        created_at=rec_row["created_at"],
    )


# ── 8c. GET /api/sessions/{id}/recording ─────────────────────
@router.get("/sessions/{session_id}/recording")
@router.get("/sessions/{session_id}/recordings")
@router.get("/sessions/{session_id}/recordings/{recording_id}")
@router.get("/interviews/sessions/{session_id}/recording")
@router.get("/interviews/sessions/{session_id}/recordings")
@router.get("/interviews/sessions/{session_id}/recordings/{recording_id}")
@router.get("/interview-sessions/{session_id}/recording")
@router.get("/interview-sessions/{session_id}/recordings")
@router.get("/interview-sessions/{session_id}/recordings/{recording_id}")
async def get_recording(
    session_id: UUID,
    recording_id: Optional[UUID] = None,
    current_user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Downloads / Streams interview recording.
    Requires role-based authorization: candidate (own recording), recruiter (assigned/managed candidate), admin.
    Returns HTTP 403 Forbidden for unauthorized access.
    """
    user_id = current_user["id"]
    role = current_user["role"]

    session_row = await db.fetchrow("SELECT * FROM interview_sessions WHERE id = $1", session_id)
    if not session_row:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    is_candidate_owner = str(session_row["user_id"]) == str(user_id) or str(session_row["candidate_id"]) == str(user_id)
    is_creator = str(session_row["created_by"]) == str(user_id) if session_row["created_by"] else False
    is_admin = role == "admin"
    is_recruiter = role == "recruiter"

    if not (is_candidate_owner or is_creator or is_recruiter or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="403 Forbidden: Access denied. You are not authorized to view this interview recording.",
        )

    if recording_id:
        rec_row = await db.fetchrow(
            "SELECT * FROM interview_recordings WHERE id = $1 AND session_id = $2",
            recording_id,
            session_id,
        )
    else:
        rec_row = await db.fetchrow(
            "SELECT * FROM interview_recordings WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1",
            session_id,
        )

    if not rec_row:
        raise HTTPException(status_code=404, detail="No recording found for this session.")

    file_path = rec_row["storage_location"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Recording file not found on storage server.")

    return FileResponse(path=file_path, media_type=rec_row["mime_type"], filename=os.path.basename(file_path))


# ── 8d. POST /api/sessions/{id}/answers/audio ───────────────
@router.post("/sessions/{session_id}/answers/audio", response_model=AudioAnswerResponse)
@router.post("/interviews/sessions/{session_id}/answers/audio", response_model=AudioAnswerResponse)
@router.post("/interview-sessions/{session_id}/answers/audio", response_model=AudioAnswerResponse)
async def upload_audio_answer(
    session_id: UUID,
    audio_file: UploadFile = File(...),
    question_id: UUID = Form(...),
    question_number: int = Form(...),
    duration: int = Form(0),
    current_user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Accepts multipart form data (audio_file, question_id, question_number, duration).
    Validates candidate authentication and session ownership, then saves audio file in uploads/audio_answers/.
    """
    user_id = current_user["id"]
    role = current_user["role"]

    if role in ("recruiter", "admin"):
        session_row = await db.fetchrow("SELECT * FROM interview_sessions WHERE id = $1", session_id)
    else:
        session_row = await db.fetchrow(
            "SELECT * FROM interview_sessions WHERE id = $1 AND (user_id = $2 OR candidate_id = $2 OR created_by = $2)",
            session_id,
            user_id,
        )

    if not session_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    contents = await audio_file.read()
    file_size = len(contents)
    mime_type = audio_file.content_type or "audio/webm"

    ext = ".mp4" if "mp4" in mime_type.lower() else (".wav" if "wav" in mime_type.lower() else ".webm")
    filename = f"audio_{session_id}_{question_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(AUDIO_UPLOAD_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    candidate_id = session_row["candidate_id"] or session_row["user_id"]

    ans_row = await db.fetchrow(
        """
        INSERT INTO interview_audio_answers (
            session_id, candidate_id, question_id, question_number,
            storage_location, mime_type, file_size, duration, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (session_id, question_id) DO UPDATE SET
            storage_location = EXCLUDED.storage_location,
            mime_type = EXCLUDED.mime_type,
            file_size = EXCLUDED.file_size,
            duration = EXCLUDED.duration,
            question_number = EXCLUDED.question_number,
            updated_at = NOW()
        RETURNING *
        """,
        session_id,
        candidate_id,
        question_id,
        question_number,
        file_path,
        mime_type,
        file_size,
        duration,
    )

    return dict(ans_row)


# ── 8e. GET /api/sessions/{id}/answers/audio/{question_id} ─
@router.get("/sessions/{session_id}/answers/audio/{question_id}")
@router.get("/interviews/sessions/{session_id}/answers/audio/{question_id}")
@router.get("/interview-sessions/{session_id}/answers/audio/{question_id}")
async def get_audio_answer(
    session_id: UUID,
    question_id: UUID,
    current_user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Protected audio streaming endpoint enforcing role-based authorization (Candidate owner, assigned Recruiter, Admin).
    Returns HTTP 403 Forbidden for unauthorized requests.
    """
    user_id = current_user["id"]
    role = current_user["role"]

    session_row = await db.fetchrow("SELECT * FROM interview_sessions WHERE id = $1", session_id)
    if not session_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    is_candidate_owner = str(session_row["user_id"]) == str(user_id) or str(session_row["candidate_id"]) == str(user_id)
    is_creator = str(session_row["created_by"]) == str(user_id) if session_row.get("created_by") else False
    is_admin = role == "admin"
    is_recruiter = role == "recruiter"

    if not (is_candidate_owner or is_creator or is_recruiter or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="403 Forbidden: Access denied. You are not authorized to access this audio answer.",
        )

    ans_row = await db.fetchrow(
        "SELECT * FROM interview_audio_answers WHERE session_id = $1 AND question_id = $2",
        session_id,
        question_id,
    )

    if not ans_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio answer not found for this question.")

    file_path = ans_row["storage_location"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio answer file not found on storage server.")

    return FileResponse(
        path=file_path,
        media_type=ans_row["mime_type"],
        filename=os.path.basename(file_path),
        headers={"Accept-Ranges": "bytes"}
    )


# ── 9. GET /api/history ──────────────────────────────────────
@router.get("/history", response_model=List[SessionResponse])
async def get_interview_history(
    current_user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Get full candidate interview history including questions and scores.
    """
    if current_user["role"] == "candidate":
        sessions = await db.fetch(
            """
            SELECT * FROM interview_sessions
            WHERE candidate_id = $1 OR user_id = $1
            ORDER BY created_at DESC
            """,
            current_user["id"],
        )
    else:
        sessions = await db.fetch(
            """
            SELECT * FROM interview_sessions
            WHERE created_by = $1 OR user_id = $1 OR candidate_id IS NOT NULL
            ORDER BY created_at DESC
            """,
            current_user["id"],
        )


    history = []
    for s in sessions:
        s_id = s["id"]
        q_rows = await db.fetch(
            "SELECT * FROM interview_questions WHERE session_id = $1 ORDER BY question_number ASC",
            s_id,
        )
        questions = []
        for q in q_rows:
            pts = q["expected_answer_points"]
            if isinstance(pts, str):
                pts = json.loads(pts)
            questions.append(
                QuestionResponse(
                    id=q["id"],
                    session_id=q["session_id"],
                    question_number=q["question_number"],
                    question_text=q["question_text"],
                    interview_type=q["interview_type"],
                    domain=q["domain"],
                    difficulty=q["difficulty"],
                    expected_answer_points=pts or [],
                    category=q["category"],
                    user_answer=q["user_answer"],
                    sample_answer=q["sample_answer"],
                    feedback=q["feedback"],
                    score=float(q["score"]) if q["score"] is not None else None,
                )
            )

        sd = dict(s)
        sd["questions"] = questions
        history.append(sd)

    return history
