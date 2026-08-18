import os
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from backend.auth import get_current_user, require_role
from backend.database import db
from backend.services.gemini_service import (
    generate_interview_questions,
    evaluate_candidate_answer,
    generate_performance_report
)

router = APIRouter(prefix="/api/interview", tags=["AI Interview Generation & Execution"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RECORDINGS_DIR = os.path.join(BASE_DIR, "recordings")
os.makedirs(RECORDINGS_DIR, exist_ok=True)

class CreateInterviewRequest(BaseModel):
    domain: str = "Full Stack"
    difficulty: str = "Medium" # Easy, Medium, Hard
    type: str = "Technical" # Technical, Behavioral, HR, Aptitude
    question_count: int = 4

class AnswerQuestionRequest(BaseModel):
    question_id: int
    candidate_answer: str
    time_spent: int = 0

class EndSessionRequest(BaseModel):
    total_duration: int = 0

@router.post("/create")
def create_interview(
    req: CreateInterviewRequest,
    current_user: dict = Depends(require_role(["candidate"]))
):
    user_id = current_user["id"]
    
    # Retrieve parsed candidate skills if available
    candidate_resume = db.resumes.get(user_id)
    skills = []
    if candidate_resume and "parsed_data" in candidate_resume:
        skills = candidate_resume["parsed_data"].get("skills", [])

    # Generate adaptive AI questions using Gemini 2.5 Flash
    questions = generate_interview_questions(
        domain=req.domain,
        difficulty=req.difficulty,
        question_type=req.type,
        skills=skills,
        count=req.question_count
    )

    interview_id = f"int_{uuid.uuid4().hex[:8]}"
    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    
    interview_obj = {
        "id": interview_id,
        "session_id": session_id,
        "user_id": user_id,
        "candidate_name": current_user["full_name"],
        "domain": req.domain,
        "difficulty": req.difficulty,
        "type": req.type,
        "status": "Created", # Created, In Progress, Paused, Ended, Completed
        "start_time": None,
        "end_time": None,
        "duration_seconds": 0,
        "questions": questions,
        "questions_attempted": 0,
        "question_times": {},
        "video_recording_ref": None,
        "audio_recording_ref": None,
        "report": None,
        "created_at": datetime.datetime.now().isoformat()
    }

    db.interviews[interview_id] = interview_obj

    return {
        "message": "AI interview session created successfully",
        "interview_id": interview_id,
        "interview": interview_obj
    }

@router.get("/{interview_id}")
def get_interview(
    interview_id: str,
    current_user: dict = Depends(get_current_user)
):
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found.")
        
    # Candidates can only view their own interview unless recruiter/admin
    if current_user["role"] == "candidate" and interview["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied to this interview session.")

    return interview

@router.post("/{interview_id}/session/start")
def start_session(
    interview_id: str,
    current_user: dict = Depends(require_role(["candidate"]))
):
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if interview["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    interview["status"] = "In Progress"
    if not interview.get("start_time"):
        interview["start_time"] = datetime.datetime.now().isoformat()

    return {
        "message": "Interview session started",
        "status": interview["status"],
        "start_time": interview["start_time"]
    }

@router.post("/{interview_id}/session/pause")
def pause_session(
    interview_id: str,
    current_user: dict = Depends(require_role(["candidate"]))
):
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if interview["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    interview["status"] = "Paused"

    return {
        "message": "Interview session paused",
        "status": interview["status"]
    }

@router.post("/{interview_id}/session/resume")
def resume_session(
    interview_id: str,
    current_user: dict = Depends(require_role(["candidate"]))
):
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if interview["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    interview["status"] = "In Progress"

    return {
        "message": "Interview session resumed",
        "status": interview["status"]
    }

@router.post("/{interview_id}/session/end")
def end_session(
    interview_id: str,
    req: EndSessionRequest = EndSessionRequest(),
    current_user: dict = Depends(require_role(["candidate"]))
):
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if interview["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    interview["status"] = "Ended"
    interview["end_time"] = datetime.datetime.now().isoformat()
    if req.total_duration > 0:
        interview["duration_seconds"] = req.total_duration

    return {
        "message": "Interview session ended",
        "status": interview["status"],
        "end_time": interview["end_time"],
        "duration_seconds": interview["duration_seconds"]
    }

@router.post("/{interview_id}/answer")
def answer_question(
    interview_id: str,
    req: AnswerQuestionRequest,
    current_user: dict = Depends(require_role(["candidate"]))
):
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    if interview["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Find matching question
    target_q = None
    for q in interview["questions"]:
        if q["id"] == req.question_id:
            target_q = q
            break

    if not target_q:
        raise HTTPException(status_code=404, detail="Question ID not found in this session.")

    # Evaluate candidate answer with Gemini 2.5 Flash
    evaluation = evaluate_candidate_answer(
        question=target_q["question"],
        candidate_answer=req.candidate_answer,
        ideal_outline=target_q.get("ideal_answer_outline", "")
    )

    target_q["user_answer"] = req.candidate_answer
    target_q["evaluation"] = evaluation

    # Update session question metrics
    if "question_times" not in interview:
        interview["question_times"] = {}
    interview["question_times"][str(req.question_id)] = req.time_spent

    attempted = sum(1 for q in interview["questions"] if q.get("user_answer"))
    interview["questions_attempted"] = attempted

    return {
        "message": "Answer evaluated successfully",
        "question_id": req.question_id,
        "evaluation": evaluation,
        "questions_attempted": attempted
    }

@router.post("/{interview_id}/upload_recording")
async def upload_recording(
    interview_id: str,
    file: UploadFile = File(...),
    media_type: str = Form("video"),
    current_user: dict = Depends(require_role(["candidate"]))
):
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if interview["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    ext = ".webm"
    if file.filename and "." in file.filename:
        ext = os.path.splitext(file.filename)[1]

    filename = f"{interview_id}_{media_type}{ext}"
    filepath = os.path.join(RECORDINGS_DIR, filename)

    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    ref_url = f"/api/interview/{interview_id}/recording/{media_type}"
    if media_type == "audio":
        interview["audio_recording_ref"] = ref_url
    else:
        interview["video_recording_ref"] = ref_url
        if not interview.get("audio_recording_ref"):
            interview["audio_recording_ref"] = ref_url

    return {
        "message": f"{media_type.capitalize()} recording stored successfully",
        "video_recording_ref": interview.get("video_recording_ref"),
        "audio_recording_ref": interview.get("audio_recording_ref")
    }

@router.get("/{interview_id}/recording/{media_type}")
def get_recording(
    interview_id: str,
    media_type: str,
    download: bool = False,
    current_user: dict = Depends(get_current_user)
):
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    # Authorization check: Candidate owner, recruiter, or admin
    if current_user["role"] == "candidate" and interview["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied to this recording.")

    # Check for saved file
    possible_extensions = [".webm", ".mp4", ".wav", ".mp3", ".ogg"]
    filepath = None
    for ext in possible_extensions:
        p = os.path.join(RECORDINGS_DIR, f"{interview_id}_{media_type}{ext}")
        if os.path.exists(p):
            filepath = p
            break

    if not filepath or not os.path.exists(filepath):
        # Fallback check for any file starting with interview_id
        for fn in os.listdir(RECORDINGS_DIR):
            if fn.startswith(interview_id):
                filepath = os.path.join(RECORDINGS_DIR, fn)
                break

    if not filepath or not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Recording file not found.")

    content_type = "video/webm" if media_type == "video" else "audio/webm"
    if filepath.endswith(".mp4"):
        content_type = "video/mp4"
    elif filepath.endswith(".wav"):
        content_type = "audio/wav"

    filename = os.path.basename(filepath)

    headers = {
        "Accept-Ranges": "bytes"
    }
    if download:
        headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    else:
        headers["Content-Disposition"] = f'inline; filename="{filename}"'

    return FileResponse(
        filepath,
        media_type=content_type,
        headers=headers
    )

@router.post("/{interview_id}/finalize")
def finalize_interview(
    interview_id: str,
    req: EndSessionRequest = EndSessionRequest(),
    current_user: dict = Depends(require_role(["candidate"]))
):
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    if interview["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    if not interview.get("end_time"):
        interview["end_time"] = datetime.datetime.now().isoformat()
    if req.total_duration > 0:
        interview["duration_seconds"] = req.total_duration

    # Synthesize overall performance report with Gemini 2.5 Flash
    report = generate_performance_report(interview["questions"])
    interview["status"] = "Completed"
    interview["report"] = report

    return {
        "message": "Interview completed and AI performance report generated",
        "interview_id": interview_id,
        "report": report
    }
