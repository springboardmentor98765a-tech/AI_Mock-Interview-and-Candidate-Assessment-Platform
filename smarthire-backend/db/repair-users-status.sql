-- SmartHire compatibility repair for existing PostgreSQL databases.
-- Safe to run repeatedly. It backfills legacy users before enforcing NOT NULL.
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT 'ACTIVE';
UPDATE users SET status = 'ACTIVE' WHERE status IS NULL;
ALTER TABLE IF EXISTS users ALTER COLUMN status SET DEFAULT 'ACTIVE';
ALTER TABLE IF EXISTS users ALTER COLUMN status SET NOT NULL;
