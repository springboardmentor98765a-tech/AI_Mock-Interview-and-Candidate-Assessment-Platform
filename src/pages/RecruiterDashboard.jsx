import { useState } from 'react'
import {
  Users, Calendar, CheckSquare, Clock, Star, Filter,
  Download, ChevronRight, Eye, MessageSquare, TrendingUp, BarChart3, Plus
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LineChart, Line
} from 'recharts'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

const STATS = [
  { label: 'Total Candidates', value: '142',  change: '+8 this week',  color: '#6366f1', icon: Users,       grad: 'linear-gradient(135deg,#6366f1,#a855f7)' },
  { label: 'Scheduled',        value: '28',   change: '5 today',       color: '#06b6d4', icon: Calendar,    grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)' },
  { label: 'Completed',        value: '89',   change: '+12 this week', color: '#22c55e', icon: CheckSquare, grad: 'linear-gradient(135deg,#22c55e,#06b6d4)'  },
  { label: 'Pending Review',   value: '25',   change: '3 urgent',      color: '#f59e0b', icon: Clock,       grad: 'linear-gradient(135deg,#f59e0b,#ef4444)'  },
]

const CANDIDATES = [
  { name: 'Arjun Sharma',   role: 'Backend Dev',      score: 88, status: 'Shortlisted', date: 'Jul 24', initials: 'AS', color: '#6366f1' },
  { name: 'Priya Patel',    role: 'Frontend Dev',     score: 82, status: 'In Review',   date: 'Jul 23', initials: 'PP', color: '#a855f7' },
  { name: 'Rahul Gupta',    role: 'Full Stack',       score: 79, status: 'Pending',     date: 'Jul 22', initials: 'RG', color: '#22c55e' },
  { name: 'Sneha Reddy',    role: 'Data Scientist',   score: 91, status: 'Shortlisted', date: 'Jul 22', initials: 'SR', color: '#f59e0b' },
  { name: 'Vikram Singh',   role: 'DevOps Engineer',  score: 74, status: 'Rejected',    date: 'Jul 21', initials: 'VS', color: '#ef4444' },
  { name: 'Anjali Mehra',   role: 'ML Engineer',      score: 86, status: 'Scheduled',   date: 'Jul 20', initials: 'AM', color: '#06b6d4' },
]

const AVG_SCORES = [
  { role: 'Backend',   avg: 81 },
  { role: 'Frontend',  avg: 76 },
  { role: 'Full Stack',avg: 78 },
  { role: 'Data Sci',  avg: 84 },
  { role: 'DevOps',    avg: 72 },
  { role: 'ML',        avg: 88 },
]

const SCHEDULE = [
  { candidate: 'Priya Patel',  role: 'Frontend Dev',    time: '10:00 AM', status: 'Upcoming', color: '#6366f1' },
  { candidate: 'Rahul Gupta',  role: 'Full Stack',      time: '11:30 AM', status: 'Upcoming', color: '#a855f7' },
  { candidate: 'Neha Shah',    role: 'UI/UX Designer',  time: '2:00 PM',  status: 'Upcoming', color: '#22c55e' },
  { candidate: 'Karan Modi',   role: 'DevOps',          time: '3:30 PM',  status: 'Confirmed',color: '#f59e0b' },
]

const STATUS_BADGE = {
  Shortlisted: 'badge-success',
  'In Review': 'badge-primary',
  Pending:     'badge-warning',
  Rejected:    'badge-danger',
  Scheduled:   'badge-accent',
}

const BAR_COLORS = ['#6366f1','#a855f7','#06b6d4','#22c55e','#f59e0b','#ef4444']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="custom-tooltip">
        <p style={{ color: '#a0a0c0', marginBottom: 4 }}>{label}</p>
        <p style={{ color: '#6366f1', fontWeight: 700 }}>Avg: {payload[0].value}</p>
      </div>
    )
  }
  return null
}

export default function RecruiterDashboard() {
  const [filterStatus, setFilterStatus] = useState('All')
  const statuses = ['All', 'Shortlisted', 'In Review', 'Pending', 'Rejected', 'Scheduled']

  const filtered = filterStatus === 'All' ? CANDIDATES : CANDIDATES.filter(c => c.status === filterStatus)

  return (
    <div className="dashboard-layout">
      <Sidebar role="recruiter" />
      <div className="dashboard-main">
        <Topbar
          title="Recruiter Dashboard"
          subtitle="Manage candidates, schedules, and hiring pipeline"
          userName="Neha Joshi"
          userInitials="NJ"
          roleBadge="Recruiter"
        />
        <div className="dashboard-content">

          {/* Stats */}
          <div className="grid-cols-4" style={{ marginBottom: 32 }}>
            {STATS.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className="stat-card">
                  <div className="stat-card-icon" style={{ background: `${s.color}18` }}>
                    <Icon size={20} color={s.color} />
                  </div>
                  <div className="stat-card-value" style={{ background: s.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</div>
                  <div className="stat-card-label">{s.label}</div>
                  <div className="stat-card-change" style={{ color: '#22c55e' }}>
                    <TrendingUp size={11} /> {s.change}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Charts row */}
          <div className="grid-cols-2" style={{ marginBottom: 32 }}>
            {/* Average Scores */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff' }}>Average Scores by Role</h3>
                  <p style={{ fontSize: '0.78rem', color: '#606080', marginTop: 2 }}>Current hiring round performance</p>
                </div>
                <span className="badge badge-primary"><BarChart3 size={10} /> Analytics</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={AVG_SCORES} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="role" tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[60, 100]} tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                    {AVG_SCORES.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Today's Schedule */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff' }}>Today's Schedule</h3>
                  <p style={{ fontSize: '0.78rem', color: '#606080', marginTop: 2 }}>Jul 27, 2026 — 4 interviews</p>
                </div>
                <button className="btn btn-outline btn-sm"><Plus size={13} /> Add</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SCHEDULE.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
                    background: `${s.color}0a`, border: `1px solid ${s.color}18`,
                    borderRadius: 10, borderLeft: `3px solid ${s.color}`,
                  }}>
                    <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.875rem', color: s.color, minWidth: 60 }}>{s.time}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#f0f0ff', fontSize: '0.85rem' }}>{s.candidate}</div>
                      <div style={{ fontSize: '0.72rem', color: '#606080' }}>{s.role}</div>
                    </div>
                    <span className={`badge ${s.status === 'Confirmed' ? 'badge-success' : 'badge-accent'}`}>{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Candidate List */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff' }}>Candidate Pipeline</h3>
                <p style={{ fontSize: '0.78rem', color: '#606080', marginTop: 2 }}>{filtered.length} candidates shown</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {statuses.map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    style={{
                      padding: '6px 14px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                      background: filterStatus === s ? 'linear-gradient(135deg,#6366f1,#a855f7)' : 'rgba(255,255,255,0.05)',
                      border: filterStatus === s ? '1px solid transparent' : '1px solid rgba(255,255,255,0.08)',
                      color: filterStatus === s ? 'white' : '#a0a0c0',
                      transition: 'all 0.2s',
                    }}
                  >{s}</button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Role</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar avatar-sm" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}88)` }}>{c.initials}</div>
                          <span style={{ fontWeight: 500, color: '#f0f0ff' }}>{c.name}</span>
                        </div>
                      </td>
                      <td style={{ color: '#a0a0c0', fontSize: '0.82rem' }}>{c.role}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 60, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${c.score}%`, background: c.score >= 85 ? '#22c55e' : c.score >= 75 ? '#6366f1' : '#f59e0b', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontFamily: 'Outfit', fontWeight: 700, color: '#f0f0ff', fontSize: '0.875rem' }}>{c.score}</span>
                        </div>
                      </td>
                      <td><span className={`badge ${STATUS_BADGE[c.status]}`}>{c.status}</span></td>
                      <td style={{ color: '#606080', fontSize: '0.78rem' }}>{c.date}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" style={{ padding: '5px 10px' }}><Eye size={12} /></button>
                          <button className="btn btn-outline btn-sm" style={{ padding: '5px 10px' }}><MessageSquare size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
