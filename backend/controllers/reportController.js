'use strict'

/**
 * reportController.js — Module 9 Chunk 4
 *
 * Thin HTTP controller for /api/reports endpoints.
 * All authorization is enforced here (not delegated to client).
 * All data assembly is delegated to reportService.js.
 *
 * ROUTES
 * ──────
 * GET /api/reports/candidate          — own report (CANDIDATE/USER)
 * GET /api/reports/candidate/:id      — specific candidate (RECRUITER/ADMIN)
 * GET /api/reports/admin              — system report (ADMIN)
 *
 * QUERY PARAMS
 * ─────────────
 * ?format=csv   → CSV text/csv download
 * ?format=pdf   → PDF application/pdf stream (default)
 */

const reportService = require('../services/reportService')

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function handleError(res, err) {
  const status  = err.status || 500
  const message = err.message || 'Report generation failed'
  if (status >= 500) console.error('[reportController]', err)
  return res.status(status).json({ success: false, message })
}

function getFormat(req) {
  const fmt = String(req.query.format || 'pdf').toLowerCase()
  return fmt === 'csv' ? 'csv' : 'pdf'
}

/* ─── GET /api/reports/candidate ─────────────────────────────────────────────── */

/**
 * Candidate downloads their own performance report.
 * req.user.id is the candidate — the service enforces ownership.
 */
async function getCandidateReport(req, res) {
  try {
    const format = getFormat(req)
    const data   = await reportService.getCandidateReportData(req.user.id)

    if (format === 'csv') {
      const csv = reportService.buildCandidateCsv(data)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="my-performance-report-${Date.now()}.csv"`)
      return res.send(csv)
    }

    // PDF streams directly (no return needed after pipe)
    reportService.buildCandidatePdf(data, res)
  } catch (err) {
    return handleError(res, err)
  }
}

/* ─── GET /api/reports/candidate/:id ────────────────────────────────────────── */

/**
 * Recruiter or Admin downloads a specific candidate's report.
 * Authorization enforced inside reportService.getRecruiterCandidateReportData:
 *   - Recruiter must have a recording or schedule link to this candidate.
 *   - Admin bypasses that check.
 */
async function getCandidateReportById(req, res) {
  try {
    const candidateId = parseInt(req.params.id, 10)
    if (!Number.isInteger(candidateId) || candidateId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid candidate ID' })
    }

    const role   = req.user.role?.toUpperCase()
    const format = getFormat(req)

    let data
    if (role === 'ADMIN') {
      // Admin can access any candidate
      data = await reportService.getCandidateReportData(candidateId)
    } else {
      // Recruiter: must be authorized for this candidate
      data = await reportService.getRecruiterCandidateReportData(candidateId, req.user.id)
    }

    if (format === 'csv') {
      const csv = reportService.buildCandidateCsv(data)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="candidate-report-${candidateId}-${Date.now()}.csv"`)
      return res.send(csv)
    }

    reportService.buildCandidatePdf(data, res)
  } catch (err) {
    return handleError(res, err)
  }
}

/* ─── GET /api/reports/admin ─────────────────────────────────────────────────── */

/**
 * Admin downloads platform-wide system/activity report.
 */
async function getAdminReport(req, res) {
  try {
    const format = getFormat(req)
    const data   = await reportService.getAdminReportData()

    if (format === 'csv') {
      const csv = reportService.buildAdminCsv(data)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="admin-system-report-${Date.now()}.csv"`)
      return res.send(csv)
    }

    reportService.buildAdminPdf(data, res)
  } catch (err) {
    return handleError(res, err)
  }
}

module.exports = {
  getCandidateReport,
  getCandidateReportById,
  getAdminReport,
}
