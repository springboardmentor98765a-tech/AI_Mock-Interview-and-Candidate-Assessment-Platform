'use strict'

/**
 * backend/routes/sttRoutes.js
 *
 * Minimal STT test endpoint.
 * NOT connected to the interview flow yet — testing bridge only.
 *
 * POST /api/stt/transcribe   — upload audio, get transcript
 * GET  /api/stt/health       — check Python service liveness
 */

const express    = require('express')
const router     = express.Router()
const multer     = require('multer')
const sttService = require('../services/sttService')

// Keep audio in memory — no disk writes for the test endpoint
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 25 * 1024 * 1024 }, // 25 MB max
})

// GET /api/stt/health
router.get('/health', async (req, res, next) => {
  try {
    const status = await sttService.healthCheck()
    res.status(200).json({ success: true, stt: status })
  } catch (err) {
    res.status(503).json({ success: false, message: err.message })
  }
})

// POST /api/stt/transcribe
// Expects multipart/form-data with field "audio" containing the audio file
router.post('/transcribe', upload.single('audio'), async (req, res, next) => {
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
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
