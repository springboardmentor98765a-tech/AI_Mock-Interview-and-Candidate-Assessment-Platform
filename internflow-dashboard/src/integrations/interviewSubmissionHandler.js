/**
 * Interview Submission Handler
 * Shows how to integrate scoring when interview is completed
 * 
 * This file demonstrates the integration pattern for scoring
 * Add this logic to your interview completion handler
 */

import { scoringAPI } from './services/scoringAPI';
import { transformReportData } from './utils/scoringUtils';

/**
 * Handle interview completion and trigger scoring
 * Call this function when the user completes their interview
 * 
 * @param {string} interviewId - The interview ID
 * @param {array} qaPairs - Array of {question, answer, expected_answer}
 * @param {string} domain - Interview domain (ai_ml|sde|hr)
 * @param {string} interviewType - Interview type (tr|mr|hr)
 * @param {object} behavioralData - Optional: {eyeContactPercentage, engagementScore, attentionScore}
 * @returns {Promise<object>} Report data for display
 */
export const handleInterviewCompletion = async (
  interviewId,
  qaPairs,
  domain,
  interviewType,
  behavioralData = null
) => {
  if (!interviewId || !qaPairs || qaPairs.length === 0) {
    throw new Error('Interview ID and Q&A pairs are required');
  }

  try {
    // Call the scoring API with all interview data
    const response = await scoringAPI.scoreSession(
      interviewId,
      qaPairs,
      domain,
      interviewType,
      behavioralData
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to score interview');
    }

    // Transform response into PerformanceReport format
    const reportData = transformReportData(response);

    return {
      success: true,
      reportData,
      rawData: response.data
    };
  } catch (error) {
    console.error('Interview completion scoring error:', error);
    return {
      success: false,
      error: error.message,
      reportData: null
    };
  }
};

/**
 * Handle single answer submission during interview
 * Optional: Score each answer as it's submitted for real-time feedback
 * 
 * @param {string} answer - The answer text
 * @param {string} question - The question
 * @param {string} domain - Interview domain
 * @param {string} expectedAnswer - Expected answer for comparison
 * @returns {Promise<object>} Individual score
 */
export const handleAnswerSubmission = async (
  answer,
  question,
  domain,
  expectedAnswer = ''
) => {
  try {
    const response = await scoringAPI.scoreQA(
      answer,
      question,
      domain,
      expectedAnswer
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to score answer');
    }

    return {
      success: true,
      score: response.data.qa_evaluation.overall_score,
      evaluation: response.data.qa_evaluation
    };
  } catch (error) {
    console.error('Answer scoring error:', error);
    return {
      success: false,
      error: error.message,
      score: null
    };
  }
};

/**
 * Example: How to integrate into WebcamRecorder component
 * 
 * Add this to your WebcamRecorder or interview component:
 */

// ============= EXAMPLE INTEGRATION =============
/*

import { handleInterviewCompletion } from './integrations/interviewSubmissionHandler';
import InterviewResults from './components/InterviewResults';

function WebcamRecorder() {
  const [recordedAnswers, setRecordedAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [interviewId, setInterviewId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ... existing code ...

  // Call this when interview is complete
  const handleSubmitInterview = async () => {
    setLoading(true);
    setError(null);

    try {
      // Prepare Q&A pairs from recorded answers
      const qaPairs = recordedAnswers.map(item => ({
        question: item.question,
        answer: item.answer,
        expected_answer: item.expectedAnswer || ''
      }));

      // Get domain and type from state/context
      const domain = 'ai_ml'; // or from state
      const interviewType = 'tr'; // or from state

      // Optional: Collect behavioral data from video analysis
      const behavioralData = {
        eyeContactPercentage: analyzeEyeContact(),
        engagementScore: analyzeEngagement(),
        attentionScore: analyzeAttention()
      };

      // Submit for scoring
      const result = await handleInterviewCompletion(
        interviewId,
        qaPairs,
        domain,
        interviewType,
        behavioralData
      );

      if (result.success) {
        // Show results page
        setShowResults(true);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || 'Failed to complete interview');
    } finally {
      setLoading(false);
    }
  };

  // Show results or recording interface
  if (showResults) {
    return (
      <InterviewResults
        interviewId={interviewId}
        onRetake={() => {
          // Reset and start new interview
          setShowResults(false);
          setRecordedAnswers([]);
        }}
        onNavigate={(page) => {
          if (page === 'dashboard') {
            // Navigate to dashboard
          }
        }}
      />
    );
  }

  return (
    <div>
      {/* Existing recorder UI */}
      <button onClick={handleSubmitInterview} disabled={loading}>
        {loading ? 'Analyzing...' : 'Submit Interview'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}

*/

// ============= END EXAMPLE =============

/**
 * Alternative: Using the useScoring hook
 * 
 * This is a simpler approach using the custom hook
 */

// ============= HOOK EXAMPLE =============
/*

import useScoring from './hooks/useScoring';

function InterviewFlow() {
  const { scoreSession, reportData, loading, error } = useScoring(interviewId);

  const handleComplete = async () => {
    try {
      await scoreSession(
        qaPairs,
        'ai_ml',
        'tr',
        behavioralData
      );
      // reportData is automatically set after scoring
    } catch (err) {
      console.error('Scoring failed:', err);
    }
  };

  if (reportData) {
    return <InterviewResults interviewId={interviewId} />;
  }

  return (
    <div>
      <button onClick={handleComplete} disabled={loading}>
        {loading ? 'Scoring...' : 'Complete Interview'}
      </button>
      {error && <div>{error}</div>}
    </div>
  );
}

*/

// ============= END HOOK EXAMPLE =============

export {
  handleInterviewCompletion,
  handleAnswerSubmission
};
