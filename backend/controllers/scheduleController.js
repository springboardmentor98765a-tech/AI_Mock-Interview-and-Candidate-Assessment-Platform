'use strict'

/**
 * scheduleController.js — Module 9 Chunk 2
 *
 * HTTP handlers for /api/schedules.
 * Identity always derived from req.user (JWT) — never from request body.
 *
 * Routes handled:
 *   GET    /api/schedules           — list (role-scoped)
 *   POST   /api/schedules           — create (RECRUITER/ADMIN only)
 *   GET    /api/schedules/:id       — single (ownership enforced)
 *   PATCH  /api/schedules/:id       — reschedule (RECRUITER/ADMIN only)
 *   DELETE /api/schedules/:id       — cancel (RECRUITER/ADMIN only)
 */

const svc               = require('../services/scheduleService')
const notifSvc          = require('../services/notificationService')
const emailSvc          = require('../services/emailService')

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function handleError(res, err) {
  const status = err.status || 500
  const msg    = err.message || 'Internal server error'
  if (status >= 500) console.error('[scheduleController]', err)
  return res.status(status).json({ success: false, message: msg })
}

function fmtReadable(isoString) {
  if (!isoString) return 'TBD'
  const d = new Date(isoString)
  return d.toLocaleString('en-IN', {
    timeZone:    'UTC',
    weekday:     'short',
    month:       'short',
    day:         'numeric',
    hour:        '2-digit',
    minute:      '2-digit',
    hour12:      true,
    timeZoneName: 'short',
  })
}

/* ─── GET /api/schedules ─────────────────────────────────────────────────────── */
async function getSchedules(req, res) {
  try {
    const { id: userId, role } = req.user
    const limit  = Math.max(1, Math.min(parseInt(req.query.limit)  || 50, 500))
    const offset = Math.max(0, parseInt(req.query.offset) || 0)

    let result
    if (role === 'USER') {
      result = await svc.getSchedulesForCandidate(userId, { limit, offset })
    } else if (role === 'RECRUITER') {
      result = await svc.getSchedulesForRecruiter(userId, { limit, offset })
    } else if (role === 'ADMIN') {
      result = await svc.getAllSchedules({ limit, offset })
    } else {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    return res.json({ success: true, ...result })
  } catch (err) {
    return handleError(res, err)
  }
}

/* ─── GET /api/schedules/:id ─────────────────────────────────────────────────── */
async function getScheduleById(req, res) {
  try {
    const scheduleId = parseInt(req.params.id)
    if (!Number.isInteger(scheduleId) || scheduleId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid schedule id' })
    }
    const row = await svc.getScheduleByIdForUser(scheduleId, req.user.id, req.user.role)
    return res.json({ success: true, schedule: row })
  } catch (err) {
    return handleError(res, err)
  }
}

/* ─── POST /api/schedules ────────────────────────────────────────────────────── */
async function createSchedule(req, res) {
  try {
    const { id: recruiterId, role } = req.user

    if (role !== 'RECRUITER' && role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only recruiters and admins can schedule interviews' })
    }

    const { candidateId, role: jobRole, scheduledAt, durationMinutes, interviewType, notes } = req.body

    if (!candidateId) {
      return res.status(400).json({ success: false, message: 'candidateId is required' })
    }

    const { schedule, candidate } = await svc.createScheduledInterview(
      recruiterId,
      parseInt(candidateId),
      {
        role:            jobRole,
        scheduledAt,
        durationMinutes: durationMinutes ?? 45,
        interviewType:   interviewType   ?? 'Video Call',
        notes:           notes           ?? null,
      }
    )

    // In-app notification (candidate)
    await notifSvc.createNotification({
      userId:  candidate.id,
      type:    'INTERVIEW_SCHEDULED',
      title:   'Interview scheduled',
      message: `Your interview for ${schedule.role} has been scheduled on ${fmtReadable(schedule.scheduled_at)} (${schedule.interview_type}).`,
      data: {
        scheduleId:    schedule.id,
        scheduledAt:   schedule.scheduled_at,
        interviewType: schedule.interview_type,
        role:          schedule.role,
      },
    }).catch(e => console.error('[scheduleController] notify candidate error:', e.message))

    // Email notification (preference-gated, non-fatal)
    emailSvc.sendEmailIfEnabled(
      candidate.id,
      emailSvc.sendInterviewScheduledEmail,
      schedule,
      candidate
    ).catch(e => console.error('[scheduleController] email scheduled error:', e.message))

    return res.status(201).json({ success: true, schedule })
  } catch (err) {
    return handleError(res, err)
  }
}

/* ─── PATCH /api/schedules/:id ───────────────────────────────────────────────── */
async function rescheduleInterview(req, res) {
  try {
    const { id: userId, role } = req.user

    if (role !== 'RECRUITER' && role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only recruiters and admins can reschedule interviews' })
    }

    const scheduleId = parseInt(req.params.id)
    if (!Number.isInteger(scheduleId) || scheduleId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid schedule id' })
    }

    const { scheduledAt, durationMinutes, interviewType, notes } = req.body

    if (!scheduledAt) {
      return res.status(400).json({ success: false, message: 'scheduledAt is required for rescheduling' })
    }

    const oldRow = await svc.getScheduleByIdForUser(scheduleId, userId, role)
    const updated = await svc.rescheduleInterview(scheduleId, userId, role, scheduledAt, {
      durationMinutes, interviewType, notes,
    })

    // In-app notification (candidate)
    if (oldRow.candidate_id) {
      await notifSvc.createNotification({
        userId:  oldRow.candidate_id,
        type:    'INTERVIEW_RESCHEDULED',
        title:   'Interview rescheduled',
        message: `Your interview for ${updated.role} has been rescheduled to ${fmtReadable(updated.scheduled_at)}.`,
        data: {
          scheduleId:  updated.id,
          scheduledAt: updated.scheduled_at,
          role:        updated.role,
        },
      }).catch(e => console.error('[scheduleController] notify reschedule error:', e.message))

      // Email notification — candidate email from DB row (never from request)
      const candidate = {
        id:    oldRow.candidate_id,
        name:  oldRow.candidate_name  || 'Candidate',
        email: oldRow.candidate_email || null,
      }
      emailSvc.sendEmailIfEnabled(
        candidate.id,
        emailSvc.sendInterviewRescheduledEmail,
        updated,
        candidate
      ).catch(e => console.error('[scheduleController] email reschedule error:', e.message))
    }

    return res.json({ success: true, schedule: updated })
  } catch (err) {
    return handleError(res, err)
  }
}

/* ─── DELETE /api/schedules/:id ──────────────────────────────────────────────── */
async function cancelSchedule(req, res) {
  try {
    const { id: userId, role } = req.user

    if (role !== 'RECRUITER' && role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only recruiters and admins can cancel interviews' })
    }

    const scheduleId = parseInt(req.params.id)
    if (!Number.isInteger(scheduleId) || scheduleId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid schedule id' })
    }

    const { schedule, candidate_id } = await svc.cancelInterview(scheduleId, userId, role)

    // In-app notification + email (candidate)
    if (candidate_id) {
      await notifSvc.createNotification({
        userId:  candidate_id,
        type:    'INTERVIEW_CANCELLED',
        title:   'Interview cancelled',
        message: `Your scheduled interview for ${schedule.role} has been cancelled.`,
        data: {
          scheduleId: schedule.id,
          role:       schedule.role,
        },
      }).catch(e => console.error('[scheduleController] notify cancel error:', e.message))

      // Email notification — use DB email from the schedule row
      const candidateForEmail = {
        id:    candidate_id,
        name:  schedule.candidate_name  || 'Candidate',
        email: schedule.candidate_email || null,
      }
      emailSvc.sendEmailIfEnabled(
        candidate_id,
        emailSvc.sendInterviewCancelledEmail,
        schedule,
        candidateForEmail
      ).catch(e => console.error('[scheduleController] email cancel error:', e.message))
    }

    return res.json({ success: true, schedule })
  } catch (err) {
    return handleError(res, err)
  }
}

module.exports = {
  getSchedules,
  getScheduleById,
  createSchedule,
  rescheduleInterview,
  cancelSchedule,
}
