// =============================================
// COMPREHENSIVE SCORING SERVICE
// Orchestrates scoring across communication, confidence, 
// technical relevance, and professionalism dimensions
// =============================================

const axios = require('axios');

const ML_API_BASE = process.env.ML_API_BASE || 'http://localhost:5002';

class ScoringService {
  constructor() {
    this.mlApiClient = axios.create({
      baseURL: ML_API_BASE,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // =============================================
  // INDIVIDUAL DIMENSION SCORING
  // =============================================

  /**
   * Score communication dimensions
   * @param {string} answer - The candidate's answer
   * @param {object} audioData - Optional audio analysis data
   * @returns {object} Communication score breakdown
   */
  async scoreCommunication(answer, audioData = null) {
    try {
      const response = await this.mlApiClient.post('/api/score/communication', {
        answer,
        audio_data: audioData
      });
      return response.data;
    } catch (error) {
      console.error('Error scoring communication:', error.message);
      throw error;
    }
  }

  /**
   * Score confidence dimensions
   * @param {string} answer - The candidate's answer
   * @param {object} behavioralData - Video analysis data (eye contact, engagement, etc.)
   * @returns {object} Confidence score breakdown
   */
  async scoreConfidence(answer, behavioralData = null) {
    try {
      const response = await this.mlApiClient.post('/api/score/confidence', {
        answer,
        behavioral_data: behavioralData
      });
      return response.data;
    } catch (error) {
      console.error('Error scoring confidence:', error.message);
      throw error;
    }
  }

  /**
   * Score technical relevance dimensions
   * @param {string} question - The interview question
   * @param {string} answer - The candidate's answer
   * @param {string} domain - Interview domain (ai_ml, sde, etc.)
   * @param {array} expectedKeywords - Expected technical keywords
   * @returns {object} Technical score breakdown
   */
  async scoreTechnical(question, answer, domain = 'general', expectedKeywords = null) {
    try {
      const response = await this.mlApiClient.post('/api/score/technical', {
        question,
        answer,
        domain,
        expected_keywords: expectedKeywords
      });
      return response.data;
    } catch (error) {
      console.error('Error scoring technical:', error.message);
      throw error;
    }
  }

  /**
   * Score professionalism dimensions
   * @param {string} answer - The candidate's answer
   * @returns {object} Professionalism score breakdown
   */
  async scoreProfessionalism(answer) {
    try {
      const response = await this.mlApiClient.post('/api/score/professionalism', {
        answer
      });
      return response.data;
    } catch (error) {
      console.error('Error scoring professionalism:', error.message);
      throw error;
    }
  }

  /**
   * Calculate overall score from individual dimensions
   * @param {object} scores - Individual dimension scores
   * @returns {object} Overall score with rating
   */
  async calculateOverallScore(scores) {
    try {
      const response = await this.mlApiClient.post('/api/score/overall', {
        communication_score: scores.communication || 0,
        confidence_score: scores.confidence || 0,
        technical_score: scores.technical || 0,
        professionalism_score: scores.professionalism || 0
      });
      return response.data;
    } catch (error) {
      console.error('Error calculating overall score:', error.message);
      throw error;
    }
  }

  // =============================================
  // COMPREHENSIVE EVALUATION
  // =============================================

  /**
   * Comprehensive evaluation of a single Q&A pair
   * @param {string} question - Interview question
   * @param {string} answer - Candidate answer
   * @param {string} domain - Interview domain
   * @param {object} behavioralData - Video analysis data
   * @param {array} expectedKeywords - Expected keywords
   * @returns {object} Complete evaluation with all scores
   */
  async evaluateQA(question, answer, domain = 'general', behavioralData = null, expectedKeywords = null) {
    try {
      const response = await this.mlApiClient.post('/api/score/comprehensive', {
        question,
        answer,
        domain,
        behavioral_data: behavioralData,
        expected_keywords: expectedKeywords
      });
      return response.data;
    } catch (error) {
      console.error('Error evaluating Q&A:', error.message);
      throw error;
    }
  }

  /**
   * Evaluate entire interview session
   * @param {array} qaPairs - Array of {question, answer, ...}
   * @param {string} domain - Interview domain
   * @param {array} behavioralData - Optional behavioral data per Q&A
   * @returns {object} Session-level evaluation
   */
  async evaluateSession(qaPairs, domain = 'general', behavioralData = []) {
    try {
      const response = await this.mlApiClient.post('/api/score/session', {
        qa_pairs: qaPairs,
        domain,
        behavioral_data: behavioralData
      });
      return response.data;
    } catch (error) {
      console.error('Error evaluating session:', error.message);
      throw error;
    }
  }

  // =============================================
  // AI FEEDBACK GENERATION
  // =============================================

  /**
   * Generate comprehensive AI feedback from evaluation results
   * @param {object} evaluationResult - Result from evaluateQA or evaluateSession
   * @param {string} interviewType - Type of interview (tr, mr, hr)
   * @returns {object} Structured feedback with strengths, weaknesses, recommendations
   */
  generateAIFeedback(evaluationResult, interviewType = 'tr') {
    const feedback = {
      strengths: [],
      weaknesses: [],
      improvements: [],
      recommendations: [],
      practiceAreas: [],
      learningResources: []
    };

    if (evaluationResult.overall) {
      const overall = evaluationResult.overall;
      const rating = overall.rating;

      // Generate strengths
      feedback.strengths = this._generateStrengths(overall, evaluationResult);

      // Generate weaknesses
      feedback.weaknesses = this._generateWeaknesses(overall, evaluationResult);

      // Generate improvement suggestions
      feedback.improvements = this._generateImprovements(overall, evaluationResult);

      // Generate practice recommendations
      feedback.recommendations = this._generateRecommendations(rating, interviewType);

      // Identify practice areas
      feedback.practiceAreas = this._identifyPracticeAreas(evaluationResult);

      // Suggest learning resources
      feedback.learningResources = this._suggestLearningResources(evaluationResult, interviewType);
    }

    return feedback;
  }

  /**
   * Generate detailed performance summary
   * @param {object} evaluationResult - Evaluation result
   * @param {object} userData - User information
   * @returns {object} Detailed performance report
   */
  generatePerformanceReport(evaluationResult, userData = {}) {
    const overall = evaluationResult.overall || {};
    const breakdown = overall.breakdown || {};

    const report = {
      candidateName: userData.name || 'Candidate',
      interviewDate: new Date().toISOString(),
      overallScore: overall.overall_score || 0,
      performanceRating: overall.rating || 'Pending',
      performanceBreakdown: {
        communication: {
          score: breakdown.communication || 0,
          category: this._getScoreCategory(breakdown.communication),
          details: evaluationResult.communication?.details || {}
        },
        confidence: {
          score: breakdown.confidence || 0,
          category: this._getScoreCategory(breakdown.confidence),
          details: evaluationResult.confidence?.details || {}
        },
        technicalRelevance: {
          score: breakdown.technical || 0,
          category: this._getScoreCategory(breakdown.technical),
          details: evaluationResult.technical?.details || {}
        },
        professionalism: {
          score: breakdown.professionalism || 0,
          category: this._getScoreCategory(breakdown.professionalism),
          details: evaluationResult.professionalism?.details || {}
        }
      },
      feedback: this.generateAIFeedback(evaluationResult),
      keyInsights: this._generateKeyInsights(evaluationResult),
      nextSteps: this._generateNextSteps(overall.rating)
    };

    return report;
  }

  // =============================================
  // INTERNAL HELPER METHODS
  // =============================================

  _generateStrengths(overall, evaluationResult) {
    const strengths = [];
    const breakdown = overall.breakdown || {};

    // Identify high-performing areas
    if (breakdown.communication >= 75) {
      strengths.push('Clear and articulate communication');
    }
    if (breakdown.confidence >= 75) {
      strengths.push('Confident and composed demeanor');
    }
    if (breakdown.technical >= 75) {
      strengths.push('Strong technical knowledge and understanding');
    }
    if (breakdown.professionalism >= 75) {
      strengths.push('Excellent professionalism and etiquette');
    }

    // Add dimension-specific strengths
    if (evaluationResult.communication?.details?.clarity >= 80) {
      strengths.push('Excellent clarity in speech and expression');
    }
    if (evaluationResult.communication?.details?.grammar >= 80) {
      strengths.push('Strong grammatical accuracy');
    }
    if (evaluationResult.technical?.details?.keyword_relevance >= 80) {
      strengths.push('Good use of domain-specific terminology');
    }

    return strengths.length > 0 ? strengths : ['Willingness to participate in the interview'];
  }

  _generateWeaknesses(overall, evaluationResult) {
    const weaknesses = [];
    const breakdown = overall.breakdown || {};

    // Identify low-performing areas
    if (breakdown.communication < 60) {
      weaknesses.push('Communication could be more clear and structured');
    }
    if (breakdown.confidence < 60) {
      weaknesses.push('Shows signs of hesitation and uncertainty');
    }
    if (breakdown.technical < 60) {
      weaknesses.push('Technical knowledge needs development');
    }
    if (breakdown.professionalism < 60) {
      weaknesses.push('Professional presentation needs improvement');
    }

    // Add dimension-specific weaknesses
    if (evaluationResult.communication?.details?.filler_words < 50) {
      weaknesses.push('Excessive use of filler words (um, uh, like)');
    }
    if (evaluationResult.confidence?.details?.hesitation < 50) {
      weaknesses.push('Frequent hesitation and lack of confidence in responses');
    }
    if (evaluationResult.technical?.details?.problem_solving < 50) {
      weaknesses.push('Problem-solving approach could be more systematic');
    }

    return weaknesses.length > 0 ? weaknesses : [];
  }

  _generateImprovements(overall, evaluationResult) {
    const improvements = [];
    const breakdown = overall.breakdown || {};

    if (breakdown.communication < 75) {
      improvements.push('Practice speaking slowly and deliberately to improve clarity');
      improvements.push('Focus on using complete sentences and proper grammar');
    }
    if (breakdown.confidence < 75) {
      improvements.push('Work on maintaining consistent eye contact with the interviewer');
      improvements.push('Practice responding without hesitation markers');
    }
    if (breakdown.technical < 75) {
      improvements.push('Deepen your technical knowledge in key areas of your domain');
      improvements.push('Practice articulating technical concepts more precisely');
    }
    if (breakdown.professionalism < 75) {
      improvements.push('Organize your responses more logically');
      improvements.push('Use more professional language and avoid casual expressions');
    }

    return improvements;
  }

  _generateRecommendations(rating, interviewType) {
    const recommendations = [];

    const baseRecommendations = [
      'Practice mock interviews regularly to build confidence',
      'Record yourself answering questions and review for improvement areas',
      'Prepare specific examples from your experience using the STAR method',
      'Research the company and role thoroughly before the interview'
    ];

    if (rating === 'Excellent') {
      recommendations.push('Maintain your preparation level and practice edge cases');
      recommendations.push('Help others prepare for interviews to reinforce your knowledge');
    } else if (rating === 'Good') {
      recommendations.push('Focus on weak areas while maintaining your strengths');
      recommendations.push('Practice advanced problem-solving scenarios');
    } else if (rating === 'Average') {
      recommendations.push('Increase frequency of mock interview practice');
      recommendations.push('Work with a mentor for personalized guidance');
    } else {
      recommendations.push('Start with fundamentals and build foundational knowledge');
      recommendations.push('Seek professional coaching for interview preparation');
    }

    // Add interview-type-specific recommendations
    if (interviewType === 'tr') {
      recommendations.push('Study technical documentation and best practices');
      recommendations.push('Practice coding problems on platforms like LeetCode');
    } else if (interviewType === 'mr') {
      recommendations.push('Read about leadership principles and management styles');
      recommendations.push('Practice describing your leadership experiences');
    } else if (interviewType === 'hr') {
      recommendations.push('Prepare compelling stories about your professional journey');
      recommendations.push('Research the company culture and values');
    }

    return baseRecommendations.concat(recommendations).slice(0, 8);
  }

  _identifyPracticeAreas(evaluationResult) {
    const practiceAreas = [];
    const breakdown = evaluationResult.overall?.breakdown || {};

    const areas = [
      { name: 'Communication Skills', score: breakdown.communication },
      { name: 'Confidence & Presence', score: breakdown.confidence },
      { name: 'Technical Knowledge', score: breakdown.technical },
      { name: 'Professionalism', score: breakdown.professionalism }
    ];

    return areas
      .filter(area => area.score < 70)
      .sort((a, b) => a.score - b.score)
      .map(area => ({
        area: area.name,
        currentScore: area.score,
        targetScore: 75,
        priority: area.score < 50 ? 'High' : area.score < 60 ? 'Medium' : 'Low'
      }));
  }

  _suggestLearningResources(evaluationResult, interviewType) {
    const resources = [];
    const breakdown = evaluationResult.overall?.breakdown || {};

    // Communication resources
    if (breakdown.communication < 75) {
      resources.push({
        type: 'Course',
        title: 'Effective Communication for Technical Professionals',
        platform: 'Coursera/LinkedIn Learning',
        duration: '4-6 hours'
      });
    }

    // Confidence resources
    if (breakdown.confidence < 75) {
      resources.push({
        type: 'Guide',
        title: 'Building Interview Confidence: A Practical Guide',
        platform: 'Multiple platforms',
        duration: '2-3 hours reading'
      });
    }

    // Technical resources
    if (breakdown.technical < 75) {
      if (interviewType === 'tr') {
        resources.push({
          type: 'Platform',
          title: 'LeetCode / HackerRank',
          platform: 'Online',
          duration: 'Ongoing'
        });
      }
      resources.push({
        type: 'Book',
        title: 'Domain-Specific Technical Books',
        platform: 'Various publishers',
        duration: '40+ hours'
      });
    }

    // Professionalism resources
    if (breakdown.professionalism < 75) {
      resources.push({
        type: 'Guide',
        title: 'Professional Communication Etiquette',
        platform: 'Multiple platforms',
        duration: '1-2 hours'
      });
    }

    return resources;
  }

  _getScoreCategory(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Average';
    if (score >= 40) return 'Needs Improvement';
    return 'Poor';
  }

  _generateKeyInsights(evaluationResult) {
    const insights = [];
    const overall = evaluationResult.overall || {};
    const breakdown = overall.breakdown || {};

    // Identify strongest dimension
    const dimensions = [
      { name: 'Communication', score: breakdown.communication },
      { name: 'Confidence', score: breakdown.confidence },
      { name: 'Technical Knowledge', score: breakdown.technical },
      { name: 'Professionalism', score: breakdown.professionalism }
    ];

    const strongest = dimensions.reduce((max, dim) => dim.score > max.score ? dim : max);
    const weakest = dimensions.reduce((min, dim) => dim.score < min.score ? dim : min);

    insights.push(`Your strongest area is ${strongest.name} with a score of ${strongest.score}/100`);
    insights.push(`Your area for improvement is ${weakest.name} with a score of ${weakest.score}/100`);

    const score = overall.overall_score || 0;
    if (score >= 90) {
      insights.push('You demonstrate excellent interview readiness. Focus on maintaining this level.');
    } else if (score >= 75) {
      insights.push('You are well-prepared for most interviews. Target the identified weak areas for further improvement.');
    } else if (score >= 60) {
      insights.push('With focused practice on weak areas, you can significantly improve your interview performance.');
    } else {
      insights.push('Consider investing time in comprehensive interview preparation before applying to positions.');
    }

    return insights;
  }

  _generateNextSteps(rating) {
    const steps = [];

    if (rating === 'Excellent') {
      steps.push('Ready for advanced positions and interviews');
      steps.push('Consider mentoring others or attending advanced technical interviews');
    } else if (rating === 'Good') {
      steps.push('Focus on consolidating weak areas');
      steps.push('Apply to positions matching your skill level');
      steps.push('Schedule follow-up practice in 2 weeks');
    } else if (rating === 'Average') {
      steps.push('Create a structured 4-week improvement plan');
      steps.push('Focus on the two weakest areas first');
      steps.push('Practice 3-4 mock interviews per week');
    } else {
      steps.push('Develop a comprehensive 8-week preparation plan');
      steps.push('Consider hiring an interview coach');
      steps.push('Start with fundamentals and gradually increase difficulty');
      steps.push('Practice daily, even for 30 minutes');
    }

    return steps;
  }
}

module.exports = ScoringService;
