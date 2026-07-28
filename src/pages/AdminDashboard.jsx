import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import {
  Users, UserCheck, Briefcase, FileText, Activity, Shield,
  Server, Database, Mail, Wrench, Brain, Cpu, BarChart3,
  TrendingUp, TrendingDown, Eye, Settings, Webhook, MapPin,
  ChevronUp, ChevronDown, Search
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line
} from 'recharts'

const USERS_DATA = [
  { name: 'Rahul Sharma',  email: 'rahul@email.com',  role: 'Recruiter',  status: 'Active',   joined: 'Jan 12, 2025' },
  { name: 'Priya Patel',   email: 'priya@email.com',  role: 'Candidate',  status: 'Active',   joined: 'Feb 3, 2025'  },
  { name: 'Amit Kumar',    email: 'amit@email.com',   role: 'Admin',      status: 'Active',   joined: 'Dec 20, 2024' },
  { name: 'Sneha Gupta',   email: 'sneha@email.com',  role: 'Candidate',  status: 'Blocked',  joined: 'Mar 7, 2025'  },
  { name: 'Vikram Singh',  email: 'vikram@email.com', role: 'Recruiter',  status: 'Pending',  joined: 'Apr 15, 2025' },
  { name: 'Ananya Iyer',   email: 'ananya@email.com', role: 'Candidate',  status: 'Active',   joined: 'May 1, 2025'  },
  { name: 'Rohit Verma',   email: 'rohit@email.com',  role: 'Recruiter',  status: 'Active',   joined: 'May 22, 2025' },
  { name: 'Meera Das',     email: 'meera@email.com',  role: 'Candidate',  status: 'Pending',  joined: 'Jun 10, 2025' },
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

function StatusBadge({ status }) {
  const map = { Active: 'green', Blocked: 'red', Pending: 'orange' }
  return <span className={`badge ${map[status] || 'gray'}`}>{status}</span>
}

function AdminDashboard() {
  const [search, setSearch]     = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir]   = useState('asc')
  const [page, setPage]         = useState(1)
  const PAGE_SIZE = 5

  const sidebarLinks = [
    {
      title: 'Overview',
      items: [
        { icon: <BarChart3 size={18} />, label: 'Dashboard' },
        { icon: <Users size={18} />, label: 'Users' },
        { icon: <Activity size={18} />, label: 'Analytics' },
      ],
    },
    {
      title: 'Management',
      items: [
        { icon: <Briefcase size={18} />, label: 'Recruiters' },
        { icon: <UserCheck size={18} />, label: 'Candidates' },
        { icon: <FileText size={18} />, label: 'Reports' },
      ],
    },
    {
      title: 'System',
      items: [
        { icon: <Settings size={18} />, label: 'Settings' },
        { icon: <Shield size={18} />, label: 'Security' },
        { icon: <Brain size={18} />, label: 'AI Config' },
      ],
    },
  ]

  const stats = [
    { label: 'Total Users',       value: '2,847', trend: '+12.5%', up: true,  icon: <Users size={22} />,    color: 'purple' },
    { label: 'Active Recruiters', value: '186',   trend: '+8.3%',  up: true,  icon: <Briefcase size={22} />, color: 'blue'   },
    { label: 'Total Interviews',  value: '1,423', trend: '+15.2%', up: true,  icon: <Activity size={22} />,  color: 'green'  },
    { label: 'Reports Generated', value: '892',   trend: '+5.7%',  up: true,  icon: <FileText size={22} />,  color: 'orange' },
  ]

  const healthItems = [
    { icon: <Webhook size={18} />,  label: 'API Health',  value: '99.9%',   status: 'Operational', ok: true  },
    { icon: <Cpu size={18} />,      label: 'CPU Usage',   value: '23%',     status: 'Normal',      ok: true  },
    { icon: <Database size={18} />, label: 'Storage',     value: '67%',     status: 'Moderate',    ok: false },
    { icon: <Server size={18} />,   label: 'Server',      value: 'Active',  status: 'Running',     ok: true  },
    { icon: <Activity size={18} />, label: 'Uptime',      value: '99.97%',  status: 'Excellent',   ok: true  },
  ]

  const activities = [
    { text: 'New recruiter registered: Ananya Iyer',   color: 'green',  time: '5 min ago'   },
    { text: 'Interview completed: React Developer',     color: 'blue',   time: '1 hour ago'  },
    { text: 'Report generated: Candidate #2847',        color: 'purple', time: '3 hours ago' },
    { text: 'Login attempt failed: unknown@email.com',  color: 'red',    time: '5 hours ago' },
    { text: 'System update deployed v2.4.1',            color: 'orange', time: '8 hours ago' },
  ]

  const settingCards = [
    { icon: <Shield size={20} color="#6366f1" />,  label: 'User Access Control' },
    { icon: <Mail size={20} color="#0ea5e9" />,    label: 'Email Notifications' },
    { icon: <Server size={20} color="#10b981" />,  label: 'Server Config'       },
    { icon: <Wrench size={20} color="#f59e0b" />,  label: 'Maintenance Mode'    },
    { icon: <Webhook size={20} color="#a855f7" />, label: 'Webhook Settings'    },
    { icon: <MapPin size={20} color="#ef4444" />,  label: 'Regional Settings'   },
  ]

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }

  const filtered = USERS_DATA
    .filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const va = a[sortField] || '', vb = b[sortField] || ''
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp size={12} style={{ opacity: 0.3 }} />
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ color: 'var(--primary)' }} />
      : <ChevronDown size={12} style={{ color: 'var(--primary)' }} />
  }

  return (
    <DashboardLayout title="Admin Dashboard" role="Administrator" userName="Admin User" sidebarLinks={sidebarLinks}>

      <div className="stats-grid">
        {stats.map((s, i) => (
          <motion.div key={i} className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-details">
              <h3>{s.value}</h3>
              <p>{s.label}</p>
              <span className={`stat-trend ${s.up ? 'up' : 'down'}`}>
                {s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {s.trend}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div className="card full-width" style={{ marginBottom: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <div className="card-header">
          <h2>Platform Analytics</h2>
          <span className="badge blue">Last 6 Months</span>
        </div>
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
        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
          <div className="card-header">
            <h2>System Health</h2>
            <span className="badge green">All Systems Go</span>
          </div>
          <div className="system-health-grid">
            {healthItems.map((h, i) => (
              <div key={i} className="health-item">
                <div className="health-icon" style={{ background: h.ok ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: h.ok ? '#10b981' : '#f59e0b' }}>
                  {h.icon}
                </div>
                <div className="health-info">
                  <h4>{h.label}</h4>
                  <p style={{ color: h.ok ? '#10b981' : '#f59e0b' }}>{h.value} · {h.status}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.49 }}>
          <div className="card-header">
            <h2>AI Configuration</h2>
            <span className="badge purple">GPT-4 Active</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { icon: <Brain size={18} color="#10b981" />,    label: 'Model Status',   value: 'GPT-4',   sub: 'Active',     c: '#10b981' },
              { icon: <Activity size={18} color="#f97316" />, label: 'AI Quota',       value: '78%',     sub: 'Used',       c: '#f97316' },
              { icon: <FileText size={18} color="#6366f1" />, label: 'Prompt Version', value: 'v3.2.1',  sub: 'Current',    c: '#6366f1' },
              { icon: <Cpu size={18} color="#10b981" />,      label: 'Inference',      value: '24ms',    sub: 'Avg',        c: '#10b981' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {item.icon}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {item.value} <span style={{ fontSize: 12, color: item.c, fontWeight: 500 }}>{item.sub}</span>
                </div>
                {item.label === 'AI Quota' && (
                  <div className="progress-bar-container" style={{ marginTop: 8 }}>
                    <div className="progress-bar-fill" style={{ width: item.value, background: '#f97316' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.56 }}>
          <div className="card-header"><h2>API Uptime Trend</h2></div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={uptrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis domain={[85, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v) => [`${v}%`, 'Uptime']} />
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.63 }}>
          <div className="card-header"><h2>Recent Activity</h2></div>
          <div className="activity-list">
            {activities.map((a, i) => (
              <div key={i} className="activity-item">
                <div className={`activity-dot ${a.color}`} />
                <div className="activity-content">
                  <div className="activity-text">{a.text}</div>
                  <div className="activity-time">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.70 }}>
          <div className="card-header"><h2>Platform Settings</h2></div>
          <div className="settings-grid">
            {settingCards.map((s, i) => (
              <div key={i} className="settings-card">
                {s.icon}
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.77 }}>
        <div className="card-header">
          <h2>User Management</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="badge gray">{filtered.length} users</span>
          </div>
        </div>
        <div className="table-search-wrapper">
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              className="table-search-bar"
              style={{ paddingLeft: 32 }}
              placeholder="Search users..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <button className="btn btn-primary btn-sm">+ Add User</button>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th className="sortable-th" onClick={() => handleSort('name')}>
                  <div className="th-inner">Name <SortIcon field="name" /></div>
                </th>
                <th>Email</th>
                <th className="sortable-th" onClick={() => handleSort('role')}>
                  <div className="th-inner">Role <SortIcon field="role" /></div>
                </th>
                <th className="sortable-th" onClick={() => handleSort('status')}>
                  <div className="th-inner">Status <SortIcon field="status" /></div>
                </th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No users found</td></tr>
              ) : paginated.map((u, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="user-avatar">{u.name.charAt(0)}</div>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>{u.role}</td>
                  <td><StatusBadge status={u.status} /></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.joined}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-outline btn-sm"><Eye size={13} /> View</button>
                      <button className="btn btn-primary btn-sm"><Settings size={13} /> Manage</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span className="pagination-info">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} users
          </span>
          <div className="pagination-btns">
            <button className={`page-btn ${page === 1 ? 'disabled' : ''}`} onClick={() => setPage(p => Math.max(1, p - 1))}>← Prev</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} className={`page-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button className={`page-btn ${page === totalPages ? 'disabled' : ''}`} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next →</button>
          </div>
        </div>
      </motion.div>

    </DashboardLayout>
  )
}

export default AdminDashboard
