'use strict'

/**
 * notificationService.js — Module 9: Notification System Foundation
 *
 * Internal service for creating and managing persistent in-app notifications.
 * All database operations are parameterised and strictly scoped to the
 * authenticated user's user_id.
 *
 * Public surface (for use by other backend modules):
 *   createNotification({ userId, type, title, message, data })
 *   getNotificationsForUser(userId, { limit, offset })
 *   getUnreadCount(userId)
 *   markNotificationRead(userId, notificationId)
 *   markAllNotificationsRead(userId)
 *   getNotificationPreferences(userId)
 *   updateNotificationPreferences(userId, preferences)
 *
 * SECURITY: There is NO public HTTP endpoint for creating notifications.
 * Creation is an internal backend capability called by future Module 9 workers.
 */

const { pool } = require('../config/database')

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const DEFAULT_LIMIT  = 20
const MAX_LIMIT      = 100

/* ─── createNotification ─────────────────────────────────────────────────────
   Internal only — called by backend workers/controllers, never from client.
   Returns the newly created notification row.
─────────────────────────────────────────────────────────────────────────────── */
async function createNotification({ userId, type, title, message, data = {} }) {
  if (!userId || !type || !title || !message) {
    throw new Error('createNotification: userId, type, title, and message are required')
  }

  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, type, title, message, JSON.stringify(data)]
  )
  return result.rows[0]
}

/* ─── getNotificationsForUser ────────────────────────────────────────────────
   Returns a paginated list of notifications for userId plus the total unread
   count.  Strictly scoped: WHERE user_id = $1.
─────────────────────────────────────────────────────────────────────────────── */
async function getNotificationsForUser(userId, { limit = DEFAULT_LIMIT, offset = 0 } = {}) {
  const safeLimit  = Math.min(Math.max(1, parseInt(limit,  10) || DEFAULT_LIMIT), MAX_LIMIT)
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0)

  const [listResult, countResult] = await Promise.all([
    pool.query(
      `SELECT id, user_id, type, title, message, data, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, safeLimit, safeOffset]
    ),
    pool.query(
      `SELECT COUNT(*) AS total FROM notifications WHERE user_id = $1`,
      [userId]
    ),
  ])

  const unreadResult = await pool.query(
    `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  )

  return {
    notifications: listResult.rows,
    total:         parseInt(countResult.rows[0].total,  10),
    unreadCount:   parseInt(unreadResult.rows[0].unread, 10),
    limit:         safeLimit,
    offset:        safeOffset,
  }
}

/* ─── getUnreadCount ─────────────────────────────────────────────────────────
   Returns the integer count of unread notifications for userId.
─────────────────────────────────────────────────────────────────────────────── */
async function getUnreadCount(userId) {
  const result = await pool.query(
    `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  )
  return parseInt(result.rows[0].unread, 10)
}

/* ─── markNotificationRead ───────────────────────────────────────────────────
   Marks a single notification as read.  The WHERE clause enforces user_id
   ownership — a client cannot mark another user's notification.
   Returns the updated row, or null if not found / not owned.
─────────────────────────────────────────────────────────────────────────────── */
async function markNotificationRead(userId, notificationId) {
  const id = parseInt(notificationId, 10)
  if (!Number.isInteger(id) || id < 1) {
    throw new Error('markNotificationRead: notificationId must be a positive integer')
  }

  const result = await pool.query(
    `UPDATE notifications
     SET is_read = true
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId]
  )
  return result.rows[0] || null
}

/* ─── markAllNotificationsRead ───────────────────────────────────────────────
   Marks ALL unread notifications for userId as read.
   Returns the count of updated rows.
─────────────────────────────────────────────────────────────────────────────── */
async function markAllNotificationsRead(userId) {
  const result = await pool.query(
    `UPDATE notifications
     SET is_read = true
     WHERE user_id = $1 AND is_read = false`,
    [userId]
  )
  return result.rowCount
}

/* ─── getNotificationPreferences ─────────────────────────────────────────────
   Returns the notification preference flags for userId.
─────────────────────────────────────────────────────────────────────────────── */
async function getNotificationPreferences(userId) {
  const result = await pool.query(
    `SELECT notif_email_enabled, notif_reminders_enabled, notif_reports_enabled
     FROM users
     WHERE id = $1`,
    [userId]
  )
  if (!result.rows[0]) {
    throw new Error('getNotificationPreferences: user not found')
  }
  return {
    emailEnabled:     result.rows[0].notif_email_enabled,
    remindersEnabled: result.rows[0].notif_reminders_enabled,
    reportsEnabled:   result.rows[0].notif_reports_enabled,
  }
}

/* ─── updateNotificationPreferences ──────────────────────────────────────────
   Accepts an object with one or more of { emailEnabled, remindersEnabled,
   reportsEnabled } (all booleans).  Only the supplied keys are updated.
   Returns the updated preferences.
─────────────────────────────────────────────────────────────────────────────── */
async function updateNotificationPreferences(userId, preferences) {
  const { emailEnabled, remindersEnabled, reportsEnabled } = preferences || {}

  const setClauses = []
  const values     = []

  if (emailEnabled !== undefined) {
    if (typeof emailEnabled !== 'boolean') {
      throw new Error('updateNotificationPreferences: emailEnabled must be boolean')
    }
    values.push(emailEnabled)
    setClauses.push(`notif_email_enabled = $${values.length}`)
  }
  if (remindersEnabled !== undefined) {
    if (typeof remindersEnabled !== 'boolean') {
      throw new Error('updateNotificationPreferences: remindersEnabled must be boolean')
    }
    values.push(remindersEnabled)
    setClauses.push(`notif_reminders_enabled = $${values.length}`)
  }
  if (reportsEnabled !== undefined) {
    if (typeof reportsEnabled !== 'boolean') {
      throw new Error('updateNotificationPreferences: reportsEnabled must be boolean')
    }
    values.push(reportsEnabled)
    setClauses.push(`notif_reports_enabled = $${values.length}`)
  }

  if (setClauses.length === 0) {
    // Nothing to update — return current state
    return getNotificationPreferences(userId)
  }

  values.push(userId)
  const result = await pool.query(
    `UPDATE users
     SET ${setClauses.join(', ')}
     WHERE id = $${values.length}
     RETURNING notif_email_enabled, notif_reminders_enabled, notif_reports_enabled`,
    values
  )
  if (!result.rows[0]) {
    throw new Error('updateNotificationPreferences: user not found')
  }
  return {
    emailEnabled:     result.rows[0].notif_email_enabled,
    remindersEnabled: result.rows[0].notif_reminders_enabled,
    reportsEnabled:   result.rows[0].notif_reports_enabled,
  }
}

/* ─── Exports ────────────────────────────────────────────────────────────────── */
module.exports = {
  createNotification,
  getNotificationsForUser,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
}
