import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = {
  candidate: [
    ['/dashboard', 'Dashboard'],
    ['/resume', 'Resume'],
    ['/interview/setup', 'Interview'],
    ['/interview/history', 'History'],
    ['/analytics', 'Analytics'],
  ],
  recruiter: [
    ['/recruiter', 'Dashboard'],
    ['/recruiter/analytics', 'Analytics'],
    ['/recruiter/reports', 'Reports'],
    ['/recruiter/compare', 'Compare'],
    ['/recruiter/templates', 'Templates'],
    ['/recruiter/sessions', 'Sessions'],
  ],
  admin: [
    ['/admin', 'Overview'],
    ['/admin/users', 'Users'],
    ['/admin/analytics', 'Analytics'],
    ['/admin/activity', 'Activity'],
    ['/admin/ai', 'AI'],
    ['/admin/settings', 'Settings'],
  ],
};

export default function AppLayout({ children }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          SmartHire<span>_AI</span>
        </Link>

        <nav className="nav">
          {(NAV[role] ?? []).map(([to, label]) => (
            <NavLink key={to} to={to} end>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-end">
          {role === 'candidate' ? (
            <Link to="/settings" className="avatar" title={user?.name}>
              {user?.initials ?? '--'}
            </Link>
          ) : (
            <span className="avatar" title={user?.name}>
              {user?.initials ?? '--'}
            </span>
          )}
          <button className="btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="container">{children}</main>
    </>
  );
}
