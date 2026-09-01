import os

# Load backend/.env environment variables if present
env_file = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_file):
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ.setdefault(key.strip(), val.strip())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
from models.user import User
from models.candidate import CandidateProfile
from models.recruiter import RecruiterProfile
from models.interview import QuestionBank, Interview, InterviewQuestion, InterviewSession, AuditLog, InterviewBehaviorAnalysis

from security.password import hash_password

from routers import (
    auth_router,
    candidate_router,
    recruiter_router,
    admin_router,
    interview_router,
    interview_api_router,
    interview_singular_api_router,
    interview_singular_noapi_router,
    question_router,
    question_api_router,
    speech_router
)
from seed_questions import seed_question_bank

from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException, RequestValidationError

# Create database tables automatically
Base.metadata.create_all(bind=engine)

# Ensure newly added Module 6 columns exist in existing PostgreSQL schema
try:
    with engine.connect() as conn:
        from sqlalchemy import text
        conn.execute(text("ALTER TABLE interview_behavior_analyses ADD COLUMN IF NOT EXISTS analysis_status VARCHAR DEFAULT 'in_progress';"))
        conn.execute(text("ALTER TABLE interview_behavior_analyses ADD COLUMN IF NOT EXISTS dominant_emotion VARCHAR DEFAULT 'neutral';"))
        conn.execute(text("ALTER TABLE interview_behavior_analyses ADD COLUMN IF NOT EXISTS emotion_distribution_json JSON;"))
        conn.execute(text("ALTER TABLE interview_behavior_analyses ADD COLUMN IF NOT EXISTS violations_json JSON;"))
        conn.commit()
except Exception as _e:
    pass

app = FastAPI(
    title="SmartHire AI Backend API",
    description="Module 1-3: Authentication, Candidate Management & AI Interview Generation",
    version="1.0.0"
)

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": str(exc.detail),
            "detail": str(exc.detail),
            "details": None
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Input validation error.",
            "details": exc.errors()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An internal server error occurred.",
            "details": None
        }
    )

# CORS middleware for REST API integration with Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://localhost:3000"
    ],
    allow_origin_regex=r"https?://(127\.0\.0\.1|localhost)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads static directory
upload_dir = os.path.join(os.getcwd(), "uploads")
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

from fastapi.responses import FileResponse, Response

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    fav_path = os.path.join(os.path.dirname(__file__), "..", "FRONTEND", "favicon.ico")
    if os.path.exists(fav_path):
        return FileResponse(fav_path)
    return Response(status_code=204)

# Include API Routers
app.include_router(auth_router)
app.include_router(candidate_router)
app.include_router(recruiter_router)
app.include_router(admin_router)
app.include_router(interview_router)
app.include_router(interview_api_router)
app.include_router(interview_singular_api_router)
app.include_router(interview_singular_noapi_router)
app.include_router(question_router)
app.include_router(question_api_router)
app.include_router(speech_router)



def seed_database():
    """Seed initial Admin user, demonstration data, and Question Bank into PostgreSQL."""
    db: Session = SessionLocal()
    try:
        # Seed Question Bank
        seed_question_bank(db)

        # Seed sample PDF resume files for static file download/preview
        resumes_dir = os.path.join(os.getcwd(), "uploads", "resumes")
        os.makedirs(resumes_dir, exist_ok=True)
        sample_resumes = ["resume_user_1.pdf", "resume_user_2.pdf", "resume_user_3.pdf"]
        for fname in sample_resumes:
            fpath = os.path.join(resumes_dir, fname)
            if not os.path.exists(fpath):
                pdf_bytes = (
                    b"%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
                    b"2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n"
                    b"3 0 obj <</Type /Page /Parent 2 0 R /Resources <</Font <</F1 4 0 R>>>> /MediaBox [0 0 612 792] /Contents 5 0 R>> endobj\n"
                    b"4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n"
                    b"5 0 obj <</Length 68>> stream\nBT /F1 18 Tf 50 700 Td (SmartHire AI Candidate Professional Resume) Tj ET\nendstream endobj\n"
                    b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000313 00000 n \n"
                    b"trailer <</Size 6 /Root 1 0 R>>\nstartxref\n431\n%%EOF\n"
                )
                with open(fpath, "wb") as f:
                    f.write(pdf_bytes)

        # Seed Admin account if not present
        admin = db.query(User).filter(User.email == "admin@smarthire.ai").first()
        if not admin:
            admin_user = User(
                name="System Administrator",
                email="admin@smarthire.ai",
                password=hash_password("Admin123!"),
                role="ADMIN",
                provider="LOCAL",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("✓ Database Seeded: System Admin account created (admin@smarthire.ai).")

        # Seed sample Candidate 1
        cand1 = db.query(User).filter(User.email == "alex.morgan@dev.io").first()
        if not cand1:
            u1 = User(
                name="Alex Morgan",
                email="alex.morgan@dev.io",
                password=hash_password("Password123!"),
                role="CANDIDATE",
                provider="LOCAL",
                is_active=True
            )
            db.add(u1)
            db.commit()
            db.refresh(u1)

            p1 = CandidateProfile(
                user_id=u1.id,
                phone="+1 (555) 234-5678",
                college="Stanford University",
                degree="B.S. Computer Science",
                branch="Software Engineering",
                graduation_year=2024,
                skills="React, TypeScript, Node.js, PostgreSQL, System Design",
                preferred_role="Senior Frontend Engineer",
                experience_level="Mid-Senior",
                linkedin="https://linkedin.com/in/alexmorgan",
                github="https://github.com/alexmorgan",
                portfolio="https://alexmorgan.dev",
                resume="resume_user_1.pdf",
                ats_score=88.0,
                interview_score=94.0
            )
            db.add(p1)
            db.commit()

        # Seed sample Candidate 2
        cand2 = db.query(User).filter(User.email == "david.chen@mit.edu").first()
        if not cand2:
            u2 = User(
                name="David Chen",
                email="david.chen@mit.edu",
                password=hash_password("Password123!"),
                role="CANDIDATE",
                provider="LOCAL",
                is_active=True
            )
            db.add(u2)
            db.commit()
            db.refresh(u2)

            p2 = CandidateProfile(
                user_id=u2.id,
                phone="+1 (555) 987-6543",
                college="MIT",
                degree="M.S. Computer Science",
                branch="Artificial Intelligence",
                graduation_year=2023,
                skills="Python, PyTorch, Java, Spring Boot, PostgreSQL",
                preferred_role="Fullstack Engineer",
                experience_level="Senior",
                linkedin="https://linkedin.com/in/davidchen",
                github="https://github.com/davidchen",
                portfolio="https://davidchen.ai",
                resume="resume_user_2.pdf",
                ats_score=92.0,
                interview_score=89.0
            )
            db.add(p2)
            db.commit()

        # Seed sample Candidate 3 (Harshitha Narahari)
        cand3 = db.query(User).filter(User.email == "harshitha@smarthire.ai").first()
        if not cand3:
            u3_cand = User(
                name="Harshitha Narahari",
                email="harshitha@smarthire.ai",
                password=hash_password("Password123!"),
                role="CANDIDATE",
                provider="LOCAL",
                is_active=True
            )
            db.add(u3_cand)
            db.commit()
            db.refresh(u3_cand)

            p3 = CandidateProfile(
                user_id=u3_cand.id,
                phone="+1 (555) 333-4444",
                college="Carnegie Mellon University",
                degree="M.S. Software Engineering",
                branch="Computer Science",
                graduation_year=2025,
                skills="Python, Java, React, SQL, Machine Learning",
                preferred_role="AI Engineer",
                experience_level="Senior",
                ats_score=95.0,
                interview_score=96.0
            )
            db.add(p3)
            db.commit()

        # Seed sample Recruiter
        rec = db.query(User).filter(User.email == "sarah@nexusinc.com").first()
        if not rec:
            u3 = User(
                name="Sarah Jenkins",
                email="sarah@nexusinc.com",
                password=hash_password("Password123!"),
                role="RECRUITER",
                provider="LOCAL",
                is_active=True
            )
            db.add(u3)
            db.commit()
            db.refresh(u3)

            r3 = RecruiterProfile(
                user_id=u3.id,
                company_name="Nexus Technologies",
                company_email="hr@nexusinc.com",
                designation="Lead Tech Recruiter",
                phone="+1 (555) 888-9999",
                website="https://nexusinc.com",
                industry="Software & Cloud Solutions",
                verification_status="VERIFIED"
            )
            db.add(r3)
            db.commit()

        # Seed sample Assigned Interviews if candidate 1 has no assigned interview
        c1 = db.query(User).filter(User.email == "alex.morgan@dev.io").first()
        r1 = db.query(User).filter(User.email == "sarah@nexusinc.com").first()
        if c1:
            existing_int = db.query(Interview).filter(Interview.candidate_id == c1.id).first()
            if not existing_int:
                sample_interview = Interview(
                    recruiter_id=r1.id if r1 else 1,
                    candidate_id=c1.id,
                    domain="Senior Frontend Engineer",
                    interview_type="Technical & React Architecture",
                    difficulty="HARD",
                    duration_mins=30,
                    status="Assigned"
                )
                db.add(sample_interview)
                db.commit()
                db.refresh(sample_interview)

                # Add sample questions to interview
                q1 = InterviewQuestion(
                    interview_id=sample_interview.id,
                    sequence_no=1,
                    question_text="Explain React 19 Fiber architecture and concurrent rendering diffing algorithm.",
                    category="Technical",
                    difficulty="HARD"
                )
                q2 = InterviewQuestion(
                    interview_id=sample_interview.id,
                    sequence_no=2,
                    question_text="How do you handle state management performance and memoization in large applications?",
                    category="Technical",
                    difficulty="MEDIUM"
                )
                db.add_all([q1, q2])
                db.commit()
                print("✓ Database Seeded: Sample assigned interview created for Alex Morgan.")

    except Exception as e:
        print(f"Error during seeding: {e}")
    finally:
        db.close()

# Run database seed
seed_database()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "SmartHire AI Backend API",
        "module": "Module 1 - Authentication, Database Integration & User Management",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
