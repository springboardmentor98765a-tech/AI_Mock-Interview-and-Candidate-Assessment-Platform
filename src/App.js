import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.css';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import RecruiterDashboard from './components/RecruiterDashboard';
import CandidateDashboard from './components/CandidateDashboard';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('landing');
  };

  const renderDashboard = () => {
    if (!user) return null;
    
    switch(user.role) {
      case 'admin':
        return <AdminDashboard user={user} />;
      case 'recruiter':
        return <RecruiterDashboard user={user} />;
      case 'candidate':
        return <CandidateDashboard user={user} />;
      default:
        return <div>Unknown role</div>;
    }
  };

  if (currentPage === 'landing') {
    return (
      <>
        <nav className="navbar navbar-expand-lg navbar-custom fixed-top">
          <div className="container">
            <div className="navbar-brand-custom">
              <i className="fas fa-arrow-trend-up"></i>
              AI Mock Interview Platform
            </div>
            <div>
              <button 
                onClick={() => setCurrentPage('login')}
                className="btn btn-login"
              >
                <i className="fas fa-sign-in-alt me-2"></i> Login
              </button>
            </div>
          </div>
        </nav>
        <LandingPage onLoginClick={() => setCurrentPage('login')} />
      </>
    );
  }

  if (currentPage === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (currentPage === 'dashboard' && user) {
    return (
      <>
        <nav className="navbar navbar-expand-lg navbar-custom fixed-top">
          <div className="container">
            <div className="navbar-brand-custom">
              <i className="fas fa-arrow-trend-up"></i>
              AI Mock Interview Platform
            </div>
            <div className="nav-user-info">
              <div className="user-avatar">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="d-none d-sm-inline text-secondary">{user.name}</span>
              <button 
                onClick={handleLogout}
                className="btn btn-logout"
              >
                <i className="fas fa-sign-out-alt me-1"></i> Logout
              </button>
            </div>
          </div>
        </nav>
        <div className="page-container">
          {renderDashboard()}
        </div>
      </>
    );
  }

  return <div>404 - Page not found</div>;
}

export default App;