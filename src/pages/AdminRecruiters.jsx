import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminRecruiters.css";

function AdminRecruiters() {
  const navigate = useNavigate();

  // =========================================================
  // DEMO RECRUITER DATA
  // =========================================================

  const [recruiters, setRecruiters] = useState([
    {
      id: "REC-2001",
      name: "Karan Mehta",
      email: "karan.mehta@techcorp.com",
      company: "TechCorp Solutions",
      designation: "Senior Talent Acquisition Manager",
      status: "Active",
      registered: "25 Jul 2026",
      candidates: 42,
      interviews: 35,
      averageScore: 82,
      location: "Bengaluru",
      phone: "+91 92XXXXXX47",
      lastLogin: "15 Sep 2026",
    },
    {
      id: "REC-2002",
      name: "Meera Iyer",
      email: "meera.iyer@innovatehub.com",
      company: "InnovateHub Technologies",
      designation: "Recruitment Lead",
      status: "Active",
      registered: "22 Jul 2026",
      candidates: 36,
      interviews: 28,
      averageScore: 79,
      location: "Chennai",
      phone: "+91 91XXXXXX58",
      lastLogin: "13 Sep 2026",
    },
    {
      id: "REC-2003",
      name: "Rohan Desai",
      email: "rohan.desai@futureworks.com",
      company: "FutureWorks India",
      designation: "Technical Recruiter",
      status: "Suspended",
      registered: "18 Jul 2026",
      candidates: 25,
      interviews: 19,
      averageScore: 76,
      location: "Mumbai",
      phone: "+91 90XXXXXX69",
      lastLogin: "07 Sep 2026",
    },
    {
      id: "REC-2004",
      name: "Aditi Krishnan",
      email: "aditi.krishnan@nextgen.com",
      company: "NextGen Digital",
      designation: "Talent Acquisition Specialist",
      status: "Active",
      registered: "14 Jul 2026",
      candidates: 31,
      interviews: 24,
      averageScore: 87,
      location: "Hyderabad",
      phone: "+91 89XXXXXX31",
      lastLogin: "14 Sep 2026",
    },
    {
      id: "REC-2005",
      name: "Arjun Malhotra",
      email: "arjun.malhotra@cloudmatrix.com",
      company: "CloudMatrix Systems",
      designation: "HR & Recruitment Manager",
      status: "Pending",
      registered: "10 Jul 2026",
      candidates: 18,
      interviews: 11,
      averageScore: 73,
      location: "Pune",
      phone: "+91 88XXXXXX52",
      lastLogin: "11 Sep 2026",
    },
    {
      id: "REC-2006",
      name: "Sneha Kapoor",
      email: "sneha.kapoor@softbridge.com",
      company: "SoftBridge Technologies",
      designation: "Recruitment Executive",
      status: "Active",
      registered: "06 Jul 2026",
      candidates: 29,
      interviews: 21,
      averageScore: 84,
      location: "Delhi",
      phone: "+91 87XXXXXX63",
      lastLogin: "15 Sep 2026",
    },
    {
      id: "REC-2007",
      name: "Vivek Rao",
      email: "vivek.rao@brightlabs.com",
      company: "BrightLabs AI",
      designation: "Senior Recruiter",
      status: "Active",
      registered: "01 Jul 2026",
      candidates: 47,
      interviews: 39,
      averageScore: 89,
      location: "Bengaluru",
      phone: "+91 86XXXXXX74",
      lastLogin: "14 Sep 2026",
    },
    {
      id: "REC-2008",
      name: "Nisha Sharma",
      email: "nisha.sharma@codeverse.com",
      company: "CodeVerse Technologies",
      designation: "HR Business Partner",
      status: "Suspended",
      registered: "28 Jun 2026",
      candidates: 22,
      interviews: 16,
      averageScore: 71,
      location: "Noida",
      phone: "+91 85XXXXXX85",
      lastLogin: "05 Sep 2026",
    },
  ]);

  // =========================================================
  // STATE
  // =========================================================

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedRecruiter, setSelectedRecruiter] = useState(null);

  // =========================================================
  // INITIALS
  // =========================================================

  const getInitials = (name) => {
    if (!name) return "R";

    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // =========================================================
  // FILTER RECRUITERS
  // =========================================================

  const filteredRecruiters = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return recruiters.filter((recruiter) => {
      const matchesSearch =
        !search ||
        recruiter.name.toLowerCase().includes(search) ||
        recruiter.email.toLowerCase().includes(search) ||
        recruiter.id.toLowerCase().includes(search) ||
        recruiter.company.toLowerCase().includes(search) ||
        recruiter.location.toLowerCase().includes(search) ||
        recruiter.designation.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        recruiter.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [recruiters, searchTerm, statusFilter]);

  // =========================================================
  // SUMMARY COUNTS
  // =========================================================

  const totalRecruiters = recruiters.length;

  const activeRecruiters = recruiters.filter(
    (recruiter) => recruiter.status === "Active"
  ).length;

  const suspendedRecruiters = recruiters.filter(
    (recruiter) => recruiter.status === "Suspended"
  ).length;

  const pendingRecruiters = recruiters.filter(
    (recruiter) => recruiter.status === "Pending"
  ).length;

  const totalCandidatesManaged = recruiters.reduce(
    (total, recruiter) => total + recruiter.candidates,
    0
  );

  const totalInterviews = recruiters.reduce(
    (total, recruiter) => total + recruiter.interviews,
    0
  );

  const averageRecruiterScore =
    recruiters.length > 0
      ? Math.round(
          recruiters.reduce(
            (total, recruiter) =>
              total + recruiter.averageScore,
            0
          ) / recruiters.length
        )
      : 0;

  // =========================================================
  // CLEAR FILTERS
  // =========================================================

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
  };

  // =========================================================
  // TOGGLE RECRUITER STATUS
  // =========================================================

  const toggleRecruiterStatus = (recruiterId) => {
    setRecruiters((currentRecruiters) =>
      currentRecruiters.map((recruiter) => {
        if (recruiter.id !== recruiterId) {
          return recruiter;
        }

        return {
          ...recruiter,
          status:
            recruiter.status === "Suspended"
              ? "Active"
              : "Suspended",
        };
      })
    );

    if (selectedRecruiter?.id === recruiterId) {
      setSelectedRecruiter((current) => {
        if (!current) return current;

        return {
          ...current,
          status:
            current.status === "Suspended"
              ? "Active"
              : "Suspended",
        };
      });
    }
  };

  // =========================================================
  // DELETE RECRUITER
  // =========================================================

  const deleteRecruiter = (recruiterId) => {
    const recruiter = recruiters.find(
      (item) => item.id === recruiterId
    );

    if (!recruiter) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${recruiter.name}?`
    );

    if (!confirmed) return;

    setRecruiters((currentRecruiters) =>
      currentRecruiters.filter(
        (item) => item.id !== recruiterId
      )
    );

    if (selectedRecruiter?.id === recruiterId) {
      setSelectedRecruiter(null);
    }
  };

  // =========================================================
  // SCORE CLASS
  // =========================================================

  const getScoreClass = (score) => {
    if (score >= 85) return "admin-recruiter-score-excellent";
    if (score >= 70) return "admin-recruiter-score-good";

    return "admin-recruiter-score-low";
  };

  // =========================================================
  // STATUS CLASS
  // =========================================================

  const getStatusClass = (status) => {
    if (status === "Active") {
      return "admin-recruiter-status-active";
    }

    if (status === "Suspended") {
      return "admin-recruiter-status-suspended";
    }

    return "admin-recruiter-status-pending";
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="admin-recruiters-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="admin-recruiters-header">

        <div className="admin-recruiters-brand">

          <div className="admin-recruiters-logo">
            SH
          </div>

          <div>
            <h1>SmartHire AI</h1>
            <span>Administrator Portal</span>
          </div>

        </div>

        <div className="admin-recruiters-header-actions">

          <div className="admin-recruiters-system">

            <span className="admin-recruiters-system-dot"></span>

            System Operational

          </div>

          <button
            className="admin-recruiters-back"
            onClick={() => navigate("/admin")}
          >
            ← Dashboard
          </button>

        </div>

      </header>

      {/* =====================================================
          MAIN
          ===================================================== */}

      <main className="admin-recruiters-main">

        {/* ===================================================
            INTRO
            =================================================== */}

        <section className="admin-recruiters-intro">

          <div>

            <span className="admin-recruiters-eyebrow">
              ADMINISTRATION • RECRUITER MANAGEMENT
            </span>

            <h2>
              Manage Recruiters
            </h2>

            <p>
              Monitor recruiter accounts, review recruitment
              activity, manage account status, and maintain
              a trusted SmartHire AI hiring ecosystem.
            </p>

          </div>

          <div className="admin-recruiters-intro-icon">
            💼
          </div>

        </section>

        {/* ===================================================
            SUMMARY CARDS
            =================================================== */}

        <section className="admin-recruiters-summary">

          <div className="admin-recruiter-summary-card">

            <div className="admin-recruiter-summary-icon">
              💼
            </div>

            <span>Total Recruiters</span>

            <strong>
              {totalRecruiters}
            </strong>

            <small>
              Registered accounts
            </small>

          </div>

          <div className="admin-recruiter-summary-card">

            <div className="admin-recruiter-summary-icon">
              🟢
            </div>

            <span>Active Recruiters</span>

            <strong>
              {activeRecruiters}
            </strong>

            <small>
              Currently active
            </small>

          </div>

          <div className="admin-recruiter-summary-card">

            <div className="admin-recruiter-summary-icon">
              👥
            </div>

            <span>Candidates Managed</span>

            <strong>
              {totalCandidatesManaged}
            </strong>

            <small>
              Across all recruiters
            </small>

          </div>

          <div className="admin-recruiter-summary-card">

            <div className="admin-recruiter-summary-icon">
              🎯
            </div>

            <span>Interviews Conducted</span>

            <strong>
              {totalInterviews}
            </strong>

            <small>
              Total recruiter activity
            </small>

          </div>

        </section>

        {/* ===================================================
            SECONDARY ANALYTICS
            =================================================== */}

        <section className="admin-recruiters-mini-stats">

          <div className="admin-recruiter-mini-card">

            <span>Suspended Recruiters</span>

            <strong>
              {suspendedRecruiters}
            </strong>

          </div>

          <div className="admin-recruiter-mini-card">

            <span>Pending Approval</span>

            <strong>
              {pendingRecruiters}
            </strong>

          </div>

          <div className="admin-recruiter-mini-card">

            <span>Average Activity Score</span>

            <strong>
              {averageRecruiterScore}%
            </strong>

          </div>

          <div className="admin-recruiter-mini-card">

            <span>Platform Recruiter Health</span>

            <strong className="admin-recruiter-health">
              {activeRecruiters >= totalRecruiters / 2
                ? "Healthy"
                : "Review"}
            </strong>

          </div>

        </section>

        {/* ===================================================
            RECRUITER MANAGEMENT PANEL
            =================================================== */}

        <section className="admin-recruiters-panel">

          <div className="admin-recruiters-panel-header">

            <div>

              <span className="admin-recruiters-eyebrow">
                PLATFORM RECRUITERS
              </span>

              <h3>
                All Recruiters
              </h3>

              <p>
                Search, filter and manage recruiter
                accounts registered on SmartHire AI.
              </p>

            </div>

          </div>

          {/* =================================================
              CONTROLS
              ================================================= */}

          <div className="admin-recruiters-controls">

            <div className="admin-recruiters-search">

              <span className="admin-recruiters-search-icon">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search by name, company, email, ID or location..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />

            </div>

            <select
              className="admin-recruiters-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="All">
                All Status
              </option>

              <option value="Active">
                Active
              </option>

              <option value="Suspended">
                Suspended
              </option>

              <option value="Pending">
                Pending
              </option>

            </select>

            <button
              className="admin-recruiters-clear"
              onClick={clearFilters}
            >
              Clear Filters
            </button>

          </div>

          {/* =================================================
              RESULT COUNT
              ================================================= */}

          <div className="admin-recruiters-results">

            Showing{" "}

            <strong>
              {filteredRecruiters.length}
            </strong>

            {" "}of{" "}

            <strong>
              {recruiters.length}
            </strong>

            {" "}recruiters

          </div>

          {/* =================================================
              TABLE
              ================================================= */}

          {filteredRecruiters.length > 0 ? (

            <div className="admin-recruiters-table-wrapper">

              <table className="admin-recruiters-table">

                <thead>

                  <tr>

                    <th>Recruiter</th>

                    <th>Company</th>

                    <th>Status</th>

                    <th>Candidates</th>

                    <th>Interviews</th>

                    <th>Avg. Score</th>

                    <th>Location</th>

                    <th>Actions</th>

                  </tr>

                </thead>

                <tbody>

                  {filteredRecruiters.map((recruiter) => (

                    <tr key={recruiter.id}>

                      {/* RECRUITER */}

                      <td>

                        <div className="admin-recruiter-table-user">

                          <div className="admin-recruiter-table-avatar">
                            {getInitials(recruiter.name)}
                          </div>

                          <div className="admin-recruiter-table-user-info">

                            <strong>
                              {recruiter.name}
                            </strong>

                            <span>
                              {recruiter.email}
                            </span>

                            <small>
                              {recruiter.id}
                            </small>

                          </div>

                        </div>

                      </td>

                      {/* COMPANY */}

                      <td>

                        <div className="admin-recruiter-company">

                          <strong>
                            {recruiter.company}
                          </strong>

                          <span>
                            {recruiter.designation}
                          </span>

                        </div>

                      </td>

                      {/* STATUS */}

                      <td>

                        <span
                          className={`admin-recruiter-user-status ${getStatusClass(
                            recruiter.status
                          )}`}
                        >

                          <span className="admin-recruiter-status-dot"></span>

                          {recruiter.status}

                        </span>

                      </td>

                      {/* CANDIDATES */}

                      <td>

                        <span className="admin-recruiter-number">
                          {recruiter.candidates}
                        </span>

                      </td>

                      {/* INTERVIEWS */}

                      <td>

                        <span className="admin-recruiter-number">
                          {recruiter.interviews}
                        </span>

                      </td>

                      {/* SCORE */}

                      <td>

                        <span
                          className={`admin-recruiter-user-score ${getScoreClass(
                            recruiter.averageScore
                          )}`}
                        >
                          {recruiter.averageScore}%
                        </span>

                      </td>

                      {/* LOCATION */}

                      <td>
                        {recruiter.location}
                      </td>

                      {/* ACTIONS */}

                      <td>

                        <div className="admin-recruiter-table-actions">

                          <button
                            className="admin-recruiter-action-btn view"
                            onClick={() =>
                              setSelectedRecruiter(
                                recruiter
                              )
                            }
                          >
                            View
                          </button>

                          <button
                            className={`admin-recruiter-action-btn ${
                              recruiter.status === "Suspended"
                                ? "success"
                                : "danger"
                            }`}
                            onClick={() =>
                              toggleRecruiterStatus(
                                recruiter.id
                              )
                            }
                          >
                            {recruiter.status === "Suspended"
                              ? "Activate"
                              : "Suspend"}
                          </button>

                          <button
                            className="admin-recruiter-action-btn danger"
                            onClick={() =>
                              deleteRecruiter(
                                recruiter.id
                              )
                            }
                          >
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          ) : (

            <div className="admin-recruiters-empty">

              <div className="admin-recruiters-empty-icon">
                🔎
              </div>

              <h3>
                No recruiters found
              </h3>

              <p>
                Try changing your search or status filter.
              </p>

            </div>

          )}

          {/* =================================================
              AI NOTICE
              ================================================= */}

          <div className="admin-recruiters-ai-notice">

            <div className="admin-recruiters-ai-icon">
              ✨
            </div>

            <div>

              <h3>
                AI-Powered Recruiter Monitoring
              </h3>

              <p>
                SmartHire AI can monitor recruiter activity,
                identify unusual account patterns, analyze
                recruitment engagement, and help administrators
                maintain a secure and efficient hiring platform.
              </p>

            </div>

          </div>

        </section>

      </main>

      {/* =====================================================
          FOOTER
          ===================================================== */}

      <footer className="admin-recruiters-footer">

        <span>
          © 2026 SmartHire AI
        </span>

        <span>
          Secure • Intelligent • Recruitment
        </span>

      </footer>

      {/* =====================================================
          RECRUITER DETAILS MODAL
          ===================================================== */}

      {selectedRecruiter && (

        <div
          className="admin-recruiters-modal-overlay"
          onClick={() =>
            setSelectedRecruiter(null)
          }
        >

          <div
            className="admin-recruiters-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="admin-recruiters-modal-header">

              <div className="admin-recruiters-modal-user">

                <div className="admin-recruiters-modal-avatar">
                  {getInitials(
                    selectedRecruiter.name
                  )}
                </div>

                <div>

                  <h2>
                    {selectedRecruiter.name}
                  </h2>

                  <p>
                    {selectedRecruiter.email}
                  </p>

                </div>

              </div>

              <button
                className="admin-recruiters-modal-close"
                onClick={() =>
                  setSelectedRecruiter(null)
                }
              >
                ×
              </button>

            </div>

            {/* MODAL DETAILS */}

            <div className="admin-recruiters-modal-grid">

              <div className="admin-recruiters-detail">

                <span>
                  Recruiter ID
                </span>

                <strong>
                  {selectedRecruiter.id}
                </strong>

              </div>

              <div className="admin-recruiters-detail">

                <span>
                  Company
                </span>

                <strong>
                  {selectedRecruiter.company}
                </strong>

              </div>

              <div className="admin-recruiters-detail">

                <span>
                  Designation
                </span>

                <strong>
                  {selectedRecruiter.designation}
                </strong>

              </div>

              <div className="admin-recruiters-detail">

                <span>
                  Status
                </span>

                <strong>
                  {selectedRecruiter.status}
                </strong>

              </div>

              <div className="admin-recruiters-detail">

                <span>
                  Location
                </span>

                <strong>
                  {selectedRecruiter.location}
                </strong>

              </div>

              <div className="admin-recruiters-detail">

                <span>
                  Registration Date
                </span>

                <strong>
                  {selectedRecruiter.registered}
                </strong>

              </div>

              <div className="admin-recruiters-detail">

                <span>
                  Last Login
                </span>

                <strong>
                  {selectedRecruiter.lastLogin}
                </strong>

              </div>

              <div className="admin-recruiters-detail">

                <span>
                  Candidates Managed
                </span>

                <strong>
                  {selectedRecruiter.candidates}
                </strong>

              </div>

              <div className="admin-recruiters-detail">

                <span>
                  Interviews Conducted
                </span>

                <strong>
                  {selectedRecruiter.interviews}
                </strong>

              </div>

              <div className="admin-recruiters-detail">

                <span>
                  Average Score
                </span>

                <strong>
                  {selectedRecruiter.averageScore}%
                </strong>

              </div>

              <div className="admin-recruiters-detail">

                <span>
                  Phone
                </span>

                <strong>
                  {selectedRecruiter.phone}
                </strong>

              </div>

            </div>

            {/* MODAL ACTIONS */}

            <div className="admin-recruiters-modal-actions">

              <button
                className="admin-recruiters-modal-secondary"
                onClick={() =>
                  setSelectedRecruiter(null)
                }
              >
                Close
              </button>

              <button
                className="admin-recruiters-modal-secondary"
                onClick={() =>
                  toggleRecruiterStatus(
                    selectedRecruiter.id
                  )
                }
              >
                {selectedRecruiter.status === "Suspended"
                  ? "Activate Account"
                  : "Suspend Account"}
              </button>

              <button
                className="admin-recruiters-modal-danger"
                onClick={() =>
                  deleteRecruiter(
                    selectedRecruiter.id
                  )
                }
              >
                Delete Recruiter
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default AdminRecruiters;