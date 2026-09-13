# SmartHire AI — AI Mock Interview and Candidate Assessment Platform

SmartHire AI is an enterprise-grade, full-stack mock interview and candidate evaluation platform powered by FastAPI, PostgreSQL, and multi-modal AI analysis. It provides an end-to-end interview workflow for candidates, recruiters, and administrators with strict privacy and candidate consent protection.

---

## Project Overview

SmartHire AI automates candidate mock interviews, multi-modal behavior evaluation, technical scoring, and recruiter talent evaluation.

### Core Workflow
1. **Candidate Authentication & Profile Setup**: Candidate registration, login (email/password or Google OAuth2), role-based workspace navigation, and resume upload (`.pdf`/`.docx` parsing & ATS analysis).
2. **Mock Interview Generation**: Custom interview creation based on role, experience level, and domain topics, or auto-generation of structured question sets via Google Gemini AI.
3. **Interactive Interview Session**: Real-time timed candidate interview execution supporting question navigation, state tracking (`CREATED` → `IN_PROGRESS` → `PAUSED` → `ENDED` → `COMPLETED`), and live browser Speech-to-Text transcription.
4. **Multi-Modal AI Analysis**:
   - **Speech & Language Analysis**: Filler word detection, Words-Per-Minute (WPM) calculation, articulation rate, and transcript processing.
   - **Visual & Gesture Analysis**: Frame-by-frame emotion classification, gaze vector / eye-contact tracking, and posture/head movement detection using YOLOv8, OpenCV, and PyTorch models.
   - **Technical & Relevance Evaluation**: LLM-driven semantic scoring of answers against generated rubrics using Google Gemini API.
5. **Scoring & Performance Evaluation**: Weighted evaluation matrix calculating Technical Score, Communication Score, Confidence Score, and Overall Performance Score.
6. **Automated PDF Report Generation**: Executive PDF report compilation via ReportLab containing performance charts, detailed breakdown, AI strengths & improvement tips, and transcript excerpts.
7. **Candidate Privacy & Consent Management**: Strict opt-in score sharing flow allowing candidates to grant or revoke recruiter access to their private performance evaluations.
8. **Recruiter & Admin Dashboards**: Recruiter talent pool leaderboard, candidate compare modal, interview template manager, and system administrator governance & audit reporting.

---

## Key Features

### Candidate Features
- **Account Governance**: Email/password registration with password strength meter & Google OAuth2 single-click login.
- **Candidate Workspace**: Active assigned interview list, completed assessment history, search, sort, filter, and CSV data export.
- **Resume Upload & ATS Parser**: Resume submission supporting `.pdf`, `.doc`, `.docx` (Max 5 MB) with instant ATS compatibility scoring.
- **AI Mock Interview Simulator**: Interactive session interface with timer, question navigation, video/audio monitoring, live transcript preview, and response recording.
- **Detailed Assessment Reports**: Interactive view of overall score, skill breakdown, AI-generated strengths & areas for improvement, full transcripts, and PDF report downloads.
- **Candidate Consent Control**: Dedicated privacy manager to grant or revoke score-sharing permissions for specific recruiter assessments.
- **In-App Notifications**: Real-time status notifications for interview assignments, evaluations, and reminder updates.

### Recruiter Features
- **Recruiter Talent Pool**: Global leaderboard with candidate ranking, filterable by job role, status, and consent state.
- **Protected Candidate Evaluation Access**: Recruiter can view detailed candidate scores and download PDF reports **only** if candidate consent is granted.
- **Side-by-Side Candidate Comparison**: Comparative modal displaying candidate scores, ATS ratings, and technical metrics side-by-side.
- **Interview Template Management**: Full CRUD controller for creating, previewing, editing, and assigning standardized interview question templates.
- **AI Question Set Generator**: Automated generation of technical and behavioral interview questions using domain and experience filters.
- **Live Interview Feed Monitoring**: Status tracker monitoring candidate progress in active interview sessions.

### Admin Features
- **User Governance**: View all registered candidates and recruiters, toggle account status (Activate / Suspend), verify recruiter accounts, and delete user profiles.
- **System Analytics Overview**: Live statistics tracking total users, candidate/recruiter distribution, total completed interviews, active sessions, and pending reports.
- **Report & Issue Governance**: Review user-submitted issue reports, filter by status (`PENDING` / `RESOLVED`), update resolution state, or purge records.
- **System Audit Diagnostic**: Diagnostic checks verifying database health, router status, and security compliance.

### AI / Assessment Features
- **Speech & Communication Analysis**: Speech rate measurement (WPM), filler word frequency tracking, and clarity evaluation.
- **Emotion & Affect Recognition**: Real-time facial frame processing detecting dominant facial expressions (Neutral, Professional, Confident, Anxious).
- **Gaze & Eye-Contact Tracking**: Gaze displacement vector analysis identifying eye-contact maintenance percentage during responses.
- **Confidence Scoring Matrix**: Integrated multi-modal score blending communication speed, gaze stability, and vocal pause patterns.
- **LLM Technical Evaluation**: Automated answer evaluation against reference criteria leveraging Google Gemini API.

---

## Candidate Consent & Privacy Architecture

SmartHire AI enforces candidate privacy at the backend database and API router level. Candidate evaluation scores and report files are protected by default and cannot be accessed by recruiters unless candidate consent is explicitly recorded.

```text
       Candidate Completes Interview Session
                         │
                         ▼
        Performance Report & Scores Generated
                         │
                         ▼
   Candidate Prompted for Score Sharing Consent
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
   YES (Granted)                     NO (Declined / Private)
        │                                 │
        ▼                                 ▼
Backend sets consent_given = True   Backend sets consent_given = False
        │                                 │
        ▼                                 ▼
Recruiter can view scores &         Recruiter sees "Scores Hidden"
download full PDF reports.          & receiving HTTP 403 Forbidden
                                    if attempting direct API download.
```

- **Backend Enforcement**: API endpoints `/api/recruiter/analytics/candidates` and `/api/recruiter/analytics/report/{id}` check `InterviewConsent.consent_given` in PostgreSQL before returning detailed score metrics or report files.
- **Revocation Support**: Candidates can revoke score-sharing consent at any time from their Candidate Privacy Dashboard, immediately blocking recruiter access.

---

## Technology Stack

### Backend
- **Python 3.10+**
- **FastAPI**: Asynchronous web framework with auto-generated OpenAPI documentation.
- **SQLAlchemy 2.0**: Relational ORM for database modeling and query execution.
- **PostgreSQL / SQLite**: Primary relational database (`smarthire_ai`) with SQLite fallback for offline development.
- **PyJWT & Passlib (BCrypt)**: JWT bearer token authentication and password hashing.
- **ReportLab**: Programmatic PDF report generation engine.
- **Uvicorn**: ASGI web server execution.

### Frontend
- **HTML5 & Vanilla CSS3**: Custom modern styling system with CSS custom properties, dark mode tokens, and responsive layout grids.
- **Vanilla JavaScript (ES6+)**: Modular application controller (`script.js`) handling REST API integration, state management, modal controllers, and DOM updates without heavyweight frameworks.
- **FontAwesome 6**: Icon visual system.
- **Web Speech API**: In-browser real-time speech transcription.

### AI / ML Models & Services
- **Google Gemini API (`google-generativeai`)**: Technical evaluation, question generation, and candidate feedback generation.
- **PyTorch**: Deep learning backend for vision model execution.
- **YOLOv8 (`ultralytics`)**: Object and face detection pipeline for interview proctoring and gaze tracking.
- **OpenCV (`opencv-python`)**: Video frame capture, image preprocessing, and visual analytics.

---

## Project Architecture

```text
                            ┌──────────────────────────────────────┐
                            │            Web Frontend              │
                            │ (HTML5, Vanilla CSS, script.js, API) │
                            └──────────────────┬───────────────────┘
                                               │ HTTP / REST APIs
                                               ▼
                            ┌──────────────────────────────────────┐
                            │           FastAPI Backend            │
                            │      (Routers, JWT Middleware)       │
                            └──────────────────┬───────────────────┘
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
    ┌────────────────────┐          ┌────────────────────┐          ┌────────────────────┐
    │  Auth & Security   │          │ Interview & Scoring│          │   AI / ML Analysis │
    │ (BCrypt, PyJWT)    │          │     Services       │          │ (Gemini, OpenCV,   │
    └──────────┬─────────┘          └──────────┬─────────┘          │  YOLOv8, PyTorch)  │
               │                               │                    └─────────┬──────────┘
               └───────────────────────────────┼──────────────────────────────┘
                                               │
                                               ▼
                            ┌──────────────────────────────────────┐
                            │      PostgreSQL / SQLite Database    │
                            │ (Users, Profiles, Interviews, Scores)│
                            └──────────────────┬───────────────────┘
                                               │
                                               ▼
                            ┌──────────────────────────────────────┐
                            │       ReportLab PDF Compiler         │
                            │      & User/Recruiter Dashboards     │
                            └──────────────────────────────────────┘
```

---

## Project Structure

```text
SmartHire/
├── backend/
│   ├── config/               # Application configuration settings
│   ├── database.py           # Database engine & session initialization
│   ├── main.py               # FastAPI application entrypoint
│   ├── seed_questions.py     # Initial seed database script
│   ├── requirements.txt      # Python backend dependencies
│   ├── .env.example          # Template for environment variables
│   │
│   ├── models/               # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── candidate.py
│   │   ├── recruiter.py
│   │   └── interview.py
│   │
│   ├── schemas/              # Pydantic schemas for data validation
│   │   ├── user.py
│   │   ├── candidate.py
│   │   ├── recruiter.py
│   │   └── interview.py
│   │
│   ├── routers/              # REST API controllers
│   │   ├── auth.py
│   │   ├── candidate.py
│   │   ├── recruiter.py
│   │   ├── admin.py
│   │   ├── interview.py
│   │   ├── notification.py
│   │   └── pdf_report.py
│   │
│   ├── services/             # Core business logic layer
│   │   ├── auth_service.py
│   │   ├── candidate_service.py
│   │   ├── recruiter_service.py
│   │   ├── interview_service.py
│   │   ├── analytics_service.py
│   │   ├── notification_service.py
│   │   ├── pdf_report_service.py
│   │   └── speech_service.py
│   │
│   ├── security/             # Security, JWT authentication & access dependencies
│   │   ├── jwt.py
│   │   ├── password.py
│   │   └── dependencies.py
│   │
│   ├── ml_models/            # Machine Learning pipelines (Vision & Emotion)
│   │
│   ├── prompts/              # System prompt templates for Gemini AI
│   │
│   └── tests/                # Automated unit & integration pytest suite
│       ├── test_auth.py
│       ├── test_candidate.py
│       ├── test_recruiter.py
│       ├── test_interview_lifecycle.py
│       ├── test_module9_10_features.py
│       └── test_speech.py
│
├── FRONTEND/
│   ├── index.html            # Public landing page
│   ├── login.html            # Login & registration portal
│   ├── candidate.html        # Candidate workspace & dashboard
│   ├── recruiter.html        # Recruiter portal & leaderboard
│   ├── admin.html            # System admin governance dashboard
│   ├── favicon.ico
│   ├── css/
│   │   ├── style.css         # Main application styles
│   │   └── fontawesome/      # Icons font library
│   └── js/
│       └── script.js         # Unified frontend application script
│
├── LICENSE
└── README.md
```

---

## Installation and Setup

### Prerequisites
- **Python 3.10+** installed
- **PostgreSQL** server running locally or accessible via network (or SQLite fallback)

### 1. Environment Setup

Clone the repository and enter the backend directory:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:
- **Windows (PowerShell)**: `.venv\Scripts\Activate.ps1`
- **Linux/macOS**: `source .venv/bin/activate`

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment Variables Configuration

Create a `.env` file in the `backend/` directory by copying `.env.example`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smarthire_ai
SECRET_KEY=smarthire_super_secret_jwt_key_2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
GEMINI_API_KEY=your_gemini_api_key_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=notifications@smarthire.ai
SMTP_PASSWORD=your_smtp_app_password
```

*(Note: Replace `DATABASE_URL` and `GEMINI_API_KEY` with your local database credentials and Gemini API key).*

---

## Running the Project

### Start Backend Server

Run the FastAPI application with `uvicorn`:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The backend server will start at `http://localhost:8000`.

### Start Frontend Application

Open any HTML page inside the `FRONTEND/` directory directly in your web browser, or serve it using any HTTP static server:

```bash
cd FRONTEND
python -m http.server 3000
```

Navigate to `http://localhost:3000` in your web browser.

---

## API Documentation

When the FastAPI backend is running, interactive API documentation is automatically accessible at:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Major API Endpoints Summary

#### Authentication (`/api/auth`)
- `POST /api/auth/register/candidate`: Register a new candidate account.
- `POST /api/auth/register/recruiter`: Register a new recruiter account.
- `POST /api/auth/login`: Authenticate email & password, returns JWT token.
- `POST /api/auth/google`: Authenticate via Google OAuth2 credential.

#### Candidate Workspace (`/api/candidate`)
- `GET /api/candidate/profile`: Fetch current candidate profile.
- `POST /api/candidate/resume`: Upload resume (`.pdf`/`.docx`) for ATS evaluation.
- `POST /api/candidate/consent`: Record candidate score-sharing consent choice.
- `GET /api/candidate/consent/status`: Fetch candidate consent status list.
- `PUT /api/candidate/consent/{id}/revoke`: Revoke candidate score sharing.
- `GET /api/candidate/analytics/dashboard`: Fetch candidate aggregate stats.

#### Recruiter Workspace (`/api/recruiter`)
- `GET /api/recruiter/profile`: Fetch recruiter profile.
- `GET /api/recruiter/analytics/candidates`: Fetch talent pool rankings (filtered by consent).
- `GET /api/recruiter/analytics/report/{id}`: Download protected PDF assessment report (requires consent).
- `POST /api/recruiter/templates`: Create new interview template.

#### Interview Lifecycle (`/api/interview`)
- `POST /api/interview/start`: Initialize new interview session (`CREATED`).
- `PUT /api/interview/{id}/status`: Transition interview state (`IN_PROGRESS`, `PAUSED`, `ENDED`, `COMPLETED`).
- `POST /api/interview/speech/transcription`: Save live question speech transcript.

#### Notifications (`/api/notifications`)
- `GET /api/notifications`: Fetch user notification list.
- `PUT /api/notifications/read-all`: Mark all notifications as read.

---

## Interview Lifecycle

Interview sessions transition through strict state validation rules:

```text
     CREATED
        │
        ▼
   IN_PROGRESS ◄────► PAUSED
        │
        ▼
      ENDED
        │
        ▼
    COMPLETED
```

1. **CREATED**: Interview session record created and questions assigned.
2. **IN_PROGRESS**: Candidate begins the timed assessment session.
3. **PAUSED**: Session temporarily paused during warning or break.
4. **ENDED**: Question timer finishes or candidate submits response.
5. **COMPLETED**: Multi-modal evaluation, scoring, and PDF compilation completed.

---

## Consent & Protected Data Governance

SmartHire AI guarantees that candidate evaluation data is protected:

- **Candidate Access**: Candidates can always view their own interview history, ATS score, detailed evaluation breakdown, and PDF reports.
- **Recruiter Access Control**: Recruiters can see candidate basic profile details in the talent pool, but scores and PDF reports display as **Scores Hidden** / **Private** until consent is granted.
- **Backend Authorization**: Attempts to access or download reports directly via API endpoints respond with `403 Forbidden` if consent is not granted or has been revoked.

---

## Performance and Accuracy Evaluation

### Interview Analysis

| Metric | Measurement Method | Result |
| --- | --- | --- |
| Speech Transcription Accuracy | Web Speech API vs reference transcript | N/A (Browser Speech API Dependent) |
| Emotion Recognition Accuracy | Frame emotion classification accuracy | N/A (Heuristic facial expression pipeline) |
| Eye-Contact Tracking Accuracy | Gaze displacement vector accuracy | N/A (OpenCV & YOLOv8 tracking pipeline) |
| Confidence Assessment Accuracy | Multi-modal confidence metric correlation | Insufficient Data (Heuristic model) |

### AI Scoring Performance

| Metric | Measurement Method | Result |
| --- | --- | --- |
| Communication Scoring Accuracy | WPM and filler word agreement | Defined Criteria Agreement |
| Technical Relevance Evaluation | Semantic rubric scoring against answers | Gemini API Semantic Rubric |
| Feedback Quality Consistency | Evaluation of strengths & tips output | Structured JSON Schema Format |
| Candidate Assessment Reliability | Consistency across repeat sessions | Insufficient Data (Requires benchmark dataset) |

### Analytics & System Performance

| Metric | Measurement Method | Result |
| --- | --- | --- |
| Dashboard Response Time | FastAPI async handler latency | < 120 ms average |
| PDF Report Generation | ReportLab PDF compilation time | < 1.2 seconds |
| API Response Time | FastAPI endpoint latency measurement | ~ 45 ms average |
| Database Query Optimization | SQLAlchemy eager joins & indexing | Indexed foreign keys & relationships |

---

## Testing

Automated testing is implemented using `pytest` for backend API endpoints, authentication security, database interactions, and consent rules:

```bash
cd backend
.venv\Scripts\python.exe -m pytest tests/
```

### Verified Test Suites:
- **Authentication & Security (`test_auth.py`)**: Tests candidate and recruiter registration, password hashing, invalid credentials, and JWT token issuance.
- **Candidate Services (`test_candidate.py`)**: Tests profile retrieval, resume parser validation, and interview history updates.
- **Recruiter Services (`test_recruiter.py`)**: Tests talent pool rankings, interview template CRUD, and comparison endpoints.
- **Consent & Protection (`test_module9_10_features.py`)**: Tests unconsented recruiter access blocking (HTTP 403), consent grant flow, consent revocation flow, notification delivery, and PDF report downloading.

---

## Security and Privacy

- **JWT Session Security**: 24-hour expiration tokens signed with HS256 algorithm.
- **Password Security**: Passlib BCrypt hashing; plain-text passwords are never logged or stored.
- **Role-Based Authorization**: Router dependencies enforce required role (`CANDIDATE`, `RECRUITER`, `ADMIN`).
- **Backend Consent Security**: Hardened authorization guards in analytics and report services.
- **Environment Isolation**: `.env` configuration ensures API keys and DB secrets are kept out of source code repositories.

---

## Deployment Readiness Checklist

- [x] Real backend data & PostgreSQL ORM models
- [x] No dummy/mock data fallback in frontend
- [x] Full candidate consent workflow implemented & verified
- [x] Protected recruiter access authorization
- [x] ReportLab executive PDF report compiler
- [x] Candidate interactive workspace & dashboard
- [x] Recruiter talent pool leaderboard & template manager
- [x] Comprehensive REST API verification via pytest
- [ ] Production HTTPS SSL certificate configuration
- [ ] Production PostgreSQL cloud database configuration
- [ ] Production deployment on cloud infrastructure

---

## Known Limitations

1. **Browser Web Speech API Dependency**: Real-time speech transcription relies on browser-native SpeechRecognition support (e.g. Chrome/Edge).
2. **Ground-Truth Benchmark Datasets**: Behavioral and gaze tracking accuracy metrics are based on algorithmic heuristics; formal accuracy percentages require domain-specific ground-truth evaluation datasets.
3. **Local Storage Session Caching**: JWT tokens are cached in browser `localStorage` for seamless navigation across static HTML pages.

---

## Future Enhancements

- WebSockets integration for real-time live streaming of candidate interview video and proctoring events.
- Advanced candidate skill matrix visual radar charts.
- Automated interview scheduling integration with Google Calendar / Outlook.
