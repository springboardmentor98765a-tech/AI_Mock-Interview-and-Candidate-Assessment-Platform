const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

async function request(path, options = {}) {
  const token = localStorage.getItem('smarthire_token')
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || 'Something went wrong. Please try again.')
  return body
}

export const authApi = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (details) => request('/auth/register', { method: 'POST', body: JSON.stringify(details) }),
  profile: () => request('/profile'),
  updateProfile: (profile) => request('/profile', { method: 'PUT', body: JSON.stringify(profile) }),
}

export const adminApi = {
  users: () => request('/admin/users'),
  analytics: () => request('/admin/analytics'),
  loginActivity: () => request('/admin/login-activity'),
  setUserStatus: (id, is_active) => request(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),
}

export const recruiterApi = {
  jobs: () => request('/recruiter/jobs'),
  analytics: () => request('/recruiter/analytics'),
  createJob: (job) => request('/recruiter/jobs', { method: 'POST', body: JSON.stringify(job) }),
  applications: () => request('/recruiter/applications'),
  scheduleInterview: (id, interview_at) => request(`/recruiter/applications/${id}/schedule`, { method: 'POST', body: JSON.stringify({ interview_at }) }),
}

export const candidateApi = {
  jobs: () => request('/candidate/jobs'),
  apply: (jobId) => request(`/candidate/jobs/${jobId}/apply`, { method: 'POST' }),
  requestInterview: (applicationId, interview_at) => request(`/candidate/applications/${applicationId}/request-interview`, { method: 'POST', body: JSON.stringify({ interview_at }) }),
}

export const googleLoginUrl = `${API_URL.replace(/\/api$/, '')}/oauth2/authorization/google`
