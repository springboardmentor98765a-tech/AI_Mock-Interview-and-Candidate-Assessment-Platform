import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
from models.user import User
from models.candidate import CandidateProfile
from models.recruiter import RecruiterProfile
from security.password import hash_password
from routers import auth_router, candidate_router, recruiter_router, admin_router

from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException, RequestValidationError

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SmartHire AI Backend API",
    description="Module 1: Authentication, Database Integration & User Management",
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
            "message": f"Server Error: {str(exc)}",
            "details": None
        }
    )

# CORS middleware for REST API integration with Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads static directory
upload_dir = os.path.join(os.getcwd(), "uploads")
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

# Include API Routers
app.include_router(auth_router)
app.include_router(candidate_router)
app.include_router(recruiter_router)
app.include_router(admin_router)


def seed_database():
    """Seed initial Admin user and demonstration data into PostgreSQL."""
    db: Session = SessionLocal()
    try:
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
                ats_score=92.0,
                interview_score=89.0
            )
            db.add(p2)
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
