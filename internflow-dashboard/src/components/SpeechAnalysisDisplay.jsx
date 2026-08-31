import React from 'react';
import '../styles/SpeechAnalysisDisplay.css';

const SpeechAnalysisDisplay = ({ analysis, onClose }) => {
  if (!analysis) return null;

  const { overallScore, summary, pace, filler, grammar, pronunciation } = analysis;

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreEmoji = (score) => {
    if (score >= 80) return '🌟';
    if (score >= 60) return '👍';
    if (score >= 40) return '📈';
    return '🔄';
  };

  return (
    <div className="speech-analysis-container">
      <div className="analysis-header">
        <h4>📊 Communication Quality Assessment</h4>
        <button className="analysis-close-btn" onClick={onClose}>×</button>
      </div>
      
      {/* Overall Score */}
      <div className="analysis-overall-score">
        <div className="score-circle" style={{ borderColor: getScoreColor(overallScore) }}>
          <span className="score-number">{overallScore}</span>
          <span className="score-label">Overall</span>
        </div>
        <div className="score-summary">
          <p>{getScoreEmoji(overallScore)} {summary}</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        {/* Pace */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">🏃</span>
            <span className="metric-title">Speech Pace</span>
          </div>
          <div className="metric-value">
            {pace.wpm > 0 ? `${pace.wpm} WPM` : 'N/A'}
          </div>
          <div className="metric-status">
            <span className={`status-badge ${pace.pace?.toLowerCase().replace(' ', '-')}`}>
              {pace.pace || 'No data'}
            </span>
          </div>
          <div className="metric-suggestion">{pace.suggestion}</div>
        </div>

        {/* Filler Words */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">🗣️</span>
            <span className="metric-title">Filler Words</span>
          </div>
          <div className="metric-value">
            {filler.totalFillerCount || 0}
          </div>
          <div className="metric-status">
            <span className="status-badge" style={{ 
              backgroundColor: filler.score >= 80 ? '#d1fae5' : filler.score >= 60 ? '#fef3c7' : '#fce4ec',
              color: filler.score >= 80 ? '#065f46' : filler.score >= 60 ? '#92400e' : '#dc2626'
            }}>
              {filler.fillerPercentage || 0}%
            </span>
          </div>
          <div className="metric-suggestion">{filler.suggestion}</div>
          {filler.fillerWords && filler.fillerWords.length > 0 && (
            <div className="filler-details">
              {filler.fillerWords.slice(0, 3).map((fw, idx) => (
                <span key={idx} className="filler-tag">"{fw.word}" × {fw.count}</span>
              ))}
            </div>
          )}
        </div>

        {/* Grammar */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">📝</span>
            <span className="metric-title">Grammar</span>
          </div>
          <div className="metric-value">
            {grammar.score}%
          </div>
          <div className="metric-suggestion">{grammar.suggestion}</div>
          {grammar.issues && grammar.issues.length > 0 && (
            <div className="grammar-issues">
              {grammar.issues.slice(0, 3).map((issue, idx) => (
                <div key={idx} className="issue-item">
                  <span className="issue-type">{issue.type.replace('_', ' ')}</span>
                  <span className="issue-count">× {issue.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pronunciation */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">🔊</span>
            <span className="metric-title">Pronunciation</span>
          </div>
          <div className="metric-value">
            {pronunciation.score}%
          </div>
          <div className="metric-suggestion">{pronunciation.suggestion}</div>
        </div>
      </div>
    </div>
  );
};

export default SpeechAnalysisDisplay;