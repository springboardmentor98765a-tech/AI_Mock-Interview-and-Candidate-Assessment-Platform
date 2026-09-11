// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { auth, checkRole } = require('../middleware/auth');

// Apply admin check to all routes in this file
router.use(auth);
router.use(checkRole(['ADMIN']));

// =============================================
// 1. USER MANAGEMENT
// =============================================

// Get all users with filters
router.get('/users', async (req, res) => {
  try {
    const { role, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        u.id, u.name, u.email, u.role, u.provider, u.created_at,
        COUNT(DISTINCT i.id) as total_interviews,
        COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as completed_interviews,
        AVG(CASE WHEN i.status = 'completed' THEN i.score END) as avg_score
      FROM users u
      LEFT JOIN interviews i ON u.id = i.user_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (role && role !== 'ALL') {
      query += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (search) {
      query += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const totalCount = parseInt(countResult.rows[0].count);

    // Get role counts
    const roleCountResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE role = 'USER') as users,
        COUNT(*) FILTER (WHERE role = 'RECRUITER') as recruiters,
        COUNT(*) FILTER (WHERE role = 'ADMIN') as admins
      FROM users
    `);

    res.json({
      success: true,
      data: {
        users: result.rows.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          provider: u.provider,
          joinedAt: u.created_at,
          totalInterviews: parseInt(u.total_interviews) || 0,
          completedInterviews: parseInt(u.completed_interviews) || 0,
          avgScore: Math.round(u.avg_score || 0)
        })),
        totalCount,
        roleCounts: {
          users: parseInt(roleCountResult.rows[0].users),
          recruiters: parseInt(roleCountResult.rows[0].recruiters),
          admins: parseInt(roleCountResult.rows[0].admins)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user role
router.put('/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const validRoles = ['USER', 'RECRUITER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const result = await pool.query(
      `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 RETURNING id, name, email, role`,
      [role, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Log activity
    await logAdminActivity(req.user.id, 'role_change', `Changed user ${userId} role to ${role}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: `User role updated to ${role}`
    });

  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent deleting self
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, name, email',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await logAdminActivity(req.user.id, 'user_delete', `Deleted user ${result.rows[0].email}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// 2. INTERVIEW ACTIVITY MONITORING
// =============================================
router.get('/interviews/activity', async (req, res) => {
  try {
    const { limit = 30 } = req.query;

    // Recent interviews
    const recentResult = await pool.query(`
      SELECT 
        i.id, i.user_id, i.interview_type, i.domain, i.difficulty,
        i.status, i.score, i.created_at, i.start_time, i.end_time,
        u.name as candidate_name, u.email as candidate_email
      FROM interviews i
      INNER JOIN users u ON i.user_id = u.id
      ORDER BY i.created_at DESC
      LIMIT $1
    `, [parseInt(limit)]);

    // Live sessions (in progress or paused)
    const liveResult = await pool.query(`
      SELECT 
        i.id, i.user_id, i.interview_type, i.domain, i.status,
        i.start_time, u.name as candidate_name
      FROM interviews i
      INNER JOIN users u ON i.user_id = u.id
      WHERE i.status IN ('in_progress', 'paused')
      ORDER BY i.start_time DESC
    `);

    // Today's stats
    const todayStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        AVG(CASE WHEN status = 'completed' THEN score END) as avg_score
      FROM interviews
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    res.json({
      success: true,
      data: {
        recentInterviews: recentResult.rows.map(i => ({
          id: i.id,
          candidate: i.candidate_name,
          email: i.candidate_email,
          type: i.interview_type,
          domain: i.domain,
          difficulty: i.difficulty,
          status: i.status,
          score: i.score,
          createdAt: i.created_at,
          startedAt: i.start_time,
          endedAt: i.end_time
        })),
        liveSessions: liveResult.rows.map(i => ({
          id: i.id,
          candidate: i.candidate_name,
          type: i.interview_type,
          domain: i.domain,
          status: i.status,
          startTime: i.start_time,
          duration: i.start_time ? Math.floor((Date.now() - new Date(i.start_time)) / 1000) : 0
        })),
        todayStats: {
          total: parseInt(todayStatsResult.rows[0].total) || 0,
          completed: parseInt(todayStatsResult.rows[0].completed) || 0,
          inProgress: parseInt(todayStatsResult.rows[0].in_progress) || 0,
          avgScore: Math.round(todayStatsResult.rows[0].avg_score || 0)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching interview activity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// 3. AI PERFORMANCE MONITORING
// =============================================
router.get('/ai-performance', async (req, res) => {
  try {
    // Scoring stats
    const scoringResult = await pool.query(`
      SELECT 
        COUNT(*) as total_scored,
        AVG(score) as avg_score,
        MIN(score) as min_score,
        MAX(score) as max_score,
        STDDEV(score) as stddev_score
      FROM interviews
      WHERE status = 'completed' AND score IS NOT NULL
    `);

    // Score distribution
    const distributionResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN score >= 90 THEN 1 END) as excellent,
        COUNT(CASE WHEN score >= 75 AND score < 90 THEN 1 END) as good,
        COUNT(CASE WHEN score >= 60 AND score < 75 THEN 1 END) as average,
        COUNT(CASE WHEN score >= 40 AND score < 60 THEN 1 END) as needs_improvement,
        COUNT(CASE WHEN score < 40 THEN 1 END) as poor
      FROM interviews
      WHERE status = 'completed' AND score IS NOT NULL
    `);

    // ML API health check
    let mlApiStatus = 'offline';
    try {
      const mlResponse = await fetch('http://localhost:5002/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (mlResponse.ok) mlApiStatus = 'online';
    } catch (e) {
      mlApiStatus = 'offline';
    }

    // Feedback generation stats
    const feedbackResult = await pool.query(`
      SELECT 
        COUNT(*) as total_feedback,
        COUNT(CASE WHEN feedback IS NOT NULL THEN 1 END) as with_feedback
      FROM interviews
      WHERE status = 'completed'
    `);

    // Session alert stats
    const alertsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN type = 'interview_reminder' THEN 1 END) as reminders,
        COUNT(CASE WHEN type = 'performance_report' THEN 1 END) as reports,
        COUNT(CASE WHEN type LIKE 'session_%' THEN 1 END) as session_alerts
      FROM notifications
    `).catch(() => ({ rows: [{ total_alerts: 0, reminders: 0, reports: 0, session_alerts: 0 }] }));

    res.json({
      success: true,
      data: {
        scoring: {
          totalScored: parseInt(scoringResult.rows[0].total_scored) || 0,
          avgScore: Math.round(scoringResult.rows[0].avg_score || 0),
          minScore: Math.round(scoringResult.rows[0].min_score || 0),
          maxScore: Math.round(scoringResult.rows[0].max_score || 0),
          stdDev: Math.round(scoringResult.rows[0].stddev_score || 0)
        },
        distribution: {
          excellent: parseInt(distributionResult.rows[0].excellent) || 0,
          good: parseInt(distributionResult.rows[0].good) || 0,
          average: parseInt(distributionResult.rows[0].average) || 0,
          needsImprovement: parseInt(distributionResult.rows[0].needs_improvement) || 0,
          poor: parseInt(distributionResult.rows[0].poor) || 0
        },
        mlApi: {
          status: mlApiStatus,
          url: 'http://localhost:5002',
          model: 'RandomForest v1.0'
        },
        feedback: {
          totalFeedback: parseInt(feedbackResult.rows[0].total_feedback) || 0,
          withFeedback: parseInt(feedbackResult.rows[0].with_feedback) || 0,
          coverage: feedbackResult.rows[0].total_feedback > 0
            ? Math.round((feedbackResult.rows[0].with_feedback / feedbackResult.rows[0].total_feedback) * 100)
            : 0
        },
        notifications: {
          total: parseInt(alertsResult.rows[0].total_alerts) || 0,
          reminders: parseInt(alertsResult.rows[0].reminders) || 0,
          reports: parseInt(alertsResult.rows[0].reports) || 0,
          sessionAlerts: parseInt(alertsResult.rows[0].session_alerts) || 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching AI performance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// 4. SYSTEM HEALTH
// =============================================
router.get('/system-health', async (req, res) => {
  try {
    const startTime = Date.now();

    // Database health check
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    const dbLatency = Date.now() - dbStart;

    // Database stats
    const dbStatsResult = await pool.query(`
      SELECT 
        pg_database_size(current_database()) as db_size,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
    `);

    // Table row counts
    const tableStatsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM interviews) as interviews,
        (SELECT COUNT(*) FROM recordings) as recordings,
        (SELECT COUNT(*) FROM notifications) as notifications,
        (SELECT COUNT(*) FROM shortlist) as shortlists
    `).catch(() => ({ rows: [{ users: 0, interviews: 0, recordings: 0, notifications: 0, shortlists: 0 }] }));

    // Uptime (approximate - from process start)
    const uptime = process.uptime();

    // Memory usage
    const memUsage = process.memoryUsage();

    res.json({
      success: true,
      data: {
        server: {
          status: 'online',
          uptime: Math.floor(uptime),
          uptimeFormatted: formatUptime(uptime),
          nodeVersion: process.version,
          platform: process.platform,
          memoryUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          memoryTotal: Math.round(memUsage.heapTotal / 1024 / 1024) // MB
        },
        database: {
          status: 'connected',
          latency: dbLatency,
          sizeBytes: parseInt(dbStatsResult.rows[0].db_size) || 0,
          sizeFormatted: formatBytes(parseInt(dbStatsResult.rows[0].db_size) || 0),
          connections: parseInt(dbStatsResult.rows[0].connections) || 0,
          maxConnections: parseInt(dbStatsResult.rows[0].max_connections) || 100
        },
        tables: {
          users: parseInt(tableStatsResult.rows[0].users),
          interviews: parseInt(tableStatsResult.rows[0].interviews),
          recordings: parseInt(tableStatsResult.rows[0].recordings),
          notifications: parseInt(tableStatsResult.rows[0].notifications),
          shortlists: parseInt(tableStatsResult.rows[0].shortlists)
        },
        responseTime: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// 5. PLATFORM USAGE ANALYTICS
// =============================================
router.get('/usage-analytics', async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;

    let dateFilter = '';
    if (timeRange === '7d') dateFilter = `AND created_at >= NOW() - INTERVAL '7 days'`;
    else if (timeRange === '30d') dateFilter = `AND created_at >= NOW() - INTERVAL '30 days'`;
    else if (timeRange === '90d') dateFilter = `AND created_at >= NOW() - INTERVAL '90 days'`;

    // Daily new users
    const usersTrendResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE 1=1 ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Daily interviews
    const interviewsTrendResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        AVG(CASE WHEN status = 'completed' THEN score END) as avg_score
      FROM interviews
      WHERE 1=1 ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Role distribution
    const roleResult = await pool.query(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
    `);

    // Interview type distribution
    const typeResult = await pool.query(`
      SELECT interview_type, COUNT(*) as count
      FROM interviews
      WHERE 1=1 ${dateFilter}
      GROUP BY interview_type
    `);

    // Domain distribution
    const domainResult = await pool.query(`
      SELECT domain, COUNT(*) as count
      FROM interviews
      WHERE 1=1 ${dateFilter}
      GROUP BY domain
      ORDER BY count DESC
    `);

    // Status distribution
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM interviews
      WHERE 1=1 ${dateFilter}
      GROUP BY status
    `);

    // Top active users
    const topUsersResult = await pool.query(`
      SELECT 
        u.id, u.name, u.email,
        COUNT(i.id) as interview_count,
        AVG(CASE WHEN i.status = 'completed' THEN i.score END) as avg_score
      FROM users u
      INNER JOIN interviews i ON u.id = i.user_id
      WHERE u.role = 'USER' ${dateFilter ? dateFilter.replace('created_at', 'i.created_at') : ''}
      GROUP BY u.id, u.name, u.email
      ORDER BY interview_count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        usersTrend: usersTrendResult.rows.map(r => ({
          date: r.date,
          count: parseInt(r.count) || 0
        })),
        interviewsTrend: interviewsTrendResult.rows.map(r => ({
          date: r.date,
          total: parseInt(r.total) || 0,
          completed: parseInt(r.completed) || 0,
          avgScore: Math.round(r.avg_score || 0)
        })),
        roleDistribution: roleResult.rows.map(r => ({
          role: r.role,
          count: parseInt(r.count) || 0
        })),
        typeDistribution: typeResult.rows.map(r => ({
          type: r.interview_type,
          count: parseInt(r.count) || 0
        })),
        domainDistribution: domainResult.rows.map(r => ({
          domain: r.domain,
          count: parseInt(r.count) || 0
        })),
        statusDistribution: statusResult.rows.map(r => ({
          status: r.status,
          count: parseInt(r.count) || 0
        })),
        topActiveUsers: topUsersResult.rows.map(r => ({
          id: r.id,
          name: r.name,
          email: r.email,
          interviewCount: parseInt(r.interview_count) || 0,
          avgScore: Math.round(r.avg_score || 0)
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching usage analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// 6. ACTIVITY LOGS
// =============================================
router.get('/activity-logs', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    // Try to get from admin_activity_logs table (may not exist)
    try {
      const result = await pool.query(`
        SELECT 
          l.id, l.admin_id, l.action, l.details, l.created_at,
          u.name as admin_name, u.email as admin_email
        FROM admin_activity_logs l
        LEFT JOIN users u ON l.admin_id = u.id
        ORDER BY l.created_at DESC
        LIMIT $1
      `, [parseInt(limit)]);

      return res.json({
        success: true,
        data: {
          logs: result.rows.map(l => ({
            id: l.id,
            adminName: l.admin_name,
            adminEmail: l.admin_email,
            action: l.action,
            details: l.details,
            timestamp: l.created_at
          }))
        }
      });
    } catch (e) {
      // Table doesn't exist - return empty
      return res.json({
        success: true,
        data: { logs: [] }
      });
    }

  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// HELPER FUNCTIONS
// =============================================
async function logAdminActivity(adminId, action, details) {
  try {
    await pool.query(`
      INSERT INTO admin_activity_logs (admin_id, action, details, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `, [adminId, action, details]);
  } catch (e) {
    // Table may not exist - ignore
    console.log('Admin activity log skipped:', e.message);
  }
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

module.exports = router;