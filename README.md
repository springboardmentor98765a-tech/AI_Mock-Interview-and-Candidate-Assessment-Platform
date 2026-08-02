# SmartHire AI – Module 1 (Authentication, Database Integration & User Management)

SmartHire AI is an enterprise intelligent recruitment and mock interview platform. **Module 1** delivers complete Authentication, RBAC Authorization, PostgreSQL Database Integration, Google Sign-In, User Profile Management, Candidate Dashboards, and Recruiter Leaderboards.

---

## Folder Structure

```text
SmartHire-AI/
│
├── frontend/                 # Complete frontend web application
│   ├── index.html            # Landing page
│   ├── login.html            # Authentication portal (Login & Registration)
│   ├── candidate.html        # Candidate workspace & profile dashboard
│   ├── recruiter.html        # Recruiter workspace & candidate rankings
│   ├── admin.html            # System administrator governance portal
│   ├── css/
│   │   └── style.css         # Modern design tokens & layout system
│   ├── js/
│   │   └── script.js         # REST API integration & UI engine
│   └── images/
│
├── backend/                  # Production FastAPI Python backend
│   ├── main.py               # Application entrypoint & table auto-migration
│   ├── database.py           # PostgreSQL SQLAlchemy engine & session maker
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Environment variable template
│   ├── models/               # SQLAlchemy ORM database models
│   │   ├── user.py
│   │   ├── candidate.py
│   │   └── recruiter.py
│   ├── schemas/              # Pydantic data schemas & request validators
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── candidate.py
│   │   └── recruiter.py
│   ├── routers/              # REST API route controllers
│   │   ├── auth.py
│   │   ├── candidate.py
│   │   ├── recruiter.py
│   │   └── admin.py
│   ├── services/             # Business logic layer
│   │   ├── auth_service.py
│   │   ├── candidate_service.py
│   │   └── recruiter_service.py
│   ├── security/             # JWT, BCrypt hashing, and role dependencies
│   │   ├── jwt.py
│   │   ├── password.py
│   │   └── dependencies.py
│   └── tests/                # Automated pytest suite
│       ├── test_auth.py
│       ├── test_candidate.py
│       └── test_recruiter.py
│
├── README.md
└── .gitignore
```

---

## Features Implemented in Module 1

* **PostgreSQL Database Integration**: Persistent relational storage (`smarthire_ai`) with automatic table creation and automatic seeding of default Admin (`admin@smarthire.ai`).
* **Authentication & JWT Security**: BCrypt password hashing and 24-hour Bearer JWT session tokens.
* **Google Sign-In ("Continue with Google")**: OAuth sign-in supporting both Candidate and Recruiter account creation, automatic account linking for existing local users, and single-prompt role selection modal for new users.
* **Role-Based Access Control (RBAC)**: Strict role guards for `CANDIDATE`, `RECRUITER`, and `ADMIN`.
* **Multi-Section Registration UI**: Responsive multi-section layout for candidates (Personal, Academic, Professional) and recruiters (Personal, Company).
* **Recruiter Candidate Rankings**: Dynamic global leaderboard calculating Overall Score ($0.70 \times \text{ATS Score} + 0.30 \times \text{Interview Score}$) with live search, role filtering, sorting, and clean empty states.
* **Secure Resume Upload**: MIME type and file extension validation (`.pdf`, `.doc`, `.docx`) enforced up to 5 MB.
* **Dynamic Dashboards**: Auto-loads real profile data from PostgreSQL on load and page refresh.

---

## Requirements & Backend Setup

### Prerequisites

* Python 3.10+
* PostgreSQL Service (`smarthire_ai` database created)

### 1. Install Dependencies

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. PostgreSQL Configuration

Create PostgreSQL database `smarthire_ai`:

```sql
CREATE DATABASE smarthire_ai;
```

Create a `.env` file in the `backend/` directory (copied from `.env.example`):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smarthire_ai
SECRET_KEY=smarthire_super_secret_jwt_key_2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### 3. Running the Backend

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The interactive API documentation is available at:
* Swagger UI: `http://localhost:8000/docs`
* ReDoc: `http://localhost:8000/redoc`

---

## Running the Frontend

Open `FRONTEND/index.html` or `FRONTEND/login.html` directly in any web browser, or serve using any static web server (e.g. Live Server or `python -m http.server 3000` inside `FRONTEND/`).

---

## Running Automated Tests

Run the test suite using `pytest`:

```bash
cd backend
pytest -v
```

---

## REST API Endpoints Summary

### Auth Endpoints (`/api/auth`)
* `POST /api/auth/register/candidate` - Register candidate account
* `POST /api/auth/register/recruiter` - Register recruiter account
* `POST /api/auth/login` - Email & password login
* `POST /api/auth/google` - Google authentication
* `POST /api/auth/google/complete-role` - First-time Google sign-in role selection
* `GET /api/auth/me` - Currently logged in user session

### Candidate Endpoints (`/api/candidate`)
* `GET /api/candidate/profile` - Fetch candidate profile
* `PUT /api/candidate/profile` - Update candidate profile
* `POST /api/candidate/resume` - Upload resume (Max 5 MB, PDF/DOC/DOCX)

### Recruiter Endpoints (`/api/recruiter`)
* `GET /api/recruiter/profile` - Fetch recruiter profile
* `PUT /api/recruiter/profile` - Update recruiter profile
* `GET /api/recruiter/rankings` - Fetch candidate rankings sorted by Overall Score

### Admin Endpoints (`/api/admin`)
* `GET /api/admin/users` - User governance list
* `PUT /api/admin/users/{id}/status` - Activate / suspend user account
