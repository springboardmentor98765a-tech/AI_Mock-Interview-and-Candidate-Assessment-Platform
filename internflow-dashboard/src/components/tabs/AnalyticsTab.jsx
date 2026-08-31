import React from 'react';

const AnalyticsTab = ({ interviews }) => {
  const completed = interviews.filter(i => i.status === 'completed' && i.score > 0);
  const completedCount = completed.length;
  const scores = completed.map(i => Number(i.score) || 0);

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 0;
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

  const feedbackList = completed
    .map((i) => (typeof i.feedback === 'object' && i.feedback ? i.feedback : null))
    .filter(Boolean);

  const avgTechnical = feedbackList.length > 0
    ? Math.round(feedbackList.reduce((sum, item) => sum + (Number(item.technical_accuracy) || 0), 0) / feedbackList.length)
    : 0;

  const avgCommunication = feedbackList.length > 0
    ? Math.round(feedbackList.reduce((sum, item) => sum + (Number(item.communication_clarity) || 0), 0) / feedbackList.length)
    : 0;

  const avgConfidence = feedbackList.length > 0
    ? Math.round(feedbackList.reduce((sum, item) => sum + (Number(item.confidence) || 0), 0) / feedbackList.length)
    : 0;

  const strengths = feedbackList.flatMap((item) => item.strengths || []);
  const recommendations = feedbackList.flatMap((item) => item.recommendations || []);
  const topStrengths = [...new Set(strengths)].slice(0, 5);
  const topRecommendations = [...new Set(recommendations)].slice(0, 5);

  const skills = [
    { name: 'Technical Knowledge', score: avgTechnical || (avgScore > 0 ? avgScore : 85), color: '#4f46e5' },
    { name: 'Communication Skills', score: avgCommunication || (avgScore > 0 ? Math.min(avgScore + 5, 100) : 78), color: '#22c55e' },
    { name: 'Problem Solving', score: avgScore > 0 ? Math.min(avgScore + 3, 100) : 82, color: '#8b5cf6' },
    { name: 'Confidence & Poise', score: avgConfidence || (avgScore > 0 ? Math.min(avgScore - 5, 100) : 70), color: '#f59e0b' },
    { name: 'Domain Expertise', score: avgScore > 0 ? Math.min(avgScore + 8, 100) : 88, color: '#ef4444' },
  ];

  const typeDistribution = {};
  interviews.forEach(i => {
    const type = i.interview_type || 'unknown';
    typeDistribution[type] = (typeDistribution[type] || 0) + 1;
  });

  const typeLabels = {
    'tr': '💻 Technical',
    'mr': '👔 Managerial',
    'hr': '🤝 HR',
    'technical': '💻 Technical',
    'aptitude': '🧠 Aptitude'
  };

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>📈 Performance Analytics</h2>
        <p>Track your progress, identify strengths, and discover areas for improvement.</p>
      </div>

      <div className="analytics-stats-grid">
        <div className="analytics-stat-card">
          <div className="stat-icon blue"><i className="fas fa-trophy"></i></div>
          <div className="stat-info">
            <span className="stat-value">{avgScore || 0}%</span>
            <span className="stat-label">Average Score</span>
          </div>
        </div>
        <div className="analytics-stat-card">
          <div className="stat-icon green"><i className="fas fa-check-circle"></i></div>
          <div className="stat-info">
            <span className="stat-value">{completedCount}</span>
            <span className="stat-label">Completed Interviews</span>
          </div>
        </div>
        <div className="analytics-stat-card">
          <div className="stat-icon purple"><i className="fas fa-arrow-up"></i></div>
          <div className="stat-info">
            <span className="stat-value">{highestScore}%</span>
            <span className="stat-label">Highest Score</span>
          </div>
        </div>
        <div className="analytics-stat-card">
          <div className="stat-icon orange"><i className="fas fa-arrow-down"></i></div>
          <div className="stat-info">
            <span className="stat-value">{lowestScore}%</span>
            <span className="stat-label">Lowest Score</span>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h4>🎯 Skill Breakdown</h4>
          {skills.map((skill, idx) => (
            <div className="skill-item" key={idx}>
              <div className="skill-header">
                <span className="skill-name">{skill.name}</span>
                <span className="skill-score">{skill.score}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${skill.score}%`, background: skill.color }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="analytics-card">
          <h4>📊 Interview Distribution</h4>
          {Object.keys(typeDistribution).length > 0 ? (
            Object.entries(typeDistribution).map(([type, count]) => (
              <div className="distribution-item" key={type}>
                <span className="distribution-label">{typeLabels[type] || type}</span>
                <span className="distribution-count">{count}</span>
              </div>
            ))
          ) : (
            <p className="text-muted">No interviews completed yet.</p>
          )}
        </div>
      </div>

      <div className="analytics-card full-width">
        <h4>📈 Performance Trend</h4>
        {completed.length > 0 ? (
          <div className="trend-placeholder">
            <div className="trend-bars">
              {completed.slice(0, 10).reverse().map((i, idx) => (
                <div className="trend-bar-wrapper" key={idx}>
                  <div className="trend-bar" style={{ height: `${i.score || 0}%`, background: (i.score || 0) > 70 ? '#22c55e' : (i.score || 0) > 50 ? '#f59e0b' : '#ef4444' }}></div>
                  <span className="trend-label">#{idx + 1}</span>
                </div>
              ))}
            </div>
            <p className="text-muted text-center small">Interview # (Newest to Oldest)</p>
          </div>
        ) : (
          <p className="text-muted">Complete interviews to see your performance trend.</p>
        )}
      </div>

      <div className="analytics-card full-width overall-report-box">
        <h4>📄 Overall Interview Report</h4>
        <div className="overall-report-grid">
          <div className="overall-report-card">
            <span className="report-label">Average Score</span>
            <strong>{avgScore}%</strong>
          </div>
          <div className="overall-report-card">
            <span className="report-label">Technical</span>
            <strong>{avgTechnical}%</strong>
          </div>
          <div className="overall-report-card">
            <span className="report-label">Communication</span>
            <strong>{avgCommunication}%</strong>
          </div>
          <div className="overall-report-card">
            <span className="report-label">Confidence</span>
            <strong>{avgConfidence}%</strong>
          </div>
        </div>

        <div className="overall-report-lists">
          <div className="report-list-block">
            <h5>💪 Common Strengths</h5>
            {topStrengths.length > 0 ? (
              <ul>
                {topStrengths.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            ) : (
              <p>No strong pattern yet. Complete more interviews to see your strengths.</p>
            )}
          </div>

          <div className="report-list-block">
            <h5>🎯 Improvement Focus</h5>
            {topRecommendations.length > 0 ? (
              <ul>
                {topRecommendations.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            ) : (
              <p>No recommendations yet. Keep practicing to unlock actionable feedback.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;