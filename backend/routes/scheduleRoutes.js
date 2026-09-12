'use strict'

/**
 * scheduleRoutes.js — Module 9 Chunk 2
 * Mounted at: /api/schedules
 *
 * All routes require authentication.
 * RBAC is enforced inside the controller, not via middleware,
 * so the same routes can serve USER/RECRUITER/ADMIN with different
 * views rather than requiring separate route trees.
 *
 * GET    /api/schedules       — list (role-scoped)
 * GET    /api/schedules/:id   — single (ownership enforced)
 * POST   /api/schedules       — create (RECRUITER/ADMIN only)
 * PATCH  /api/schedules/:id   — reschedule (RECRUITER/ADMIN only)
 * DELETE /api/schedules/:id   — cancel (RECRUITER/ADMIN only)
 */

const express = require('express')
const router  = express.Router()
const { authenticate } = require('../middleware/auth')
const ctrl = require('../controllers/scheduleController')

router.use(authenticate)

router.get('/',     ctrl.getSchedules)
router.post('/',    ctrl.createSchedule)
router.get('/:id',    ctrl.getScheduleById)
router.patch('/:id',  ctrl.rescheduleInterview)
router.delete('/:id', ctrl.cancelSchedule)

module.exports = router
