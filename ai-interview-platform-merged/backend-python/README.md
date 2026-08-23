# Module 3 — AI Interview Generation (Python / FastAPI)

## Module 5 & 6 completeness pass (real-time speech + emotion/eye-tracking)

A review against the project spec found Module 5 (Speech-to-Text &
Communication Analysis) and Module 6 (Emotion Detection & Eye
Tracking) were mostly built server-side but not fully wired end to
end. Fixed/added:

- **Bug fix:** `frontend/js/interview-session.js` tallied
  `faceOnCameraSamples` / `faceEmotionTally` variables but never
  incremented them — eye-contact % and dominant emotion were always
  `null` for every interview. `handleFaceDetections()` now updates
  these tallies on every face-api.js detection tick.
- **Exposed missing data:** `grammar_issue_count`,
  `pronunciation_confidence`, and `keyword_match_percentage` were
  computed and stored in `submit_answer()` but never returned by the
  API — added to `AnswerOut`.
- **New endpoint** `GET /api/interviews/{id}/communication-report` —
  aggregates every answer's Module 5/6 signals (pace, filler ratio,
  grammar, keyword match, eye contact, pronunciation, emotion mix,
  voice/typed ratio) into the Communication Score (30%) / Confidence
  Score (25%) rubric from the project spec, per-question and overall.
  See `CommunicationReportOut` in `app/schemas.py`.
- **Live HUD** (`frontend/interview-session.html` /
  `interview-session.js`) — real-time filler-word count, live WPM,
  eye-contact %, dominant emotion, and voice clarity shown in the
  webcam panel while the candidate is answering, refreshed ~1.4x/sec.
- **Post-interview report** — a "Communication & Confidence Report"
  panel on the finish screen, rendering the new endpoint's data as a
  rubric-matched breakdown plus a per-question table.

## Follow-up fixes (MCQ marks, coding "Run", eye-contact bug)

- **Real bug found & fixed:** `handleFaceDetections()` read
  `detections[0].box` unconditionally, but face-api.js's
  `.withFaceExpressions()` chain nests the box under
  `detections[0].detection.box` instead — `.box` is `undefined` on
  those results, so `box.x` threw on every tick where the expression
  model had loaded (the normal case). The error was swallowed by the
  caller's try/catch, so `faceOnCameraSamples` never incremented while
  `faceTotalSamples` kept growing — eye-contact % was stuck at 0% for
  every session run after the previous fix. Now reads
  `det.detection?.box ?? det.box` so it works with both detection
  shapes. Also merged the two separate `detectAllFaces()` calls per
  tick into one to avoid any face-count disagreement between them.
- **MCQ marks:** `MCQ_MARKS` raised from 1 to 2 — each Aptitude MCQ
  is now worth 2 marks (full marks if correct, 0 if wrong; grading
  logic in `submit_answer()` already did exactly this, it just used
  the old constant). Frontend question badge now reads the question's
  actual `marks` value instead of a hardcoded "1 mark" string.
- **Coding round — Run Code:** new `POST
  /interviews/{id}/questions/{qid}/run` endpoint executes the
  candidate's submitted program against the question's test cases
  (reusing `code_judge.run_test_cases`) and returns pass/fail + actual
  output per case, without persisting or scoring anything. A "▶ Run
  Code" button in the coding answer card lets the candidate test their
  program as many times as they like before "Save & Next" triggers the
  real, persisted grading.

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

## Live proctored interview session

`frontend/candidate.html` → "✨ Generate AI Questions" now drops the
candidate straight into `frontend/interview-session.html`, which:

- Requests camera + microphone + full-screen on start (camera and
  mic are both required to begin; full-screen is best-effort). Denied
  permission, no such device, and device-already-in-use are each
  reported with a specific message so the candidate knows what to
  fix. A live mic-level bar next to the webcam preview confirms audio
  is actually being captured, not just requested.
- Marks the session `in_progress` and records `started_at` via
  `PATCH /api/interviews/:id/begin` once camera/mic access is
  granted. The candidate can pause at any time (`PATCH
  /api/interviews/:id/pause`, status → `paused`) and resume (`PATCH
  /api/interviews/:id/resume`, status → back to `in_progress`) —
  both question and total-session timers freeze while paused, and
  proctoring warnings are suspended for that time.
- Runs client-side face detection every ~1.5s via `face-api.js`
  (loaded from a CDN) — flags no face, more than one face, or
  looking away from the screen. If the CDN/model can't load, this
  check is skipped gracefully and tab/full-screen checks still run.
- Flags tab switches, window blur, full-screen exit, and blocked
  copy/paste as proctoring violations, logged via
  `POST /api/interviews/:id/violation`; 5 violations auto-submits
  the interview.
- One countdown for the **whole session** (no per-question timer) —
  its length is computed once at the start by summing a time "weight"
  per question based on category + difficulty (quick-recall HR/
  Aptitude ≈ 60–120s each, Behavioral stories ≈ 90–180s, open-ended
  Technical ≈ 90–240s, plus a small bonus for unusually long question
  text), so a 5-question set and a 30-question set each get a total
  that actually fits their size and mix — not a flat per-question
  window multiplied by count. Auto-submits when it hits zero.
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
