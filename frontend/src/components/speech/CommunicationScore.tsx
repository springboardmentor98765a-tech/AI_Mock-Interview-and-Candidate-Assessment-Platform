import React from 'react';
import { CommunicationScore as CommScoreType } from '../../types/speech';

interface CommunicationScoreProps {
  score: CommScoreType;
}

export const CommunicationScore: React.FC<CommunicationScoreProps> = ({ score }) => {
  const metrics = [
    { label: 'Grammar', value: score.grammar, icon: '✍️' },
    { label: 'Fluency', value: score.fluency, icon: '🌊' },
    { label: 'Pronunciation', value: score.pronunciation, icon: '🎯' },
    { label: 'Pace', value: score.pace, icon: '⚡' },
    { label: 'Clarity', value: score.clarity, icon: '💎' },
    { label: 'Vocabulary', value: score.vocabulary, icon: '📚' },
    { label: 'Confidence', value: score.confidence, icon: '🦁' },
  ];

  return (
    <div className="comm-score-card glass-card">
      <div className="overall-score-banner">
        <div className="circular-score-indicator">
          <svg viewBox="0 0 36 36" className="circular-chart">
            <path
              className="circle-bg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="circle"
              strokeDasharray={`${score.overall_score}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <text x="18" y="20.35" className="percentage">{score.overall_score}%</text>
          </svg>
        </div>
        <div className="banner-text">
          <h2>Communication Quality Index</h2>
          <p>Multi-dimensional weighted speech assessment derived from actual audio and transcript.</p>
        </div>
      </div>

      <div className="component-score-grid">
        {metrics.map((m) => (
          <div key={m.label} className="score-component-box">
            <div className="comp-label">
              <span>{m.icon} {m.label}</span>
              <strong>{m.value}%</strong>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${m.value}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
