import React, { useState, useEffect } from 'react';
import '../styles/RecruiterDashboard.css';

const RecruiterDashboard = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [interviews, setInterviews] = useState([]);
  
  // =============================================
  // STEP 2: ADD SELECTED CANDIDATE STATE
  // =============================================
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalInterviews: 0,
    completedInterviews: 0,
    shortlisted: 0,
    avgScore: 0,
    highestScore: 0,
    lowestScore: 0
  });

  const [searchTerm, setSearchTerm] = useState('');

  // =============================================
  // STEP 3: VIEW CANDIDATE DETAILS FUNCTION
  // =============================================
  const viewCandidateDetails = (candidate) => {
    setSelectedCandidate(candidate);
  };

  // Fetch all users (candidates) and their interviews
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all interviews
      const interviewsResponse = await fetch('http://localhost:5001/api/interviews', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!interviewsResponse.ok) {
        throw new Error('Failed to fetch interviews');
      }
      
      const interviewsData = await interviewsResponse.json();
      console.log('📊 All interviews:', interviewsData);
      
      // Process the data
      processInterviewData(interviewsData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processInterviewData = (interviewsData) => {
    // Group interviews by user
    const userMap = {};
    let totalScore = 0;
    let scoreCount = 0;
    let highestScore = 0;
    let lowestScore = 100;
    let completedCount = 0;

    interviewsData.forEach(interview => {
      const userId = interview.user_id;
      
      if (!userMap[userId]) {
        userMap[userId] = {
          id: userId,
          name: `Candidate ${userId}`,
          email: `candidate${userId}@example.com`,
          interviews: [],
          completedInterviews: 0,
          avgScore: 0,
          highestScore: 0,
          latestStatus: 'pending'
        };
      }

      userMap[userId].interviews.push(interview);
      
      if (interview.status === 'completed' && interview.score) {
        userMap[userId].completedInterviews++;
        completedCount++;
        
        const score = interview.score;
        totalScore += score;
        scoreCount++;
        
        if (score > highestScore) highestScore = score;
        if (score < lowestScore) lowestScore = score;
        if (score > userMap[userId].highestScore) {
          userMap[userId].highestScore = score;
        }
      }
      
      if (interview.status === 'in_progress' || interview.status === 'pending') {
        userMap[userId].latestStatus = interview.status;
      }
    });

    const candidatesArray = Object.values(userMap).map(user => {
      const completedScores = user.interviews
        .filter(i => i.status === 'completed' && i.score)
        .map(i => i.score);
      
      user.avgScore = completedScores.length > 0 
        ? Math.round(completedScores.reduce((a, b) => a + b, 0) / completedScores.length) 
        : 0;
      
      return user;
    });

    setStats({
      totalCandidates: candidatesArray.length,
      totalInterviews: interviewsData.length,
      completedInterviews: completedCount,
      shortlisted: candidatesArray.filter(c => c.avgScore >= 70).length,
      avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
      highestScore: highestScore,
      lowestScore: lowestScore < 100 ? lowestScore : 0
    });

    setCandidates(candidatesArray);
    setInterviews(interviewsData);
  };

  const getStatusClass = (status) => {
    return status.toLowerCase().replace(' ', '-');
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'paused': return '⏸️';
      case 'pending': return '⏳';
      case 'ended': return '⏹️';
      default: return '📌';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  };

  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="recruiter-dashboard py-4">
      <div className="container">
        {/* Header */}
        <div className="recruiter-header">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1>📊 Recruiter Workspace</h1>
              <p className="text-muted mb-0">
                Review candidate performance, AI rankings, and interview analytics.
              </p>
            </div>
            <div className="col-md-4 text-md-end">
              <button 
                className="btn btn-primary rounded-pill px-4"
                onClick={fetchAllData}
                disabled={loading}
              >
                <i className="fas fa-sync-alt me-2"></i> 
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="recruiter-stats-grid">
          <div className="recruiter-stat-card">
            <div className="stat-label">Total Candidates</div>
            <div className="stat-number">{stats.totalCandidates}</div>
            <div className="stat-change">
              <i className="fas fa-users me-1"></i> Active candidates
            </div>
          </div>
          <div className="recruiter-stat-card">
            <div className="stat-label">Total Interviews</div>
            <div className="stat-number">{stats.totalInterviews}</div>
            <div className="stat-change">
              <i className="fas fa-check-circle me-1"></i> {stats.completedInterviews} completed
            </div>
          </div>
          <div className="recruiter-stat-card">
            <div className="stat-label">Average Score</div>
            <div className="stat-number">{stats.avgScore}%</div>
            <div className="stat-change">
              <i className="fas fa-trophy me-1"></i> Highest: {stats.highestScore}%
            </div>
          </div>
          <div className="recruiter-stat-card">
            <div className="stat-label">Shortlisted</div>
            <div className="stat-number">{stats.shortlisted}</div>
            <div className="stat-change">
              <i className="fas fa-star me-1"></i> {stats.totalCandidates > 0 ? Math.round((stats.shortlisted / stats.totalCandidates) * 100) : 0}% conversion
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="card shadow-soft mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-8">
                <div className="recruiter-search-box">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search candidates by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-4">
                <select className="form-select" style={{ borderRadius: '12px' }}>
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Candidate Table */}
        <div className="card shadow-sm">
          <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center py-3">
            <h5 className="mb-0">
              <i className="fas fa-users text-primary me-2"></i>
              🏆 Candidate Performance Dashboard
            </h5>
            <div className="d-flex gap-2">
              <span className="badge bg-success bg-opacity-10 text-success px-3 py-2">
                {stats.completedInterviews} Completed
              </span>
              <span className="badge bg-warning bg-opacity-10 text-warning px-3 py-2">
                {stats.totalInterviews - stats.completedInterviews} Pending
              </span>
            </div>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted">Loading candidate data...</p>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center py-5">
                <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                <p className="text-muted">No candidates found. Start interviews to see data here.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table candidate-table mb-0">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Candidate</th>
                      <th>Email</th>
                      <th>Interviews</th>
                      <th>Avg Score</th>
                      <th>Highest Score</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates
                      .sort((a, b) => b.avgScore - a.avgScore)
                      .map((candidate, index) => (
                        <tr key={candidate.id}>
                          <td>
                            <span className="rank-badge">#{index + 1}</span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="candidate-avatar">
                                {candidate.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="fw-medium">{candidate.name}</span>
                            </div>
                          </td>
                          <td>{candidate.email}</td>
                          <td>{candidate.interviews.length}</td>
                          <td>
                            <span className={`match-score ${getScoreColor(candidate.avgScore)}`}>
                              {candidate.avgScore}%
                            </span>
                          </td>
                          <td>
                            <span className="match-score high">
                              {candidate.highestScore}%
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge recruiter ${getStatusClass(candidate.latestStatus)}`}>
                              {getStatusIcon(candidate.latestStatus)} {candidate.latestStatus}
                            </span>
                          </td>
                          <td>
                            {/* STEP 3: View button calls viewCandidateDetails */}
                            <button 
                              className="btn btn-sm btn-outline-primary rounded-pill"
                              onClick={() => viewCandidateDetails(candidate)}
                            >
                              <i className="fas fa-eye me-1"></i> View
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* STEP 2 & 3: Candidate Details Modal */}
        {selectedCandidate && (
          <div className="modal-overlay" onClick={() => setSelectedCandidate(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📄 Candidate Details</h3>
                <button className="btn-close" onClick={() => setSelectedCandidate(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Name</span>
                    <span className="detail-value">{selectedCandidate.name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{selectedCandidate.email}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Total Interviews</span>
                    <span className="detail-value">{selectedCandidate.interviews.length}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Average Score</span>
                    <span className="detail-value">{selectedCandidate.avgScore}%</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Highest Score</span>
                    <span className="detail-value">{selectedCandidate.highestScore}%</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className="detail-value">{selectedCandidate.latestStatus}</span>
                  </div>
                </div>

                <h4 className="mt-3">📋 Interview History</h4>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Domain</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCandidate.interviews.map((interview, idx) => (
                        <tr key={idx}>
                          <td>{interview.interview_type}</td>
                          <td>{interview.domain}</td>
                          <td>{interview.status}</td>
                          <td>{interview.score ? `${interview.score}%` : '-'}</td>
                          <td>{new Date(interview.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center text-muted small mt-4">
          © 2026 AI Mock Interview Platform · Recruiter Dashboard
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;