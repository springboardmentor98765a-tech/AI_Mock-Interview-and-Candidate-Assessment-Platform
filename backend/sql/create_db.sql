-- ==========================================================
-- AI INTERVIEW PRO - DATABASE SETUP SCRIPT
-- ==========================================================
-- Run this with psql, e.g.:
--   psql -U postgres -f create_db.sql
--
-- Note: SQLAlchemy (Base.metadata.create_all) will also create the
-- "users" table automatically on first backend startup. This script
-- is provided for teams who prefer to set up the schema manually /
-- via a migration pipeline.
-- ==========================================================

-- 1. Create the database (run this part while connected to the
--    default "postgres" database, then reconnect to AI_Interview_Pro
--    before running the rest of this script).
CREATE DATABASE "AI_Interview_Pro";

-- \c AI_Interview_Pro   -- (uncomment when running interactively in psql)

-- 2. Extension for UUID generation (optional - SQLAlchemy/Python also
--    generates UUIDs application-side, so this is only needed if you
--    want the database itself to be able to generate them).
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Enum types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('candidate', 'recruiter', 'admin');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE auth_provider AS ENUM ('local', 'google');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 4. Users table
CREATE TABLE IF NOT EXISTS users (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name          VARCHAR(150)  NOT NULL,
    email              VARCHAR(255)  NOT NULL UNIQUE,
    password_hash      VARCHAR(255),                 -- NULL for Google-only accounts
    role               user_role     NOT NULL,
    auth_provider      auth_provider NOT NULL DEFAULT 'local',
    google_id          VARCHAR(255)  UNIQUE,
    profile_picture    VARCHAR(500),
    is_active          BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- 5. Helpful index for fast lookups by email (also enforced unique above)
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ==========================================================
-- 6. Module 2 - Resume Parsing & Analysis (columns on users)
-- ==========================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_file_name          VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_text               TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_skills             TEXT;             -- comma-separated flat list
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_skills_by_category JSON;             -- {"languages": [...], "databases": [...], ...}
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_experience_years   REAL;             -- e.g. 4.5
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_experience         JSON;             -- [{"title","company","duration"}, ...]
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_education          JSON;             -- [{"degree","institution","year"}, ...]
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_summary            TEXT;             -- auto-generated candidate summary
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_uploaded_at        TIMESTAMP;

-- ==========================================================
-- 7. Module 3 - AI Interview Generation
-- ==========================================================
DO $$ BEGIN
    CREATE TYPE interview_type AS ENUM ('hr', 'technical', 'behavioral', 'aptitude');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE interview_difficulty AS ENUM ('easy', 'medium', 'hard');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE interview_status AS ENUM ('created', 'in_progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE question_difficulty AS ENUM ('easy', 'medium', 'hard');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS interviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interview_type  interview_type       NOT NULL,
    domain          VARCHAR(150)         NOT NULL,
    difficulty      interview_difficulty NOT NULL,
    status          interview_status     NOT NULL DEFAULT 'created',
    created_at      TIMESTAMP            NOT NULL DEFAULT NOW(),
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interview_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id    UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_text   TEXT                 NOT NULL,
    category        VARCHAR(100)         NOT NULL,
    difficulty      question_difficulty  NOT NULL,
    sequence_no     INTEGER              NOT NULL,
    answer_text     TEXT,
    answered_at     TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interviews_user_id            ON interviews (user_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_interview ON interview_questions (interview_id);

-- ==========================================================
-- 8. Timer feature + real performance analytics (scores)
-- ==========================================================
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;             -- NULL/0 = no time limit
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS time_expired     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS overall_score    REAL;                -- avg of answered questions' scores

ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS technical_score     REAL;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS communication_score REAL;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS confidence_score    REAL;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS grammar_score       REAL;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS overall_score       REAL;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS word_count          INTEGER;
