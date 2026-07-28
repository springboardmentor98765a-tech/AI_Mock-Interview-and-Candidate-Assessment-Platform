import { useState, useMemo } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import {
  Users, Briefcase, FileText, Calendar, Video, Download,
  Eye, Star, Award, TrendingUp, TrendingDown, BarChart3,
  Activity, Search, ChevronUp, ChevronDown, MessageSquare
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, BarChart, Bar
} from 'recharts'

const ALL_CANDIDATES = [
  { rank: 1, name: 'Arjun Reddy',  role: 'Frontend Developer', resumeScore: 92, interviewScore: 88, aiScore: 95, finalScore: 91.7, rec: 'Highly Recommended', date: 'Jul 25, 2025' },
  { rank: 2, name: 'Kavya Nair',   role: 'Data Analyst',       resumeScore: 88, interviewScore: 85, aiScore: 90, finalScore: 87.7, rec: 'Highly Recommended', date: 'Jul 24, 2025' },
  { rank: 3, name: 'Rohan Joshi',  role: 'Backend Developer',  resumeScore: 85, interviewScore: 82, aiScore: 84, finalScore: 83.7, rec: 'Recommended',        date: 'Jul 23, 2025' },
  { rank: 4, name: 'Meera Iyer',   role: 'UI/UX Designer',     resumeScore: 78, interviewScore: 75, aiScore: 72, finalScore: 75.0, rec: 'Recommended',        date: 'Jul 22, 2025' },
  { rank: 5, name: 'Sanjay Das',   role: 'DevOps Engineer',    resumeScore: 70, interviewScore: 68, aiScore: 65, finalScore: 67.7, rec: 'Needs Review',       date: 'Jul 21, 2025' },
  { rank: 6, name: 'Pooja Mehta',  role: 'QA Engineer',        resumeScore: 62, interviewScore: 58, aiScore: 55, finalScore: 58.3, rec: 'Not Recommended',    date: 'Jul 20, 2025' },
  { rank: 7, name: 'Kiran Rao',    role: 'Data Engineer',      resumeScore: 74, interviewScore: 70, aiScore: 68, finalScore: 70.7, rec: 'Needs Review',       date: 'Jul 19, 2025' },
]

const skillsData = [
  { skill: 'Technical',        A: 85, B: 72 },
  { skill: 'Communication',   A: 78, B: 68 },
  { skill: 'Problem Solving', A: 90, B: 75 },
  { skill: 'Leadership',      A: 65, B: 80 },
  { skill: 'Teamwork',        A: 82, B: 78 },
  { skill: 'Creativity',      A: 70, B: 85 },
]

const interviewData = [
  { week: 'Week 1', completed: 12, scheduled: 18 },
  { week: 'Week 2', completed: 15, scheduled: 14 },
  { week: 'Week 3', completed: 18, scheduled: 20 },
  { week: 'Week 4', completed: 22, scheduled: 16 },
]

const scoreDistribution = [
  { range: '90–100', count: 2 },
  { range: '80–89',  count: 3 },
  { range: '70–79',  count: 4 },
  { range: '60–69',  count: 2 },
  { range: '<60',    count: 1 },
]

function RecBadge({ rec }) {
  const map = {
    'Highly Recommended': 'green',
    'Recommended':        'blue',
    'Needs Review':       'orange',
    'Not Recommended':    'red',
  }
  return <span className={`badge ${map[rec] || 'gray'}`}>{rec}</span>
}

function ScoreCell({ score }) {
  const c = score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444'
  return <span style={{ fontWeight: 700, color: c }}>{score}</span>
}

function RankMedal({ rank }) {
  const cls = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'default'
  return <div className={`rank-medal ${cls}`}>#{rank}</div>
}

function RecruiterDashboard() {
  const [search, setSearch]     = useState('')
  const [sortField, setSortField] = useState('rank')
  const [sortDir, setSortDir]   = useState('asc')
  const [page, setPage]         = useState(1)
  const PAGE_SIZE = 5

  const sidebarLinks = [
    {
      title: 'Dashboard',
      items: [
        { icon: <BarChart3 size={18} />, label: 'Overview'   },
        { icon: <Activity size={18} />,  label: 'Analytics'  },
        { icon: <FileText size={18} />,  label: 'Reports'    },
      ],
    },
    {
      title: 'Recruitment',
      items: [
        { icon: <Users size={18} />,    label: 'Candidates'  },
        { icon: <Calendar size={18} />, label: 'Interviews'  },
        { icon: <Briefcase size={18} />, label: 'Job Postings' },
      ],
    },
    {
      title: 'AI Tools',
      items: [
        { icon: <Award size={18} />,   label: 'AI Ranking'   },
        { icon: <Video size={18} />,   label: 'Mock Interview' },
        { icon: <Star size={18} />,    label: 'Assessments'  },
      ],
    },
  ]

  const stats = [
    { label: 'Total Candidates', value: '342',    trend: '+18.2%',  up: true,  icon: <Users size={22} />,    color: 'purple' },
    { label: 'Open Positions',   value: '18',     trend: '+3 new',  up: true,  icon: <Briefcase size={22} />, color: 'blue'   },
    { label: 'Interviews Done',  value: '127',    trend: '+12.5%',  up: true,  icon: <Calendar size={22} />,  color: 'green'  },
    { label: 'Average Score',    value: '7.8/10', trend: '+0.4',    up: true,  icon: <Star size={22} />,      color: 'orange' },
  ]

  const activities = [
    { text: 'Interview completed: Arjun Reddy — React Developer', color: 'green',  time: '30 min ago'  },
    { text: 'Report generated: Kavya Nair assessment',             color: 'blue',   time: '2 hours ago' },
    { text: 'New application: Sanjay Das — DevOps',                color: 'purple', time: '4 hours ago' },
    { text: 'Interview scheduled: Meera Iyer — UI/UX',            color: 'orange', time: '6 hours ago' },
  ]

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp size={12} style={{ opacity: 0.3 }} />
    return sortDir === 'asc' ? <ChevronUp size={12} style={{ color: 'var(--primary)' }} /> : <ChevronDown size={12} style={{ color: 'var(--primary)' }} />
  }

  const filtered = useMemo(() => ALL_CANDIDATES
    .filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase()) ||
      c.rec.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const va = a[sortField], vb = b[sortField]
      if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    }),
  [search, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <DashboardLayout title="Recruiter Dashboard" role="Senior Recruiter" userName="HR Manager" sidebarLinks={sidebarLinks}>

      <div className="stats-row">
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

      <div className="dashboard-grid">
        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="card-header">
            <h2>Candidate Skills Radar</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge purple">Top Candidate</span>
              <span className="badge blue">Average</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={skillsData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#64748b' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar name="Top Candidate" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
              <Radar name="Average"       dataKey="B" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.12} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
          <div className="card-header">
            <h2>Weekly Interviews</h2>
            <span className="badge green">↑ On Track</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={interviewData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="completed"  stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} name="Completed"  />
              <Line type="monotone" dataKey="scheduled"  stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} name="Scheduled"  strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 16 }}>
            <div className="card-header" style={{ marginBottom: 8 }}>
              <h2>Score Distribution</h2>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={scoreDistribution} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} name="Candidates" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.49 }}>
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

        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.56 }}>
          <div className="card-header"><h2>Quick Actions</h2></div>
          <div className="quick-actions-grid">
            <button className="quick-action-btn"><Calendar size={18} /> Schedule Interview</button>
            <button className="quick-action-btn"><Users size={18} /> View All Candidates</button>
            <button className="quick-action-btn"><FileText size={18} /> Generate Report</button>
            <button className="quick-action-btn"><Video size={18} /> Start Live Session</button>
          </div>
        </motion.div>
      </div>

      <motion.div className="card" style={{ marginBottom: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.63 }}>
        <div className="card-header">
          <h2>AI Applicant Ranking</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="badge purple">{filtered.length} candidates</span>
            <button className="btn btn-outline btn-sm"><Download size={13} /> Export</button>
          </div>
        </div>
        <div className="table-search-wrapper">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              className="table-search-bar"
              style={{ paddingLeft: 32 }}
              placeholder="Search candidates..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Auto-ranked by Final Score</span>
          </div>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th className="sortable-th" onClick={() => handleSort('name')}>
                  <div className="th-inner">Candidate <SortIcon field="name" /></div>
                </th>
                <th>Role</th>
                <th className="sortable-th" onClick={() => handleSort('resumeScore')}>
                  <div className="th-inner">Resume <SortIcon field="resumeScore" /></div>
                </th>
                <th className="sortable-th" onClick={() => handleSort('interviewScore')}>
                  <div className="th-inner">Interview <SortIcon field="interviewScore" /></div>
                </th>
                <th className="sortable-th" onClick={() => handleSort('aiScore')}>
                  <div className="th-inner">AI Score <SortIcon field="aiScore" /></div>
                </th>
                <th className="sortable-th" onClick={() => handleSort('finalScore')}>
                  <div className="th-inner">Final <SortIcon field="finalScore" /></div>
                </th>
                <th className="sortable-th" onClick={() => handleSort('rec')}>
                  <div className="th-inner">Recommendation <SortIcon field="rec" /></div>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No candidates found</td></tr>
              ) : paginated.map((c, i) => (
                <tr key={i}>
                  <td><RankMedal rank={c.rank} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="user-avatar">{c.name.charAt(0)}</div>
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.role}</td>
                  <td><ScoreCell score={c.resumeScore} /></td>
                  <td><ScoreCell score={c.interviewScore} /></td>
                  <td><ScoreCell score={c.aiScore} /></td>
                  <td>
                    <span style={{ fontWeight: 800, fontSize: 15, color: c.finalScore >= 85 ? '#10b981' : c.finalScore >= 70 ? '#f59e0b' : '#ef4444' }}>
                      {c.finalScore.toFixed(1)}
                    </span>
                  </td>
                  <td><RecBadge rec={c.rec} /></td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-sm"><Eye size={14} /></button>
                      <button className="btn btn-ghost btn-sm"><Download size={14} /></button>
                      <button className="btn btn-ghost btn-sm"><MessageSquare size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span className="pagination-info">
            Showing {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length} candidates
          </span>
          <div className="pagination-btns">
            <button className={`page-btn ${page===1?'disabled':''}`} onClick={() => setPage(p => Math.max(1,p-1))}>← Prev</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} className={`page-btn ${page===i+1?'active':''}`} onClick={() => setPage(i+1)}>{i+1}</button>
            ))}
            <button className={`page-btn ${page===totalPages?'disabled':''}`} onClick={() => setPage(p => Math.min(totalPages,p+1))}>Next →</button>
          </div>
        </div>
      </motion.div>

      <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.70 }}>
        <div className="card-header">
          <h2>Candidate Reports</h2>
          <button className="card-header-action">View All</button>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Role</th>
                <th>Final Score</th>
                <th>Date</th>
                <th>Recommendation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ALL_CANDIDATES.slice(0, 5).map((c, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="user-avatar">{c.name.charAt(0)}</div>
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.role}</td>
                  <td><ScoreCell score={c.finalScore} /></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.date}</td>
                  <td><RecBadge rec={c.rec} /></td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-outline btn-sm"><Eye size={13} /> View</button>
                      <button className="btn btn-primary btn-sm"><Download size={13} /> Download</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

    </DashboardLayout>
  )
}

export default RecruiterDashboard
