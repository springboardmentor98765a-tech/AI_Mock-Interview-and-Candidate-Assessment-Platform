import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);

  // Handle Google OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userData = urlParams.get('user');
    const errorParam = urlParams.get('error');

    if (errorParam) {
      console.log('❌ Google login error:', errorParam);
      window.history.replaceState({}, document.title, "/login");
      setLoading(false);
      return;
    }

    if (token && userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData));
        console.log('✅ Google OAuth successful! User role:', user.role);
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        setCurrentPage('dashboard');
        
        window.history.replaceState({}, document.title, "/");
        setLoading(false);
        return;
      } catch (error) {
        console.error('❌ Error parsing Google OAuth callback:', error);
      }
    }

    // Check if user is already logged in
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    const currentPath = window.location.pathname;
    
    if (storedUser && storedToken && currentPath !== '/login') {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('📱 User found in localStorage:', parsedUser);
        setUser(parsedUser);
        setCurrentPage('dashboard');
      } catch (error) {
        console.error('❌ Error parsing stored user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    console.log('🔐 User logged in:', userData);
    setUser(userData);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    console.log('🚪 User logged out');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('landing');
    window.location.href = '/';
  };

  const renderDashboard = () => {
    if (!user) {
      return <div className="text-center mt-5">Loading...</div>;
    }
    
    const role = user.role || 'USER';
    console.log('📊 Rendering dashboard for role:', role);
    
    switch(role) {
      case 'ADMIN':
        return <AdminDashboard user={user} />;
      case 'RECRUITER':
        return <RecruiterDashboard user={user} />;
      case 'USER':
      default:
        return <CandidateDashboard user={user} />;  // ✅ Use CandidateDashboard
    }
  };

  // LANDING PAGE
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
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  setUser(null);
                  setCurrentPage('login');
                }}
                className="btn btn-login"
              >
                <i className="fas fa-sign-in-alt me-2"></i> Login
              </button>
            </div>
          </div>
        </nav>
        <LandingPage onLoginClick={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setCurrentPage('login');
        }} />
      </>
    );
  }

  // LOGIN PAGE
  if (currentPage === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  // DASHBOARD
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
              <span className="d-none d-sm-inline text-secondary">
                {user.name} 
                <span className="badge bg-light text-muted ms-1" style={{ fontSize: '0.6rem' }}>
                  {user.role || 'USER'}
                </span>
              </span>
              
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

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Loading your session...</p>
        </div>
      </div>
    );
  }

  return <div className="text-center mt-5">404 - Page not found</div>;
}

export default App;