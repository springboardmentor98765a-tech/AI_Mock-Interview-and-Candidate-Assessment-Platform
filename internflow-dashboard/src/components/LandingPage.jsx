import React from 'react';
import '../styles/LandingPage.css';

const LandingPage = ({ onLoginClick }) => {
  return (
    <div className="gradient-bg">
      <div className="container">
        <div className="landing-hero">
          <div className="landing-badge">
            <span className="badge-dot"></span>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
              🚀 New: AI-powered resume scoring
            </span>
          </div>
          
          <h1 className="landing-title">
            AI Mock Interview Platform — Your <span className="landing-title-highlight">Intelligent</span> Interview Platform
          </h1>
          
          <p className="landing-subtitle">
            AI-driven mock interviews, resume analysis, and role-based dashboards for candidates, recruiters, and admins.
          </p>
          
          <div className="mt-4 d-flex flex-wrap justify-content-center gap-3">
            <button 
              onClick={onLoginClick}
              className="btn btn-primary btn-lg rounded-pill px-5 py-3"
              style={{ 
                background: 'linear-gradient(135deg, #4f46e5, #3b82f6)',
                border: 'none',
                boxShadow: '0 8px 32px rgba(79, 70, 229, 0.3)'
              }}
            >
              <i className="fas fa-rocket me-2"></i> Get Started Free
            </button>
            <button className="btn btn-light btn-lg rounded-pill px-5 py-3 bg-white bg-opacity-70">
              <i className="fas fa-play-circle me-2"></i> Watch Demo
            </button>
          </div>

          <div className="landing-stats">
            <div>
              <div className="landing-stat-number">10K+</div>
              <div className="landing-stat-label">Active Users</div>
            </div>
            <div>
              <div className="landing-stat-number">95%</div>
              <div className="landing-stat-label">Satisfaction Rate</div>
            </div>
            <div>
              <div className="landing-stat-number">50+</div>
              <div className="landing-stat-label">Companies</div>
            </div>
          </div>
        </div>

        <div className="row g-4 pb-5">
          <div className="col-md-4">
            <div className="feature-card">
              <div className="feature-icon feature-icon-indigo">
                <i className="fas fa-user-graduate"></i>
              </div>
              <h3 className="feature-title">🎓 Candidate Success Hub</h3>
              <p className="feature-desc">
                Track progress, history, resume & ATS scores. Practice with AI mock interviews and get real-time feedback.
              </p>
              <div className="feature-link">
                Learn more <i className="fas fa-arrow-right"></i>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="feature-card">
              <div className="feature-icon feature-icon-emerald">
                <i className="fas fa-users"></i>
              </div>
              <h3 className="feature-title">👔 Recruiter Intelligence Suite</h3>
              <p className="feature-desc">
                Access candidate rankings, AI performance metrics, resume scores, and shortlist top talent with confidence.
              </p>
              <div className="feature-link">
                Learn more <i className="fas fa-arrow-right"></i>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="feature-card">
              <div className="feature-icon feature-icon-amber">
                <i className="fas fa-chart-line"></i>
              </div>
              <h3 className="feature-title">🏛️ Admin Governance Platform</h3>
              <p className="feature-desc">
                Monitor user activity, configure AI models, manage platform settings, and access comprehensive analytics.
              </p>
              <div className="feature-link">
                Learn more <i className="fas fa-arrow-right"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-footer">
          <div className="d-flex flex-wrap justify-content-center gap-3 mb-3">
            <span>⚡ Built for virtual internship</span>
            <span>·</span>
            <span>🔒 Role-based access</span>
            <span>·</span>
            <span>💡 AI-powered insights</span>
          </div>
          <div>© 2026 AI Mock Interview Platform. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;