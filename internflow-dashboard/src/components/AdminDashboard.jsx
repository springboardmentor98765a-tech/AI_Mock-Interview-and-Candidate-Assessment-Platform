// internflow-dashboard/src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import '../styles/AdminDashboard.css';

const AdminDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [users, setUsers] = useState([]);
  const [roleCounts, setRoleCounts] = useState({ users: 0, recruiters: 0, admins: 0 });
  const [interviewActivity, setInterviewActivity] = useState(null);
  const [aiPerformance, setAiPerformance] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [usageAnalytics, setUsageAnalytics] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  // Filters
  const [userFilter, setUserFilter] = useState({ role: 'ALL', search: '' });
  const [timeRange, setTimeRange] = useState('30d');

  // =============================================
  // FETCHERS
  // =============================================
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        role: userFilter.role,
        search: userFilter.search
      });
      const response = await fetch(`http://localhost:5001/api/admin/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users || []);
        setRoleCounts(data.data.roleCounts || {});
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchInterviewActivity = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/admin/interviews/activity', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setInterviewActivity(data.data);
      }
    } catch (error) {
      console.error('Error fetching interview activity:', error);
    }
  };

  const fetchAiPerformance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/admin/ai-performance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAiPerformance(data.data);
      }
    } catch (error) {
      console.error('Error fetching AI performance:', error);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/admin/system-health', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSystemHealth(data.data);
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
    }
  };

  const fetchUsageAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/admin/usage-analytics?timeRange=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUsageAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching usage analytics:', error);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/admin/activity-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setActivityLogs(data.data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchInterviewActivity(),
      fetchAiPerformance(),
      fetchSystemHealth(),
      fetchUsageAnalytics(),
      fetchActivityLogs()
    ]);
    setLoading(false);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  // =============================================
  // ACTIONS
  // =============================================
  const updateUserRole = async (userId, newRole) => {
    if (!window.confirm(`Change user role to ${newRole}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await response.json();
      if (data.success) {
        alert('✅ Role updated');
        fetchUsers();
        fetchActivityLogs();
      } else {
        alert('❌ ' + data.error);
      }
    } catch (error) {
      alert('Error updating role');
    }
  };

  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete ${userName}? This cannot be undone.`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        alert('✅ User deleted');
        fetchUsers();
        fetchActivityLogs();
      } else {
        alert('❌ ' + data.error);
      }
    } catch (error) {
      alert('Error deleting user');
    }
  };

  // =============================================
  // USE EFFECTS
  // =============================================
  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchUsageAnalytics();
    }
  }, [timeRange]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [userFilter]);

  // =============================================
  // HELPERS
  // =============================================
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (date) => {
    if (!date) return 'N/A';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getRoleBadge = (role) => {
    const badges = {
      'USER': 'role-user',
      'RECRUITER': 'role-recruiter',
      'ADMIN': 'role-admin'
    };
    return badges[role] || 'role-user';
  };

  const getStatusBadge = (status) => {
    const badges = {
      'completed': 'badge-success',
      'in_progress': 'badge-primary',
      'pending': 'badge-warning',
      'paused': 'badge-warning',
      'ended': 'badge-secondary'
    };
    return badges[status] || 'badge-secondary';
  };

  // =============================================
  // RENDER
  // =============================================
  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard py-4">
      <div className="container-fluid px-4">
        {/* Header */}
        <div className="admin-header">
          <div className="row align-items-center">
            <div className="col-md-7">
              <h1>🏛️ Admin Control Center</h1>
              <p className="text-muted mb-0">
                System governance, user management, AI monitoring, and platform analytics.
              </p>
            </div>
            <div className="col-md-5 text-md-end">
              <button 
                className="btn btn-primary rounded-pill px-4"
                onClick={refreshData}
                disabled={refreshing}
              >
                <i className={`fas ${refreshing ? 'fa-spinner fa-spin' : 'fa-sync-alt'} me-2`}></i>
                {refreshing ? 'Refreshing...' : 'Refresh All'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="admin-tabs mt-4">
            <button 
              className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <i className="fas fa-gauge-high"></i> Overview
            </button>
            <button 
              className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <i className="fas fa-users-cog"></i> Users
            </button>
            <button 
              className={`admin-tab ${activeTab === 'interviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('interviews')}
            >
              <i className="fas fa-comments"></i> Interviews
            </button>
            <button 
              className={`admin-tab ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              <i className="fas fa-robot"></i> AI Monitor
            </button>
            <button 
              className={`admin-tab ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <i className="fas fa-chart-line"></i> Analytics
            </button>
          </div>
        </div>

        {/* ============================================= */}
        {/* OVERVIEW TAB */}
        {/* ============================================= */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="admin-stats-grid">
              <div className="admin-stat-card blue">
                <div className="stat-icon blue"><i className="fas fa-users"></i></div>
                <div className="stat-label">Total Users</div>
                <div className="stat-number">{roleCounts.users + roleCounts.recruiters + roleCounts.admins}</div>
                <div className="stat-sub">Active accounts</div>
              </div>
              <div className="admin-stat-card green">
                <div className="stat-icon green"><i className="fas fa-user-tie"></i></div>
                <div className="stat-label">Recruiters</div>
                <div className="stat-number">{roleCounts.recruiters}</div>
                <div className="stat-sub">Verified orgs</div>
              </div>
              <div className="admin-stat-card purple">
                <div className="stat-icon purple"><i className="fas fa-graduation-cap"></i></div>
                <div className="stat-label">Candidates</div>
                <div className="stat-number">{roleCounts.users}</div>
                <div className="stat-sub">Registered jobseekers</div>
              </div>
              <div className="admin-stat-card orange">
                <div className="stat-icon orange"><i className="fas fa-comments"></i></div>
                <div className="stat-label">Total Interviews</div>
                <div className="stat-number">{systemHealth?.tables?.interviews || 0}</div>
                <div className="stat-sub">All time sessions</div>
              </div>
            </div>

            {/* System Health & Quick Stats */}
            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <div className="health-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">
                      <i className="fas fa-heartbeat text-danger me-2"></i>
                      🖥️ System Health
                    </h5>
                    <span className={`badge ${systemHealth?.server?.status === 'online' ? 'bg-success' : 'bg-danger'}`}>
                      <i className="fas fa-circle me-1" style={{ fontSize: '6px' }}></i>
                      {systemHealth?.server?.status || 'unknown'}
                    </span>
                  </div>
                  <div className="row">
                    <div className="col-4">
                      <div className="health-metric">
                        <div className="metric-value">{systemHealth?.server?.uptimeFormatted || 'N/A'}</div>
                        <div className="metric-label">Uptime</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="health-metric">
                        <div className="metric-value">{systemHealth?.database?.latency || 0} ms</div>
                        <div className="metric-label">DB Latency</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="health-metric">
                        <div className="metric-value">{systemHealth?.server?.memoryUsed || 0} MB</div>
                        <div className="metric-label">Memory</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-top">
                    <div className="row">
                      <div className="col-6">
                        <small className="text-muted">DB Size</small>
                        <div className="fw-bold">{systemHealth?.database?.sizeFormatted || 'N/A'}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Connections</small>
                        <div className="fw-bold">
                          {systemHealth?.database?.connections || 0} / {systemHealth?.database?.maxConnections || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="health-card">
                  <h5 className="mb-3">
                    <i className="fas fa-database text-primary me-2"></i>
                    📊 Data Overview
                  </h5>
                  <div className="row">
                    <div className="col-6 mb-3">
                      <div className="stat-row">
                        <span className="stat-row-label">Users</span>
                        <span className="stat-row-value">{systemHealth?.tables?.users || 0}</span>
                      </div>
                    </div>
                    <div className="col-6 mb-3">
                      <div className="stat-row">
                        <span className="stat-row-label">Interviews</span>
                        <span className="stat-row-value">{systemHealth?.tables?.interviews || 0}</span>
                      </div>
                    </div>
                    <div className="col-6 mb-3">
                      <div className="stat-row">
                        <span className="stat-row-label">Recordings</span>
                        <span className="stat-row-value">{systemHealth?.tables?.recordings || 0}</span>
                      </div>
                    </div>
                    <div className="col-6 mb-3">
                      <div className="stat-row">
                        <span className="stat-row-label">Notifications</span>
                        <span className="stat-row-value">{systemHealth?.tables?.notifications || 0}</span>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="stat-row">
                        <span className="stat-row-label">Shortlists</span>
                        <span className="stat-row-value">{systemHealth?.tables?.shortlists || 0}</span>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="stat-row">
                        <span className="stat-row-label">Response</span>
                        <span className="stat-row-value">{systemHealth?.responseTime || 0} ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Activity */}
            {interviewActivity?.todayStats && (
              <div className="row g-4 mb-4">
                <div className="col-md-12">
                  <div className="health-card">
                    <h5 className="mb-3">
                      <i className="fas fa-calendar-day text-success me-2"></i>
                      📅 Today's Activity
                    </h5>
                    <div className="row">
                      <div className="col-md-3">
                        <div className="activity-metric">
                          <div className="activity-number">{interviewActivity.todayStats.total}</div>
                          <div className="activity-label">Total Interviews</div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="activity-metric">
                          <div className="activity-number text-success">{interviewActivity.todayStats.completed}</div>
                          <div className="activity-label">Completed</div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="activity-metric">
                          <div className="activity-number text-warning">{interviewActivity.todayStats.inProgress}</div>
                          <div className="activity-label">In Progress</div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="activity-metric">
                          <div className="activity-number text-primary">{interviewActivity.todayStats.avgScore}%</div>
                          <div className="activity-label">Avg Score</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Logs */}
            <div className="card shadow-sm">
              <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
                <h5 className="mb-0">
                  <i className="fas fa-history text-primary me-2"></i>
                  📋 Recent Admin Activity
                </h5>
              </div>
              <div className="card-body p-0">
                {activityLogs.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-inbox fa-2x text-muted mb-3"></i>
                    <p className="text-muted">No admin activity yet</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table log-table mb-0">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Admin</th>
                          <th>Action</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityLogs.slice(0, 10).map((log) => (
                          <tr key={log.id}>
                            <td className="text-muted small">{formatTimeAgo(log.timestamp)}</td>
                            <td className="fw-medium">{log.adminName || 'System'}</td>
                            <td>
                              <span className="badge bg-primary bg-opacity-10 text-primary">
                                {log.action}
                              </span>
                            </td>
                            <td>{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ============================================= */}
        {/* USERS TAB */}
        {/* ============================================= */}
        {activeTab === 'users' && (
          <>
            {/* Filters */}
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-5">
                    <div className="search-box">
                      <i className="fas fa-search"></i>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by name or email..."
                        value={userFilter.search}
                        onChange={(e) => setUserFilter({ ...userFilter, search: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <select
                      className="form-select"
                      value={userFilter.role}
                      onChange={(e) => setUserFilter({ ...userFilter, role: e.target.value })}
                    >
                      <option value="ALL">All Roles</option>
                      <option value="USER">Candidates</option>
                      <option value="RECRUITER">Recruiters</option>
                      <option value="ADMIN">Admins</option>
                    </select>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <span className="badge bg-primary bg-opacity-10 text-primary me-2">
                      {users.length} shown
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="card shadow-sm">
              <div className="card-header bg-white py-3">
                <h5 className="mb-0">
                  <i className="fas fa-users-cog text-primary me-2"></i>
                  👥 User Management
                </h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table user-table mb-0">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Provider</th>
                        <th>Interviews</th>
                        <th>Avg Score</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="user-avatar-sm">
                                {u.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div>
                                <div className="fw-medium">{u.name}</div>
                                <div className="text-muted small">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`role-badge ${getRoleBadge(u.role)}`}>
                              {u.role}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-light text-muted">
                              {u.provider || 'LOCAL'}
                            </span>
                          </td>
                          <td>
                            <span className="fw-medium">{u.totalInterviews}</span>
                            <span className="text-muted small"> ({u.completedInterviews} completed)</span>
                          </td>
                          <td>
                            <span className={`fw-bold ${u.avgScore >= 70 ? 'text-success' : u.avgScore >= 50 ? 'text-warning' : 'text-danger'}`}>
                              {u.avgScore}%
                            </span>
                          </td>
                          <td className="text-muted small">
                            {formatDate(u.joinedAt)}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <select
                                className="form-select form-select-sm"
                                value={u.role}
                                onChange={(e) => updateUserRole(u.id, e.target.value)}
                                disabled={u.id === user.id}
                                style={{ width: '130px' }}
                              >
                                <option value="USER">Candidate</option>
                                <option value="RECRUITER">Recruiter</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => deleteUser(u.id, u.name)}
                                disabled={u.id === user.id}
                                title="Delete user"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============================================= */}
        {/* INTERVIEWS TAB */}
        {/* ============================================= */}
        {activeTab === 'interviews' && interviewActivity && (
          <>
            {/* Live Sessions */}
            {interviewActivity.liveSessions?.length > 0 && (
              <div className="card shadow-sm mb-4 border border-success">
                <div className="card-header bg-success bg-opacity-10 py-3">
                  <h5 className="mb-0">
                    <span className="live-dot"></span>
                    🔴 Live Sessions ({interviewActivity.liveSessions.length})
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    {interviewActivity.liveSessions.map((session) => (
                      <div className="col-md-4" key={session.id}>
                        <div className="live-session-card">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-bold">{session.candidate}</span>
                            <span className={`badge badge-${session.status === 'in_progress' ? 'primary' : 'warning'}`}>
                              {session.status}
                            </span>
                          </div>
                          <div className="text-muted small">
                            <div>{session.type} · {session.domain}</div>
                            <div>
                              <i className="fas fa-clock me-1"></i>
                              Started {formatTimeAgo(session.startTime)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Interviews */}
            <div className="card shadow-sm">
              <div className="card-header bg-white py-3">
                <h5 className="mb-0">
                  <i className="fas fa-list text-primary me-2"></i>
                  📋 Recent Interview Activity
                </h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Type</th>
                        <th>Domain</th>
                        <th>Difficulty</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interviewActivity.recentInterviews?.map((interview) => (
                        <tr key={interview.id}>
                          <td>
                            <div className="fw-medium">{interview.candidate}</div>
                            <div className="text-muted small">{interview.email}</div>
                          </td>
                          <td>
                            <span className="badge type-badge">
                              {interview.type === 'tr' ? '💻 Technical' :
                               interview.type === 'mr' ? '👔 Managerial' : '🤝 HR'}
                            </span>
                          </td>
                          <td>{interview.domain}</td>
                          <td>
                            <span className={`badge difficulty-${interview.difficulty}`}>
                              {interview.difficulty}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadge(interview.status)}`}>
                              {interview.status}
                            </span>
                          </td>
                          <td>
                            {interview.score ? (
                              <span className={`fw-bold ${interview.score >= 70 ? 'text-success' : interview.score >= 50 ? 'text-warning' : 'text-danger'}`}>
                                {interview.score}%
                              </span>
                            ) : '-'}
                          </td>
                          <td className="text-muted small">
                            {formatTimeAgo(interview.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============================================= */}
        {/* AI MONITORING TAB */}
        {/* ============================================= */}
        {activeTab === 'ai' && aiPerformance && (
          <>
            {/* ML API Status */}
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-md-6">
                    <h5 className="mb-3">
                      <i className="fas fa-robot text-primary me-2"></i>
                      🤖 ML API Status
                    </h5>
                    <div className="ml-status-card">
                      <div className="d-flex align-items-center gap-3">
                        <div className={`status-indicator-large ${aiPerformance.mlApi.status}`}>
                          <i className="fas fa-microchip"></i>
                        </div>
                        <div>
                          <div className="fw-bold" style={{ fontSize: '1.2rem' }}>
                            {aiPerformance.mlApi.status === 'online' ? '✅ Online' : '❌ Offline'}
                          </div>
                          <div className="text-muted small">{aiPerformance.mlApi.url}</div>
                          <div className="text-muted small">Model: {aiPerformance.mlApi.model}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="row">
                      <div className="col-6">
                        <div className="metric-box">
                          <div className="metric-value-large">{aiPerformance.scoring.totalScored}</div>
                          <div className="metric-label">Scores Generated</div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="metric-box">
                          <div className="metric-value-large">{aiPerformance.scoring.avgScore}%</div>
                          <div className="metric-label">Average Score</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Distribution */}
            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h5 className="mb-3">📊 Score Distribution</h5>
                    {Object.entries(aiPerformance.distribution).map(([key, value]) => {
                      const total = Object.values(aiPerformance.distribution).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                      const colors = {
                        excellent: '#22c55e',
                        good: '#84cc16',
                        average: '#f59e0b',
                        needsImprovement: '#f97316',
                        poor: '#ef4444'
                      };
                      const labels = {
                        excellent: '🌟 Excellent (90+)',
                        good: '👍 Good (75-89)',
                        average: '📈 Average (60-74)',
                        needsImprovement: '🔄 Needs Improvement (40-59)',
                        poor: '⚠️ Poor (<40)'
                      };
                      return (
                        <div className="distribution-row" key={key}>
                          <div className="distribution-label">{labels[key]}</div>
                          <div className="distribution-bar-container">
                            <div 
                              className="distribution-bar" 
                              style={{ width: `${percentage}%`, background: colors[key] }}
                            ></div>
                          </div>
                          <div className="distribution-value">{value} ({percentage}%)</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h5 className="mb-3">🎯 AI System Components</h5>
                    <div className="component-list">
                      <div className="component-item">
                        <i className="fas fa-brain text-primary"></i>
                        <div className="component-info">
                          <div className="fw-bold">Scoring Engine</div>
                          <small className="text-muted">Multi-dimension evaluation</small>
                        </div>
                        <div className="component-stat">
                          {aiPerformance.scoring.totalScored} scores
                        </div>
                      </div>
                      <div className="component-item">
                        <i className="fas fa-comments text-success"></i>
                        <div className="component-info">
                          <div className="fw-bold">Feedback Generator</div>
                          <small className="text-muted">AI feedback coverage</small>
                        </div>
                        <div className="component-stat">
                          {aiPerformance.feedback.coverage}%
                        </div>
                      </div>
                      <div className="component-item">
                        <i className="fas fa-bell text-warning"></i>
                        <div className="component-info">
                          <div className="fw-bold">Notifications</div>
                          <small className="text-muted">Email alerts sent</small>
                        </div>
                        <div className="component-stat">
                          {aiPerformance.notifications.total}
                        </div>
                      </div>
                      <div className="component-item">
                        <i className="fas fa-file-alt text-info"></i>
                        <div className="component-info">
                          <div className="fw-bold">Reports Generated</div>
                          <small className="text-muted">Performance reports</small>
                        </div>
                        <div className="component-stat">
                          {aiPerformance.notifications.reports}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Stats */}
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="mb-3">📈 Score Statistics</h5>
                <div className="row">
                  <div className="col-md-3">
                    <div className="stat-box">
                      <div className="stat-box-value text-primary">{aiPerformance.scoring.maxScore}%</div>
                      <div className="stat-box-label">Highest Score</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="stat-box">
                      <div className="stat-box-value text-danger">{aiPerformance.scoring.minScore}%</div>
                      <div className="stat-box-label">Lowest Score</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="stat-box">
                      <div className="stat-box-value text-success">{aiPerformance.scoring.avgScore}%</div>
                      <div className="stat-box-label">Average Score</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="stat-box">
                      <div className="stat-box-value text-warning">{aiPerformance.scoring.stdDev}%</div>
                      <div className="stat-box-label">Std Deviation</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============================================= */}
        {/* ANALYTICS TAB */}
        {/* ============================================= */}
        {activeTab === 'analytics' && usageAnalytics && (
          <>
            {/* Time Range Selector */}
            <div className="card shadow-sm mb-4">
              <div className="card-body d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="fas fa-chart-line text-primary me-2"></i>
                  📊 Platform Analytics
                </h5>
                <div className="time-range-selector">
                  <button className={timeRange === '7d' ? 'active' : ''} onClick={() => setTimeRange('7d')}>7D</button>
                  <button className={timeRange === '30d' ? 'active' : ''} onClick={() => setTimeRange('30d')}>30D</button>
                  <button className={timeRange === '90d' ? 'active' : ''} onClick={() => setTimeRange('90d')}>90D</button>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-4">
              {/* Interview Trend */}
              <div className="col-md-8">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h5 className="mb-3">📈 Interview Activity</h5>
                    {usageAnalytics.interviewsTrend?.length > 0 ? (
                      <div className="trend-chart">
                        {usageAnalytics.interviewsTrend.slice(-14).map((day, idx) => {
                          const maxCount = Math.max(...usageAnalytics.interviewsTrend.map(d => d.total), 1);
                          return (
                            <div key={idx} className="trend-bar-wrapper">
                              <div className="trend-bar-container">
                                <div 
                                  className="trend-bar"
                                  style={{ 
                                    height: `${(day.total / maxCount) * 100}%`,
                                    background: 'linear-gradient(180deg, #4f46e5, #6366f1)'
                                  }}
                                  title={`${day.total} interviews, ${day.completed} completed, avg ${day.avgScore}%`}
                                >
                                  <span className="trend-value">{day.total}</span>
                                </div>
                              </div>
                              <div className="trend-date">
                                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted text-center py-4">No interview data yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* User Distribution */}
              <div className="col-md-4">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h5 className="mb-3">👥 User Distribution</h5>
                    {usageAnalytics.roleDistribution?.map((role) => {
                      const total = usageAnalytics.roleDistribution.reduce((a, b) => a + b.count, 0);
                      const percentage = total > 0 ? Math.round((role.count / total) * 100) : 0;
                      const colors = { USER: '#4f46e5', RECRUITER: '#22c55e', ADMIN: '#f59e0b' };
                      const icons = { USER: '🎓', RECRUITER: '👔', ADMIN: '👑' };
                      return (
                        <div key={role.role} className="role-distribution-row">
                          <div className="d-flex justify-content-between mb-1">
                            <span>{icons[role.role]} {role.role}</span>
                            <span className="fw-bold">{role.count}</span>
                          </div>
                          <div className="progress-bar-sm">
                            <div 
                              className="progress-fill-sm"
                              style={{ width: `${percentage}%`, background: colors[role.role] }}
                            ></div>
                          </div>
                          <div className="text-muted small">{percentage}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-4">
              {/* Domain Distribution */}
              <div className="col-md-6">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h5 className="mb-3">💼 Top Domains</h5>
                    {usageAnalytics.domainDistribution?.slice(0, 8).map((domain, idx) => {
                      const maxCount = Math.max(...usageAnalytics.domainDistribution.map(d => d.count), 1);
                      return (
                        <div key={idx} className="domain-row">
                          <span className="domain-name">{domain.domain}</span>
                          <div className="domain-bar-container">
                            <div 
                              className="domain-bar"
                              style={{ width: `${(domain.count / maxCount) * 100}%` }}
                            ></div>
                          </div>
                          <span className="domain-count">{domain.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Top Active Users */}
              <div className="col-md-6">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h5 className="mb-3">🏆 Top Active Users</h5>
                    {usageAnalytics.topActiveUsers?.length > 0 ? (
                      <div className="top-users-list">
                        {usageAnalytics.topActiveUsers.map((u, idx) => (
                          <div key={u.id} className="top-user-item">
                            <span className="top-user-rank">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                            </span>
                            <div className="top-user-info">
                              <div className="fw-medium">{u.name}</div>
                              <div className="text-muted small">{u.email}</div>
                            </div>
                            <div className="text-end">
                              <div className="fw-bold">{u.interviewCount}</div>
                              <div className="text-muted small">Avg: {u.avgScore}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted text-center py-4">No active users</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="text-center text-muted small mt-4">
          © 2026 SmartHire AI · Admin Control Panel
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        .search-box {
          position: relative;
        }
        .search-box i {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }
        .search-box input {
          padding-left: 38px;
          border-radius: 10px;
        }
        .user-avatar-sm {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5, #3b82f6);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 600;
          flex-shrink: 0;
        }
        .role-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .role-user { background: #dbeafe; color: #1d4ed8; }
        .role-recruiter { background: #d1fae5; color: #065f46; }
        .role-admin { background: #fef3c7; color: #92400e; }
        .live-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
          margin-right: 8px;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        .live-session-card {
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 10px;
          padding: 12px;
        }
        .metric-box {
          background: #f8fafc;
          padding: 16px;
          border-radius: 10px;
          text-align: center;
        }
        .metric-value-large {
          font-size: 1.8rem;
          font-weight: 700;
          color: #4f46e5;
        }
        .metric-label {
          font-size: 0.8rem;
          color: #6b7280;
        }
        .ml-status-card {
          background: #f8fafc;
          padding: 16px;
          border-radius: 10px;
        }
        .status-indicator-large {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }
        .status-indicator-large.online {
          background: #d1fae5;
          color: #065f46;
        }
        .status-indicator-large.offline {
          background: #fee2e2;
          color: #991b1b;
        }
        .component-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .component-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
        }
        .component-item i {
          font-size: 1.3rem;
          width: 32px;
          text-align: center;
        }
        .component-info {
          flex: 1;
        }
        .component-stat {
          font-weight: 700;
          color: #1f2937;
        }
        .distribution-row {
          margin-bottom: 16px;
        }
        .distribution-label {
          font-size: 0.85rem;
          color: #374151;
          margin-bottom: 4px;
        }
        .distribution-bar-container {
          height: 8px;
          background: #f3f4f6;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 4px;
        }
        .distribution-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        .distribution-value {
          font-size: 0.75rem;
          color: #6b7280;
          text-align: right;
        }
        .stat-box {
          background: #f8fafc;
          padding: 20px;
          border-radius: 10px;
          text-align: center;
        }
        .stat-box-value {
          font-size: 1.8rem;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 4px;
        }
        .stat-box-label {
          font-size: 0.8rem;
          color: #6b7280;
        }
        .role-distribution-row {
          margin-bottom: 16px;
        }
        .progress-bar-sm {
          height: 6px;
          background: #f3f4f6;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 4px;
        }
        .progress-fill-sm {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }
        .trend-chart {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          height: 200px;
          padding: 12px 0;
          overflow-x: auto;
        }
        .trend-bar-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 40px;
          flex: 1;
          height: 100%;
        }
        .trend-bar-container {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .trend-bar {
          width: 32px;
          min-height: 6px;
          border-radius: 6px 6px 0 0;
          position: relative;
          transition: all 0.3s ease;
          display: flex;
          align-items: flex-start;
          justify-content: center;
        }
        .trend-value {
          position: absolute;
          top: -20px;
          font-size: 0.7rem;
          font-weight: 600;
          color: #374151;
        }
        .trend-date {
          font-size: 0.65rem;
          color: #6b7280;
          margin-top: 4px;
          white-space: nowrap;
        }
        .domain-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .domain-name {
          min-width: 110px;
          font-size: 0.85rem;
          color: #374151;
          text-transform: capitalize;
        }
        .domain-bar-container {
          flex: 1;
          height: 8px;
          background: #f3f4f6;
          border-radius: 4px;
          overflow: hidden;
        }
        .domain-bar {
          height: 100%;
          background: linear-gradient(90deg, #4f46e5, #6366f1);
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        .domain-count {
          min-width: 30px;
          text-align: right;
          font-size: 0.85rem;
          font-weight: 600;
          color: #6b7280;
        }
        .top-users-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .top-user-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: #f8fafc;
          border-radius: 8px;
        }
        .top-user-rank {
          font-size: 1.2rem;
          width: 32px;
          text-align: center;
          flex-shrink: 0;
        }
        .top-user-info {
          flex: 1;
          min-width: 0;
        }
        .top-user-info .fw-medium {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .activity-metric {
          text-align: center;
          padding: 16px;
        }
        .activity-number {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 4px;
        }
        .activity-label {
          font-size: 0.85rem;
          color: #6b7280;
        }
        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .stat-row-label {
          color: #6b7280;
          font-size: 0.9rem;
        }
        .stat-row-value {
          font-weight: 700;
          color: #1f2937;
        }
        .time-range-selector {
          display: flex;
          gap: 4px;
          background: #f3f4f6;
          padding: 4px;
          border-radius: 10px;
        }
        .time-range-selector button {
          padding: 6px 16px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.8rem;
          color: #6b7280;
          transition: all 0.2s ease;
        }
        .time-range-selector button.active {
          background: white;
          color: #4f46e5;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;