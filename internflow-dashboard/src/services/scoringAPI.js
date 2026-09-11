/**
 * Scoring API Service
 * Wrapper for all scoring-related backend endpoints
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Helper: build headers with auth token from localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const scoringAPI = {
  /**
   * Score a single question-answer pair
   * @param {string} answer - The candidate's answer
   * @param {string} question - The interview question
   * @param {string} domain - Interview domain (ai_ml|sde|hr)
   * @param {string} expectedAnswer - Optional expected answer for comparison
   * @param {object} behavioralData - Optional video analysis data
   * @returns {Promise} Scoring result with breakdown
   */
  scoreQA: async (answer, question, domain, expectedAnswer = '', behavioralData = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/scoring/qa`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          answer,
          question,
          expected_answer: expectedAnswer,
          domain,
          behavioral_data: behavioralData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error scoring QA:', error);
      throw error;
    }
  },

  /**
   * Score entire interview session
   * @param {string} interviewId - Interview ID
   * @param {array} qaPairs - Array of {question, answer, expected_answer}
   * @param {string} domain - Interview domain
   * @param {string} interviewType - Type (tr|mr|hr)
   * @param {object} behavioralData - Optional behavioral data
   * @returns {Promise} Complete scoring with feedback
   */
  scoreSession: async (interviewId, qaPairs, domain, interviewType, behavioralData = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/scoring/session`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          interview_id: interviewId,
          qa_pairs: qaPairs,
          domain,
          interview_type: interviewType,
          behavioral_data: behavioralData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error scoring session:', error);
      throw error;
    }
  },

  /**
   * Score just the communication dimension
   * @param {string} answer - The answer text
   * @param {string} expectedAnswer - Expected answer
   * @returns {Promise} Communication score
   */
  scoreCommunication: async (answer, expectedAnswer = '') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/scoring/dimension/communication`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ answer, expected_answer: expectedAnswer })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error scoring communication:', error);
      throw error;
    }
  },

  /**
   * Score confidence dimension
   * @param {string} answer - The answer text
   * @param {object} behavioralData - Video analysis data
   * @returns {Promise} Confidence score
   */
  scoreConfidence: async (answer, behavioralData = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/scoring/dimension/confidence`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ answer, behavioral_data: behavioralData })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error scoring confidence:', error);
      throw error;
    }
  },

  /**
   * Score technical relevance dimension
   * @param {string} answer - The answer text
   * @param {string} domain - Interview domain
   * @param {array} keywords - Expected keywords
   * @returns {Promise} Technical score
   */
  scoreTechnical: async (answer, domain, keywords = []) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/scoring/dimension/technical`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ answer, domain, keywords })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error scoring technical:', error);
      throw error;
    }
  },

  /**
   * Score professionalism dimension
   * @param {string} answer - The answer text
   * @param {number} responseLength - Length of answer
   * @returns {Promise} Professionalism score
   */
  scoreProfessionalism: async (answer, responseLength = 0) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/scoring/dimension/professionalism`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ answer, response_length: responseLength })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error scoring professionalism:', error);
      throw error;
    }
  },

  /**
   * Generate AI feedback from evaluation results
   * @param {object} evaluation - Evaluation object with dimension scores
   * @returns {Promise} AI-generated feedback
   */
  generateFeedback: async (evaluation) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/scoring/feedback/generate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(evaluation)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error generating feedback:', error);
      throw error;
    }
  },

  /**
   * Get scoring results for specific interview
   * @param {string} interviewId - Interview ID
   * @returns {Promise} Interview scores
   */
  getInterviewScores: async (interviewId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/scoring/${interviewId}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching interview scores:', error);
      throw error;
    }
  },

  /**
   * Get detailed performance report for interview
   * @param {string} interviewId - Interview ID
   * @returns {Promise} Detailed report with feedback
   */
  getPerformanceReport: async (interviewId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/scoring/${interviewId}/report`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching performance report:', error);
      throw error;
    }
  },

  /**
   * Get user's interview history with scores
   * @returns {Promise} Array of past interviews with scores
   */
  getInterviewHistory: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/scoring/`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching interview history:', error);
      throw error;
    }
  },

  /**
   * Get performance dashboard summary
   * @returns {Promise} Aggregate statistics and trends
   */
  getDashboardSummary: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/scoring/dashboard/summary`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      throw error;
    }
  },

  /**
   * Check if ML service is available
   * @returns {Promise} Service health status
   */
  healthCheck: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/scoring/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return response.ok;
    } catch (error) {
      console.error('ML service health check failed:', error);
      return false;
    }
  }
};

export default scoringAPI;