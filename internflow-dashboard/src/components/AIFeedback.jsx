import React from 'react';
import './AIFeedback.css';

/**
 * AIFeedback Component
 * Displays AI-generated feedback with strengths, weaknesses, and recommendations
 * Supports both full and compact modes
 */
const AIFeedback = ({ feedback = {}, compact = false }) => {
  const {
    strengths = [],
    weaknesses = [],
    improvements = [],
    recommendations = [],
    practiceAreas = [],
    learningResources = []
  } = feedback;

  // If no data, show fallback
  const hasData = strengths.length > 0 || weaknesses.length > 0 || 
                  improvements.length > 0 || recommendations.length > 0 ||
                  practiceAreas.length > 0 || learningResources.length > 0;

  if (!hasData) {
    return (
      <div className={`ai-feedback ${compact ? 'compact' : ''}`}>
        <p className="no-feedback-message">Complete more interviews to receive AI feedback.</p>
      </div>
    );
  }

  return (
    <div className={`ai-feedback ${compact ? 'compact' : ''}`}>
      <h4 className="feedback-title">🤖 AI Feedback Generation</h4>
      <p className="feedback-subtitle">
        The system automatically generates insights based on your interview performance.
      </p>

      <div className="feedback-grid">
        {/* Strengths */}
        {strengths.length > 0 && (
          <div className="feedback-block strengths">
            <h5>💪 Strengths</h5>
            <ul>
              {strengths.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {weaknesses.length > 0 && (
          <div className="feedback-block weaknesses">
            <h5>⚠️ Areas for Improvement</h5>
            <ul>
              {weaknesses.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>
        )}

        {/* Improvement Suggestions */}
        {improvements.length > 0 && (
          <div className="feedback-block improvements">
            <h5>📈 Improvement Suggestions</h5>
            <ul>
              {improvements.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="feedback-block recommendations">
            <h5>🎯 Recommendations</h5>
            <ul>
              {recommendations.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>
        )}

        {/* Practice Recommendations */}
        {practiceAreas.length > 0 && (
          <div className="feedback-block practice">
            <h5>🎯 Practice Recommendations</h5>
            <ul>
              {practiceAreas.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>
        )}

        {/* Learning Resources */}
        {learningResources.length > 0 && (
          <div className="feedback-block resources">
            <h5>📚 Learning Resources</h5>
            <ul>
              {learningResources.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIFeedback;