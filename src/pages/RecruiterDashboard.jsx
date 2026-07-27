import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import '../styles/dashboard.css'

function RecruiterDashboard() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('role')
    navigate('/login')
  }

  const stats = [
    { title: 'Candidates', value: '342', icon: '👤', color: '#0891b2' },
    { title: 'Open Positions', value: '18', icon: '💼', color: '#7c3aed' },
    { title: 'Interviews', value: '27', icon: '🎤', color: '#059669' },
    { title: 'Applications', value: '156', icon: '📄', color: '#dc2626' },
  ]

  const recentApplicants = [
    { name: 'Arjun Reddy', position: 'Frontend Developer', date: 'Jul 25, 2025', status: 'Shortlisted' },
    { name: 'Kavya Nair', position: 'Data Analyst', date: 'Jul 24, 2025', status: 'Under Review' },
    { name: 'Rohan Joshi', position: 'Backend Developer', date: 'Jul 23, 2025', status: 'Interview' },
    { name: 'Meera Iyer', position: 'UI/UX Designer', date: 'Jul 22, 2025', status: 'Rejected' },
    { name: 'Sanjay Das', position: 'DevOps Engineer', date: 'Jul 21, 2025', status: 'Hired' },
  ]

  const jobPostings = [
    { title: 'Senior React Developer', applicants: 45, status: 'Active', posted: 'Jul 15, 2025' },
    { title: 'Data Scientist', applicants: 32, status: 'Active', posted: 'Jul 18, 2025' },
    { title: 'Product Manager', applicants: 28, status: 'Closed', posted: 'Jul 10, 2025' },
    { title: 'DevOps Engineer', applicants: 19, status: 'Active', posted: 'Jul 20, 2025' },
  ]

  const hiringStatus = [
    { stage: 'Applications Received', count: 156 },
    { stage: 'Screening', count: 89 },
    { stage: 'Interviews Scheduled', count: 27 },
    { stage: 'Offers Extended', count: 8 },
    { stage: 'Hired', count: 5 },
  ]

  const recruiterLinks = [
    { label: 'Dashboard', icon: '📊' },
    { label: 'Candidates', icon: '👤' },
    { label: 'Job Postings', icon: '💼' },
    { label: 'Interviews', icon: '🎤' },
    { label: 'Reports', icon: '📈' },
  ]

  return (
    <div className="dashboard-layout">
      <Sidebar
        title="Recruiter Hub"
        links={recruiterLinks}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="dashboard-main">
        <header className="dashboard-header recruiter-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
          <h1>Recruiter Dashboard</h1>
          <div className="header-right">
            <span className="header-user">💼 Recruiter</span>
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
              <h2>Recent Applicants</h2>
              <div className="table-wrapper">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Position</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentApplicants.map((applicant, index) => (
                      <tr key={index}>
                        <td>{applicant.name}</td>
                        <td>{applicant.position}</td>
                        <td>{applicant.date}</td>
                        <td>
                          <span className={`status-badge ${applicant.status.toLowerCase().replace(' ', '-')}`}>
                            {applicant.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Job Postings</h2>
              <div className="job-list">
                {jobPostings.map((job, index) => (
                  <div className="job-item" key={index}>
                    <div className="job-info">
                      <span className="job-title">{job.title}</span>
                      <span className="job-date">Posted: {job.posted}</span>
                    </div>
                    <div className="job-meta">
                      <span className="job-applicants">{job.applicants} applicants</span>
                      <span className={`status-badge ${job.status.toLowerCase()}`}>{job.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Hiring Pipeline</h2>
              <div className="pipeline-list">
                {hiringStatus.map((item, index) => (
                  <div className="pipeline-item" key={index}>
                    <span className="pipeline-stage">{item.stage}</span>
                    <div className="pipeline-bar">
                      <div
                        className="pipeline-fill"
                        style={{ width: `${(item.count / 156) * 100}%` }}
                      ></div>
                    </div>
                    <span className="pipeline-count">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Profile</h2>
              <div className="profile-section">
                <div className="profile-avatar">💼</div>
                <h3>HR Manager</h3>
                <p>hr@company.com</p>
                <p className="profile-role">Senior Recruiter</p>
                <button className="action-btn">Edit Profile</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecruiterDashboard
