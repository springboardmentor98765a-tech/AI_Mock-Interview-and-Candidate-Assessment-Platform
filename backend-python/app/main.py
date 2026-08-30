import os
import json
import uuid
from io import BytesIO
from datetime import datetime, timedelta, timezone
from enum import Enum
from pathlib import Path
from typing import Generator
from urllib.parse import quote_plus

import jwt
import httpx
from authlib.integrations.starlette_client import OAuth
from docx import Document
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, status

from .emotion_analysis import analyze_video_emotions
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from passlib.context import CryptContext
from pypdf import PdfReader
from sqlalchemy import JSON, Boolean, DateTime, Enum as SqlEnum, Integer, String, Text, UniqueConstraint, create_engine, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from starlette.middleware.sessions import SessionMiddleware

# Loads private settings from the exact backend .env file, regardless of where Uvicorn was started.
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env", override=True)

# Builds a safe PostgreSQL connection string from environment variables.
DATABASE_URL = os.getenv("DATABASE_URL") or (
    "postgresql+psycopg2://"
    f"{quote_plus(os.getenv('DB_USERNAME', 'postgres'))}:"
    f"{quote_plus(os.getenv('DB_PASSWORD', 'change-me'))}@"
    f"{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')}/"
    f"{os.getenv('DB_NAME', 'smarthire')}"
)
JWT_SECRET = os.getenv("JWT_SECRET", "replace-this-with-a-long-random-secret-at-least-32-characters")
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
RECORDINGS_DIR = Path(__file__).resolve().parent.parent / "private_recordings"
MAX_RECORDING_BYTES = 150 * 1024 * 1024


# Defines the roles used to control dashboard and API access.
class Role(str, Enum):
    USER = "USER"
    RECRUITER = "RECRUITER"
    ADMIN = "ADMIN"


class Provider(str, Enum):
    LOCAL = "LOCAL"
    GOOGLE = "GOOGLE"


class JobStatus(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class ApplicationStatus(str, Enum):
    APPLIED = "APPLIED"
    INTERVIEW_REQUESTED = "INTERVIEW_REQUESTED"
    INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED"
    REJECTED = "REJECTED"


class InterviewStatus(str, Enum):
    GENERATED = "GENERATED"
    IN_PROGRESS = "IN_PROGRESS"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    ENDED = "ENDED"


class Base(DeclarativeBase):
    pass


# Maps a SmartHire account to the PostgreSQL users table.
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[Role] = mapped_column(SqlEnum(Role), nullable=False, default=Role.USER)
    provider: Mapped[Provider] = mapped_column(SqlEnum(Provider), nullable=False, default=Provider.LOCAL)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    profile_image: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


# Stores one record for each successful login for admin reporting.
class LoginEvent(Base):
    __tablename__ = "login_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    provider: Mapped[Provider] = mapped_column(SqlEnum(Provider), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)


# Stores jobs posted by recruiter accounts.
class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    company: Mapped[str] = mapped_column(String(160), nullable=False)
    location: Mapped[str] = mapped_column(String(160), nullable=False)
    employment_type: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(String(4000), nullable=False)
    status: Mapped[JobStatus] = mapped_column(SqlEnum(JobStatus), nullable=False, default=JobStatus.OPEN)
    recruiter_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


# Links a candidate to a job and records the interview-request workflow.
class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("candidate_id", "job_id", name="unique_candidate_job_application"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    candidate_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    job_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    status: Mapped[ApplicationStatus] = mapped_column(SqlEnum(ApplicationStatus), nullable=False, default=ApplicationStatus.APPLIED)
    preferred_interview_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_interview_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


# Stores a candidate's generated interview questions, answers, and progress.
class Interview(Base):
    __tablename__ = "interviews"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    candidate_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    role_title: Mapped[str] = mapped_column(String(160), nullable=False)
    domain: Mapped[str] = mapped_column(String(40), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[InterviewStatus] = mapped_column(SqlEnum(InterviewStatus), nullable=False, default=InterviewStatus.GENERATED)
    questions: Mapped[list] = mapped_column(JSON, nullable=False)
    answers: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    feedback: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    current_question: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paused_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    recording_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recording_content_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    recording_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recorded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(36), unique=True, nullable=True, index=True)
    duration_limit_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=900)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    paused_total_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    question_times: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    speech_analysis: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    monitoring_summary: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    emotion_analysis: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    @property
    def has_recording(self) -> bool:
        # Exposes only whether a private recording exists; never exposes its storage path.
        return bool(self.recording_path)

    @property
    def questions_attempted(self) -> int:
        # Reports progress from the saved answers, not from a browser-only counter.
        return len(self.answers or [])

    @property
    def remaining_seconds(self) -> int:
        # Calculates the remaining interview time while the session is active.
        if self.status == InterviewStatus.IN_PROGRESS and self.started_at:
            elapsed = int((datetime.now(timezone.utc) - self.started_at).total_seconds()) - self.paused_total_seconds
            return max(0, self.duration_limit_seconds - elapsed)
        return max(0, self.duration_limit_seconds - self.duration_seconds)


# Stores the latest resume analysis for each candidate without storing the original file.
class Resume(Base):
    __tablename__ = "resumes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    candidate_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    extracted_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: Role = Role.USER


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class JobCreateRequest(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    company: str = Field(min_length=2, max_length=160)
    location: str = Field(min_length=2, max_length=160)
    employment_type: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=10, max_length=4000)


class InterviewTimeRequest(BaseModel):
    interview_at: datetime


class InterviewGenerateRequest(BaseModel):
    role_title: str = Field(min_length=2, max_length=160)
    domain: str = Field(pattern="^(Technical|Behavioral|Aptitude)$")
    difficulty: str = Field(pattern="^(Easy|Medium|Hard)$")
    question_count: int = Field(default=5, ge=3, le=10)
    duration_minutes: int = Field(default=15, ge=5, le=60)


class InterviewAnswerRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=5000)
    time_spent_seconds: int = Field(default=0, ge=0, le=3600)
    speech_metrics: dict = Field(default_factory=dict)


class InterviewMonitoringRequest(BaseModel):
    monitoring_checks: int = Field(default=0, ge=0)

    face_visible_checks: int = Field(default=0, ge=0)

    eye_contact_checks: int = Field(default=0, ge=0)

    gaze_left_checks: int = Field(default=0, ge=0)
    gaze_right_checks: int = Field(default=0, ge=0)
    gaze_down_checks: int = Field(default=0, ge=0)

    eyes_closed_checks: int = Field(default=0, ge=0)

    multiple_face_events: int = Field(default=0, ge=0)
    off_camera_events: int = Field(default=0, ge=0)

    expression_signal: str = Field(
        default="not available",
        max_length=60
    )


class ProfileUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    profile_image: str | None = Field(default=None, max_length=2_000_000)


class UserStatusRequest(BaseModel):
    is_active: bool


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr
    role: Role
    provider: Provider
    profile_image: str | None = None


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


class AdminUserResponse(UserResponse):
    created_at: datetime
    last_login: datetime | None = None
    is_active: bool


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    company: str
    location: str
    employment_type: str
    description: str
    status: JobStatus
    created_at: datetime


class RecruiterAnalyticsResponse(BaseModel):
    total_jobs: int
    open_jobs: int
    closed_jobs: int
    candidates: int


class CandidateJobResponse(JobResponse):
    application_id: int | None = None
    application_status: ApplicationStatus | None = None


class ApplicationResponse(BaseModel):
    id: int
    job_id: int
    job_title: str
    company: str
    candidate_name: str | None = None
    candidate_email: EmailStr | None = None
    status: ApplicationStatus
    preferred_interview_at: datetime | None = None
    scheduled_interview_at: datetime | None = None
    created_at: datetime


class InterviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    role_title: str
    domain: str
    difficulty: str
    status: InterviewStatus
    questions: list[dict]
    answers: list[dict]
    feedback: dict | None = None
    current_question: int
    created_at: datetime
    started_at: datetime | None = None
    paused_at: datetime | None = None
    completed_at: datetime | None = None
    ended_at: datetime | None = None
    has_recording: bool = False
    recorded_at: datetime | None = None
    session_id: str | None = None
    duration_limit_seconds: int
    duration_seconds: int
    remaining_seconds: int
    questions_attempted: int
    question_times: list[dict]
    speech_analysis: list[dict]
    monitoring_summary: dict
    emotion_analysis: dict | None = None


class RecruiterInterviewResponse(InterviewResponse):
    candidate_name: str
    candidate_email: EmailStr
    rank: int | None = None


class ResumeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    file_name: str
    extracted_data: dict
    uploaded_at: datetime


class GrowthPoint(BaseModel):
    month: str
    users: int
    logins: int


class LoginActivityResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    provider: Provider
    occurred_at: datetime


class AdminAnalyticsResponse(BaseModel):
    total_users: int
    candidates: int
    recruiters: int
    admins: int
    active_sessions: int
    new_users_this_week: int
    logins_this_week: int
    total_jobs: int
    open_jobs: int
    total_applications: int
    scheduled_interviews: int
    growth: list[GrowthPoint]


# Creates the database connection, password hasher, and optional Google OAuth client.
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
passwords = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth = OAuth()
GOOGLE_CONFIGURED = bool(os.getenv("GOOGLE_CLIENT_ID") and os.getenv("GOOGLE_CLIENT_SECRET"))
if GOOGLE_CONFIGURED:
    oauth.register(
        name="google",
        client_id=os.environ["GOOGLE_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

# Configures the API plus browser-session and frontend-origin middleware.
app = FastAPI(title="SmartHire Authentication API")
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET", JWT_SECRET))
app.add_middleware(CORSMiddleware, allow_origins=[FRONTEND_URL], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def create_tables() -> None:
    # Creates missing PostgreSQL tables when the API starts.
    Base.metadata.create_all(bind=engine)
    # Adds the active flag to databases created before account disabling was added.
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE"))
        connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT"))
        connection.execute(text("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS feedback JSON"))
        connection.execute(text("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ"))
        connection.execute(text("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ"))
        connection.execute(text("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS recording_path VARCHAR(255)"))
        connection.execute(text("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS recording_content_type VARCHAR(80)"))
        connection.execute(text("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS recording_size INTEGER"))
        connection.execute(text("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ"))
        connection.execute(text("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS session_id VARCHAR(36)"))
        connection.execute(text("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS duration_limit_seconds INTEGER NOT NULL DEFAULT 900"))
        connection.execute(text("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 0"))
        connection.execute(text("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS paused_total_seconds INTEGER NOT NULL DEFAULT 0"))
        connection.execute(text("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS question_times JSON NOT NULL DEFAULT '[]'"))
        connection.execute(text("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS speech_analysis JSON NOT NULL DEFAULT '[]'"))
        connection.execute(text("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS monitoring_summary JSON NOT NULL DEFAULT '{}'"))
        connection.execute(text("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS emotion_analysis JSON"))
        # Extends the PostgreSQL enum for databases created before pause/end support.
        connection.execute(text("ALTER TYPE interviewstatus ADD VALUE IF NOT EXISTS 'PAUSED'"))
        connection.execute(text("ALTER TYPE interviewstatus ADD VALUE IF NOT EXISTS 'ENDED'"))


def database() -> Generator[Session, None, None]:
    # Provides one database session per request and closes it afterward.
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def to_user(user: User) -> UserResponse:
    return UserResponse.model_validate(user)


def create_token(user: User) -> str:
    # Signs a JWT containing the user's identity and role with an expiry time.
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": user.email, "id": user.id, "role": user.role.value, "iat": now, "exp": now + timedelta(hours=JWT_EXPIRY_HOURS)}, JWT_SECRET, algorithm="HS256")


def record_login(db: Session, user: User) -> None:
    # Adds a successful-login event for the Admin dashboard activity feed.
    db.add(LoginEvent(user_id=user.id, email=user.email, provider=user.provider))
    db.commit()


QUESTION_TEMPLATES = {
    "Technical": {
        "Easy": ["What core skills are important for a {role}?", "Explain one tool or technology you would use as a {role}.", "Describe a simple problem you could solve in a {role} role.", "How would you check that your work as a {role} is correct?", "What is one concept you are currently learning for {role}?"],
        "Medium": ["How would you design a reliable solution for a common {role} problem?", "Describe how you would debug an issue in a {role} project.", "What trade-offs would you consider before choosing a technology for {role}?", "Explain how you would improve performance in a {role} workflow.", "How would you collaborate with another team to deliver a {role} feature?"],
        "Hard": ["Design a scalable architecture for a high-traffic {role} system and explain the trade-offs.", "How would you diagnose an intermittent production issue in a {role} application?", "Describe a secure, maintainable solution to a complex {role} requirement.", "How would you measure and improve the reliability of a {role} platform?", "Explain how you would lead a technical decision with incomplete information as a {role}."],
    },
    "Behavioral": {
        "Easy": ["Tell me about yourself and why you are interested in {role}.", "Describe a time you learned a new skill for a {role} task.", "How do you receive feedback from teammates?", "What motivates you in a {role} role?", "Describe a project you are proud of."],
        "Medium": ["Tell me about a conflict in a team and how you resolved it.", "Describe a time you had to meet a difficult deadline.", "How have you handled a mistake in a project?", "Give an example of influencing others without formal authority.", "Tell me about a time you improved an existing process."],
        "Hard": ["Describe a high-stakes decision you made with limited information.", "Tell me about a time you led through a major change.", "Describe a situation where you had to balance quality, scope, and time.", "How did you recover a project that was at risk of failing?", "Tell me about a difficult ethical decision at work."],
    },
    "Aptitude": {
        "Easy": ["A task takes 4 hours. If two equally productive people work together, how long does it take?", "Identify the next number: 2, 6, 12, 20, __.", "A project has 5 tasks and each takes 2 days. How many total task-days are required?", "Explain how you would prioritize three tasks with different deadlines.", "If a process improves from 80% to 90%, what is the percentage-point improvement?"],
        "Medium": ["A team completes 60% of work in 6 days at a constant pace. How many more days are needed?", "A system handles 120 requests per minute and demand rises by 25%. What is the new demand?", "You have two proposals with different risks and benefits. How would you compare them?", "A budget decreases by 15% from 200,000. What is the remaining budget?", "How would you estimate effort when requirements are incomplete?"],
        "Hard": ["Design a method to decide which of three urgent incidents should be handled first.", "A metric rose 20% and then fell 20%. Is it back to the original value? Explain.", "How would you test whether a reported productivity improvement is statistically meaningful?", "Explain a framework for making a decision with uncertain outcomes.", "How would you identify the root cause of a complex multi-step failure?"],
    },
}


def generate_template_questions(role_title: str, domain: str, difficulty: str, count: int) -> list[dict]:
    # Keeps local sample questions available for an optional offline-development version.
    templates = QUESTION_TEMPLATES[domain][difficulty]
    questions = [template.format(role=role_title) for template in templates]
    while len(questions) < count:
        questions.append(f"What additional challenge would you expect in a {role_title} {domain.lower()} interview?")
    return [{"number": index + 1, "text": question} for index, question in enumerate(questions[:count])]


def generate_ai_json(prompt: str, temperature: float, timeout: int) -> object | None:
    # Uses Gemini first, then the local Ollama model if Gemini is unavailable or out of quota.
    if GEMINI_API_KEY:
        try:
            response = httpx.post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
                params={"key": GEMINI_API_KEY},
                json={"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": temperature, "responseMimeType": "application/json"}},
                timeout=timeout,
            )
            response.raise_for_status()
            return json.loads(response.json()["candidates"][0]["content"]["parts"][0]["text"])
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError):
            pass

    try:
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "format": "json", "stream": False, "options": {"temperature": temperature}},
            timeout=max(timeout, 90),
        )
        response.raise_for_status()
        return json.loads(response.json()["response"])
    except (httpx.HTTPError, KeyError, TypeError, ValueError, json.JSONDecodeError):
        return None


def generate_questions(role_title: str, domain: str, difficulty: str, count: int) -> list[dict]:
    # Uses Gemini first and automatically switches to Ollama for fresh role-specific questions.
    domain_rule = {
        "Technical": "Ask only job-relevant technical questions for the stated role.",
        "Behavioral": "Ask only behavioral and situational questions. Do not ask coding or aptitude puzzles.",
        "Aptitude": "Ask only role-neutral quantitative reasoning, logical reasoning, verbal reasoning, data interpretation, or problem-solving questions. Never ask programming, coding, language-specific, framework-specific, or job-technology questions, even if the target role is a developer.",
    }[domain]
    prompt = (
        "Create interview questions for a candidate. Return only a JSON array of strings, with no Markdown or explanation. "
        f"Create exactly {count} {difficulty.lower()} {domain.lower()} interview questions for the role: {role_title}. "
        f"{domain_rule} Make every question distinct, clear, realistic, and suitable for a practice interview."
    )
    generated_questions = generate_ai_json(prompt, temperature=0.7, timeout=30)
    if isinstance(generated_questions, list) and len(generated_questions) == count and all(isinstance(question, str) and question.strip() for question in generated_questions):
        return [{"number": index + 1, "text": question.strip()} for index, question in enumerate(generated_questions)]
    # Keeps interview creation available even when both AI services are temporarily unavailable.
    return generate_template_questions(role_title, domain, difficulty, count)


def calculate_attention_score(monitoring_summary: dict) -> dict:
    # Rule-based calculation of visual attention score from camera-monitoring data.
    if not monitoring_summary:
        return {
            "attention_score": None,
            "attention_level": "Not available",
            "components": {
                "eye_contact_percentage": None,
                "face_presence_percentage": None,
                "gaze_focus_percentage": None,
                "eye_open_percentage": None
            }
        }

    monitoring_checks = int(monitoring_summary.get("monitoring_checks", 0))
    if monitoring_checks <= 0:
        return {
            "attention_score": None,
            "attention_level": "Not available",
            "components": {
                "eye_contact_percentage": None,
                "face_presence_percentage": None,
                "gaze_focus_percentage": None,
                "eye_open_percentage": None
            }
        }

    face_visible_checks = int(monitoring_summary.get("face_visible_checks", 0))
    eye_contact_checks = int(monitoring_summary.get("eye_contact_checks", 0))
    gaze_left_checks = int(monitoring_summary.get("gaze_left_checks", 0))
    gaze_right_checks = int(monitoring_summary.get("gaze_right_checks", 0))
    gaze_down_checks = int(monitoring_summary.get("gaze_down_checks", 0))
    eyes_closed_checks = int(monitoring_summary.get("eyes_closed_checks", 0))

    # Calculate individual percentages and clamp them to 0-100
    eye_contact_percentage = max(0.0, min(100.0, (eye_contact_checks / monitoring_checks) * 100.0))
    face_presence_percentage = max(0.0, min(100.0, (face_visible_checks / monitoring_checks) * 100.0))

    gaze_sum = eye_contact_checks + gaze_left_checks + gaze_right_checks + gaze_down_checks
    if gaze_sum > 0:
        gaze_focus_percentage = max(0.0, min(100.0, (eye_contact_checks / gaze_sum) * 100.0))
    else:
        gaze_focus_percentage = 100.0 if face_visible_checks > 0 else 0.0

    eye_open_percentage = 100.0 - ((eyes_closed_checks / monitoring_checks) * 100.0)
    eye_open_percentage = max(0.0, min(100.0, eye_open_percentage))

    # Weight Constants
    W_EYE_CONTACT = 0.60
    W_FACE_PRESENCE = 0.20
    W_GAZE_FOCUS = 0.10
    W_EYE_OPEN = 0.10

    # Calculate final attention score
    attention_score = (
        W_EYE_CONTACT * eye_contact_percentage +
        W_FACE_PRESENCE * face_presence_percentage +
        W_GAZE_FOCUS * gaze_focus_percentage +
        W_EYE_OPEN * eye_open_percentage
    )

    # Clamp score to 0-100 and round to nearest integer
    attention_score_clamped = max(0, min(100, round(attention_score)))

    # Determine level
    # Thresholds:
    # 80-100: High Attention
    # 50-79: Medium Attention
    # 0-49: Low Attention
    if attention_score_clamped >= 80:
        attention_level = "High"
    elif attention_score_clamped >= 50:
        attention_level = "Medium"
    else:
        attention_level = "Low"

    return {
        "attention_score": attention_score_clamped,
        "attention_level": attention_level,
        "components": {
            "eye_contact_percentage": round(eye_contact_percentage),
            "face_presence_percentage": round(face_presence_percentage),
            "gaze_focus_percentage": round(gaze_focus_percentage),
            "eye_open_percentage": round(eye_open_percentage)
        }
    }


def calculate_engagement_score(monitoring_summary: dict) -> dict:
    """Estimate observable engagement from already-calculated interview signals.

    Facial activity is the percentage of monitoring checks with a visible face and
    open eyes. Emotion stability is the highest probability in the existing
    recording-level FER+ distribution; it measures distribution concentration,
    not whether any particular emotion is good or bad.
    """
    components = {
        "eye_contact_percentage": None,
        "attention_score": None,
        "facial_activity_percentage": None,
        "emotion_stability_percentage": None,
    }
    weights = {
        "eye_contact_percentage": 0.30,
        "attention_score": 0.30,
        "facial_activity_percentage": 0.20,
        "emotion_stability_percentage": 0.20,
    }
    if not monitoring_summary:
        return {"status": "not_available", "engagement_score": None, "engagement_level": "Not available", "components": components}

    attention = monitoring_summary.get("attention_analysis") or {}
    attention_components = attention.get("components") or {}
    eye_contact = attention_components.get("eye_contact_percentage")
    attention_score = attention.get("attention_score")
    monitoring_checks = monitoring_summary.get("monitoring_checks", 0)
    face_visible_checks = monitoring_summary.get("face_visible_checks", 0)
    eyes_closed_checks = monitoring_summary.get("eyes_closed_checks", 0)

    def valid_percentage(value):
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return max(0, min(100, round(value)))
        return None

    components["eye_contact_percentage"] = valid_percentage(eye_contact)
    components["attention_score"] = valid_percentage(attention_score)

    if all(isinstance(value, int) and not isinstance(value, bool) for value in (monitoring_checks, face_visible_checks, eyes_closed_checks)) and monitoring_checks > 0:
        observable_face_checks = max(0, min(monitoring_checks, face_visible_checks - eyes_closed_checks))
        components["facial_activity_percentage"] = round(observable_face_checks / monitoring_checks * 100)

    emotion = monitoring_summary.get("emotion_analysis") or {}
    distribution = emotion.get("emotion_distribution") if emotion.get("status") == "success" else None
    probabilities = [value for value in (distribution or {}).values() if isinstance(value, (int, float)) and not isinstance(value, bool) and value >= 0]
    if probabilities and sum(probabilities) > 0:
        components["emotion_stability_percentage"] = valid_percentage(max(probabilities) * 100)

    available = {name: value for name, value in components.items() if value is not None}
    # A single signal is not a meaningful engagement estimate; use normalized
    # weights only when at least two independent observable signals exist.
    if len(available) < 2:
        return {"status": "not_available", "engagement_score": None, "engagement_level": "Not available", "components": components}

    available_weight = sum(weights[name] for name in available)
    engagement_score = round(sum(weights[name] * value for name, value in available.items()) / available_weight)
    engagement_score = max(0, min(100, engagement_score))
    engagement_level = "High" if engagement_score >= 80 else "Medium" if engagement_score >= 50 else "Low"
    return {"status": "success", "engagement_score": engagement_score, "engagement_level": engagement_level, "components": components}


def calculate_confidence_indicator(monitoring_summary: dict, speech_analysis: list[dict] | None = None) -> dict:
    """Estimate confidence indicators from observable visual and speech signals.

    Communication signal combines: pace proximity to 130 WPM (40%), low filler
    density (30%), and answer completeness at 20 words per attempted answer
    (30%). It is not a measurement of internal confidence or personality.
    """
    components = {
        "eye_contact_percentage": None,
        "attention_score": None,
        "engagement_score": None,
        "communication_signal": None,
    }
    weights = {
        "eye_contact_percentage": 0.35,
        "attention_score": 0.30,
        "engagement_score": 0.20,
        "communication_signal": 0.15,
    }

    def valid_percentage(value):
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return max(0, min(100, round(value)))
        return None

    monitoring_summary = monitoring_summary or {}
    attention = monitoring_summary.get("attention_analysis") or {}
    engagement = monitoring_summary.get("engagement_analysis") or {}
    components["eye_contact_percentage"] = valid_percentage((attention.get("components") or {}).get("eye_contact_percentage"))
    components["attention_score"] = valid_percentage(attention.get("attention_score"))
    components["engagement_score"] = valid_percentage(engagement.get("engagement_score"))

    def safe_nonnegative_int(value):
        return int(value) if isinstance(value, (int, float)) and not isinstance(value, bool) and value >= 0 else 0

    speech_items = [item for item in (speech_analysis or []) if isinstance(item, dict)]
    word_total = sum(safe_nonnegative_int(item.get("word_count")) for item in speech_items)
    filler_total = sum(safe_nonnegative_int(item.get("filler_count")) for item in speech_items)
    speech_seconds = sum(safe_nonnegative_int(item.get("speech_seconds")) for item in speech_items)
    attempted_answers = len(speech_items)
    if word_total > 0 and speech_seconds > 0 and attempted_answers > 0:
        speaking_pace = word_total / speech_seconds * 60
        pace_signal = max(0, min(100, 100 - (abs(speaking_pace - 130) / 130 * 100)))
        filler_density = filler_total / word_total * 100
        filler_signal = max(0, min(100, 100 - filler_density * 10))
        completeness_signal = max(0, min(100, word_total / (attempted_answers * 20) * 100))
        components["communication_signal"] = round(
            0.40 * pace_signal + 0.30 * filler_signal + 0.30 * completeness_signal
        )

    available = {name: value for name, value in components.items() if value is not None}
    # Require two observable components; missing signals never count as perfect.
    if len(available) < 2:
        return {"status": "not_available", "confidence_score": None, "confidence_level": "Not available", "components": components}

    available_weight = sum(weights[name] for name in available)
    confidence_score = round(sum(weights[name] * value for name, value in available.items()) / available_weight)
    confidence_score = max(0, min(100, confidence_score))
    confidence_level = "High confidence indicators" if confidence_score >= 80 else "Moderate confidence indicators" if confidence_score >= 50 else "Low confidence indicators"
    return {"status": "success", "confidence_score": confidence_score, "confidence_level": confidence_level, "components": components}


def build_behavior_summary(monitoring_summary: dict) -> dict:
    """Combine finalized observable analyses without recalculating any feature."""
    summary = {
        "eye_contact": None,
        "attention": None,
        "engagement": None,
        "confidence": None,
        "dominant_emotion": None,
    }
    weights = {"attention": 0.30, "engagement": 0.25, "confidence": 0.25, "eye_contact": 0.20}

    def valid_percentage(value):
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return max(0, min(100, round(value)))
        return None

    monitoring_summary = monitoring_summary or {}
    attention = monitoring_summary.get("attention_analysis") or {}
    engagement = monitoring_summary.get("engagement_analysis") or {}
    confidence = monitoring_summary.get("confidence_analysis") or {}
    emotion = monitoring_summary.get("emotion_analysis") or {}
    summary["eye_contact"] = valid_percentage((attention.get("components") or {}).get("eye_contact_percentage"))
    summary["attention"] = valid_percentage(attention.get("attention_score"))
    summary["engagement"] = valid_percentage(engagement.get("engagement_score"))
    summary["confidence"] = valid_percentage(confidence.get("confidence_score"))
    if emotion.get("status") == "success" and isinstance(emotion.get("dominant_emotion"), str):
        summary["dominant_emotion"] = emotion["dominant_emotion"]

    available = {name: summary[name] for name in weights if summary[name] is not None}
    if len(available) < 2:
        return {"status": "not_available", "overall_behavior_indicator": None, "overall_behavior_level": "Not available", **summary}

    available_weight = sum(weights[name] for name in available)
    indicator = round(sum(weights[name] * value for name, value in available.items()) / available_weight)
    indicator = max(0, min(100, indicator))
    level = "Strong" if indicator >= 80 else "Moderate" if indicator >= 50 else "Needs Improvement"
    return {"status": "success", "overall_behavior_indicator": indicator, "overall_behavior_level": level, **summary}


def generate_feedback(interview: Interview) -> dict:
    # Uses Gemini to assess the completed answers and create a concise practice report.
    score_categories = {
        "Technical": ["technical", "communication", "problem_solving"],
        "Behavioral": ["communication", "teamwork", "leadership"],
        "Aptitude": ["quantitative_reasoning", "logical_reasoning", "problem_solving"],
    }[interview.domain]
    category_shape = ", ".join(f'"{category}": 0-100' for category in score_categories)
    transcript = "\n".join(
        f"Question {question['number']}: {question['text']}\nAnswer: {answer.get('answer', '')}"
        for question, answer in zip(interview.questions or [], interview.answers or [])
    )
    speech = list(interview.speech_analysis or [])
    filler_total = sum(int(item.get("filler_count", 0)) for item in speech)
    word_total = sum(int(item.get("word_count", 0)) for item in speech)
    speech_seconds = sum(int(item.get("speech_seconds", 0)) for item in speech)
    communication_analysis = {
        "word_count": word_total,
        "filler_word_count": filler_total,
        "filler_words": sorted({word for item in speech for word in item.get("filler_words", [])}),
        "speaking_pace_wpm": round(word_total / max(speech_seconds, 1) * 60) if speech_seconds else 0,
        "camera_monitoring": interview.monitoring_summary or {},
    }
    prompt = (
        "Assess this practice interview fairly and constructively. Return only JSON with this exact shape: "
        f'{{"overall_score": 0-100, "category_scores": {{{category_shape}}}, '
        '"strengths": ["short point"], "improvements": ["short actionable point"], "summary": "short encouraging summary"}. '
        f"Role: {interview.role_title}. Domain: {interview.domain}. Difficulty: {interview.difficulty}. "
        f"Speech facts: {json.dumps(communication_analysis)}. Use them only as supporting evidence, not as a personality diagnosis.\n\n{transcript}"
    )
    feedback = generate_ai_json(prompt, temperature=0.35, timeout=45)
    if isinstance(feedback, dict):
        score = feedback.get("overall_score")
        categories = feedback.get("category_scores")
        if isinstance(score, (int, float)) and 0 <= score <= 100 and isinstance(categories, dict):
            feedback["communication_analysis"] = communication_analysis
            return feedback
    # Keeps the completed interview usable if both AI services are temporarily unavailable.
    return {"overall_score": 0, "category_scores": {}, "strengths": [], "improvements": [], "summary": "Your answers were saved. AI feedback is temporarily unavailable; please try another practice interview later.", "communication_analysis": communication_analysis}


def extract_resume_text(file_name: str, file_bytes: bytes) -> str:
    # Reads text from the supported resume formats before sending it for AI analysis.
    suffix = Path(file_name).suffix.lower()
    try:
        if suffix == ".pdf":
            return "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(file_bytes)).pages).strip()
        if suffix == ".docx":
            document = Document(BytesIO(file_bytes))
            return "\n".join(paragraph.text for paragraph in document.paragraphs).strip()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="The resume could not be read. Upload a valid text-based PDF or DOCX file.") from exc
    raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only PDF and DOCX resume files are supported.")


def analyze_resume(resume_text: str) -> dict:
    # Extracts structured skills, projects, education, and summary information with Gemini or Ollama.
    prompt = (
        "Extract candidate information from this resume. Return only JSON in this exact shape: "
        '{"summary":"short profile summary", "skills":["skill"], "projects":[{"name":"project name", "description":"one short description", "technologies":["technology"]}], '
        '"education":["education item"], "experience":["experience item"]}. '
        "Do not invent information. Use empty arrays when a section is absent.\n\nRESUME:\n"
        f"{resume_text[:24000]}"
    )
    analysis = generate_ai_json(prompt, temperature=0.1, timeout=45)
    required_fields = {"summary", "skills", "projects", "education", "experience"}
    if isinstance(analysis, dict) and required_fields.issubset(analysis) and isinstance(analysis["skills"], list):
        return analysis
    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI resume analysis is temporarily unavailable. Start Ollama with the configured model and try again.")


def to_interview(interview: Interview) -> InterviewResponse:
    # Converts a saved interview session into the API format used by the dashboard.
    return InterviewResponse.model_validate(interview)


def finalize_session_time(interview: Interview, ended_at: datetime) -> None:
    # Freezes active duration at end time so session reporting remains accurate after closing.
    if interview.started_at:
        interview.duration_seconds = max(0, int((ended_at - interview.started_at).total_seconds()) - interview.paused_total_seconds)


def current_user(request: Request, db: Session = Depends(database)) -> User:
    # Validates the Bearer JWT and returns the matching logged-in user.
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required.")
    try:
        email = jwt.decode(header[7:], JWT_SECRET, algorithms=["HS256"])["sub"]
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account no longer exists.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been disabled. Contact an administrator.")
    return user


def require_roles(*roles: Role):
    # Creates a reusable guard that allows only the listed user roles.
    def check(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission for this action.")
        return user
    return check


@app.post("/api/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(database)) -> AuthResponse:
    # Creates a local account with a BCrypt-hashed password and returns a JWT.
    email = str(request.email).lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for this email.")
    if request.role == Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin accounts cannot be self-registered.")
    user = User(name=request.name.strip(), email=email, password=passwords.hash(request.password), role=request.role, provider=Provider.LOCAL)
    db.add(user); db.commit(); db.refresh(user)
    record_login(db, user)
    return AuthResponse(token=create_token(user), user=to_user(user))


@app.post("/api/auth/login", response_model=AuthResponse)
def login(request: LoginRequest, db: Session = Depends(database)) -> AuthResponse:
    # Verifies local credentials, records the login, and returns a fresh JWT.
    user = db.query(User).filter(User.email == str(request.email).lower()).first()
    if not user or user.provider != Provider.LOCAL or not user.password or not passwords.verify(request.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been disabled. Contact an administrator.")
    record_login(db, user)
    return AuthResponse(token=create_token(user), user=to_user(user))


@app.get("/api/profile", response_model=UserResponse)
def profile(user: User = Depends(current_user)) -> UserResponse:
    # Returns the profile for the user authenticated by the JWT.
    return to_user(user)


@app.put("/api/profile", response_model=UserResponse)
def update_profile(request: ProfileUpdateRequest, db: Session = Depends(database), user: User = Depends(current_user)) -> UserResponse:
    # Updates safe profile fields only; roles are never changed through this profile API.
    user.name = request.name.strip(); user.profile_image = request.profile_image; db.commit(); db.refresh(user)
    return to_user(user)


@app.get("/api/recruiter/access")
def recruiter_access(user: User = Depends(require_roles(Role.RECRUITER, Role.ADMIN))) -> dict[str, str]:
    return {"message": "Recruiter access granted"}


@app.get("/api/recruiter/jobs", response_model=list[JobResponse])
def recruiter_jobs(db: Session = Depends(database), user: User = Depends(require_roles(Role.RECRUITER, Role.ADMIN))) -> list[JobResponse]:
    # Returns a recruiter's own postings; administrators can see all postings.
    query = db.query(Job)
    if user.role != Role.ADMIN:
        query = query.filter(Job.recruiter_id == user.id)
    return [JobResponse.model_validate(job) for job in query.order_by(Job.created_at.desc()).all()]


@app.post("/api/recruiter/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(request: JobCreateRequest, db: Session = Depends(database), user: User = Depends(require_roles(Role.RECRUITER, Role.ADMIN))) -> JobResponse:
    # Creates an open job posting owned by the authenticated recruiter.
    job = Job(
        title=request.title.strip(), company=request.company.strip(), location=request.location.strip(),
        employment_type=request.employment_type.strip(), description=request.description.strip(), recruiter_id=user.id,
    )
    db.add(job); db.commit(); db.refresh(job)
    return JobResponse.model_validate(job)


@app.get("/api/recruiter/analytics", response_model=RecruiterAnalyticsResponse)
def recruiter_analytics(db: Session = Depends(database), user: User = Depends(require_roles(Role.RECRUITER, Role.ADMIN))) -> RecruiterAnalyticsResponse:
    # Calculates job-posting totals from real database records.
    query = db.query(Job)
    if user.role != Role.ADMIN:
        query = query.filter(Job.recruiter_id == user.id)
    jobs = query.all()
    return RecruiterAnalyticsResponse(
        total_jobs=len(jobs), open_jobs=sum(job.status == JobStatus.OPEN for job in jobs),
        closed_jobs=sum(job.status == JobStatus.CLOSED for job in jobs),
        candidates=db.query(User).filter(User.role == Role.USER).count(),
    )


@app.get("/api/recruiter/applications", response_model=list[ApplicationResponse])
def recruiter_applications(db: Session = Depends(database), user: User = Depends(require_roles(Role.RECRUITER, Role.ADMIN))) -> list[ApplicationResponse]:
    # Returns applications for jobs posted by this recruiter.
    jobs = db.query(Job).all() if user.role == Role.ADMIN else db.query(Job).filter(Job.recruiter_id == user.id).all()
    job_map = {job.id: job for job in jobs}
    applications = db.query(Application).filter(Application.job_id.in_(job_map.keys())).order_by(Application.created_at.desc()).all() if job_map else []
    candidates = {candidate.id: candidate for candidate in db.query(User).filter(User.id.in_([item.candidate_id for item in applications])).all()} if applications else {}
    return [ApplicationResponse(id=item.id, job_id=item.job_id, job_title=job_map[item.job_id].title, company=job_map[item.job_id].company, candidate_name=candidates.get(item.candidate_id).name if item.candidate_id in candidates else "Deleted user", candidate_email=candidates.get(item.candidate_id).email if item.candidate_id in candidates else None, status=item.status, preferred_interview_at=item.preferred_interview_at, scheduled_interview_at=item.scheduled_interview_at, created_at=item.created_at) for item in applications]


@app.post("/api/recruiter/applications/{application_id}/schedule", response_model=ApplicationResponse)
def schedule_interview(application_id: int, request: InterviewTimeRequest, db: Session = Depends(database), user: User = Depends(require_roles(Role.RECRUITER, Role.ADMIN))) -> ApplicationResponse:
    # Lets the job owner confirm an interview date for an applicant.
    application = db.get(Application, application_id)
    job = db.get(Job, application.job_id) if application else None
    if not application or not job or (user.role != Role.ADMIN and job.recruiter_id != user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    application.scheduled_interview_at = request.interview_at
    application.status = ApplicationStatus.INTERVIEW_SCHEDULED
    db.commit(); db.refresh(application)
    candidate = db.get(User, application.candidate_id)
    return ApplicationResponse(id=application.id, job_id=job.id, job_title=job.title, company=job.company, candidate_name=candidate.name if candidate else "Deleted user", candidate_email=candidate.email if candidate else None, status=application.status, preferred_interview_at=application.preferred_interview_at, scheduled_interview_at=application.scheduled_interview_at, created_at=application.created_at)


@app.get("/api/candidate/jobs", response_model=list[CandidateJobResponse])
def candidate_jobs(db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> list[CandidateJobResponse]:
    # Shows all open jobs and this candidate's application status for each one.
    applications = {item.job_id: item for item in db.query(Application).filter(Application.candidate_id == user.id).all()}
    jobs = db.query(Job).filter(Job.status == JobStatus.OPEN).order_by(Job.created_at.desc()).all()
    return [CandidateJobResponse(id=job.id, title=job.title, company=job.company, location=job.location, employment_type=job.employment_type, description=job.description, status=job.status, created_at=job.created_at, application_id=applications[job.id].id if job.id in applications else None, application_status=applications[job.id].status if job.id in applications else None) for job in jobs]


@app.get("/api/candidate/resume", response_model=ResumeResponse | None)
def candidate_resume(db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> ResumeResponse | None:
    # Returns the logged-in candidate's latest extracted resume details.
    resume = db.query(Resume).filter(Resume.candidate_id == user.id).first()
    return ResumeResponse.model_validate(resume) if resume else None


@app.post("/api/candidate/resume", response_model=ResumeResponse)
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> ResumeResponse:
    # Reads a PDF/DOCX resume, extracts structured details with Gemini, and saves the result.
    file_name = file.filename or "resume"
    if Path(file_name).suffix.lower() not in {".pdf", ".docx"}:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Upload a PDF or DOCX resume.")
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="The selected resume file is empty.")
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Resume files must be 5 MB or smaller.")
    resume_text = extract_resume_text(file_name, file_bytes)
    if len(resume_text) < 40:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No readable text was found. Upload a text-based PDF or DOCX resume.")
    extracted_data = analyze_resume(resume_text)
    resume = db.query(Resume).filter(Resume.candidate_id == user.id).first()
    if resume:
        resume.file_name = file_name; resume.extracted_data = extracted_data; resume.uploaded_at = datetime.now(timezone.utc)
    else:
        resume = Resume(candidate_id=user.id, file_name=file_name, extracted_data=extracted_data)
        db.add(resume)
    db.commit(); db.refresh(resume)
    return ResumeResponse.model_validate(resume)


@app.delete("/api/candidate/resume", status_code=status.HTTP_204_NO_CONTENT)
def clear_resume(db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> None:
    # Removes the logged-in candidate's saved resume analysis from PostgreSQL.
    resume = db.query(Resume).filter(Resume.candidate_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No saved resume analysis was found.")
    db.delete(resume); db.commit()


@app.post("/api/candidate/jobs/{job_id}/apply", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_for_job(job_id: int, db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> ApplicationResponse:
    # Creates one application per candidate per open job.
    job = db.get(Job, job_id)
    if not job or job.status != JobStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Open job not found.")
    if db.query(Application).filter(Application.candidate_id == user.id, Application.job_id == job_id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already applied for this job.")
    application = Application(candidate_id=user.id, job_id=job_id)
    db.add(application); db.commit(); db.refresh(application)
    return ApplicationResponse(id=application.id, job_id=job.id, job_title=job.title, company=job.company, status=application.status, preferred_interview_at=None, scheduled_interview_at=None, created_at=application.created_at)


@app.post("/api/candidate/applications/{application_id}/request-interview", response_model=ApplicationResponse)
def request_interview(application_id: int, request: InterviewTimeRequest, db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> ApplicationResponse:
    # Saves the candidate's preferred interview time for recruiter review.
    application = db.get(Application, application_id)
    job = db.get(Job, application.job_id) if application else None
    if not application or application.candidate_id != user.id or not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    application.preferred_interview_at = request.interview_at
    application.status = ApplicationStatus.INTERVIEW_REQUESTED
    db.commit(); db.refresh(application)
    return ApplicationResponse(id=application.id, job_id=job.id, job_title=job.title, company=job.company, status=application.status, preferred_interview_at=application.preferred_interview_at, scheduled_interview_at=None, created_at=application.created_at)


@app.post("/api/interviews/generate", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
def generate_interview(request: InterviewGenerateRequest, db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> InterviewResponse:
    # Saves a new role-based practice interview with its generated questions.
    interview = Interview(
        candidate_id=user.id,
        role_title=request.role_title.strip(),
        domain=request.domain,
        difficulty=request.difficulty,
        questions=generate_questions(request.role_title.strip(), request.domain, request.difficulty, request.question_count),
        session_id=str(uuid.uuid4()),
        duration_limit_seconds=request.duration_minutes * 60,
    )
    db.add(interview); db.commit(); db.refresh(interview)
    return to_interview(interview)


@app.get("/api/interviews", response_model=list[InterviewResponse])
@app.get("/api/interviews/history", response_model=list[InterviewResponse])
def interview_history(db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> list[InterviewResponse]:
    # Returns the authenticated candidate's generated and completed interview sessions.
    interviews = db.query(Interview).filter(Interview.candidate_id == user.id).order_by(Interview.created_at.desc()).all()
    return [to_interview(interview) for interview in interviews]


@app.get("/api/interviews/{interview_id}", response_model=InterviewResponse)
def get_interview(interview_id: int, db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> InterviewResponse:
    # Retrieves one interview only when it belongs to the logged-in candidate.
    interview = db.get(Interview, interview_id)
    if not interview or interview.candidate_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    return to_interview(interview)


@app.post("/api/interviews/{interview_id}/start", response_model=InterviewResponse)
def start_interview(interview_id: int, db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> InterviewResponse:
    # Marks a generated interview as in progress while keeping its original questions.
    interview = db.get(Interview, interview_id)
    if not interview or interview.candidate_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    if interview.status in {InterviewStatus.COMPLETED, InterviewStatus.ENDED}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This interview is already completed or ended.")
    interview.status = InterviewStatus.IN_PROGRESS
    interview.started_at = interview.started_at or datetime.now(timezone.utc)
    db.commit(); db.refresh(interview)
    return to_interview(interview)


@app.post("/api/interviews/{interview_id}/pause", response_model=InterviewResponse)
def pause_interview(interview_id: int, db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> InterviewResponse:
    interview = db.get(Interview, interview_id)
    if not interview or interview.candidate_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    if interview.status in {InterviewStatus.COMPLETED, InterviewStatus.ENDED}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This interview cannot be paused after it is finished.")
    if interview.status == InterviewStatus.PAUSED:
        return to_interview(interview)
    interview.status = InterviewStatus.PAUSED
    interview.paused_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(interview)
    return to_interview(interview)


@app.post("/api/interviews/{interview_id}/resume", response_model=InterviewResponse)
def resume_interview(interview_id: int, db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> InterviewResponse:
    interview = db.get(Interview, interview_id)
    if not interview or interview.candidate_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    if interview.status in {InterviewStatus.COMPLETED, InterviewStatus.ENDED}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This interview is already finished.")
    if interview.status == InterviewStatus.IN_PROGRESS:
        return to_interview(interview)
    if interview.paused_at:
        interview.paused_total_seconds += max(0, int((datetime.now(timezone.utc) - interview.paused_at).total_seconds()))
        interview.paused_at = None
    interview.status = InterviewStatus.IN_PROGRESS
    interview.started_at = interview.started_at or datetime.now(timezone.utc)
    db.commit(); db.refresh(interview)
    return to_interview(interview)


@app.post("/api/interviews/{interview_id}/end", response_model=InterviewResponse)
def end_interview(interview_id: int, db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> InterviewResponse:
    interview = db.get(Interview, interview_id)
    if not interview or interview.candidate_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    if interview.status in {InterviewStatus.COMPLETED, InterviewStatus.ENDED}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This interview has already ended.")
    interview.status = InterviewStatus.ENDED
    interview.ended_at = datetime.now(timezone.utc)
    interview.started_at = interview.started_at or interview.ended_at
    finalize_session_time(interview, interview.ended_at)
    if interview.answers:
        interview.feedback = generate_feedback(interview)
    db.commit(); db.refresh(interview)
    return to_interview(interview)


@app.put("/api/interviews/{interview_id}", response_model=InterviewResponse)
def answer_interview_question(interview_id: int, request: InterviewAnswerRequest, db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> InterviewResponse:
    # Saves the answer for the current question and completes the session after the final answer.
    interview = db.get(Interview, interview_id)
    if not interview or interview.candidate_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    if interview.status not in {InterviewStatus.IN_PROGRESS, InterviewStatus.GENERATED}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start the interview before submitting an answer.")
    if interview.current_question >= len(interview.questions or []):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="All interview questions have already been answered.")
    answers = list(interview.answers or [])
    answered_at = datetime.now(timezone.utc)
    answers.append({"question_number": interview.current_question + 1, "answer": request.answer.strip(), "answered_at": answered_at.isoformat()})
    interview.answers = answers
    speech = list(interview.speech_analysis or [])
    speech.append({"question_number": interview.current_question + 1, **request.speech_metrics})
    interview.speech_analysis = speech
    times = list(interview.question_times or [])
    times.append({"question_number": interview.current_question + 1, "time_spent_seconds": request.time_spent_seconds})
    interview.question_times = times
    interview.current_question += 1
    if interview.current_question >= len(interview.questions):
        interview.status = InterviewStatus.COMPLETED
        interview.completed_at = answered_at
        interview.ended_at = interview.completed_at
        finalize_session_time(interview, interview.completed_at)
        interview.feedback = generate_feedback(interview)
    db.commit(); db.refresh(interview)
    return to_interview(interview)


@app.post("/api/interviews/{interview_id}/monitoring", response_model=InterviewResponse)
def save_interview_monitoring(interview_id: int, request: InterviewMonitoringRequest, db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> InterviewResponse:
    # Persists transparent browser-side face visibility and camera-alignment signals for this session.
    interview = db.get(Interview, interview_id)
    if not interview or interview.candidate_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    
    existing_monitoring = dict(interview.monitoring_summary or {})
    new_monitoring = request.model_dump()

    # Merge new browser monitoring values with the existing monitoring data, preserving other keys like emotion_analysis
    for key, value in new_monitoring.items():
        existing_monitoring[key] = value

    interview.monitoring_summary = existing_monitoring
    db.commit(); db.refresh(interview)
    return to_interview(interview)


@app.post("/api/interviews/{interview_id}/recording", response_model=InterviewResponse)
async def upload_interview_recording(interview_id: int, file: UploadFile = File(...), db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> InterviewResponse:
    # Stores a browser-recorded interview under a random private filename owned by its candidate.
    interview = db.get(Interview, interview_id)
    if not interview or interview.candidate_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    content_type = (file.content_type or "").lower()
    if not (content_type.startswith("video/webm") or content_type.startswith("video/mp4")):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only WebM or MP4 interview recordings are supported.")
    RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
    extension = ".mp4" if content_type.startswith("video/mp4") else ".webm"
    filename = f"interview-{interview.id}-{uuid.uuid4().hex}{extension}"
    destination = RECORDINGS_DIR / filename
    total_bytes = 0
    try:
        with destination.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > MAX_RECORDING_BYTES:
                    raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="The recording is larger than the 150 MB limit.")
                output.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await file.close()
    old_recording = RECORDINGS_DIR / interview.recording_path if interview.recording_path else None
    if old_recording:
        old_recording.unlink(missing_ok=True)
    interview.recording_path = filename
    interview.recording_content_type = content_type.split(";", 1)[0]
    interview.recording_size = total_bytes
    interview.recorded_at = datetime.now(timezone.utc)
    
    # Analyze emotions from the recording.
    try:
        emotion_result = analyze_video_emotions(
            str(destination),
            sample_every_seconds=3
        )
        if emotion_result.get("status") == "success":
            interview.emotion_analysis = emotion_result
            current_monitoring = dict(interview.monitoring_summary or {})
            current_monitoring["emotion_analysis"] = emotion_result
            interview.monitoring_summary = current_monitoring
    except Exception:
        # If emotion analysis fails, still allow the recording to be saved.
        pass

    # Calculate attention score using the updated/current monitoring summary.
    # Preserve existing monitoring data.
    current_monitoring = dict(interview.monitoring_summary or {})
    attention_result = calculate_attention_score(current_monitoring)
    current_monitoring["attention_analysis"] = attention_result
    # Engagement is calculated after emotion and attention without modifying either result.
    current_monitoring["engagement_analysis"] = calculate_engagement_score(current_monitoring)
    # Confidence indicators reuse finalized attention and engagement plus saved speech facts.
    current_monitoring["confidence_analysis"] = calculate_confidence_indicator(current_monitoring, interview.speech_analysis)
    # Final overview only combines saved analyses; it does not recalculate them.
    current_monitoring["behavior_summary"] = build_behavior_summary(current_monitoring)
    interview.monitoring_summary = current_monitoring

    # Regenerate feedback since we now have the video emotion analysis and attention analysis
    try:
        if interview.answers:
            interview.feedback = generate_feedback(interview)
    except Exception:
        pass

    db.commit(); db.refresh(interview)
    return to_interview(interview)


@app.get("/api/interviews/{interview_id}/recording")
def access_interview_recording(interview_id: int, db: Session = Depends(database), user: User = Depends(current_user)) -> FileResponse:
    # Allows the owner, an Admin, or a recruiter to stream a protected interview recording.
    interview = db.get(Interview, interview_id)
    if not interview or not interview.recording_path or (interview.candidate_id != user.id and user.role not in {Role.ADMIN, Role.RECRUITER}):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found.")
    recording = RECORDINGS_DIR / interview.recording_path
    if not recording.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording file not found.")
    return FileResponse(recording, media_type=interview.recording_content_type or "video/webm", filename=f"interview-{interview.id}-recording")


@app.get("/api/recruiter/interviews", response_model=list[RecruiterInterviewResponse])
def recruiter_interview_history(db: Session = Depends(database), user: User = Depends(require_roles(Role.RECRUITER, Role.ADMIN))) -> list[RecruiterInterviewResponse]:
    # Lets recruiters compare completed candidate practice interviews using saved reports and ranks.
    interviews = db.query(Interview).filter(Interview.status.in_([InterviewStatus.COMPLETED, InterviewStatus.ENDED])).order_by(Interview.ended_at.desc()).all()
    candidate_best_scores: dict[int, float] = {}
    for item in interviews:
        score = (item.feedback or {}).get("overall_score")
        if isinstance(score, (int, float)):
            candidate_best_scores[item.candidate_id] = max(candidate_best_scores.get(item.candidate_id, float("-inf")), score)
    ordered_candidates = sorted(candidate_best_scores, key=lambda candidate_id: candidate_best_scores[candidate_id], reverse=True)
    ranks = {candidate_id: index + 1 for index, candidate_id in enumerate(ordered_candidates)}
    candidates = {item.id: item for item in db.query(User).filter(User.id.in_({interview.candidate_id for interview in interviews})).all()} if interviews else {}
    result = []
    for interview in interviews:
        candidate = candidates.get(interview.candidate_id)
        if candidate:
            result.append(RecruiterInterviewResponse(**to_interview(interview).model_dump(), candidate_name=candidate.name, candidate_email=candidate.email, rank=ranks.get(interview.candidate_id)))
    return sorted(result, key=lambda item: (item.rank is None, item.rank or 10**9, item.ended_at or item.created_at), reverse=False)


@app.delete("/api/interviews/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interview(interview_id: int, db: Session = Depends(database), user: User = Depends(require_roles(Role.USER))) -> None:
    # Removes one of the logged-in candidate's saved practice sessions.
    interview = db.get(Interview, interview_id)
    if not interview or interview.candidate_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    if interview.recording_path:
        (RECORDINGS_DIR / interview.recording_path).unlink(missing_ok=True)
    db.delete(interview); db.commit()


@app.get("/api/admin/access")
def admin_access(user: User = Depends(require_roles(Role.ADMIN))) -> dict[str, str]:
    return {"message": "Administrator access granted"}


@app.get("/api/admin/users", response_model=list[AdminUserResponse])
def admin_users(db: Session = Depends(database), _: User = Depends(require_roles(Role.ADMIN))) -> list[AdminUserResponse]:
    # Returns real user accounts and each account's latest recorded login.
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [AdminUserResponse(
        id=user.id, name=user.name, email=user.email, role=user.role, provider=user.provider,
        created_at=user.created_at, is_active=user.is_active,
        last_login=db.query(LoginEvent.occurred_at).filter(LoginEvent.user_id == user.id).order_by(LoginEvent.occurred_at.desc()).first()[0] if db.query(LoginEvent).filter(LoginEvent.user_id == user.id).first() else None,
    ) for user in users]


@app.patch("/api/admin/users/{user_id}/status")
def set_user_status(user_id: int, request: UserStatusRequest, db: Session = Depends(database), admin: User = Depends(require_roles(Role.ADMIN))) -> dict[str, int | bool]:
    # Enables or disables an account so it can no longer authenticate or use a JWT.
    account = db.get(User, user_id)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if account.id == admin.id and not request.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot disable your own administrator account.")
    account.is_active = request.is_active
    db.commit()
    return {"id": account.id, "is_active": account.is_active}


def month_start(value: datetime, offset: int) -> datetime:
    # Calculates the first day of a month used in the six-month growth report.
    month = value.month - offset
    year = value.year
    while month <= 0:
        month += 12
        year -= 1
    return datetime(year, month, 1, tzinfo=timezone.utc)


@app.get("/api/admin/analytics", response_model=AdminAnalyticsResponse)
def admin_analytics(db: Session = Depends(database), _: User = Depends(require_roles(Role.ADMIN))) -> AdminAnalyticsResponse:
    # Calculates live account, login, and monthly growth statistics for Admin.
    now = datetime.now(timezone.utc)
    users = db.query(User).all()
    events = db.query(LoginEvent).all()
    jobs = db.query(Job).all()
    applications = db.query(Application).all()
    growth = []
    for offset in range(5, -1, -1):
        start = month_start(now, offset)
        end = month_start(now, offset - 1) if offset else now + timedelta(seconds=1)
        growth.append(GrowthPoint(
            month=start.strftime("%b"),
            users=sum(start <= user.created_at < end for user in users),
            logins=sum(start <= event.occurred_at < end for event in events),
        ))
    week_ago = now - timedelta(days=7)
    recent_cutoff = now - timedelta(minutes=30)
    return AdminAnalyticsResponse(
        total_users=len(users),
        candidates=sum(user.role == Role.USER for user in users),
        recruiters=sum(user.role == Role.RECRUITER for user in users),
        admins=sum(user.role == Role.ADMIN for user in users),
        active_sessions=len({event.user_id for event in events if event.occurred_at >= recent_cutoff}),
        new_users_this_week=sum(user.created_at >= week_ago for user in users),
        logins_this_week=sum(event.occurred_at >= week_ago for event in events),
        total_jobs=len(jobs),
        open_jobs=sum(job.status == JobStatus.OPEN for job in jobs),
        total_applications=len(applications),
        scheduled_interviews=sum(item.status == ApplicationStatus.INTERVIEW_SCHEDULED for item in applications),
        growth=growth,
    )


@app.get("/api/admin/login-activity", response_model=list[LoginActivityResponse])
def login_activity(db: Session = Depends(database), _: User = Depends(require_roles(Role.ADMIN))) -> list[LoginActivityResponse]:
    # Returns the ten most recent successful sign-ins for the Admin activity panel.
    events = db.query(LoginEvent).order_by(LoginEvent.occurred_at.desc()).limit(10).all()
    names = {user.id: user.name for user in db.query(User).filter(User.id.in_([event.user_id for event in events])).all()} if events else {}
    return [LoginActivityResponse(id=event.id, name=names.get(event.user_id, "Deleted user"), email=event.email, provider=event.provider, occurred_at=event.occurred_at) for event in events]


@app.get("/oauth2/authorization/google")
async def google_login(request: Request):
    # Redirects the user to Google after confirming OAuth credentials are configured.
    if not GOOGLE_CONFIGURED:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth has not been configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then restart the API.")
    google = oauth.create_client("google")
    return await google.authorize_redirect(request, str(request.url_for("google_callback")))


@app.get("/auth/google/callback", name="google_callback")
async def google_callback(request: Request, db: Session = Depends(database)):
    # Creates or finds the Google account, records login activity, and issues a JWT.
    if not GOOGLE_CONFIGURED:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth has not been configured.")
    google = oauth.create_client("google")
    token = await google.authorize_access_token(request)
    info = token.get("userinfo") or await google.userinfo(token=token)
    email = info["email"].lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(name=info.get("name") or email, email=email, role=Role.USER, provider=Provider.GOOGLE)
        db.add(user); db.commit(); db.refresh(user)
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been disabled. Contact an administrator.")
    record_login(db, user)
    return RedirectResponse(f"{FRONTEND_URL}/login?token={create_token(user)}")
