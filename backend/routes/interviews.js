const express = require('express');
const router = express.Router();
const Interview = require('../models/Interview');
const { auth } = require('../middleware/auth');
const { generateQuestions, analyzeAnswer, generateOverallFeedback } = require('../services/aiService');

// =============================================
// GENERATE AI INTERVIEW QUESTIONS
// =============================================
router.post('/generate', auth, async (req, res) => {
  try {
    const { interview_type, domain, difficulty, questionCount = 5 } = req.body;
    
    if (!interview_type || !domain || !difficulty) {
      return res.status(400).json({ 
        error: 'interview_type, domain, and difficulty are required' 
      });
    }

    const validTypes = ['tr', 'mr', 'hr'];
    if (!validTypes.includes(interview_type)) {
      return res.status(400).json({ error: 'Invalid interview type. Use: tr, mr, hr' });
    }

    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty. Use: easy, medium, hard' });
    }

    const questions = await generateQuestions(interview_type, domain, difficulty, questionCount);

    const interview = await Interview.create({
      user_id: req.user.id,
      interview_type,
      domain,
      difficulty,
      questions
    });

    const typeMap = {
      'tr': 'Technical Round',
      'mr': 'Managerial Round',
      'hr': 'HR Round'
    };

    res.status(201).json({
      message: 'Interview questions generated successfully',
      interview: {
        id: interview.id,
        interview_type: typeMap[interview_type] || interview_type,
        domain: domain,
        difficulty: difficulty,
        status: interview.status,
        created_at: interview.created_at
      },
      questions: questions,
      total_questions: questions.length
    });

  } catch (error) {
    console.error('❌ Generate questions error:', error);
    res.status(500).json({ 
      error: 'Server error: ' + error.message,
      details: error.stack
    });
  }
});

// =============================================
// GET ALL INTERVIEWS FOR USER
// =============================================
router.get('/', auth, async (req, res) => {
  try {
    const interviews = await Interview.findByUserId(req.user.id);
    
    const formattedInterviews = interviews.map(interview => {
      let feedback = null;
      if (interview.feedback) {
        try {
          feedback = JSON.parse(interview.feedback);
        } catch (e) {
          feedback = interview.feedback;
        }
      }
      return {
        ...interview,
        feedback: feedback
      };
    });
    
    res.json(formattedInterviews);
  } catch (error) {
    console.error('❌ Get interviews error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// GET ACTIVE SESSION - MUST BE BEFORE /:id
// =============================================
router.get('/active', auth, async (req, res) => {
  try {
    const session = await Interview.getActiveSession(req.user.id);
    
    if (!session) {
      return res.json({ 
        message: 'No active session found',
        session: null 
      });
    }

    res.json({
      message: 'Active session found',
      session: session
    });
  } catch (error) {
    console.error('❌ Get active session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// GET INTERVIEW BY ID
// =============================================
router.get('/:id', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    if (interview.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    let feedback = null;
    if (interview.feedback) {
      try {
        feedback = JSON.parse(interview.feedback);
      } catch (e) {
        feedback = interview.feedback;
      }
    }

    res.json({
      ...interview,
      feedback: feedback
    });
  } catch (error) {
    console.error('❌ Get interview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// UPDATE INTERVIEW STATUS
// =============================================
router.put('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    if (interview.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const validStatuses = ['pending', 'in_progress', 'paused', 'completed', 'ended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await Interview.updateStatus(req.params.id, status);
    res.json(updated);
  } catch (error) {
    console.error('❌ Update interview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// DELETE INTERVIEW
// =============================================
router.delete('/:id', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    if (interview.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Interview.delete(req.params.id);
    res.json({ message: 'Interview deleted successfully' });
  } catch (error) {
    console.error('❌ Delete interview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// SESSION MANAGEMENT ROUTES
// =============================================

// START INTERVIEW SESSION
router.post('/:id/start', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    if (interview.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (interview.status === 'in_progress') {
      return res.status(400).json({ error: 'Interview already started' });
    }

    if (interview.status === 'completed' || interview.status === 'ended') {
      return res.status(400).json({ error: 'Interview already completed or ended' });
    }

    const updated = await Interview.updateStatus(req.params.id, 'in_progress');

    res.json({
      message: 'Interview started successfully',
      interview: updated,
      started_at: updated.start_time
    });
  } catch (error) {
    console.error('❌ Start interview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PAUSE INTERVIEW SESSION
router.post('/:id/pause', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    if (interview.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (interview.status !== 'in_progress') {
      return res.status(400).json({ error: 'Interview is not in progress' });
    }

    const updated = await Interview.pauseInterview(req.params.id);

    res.json({
      message: 'Interview paused successfully',
      interview: updated
    });
  } catch (error) {
    console.error('❌ Pause interview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// RESUME INTERVIEW SESSION
router.post('/:id/resume', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    if (interview.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (interview.status !== 'paused') {
      return res.status(400).json({ error: 'Interview is not paused' });
    }

    const updated = await Interview.resumeInterview(req.params.id);

    res.json({
      message: 'Interview resumed successfully',
      interview: updated
    });
  } catch (error) {
    console.error('❌ Resume interview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// END INTERVIEW SESSION
router.post('/:id/end', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    if (interview.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (interview.status === 'completed' || interview.status === 'ended') {
      return res.status(400).json({ error: 'Interview already completed or ended' });
    }

    if (interview.status === 'pending') {
      return res.status(400).json({ error: 'Interview not started yet' });
    }

    const updated = await Interview.updateStatus(req.params.id, 'ended');

    res.json({
      message: 'Interview ended successfully',
      interview: updated,
      ended_at: updated.end_time,
      duration_seconds: updated.start_time ? 
        Math.floor((new Date(updated.end_time) - new Date(updated.start_time)) / 1000) : 0
    });
  } catch (error) {
    console.error('❌ End interview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// SUBMIT INTERVIEW - WITH SUBMISSION TYPE
// =============================================
router.post('/submit/:id', auth, async (req, res) => {
  try {
    const { answers, is_partial = false , speech_analysis = null} = req.body;
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    if (interview.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (interview.status === 'completed') {
      return res.status(400).json({ error: 'Interview already completed' });
    }

    const questions = interview.questions;
    const questionTexts = questions.map(q => q.question);
    
    console.log('📊 Analyzing answers for', questionTexts.length, 'questions');
    
    const analyses = [];
    let totalScore = 0;
    let totalTechnicalAccuracy = 0;
    let totalCommunicationClarity = 0;
    let totalConfidence = 0;
    
    for (let i = 0; i < questionTexts.length; i++) {
      const userAnswer = answers[i] || '';
      const expectedSkills = questions[i]?.expected_skills || [];
      
      console.log(`📝 Analyzing Q${i+1}:`, questionTexts[i].substring(0, 50) + '...');
      
      const analysis = await analyzeAnswer(questionTexts[i], userAnswer, expectedSkills);
      analyses.push(analysis);
      totalScore += analysis.score || 0;
      totalTechnicalAccuracy += analysis.technical_accuracy || 0;
      totalCommunicationClarity += analysis.communication_clarity || 0;
      totalConfidence += analysis.confidence || 0;
      
      console.log(`📊 Q${i+1} Score:`, analysis.score);
    }
    
    const answeredCount = answers.filter(a => a && a.trim() !== '').length;
    const totalQuestions = questionTexts.length;
    
    const avgScore = Math.round(totalScore / questionTexts.length);
    
    console.log('📊 Average Score:', avgScore);
    console.log('📊 Answered:', answeredCount, '/', totalQuestions);

    const submissionType = is_partial ? 'partial' : 'full';
    
    console.log('📊 Submission type:', submissionType);

    const overallFeedback = await generateOverallFeedback(
      questionTexts.map((q, i) => ({ 
        question: q, 
        expected_skills: questions[i]?.expected_skills || [] 
      })),
      answers,
      analyses
    );

    let durationSeconds = 0;
    if (interview.start_time) {
      const endTime = interview.end_time || new Date();
      durationSeconds = Math.floor((new Date(endTime) - new Date(interview.start_time)) / 1000);
    }

    const detailedFeedback = {
      overall_score: avgScore,
      technical_accuracy: Math.round(totalTechnicalAccuracy / questionTexts.length),
      communication_clarity: Math.round(totalCommunicationClarity / questionTexts.length),
      confidence: Math.round(totalConfidence / questionTexts.length),
      total_questions: questionTexts.length,
      answered: answeredCount,
      duration_seconds: durationSeconds,
      submission_type: submissionType,
      question_scores: analyses.map((a, i) => ({
        question: questionTexts[i],
        score: a.score || 0,
        technical_accuracy: a.technical_accuracy || 0,
        communication_clarity: a.communication_clarity || 0,
        confidence: a.confidence || 0,
        strengths: a.strengths || [],
        weaknesses: a.weaknesses || [],
        improvement: a.improvements || [],
        summary: a.summary || ''
      })),
      technical_summary: overallFeedback.technical_summary || 'Good technical understanding.',
      communication_summary: overallFeedback.communication_summary || 'Clear communication.',
      strengths: overallFeedback.strengths || [],
      improvements: overallFeedback.improvements || [],
      recommendations: overallFeedback.recommendations || [],
      final_verdict: overallFeedback.final_verdict || 'Good performance. Keep practicing!',
      answered_questions: overallFeedback.answered_questions || answeredCount,
      total_questions: overallFeedback.total_questions || totalQuestions,
      unanswered_count: overallFeedback.unanswered_count || (totalQuestions - answeredCount)
    };

    const updated = await Interview.updateScoreAndFeedback(
      req.params.id, 
      avgScore, 
      JSON.stringify(detailedFeedback),
      submissionType,
      speech_analysis
    );

    res.json({ 
      message: 'Interview submitted successfully',
      score: avgScore,
      submission_type: submissionType,
      answered_count: answeredCount,
      total_questions: totalQuestions,
      feedback: detailedFeedback,
      interview: updated
    });

  } catch (error) {
    console.error('❌ Submit interview error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// =============================================
// GET INTERVIEW FEEDBACK ONLY
// =============================================
router.get('/:id/feedback', auth, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    if (interview.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (interview.status !== 'completed') {
      return res.status(400).json({ error: 'Interview not completed yet' });
    }

    let feedback = null;
    if (interview.feedback) {
      try {
        feedback = JSON.parse(interview.feedback);
      } catch (e) {
        feedback = interview.feedback;
      }
    }

    res.json({
      interview_id: interview.id,
      score: interview.score,
      feedback: feedback,
      submission_type: interview.submission_type || 'full',
      completed_at: interview.updated_at,
      duration_seconds: interview.start_time && interview.end_time ?
        Math.floor((new Date(interview.end_time) - new Date(interview.start_time)) / 1000) : 0
    });
  } catch (error) {
    console.error('❌ Get feedback error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;