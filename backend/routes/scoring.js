const express = require('express');
const router = express.Router();
const ScoringService = require('../services/scoringService');
const Interview = require('../models/Interview');
const { auth } = require('../middleware/auth');

const scoringService = new ScoringService();

// =============================================
// SCORE INDIVIDUAL Q&A
// =============================================
router.post('/qa', auth, async (req, res) => {
  try {
    const {
      interview_id,
      question,
      answer,
      domain = 'general',
      behavioral_data = null,
      expected_keywords = null
    } = req.body;

    // Validate input
    if (!question || !answer) {
      return res.status(400).json({
        error: 'question and answer are required'
      });
    }

    // Evaluate Q&A
    const evaluation = await scoringService.evaluateQA(
      question,
      answer,
      domain,
      behavioral_data,
      expected_keywords
    );

    res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    console.error('Error scoring Q&A:', error);
    res.status(500).json({
      error: 'Failed to score Q&A',
      message: error.message
    });
  }
});

// =============================================
// SCORE ENTIRE INTERVIEW SESSION
// =============================================
router.post('/session', auth, async (req, res) => {
  try {
    const {
      interview_id,
      qa_pairs,
      domain = 'general',
      behavioral_data = []
    } = req.body;

    // Validate input
    if (!qa_pairs || !Array.isArray(qa_pairs) || qa_pairs.length === 0) {
      return res.status(400).json({
        error: 'qa_pairs must be a non-empty array'
      });
    }

    // Evaluate entire session
    const sessionResult = await scoringService.evaluateSession(
      qa_pairs,
      domain,
      behavioral_data
    );

    // Generate comprehensive feedback
    const feedback = scoringService.generateAIFeedback(sessionResult, domain);

    // Generate performance report
    const report = scoringService.generatePerformanceReport(
      sessionResult,
      { name: req.user?.name || 'Candidate' }
    );

    // Save results to database if interview_id provided
    if (interview_id) {
      const overallScore = sessionResult.session_summary?.overall_scores?.overall_score || 0;
      
      await Interview.updateScoreAndFeedback(
        interview_id,
        overallScore,
        JSON.stringify({
          ...report,
          rawEvaluation: sessionResult
        }),
        'full'
      );
    }

    res.json({
      success: true,
      data: {
        sessionEvaluation: sessionResult,
        aiReport: report,
        feedback: feedback
      }
    });
  } catch (error) {
    console.error('Error scoring session:', error);
    res.status(500).json({
      error: 'Failed to score interview session',
      message: error.message
    });
  }
});

// =============================================
// GET INTERVIEW SCORING RESULTS
// =============================================
router.get('/:interview_id', auth, async (req, res) => {
  try {
    const { interview_id } = req.params;

    // Get interview from database
    const interview = await Interview.findById(interview_id);

    if (!interview) {
      return res.status(404).json({
        error: 'Interview not found'
      });
    }

    // Check authorization
    if (interview.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Unauthorized'
      });
    }

    // Parse feedback if available
    let feedback = null;
    if (interview.feedback) {
      try {
        feedback = JSON.parse(interview.feedback);
      } catch (e) {
        feedback = interview.feedback;
      }
    }

    res.json({
      success: true,
      data: {
        interview_id: interview.id,
        score: interview.score,
        status: interview.status,
        feedback: feedback,
        created_at: interview.created_at,
        completed_at: interview.end_time
      }
    });
  } catch (error) {
    console.error('Error fetching scoring results:', error);
    res.status(500).json({
      error: 'Failed to fetch scoring results',
      message: error.message
    });
  }
});

// =============================================
// GET DETAILED PERFORMANCE REPORT
// =============================================
router.get('/:interview_id/report', auth, async (req, res) => {
  try {
    const { interview_id } = req.params;

    // Get interview from database
    const interview = await Interview.findById(interview_id);

    if (!interview) {
      return res.status(404).json({
        error: 'Interview not found'
      });
    }

    // Check authorization
    if (interview.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Unauthorized'
      });
    }

    // Parse feedback
    let report = null;
    if (interview.feedback) {
      try {
        const feedbackData = JSON.parse(interview.feedback);
        report = feedbackData;
      } catch (e) {
        report = {
          score: interview.score,
          feedback: interview.feedback
        };
      }
    }

    res.json({
      success: true,
      data: report || {
        score: interview.score,
        status: interview.status
      }
    });
  } catch (error) {
    console.error('Error fetching performance report:', error);
    res.status(500).json({
      error: 'Failed to fetch performance report',
      message: error.message
    });
  }
});

// =============================================
// SCORE COMMUNICATION SKILLS
// =============================================
router.post('/dimension/communication', auth, async (req, res) => {
  try {
    const { answer, audio_data = null } = req.body;

    if (!answer) {
      return res.status(400).json({
        error: 'answer is required'
      });
    }

    const result = await scoringService.scoreCommunication(answer, audio_data);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error scoring communication:', error);
    res.status(500).json({
      error: 'Failed to score communication',
      message: error.message
    });
  }
});

// =============================================
// SCORE CONFIDENCE
// =============================================
router.post('/dimension/confidence', auth, async (req, res) => {
  try {
    const { answer, behavioral_data = null } = req.body;

    if (!answer) {
      return res.status(400).json({
        error: 'answer is required'
      });
    }

    const result = await scoringService.scoreConfidence(answer, behavioral_data);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error scoring confidence:', error);
    res.status(500).json({
      error: 'Failed to score confidence',
      message: error.message
    });
  }
});

// =============================================
// SCORE TECHNICAL RELEVANCE
// =============================================
router.post('/dimension/technical', auth, async (req, res) => {
  try {
    const {
      question,
      answer,
      domain = 'general',
      expected_keywords = null
    } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        error: 'question and answer are required'
      });
    }

    const result = await scoringService.scoreTechnical(
      question,
      answer,
      domain,
      expected_keywords
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error scoring technical:', error);
    res.status(500).json({
      error: 'Failed to score technical relevance',
      message: error.message
    });
  }
});

// =============================================
// SCORE PROFESSIONALISM
// =============================================
router.post('/dimension/professionalism', auth, async (req, res) => {
  try {
    const { answer } = req.body;

    if (!answer) {
      return res.status(400).json({
        error: 'answer is required'
      });
    }

    const result = await scoringService.scoreProfessionalism(answer);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error scoring professionalism:', error);
    res.status(500).json({
      error: 'Failed to score professionalism',
      message: error.message
    });
  }
});

// =============================================
// GENERATE AI FEEDBACK
// =============================================
router.post('/feedback/generate', auth, async (req, res) => {
  try {
    const {
      evaluation_result,
      interview_type = 'tr'
    } = req.body;

    if (!evaluation_result) {
      return res.status(400).json({
        error: 'evaluation_result is required'
      });
    }

    const feedback = scoringService.generateAIFeedback(evaluation_result, interview_type);

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error generating feedback:', error);
    res.status(500).json({
      error: 'Failed to generate feedback',
      message: error.message
    });
  }
});

// =============================================
// GET USER'S INTERVIEW HISTORY WITH SCORES
// =============================================
router.get('/', auth, async (req, res) => {
  try {
    const interviews = await Interview.findByUserId(req.user.id);

    const scoredInterviews = interviews
      .filter(i => i.score !== null)
      .map(i => ({
        id: i.id,
        type: i.interview_type,
        domain: i.domain,
        score: i.score,
        status: i.status,
        created_at: i.created_at,
        completed_at: i.end_time
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      data: {
        totalInterviews: scoredInterviews.length,
        interviews: scoredInterviews,
        averageScore: scoredInterviews.length > 0
          ? (scoredInterviews.reduce((sum, i) => sum + i.score, 0) / scoredInterviews.length).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching interview history:', error);
    res.status(500).json({
      error: 'Failed to fetch interview history',
      message: error.message
    });
  }
});

// =============================================
// GET SCORING SUMMARY FOR DASHBOARD
// =============================================
router.get('/dashboard/summary', auth, async (req, res) => {
  try {
    const interviews = await Interview.findByUserId(req.user.id);
    const scoredInterviews = interviews.filter(i => i.score !== null);

    if (scoredInterviews.length === 0) {
      return res.json({
        success: true,
        data: {
          message: 'No completed interviews yet',
          averageScore: 0,
          totalAttempts: 0,
          performanceRating: 'Not Started'
        }
      });
    }

    const scores = scoredInterviews.map(i => i.score);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    const performanceRating = averageScore >= 90 ? 'Excellent'
      : averageScore >= 75 ? 'Good'
      : averageScore >= 60 ? 'Average'
      : averageScore >= 40 ? 'Needs Improvement'
      : 'Poor';

    res.json({
      success: true,
      data: {
        totalAttempts: scoredInterviews.length,
        averageScore: averageScore.toFixed(2),
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        performanceRating: performanceRating,
        progressTrend: this._calculateProgressTrend(scoredInterviews)
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard summary',
      message: error.message
    });
  }
});

// Helper function to calculate progress trend
function _calculateProgressTrend(interviews) {
  if (interviews.length < 2) return 'stable';

  const sorted = interviews.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const recent = sorted.slice(-3);

  if (recent.length < 2) return 'stable';

  const avg1 = recent.slice(0, Math.floor(recent.length / 2)).reduce((a, b) => a + b.score, 0) / Math.floor(recent.length / 2);
  const avg2 = recent.slice(Math.floor(recent.length / 2)).reduce((a, b) => a + b.score, 0) / (recent.length - Math.floor(recent.length / 2));

  const diff = avg2 - avg1;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

module.exports = router;
