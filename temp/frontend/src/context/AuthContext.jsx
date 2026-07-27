import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'smarthire.session';

const AuthContext = createContext(null);

export const HOME_BY_ROLE = {
  candidate: '/dashboard',
  recruiter: '/recruiter',
  admin: '/admin',
};

/**
 * The sign-in form no longer asks for a role, so it is derived from the address.
 * Replace this with the role returned by the backend once auth is real.
 */
export function roleFromEmail(email) {
  const local = String(email).split('@')[0].toLowerCase();
  if (local.startsWith('admin')) return 'admin';
  if (local.startsWith('recruiter')) return 'recruiter';
  return 'candidate';
}

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    // reject anything that is not a session for a role the app knows about
    return session && HOME_BY_ROLE[session.role] ? session : null;
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

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user),

      // Mocked until the backend exposes POST /api/v1/auth/login.
      async login({ email, name, role, provider = 'password' }) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const displayName = name || email.split('@')[0];
        const session = {
          email,
          role: role ?? roleFromEmail(email),
          name: displayName,
          initials: initials(displayName),
          provider,
        };
        setUser(session);
        return session;
      },

      logout() {
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
