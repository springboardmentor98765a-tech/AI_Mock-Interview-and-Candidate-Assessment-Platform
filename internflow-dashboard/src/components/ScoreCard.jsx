import React from 'react';
import './ScoreCard.css';

/**
 * ScoreCard Component
 * Displays a single dimension score with breakdown details
 */
const ScoreCard = ({ 
  title, 
  score, 
  category, 
  details = {},
  breakdown = {}
}) => {
  const getScoreColor = (score) => {
    if (score >= 90) return '#4CAF50'; // Green
    if (score >= 75) return '#8BC34A'; // Light Green
    if (score >= 60) return '#FFC107'; // Yellow
    if (score >= 40) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getScoreCategory = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Average';
    if (score >= 40) return 'Needs Improvement';
    return 'Poor';
  };

  const renderBreakdown = () => {
    if (!breakdown || Object.keys(breakdown).length === 0) return null;

    return (
      <div className="breakdown-details">
        {Object.entries(breakdown).map(([key, value]) => (
          <div key={key} className="breakdown-item">
            <span className="breakdown-label">{key.replace('_', ' ')}:</span>
            <span className="breakdown-value">{typeof value === 'number' ? value.toFixed(2) : value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="score-card">
      <div className="score-header">
        <h3 className="score-title">{title}</h3>
        <div className="score-badge" style={{ backgroundColor: getScoreColor(score) }}>
          {score.toFixed(1)}
        </div>
      </div>

      <div className="score-category">{getScoreCategory(score)}</div>

      <div className="score-bar-container">
        <div className="score-bar-background">
          <div 
            className="score-bar-fill" 
            style={{
              width: `${Math.min(score, 100)}%`,
              backgroundColor: getScoreColor(score)
            }}
          />
        </div>
      </div>

      {renderBreakdown()}

      {details && Object.keys(details).length > 0 && (
        <div className="details-section">
          <h4>Details:</h4>
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className="detail-item">
              <span>{key.replace('_', ' ')}:</span>
              <span className="detail-value">
                {typeof value === 'number' ? value.toFixed(2) : value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScoreCard;
