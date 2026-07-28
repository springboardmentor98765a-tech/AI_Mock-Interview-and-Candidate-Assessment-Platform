import React, { useState } from 'react';
import '../styles/LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('candidate');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }
    if (!isLoginMode && !name) {
      alert('Please enter your name');
      return;
    }
    const user = {
      email: email,
      role: role,
      name: isLoginMode ? email.split('@')[0] : name
    };
    onLogin(user);
  };

  return (
    <div className="gradient-bg login-container">
      <div className="login-card glass-card">
        <div className="login-logo">
          <div className="login-logo-box">
            <div className="login-logo-icon">
              <i className="fas fa-arrow-trend-up"></i>
            </div>
            <span className="login-logo-text">AI Mock Interview Platform</span>
          </div>
        </div>

        <div className="text-center mb-4">
          <h2 className="login-title">
            {isLoginMode ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="login-subtitle">
            {isLoginMode ? 'Sign in to access your dashboard' : 'Start your journey with AI Mock Interview Platform'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {!isLoginMode && (
            <div className="mb-3">
              <label className="form-label">
                <i className="fas fa-user"></i> Full name
              </label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
          )}

          <div className="mb-3">
            <label className="form-label">
              <i className="fas fa-envelope"></i> Email address
            </label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="mb-3 password-field">
            <label className="form-label">
              <i className="fas fa-lock"></i> Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
            {/* Password dots removed - no longer showing */}
          </div>

          <div className="mb-3">
            <label className="form-label">
              <i className="fas fa-user-tag"></i> Select Role
            </label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ borderRadius: '12px', padding: '12px 16px' }}
            >
              <option value="candidate">🎓 Candidate</option>
              <option value="recruiter">👔 Recruiter</option>
              <option value="admin">👑 Admin</option>
            </select>
          </div>

          <button type="submit" className="btn-login-submit">
            {isLoginMode ? (
              <>
                <i className="fas fa-sign-in-alt me-2"></i> Sign in
              </>
            ) : (
              <>
                <i className="fas fa-user-plus me-2"></i> Create account
              </>
            )}
          </button>
        </form>

        <div className="login-toggle">
          {isLoginMode ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => setIsLoginMode(false)}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => setIsLoginMode(true)}>
                Login
              </button>
            </>
          )}
        </div>

        <div className="login-back">
          <button onClick={() => window.location.reload()}>
            <i className="fas fa-arrow-left me-1"></i> Back to home
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;