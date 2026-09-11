// internflow-dashboard/src/components/RecruiterTrends.jsx
import React, { useState, useEffect } from 'react';
import './RecruiterTrends.css';

const RecruiterTrends = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchTrends();
  }, [timeRange]);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5001/api/recruiter-analytics/trends?timeRange=${timeRange}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const result = await response.json();
      if (result.success) setData(result.data);
    } catch (err) {
      console.error('Error:', err);
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
      <div className="trends-loading">
        <div className="spinner"></div>
        <p>Loading trends...</p>
      </div>
    );
  }

  if (!data) {
    return <div className="trends-empty">No trend data available</div>;
  }

  const { dailyTrends, topPerformers, domainPerformance, typePerformance } = data;

  // Calculate max interviews for chart scaling
  const maxInterviews = Math.max(...dailyTrends.map(d => d.interviews), 1);

  return (
    <div className="recruiter-trends">
      <div className="trends-header">
        <h3>📈 Performance Trends</h3>
        <div className="time-range-selector">
          <button className={timeRange === '7d' ? 'active' : ''} onClick={() => setTimeRange('7d')}>7D</button>
          <button className={timeRange === '30d' ? 'active' : ''} onClick={() => setTimeRange('30d')}>30D</button>
          <button className={timeRange === '90d' ? 'active' : ''} onClick={() => setTimeRange('90d')}>90D</button>
        </div>
      </div>

      <div className="trends-grid">
        {/* Daily Activity Chart */}
        <div className="trend-card full-width">
          <h4>📊 Daily Interview Activity</h4>
          {dailyTrends.length > 0 ? (
            <>
              <div className="activity-chart">
                {dailyTrends.map((day, idx) => (
                  <div key={idx} className="activity-bar-wrapper">
                    <div className="activity-bar-container">
                      <div 
                        className="activity-bar"
                        style={{ 
                          height: `${(day.interviews / maxInterviews) * 100}%`,
                          background: `linear-gradient(180deg, ${getScoreColor(day.avgScore)}, ${getScoreColor(day.avgScore)}80)`
                        }}
                        title={`${day.interviews} interviews, avg ${day.avgScore}%`}
                      >
                        <span className="activity-count">{day.interviews}</span>
                      </div>
                    </div>
                    <div className="activity-date">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="activity-score" style={{ color: getScoreColor(day.avgScore) }}>
                      {day.avgScore}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="chart-legend">
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: '#4f46e5' }}></span>
                  Interview Count
                </span>
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: '#22c55e' }}></span>
                  Avg Score %
                </span>
              </div>
            </>
          ) : (
            <p className="no-data">No activity data for this period</p>
          )}
        </div>

        {/* Top Performers */}
        <div className="trend-card">
          <h4>🏆 Top Performers</h4>
          {topPerformers.length > 0 ? (
            <div className="top-performers-trend-list">
              {topPerformers.map((performer, idx) => (
                <div key={performer.id} className="performer-trend-item">
                  <div className="performer-rank-trend">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </div>
                  <div className="performer-info">
                    <div className="performer-name">{performer.name}</div>
                    <div className="performer-meta">
                      {performer.interviewCount} interviews
                    </div>
                  </div>
                  <div className="performer-score-trend" style={{ color: getScoreColor(performer.avgScore) }}>
                    {performer.avgScore}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No top performers yet</p>
          )}
        </div>

        {/* Domain Performance */}
        <div className="trend-card">
          <h4>💼 Domain Performance</h4>
          {domainPerformance.length > 0 ? (
            <div className="domain-list">
              {domainPerformance.map((domain, idx) => (
                <div key={idx} className="domain-item">
                  <div className="domain-name">{domain.domain}</div>
                  <div className="domain-bar-container">
                    <div 
                      className="domain-bar"
                      style={{ 
                        width: `${domain.avgScore}%`,
                        background: getScoreColor(domain.avgScore)
                      }}
                    ></div>
                  </div>
                  <div className="domain-stats">
                    <span style={{ color: getScoreColor(domain.avgScore), fontWeight: 600 }}>
                      {domain.avgScore}%
                    </span>
                    <span className="domain-count">{domain.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No domain data</p>
          )}
        </div>

        {/* Type Performance */}
        <div className="trend-card">
          <h4>🎯 Interview Type Performance</h4>
          {typePerformance.length > 0 ? (
            <div className="type-list">
              {typePerformance.map((type, idx) => {
                const typeLabels = { tr: '💻 Technical', mr: '👔 Managerial', hr: '🤝 HR' };
                return (
                  <div key={idx} className="type-item">
                    <div className="type-name">{typeLabels[type.type] || type.type}</div>
                    <div className="type-bar-container">
                      <div 
                        className="type-bar"
                        style={{ 
                          width: `${type.avgScore}%`,
                          background: getScoreColor(type.avgScore)
                        }}
                      ></div>
                    </div>
                    <div className="type-stats">
                      <span style={{ color: getScoreColor(type.avgScore), fontWeight: 600 }}>
                        {type.avgScore}%
                      </span>
                      <span className="type-count">{type.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="no-data">No type data</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecruiterTrends;