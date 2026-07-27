import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import '../styles/dashboard.css'

function StudentDashboard() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('role')
    navigate('/login')
  }

  const stats = [
    { title: 'Courses', value: '6', icon: '📚', color: '#7c3aed' },
    { title: 'Assignments', value: '12', icon: '📝', color: '#2563eb' },
    { title: 'Attendance', value: '87%', icon: '📅', color: '#059669' },
    { title: 'GPA', value: '3.6', icon: '⭐', color: '#d97706' },
  ]

  const deadlines = [
    { task: 'Data Structures Assignment', course: 'CS201', due: 'Jul 30, 2025', priority: 'high' },
    { task: 'Database Project Submission', course: 'CS301', due: 'Aug 2, 2025', priority: 'high' },
    { task: 'Web Dev Lab Report', course: 'CS205', due: 'Aug 5, 2025', priority: 'medium' },
    { task: 'Mathematics Quiz', course: 'MA101', due: 'Aug 8, 2025', priority: 'low' },
    { task: 'English Essay', course: 'EN102', due: 'Aug 10, 2025', priority: 'medium' },
  ]

  const recentActivity = [
    { text: 'Submitted Web Dev Assignment', time: '2 hours ago' },
    { text: 'Attended OS Lecture', time: '5 hours ago' },
    { text: 'Downloaded study material for CS301', time: '1 day ago' },
    { text: 'Completed Python Quiz - Score: 85%', time: '2 days ago' },
  ]

  const courses = [
    { name: 'Data Structures', code: 'CS201', progress: 72 },
    { name: 'Database Systems', code: 'CS301', progress: 58 },
    { name: 'Web Development', code: 'CS205', progress: 85 },
    { name: 'Operating Systems', code: 'CS302', progress: 45 },
  ]

  const studentLinks = [
    { label: 'Dashboard', icon: '📊' },
    { label: 'Courses', icon: '📚' },
    { label: 'Assignments', icon: '📝' },
    { label: 'Grades', icon: '📈' },
    { label: 'Schedule', icon: '📅' },
  ]

  return (
    <div className="dashboard-layout">
      <Sidebar
        title="Student Portal"
        links={studentLinks}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="dashboard-main">
        <header className="dashboard-header student-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
          <h1>Student Dashboard</h1>
          <div className="header-right">
            <span className="header-user">🎓 Student</span>
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
            <div className="dashboard-card">
              <h2>Course Progress</h2>
              <div className="course-list">
                {courses.map((course, index) => (
                  <div className="course-item" key={index}>
                    <div className="course-info">
                      <span className="course-name">{course.name}</span>
                      <span className="course-code">{course.code}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${course.progress}%` }}></div>
                    </div>
                    <span className="progress-text">{course.progress}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Upcoming Deadlines</h2>
              <div className="deadline-list">
                {deadlines.map((item, index) => (
                  <div className="deadline-item" key={index}>
                    <div className="deadline-info">
                      <span className="deadline-task">{item.task}</span>
                      <span className="deadline-course">{item.course}</span>
                    </div>
                    <div className="deadline-meta">
                      <span className="deadline-date">{item.due}</span>
                      <span className={`priority-badge ${item.priority}`}>{item.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Recent Activity</h2>
              <div className="activity-list">
                {recentActivity.map((activity, index) => (
                  <div className="activity-item" key={index}>
                    <p>{activity.text}</p>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Profile</h2>
              <div className="profile-section">
                <div className="profile-avatar">🎓</div>
                <h3>Hemanth M</h3>
                <p>hemanth@university.edu</p>
                <p className="profile-role">B.Tech Computer Science - 3rd Year</p>
                <button className="action-btn">Edit Profile</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard
