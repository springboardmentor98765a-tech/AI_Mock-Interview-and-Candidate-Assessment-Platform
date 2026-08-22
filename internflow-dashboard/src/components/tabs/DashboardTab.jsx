import React from 'react';

const DashboardTab = ({ user, interviews, resumeScore }) => {
  const completedCount = interviews.filter(i => i.status === 'completed').length;
  const latestScore = interviews.length > 0 && interviews[0]?.score ? interviews[0].score : 0;

  const stats = [
    { 
      label: 'Resume Score', 
      value: `${resumeScore}/100`, 
      change: '+6 pts',
      icon: 'fa-file-alt',
      color: 'blue'
    },
    { 
      label: 'Interview Score', 
      value: `${latestScore}%`, 
      change: '+12% performance',
      icon: 'fa-microphone',
      color: 'green'
    },
    { 
      label: 'Completed Interviews', 
      value: completedCount, 
      change: `${completedCount} completed`,
      icon: 'fa-check-circle',
      color: 'purple'
    },
    { 
      label: 'Improvement', 
      value: '+24%', 
      change: 'Consistent growth',
      icon: 'fa-chart-line',
      color: 'orange'
    },
  ];

  return (
    <div className="dashboard-tab">
      <div className="tab-header">
        <h2>📊 Dashboard</h2>
        <p>Welcome back, {user?.name || 'Candidate'}! Here's your overview.</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className={`stat-card ${stat.color}`}>
            <div className="stat-icon">
              <i className={`fas ${stat.icon}`}></i>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
              <span className="stat-change positive">
                <i className="fas fa-arrow-up"></i> {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="quick-actions">
        <h3>⚡ Quick Actions</h3>
        <div className="action-grid">
          <div className="action-item" onClick={() => document.querySelector('[data-tab="resume"]')?.click()}>
            <i className="fas fa-upload"></i>
            <span>Upload Resume</span>
          </div>
          <div className="action-item" onClick={() => document.querySelector('[data-tab="interview"]')?.click()}>
            <i className="fas fa-microphone"></i>
            <span>Start Interview</span>
          </div>
          <div className="action-item" onClick={() => document.querySelector('[data-tab="analytics"]')?.click()}>
            <i className="fas fa-chart-bar"></i>
            <span>View Analytics</span>
          </div>
          <div className="action-item" onClick={() => document.querySelector('[data-tab="history"]')?.click()}>
            <i className="fas fa-history"></i>
            <span>View History</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;