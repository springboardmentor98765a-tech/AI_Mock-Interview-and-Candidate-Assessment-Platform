// ============================================================
//  App.jsx — SmartHire Root Component with Auth Integration
// ============================================================
import { useState } from 'react';
import './styles/app.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Header    from './components/layout/Header';
import Sidebar   from './components/layout/Sidebar';

// Candidate
import ResumeUpload       from './components/candidate/ResumeUpload';
import InterviewRoom      from './components/candidate/InterviewRoom';
import Analytics          from './components/candidate/Analytics';
import InterviewHistory   from './components/candidate/InterviewHistory';
import ImprovementTracker from './components/candidate/ImprovementTracker';

// Recruiter
import CandidateOverview   from './components/recruiter/CandidateOverview';
import CandidateReports    from './components/recruiter/CandidateReports';
import ComparisonDashboard from './components/recruiter/ComparisonDashboard';
import TemplateBuilder     from './components/recruiter/TemplateBuilder';
import ActiveSessions      from './components/recruiter/ActiveSessions';

// Admin
import UserManagement from './components/admin/UserManagement';
import PlatformConfig from './components/admin/PlatformConfig';
import SystemMonitor  from './components/admin/SystemMonitor';
import AIConfig       from './components/admin/AIConfig';
import GlobalStats    from './components/admin/GlobalStats';

// ── View registries ──────────────────────────────────────────
const defaultTabs = { candidate: 'resume', recruiter: 'overview', admin: 'users' };

const candidateViews = {
  resume:    ResumeUpload,
  interview: InterviewRoom,
  analytics: Analytics,
  history:   InterviewHistory,
  tracker:   ImprovementTracker,
};
const recruiterViews = {
  overview:   CandidateOverview,
  reports:    CandidateReports,
  comparison: ComparisonDashboard,
  builder:    TemplateBuilder,
  sessions:   ActiveSessions,
};
const adminViews = {
  users:   UserManagement,
  config:  PlatformConfig,
  monitor: SystemMonitor,
  ai:      AIConfig,
  stats:   GlobalStats,
};
const viewsByRole = { candidate: candidateViews, recruiter: recruiterViews, admin: adminViews };

// ── Loading screen ───────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="auth-loading-screen">
      <div className="auth-loading-spinner" />
      <p className="auth-loading-text">Loading SmartHire…</p>
    </div>
  );
}

// ── Forbidden screen ─────────────────────────────────────────
function ForbiddenScreen({ role }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'hsl(222,47%,5%)', gap: 16,
    }}>
      <div style={{ fontSize: 48 }}>🚫</div>
      <h2 style={{ fontFamily: 'Outfit,sans-serif', color: 'hsl(220,20%,85%)', fontSize: 22 }}>
        Access Denied
      </h2>
      <p style={{ color: 'hsl(220,15%,55%)', fontSize: 14 }}>
        Your role ({role}) does not have permission to access this area.
      </p>
    </div>
  );
}

// ── Dashboard shell (requires auth) ─────────────────────────
function Dashboard() {
  const { role, isLoading } = useAuth();
  const [tabs, setTabs] = useState(defaultTabs);

  if (isLoading) return <LoadingScreen />;

  const handleTabChange = (tab) => setTabs(t => ({ ...t, [role]: tab }));

  const views     = viewsByRole[role];
  const activeTab = tabs[role];
  const ActiveView = views?.[activeTab] || (() => null);

  return (
    <div className="app-shell">
      <Header activeRole={role} activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="app-body">
        <Sidebar role={role} activeTab={activeTab} onTabChange={handleTabChange} />
        <main className="main-content" id="main-content">
          <ActiveView key={`${role}-${activeTab}`} />
        </main>
      </div>
    </div>
  );
}

// ── Inner app (inside AuthProvider) ─────────────────────────
function InnerApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <LoginPage onSuccess={() => {}} />;
  return <Dashboard />;
}

// ── Root export ──────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
}
