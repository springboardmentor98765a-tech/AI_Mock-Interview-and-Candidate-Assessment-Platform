const pool = require('../config/db');

// GET /api/notifications/me — notifications targeted at this user
// OR broadcast to their role, newest first.
async function listMyNotifications(req, res) {
  try {
    const { id, role } = req.user;
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1 OR role = $2
       ORDER BY created_at DESC
       LIMIT 10`,
      [id, role]
    );
    return res.status(200).json({ notifications: result.rows });
  } catch (err) {
    console.error('List notifications error:', err);
    return res.status(500).json({ message: 'Server error fetching notifications' });
  }
}

module.exports = { listMyNotifications };
