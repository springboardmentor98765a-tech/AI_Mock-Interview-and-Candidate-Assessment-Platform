'use strict'

/**
 * reminderScheduler.js — Module 9 Chunk 2: Reminder Worker
 *
 * A lightweight background worker using setInterval.
 * No Redis, no BullMQ — just periodic PostgreSQL polling.
 *
 * Reminders fire at:
 *   24h window: interview is between 23h and 25h away
 *   1h  window: interview is between 45min and 75min away
 *
 * Each reminder flag is claimed atomically in PostgreSQL.
 * If the UPDATE returns 0 rows the reminder was already sent — no duplicate.
 *
 * Controlled via REMINDER_INTERVAL_MS env var (default: 60000 = 1 minute).
 */

const scheduleService      = require('./scheduleService')
const notificationService  = require('./notificationService')
const emailService         = require('./emailService')

/* ─── Configuration ──────────────────────────────────────────────────────────── */
const INTERVAL_MS = parseInt(process.env.REMINDER_INTERVAL_MS || '60000', 10)

// Half-windows (ms) centred on target
const WINDOW_24H_BEFORE = 25 * 60 * 60 * 1000   // 25 h
const WINDOW_24H_AFTER  = 23 * 60 * 60 * 1000   // 23 h — interview is in [23h, 25h]
const WINDOW_1H_BEFORE  =  75 * 60 * 1000        // 75 min
const WINDOW_1H_AFTER   =  45 * 60 * 1000        // 45 min — interview is in [45m, 75m]

/* ─── Time formatting (UTC-safe, browser-independent) ─────────────────────────── */
function formatUtcReadable(isoString) {
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

/* ─── Reminder processing ────────────────────────────────────────────────────── */
async function processReminders() {
  let rows
  try {
    rows = await scheduleService.getDueReminders()
  } catch (err) {
    console.error('[reminderScheduler] getDueReminders error:', err.message)
    return
  }

  if (rows.length === 0) return

  const now = Date.now()

  for (const row of rows) {
    const interviewMs = new Date(row.scheduled_at).getTime()
    const diffMs      = interviewMs - now

    if (diffMs <= 0) continue  // already past — skip

    /* ── 24-hour reminder window ─────────────────────────────────────────── */
    if (!row.reminder_sent_24h && diffMs <= WINDOW_24H_BEFORE && diffMs >= WINDOW_24H_AFTER) {
      const claimed = await scheduleService.claimReminder24h(row.id)
      if (claimed) {
        const readableTime = formatUtcReadable(row.scheduled_at)

        // In-app: candidate
        if (row.candidate_id) {
          await safeSendNotification({
            userId:  row.candidate_id,
            type:    'INTERVIEW_REMINDER',
            title:   'Interview reminder',
            message: `Your interview for ${row.role} is scheduled for tomorrow at ${readableTime}.`,
            data: {
              scheduleId:     row.id,
              candidateId:    row.candidate_id,
              recruiterId:    row.recruiter_id,
              scheduledAt:    row.scheduled_at,
              reminderWindow: '24h',
              role:           row.role,
            },
          })

          // Email: candidate (preference-gated)
          await emailService.sendReminderEmailIfEnabled(
            row.candidate_id,
            claimed,
            { id: row.candidate_id, name: row.candidate_name || 'Candidate', email: row.candidate_email || null },
            '24h',
            false
          )
        }

        // In-app: recruiter
        if (row.recruiter_id) {
          const candidateName = row.candidate_name || 'A candidate'
          await safeSendNotification({
            userId:  row.recruiter_id,
            type:    'INTERVIEW_REMINDER',
            title:   'Interview reminder',
            message: `${candidateName}'s interview for ${row.role} is scheduled for tomorrow at ${readableTime}.`,
            data: {
              scheduleId:     row.id,
              candidateId:    row.candidate_id,
              recruiterId:    row.recruiter_id,
              scheduledAt:    row.scheduled_at,
              reminderWindow: '24h',
              role:           row.role,
            },
          })

          // Email: recruiter (preference-gated)
          await emailService.sendReminderEmailIfEnabled(
            row.recruiter_id,
            claimed,
            { id: row.recruiter_id, name: row.recruiter_name || 'Recruiter', email: row.recruiter_email || null },
            '24h',
            true
          )
        }

        console.log(`[reminderScheduler] 24h reminder sent — schedule #${row.id} (${row.role})`)
      }
    }

    /* ── 1-hour reminder window ──────────────────────────────────────────── */
    if (!row.reminder_sent_1h && diffMs <= WINDOW_1H_BEFORE && diffMs >= WINDOW_1H_AFTER) {
      const claimed = await scheduleService.claimReminder1h(row.id)
      if (claimed) {
        // In-app: candidate
        if (row.candidate_id) {
          await safeSendNotification({
            userId:  row.candidate_id,
            type:    'INTERVIEW_REMINDER',
            title:   'Interview starting soon',
            message: `Your interview for ${row.role} starts in about 1 hour.`,
            data: {
              scheduleId:     row.id,
              candidateId:    row.candidate_id,
              recruiterId:    row.recruiter_id,
              scheduledAt:    row.scheduled_at,
              reminderWindow: '1h',
              role:           row.role,
            },
          })

          // Email: candidate (preference-gated)
          await emailService.sendReminderEmailIfEnabled(
            row.candidate_id,
            claimed,
            { id: row.candidate_id, name: row.candidate_name || 'Candidate', email: row.candidate_email || null },
            '1h',
            false
          )
        }

        // In-app: recruiter
        if (row.recruiter_id) {
          const candidateName = row.candidate_name || 'A candidate'
          await safeSendNotification({
            userId:  row.recruiter_id,
            type:    'INTERVIEW_REMINDER',
            title:   'Interview starting soon',
            message: `${candidateName}'s interview for ${row.role} starts in about 1 hour.`,
            data: {
              scheduleId:     row.id,
              candidateId:    row.candidate_id,
              recruiterId:    row.recruiter_id,
              scheduledAt:    row.scheduled_at,
              reminderWindow: '1h',
              role:           row.role,
            },
          })

          // Email: recruiter (preference-gated)
          await emailService.sendReminderEmailIfEnabled(
            row.recruiter_id,
            claimed,
            { id: row.recruiter_id, name: row.recruiter_name || 'Recruiter', email: row.recruiter_email || null },
            '1h',
            true
          )
        }

        console.log(`[reminderScheduler] 1h reminder sent — schedule #${row.id} (${row.role})`)
      }
    }
  }
}

async function safeSendNotification(args) {
  try {
    await notificationService.createNotification(args)
  } catch (err) {
    console.error('[reminderScheduler] notification error:', err.message)
  }
}

/* ─── Singleton guard ────────────────────────────────────────────────────────── */
let _timer = null

function start() {
  if (_timer) return  // already running — no duplicate loops

  _timer = setInterval(async () => {
    try {
      await processReminders()
    } catch (err) {
      // Never crash the API server because of a scheduler tick
      console.error('[reminderScheduler] tick error:', err.message)
    }
  }, INTERVAL_MS)

  // setInterval timers should not block Node.js from exiting cleanly
  if (_timer.unref) _timer.unref()

  console.log(`[reminderScheduler] started — interval ${INTERVAL_MS}ms`)
}

function stop() {
  if (_timer) {
    clearInterval(_timer)
    _timer = null
  }
}

module.exports = { start, stop }
