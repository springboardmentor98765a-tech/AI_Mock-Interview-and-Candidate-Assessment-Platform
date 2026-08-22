import React from 'react';

const CandidateSidebar = ({ activeTab, setActiveTab, user }) => {
  const menuItems = [
    { id: 'dashboard', icon: 'fa-gauge-high', label: 'Dashboard' },
    { id: 'resume', icon: 'fa-file-alt', label: 'Resume' },
    { id: 'interview', icon: 'fa-microphone', label: 'Interview' },
    { id: 'analytics', icon: 'fa-chart-line', label: 'Analytics' },
    { id: 'history', icon: 'fa-clock-rotate-left', label: 'History' },
    { id: 'recordings', icon: 'fa-video', label: 'Recordings' },
  ];

  return (
    <div className="candidate-sidebar">
      <div className="sidebar-brand">
        <i className="fas fa-arrow-trend-up"></i>
        <span>SmartHire</span>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            data-tab={item.id}
          >
            <i className={`fas ${item.icon}`}></i>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.name || 'User'}</span>
            <span className="user-role">Candidate</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateSidebar;