const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { getSetting } = require('../utils/settingsStore');
const { notify } = require('../utils/notify');
require('dotenv').config();

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    authProvider: user.auth_provider,
    isActive: user.is_active,
    profilePicture: user.profile_picture || null,
    bio: user.bio || '',
  };
}

// ---------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------
async function register(req, res) {
  try {
    const { fullName, email, mobile, password, confirmPassword, role } = req.body;

    if (!fullName || !email || !password || !confirmPassword || !role) {
      return res.status(400).json({ message: 'All required fields must be filled' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!['candidate', 'recruiter', 'coach', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    // Admin's own "Allow new registrations" toggle in System Settings.
    // Admin accounts are exempt so a locked-out admin can't lock themselves
    // out entirely (e.g. seeding a second admin account).
    if (role !== 'admin') {
      const allowRegistrations = await getSetting('allow_registrations');
      if (allowRegistrations === 'false') {
        return res.status(403).json({
          message: 'New registrations are currently disabled by the platform administrator. Please try again later.',
        });
      }
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, mobile, password, role, auth_provider)
       VALUES ($1, $2, $3, $4, $5, 'local')
       RETURNING *`,
      [fullName, email, mobile || null, hashedPassword, role]
    );

    const user = result.rows[0];
    const token = signToken(user);

    await notify({
      role: 'admin',
      title: 'New User Joined',
      message: `${user.full_name} (${user.email}) just signed up as a ${user.role}.`,
    });

    // Recruiters and coaches specifically care about new candidates —
    // they're who works with them day to day, so give them the heads-up
    // directly instead of only the admin seeing it.
    if (user.role === 'candidate') {
      await notify({
        role: 'recruiter',
        title: 'New Candidate Joined',
        message: `${user.full_name} (${user.email}) just registered as a candidate.`,
      });
      await notify({
        role: 'coach',
        title: 'New Candidate Joined',
        message: `${user.full_name} (${user.email}) just registered as a candidate.`,
      });
    }

    return res.status(201).json({ message: 'Registration successful', token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error during registration' });
  }
}

// ---------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (user.auth_provider !== 'local' || !user.password) {
      return res.status(400).json({
        message: `This account uses ${user.auth_provider} sign-in. Please use "Login with Google" instead.`,
      });
    }
    if (!user.is_active) {
      return res.status(403).json({ message: 'This account has been deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user);
    return res.status(200).json({ message: 'Login successful', token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
}

// ---------------------------------------------------------------
// GET /api/auth/google/callback  (invoked by Passport after Google auth)
// Issues our own JWT and redirects back to the frontend with it.
// ---------------------------------------------------------------
async function googleCallback(req, res) {
  try {
    const user = req.user; // populated by passport's GoogleStrategy
    const token = signToken(user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';

    // Redirect to a small frontend page that stores the token
    // and routes the user to the correct dashboard.
    return res.redirect(
      `${frontendUrl}/oauth-callback?token=${token}&role=${user.role}&name=${encodeURIComponent(
        user.full_name
      )}`
    );
  } catch (err) {
    console.error('Google callback error:', err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
    return res.redirect(`${frontendUrl}/login.html?error=oauth_failed`);
  }
}

// ---------------------------------------------------------------
// GET /api/auth/me  (protected — requires valid JWT)
// ---------------------------------------------------------------
async function getCurrentUser(req, res) {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('Get current user error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.auth_provider !== 'local' || !user.password) {
      return res.status(400).json({ message: `This account signs in with ${user.auth_provider} — there's no password to change.` });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashed, user.id]);

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ message: 'Server error changing password' });
  }
}

module.exports = { register, login, googleCallback, getCurrentUser, changePassword };