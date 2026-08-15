const express = require('express')
const router  = express.Router()
const { authenticate, authorize } = require('../middleware/auth')
const { verifyToken } = require('../utils/jwt')
const ctrl    = require('../controllers/recordingController')
const { uploadRecording } = require('../config/multerRecording')

// Soft auth: sets req.user from Bearer header OR ?token= query param, never rejects.
// The controller itself enforces the access rules.
function softAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try { req.user = verifyToken(authHeader.split(' ')[1]) } catch (_) {}
  }
  // query-param fallback handled inside the controller for stream
  next()
}

// Candidate uploads their own recording after interview ends
router.post(
  '/upload',
  authenticate,
  uploadRecording.single('recording'),
  ctrl.uploadRecordingHandler
)

// Stream a recording file (soft-auth: also accepts ?token= for <video src> / <a href>)
router.get('/:id/stream', softAuthenticate, ctrl.streamRecording)

// List recordings for an interview
router.get('/interview/:interviewId', authenticate, ctrl.listByInterview)

// RECRUITER / ADMIN — all completed interview results
router.get('/results', authenticate, authorize('RECRUITER', 'ADMIN'), ctrl.getInterviewResults)

// RECRUITER / ADMIN — single interview detail with per-question scores
router.get('/results/:interviewId', authenticate, authorize('RECRUITER', 'ADMIN'), ctrl.getInterviewDetail)

module.exports = router
