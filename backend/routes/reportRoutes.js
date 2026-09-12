'use strict'

/**
 * reportRoutes.js — Module 9 Chunk 4
 *
 * Mounts at: /api/reports
 *
 * ALL routes require JWT authentication.
 * Role-specific access is enforced per-route.
 *
 * Routes:
 *   GET /api/reports/candidate          — own report (any authenticated user)
 *   GET /api/reports/candidate/:id      — recruiter/admin report for a candidate
 *   GET /api/reports/admin              — admin system report
 *
 * Query params:
 *   ?format=pdf  (default) — returns PDF stream
 *   ?format=csv            — returns CSV text/csv download
 */

const express = require('express')
const { param } = require('express-validator')
const router  = express.Router()
const { authenticate, authorize } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const ctrl = require('../controllers/reportController')

// All report routes require a valid JWT
router.use(authenticate)

// Candidate downloads their own report
router.get('/candidate', ctrl.getCandidateReport)

// Recruiter or Admin downloads a specific candidate's report
router.get(
  '/candidate/:id',
  authorize('RECRUITER', 'ADMIN'),
  [param('id').isInt({ min: 1 }).withMessage('Candidate ID must be a positive integer')],
  validate,
  ctrl.getCandidateReportById
)

// Admin system report
router.get('/admin', authorize('ADMIN'), ctrl.getAdminReport)

module.exports = router
