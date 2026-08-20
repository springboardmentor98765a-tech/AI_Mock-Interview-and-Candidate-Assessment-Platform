from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Optional
import os
import time
import json
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
    InterviewRecordingCreateRequest,
    InterviewRecordingResponse,
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


def _format_utc_iso(ts) -> str | None:
    if not ts:
        return None
    s = str(ts).strip()
    if not s:
        return None
    if "T" not in s and " " in s:
        s = s.replace(" ", "T")
    if not s.endswith("Z") and "+" not in s and "-" not in s[10:]:
        s += "Z"
    return s


def row_to_interview(row) -> dict:
    d = dict(row)
    detailed_params = _safe_json_loads(d.get("detailed_parameters_json"), {})
    grammar_analysis = _safe_json_loads(d.get("grammar_analysis_json"), {})
    filler_analysis = _safe_json_loads(d.get("filler_analysis_json"), {})
    pronunciation_analysis = _safe_json_loads(d.get("pronunciation_analysis_json"), {})
    communication_analysis = _safe_json_loads(d.get("communication_analysis_json"), {})

    # If top-level columns not set yet, fallback from detailed_params if present
    if not grammar_analysis and "grammar_quality" in detailed_params:
        g_score = detailed_params.get("grammar_quality", d.get("communication_score") or 90)
        grammar_analysis = {"grammar_score": g_score, "issues_count": 0, "issues": [], "message": "No major grammar issues detected."}
    if not filler_analysis and "filler_word_freq" in detailed_params:
        f_score = detailed_params.get("filler_word_freq", 95)
        filler_analysis = {"filler_score": f_score, "filler_count": 0, "filler_words": [], "filler_status": "Clear Fluency"}
    if not pronunciation_analysis and "speech_clarity" in detailed_params:
        p_score = detailed_params.get("speech_clarity", d.get("communication_score") or 90)
        pronunciation_analysis = {"pronunciation_score": p_score, "pronunciation_status": "Crisp & Articulate", "pronunciation_notes": []}
    if not communication_analysis and d.get("communication_score"):
        communication_analysis = {
            "communication_score": d.get("communication_score"),
            "parameters": {
                "speech_clarity": detailed_params.get("speech_clarity", d.get("communication_score")),
                "grammar_quality": detailed_params.get("grammar_quality", d.get("communication_score")),
                "filler_word_freq": detailed_params.get("filler_word_freq", 95),
                "speaking_pace": detailed_params.get("speaking_pace", 85),
                "response_completeness": detailed_params.get("response_completeness", d.get("communication_score")),
            },
            "grammar_analysis": grammar_analysis,
            "filler_analysis": filler_analysis,
            "pronunciation_analysis": pronunciation_analysis,
        }

    return {
        "id": d["id"],
        "user_id": d["user_id"],
        "candidate_id": d.get("candidate_id") or d["user_id"],
        "interview_type": d["interview_type"],
        "domain": d["domain"],
        "difficulty": d["difficulty"],
        "duration": d.get("duration") or 15,
        "status": d["status"],
        "elapsed_seconds": d.get("elapsed_seconds") or 0,
        "current_question_index": d.get("current_question_index") or 0,
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
        "detailed_parameters": detailed_params,
        "grammar_analysis": grammar_analysis,
        "filler_analysis": filler_analysis,
        "pronunciation_analysis": pronunciation_analysis,
        "communication_analysis": communication_analysis,
        "started_at": _format_utc_iso(d.get("started_at")),
        "completed_at": _format_utc_iso(d.get("completed_at")),
        "created_at": _format_utc_iso(d.get("created_at")),
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
        "grammar_analysis": _safe_json_loads(d.get("grammar_json"), {}),
        "filler_analysis": _safe_json_loads(d.get("filler_json"), {}),
        "pronunciation_analysis": _safe_json_loads(d.get("pronunciation_json"), {}),
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
        if req.status not in ("created", "in_progress", "paused", "completed"):
            conn.close()
            raise HTTPException(400, "Invalid status.")
        updates.append("status = ?")
        values.append(req.status)
        if req.status == "in_progress" and not row["started_at"]:
            updates.append("started_at = CURRENT_TIMESTAMP")
        if req.status == "completed":
            updates.append("completed_at = CURRENT_TIMESTAMP")
    if req.elapsed_seconds is not None:
        updates.append("elapsed_seconds = ?")
        values.append(req.elapsed_seconds)
    if req.current_question_index is not None:
        updates.append("current_question_index = ?")
        values.append(req.current_question_index)

    if updates:
        values.append(interview_id)
        conn.execute(f"UPDATE interview_session SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()

    if req.status == "completed":
        scoring_engine.generate_final_report(interview_id, conn)

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

    conn.execute(
        "UPDATE interview_session SET status = 'in_progress', started_at = COALESCE(started_at, CURRENT_TIMESTAMP) WHERE id = ?",
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


@router.post("/{interview_id}/pause")
def pause_interview(interview_id: int, user: dict = Depends(get_current_user)):
    return update_interview(interview_id, InterviewUpdateRequest(status="paused"), user)


@router.post("/{interview_id}/resume")
def resume_interview(interview_id: int, user: dict = Depends(get_current_user)):
    return update_interview(interview_id, InterviewUpdateRequest(status="in_progress"), user)


@router.post("/{interview_id}/end")
def end_interview(interview_id: int, user: dict = Depends(get_current_user)):
    return update_interview(interview_id, InterviewUpdateRequest(status="completed"), user)



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

    q_cols = {r["name"] for r in conn.execute("PRAGMA table_info(interview_question)").fetchall()}
    if "grammar_json" not in q_cols:
        conn.execute("ALTER TABLE interview_question ADD COLUMN grammar_json TEXT")
    if "filler_json" not in q_cols:
        conn.execute("ALTER TABLE interview_question ADD COLUMN filler_json TEXT")
    if "pronunciation_json" not in q_cols:
        conn.execute("ALTER TABLE interview_question ADD COLUMN pronunciation_json TEXT")

    conn.execute(
        """UPDATE interview_question SET
            answer_text = ?,
            score = ?,
            communication_score = ?,
            confidence_score = ?,
            technical_score = ?,
            professionalism_score = ?,
            parameters_json = ?,
            grammar_json = ?,
            filler_json = ?,
            pronunciation_json = ?,
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
            json.dumps(eval_result.get("grammar_analysis", {})),
            json.dumps(eval_result.get("filler_analysis", {})),
            json.dumps(eval_result.get("pronunciation_analysis", {})),
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
    user_role = user.get("role", "candidate")
    if user_role in ("recruiter", "admin"):
        row = conn.execute("SELECT * FROM interview_session WHERE id = ?", (interview_id,)).fetchone()
    else:
        row = conn.execute(
            "SELECT * FROM interview_session WHERE id = ? AND (user_id = ? OR candidate_id = ?)", (interview_id, user["id"], user["id"])
        ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Interview not found.")

    if row["status"] != "completed" or row["total_score"] is None or row["overall_score"] is None:
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


def row_to_recording(row) -> dict:
    d = dict(row)
    return {
        "id": d["id"],
        "session_id": d["session_id"],
        "recording_type": d["recording_type"],
        "file_path": d["file_path"],
        "duration": d.get("duration"),
        "mime_type": d.get("mime_type"),
        "file_size_bytes": d.get("file_size_bytes"),
        "status": d.get("status"),
        "created_at": str(d["created_at"]) if d.get("created_at") else None,
    }


@router.post("/{interview_id}/recordings")
def create_recording(interview_id: int, req: InterviewRecordingCreateRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    interview = conn.execute(
        "SELECT id FROM interview_session WHERE id = ? AND (user_id = ? OR candidate_id = ?)", (interview_id, user["id"], user["id"])
    ).fetchone()
    if not interview:
        conn.close()
        raise HTTPException(404, "Interview not found.")
    cur = conn.execute(
        "INSERT INTO interview_recording (session_id, recording_type, file_path, duration, mime_type, file_size_bytes, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (interview_id, req.recording_type, req.file_path, req.duration, req.mime_type, req.file_size_bytes, req.status or 'completed'),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM interview_recording WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return {"message": "Recording saved.", "recording": row_to_recording(row)}


@router.get("/recordings/all")
def list_all_recordings(user: dict = Depends(get_current_user)):
    """List all interview recordings accessible to the current user.
    Candidates see their own session recordings. Recruiters and Admins see all recordings.
    """
    conn = get_db()
    user_role = user.get("role", "candidate")
    if user_role in ("recruiter", "admin"):
        query = """
            SELECT r.*, s.interview_type, s.domain, s.difficulty, s.created_at as session_created_at,
                   s.overall_score, s.performance_rating, u.name as candidate_name, u.email as candidate_email
            FROM interview_recording r
            LEFT JOIN interview_session s ON s.id = r.session_id
            LEFT JOIN users u ON u.id = COALESCE(s.candidate_id, s.user_id)
            ORDER BY r.created_at DESC
        """
        rows = conn.execute(query).fetchall()
    else:
        query = """
            SELECT r.*, s.interview_type, s.domain, s.difficulty, s.created_at as session_created_at,
                   s.overall_score, s.performance_rating, u.name as candidate_name, u.email as candidate_email
            FROM interview_recording r
            LEFT JOIN interview_session s ON s.id = r.session_id
            LEFT JOIN users u ON u.id = COALESCE(s.candidate_id, s.user_id)
            WHERE s.user_id = ? OR s.candidate_id = ? OR r.session_id IN (SELECT id FROM interview_session WHERE user_id = ? OR candidate_id = ?)
            ORDER BY r.created_at DESC
        """
        rows = conn.execute(query, (user["id"], user["id"], user["id"], user["id"])).fetchall()

    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        results.append({
            "id": d["id"],
            "session_id": d["session_id"],
            "recording_type": d["recording_type"],
            "file_path": d["file_path"],
            "duration": d.get("duration") or 0,
            "mime_type": d.get("mime_type") or "video/webm",
            "file_size_bytes": d.get("file_size_bytes") or 0,
            "status": d.get("status") or "completed",
            "created_at": str(d["created_at"]) if d.get("created_at") else None,
            "interview_type": d.get("interview_type") or "Technical",
            "domain": d.get("domain") or "General",
            "difficulty": d.get("difficulty") or "medium",
            "overall_score": d.get("overall_score"),
            "performance_rating": d.get("performance_rating"),
            "candidate_name": d.get("candidate_name") or "Candidate",
            "candidate_email": d.get("candidate_email") or "",
        })

    return {"recordings": results}


@router.get("/{interview_id}/recordings")
def list_recordings(interview_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    user_role = user.get("role", "candidate")
    if user_role in ("recruiter", "admin"):
        interview = conn.execute("SELECT id FROM interview_session WHERE id = ?", (interview_id,)).fetchone()
    else:
        interview = conn.execute(
            "SELECT id FROM interview_session WHERE id = ? AND (user_id = ? OR candidate_id = ?)", (interview_id, user["id"], user["id"])
        ).fetchone()
    if not interview:
        conn.close()
        raise HTTPException(404, "Interview not found.")
    rows = conn.execute(
        "SELECT * FROM interview_recording WHERE session_id = ? ORDER BY created_at ASC", (interview_id,)
    ).fetchall()
    conn.close()
    return {"recordings": [row_to_recording(r) for r in rows]}


@router.post("/{interview_id}/recordings/upload")
async def upload_recording(
    interview_id: int,
    file: UploadFile = File(...),
    recording_type: str = Form("video"),
    duration: Optional[int] = Form(None),
    mime_type: Optional[str] = Form(None),
    user: dict = Depends(get_current_user)
):
    conn = get_db()
    user_role = user.get("role", "candidate")
    if user_role in ("recruiter", "admin"):
        interview = conn.execute("SELECT id FROM interview_session WHERE id = ?", (interview_id,)).fetchone()
    else:
        interview = conn.execute(
            "SELECT id FROM interview_session WHERE id = ? AND (user_id = ? OR candidate_id = ?)",
            (interview_id, user["id"], user["id"])
        ).fetchone()

    if not interview:
        conn.close()
        raise HTTPException(404, "Interview session not found or unauthorized.")

    content = await file.read()
    file_size = len(content)
    file_mime = mime_type or file.content_type or "video/webm"

    ext = "webm"
    if "mp4" in file_mime:
        ext = "mp4"
    elif "matroska" in file_mime or "mkv" in file_mime:
        ext = "mkv"
    elif "ogg" in file_mime:
        ext = "ogg"
    elif "wav" in file_mime:
        ext = "wav"

    recordings_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "recordings")
    os.makedirs(recordings_dir, exist_ok=True)

    filename = f"rec_{interview_id}_{int(time.time())}.{ext}"
    save_path = os.path.join(recordings_dir, filename)

    with open(save_path, "wb") as f:
        f.write(content)

    cur = conn.execute(
        "INSERT INTO interview_recording (session_id, recording_type, file_path, duration, mime_type, file_size_bytes, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (interview_id, recording_type, save_path, duration or 0, file_mime, file_size, "completed"),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM interview_recording WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return {"message": "Recording uploaded successfully.", "recording": row_to_recording(row)}


@router.get("/{interview_id}/recordings/{recording_id}/stream")
def stream_recording(interview_id: int, recording_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    user_role = user.get("role", "candidate")
    if user_role in ("recruiter", "admin"):
        interview = conn.execute("SELECT id FROM interview_session WHERE id = ?", (interview_id,)).fetchone()
    else:
        interview = conn.execute(
            "SELECT id FROM interview_session WHERE id = ? AND (user_id = ? OR candidate_id = ?)",
            (interview_id, user["id"], user["id"])
        ).fetchone()

    if not interview:
        conn.close()
        raise HTTPException(404, "Interview session not found or unauthorized.")

    rec = conn.execute(
        "SELECT * FROM interview_recording WHERE id = ? AND session_id = ?",
        (recording_id, interview_id)
    ).fetchone()
    conn.close()

    if not rec:
        raise HTTPException(404, "Recording not found.")

    rec_dict = dict(rec)
    path = rec_dict["file_path"]
    if not os.path.exists(path):
        raise HTTPException(404, "Recording file missing on disk.")

    return FileResponse(path, media_type=rec_dict.get("mime_type") or "video/webm", filename=os.path.basename(path))


@router.delete("/{interview_id}/recordings/{recording_id}")
@router.delete("/recordings/{recording_id}")
def delete_recording(recording_id: int, interview_id: Optional[int] = None, user: dict = Depends(get_current_user)):
    conn = get_db()
    rec = conn.execute("SELECT * FROM interview_recording WHERE id = ?", (recording_id,)).fetchone()
    if not rec:
        conn.close()
        raise HTTPException(404, "Recording not found.")
    rec_dict = dict(rec)
    sess_id = rec_dict["session_id"]
    user_role = user.get("role", "candidate")
    if user_role not in ("recruiter", "admin"):
        sess = conn.execute(
            "SELECT id FROM interview_session WHERE id = ? AND (user_id = ? OR candidate_id = ?)",
            (sess_id, user["id"], user["id"])
        ).fetchone()
        if not sess:
            conn.close()
            raise HTTPException(403, "Unauthorized to delete this recording.")

    file_path = rec_dict.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    conn.execute("DELETE FROM interview_recording WHERE id = ?", (recording_id,))
    conn.commit()
    conn.close()
    return {"message": "Recording deleted successfully."}




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
