'use strict'

/**
 * reportService.js — Module 9 Chunk 4: Downloadable Reports
 *
 * Assembles report data from the existing Module 7/8 analytics services.
 * Does NOT reimplement any scoring logic. All scores and analytics come from
 * the canonical analyticsService.getCandidateAnalytics() and adminService.*.
 *
 * PUBLIC API
 * ──────────
 * getCandidateReportData(candidateId)               → Report data object
 * getRecruiterCandidateReportData(candidateId, recruiterId) → Report data (RBAC)
 * getAdminReportData()                               → Platform-level report data
 * buildCsv(rows, columns)                            → Promise<string>  (CSV)
 * buildCandidateCsv(reportData)                      → Promise<string>
 * buildCandidatePdf(reportData, res)                 → void (streams to res)
 * buildAdminCsv(reportData)                          → Promise<string>
 * buildAdminPdf(reportData, res)                     → void (streams to res)
 *
 * SECURITY
 * ────────
 * • candidateId is always validated as integer ≥ 1.
 * • getCandidateReportData enforces user_id match.
 * • getRecruiterCandidateReportData enforces the recruiter has an interview
 *   result for that candidate (i.e., they recorded them via the platform).
 * • No passwords, tokens, SMTP secrets, or raw session data are included.
 */

const analyticsService = require('./analyticsService')
const adminService     = require('./adminService')
const { pool }         = require('../config/database')
const PDFDocument      = require('pdfkit')
const { stringify }    = require('csv-stringify/sync')

/* ─── Validation helpers ─────────────────────────────────────────────────────── */

function requirePositiveInt(value, label) {
  const n = parseInt(value, 10)
  if (!Number.isInteger(n) || n < 1) {
    throw Object.assign(new Error(`${label} must be a positive integer`), { status: 400 })
  }
  return n
}

/* ─── Date formatting (UTC) ──────────────────────────────────────────────────── */

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function nowUtcLabel() {
  return new Date().toLocaleString('en-GB', {
    timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }) + ' UTC'
}

/* ─── CSV builder ────────────────────────────────────────────────────────────── */

/**
 * Build a CSV string from an array of row objects and a columns spec.
 * @param {object[]} rows
 * @param {{ header: string, key: string }[]} columns
 * @returns {string}
 */
function buildCsv(rows, columns) {
  const headers = columns.map(c => c.header)
  const data    = rows.map(row => columns.map(c => row[c.key] ?? ''))
  return stringify([headers, ...data])
}

/* ─── Candidate report data ──────────────────────────────────────────────────── */

/**
 * Assemble full candidate performance report data.
 * candidateId must match the requesting user (enforced in controller).
 */
async function getCandidateReportData(candidateId) {
  const uid = requirePositiveInt(candidateId, 'candidateId')

  // Fetch user identity (name, email — never password)
  const userRes = await pool.query(
    `SELECT name, email, created_at FROM users WHERE id = $1`,
    [uid]
  )
  if (!userRes.rows[0]) {
    throw Object.assign(new Error('Candidate not found'), { status: 404 })
  }
  const user = userRes.rows[0]

  // All analytics via canonical analyticsService (uses Module 7 scores, no re-computation)
  const analytics = await analyticsService.getCandidateAnalytics(uid)

  const resumeSkills = await analyticsService.getCandidateResumeSkills(uid)

  return {
    generatedAt:    nowUtcLabel(),
    candidate: {
      name:      user.name,
      email:     user.email,
      memberSince: fmtDate(user.created_at),
    },
    summary: {
      // Read from analytics.summary (getCandidateAnalytics nests stats under .summary)
      totalInterviews:     analytics.summary?.totalInterviews  ?? 0,
      completedInterviews: analytics.summary?.totalInterviews  ?? 0,  // all fetched rows are completed
      averageScore:        analytics.summary?.averageScore     ?? null,
      bestScore:           analytics.summary?.highestScore     ?? null, // analyticsService uses highestScore
      latestRole:          analytics.summary?.latestRole       ?? null,
    },
    categoryAverages: analytics.categoryAverages ?? null,
    weakAreas:        analytics.weakAreaPrediction?.weakAreas ?? [],
    weakAreaStatus:   analytics.weakAreaPrediction?.status    ?? 'no_data',
    improvementProgress: analytics.improvementProgress ?? null,
    performanceTrend: analytics.trends ?? [],  // analyticsService returns .trends not .performanceTrend
    // analyticsService returns .trends (full per-interview data with all category scores)
    interviewHistory: (analytics.trends ?? []).map(iv => ({
      date:               fmtDate(iv.completedAt),
      role:               iv.role              ?? '—',
      type:               iv.difficulty        ?? '—',  // interviewType not in trends; use difficulty
      difficulty:         iv.difficulty        ?? '—',
      overallScore:       iv.overallScore      ?? null,
      communication:      iv.communication     ?? null,
      confidence:         iv.confidence        ?? null,
      technicalRelevance: iv.technicalRelevance ?? null,
      professionalism:    iv.professionalism   ?? null,
      hireRecommendation: iv.hireRecommendation ?? '—',
      performanceRating:  iv.performanceRating  ?? '—',
    })),
    resumeSkills: resumeSkills ?? [],
  }
}

/* ─── Recruiter → candidate report data ─────────────────────────────────────── */

/**
 * Recruiter can only access a candidate they have recorded via the platform
 * (i.e., there is at least one recording.recruiter_id = recruiterId for that candidate).
 * Falls back gracefully if the recordings table link is absent.
 */
async function getRecruiterCandidateReportData(candidateId, recruiterId) {
  const cid = requirePositiveInt(candidateId, 'candidateId')
  const rid = requirePositiveInt(recruiterId, 'recruiterId')

  // Authorization check: recruiter must have a scheduled_interview with this candidate.
  // NOTE: the `recordings` table does not exist in this schema (only `interview_recordings`,
  // which has no recruiter_id column). Using scheduled_interviews as the authoritative link.
  const schedCheck = await pool.query(
    `SELECT 1 FROM scheduled_interviews
     WHERE candidate_id = $1 AND recruiter_id = $2
     LIMIT 1`,
    [cid, rid]
  )
  const authorized = schedCheck.rows.length > 0

  if (!authorized) {
    throw Object.assign(
      new Error('You are not authorized to view this candidate\'s report'),
      { status: 403 }
    )
  }

  // Reuse the same data assembly (candidate-scoped analytics)
  const data = await getCandidateReportData(cid)

  // Add ranking data from recruiter analytics if available
  const recruiterAnalytics = await analyticsService.getRecruiterAnalytics(rid)
  const candidateRanking = (recruiterAnalytics?.candidateRankings ?? [])
    .find(r => r.candidateId === cid || r.userId === cid)

  return { ...data, ranking: candidateRanking ?? null }
}

/* ─── Admin report data ──────────────────────────────────────────────────────── */

async function getAdminReportData() {
  const [stats, activity, aiMonitoring, health, usage] = await Promise.allSettled([
    adminService.getAdminStats(),
    adminService.getInterviewActivity(),
    adminService.getAiMonitoring(),
    adminService.getSystemHealth(),
    adminService.getUsageAnalytics(),
  ])

  function unwrap(result, label) {
    if (result.status === 'fulfilled') return result.value
    console.warn(`[reportService] admin data ${label} failed:`, result.reason?.message)
    return null
  }

  return {
    generatedAt: nowUtcLabel(),
    stats:       unwrap(stats,        'stats'),
    activity:    unwrap(activity,     'activity'),
    aiMonitoring: unwrap(aiMonitoring, 'aiMonitoring'),
    health:      unwrap(health,       'health'),
    usage:       unwrap(usage,        'usage'),
  }
}

/* ─── CSV builders ───────────────────────────────────────────────────────────── */

function buildCandidateCsv(data) {
  const sections = []

  // Summary
  sections.push('=== Candidate Performance Report ===')
  sections.push(`Generated: ${data.generatedAt}`)
  sections.push(`Candidate: ${data.candidate.name}`)
  sections.push(`Member Since: ${data.candidate.memberSince}`)
  sections.push('')

  // Summary stats
  sections.push(buildCsv([{
    totalInterviews:     data.summary.totalInterviews,
    completedInterviews: data.summary.completedInterviews,
    averageScore:        data.summary.averageScore ?? 'N/A',
    bestScore:           data.summary.bestScore    ?? 'N/A',
    latestRole:          data.summary.latestRole   ?? 'N/A',
  }], [
    { header: 'Total Interviews',     key: 'totalInterviews'     },
    { header: 'Completed Interviews', key: 'completedInterviews' },
    { header: 'Average Score',        key: 'averageScore'        },
    { header: 'Best Score',           key: 'bestScore'           },
    { header: 'Latest Role',          key: 'latestRole'          },
  ]))

  sections.push('')
  sections.push('=== Category Averages (Module 7 — 0..100) ===')
  if (data.categoryAverages) {
    const cats = data.categoryAverages
    sections.push(buildCsv([{
      communication:      cats.communication      ?? 'N/A',
      confidence:         cats.confidence         ?? 'N/A',
      technicalRelevance: cats.technicalRelevance ?? 'N/A',
      professionalism:    cats.professionalism    ?? 'N/A',
    }], [
      { header: 'Communication (30%)',        key: 'communication'      },
      { header: 'Confidence (25%)',           key: 'confidence'         },
      { header: 'Technical Relevance (30%)',  key: 'technicalRelevance' },
      { header: 'Professionalism (15%)',      key: 'professionalism'    },
    ]))
  } else {
    sections.push('No category data available (requires at least one completed interview).')
  }

  sections.push('')
  sections.push('=== Interview History ===')
  if (data.interviewHistory.length > 0) {
    sections.push(buildCsv(data.interviewHistory, [
      { header: 'Date',                key: 'date'               },
      { header: 'Role',                key: 'role'               },
      { header: 'Type',                key: 'type'               },
      { header: 'Difficulty',          key: 'difficulty'         },
      { header: 'Overall Score',       key: 'overallScore'       },
      { header: 'Communication',       key: 'communication'      },
      { header: 'Confidence',          key: 'confidence'         },
      { header: 'Technical Relevance', key: 'technicalRelevance' },
      { header: 'Professionalism',     key: 'professionalism'    },
      { header: 'Performance Rating',  key: 'performanceRating'  },
      { header: 'Hire Recommendation', key: 'hireRecommendation' },
    ]))
  } else {
    sections.push('No completed interview history.')
  }

  sections.push('')
  sections.push('=== Weak Areas ===')
  if (data.weakAreas.length > 0) {
    sections.push(buildCsv(data.weakAreas.map(w => ({
      category:     w.category         ?? '—',
      riskLevel:    w.riskLevel        ?? '—',
      averageScore: w.averageScore     ?? '—',
      trend:        w.trend            ?? '—',
    })), [
      { header: 'Category',     key: 'category'     },
      { header: 'Risk Level',   key: 'riskLevel'    },
      { header: 'Avg Score',    key: 'averageScore' },
      { header: 'Trend',        key: 'trend'        },
    ]))
  } else {
    sections.push('No weak areas detected.')
  }

  return sections.join('\n')
}

function buildAdminCsv(data) {
  const sections = []
  sections.push('=== HireAI Platform System Report ===')
  sections.push(`Generated: ${data.generatedAt}`)
  sections.push('')

  if (data.stats) {
    sections.push('=== Platform Statistics ===')
    const s = data.stats
    sections.push(buildCsv([{
      totalUsers:      s.totalUsers      ?? 0,
      candidates:      s.candidates      ?? 0,
      recruiters:      s.recruiters      ?? 0,
      admins:          s.admins          ?? 0,
      totalInterviews: s.totalInterviews ?? 0,
      completedInterviews: s.completedInterviews ?? 0,
    }], [
      { header: 'Total Users',          key: 'totalUsers'          },
      { header: 'Candidates',           key: 'candidates'          },
      { header: 'Recruiters',           key: 'recruiters'          },
      { header: 'Admins',               key: 'admins'              },
      { header: 'Total Interviews',     key: 'totalInterviews'     },
      { header: 'Completed Interviews', key: 'completedInterviews' },
    ]))
  }

  if (data.activity?.recentInterviews?.length) {
    sections.push('')
    sections.push('=== Recent Interview Activity ===')
    sections.push(buildCsv(data.activity.recentInterviews.map(r => ({
      date:   fmtDate(r.completedAt || r.completed_at),
      role:   r.selectedRole || r.selected_role || '—',
      score:  r.score ?? '—',
      status: r.status || '—',
    })), [
      { header: 'Date',  key: 'date'  },
      { header: 'Role',  key: 'role'  },
      { header: 'Score', key: 'score' },
      { header: 'Status',key: 'status'},
    ]))
  }

  return sections.join('\n')
}

/* ─── PDF builders ───────────────────────────────────────────────────────────── */

const PDF_FONT      = 'Helvetica'
const PDF_FONT_BOLD = 'Helvetica-Bold'
const PDF_COLOR     = '#1e293b'
const PDF_MUTED     = '#64748b'
const PDF_ACCENT    = '#6366f1'
const PDF_LINE      = '#e2e8f0'

function pdfSection(doc, title) {
  if (doc.y > 680) doc.addPage()
  doc.moveDown(0.5)
  doc.rect(doc.page.margins.left, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 22)
    .fill('#f1f5f9')
  doc.fillColor(PDF_ACCENT).font(PDF_FONT_BOLD).fontSize(11)
    .text(title, doc.page.margins.left + 8, doc.y - 18, { lineBreak: false })
  doc.moveDown(1.4).fillColor(PDF_COLOR).font(PDF_FONT).fontSize(10)
}

function pdfKV(doc, label, value, { inline = true } = {}) {
  doc.font(PDF_FONT_BOLD).fillColor(PDF_MUTED).fontSize(9).text(label + ':', { continued: inline })
  doc.font(PDF_FONT).fillColor(PDF_COLOR).fontSize(9).text(' ' + (value ?? '—'), inline ? { continued: false } : {})
  if (!inline) doc.moveDown(0.3)
}

function pdfTable(doc, columns, rows) {
  const margin = doc.page.margins.left
  const width  = doc.page.width - margin - doc.page.margins.right
  const colW   = width / columns.length

  // Header
  doc.rect(margin, doc.y, width, 18).fill('#e0e7ff')
  columns.forEach((col, i) => {
    doc.fillColor('#1e3a8a').font(PDF_FONT_BOLD).fontSize(8)
      .text(col, margin + i * colW + 4, doc.y - 14, { width: colW - 8, lineBreak: false })
  })
  doc.moveDown(1.1).strokeColor(PDF_LINE)

  rows.forEach((row, ri) => {
    if (doc.y > 720) { doc.addPage(); pdfTable(doc, columns, rows.slice(ri)); return }
    const bg = ri % 2 === 0 ? '#ffffff' : '#f8fafc'
    doc.rect(margin, doc.y, width, 16).fill(bg)
    row.forEach((cell, i) => {
      doc.fillColor(PDF_COLOR).font(PDF_FONT).fontSize(8)
        .text(String(cell ?? '—'), margin + i * colW + 4, doc.y - 12, { width: colW - 8, lineBreak: false })
    })
    doc.moveDown(1)
  })
  doc.moveDown(0.5)
}

function buildCandidatePdf(data, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true })

  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="candidate-report-${Date.now()}.pdf"`)
  }
  doc.pipe(res)

  // ── Cover ────────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 120).fill(PDF_ACCENT)
  doc.fillColor('#ffffff').font(PDF_FONT_BOLD).fontSize(22)
    .text('HireAI', 50, 35)
  doc.fontSize(13).text('Candidate Performance Report', 50, 62)
  doc.font(PDF_FONT).fontSize(9)
    .text(`Generated: ${data.generatedAt}`, 50, 85)
  doc.fillColor(PDF_COLOR).moveDown(4)

  // ── Candidate identity ───────────────────────────────────────────────────
  pdfSection(doc, 'Candidate Information')
  pdfKV(doc, 'Name',         data.candidate.name)
  pdfKV(doc, 'Email',        data.candidate.email)
  pdfKV(doc, 'Member Since', data.candidate.memberSince)

  // ── Summary ──────────────────────────────────────────────────────────────
  pdfSection(doc, 'Performance Summary')
  const s = data.summary
  pdfKV(doc, 'Total Interviews',     s.totalInterviews)
  pdfKV(doc, 'Completed Interviews', s.completedInterviews)
  pdfKV(doc, 'Average Score',        s.averageScore != null ? `${s.averageScore}/100` : 'N/A')
  pdfKV(doc, 'Best Score',           s.bestScore    != null ? `${s.bestScore}/100`    : 'N/A')
  pdfKV(doc, 'Latest Role',          s.latestRole ?? 'N/A')

  // ── Category averages ────────────────────────────────────────────────────
  pdfSection(doc, 'Category Averages  (Module 7 Scoring — 0 to 100)')
  if (data.categoryAverages) {
    const cats = data.categoryAverages
    doc.font(PDF_FONT).fontSize(9).fillColor(PDF_MUTED)
      .text('Weights: Communication 30% · Confidence 25% · Technical Relevance 30% · Professionalism 15%')
    doc.moveDown(0.4)
    pdfTable(doc,
      ['Category', 'Weight', 'Average Score'],
      [
        ['Communication',      '30%', cats.communication      ?? 'N/A'],
        ['Confidence',         '25%', cats.confidence         ?? 'N/A'],
        ['Technical Relevance','30%', cats.technicalRelevance ?? 'N/A'],
        ['Professionalism',    '15%', cats.professionalism    ?? 'N/A'],
      ]
    )
  } else {
    doc.fillColor(PDF_MUTED).text('No category data — requires at least one completed interview.').moveDown()
  }

  // ── Interview history ────────────────────────────────────────────────────
  pdfSection(doc, 'Interview History')
  if (data.interviewHistory.length > 0) {
    pdfTable(doc,
      ['Date', 'Role', 'Type', 'Score', 'Comm', 'Conf', 'Tech', 'Prof', 'Rating'],
      data.interviewHistory.map(iv => [
        iv.date, iv.role, iv.type,
        iv.overallScore ?? '—',
        iv.communication ?? '—', iv.confidence ?? '—',
        iv.technicalRelevance ?? '—', iv.professionalism ?? '—',
        iv.performanceRating,
      ])
    )
  } else {
    doc.fillColor(PDF_MUTED).text('No completed interview history.').moveDown()
  }

  // ── Weak areas ───────────────────────────────────────────────────────────
  pdfSection(doc, 'Weak Area Analysis')
  if (data.weakAreas.length > 0) {
    pdfTable(doc,
      ['Category', 'Risk Level', 'Avg Score', 'Trend'],
      data.weakAreas.map(w => [
        w.category ?? '—', w.riskLevel ?? '—', w.averageScore ?? '—', w.trend ?? '—',
      ])
    )

    // Recommendations
    doc.moveDown(0.5).font(PDF_FONT_BOLD).fontSize(9).fillColor(PDF_MUTED).text('Top Recommendations:')
    doc.moveDown(0.3)
    data.weakAreas.slice(0, 3).forEach(w => {
      if (w.recommendations?.length) {
        doc.font(PDF_FONT_BOLD).fillColor(PDF_COLOR).fontSize(9).text(`${w.category}:`)
        w.recommendations.slice(0, 2).forEach(r => {
          doc.font(PDF_FONT).fontSize(8).fillColor(PDF_COLOR).text(`  • ${r}`, { indent: 10 })
        })
      }
    })
  } else {
    doc.fillColor(PDF_MUTED).fontSize(9).text(`Status: ${data.weakAreaStatus}`).moveDown()
  }

  doc.end()
}

function buildAdminPdf(data, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true })

  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="admin-system-report-${Date.now()}.pdf"`)
  }
  doc.pipe(res)

  // ── Cover ────────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 120).fill('#1e293b')
  doc.fillColor('#ffffff').font(PDF_FONT_BOLD).fontSize(22).text('HireAI', 50, 35)
  doc.fontSize(13).text('Platform System Report (Admin)', 50, 62)
  doc.font(PDF_FONT).fontSize(9).text(`Generated: ${data.generatedAt}`, 50, 85)
  doc.fillColor(PDF_COLOR).moveDown(4)

  // ── Stats ────────────────────────────────────────────────────────────────
  if (data.stats) {
    pdfSection(doc, 'Platform Statistics')
    const s = data.stats
    pdfTable(doc,
      ['Metric', 'Value'],
      [
        ['Total Users',          s.totalUsers          ?? 0],
        ['Candidates',           s.candidates          ?? 0],
        ['Recruiters',           s.recruiters          ?? 0],
        ['Admins',               s.admins              ?? 0],
        ['Total Interviews',     s.totalInterviews     ?? 0],
        ['Completed Interviews', s.completedInterviews ?? 0],
      ]
    )
  }

  // ── AI Monitoring ────────────────────────────────────────────────────────
  if (data.aiMonitoring) {
    pdfSection(doc, 'AI Usage Monitoring')
    const ai = data.aiMonitoring
    pdfKV(doc, 'Total AI Requests',  ai.totalRequests  ?? 'N/A')
    pdfKV(doc, 'Active Keys',        ai.activeKeys     ?? 'N/A')
    pdfKV(doc, 'Last Reset',         ai.lastResetDate  ?? 'N/A')
  }

  // ── System Health ─────────────────────────────────────────────────────────
  if (data.health) {
    pdfSection(doc, 'System Health')
    const h = data.health
    pdfKV(doc, 'Uptime (hours)',      h.uptimeHours  ?? 'N/A')
    pdfKV(doc, 'Node.js Version',     h.nodeVersion  ?? 'N/A')
    pdfKV(doc, 'Memory Used (MB)',    h.memUsedMb    ?? 'N/A')
  }

  // ── Recent Activity ──────────────────────────────────────────────────────
  if (data.activity?.recentInterviews?.length) {
    pdfSection(doc, 'Recent Interview Activity')
    pdfTable(doc,
      ['Date', 'Role', 'Score', 'Status'],
      data.activity.recentInterviews.slice(0, 20).map(r => [
        fmtDate(r.completedAt || r.completed_at),
        r.selectedRole || r.selected_role || '—',
        r.score ?? '—',
        r.status || '—',
      ])
    )
  }

  doc.end()
}

/* ─── Exports ────────────────────────────────────────────────────────────────── */

module.exports = {
  getCandidateReportData,
  getRecruiterCandidateReportData,
  getAdminReportData,
  buildCsv,
  buildCandidateCsv,
  buildCandidatePdf,
  buildAdminCsv,
  buildAdminPdf,
}
