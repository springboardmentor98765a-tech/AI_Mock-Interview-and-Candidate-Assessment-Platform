// internflow-dashboard/src/components/CandidateComparison.jsx
import React, { useState, useEffect } from 'react';
import './CandidateComparison.css';

const CandidateComparison = ({ candidateIds, onClose }) => {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchComparison();
  }, [candidateIds]);

  const fetchComparison = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/recruiter-analytics/compare', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ candidateIds })
      });

      const data = await response.json();

      if (data.success) {
        setComparison(data.data);
      } else {
        setError(data.error || 'Failed to compare candidates');
      }
    } catch (err) {
      console.error('Comparison error:', err);
      setError('Failed to load comparison');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return '#22c55e';
    if (score >= 70) return '#84cc16';
    if (score >= 55) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  const renderWinnerBadge = (winnerId, candidateId) => {
    if (winnerId === candidateId) {
      return <span className="winner-badge">🏆</span>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="comparison-modal-overlay" onClick={onClose}>
        <div className="comparison-modal" onClick={(e) => e.stopPropagation()}>
          <div className="comparison-loading">
            <div className="spinner"></div>
            <p>Comparing candidates...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="comparison-modal-overlay" onClick={onClose}>
        <div className="comparison-modal" onClick={(e) => e.stopPropagation()}>
          <div className="comparison-error">
            <i className="fas fa-exclamation-triangle"></i>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  if (!comparison) return null;

  const { candidates, winners } = comparison;

  return (
    <div className="comparison-modal-overlay" onClick={onClose}>
      <div className="comparison-modal" onClick={(e) => e.stopPropagation()}>
        <div className="comparison-header">
          <h2>⚖️ Candidate Comparison</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="comparison-body">
          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th className="metric-column">Metric</th>
                  {candidates.map(c => (
                    <th key={c.id} className="candidate-column">
                      <div className="candidate-header">
                        <div className="candidate-avatar">
                          {c.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="candidate-info">
                          <div className="candidate-name">{c.name}</div>
                          <div className="candidate-email">{c.email}</div>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Overall Rating */}
                <tr className="section-row">
                  <td colSpan={candidates.length + 1}>📊 Overall Performance</td>
                </tr>
                <tr>
                  <td className="metric-label">Average Score</td>
                  {candidates.map(c => (
                    <td key={c.id} className="metric-value">
                      <div className="value-with-badge">
                        <span style={{ color: getScoreColor(c.avgScore), fontWeight: 700, fontSize: '1.2rem' }}>
                          {c.avgScore}%
                        </span>
                        {renderWinnerBadge(winners.avgScore, c.id)}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="metric-label">Highest Score</td>
                  {candidates.map(c => (
                    <td key={c.id} className="metric-value">
                      <div className="value-with-badge">
                        <span style={{ color: getScoreColor(c.highestScore) }}>
                          {c.highestScore}%
                        </span>
                        {renderWinnerBadge(winners.highestScore, c.id)}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="metric-label">Total Interviews</td>
                  {candidates.map(c => (
                    <td key={c.id} className="metric-value">
                      <div className="value-with-badge">
                        <span>{c.totalInterviews}</span>
                        {renderWinnerBadge(winners.totalInterviews, c.id)}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="metric-label">Completed</td>
                  {candidates.map(c => (
                    <td key={c.id} className="metric-value">{c.completedInterviews}</td>
                  ))}
                </tr>
                <tr>
                  <td className="metric-label">Overall Rating</td>
                  {candidates.map(c => (
                    <td key={c.id} className="metric-value">
                      <span className={`rating-badge rating-${c.overallRating.toLowerCase().replace(' ', '-')}`}>
                        {c.overallRating}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Skill Breakdown */}
                <tr className="section-row">
                  <td colSpan={candidates.length + 1}>🎯 Skill Breakdown</td>
                </tr>
                {['communication', 'confidence', 'technical', 'professionalism'].map(skill => (
                  <tr key={skill}>
                    <td className="metric-label">
                      {skill.charAt(0).toUpperCase() + skill.slice(1)}
                    </td>
                    {candidates.map(c => {
                      const score = c.skills[skill] || 0;
                      return (
                        <td key={c.id} className="metric-value">
                          <div className="skill-value-wrapper">
                            <div className="skill-bar-container">
                              <div 
                                className="skill-bar-fill"
                                style={{ 
                                  width: `${score}%`,
                                  background: getScoreColor(score)
                                }}
                              ></div>
                            </div>
                            <div className="skill-value-row">
                              <span style={{ color: getScoreColor(score), fontWeight: 600 }}>
                                {score}%
                              </span>
                              {renderWinnerBadge(winners[skill], c.id)}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Verdict */}
          <div className="comparison-verdict">
            <h3>🎯 Verdict</h3>
            <div className="verdict-content">
              {(() => {
                const winner = candidates.reduce((max, c) => 
                  c.avgScore > (max?.avgScore || 0) ? c : max, null
                );
                return (
                  <div className="winner-announcement">
                    <div className="winner-trophy">🏆</div>
                    <div className="winner-text">
                      <strong>{winner?.name}</strong> leads with an average score of{' '}
                      <strong style={{ color: getScoreColor(winner?.avgScore || 0) }}>
                        {winner?.avgScore}%
                      </strong>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateComparison;