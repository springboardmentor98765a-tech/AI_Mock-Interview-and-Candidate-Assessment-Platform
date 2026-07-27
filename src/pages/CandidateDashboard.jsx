import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic, Upload, FileText, TrendingUp, Award, Clock, CheckCircle2,
  AlertCircle, Play, ChevronRight, Star, Target, Zap, BarChart3
} from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart
} from 'recharts'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import ScoreRing from '../components/ScoreRing'

const SCORES = [
  { label: 'Resume Score',        value: 82, color: '#6366f1' },
  { label: 'Communication',       value: 74, color: '#06b6d4' },
  { label: 'Confidence',          value: 68, color: '#a855f7' },
]

const RADAR_DATA = [
  { subject: 'Communication', score: 74 },
  { subject: 'Technical',     score: 80 },
  { subject: 'Confidence',    score: 68 },
  { subject: 'Clarity',       score: 77 },
  { subject: 'Leadership',    score: 60 },
  { subject: 'Problem-Solving', score: 85 },
]

const TREND_DATA = [
  { session: 'S1', score: 58 },
  { session: 'S2', score: 63 },
  { session: 'S3', score: 68 },
  { session: 'S4', score: 72 },
  { session: 'S5', score: 74 },
  { session: 'S6', score: 80 },
]

const ACTIVITIES = [
  { dot: '#22c55e', title: 'Interview completed', sub: 'Software Engineer – Round 2',  time: '2 hours ago' },
  { dot: '#6366f1', title: 'Resume uploaded',     sub: 'resume_v3_final.pdf',           time: '1 day ago'  },
  { dot: '#f59e0b', title: 'Report generated',    sub: 'Communication Analysis',        time: '2 days ago' },
  { dot: '#06b6d4', title: 'Practice session',    sub: 'Behavioral Interview Set',      time: '4 days ago' },
]

const HISTORY = [
  { role: 'SWE Intern',         company: 'TechCorp',  score: 80, status: 'Passed',    date: 'Jul 24' },
  { role: 'Backend Developer',  company: 'DataFlow',  score: 74, status: 'Pending',   date: 'Jul 22' },
  { role: 'Full Stack Dev',     company: 'CloudX',    score: 68, status: 'In Review', date: 'Jul 18' },
  { role: 'React Developer',    company: 'StartupY',  score: 91, status: 'Passed',    date: 'Jul 15' },
]

const STATUS_BADGE = {
  Passed:    'badge-success',
  Pending:   'badge-warning',
  'In Review': 'badge-primary',
  Failed:    'badge-danger',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="custom-tooltip">
        <p style={{ color: '#a0a0c0', marginBottom: 4 }}>{label}</p>
        <p style={{ color: '#6366f1', fontWeight: 700 }}>Score: {payload[0].value}</p>
      </div>
    )
  }
  return null
}

export default function CandidateDashboard() {
  const navigate = useNavigate()
  const [uploadHover, setUploadHover] = useState(false)

  return (
    <div className="dashboard-layout">
      <Sidebar role="candidate" />
      <div className="dashboard-main">
        <Topbar
          title="Candidate Dashboard"
          subtitle="Track your interview performance and career progress"
          userName="Arjun Sharma"
          userInitials="AS"
          roleBadge="Candidate"
        />
        <div className="dashboard-content">

          {/* Welcome Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1))',
            border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20,
            padding: '28px 32px', marginBottom: 32, display: 'flex',
            justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20,
            position: 'relative', overflow: 'hidden',
          }}>
            <div className="orb orb-indigo" style={{ width: 200, height: 200, right: 0, top: -80, opacity: 0.2 }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Star size={14} color="#f59e0b" fill="#f59e0b" />
                <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Welcome back</span>
              </div>
              <h2 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.6rem', color: '#f0f0ff', marginBottom: 6 }}>
                Good afternoon, Arjun! 👋
              </h2>
              <p style={{ color: '#a0a0c0', fontSize: '0.875rem' }}>
                Your overall performance has improved by <span style={{ color: '#22c55e', fontWeight: 700 }}>+12%</span> this week. Keep it up!
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" id="start-interview-btn" onClick={() => {}}>
                <Play size={16} /> Start Interview
              </button>
              <button className="btn btn-outline" id="upload-resume-btn">
                <Upload size={16} /> Upload Resume
              </button>
            </div>
          </div>

          {/* Score Rings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
            {SCORES.map((s, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
                <ScoreRing score={s.value} label={s.label} color={s.color} size={130} strokeWidth={11} />
                <div style={{ marginTop: 16, fontSize: '0.78rem', color: '#a0a0c0' }}>
                  {s.value >= 80 ? '🟢 Excellent' : s.value >= 60 ? '🟡 Good — Room to improve' : '🔴 Needs work'}
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid-cols-2" style={{ marginBottom: 32 }}>
            {/* Skill Radar */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff' }}>Skill Breakdown</h3>
                  <p style={{ fontSize: '0.78rem', color: '#606080', marginTop: 2 }}>Multi-dimensional performance</p>
                </div>
                <span className="badge badge-primary"><Target size={10} /> Radar</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={RADAR_DATA}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#606080', fontSize: 11 }} />
                  <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} dot={{ fill: '#6366f1', r: 3 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Score Trend */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff' }}>Score Trend</h3>
                  <p style={{ fontSize: '0.78rem', color: '#606080', marginTop: 2 }}>Progress across sessions</p>
                </div>
                <span className="badge badge-success"><TrendingUp size={10} /> +12%</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={TREND_DATA}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="session" tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[40, 100]} tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} fill="url(#scoreGrad)" dot={{ fill: '#6366f1', r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom row: Activity + History */}
          <div className="grid-cols-2">
            {/* Activity Feed */}
            <div className="card">
              <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff', marginBottom: 18 }}>Recent Activity</h3>
              {ACTIVITIES.map((a, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-dot" style={{ background: a.dot, boxShadow: `0 0 8px ${a.dot}80` }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', color: '#f0f0ff', fontWeight: 500 }}>{a.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#606080', marginTop: 2 }}>{a.sub}</div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#404060', whiteSpace: 'nowrap' }}>{a.time}</div>
                </div>
              ))}
            </div>

            {/* Interview History */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: '#f0f0ff' }}>Interview History</h3>
                <button className="btn btn-outline btn-sm"><FileText size={13} /> View All</button>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {HISTORY.map((h, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 500, color: '#f0f0ff', fontSize: '0.825rem' }}>{h.role}</div>
                        <div style={{ fontSize: '0.72rem', color: '#606080' }}>{h.company}</div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'Outfit', fontWeight: 700, color: h.score >= 80 ? '#22c55e' : h.score >= 70 ? '#f59e0b' : '#ef4444' }}>
                          {h.score}
                        </span>
                      </td>
                      <td><span className={`badge ${STATUS_BADGE[h.status]}`}>{h.status}</span></td>
                      <td style={{ color: '#606080', fontSize: '0.78rem' }}>{h.date}</td>
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
