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
                               CHECK (status IN ('scheduled', 'in_progress', 'paused', 'completed', 'cancelled')),
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

-- Module 4 additions: explicit session lifecycle (start / pause / resume /
-- end) for the live proctored interview page, distinct from the coarser
-- scheduled/completed/cancelled states above. started_at/completed_at give
-- the true wall-clock start and end of the session; paused_at/paused_seconds
-- let the UI show accurate "active" elapsed time across one or more pauses.
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS paused_seconds INTEGER NOT NULL DEFAULT 0;

-- Existing databases created before 'in_progress'/'paused' were added to
-- the status enum still have the old CHECK constraint — widen it here so
-- this file stays safe to re-run on both fresh and pre-existing installs.
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_status_check;
ALTER TABLE interviews ADD CONSTRAINT interviews_status_check
    CHECK (status IN ('scheduled', 'in_progress', 'paused', 'completed', 'cancelled'));

-- Module 4/5 additions: an explicit, externally-referenceable session
-- identifier (separate from the numeric interview_id primary key —
-- used wherever the *session*, not the interview record, needs to be
-- named, e.g. in recording/report links), the total active session
-- duration in seconds (started_at → completed_at, minus paused_seconds,
-- frozen once the session finishes so it never needs recomputing), and
-- a running count of how many questions the candidate has actually
-- answered (kept separate from question_count, which is the *target*
-- number of questions for the session).
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS session_id VARCHAR(36) UNIQUE;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS questions_attempted INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- Interview Recordings — Module 5 (Recording). The proctored live
-- session's combined video+audio, captured client-side with the
-- MediaRecorder API from the same webcam/mic stream already used for
-- proctoring (frontend/js/interview-session.js), uploaded once when
-- the candidate finishes.
--
-- The actual video FILE lives on disk under backend-python/recordings/
-- (see app/recording_store.py) rather than as a bytea blob in this
-- table — Postgres isn't a good fit for large binary video (it bloats
-- the DB and every read/write goes through the connection pool
-- instead of being streamed straight off disk/through a CDN later).
-- This table is the database-side source of truth: it's what proves
-- a recording exists, who it belongs to, and — via the access checks
-- in the Python service — who's allowed to open it, without anyone
-- having to touch the filesystem directly.
-- ============================================================
CREATE TABLE IF NOT EXISTS interview_recordings (
    id                SERIAL PRIMARY KEY,
    interview_id      INTEGER NOT NULL UNIQUE REFERENCES interviews(id) ON DELETE CASCADE,
    file_path         VARCHAR(500) NOT NULL,     -- combined video+audio file, relative to backend-python/
    mime_type         VARCHAR(100) NOT NULL DEFAULT 'video/webm',
    size_bytes        BIGINT NOT NULL DEFAULT 0,
    duration_seconds  INTEGER,
    started_at        TIMESTAMP,
    ended_at          TIMESTAMP,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Module 5 addition: an audio-only reference alongside the combined
-- video file. Extracted server-side (ffmpeg, see recording_store.py)
-- from the uploaded video the moment it's saved, so callers that only
-- need the audio track (e.g. a future transcript/analysis feature)
-- don't have to demux the video themselves.
ALTER TABLE interview_recordings ADD COLUMN IF NOT EXISTS audio_file_path VARCHAR(500);
ALTER TABLE interview_recordings ADD COLUMN IF NOT EXISTS audio_mime_type VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_interview_recordings_interview ON interview_recordings (interview_id);

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

-- ============================================================
-- Notifications — small activity feed shown on every dashboard.
-- Either targeted at one user (user_id) or broadcast to a whole
-- role (role), e.g. "New candidate applied" for all recruiters.
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
-- Seed a default admin (matches the "Default Admin Login" shown
-- on login.html). Password is hashed at app-start via seed.js,
-- NOT stored in plaintext here.
-- ============================================================
