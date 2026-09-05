-- SmartHire Module 6 schema repair (idempotent)
-- Runs after Hibernate schema update and only adds/backfills columns/tables
-- required by the current proctoring + monitoring model.

-- Existing InterviewSession table: add the Module 6 persistence columns.
ALTER TABLE IF EXISTS interview_sessions
    ADD COLUMN IF NOT EXISTS violation_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS interview_sessions
    ADD COLUMN IF NOT EXISTS max_violations INTEGER NOT NULL DEFAULT 3;

ALTER TABLE IF EXISTS interview_sessions
    ADD COLUMN IF NOT EXISTS malpractice_terminated BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS interview_sessions
    ADD COLUMN IF NOT EXISTS terminated_reason TEXT;

ALTER TABLE IF EXISTS interview_sessions
    ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMP;

ALTER TABLE IF EXISTS interview_sessions
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Keep existing rows valid even when the table predates Module 6.
UPDATE interview_sessions
SET violation_count = 0
WHERE violation_count IS NULL;

UPDATE interview_sessions
SET max_violations = 3
WHERE max_violations IS NULL;

UPDATE interview_sessions
SET malpractice_terminated = FALSE
WHERE malpractice_terminated IS NULL;

-- InterviewEvaluation: Module 6 evidence fields.
ALTER TABLE IF EXISTS interview_evaluations
    ADD COLUMN IF NOT EXISTS proctoring_violation_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS interview_evaluations
    ADD COLUMN IF NOT EXISTS malpractice_terminated BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS interview_evaluations
    ADD COLUMN IF NOT EXISTS malpractice_reason TEXT;

ALTER TABLE IF EXISTS interview_evaluations
    ADD COLUMN IF NOT EXISTS proctoring_violations_json TEXT;

UPDATE interview_evaluations
SET proctoring_violation_count = 0
WHERE proctoring_violation_count IS NULL;

UPDATE interview_evaluations
SET malpractice_terminated = FALSE
WHERE malpractice_terminated IS NULL;

-- Persistent proctoring audit trail required by Module 6.
CREATE TABLE IF NOT EXISTS proctoring_violations (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL,
    candidate_id BIGINT NOT NULL,
    type VARCHAR(64) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    details TEXT,
    evidence_reference TEXT,
    warning_number INTEGER NOT NULL,
    action_taken VARCHAR(64) NOT NULL,
    source VARCHAR(32) NOT NULL,
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    final_status VARCHAR(32)
);

CREATE INDEX IF NOT EXISTS idx_proctor_session
    ON proctoring_violations (session_id);

CREATE INDEX IF NOT EXISTS idx_proctor_candidate
    ON proctoring_violations (candidate_id);

CREATE INDEX IF NOT EXISTS idx_proctor_time
    ON proctoring_violations (detected_at);

-- Module 7 scoring persistence
ALTER TABLE IF EXISTS interview_evaluations ADD COLUMN IF NOT EXISTS speaking_confidence_score INTEGER;
ALTER TABLE IF EXISTS interview_evaluations ADD COLUMN IF NOT EXISTS attention_score INTEGER;
ALTER TABLE IF EXISTS interview_evaluations ADD COLUMN IF NOT EXISTS professional_communication_score INTEGER;
