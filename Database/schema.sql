-- ============================================================
--  SMARTHIRE DATABASE SCHEMA
--  PostgreSQL 18+
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Role enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('candidate', 'recruiter', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Auth provider enum
DO $$ BEGIN
  CREATE TYPE auth_provider AS ENUM ('local', 'google', 'github');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100)  NOT NULL,
  email           VARCHAR(255)  NOT NULL UNIQUE,
  password_hash   TEXT,                           -- NULL for OAuth-only users
  role            user_role     NOT NULL DEFAULT 'candidate',
  auth_provider   auth_provider NOT NULL DEFAULT 'local',
  avatar_url      TEXT,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users (role);

-- ============================================================
--  SESSIONS TABLE  (for refresh token tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT        NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions (token_hash);
