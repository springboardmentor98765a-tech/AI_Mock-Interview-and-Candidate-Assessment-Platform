import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Bell, Settings, User, LogOut, Menu, X, Brain, CheckCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import notificationApi from '../services/notificationApi'
import '../styles/layout.css'

/* ── Relative time helper ─────────────────────────────────────────────────── */
function relativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  <  1) return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  <  7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/* ── DashboardLayout ──────────────────────────────────────────────────────── */
function DashboardLayout({ children, title, role, sidebarLinks, userName, activeSection, onSectionChange }) {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  // ── Notification state ───────────────────────────────────────────────────
  const [notifOpen,         setNotifOpen]         = useState(false)
  const [notifications,     setNotifications]     = useState([])
  const [unreadCount,       setUnreadCount]       = useState(0)
  const [notifLoading,      setNotifLoading]      = useState(false)
  const [notifError,        setNotifError]        = useState(false)
  const [markingAll,        setMarkingAll]        = useState(false)

  const notifRef = useRef(null)

  const displayName = user?.name || userName || 'User'
  const roleLabels  = { ADMIN: 'Admin', RECRUITER: 'Recruiter', USER: 'Candidate' }
  const displayRole = user?.role ? (roleLabels[user.role] || user.role) : (role || 'User')
  const initials    = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  /* ── Fetch notifications ───────────────────────────────────────────────── */
  const fetchNotifications = useCallback(async () => {
    if (!user) return
    setNotifLoading(true)
    setNotifError(false)
    try {
      const data = await notificationApi.getNotifications({ limit: 20 })
      setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0)
    } catch (_) {
      setNotifError(true)
    } finally {
      setNotifLoading(false)
    }
  }, [user])

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  /* ── Close dropdown on outside click ──────────────────────────────────── */
  useEffect(() => {
    if (!notifOpen) return
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  /* ── Close dropdowns on Escape ─────────────────────────────────────────── */
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        setNotifOpen(false)
        setProfileOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  /* ── Toggle notification panel ─────────────────────────────────────────── */
  const handleBellClick = () => {
    const next = !notifOpen
    setNotifOpen(next)
    setProfileOpen(false)
    if (next) {
      // Refresh list whenever the panel opens
      fetchNotifications()
    }
  }

  /* ── Mark single notification read ────────────────────────────────────── */
  const handleMarkRead = async (id, alreadyRead) => {
    if (alreadyRead) return
    try {
      await notificationApi.markAsRead(id)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (_) {
      // Silently fail — non-critical
    }
  }

  /* ── Mark all as read ──────────────────────────────────────────────────── */
  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return
    setMarkingAll(true)
    try {
      await notificationApi.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (_) {
      // Silently fail
    } finally {
      setMarkingAll(false)
    }
  }

  /* ── Logout ────────────────────────────────────────────────────────────── */
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isItemActive = (item, sIdx, iIdx) => {
    if (activeSection && item.section) return item.section === activeSection
    if (!activeSection) return sIdx === 0 && iIdx === 0
    return false
  }

  return (
    <div className="layout-container">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`layout-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon"><Brain size={20} /></div>
          <div className="brand-text">
            <h2>HireAI</h2>
            <span>Recruitment Platform</span>
          </div>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {sidebarLinks.map((section, sIdx) => (
          <div key={sIdx} className="sidebar-section">
            <div className="sidebar-section-title">{section.title || section.section}</div>
            <div className="sidebar-links">
              {(section.items || section.links || []).map((item, iIdx) => (
                <a
                  key={iIdx}
                  href="#"
                  className={`sidebar-link ${isItemActive(item, sIdx, iIdx) ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    if (item.onClick) {
                      item.onClick()
                    } else if (item.section && onSectionChange) {
                      onSectionChange(item.section)
                    }
                    setSidebarOpen(false)
                  }}
                >
                  {typeof item.icon === 'function' ? <item.icon size={18} /> : item.icon}
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </div>
        ))}

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{displayName}</div>
              <div className="sidebar-user-role">{displayRole}</div>
            </div>
          </div>
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <div className="layout-main">
        <nav className="layout-navbar">
          <div className="navbar-left">
            <button className="menu-toggle-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            <h1 className="navbar-title">{title}</h1>
            <div className="navbar-search">
              <Search />
              <input type="text" placeholder="Search..." />
            </div>
          </div>

          <div className="navbar-right">
            {/* ── Notification Bell ─────────────────────────────────────── */}
            <div className="notif-wrapper" ref={notifRef}>
              <button
                className="navbar-icon-btn"
                onClick={handleBellClick}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </button>

              {notifOpen && (
                <div className="notif-dropdown" role="dialog" aria-label="Notifications">
                  {/* Header */}
                  <div className="notif-header">
                    <span className="notif-header-title">
                      Notifications
                      {unreadCount > 0 && (
                        <span className="notif-unread-pill">{unreadCount}</span>
                      )}
                    </span>
                    {unreadCount > 0 && (
                      <button
                        className="notif-mark-all-btn"
                        onClick={handleMarkAllRead}
                        disabled={markingAll}
                        title="Mark all as read"
                      >
                        <CheckCheck size={15} />
                        {markingAll ? 'Marking…' : 'Mark all read'}
                      </button>
                    )}
                  </div>

                  {/* Body */}
                  <div className="notif-body">
                    {notifLoading && (
                      <div className="notif-empty">
                        <span className="notif-loading-text">Loading…</span>
                      </div>
                    )}

                    {!notifLoading && notifError && (
                      <div className="notif-empty">
                        <span className="notif-error-text">Unable to load notifications.</span>
                        <button className="notif-retry-btn" onClick={fetchNotifications}>Retry</button>
                      </div>
                    )}

                    {!notifLoading && !notifError && notifications.length === 0 && (
                      <div className="notif-empty">
                        <Bell size={28} className="notif-empty-icon" />
                        <span>No notifications</span>
                      </div>
                    )}

                    {!notifLoading && !notifError && notifications.map(n => (
                      <button
                        key={n.id}
                        className={`notif-item${n.is_read ? '' : ' unread'}`}
                        onClick={() => handleMarkRead(n.id, n.is_read)}
                        title={n.is_read ? '' : 'Click to mark as read'}
                      >
                        {!n.is_read && <span className="notif-item-dot" aria-hidden="true" />}
                        <div className="notif-item-content">
                          <div className="notif-item-title">{n.title}</div>
                          <div className="notif-item-message">{n.message}</div>
                          <div className="notif-item-time">{relativeTime(n.created_at)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link to="/settings" className="navbar-icon-btn">
              <Settings size={20} />
            </Link>

            {/* ── Profile dropdown ──────────────────────────────────────── */}
            <div className="navbar-profile">
              <button
                className="navbar-profile-btn"
                onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
              >
                <div className="navbar-avatar">{initials}</div>
                <span className="navbar-profile-name">{displayName}</span>
              </button>
              {profileOpen && (
                <div className="profile-dropdown">
                  <Link to="/settings" onClick={() => setProfileOpen(false)}>
                    <User size={16} /> Profile
                  </Link>
                  <Link to="/settings" onClick={() => setProfileOpen(false)}>
                    <Settings size={16} /> Settings
                  </Link>
                  <button className="dropdown-danger" onClick={handleLogout}>
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        <div className="layout-content">
          {children}
        </div>
      </div>
    </div>
  )
}

export default DashboardLayout
