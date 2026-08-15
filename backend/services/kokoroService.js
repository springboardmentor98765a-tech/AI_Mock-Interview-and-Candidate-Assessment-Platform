'use strict'

/**
 * backend/services/kokoroService.js
 *
 * Node bridge to the local Kokoro TTS HTTP service.
 * Mirrors the pattern of sttService.js.
 *
 * Configuration (.env):
 *   TTS_SERVICE_URL=http://localhost:8766   (default if not set)
 *
 * Public API:
 *   generateSpeech(text)  → Promise<Buffer>   WAV audio buffer
 *   healthCheck()         → Promise<{status, model, voice, ready}>
 *   getTtsServiceUrl()    → string
 */

const TTS_DEFAULT_URL = 'http://localhost:8766'

function getTtsServiceUrl() {
  return (process.env.TTS_SERVICE_URL || TTS_DEFAULT_URL).replace(/\/$/, '')
}

/**
 * Check whether the Kokoro TTS service is reachable and ready.
 * @returns {Promise<{status:string, model:string, voice:string, ready:boolean}>}
 */
async function healthCheck() {
  const url = `${getTtsServiceUrl()}/health`
  let res
  try {
    res = await fetch(url, { method: 'GET' })
  } catch (connErr) {
    throw new Error(
      `Kokoro TTS service unreachable at ${url} — is tts_service.py running? (${connErr.message})`
    )
  }
  if (!res.ok) {
    throw new Error(`Kokoro TTS health check returned HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Send text to the Kokoro service and receive WAV audio.
 * @param {string} text   The text to synthesise.
 * @returns {Promise<Buffer>}  WAV audio bytes ready to send to the browser.
 */
async function generateSpeech(text) {
  const url = `${getTtsServiceUrl()}/speak`

  let res
  try {
    res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text: String(text).trim() }),
    })
  } catch (connErr) {
    throw new Error(
      `Kokoro TTS service unreachable at ${url} — is tts_service.py running? (${connErr.message})`
    )
  }

  if (!res.ok) {
    let errMsg = `Kokoro TTS error (HTTP ${res.status})`
    try {
      const data = await res.json()
      errMsg = `Kokoro TTS error (HTTP ${res.status}): ${data.error || JSON.stringify(data)}`
    } catch (_) {}
    throw new Error(errMsg)
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('audio')) {
    throw new Error(`Kokoro TTS returned unexpected content-type: ${contentType}`)
  }

  const arrayBuf = await res.arrayBuffer()
  const wavBuf   = Buffer.from(arrayBuf)

  console.log(`[KokoroTTS] Generated ${wavBuf.length} bytes WAV for ${text.length} chars`)

  return wavBuf
}

module.exports = { generateSpeech, healthCheck, getTtsServiceUrl }
