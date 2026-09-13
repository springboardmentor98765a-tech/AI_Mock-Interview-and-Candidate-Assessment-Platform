import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import {
  Users, UserCheck, Briefcase, FileText, Activity, Shield,
  Server, Database, Brain, Cpu, BarChart3, TrendingUp,
  Eye, Settings, ChevronUp, ChevronDown, Search, X,
  CheckCircle, Ban, Lock, Key, AlertTriangle, Clock,
  RefreshCw, Download, Send, Zap, Radio, Bell, Globe,
  UserPlus, Calendar, GitBranch, Layers, Monitor, Wifi,
  WifiOff, AlertCircle, Info, Award, Target,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'
import {
  fetchAdminStats,
  fetchUsers,
  updateUserRole,
  toggleUserStatus,
  fetchInterviewActivity,
  fetchAiMonitoring,
  fetchSystemHealth,
  fetchUsageAnalytics,
  fetchRecentActivity,
} from '../services/adminApi'
import reportApi from '../services/reportApi'

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED UTILITY COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

function StatusBadge({ status }) {
  const map = {
    Active: 'green', Blocked: 'red', Pending: 'orange',
    Complete: 'green', Review: 'orange',
  }
  return <span className={`badge ${map[status] || 'gray'}`}>{status}</span>
}

function RoleBadge({ role }) {
  const map = { ADMIN: 'purple', RECRUITER: 'blue', USER: 'gray' }
  const label = role === 'USER' ? 'Candidate' : role
  return <span className={`badge ${map[role] || 'gray'}`}>{label}</span>
}

function ProviderBadge({ provider }) {
  const p = (provider || 'LOCAL').toUpperCase()
  const map = { LOCAL: 'gray', GOOGLE: 'red', GITHUB: 'blue' }
  return <span className={`badge ${map[p] || 'gray'}`} style={{ fontSize: 10 }}>{p}</span>
}

/* ── Skeleton shimmer ──────────────────────────────────────────────────────── */
function Skeleton({ height = 20, width = '100%', style = {} }) {
  return (
    <div style={{
      height, width, borderRadius: 6, flexShrink: 0,
      background: 'linear-gradient(90deg,var(--bg-primary) 25%,var(--border) 50%,var(--bg-primary) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...style,
    }} />
  )
}

/* ── Toast (success + error variants) ─────────────────────────────────────── */
function Toast({ msg, type = 'success', onClose }) {
  const isErr = type === 'error'
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,   scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.97 }}
          style={{
            position: 'fixed', top: 20, right: 20, zIndex: 9999,
            background: 'var(--bg-card)',
            border: `1px solid ${isErr ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.35)'}`,
            borderRadius: 'var(--radius)',
            padding: '12px 18px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex', alignItems: 'center',
            gap: 10, minWidth: 280, maxWidth: 420,
          }}
        >
          {isErr
            ? <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
            : <CheckCircle  size={16} style={{ color: '#10b981', flexShrink: 0 }} />
          }
          <span style={{ fontSize: 14, color: 'var(--text-primary)', flex: 1 }}>{msg}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={15} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Error banner ──────────────────────────────────────────────────────────── */
function ErrorBanner({ msg, onRetry }) {
  return (
    <div style={{
      padding: '12px 16px',
      background: 'rgba(239,68,68,0.07)',
      border: '1px solid rgba(239,68,68,0.25)',
      borderRadius: 'var(--radius-sm)',
      color: '#ef4444',
      display: 'flex', alignItems: 'center', gap: 10,
      marginBottom: 16, fontSize: 13,
    }}>
      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{msg}</span>
      {onRetry && (
        <button onClick={onRetry} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 12, fontWeight: 600, color: '#ef4444',
          background: 'none', border: '1px solid #ef4444',
          borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
        }}>
          <RefreshCw size={11} /> Retry
        </button>
      )}
    </div>
  )
}

/* ── Section header with refresh control ──────────────────────────────────── */
function SectionHeader({ title, subtitle, onRefresh, loading, lastUpdated, badge }) {
  const timeLabel = lastUpdated
    ? `Updated ${Math.round((Date.now() - lastUpdated) / 60000)}m ago`
    : null

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {badge}
        {timeLabel && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeLabel}</span>}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
              background: 'var(--bg-primary)', border: '1px solid var(--border)',
              borderRadius: 7, padding: '5px 10px', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Confirm modal ─────────────────────────────────────────────────────────── */
function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-xl)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {danger ? <AlertTriangle size={18} color="#ef4444" /> : <Info size={18} color="#6366f1" />}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h3>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 22 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ background: danger ? '#ef4444' : undefined, borderColor: danger ? '#ef4444' : undefined }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ── User detail modal ─────────────────────────────────────────────────────── */
function ViewModal({ user, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>User Details</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, padding: '14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
            {(user.name || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{user.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</div>
          </div>
        </div>
        {[
          ['Role',     <RoleBadge role={user.role} />],
          ['Status',   <StatusBadge status={user.status} />],
          ['Provider', <ProviderBadge provider={user.provider} />],
          ['Joined',   user.joined],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{k}</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
          </div>
        ))}
        <button className="btn btn-outline" style={{ marginTop: 20, width: '100%' }} onClick={onClose}>Close</button>
      </motion.div>
    </div>
  )
}

/* ── Role-change modal ─────────────────────────────────────────────────────── */
function RoleModal({ user, onClose, onSave }) {
  const [role, setRole] = useState(user.role)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Change Role — {user.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>
        </div>
        <div className="form-field" style={{ marginBottom: 14 }}>
          <label>New Role</label>
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="ADMIN">Admin</option>
            <option value="RECRUITER">Recruiter</option>
            <option value="USER">Candidate</option>
          </select>
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
          ℹ️ Role changes take effect immediately and are saved to the database.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(role)} disabled={role === user.role}>Save Role</button>
        </div>
      </motion.div>
    </div>
  )
}

/* ── User table ────────────────────────────────────────────────────────────── */
function UserTable({ data, total, page, setPage, pageSize, loading, onView, onManage, onToggle, search, setSearch }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pages = []
  for (let i = 1; i <= Math.min(totalPages, 7); i++) pages.push(i)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            style={{ width: '100%', paddingLeft: 32, height: 36, border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            placeholder="Search name or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <span className="badge gray">{total.toLocaleString()} total</span>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead><tr>
            <th>User</th>
            <th>Email</th>
            <th>Role</th>
            <th>Provider</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[0,1,2,3].map(i => <Skeleton key={i} height={32} />)}
                  </div>
                </td></tr>
              : data.length === 0
                ? <tr><td colSpan={7}>
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      <Users size={32} style={{ margin: '0 auto 10px', opacity: 0.3, display: 'block' }} />
                      <div style={{ fontSize: 14, fontWeight: 500 }}>No users found</div>
                      {search && <div style={{ fontSize: 12, marginTop: 4 }}>Try a different search term</div>}
                    </div>
                  </td></tr>
                : data.map((u, i) => (
                  <tr key={u.id || i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                          {(u.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{u.email}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td><ProviderBadge provider={u.provider} /></td>
                    <td><StatusBadge status={u.status} /></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.joined}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => onView(u)} title="View details">
                          <Eye size={12} />
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => onManage(u)} title="Change role">
                          <Settings size={12} />
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => onToggle(u)}
                          title={u.status === 'Active' ? 'Block user' : 'Activate user'}
                          style={{
                            color: u.status === 'Active' ? '#ef4444' : '#10b981',
                            border: `1px solid ${u.status === 'Active' ? '#ef4444' : '#10b981'}`,
                            background: 'transparent', borderRadius: 6,
                            padding: '4px 8px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 3, fontSize: 12,
                          }}
                        >
                          {u.status === 'Active' ? <Ban size={12} /> : <CheckCircle size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <span className="pagination-info">
          {total === 0 ? 'No results' : `${(page-1)*pageSize+1}–${Math.min(page*pageSize,total)} of ${total}`}
        </span>
        <div className="pagination-btns">
          <button className={`page-btn ${page===1?'disabled':''}`} onClick={() => setPage(p => Math.max(1,p-1))}>← Prev</button>
          {pages.map(n => (
            <button key={n} className={`page-btn ${page===n?'active':''}`} onClick={() => setPage(n)}>{n}</button>
          ))}
          {totalPages > 7 && <span style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: 12 }}>…{totalPages}</span>}
          <button className={`page-btn ${page===totalPages?'disabled':''}`} onClick={() => setPage(p => Math.min(totalPages,p+1))}>Next →</button>
        </div>
      </div>
    </>
  )
}

/* ── KPI stat card ─────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, icon, color, loading }) {
  const colorMap = {
    purple: { bg: 'rgba(99,102,241,0.1)',  fg: '#6366f1' },
    blue:   { bg: 'rgba(14,165,233,0.1)',  fg: '#0ea5e9' },
    green:  { bg: 'rgba(16,185,129,0.1)',  fg: '#10b981' },
    orange: { bg: 'rgba(249,115,22,0.1)',  fg: '#f97316' },
    red:    { bg: 'rgba(239,68,68,0.1)',   fg: '#ef4444' },
    teal:   { bg: 'rgba(20,184,166,0.1)',  fg: '#14b8a6' },
    indigo: { bg: 'rgba(99,102,241,0.12)', fg: '#818cf8' },
    amber:  { bg: 'rgba(245,158,11,0.1)',  fg: '#f59e0b' },
  }
  const c = colorMap[color] || colorMap.purple
  return (
    <div className="admin-kpi-card">
      {loading
        ? <>
            <Skeleton height={38} width={38} style={{ borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1 }}><Skeleton height={22} width="55%" /><Skeleton height={12} width="75%" style={{ marginTop: 6 }} /></div>
          </>
        : <>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {value ?? '—'}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
              {sub != null && <div style={{ fontSize: 11, color: c.fg, marginTop: 1 }}>{sub}</div>}
            </div>
          </>
      }
    </div>
  )
}

/* ── Health indicator row ──────────────────────────────────────────────────── */
function HealthRow({ icon, label, value, status, ok }) {
  const color = ok === true ? '#10b981' : ok === false ? '#ef4444' : '#f59e0b'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{status}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color, flexShrink: 0 }}>{value}</div>
    </div>
  )
}

/* ── Activity timeline event ───────────────────────────────────────────────── */
function ActivityEvent({ event }) {
  const map = {
    registration:        { icon: <UserPlus size={14} />,   color: '#6366f1', label: 'Joined the platform' },
    interview_completed: { icon: <CheckCircle size={14} />, color: '#10b981', label: 'Completed interview' },
    interview_started:   { icon: <Radio size={14} />,       color: '#0ea5e9', label: 'Started interview' },
  }
  const m = map[event.eventType] || { icon: <Activity size={14} />, color: '#94a3b8', label: event.eventType }
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)', alignItems: 'flex-start' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${m.color}18`, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        {m.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
          <strong>{event.actor}</strong>
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> — {m.label}</span>
          {event.detail && event.eventType !== 'registration' && (
            <span style={{ color: 'var(--text-secondary)' }}> · {event.detail}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{event.timeAgo}</div>
      </div>
      <RoleBadge role={event.role} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
function AdminDashboard() {
  const navigate = useNavigate()

  /* ── Navigation ─────────────────────────────────────────────────────────── */
  const [activeSection, setActiveSection] = useState('dashboard')

  /* ── Toast ──────────────────────────────────────────────────────────────── */
  const [toast, setToast] = useState({ msg: '', type: 'success' })
  const showToast  = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast({ msg: '', type }), 3800) }
  const showError  = msg => showToast(msg, 'error')

  /* ── Confirm dialog ─────────────────────────────────────────────────────── */
  const [confirm, setConfirm] = useState(null) // { title, message, onConfirm }

  /* ── Modals ─────────────────────────────────────────────────────────────── */
  const [viewUser,   setViewUser]   = useState(null)
  const [manageUser, setManageUser] = useState(null)

  /* ── User table state ───────────────────────────────────────────────────── */
  const [users,        setUsers]        = useState([])
  const [userTotal,    setUserTotal]    = useState(0)
  const [userPage,     setUserPage]     = useState(1)
  const [userSearch,   setUserSearch]   = useState('')
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError,   setUsersError]   = useState(null)
  const [usersUpdated, setUsersUpdated] = useState(null)
  const PAGE_SIZE = 10

  /* Current role filter — driven by section */
  const roleForSection = s => s === 'recruiters' ? 'RECRUITER' : s === 'candidates' ? 'USER' : ''

  /* ── Data state (each section independent) ──────────────────────────────── */
  const mkState = () => ({ data: null, loading: false, error: null, updated: null })
  const [stats,    setStats]    = useState(mkState())
  const [activity, setActivity] = useState(mkState())
  const [ai,       setAi]       = useState(mkState())
  const [health,   setHealth]   = useState(mkState())
  const [usage,    setUsage]    = useState(mkState())
  const [recentAct,setRecentAct]= useState(mkState())

  /* ── Report download state ──────────────────────────────────────────────── */
  const [reportDl, setReportDl] = useState(null) // 'pdf' | 'csv' | null

  /* ── Broadcast state ────────────────────────────────────────────────────── */
  const [broadcastForm,    setBroadcastForm]    = useState({ target: 'ALL_CANDIDATES', title: '', message: '' })
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [broadcastResult,  setBroadcastResult]  = useState(null) // { success, msg }
  const [broadcastConfirm, setBroadcastConfirm] = useState(false)

  /* ═══ Fetch helpers ══════════════════════════════════════════════════════ */
  const loadStats = useCallback(async () => {
    setStats(s => ({ ...s, loading: true, error: null }))
    try {
      const d = await fetchAdminStats()
      setStats({ data: d, loading: false, error: null, updated: Date.now() })
    } catch (e) {
      setStats(s => ({ ...s, loading: false, error: e.message }))
    }
  }, [])

  const loadUsers = useCallback(async (page = userPage, search = userSearch, section = activeSection) => {
    setUsersLoading(true); setUsersError(null)
    try {
      const d = await fetchUsers({ page, pageSize: PAGE_SIZE, search, role: roleForSection(section) })
      setUsers(d.users || [])
      setUserTotal(d.total || 0)
      setUsersUpdated(Date.now())
    } catch (e) {
      setUsersError(e.message)
    } finally {
      setUsersLoading(false)
    }
  }, [userPage, userSearch, activeSection])  // eslint-disable-line react-hooks/exhaustive-deps

  const loadActivity = useCallback(async () => {
    setActivity(s => ({ ...s, loading: true, error: null }))
    try {
      const d = await fetchInterviewActivity()
      setActivity({ data: d, loading: false, error: null, updated: Date.now() })
    } catch (e) {
      setActivity(s => ({ ...s, loading: false, error: e.message }))
    }
  }, [])

  const loadAi = useCallback(async () => {
    setAi(s => ({ ...s, loading: true, error: null }))
    try {
      const d = await fetchAiMonitoring()
      setAi({ data: d, loading: false, error: null, updated: Date.now() })
    } catch (e) {
      setAi(s => ({ ...s, loading: false, error: e.message }))
    }
  }, [])

  const loadHealth = useCallback(async () => {
    setHealth(s => ({ ...s, loading: true, error: null }))
    try {
      const d = await fetchSystemHealth()
      setHealth({ data: d, loading: false, error: null, updated: Date.now() })
    } catch (e) {
      setHealth(s => ({ ...s, loading: false, error: e.message }))
    }
  }, [])

  const loadUsage = useCallback(async () => {
    setUsage(s => ({ ...s, loading: true, error: null }))
    try {
      const d = await fetchUsageAnalytics()
      setUsage({ data: d, loading: false, error: null, updated: Date.now() })
    } catch (e) {
      setUsage(s => ({ ...s, loading: false, error: e.message }))
    }
  }, [])

  const loadRecentActivity = useCallback(async () => {
    setRecentAct(s => ({ ...s, loading: true, error: null }))
    try {
      const d = await fetchRecentActivity()
      setRecentAct({ data: d, loading: false, error: null, updated: Date.now() })
    } catch (e) {
      setRecentAct(s => ({ ...s, loading: false, error: e.message }))
    }
  }, [])

  /* ═══ Load on section change ════════════════════════════════════════════ */
  useEffect(() => {
    loadStats()
    if (['dashboard', 'users', 'recruiters', 'candidates'].includes(activeSection)) {
      loadUsers(1, '', activeSection)
      setUserPage(1)
      setUserSearch('')
    }
    if (['dashboard', 'analytics', 'interviews'].includes(activeSection)) { loadActivity(); loadUsage() }
    if (['dashboard', 'ai-monitor'].includes(activeSection)) loadAi()
    if (['dashboard', 'health', 'security'].includes(activeSection)) loadHealth()
    if (['dashboard', 'activity'].includes(activeSection)) loadRecentActivity()
  }, [activeSection]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Reload users when page/search changes */
  useEffect(() => {
    if (['users', 'recruiters', 'candidates'].includes(activeSection)) {
      loadUsers(userPage, userSearch, activeSection)
    }
  }, [userPage, userSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ═══ User actions ══════════════════════════════════════════════════════ */
  const handleRoleSave = async (newRole) => {
    if (!manageUser) return
    try {
      await updateUserRole(manageUser.id, newRole)
      setManageUser(null)
      showToast(`Role updated → ${newRole}`)
      loadUsers(userPage, userSearch, activeSection)
      loadStats()
    } catch (e) { showError(`Role update failed: ${e.message}`) }
  }

  const handleToggle = (u) => {
    const willBlock = u.status === 'Active'
    setConfirm({
      title:        willBlock ? 'Block user account?' : 'Activate user account?',
      message:      willBlock
        ? `${u.name} (${u.email}) will be blocked and cannot log in until reactivated.`
        : `${u.name} (${u.email}) will be reactivated and can log in again.`,
      confirmLabel: willBlock ? 'Block Account' : 'Activate Account',
      danger:       willBlock,
      onConfirm: async () => {
        setConfirm(null)
        try {
          await toggleUserStatus(u.id, !willBlock)
          showToast(`${u.name} is now ${willBlock ? 'blocked' : 'active'}`)
          loadUsers(userPage, userSearch, activeSection)
          loadStats()
        } catch (e) { showError(`Status update failed: ${e.message}`) }
      },
    })
  }

  /* ═══ Broadcast ═════════════════════════════════════════════════════════ */
  const handleBroadcast = async () => {
    setBroadcastConfirm(false)
    setBroadcastResult(null)
    setBroadcastSending(true)
    try {
      const res = await reportApi.broadcastNotification(broadcastForm)
      setBroadcastResult({ success: true, msg: `✓ Sent to ${res.totalSent} user(s) (${res.target})` })
      setBroadcastForm(p => ({ ...p, title: '', message: '' }))
    } catch (e) {
      setBroadcastResult({ success: false, msg: e.message || 'Broadcast failed' })
    } finally {
      setBroadcastSending(false)
    }
  }

  /* ═══ Sidebar navigation config ════════════════════════════════════════ */
  const sidebarLinks = [
    {
      title: 'Platform',
      items: [
        { icon: <BarChart3 size={18} />, label: 'Overview',        section: 'dashboard'  },
        { icon: <TrendingUp size={18} />, label: 'Analytics',      section: 'analytics'  },
        { icon: <Radio size={18} />,     label: 'Recent Activity', section: 'activity'   },
      ],
    },
    {
      title: 'Users',
      items: [
        { icon: <Users size={18} />,    label: 'All Users',   section: 'users'      },
        { icon: <UserCheck size={18} />,label: 'Candidates',  section: 'candidates' },
        { icon: <Briefcase size={18} />,label: 'Recruiters',  section: 'recruiters' },
      ],
    },
    {
      title: 'Operations',
      items: [
        { icon: <Activity size={18} />,  label: 'Interview Monitor', section: 'interviews' },
        { icon: <Bell size={18} />,      label: 'Broadcast',         section: 'broadcast'  },
        { icon: <FileText size={18} />,  label: 'Reports',           section: 'reports'    },
      ],
    },
    {
      title: 'System',
      items: [
        { icon: <Monitor size={18} />,  label: 'System Health', section: 'health'     },
        { icon: <Brain size={18} />,    label: 'AI Monitoring', section: 'ai-monitor' },
        { icon: <Shield size={18} />,   label: 'Security',      section: 'security'   },
      ],
    },
    {
      title: 'Settings',
      items: [
        { icon: <Settings size={18} />, label: 'Settings', onClick: () => navigate('/settings') },
      ],
    },
  ]

  /* ═══ KPI Cards ════════════════════════════════════════════════════════ */
  const s = stats.data
  const kpis = [
    { label: 'Total Users',       value: s?.totalUsers?.toLocaleString(),        sub: `${s?.newUsersToday ?? 0} new today`,          icon: <Users size={20} />,     color: 'purple' },
    { label: 'Active Users',      value: s?.activeUsers?.toLocaleString(),       sub: `${s?.blockedUsers ?? 0} blocked`,              icon: <UserCheck size={20} />, color: 'green'  },
    { label: 'Candidates',        value: s?.totalCandidates?.toLocaleString(),   sub: `${s?.newUsersThisWeek ?? 0} this week`,        icon: <UserPlus size={20} />,  color: 'blue'   },
    { label: 'Recruiters',        value: s?.totalRecruiters?.toLocaleString(),   sub: null,                                           icon: <Briefcase size={20} />, color: 'teal'   },
    { label: 'Total Interviews',  value: s?.totalInterviews?.toLocaleString(),   sub: `${s?.activeInterviews ?? 0} in progress`,      icon: <Activity size={20} />,  color: 'orange' },
    { label: 'Completed',         value: s?.completedInterviews?.toLocaleString(),sub: s?.avgScore != null ? `Avg score ${s.avgScore}` : null, icon: <Award size={20} />,  color: 'green'  },
    { label: 'Pending',           value: s?.pendingInterviews?.toLocaleString(), sub: null,                                           icon: <Clock size={20} />,     color: 'amber'  },
    { label: 'Reports Generated', value: s?.reportsGenerated?.toLocaleString(),  sub: s?.highlyRecommended ? `${s.highlyRecommended} highly rec.` : null, icon: <FileText size={20} />, color: 'indigo' },
  ]

  /* ═══ Section renderers ════════════════════════════════════════════════ */

  /* ── Shared KPI row ─────────────────────────────────────────────────────── */
  const renderKpis = () => (
    <div className="admin-kpi-grid">
      {kpis.map((k, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
          <KpiCard {...k} loading={stats.loading} />
        </motion.div>
      ))}
    </div>
  )

  /* ── Section: Overview ─────────────────────────────────────────────────── */
  const renderDashboard = () => (
    <>
      {stats.error && <ErrorBanner msg={stats.error} onRetry={loadStats} />}
      {renderKpis()}

      <div className="admin-two-col" style={{ marginBottom: 20 }}>
        {/* Platform growth chart */}
        <motion.div className="card" style={{ gridColumn: 'span 2' }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card-header">
            <div><h2>Platform Growth</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Users, interviews & reports — last 6 months</p></div>
            <span className="badge blue">6 Months</span>
          </div>
          {usage.loading ? <Skeleton height={260} /> : usage.error ? <ErrorBanner msg={usage.error} onRetry={loadUsage} /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={usage.data?.monthlyActivity || []} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="users"      fill="#6366f1" radius={[4,4,0,0]} name="New Users" />
                <Bar dataKey="interviews" fill="#0ea5e9" radius={[4,4,0,0]} name="Interviews" />
                <Bar dataKey="reports"    fill="#10b981" radius={[4,4,0,0]} name="Reports" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* System health snapshot */}
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="card-header">
            <h2>System Health</h2>
            <span className={`badge ${health.data?.database?.ok !== false ? 'green' : 'red'}`}>
              {health.data ? (health.data.database?.ok !== false ? 'All Systems Go' : 'DB Issue') : '…'}
            </span>
          </div>
          {health.loading ? [0,1,2,3,4].map(i => <Skeleton key={i} height={54} style={{ marginBottom: 8 }} />) : health.error ? <ErrorBanner msg={health.error} onRetry={loadHealth} /> : health.data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <HealthRow icon={<Server size={16} />}   label="Server"   value={health.data.server?.status || '—'}     status={`Uptime: ${health.data.server?.uptime || '—'}`} ok={true} />
              <HealthRow icon={<Database size={16} />} label="Database" value={health.data.database?.ok ? 'Connected' : 'Error'} status={health.data.database?.latencyMs != null ? `${health.data.database.latencyMs}ms latency` : '—'} ok={health.data.database?.ok} />
              <HealthRow icon={<Cpu size={16} />}      label="Memory"   value={`${health.data.memory?.rss ?? '—'} MB`} status={`${health.data.memory?.ramPct ?? '—'}% of RAM`} ok={(health.data.memory?.ramPct || 0) < 90} />
              <HealthRow icon={<Activity size={16} />} label="CPU"      value={`${health.data.cpu?.cpuPct ?? '—'}%`}  status={`${health.data.cpu?.cores || '—'} cores`} ok={(health.data.cpu?.cpuPct || 0) < 85} />
            </div>
          )}
        </motion.div>

        {/* Recent activity */}
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card-header"><h2>Recent Activity</h2></div>
          {recentAct.loading ? [0,1,2,3,4].map(i => <Skeleton key={i} height={44} style={{ marginBottom: 8 }} />) : recentAct.error ? <ErrorBanner msg={recentAct.error} onRetry={loadRecentActivity} /> : (
            <div>
              {(recentAct.data?.events || []).slice(0, 7).map((ev, i) => <ActivityEvent key={i} event={ev} />)}
              {!recentAct.data?.events?.length && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '24px 0' }}>No activity recorded yet</div>
              )}
            </div>
          )}
        </motion.div>

        {/* AI snapshot */}
        <motion.div className="card" style={{ gridColumn: 'span 2' }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <div className="card-header">
            <h2>AI Activity</h2>
            <span className={`badge ${ai.data?.hasKeys ? 'green' : 'orange'}`}>
              {ai.loading ? '…' : ai.data?.hasKeys ? `${ai.data.model} · Active` : 'No Gemini Keys'}
            </span>
          </div>
          {ai.loading ? <div className="admin-ai-grid">{[0,1,2,3].map(i => <Skeleton key={i} height={72} />)}</div> : ai.error ? <ErrorBanner msg={ai.error} onRetry={loadAi} /> : ai.data && (
            <div className="admin-ai-grid">
              {[
                { icon: <Brain size={18} color="#10b981" />,    label: 'AI Model',      value: ai.data.model,                              sub: ai.data.modelStatus,     c: '#10b981' },
                { icon: <Activity size={18} color="#f97316" />, label: 'Total Calls',   value: ai.data.totalRequests?.toLocaleString(),     sub: 'All-time API calls',    c: '#f97316' },
                { icon: <Award size={18} color="#6366f1" />,    label: 'Evaluations',   value: ai.data.totalEvaluations?.toLocaleString(),  sub: 'Interviews scored',     c: '#6366f1' },
                { icon: <Zap size={18} color="#0ea5e9" />,      label: "Today's Calls", value: ai.data.todayRequests?.toLocaleString(),     sub: 'AI requests today',     c: '#0ea5e9' },
              ].map((item, i) => (
                <div key={i} style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>{item.icon}<span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</span></div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{item.value ?? '—'} <span style={{ fontSize: 11, color: item.c, fontWeight: 500 }}>{item.sub}</span></div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </>
  )

  /* ── Section: Analytics ─────────────────────────────────────────────────── */
  const renderAnalytics = () => (
    <>
      {stats.error && <ErrorBanner msg={stats.error} onRetry={loadStats} />}
      <SectionHeader title="Platform Analytics" subtitle="Real usage data from the last 6 months" onRefresh={() => { loadStats(); loadActivity(); loadUsage() }} loading={stats.loading || activity.loading || usage.loading} lastUpdated={usage.updated} />
      {renderKpis()}

      {/* Monthly growth chart */}
      <motion.div className="card" style={{ marginBottom: 20 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card-header"><h2>Monthly Platform Growth</h2><span className="badge blue">6 Months</span></div>
        {usage.loading ? <Skeleton height={280} /> : usage.error ? <ErrorBanner msg={usage.error} onRetry={loadUsage} /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={usage.data?.monthlyActivity || []} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Bar dataKey="users" fill="#6366f1" radius={[4,4,0,0]} name="New Users" />
              <Bar dataKey="interviews" fill="#0ea5e9" radius={[4,4,0,0]} name="Interviews" />
              <Bar dataKey="reports" fill="#10b981" radius={[4,4,0,0]} name="Reports" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      <div className="admin-two-col" style={{ marginBottom: 20 }}>
        {/* User role distribution */}
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card-header"><h2>User Distribution</h2></div>
          {usage.loading ? <Skeleton height={220} /> : usage.error ? <ErrorBanner msg={usage.error} onRetry={loadUsage} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={usage.data?.roleDistribution || []} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {(usage.data?.roleDistribution || []).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v, n) => [v.toLocaleString(), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Score distribution */}
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <div className="card-header"><h2>Score Distribution</h2><span className="badge gray">Completed Interviews</span></div>
          {usage.loading ? <Skeleton height={220} /> : usage.error ? <ErrorBanner msg={usage.error} onRetry={loadUsage} /> : (
            (usage.data?.scoreDistribution || []).length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '50px 0' }}><Target size={28} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />No scored interviews yet</div>
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[...usage.data.scoreDistribution].reverse()} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
                    <Bar dataKey="count" name="Interviews" radius={[4,4,0,0]}
                      fill="#6366f1"
                    />
                  </BarChart>
                </ResponsiveContainer>
          )}
        </motion.div>

        {/* Interview status breakdown */}
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="card-header"><h2>Interview Status</h2></div>
          {activity.loading ? <Skeleton height={160} /> : activity.error ? <ErrorBanner msg={activity.error} onRetry={loadActivity} /> : activity.data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Completed',   value: activity.data.statusBreakdown?.completed  || 0, color: '#10b981' },
                { label: 'In Progress', value: activity.data.statusBreakdown?.inProgress || 0, color: '#0ea5e9' },
                { label: 'Pending',     value: activity.data.statusBreakdown?.pending    || 0, color: '#f59e0b' },
              ].map((item, i) => {
                const total = activity.data.statusBreakdown?.total || 1
                const pct   = Math.round((item.value / total) * 100)
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.value.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                )
              })}
              <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 800, marginTop: 4 }}>
                {activity.data.statusBreakdown?.total?.toLocaleString() || 0}
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>total interviews</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Monthly signups */}
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card-header"><h2>Monthly New Users</h2></div>
          {usage.loading ? <Skeleton height={160} /> : usage.error ? <ErrorBanner msg={usage.error} onRetry={loadUsage} /> : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={usage.data?.monthlySignups || []} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="newCandidates" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="Candidates" />
                <Line type="monotone" dataKey="newRecruiters" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} name="Recruiters" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>
    </>
  )

  /* ── Section: Recent Activity ───────────────────────────────────────────── */
  const renderActivity = () => (
    <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader
        title="Recent Platform Activity"
        subtitle="Real events from registrations and interview completions (last 25 events)"
        onRefresh={loadRecentActivity}
        loading={recentAct.loading}
        lastUpdated={recentAct.updated}
      />
      {recentAct.error && <ErrorBanner msg={recentAct.error} onRetry={loadRecentActivity} />}
      {recentAct.loading
        ? [0,1,2,3,4,5,6,7].map(i => <Skeleton key={i} height={48} style={{ marginBottom: 8 }} />)
        : (
          <div>
            {(recentAct.data?.events || []).map((ev, i) => <ActivityEvent key={i} event={ev} />)}
            {!recentAct.data?.events?.length && (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                <Radio size={32} style={{ opacity: 0.25, display: 'block', margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 600, fontSize: 14 }}>No activity recorded yet</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Events will appear here as users register and complete interviews</div>
              </div>
            )}
          </div>
        )
      }
    </motion.div>
  )

  /* ── Section: User Management (all/candidates/recruiters) ──────────────── */
  const renderUsers = (section) => {
    const titles = {
      users:      { title: 'All Users',           sub: 'Manage all platform accounts (real-time DB)' },
      candidates: { title: 'Candidate Management', sub: `${stats.data?.totalCandidates ?? '…'} candidates registered` },
      recruiters: { title: 'Recruiter Management', sub: `${stats.data?.totalRecruiters ?? '…'} recruiters registered` },
    }
    const t = titles[section] || titles.users
    return (
      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader
          title={t.title} subtitle={t.sub}
          onRefresh={() => loadUsers(userPage, userSearch, section)}
          loading={usersLoading}
          lastUpdated={usersUpdated}
          badge={<span className="badge gray">{userTotal.toLocaleString()} {section === 'recruiters' ? 'recruiters' : section === 'candidates' ? 'candidates' : 'users'}</span>}
        />
        {usersError && <ErrorBanner msg={usersError} onRetry={() => loadUsers(userPage, userSearch, section)} />}
        <UserTable
          data={users} total={userTotal} page={userPage} setPage={setUserPage}
          pageSize={PAGE_SIZE} loading={usersLoading}
          onView={setViewUser} onManage={setManageUser} onToggle={handleToggle}
          search={userSearch} setSearch={setUserSearch}
        />
      </motion.div>
    )
  }

  /* ── Section: Interview Monitor ────────────────────────────────────────── */
  const renderInterviews = () => (
    <>
      <SectionHeader title="Interview Monitor" subtitle="Real-time interview pipeline overview" onRefresh={loadActivity} loading={activity.loading} lastUpdated={activity.updated} />
      {activity.error && <ErrorBanner msg={activity.error} onRetry={loadActivity} />}

      {/* Status KPIs */}
      <div className="admin-kpi-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Interviews', value: activity.data?.statusBreakdown?.total, icon: <Activity size={20} />, color: 'purple' },
          { label: 'Completed',        value: activity.data?.statusBreakdown?.completed,  icon: <CheckCircle size={20} />, color: 'green'  },
          { label: 'In Progress',      value: activity.data?.statusBreakdown?.inProgress, icon: <Radio size={20} />,       color: 'blue'   },
          { label: 'Pending',          value: activity.data?.statusBreakdown?.pending,     icon: <Clock size={20} />,       color: 'amber'  },
        ].map((k, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <KpiCard {...k} value={k.value?.toLocaleString()} loading={activity.loading} />
          </motion.div>
        ))}
      </div>

      <div className="admin-two-col">
        {/* Monthly trend */}
        <motion.div className="card" style={{ gridColumn: 'span 2' }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card-header"><h2>Monthly Interview Volume</h2><span className="badge blue">6 Months</span></div>
          {activity.loading ? <Skeleton height={240} /> : activity.error ? null : (
            (activity.data?.monthlyData || []).length === 0
              ? <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>No completed interviews in the last 6 months</div>
              : <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={activity.data.monthlyData} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="interviews"       fill="#0ea5e9" radius={[4,4,0,0]} name="Interviews" />
                    <Bar dataKey="uniqueCandidates" fill="#6366f1" radius={[4,4,0,0]} name="Unique Candidates" />
                  </BarChart>
                </ResponsiveContainer>
          )}
        </motion.div>

        {/* Recent completions */}
        <motion.div className="card" style={{ gridColumn: 'span 2' }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <div className="card-header">
            <div><h2>Recent Completions</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Last 10 completed interviews</p></div>
          </div>
          {activity.loading ? <Skeleton height={200} /> : (
            <div className="table-responsive">
              <table className="data-table">
                <thead><tr><th>Candidate</th><th>Role</th><th>Score</th><th>Recommendation</th><th>Completed</th></tr></thead>
                <tbody>
                  {(activity.data?.recentActivity || []).length === 0
                    ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No completed interviews yet</td></tr>
                    : (activity.data.recentActivity).map((r, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                              {(r.candidateName || '?').charAt(0)}
                            </div>
                            <span style={{ fontWeight: 500, fontSize: 13 }}>{r.candidateName}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.role}</td>
                        <td>
                          {r.score != null
                            ? <span style={{ fontWeight: 700, color: r.score >= 85 ? '#10b981' : r.score >= 70 ? '#f59e0b' : '#ef4444' }}>{r.score}/100</span>
                            : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td>
                          {r.recommendation
                            ? <span className={`badge ${r.recommendation === 'Highly Recommended' ? 'green' : r.recommendation === 'Not Recommended' ? 'red' : 'orange'}`} style={{ fontSize: 11 }}>
                                {r.recommendation}
                              </span>
                            : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.timeAgo}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </>
  )

  /* ── Section: Broadcast ─────────────────────────────────────────────────── */
  const TARGET_LABELS = {
    ALL_CANDIDATES: 'All Candidates',
    ALL_RECRUITERS: 'All Recruiters',
    ALL_USERS:      'All Users (Candidates + Recruiters + Admins)',
  }
  const targetCount = {
    ALL_CANDIDATES: stats.data?.totalCandidates,
    ALL_RECRUITERS: stats.data?.totalRecruiters,
    ALL_USERS:      stats.data?.totalUsers,
  }[broadcastForm.target]

  const renderBroadcast = () => (
    <motion.div className="card" style={{ maxWidth: 680 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader
        title="Broadcast Notification"
        subtitle="Send a platform-wide in-app message to a target audience group"
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="form-field">
          <label>Target Audience</label>
          <select value={broadcastForm.target} onChange={e => setBroadcastForm(p => ({ ...p, target: e.target.value }))}>
            <option value="ALL_CANDIDATES">All Candidates</option>
            <option value="ALL_RECRUITERS">All Recruiters</option>
            <option value="ALL_USERS">All Users (Candidates + Recruiters + Admins)</option>
          </select>
          {targetCount != null && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <Users size={11} style={{ display: 'inline', marginRight: 4 }} />
              Estimated recipients: <strong>{targetCount.toLocaleString()}</strong> active users
            </div>
          )}
        </div>

        <div className="form-field">
          <label>
            Title
            <span style={{ fontWeight: 400, color: broadcastForm.title.length > 100 ? '#ef4444' : 'var(--text-muted)', marginLeft: 6 }}>
              ({broadcastForm.title.length}/120)
            </span>
          </label>
          <input
            type="text" maxLength={120}
            placeholder="e.g. Scheduled maintenance on 15 Sep"
            value={broadcastForm.title}
            onChange={e => setBroadcastForm(p => ({ ...p, title: e.target.value }))}
          />
        </div>

        <div className="form-field">
          <label>
            Message
            <span style={{ fontWeight: 400, color: broadcastForm.message.length > 550 ? '#ef4444' : 'var(--text-muted)', marginLeft: 6 }}>
              ({broadcastForm.message.length}/600)
            </span>
          </label>
          <textarea
            rows={4} maxLength={600}
            placeholder="Plain text only — no HTML tags"
            value={broadcastForm.message}
            onChange={e => setBroadcastForm(p => ({ ...p, message: e.target.value }))}
            style={{ width: '100%', resize: 'vertical', fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
        </div>

        {broadcastResult && (
          <div style={{ padding: '12px 14px', background: broadcastResult.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${broadcastResult.success ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 8, fontSize: 13, color: broadcastResult.success ? '#10b981' : '#ef4444' }}>
            {broadcastResult.msg}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            className="btn btn-outline"
            onClick={() => { setBroadcastForm({ target: 'ALL_CANDIDATES', title: '', message: '' }); setBroadcastResult(null) }}
          >
            Clear
          </button>
          <button
            className="btn btn-primary"
            disabled={broadcastSending || !broadcastForm.title.trim() || !broadcastForm.message.trim()}
            onClick={() => setBroadcastConfirm(true)}
          >
            <Send size={14} /> {broadcastSending ? 'Sending…' : 'Send Broadcast'}
          </button>
        </div>
      </div>

      {broadcastConfirm && (
        <ConfirmModal
          title="Send Broadcast?"
          message={`You are about to send "${broadcastForm.title}" to ${TARGET_LABELS[broadcastForm.target]}${targetCount != null ? ` (~${targetCount.toLocaleString()} users)` : ''}. This cannot be undone.`}
          confirmLabel="Send Now"
          onConfirm={handleBroadcast}
          onCancel={() => setBroadcastConfirm(false)}
        />
      )}
    </motion.div>
  )

  /* ── Section: Reports ───────────────────────────────────────────────────── */
  const renderReports = () => (
    <>
      <motion.div className="card" style={{ marginBottom: 20 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader title="System Reports" subtitle="Download platform-wide reports generated from real database data" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Platform System Report — PDF', desc: 'User metrics, interview stats, AI usage, and system health in PDF format', fmt: 'pdf' },
            { label: 'Platform System Report — CSV', desc: 'Tabular export suitable for spreadsheet analysis and data processing', fmt: 'csv' },
          ].map(({ label, desc, fmt }) => (
            <div key={fmt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Download size={17} color="#6366f1" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                disabled={reportDl === fmt}
                onClick={async () => {
                  setReportDl(fmt)
                  try {
                    await reportApi.downloadAdminReport(fmt)
                    showToast(`${fmt.toUpperCase()} report downloaded successfully`)
                  } catch (e) {
                    showError(`Download failed: ${e.message}`)
                  } finally {
                    setReportDl(null)
                  }
                }}
              >
                <Download size={13} /> {reportDl === fmt ? 'Generating…' : `Download ${fmt.toUpperCase()}`}
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Assessment reports table */}
      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="card-header">
          <div><h2>Assessment Reports</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>All generated candidate assessment reports</p></div>
          <span className="badge gray">{stats.data?.reportsGenerated?.toLocaleString() ?? '…'} total</span>
        </div>
        {activity.loading ? <Skeleton height={180} /> : activity.error ? <ErrorBanner msg={activity.error} onRetry={loadActivity} /> : (
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Candidate</th><th>Role</th><th>Score</th><th>Recommendation</th><th>Completed</th></tr></thead>
              <tbody>
                {(activity.data?.recentActivity || []).length === 0
                  ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No completed assessments yet</td></tr>
                  : (activity.data.recentActivity).map((r, i) => (
                    <tr key={i}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{(r.candidateName||'?').charAt(0)}</div>
                        <span style={{ fontWeight: 500, fontSize: 13 }}>{r.candidateName}</span>
                      </div></td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.role}</td>
                      <td><span style={{ fontWeight: 700, color: r.score >= 85 ? '#10b981' : r.score >= 70 ? '#f59e0b' : r.score != null ? '#ef4444' : 'var(--text-muted)' }}>{r.score != null ? `${r.score}/100` : '—'}</span></td>
                      <td>{r.recommendation ? <span className={`badge ${r.recommendation === 'Highly Recommended' ? 'green' : r.recommendation === 'Not Recommended' ? 'red' : 'orange'}`} style={{ fontSize: 11 }}>{r.recommendation}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.timeAgo}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </>
  )

  /* ── Section: System Health ─────────────────────────────────────────────── */
  const renderHealth = () => (
    <>
      <SectionHeader title="System Health" subtitle="Real-time infrastructure and runtime metrics" onRefresh={loadHealth} loading={health.loading} lastUpdated={health.updated} badge={<span className={`badge ${health.data?.database?.ok !== false ? 'green' : 'red'}`}>{health.loading ? '…' : health.data?.database?.ok !== false ? 'All Systems Go' : 'DB Issue'}</span>} />
      {health.error && <ErrorBanner msg={health.error} onRetry={loadHealth} />}

      <div className="admin-two-col">
        {/* Server + DB */}
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card-header"><h2>Runtime</h2></div>
          {health.loading ? [0,1,2,3,4].map(i => <Skeleton key={i} height={52} style={{ marginBottom: 8 }} />) : health.data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <HealthRow icon={<Server size={16} />}   label="Server Status" value={health.data.server?.status || '—'}         status={`Node.js ${health.data.server?.nodeVersion || '—'}`}          ok={true} />
              <HealthRow icon={<Clock size={16} />}    label="Uptime"        value={health.data.server?.uptime || '—'}          status="Process runtime"                                              ok={true} />
              <HealthRow icon={<Database size={16} />} label="Database"      value={health.data.database?.ok ? 'Connected' : 'Error'} status={health.data.database?.latencyMs != null ? `${health.data.database.latencyMs}ms latency` : '—'} ok={health.data.database?.ok} />
              <HealthRow icon={<Layers size={16} />}   label="DB Pool"       value={`${health.data.database?.totalConnections ?? '—'}/${health.data.database?.maxConnections ?? '—'}`} status={`${health.data.database?.idleConnections ?? '—'} idle · ${health.data.database?.waitingClients ?? 0} waiting`} ok={true} />
              <HealthRow icon={<Globe size={16} />}    label="Platform"      value={health.data.server?.platform || '—'}        status="Operating system"                                             ok={true} />
            </div>
          )}
        </motion.div>

        {/* Memory + CPU */}
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <div className="card-header"><h2>Resources</h2></div>
          {health.loading ? [0,1,2,3,4].map(i => <Skeleton key={i} height={52} style={{ marginBottom: 8 }} />) : health.data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <HealthRow icon={<Activity size={16} />} label="RSS Memory"   value={`${health.data.memory?.rss ?? '—'} MB`}      status={`${health.data.memory?.ramPct ?? '—'}% of total RAM`}      ok={(health.data.memory?.ramPct || 0) < 90} />
              <HealthRow icon={<Cpu size={16} />}      label="Heap Used"    value={`${health.data.memory?.heapUsed ?? '—'} MB`}  status={`of ${health.data.memory?.heapTotal ?? '—'} MB heap`}     ok={true} />
              <HealthRow icon={<BarChart3 size={16} />}label="CPU Load"     value={`${health.data.cpu?.cpuPct ?? '—'}%`}        status={`1-min avg · ${health.data.cpu?.cores || '—'} cores`}     ok={(health.data.cpu?.cpuPct || 0) < 85} />
              <HealthRow icon={<Server size={16} />}   label="Total RAM"    value={`${health.data.memory?.totalRam ?? '—'} MB`}  status="System total memory"                                       ok={true} />
              <HealthRow icon={<Activity size={16} />} label="External Mem" value={`${health.data.memory?.external ?? '—'} MB`} status="Native addons memory"                                      ok={true} />
            </div>
          )}
        </motion.div>
      </div>
    </>
  )

  /* ── Section: AI Monitoring ─────────────────────────────────────────────── */
  const renderAiMonitor = () => (
    <>
      <SectionHeader title="AI Monitoring" subtitle="Application-level AI activity metrics (not infrastructure telemetry)" onRefresh={loadAi} loading={ai.loading} lastUpdated={ai.updated} badge={<span className={`badge ${ai.data?.hasKeys ? 'green' : 'orange'}`}>{ai.loading ? '…' : ai.data?.hasKeys ? `${ai.data.model}` : 'No Gemini Keys'}</span>} />
      {ai.error && <ErrorBanner msg={ai.error} onRetry={loadAi} />}

      {/* AI KPI row */}
      {!ai.loading && ai.data && (
        <div className="admin-ai-grid" style={{ marginBottom: 20 }}>
          {[
            { icon: <Brain size={18} color="#10b981" />,    label: 'AI Model',      value: ai.data.model,                             sub: ai.data.modelStatus,    c: '#10b981' },
            { icon: <Activity size={18} color="#f97316" />, label: 'Total API Calls',value: ai.data.totalRequests?.toLocaleString(),  sub: 'All-time',             c: '#f97316' },
            { icon: <Award size={18} color="#6366f1" />,    label: 'Evaluations',   value: ai.data.totalEvaluations?.toLocaleString(),sub: 'Interviews scored',    c: '#6366f1' },
            { icon: <Zap size={18} color="#0ea5e9" />,      label: "Today's Calls", value: ai.data.todayRequests?.toLocaleString(),  sub: 'API requests',         c: '#0ea5e9' },
            { icon: <Key size={18} color="#a855f7" />,      label: 'Active Keys',   value: String(ai.data.activeKeyCount),           sub: 'Gemini API keys',      c: '#a855f7' },
            { icon: <Clock size={18} color="#14b8a6" />,    label: 'Last Reset',    value: ai.data.lastResetDate || '—',             sub: 'Daily counter reset',  c: '#14b8a6' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>{item.icon}<span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</span></div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{item.value ?? '—'} <span style={{ fontSize: 11, color: item.c, fontWeight: 500 }}>{item.sub}</span></div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      {ai.loading && <div className="admin-ai-grid" style={{ marginBottom: 20 }}>{[0,1,2,3,4,5].map(i => <Skeleton key={i} height={80} />)}</div>}

      {/* AI Features list */}
      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card-header"><h2>AI Feature Status</h2></div>
        {ai.loading ? [0,1,2,3,4,5,6,7].map(i => <Skeleton key={i} height={50} style={{ marginBottom: 8 }} />) : ai.error ? null : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(ai.data?.aiFeatures || []).map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{f.desc}</div>
                </div>
                <span className={`badge ${f.enabled ? 'green' : 'gray'}`}>{f.enabled ? 'Active' : 'Inactive'}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </>
  )

  /* ── Section: Security ──────────────────────────────────────────────────── */
  const renderSecurity = () => (
    <>
      {stats.error && <ErrorBanner msg={stats.error} onRetry={loadStats} />}
      <SectionHeader title="Security Overview" subtitle="Current authentication and authorization configuration" onRefresh={loadHealth} loading={health.loading} lastUpdated={health.updated} badge={<span className="badge green">Secure</span>} />

      <div className="admin-two-col">
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card-header"><h2>Security Controls</h2></div>
          {health.loading ? [0,1,2,3,4,5,6].map(i => <Skeleton key={i} height={48} style={{ marginBottom: 8 }} />) : health.error ? <ErrorBanner msg={health.error} onRetry={loadHealth} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(health.data?.security || []).map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Shield size={15} color={item.ok ? '#10b981' : '#ef4444'} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.value}</span>
                    <span className={`badge ${item.ok ? 'green' : 'red'}`}>{item.ok ? '✓' : '!'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <div className="card-header"><h2>DB Pool Status</h2></div>
          {health.loading ? [0,1,2,3,4,5].map(i => <Skeleton key={i} height={44} style={{ marginBottom: 8 }} />) : health.data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Total Connections', value: health.data.database?.totalConnections ?? '—' },
                { label: 'Idle Connections',  value: health.data.database?.idleConnections  ?? '—' },
                { label: 'Waiting Clients',   value: health.data.database?.waitingClients   ?? 0   },
                { label: 'Max Pool Size',     value: health.data.database?.maxConnections   ?? '—' },
                { label: 'DB Latency',        value: health.data.database?.latencyMs != null ? `${health.data.database.latencyMs}ms` : '—' },
                { label: 'Node.js Version',   value: health.data.server?.nodeVersion || '—' },
                { label: 'Platform',          value: health.data.server?.platform    || '—' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{String(item.value)}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </>
  )

  /* ═══ Main render switch ════════════════════════════════════════════════ */
  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':   return renderDashboard()
      case 'analytics':   return renderAnalytics()
      case 'activity':    return renderActivity()
      case 'users':       return renderUsers('users')
      case 'candidates':  return renderUsers('candidates')
      case 'recruiters':  return renderUsers('recruiters')
      case 'interviews':  return renderInterviews()
      case 'broadcast':   return renderBroadcast()
      case 'reports':     return renderReports()
      case 'health':      return renderHealth()
      case 'ai-monitor':  return renderAiMonitor()
      case 'security':    return renderSecurity()
      default:            return null
    }
  }

  const handleSectionChange = (section) => {
    setActiveSection(section)
    setUserSearch('')
    setUserPage(1)
    setBroadcastResult(null)
  }

  return (
    <DashboardLayout
      title="Admin Console"
      role="Administrator"
      userName="Admin"
      sidebarLinks={sidebarLinks}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
    >
      {/* Toast */}
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Modals */}
      {viewUser   && <ViewModal user={viewUser}   onClose={() => setViewUser(null)} />}
      {manageUser && <RoleModal user={manageUser} onClose={() => setManageUser(null)} onSave={handleRoleSave} />}

      {/* Active section */}
      <AnimatePresence mode="wait">
        <motion.div key={activeSection} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {renderSection()}
        </motion.div>
      </AnimatePresence>
    </DashboardLayout>
  )
}

export default AdminDashboard
