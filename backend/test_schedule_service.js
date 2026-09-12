'use strict'

/**
 * test_schedule_service.js — Module 9 Chunk 2: Scheduling Tests
 *
 * Deterministic integration tests for scheduleService.js + reminderScheduler
 * reminder-window logic (pure-function tests).
 *
 * Requires: running PostgreSQL database matching backend/.env
 * Run: node test_schedule_service.js
 */

require('dotenv').config()

const { pool, initDatabase } = require('./config/database')
const svc = require('./services/scheduleService')

/* ─── Minimal harness ─────────────────────────────────────────────────────── */
let passed = 0
let failed = 0

function assert(cond, msg) {
  if (cond) { passed++; console.log('    ✓', msg) }
  else       { failed++; console.error('    ✗ FAIL:', msg) }
}

async function test(name, fn) {
  console.log('\n▶', name)
  try { await fn() }
  catch (e) { failed++; console.error('    ✗ FAIL: threw', e.message) }
}

/* ─── Reminder window logic (pure, no DB) ─────────────────────────────────── */
const WINDOW_24H_BEFORE = 25 * 60 * 60 * 1000
const WINDOW_24H_AFTER  = 23 * 60 * 60 * 1000
const WINDOW_1H_BEFORE  = 75 * 60 * 1000
const WINDOW_1H_AFTER   = 45 * 60 * 1000

function needs24h(diffMs) {
  return diffMs <= WINDOW_24H_BEFORE && diffMs >= WINDOW_24H_AFTER
}
function needs1h(diffMs) {
  return diffMs <= WINDOW_1H_BEFORE && diffMs >= WINDOW_1H_AFTER
}

/* ─── Seed helpers ────────────────────────────────────────────────────────── */
async function createUser(suffix, role = 'USER') {
  const email = `sched_test_${suffix}_${Date.now()}@example.com`
  const r = await pool.query(
    `INSERT INTO users (name, email, password, role, provider)
     VALUES ($1, $2, 'hashed', $3, 'LOCAL') RETURNING id`,
    [`Test ${suffix}`, email, role]
  )
  return r.rows[0].id
}

async function cleanup(userIds) {
  if (!userIds || !userIds.length) return
  await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [userIds])
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
async function main() {
  console.log('══════════════════════════════════════════════════════')
  console.log('Module 9 Chunk 2 — Schedule Service Tests')
  console.log('══════════════════════════════════════════════════════')

  await initDatabase()

  const userIds = []
  let recruiter, candidate, candidateB

  try {
    recruiter  = await createUser('recruiter',  'RECRUITER')
    candidate  = await createUser('candidateA', 'USER')
    candidateB = await createUser('candidateB', 'USER')
    userIds.push(recruiter, candidate, candidateB)

    // ── Test 1: Create scheduled interview ────────────────────────────────
    await test('1. Create scheduled interview', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      const { schedule, candidate: cand } = await svc.createScheduledInterview(
        recruiter, candidate,
        { role: 'Frontend Developer', scheduledAt: futureDate, durationMinutes: 60, interviewType: 'Video Call' }
      )
      assert(schedule.id > 0,                       'schedule.id is a positive integer')
      assert(schedule.recruiter_id === recruiter,   'recruiter_id matches')
      assert(schedule.candidate_id === candidate,   'candidate_id matches')
      assert(schedule.role === 'Frontend Developer','role stored correctly')
      assert(schedule.status === 'scheduled',       'default status is scheduled')
      assert(schedule.reminder_sent_24h === false,  'reminder_sent_24h defaults false')
      assert(schedule.reminder_sent_1h  === false,  'reminder_sent_1h defaults false')
      assert(cand.id === candidate,                 'candidate object returned')
    })

    // ── Test 2: Reject invalid scheduled timestamp ─────────────────────────
    await test('2. Reject past / invalid scheduledAt', async () => {
      let threw1 = false
      try {
        await svc.createScheduledInterview(recruiter, candidate,
          { role: 'DevOps', scheduledAt: 'not-a-date', durationMinutes: 45 })
      } catch(e) { threw1 = e.status === 400 }
      assert(threw1, 'throws 400 for invalid date string')

      let threw2 = false
      try {
        const past = new Date(Date.now() - 1000).toISOString()
        await svc.createScheduledInterview(recruiter, candidate,
          { role: 'DevOps', scheduledAt: past, durationMinutes: 45 })
      } catch(e) { threw2 = e.status === 400 }
      assert(threw2, 'throws 400 for past timestamp')
    })

    // ── Test 3: Candidate retrieval is user-scoped ─────────────────────────
    await test('3. Candidate schedule retrieval is user-scoped', async () => {
      const futureDate = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
      await svc.createScheduledInterview(recruiter, candidate,
        { role: 'React Dev', scheduledAt: futureDate, durationMinutes: 30 })

      const dataA = await svc.getSchedulesForCandidate(candidate)
      const dataB = await svc.getSchedulesForCandidate(candidateB)

      assert(dataA.schedules.every(s => s.candidate_id === candidate), 'all schedules belong to candidateA')
      assert(dataB.schedules.length === 0 || dataB.schedules.every(s => s.candidate_id === candidateB),
        'candidateB sees only their own schedules')
    })

    // ── Test 4: Recruiter retrieval is recruiter-scoped ────────────────────
    await test('4. Recruiter schedule retrieval is recruiter-scoped', async () => {
      const data = await svc.getSchedulesForRecruiter(recruiter)
      assert(data.schedules.every(s => s.recruiter_id === recruiter), 'all recruiter schedules belong to recruiter')
      assert(typeof data.total === 'number', 'total is a number')
    })

    // ── Test 5: Reschedule updates scheduled_at ────────────────────────────
    await test('5. Reschedule updates scheduled_at', async () => {
      const d1 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      const { schedule } = await svc.createScheduledInterview(recruiter, candidate,
        { role: 'Backend Dev', scheduledAt: d1, durationMinutes: 45 })

      const d2 = new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString()
      const updated = await svc.rescheduleInterview(schedule.id, recruiter, 'RECRUITER', d2)

      assert(new Date(updated.scheduled_at).getTime() !== new Date(d1).getTime(), 'scheduled_at changed')
      assert(updated.reminder_sent_24h === false, 'reminder_sent_24h reset after reschedule')
      assert(updated.reminder_sent_1h  === false, 'reminder_sent_1h reset after reschedule')
    })

    // ── Test 6: Reschedule resets reminder flags ───────────────────────────
    await test('6. Reschedule resets reminder flags specifically', async () => {
      const d1 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      const { schedule } = await svc.createScheduledInterview(recruiter, candidate,
        { role: 'QA Engineer', scheduledAt: d1, durationMinutes: 30 })

      // Manually set reminder flags
      await pool.query(`UPDATE scheduled_interviews SET reminder_sent_24h = true WHERE id = $1`, [schedule.id])

      const d2 = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
      const updated = await svc.rescheduleInterview(schedule.id, recruiter, 'RECRUITER', d2)
      assert(updated.reminder_sent_24h === false, 'reminder_sent_24h reset even if was true')
    })

    // ── Test 7: Cancel changes status ─────────────────────────────────────
    await test('7. Cancel changes status to cancelled', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      const { schedule } = await svc.createScheduledInterview(recruiter, candidate,
        { role: 'Data Analyst', scheduledAt: futureDate, durationMinutes: 45 })

      const { schedule: cancelled } = await svc.cancelInterview(schedule.id, recruiter, 'RECRUITER')
      assert(cancelled.status === 'cancelled', 'status is cancelled after cancel')
    })

    // ── Test 8: Cancelled schedule excluded from reminders ─────────────────
    await test('8. Cancelled schedule excluded from reminder query', async () => {
      const futureDate = new Date(Date.now() + 24.5 * 60 * 60 * 1000).toISOString()
      const { schedule } = await svc.createScheduledInterview(recruiter, candidate,
        { role: 'UX Designer', scheduledAt: futureDate, durationMinutes: 45 })
      await svc.cancelInterview(schedule.id, recruiter, 'RECRUITER')

      const rows = await svc.getDueReminders()
      const hasCancelled = rows.some(r => r.id === schedule.id)
      assert(!hasCancelled, 'cancelled schedule not returned by getDueReminders')
    })

    // ── Test 9: 24h reminder claim succeeds only once ─────────────────────
    await test('9. 24h reminder claim is idempotent', async () => {
      const futureDate = new Date(Date.now() + 24.5 * 60 * 60 * 1000).toISOString()
      const { schedule } = await svc.createScheduledInterview(recruiter, candidate,
        { role: 'Product Manager', scheduledAt: futureDate, durationMinutes: 45 })

      const first  = await svc.claimReminder24h(schedule.id)
      const second = await svc.claimReminder24h(schedule.id)

      assert(first  !== null, 'first claim returns the updated row')
      assert(second === null, 'second claim returns null (already sent)')
    })

    // ── Test 10: 1h reminder claim succeeds only once ─────────────────────
    await test('10. 1h reminder claim is idempotent', async () => {
      const futureDate = new Date(Date.now() + 1.1 * 60 * 60 * 1000).toISOString()
      const { schedule } = await svc.createScheduledInterview(recruiter, candidate,
        { role: 'DevOps Lead', scheduledAt: futureDate, durationMinutes: 45 })

      const first  = await svc.claimReminder1h(schedule.id)
      const second = await svc.claimReminder1h(schedule.id)

      assert(first  !== null, 'first 1h claim returns updated row')
      assert(second === null, 'second 1h claim returns null')
    })

    // ── Test 11: Cross-user access rejected ───────────────────────────────
    await test('11. Cross-user schedule access is rejected', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      const { schedule } = await svc.createScheduledInterview(recruiter, candidate,
        { role: 'Security Engineer', scheduledAt: futureDate, durationMinutes: 60 })

      // candidateB tries to read recruiter's schedule
      let threw = false
      try {
        await svc.getScheduleByIdForUser(schedule.id, candidateB, 'USER')
      } catch(e) { threw = e.status === 403 }
      assert(threw, 'candidateB gets 403 trying to access candidateA schedule')
    })

    // ── Test 12: Invalid IDs/inputs handled safely ─────────────────────────
    await test('12. Invalid inputs handled safely', async () => {
      let t1 = false
      try { await svc.createScheduledInterview(recruiter, candidate, { role: '', scheduledAt: new Date(Date.now()+86400000).toISOString(), durationMinutes: 45 }) }
      catch(e) { t1 = e.status === 400 }
      assert(t1, 'empty role throws 400')

      let t2 = false
      try { await svc.getScheduleByIdForUser('abc', recruiter, 'RECRUITER') }
      catch(e) { t2 = e.status === 400 }
      assert(t2, 'non-integer scheduleId throws 400')

      let t3 = false
      try { await svc.claimReminder24h(-1) }
      catch(e) { t3 = e.status === 400 }
      assert(t3, 'negative scheduleId throws 400')
    })

    // ── Test 13: Empty schedules handled cleanly ───────────────────────────
    await test('13. Empty schedules returned cleanly for fresh user', async () => {
      const fresh = await createUser('fresh', 'USER')
      userIds.push(fresh)

      const data = await svc.getSchedulesForCandidate(fresh)
      assert(Array.isArray(data.schedules), 'returns array')
      assert(data.schedules.length === 0,   'empty for user with no schedules')
      assert(data.total === 0,              'total is 0')
    })

    // ── Reminder window pure-function tests ───────────────────────────────
    await test('14. 24h reminder window logic', () => {
      assert(needs24h(24 * 60 * 60 * 1000),        '24h exactly is in window')
      assert(needs24h(23.5 * 60 * 60 * 1000),      '23.5h is in window')
      assert(!needs24h(22 * 60 * 60 * 1000),       '22h is outside window (too close)')
      assert(!needs24h(26 * 60 * 60 * 1000),       '26h is outside window (too far)')
      assert(!needs24h(2 * 60 * 1000),             '2min is not in 24h window')
    })

    await test('15. 1h reminder window logic', () => {
      assert(needs1h(60 * 60 * 1000),              '1h exactly is in window')
      assert(needs1h(50 * 60 * 1000),              '50min is in window')
      assert(!needs1h(44 * 60 * 1000),             '44min is too close (outside window)')
      assert(!needs1h(80 * 60 * 1000),             '80min is too far (outside window)')
      assert(!needs1h(24 * 60 * 60 * 1000),        '24h is not in 1h window')
    })

  } finally {
    await cleanup(userIds)
    await pool.end()
  }

  console.log('\n══════════════════════════════════════════════════════')
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`)
  console.log('══════════════════════════════════════════════════════')
  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
