import { useState } from 'react'
import {
  Users, UserCheck, User, Activity, Shield, Settings, TrendingUp,
  Server, Bell, Lock, Database, Globe, AlertTriangle, CheckCircle,
  RefreshCw, Download, Plus, Trash2, Edit3, Eye, MoreHorizontal
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

const KPI = [
  { label: 'Total Users',   value: '1,284', change: '+47',  color: '#6366f1', icon: Users,     grad: 'linear-gradient(135deg,#6366f1,#a855f7)' },
  { label: 'Recruiters',    value: '38',    change: '+3',   color: '#06b6d4', icon: UserCheck, grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)' },
  { label: 'Candidates',    value: '1,246', change: '+44',  color: '#22c55e', icon: User,      grad: 'linear-gradient(135deg,#22c55e,#06b6d4)'  },
  { label: 'Active Sessions', value: '92',  change: 'Live', color: '#a855f7', icon: Activity,  grad: 'linear-gradient(135deg,#a855f7,#6366f1)'  },
]

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

const ALL_USERS = [
  { name: 'Priya Patel',   role: 'Recruiter',  email: 'priya@company.com', status: 'Active',    joined: 'Jan 2026', initials: 'PP', color: '#6366f1' },
  { name: 'Vikram Singh',  role: 'Candidate',  email: 'vikram@mail.com',   status: 'Active',    joined: 'Feb 2026', initials: 'VS', color: '#22c55e' },
  { name: 'Sneha Reddy',   role: 'Candidate',  email: 'sneha@mail.com',    status: 'Inactive',  joined: 'Mar 2026', initials: 'SR', color: '#a855f7' },
  { name: 'Amit Sharma',   role: 'Recruiter',  email: 'amit@company.com',  status: 'Active',    joined: 'Mar 2026', initials: 'AS', color: '#f59e0b' },
  { name: 'Riya Kapoor',   role: 'Candidate',  email: 'riya@mail.com',     status: 'Active',    joined: 'Apr 2026', initials: 'RK', color: '#ef4444' },
  { name: 'Dev Malhotra',  role: 'Recruiter',  email: 'dev@company.com',   status: 'Suspended', joined: 'May 2026', initials: 'DM', color: '#06b6d4' },
]

const SYSTEM_HEALTH = [
  { label: 'API Server',    status: 'Online', uptime: '99.9%', color: '#22c55e' },
  { label: 'AI Engine',     status: 'Online', uptime: '99.7%', color: '#22c55e' },
  { label: 'Database',      status: 'Online', uptime: '100%',  color: '#22c55e' },
  { label: 'Media Server',  status: 'Warning', uptime: '97.2%', color: '#f59e0b' },
]

const SETTINGS_ITEMS = [
  { icon: Bell,     label: 'Email Notifications',    desc: 'Send alerts for key events',             enabled: true  },
  { icon: Lock,     label: 'Two-Factor Auth',         desc: 'Require 2FA for all admin accounts',     enabled: true  },
  { icon: Globe,    label: 'Public API Access',       desc: 'Allow external API integrations',         enabled: false },
  { icon: Database, label: 'Auto Backup',             desc: 'Daily database snapshots to cloud',       enabled: true  },
  { icon: Activity, label: 'Real-time Analytics',     desc: 'Stream live platform usage data',         enabled: true  },
  { icon: Shield,   label: 'Content Moderation',      desc: 'AI-powered response screening',           enabled: false },
]

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

export default function AdminDashboard() {
  const [settings, setSettings] = useState(SETTINGS_ITEMS.map(s => s.enabled))
  const toggleSetting = (i) => setSettings(prev => prev.map((v, idx) => idx === i ? !v : v))

  return (
    <div className="dashboard-layout">
      <Sidebar role="admin" />
      <div className="dashboard-main">
        <Topbar
          title="Admin Dashboard"
          subtitle="Platform overview, user management, and system settings"
          userName="Raj Verma"
          userInitials="RV"
          roleBadge="Admin"
        />
        <div className="dashboard-content">

          {/* KPI Cards */}
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

          {/* Analytics */}
          <div className="grid-cols-2" style={{ marginBottom: 32 }}>
            {/* Platform usage */}
            <div className="card" style={{ gridColumn: 'span 1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff' }}>Platform Growth</h3>
                  <p style={{ fontSize: '0.78rem', color: '#606080', marginTop: 2 }}>Users & interviews over time</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: '#6366f1' }} />
                    <span style={{ fontSize: '0.72rem', color: '#606080' }}>Users</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: '#06b6d4' }} />
                    <span style={{ fontSize: '0.72rem', color: '#606080' }}>Interviews</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={USAGE_DATA}>
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
                  <Area type="monotone" dataKey="users"      name="Users"      stroke="#6366f1" strokeWidth={2} fill="url(#usersGrad)" />
                  <Area type="monotone" dataKey="interviews" name="Interviews" stroke="#06b6d4" strokeWidth={2} fill="url(#intGrad)"   />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Pie + System Health */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* User Distribution */}
              <div className="card" style={{ flex: 1 }}>
                <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff', marginBottom: 16 }}>User Distribution</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <PieChart width={130} height={130}>
                    <Pie data={PIE_DATA} cx={60} cy={60} innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                      {PIE_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {PIE_DATA.map((p, i) => (
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
                  <button className="btn btn-outline btn-sm" style={{ padding: '4px 10px', fontSize: '0.7rem' }}>
                    <RefreshCw size={11} /> Refresh
                  </button>
                </div>
                {SYSTEM_HEALTH.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < SYSTEM_HEALTH.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}80`, animation: s.status === 'Online' ? 'pulse-glow 2s infinite' : 'none' }} />
                      <span style={{ fontSize: '0.82rem', color: '#a0a0c0' }}>{s.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#606080' }}>{s.uptime}</span>
                      <span className={`badge ${s.status === 'Online' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.62rem' }}>{s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Management Table */}
          <div className="card" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff' }}>User Management</h3>
                <p style={{ fontSize: '0.78rem', color: '#606080', marginTop: 2 }}>All registered platform users</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm"><Download size={13} /> Export</button>
                <button className="btn btn-primary btn-sm"><Plus size={13} /> Add User</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ALL_USERS.map((u, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar avatar-sm" style={{ background: `linear-gradient(135deg, ${u.color}, ${u.color}88)` }}>{u.initials}</div>
                          <span style={{ fontWeight: 500, color: '#f0f0ff', fontSize: '0.875rem' }}>{u.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'Recruiter' ? 'badge-primary' : 'badge-accent'}`}>{u.role}</span>
                      </td>
                      <td style={{ color: '#a0a0c0', fontSize: '0.82rem' }}>{u.email}</td>
                      <td>
                        <span className={`badge ${u.status === 'Active' ? 'badge-success' : u.status === 'Inactive' ? 'badge-warning' : 'badge-danger'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ color: '#606080', fontSize: '0.78rem' }}>{u.joined}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" style={{ padding: '5px 10px' }}><Eye size={12} /></button>
                          <button className="btn btn-outline btn-sm" style={{ padding: '5px 10px' }}><Edit3 size={12} /></button>
                          <button className="btn btn-danger btn-sm" style={{ padding: '5px 10px' }}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Settings Panel */}
          <div className="card">
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
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12, transition: 'all 0.2s',
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} color="#6366f1" />
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
    </div>
  )
}
