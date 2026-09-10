'use strict'

/**
 * analyticsRoutes.js — Module 8: Dashboard & Analytics
 *
 * Mounts at: /api/analytics
 *
 * Routes:
 *   GET /api/analytics/candidate   — authenticated candidate's own analytics
 *   GET /api/analytics/recruiter   — platform-wide analytics (RECRUITER/ADMIN only)
 *
 * Uses the same authenticate and authorize middleware as the rest of the API.
 * Does NOT touch or modify any existing interview / recording routes.
 */

const express = require('express')
const router  = express.Router()
const { authenticate, authorize } = require('../middleware/auth')
const ctrl = require('../controllers/analyticsController')

// Candidate: any authenticated user (reads only their own data)
router.get('/candidate', authenticate, ctrl.getCandidateAnalytics)

// Recruiter / Admin only
router.get('/recruiter', authenticate, authorize('RECRUITER', 'ADMIN'), ctrl.getRecruiterAnalytics)

module.exports = router
