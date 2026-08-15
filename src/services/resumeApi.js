const BASE_URL = '/api'

function getToken() {
  return localStorage.getItem('token')
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function uploadResume(file, onProgress) {
  const formData = new FormData()
  formData.append('resume', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE_URL}/resume/upload`)

    const headers = authHeaders()
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v))

    if (typeof onProgress === 'function') {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data)
        } else {
          const err = new Error(data.message || 'Upload failed')
          err.status = xhr.status
          reject(err)
        }
      } catch {
        reject(new Error('Invalid server response'))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(formData)
  })
}

async function getHistory() {
  const res = await fetch(`${BASE_URL}/resume/history`, { headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch history')
  return data
}

async function getById(id) {
  const res = await fetch(`${BASE_URL}/resume/${id}`, { headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch resume')
  return data
}

async function deleteResume(id) {
  const res = await fetch(`${BASE_URL}/resume/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to delete resume')
  return data
}

const resumeApi = { uploadResume, getHistory, getById, deleteResume }
export default resumeApi
