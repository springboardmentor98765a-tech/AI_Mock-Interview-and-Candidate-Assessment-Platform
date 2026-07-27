import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
      <div className="login-container">
        <Link to="/" className="back-home">← Back to Home</Link>
        <div className="login-card">
          <h2>Welcome Back</h2>
          <p className="login-subtitle">Sign in to access your dashboard</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Select Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="">-- Choose Role --</option>
                <option value="admin">Admin</option>
                <option value="student">Student</option>
                <option value="recruiter">Recruiter</option>
              </select>
            </div>

            <button type="submit" className="login-btn">Login</button>
          </form>

          <p className="login-note">This is a demo login. No real authentication is performed.</p>
        </div>
      </div>
    </div>
  )
}

export default Login
