// ============================================================
// AI Mock Interview Platform — Frontend Auth Logic
// Talks to the Express/JWT/OAuth backend in /backend
// ============================================================

const API_BASE_URL = 'http://localhost:5000/api';

// Module 3 (AI Interview Generation, candidate feedback view, question
// TTS) is served by the Python/FastAPI service in /backend-python —
// it shares the same database and JWT secret as the Node backend above.
const PY_API_BASE_URL = 'http://localhost:8001/api';

const DASHBOARD_BY_ROLE = {
  candidate: 'candidate.html',
  recruiter: 'recruiter.html',
  coach: 'coach.html',
  admin: 'admin.html',
};

// ---------------- Force fresh data when a page is restored from bfcache ----------------
// Browsers can restore a page (e.g. candidate.html) straight from the
// back/forward cache when the user hits the Back button, instead of
// re-running this file's onload-triggered fetches. That leaves stale UI
// on screen — e.g. an interview you just finished still shows
// "▶ Start Interview" instead of "Completed" until you navigate away and
// back again. Force a real reload whenever a page is served from bfcache
// so every dashboard always reflects the latest data.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

// ---------------- Helpers ----------------
function getToken() {
  return localStorage.getItem('token');
}

function getStoredUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function showError(message) {
  // Simple, dependency-free feedback. Replace with a toast/UI element if desired.
  alert(message);
}

// ---------------- Register (register.html) ----------------
async function registerUser() {
  const fullName = document.getElementById('fullname').value.trim();
  const email = document.getElementById('email').value.trim();
  const mobile = document.getElementById('mobile').value.trim();
  const role = document.getElementById('role').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!fullName || !email || !mobile || !role || !password || !confirmPassword) {
    return showError('Please fill in all fields.');
  }
  if (password !== confirmPassword) {
    return showError('Passwords do not match.');
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, mobile, password, confirmPassword, role }),
    });
    const data = await res.json();

    if (!res.ok) {
      return showError(data.message || 'Registration failed.');
    }

    saveSession(data.token, data.user);
    window.location.href = DASHBOARD_BY_ROLE[data.user.role] || 'login.html';
  } catch (err) {
    console.error(err);
    showError('Could not reach the server. Please try again.');
  }
}

// ---------------- Login (login.html) ----------------
async function loginUser() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    return showError('Please enter both email and password.');
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      return showError(data.message || 'Login failed.');
    }

    saveSession(data.token, data.user);
    window.location.href = DASHBOARD_BY_ROLE[data.user.role] || 'login.html';
  } catch (err) {
    console.error(err);
    showError('Could not reach the server. Please try again.');
  }
}

// ---------------- Google OAuth (login.html / register.html) ----------------
// Call with the role the user intends to sign up as (defaults to candidate).
// Existing Google users are logged into their existing role regardless.
function loginWithGoogle(role = 'candidate') {
  window.location.href = `${API_BASE_URL}/auth/google?role=${encodeURIComponent(role)}`;
}

// ---------------- Route guard for dashboards ----------------
// Called via <body onload="checkRole('admin')"> etc.
function checkRole(requiredRole) {
  const token = getToken();
  const user = getStoredUser();

  if (!token || !user) {
    window.location.href = 'login.html';
    return;
  }

  if (user.role !== requiredRole) {
    // Logged in, but not authorized for this dashboard — send them to their own.
    window.location.href = DASHBOARD_BY_ROLE[user.role] || 'login.html';
    return;
  }

  // Optional: verify the token is still valid server-side.
  fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error('Session expired');
    })
    .catch(() => {
      clearSession();
      window.location.href = 'login.html';
    });

  // Show a maintenance-mode banner (set via admin System Settings) to
  // everyone except the admin themselves, so they can still work while
  // it's on.
  if (requiredRole !== 'admin') {
    fetch(`${API_BASE_URL}/settings/public`)
      .then((res) => (res.ok ? res.json() : null))
      .then((settings) => {
        if (settings && settings.maintenanceMode) {
          const banner = document.createElement('div');
          banner.className = 'maintenance-banner';
          banner.textContent = '🔧 The platform is currently in maintenance mode. Some features may be limited.';
          const mainContent = document.querySelector('.main-content');
          if (mainContent) mainContent.prepend(banner);
        }
      })
      .catch(() => {});
  }
}

// ---------------- Populate sidebar profile card ----------------
function loadProfile() {
  const user = getStoredUser();
  if (!user) return;

  const nameEl = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');
  const emailEl = document.getElementById('userEmail');

  if (nameEl) nameEl.textContent = user.fullName;
  if (roleEl) roleEl.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  if (emailEl) emailEl.textContent = user.email;

  renderAvatar(user);
}

// Backend origin without the trailing /api, so we can point <img> tags
// at the publicly-served /uploads/avatars/... path.
const NODE_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

function renderAvatar(user) {
  const img = document.getElementById('userAvatarImg');
  if (!img) return;
  img.src = user && user.profilePicture ? `${NODE_ORIGIN}${user.profilePicture}` : 'images/profile.png';
}

async function changeAvatar(inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;

  const okTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!okTypes.includes(file.type)) {
    showToast('Please choose a JPG, PNG, or WEBP image.', 'error');
    inputEl.value = '';
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    showToast('Image is too large — please choose one under 3MB.', 'error');
    inputEl.value = '';
    return;
  }

  const formData = new FormData();
  formData.append('avatar', file);
  try {
    const { user } = await apiUpload('/users/me/avatar', formData);
    const stored = getStoredUser();
    const merged = { ...stored, profilePicture: user.profile_picture };
    saveSession(getToken(), merged);
    renderAvatar(merged);
    showToast('Profile picture updated.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    inputEl.value = '';
  }
}

// ---------------- Logout ----------------
function logout() {
  clearSession();
  window.location.href = 'login.html';
}

// ---------------- Redirect already-logged-in users away from login.html ----------------
function redirectLoggedInUser() {
  const token = getToken();
  const user = getStoredUser();
  if (token && user) {
    window.location.href = DASHBOARD_BY_ROLE[user.role] || 'index.html';
  }
}

// ============================================================
// Shared API helper — attaches the JWT, and if the backend ever
// hands back 401 (expired/invalid token) it logs the user out.
// ============================================================
async function apiFetch(path, options = {}) {
  return apiFetchBase(API_BASE_URL, path, options);
}

// Same helper, pointed at the Python Module 3 service (interview
// generation, candidate feedback view, question TTS).
async function apiFetchPy(path, options = {}) {
  return apiFetchBase(PY_API_BASE_URL, path, options);
}

async function apiFetchBase(baseUrl, path, options = {}) {
  const token = getToken();
  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    options.headers || {},
    token ? { Authorization: `Bearer ${token}` } : {}
  );

  let res;
  try {
    res = await fetch(`${baseUrl}${path}`, { ...options, headers });
  } catch (networkErr) {
    // fetch() only throws for network-level failures (server down, CORS
    // blocked, DNS, etc.) — the raw message is just "Failed to fetch" and
    // isn't useful on its own, so translate it into something actionable.
    const serviceName = baseUrl.includes(':8001') ? 'the AI interview service (port 8001)' : 'the backend server';
    throw new Error(`Could not reach ${serviceName}. Make sure it's running, then try again.`);
  }

  if (res.status === 401) {
    clearSession();
    window.location.href = 'login.html';
    throw new Error('Session expired');
  }

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    throw new Error((data && data.message) || `Request failed (${res.status})`);
  }
  return data;
}

// ---------------- Multipart upload helper (no JSON Content-Type — the
// browser sets the correct multipart boundary automatically) ----------------
async function apiUpload(path, formData) {
  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', body: formData, headers });
  } catch (networkErr) {
    throw new Error("Could not reach the backend server. Make sure it's running, then try again.");
  }

  if (res.status === 401) {
    clearSession();
    window.location.href = 'login.html';
    throw new Error('Session expired');
  }

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    throw new Error((data && data.message) || `Request failed (${res.status})`);
  }
  return data;
}

// ---------------- Toast (lightweight, non-blocking feedback) ----------------
function showToast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'toast-error' : type === 'success' ? 'toast-success' : ''}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ---------------- Generic modal form ----------------
// fields: [{ name, label, type: 'text'|'number'|'select'|'textarea'|'datetime-local', options?: [{value,label}], required? }]
function openFormModal({ title, fields, submitLabel = 'Submit', onSubmit }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const fieldsHtml = fields
    .map((f) => {
      const id = `mf_${f.name}`;
      let control;
      if (f.type === 'select') {
        const opts = f.options.map((o) => `<option value="${o.value}">${o.label}</option>`).join('');
        control = `<select id="${id}">${opts}</select>`;
      } else if (f.type === 'textarea') {
        control = `<textarea id="${id}" placeholder="${f.placeholder || ''}"></textarea>`;
      } else if (f.type === 'file') {
        control = `<input id="${id}" type="file" accept="${f.accept || ''}" />`;
      } else {
        control = `<input id="${id}" type="${f.type || 'text'}" placeholder="${f.placeholder || ''}" ${
          f.min !== undefined ? `min="${f.min}"` : ''
        } />`;
      }
      return `<div class="modal-field"><label for="${id}">${f.label}</label>${control}</div>`;
    })
    .join('');

  overlay.innerHTML = `
    <div class="modal-box">
      <h3>${title}</h3>
      <div class="modal-error"></div>
      <form data-modal-form>
        ${fieldsHtml}
        <div class="modal-actions">
          <button type="button" class="btn-cancel">Cancel</button>
          <button type="submit" class="btn-submit">${submitLabel}</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.btn-cancel').addEventListener('click', close);

  const form = overlay.querySelector('[data-modal-form]');
  const errorEl = overlay.querySelector('.modal-error');
  const submitBtn = overlay.querySelector('.btn-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const values = {};
    fields.forEach((f) => {
      const el = document.getElementById(`mf_${f.name}`);
      values[f.name] = f.type === 'file' ? (el.files && el.files[0]) : el.value.trim();
    });

    submitBtn.disabled = true;
    errorEl.style.display = 'none';
    try {
      await onSubmit(values);
      close();
    } catch (err) {
      errorEl.textContent = err.message || 'Something went wrong.';
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
    }
  });

  return overlay;
}

// ---------------- Small render helpers ----------------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str === null || str === undefined ? '' : String(str);
  return div.innerHTML;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function scoreBadge(score) {
  if (score === null || score === undefined) return '<span class="badge badge-primary">Pending</span>';
  if (score >= 90) return `<span class="badge badge-success">${score}% · Excellent</span>`;
  if (score >= 80) return `<span class="badge badge-primary">${score}% · Good</span>`;
  if (score >= 65) return `<span class="badge badge-warning">${score}% · Solid</span>`;
  return `<span class="badge badge-danger">${score}% · Needs Practice</span>`;
}

function statusBadge(status) {
  if (status === 'completed') return '<span class="badge badge-success">Completed</span>';
  if (status === 'scheduled') return '<span class="badge badge-primary">Scheduled</span>';
  if (status === 'cancelled') return '<span class="badge badge-danger">Cancelled</span>';
  return `<span class="badge badge-primary">${escapeHtml(status)}</span>`;
}

function setStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderTableRows(tbodyId, rows, colSpan, rowRenderer) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td class="table-empty" colspan="${colSpan}">Nothing here yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(rowRenderer).join('');
}

function renderNotifications(containerId, notifications) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!notifications || notifications.length === 0) {
    container.innerHTML = '<div class="notification"><h4>All caught up</h4><p>No new notifications right now.</p></div>';
    return;
  }
  container.innerHTML = notifications
    .slice(0, 4)
    .map(
      (n) => `
      <div class="notification">
        <h4>${escapeHtml(n.title)}</h4>
        <p>${escapeHtml(n.message)}</p>
      </div>`
    )
    .join('');
}

async function loadNotificationsInto(containerId) {
  try {
    const data = await apiFetch('/notifications/me');
    renderNotifications(containerId, data.notifications);
  } catch (err) {
    console.error('Failed to load notifications:', err);
  }
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================
async function initAdminDashboard() {
  await Promise.all([
    loadAdminStats(),
    loadAdminUsers(),
    loadAdminInterviews(),
    loadPlatformAnalytics(),
    loadAdminSettingsUI(),
    loadNotificationsInto('adminNotifications'),
  ]);
}

async function loadAdminStats() {
  try {
    const { stats } = await apiFetch('/admin/stats');
    setStat('statTotalUsers', stats.totalUsers);
    setStat('statCandidates', stats.candidates);
    setStat('statRecruiters', stats.recruiters);
    setStat('statCoaches', stats.coaches);
  } catch (err) {
    console.error('Failed to load admin stats:', err);
  }
}

let ADMIN_USERS_CACHE = [];

async function loadAdminUsers() {
  try {
    const { users } = await apiFetch('/users');
    ADMIN_USERS_CACHE = users;
    renderTableRows('adminUsersBody', users, 5, (u) => `
      <tr>
        <td>${escapeHtml(u.full_name)}</td>
        <td>${escapeHtml(u.role.charAt(0).toUpperCase() + u.role.slice(1))}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${u.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Deactivated</span>'}</td>
        <td><button onclick="toggleUserStatus(${u.id}, ${!u.is_active})">${u.is_active ? 'Deactivate' : 'Activate'}</button></td>
      </tr>`);
  } catch (err) {
    console.error('Failed to load users:', err);
    showToast('Could not load users.', 'error');
  }
}

async function toggleUserStatus(userId, makeActive) {
  try {
    await apiFetch(`/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: makeActive }),
    });
    showToast(makeActive ? 'User activated.' : 'User deactivated.', 'success');
    loadAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------------- Interview Management & Reports ----------------
let ADMIN_INTERVIEWS_CACHE = [];
let adminInterviewSearchDebounce = null;

function debouncedLoadAdminInterviews() {
  clearTimeout(adminInterviewSearchDebounce);
  adminInterviewSearchDebounce = setTimeout(loadAdminInterviews, 350);
}

function filterInterviewManagement(status) {
  const select = document.getElementById('adminInterviewStatusFilter');
  if (select) select.value = status;
  document.getElementById('interviewManagement').scrollIntoView({ behavior: 'smooth' });
  loadAdminInterviews();
}

async function loadAdminInterviews() {
  const status = document.getElementById('adminInterviewStatusFilter')?.value || 'all';
  const search = document.getElementById('adminInterviewSearch')?.value || '';
  try {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (search) params.set('search', search);
    const { interviews } = await apiFetch(`/admin/interviews?${params.toString()}`);
    ADMIN_INTERVIEWS_CACHE = interviews;
    renderTableRows('adminInterviewsBody', interviews, 6, (iv) => `
      <tr>
        <td>${escapeHtml(iv.candidate_name)}<br><span style="font-size:0.8rem;color:var(--ink-soft)">${escapeHtml(iv.candidate_email)}</span></td>
        <td>${escapeHtml(iv.interview_type)}</td>
        <td>${iv.score !== null ? `${iv.score}%` : '—'}</td>
        <td>${statusBadge(iv.status)}</td>
        <td>${formatDate(iv.scheduled_at || iv.created_at)}</td>
        <td><button style="background:transparent;border:1px solid var(--danger);color:var(--danger)" onclick="deleteAdminInterview(${iv.id})">🗑 Delete</button></td>
      </tr>`);
  } catch (err) {
    console.error('Failed to load admin interviews:', err);
    showToast('Could not load interviews.', 'error');
  }
}

async function deleteAdminInterview(interviewId) {
  if (!confirm('Delete this interview permanently (any status)? This cannot be undone.')) return;
  try {
    await apiFetch(`/admin/interviews/${interviewId}`, { method: 'DELETE' });
    showToast('Interview deleted.', 'success');
    loadAdminInterviews();
    loadPlatformAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function exportInterviewsCsv() {
  if (!ADMIN_INTERVIEWS_CACHE.length) {
    showToast('Nothing to export for the current filter.', 'error');
    return;
  }
  const header = ['Candidate', 'Email', 'Interview Type', 'Score', 'Status', 'Date'];
  const rows = ADMIN_INTERVIEWS_CACHE.map((iv) => [
    iv.candidate_name,
    iv.candidate_email,
    iv.interview_type,
    iv.score !== null ? iv.score : '',
    iv.status,
    iv.scheduled_at || iv.created_at || '',
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interview-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------- Platform Analytics ----------------
async function loadPlatformAnalytics() {
  try {
    const { analytics: a } = await apiFetch('/admin/analytics');
    setStat('statTotalInterviews', a.totalInterviews);
    setStat('statCompletionRate', `${a.completionRate}%`);
    setStat('statAvgScoreAdmin', `${a.averageScore}%`);
    setStat('statInterviewsWeek', a.interviewsThisWeek);

    setAdminProgress('progAdminActiveUsers', a.activeUserRate, `${a.activeUsers} of ${a.totalUsers} users active (${a.activeUserRate}%)`);
    setAdminProgress('progAdminCompletion', a.completionRate, `${a.completedInterviews} of ${a.totalInterviews} interviews completed (${a.completionRate}%)`);
    const scheduledRate = a.totalInterviews > 0 ? Math.round((a.scheduledInterviews / a.totalInterviews) * 100) : 0;
    setAdminProgress('progAdminScheduled', scheduledRate, `${a.scheduledInterviews} scheduled (${scheduledRate}%)`);
    const cancelledRate = a.totalInterviews > 0 ? Math.round((a.cancelledInterviews / a.totalInterviews) * 100) : 0;
    setAdminProgress('progAdminCancelled', cancelledRate, `${a.cancelledInterviews} cancelled (${cancelledRate}%)`);
  } catch (err) {
    console.error('Failed to load platform analytics:', err);
  }
}

function setAdminProgress(id, value, label) {
  const bar = document.getElementById(id);
  const lbl = document.getElementById(`${id}Label`);
  if (bar) bar.value = value;
  if (lbl) lbl.textContent = label;
}

// ---------------- System Settings ----------------
async function loadAdminSettingsUI() {
  try {
    const { settings } = await apiFetch('/admin/settings');
    document.getElementById('settingAllowRegistrations').checked = settings.allowRegistrations;
    document.getElementById('settingMaintenanceMode').checked = settings.maintenanceMode;
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

async function saveAdminSettings() {
  try {
    const allowRegistrations = document.getElementById('settingAllowRegistrations').checked;
    const maintenanceMode = document.getElementById('settingMaintenanceMode').checked;
    await apiFetch('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ allowRegistrations, maintenanceMode }),
    });
    showToast('Settings saved.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================
// CANDIDATE DASHBOARD
// ============================================================
const INTERVIEW_TYPE_OPTIONS = [
  { value: 'Java Developer', label: 'Java Developer' },
  { value: 'Python Developer', label: 'Python Developer' },
  { value: 'Frontend Developer', label: 'Frontend Developer' },
  { value: 'Data Analyst', label: 'Data Analyst' },
  { value: 'HR Interview', label: 'HR Interview' },
];
const MODE_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
];

async function initCandidateDashboard() {
  await Promise.all([
    loadCandidateStats(),
    loadCandidateHistory(),
    loadNotificationsInto('candidateNotifications'),
    loadChatContacts(),
  ]);
}

async function loadCandidateStats() {
  try {
    const stats = await apiFetchPy('/interviews/me/stats');
    setStat('statMockInterviews', stats.mockInterviews);
    setStat('statAverageScore', `${stats.averageScore}%`);
    setStat('statReportsGenerated', stats.reportsGenerated);
    setStat('statUpcoming', stats.upcomingInterviews);
    setProgress('progressCommunication', stats.skills.communication);
    setProgress('progressTechnical', stats.skills.technical);
    setProgress('progressConfidence', stats.skills.confidence);
    setProgress('progressProblemSolving', stats.skills.problemSolving);
  } catch (err) {
    console.error('Failed to load candidate stats:', err);
  }
}

function setProgress(id, value) {
  const bar = document.getElementById(id);
  const label = document.getElementById(`${id}Label`);
  if (bar) bar.value = value;
  if (label) label.textContent = `${value}%`;
}

// ---------------- Score trend (candidate performance enhancement) ----------------
function renderScoreTrend(interviews) {
  const container = document.getElementById('scoreTrendChart');
  if (!container) return;

  const completed = interviews
    .filter((iv) => iv.status === 'completed' && iv.score !== null && iv.score !== undefined)
    .sort((a, b) => new Date(a.completed_at || a.scheduled_at) - new Date(b.completed_at || b.scheduled_at));

  if (completed.length === 0) {
    container.innerHTML = '<p style="color:var(--ink-soft)">No completed interviews yet — finish one to start tracking your trend.</p>';
    return;
  }

  const scores = completed.map((iv) => iv.score);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const best = Math.max(...scores);
  const latest = scores[scores.length - 1];
  const trendDelta = scores.length > 1 ? latest - scores[scores.length - 2] : 0;
  const trendLabel =
    scores.length > 1
      ? trendDelta > 0
        ? `▲ +${trendDelta}% vs your previous interview`
        : trendDelta < 0
        ? `▼ ${trendDelta}% vs your previous interview`
        : `— unchanged vs your previous interview`
      : 'Complete another interview to see a trend';

  const shown = completed.slice(-8);
  const chartMax = Math.max(...shown.map((iv) => iv.score), 1);

  container.innerHTML = `
    <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:18px;">
      <div><div style="font-size:1.4rem;font-weight:700;">${latest}%</div><div style="font-size:0.78rem;color:var(--ink-soft)">Latest score</div></div>
      <div><div style="font-size:1.4rem;font-weight:700;">${avg}%</div><div style="font-size:0.78rem;color:var(--ink-soft)">Average score</div></div>
      <div><div style="font-size:1.4rem;font-weight:700;">${best}%</div><div style="font-size:0.78rem;color:var(--ink-soft)">Best score</div></div>
      <div><div style="font-size:1.4rem;font-weight:700;">${trendDelta > 0 ? '📈' : trendDelta < 0 ? '📉' : '➖'}</div><div style="font-size:0.78rem;color:var(--ink-soft)">${trendLabel}</div></div>
    </div>
    <div style="display:flex;align-items:flex-end;gap:14px;height:140px;">
      ${shown
        .map((iv) => {
          const heightPct = Math.max(6, Math.round((iv.score / chartMax) * 100));
          return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;" title="${escapeHtml(iv.interview_type)} — ${iv.score}% on ${formatDate(iv.completed_at || iv.scheduled_at)}">
              <span style="font-size:0.75rem;font-weight:600;margin-bottom:4px;">${iv.score}%</span>
              <div style="width:100%;max-width:40px;height:${heightPct}%;background:${iv.score === best ? 'var(--signal)' : 'var(--signal-tint)'};border:1px solid var(--signal);border-radius:6px 6px 0 0;"></div>
              <span style="font-size:0.68rem;color:var(--ink-soft);margin-top:6px;text-align:center;">${formatDate(iv.completed_at || iv.scheduled_at)}</span>
            </div>`;
        })
        .join('')}
    </div>`;
}

// ---------------- Navigation to the live proctored session ----------------
// Some static file servers (e.g. `serve`'s "clean URLs" redirect) strip the
// query string when redirecting /interview-session.html -> /interview-session,
// which drops ?id=... and sends the candidate straight back to the dashboard.
// Stashing the id in sessionStorage as a fallback makes this work regardless
// of which static server is being used.
function goToInterviewSession(id) {
  try {
    sessionStorage.setItem('pendingInterviewId', String(id));
  } catch (e) {
    /* sessionStorage unavailable — URL param is still the primary path */
  }
  window.location.href = `interview-session.html?id=${id}`;
}

async function loadCandidateHistory() {
  try {
    const interviews = await apiFetchPy('/interviews/me');
    renderScoreTrend(interviews);
    renderTableRows('candidateHistoryBody', interviews, 5, (iv) => `
      <tr>
        <td>${formatDate(iv.scheduled_at)}</td>
        <td>${escapeHtml(iv.interview_type)}</td>
        <td>${iv.score !== null ? `${iv.score}%` : '—'}</td>
        <td>${statusBadge(iv.status)}</td>
        <td>${
          iv.status === 'scheduled'
            ? Number(iv.question_count) > 0
              ? `<button onclick="goToInterviewSession(${iv.id})">▶ Start Interview</button>
                 <button style="margin-left:6px;background:transparent;border:1px solid var(--line);color:var(--ink)" onclick="cancelInterview(${iv.id})">Cancel</button>`
              : `<button onclick="attendInterview(${iv.id})">Attend Now</button>
                 <button style="margin-left:6px;background:transparent;border:1px solid var(--line);color:var(--ink)" onclick="cancelInterview(${iv.id})">Cancel</button>`
            : '—'
        }${
          Number(iv.question_count) > 0
            ? `<button style="margin-left:6px;margin-top:4px;background:transparent;border:1px solid var(--line);color:var(--ink)" onclick="viewInterviewQuestions(${iv.id})">View Questions</button>`
            : ''
        }${
          iv.status === 'completed'
            ? `<button style="margin-left:6px;margin-top:4px;background:transparent;border:1px solid var(--line);color:var(--ink)" onclick="viewInterviewFeedback(${iv.id})">💬 View Feedback</button>`
            : ''
        }${
          iv.status !== 'completed'
            ? `<button style="margin-left:6px;margin-top:4px;background:transparent;border:1px solid var(--danger, #d33);color:var(--danger, #d33)" onclick="deleteInterview(${iv.id})">🗑 Delete</button>`
            : ''
        }</td>
      </tr>`);
  } catch (err) {
    console.error('Failed to load interview history:', err);
    showToast('Could not load interview history.', 'error');
  }
}

async function deleteInterview(interviewId) {
  if (!confirm('Delete this interview permanently? This removes its questions and answers too and cannot be undone.')) {
    return;
  }
  try {
    await apiFetchPy(`/interviews/${interviewId}`, { method: 'DELETE' });
    showToast('Interview deleted.', 'success');
    loadCandidateStats();
    loadCandidateHistory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function clearInterviewHistory() {
  const wipeCompleted = confirm(
    'Clear interview history.\n\n' +
      'Press OK to also permanently delete COMPLETED interviews and their AI reports/scores.\n' +
      'Press Cancel to keep completed reports and only clear scheduled/cancelled ones.'
  );
  const scope = wipeCompleted
    ? 'This deletes EVERY interview, including completed reports and scores. This cannot be undone.'
    : 'This deletes all scheduled/cancelled interviews (completed reports are kept). This cannot be undone.';
  if (!confirm(`${scope}\n\nContinue?`)) return;

  try {
    const result = await apiFetchPy(`/interviews/me/clear?include_completed=${wipeCompleted}`, { method: 'DELETE' });
    showToast(result.message || 'Interview history cleared.', 'success');
    loadCandidateStats();
    loadCandidateHistory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function attendInterview(interviewId) {
  try {
    const interview = await apiFetchPy(`/interviews/${interviewId}/attend`, { method: 'PATCH' });
    showToast(`Interview complete — you scored ${interview.score}%!`, 'success');
    loadCandidateStats();
    loadCandidateHistory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function cancelInterview(interviewId) {
  try {
    await apiFetchPy(`/interviews/${interviewId}/cancel`, { method: 'PATCH' });
    showToast('Interview cancelled.', 'success');
    loadCandidateStats();
    loadCandidateHistory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function promptStartInterview() {
  openFormModal({
    title: '🎤 Start Mock Interview',
    submitLabel: 'Start & Get AI Score',
    fields: [
      { name: 'interviewType', label: 'Interview track', type: 'select', options: INTERVIEW_TYPE_OPTIONS },
      { name: 'mode', label: 'Mode', type: 'select', options: MODE_OPTIONS },
    ],
    onSubmit: async (values) => {
      const interview = await apiFetchPy('/interviews/start', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      showToast(`Interview scored ${interview.score}% — report ready!`, 'success');
      loadCandidateStats();
      loadCandidateHistory();
    },
  });
}

// ---------------- Module 2: Resume Upload & Skill Extraction ----------------
const RESUME_ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const RESUME_ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

function promptUploadResume() {
  openFormModal({
    title: '📄 Upload Resume for AI Analysis',
    submitLabel: 'Upload & Analyze',
    fields: [
      {
        name: 'resume',
        label: 'Resume (PDF, JPG, or PNG — max 8MB)',
        type: 'file',
        accept: 'application/pdf,image/jpeg,image/png',
      },
    ],
    onSubmit: async (values) => {
      if (!values.resume) throw new Error('Please choose a file.');
      const ext = `.${values.resume.name.split('.').pop().toLowerCase()}`;
      const typeOk = RESUME_ACCEPTED_TYPES.includes(values.resume.type) || RESUME_ACCEPTED_EXTENSIONS.includes(ext);
      if (!typeOk) {
        throw new Error('Only PDF, JPG, or PNG files are supported.');
      }
      const isImage = values.resume.type.startsWith('image/') || ['.jpg', '.jpeg', '.png'].includes(ext);

      const formData = new FormData();
      formData.append('resume', values.resume);
      const { resume } = await apiUpload('/resumes/upload', formData);
      showToast(
        isImage
          ? `Resume image scanned (OCR) — ${resume.skills.length} skills detected, ATS score ${resume.ats_score}/100!`
          : `Resume analyzed — ${resume.skills.length} skills detected, ATS score ${resume.ats_score}/100!`,
        'success'
      );
      showResumeModal(resume);
    },
  });
}

async function viewLatestResume() {
  try {
    const { resume } = await apiFetch('/resumes/me/latest');
    if (!resume) {
      return showToast('No resume uploaded yet — click Upload to add one.', 'info');
    }
    showResumeModal(resume);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showResumeModal(resume) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const skillsHtml = (resume.skills || [])
    .map((s) => `<span class="badge badge-primary" style="margin:2px">${escapeHtml(s)}</span>`)
    .join(' ') || '<span style="color:var(--muted)">No skills detected.</span>';

  const techCategories = { languages: 'Languages', frameworks: 'Frameworks / Libraries', databases: 'Databases', cloudDevops: 'Cloud / DevOps', tools: 'Tools' };
  const techHtml = Object.entries(techCategories)
    .map(([key, label]) => {
      const items = (resume.technologies && resume.technologies[key]) || [];
      if (items.length === 0) return '';
      return `<p style="margin:6px 0"><strong>${label}:</strong> ${items.map(escapeHtml).join(', ')}</p>`;
    })
    .join('');

  const expHtml =
    (resume.experience_entries || []).length > 0
      ? `<ul style="padding-left:18px;margin:6px 0">${resume.experience_entries
          .map((e) => `<li>${escapeHtml(e.context || 'Role')} <span style="color:var(--muted)">(${escapeHtml(e.duration)})</span></li>`)
          .join('')}</ul>`
      : '<p style="color:var(--muted);margin:6px 0">No distinct roles detected.</p>';

  const eduHtml =
    (resume.education || []).length > 0
      ? `<ul style="padding-left:18px;margin:6px 0">${resume.education
          .map((e) => `<li>${escapeHtml(e.degree)}${e.year ? ` — ${escapeHtml(e.year)}` : ''}</li>`)
          .join('')}</ul>`
      : '<p style="color:var(--muted);margin:6px 0">No education details detected.</p>';

  const atsScore = resume.ats_score;
  const atsBadgeClass = atsScore === null || atsScore === undefined ? 'badge-primary' : atsScore >= 80 ? 'badge-success' : atsScore >= 60 ? 'badge-warning' : 'badge-danger';
  const atsIcon = { pass: '✅', warn: '⚠️', fail: '❌' };
  const atsFindingsHtml =
    (resume.ats_feedback || []).length > 0
      ? `<ul style="padding-left:0;margin:8px 0;list-style:none">${resume.ats_feedback
          .map((f) => `<li style="padding:5px 0;border-bottom:1px solid var(--line);font-size:.88em">${atsIcon[f.status] || 'ℹ️'} ${escapeHtml(f.message)}</li>`)
          .join('')}</ul>`
      : '';
  const atsHtml =
    atsScore === null || atsScore === undefined
      ? ''
      : `<h4 style="margin:14px 0 4px">🎯 ATS Friendliness</h4>
         <p style="margin:0"><span class="badge ${atsBadgeClass}">${atsScore}/100</span>
           <span style="color:var(--muted);margin-left:8px;font-size:.88em">How reliably an Applicant Tracking System can parse this resume.</span>
         </p>
         ${atsFindingsHtml}`;

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:600px;max-height:82vh;overflow-y:auto">
      <h3>📄 ${escapeHtml(resume.original_name)}</h3>
      <p style="color:var(--muted);margin-top:-6px">Uploaded ${formatDate(resume.created_at)} · Estimated experience: ${
        resume.experience_years ? `${resume.experience_years} yrs` : 'not stated'
      }</p>

      <h4 style="margin:14px 0 4px">AI Summary</h4>
      <p style="margin:0">${escapeHtml(resume.summary || '—')}</p>

      <h4 style="margin:14px 0 4px">Skills Extracted</h4>
      <div>${skillsHtml}</div>

      <h4 style="margin:14px 0 4px">Technology Detection</h4>
      ${techHtml || '<p style="color:var(--muted)">No categorized technologies detected.</p>'}

      <h4 style="margin:14px 0 4px">Experience Parsing</h4>
      ${expHtml}

      <h4 style="margin:14px 0 4px">Education Analysis</h4>
      ${eduHtml}

      ${atsHtml}

      <div class="modal-actions">
        <button type="button" class="btn-cancel">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.btn-cancel').addEventListener('click', close);
}

// ---------------- Module 3: AI Interview Generation ----------------
const CATEGORY_OPTIONS = [
  { value: 'Mixed', label: 'Mixed (HR + Technical + Behavioral + Aptitude)' },
  { value: 'HR', label: 'HR' },
  { value: 'Technical', label: 'Technical' },
  { value: 'Behavioral', label: 'Behavioral' },
  { value: 'Aptitude', label: 'Aptitude' },
];
const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

function promptGenerateQuestions() {
  openFormModal({
    title: '✨ Generate AI Interview Questions',
    submitLabel: 'Generate Questions',
    fields: [
      { name: 'interviewType', label: 'Interview track', type: 'select', options: INTERVIEW_TYPE_OPTIONS },
      { name: 'category', label: 'Question category', type: 'select', options: CATEGORY_OPTIONS },
      { name: 'domain', label: 'Domain (for Technical, e.g. Java, Python, Frontend, Data)', type: 'text', placeholder: 'e.g. Java' },
      { name: 'difficulty', label: 'Difficulty', type: 'select', options: DIFFICULTY_OPTIONS },
      { name: 'questionCount', label: 'Number of questions', type: 'number', min: 1, placeholder: '5' },
      { name: 'mode', label: 'Mode', type: 'select', options: MODE_OPTIONS },
    ],
    onSubmit: async (values) => {
      const { interview, questions } = await apiFetchPy('/interviews/generate', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          questionCount: values.questionCount ? Number(values.questionCount) : 5,
        }),
      });
      showToast(`${questions.length} AI questions generated for "${interview.interview_type}"!`, 'success');
      // Give the success toast a moment to actually be seen before we
      // navigate away — an immediate redirect right after showToast()
      // tears down the page before the browser ever paints it.
      setTimeout(() => goToInterviewSession(interview.id), 1100);
    },
  });
}

async function viewInterviewQuestions(interviewId) {
  try {
    const { interview, questions } = await apiFetchPy(`/interviews/${interviewId}`);
    if (!questions || questions.length === 0) {
      return showToast('No AI-generated questions for this session.', 'info');
    }
    showQuestionsModal(interview, questions);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showQuestionsModal(interview, questions) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const itemsHtml = questions
    .map(
      (q, i) => `
      <li class="question-item">
        <span class="badge badge-primary">${escapeHtml(q.category)}</span>
        <span class="badge">${escapeHtml(q.difficulty)}</span>
        <p>${i + 1}. ${escapeHtml(q.question_text || q.text)}</p>
        <button type="button" style="margin-top:4px;background:transparent;border:1px solid var(--line);color:var(--ink)"
          onclick="playQuestionAudio(${interview.id}, ${q.id}, this)">🔊 Play question</button>
      </li>`
    )
    .join('');

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:560px;max-height:80vh;overflow-y:auto">
      <h3>🧠 ${escapeHtml(interview.interview_type)} — Generated Questions</h3>
      <p style="color:var(--muted);margin-top:-6px">
        Domain: ${escapeHtml(interview.domain || 'General')} · Difficulty: ${escapeHtml(interview.difficulty || 'medium')}
      </p>
      <ul class="question-list" style="list-style:none;padding:0;margin:12px 0">${itemsHtml}</ul>
      <div class="modal-actions">
        ${
          interview.status === 'scheduled'
            ? `<button type="button" class="btn-submit" onclick="goToInterviewSession(${interview.id})">▶ Start Live Interview</button>`
            : ''
        }
        <button type="button" class="btn-cancel">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.btn-cancel').addEventListener('click', close);
}

// ---------------- Candidate feedback view (Module 3 enhancement) ----------------
// Feedback is served by the Python service (backend-python) — the same
// PATCH /interviews/:id/review a recruiter/coach submits is what shows up here.
async function viewInterviewFeedback(interviewId) {
  try {
    const feedback = await apiFetchPy(`/interviews/${interviewId}/feedback`);
    showFeedbackModal(feedback);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showFeedbackModal(feedback) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const recruiterSection = feedback.has_feedback
    ? `<div style="margin-top:14px">
         <h4 style="margin-bottom:4px">🧑‍💼 Recruiter/Coach Feedback</h4>
         <p style="color:var(--muted);margin:0 0 6px 0;font-size:.85em">
           ${feedback.reviewed_by_name ? `From ${escapeHtml(feedback.reviewed_by_name)}` : ''}${
             feedback.reviewed_by_role ? ` (${escapeHtml(feedback.reviewed_by_role)})` : ''
           }
         </p>
         <p>${escapeHtml(feedback.recruiter_feedback)}</p>
       </div>`
    : `<div style="margin-top:14px">
         <h4 style="margin-bottom:4px">🧑‍💼 Recruiter/Coach Feedback</h4>
         <p style="color:var(--muted)">No recruiter or coach feedback yet — check back after your session has been reviewed.</p>
       </div>`;

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:560px;max-height:80vh;overflow-y:auto">
      <h3>💬 ${escapeHtml(feedback.interview_type)} — Feedback</h3>
      <p style="color:var(--muted);margin-top:-6px">
        Score: ${feedback.score !== null && feedback.score !== undefined ? `${feedback.score}%` : '—'}
      </p>
      <div>
        <h4 style="margin-bottom:4px">🤖 AI Feedback</h4>
        <p>${feedback.ai_feedback ? escapeHtml(feedback.ai_feedback) : 'No AI feedback available.'}</p>
      </div>
      ${recruiterSection}
      <div class="modal-actions">
        <button type="button" class="btn-cancel">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.btn-cancel').addEventListener('click', close);
}

// ---------------- Question text-to-speech (Module 3 enhancement) ----------------
// Audio needs the Authorization header, so it can't just be an <audio src="...">
// — fetch it as a blob first, then play the resulting object URL.
async function playQuestionAudio(interviewId, questionId, btnEl) {
  const originalLabel = btnEl.textContent;
  btnEl.disabled = true;
  btnEl.textContent = '⏳ Loading…';
  try {
    const token = getToken();
    let res;
    try {
      res = await fetch(`${PY_API_BASE_URL}/interviews/${interviewId}/questions/${questionId}/tts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (networkErr) {
      throw new Error("Could not reach the AI interview service (port 8001). Make sure it's running.");
    }
    if (!res.ok) {
      throw new Error('Could not generate audio for this question.');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    btnEl.textContent = '🔊 Playing…';
    audio.addEventListener('ended', () => {
      btnEl.textContent = originalLabel;
      btnEl.disabled = false;
      URL.revokeObjectURL(url);
    });
    await audio.play();
  } catch (err) {
    showToast(err.message || 'Could not play question audio.', 'error');
    btnEl.textContent = originalLabel;
  } finally {
    btnEl.disabled = false;
  }
}

function promptScheduleInterview() {
  openFormModal({
    title: '📅 Schedule an Interview',
    submitLabel: 'Book Slot',
    fields: [
      { name: 'interviewType', label: 'Interview track', type: 'select', options: INTERVIEW_TYPE_OPTIONS },
      { name: 'mode', label: 'Mode', type: 'select', options: MODE_OPTIONS },
      { name: 'scheduledAt', label: 'Date & time', type: 'datetime-local' },
    ],
    onSubmit: async (values) => {
      if (!values.scheduledAt) throw new Error('Please pick a date and time.');
      await apiFetchPy('/interviews/schedule', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      showToast('Interview scheduled!', 'success');
      loadCandidateStats();
      loadCandidateHistory();
    },
  });
}

// ============================================================
// COACH DASHBOARD
// ============================================================
async function initCoachDashboard() {
  await Promise.all([
    loadOverviewStats('coach'),
    loadCandidateSummaries('coachCandidatesBody', '📝 Review', 'coach'),
    loadSchedule('coachScheduleBody', 'today'),
    loadNotificationsInto('coachNotifications'),
    loadChatContacts(),
  ]);
}

async function loadOverviewStats(kind) {
  try {
    const overview = await apiFetchPy('/interviews/staff/overview');
    if (kind === 'coach') {
      setStat('statTotalStudents', overview.totalCandidates);
      setStat('statSessionsCompleted', overview.completedCount);
      setStat('statAvgSuccess', `${overview.averageScore}%`);
      setStat('statTodaySessions', overview.todayCount);
    } else {
      setStat('statTotalCandidates', overview.totalCandidates);
      setStat('statInterviewsToday', overview.todayCount);
      setStat('statHiringSuccess', `${overview.hiringSuccess}%`);
      setProgress('progressHiringRate', overview.hiringSuccess);
    }
    setProgress('progressCommunication', overview.skills.communication);
    setProgress('progressTechnical', overview.skills.technical);
    setProgress('progressConfidence', overview.skills.confidence);
    setProgress('progressProblemSolving', overview.skills.problemSolving);
  } catch (err) {
    console.error('Failed to load overview stats:', err);
  }
}

async function loadCandidateSummaries(tbodyId, actionLabel, role) {
  try {
    const candidates = await apiFetchPy('/interviews/staff/candidates');
    CANDIDATE_SUMMARIES_CACHE = candidates;
    renderTableRows(tbodyId, candidates, 5, (c) => {
      const safeName = escapeHtml(c.full_name).replace(/'/g, "\\'");
      const action =
        role === 'coach'
          ? `openReviewPicker(${c.candidate_id}, '${safeName}')`
          : `viewCandidateProfile(${c.candidate_id}, ${c.latest_interview_id}, '${safeName}')`;
      return `
      <tr>
        <td>${escapeHtml(c.full_name)}</td>
        <td>${escapeHtml(c.interview_type || '—')}</td>
        <td>${scoreBadge(c.score)}</td>
        <td>${statusBadge(c.status)}</td>
        <td><button onclick="${action}">${actionLabel}</button></td>
      </tr>`;
    });
  } catch (err) {
    console.error('Failed to load candidates:', err);
    showToast('Could not load candidates.', 'error');
  }
}

// ---------------- Schedule date tabs (coach / recruiter) ----------------
async function loadSchedule(tbodyId, dateRange) {
  try {
    const interviews = await apiFetchPy(`/interviews?status=scheduled&date=${dateRange}`);
    renderTableRows(tbodyId, interviews, 4, (iv) => `
      <tr>
        <td>${escapeHtml(iv.candidate_name)}</td>
        <td>${formatDateTime(iv.scheduled_at)}</td>
        <td>${escapeHtml(iv.interview_type)}</td>
        <td>${escapeHtml(iv.mode.charAt(0).toUpperCase() + iv.mode.slice(1))}</td>
      </tr>`);
  } catch (err) {
    console.error('Failed to load schedule:', err);
  }
}

function setScheduleTab(btnEl, tbodyId, dateRange) {
  const tabRow = btnEl.parentElement;
  tabRow.querySelectorAll('.schedule-tab').forEach((b) => b.classList.remove('active'));
  btnEl.classList.add('active');
  loadSchedule(tbodyId, dateRange);
}

// ---------------- Coach: pick which interview to leave feedback on ----------------
async function openReviewPicker(candidateId, candidateName) {
  try {
    const interviews = await apiFetchPy(`/interviews/staff/candidates/${candidateId}/interviews`);
    if (!interviews.length) {
      showToast(`${candidateName} has no interviews yet.`, 'error');
      return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <h3>📝 Review — ${escapeHtml(candidateName)}</h3>
        <p style="color:var(--ink-soft);font-size:0.85rem;margin:-6px 0 12px;">Choose which interview to leave feedback on.</p>
        <div style="max-height:320px;overflow-y:auto;">
          ${interviews
            .map(
              (iv) => `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);">
              <div>
                <strong>${escapeHtml(iv.interview_type)}</strong><br>
                <span style="font-size:0.78rem;color:var(--ink-soft)">${formatDate(iv.scheduled_at || iv.created_at)} • ${statusBadge(iv.status)}${iv.score !== null ? ` • ${iv.score}%` : ''}</span>
              </div>
              <button ${iv.status !== 'completed' ? 'disabled title="Only completed interviews can be reviewed"' : ''}
                onclick="this.closest('.modal-overlay').remove(); promptReview(${iv.id}, '${escapeHtml(candidateName).replace(/'/g, "\\'")}')">
                Give Feedback
              </button>
            </div>`
            )
            .join('')}
        </div>
        <div class="modal-actions" style="margin-top:14px;">
          <button type="button" class="btn-cancel">Close</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.btn-cancel').addEventListener('click', close);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------------- Recruiter: read-only candidate profile view ----------------
let CANDIDATE_SUMMARIES_CACHE = [];

async function viewCandidateProfile(candidateId, interviewId, candidateName) {
  try {
    const feedback = await apiFetchPy(`/interviews/${interviewId}/feedback`);
    const summary = CANDIDATE_SUMMARIES_CACHE.find((c) => c.candidate_id === candidateId);
    const bio = summary && summary.bio ? escapeHtml(summary.bio) : 'No bio provided yet.';
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <h3>👁 ${escapeHtml(candidateName)}</h3>
        <p style="margin:0 0 10px;"><strong>${escapeHtml(feedback.interview_type)}</strong> — ${statusBadge(feedback.status)} ${feedback.score !== null ? `• ${feedback.score}%` : ''}</p>
        <h4 style="margin-bottom:4px;">👤 Bio</h4>
        <p style="color:var(--ink-soft);font-size:0.88rem;">${bio}</p>
        <h4 style="margin-bottom:4px;">🤖 AI Feedback</h4>
        <p style="color:var(--ink-soft);font-size:0.88rem;">${feedback.ai_feedback ? escapeHtml(feedback.ai_feedback) : 'Not available yet.'}</p>
        <h4 style="margin-bottom:4px;">🧑‍🏫 Coach Feedback</h4>
        <p style="color:var(--ink-soft);font-size:0.88rem;">${feedback.has_feedback ? escapeHtml(feedback.recruiter_feedback) : 'No coach feedback on this session yet.'}</p>
        <div class="modal-actions" style="margin-top:14px;">
          <button type="button" class="btn-cancel">Close</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.btn-cancel').addEventListener('click', close);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function promptReview(interviewId, candidateName) {
  openFormModal({
    title: `📝 Review — ${candidateName}`,
    submitLabel: 'Save Feedback',
    fields: [{ name: 'feedback', label: 'Feedback for this candidate', type: 'textarea' }],
    onSubmit: async (values) => {
      if (!values.feedback) throw new Error('Please write some feedback.');
      await apiFetchPy(`/interviews/${interviewId}/review`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      showToast('Feedback saved.', 'success');
    },
  });
}

// ============================================================
// CHAT (candidate <-> coach)
// ============================================================
let chatActiveContactId = null;
let chatPollInterval = null;
let CHAT_CONTACTS_CACHE = [];

async function loadChatContacts() {
  const listEl = document.getElementById('chatContactsList');
  if (!listEl) return; // page has no chat widget (recruiter/admin)
  try {
    const { contacts } = await apiFetch('/chat/contacts');
    CHAT_CONTACTS_CACHE = contacts;
    if (!contacts.length) {
      listEl.innerHTML = '<p style="padding:14px;color:var(--ink-soft);font-size:0.85rem;">No contacts yet.</p>';
      return;
    }
    listEl.innerHTML = contacts
      .map((c) => {
        const avatarSrc = c.profile_picture ? `${NODE_ORIGIN}${c.profile_picture}` : 'images/profile.png';
        return `
        <div class="chat-contact${c.id === chatActiveContactId ? ' active' : ''}" onclick="selectChatContact(${c.id}, '${escapeHtml(c.full_name).replace(/'/g, "\\'")}')">
          <img src="${avatarSrc}" alt="">
          <div style="min-width:0;">
            <div class="chat-contact-name">${escapeHtml(c.full_name)}</div>
            <div class="chat-contact-preview">${c.last_message ? escapeHtml(c.last_message) : 'Say hello 👋'}</div>
          </div>
          ${c.unread_count > 0 ? `<span class="chat-contact-unread">${c.unread_count}</span>` : ''}
        </div>`;
      })
      .join('');
  } catch (err) {
    console.error('Failed to load chat contacts:', err);
    listEl.innerHTML = '<p style="padding:14px;color:var(--ink-soft);font-size:0.85rem;">Could not load contacts.</p>';
  }
}

function selectChatContact(userId, name) {
  chatActiveContactId = userId;
  document.getElementById('chatActiveContactName').textContent = name;
  document.querySelectorAll('.chat-contact').forEach((el) => el.classList.remove('active'));

  const input = document.getElementById('chatMessageInput');
  const sendBtn = document.querySelector('.chat-input-row button');
  if (input) input.disabled = false;
  if (sendBtn) sendBtn.disabled = false;

  // loadChatMessages() marks this contact's messages as read server-side —
  // refresh the contact list after it settles so the unread badge clears.
  loadChatMessages().then(loadChatContacts);
  clearInterval(chatPollInterval);
  chatPollInterval = setInterval(loadChatMessages, 5000);
}

async function loadChatMessages() {
  if (!chatActiveContactId) return;
  const container = document.getElementById('chatMessages');
  try {
    const { messages } = await apiFetch(`/chat/${chatActiveContactId}`);
    const me = getStoredUser();
    if (!messages.length) {
      container.innerHTML = '<p style="color:var(--ink-soft);text-align:center;margin-top:40px;">No messages yet — say hello 👋</p>';
      return;
    }
    const wasNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;
    container.innerHTML = messages
      .map((m) => {
        const mine = m.sender_id === me.id;
        const time = new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return `<div class="chat-bubble ${mine ? 'mine' : 'theirs'}">${escapeHtml(m.message)}<span class="chat-bubble-time">${time}</span></div>`;
      })
      .join('');
    if (wasNearBottom) container.scrollTop = container.scrollHeight;
  } catch (err) {
    console.error('Failed to load messages:', err);
  }
}

async function submitChatMessage(e) {
  e.preventDefault();
  if (!chatActiveContactId) return false;
  const input = document.getElementById('chatMessageInput');
  const text = input.value.trim();
  if (!text) return false;
  input.value = '';
  try {
    await apiFetch(`/chat/${chatActiveContactId}`, {
      method: 'POST',
      body: JSON.stringify({ message: text }),
    });
    loadChatMessages();
    loadChatContacts();
  } catch (err) {
    showToast(err.message, 'error');
    input.value = text; // restore so they don't lose it
  }
  return false;
}

// ============================================================
// RECRUITER DASHBOARD
// ============================================================
async function initRecruiterDashboard() {
  await Promise.all([
    loadOverviewStats('recruiter'),
    loadCandidateSummaries('recruiterCandidatesBody', '👁 View Profile', 'recruiter'),
    loadSchedule('recruiterScheduleBody', 'today'),
    loadJobs(),
    loadNotificationsInto('recruiterNotifications'),
  ]);
}

async function loadJobs() {
  try {
    const { jobs } = await apiFetch('/jobs');
    const openCount = jobs.filter((j) => j.is_open).length;
    setStat('statOpenPositions', openCount);
    renderTableRows('recruiterJobsBody', jobs, 5, (j) => `
      <tr>
        <td>${escapeHtml(j.title)}</td>
        <td>${escapeHtml(j.department || '—')}</td>
        <td>${escapeHtml(j.positions)}</td>
        <td>${j.is_open ? '<span class="badge badge-success">Open</span>' : '<span class="badge badge-danger">Closed</span>'}</td>
        <td><button onclick="toggleJob(${j.id}, ${!j.is_open})">${j.is_open ? 'Close' : 'Reopen'}</button></td>
      </tr>`);
  } catch (err) {
    console.error('Failed to load jobs:', err);
  }
}

async function toggleJob(jobId, makeOpen) {
  try {
    await apiFetch(`/jobs/${jobId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isOpen: makeOpen }),
    });
    showToast(makeOpen ? 'Job reopened.' : 'Job closed.', 'success');
    loadJobs();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function promptAddJob() {
  openFormModal({
    title: '💼 Add Job Opening',
    submitLabel: 'Create',
    fields: [
      { name: 'title', label: 'Job title', type: 'text', placeholder: 'e.g. Java Backend Developer' },
      { name: 'department', label: 'Department', type: 'text', placeholder: 'e.g. Engineering' },
      { name: 'positions', label: 'Number of positions', type: 'number', min: 1 },
    ],
    onSubmit: async (values) => {
      if (!values.title) throw new Error('Job title is required.');
      await apiFetch('/jobs', { method: 'POST', body: JSON.stringify(values) });
      showToast('Job opening added.', 'success');
      loadJobs();
    },
  });
}

// ---------------- Nav link helpers (top navbar + sidebar) ----------------
// The nav/sidebar links were static "#" placeholders in the original
// template. Since every dashboard is single-page, "navigating" to a
// section means smooth-scrolling to the part of the page that already
// renders that data — same pattern as the dashboard-card buttons.
function scrollToSection(e, id) {
  if (e) e.preventDefault();
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function openEditProfileModal() {
  const user = getStoredUser();
  openFormModal({
    title: '✏ Edit Profile',
    submitLabel: 'Save Changes',
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text', placeholder: user?.fullName || '' },
      { name: 'mobile', label: 'Mobile number', type: 'text', placeholder: 'Optional' },
      { name: 'bio', label: 'Bio / About Me', type: 'textarea', placeholder: 'A short line about yourself — shown to recruiters and coaches.' },
    ],
    onSubmit: async (values) => {
      if (!values.fullName) throw new Error('Full name cannot be empty.');
      const { user: updated } = await apiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      const merged = {
        ...getStoredUser(),
        fullName: updated.full_name,
        bio: updated.bio,
      };
      saveSession(getToken(), merged);
      loadProfile();
      showToast('Profile updated.', 'success');
    },
  });
  // Pre-fill values openFormModal doesn't support via `value` yet — set them after render.
  setTimeout(() => {
    const nameEl = document.getElementById('mf_fullName');
    const mobileEl = document.getElementById('mf_mobile');
    const bioEl = document.getElementById('mf_bio');
    if (nameEl) nameEl.value = user?.fullName || '';
    if (mobileEl) mobileEl.value = user?.mobile || '';
    if (bioEl) bioEl.value = user?.bio || '';
  }, 0);
}

function openChangePasswordModal() {
  openFormModal({
    title: '🔒 Change Password',
    submitLabel: 'Update Password',
    fields: [
      { name: 'currentPassword', label: 'Current password', type: 'password' },
      { name: 'newPassword', label: 'New password', type: 'password' },
      { name: 'confirmNewPassword', label: 'Confirm new password', type: 'password' },
    ],
    onSubmit: async (values) => {
      if (!values.currentPassword || !values.newPassword) {
        throw new Error('Please fill in every field.');
      }
      if (values.newPassword !== values.confirmNewPassword) {
        throw new Error('New passwords do not match.');
      }
      if (values.newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters.');
      }
      await apiFetch('/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
      });
      showToast('Password updated.', 'success');
    },
  });
}

function openPlacementTipsModal() {
  const tips = [
    ['🎯 Research the role first', 'Read the job description twice and note 3 keywords you can naturally work into your answers.'],
    ['🗣 Use the STAR method', 'Situation, Task, Action, Result — structure behavioral answers this way so you never ramble.'],
    ['💻 Think out loud in technical rounds', 'Interviewers score your reasoning, not just the final answer — narrate your approach as you go.'],
    ['❓ Prepare 2–3 questions to ask', "Asking about team structure or what success looks like in 90 days shows real interest."],
    ['📹 Check your setup early', "Camera, mic, and lighting — test them 10 minutes before any online interview, not during it."],
    ['🧘 Pause before answering', "A 2-second pause to gather your thoughts reads as confidence, not hesitation."],
    ['📝 Review your own feedback', "Re-read AI and coach feedback from past interviews before your next one — fix the same gap twice, not the same mistake."],
  ];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>💼 Placement Tips</h3>
      <div style="max-height:400px;overflow-y:auto;">
        ${tips
          .map(
            ([title, body]) => `
          <div style="padding:10px 0;border-bottom:1px solid var(--line);">
            <strong>${title}</strong>
            <p style="margin:4px 0 0;color:var(--ink-soft);font-size:0.85rem;">${body}</p>
          </div>`
          )
          .join('')}
      </div>
      <div class="modal-actions" style="margin-top:14px;">
        <button type="button" class="btn-cancel">Close</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.btn-cancel').addEventListener('click', close);
}
function navPlaceholder(e, message) {
  if (e) e.preventDefault();
  showToast(message);
}
