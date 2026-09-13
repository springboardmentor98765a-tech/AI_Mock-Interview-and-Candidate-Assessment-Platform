'use strict'

/**
 * backend/routes/sttRoutes.js
 *
 * STT bridge routes — used by the interview flow to transcribe candidate answers.
 *
 * POST /api/stt/transcribe   — upload audio, get transcript (requires auth)
 * GET  /api/stt/health       — check Python service liveness (requires auth)
 */

const express      = require('express')
const router       = express.Router()
const multer       = require('multer')
const { authenticate }  = require('../middleware/auth')
const { sttLimiter }    = require('../middleware/rateLimiter')
const sttService   = require('../services/sttService')

// Keep audio in memory — no disk writes
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 25 * 1024 * 1024 }, // 25 MB max per audio file
})

// GET /api/stt/health
// Requires authentication — prevents unauthenticated service probing
router.get('/health', authenticate, async (req, res) => {
  try {
    const status = await sttService.healthCheck()
    res.status(200).json({ success: true, stt: status })
  } catch (err) {
    res.status(503).json({ success: false, message: err.message })
  }
})

// POST /api/stt/transcribe
// Requires authentication + rate limiting.
// A normal interview session transcribes 8-10 answers per interview, well
// within the sttLimiter window of 60 requests / 15 minutes.
router.post(
  '/transcribe',
  authenticate,
  sttLimiter,
  upload.single('audio'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No audio file provided. Send multipart/form-data with field "audio".',
        })
      }

      const filename = req.file.originalname || 'audio.bin'
      const result   = await sttService.transcribe(req.file.buffer, filename)

      return res.status(200).json({
        success:             true,
        transcript:          result.transcript,
        language:            result.language,
        languageProbability: result.language_probability,
        durationS:           result.duration_s,
        bytes:               req.file.size,
        // Speech analysis metadata from Faster-Whisper
        audio_duration_s:    result.audio_duration_s   ?? null,
        segments_meta:       result.segments_meta       ?? [],
      })
    } catch (err) {
      next(err)
    }
  }
)

module.exports = router
