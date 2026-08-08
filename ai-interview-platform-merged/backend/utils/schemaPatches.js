const pool = require('../config/db');

// Idempotent ALTERs for columns added after the original schema.sql was
// written, so existing installs pick them up automatically — just
// restart the server, no manual migration needed. Safe to run every
// startup (IF NOT EXISTS makes each statement a no-op after the first).
async function applySchemaPatches() {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`);
  } catch (err) {
    console.error('Schema patch failed (users.profile_picture / bio):', err.message);
  }
}

module.exports = { applySchemaPatches };
