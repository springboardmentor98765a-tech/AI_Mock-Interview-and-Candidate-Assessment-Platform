// backend/routes/recruiter.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { auth, checkRole } = require('../middleware/auth');

// =============================================
// GET ALL CANDIDATES WITH THEIR INTERVIEW DATA
// =============================================
router.get('/candidates', auth, checkRole(['RECRUITER', 'ADMIN']), async (req, res) => {
  try {
    const { search, status, sortBy = 'avg_score', sortOrder = 'DESC' } = req.query;

    // Base query: Get all users with USER role and their interview data
    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.created_at as joined_date,
        COUNT(DISTINCT i.id) as total_interviews,
        COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) as completed_interviews,
        AVG(CASE WHEN i.status = 'completed' THEN i.score END) as avg_score,
        MAX(CASE WHEN i.status = 'completed' THEN i.score END) as highest_score,
        MIN(CASE WHEN i.status = 'completed' THEN i.score END) as lowest_score,
        MAX(CASE WHEN i.status = 'completed' THEN i.created_at END) as last_interview_date,
        COUNT(DISTINCT CASE WHEN i.status = 'in_progress' THEN i.id END) as active_sessions,
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', i2.id,
              'type', i2.interview_type,
              'domain', i2.domain,
              'difficulty', i2.difficulty,
              'score', i2.score,
              'status', i2.status,
              'created_at', i2.created_at,
              'feedback', i2.feedback
            )
            ORDER BY i2.created_at DESC
          )
          FROM interviews i2
          WHERE i2.user_id = u.id AND i2.status = 'completed'
          LIMIT 5
        ) as recent_interviews
      FROM users u
      LEFT JOIN interviews i ON u.id = i.user_id
      WHERE u.role = 'USER'
    `;

    const params = [];
    let paramIndex = 1;

    // Add search filter
    if (search) {
      query += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add status filter
    if (status) {
      if (status === 'active') {
        query += ` AND EXISTS (SELECT 1 FROM interviews i2 WHERE i2.user_id = u.id AND i2.status IN ('in_progress', 'pending'))`;
      } else if (status === 'completed') {
        query += ` AND EXISTS (SELECT 1 FROM interviews i2 WHERE i2.user_id = u.id AND i2.status = 'completed')`;
      } else if (status === 'new') {
        query += ` AND NOT EXISTS (SELECT 1 FROM interviews i2 WHERE i2.user_id = u.id AND i2.status = 'completed')`;
      }
    }

    // Group by user
    query += ` GROUP BY u.id, u.name, u.email, u.created_at`;

    // Order by
    const validSortColumns = ['avg_score', 'total_interviews', 'completed_interviews', 'joined_date', 'name', 'last_interview_date'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'avg_score';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${order}, u.name ASC`;

    const result = await pool.query(query, params);

    // Process each candidate's data
    const candidates = result.rows.map(candidate => ({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      joinedDate: candidate.joined_date,
      totalInterviews: parseInt(candidate.total_interviews) || 0,
      completedInterviews: parseInt(candidate.completed_interviews) || 0,
      avgScore: Math.round(candidate.avg_score || 0),
      highestScore: Math.round(candidate.highest_score || 0),
      lowestScore: Math.round(candidate.lowest_score || 0),
      lastInterviewDate: candidate.last_interview_date,
      activeSessions: parseInt(candidate.active_sessions) || 0,
      recentInterviews: candidate.recent_interviews || [],
      status: candidate.completed_interviews > 0 ? 'completed' : 
              candidate.active_sessions > 0 ? 'active' : 'new'
    }));

    // Calculate ranking
    const rankedCandidates = candidates.map((c, index) => ({
      ...c,
      rank: index + 1,
      percentile: candidates.length > 0 
        ? Math.round(((candidates.length - index) / candidates.length) * 100) 
        : 0
    }));

    // Get summary stats
    const summary = {
      totalCandidates: candidates.length,
      activeCandidates: candidates.filter(c => c.activeSessions > 0).length,
      completedCandidates: candidates.filter(c => c.completedInterviews > 0).length,
      newCandidates: candidates.filter(c => c.status === 'new').length,
      averageScore: candidates.length > 0 
        ? Math.round(candidates.reduce((sum, c) => sum + c.avgScore, 0) / candidates.length) 
        : 0,
      topPerformer: candidates.length > 0 ? candidates[0] : null,
      totalInterviews: candidates.reduce((sum, c) => sum + c.totalInterviews, 0),
      completedInterviews: candidates.reduce((sum, c) => sum + c.completedInterviews, 0)
    };

    res.json({
      success: true,
      data: {
        candidates: rankedCandidates,
        summary,
        filters: {
          search: search || '',
          status: status || 'all'
        }
      }
    });

  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch candidates',
      details: error.message 
    });
  }
});

// =============================================
// GET CANDIDATE DETAILS
// =============================================
router.get('/candidates/:id', auth, checkRole(['RECRUITER', 'ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;

    // Get candidate details
    const userResult = await pool.query(
      `SELECT id, name, email, role, created_at 
       FROM users 
       WHERE id = $1 AND role = 'USER'`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Candidate not found' 
      });
    }

    const candidate = userResult.rows[0];

    // Get all interviews
    const interviewsResult = await pool.query(
      `SELECT 
        id, interview_type, domain, difficulty, 
        score, status, feedback, 
        created_at, start_time, end_time,
        submission_type,
        communication_score,
        confidence_score,
        technical_score,
        professionalism_score
       FROM interviews 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [id]
    );

    // Process interviews
    const interviews = interviewsResult.rows.map(interview => {
      let feedback = interview.feedback;
      if (typeof feedback === 'string') {
        try { feedback = JSON.parse(feedback); } catch (e) { feedback = null; }
      }
      
      return {
        id: interview.id,
        type: interview.interview_type,
        domain: interview.domain,
        difficulty: interview.difficulty,
        score: interview.score,
        status: interview.status,
        feedback: feedback,
        submissionType: interview.submission_type || 'full',
        communicationScore: interview.communication_score,
        confidenceScore: interview.confidence_score,
        technicalScore: interview.technical_score,
        professionalismScore: interview.professionalism_score,
        createdAt: interview.created_at,
        startTime: interview.start_time,
        endTime: interview.end_time
      };
    });

    // Calculate stats
    const completed = interviews.filter(i => i.status === 'completed' && i.score);
    const scores = completed.map(i => i.score);
    
    const stats = {
      totalInterviews: interviews.length,
      completedInterviews: completed.length,
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      activeSessions: interviews.filter(i => i.status === 'in_progress' || i.status === 'pending').length
    };

    // Get skill breakdown from feedback
    const skillBreakdown = {
      communication: { scores: [], count: 0 },
      confidence: { scores: [], count: 0 },
      technical: { scores: [], count: 0 },
      professionalism: { scores: [], count: 0 }
    };

    completed.forEach(i => {
      if (i.feedback) {
        if (i.feedback.communication_clarity !== undefined) {
          skillBreakdown.communication.scores.push(i.feedback.communication_clarity);
          skillBreakdown.communication.count++;
        }
        if (i.feedback.confidence !== undefined) {
          skillBreakdown.confidence.scores.push(i.feedback.confidence);
          skillBreakdown.confidence.count++;
        }
        if (i.feedback.technical_accuracy !== undefined) {
          skillBreakdown.technical.scores.push(i.feedback.technical_accuracy);
          skillBreakdown.technical.count++;
        }
        if (i.feedback.professionalism !== undefined || i.feedback.professionalism_score !== undefined) {
          const prof = i.feedback.professionalism || i.feedback.professionalism_score || 0;
          skillBreakdown.professionalism.scores.push(prof);
          skillBreakdown.professionalism.count++;
        }
      }
    });

    const skills = {};
    for (const [key, data] of Object.entries(skillBreakdown)) {
      skills[key] = {
        average: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0,
        count: data.count,
        max: data.scores.length > 0 ? Math.max(...data.scores) : 0,
        min: data.scores.length > 0 ? Math.min(...data.scores) : 0
      };
    }

    res.json({
      success: true,
      data: {
        candidate: {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          joinedAt: candidate.created_at,
          role: candidate.role
        },
        stats,
        interviews,
        skills,
        summary: {
          totalScore: stats.avgScore,
          rating: stats.avgScore >= 85 ? 'Excellent' :
                  stats.avgScore >= 70 ? 'Good' :
                  stats.avgScore >= 55 ? 'Average' : 'Needs Improvement'
        }
      }
    });

  } catch (error) {
    console.error('Error fetching candidate details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch candidate details',
      details: error.message 
    });
  }
});

// =============================================
// SHORTLIST CANDIDATE
// =============================================
router.post('/candidates/:id/shortlist', auth, checkRole(['RECRUITER', 'ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes = '' } = req.body;

    // Check if user exists and is a candidate
    const userResult = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1 AND role = $2',
      [id, 'USER']
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Candidate not found' 
      });
    }

    // Create or update shortlist entry
    const result = await pool.query(
      `INSERT INTO shortlist (candidate_id, recruiter_id, notes, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (candidate_id, recruiter_id) 
       DO UPDATE SET notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, req.user.id, notes]
    );

    res.json({
      success: true,
      data: {
        message: 'Candidate shortlisted successfully',
        shortlist: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Error shortlisting candidate:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to shortlist candidate',
      details: error.message 
    });
  }
});

// =============================================
// REMOVE FROM SHORTLIST
// =============================================
router.delete('/candidates/:id/shortlist', auth, checkRole(['RECRUITER', 'ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM shortlist WHERE candidate_id = $1 AND recruiter_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Candidate not in shortlist' 
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Candidate removed from shortlist'
      }
    });

  } catch (error) {
    console.error('Error removing from shortlist:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove from shortlist',
      details: error.message 
    });
  }
});

// =============================================
// GET SHORTLISTED CANDIDATES
// =============================================
router.get('/shortlist', auth, checkRole(['RECRUITER', 'ADMIN']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        s.candidate_id,
        s.notes,
        s.created_at as shortlisted_at,
        u.name,
        u.email,
        (
          SELECT AVG(score) 
          FROM interviews 
          WHERE user_id = u.id AND status = 'completed'
        ) as avg_score,
        (
          SELECT COUNT(*) 
          FROM interviews 
          WHERE user_id = u.id AND status = 'completed'
        ) as completed_interviews
       FROM shortlist s
       JOIN users u ON s.candidate_id = u.id
       WHERE s.recruiter_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );

    const shortlist = result.rows.map(item => ({
      candidateId: item.candidate_id,
      name: item.name,
      email: item.email,
      avgScore: Math.round(item.avg_score || 0),
      completedInterviews: parseInt(item.completed_interviews) || 0,
      notes: item.notes,
      shortlistedAt: item.shortlisted_at
    }));

    res.json({
      success: true,
      data: {
        shortlist,
        total: shortlist.length
      }
    });

  } catch (error) {
    console.error('Error fetching shortlist:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch shortlist',
      details: error.message 
    });
  }
});

module.exports = router;