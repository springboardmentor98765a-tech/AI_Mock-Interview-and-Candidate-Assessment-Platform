'use strict'

const express  = require('express')
const router   = express.Router()
const { authenticate, authorize } = require('../middleware/auth')
const ctrl     = require('../controllers/cvController')

// ── Live candidate interview endpoints (Authenticated candidate / any role) ─

// Live single-frame analysis (base64 image from candidate webcam preview)
router.post(
  '/frame',
  authenticate,
  ctrl.analyzeLiveFrame
)

// Live interview compliance summary (warnings count, events log, avg visibility)
router.post(
  '/:interviewId/live-summary',
  authenticate,
  ctrl.saveLiveSummary
)

// ── Recruiter & Admin assessment endpoints ──────────────────────────────────
// Candidates must not receive post-interview behavioral analysis results.

// Full analysis result
router.get(
  '/:interviewId',
  authenticate,
  authorize('RECRUITER', 'ADMIN'),
  ctrl.getResult
)

// Lightweight status poll (pending / processing / completed / error)
router.get(
  '/:interviewId/status',
  authenticate,
  authorize('RECRUITER', 'ADMIN'),
  ctrl.getStatus
)

// Manual re-trigger (returns 202, runs async)
router.post(
  '/:interviewId/trigger',
  authenticate,
  authorize('RECRUITER', 'ADMIN'),
  ctrl.trigger
)

module.exports = router

