/**
 * reportApi.js — Module 9 Chunk 4
 *
 * Frontend API client for /api/reports.
 *
 * Downloads are triggered by fetching with JWT and programmatically
 * creating a temporary anchor to save the blob — this avoids opening
 * a new tab with an unprotected URL.
 *
 * Endpoints:
 *   GET /api/reports/candidate          — downloadOwnReport(format)
 *   GET /api/reports/candidate/:id      — downloadCandidateReport(id, format)
 *   GET /api/reports/admin              — downloadAdminReport(format)
 *   POST /api/admin/notifications       — broadcastNotification({ title, message, target })
 */

const BASE_URL = '/api'

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Fetch a binary (blob) response from a protected endpoint and trigger browser download.
 * @param {string} url
 * @param {string} filename — suggested filename for browser save dialog
 */
async function fetchAndDownload(url, filename) {
  const res = await fetch(url, { headers: authHeaders() })

  if (!res.ok) {
    // Try to parse error JSON; fall back to status text
    let msg = `Download failed (${res.status})`
    try {
      const json = await res.json()
      msg = json.message || msg
    } catch { /* ignore parse error */ }
    throw new Error(msg)
  }

  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  // Cleanup: revoke blob URL after short delay
  setTimeout(() => { URL.revokeObjectURL(blobUrl); a.remove() }, 1000)
}

function ext(format) { return format === 'csv' ? 'csv' : 'pdf' }

/**
 * Download the authenticated user's own performance report.
 * @param {'pdf'|'csv'} format
 */
function downloadOwnReport(format = 'pdf') {
  const ts  = Date.now()
  const fmt = ext(format)
  return fetchAndDownload(
    `${BASE_URL}/reports/candidate?format=${fmt}`,
    `my-performance-report-${ts}.${fmt}`
  )
}

/**
 * Download a specific candidate's report (RECRUITER/ADMIN only).
 * @param {number} candidateId
 * @param {'pdf'|'csv'} format
 */
function downloadCandidateReport(candidateId, format = 'pdf') {
  const ts  = Date.now()
  const fmt = ext(format)
  return fetchAndDownload(
    `${BASE_URL}/reports/candidate/${candidateId}?format=${fmt}`,
    `candidate-report-${candidateId}-${ts}.${fmt}`
  )
}

/**
 * Download the admin platform system report (ADMIN only).
 * @param {'pdf'|'csv'} format
 */
function downloadAdminReport(format = 'pdf') {
  const ts  = Date.now()
  const fmt = ext(format)
  return fetchAndDownload(
    `${BASE_URL}/reports/admin?format=${fmt}`,
    `admin-system-report-${ts}.${fmt}`
  )
}

/**
 * Admin: send a broadcast notification to a target group.
 * @param {{ title: string, message: string, target: 'ALL_CANDIDATES'|'ALL_RECRUITERS'|'ALL_USERS' }} payload
 */
async function broadcastNotification({ title, message, target }) {
  const res = await fetch(`${BASE_URL}/admin/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ title, message, target }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `Broadcast failed (${res.status})`)
  return data
}

const reportApi = {
  downloadOwnReport,
  downloadCandidateReport,
  downloadAdminReport,
  broadcastNotification,
}

export default reportApi
