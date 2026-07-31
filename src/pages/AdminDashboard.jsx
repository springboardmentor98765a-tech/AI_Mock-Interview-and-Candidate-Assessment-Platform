import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import {
  Users, UserCheck, Briefcase, FileText, Activity, Shield,
  Server, Database, Mail, Wrench, Brain, Cpu, BarChart3,
  TrendingUp, TrendingDown, Eye, Settings, Webhook, MapPin,
  ChevronUp, ChevronDown, Search, X, UserPlus, CheckCircle,
  Ban, Lock, Key, AlertTriangle, Globe, Clock
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell
} from 'recharts'

const INIT_USERS = [
  { name: 'Rahul Sharma',  email: 'rahul@email.com',  role: 'Recruiter',  status: 'Active',  joined: 'Jan 12, 2025' },
  { name: 'Priya Patel',   email: 'priya@email.com',  role: 'Candidate',  status: 'Active',  joined: 'Feb 3, 2025'  },
  { name: 'Amit Kumar',    email: 'amit@email.com',   role: 'Admin',      status: 'Active',  joined: 'Dec 20, 2024' },
  { name: 'Sneha Gupta',   email: 'sneha@email.com',  role: 'Candidate',  status: 'Blocked', joined: 'Mar 7, 2025'  },
  { name: 'Vikram Singh',  email: 'vikram@email.com', role: 'Recruiter',  status: 'Pending', joined: 'Apr 15, 2025' },
  { name: 'Ananya Iyer',   email: 'ananya@email.com', role: 'Candidate',  status: 'Active',  joined: 'May 1, 2025'  },
  { name: 'Rohit Verma',   email: 'rohit@email.com',  role: 'Recruiter',  status: 'Active',  joined: 'May 22, 2025' },
  { name: 'Meera Das',     email: 'meera@email.com',  role: 'Candidate',  status: 'Pending', joined: 'Jun 10, 2025' },
]

const monthlyData = [
  { month: 'Jan', users: 320, interviews: 145, reports: 89  },
  { month: 'Feb', users: 380, interviews: 178, reports: 102 },
  { month: 'Mar', users: 420, interviews: 210, reports: 128 },
  { month: 'Apr', users: 510, interviews: 245, reports: 156 },
  { month: 'May', users: 580, interviews: 298, reports: 178 },
  { month: 'Jun', users: 640, interviews: 342, reports: 201 },
]

const uptrendData = [
  { month: 'Jan', value: 88 },
  { month: 'Feb', value: 91 },
  { month: 'Mar', value: 89 },
  { month: 'Apr', value: 95 },
  { month: 'May', value: 97 },
  { month: 'Jun', value: 99 },
]

const roleDistribution = [
  { name: 'Candidates', value: 2247, color: '#6366f1' },
  { name: 'Recruiters', value: 425,  color: '#0ea5e9' },
  { name: 'Admins',     value: 175,  color: '#10b981' },
]

const MOCK_REPORTS = [
  { id: 'RPT-001', candidate: 'Arjun Reddy',  role: 'Frontend Developer', score: 91.7, recruiter: 'Rahul Sharma',  date: 'Jul 25, 2025', status: 'Complete' },
  { id: 'RPT-002', candidate: 'Kavya Nair',   role: 'Data Analyst',       score: 87.7, recruiter: 'Rohit Verma',   date: 'Jul 24, 2025', status: 'Complete' },
  { id: 'RPT-003', candidate: 'Rohan Joshi',  role: 'Backend Developer',  score: 83.7, recruiter: 'Vikram Singh',  date: 'Jul 23, 2025', status: 'Complete' },
  { id: 'RPT-004', candidate: 'Meera Iyer',   role: 'UI/UX Designer',     score: 75.0, recruiter: 'Rahul Sharma',  date: 'Jul 22, 2025', status: 'Pending'  },
  { id: 'RPT-005', candidate: 'Sanjay Das',   role: 'DevOps Engineer',    score: 67.7, recruiter: 'Rohit Verma',   date: 'Jul 21, 2025', status: 'Review'   },
]

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

function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState(user ? { ...user } : { name: '', email: '', role: 'Candidate', status: 'Active', joined: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) })
  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 460, boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{user ? 'Manage User' : 'Add New User'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-field"><label>Full Name</label><input type="text" value={form.name} onChange={set('name')} /></div>
          <div className="form-field"><label>Email</label><input type="email" value={form.email} onChange={set('email')} /></div>
          <div className="form-field"><label>Role</label>
            <select value={form.role} onChange={set('role')}><option>Admin</option><option>Recruiter</option><option>Candidate</option></select>
          </div>
          <div className="form-field"><label>Status</label>
            <select value={form.status} onChange={set('status')}><option>Active</option><option>Blocked</option><option>Pending</option></select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>{user ? 'Save Changes' : 'Add User'}</button>
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
        {[['Role', user.role], ['Status', user.status], ['Joined', user.joined]].map(([k, v]) => (
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

function UserTable({ data, onView, onManage, onToggle, search, setSearch, page, setPage, PAGE_SIZE, sortField, setSortField, sortDir, setSortDir, onAdd, showAdd }) {
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp size={12} style={{ opacity: 0.3 }} />
    return sortDir === 'asc' ? <ChevronUp size={12} style={{ color: 'var(--primary)' }} /> : <ChevronDown size={12} style={{ color: 'var(--primary)' }} />
  }
  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }
  const filtered = data
    .filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const va = a[sortField] || '', vb = b[sortField] || ''
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  return (
    <>
      <div className="table-search-wrapper">
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input className="table-search-bar" style={{ paddingLeft: 32 }} placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge gray">{filtered.length} users</span>
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
            {paginated.length === 0
              ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No users found</td></tr>
              : paginated.map((u, i) => (
                <tr key={i}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="user-avatar">{u.name.charAt(0)}</div><span style={{ fontWeight: 500 }}>{u.name}</span></div></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>{u.role}</td>
                  <td><StatusBadge status={u.status} /></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.joined}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => onView(u)}><Eye size={13} /> View</button>
                      <button className="btn btn-primary btn-sm" onClick={() => onManage(u)}><Settings size={13} /> Manage</button>
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
        <span className="pagination-info">Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
        <div className="pagination-btns">
          <button className={`page-btn ${page === 1 ? 'disabled' : ''}`} onClick={() => setPage(p => Math.max(1, p - 1))}>← Prev</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} className={`page-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
          ))}
          <button className={`page-btn ${page === totalPages ? 'disabled' : ''}`} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next →</button>
        </div>
      </div>
    </>
  )
}

function AdminDashboard() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [users, setUsers]           = useState(INIT_USERS)
  const [search, setSearch]         = useState('')
  const [sortField, setSortField]   = useState('name')
  const [sortDir, setSortDir]       = useState('asc')
  const [page, setPage]             = useState(1)
  const [toast, setToast]           = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [manageUser, setManageUser]     = useState(null)
  const [viewUser, setViewUser]         = useState(null)
  const PAGE_SIZE = 5

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const handleSectionChange = (section) => {
    setActiveSection(section)
    setSearch(''); setPage(1)
  }

  const handleAddUser    = (form) => { setUsers(p => [...p, form]); setShowAddModal(false); showToast(`User "${form.name}" added`) }
  const handleManageSave = (form) => { setUsers(p => p.map(u => u.email === manageUser.email ? form : u)); setManageUser(null); showToast(`User "${form.name}" updated`) }
  const handleToggle     = (u)    => {
    const next = u.status === 'Active' ? 'Blocked' : 'Active'
    setUsers(p => p.map(x => x.email === u.email ? { ...x, status: next } : x))
    showToast(`${u.name} is now ${next}`)
  }

  const stats = [
    { label: 'Total Users',       value: users.length > 8 ? `${2840 + users.length - 8}+` : '2,847', trend: '+12.5%', up: true,  icon: <Users size={22} />,    color: 'purple' },
    { label: 'Active Recruiters', value: '186',   trend: '+8.3%',  up: true,  icon: <Briefcase size={22} />, color: 'blue'   },
    { label: 'Total Interviews',  value: '1,423', trend: '+15.2%', up: true,  icon: <Activity size={22} />,  color: 'green'  },
    { label: 'Reports Generated', value: '892',   trend: '+5.7%',  up: true,  icon: <FileText size={22} />,  color: 'orange' },
  ]

  const healthItems = [
    { icon: <Webhook size={18} />,  label: 'API Health',  value: '99.9%',  status: 'Operational', ok: true  },
    { icon: <Cpu size={18} />,      label: 'CPU Usage',   value: '23%',    status: 'Normal',      ok: true  },
    { icon: <Database size={18} />, label: 'Storage',     value: '67%',    status: 'Moderate',    ok: false },
    { icon: <Server size={18} />,   label: 'Server',      value: 'Active', status: 'Running',     ok: true  },
    { icon: <Activity size={18} />, label: 'Uptime',      value: '99.97%', status: 'Excellent',   ok: true  },
  ]

  const activities = [
    { text: 'New recruiter registered: Ananya Iyer',  color: 'green',  time: '5 min ago'   },
    { text: 'Interview completed: React Developer',    color: 'blue',   time: '1 hour ago'  },
    { text: 'Report generated: Candidate #2847',       color: 'purple', time: '3 hours ago' },
    { text: 'Login attempt failed: unknown@email.com', color: 'red',    time: '5 hours ago' },
    { text: 'System update deployed v2.4.1',           color: 'orange', time: '8 hours ago' },
  ]

  const settingCards = [
    { icon: <Shield size={20} color="#6366f1" />,  label: 'User Access Control', action: () => showToast('User Access Control settings opened') },
    { icon: <Mail size={20} color="#0ea5e9" />,    label: 'Email Notifications',  action: () => navigate('/settings') },
    { icon: <Server size={20} color="#10b981" />,  label: 'Server Config',        action: () => showToast('Server config: Node.js v18 · Express v4.18') },
    { icon: <Wrench size={20} color="#f59e0b" />,  label: 'Maintenance Mode',     action: () => showToast('Maintenance mode is currently OFF') },
    { icon: <Webhook size={20} color="#a855f7" />, label: 'Webhook Settings',     action: () => showToast('3 active webhooks configured') },
    { icon: <MapPin size={20} color="#ef4444" />,  label: 'Regional Settings',    action: () => showToast('Region: IN-South Asia · IST (UTC+5:30)') },
  ]

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

  const renderStats = () => (
    <div className="stats-grid" style={{ marginBottom: 20 }}>
      {stats.map((s, i) => (
        <motion.div key={i} className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <div className={`stat-icon ${s.color}`}>{s.icon}</div>
          <div className="stat-details">
            <h3>{s.value}</h3><p>{s.label}</p>
            <span className={`stat-trend ${s.up ? 'up' : 'down'}`}>{s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {s.trend}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )

  const renderSection = () => {
    switch (activeSection) {

      case 'dashboard':
        return (
          <>
            {renderStats()}
            <motion.div className="card full-width" style={{ marginBottom: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="card-header"><h2>Platform Analytics</h2><span className="badge blue">Last 6 Months</span></div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Bar dataKey="users"      fill="#6366f1" radius={[4,4,0,0]} name="Users"      />
                  <Bar dataKey="interviews" fill="#0ea5e9" radius={[4,4,0,0]} name="Interviews" />
                  <Bar dataKey="reports"    fill="#10b981" radius={[4,4,0,0]} name="Reports"    />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
            <div className="dashboard-grid">
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header"><h2>System Health</h2><span className="badge green">All Systems Go</span></div>
                <div className="system-health-grid">
                  {healthItems.map((h, i) => (
                    <div key={i} className="health-item">
                      <div className="health-icon" style={{ background: h.ok ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: h.ok ? '#10b981' : '#f59e0b' }}>{h.icon}</div>
                      <div className="health-info"><h4>{h.label}</h4><p style={{ color: h.ok ? '#10b981' : '#f59e0b' }}>{h.value} · {h.status}</p></div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="card-header"><h2>AI Configuration</h2><span className="badge purple">GPT-4 Active</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { icon: <Brain size={18} color="#10b981" />,    label: 'Model Status',   value: 'GPT-4',  sub: 'Active',  c: '#10b981' },
                    { icon: <Activity size={18} color="#f97316" />, label: 'AI Quota',       value: '78%',    sub: 'Used',    c: '#f97316' },
                    { icon: <FileText size={18} color="#6366f1" />, label: 'Prompt Version', value: 'v3.2.1', sub: 'Current', c: '#6366f1' },
                    { icon: <Cpu size={18} color="#10b981" />,      label: 'Inference',      value: '24ms',   sub: 'Avg',     c: '#10b981' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>{item.icon}<span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</span></div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{item.value} <span style={{ fontSize: 12, color: item.c, fontWeight: 500 }}>{item.sub}</span></div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="card-header"><h2>Recent Activity</h2></div>
                <div className="activity-list">
                  {activities.map((a, i) => (
                    <div key={i} className="activity-item">
                      <div className={`activity-dot ${a.color}`} />
                      <div className="activity-content"><div className="activity-text">{a.text}</div><div className="activity-time">{a.time}</div></div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <div className="card-header"><h2>Platform Settings</h2></div>
                <div className="settings-grid">
                  {settingCards.map((s, i) => (
                    <button key={i} className="settings-card" onClick={s.action} style={{ cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', padding: 0 }}>
                      {s.icon}<span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
            <motion.div className="card" style={{ marginTop: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="card-header"><h2>User Management</h2></div>
              <UserTable data={users} onView={setViewUser} onManage={setManageUser} onToggle={handleToggle} search={search} setSearch={setSearch} page={page} setPage={setPage} PAGE_SIZE={PAGE_SIZE} sortField={sortField} setSortField={setSortField} sortDir={sortDir} setSortDir={setSortDir} onAdd={() => setShowAddModal(true)} showAdd />
            </motion.div>
          </>
        )

      case 'users':
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <div>
                <h2>User Management</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>All users across the platform</p>
              </div>
            </div>
            <UserTable data={users} onView={setViewUser} onManage={setManageUser} onToggle={handleToggle} search={search} setSearch={setSearch} page={page} setPage={setPage} PAGE_SIZE={PAGE_SIZE} sortField={sortField} setSortField={setSortField} sortDir={sortDir} setSortDir={setSortDir} onAdd={() => setShowAddModal(true)} showAdd />
          </motion.div>
        )

      case 'analytics':
        return (
          <>
            {renderStats()}
            <motion.div className="card full-width" style={{ marginBottom: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="card-header"><h2>Platform Growth</h2><span className="badge blue">Last 6 Months</span></div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Bar dataKey="users"      fill="#6366f1" radius={[4,4,0,0]} name="Users"      />
                  <Bar dataKey="interviews" fill="#0ea5e9" radius={[4,4,0,0]} name="Interviews" />
                  <Bar dataKey="reports"    fill="#10b981" radius={[4,4,0,0]} name="Reports"    />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
            <div className="dashboard-grid">
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header"><h2>API Uptime Trend</h2><span className="badge green">99.97%</span></div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={uptrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis domain={[85, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v}%`, 'Uptime']} />
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="card-header"><h2>User Distribution</h2></div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                      {roleDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v, n) => [v.toLocaleString(), n]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="card-header"><h2>System Health</h2><span className="badge green">All Systems Go</span></div>
                <div className="system-health-grid">
                  {healthItems.map((h, i) => (
                    <div key={i} className="health-item">
                      <div className="health-icon" style={{ background: h.ok ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: h.ok ? '#10b981' : '#f59e0b' }}>{h.icon}</div>
                      <div className="health-info"><h4>{h.label}</h4><p style={{ color: h.ok ? '#10b981' : '#f59e0b' }}>{h.value} · {h.status}</p></div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </>
        )

      case 'recruiters': {
        const recruiterData = users.filter(u => u.role === 'Recruiter')
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <div><h2>Recruiter Management</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{recruiterData.length} recruiters on the platform</p></div>
              <span className="badge blue">{recruiterData.filter(r => r.status === 'Active').length} Active</span>
            </div>
            <UserTable data={recruiterData} onView={setViewUser} onManage={setManageUser} onToggle={handleToggle} search={search} setSearch={setSearch} page={page} setPage={setPage} PAGE_SIZE={PAGE_SIZE} sortField={sortField} setSortField={setSortField} sortDir={sortDir} setSortDir={setSortDir} onAdd={() => setShowAddModal(true)} showAdd={false} />
          </motion.div>
        )
      }

      case 'candidates': {
        const candidateData = users.filter(u => u.role === 'Candidate')
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <div><h2>Candidate Management</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{candidateData.length} candidates on the platform</p></div>
              <span className="badge purple">{candidateData.filter(c => c.status === 'Active').length} Active</span>
            </div>
            <UserTable data={candidateData} onView={setViewUser} onManage={setManageUser} onToggle={handleToggle} search={search} setSearch={setSearch} page={page} setPage={setPage} PAGE_SIZE={PAGE_SIZE} sortField={sortField} setSortField={setSortField} sortDir={sortDir} setSortDir={setSortDir} onAdd={() => setShowAddModal(true)} showAdd={false} />
          </motion.div>
        )
      }

      case 'reports':
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <div><h2>Assessment Reports</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>All generated candidate assessment reports</p></div>
              <span className="badge gray">{MOCK_REPORTS.length} reports</span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead><tr>
                  <th>Report ID</th><th>Candidate</th><th>Role</th><th>Score</th><th>Recruiter</th><th>Date</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {MOCK_REPORTS.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{r.id}</td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="user-avatar">{r.candidate.charAt(0)}</div><span style={{ fontWeight: 500 }}>{r.candidate}</span></div></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{r.role}</td>
                      <td><span style={{ fontWeight: 700, color: r.score >= 85 ? '#10b981' : r.score >= 70 ? '#f59e0b' : '#ef4444' }}>{r.score}</span></td>
                      <td style={{ fontSize: 13 }}>{r.recruiter}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.date}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-outline btn-sm" onClick={() => showToast(`Viewing report ${r.id} for ${r.candidate}`)}><Eye size={13} /> View</button>
                          <button className="btn btn-primary btn-sm" onClick={() => {
                            const txt = `Report ${r.id}\nCandidate: ${r.candidate}\nRole: ${r.role}\nScore: ${r.score}\nDate: ${r.date}`
                            const blob = new Blob([txt], { type: 'text/plain' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a'); a.href = url; a.download = `${r.id}.txt`; a.click()
                            URL.revokeObjectURL(url); showToast(`${r.id} downloaded`)
                          }}>↓ Export</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )

      case 'security':
        return (
          <>
            {renderStats()}
            <div className="dashboard-grid">
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="card-header"><h2>Security Overview</h2><span className="badge green">Secure</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { icon: <Lock size={18} color="#6366f1" />,       label: 'JWT Authentication',      value: 'HS256 · 7d expiry',       ok: true  },
                    { icon: <Shield size={18} color="#10b981" />,      label: 'BCrypt Hashing',          value: 'Salt rounds: 12',         ok: true  },
                    { icon: <Globe size={18} color="#0ea5e9" />,       label: 'CORS Policy',             value: 'Configured',              ok: true  },
                    { icon: <Webhook size={18} color="#f59e0b" />,     label: 'Rate Limiting',           value: '100 req / 15 min',        ok: true  },
                    { icon: <Server size={18} color="#10b981" />,      label: 'Helmet.js',               value: 'Active',                  ok: true  },
                    { icon: <Database size={18} color="#6366f1" />,    label: 'Parameterised SQL',       value: 'No SQL injection risk',   ok: true  },
                    { icon: <Key size={18} color="#f97316" />,         label: 'OAuth Providers',         value: 'Google · GitHub',         ok: true  },
                    { icon: <AlertTriangle size={18} color="#ef4444" />, label: 'Failed Logins (24h)', value: '3 attempts',              ok: false },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {item.icon}
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.value}</span>
                        <span className={`badge ${item.ok ? 'green' : 'red'}`}>{item.ok ? '✓' : '!'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header"><h2>Recent Security Events</h2></div>
                <div className="activity-list">
                  {[
                    { text: 'Login attempt failed: unknown@email.com',     color: 'red',    time: '5 hours ago'  },
                    { text: 'Password changed: Rahul Sharma',               color: 'blue',   time: '1 day ago'    },
                    { text: 'New Google OAuth login: Priya Patel',          color: 'green',  time: '1 day ago'    },
                    { text: 'Admin role assigned: Amit Kumar',              color: 'orange', time: '3 days ago'   },
                    { text: 'GitHub OAuth login: Ananya Iyer',              color: 'purple', time: '5 days ago'   },
                    { text: 'Account blocked: Sneha Gupta (policy)',        color: 'red',    time: '1 week ago'   },
                  ].map((a, i) => (
                    <div key={i} className="activity-item">
                      <div className={`activity-dot ${a.color}`} />
                      <div className="activity-content"><div className="activity-text">{a.text}</div><div className="activity-time">{a.time}</div></div>
                    </div>
                  ))}
                </div>
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
                <div className="card-header"><h2>AI Model Configuration</h2><span className="badge green">GPT-4 Active</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { icon: <Brain size={20} color="#10b981" />,    label: 'Model Status',    value: 'GPT-4',     sub: 'Active',     c: '#10b981' },
                    { icon: <Activity size={20} color="#f97316" />, label: 'AI Quota Used',   value: '78%',       sub: '780/1000',   c: '#f97316' },
                    { icon: <FileText size={20} color="#6366f1" />, label: 'Prompt Version',  value: 'v3.2.1',    sub: 'Current',    c: '#6366f1' },
                    { icon: <Cpu size={20} color="#10b981" />,      label: 'Avg Inference',   value: '24ms',      sub: 'Fast',       c: '#10b981' },
                    { icon: <Clock size={20} color="#0ea5e9" />,    label: 'Cache Hit Rate',  value: '91%',       sub: 'High',       c: '#0ea5e9' },
                    { icon: <Server size={20} color="#a855f7" />,   label: 'API Requests',    value: '12.4K',     sub: 'This month', c: '#a855f7' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>{item.icon}<span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</span></div>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>{item.value} <span style={{ fontSize: 12, color: item.c, fontWeight: 500 }}>{item.sub}</span></div>
                      {item.label === 'AI Quota Used' && (
                        <div className="progress-bar-container" style={{ marginTop: 8 }}>
                          <div className="progress-bar-fill" style={{ width: item.value, background: '#f97316' }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header"><h2>AI Features</h2></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Mock Interview Analysis', desc: 'Real-time question scoring and feedback',         enabled: true  },
                    { label: 'Resume Parsing',           desc: 'AI-powered skill extraction and match scoring',  enabled: true  },
                    { label: 'Applicant Ranking',        desc: 'Automated ranking by composite AI score',        enabled: true  },
                    { label: 'Sentiment Analysis',       desc: 'Candidate communication quality assessment',     enabled: true  },
                    { label: 'Plagiarism Detection',     desc: 'Detect copied interview answers',                enabled: false },
                    { label: 'Bias Detection',           desc: 'Monitor and flag potential hiring bias',         enabled: false },
                  ].map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{f.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{f.desc}</div>
                      </div>
                      <span className={`badge ${f.enabled ? 'green' : 'gray'}`}>{f.enabled ? 'Active' : 'Inactive'}</span>
                    </div>
                  ))}
                </div>
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
      {showAddModal && <UserModal onClose={() => setShowAddModal(false)} onSave={handleAddUser} />}
      {manageUser   && <UserModal user={manageUser} onClose={() => setManageUser(null)} onSave={handleManageSave} />}
      {viewUser     && <ViewModal user={viewUser} onClose={() => setViewUser(null)} />}

      {renderSection()}
    </DashboardLayout>
  )
}

export default AdminDashboard
