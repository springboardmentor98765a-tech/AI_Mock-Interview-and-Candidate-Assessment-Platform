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

-- ==========================================================
-- 9. Module 4 - Interview Session Management
--    (webcam access, microphone access, video/audio recording,
--     timer-based workflow already added above, session storage)
-- ==========================================================

-- Per-question timing ("time spent per question")
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS question_shown_at TIMESTAMP;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('active', 'paused', 'completed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE recording_type AS ENUM ('video', 'audio');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- A live/proctored attempt at an Interview. Kept as its own table
-- (rather than columns on `interviews`) so pause/resume, webcam/mic
-- state, and recordings don't get tangled up with question-answering.
CREATE TABLE IF NOT EXISTS interview_sessions (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interview_id          UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE UNIQUE,

    start_time            TIMESTAMP,
    end_time              TIMESTAMP,
    duration_seconds      INTEGER,                        -- active (non-paused) seconds elapsed

    status                session_status NOT NULL DEFAULT 'active',

    camera_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
    microphone_enabled    BOOLEAN NOT NULL DEFAULT FALSE,

    paused_at             TIMESTAMP,
    total_paused_seconds  INTEGER NOT NULL DEFAULT 0,

    -- Full-screen proctoring
    fullscreen_violations INTEGER NOT NULL DEFAULT 0,

    created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- One or more recordings belonging to a session (e.g. a video recording,
-- or an audio-only fallback if the camera was denied).
CREATE TABLE IF NOT EXISTS interview_recordings (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id        UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,

    recording_type    recording_type NOT NULL DEFAULT 'video',
    file_path         VARCHAR(500) NOT NULL,             -- relative path under MEDIA_ROOT
    mime_type         VARCHAR(100),
    size_bytes        INTEGER,
    duration_seconds  INTEGER,

    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_candidate  ON interview_sessions (candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_interview  ON interview_sessions (interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_recordings_session  ON interview_recordings (session_id);

-- For existing databases where interview_sessions was already created
-- by an earlier version of this migration (without this column):
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS fullscreen_violations INTEGER NOT NULL DEFAULT 0;

-- NOTE: earlier versions of this project stored camera_enabled /
-- microphone_enabled / recording_* directly as columns on `interviews`.
-- That approach has been replaced by the interview_sessions /
-- interview_recordings tables above. If your database still has those
-- old columns, they're simply unused now - drop them at your
-- convenience with:
--   ALTER TABLE interviews DROP COLUMN IF EXISTS camera_enabled;
--   ALTER TABLE interviews DROP COLUMN IF EXISTS microphone_enabled;
--   ALTER TABLE interviews DROP COLUMN IF EXISTS recording_file_path;
--   ALTER TABLE interviews DROP COLUMN IF EXISTS recording_mime_type;
--   ALTER TABLE interviews DROP COLUMN IF EXISTS recording_size_bytes;
--   ALTER TABLE interviews DROP COLUMN IF EXISTS recording_uploaded_at;

-- ==========================================================
-- 10. Module 5 - Speech-to-Text & Communication Analysis
--     Real metrics captured client-side (browser Speech Recognition
--     API) while the candidate spoke an answer. NULL whenever they
--     typed instead of speaking.
-- ==========================================================
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS filler_word_count      INTEGER;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS speaking_pace_wpm      REAL;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS pronunciation_score    REAL;   -- recognition-confidence-derived clarity, 0-100
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS speech_duration_seconds INTEGER;

-- ==========================================================
-- 11. Module 6 - Emotion Detection & Eye Tracking
--     Running aggregates built from periodic client-side webcam
--     analysis batches (face-api.js in the browser - see
--     POST /sessions/{id}/emotion-samples). No image/video data is
--     ever stored - only these summary counts/sums.
-- ==========================================================
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS emotion_sample_count  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS face_detected_count   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS eye_contact_count     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS emotion_counts        JSON;             -- {"neutral": 12, "happy": 4, ...}
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS visual_confidence_sum REAL NOT NULL DEFAULT 0;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS engagement_sum        REAL NOT NULL DEFAULT 0;
