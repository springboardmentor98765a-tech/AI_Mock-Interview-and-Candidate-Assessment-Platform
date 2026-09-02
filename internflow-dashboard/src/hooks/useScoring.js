import { useState, useCallback, useEffect } from 'react';
import { scoringAPI } from '../services/scoringAPI';
import { transformReportData } from '../utils/scoringUtils';

/**
 * Custom React Hook for Interview Scoring
 * Manages scoring state, API calls, and data transformation
 */
export const useScoring = (interviewId = null) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [qaPairs, setQaPairs] = useState([]);
  const [domain, setDomain] = useState('ai_ml');
  const [interviewType, setInterviewType] = useState('tr');

  /**
   * Score a single Q&A pair
   */
  const scoreQA = useCallback(async (answer, question, expectedAnswer = '', behavioralData = null) => {
    setLoading(true);
    setError(null);

    try {
      const result = await scoringAPI.scoreQA(
        answer,
        question,
        domain,
        expectedAnswer,
        behavioralData
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to score Q&A');
      }

      return result.data.qa_evaluation;
    } catch (err) {
      const errorMsg = err.message || 'Error scoring Q&A pair';
      setError(errorMsg);
      console.error('scoreQA error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [domain]);

  /**
   * Score entire interview session
   */
  const scoreSession = useCallback(async (pairs, sessionDomain, sessionType, behavioralData = null) => {
    setLoading(true);
    setError(null);

    try {
      if (!interviewId) {
        throw new Error('Interview ID is required for session scoring');
      }

      const result = await scoringAPI.scoreSession(
        interviewId,
        pairs,
        sessionDomain || domain,
        sessionType || interviewType,
        behavioralData
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to score session');
      }

      // Transform and store report data
      const transformed = transformReportData(result);
      setReportData(transformed);
      setQaPairs(pairs);
      setDomain(sessionDomain || domain);
      setInterviewType(sessionType || interviewType);

      return result.data;
    } catch (err) {
      const errorMsg = err.message || 'Error scoring interview session';
      setError(errorMsg);
      console.error('scoreSession error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [interviewId, domain, interviewType]);

  /**
   * Fetch existing report for interview
   */
  const fetchReport = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const id_to_use = id || interviewId;
      if (!id_to_use) {
        throw new Error('Interview ID is required');
      }

      const result = await scoringAPI.getPerformanceReport(id_to_use);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch report');
      }

      const transformed = transformReportData(result);
      setReportData(transformed);

      return transformed;
    } catch (err) {
      const errorMsg = err.message || 'Error fetching report';
      setError(errorMsg);
      console.error('fetchReport error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [interviewId]);

  /**
   * Score individual communication dimension
   */
  const scoreCommunication = useCallback(async (answer, expectedAnswer = '') => {
    setLoading(true);
    setError(null);

    try {
      const result = await scoringAPI.scoreCommunication(answer, expectedAnswer);

      if (!result.success) {
        throw new Error(result.error || 'Failed to score communication');
      }

      return result.data;
    } catch (err) {
      setError(err.message || 'Error scoring communication');
      console.error('scoreCommunication error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Score individual confidence dimension
   */
  const scoreConfidence = useCallback(async (answer, behavioralData = null) => {
    setLoading(true);
    setError(null);

    try {
      const result = await scoringAPI.scoreConfidence(answer, behavioralData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to score confidence');
      }

      return result.data;
    } catch (err) {
      setError(err.message || 'Error scoring confidence');
      console.error('scoreConfidence error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Score technical dimension
   */
  const scoreTechnical = useCallback(async (answer, sessionDomain = null, keywords = []) => {
    setLoading(true);
    setError(null);

    try {
      const result = await scoringAPI.scoreTechnical(
        answer,
        sessionDomain || domain,
        keywords
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to score technical');
      }

      return result.data;
    } catch (err) {
      setError(err.message || 'Error scoring technical');
      console.error('scoreTechnical error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [domain]);

  /**
   * Score professionalism dimension
   */
  const scoreProfessionalism = useCallback(async (answer, responseLength = 0) => {
    setLoading(true);
    setError(null);

    try {
      const result = await scoringAPI.scoreProfessionalism(answer, responseLength);

      if (!result.success) {
        throw new Error(result.error || 'Failed to score professionalism');
      }

      return result.data;
    } catch (err) {
      setError(err.message || 'Error scoring professionalism');
      console.error('scoreProfessionalism error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear all state
   */
  const reset = useCallback(() => {
    setReportData(null);
    setError(null);
    setQaPairs([]);
    setLoading(false);
  }, []);

  /**
   * Update domain
   */
  const updateDomain = useCallback((newDomain) => {
    setDomain(newDomain);
  }, []);

  /**
   * Update interview type
   */
  const updateInterviewType = useCallback((newType) => {
    setInterviewType(newType);
  }, []);

  return {
    // State
    loading,
    error,
    reportData,
    qaPairs,
    domain,
    interviewType,

    // Methods
    scoreQA,
    scoreSession,
    fetchReport,
    scoreCommunication,
    scoreConfidence,
    scoreTechnical,
    scoreProfessionalism,
    reset,
    updateDomain,
    updateInterviewType,

    // Convenience checks
    hasReport: !!reportData,
    isLoading: loading
  };
};

export default useScoring;
