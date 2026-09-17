-- ============================================================
-- AI Mock Interview Platform — Database Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(150)        NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    mobile          VARCHAR(15),
    password        VARCHAR(255),                 -- NULL for OAuth-only accounts
    role            VARCHAR(20) NOT NULL DEFAULT 'candidate'
                        CHECK (role IN ('candidate', 'recruiter', 'coach', 'admin')),
    auth_provider   VARCHAR(20) NOT NULL DEFAULT 'local'
                        CHECK (auth_provider IN ('local', 'google')),
    provider_id     VARCHAR(255),                 -- Google "sub" id, when applicable
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Fast lookups on login / OAuth
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users (auth_provider, provider_id);

-- Keep updated_at fresh on every row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Interviews — every mock interview a candidate takes (instant
-- AI-scored sessions) or books (future scheduled sessions).
-- Feeds candidate.html (history/stats), coach.html (assigned
-- candidates + today's schedule) and recruiter.html (recent
-- candidates + today's schedule).
-- ============================================================
CREATE TABLE IF NOT EXISTS interviews (
    id                     SERIAL PRIMARY KEY,
    candidate_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interview_type         VARCHAR(100) NOT NULL,          -- e.g. "Java Developer", "HR Interview"
    mode                   VARCHAR(20) NOT NULL DEFAULT 'online'
                               CHECK (mode IN ('online', 'offline')),
    status                 VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                               CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    score                  INTEGER CHECK (score BETWEEN 0 AND 100),
    skill_communication    INTEGER CHECK (skill_communication BETWEEN 0 AND 100),
    skill_technical        INTEGER CHECK (skill_technical BETWEEN 0 AND 100),
    skill_confidence       INTEGER CHECK (skill_confidence BETWEEN 0 AND 100),
    skill_problem_solving  INTEGER CHECK (skill_problem_solving BETWEEN 0 AND 100),
    ai_feedback            TEXT,                            -- auto-generated AI feedback
    coach_feedback          TEXT,                            -- added by a coach on review
    reviewed_by            INTEGER REFERENCES users(id) ON DELETE SET NULL,
    scheduled_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at           TIMESTAMP,
    created_at             TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews (candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews (status);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at ON interviews (scheduled_at);

-- Module 3 additions: domain customization + difficulty selection for
-- AI-generated interview sessions. Safe to re-run on an existing DB.
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS domain VARCHAR(100);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS difficulty VARCHAR(10) NOT NULL DEFAULT 'medium'
    CHECK (difficulty IN ('easy', 'medium', 'hard'));
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS question_count INTEGER NOT NULL DEFAULT 0;

-- Proctoring: running count of tab-switch / fullscreen-exit / no-face /
-- multi-face / look-away warnings raised during a live AI interview
-- session. Written by POST /api/interviews/:id/violation (Python service).
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS proctoring_violations INTEGER NOT NULL DEFAULT 0;

-- Interview session recording (webcam + mic, .webm) — auto-recorded
-- during a live proctored session, viewable by the candidate and by
-- staff (coach/recruiter/admin). NULL until POST
-- /api/interviews/:id/recording (Python service) finishes uploading.
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS recording_path VARCHAR(255);

-- Module 7 — AI Feedback & Scoring. skill_professionalism joins the
-- existing skill_communication/skill_technical/skill_confidence columns
-- as the 4th weighted category (Communication 30%, Confidence 25%,
-- Technical Relevance = skill_technical 30%, Professionalism 15%).
-- feedback_json holds the structured 5-part breakdown (strengths/
-- weaknesses/improvements/practice_recommendations/learning_resources);
-- ai_feedback stays as the short free-text summary for backward
-- compatibility with existing report/PDF/modal code.
-- behavior_* columns store the Module 6 webcam-analytics snapshot the
-- frontend sends at finish time (proctored sessions only — null for
-- interviews with no webcam data), kept for admin analytics/audit
-- rather than only ever existing transiently in the browser.
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS skill_professionalism INTEGER;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS rating_label VARCHAR(20);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS feedback_json TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS behavior_eye_contact_pct INTEGER;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS behavior_engagement_pct INTEGER;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS behavior_attention_level VARCHAR(10);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS behavior_confidence_label VARCHAR(10);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS behavior_dominant_emotion VARCHAR(30);

-- Module 9 — Notifications & Reports. Set once
-- POST /api/notifications/reminders/run (Python service) sends this
-- session's one-time "upcoming interview" reminder, so a later scan
-- within the same reminder window doesn't send it again.
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;

-- Module 10 — Admin "AI performance monitoring". Records whether this
-- interview was actually scored by a real LLM provider ('ai') or by
-- the offline simulator ('simulator' — always true for /start and
-- /attend by design; only /finish's live-session flow ever calls a
-- provider), and which provider answered when it was 'ai'.
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS scoring_source VARCHAR(10);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS scoring_provider VARCHAR(20);

-- ============================================================
-- Interview Questions — AI-generated questions belonging to an
-- interview session (Module 3: AI Interview Generation). Each
-- session can mix categories (HR / Technical / Behavioral /
-- Aptitude) at a chosen difficulty, ordered by sequence_no.
-- ============================================================
CREATE TABLE IF NOT EXISTS interview_questions (
    id             SERIAL PRIMARY KEY,
    interview_id   INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_text  TEXT NOT NULL,
    category       VARCHAR(20) NOT NULL
                       CHECK (category IN ('HR', 'Technical', 'Behavioral', 'Aptitude')),
    difficulty     VARCHAR(10) NOT NULL DEFAULT 'medium'
                       CHECK (difficulty IN ('easy', 'medium', 'hard')),
    sequence_no    INTEGER NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_questions_interview ON interview_questions (interview_id);

-- ============================================================
-- Interview Answers — the candidate's typed-or-voice-transcribed
-- answer to each generated question in a live session (one row per
-- question, upserted as they move through the interview). Feeds the
-- real LLM-based scoring in POST/PATCH /api/interviews/:id/finish;
-- falls back to the simulator in question_bank.py when empty.
-- ============================================================
CREATE TABLE IF NOT EXISTS interview_answers (
    id                  SERIAL PRIMARY KEY,
    interview_id        INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_id         INTEGER NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
    answer_text         TEXT,
    input_mode          VARCHAR(10) NOT NULL DEFAULT 'typed'
                            CHECK (input_mode IN ('typed', 'voice')),
    time_taken_seconds  INTEGER,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_answers_interview ON interview_answers (interview_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_answers_question ON interview_answers (question_id);

-- Module 5 — Speech-to-Text & Communication Analysis. Computed once per
-- answer in POST /api/interviews/:id/answers (Python service), from the
-- transcript text (filler words, grammar) and from timing/voice-recognition
-- signals already captured client-side (pace, pronunciation proxy).
-- See backend-python/app/communication_analysis.py for the honest scope
-- of each metric — pronunciation_score is speech-recognition confidence,
-- not true phonetic pronunciation scoring.
ALTER TABLE interview_answers ADD COLUMN IF NOT EXISTS filler_word_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE interview_answers ADD COLUMN IF NOT EXISTS filler_words_found TEXT; -- JSON list, e.g. ["um","like"]
ALTER TABLE interview_answers ADD COLUMN IF NOT EXISTS grammar_issue_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE interview_answers ADD COLUMN IF NOT EXISTS grammar_feedback TEXT;
ALTER TABLE interview_answers ADD COLUMN IF NOT EXISTS speech_wpm INTEGER;              -- words per minute (typed or voice)
ALTER TABLE interview_answers ADD COLUMN IF NOT EXISTS voice_confidence REAL;           -- 0-1, avg Web Speech API confidence, voice answers only
ALTER TABLE interview_answers ADD COLUMN IF NOT EXISTS pronunciation_score INTEGER;     -- 0-100, derived from voice_confidence

-- ============================================================
-- Notifications — small activity feed shown on every dashboard.
-- Either targeted at one user (user_id) or broadcast to a whole
-- role (role), e.g. "New candidate applied" for all recruiters.
--
-- Module 9 — Notifications & Reports builds read/unread management
-- (PATCH .../read, .../me/read-all), interview reminders and
-- proctoring "session alert" broadcasts on top of this same table —
-- see backend-python/app/routers/notifications.py. No schema change
-- was needed for that on top of what Module 1 already created here.
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(20) CHECK (role IN ('candidate', 'recruiter', 'coach', 'admin')),
    title       VARCHAR(150) NOT NULL,
    message     VARCHAR(500) NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (user_id IS NOT NULL OR role IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications (role);

-- ============================================================
-- Job openings — managed by recruiters, feeds the "Job Openings"
-- card and open-positions count on recruiter.html.
-- ============================================================
CREATE TABLE IF NOT EXISTS job_openings (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR(150) NOT NULL,
    department   VARCHAR(100),
    positions    INTEGER NOT NULL DEFAULT 1,
    is_open      BOOLEAN NOT NULL DEFAULT TRUE,
    created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_openings_status ON job_openings (is_open);

-- ============================================================
-- Resumes — Module 2: Resume Upload & Skill Extraction. Each
-- upload is parsed once at upload time and the extracted structured
-- data is cached here so dashboards never have to re-parse the PDF.
-- A candidate may upload more than once; the most recent row (by
-- created_at) is treated as their "current" resume.
-- ============================================================
CREATE TABLE IF NOT EXISTS resumes (
    id                 SERIAL PRIMARY KEY,
    candidate_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_name      VARCHAR(255) NOT NULL,
    file_path          VARCHAR(500) NOT NULL,          -- path on disk under backend/uploads/resumes
    file_size          INTEGER,                         -- bytes
    raw_text           TEXT,                            -- full extracted PDF text
    skills             JSONB NOT NULL DEFAULT '[]',      -- ["JavaScript","React",...]
    technologies       JSONB NOT NULL DEFAULT '{}',      -- {"languages":[...],"frameworks":[...],"databases":[...],"cloudDevops":[...],"tools":[...]}
    experience_years   NUMERIC(4,1),                     -- best-effort estimate, e.g. 3.5
    experience_entries JSONB NOT NULL DEFAULT '[]',      -- [{role,company,duration}]
    education          JSONB NOT NULL DEFAULT '[]',      -- [{degree,institution,year}]
    summary            TEXT,                            -- AI-generated resume summary
    created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ATS-friendliness score (0-100) + the specific formatting/content
-- issues found, e.g. "no email found", "missing skills section".
-- Computed by backend/utils/resumeEngine.js#scoreAts() at upload time.
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS ats_score INTEGER CHECK (ats_score BETWEEN 0 AND 100);
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS ats_feedback JSONB NOT NULL DEFAULT '[]';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS file_type VARCHAR(10); -- "pdf" | "image"

CREATE INDEX IF NOT EXISTS idx_resumes_candidate ON resumes (candidate_id);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON resumes (created_at);

-- ============================================================
-- Coding Submissions — standalone "Coding Practice" page (separate
-- from the scored live-interview flow above). Each row is one graded
-- attempt: the candidate's role locks their language, their code is
-- run against a curated problem's stdin/stdout test cases by the
-- Python judge (app/judge.py), and the pass/fail counts + score here
-- are purely algorithmic — never AI-judged. Powers the submission
-- history table and the PDF/Excel score-list export.
-- ============================================================
CREATE TABLE IF NOT EXISTS coding_submissions (
    id              SERIAL PRIMARY KEY,
    candidate_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id     VARCHAR(100) NOT NULL,          -- id from app/coding_bank.py's curated bank
    title           VARCHAR(150) NOT NULL,
    role            VARCHAR(100) NOT NULL,          -- e.g. "Java Developer" — locks the language
    language        VARCHAR(20) NOT NULL,           -- python | javascript | java | cpp | c
    code            TEXT NOT NULL,
    passed_count    INTEGER NOT NULL DEFAULT 0,
    total_count     INTEGER NOT NULL DEFAULT 0,
    score_percent   INTEGER NOT NULL DEFAULT 0 CHECK (score_percent BETWEEN 0 AND 100),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coding_submissions_candidate ON coding_submissions (candidate_id);
CREATE INDEX IF NOT EXISTS idx_coding_submissions_created_at ON coding_submissions (created_at);

-- ============================================================
-- Coding Practice — AI-generated questions (Gemini). Each row is one
-- freshly generated problem (title/prompt/starter_code/test_cases),
-- persisted so a later POST /api/coding/submit can look up the exact
-- test cases it was generated with and grade against them. Test cases
-- are only ever compared server-side (app/judge.py) — never sent back
-- to the browser, so a candidate can't read them from the network tab.
-- ============================================================
CREATE TABLE IF NOT EXISTS generated_coding_questions (
    id              VARCHAR(64) PRIMARY KEY,        -- uuid4 hex
    candidate_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(100) NOT NULL,
    language        VARCHAR(20) NOT NULL,
    difficulty      VARCHAR(10) NOT NULL,           -- easy | medium | hard
    title           VARCHAR(200) NOT NULL,
    prompt          TEXT NOT NULL,
    starter_code    TEXT NOT NULL,
    test_cases_json TEXT NOT NULL,                  -- JSON-encoded [{input, expected_output}, ...]
    source          VARCHAR(10) NOT NULL DEFAULT 'ai', -- 'ai' (Gemini) | 'bank' (offline fallback)
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_coding_questions_candidate ON generated_coding_questions (candidate_id);

-- ============================================================
-- Module 1 — Admin "Monitor system activities". A lightweight,
-- append-only log of notable events across both backends (this table
-- is written to directly by both the Node service and the Python
-- service — see backend/utils/activityLog.js and
-- backend-python/app/activity_log.py). Not a full audit trail of every
-- request, just the events an admin would actually want visibility
-- into: registrations, logins, interview completions, admin actions.
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
    id              SERIAL PRIMARY KEY,
    actor_user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    actor_role      VARCHAR(20),
    action          VARCHAR(100) NOT NULL,
    details         TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log (created_at DESC);

-- ============================================================
-- Module 1 — Recruiter "Create interview templates". A named preset
-- for the fields already used by POST /api/interviews/generate — picking
-- one just pre-fills that form, it doesn't change how interviews are
-- generated or scored. See backend-python/app/routers/templates.py.
-- ============================================================
CREATE TABLE IF NOT EXISTS interview_templates (
    id              SERIAL PRIMARY KEY,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name            VARCHAR(150) NOT NULL,
    interview_type  VARCHAR(50) NOT NULL,
    category        VARCHAR(50),
    domain          VARCHAR(100),
    difficulty      VARCHAR(10) NOT NULL DEFAULT 'medium',
    question_count  INTEGER NOT NULL DEFAULT 5,
    mode            VARCHAR(20) NOT NULL DEFAULT 'online',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Seed a default admin (matches the "Default Admin Login" shown
-- on login.html). Password is hashed at app-start via seed.js,
-- NOT stored in plaintext here.
-- ============================================================
