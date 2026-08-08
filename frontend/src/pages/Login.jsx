import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, HOME_BY_ROLE, getLockout, LOCK_MINUTES } from '../context/AuthContext';
import { api } from '../lib/api';

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09z" />
    <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.99.66-2.25 1.05-3.71 1.05a6.63 6.63 0 0 1-6.22-4.58H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#fbbc05" d="M5.78 14.05a6.6 6.6 0 0 1 0-4.1V7.11H2.18a11 11 0 0 0 0 9.78l3.6-2.84z" />
    <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.11l3.6 2.84A6.63 6.63 0 0 1 12 5.38z" />
  </svg>
);

const GithubMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.1.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.87.12 3.17.77.84 1.24 1.91 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22v3.29c0 .32.21.69.83.58A12 12 0 0 0 12 .5z" />
  </svg>
);

function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function Login() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState(location.state?.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [googleReady, setGoogleReady] = useState(false);
  const [githubReady, setGithubReady] = useState(false);
  const { login, adoptToken, startGoogleLogin, startGithubLogin } = useAuth();
  const navigate = useNavigate();

  // Re-check the lock whenever the address changes.
  useEffect(() => {
    const lock = getLockout(email);
    setLockedUntil(lock.locked ? lock.until : null);
  }, [email]);

  // Tick once a second so the countdown stays live and clears itself.
  useEffect(() => {
    if (!lockedUntil) return undefined;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lockedUntil) {
        setLockedUntil(null);
        setError(null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  // Social login buttons are only offered when the server actually has credentials for them.
  useEffect(() => {
    let cancelled = false;
    api
      .health()
      .then((info) => {
        if (!cancelled) {
          setGoogleReady(Boolean(info?.google_login));
          setGithubReady(Boolean(info?.github_login));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGoogleReady(false);
          setGithubReady(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Coming back from Google or GitHub: the backend redirects here with the JWT
   * it issued. Swap it for the profile, then clear it out of the address bar
   * so the token does not linger in history.
   */
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;

    setSearchParams({}, { replace: true });
    setBusy(true);
    adoptToken(token)
      .then((session) => navigate(HOME_BY_ROLE[session.role] ?? '/', { replace: true }))
      .catch(() => setError('Sign-in did not complete. Try again.'))
      .finally(() => setBusy(false));
  }, [searchParams]);

  const isLocked = Boolean(lockedUntil && now < lockedUntil);

  const landAfterLogin = (role) => {
    const home = HOME_BY_ROLE[role];
    const from = location.state?.from;
    navigate(from && from.startsWith(home) ? from : home, { replace: true });
  };

  const handleFailure = (err) => {
    if (err.code === 'LOCKED') {
      setLockedUntil(err.until ?? null);
      setNow(Date.now());
      setError(`Too many failed attempts. Login blocked for ${LOCK_MINUTES} minutes.`);
    } else if (err.code === 'BAD_CREDENTIALS') {
      setError(
        `Incorrect email or password. ${err.remaining} attempt${err.remaining === 1 ? '' : 's'} left before a ${LOCK_MINUTES}-minute block.`
      );
    } else {
      setError(err.detail ?? 'Could not sign you in. Try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) return;
    setError(null);
    setBusy(true);
    try {
      const session = await login({ email, password });
      landAfterLogin(session.role);
    } catch (err) {
      handleFailure(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center">
      <Link to="/" className="brand">
        SmartHire<span>_AI</span>
      </Link>

      <form className="box" onSubmit={handleSubmit}>
        <h2>Log in</h2>

        {location.state?.registered && <p className="note">Account created. Log in to continue.</p>}

        {isLocked && (
          <p className="error">
            Account temporarily locked after too many failed attempts. Try again in{' '}
            {formatRemaining(lockedUntil - now)}.
          </p>
        )}

        <div className="field">
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isLocked}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && !isLocked && <p className="error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy || isLocked}>
          {busy ? 'Logging in...' : isLocked ? 'Locked' : 'Log in'}
        </button>

        <p className="divider">or</p>

        <button
          type="button"
          className="btn btn-block"
          disabled={busy || isLocked || !googleReady}
          title={googleReady ? undefined : 'Google sign-in is not configured on the server yet.'}
          onClick={startGoogleLogin}
        >
          <GoogleMark />
          Continue with Google
        </button>

        <div className="gap-top">
          <button
            type="button"
            className="btn btn-block"
            disabled={busy || isLocked || !githubReady}
            title={githubReady ? undefined : 'GitHub sign-in is not configured on the server yet.'}
            onClick={startGithubLogin}
          >
            <GithubMark />
            Continue with GitHub
          </button>
        </div>

        <p className="box-foot">
          No account? <Link to="/register">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
