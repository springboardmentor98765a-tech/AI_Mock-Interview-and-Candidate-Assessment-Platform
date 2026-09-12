'use strict'

/**
 * test_notification_service.js — Module 9: Notification System Foundation
 *
 * Deterministic integration tests for notificationService.js against the
 * project's real PostgreSQL database.
 *
 * Tests:
 *   1.  Notification creation (internal)
 *   2.  User-scoped retrieval
 *   3.  Unread count
 *   4.  Mark single notification read
 *   5.  Mark all notifications read
 *   6.  Cross-user isolation: cannot retrieve another user's notification
 *   7.  Cross-user isolation: cannot mark another user's notification read
 *   8.  Preference retrieval
 *   9.  Preference update
 *  10.  Empty notification state
 *  11.  Invalid input handling
 *
 * NOTE: Creates temporary test users and cleans them up after each run.
 *       Requires a running PostgreSQL database matching .env configuration.
 *       Does NOT require any email provider.
 */

require('dotenv').config()

const { pool, initDatabase } = require('./config/database')
const svc = require('./services/notificationService')

/* ─── Minimal test harness (matches project style) ──────────────────────── */
let passed = 0
let failed = 0

function assert(cond, msg) {
  if (cond) {
    passed++
    console.log('    ✓', msg)
  } else {
    failed++
    console.error('    ✗ FAIL:', msg)
  }
}

async function test(name, fn) {
  console.log('\n▶', name)
  try {
    await fn()
  } catch (e) {
    failed++
    console.error('    ✗ FAIL: threw', e.message)
  }
}

/* ─── Seed helpers ───────────────────────────────────────────────────────── */
async function createTestUser(suffix) {
  const email = `test_notif_${suffix}_${Date.now()}@example.com`
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role, provider)
     VALUES ($1, $2, 'hashed', 'USER', 'LOCAL')
     RETURNING id`,
    [`Test User ${suffix}`, email]
  )
  return result.rows[0].id
}

async function cleanupTestUsers(ids) {
  if (!ids || ids.length === 0) return
  await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [ids])
}

/* ─── Test runner ────────────────────────────────────────────────────────── */
async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('Module 9 — Notification Service Tests')
  console.log('═══════════════════════════════════════════════════════════')

  // Ensure migrations are applied before running tests
  await initDatabase()

  const testUsers = []
  let userA, userB

  try {
    userA = await createTestUser('A')
    userB = await createTestUser('B')
    testUsers.push(userA, userB)

    /* ── Test 1: Notification creation ──────────────────────────────────── */
    await test('1. Notification creation', async () => {
      const n = await svc.createNotification({
        userId:  userA,
        type:    'interview_complete',
        title:   'Interview Completed',
        message: 'Your mock interview score is ready.',
        data:    { interviewId: 42 },
      })
      assert(n && n.id > 0,          'created notification has a positive id')
      assert(n.user_id === userA,     'user_id matches the requesting user')
      assert(n.type === 'interview_complete', 'type stored correctly')
      assert(n.title === 'Interview Completed', 'title stored correctly')
      assert(n.is_read === false,     'new notification defaults to unread')
      assert(n.data && n.data.interviewId === 42, 'JSONB data stored correctly')
    })

    /* ── Test 2: User-scoped retrieval ───────────────────────────────────── */
    await test('2. User-scoped retrieval', async () => {
      // Create one more for userA
      await svc.createNotification({
        userId: userA, type: 'report_ready', title: 'Report Ready', message: 'Your report is ready.',
      })
      // Create one for userB (should NOT appear in userA's list)
      await svc.createNotification({
        userId: userB, type: 'test', title: 'B Notif', message: 'For user B only.',
      })

      const data = await svc.getNotificationsForUser(userA)
      assert(Array.isArray(data.notifications),  'returns notifications array')
      assert(data.notifications.length >= 2,     'userA has at least 2 notifications')
      assert(data.notifications.every(n => n.user_id === userA), 'all notifications belong to userA')
      assert(typeof data.total === 'number',     'total is a number')
      assert(typeof data.unreadCount === 'number', 'unreadCount is a number')
    })

    /* ── Test 3: Unread count ─────────────────────────────────────────────── */
    await test('3. Unread count', async () => {
      const count = await svc.getUnreadCount(userA)
      assert(typeof count === 'number', 'getUnreadCount returns a number')
      assert(count >= 2, 'userA has at least 2 unread notifications')

      const countB = await svc.getUnreadCount(userB)
      assert(countB >= 1, 'userB has at least 1 unread notification')
    })

    /* ── Test 4: Mark single notification read ───────────────────────────── */
    await test('4. Mark single notification read', async () => {
      const data = await svc.getNotificationsForUser(userA)
      const unreadNotif = data.notifications.find(n => !n.is_read)
      assert(!!unreadNotif, 'there is at least one unread notification for userA')

      const updated = await svc.markNotificationRead(userA, unreadNotif.id)
      assert(updated !== null,         'markNotificationRead returns the updated row')
      assert(updated.is_read === true, 'notification is now marked as read')
      assert(updated.user_id === userA, 'updated notification belongs to userA')

      const newCount = await svc.getUnreadCount(userA)
      assert(newCount === data.unreadCount - 1, 'unread count decreased by 1')
    })

    /* ── Test 5: Mark all notifications read ─────────────────────────────── */
    await test('5. Mark all notifications read', async () => {
      const countBefore = await svc.getUnreadCount(userA)

      if (countBefore > 0) {
        const updated = await svc.markAllNotificationsRead(userA)
        assert(updated >= 1, 'at least one row was updated')
      } else {
        // Add a new unread one and test
        await svc.createNotification({
          userId: userA, type: 'test', title: 'New Notif', message: 'Just added.',
        })
        const updated = await svc.markAllNotificationsRead(userA)
        assert(updated >= 1, 'at least one row was updated')
      }

      const countAfter = await svc.getUnreadCount(userA)
      assert(countAfter === 0, 'all notifications for userA are now read')
    })

    /* ── Test 6: Cross-user isolation — retrieval ────────────────────────── */
    await test('6. Cross-user isolation: cannot see another user\'s notification', async () => {
      // Get userB's notification ids
      const dataB = await svc.getNotificationsForUser(userB)
      const bIds = dataB.notifications.map(n => n.id)
      assert(bIds.length >= 1, 'userB has at least one notification')

      // userA's list must not contain any of userB's ids
      const dataA = await svc.getNotificationsForUser(userA)
      const aIds = dataA.notifications.map(n => n.id)
      const overlap = bIds.filter(id => aIds.includes(id))
      assert(overlap.length === 0, 'userA cannot see userB\'s notifications')
    })

    /* ── Test 7: Cross-user isolation — mark read ────────────────────────── */
    await test('7. Cross-user isolation: cannot mark another user\'s notification read', async () => {
      // Add a fresh unread notification for userB
      const bNotif = await svc.createNotification({
        userId: userB, type: 'test', title: 'B Fresh', message: 'Fresh for B.',
      })
      assert(bNotif.is_read === false, 'userB notification is unread')

      // userA tries to mark it — must return null (not found for this user)
      const result = await svc.markNotificationRead(userA, bNotif.id)
      assert(result === null, 'markNotificationRead returns null when notification is not owned by user')

      // Confirm userB's notification is still unread
      const dataB = await svc.getNotificationsForUser(userB)
      const still = dataB.notifications.find(n => n.id === bNotif.id)
      assert(still && still.is_read === false, 'userB\'s notification remains unread after cross-user attempt')
    })

    /* ── Test 8: Preference retrieval ───────────────────────────────────── */
    await test('8. Preference retrieval', async () => {
      const prefs = await svc.getNotificationPreferences(userA)
      assert(typeof prefs.emailEnabled     === 'boolean', 'emailEnabled is a boolean')
      assert(typeof prefs.remindersEnabled === 'boolean', 'remindersEnabled is a boolean')
      assert(typeof prefs.reportsEnabled   === 'boolean', 'reportsEnabled is a boolean')
      // Defaults should be true
      assert(prefs.emailEnabled     === true, 'emailEnabled defaults to true')
      assert(prefs.remindersEnabled === true, 'remindersEnabled defaults to true')
      assert(prefs.reportsEnabled   === true, 'reportsEnabled defaults to true')
    })

    /* ── Test 9: Preference update ──────────────────────────────────────── */
    await test('9. Preference update', async () => {
      // Disable email notifications
      const updated = await svc.updateNotificationPreferences(userA, { emailEnabled: false })
      assert(updated.emailEnabled === false,     'emailEnabled updated to false')
      assert(updated.remindersEnabled === true,  'remindersEnabled unchanged')
      assert(updated.reportsEnabled   === true,  'reportsEnabled unchanged')

      // Verify persistence
      const verify = await svc.getNotificationPreferences(userA)
      assert(verify.emailEnabled === false, 'preference persisted after update')

      // Restore
      await svc.updateNotificationPreferences(userA, { emailEnabled: true })
      const restored = await svc.getNotificationPreferences(userA)
      assert(restored.emailEnabled === true, 'preference restored after second update')
    })

    /* ── Test 10: Empty notification state ──────────────────────────────── */
    await test('10. Empty notification state', async () => {
      // Create a fresh user with no notifications
      const freshUser = await createTestUser('empty')
      testUsers.push(freshUser)

      const data = await svc.getNotificationsForUser(freshUser)
      assert(Array.isArray(data.notifications),  'returns an array even when empty')
      assert(data.notifications.length === 0,    'empty array for user with no notifications')
      assert(data.total === 0,                   'total is 0')
      assert(data.unreadCount === 0,             'unreadCount is 0')

      const count = await svc.getUnreadCount(freshUser)
      assert(count === 0, 'getUnreadCount returns 0 for user with no notifications')
    })

    /* ── Test 11: Invalid input handling ─────────────────────────────────── */
    await test('11. Invalid input handling', async () => {
      // createNotification: missing required fields
      let threw = false
      try {
        await svc.createNotification({ userId: userA, type: 'test' }) // missing title/message
      } catch (e) {
        threw = true
      }
      assert(threw, 'createNotification throws when required fields are missing')

      // markNotificationRead: non-integer id
      let threw2 = false
      try {
        await svc.markNotificationRead(userA, 'not-an-id')
      } catch (e) {
        threw2 = true
      }
      assert(threw2, 'markNotificationRead throws on non-integer id')

      // markNotificationRead: negative id
      let threw3 = false
      try {
        await svc.markNotificationRead(userA, -5)
      } catch (e) {
        threw3 = true
      }
      assert(threw3, 'markNotificationRead throws on negative id')

      // updateNotificationPreferences: non-boolean value
      let threw4 = false
      try {
        await svc.updateNotificationPreferences(userA, { emailEnabled: 'yes' })
      } catch (e) {
        threw4 = true
      }
      assert(threw4, 'updateNotificationPreferences throws on non-boolean value')

      // Pagination: getNotificationsForUser with limit 0 → clamps to 1
      const clamped = await svc.getNotificationsForUser(userA, { limit: 0 })
      assert(Array.isArray(clamped.notifications), 'getNotificationsForUser handles limit=0 gracefully')
    })

  } finally {
    // Clean up test users (cascades to notifications)
    await cleanupTestUsers(testUsers)
    await pool.end()
  }

  /* ─── Summary ─────────────────────────────────────────────────────────── */
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`)
  console.log('═══════════════════════════════════════════════════════════')
  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
