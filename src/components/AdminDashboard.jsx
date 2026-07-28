import React from 'react';
import '../styles/AdminDashboard.css';
import { ADMIN_DATA } from '../data/dummyData';

const AdminDashboard = ({ user }) => {
  return (
    <div className="admin-dashboard py-4">
      <div className="container">
        {/* Header - Changed */}
        <div className="admin-header">
          <div className="row align-items-center">
            <div className="col-md-12">
              <h1>🏛️ Admin Control Center</h1>
              <p className="text-muted mb-0">
                System governance, user administration, AI hyper-parameter tuning, and infrastructure logs.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card blue">
            <div className="stat-label">Total Users</div>
            <div className="stat-number">{ADMIN_DATA.totalUsers.toLocaleString()}</div>
            <div className="stat-sub">
              <i className="fas fa-globe me-1"></i> Active globally
            </div>
          </div>
          <div className="admin-stat-card green">
            <div className="stat-label">Recruiters</div>
            <div className="stat-number">{ADMIN_DATA.recruiters}</div>
            <div className="stat-sub">
              <i className="fas fa-check-circle me-1"></i> Verified orgs
            </div>
          </div>
          <div className="admin-stat-card purple">
            <div className="stat-label">Candidates</div>
            <div className="stat-number">{ADMIN_DATA.candidates.toLocaleString()}</div>
            <div className="stat-sub">
              <i className="fas fa-user-plus me-1"></i> Registered jobseekers
            </div>
          </div>
          <div className="admin-stat-card orange">
            <div className="stat-label">Interviews</div>
            <div className="stat-number">{ADMIN_DATA.totalInterviews.toLocaleString()}</div>
            <div className="stat-sub">
              <i className="fas fa-robot me-1"></i> Total AI sessions
            </div>
          </div>
        </div>

        {/* Management Cards - Changed */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="manage-card">
              <div className="manage-icon blue">
                <i className="fas fa-users-cog"></i>
              </div>
              <h5 className="manage-title">👥 User & Recruiter Governance</h5>
              <p className="manage-desc">
                Grant permissions, manage role access control, verify enterprise recruiter accounts, and handle user suspensions.
              </p>
              <div className="d-flex gap-2 mt-2">
                <span className="manage-badge success">
                  <i className="fas fa-check-circle me-1"></i> Verified Candidate Accounts 92%
                </span>
                <span className="manage-badge success">
                  Verified Recruiters 98%
                </span>
              </div>
              <button className="btn btn-outline-primary btn-sm rounded-pill mt-2">
                <i className="fas fa-user-cog me-1"></i> Manage Access
              </button>
            </div>
          </div>
          <div className="col-md-4">
            <div className="manage-card">
              <div className="manage-icon green">
                <i className="fas fa-sliders-h"></i>
              </div>
              <h5 className="manage-title">⚙️ Platform Configuration Hub</h5>
              <p className="manage-desc">
                Configure system themes, regional compliance policies, email notifications, webhooks, and third-party integrations.
              </p>
              <div className="d-flex gap-2 mt-2">
                <span className="manage-badge success">
                  <i className="fas fa-check-circle me-1"></i> v2.4.0 Live
                </span>
                <span className="manage-badge warning">
                  Maintenance Mode Disabled
                </span>
              </div>
              <button className="btn btn-outline-success btn-sm rounded-pill mt-2">
                <i className="fas fa-cog me-1"></i> Configure Platform
              </button>
            </div>
          </div>
          <div className="col-md-4">
            <div className="manage-card">
              <div className="manage-icon purple">
                <i className="fas fa-robot"></i>
              </div>
              <h5 className="manage-title">🤖 AI Model Fine-Tuning Studio</h5>
              <p className="manage-desc">
                Fine-tune interview evaluation prompts, temperature settings, ATS parsing weights, and specialized technical domain models.
              </p>
              <div className="d-flex gap-2 mt-2">
                <span className="manage-badge success">
                  ATS Matching Weight 85%
                </span>
                <span className="manage-badge success">
                  Voice Evaluation Temp 0.7
                </span>
              </div>
              <button className="btn btn-outline-purple btn-sm rounded-pill mt-2">
                <i className="fas fa-sliders-h me-1"></i> Configure AI Parameters
              </button>
            </div>
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-md-6">
            <div className="health-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">
                  <i className="fas fa-heartbeat text-danger me-2"></i>
                  🖥️ System Health & Telemetry
                </h5>
                <span className="badge bg-success">
                  <i className="fas fa-circle me-1" style={{ fontSize: '6px' }}></i>
                  {ADMIN_DATA.uptime}% Uptime
                </span>
              </div>
              <p className="text-muted small">
                Real-time server telemetry, latency metrics, API response rates, error tracing, and active concurrent websocket sessions.
              </p>
              <div className="row">
                <div className="col-4">
                  <div className="health-metric">
                    <div className="metric-value">{ADMIN_DATA.apiLatency} ms</div>
                    <div className="metric-label">API Latency</div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="health-metric">
                    <div className="metric-value">{ADMIN_DATA.cpuLoad}%</div>
                    <div className="metric-label">Server CPU Load</div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="health-metric">
                    <div className="metric-value">99.9%</div>
                    <div className="metric-label">Availability</div>
                  </div>
                </div>
              </div>
              <button className="btn btn-outline-primary btn-sm rounded-pill w-100">
                <i className="fas fa-thermometer-half me-1"></i> View System Health
              </button>
            </div>
          </div>
          <div className="col-md-6">
            <div className="health-card">
              <h5 className="mb-3">
                <i className="fas fa-chart-bar text-primary me-2"></i>
                📊 Global Platform Analytics
              </h5>
              <p className="text-muted small">
                Global platform usage statistics, candidate retention rates, top searched tech skills, and enterprise recruiter subscription metrics.
              </p>
              <div className="d-flex gap-2 flex-wrap mb-3">
                <span className="badge bg-primary bg-opacity-10 text-primary">
                  Monthly Growth +18%
                </span>
                <span className="badge bg-success bg-opacity-10 text-success">
                  Retention Rate 87%
                </span>
                <span className="badge bg-warning bg-opacity-10 text-warning">
                  Top Skill: React
                </span>
              </div>
              <button className="btn btn-primary btn-sm rounded-pill w-100">
                <i className="fas fa-chart-pie me-1"></i> View Platform Analytics
              </button>
            </div>
          </div>
        </div>

        {/* System Logs - Changed */}
        <div className="card shadow-sm">
          <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
            <h5 className="mb-0">
              <i className="fas fa-history text-primary me-2"></i>
              📋 System Audit Trail
            </h5>
            <button className="btn btn-outline-secondary btn-sm">
              <i className="fas fa-file-export me-1"></i> Export Logs
            </button>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table log-table mb-0">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor / User</th>
                    <th>Action Description</th>
                    <th>IP Address</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ADMIN_DATA.systemLogs.map((log, idx) => (
                    <tr key={idx}>
                      <td className="text-muted small">{log.timestamp}</td>
                      <td>
                        <span className="fw-medium">{log.actor}</span>
                      </td>
                      <td>{log.action}</td>
                      <td>{log.ip}</td>
                      <td>
                        <span className={`log-status ${log.status.toLowerCase()}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        // At the bottom of the component
<div className="text-center text-muted small mt-4">
  © 2026 AI Mock Interview Platform Admin Control Panel. UI demonstration frontend.
</div>
      </div>
    </div>
  );
};

export default AdminDashboard;