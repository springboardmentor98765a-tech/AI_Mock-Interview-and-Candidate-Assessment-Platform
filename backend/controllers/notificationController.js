'use strict'

/**
 * notificationController.js — Module 9: Notification System Foundation
 *
 * Thin HTTP controller layer.  All business logic lives in notificationService.
 *
 * Routes (mounted at /api/notifications):
 *   GET    /api/notifications                — list notifications for auth user
 *   PATCH  /api/notifications/:id/read       — mark one notification as read
 *   PATCH  /api/notifications/read-all       — mark all notifications as read
 *   GET    /api/notifications/preferences    — get notification preferences
 *   PUT    /api/notifications/preferences    — update notification preferences
 *
 * SECURITY:
 *   - All endpoints require authentication (enforced by the router).
 *   - User identity is always taken from req.user.id (the verified JWT).
 *   - The client-supplied notification ID is validated as a positive integer
 *     and the service enforces ownership via WHERE user_id = req.user.id.
 *   - No endpoint allows creating notifications from the client.
 */

const svc = require('../services/notificationService')

/* ─── GET /api/notifications ─────────────────────────────────────────────────
   Returns the notification list and unread count for the authenticated user.
   Query params: ?limit=20&offset=0
─────────────────────────────────────────────────────────────────────────────── */
async function getNotifications(req, res) {
  try {
    const userId = req.user.id
    const limit  = req.query.limit  ? parseInt(req.query.limit,  10) : 20
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0

    if (isNaN(limit) || limit < 1) {
      return res.status(400).json({ success: false, message: 'limit must be a positive integer' })
    }
    if (isNaN(offset) || offset < 0) {
      return res.status(400).json({ success: false, message: 'offset must be a non-negative integer' })
    }

    const data = await svc.getNotificationsForUser(userId, { limit, offset })
    return res.status(200).json({ success: true, ...data })
  } catch (err) {
    console.error('[notificationController.getNotifications]', err.message)
    return res.status(500).json({ success: false, message: 'Failed to load notifications' })
  }
}

/* ─── PATCH /api/notifications/:id/read ─────────────────────────────────────
   Marks a single notification as read.  Enforces ownership via the service.
─────────────────────────────────────────────────────────────────────────────── */
async function markRead(req, res) {
  try {
    const userId = req.user.id
    const id     = parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'Notification ID must be a positive integer' })
    }

    const updated = await svc.markNotificationRead(userId, id)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found' })
    }
    return res.status(200).json({ success: true, notification: updated })
  } catch (err) {
    console.error('[notificationController.markRead]', err.message)
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read' })
  }
}

/* ─── PATCH /api/notifications/read-all ─────────────────────────────────────
   Marks all of the authenticated user's unread notifications as read.
─────────────────────────────────────────────────────────────────────────────── */
async function markAllRead(req, res) {
  try {
    const userId  = req.user.id
    const updated = await svc.markAllNotificationsRead(userId)
    return res.status(200).json({ success: true, updatedCount: updated })
  } catch (err) {
    console.error('[notificationController.markAllRead]', err.message)
    return res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' })
  }
}

/* ─── GET /api/notifications/preferences ────────────────────────────────────
   Returns the notification preference flags for the authenticated user.
─────────────────────────────────────────────────────────────────────────────── */
async function getPreferences(req, res) {
  try {
    const userId = req.user.id
    const prefs  = await svc.getNotificationPreferences(userId)
    return res.status(200).json({ success: true, preferences: prefs })
  } catch (err) {
    console.error('[notificationController.getPreferences]', err.message)
    return res.status(500).json({ success: false, message: 'Failed to load notification preferences' })
  }
}

/* ─── PUT /api/notifications/preferences ────────────────────────────────────
   Updates one or more notification preference flags.
   Body: { emailEnabled?, remindersEnabled?, reportsEnabled? } — all booleans.
─────────────────────────────────────────────────────────────────────────────── */
async function updatePreferences(req, res) {
  try {
    const userId = req.user.id
    const { emailEnabled, remindersEnabled, reportsEnabled } = req.body || {}

    // Validate: any supplied field must be a boolean
    const incoming = { emailEnabled, remindersEnabled, reportsEnabled }
    for (const [key, val] of Object.entries(incoming)) {
      if (val !== undefined && typeof val !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: `${key} must be a boolean`,
        })
      }
    }

    const prefs = await svc.updateNotificationPreferences(userId, {
      emailEnabled,
      remindersEnabled,
      reportsEnabled,
    })
    return res.status(200).json({ success: true, preferences: prefs })
  } catch (err) {
    console.error('[notificationController.updatePreferences]', err.message)
    return res.status(500).json({ success: false, message: 'Failed to update notification preferences' })
  }
}

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
  getPreferences,
  updatePreferences,
}
