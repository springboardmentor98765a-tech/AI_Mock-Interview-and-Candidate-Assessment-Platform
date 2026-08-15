-- ============================================================
--  MIGRATION 005: Create Interview Results & Question Analytics Tables
--  SmartHire — Candidate Completion & Recruiter Analytics Module
-- ============================================================

BEGIN;

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Interview Results Table
CREATE TABLE IF NOT EXISTS interview_results (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              UUID          NOT NULL UNIQUE REFERENCES interview_sessions(id) ON DELETE CASCADE,
  candidate_id            UUID          REFERENCES users(id) ON DELETE SET NULL,
  interview_id            UUID          REFERENCES interview_sessions(id) ON DELETE CASCADE,
  total_questions         INT           NOT NULL DEFAULT 0,
  questions_completed     INT           NOT NULL DEFAULT 0,
  completion_percentage   NUMERIC(5,2)  NOT NULL DEFAULT 0.0,
  total_duration          INT           NOT NULL DEFAULT 0, -- in seconds
  average_question_time   NUMERIC(8,2)  NOT NULL DEFAULT 0.0, -- in seconds
  technical_score         NUMERIC(5,2),
  communication_score     NUMERIC(5,2),
  behavioral_score        NUMERIC(5,2),
  aptitude_score          NUMERIC(5,2),
  problem_solving_score   NUMERIC(5,2),
  culture_fit_score       NUMERIC(5,2),
  motivation_score        NUMERIC(5,2),
  leadership_score        NUMERIC(5,2),
  adaptability_score      NUMERIC(5,2),
  logical_reasoning_score NUMERIC(5,2),
  quantitative_score      NUMERIC(5,2),
  overall_score           NUMERIC(5,2)  NOT NULL DEFAULT 0.0,
  recommendation          VARCHAR(100)  DEFAULT 'Under Review',
  completed_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Trigger for interview_results updated_at
DROP TRIGGER IF EXISTS trg_interview_results_updated_at ON interview_results;
CREATE TRIGGER trg_interview_results_updated_at
  BEFORE UPDATE ON interview_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for interview_results
CREATE INDEX IF NOT EXISTS idx_interview_results_session_id   ON interview_results (session_id);
CREATE INDEX IF NOT EXISTS idx_interview_results_candidate_id ON interview_results (candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_results_overall_score ON interview_results (overall_score);

-- Question-Level Results Analytics Table
CREATE TABLE IF NOT EXISTS interview_question_results (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID          NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  result_id       UUID          REFERENCES interview_results(id) ON DELETE CASCADE,
  question_id     UUID          REFERENCES interview_questions(id) ON DELETE CASCADE,
  question_number INT           NOT NULL,
  question_text   TEXT          NOT NULL,
  answer_status   VARCHAR(50)   NOT NULL DEFAULT 'Skipped', -- 'Answered' or 'Skipped'
  time_spent      INT           NOT NULL DEFAULT 0, -- in seconds
  answer_type     VARCHAR(100), -- domain or category
  user_answer     TEXT,
  score           NUMERIC(5,2),
  evaluation      TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes for interview_question_results
CREATE INDEX IF NOT EXISTS idx_question_results_session_id ON interview_question_results (session_id);
CREATE INDEX IF NOT EXISTS idx_question_results_result_id  ON interview_question_results (result_id);

-- Register migration
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(50) PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('005_create_interview_results')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
