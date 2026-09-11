// backend/routes/reports.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const pool = require('../db');

// =============================================
// 1. DOWNLOAD INTERVIEW REPORT (JSON/CSV)
// =============================================
router.get('/download/:interviewId', auth, async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { format = 'json' } = req.query;

    // Get interview data
    const interviewResult = await pool.query(
      'SELECT * FROM interviews WHERE id = $1 AND user_id = $2',
      [interviewId, req.user.id]
    );

    if (interviewResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Interview not found' 
      });
    }

    const interview = interviewResult.rows[0];
    
    // Parse feedback
    let feedback = interview.feedback;
    if (typeof feedback === 'string') {
      try { feedback = JSON.parse(feedback); } catch (e) { feedback = {}; }
    }

    // Build report data
    const reportData = {
      interviewId: interview.id,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
      },
      interview: {
        type: interview.interview_type,
        domain: interview.domain,
        difficulty: interview.difficulty,
        status: interview.status,
        score: interview.score,
        startedAt: interview.start_time,
        endedAt: interview.end_time,
        createdAt: interview.created_at
      },
      feedback: feedback,
      generatedAt: new Date().toISOString()
    };

    // Respond with appropriate format
    if (format === 'csv') {
      // Generate CSV
      const csvRows = [];
      const headers = ['Interview ID', 'Type', 'Domain', 'Score', 'Status', 'Date'];
      csvRows.push(headers.join(','));

      const row = [
        interview.id,
        interview.interview_type,
        interview.domain,
        interview.score || 0,
        interview.status,
        new Date(interview.created_at).toISOString()
      ];
      csvRows.push(row.join(','));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report-${interviewId}.csv`);
      return res.send(csvRows.join('\n'));
    }

    // Default: JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=report-${interviewId}.json`);
    res.json(reportData);

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// 2. GENERATE PERFORMANCE SUMMARY REPORT
// =============================================
router.get('/summary/:userId?', auth, async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    // Check authorization
    if (userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Get all interviews for user
    const result = await pool.query(
      `SELECT * FROM interviews 
       WHERE user_id = $1 AND status = 'completed'
       ORDER BY created_at DESC`,
      [userId]
    );

    const interviews = result.rows;

    if (interviews.length === 0) {
      return res.json({
        success: true,
        data: {
          message: 'No completed interviews found',
          totalInterviews: 0,
          averageScore: 0
        }
      });
    }

    // Calculate stats
    const scores = interviews.map(i => i.score || 0);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);

    // Get skill breakdown
    const skillBreakdown = {
      communication: [],
      confidence: [],
      technical: [],
      professionalism: []
    };

    interviews.forEach(i => {
      let feedback = i.feedback;
      if (typeof feedback === 'string') {
        try { feedback = JSON.parse(feedback); } catch (e) { return; }
      }
      if (!feedback) return;

      if (feedback.communication_clarity) skillBreakdown.communication.push(feedback.communication_clarity);
      if (feedback.confidence) skillBreakdown.confidence.push(feedback.confidence);
      if (feedback.technical_accuracy) skillBreakdown.technical.push(feedback.technical_accuracy);
      if (feedback.professionalism || feedback.professionalism_score) {
        skillBreakdown.professionalism.push(feedback.professionalism || feedback.professionalism_score);
      }
    });

        const skillAverages = {};
    for (const [key, values] of Object.entries(skillBreakdown)) {
      skillAverages[key] = values.length > 0 
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) 
        : 0;
    }

    const summary = {
      totalInterviews: interviews.length,
      averageScore: avgScore,
      highestScore: highest,
      lowestScore: lowest,
      skillBreakdown: skillAverages,
      recentInterviews: interviews.slice(0, 5).map(i => ({
        id: i.id,
        type: i.interview_type,
        domain: i.domain,
        score: i.score,
        date: i.created_at
      })),
      performanceRating: avgScore >= 85 ? 'Excellent' :
                         avgScore >= 70 ? 'Good' :
                         avgScore >= 55 ? 'Average' : 'Needs Improvement'
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;