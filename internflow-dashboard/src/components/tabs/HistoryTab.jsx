import React from 'react';

const HistoryTab = ({ interviews, viewInterviewDetails, selectedInterview, closeDetails, getStatusBadge }) => {
  const getTypeLabel = (type) => {
    const labels = {
      'tr': '💻 Technical',
      'mr': '👔 Managerial',
      'hr': '🤝 HR'
    };
    return labels[type] || type;
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diff = Math.floor((end - start) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'paused': return '⏸️';
      case 'ended': return '⏹️';
      default: return '⏳';
    }
  };

  // =============================================
  // SUBMISSION TYPE HELPERS
  // =============================================
  const getSubmissionTypeLabel = (submissionType) => {
    if (!submissionType) return '✅ Completed';
    if (submissionType === 'partial') return '⚠️ Terminated (Partial)';
    if (submissionType === 'full') return '✅ Completed';
    return '✅ Completed';
  };

  const getSubmissionTypeClass = (submissionType) => {
    if (!submissionType) return 'completed';
    if (submissionType === 'partial') return 'partial';
    if (submissionType === 'full') return 'completed';
    return 'completed';
  };

  return (
    <div className="tab-content">
      <div className="tab-header">
        <div className="header-left">
          <h2>📋 Interview History</h2>
          <p>View all your past interview sessions and their detailed feedback.</p>
        </div>
        <button className="btn btn-outline-secondary btn-sm">
          <i className="fas fa-file-export"></i> Export CSV
        </button>
      </div>

      <div className="history-container">
        {interviews.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-inbox"></i>
            <h4>No Interviews Yet</h4>
            <p>Start your first voice interview to track your progress here.</p>
            <button className="btn btn-primary">Start Interview</button>
          </div>
        ) : (
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Round</th>
                  <th>Domain</th>
                  <th>Difficulty</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Duration</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map((interview) => (
                  <tr key={interview.id}>
                    <td><span className="badge type-badge">{getTypeLabel(interview.interview_type)}</span></td>
                    <td>{interview.domain}</td>
                    <td>
                      <span className={`badge difficulty-badge ${interview.difficulty}`}>
                        {interview.difficulty === 'easy' ? '⭐ Easy' :
                         interview.difficulty === 'medium' ? '⭐⭐ Medium' :
                         '⭐⭐⭐ Hard'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge status-badge ${getStatusBadge(interview.status)}`}>
                        {getStatusIcon(interview.status)} {interview.status}
                      </span>
                      {interview.status === 'completed' && (
                        <span className={`badge submission-type ${getSubmissionTypeClass(interview.submission_type)}`}>
                          {getSubmissionTypeLabel(interview.submission_type)}
                        </span>
                      )}
                    </td>
                    <td>
                      {interview.score ? (
                        <span className={`score-display ${interview.score >= 70 ? 'high' : interview.score >= 50 ? 'medium' : 'low'}`}>
                          {interview.score}%
                        </span>
                      ) : (
                        <span className="score-display na">-</span>
                      )}
                    </td>
                    <td>
                      {formatDuration(interview.start_time, interview.end_time)}
                    </td>
                    <td>{formatDate(interview.created_at)}</td>
                    <td>
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => viewInterviewDetails(interview)}
                      >
                        <i className="fas fa-eye"></i> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interview Details Modal */}
      {selectedInterview && (
        <div className="modal-overlay" onClick={closeDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📄 Interview Details</h3>
              <button className="btn-close" onClick={closeDetails}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Round</span>
                  <span className="detail-value">{getTypeLabel(selectedInterview.interview_type)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Domain</span>
                  <span className="detail-value">{selectedInterview.domain}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Difficulty</span>
                  <span className="detail-value">{selectedInterview.difficulty}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">
                    {getStatusIcon(selectedInterview.status)} {selectedInterview.status}
                    {selectedInterview.status === 'completed' && (
                      <span className={`badge submission-type ${getSubmissionTypeClass(selectedInterview.submission_type)}`}>
                        {getSubmissionTypeLabel(selectedInterview.submission_type)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Score</span>
                  <span className="detail-value">{selectedInterview.score ? `${selectedInterview.score}%` : 'Not completed'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Duration</span>
                  <span className="detail-value">{formatDuration(selectedInterview.start_time, selectedInterview.end_time)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Started</span>
                  <span className="detail-value">{selectedInterview.start_time ? formatDate(selectedInterview.start_time) : 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Ended</span>
                  <span className="detail-value">{selectedInterview.end_time ? formatDate(selectedInterview.end_time) : 'N/A'}</span>
                </div>
              </div>
              
              {/* AI Feedback */}
              {selectedInterview.feedback && (
                <div className="feedback-section">
                  <h4>📝 AI Feedback</h4>
                  {typeof selectedInterview.feedback === 'string' ? (
                    <p>{selectedInterview.feedback}</p>
                  ) : (
                    <div className="feedback-details">
                      <div className="feedback-scores">
                        <div className="score-item">
                          <span className="score-label">Overall Score:</span>
                          <span className="score-value">{selectedInterview.feedback.overall_score || selectedInterview.score}%</span>
                        </div>
                        {selectedInterview.feedback.technical_accuracy && (
                          <div className="score-item">
                            <span className="score-label">Technical Accuracy:</span>
                            <span className="score-value">{selectedInterview.feedback.technical_accuracy}%</span>
                          </div>
                        )}
                        {selectedInterview.feedback.communication_clarity && (
                          <div className="score-item">
                            <span className="score-label">Communication:</span>
                            <span className="score-value">{selectedInterview.feedback.communication_clarity}%</span>
                          </div>
                        )}
                        {selectedInterview.feedback.confidence && (
                          <div className="score-item">
                            <span className="score-label">Confidence:</span>
                            <span className="score-value">{selectedInterview.feedback.confidence}%</span>
                          </div>
                        )}
                        {selectedInterview.feedback.submission_type && (
                          <div className="score-item">
                            <span className="score-label">Submission Type:</span>
                            <span className="score-value" style={{ textTransform: 'capitalize' }}>
                              {selectedInterview.feedback.submission_type === 'partial' ? '⚠️ Partial (Terminated)' : '✅ Full'}
                            </span>
                          </div>
                        )}
                      </div>

                      {selectedInterview.feedback.technical_summary && (
                        <div className="feedback-item">
                          <strong>Technical Summary:</strong>
                          <p>{selectedInterview.feedback.technical_summary}</p>
                        </div>
                      )}
                      {selectedInterview.feedback.communication_summary && (
                        <div className="feedback-item">
                          <strong>Communication Summary:</strong>
                          <p>{selectedInterview.feedback.communication_summary}</p>
                        </div>
                      )}

                      {selectedInterview.feedback.strengths && selectedInterview.feedback.strengths.length > 0 && (
                        <div className="feedback-item">
                          <strong>💪 Strengths:</strong>
                          <ul>
                            {selectedInterview.feedback.strengths.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedInterview.feedback.improvements && selectedInterview.feedback.improvements.length > 0 && (
                        <div className="feedback-item">
                          <strong>📈 Areas for Improvement:</strong>
                          <ul>
                            {selectedInterview.feedback.improvements.map((imp, i) => (
                              <li key={i}>{imp}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedInterview.feedback.recommendations && selectedInterview.feedback.recommendations.length > 0 && (
                        <div className="feedback-item">
                          <strong>🎯 Recommendations:</strong>
                          <ul>
                            {selectedInterview.feedback.recommendations.map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedInterview.feedback.final_verdict && (
                        <div className="feedback-item verdict">
                          <strong>🎯 Final Verdict:</strong>
                          <p>{selectedInterview.feedback.final_verdict}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Questions and Answers */}
              {selectedInterview.questions && selectedInterview.questions.length > 0 && (
                <div className="questions-section">
                  <h4>📋 Questions & Answers</h4>
                  <div className="questions-list">
                    {selectedInterview.questions.map((q, idx) => (
                      <div className="qa-item" key={idx}>
                        <div className="question">
                          <strong>Q{idx + 1}:</strong> {q.question}
                        </div>
                        {selectedInterview.feedback?.question_scores && selectedInterview.feedback.question_scores[idx] && (
                          <div className="question-score">
                            Score: {selectedInterview.feedback.question_scores[idx].score}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryTab;