import React from 'react';
import { PauseAnalysis as PauseType } from '../../types/speech';

interface PauseAnalysisProps {
  pauses: PauseType;
}

export const PauseAnalysis: React.FC<PauseAnalysisProps> = ({ pauses }) => {
  return (
    <div className="pause-card glass-card">
      <div className="card-header-flex">
        <h4>⏸️ Pause & Silence Dynamics</h4>
        <span className="score-badge good">
          {pauses.silence_percentage}% Silence
        </span>
      </div>

      <div className="mini-metrics-grid">
        <div className="metric-cell">
          <span className="label">Total Pauses</span>
          <span className="val">{pauses.count}</span>
        </div>
        <div className="metric-cell">
          <span className="label">Avg Duration</span>
          <span className="val">{pauses.average_duration}s</span>
        </div>
        <div className="metric-cell">
          <span className="label">Longest Pause</span>
          <span className="val">{pauses.longest_duration}s</span>
        </div>
        <div className="metric-cell">
          <span className="label">Total Silence</span>
          <span className="val">{pauses.total_silence_duration}s</span>
        </div>
      </div>

      {/* Visual Speech -> Pause Timeline */}
      <div style={{ marginTop: '1.25rem' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          Audio Flow Timeline (Speech vs Pauses):
        </label>
        <div className="timeline-bar-wrapper">
          {pauses.timeline.map((seg, i) => (
            <div
              key={i}
              className={`timeline-segment ${seg.type}`}
              style={{ flex: Math.max(1, seg.duration) }}
              title={`${seg.type === 'speech' ? '🗣️ Speech' : '⏸️ Pause'}: ${seg.start}s - ${seg.end}s (${seg.duration}s)`}
            >
              {seg.duration >= 1.0 ? `${seg.duration}s` : ''}
            </div>
          ))}
        </div>
        <div className="timeline-legend">
          <span className="legend-item"><span className="dot speech"></span> Speech</span>
          <span className="legend-item"><span className="dot pause"></span> Pause / Silence</span>
        </div>
      </div>
    </div>
  );
};
