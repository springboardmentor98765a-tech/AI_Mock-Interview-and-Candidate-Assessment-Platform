import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminUsers.css";

function AdminUsers() {
  const navigate = useNavigate();

  // =========================================================
  // DEMO USER DATA
  // =========================================================

  const [users, setUsers] = useState([
    {
      id: "USR-1001",
      name: "Aarav Sharma",
      email: "aarav.sharma@gmail.com",
      role: "Candidate",
      status: "Active",
      registered: "12 Aug 2026",
      interviews: 8,
      averageScore: 86,
      location: "Bengaluru",
      phone: "+91 98XXXXXX21",
      lastLogin: "15 Sep 2026",
    },
    {
      id: "USR-1002",
      name: "Ananya Rao",
      email: "ananya.rao@gmail.com",
      role: "Candidate",
      status: "Active",
      registered: "10 Aug 2026",
      interviews: 6,
      averageScore: 91,
      location: "Mysuru",
      phone: "+91 97XXXXXX42",
      lastLogin: "14 Sep 2026",
    },
    {
      id: "USR-1003",
      name: "Rahul Verma",
      email: "rahul.verma@gmail.com",
      role: "Candidate",
      status: "Suspended",
      registered: "06 Aug 2026",
      interviews: 4,
      averageScore: 68,
      location: "Hyderabad",
      phone: "+91 96XXXXXX73",
      lastLogin: "09 Sep 2026",
    },
    {
      id: "USR-1004",
      name: "Priya Nair",
      email: "priya.nair@gmail.com",
      role: "Candidate",
      status: "Active",
      registered: "02 Aug 2026",
      interviews: 10,
      averageScore: 88,
      location: "Kochi",
      phone: "+91 95XXXXXX64",
      lastLogin: "15 Sep 2026",
    },
    {
      id: "USR-1005",
      name: "Vikram Patel",
      email: "vikram.patel@gmail.com",
      role: "Candidate",
      status: "Pending",
      registered: "30 Jul 2026",
      interviews: 2,
      averageScore: 74,
      location: "Mumbai",
      phone: "+91 94XXXXXX15",
      lastLogin: "12 Sep 2026",
    },
    {
      id: "USR-1006",
      name: "Sneha Kulkarni",
      email: "sneha.kulkarni@gmail.com",
      role: "Candidate",
      status: "Active",
      registered: "27 Jul 2026",
      interviews: 7,
      averageScore: 83,
      location: "Pune",
      phone: "+91 93XXXXXX36",
      lastLogin: "14 Sep 2026",
    },
    {
      id: "USR-1007",
      name: "Karan Mehta",
      email: "karan.mehta@company.com",
      role: "Recruiter",
      status: "Active",
      registered: "25 Jul 2026",
      interviews: 35,
      averageScore: 82,
      location: "Bengaluru",
      phone: "+91 92XXXXXX47",
      lastLogin: "15 Sep 2026",
    },
    {
      id: "USR-1008",
      name: "Meera Iyer",
      email: "meera.iyer@company.com",
      role: "Recruiter",
      status: "Active",
      registered: "22 Jul 2026",
      interviews: 28,
      averageScore: 79,
      location: "Chennai",
      phone: "+91 91XXXXXX58",
      lastLogin: "13 Sep 2026",
    },
    {
      id: "USR-1009",
      name: "Rohan Desai",
      email: "rohan.desai@company.com",
      role: "Recruiter",
      status: "Suspended",
      registered: "18 Jul 2026",
      interviews: 19,
      averageScore: 76,
      location: "Mumbai",
      phone: "+91 90XXXXXX69",
      lastLogin: "07 Sep 2026",
    },
    {
      id: "USR-1010",
      name: "Divya Menon",
      email: "divya.menon@gmail.com",
      role: "Candidate",
      status: "Active",
      registered: "15 Jul 2026",
      interviews: 9,
      averageScore: 94,
      location: "Bengaluru",
      phone: "+91 89XXXXXX70",
      lastLogin: "15 Sep 2026",
    },
  ]);

  // =========================================================
  // STATE
  // =========================================================

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedUser, setSelectedUser] = useState(null);

  // =========================================================
  // INITIALS
  // =========================================================

  const getInitials = (name) => {
    if (!name) return "U";

    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // =========================================================
  // FILTER USERS
  // =========================================================

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.id.toLowerCase().includes(search) ||
        user.location.toLowerCase().includes(search);

      const matchesRole =
        roleFilter === "All" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "All" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // =========================================================
  // SUMMARY COUNTS
  // =========================================================

  const totalUsers = users.length;

  const candidateCount = users.filter(
    (user) => user.role === "Candidate"
  ).length;

  const recruiterCount = users.filter(
    (user) => user.role === "Recruiter"
  ).length;

  const activeCount = users.filter(
    (user) => user.status === "Active"
  ).length;

  // =========================================================
  // CLEAR FILTERS
  // =========================================================

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("All");
    setStatusFilter("All");
  };

  // =========================================================
  // TOGGLE USER STATUS
  // =========================================================

  const toggleUserStatus = (userId) => {
    setUsers((currentUsers) =>
      currentUsers.map((user) => {
        if (user.id !== userId) return user;

        return {
          ...user,
          status:
            user.status === "Suspended"
              ? "Active"
              : "Suspended",
        };
      })
    );

    if (selectedUser?.id === userId) {
      setSelectedUser((current) => ({
        ...current,
        status:
          current.status === "Suspended"
            ? "Active"
            : "Suspended",
      }));
    }
  };

  // =========================================================
  // DELETE USER
  // =========================================================

  const deleteUser = (userId) => {
    const user = users.find((item) => item.id === userId);

    if (!user) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name}?`
    );

    if (!confirmed) return;

    setUsers((currentUsers) =>
      currentUsers.filter((item) => item.id !== userId)
    );

    if (selectedUser?.id === userId) {
      setSelectedUser(null);
    }
  };

  // =========================================================
  // SCORE CLASS
  // =========================================================

  const getScoreClass = (score) => {
    if (score >= 85) return "admin-score-excellent";
    if (score >= 70) return "admin-score-good";
    return "admin-score-low";
  };

  // =========================================================
  // ROLE CLASS
  // =========================================================

  const getRoleClass = (role) => {
    if (role === "Candidate") {
      return "admin-role-candidate";
    }

    if (role === "Recruiter") {
      return "admin-role-recruiter";
    }

    return "admin-role-admin";
  };

  // =========================================================
  // STATUS CLASS
  // =========================================================

  const getStatusClass = (status) => {
    if (status === "Active") {
      return "admin-status-active";
    }

    if (status === "Suspended") {
      return "admin-status-suspended";
    }

    return "admin-status-pending";
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="admin-users-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="admin-users-header">

        <div className="admin-users-brand">
          <div className="admin-users-logo">
            SH
          </div>

          <div>
            <h1>SmartHire AI</h1>
            <span>Administrator Portal</span>
          </div>
        </div>

        <div className="admin-users-header-actions">

          <div className="admin-users-system">
            <span className="admin-users-system-dot"></span>
            System Operational
          </div>

          <button
            className="admin-users-back"
            onClick={() => navigate("/admin")}
          >
            ← Dashboard
          </button>

        </div>

      </header>

      {/* =====================================================
          MAIN
          ===================================================== */}

      <main className="admin-users-main">

        {/* ===================================================
            INTRO
            =================================================== */}

        <section className="admin-users-intro">

          <div>
            <span className="admin-users-eyebrow">
              ADMINISTRATION • USER MANAGEMENT
            </span>

            <h2>Manage Platform Users</h2>

            <p>
              Monitor candidates and recruiters, review account
              activity, manage user status, and maintain a secure
              SmartHire AI platform.
            </p>
          </div>

          <div className="admin-users-intro-icon">
            👥
          </div>

        </section>

        {/* ===================================================
            SUMMARY
            =================================================== */}

        <section className="admin-users-summary">

          <div className="admin-user-summary-card">

            <div className="admin-user-summary-top">
              <div className="admin-user-summary-icon">
                👥
              </div>
            </div>

            <span>Total Users</span>
            <strong>{totalUsers}</strong>

          </div>

          <div className="admin-user-summary-card">

            <div className="admin-user-summary-top">
              <div className="admin-user-summary-icon">
                🎓
              </div>
            </div>

            <span>Candidates</span>
            <strong>{candidateCount}</strong>

          </div>

          <div className="admin-user-summary-card">

            <div className="admin-user-summary-top">
              <div className="admin-user-summary-icon">
                💼
              </div>
            </div>

            <span>Recruiters</span>
            <strong>{recruiterCount}</strong>

          </div>

          <div className="admin-user-summary-card">

            <div className="admin-user-summary-top">
              <div className="admin-user-summary-icon">
                🟢
              </div>
            </div>

            <span>Active Accounts</span>
            <strong>{activeCount}</strong>

          </div>

        </section>

        {/* ===================================================
            USER MANAGEMENT
            =================================================== */}

        <section className="admin-users-panel">

          <div className="admin-users-panel-header">

            <div>
              <span className="admin-users-eyebrow">
                PLATFORM ACCOUNTS
              </span>

              <h3>All Users</h3>

              <p>
                Search, filter and manage registered SmartHire
                AI accounts.
              </p>
            </div>

          </div>

          {/* =================================================
              CONTROLS
              ================================================= */}

          <div className="admin-users-controls">

            <div className="admin-users-search">

              <span className="admin-users-search-icon">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search by name, email, user ID or location..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />

            </div>

            <select
              className="admin-users-filter"
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value)
              }
            >
              <option value="All">All Roles</option>
              <option value="Candidate">Candidates</option>
              <option value="Recruiter">Recruiters</option>
            </select>

            <select
              className="admin-users-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Pending">Pending</option>
            </select>

            <button
              className="admin-users-clear"
              onClick={clearFilters}
            >
              Clear
            </button>

          </div>

          {/* =================================================
              RESULT COUNT
              ================================================= */}

          <div className="admin-users-results">

            <span>
              Showing{" "}
              <strong>{filteredUsers.length}</strong>{" "}
              of{" "}
              <strong>{users.length}</strong>{" "}
              users
            </span>

          </div>

          {/* =================================================
              TABLE
              ================================================= */}

          {filteredUsers.length > 0 ? (

            <div className="admin-users-table-wrapper">

              <table className="admin-users-table">

                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Interviews</th>
                    <th>Avg. Score</th>
                    <th>Location</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredUsers.map((user) => (

                    <tr key={user.id}>

                      {/* USER */}

                      <td>

                        <div className="admin-table-user">

                          <div className="admin-table-avatar">
                            {getInitials(user.name)}
                          </div>

                          <div className="admin-table-user-info">

                            <strong>
                              {user.name}
                            </strong>

                            <span>
                              {user.email}
                            </span>

                          </div>

                        </div>

                      </td>

                      {/* ROLE */}

                      <td>

                        <span
                          className={`admin-role-badge ${getRoleClass(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>

                      </td>

                      {/* STATUS */}

                      <td>

                        <span
                          className={`admin-user-status ${getStatusClass(
                            user.status
                          )}`}
                        >
                          <span className="admin-status-dot"></span>
                          {user.status}
                        </span>

                      </td>

                      {/* REGISTERED */}

                      <td>
                        {user.registered}
                      </td>

                      {/* INTERVIEWS */}

                      <td>
                        {user.interviews}
                      </td>

                      {/* SCORE */}

                      <td>

                        <span
                          className={`admin-user-score ${getScoreClass(
                            user.averageScore
                          )}`}
                        >
                          {user.averageScore}%
                        </span>

                      </td>

                      {/* LOCATION */}

                      <td>
                        {user.location}
                      </td>

                      {/* ACTIONS */}

                      <td>

                        <div className="admin-table-actions">

                          <button
                            className="admin-action-btn"
                            onClick={() =>
                              setSelectedUser(user)
                            }
                          >
                            View
                          </button>

                          <button
                            className={`admin-action-btn ${
                              user.status === "Suspended"
                                ? "success"
                                : "danger"
                            }`}
                            onClick={() =>
                              toggleUserStatus(user.id)
                            }
                          >
                            {user.status === "Suspended"
                              ? "Activate"
                              : "Suspend"}
                          </button>

                          <button
                            className="admin-action-btn danger"
                            onClick={() =>
                              deleteUser(user.id)
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

            <div className="admin-users-empty">

              <div className="admin-users-empty-icon">
                🔎
              </div>

              <h3>No users found</h3>

              <p>
                Try changing your search or filters.
              </p>

            </div>

          )}

          {/* =================================================
              AI NOTICE
              ================================================= */}

          <div className="admin-users-ai-notice">

            <div className="admin-users-ai-icon">
              ✨
            </div>

            <div>

              <h3>
                AI-Powered User Monitoring
              </h3>

              <p>
                SmartHire AI can analyze platform activity,
                identify unusual account behavior, monitor
                interview participation patterns, and help
                administrators maintain a reliable recruitment
                environment.
              </p>

            </div>

          </div>

        </section>

      </main>

      {/* =====================================================
          FOOTER
          ===================================================== */}

      <footer className="admin-users-footer">

        <span>
          © 2026 SmartHire AI
        </span>

        <span>
          Secure • Intelligent • Recruitment
        </span>

      </footer>

      {/* =====================================================
          USER DETAILS MODAL
          ===================================================== */}

      {selectedUser && (

        <div
          className="admin-users-modal-overlay"
          onClick={() => setSelectedUser(null)}
        >

          <div
            className="admin-users-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="admin-users-modal-header">

              <div className="admin-users-modal-user">

                <div className="admin-users-modal-avatar">
                  {getInitials(selectedUser.name)}
                </div>

                <div>

                  <h2>
                    {selectedUser.name}
                  </h2>

                  <p>
                    {selectedUser.email}
                  </p>

                </div>

              </div>

              <button
                className="admin-users-modal-close"
                onClick={() => setSelectedUser(null)}
              >
                ×
              </button>

            </div>

            {/* =================================================
                USER DETAILS
                ================================================= */}

            <div className="admin-users-modal-grid">

              <div className="admin-users-detail">
                <span>User ID</span>
                <strong>
                  {selectedUser.id}
                </strong>
              </div>

              <div className="admin-users-detail">
                <span>Role</span>
                <strong>
                  {selectedUser.role}
                </strong>
              </div>

              <div className="admin-users-detail">
                <span>Status</span>
                <strong>
                  {selectedUser.status}
                </strong>
              </div>

              <div className="admin-users-detail">
                <span>Location</span>
                <strong>
                  {selectedUser.location}
                </strong>
              </div>

              <div className="admin-users-detail">
                <span>Registration Date</span>
                <strong>
                  {selectedUser.registered}
                </strong>
              </div>

              <div className="admin-users-detail">
                <span>Last Login</span>
                <strong>
                  {selectedUser.lastLogin}
                </strong>
              </div>

              <div className="admin-users-detail">
                <span>Interviews</span>
                <strong>
                  {selectedUser.interviews}
                </strong>
              </div>

              <div className="admin-users-detail">
                <span>Average Score</span>
                <strong>
                  {selectedUser.averageScore}%
                </strong>
              </div>

              <div className="admin-users-detail">
                <span>Phone</span>
                <strong>
                  {selectedUser.phone}
                </strong>
              </div>

            </div>

            {/* =================================================
                MODAL ACTIONS
                ================================================= */}

            <div className="admin-users-modal-actions">

              <button
                className="admin-modal-secondary"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </button>

              <button
                className="admin-modal-secondary"
                onClick={() =>
                  toggleUserStatus(selectedUser.id)
                }
              >
                {selectedUser.status === "Suspended"
                  ? "Activate Account"
                  : "Suspend Account"}
              </button>

              <button
                className="admin-modal-danger"
                onClick={() =>
                  deleteUser(selectedUser.id)
                }
              >
                Delete User
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default AdminUsers;