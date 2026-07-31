import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Bell, Settings, User, LogOut, Menu, X, Brain } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import '../styles/layout.css'

function DashboardLayout({ children, title, role, sidebarLinks, userName }) {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [sidebarOpen, setSidebarOpen]  = useState(false)
  const [profileOpen, setProfileOpen]  = useState(false)

  const displayName = user?.name || userName || 'User'
  const roleLabels = { ADMIN: 'Admin', RECRUITER: 'Recruiter', USER: 'Candidate' }
  const displayRole = user?.role ? (roleLabels[user.role] || user.role) : (role || 'User')
  const initials    = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
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
                  className={`sidebar-link ${iIdx === 0 && sIdx === 0 ? 'active' : ''}`}
                  onClick={(e) => e.preventDefault()}
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
            <button className="navbar-icon-btn">
              <Bell size={20} />
              <span className="notif-badge"></span>
            </button>
            <Link to="/settings" className="navbar-icon-btn">
              <Settings size={20} />
            </Link>
            <div className="navbar-profile">
              <button className="navbar-profile-btn" onClick={() => setProfileOpen(!profileOpen)}>
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
