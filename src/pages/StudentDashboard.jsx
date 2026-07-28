import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import {
  FileText, Calendar, Award, TrendingUp, TrendingDown,
  BarChart3, Activity, Clock, Upload, Play, Download,
  Eye, Star, Target, CheckCircle, Video, Brain, Code, Zap
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts'

function StudentDashboard() {
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
    { role: 'Frontend Developer', company: 'TechCorp', date: 'Jul 30 2025', time: '10:00 AM', mode: 'Video Call', status: 'Scheduled', statusColor: 'blue' },
    { role: 'React Developer', company: 'StartupXYZ', date: 'Aug 3 2025', time: '2:00 PM', mode: 'In-Person', status: 'Confirmed', statusColor: 'green' },
    { role: 'Full Stack Developer', company: 'InnovateCo', date: 'Aug 7 2025', time: '11:00 AM', mode: 'Video Call', status: 'Pending', statusColor: 'orange' },
  ]

  const skills = [
    { name: 'React.js', match: 92 },
    { name: 'JavaScript', match: 88 },
    { name: 'Node.js', match: 75 },
    { name: 'Python', match: 65 },
    { name: 'SQL', match: 80 },
  ]

  const feedbackScores = [
    { label: 'Technical', score: 8.2 },
    { label: 'Communication', score: 7.5 },
    { label: 'Problem Solving', score: 8.8 },
    { label: 'Confidence', score: 7.0 },
    { label: 'Grammar', score: 8.5 },
    { label: 'Overall', score: 7.8 },
  ]

  const activities = [
    { text: 'Completed Mock Interview: React Developer', color: 'green', time: '1 day ago' },
    { text: 'Resume updated successfully', color: 'blue', time: '2 days ago' },
    { text: 'AI Feedback received: Score 7.8/10', color: 'purple', time: '3 days ago' },
    { text: 'Interview scheduled: TechCorp', color: 'orange', time: '5 days ago' },
  ]

  const getBarColor = (val) => {
    if (val >= 80) return '#10b981'
    if (val >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const sidebarLinks = [
    {
      title: 'Dashboard',
      items: [
        { icon: <BarChart3 size={18} />, label: 'Overview' },
        { icon: <Activity size={18} />, label: 'Performance' },
        { icon: <FileText size={18} />, label: 'Reports' },
      ]
    },
    {
      title: 'Interviews',
      items: [
        { icon: <Calendar size={18} />, label: 'Upcoming' },
        { icon: <Video size={18} />, label: 'Mock Interview' },
        { icon: <Brain size={18} />, label: 'AI Feedback' },
      ]
    },
    {
      title: 'Profile',
      items: [
        { icon: <FileText size={18} />, label: 'Resume' },
        { icon: <Code size={18} />, label: 'Skills' },
        { icon: <Target size={18} />, label: 'Settings' },
      ]
    }
  ]

  return (
    <DashboardLayout title="Candidate Dashboard" role="Candidate" userName="Hemanth M" sidebarLinks={sidebarLinks}>
      <motion.div className="welcome-banner" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1>Welcome back, Hemanth! 👋</h1>
          <p>Your next interview is in 2 days. Keep preparing!</p>
        </div>
        <Link to="/mock-interview" className="btn">
          <Play size={18} /> Start Mock Interview
        </Link>
      </motion.div>

      <div className="stats-row">
        {[
          { title: 'Average Score', value: '7.8/10', trend: '+0.6', up: true, icon: <Star size={22} />, color: 'purple' },
          { title: 'Highest Score', value: '9.2/10', trend: 'Personal Best', up: true, icon: <Award size={22} />, color: 'green' },
          { title: 'Total Interviews', value: '8', trend: '+2 this month', up: true, icon: <Calendar size={22} />, color: 'blue' },
          { title: 'Current Rank', value: '#3', trend: 'Top 15%', up: true, icon: <Zap size={22} />, color: 'orange' },
        ].map((stat, i) => (
          <motion.div className="stat-card" key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className={`stat-icon ${stat.color}`}>{stat.icon}</div>
            <div className="stat-details">
              <h3>{stat.value}</h3>
              <p>{stat.title}</p>
              <span className="stat-trend up">
                <TrendingUp size={13} /> {stat.trend}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="dashboard-grid">
        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="card-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="quick-actions-grid">
            <button className="quick-action-btn"><Upload size={18} /> Upload Resume</button>
            <Link to="/mock-interview" className="quick-action-btn"><Play size={18} /> Mock Interview</Link>
            <button className="quick-action-btn"><BarChart3 size={18} /> View Performance</button>
            <button className="quick-action-btn"><Download size={18} /> Download Report</button>
          </div>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="card-header">
            <h2>Upcoming Interviews</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {upcomingInterviews.map((iv, i) => (
              <div key={i} style={{ padding: '12px 0', borderBottom: i < upcomingInterviews.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{iv.role}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{iv.company}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {iv.date} · {iv.time} · {iv.mode}
                    </div>
                  </div>
                  <span className={`badge ${iv.statusColor}`}>{iv.status}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="card full-width" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <div className="card-header">
            <h2>Performance Analytics</h2>
            <button className="card-header-action">View All</button>
          </div>
          <ResponsiveContainer width="100%" height={250}>
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

        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <div className="card-header">
            <h2>Resume Analysis</h2>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Resume Match</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>78%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: '78%', background: '#f59e0b' }}></div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {skills.map((skill, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, minWidth: 100, color: 'var(--text-secondary)' }}>{skill.name}</span>
                <div className="progress-bar-container" style={{ flex: 1 }}>
                  <div className="progress-bar-fill" style={{ width: `${skill.match}%`, background: getBarColor(skill.match) }}></div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, minWidth: 36, textAlign: 'right', color: getBarColor(skill.match) }}>{skill.match}%</span>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Missing Skills</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Docker', 'AWS', 'TypeScript'].map(s => (
                <span key={s} className="badge red" style={{ fontSize: 11 }}>{s}</span>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Strengths</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Component Architecture', 'State Management', 'API Integration'].map(s => (
                <span key={s} className="badge green" style={{ fontSize: 11 }}>{s}</span>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <div className="card-header">
            <h2>AI Feedback</h2>
          </div>
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

        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <div className="card-header">
            <h2>Recent Activity</h2>
          </div>
          <div className="activity-list">
            {activities.map((a, i) => (
              <div className="activity-item" key={i}>
                <div className={`activity-dot ${a.color}`}></div>
                <div>
                  <div className="activity-text">{a.text}</div>
                  <div className="activity-time">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}

export default StudentDashboard
