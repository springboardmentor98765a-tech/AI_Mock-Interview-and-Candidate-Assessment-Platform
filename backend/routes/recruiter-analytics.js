// backend/routes/recruiter-analytics.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { auth, checkRole } = require('../middleware/auth');

// =============================================
// 1. CANDIDATE COMPARISON - Compare 2-4 candidates
// =============================================
router.post('/compare', auth, checkRole(['RECRUITER', 'ADMIN']), async (req, res) => {
  try {
    const { candidateIds } = req.body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 candidate IDs required for comparison'
      });
    }

    if (candidateIds.length > 4) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 4 candidates can be compared at once'
      });
    }

    const comparisons = [];

    for (const candidateId of candidateIds) {
      // Get candidate basic info
      const userResult = await pool.query(
        'SELECT id, name, email, created_at FROM users WHERE id = $1 AND role = $2',
        [candidateId, 'USER']
      );

      if (userResult.rows.length === 0) continue;

      const user = userResult.rows[0];

      // Get interview stats
      const statsResult = await pool.query(
        `SELECT 
          COUNT(*) as total_interviews,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          AVG(CASE WHEN status = 'completed' THEN score END) as avg_score,
          MAX(CASE WHEN status = 'completed' THEN score END) as highest_score,
          MIN(CASE WHEN status = 'completed' THEN score END) as lowest_score
         FROM interviews 
         WHERE user_id = $1`,
        [candidateId]
      );

      const stats = statsResult.rows[0];

      // Get skill breakdown
      const feedbackResult = await pool.query(
        `SELECT feedback FROM interviews 
         WHERE user_id = $1 AND status = 'completed' AND feedback IS NOT NULL`,
        [candidateId]
      );

      const skills = {
        communication: [],
        confidence: [],
        technical: [],
        professionalism: []
      };

      feedbackResult.rows.forEach(row => {
        let fb = row.feedback;
        if (typeof fb === 'string') {
          try { fb = JSON.parse(fb); } catch (e) { return; }
        }
        if (!fb) return;

        if (fb.communication_clarity) skills.communication.push(fb.communication_clarity);
        if (fb.confidence) skills.confidence.push(fb.confidence);
        if (fb.technical_accuracy) skills.technical.push(fb.technical_accuracy);
        if (fb.professionalism || fb.professionalism_score) {
          skills.professionalism.push(fb.professionalism || fb.professionalism_score);
        }
      });

      const skillAverages = {};
      for (const [key, values] of Object.entries(skills)) {
        skillAverages[key] = values.length > 0
          ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
          : 0;
      }

      comparisons.push({
        id: user.id,
        name: user.name,
        email: user.email,
        joinedDate: user.created_at,
        totalInterviews: parseInt(stats.total_interviews) || 0,
        completedInterviews: parseInt(stats.completed) || 0,
        avgScore: Math.round(stats.avg_score || 0),
        highestScore: Math.round(stats.highest_score || 0),
        lowestScore: Math.round(stats.lowest_score || 0),
        skills: skillAverages,
        overallRating: (stats.avg_score || 0) >= 85 ? 'Excellent' :
                       (stats.avg_score || 0) >= 70 ? 'Good' :
                       (stats.avg_score || 0) >= 55 ? 'Average' : 'Needs Improvement'
      });
    }

    // Calculate winner in each category
    const winners = {
      avgScore: comparisons.reduce((max, c) => c.avgScore > (max?.avgScore || 0) ? c : max, null)?.id,
      highestScore: comparisons.reduce((max, c) => c.highestScore > (max?.highestScore || 0) ? c : max, null)?.id,
      totalInterviews: comparisons.reduce((max, c) => c.totalInterviews > (max?.totalInterviews || 0) ? c : max, null)?.id,
      communication: comparisons.reduce((max, c) => c.skills.communication > (max?.skills?.communication || 0) ? c : max, null)?.id,
      confidence: comparisons.reduce((max, c) => c.skills.confidence > (max?.skills?.confidence || 0) ? c : max, null)?.id,
      technical: comparisons.reduce((max, c) => c.skills.technical > (max?.skills?.technical || 0) ? c : max, null)?.id,
      professionalism: comparisons.reduce((max, c) => c.skills.professionalism > (max?.skills?.professionalism || 0) ? c : max, null)?.id
    };

    res.json({
      success: true,
      data: {
        candidates: comparisons,
        winners,
        comparedCount: comparisons.length
      }
    });

  } catch (error) {
    console.error('Error comparing candidates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// 2. SKILL-WISE ANALYTICS (All candidates)
// =============================================
router.get('/skills-overview', auth, checkRole(['RECRUITER', 'ADMIN']), async (req, res) => {
  try {
    // Get all completed interviews with feedback
    const result = await pool.query(
      `SELECT u.id as user_id, u.name, u.email, i.feedback, i.score, i.interview_type, i.domain
       FROM users u
       INNER JOIN interviews i ON u.id = i.user_id
       WHERE u.role = 'USER' AND i.status = 'completed' AND i.feedback IS NOT NULL
       ORDER BY i.created_at DESC`
    );

    // Aggregate by candidate
    const candidateSkills = {};

    result.rows.forEach(row => {
      let fb = row.feedback;
      if (typeof fb === 'string') {
        try { fb = JSON.parse(fb); } catch (e) { return; }
      }
      if (!fb) return;

      if (!candidateSkills[row.user_id]) {
        candidateSkills[row.user_id] = {
          id: row.user_id,
          name: row.name,
          email: row.email,
          skills: {
            communication: [],
            confidence: [],
            technical: [],
            professionalism: []
          }
        };
      }

      if (fb.communication_clarity) candidateSkills[row.user_id].skills.communication.push(fb.communication_clarity);
      if (fb.confidence) candidateSkills[row.user_id].skills.confidence.push(fb.confidence);
      if (fb.technical_accuracy) candidateSkills[row.user_id].skills.technical.push(fb.technical_accuracy);
      if (fb.professionalism || fb.professionalism_score) {
        candidateSkills[row.user_id].skills.professionalism.push(fb.professionalism || fb.professionalism_score);
      }
    });

    // Calculate averages
    const candidates = Object.values(candidateSkills).map(c => {
      const averages = {};
      for (const [key, values] of Object.entries(c.skills)) {
        averages[key] = values.length > 0
          ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
          : 0;
      }
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        skills: averages
      };
    });

    // Calculate overall averages
    const overall = {
      communication: 0,
      confidence: 0,
      technical: 0,
      professionalism: 0
    };

    if (candidates.length > 0) {
      Object.keys(overall).forEach(skill => {
        const sum = candidates.reduce((acc, c) => acc + (c.skills[skill] || 0), 0);
        overall[skill] = Math.round(sum / candidates.length);
      });
    }

    // Identify top performers per skill
    const topPerformers = {};
    Object.keys(overall).forEach(skill => {
      const sorted = [...candidates].sort((a, b) => (b.skills[skill] || 0) - (a.skills[skill] || 0));
      topPerformers[skill] = sorted.slice(0, 3).map(c => ({
        id: c.id,
        name: c.name,
        score: c.skills[skill]
      }));
    });

    res.json({
      success: true,
      data: {
        candidates,
        overall,
        topPerformers,
        totalCandidates: candidates.length
      }
    });

  } catch (error) {
    console.error('Error fetching skills overview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// 3. PERFORMANCE TRENDS (Recruiter view)
// =============================================
router.get('/trends', auth, checkRole(['RECRUITER', 'ADMIN']), async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;

    let dateFilter = '';
    if (timeRange === '7d') dateFilter = `AND i.created_at >= NOW() - INTERVAL '7 days'`;
    else if (timeRange === '30d') dateFilter = `AND i.created_at >= NOW() - INTERVAL '30 days'`;
    else if (timeRange === '90d') dateFilter = `AND i.created_at >= NOW() - INTERVAL '90 days'`;

    // Get daily aggregated stats
    const result = await pool.query(
      `SELECT 
        DATE(i.created_at) as date,
        COUNT(*) as interviews_count,
        AVG(i.score) as avg_score,
        COUNT(DISTINCT i.user_id) as unique_candidates
       FROM interviews i
       INNER JOIN users u ON i.user_id = u.id
       WHERE u.role = 'USER' AND i.status = 'completed' ${dateFilter}
       GROUP BY DATE(i.created_at)
       ORDER BY date ASC`
    );

    // Get top performing candidates by trend
    const topCandidatesResult = await pool.query(
      `SELECT 
        u.id, u.name, u.email,
        AVG(i.score) as avg_score,
        COUNT(i.id) as interview_count,
        MAX(i.created_at) as last_interview
       FROM users u
       INNER JOIN interviews i ON u.id = i.user_id
       WHERE u.role = 'USER' AND i.status = 'completed' ${dateFilter}
       GROUP BY u.id, u.name, u.email
       HAVING AVG(i.score) >= 70
       ORDER BY avg_score DESC
       LIMIT 5`
    );

    // Get domain-wise performance
    const domainResult = await pool.query(
      `SELECT 
        i.domain,
        COUNT(*) as count,
        AVG(i.score) as avg_score
       FROM interviews i
       INNER JOIN users u ON i.user_id = u.id
       WHERE u.role = 'USER' AND i.status = 'completed' ${dateFilter}
       GROUP BY i.domain
       ORDER BY avg_score DESC`
    );

    // Get type-wise performance
    const typeResult = await pool.query(
      `SELECT 
        i.interview_type,
        COUNT(*) as count,
        AVG(i.score) as avg_score
       FROM interviews i
       INNER JOIN users u ON i.user_id = u.id
       WHERE u.role = 'USER' AND i.status = 'completed' ${dateFilter}
       GROUP BY i.interview_type
       ORDER BY avg_score DESC`
    );

    res.json({
      success: true,
      data: {
        dailyTrends: result.rows.map(r => ({
          date: r.date,
          interviews: parseInt(r.interviews_count) || 0,
          avgScore: Math.round(r.avg_score || 0),
          uniqueCandidates: parseInt(r.unique_candidates) || 0
        })),
        topPerformers: topCandidatesResult.rows.map(r => ({
          id: r.id,
          name: r.name,
          email: r.email,
          avgScore: Math.round(r.avg_score || 0),
          interviewCount: parseInt(r.interview_count) || 0,
          lastInterview: r.last_interview
        })),
        domainPerformance: domainResult.rows.map(r => ({
          domain: r.domain,
          count: parseInt(r.count) || 0,
          avgScore: Math.round(r.avg_score || 0)
        })),
        typePerformance: typeResult.rows.map(r => ({
          type: r.interview_type,
          count: parseInt(r.count) || 0,
          avgScore: Math.round(r.avg_score || 0)
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// 4. SHORTLIST INSIGHTS
// =============================================
router.get('/shortlist-insights', auth, checkRole(['RECRUITER', 'ADMIN']), async (req, res) => {
  try {
    // Shortlist summary
    const summaryResult = await pool.query(
      `SELECT 
        COUNT(DISTINCT candidate_id) as total_shortlisted,
        COUNT(DISTINCT recruiter_id) as recruiters_active
       FROM shortlist
       WHERE recruiter_id = $1`,
      [req.user.id]
    );

    // Shortlisted candidates with scores
    const shortlistedResult = await pool.query(
      `SELECT 
        u.id, u.name, u.email,
        AVG(i.score) as avg_score,
        COUNT(i.id) as interview_count,
        s.created_at as shortlisted_at,
        s.notes
       FROM shortlist s
       INNER JOIN users u ON s.candidate_id = u.id
       LEFT JOIN interviews i ON u.id = i.user_id AND i.status = 'completed'
       WHERE s.recruiter_id = $1
       GROUP BY u.id, u.name, u.email, s.created_at, s.notes
       ORDER BY avg_score DESC NULLS LAST`,
      [req.user.id]
    );

    // Compare shortlisted vs non-shortlisted average
    const comparisonResult = await pool.query(
      `SELECT 
        CASE 
          WHEN EXISTS (SELECT 1 FROM shortlist s WHERE s.candidate_id = u.id AND s.recruiter_id = $1) 
          THEN 'shortlisted' 
          ELSE 'not_shortlisted' 
        END as status,
        AVG(i.score) as avg_score,
        COUNT(DISTINCT u.id) as candidate_count
       FROM users u
       INNER JOIN interviews i ON u.id = i.user_id
       WHERE u.role = 'USER' AND i.status = 'completed'
       GROUP BY status`,
      [req.user.id]
    );

    const comparison = {
      shortlisted: { avgScore: 0, count: 0 },
      notShortlisted: { avgScore: 0, count: 0 }
    };

    comparisonResult.rows.forEach(row => {
      if (row.status === 'shortlisted') {
        comparison.shortlisted = {
          avgScore: Math.round(row.avg_score || 0),
          count: parseInt(row.candidate_count) || 0
        };
      } else {
        comparison.notShortlisted = {
          avgScore: Math.round(row.avg_score || 0),
          count: parseInt(row.candidate_count) || 0
        };
      }
    });

    res.json({
      success: true,
      data: {
        totalShortlisted: parseInt(summaryResult.rows[0]?.total_shortlisted) || 0,
        shortlistedCandidates: shortlistedResult.rows.map(r => ({
          id: r.id,
          name: r.name,
          email: r.email,
          avgScore: Math.round(r.avg_score || 0),
          interviewCount: parseInt(r.interview_count) || 0,
          shortlistedAt: r.shortlisted_at,
          notes: r.notes
        })),
        comparison
      }
    });

  } catch (error) {
    console.error('Error fetching shortlist insights:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;