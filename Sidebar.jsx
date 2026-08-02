import React from 'react';

export default function Sidebar({ role, activeTab, setActiveTab, onLogout }) {
  return (
    <div style={{ width: '270px', background: '#0F172A', color: 'white', padding: '30px 20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '35px' }}>
        <h3 style={{ margin: '0 0 4px 0', color: '#38BDF8', fontWeight: '800', fontSize: '22px' }}>SmartHire AI</h3>
        <small style={{ color: '#64748B', fontWeight: '600' }}>Infosys Capstone Workspace</small>
      </div>
      
      <div style={{ background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '10px', marginBottom: '25px', borderLeft: '4px solid #0284C7' }}>
        <small style={{ color: '#94A3B8', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: '700' }}>Workspace Context</small>
        <strong style={{ fontSize: '14px', color: '#10B981' }}>{role} Dashboard</strong>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <button type="button" onClick={() => setActiveTab('overview')} className={`sidebar-btn ${activeTab === 'overview' ? 'active' : ''}`}>📋 Overview Matrix</button>
        
        {role === 'Candidate' && (
          <>
            <button type="button" onClick={() => setActiveTab('resume')} className={`sidebar-btn ${activeTab === 'resume' ? 'active' : ''}`}>📄 Resume Parsing</button>
            <button type="button" onClick={() => setActiveTab('interview')} className={`sidebar-btn ${activeTab === 'interview' ? 'active' : ''}`}>🎥 Interview Sandbox</button>
            <button type="button" onClick={() => setActiveTab('reports')} className={`sidebar-btn ${activeTab === 'reports' ? 'active' : ''}`}>📊 Session Reports</button>
          </>
        )}

        {role === 'Recruiter' && (
          <>
            <button type="button" onClick={() => setActiveTab('templates')} className={`sidebar-btn ${activeTab === 'templates' ? 'active' : ''}`}>⚙️ Interview Blueprints</button>
            <button type="button" onClick={() => setActiveTab('analytics')} className={`sidebar-btn ${activeTab === 'analytics' ? 'active' : ''}`}>👥 Applicant Roster</button>
          </>
        )}

        {role === 'Admin' && (
          <>
            <button type="button" onClick={() => setActiveTab('settings')} className={`sidebar-btn ${activeTab === 'settings' ? 'active' : ''}`}>⚙️ System Settings</button>
            <button type="button" onClick={() => setActiveTab('ai-config')} className={`sidebar-btn ${activeTab === 'ai-config' ? 'active' : ''}`}>🧠 ML Architecture</button>
          </>
        )}
      </div>

      <button type="button" onClick={onLogout} className="btn-gradient" style={{ marginTop: 'auto', background: '#1E293B', boxShadow: 'none' }}>Sign Out</button>
    </div>
  );
}
