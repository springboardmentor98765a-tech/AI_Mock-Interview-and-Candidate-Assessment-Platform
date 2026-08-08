const pool = require('../config/db');
const { generateAssessment, generateQuestions, VALID_CATEGORIES, VALID_DIFFICULTIES } = require('../utils/aiEngine');
const { notify } = require('../utils/notify');

function statusFromScore(score) {
  if (score === null || score === undefined) return null;
  if (score >= 90) return { excellent: true, label: 'Excellent' };
  if (score >= 80) return { good: true, label: 'Good' };
  return { needsWork: true, label: 'Needs Practice' };
}

// ---------------------------------------------------------------
// POST /api/interviews/start (candidate) — runs an instant
// AI-scored mock interview and stores the completed result.
// ---------------------------------------------------------------
async function startInterview(req, res) {
  try {
    const { interviewType, mode } = req.body;
    if (!interviewType) {
      return res.status(400).json({ message: 'interviewType is required' });
    }
    const candidateId = req.user.id;
    const assessment = generateAssessment();

    const result = await pool.query(
      `INSERT INTO interviews
         (candidate_id, interview_type, mode, status, score,
          skill_communication, skill_technical, skill_confidence, skill_problem_solving,
          ai_feedback, scheduled_at, completed_at)
       VALUES ($1, $2, $3, 'completed', $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [
        candidateId,
        interviewType,
        mode === 'offline' ? 'offline' : 'online',
        assessment.score,
        assessment.skillCommunication,
        assessment.skillTechnical,
        assessment.skillConfidence,
        assessment.skillProblemSolving,
        assessment.aiFeedback,
      ]
    );

    await notify({
      userId: candidateId,
      title: 'AI Report Generated',
      message: `Your "${interviewType}" mock interview scored ${assessment.score}%. Report is ready.`,
    });

    return res.status(201).json({ interview: result.rows[0] });
  } catch (err) {
    console.error('Start interview error:', err);
    return res.status(500).json({ message: 'Server error starting interview' });
  }
}

// ---------------------------------------------------------------
// POST /api/interviews/schedule (candidate) — books a future slot,
// which then shows up on coach/recruiter "today's schedule" views.
// ---------------------------------------------------------------
async function scheduleInterview(req, res) {
  try {
    const { interviewType, mode, scheduledAt } = req.body;
    if (!interviewType || !scheduledAt) {
      return res.status(400).json({ message: 'interviewType and scheduledAt are required' });
    }
    const candidateId = req.user.id;

    const result = await pool.query(
      `INSERT INTO interviews (candidate_id, interview_type, mode, status, scheduled_at)
       VALUES ($1, $2, $3, 'scheduled', $4)
       RETURNING *`,
      [candidateId, interviewType, mode === 'offline' ? 'offline' : 'online', scheduledAt]
    );

    await notify({
      role: 'coach',
      title: 'New Session Booked',
      message: `A candidate booked a "${interviewType}" session.`,
    });
    await notify({
      role: 'recruiter',
      title: 'Interview Scheduled',
      message: `A "${interviewType}" interview was scheduled.`,
    });

    return res.status(201).json({ interview: result.rows[0] });
  } catch (err) {
    console.error('Schedule interview error:', err);
    return res.status(500).json({ message: 'Server error scheduling interview' });
  }
}

// ---------------------------------------------------------------
// POST /api/interviews/generate (candidate) — Module 3: AI Interview
// Generation. Creates a new interview session (scheduled "now") and
// generates a set of AI questions for it — HR, Technical, Behavioral,
// Aptitude, or a Mixed set — customized by domain and difficulty.
// ---------------------------------------------------------------
async function generateInterview(req, res) {
  try {
    const { interviewType, category, domain, difficulty, questionCount, mode } = req.body;

    if (!interviewType) {
      return res.status(400).json({ message: 'interviewType is required' });
    }
    const safeCategory = category && ['HR', 'Technical', 'Behavioral', 'Aptitude', 'Mixed'].includes(category)
      ? category
      : 'Mixed';
    const safeDifficulty = difficulty && VALID_DIFFICULTIES.includes(difficulty) ? difficulty : 'medium';
    const safeCount = Math.min(Math.max(Number(questionCount) || 5, 1), 20);

    const candidateId = req.user.id;

    const questions = generateQuestions({
      category: safeCategory,
      difficulty: safeDifficulty,
      domain,
      count: safeCount,
    });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const interviewResult = await client.query(
        `INSERT INTO interviews
           (candidate_id, interview_type, mode, status, domain, difficulty, question_count, scheduled_at)
         VALUES ($1, $2, $3, 'scheduled', $4, $5, $6, NOW())
         RETURNING *`,
        [
          candidateId,
          interviewType,
          mode === 'offline' ? 'offline' : 'online',
          domain || null,
          safeDifficulty,
          questions.length,
        ]
      );
      const interview = interviewResult.rows[0];

      const insertedQuestions = [];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qResult = await client.query(
          `INSERT INTO interview_questions (interview_id, question_text, category, difficulty, sequence_no)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [interview.id, q.text, q.category, q.difficulty, i + 1]
        );
        insertedQuestions.push(qResult.rows[0]);
      }

      await client.query('COMMIT');

      await notify({
        userId: candidateId,
        title: 'Interview Questions Generated',
        message: `${insertedQuestions.length} AI-generated ${safeCategory} questions are ready for your "${interviewType}" session.`,
      });

      return res.status(201).json({ interview, questions: insertedQuestions });
    } catch (innerErr) {
      await client.query('ROLLBACK');
      throw innerErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Generate interview error:', err);
    return res.status(500).json({ message: 'Server error generating interview questions' });
  }
}

// ---------------------------------------------------------------
// GET /api/interviews/:id (owner candidate, or coach/recruiter/admin)
// Returns a single interview session along with its generated
// questions, ordered by sequence.
// ---------------------------------------------------------------
async function getInterviewById(req, res) {
  try {
    const { id } = req.params;

    const interviewResult = await pool.query(`SELECT * FROM interviews WHERE id = $1`, [id]);
    if (interviewResult.rows.length === 0) {
      return res.status(404).json({ message: 'Interview not found' });
    }
    const interview = interviewResult.rows[0];

    const isOwner = interview.candidate_id === req.user.id;
    const isStaff = ['coach', 'recruiter', 'admin'].includes(req.user.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: 'You do not have access to this interview' });
    }

    const questionsResult = await pool.query(
      `SELECT * FROM interview_questions WHERE interview_id = $1 ORDER BY sequence_no ASC`,
      [id]
    );

    return res.status(200).json({ interview, questions: questionsResult.rows });
  } catch (err) {
    console.error('Get interview error:', err);
    return res.status(500).json({ message: 'Server error fetching interview' });
  }
}

// ---------------------------------------------------------------
// PUT /api/interviews/:id (candidate, owner only) — update a
// session that hasn't been completed yet. Changing category,
// domain, or difficulty regenerates the question set.
// ---------------------------------------------------------------
async function updateInterview(req, res) {
  try {
    const { id } = req.params;
    const candidateId = req.user.id;
    const { interviewType, category, domain, difficulty, questionCount, mode, scheduledAt, regenerate } = req.body;

    const existing = await pool.query(
      `SELECT * FROM interviews WHERE id = $1 AND candidate_id = $2`,
      [id, candidateId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Interview not found' });
    }
    if (existing.rows[0].status === 'completed') {
      return res.status(400).json({ message: 'Completed interviews cannot be edited' });
    }

    const current = existing.rows[0];
    const safeDifficulty = difficulty && VALID_DIFFICULTIES.includes(difficulty) ? difficulty : current.difficulty;

    const updateResult = await pool.query(
      `UPDATE interviews
       SET interview_type = $1, mode = $2, domain = $3, difficulty = $4, scheduled_at = COALESCE($5, scheduled_at)
       WHERE id = $6
       RETURNING *`,
      [
        interviewType || current.interview_type,
        mode === 'offline' ? 'offline' : mode === 'online' ? 'online' : current.mode,
        domain !== undefined ? domain : current.domain,
        safeDifficulty,
        scheduledAt || null,
        id,
      ]
    );
    let interview = updateResult.rows[0];
    let questions = null;

    if (regenerate) {
      const safeCategory = category && ['HR', 'Technical', 'Behavioral', 'Aptitude', 'Mixed'].includes(category)
        ? category
        : 'Mixed';
      const safeCount = Math.min(Math.max(Number(questionCount) || current.question_count || 5, 1), 20);
      const newQuestions = generateQuestions({
        category: safeCategory,
        difficulty: safeDifficulty,
        domain: interview.domain,
        count: safeCount,
      });

      await pool.query(`DELETE FROM interview_questions WHERE interview_id = $1`, [id]);
      questions = [];
      for (let i = 0; i < newQuestions.length; i++) {
        const q = newQuestions[i];
        const qResult = await pool.query(
          `INSERT INTO interview_questions (interview_id, question_text, category, difficulty, sequence_no)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [id, q.text, q.category, q.difficulty, i + 1]
        );
        questions.push(qResult.rows[0]);
      }

      const countResult = await pool.query(
        `UPDATE interviews SET question_count = $1 WHERE id = $2 RETURNING *`,
        [questions.length, id]
      );
      interview = countResult.rows[0];
    }

    return res.status(200).json({ interview, questions });
  } catch (err) {
    console.error('Update interview error:', err);
    return res.status(500).json({ message: 'Server error updating interview' });
  }
}

// ---------------------------------------------------------------
// DELETE /api/interviews/:id (candidate, owner only) — remove a
// session (and its generated questions, via ON DELETE CASCADE)
// that hasn't been completed.
// ---------------------------------------------------------------
async function deleteInterview(req, res) {
  try {
    const { id } = req.params;
    const candidateId = req.user.id;

    const existing = await pool.query(
      `SELECT * FROM interviews WHERE id = $1 AND candidate_id = $2`,
      [id, candidateId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Interview not found' });
    }
    if (existing.rows[0].status === 'completed') {
      return res.status(400).json({ message: 'Completed interviews cannot be deleted' });
    }

    await pool.query(`DELETE FROM interviews WHERE id = $1`, [id]);
    return res.status(200).json({ message: 'Interview deleted' });
  } catch (err) {
    console.error('Delete interview error:', err);
    return res.status(500).json({ message: 'Server error deleting interview' });
  }
}

// ---------------------------------------------------------------
// GET /api/interviews/me (candidate) — own history, most recent first
// ---------------------------------------------------------------
async function listMyInterviews(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM interviews WHERE candidate_id = $1 ORDER BY scheduled_at DESC`,
      [req.user.id]
    );
    return res.status(200).json({ interviews: result.rows });
  } catch (err) {
    console.error('List my interviews error:', err);
    return res.status(500).json({ message: 'Server error fetching interviews' });
  }
}

// ---------------------------------------------------------------
// GET /api/interviews/me/stats (candidate) — dashboard stat cards
// ---------------------------------------------------------------
async function myStats(req, res) {
  try {
    const candidateId = req.user.id;
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'completed')                       AS completed_count,
         COALESCE(ROUND(AVG(score) FILTER (WHERE status = 'completed')), 0) AS avg_score,
         COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_at >= NOW()) AS upcoming_count,
         COALESCE(ROUND(AVG(skill_communication) FILTER (WHERE status = 'completed')), 0) AS avg_communication,
         COALESCE(ROUND(AVG(skill_technical) FILTER (WHERE status = 'completed')), 0)      AS avg_technical,
         COALESCE(ROUND(AVG(skill_confidence) FILTER (WHERE status = 'completed')), 0)     AS avg_confidence,
         COALESCE(ROUND(AVG(skill_problem_solving) FILTER (WHERE status = 'completed')), 0) AS avg_problem_solving
       FROM interviews WHERE candidate_id = $1`,
      [candidateId]
    );
    const row = result.rows[0];
    return res.status(200).json({
      stats: {
        mockInterviews: Number(row.completed_count),
        averageScore: Number(row.avg_score),
        reportsGenerated: Number(row.completed_count),
        upcomingInterviews: Number(row.upcoming_count),
        skills: {
          communication: Number(row.avg_communication),
          technical: Number(row.avg_technical),
          confidence: Number(row.avg_confidence),
          problemSolving: Number(row.avg_problem_solving),
        },
      },
    });
  } catch (err) {
    console.error('My stats error:', err);
    return res.status(500).json({ message: 'Server error fetching stats' });
  }
}

// ---------------------------------------------------------------
// GET /api/interviews (coach/recruiter/admin) — everything, with
// optional ?status=scheduled&today=true filters for schedule views
// ---------------------------------------------------------------
async function listAllInterviews(req, res) {
  try {
    const { status, today } = req.query;
    const clauses = [];
    const params = [];

    if (status) {
      params.push(status);
      clauses.push(`i.status = $${params.length}`);
    }
    if (today === 'true') {
      clauses.push(`i.scheduled_at::date = CURRENT_DATE`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT i.*, u.full_name AS candidate_name, u.email AS candidate_email
       FROM interviews i
       JOIN users u ON u.id = i.candidate_id
       ${where}
       ORDER BY i.scheduled_at DESC`,
      params
    );
    return res.status(200).json({ interviews: result.rows });
  } catch (err) {
    console.error('List all interviews error:', err);
    return res.status(500).json({ message: 'Server error fetching interviews' });
  }
}

// ---------------------------------------------------------------
// GET /api/interviews/candidates (coach/recruiter/admin) — one row
// per candidate summarizing their latest completed interview.
// Feeds coach.html "Assigned Candidates" and recruiter.html
// "Recent Candidates" tables.
// ---------------------------------------------------------------
async function listCandidateSummaries(req, res) {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (u.id)
         u.id AS candidate_id, u.full_name, u.email,
         i.id AS latest_interview_id, i.interview_type, i.score, i.status, i.scheduled_at
       FROM users u
       JOIN interviews i ON i.candidate_id = u.id
       WHERE u.role = 'candidate'
       ORDER BY u.id, i.scheduled_at DESC`
    );
    const candidates = result.rows.map((row) => ({
      ...row,
      statusBand: statusFromScore(row.score),
    }));
    return res.status(200).json({ candidates });
  } catch (err) {
    console.error('List candidate summaries error:', err);
    return res.status(500).json({ message: 'Server error fetching candidates' });
  }
}

// ---------------------------------------------------------------
// PATCH /api/interviews/:id/review (coach/recruiter/admin) — attach
// human feedback to a completed interview.
// ---------------------------------------------------------------
async function reviewInterview(req, res) {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ message: 'feedback is required' });
    }

    const result = await pool.query(
      `UPDATE interviews SET coach_feedback = $1, reviewed_by = $2 WHERE id = $3 RETURNING *`,
      [feedback.trim(), req.user.id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    const interview = result.rows[0];
    await notify({
      userId: interview.candidate_id,
      title: 'New Feedback Received',
      message: `${req.user.fullName} left feedback on your "${interview.interview_type}" interview.`,
    });

    return res.status(200).json({ interview });
  } catch (err) {
    console.error('Review interview error:', err);
    return res.status(500).json({ message: 'Server error reviewing interview' });
  }
}

// ---------------------------------------------------------------
// GET /api/interviews/overview (coach/recruiter/admin) — aggregate
// stat-card numbers for those dashboards.
// ---------------------------------------------------------------
async function overviewStats(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(DISTINCT candidate_id)                                             AS total_candidates,
         COUNT(*) FILTER (WHERE status = 'completed')                             AS completed_count,
         COALESCE(ROUND(AVG(score) FILTER (WHERE status = 'completed')), 0)       AS avg_score,
         COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_at::date = CURRENT_DATE) AS today_count,
         COUNT(*) FILTER (WHERE status = 'completed' AND score >= 85)            AS high_score_count,
         COALESCE(ROUND(AVG(skill_communication) FILTER (WHERE status = 'completed')), 0) AS avg_communication,
         COALESCE(ROUND(AVG(skill_technical) FILTER (WHERE status = 'completed')), 0)      AS avg_technical,
         COALESCE(ROUND(AVG(skill_confidence) FILTER (WHERE status = 'completed')), 0)     AS avg_confidence,
         COALESCE(ROUND(AVG(skill_problem_solving) FILTER (WHERE status = 'completed')), 0) AS avg_problem_solving
       FROM interviews`
    );
    const row = result.rows[0];
    const completed = Number(row.completed_count);
    const hiringSuccess = completed > 0 ? Math.round((Number(row.high_score_count) / completed) * 100) : 0;

    return res.status(200).json({
      overview: {
        totalCandidates: Number(row.total_candidates),
        completedCount: completed,
        averageScore: Number(row.avg_score),
        todayCount: Number(row.today_count),
        hiringSuccess,
        skills: {
          communication: Number(row.avg_communication),
          technical: Number(row.avg_technical),
          confidence: Number(row.avg_confidence),
          problemSolving: Number(row.avg_problem_solving),
        },
      },
    });
  } catch (err) {
    console.error('Overview stats error:', err);
    return res.status(500).json({ message: 'Server error fetching overview' });
  }
}

// ---------------------------------------------------------------
// PATCH /api/interviews/:id/attend (candidate) — the candidate has
// arrived for a previously scheduled interview; runs the AI scoring
// now and marks it completed. This is the missing "take my booked
// interview" step — scheduling alone never used to finish a session.
// ---------------------------------------------------------------
async function attendInterview(req, res) {
  try {
    const { id } = req.params;
    const candidateId = req.user.id;

    const existing = await pool.query(
      `SELECT * FROM interviews WHERE id = $1 AND candidate_id = $2`,
      [id, candidateId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Interview not found' });
    }
    if (existing.rows[0].status !== 'scheduled') {
      return res.status(400).json({ message: 'This interview is not in a scheduled state' });
    }

    const assessment = generateAssessment();
    const result = await pool.query(
      `UPDATE interviews
       SET status = 'completed', score = $1,
           skill_communication = $2, skill_technical = $3,
           skill_confidence = $4, skill_problem_solving = $5,
           ai_feedback = $6, completed_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        assessment.score,
        assessment.skillCommunication,
        assessment.skillTechnical,
        assessment.skillConfidence,
        assessment.skillProblemSolving,
        assessment.aiFeedback,
        id,
      ]
    );

    const interview = result.rows[0];
    await notify({
      userId: candidateId,
      title: 'AI Report Generated',
      message: `Your "${interview.interview_type}" interview scored ${interview.score}%. Report is ready.`,
    });

    return res.status(200).json({ interview });
  } catch (err) {
    console.error('Attend interview error:', err);
    return res.status(500).json({ message: 'Server error attending interview' });
  }
}

// ---------------------------------------------------------------
// PATCH /api/interviews/:id/cancel (candidate) — cancel a session
// that's still scheduled (e.g. booked for the wrong time).
// ---------------------------------------------------------------
async function cancelInterview(req, res) {
  try {
    const { id } = req.params;
    const candidateId = req.user.id;

    const result = await pool.query(
      `UPDATE interviews SET status = 'cancelled'
       WHERE id = $1 AND candidate_id = $2 AND status = 'scheduled'
       RETURNING *`,
      [id, candidateId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Scheduled interview not found' });
    }
    return res.status(200).json({ interview: result.rows[0] });
  } catch (err) {
    console.error('Cancel interview error:', err);
    return res.status(500).json({ message: 'Server error cancelling interview' });
  }
}

module.exports = {
  startInterview,
  scheduleInterview,
  generateInterview,
  getInterviewById,
  updateInterview,
  deleteInterview,
  attendInterview,
  cancelInterview,
  listMyInterviews,
  myStats,
  listAllInterviews,
  listCandidateSummaries,
  reviewInterview,
  overviewStats,
};
