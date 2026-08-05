from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from database import get_db
from models import (
    InterviewCreateRequest,
    InterviewGenerateRequest,
    InterviewStartRequest,
    InterviewUpdateRequest,
    InterviewQuestionCreateRequest,
    AnswerSubmitRequest,
    InterviewQuestionRequest,
    VoiceAnswerRequest,
)
from auth import get_current_user
from services.question_bank import generate_questions as generate_bank_questions
from services import mimo
from services import sarvam

router = APIRouter(prefix="/api/interviews", tags=["interviews"])


def row_to_interview(row) -> dict:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "interview_type": row["interview_type"],
        "domain": row["domain"],
        "difficulty": row["difficulty"],
        "status": row["status"],
        "total_score": row["total_score"],
        "started_at": str(row["started_at"]) if row["started_at"] else None,
        "completed_at": str(row["completed_at"]) if row["completed_at"] else None,
        "created_at": str(row["created_at"]) if row["created_at"] else None,
    }


def row_to_question(row) -> dict:
    return {
        "id": row["id"],
        "interview_id": row["interview_id"],
        "question_text": row["question_text"],
        "category": row["category"],
        "difficulty": row["difficulty"],
        "sequence_no": row["sequence_no"],
        "answer_text": row["answer_text"],
        "score": row["score"],
        "feedback": row["feedback"],
    }


@router.post("")
def create_interview(req: InterviewCreateRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO interview (user_id, interview_type, domain, difficulty) VALUES (?, ?, ?, ?)",
        (user["id"], req.interview_type, req.domain, req.difficulty),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM interview WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return {"message": "Interview created.", "interview": row_to_interview(row)}


@router.post("/generate")
def generate_interview(req: InterviewGenerateRequest, user: dict = Depends(get_current_user)):
    if req.num_questions:
        num_q = req.num_questions
    elif req.time_duration:
        num_q = max(1, req.time_duration // 4)
    else:
        num_q = 5

    ai_generated = mimo.configured()
    try:
        questions_data = mimo.generate_questions(
            req.interview_type, req.difficulty, req.domain, req.skills, num_q
        ) if ai_generated else generate_bank_questions(
            interview_type=req.interview_type,
            difficulty=req.difficulty,
            domain=req.domain,
            num_questions=num_q,
            skills=req.skills,
        )
    except mimo.MimoError as error:
        raise HTTPException(502, str(error)) from error
    if not questions_data:
        raise HTTPException(400, "Could not generate questions for the given parameters.")

    conn = get_db()
    cur = conn.execute(
        "INSERT INTO interview (user_id, interview_type, domain, difficulty, status) VALUES (?, ?, ?, ?, 'created')",
        (user["id"], req.interview_type, req.domain, req.difficulty),
    )
    interview_id = cur.lastrowid

    for q in questions_data:
        conn.execute(
            "INSERT INTO interview_question (interview_id, question_text, category, difficulty, sequence_no) VALUES (?, ?, ?, ?, ?)",
            (interview_id, q["question_text"], q["category"], q["difficulty"], q["sequence_no"]),
        )
    conn.commit()

    interview = conn.execute("SELECT * FROM interview WHERE id = ?", (interview_id,)).fetchone()
    questions = conn.execute(
        "SELECT * FROM interview_question WHERE interview_id = ? ORDER BY sequence_no", (interview_id,)
    ).fetchall()
    conn.close()

    return {
        "message": f"Interview generated with {len(questions)} questions.",
        "ai_generated": ai_generated,
        "interview": row_to_interview(interview),
        "questions": [row_to_question(q) for q in questions],
    }


@router.get("/history")
def interview_history(user: dict = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM interview WHERE user_id = ? AND status = 'completed' ORDER BY completed_at DESC",
        (user["id"],),
    ).fetchall()

    history = []
    for row in rows:
        interview = row_to_interview(row)
        questions = conn.execute(
            "SELECT * FROM interview_question WHERE interview_id = ? ORDER BY sequence_no", (row["id"],)
        ).fetchall()
        interview["questions"] = [row_to_question(q) for q in questions]
        answered = sum(1 for q in questions if q["answer_text"])
        interview["questions_answered"] = answered
        interview["total_questions"] = len(questions)
        history.append(interview)

    conn.close()
    return {"history": history}


@router.get("")
def list_interviews(
    status: Optional[str] = None,
    interview_type: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    conn = get_db()
    query = "SELECT * FROM interview WHERE user_id = ?"
    params = [user["id"]]

    if status:
        query += " AND status = ?"
        params.append(status)
    if interview_type:
        query += " AND interview_type = ?"
        params.append(interview_type)

    query += " ORDER BY created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return {"interviews": [row_to_interview(r) for r in rows]}


@router.get("/{interview_id}")
def get_interview(interview_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM interview WHERE id = ? AND user_id = ?", (interview_id, user["id"])
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Interview not found.")
    questions = conn.execute(
        "SELECT * FROM interview_question WHERE interview_id = ? ORDER BY sequence_no", (interview_id,)
    ).fetchall()
    conn.close()
    return {
        "interview": row_to_interview(row),
        "questions": [row_to_question(q) for q in questions],
    }


@router.put("/{interview_id}")
def update_interview(interview_id: int, req: InterviewUpdateRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM interview WHERE id = ? AND user_id = ?", (interview_id, user["id"])
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Interview not found.")

    updates = []
    values = []
    if req.interview_type:
        updates.append("interview_type = ?")
        values.append(req.interview_type)
    if req.domain:
        updates.append("domain = ?")
        values.append(req.domain)
    if req.difficulty:
        updates.append("difficulty = ?")
        values.append(req.difficulty)
    if req.status:
        if req.status not in ("created", "in_progress", "completed"):
            conn.close()
            raise HTTPException(400, "Invalid status.")
        updates.append("status = ?")
        values.append(req.status)
        if req.status == "in_progress" and not row["started_at"]:
            updates.append("started_at = CURRENT_TIMESTAMP")
        if req.status == "completed":
            updates.append("completed_at = CURRENT_TIMESTAMP")

    if updates:
        values.append(interview_id)
        conn.execute(f"UPDATE interview SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()

    updated = conn.execute("SELECT * FROM interview WHERE id = ?", (interview_id,)).fetchone()
    conn.close()
    return {"message": "Interview updated.", "interview": row_to_interview(updated)}


@router.delete("/{interview_id}")
def delete_interview(interview_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute(
        "SELECT id FROM interview WHERE id = ? AND user_id = ?", (interview_id, user["id"])
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Interview not found.")
    conn.execute("DELETE FROM interview WHERE id = ?", (interview_id,))
    conn.commit()
    conn.close()
    return {"message": "Interview deleted."}


@router.post("/{interview_id}/start")
def start_interview(interview_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM interview WHERE id = ? AND user_id = ?", (interview_id, user["id"])
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Interview not found.")
    if row["status"] == "completed":
        conn.close()
        raise HTTPException(400, "Interview already completed.")
    if row["status"] == "in_progress":
        conn.close()
        raise HTTPException(400, "Interview already in progress.")

    conn.execute(
        "UPDATE interview SET status = 'in_progress', started_at = CURRENT_TIMESTAMP WHERE id = ?",
        (interview_id,),
    )
    conn.commit()

    questions = conn.execute(
        "SELECT * FROM interview_question WHERE interview_id = ? ORDER BY sequence_no", (interview_id,)
    ).fetchall()
    updated = conn.execute("SELECT * FROM interview WHERE id = ?", (interview_id,)).fetchone()
    conn.close()

    return {
        "message": "Interview started.",
        "interview": row_to_interview(updated),
        "questions": [row_to_question(q) for q in questions],
    }


@router.post("/start")
def start_interview_from_body(req: InterviewStartRequest, user: dict = Depends(get_current_user)):
    """Start endpoint matching the module contract: POST /interviews/start."""
    return start_interview(req.interview_id, user)


@router.post("/{interview_id}/answer")
def submit_answer(interview_id: int, req: AnswerSubmitRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    interview = conn.execute(
        "SELECT * FROM interview WHERE id = ? AND user_id = ?", (interview_id, user["id"])
    ).fetchone()
    if not interview:
        conn.close()
        raise HTTPException(404, "Interview not found.")
    if interview["status"] != "in_progress":
        conn.close()
        raise HTTPException(400, "Interview is not in progress. Start the interview first.")

    question = conn.execute(
        "SELECT * FROM interview_question WHERE id = ? AND interview_id = ?",
        (req.question_id, interview_id),
    ).fetchone()
    if not question:
        conn.close()
        raise HTTPException(404, "Question not found.")

    ai_evaluated = mimo.configured()
    try:
        assessment = mimo.evaluate_answer(
            question["question_text"], question["category"], question["difficulty"], req.answer_text
        ) if ai_evaluated else {
            "score": evaluate_answer(req.answer_text, question["question_text"], question["category"], question["difficulty"]),
            "feedback": None,
        }
    except mimo.MimoError as error:
        conn.close()
        raise HTTPException(502, str(error)) from error
    score = assessment["score"]
    feedback = assessment["feedback"] or generate_feedback(req.answer_text, score)

    conn.execute(
        "UPDATE interview_question SET answer_text = ?, score = ?, feedback = ? WHERE id = ?",
        (req.answer_text, score, feedback, req.question_id),
    )
    conn.commit()

    total_q = conn.execute(
        "SELECT COUNT(*) as cnt FROM interview_question WHERE interview_id = ?", (interview_id,)
    ).fetchone()["cnt"]
    answered_q = conn.execute(
        "SELECT COUNT(*) as cnt FROM interview_question WHERE interview_id = ? AND answer_text IS NOT NULL",
        (interview_id,),
    ).fetchone()["cnt"]

    if answered_q >= total_q:
        avg = conn.execute(
            "SELECT AVG(score) as avg_score FROM interview_question WHERE interview_id = ? AND score IS NOT NULL",
            (interview_id,),
        ).fetchone()["avg_score"]
        conn.execute(
            "UPDATE interview SET status = 'completed', completed_at = CURRENT_TIMESTAMP, total_score = ? WHERE id = ?",
            (round(avg, 2) if avg else 0, interview_id),
        )
        conn.commit()

    updated_q = conn.execute("SELECT * FROM interview_question WHERE id = ?", (req.question_id,)).fetchone()
    updated_interview = conn.execute("SELECT * FROM interview WHERE id = ?", (interview_id,)).fetchone()
    conn.close()

    return {
        "message": "Answer submitted.",
        "ai_evaluated": ai_evaluated,
        "question": row_to_question(updated_q),
        "interview": row_to_interview(updated_interview),
    }


@router.post("/{interview_id}/speak")
def speak_question(interview_id: int, req: InterviewQuestionRequest, user: dict = Depends(get_current_user)):
    """Turn the current question into interviewer audio using Sarvam AI Bulbul V3 TTS."""
    conn = get_db()
    question = conn.execute(
        """SELECT q.question_text, q.sequence_no FROM interview_question q
           JOIN interview i ON i.id = q.interview_id
           WHERE q.id = ? AND q.interview_id = ? AND i.user_id = ?""",
        (req.question_id, interview_id, user["id"]),
    ).fetchone()
    conn.close()
    if not question:
        raise HTTPException(404, "Question not found.")
    try:
        audio_base64 = sarvam.text_to_speech(f"Question {question['sequence_no']}. {question['question_text']}")
    except sarvam.SarvamError as error:
        raise HTTPException(503, str(error)) from error
    return {"audio_base64": audio_base64, "mime_type": "audio/wav"}


@router.post("/{interview_id}/answer-audio")
def submit_voice_answer(interview_id: int, req: VoiceAnswerRequest, user: dict = Depends(get_current_user)):
    """Transcribe a browser-recorded WAV answer using Sarvam AI Saaras V3, then run the MiMo evaluator."""
    try:
        transcript = sarvam.transcribe_audio(req.audio_data)
    except sarvam.SarvamError as error:
        raise HTTPException(503, str(error)) from error
    result = submit_answer(interview_id, AnswerSubmitRequest(question_id=req.question_id, answer_text=transcript), user)
    result["transcript"] = transcript
    return result


@router.post("/{interview_id}/questions")
def add_question(interview_id: int, req: InterviewQuestionCreateRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    interview = conn.execute(
        "SELECT id FROM interview WHERE id = ? AND user_id = ?", (interview_id, user["id"])
    ).fetchone()
    if not interview:
        conn.close()
        raise HTTPException(404, "Interview not found.")
    cur = conn.execute(
        "INSERT INTO interview_question (interview_id, question_text, category, difficulty, sequence_no) VALUES (?, ?, ?, ?, ?)",
        (interview_id, req.question_text, req.category, req.difficulty, req.sequence_no),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM interview_question WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return {"message": "Question added.", "question": row_to_question(row)}


@router.get("/{interview_id}/questions")
def list_questions(interview_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    interview = conn.execute(
        "SELECT id FROM interview WHERE id = ? AND user_id = ?", (interview_id, user["id"])
    ).fetchone()
    if not interview:
        conn.close()
        raise HTTPException(404, "Interview not found.")
    rows = conn.execute(
        "SELECT * FROM interview_question WHERE interview_id = ? ORDER BY sequence_no", (interview_id,)
    ).fetchall()
    conn.close()
    return {"questions": [row_to_question(r) for r in rows]}


def evaluate_answer(answer: str, question: str, category: str, difficulty: str) -> float:
    answer_lower = answer.lower().strip()
    word_count = len(answer_lower.split())

    if word_count < 5:
        score = 20.0
    elif word_count < 15:
        score = 40.0
    elif word_count < 30:
        score = 55.0
    elif word_count < 60:
        score = 70.0
    elif word_count < 100:
        score = 80.0
    else:
        score = 85.0

    keywords = {
        "Data Structures": ["array", "list", "tree", "graph", "stack", "queue", "hash", "heap", "node", "pointer"],
        "Algorithms": ["sort", "search", "complexity", "big o", "recursive", "iterate", "dynamic", "greedy"],
        "System Design": ["scale", "distributed", "cache", "load", "database", "api", "microservice", "queue"],
        "Databases": ["sql", "query", "index", "table", "join", "transaction", "acid", "normalization"],
        "Programming": ["class", "object", "function", "variable", "inheritance", "polymorphism", "interface"],
        "Web Development": ["http", "rest", "api", "json", "frontend", "backend", "server", "client"],
        "Introduction": ["experience", "background", "skills", "role", "team", "project", "work"],
        "Motivation": ["passion", "growth", "learn", "impact", "contribute", "mission", "values"],
        "Leadership": ["led", "managed", "team", "decision", "delegated", "vision", "mentor"],
        "Conflict Resolution": ["resolved", "communicated", "compromise", "understanding", "mediate", "listen"],
        "Teamwork": ["collaborated", "together", "shared", "support", "cooperation", "team"],
        "Problem Solving": ["analyzed", "approach", "solution", "identified", "implemented", "evaluated"],
    }

    matched_keywords = 0
    for cat_key, words in keywords.items():
        if cat_key.lower() in (category or "").lower() or (category or "").lower() in cat_key.lower():
            for word in words:
                if word in answer_lower:
                    matched_keywords += 1
            break

    if matched_keywords >= 4:
        score += 15.0
    elif matched_keywords >= 2:
        score += 10.0
    elif matched_keywords >= 1:
        score += 5.0

    if difficulty == "hard":
        score = score * 1.05
    elif difficulty == "easy":
        score = score * 0.95

    return round(min(score, 100.0), 2)


def generate_feedback(answer: str, score: float) -> str:
    word_count = len(answer.split())

    if score >= 80:
        return "Excellent answer! You demonstrated strong knowledge and provided a well-structured response."
    elif score >= 60:
        if word_count < 30:
            return "Good understanding shown, but try to elaborate more with specific examples."
        return "Solid answer. Consider adding more depth and specific examples to strengthen your response."
    elif score >= 40:
        return "Partial understanding demonstrated. Work on providing more comprehensive and structured answers."
    else:
        if word_count < 10:
            return "Your answer was too brief. Provide detailed explanations to demonstrate your knowledge."
        return "Your answer needs improvement. Focus on the key concepts and provide structured, detailed responses."
