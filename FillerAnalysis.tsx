import React from 'react';
import { FillerAnalysis as FillerType } from '../../types/speech';

interface FillerAnalysisProps {
  fillers: FillerType;
}

export const FillerAnalysis: React.FC<FillerAnalysisProps> = ({ fillers }) => {
  return (
    <div className="filler-card glass-card">
      <div className="card-header-flex">
        <h4>🗣️ Filler-Word Detection</h4>
        <span className={`score-badge ${fillers.rate <= 3.0 ? 'good' : 'warning'}`}>
          Rate: {fillers.rate}%
        </span>
      </div>

      <div className="mini-metrics-row">
        <div><strong>Total Fillers:</strong> {fillers.total}</div>
        <div>
          <strong>Most Used:</strong> {fillers.most_used ? `"${fillers.most_used}" (${fillers.most_used_count}x)` : 'None'}
        </div>
      </div>

      <div className="filler-breakdown-list">
        {Object.entries(fillers.words).length === 0 ? (
          <p className="success-notice">✅ No filler words used. Very fluent delivery!</p>
        ) : (
          Object.entries(fillers.words).map(([word, count]) => (
            <div key={word} className="filler-chip-row">
              <span className="filler-name">"{word}"</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${Math.min(100, (count / Math.max(1, fillers.total)) * 100)}%` }}
                />
              </div>
              <span className="filler-count">{count}x</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
