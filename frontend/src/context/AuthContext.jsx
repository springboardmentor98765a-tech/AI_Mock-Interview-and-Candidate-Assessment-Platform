// ============================================================
//  AuthContext — Global authentication state
//  Stores user, role, token; handles login/logout/restore
// ============================================================
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(null);
  const [isLoading,     setIsLoading]     = useState(true); // true while restoring session
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ── Restore session from HTTP-only cookie on mount ──
  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      // Check for OAuth redirect
      const params = new URLSearchParams(window.location.search);
      const oauthResult = params.get('oauth');

      if (oauthResult === 'error') {
        const provider = params.get('provider') || 'OAuth';
        const reason = params.get('reason');
        const msg = reason === 'deactivated'
          ? 'Account deactivated. Contact an administrator.'
          : reason === 'no_email'
            ? `Could not retrieve email from ${provider}. Please ensure your email is public or verified.`
            : `Sign in with ${provider} failed. Please try again.`;
        // Store error to be picked up by login page
        sessionStorage.setItem('oauth_error', msg);
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
        setIsLoading(false);
        return;
      }

      if (oauthResult === 'success') {
        // Clean URL immediately
        window.history.replaceState({}, '', window.location.pathname);
      }

      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method:      'GET',
        credentials: 'include',   // send cookie
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setIsAuthenticated(true);
      }
    } catch (_err) {
      // Network error or no session — stay logged out
    } finally {
      setIsLoading(false);
    }
  }

  // ── Login ──
  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    setUser(data.user);
    setIsAuthenticated(true);
    return data.user;
  }, []);

  // ── Register ──
  const register = useCallback(async (name, email, password, role) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      // Surface validation errors
      if (data.errors?.length) throw new Error(data.errors[0].msg);
      throw new Error(data.message || 'Registration failed');
    }
    setUser(data.user);
    setIsAuthenticated(true);
    return data.user;
  }, []);

  // ── Logout ──
  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST', credentials: 'include',
      });
    } catch (_err) { /* ignore */ }
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
