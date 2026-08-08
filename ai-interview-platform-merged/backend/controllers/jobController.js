const pool = require('../config/db');

// GET /api/jobs — list all job openings, newest first
async function listJobs(req, res) {
  try {
    const result = await pool.query(`SELECT * FROM job_openings ORDER BY created_at DESC`);
    return res.status(200).json({ jobs: result.rows });
  } catch (err) {
    console.error('List jobs error:', err);
    return res.status(500).json({ message: 'Server error fetching jobs' });
  }
}

// POST /api/jobs — recruiter/admin creates a job opening
async function createJob(req, res) {
  try {
    const { title, department, positions } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'title is required' });
    }
    const result = await pool.query(
      `INSERT INTO job_openings (title, department, positions, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, department || null, Number(positions) > 0 ? Number(positions) : 1, req.user.id]
    );
    return res.status(201).json({ job: result.rows[0] });
  } catch (err) {
    console.error('Create job error:', err);
    return res.status(500).json({ message: 'Server error creating job' });
  }
}

// PATCH /api/jobs/:id/status — toggle open/closed
async function toggleJobStatus(req, res) {
  try {
    const { id } = req.params;
    const { isOpen } = req.body;
    const result = await pool.query(
      `UPDATE job_openings SET is_open = $1 WHERE id = $2 RETURNING *`,
      [Boolean(isOpen), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }
    return res.status(200).json({ job: result.rows[0] });
  } catch (err) {
    console.error('Toggle job error:', err);
    return res.status(500).json({ message: 'Server error updating job' });
  }
}

module.exports = { listJobs, createJob, toggleJobStatus };
