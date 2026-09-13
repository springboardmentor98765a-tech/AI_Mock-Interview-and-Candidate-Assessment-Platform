-- Module 7: AI Feedback & Scoring
-- Safe to run repeatedly on an existing PostgreSQL database.

ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS professionalism_score REAL;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS scoring_method VARCHAR(30);
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS scoring_version VARCHAR(30);
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS question_feedback TEXT;

CREATE TABLE IF NOT EXISTS interview_assessments (
    id UUID PRIMARY KEY,
    interview_id UUID NOT NULL UNIQUE REFERENCES interviews(id) ON DELETE CASCADE,
    communication_score REAL NOT NULL,
    confidence_score REAL NOT NULL,
    technical_score REAL NOT NULL,
    professionalism_score REAL NOT NULL,
    overall_score REAL NOT NULL,
    performance_rating VARCHAR(40) NOT NULL,
    feedback JSON NOT NULL,
    sub_scores JSON NOT NULL,
    missing_data JSON NOT NULL,
    scoring_method VARCHAR(30) NOT NULL,
    feedback_method VARCHAR(30) NOT NULL,
    scoring_version VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_interview_assessments_interview_id
    ON interview_assessments (interview_id);
