import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RecruiterMonitoring.css";

function RecruiterMonitoring() {
  const navigate = useNavigate();

  // =========================================================
  // STATE
  // =========================================================

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedInterview, setSelectedInterview] = useState(null);

  // =========================================================
  // DEMO LIVE INTERVIEWS
  // =========================================================

  const [interviews] = useState([
    {
      id: "INT-1001",
      candidate: "Ananya Sharma",
      email: "ananya.sharma@email.com",
      role: "Frontend Developer",
      type: "Technical",
      interviewer: "Rahul Mehta",
      status: "Live",
      duration: "18:42",
      progress: 60,
      score: 84,
      communication: 88,
      confidence: 82,
      eyeContact: 91,
      attention: 87,
      engagement: 90,
      questionsAnswered: 6,
      totalQuestions: 10,
      startedAt: "10:32 AM",
      alert: null,
    },
    {
      id: "INT-1002",
      candidate: "Riya Patel",
      email: "riya.patel@email.com",
      role: "Python Developer",
      type: "Technical",
      interviewer: "Sneha Rao",
      status: "Live",
      duration: "24:15",
      progress: 80,
      score: 79,
      communication: 76,
      confidence: 81,
      eyeContact: 78,
      attention: 83,
      engagement: 80,
      questionsAnswered: 8,
      totalQuestions: 10,
      startedAt: "10:26 AM",
      alert: "Low eye contact detected",
    },
    {
      id: "INT-1003",
      candidate: "Meghana Gowda",
      email: "meghana.gowda@email.com",
      role: "Data Analyst",
      type: "Behavioral",
      interviewer: "Arjun Kumar",
      status: "Paused",
      duration: "12:08",
      progress: 40,
      score: 73,
      communication: 79,
      confidence: 69,
      eyeContact: 82,
      attention: 71,
      engagement: 74,
      questionsAnswered: 4,
      totalQuestions: 10,
      startedAt: "10:41 AM",
      alert: "Interview paused",
    },
    {
      id: "INT-1004",
      candidate: "Sneha Kulkarni",
      email: "sneha.kulkarni@email.com",
      role: "Full Stack Developer",
      type: "Technical",
      interviewer: "Priya Nair",
      status: "Live",
      duration: "31:20",
      progress: 90,
      score: 91,
      communication: 94,
      confidence: 90,
      eyeContact: 92,
      attention: 95,
      engagement: 93,
      questionsAnswered: 9,
      totalQuestions: 10,
      startedAt: "10:18 AM",
      alert: null,
    },
    {
      id: "INT-1005",
      candidate: "Pooja Desai",
      email: "pooja.desai@email.com",
      role: "UI/UX Designer",
      type: "HR",
      interviewer: "Kiran Shah",
      status: "Completed",
      duration: "28:44",
      progress: 100,
      score: 86,
      communication: 91,
      confidence: 84,
      eyeContact: 89,
      attention: 88,
      engagement: 92,
      questionsAnswered: 10,
      totalQuestions: 10,
      startedAt: "09:42 AM",
      alert: null,
    },
    {
      id: "INT-1006",
      candidate: "Kavya Reddy",
      email: "kavya.reddy@email.com",
      role: "Machine Learning Intern",
      type: "Technical",
      interviewer: "Vikram Singh",
      status: "Live",
      duration: "09:36",
      progress: 30,
      score: 77,
      communication: 73,
      confidence: 79,
      eyeContact: 86,
      attention: 76,
      engagement: 81,
      questionsAnswered: 3,
      totalQuestions: 10,
      startedAt: "10:51 AM",
      alert: "Attention level fluctuating",
    },
  ]);

  // =========================================================
  // FILTERED INTERVIEWS
  // =========================================================

  const filteredInterviews = useMemo(() => {
    const query = search.trim().toLowerCase();

    return interviews.filter((interview) => {
      const matchesSearch =
        !query ||
        interview.candidate.toLowerCase().includes(query) ||
        interview.role.toLowerCase().includes(query) ||
        interview.id.toLowerCase().includes(query) ||
        interview.interviewer.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        interview.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [interviews, search, statusFilter]);

  // =========================================================
  // SUMMARY
  // =========================================================

  const liveCount = interviews.filter(
    (item) => item.status === "Live"
  ).length;

  const pausedCount = interviews.filter(
    (item) => item.status === "Paused"
  ).length;

  const completedCount = interviews.filter(
    (item) => item.status === "Completed"
  ).length;

  const alertsCount = interviews.filter(
    (item) => item.alert
  ).length;

  // =========================================================
  // HELPERS
  // =========================================================

  const getStatusClass = (status) => {
    if (status === "Live") return "monitor-status-live";
    if (status === "Paused") return "monitor-status-paused";
    if (status === "Completed") return "monitor-status-completed";

    return "";
  };

  const getScoreClass = (score) => {
    if (score >= 85) return "monitor-score-high";
    if (score >= 70) return "monitor-score-medium";

    return "monitor-score-low";
  };

  const getMetricClass = (value) => {
    if (value >= 85) return "metric-good";
    if (value >= 70) return "metric-average";

    return "metric-low";
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="recruiter-monitor-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="monitor-header">
        <div className="monitor-brand">
          <div className="monitor-logo">SH</div>

          <div>
            <h1>SmartHire AI</h1>
            <span>Recruiter Interview Monitoring</span>
          </div>
        </div>

        <div className="monitor-header-actions">
          <button
            className="monitor-back-btn"
            onClick={() => navigate("/recruiter")}
          >
            ← Dashboard
          </button>

          <div className="monitor-live-indicator">
            <span className="live-dot"></span>
            Monitoring System Active
          </div>
        </div>
      </header>

      {/* =====================================================
          INTRO
      ===================================================== */}

      <section className="monitor-intro">

        <div>
          <span className="monitor-eyebrow">
            LIVE INTERVIEW CENTER
          </span>

          <h2>
            Monitor interviews in real time
          </h2>

          <p>
            Track interview progress, communication signals,
            attention, confidence and candidate engagement
            from one centralized recruiter workspace.
          </p>
        </div>

        <div className="monitor-intro-icon">
          🎥
        </div>

      </section>

      {/* =====================================================
          SUMMARY CARDS
      ===================================================== */}

      <section className="monitor-summary-grid">

        <div className="monitor-summary-card">
          <div className="summary-icon">🎥</div>

          <div>
            <span>Live Interviews</span>
            <strong>{liveCount}</strong>
            <small>Currently running</small>
          </div>
        </div>

        <div className="monitor-summary-card">
          <div className="summary-icon">⏸️</div>

          <div>
            <span>Paused</span>
            <strong>{pausedCount}</strong>
            <small>Awaiting resume</small>
          </div>
        </div>

        <div className="monitor-summary-card">
          <div className="summary-icon">✓</div>

          <div>
            <span>Completed</span>
            <strong>{completedCount}</strong>
            <small>Today's interviews</small>
          </div>
        </div>

        <div className="monitor-summary-card alert-summary">
          <div className="summary-icon">🔔</div>

          <div>
            <span>Active Alerts</span>
            <strong>{alertsCount}</strong>
            <small>Require attention</small>
          </div>
        </div>

      </section>

      {/* =====================================================
          CONTROL BAR
      ===================================================== */}

      <section className="monitor-controls">

        <div className="monitor-search">

          <span>⌕</span>

          <input
            type="text"
            placeholder="Search candidate, role, interviewer or ID..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

        </div>

        <div className="monitor-filter">

          <label>Status</label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="All">All Interviews</option>
            <option value="Live">Live</option>
            <option value="Paused">Paused</option>
            <option value="Completed">Completed</option>
          </select>

        </div>

      </section>

      {/* =====================================================
          RESULTS HEADER
      ===================================================== */}

      <div className="monitor-results-header">

        <div>
          <h3>Interview Sessions</h3>

          <span>
            Showing {filteredInterviews.length} of{" "}
            {interviews.length} sessions
          </span>
        </div>

        <div className="monitor-refresh">
          <span className="refresh-dot"></span>
          Live data updates enabled
        </div>

      </div>

      {/* =====================================================
          INTERVIEW CARDS
      ===================================================== */}

      <section className="monitor-interview-grid">

        {filteredInterviews.length === 0 ? (

          <div className="monitor-empty">

            <div>🔍</div>

            <h3>No interviews found</h3>

            <p>
              Try changing your search or status filter.
            </p>

          </div>

        ) : (

          filteredInterviews.map((interview) => (

            <article
              className="monitor-interview-card"
              key={interview.id}
            >

              {/* CARD HEADER */}

              <div className="monitor-card-header">

                <div className="candidate-avatar">
                  {interview.candidate
                    .split(" ")
                    .map((name) => name[0])
                    .join("")
                    .slice(0, 2)}
                </div>

                <div className="candidate-heading">

                  <h3>{interview.candidate}</h3>

                  <span>{interview.role}</span>

                </div>

                <span
                  className={`monitor-status ${getStatusClass(
                    interview.status
                  )}`}
                >
                  {interview.status === "Live" && (
                    <span className="status-pulse"></span>
                  )}

                  {interview.status}
                </span>

              </div>

              {/* INTERVIEW META */}

              <div className="monitor-meta">

                <div>
                  <span>Session ID</span>
                  <strong>{interview.id}</strong>
                </div>

                <div>
                  <span>Type</span>
                  <strong>{interview.type}</strong>
                </div>

                <div>
                  <span>Interviewer</span>
                  <strong>{interview.interviewer}</strong>
                </div>

              </div>

              {/* PROGRESS */}

              <div className="monitor-progress-section">

                <div className="progress-label">

                  <span>Interview Progress</span>

                  <strong>
                    {interview.questionsAnswered}/
                    {interview.totalQuestions}
                  </strong>

                </div>

                <div className="monitor-progress-bar">

                  <div
                    className="monitor-progress-fill"
                    style={{
                      width: `${interview.progress}%`,
                    }}
                  />

                </div>

                <div className="progress-bottom">

                  <span>
                    {interview.progress}% completed
                  </span>

                  <span>
                    ⏱ {interview.duration}
                  </span>

                </div>

              </div>

              {/* SCORE */}

              <div className="monitor-score-section">

                <div>
                  <span>Current AI Score</span>

                  <strong
                    className={getScoreClass(
                      interview.score
                    )}
                  >
                    {interview.score}
                  </strong>
                </div>

                <div className="score-ring">
                  <div
                    className="score-ring-progress"
                    style={{
                      "--score": `${interview.score}%`,
                    }}
                  >
                    <span>{interview.score}%</span>
                  </div>
                </div>

              </div>

              {/* LIVE METRICS */}

              <div className="monitor-metrics">

                <div className="monitor-metric">

                  <span>💬 Communication</span>

                  <strong
                    className={getMetricClass(
                      interview.communication
                    )}
                  >
                    {interview.communication}%
                  </strong>

                </div>

                <div className="monitor-metric">

                  <span>💪 Confidence</span>

                  <strong
                    className={getMetricClass(
                      interview.confidence
                    )}
                  >
                    {interview.confidence}%
                  </strong>

                </div>

                <div className="monitor-metric">

                  <span>👁 Eye Contact</span>

                  <strong
                    className={getMetricClass(
                      interview.eyeContact
                    )}
                  >
                    {interview.eyeContact}%
                  </strong>

                </div>

                <div className="monitor-metric">

                  <span>🎯 Attention</span>

                  <strong
                    className={getMetricClass(
                      interview.attention
                    )}
                  >
                    {interview.attention}%
                  </strong>

                </div>

                <div className="monitor-metric">

                  <span>✨ Engagement</span>

                  <strong
                    className={getMetricClass(
                      interview.engagement
                    )}
                  >
                    {interview.engagement}%
                  </strong>

                </div>

              </div>

              {/* ALERT */}

              {interview.alert && (

                <div className="monitor-alert">

                  <span>⚠️</span>

                  <div>
                    <strong>Monitoring Alert</strong>
                    <p>{interview.alert}</p>
                  </div>

                </div>

              )}

              {/* ACTION */}

              <div className="monitor-card-footer">

                <span>
                  Started {interview.startedAt}
                </span>

                <button
                  onClick={() =>
                    setSelectedInterview(interview)
                  }
                >
                  View Monitoring
                  <span>→</span>
                </button>

              </div>

            </article>

          ))

        )}

      </section>

      {/* =====================================================
          AI MONITORING NOTICE
      ===================================================== */}

      <section className="monitor-ai-notice">

        <div className="ai-notice-icon">
          🤖
        </div>

        <div>

          <h3>SmartHire AI Monitoring</h3>

          <p>
            AI-assisted monitoring summarizes observable
            interview signals such as speech quality,
            attention, engagement and camera-based indicators.
            These signals support recruiter review and should
            not be treated as psychological or medical
            measurements.
          </p>

        </div>

      </section>

      {/* =====================================================
          DETAIL MODAL
      ===================================================== */}

      {selectedInterview && (

        <div
          className="monitor-modal-overlay"
          onClick={() => setSelectedInterview(null)}
        >

          <div
            className="monitor-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="monitor-modal-header">

              <div>

                <span className="monitor-eyebrow">
                  INTERVIEW MONITOR
                </span>

                <h2>
                  {selectedInterview.candidate}
                </h2>

                <p>
                  {selectedInterview.role} •{" "}
                  {selectedInterview.id}
                </p>

              </div>

              <button
                className="modal-close"
                onClick={() => setSelectedInterview(null)}
              >
                ×
              </button>

            </div>

            <div className="modal-status-row">

              <span
                className={`monitor-status ${getStatusClass(
                  selectedInterview.status
                )}`}
              >
                {selectedInterview.status}
              </span>

              <span>
                ⏱ {selectedInterview.duration}
              </span>

              <span>
                Questions:{" "}
                {selectedInterview.questionsAnswered}/
                {selectedInterview.totalQuestions}
              </span>

            </div>

            <div className="modal-performance-grid">

              <div className="modal-main-score">

                <span>Current AI Score</span>

                <strong>
                  {selectedInterview.score}%
                </strong>

                <small>
                  Overall interview performance
                </small>

              </div>

              <div className="modal-metric-box">

                <span>Communication</span>

                <strong>
                  {selectedInterview.communication}%
                </strong>

              </div>

              <div className="modal-metric-box">

                <span>Confidence</span>

                <strong>
                  {selectedInterview.confidence}%
                </strong>

              </div>

              <div className="modal-metric-box">

                <span>Eye Contact</span>

                <strong>
                  {selectedInterview.eyeContact}%
                </strong>

              </div>

              <div className="modal-metric-box">

                <span>Attention</span>

                <strong>
                  {selectedInterview.attention}%
                </strong>

              </div>

              <div className="modal-metric-box">

                <span>Engagement</span>

                <strong>
                  {selectedInterview.engagement}%
                </strong>

              </div>

            </div>

            {selectedInterview.alert && (

              <div className="modal-alert">

                ⚠️{" "}
                <strong>
                  {selectedInterview.alert}
                </strong>

              </div>

            )}

            <div className="modal-actions">

              <button
                className="modal-secondary"
                onClick={() => setSelectedInterview(null)}
              >
                Close
              </button>

              <button
                className="modal-primary"
                onClick={() => {
                  setSelectedInterview(null);
                  navigate("/recruiter/reports");
                }}
              >
                Open Full AI Report →
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="monitor-footer">

        <span>
          © 2026 SmartHire AI
        </span>

        <span>
          Recruiter Monitoring Center
        </span>

      </footer>

    </div>
  );
}

export default RecruiterMonitoring;