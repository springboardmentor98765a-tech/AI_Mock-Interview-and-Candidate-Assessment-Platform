'use strict'

/**
 * backend/services/cvService.js
 *
 * Node-side bridge to the Python CV Analysis service (cv_service.py).
 *
 * The Python service runs separately at CV_SERVICE_URL (default http://127.0.0.1:8767).
 * Uses Node built-in fetch — no new dependencies.
 *
 * Public API:
 *   healthCheck()                             → Promise<object>
 *   triggerAnalysis(interviewId, filePath)    → Promise<object>  (full result)
 *   getCvServiceUrl()                         → string
 *
 * Configuration (.env):
 *   CV_SERVICE_URL=http://127.0.0.1:8767   (default if not set)
 */

const CV_DEFAULT_URL = 'http://127.0.0.1:8767'

function getCvServiceUrl() {
  return (process.env.CV_SERVICE_URL || CV_DEFAULT_URL).replace(/\/$/, '')
}

/**
 * Check whether the Python CV service is reachable and model is ready.
 * @returns {Promise<{status, model_ready, device, checkpoint_epoch, val_ap}>}
 */
async function healthCheck() {
  const url = `${getCvServiceUrl()}/health`
  let res
  try {
    res = await fetch(url, { method: 'GET' })
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
 * Send a video file path to the Python CV service for analysis.
 *
 * This is the core bridge: called fire-and-forget from the recording upload
 * controller, and also directly from the admin trigger endpoint.
 *
 * @param {number|string} interviewId  The interview ID to associate results with.
 * @param {string}        filePath     Absolute path to the saved WebM recording.
 * @returns {Promise<{status, scores, per_frame_raw, analyzed_at, elapsed_s, error}>}
 * @throws  Error on network failure or non-200 HTTP response.
 */
async function triggerAnalysis(interviewId, filePath) {
  const url = `${getCvServiceUrl()}/analyze`

  let res
  try {
    res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ file_path: filePath, interview_id: interviewId }),
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
      headers: { 'Content-Type': 'application/json' },
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

