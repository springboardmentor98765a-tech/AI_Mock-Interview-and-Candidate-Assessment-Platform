import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RecruiterCompare.css";

function RecruiterCompare() {
  const navigate = useNavigate();

  const candidates = [
    {
      id: 1,
      name: "Ananya Sharma",
      role: "Frontend Developer",
      experience: "2 Years",
      overall: 88,
      technical: 91,
      communication: 84,
      confidence: 86,
      eyeContact: 82,
      attention: 90,
      engagement: 88,
      recommendation: "Strong Hire",
      strengths: [
        "Strong React knowledge",
        "Good problem solving",
        "Clear explanations",
      ],
    },
    {
      id: 2,
      name: "Rahul Verma",
      role: "Python Developer",
      experience: "1.5 Years",
      overall: 76,
      technical: 80,
      communication: 73,
      confidence: 75,
      eyeContact: 70,
      attention: 82,
      engagement: 78,
      recommendation: "Consider",
      strengths: [
        "Good Python fundamentals",
        "Logical thinking",
        "Good learning attitude",
      ],
    },
    {
      id: 3,
      name: "Meghana Rao",
      role: "Data Analyst",
      experience: "1 Year",
      overall: 69,
      technical: 72,
      communication: 78,
      confidence: 68,
      eyeContact: 75,
      attention: 72,
      engagement: 74,
      recommendation: "Needs Review",
      strengths: [
        "Good communication",
        "Practical examples",
        "Positive attitude",
      ],
    },
    {
      id: 4,
      name: "Arjun Patel",
      role: "Full Stack Developer",
      experience: "2.5 Years",
      overall: 84,
      technical: 87,
      communication: 81,
      confidence: 83,
      eyeContact: 80,
      attention: 86,
      engagement: 85,
      recommendation: "Strong Hire",
      strengths: [
        "Full stack knowledge",
        "Strong API understanding",
        "Good debugging skills",
      ],
    },
  ];

  const [selectedIds, setSelectedIds] = useState([1, 4]);

  const selectedCandidates = useMemo(() => {
    return candidates.filter((candidate) =>
      selectedIds.includes(candidate.id)
    );
  }, [selectedIds]);

  const toggleCandidate = (id) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        if (current.length <= 2) {
          return current;
        }

        return current.filter((candidateId) => candidateId !== id);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, id];
    });
  };

  const getScoreClass = (score) => {
    if (score >= 85) return "compare-excellent";
    if (score >= 70) return "compare-good";
    return "compare-needs-work";
  };

  const getRecommendationClass = (recommendation) => {
    if (recommendation === "Strong Hire") {
      return "compare-strong-hire";
    }

    if (recommendation === "Consider") {
      return "compare-consider";
    }

    return "compare-review";
  };

  const getBestCandidate = () => {
    if (!selectedCandidates.length) {
      return null;
    }

    return [...selectedCandidates].sort(
      (a, b) => b.overall - a.overall
    )[0];
  };

  const bestCandidate = getBestCandidate();

  return (
    <div className="recruiter-compare-page">
      {/* HEADER */}

      <header className="compare-header">
        <div className="compare-brand">
          <div className="compare-logo">S</div>

          <div>
            <h1>SmartHire AI</h1>
            <p>Candidate Comparison</p>
          </div>
        </div>

        <div className="compare-header-actions">
          <button
            className="compare-back-btn"
            onClick={() => navigate("/recruiter/candidates")}
          >
            ← Candidates
          </button>

          <button
            className="compare-dashboard-btn"
            onClick={() => navigate("/recruiter")}
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* INTRO */}

      <section className="compare-intro">
        <div>
          <span className="compare-eyebrow">
            RECRUITMENT DECISION SUPPORT
          </span>

          <h2>Compare Candidates</h2>

          <p>
            Compare interview performance across multiple candidates
            using SmartHire AI analytics.
          </p>
        </div>

        <div className="compare-ai-badge">
          <span>✦</span>
          AI Comparison
        </div>
      </section>

      {/* SELECT CANDIDATES */}

      <section className="compare-selector-card">
        <div className="compare-section-heading">
          <div>
            <span>STEP 1</span>
            <h2>Select Candidates</h2>
            <p>
              Select between 2 and 3 candidates for comparison.
            </p>
          </div>

          <div className="selected-count">
            {selectedCandidates.length}/3 Selected
          </div>
        </div>

        <div className="compare-candidate-grid">
          {candidates.map((candidate) => {
            const isSelected = selectedIds.includes(candidate.id);

            return (
              <button
                key={candidate.id}
                className={`compare-candidate-card ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() => toggleCandidate(candidate.id)}
              >
                <div className="compare-check">
                  {isSelected ? "✓" : ""}
                </div>

                <div className="compare-avatar">
                  {candidate.name.charAt(0)}
                </div>

                <div className="compare-candidate-info">
                  <strong>{candidate.name}</strong>

                  <span>{candidate.role}</span>

                  <small>{candidate.experience}</small>
                </div>

                <div
                  className={`compare-mini-score ${getScoreClass(
                    candidate.overall
                  )}`}
                >
                  {candidate.overall}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* BEST CANDIDATE */}

      {bestCandidate && (
        <section className="best-candidate-card">
          <div className="best-icon">✦</div>

          <div className="best-content">
            <span>TOP PERFORMER</span>

            <h2>{bestCandidate.name}</h2>

            <p>
              Based on the current comparison, this candidate has the
              highest overall interview score.
            </p>
          </div>

          <div className="best-score">
            <strong>{bestCandidate.overall}</strong>
            <span>/100</span>
          </div>
        </section>
      )}

      {/* COMPARISON */}

      <section className="comparison-section">
        <div className="compare-section-heading">
          <div>
            <span>STEP 2</span>
            <h2>Performance Comparison</h2>
            <p>
              Review the major interview performance indicators.
            </p>
          </div>
        </div>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Performance</th>

                {selectedCandidates.map((candidate) => (
                  <th key={candidate.id}>
                    <div className="table-candidate">
                      <div className="table-avatar">
                        {candidate.name.charAt(0)}
                      </div>

                      <div>
                        <strong>{candidate.name}</strong>
                        <span>{candidate.role}</span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <tr className="overall-row">
                <td>Overall Score</td>

                {selectedCandidates.map((candidate) => (
                  <td key={candidate.id}>
                    <div
                      className={`table-score ${getScoreClass(
                        candidate.overall
                      )}`}
                    >
                      {candidate.overall}
                      <span>/100</span>
                    </div>
                  </td>
                ))}
              </tr>

              <tr>
                <td>Technical / Answer</td>

                {selectedCandidates.map((candidate) => (
                  <td key={candidate.id}>
                    <div className="table-metric">
                      <strong>{candidate.technical}%</strong>

                      <div className="compare-progress">
                        <span
                          style={{
                            width: `${candidate.technical}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                ))}
              </tr>

              <tr>
                <td>Communication</td>

                {selectedCandidates.map((candidate) => (
                  <td key={candidate.id}>
                    <div className="table-metric">
                      <strong>{candidate.communication}%</strong>

                      <div className="compare-progress">
                        <span
                          style={{
                            width: `${candidate.communication}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                ))}
              </tr>

              <tr>
                <td>Confidence Signal</td>

                {selectedCandidates.map((candidate) => (
                  <td key={candidate.id}>
                    <div className="table-metric">
                      <strong>{candidate.confidence}%</strong>

                      <div className="compare-progress">
                        <span
                          style={{
                            width: `${candidate.confidence}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                ))}
              </tr>

              <tr>
                <td>Eye Contact Signal</td>

                {selectedCandidates.map((candidate) => (
                  <td key={candidate.id}>
                    <div className="table-metric">
                      <strong>{candidate.eyeContact}%</strong>

                      <div className="compare-progress">
                        <span
                          style={{
                            width: `${candidate.eyeContact}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                ))}
              </tr>

              <tr>
                <td>Attention Signal</td>

                {selectedCandidates.map((candidate) => (
                  <td key={candidate.id}>
                    <div className="table-metric">
                      <strong>{candidate.attention}%</strong>

                      <div className="compare-progress">
                        <span
                          style={{
                            width: `${candidate.attention}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                ))}
              </tr>

              <tr>
                <td>Engagement Signal</td>

                {selectedCandidates.map((candidate) => (
                  <td key={candidate.id}>
                    <div className="table-metric">
                      <strong>{candidate.engagement}%</strong>

                      <div className="compare-progress">
                        <span
                          style={{
                            width: `${candidate.engagement}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                ))}
              </tr>

              <tr>
                <td>AI Recommendation</td>

                {selectedCandidates.map((candidate) => (
                  <td key={candidate.id}>
                    <span
                      className={`compare-recommendation ${getRecommendationClass(
                        candidate.recommendation
                      )}`}
                    >
                      {candidate.recommendation}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* STRENGTH COMPARISON */}

      <section className="strength-comparison-section">
        <div className="compare-section-heading">
          <div>
            <span>STEP 3</span>
            <h2>Candidate Strengths</h2>
            <p>Review the key positive indicators for each candidate.</p>
          </div>
        </div>

        <div className="strength-comparison-grid">
          {selectedCandidates.map((candidate) => (
            <div className="candidate-strength-card" key={candidate.id}>
              <div className="strength-card-header">
                <div className="strength-avatar">
                  {candidate.name.charAt(0)}
                </div>

                <div>
                  <strong>{candidate.name}</strong>
                  <span>{candidate.role}</span>
                </div>
              </div>

              <div className="strength-list">
                {candidate.strengths.map((strength, index) => (
                  <div className="strength-item" key={index}>
                    <span>✓</span>
                    <p>{strength}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DECISION SUPPORT */}

      {bestCandidate && (
        <section className="decision-card">
          <div className="decision-icon">✦</div>

          <div className="decision-content">
            <span>SMART HIRE AI DECISION SUPPORT</span>

            <h2>Comparison Summary</h2>

            <p>
              {bestCandidate.name} currently has the highest overall
              interview score among the selected candidates, with a
              score of {bestCandidate.overall}/100.
            </p>

            <div className="decision-note">
              AI comparison is intended to support recruiter review.
              Final hiring decisions should consider job requirements,
              interview evidence, resume information and human
              judgment.
            </div>
          </div>
        </section>
      )}

      {/* ACTIONS */}

      <section className="compare-actions">
        <button
          className="compare-secondary-action"
          onClick={() => navigate("/recruiter/candidates")}
        >
          ← Candidate Management
        </button>

        <button
          className="compare-primary-action"
          onClick={() => navigate("/recruiter/reports")}
        >
          View Detailed Reports →
        </button>
      </section>

      {/* FOOTER */}

      <footer className="compare-footer">
        <div>
          <strong>SmartHire AI</strong>
          <span>AI-Powered Recruitment Intelligence</span>
        </div>

        <p>
          Visual metrics represent observable computer-vision signals
          and should be interpreted alongside interview performance.
        </p>
      </footer>
    </div>
  );
}

export default RecruiterCompare;