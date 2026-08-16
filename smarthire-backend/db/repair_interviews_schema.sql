-- ============================================================================
-- repair_interviews_schema.sql
--
-- ROOT CAUSE
-- ----------
-- This project uses spring.jpa.hibernate.ddl-auto=update (see
-- src/main/resources/application.properties) instead of Flyway/Liquibase -
-- there are no migration files anywhere in the project. Hibernate's
-- auto-update mechanism generates new columns for fields added to
-- Interview.java, but it cannot safely add a NOT NULL column (e.g.
-- experience_level) to a table (`interviews`) that already contains rows,
-- because Postgres rejects an ADD COLUMN ... NOT NULL statement when
-- existing rows would violate the constraint. docker-compose.yml persists
-- Postgres data in a named volume (smarthire_pgdata), so a database created
-- before `experience_level` existed in the entity keeps that stale schema
-- across restarts even though the current code expects the column - this is
-- exactly the drift the error
--   "ERROR: column i1_0.experience_level does not exist" (SQLState 42703)
-- is reporting.
--
-- WHAT THIS SCRIPT DOES
-- ----------------------
-- 1. Adds any column mapped on Interview.java that is missing from the
--    live `interviews` table (as NULLABLE first - always safe).
-- 2. Backfills NULLs in columns the entity marks NOT NULL, using the same
--    default values the application itself already uses when creating a
--    new Interview row (see InterviewService.getOrCreateLatestInterviewForUser).
-- 3. Applies the NOT NULL constraint to match Interview.java, but only
--    after confirming no NULLs remain (so it never fails on real data).
--
-- This does NOT drop or recreate the table, does NOT touch any other
-- table, and does NOT alter existing data other than filling in the
-- required backfill values described above. It is idempotent - safe to
-- run multiple times.
--
-- HOW TO RUN
-- ----------
-- Local Postgres:
--   psql -U postgres -d smarthire -f db/repair_interviews_schema.sql
--
-- Docker Compose:
--   docker compose exec -T postgres psql -U postgres -d smarthire \
--     < smarthire-backend/smarthire-backend/db/repair_interviews_schema.sql
--
-- Run this once against your existing database, then restart the backend.
-- spring.jpa.hibernate.ddl-auto=update remains the project's ongoing schema
-- strategy for anything added after this point; this script only repairs
-- the drift that update could not apply automatically.
-- ============================================================================

BEGIN;

-- 1. Add any columns missing entirely (nullable - always safe, no data risk)
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interview_type VARCHAR(255);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS job_role VARCHAR(255);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS domain VARCHAR(255);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS difficulty VARCHAR(255);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS experience_level VARCHAR(255);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS session_summary TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS transcript_text TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS session_timeline TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS recovery_state TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS video_recording_name VARCHAR(255);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS audio_recording_name VARCHAR(255);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS recording_supported BOOLEAN;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS recording_active BOOLEAN;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS recording_duration_seconds INTEGER;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS timer_seconds_remaining INTEGER;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS transcript_updated_at TIMESTAMP;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS live_signals_json TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS speech_insights_json TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS career_roadmap_json TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS assessment_results_json TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS notification_center_json TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS profile_completion_json TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

-- 2. Backfill NULLs in NOT-NULL-mapped columns with the same defaults the
--    application itself uses (InterviewService.getOrCreateLatestInterviewForUser
--    creates new interviews with interviewType="technical", domain="general",
--    difficulty="medium", experienceLevel="mid").
UPDATE interviews SET interview_type   = 'technical' WHERE interview_type   IS NULL;
UPDATE interviews SET domain           = 'general'   WHERE domain           IS NULL;
UPDATE interviews SET difficulty       = 'medium'    WHERE difficulty       IS NULL;
UPDATE interviews SET experience_level = 'mid'       WHERE experience_level IS NULL;
UPDATE interviews SET created_at       = NOW()       WHERE created_at       IS NULL;

-- 3. Enforce NOT NULL to match Interview.java, only where it is now safe to do so.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM interviews WHERE interview_type IS NULL) THEN
        ALTER TABLE interviews ALTER COLUMN interview_type SET NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM interviews WHERE domain IS NULL) THEN
        ALTER TABLE interviews ALTER COLUMN domain SET NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM interviews WHERE difficulty IS NULL) THEN
        ALTER TABLE interviews ALTER COLUMN difficulty SET NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM interviews WHERE experience_level IS NULL) THEN
        ALTER TABLE interviews ALTER COLUMN experience_level SET NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM interviews WHERE created_at IS NULL) THEN
        ALTER TABLE interviews ALTER COLUMN created_at SET NOT NULL;
    END IF;
    -- user_id has no safe synthetic default (it identifies which user the
    -- interview belongs to), so it is only constrained NOT NULL if every
    -- existing row already has one. If any row has a NULL user_id, that
    -- indicates pre-existing corrupt/orphaned data unrelated to this bug -
    -- this script deliberately leaves it visible rather than papering over it.
    IF NOT EXISTS (SELECT 1 FROM interviews WHERE user_id IS NULL) THEN
        ALTER TABLE interviews ALTER COLUMN user_id SET NOT NULL;
    ELSE
        RAISE NOTICE 'interviews table has row(s) with NULL user_id - review manually; user_id was left nullable.';
    END IF;
END $$;

-- 4. Create the per-question session timing table used by InterviewQuestionAttempt.
--    The application uses spring.jpa.hibernate.ddl-auto=update, so normal backend
--    startup will also create/update this table. This block makes the repair script
--    safe for existing databases that are restored before Hibernate starts.
CREATE TABLE IF NOT EXISTS interview_question_attempts (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL,
    question_index INTEGER NOT NULL,
    question_text TEXT,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds BIGINT NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_question_attempt_session_index
    ON interview_question_attempts (session_id, question_index);

COMMIT;

-- Verification query - should return 0 rows if the schema is now fully aligned
-- with Interview.java's NOT NULL columns:
-- SELECT id FROM interviews
-- WHERE interview_type IS NULL OR domain IS NULL OR difficulty IS NULL
--    OR experience_level IS NULL OR created_at IS NULL OR user_id IS NULL;
