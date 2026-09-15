import React from 'react';
import { PronunciationAnalysis as PronType } from '../../types/speech';

interface PronunciationAnalysisProps {
  pronunciation: PronType;
}

export const PronunciationAnalysis: React.FC<PronunciationAnalysisProps> = ({ pronunciation }) => {
  return (
    <div className="pronunciation-card glass-card">
      <div className="card-header-flex">
        <h4>🎯 Pronunciation & Phonetic Clarity</h4>
        <span className="score-badge good">Score: {pronunciation.score}/100</span>
      </div>

      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        {pronunciation.clarity_assessment}
      </p>

      {pronunciation.issues.length === 0 ? (
        <p className="success-notice">✅ Clear phonetics across all spoken technical vocabulary!</p>
      ) : (
        <div className="pronunciation-issues-list">
          {pronunciation.issues.map((issue, idx) => (
            <div key={idx} className="pron-issue-item">
              <div className="word-status-flex">
                <span className="word-name">"{issue.word}"</span>
                <span className="badge badge-warning">{issue.status}</span>
              </div>
              <p className="pron-feedback">💡 {issue.feedback}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
