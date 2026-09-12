'use strict'

/**
 * adminController.js — Module 8: Admin Dashboard (Requirements 16–20)
 *
 * Thin HTTP controller layer. All business logic lives in adminService.js.
 * All routes here are protected by authorize('ADMIN') in adminRoutes.js.
 */

const adminService       = require('../services/adminService')
const notificationService = require('../services/notificationService')
const { pool }            = require('../config/database')

/* ─── GET /api/admin/stats ───────────────────────────────────────────────── */
async function getAdminStats(req, res) {
  try {
    const data = await adminService.getAdminStats()
    return res.status(200).json({ success: true, ...data })
  } catch (err) {
    console.error('[adminController.getAdminStats]', err.message)
    return res.status(500).json({ success: false, message: 'Failed to load admin stats' })
  }
}

/* ─── GET /api/admin/users ───────────────────────────────────────────────── */
async function getUserList(req, res) {
  try {
    const {
      page     = 1,
      pageSize = 20,
      role     = '',
      status   = '',
      search   = '',
    } = req.query

    const data = await adminService.getUserList({
      page:     parseInt(page, 10)     || 1,
      pageSize: parseInt(pageSize, 10) || 20,
      role:     String(role   || ''),
      status:   String(status || ''),
      search:   String(search || ''),
    })

    return res.status(200).json({ success: true, ...data })
  } catch (err) {
    console.error('[adminController.getUserList]', err.message)
    return res.status(500).json({ success: false, message: 'Failed to load user list' })
  }
}

/* ─── PUT /api/admin/users/:id/role ─────────────────────────────────────── */
async function updateUserRole(req, res) {
  try {
    const userId = parseInt(req.params.id, 10)
    const { role } = req.body

    if (!role || typeof role !== 'string') {
      return res.status(400).json({ success: false, message: 'role is required' })
    }

    // Prevent admin from removing their own admin role accidentally
    if (userId === req.user.id && role.toUpperCase() !== 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Cannot change your own admin role' })
    }

    const updated = await adminService.updateUserRole(userId, role.toUpperCase())
    return res.status(200).json({ success: true, user: updated })
  } catch (err) {
    console.error('[adminController.updateUserRole]', err.message)
    if (err.message === 'User not found') {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    if (err.message.startsWith('Invalid role')) {
      return res.status(400).json({ success: false, message: err.message })
    }
    return res.status(500).json({ success: false, message: 'Failed to update user role' })
  }
}

/* ─── PUT /api/admin/users/:id/status ───────────────────────────────────── */
async function toggleUserStatus(req, res) {
  try {
    const userId = parseInt(req.params.id, 10)
    const { active } = req.body

    if (typeof active !== 'boolean') {
      return res.status(400).json({ success: false, message: 'active (boolean) is required' })
    }

    // Prevent admin from blocking themselves
    if (userId === req.user.id && !active) {
      return res.status(400).json({ success: false, message: 'Cannot block your own admin account' })
    }

    const updated = await adminService.toggleUserStatus(userId, active)
    return res.status(200).json({ success: true, user: updated })
  } catch (err) {
    console.error('[adminController.toggleUserStatus]', err.message)
    if (err.message === 'User not found') {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    return res.status(500).json({ success: false, message: 'Failed to update user status' })
  }
}

/* ─── GET /api/admin/interviews/activity ────────────────────────────────── */
async function getInterviewActivity(req, res) {
  try {
    const data = await adminService.getInterviewActivity()
    return res.status(200).json({ success: true, ...data })
  } catch (err) {
    console.error('[adminController.getInterviewActivity]', err.message)
    return res.status(500).json({ success: false, message: 'Failed to load interview activity' })
  }
}

/* ─── GET /api/admin/ai-monitoring ──────────────────────────────────────── */
async function getAiMonitoring(req, res) {
  try {
    const data = await adminService.getAiMonitoring()
    return res.status(200).json({ success: true, ...data })
  } catch (err) {
    console.error('[adminController.getAiMonitoring]', err.message)
    return res.status(500).json({ success: false, message: 'Failed to load AI monitoring data' })
  }
}

/* ─── GET /api/admin/system-health ──────────────────────────────────────── */
async function getSystemHealth(req, res) {
  try {
    const data = await adminService.getSystemHealth()
    return res.status(200).json({ success: true, ...data })
  } catch (err) {
    console.error('[adminController.getSystemHealth]', err.message)
    return res.status(500).json({ success: false, message: 'Failed to load system health' })
  }
}

/* ─── GET /api/admin/usage-analytics ────────────────────────────────────── */
async function getUsageAnalytics(req, res) {
  try {
    const data = await adminService.getUsageAnalytics()
    return res.status(200).json({ success: true, ...data })
  } catch (err) {
    console.error('[adminController.getUsageAnalytics]', err.message)
    return res.status(500).json({ success: false, message: 'Failed to load usage analytics' })
  }
}

/* ─── POST /api/admin/notifications ─────────────────────────────────────── */

/**
 * Broadcasts an in-app notification to all users of a given target role.
 * Supported targets: ALL_CANDIDATES, ALL_RECRUITERS, ALL_USERS
 *
 * Security:
 *  - ADMIN only (enforced in route middleware)
 *  - title ≤ 120 chars, message ≤ 600 chars
 *  - target must be one of the allowed enum values
 *  - HTML stripped from title/message (plain text only)
 *  - Batched in pages of 100 to avoid large memory allocation
 *  - Idempotent per send (no deduplication needed — this is an explicit admin action)
 */
const ALLOWED_TARGETS = new Set(['ALL_CANDIDATES', 'ALL_RECRUITERS', 'ALL_USERS'])

function stripHtml(str) {
  return String(str || '').replace(/<[^>]*>/g, '').trim()
}

async function broadcastNotification(req, res) {
  try {
    const { title: rawTitle, message: rawMessage, target } = req.body

    const title   = stripHtml(rawTitle)
    const message = stripHtml(rawMessage)

    if (!title || title.length > 120) {
      return res.status(400).json({ success: false, message: 'title must be 1–120 characters (plain text)' })
    }
    if (!message || message.length > 600) {
      return res.status(400).json({ success: false, message: 'message must be 1–600 characters (plain text)' })
    }
    if (!target || !ALLOWED_TARGETS.has(String(target).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `target must be one of: ${[...ALLOWED_TARGETS].join(', ')}`,
      })
    }

    const resolvedTarget = String(target).toUpperCase()

    // Determine which role(s) to notify
    const roleFilter = {
      ALL_CANDIDATES: ['USER'],
      ALL_RECRUITERS: ['RECRUITER'],
      ALL_USERS:      ['USER', 'RECRUITER', 'ADMIN'],
    }[resolvedTarget]

    // Paginated fetch: 100 users per batch
    const PAGE_SIZE = 100
    let offset      = 0
    let totalSent   = 0
    let batch

    do {
      batch = await pool.query(
        `SELECT id FROM users
         WHERE role = ANY($1::text[]) AND active = true
         ORDER BY id
         LIMIT $2 OFFSET $3`,
        [roleFilter, PAGE_SIZE, offset]
      )

      for (const row of batch.rows) {
        await notificationService.createNotification({
          userId:  row.id,
          type:    'ADMIN_BROADCAST',
          title,
          message,
          data:    { broadcastBy: req.user.id, target: resolvedTarget },
        }).catch(e => console.warn(`[adminController] broadcast notif user=${row.id} failed:`, e.message))
        totalSent++
      }

      offset += PAGE_SIZE
    } while (batch.rows.length === PAGE_SIZE)

    console.info(`[adminController] Broadcast "${title}" → target=${resolvedTarget}, sent=${totalSent}`)
    return res.status(200).json({ success: true, totalSent, target: resolvedTarget })
  } catch (err) {
    console.error('[adminController.broadcastNotification]', err.message)
    return res.status(500).json({ success: false, message: 'Failed to broadcast notification' })
  }
}

module.exports = {
  getAdminStats,
  getUserList,
  updateUserRole,
  toggleUserStatus,
  getInterviewActivity,
  getAiMonitoring,
  getSystemHealth,
  getUsageAnalytics,
  broadcastNotification,
}
