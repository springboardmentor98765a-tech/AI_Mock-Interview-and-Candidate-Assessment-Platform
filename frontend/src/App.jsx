import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DevScreenSwitcher from './components/DevScreenSwitcher';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

import CandidateHome from './pages/candidate/CandidateHome';
import LiveSession from './pages/candidate/LiveSession';
import RecruiterHome from './pages/recruiter/RecruiterHome';
import AdminHome from './pages/admin/AdminHome';

export default function App() {
  return (
    <AuthProvider>
      {import.meta.env.DEV && <DevScreenSwitcher />}

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* One scrolling page per role. The live interview stays a separate route
            because it is a focused recording mode, not a section to scroll past. */}
        <Route element={<ProtectedRoute allow={['candidate']} />}>
          <Route path="/candidate" element={<CandidateHome />} />
          <Route path="/interview/live" element={<LiveSession />} />
        </Route>

        <Route element={<ProtectedRoute allow={['recruiter']} />}>
          <Route path="/recruiter" element={<RecruiterHome />} />
        </Route>

        <Route element={<ProtectedRoute allow={['admin']} />}>
          <Route path="/admin" element={<AdminHome />} />
        </Route>

        {/* the old per-page URLs now land on the matching section */}
        <Route path="/dashboard" element={<Navigate to="/candidate#overview" replace />} />
        <Route path="/resume" element={<Navigate to="/candidate#resume" replace />} />
        <Route path="/interview/setup" element={<Navigate to="/candidate#interview" replace />} />
        <Route path="/interview/results" element={<Navigate to="/candidate#history" replace />} />
        <Route path="/interview/history" element={<Navigate to="/candidate#history" replace />} />
        <Route path="/analytics" element={<Navigate to="/candidate#analytics" replace />} />
        <Route path="/settings" element={<Navigate to="/candidate#settings" replace />} />
        <Route path="/candidate/settings" element={<Navigate to="/candidate#settings" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
