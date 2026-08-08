const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const authenticateJWT = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const profileCtrl = require('../controllers/profileController');

// PATCH /api/users/me — any authenticated role updates their own profile
router.patch('/me', authenticateJWT, async (req, res) => {
  try {
    const { fullName, mobile, bio } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;

    if (typeof fullName === 'string' && fullName.trim()) {
      fields.push(`full_name = $${idx++}`);
      values.push(fullName.trim());
    }
    if (typeof mobile === 'string') {
      fields.push(`mobile = $${idx++}`);
      values.push(mobile.trim());
    }
    if (typeof bio === 'string') {
      fields.push(`bio = $${idx++}`);
      values.push(bio.trim().slice(0, 500)); // keep bios short — this is a summary, not a resume
    }
    if (fields.length === 0) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    values.push(req.user.id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}
       RETURNING id, full_name, email, mobile, role, is_active, auth_provider, profile_picture, bio, created_at`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'Profile updated', user: result.rows[0] });
  } catch (err) {
    console.error('Update own profile error:', err);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// POST /api/users/me/avatar — any authenticated role changes their own photo
router.post(
  '/me/avatar',
  authenticateJWT,
  profileCtrl.uploadMiddleware,
  profileCtrl.uploadAvatar
);

// GET /api/users  — Admin only: list all registered users (feeds admin.html table)
router.get('/', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, mobile, role, is_active, auth_provider, profile_picture, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.status(200).json({ users: result.rows });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// PATCH /api/users/:id/status — Admin only: activate/deactivate a user
router.patch('/:id/status', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const result = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, full_name, is_active',
      [Boolean(isActive), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'Status updated', user: result.rows[0] });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ message: 'Server error updating status' });
  }
});

module.exports = router;
