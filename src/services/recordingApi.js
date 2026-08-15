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

const recordingApi = {
  // Upload a recording blob after interview ends
  // Returns { success, recordingId, fileName, recordingType }
  async uploadRecording({ interviewId, blob, recordingType, startTime, endTime, duration, mimeType }) {
    const ext      = mimeType?.includes('ogg') ? '.ogg' : mimeType?.includes('mp4') ? '.mp4' : '.webm'
    const formData = new FormData()
    formData.append('recording',     new File([blob], `recording${ext}`, { type: mimeType || 'video/webm' }))
    formData.append('interviewId',   String(interviewId))
    formData.append('recordingType', recordingType || 'video')
    formData.append('startTime',     startTime  || '')
    formData.append('endTime',       endTime    || '')
    formData.append('duration',      String(duration || 0))

    const res = await fetch(`${BASE_URL}/recordings/upload`, {
      method:  'POST',
      headers: authHeaders(),  // NO Content-Type — let browser set multipart boundary
      body:    formData,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || `Upload failed (${res.status})`)
    return data
  },

  // List recordings for an interview
  listByInterview: (interviewId) => request('GET', `/recordings/interview/${interviewId}`),

  // Get a streaming URL for a recording (for <video src> / <a href>)
  // Appends token as query param because browser <video src> cannot set Authorization headers
  getStreamUrl: (recordingId) => {
    const token = getToken()
    const params = token ? `?token=${encodeURIComponent(token)}` : ''
    return `${BASE_URL}/recordings/${recordingId}/stream${params}`
  },

  // RECRUITER/ADMIN — all completed interview results
  getResults: () => request('GET', '/recordings/results'),

  // RECRUITER/ADMIN — single interview detail
  getDetail: (interviewId) => request('GET', `/recordings/results/${interviewId}`),
}

export default recordingApi
