import React, { useState, useEffect } from 'react';
import '../styles/MLAnalysisDashboard.css';

const MLAnalysisDashboard = ({ analysis, isActive }) => {
  const [history, setHistory] = useState([]);
  const [latestAnalysis, setLatestAnalysis] = useState(null);

  // Update history when new analysis comes in
  useEffect(() => {
    if (analysis) {
      setLatestAnalysis(analysis);
      setHistory(prev => {
        const newHistory = [analysis, ...prev].slice(0, 20);
        return newHistory;
      });
    }
  }, [analysis]);

  if (!isActive) return null;

  const getScoreColor = (score) => {
    if (score >= 70) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getStatusEmoji = (level) => {
    if (level === 'Nervous') return '😬';
    if (level === 'Scared') return '😰';
    if (level === 'Confused') return '🤔';
    return '✅';
  };

  const getEyeContactStatus = (isLooking) => {
    return isLooking ? '✅ Looking at camera' : '⚠️ Looking away';
  };

  const getEyeContactColor = (isLooking) => {
    return isLooking ? '#22c55e' : '#f59e0b';
  };

  const avgConfidence = history.length > 0
    ? Math.round(history.reduce((sum, h) => sum + (h.confidence || 0), 0) / history.length)
    : 0;

  const eyeContactCount = history.filter(h => h.eyeContact === true).length;
  const eyeContactPercentage = history.length > 0
    ? Math.round((eyeContactCount / history.length) * 100)
    : 0;

  const attentionScore = latestAnalysis ? Math.min(100, Math.max(0, Number(latestAnalysis.attention || latestAnalysis.confidence || 0))) : 0;
  const engagementScore = latestAnalysis ? Math.min(100, Math.max(0, Number(latestAnalysis.engagement || latestAnalysis.confidence || 0))) : 0;
  const overallPerformance = latestAnalysis
    ? Math.round((Number(latestAnalysis.confidence || 0) + attentionScore + engagementScore) / 3)
    : 0;

  return (
    <div className="ml-analysis-dashboard">
      <div className="ml-analysis-header">
        <div>
          <span className="analysis-eyebrow">INTERVIEW COACH</span>
          <h3>Live performance</h3>
        </div>
        <span className={`status-badge ${isActive ? 'is-live' : 'is-paused'}`}>
          <span className="status-dot" /> {isActive ? 'Monitoring' : 'Paused'}
        </span>
      </div>

      <div className="ml-analysis-grid">
        <div className="analysis-card score-card">
          <div className="score-circle" style={{ borderColor: getScoreColor(overallPerformance) }}>
            <span className="score-number">{overallPerformance}</span>
            <span className="score-label">Overall</span>
          </div>
          <div className="score-details">
            <div className="score-row">
              <span>Current</span>
              <span className="score-value" style={{ color: getScoreColor(latestAnalysis?.confidence || 0) }}>
                {latestAnalysis?.confidence || 0}%
              </span>
            </div>
            <div className="score-row">
              <span>Attention</span>
              <span className="score-value" style={{ color: getScoreColor(attentionScore) }}>
                {attentionScore}%
              </span>
            </div>
            <div className="score-row">
              <span>Engagement</span>
              <span className="score-value" style={{ color: getScoreColor(engagementScore) }}>
                {engagementScore}%
              </span>
            </div>
          </div>
        </div>

        <div className="analysis-card">
          <h4 className="card-title">Confidence</h4>
          <div className="confidence-display">
            <span className="confidence-emoji">{getStatusEmoji(latestAnalysis?.class)}</span>
            <span className="confidence-level" style={{ color: getScoreColor(latestAnalysis?.confidence || 0) }}>
              {latestAnalysis?.class || 'Calibrating'}
            </span>
          </div>
          <div className="confidence-bar">
            <div 
              className="confidence-fill" 
              style={{ 
                width: `${latestAnalysis?.confidence || 0}%`,
                background: getScoreColor(latestAnalysis?.confidence || 0)
              }}
            />
          </div>
          <div className="confidence-stats">
            <span>{latestAnalysis ? `${latestAnalysis.confidence || 0}% current confidence` : 'Preparing your first reading'}</span>
          </div>
        </div>

        <div className="analysis-card">
          <h4 className="card-title">Eye contact</h4>
          <div className="eye-contact-display">
            <span className="eye-contact-status" style={{ color: getEyeContactColor(latestAnalysis?.eyeContact) }}>
              {latestAnalysis?.eyeContact !== undefined
                ? (latestAnalysis.eyeContact ? 'On camera' : 'Look toward the camera')
                : 'Calibrating'}
            </span>
          </div>
          <div className="eye-contact-stats">
            <div className="stat-row">
              <span>Session consistency</span>
              <span className="stat-value">{latestAnalysis?.eyeContactPercentage ?? eyeContactPercentage}%</span>
            </div>
            <div className="stat-row">
              <span>Head position</span>
              <span className="stat-value">{latestAnalysis?.headDirection === 'center' ? 'Centered' : 'Adjusting'}</span>
            </div>
          </div>
        </div>

        <div className="analysis-card">
          <h4 className="card-title">Focus & engagement</h4>
          <div className="attention-metrics">
            <div className="metric-item">
              <span className="metric-label">Attention</span>
              <span className="metric-value" style={{ color: getScoreColor(attentionScore) }}>{attentionScore}%</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Engagement</span>
              <span className="metric-value" style={{ color: getScoreColor(engagementScore) }}>
                {engagementScore}%
              </span>
            </div>
          </div>
          <p className="behavior-summary">{latestAnalysis?.behaviorSummary || 'Your live behavior summary will appear here.'}</p>
        </div>
      </div>

      {latestAnalysis && !latestAnalysis.hasFace && (
        <div className="warning-banner">
          <span>⚠️ Face not detected. Please keep your face centered in front of the camera.</span>
        </div>
      )}
    </div>
  );
};

export default MLAnalysisDashboard;