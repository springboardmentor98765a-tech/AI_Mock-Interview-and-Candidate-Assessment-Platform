import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminAnalytics.css";

function AdminAnalytics() {
  const navigate = useNavigate();

  const [period, setPeriod] = useState("6 Months");

  const monthlyData = {
    "7 Days": [
      { month: "Mon", interviews: 82, completed: 67 },
      { month: "Tue", interviews: 96, completed: 79 },
      { month: "Wed", interviews: 110, completed: 91 },
      { month: "Thu", interviews: 103, completed: 86 },
      { month: "Fri", interviews: 128, completed: 104 },
      { month: "Sat", interviews: 76, completed: 61 },
      { month: "Sun", interviews: 69, completed: 56 },
    ],
    "30 Days": [
      { month: "Week 1", interviews: 486, completed: 391 },
      { month: "Week 2", interviews: 542, completed: 437 },
      { month: "Week 3", interviews: 614, completed: 501 },
      { month: "Week 4", interviews: 658, completed: 537 },
    ],
    "6 Months": [
      { month: "Apr", interviews: 421, completed: 342 },
      { month: "May", interviews: 508, completed: 416 },
      { month: "Jun", interviews: 563, completed: 462 },
      { month: "Jul", interviews: 621, completed: 511 },
      { month: "Aug", interviews: 714, completed: 589 },
      { month: "Sep", interviews: 816, completed: 674 },
    ],
    "1 Year": [
      { month: "Oct", interviews: 398, completed: 319 },
      { month: "Nov", interviews: 421, completed: 342 },
      { month: "Dec", interviews: 462, completed: 377 },
      { month: "Jan", interviews: 508, completed: 416 },
      { month: "Feb", interviews: 547, completed: 448 },
      { month: "Mar", interviews: 589, completed: 481 },
      { month: "Apr", interviews: 621, completed: 511 },
      { month: "May", interviews: 658, completed: 537 },
      { month: "Jun", interviews: 703, completed: 578 },
      { month: "Jul", interviews: 741, completed: 609 },
      { month: "Aug", interviews: 782, completed: 644 },
      { month: "Sep", interviews: 816, completed: 674 },
    ],
  };

  const topCandidates = [
    {
      rank: 1,
      name: "Aarav Sharma",
      role: "Full Stack Developer",
      score: 96,
      communication: 94,
      confidence: 95,
    },
    {
      rank: 2,
      name: "Ananya Rao",
      role: "Data Analyst",
      score: 94,
      communication: 96,
      confidence: 92,
    },
    {
      rank: 3,
      name: "Riya Kapoor",
      role: "AI/ML Engineer",
      score: 92,
      communication: 91,
      confidence: 94,
    },
    {
      rank: 4,
      name: "Rahul Verma",
      role: "Software Engineer",
      score: 90,
      communication: 89,
      confidence: 91,
    },
    {
      rank: 5,
      name: "Ishita Nair",
      role: "Frontend Developer",
      score: 88,
      communication: 90,
      confidence: 87,
    },
  ];

  const interviewTypes = [
    {
      name: "Technical",
      value: 42,
      count: 1531,
    },
    {
      name: "HR",
      value: 24,
      count: 874,
    },
    {
      name: "Behavioral",
      value: 18,
      count: 656,
    },
    {
      name: "Aptitude",
      value: 16,
      count: 581,
    },
  ];

  const analyticsCards = [
    {
      icon: "👥",
      label: "Total Users",
      value: "1,284",
      change: "+12.8%",
      positive: true,
      description: "Platform registered users",
    },
    {
      icon: "🎯",
      label: "Total Interviews",
      value: "3,642",
      change: "+18.4%",
      positive: true,
      description: "Interviews conducted",
    },
    {
      icon: "📈",
      label: "Average Score",
      value: "78.6%",
      change: "+4.7%",
      positive: true,
      description: "Platform average",
    },
    {
      icon: "🤖",
      label: "AI Accuracy",
      value: "89.2%",
      change: "+2.9%",
      positive: true,
      description: "Assessment accuracy",
    },
  ];

  const visualMetrics = [
    {
      icon: "👁️",
      label: "Eye Contact",
      value: 82,
      description: "Average observable eye-contact signal",
    },
    {
      icon: "🎯",
      label: "Attention",
      value: 86,
      description: "Average attention signal",
    },
    {
      icon: "✨",
      label: "Engagement",
      value: 84,
      description: "Average engagement signal",
    },
    {
      icon: "💪",
      label: "Confidence",
      value: 81,
      description: "Average confidence signal",
    },
  ];

  const aiMetrics = [
    {
      label: "Question Generation",
      value: 94,
      status: "Excellent",
    },
    {
      label: "Answer Evaluation",
      value: 91,
      status: "Excellent",
    },
    {
      label: "Communication Analysis",
      value: 88,
      status: "Good",
    },
    {
      label: "Visual Signal Analysis",
      value: 86,
      status: "Good",
    },
    {
      label: "Skill Extraction",
      value: 92,
      status: "Excellent",
    },
  ];

  const totalInterviews = useMemo(
    () =>
      monthlyData[period].reduce(
        (total, item) => total + item.interviews,
        0
      ),
    [period]
  );

  const totalCompleted = useMemo(
    () =>
      monthlyData[period].reduce(
        (total, item) => total + item.completed,
        0
      ),
    [period]
  );

  const completionRate = Math.round(
    (totalCompleted / totalInterviews) * 100
  );

  const maxInterviewValue = Math.max(
    ...monthlyData[period].map((item) => item.interviews)
  );

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getScoreClass = (score) => {
    if (score >= 90) return "excellent";
    if (score >= 80) return "good";
    return "average";
  };

  return (
    <div className="admin-analytics-page">
      {/* HEADER */}
      <header className="analytics-header">
        <div className="analytics-brand-section">
          <div className="analytics-logo">SH</div>

          <div>
            <h1>SmartHire AI</h1>
            <p>Platform Analytics Center</p>
          </div>
        </div>

        <div className="analytics-header-actions">
          <div className="system-live">
            <span className="live-dot"></span>
            All Systems Operational
          </div>

          <button
            className="analytics-back-button"
            onClick={() => navigate("/admin")}
          >
            ← Admin Dashboard
          </button>
        </div>
      </header>

      {/* INTRO */}
      <section className="analytics-intro">
        <div>
          <span className="analytics-eyebrow">
            ADMINISTRATOR • ANALYTICS
          </span>

          <h2>Platform Performance Analytics</h2>

          <p>
            Monitor SmartHire AI platform activity, interview performance,
            candidate behavior signals, and AI assessment quality from one
            centralized dashboard.
          </p>
        </div>

        <div className="analytics-period-box">
          <label htmlFor="analytics-period">Analytics Period</label>

          <select
            id="analytics-period"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option>7 Days</option>
            <option>30 Days</option>
            <option>6 Months</option>
            <option>1 Year</option>
          </select>
        </div>
      </section>

      {/* OVERVIEW CARDS */}
      <section className="analytics-card-grid">
        {analyticsCards.map((card) => (
          <div className="analytics-stat-card" key={card.label}>
            <div className="analytics-stat-top">
              <div className="analytics-stat-icon">{card.icon}</div>

              <span
                className={`analytics-change ${
                  card.positive ? "positive" : "negative"
                }`}
              >
                {card.change}
              </span>
            </div>

            <div className="analytics-stat-value">{card.value}</div>

            <div className="analytics-stat-label">{card.label}</div>

            <p>{card.description}</p>
          </div>
        ))}
      </section>

      {/* PLATFORM HEALTH */}
      <section className="analytics-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">PLATFORM HEALTH</span>
            <h3>Interview & Assessment Overview</h3>
          </div>

          <div className="section-badge">Live Analytics</div>
        </div>

        <div className="health-grid">
          <div className="health-card">
            <div className="health-card-header">
              <span>Interview Completion</span>
              <strong>{completionRate}%</strong>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>

            <p>
              {totalCompleted.toLocaleString()} completed out of{" "}
              {totalInterviews.toLocaleString()} recorded interviews
            </p>
          </div>

          <div className="health-card">
            <div className="health-card-header">
              <span>Candidate Satisfaction</span>
              <strong>92%</strong>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: "92%" }}
              ></div>
            </div>

            <p>Based on post-interview candidate feedback</p>
          </div>

          <div className="health-card">
            <div className="health-card-header">
              <span>AI Assessment Accuracy</span>
              <strong>89%</strong>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: "89%" }}
              ></div>
            </div>

            <p>Current AI evaluation quality indicator</p>
          </div>
        </div>
      </section>

      {/* INTERVIEW ACTIVITY */}
      <section className="analytics-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">INTERVIEW ACTIVITY</span>
            <h3>Interview Activity Trends</h3>
          </div>

          <div className="trend-summary">
            <span>
              {totalInterviews.toLocaleString()} interviews
            </span>

            <span>
              {totalCompleted.toLocaleString()} completed
            </span>
          </div>
        </div>

        <div className="activity-chart-card">
          <div className="chart-legend">
            <span>
              <i className="legend-box interviews"></i>
              Interviews
            </span>

            <span>
              <i className="legend-box completed"></i>
              Completed
            </span>
          </div>

          <div className="activity-chart">
            {monthlyData[period].map((item) => {
              const interviewHeight =
                (item.interviews / maxInterviewValue) * 100;

              const completedHeight =
                (item.completed / maxInterviewValue) * 100;

              return (
                <div className="chart-column" key={item.month}>
                  <div className="chart-bars">
                    <div
                      className="chart-bar interviews"
                      style={{ height: `${interviewHeight}%` }}
                      title={`${item.interviews} interviews`}
                    >
                      <span>{item.interviews}</span>
                    </div>

                    <div
                      className="chart-bar completed"
                      style={{ height: `${completedHeight}%` }}
                      title={`${item.completed} completed`}
                    >
                      <span>{item.completed}</span>
                    </div>
                  </div>

                  <div className="chart-label">{item.month}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PERFORMANCE ANALYTICS */}
      <section className="analytics-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">AI PERFORMANCE</span>
            <h3>Candidate Performance Signals</h3>
          </div>
        </div>

        <div className="visual-metrics-grid">
          {visualMetrics.map((metric) => (
            <div className="visual-metric-card" key={metric.label}>
              <div className="visual-metric-icon">{metric.icon}</div>

              <div className="visual-metric-info">
                <div className="visual-metric-title">
                  <span>{metric.label}</span>
                  <strong>{metric.value}%</strong>
                </div>

                <div className="metric-progress">
                  <div
                    style={{ width: `${metric.value}%` }}
                  ></div>
                </div>

                <p>{metric.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TWO COLUMN AREA */}
      <section className="analytics-two-column">
        {/* INTERVIEW TYPES */}
        <div className="analytics-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">INTERVIEW MIX</span>
              <h3>Interview Types</h3>
            </div>

            <span className="panel-total">3,642 Total</span>
          </div>

          <div className="interview-type-list">
            {interviewTypes.map((type) => (
              <div className="interview-type-item" key={type.name}>
                <div className="type-info">
                  <div className="type-name">
                    <span className={`type-dot ${type.name.toLowerCase()}`}></span>
                    {type.name}
                  </div>

                  <strong>{type.count}</strong>
                </div>

                <div className="type-progress">
                  <div
                    style={{ width: `${type.value}%` }}
                  ></div>
                </div>

                <span className="type-percent">{type.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* USER DISTRIBUTION */}
        <div className="analytics-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">USER BASE</span>
              <h3>User Distribution</h3>
            </div>
          </div>

          <div className="user-distribution">
            <div className="distribution-circle">
              <div>
                <strong>1,284</strong>
                <span>Users</span>
              </div>
            </div>

            <div className="distribution-list">
              <div>
                <span className="distribution-label">
                  <i className="candidate-dot"></i>
                  Candidates
                </span>
                <strong>1,198</strong>
              </div>

              <div>
                <span className="distribution-label">
                  <i className="recruiter-dot"></i>
                  Recruiters
                </span>
                <strong>86</strong>
              </div>

              <div>
                <span className="distribution-label">
                  <i className="admin-dot"></i>
                  Administrators
                </span>
                <strong>8</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TOP PERFORMERS */}
      <section className="analytics-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">TOP PERFORMANCE</span>
            <h3>Top Performing Candidates</h3>
          </div>

          <button
            className="view-all-button"
            onClick={() => navigate("/recruiter/candidates")}
          >
            View Candidate Management →
          </button>
        </div>

        <div className="performers-table-wrapper">
          <table className="performers-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate</th>
                <th>Role</th>
                <th>Overall Score</th>
                <th>Communication</th>
                <th>Confidence</th>
              </tr>
            </thead>

            <tbody>
              {topCandidates.map((candidate) => (
                <tr key={candidate.name}>
                  <td>
                    <span className={`rank-badge rank-${candidate.rank}`}>
                      {candidate.rank}
                    </span>
                  </td>

                  <td>
                    <div className="candidate-cell">
                      <div className="candidate-avatar">
                        {getInitials(candidate.name)}
                      </div>

                      <div>
                        <strong>{candidate.name}</strong>
                        <span>Verified Candidate</span>
                      </div>
                    </div>
                  </td>

                  <td>{candidate.role}</td>

                  <td>
                    <span
                      className={`score-pill ${getScoreClass(
                        candidate.score
                      )}`}
                    >
                      {candidate.score}%
                    </span>
                  </td>

                  <td>{candidate.communication}%</td>

                  <td>{candidate.confidence}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* AI SYSTEM PERFORMANCE */}
      <section className="analytics-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">AI ENGINE</span>
            <h3>AI System Performance</h3>
          </div>

          <div className="ai-status">
            <span></span>
            AI Engine Healthy
          </div>
        </div>

        <div className="ai-performance-grid">
          {aiMetrics.map((metric) => (
            <div className="ai-performance-card" key={metric.label}>
              <div className="ai-performance-header">
                <span>{metric.label}</span>

                <strong>{metric.value}%</strong>
              </div>

              <div className="ai-progress">
                <div
                  style={{ width: `${metric.value}%` }}
                ></div>
              </div>

              <div className="ai-performance-footer">
                <span>{metric.status}</span>
                <span>AI monitored</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* INSIGHTS */}
      <section className="analytics-insights">
        <div className="insight-icon">🤖</div>

        <div className="insight-content">
          <span>AI-GENERATED PLATFORM INSIGHT</span>

          <h3>
            SmartHire AI performance is trending positively
          </h3>

          <p>
            Interview activity has increased consistently across the
            selected period. Technical interviews represent the largest
            category, while average candidate performance remains above
            the platform baseline. Communication, attention, engagement,
            and other visual signals are being monitored as observable
            interview behavior indicators.
          </p>
        </div>

        <div className="insight-score">
          <strong>89%</strong>
          <span>Platform Health</span>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="analytics-footer">
        <div>
          <strong>SmartHire AI</strong>
          <span>Administrator Analytics</span>
        </div>

        <p>
          AI analytics are designed to support human decision-making.
          Observable visual signals are not psychological or medical
          measurements.
        </p>

        <span>© 2026 SmartHire AI</span>
      </footer>
    </div>
  );
}

export default AdminAnalytics;