import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brain, User, Mail, Lock, ChevronDown, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import '../styles/login.css'

function Register() {
  const navigate       = useNavigate()
  const { register }   = useAuth()

  const [form, setForm]         = useState({ name: '', email: '', password: '', confirm: '', role: 'USER' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim() || !form.email.trim() || !form.password || !form.role) {
      return setError('Please fill in all fields.')
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters.')
    }
    if (form.password !== form.confirm) {
      return setError('Passwords do not match.')
    }

    setLoading(true)
    try {
      const user = await register(form.name.trim(), form.email.trim(), form.password, form.role)
      const roleMap = { ADMIN: '/admin', RECRUITER: '/recruiter', USER: '/student' }
      navigate(roleMap[user.role] || '/student')
    } catch (err) {
      if (err.errors && err.errors.length) {
        setError(err.errors.map(e => e.message).join('. '))
      } else {
        setError(err.message || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
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
          <h1>Join the AI Recruitment Platform</h1>
          <p>Create your account and access role-specific dashboards, AI mock interviews, and smart analytics.</p>
          <div className="login-features">
            <div className="login-feature"><span className="login-feature-dot"></span>AI Mock Interviews</div>
            <div className="login-feature"><span className="login-feature-dot"></span>Smart Candidate Ranking</div>
            <div className="login-feature"><span className="login-feature-dot"></span>Resume Analysis</div>
            <div className="login-feature"><span className="login-feature-dot"></span>Performance Analytics</div>
          </div>
        </motion.div>
      </div>

      <div className="login-right">
        <motion.div className="login-form-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/login" className="back-home"><ArrowLeft size={16} /> Back to Login</Link>

          <div className="login-card">
            <h2>Create Account</h2>
            <p className="login-subtitle">Fill in your details to get started</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="reg-name">Full Name</label>
                <div className="input-wrapper">
                  <User size={18} />
                  <input id="reg-name" type="text" placeholder="Your full name" value={form.name} onChange={set('name')} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-email">Email</label>
                <div className="input-wrapper">
                  <Mail size={18} />
                  <input id="reg-email" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-role">Role</label>
                <div className="input-wrapper">
                  <ChevronDown size={18} />
                  <select id="reg-role" value={form.role} onChange={set('role')}>
                    <option value="USER">Candidate</option>
                    <option value="RECRUITER">Recruiter</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-password">Password</label>
                <div className="input-wrapper">
                  <Lock size={18} />
                  <input
                    id="reg-password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={form.password}
                    onChange={set('password')}
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-confirm">Confirm Password</label>
                <div className="input-wrapper">
                  <Lock size={18} />
                  <input
                    id="reg-confirm"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={form.confirm}
                    onChange={set('confirm')}
                  />
                </div>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="login-note" style={{ marginTop: 16 }}>
              Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Register
