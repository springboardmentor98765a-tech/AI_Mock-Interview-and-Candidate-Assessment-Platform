-- Module 8: revocable candidate consent for recruiter interview access.
DO $$ BEGIN
    CREATE TYPE share_status AS ENUM ('active', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS interview_share_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope VARCHAR(40) NOT NULL DEFAULT 'full_interview',
    status share_status NOT NULL DEFAULT 'active',
    granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_interview_recruiter_share UNIQUE (interview_id, recruiter_id)
);

CREATE INDEX IF NOT EXISTS idx_share_candidate_status
    ON interview_share_consents(candidate_id, status);
CREATE INDEX IF NOT EXISTS idx_share_recruiter_status
    ON interview_share_consents(recruiter_id, status);
CREATE INDEX IF NOT EXISTS idx_share_interview
    ON interview_share_consents(interview_id);

