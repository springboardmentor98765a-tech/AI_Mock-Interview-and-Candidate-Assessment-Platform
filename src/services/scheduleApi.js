/**
 * scheduleApi.js — Module 9 Chunk 2
 *
 * Frontend API client for /api/schedules.
 * Follows the same pattern as notificationApi.js.
 *
 * Endpoints:
 *   GET    /api/schedules                  — getSchedules()
 *   GET    /api/schedules/:id              — getScheduleById(id)
 *   POST   /api/schedules                  — createSchedule(data)
 *   PATCH  /api/schedules/:id              — rescheduleInterview(id, data)
 *   DELETE /api/schedules/:id              — cancelSchedule(id)
 */

const BASE_URL = '/api'

function authHeaders() {
  const token = localStorage.getItem('token')
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
 * Get all schedules for the authenticated user (role-scoped server-side).
 * @param {{ limit?: number, offset?: number }} opts
 */
function getSchedules({ limit = 50, offset = 0 } = {}) {
  return request('GET', `/schedules?limit=${limit}&offset=${offset}`)
}

/**
 * Get a single schedule by id.
 */
function getScheduleById(id) {
  return request('GET', `/schedules/${id}`)
}

/**
 * Create a new scheduled interview (RECRUITER/ADMIN only).
 * @param {{ candidateId, role, scheduledAt, durationMinutes?, interviewType?, notes? }} data
 */
function createSchedule(data) {
  return request('POST', '/schedules', data)
}

/**
 * Reschedule an existing interview.
 * @param {number} id
 * @param {{ scheduledAt, durationMinutes?, interviewType?, notes? }} data
 */
function rescheduleInterview(id, data) {
  return request('PATCH', `/schedules/${id}`, data)
}

/**
 * Cancel a scheduled interview (sets status = 'cancelled').
 * @param {number} id
 */
function cancelSchedule(id) {
  return request('DELETE', `/schedules/${id}`)
}

const scheduleApi = {
  getSchedules,
  getScheduleById,
  createSchedule,
  rescheduleInterview,
  cancelSchedule,
}

export default scheduleApi
