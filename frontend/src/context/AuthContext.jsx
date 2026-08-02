import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, api, getToken, setToken } from '../lib/api';

const STORAGE_KEY = 'smarthire.session';
const LOCK_KEY = 'smarthire.lockouts';

export const MAX_ATTEMPTS = 3;
export const LOCK_MINUTES = 30;

const AuthContext = createContext(null);

export const HOME_BY_ROLE = {
  candidate: '/candidate',
  recruiter: '/recruiter',
  admin: '/admin',
};

function initials(name) {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** The API speaks CANDIDATE/RECRUITER/ADMIN; the routes speak lowercase. */
function toSession(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: String(user.role).toLowerCase(),
    provider: String(user.provider).toLowerCase(),
    initials: initials(user.name),
  };
}

/* ---------- failed-attempt lockout ----------
   Purely a client-side courtesy: it slows down a careless typist, not an
   attacker, since anyone can clear localStorage. Real rate limiting belongs
   on the server. */

function readLockouts() {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLockouts(all) {
  localStorage.setItem(LOCK_KEY, JSON.stringify(all));
}

/** Current lock state for an address: { locked, attempts, until }. */
export function getLockout(email) {
  const key = String(email).toLowerCase();
  const all = readLockouts();
  const entry = all[key];
  if (!entry) return { locked: false, attempts: 0, until: null };

  if (entry.until && Date.now() >= entry.until) {
    delete all[key]; // the penalty has expired, forget it
    writeLockouts(all);
    return { locked: false, attempts: 0, until: null };
  }

  return {
    locked: Boolean(entry.until),
    attempts: entry.attempts ?? 0,
    until: entry.until ?? null,
  };
}

function recordFailure(email) {
  const key = String(email).toLowerCase();
  const all = readLockouts();
  const attempts = (all[key]?.attempts ?? 0) + 1;
  all[key] =
    attempts >= MAX_ATTEMPTS
      ? { attempts, until: Date.now() + LOCK_MINUTES * 60_000 }
      : { attempts, until: null };
  writeLockouts(all);
  return all[key];
}

function clearFailures(email) {
  const all = readLockouts();
  delete all[String(email).toLowerCase()];
  writeLockouts(all);
}

/* ---------- session ---------- */

function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    // A session without its token is useless — every API call would 401.
    if (!session || !HOME_BY_ROLE[session.role] || !getToken()) return null;
    return session;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredSession);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  // A stored JWT may have expired while the tab was closed, and the role may
  // have been changed by an admin since. Re-read the user from the server once
  // on load and drop the session if the token no longer works.
  useEffect(() => {
    if (!getToken()) return undefined;
    let cancelled = false;

    api
      .me()
      .then((fresh) => {
        if (!cancelled) setUser(toSession(fresh));
      })
      .catch((err) => {
        // Only a rejected token ends the session; a server that is simply down
        // should not sign the user out.
        if (!cancelled && err instanceof ApiError && err.status === 401) {
          setToken(null);
          setUser(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user),

      /** POST /auth/login, then keep the JWT for every later request. */
      async login({ email, password }) {
        const lock = getLockout(email);
        if (lock.locked) {
          const error = new Error('Account temporarily locked.');
          error.code = 'LOCKED';
          error.until = lock.until;
          throw error;
        }

        let data;
        try {
          data = await api.login({ email, password });
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            const entry = recordFailure(email);
            const error = new Error(err.detail);
            error.code = entry.until ? 'LOCKED' : 'BAD_CREDENTIALS';
            error.until = entry.until;
            error.remaining = Math.max(0, MAX_ATTEMPTS - entry.attempts);
            throw error;
          }
          throw err; // network failure or 5xx — surfaced as-is
        }

        clearFailures(email);
        setToken(data.access_token);
        const session = toSession(data.user);
        setUser(session);
        return session;
      },

      /** POST /auth/register. Creating an account does not sign you in. */
      register: ({ name, email, password, role }) =>
        api.register({ name, email, password, role }),

      /**
       * Finish a Google sign-in: the backend redirects back with a token in the
       * query string, and we exchange it for the profile it belongs to.
       */
      async adoptToken(token) {
        setToken(token);
        try {
          const session = toSession(await api.me());
          setUser(session);
          return session;
        } catch (err) {
          setToken(null);
          throw err;
        }
      },

      startGoogleLogin() {
        window.location.href = api.googleLoginUrl();
      },

      /** PUT /users/me. Name and password only — role is not accepted there. */
      async updateProfile(fields) {
        const session = toSession(await api.updateProfile(fields));
        setUser(session);
        return session;
      },

      /**
       * Dev-only shortcut for the screen switcher: fakes a session so the
       * role-gated pages render without logging in. It issues no JWT, so any
       * real API call made from those pages will still 401.
       */
      devLogin({ email, name, role }) {
        const session = {
          id: null,
          email,
          name,
          role,
          provider: 'dev',
          initials: initials(name),
        };
        setToken(null);
        setUser(session);
        return session;
      },

      logout() {
        setToken(null);
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
