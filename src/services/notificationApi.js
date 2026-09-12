/**
 * notificationApi.js — Module 9: Notification System Foundation
 *
 * Frontend API client for the /api/notifications endpoints.
 * Follows the same pattern as analyticsApi.js.
 *
 * Endpoints:
 *   GET    /api/notifications             — getNotifications(options)
 *   PATCH  /api/notifications/:id/read    — markAsRead(id)
 *   PATCH  /api/notifications/read-all    — markAllAsRead()
 *   GET    /api/notifications/preferences — getPreferences()
 *   PUT    /api/notifications/preferences — updatePreferences(prefs)
 */

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
 * Get notifications for the authenticated user.
 * @param {object} [options]
 * @param {number} [options.limit=20]
 * @param {number} [options.offset=0]
 * @returns {Promise<{ success: boolean, notifications: Array, total: number, unreadCount: number }>}
 */
function getNotifications({ limit = 20, offset = 0 } = {}) {
  return request('GET', `/notifications?limit=${limit}&offset=${offset}`)
}

/**
 * Mark a single notification as read.
 * @param {number} id
 * @returns {Promise<{ success: boolean, notification: object }>}
 */
function markAsRead(id) {
  return request('PATCH', `/notifications/${id}/read`)
}

/**
 * Mark all notifications as read.
 * @returns {Promise<{ success: boolean, updatedCount: number }>}
 */
function markAllAsRead() {
  return request('PATCH', '/notifications/read-all')
}

/**
 * Get notification preferences for the authenticated user.
 * @returns {Promise<{ success: boolean, preferences: { emailEnabled, remindersEnabled, reportsEnabled } }>}
 */
function getPreferences() {
  return request('GET', '/notifications/preferences')
}

/**
 * Update notification preferences.
 * @param {{ emailEnabled?: boolean, remindersEnabled?: boolean, reportsEnabled?: boolean }} prefs
 * @returns {Promise<{ success: boolean, preferences: object }>}
 */
function updatePreferences(prefs) {
  return request('PUT', '/notifications/preferences', prefs)
}

const notificationApi = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
}

export default notificationApi
