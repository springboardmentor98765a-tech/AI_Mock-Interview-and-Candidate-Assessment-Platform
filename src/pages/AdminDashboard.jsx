import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import '../styles/dashboard.css'

function AdminDashboard() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('role')
    navigate('/login')
  }

  const stats = [
    { title: 'Total Users', value: '2,847', icon: '👥', color: '#4f46e5' },
    { title: 'Active Users', value: '1,253', icon: '✅', color: '#059669' },
    { title: 'Revenue', value: '$48,352', icon: '💰', color: '#d97706' },
    { title: 'Pending Requests', value: '23', icon: '📋', color: '#dc2626' },
  ]

  const recentUsers = [
    { name: 'Rahul Sharma', email: 'rahul@email.com', role: 'Student', status: 'Active' },
    { name: 'Priya Patel', email: 'priya@email.com', role: 'Recruiter', status: 'Active' },
    { name: 'Amit Kumar', email: 'amit@email.com', role: 'Student', status: 'Inactive' },
    { name: 'Sneha Gupta', email: 'sneha@email.com', role: 'Admin', status: 'Active' },
    { name: 'Vikram Singh', email: 'vikram@email.com', role: 'Student', status: 'Active' },
  ]

  const notifications = [
    { text: 'New user registration: Ankit Verma', time: '5 min ago' },
    { text: 'System update completed successfully', time: '1 hour ago' },
    { text: 'Revenue report generated for Q3', time: '3 hours ago' },
    { text: 'Server maintenance scheduled for tonight', time: '5 hours ago' },
  ]

  const adminLinks = [
    { label: 'Dashboard', icon: '📊' },
    { label: 'Users', icon: '👥' },
    { label: 'Reports', icon: '📈' },
    { label: 'Settings', icon: '⚙️' },
    { label: 'Notifications', icon: '🔔' },
  ]

  return (
    <div className="dashboard-layout">
      <Sidebar
        title="Admin Panel"
        links={adminLinks}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="dashboard-main">
        <header className="dashboard-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
          <h1>Admin Dashboard</h1>
          <div className="header-right">
            <span className="header-user">👨‍💼 Admin</span>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div className="stat-card" key={index} style={{ borderTop: `4px solid ${stat.color}` }}>
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-info">
                  <h3>{stat.value}</h3>
                  <p>{stat.title}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-card wide-card">
              <h2>Recent Users</h2>
              <div className="table-wrapper">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((user, index) => (
                      <tr key={index}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                        <td>
                          <span className={`status-badge ${user.status.toLowerCase()}`}>
                            {user.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Quick Actions</h2>
              <div className="quick-actions">
                <button className="action-btn">➕ Add User</button>
                <button className="action-btn">📊 Generate Report</button>
                <button className="action-btn">📧 Send Newsletter</button>
                <button className="action-btn">⚙️ System Settings</button>
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Notifications</h2>
              <div className="notification-list">
                {notifications.map((notif, index) => (
                  <div className="notification-item" key={index}>
                    <p>{notif.text}</p>
                    <span className="notif-time">{notif.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Profile</h2>
              <div className="profile-section">
                <div className="profile-avatar">👨‍💼</div>
                <h3>Admin User</h3>
                <p>admin@dashboard.com</p>
                <p className="profile-role">Super Administrator</p>
                <button className="action-btn">Edit Profile</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
