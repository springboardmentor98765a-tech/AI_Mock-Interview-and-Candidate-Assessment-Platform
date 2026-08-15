const BASE_URL = '/api'

function getToken() {
  return localStorage.getItem('token')
}

function authHeaders(extra = {}) {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`)
  return data
}

const interviewApi = {
  recommendRoles:  (resumeAnalysisId)                 => request('POST', '/interviews/recommend-roles', { resumeAnalysisId }),
  generate:        (payload)                           => request('POST', '/interviews/generate', payload),
  start:           (interviewId)                       => request('POST', '/interviews/start', { interviewId }),
  pause:           (interviewId)                       => request('POST', '/interviews/pause', { interviewId }),
  resume:          (interviewId)                       => request('POST', '/interviews/resume', { interviewId }),
  submitAnswer:    (payload)                           => request('POST', '/interviews/submit', payload),
  updateTranscript:(payload)                           => request('POST', '/interviews/transcript-update', payload),
  complete:        (payload)                           => request('POST', '/interviews/complete', payload),
  getAll:          ()                                  => request('GET',  '/interviews'),
  getHistory:      ()                                  => request('GET',  '/interviews/history'),
  getById:         (id)                                => request('GET',  `/interviews/${id}`),
  deleteInterview: (id)                                => request('DELETE', `/interviews/${id}`),
  getStats:        ()                                  => request('GET',  '/interviews/stats'),
}

export default interviewApi
