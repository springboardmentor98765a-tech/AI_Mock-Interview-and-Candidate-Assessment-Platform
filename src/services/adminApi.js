/**
 * adminApi.js — Frontend API client for Admin Dashboard endpoints.
 *
 * Mirrors the same pattern as analyticsApi.js and interviewApi.js:
 *  - Reads JWT from localStorage (key: 'token')
 *  - Uses the VITE_API_URL environment variable (falls back to /api)
 *  - Returns the parsed JSON body on success, throws on HTTP error
 */

const BASE = import.meta.env.VITE_API_URL || ''

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.message || `HTTP ${res.status}`)
  }
  return json
}

/* ─── Stats (Req 16–20 overview) ─────────────────────────────────────────── */
export async function fetchAdminStats() {
  return apiFetch('/api/admin/stats')
}

/* ─── User Management (Req 16) ───────────────────────────────────────────── */
export async function fetchUsers({ page = 1, pageSize = 20, role = '', status = '', search = '' } = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  if (role)   params.set('role', role)
  if (status) params.set('status', status)
  if (search) params.set('search', search)
  return apiFetch(`/api/admin/users?${params.toString()}`)
}

export async function updateUserRole(userId, role) {
  return apiFetch(`/api/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  })
}

export async function toggleUserStatus(userId, active) {
  return apiFetch(`/api/admin/users/${userId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ active }),
  })
}

/* ─── Interview Activity (Req 17) ────────────────────────────────────────── */
export async function fetchInterviewActivity() {
  return apiFetch('/api/admin/interviews/activity')
}

/* ─── AI Monitoring (Req 18) ─────────────────────────────────────────────── */
export async function fetchAiMonitoring() {
  return apiFetch('/api/admin/ai-monitoring')
}

/* ─── System Health (Req 19) ─────────────────────────────────────────────── */
export async function fetchSystemHealth() {
  return apiFetch('/api/admin/system-health')
}

/* ─── Usage Analytics (Req 20) ───────────────────────────────────────────── */
export async function fetchUsageAnalytics() {
  return apiFetch('/api/admin/usage-analytics')
}
