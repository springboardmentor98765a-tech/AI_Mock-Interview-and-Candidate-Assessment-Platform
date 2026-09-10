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
 * Analytics API — Module 8
 *
 * GET /api/analytics/candidate
 *   Returns: {
 *     success, summary, categoryAverages, ratingDistribution,
 *     trends, resumeSkills, interviewHistory
 *   }
 *
 * GET /api/analytics/recruiter  (RECRUITER/ADMIN only)
 *   Returns: {
 *     success, weeklyTrend, scoreDistribution, categoryAverages, candidateRankings
 *   }
 */
const analyticsApi = {
  // Candidate: comprehensive analytics for the authenticated user
  getCandidateAnalytics: () => request('GET', '/analytics/candidate'),

  // Recruiter/Admin: platform-wide analytics
  getRecruiterAnalytics: () => request('GET', '/analytics/recruiter'),
}

export default analyticsApi
