const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'ai_recruitment',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
})

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err)
  process.exit(1)
})

async function testConnection() {
  const client = await pool.connect()
  try {
    await client.query('SELECT NOW()')
    console.log('PostgreSQL connected successfully')
  } finally {
    client.release()
  }
}

async function initDatabase() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        email       VARCHAR(255) NOT NULL UNIQUE,
        password    VARCHAR(255),
        role        VARCHAR(50)  NOT NULL DEFAULT 'USER',
        provider    VARCHAR(50)  NOT NULL DEFAULT 'LOCAL',
        google_id   VARCHAR(255),
        github_id   VARCHAR(255),
        avatar      VARCHAR(500),
        created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS google_id  VARCHAR(255),
        ADD COLUMN IF NOT EXISTS github_id  VARCHAR(255),
        ADD COLUMN IF NOT EXISTS avatar     VARCHAR(500)
    `)

    await client.query(`
      ALTER TABLE users
        ALTER COLUMN role     SET DEFAULT 'USER',
        ALTER COLUMN provider SET DEFAULT 'LOCAL'
    `)

    await client.query(`
      DO $$
      BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_provider_check;
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check_upper;
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_provider_check_upper;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$
    `)

    await client.query(`
      ALTER TABLE users
        ADD CONSTRAINT users_role_check_upper
          CHECK (role IN ('ADMIN', 'RECRUITER', 'USER'))
    `)

    await client.query(`
      ALTER TABLE users
        ADD CONSTRAINT users_provider_check_upper
          CHECK (provider IN ('LOCAL', 'GOOGLE', 'GITHUB'))
    `)

    await client.query(`
      UPDATE users SET role     = UPPER(role)     WHERE role     != UPPER(role)
    `)
    await client.query(`
      UPDATE users SET provider = UPPER(provider) WHERE provider != UPPER(provider)
    `)

    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `)

    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS resumes (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        filename      VARCHAR(500) NOT NULL,
        original_name VARCHAR(500) NOT NULL,
        file_path     VARCHAR(1000) NOT NULL,
        file_size     INTEGER,
        upload_date   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS resume_analyses (
        id           SERIAL PRIMARY KEY,
        resume_id    INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
        contact_info JSONB,
        skills       JSONB,
        technologies JSONB,
        experience   JSONB,
        education    JSONB,
        summary      TEXT,
        raw_text     TEXT,
        ats_score    JSONB,
        analyzed_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Idempotent migration: add ats_score if the table was created before this column existed
    await client.query(`
      ALTER TABLE resume_analyses
        ADD COLUMN IF NOT EXISTS ats_score JSONB
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS interviews (
        id                  SERIAL PRIMARY KEY,
        user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        resume_analysis_id  INTEGER REFERENCES resume_analyses(id) ON DELETE SET NULL,
        selected_role       VARCHAR(255) NOT NULL,
        interview_type      VARCHAR(50)  NOT NULL DEFAULT 'Mixed',
        difficulty          VARCHAR(20)  NOT NULL DEFAULT 'Medium',
        question_count      INTEGER      NOT NULL DEFAULT 10,
        status              VARCHAR(30)  NOT NULL DEFAULT 'pending',
        score               INTEGER,
        started_at          TIMESTAMP WITH TIME ZONE,
        completed_at        TIMESTAMP WITH TIME ZONE,
        duration            INTEGER,
        created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Idempotent migrations for pause/resume, completion tracking, and AI evaluation
    await client.query(`ALTER TABLE interviews ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE`)
    await client.query(`ALTER TABLE interviews ADD COLUMN IF NOT EXISTS paused_duration INTEGER DEFAULT 0`)
    await client.query(`ALTER TABLE interviews ADD COLUMN IF NOT EXISTS questions_answered INTEGER DEFAULT 0`)
    await client.query(`ALTER TABLE interviews ADD COLUMN IF NOT EXISTS overall_feedback TEXT`)
    await client.query(`ALTER TABLE interviews ADD COLUMN IF NOT EXISTS strengths JSONB`)
    await client.query(`ALTER TABLE interviews ADD COLUMN IF NOT EXISTS weaknesses JSONB`)
    await client.query(`ALTER TABLE interviews ADD COLUMN IF NOT EXISTS recommendations JSONB`)
    await client.query(`ALTER TABLE interviews ADD COLUMN IF NOT EXISTS category_scores JSONB`)
    await client.query(`ALTER TABLE interviews ADD COLUMN IF NOT EXISTS hire_recommendation VARCHAR(50)`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS interview_questions (
        id                SERIAL PRIMARY KEY,
        interview_id      INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
        question          TEXT    NOT NULL,
        category          VARCHAR(100),
        question_type     VARCHAR(50),
        expected_language VARCHAR(50),
        difficulty        VARCHAR(20),
        expected_points   TEXT,
        sequence          INTEGER NOT NULL DEFAULT 1
      )
    `)

    await client.query(`ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(50)`)
    await client.query(`ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS expected_language VARCHAR(50)`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS interview_answers (
        id           SERIAL PRIMARY KEY,
        question_id  INTEGER NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
        answer       TEXT,
        time_taken   INTEGER,
        score        INTEGER,
        feedback     TEXT,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Ensure UNIQUE constraint on question_id exists.
    // CREATE TABLE IF NOT EXISTS does NOT alter an existing table, so if the table
    // was created before UNIQUE was added to the DDL, the constraint is missing.
    // This idempotent migration adds it only when needed.
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'interview_answers'::regclass
            AND contype = 'u'
            AND conkey @> ARRAY[(
              SELECT attnum FROM pg_attribute
              WHERE attrelid = 'interview_answers'::regclass
                AND attname = 'question_id'
            )]
        ) THEN
          ALTER TABLE interview_answers ADD CONSTRAINT interview_answers_question_id_key UNIQUE (question_id);
          RAISE NOTICE 'Added UNIQUE constraint on interview_answers.question_id';
        END IF;
      END $$
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS interview_recordings (
        id               SERIAL PRIMARY KEY,
        user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        interview_id     INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
        recording_type   VARCHAR(20) NOT NULL DEFAULT 'video',
        file_name        VARCHAR(512) NOT NULL,
        file_path        TEXT NOT NULL,
        mime_type        VARCHAR(100),
        file_size        BIGINT,
        start_time       TIMESTAMP WITH TIME ZONE,
        end_time         TIMESTAMP WITH TIME ZONE,
        duration_seconds INTEGER DEFAULT 0,
        created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Idempotent: add index for fast lookups by interview
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_interview_recordings_interview
        ON interview_recordings (interview_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_interview_recordings_user
        ON interview_recordings (user_id)
    `)
    // Idempotent: foreign key query path indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_resumes_user
        ON resumes (user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_resume_analyses_resume
        ON resume_analyses (resume_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_interviews_user
        ON interviews (user_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_interview_questions_interview
        ON interview_questions (interview_id)
    `)
    // Idempotent: prevent duplicate recording rows for same interview + type (upload retry guard)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = 'interview_recordings'
            AND indexname = 'idx_interview_recordings_dedup'
        ) THEN
          CREATE UNIQUE INDEX idx_interview_recordings_dedup
            ON interview_recordings (interview_id, recording_type);
        END IF;
      END $$
    `)

    await client.query('COMMIT')
    console.log('Database initialized — all tables ready')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = { pool, testConnection, initDatabase }
