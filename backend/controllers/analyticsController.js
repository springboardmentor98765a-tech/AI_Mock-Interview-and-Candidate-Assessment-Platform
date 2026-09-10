'use strict'

/**
 * analyticsController.js — Module 8: Dashboard & Analytics
 *
 * Thin HTTP controller layer that delegates to analyticsService.js.
 * Handles authentication context, input validation, and error formatting.
 * No business logic lives here — all aggregation is in analyticsService.
 */

const analyticsService = require('../services/analyticsService')

/* ─── GET /api/analytics/candidate ──────────────────────────────────────────
   Returns comprehensive analytics for the authenticated candidate.
   Authorization: any authenticated user (reads only their own data).
─────────────────────────────────────────────────────────────────────────── */
async function getCandidateAnalytics(req, res) {
  try {
    const userId = req.user.id

    const analytics = await analyticsService.getCandidateAnalytics(userId)

    return res.status(200).json(analytics)
  } catch (err) {
    console.error('[analyticsController.getCandidateAnalytics]', err.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to load candidate analytics',
    })
  }
}

/* ─── GET /api/analytics/recruiter ──────────────────────────────────────────
   Returns platform-wide analytics for RECRUITER / ADMIN roles:
   - weekly interview trend (real DB completions)
   - score distribution
   - category averages
   - merit-ordered candidate rankings
   Authorization: RECRUITER or ADMIN (enforced in the router via authorize()).
─────────────────────────────────────────────────────────────────────────── */
async function getRecruiterAnalytics(req, res) {
  try {
    const analytics = await analyticsService.getRecruiterAnalytics()

    return res.status(200).json(analytics)
  } catch (err) {
    console.error('[analyticsController.getRecruiterAnalytics]', err.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to load recruiter analytics',
    })
  }
}

module.exports = {
  getCandidateAnalytics,
  getRecruiterAnalytics,
}
