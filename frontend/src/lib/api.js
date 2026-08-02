/**
 * Thin client for the FastAPI backend.
 *
 * Everything the app knows about the server lives here: the base URL, where the
 * JWT is kept, and how an error response becomes a readable message.
 */

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/+$/, '');
const TOKEN_KEY = 'smarthire.token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail);
    this.name = 'ApiError';
    this.status = status; // 0 means the request never reached the server
    this.detail = detail;
  }
}

/**
 * FastAPI sends `detail` as a string for HTTPException, but as a list of
 * {loc, msg} objects for a 422 validation failure — which is what the password
 * rules produce, so it is worth unpacking rather than showing "422".
 */
function readDetail(payload, status) {
  const detail = payload?.detail;
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => String(item?.msg ?? '').replace(/^Value error,\s*/, ''))
      .filter(Boolean);
    if (messages.length) return messages.join(' ');
  }

  return `Request failed (${status}).`;
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the API running on port 8000?');
  }

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, readDetail(payload, response.status));
  return payload;
}

export const api = {
  /** POST /auth/register -> { message, user }. Does not sign you in. */
  register: ({ name, email, password, role }) =>
    request('/auth/register', { method: 'POST', body: { name, email, password, role } }),

  /** POST /auth/login -> { access_token, token_type, user } */
  login: ({ email, password }) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  /** GET /users/me -> the signed-in user, or 401 if the token is stale. */
  me: () => request('/users/me', { auth: true }),

  /** PUT /users/me. The server has no role field here, so it cannot be escalated. */
  updateProfile: (fields) => request('/users/me', { method: 'PUT', body: fields, auth: true }),

  /** GET /health -> { status, database, google_login } */
  health: () => request('/health'),

  /**
   * Google sign-in is a full page redirect, not a fetch: the browser goes to
   * the backend, which bounces it to Google and back to /login?token=...
   */
  googleLoginUrl: () => `${BASE}/auth/google/login`,
};
