import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import interviewApi from '../services/interviewApi'
import recordingApi from '../services/recordingApi'
import {
  FileText, Calendar, Award, TrendingUp,
  BarChart3, Activity, Upload, Play, Download,
  Eye, Star, Target, CheckCircle, Video, Brain, Code, Zap, X, ChevronRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'
import { useAuth } from '../context/AuthContext'

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

function fmtDur(s) {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}m ${ss}s`
}

function scoreColor(s) {
  if (s >= 80) return '#10b981'
  if (s >= 60) return '#f59e0b'
  return '#ef4444'
}

function StudentDashboard() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const fileRef   = useRef(null)
  const [activeSection, setActiveSection] = useState('overview')
  const [toast, setToast]                 = useState('')
  const [uploadedResume, setUploadedResume] = useState(null)

  // Real AI interview history and stats
  const [interviewHistory, setInterviewHistory] = useState([])
  const [interviewHistoryLoading, setInterviewHistoryLoading] = useState(false)
  const [interviewStats, setInterviewStats]     = useState(null)
  const [detailModalOpen, setDetailModalOpen]   = useState(false)
  const [detailLoading, setDetailLoading]       = useState(false)
  const [detailData, setDetailData]             = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }
  const handleSectionChange = (section) => setActiveSection(section)
  const displayName = user?.name ? user.name.split(' ')[0] : 'there'

  useEffect(() => {
    let isCancelled = false
    async function loadInterviewData() {
      setInterviewHistoryLoading(true)
      try {
        const [histRes, statsRes] = await Promise.allSettled([
          interviewApi.getHistory(),
          interviewApi.getStats(),
        ])
        if (!isCancelled) {
          if (histRes.status === 'fulfilled' && histRes.value?.history) {
            setInterviewHistory(histRes.value.history)
          }
          if (statsRes.status === 'fulfilled' && statsRes.value?.stats) {
            setInterviewStats(statsRes.value.stats)
          }
        }
      } catch (err) {
        console.error('Failed to load candidate interview history:', err)
      } finally {
        if (!isCancelled) setInterviewHistoryLoading(false)
      }
    }
    loadInterviewData()
    return () => { isCancelled = true }
  }, [])

  async function openInterviewDetail(id) {
    setDetailModalOpen(true)
    setDetailLoading(true)
    setDetailData(null)
    try {
      const res = await interviewApi.getById(id)
      setDetailData(res)
    } catch (err) {
      setDetailData({ error: err.message })
    } finally {
      setDetailLoading(false)
    }
  }

  const handleUploadResume = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type)) { showToast('Please upload a PDF or Word document'); return }
    setUploadedResume(file.name)
    showToast(`Resume "${file.name}" uploaded successfully`)
    e.target.value = ''
  }

  // Performance data computed from real interview history
  const performanceData = useMemo(() => {
    if (interviewHistory.length === 0) return []
    return [...interviewHistory].reverse().map((iv, i) => ({
      interview: `Int ${i + 1}`,
      score: iv.score != null ? Number((iv.score / 10).toFixed(1)) : 0,
      rawScore: iv.score || 0,
      role: iv.selected_role,
      date: iv.completed_at ? new Date(iv.completed_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '',
    }))
  }, [interviewHistory])

  // Feedback scores from latest interview
  const latestInterview = interviewHistory[0] || null
  const feedbackScores = useMemo(() => {
    if (!latestInterview) {
      return [
        { label: 'Technical',       score: 0 },
        { label: 'Communication',   score: 0 },
        { label: 'Problem Solving', score: 0 },
        { label: 'Confidence',      score: 0 },
        { label: 'Grammar',         score: 0 },
        { label: 'Overall',         score: 0 },
      ]
    }
    const cat = latestInterview.category_scores || {}
    const overall = latestInterview.score != null ? Number((latestInterview.score / 10).toFixed(1)) : 0
    return [
      { label: 'Technical',       score: cat.technical ? Number((cat.technical / 10).toFixed(1)) : overall },
      { label: 'Communication',   score: cat.communication ? Number((cat.communication / 10).toFixed(1)) : overall },
      { label: 'Problem Solving', score: cat.problem_solving ? Number((cat.problem_solving / 10).toFixed(1)) : overall },
      { label: 'Confidence',      score: cat.confidence ? Number((cat.confidence / 10).toFixed(1)) : overall },
      { label: 'Grammar',         score: cat.grammar ? Number((cat.grammar / 10).toFixed(1)) : overall },
      { label: 'Overall',         score: overall },
    ]
  }, [latestInterview])

  const radarData = useMemo(() => {
    return feedbackScores.filter(f => f.label !== 'Overall').map(f => ({
      skill: f.label,
      score: Math.round(f.score * 10),
    }))
  }, [feedbackScores])

  const handleDownloadReport = () => {
    const scoresStr = performanceData.length > 0
      ? performanceData.map(d => `${d.interview} (${d.role}): ${d.score}/10`).join('\n')
      : 'No completed interviews yet.'
    const text = `PERFORMANCE REPORT\n\nCandidate: ${user?.name || 'Candidate'}\nGenerated: ${new Date().toLocaleDateString()}\n\nInterview History:\n${scoresStr}\n\nLatest AI Feedback:\n${feedbackScores.map(f => `${f.label}: ${f.score}/10`).join('\n')}\n\nAverage Score: ${interviewStats?.avgScore ? `${(interviewStats.avgScore / 10).toFixed(1)}/10` : '—'}\nHighest Score: ${interviewStats?.highestScore ? `${(interviewStats.highestScore / 10).toFixed(1)}/10` : '—'}\nCompleted Interviews: ${interviewHistory.length}\n\nAI Summary:\n${latestInterview?.overall_feedback || 'Complete mock interviews to receive comprehensive AI recommendations.'}`
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
        { icon: <Award size={18} />,    label: 'Past AI Interviews', section: 'past-interviews' },
        { icon: <Calendar size={18} />, label: 'Upcoming',      section: 'upcoming'      },
        { icon: <Video size={18} />,    label: 'Mock Interview', onClick: () => navigate('/mock-interview') },
        { icon: <Brain size={18} />,    label: 'AI Feedback',   section: 'ai-feedback'  },
      ],
    },
    {
      title: 'Profile',
      items: [
        { icon: <FileText size={18} />, label: 'Resume',   onClick: () => navigate('/resume-analysis') },
        { icon: <Code size={18} />,     label: 'Skills',   section: 'skills'                  },
        { icon: <Target size={18} />,   label: 'Settings', onClick: () => navigate('/settings') },
      ],
    },
  ]

  const avgVal = interviewStats?.avgScore ? `${(interviewStats.avgScore / 10).toFixed(1)}/10` : (interviewHistory.length > 0 ? `${(interviewHistory.reduce((a,c) => a + (c.score||0), 0) / (interviewHistory.length * 10)).toFixed(1)}/10` : '—')
  const highVal = interviewStats?.highestScore ? `${(interviewStats.highestScore / 10).toFixed(1)}/10` : (interviewHistory.length > 0 ? `${(Math.max(...interviewHistory.map(c => c.score||0)) / 10).toFixed(1)}/10` : '—')
  const countVal = String(interviewStats?.completedInterviews ?? interviewHistory.length)

  const statsRow = (
    <div className="stats-row" style={{ marginBottom: 20 }}>
      {[
        { title: 'Average Score',    value: avgVal,   trend: interviewHistory.length > 0 ? 'AI Evaluated' : 'No data', icon: <Star size={22} />,     color: 'purple' },
        { title: 'Highest Score',    value: highVal,  trend: interviewHistory.length > 0 ? 'Personal Best' : 'No data', icon: <Award size={22} />,    color: 'green'  },
        { title: 'Total Interviews', value: countVal, trend: `${countVal} completed`, icon: <Calendar size={22} />, color: 'blue'   },
        { title: 'Status',           value: interviewHistory.length > 0 ? 'Active' : 'Ready', trend: 'Mock Prep',       icon: <Zap size={22} />,      color: 'orange' },
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

  const renderPastInterviewsTable = () => (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>Role</th>
            <th>Type</th>
            <th>Difficulty</th>
            <th>Score</th>
            <th>Duration</th>
            <th>Date</th>
            <th>Recommendation</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {interviewHistory.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
                You have not completed any AI mock interviews yet.
                <div style={{ marginTop: 12 }}>
                  <Link to="/mock-interview" className="btn btn-primary btn-sm">Start Your First Interview</Link>
                </div>
              </td>
            </tr>
          ) : (
            interviewHistory.map((iv) => (
              <tr key={iv.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{iv.selected_role}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{iv.questions_answered || 0} / {iv.question_count} questions</div>
                </td>
                <td><span className="badge purple" style={{ fontSize: 11 }}>{iv.interview_type}</span></td>
                <td><span className="badge gray" style={{ fontSize: 11 }}>{iv.difficulty}</span></td>
                <td>
                  {iv.score != null ? (
                    <span style={{ fontWeight: 800, fontSize: 14, color: scoreColor(iv.score) }}>
                      {iv.score}/100
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDur(iv.duration)}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {iv.completed_at ? new Date(iv.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td>
                  <span className={`badge ${iv.hire_recommendation === 'Highly Recommended' ? 'green' : iv.hire_recommendation === 'Recommended' ? 'blue' : iv.hire_recommendation === 'Consider' ? 'orange' : 'gray'}`}>
                    {iv.hire_recommendation || 'Evaluated'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => openInterviewDetail(iv.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Eye size={13} /> View Details {iv.recording_count > 0 && <Video size={12} style={{ color: 'var(--primary)', marginLeft: 2 }} />}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
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
                <p>{interviewHistory.length > 0 ? `You have completed ${interviewHistory.length} AI mock interviews. Keep sharpening your skills!` : 'Start your first AI mock interview to receive real-time speech evaluation and personalized feedback.'}</p>
              </div>
              <Link to="/mock-interview" className="btn"><Play size={18} /> Start Mock Interview</Link>
            </motion.div>
            {statsRow}
            <div className="dashboard-grid">
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="card-header"><h2>Quick Actions</h2></div>
                <div className="quick-actions-grid">
                  <button className="quick-action-btn" onClick={() => navigate('/resume-analysis')}><Upload size={18} /> Upload Resume</button>
                  <Link to="/mock-interview" className="quick-action-btn"><Play size={18} /> Mock Interview</Link>
                  <button className="quick-action-btn" onClick={() => handleSectionChange('past-interviews')}><Award size={18} /> Past Interviews</button>
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
                  <h2>Past AI Interviews</h2>
                  <button className="card-header-action" onClick={() => handleSectionChange('past-interviews')}>View All ({interviewHistory.length})</button>
                </div>
                {renderPastInterviewsTable()}
              </motion.div>

              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <div className="card-header"><h2>AI Feedback Summary</h2></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  {feedbackScores.map((item, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: item.score >= 8 ? 'var(--success)' : item.score >= 7 ? 'var(--warning)' : 'var(--danger)' }}>{item.score > 0 ? item.score : '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 14, background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)' }}>
                  <span className="badge green" style={{ marginBottom: 8 }}>{latestInterview?.hire_recommendation || 'Ready for Practice'}</span>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {latestInterview?.overall_feedback || 'Complete your AI mock interview to generate personalized strengths, weaknesses, and scoring breakdown.'}
                  </p>
                </div>
              </motion.div>

              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                <div className="card-header"><h2>Recent Activity</h2></div>
                <div className="activity-list">
                  {interviewHistory.length > 0 ? (
                    interviewHistory.slice(0, 4).map((iv, i) => (
                      <div className="activity-item" key={i}>
                        <div className={`activity-dot ${iv.score >= 80 ? 'green' : iv.score >= 60 ? 'blue' : 'orange'}`} />
                        <div>
                          <div className="activity-text">Completed Mock Interview: {iv.selected_role} ({iv.score != null ? `${iv.score}/100` : 'Evaluated'})</div>
                          <div className="activity-time">{iv.completed_at ? new Date(iv.completed_at).toLocaleDateString('en-IN') : 'Recently'}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No recent activity. Start a mock interview to get started.</div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )

      case 'past-interviews':
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <div>
                <h2>Past AI Mock Interviews</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Review all your completed interviews, evaluation breakdowns, and recordings</p>
              </div>
              <Link to="/mock-interview" className="btn btn-primary btn-sm"><Play size={14} /> Practice New</Link>
            </div>
            {renderPastInterviewsTable()}
          </motion.div>
        )

      case 'performance':
        return (
          <>
            {statsRow}
            <div className="dashboard-grid">
              <motion.div className="card full-width" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="card-header"><h2>Performance Over Time</h2><span className="badge blue">All Interviews</span></div>
                {performanceData.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No interview data yet. Take a mock interview to see your progress curve.
                  </div>
                ) : (
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
                      <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} fill="url(#scoreGrad2)" dot={{ fill: '#6366f1', r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header"><h2>Interview History Summary</h2></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {interviewHistory.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No past interviews found.</div>
                  ) : (
                    interviewHistory.map((row, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < interviewHistory.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{row.selected_role}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.completed_at ? new Date(row.completed_at).toLocaleDateString('en-IN') : ''}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(row.score) }}>{row.score != null ? `${row.score}/100` : '—'}</span>
                          <button className="btn btn-ghost btn-sm" onClick={() => openInterviewDetail(row.id)}>
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
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
                  { title: 'AI Performance Evaluation', desc: 'Full interview history, questions, answers, and scores', date: latestInterview ? new Date(latestInterview.completed_at).toLocaleDateString('en-IN') : 'Recent', type: 'TXT' },
                  { title: 'Resume Skill Gap Analysis',    desc: 'Skill match scores and role recommendations', date: 'Active', type: 'TXT' },
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
                      <button className="btn btn-outline btn-sm" onClick={() => { if (latestInterview) openInterviewDetail(latestInterview.id); else showToast('No interview reports yet') }}><Eye size={13} /> View</button>
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
                      <button className="btn btn-outline btn-sm" onClick={() => showToast(`Interview details: ${iv.role} at ${iv.company}`)}><Eye size={13} /> Details</button>
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
                <div className="card-header"><h2>AI Feedback Scores</h2><span className="badge green">{latestInterview ? 'Latest Interview' : 'Practice Ready'}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                  {feedbackScores.map((item, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '16px 8px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: item.score >= 8 ? 'var(--success)' : item.score >= 7 ? 'var(--warning)' : 'var(--danger)' }}>{item.score > 0 ? item.score : '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{item.label}</div>
                      <div className="progress-bar-container" style={{ marginTop: 8 }}>
                        <div className="progress-bar-fill" style={{ width: `${item.score * 10}%`, background: item.score >= 8 ? '#10b981' : item.score >= 7 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 16, background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)', marginBottom: 14 }}>
                  <span className="badge green" style={{ marginBottom: 8 }}>{latestInterview?.hire_recommendation || 'Practice Mode'}</span>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {latestInterview?.overall_feedback || 'Complete an AI mock interview to generate comprehensive feedback on your answers and communication.'}
                  </p>
                </div>
                <Link to="/mock-interview" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Play size={16} /> Practice Now</Link>
              </motion.div>

              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header"><h2>Improvement Areas</h2></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {latestInterview && Array.isArray(latestInterview.weaknesses) && latestInterview.weaknesses.length > 0 ? (
                    latestInterview.weaknesses.map((item, i) => (
                      <div key={i} style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>Key Area #{i + 1}</span>
                          <span className="badge orange" style={{ fontSize: 11 }}>Improvement</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{item}</p>
                      </div>
                    ))
                  ) : (
                    [
                      { area: 'Communication',    tip: 'Practice speaking clearly and concisely. Structure answers with context, action, and results.', priority: 'High',   color: 'red'    },
                      { area: 'Confidence',       tip: 'Maintain steady pacing and avoid filler phrases. Real-time mock sessions build confidence.',   priority: 'High',   color: 'orange' },
                      { area: 'Technical Detail', tip: 'Provide concrete examples and trade-offs when discussing architectures and algorithms.',        priority: 'Medium', color: 'blue'   },
                    ].map((item, i) => (
                      <div key={i} style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{item.area}</span>
                          <span className={`badge ${item.color}`} style={{ fontSize: 11 }}>{item.priority}</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.tip}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
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
            </div>
          </>
        )

      default: return null
    }
  }

  return (
    <DashboardLayout
      title="Candidate Dashboard" role="Candidate" userName={user?.name || 'Candidate'}
      sidebarLinks={sidebarLinks} activeSection={activeSection} onSectionChange={handleSectionChange}
    >
      <Toast msg={toast} onClose={() => setToast('')} />
      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleUploadResume} />
      {renderSection()}

      {/* Candidate Interview Detail & Video Player Modal */}
      {detailModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setDetailModalOpen(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 780, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>AI Mock Interview Evaluation</h2>
              <button onClick={() => setDetailModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>
            </div>

            {detailLoading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading interview evaluation…</div>}
            {detailData?.error && <div style={{ color: '#ef4444', fontSize: 13 }}>Error: {detailData.error}</div>}

            {detailData && !detailData.error && (() => {
              // Helper: safely format a speech analysis metric (never shows 0 as substitute)
              const fmtSA = (val, suffix = '') => {
                if (val === null || val === undefined) return 'Not available'
                if (val === 'insufficient_audio' || val === 'insufficient_data') return 'Insufficient audio'
                if (typeof val === 'number') return `${val}${suffix}`
                return String(val)
              }

              const cs = detailData.interview.categoryScores || {}
              const sas = cs.speech_analysis_summary || null

              // Per-question speech panel
              const renderQuestionSpeech = (sa) => {
                if (!sa) return null
                const metrics = [
                  ['WPM',           fmtSA(sa.words_per_minute) + (sa.pace_label && sa.pace_label !== 'insufficient_data' ? ` (${sa.pace_label})` : '')],
                  ['Fillers',       sa.filler_count != null ? `${sa.filler_count} (${fmtSA(sa.filler_rate, '%')})` : 'Not available'],
                  ['Grammar',       fmtSA(sa.grammar_score, '/100')],
                  ['Clarity',       fmtSA(sa.speech_clarity_score, '/100')],
                  ['Completeness',  fmtSA(sa.response_completeness_score, '/100')],
                  ['Pronunciation', sa.pronunciation_score === 'insufficient_audio' ? 'Insufficient audio' : fmtSA(sa.pronunciation_score, '/100')],
                ]
                return (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(99,102,241,0.06)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Speech Analysis
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {metrics.map(([label, val]) => (
                        <div key={label}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: val === 'Not available' || val === 'Insufficient audio' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {sa.communication_score != null && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                        Communication score: <strong style={{ color: scoreColor(sa.communication_score) }}>{sa.communication_score}/100</strong>
                        {sa.intelligibility_note && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>({sa.intelligibility_note})</span>
                        )}
                      </div>
                    )}
                    {Array.isArray(sa.strengths) && sa.strengths.length > 0 && (
                      <div style={{ marginTop: 6, fontSize: 11, color: '#10b981' }}>✓ {sa.strengths.join(' · ')}</div>
                    )}
                    {Array.isArray(sa.weaknesses) && sa.weaknesses.length > 0 && (
                      <div style={{ fontSize: 11, color: '#f59e0b' }}>⚠ {sa.weaknesses.join(' · ')}</div>
                    )}
                    {Array.isArray(sa.suggestions) && sa.suggestions.length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>💡 {sa.suggestions.join(' · ')}</div>
                    )}
                  </div>
                )
              }

              return (
                <>
                  {/* Header Information */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                    {[
                      ['Target Role',    detailData.interview.selectedRole],
                      ['Interview Type', detailData.interview.interviewType],
                      ['Difficulty',     detailData.interview.difficulty],
                      ['Score',          detailData.interview.score != null ? `${detailData.interview.score}/100` : '—'],
                      ['Duration',       fmtDur(detailData.interview.duration)],
                      ['Questions',      `${detailData.interview.questionsAnswered} / ${detailData.interview.questionCount} answered`],
                      ['Completed',      detailData.interview.completedAt ? new Date(detailData.interview.completedAt).toLocaleString('en-IN') : '—'],
                      ['Recommendation', detailData.interview.hireRecommendation || 'Evaluated'],
                    ].map(([k,v]) => (
                      <div key={k} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border-light)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{k}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Score Breakdown */}
                  {(cs.communication != null || cs.technical != null || cs.confidence != null) && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--text-primary)' }}>Score Breakdown</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        {[
                          ['Communication (30%)',     cs.communication  != null ? `${cs.communication}/100`  : '—'],
                          ['Technical Relevance (30%)', cs.technical    != null ? `${cs.technical}/100`      : '—'],
                          ['Confidence (25%)',        cs.confidence     != null ? `${cs.confidence}/100`     : '—'],
                          ['Professionalism (15%)',   cs.professionalism != null ? `${cs.professionalism}/100` : (cs.grammar != null ? `${cs.grammar}/100` : '—')],
                        ].map(([label, val]) => (
                          <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border-light)' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{val}</div>
                          </div>
                        ))}
                      </div>

                      {/* Aggregate Speech Metrics */}
                      {sas && (
                        <>
                          <div style={{ fontWeight: 700, fontSize: 13, margin: '12px 0 8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Activity size={14} style={{ color: 'var(--primary)' }} /> Your Speech & Communication
                            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(from real audio analysis)</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                            {[
                              ['Speaking Pace',    sas.avg_words_per_minute != null ? `${sas.avg_words_per_minute} WPM (${sas.dominant_pace || '—'})` : 'Not available'],
                              ['Grammar Score',    sas.avg_grammar_score    != null ? `${sas.avg_grammar_score}/100` : 'Not available'],
                              ['Filler Rate',      sas.avg_filler_rate      != null ? `${sas.avg_filler_rate}%`      : 'Not available'],
                              ['Communication',    sas.avg_communication_score != null ? `${sas.avg_communication_score}/100` : 'Not available'],
                            ].map(([label, val]) => (
                              <div key={label} style={{ background: 'rgba(99,102,241,0.06)', borderRadius: 8, padding: '10px 14px', border: '1px solid rgba(99,102,241,0.15)' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{label}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: val === 'Not available' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{val}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                            Based on {sas.answers_analysed ?? 0} of {sas.total_answers ?? '?'} answers with audio data
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Video Recording Player */}
                  {detailData.recordings && detailData.recordings.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Video size={16} style={{ color: 'var(--primary)' }} /> Your Interview Video Recording
                      </div>
                      <div style={{ background: '#0f172a', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <video
                          src={recordingApi.getStreamUrl(detailData.recordings[0].id)}
                          controls
                          playsInline
                          style={{ width: '100%', maxHeight: 320, display: 'block' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Overall AI Feedback */}
                  {detailData.interview.overallFeedback && (
                    <div style={{ background: 'var(--primary-bg)', borderRadius: 8, padding: 14, marginBottom: 16, border: '1px solid rgba(99,102,241,0.2)' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)', marginBottom: 4 }}>AI Overall Assessment</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{detailData.interview.overallFeedback}</div>
                    </div>
                  )}

                  {/* Strengths & Weaknesses */}
                  {((detailData.interview.strengths && detailData.interview.strengths.length > 0) || (detailData.interview.weaknesses && detailData.interview.weaknesses.length > 0)) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                      {detailData.interview.strengths && Array.isArray(detailData.interview.strengths) && detailData.interview.strengths.length > 0 && (
                        <div style={{ background: 'var(--success-bg)', borderRadius: 8, padding: 12, border: '1px solid rgba(16,185,129,0.2)' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', marginBottom: 6 }}>Key Strengths</div>
                          <ul style={{ paddingLeft: 16, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, listStyleType: 'disc' }}>
                            {detailData.interview.strengths.map((s, idx) => (
                              <li key={idx}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {detailData.interview.weaknesses && Array.isArray(detailData.interview.weaknesses) && detailData.interview.weaknesses.length > 0 && (
                        <div style={{ background: 'var(--warning-bg)', borderRadius: 8, padding: 12, border: '1px solid rgba(245,158,11,0.2)' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning)', marginBottom: 6 }}>Areas to Improve</div>
                          <ul style={{ paddingLeft: 16, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, listStyleType: 'disc' }}>
                            {detailData.interview.weaknesses.map((w, idx) => (
                              <li key={idx}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recommendations */}
                  {detailData.interview.recommendations && Array.isArray(detailData.interview.recommendations) && detailData.interview.recommendations.length > 0 && (
                    <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 12, marginBottom: 16, border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 6 }}>Improvement Suggestions</div>
                      <ul style={{ paddingLeft: 16, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, listStyleType: 'disc' }}>
                        {detailData.interview.recommendations.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Per-Question QA Breakdown */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--text-primary)' }}>Questions & Transcribed Answers</div>
                    {detailData.questions && detailData.questions.map((q, qi) => (
                      <div key={q.id} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '12px 16px', marginBottom: 10, border: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Q{qi + 1} · {q.category || 'General'}</span>
                          {q.score != null && <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(q.score) }}>{q.score}/100</span>}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.5 }}>{q.question}</div>
                        {q.answer ? (
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>"{q.answer}"</div>
                        ) : (
                          <div style={{ fontSize: 12, color: '#ef4444' }}>No answer recorded</div>
                        )}
                        {q.feedback && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5, borderTop: '1px solid var(--border-light)', paddingTop: 6 }}>{q.feedback}</div>
                        )}
                        {renderQuestionSpeech(q.speechAnalysis)}
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </motion.div>
        </div>
      )}

    </DashboardLayout>
  )
}

export default StudentDashboard
