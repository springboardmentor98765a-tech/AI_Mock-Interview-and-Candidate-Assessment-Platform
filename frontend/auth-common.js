/* ==========================================================
   AI INTERVIEW PRO
   auth-common.js
   Shared authentication helpers used by every page
   (landing page, candidate/recruiter/admin dashboards).
   Load this file BEFORE script.js / candidate.js / recruiter.js / admin.js
========================================================== */

// Change this if your backend runs on a different host/port.
const API_BASE_URL = "http://127.0.0.1:8000";

const AUTH_TOKEN_KEY = "aiip_token";
const AUTH_USER_KEY = "aiip_user";

/* ===============================
      SESSION STORAGE HELPERS
================================ */

function saveSession(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getStoredUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

function isLoggedIn() {
  return !!getToken();
}

/* ===============================
      DASHBOARD REDIRECT
================================ */

function dashboardUrlForRole(role) {
  if (role === "candidate") return "candidate.html";
  if (role === "recruiter") return "recruiter.html";
  if (role === "admin") return "admin.html";
  return "index.html";
}

function redirectToDashboard(role) {
  window.location.href = dashboardUrlForRole(role);
}

/* ===============================
      AUTHENTICATED FETCH
================================ */

async function authFetch(path, options = {}) {
  const token = getToken();
  const headers = Object.assign(
    { "Content-Type": "application/json" },
    options.headers || {},
    token ? { Authorization: "Bearer " + token } : {}
  );

  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers,
  });

  return response;
}

/* ===============================
      LOGOUT
================================ */

async function logoutUser() {
  try {
    await authFetch("/logout", { method: "POST" });
  } catch (err) {
    // Even if the network call fails, still clear the local session.
    console.warn("Logout request failed, clearing session locally.", err);
  }
  clearSession();
  window.location.href = "index.html";
}

function wireLogoutButton(selector) {
  const btn = document.querySelector(selector);
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      logoutUser();
    });
  }
}

/* ===============================
      PROTECT A DASHBOARD PAGE
      Call at the top of candidate.js / recruiter.js / admin.js
================================ */

async function requireAuth(expectedRole) {
  const token = getToken();
  const cachedUser = getStoredUser();

  if (!token || !cachedUser) {
    window.location.href = "index.html";
    return null;
  }

  // Show the cached name immediately so the UI isn't blank while we verify.
  applyWelcomeName(cachedUser.full_name);

  try {
    const response = await authFetch("/verify-token");

    if (response.status === 401 || response.status === 403) {
      clearSession();
      window.location.href = "index.html";
      return null;
    }

    if (!response.ok) {
      // Backend unreachable or another error - fall back to cached user
      // rather than locking the user out for a transient issue.
      return cachedUser;
    }

    const freshUser = await response.json();
    saveSession(token, freshUser);

    if (expectedRole && freshUser.role !== expectedRole) {
      // Logged in, but not authorized for this specific dashboard
      redirectToDashboard(freshUser.role);
      return null;
    }

    applyWelcomeName(freshUser.full_name);
    return freshUser;
  } catch (err) {
    console.warn("Could not verify session with server, using cached session.", err);
    return cachedUser;
  }
}

function applyWelcomeName(fullName) {
  const el = document.getElementById("welcomeUser");
  if (el && fullName) {
    el.innerHTML = "Welcome, " + fullName + " 👋";
  }
}

/* ===============================
      LANDING PAGE: HANDLE GOOGLE
      OAUTH REDIRECT BACK
      (token/role/name arrive as query params)
================================ */

function handleGoogleRedirectIfPresent() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const role = params.get("role");
  const name = params.get("name");
  const authError = params.get("auth_error");

  if (authError) {
    alert("Google sign-in failed. Please try again.");
    window.history.replaceState({}, document.title, window.location.pathname);
    return false;
  }

  if (!token) {
    // Not a Google OAuth redirect at all - nothing to do here.
    return false;
  }

  window.history.replaceState({}, document.title, window.location.pathname);

  if (role) {
    // Existing account (already has a role) - log straight in, no
    // role-selection step needed.
    saveSession(token, { full_name: name || "", role: role });
    redirectToDashboard(role);
    return true;
  }

  // No role came back - this is a brand-new Google sign-up. Hold the
  // token in memory only (not saved to localStorage yet) and ask the
  // person which role they want before creating the full session.
  window.googleTempToken = token;

  const googleRoleModal = document.getElementById("googleRoleModal");
  if (googleRoleModal) {
    googleRoleModal.style.display = "flex";
  }
  return true;
}


/* ===============================
      IF ALREADY LOGGED IN ON LANDING PAGE
================================ */
function redirectIfAlreadyLoggedIn() {
  const user = getStoredUser();
  if (user && getToken()) {
    redirectToDashboard(user.role);
  }
}

document
  .getElementById("continueGoogleRole")
  ?.addEventListener("click", async () => {

    const roleSelect = document.getElementById("google-role");
    const error = document.getElementById("google-role-error");

    const role = roleSelect.value;

    if (!role) {
      error.innerHTML = "Please select your role.";
      return;
    }

    try {

      const response = await fetch(
        API_BASE_URL + "/auth/google/select-role",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + window.googleTempToken
          },
          body: JSON.stringify({
            role: role
          })
        }
      );


      const data = await response.json();


      if (!response.ok) {
        error.innerHTML =
          data.detail || "Unable to update role.";
        return;
      }


      saveSession(
        data.access_token,
        data.user
      );


      document.getElementById("googleRoleModal").style.display = "none";


      redirectToDashboard(data.user.role);


    } catch(err) {

      console.error("Google role update error:", err);
      error.innerHTML =
        "Server error. Please try again.";

    }

});
