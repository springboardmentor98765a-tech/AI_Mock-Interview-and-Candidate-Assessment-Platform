import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Brain, LayoutDashboard, Users, Calendar, BarChart3,
  Settings, LogOut, FileText, Mic, Upload, Bell, ChevronDown,
  Shield, UserCheck, User, TrendingUp
} from 'lucide-react'

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

export default function Sidebar({ role }) {
  const navigate = useNavigate()
  const config = NAV_CONFIG[role] || NAV_CONFIG.candidate
  const RoleIcon = ROLE_ICONS[role] || User
  const [active, setActive] = useState(0)

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.4)'
          }}>
            <Brain size={20} color="white" />
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
              onClick={() => setActive(idx)}
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
    </aside>
  )
}
