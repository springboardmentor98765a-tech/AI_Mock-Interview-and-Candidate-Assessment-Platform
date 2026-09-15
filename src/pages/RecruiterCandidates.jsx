import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RecruiterCandidates.css";

function RecruiterCandidates() {
  const navigate = useNavigate();

  // =========================================================
  // SEARCH + FILTER STATE
  // =========================================================

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // =========================================================
  // DEMO CANDIDATE DATA
  // Later this will come from the backend/database.
  // =========================================================

  const candidates = [
    {
      id: 1,
      name: "Ananya Sharma",
      email: "ananya.sharma@example.com",
      role: "Full Stack Developer",
      experience: "2 Years",
      location: "Bengaluru",
      score: 91,
      status: "Shortlisted",
      skills: [
        "React",
        "Node.js",
        "MongoDB",
        "JavaScript",
      ],
      interviewType: "Technical",
      communication: 89,
      confidence: 92,
      eyeContact: 88,
      attention: 94,
      engagement: 91,
      lastInterview: "14 Sep 2026",
    },

    {
      id: 2,
      name: "Rahul Kumar",
      email: "rahul.kumar@example.com",
      role: "Python Developer",
      experience: "1.5 Years",
      location: "Mysuru",
      score: 84,
      status: "Shortlisted",
      skills: [
        "Python",
        "Django",
        "SQL",
        "REST API",
      ],
      interviewType: "Technical",
      communication: 82,
      confidence: 85,
      eyeContact: 79,
      attention: 87,
      engagement: 84,
      lastInterview: "13 Sep 2026",
    },

    {
      id: 3,
      name: "Sneha Patel",
      email: "sneha.patel@example.com",
      role: "Data Analyst",
      experience: "2 Years",
      location: "Bengaluru",
      score: 76,
      status: "Under Review",
      skills: [
        "Python",
        "SQL",
        "Power BI",
        "Excel",
      ],
      interviewType: "Behavioral",
      communication: 84,
      confidence: 73,
      eyeContact: 76,
      attention: 80,
      engagement: 78,
      lastInterview: "12 Sep 2026",
    },

    {
      id: 4,
      name: "Arjun Rao",
      email: "arjun.rao@example.com",
      role: "Frontend Developer",
      experience: "1 Year",
      location: "Bengaluru",
      score: 68,
      status: "Under Review",
      skills: [
        "HTML",
        "CSS",
        "JavaScript",
        "React",
      ],
      interviewType: "Technical",
      communication: 71,
      confidence: 65,
      eyeContact: 69,
      attention: 72,
      engagement: 68,
      lastInterview: "11 Sep 2026",
    },

    {
      id: 5,
      name: "Priya Nair",
      email: "priya.nair@example.com",
      role: "AI/ML Engineer",
      experience: "3 Years",
      location: "Kochi",
      score: 93,
      status: "Shortlisted",
      skills: [
        "Python",
        "Machine Learning",
        "TensorFlow",
        "CNN",
      ],
      interviewType: "Technical",
      communication: 91,
      confidence: 94,
      eyeContact: 90,
      attention: 95,
      engagement: 93,
      lastInterview: "14 Sep 2026",
    },

    {
      id: 6,
      name: "Karthik Shetty",
      email: "karthik.shetty@example.com",
      role: "Backend Developer",
      experience: "2.5 Years",
      location: "Mangaluru",
      score: 81,
      status: "Under Review",
      skills: [
        "Node.js",
        "Express",
        "PostgreSQL",
        "Python",
      ],
      interviewType: "Technical",
      communication: 79,
      confidence: 81,
      eyeContact: 77,
      attention: 85,
      engagement: 82,
      lastInterview: "10 Sep 2026",
    },

    {
      id: 7,
      name: "Meera Iyer",
      email: "meera.iyer@example.com",
      role: "UI/UX Designer",
      experience: "2 Years",
      location: "Chennai",
      score: 88,
      status: "Shortlisted",
      skills: [
        "Figma",
        "UI Design",
        "UX Research",
        "Prototyping",
      ],
      interviewType: "Behavioral",
      communication: 93,
      confidence: 87,
      eyeContact: 91,
      attention: 89,
      engagement: 94,
      lastInterview: "09 Sep 2026",
    },

    {
      id: 8,
      name: "Vikram Singh",
      email: "vikram.singh@example.com",
      role: "Java Developer",
      experience: "3 Years",
      location: "Hyderabad",
      score: 73,
      status: "Rejected",
      skills: [
        "Java",
        "Spring Boot",
        "MySQL",
        "Git",
      ],
      interviewType: "Technical",
      communication: 70,
      confidence: 72,
      eyeContact: 68,
      attention: 74,
      engagement: 71,
      lastInterview: "08 Sep 2026",
    },
  ];

  // =========================================================
  // ROLE LIST
  // =========================================================

  const roles = [
    "All",
    ...new Set(candidates.map((candidate) => candidate.role)),
  ];

  // =========================================================
  // FILTER CANDIDATES
  // =========================================================

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const search = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !search ||
        candidate.name.toLowerCase().includes(search) ||
        candidate.email.toLowerCase().includes(search) ||
        candidate.role.toLowerCase().includes(search) ||
        candidate.skills.some((skill) =>
          skill.toLowerCase().includes(search)
        );

      const matchesStatus =
        statusFilter === "All" ||
        candidate.status === statusFilter;

      const matchesRole =
        roleFilter === "All" ||
        candidate.role === roleFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRole
      );
    });
  }, [searchTerm, statusFilter, roleFilter]);

  // =========================================================
  // SUMMARY COUNTS
  // =========================================================

  const totalCandidates = candidates.length;

  const shortlistedCount = candidates.filter(
    (candidate) => candidate.status === "Shortlisted"
  ).length;

  const reviewCount = candidates.filter(
    (candidate) => candidate.status === "Under Review"
  ).length;

  const averageScore = Math.round(
    candidates.reduce(
      (total, candidate) => total + candidate.score,
      0
    ) / candidates.length
  );

  // =========================================================
  // SCORE CLASS
  // =========================================================

  const getScoreClass = (score) => {
    if (score >= 85) return "score-excellent";
    if (score >= 70) return "score-good";
    return "score-low";
  };

  // =========================================================
  // STATUS CLASS
  // =========================================================

  const getStatusClass = (status) => {
    if (status === "Shortlisted") {
      return "candidate-status-shortlisted";
    }

    if (status === "Rejected") {
      return "candidate-status-rejected";
    }

    return "candidate-status-review";
  };

  // =========================================================
  // CLEAR FILTERS
  // =========================================================

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setRoleFilter("All");
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="recruiter-candidates-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="candidates-header">

        <div className="candidates-brand">
          <button
            className="back-button"
            onClick={() =>
              navigate("/recruiter/dashboard")
            }
          >
            ←
          </button>

          <div className="brand-mini-logo">
            SH
          </div>

          <div>
            <h1>SmartHire AI</h1>
            <span>Recruiter Portal</span>
          </div>
        </div>

        <div className="header-title">
          <span>CANDIDATE MANAGEMENT</span>
          <h2>All Candidates</h2>
        </div>

        <div className="header-profile">
          <div className="header-profile-icon">
            R
          </div>

          <div>
            <strong>Recruiter</strong>
            <span>Talent Team</span>
          </div>
        </div>

      </header>


      {/* =====================================================
          MAIN
          ===================================================== */}

      <main className="candidates-main">

        {/* ===================================================
            PAGE INTRO
            =================================================== */}

        <section className="candidates-intro">

          <div>
            <span className="intro-label">
              TALENT PIPELINE
            </span>

            <h2>
              Find the right talent
              <span> faster.</span>
            </h2>

            <p>
              Search, filter, and evaluate candidates
              using AI-powered interview performance
              insights.
            </p>
          </div>

          <div className="intro-decoration">
            <div className="intro-orb orb-one"></div>
            <div className="intro-orb orb-two"></div>
            <div className="intro-sparkle">
              ✦
            </div>
          </div>

        </section>


        {/* ===================================================
            SUMMARY CARDS
            =================================================== */}

        <section className="candidate-summary-grid">

          <div className="candidate-summary-card">

            <div className="summary-icon">
              👥
            </div>

            <div>
              <span>Total Candidates</span>
              <strong>{totalCandidates}</strong>
            </div>

          </div>


          <div className="candidate-summary-card">

            <div className="summary-icon">
              ⭐
            </div>

            <div>
              <span>Shortlisted</span>
              <strong>{shortlistedCount}</strong>
            </div>

          </div>


          <div className="candidate-summary-card">

            <div className="summary-icon">
              🔍
            </div>

            <div>
              <span>Under Review</span>
              <strong>{reviewCount}</strong>
            </div>

          </div>


          <div className="candidate-summary-card">

            <div className="summary-icon">
              📊
            </div>

            <div>
              <span>Average Score</span>
              <strong>{averageScore}%</strong>
            </div>

          </div>

        </section>


        {/* ===================================================
            SEARCH + FILTER
            =================================================== */}

        <section className="candidate-controls">

          <div className="search-box">

            <span className="search-icon">
              🔎
            </span>

            <input
              type="text"
              placeholder="Search by name, role, email or skill..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />

            {searchTerm && (
              <button
                className="clear-search"
                onClick={() => setSearchTerm("")}
              >
                ×
              </button>
            )}

          </div>


          <div className="filter-group">

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="All">
                All Status
              </option>

              <option value="Shortlisted">
                Shortlisted
              </option>

              <option value="Under Review">
                Under Review
              </option>

              <option value="Rejected">
                Rejected
              </option>
            </select>


            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value)
              }
            >
              {roles.map((role) => (
                <option
                  key={role}
                  value={role}
                >
                  {role === "All"
                    ? "All Roles"
                    : role}
                </option>
              ))}
            </select>


            {(searchTerm ||
              statusFilter !== "All" ||
              roleFilter !== "All") && (
              <button
                className="reset-filter-button"
                onClick={clearFilters}
              >
                Reset
              </button>
            )}

          </div>

        </section>


        {/* ===================================================
            RESULTS HEADER
            =================================================== */}

        <div className="results-header">

          <div>
            <span className="results-label">
              SEARCH RESULTS
            </span>

            <h3>
              {filteredCandidates.length}{" "}
              Candidate
              {filteredCandidates.length !== 1
                ? "s"
                : ""}
            </h3>
          </div>

          <span className="results-info">
            Sorted by interview performance
          </span>

        </div>


        {/* ===================================================
            CANDIDATE TABLE
            =================================================== */}

        <section className="candidate-table-card">

          {filteredCandidates.length > 0 ? (

            <div className="candidate-table-wrapper">

              <table className="candidate-table">

                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Applied Role</th>
                    <th>Experience</th>
                    <th>AI Score</th>
                    <th>Communication</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredCandidates.map(
                    (candidate) => (

                      <tr key={candidate.id}>

                        {/* Candidate */}

                        <td>

                          <div className="table-candidate">

                            <div className="table-avatar">
                              {candidate.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {candidate.name}
                              </strong>

                              <span>
                                {candidate.email}
                              </span>
                            </div>

                          </div>

                        </td>


                        {/* Role */}

                        <td>

                          <span className="role-text">
                            {candidate.role}
                          </span>

                        </td>


                        {/* Experience */}

                        <td>

                          <span className="experience-text">
                            {candidate.experience}
                          </span>

                        </td>


                        {/* Score */}

                        <td>

                          <div className="score-cell">

                            <strong
                              className={getScoreClass(
                                candidate.score
                              )}
                            >
                              {candidate.score}%
                            </strong>

                            <div className="score-bar">
                              <div
                                className={`score-fill ${getScoreClass(
                                  candidate.score
                                )}`}
                                style={{
                                  width: `${candidate.score}%`,
                                }}
                              ></div>
                            </div>

                          </div>

                        </td>


                        {/* Communication */}

                        <td>

                          <div className="communication-cell">

                            <strong>
                              {candidate.communication}%
                            </strong>

                            <span>
                              {candidate.communication >=
                              85
                                ? "Strong"
                                : candidate.communication >=
                                  70
                                ? "Good"
                                : "Needs work"}
                            </span>

                          </div>

                        </td>


                        {/* Status */}

                        <td>

                          <span
                            className={`candidate-status-badge ${getStatusClass(
                              candidate.status
                            )}`}
                          >
                            {candidate.status}
                          </span>

                        </td>


                        {/* Action */}

                        <td>

                          <button
                            className="view-candidate-button"
                            onClick={() =>
                              setSelectedCandidate(
                                candidate
                              )
                            }
                          >
                            View
                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          ) : (

            <div className="no-results">

              <div className="no-results-icon">
                🔎
              </div>

              <h3>
                No candidates found
              </h3>

              <p>
                Try changing your search or filters.
              </p>

              <button
                onClick={clearFilters}
              >
                Clear Filters
              </button>

            </div>

          )}

        </section>


        {/* ===================================================
            AI NOTICE
            =================================================== */}

        <section className="candidate-ai-notice">

          <div className="ai-notice-icon">
            ✨
          </div>

          <div>

            <span>
              AI-POWERED EVALUATION
            </span>

            <h3>
              Candidate scores are generated from
              interview performance analysis
            </h3>

            <p>
              SmartHire AI combines answer quality,
              communication signals, and observable
              interview behavior to support recruiter
              decision-making.
            </p>

          </div>

        </section>

      </main>


      {/* =====================================================
          CANDIDATE DETAILS MODAL
          ===================================================== */}

      {selectedCandidate && (

        <div
          className="candidate-modal-overlay"
          onClick={() =>
            setSelectedCandidate(null)
          }
        >

          <div
            className="candidate-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              className="modal-close"
              onClick={() =>
                setSelectedCandidate(null)
              }
            >
              ×
            </button>


            {/* Modal Header */}

            <div className="modal-profile">

              <div className="modal-avatar">
                {selectedCandidate.name
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <span className="modal-label">
                  CANDIDATE PROFILE
                </span>

                <h2>
                  {selectedCandidate.name}
                </h2>

                <p>
                  {selectedCandidate.role}
                </p>
              </div>

            </div>


            {/* Overall Score */}

            <div className="modal-score-section">

              <div>
                <span>
                  AI INTERVIEW SCORE
                </span>

                <strong
                  className={getScoreClass(
                    selectedCandidate.score
                  )}
                >
                  {selectedCandidate.score}%
                </strong>
              </div>

              <span
                className={`candidate-status-badge ${getStatusClass(
                  selectedCandidate.status
                )}`}
              >
                {selectedCandidate.status}
              </span>

            </div>


            {/* Basic Information */}

            <div className="modal-section">

              <h3>
                Candidate Information
              </h3>

              <div className="modal-info-grid">

                <div>
                  <span>Email</span>
                  <strong>
                    {selectedCandidate.email}
                  </strong>
                </div>

                <div>
                  <span>Location</span>
                  <strong>
                    {selectedCandidate.location}
                  </strong>
                </div>

                <div>
                  <span>Experience</span>
                  <strong>
                    {selectedCandidate.experience}
                  </strong>
                </div>

                <div>
                  <span>Last Interview</span>
                  <strong>
                    {selectedCandidate.lastInterview}
                  </strong>
                </div>

              </div>

            </div>


            {/* Skills */}

            <div className="modal-section">

              <h3>
                Skills
              </h3>

              <div className="skill-tags">

                {selectedCandidate.skills.map(
                  (skill) => (
                    <span key={skill}>
                      {skill}
                    </span>
                  )
                )}

              </div>

            </div>


            {/* Performance */}

            <div className="modal-section">

              <h3>
                Interview Performance
              </h3>

              <div className="performance-grid">

                <div className="performance-item">
                  <span>Communication</span>
                  <strong>
                    {selectedCandidate.communication}%
                  </strong>
                </div>

                <div className="performance-item">
                  <span>Confidence</span>
                  <strong>
                    {selectedCandidate.confidence}%
                  </strong>
                </div>

                <div className="performance-item">
                  <span>Eye Contact</span>
                  <strong>
                    {selectedCandidate.eyeContact}%
                  </strong>
                </div>

                <div className="performance-item">
                  <span>Attention</span>
                  <strong>
                    {selectedCandidate.attention}%
                  </strong>
                </div>

                <div className="performance-item">
                  <span>Engagement</span>
                  <strong>
                    {selectedCandidate.engagement}%
                  </strong>
                </div>

              </div>

            </div>


            {/* Modal Actions */}

            <div className="modal-actions">

              <button
                className="modal-secondary-button"
                onClick={() =>
                  setSelectedCandidate(null)
                }
              >
                Close
              </button>

              <button
                className="modal-primary-button"
                onClick={() =>
                  navigate(
                    "/recruiter/reports"
                  )
                }
              >
                View Full Report →
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default RecruiterCandidates;