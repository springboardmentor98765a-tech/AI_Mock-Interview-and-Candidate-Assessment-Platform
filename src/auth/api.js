const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

async function request(path, options = {}) {
  const token = localStorage.getItem('smarthire_token')
  const isFormData = options.body instanceof FormData
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.detail || body.message || 'Something went wrong. Please try again.')
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
  resume: () => request('/candidate/resume'),
  uploadResume: (file) => { const formData = new FormData(); formData.append('file', file); return request('/candidate/resume', { method: 'POST', body: formData }) },
  clearResume: () => request('/candidate/resume', { method: 'DELETE' }),
  interviews: () => request('/interviews/history'),
  generateInterview: (details) => request('/interviews/generate', { method: 'POST', body: JSON.stringify(details) }),
  startInterview: (id) => request(`/interviews/${id}/start`, { method: 'POST' }),
  pauseInterview: (id) => request(`/interviews/${id}/pause`, { method: 'POST' }),
  resumeInterview: (id) => request(`/interviews/${id}/resume`, { method: 'POST' }),
  endInterview: (id) => request(`/interviews/${id}/end`, { method: 'POST' }),
  saveInterviewAnswer: (id, answer) => request(`/interviews/${id}`, { method: 'PUT', body: JSON.stringify({ answer }) }),
  uploadInterviewRecording: (id, file) => { const formData = new FormData(); formData.append('file', file); return request(`/interviews/${id}/recording`, { method: 'POST', body: formData }) },
  openInterviewRecording: async (id) => { const response = await fetch(`${API_URL}/interviews/${id}/recording`, { headers: { Authorization: `Bearer ${localStorage.getItem('smarthire_token')}` } }); if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.detail || 'Recording could not be opened.') }; const url = URL.createObjectURL(await response.blob()); window.open(url, '_blank', 'noopener'); window.setTimeout(() => URL.revokeObjectURL(url), 60_000) },
}

export const googleLoginUrl = `${API_URL.replace(/\/api$/, '')}/oauth2/authorization/google`
