import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Brain, Mail, Lock, ChevronDown, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import '../styles/login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()

    if (!email.trim() || !password.trim() || !role) {
      setError('Please fill in all fields and select a role.')
      return
    }

    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('role', role)

    if (role === 'admin') {
      navigate('/admin')
    } else if (role === 'student') {
      navigate('/student')
    } else if (role === 'recruiter') {
      navigate('/recruiter')
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <motion.div className="login-branding" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
          <div className="login-logo">
            <Brain size={32} />
            <span>HireAI</span>
          </div>
          <h1>Welcome to the AI Recruitment Platform</h1>
          <p>Sign in to access your personalized dashboard with AI-powered tools for smarter hiring decisions.</p>
          <div className="login-features">
            <div className="login-feature">
              <span className="login-feature-dot"></span>
              AI Mock Interviews
            </div>
            <div className="login-feature">
              <span className="login-feature-dot"></span>
              Candidate Ranking
            </div>
            <div className="login-feature">
              <span className="login-feature-dot"></span>
              Resume Analysis
            </div>
            <div className="login-feature">
              <span className="login-feature-dot"></span>
              Performance Analytics
            </div>
          </div>
        </motion.div>
      </div>
      <div className="login-right">
        <motion.div className="login-form-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/" className="back-home"><ArrowLeft size={16} /> Back to Home</Link>
          <div className="login-card">
            <h2>Sign In</h2>
            <p className="login-subtitle">Enter your credentials to continue</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <Mail size={18} />
                  <input
                    type="email"
                    id="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <Lock size={18} />
                  <input
                    type="password"
                    id="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="role">Select Role</label>
                <div className="input-wrapper">
                  <ChevronDown size={18} />
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="">-- Choose Role --</option>
                    <option value="admin">Admin</option>
                    <option value="student">Candidate</option>
                    <option value="recruiter">Recruiter</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="login-btn">Sign In</button>
            </form>

            <p className="login-note">This is a demo login. No real authentication is performed.</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Login
