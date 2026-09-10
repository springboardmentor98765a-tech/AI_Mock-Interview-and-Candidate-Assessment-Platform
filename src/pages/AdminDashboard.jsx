import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import {
  Users, UserCheck, Briefcase, FileText, Activity, Shield,
  Server, Database, Mail, Wrench, Brain, Cpu, BarChart3,
  TrendingUp, TrendingDown, Eye, Settings, Webhook, MapPin,
  ChevronUp, ChevronDown, Search, X, UserPlus, CheckCircle,
  Ban, Lock, Key, AlertTriangle, Globe, Clock, RefreshCw,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'
import {
  fetchAdminStats,
  fetchUsers,
  updateUserRole,
  toggleUserStatus,
  fetchInterviewActivity,
  fetchAiMonitoring,
  fetchSystemHealth,
  fetchUsageAnalytics,
} from '../services/adminApi'

/* ─── Small shared components (unchanged from original) ──────────────────── */

function StatusBadge({ status }) {
  const map = { Active: 'green', Blocked: 'red', Pending: 'orange', Complete: 'green', Review: 'orange' }
  return <span className={`badge ${map[status] || 'gray'}`}>{status}</span>
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
  )
}

function Toast({ msg, onClose }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          style={{
            position: 'fixed', top: 20, right: 20, zIndex: 9999,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '12px 18px',
            boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center',
            gap: 10, minWidth: 280, maxWidth: 400,
          }}
        >
          <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: 'var(--text-primary)', flex: 1 }}>{msg}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={15} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── UserModal — Role change calls real backend PUT ─────────────────────── */
function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState(
    user
      ? { ...user, role: user.role }
      : { name: '', email: '', role: 'USER', status: 'Active', joined: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) }
  )
  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 460, boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{user ? 'Manage User' : 'Invite User'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!user && <div className="form-field"><label>Full Name</label><input type="text" value={form.name} onChange={set('name')} /></div>}
          {!user && <div className="form-field"><label>Email</label><input type="email" value={form.email} onChange={set('email')} /></div>}
          <div className="form-field"><label>Role</label>
            <select value={form.role} onChange={set('role')}>
              <option value="ADMIN">Admin</option>
              <option value="RECRUITER">Recruiter</option>
              <option value="USER">Candidate</option>
            </select>
          </div>
          {user && (
            <div style={{ padding: '12px 14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)' }}>
              ℹ️ Role change is saved immediately to the database. Use the toggle button in the table to change Active/Blocked status.
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>{user ? 'Save Role' : 'Invite User'}</button>
        </div>
      </motion.div>
    </div>
  )
}

function ViewModal({ user, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>User Details</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
            {user.name.charAt(0)}
          </div>
          <div><div style={{ fontWeight: 700, fontSize: 16 }}>{user.name}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</div></div>
        </div>
        {[['Role', user.role], ['Status', user.status], ['Provider', user.provider || 'LOCAL'], ['Joined', user.joined]].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{k}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
        <button className="btn btn-outline" style={{ marginTop: 20, width: '100%' }} onClick={onClose}>Close</button>
      </motion.div>
    </div>
  )
}

/* ─── UserTable — server-driven pagination & sort ────────────────────────── */
function UserTable({ data, total, page, setPage, pageSize, loading, onView, onManage, onToggle,
  search, setSearch, sortField, setSortField, sortDir, setSortDir, onAdd, showAdd }) {

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp size={12} style={{ opacity: 0.3 }} />
    return sortDir === 'asc' ? <ChevronUp size={12} style={{ color: 'var(--primary)' }} /> : <ChevronDown size={12} style={{ color: 'var(--primary)' }} />
  }
  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <>
      <div className="table-search-wrapper">
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input className="table-search-bar" style={{ paddingLeft: 32 }} placeholder="Search by name or email..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge gray">{total} users</span>
          {showAdd && <button className="btn btn-primary btn-sm" onClick={onAdd}><UserPlus size={14} /> Add User</button>}
        </div>
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead><tr>
            <th className="sortable-th" onClick={() => handleSort('name')}><div className="th-inner">Name <SortIcon field="name" /></div></th>
            <th>Email</th>
            <th className="sortable-th" onClick={() => handleSort('role')}><div className="th-inner">Role <SortIcon field="role" /></div></th>
            <th className="sortable-th" onClick={() => handleSort('status')}><div className="th-inner">Status <SortIcon field="status" /></div></th>
            <th>Joined</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Loading users…</td></tr>
              : data.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No users found</td></tr>
                : data.map((u, i) => (
                  <tr key={u.id || i}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="user-avatar">{u.name.charAt(0)}</div><span style={{ fontWeight: 500 }}>{u.name}</span></div></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'ADMIN' ? 'purple' : u.role === 'RECRUITER' ? 'blue' : 'gray'}`}>
                        {u.role === 'USER' ? 'Candidate' : u.role}
                      </span>
                    </td>
                    <td><StatusBadge status={u.status} /></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.joined}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => onView(u)}><Eye size={13} /> View</button>
                        <button className="btn btn-primary btn-sm" onClick={() => onManage(u)}><Settings size={13} /> Role</button>
                        <button className="btn btn-sm" onClick={() => onToggle(u)}
                          style={{ color: u.status === 'Active' ? 'var(--danger)' : 'var(--success)', border: `1px solid ${u.status === 'Active' ? 'var(--danger)' : 'var(--success)'}`, background: 'transparent', borderRadius: 'var(--radius-sm)', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                          {u.status === 'Active' ? <Ban size={13} /> : <CheckCircle size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span className="pagination-info">
          {total === 0 ? 'No results' : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
        </span>
        <div className="pagination-btns">
          <button className={`page-btn ${page === 1 ? 'disabled' : ''}`} onClick={() => setPage(p => Math.max(1, p - 1))}>← Prev</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
            <button key={i} className={`page-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
          ))}
          {totalPages > 7 && <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…{totalPages}</span>}
          <button className={`page-btn ${page === totalPages ? 'disabled' : ''}`} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next →</button>
        </div>
      </div>
    </>
  )
}

/* ─── Loading skeleton helper ────────────────────────────────────────────── */
function Skeleton({ height = 20, width = '100%', style = {} }) {
  return (
    <div style={{
      height, width, borderRadius: 6,
      background: 'linear-gradient(90deg, var(--bg-primary) 25%, var(--border) 50%, var(--bg-primary) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...style,
    }} />
  )
}

/* ─── Error banner helper ────────────────────────────────────────────────── */
function ErrorBanner({ msg, onRetry }) {
  return (
    <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <AlertTriangle size={16} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 14 }}>{msg}</span>
      {onRetry && <button onClick={onRetry} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#ef4444', background: 'none', border: '1px solid #ef4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}><RefreshCw size={12} /> Retry</button>}
    </div>
  )
}

/* ─── Main AdminDashboard component ──────────────────────────────────────── */
function AdminDashboard() {
  const navigate = useNavigate()

  // Section navigation
  const [activeSection, setActiveSection] = useState('dashboard')

  // UI state
  const [toast, setToast]               = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [manageUser, setManageUser]     = useState(null)
  const [viewUser, setViewUser]         = useState(null)

  // User table state
  const [users, setUsers]       = useState([])
  const [userTotal, setUserTotal]   = useState(0)
  const [userPage, setUserPage] = useState(1)
  const [userSearch, setUserSearch] = useState('')
  const [sortField, setSortField]   = useState('name')
  const [sortDir, setSortDir]       = useState('asc')
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError]     = useState(null)
  const PAGE_SIZE = 10

  // Dashboard data state
  const [stats, setStats]               = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError]     = useState(null)

  const [activity, setActivity]             = useState(null)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError]     = useState(null)

  const [aiData, setAiData]             = useState(null)
  const [aiLoading, setAiLoading]       = useState(false)
  const [aiError, setAiError]           = useState(null)

  const [healthData, setHealthData]         = useState(null)
  const [healthLoading, setHealthLoading]   = useState(false)
  const [healthError, setHealthError]       = useState(null)

  const [usageData, setUsageData]           = useState(null)
  const [usageLoading, setUsageLoading]     = useState(false)
  const [usageError, setUsageError]         = useState(null)

  /* ── Fetch helpers ── */

  const loadStats = useCallback(async () => {
    setStatsLoading(true); setStatsError(null)
    try {
      const d = await fetchAdminStats()
      setStats(d)
    } catch (e) {
      setStatsError(e.message)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    setUsersLoading(true); setUsersError(null)
    try {
      const d = await fetchUsers({ page: userPage, pageSize: PAGE_SIZE, search: userSearch })
      setUsers(d.users || [])
      setUserTotal(d.total || 0)
    } catch (e) {
      setUsersError(e.message)
    } finally {
      setUsersLoading(false)
    }
  }, [userPage, userSearch])

  const loadActivity = useCallback(async () => {
    setActivityLoading(true); setActivityError(null)
    try {
      const d = await fetchInterviewActivity()
      setActivity(d)
    } catch (e) {
      setActivityError(e.message)
    } finally {
      setActivityLoading(false)
    }
  }, [])

  const loadAi = useCallback(async () => {
    setAiLoading(true); setAiError(null)
    try {
      const d = await fetchAiMonitoring()
      setAiData(d)
    } catch (e) {
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }, [])

  const loadHealth = useCallback(async () => {
    setHealthLoading(true); setHealthError(null)
    try {
      const d = await fetchSystemHealth()
      setHealthData(d)
    } catch (e) {
      setHealthError(e.message)
    } finally {
      setHealthLoading(false)
    }
  }, [])

  const loadUsage = useCallback(async () => {
    setUsageLoading(true); setUsageError(null)
    try {
      const d = await fetchUsageAnalytics()
      setUsageData(d)
    } catch (e) {
      setUsageError(e.message)
    } finally {
      setUsageLoading(false)
    }
  }, [])

  /* ── Load data on section change ── */
  useEffect(() => {
    loadStats()
    if (['dashboard', 'users', 'recruiters', 'candidates'].includes(activeSection)) loadUsers()
    if (['dashboard', 'analytics'].includes(activeSection)) { loadActivity(); loadUsage() }
    if (['dashboard', 'ai-config'].includes(activeSection)) loadAi()
    if (['dashboard', 'analytics', 'security'].includes(activeSection)) loadHealth()
  }, [activeSection]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload users when page/search changes
  useEffect(() => { loadUsers() }, [loadUsers])

  /* ── Helpers ── */
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const handleSectionChange = (section) => {
    setActiveSection(section)
    setUserSearch(''); setUserPage(1)
  }

  /* ── User management actions (call real API) ── */
  const handleManageSave = async (form) => {
    if (!manageUser) return
    try {
      await updateUserRole(manageUser.id, form.role)
      setManageUser(null)
      showToast(`Role updated to ${form.role}`)
      loadUsers()
      loadStats()
    } catch (e) {
      showToast(`Error: ${e.message}`)
    }
  }

  const handleToggle = async (u) => {
    const newActive = u.status !== 'Active'
    try {
      await toggleUserStatus(u.id, newActive)
      showToast(`${u.name} is now ${newActive ? 'Active' : 'Blocked'}`)
      loadUsers()
    } catch (e) {
      showToast(`Error: ${e.message}`)
    }
  }

  /* ── Stat cards derived from real data ── */
  const statCards = stats
    ? [
        { label: 'Total Users',       value: stats.totalUsers?.toLocaleString() || '—', trend: '', up: true,  icon: <Users size={22} />,    color: 'purple' },
        { label: 'Active Recruiters', value: stats.totalRecruiters?.toLocaleString() || '—', trend: '', up: true,  icon: <Briefcase size={22} />, color: 'blue'   },
        { label: 'Total Interviews',  value: stats.totalInterviews?.toLocaleString() || '—', trend: '', up: true,  icon: <Activity size={22} />,  color: 'green'  },
        { label: 'Reports Generated', value: stats.reportsGenerated?.toLocaleString() || '—', trend: '', up: true,  icon: <FileText size={22} />,  color: 'orange' },
      ]
    : null

  /* ── Sidebar config ── */
  const sidebarLinks = [
    {
      title: 'Overview',
      items: [
        { icon: <BarChart3 size={18} />, label: 'Dashboard',  section: 'dashboard'  },
        { icon: <Users size={18} />,     label: 'Users',      section: 'users'      },
        { icon: <Activity size={18} />,  label: 'Analytics',  section: 'analytics'  },
      ],
    },
    {
      title: 'Management',
      items: [
        { icon: <Briefcase size={18} />, label: 'Recruiters', section: 'recruiters' },
        { icon: <UserCheck size={18} />, label: 'Candidates', section: 'candidates' },
        { icon: <FileText size={18} />,  label: 'Reports',    section: 'reports'    },
      ],
    },
    {
      title: 'System',
      items: [
        { icon: <Settings size={18} />, label: 'Settings',  onClick: () => navigate('/settings') },
        { icon: <Shield size={18} />,   label: 'Security',  section: 'security'   },
        { icon: <Brain size={18} />,    label: 'AI Config', section: 'ai-config'  },
      ],
    },
  ]

  /* ── Stat card row ── */
  const renderStats = () => (
    <div className="stats-grid" style={{ marginBottom: 20 }}>
      {statsLoading || !statCards
        ? [0, 1, 2, 3].map(i => (
            <div key={i} className="stat-card" style={{ gap: 12 }}>
              <Skeleton height={44} width={44} style={{ borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}><Skeleton height={22} width="60%" /><Skeleton height={13} width="80%" style={{ marginTop: 6 }} /></div>
            </div>
          ))
        : statCards.map((s, i) => (
            <motion.div key={i} className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
              <div className="stat-details">
                <h3>{s.value}</h3><p>{s.label}</p>
              </div>
            </motion.div>
          ))}
    </div>
  )

  /* ── Section renderers ── */
  const renderSection = () => {
    switch (activeSection) {

      case 'dashboard':
        return (
          <>
            {statsError && <ErrorBanner msg={statsError} onRetry={loadStats} />}
            {renderStats()}

            {/* Platform Analytics chart */}
            <motion.div className="card full-width" style={{ marginBottom: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="card-header">
                <h2>Platform Analytics</h2>
                <span className="badge blue">Last 6 Months</span>
              </div>
              {usageLoading
                ? <Skeleton height={280} />
                : usageError
                  ? <ErrorBanner msg={usageError} onRetry={loadUsage} />
                  : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={usageData?.monthlyActivity || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                        <Bar dataKey="users"      fill="#6366f1" radius={[4,4,0,0]} name="New Users" />
                        <Bar dataKey="interviews" fill="#0ea5e9" radius={[4,4,0,0]} name="Interviews" />
                        <Bar dataKey="reports"    fill="#10b981" radius={[4,4,0,0]} name="Reports" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
            </motion.div>

            <div className="dashboard-grid">
              {/* System Health */}
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header">
                  <h2>System Health</h2>
                  <span className={`badge ${healthData?.database?.ok ? 'green' : 'red'}`}>
                    {healthData ? (healthData.database?.ok ? 'All Systems Go' : 'DB Issue') : '…'}
                  </span>
                </div>
                {healthLoading
                  ? [0,1,2,3,4].map(i => <Skeleton key={i} height={40} style={{ marginBottom: 8 }} />)
                  : healthError
                    ? <ErrorBanner msg={healthError} onRetry={loadHealth} />
                    : healthData && (
                      <div className="system-health-grid">
                        {[
                          { icon: <Server size={18} />,   label: 'Server',   value: healthData.server?.status,              status: healthData.server?.uptime,    ok: true },
                          { icon: <Cpu size={18} />,      label: 'CPU',      value: `${healthData.cpu?.cpuPct ?? '—'}%`,    status: `${healthData.cpu?.cores} cores`, ok: (healthData.cpu?.cpuPct || 0) < 85 },
                          { icon: <Database size={18} />, label: 'Database', value: healthData.database?.ok ? 'Connected' : 'Error', status: healthData.database?.latencyMs != null ? `${healthData.database.latencyMs}ms` : '—', ok: healthData.database?.ok },
                          { icon: <Activity size={18} />, label: 'Memory',   value: `${healthData.memory?.rss ?? '—'} MB`, status: `${healthData.memory?.ramPct ?? '—'}% of RAM`, ok: (healthData.memory?.ramPct || 0) < 90 },
                          { icon: <Webhook size={18} />,  label: 'Uptime',   value: healthData.server?.uptime,              status: 'Server running',     ok: true },
                        ].map((h, i) => (
                          <div key={i} className="health-item">
                            <div className="health-icon" style={{ background: h.ok ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: h.ok ? '#10b981' : '#f59e0b' }}>{h.icon}</div>
                            <div className="health-info"><h4>{h.label}</h4><p style={{ color: h.ok ? '#10b981' : '#f59e0b' }}>{h.value} · {h.status}</p></div>
                          </div>
                        ))}
                      </div>
                    )}
              </motion.div>

              {/* AI Config summary */}
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="card-header">
                  <h2>AI Configuration</h2>
                  <span className={`badge ${aiData?.hasKeys ? 'green' : 'orange'}`}>
                    {aiData ? (aiData.hasKeys ? `${aiData.model} Active` : 'No Keys') : '…'}
                  </span>
                </div>
                {aiLoading
                  ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{[0,1,2,3].map(i => <Skeleton key={i} height={72} />)}</div>
                  : aiError
                    ? <ErrorBanner msg={aiError} onRetry={loadAi} />
                    : aiData && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                          { icon: <Brain size={18} color="#10b981" />,    label: 'AI Model',     value: aiData.model,                            sub: aiData.modelStatus,   c: '#10b981' },
                          { icon: <Activity size={18} color="#f97316" />, label: 'Total Calls',  value: aiData.totalRequests?.toLocaleString(),   sub: 'All time',           c: '#f97316' },
                          { icon: <FileText size={18} color="#6366f1" />, label: 'Evaluations',  value: aiData.totalEvaluations?.toLocaleString(),sub: 'Interviews scored',  c: '#6366f1' },
                          { icon: <Cpu size={18} color="#10b981" />,      label: "Today's Calls",value: aiData.todayRequests?.toLocaleString(),   sub: 'API requests',       c: '#10b981' },
                        ].map((item, i) => (
                          <div key={i} style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>{item.icon}<span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</span></div>
                            <div style={{ fontSize: 20, fontWeight: 700 }}>{item.value} <span style={{ fontSize: 12, color: item.c, fontWeight: 500 }}>{item.sub}</span></div>
                          </div>
                        ))}
                      </div>
                    )}
              </motion.div>

              {/* Recent interview activity */}
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="card-header"><h2>Recent Activity</h2></div>
                {activityLoading
                  ? [0,1,2,3,4].map(i => <Skeleton key={i} height={32} style={{ marginBottom: 8 }} />)
                  : activityError
                    ? <ErrorBanner msg={activityError} onRetry={loadActivity} />
                    : (
                      <div className="activity-list">
                        {(activity?.recentActivity || []).slice(0, 6).map((a, i) => (
                          <div key={i} className="activity-item">
                            <div className={`activity-dot ${a.score != null && a.score >= 75 ? 'green' : a.score != null && a.score >= 50 ? 'blue' : 'orange'}`} />
                            <div className="activity-content">
                              <div className="activity-text">
                                Interview completed: <strong>{a.candidateName}</strong> — {a.role}
                                {a.score != null && <span style={{ marginLeft: 8, fontWeight: 600, color: a.score >= 75 ? '#10b981' : '#f59e0b' }}>{a.score}/100</span>}
                              </div>
                              <div className="activity-time">{a.timeAgo}</div>
                            </div>
                          </div>
                        ))}
                        {(!activity?.recentActivity || activity.recentActivity.length === 0) && (
                          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No recent interviews</div>
                        )}
                      </div>
                    )}
              </motion.div>

              {/* Platform Settings quick links */}
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <div className="card-header"><h2>Platform Settings</h2></div>
                <div className="settings-grid">
                  {[
                    { icon: <Shield size={20} color="#6366f1" />,  label: 'User Access Control', action: () => showToast('Managed via User Management section') },
                    { icon: <Mail size={20} color="#0ea5e9" />,    label: 'Email Notifications',  action: () => navigate('/settings') },
                    { icon: <Server size={20} color="#10b981" />,  label: 'Server Config',        action: () => showToast(`Node.js ${healthData?.server?.nodeVersion || ''} · Express`) },
                    { icon: <Wrench size={20} color="#f59e0b" />,  label: 'Maintenance Mode',     action: () => showToast('Maintenance mode is currently OFF') },
                    { icon: <Webhook size={20} color="#a855f7" />, label: 'Webhook Settings',     action: () => showToast('Webhooks: not yet configured') },
                    { icon: <MapPin size={20} color="#ef4444" />,  label: 'Regional Settings',    action: () => showToast('Region: IN-South Asia · IST (UTC+5:30)') },
                  ].map((s, i) => (
                    <button key={i} className="settings-card" onClick={s.action} style={{ cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', padding: 0 }}>
                      {s.icon}<span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* User Management preview */}
            <motion.div className="card" style={{ marginTop: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="card-header"><h2>User Management</h2></div>
              {usersError && <ErrorBanner msg={usersError} onRetry={loadUsers} />}
              <UserTable
                data={users} total={userTotal} page={userPage} setPage={setUserPage}
                pageSize={PAGE_SIZE} loading={usersLoading}
                onView={setViewUser} onManage={setManageUser} onToggle={handleToggle}
                search={userSearch} setSearch={setUserSearch}
                sortField={sortField} setSortField={setSortField}
                sortDir={sortDir} setSortDir={setSortDir}
                onAdd={() => setShowAddModal(true)} showAdd
              />
            </motion.div>
          </>
        )

      case 'users':
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <div>
                <h2>User Management</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>All users across the platform (real-time database)</p>
              </div>
            </div>
            {usersError && <ErrorBanner msg={usersError} onRetry={loadUsers} />}
            <UserTable
              data={users} total={userTotal} page={userPage} setPage={setUserPage}
              pageSize={PAGE_SIZE} loading={usersLoading}
              onView={setViewUser} onManage={setManageUser} onToggle={handleToggle}
              search={userSearch} setSearch={setUserSearch}
              sortField={sortField} setSortField={setSortField}
              sortDir={sortDir} setSortDir={setSortDir}
              onAdd={() => setShowAddModal(true)} showAdd
            />
          </motion.div>
        )

      case 'analytics':
        return (
          <>
            {statsError && <ErrorBanner msg={statsError} onRetry={loadStats} />}
            {renderStats()}
            <motion.div className="card full-width" style={{ marginBottom: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="card-header"><h2>Platform Growth</h2><span className="badge blue">Last 6 Months</span></div>
              {usageLoading
                ? <Skeleton height={300} />
                : usageError
                  ? <ErrorBanner msg={usageError} onRetry={loadUsage} />
                  : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={usageData?.monthlyActivity || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                        <Bar dataKey="users"      fill="#6366f1" radius={[4,4,0,0]} name="New Users" />
                        <Bar dataKey="interviews" fill="#0ea5e9" radius={[4,4,0,0]} name="Interviews" />
                        <Bar dataKey="reports"    fill="#10b981" radius={[4,4,0,0]} name="Reports" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
            </motion.div>
            <div className="dashboard-grid">
              {/* Interview Status Breakdown */}
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header"><h2>Interview Status</h2></div>
                {activityLoading
                  ? <Skeleton height={200} />
                  : activityError
                    ? <ErrorBanner msg={activityError} onRetry={loadActivity} />
                    : activity && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {[
                          { label: 'Completed',   value: activity.statusBreakdown?.completed  || 0, color: '#10b981', pct: activity.statusBreakdown?.total ? Math.round((activity.statusBreakdown.completed  / activity.statusBreakdown.total) * 100) : 0 },
                          { label: 'In Progress', value: activity.statusBreakdown?.inProgress || 0, color: '#0ea5e9', pct: activity.statusBreakdown?.total ? Math.round((activity.statusBreakdown.inProgress / activity.statusBreakdown.total) * 100) : 0 },
                          { label: 'Pending',     value: activity.statusBreakdown?.pending    || 0, color: '#f59e0b', pct: activity.statusBreakdown?.total ? Math.round((activity.statusBreakdown.pending    / activity.statusBreakdown.total) * 100) : 0 },
                        ].map((item, i) => (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.value.toLocaleString()} ({item.pct}%)</span>
                            </div>
                            <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${item.pct}%`, background: item.color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        ))}
                        <div style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, marginTop: 8 }}>
                          {activity.statusBreakdown?.total?.toLocaleString() || 0}
                          <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>total interviews</span>
                        </div>
                      </div>
                    )}
              </motion.div>

              {/* User Distribution Pie */}
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="card-header"><h2>User Distribution</h2></div>
                {usageLoading
                  ? <Skeleton height={220} />
                  : usageError
                    ? <ErrorBanner msg={usageError} onRetry={loadUsage} />
                    : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={usageData?.roleDistribution || []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                            {(usageData?.roleDistribution || []).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v, n) => [v.toLocaleString(), n]} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
              </motion.div>

              {/* System Health in Analytics */}
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="card-header">
                  <h2>System Health</h2>
                  <span className={`badge ${healthData?.database?.ok !== false ? 'green' : 'red'}`}>
                    {healthData?.database?.ok !== false ? 'All Systems Go' : 'DB Issue'}
                  </span>
                </div>
                {healthLoading
                  ? [0,1,2,3,4].map(i => <Skeleton key={i} height={40} style={{ marginBottom: 8 }} />)
                  : healthError
                    ? <ErrorBanner msg={healthError} onRetry={loadHealth} />
                    : healthData && (
                      <div className="system-health-grid">
                        {[
                          { icon: <Server size={18} />,   label: 'Server',   value: healthData.server?.status,              status: healthData.server?.uptime,    ok: true },
                          { icon: <Cpu size={18} />,      label: 'CPU',      value: `${healthData.cpu?.cpuPct ?? '—'}%`,    status: `${healthData.cpu?.cores} cores`, ok: (healthData.cpu?.cpuPct || 0) < 85 },
                          { icon: <Database size={18} />, label: 'Database', value: healthData.database?.ok ? 'Connected' : 'Error', status: `${healthData.database?.latencyMs ?? '—'}ms`, ok: healthData.database?.ok },
                          { icon: <Activity size={18} />, label: 'Memory',   value: `${healthData.memory?.rss ?? '—'} MB`, status: `${healthData.memory?.ramPct ?? '—'}%`, ok: (healthData.memory?.ramPct || 0) < 90 },
                          { icon: <Webhook size={18} />,  label: 'Uptime',   value: healthData.server?.uptime,              status: 'Node.js ' + (healthData.server?.nodeVersion || ''), ok: true },
                        ].map((h, i) => (
                          <div key={i} className="health-item">
                            <div className="health-icon" style={{ background: h.ok ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: h.ok ? '#10b981' : '#f59e0b' }}>{h.icon}</div>
                            <div className="health-info"><h4>{h.label}</h4><p style={{ color: h.ok ? '#10b981' : '#f59e0b' }}>{h.value} · {h.status}</p></div>
                          </div>
                        ))}
                      </div>
                    )}
              </motion.div>
            </div>
          </>
        )

      case 'recruiters': {
        const recruiterData = users.filter(u => u.role === 'RECRUITER')
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <div><h2>Recruiter Management</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{stats?.totalRecruiters ?? '…'} recruiters on the platform</p></div>
              <span className="badge blue">{recruiterData.filter(r => r.status === 'Active').length} Active (this page)</span>
            </div>
            {usersError && <ErrorBanner msg={usersError} onRetry={loadUsers} />}
            <UserTable
              data={recruiterData} total={userTotal} page={userPage} setPage={setUserPage}
              pageSize={PAGE_SIZE} loading={usersLoading}
              onView={setViewUser} onManage={setManageUser} onToggle={handleToggle}
              search={userSearch} setSearch={setUserSearch}
              sortField={sortField} setSortField={setSortField}
              sortDir={sortDir} setSortDir={setSortDir}
              onAdd={() => setShowAddModal(true)} showAdd={false}
            />
          </motion.div>
        )
      }

      case 'candidates': {
        const candidateData = users.filter(u => u.role === 'USER')
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <div><h2>Candidate Management</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{stats?.totalCandidates ?? '…'} candidates on the platform</p></div>
              <span className="badge purple">{candidateData.filter(c => c.status === 'Active').length} Active (this page)</span>
            </div>
            {usersError && <ErrorBanner msg={usersError} onRetry={loadUsers} />}
            <UserTable
              data={candidateData} total={userTotal} page={userPage} setPage={setUserPage}
              pageSize={PAGE_SIZE} loading={usersLoading}
              onView={setViewUser} onManage={setManageUser} onToggle={handleToggle}
              search={userSearch} setSearch={setUserSearch}
              sortField={sortField} setSortField={setSortField}
              sortDir={sortDir} setSortDir={setSortDir}
              onAdd={() => setShowAddModal(true)} showAdd={false}
            />
          </motion.div>
        )
      }

      case 'reports':
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <div><h2>Assessment Reports</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>All generated candidate assessment reports (real data)</p></div>
              <span className="badge gray">{stats?.reportsGenerated?.toLocaleString() ?? '…'} reports</span>
            </div>
            {activityLoading
              ? <Skeleton height={200} />
              : activityError
                ? <ErrorBanner msg={activityError} onRetry={loadActivity} />
                : (
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead><tr>
                        <th>Candidate</th><th>Role</th><th>Score</th><th>Recommendation</th><th>Completed</th>
                      </tr></thead>
                      <tbody>
                        {(activity?.recentActivity || []).length === 0
                          ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No completed reports yet</td></tr>
                          : (activity?.recentActivity || []).map((r, i) => (
                            <tr key={i}>
                              <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="user-avatar">{r.candidateName?.charAt(0) || '?'}</div><span style={{ fontWeight: 500 }}>{r.candidateName}</span></div></td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{r.role}</td>
                              <td><span style={{ fontWeight: 700, color: r.score >= 85 ? '#10b981' : r.score >= 70 ? '#f59e0b' : '#ef4444' }}>{r.score != null ? r.score : '—'}</span></td>
                              <td>{r.recommendation ? <StatusBadge status={r.recommendation === 'Highly Recommended' ? 'Active' : r.recommendation === 'Not Recommended' ? 'Blocked' : 'Pending'} /> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}</td>
                              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.timeAgo}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
          </motion.div>
        )

      case 'security':
        return (
          <>
            {renderStats()}
            <div className="dashboard-grid">
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="card-header"><h2>Security Overview</h2><span className="badge green">Secure</span></div>
                {healthLoading
                  ? <Skeleton height={300} />
                  : healthError
                    ? <ErrorBanner msg={healthError} onRetry={loadHealth} />
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {(healthData?.security || [
                          { label: 'JWT Authentication',    value: 'HS256 · 7d expiry',        ok: true  },
                          { label: 'BCrypt Hashing',        value: 'Salt rounds: 12',          ok: true  },
                          { label: 'CORS Policy',           value: 'Configured',               ok: true  },
                          { label: 'Helmet.js',             value: 'Active',                   ok: true  },
                          { label: 'Parameterised SQL',     value: 'No SQL injection risk',    ok: true  },
                          { label: 'OAuth Providers',       value: 'Google · GitHub',          ok: true  },
                          { label: 'Role Self-Assignment',  value: 'ADMIN blocked on register',ok: true  },
                        ]).map((item, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <Shield size={18} color={item.ok ? '#10b981' : '#ef4444'} />
                              <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.value}</span>
                              <span className={`badge ${item.ok ? 'green' : 'red'}`}>{item.ok ? '✓' : '!'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
              </motion.div>

              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header"><h2>DB Pool Status</h2></div>
                {healthLoading
                  ? <Skeleton height={200} />
                  : healthData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { label: 'Total Connections', value: healthData.database?.totalConnections ?? '—' },
                        { label: 'Idle Connections',  value: healthData.database?.idleConnections  ?? '—' },
                        { label: 'Waiting Clients',   value: healthData.database?.waitingClients   ?? '—' },
                        { label: 'Max Pool Size',     value: healthData.database?.maxConnections   ?? '—' },
                        { label: 'DB Latency',        value: healthData.database?.latencyMs != null ? `${healthData.database.latencyMs}ms` : '—' },
                        { label: 'Node.js Version',   value: healthData.server?.nodeVersion || '—' },
                        { label: 'Platform',          value: healthData.server?.platform || '—' },
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{String(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
              </motion.div>
            </div>
          </>
        )

      case 'ai-config':
        return (
          <>
            {renderStats()}
            <div className="dashboard-grid">
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="card-header">
                  <h2>AI Model Configuration</h2>
                  <span className={`badge ${aiData?.hasKeys ? 'green' : 'orange'}`}>
                    {aiLoading ? '…' : aiData?.hasKeys ? `${aiData.model} Active` : 'No Keys Configured'}
                  </span>
                </div>
                {aiLoading
                  ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{[0,1,2,3,4,5].map(i => <Skeleton key={i} height={88} />)}</div>
                  : aiError
                    ? <ErrorBanner msg={aiError} onRetry={loadAi} />
                    : aiData && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                          { icon: <Brain size={20} color="#10b981" />,    label: 'AI Model',        value: aiData.model,                            sub: aiData.modelStatus,       c: '#10b981' },
                          { icon: <Activity size={20} color="#f97316" />, label: 'Total API Calls', value: aiData.totalRequests?.toLocaleString(),   sub: 'All time',               c: '#f97316' },
                          { icon: <FileText size={20} color="#6366f1" />, label: 'Evaluations',     value: aiData.totalEvaluations?.toLocaleString(),sub: 'Interviews scored',      c: '#6366f1' },
                          { icon: <Cpu size={20} color="#10b981" />,      label: "Today's Calls",   value: aiData.todayRequests?.toLocaleString(),   sub: 'API requests',           c: '#10b981' },
                          { icon: <Clock size={20} color="#0ea5e9" />,    label: 'Active Keys',     value: String(aiData.activeKeyCount),            sub: 'Gemini API keys',        c: '#0ea5e9' },
                          { icon: <Server size={20} color="#a855f7" />,   label: 'Last Reset',      value: aiData.lastResetDate || '—',              sub: 'Daily counter reset',    c: '#a855f7' },
                        ].map((item, i) => (
                          <div key={i} style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>{item.icon}<span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</span></div>
                            <div style={{ fontSize: 22, fontWeight: 700 }}>{item.value} <span style={{ fontSize: 12, color: item.c, fontWeight: 500 }}>{item.sub}</span></div>
                          </div>
                        ))}
                      </div>
                    )}
              </motion.div>

              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header"><h2>AI Features</h2></div>
                {aiLoading
                  ? [0,1,2,3,4,5,6,7].map(i => <Skeleton key={i} height={48} style={{ marginBottom: 8 }} />)
                  : aiError
                    ? <ErrorBanner msg={aiError} onRetry={loadAi} />
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {(aiData?.aiFeatures || []).map((f, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 500 }}>{f.label}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{f.desc}</div>
                            </div>
                            <span className={`badge ${f.enabled ? 'green' : 'gray'}`}>{f.enabled ? 'Active' : 'Inactive'}</span>
                          </div>
                        ))}
                      </div>
                    )}
              </motion.div>
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <DashboardLayout
      title="Admin Dashboard" role="Administrator" userName="Admin User"
      sidebarLinks={sidebarLinks} activeSection={activeSection} onSectionChange={handleSectionChange}
    >
      <Toast msg={toast} onClose={() => setToast('')} />
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 460, boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Add / Invite User</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '14px 16px', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
              <strong>Admin note:</strong> To create new user accounts, direct them to the registration page or use your organisation's onboarding flow. Role assignments can be managed from the user table after they register.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-outline" onClick={() => setShowAddModal(false)}>Close</button>
            </div>
          </motion.div>
        </div>
      )}
      {manageUser && <UserModal user={manageUser} onClose={() => setManageUser(null)} onSave={handleManageSave} />}
      {viewUser   && <ViewModal user={viewUser}   onClose={() => setViewUser(null)} />}

      {renderSection()}
    </DashboardLayout>
  )
}

export default AdminDashboard
