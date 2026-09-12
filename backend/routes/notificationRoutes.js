'use strict'

/**
 * notificationRoutes.js — Module 9: Notification System Foundation
 *
 * Mounts at: /api/notifications
 *
 * All routes require a valid JWT (authenticate middleware).
 * No RBAC loosening — every authenticated role (USER / RECRUITER / ADMIN)
 * can access only their own notifications.
 *
 * Routes:
 *   GET    /api/notifications                — get notification list + unread count
 *   PATCH  /api/notifications/read-all       — mark all as read
 *   PATCH  /api/notifications/:id/read       — mark one as read
 *   GET    /api/notifications/preferences    — get preferences
 *   PUT    /api/notifications/preferences    — update preferences
 *
 * NOTE: /read-all is registered BEFORE /:id/read so that Express does not
 * accidentally match "read-all" as a :id parameter.
 *
 * There is intentionally NO POST /api/notifications route.
 * Notification creation is an internal backend capability only.
 */

const express = require('express')
const router  = express.Router()
const { authenticate } = require('../middleware/auth')
const ctrl = require('../controllers/notificationController')

// All notification endpoints require authentication
router.use(authenticate)

// Notifications list
router.get('/', ctrl.getNotifications)

// Mark all as read — must be BEFORE /:id/read to avoid param collision
router.patch('/read-all', ctrl.markAllRead)

// Mark a single notification as read
router.patch('/:id/read', ctrl.markRead)

// Notification preferences
router.get('/preferences',  ctrl.getPreferences)
router.put('/preferences',  ctrl.updatePreferences)

module.exports = router
