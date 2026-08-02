import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, HOME_BY_ROLE } from '../context/AuthContext';

export default function ProtectedRoute({ allow }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allow && !allow.includes(role)) {
    return <Navigate to={HOME_BY_ROLE[role] ?? '/'} replace />;
  }

  return <Outlet />;
}
