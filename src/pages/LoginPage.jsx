import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Brain, Eye, EyeOff, Lock, Mail, User, Users, Shield, ArrowRight } from 'lucide-react'
import { authApi, googleLoginUrl } from '../auth/api'
import { useAuth } from '../auth/AuthContext'

const roles = [
  { value: 'USER', label: 'Candidate', icon: User },
  { value: 'RECRUITER', label: 'Recruiter', icon: Users },
  { value: 'ADMIN', label: 'Admin', icon: Shield },
]
const rolePath = { USER: '/dashboard/candidate', RECRUITER: '/dashboard/recruiter', ADMIN: '/dashboard/admin' }

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { saveSession } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' })
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = new URLSearchParams(location.search).get('token')
    if (!token) return
    localStorage.setItem('smarthire_token', token)
    authApi.profile().then((user) => { saveSession(user); navigate(rolePath[user.role], { replace: true }) }).catch(() => setError('Google sign-in could not be completed. Please try again.'))
  }, [location.search])

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const response = mode === 'login'
        ? await authApi.login({ email: form.email, password: form.password })
        : await authApi.register(form)
      const user = saveSession(response)
      navigate(rolePath[user.role], { replace: true })
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'radial-gradient(ellipse at 30% 40%, rgba(99,102,241,.18), transparent 55%), #080812' }}>
    <main className="glass-strong" style={{ width: '100%', maxWidth: 460, borderRadius: 24, padding: 36, boxShadow: '0 24px 64px rgba(0,0,0,.4)' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#6366f1,#a855f7)', marginBottom: 12 }}><Brain color="white" /></div>
        <h1 style={{ fontFamily: 'Outfit', color: '#f0f0ff', fontSize: '1.7rem' }}>SmartHire AI</h1>
        <p style={{ color: '#a0a0c0', marginTop: 8 }}>{mode === 'login' ? 'Sign in to continue' : 'Create your account'}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: 24, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)' }}>
        {['login', 'register'].map((item) => <button key={item} type="button" onClick={() => { setMode(item); setError('') }} style={{ border: 0, padding: 11, cursor: 'pointer', color: '#f0f0ff', textTransform: 'capitalize', background: mode === item ? '#6366f1' : 'rgba(255,255,255,.04)' }}>{item}</button>)}
      </div>
      <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        {mode === 'register' && <label className="form-group"><span className="form-label">Full name</span><div style={{ position: 'relative' }}><User size={16} color="#606080" style={{ position: 'absolute', left: 14, top: 14 }} /><input className="form-input" style={{ paddingLeft: 40 }} value={form.name} onChange={update('name')} required placeholder="Your name" /></div></label>}
        <label className="form-group"><span className="form-label">Email address</span><div style={{ position: 'relative' }}><Mail size={16} color="#606080" style={{ position: 'absolute', left: 14, top: 14 }} /><input className="form-input" style={{ paddingLeft: 40 }} type="email" value={form.email} onChange={update('email')} required placeholder="you@example.com" /></div></label>
        <label className="form-group"><span className="form-label">Password</span><div style={{ position: 'relative' }}><Lock size={16} color="#606080" style={{ position: 'absolute', left: 14, top: 14 }} /><input className="form-input" style={{ paddingLeft: 40, paddingRight: 44 }} type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')} required minLength="8" placeholder="At least 8 characters" /><button aria-label="Show password" type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: 10, border: 0, color: '#a0a0c0', background: 'transparent', cursor: 'pointer' }}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
        {mode === 'register' && <label className="form-group"><span className="form-label">Account type</span><select className="form-input" value={form.role} onChange={update('role')}>{roles.filter((r) => r.value !== 'ADMIN').map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>}
        {error && <p role="alert" style={{ color: '#f87171', fontSize: '.85rem', margin: 0 }}>{error}</p>}
        <button className="btn btn-primary" style={{ justifyContent: 'center', padding: 13 }} disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></button>
      </form>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0', color: '#606080', fontSize: '.75rem' }}><span style={{ height: 1, background: 'rgba(255,255,255,.1)', flex: 1 }} />OR<span style={{ height: 1, background: 'rgba(255,255,255,.1)', flex: 1 }} /></div>
      <a href={googleLoginUrl} className="btn btn-outline" style={{ display: 'flex', justifyContent: 'center', textDecoration: 'none', padding: 12 }}>Continue with Google</a>
    </main>
  </div>
}
