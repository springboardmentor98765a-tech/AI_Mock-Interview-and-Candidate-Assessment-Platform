// internflow-dashboard/src/components/PerformanceSummary.jsx
import React, { useState, useEffect } from 'react';
import './PerformanceSummary.css';

const PerformanceSummary = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5001/api/notifications/summary?timeRange=${timeRange}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [timeRange]);

  const getScoreColor = (score) => {
    if (score >= 85) return '#22c55e';
    if (score >= 70) return '#84cc16';
    if (score >= 55) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  const getRatingEmoji = (rating) => {
    const emojis = {
      'Excellent': '🌟',
      'Good': '👍',
      'Average': '📈',
      'Needs Improvement': '🔄',
      'Poor': '⚠️'
    };
    return emojis[rating] || '📊';
  };

  if (loading) {
    return (
      <div className="summary-loading">
        <div className="spinner"></div>
        <p>Loading performance summary...</p>
      </div>
    );
  }

  if (!summary || summary.totalInterviews === 0) {
    return (
      <div className="summary-empty">
        <i className="fas fa-chart-line"></i>
        <h3>No Performance Data Yet</h3>
        <p>Complete some interviews to see your performance summary.</p>
      </div>
    );
  }

  return (
    <div className="performance-summary">
      <div className="summary-header">
        <div>
          <h2>📊 Performance Summary</h2>
          <p>Your overall interview performance at a glance</p>
        </div>
        <div className="time-range-selector">
          <button className={timeRange === '30d' ? 'active' : ''} onClick={() => setTimeRange('30d')}>30D</button>
          <button className={timeRange === '90d' ? 'active' : ''} onClick={() => setTimeRange('90d')}>90D</button>
          <button className={timeRange === 'all' ? 'active' : ''} onClick={() => setTimeRange('all')}>All</button>
        </div>
      </div>

      {/* Overall Score Card */}
      <div className="overall-card">
        <div className="overall-score-circle" style={{ borderColor: getScoreColor(summary.averageScore) }}>
          <span className="score-number" style={{ color: getScoreColor(summary.averageScore) }}>
            {summary.averageScore}
          </span>
          <span className="score-max">/100</span>
        </div>
        <div className="overall-info">
          <h3>
            {getRatingEmoji(summary.performanceRating)} {summary.performanceRating}
          </h3>
          <p>Based on {summary.totalInterviews} completed interview{summary.totalInterviews !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><i className="fas fa-file-alt"></i></div>
          <div className="stat-content">
            <span className="stat-value">{summary.totalInterviews}</span>
            <span className="stat-label">Total Interviews</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><i className="fas fa-arrow-up"></i></div>
          <div className="stat-content">
            <span className="stat-value">{summary.highestScore}%</span>
            <span className="stat-label">Highest Score</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><i className="fas fa-arrow-down"></i></div>
          <div className="stat-content">
            <span className="stat-value">{summary.lowestScore}%</span>
            <span className="stat-label">Lowest Score</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><i className="fas fa-chart-line"></i></div>
          <div className="stat-content">
            <span className="stat-value">{summary.averageScore}%</span>
            <span className="stat-label">Average Score</span>
          </div>
        </div>
      </div>

      {/* Skill Breakdown */}
{summary.skillBreakdown && (
  <div className="skills-section">
    <h3>🎯 Skill Breakdown</h3>
    <div className="skills-grid">
      {Object.entries(summary.skillBreakdown).map(([skill, data]) => {
        // Handle both formats: {average, count} or plain number
        const score = typeof data === 'object' ? (data.average || 0) : (data || 0);
        const count = typeof data === 'object' ? (data.count || 0) : 0;
        
        return (
          <div key={skill} className="skill-card">
            <div className="skill-header">
              <span className="skill-name">
                {skill.charAt(0).toUpperCase() + skill.slice(1)}
              </span>
              <span className="skill-score" style={{ color: getScoreColor(score) }}>
                {score}%
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${score}%`,
                  background: getScoreColor(score)
                }}
              ></div>
            </div>
            {count > 0 && (
              <div className="skill-count">
                Based on {count} interview{count !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
)}

      {/* Recommendations */}
      {summary.recommendations && summary.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h3>🎯 Recommendations</h3>
          <ul className="recommendations-list">
            {summary.recommendations.map((rec, idx) => (
              <li key={idx}>
                <i className="fas fa-lightbulb"></i>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent Interviews */}
      {summary.recentInterviews && summary.recentInterviews.length > 0 && (
        <div className="recent-section">
          <h3>📋 Recent Interviews</h3>
          <div className="recent-list">
            {summary.recentInterviews.map((interview, idx) => (
              <div key={idx} className="recent-item">
                <div className="recent-info">
                  <span className="recent-type">{interview.type}</span>
                  <span className="recent-domain">{interview.domain}</span>
                </div>
                <span className="recent-score" style={{ color: getScoreColor(interview.score) }}>
                  {interview.score}%
                </span>
                <span className="recent-date">
                  {new Date(interview.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceSummary;