import React from 'react'
import { motion } from 'framer-motion'
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Bell,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  Cloud,
  Download,
  FileText,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  Users,
  Video,
  Zap,
  Activity,
  ArrowUpRight,
  BarChart3,
  PenTool,
  PieChart as PieChartIcon,
  ScanSearch,
  Headphones,
  LayoutList,
  Laptop,
  Map,
} from 'lucide-react'
import './App.css'

const rolePaths = {
  Candidate: '/candidate',
  Recruiter: '/recruiter',
  Admin: '/admin',
}

const candidateNav = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: FileText, label: 'Resume' },
  { icon: Video, label: 'Mock Interview' },
  { icon: Sparkles, label: 'AI Feedback' },
  { icon: Gauge, label: 'Analytics' },
  { icon: BookOpen, label: 'Reports' },
  { icon: Settings, label: 'Settings' },
]

const recruiterNav = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: Users, label: 'Candidates' },
  { icon: CalendarDays, label: 'Interviews' },
  { icon: Target, label: 'Shortlist' },
  { icon: BookOpen, label: 'Reports' },
  { icon: Settings, label: 'Settings' },
]

const adminNav = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: Users, label: 'Users' },
  { icon: Cloud, label: 'Infrastructure' },
  { icon: Activity, label: 'Live Activity' },
  { icon: BookOpen, label: 'Reports' },
  { icon: Settings, label: 'Settings' },
]

const candidateTrend = [
  { label: 'Mon', score: 42, benchmark: 34 },
  { label: 'Tue', score: 48, benchmark: 38 },
  { label: 'Wed', score: 54, benchmark: 41 },
  { label: 'Thu', score: 63, benchmark: 48 },
  { label: 'Fri', score: 58, benchmark: 45 },
  { label: 'Sat', score: 71, benchmark: 53 },
  { label: 'Sun', score: 77, benchmark: 56 },
]

const recruiterInsights = [
  { label: 'Total candidates', value: '1,284', tone: 'violet', trend: '+12.4%' },
  { label: 'Live interviews', value: '42', tone: 'mint', trend: '+8.1%' },
  { label: 'Jobs created', value: '156', tone: 'lavender', trend: '+19.2%' },
  { label: 'Avg quality score', value: '84.2%', tone: 'amber', trend: '+2.6%' },
]

const recruiterCandidates = [
  { name: 'Sarah Jenkins', title: 'Frontend Engineer', initials: 'SJ', match: 94, communication: 89, confidence: 92, technical: 96, probability: 96, status: 'Shortlisted' },
  { name: 'Alex Mercer', title: 'Product Designer', initials: 'AM', match: 89, communication: 92, confidence: 87, technical: 84, probability: 90, status: 'Reviewing' },
  { name: 'Mia Robinson', title: 'Data Analyst', initials: 'MR', match: 86, communication: 80, confidence: 88, technical: 90, probability: 87, status: 'Interviewed' },
]

const adminMetrics = [
  { label: 'Total users', value: '14,292', tone: 'violet', trend: '+17.5%' },
  { label: 'Live interviews', value: '3,841', tone: 'mint', trend: '+11.9%' },
  { label: 'Assessments', value: '1,240', tone: 'amber', trend: '+9.4%' },
  { label: 'System health', value: 'Optimal', tone: 'emerald', trend: '99.98%' },
]

const activityData = [
  { label: 'Mon', value: 35 },
  { label: 'Tue', value: 52 },
  { label: 'Wed', value: 47 },
  { label: 'Thu', value: 64 },
  { label: 'Fri', value: 58 },
  { label: 'Sat', value: 71 },
  { label: 'Sun', value: 76 },
]

const monthlyGrowth = [
  { label: 'Jan', value: 48 },
  { label: 'Feb', value: 55 },
  { label: 'Mar', value: 62 },
  { label: 'Apr', value: 67 },
  { label: 'May', value: 72 },
  { label: 'Jun', value: 79 },
  { label: 'Jul', value: 84 },
]

const adminSystems = [
  { name: 'OpenAI API', status: 'Operational', value: '99.98%', tone: 'green' },
  { name: 'Whisper', status: 'Operational', value: '99.95%', tone: 'green' },
  { name: 'Eye Tracking', status: 'Monitoring', value: '99.81%', tone: 'yellow' },
  { name: 'Emotion Detection', status: 'Operational', value: '99.92%', tone: 'green' },
  { name: 'Database', status: 'Operational', value: '99.99%', tone: 'green' },
  { name: 'Docker', status: 'Healthy', value: '100%', tone: 'green' },
]

function Logo() {
  return (
    <Link to="/" className="logo">
      <span className="logo-mark">
        <Brain size={18} />
      </span>
      <span>
        SmartHire
        <span className="logo-dot">AI</span>
      </span>
    </Link>
  )
}

function Avatar({ initials = 'AM', size = 'md' }) {
  return <div className={`avatar avatar-${size}`}>{initials}</div>
}

function Shell({ navItems, role, title, subtitle, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="sidebar-nav">
          {navItems.map(({ icon: Icon, label }, index) => (
            <a className={index === 0 ? 'active' : ''} href={`#${label.toLowerCase()}`} key={label}>
              <Icon size={18} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-cta">
            <Plus size={16} />
            Post New Job
          </button>
          <a href="#help">
            <MessageSquareText size={16} />
            Help Center
          </a>
          <a href="#logout">
            <LogOut size={16} />
            Log Out
          </a>
          <div className="account-card">
            <Avatar initials={role === 'Candidate' ? 'AM' : role === 'Recruiter' ? 'SJ' : 'SV'} />
            <div>
              <strong>{role === 'Candidate' ? 'Alex Morgan' : role === 'Recruiter' ? 'Sarah Jenkins' : 'Sana Verma'}</strong>
              <span>{role}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-copy">
            <button className="mobile-menu" type="button">
              <Menu size={20} />
            </button>
            <div>
              <span className="eyebrow">{subtitle}</span>
              <h1>{title}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <label className="search-bar">
              <Search size={17} />
              <input placeholder="Search talent, skills, jobs..." />
            </label>
            <button className="icon-button" type="button">
              <Bell size={18} />
            </button>
            <button className="icon-button" type="button">
              <Moon size={18} />
            </button>
            <Avatar initials={role === 'Candidate' ? 'AM' : role === 'Recruiter' ? 'SJ' : 'SV'} />
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}

function MetricCard({ label, value, trend, tone = 'violet' }) {
  return (
    <motion.article whileHover={{ y: -4 }} className="metric-card">
      <span className={`metric-chip ${tone}`}>{trend}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </motion.article>
  )
}

function SectionCard({ title, subtitle, children, className = '' }) {
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="ghost-icon" type="button">
          <MoreHorizontal size={18} />
        </button>
      </div>
      {children}
    </motion.section>
  )
}

function ProgressRing({ value, label = 'Current readiness' }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="progress-wrap">
      <div className="progress-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="ring-track" cx="60" cy="60" r={radius} />
          <circle
            className="ring-progress"
            cx="60"
            cy="60"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="progress-center">
          <strong>{value}</strong>
          <span>/100</span>
        </div>
      </div>
      <p>{label}</p>
    </div>
  )
}

function BarTrendChart({ data, barColor = '#8d76ff' }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barCategoryGap={20}>
        <CartesianGrid vertical={false} stroke="#ece7fb" strokeDasharray="3 3" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#7a7590', fontSize: 11 }} />
        <YAxis hide />
        <Tooltip cursor={{ fill: 'transparent' }} />
        <Bar dataKey="value" radius={[14, 14, 4, 4]} fill={barColor} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ScoreTrendPanel() {
  return (
    <SectionCard title="Score Trends" subtitle="Weekly readiness and interview performance.">
      <div className="chart-tabs">
        <button className="chip active" type="button">
          Weekly
        </button>
        <button className="chip" type="button">
          Monthly
        </button>
      </div>
      <div className="chart-frame chart-frame-large">
        <BarTrendChart data={candidateTrend} />
      </div>
    </SectionCard>
  )
}

function LoginIllustration() {
  return (
    <div className="login-illustration">
      <div className="illustration-orb orb-a" />
      <div className="illustration-orb orb-b" />
      <div className="illustration-orb orb-c" />
      <div className="illustration-card image-card">
        <div className="scene-frame">
          <div className="scene-glow" />
          <svg viewBox="0 0 520 620" role="img" aria-label="Student interviewing with AI on computer">
            <defs>
              <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#eff7ff" />
                <stop offset="50%" stopColor="#f9e8ff" />
                <stop offset="100%" stopColor="#fff4d6" />
              </linearGradient>
              <linearGradient id="skinGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f1c9a5" />
                <stop offset="100%" stopColor="#d98f68" />
              </linearGradient>
              <linearGradient id="hairGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2f2a45" />
                <stop offset="100%" stopColor="#6b4fb2" />
              </linearGradient>
              <linearGradient id="screenGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6d5ef4" />
                <stop offset="100%" stopColor="#9e8df7" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="520" height="620" rx="48" fill="url(#bgGrad)" />
            <circle cx="88" cy="112" r="48" fill="#ffffffa8" />
            <circle cx="410" cy="88" r="52" fill="#ffffff8e" />
            <circle cx="444" cy="470" r="64" fill="#f3e5ff" />
            <rect x="54" y="416" width="124" height="42" rx="21" fill="#d8f6df" />
            <rect x="344" y="158" width="118" height="40" rx="20" fill="#ffe7b1" />
            <rect x="344" y="488" width="114" height="38" rx="19" fill="#dbe5ff" />
            <ellipse cx="258" cy="522" rx="148" ry="20" fill="#cfc7f0" opacity=".35" />
            <g transform="translate(122 124)">
              <rect x="72" y="180" width="196" height="148" rx="24" fill="#2f3554" />
              <rect x="86" y="194" width="168" height="100" rx="18" fill="url(#screenGrad)" />
              <rect x="114" y="304" width="112" height="10" rx="5" fill="#6370ab" />
              <rect x="138" y="314" width="64" height="36" rx="12" fill="#6c74b7" />
              <circle cx="170" cy="244" r="26" fill="#f3f7ff" />
              <circle cx="170" cy="244" r="18" fill="#d3dafd" />
              <path d="M95 219 C105 203, 134 190, 170 190 C203 190, 228 202, 240 220 C221 228, 188 236, 170 236 C150 236, 116 228, 95 219 Z" fill="#f7fbff" opacity=".45" />
              <rect x="84" y="320" width="172" height="14" rx="7" fill="#9ba4df" />
            </g>
            <g transform="translate(126 206)">
              <path d="M168 40 C182 26, 204 23, 216 38 C230 55, 232 80, 230 120 C228 157, 216 194, 196 216 C177 239, 145 244, 118 232 C86 219, 76 186, 79 145 C81 110, 102 72, 132 50 C145 40, 158 35, 168 40 Z" fill="url(#skinGrad)" />
              <path d="M123 14 C149 0, 191 3, 211 29 C232 58, 230 98, 220 127 C211 150, 204 165, 200 172 C178 157, 165 142, 154 114 C144 88, 131 57, 123 14 Z" fill="url(#hairGrad)" />
              <path d="M140 86 C154 76, 183 79, 194 96" stroke="#4a355c" strokeWidth="6" strokeLinecap="round" />
              <circle cx="154" cy="120" r="6" fill="#3d2830" />
              <circle cx="188" cy="123" r="6" fill="#3d2830" />
              <path d="M150 147 C163 160, 182 160, 193 148" stroke="#ab5e5a" strokeWidth="5" strokeLinecap="round" fill="none" />
              <path d="M85 244 C104 222, 128 208, 153 206 C173 205, 196 213, 214 230 C219 234, 225 242, 232 255 L248 316 L70 316 Z" fill="#f8fbff" />
              <path d="M92 258 C117 239, 149 233, 182 237 C201 239, 219 248, 230 260" stroke="#dfecff" strokeWidth="12" strokeLinecap="round" fill="none" />
              <rect x="84" y="304" width="164" height="24" rx="12" fill="#99a6de" />
              <rect x="102" y="326" width="128" height="30" rx="14" fill="#6a74bc" />
              <rect x="74" y="352" width="184" height="22" rx="11" fill="#5560a5" />
            </g>
            <g transform="translate(48 88)">
              <circle cx="28" cy="32" r="12" fill="#ffffff" opacity=".9" />
              <rect x="50" y="18" width="118" height="26" rx="13" fill="#ffffff" />
              <circle cx="68" cy="31" r="6" fill="#78d96f" />
              <rect x="80" y="24" width="58" height="12" rx="6" fill="#dad8f3" />
            </g>
            <g transform="translate(332 248)">
              <rect x="0" y="0" width="128" height="90" rx="20" fill="#ffffff" />
              <circle cx="28" cy="30" r="12" fill="#e2f8e4" />
              <path d="M22 30 L27 35 L36 23" stroke="#50c24a" strokeWidth="4" strokeLinecap="round" fill="none" />
              <rect x="48" y="22" width="58" height="10" rx="5" fill="#e8e6f8" />
              <rect x="48" y="40" width="42" height="8" rx="4" fill="#d6d1f6" />
              <rect x="16" y="62" width="96" height="8" rx="4" fill="#eef0ff" />
            </g>
            <g transform="translate(62 492)">
              <rect x="0" y="0" width="140" height="38" rx="19" fill="#ffffff" />
              <circle cx="20" cy="19" r="9" fill="#50c24a" />
              <rect x="38" y="14" width="68" height="10" rx="5" fill="#dfe5ff" />
            </g>
          </svg>
        </div>
      </div>
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 5 }}
        className="floating-card floating-score"
      >
        <span>AI Score</span>
        <strong>92</strong>
        <small>Interview-ready</small>
      </motion.div>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 4.4 }}
        className="floating-card floating-resume"
      >
        <FileText size={18} />
        <div>
          <span>Resume Analysis</span>
          <strong>14 signals extracted</strong>
        </div>
      </motion.div>
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 4.9 }}
        className="floating-card floating-confidence"
      >
        <MessageSquareText size={18} />
        <div>
          <span>Speech Analysis</span>
          <strong>Clear and steady</strong>
        </div>
      </motion.div>
    </div>
  )
}

function Login() {
  const navigate = useNavigate()
  const [role, setRole] = React.useState('Candidate')

  return (
    <main className="login-page">
      <section className="login-hero">
        <Logo />
        <div className="login-kicker">
          <Sparkles size={14} />
          AI Interview Preparation
        </div>
        <h1>Practice. Learn. Walk into the interview ready.</h1>
        <p>
          SmartHire AI helps you rehearse interviews, measure confidence, and prepare with role-aware feedback that
          keeps future features ready for the PDF roadmap.
        </p>
        <LoginIllustration />
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-brand">
            <Logo />
          </div>
          <h2>Welcome Back</h2>
          <p className="login-subtitle">Your AI Career Coach</p>

          <div className="role-switcher">
            {Object.keys(rolePaths).map((item) => (
              <button className={role === item ? 'selected' : ''} key={item} onClick={() => setRole(item)} type="button">
                {item}
              </button>
            ))}
          </div>

          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault()
              navigate(rolePaths[role])
            }}
          >
            <label>
              Email
              <input type="email" placeholder="name@company.com" required />
            </label>
            <label>
              Password
              <div className="password-row">
                <input type="password" placeholder="••••••••" required />
                <button type="button">Show</button>
              </div>
            </label>
            <div className="login-meta">
              <label className="remember">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#forgot">Forgot password?</a>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} className="primary-button" type="submit">
              Sign in
              <ChevronRight size={18} />
            </motion.button>
          </form>

          <div className="divider">
            <span>or continue with</span>
          </div>

          <button className="google-button" type="button">
            Continue with Google
          </button>

          <p className="signup">
            Don&apos;t have an account? <a href="#create">Create Account</a>
          </p>

          <div className="security-badges">
            <span>
              <ShieldCheck size={14} />
              JWT Authentication
            </span>
            <span>
              <LockBadge />
              Secure Login
            </span>
            <span>
              <Zap size={14} />
              AI Powered Assessment
            </span>
          </div>
        </div>
      </section>
    </main>
  )
}

function LockBadge() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="10" width="12" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10V8a4 4 0 1 1 8 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="14.5" r="1.1" fill="currentColor" />
    </svg>
  )
}

function CandidateDashboard() {
  return (
    <Shell navItems={candidateNav} role="Candidate" title="Welcome back, Alex" subtitle="Candidate workspace">
      <section className="dashboard-grid candidate-grid">
        <div className="dashboard-main">
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="hero-card candidate-hero">
            <div className="hero-copy">
              <span className="eyebrow">YOUR NEXT PRACTICE SESSION</span>
              <h2>Your next great interview starts here.</h2>
              <p>Measure readiness, sharpen answers, and keep future assessment modules ready for later integration.</p>
              <div className="hero-actions">
                <button className="dark-button" type="button">
                  <Play size={16} fill="currentColor" />
                  Start Interview
                </button>
                <button className="outline-button" type="button">
                  <Upload size={16} />
                  Upload Resume
                </button>
              </div>
            </div>
            <div className="hero-metrics">
              {[
                ['Current readiness', '85'],
                ['Next interview', '10:30 AM'],
                ['Confidence', '90'],
                ['Tech score', '72'],
                ['Soft skills', '95'],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </motion.section>

          <div className="action-row">
            {[
              { icon: Upload, label: 'Upload Resume' },
              { icon: Play, label: 'Start Interview' },
              { icon: Users, label: 'HR Round' },
              { icon: Laptop, label: 'Technical Round' },
              { icon: MessageSquareText, label: 'Behavioural Round' },
              { icon: LayoutList, label: 'Aptitude Round' },
            ].map(({ icon: Icon, label }) => (
              <button className="action-card" key={label} type="button">
                <span className="action-icon">
                  <Icon size={18} />
                </span>
                <strong>{label}</strong>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>

          <div className="content-grid">
            <ScoreTrendPanel />

            <SectionCard title="Interview history" subtitle="Recent AI scored mock sessions.">
              <div className="history-table">
                {[
                  { name: 'Frontend System Design', time: 'Today · 10:30 AM', score: 86, type: 'Technical' },
                  { name: 'Communication Drill', time: 'Jul 23 · 3:00 PM', score: 79, type: 'HR' },
                  { name: 'Behavioural Round', time: 'Jul 20 · 11:45 AM', score: 82, type: 'Behavioural' },
                  { name: 'Aptitude Check', time: 'Jul 18 · 9:00 AM', score: 88, type: 'Aptitude' },
                ].map((row) => (
                  <div className="history-row" key={row.name}>
                    <span className="history-avatar">
                      <Video size={16} />
                    </span>
                    <div>
                      <strong>{row.name}</strong>
                      <span>{row.time}</span>
                    </div>
                    <span className="type-pill">{row.type}</span>
                    <b>{row.score}</b>
                    <ChevronRight size={16} />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Recent AI feedback" subtitle="What to keep building on next.">
              <div className="feedback-list">
                <div>
                  <span className="good-tag">Strengths</span>
                  <p>Clear structure, strong technical framing, and confident delivery on system tradeoffs.</p>
                </div>
                <div>
                  <span className="warn-tag">Weaknesses</span>
                  <p>Add more quantified impact and slow down slightly when explaining edge cases.</p>
                </div>
                <div>
                  <span className="info-tag">Recommendations</span>
                  <p>Try the behavioral template and revisit the resume insights before the next round.</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Learning resources" subtitle="Built for the future PDF modules.">
              <div className="resource-grid">
                {[
                  ['Mock Interview Engine', ScanSearch],
                  ['Confidence Tracking', BarChart3],
                  ['Speech Analysis', Headphones],
                  ['Resume Scoring', PenTool],
                ].map(([label, Icon]) => (
                  <div className="resource-card" key={label}>
                    <Icon size={18} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>

        <aside className="dashboard-side">
          <SectionCard title="Circular readiness score" subtitle="Based on the last 12 sessions." className="ring-panel">
            <ProgressRing value={85} />
            <div className="mini-note">
              <Sparkles size={16} />
              You are in the top 18% of active candidates this week.
            </div>
          </SectionCard>

          <SectionCard title="Interview streak" subtitle="Keep the momentum going.">
            <div className="streak-card">
              <strong>6 days</strong>
              <span>Longest streak: 14 days</span>
            </div>
            <div className="week-strip">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                <span className={index < 6 ? 'done' : ''} key={day}>
                  {index < 6 ? <Check size={12} /> : day}
                </span>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Upcoming tasks" subtitle="What to do next.">
            <div className="task-list">
              <div className="task-row">
                <CalendarDays size={16} />
                <div>
                  <strong>HR interview practice</strong>
                  <span>Tomorrow · 4:00 PM</span>
                </div>
              </div>
              <div className="task-row">
                <FileText size={16} />
                <div>
                  <strong>Review resume feedback</strong>
                  <span>2 recommendations pending</span>
                </div>
              </div>
            </div>
          </SectionCard>
        </aside>
      </section>
    </Shell>
  )
}

function RecruiterDashboard() {
  return (
    <Shell navItems={recruiterNav} role="Recruiter" title="Recruitment Insights" subtitle="Recruiter workspace">
      <section className="dashboard-grid recruiter-grid">
        <div className="dashboard-main">
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="hero-card recruiter-hero">
            <div>
              <span className="eyebrow">Unified view of hiring ecosystem and intelligence metrics</span>
              <h2>Understand the talent pipeline at a glance.</h2>
              <p>See candidates, interviews, and quality signals in one premium workspace built for future hiring modules.</p>
            </div>
            <div className="hero-actions">
              <button className="outline-button" type="button">
                <Download size={16} />
                Benchmark
              </button>
              <button className="dark-button" type="button">
                <CalendarDays size={16} />
                Schedule
              </button>
            </div>
          </motion.section>

          <div className="metric-row">
            {recruiterInsights.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <div className="content-grid recruiter-content">
            <SectionCard title="Candidate velocity" subtitle="Ready-to-hire candidates across the pipeline.">
              <div className="chart-switch">
                <button className="chip active" type="button">
                  Day
                </button>
                <button className="chip" type="button">
                  Month
                </button>
              </div>
              <div className="chart-frame chart-frame-large">
                <BarTrendChart data={activityData} barColor="#8c7bf8" />
              </div>
            </SectionCard>

            <SectionCard title="Priority talent pool" subtitle="Fast-access shortlist for current roles.">
              <div className="pool-list">
                {recruiterCandidates.map((candidate) => (
                  <div className="pool-row" key={candidate.name}>
                    <Avatar initials={candidate.initials} />
                    <div className="pool-copy">
                      <strong>{candidate.name}</strong>
                      <span>{candidate.title}</span>
                    </div>
                    <span className={`status-pill ${candidate.status.toLowerCase()}`}>{candidate.status}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Hiring funnel" subtitle="Where candidates are moving next.">
              <div className="funnel-list">
                {[
                  ['Applied', 148, 100],
                  ['Screened', 92, 72],
                  ['Interviewed', 56, 52],
                  ['Offer', 18, 26],
                ].map(([label, count, size]) => (
                  <div className="funnel-row" key={label}>
                    <div>
                      <strong>{label}</strong>
                      <span>{count} candidates</span>
                    </div>
                    <div className="funnel-bar">
                      <i className={`funnel-fill size-${size}`} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Skill distribution" subtitle="Signals from active applicants.">
              <div className="skill-list">
                {[
                  ['React', 94],
                  ['Communication', 89],
                  ['System Design', 86],
                  ['Problem Solving', 83],
                ].map(([skill, score]) => (
                  <div className="skill-row" key={skill}>
                    <span>{skill}</span>
                    <div className="skill-track">
                      <i className={`skill-fill width-${score}`} />
                    </div>
                    <strong>{score}%</strong>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>

        <aside className="dashboard-side">
          <SectionCard title="Top candidate" subtitle="Most likely to clear the final round." className="candidate-profile">
            <div className="candidate-card">
              <Avatar initials="SJ" size="lg" />
              <div>
                <strong>Sarah Jenkins</strong>
                <span>Frontend Engineer</span>
              </div>
            </div>
            <div className="candidate-grid-stats">
              <div>
                <span>Resume match</span>
                <strong>94%</strong>
              </div>
              <div>
                <span>Communication</span>
                <strong>89</strong>
              </div>
              <div>
                <span>Confidence</span>
                <strong>92</strong>
              </div>
              <div>
                <span>Technical</span>
                <strong>96</strong>
              </div>
            </div>
            <div className="match-meter">
              <span>Hire probability</span>
              <strong>96%</strong>
            </div>
            <div className="profile-actions">
              <button type="button">View Profile</button>
              <button type="button">Compare</button>
            </div>
          </SectionCard>

          <SectionCard title="Upcoming actions" subtitle="Move candidates forward.">
            <div className="task-list">
              <div className="task-row">
                <Download size={16} />
                <div>
                  <strong>Download report</strong>
                  <span>For the top 10 shortlisted candidates</span>
                </div>
              </div>
              <div className="task-row">
                <CalendarDays size={16} />
                <div>
                  <strong>Schedule interviews</strong>
                  <span>3 pending interview slots</span>
                </div>
              </div>
            </div>
          </SectionCard>
        </aside>
      </section>
    </Shell>
  )
}

function AdminDashboard() {
  return (
    <Shell navItems={adminNav} role="Admin" title="System Intelligence" subtitle="Admin workspace">
      <section className="dashboard-grid admin-grid">
        <div className="dashboard-main">
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="hero-card admin-hero">
            <div>
              <span className="eyebrow">Advanced orchestration and real-time behavioral insights</span>
              <h2>Monitor the platform like an operations command center.</h2>
              <p>Analytics, usage, and service health are shown here so the backend modules can land without changing the UI.</p>
            </div>
            <button className="outline-button" type="button">
              <ScanSearch size={16} />
              Export Intelligence
            </button>
          </motion.section>

          <div className="metric-row">
            {adminMetrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <div className="content-grid admin-content">
            <SectionCard title="Activity velocity" subtitle="Cumulative action across the platform.">
              <div className="chart-frame chart-frame-large">
                <BarTrendChart data={activityData} barColor="#b39df8" />
              </div>
            </SectionCard>

            <SectionCard title="Inference stack" subtitle="Connected AI services and platform health.">
              <div className="system-list">
                {adminSystems.map((system) => (
                  <div className="system-row" key={system.name}>
                    <div className={`system-dot ${system.tone}`} />
                    <div className="system-copy">
                      <strong>{system.name}</strong>
                      <span>{system.status}</span>
                    </div>
                    <b>{system.value}</b>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Platform growth" subtitle="Monthly adoption and usage.">
              <div className="chart-frame chart-frame-medium">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyGrowth}>
                    <defs>
                      <linearGradient id="adminGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8e78ff" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#8e78ff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#efeafc" strokeDasharray="3 3" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#7a7590', fontSize: 11 }} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Area type="monotone" dataKey="value" stroke="#8e78ff" strokeWidth={3} fill="url(#adminGrowth)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Recent access logs" subtitle="Live operational activity from the platform.">
              <div className="log-list">
                {[
                  ['Jane Doe', 'Senior Recruiter', 'Allowed', '02:14 PM'],
                  ['Mark Ryan', 'System Admin', 'Allowed', '01:35 PM'],
                  ['Sarah Ali', 'Lead Engineer', 'Review', '3 days ago'],
                ].map(([name, role, clearance, time]) => (
                  <div className="log-row" key={name}>
                    <Avatar initials={name.split(' ').map((part) => part[0]).join('')} />
                    <div className="log-copy">
                      <strong>{name}</strong>
                      <span>{role}</span>
                    </div>
                    <span className="status-pill reviewing">{clearance}</span>
                    <b>{time}</b>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>

        <aside className="dashboard-side">
          <SectionCard title="Live activity" subtitle="This week’s system pulse." className="activity-panel">
            <div className="live-card">
              <PieChartIcon size={20} />
              <div>
                <strong>Platform usage</strong>
                <span>29.4k active sessions</span>
              </div>
            </div>
            <div className="activity-ring">
              <ProgressRing value={99} label="System health" />
            </div>
          </SectionCard>

          <SectionCard title="Service status" subtitle="Future integrations are already anticipated.">
            <div className="service-grid">
              {[
                ['OpenAI API', 'Online'],
                ['Whisper', 'Online'],
                ['Eye Tracking', 'Online'],
                ['Emotion Detection', 'Online'],
                ['Database', 'Online'],
                ['AWS', 'Online'],
              ].map(([label, status]) => (
                <div className="service-card" key={label}>
                  <span>{label}</span>
                  <strong>{status}</strong>
                </div>
              ))}
            </div>
          </SectionCard>
        </aside>
      </section>
    </Shell>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/candidate" element={<CandidateDashboard />} />
        <Route path="/recruiter" element={<RecruiterDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
