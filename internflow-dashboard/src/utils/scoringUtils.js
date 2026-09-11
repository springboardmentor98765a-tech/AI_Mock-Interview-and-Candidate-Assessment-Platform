/**
 * Scoring Utilities
 * Helper functions for formatting and processing scoring data
 */

export const scoringConstants = {
  WEIGHTS: {
    communication: 0.30,
    confidence: 0.25,
    technical: 0.30,
    professionalism: 0.15
  },

  THRESHOLDS: {
    excellent: 90,
    good: 75,
    average: 60,
    needs_improvement: 40,
    poor: 0
  },

  RATING_DESCRIPTIONS: {
    Excellent: 'Outstanding performance! You demonstrated exceptional skills across all dimensions.',
    Good: 'Strong performance with good potential. Focus on improving weak areas.',
    Average: 'Decent performance. With practice, you can significantly improve your score.',
    'Needs Improvement': 'Your performance needs work. Invest time in preparation and practice.',
    Poor: 'Consider comprehensive preparation before your next interview.'
  },

  COLORS: {
    excellent: '#4CAF50',
    good: '#8BC34A',
    average: '#FFC107',
    improvement: '#FF9800',
    poor: '#F44336'
  }
};

/**
 * Get performance rating based on score
 * @param {number} score - Overall score (0-100)
 * @returns {string} Rating category
 */
export const getScoreCategory = (score) => {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Average';
  if (score >= 40) return 'Needs Improvement';
  return 'Poor';
};

/**
 * Get color for score range
 * @param {number} score - Score value
 * @returns {string} Hex color code
 */
export const getScoreColor = (score) => {
  const category = getScoreCategory(score).toLowerCase().replace(' ', '_');
  return scoringConstants.COLORS[category] || '#666';
};

/**
 * Calculate overall score from individual dimensions
 * @param {object} dimensions - {communication, confidence, technical, professionalism}
 * @returns {number} Weighted overall score
 */
export const calculateOverallScore = (dimensions) => {
  const { communication = 0, confidence = 0, technical = 0, professionalism = 0 } = dimensions;
  const { WEIGHTS } = scoringConstants;

  return (
    communication * WEIGHTS.communication +
    confidence * WEIGHTS.confidence +
    technical * WEIGHTS.technical +
    professionalism * WEIGHTS.professionalism
  );
};

/**
 * Format score for display
 * @param {number} score - Score value
 * @param {number} decimals - Decimal places to show
 * @returns {string} Formatted score
 */
export const formatScore = (score, decimals = 1) => {
  return Number(score).toFixed(decimals);
};

/**
 * Transform API response into PerformanceReport prop format
 * @param {object} apiResponse - Raw API response
 * @returns {object} Formatted report data
 */
export const transformReportData = (apiResponse) => {
  if (!apiResponse || !apiResponse.data) {
    return {
      overallScore: 0,
      performanceRating: 'Pending',
      performanceBreakdown: {},
      feedback: {},
      keyInsights: [],
      nextSteps: []
    };
  }

  const data = apiResponse.data;

  return {
    overallScore: data.overall_score || 0,
    performanceRating: data.performance_rating || 'Pending',
    performanceBreakdown: {
      communication: {
        score: data.performance_breakdown?.communication?.score || 0,
        category: getScoreCategory(data.performance_breakdown?.communication?.score || 0),
        details: data.performance_breakdown?.communication?.details || {}
      },
      confidence: {
        score: data.performance_breakdown?.confidence?.score || 0,
        category: getScoreCategory(data.performance_breakdown?.confidence?.score || 0),
        details: data.performance_breakdown?.confidence?.details || {}
      },
      technicalRelevance: {
        score: data.performance_breakdown?.technical?.score || data.performance_breakdown?.technicalRelevance?.score || 0,
        category: getScoreCategory(data.performance_breakdown?.technical?.score || data.performance_breakdown?.technicalRelevance?.score || 0),
        details: data.performance_breakdown?.technical?.details || data.performance_breakdown?.technicalRelevance?.details || {}
      },
      professionalism: {
        score: data.performance_breakdown?.professionalism?.score || 0,
        category: getScoreCategory(data.performance_breakdown?.professionalism?.score || 0),
        details: data.performance_breakdown?.professionalism?.details || {}
      }
    },
    feedback: data.feedback || {
      strengths: [],
      weaknesses: [],
      improvements: [],
      recommendations: [],
      practiceAreas: [],
      learningResources: []
    },
    keyInsights: data.key_insights || [],
    nextSteps: data.next_steps || []
  };
};

/**
 * Derive a normalized Module 7 performance report from ANY interview record,
 * regardless of which code path scored it.
 *
 * Why this exists:
 * - The comprehensive scorer (backend /api/scoring/session) saves
 *   feedback.performanceBreakdown = { communication, confidence, technicalRelevance, professionalism }.
 * - The legacy submit flow (backend POST /api/interviews/submit/:id) saves a flat
 *   feedback object (technical_accuracy, communication_clarity, confidence, ...)
 *   with NO performanceBreakdown and NO professionalism score at all.
 * - If the comprehensive scoring call fails/races (see InterviewTab submit flow),
 *   an interview can end up with only the legacy shape, and History/Progress had
 *   nothing consistent to render.
 *
 * This function ALWAYS returns the shape <PerformanceReport /> expects, computing
 * an estimated breakdown (clearly flagged via `isEstimated`) from the legacy
 * fields when the real per-dimension scores aren't available, and recomputes the
 * overall score using the official Module 7 weights (30/25/30/15) so the number
 * shown always matches the documented formula.
 *
 * @param {object} interview - Interview record with `.feedback` (object) and `.score`
 * @returns {object} { overallScore, performanceRating, performanceBreakdown, feedback, keyInsights, nextSteps, isEstimated }
 */
export const deriveReportData = (interview = {}) => {
  const feedback = (interview && typeof interview.feedback === 'object' && interview.feedback) || {};
  const rawScore = Number(interview.score) || 0;

  const safeScore = (val, fallback = rawScore) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  };

  // 1) Real comprehensive breakdown already present — use it as-is.
  if (feedback.performanceBreakdown && typeof feedback.performanceBreakdown === 'object') {
    const overallScore = safeScore(feedback.overallScore, rawScore);
    return {
      overallScore,
      performanceRating: feedback.performanceRating || getScoreCategory(overallScore),
      performanceBreakdown: feedback.performanceBreakdown,
      feedback: {
        strengths: feedback.strengths || feedback.feedback?.strengths || [],
        weaknesses: feedback.weaknesses || feedback.feedback?.weaknesses || [],
        improvements: feedback.improvements || feedback.feedback?.improvements || [],
        recommendations: feedback.recommendations || feedback.feedback?.recommendations || [],
        practiceAreas: feedback.practiceAreas || feedback.feedback?.practiceAreas || [],
        learningResources: feedback.learningResources || feedback.feedback?.learningResources || []
      },
      keyInsights: feedback.keyInsights || [],
      nextSteps: feedback.nextSteps || [],
      isEstimated: false
    };
  }

  // 2) No comprehensive breakdown on record — estimate the 4 Module 7
  //    dimensions from whatever legacy data we do have, so a breakdown is
  //    always available in History/Progress instead of silently disappearing.
  const communication = safeScore(feedback.communication_clarity);
  const confidence = safeScore(feedback.confidence);
  const technical = safeScore(feedback.technical_accuracy);

  // Professionalism has no legacy equivalent at all — approximate it from
  // how much of the interview was actually completed, on-time, and in full.
  const answered = Number(feedback.answered ?? feedback.answered_questions) || 0;
  const total = Number(feedback.total_questions) || 0;
  const completionRatio = total > 0 ? Math.min(answered / total, 1) : 1;
  const partialPenalty = feedback.submission_type === 'partial' ? 15 : 0;
  const professionalism = Math.max(
    0,
    Math.min(100, Math.round(completionRatio * 100) - partialPenalty)
  );

  const performanceBreakdown = {
    communication: { score: communication, category: getScoreCategory(communication), details: {} },
    confidence: { score: confidence, category: getScoreCategory(confidence), details: {} },
    technicalRelevance: { score: technical, category: getScoreCategory(technical), details: {} },
    professionalism: { score: professionalism, category: getScoreCategory(professionalism), details: {} }
  };

  const overallScore = calculateOverallScore({
    communication,
    confidence,
    technical,
    professionalism
  });

  return {
    overallScore,
    performanceRating: getScoreCategory(overallScore),
    performanceBreakdown,
    feedback: {
      strengths: feedback.strengths || [],
      weaknesses: feedback.weaknesses || [],
      improvements: feedback.improvements || [],
      recommendations: feedback.recommendations || [],
      practiceAreas: feedback.practiceAreas || [],
      learningResources: feedback.learningResources || []
    },
    keyInsights: [],
    nextSteps: [],
    isEstimated: true
  };
};

/**
 * Calculate score statistics from array of scores
 * @param {array} scores - Array of score objects
 * @returns {object} Statistics including avg, min, max, trend
 */
export const calculateScoreStats = (scores = []) => {
  if (!scores || scores.length === 0) {
    return {
      total: 0,
      average: 0,
      highest: 0,
      lowest: 0,
      trend: 'no-data'
    };
  }

  const values = scores.map(s => s.score || 0);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Calculate trend
  let trend = 'stable';
  if (values.length >= 2) {
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg > firstAvg + 5) trend = 'improving';
    else if (secondAvg < firstAvg - 5) trend = 'declining';
  }

  return {
    total: scores.length,
    average: avg.toFixed(2),
    highest: max.toFixed(2),
    lowest: min.toFixed(2),
    trend,
    attemptCount: scores.length
  };
};

/**
 * Group scores by rating category
 * @param {array} scores - Array of interview scores
 * @returns {object} Count of scores in each category
 */
export const groupScoresByRating = (scores = []) => {
  const grouped = {
    excellent: 0,
    good: 0,
    average: 0,
    needs_improvement: 0,
    poor: 0
  };

  scores.forEach(score => {
    const category = getScoreCategory(score.score || 0).toLowerCase().replace(' ', '_');
    if (category in grouped) grouped[category]++;
  });

  return grouped;
};

/**
 * Format date for score history display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  });
};

/**
 * Format date with time
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date with time
 */
export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get interview type display name
 * @param {string} type - Interview type code
 * @returns {string} Display name
 */
export const getInterviewTypeName = (type) => {
  const types = {
    'tr': 'Technical',
    'mr': 'Managerial',
    'hr': 'HR'
  };
  return types[type] || type;
};

/**
 * Get interview domain display name
 * @param {string} domain - Domain code
 * @returns {string} Display name
 */
export const getInterviewDomainName = (domain) => {
  const domains = {
    'ai_ml': 'AI/ML',
    'sde': 'Software Development',
    'hr': 'HR'
  };
  return domains[domain] || domain;
};

/**
 * Validate scoring data
 * @param {object} data - Data to validate
 * @returns {boolean} True if valid
 */
export const isValidScoreData = (data) => {
  return (
    data &&
    typeof data === 'object' &&
    data.overallScore !== undefined &&
    typeof data.overallScore === 'number' &&
    data.overallScore >= 0 &&
    data.overallScore <= 100 &&
    data.performanceBreakdown &&
    typeof data.performanceBreakdown === 'object'
  );
};

/**
 * Generate improvement recommendations based on scores
 * @param {object} breakdown - Performance breakdown
 * @returns {array} Personalized recommendations
 */
export const generateRecommendations = (breakdown = {}) => {
  const recommendations = [];

  const { communication = 0, confidence = 0, technical = 0, professionalism = 0 } = {
    communication: breakdown.communication?.score || 0,
    confidence: breakdown.confidence?.score || 0,
    technical: breakdown.technicalRelevance?.score || breakdown.technical?.score || 0,
    professionalism: breakdown.professionalism?.score || 0
  };

  if (communication < 70) {
    recommendations.push('Focus on clear and concise communication. Practice explaining complex ideas simply.');
  }

  if (confidence < 70) {
    recommendations.push('Build confidence through more practice interviews and public speaking exercises.');
  }

  if (technical < 70) {
    recommendations.push('Deepen your technical knowledge by studying relevant concepts and working on projects.');
  }

  if (professionalism < 70) {
    recommendations.push('Work on professional etiquette and time management skills.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue practicing to maintain and improve your performance.');
  }

  return recommendations;
};

/**
 * Create comparison between two score sets
 * @param {object} scoreA - First score object
 * @param {object} scoreB - Second score object
 * @returns {object} Comparison data with improvements/declines
 */
export const compareScores = (scoreA, scoreB) => {
  if (!scoreA || !scoreB) return null;

  const overallDiff = (scoreB.overallScore || 0) - (scoreA.overallScore || 0);
  const communicationDiff = (scoreB.performance_breakdown?.communication?.score || 0) - (scoreA.performance_breakdown?.communication?.score || 0);
  const confidenceDiff = (scoreB.performance_breakdown?.confidence?.score || 0) - (scoreA.performance_breakdown?.confidence?.score || 0);
  const technicalDiff = ((scoreB.performance_breakdown?.technical?.score || scoreB.performance_breakdown?.technicalRelevance?.score || 0) - (scoreA.performance_breakdown?.technical?.score || scoreA.performance_breakdown?.technicalRelevance?.score || 0));
  const professionalismDiff = (scoreB.performance_breakdown?.professionalism?.score || 0) - (scoreA.performance_breakdown?.professionalism?.score || 0);

  return {
    overall: {
      diff: overallDiff,
      trend: overallDiff > 0 ? 'up' : overallDiff < 0 ? 'down' : 'stable'
    },
    communication: {
      diff: communicationDiff,
      trend: communicationDiff > 0 ? 'up' : communicationDiff < 0 ? 'down' : 'stable'
    },
    confidence: {
      diff: confidenceDiff,
      trend: confidenceDiff > 0 ? 'up' : confidenceDiff < 0 ? 'down' : 'stable'
    },
    technical: {
      diff: technicalDiff,
      trend: technicalDiff > 0 ? 'up' : technicalDiff < 0 ? 'down' : 'stable'
    },
    professionalism: {
      diff: professionalismDiff,
      trend: professionalismDiff > 0 ? 'up' : professionalismDiff < 0 ? 'down' : 'stable'
    }
  };
};

export default {
  scoringConstants,
  getScoreCategory,
  getScoreColor,
  calculateOverallScore,
  formatScore,
  transformReportData,
  deriveReportData,
  calculateScoreStats,
  groupScoresByRating,
  formatDate,
  formatDateTime,
  getInterviewTypeName,
  getInterviewDomainName,
  isValidScoreData,
  generateRecommendations,
  compareScores
};