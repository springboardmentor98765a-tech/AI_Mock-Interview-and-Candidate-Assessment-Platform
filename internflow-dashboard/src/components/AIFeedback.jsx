import React, { useState } from 'react';
import './AIFeedback.css';

/**
 * AIFeedback Component
 * Displays AI-generated feedback with strengths, weaknesses, and recommendations
 */
const AIFeedback = ({ feedback = {} }) => {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const FeedbackSection = ({ title, icon, items, color }) => {
    const isExpanded = expandedSection === title;

    return (
      <div className={`feedback-section ${color}`}>
        <div
          className="section-header"
          onClick={() => toggleSection(title)}
        >
          <div className="section-title">
            <span className="section-icon">{icon}</span>
            <span>{title}</span>
            <span className="item-count">({items?.length || 0})</span>
          </div>
          <span className={`expand-arrow ${isExpanded ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>

        {isExpanded && (
          <div className="section-content">
            {items && items.length > 0 ? (
              <ul className="feedback-list">
                {items.map((item, index) => (
                  <li key={index} className="feedback-item">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-items">No items in this section</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="ai-feedback-container">
      <div className="feedback-header">
        <h2 className="feedback-title">🤖 AI-Generated Feedback</h2>
        <p className="feedback-subtitle">
          Comprehensive analysis of your interview performance
        </p>
      </div>

      <div className="feedback-sections">
        <FeedbackSection
          title="Strengths"
          icon="✅"
          items={feedback.strengths}
          color="strength"
        />

        <FeedbackSection
          title="Weaknesses"
          icon="⚠️"
          items={feedback.weaknesses}
          color="weakness"
        />

        <FeedbackSection
          title="Improvements"
          icon="📈"
          items={feedback.improvements}
          color="improvement"
        />

        <FeedbackSection
          title="Recommendations"
          icon="💡"
          items={feedback.recommendations}
          color="recommendation"
        />

        <FeedbackSection
          title="Practice Areas"
          icon="🎯"
          items={feedback.practiceAreas?.map(
            area => `${area.area} (Current: ${area.currentScore}/100, Target: ${area.targetScore}/100)`
          )}
          color="practice"
        />

        <FeedbackSection
          title="Learning Resources"
          icon="📚"
          items={feedback.learningResources?.map(
            resource => `${resource.title} (${resource.type} - ${resource.platform})`
          )}
          color="resource"
        />
      </div>
    </div>
  );
};

export default AIFeedback;
