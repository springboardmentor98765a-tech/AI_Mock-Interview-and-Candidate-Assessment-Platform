import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SCREENS = [
  ['/', 'Landing', null],
  ['/login', 'Login', null],
  ['/register', 'Register', null],
  ['/candidate', 'Candidate', 'candidate'],
  ['/interview/live', 'Live session', 'candidate'],
  ['/recruiter', 'Recruiter', 'recruiter'],
  ['/admin', 'Admin', 'admin'],
  ['/nope', '404', null],
];

/**
 * The seeded demo accounts. Using the real login means the dev switcher gets a
 * real JWT, so the pages it opens can actually call the API — the previous
 * version called `login()` with no password and silently failed every time.
 */
const DEMO_ACCOUNTS = {
  candidate: ['candidate.demo@smarthire.dev', 'Candidate@123'],
  recruiter: ['recruiter.demo@smarthire.dev', 'Recruiter@123'],
  admin: ['admin.demo@smarthire.dev', 'Admin@123'],
};

export default function DevScreenSwitcher() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const { role, login, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const go = async (to, needsRole) => {
    setError(null);
    if (needsRole && needsRole !== role) {
      const account = DEMO_ACCOUNTS[needsRole];
      try {
        await login({ email: account[0], password: account[1] });
      } catch {
        setError(`Cannot sign in as ${needsRole}. Is the API running and seeded?`);
        return;
      }
    }
    navigate(to);
  };

  return (
    <div className="dev">
      {open && (
        <div className="dev-panel">
          {SCREENS.map(([to, label, needsRole]) => (
            <button
              key={to}
              className={pathname === to ? 'on' : undefined}
              onClick={() => go(to, needsRole)}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            Log out
          </button>
          {error && <small className="error">{error}</small>}
        </div>
      )}

      <button onClick={() => setOpen(!open)}>
        {open ? 'close' : 'dev'}
        {role ? ` : ${role}` : ''}
      </button>
    </div>
  );
}
