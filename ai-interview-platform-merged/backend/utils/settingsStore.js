const pool = require('../config/db');

// Simple key/value platform settings, backing the admin "System Settings"
// panel. The table is created lazily on first use so existing installs
// don't need a manual migration — just restart the server.
const DEFAULTS = {
  allow_registrations: 'true',
  maintenance_mode: 'false',
};

let ensured = false;

async function ensureTable() {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key         VARCHAR(100) PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  for (const [key, value] of Object.entries(DEFAULTS)) {
    await pool.query(
      `INSERT INTO platform_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [key, value]
    );
  }
  ensured = true;
}

async function getAllSettings() {
  await ensureTable();
  const result = await pool.query('SELECT key, value FROM platform_settings');
  const out = { ...DEFAULTS };
  for (const row of result.rows) out[row.key] = row.value;
  return out;
}

async function getSetting(key) {
  const all = await getAllSettings();
  return all[key];
}

async function setSetting(key, value) {
  await ensureTable();
  await pool.query(
    `INSERT INTO platform_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, String(value)]
  );
}

module.exports = { getAllSettings, getSetting, setSetting, DEFAULTS };
