import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import interviewApi from '../services/interviewApi'
import recordingApi from '../services/recordingApi'
import analyticsApi from '../services/analyticsApi'
import scheduleApi  from '../services/scheduleApi'
import reportApi    from '../services/reportApi'
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

// NOTE: The old hardcoded `skills` array with fake percentages has been removed.
// Resume skills are now loaded from /api/analytics/candidate (resumeSkills).

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

  // Module 8: real analytics from /api/analytics/candidate
  const [analytics, setAnalytics]               = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError]     = useState('')

  // Module 9 Chunk 2: real scheduled interviews from /api/schedules
  const [schedules,        setSchedules]        = useState([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [schedulesError,   setSchedulesError]   = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }
  const handleSectionChange = (section) => setActiveSection(section)
  const displayName = user?.name ? user.name.split(' ')[0] : 'there'

  useEffect(() => {
    let isCancelled = false
    async function loadInterviewData() {
      setInterviewHistoryLoading(true)
      setAnalyticsLoading(true)
      setSchedulesLoading(true)
      try {
        const [histRes, statsRes, analyticsRes, schedRes] = await Promise.allSettled([
          interviewApi.getHistory(),
          interviewApi.getStats(),
          analyticsApi.getCandidateAnalytics(),
          scheduleApi.getSchedules({ limit: 50 }),
        ])
        if (!isCancelled) {
          if (histRes.status === 'fulfilled' && histRes.value?.history) {
            setInterviewHistory(histRes.value.history)
          }
          if (statsRes.status === 'fulfilled' && statsRes.value?.stats) {
            setInterviewStats(statsRes.value.stats)
          }
          if (analyticsRes.status === 'fulfilled' && analyticsRes.value?.success) {
            setAnalytics(analyticsRes.value)
          } else if (analyticsRes.status === 'rejected') {
            setAnalyticsError(analyticsRes.reason?.message || 'Analytics unavailable')
          }
          if (schedRes.status === 'fulfilled' && Array.isArray(schedRes.value?.schedules)) {
            setSchedules(schedRes.value.schedules)
          } else if (schedRes.status === 'rejected') {
            setSchedulesError(schedRes.reason?.message || 'Could not load schedules')
          }
        }
      } catch (err) {
        console.error('Failed to load candidate dashboard data:', err)
      } finally {
        if (!isCancelled) {
          setInterviewHistoryLoading(false)
          setAnalyticsLoading(false)
          setSchedulesLoading(false)
        }
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

  // Module 8: real chronological trend data from analytics API (canonical 0–100, no /10)
  const performanceData = useMemo(() => {
    if (analytics?.trends && analytics.trends.length > 0) {
      return analytics.trends.map(t => ({
        interview: `Int ${t.interviewIndex}`,
        score: t.overallScore ?? null,
        communication: t.communication ?? null,
        confidence: t.confidence ?? null,
        technicalRelevance: t.technicalRelevance ?? null,
        professionalism: t.professionalism ?? null,
        role: t.role,
        date: t.completedAt ? new Date(t.completedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '',
        performanceRating: t.performanceRating,
      }))
    }
    // Fallback: derive from history if analytics not yet loaded (avoids blank flash)
    if (interviewHistory.length === 0) return []
    return [...interviewHistory].slice().reverse().map((iv, i) => ({
      interview: `Int ${i + 1}`,
      score: iv.score ?? null,          // canonical 0–100, no division
      communication: null,
      confidence: null,
      technicalRelevance: null,
      professionalism: null,
      role: iv.selected_role,
      date: iv.completed_at ? new Date(iv.completed_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '',
      performanceRating: iv.performance_rating || null,
    }))
  }, [analytics, interviewHistory])

  // Module 8: Module 7 category averages from analytics for the radar and feedback grid
  // These are canonical 0–100 scores — NOT legacy /10 values.
  const latestInterview = interviewHistory[0] || null

  // Canonical Module 7 category scores (from analytics averages, or latest interview M7)
  const m7CategoryAverages = analytics?.categoryAverages || null

  // For the AI Feedback section: use latest interview module7_scores for single-interview detail
  const feedbackScores = useMemo(() => {
    const cat = latestInterview?.category_scores || {}
    const m7s = cat.module7_scores || null
    if (!latestInterview || !m7s) {
      // No data — return null-safe empty set with labels only
      return [
        { label: 'Communication',      score: null, pct: '30%' },
        { label: 'Confidence',         score: null, pct: '25%' },
        { label: 'Tech. Relevance',    score: null, pct: '30%' },
        { label: 'Professionalism',    score: null, pct: '15%' },
        { label: 'Overall',            score: null, pct: ''    },
      ]
    }
    return [
      { label: 'Communication',      score: m7s.communication?.score      ?? null, pct: '30%' },
      { label: 'Confidence',         score: m7s.confidence?.score         ?? null, pct: '25%' },
      { label: 'Tech. Relevance',    score: m7s.technicalRelevance?.score ?? null, pct: '30%' },
      { label: 'Professionalism',    score: m7s.professionalism?.score    ?? null, pct: '15%' },
      { label: 'Overall',            score: m7s.overallScore              ?? latestInterview.score ?? null, pct: '' },
    ]
  }, [latestInterview])

  // Radar: Module 7 categories using analytics AVERAGES (across all interviews) when available,
  // else falls back to latest interview M7 scores. All values are 0-100.
  const radarData = useMemo(() => {
    const src = m7CategoryAverages || {
      communication:      feedbackScores.find(f => f.label === 'Communication')?.score,
      confidence:         feedbackScores.find(f => f.label === 'Confidence')?.score,
      technicalRelevance: feedbackScores.find(f => f.label === 'Tech. Relevance')?.score,
      professionalism:    feedbackScores.find(f => f.label === 'Professionalism')?.score,
    }
    return [
      { skill: 'Communication',   score: src.communication      ?? 0 },
      { skill: 'Confidence',      score: src.confidence         ?? 0 },
      { skill: 'Technical',       score: src.technicalRelevance ?? 0 },
      { skill: 'Professionalism', score: src.professionalism    ?? 0 },
    ]
  }, [m7CategoryAverages, feedbackScores])

  // ── Improvement progress helpers ─────────────────────────────────────────
  // Render a delta value as a human-readable signed string, null-safe
  const fmtDelta = (delta) => {
    if (delta === null || delta === undefined) return '—'
    const n = Number(delta)
    if (!isFinite(n)) return '—'
    if (n > 0) return `+${n}`
    return String(n)   // includes the minus sign
  }

  const directionIcon = (dir) => {
    if (dir === 'improving') return '↑'
    if (dir === 'declining') return '↓'
    if (dir === 'stable')    return '→'
    return '?'
  }

  const directionColor = (dir) => {
    if (dir === 'improving') return '#10b981'
    if (dir === 'declining') return '#ef4444'
    return 'var(--text-muted)'
  }

  // ── Candidate Performance Report (Req 8a) ─────────────────────────────────
  // Includes interview history, Module 7 scores, structured AI feedback, and
  // longitudinal improvement progress. No fabricated data.
  const handleDownloadReport = () => {
    const s = analytics?.summary
    const hist = analytics?.trends || []
    const ip = analytics?.improvementProgress

    // Interview history lines
    const histLines = hist.length > 0
      ? hist.map(t => {
          const date = t.completedAt ? new Date(t.completedAt).toLocaleDateString('en-IN') : '—'
          const score = t.overallScore != null ? `${t.overallScore}/100` : '—'
          return `  Interview ${t.interviewIndex} — ${t.role} (${date}): ${score}`
        }).join('\n')
      : '  No completed scored interviews yet.'

    // Latest M7 category scores from feedbackScores
    const catLines = feedbackScores
      .filter(f => f.label !== 'Overall')
      .map(f => `  ${f.label}${f.pct ? ` (${f.pct})` : ''}: ${f.score != null ? `${f.score}/100` : '—'}`)
      .join('\n')
    const overallLine = `  Overall: ${feedbackScores.find(f => f.label === 'Overall')?.score ?? s?.latestScore ?? '—'}/100`

    // Structured M7 feedback from latest interview
    const m7fb = latestInterview?.category_scores?.module7_feedback || null
    const fbSection = (() => {
      if (!m7fb) return '  Not available for this interview.'
      const lines = []
      if (Array.isArray(m7fb.strengths) && m7fb.strengths.length > 0) {
        lines.push('  Strengths:')
        m7fb.strengths.forEach(s => lines.push(`    • ${s}`))
      }
      if (Array.isArray(m7fb.weaknesses) && m7fb.weaknesses.length > 0) {
        lines.push('  Weaknesses / Areas for Improvement:')
        m7fb.weaknesses.forEach(w => lines.push(`    • ${w}`))
      }
      if (Array.isArray(m7fb.improvementSuggestions) && m7fb.improvementSuggestions.length > 0) {
        lines.push('  Improvement Suggestions:')
        m7fb.improvementSuggestions.forEach((sug, i) => lines.push(`    ${i + 1}. ${sug}`))
      }
      if (Array.isArray(m7fb.practiceRecommendations) && m7fb.practiceRecommendations.length > 0) {
        lines.push('  Practice Recommendations:')
        m7fb.practiceRecommendations.forEach(r => lines.push(`    • ${r}`))
      }
      if (Array.isArray(m7fb.learningResources) && m7fb.learningResources.length > 0) {
        lines.push('  Learning Resources:')
        m7fb.learningResources.forEach(r => {
          lines.push(`    • ${r.topic || '—'} [${r.resourceType || '—'}]${r.reason ? ` — ${r.reason}` : ''}`)
        })
      }
      return lines.length > 0 ? lines.join('\n') : '  Not available for this interview.'
    })()

    // Improvement progress section
    const progressSection = (() => {
      if (!ip) return '  Not available.'
      if (ip.status === 'no_data' || ip.status === 'insufficient_history') {
        return `  Insufficient interview history to measure progress. (${ip.message || 'Complete more scored interviews.'})` 
      }
      if (ip.status !== 'tracked') return '  Not available.'
      const o = ip.overall
      const c = ip.categories
      const safe = (dim) => dim?.delta != null ? `${dim.delta > 0 ? '+' : ''}${dim.delta}` : '—'
      const dir  = (dim) => dim?.direction ? ` (${dim.direction})` : ''
      return [
        `  Overall: ${safe(o)}${dir(o)}`,
        `  Communication:      ${safe(c.communication)}${dir(c.communication)}`,
        `  Confidence:         ${safe(c.confidence)}${dir(c.confidence)}`,
        `  Technical Relevance:${safe(c.technicalRelevance)}${dir(c.technicalRelevance)}`,
        `  Professionalism:    ${safe(c.professionalism)}${dir(c.professionalism)}`,
        `  Interviews analysed: ${ip.interviewsAnalysed}`,
      ].join('\n')
    })()

    const text = [
      'CANDIDATE PERFORMANCE REPORT',
      `Candidate: ${user?.name || 'Candidate'}`,
      user?.email ? `Email: ${user.email}` : '',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'INTERVIEW SUMMARY',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `  Total Completed: ${s?.totalInterviews ?? interviewHistory.length}`,
      `  Average Score:   ${s?.averageScore   != null ? `${s.averageScore}/100` : '—'}`,
      `  Highest Score:   ${s?.highestScore   != null ? `${s.highestScore}/100` : '—'}`,
      `  Latest Score:    ${s?.latestScore    != null ? `${s.latestScore}/100`  : '—'}`,
      '',
      'Interview History:',
      histLines,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'MODULE 7 AI ASSESSMENT (Latest Interview)',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      catLines,
      overallLine,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'AI FEEDBACK (Latest Interview)',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      fbSection,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'IMPROVEMENT PROGRESS (Across All Interviews)',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      progressSection,
    ].filter(l => l !== '').join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'candidate_performance_report.txt'; a.click()
    URL.revokeObjectURL(url); showToast('Performance report downloaded')
  }

  // ── Resume Skill Gap Analysis Report (Req 8b) ─────────────────────────────
  // Produces a genuine resume/skill analysis report, distinct from the
  // performance report. Uses only actual stored resume analysis data.
  const handleDownloadSkillGapReport = () => {
    const rs = analytics?.resumeSkills

    if (!rs) {
      showToast('No resume analysis found. Upload and analyze your resume first.')
      return
    }

    const allSkills = [
      ...(Array.isArray(rs.skills)       ? rs.skills       : []),
      ...(Array.isArray(rs.technologies) ? rs.technologies : []),
    ].filter(Boolean)

    const skillLines = allSkills.length > 0
      ? allSkills.map(sk => `  • ${typeof sk === 'string' ? sk : JSON.stringify(sk)}`).join('\n')
      : '  No skills detected in resume.'

    const atsLine = rs.atsScore != null
      ? `Resume Score (ATS): ${rs.atsScore}/100`
      : 'Resume Score (ATS): Not available'

    const analyzedLine = rs.analyzedAt
      ? `Resume analyzed: ${new Date(rs.analyzedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
      : ''

    // Gap analysis: no job-specific skill set is stored in the current schema.
    // We truthfully report this and do NOT invent gaps.
    const gapSection = [
      '  Target-role skill comparison is unavailable because no job-specific',
      '  skill requirements are associated with this resume in the current system.',
      '  To enable gap analysis: attach a target job description when analyzing your resume.',
    ].join('\n')

    const text = [
      'RESUME SKILL ANALYSIS REPORT',
      `Candidate: ${user?.name || 'Candidate'}`,
      `Generated: ${new Date().toLocaleString()}`,
      analyzedLine,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'RESUME OVERVIEW',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      atsLine,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'DETECTED SKILLS & TECHNOLOGIES',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      skillLines,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'SKILL GAP ANALYSIS',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      gapSection,
      '',
      'Note: Skills above are resume-declared and not interview performance percentages.',
    ].filter(l => l !== undefined).join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'resume_skill_analysis.txt'; a.click()
    URL.revokeObjectURL(url); showToast('Resume skill analysis downloaded')
  }

  // ── Module 9 Chunk 4: Backend PDF/CSV report downloads ────────────────────
  const [reportDownloading, setReportDownloading] = useState(null) // 'pdf' | 'csv' | null

  const handleDownloadPdf = async () => {
    setReportDownloading('pdf')
    try {
      await reportApi.downloadOwnReport('pdf')
      showToast('PDF report downloaded')
    } catch (err) {
      showToast('PDF download failed: ' + (err.message || 'Unknown error'))
    } finally {
      setReportDownloading(null)
    }
  }

  const handleDownloadCsv = async () => {
    setReportDownloading('csv')
    try {
      await reportApi.downloadOwnReport('csv')
      showToast('CSV report downloaded')
    } catch (err) {
      showToast('CSV download failed: ' + (err.message || 'Unknown error'))
    } finally {
      setReportDownloading(null)
    }
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
        { icon: <TrendingUp size={18} />, label: 'Progress',    section: 'improvement-progress' },
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

  // Module 8: canonical 0-100 stats — no /10 division
  const avgVal   = analytics?.summary?.averageScore  != null ? `${analytics.summary.averageScore}/100`  : (interviewStats?.avgScore  != null ? `${interviewStats.avgScore}/100`  : '—')
  const highVal  = analytics?.summary?.highestScore  != null ? `${analytics.summary.highestScore}/100`  : (interviewStats?.highestScore != null ? `${interviewStats.highestScore}/100` : '—')
  const countVal = String(analytics?.summary?.totalInterviews ?? interviewStats?.completedInterviews ?? interviewHistory.length)

  const statsRow = (
    <div className="stats-row" style={{ marginBottom: 20 }}>
      {[
        { title: 'Average Score',    value: analyticsLoading ? '…' : avgVal,   trend: analytics?.summary?.totalInterviews > 0 ? 'AI Evaluated' : 'No data', icon: <Star size={22} />,     color: 'purple' },
        { title: 'Highest Score',    value: analyticsLoading ? '…' : highVal,  trend: analytics?.summary?.totalInterviews > 0 ? 'Personal Best' : 'No data', icon: <Award size={22} />,    color: 'green'  },
        { title: 'Total Interviews', value: analyticsLoading ? '…' : countVal, trend: `${countVal} completed`, icon: <Calendar size={22} />, color: 'blue'   },
        { title: 'Status',           value: interviewHistory.length > 0 ? 'Active' : 'Ready', trend: 'Mock Prep', icon: <Zap size={22} />, color: 'orange' },
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
                  {schedulesLoading ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
                  ) : schedulesError ? (
                    <div style={{ padding: 12, color: '#ef4444', fontSize: 13 }}>{schedulesError}</div>
                  ) : schedules.filter(s => s.status !== 'cancelled' && s.status !== 'completed').slice(0, 3).length === 0 ? (
                    <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No upcoming interviews scheduled.</div>
                  ) : (
                    schedules.filter(s => s.status !== 'cancelled' && s.status !== 'completed').slice(0, 3).map((iv, i, arr) => {
                      const dt = iv.scheduled_at ? new Date(iv.scheduled_at) : null
                      const dateStr = dt ? dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '—'
                      const timeStr = dt ? dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—'
                      const statusColor = iv.status === 'confirmed' ? 'green' : iv.status === 'scheduled' ? 'blue' : 'orange'
                      return (
                        <div key={iv.id} style={{ padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{iv.role}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{iv.interview_type}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{dateStr} · {timeStr} · {iv.duration_minutes}min</div>
                            </div>
                            <span className={`badge ${statusColor}`}>{iv.status}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
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
                <div className="card-header"><h2>Module 7 AI Feedback Summary</h2></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  {feedbackScores.filter(f => f.label !== 'Overall').map((item, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: item.score != null && item.score >= 80 ? 'var(--success)' : item.score != null && item.score >= 60 ? 'var(--warning)' : item.score != null ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {item.score != null ? `${item.score}` : '—'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
                      {item.pct && <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.7 }}>{item.pct}</div>}
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
                <div className="card-header">
                  <h2>Performance Over Time</h2>
                  <span className="badge blue">All Interviews · 0–100 scale</span>
                </div>
                {analyticsLoading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading analytics…</div>
                ) : analyticsError ? (
                  <div style={{ padding: 20, color: '#ef4444', fontSize: 13 }}>Could not load analytics: {analyticsError}</div>
                ) : performanceData.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No interview data yet. Take a mock interview to see your progress curve.
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={performanceData}>
                        <defs>
                          <linearGradient id="scoreGrad2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="interview" tick={{ fontSize: 12 }} />
                        {/* Canonical 0–100 axis — no /10 division */}
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickCount={6} />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          formatter={(val, name) => [val != null ? `${val}/100` : '—', name]}
                          labelFormatter={(label, payload) => {
                            const p = payload?.[0]?.payload
                            return p ? `${label}${p.role ? ` · ${p.role}` : ''}${p.date ? ` (${p.date})` : ''}` : label
                          }}
                        />
                        <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} fill="url(#scoreGrad2)" dot={{ fill: '#6366f1', r: 5 }} name="Overall" />
                        {/* Category trends when data is available from analytics API */}
                        {performanceData.some(d => d.communication != null) && (
                          <Area type="monotone" dataKey="communication" stroke="#10b981" strokeWidth={1.5} fill="url(#commGrad)" dot={{ fill: '#10b981', r: 3 }} name="Communication" strokeDasharray="4 2" />
                        )}
                        {performanceData.some(d => d.confidence != null) && (
                          <Area type="monotone" dataKey="confidence" stroke="#f59e0b" strokeWidth={1.5} fill="none" dot={{ fill: '#f59e0b', r: 3 }} name="Confidence" strokeDasharray="4 2" />
                        )}
                        {performanceData.some(d => d.technicalRelevance != null) && (
                          <Area type="monotone" dataKey="technicalRelevance" stroke="#0ea5e9" strokeWidth={1.5} fill="none" dot={{ fill: '#0ea5e9', r: 3 }} name="Technical" strokeDasharray="4 2" />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '4px 0 8px', fontSize: 11, color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 3, background: '#6366f1', borderRadius: 2, display: 'inline-block' }} /> Overall</span>
                      {performanceData.some(d => d.communication != null) && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 3, background: '#10b981', borderRadius: 2, display: 'inline-block' }} /> Communication</span>}
                      {performanceData.some(d => d.confidence != null) && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 3, background: '#f59e0b', borderRadius: 2, display: 'inline-block' }} /> Confidence</span>}
                      {performanceData.some(d => d.technicalRelevance != null) && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 3, background: '#0ea5e9', borderRadius: 2, display: 'inline-block' }} /> Technical</span>}
                    </div>
                  </>
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
                <div className="card-header">
                  <h2>Competency Radar</h2>
                  <span className="badge purple" style={{ fontSize: 10 }}>{m7CategoryAverages ? 'All-interview avg' : 'Latest interview'}</span>
                </div>
                {radarData.every(d => d.score === 0) ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Complete interviews to populate competency radar.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar name="Module 7 Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(val) => [`${val}/100`]} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
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
                {/* Performance Report */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={20} color="#6366f1" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>AI Performance Evaluation</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Full interview history, Module 7 scores, AI feedback, and improvement progress</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {latestInterview ? new Date(latestInterview.completed_at).toLocaleDateString('en-IN') : 'No interviews yet'} · TXT
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => { if (latestInterview) openInterviewDetail(latestInterview.id); else showToast('No interview reports yet') }}><Eye size={13} /> View</button>
                    <button className="btn btn-primary btn-sm" onClick={handleDownloadReport}><Download size={13} /> Download</button>
                  </div>
                </div>

                {/* Backend PDF / CSV Performance Report */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Download size={20} color="#6366f1" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Performance Report (PDF / CSV)</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Full Module 7 scores, history, weak areas — server-generated</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>PDF · CSV</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={reportDownloading !== null}
                      onClick={handleDownloadCsv}
                    >
                      <Download size={13} /> {reportDownloading === 'csv' ? 'Downloading…' : 'CSV'}
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={reportDownloading !== null}
                      onClick={handleDownloadPdf}
                    >
                      <Download size={13} /> {reportDownloading === 'pdf' ? 'Downloading…' : 'PDF'}
                    </button>
                  </div>
                </div>

                {/* Resume Skill Gap Analysis Report */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={20} color="#10b981" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Resume Skill Analysis</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Detected skills and technologies from your CV analysis</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {analytics?.resumeSkills?.analyzedAt
                          ? new Date(analytics.resumeSkills.analyzedAt).toLocaleDateString('en-IN')
                          : 'Upload resume to enable'} · TXT
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => handleSectionChange('skills')}><Eye size={13} /> View Skills</button>
                    <button className="btn btn-primary btn-sm"
                      onClick={handleDownloadSkillGapReport}
                      style={{ background: '#10b981', borderColor: '#10b981' }}
                    ><Download size={13} /> Download</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )


      case 'upcoming':
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <div><h2>Upcoming Interviews</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Your scheduled and confirmed interviews</p></div>
              {!schedulesLoading && !schedulesError && (
                <span className="badge blue">
                  {schedules.filter(s => s.status !== 'cancelled' && s.status !== 'completed').length} interviews
                </span>
              )}
            </div>

            {schedulesLoading && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading interviews…</div>
            )}

            {!schedulesLoading && schedulesError && (
              <div style={{ padding: 20, color: '#ef4444', fontSize: 13 }}>
                Could not load schedules: {schedulesError}
              </div>
            )}

            {!schedulesLoading && !schedulesError && schedules.filter(s => s.status !== 'cancelled' && s.status !== 'completed').length === 0 && (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <Calendar size={32} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: 10 }} />
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No upcoming interviews scheduled yet.</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Your recruiter will schedule interviews here when ready.</p>
              </div>
            )}

            {!schedulesLoading && !schedulesError && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {schedules
                  .filter(s => s.status !== 'cancelled' && s.status !== 'completed')
                  .map((iv, i, arr) => {
                    const dt = iv.scheduled_at ? new Date(iv.scheduled_at) : null
                    const dateStr = dt ? dt.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '—'
                    const timeStr = dt ? dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—'
                    const statusColor = iv.status === 'confirmed' ? 'green' : iv.status === 'scheduled' ? 'blue' : 'orange'
                    return (
                      <div key={iv.id} style={{ padding: '20px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{iv.role}</div>
                            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{iv.interview_type}</div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> {dateStr}</span>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🕐 {timeStr}</span>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⏱ {iv.duration_minutes} min</span>
                            </div>
                            {iv.notes && (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic' }}>Note: {iv.notes}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                            <span className={`badge ${statusColor}`}>{iv.status}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            )}

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
                <div className="card-header">
                  <h2>Module 7 AI Assessment</h2>
                  <span className="badge green">{latestInterview ? 'Latest Interview' : 'Practice Ready'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                  {feedbackScores.filter(f => f.label !== 'Overall').map((item, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '16px 8px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: item.score != null && item.score >= 80 ? 'var(--success)' : item.score != null && item.score >= 60 ? 'var(--warning)' : item.score != null ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {item.score != null ? item.score : '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{item.label}</div>
                      {item.pct && <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.7 }}>{item.pct}</div>}
                      <div className="progress-bar-container" style={{ marginTop: 8 }}>
                        <div className="progress-bar-fill" style={{ width: `${item.score ?? 0}%`, background: item.score != null && item.score >= 80 ? '#10b981' : item.score != null && item.score >= 60 ? '#f59e0b' : '#ef4444' }} />
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

              {/* ── Module 8: Predicted Weak Areas — history-based, deterministic ── */}
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header">
                  <div>
                    <h2>Predicted Weak Areas</h2>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Based on your interview history · Not per-interview feedback</p>
                  </div>
                  {analytics?.weakAreaPrediction?.metadata && (
                    <span className="badge blue" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                      {analytics.weakAreaPrediction.metadata.interviewsAnalysed} interview{analytics.weakAreaPrediction.metadata.interviewsAnalysed !== 1 ? 's' : ''} analysed
                    </span>
                  )}
                </div>

                {analyticsLoading ? (
                  <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Analysing your interview history…</div>
                ) : !analytics?.weakAreaPrediction ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No interview history available for weak-area prediction yet.
                  </div>
                ) : analytics.weakAreaPrediction.status === 'no_data' ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No completed interview history available for weak-area prediction.
                  </div>
                ) : analytics.weakAreaPrediction.status === 'insufficient_history' ? (
                  <div style={{ padding: 20, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>More data needed</div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      More interview history is needed to identify persistent weak areas. Complete additional mock interviews to enable prediction.
                    </p>
                  </div>
                ) : analytics.weakAreaPrediction.status === 'no_persistent_weakness' ? (
                  <div style={{ padding: 20, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🎯</div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--success)', marginBottom: 6 }}>No persistent weak areas detected</div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {analytics.weakAreaPrediction.message || 'Keep up the strong performance across all competency areas!'}
                    </p>
                  </div>
                ) : (
                  /* status === 'predicted' — show weak area cards */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {analytics.weakAreaPrediction.weakAreas.map((wa, i) => {
                      const riskColor = wa.riskLevel === 'High' ? '#ef4444' : wa.riskLevel === 'Medium' ? '#f59e0b' : '#6366f1'
                      const riskBadge = wa.riskLevel === 'High' ? 'red' : wa.riskLevel === 'Medium' ? 'orange' : 'purple'
                      const trendIcon  = wa.trend === 'improving' ? '↗' : wa.trend === 'declining' ? '↘' : wa.trend === 'stable' ? '→' : '?'
                      const trendColor = wa.trend === 'improving' ? 'var(--success)' : wa.trend === 'declining' ? 'var(--danger)' : 'var(--text-muted)'
                      return (
                        <div key={i} style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: `1px solid ${wa.riskLevel === 'High' ? 'rgba(239,68,68,0.2)' : 'var(--border)'}` }}>
                          {/* Header row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>{wa.area}</span>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {wa.trend !== 'insufficient_data' && (
                                <span style={{ fontSize: 13, color: trendColor, fontWeight: 600 }} title={`Trend: ${wa.trend}`}>{trendIcon} {wa.trend}</span>
                              )}
                              <span className={`badge ${riskBadge}`} style={{ fontSize: 11 }}>{wa.riskLevel} Risk</span>
                            </div>
                          </div>

                          {/* Score metrics */}
                          <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
                            <div style={{ fontSize: 12 }}>
                              <span style={{ color: 'var(--text-muted)' }}>Avg: </span>
                              <span style={{ fontWeight: 700, color: riskColor }}>{wa.averageScore}/100</span>
                            </div>
                            <div style={{ fontSize: 12 }}>
                              <span style={{ color: 'var(--text-muted)' }}>Recent: </span>
                              <span style={{ fontWeight: 600 }}>{wa.recentScore}/100</span>
                            </div>
                            <div style={{ fontSize: 12 }}>
                              <span style={{ color: 'var(--text-muted)' }}>Low in: </span>
                              <span style={{ fontWeight: 600 }}>{wa.lowScoreCount}/{wa.sampleSize} sessions</span>
                            </div>
                          </div>

                          {/* Risk indicator bar */}
                          <div className="progress-bar-container" style={{ marginBottom: 10 }}>
                            <div className="progress-bar-fill" style={{ width: `${wa.riskIndicator}%`, background: riskColor, opacity: 0.85 }} />
                          </div>

                          {/* Reason */}
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10, fontStyle: 'italic' }}>
                            {wa.reason}
                          </p>

                          {/* Targeted recommendations */}
                          {wa.recommendations && wa.recommendations.length > 0 && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Targeted tips</div>
                              <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {wa.recommendations.map((rec, j) => (
                                  <li key={j} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Disclaimer */}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '8px 12px', background: 'rgba(99,102,241,0.05)', borderRadius: 6, borderLeft: '3px solid rgba(99,102,241,0.3)' }}>
                      Risk level is a deterministic metric derived from your score history. It is not a statistically calibrated probability.
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )

      case 'skills':
        // Module 8: real resume skills from analytics API + Module 7 competency analytics
        return (
          <>
            {statsRow}
            <div className="dashboard-grid">
              {/* ── Module 7 Competency Analytics (real aggregated data) ── */}
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="card-header">
                  <h2>Competency Analytics</h2>
                  <span className="badge blue" style={{ fontSize: 10 }}>Module 7 · All Interviews</span>
                </div>
                {analyticsLoading ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
                ) : m7CategoryAverages ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      { label: 'Communication',      score: m7CategoryAverages.communication,      pct: '30%', color: '#6366f1' },
                      { label: 'Technical Relevance',score: m7CategoryAverages.technicalRelevance,  pct: '30%', color: '#0ea5e9' },
                      { label: 'Confidence',         score: m7CategoryAverages.confidence,          pct: '25%', color: '#10b981' },
                      { label: 'Professionalism',    score: m7CategoryAverages.professionalism,     pct: '15%', color: '#f59e0b' },
                    ].map((cat, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>
                            {cat.label} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cat.pct}</span>
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {cat.score != null ? (
                              <>
                                <span style={{ fontSize: 13, fontWeight: 700, color: getBarColor(cat.score) }}>{cat.score}/100</span>
                                <span className={`badge ${cat.score >= 80 ? 'green' : cat.score >= 60 ? 'blue' : 'orange'}`} style={{ fontSize: 11 }}>
                                  {cat.score >= 80 ? 'Strong' : cat.score >= 60 ? 'Developing' : 'Needs Work'}
                                </span>
                              </>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                            )}
                          </div>
                        </div>
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{ width: `${cat.score ?? 0}%`, background: cat.color }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
                      These are your average Module 7 competency scores across all completed interviews.
                      Weights: Communication 30% · Technical 30% · Confidence 25% · Professionalism 15%.
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Complete AI mock interviews to see competency analytics.
                  </div>
                )}
              </motion.div>

              {/* ── Competency Radar ── */}
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header">
                  <h2>Competency Radar</h2>
                  <span className="badge purple" style={{ fontSize: 10 }}>{m7CategoryAverages ? 'All-interview avg' : 'Latest interview'}</span>
                </div>
                {radarData.every(d => d.score === 0) ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Complete interviews to populate radar.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar name="Your Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(val) => [`${val}/100`]} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              {/* ── Resume-Derived Skills (real data, no fake percentages) ── */}
              <motion.div className="card full-width" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="card-header">
                  <h2>Resume Skills</h2>
                  <span className="badge gray" style={{ fontSize: 10 }}>From your CV analysis</span>
                </div>
                {analyticsLoading ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading resume data…</div>
                ) : analytics?.resumeSkills ? (() => {
                  const rs = analytics.resumeSkills
                  const allSkills = [
                    ...(Array.isArray(rs.skills) ? rs.skills : []),
                    ...(Array.isArray(rs.technologies) ? rs.technologies : []),
                  ].filter(Boolean)
                  return (
                    <div>
                      {rs.atsScore != null && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--success-bg)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', marginBottom: 14, fontSize: 13 }}>
                          <CheckCircle size={14} color="var(--success)" />
                          <span>ATS Resume Score: <strong style={{ color: 'var(--success)' }}>{rs.atsScore}/100</strong></span>
                        </div>
                      )}
                      {allSkills.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {allSkills.map((sk, i) => (
                            <span key={i} style={{ padding: '4px 12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, fontSize: 13, color: 'var(--text-primary)' }}>
                              {typeof sk === 'string' ? sk : JSON.stringify(sk)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No skills found in resume analysis.</div>
                      )}
                      {rs.analyzedAt && (
                        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                          From resume analyzed {new Date(rs.analyzedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.
                          <span style={{ marginLeft: 6 }}>These are resume-declared skills, not interview performance percentages.</span>
                        </div>
                      )}
                    </div>
                  )
                })() : (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No resume skill data available. Upload and analyze your resume to see skills here.
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )

      case 'improvement-progress': {
        // Module 8 Req 7 — Longitudinal Improvement Progress
        const ip = analytics?.improvementProgress
        const CATS = [
          { key: 'communication',      label: 'Communication',      color: '#6366f1', pct: '30%' },
          { key: 'confidence',         label: 'Confidence',         color: '#10b981', pct: '25%' },
          { key: 'technicalRelevance', label: 'Technical Relevance',color: '#0ea5e9', pct: '30%' },
          { key: 'professionalism',    label: 'Professionalism',    color: '#f59e0b', pct: '15%' },
        ]

        // Helper: render a single metric card
        const MetricCard = ({ label, dim, subtitle }) => {
          const isTracked = dim?.status === 'tracked'
          const dir    = isTracked ? dim.direction : null
          const icon   = directionIcon(dir)
          const color  = directionColor(dir)
          const delta  = isTracked ? fmtDelta(dim.delta) : null
          return (
            <div style={{ padding: '16px 18px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
                  {subtitle && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>}
                </div>
                {isTracked && (
                  <span className={`badge ${dir === 'improving' ? 'green' : dir === 'declining' ? 'red' : 'gray'}`} style={{ fontSize: 11 }}>
                    {dir}
                  </span>
                )}
              </div>
              {isTracked ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{icon} {delta}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>points</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Earlier avg: <strong>{dim.earlierAverage}/100</strong> → Later avg: <strong style={{ color }}>{dim.laterAverage}/100</strong>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', marginTop: 4 }}>
                    <div style={{ height: '100%', width: `${dim.laterAverage ?? 0}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {dim?.validCount === 1
                    ? `Only 1 scored interview — needs 1 more to track progress.`
                    : 'No scored data for this competency yet.'}
                </div>
              )}
            </div>
          )
        }

        return (
          <>
            {statsRow}
            <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="card-header">
                <div>
                  <h2>Improvement Progress</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>How your measurable performance changed across interviews — not per-interview feedback</p>
                </div>
                {ip?.status === 'tracked' && (
                  <span className="badge blue" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                    {ip.interviewsAnalysed} interview{ip.interviewsAnalysed !== 1 ? 's' : ''} analysed
                  </span>
                )}
              </div>

              {analyticsLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Analysing your interview history…</div>
              ) : !ip ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No interview history available yet.</div>
              ) : ip.status === 'no_data' ? (
                <div style={{ padding: 30, textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>No interviews yet</div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{ip.message}</p>
                  <Link to="/mock-interview" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Play size={16} /> Start Mock Interview</Link>
                </div>
              ) : ip.status === 'insufficient_history' ? (
                <div style={{ padding: 30, textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Need one more interview</div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
                    {ip.message}
                  </p>
                  {ip.overall?.earlierAverage != null && (
                    <div style={{ display: 'inline-block', padding: '10px 20px', background: 'rgba(99,102,241,0.06)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)', marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your first interview score</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)' }}>{ip.overall.earlierAverage}/100</div>
                    </div>
                  )}
                  <br />
                  <Link to="/mock-interview" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Play size={16} /> Practice Now</Link>
                </div>
              ) : (
                /* status === 'tracked' */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Summary banner */}
                  {ip.summary && (
                    <div style={{ padding: '12px 16px', background: ip.overall.direction === 'improving' ? 'var(--success-bg)' : ip.overall.direction === 'declining' ? 'rgba(239,68,68,0.06)' : 'var(--bg-primary)', borderRadius: 8, border: `1px solid ${ip.overall.direction === 'improving' ? 'rgba(16,185,129,0.2)' : ip.overall.direction === 'declining' ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20, fontWeight: 900, color: directionColor(ip.overall.direction) }}>
                        {directionIcon(ip.overall.direction)}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{ip.summary}</span>
                    </div>
                  )}

                  {/* Overall metric card */}
                  <MetricCard label="Overall Score" dim={ip.overall} subtitle="Weighted: Comm 30% · Tech 30% · Conf 25% · Prof 15%" />

                  {/* Category metric cards — 2-column grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {CATS.map(cat => (
                      <MetricCard key={cat.key} label={cat.label} dim={ip.categories[cat.key]} subtitle={cat.pct + ' weight'} />
                    ))}
                  </div>

                  {/* Disclaimer note */}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '8px 12px', background: 'rgba(99,102,241,0.04)', borderRadius: 6, borderLeft: '3px solid rgba(99,102,241,0.25)', lineHeight: 1.5 }}>
                    Progress is calculated by comparing your earlier interview scores with your later scores.
                    A difference of more than 5 points is classified as improving or declining.
                    Progress indicators reflect measured score changes — not predicted outcomes.
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline btn-sm" onClick={handleDownloadReport}><Download size={13} /> Download Full Report</button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )
      }

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

                  {/* ── Module 7 AI Assessment ─────────────────────────────────────── */}
                  {(() => {
                    const m7s  = cs.module7_scores  || null
                    const m7fb = cs.module7_feedback || null

                    // Only render if we have at least an overall score
                    if (!m7s || m7s.overallScore == null) return null

                    const ratingColor = (r) => {
                      if (r === 'Excellent') return '#10b981'
                      if (r === 'Good')      return '#6366f1'
                      if (r === 'Average')   return '#f59e0b'
                      return '#ef4444'
                    }

                    const catBarColor = (s) => {
                      if (s == null) return 'var(--border)'
                      if (s >= 80)   return '#10b981'
                      if (s >= 60)   return '#f59e0b'
                      return '#ef4444'
                    }

                    const catScoreStr = (s) =>
                      s != null && typeof s === 'number' ? `${s}/100` : '—'

                    const M7_CATS = [
                      { key: 'communication',      label: 'Communication',      pct: '30%', value: m7s.communication?.score },
                      { key: 'confidence',         label: 'Confidence',         pct: '25%', value: m7s.confidence?.score },
                      { key: 'technicalRelevance', label: 'Technical Relevance', pct: '30%', value: m7s.technicalRelevance?.score },
                      { key: 'professionalism',    label: 'Professionalism',    pct: '15%', value: m7s.professionalism?.score },
                    ]

                    return (
                      <div style={{ marginBottom: 20 }}>
                        {/* Section header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Brain size={15} style={{ color: 'var(--primary)' }} />
                            Module 7 AI Assessment
                            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(scored by AI engine)</span>
                          </div>
                          {m7s.performanceRating && (
                            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${ratingColor(m7s.performanceRating)}18`, color: ratingColor(m7s.performanceRating), border: `1px solid ${ratingColor(m7s.performanceRating)}40` }}>
                              {m7s.performanceRating}
                            </span>
                          )}
                        </div>

                        {/* Overall score hero */}
                        <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.03))', borderRadius: 10, padding: '16px 20px', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 20 }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, color: scoreColor(m7s.overallScore) }}>
                              {m7s.overallScore}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>out of 100</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Overall Performance Score</div>
                            {/* Mini progress bar for overall */}
                            <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${m7s.overallScore}%`, background: scoreColor(m7s.overallScore), borderRadius: 4, transition: 'width 0.6s ease' }} />
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                              Weighted: Communication 30% · Confidence 25% · Technical 30% · Professionalism 15%
                            </div>
                          </div>
                        </div>

                        {/* Four category score bars */}
                        <div className="m7-cat-grid">
                          {M7_CATS.map(({ key, label, pct, value }) => (
                            <div key={key} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border-light)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <div>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 5 }}>{pct}</span>
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 800, color: catBarColor(value) }}>{catScoreStr(value)}</span>
                              </div>
                              <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${value ?? 0}%`, background: catBarColor(value), borderRadius: 3, transition: 'width 0.5s ease' }} />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Module 7 AI Feedback sections */}
                        {m7fb ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                            {/* Strengths */}
                            {Array.isArray(m7fb.strengths) && m7fb.strengths.length > 0 && (
                              <div style={{ background: 'var(--success-bg)', borderRadius: 8, padding: 12, border: '1px solid rgba(16,185,129,0.2)' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <CheckCircle size={13} /> AI Identified Strengths
                                </div>
                                <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.65, listStyleType: 'disc' }}>
                                  {m7fb.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                              </div>
                            )}

                            {/* Weaknesses */}
                            {Array.isArray(m7fb.weaknesses) && m7fb.weaknesses.length > 0 && (
                              <div style={{ background: 'var(--warning-bg)', borderRadius: 8, padding: 12, border: '1px solid rgba(245,158,11,0.2)' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <Target size={13} /> Areas for Improvement
                                </div>
                                <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.65, listStyleType: 'disc' }}>
                                  {m7fb.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                                </ul>
                              </div>
                            )}

                            {/* Improvement Suggestions */}
                            {Array.isArray(m7fb.improvementSuggestions) && m7fb.improvementSuggestions.length > 0 && (
                              <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 12, border: '1px solid var(--border-light)' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <Zap size={13} /> Actionable Suggestions
                                </div>
                                <ol style={{ paddingLeft: 18, margin: 0, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.65 }}>
                                  {m7fb.improvementSuggestions.map((s, i) => <li key={i} style={{ marginBottom: 3 }}>{s}</li>)}
                                </ol>
                              </div>
                            )}

                            {/* Practice Recommendations */}
                            {Array.isArray(m7fb.practiceRecommendations) && m7fb.practiceRecommendations.length > 0 && (
                              <div style={{ background: 'rgba(99,102,241,0.05)', borderRadius: 8, padding: 12, border: '1px solid rgba(99,102,241,0.15)' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <Activity size={13} /> Practice Recommendations
                                </div>
                                <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.65, listStyleType: 'disc' }}>
                                  {m7fb.practiceRecommendations.map((r, i) => <li key={i}>{r}</li>)}
                                </ul>
                              </div>
                            )}

                            {/* Learning Resources — no URLs */}
                            {Array.isArray(m7fb.learningResources) && m7fb.learningResources.length > 0 && (
                              <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 12, border: '1px solid var(--border-light)' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <Star size={13} style={{ color: 'var(--primary)' }} /> Recommended Learning Resources
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {m7fb.learningResources.map((res, i) => (
                                    <div key={i} style={{ padding: '8px 10px', background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border-light)', borderLeft: '3px solid var(--primary)' }}>
                                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{res.topic}</div>
                                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{res.resourceType}</span>
                                        {res.reason && <span> · {res.reason}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          </div>
                        ) : (
                          // m7fb is null — feedback unavailable, score still shows
                          <div style={{ padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px dashed var(--border)', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Brain size={14} style={{ flexShrink: 0 }} />
                            AI narrative feedback is currently unavailable for this interview. Your scores above reflect the actual assessment.
                          </div>
                        )}
                      </div>
                    )
                  })()}

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
