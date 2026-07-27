import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, Mail, Lock, ChevronDown, ArrowRight, Eye, EyeOff, User, Users, Shield, Zap } from 'lucide-react'

const ROLES = [
  { value: 'candidate', label: 'Candidate', icon: User, description: 'Job seeker & interview taker', color: '#22c55e', path: '/dashboard/candidate' },
  { value: 'recruiter', label: 'Recruiter', icon: Users, description: 'HR & talent acquisition', color: '#6366f1', path: '/dashboard/recruiter' },
  { value: 'admin',     label: 'Admin',     icon: Shield, description: 'Platform administrator', color: '#f59e0b', path: '/dashboard/admin' },
]

const DEMO_ACCOUNTS = [
  { role: 'candidate', email: 'candidate@smarthire.ai', initials: 'CD', color: '#22c55e' },
  { role: 'recruiter', email: 'recruiter@smarthire.ai', initials: 'RC', color: '#6366f1' },
  { role: 'admin',     email: 'admin@smarthire.ai',     initials: 'AD', color: '#f59e0b' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('candidate')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedRole = ROLES.find(r => r.value === role)

  const handleLogin = (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }
    setError('')
    setLoading(true)
    // Simulate short loading, then navigate
    setTimeout(() => {
      navigate(selectedRole.path)
    }, 1000)
  }

  const handleQuickLogin = (demoRole) => {
    const found = ROLES.find(r => r.value === demoRole.role)
    setLoading(true)
    setTimeout(() => navigate(found.path), 600)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 30% 40%, rgba(99,102,241,0.12) 0%, transparent 55%), radial-gradient(ellipse at 75% 70%, rgba(168,85,247,0.1) 0%, transparent 50%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative orbs */}
      <div className="orb orb-indigo" style={{ width: 500, height: 500, top: -200, left: -200, opacity: 0.2 }} />
      <div className="orb orb-purple" style={{ width: 350, height: 350, bottom: -100, right: -100, opacity: 0.15 }} />

      <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99,102,241,0.5)',
            }}>
              <Brain size={26} color="white" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.5rem', color: '#f0f0ff' }}>SmartHire <span style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span></div>
              <div style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Interview Platform</div>
            </div>
          </div>
          <p style={{ color: '#a0a0c0', fontSize: '0.9rem' }}>Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="glass-strong" style={{ borderRadius: 24, padding: '36px', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>

          {/* Quick Demo Logins */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: '0.72rem', color: '#606080', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Quick Demo Access
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {DEMO_ACCOUNTS.map((d) => (
                <button
                  key={d.role}
                  id={`quick-login-${d.role}`}
                  onClick={() => handleQuickLogin(d)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10,
                    background: `${d.color}12`, border: `1px solid ${d.color}25`,
                    cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = `${d.color}20`}
                  onMouseLeave={e => e.currentTarget.style.background = `${d.color}12`}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, margin: '0 auto 6px',
                    background: `linear-gradient(135deg, ${d.color}, ${d.color}88)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 800, color: 'white', fontFamily: 'Outfit',
                  }}>{d.initials}</div>
                  <div style={{ fontSize: '0.68rem', color: d.color, fontWeight: 700, textTransform: 'capitalize' }}>{d.role}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: '0.75rem', color: '#404060', fontWeight: 600 }}>or sign in manually</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#606080" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#606080" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: 40, paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#606080', display: 'flex'
                }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-role">Role</label>
              <div style={{ position: 'relative' }}>
                <select
                  id="login-role"
                  className="form-input"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  style={{ appearance: 'none', paddingRight: 40, cursor: 'pointer' }}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.icon && ''}{r.label} — {r.description}</option>
                  ))}
                </select>
                <ChevronDown size={16} color="#606080" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
              {/* Role preview */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: `${selectedRole.color}0e`, border: `1px solid ${selectedRole.color}20`,
                borderRadius: 8, marginTop: 6
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: selectedRole.color, boxShadow: `0 0 8px ${selectedRole.color}` }} />
                <span style={{ fontSize: '0.78rem', color: selectedRole.color, fontWeight: 600 }}>
                  Will login as: <strong>{selectedRole.label}</strong> — {selectedRole.description}
                </span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#f87171' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '0.95rem', marginTop: 4, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} /> Signing in...</>
              ) : (
                <><Zap size={16} /> Sign In to Dashboard</>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.78rem', color: '#404060' }}>
            No account needed — this is a demo platform.<br />
            <span style={{ color: '#6366f1', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/')}>← Back to Home</span>
          </p>
        </div>
      </div>
    </div>
  )
}
