import { useEffect, useState, useRef } from 'react'
import {
  Users, UserCheck, User, Activity, Shield, Settings, TrendingUp,
  Server, Bell, Lock, Database, Globe, AlertTriangle, CheckCircle,
  RefreshCw, Download, Plus, Trash2, Edit3, Eye, MoreHorizontal,
  UserX, UserCog, Mail, X, ChevronRight, Hash, Calendar, Clock, Zap
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../auth/AuthContext'
import { adminApi } from '../auth/api'

// ─── Static data ──────────────────────────────────────────────────────────────

const USAGE_DATA = [
  { month: 'Feb', users: 680,  interviews: 420 },
  { month: 'Mar', users: 760,  interviews: 510 },
  { month: 'Apr', users: 820,  interviews: 590 },
  { month: 'May', users: 940,  interviews: 680 },
  { month: 'Jun', users: 1100, interviews: 810 },
  { month: 'Jul', users: 1284, interviews: 940 },
]

const PIE_DATA = [
  { name: 'Candidates', value: 1246, color: '#6366f1' },
  { name: 'Recruiters', value: 38,   color: '#06b6d4' },
]

const INITIAL_USERS = [
  { id: 1,  name: 'Priya Patel',   role: 'Recruiter',  email: 'priya@company.com',   status: 'Active',   loginMethod: 'Google', lastLogin: '2 hours ago',  joined: 'Jan 2026', initials: 'PP', color: '#6366f1', phone: '+91 98765 43210', interviews: 34, score: 92 },
  { id: 2,  name: 'Vikram Singh',  role: 'Candidate',  email: 'vikram@mail.com',      status: 'Active',   loginMethod: 'GitHub', lastLogin: '5 hours ago',  joined: 'Feb 2026', initials: 'VS', color: '#22c55e', phone: '+91 91234 56789', interviews: 7,  score: 78 },
  { id: 3,  name: 'Sneha Reddy',   role: 'Candidate',  email: 'sneha@mail.com',       status: 'Inactive', loginMethod: 'Email',  lastLogin: '3 days ago',   joined: 'Mar 2026', initials: 'SR', color: '#a855f7', phone: '+91 87654 32109', interviews: 3,  score: 64 },
  { id: 4,  name: 'Amit Sharma',   role: 'Recruiter',  email: 'amit@company.com',     status: 'Active',   loginMethod: 'Google', lastLogin: 'Yesterday',    joined: 'Mar 2026', initials: 'AS', color: '#f59e0b', phone: '+91 99887 76655', interviews: 51, score: 88 },
  { id: 5,  name: 'Riya Kapoor',   role: 'Candidate',  email: 'riya@mail.com',        status: 'Active',   loginMethod: 'GitHub', lastLogin: '1 hour ago',   joined: 'Apr 2026', initials: 'RK', color: '#ef4444', phone: '+91 80012 34567', interviews: 12, score: 81 },
  { id: 6,  name: 'Dev Malhotra',  role: 'Recruiter',  email: 'dev@company.com',      status: 'Disabled', loginMethod: 'Email',  lastLogin: '2 weeks ago',  joined: 'May 2026', initials: 'DM', color: '#06b6d4', phone: '+91 70011 22334', interviews: 8,  score: 55 },
  { id: 7,  name: 'Ananya Gupta',  role: 'Admin',      email: 'ananya@smarthire.ai',  status: 'Active',   loginMethod: 'Email',  lastLogin: '30 mins ago',  joined: 'Jan 2026', initials: 'AG', color: '#f59e0b', phone: '+91 98001 12345', interviews: 0,  score: 100 },
  { id: 8,  name: 'Rohan Mehta',   role: 'Candidate',  email: 'rohan@mail.com',       status: 'Active',   loginMethod: 'Google', lastLogin: '4 hours ago',  joined: 'Jun 2026', initials: 'RM', color: '#06b6d4', phone: '+91 77889 00112', interviews: 5,  score: 73 },
  { id: 9,  name: 'Zara Khan',     role: 'Recruiter',  email: 'zara@company.com',     status: 'Active',   loginMethod: 'GitHub', lastLogin: 'Just now',     joined: 'Jul 2026', initials: 'ZK', color: '#a855f7', phone: '+91 95544 33221', interviews: 19, score: 90 },
  { id: 10, name: 'Kabir Nair',    role: 'Candidate',  email: 'kabir@mail.com',       status: 'Inactive', loginMethod: 'Email',  lastLogin: '1 week ago',   joined: 'Jun 2026', initials: 'KN', color: '#22c55e', phone: '+91 83300 55667', interviews: 2,  score: 60 },
]

const ROLE_CYCLE = { Candidate: 'Recruiter', Recruiter: 'Admin', Admin: 'Candidate' }
const ROLE_COLORS = { Recruiter: '#6366f1', Admin: '#f59e0b', Candidate: '#06b6d4' }
const INITIALS_COLORS = ['#6366f1','#22c55e','#a855f7','#f59e0b','#ef4444','#06b6d4']

const INITIAL_HEALTH = [
  { label: 'API Server',   status: 'Online',  uptime: '99.9%', color: '#22c55e', ms: '42ms'  },
  { label: 'AI Engine',    status: 'Online',  uptime: '99.7%', color: '#22c55e', ms: '118ms' },
  { label: 'Database',     status: 'Online',  uptime: '100%',  color: '#22c55e', ms: '8ms'   },
  { label: 'Media Server', status: 'Warning', uptime: '97.2%', color: '#f59e0b', ms: '340ms' },
]

const SETTINGS_ITEMS = [
  { icon: Bell,     label: 'Email Notifications',  desc: 'Send alerts for key events',           enabled: true  },
  { icon: Lock,     label: 'Two-Factor Auth',       desc: 'Require 2FA for all admin accounts',   enabled: true  },
  { icon: Globe,    label: 'Public API Access',     desc: 'Allow external API integrations',       enabled: false },
  { icon: Database, label: 'Auto Backup',           desc: 'Daily database snapshots to cloud',     enabled: true  },
  { icon: Activity, label: 'Real-time Analytics',   desc: 'Stream live platform usage data',       enabled: true  },
  { icon: Shield,   label: 'Content Moderation',    desc: 'AI-powered response screening',         enabled: false },
]

// ─── Small helpers ─────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="custom-tooltip">
        <p style={{ color: '#a0a0c0', marginBottom: 6 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontWeight: 700, marginBottom: 2 }}>{p.name}: {p.value.toLocaleString()}</p>
        ))}
      </div>
    )
  }
  return null
}

const GoogleSVG = ({ size = 11 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
)

const GitHubSVG = ({ size = 11, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill={color} d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
)

const LoginMethodBadge = ({ method }) => {
  const configs = {
    Google: { color: '#4285F4', bg: 'rgba(66,133,244,0.12)',  border: 'rgba(66,133,244,0.25)' },
    GitHub: { color: '#e6edf3', bg: 'rgba(230,237,243,0.08)', border: 'rgba(230,237,243,0.18)' },
    Email:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)' },
  }
  const c = configs[method] || configs.Email
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: c.bg, border: `1px solid ${c.border}`, fontSize: '0.72rem', fontWeight: 600, color: c.color }}>
      {method === 'Google' && <GoogleSVG size={11} />}
      {method === 'GitHub' && <GitHubSVG size={11} />}
      {method === 'Email'  && <Mail size={10} />}
      {method}
    </span>
  )
}

// ─── Add User Modal ────────────────────────────────────────────────────────────

const BLANK_FORM = { name: '', email: '', phone: '', role: 'Candidate', loginMethod: 'Email', status: 'Active' }

function AddUserModal({ onClose, onAdd }) {
  const [form, setForm] = useState(BLANK_FORM)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name  = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    return e
  }

  const handle = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const submit = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    const words = form.name.trim().split(' ')
    const initials = (words[0][0] + (words[1]?.[0] || '')).toUpperCase()
    const color = INITIALS_COLORS[Math.floor(Math.random() * INITIALS_COLORS.length)]
    onAdd({
      id: Date.now(),
      ...form,
      name: form.name.trim(),
      initials,
      color,
      lastLogin: 'Never',
      joined: new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      interviews: 0,
      score: 0,
    })
    onClose()
  }

  const Field = ({ label, field, type = 'text', placeholder, children }) => (
    <div className="form-group" style={{ marginBottom: 14 }}>
      <label className="form-label" style={{ fontSize: '0.78rem' }}>{label}</label>
      {children || (
        <input
          className="form-input"
          type={type}
          placeholder={placeholder}
          value={form[field]}
          onChange={handle(field)}
          style={{ fontSize: '0.85rem' }}
        />
      )}
      {errors[field] && <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4 }}>{errors[field]}</div>}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,7,17,0.75)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#0e0e1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 32, boxShadow: '0 32px 80px rgba(0,0,0,0.6)', position: 'relative' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={18} color="white" />
            </div>
            <div>
              <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff' }}>Add New User</div>
              <div style={{ fontSize: '0.72rem', color: '#606080' }}>Fill in the details to create an account</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#a0a0c0', padding: '6px 8px', cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <Field label="Full Name *" field="name" placeholder="e.g. Arjun Mehta" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <Field label="Email Address *" field="email" type="email" placeholder="user@example.com" />
          </div>
          <Field label="Phone (optional)" field="phone" placeholder="+91 98765 43210" />
          <Field label="Role">
            <select className="form-input" value={form.role} onChange={handle('role')} style={{ fontSize: '0.85rem', appearance: 'none', cursor: 'pointer' }}>
              <option>Candidate</option>
              <option>Recruiter</option>
              <option>Admin</option>
            </select>
          </Field>
          <Field label="Login Method">
            <select className="form-input" value={form.loginMethod} onChange={handle('loginMethod')} style={{ fontSize: '0.85rem', appearance: 'none', cursor: 'pointer' }}>
              <option>Email</option>
              <option>Google</option>
              <option>GitHub</option>
            </select>
          </Field>
          <Field label="Status">
            <select className="form-input" value={form.status} onChange={handle('status')} style={{ fontSize: '0.85rem', appearance: 'none', cursor: 'pointer' }}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Field>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', padding: '11px' }}>Cancel</button>
          <button onClick={submit} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '11px' }}>
            <Plus size={15} /> Create User
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── User Detail Drawer ────────────────────────────────────────────────────────

function UserDrawer({ user, onClose }) {
  if (!user) return null
  const statusColor = { Active: '#22c55e', Inactive: '#f59e0b', Disabled: '#ef4444' }[user.status] || '#606080'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(7,7,17,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ width: 360, background: '#0e0e1f', borderLeft: '1px solid rgba(255,255,255,0.08)', height: '100%', overflowY: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Top */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontFamily: 'Outfit', fontWeight: 700, color: '#f0f0ff', fontSize: '0.95rem' }}>User Profile</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#a0a0c0', padding: '6px 8px', cursor: 'pointer', display: 'flex' }}>
            <X size={15} />
          </button>
        </div>

        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg,${user.color},${user.color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, color: 'white', fontFamily: 'Outfit', boxShadow: `0 0 24px ${user.color}40` }}>
            {user.initials}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: '#f0f0ff', fontSize: '1.05rem', fontFamily: 'Outfit' }}>{user.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#606080', marginTop: 2 }}>{user.email}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span className={`badge badge-${user.role === 'Recruiter' ? 'primary' : user.role === 'Admin' ? 'warning' : 'accent'}`}>{user.role}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, background: `${statusColor}14`, border: `1px solid ${statusColor}30`, fontSize: '0.72rem', fontWeight: 600, color: statusColor }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
              {user.status}
            </span>
          </div>
        </div>

        {/* Info rows */}
        {[
          { icon: Mail,     label: 'Email',         value: user.email },
          { icon: Hash,     label: 'Phone',         value: user.phone || '—' },
          { icon: Calendar, label: 'Joined',         value: user.joined },
          { icon: Clock,    label: 'Last Login',     value: user.lastLogin },
          { icon: Zap,      label: 'Login Method',   value: user.loginMethod },
          { icon: Activity, label: 'Interviews',     value: `${user.interviews} completed` },
          { icon: TrendingUp,label: 'Avg Score',     value: user.score > 0 ? `${user.score} / 100` : 'N/A' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={14} color="#6366f1" />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#606080', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              <div style={{ fontSize: '0.85rem', color: '#a0a0c0', marginTop: 2 }}>{value}</div>
            </div>
          </div>
        ))}

        {/* Score bar */}
        {user.score > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.78rem', color: '#a0a0c0', fontWeight: 600 }}>Performance Score</span>
              <span style={{ fontSize: '0.78rem', color: '#6366f1', fontWeight: 700 }}>{user.score}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${user.score}%`, background: 'linear-gradient(90deg,#6366f1,#a855f7)', borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth()
  const displayName = user?.name || 'Administrator'
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const [settings,     setSettings]     = useState(SETTINGS_ITEMS.map(s => s.enabled))
  const [users,        setUsers]        = useState(INITIAL_USERS)
  const [health,       setHealth]       = useState(INITIAL_HEALTH)
  const [showAddModal, setShowAddModal] = useState(false)
  const [viewUser,     setViewUser]     = useState(null)
  const [refreshing,   setRefreshing]   = useState(false)
  const [analytics,    setAnalytics]    = useState(null)
  const [loginActivity, setLoginActivity] = useState([])
  const [userFilter, setUserFilter] = useState('all')

  useEffect(() => {
    adminApi.users().then((records) => {
      setUsers(records.map((account, index) => ({
        id: account.id,
        name: account.name,
        role: account.role === 'USER' ? 'Candidate' : account.role === 'RECRUITER' ? 'Recruiter' : 'Admin',
        email: account.email,
        status: account.is_active ? 'Active' : 'Disabled',
        loginMethod: account.provider === 'GOOGLE' ? 'Google' : 'Email',
        lastLogin: account.last_login ? new Date(account.last_login).toLocaleString() : 'Never',
        joined: new Date(account.created_at).toLocaleDateString(),
        initials: account.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
        color: INITIALS_COLORS[index % INITIALS_COLORS.length],
        phone: '', interviews: 0, score: 0,
      })))
    }).catch(() => {})
    adminApi.analytics().then(setAnalytics).catch(() => {})
    adminApi.loginActivity().then(setLoginActivity).catch(() => {})
  }, [])
  const [toast,        setToast]        = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const toggleSetting = (i) => setSettings(prev => prev.map((v, idx) => idx === i ? !v : v))

  const toggleDisable = async (idx) => {
    const account = users[idx]
    const shouldEnable = account.status === 'Disabled'
    try {
      const updated = await adminApi.setUserStatus(account.id, shouldEnable)
      setUsers((current) => current.map((item) => item.id === updated.id ? { ...item, status: updated.is_active ? 'Active' : 'Disabled' } : item))
      showToast(`${account.name} ${updated.is_active ? 're-enabled' : 'disabled'} successfully`)
    } catch (err) {
      showToast(err.message, 'danger')
    }
  }

  const changeRole = (idx) => {
    setUsers(prev => prev.map((u, i) => {
      if (i !== idx) return u
      const next = ROLE_CYCLE[u.role] || 'Candidate'
      showToast(`${u.name}'s role changed to ${next}`)
      return { ...u, role: next }
    }))
  }

  const deleteUser = (idx) => {
    const name = users[idx].name
    setUsers(prev => prev.filter((_, i) => i !== idx))
    showToast(`${name} removed from platform`, 'danger')
  }

  const addUser = (newUser) => {
    setUsers(prev => [newUser, ...prev])
    showToast(`${newUser.name} added successfully!`)
  }

  const handleExport = () => {
    const headers = ['Name','Email','Role','Status','Login Method','Last Login','Joined','Phone','Interviews','Score']
    const rows = users.map(u => [u.name, u.email, u.role, u.status, u.loginMethod, u.lastLogin, u.joined, u.phone || '', u.interviews, u.score])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `smarthire-users-${Date.now()}.csv`
    a.click()
    showToast('Users exported as CSV')
  }

  const handleRefresh = () => {
    if (refreshing) return
    setRefreshing(true)
    setTimeout(() => {
      setHealth(prev => prev.map(s => ({
        ...s,
        ms: `${Math.floor(Math.random() * 300 + 10)}ms`,
        uptime: s.status === 'Online' ? `${(99 + Math.random()).toFixed(1)}%` : s.uptime,
      })))
      setRefreshing(false)
      showToast('System health refreshed')
    }, 1400)
  }

  const handleAdminNavigation = (label) => {
    const targets = {
      Dashboard: 'admin-dashboard-top',
      'All Users': 'admin-users',
      Recruiters: 'admin-users',
      Analytics: 'admin-analytics',
      Settings: 'admin-settings',
    }
    setUserFilter(label === 'Recruiters' ? 'recruiters' : 'all')
    document.getElementById(targets[label])?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Derived KPI from live user state
  const totalUsers = analytics?.total_users ?? users.length
  const totalRecruiters = analytics?.recruiters ?? users.filter(u => u.role === 'Recruiter').length
  const totalCandidates = analytics?.candidates ?? users.filter(u => u.role === 'Candidate').length
  const activeSessions = analytics?.active_sessions ?? 0
  const growthData = analytics?.growth ?? []
  const distributionData = analytics ? [
    { name: 'Candidates', value: analytics.candidates, color: '#6366f1' },
    { name: 'Recruiters', value: analytics.recruiters, color: '#06b6d4' },
    { name: 'Admins', value: analytics.admins, color: '#f59e0b' },
  ] : []
  const visibleUsers = userFilter === 'recruiters' ? users.filter((account) => account.role === 'Recruiter') : users

  const KPI = [
    { label: 'Total Users',     value: totalUsers,      change: analytics?.new_users_this_week ?? 0, color: '#6366f1', icon: Users,     grad: 'linear-gradient(135deg,#6366f1,#a855f7)' },
    { label: 'Recruiters',      value: totalRecruiters, change: 'Live', color: '#06b6d4', icon: UserCheck, grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)' },
    { label: 'Candidates',      value: totalCandidates, change: 'Live', color: '#22c55e', icon: User,      grad: 'linear-gradient(135deg,#22c55e,#06b6d4)'  },
    { label: 'Active Sessions', value: activeSessions,  change: '30 min',color: '#a855f7', icon: Activity, grad: 'linear-gradient(135deg,#a855f7,#6366f1)'  },
  ]

  return (
    <div className="dashboard-layout" id="admin-dashboard-top">
      <Sidebar role="admin" onNavigate={handleAdminNavigation} />
      <div className="dashboard-main">
        <Topbar
          title="Admin Dashboard"
          subtitle="Platform overview, user management, and system settings"
          userName={displayName}
          userInitials={initials}
          roleBadge="Admin"
        />
        <div className="dashboard-content">

          {/* ── Toast ── */}
          {toast && (
            <div style={{
              position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
              display: 'flex', alignItems: 'center', gap: 10,
              background: toast.type === 'danger' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.12)',
              border: `1px solid ${toast.type === 'danger' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.25)'}`,
              borderRadius: 12, padding: '12px 18px', backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              animation: 'slide-up 0.3s ease',
              color: toast.type === 'danger' ? '#f87171' : '#4ade80',
              fontWeight: 600, fontSize: '0.85rem',
            }}>
              {toast.type === 'danger' ? <Trash2 size={15} /> : <CheckCircle size={15} />}
              {toast.msg}
            </div>
          )}

          {/* ── KPI Cards ── */}
          <div className="grid-cols-4" style={{ marginBottom: 32 }}>
            {KPI.map((k, i) => {
              const Icon = k.icon
              return (
                <div key={i} className="stat-card">
                  <div className="stat-card-icon" style={{ background: `${k.color}18` }}>
                    <Icon size={20} color={k.color} />
                  </div>
                  <div className="stat-card-value" style={{ background: k.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{k.value}</div>
                  <div className="stat-card-label">{k.label}</div>
                  <div className="stat-card-change" style={{ color: k.label === 'Active Sessions' ? '#06b6d4' : '#22c55e' }}>
                    <TrendingUp size={11} /> {k.change} this week
                  </div>
                </div>
              )
            })}
          </div>

          <div className="card" style={{ marginBottom: 32 }}>
            <div style={{ marginBottom: 18 }}>
              <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff' }}>Hiring Overview</h3>
              <p style={{ fontSize: '0.78rem', color: '#606080', marginTop: 3 }}>Live job and application totals across the platform</p>
            </div>
            <div className="grid-cols-4" style={{ gap: 16 }}>
              {[
                { label: 'Job Posts', value: analytics?.total_jobs ?? 0, color: '#818cf8' },
                { label: 'Open Jobs', value: analytics?.open_jobs ?? 0, color: '#4ade80' },
                { label: 'Applications', value: analytics?.total_applications ?? 0, color: '#67e8f9' },
                { label: 'Interviews Scheduled', value: analytics?.scheduled_interviews ?? 0, color: '#fbbf24' },
              ].map((item) => <div key={item.label} style={{ padding: 16, borderRadius: 12, background: `${item.color}0d`, border: `1px solid ${item.color}28` }}><div style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800, color: item.color }}>{item.value}</div><div style={{ fontSize: '.75rem', color: '#a0a0c0', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>{item.label}</div></div>)}
            </div>
          </div>

          {/* ── Analytics ── */}
          <div className="grid-cols-2" id="admin-analytics" style={{ marginBottom: 32 }}>
            <div className="card" style={{ gridColumn: 'span 1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff' }}>Platform Growth</h3>
                  <p style={{ fontSize: '0.78rem', color: '#606080', marginTop: 2 }}>New registrations and sign-ins each month</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[{ c: '#6366f1', l: 'New users' }, { c: '#06b6d4', l: 'Logins' }].map(({ c, l }) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                      <span style={{ fontSize: '0.72rem', color: '#606080' }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="intGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="users"  name="New users" stroke="#6366f1" strokeWidth={2} fill="url(#usersGrad)" />
                  <Area type="monotone" dataKey="logins" name="Logins"    stroke="#06b6d4" strokeWidth={2} fill="url(#intGrad)"   />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* User Distribution */}
              <div className="card" style={{ flex: 1 }}>
                <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff', marginBottom: 16 }}>User Distribution</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <PieChart width={130} height={130}>
                    <Pie data={distributionData} cx={60} cy={60} innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                      {distributionData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {distributionData.map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color }} />
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#f0f0ff', fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#606080' }}>{p.value.toLocaleString()} users</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* System Health */}
              <div className="card" style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff' }}>System Health</h3>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw size={11} style={{ animation: refreshing ? 'spin-slow 0.8s linear infinite' : 'none' }} />
                    {refreshing ? 'Checking…' : 'Refresh'}
                  </button>
                </div>
                {health.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < health.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}80`, animation: s.status === 'Online' ? 'pulse-glow 2s infinite' : 'none' }} />
                      <span style={{ fontSize: '0.82rem', color: '#a0a0c0' }}>{s.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#606080', fontFamily: 'monospace' }}>{s.ms}</span>
                      <span style={{ fontSize: '0.72rem', color: '#606080' }}>{s.uptime}</span>
                      <span className={`badge ${s.status === 'Online' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.62rem' }}>{s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff' }}>Recent Login Activity</h3>
                <p style={{ fontSize: '0.78rem', color: '#606080', marginTop: 2 }}>The latest successful sign-ins from PostgreSQL</p>
              </div>
              <span className="badge badge-primary">{analytics?.logins_this_week ?? 0} this week</span>
            </div>
            {loginActivity.length === 0 ? <p style={{ color: '#a0a0c0', fontSize: '0.85rem' }}>No login activity recorded yet.</p> : loginActivity.map((event) => (
              <div key={event.id} className="activity-item">
                <div className="activity-dot" style={{ background: event.provider === 'GOOGLE' ? '#4285F4' : '#f59e0b' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#f0f0ff', fontSize: '0.875rem', fontWeight: 600 }}>{event.name}</div>
                  <div style={{ color: '#606080', fontSize: '0.78rem' }}>{event.email} · {event.provider === 'GOOGLE' ? 'Google' : 'Email and password'}</div>
                </div>
                <div style={{ color: '#a0a0c0', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{new Date(event.occurred_at).toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* ── User Management Table ── */}
          <div className="card" id="admin-users" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff' }}>{userFilter === 'recruiters' ? 'Recruiters' : 'User Management'}</h3>
                <p style={{ fontSize: '0.78rem', color: '#606080', marginTop: 2 }}>{visibleUsers.length} {userFilter === 'recruiters' ? 'recruiter' : 'registered platform user'}{visibleUsers.length === 1 ? '' : 's'} shown</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={handleExport}>
                  <Download size={13} /> Export CSV
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                  <Plus size={13} /> Add User
                </button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Login Via</th>
                    <th>Last Login</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((u) => {
                    const i = users.findIndex((account) => account.id === u.id)
                    return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar avatar-sm" style={{ background: `linear-gradient(135deg, ${u.color}, ${u.color}88)` }}>{u.initials}</div>
                          <span style={{ fontWeight: 500, color: '#f0f0ff', fontSize: '0.875rem' }}>{u.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'Recruiter' ? 'badge-primary' : u.role === 'Admin' ? 'badge-warning' : 'badge-accent'}`}>{u.role}</span>
                      </td>
                      <td style={{ color: '#a0a0c0', fontSize: '0.82rem' }}>{u.email}</td>
                      <td><LoginMethodBadge method={u.loginMethod} /></td>
                      <td style={{ color: '#606080', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{u.lastLogin}</td>
                      <td>
                        <span className={`badge ${u.status === 'Active' ? 'badge-success' : u.status === 'Inactive' ? 'badge-warning' : 'badge-danger'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {/* View */}
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: '5px 8px' }}
                            onClick={() => setViewUser(u)}
                            title="View profile"
                          >
                            <Eye size={12} />
                          </button>
                          {/* Change Role */}
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: '5px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 3 }}
                            onClick={() => changeRole(i)}
                            title={`Change role → ${ROLE_CYCLE[u.role]}`}
                          >
                            <UserCog size={11} /> Role
                          </button>
                          {/* Disable / Enable */}
                          <button
                            className={`btn btn-sm ${u.status === 'Disabled' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ padding: '5px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 3 }}
                            onClick={() => toggleDisable(i)}
                            title={u.status === 'Disabled' ? 'Re-enable user' : 'Disable user'}
                          >
                            <UserX size={11} /> {u.status === 'Disabled' ? 'Enable' : 'Disable'}
                          </button>
                          {/* Delete */}
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: '5px 8px' }}
                            onClick={() => deleteUser(i)}
                            title="Remove user"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Settings Panel ── */}
          <div className="card" id="admin-settings">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Settings size={18} color="white" />
              </div>
              <div>
                <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff' }}>Platform Settings</h3>
                <p style={{ fontSize: '0.75rem', color: '#606080', marginTop: 2 }}>Configure platform behavior and security</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {SETTINGS_ITEMS.map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: settings[i] ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${settings[i] ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, transition: 'all 0.2s' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: settings[i] ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                      <Icon size={16} color={settings[i] ? '#818cf8' : '#6366f1'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f0f0ff' }}>{item.label}</div>
                      <div style={{ fontSize: '0.73rem', color: '#606080', marginTop: 2 }}>{item.desc}</div>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={settings[i]} onChange={() => toggleSetting(i)} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ── Modals / Overlays ── */}
      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} onAdd={addUser} />}
      {viewUser     && <UserDrawer  user={viewUser} onClose={() => setViewUser(null)} />}
    </div>
  )
}
