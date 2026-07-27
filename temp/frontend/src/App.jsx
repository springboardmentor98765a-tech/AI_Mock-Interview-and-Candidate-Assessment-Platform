import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DevScreenSwitcher from './components/DevScreenSwitcher';

import Landing from './pages/Landing';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Register from './pages/Register';

// candidate
import CandidateDashboard from './pages/candidate/CandidateDashboard';
import ResumeUpload from './pages/candidate/ResumeUpload';
import InterviewSetup from './pages/candidate/InterviewSetup';
import LiveSession from './pages/candidate/LiveSession';
import InterviewResults from './pages/candidate/InterviewResults';
import InterviewHistory from './pages/candidate/InterviewHistory';
import Analytics from './pages/candidate/Analytics';
import Candidatesetting from './pages/candidate/Candidatesetting';

// recruiter
import RecruiterDashboard from './pages/recruiter/RecruiterDashboard';
import RecruiterAnalytics from './pages/recruiter/RecruiterAnalytics';
import CandidateReports from './pages/recruiter/CandidateReports';
import CompareCandidates from './pages/recruiter/CompareCandidates';
import InterviewTemplates from './pages/recruiter/InterviewTemplates';
import SessionMonitor from './pages/recruiter/SessionMonitor';

// admin
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import CreateRecruiter from './pages/admin/CreateRecruiter';
import PlatformSettings from './pages/admin/PlatformSettings';
import SystemActivity from './pages/admin/SystemActivity';
import AiConfig from './pages/admin/AiConfig';
import PlatformAnalytics from './pages/admin/PlatformAnalytics';

export default function App() {
  return (
    <AuthProvider>
      {import.meta.env.DEV && <DevScreenSwitcher />}

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute allow={['candidate']} />}>
          <Route path="/dashboard" element={<CandidateDashboard />} />
          <Route path="/resume" element={<ResumeUpload />} />
          <Route path="/interview/setup" element={<InterviewSetup />} />
          <Route path="/interview/live" element={<LiveSession />} />
          <Route path="/interview/results" element={<InterviewResults />} />
          <Route path="/interview/history" element={<InterviewHistory />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Candidatesetting />} />
          <Route path="/candidate/settings" element={<Candidatesetting />} />
        </Route>

        <Route element={<ProtectedRoute allow={['recruiter']} />}>
          <Route path="/recruiter" element={<RecruiterDashboard />} />
          <Route path="/recruiter/analytics" element={<RecruiterAnalytics />} />
          <Route path="/recruiter/reports" element={<CandidateReports />} />
          <Route path="/recruiter/compare" element={<CompareCandidates />} />
          <Route path="/recruiter/templates" element={<InterviewTemplates />} />
          <Route path="/recruiter/sessions" element={<SessionMonitor />} />
        </Route>

        <Route element={<ProtectedRoute allow={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/recruiters/new" element={<CreateRecruiter />} />
          <Route path="/admin/settings" element={<PlatformSettings />} />
          <Route path="/admin/activity" element={<SystemActivity />} />
          <Route path="/admin/ai" element={<AiConfig />} />
          <Route path="/admin/analytics" element={<PlatformAnalytics />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
