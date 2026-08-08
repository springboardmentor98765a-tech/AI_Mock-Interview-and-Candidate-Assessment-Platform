const pool = require('../config/db');

/**
 * Creates a notification. Pass either a userId (targets one person)
 * or a role (broadcasts to everyone with that role's dashboard feed).
 */
async function notify({ userId = null, role = null, title, message }) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, role, title, message)
       VALUES ($1, $2, $3, $4)`,
      [userId, role, title, message]
    );
  } catch (err) {
    // Notifications are best-effort — never let a failure here
    // break the calling request (interview creation, etc.).
    console.error('notify() failed:', err.message);
  }
}

module.exports = { notify };
