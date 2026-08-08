# AI Mock Interview Platform — Full Stack (Frontend + Backend)

A real PostgreSQL-backed backend with JWT + Google OAuth authentication,
plus **fully functional dashboards** for all four roles — `admin.html`,
`candidate.html`, `coach.html`, `recruiter.html` — wired to live data
instead of the original static/mock markup.

```
ai-interview-platform/
├── backend/
│   ├── config/
│   │   ├── db.js               # PostgreSQL connection pool
│   │   └── passport.js         # Google OAuth strategy
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── adminController.js      # NEW — platform stat counts
│   │   ├── interviewController.js  # NEW — mock interviews, scoring, review
│   │   ├── jobController.js        # NEW — recruiter job openings
│   │   └── notificationController.js # NEW — per-dashboard activity feed
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT verification
│   │   └── roleMiddleware.js    # Role-based access control
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── adminRoutes.js       # NEW
│   │   ├── interviewRoutes.js   # NEW
│   │   ├── jobRoutes.js         # NEW
│   │   └── notificationRoutes.js # NEW
│   ├── utils/
│   │   ├── aiEngine.js          # NEW — simulated AI scoring + Module 3 question generation logic
│   │   └── notify.js            # NEW — notification helper
│   ├── db/
│   │   ├── schema.sql        # users, interviews, interview_questions, notifications, job_openings
│   │   ├── seed.js           # creates admin@gmail.com / admin123
│   │   └── seedDemo.js       # NEW — optional demo candidates/interviews/jobs
│   ├── postman_collection.json # NEW — Module 3 API collection
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html / login.html / register.html
    ├── admin.html / candidate.html / coach.html / recruiter.html   # now data-driven
    ├── oauth-callback.html   # receives the token after Google login
    ├── js/script.js          # auth logic + dashboard data/actions
    └── css/ , images/
```

## 1. Database setup

Run these from the **project root** (the folder containing `backend/` and `frontend/`):

```bash
psql -U postgres -c "CREATE DATABASE ai_interview_platform;"
psql -U postgres -d ai_interview_platform -f backend/db/schema.sql
```

> **Windows / PowerShell users:** if you're already `cd`'d into `backend/`,
> drop the `backend/` prefix — use `-f db/schema.sql` instead. Also always
> pass `-U postgres` (or whichever Postgres role you actually created) —
> without it, `psql` defaults to logging in as your OS username, which
> almost never matches a real Postgres role and fails with
> `role "..." does not exist`.

This creates four tables:

| Table            | Purpose                                                             |
|-------------------|----------------------------------------------------------------------|
| `users`           | accounts (candidate / recruiter / coach / admin), local + Google auth |
| `interviews`      | every mock interview a candidate starts or schedules, with AI score + skill breakdown + coach feedback |
| `notifications`   | activity feed shown on every dashboard (per-user or broadcast to a role) |
| `job_openings`    | recruiter-managed job postings                                       |
| `resumes`         | Module 2: uploaded resume PDFs + extracted skills/experience/education/summary |

See `db/schema.sql` for full column definitions.

## 2. Backend setup

```bash
cd backend
npm install
# Your project already ships with a filled-in .env (DB creds, JWT secret,
# Google OAuth keys) — just double-check the DB_* values match your local
# Postgres setup. .env.example is provided only as a reference/template
# if you ever need to recreate .env from scratch.

npm run seed        # creates the default admin@gmail.com / admin123
npm run seed:demo   # OPTIONAL — adds demo candidates/recruiter/coach
                     # (password: demo123) plus sample interviews,
                     # job openings and notifications so every
                     # dashboard has real data to show immediately
npm run dev          # starts the API on http://localhost:5000
```

### Get Google OAuth credentials
1. Go to https://console.cloud.google.com/apis/credentials
2. Create an **OAuth Client ID** (type: Web application)
3. Authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
4. Copy the Client ID/Secret into `.env`

### API endpoints

| Method | Route                          | Auth                | Description                                    |
|--------|----------------------------------|----------------------|--------------------------------------------------|
| POST   | /api/auth/register               | —                    | Create a local account, returns JWT               |
| POST   | /api/auth/login                  | —                    | Login, returns JWT                                |
| GET    | /api/auth/google?role=...        | —                    | Start Google OAuth flow                           |
| GET    | /api/auth/google/callback         | —                    | Google redirects here (internal)                  |
| GET    | /api/auth/me                     | Bearer JWT           | Get current logged-in user                        |
| GET    | /api/users                       | JWT + admin          | List all users (admin.html table)                 |
| PATCH  | /api/users/:id/status             | JWT + admin          | Activate/deactivate a user                        |
| GET    | /api/admin/stats                 | JWT + admin          | Total users / candidates / recruiters / coaches   |
| POST   | /api/interviews/start             | JWT + candidate      | Instantly runs & AI-scores a mock interview       |
| POST   | /api/interviews/schedule           | JWT + candidate      | Books a future interview slot                     |
| POST   | /api/interviews/generate           | JWT + candidate      | **Module 3:** generates HR/Technical/Behavioral/Aptitude/Mixed AI questions (domain + difficulty customizable), creates the session |
| GET    | /api/interviews/:id                | JWT + candidate (owner) or coach/recruiter/admin | Fetch one session + its generated questions |
| PUT    | /api/interviews/:id                | JWT + candidate (owner) | Edit a non-completed session; `regenerate: true` re-rolls its question set |
| DELETE | /api/interviews/:id                | JWT + candidate (owner) | Delete a non-completed session (cascades its questions) |
| PATCH  | /api/interviews/:id/attend          | JWT + candidate      | Take a previously scheduled interview now — runs AI scoring, marks completed |
| PATCH  | /api/interviews/:id/cancel          | JWT + candidate      | Cancel a still-scheduled interview                |
| GET    | /api/interviews/me                | JWT + candidate      | Candidate's own interview history                 |
| GET    | /api/interviews/me/stats           | JWT + candidate      | Candidate dashboard stat cards + skill averages   |
| GET    | /api/interviews/overview           | JWT + coach/recruiter/admin | Aggregate stat-card numbers                |
| GET    | /api/interviews/candidates         | JWT + coach/recruiter/admin | One row per candidate (latest interview)   |
| GET    | /api/interviews?status=&today=     | JWT + coach/recruiter/admin | List/filter interviews (today's schedule)  |
| PATCH  | /api/interviews/:id/review          | JWT + coach/recruiter/admin | Attach human feedback to an interview      |
| GET    | /api/jobs                        | JWT + recruiter/admin | List job openings                                |
| POST   | /api/jobs                        | JWT + recruiter/admin | Create a job opening                             |
| PATCH  | /api/jobs/:id/status               | JWT + recruiter/admin | Open/close a job opening                         |
| GET    | /api/notifications/me              | Bearer JWT           | This user's notification feed                     |
| POST   | /api/resumes/upload                | JWT + candidate      | **Module 2:** upload a PDF resume, run AI skill/experience/education extraction |
| GET    | /api/resumes/me                    | JWT + candidate      | List candidate's own uploaded resumes (newest first) |
| GET    | /api/resumes/me/latest             | JWT + candidate      | Most recent resume's extracted analysis            |
| GET    | /api/resumes/:id                   | JWT + candidate (owner) or coach/recruiter/admin | Fetch one resume's analysis |
| GET    | /api/resumes/:id/file              | JWT + candidate (owner) or coach/recruiter/admin | Stream the original uploaded PDF |
| DELETE | /api/resumes/:id                   | JWT + candidate (owner) | Delete a resume                                    |

### Module 3 — AI Interview Generation

`POST /api/interviews/generate` creates a new interview session and generates
its question set in one call. Supported request body:

```json
{
  "interviewType": "Java Developer",
  "category": "Technical",       // "HR" | "Technical" | "Behavioral" | "Aptitude" | "Mixed"
  "domain": "Java",              // customizes Technical questions (Java/Python/Frontend/Data/…)
  "difficulty": "hard",          // "easy" | "medium" | "hard"
  "questionCount": 5,            // 1–20
  "mode": "online"               // "online" | "offline"
}
```

Response: `{ interview, questions }` — `interview` is the new `interviews` row
(with `domain`, `difficulty`, `question_count`), `questions` is the ordered
list of generated rows from `interview_questions`. `category: "Mixed"` spreads
questions evenly across HR, Technical, Behavioral, and Aptitude. Use
`PUT /api/interviews/:id` with `"regenerate": true` to re-roll the question
set on an existing (not-yet-completed) session.

### Module 2 — Resume Upload & Skill Extraction

`POST /api/resumes/upload` accepts a `multipart/form-data` body with a single
`resume` field (a PDF, ≤8MB). The PDF's text is extracted server-side
(`pdf-parse`), then run through a rules-based analysis pipeline
(`backend/utils/resumeEngine.js`) that performs:

- **Skill extraction** — keyword matching against a curated tech dictionary
- **Technology detection** — the same skills, categorized into languages /
  frameworks / databases / cloud-devops / tools
- **Experience parsing** — an explicit "X years experience" phrase if present,
  otherwise summed from detected role date ranges (e.g. "Jan 2021 - Present")
- **Education analysis** — degree keywords (B.Tech, MBA, M.Sc, …) matched
  against the resume's education section, paired with the nearest year
- **Resume summary generation** — a short paragraph assembled from the above

Response: `{ resume }`, containing `skills`, `technologies`, `experience_years`,
`experience_entries`, `education`, and `summary`. Uploaded PDFs are stored
under `backend/uploads/resumes/` (git-ignored) and can be re-fetched via
`GET /api/resumes/:id/file`.

## 3. Frontend setup

Serve the `frontend/` folder with any static server, e.g.:

```bash
cd frontend
npx serve -l 5500
```

Make sure `FRONTEND_URL` in `backend/.env` matches this origin (used for
CORS and for the OAuth redirect back to `oauth-callback.html`).

## 4. How each dashboard works now

- `login.html` / `register.html` call `loginUser()` / `registerUser()`
  in `js/script.js`, which POST to the backend and store the returned
  JWT + user object in `localStorage`.
- Every dashboard's `<body onload="checkRole('...');loadProfile();init...Dashboard()">`
  re-validates the JWT against `/api/auth/me`, then loads that role's
  real data:
  - **admin.html** — live user counts, the full registered-users table,
    and working Activate/Deactivate buttons (`PATCH /api/users/:id/status`).
  - **candidate.html** — "Start Mock Interview" runs an instant,
    AI-scored session (`POST /api/interviews/start`) and immediately
    updates the stats, skill bars and history table; "Schedule for
    later" books a future slot. Any row in the history table that's
    still `Scheduled` gets **"Attend Now"** and **"Cancel"** buttons —
    Attend Now (`PATCH /api/interviews/:id/attend`) runs the AI scoring
    at that moment and marks it completed; Cancel marks it cancelled.
    Both actions push a notification.
  - **coach.html** — "Assigned Candidates" and "Today's Coaching
    Schedule" are populated from `/api/interviews/candidates` and
    `/api/interviews?status=scheduled&today=true`; the Review button
    lets a coach leave feedback that's saved back to the interview
    and notifies the candidate.
  - **recruiter.html** — same candidate/schedule views, plus a real
    Job Openings table backed by `/api/jobs` (add new openings, close/
    reopen existing ones).
  - All four dashboards pull their "Notifications" panel from
    `GET /api/notifications/me`.
- "Login with Google" / "Sign up with Google" send the browser to
  `/api/auth/google`, which redirects to Google, then back to
  `/api/auth/google/callback`. The backend issues its own JWT and
  redirects to `oauth-callback.html?token=...`, which stores it and
  routes the user to their dashboard — exactly like local login.
- `logout()` clears `localStorage` and returns to `login.html`.

## Security notes
- Passwords are hashed with bcrypt (10 rounds) — never stored in plaintext.
- JWTs are signed with `JWT_SECRET` and expire after `JWT_EXPIRES_IN` (default 2h).
- Every new route is protected with `authenticateJWT` + `authorizeRoles(...)`,
  matching the role restrictions described in the table above.
- Admin accounts can only be created via direct registration/seed — never through Google OAuth.
- Change `JWT_SECRET` and the default admin password before deploying.
- The AI scoring in `utils/aiEngine.js` is a **simulator** (randomized-but-plausible
  scores/feedback) — swap it for a real model call whenever one is available;
  every other part of the pipeline (storage, dashboards, notifications) is real.
