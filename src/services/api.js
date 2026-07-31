const BASE_URL = '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(method, path, body = null, requiresAuth = true) {
  const headers = { 'Content-Type': 'application/json' }
  if (requiresAuth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const config = { method, headers }
  if (body) config.body = JSON.stringify(body)

  const res = await fetch(`${BASE_URL}${path}`, config)
  const data = await res.json()

  if (!res.ok) {
    const err = new Error(data.message || 'Request failed')
    err.status = res.status
    err.errors = data.errors
    throw err
  }

  return data
}

const api = {
  auth: {
    register: (body)    => request('POST', '/auth/register', body, false),
    login:    (body)    => request('POST', '/auth/login',    body, false),
    profile:  ()        => request('GET',  '/auth/profile'),
    updateProfile: (b)  => request('PUT',  '/auth/profile', b),
    changePassword: (b) => request('PUT',  '/auth/password', b),
    logout:   ()        => request('POST', '/auth/logout'),
  },
}

export default api
