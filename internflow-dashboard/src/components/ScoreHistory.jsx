// ScoreHistory.jsx - FIXED VERSION

import React, { useEffect, useState } from 'react';
import './ScoreHistory.css';

// ✅ Move helper functions OUTSIDE the component (not on prototype)
const getScoreCategory = (score) => {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Average';
  if (score >= 40) return 'Needs Improvement';
  return 'Poor';
};

const getRatingClass = (score) => {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'average';
  if (score >= 40) return 'improvement';
  return 'poor';
};

const ScoreHistory = ({ scores = [] }) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (scores && scores.length > 0) {
      processScoreData();
    }
  }, [scores]);

  const processScoreData = () => {
    const sorted = [...scores].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
    setChartData(sorted);
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#4CAF50';
    if (score >= 75) return '#8BC34A';
    if (score >= 60) return '#FFC107';
    if (score >= 40) return '#FF9800';
    return '#F44336';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    });
  };

  const calculateAverage = () => {
    if (!chartData || chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, item) => acc + item.score, 0);
    return (sum / chartData.length).toFixed(2);
  };

  const getProgress = () => {
    if (!chartData || chartData.length < 2) return 'N/A';

    const firstScore = chartData[0].score;
    const lastScore = chartData[chartData.length - 1].score;
    const diff = lastScore - firstScore;

    if (diff > 0) return `+${diff.toFixed(2)}`;
    if (diff < 0) return `${diff.toFixed(2)}`;
    return 'No change';
  };

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return <p className="no-data">No score history available</p>;
    }

    return (
      <div className="chart-container">
        <div className="chart-wrapper">
          <div className="y-axis-labels">
            <div className="y-label">100</div>
            <div className="y-label">75</div>
            <div className="y-label">50</div>
            <div className="y-label">25</div>
            <div className="y-label">0</div>
          </div>

          <div className="chart-area">
            <div className="grid-lines">
              {[0, 25, 50, 75, 100].map((value) => (
                <div
                  key={value}
                  className="grid-line"
                  style={{ bottom: `${value}%` }}
                />
              ))}
            </div>

            <div className="bars-container">
              {chartData.map((item, index) => (
                <div key={index} className="bar-wrapper">
                  <div
                    className="bar"
                    style={{
                      height: `${item.score}%`,
                      backgroundColor: getScoreColor(item.score)
                    }}
                    title={`Score: ${item.score}`}
                  >
                    <span className="bar-value">{item.score.toFixed(1)}</span>
                  </div>
                  <div className="bar-label">
                    <div className="bar-date">{formatDate(item.created_at)}</div>
                    <div className="bar-type">{item.interview_type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="score-history-container">
        <h2 className="history-title">📈 Score History</h2>
        <p className="no-data">No interview history available yet</p>
      </div>
    );
  }

  return (
    <div className="score-history-container">
      <div className="history-header">
        <h2 className="history-title">📈 Score History</h2>
        <div className="history-stats">
          <div className="stat">
            <span className="stat-label">Attempts:</span>
            <span className="stat-value">{chartData.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Average:</span>
            <span className="stat-value">{calculateAverage()}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Highest:</span>
            <span className="stat-value">
              {Math.max(...chartData.map(d => d.score)).toFixed(1)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Latest Progress:</span>
            <span className={`stat-value ${getProgress().includes('+') ? 'positive' : ''}`}>
              {getProgress()}
            </span>
          </div>
        </div>
      </div>

      {renderChart()}

      <div className="history-table">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Type</th>
              <th>Domain</th>
              <th>Score</th>
              <th>Rating</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((item, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{formatDate(item.created_at)}</td>
                <td>
                  <span className="type-badge">
                    {item.interview_type === 'tr' ? 'Technical'
                      : item.interview_type === 'mr' ? 'Managerial'
                      : 'HR'}
                  </span>
                </td>
                <td>{item.domain}</td>
                <td>
                  <span
                    className="score-cell"
                    style={{ color: getScoreColor(item.score) }}
                  >
                    {item.score.toFixed(1)}
                  </span>
                </td>
                <td>
                  <span className={`rating-badge rating-${getRatingClass(item.score)}`}>
                    {getScoreCategory(item.score)}
                  </span>
                </td>
                <td>{item.status || 'Completed'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScoreHistory;