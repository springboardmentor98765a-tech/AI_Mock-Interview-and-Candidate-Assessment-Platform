# ============================================================
#  interviews.py — AI Interview Generation & Session Management Router
# ============================================================
import json
from datetime import datetime
from typing import List, Optional
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.dependencies import CurrentUser
from app.schemas import (
    CandidateUserResponse,
    CreateSessionRequest,
    GenerateQuestionsRequest,
    QuestionResponse,
    SessionResponse,
    SubmitAnswerRequest,
    UpdateSessionRequest,
)
from app.services.ai_service import AIService

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
async def get_session(
    session_id: UUID,
    current_user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Loads an existing interview session by ID, including all questions, user answers, and feedback.
    """
    session_row = await db.fetchrow(
        "SELECT * FROM interview_sessions WHERE id = $1 AND (user_id = $2 OR candidate_id = $2 OR created_by = $2)",
        session_id,
        current_user["id"],
    )
    if not session_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found.",
        )

    q_rows = await db.fetch(
        """
        SELECT * FROM interview_questions
        WHERE session_id = $1
        ORDER BY question_number ASC
        """,
        session_id,
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

    res = dict(session_row)
    res["questions"] = questions
    return res


# ── 6. POST /api/sessions/{id}/start ─────────────────────────
@router.post("/sessions/{session_id}/start", response_model=SessionResponse)
async def start_session(
    session_id: UUID,
    current_user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Starts an interview session (sets status to in_progress and updates started_at).
    """
    session_row = await db.fetchrow(
        """
        UPDATE interview_sessions
        SET status = 'in_progress',
            started_at = COALESCE(started_at, NOW()),
            updated_at = NOW()
        WHERE id = $1 AND (user_id = $2 OR candidate_id = $2 OR created_by = $2)
        RETURNING *
        """,
        session_id,
        current_user["id"],
    )
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return await get_session(session_id, current_user, db)



# ── 7. POST /api/sessions/{id}/answer ────────────────────────
@router.post("/sessions/{session_id}/answer", response_model=QuestionResponse)
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

    # Evaluate answer via AI Service
    eval_result = await AIService.evaluate_answer(
        question_text=q_row["question_text"],
        user_answer=req.user_answer,
        interview_type=q_row["interview_type"],
        difficulty=q_row["difficulty"],
        expected_points=pts or [],
    )

    # Save to database
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

    # Recalculate completed count in session
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


# ── 8. POST /api/sessions/{id}/end ───────────────────────────
@router.post("/sessions/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: UUID,
    current_user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Ends an active interview session, computes final average score, and sets status to completed.
    """
    # Calculate average score across answered questions
    score_row = await db.fetchrow(
        """
        SELECT AVG(score) as avg_score, COUNT(id) as total_answered
        FROM interview_questions
        WHERE session_id = $1 AND score IS NOT NULL
        """,
        session_id,
    )

    final_score = float(score_row["avg_score"]) if score_row["avg_score"] is not None else 0.0

    await db.execute(
        """
        UPDATE interview_sessions
        SET status = 'completed',
            score = $1,
            ended_at = NOW(),
            updated_at = NOW()
        WHERE id = $2 AND (user_id = $3 OR candidate_id = $3 OR created_by = $3)
        """,
        final_score,
        session_id,
        current_user["id"],
    )

    return await get_session(session_id, current_user, db)


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
