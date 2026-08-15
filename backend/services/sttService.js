'use strict'

/**
 * sttService.js
 *
 * Node-side bridge to the local Faster-Whisper STT HTTP service.
 *
 * The Python service runs separately at STT_SERVICE_URL (default http://localhost:8765).
 * This module communicates with it using Node's built-in fetch — no new dependencies.
 *
 * Public API:
 *   transcribe(audioBuffer, filename)   → Promise<{ transcript, language, language_probability, duration_s }>
 *   healthCheck()                       → Promise<{ status, model, ready }>
 *   getSttServiceUrl()                  → string
 *
 * Configuration (.env):
 *   STT_SERVICE_URL=http://localhost:8765   (default if not set)
 */

const STT_DEFAULT_URL = 'http://localhost:8765'

function getSttServiceUrl() {
  return (process.env.STT_SERVICE_URL || STT_DEFAULT_URL).replace(/\/$/, '')
}

/**
 * Check whether the Python STT service is reachable and ready.
 * @returns {Promise<{status:string, model:string, ready:boolean}>}
 */
async function healthCheck() {
  const url = `${getSttServiceUrl()}/health`
  let res
  try {
    res = await fetch(url, { method: 'GET' })
  } catch (connErr) {
    throw new Error(
      `STT service unreachable at ${url} — is stt_service.py running? (${connErr.message})`
    )
  }
  if (!res.ok) {
    throw new Error(`STT service health check returned HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Send an audio buffer to the Python STT service and return the transcript.
 *
 * @param {Buffer}  audioBuffer   Raw audio bytes (wav, m4a, webm, ogg, etc.)
 * @param {string}  [filename]    Hint for the file extension (e.g. "audio.webm").
 *                                Used by the Python service to pick the right demuxer.
 * @returns {Promise<{transcript:string, language:string, language_probability:number, duration_s:number}>}
 */
async function transcribe(audioBuffer, filename = 'audio.wav') {
  const url = `${getSttServiceUrl()}/transcribe`

  // Build multipart/form-data body manually using FormData (Node 18+ built-in)
  const form = new FormData()
  const blob = new Blob([audioBuffer])
  form.append('audio', blob, filename)

  let res
  try {
    res = await fetch(url, { method: 'POST', body: form })
  } catch (connErr) {
    throw new Error(
      `STT service unreachable at ${url} — is stt_service.py running? (${connErr.message})`
    )
  }

  let data
  try {
    data = await res.json()
  } catch {
    throw new Error(`STT service returned non-JSON response (HTTP ${res.status})`)
  }

  if (!res.ok) {
    throw new Error(`STT service error (HTTP ${res.status}): ${data.error || JSON.stringify(data)}`)
  }

  console.log(
    `[STT] Transcribed ${audioBuffer.length} bytes → ` +
    `"${(data.transcript || '').slice(0, 80)}" ` +
    `(lang=${data.language}, ${data.duration_s}s)`
  )

  return data
}

module.exports = { transcribe, healthCheck, getSttServiceUrl }
