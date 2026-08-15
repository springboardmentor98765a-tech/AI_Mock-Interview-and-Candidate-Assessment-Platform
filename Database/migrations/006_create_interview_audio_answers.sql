-- ============================================================
--  MIGRATION 006: Create Interview Question Audio Answers Table
--  SmartHire — Per-Question Candidate Voice Answer Module
-- ============================================================

BEGIN;

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Interview Question Audio Answers Table
CREATE TABLE IF NOT EXISTS interview_audio_answers (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID          NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  candidate_id     UUID          REFERENCES users(id) ON DELETE SET NULL,
  question_id      UUID          NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
  question_number  INT           NOT NULL,
  storage_location TEXT          NOT NULL,
  mime_type        VARCHAR(100)  NOT NULL DEFAULT 'audio/webm',
  file_size        BIGINT        NOT NULL DEFAULT 0,
  duration         INT           NOT NULL DEFAULT 0, -- in seconds
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_audio_answers_session_question UNIQUE (session_id, question_id)
);

-- Trigger for interview_audio_answers updated_at
DROP TRIGGER IF EXISTS trg_interview_audio_answers_updated_at ON interview_audio_answers;
CREATE TRIGGER trg_interview_audio_answers_updated_at
  BEFORE UPDATE ON interview_audio_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for interview_audio_answers
CREATE INDEX IF NOT EXISTS idx_interview_audio_answers_session_id  ON interview_audio_answers (session_id);
CREATE INDEX IF NOT EXISTS idx_interview_audio_answers_question_id ON interview_audio_answers (question_id);
CREATE INDEX IF NOT EXISTS idx_interview_audio_answers_candidate   ON interview_audio_answers (candidate_id);

-- Register migration
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(50) PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('006_create_interview_audio_answers')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
