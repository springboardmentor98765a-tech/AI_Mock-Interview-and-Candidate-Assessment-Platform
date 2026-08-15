'use strict'

const express = require('express')
const router  = express.Router()
const { authenticate } = require('../middleware/auth')
const ctrl    = require('../controllers/interviewController')

router.post('/recommend-roles', authenticate, ctrl.recommendRoles)
router.post('/generate',        authenticate, ctrl.generate)
router.post('/start',           authenticate, ctrl.start)
router.post('/pause',           authenticate, ctrl.pauseInterview)
router.post('/resume',          authenticate, ctrl.resumeInterview)
router.post('/submit',          authenticate, ctrl.submitAnswer)
router.post('/transcript-update', authenticate, ctrl.updateTranscript)
router.post('/complete',        authenticate, ctrl.complete)

router.get('/history', authenticate, ctrl.getHistory)
router.get('/stats',   authenticate, ctrl.getStats)
router.get('/',        authenticate, ctrl.getAll)
router.get('/:id',     authenticate, ctrl.getById)

router.delete('/:id',  authenticate, ctrl.deleteInterview)

module.exports = router
