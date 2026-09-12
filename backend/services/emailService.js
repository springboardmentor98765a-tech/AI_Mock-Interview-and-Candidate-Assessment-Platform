'use strict'

/**
 * emailService.js — Module 9 Chunk 3: Email Notification Service
 *
 * Provides a thin, config-driven Nodemailer wrapper plus purpose-specific
 * helpers for every scheduling lifecycle event. Integrates with the existing
 * notificationService preference API to respect per-user opt-ins.
 *
 * SMTP credentials come exclusively from environment variables — never from
 * request bodies or hardcoded strings.
 *
 * KEY GUARANTEES
 * ─────────────
 * • Email disabled (SMTP_HOST blank)  → logs once and skips silently.
 * • Email failure at send time        → logs the error, never throws.
 * • Missing/invalid recipient email   → skips silently.
 * • No arbitrary "to" address accepted from external callers.
 * • All dynamic content is plain-text escaped before insertion into HTML.
 * • Notification preferences are fetched from DB, never from request body.
 *
 * PUBLIC API
 * ──────────
 * isEmailEnabled()                                   → boolean
 * sendEmail({ to, subject, text, html })             → Promise<void>
 * sendInterviewScheduledEmail(schedule, candidate)   → Promise<void>
 * sendInterviewRescheduledEmail(schedule, candidate) → Promise<void>
 * sendInterviewCancelledEmail(schedule, candidate)   → Promise<void>
 * sendInterviewReminderEmail(schedule, recipient, window) → Promise<void>
 * sendEmailIfEnabled(userId, emailFn, ...args)       → Promise<void>
 * sendReminderEmailIfEnabled(userId, emailFn, ...args) → Promise<void>
 */

const nodemailer          = require('nodemailer')
const notificationService = require('./notificationService')

/* ─── SMTP configuration ─────────────────────────────────────────────────────── */

const SMTP_HOST   = process.env.SMTP_HOST   || ''
const SMTP_PORT   = parseInt(process.env.SMTP_PORT || '587', 10)
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'
const SMTP_USER   = process.env.SMTP_USER   || ''
const SMTP_PASS   = process.env.SMTP_PASS   || ''
const SMTP_FROM   = process.env.SMTP_FROM   || 'HireAI <no-reply@hireai.local>'

// Compiled only if configured; singleton across the process lifetime.
let _transporter = null
let _emailEnabled = false
let _initLogged  = false

function getTransporter() {
  if (_transporter) return _transporter

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    if (!_initLogged) {
      console.info('[emailService] SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing). Email sending disabled.')
      _initLogged = true
    }
    _emailEnabled = false
    return null
  }

  _transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Connection pool + timeouts for long-running server process
    pool:              true,
    maxConnections:    3,
    socketTimeout:     30000,
    connectionTimeout: 10000,
    greetingTimeout:   10000,
  })

  _emailEnabled = true
  if (!_initLogged) {
    console.info(`[emailService] SMTP configured — host=${SMTP_HOST} port=${SMTP_PORT} secure=${SMTP_SECURE}`)
    _initLogged = true
  }
  return _transporter
}

/**
 * Returns true only when SMTP credentials are present in environment.
 * Tests can override by calling module functions with mock transporter.
 */
function isEmailEnabled() {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS)
}

/* ─── Plain-text HTML escaping ───────────────────────────────────────────────── */

function esc(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/* ─── Email validation ───────────────────────────────────────────────────────── */

// RFC-5322 simplified — good enough to skip obviously missing/broken emails
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim())
}

/* ─── HTML template wrapper ──────────────────────────────────────────────────── */

function wrapHtml(titleText, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(titleText)}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f6fb; font-family: 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.09); }
    .header { background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
    .header p { margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.8); }
    .body { padding: 28px 32px; }
    .body p { font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 14px; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin: 18px 0; }
    .card dl { margin: 0; }
    .card dt { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 10px; }
    .card dt:first-child { margin-top: 0; }
    .card dd { font-size: 14px; color: #111827; font-weight: 600; margin: 2px 0 0; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .badge-blue   { background: #eff6ff; color: #2563eb; }
    .badge-green  { background: #f0fdf4; color: #16a34a; }
    .badge-orange { background: #fff7ed; color: #ea580c; }
    .badge-red    { background: #fef2f2; color: #dc2626; }
    .cta { text-align: center; margin: 24px 0 8px; }
    .btn { display: inline-block; background: #6366f1; color: #fff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 700; }
    .footer { padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>HireAI</h1>
      <p>AI Mock Interview &amp; Candidate Assessment Platform</p>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      This is an automated message from HireAI. Do not reply to this email.<br />
      You are receiving this because you have an active account on the HireAI platform.
    </div>
  </div>
</body>
</html>`
}

/* ─── Date formatting (UTC, server-side) ─────────────────────────────────────── */

function fmtDateTime(isoString) {
  if (!isoString) return 'TBD'
  const d = new Date(isoString)
  return d.toLocaleString('en-GB', {
    timeZone:    'UTC',
    weekday:     'long',
    year:        'numeric',
    month:       'long',
    day:         'numeric',
    hour:        '2-digit',
    minute:      '2-digit',
    hour12:      true,
    timeZoneName: 'short',
  })
}

/* ─── Templates ──────────────────────────────────────────────────────────────── */

function buildScheduledTemplate({ candidateName, role, scheduledAt, durationMinutes, interviewType, notes }) {
  const subject = `Interview Scheduled: ${role}`
  const readable = fmtDateTime(scheduledAt)

  const text = [
    `Hi ${candidateName},`,
    ``,
    `Your interview for ${role} has been scheduled.`,
    ``,
    `Details:`,
    `  Role:      ${role}`,
    `  Date/Time: ${readable}`,
    `  Duration:  ${durationMinutes} minutes`,
    `  Type:      ${interviewType}`,
    notes ? `  Notes:     ${notes}` : '',
    ``,
    `Please make sure you are available at the scheduled time.`,
    ``,
    `Best of luck!`,
    `— The HireAI Team`,
  ].filter(l => l !== null).join('\n')

  const notesHtml = notes
    ? `<dt>Notes</dt><dd>${esc(notes)}</dd>`
    : ''

  const html = wrapHtml(subject, `
    <p>Hi <strong>${esc(candidateName)}</strong>,</p>
    <p>Your interview for the following position has been successfully scheduled:</p>
    <div class="card">
      <dl>
        <dt>Role</dt><dd>${esc(role)}</dd>
        <dt>Date &amp; Time</dt><dd>${esc(readable)}</dd>
        <dt>Duration</dt><dd>${esc(String(durationMinutes))} minutes</dd>
        <dt>Interview Type</dt><dd><span class="badge badge-blue">${esc(interviewType)}</span></dd>
        ${notesHtml}
      </dl>
    </div>
    <p>Please make sure you are available at the scheduled time and have everything you need prepared.</p>
    <p>Best of luck! 🎯</p>
  `)

  return { subject, text, html }
}

function buildRescheduledTemplate({ candidateName, role, scheduledAt, durationMinutes, interviewType, notes }) {
  const subject = `Interview Rescheduled: ${role}`
  const readable = fmtDateTime(scheduledAt)

  const text = [
    `Hi ${candidateName},`,
    ``,
    `Your interview for ${role} has been rescheduled.`,
    ``,
    `New Details:`,
    `  Role:      ${role}`,
    `  Date/Time: ${readable}`,
    `  Duration:  ${durationMinutes} minutes`,
    `  Type:      ${interviewType}`,
    notes ? `  Notes:     ${notes}` : '',
    ``,
    `Please update your calendar accordingly.`,
    ``,
    `— The HireAI Team`,
  ].filter(l => l !== null).join('\n')

  const notesHtml = notes ? `<dt>Notes</dt><dd>${esc(notes)}</dd>` : ''

  const html = wrapHtml(subject, `
    <p>Hi <strong>${esc(candidateName)}</strong>,</p>
    <p>Your interview for <strong>${esc(role)}</strong> has been <strong>rescheduled</strong>. Please see the updated details below:</p>
    <div class="card">
      <dl>
        <dt>Role</dt><dd>${esc(role)}</dd>
        <dt>New Date &amp; Time</dt><dd>${esc(readable)}</dd>
        <dt>Duration</dt><dd>${esc(String(durationMinutes))} minutes</dd>
        <dt>Interview Type</dt><dd><span class="badge badge-orange">${esc(interviewType)}</span></dd>
        ${notesHtml}
      </dl>
    </div>
    <p>Please update your calendar and make note of the new time. If you have any questions, contact your recruiter.</p>
  `)

  return { subject, text, html }
}

function buildCancelledTemplate({ candidateName, role }) {
  const subject = `Interview Cancelled: ${role}`

  const text = [
    `Hi ${candidateName},`,
    ``,
    `We regret to inform you that your scheduled interview for ${role} has been cancelled.`,
    ``,
    `If you believe this was a mistake or would like to reschedule, please contact your recruiter.`,
    ``,
    `— The HireAI Team`,
  ].join('\n')

  const html = wrapHtml(subject, `
    <p>Hi <strong>${esc(candidateName)}</strong>,</p>
    <p>We regret to inform you that your scheduled interview for <strong>${esc(role)}</strong> has been <strong>cancelled</strong>.</p>
    <div class="card">
      <dl>
        <dt>Role</dt><dd>${esc(role)}</dd>
        <dt>Status</dt><dd><span class="badge badge-red">Cancelled</span></dd>
      </dl>
    </div>
    <p>If you believe this was a mistake or would like to reschedule, please contact your recruiter directly.</p>
  `)

  return { subject, text, html }
}

function buildReminderTemplate({ recipientName, candidateName, role, scheduledAt, durationMinutes, interviewType, reminderWindow, isRecruiter }) {
  const readable    = fmtDateTime(scheduledAt)
  const windowLabel = reminderWindow === '24h' ? 'tomorrow' : 'in about 1 hour'
  const badgeClass  = reminderWindow === '24h' ? 'badge-blue' : 'badge-orange'

  const subject = reminderWindow === '24h'
    ? `Reminder: Interview tomorrow — ${role}`
    : `Reminder: Interview in 1 hour — ${role}`

  const bodyIntro = isRecruiter
    ? `This is a reminder that <strong>${esc(candidateName)}</strong>'s interview for <strong>${esc(role)}</strong> is scheduled <strong>${windowLabel}</strong>.`
    : `This is a reminder that your interview for <strong>${esc(role)}</strong> is scheduled <strong>${windowLabel}</strong>.`

  const textIntro = isRecruiter
    ? `Reminder: ${candidateName}'s interview for ${role} is scheduled ${windowLabel}.`
    : `Reminder: Your interview for ${role} is scheduled ${windowLabel}.`

  const text = [
    `Hi ${recipientName},`,
    ``,
    textIntro,
    ``,
    `Details:`,
    `  Role:      ${role}`,
    `  Date/Time: ${readable}`,
    `  Duration:  ${durationMinutes} minutes`,
    `  Type:      ${interviewType}`,
    ``,
    `Please be prepared and available at the scheduled time.`,
    ``,
    `— The HireAI Team`,
  ].join('\n')

  const html = wrapHtml(subject, `
    <p>Hi <strong>${esc(recipientName)}</strong>,</p>
    <p>${bodyIntro}</p>
    <div class="card">
      <dl>
        <dt>Role</dt><dd>${esc(role)}</dd>
        <dt>Date &amp; Time</dt><dd>${esc(readable)}</dd>
        <dt>Duration</dt><dd>${esc(String(durationMinutes))} minutes</dd>
        <dt>Interview Type</dt><dd><span class="badge badge-blue">${esc(interviewType)}</span></dd>
        <dt>Reminder</dt><dd><span class="badge ${badgeClass}">${reminderWindow === '24h' ? '24-hour reminder' : '1-hour reminder'}</span></dd>
      </dl>
    </div>
    <p>Please ensure you are prepared and available at the scheduled time.</p>
  `)

  return { subject, text, html }
}

/* ─── Core send function ─────────────────────────────────────────────────────── */

/**
 * Low-level email sender. Never throws — catches all errors and logs them.
 * @param {{ to: string, subject: string, text: string, html: string }} opts
 */
async function sendEmail({ to, subject, text, html }) {
  // Guard: email not configured
  const transporter = getTransporter()
  if (!transporter) return

  // Guard: recipient validation
  if (!isValidEmail(to)) {
    console.warn(`[emailService] Skipping send — invalid/missing recipient: "${to}"`)
    return
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to:   to.trim(),
      subject,
      text,
      html,
    })
    console.info(`[emailService] Sent "${subject}" → ${to} (messageId: ${info.messageId})`)
  } catch (err) {
    // Non-fatal: log only
    console.error(`[emailService] SMTP error sending "${subject}" to ${to}:`, err.message)
  }
}

/* ─── Purpose-specific send helpers ─────────────────────────────────────────── */

/**
 * Send interview-scheduled email.
 * @param {object} schedule — DB row from scheduled_interviews
 * @param {object} candidate — { id, name, email }
 */
async function sendInterviewScheduledEmail(schedule, candidate) {
  if (!candidate?.email) return
  const { subject, text, html } = buildScheduledTemplate({
    candidateName:   candidate.name   || 'Candidate',
    role:            schedule.role,
    scheduledAt:     schedule.scheduled_at,
    durationMinutes: schedule.duration_minutes,
    interviewType:   schedule.interview_type,
    notes:           schedule.notes || null,
  })
  await sendEmail({ to: candidate.email, subject, text, html })
}

/**
 * Send interview-rescheduled email.
 */
async function sendInterviewRescheduledEmail(schedule, candidate) {
  if (!candidate?.email) return
  const { subject, text, html } = buildRescheduledTemplate({
    candidateName:   candidate.name   || 'Candidate',
    role:            schedule.role,
    scheduledAt:     schedule.scheduled_at,
    durationMinutes: schedule.duration_minutes,
    interviewType:   schedule.interview_type,
    notes:           schedule.notes || null,
  })
  await sendEmail({ to: candidate.email, subject, text, html })
}

/**
 * Send interview-cancelled email.
 */
async function sendInterviewCancelledEmail(schedule, candidate) {
  if (!candidate?.email) return
  const { subject, text, html } = buildCancelledTemplate({
    candidateName: candidate.name || 'Candidate',
    role:          schedule.role,
  })
  await sendEmail({ to: candidate.email, subject, text, html })
}

/**
 * Send interview reminder email.
 * @param {object} schedule      — DB row (includes candidate_name, recruiter_name, etc.)
 * @param {object} recipient     — { id, name, email }
 * @param {string} reminderWindow — '24h' | '1h'
 * @param {boolean} isRecruiter  — true when recipient is the recruiter
 */
async function sendInterviewReminderEmail(schedule, recipient, reminderWindow, isRecruiter = false) {
  if (!recipient?.email) return
  const { subject, text, html } = buildReminderTemplate({
    recipientName:   recipient.name   || (isRecruiter ? 'Recruiter' : 'Candidate'),
    candidateName:   schedule.candidate_name || 'the candidate',
    role:            schedule.role,
    scheduledAt:     schedule.scheduled_at,
    durationMinutes: schedule.duration_minutes,
    interviewType:   schedule.interview_type,
    reminderWindow,
    isRecruiter,
  })
  await sendEmail({ to: recipient.email, subject, text, html })
}

/* ─── Preference-gated helpers ───────────────────────────────────────────────── */

/**
 * Fetch user preferences from DB and send email only if emailEnabled.
 * Never throws. Logs on failure.
 * @param {number} userId
 * @param {Function} emailFn  — async (schedule, candidate) => void
 * @param {object}   schedule
 * @param {object}   candidate
 */
async function sendEmailIfEnabled(userId, emailFn, schedule, candidate) {
  try {
    const prefs = await notificationService.getNotificationPreferences(userId)
    if (!prefs.emailEnabled) return
    await emailFn(schedule, candidate)
  } catch (err) {
    console.error('[emailService] sendEmailIfEnabled error:', err.message)
  }
}

/**
 * Fetch user preferences and send reminder email only if both emailEnabled
 * AND remindersEnabled are true.
 * @param {number}  userId
 * @param {object}  schedule
 * @param {object}  recipient       — { id, name, email }
 * @param {string}  reminderWindow  — '24h' | '1h'
 * @param {boolean} isRecruiter
 */
async function sendReminderEmailIfEnabled(userId, schedule, recipient, reminderWindow, isRecruiter = false) {
  try {
    const prefs = await notificationService.getNotificationPreferences(userId)
    if (!prefs.emailEnabled || !prefs.remindersEnabled) return
    await sendInterviewReminderEmail(schedule, recipient, reminderWindow, isRecruiter)
  } catch (err) {
    console.error('[emailService] sendReminderEmailIfEnabled error:', err.message)
  }
}

/* ─── For testing: allow injecting a mock transporter ────────────────────────── */
function _setTransporterForTest(mockTransporter) {
  _transporter  = mockTransporter
  _emailEnabled = !!mockTransporter
  _initLogged   = true
}

module.exports = {
  isEmailEnabled,
  sendEmail,
  sendInterviewScheduledEmail,
  sendInterviewRescheduledEmail,
  sendInterviewCancelledEmail,
  sendInterviewReminderEmail,
  sendEmailIfEnabled,
  sendReminderEmailIfEnabled,
  // Template builders exposed for unit-testing without SMTP:
  _buildScheduledTemplate:   buildScheduledTemplate,
  _buildRescheduledTemplate: buildRescheduledTemplate,
  _buildCancelledTemplate:   buildCancelledTemplate,
  _buildReminderTemplate:    buildReminderTemplate,
  _setTransporterForTest,
  _isValidEmail: isValidEmail,
}
