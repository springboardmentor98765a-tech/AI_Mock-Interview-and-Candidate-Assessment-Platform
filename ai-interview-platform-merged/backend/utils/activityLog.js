const pool = require('../config/db');

/**
 * Append-only, best-effort activity log for Module 1's admin "Monitor
 * system activities". Never throws — a logging failure should never
 * break the actual request it's describing.
 *
 * @param {Object} params
 * @param {number|null} params.userId - actor's user id, or null for system/anonymous events
 * @param {string|null} params.role - actor's role at the time of the action
 * @param {string} params.action - short machine-readable action name, e.g. "user_registered"
 * @param {string} [params.details] - human-readable one-liner shown in the admin UI
 */
async function logActivity({ userId = null, role = null, action, details = '' }) {
  try {
    await pool.query(
      'INSERT INTO activity_log (actor_user_id, actor_role, action, details) VALUES ($1, $2, $3, $4)',
      [userId, role, action, details]
    );
  } catch (err) {
    console.error('Activity log write failed (non-fatal):', err.message);
  }
}

module.exports = { logActivity };
