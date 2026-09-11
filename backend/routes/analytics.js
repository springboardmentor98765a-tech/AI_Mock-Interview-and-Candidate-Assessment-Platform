// backend/routes/analytics.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const pool = require('../db');

// =============================================
// GET PERFORMANCE TRENDS
// =============================================
router.get('/trends', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    let dateFilter = '';
    if (timeRange === '7d') dateFilter = `AND created_at >= NOW() - INTERVAL '7 days'`;
    else if (timeRange === '30d') dateFilter = `AND created_at >= NOW() - INTERVAL '30 days'`;
    else if (timeRange === '90d') dateFilter = `AND created_at >= NOW() - INTERVAL '90 days'`;

    const result = await pool.query(
      `SELECT id, score, interview_type, domain, created_at 
       FROM interviews 
       WHERE user_id = $1 AND status = 'completed' ${dateFilter}
       ORDER BY created_at ASC`,
      [req.user.id]
    );

    const trendData = result.rows.map(i => ({
      date: i.created_at,
      score: i.score || 0,
      type: i.interview_type,
      domain: i.domain
    }));

    const scores = trendData.map(t => t.score);
    const summary = {
      total: trendData.length,
      average: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      highest: scores.length > 0 ? Math.max(...scores) : 0,
      lowest: scores.length > 0 ? Math.min(...scores) : 0
    };

    res.json({
      success: true,
      data: { trendData, summary }
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// GET SKILL-WISE ANALYTICS
// =============================================
router.get('/skills', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT feedback FROM interviews 
       WHERE user_id = $1 AND status = 'completed'`,
      [req.user.id]
    );

    const skills = {
      communication: [],
      confidence: [],
      technical: [],
      professionalism: []
    };

    result.rows.forEach(row => {
      let feedback = row.feedback;
      if (typeof feedback === 'string') {
        try { feedback = JSON.parse(feedback); } catch (e) { return; }
      }
      if (!feedback) return;

      if (feedback.communication_clarity) skills.communication.push(feedback.communication_clarity);
      if (feedback.confidence) skills.confidence.push(feedback.confidence);
      if (feedback.technical_accuracy) skills.technical.push(feedback.technical_accuracy);
      if (feedback.professionalism || feedback.professionalism_score) {
        skills.professionalism.push(feedback.professionalism || feedback.professionalism_score);
      }
    });

    const result_data = {};
    for (const [key, values] of Object.entries(skills)) {
      result_data[key] = {
        average: values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0,
        count: values.length,
        max: values.length > 0 ? Math.max(...values) : 0,
        min: values.length > 0 ? Math.min(...values) : 0
      };
    }

    res.json({ success: true, data: result_data });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// GET WEAK AREA PREDICTION
// =============================================
router.get('/weak-areas', auth, async (req, res) => {
  try {
    const skillsRes = await pool.query(
      `SELECT feedback FROM interviews 
       WHERE user_id = $1 AND status = 'completed'`,
      [req.user.id]
    );

    const skills = {
      communication: [],
      confidence: [],
      technical: [],
      professionalism: []
    };

    skillsRes.rows.forEach(row => {
      let feedback = row.feedback;
      if (typeof feedback === 'string') {
        try { feedback = JSON.parse(feedback); } catch (e) { return; }
      }
      if (!feedback) return;

      if (feedback.communication_clarity) skills.communication.push(feedback.communication_clarity);
      if (feedback.confidence) skills.confidence.push(feedback.confidence);
      if (feedback.technical_accuracy) skills.technical.push(feedback.technical_accuracy);
      if (feedback.professionalism || feedback.professionalism_score) {
        skills.professionalism.push(feedback.professionalism || feedback.professionalism_score);
      }
    });

    const weakAreas = [];
    const skillNames = {
      communication: 'Communication Skills',
      confidence: 'Interview Confidence',
      technical: 'Technical Knowledge',
      professionalism: 'Professional Presentation'
    };

    for (const [key, values] of Object.entries(skills)) {
      if (values.length === 0) continue;
      const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      
      if (avg < 70) {
        weakAreas.push({
          skill: skillNames[key],
          score: avg,
          priority: avg < 50 ? 'High' : 'Medium'
        });
      }
    }

    weakAreas.sort((a, b) => a.score - b.score);

    res.json({
      success: true,
      data: {
        weakAreas,
        overallPrediction: weakAreas.length === 0
          ? 'No major weaknesses identified. Continue maintaining your performance.'
          : `Focus on improving: ${weakAreas.map(a => a.skill).join(', ')}`
      }
    });
  } catch (error) {
    console.error('Error fetching weak areas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// GET CANDIDATE RANKINGS (Recruiter/Admin only)
// =============================================
router.get('/rankings', auth, async (req, res) => {
  try {
    if (req.user.role !== 'RECRUITER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT 
        u.id, u.name, u.email,
        COUNT(i.id) as interview_count,
        AVG(i.score) as avg_score,
        MAX(i.score) as highest_score
       FROM users u
       LEFT JOIN interviews i ON u.id = i.user_id AND i.status = 'completed'
       WHERE u.role = 'USER'
       GROUP BY u.id, u.name, u.email
       HAVING AVG(i.score) IS NOT NULL
       ORDER BY avg_score DESC`
    );

    const rankedCandidates = result.rows.map((c, idx) => ({
      rank: idx + 1,
      id: c.id,
      name: c.name,
      email: c.email,
      interviewCount: parseInt(c.interview_count) || 0,
      avgScore: Math.round(c.avg_score || 0),
      highestScore: Math.round(c.highest_score || 0)
    }));

    res.json({
      success: true,
      data: {
        candidates: rankedCandidates,
        totalCandidates: rankedCandidates.length
      }
    });
  } catch (error) {
    console.error('Error fetching rankings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;