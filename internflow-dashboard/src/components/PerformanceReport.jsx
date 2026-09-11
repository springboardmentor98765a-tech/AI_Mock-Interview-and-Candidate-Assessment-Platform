import React, { useState } from 'react';
import ScoreCard from './ScoreCard';
import AIFeedback from './AIFeedback';
import './PerformanceReport.css';

/**
 * PerformanceReport Component
 * Displays comprehensive interview performance with scores and feedback
 */
const PerformanceReport = ({ reportData = {}, compact = false }) => {
  const {
    overallScore = 0,
    performanceRating = 'Pending',
    performanceBreakdown = {},
    feedback = {},
    keyInsights = [],
    nextSteps = [],
    isEstimated = false,
    // AI Feedback fields - passed directly from HistoryTab
    strengths = [],
    weaknesses = [],
    improvements = [],
    recommendations = [],
    practiceAreas = [],
    learningResources = []
  } = reportData;

  const getOverallScoreColor = (score) => {
    if (score >= 90) return '#4CAF50';
    if (score >= 75) return '#8BC34A';
    if (score >= 60) return '#FFC107';
    if (score >= 40) return '#FF9800';
    return '#F44336';
  };

  const renderPerformanceBreakdown = () => {
    // Get scores from performanceBreakdown or use fallbacks
    const commScore = performanceBreakdown.communication?.score || 0;
    const confScore = performanceBreakdown.confidence?.score || 0;
    const techScore = performanceBreakdown.technicalRelevance?.score || 0;
    const profScore = performanceBreakdown.professionalism?.score || 0;

    return (
      <div className="performance-breakdown">
        {!compact && <h2 className="section-heading">Performance Breakdown</h2>}
        <div className="score-cards-grid">
          <ScoreCard
            compact={compact}
            title="Communication"
            score={commScore}
            category={performanceBreakdown.communication?.category}
            details={compact ? null : performanceBreakdown.communication?.details}
            breakdown={compact ? {} : {
              'Clarity': performanceBreakdown.communication?.details?.clarity,
              'Grammar': performanceBreakdown.communication?.details?.grammar,
              'Filler Words': performanceBreakdown.communication?.details?.filler_words,
              'Speaking Pace': performanceBreakdown.communication?.details?.speaking_pace,
              'Completeness': performanceBreakdown.communication?.details?.completeness
            }}
          />
          <ScoreCard
            compact={compact}
            title="Confidence"
            score={confScore}
            category={performanceBreakdown.confidence?.category}
            details={compact ? null : performanceBreakdown.confidence?.details}
            breakdown={compact ? {} : {
              'Eye Contact': performanceBreakdown.confidence?.details?.eye_contact,
              'Facial Engagement': performanceBreakdown.confidence?.details?.facial_engagement,
              'Hesitation': performanceBreakdown.confidence?.details?.hesitation,
              'Speaking Confidence': performanceBreakdown.confidence?.details?.speaking_confidence,
              'Attention Level': performanceBreakdown.confidence?.details?.attention_level
            }}
          />
          <ScoreCard
            compact={compact}
            title="Technical Relevance"
            score={techScore}
            category={performanceBreakdown.technicalRelevance?.category}
            details={compact ? null : performanceBreakdown.technicalRelevance?.details}
            breakdown={compact ? {} : {
              'Technical Accuracy': performanceBreakdown.technicalRelevance?.details?.technical_accuracy,
              'Keyword Relevance': performanceBreakdown.technicalRelevance?.details?.keyword_relevance,
              'Problem Solving': performanceBreakdown.technicalRelevance?.details?.problem_solving,
              'Domain Knowledge': performanceBreakdown.technicalRelevance?.details?.domain_knowledge,
              'Completeness': performanceBreakdown.technicalRelevance?.details?.completeness
            }}
          />
          <ScoreCard
            compact={compact}
            title="Professionalism"
            score={profScore}
            category={performanceBreakdown.professionalism?.category}
            details={compact ? null : performanceBreakdown.professionalism?.details}
            breakdown={compact ? {} : {
              'Time Management': performanceBreakdown.professionalism?.details?.time_management,
              'Organization': performanceBreakdown.professionalism?.details?.organization,
              'Professional Communication': performanceBreakdown.professionalism?.details?.professional_communication,
              'Etiquette': performanceBreakdown.professionalism?.details?.etiquette
            }}
          />
        </div>
      </div>
    );
  };

  const renderOverallScore = () => {
    return (
      <div className="overall-score-section">
        <div className="overall-score-card">
          <div className={`overall-score-circle ${compact ? 'compact' : ''}`} style={{ borderColor: getOverallScoreColor(overallScore) }}>
            <div className="overall-score-value" style={{ color: getOverallScoreColor(overallScore) }}>
              {overallScore.toFixed(1)}
            </div>
            <div className="overall-score-label">/100</div>
          </div>
          <div className="overall-info">
            <h2 className="overall-rating">{performanceRating}</h2>
            {!compact && (
              <p className="overall-description">
                {getPerformanceDescription(performanceRating)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getPerformanceDescription = (rating) => {
    const descriptions = {
      'Excellent': 'Outstanding performance! You demonstrated exceptional skills across all dimensions.',
      'Good': 'Strong performance with good potential. Focus on improving weak areas.',
      'Average': 'Decent performance. With practice, you can significantly improve your score.',
      'Needs Improvement': 'Your performance needs work. Invest time in preparation and practice.',
      'Poor': 'Consider comprehensive preparation before your next interview.'
    };
    return descriptions[rating] || 'Performance evaluation complete.';
  };

  const renderKeyInsights = () => {
    if (!keyInsights || keyInsights.length === 0) return null;

    return (
      <div className="key-insights-section">
        <h2 className="section-heading">📊 Key Insights</h2>
        <div className="insights-list">
          {keyInsights.map((insight, index) => (
            <div key={index} className="insight-item">
              <span className="insight-number">{index + 1}</span>
              <span className="insight-text">{insight}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderNextSteps = () => {
    if (!nextSteps || nextSteps.length === 0) return null;

    return (
      <div className="next-steps-section">
        <h2 className="section-heading">🎯 Next Steps</h2>
        <div className="steps-list">
          {nextSteps.map((step, index) => (
            <div key={index} className="step-item">
              <span className="step-number">{index + 1}</span>
              <span className="step-text">{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ✅ FIX: Build feedback object correctly - use either direct props OR feedback object
  const feedbackForAI = {
    // Use direct props first (from HistoryTab)
    strengths: strengths.length > 0 ? strengths : (feedback.strengths || []),
    weaknesses: weaknesses.length > 0 ? weaknesses : (feedback.weaknesses || []),
    improvements: improvements.length > 0 ? improvements : (feedback.improvements || []),
    recommendations: recommendations.length > 0 ? recommendations : (feedback.recommendations || []),
    practiceAreas: practiceAreas.length > 0 ? practiceAreas : (feedback.practiceAreas || []),
    learningResources: learningResources.length > 0 ? learningResources : (feedback.learningResources || [])
  };

  return (
    <div className={`performance-report-container${compact ? ' compact' : ''}`}>
      {!compact && (
        <div className="report-header">
          <h1 className="report-title">Interview Performance Report</h1>
          <p className="report-subtitle">
            Comprehensive analysis of your interview performance with actionable insights
          </p>
          {isEstimated && (
            <p className="estimated-note" style={{ fontSize: '0.8rem', color: '#FF9800', marginTop: '4px' }}>
              ⓘ Detailed per-dimension audio/video scoring wasn't available for this session, so this breakdown
              (including Professionalism) is estimated from your submission data.
            </p>
          )}
        </div>
      )}

      {compact && (
        <div className="compact-header">
          <span className="compact-heading">📊 Performance Breakdown</span>
          {isEstimated && <span className="compact-estimated-tag">Estimated</span>}
        </div>
      )}

      {renderOverallScore()}
      {renderPerformanceBreakdown()}

      {!compact ? (
        <>
          {renderKeyInsights()}
          <AIFeedback feedback={feedbackForAI} />
          {renderNextSteps()}

          <div className="report-footer">
            <p className="footer-text">
              💡 Tip: Review your weakest areas and focus on targeted practice to improve your interview performance.
            </p>
          </div>
        </>
      ) : (
        // ✅ COMPACT MODE - Render AIFeedback with all sections
        <div className="compact-feedback-wrapper">
          <AIFeedback 
            feedback={feedbackForAI} 
            compact={true}
          />
        </div>
      )}
    </div>
  );
};

export default PerformanceReport;