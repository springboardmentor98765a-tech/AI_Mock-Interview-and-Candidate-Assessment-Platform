import React, { useState } from 'react';
import '../styles/RecruiterDashboard.css';
import { RECRUITER_DATA } from '../data/dummyData';

const RecruiterDashboard = ({ user }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCandidates = RECRUITER_DATA.candidates.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusClass = (status) => {
    return status.toLowerCase().replace(' ', '-');
  };

  return (
    <div className="recruiter-dashboard py-4">
      <div className="container">
        {/* Header - Changed */}
        <div className="recruiter-header">
          <div className="row align-items-center">
            <div className="col-md-12">
              <h1>⚡ Talent Acquisition Command Center</h1>
              <p className="text-muted mb-0">
                Review candidate AI rankings, compare evaluation performance, and manage custom interview templates.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="recruiter-stats-grid">
          <div className="recruiter-stat-card">
            <div className="stat-label">Total Candidates</div>
            <div className="stat-number">{RECRUITER_DATA.totalCandidates.toLocaleString()}</div>
            <div className="stat-change">
              <i className="fas fa-arrow-up me-1"></i> +{RECRUITER_DATA.newThisWeek} this week
            </div>
          </div>
          <div className="recruiter-stat-card">
            <div className="stat-label">Interviews</div>
            <div className="stat-number">{RECRUITER_DATA.totalInterviews.toLocaleString()}</div>
            <div className="stat-change">
              <i className="fas fa-arrow-up me-1"></i> +{RECRUITER_DATA.aiCompleted} AI completed
            </div>
          </div>
          <div className="recruiter-stat-card">
            <div className="stat-label">Shortlisted</div>
            <div className="stat-number">{RECRUITER_DATA.shortlisted}</div>
            <div className="stat-change">
              <i className="fas fa-arrow-up me-1"></i> {RECRUITER_DATA.conversionRate}% conversion
            </div>
          </div>
          <div className="recruiter-stat-card">
            <div className="stat-label">Rejected</div>
            <div className="stat-number">{RECRUITER_DATA.rejected}</div>
            <div className="stat-change" style={{ color: '#dc2626' }}>
              <i className="fas fa-filter me-1"></i> Filtered by ATS
            </div>
          </div>
        </div>

        {/* AI Insights - Changed */}
        <div className="row g-4 mb-4">
          <div className="col-md-6">
            <div className="insight-card">
              <div className="insight-icon blue">
                <i className="fas fa-brain"></i>
              </div>
              <h5 className="insight-title">🧠 AI Performance Intelligence</h5>
              <p className="insight-desc">
                Analyze individual and batch candidate performance indicators, technical depth, communication clarity, and problem-solving velocity.
              </p>
              <div className="d-flex gap-3 mt-2">
                <span className="badge bg-primary bg-opacity-10 text-primary">
                  Tech Expertise Depth 91%
                </span>
                <span className="badge bg-success bg-opacity-10 text-success">
                  Soft Skills & Culture Fit 86%
                </span>
              </div>
              <button className="btn btn-outline-primary btn-sm rounded-pill mt-2">
                <i className="fas fa-chart-bar me-1"></i> Review Analytics
              </button>
            </div>
          </div>
          <div className="col-md-6">
            <div className="insight-card">
              <div className="insight-icon green">
                <i className="fas fa-file-pdf"></i>
              </div>
              <h5 className="insight-title">📄 Automated Assessment Reports</h5>
              <p className="insight-desc">
                Access instant AI-generated PDF summary reports containing full interview transcripts, code evaluation, and sentiment analysis.
              </p>
              <div className="d-flex align-items-center gap-2 mt-2">
                <span className="badge bg-secondary bg-opacity-10 text-secondary">
                  <i className="fas fa-file-pdf me-1"></i> 128 Reports Available
                </span>
                <span className="badge bg-info bg-opacity-10 text-info">
                  Batch download or view online
                </span>
              </div>
              <button className="btn btn-outline-success btn-sm rounded-pill mt-2">
                <i className="fas fa-download me-1"></i> Access All Reports
              </button>
            </div>
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="insight-card">
              <div className="insight-icon purple">
                <i className="fas fa-people-arrows"></i>
              </div>
              <h5 className="insight-title">⚖️ Side-by-Side Candidate Comparison</h5>
              <p className="insight-desc">
                Compare multiple shortlisted candidates side-by-side using AI benchmark metrics.
              </p>
              <div className="d-flex flex-wrap gap-2 mt-2">
                <div className="candidate-match-badge">
                  <span className="candidate-name">Sarah Johnson</span>
                  <span className="match-percent high">94% Match</span>
                </div>
                <div className="candidate-match-badge">
                  <span className="candidate-name">Michael Chen</span>
                  <span className="match-percent medium">89% Match</span>
                </div>
                <div className="candidate-match-badge">
                  <span className="candidate-name">Priya Sharma</span>
                  <span className="match-percent high">92% Match</span>
                </div>
              </div>
              <button className="btn btn-outline-purple btn-sm rounded-pill mt-2">
                <i className="fas fa-balance-scale me-1"></i> Compare Talent
              </button>
            </div>
          </div>
          <div className="col-md-4">
            <div className="insight-card">
              <div className="insight-icon orange">
                <i className="fas fa-file-signature"></i>
              </div>
              <h5 className="insight-title">📋 Custom Interview Blueprints</h5>
              <p className="insight-desc">
                Design custom role-based interview question sets, difficulty levels, and AI scoring rubrics.
              </p>
              <div className="mt-2">
                <div className="template-card">
                  <div className="template-name">Senior React/Node Developer</div>
                  <div className="template-questions">12 Questions</div>
                </div>
                <div className="template-card mt-2">
                  <div className="template-name">DevOps & Cloud Architect</div>
                  <div className="template-questions">15 Questions</div>
                </div>
              </div>
              <button className="btn btn-outline-warning btn-sm rounded-pill w-100 mt-2">
                <i className="fas fa-plus me-1"></i> Create New Template
              </button>
            </div>
          </div>
          <div className="col-md-4">
            <div className="insight-card">
              <div className="insight-icon green">
                <i className="fas fa-broadcast"></i>
              </div>
              <h5 className="insight-title">📡 Real-Time Session Monitor</h5>
              <p className="insight-desc">
                Real-time monitoring feed for active candidate mock interviews with live transcription streaming.
              </p>
              <div className="live-session mt-2">
                <div className="d-flex align-items-center gap-2">
                  <span className="live-dot"></span>
                  <span className="fw-semibold">3 Live Sessions</span>
                </div>
                <div className="mt-1">
                  <span className="small">Candidate: <strong>Marcus Vance</strong></span>
                  <span className="d-block small text-muted">
                    Session: Lead Backend Engineer • Duration: 18m / 45m
                  </span>
                  <span className="badge bg-danger bg-opacity-10 text-danger mt-1">
                    <i className="fas fa-circle me-1" style={{ fontSize: '6px' }}></i>
                    Live Streaming
                  </span>
                </div>
              </div>
              <button className="btn btn-outline-success btn-sm rounded-pill w-100 mt-2">
                <i className="fas fa-eye me-1"></i> Monitor Active Sessions
              </button>
            </div>
          </div>
        </div>

        {/* Candidate Table - Changed */}
        <div className="card shadow-sm">
          <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center py-3">
            <h5 className="mb-0">
              <i className="fas fa-users text-primary me-2"></i>
              🏆 Talent Pool & Ranking Dashboard
            </h5>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Filter..."
                style={{ width: '200px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="btn btn-outline-secondary btn-sm">
                <i className="fas fa-file-export me-1"></i> Export All
              </button>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table candidate-table mb-0">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Candidate Name</th>
                    <th>Target Role</th>
                    <th>AI Resume Score</th>
                    <th>Mock Interview Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((c, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="rank-badge">#{idx + 1}</span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-medium">{c.name}</span>
                        </div>
                      </td>
                      <td>{c.role}</td>
                      <td>
                        <span className="match-score high">{c.resumeScore} / 100</span>
                      </td>
                      <td>
                        <span className="match-score high">{c.interviewScore}%</span>
                      </td>
                      <td>
                        <span className={`status-badge recruiter ${getStatusClass(c.status)}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary rounded-pill">
                          <i className="fas fa-eye me-1"></i> Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

<div className="text-center text-muted small mt-4">
  © 2026 AI Mock Interview Platform Recruiter Suite. UI demonstration frontend.
</div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;