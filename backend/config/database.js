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

    await client.query('COMMIT')
    console.log('Database initialized — provider constraint updated to include GITHUB')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = { pool, testConnection, initDatabase }
