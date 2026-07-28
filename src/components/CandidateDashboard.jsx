import React from 'react';
import '../styles/CandidateDashboard.css';
import { CANDIDATE_DATA } from '../data/dummyData';

const CandidateDashboard = ({ user }) => {
  return (
    <div className="candidate-dashboard py-4">
      <div className="container">
        {/* Welcome Section - Changed */}
        <div className="welcome-section">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1>Welcome back, {CANDIDATE_DATA.name}! 👋</h1>
              <p>
                Your AI mock interview score increased by <strong>{CANDIDATE_DATA.weeklyGrowth}%</strong> this week. 
                You're in the top <strong>{CANDIDATE_DATA.topPercentile}%</strong> of candidates for {CANDIDATE_DATA.role} roles.
              </p>
              <div className="welcome-badge">
                <i className="fas fa-rocket"></i>
                Quick Practice
              </div>
            </div>
            <div className="col-md-4 text-md-end">
              <button className="btn btn-light rounded-pill px-4">
                <i className="fas fa-play me-2"></i> Start Practice
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-4 mb-4">
          <div className="col-md-3 col-sm-6">
            <div className="stat-card">
              <div className="stat-icon blue">
                <i className="fas fa-file-alt"></i>
              </div>
              <div className="stat-number">{CANDIDATE_DATA.resumeScore}/100</div>
              <div className="stat-label">Resume Score</div>
              <div className="stat-change positive">
                <i className="fas fa-arrow-up me-1"></i> +6 pts vs last ATS check
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stat-card">
              <div className="stat-icon green">
                <i className="fas fa-microphone"></i>
              </div>
              <div className="stat-number">{CANDIDATE_DATA.interviewScore}%</div>
              <div className="stat-label">Interview Score</div>
              <div className="stat-change positive">
                <i className="fas fa-arrow-up me-1"></i> +12% performance
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stat-card">
              <div className="stat-icon purple">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stat-number">{CANDIDATE_DATA.completedInterviews}</div>
              <div className="stat-label">Completed Interviews</div>
              <div className="stat-change positive">
                <i className="fas fa-arrow-up me-1"></i> 4 completed this month
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stat-card">
              <div className="stat-icon orange">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="stat-number">+{CANDIDATE_DATA.improvement}%</div>
              <div className="stat-label">Improvement</div>
              <div className="stat-change positive">
                <i className="fas fa-arrow-up me-1"></i> Consistent growth
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Changed */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="action-card">
              <div className="action-icon indigo">
                <i className="fas fa-upload"></i>
              </div>
              <h5 className="action-title">📄 ATS-Ready Resume Upload</h5>
              <p className="action-desc">
                Upload your latest CV in PDF or DOCX format to receive instant AI scoring.
              </p>
              <div className="d-flex gap-2 mb-2">
                <span className="badge bg-success bg-opacity-10 text-success">
                  Keyword Match {CANDIDATE_DATA.atsScore}%
                </span>
                <span className="badge bg-primary bg-opacity-10 text-primary">
                  ATS Formatting {CANDIDATE_DATA.formattingScore}%
                </span>
              </div>
              <button className="btn btn-outline-primary btn-sm rounded-pill">
                <i className="fas fa-cloud-upload-alt me-1"></i> Upload New Resume
              </button>
            </div>
          </div>
          <div className="col-md-4">
            <div className="action-card">
              <div className="action-icon emerald">
                <i className="fas fa-robot"></i>
              </div>
              <h5 className="action-title">🤖 AI Mock Interview Studio</h5>
              <p className="action-desc">
                Participate in adaptive voice and text AI mock interview sessions.
              </p>
              <div className="action-tag active mb-2">
                <i className="fas fa-circle" style={{ fontSize: '6px' }}></i>
                Real-time AI Voice Engine Active
              </div>
              <button className="btn btn-success btn-sm rounded-pill">
                <i className="fas fa-play me-1"></i> Start Mock Interview
              </button>
            </div>
          </div>
          <div className="col-md-4">
            <div className="action-card">
              <div className="action-icon amber">
                <i className="fas fa-history"></i>
              </div>
              <h5 className="action-title">📊 Session History & Analytics</h5>
              <p className="action-desc">
                Review transcripts, recorded answers, AI critique notes, and historical scores.
              </p>
              <div className="d-flex gap-2 mb-2">
                <span className="badge bg-warning bg-opacity-10 text-warning">
                  React Senior Dev Round 94%
                </span>
                <span className="badge bg-info bg-opacity-10 text-info">
                  Behavioral Leadership 89%
                </span>
              </div>
              <button className="btn btn-outline-warning btn-sm rounded-pill">
                <i className="fas fa-list me-1"></i> View Full History
              </button>
            </div>
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-chart-bar text-primary me-2"></i>
                    📈 Performance Analytics Dashboard
                  </h5>
                  <span className="badge bg-success bg-opacity-10 text-success">
                    <i className="fas fa-arrow-up me-1"></i> +{CANDIDATE_DATA.weeklyGrowth}% Weekly
                  </span>
                </div>
                <p className="text-muted small">
                  Explore deep analytics on response velocity, technical accuracy, confidence metrics, and clarity scoring across domains.
                </p>
                <button className="btn btn-primary btn-sm rounded-pill">
                  <i className="fas fa-chart-pie me-1"></i> Explore Analytics
                </button>
                <hr />
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted small">Download Reports</span>
                    <div className="d-flex align-items-center gap-2 mt-1">
                      <i className="fas fa-file-pdf text-danger"></i>
                      <span className="small">AI_Evaluation_Report.pdf</span>
                      <span className="badge bg-secondary bg-opacity-10 text-secondary">
                        {CANDIDATE_DATA.reports[0].size}
                      </span>
                    </div>
                  </div>
                  <button className="btn btn-outline-danger btn-sm">
                    <i className="fas fa-download me-1"></i> Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-tasks text-success me-2"></i>
                    🎯 Skill Growth Tracker
                  </h5>
                  <span className="badge bg-success">On Track</span>
                </div>
                <p className="text-muted small">
                  Monitor your skill milestone progression, weak spots resolution rate, and personalized AI practice recommendations.
                </p>
                <div className="progress-skill">
                  <div className="progress-skill-header">
                    <span className="progress-skill-name">System Architecture</span>
                    <span className="progress-skill-score">78%</span>
                  </div>
                  <div className="progress-skill-bar">
                    <div className="progress-skill-fill blue" style={{ width: '78%' }}></div>
                  </div>
                </div>
                <div className="progress-skill">
                  <div className="progress-skill-header">
                    <span className="progress-skill-name">Algorithms & Data Struct.</span>
                    <span className="progress-skill-score">91%</span>
                  </div>
                  <div className="progress-skill-bar">
                    <div className="progress-skill-fill green" style={{ width: '91%' }}></div>
                  </div>
                </div>
                <div className="progress-skill">
                  <div className="progress-skill-header">
                    <span className="progress-skill-name">React & Frontend</span>
                    <span className="progress-skill-score">94%</span>
                  </div>
                  <div className="progress-skill-bar">
                    <div className="progress-skill-fill purple" style={{ width: '94%' }}></div>
                  </div>
                </div>
                <button className="btn btn-outline-success btn-sm rounded-pill w-100 mt-2">
                  <i className="fas fa-road me-1"></i> View Growth Roadmap
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Sessions Table - Changed */}
        <div className="card shadow-sm">
          <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
            <h5 className="mb-0">
              <i className="fas fa-clock text-primary me-2"></i>
              🕐 Recent Interview Session Logs
            </h5>
            <button className="btn btn-outline-secondary btn-sm">
              <i className="fas fa-file-export me-1"></i> Export CSV
            </button>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table session-table mb-0">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Target Role</th>
                    <th>Session Type</th>
                    <th>Duration</th>
                    <th>AI Score</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {CANDIDATE_DATA.recentSessions.map((session, idx) => (
                    <tr key={idx}>
                      <td>{session.date}</td>
                      <td>{session.role}</td>
                      <td>{session.type}</td>
                      <td>{session.duration}</td>
                      <td><strong>{session.score}%</strong></td>
                      <td>
                        <span className={`status-badge ${session.status.toLowerCase()}`}>
                          {session.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary rounded-pill">
                          <i className="fas fa-file-alt me-1"></i> View Report
                        </button>
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
  © 2026 AI Mock Interview Platform Candidate Portal. All buttons are for UI demonstration.
</div>
      </div>
    </div>
  );
};

export default CandidateDashboard;