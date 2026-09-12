'use strict'

/**
 * adminRoutes.js — Module 8: Admin Dashboard (Requirements 16–20)
 *
 * Mounts at: /api/admin
 *
 * ALL routes require:
 *   1. authenticate  — valid JWT token
 *   2. authorize('ADMIN') — role must be ADMIN
 *
 * Routes:
 *   GET  /api/admin/stats                  — platform-wide counts
 *   GET  /api/admin/users                  — paginated user list (Req 16)
 *   PUT  /api/admin/users/:id/role         — change user role     (Req 16)
 *   PUT  /api/admin/users/:id/status       — block/unblock user   (Req 16)
 *   GET  /api/admin/interviews/activity    — interview monitoring  (Req 17)
 *   GET  /api/admin/ai-monitoring          — AI performance        (Req 18)
 *   GET  /api/admin/system-health          — system health         (Req 19)
 *   GET  /api/admin/usage-analytics        — platform usage        (Req 20)
 */

const express = require('express')
const { body, param } = require('express-validator')
const router  = express.Router()
const { authenticate, authorize } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const ctrl = require('../controllers/adminController')

// All admin routes require authentication AND ADMIN role
router.use(authenticate, authorize('ADMIN'))

// Platform-wide summary stats
router.get('/stats', ctrl.getAdminStats)

// User management (Req 16)
router.get('/users', ctrl.getUserList)

router.put(
  '/users/:id/role',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid user ID'),
    body('role')
      .notEmpty()
      .customSanitizer(v => (v ? String(v).toUpperCase() : v))
      .isIn(['USER', 'RECRUITER', 'ADMIN'])
      .withMessage('role must be USER, RECRUITER, or ADMIN'),
  ],
  validate,
  ctrl.updateUserRole
)

router.put(
  '/users/:id/status',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid user ID'),
    body('active').isBoolean().withMessage('active must be true or false'),
  ],
  validate,
  ctrl.toggleUserStatus
)

// Interview activity monitoring (Req 17)
router.get('/interviews/activity', ctrl.getInterviewActivity)

// AI performance monitoring (Req 18)
router.get('/ai-monitoring', ctrl.getAiMonitoring)

// System health reports (Req 19)
router.get('/system-health', ctrl.getSystemHealth)

// Platform usage analytics (Req 20)
router.get('/usage-analytics', ctrl.getUsageAnalytics)

// Admin broadcast notification (Module 9 Chunk 4)
router.post(
  '/notifications',
  [
    body('title')
      .isString().trim()
      .isLength({ min: 1, max: 120 }).withMessage('title must be 1–120 characters'),
    body('message')
      .isString().trim()
      .isLength({ min: 1, max: 600 }).withMessage('message must be 1–600 characters'),
    body('target')
      .isIn(['ALL_CANDIDATES', 'ALL_RECRUITERS', 'ALL_USERS'])
      .withMessage('target must be ALL_CANDIDATES, ALL_RECRUITERS, or ALL_USERS'),
  ],
  validate,
  ctrl.broadcastNotification
)

module.exports = router
