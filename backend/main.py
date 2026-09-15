import traceback
import os
from sqlalchemy import func
from resume_parser import parse_resume
from llm_service import (
    analyze_resume_with_llm,
    generate_resume_interview_questions,
    evaluate_interview_answer
)
from llm_service import ask_gemini
from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Security
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from pypdf import PdfReader
from docx import Document

from database import engine, Base, get_db
from models import (
    User,
    Resume,
    Application,
    Job,
    Interview,
    InterviewQuestion,
    InterviewSession,
    InterviewAnswer,
    InterviewEvaluation,
    ScheduledInterview
)
from datetime import datetime, timezone
from schemas import (
    SignupRequest,
    LoginRequest,
    TokenResponse,
    JobCreateRequest,
    ApplicationCreateRequest,
    InterviewGenerateRequest
)
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    verify_access_token,
    security
)
import cv2
import mediapipe as mp
from deepface import DeepFace
import base64
import numpy as np

# ============================================================
# MEDIAPIPE FACE LANDMARKER
# ============================================================

BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

face_landmarker_options = FaceLandmarkerOptions(
    base_options=BaseOptions(
        model_asset_path="face_landmarker.task"
    ),
    running_mode=VisionRunningMode.IMAGE,
    num_faces=1
)

face_landmarker = FaceLandmarker.create_from_options(
    face_landmarker_options
)

# ================= APP =================

app = FastAPI(title="SmartHire AI API")


# ================= CORS =================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================= DATABASE =================

Base.metadata.create_all(bind=engine)


# ================= AUTHENTICATION =================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    return verify_access_token(credentials)


def require_role(required_role: str):

    def role_checker(
        current_user: dict = Depends(get_current_user)
    ):
        if current_user.get("role") != required_role:
            raise HTTPException(
                status_code=403,
                detail="Access denied"
            )

        return current_user

    return role_checker


# ================= HOME =================

@app.get("/")
def home():
    return {
        "message": "SmartHire AI Backend is running"
    }


# ================= SIGNUP =================

@app.post("/signup")
def signup(
    user_data: SignupRequest,
    db: Session = Depends(get_db)
):

    # Check whether email already exists
    existing_user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Create new user
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        status="active"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Account created successfully",
        "user_id": new_user.id
    }


# ================= LOGIN =================

@app.post("/login", response_model=TokenResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):

    user = (
        db.query(User)
        .filter(User.email == login_data.email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        login_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Put user information inside JWT
    token_data = {
        "sub": str(user.id),
        "role": user.role,
        "email": user.email
    }

    access_token = create_access_token(token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

# ================= CREATE JOB =================

@app.post("/jobs")
def create_job(
    job_data: JobCreateRequest,
    current_user: dict = Depends(
        require_role("recruiter")
    ),
    db: Session = Depends(get_db)
):

    recruiter_id = int(
        current_user.get("sub")
    )

    new_job = Job(
        recruiter_id=recruiter_id,
        title=job_data.title,
        company=job_data.company,
        description=job_data.description,
        required_skills=job_data.required_skills,
        location=job_data.location,
        status="active"
    )

    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    return {
        "message": "Job created successfully",
        "job_id": new_job.id,
        "title": new_job.title,
        "company": new_job.company
    }

# ================= VIEW ACTIVE JOBS =================

@app.get("/jobs")
def get_jobs(
    current_user: dict = Depends(
        require_role("candidate")
    ),
    db: Session = Depends(get_db)
):

    jobs = (
        db.query(Job)
        .filter(Job.status == "active")
        .order_by(Job.created_at.desc())
        .all()
    )

    return [
        {
            "job_id": job.id,
            "title": job.title,
            "company": job.company,
            "description": job.description,
            "required_skills": job.required_skills,
            "location": job.location,
            "created_at": job.created_at
        }
        for job in jobs
    ]

# ================= APPLY FOR JOB =================

@app.post("/applications")
def apply_for_job(
    application_data: ApplicationCreateRequest,
    current_user: dict = Depends(
        require_role("candidate")
    ),
    db: Session = Depends(get_db)
):

    candidate_id = int(
        current_user.get("sub")
    )

    # Check whether the job exists
    job = (
        db.query(Job)
        .filter(
            Job.id == application_data.job_id,
            Job.status == "active"
        )
        .first()
    )

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Active job not found"
        )

    # Get candidate's latest resume
    resume = (
        db.query(Resume)
        .filter(
            Resume.user_id == candidate_id
        )
        .order_by(Resume.uploaded_at.desc())
        .first()
    )

    if not resume:
        raise HTTPException(
            status_code=400,
            detail="Please upload a resume before applying"
        )

    # Check whether candidate already applied
    existing_application = (
        db.query(Application)
        .filter(
            Application.candidate_id == candidate_id,
            Application.job_id == application_data.job_id
        )
        .first()
    )

    if existing_application:
        raise HTTPException(
            status_code=400,
            detail="You have already applied for this job"
        )

    # Create application
    new_application = Application(
        candidate_id=candidate_id,
        job_id=application_data.job_id,
        resume_id=resume.id,
        status="applied"
    )

    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    return {
        "message": "Application submitted successfully",
        "application_id": new_application.id,
        "job_id": job.id,
        "job_title": job.title,
        "resume_id": resume.id,
        "status": new_application.status
    }


# ================= RESUME TEXT EXTRACTION =================

def extract_resume_text(
    file_path,
    file_extension
):

    if file_extension == ".pdf":

        reader = PdfReader(file_path)

        text = ""

        for page in reader.pages:

            page_text = page.extract_text()

            if page_text:
                text += page_text + "\n"

        return text.strip()

    elif file_extension == ".docx":

        document = Document(file_path)

        text = ""

        for paragraph in document.paragraphs:

            text += paragraph.text + "\n"

        return text.strip()

    return ""

# ================= SKILL EXTRACTION =================

SKILL_KEYWORDS = [
    "Python",
    "Java",
    "C",
    "C++",
    "JavaScript",
    "TypeScript",
    "HTML",
    "CSS",
    "React",
    "Node.js",
    "FastAPI",
    "Django",
    "Flask",
    "SQL",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "Firebase",
    "Supabase",
    "Git",
    "GitHub",
    "Docker",
    "AWS",
    "Azure",
    "Machine Learning",
    "Deep Learning",
    "Artificial Intelligence",
    "Data Science",
    "Data Analysis",
    "Natural Language Processing",
    "Computer Vision",
    "Pandas",
    "NumPy",
    "Matplotlib",
    "Seaborn",
    "Scikit-learn",
    "TensorFlow",
    "PyTorch",
    "Keras",
    "OpenCV",
    "Power BI",
    "Tableau",
    "Excel",
]


def extract_skills_from_text(text: str):
    detected_skills = []

    text_lower = text.lower()

    for skill in SKILL_KEYWORDS:
        if skill.lower() in text_lower:
            detected_skills.append(skill)

    return detected_skills


# ================= GENERATE INTERVIEW =================

@app.post("/interviews/generate")
def generate_interview(
    interview_data: InterviewGenerateRequest,
    current_user: dict = Depends(
        require_role("candidate")
    ),
    db: Session = Depends(get_db)
):

    candidate_id = int(
        current_user.get("sub")
    )

    # ========================================================
    # GET CANDIDATE'S LATEST RESUME
    # ========================================================

    resume = (
        db.query(Resume)
        .filter(
            Resume.user_id == candidate_id
        )
        .order_by(
            Resume.uploaded_at.desc()
        )
        .first()
    )

    if not resume:

        raise HTTPException(
            status_code=400,
            detail="Please upload a resume first."
        )

    if not resume.extracted_text:

        raise HTTPException(
            status_code=400,
            detail="Resume text could not be extracted."
        )

    # ========================================================
    # EXTRACT SKILLS
    # Keep this because the frontend currently displays them.
    # ========================================================

    skills = extract_skills_from_text(
        resume.extracted_text
    )

    # ========================================================
    # VALIDATE QUESTION COUNT
    # ========================================================

    requested_count = interview_data.number_of_questions

    if requested_count <= 0:

        raise HTTPException(
            status_code=400,
            detail="Number of questions must be greater than zero."
        )

    if requested_count > 20:

        raise HTTPException(
            status_code=400,
            detail="Maximum 20 questions are allowed."
        )

    # ========================================================
    # GENERATE RESUME-BASED QUESTIONS USING GEMINI
    # ========================================================

    try:

        questions = generate_resume_interview_questions(
            resume_text=resume.extracted_text,
            interview_type=interview_data.interview_type,
            domain=interview_data.domain,
            difficulty=interview_data.difficulty,
            number_of_questions=requested_count
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Interview question generation failed: {str(e)}"
        )

    # ========================================================
    # FINAL EXACT-COUNT CHECK
    # ========================================================

    if len(questions) != requested_count:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Expected {requested_count} questions "
                f"but generated {len(questions)}."
            )
        )

    # ========================================================
    # CREATE INTERVIEW
    # LINK IT TO THE EXACT RESUME
    # ========================================================

    new_interview = Interview(
        user_id=candidate_id,
        resume_id=resume.id,
        interview_type=interview_data.interview_type,
        domain=interview_data.domain,
        difficulty=interview_data.difficulty
    )

    db.add(new_interview)

    db.commit()

    db.refresh(new_interview)

    # ========================================================
    # SAVE GENERATED QUESTIONS
    # ========================================================

    for index, question in enumerate(
        questions,
        start=1
    ):

        interview_question = InterviewQuestion(
            interview_id=new_interview.id,
            question_number=index,
            question_text=question
        )

        db.add(interview_question)

    db.commit()

    # ========================================================
    # RETURN RESULT
    # ========================================================

    return {
        "message":
            "Interview generated successfully",

        "interview_id":
            new_interview.id,

        "resume_id":
            resume.id,

        "interview_type":
            interview_data.interview_type,

        "domain":
            interview_data.domain,

        "difficulty":
            interview_data.difficulty,

        "number_of_questions":
            len(questions),

        "skills_used":
            skills,

        "questions":
            questions
    }
# ================= RESUME SKILLS =================

@app.get("/resume/skills")
def get_resume_skills(
    current_user: dict = Depends(
        require_role("candidate")
    ),
    db: Session = Depends(get_db)
):

    candidate_id = int(
        current_user.get("sub")
    )

    # Get candidate's latest resume
    resume = (
        db.query(Resume)
        .filter(
            Resume.user_id == candidate_id
        )
        .order_by(
            Resume.uploaded_at.desc()
        )
        .first()
    )

    if not resume:
        raise HTTPException(
            status_code=404,
            detail="No resume found. Please upload a resume first."
        )

    if not resume.extracted_text:
        raise HTTPException(
            status_code=400,
            detail="Resume text could not be extracted."
        )

    skills = extract_skills_from_text(
        resume.extracted_text
    )

    return {
        "resume_id": resume.id,
        "filename": resume.filename,
        "skills": skills,
        "skill_count": len(skills)
    }

# ================= RESUME UPLOAD =================

UPLOAD_DIR = "uploads/resumes"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)

# ============================================================
# SCHEDULE INTERVIEW
# ============================================================

@app.post("/interviews/schedule")
def schedule_interview(
    scheduled_date: str,
    scheduled_time: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    user_id = int(current_user.get("sub"))

    # Create scheduled interview
    scheduled_interview = ScheduledInterview(
        user_id=user_id,
        scheduled_date=scheduled_date,
        scheduled_time=scheduled_time,
        status="scheduled"
    )

    db.add(scheduled_interview)
    db.commit()
    db.refresh(scheduled_interview)

    return {
        "message": "Interview scheduled successfully",
        "schedule_id": scheduled_interview.id,
        "scheduled_date": scheduled_interview.scheduled_date,
        "scheduled_time": scheduled_interview.scheduled_time,
        "status": scheduled_interview.status
    }
# ============================================================
# GET UPCOMING SCHEDULED INTERVIEW
# ============================================================

@app.get("/interviews/scheduled")
def get_scheduled_interview(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    user_id = int(current_user.get("sub"))

    interview = (
        db.query(ScheduledInterview)
        .filter(
            ScheduledInterview.user_id == user_id,
            ScheduledInterview.status == "scheduled"
        )
        .order_by(ScheduledInterview.id.desc())
        .first()
    )

    if not interview:
        return {
            "scheduled": False
        }

    return {
        "scheduled": True,
        "schedule_id": interview.id,
        "scheduled_date": interview.scheduled_date,
        "scheduled_time": interview.scheduled_time,
        "status": interview.status
    }
@app.post("/resume/upload")
def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # Only candidates can upload resumes
    if current_user.get("role") != "candidate":

        raise HTTPException(
            status_code=403,
            detail="Only candidates can upload resumes"
        )

    # Allow only PDF and DOCX files
    allowed_extensions = [
        ".pdf",
        ".docx"
    ]

    filename = file.filename or ""

    extension = os.path.splitext(
        filename
    )[1].lower()

    if extension not in allowed_extensions:

        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are allowed"
        )

    # Get logged-in user ID
    user_id = current_user.get("sub")

    # Create saved filename
    saved_filename = f"user_{user_id}_{filename}"

    file_path = os.path.join(
        UPLOAD_DIR,
        saved_filename
    )

    # Save uploaded file
    with open(
        file_path,
        "wb"
    ) as buffer:

        buffer.write(
            file.file.read()
        )

    # Extract resume text
    extracted_text = extract_resume_text(
        file_path,
        extension
    )

    # Save resume information and extracted text
    new_resume = Resume(
        user_id=int(user_id),
        filename=filename,
        file_path=file_path,
        extracted_text=extracted_text
    )

    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)

    return {
        "message": "Resume uploaded and processed successfully",
        "resume_id": new_resume.id,
        "filename": filename,
        "text_length": len(extracted_text)
    }

# ================= GET LATEST RESUME =================

@app.get("/resume/latest")
def get_latest_resume(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # Only candidates can access their resume
    if current_user.get("role") != "candidate":
        raise HTTPException(
            status_code=403,
            detail="Only candidates can access resumes"
        )

    user_id = int(current_user.get("sub"))

    resume = (
        db.query(Resume)
        .filter(Resume.user_id == user_id)
        .order_by(Resume.uploaded_at.desc())
        .first()
    )

    if not resume:
        raise HTTPException(
            status_code=404,
            detail="No resume found"
        )

    # Parse extracted resume text
    parsed_resume = parse_resume(
        resume.extracted_text or ""
    )

    return {
        "resume_id": resume.id,
        "filename": resume.filename,
        "uploaded_at": resume.uploaded_at,
        "extracted_text": resume.extracted_text,
        "analysis": parsed_resume
    }
# ============================================================
# NOTE:
# The following endpoints are temporary testing endpoints.
# Keep them only if you still want to test RBAC through Swagger.
# ============================================================

@app.get("/resume/ai-analysis")
def get_ai_resume_analysis(
    resume_id: int | None = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # Only candidates can access resume analysis
    if current_user.get("role") != "candidate":
        raise HTTPException(
            status_code=403,
            detail="Only candidates can access resume analysis"
        )

    user_id = int(
        current_user.get("sub")
    )

    # ============================================================
    # GET THE EXACT RESUME IF resume_id IS PROVIDED
    # ============================================================

    if resume_id is not None:

        resume = (
            db.query(Resume)
            .filter(
                Resume.id == resume_id,
                Resume.user_id == user_id
            )
            .first()
        )

    # ============================================================
    # OTHERWISE FALL BACK TO LATEST RESUME
    # ============================================================

    else:

        resume = (
            db.query(Resume)
            .filter(
                Resume.user_id == user_id
            )
            .order_by(
                Resume.id.desc()
            )
            .first()
        )

    # ============================================================
    # VALIDATE RESUME
    # ============================================================

    if not resume:
        raise HTTPException(
            status_code=404,
            detail="No resume found. Please upload a resume first."
        )

    if not resume.extracted_text:
        raise HTTPException(
            status_code=400,
            detail="Resume text could not be extracted."
        )

    # ============================================================
    # AI ANALYSIS
    # ============================================================

    try:

        analysis = analyze_resume_with_llm(
            resume.extracted_text
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"AI resume analysis failed: {str(e)}"
        )

    # ============================================================
    # RETURN RESULT
    # ============================================================

    return {
        "resume_id": resume.id,
        "filename": resume.filename,
        "analysis": analysis
    }

# ================= PROTECTED TEST =================

@app.get("/protected")
def protected_route(
    current_user: dict = Depends(get_current_user)
):

    return {
        "message": "You are authenticated",
        "user": current_user
    }


# ================= CANDIDATE ONLY =================

@app.get("/candidate-area")
def candidate_area(
    current_user: dict = Depends(
        require_role("candidate")
    )
):

    return {
        "message": "Welcome to the Candidate Area",
        "user": current_user
    }


# ================= RECRUITER ONLY =================

@app.get("/recruiter-area")
def recruiter_area(
    current_user: dict = Depends(
        require_role("recruiter")
    )
):

    return {
        "message": "Welcome to the Recruiter Area",
        "user": current_user
    }

# ================= RECRUITER DASHBOARD =================
@app.get("/recruiter/dashboard")
def recruiter_dashboard(
    current_user: dict = Depends(require_role("recruiter")),
    db: Session = Depends(get_db)
):
    # Get all candidates
    candidates = (
        db.query(User)
        .filter(User.role == "candidate")
        .all()
    )

    # Get all completed interview sessions
    completed_sessions = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.status == "completed"
        )
        .order_by(
            InterviewSession.end_time.desc()
        )
        .all()
    )

    # Calculate candidate scores
    candidate_data = []

    for candidate in candidates:

        candidate_sessions = [
            session
            for session in completed_sessions
            if session.candidate_id == candidate.id
        ]

        # -----------------------------------------
        # SESSION-LEVEL SCORES
        # -----------------------------------------

        communication_scores = [
            session.communication_score
            for session in candidate_sessions
            if session.communication_score is not None
        ]

        confidence_scores = [
            session.confidence_score
            for session in candidate_sessions
            if session.confidence_score is not None
        ]

        professionalism_scores = [
            session.professionalism_score
            for session in candidate_sessions
            if session.professionalism_score is not None
        ]

        overall_scores = [
            session.final_overall_score
            for session in candidate_sessions
            if session.final_overall_score is not None
        ]

        # -----------------------------------------
        # QUESTION-LEVEL TECHNICAL + RELEVANCE
        # -----------------------------------------

        candidate_evaluations = (
            db.query(InterviewEvaluation)
            .join(
                InterviewSession,
                InterviewEvaluation.session_id
                == InterviewSession.id
            )
            .filter(
                InterviewSession.candidate_id
                == candidate.id
            )
            .all()
        )

        technical_scores = [
            evaluation.technical_score
            for evaluation in candidate_evaluations
            if evaluation.technical_score is not None
        ]

        relevance_scores = [
            evaluation.relevance_score
            for evaluation in candidate_evaluations
            if evaluation.relevance_score is not None
        ]

        # -----------------------------------------
        # AVERAGE HELPER
        # -----------------------------------------

        def average_score(values):
            if not values:
                return 0.0

            return round(
                sum(float(value) for value in values)
                / len(values),
                1
            )

        technical_score = average_score(
            technical_scores
        )

        relevance_score = average_score(
            relevance_scores
        )

        technical_relevance_score = average_score(
            [
                (
                    technical_score
                    + relevance_score
                ) / 2
            ]
            if (
                technical_scores
                or relevance_scores
            )
            else []
        )

        communication_score = average_score(
            communication_scores
        )

        confidence_score = average_score(
            confidence_scores
        )

        professionalism_score = average_score(
            professionalism_scores
        )

        overall_score = average_score(
            overall_scores
        )

        # -----------------------------------------
        # LATEST INTERVIEW
        # -----------------------------------------

        latest_session = (
            candidate_sessions[0]
            if candidate_sessions
            else None
        )

        latest_score = (
            latest_session.final_overall_score
            if (
                latest_session
                and latest_session.final_overall_score
                is not None
            )
            else 0.0
        )

        candidate_data.append({

            "candidate_id":
                candidate.id,

            "candidate_name":
                candidate.name,

            "candidate_email":
                candidate.email,

            "completed_interviews":
                len(candidate_sessions),

            "average_score":
                overall_score,

            "latest_score":
                latest_score,

            "communication_score":
                communication_score,

            "confidence_score":
                confidence_score,

            "technical_score":
                technical_relevance_score,

            "professionalism_score":
                professionalism_score,

            "latest_interview":
                (
                    latest_session.end_time
                    if latest_session
                    else None
                ),

            "status":
                (
                    latest_session.status
                    if latest_session
                    else "No interviews"
                )
        })
        # Calculate overall average score
    all_overall_scores = [
        session.final_overall_score
        for session in completed_sessions
        if session.final_overall_score is not None
    ]

    overall_average = (
        round(
            sum(float(score) for score in all_overall_scores)
            / len(all_overall_scores),
            1
        )
        if all_overall_scores
        else 0.0
    )
    return {

    "total_candidates": len(candidates),

    "candidates_with_interviews": len(
        set(
            session.candidate_id
            for session in completed_sessions
        )
    ),

    "total_completed_interviews": len(
        completed_sessions
    ),

    "average_candidate_score": overall_average,

    "candidates": candidate_data,

    "sessions": [
        {
            "session_id": session.id,

            "candidate_id": session.candidate_id,

            "candidate_name": (
                db.query(User)
                .filter(
                    User.id == session.candidate_id
                )
                .first()
                .name
            ),

            "role": (
                db.query(Interview)
                .filter(
                    Interview.id == session.interview_id
                )
                .first()
                .domain
            ),

            "date": (
                session.end_time
                if session.end_time
                else session.start_time
            ),

            "type": (
                db.query(Interview)
                .filter(
                    Interview.id == session.interview_id
                )
                .first()
                .interview_type
            ),

            "status": session.status,

            "duration": session.duration
        }

        for session in completed_sessions
    ]
}
# ============================================================
# RECRUITER — VIEW CANDIDATE REPORT
# ============================================================

@app.get("/recruiter/candidates/{candidate_id}/report")
def recruiter_candidate_report(
    candidate_id: int,
    current_user: dict = Depends(
        require_role("recruiter")
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # CHECK THAT THE CANDIDATE EXISTS
    # --------------------------------------------------------

    candidate = (
        db.query(User)
        .filter(
            User.id == candidate_id,
            User.role == "candidate"
        )
        .first()
    )

    if not candidate:

        raise HTTPException(
            status_code=404,
            detail="Candidate not found."
        )


    # --------------------------------------------------------
    # GET LATEST COMPLETED INTERVIEW
    # --------------------------------------------------------

    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.candidate_id == candidate_id,
            InterviewSession.status == "completed"
        )
        .order_by(
            InterviewSession.end_time.desc()
        )
        .first()
    )

    if not session:

        raise HTTPException(
            status_code=404,
            detail="No completed interview found for this candidate."
        )


    # --------------------------------------------------------
    # GET QUESTION EVALUATIONS
    # --------------------------------------------------------

    evaluations = (
        db.query(InterviewEvaluation)
        .filter(
            InterviewEvaluation.session_id == session.id
        )
        .order_by(
            InterviewEvaluation.question_number
        )
        .all()
    )

    if not evaluations:

        raise HTTPException(
            status_code=404,
            detail="This candidate's interview has not been evaluated yet."
        )


    # --------------------------------------------------------
    # GET INTERVIEW DETAILS
    # --------------------------------------------------------

    interview = (
        db.query(Interview)
        .filter(
            Interview.id == session.interview_id
        )
        .first()
    )


    # --------------------------------------------------------
    # QUESTION-LEVEL SCORES
    # --------------------------------------------------------

    relevance_scores = [
        evaluation.relevance_score
        for evaluation in evaluations
        if evaluation.relevance_score is not None
    ]

    technical_scores = [
        evaluation.technical_score
        for evaluation in evaluations
        if evaluation.technical_score is not None
    ]

    answer_quality_scores = [
        evaluation.answer_quality_score
        for evaluation in evaluations
        if evaluation.answer_quality_score is not None
    ]


    average_relevance = (
        round(
            sum(relevance_scores)
            / len(relevance_scores),
            1
        )
        if relevance_scores
        else 0
    )

    average_technical = (
        round(
            sum(technical_scores)
            / len(technical_scores),
            1
        )
        if technical_scores
        else 0
    )

    average_answer_quality = (
        round(
            sum(answer_quality_scores)
            / len(answer_quality_scores),
            1
        )
        if answer_quality_scores
        else 0
    )


    # --------------------------------------------------------
    # MODULE 7 SCORES
    # --------------------------------------------------------

    communication_score = (
        session.communication_score
        if session.communication_score is not None
        else 0
    )

    confidence_score = (
        session.confidence_score
        if session.confidence_score is not None
        else 0
    )

    professionalism_score = (
        session.professionalism_score
        if session.professionalism_score is not None
        else 0
    )

    technical_relevance_score = round(
        (
            average_relevance
            + average_technical
        ) / 2,
        1
    )

    overall = (
        session.final_overall_score
        if session.final_overall_score is not None
        else 0
    )


    # --------------------------------------------------------
    # RECOMMENDATION
    # --------------------------------------------------------

    if overall >= 90:

        recommendation = "Excellent"

    elif overall >= 75:

        recommendation = "Good"

    elif overall >= 60:

        recommendation = "Average"

    elif overall >= 40:

        recommendation = "Needs Improvement"

    else:

        recommendation = "Poor"


    # --------------------------------------------------------
    # RETURN REAL CANDIDATE REPORT
    # --------------------------------------------------------

    return {

        "candidate_id":
            candidate.id,

        "candidate_name":
            candidate.name,

        "candidate_email":
            candidate.email,

        "session_id":
            session.id,

        "interview_id":
            session.interview_id,

        "date":
            session.end_time
            or session.start_time,

        "type":
            interview.interview_type
            if interview
            else "Unknown",

        "domain":
            interview.domain
            if interview
            else "Unknown",

        "difficulty":
            interview.difficulty
            if interview
            else "Unknown",

        "duration_seconds":
            session.duration,

        "questions_attempted":
            session.questions_attempted,


        # Module 7
        "communication_score":
            communication_score,

        "confidence_score":
            confidence_score,

        "technical_relevance_score":
            technical_relevance_score,

        "professionalism_score":
            professionalism_score,

        "overall_score":
            overall,

        "recommendation":
            recommendation,


        # Visual AI
        "visual_analysis": {

            "eye_contact_percentage":
                session.eye_contact_percentage or 0.0,

            "attention_score":
                session.attention_score or 0.0,

            "facial_engagement_score":
                session.facial_engagement_score or 0.0,

            "dominant_emotion":
                session.dominant_emotion
                or "neutral",

            "emotion_distribution":
                session.emotion_distribution
                or {}
        },


        # Speech Analysis
        "speech_analysis": {

            "total_words":
                session.total_words or 0,

            "filler_count":
                session.filler_count or 0,

            "filler_percentage":
                session.filler_percentage or 0.0,

            "filler_words":
                session.filler_words
                or {}
        },


        # Question Summary
        "technical_score":
            average_technical,

        "answer_quality_score":
            average_answer_quality,

        "relevance_score":
            average_relevance,


        # Question Evaluations
        "evaluations": [

            {
                "question_number":
                    evaluation.question_number,

                "relevance_score":
                    evaluation.relevance_score,

                "technical_score":
                    evaluation.technical_score,

                "answer_quality_score":
                    evaluation.answer_quality_score,

                "overall_score":
                    evaluation.overall_score,

                "feedback":
                    evaluation.feedback
            }

            for evaluation in evaluations
        ]
    }
# ============================================================
# ADMIN DASHBOARD
# ============================================================

@app.get("/admin/dashboard")
def admin_dashboard(
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):

    # Get all users from PostgreSQL
    users = (
        db.query(User)
        .order_by(User.id.desc())
        .all()
    )

    # Count users by role
    total_users = len(users)

    total_candidates = sum(
        1 for user in users
        if user.role == "candidate"
    )

    total_recruiters = sum(
        1 for user in users
        if user.role == "recruiter"
    )

    total_admins = sum(
        1 for user in users
        if user.role == "admin"
    )

    # Count completed interview sessions
    total_interviews = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.status == "completed"
        )
        .count()
    )

    # Count AI evaluations
    total_evaluations = (
        db.query(InterviewEvaluation)
        .count()
    )

    # Return real platform data
    return {
        "total_users": total_users,
        "total_candidates": total_candidates,
        "total_recruiters": total_recruiters,
        "total_admins": total_admins,
        "total_interviews": total_interviews,
        "total_evaluations": total_evaluations,

        "users": [
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role
            }
            for user in users
        ]
    }

# ============================================================
# ADMIN SYSTEM ACTIVITY
# ============================================================

@app.get("/admin/activity")
def admin_activity(
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):

    activities = []

    # --------------------------------------------------------
    # COMPLETED INTERVIEWS
    # --------------------------------------------------------

    sessions = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.status == "completed"
        )
        .order_by(
            InterviewSession.end_time.desc()
        )
        .limit(10)
        .all()
    )

    for session in sessions:

        user = (
            db.query(User)
            .filter(User.id == session.candidate_id)
            .first()
        )

        if user:

            activities.append({
                "timestamp": session.end_time,
                "user": user.name,
                "role": user.role,
                "action": "Completed Interview",
                "status": "Success"
            })

    # --------------------------------------------------------
    # AI EVALUATIONS
    # --------------------------------------------------------

    evaluations = (
        db.query(InterviewEvaluation)
        .order_by(
            InterviewEvaluation.id.desc()
        )
        .limit(10)
        .all()
    )

    for evaluation in evaluations:

        session = (
            db.query(InterviewSession)
            .filter(
                InterviewSession.id ==
                evaluation.session_id
            )
            .first()
        )

        if session:

            user = (
                db.query(User)
                .filter(
                    User.id ==
                    session.candidate_id
                )
                .first()
            )

            if user:

                activities.append({
                    "timestamp": session.end_time,
                    "user": user.name,
                    "role": user.role,
                    "action": "AI Evaluation",
                    "status": "Success"
                })

    # --------------------------------------------------------
    # SORT LATEST FIRST
    # --------------------------------------------------------

    activities.sort(
        key=lambda x: x["timestamp"] or datetime.min,
        reverse=True
    )

    return {
        "activities": activities[:15]
    }
# ================= ADMIN ONLY =================

@app.get("/admin-area")
def admin_area(
    current_user: dict = Depends(
        require_role("admin")
    )
):

    return {
        "message": "Welcome to the Admin Area",
        "user": current_user
    }

# ================= START INTERVIEW SESSION =================

@app.post("/interviews/{interview_id}/start")
def start_interview_session(
    interview_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only candidates can start interviews
    if current_user.get("role") != "candidate":
        raise HTTPException(
            status_code=403,
            detail="Only candidates can start interviews"
        )

    user_id = int(current_user.get("sub"))

    # Check whether interview exists
    interview = (
        db.query(Interview)
        .filter(
            Interview.id == interview_id,
            Interview.user_id == user_id
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=404,
            detail="Interview not found"
        )

    # Create real session
    session = InterviewSession(
        candidate_id=user_id,
        interview_id=interview_id,
        start_time=datetime.now(timezone.utc),
        status="started",
        questions_attempted=0
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "message": "Interview session started",
        "session_id": session.id,
        "interview_id": interview_id,
        "candidate_id": user_id,
        "start_time": session.start_time,
        "status": session.status
    }

# ============================================================
# SAVE INTERVIEW ANSWER
# ============================================================

@app.post("/interviews/sessions/{session_id}/answers")
def save_interview_answer(
    session_id: int,
    question_number: int,
    question_text: str,
    answer_text: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    user_id = int(current_user.get("sub"))

    # Check that the session exists
    # and belongs to the logged-in candidate
    interview_session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id,
            InterviewSession.candidate_id == user_id
        )
        .first()
    )

    if not interview_session:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found"
        )

    # Make sure the interview is still active
    if interview_session.status != "started":
        raise HTTPException(
            status_code=400,
            detail="Interview session is not active"
        )

    # Create answer record
    answer = InterviewAnswer(
        session_id=session_id,
        question_number=question_number,
        question_text=question_text,
        answer_text=answer_text
    )

    db.add(answer)
    db.commit()
    db.refresh(answer)

    return {
        "message": "Answer saved successfully",
        "answer_id": answer.id,
        "session_id": session_id,
        "question_number": question_number
    }


# ============================================================
# EVALUATE INTERVIEW SESSION USING AI
# ============================================================

@app.post("/interviews/sessions/{session_id}/evaluate")
def evaluate_interview(
    session_id: int,
    current_user: dict = Depends(
        require_role("candidate")
    ),
    db: Session = Depends(get_db)
):

    candidate_id = int(
        current_user.get("sub")
    )

    # ========================================================
    # GET INTERVIEW SESSION
    # ========================================================

    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id,
            InterviewSession.candidate_id == candidate_id
        )
        .first()
    )

    if not session:

        raise HTTPException(
            status_code=404,
            detail="Interview session not found."
        )

    # ========================================================
    # GET INTERVIEW
    # ========================================================

    interview = (
        db.query(Interview)
        .filter(
            Interview.id == session.interview_id
        )
        .first()
    )

    if not interview:

        raise HTTPException(
            status_code=404,
            detail="Interview not found."
        )

    # ========================================================
    # GET ALL ANSWERS
    # ========================================================

    answers = (
        db.query(InterviewAnswer)
        .filter(
            InterviewAnswer.session_id == session_id
        )
        .order_by(
            InterviewAnswer.question_number.asc()
        )
        .all()
    )

    if not answers:

        raise HTTPException(
            status_code=400,
            detail="No answers found for this interview."
        )

    # ========================================================
    # REMOVE OLD EVALUATIONS
    #
    # This prevents duplicate evaluation records if the
    # candidate clicks Evaluate more than once.
    # ========================================================

    db.query(InterviewEvaluation).filter(
        InterviewEvaluation.session_id == session_id
    ).delete(
        synchronize_session=False
    )

    db.commit()

    evaluations = []

    # ========================================================
    # AI EVALUATION FOR EACH ANSWER
    # ========================================================

    for answer in answers:

        try:

            evaluation = evaluate_interview_answer(
                question=answer.question_text,
                answer=answer.answer_text,
                interview_type=interview.interview_type,
                domain=interview.domain,
                difficulty=interview.difficulty
            )

        except Exception as e:

            raise HTTPException(
                status_code=500,
                detail=(
                    f"AI evaluation failed for "
                    f"question {answer.question_number}: {str(e)}"
                )
            )

        # ====================================================
        # SAVE EVALUATION TO POSTGRESQL
        # ====================================================

        evaluation_record = InterviewEvaluation(

            session_id=session_id,

            question_number=answer.question_number,

            relevance_score=
                evaluation["relevance_score"],

            technical_score=
                evaluation["technical_score"],

            answer_quality_score=
                evaluation["answer_quality_score"],

            overall_score=
                evaluation["overall_score"],

            feedback=
                evaluation["feedback"],

            strengths=
                evaluation["strengths"],

            weaknesses=
                evaluation["weaknesses"],

            improvement_suggestions=
                evaluation["improvement_suggestions"],

            practice_recommendations=
                evaluation["practice_recommendations"],

            learning_resources=
                evaluation["learning_resources"]
        )
        db.add(evaluation_record)
        evaluations.append(evaluation)

    # ========================================================
    # SAVE ALL EVALUATIONS
    # ========================================================

    db.commit()

    # ========================================================
    # MODULE 7 — SPEECH-BASED COMMUNICATION SCORE
    # ========================================================

    total_words = (
        session.total_words
        or 0
    )

    filler_count = (
        session.filler_count
        or 0
    )

    filler_percentage = (
        session.filler_percentage
        or 0.0
    )


    # ========================================================
    # FILLER WORD COMPONENT
    # ========================================================

    if filler_percentage <= 2:

        filler_component = 100

    elif filler_percentage <= 5:

        filler_component = 90

    elif filler_percentage <= 8:

        filler_component = 80

    elif filler_percentage <= 12:

        filler_component = 65

    else:

        filler_component = 50


    # ========================================================
    # RESPONSE COMPLETENESS COMPONENT
    # ========================================================

    average_words_per_answer = (
        total_words / len(answers)
        if answers
        else 0
    )


    if average_words_per_answer >= 50:

        completeness_component = 100

    elif average_words_per_answer >= 30:

        completeness_component = 90

    elif average_words_per_answer >= 15:

        completeness_component = 75

    elif average_words_per_answer >= 5:

        completeness_component = 60

    else:

        completeness_component = 40


    # ========================================================
    # COMMUNICATION SCORE
    # ========================================================

    communication_score = round(
        (
            filler_component * 0.50
            +
            completeness_component * 0.50
        ),
        1
    )


    # ========================================================
    # MODULE 7 — CONFIDENCE SCORE
    # ========================================================

    if filler_percentage <= 2:

        confidence_score = 95

    elif filler_percentage <= 5:

        confidence_score = 88

    elif filler_percentage <= 8:

        confidence_score = 78

    elif filler_percentage <= 12:

        confidence_score = 65

    else:

        confidence_score = 50


    # ========================================================
    # MODULE 7 — TECHNICAL RELEVANCE
    # ========================================================

    if evaluations:

        average_relevance = (
            sum(
                item["relevance_score"]
                for item in evaluations
            )
            / len(evaluations)
        )

        average_technical = (
            sum(
                item["technical_score"]
                for item in evaluations
            )
            / len(evaluations)
        )

    else:

        average_relevance = 0
        average_technical = 0


    # ========================================================
    # MODULE 7 — PROFESSIONALISM SCORE
    # ========================================================

    professionalism_score = round(
        (
            completeness_component * 0.60
            +
            confidence_score * 0.40
        ),
        1
    )


    # ========================================================
    # MODULE 7 — FINAL OVERALL SCORE
    # ========================================================
    technical_relevance_score = round(
        (average_relevance + average_technical) / 2,
        1
    )
    final_overall_score = round(
        (
            communication_score * 0.30
            +
            confidence_score * 0.25
            +
            technical_relevance_score * 0.30
            +
            professionalism_score * 0.15
        ),
        1
    )


    # ========================================================
    # SAVE MODULE 7 SCORES
    # ========================================================

    session.communication_score = (
        communication_score
    )

    session.confidence_score = (
        confidence_score
    )

    session.professionalism_score = (
        professionalism_score
    )

    session.final_overall_score = (
        final_overall_score
    )


    db.commit()

    db.refresh(
        session
    )


    # ========================================================
    # PERFORMANCE RATING
    # ========================================================

    if final_overall_score >= 90:

        performance = "Excellent"

    elif final_overall_score >= 75:

        performance = "Good"

    elif final_overall_score >= 60:

        performance = "Average"

    elif final_overall_score >= 40:

        performance = "Needs Improvement"

    else:

        performance = "Poor"
        # ========================================================
        # RETURN RESULT
        # ========================================================



        # ========================================================
# RETURN COMPLETE MODULE 7 EVALUATION
# ========================================================

    return {

        "message":
            "Interview evaluated successfully",

        "session_id":
            session_id,

        "interview_id":
            interview.id,

        "questions_evaluated":
            len(evaluations),

        # ====================================================
        # MODULE 7 SCORES
        # ====================================================

        "communication_score":
            communication_score,

        "confidence_score":
            confidence_score,

        "technical_relevance_score":
            technical_relevance_score,

        "professionalism_score":
            professionalism_score,

        "overall_score":
            final_overall_score,

        "performance":
            performance,

        # ====================================================
        # SPEECH ANALYSIS
        # ====================================================

        "speech_analysis": {

            "total_words":
                total_words,

            "filler_count":
                filler_count,

            "filler_percentage":
                filler_percentage,

            "filler_words":
                session.filler_words
                or {}

        },

    # ====================================================
    # QUESTION-WISE AI EVALUATIONS
    # ====================================================

    "evaluations":
        evaluations
}
    
# ================= FINISH INTERVIEW SESSION =================

# ============================================================
# FINISH INTERVIEW SESSION
# ============================================================

@app.post("/interviews/sessions/{session_id}/finish")
def finish_interview_session(
    session_id: int,
    questions_attempted: int,
    speech_analysis: dict | None = None,
    visual_analysis: dict | None = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    user_id = int(
        current_user.get("sub")
    )

    interview_session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id,
            InterviewSession.candidate_id == user_id
        )
        .first()
    )

    if not interview_session:

        raise HTTPException(
            status_code=404,
            detail="Interview session not found"
        )

    if interview_session.status == "completed":

        raise HTTPException(
            status_code=400,
            detail="Interview session already completed"
        )

    # ========================================================
    # FINISH TIME
    # ========================================================

    end_time = datetime.now(timezone.utc)

    interview_session.end_time = end_time

    interview_session.duration = int(
        (
            end_time -
            interview_session.start_time
        ).total_seconds()
    )

    interview_session.questions_attempted = (
        questions_attempted
    )

    interview_session.status = "completed"

    # ========================================================
    # SAVE SPEECH ANALYSIS
    # ========================================================

    speech_data = speech_analysis or {}

    total_words = speech_data.get(
        "totalWords",
        0
    )

    filler_count = speech_data.get(
        "fillerCount",
        0
    )

    filler_percentage = speech_data.get(
        "fillerPercentage",
        0.0
    )

    filler_words = speech_data.get(
        "fillerWords",
        {}
    )
    # ========================================================
    # VISUAL AI ANALYSIS
    # ========================================================

    # Get visual analysis data sent by the frontend.
    visual_data = visual_analysis or {}

    # Store eye-contact percentage.
    interview_session.eye_contact_percentage = visual_data.get(
        "eyeContactPercentage",
        0.0
    )

    # Store attention score.
    interview_session.attention_score = visual_data.get(
        "attentionScore",
        0.0
    )

    # Store facial engagement score.
    interview_session.facial_engagement_score = visual_data.get(
        "facialEngagementScore",
        0.0
    )

    # Store the dominant facial expression.
    interview_session.dominant_emotion = visual_data.get(
        "dominantEmotion",
        "neutral"
    )

    # Store the distribution of the four allowed expressions.
    interview_session.emotion_distribution = visual_data.get(
        "emotionDistribution",
        {}
    )
        # ========================================================
        # STORE SPEECH ANALYSIS IN DATABASE
        # ========================================================

    interview_session.total_words = total_words

    interview_session.filler_count = filler_count

    interview_session.filler_percentage = (
        filler_percentage
        )

    interview_session.filler_words = filler_words

        # ========================================================
        # SAVE EVERYTHING
        # ========================================================

    db.commit()

    db.refresh(
        interview_session
        )

    # ========================================================
    # RETURN COMPLETED SESSION
    # ========================================================

    return {

        "message":
            "Interview session completed",

        "session_id":
            interview_session.id,

        "status":
            interview_session.status,

        "questions_attempted":
            interview_session.questions_attempted,

        "duration_seconds":
            interview_session.duration,

        "start_time":
            interview_session.start_time,

        "end_time":
            interview_session.end_time,

        "speech_analysis": {

            "totalWords":
                total_words,

            "fillerCount":
                filler_count,

            "fillerPercentage":
                filler_percentage,

            "fillerWords":
                filler_words

        }

    }# ================= GET INTERVIEW SESSION =================

@app.get("/interviews/sessions/{session_id}")
def get_interview_session(
    session_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user.get("sub"))

    interview_session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id,
            InterviewSession.candidate_id == user_id
        )
        .first()
    )

    if not interview_session:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found"
        )

    return {
        "session_id": interview_session.id,
        "candidate_id": interview_session.candidate_id,
        "interview_id": interview_session.interview_id,
        "start_time": interview_session.start_time,
        "end_time": interview_session.end_time,
        "duration_seconds": interview_session.duration,
        "status": interview_session.status,
        "questions_attempted": interview_session.questions_attempted
    }

# ============================================================
# CANDIDATE DASHBOARD DATA
# ============================================================

@app.get("/candidate/dashboard")
def get_candidate_dashboard(
    current_user: dict = Depends(require_role("candidate")),
    db: Session = Depends(get_db)
):
    user_id = int(current_user.get("sub"))

    completed_sessions = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.candidate_id == user_id,
            InterviewSession.status == "completed"
        )
        .all()
    )

    evaluation_scores = (
        db.query(InterviewEvaluation.overall_score)
        .join(
            InterviewSession,
            InterviewEvaluation.session_id == InterviewSession.id
        )
        .filter(
            InterviewSession.candidate_id == user_id
        )
        .all()
    )

    scores = [
        int(row[0])
        for row in evaluation_scores
        if row[0] is not None
    ]

    average_score = (
        round(sum(scores) / len(scores), 1)
        if scores
        else None
    )

    latest_resume = (
        db.query(Resume)
        .filter(
            Resume.user_id == user_id
        )
        .order_by(
            Resume.uploaded_at.desc()
        )
        .first()
    )

    return {
        "resume_ready": latest_resume is not None,

        "average_score": average_score,

        "completed_interviews": len(
            completed_sessions
        ),

        "readiness_score": average_score,

        "readiness_label": (
            "Excellent"
            if average_score is not None
            and average_score >= 85

            else "Good"
            if average_score is not None
            and average_score >= 70

            else "Developing"
            if average_score is not None

            else "Not assessed"
        )
    }


# ============================================================
# INTERVIEW HISTORY
# ============================================================

@app.get("/interviews/history")
def get_interview_history(
    current_user: dict = Depends(
        require_role("candidate")
    ),
    db: Session = Depends(get_db)
):

    user_id = int(
        current_user.get("sub")
    )

    sessions = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.candidate_id == user_id,
            InterviewSession.status == "completed"
        )
        .order_by(
            InterviewSession.end_time.desc()
        )
        .all()
    )

    history = []

    for session in sessions:

        interview = (
            db.query(Interview)
            .filter(
                Interview.id == session.interview_id
            )
            .first()
        )

        evaluations = (
            db.query(InterviewEvaluation)
            .filter(
                InterviewEvaluation.session_id == session.id
            )
            .all()
        )

        scores = [
            e.overall_score
            for e in evaluations
            if e.overall_score is not None
        ]

        score = (
            round(
                sum(scores) / len(scores),
                1
            )
            if scores
            else None
        )

        history.append({

            "session_id": session.id,

            "interview_id": session.interview_id,

            "date": (
                session.end_time
                or session.start_time
            ),

            "type": (
                interview.interview_type
                if interview
                else "Unknown"
            ),

            "domain": (
                interview.domain
                if interview
                else "Unknown"
            ),

            "difficulty": (
                interview.difficulty
                if interview
                else "Unknown"
            ),

            "score": score,

            "status": session.status,

            "questions_attempted": (
                session.questions_attempted
            ),

            "duration_seconds": (
                session.duration
            )
        })

    return history


# ============================================================
# INTERVIEW ANALYTICS
# ============================================================

@app.get("/interviews/analytics")
def get_interview_analytics(
    current_user: dict = Depends(
        require_role("candidate")
    ),
    db: Session = Depends(get_db)
):

    user_id = int(
        current_user.get("sub")
    )

    # ========================================================
    # GET ALL COMPLETED INTERVIEW SESSIONS
    # ========================================================

    sessions = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.candidate_id == user_id,
            InterviewSession.status == "completed"
        )
        .order_by(
            InterviewSession.end_time.asc()
        )
        .all()
    )

    # ========================================================
    # NO COMPLETED INTERVIEWS
    # ========================================================

    if not sessions:
        return {
            "completed_interviews": 0,
            "evaluated_answers": 0,
            "module7": {},
            "visual_analysis": {},
            "question_analysis": {}
        }

    # ========================================================
    # MODULE 7 SCORE LISTS
    # ========================================================

    communication_scores = [
        s.communication_score
        for s in sessions
        if s.communication_score is not None
    ]

    confidence_scores = [
        s.confidence_score
        for s in sessions
        if s.confidence_score is not None
    ]

    professionalism_scores = [
        s.professionalism_score
        for s in sessions
        if s.professionalism_score is not None
    ]

    overall_scores = [
        s.final_overall_score
        for s in sessions
        if s.final_overall_score is not None
    ]

    # ========================================================
    # VISUAL AI SCORE LISTS
    # ========================================================

    eye_contact_scores = [
        s.eye_contact_percentage
        for s in sessions
        if s.eye_contact_percentage is not None
    ]

    attention_scores = [
        s.attention_score
        for s in sessions
        if s.attention_score is not None
    ]

    facial_engagement_scores = [
        s.facial_engagement_score
        for s in sessions
        if s.facial_engagement_score is not None
    ]

    # ========================================================
    # QUESTION-LEVEL ANALYTICS
    # ========================================================

    evaluation_rows = (
        db.query(InterviewEvaluation)
        .join(
            InterviewSession,
            InterviewEvaluation.session_id
            == InterviewSession.id
        )
        .filter(
            InterviewSession.candidate_id == user_id
        )
        .all()
    )

    technical_scores = [
        e.technical_score
        for e in evaluation_rows
        if e.technical_score is not None
    ]

    quality_scores = [
        e.answer_quality_score
        for e in evaluation_rows
        if e.answer_quality_score is not None
    ]

    relevance_scores = [
        e.relevance_score
        for e in evaluation_rows
        if e.relevance_score is not None
    ]

    # ========================================================
    # HELPER FOR AVERAGES
    # ========================================================

    def average(values):

        if not values:
            return 0.0

        return round(
            sum(float(value) for value in values)
            / len(values),
            1
        )

    # ========================================================
    # EVALUATED ANSWER COUNT
    # ========================================================

    evaluation_count = len(
        evaluation_rows
    )

    # ========================================================
    # RETURN ANALYTICS
    # ========================================================

    return {

        "completed_interviews":
            len(sessions),

        "evaluated_answers":
            evaluation_count,

        # ====================================================
        # MODULE 7
        # ====================================================

        "module7": {

            "communication":
                average(
                    communication_scores
                ),

            "confidence":
                average(
                    confidence_scores
                ),

            "professionalism":
                average(
                    professionalism_scores
                ),

            "overall":
                average(
                    overall_scores
                )
        },

        # ====================================================
        # VISUAL AI
        # ====================================================

        "visual_analysis": {

            "eye_contact":
                average(
                    eye_contact_scores
                ),

            "attention":
                average(
                    attention_scores
                ),

            "facial_engagement":
                average(
                    facial_engagement_scores
                )
        },

        # ====================================================
        # QUESTION ANALYSIS
        # ====================================================

        "question_analysis": {

            "technical_depth":
                average(
                    technical_scores
                ),

            "answer_quality":
                average(
                    quality_scores
                ),

            "relevance":
                average(
                    relevance_scores
                )
        }
    }

# ============================================================
# LATEST INTERVIEW REPORT
# ============================================================

@app.get("/interviews/reports/latest")
def get_latest_interview_report(
    current_user: dict = Depends(
        require_role("candidate")
    ),
    db: Session = Depends(get_db)
):

    user_id = int(
        current_user.get("sub")
    )

    # ========================================================
    # GET THE LATEST COMPLETED SESSION
    # ========================================================

    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.candidate_id == user_id,
            InterviewSession.status == "completed"
        )
        .order_by(
            InterviewSession.end_time.desc()
        )
        .first()
    )

    # ========================================================
    # NO COMPLETED SESSION
    # ========================================================

    if not session:

        raise HTTPException(
            status_code=404,
            detail="No completed interview found."
        )

    # ========================================================
    # GET EVALUATIONS FOR THIS EXACT SESSION
    # ========================================================

    evaluations = (
        db.query(InterviewEvaluation)
        .filter(
            InterviewEvaluation.session_id == session.id
        )
        .order_by(
            InterviewEvaluation.question_number
        )
        .all()
    )

    # ========================================================
    # SESSION HAS NOT BEEN EVALUATED YET
    # ========================================================

    if not evaluations:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Interview session {session.id} "
                "has not been evaluated yet."
            )
        )

    # ========================================================
    # GET INTERVIEW DETAILS
    # ========================================================

    interview = (
        db.query(Interview)
        .filter(
            Interview.id == session.interview_id
        )
        .first()
    )

    # ========================================================
    # QUESTION-WISE AVERAGES
    # ========================================================

    relevance_scores = [
        e.relevance_score
        for e in evaluations
        if e.relevance_score is not None
    ]

    technical_scores = [
        e.technical_score
        for e in evaluations
        if e.technical_score is not None
    ]

    answer_quality_scores = [
        e.answer_quality_score
        for e in evaluations
        if e.answer_quality_score is not None
    ]

    average_relevance = (
        round(
            sum(relevance_scores)
            / len(relevance_scores),
            1
        )
        if relevance_scores
        else 0
    )

    average_technical = (
        round(
            sum(technical_scores)
            / len(technical_scores),
            1
        )
        if technical_scores
        else 0
    )

    average_answer_quality = (
        round(
            sum(answer_quality_scores)
            / len(answer_quality_scores),
            1
        )
        if answer_quality_scores
        else 0
    )

    # ========================================================
    # MODULE 7 SCORES
    #
    # Communication      = 30%
    # Confidence         = 25%
    # Technical Relevance = 30%
    # Professionalism    = 15%
    # ========================================================

    communication_score = (
        session.communication_score
        if session.communication_score is not None
        else 0
    )

    confidence_score = (
        session.confidence_score
        if session.confidence_score is not None
        else 0
    )

    professionalism_score = (
        session.professionalism_score
        if session.professionalism_score is not None
        else 0
    )

    # Technical relevance is calculated from the
    # question-wise relevance + technical scores.
    technical_relevance_score = round(
        (
            average_relevance
            + average_technical
        ) / 2,
        1
    )

    # IMPORTANT:
    # Use the final Module 7 score already calculated
    # by the evaluation endpoint.
    overall = (
        session.final_overall_score
        if session.final_overall_score is not None
        else 0
    )

    # ========================================================
    # PERFORMANCE THRESHOLDS
    # ========================================================

    if overall >= 90:

        recommendation = "Excellent"

    elif overall >= 75:

        recommendation = "Good"

    elif overall >= 60:

        recommendation = "Average"

    elif overall >= 40:

        recommendation = "Needs Improvement"

    else:

        recommendation = "Poor"

    # ========================================================
    # RETURN COMPLETE REPORT
    # ========================================================

    return {

        "session_id":
            session.id,

        "interview_id":
            session.interview_id,

        "date":
            session.end_time
            or session.start_time,

        "type":
            interview.interview_type
            if interview
            else "Unknown",

        "domain":
            interview.domain
            if interview
            else "Unknown",

        "difficulty":
            interview.difficulty
            if interview
            else "Unknown",

        "duration_seconds":
            session.duration,

        "questions_attempted":
            session.questions_attempted,

        # ====================================================
        # MODULE 7 SCORES
        # ====================================================

        "communication_score":
            communication_score,

        "confidence_score":
            confidence_score,

        "technical_relevance_score":
            technical_relevance_score,

        "professionalism_score":
            professionalism_score,

        "overall_score":
            overall,

        "recommendation":
            recommendation,
        # ====================================================
        # VISUAL AI ANALYSIS
        # ====================================================

        "visual_analysis": {

            "eye_contact_percentage":
                session.eye_contact_percentage or 0.0,

            "attention_score":
                session.attention_score or 0.0,

            "facial_engagement_score":
                session.facial_engagement_score or 0.0,

            "dominant_emotion":
                session.dominant_emotion or "neutral",

            "emotion_distribution":
                session.emotion_distribution or {}
        },
        # ====================================================
        # SPEECH ANALYSIS
        # ====================================================

        "speech_analysis": {

            "total_words":
                session.total_words or 0,

            "filler_count":
                session.filler_count or 0,

            "filler_percentage":
                session.filler_percentage or 0.0,

            "filler_words":
                session.filler_words or {}
        },

        # ====================================================
        # QUESTION-WISE SUMMARY
        # ====================================================

        "technical_score":
            average_technical,

        "answer_quality_score":
            average_answer_quality,

        "relevance_score":
            average_relevance,

        # ====================================================
        # QUESTION-WISE EVALUATIONS
        # ====================================================

        "evaluations": [

            {

                "question_number":
                    e.question_number,

                "relevance_score":
                    e.relevance_score,

                "technical_score":
                    e.technical_score,

                "answer_quality_score":
                    e.answer_quality_score,

                "overall_score":
                    e.overall_score,

                "feedback":
                    e.feedback,

                "strengths":
                    e.strengths,

                "weaknesses":
                    e.weaknesses,

                "improvement_suggestions":
                    e.improvement_suggestions,

                "practice_recommendations":
                    e.practice_recommendations,

                "learning_resources":
                    e.learning_resources
            }

            for e in evaluations
        ]
    }
# ============================================================
# IMPROVEMENT PROGRESS
# ============================================================

@app.get("/interviews/progress")
def get_interview_progress(
    current_user: dict = Depends(
        require_role("candidate")
    ),
    db: Session = Depends(get_db)
):

    user_id = int(
        current_user.get("sub")
    )

    rows = (
        db.query(

            func.avg(
                InterviewEvaluation.technical_score
            ),

            func.avg(
                InterviewEvaluation.answer_quality_score
            ),

            func.avg(
                InterviewEvaluation.relevance_score
            ),

            func.avg(
                InterviewEvaluation.overall_score
            )
        )
        .join(
            InterviewSession,
            InterviewEvaluation.session_id
            == InterviewSession.id
        )
        .filter(
            InterviewSession.candidate_id
            == user_id
        )
        .first()
    )

    (
        technical,
        quality,
        relevance,
        overall
    ) = rows

    def score(value):

        return (
            round(float(value), 1)
            if value is not None
            else None
        )

    return {

        "technical_depth": {

            "current": score(
                technical
            ),

            "target": 80
        },

        "answer_quality": {

            "current": score(
                quality
            ),

            "target": 80
        },

        "relevance": {

            "current": score(
                relevance
            ),

            "target": 80
        },

        "overall": {

            "current": score(
                overall
            ),

            "target": 80
        }
    }
# ============================================================
# CANDIDATE INTERVIEW DASHBOARD DATA
# ============================================================

@app.get("/candidate/interview-data")
def get_candidate_interview_data(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # Get the ID of the currently logged-in candidate
    candidate_id = int(
        current_user.get("sub")
    )

    # Get all interview sessions belonging to this candidate
    sessions = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.candidate_id == candidate_id
        )
        .order_by(
            InterviewSession.start_time.desc()
        )
        .all()
    )

    history = []

    total_technical = 0
    total_quality = 0
    total_relevance = 0
    total_overall = 0

    evaluation_count = 0

    for session in sessions:

        # Get the interview information
        interview = (
            db.query(Interview)
            .filter(
                Interview.id == session.interview_id
            )
            .first()
        )

        # Get evaluations for this session
        evaluations = (
            db.query(InterviewEvaluation)
            .filter(
                InterviewEvaluation.session_id == session.id
            )
            .order_by(
                InterviewEvaluation.question_number
            )
            .all()
        )

        # Default values
        technical_score = None
        quality_score = None
        relevance_score = None
        overall_score = None

        # Calculate session averages
        if evaluations:

            technical_score = round(
                sum(
                    e.technical_score
                    for e in evaluations
                ) / len(evaluations)
            )

            quality_score = round(
                sum(
                    e.answer_quality_score
                    for e in evaluations
                ) / len(evaluations)
            )

            relevance_score = round(
                sum(
                    e.relevance_score
                    for e in evaluations
                ) / len(evaluations)
            )

            overall_score = round(
                sum(
                    e.overall_score
                    for e in evaluations
                ) / len(evaluations)
            )

            total_technical += technical_score
            total_quality += quality_score
            total_relevance += relevance_score
            total_overall += overall_score

            evaluation_count += 1

        # Add this interview to history
        history.append(
            {
                "session_id": session.id,

                "interview_id": session.interview_id,

                "date": (
                    session.start_time.isoformat()
                    if session.start_time
                    else None
                ),

                "type": (
                    interview.interview_type
                    if interview
                    else "Interview"
                ),

                "domain": (
                    interview.domain
                    if interview
                    else ""
                ),

                "difficulty": (
                    interview.difficulty
                    if interview
                    else ""
                ),

                "status": session.status,

                "questions_attempted":
                    session.questions_attempted,

                "duration_seconds":
                    session.duration,

                "technical_score":
                    technical_score,

                "answer_quality_score":
                    quality_score,

                "relevance_score":
                    relevance_score,

                "overall_score":
                    overall_score
            }
        )

    # ========================================================
    # OVERALL ANALYTICS
    # ========================================================

    if evaluation_count > 0:

        analytics = {

            "technical_score":
                round(
                    total_technical /
                    evaluation_count
                ),

            "answer_quality_score":
                round(
                    total_quality /
                    evaluation_count
                ),

            "relevance_score":
                round(
                    total_relevance /
                    evaluation_count
                ),

            "overall_score":
                round(
                    total_overall /
                    evaluation_count
                )
        }

    else:

        analytics = {

            "technical_score": None,

            "answer_quality_score": None,

            "relevance_score": None,

            "overall_score": None
        }

    # ========================================================
    # LATEST REPORT
    # ========================================================

    latest_report = None

    for item in history:

        if item["overall_score"] is not None:

            latest_report = item

            break

    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "history": history,

        "analytics": analytics,

        "latest_report": latest_report,

        "progress": {

            "technical":
                analytics["technical_score"],

            "quality":
                analytics["answer_quality_score"],

            "relevance":
                analytics["relevance_score"],

            "overall":
                analytics["overall_score"]
        }
    }

@app.get("/test-gemini")
def test_gemini():

    try:

        result = ask_gemini(
            "Reply with exactly: GEMINI WORKS"
        )

        return {
            "success": True,
            "response": result
        }

    except Exception as e:

        return {
            "success": False,
            "error": str(e)
        }
# ============================================================
# VISUAL AI FRAME ANALYSIS
# ============================================================

@app.post("/interviews/sessions/{session_id}/visual-analysis")
def analyze_visual_frame(
    session_id: int,
    frame_data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check that the interview session exists
    interview_session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == session_id)
        .first()
    )

    if not interview_session:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found."
        )

    # Get the Base64 image sent by the browser
    image_data = frame_data.get("image")

    if not image_data:
        raise HTTPException(
            status_code=400,
            detail="No image data received."
        )

    try:
        # Remove the data URL prefix
        if "," in image_data:
            image_data = image_data.split(",", 1)[1]

        # Decode Base64 image
        image_bytes = base64.b64decode(image_data)

        # Convert image bytes to NumPy array
        image_array = np.frombuffer(
            image_bytes,
            dtype=np.uint8
        )

        # Convert to OpenCV image
        frame = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR
        )

        if frame is None:
            raise ValueError("Unable to decode image.")

        # ========================================================
        # FACE DETECTION USING MEDIAPIPE
        # ========================================================

        # Convert OpenCV BGR image to RGB
        rgb_frame = cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2RGB
        )

        # Create MediaPipe image
        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb_frame
        )

        # Detect face landmarks
        landmarker_result = face_landmarker.detect(
            mp_image
        )

        # No face detected
        if not landmarker_result.face_landmarks:
            return {
                "faceDetected": False,
                "eyeContact": False,
                "emotion": "neutral"
            }

        # Get the first detected face
        landmarks = landmarker_result.face_landmarks[0]

        # Get image dimensions
        image_height, image_width = frame.shape[:2]

        # Find the face bounding box from landmarks
        x_values = [
            landmark.x * image_width
            for landmark in landmarks
        ]

        y_values = [
            landmark.y * image_height
            for landmark in landmarks
        ]

        x_min = max(0, int(min(x_values)))
        x_max = min(image_width, int(max(x_values)))

        y_min = max(0, int(min(y_values)))
        y_max = min(image_height, int(max(y_values)))

        # Make sure the crop is valid
        if x_max <= x_min or y_max <= y_min:
            return {
                "faceDetected": True,
                "eyeContact": False,
                "emotion": "neutral"
            }

        # Crop the detected face for DeepFace
        face_crop = frame[
            y_min:y_max,
            x_min:x_max
        ]
        # ----------------------------------------------------
        # Emotion detection using DeepFace
        # ----------------------------------------------------

        emotion = "neutral"

        try:
            result = DeepFace.analyze(
                face_crop,
                actions=["emotion"],
                detector_backend="skip",
                enforce_detection=False,
                silent=True
            )

            if isinstance(result, list):
                result = result[0]

            detected_emotion = result.get(
                "dominant_emotion",
                "neutral"
            ).lower()

            # Only the four emotions required by our project
            allowed_emotions = {
                "happy",
                "fear",
                "surprise",
                "neutral"
            }

            if detected_emotion in allowed_emotions:
                emotion = detected_emotion
            else:
                emotion = "neutral"

        except Exception as emotion_error:
            print(
                "Emotion analysis error:",
                emotion_error
            )

        # ========================================================
        # APPROXIMATE EYE-CONTACT DETECTION
        # ========================================================

        # MediaPipe landmark 1 is approximately the nose area.
        # We use the nose position relative to the center of
        # the detected face to estimate whether the candidate
        # is looking toward the camera.

        nose_landmark = landmarks[1]

        nose_x = nose_landmark.x

        # Estimate eye contact from horizontal head position.
        # If the nose is close to the center of the image,
        # consider the candidate to be looking toward the camera.

        frame_center_x = 0.5

        horizontal_difference = abs(
            nose_x - frame_center_x
        )

        eye_contact = horizontal_difference < 0.15
        return {
            "faceDetected": True,
            "eyeContact": eye_contact,
            "emotion": emotion
        }

    except Exception as error:
        print("Visual analysis error:", error)
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail="Visual frame analysis failed."
        )