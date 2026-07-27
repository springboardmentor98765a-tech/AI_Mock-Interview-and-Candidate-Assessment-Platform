import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, HOME_BY_ROLE, roleFromEmail } from '../context/AuthContext';

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285f4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09z"
    />
    <path
      fill="#34a853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.99.66-2.25 1.05-3.71 1.05a6.63 6.63 0 0 1-6.22-4.58H2.18v2.84A11 11 0 0 0 12 23z"
    />
    <path
      fill="#fbbc05"
      d="M5.78 14.05a6.6 6.6 0 0 1 0-4.1V7.11H2.18a11 11 0 0 0 0 9.78l3.6-2.84z"
    />
    <path
      fill="#ea4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.11l3.6 2.84A6.63 6.63 0 0 1 12 5.38z"
    />
  </svg>
);

const GithubMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.1.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.87.12 3.17.77.84 1.24 1.91 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22v3.29c0 .32.21.69.83.58A12 12 0 0 0 12 .5z" />
  </svg>
);

export default function Login() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email ?? 'candidate@smarthire.ai');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Only honour the pre-login destination if the signed-in role may open it.
  const landAfterLogin = (role) => {
    const home = HOME_BY_ROLE[role];
    const from = location.state?.from;
    navigate(from && from.startsWith(home) ? from : home, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const session = await login({ email, password });
      landAfterLogin(session.role);
    } catch {
      setError('Could not sign you in. Check your details and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleProvider = async (provider) => {
    setError(null);
    setBusy(true);
    try {
      const session = await login({ email, provider });
      landAfterLogin(session.role);
    } catch {
      setError(`Could not sign you in with ${provider}.`);
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

        {location.state?.registered && (
          <p className="note">Account created. Log in to continue.</p>
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Logging in...' : 'Log in'}
        </button>

        <p className="divider">or</p>

        <button
          type="button"
          className="btn btn-block"
          disabled={busy}
          onClick={() => handleProvider('google')}
        >
          <GoogleMark />
          Continue with Google
        </button>

        <div className="gap-top">
          <button
            type="button"
            className="btn btn-block"
            disabled={busy}
            onClick={() => handleProvider('github')}
          >
            <GithubMark />
            Continue with GitHub
          </button>
        </div>

        <p className="box-foot">
          No account? <Link to="/register">Sign up</Link>
        </p>
        <p className="box-foot mono">signing in as {roleFromEmail(email)}</p>
      </form>
    </div>
  );
}
