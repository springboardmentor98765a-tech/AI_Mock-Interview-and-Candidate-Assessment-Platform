const express  = require('express')
const { body } = require('express-validator')
const passport = require('../config/passport')
const {
  register, login, getProfile, updateProfile,
  changePassword, logout, googleCallback, githubCallback,
} = require('../controllers/authController')
const { authenticate } = require('../middleware/auth')
const { validate }     = require('../middleware/validate')

const router = express.Router()

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role')
      .optional()
      .customSanitizer(v => (v ? v.toUpperCase() : v))
      .isIn(['ADMIN', 'RECRUITER', 'USER'])
      .withMessage('Invalid role — must be ADMIN, RECRUITER, or USER'),
  ],
  validate,
  register
)

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
)

router.get('/profile', authenticate, getProfile)

router.put(
  '/profile',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  ],
  validate,
  updateProfile
)

router.put(
  '/password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  validate,
  changePassword
)

router.post('/logout', authenticate, logout)

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
)

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`,
    session: false,
  }),
  googleCallback
)

router.get(
  '/github',
  passport.authenticate('github', { scope: ['user:email'], session: false })
)

router.get(
  '/github/callback',
  passport.authenticate('github', {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`,
    session: false,
  }),
  githubCallback
)

module.exports = router
