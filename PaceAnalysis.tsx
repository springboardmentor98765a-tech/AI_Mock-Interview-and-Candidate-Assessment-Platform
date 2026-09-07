import React from 'react';
import { PaceAnalysis as PaceType } from '../../types/speech';

interface PaceAnalysisProps {
  pace: PaceType;
}

export const PaceAnalysis: React.FC<PaceAnalysisProps> = ({ pace }) => {
  const getPaceColor = (cat: string) => {
    switch (cat) {
      case 'Normal': return 'var(--accent-success)';
      case 'Slow':
      case 'Fast': return 'var(--accent-warning)';
      default: return 'var(--accent-danger)';
    }
  };

  return (
    <div className="pace-card glass-card">
      <div className="card-header-flex">
        <h4>⚡ Speech Pace (WPM)</h4>
        <span className="badge" style={{ backgroundColor: getPaceColor(pace.category), color: '#000' }}>
          {pace.category}
        </span>
      </div>

      <div className="wpm-display-large">
        <span className="wpm-val">{pace.wpm}</span>
        <span className="wpm-unit">Words / Min</span>
      </div>

      <div className="pace-gauge-track">
        <div className="gauge-zone very-slow" title="<100 WPM: Very Slow"></div>
        <div className="gauge-zone slow" title="100-119 WPM: Slow"></div>
        <div className="gauge-zone normal active-zone" title="120-160 WPM: Ideal"></div>
        <div className="gauge-zone fast" title="161-180 WPM: Fast"></div>
        <div className="gauge-zone very-fast" title=">180 WPM: Very Fast"></div>
      </div>
      <div className="gauge-labels">
        <span>0</span>
        <span>100</span>
        <span>120 (Ideal) 160</span>
        <span>180+</span>
      </div>

      <div className="recommendation-box">
        💡 {pace.recommendation}
      </div>
    </div>
  );
};
