// internflow-dashboard/src/components/RecruiterSkillsAnalytics.jsx
import React, { useState, useEffect } from 'react';
import './RecruiterSkillsAnalytics.css';

const RecruiterSkillsAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSkillsAnalytics();
  }, []);

  const fetchSkillsAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/recruiter-analytics/skills-overview', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load skills analytics');
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

  if (loading) {
    return (
      <div className="skills-loading">
        <div className="spinner"></div>
        <p>Loading skills analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="skills-error">
        <i className="fas fa-exclamation-triangle"></i>
        <p>{error || 'No data available'}</p>
      </div>
    );
  }

  const { candidates, overall, topPerformers, totalCandidates } = data;

  if (totalCandidates === 0) {
    return (
      <div className="skills-empty">
        <i className="fas fa-chart-bar"></i>
        <p>No candidate data available yet</p>
      </div>
    );
  }

  const skills = [
    { key: 'communication', label: 'Communication', icon: '💬', color: '#4f46e5' },
    { key: 'confidence', label: 'Confidence', icon: '💪', color: '#f59e0b' },
    { key: 'technical', label: 'Technical', icon: '🧠', color: '#22c55e' },
    { key: 'professionalism', label: 'Professionalism', icon: '👔', color: '#ef4444' }
  ];

  return (
    <div className="recruiter-skills-analytics">
      <div className="analytics-header">
        <h3>🎯 Skill-Wise Analytics</h3>
        <p>Aggregate skill performance across {totalCandidates} candidate{totalCandidates !== 1 ? 's' : ''}</p>
      </div>

      {/* Overall Averages */}
      <div className="overall-skills-grid">
        {skills.map(skill => {
          const score = overall[skill.key] || 0;
          return (
            <div key={skill.key} className="overall-skill-card">
              <div className="skill-card-icon" style={{ background: `${skill.color}20`, color: skill.color }}>
                {skill.icon}
              </div>
              <div className="skill-card-content">
                <div className="skill-card-label">{skill.label}</div>
                <div className="skill-card-score" style={{ color: getScoreColor(score) }}>
                  {score}%
                </div>
                <div className="skill-progress-bar">
                  <div 
                    className="skill-progress-fill"
                    style={{ 
                      width: `${score}%`,
                      background: skill.color
                    }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Performers per Skill */}
      <div className="top-performers-section">
        <h4>🏆 Top Performers by Skill</h4>
        <div className="top-performers-grid">
          {skills.map(skill => (
            <div key={skill.key} className="top-performer-card">
              <div className="top-performer-header">
                <span className="skill-icon-small">{skill.icon}</span>
                <span className="skill-name-small">{skill.label}</span>
              </div>
              <div className="top-performer-list">
                {(topPerformers[skill.key] || []).map((performer, idx) => (
                  <div key={performer.id} className="performer-item">
                    <span className="performer-rank">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="performer-name">{performer.name}</span>
                    <span 
                      className="performer-score"
                      style={{ color: getScoreColor(performer.score) }}
                    >
                      {performer.score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Candidates Table */}
      <div className="candidates-skills-table-section">
        <h4>📋 All Candidates by Skill</h4>
        <div className="table-wrapper">
          <table className="skills-comparison-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Candidate</th>
                <th>💬 Communication</th>
                <th>💪 Confidence</th>
                <th>🧠 Technical</th>
                <th>👔 Professionalism</th>
                <th>Average</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c, idx) => {
                const avg = Math.round(
                  (c.skills.communication + c.skills.confidence + c.skills.technical + c.skills.professionalism) / 4
                );
                return (
                  <tr key={c.id}>
                    <td className="rank-cell">#{idx + 1}</td>
                    <td>
                      <div className="candidate-cell">
                        <div className="candidate-avatar-sm">
                          {c.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="candidate-name-sm">{c.name}</div>
                          <div className="candidate-email-sm">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: getScoreColor(c.skills.communication), fontWeight: 600 }}>
                        {c.skills.communication}%
                      </span>
                    </td>
                    <td>
                      <span style={{ color: getScoreColor(c.skills.confidence), fontWeight: 600 }}>
                        {c.skills.confidence}%
                      </span>
                    </td>
                    <td>
                      <span style={{ color: getScoreColor(c.skills.technical), fontWeight: 600 }}>
                        {c.skills.technical}%
                      </span>
                    </td>
                    <td>
                      <span style={{ color: getScoreColor(c.skills.professionalism), fontWeight: 600 }}>
                        {c.skills.professionalism}%
                      </span>
                    </td>
                    <td>
                      <span className="avg-score" style={{ color: getScoreColor(avg) }}>
                        {avg}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecruiterSkillsAnalytics;