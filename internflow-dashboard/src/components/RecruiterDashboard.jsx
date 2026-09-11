// internflow-dashboard/src/components/RecruiterDashboard.jsx
import React, { useState, useEffect } from 'react';
import '../styles/RecruiterDashboard.css';
import CandidateComparison from './CandidateComparison';
import RecruiterSkillsAnalytics from './RecruiterSkillsAnalytics';
import RecruiterTrends from './RecruiterTrends';

const RecruiterDashboard = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [summary, setSummary] = useState({
    totalCandidates: 0,
    activeCandidates: 0,
    completedCandidates: 0,
    newCandidates: 0,
    averageScore: 0,
    totalInterviews: 0,
    completedInterviews: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    sortBy: 'avg_score',
    sortOrder: 'desc'
  });
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateDetails, setCandidateDetails] = useState(null);
  const [shortlist, setShortlist] = useState([]);
  const [showShortlist, setShowShortlist] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // =============================================
  // NEW: Tab & Comparison State
  // =============================================
  const [activeTab, setActiveTab] = useState('candidates');
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  // =============================================
  // FETCH CANDIDATES
  // =============================================
  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        search: filters.search,
        status: filters.status,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      const response = await fetch(`http://localhost:5001/api/recruiter/candidates?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch candidates');
      }

      const data = await response.json();
      
      if (data.success) {
        setCandidates(data.data.candidates || []);
        setSummary(data.data.summary || {});
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      alert('Failed to load candidates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // FETCH SHORTLIST
  // =============================================
  const fetchShortlist = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/recruiter/shortlist', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setShortlist(data.data.shortlist || []);
        }
      }
    } catch (error) {
      console.error('Error fetching shortlist:', error);
    }
  };

  // =============================================
  // FETCH CANDIDATE DETAILS
  // =============================================
  const fetchCandidateDetails = async (candidateId) => {
    setLoadingDetails(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/recruiter/candidates/${candidateId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch candidate details');
      }

      const data = await response.json();
      
      if (data.success) {
        setCandidateDetails(data.data);
        setSelectedCandidate(candidateId);
      }
    } catch (error) {
      console.error('Error fetching candidate details:', error);
      alert('Failed to load candidate details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  // =============================================
  // TOGGLE SHORTLIST
  // =============================================
  const toggleShortlist = async (candidateId) => {
    const isShortlisted = shortlist.some(s => s.candidateId === candidateId);
    
    try {
      const token = localStorage.getItem('token');
      const method = isShortlisted ? 'DELETE' : 'POST';
      const url = `http://localhost:5001/api/recruiter/candidates/${candidateId}/shortlist`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: isShortlisted ? undefined : JSON.stringify({ notes: 'Shortlisted for review' })
      });

      if (response.ok) {
        fetchShortlist();
        setCandidates(prev => prev.map(c => 
          c.id === candidateId 
            ? { ...c, isShortlisted: !isShortlisted }
            : c
        ));
        
        if (selectedCandidate === candidateId) {
          fetchCandidateDetails(candidateId);
        }
      }
    } catch (error) {
      console.error('Error toggling shortlist:', error);
    }
  };

  // =============================================
  // NEW: TOGGLE COMPARE SELECTION
  // =============================================
  const toggleCompareSelection = (candidateId) => {
    setSelectedForCompare(prev => {
      if (prev.includes(candidateId)) {
        return prev.filter(id => id !== candidateId);
      }
      if (prev.length >= 4) {
        alert('Maximum 4 candidates can be compared at once');
        return prev;
      }
      return [...prev, candidateId];
    });
  };

  const openComparison = () => {
    if (selectedForCompare.length < 2) {
      alert('Please select at least 2 candidates to compare');
      return;
    }
    setShowComparison(true);
  };

  // =============================================
  // INITIAL LOAD
  // =============================================
  useEffect(() => {
    fetchCandidates();
    fetchShortlist();
  }, []);

  // =============================================
  // HANDLE FILTER CHANGES
  // =============================================
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchCandidates();
  };

  // =============================================
  // REFRESH DATA
  // =============================================
  const refreshData = async () => {
    setRefreshing(true);
    await fetchCandidates();
    await fetchShortlist();
    setRefreshing(false);
  };

  // =============================================
  // RENDER HELPER FUNCTIONS
  // =============================================
  const getScoreColor = (score) => {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'badge-success',
      active: 'badge-primary',
      new: 'badge-secondary'
    };
    return badges[status] || 'badge-secondary';
  };

  const getStatusLabel = (status) => {
    const labels = {
      completed: '✅ Completed',
      active: '🔄 Active',
      new: '🆕 New'
    };
    return labels[status] || status;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="recruiter-dashboard py-4">
      <div className="container">
        {/* Header */}
        <div className="recruiter-header">
          <div className="row align-items-center">
            <div className="col-md-7">
              <h1>👔 Recruiter Workspace</h1>
              <p className="text-muted mb-0">
                Review candidate performance, AI rankings, and interview analytics.
              </p>
            </div>
            <div className="col-md-5 text-md-end">
              <button 
                className="btn btn-outline-primary rounded-pill px-4 me-2"
                onClick={() => setShowShortlist(!showShortlist)}
              >
                <i className="fas fa-star me-2"></i>
                Shortlist ({shortlist.length})
              </button>
              <button 
                className="btn btn-primary rounded-pill px-4"
                onClick={refreshData}
                disabled={refreshing}
              >
                <i className={`fas ${refreshing ? 'fa-spinner fa-spin' : 'fa-sync-alt'} me-2`}></i>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* ============================================= */}
          {/* NEW: Tab Navigation */}
          {/* ============================================= */}
          <div className="recruiter-tabs mt-4">
            <button 
              className={`recruiter-tab ${activeTab === 'candidates' ? 'active' : ''}`}
              onClick={() => setActiveTab('candidates')}
            >
              <i className="fas fa-users"></i> Candidates
            </button>
            <button 
              className={`recruiter-tab ${activeTab === 'skills' ? 'active' : ''}`}
              onClick={() => setActiveTab('skills')}
            >
              <i className="fas fa-chart-bar"></i> Skills Analytics
            </button>
            <button 
              className={`recruiter-tab ${activeTab === 'trends' ? 'active' : ''}`}
              onClick={() => setActiveTab('trends')}
            >
              <i className="fas fa-chart-line"></i> Trends
            </button>
          </div>
        </div>

        {/* ============================================= */}
        {/* CANDIDATES TAB */}
        {/* ============================================= */}
        {activeTab === 'candidates' && (
          <>
            {/* Summary Stats */}
            <div className="recruiter-stats-grid">
              <div className="recruiter-stat-card">
                <div className="stat-label">Total Candidates</div>
                <div className="stat-number">{summary.totalCandidates || 0}</div>
                <div className="stat-change">
                  <i className="fas fa-users me-1"></i> 
                  {summary.newCandidates || 0} new
                </div>
              </div>
              <div className="recruiter-stat-card">
                <div className="stat-label">Active Sessions</div>
                <div className="stat-number">{summary.activeCandidates || 0}</div>
                <div className="stat-change">
                  <i className="fas fa-clock me-1"></i> In progress
                </div>
              </div>
              <div className="recruiter-stat-card">
                <div className="stat-label">Completed Interviews</div>
                <div className="stat-number">{summary.completedInterviews || 0}</div>
                <div className="stat-change">
                  <i className="fas fa-check-circle me-1"></i> 
                  {summary.completedCandidates || 0} candidates
                </div>
              </div>
              <div className="recruiter-stat-card">
                <div className="stat-label">Average Score</div>
                <div className="stat-number">{summary.averageScore || 0}%</div>
                <div className="stat-change">
                  <i className="fas fa-trophy me-1"></i> Overall
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="card shadow-soft mb-4">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="search-box">
                      <i className="fas fa-search"></i>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search candidates by name or email..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <select 
                      className="form-select"
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="completed">Completed</option>
                      <option value="active">Active</option>
                      <option value="new">New</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <select 
                      className="form-select"
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    >
                      <option value="avg_score">Sort by Score</option>
                      <option value="total_interviews">Sort by Interviews</option>
                      <option value="name">Sort by Name</option>
                      <option value="joined_date">Sort by Joined Date</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <button 
                      className="btn btn-primary w-100"
                      onClick={applyFilters}
                    >
                      <i className="fas fa-filter me-2"></i>
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Shortlist Panel */}
            {showShortlist && shortlist.length > 0 && (
              <div className="card shadow-soft mb-4 border border-warning">
                <div className="card-header bg-warning bg-opacity-10">
                  <h5 className="mb-0">
                    <i className="fas fa-star text-warning me-2"></i>
                    Shortlisted Candidates ({shortlist.length})
                  </h5>
                </div>
                <div className="card-body">
                  <div className="shortlist-grid">
                    {shortlist.map(item => (
                      <div key={item.candidateId} className="shortlist-item">
                        <div className="shortlist-avatar">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="shortlist-info">
                          <div className="shortlist-name">{item.name}</div>
                          <div className="shortlist-score">Score: {item.avgScore}%</div>
                          <div className="shortlist-actions">
                            <button 
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => {
                                setShowShortlist(false);
                                fetchCandidateDetails(item.candidateId);
                              }}
                            >
                              <i className="fas fa-eye"></i> View
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => toggleShortlist(item.candidateId)}
                            >
                              <i className="fas fa-times"></i> Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Candidate Table */}
            <div className="card shadow-sm">
              <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center py-3">
                <h5 className="mb-0">
                  <i className="fas fa-users text-primary me-2"></i>
                  🏆 Candidate Performance Dashboard
                </h5>
                <div className="d-flex gap-2 align-items-center">
                  {/* NEW: Compare Button */}
                  {selectedForCompare.length > 0 && (
                    <button 
                      className="btn btn-sm btn-success rounded-pill"
                      onClick={openComparison}
                    >
                      <i className="fas fa-balance-scale me-1"></i>
                      Compare ({selectedForCompare.length})
                    </button>
                  )}
                  <span className="badge bg-success bg-opacity-10 text-success px-3 py-2">
                    {summary.completedCandidates || 0} Completed
                  </span>
                  <span className="badge bg-warning bg-opacity-10 text-warning px-3 py-2">
                    {summary.activeCandidates || 0} Active
                  </span>
                  <span className="badge bg-secondary bg-opacity-10 text-secondary px-3 py-2">
                    {summary.newCandidates || 0} New
                  </span>
                </div>
              </div>
              <div className="card-body p-0">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2 text-muted">Loading candidates...</p>
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <p className="text-muted">No candidates found. Start interviews to see data here.</p>
                    {filters.search && (
                      <button 
                        className="btn btn-outline-primary"
                        onClick={() => {
                          setFilters({ ...filters, search: '' });
                          fetchCandidates();
                        }}
                      >
                        Clear Search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table candidate-table mb-0">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Candidate</th>
                          <th>Interviews</th>
                          <th>Avg Score</th>
                          <th>Highest</th>
                          <th>Status</th>
                          <th>Shortlist</th>
                          {/* NEW: Compare Column */}
                          <th>Compare</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.map((candidate, index) => {
                          const isShortlisted = shortlist.some(s => s.candidateId === candidate.id);
                          
                          return (
                            <tr key={candidate.id}>
                              <td>
                                <span className="rank-badge">#{index + 1}</span>
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <div className="candidate-avatar">
                                    {candidate.name?.charAt(0).toUpperCase() || '?'}
                                  </div>
                                  <div>
                                    <div className="fw-medium">{candidate.name}</div>
                                    <div className="text-muted small">{candidate.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div>
                                  <span className="fw-medium">{candidate.totalInterviews || 0}</span>
                                  <span className="text-muted small">
                                    ({candidate.completedInterviews || 0} completed)
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className={`match-score ${getScoreColor(candidate.avgScore)}`}>
                                  {candidate.avgScore || 0}%
                                </span>
                              </td>
                              <td>
                                <span className="match-score high">
                                  {candidate.highestScore || 0}%
                                </span>
                              </td>
                              <td>
                                <span className={`status-badge recruiter ${getStatusBadge(candidate.status)}`}>
                                  {getStatusLabel(candidate.status)}
                                </span>
                              </td>
                              <td>
                                <button 
                                  className={`btn btn-sm ${isShortlisted ? 'btn-warning' : 'btn-outline-secondary'}`}
                                  onClick={() => toggleShortlist(candidate.id)}
                                  title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                                >
                                  <i className={`fas ${isShortlisted ? 'fa-star' : 'fa-star'}`}></i>
                                </button>
                              </td>
                              {/* NEW: Compare Checkbox */}
                              <td>
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={selectedForCompare.includes(candidate.id)}
                                    onChange={() => toggleCompareSelection(candidate.id)}
                                    id={`compare-${candidate.id}`}
                                  />
                                </div>
                              </td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-outline-primary rounded-pill"
                                  onClick={() => fetchCandidateDetails(candidate.id)}
                                >
                                  <i className="fas fa-eye me-1"></i> View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ============================================= */}
        {/* NEW: SKILLS ANALYTICS TAB */}
        {/* ============================================= */}
        {activeTab === 'skills' && (
          <div className="card shadow-sm mb-4">
            <RecruiterSkillsAnalytics />
          </div>
        )}

        {/* ============================================= */}
        {/* NEW: TRENDS TAB */}
        {/* ============================================= */}
        {activeTab === 'trends' && (
          <div className="card shadow-sm mb-4">
            <RecruiterTrends />
          </div>
        )}

        {/* ============================================= */}
        {/* NEW: COMPARISON MODAL */}
        {/* ============================================= */}
        {showComparison && (
          <CandidateComparison 
            candidateIds={selectedForCompare}
            onClose={() => {
              setShowComparison(false);
              setSelectedForCompare([]);
            }}
          />
        )}

        {/* Candidate Details Modal */}
        {selectedCandidate && (
          <div className="modal-overlay" onClick={() => setSelectedCandidate(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📄 Candidate Profile</h3>
                <button className="btn-close" onClick={() => setSelectedCandidate(null)}>×</button>
              </div>
              <div className="modal-body">
                {loadingDetails ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2 text-muted">Loading candidate details...</p>
                  </div>
                ) : candidateDetails ? (
                  <>
                    {/* Candidate Info */}
                    <div className="candidate-profile-header">
                      <div className="profile-avatar">
                        {candidateDetails.candidate.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="profile-info">
                        <h4>{candidateDetails.candidate.name}</h4>
                        <p className="text-muted">{candidateDetails.candidate.email}</p>
                        <div className="profile-meta">
                          <span className="meta-tag">
                            <i className="fas fa-calendar me-1"></i>
                            Joined {formatDate(candidateDetails.candidate.joinedAt)}
                          </span>
                          <span className="meta-tag">
                            <i className="fas fa-file-alt me-1"></i>
                            {candidateDetails.stats.totalInterviews} interviews
                          </span>
                          <span className={`meta-tag ${candidateDetails.summary.rating === 'Excellent' ? 'rating-excellent' : ''}`}>
                            <i className="fas fa-star me-1"></i>
                            {candidateDetails.summary.rating}
                          </span>
                        </div>
                      </div>
                      <div className="profile-score">
                        <div className="score-circle">
                          <span className="score-number">{candidateDetails.stats.avgScore}</span>
                          <span className="score-label">Avg Score</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="candidate-stats-grid">
                      <div className="stat-item">
                        <span className="stat-label">Total Interviews</span>
                        <span className="stat-value">{candidateDetails.stats.totalInterviews}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Completed</span>
                        <span className="stat-value">{candidateDetails.stats.completedInterviews}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Highest Score</span>
                        <span className="stat-value">{candidateDetails.stats.highestScore}%</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Active Sessions</span>
                        <span className="stat-value">{candidateDetails.stats.activeSessions}</span>
                      </div>
                    </div>

                    {/* Skill Breakdown */}
                    {candidateDetails.skills && (
                      <div className="skill-breakdown">
                        <h5>🎯 Skill Breakdown</h5>
                        <div className="skill-grid">
                          {Object.entries(candidateDetails.skills).map(([key, value]) => {
                            // Handle both {average, count} object and plain number
                            const score = typeof value === 'object' ? (value.average || 0) : (value || 0);
                            const count = typeof value === 'object' ? (value.count || 0) : 0;
                            
                            return (
                              <div key={key} className="skill-item">
                                <div className="skill-header">
                                  <span className="skill-name">
                                    {key.charAt(0).toUpperCase() + key.slice(1)}
                                  </span>
                                  <span className="skill-score">{score}%</span>
                                </div>
                                <div className="progress-bar">
                                  <div 
                                    className="progress-fill" 
                                    style={{ 
                                      width: `${score}%`,
                                      background: score >= 70 ? '#22c55e' : 
                                                 score >= 50 ? '#f59e0b' : '#ef4444'
                                    }}
                                  />
                                </div>
                                {count > 0 && (
                                  <div className="skill-meta">
                                    <span className="text-muted small">
                                      Based on {count} interview{count !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Interview History */}
                    {candidateDetails.interviews && candidateDetails.interviews.length > 0 && (
                      <div className="interview-history">
                        <h5>📋 Interview History</h5>
                        <div className="table-responsive">
                          <table className="table table-sm">
                            <thead>
                              <tr>
                                <th>Type</th>
                                <th>Domain</th>
                                <th>Difficulty</th>
                                <th>Score</th>
                                <th>Status</th>
                                <th>Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {candidateDetails.interviews.slice(0, 10).map((interview, idx) => (
                                <tr key={idx}>
                                  <td>
                                    <span className="badge type-badge">
                                      {interview.type === 'tr' ? 'Technical' :
                                       interview.type === 'mr' ? 'Managerial' :
                                       interview.type === 'hr' ? 'HR' : interview.type}
                                    </span>
                                  </td>
                                  <td>{interview.domain || 'N/A'}</td>
                                  <td>
                                    <span className={`badge difficulty-badge ${interview.difficulty}`}>
                                      {interview.difficulty}
                                    </span>
                                  </td>
                                  <td>
                                    {interview.score ? (
                                      <span className={`fw-bold ${interview.score >= 70 ? 'text-success' : interview.score >= 50 ? 'text-warning' : 'text-danger'}`}>
                                        {interview.score}%
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td>
                                    <span className={`badge status-badge ${interview.status === 'completed' ? 'badge-completed' : ''}`}>
                                      {interview.status}
                                    </span>
                                  </td>
                                  <td className="text-muted small">
                                    {formatDate(interview.createdAt)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted">No candidate data available</p>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => setSelectedCandidate(null)}
                >
                  Close
                </button>
                {candidateDetails && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      const isShortlisted = shortlist.some(s => s.candidateId === selectedCandidate);
                      toggleShortlist(selectedCandidate);
                    }}
                  >
                    <i className={`fas ${shortlist.some(s => s.candidateId === selectedCandidate) ? 'fa-star' : 'fa-star-o'} me-2`}></i>
                    {shortlist.some(s => s.candidateId === selectedCandidate) ? 'Remove from Shortlist' : 'Add to Shortlist'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="text-center text-muted small mt-4">
          © 2026 SmartHire AI · Recruiter Dashboard
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
        .shortlist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 12px;
        }
        .shortlist-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
        }
        .shortlist-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #4f46e5;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          flex-shrink: 0;
        }
        .shortlist-info {
          flex: 1;
        }
        .shortlist-name {
          font-weight: 600;
          color: #1f2937;
        }
        .shortlist-score {
          font-size: 0.85rem;
          color: #6b7280;
        }
        .shortlist-actions {
          display: flex;
          gap: 4px;
          margin-top: 4px;
        }
        .candidate-profile-header {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .profile-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #4f46e5;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .profile-info {
          flex: 1;
        }
        .profile-info h4 {
          margin: 0;
          color: #1f2937;
        }
        .profile-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }
        .meta-tag {
          font-size: 0.75rem;
          padding: 2px 10px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          color: #6b7280;
        }
        .meta-tag.rating-excellent {
          background: #d1fae5;
          color: #065f46;
          border-color: #22c55e;
        }
        .profile-score .score-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: 3px solid #4f46e5;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: white;
        }
        .profile-score .score-number {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          line-height: 1;
        }
        .profile-score .score-label {
          font-size: 0.6rem;
          color: #6b7280;
        }
        .candidate-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat-item {
          background: #f8fafc;
          padding: 12px;
          border-radius: 8px;
          text-align: center;
        }
        .stat-item .stat-label {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .stat-item .stat-value {
          display: block;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
        }
        .skill-breakdown {
          margin-bottom: 20px;
        }
        .skill-breakdown h5 {
          margin-bottom: 12px;
        }
        .skill-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .skill-item {
          background: #f8fafc;
          padding: 12px;
          border-radius: 8px;
        }
        .skill-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
        }
        .skill-name {
          color: #374151;
        }
        .skill-score {
          font-weight: 600;
        }
        .skill-meta {
          margin-top: 4px;
        }
        .interview-history {
          margin-top: 16px;
        }
        .interview-history h5 {
          margin-bottom: 12px;
        }
        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        @media (max-width: 768px) {
          .candidate-profile-header {
            flex-direction: column;
            text-align: center;
          }
          .candidate-stats-grid {
            grid-template-columns: 1fr 1fr;
          }
          .skill-grid {
            grid-template-columns: 1fr;
          }
          .profile-meta {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default RecruiterDashboard;