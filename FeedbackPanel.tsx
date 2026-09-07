import React from 'react';
import { AIFeedback } from '../../types/speech';

interface FeedbackPanelProps {
  feedback: AIFeedback;
}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ feedback }) => {
  return (
    <div className="feedback-panel glass-card">
      <h3 style={{ marginBottom: '1.25rem', color: 'var(--primary)' }}>🧠 Personalized AI Speech & Communication Coaching</h3>

      <div className="feedback-columns-grid">
        <div className="feedback-col strengths-col">
          <h4>🌟 Key Strengths</h4>
          <ul>
            {feedback.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="feedback-col improvements-col">
          <h4>🛠️ Areas to Improve</h4>
          <ul>
            {feedback.improvements.map((imp, i) => (
              <li key={i}>{imp}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="practice-box" style={{ marginTop: '1.5rem' }}>
        <h4>🚀 Recommended Practice Drills</h4>
        <ol>
          {feedback.recommendations.map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </ol>
      </div>
    </div>
  );
};
