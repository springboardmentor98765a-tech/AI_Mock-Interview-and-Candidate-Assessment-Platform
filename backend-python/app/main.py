import os
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Generator
from urllib.parse import quote_plus

import jwt
from authlib.integrations.starlette_client import OAuth
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from passlib.context import CryptContext
from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, Integer, String, Text, UniqueConstraint, create_engine, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from starlette.middleware.sessions import SessionMiddleware

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
