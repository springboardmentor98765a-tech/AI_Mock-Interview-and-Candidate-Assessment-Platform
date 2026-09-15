import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RecruiterReports.css";

function RecruiterReports() {
  const navigate = useNavigate();

  const [selectedCandidateId, setSelectedCandidateId] = useState(1);

  const candidates = [
    {
      id: 1,
      name: "Ananya Sharma",
      email: "ananya.sharma@email.com",
      role: "Frontend Developer",
      interviewType: "Technical",
      interviewDate: "12 Sep 2026",
      overallScore: 88,
      technicalScore: 91,
      communication: 84,
      confidence: 86,
      eyeContact: 82,
      attention: 90,
      engagement: 88,
      recommendation: "Strong Hire",
      strengths: [
        "Strong understanding of React fundamentals",
        "Good problem-solving approach",
        "Clear technical explanations",
        "Good engagement during the interview",
      ],
      improvements: [
        "Could explain edge cases more clearly",
        "Should improve response structure for complex questions",
      ],
      summary:
        "The candidate demonstrated strong technical knowledge and communicated solutions clearly. Overall performance indicates good readiness for a frontend development role.",
      questions: [
        {
          question: "Explain the difference between state and props in React.",
          score: 92,
          result: "Excellent",
        },
        {
          question: "What is the Virtual DOM?",
          score: 88,
          result: "Very Good",
        },
        {
          question: "How would you optimize a React application?",
          score: 84,
          result: "Good",
        },
        {
          question: "Explain REST API integration in a frontend application.",
          score: 90,
          result: "Excellent",
        },
      ],
    },

    {
      id: 2,
      name: "Rahul Verma",
      email: "rahul.verma@email.com",
      role: "Python Developer",
      interviewType: "Technical",
      interviewDate: "11 Sep 2026",
      overallScore: 76,
      technicalScore: 80,
      communication: 73,
      confidence: 75,
      eyeContact: 70,
      attention: 82,
      engagement: 78,
      recommendation: "Consider",
      strengths: [
        "Good Python fundamentals",
        "Understands basic data structures",
        "Shows willingness to solve problems",
      ],
      improvements: [
        "Needs stronger explanation of algorithms",
        "Communication can be more structured",
        "Should improve confidence while answering",
      ],
      summary:
        "The candidate has a reasonable technical foundation but would benefit from additional practice with algorithms and technical communication.",
      questions: [
        {
          question: "Explain Python lists and tuples.",
          score: 82,
          result: "Very Good",
        },
        {
          question: "What is object-oriented programming?",
          score: 76,
          result: "Good",
        },
        {
          question: "Explain time complexity.",
          score: 70,
          result: "Good",
        },
        {
          question: "How does exception handling work in Python?",
          score: 80,
          result: "Very Good",
        },
      ],
    },

    {
      id: 3,
      name: "Meghana Rao",
      email: "meghana.rao@email.com",
      role: "Data Analyst",
      interviewType: "Behavioral",
      interviewDate: "10 Sep 2026",
      overallScore: 69,
      technicalScore: 72,
      communication: 78,
      confidence: 68,
      eyeContact: 75,
      attention: 72,
      engagement: 74,
      recommendation: "Needs Review",
      strengths: [
        "Good communication skills",
        "Provides practical examples",
        "Shows positive attitude",
      ],
      improvements: [
        "Needs deeper technical knowledge",
        "Could demonstrate more confidence",
        "Should provide more detailed answers",
      ],
      summary:
        "The candidate communicates well and provides relevant examples. However, additional technical preparation is recommended before making a final hiring decision.",
      questions: [
        {
          question: "Tell us about a challenging project you completed.",
          score: 76,
          result: "Good",
        },
        {
          question: "How do you handle deadlines?",
          score: 82,
          result: "Very Good",
        },
        {
          question: "Explain how you would analyze an unfamiliar dataset.",
          score: 65,
          result: "Needs Improvement",
        },
        {
          question: "How do you communicate findings to stakeholders?",
          score: 72,
          result: "Good",
        },
      ],
    },
  ];

  const selectedCandidate = useMemo(
    () =>
      candidates.find(
        (candidate) => candidate.id === selectedCandidateId
      ) || candidates[0],
    [selectedCandidateId]
  );

  const getScoreClass = (score) => {
    if (score >= 85) return "excellent";
    if (score >= 70) return "good";
    return "needs-work";
  };

  const getRecommendationClass = (recommendation) => {
    if (recommendation === "Strong Hire") return "strong-hire";
    if (recommendation === "Consider") return "consider";
    return "review";
  };

  return (
    <div className="recruiter-reports-page">
      {/* HEADER */}
      <header className="reports-header">
        <div className="reports-brand">
          <div className="reports-logo">S</div>

          <div>
            <h1>SmartHire AI</h1>
            <p>Recruiter Performance Reports</p>
          </div>
        </div>

        <div className="reports-header-actions">
          <button
            className="back-btn"
            onClick={() => navigate("/recruiter/candidates")}
          >
            ← Candidates
          </button>

          <button
            className="dashboard-btn"
            onClick={() => navigate("/recruiter")}
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* PAGE INTRO */}
      <section className="reports-intro">
        <div>
          <span className="intro-label">AI CANDIDATE ANALYTICS</span>

          <h2>Candidate Performance Reports</h2>

          <p>
            Review AI-generated interview performance, communication
            signals, observable visual metrics and hiring recommendations.
          </p>
        </div>

        <div className="ai-badge">
          <span>✦</span>
          AI Assisted Analysis
        </div>
      </section>

      {/* CANDIDATE SELECTOR */}
      <section className="candidate-selector-card">
        <div className="selector-heading">
          <div>
            <h3>Select Candidate</h3>
            <p>Choose a candidate to view the complete interview report.</p>
          </div>

          <span className="candidate-count">
            {candidates.length} Candidates
          </span>
        </div>

        <div className="candidate-selector-list">
          {candidates.map((candidate) => (
            <button
              key={candidate.id}
              className={`candidate-selector ${
                selectedCandidate.id === candidate.id ? "active" : ""
              }`}
              onClick={() => setSelectedCandidateId(candidate.id)}
            >
              <div className="candidate-avatar">
                {candidate.name.charAt(0)}
              </div>

              <div className="candidate-selector-info">
                <strong>{candidate.name}</strong>
                <span>{candidate.role}</span>
              </div>

              <div
                className={`mini-score ${getScoreClass(
                  candidate.overallScore
                )}`}
              >
                {candidate.overallScore}%
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* CANDIDATE PROFILE */}
      <section className="candidate-profile-card">
        <div className="candidate-profile-main">
          <div className="large-avatar">
            {selectedCandidate.name.charAt(0)}
          </div>

          <div>
            <span className="profile-label">CANDIDATE</span>

            <h2>{selectedCandidate.name}</h2>

            <p>{selectedCandidate.email}</p>

            <div className="profile-tags">
              <span>{selectedCandidate.role}</span>
              <span>{selectedCandidate.interviewType}</span>
              <span>{selectedCandidate.interviewDate}</span>
            </div>
          </div>
        </div>

        <div
          className={`recommendation ${getRecommendationClass(
            selectedCandidate.recommendation
          )}`}
        >
          <span>AI Recommendation</span>
          <strong>{selectedCandidate.recommendation}</strong>
        </div>
      </section>

      {/* OVERALL SCORE */}
      <section className="overall-score-card">
        <div className="overall-score-circle">
          <div>
            <strong>{selectedCandidate.overallScore}</strong>
            <span>/100</span>
          </div>
        </div>

        <div className="overall-score-content">
          <span className="section-label">OVERALL AI SCORE</span>

          <h2>
            {selectedCandidate.overallScore >= 85
              ? "Excellent Performance"
              : selectedCandidate.overallScore >= 70
              ? "Good Performance"
              : "Needs Improvement"}
          </h2>

          <p>{selectedCandidate.summary}</p>
        </div>
      </section>

      {/* PERFORMANCE METRICS */}
      <section className="report-section">
        <div className="section-heading">
          <div>
            <span className="section-label">PERFORMANCE BREAKDOWN</span>
            <h2>Interview Analytics</h2>
          </div>

          <span className="analysis-status">
            ● Analysis Available
          </span>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">◈</div>
            <div className="metric-info">
              <span>Technical / Answer</span>
              <strong>{selectedCandidate.technicalScore}%</strong>
            </div>

            <div className="metric-bar">
              <span
                style={{
                  width: `${selectedCandidate.technicalScore}%`,
                }}
              />
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">◌</div>
            <div className="metric-info">
              <span>Communication</span>
              <strong>{selectedCandidate.communication}%</strong>
            </div>

            <div className="metric-bar">
              <span
                style={{
                  width: `${selectedCandidate.communication}%`,
                }}
              />
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">✦</div>
            <div className="metric-info">
              <span>Confidence Signal</span>
              <strong>{selectedCandidate.confidence}%</strong>
            </div>

            <div className="metric-bar">
              <span
                style={{
                  width: `${selectedCandidate.confidence}%`,
                }}
              />
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">◎</div>
            <div className="metric-info">
              <span>Eye Contact Signal</span>
              <strong>{selectedCandidate.eyeContact}%</strong>
            </div>

            <div className="metric-bar">
              <span
                style={{
                  width: `${selectedCandidate.eyeContact}%`,
                }}
              />
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">◉</div>
            <div className="metric-info">
              <span>Attention Signal</span>
              <strong>{selectedCandidate.attention}%</strong>
            </div>

            <div className="metric-bar">
              <span
                style={{
                  width: `${selectedCandidate.attention}%`,
                }}
              />
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">✧</div>
            <div className="metric-info">
              <span>Engagement Signal</span>
              <strong>{selectedCandidate.engagement}%</strong>
            </div>

            <div className="metric-bar">
              <span
                style={{
                  width: `${selectedCandidate.engagement}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* STRENGTHS + IMPROVEMENTS */}
      <section className="insights-grid">
        <div className="insight-card strengths-card">
          <div className="insight-header">
            <div className="insight-icon">✓</div>
            <div>
              <span>POSITIVE SIGNALS</span>
              <h3>Strengths</h3>
            </div>
          </div>

          <div className="insight-list">
            {selectedCandidate.strengths.map((strength, index) => (
              <div className="insight-item" key={index}>
                <span>✓</span>
                <p>{strength}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="insight-card improvements-card">
          <div className="insight-header">
            <div className="insight-icon">↗</div>
            <div>
              <span>DEVELOPMENT AREAS</span>
              <h3>Improvements</h3>
            </div>
          </div>

          <div className="insight-list">
            {selectedCandidate.improvements.map(
              (improvement, index) => (
                <div className="insight-item" key={index}>
                  <span>•</span>
                  <p>{improvement}</p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* QUESTION PERFORMANCE */}
      <section className="report-section questions-section">
        <div className="section-heading">
          <div>
            <span className="section-label">QUESTION ANALYSIS</span>
            <h2>Question-wise Performance</h2>
          </div>

          <span className="question-count">
            {selectedCandidate.questions.length} Questions
          </span>
        </div>

        <div className="question-list">
          {selectedCandidate.questions.map((item, index) => (
            <div className="question-row" key={index}>
              <div className="question-number">
                Q{index + 1}
              </div>

              <div className="question-content">
                <p>{item.question}</p>
                <span>{item.result}</span>
              </div>

              <div className="question-score">
                <strong>{item.score}</strong>
                <span>/100</span>
              </div>

              <div className="question-progress">
                <span
                  style={{
                    width: `${item.score}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI SUMMARY */}
      <section className="ai-summary-card">
        <div className="ai-summary-icon">✦</div>

        <div>
          <span>SMART HIRE AI INSIGHT</span>

          <h2>AI Interview Summary</h2>

          <p>{selectedCandidate.summary}</p>

          <div className="ai-summary-note">
            Visual metrics represent observable computer-vision signals
            and should be considered alongside interview answers and
            recruiter judgment.
          </div>
        </div>
      </section>

      {/* ACTIONS */}
      <section className="report-actions">
        <button
          className="secondary-action"
          onClick={() => navigate("/recruiter/candidates")}
        >
          ← Back to Candidates
        </button>

        <button
          className="primary-action"
          onClick={() => window.print()}
        >
          Print / Save Report
        </button>
      </section>

      {/* FOOTER */}
      <footer className="reports-footer">
        <div>
          <strong>SmartHire AI</strong>
          <span>AI-Powered Recruitment Intelligence</span>
        </div>

        <p>
          Candidate performance data should be reviewed with human
          judgment and relevant hiring criteria.
        </p>
      </footer>
    </div>
  );
}

export default RecruiterReports;