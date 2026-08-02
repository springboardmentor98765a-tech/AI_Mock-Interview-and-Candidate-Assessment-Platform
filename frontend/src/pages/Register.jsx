import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Self-registration is limited to these two; ADMIN is granted by an admin only,
// and the server rejects it here regardless of what the client sends.
const ROLES = [
  ['CANDIDATE', 'Candidate'],
  ['RECRUITER', 'Recruiter'],
];

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    role: 'CANDIDATE',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // Creating an account does not sign you in: it hands off to the login page,
  // carrying the new address so it can be prefilled there.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });
      navigate('/login', { replace: true, state: { registered: true, email: form.email } });
    } catch (err) {
      // The server owns the rules — duplicate email, password strength — so
      // show what it said rather than guessing.
      setError(err.detail ?? 'Could not create your account. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center">
      <Link to="/" className="brand">
        SmartHire<span>_AI</span>
      </Link>

      <form className="box box-wide" onSubmit={handleSubmit}>
        <h2>Create account</h2>

        <div className="field">
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input id="name" type="text" required value={form.name} onChange={update('name')} />
        </div>

        <div className="field">
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={update('email')}
          />
        </div>

        <div className="field">
          <span className="label">Account type</span>
          <div className="choices">
            {ROLES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={form.role === value ? 'choice on' : 'choice'}
                onClick={() => setForm({ ...form, role: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={update('password')}
          />
          <p className="box-foot mono">
            8+ characters, with an uppercase letter, a lowercase letter, a digit and a symbol.
          </p>
        </div>

        <div className="field">
          <label className="label" htmlFor="confirm">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={form.confirm}
            onChange={update('confirm')}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating account...' : 'Create account'}
        </button>

        <p className="box-foot">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
