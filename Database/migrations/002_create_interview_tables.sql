-- ============================================================
--  MIGRATION 002: Create Interview Sessions & Questions Tables
--  SmartHire — AI Interview Generation Module
--  Run: psql -U postgres -d smarthire -f 002_create_interview_tables.sql
-- ============================================================

BEGIN;

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Interview sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by       UUID          REFERENCES users(id) ON DELETE SET NULL,
  candidate_id     UUID          REFERENCES users(id) ON DELETE SET NULL,
  job_role         VARCHAR(255)  NOT NULL,
  domain           VARCHAR(100)  NOT NULL,
  interview_type   VARCHAR(50)   NOT NULL, -- HR, Technical, Behavioral, Aptitude
  difficulty       VARCHAR(50)   NOT NULL, -- Easy, Medium, Hard, Expert
  experience_level VARCHAR(50)   DEFAULT 'Mid Level',
  num_questions    INT           NOT NULL DEFAULT 5,
  user_skills      TEXT,
  job_description  TEXT,
  resume_text      TEXT,
  status           VARCHAR(50)   NOT NULL DEFAULT 'created', -- created, in_progress, completed
  score            NUMERIC(5,2),
  total_questions  INT           NOT NULL DEFAULT 0,
  completed_questions INT        NOT NULL DEFAULT 0,
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- Trigger for interview_sessions updated_at
DROP TRIGGER IF EXISTS trg_interview_sessions_updated_at ON interview_sessions;
CREATE TRIGGER trg_interview_sessions_updated_at
  BEFORE UPDATE ON interview_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status  ON interview_sessions (status);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_domain  ON interview_sessions (domain);

-- Interview questions table
CREATE TABLE IF NOT EXISTS interview_questions (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID          NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_number       INT           NOT NULL,
  question_text         TEXT          NOT NULL,
  interview_type        VARCHAR(50)   NOT NULL,
  domain                VARCHAR(100)  NOT NULL,
  difficulty            VARCHAR(50)   NOT NULL,
  expected_answer_points JSONB         DEFAULT '[]'::jsonb,
  category              VARCHAR(100),
  user_answer           TEXT,
  sample_answer         TEXT,
  feedback              TEXT,
  score                 NUMERIC(5,2),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes for questions
CREATE INDEX IF NOT EXISTS idx_interview_questions_session_id ON interview_questions (session_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_number     ON interview_questions (session_id, question_number);

-- Schema migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(50) PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('002_create_interview_tables')
  ON CONFLICT (version) DO NOTHING;

COMMIT;

