from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List
from datetime import datetime
from pathlib import Path
import uuid
import json
import shutil
import re


# =========================================================
# APPLICATION
# =========================================================

app = FastAPI(
    title="SmartHire AI Backend",
    description="SmartHire AI Interview Session and Assessment API",
    version="2.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# DIRECTORIES
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

RECORDINGS_DIR = BASE_DIR / "recordings"
UPLOADS_DIR = BASE_DIR / "uploads"

RECORDINGS_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)

SESSION_FILE = BASE_DIR / "sessions.json"


# =========================================================
# SESSION DATABASE
# =========================================================

if not SESSION_FILE.exists():
    SESSION_FILE.write_text(
        "[]",
        encoding="utf-8"
    )


def load_sessions():
    try:
        with open(
            SESSION_FILE,
            "r",
            encoding="utf-8"
        ) as file:
            return json.load(file)

    except Exception:
        return []


def save_sessions(sessions):
    with open(
        SESSION_FILE,
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            sessions,
            file,
            indent=4,
            ensure_ascii=False
        )


# =========================================================
# HELPERS
# =========================================================

def find_session(session_id: str):

    sessions = load_sessions()

    for session in sessions:

        if session.get("session_id") == session_id:
            return session

    return None


def update_session(
    session_id: str,
    updated_session: dict
):

    sessions = load_sessions()

    for index, session in enumerate(sessions):

        if session.get("session_id") == session_id:

            sessions[index] = updated_session

            save_sessions(sessions)

            return updated_session

    return None


def utc_now():

    return datetime.utcnow().isoformat()


def clamp_score(value, minimum=0, maximum=100):

    try:
        value = float(value)
    except Exception:
        value = 0

    return max(
        minimum,
        min(maximum, value)
    )


# =========================================================
# REQUEST MODELS
# =========================================================

class CreateSessionRequest(BaseModel):

    candidate_id: Optional[str] = "guest"

    interview_id: Optional[str] = None

    interview_type: Optional[str] = "Technical"

    difficulty: Optional[str] = "Medium"

    domain: Optional[str] = "Full Stack Development"

    total_questions: int = 5


class UpdateSessionRequest(BaseModel):

    status: Optional[str] = None

    questions_attempted: Optional[int] = None

    duration_seconds: Optional[int] = None


# =========================================================
# ASSESSMENT MODEL
# =========================================================

class AssessmentRequest(BaseModel):

    session_id: Optional[str] = None

    candidate_id: Optional[str] = "guest"

    interview_type: Optional[str] = "Technical"

    difficulty: Optional[str] = "Medium"

    domain: Optional[str] = "Full Stack Development"

    questions: Optional[List[Any]] = Field(
        default_factory=list
    )

    answers: Optional[List[Any]] = Field(
        default_factory=list
    )

    communication: Optional[Dict[str, Any]] = Field(
        default_factory=dict
    )

    transcripts: Optional[List[Any]] = Field(
        default_factory=list
    )

    # Allows frontend to send additional fields
    class Config:
        extra = "allow"


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():

    return {
        "success": True,
        "message": "SmartHire AI Backend is running",
        "version": "2.0.0",
        "features": [
            "Interview Sessions",
            "Video Recording",
            "Audio Recording",
            "AI Assessment",
            "Performance Analysis"
        ]
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/api/health")
def health_check():

    return {
        "success": True,
        "status": "healthy",
        "service": "SmartHire AI Backend",
        "version": "2.0.0"
    }


# =========================================================
# CREATE INTERVIEW SESSION
# =========================================================

@app.post("/api/interview/session/create")
def create_session(
    request: CreateSessionRequest
):

    sessions = load_sessions()

    session_id = (
        "SES-" +
        uuid.uuid4().hex[:10].upper()
    )

    interview_id = (
        request.interview_id
        if request.interview_id
        else
        "INT-" +
        uuid.uuid4().hex[:8].upper()
    )

    session = {

        "session_id": session_id,

        "candidate_id": request.candidate_id,

        "interview_id": interview_id,

        "interview_type":
            request.interview_type,

        "difficulty":
            request.difficulty,

        "domain":
            request.domain,

        "session_status":
            "READY",

        "start_time": None,

        "end_time": None,

        "duration_seconds": 0,

        "total_questions":
            request.total_questions,

        "questions_attempted": 0,

        "video_recording": None,

        "audio_recording": None,

        "assessment": None,

        "created_at": utc_now(),

        "updated_at": utc_now()
    }

    sessions.append(session)

    save_sessions(sessions)

    return {
        "success": True,
        "message":
            "Interview session created successfully",
        "session": session
    }


# =========================================================
# GET SESSION
# =========================================================

@app.get("/api/interview/session/{session_id}")
def get_session(
    session_id: str
):

    session = find_session(
        session_id
    )

    if not session:

        raise HTTPException(
            status_code=404,
            detail="Interview session not found"
        )

    return {
        "success": True,
        "session": session
    }


# =========================================================
# START SESSION
# =========================================================

@app.post("/api/interview/session/{session_id}/start")
def start_session(
    session_id: str
):

    session = find_session(
        session_id
    )

    if not session:

        raise HTTPException(
            status_code=404,
            detail="Interview session not found"
        )

    if session["session_status"] == "RUNNING":

        return {
            "success": True,
            "message":
                "Session is already running",
            "session": session
        }

    session["session_status"] = "RUNNING"

    session["start_time"] = utc_now()

    session["updated_at"] = utc_now()

    update_session(
        session_id,
        session
    )

    return {
        "success": True,
        "message":
            "Interview session started",
        "session": session
    }


# =========================================================
# PAUSE SESSION
# =========================================================

@app.post("/api/interview/session/{session_id}/pause")
def pause_session(
    session_id: str
):

    session = find_session(
        session_id
    )

    if not session:

        raise HTTPException(
            status_code=404,
            detail="Interview session not found"
        )

    session["session_status"] = "PAUSED"

    session["updated_at"] = utc_now()

    update_session(
        session_id,
        session
    )

    return {
        "success": True,
        "message":
            "Interview session paused",
        "session": session
    }


# =========================================================
# RESUME SESSION
# =========================================================

@app.post("/api/interview/session/{session_id}/resume")
def resume_session(
    session_id: str
):

    session = find_session(
        session_id
    )

    if not session:

        raise HTTPException(
            status_code=404,
            detail="Interview session not found"
        )

    session["session_status"] = "RUNNING"

    session["updated_at"] = utc_now()

    update_session(
        session_id,
        session
    )

    return {
        "success": True,
        "message":
            "Interview session resumed",
        "session": session
    }


# =========================================================
# UPDATE SESSION
# =========================================================

@app.put("/api/interview/session/{session_id}")
def update_interview_session(
    session_id: str,
    request: UpdateSessionRequest
):

    session = find_session(
        session_id
    )

    if not session:

        raise HTTPException(
            status_code=404,
            detail="Interview session not found"
        )

    if request.status is not None:

        session["session_status"] = (
            request.status
        )

    if request.questions_attempted is not None:

        session["questions_attempted"] = (
            request.questions_attempted
        )

    if request.duration_seconds is not None:

        session["duration_seconds"] = (
            request.duration_seconds
        )

    session["updated_at"] = utc_now()

    update_session(
        session_id,
        session
    )

    return {
        "success": True,
        "message":
            "Interview session updated",
        "session": session
    }


# =========================================================
# COMPLETE SESSION
# =========================================================

@app.post("/api/interview/session/{session_id}/complete")
def complete_session(
    session_id: str
):

    session = find_session(
        session_id
    )

    if not session:

        raise HTTPException(
            status_code=404,
            detail="Interview session not found"
        )

    session["session_status"] = "COMPLETED"

    session["end_time"] = utc_now()

    session["updated_at"] = utc_now()

    update_session(
        session_id,
        session
    )

    return {
        "success": True,
        "message":
            "Interview session completed",
        "session": session
    }


# =========================================================
# UPLOAD VIDEO
# =========================================================

@app.post(
    "/api/interview/session/{session_id}/upload-video"
)
async def upload_video(
    session_id: str,
    video: UploadFile = File(...)
):

    session = find_session(
        session_id
    )

    if not session:

        raise HTTPException(
            status_code=404,
            detail="Interview session not found"
        )

    if not video.filename:

        raise HTTPException(
            status_code=400,
            detail="Video file is required"
        )

    file_extension = (
        Path(video.filename).suffix
        or ".webm"
    )

    filename = (
        f"{session_id}_video_"
        f"{uuid.uuid4().hex[:8]}"
        f"{file_extension}"
    )

    file_path = (
        RECORDINGS_DIR /
        filename
    )

    with open(
        file_path,
        "wb"
    ) as buffer:

        shutil.copyfileobj(
            video.file,
            buffer
        )

    session["video_recording"] = {

        "filename": filename,

        "path": str(file_path),

        "original_filename":
            video.filename,

        "content_type":
            video.content_type,

        "uploaded_at":
            utc_now()
    }

    session["updated_at"] = utc_now()

    update_session(
        session_id,
        session
    )

    return {
        "success": True,
        "message":
            "Video uploaded successfully",
        "filename": filename,
        "session_id": session_id
    }


# =========================================================
# UPLOAD AUDIO
# =========================================================

@app.post(
    "/api/interview/session/{session_id}/upload-audio"
)
async def upload_audio(
    session_id: str,
    audio: UploadFile = File(...)
):

    session = find_session(
        session_id
    )

    if not session:

        raise HTTPException(
            status_code=404,
            detail="Interview session not found"
        )

    if not audio.filename:

        raise HTTPException(
            status_code=400,
            detail="Audio file is required"
        )

    file_extension = (
        Path(audio.filename).suffix
        or ".webm"
    )

    filename = (
        f"{session_id}_audio_"
        f"{uuid.uuid4().hex[:8]}"
        f"{file_extension}"
    )

    file_path = (
        RECORDINGS_DIR /
        filename
    )

    with open(
        file_path,
        "wb"
    ) as buffer:

        shutil.copyfileobj(
            audio.file,
            buffer
        )

    session["audio_recording"] = {

        "filename": filename,

        "path": str(file_path),

        "original_filename":
            audio.filename,

        "content_type":
            audio.content_type,

        "uploaded_at":
            utc_now()
    }

    session["updated_at"] = utc_now()

    update_session(
        session_id,
        session
    )

    return {
        "success": True,
        "message":
            "Audio uploaded successfully",
        "filename": filename,
        "session_id": session_id
    }


# =========================================================
# AI ASSESSMENT HELPERS
# =========================================================

def normalize_answer(answer):

    if answer is None:
        return ""

    if isinstance(answer, dict):

        for key in [
            "answer",
            "text",
            "response",
            "transcript"
        ]:

            if key in answer:

                return str(
                    answer[key]
                )

        return json.dumps(
            answer,
            ensure_ascii=False
        )

    return str(answer)


def calculate_content_score(
    answer: str,
    question: str
):

    answer = answer.strip()

    if not answer:

        return 0

    words = re.findall(
        r"\b[\w+#.-]+\b",
        answer.lower()
    )

    word_count = len(words)

    if word_count < 5:
        return 35

    if word_count < 15:
        return 55

    if word_count < 30:
        return 70

    if word_count < 60:
        return 82

    return 90


def calculate_communication_score(
    answer: str
):

    answer = answer.strip()

    if not answer:
        return 0

    words = re.findall(
        r"\b[\w+#.-]+\b",
        answer.lower()
    )

    word_count = len(words)

    score = 50

    if word_count >= 10:
        score += 10

    if word_count >= 25:
        score += 10

    if word_count >= 50:
        score += 5

    sentences = re.split(
        r"[.!?]+",
        answer
    )

    valid_sentences = [
        sentence
        for sentence in sentences
        if sentence.strip()
    ]

    if len(valid_sentences) >= 2:
        score += 5

    filler_words = [
        "um",
        "umm",
        "uh",
        "like",
        "you know"
    ]

    filler_count = sum(
        answer.lower().count(
            word
        )
        for word in filler_words
    )

    if filler_count == 0:
        score += 15

    elif filler_count <= 2:
        score += 8

    else:
        score -= 5

    return int(
        clamp_score(score)
    )


def calculate_confidence_score(
    answer: str
):

    answer = answer.strip()

    if not answer:
        return 0

    words = re.findall(
        r"\b[\w+#.-]+\b",
        answer
    )

    word_count = len(words)

    score = 45

    if word_count >= 10:
        score += 10

    if word_count >= 25:
        score += 10

    if word_count >= 50:
        score += 10

    confident_phrases = [
        "I can",
        "I have",
        "I worked",
        "I developed",
        "I implemented",
        "I solved",
        "I learned",
        "I achieved"
    ]

    for phrase in confident_phrases:

        if phrase.lower() in answer.lower():

            score += 3

    return int(
        clamp_score(score)
    )


def calculate_relevance_score(
    answer: str,
    question: str
):

    answer_words = set(
        re.findall(
            r"\b[a-zA-Z]{4,}\b",
            answer.lower()
        )
    )

    question_words = set(
        re.findall(
            r"\b[a-zA-Z]{4,}\b",
            question.lower()
        )
    )

    if not answer_words:
        return 0

    overlap = (
        answer_words &
        question_words
    )

    if not question_words:
        return 70

    percentage = (
        len(overlap) /
        len(question_words)
    ) * 100

    return int(
        clamp_score(
            50 + percentage
        )
    )


def generate_question_feedback(
    answer_score,
    communication_score,
    confidence_score,
    answer
):

    feedback = []

    if not answer.strip():

        feedback.append(
            "No answer was detected for this question."
        )

        return feedback

    if answer_score >= 80:

        feedback.append(
            "Your answer was detailed and well structured."
        )

    elif answer_score >= 60:

        feedback.append(
            "Your answer was reasonable but could include more specific examples."
        )

    else:

        feedback.append(
            "Try to provide a more complete and relevant answer."
        )

    if communication_score >= 80:

        feedback.append(
            "Communication was clear."
        )

    elif communication_score >= 60:

        feedback.append(
            "Try to make your explanation more structured and concise."
        )

    else:

        feedback.append(
            "Practice speaking in complete, clear sentences."
        )

    if confidence_score >= 80:

        feedback.append(
            "Your response showed good confidence."
        )

    else:

        feedback.append(
            "Use confident language and explain your contribution clearly."
        )

    return feedback


# =========================================================
# AI INTERVIEW ASSESSMENT
# =========================================================

@app.post("/api/interview/assess")
def assess_interview(
    request: AssessmentRequest
):

    questions = request.questions or []

    answers = request.answers or []

    transcripts = (
        request.transcripts or []
    )

    # -----------------------------------------------------
    # If transcripts were provided but answers weren't
    # use transcripts as answers.
    # -----------------------------------------------------

    if not answers and transcripts:

        answers = transcripts

    # -----------------------------------------------------
    # If frontend sends a single answer string
    # -----------------------------------------------------

    if isinstance(
        answers,
        str
    ):

        answers = [answers]

    if isinstance(
        questions,
        str
    ):

        questions = [questions]

    # -----------------------------------------------------
    # Determine number of questions
    # -----------------------------------------------------

    total_questions = max(
        len(questions),
        len(answers)
    )

    if total_questions == 0:

        return {
            "success": True,
            "message":
                "No answers were submitted for assessment.",
            "assessment": {
                "overall_score": 0,
                "communication_score": 0,
                "confidence_score": 0,
                "technical_score": 0,
                "questions": [],
                "strengths": [],
                "improvements": [
                    "Complete the interview questions before requesting an assessment."
                ],
                "summary":
                    "No interview answers were available."
            }
        }

    # -----------------------------------------------------
    # PER QUESTION ASSESSMENT
    # -----------------------------------------------------

    question_results = []

    content_scores = []

    communication_scores = []

    confidence_scores = []

    relevance_scores = []

    for index in range(
        total_questions
    ):

        question = ""

        answer = ""

        if index < len(questions):

            question = normalize_answer(
                questions[index]
            )

        if index < len(answers):

            answer = normalize_answer(
                answers[index]
            )

        # If question doesn't exist
        if not question:

            question = (
                f"Interview Question {index + 1}"
            )

        content_score = (
            calculate_content_score(
                answer,
                question
            )
        )

        communication_score = (
            calculate_communication_score(
                answer
            )
        )

        confidence_score = (
            calculate_confidence_score(
                answer
            )
        )

        relevance_score = (
            calculate_relevance_score(
                answer,
                question
            )
        )

        question_score = int(
            round(
                (
                    content_score * 0.40
                    +
                    communication_score * 0.20
                    +
                    confidence_score * 0.20
                    +
                    relevance_score * 0.20
                )
            )
        )

        question_score = int(
            clamp_score(
                question_score
            )
        )

        feedback = (
            generate_question_feedback(
                question_score,
                communication_score,
                confidence_score,
                answer
            )
        )

        question_result = {

            "question_number":
                index + 1,

            "question":
                question,

            "answer":
                answer,

            "score":
                question_score,

            "content_score":
                content_score,

            "communication_score":
                communication_score,

            "confidence_score":
                confidence_score,

            "relevance_score":
                relevance_score,

            "feedback":
                feedback
        }

        question_results.append(
            question_result
        )

        content_scores.append(
            content_score
        )

        communication_scores.append(
            communication_score
        )

        confidence_scores.append(
            confidence_score
        )

        relevance_scores.append(
            relevance_score
        )

    # -----------------------------------------------------
    # AVERAGES
    # -----------------------------------------------------

    def average(values):

        if not values:
            return 0

        return int(
            round(
                sum(values) /
                len(values)
            )
        )

    answer_quality_score = average(
        content_scores
    )

    communication_score = average(
        communication_scores
    )

    confidence_score = average(
        confidence_scores
    )

    relevance_score = average(
        relevance_scores
    )

    # -----------------------------------------------------
    # INTERVIEW TYPE SCORE
    # -----------------------------------------------------

    interview_type = (
        request.interview_type
        or "Technical"
    )

    if interview_type.lower() == "technical":

        technical_score = int(
            round(
                (
                    answer_quality_score *
                    0.60
                    +
                    relevance_score *
                    0.40
                )
            )
        )

    elif interview_type.lower() == "aptitude":

        technical_score = int(
            round(
                answer_quality_score *
                0.70
                +
                relevance_score *
                0.30
            )
        )

    elif interview_type.lower() == "behavioral":

        technical_score = int(
            round(
                answer_quality_score *
                0.50
                +
                confidence_score *
                0.30
                +
                communication_score *
                0.20
            )
        )

    else:

        technical_score = int(
            round(
                answer_quality_score *
                0.40
                +
                communication_score *
                0.30
                +
                confidence_score *
                0.30
            )
        )

    # -----------------------------------------------------
    # OVERALL SCORE
    # -----------------------------------------------------

    overall_score = int(
        round(
            answer_quality_score * 0.40
            +
            communication_score * 0.20
            +
            confidence_score * 0.20
            +
            relevance_score * 0.20
        )
    )

    overall_score = int(
        clamp_score(
            overall_score
        )
    )

    # -----------------------------------------------------
    # STRENGTHS
    # -----------------------------------------------------

    strengths = []

    if answer_quality_score >= 75:

        strengths.append(
            "Good answer quality and explanation."
        )

    if communication_score >= 75:

        strengths.append(
            "Clear and effective communication."
        )

    if confidence_score >= 75:

        strengths.append(
            "Good confidence while responding."
        )

    if relevance_score >= 75:

        strengths.append(
            "Answers were generally relevant to the questions."
        )

    if technical_score >= 75:

        if interview_type.lower() == "technical":

            strengths.append(
                "Strong technical understanding demonstrated."
            )

        elif interview_type.lower() == "aptitude":

            strengths.append(
                "Good logical problem-solving approach."
            )

        else:

            strengths.append(
                "Good interview response quality."
            )

    if not strengths:

        strengths.append(
            "You completed the interview and have a foundation to improve from."
        )

    # -----------------------------------------------------
    # IMPROVEMENTS
    # -----------------------------------------------------

    improvements = []

    if answer_quality_score < 70:

        improvements.append(
            "Give more detailed answers and include specific examples."
        )

    if communication_score < 70:

        improvements.append(
            "Practice speaking clearly and organizing your answers."
        )

    if confidence_score < 70:

        improvements.append(
            "Use more confident language and explain your decisions clearly."
        )

    if relevance_score < 70:

        improvements.append(
            "Focus your answers more directly on the question asked."
        )

    if not improvements:

        improvements.append(
            "Continue practicing to maintain consistency across interviews."
        )

    # -----------------------------------------------------
    # PERFORMANCE LEVEL
    # -----------------------------------------------------

    if overall_score >= 85:

        performance_level = "Excellent"

    elif overall_score >= 70:

        performance_level = "Good"

    elif overall_score >= 50:

        performance_level = "Average"

    else:

        performance_level = "Needs Improvement"

    # -----------------------------------------------------
    # SUMMARY
    # -----------------------------------------------------

    summary = (
        f"You completed a {interview_type} interview "
        f"with an overall score of {overall_score}/100. "
        f"Your performance level is {performance_level}. "
        f"Communication scored {communication_score}/100 "
        f"and confidence scored {confidence_score}/100."
    )

    # -----------------------------------------------------
    # COMMUNICATION DETAILS
    # -----------------------------------------------------

    communication_analysis = {

        "score":
            communication_score,

        "clarity":
            communication_score,

        "confidence":
            confidence_score,

        "filler_word_level":
            "Low"
            if communication_score >= 80
            else
            "Moderate"
            if communication_score >= 60
            else
            "High",

        "feedback":
            (
                "Your communication was clear and confident."
                if communication_score >= 80
                else
                "Your communication is developing. Practice structured responses."
                if communication_score >= 60
                else
                "Focus on clear, structured and confident speaking."
            )
    }

    # -----------------------------------------------------
    # FINAL ASSESSMENT
    # -----------------------------------------------------

    assessment = {

        "assessment_id":
            "ASM-" +
            uuid.uuid4().hex[:10].upper(),

        "session_id":
            request.session_id,

        "candidate_id":
            request.candidate_id,

        "interview_type":
            interview_type,

        "difficulty":
            request.difficulty,

        "domain":
            request.domain,

        "total_questions":
            total_questions,

        "questions_answered":
            len([
                item
                for item in answers
                if normalize_answer(item).strip()
            ]),

        "overall_score":
            overall_score,

        "performance_level":
            performance_level,

        "answer_quality_score":
            answer_quality_score,

        "communication_score":
            communication_score,

        "confidence_score":
            confidence_score,

        "relevance_score":
            relevance_score,

        "technical_score":
            technical_score,

        "communication_analysis":
            communication_analysis,

        "questions":
            question_results,

        "strengths":
            strengths,

        "improvements":
            improvements,

        "summary":
            summary,

        "evaluated_at":
            utc_now()
    }

    # =====================================================
    # SAVE ASSESSMENT TO SESSION
    # =====================================================

    if request.session_id:

        session = find_session(
            request.session_id
        )

        if session:

            session["assessment"] = (
                assessment
            )

            session["updated_at"] = utc_now()

            update_session(
                request.session_id,
                session
            )

    # =====================================================
    # RESPONSE
    # =====================================================

    return {

        "success": True,

        "message":
            "Interview assessment completed successfully",

        "assessment":
            assessment
    }


# =========================================================
# INTERVIEW HISTORY
# =========================================================

@app.post("/api/interview/history")
def interview_history(
    request: Dict[str, Any]
):

    candidate_id = (
        request.get(
            "candidate_id"
        )
        or request.get(
            "user_id"
        )
        or request.get(
            "candidateId"
        )
    )

    sessions = load_sessions()

    if candidate_id:

        sessions = [
            session
            for session in sessions
            if str(
                session.get(
                    "candidate_id"
                )
            ) == str(candidate_id)
        ]

    sessions.reverse()

    return {

        "success": True,

        "count":
            len(sessions),

        "sessions":
            sessions
    }


# =========================================================
# GET ALL SESSIONS
# =========================================================

@app.get("/api/interview/sessions")
def get_all_sessions():

    sessions = load_sessions()

    return {

        "success": True,

        "count":
            len(sessions),

        "sessions":
            sessions
    }


# =========================================================
# CANDIDATE SESSION HISTORY
# =========================================================

@app.get(
    "/api/interview/sessions/candidate/{candidate_id}"
)
def get_candidate_sessions(
    candidate_id: str
):

    sessions = load_sessions()

    candidate_sessions = [

        session

        for session in sessions

        if str(
            session.get(
                "candidate_id"
            )
        ) == str(candidate_id)

    ]

    candidate_sessions.reverse()

    return {

        "success": True,

        "candidate_id":
            candidate_id,

        "count":
            len(candidate_sessions),

        "sessions":
            candidate_sessions
    }


# =========================================================
# GET ASSESSMENT BY SESSION
# =========================================================

@app.get(
    "/api/interview/session/{session_id}/assessment"
)
def get_session_assessment(
    session_id: str
):

    session = find_session(
        session_id
    )

    if not session:

        raise HTTPException(
            status_code=404,
            detail="Interview session not found"
        )

    assessment = (
        session.get(
            "assessment"
        )
    )

    if not assessment:

        return {

            "success": True,

            "message":
                "Assessment has not been generated yet.",

            "assessment":
                None
        }

    return {

        "success": True,

        "assessment":
            assessment
    }


# =========================================================
# SERVER INFORMATION
# =========================================================

@app.get("/api")
def api_information():

    return {

        "success": True,

        "name":
            "SmartHire AI API",

        "version":
            "2.0.0",

        "modules": [

            "Session Management",

            "Camera / Video Recording",

            "Audio Recording",

            "Interview Assessment",

            "Performance Analytics",

            "Interview History"

        ]
    }