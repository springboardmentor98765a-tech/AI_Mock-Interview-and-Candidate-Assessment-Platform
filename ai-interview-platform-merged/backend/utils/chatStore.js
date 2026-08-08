const pool = require('../config/db');

// Lazily creates the messages table on first use — same pattern as
// settingsStore.js — so existing installs don't need a manual migration.
let ensured = false;

async function ensureTable() {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id            SERIAL PRIMARY KEY,
      sender_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message       TEXT NOT NULL,
      read_at       TIMESTAMP,
      created_at    TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages (sender_id, receiver_id, created_at)`);
  ensured = true;
}

module.exports = { ensureTable };
