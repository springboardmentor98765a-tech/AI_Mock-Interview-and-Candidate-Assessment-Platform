const BASE_URL = '/api'

function getToken() {
  return localStorage.getItem('token')
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`)
  return data
}

/**
 * CV Analysis API — RECRUITER/ADMIN only.
 * Mirrors the existing recordingApi.js conventions.
 *
 * Backend response shapes (from cvController.js):
 *
 *   getResult(id)  → { success, analysis: {
 *     id, interview_id, recording_id, status, analyzed_at, error_message,
 *     face_detection_rate, eye_contact_pct, facing_camera_rate,
 *     head_movement_deg, attention_score,
 *     engagement_estimate, confidence_indicator,
 *     disquietment_level, fear_level, doubt_confusion_level, disconnection_level,
 *     facial_activity, frames_total, frames_with_face,
 *     cnn_mean_probs, per_frame_raw, created_at
 *   }}
 *
 *   getStatus(id)  → { success, status, analyzed_at, error_message }
 *   trigger(id)    → { success, message, interviewId }
 */
const cvApi = {
  // Live single-frame analysis (base64 image from candidate webcam)
  analyzeFrame: (imageBase64) => request('POST', '/cv/frame', { image: imageBase64 }),

  // Save live compliance summary (warning count, events, avg visibility)
  saveLiveSummary: (interviewId, summary) => request('POST', `/cv/${interviewId}/live-summary`, summary),

  // Full analysis result for an interview (RECRUITER/ADMIN)
  getResult: (interviewId) => request('GET', `/cv/${interviewId}`),

  // Lightweight status poll — pending / processing / completed / error (RECRUITER/ADMIN)
  getStatus: (interviewId) => request('GET', `/cv/${interviewId}/status`),

  // Manual re-trigger (returns 202 immediately, analysis runs async) (RECRUITER/ADMIN)
  trigger: (interviewId) => request('POST', `/cv/${interviewId}/trigger`),
}

export default cvApi
