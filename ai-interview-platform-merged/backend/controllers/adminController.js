const pool = require('../config/db');
const settingsStore = require('../utils/settingsStore');

// GET /api/admin/stats — admin dashboard stat-card numbers
async function getStats(req, res) {
  try {
    const usersResult = await pool.query(
      `SELECT
         COUNT(*)                                    AS total_users,
         COUNT(*) FILTER (WHERE role = 'candidate')  AS candidates,
         COUNT(*) FILTER (WHERE role = 'recruiter')  AS recruiters,
         COUNT(*) FILTER (WHERE role = 'coach')      AS coaches
       FROM users`
    );
    const interviewsResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'completed')                                   AS reports_generated,
         COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)                        AS created_today
       FROM interviews`
    );
    const usersToday = await pool.query(
      `SELECT COUNT(*) AS new_today FROM users WHERE created_at::date = CURRENT_DATE`
    );

    const u = usersResult.rows[0];
    const i = interviewsResult.rows[0];

    return res.status(200).json({
      stats: {
        totalUsers: Number(u.total_users),
        candidates: Number(u.candidates),
        recruiters: Number(u.recruiters),
        coaches: Number(u.coaches),
        reportsGenerated: Number(i.reports_generated),
        newUsersToday: Number(usersToday.rows[0].new_today),
      },
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ message: 'Server error fetching admin stats' });
  }
}

// ============================================================
// Interview Management — GET /api/admin/interviews
// Platform-wide view across every candidate (unlike a candidate's own
// /interviews/me), with optional ?status= and ?search= filters, feeding
// the admin dashboard's "Interview Management" table.
// ============================================================
async function getInterviews(req, res) {
  try {
    const { status, search } = req.query;
    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`i.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR i.interview_type ILIKE $${params.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT i.id, i.interview_type, i.status, i.score, i.mode, i.scheduled_at, i.created_at,
              u.id AS candidate_id, u.full_name AS candidate_name, u.email AS candidate_email
       FROM interviews i
       JOIN users u ON u.id = i.candidate_id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT 300`,
      params
    );
    res.status(200).json({ interviews: result.rows });
  } catch (err) {
    console.error('Admin list interviews error:', err);
    res.status(500).json({ message: 'Server error fetching interviews' });
  }
}

// DELETE /api/admin/interviews/:id — admin override: unlike a candidate's
// own DELETE /api/interviews/:id (Python service), this can remove an
// interview in ANY status, including completed. Questions/answers cascade
// via the FK's ON DELETE CASCADE.
async function forceDeleteInterview(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM interviews WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Interview not found' });
    }
    res.status(200).json({ message: 'Interview deleted' });
  } catch (err) {
    console.error('Admin delete interview error:', err);
    res.status(500).json({ message: 'Server error deleting interview' });
  }
}

// ============================================================
// Platform Analytics — GET /api/admin/analytics
// Real computed metrics (replaces the old hardcoded 89% / 91% / 99% on
// admin.html).
// ============================================================
async function getAnalytics(req, res) {
  try {
    const totals = await pool.query(`
      SELECT
        COUNT(*)                                                     AS total_interviews,
        COUNT(*) FILTER (WHERE status = 'completed')                 AS completed_interviews,
        COUNT(*) FILTER (WHERE status = 'scheduled')                 AS scheduled_interviews,
        COUNT(*) FILTER (WHERE status = 'cancelled')                 AS cancelled_interviews,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS interviews_this_week,
        ROUND(AVG(score) FILTER (WHERE status = 'completed'), 1)     AS average_score
      FROM interviews
    `);
    const userActivity = await pool.query(`
      SELECT
        COUNT(*)                                                     AS total_users,
        COUNT(*) FILTER (WHERE is_active)                            AS active_users,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_users_this_week
      FROM users
    `);
    const byType = await pool.query(`
      SELECT interview_type, COUNT(*) AS count
      FROM interviews
      GROUP BY interview_type
      ORDER BY count DESC
      LIMIT 6
    `);

    const t = totals.rows[0];
    const u = userActivity.rows[0];
    const totalInterviews = Number(t.total_interviews);
    const completedInterviews = Number(t.completed_interviews);
    const totalUsers = Number(u.total_users);
    const activeUsers = Number(u.active_users);

    res.status(200).json({
      analytics: {
        totalInterviews,
        completedInterviews,
        scheduledInterviews: Number(t.scheduled_interviews),
        cancelledInterviews: Number(t.cancelled_interviews),
        interviewsThisWeek: Number(t.interviews_this_week),
        averageScore: t.average_score !== null ? Number(t.average_score) : 0,
        completionRate: totalInterviews > 0 ? Math.round((completedInterviews / totalInterviews) * 100) : 0,
        totalUsers,
        activeUsers,
        activeUserRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
        newUsersThisWeek: Number(u.new_users_this_week),
        interviewsByType: byType.rows.map((r) => ({ type: r.interview_type, count: Number(r.count) })),
      },
    });
  } catch (err) {
    console.error('Admin analytics error:', err);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
}

// ============================================================
// System Settings — GET/PATCH /api/admin/settings
// ============================================================
async function getSettings(req, res) {
  try {
    const settings = await settingsStore.getAllSettings();
    res.status(200).json({
      settings: {
        allowRegistrations: settings.allow_registrations === 'true',
        maintenanceMode: settings.maintenance_mode === 'true',
      },
    });
  } catch (err) {
    console.error('Admin get settings error:', err);
    res.status(500).json({ message: 'Server error fetching settings' });
  }
}

async function updateSettings(req, res) {
  try {
    const { allowRegistrations, maintenanceMode } = req.body;
    if (typeof allowRegistrations === 'boolean') {
      await settingsStore.setSetting('allow_registrations', allowRegistrations);
    }
    if (typeof maintenanceMode === 'boolean') {
      await settingsStore.setSetting('maintenance_mode', maintenanceMode);
    }
    res.status(200).json({ message: 'Settings updated' });
  } catch (err) {
    console.error('Admin update settings error:', err);
    res.status(500).json({ message: 'Server error updating settings' });
  }
}

module.exports = {
  getStats,
  getInterviews,
  forceDeleteInterview,
  getAnalytics,
  getSettings,
  updateSettings,
};
