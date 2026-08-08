const express = require('express');
const passport = require('passport');
const router = express.Router();

const { register, login, googleCallback, getCurrentUser, changePassword } = require('../controllers/authController');
const authenticateJWT = require('../middleware/authMiddleware');

// -------------------- Local (JWT) auth --------------------
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateJWT, getCurrentUser);
router.patch('/change-password', authenticateJWT, changePassword);

// -------------------- Google OAuth --------------------
// Step 1: frontend redirects the browser here.
// ?state=<role> lets the frontend tell us which role a NEW
// Google sign-up should get (candidate/recruiter/coach only —
// admin accounts can never be created via OAuth).
router.get(
  '/google',
  (req, res, next) => {
    const allowedState = ['candidate', 'recruiter', 'coach'].includes(req.query.role)
      ? req.query.role
      : 'candidate';
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      state: allowedState,
    })(req, res, next);
  }
);

// Step 2: Google redirects back here.
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login.html' }),
  googleCallback
);

module.exports = router;
