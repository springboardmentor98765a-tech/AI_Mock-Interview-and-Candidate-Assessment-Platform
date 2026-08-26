from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import AssessmentGenerateRequest, AssessmentSubmitRequest
from auth import get_current_user
from services import llm
import json
import random

router = APIRouter(prefix="/api/assessments", tags=["assessments"])


def _safe_json_loads(val, default=None):
    if not val:
        return default
    try:
        return json.loads(val)
    except Exception:
        return default


def row_to_assessment(row, include_answers: bool = False) -> dict:
    d = dict(row)
    return {
        "id": d["id"],
        "user_id": d["user_id"],
        "target_role": d.get("target_role"),
        "topics": _safe_json_loads(d.get("topics_json"), []),
        "difficulty": d.get("difficulty"),
        "num_questions": d.get("num_questions"),
        "time_limit_minutes": d.get("time_limit_minutes"),
        "status": d.get("status"),
        "resume_context": _safe_json_loads(d.get("resume_context_json")),
        "started_at": str(d["started_at"]) if d.get("started_at") else None,
        "completed_at": str(d["completed_at"]) if d.get("completed_at") else None,
        "score_percentage": d.get("score_percentage"),
        "total_questions": d.get("total_questions"),
        "correct_answers": d.get("correct_answers"),
        "incorrect_answers": d.get("incorrect_answers"),
        "unanswered": d.get("unanswered"),
        "topic_performance": _safe_json_loads(d.get("topic_performance_json"), {}),
        "difficulty_performance": _safe_json_loads(d.get("difficulty_performance_json"), {}),
        "integrity_metrics": _safe_json_loads(d.get("integrity_metrics_json"), {}),
        "ai_feedback": _safe_json_loads(d.get("ai_feedback_json"), {}),
        "created_at": str(d["created_at"]) if d.get("created_at") else None,
    }


def row_to_assessment_question(row, hide_correct: bool = True) -> dict:
    d = dict(row)
    q = {
        "id": d["id"],
        "assessment_id": d["assessment_id"],
        "sequence_no": d["sequence_no"],
        "question_text": d["question_text"],
        "options": _safe_json_loads(d.get("options_json"), []),
        "topic": d.get("topic"),
        "difficulty": d.get("difficulty"),
        "candidate_answer": d.get("candidate_answer"),
    }
    if not hide_correct:
        q["correct_answer"] = d.get("correct_answer")
        q["explanation"] = d.get("explanation")
        q["is_correct"] = bool(d.get("is_correct")) if d.get("is_correct") is not None else None
    return q


def _fallback_mcq_generator(target_role: str, topics: list[str], difficulty: str, num_q: int, resume_ctx: dict = None) -> list[dict]:
    """Generates structured fallback MCQs if LLM fails or is unconfigured."""
    sample_topics = topics if topics else ["Programming", "Data Structures", "System Design", "Databases"]
    mcqs = []
    
    known_mcq_bank = [
        {
            "question_text": "Which data structure follows the First In, First Out (FIFO) principle?",
            "options": ["Stack", "Queue", "Tree", "Graph"],
            "correct_answer": "Queue",
            "explanation": "A Queue operates on a FIFO basis where elements inserted first are removed first.",
            "topic": "Data Structures",
            "difficulty": "easy",
        },
        {
            "question_text": "What is the primary function of an Index in a database table?",
            "options": ["To enforce foreign keys", "To speed up data retrieval queries", "To compress data storage", "To encrypt table rows"],
            "correct_answer": "To speed up data retrieval queries",
            "explanation": "Indexes create data structures (like B-Trees) that allow the database to locate rows quickly without full table scans.",
            "topic": "Databases",
            "difficulty": "medium",
        },
        {
            "question_text": "Which HTTP status code indicates a successful resource creation?",
            "options": ["200 OK", "201 Created", "204 No Content", "302 Found"],
            "correct_answer": "201 Created",
            "explanation": "201 Created indicates that the HTTP request succeeded and a new resource was created as a result.",
            "topic": "Web Development",
            "difficulty": "easy",
        },
        {
            "question_text": "What does the CAP theorem state regarding distributed data stores?",
            "options": [
                "A system can provide Consistency, Availability, and Partition Tolerance all at once.",
                "A system can provide at most two out of Consistency, Availability, and Partition Tolerance simultaneously.",
                "Consistency is always guaranteed over partition tolerance.",
                "Availability requires synchronous replication across all nodes."
            ],
            "correct_answer": "A system can provide at most two out of Consistency, Availability, and Partition Tolerance simultaneously.",
            "explanation": "The CAP theorem proves it is impossible for a distributed data store to simultaneously provide more than two of: Consistency, Availability, and Partition tolerance.",
            "topic": "System Design",
            "difficulty": "hard",
        },
        {
            "question_text": "In Python, which keyword is used to create a generator function?",
            "options": ["return", "yield", "generate", "async"],
            "correct_answer": "yield",
            "explanation": "The yield keyword suspends function execution and returns a generator iterator.",
            "topic": "Python",
            "difficulty": "medium",
        },
    ]

    for i in range(num_q):
        if i < len(known_mcq_bank):
            base = dict(known_mcq_bank[i])
        else:
            top = sample_topics[i % len(sample_topics)]
            base = {
                "question_text": f"In {top} for a {target_role} role, what is the primary consideration when evaluating scalability?",
                "options": [
                    f"Optimizing {top} execution latency and resource allocation",
                    f"Avoiding all memory allocations in {top}",
                    f"Increasing network bandwidth without changing code",
                    f"Disabling database indexing for {top}"
                ],
                "correct_answer": f"Optimizing {top} execution latency and resource allocation",
                "explanation": f"Scalability in {top} requires balancing time complexity with system resource allocation.",
                "topic": top,
                "difficulty": difficulty,
            }
        mcqs.append(base)
    
    return mcqs


@router.post("/generate")
def generate_assessment(req: AssessmentGenerateRequest, user: dict = Depends(get_current_user)):
    num_q = req.num_questions
    topics_str = ", ".join(req.topics) if req.topics else "General Technical & Aptitude"
    
    prompt = f"""Generate {num_q} multiple choice questions (MCQs) for a technical practice assessment.
Target Role: {req.target_role}
Selected Topics: {topics_str}
Difficulty: {req.difficulty}
Resume Context: {json.dumps(req.resume_context) if req.resume_context else 'None'}

Return ONLY a valid JSON array of objects. Each object MUST contain:
- "question_text": string
- "options": list of 4 distinct string choices
- "correct_answer": string (MUST EXACTLY match one of the items in the "options" list)
- "explanation": string explaining why the correct answer is right
- "topic": string (one of the selected topics or a relevant skill)
- "difficulty": "easy", "medium", or "hard"
"""

    mcqs = []
    if llm.configured():
        try:
            raw_res = llm.chat_json({"messages": [{"role": "user", "content": prompt}]}, is_quiz=True, is_resume=bool(req.resume_context))
            if isinstance(raw_res, list):
                mcqs = raw_res
            elif isinstance(raw_res, dict) and "questions" in raw_res:
                mcqs = raw_res["questions"]
        except Exception:
            mcqs = []

            
    if not mcqs or len(mcqs) < num_q:
        mcqs = _fallback_mcq_generator(req.target_role, req.topics, req.difficulty, num_q, req.resume_context)

    # Ensure format consistency
    formatted_mcqs = []
    for i, q in enumerate(mcqs[:num_q]):
        opts = q.get("options", ["Option A", "Option B", "Option C", "Option D"])
        if len(opts) < 4:
            opts = (opts + ["Option A", "Option B", "Option C", "Option D"])[:4]
        corr = q.get("correct_answer", opts[0])
        if corr not in opts:
            corr = opts[0]
        formatted_mcqs.append({
            "sequence_no": i + 1,
            "question_text": q.get("question_text", f"Question {i+1}"),
            "options_json": json.dumps(opts),
            "correct_answer": corr,
            "explanation": q.get("explanation", "The selected option is correct based on industry best practices."),
            "topic": q.get("topic", req.topics[0] if req.topics else "General"),
            "difficulty": q.get("difficulty", req.difficulty),
        })

    conn = get_db()
    cur = conn.execute(
        """INSERT INTO assessment 
           (user_id, target_role, topics_json, difficulty, num_questions, time_limit_minutes, status, resume_context_json)
           VALUES (?, ?, ?, ?, ?, ?, 'created', ?)""",
        (
            user["id"],
            req.target_role,
            json.dumps(req.topics),
            req.difficulty,
            num_q,
            req.time_limit_minutes,
            json.dumps(req.resume_context) if req.resume_context else None,
        ),
    )
    assessment_id = cur.lastrowid

    for q in formatted_mcqs:
        conn.execute(
            """INSERT INTO assessment_question 
               (assessment_id, sequence_no, question_text, options_json, correct_answer, explanation, topic, difficulty)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                assessment_id,
                q["sequence_no"],
                q["question_text"],
                q["options_json"],
                q["correct_answer"],
                q["explanation"],
                q["topic"],
                q["difficulty"],
            ),
        )
    conn.commit()

    assessment_row = conn.execute("SELECT * FROM assessment WHERE id = ?", (assessment_id,)).fetchone()
    question_rows = conn.execute(
        "SELECT * FROM assessment_question WHERE assessment_id = ? ORDER BY sequence_no ASC", (assessment_id,)
    ).fetchall()
    conn.close()

    res_assessment = row_to_assessment(assessment_row)
    res_questions = [row_to_assessment_question(r, hide_correct=True) for r in question_rows]

    return {"message": "Assessment generated.", "assessment": res_assessment, "questions": res_questions}


@router.post("/{assessment_id}/start")
def start_assessment(assessment_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT * FROM assessment WHERE id = ? AND user_id = ?", (assessment_id, user["id"])).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Assessment not found.")

    conn.execute("UPDATE assessment SET status = 'in_progress', started_at = CURRENT_TIMESTAMP WHERE id = ?", (assessment_id,))
    conn.commit()
    updated_row = conn.execute("SELECT * FROM assessment WHERE id = ?", (assessment_id,)).fetchone()
    question_rows = conn.execute(
        "SELECT * FROM assessment_question WHERE assessment_id = ? ORDER BY sequence_no ASC", (assessment_id,)
    ).fetchall()
    conn.close()

    return {
        "message": "Assessment started.",
        "assessment": row_to_assessment(updated_row),
        "questions": [row_to_assessment_question(r, hide_correct=True) for r in question_rows],
    }


@router.get("/history")
def get_assessment_history(user: dict = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM assessment WHERE user_id = ? AND status = 'completed' ORDER BY completed_at DESC", (user["id"],)
    ).fetchall()
    conn.close()

    return {"assessments": [row_to_assessment(r) for r in rows]}


@router.get("/{assessment_id}")
def get_assessment(assessment_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT * FROM assessment WHERE id = ? AND user_id = ?", (assessment_id, user["id"])).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Assessment not found.")

    question_rows = conn.execute(
        "SELECT * FROM assessment_question WHERE assessment_id = ? ORDER BY sequence_no ASC", (assessment_id,)
    ).fetchall()
    conn.close()

    is_completed = (row["status"] == "completed")
    return {
        "assessment": row_to_assessment(row, include_answers=is_completed),
        "questions": [row_to_assessment_question(r, hide_correct=not is_completed) for r in question_rows],
    }


@router.post("/{assessment_id}/submit")
def submit_assessment(assessment_id: int, req: AssessmentSubmitRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT * FROM assessment WHERE id = ? AND user_id = ?", (assessment_id, user["id"])).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Assessment not found.")

    question_rows = conn.execute(
        "SELECT * FROM assessment_question WHERE assessment_id = ? ORDER BY sequence_no ASC", (assessment_id,)
    ).fetchall()

    total_q = len(question_rows)
    if total_q == 0:
        conn.close()
        raise HTTPException(400, "Assessment has no questions.")

    correct_cnt = 0
    incorrect_cnt = 0
    unanswered_cnt = 0

    topic_stats = {}
    diff_stats = {}

    for r in question_rows:
        q_id = str(r["id"])
        cand_ans = req.answers.get(q_id, "").strip()
        correct_ans = (r["correct_answer"] or "").strip()
        topic = r["topic"] or "General"
        diff = r["difficulty"] or "medium"

        if topic not in topic_stats:
            topic_stats[topic] = {"total": 0, "correct": 0}
        if diff not in diff_stats:
            diff_stats[diff] = {"total": 0, "correct": 0}

        topic_stats[topic]["total"] += 1
        diff_stats[diff]["total"] += 1

        is_corr = 0
        if not cand_ans:
            unanswered_cnt += 1
        elif cand_ans.casefold() == correct_ans.casefold():
            is_corr = 1
            correct_cnt += 1
            topic_stats[topic]["correct"] += 1
            diff_stats[diff]["correct"] += 1
        else:
            incorrect_cnt += 1

        conn.execute(
            "UPDATE assessment_question SET candidate_answer = ?, is_correct = ? WHERE id = ?",
            (cand_ans, is_corr, r["id"]),
        )

    score_pct = round((correct_cnt / total_q) * 100.0, 1)

    # Compute breakdown dicts
    topic_perf = {
        t: {"total": s["total"], "correct": s["correct"], "percentage": round((s["correct"] / s["total"]) * 100, 1)}
        for t, s in topic_stats.items()
    }
    diff_perf = {
        d: {"total": s["total"], "correct": s["correct"], "percentage": round((s["correct"] / s["total"]) * 100, 1)}
        for d, s in diff_stats.items()
    }

    # Generate AI Feedback via LLM
    feedback_prompt = f"""Candidate completed a practice assessment for the target role: {row['target_role']}.
Overall Score: {score_pct}% ({correct_cnt}/{total_q} correct).
Topic Performance: {json.dumps(topic_perf)}
Difficulty Performance: {json.dumps(diff_perf)}
Resume Context: {row['resume_context_json']}

Generate structured assessment feedback as a JSON object with keys:
- "strengths": list of strings
- "areas_to_improve": list of strings
- "recommended_topics": list of strings
- "difficulty_recommendation": string (e.g. "Ready for Hard difficulty" or "Practice Medium difficulty core concepts")
- "personalized_suggestions": list of strings
"""
    ai_fb = {}
    if llm.configured():
        try:
            fb_res = llm.chat_json({"messages": [{"role": "user", "content": feedback_prompt}]})
            if isinstance(fb_res, dict):
                ai_fb = fb_res
        except Exception:
            ai_fb = {}

    if not ai_fb:
        ai_fb = {
            "strengths": [f"Demonstrated good accuracy in {t}" for t, s in topic_perf.items() if s["percentage"] >= 70] or ["Completed the assessment within the designated time limit."],
            "areas_to_improve": [f"Review foundational concepts in {t}" for t, s in topic_perf.items() if s["percentage"] < 70] or ["Focus on speed and precision when answering complex questions."],
            "recommended_topics": list(topic_perf.keys()),
            "difficulty_recommendation": "Ready for higher difficulty tier" if score_pct >= 80 else "Consolidate core principles before advancing",
            "personalized_suggestions": [
                "Practice topic-specific quizzes to boost accuracy.",
                "Review the detailed explanation key for any missed questions.",
            ],
        }

    conn.execute(
        """UPDATE assessment SET 
           status = 'completed',
           completed_at = CURRENT_TIMESTAMP,
           score_percentage = ?,
           total_questions = ?,
           correct_answers = ?,
           incorrect_answers = ?,
           unanswered = ?,
           topic_performance_json = ?,
           difficulty_performance_json = ?,
           integrity_metrics_json = ?,
           ai_feedback_json = ?
           WHERE id = ?""",
        (
            score_pct,
            total_q,
            correct_cnt,
            incorrect_cnt,
            unanswered_cnt,
            json.dumps(topic_perf),
            json.dumps(diff_perf),
            json.dumps(req.integrity_metrics) if req.integrity_metrics else None,
            json.dumps(ai_fb),
            assessment_id,
        ),
    )
    conn.commit()

    updated_assessment = conn.execute("SELECT * FROM assessment WHERE id = ?", (assessment_id,)).fetchone()
    updated_questions = conn.execute(
        "SELECT * FROM assessment_question WHERE assessment_id = ? ORDER BY sequence_no ASC", (assessment_id,)
    ).fetchall()
    conn.close()

    return {
        "message": "Assessment submitted successfully.",
        "assessment": row_to_assessment(updated_assessment, include_answers=True),
        "questions": [row_to_assessment_question(r, hide_correct=False) for r in updated_questions],
    }
