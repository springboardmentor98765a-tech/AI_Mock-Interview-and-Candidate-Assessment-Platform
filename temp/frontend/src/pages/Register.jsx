import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({
    name: 'DIV KUMAR',
    email: 'candidate@smarthire.ai',
    phone: '+91 555 000 0000',
    password: 'secret_key',
    confirm: 'secret_key',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
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
      await new Promise((resolve) => setTimeout(resolve, 600));
      navigate('/login', { replace: true, state: { registered: true, email: form.email } });
    } catch {
      setError('Could not create your account. Try again.');
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
        <h2>Create candidate account</h2>

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
          <input id="email" type="email" required value={form.email} onChange={update('email')} />
        </div>

        <div className="field">
          <label className="label" htmlFor="phone">
            Phone
          </label>
          <input id="phone" type="tel" value={form.phone} onChange={update('phone')} />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={form.password}
            onChange={update('password')}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="confirm">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
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
