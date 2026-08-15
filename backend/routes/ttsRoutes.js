'use strict'

const express             = require('express')
const router              = express.Router()
const { authenticate }    = require('../middleware/auth')
const { generateSpeech }  = require('../services/ttsService')

router.post('/speak', authenticate, async (req, res) => {
  const { text } = req.body

  if (!text || !String(text).trim()) {
    return res.status(400).json({ success: false, message: 'text is required' })
  }

  try {
    const wavBuffer = await generateSpeech(String(text).trim())
    res.set({
      'Content-Type':   'audio/wav',
      'Content-Length': wavBuffer.length,
      'Cache-Control':  'no-cache, no-store',
    })
    return res.send(wavBuffer)
  } catch (err) {
    console.error('[TTS] generateSpeech failed:', err.message)
    return res.status(500).json({ success: false, message: 'TTS generation failed' })
  }
})

module.exports = router
