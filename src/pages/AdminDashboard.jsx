import React from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  // =========================================================
  // DEMO ADMIN DASHBOARD DATA
  // =========================================================

  const stats = [
    {
      icon: "👥",
      label: "Total Users",
      value: "1,284",
      change: "+12.5%",
      description: "from last month",
    },
    {
      icon: "🧑‍💼",
      label: "Recruiters",
      value: "86",
      change: "+8.2%",
      description: "from last month",
    },
    {
      icon: "🎓",
      label: "Candidates",
      value: "1,198",
      change: "+14.7%",
      description: "from last month",
    },
    {
      icon: "🎤",
      label: "Total Interviews",
      value: "3,642",
      change: "+18.4%",
      description: "from last month",
    },
  ];

  const platformStats = [
    {
      label: "Completed Interviews",
      value: "2,918",
      percentage: 80,
    },
    {
      label: "Average Interview Score",
      value: "78%",
      percentage: 78,
    },
    {
      label: "Candidate Satisfaction",
      value: "92%",
      percentage: 92,
    },
    {
      label: "AI Assessment Accuracy",
      value: "89%",
      percentage: 89,
    },
  ];

  const recentActivities = [
    {
      icon: "👤",
      title: "New candidate registered",
      description: "A new candidate joined SmartHire AI",
      time: "5 minutes ago",
      type: "user",
    },
    {
      icon: "🧑‍💼",
      title: "Recruiter account created",
      description: "A new recruiter account was created",
      time: "18 minutes ago",
      type: "recruiter",
    },
    {
      icon: "🎤",
      title: "Interview completed",
      description: "Technical interview session completed",
      time: "32 minutes ago",
      type: "interview",
    },
    {
      icon: "📄",
      title: "Resume processed",
      description: "AI skill extraction completed successfully",
      time: "46 minutes ago",
      type: "resume",
    },
    {
      icon: "⚙️",
      title: "System configuration updated",
      description: "AI interview configuration was updated",
      time: "1 hour ago",
      type: "system",
    },
  ];

  const topCandidates = [
    {
      name: "Sneha Kulkarni",
      role: "Full Stack Developer",
      score: 94,
      status: "Excellent",
    },
    {
      name: "Ananya Sharma",
      role: "Frontend Developer",
      score: 91,
      status: "Excellent",
    },
    {
      name: "Riya Patel",
      role: "Python Developer",
      score: 87,
      status: "Strong",
    },
    {
      name: "Kavya Reddy",
      role: "Data Analyst",
      score: 84,
      status: "Strong",
    },
  ];

  // =========================================================
  // QUICK ACTIONS
  // =========================================================

  const quickActions = [
    {
      icon: "👥",
      title: "Manage Users",
      description: "View and manage candidate accounts",
      path: "/admin/users",
    },
    {
      icon: "🧑‍💼",
      title: "Manage Recruiters",
      description: "Manage recruiter accounts",
      path: "/admin/recruiters",
    },
    {
      icon: "📊",
      title: "Platform Analytics",
      description: "View platform performance",
      path: "/admin/analytics",
    },
    {
      icon: "🤖",
      title: "AI Configuration",
      description: "Configure AI interview settings",
      path: "/admin/ai-settings",
    },
  ];

  return (
    <div className="admin-dashboard-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="admin-header">

        <div className="admin-brand">

          <div className="admin-logo">
            SH
          </div>

          <div>
            <h1>SmartHire AI</h1>
            <span>Administrator Portal</span>
          </div>

        </div>

        <div className="admin-header-right">

          <div className="admin-system-status">
            <span className="system-status-dot"></span>
            All Systems Operational
          </div>

          <button
            className="admin-profile"
            onClick={() => navigate("/admin")}
          >
            <span className="admin-profile-avatar">
              A
            </span>

            <span className="admin-profile-text">
              <strong>Administrator</strong>
              <small>Super Admin</small>
            </span>

            <span className="admin-profile-arrow">
              ▾
            </span>
          </button>

        </div>

      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="admin-main">

        {/* ===================================================
            WELCOME SECTION
            =================================================== */}

        <section className="admin-welcome">

          <div className="admin-welcome-content">

            <span className="admin-eyebrow">
              ADMIN CONTROL CENTER
            </span>

            <h2>
              Welcome back, Administrator 👋
            </h2>

            <p>
              Monitor your SmartHire AI platform, manage users,
              review recruitment activity and keep your AI
              assessment system running smoothly.
            </p>

            <div className="admin-welcome-actions">

              <button
                className="admin-primary-btn"
                onClick={() => navigate("/admin/users")}
              >
                Manage Users
                <span>→</span>
              </button>

              <button
                className="admin-secondary-btn"
                onClick={() => navigate("/admin/analytics")}
              >
                View Analytics
              </button>

            </div>

          </div>

          <div className="admin-welcome-visual">

            <div className="admin-orbit orbit-one"></div>
            <div className="admin-orbit orbit-two"></div>

            <div className="admin-visual-card">
              <span>🤖</span>
              <strong>AI</strong>
              <small>ACTIVE</small>
            </div>

          </div>

        </section>

        {/* ===================================================
            STATISTICS
            =================================================== */}

        <section className="admin-section">

          <div className="admin-section-heading">

            <div>
              <span className="admin-section-label">
                PLATFORM OVERVIEW
              </span>

              <h3>
                System Statistics
              </h3>
            </div>

            <span className="admin-live-text">
              ● Live overview
            </span>

          </div>

          <div className="admin-stats-grid">

            {stats.map((stat) => (
              <div
                className="admin-stat-card"
                key={stat.label}
              >

                <div className="admin-stat-top">

                  <div className="admin-stat-icon">
                    {stat.icon}
                  </div>

                  <span className="admin-stat-change">
                    {stat.change}
                  </span>

                </div>

                <span className="admin-stat-label">
                  {stat.label}
                </span>

                <strong className="admin-stat-value">
                  {stat.value}
                </strong>

                <span className="admin-stat-description">
                  {stat.description}
                </span>

              </div>
            ))}

          </div>

        </section>

        {/* ===================================================
            PLATFORM PERFORMANCE + AI STATUS
            =================================================== */}

        <section className="admin-two-column">

          {/* PLATFORM PERFORMANCE */}

          <div className="admin-panel">

            <div className="admin-panel-header">

              <div>
                <span className="admin-section-label">
                  PERFORMANCE
                </span>

                <h3>
                  Platform Health
                </h3>
              </div>

              <span className="admin-health-badge">
                Healthy
              </span>

            </div>

            <div className="admin-platform-stats">

              {platformStats.map((item) => (
                <div
                  className="admin-platform-stat"
                  key={item.label}
                >

                  <div className="admin-platform-stat-heading">

                    <span>
                      {item.label}
                    </span>

                    <strong>
                      {item.value}
                    </strong>

                  </div>

                  <div className="admin-progress-track">

                    <div
                      className="admin-progress-fill"
                      style={{
                        width: `${item.percentage}%`,
                      }}
                    ></div>

                  </div>

                </div>
              ))}

            </div>

          </div>

          {/* AI STATUS */}

          <div className="admin-panel ai-status-panel">

            <div className="admin-panel-header">

              <div>
                <span className="admin-section-label">
                  ARTIFICIAL INTELLIGENCE
                </span>

                <h3>
                  AI System Status
                </h3>
              </div>

              <div className="ai-active-badge">
                <span></span>
                Active
              </div>

            </div>

            <div className="ai-status-main">

              <div className="ai-brain-icon">
                🤖
              </div>

              <div>

                <strong>
                  SmartHire AI Engine
                </strong>

                <p>
                  Interview generation, assessment and
                  candidate analysis services are operational.
                </p>

              </div>

            </div>

            <div className="ai-services">

              <div className="ai-service">
                <span>Question Generation</span>
                <strong>Online</strong>
              </div>

              <div className="ai-service">
                <span>Resume Analysis</span>
                <strong>Online</strong>
              </div>

              <div className="ai-service">
                <span>Interview Assessment</span>
                <strong>Online</strong>
              </div>

              <div className="ai-service">
                <span>Performance Analysis</span>
                <strong>Online</strong>
              </div>

            </div>

          </div>

        </section>

        {/* ===================================================
            QUICK ACTIONS
            =================================================== */}

        <section className="admin-section">

          <div className="admin-section-heading">

            <div>
              <span className="admin-section-label">
                ADMINISTRATION
              </span>

              <h3>
                Quick Actions
              </h3>
            </div>

          </div>

          <div className="admin-actions-grid">

            {quickActions.map((action) => (
              <button
                className="admin-action-card"
                key={action.title}
                onClick={() => navigate(action.path)}
              >

                <div className="admin-action-icon">
                  {action.icon}
                </div>

                <div className="admin-action-content">

                  <strong>
                    {action.title}
                  </strong>

                  <span>
                    {action.description}
                  </span>

                </div>

                <span className="admin-action-arrow">
                  →
                </span>

              </button>
            ))}

          </div>

        </section>

        {/* ===================================================
            BOTTOM GRID
            =================================================== */}

        <section className="admin-bottom-grid">

          {/* RECENT ACTIVITY */}

          <div className="admin-panel activity-panel">

            <div className="admin-panel-header">

              <div>
                <span className="admin-section-label">
                  ACTIVITY
                </span>

                <h3>
                  Recent Platform Activity
                </h3>
              </div>

              <button className="admin-view-all">
                View All
              </button>

            </div>

            <div className="activity-list">

              {recentActivities.map((activity, index) => (
                <div
                  className="activity-item"
                  key={`${activity.title}-${index}`}
                >

                  <div className={`activity-icon ${activity.type}`}>
                    {activity.icon}
                  </div>

                  <div className="activity-content">

                    <strong>
                      {activity.title}
                    </strong>

                    <span>
                      {activity.description}
                    </span>

                  </div>

                  <time>
                    {activity.time}
                  </time>

                </div>
              ))}

            </div>

          </div>

          {/* TOP CANDIDATES */}

          <div className="admin-panel candidates-panel">

            <div className="admin-panel-header">

              <div>
                <span className="admin-section-label">
                  CANDIDATES
                </span>

                <h3>
                  Top Performers
                </h3>
              </div>

              <button
                className="admin-view-all"
                onClick={() => navigate("/admin/users")}
              >
                View All
              </button>

            </div>

            <div className="top-candidates-list">

              {topCandidates.map((candidate, index) => (
                <div
                  className="top-candidate"
                  key={candidate.name}
                >

                  <div className="candidate-rank">
                    {index + 1}
                  </div>

                  <div className="candidate-mini-avatar">
                    {candidate.name
                      .split(" ")
                      .map((name) => name[0])
                      .join("")
                      .slice(0, 2)}
                  </div>

                  <div className="top-candidate-info">

                    <strong>
                      {candidate.name}
                    </strong>

                    <span>
                      {candidate.role}
                    </span>

                  </div>

                  <div className="top-candidate-score">

                    <strong>
                      {candidate.score}%
                    </strong>

                    <span>
                      {candidate.status}
                    </span>

                  </div>

                </div>
              ))}

            </div>

          </div>

        </section>

        {/* ===================================================
            SECURITY STATUS
            =================================================== */}

        <section className="admin-security-panel">

          <div className="security-icon">
            🔐
          </div>

          <div className="security-content">

            <span className="admin-section-label">
              SECURITY & SYSTEM
            </span>

            <h3>
              SmartHire AI is running securely
            </h3>

            <p>
              User authentication, session management,
              interview recordings and platform services
              are currently operational.
            </p>

          </div>

          <div className="security-checks">

            <div>
              <span></span>
              Authentication
            </div>

            <div>
              <span></span>
              Database
            </div>

            <div>
              <span></span>
              AI Services
            </div>

          </div>

        </section>

      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="admin-footer">

        <span>
          © 2026 SmartHire AI
        </span>

        <span>
          Administrator Control Center
        </span>

        <span>
          AI-Powered Recruitment Platform
        </span>

      </footer>

    </div>
  );
}

export default AdminDashboard;