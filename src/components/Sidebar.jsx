import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Brain, LayoutDashboard, Users, Calendar, BarChart3,
  Settings, LogOut, FileText, Mic, Upload, Bell, ChevronDown,
  Shield, UserCheck, User, TrendingUp, Video
} from 'lucide-react'
import { candidateApi, recruiterApi } from '../auth/api'

const NAV_CONFIG = {
  candidate: {
    label: 'Candidate',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, #22c55e, #06b6d4)',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',    path: '/dashboard/candidate' },
      { icon: Mic,            label: 'Start Interview', path: '/dashboard/candidate' },
      { icon: Upload,         label: 'Upload Resume',   path: '/dashboard/candidate' },
      { icon: BarChart3,      label: 'My Reports',      path: '/dashboard/candidate' },
      { icon: FileText,       label: 'History',         path: '/dashboard/candidate' },
    ],
  },
  recruiter: {
    label: 'Recruiter',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1, #a855f7)',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',     path: '/dashboard/recruiter' },
      { icon: Users,           label: 'Candidates',    path: '/dashboard/recruiter' },
      { icon: Calendar,        label: 'Schedule',      path: '/dashboard/recruiter' },
      { icon: BarChart3,       label: 'Reports',       path: '/dashboard/recruiter' },
      { icon: TrendingUp,      label: 'Analytics',     path: '/dashboard/recruiter' },
    ],
  },
  admin: {
    label: 'Admin',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',    path: '/dashboard/admin' },
      { icon: Users,           label: 'All Users',    path: '/dashboard/admin' },
      { icon: UserCheck,       label: 'Recruiters',   path: '/dashboard/admin' },
      { icon: BarChart3,       label: 'Analytics',    path: '/dashboard/admin' },
      { icon: Settings,        label: 'Settings',     path: '/dashboard/admin' },
    ],
  },
}

const ROLE_ICONS = { candidate: User, recruiter: Users, admin: Shield }

export default function Sidebar({ role, onNavigate }) {
  const navigate = useNavigate()
  const config = NAV_CONFIG[role] || NAV_CONFIG.candidate
  const RoleIcon = ROLE_ICONS[role] || User
  const [active, setActive] = useState(0)
  const [modal, setModal] = useState('')

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.2)',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <img src="/favicon.svg" alt="SmartHire AI logo" width="24" height="24" style={{ display: 'block' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#f0f0ff', lineHeight: 1.1 }}>SmartHire</div>
            <div style={{ fontSize: '0.65rem', color: '#6366f1', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>AI Platform</div>
          </div>
        </div>
      </div>

      {/* Role Badge */}
      <div style={{ padding: '12px 24px 8px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: `${config.color}18`,
          border: `1px solid ${config.color}30`,
          borderRadius: 8, padding: '8px 12px'
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: config.gradient
          }}>
            <RoleIcon size={14} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#606080', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Signed in as</div>
            <div style={{ fontSize: '0.8rem', color: config.color, fontWeight: 700 }}>{config.label}</div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {config.items.map((item, idx) => {
          const Icon = item.icon
          return (
            <button
              key={idx}
              className={`sidebar-nav-item ${active === idx ? 'active' : ''}`}
              onClick={() => {
                setActive(idx)
                if (role === 'recruiter' && ['Candidates', 'Reports'].includes(item.label)) setModal('leaderboard')
                else if (onNavigate) onNavigate(item.label)
                else navigate(item.path)
              }}
            >
              <Icon size={17} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className="sidebar-nav-item"
          onClick={() => navigate('/login')}
          style={{ color: '#ef4444', width: '100%' }}
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
      {modal === 'leaderboard' && <RecruiterLeaderboard onClose={() => setModal('')} />}
      {modal === 'history' && <CandidateHistory onClose={() => setModal('')} />}
    </aside>
  )
}

function RecruiterLeaderboard({ onClose }) {
  const [items, setItems] = useState([]); const [error, setError] = useState('')
  useEffect(() => { recruiterApi.interviewHistory().then(setItems).catch((err) => setError(err.message)) }, [])
  return <Overlay title="Candidate interview leaderboard" onClose={onClose}>{error ? <p style={errorStyle}>{error}</p> : !items.length ? <p style={muted}>No completed mock interviews yet.</p> : <div style={{ display: 'grid', gap: 10 }}>{items.map((item) => <div key={item.id} style={entry}><div><strong style={{ color: '#f0f0ff' }}>{item.rank ? `#${item.rank} ` : ''}{item.candidate_name}</strong><p style={muted}>{item.role_title} · {item.domain} · {new Date(item.ended_at || item.created_at).toLocaleString()}</p><p style={{ ...muted, marginTop: 6 }}>{item.feedback?.summary || 'No AI report available.'}</p></div><div style={{ textAlign: 'right' }}><strong style={{ color: '#67e8f9', fontSize: '1.2rem' }}>{item.feedback?.overall_score ?? '—'}/100</strong>{item.has_recording && <button className="btn btn-outline btn-sm" style={{ marginTop: 9 }} onClick={() => recruiterApi.openInterviewRecording(item.id).catch((err) => setError(err.message))}><Video size={13} /> See video</button>}</div></div>)}</div>}</Overlay>
}

function CandidateHistory({ onClose }) {
  const [items, setItems] = useState([]); const [error, setError] = useState('')
  useEffect(() => { candidateApi.interviews().then(setItems).catch((err) => setError(err.message)) }, [])
  return <Overlay title="My interview history" onClose={onClose}>{error ? <p style={errorStyle}>{error}</p> : !items.length ? <p style={muted}>You have not completed a mock interview yet.</p> : <div style={{ display: 'grid', gap: 10 }}>{items.map((item) => <div key={item.id} style={entry}><div><strong style={{ color: '#f0f0ff' }}>{item.role_title}</strong><p style={muted}>{item.domain} · {item.difficulty} · {new Date(item.ended_at || item.created_at).toLocaleString()}</p><p style={{ ...muted, marginTop: 6 }}>{item.feedback?.summary || 'Interview in progress or no report yet.'}</p></div><div style={{ textAlign: 'right' }}><strong style={{ color: '#67e8f9', fontSize: '1.2rem' }}>{item.feedback?.overall_score ?? '—'}/100</strong>{item.has_recording && <button className="btn btn-outline btn-sm" style={{ marginTop: 9 }} onClick={() => candidateApi.openInterviewRecording(item.id).catch((err) => setError(err.message))}><Video size={13} /> See video</button>}</div></div>)}</div>}</Overlay>
}

function Overlay({ title, onClose, children }) { return <div style={overlay}><div className="glass-strong" style={modalCard}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}><h3 style={{ color: '#f0f0ff', fontFamily: 'Outfit' }}>{title}</h3><button type="button" onClick={onClose} style={{ background: 'transparent', color: '#a0a0c0' }}><X /></button></div>{children}</div></div> }
const overlay = { position: 'fixed', inset: 0, zIndex: 3000, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(6px)' }; const modalCard = { width: 'min(860px, 100%)', maxHeight: '82vh', overflowY: 'auto', borderRadius: 20, padding: 24 }; const entry = { display: 'flex', justifyContent: 'space-between', gap: 16, padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.03)' }; const muted = { color: '#a0a0c0', fontSize: '.78rem', lineHeight: 1.45 }; const errorStyle = { color: '#f87171' }
