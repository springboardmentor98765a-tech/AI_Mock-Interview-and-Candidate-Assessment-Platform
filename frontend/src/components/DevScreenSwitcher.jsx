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

const NAMES = {
  candidate: 'DIV KUMAR',
  recruiter: 'Sonia Rathod',
  admin: 'Admin User',
};

export default function DevScreenSwitcher() {
  const [open, setOpen] = useState(false);
  const { role, login, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const go = async (to, needsRole) => {
    if (needsRole && needsRole !== role) {
      await login({
        email: `${needsRole}@smarthire.ai`,
        role: needsRole,
        name: NAMES[needsRole],
        provider: 'dev',
      });
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
        </div>
      )}

      <button onClick={() => setOpen(!open)}>
        {open ? 'close' : 'dev'}
        {role ? ` : ${role}` : ''}
      </button>
    </div>
  );
}
