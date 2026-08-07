import React, { useState, useEffect } from 'react';
import '../styles/LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check for Google OAuth callback on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userData = urlParams.get('user');
    const errorParam = urlParams.get('error');

    if (errorParam) {
      setError(`Google login error: ${errorParam}`);
      window.history.replaceState({}, document.title, "/login");
      return;
    }

    if (token && userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData));
        console.log('✅ Google OAuth successful! User role:', user.role);
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        onLogin(user);
        
        window.history.replaceState({}, document.title, "/login");
      } catch (error) {
        console.error('❌ Error parsing Google OAuth callback:', error);
        setError('Google login failed. Please try again.');
      }
    }
  }, [onLogin]);

  // =============================================
  // UPDATED handleSubmit - Now updates role on login
  // =============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let url, body;

      if (isLoginMode) {
        // LOGIN
        url = 'http://localhost:5000/api/auth/login';
        body = { email, password };
      } else {
        // REGISTER
        url = 'http://localhost:5000/api/auth/register';
        body = { name, email, password, role };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (isLoginMode) {
        // Get the token and user
        const token = data.token;
        const user = data.user;
        
        // If the selected role is different from the user's current role, update it
        if (role !== user.role) {
          try {
            const updateResponse = await fetch('http://localhost:5000/api/oauth/update-role', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                email: user.email,
                role: role,
              }),
            });

            if (updateResponse.ok) {
              const updatedData = await updateResponse.json();
              user.role = updatedData.user.role;
              console.log('✅ User role updated to:', user.role);
            } else {
              console.warn('⚠️ Could not update role, using existing role:', user.role);
            }
          } catch (updateError) {
            console.warn('⚠️ Error updating role, using existing role:', user.role);
          }
        }

        // Store user data with updated role
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        onLogin(user);
      } else {
        // Registration successful - switch to login mode
        alert('Registration successful! Please login.');
        setIsLoginMode(true);
        setPassword('');
        setError('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Google Login - Direct URL with role parameter
  const handleGoogleLogin = (selectedRole) => {
    console.log('🔑 Google Login clicked with role:', selectedRole);
    window.location.href = `http://localhost:5000/api/oauth/google?role=${selectedRole}`;
  };

  // Function to get the Google button text based on mode
  const getGoogleButtonText = (roleName) => {
    const roleDisplay = roleName === 'USER' ? 'Candidate' : roleName === 'RECRUITER' ? 'Recruiter' : 'Admin';
    
    if (isLoginMode) {
      return `Login with Google as ${roleDisplay}`;
    } else {
      return `Sign up with Google as ${roleDisplay}`;
    }
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

        {error && (
          <div className="alert alert-danger py-2 px-3" style={{ fontSize: '0.875rem', borderRadius: '12px' }}>
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </div>
        )}

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
                required={!isLoginMode}
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
          </div>

          {/* Role Selection - Visible for BOTH Login and Signup */}
          <div className="mb-3">
            <label className="form-label">
              <i className="fas fa-user-tag"></i> {isLoginMode ? 'Select Role to Login' : 'Select Role'}
            </label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ borderRadius: '12px', padding: '12px 16px' }}
            >
              <option value="USER">🎓 Candidate</option>
              <option value="RECRUITER">👔 Recruiter</option>
              <option value="ADMIN">👑 Admin</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="btn-login-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Processing...
              </>
            ) : (
              <>
                <i className={`fas ${isLoginMode ? 'fa-sign-in-alt' : 'fa-user-plus'} me-2`}></i>
                {isLoginMode ? 'Sign in' : 'Create account'}
              </>
            )}
          </button>
        </form>

        <div className="d-flex align-items-center my-3">
          <hr className="flex-grow-1" />
          <span className="mx-3 text-muted small">OR</span>
          <hr className="flex-grow-1" />
        </div>

        {/* Google Login with 3 Separate Buttons */}
        <div className="mb-3">
          <label className="form-label" style={{ fontWeight: 500, color: '#374151' }}>
            <i className="fas fa-user-tag me-2"></i>
            {isLoginMode ? 'Login with Google as:' : 'Sign up with Google as:'}
          </label>
          
          <div className="d-grid gap-2">
            {/* Candidate Button */}
            <button 
              onClick={() => handleGoogleLogin('USER')}
              className="btn w-100 py-2"
              style={{
                background: '#fff',
                border: '2px solid #4f46e5',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontWeight: 500,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#e0e7ff';
                e.target.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#fff';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google" 
                style={{ width: '24px', height: '24px' }}
              />
              {getGoogleButtonText('USER')}
            </button>

            {/* Recruiter Button */}
            <button 
              onClick={() => handleGoogleLogin('RECRUITER')}
              className="btn w-100 py-2"
              style={{
                background: '#fff',
                border: '2px solid #059669',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontWeight: 500,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#d1fae5';
                e.target.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#fff';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google" 
                style={{ width: '24px', height: '24px' }}
              />
              {getGoogleButtonText('RECRUITER')}
            </button>

            {/* Admin Button */}
            <button 
              onClick={() => handleGoogleLogin('ADMIN')}
              className="btn w-100 py-2"
              style={{
                background: '#fff',
                border: '2px solid #7c3aed',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontWeight: 500,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#ede9fe';
                e.target.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#fff';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google" 
                style={{ width: '24px', height: '24px' }}
              />
              {getGoogleButtonText('ADMIN')}
            </button>
          </div>
        </div>

        <div className="login-toggle mt-3">
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