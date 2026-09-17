# Module 3 — AI Interview Generation (Python / FastAPI)

This is a Python implementation of Module 3, matching the guideline
doc's recommended stack (Python, FastAPI, PostgreSQL, JWT, Pydantic,
SQLAlchemy). It runs **alongside** the existing Node backend rather
than replacing it — both talk to the same PostgreSQL database and
trust the same `JWT_SECRET`, so a token from the existing
`POST /api/auth/login` (Node) works here unchanged.

Node keeps owning: auth/login, resume upload & parsing, job openings,
notifications feed, admin user management.

This service owns: **AI interview generation, interview session
management, candidate feedback view, and question text-to-speech.**

## What's here

- **Multi-provider AI engine** *(new)* — `app/ai_providers.py`.
  Dynamic question generation and real answer scoring, with automatic
  fallback across providers so a single rate-limited key never breaks
  the app: **Ollama → Gemini (rotates across multiple keys) → OpenAI
  → Grok**. See "AI provider setup" below.
- **Live proctored interview session** *(new)* — `frontend/interview-session.html`
  + `frontend/js/interview-session.js`. Webcam-based face-presence
  monitoring (no-face / multiple-faces / looking-away), tab-switch and
  full-screen-exit detection, a per-question + overall countdown timer,
  and typed-or-voice (Web Speech API) answers, all wired to the new
  endpoints below.
- **Interview Generation APIs** — `/api/interviews/generate`, `/`,
  `/{id}`, `PUT /{id}`, `DELETE /{id}`, `/start`, `/history` (the
  guideline doc's suggested API list), plus `/attend`, `/cancel`,
  `/me`, `/me/stats` for parity with the existing candidate dashboard.
- **Question Generation Logic** — `app/question_bank.py`, a full port
  of the existing curated question bank (HR / Technical / Behavioral
  / Aptitude, keyed by difficulty and — for Technical — domain).
- **Interview Session Management** — create, update/regenerate,
  delete, attend, cancel; staff (`coach`/`recruiter`/`admin`) get
  `/staff/overview` and `/staff/candidates`.
- **Candidate feedback view** *(new)* — `GET /{id}/feedback`. The
  candidate can now read the AI feedback **and** whatever a
  recruiter/coach/admin wrote via `PATCH /{id}/review`. Previously
  this was stored in the database but never surfaced to the
  candidate anywhere in the UI.
- **Text-to-speech for questions** *(new)* — `GET
  /{id}/questions/{qid}/tts` streams spoken audio for a single
  question (cached to disk after first generation); `GET /{id}/tts`
  returns a manifest of audio URLs for every question in the
  session.
- **Database Schema** — reuses the existing tables from
  `backend/db/schema.sql` (`interviews`, `interview_questions`,
  `users`, `notifications`) via SQLAlchemy models in `app/models.py`.
  This service never runs migrations; the Node service's schema.sql
  remains the single source of truth.
- **Postman Collection** — `postman_collection.json`.
- **Module 8 — Dashboard & Analytics** *(new)* — `app/routers/analytics.py`.
  Builds on the existing `GET /api/interviews/me/stats` (candidate) and
  `GET /api/interviews/staff/overview` (staff) counts with:
  - `GET /api/analytics/me/trend` — score-over-time chart data
  - `GET /api/analytics/me/skills` — skill-wise averages + trend direction
  - `GET /api/analytics/me/weak-areas` — lowest-scoring categories + a
    canned practice suggestion for each
  - `GET /api/analytics/me/breakdown` — per-interview score breakdown list
  - `GET /api/analytics/me/summary` — all of the above combined, for a
    single dashboard widget
  - `GET /api/analytics/staff/rankings` (+ `/rankings/csv`) — candidate
    leaderboard by average score
  - `GET /api/analytics/staff/skills` / `GET /api/analytics/staff/trend` —
    platform-wide skill analytics and a weekly score trend
- **Module 9 — Notifications & Reports** *(new)* — `app/routers/notifications.py`
  + `app/email_engine.py`. On top of the shared `notifications` table
  (Node's `GET /api/notifications/me` still works unchanged):
  - `GET /api/notifications/me` (now paginated + `?unread_only=`),
    `GET /api/notifications/me/unread-count`,
    `PATCH /api/notifications/{id}/read`, `PATCH /api/notifications/me/read-all`
  - `POST /api/notifications/reminders/run` — **interview reminders**.
    Scans scheduled interviews starting within `REMINDER_WINDOW_HOURS`
    and sends a one-time in-app + **email** reminder for each. This
    service has no built-in scheduler, so call this periodically from
    a staff/admin session, or externally via cron with the
    `X-Cron-Secret` header (see `CRON_SECRET` below).
  - **Session alerts** — `POST /api/interviews/{id}/violation` (Module 6)
    now also notifies admins when a live session's proctoring flags hit
    3 and 5.
  - `GET /api/notifications/me/summary/pdf` — a **downloadable
    performance-summary report** aggregating every completed interview
    (overall stats, skill averages, recent trend, weakest area), next
    to the existing per-interview `GET /api/interviews/{id}/report/pdf`.
- **Module 10 — Recruiter Dashboard** *(new)*, in `app/routers/analytics.py`:
  - `GET /api/analytics/staff/candidates/{id}/profile` — **candidate
    profiles & reports**: identity + latest resume snapshot (read-only
    reflection of Node's `resumes` table) + score summary + skill
    breakdown + weak areas + recent interviews, combined.
  - `GET /api/analytics/staff/compare?candidate_ids=1,2,3` —
    **candidate comparison**: side-by-side average score and per-skill
    averages for 2-10 hand-picked candidates.
  - `GET /api/analytics/staff/shortlist?min_score=75` —
    **shortlisting insights**: candidates clearing a score bar
    (optionally filtered to a `?domain=` they've practiced), ranked by
    average score, each with a one-line rationale built from their
    strongest/weakest scored category.
- **Module 10 — Admin Dashboard** *(new)*:
  - `GET /api/admin/ai/performance` (`app/routers/admin_ai.py`) —
    **AI performance monitoring**: real usage data (how many completed
    interviews were actually scored by a live LLM vs the offline
    simulator, which provider answered each time, and the average
    score for each path) — the factual counterpart to the existing
    `GET /api/admin/ai/status`, which only reports configured keys.
  - `GET /api/admin/system/usage` (`app/routers/admin_system.py`) —
    **platform usage analytics** for the features this service owns
    (coding practice submissions/questions, interview templates,
    resumes uploaded, notifications sent/unread, online vs offline and
    recorded interview counts) — pairs with Node's broader
    `GET /api/admin/analytics`.
  - `GET /api/admin/system/health` — **system health report**: DB
    connectivity, process uptime, recordings/TTS-cache disk usage, and
    activity in the last 24h — pairs with Node's
    `GET /api/admin/activity` (the append-only activity log itself).

## Setup

```bash
cd backend-python
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env: DB_* must point at the same Postgres DB as backend/.env,
# and JWT_SECRET must be IDENTICAL to backend/.env's JWT_SECRET.

uvicorn app.main:app --reload --port 8001
```

The Node backend still runs on port 5000 as before
(`cd backend && npm run dev`); this service runs on port 8001. The
frontend calls both (see `frontend/js/script.js`,
`PY_API_BASE`).

Interactive API docs: http://localhost:8001/docs

## AI provider setup (question generation + answer scoring)

`app/ai_providers.py` tries providers **in order** and automatically
falls through to the next one on any failure (network error, rate
limit / HTTP 429, malformed response). Nothing here is required — an
empty `.env` still works, it just falls back to the curated question
bank in `app/question_bank.py` and the random score simulator in
`generate_assessment()`.

```
AI_PROVIDER_ORDER=ollama,gemini,openai,grok
```

1. **Ollama (recommended default — free, local, unlimited)**
   Install from https://ollama.com, then:
   ```bash
   ollama pull llama3
   ollama serve   # usually already running as a background service
   ```
   `.env`: `OLLAMA_BASE_URL=http://localhost:11434`, `OLLAMA_MODEL=llama3`

2. **Gemini — put MULTIPLE keys in `.env`, comma-separated**
   ```
   GEMINI_API_KEYS=key_one,key_two,key_three,key_four,key_five
   ```
   This is the fix for "it keeps generating the same questions" — a
   single free-tier Gemini key rate-limits fast, and once it does,
   repeated calls fail (or return cached/stale-feeling output). Every
   generation call round-robins to the next key, and any key that
   returns a 429 is skipped in favour of the next one *before* the
   whole Gemini provider is given up on. Get free keys at
   https://aistudio.google.com/app/apikey (a few Google accounts get
   you 4-5 keys in a couple of minutes).

3. **OpenAI** — `OPENAI_API_KEY=sk-...` from
   https://platform.openai.com/api-keys

4. **Grok (xAI)** — `GROK_API_KEY=xai-...` from https://console.x.ai

Reorder or shorten the chain freely, e.g. `AI_PROVIDER_ORDER=gemini,openai`
to skip Ollama entirely, or `AI_PROVIDER_ORDER=ollama` to stay 100%
local/free.

## Email setup (Module 9 — interview reminders)

Optional. Leave `EMAIL_ENABLED=false` (the default) and reminders/alerts
still get created as in-app notifications; `app/email_engine.py` just
logs and skips the email step, the same way TTS falls back to pyttsx3
when gTTS can't reach the network.

```
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASSWORD=your_app_password
SMTP_USE_TLS=true
EMAIL_FROM=you@example.com
```

For Gmail, `SMTP_PASSWORD` needs to be a 16-character
[App Password](https://myaccount.google.com/apppasswords), not your
normal login password (Google blocks plain-password SMTP logins).

To actually get reminders sent on a schedule, point a cron job (or
GitHub Actions scheduled workflow, Windows Task Scheduler, etc.) at:

```bash
curl -X POST http://localhost:8001/api/notifications/reminders/run \
  -H "X-Cron-Secret: $CRON_SECRET"
```

Set `CRON_SECRET` in `.env` to any random string, matching whatever the
scheduler sends. Without a `CRON_SECRET`, a staff/admin JWT is required
instead (a "Send reminders now" button in the UI can call this the same
way).

## Live proctored interview session

`frontend/candidate.html` → "✨ Generate AI Questions" now drops the
candidate straight into `frontend/interview-session.html`, which:

- Requests camera + full-screen on start (camera is required to
  begin; full-screen is best-effort).
- Runs client-side face detection every ~1.5s via `face-api.js`
  (loaded from a CDN) — flags no face, more than one face, or
  looking away from the screen. If the CDN/model can't load, this
  check is skipped gracefully and tab/full-screen checks still run.
- Flags tab switches, window blur, full-screen exit, and blocked
  copy/paste as proctoring violations, logged via
  `POST /api/interviews/:id/violation`; 5 violations auto-submits
  the interview.
- Gives each question its own countdown (90/120/150s by difficulty)
  plus a running total-session timer.
- Lets the candidate answer by typing, by voice (Web Speech API —
  Chrome/Edge; transcribes live into the textbox, editable before
  submitting), or both. Each answer is saved via
  `POST /api/interviews/:id/answers` as the candidate moves through
  the session, so a reload doesn't lose progress.
- On the last question, calls `PATCH /api/interviews/:id/finish`,
  which sends the full question/answer transcript through the AI
  provider chain for real scoring + feedback grounded in what the
  candidate actually said (falls back to the random simulator if no
  answers were given or every provider is unreachable).

## Text-to-speech notes

- Primary engine is **gTTS** (free, no API key, natural voice) — it
  needs internet access at the moment a question's audio is first
  requested.
- If gTTS fails (no internet, network blocked, etc.), the service
  automatically falls back to **pyttsx3**, a fully offline engine
  that uses your OS's local speech driver, so "Play question" still
  works without an internet connection.
- Audio is cached under `tts_cache/interview_<id>/q_<question_id>.*`
  the first time it's generated — repeat plays are instant and don't
  re-hit the network.

## Why a separate service instead of rewriting the Node backend?

The Node backend (auth, resumes, jobs, admin, notifications) is
already built, tested, and wired to the frontend. Rewriting all of it
in Python would touch working code with no functional gain. Module 3
(AI interview generation) is the piece the guideline doc specifically
calls out as Python/FastAPI/SQLAlchemy — this service delivers that,
plus the two requested enhancements, without putting the rest of the
platform at risk. Sharing one database and one JWT secret means
there's exactly one source of truth for users and interviews, not
two copies that can drift apart.
