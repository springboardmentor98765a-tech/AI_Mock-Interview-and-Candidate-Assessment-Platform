'use strict'

/**
 * scheduleService.js — Module 9 Chunk 2: Interview Scheduling
 *
 * Encapsulates all DB operations for the scheduled_interviews table.
 * Enforces:
 *   - Ownership / RBAC at the service level (never trusts client-supplied user_id for ownership)
 *   - UTC timestamps stored via PostgreSQL TIMESTAMP WITH TIME ZONE
 *   - Atomic reminder-flag claiming to prevent duplicate reminders
 *   - No email / no WebSocket — in-app notifications only via notificationService
 *
 * Public API:
 *   createScheduledInterview(recruiterId, candidateId, fields)
 *   getSchedulesForCandidate(candidateId, opts)
 *   getSchedulesForRecruiter(recruiterId, opts)
 *   getAllSchedules(opts)                          — admin use
 *   getScheduleByIdForUser(scheduleId, userId, userRole)
 *   rescheduleInterview(scheduleId, recruiterId, userRole, newScheduledAt, extra)
 *   cancelInterview(scheduleId, recruiterId, userRole)
 *   claimReminder24h(scheduleId)                  — atomic; used by scheduler only
 *   claimReminder1h(scheduleId)                   — atomic; used by scheduler only
 *   getDueReminders()                             — used by scheduler only
 */

const { pool } = require('../config/database')

/* ─── Validation helpers ─────────────────────────────────────────────────────── */

const VALID_TYPES     = ['Video Call', 'In-Person', 'Phone', 'Technical', 'HR Round']
const VALID_STATUSES  = ['scheduled', 'confirmed', 'completed', 'cancelled']
const MAX_ROLE_LEN    = 255
const MAX_NOTES_LEN   = 2000
const MIN_DURATION    = 5
const MAX_DURATION    = 480

function validateFields({ role, scheduledAt, durationMinutes, interviewType, notes }) {
  if (!role || typeof role !== 'string' || !role.trim()) {
    throw Object.assign(new Error('role is required'), { status: 400 })
  }
  if (role.trim().length > MAX_ROLE_LEN) {
    throw Object.assign(new Error(`role must be ≤ ${MAX_ROLE_LEN} characters`), { status: 400 })
  }
  const ts = new Date(scheduledAt)
  if (!scheduledAt || isNaN(ts.getTime())) {
    throw Object.assign(new Error('scheduledAt must be a valid ISO timestamp'), { status: 400 })
  }
  if (ts.getTime() <= Date.now()) {
    throw Object.assign(new Error('scheduledAt must be a future timestamp'), { status: 400 })
  }
  const dur = Number(durationMinutes)
  if (!Number.isInteger(dur) || dur < MIN_DURATION || dur > MAX_DURATION) {
    throw Object.assign(new Error(`durationMinutes must be an integer between ${MIN_DURATION} and ${MAX_DURATION}`), { status: 400 })
  }
  if (interviewType && !VALID_TYPES.includes(interviewType)) {
    throw Object.assign(new Error(`interviewType must be one of: ${VALID_TYPES.join(', ')}`), { status: 400 })
  }
  if (notes && typeof notes === 'string' && notes.length > MAX_NOTES_LEN) {
    throw Object.assign(new Error(`notes must be ≤ ${MAX_NOTES_LEN} characters`), { status: 400 })
  }
}

function validateId(id, name = 'id') {
  const n = Number(id)
  if (!Number.isInteger(n) || n < 1) {
    throw Object.assign(new Error(`${name} must be a positive integer`), { status: 400 })
  }
  return n
}

/* ─── Create ─────────────────────────────────────────────────────────────────── */

/**
 * Create a scheduled interview.
 * @param {number} recruiterId — from req.user.id (JWT-verified)
 * @param {number} candidateId — validated as a real USER/candidate below
 * @param {{ role, scheduledAt, durationMinutes, interviewType, notes }} fields
 */
async function createScheduledInterview(recruiterId, candidateId, {
  role,
  scheduledAt,
  durationMinutes = 45,
  interviewType   = 'Video Call',
  notes           = null,
}) {
  validateId(recruiterId, 'recruiterId')
  validateId(candidateId, 'candidateId')
  validateFields({ role, scheduledAt, durationMinutes, interviewType, notes })

  // Verify candidate exists and is a USER (candidate) role
  const candidateCheck = await pool.query(
    `SELECT id, name, email, role FROM users WHERE id = $1`,
    [candidateId]
  )
  if (candidateCheck.rows.length === 0) {
    throw Object.assign(new Error('Candidate not found'), { status: 404 })
  }
  if (candidateCheck.rows[0].role !== 'USER') {
    throw Object.assign(new Error('Specified user is not a candidate'), { status: 400 })
  }

  const result = await pool.query(
    `INSERT INTO scheduled_interviews
       (recruiter_id, candidate_id, role, scheduled_at, duration_minutes, interview_type, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      recruiterId,
      candidateId,
      role.trim(),
      scheduledAt,
      Number(durationMinutes),
      interviewType,
      notes || null,
    ]
  )
  return { schedule: result.rows[0], candidate: candidateCheck.rows[0] }
}

/* ─── Read ───────────────────────────────────────────────────────────────────── */

const SCHEDULE_COLS = `
  si.id, si.recruiter_id, si.candidate_id, si.role, si.scheduled_at,
  si.duration_minutes, si.interview_type, si.status,
  si.reminder_sent_24h, si.reminder_sent_1h, si.notes,
  si.created_at, si.updated_at,
  c.name  AS candidate_name,
  c.email AS candidate_email,
  r.name  AS recruiter_name,
  r.email AS recruiter_email
`

async function getSchedulesForCandidate(candidateId, { limit = 50, offset = 0 } = {}) {
  validateId(candidateId, 'candidateId')
  const lim = Math.max(1, Math.min(Number(limit) || 50, 200))
  const off = Math.max(0, Number(offset) || 0)

  const [rows, countRow] = await Promise.all([
    pool.query(
      `SELECT ${SCHEDULE_COLS}
       FROM scheduled_interviews si
       LEFT JOIN users c ON c.id = si.candidate_id
       LEFT JOIN users r ON r.id = si.recruiter_id
       WHERE si.candidate_id = $1
       ORDER BY si.scheduled_at ASC
       LIMIT $2 OFFSET $3`,
      [candidateId, lim, off]
    ),
    pool.query(
      `SELECT COUNT(*) FROM scheduled_interviews WHERE candidate_id = $1`,
      [candidateId]
    ),
  ])

  return {
    schedules: rows.rows,
    total:     Number(countRow.rows[0].count),
  }
}

async function getSchedulesForRecruiter(recruiterId, { limit = 100, offset = 0 } = {}) {
  validateId(recruiterId, 'recruiterId')
  const lim = Math.max(1, Math.min(Number(limit) || 100, 500))
  const off = Math.max(0, Number(offset) || 0)

  const [rows, countRow] = await Promise.all([
    pool.query(
      `SELECT ${SCHEDULE_COLS}
       FROM scheduled_interviews si
       LEFT JOIN users c ON c.id = si.candidate_id
       LEFT JOIN users r ON r.id = si.recruiter_id
       WHERE si.recruiter_id = $1
       ORDER BY si.scheduled_at ASC
       LIMIT $2 OFFSET $3`,
      [recruiterId, lim, off]
    ),
    pool.query(
      `SELECT COUNT(*) FROM scheduled_interviews WHERE recruiter_id = $1`,
      [recruiterId]
    ),
  ])

  return {
    schedules: rows.rows,
    total:     Number(countRow.rows[0].count),
  }
}

async function getAllSchedules({ limit = 200, offset = 0 } = {}) {
  const lim = Math.max(1, Math.min(Number(limit) || 200, 1000))
  const off = Math.max(0, Number(offset) || 0)

  const [rows, countRow] = await Promise.all([
    pool.query(
      `SELECT ${SCHEDULE_COLS}
       FROM scheduled_interviews si
       LEFT JOIN users c ON c.id = si.candidate_id
       LEFT JOIN users r ON r.id = si.recruiter_id
       ORDER BY si.scheduled_at DESC
       LIMIT $1 OFFSET $2`,
      [lim, off]
    ),
    pool.query(`SELECT COUNT(*) FROM scheduled_interviews`),
  ])

  return {
    schedules: rows.rows,
    total:     Number(countRow.rows[0].count),
  }
}

/**
 * Fetch a single schedule, enforcing per-role ownership.
 * - USER: must be candidate_id
 * - RECRUITER: must be recruiter_id
 * - ADMIN: unrestricted
 */
async function getScheduleByIdForUser(scheduleId, userId, userRole) {
  validateId(scheduleId, 'scheduleId')
  validateId(userId, 'userId')

  const result = await pool.query(
    `SELECT ${SCHEDULE_COLS}
     FROM scheduled_interviews si
     LEFT JOIN users c ON c.id = si.candidate_id
     LEFT JOIN users r ON r.id = si.recruiter_id
     WHERE si.id = $1`,
    [scheduleId]
  )

  if (result.rows.length === 0) {
    throw Object.assign(new Error('Schedule not found'), { status: 404 })
  }

  const row = result.rows[0]

  if (userRole === 'ADMIN') return row

  if (userRole === 'USER' && row.candidate_id !== userId) {
    throw Object.assign(new Error('Access denied'), { status: 403 })
  }

  if (userRole === 'RECRUITER' && row.recruiter_id !== userId) {
    throw Object.assign(new Error('Access denied'), { status: 403 })
  }

  return row
}

/* ─── Reschedule ─────────────────────────────────────────────────────────────── */

async function rescheduleInterview(scheduleId, userId, userRole, newScheduledAt, extra = {}) {
  validateId(scheduleId, 'scheduleId')
  validateId(userId, 'userId')

  // Load and authorise
  const row = await getScheduleByIdForUser(scheduleId, userId, userRole)

  if (row.status === 'cancelled' || row.status === 'completed') {
    throw Object.assign(new Error(`Cannot reschedule a ${row.status} interview`), { status: 400 })
  }

  const ts = new Date(newScheduledAt)
  if (!newScheduledAt || isNaN(ts.getTime()) || ts.getTime() <= Date.now()) {
    throw Object.assign(new Error('newScheduledAt must be a valid future timestamp'), { status: 400 })
  }

  const dur  = extra.durationMinutes != null ? Number(extra.durationMinutes) : row.duration_minutes
  const type = extra.interviewType   != null ? extra.interviewType           : row.interview_type
  const notes = extra.notes          != null ? String(extra.notes).slice(0, MAX_NOTES_LEN) : row.notes

  if (!Number.isInteger(dur) || dur < MIN_DURATION || dur > MAX_DURATION) {
    throw Object.assign(new Error(`durationMinutes must be between ${MIN_DURATION} and ${MAX_DURATION}`), { status: 400 })
  }
  if (!VALID_TYPES.includes(type)) {
    throw Object.assign(new Error(`interviewType must be one of: ${VALID_TYPES.join(', ')}`), { status: 400 })
  }

  const result = await pool.query(
    `UPDATE scheduled_interviews
     SET scheduled_at       = $1,
         duration_minutes   = $2,
         interview_type     = $3,
         notes              = $4,
         reminder_sent_24h  = false,
         reminder_sent_1h   = false,
         status             = CASE WHEN status = 'confirmed' THEN 'scheduled' ELSE status END,
         updated_at         = NOW()
     WHERE id = $5
     RETURNING *`,
    [newScheduledAt, dur, type, notes, scheduleId]
  )
  return result.rows[0]
}

/* ─── Cancel ─────────────────────────────────────────────────────────────────── */

async function cancelInterview(scheduleId, userId, userRole) {
  validateId(scheduleId, 'scheduleId')
  validateId(userId, 'userId')

  const row = await getScheduleByIdForUser(scheduleId, userId, userRole)

  if (row.status === 'cancelled') {
    throw Object.assign(new Error('Interview is already cancelled'), { status: 400 })
  }
  if (row.status === 'completed') {
    throw Object.assign(new Error('Cannot cancel a completed interview'), { status: 400 })
  }

  const result = await pool.query(
    `UPDATE scheduled_interviews
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [scheduleId]
  )
  return { schedule: result.rows[0], candidate_id: row.candidate_id, recruiter_id: row.recruiter_id }
}

/* ─── Reminder claiming (scheduler use only) ─────────────────────────────────── */

/**
 * Atomically claim the 24-hour reminder flag.
 * Returns the updated row if successful, or null if already claimed / not eligible.
 */
async function claimReminder24h(scheduleId) {
  const result = await pool.query(
    `UPDATE scheduled_interviews
     SET reminder_sent_24h = true, updated_at = NOW()
     WHERE id = $1
       AND reminder_sent_24h = false
       AND status IN ('scheduled', 'confirmed')
     RETURNING *`,
    [scheduleId]
  )
  return result.rows[0] || null
}

/**
 * Atomically claim the 1-hour reminder flag.
 * Returns the updated row if successful, or null if already claimed / not eligible.
 */
async function claimReminder1h(scheduleId) {
  const result = await pool.query(
    `UPDATE scheduled_interviews
     SET reminder_sent_1h = true, updated_at = NOW()
     WHERE id = $1
       AND reminder_sent_1h = false
       AND status IN ('scheduled', 'confirmed')
     RETURNING *`,
    [scheduleId]
  )
  return result.rows[0] || null
}

/**
 * Return all non-cancelled, non-completed upcoming schedules that may need
 * reminders. The scheduler further filters by time window.
 */
async function getDueReminders() {
  const result = await pool.query(
    `SELECT ${SCHEDULE_COLS}
     FROM scheduled_interviews si
     LEFT JOIN users c ON c.id = si.candidate_id
     LEFT JOIN users r ON r.id = si.recruiter_id
     WHERE si.status IN ('scheduled', 'confirmed')
       AND si.scheduled_at > NOW()
       AND (si.reminder_sent_24h = false OR si.reminder_sent_1h = false)
     ORDER BY si.scheduled_at ASC`,
    []
  )
  return result.rows
}

module.exports = {
  createScheduledInterview,
  getSchedulesForCandidate,
  getSchedulesForRecruiter,
  getAllSchedules,
  getScheduleByIdForUser,
  rescheduleInterview,
  cancelInterview,
  claimReminder24h,
  claimReminder1h,
  getDueReminders,
}
