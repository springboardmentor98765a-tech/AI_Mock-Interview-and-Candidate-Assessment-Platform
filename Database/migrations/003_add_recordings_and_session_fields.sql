-- ============================================================
--  MIGRATION 003: Add Recording Metadata & Session Index Fields
--  SmartHire — Interview Session & Video Recording Module
-- ============================================================

BEGIN;

-- Add current_question_index, paused_at, resumed_at, duration to interview_sessions if not exists
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS current_question_index INT DEFAULT 0;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS duration INT DEFAULT 0;

-- Create interview_recordings table
CREATE TABLE IF NOT EXISTS interview_recordings (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID          NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  candidate_id     UUID          REFERENCES users(id) ON DELETE SET NULL,
  interview_id     UUID          REFERENCES interview_sessions(id) ON DELETE CASCADE,
  recording_type   VARCHAR(50)   NOT NULL DEFAULT 'video_audio',
  storage_location TEXT          NOT NULL,
  mime_type        VARCHAR(100)  NOT NULL DEFAULT 'video/webm',
  file_size        BIGINT        NOT NULL DEFAULT 0,
  duration         INT           NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Ensure duration column exists if table was previously created
ALTER TABLE interview_recordings ADD COLUMN IF NOT EXISTS duration INT DEFAULT 0;

-- Indexes for interview_recordings
CREATE INDEX IF NOT EXISTS idx_interview_recordings_session_id   ON interview_recordings (session_id);
CREATE INDEX IF NOT EXISTS idx_interview_recordings_candidate_id ON interview_recordings (candidate_id);

-- Register migration
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(50) PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('003_add_recordings_and_session_fields')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
