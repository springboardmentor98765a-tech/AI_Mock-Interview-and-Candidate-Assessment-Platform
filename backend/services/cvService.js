'use strict'

/**
 * backend/services/cvService.js
 *
 * Node-side bridge to the Python CV Analysis service (cv_service.py).
 *
 * The Python service runs separately at CV_SERVICE_URL (default http://127.0.0.1:8767).
 * Uses Node built-in fetch and FormData — no new dependencies.
 *
 * Architecture:
 *   The backend reads the video file from its own disk (req.file.path) and
 *   POSTs the raw bytes to the CV service as multipart/form-data.
 *   This allows the CV service to run on a separate VM — it does NOT need
 *   access to the backend filesystem.
 *
 * Public API:
 *   healthCheck()                             → Promise<object>
 *   triggerAnalysis(interviewId, filePath)    → Promise<object>  (full result)
 *   getCvServiceUrl()                         → string
 *
 * Configuration (.env):
 *   CV_SERVICE_URL=http://127.0.0.1:8767   (default if not set)
 *   AI_SECRET_TOKEN=<shared-secret>         (optional; leave unset for localhost dev)
 */

const fs = require('fs')

const CV_DEFAULT_URL = 'http://127.0.0.1:8767'

function getCvServiceUrl() {
  return (process.env.CV_SERVICE_URL || CV_DEFAULT_URL).replace(/\/$/, '')
}

/**
 * Build request headers for inter-service calls.
 * Adds X-AI-Secret when AI_SECRET_TOKEN is set in the environment.
 * On localhost (no token configured) the header is omitted entirely so
 * the Python service's dev-mode pass-through applies.
 */
function serviceHeaders(extra = {}) {
  const headers = { ...extra }
  const secret  = (process.env.AI_SECRET_TOKEN || '').trim()
  if (secret) {
    headers['X-AI-Secret'] = secret
  }
  return headers
}

/**
 * Check whether the Python CV service is reachable and model is ready.
 * @returns {Promise<{status, model_ready, device, checkpoint_epoch, val_ap}>}
 */
async function healthCheck() {
  const url = `${getCvServiceUrl()}/health`
  let res
  try {
    res = await fetch(url, { method: 'GET', headers: serviceHeaders() })
  } catch (connErr) {
    throw new Error(
      `CV service unreachable at ${url} — is cv_service.py running? (${connErr.message})`
    )
  }
  if (!res.ok) {
    throw new Error(`CV service health check returned HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Send a video file to the Python CV service for analysis.
 *
 * Reads the file from `filePath` on the backend VM and sends the raw bytes
 * to the CV service via multipart/form-data.  The CV service writes a temp
 * file locally, runs analysis, then deletes it — no shared filesystem needed.
 *
 * @param {number|string} interviewId  The interview ID to associate results with.
 * @param {string}        filePath     Absolute path to the saved WebM recording.
 * @returns {Promise<{status, scores, per_frame_raw, analyzed_at, elapsed_s, error}>}
 * @throws  Error on file-read failure, network failure, or non-200 HTTP response.
 */
async function triggerAnalysis(interviewId, filePath) {
  const url = `${getCvServiceUrl()}/analyze`

  // Read the recording from the backend VM's own disk
  let videoBuffer
  try {
    videoBuffer = fs.readFileSync(filePath)
  } catch (readErr) {
    throw new Error(
      `[CV] Cannot read recording file at ${filePath}: ${readErr.message}`
    )
  }

  // Build multipart/form-data body
  const form = new FormData()
  form.append('interview_id', String(interviewId))
  form.append('video', new Blob([videoBuffer]), 'recording.webm')

  let res
  try {
    res = await fetch(url, {
      method:  'POST',
      headers: serviceHeaders(), // Content-Type is set automatically by FormData
      body:    form,
    })
  } catch (connErr) {
    throw new Error(
      `CV service unreachable at ${url} — is cv_service.py running? (${connErr.message})`
    )
  }

  let data
  try {
    data = await res.json()
  } catch {
    throw new Error(`CV service returned non-JSON response (HTTP ${res.status})`)
  }

  if (!res.ok) {
    throw new Error(
      `CV service error (HTTP ${res.status}): ${data.error || JSON.stringify(data)}`
    )
  }

  console.log(
    `[CV] Analysis complete interview=${interviewId} ` +
    `status=${data.status} elapsed=${data.elapsed_s}s ` +
    `engagement=${data.scores?.engagement_estimate} ` +
    `eye_contact=${data.scores?.eye_contact_pct}%`
  )

  return data
}

/**
 * Send a single JPEG/PNG frame (base64 string) to the Python CV service for live analysis.
 *
 * @param {string} imageBase64  Base64-encoded image string (with or without data URL header).
 * @returns {Promise<object>}   Live frame detection, bbox, emotions, confidence, face_visibility_pct.
 */
async function analyzeFrame(imageBase64) {
  const url = `${getCvServiceUrl()}/analyze_frame`

  let res
  try {
    res = await fetch(url, {
      method:  'POST',
      headers: serviceHeaders({ 'Content-Type': 'application/json' }),
      body:    JSON.stringify({ image: imageBase64 }),
    })
  } catch (connErr) {
    throw new Error(
      `CV service unreachable at ${url} — is cv_service.py running? (${connErr.message})`
    )
  }

  let data
  try {
    data = await res.json()
  } catch {
    throw new Error(`CV service returned non-JSON response (HTTP ${res.status})`)
  }

  if (!res.ok) {
    throw new Error(
      `CV service error (HTTP ${res.status}): ${data.error || JSON.stringify(data)}`
    )
  }

  return data
}

module.exports = { triggerAnalysis, analyzeFrame, healthCheck, getCvServiceUrl }
