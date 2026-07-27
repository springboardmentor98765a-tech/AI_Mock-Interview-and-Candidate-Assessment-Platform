import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SCREENS = [
  ['/', 'Landing', null],
  ['/login', 'Login', null],
  ['/register', 'Register', null],
  ['/dashboard', 'Dashboard', 'candidate'],
  ['/resume', 'Resume', 'candidate'],
  ['/interview/setup', 'Setup', 'candidate'],
  ['/interview/live', 'Live', 'candidate'],
  ['/interview/results', 'Results', 'candidate'],
  ['/interview/history', 'History', 'candidate'],
  ['/analytics', 'Analytics', 'candidate'],
  ['/settings', 'Settings', 'candidate'],
  ['/recruiter', 'Recruiter', 'recruiter'],
  ['/recruiter/analytics', 'R: analytics', 'recruiter'],
  ['/recruiter/reports', 'R: reports', 'recruiter'],
  ['/recruiter/compare', 'R: compare', 'recruiter'],
  ['/recruiter/templates', 'R: templates', 'recruiter'],
  ['/recruiter/sessions', 'R: sessions', 'recruiter'],
  ['/admin', 'Admin', 'admin'],
  ['/admin/users', 'A: users', 'admin'],
  ['/admin/recruiters/new', 'A: new recruiter', 'admin'],
  ['/admin/analytics', 'A: analytics', 'admin'],
  ['/admin/activity', 'A: activity', 'admin'],
  ['/admin/ai', 'A: AI config', 'admin'],
  ['/admin/settings', 'A: settings', 'admin'],
  ['/nope', '404', null],
];

const NAMES = {
  candidate: 'DIV KUMAR',
  recruiter: 'KUMAR KUMAR',
  admin: 'Admin User',
};

export default function DevScreenSwitcher() {
  const [open, setOpen] = useState(false);
  const { role, login, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const go = async (to, needsRole) => {
    if (needsRole && needsRole !== role) {
      await login({ email: `${needsRole}@smarthire.ai`, role: needsRole, name: NAMES[needsRole] });
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
