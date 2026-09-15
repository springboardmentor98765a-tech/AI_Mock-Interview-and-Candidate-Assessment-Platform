import React from "react";
import { useNavigate } from "react-router-dom";
import "./RecruiterDashboard.css";

function RecruiterDashboard() {
  const navigate = useNavigate();

  const recruiter = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const recruiterName =
    recruiter.name ||
    recruiter.username ||
    recruiter.email?.split("@")[0] ||
    "Recruiter";

  const stats = [
    {
      title: "Total Candidates",
      value: "128",
      icon: "👥",
      description: "Candidates in your pipeline",
    },
    {
      title: "Interviews Completed",
      value: "86",
      icon: "🎤",
      description: "Successfully completed",
    },
    {
      title: "Average Score",
      value: "78%",
      icon: "📊",
      description: "Overall candidate performance",
    },
    {
      title: "Shortlisted",
      value: "24",
      icon: "⭐",
      description: "Candidates shortlisted",
    },
  ];

  const recentCandidates = [
    {
      name: "Ananya Sharma",
      role: "Full Stack Developer",
      score: 91,
      status: "Shortlisted",
    },
    {
      name: "Rahul Kumar",
      role: "Python Developer",
      score: 84,
      status: "Shortlisted",
    },
    {
      name: "Sneha Patel",
      role: "Data Analyst",
      score: 76,
      status: "Under Review",
    },
    {
      name: "Arjun Rao",
      role: "Frontend Developer",
      score: 68,
      status: "Under Review",
    },
    {
      name: "Priya Nair",
      role: "AI/ML Engineer",
      score: 93,
      status: "Shortlisted",
    },
  ];

  const activities = [
    {
      icon: "🎯",
      title: "Interview completed",
      text: "Ananya Sharma completed a Full Stack interview",
      time: "10 minutes ago",
    },
    {
      icon: "⭐",
      title: "Candidate shortlisted",
      text: "Priya Nair was added to the shortlist",
      time: "35 minutes ago",
    },
    {
      icon: "📄",
      title: "Resume received",
      text: "A new candidate resume was uploaded",
      time: "1 hour ago",
    },
    {
      icon: "📊",
      title: "Report generated",
      text: "AI performance report is ready",
      time: "2 hours ago",
    },
  ];

  return (
    <div className="recruiter-dashboard">

      {/* ================= HEADER ================= */}

      <header className="recruiter-header">
        <div className="brand-area">
          <div className="brand-logo">SH</div>

          <div>
            <h1>SmartHire AI</h1>
            <p>Recruiter Portal</p>
          </div>
        </div>

        <div className="header-right">
          <div className="notification">
            🔔
            <span className="notification-dot"></span>
          </div>

          <div className="recruiter-profile">
            <div className="profile-avatar">
              {recruiterName.charAt(0).toUpperCase()}
            </div>

            <div className="profile-info">
              <strong>{recruiterName}</strong>
              <span>Recruiter</span>
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}

      <main className="recruiter-main">

        {/* Welcome Section */}

        <section className="welcome-section">
          <div>
            <span className="welcome-label">
              RECRUITER DASHBOARD
            </span>

            <h2>
              Welcome back,{" "}
              <span>{recruiterName}</span> 👋
            </h2>

            <p>
              Manage candidates, review AI interview performance,
              and find the best talent for your team.
            </p>
          </div>

          <div className="welcome-decoration">
            <div className="decoration-circle circle-one"></div>
            <div className="decoration-circle circle-two"></div>
            <div className="decoration-star">✦</div>
          </div>
        </section>

        {/* ================= STAT CARDS ================= */}

        <section className="stats-grid">

          {stats.map((stat, index) => (
            <div
              className="stat-card"
              key={index}
            >
              <div className="stat-top">
                <div className="stat-icon">
                  {stat.icon}
                </div>

                <span className="stat-arrow">↗</span>
              </div>

              <h3>{stat.value}</h3>

              <h4>{stat.title}</h4>

              <p>{stat.description}</p>
            </div>
          ))}

        </section>

        {/* ================= QUICK ACTIONS ================= */}

        <section className="section-block">

          <div className="section-heading">
            <div>
              <span className="section-label">
                QUICK ACTIONS
              </span>

              <h3>Recruiter Tools</h3>
            </div>
          </div>

          <div className="quick-actions">

            <button
              className="quick-card"
              onClick={() =>
                navigate("/recruiter/candidates")
              }
            >
              <div className="quick-icon">👥</div>

              <div>
                <strong>View Candidates</strong>
                <span>
                  Browse and evaluate candidates
                </span>
              </div>

              <b>→</b>
            </button>

            <button
              className="quick-card"
              onClick={() =>
                navigate("/recruiter/reports")
              }
            >
              <div className="quick-icon">📊</div>

              <div>
                <strong>Performance Reports</strong>
                <span>
                  Review AI-powered reports
                </span>
              </div>

              <b>→</b>
            </button>

            <button
              className="quick-card"
              onClick={() =>
                navigate("/recruiter/compare")
              }
            >
              <div className="quick-icon">⚖️</div>

              <div>
                <strong>Compare Candidates</strong>
                <span>
                  Compare candidate performance
                </span>
              </div>

              <b>→</b>
            </button>

            <button
              className="quick-card"
              onClick={() =>
                navigate("/recruiter/templates")
              }
            >
              <div className="quick-icon">📝</div>

              <div>
                <strong>Interview Templates</strong>
                <span>
                  Create reusable interview templates
                </span>
              </div>

              <b>→</b>
            </button>

          </div>
        </section>

        {/* ================= LOWER GRID ================= */}

        <div className="dashboard-lower-grid">

          {/* Recent Candidates */}

          <section className="panel-card">

            <div className="panel-header">

              <div>
                <span className="section-label">
                  CANDIDATES
                </span>

                <h3>Recent Candidates</h3>
              </div>

              <button
                className="view-all-btn"
                onClick={() =>
                  navigate("/recruiter/candidates")
                }
              >
                View All →
              </button>

            </div>

            <div className="candidate-list">

              {recentCandidates.map(
                (candidate, index) => (
                  <div
                    className="candidate-row"
                    key={index}
                  >

                    <div className="candidate-avatar">
                      {candidate.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="candidate-details">
                      <strong>
                        {candidate.name}
                      </strong>

                      <span>
                        {candidate.role}
                      </span>
                    </div>

                    <div className="candidate-score">
                      <strong>
                        {candidate.score}%
                      </strong>

                      <span>Score</span>
                    </div>

                    <span
                      className={`candidate-status ${
                        candidate.status ===
                        "Shortlisted"
                          ? "status-shortlisted"
                          : "status-review"
                      }`}
                    >
                      {candidate.status}
                    </span>

                  </div>
                )
              )}

            </div>
          </section>

          {/* Activity */}

          <section className="panel-card">

            <div className="panel-header">

              <div>
                <span className="section-label">
                  ACTIVITY
                </span>

                <h3>Recent Activity</h3>
              </div>

              <span className="live-indicator">
                ● Live
              </span>

            </div>

            <div className="activity-list">

              {activities.map(
                (activity, index) => (
                  <div
                    className="activity-item"
                    key={index}
                  >

                    <div className="activity-icon">
                      {activity.icon}
                    </div>

                    <div className="activity-content">
                      <strong>
                        {activity.title}
                      </strong>

                      <p>
                        {activity.text}
                      </p>

                      <span>
                        {activity.time}
                      </span>
                    </div>

                  </div>
                )
              )}

            </div>
          </section>

        </div>

        {/* ================= AI INSIGHT ================= */}

        <section className="ai-insight">

          <div className="ai-insight-icon">
            ✨
          </div>

          <div className="ai-insight-content">
            <span>AI RECRUITMENT INSIGHT</span>

            <h3>
              Your candidate pipeline is looking strong
            </h3>

            <p>
              24 candidates currently meet your
              shortlist criteria. AI analysis shows
              strong performance in technical skills
              and communication.
            </p>
          </div>

          <button
            onClick={() =>
              navigate("/recruiter/reports")
            }
          >
            Explore Reports →
          </button>

        </section>

      </main>

      {/* ================= FOOTER ================= */}

      <footer className="recruiter-footer">
        <p>
          © 2026 SmartHire AI · Intelligent Recruitment
          Platform
        </p>

        <span>
          AI-powered • Secure • Smart
        </span>
      </footer>

    </div>
  );
}

export default RecruiterDashboard;