from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
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
    TranscribeChunkRequest,
)
from auth import get_current_user
from services.question_bank import generate_questions as generate_bank_questions
import json
from services import llm
from services import sarvam
from services import gemini_stt
from services import scoring_engine
from services import resume_parser

router = APIRouter(prefix="/api/interviews", tags=["interviews"])


@router.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not file.filename:
        raise HTTPException(400, "Invalid file name.")
    content = await file.read()
    parsed = resume_parser.parse_resume_content(file.filename, content)
    return {"message": "Resume processed successfully.", "resume": parsed}


def _safe_json_loads(val, default=None):
    if not val:
        return default
    try:
        return json.loads(val)
    except Exception:
        return default


def row_to_interview(row) -> dict:
    d = dict(row)
    return {
        "id": d["id"],
        "user_id": d["user_id"],
        "candidate_id": d.get("candidate_id") or d["user_id"],
        "interview_type": d["interview_type"],
        "domain": d["domain"],
        "difficulty": d["difficulty"],
        "duration": d.get("duration") or 15,
        "status": d["status"],
        "total_score": d["total_score"],
        "communication_score": d.get("communication_score"),
        "confidence_score": d.get("confidence_score"),
        "technical_score": d.get("technical_score"),
        "professionalism_score": d.get("professionalism_score"),
        "overall_score": d.get("overall_score"),
        "performance_rating": d.get("performance_rating") or (scoring_engine.get_rating_rubric(d["total_score"]) if d.get("total_score") is not None else None),
        "strengths": _safe_json_loads(d.get("strengths_json"), []),
        "weaknesses": _safe_json_loads(d.get("weaknesses_json"), []),
        "improvements": _safe_json_loads(d.get("improvements_json"), []),
        "recommendations": _safe_json_loads(d.get("recommendations_json"), []),
        "resources": _safe_json_loads(d.get("resources_json"), []),
        "detailed_parameters": _safe_json_loads(d.get("detailed_parameters_json"), {}),
        "started_at": str(d["started_at"]) if d.get("started_at") else None,
        "completed_at": str(d["completed_at"]) if d.get("completed_at") else None,
        "created_at": str(d["created_at"]) if d.get("created_at") else None,
    }


def row_to_question(row) -> dict:
    d = dict(row)
    return {
        "id": d["id"],
        "interview_id": d["interview_id"],
        "question_text": d["question_text"],
        "category": d["category"],
        "difficulty": d["difficulty"],
        "sequence_no": d["sequence_no"],
        "answer_text": d["answer_text"],
        "score": d["score"],
        "communication_score": d.get("communication_score"),
        "confidence_score": d.get("confidence_score"),
        "technical_score": d.get("technical_score"),
        "professionalism_score": d.get("professionalism_score"),
        "parameters": _safe_json_loads(d.get("parameters_json"), {}),
        "feedback": d["feedback"],
    }


@router.post("")
def create_interview(req: InterviewCreateRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    candidate_id = req.candidate_id or user["id"]
    duration = req.duration or 15
    cur = conn.execute(
        "INSERT INTO interview_session (user_id, candidate_id, interview_type, domain, difficulty, duration) VALUES (?, ?, ?, ?, ?, ?)",
        (user["id"], candidate_id, req.interview_type, req.domain, req.difficulty, duration),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM interview_session WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return {"message": "Interview created.", "interview": row_to_interview(row)}


@router.post("/generate")
def generate_interview(req: InterviewGenerateRequest, user: dict = Depends(get_current_user)):
    if req.num_questions:
        num_q = req.num_questions
    elif req.time_duration:
        num_q = max(1, req.time_duration // 4)
    elif req.duration:
        num_q = max(1, req.duration // 4)
    else:
        num_q = 5

    duration = req.duration or req.time_duration or 15

    ai_generated = True
    try:
        questions_data = llm.generate_questions(
            req.interview_type, req.difficulty, req.domain, req.skills, num_q, resume_context=req.resume_context
        )
    except Exception:
        ai_generated = False
        questions_data = generate_bank_questions(
            interview_type=req.interview_type,
            difficulty=req.difficulty,
            domain=req.domain,
            num_questions=num_q,
            skills=req.skills,
        )
    if not questions_data:
        raise HTTPException(400, "Could not generate questions for the given parameters.")

    candidate_id = req.candidate_id or user["id"]
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO interview_session (user_id, candidate_id, interview_type, domain, difficulty, duration, status) VALUES (?, ?, ?, ?, ?, ?, 'created')",
        (user["id"], candidate_id, req.interview_type, req.domain, req.difficulty, duration),
    )
    interview_id = cur.lastrowid



    for q in questions_data:
        conn.execute(
            "INSERT INTO interview_question (interview_id, question_text, category, difficulty, sequence_no) VALUES (?, ?, ?, ?, ?)",
            (interview_id, q["question_text"], q["category"], q["difficulty"], q["sequence_no"]),
        )
    conn.commit()

    interview = conn.execute("SELECT * FROM interview_session WHERE id = ?", (interview_id,)).fetchone()
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
        "SELECT * FROM interview_session WHERE (user_id = ? OR candidate_id = ?) AND status = 'completed' ORDER BY completed_at DESC",
        (user["id"], user["id"]),
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
    query = "SELECT * FROM interview_session WHERE (user_id = ? OR candidate_id = ?)"
    params = [user["id"], user["id"]]

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
        "SELECT * FROM interview_session WHERE id = ? AND (user_id = ? OR candidate_id = ?)", (interview_id, user["id"], user["id"])
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
        "SELECT * FROM interview_session WHERE id = ? AND (user_id = ? OR candidate_id = ?)", (interview_id, user["id"], user["id"])
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Interview not found.")

    updates = []
    values = []
    if req.candidate_id:
        updates.append("candidate_id = ?")
        values.append(req.candidate_id)
    if req.interview_type:
        updates.append("interview_type = ?")
        values.append(req.interview_type)
    if req.domain:
        updates.append("domain = ?")
        values.append(req.domain)
    if req.difficulty:
        updates.append("difficulty = ?")
        values.append(req.difficulty)
    if req.duration:
        updates.append("duration = ?")
        values.append(req.duration)
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
        conn.execute(f"UPDATE interview_session SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()

    updated = conn.execute("SELECT * FROM interview_session WHERE id = ?", (interview_id,)).fetchone()
    conn.close()
    return {"message": "Interview updated.", "interview": row_to_interview(updated)}


@router.delete("/{interview_id}")
def delete_interview(interview_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute(
        "SELECT id FROM interview_session WHERE id = ? AND (user_id = ? OR candidate_id = ?)", (interview_id, user["id"], user["id"])
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Interview not found.")
    conn.execute("DELETE FROM interview_session WHERE id = ?", (interview_id,))
    conn.commit()
    conn.close()
    return {"message": "Interview deleted."}


@router.post("/{interview_id}/start")
def start_interview(interview_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM interview_session WHERE id = ? AND (user_id = ? OR candidate_id = ?)", (interview_id, user["id"], user["id"])
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
        "UPDATE interview_session SET status = 'in_progress', started_at = CURRENT_TIMESTAMP WHERE id = ?",
        (interview_id,),
    )
    conn.commit()

    questions = conn.execute(
        "SELECT * FROM interview_question WHERE interview_id = ? ORDER BY sequence_no", (interview_id,)
    ).fetchall()
    updated = conn.execute("SELECT * FROM interview_session WHERE id = ?", (interview_id,)).fetchone()
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
        "SELECT * FROM interview_session WHERE id = ? AND (user_id = ? OR candidate_id = ?)", (interview_id, user["id"], user["id"])
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

    eval_result = scoring_engine.evaluate_answer_full(
        question["question_text"],
        question["category"] or interview["interview_type"],
        question["difficulty"] or interview["difficulty"],
        req.answer_text,
    )

    conn.execute(
        """UPDATE interview_question SET
            answer_text = ?,
            score = ?,
            communication_score = ?,
            confidence_score = ?,
            technical_score = ?,
            professionalism_score = ?,
            parameters_json = ?,
            feedback = ?
           WHERE id = ?""",
        (
            req.answer_text,
            eval_result["score"],
            eval_result["communication_score"],
            eval_result["confidence_score"],
            eval_result["technical_score"],
            eval_result["professionalism_score"],
            json.dumps(eval_result.get("parameters", {})),
            eval_result["feedback"],
            req.question_id,
        ),
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
        scoring_engine.generate_final_report(interview_id, conn)

    updated_q = conn.execute("SELECT * FROM interview_question WHERE id = ?", (req.question_id,)).fetchone()
    updated_interview = conn.execute("SELECT * FROM interview_session WHERE id = ?", (interview_id,)).fetchone()
    conn.close()

    return {
        "message": "Answer submitted.",
        "ai_evaluated": True,
        "question": row_to_question(updated_q),
        "interview": row_to_interview(updated_interview),
    }


@router.get("/analytics/summary")
def get_analytics_summary(user: dict = Depends(get_current_user)):
    """Return aggregated assessment metrics across all candidate completed interviews."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM interview_session WHERE (user_id = ? OR candidate_id = ?) AND status = 'completed' ORDER BY completed_at DESC",
        (user["id"], user["id"]),
    ).fetchall()

    if not rows:
        conn.close()
        return {
            "sessions_completed": 0,
            "avg_overall": None,
            "avg_communication": None,
            "avg_confidence": None,
            "avg_technical": None,
            "avg_professionalism": None,
            "performance_rating": None,
            "top_skill": None,
            "history": [],
        }

    interviews = [row_to_interview(r) for r in rows]
    total_count = len(interviews)

    overall_scores = [i["overall_score"] or i["total_score"] or 0 for i in interviews]
    comm_scores = [i["communication_score"] or i["total_score"] or 0 for i in interviews]
    conf_scores = [i["confidence_score"] or i["total_score"] or 0 for i in interviews]
    tech_scores = [i["technical_score"] or i["total_score"] or 0 for i in interviews]
    prof_scores = [i["professionalism_score"] or i["total_score"] or 0 for i in interviews]

    avg_overall = round(sum(overall_scores) / total_count, 2)
    avg_comm = round(sum(comm_scores) / total_count, 2)
    avg_conf = round(sum(conf_scores) / total_count, 2)
    avg_tech = round(sum(tech_scores) / total_count, 2)
    avg_prof = round(sum(prof_scores) / total_count, 2)

    rating = scoring_engine.get_rating_rubric(avg_overall)

    # Determine top skill category
    skill_averages = {
        "Communication": avg_comm,
        "Confidence": avg_conf,
        "Technical Relevance": avg_tech,
        "Professionalism": avg_prof,
    }
    top_skill = max(skill_averages, key=skill_averages.get)

    conn.close()
    return {
        "sessions_completed": total_count,
        "avg_overall": avg_overall,
        "avg_communication": avg_comm,
        "avg_confidence": avg_conf,
        "avg_technical": avg_tech,
        "avg_professionalism": avg_prof,
        "performance_rating": rating,
        "top_skill": top_skill,
        "history": interviews,
    }


@router.get("/{interview_id}/report")
def get_interview_report(interview_id: int, user: dict = Depends(get_current_user)):
    """Fetch complete AI Feedback & Scoring Report for a specific completed interview."""
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM interview_session WHERE id = ? AND (user_id = ? OR candidate_id = ?)", (interview_id, user["id"], user["id"])
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Interview not found.")

    if row["status"] != "completed":
        scoring_engine.generate_final_report(interview_id, conn)
        row = conn.execute("SELECT * FROM interview_session WHERE id = ?", (interview_id,)).fetchone()

    questions = conn.execute(
        "SELECT * FROM interview_question WHERE interview_id = ? ORDER BY sequence_no", (interview_id,)
    ).fetchall()
    conn.close()

    interview_data = row_to_interview(row)
    interview_data["questions"] = [row_to_question(q) for q in questions]
    return interview_data


@router.post("/{interview_id}/speak")
def speak_question(interview_id: int, req: InterviewQuestionRequest, user: dict = Depends(get_current_user)):
    """Turn the current question into interviewer audio using Sarvam AI Bulbul V3 TTS."""
    conn = get_db()
    question = conn.execute(
        """SELECT q.question_text, q.sequence_no FROM interview_question q
           JOIN interview_session i ON i.id = q.interview_id
           WHERE q.id = ? AND q.interview_id = ? AND (i.user_id = ? OR i.candidate_id = ?)""",
        (req.question_id, interview_id, user["id"], user["id"]),
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


@router.post("/transcribe-chunk")
def transcribe_chunk(req: TranscribeChunkRequest, user: dict = Depends(get_current_user)):
    """Transcribe audio using Gemini 2.0 Flash (primary) or MiMo/Deepseek (fallback)."""
    audio_data = req.audio_chunk
    if "," in audio_data:
        _, audio_data = audio_data.split(",", 1)
    try:
        transcript = gemini_stt.transcribe_audio(audio_data, req.mime_type)
    except gemini_stt.STTError as error:
        raise HTTPException(503, str(error)) from error
    return {"transcript": transcript}


@router.post("/{interview_id}/questions")
def add_question(interview_id: int, req: InterviewQuestionCreateRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    interview = conn.execute(
        "SELECT id FROM interview_session WHERE id = ? AND (user_id = ? OR candidate_id = ?)", (interview_id, user["id"], user["id"])
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
        "SELECT id FROM interview_session WHERE id = ? AND (user_id = ? OR candidate_id = ?)", (interview_id, user["id"], user["id"])
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
