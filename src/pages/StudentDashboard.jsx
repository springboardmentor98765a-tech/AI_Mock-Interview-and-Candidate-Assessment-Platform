import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import {
  FileText, Calendar, Award, TrendingUp,
  BarChart3, Activity, Upload, Play, Download,
  Eye, Star, Target, CheckCircle, Video, Brain, Code, Zap, X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'
import { useAuth } from '../context/AuthContext'

const performanceData = [
  { interview: 'Int 1', score: 6.2 },
  { interview: 'Int 2', score: 6.8 },
  { interview: 'Int 3', score: 7.1 },
  { interview: 'Int 4', score: 7.5 },
  { interview: 'Int 5', score: 7.2 },
  { interview: 'Int 6', score: 8.1 },
  { interview: 'Int 7', score: 7.8 },
  { interview: 'Int 8', score: 8.4 },
]

const upcomingInterviews = [
  { role: 'Frontend Developer', company: 'TechCorp',    date: 'Jul 30, 2025', time: '10:00 AM', mode: 'Video Call',  status: 'Scheduled', statusColor: 'blue'   },
  { role: 'React Developer',    company: 'StartupXYZ',  date: 'Aug 3, 2025',  time: '2:00 PM',  mode: 'In-Person',   status: 'Confirmed', statusColor: 'green'  },
  { role: 'Full Stack Dev',     company: 'InnovateCo',  date: 'Aug 7, 2025',  time: '11:00 AM', mode: 'Video Call',  status: 'Pending',   statusColor: 'orange' },
  { role: 'React Native Dev',   company: 'MobileFirst', date: 'Aug 12, 2025', time: '3:00 PM',  mode: 'Phone',       status: 'Scheduled', statusColor: 'blue'   },
]

const skills = [
  { name: 'React.js',     match: 92 },
  { name: 'JavaScript',   match: 88 },
  { name: 'Node.js',      match: 75 },
  { name: 'Python',       match: 65 },
  { name: 'SQL',          match: 80 },
  { name: 'TypeScript',   match: 58 },
  { name: 'Docker',       match: 42 },
  { name: 'AWS',          match: 35 },
]

const feedbackScores = [
  { label: 'Technical',       score: 8.2 },
  { label: 'Communication',   score: 7.5 },
  { label: 'Problem Solving', score: 8.8 },
  { label: 'Confidence',      score: 7.0 },
  { label: 'Grammar',         score: 8.5 },
  { label: 'Overall',         score: 7.8 },
]

const radarData = [
  { skill: 'Technical',       score: 82 },
  { skill: 'Communication',   score: 75 },
  { skill: 'Problem Solving', score: 88 },
  { skill: 'Confidence',      score: 70 },
  { skill: 'Leadership',      score: 65 },
  { skill: 'Teamwork',        score: 80 },
]

function Toast({ msg, onClose }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 18px', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: 10, minWidth: 280, maxWidth: 400 }}>
          <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: 'var(--text-primary)', flex: 1 }}>{msg}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={15} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function getBarColor(val) {
  if (val >= 80) return '#10b981'
  if (val >= 60) return '#f59e0b'
  return '#ef4444'
}

function StudentDashboard() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const fileRef   = useRef(null)
  const [activeSection, setActiveSection] = useState('overview')
  const [toast, setToast]                 = useState('')
  const [uploadedResume, setUploadedResume] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }
  const handleSectionChange = (section) => setActiveSection(section)
  const displayName = user?.name ? user.name.split(' ')[0] : 'there'

  const handleUploadResume = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type)) { showToast('Please upload a PDF or Word document'); return }
    setUploadedResume(file.name)
    showToast(`Resume "${file.name}" uploaded successfully`)
    e.target.value = ''
  }

  const handleDownloadReport = () => {
    const text = `PERFORMANCE REPORT\n\nCandidate: ${user?.name || 'Candidate'}\nGenerated: ${new Date().toLocaleDateString()}\n\nInterview Scores:\n${performanceData.map(d => `${d.interview}: ${d.score}/10`).join('\n')}\n\nAI Feedback:\n${feedbackScores.map(f => `${f.label}: ${f.score}/10`).join('\n')}\n\nAverage Score: 7.8/10\nHighest Score: 9.2/10\nRank: #3 (Top 15%)\n\nRecommendation: Strong technical skills. Improve confidence and communication for better results.`
    const blob = new Blob([text], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'performance_report.txt'; a.click()
    URL.revokeObjectURL(url); showToast('Report downloaded')
  }

  const sidebarLinks = [
    {
      title: 'Dashboard',
      items: [
        { icon: <BarChart3 size={18} />, label: 'Overview',    section: 'overview'     },
        { icon: <Activity size={18} />,  label: 'Performance', section: 'performance'  },
        { icon: <FileText size={18} />,  label: 'Reports',     section: 'reports'      },
      ],
    },
    {
      title: 'Interviews',
      items: [
        { icon: <Calendar size={18} />, label: 'Upcoming',      section: 'upcoming'      },
        { icon: <Video size={18} />,    label: 'Mock Interview', onClick: () => navigate('/mock-interview') },
        { icon: <Brain size={18} />,    label: 'AI Feedback',   section: 'ai-feedback'  },
      ],
    },
    {
      title: 'Profile',
      items: [
        { icon: <FileText size={18} />, label: 'Resume',   section: 'resume'                  },
        { icon: <Code size={18} />,     label: 'Skills',   section: 'skills'                  },
        { icon: <Target size={18} />,   label: 'Settings', onClick: () => navigate('/settings') },
      ],
    },
  ]

  const statsRow = (
    <div className="stats-row" style={{ marginBottom: 20 }}>
      {[
        { title: 'Average Score',    value: '7.8/10', trend: '+0.6',         icon: <Star size={22} />,     color: 'purple' },
        { title: 'Highest Score',    value: '9.2/10', trend: 'Personal Best', icon: <Award size={22} />,    color: 'green'  },
        { title: 'Total Interviews', value: '8',      trend: '+2 this month', icon: <Calendar size={22} />, color: 'blue'   },
        { title: 'Current Rank',     value: '#3',     trend: 'Top 15%',       icon: <Zap size={22} />,      color: 'orange' },
      ].map((stat, i) => (
        <motion.div className="stat-card" key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
          <div className={`stat-icon ${stat.color}`}>{stat.icon}</div>
          <div className="stat-details"><h3>{stat.value}</h3><p>{stat.title}</p>
            <span className="stat-trend up"><TrendingUp size={13} /> {stat.trend}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )

  const renderSection = () => {
    switch (activeSection) {

      case 'overview':
        return (
          <>
            <motion.div className="welcome-banner" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div>
                <h1>Welcome back, {displayName}! 👋</h1>
                <p>Your next interview is in 2 days. Keep preparing!</p>
              </div>
              <Link to="/mock-interview" className="btn"><Play size={18} /> Start Mock Interview</Link>
            </motion.div>
            {statsRow}
            <div className="dashboard-grid">
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="card-header"><h2>Quick Actions</h2></div>
                <div className="quick-actions-grid">
                  <button className="quick-action-btn" onClick={() => fileRef.current?.click()}><Upload size={18} /> {uploadedResume ? 'Re-upload Resume' : 'Upload Resume'}</button>
                  <Link to="/mock-interview" className="quick-action-btn"><Play size={18} /> Mock Interview</Link>
                  <button className="quick-action-btn" onClick={() => handleSectionChange('performance')}><BarChart3 size={18} /> View Performance</button>
                  <button className="quick-action-btn" onClick={handleDownloadReport}><Download size={18} /> Download Report</button>
                </div>
                {uploadedResume && (
                  <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={14} /> {uploadedResume}
                  </div>
                )}
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <div className="card-header"><h2>Upcoming Interviews</h2></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {upcomingInterviews.slice(0, 3).map((iv, i) => (
                    <div key={i} style={{ padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--border-light)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{iv.role}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{iv.company}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{iv.date} · {iv.time} · {iv.mode}</div>
                        </div>
                        <span className={`badge ${iv.statusColor}`}>{iv.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div className="card full-width" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <div className="card-header">
                  <h2>Performance Analytics</h2>
                  <button className="card-header-action" onClick={() => handleSectionChange('performance')}>View All</button>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="interview" tick={{ fontSize: 12 }} />
                    <YAxis domain={[5, 10]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} fill="url(#scoreGrad)" dot={{ fill: '#6366f1', r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <div className="card-header"><h2>AI Feedback</h2></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  {feedbackScores.map((item, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: item.score >= 8 ? 'var(--success)' : item.score >= 7 ? 'var(--warning)' : 'var(--danger)' }}>{item.score}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 14, background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)' }}>
                  <span className="badge green" style={{ marginBottom: 8 }}>Recommended</span>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Strong technical skills. Improve confidence and communication for better results.</p>
                </div>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                <div className="card-header"><h2>Recent Activity</h2></div>
                <div className="activity-list">
                  {[
                    { text: 'Completed Mock Interview: React Developer', color: 'green',  time: '1 day ago'   },
                    { text: 'Resume updated successfully',                color: 'blue',   time: '2 days ago'  },
                    { text: 'AI Feedback received: Score 7.8/10',        color: 'purple', time: '3 days ago'  },
                    { text: 'Interview scheduled: TechCorp',             color: 'orange', time: '5 days ago'  },
                  ].map((a, i) => (
                    <div className="activity-item" key={i}>
                      <div className={`activity-dot ${a.color}`}></div>
                      <div><div className="activity-text">{a.text}</div><div className="activity-time">{a.time}</div></div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </>
        )

      case 'performance':
        return (
          <>
            {statsRow}
            <div className="dashboard-grid">
              <motion.div className="card full-width" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="card-header"><h2>Performance Over Time</h2><span className="badge blue">All Interviews</span></div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="scoreGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="interview" tick={{ fontSize: 12 }} />
                    <YAxis domain={[5, 10]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} fill="url(#scoreGrad2)" dot={{ fill: '#6366f1', r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header"><h2>Interview History</h2></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {performanceData.map((row, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < performanceData.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{row.interview}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: row.score >= 8 ? '#10b981' : row.score >= 7 ? '#f59e0b' : '#ef4444' }}>{row.score}/10</span>
                        <span className={`badge ${row.score >= 8 ? 'green' : row.score >= 7 ? 'blue' : 'orange'}`} style={{ fontSize: 11 }}>
                          {row.score >= 8 ? 'Excellent' : row.score >= 7 ? 'Good' : 'Average'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="card-header"><h2>Skill Radar</h2></div>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </>
        )

      case 'reports':
        return (
          <>
            {statsRow}
            <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="card-header"><h2>My Reports</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { title: 'Performance Report', desc: 'Full interview history and AI scores', date: 'Jul 25, 2025', type: 'TXT' },
                  { title: 'Resume Analysis',    desc: 'Skill match scores and recommendations', date: 'Jul 24, 2025', type: 'TXT' },
                  { title: 'AI Feedback',        desc: 'Detailed feedback from all mock interviews', date: 'Jul 20, 2025', type: 'TXT' },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} color="#6366f1" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{r.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{r.desc}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.date} · {r.type}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => showToast(`Viewing ${r.title}...`)}><Eye size={13} /> View</button>
                      <button className="btn btn-primary btn-sm" onClick={handleDownloadReport}><Download size={13} /> Download</button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )

      case 'upcoming':
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <div><h2>Upcoming Interviews</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Your scheduled and confirmed interviews</p></div>
              <span className="badge blue">{upcomingInterviews.length} interviews</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {upcomingInterviews.map((iv, i) => (
                <div key={i} style={{ padding: '20px 0', borderBottom: i < upcomingInterviews.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{iv.role}</div>
                      <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{iv.company}</div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> {iv.date}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🕐 {iv.time}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📍 {iv.mode}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <span className={`badge ${iv.statusColor}`}>{iv.status}</span>
                      <button className="btn btn-outline btn-sm" onClick={() => showToast(`Viewing details for ${iv.role} at ${iv.company}`)}><Eye size={13} /> Details</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: 16, background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>Prepare for your upcoming interviews with an AI-powered mock session.</p>
              <Link to="/mock-interview" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Play size={16} /> Start Mock Interview</Link>
            </div>
          </motion.div>
        )

      case 'ai-feedback':
        return (
          <>
            {statsRow}
            <div className="dashboard-grid">
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="card-header"><h2>AI Feedback Scores</h2><span className="badge green">Latest Interview</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                  {feedbackScores.map((item, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '16px 8px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: item.score >= 8 ? 'var(--success)' : item.score >= 7 ? 'var(--warning)' : 'var(--danger)' }}>{item.score}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{item.label}</div>
                      <div className="progress-bar-container" style={{ marginTop: 8 }}>
                        <div className="progress-bar-fill" style={{ width: `${item.score * 10}%`, background: item.score >= 8 ? '#10b981' : item.score >= 7 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 16, background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)', marginBottom: 14 }}>
                  <span className="badge green" style={{ marginBottom: 8 }}>Recommended</span>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Strong technical skills. Improve confidence and communication for better results. Focus on mock interviews to gain confidence.</p>
                </div>
                <Link to="/mock-interview" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Play size={16} /> Practice Now</Link>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header"><h2>Improvement Areas</h2></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { area: 'Communication',    tip: 'Practice speaking clearly and concisely. Use the STAR method for answers.', priority: 'High',   color: 'red'    },
                    { area: 'Confidence',       tip: 'Work on body language and eye contact. More mock interviews recommended.',   priority: 'High',   color: 'orange' },
                    { area: 'Problem Solving',  tip: 'Great score! Continue practicing algorithmic thinking.',                    priority: 'Low',    color: 'green'  },
                    { area: 'Technical',        tip: 'Solid foundation. Consider deepening knowledge in cloud and DevOps.',        priority: 'Medium', color: 'blue'   },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{item.area}</span>
                        <span className={`badge ${item.color}`} style={{ fontSize: 11 }}>{item.priority}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.tip}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </>
        )

      case 'resume':
        return (
          <>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleUploadResume} />
            <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="card-header">
                <div><h2>Resume Analysis</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>AI-powered skill match and gap analysis</p></div>
                <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}><Upload size={14} /> {uploadedResume ? 'Update Resume' : 'Upload Resume'}</button>
              </div>
              {uploadedResume && (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} /> Currently uploaded: {uploadedResume}
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Overall Resume Match</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>78%</span>
                </div>
                <div className="progress-bar-container" style={{ height: 10 }}>
                  <div className="progress-bar-fill" style={{ width: '78%', background: '#f59e0b' }}></div>
                </div>
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>Skill Match Scores</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {skills.map((skill, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, minWidth: 110, color: 'var(--text-secondary)' }}>{skill.name}</span>
                    <div className="progress-bar-container" style={{ flex: 1 }}>
                      <div className="progress-bar-fill" style={{ width: `${skill.match}%`, background: getBarColor(skill.match) }}></div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: 'right', color: getBarColor(skill.match) }}>{skill.match}%</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Missing Skills</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Docker', 'AWS', 'TypeScript', 'Kubernetes'].map(s => <span key={s} className="badge red" style={{ fontSize: 11 }}>{s}</span>)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Strengths</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Component Architecture', 'State Management', 'API Integration', 'React'].map(s => <span key={s} className="badge green" style={{ fontSize: 11 }}>{s}</span>)}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )

      case 'skills':
        return (
          <>
            {statsRow}
            <div className="dashboard-grid">
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="card-header"><h2>Skill Breakdown</h2><span className="badge blue">All Skills</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {skills.map((skill, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{skill.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: getBarColor(skill.match) }}>{skill.match}%</span>
                          <span className={`badge ${skill.match >= 80 ? 'green' : skill.match >= 60 ? 'blue' : 'orange'}`} style={{ fontSize: 11 }}>
                            {skill.match >= 80 ? 'Expert' : skill.match >= 60 ? 'Proficient' : 'Learning'}
                          </span>
                        </div>
                      </div>
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${skill.match}%`, background: getBarColor(skill.match) }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header"><h2>Skill Radar</h2></div>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Your Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </motion.div>
              <motion.div className="card full-width" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="card-header"><h2>Recommended Learning Path</h2></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  {[
                    { skill: 'TypeScript', level: 'Intermediate', priority: 'High',   color: '#6366f1' },
                    { skill: 'Docker',     level: 'Beginner',     priority: 'High',   color: '#0ea5e9' },
                    { skill: 'AWS',        level: 'Beginner',     priority: 'Medium', color: '#f59e0b' },
                    { skill: 'GraphQL',    level: 'Beginner',     priority: 'Low',    color: '#10b981' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: `2px solid ${item.color}20` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600 }}>{item.skill}</span>
                        <span className={`badge ${item.priority === 'High' ? 'red' : item.priority === 'Medium' ? 'orange' : 'gray'}`} style={{ fontSize: 11 }}>{item.priority}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Target: {item.level}</div>
                      <button className="btn btn-outline btn-sm" style={{ marginTop: 10, width: '100%' }} onClick={() => showToast(`Opening ${item.skill} learning resources...`)}>
                        Start Learning
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </>
        )

      default: return null
    }
  }

  return (
    <DashboardLayout
      title="Candidate Dashboard" role="Candidate" userName={user?.name || 'Hemanth M'}
      sidebarLinks={sidebarLinks} activeSection={activeSection} onSectionChange={handleSectionChange}
    >
      <Toast msg={toast} onClose={() => setToast('')} />
      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleUploadResume} />
      {renderSection()}
    </DashboardLayout>
  )
}

export default StudentDashboard
