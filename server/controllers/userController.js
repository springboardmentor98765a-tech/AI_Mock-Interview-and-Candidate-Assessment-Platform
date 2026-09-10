import pool from "../db.js";

// =======================
// Get Logged-in User Profile
// =======================
export const getProfile = async (req, res) => {

    try {

        const result = await pool.query(
            "SELECT id,name,email,role,provider,created_at FROM users WHERE id=$1",
            [req.user.id]
        );

        res.status(200).json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// =======================
// Update Profile
// =======================
export const updateProfile = async (req, res) => {

    try {

        const { name } = req.body;

        await pool.query(
            "UPDATE users SET name=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2",
            [name, req.user.id]
        );

        res.status(200).json({

            success: true,

            message: "Profile Updated Successfully"

        });

    } catch (error) {

        console.log(error);

        res.status(500).json({

            success: false,

            message: "Internal Server Error"

        });

    }

};
// ============================================================
// ADMIN - MANAGE USERS
// ============================================================

export const getAllUsers = async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT
                id,
                name,
                email,
                role,
                provider,
                created_at
            FROM users
            ORDER BY created_at DESC
            `
        );

        res.status(200).json({
            success: true,
            users: result.rows
        });

    } catch (error) {

        console.log("Get All Users Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch users"
        });
    }
};


export const deleteUser = async (req, res) => {

    try {

        const { id } = req.params;

        await pool.query(
            "DELETE FROM users WHERE id=$1",
            [id]
        );

        res.status(200).json({
            success: true,
            message: "User deleted successfully"
        });

    } catch (error) {

        console.log("Delete User Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete user"
        });
    }
};
// ============================================================
// ADMIN - SYSTEM ACTIVITY / HEALTH REPORT
// ============================================================

export const getSystemHealthReport = async (req, res) => {
    try {

        // Check database connection
        await pool.query("SELECT 1");

        // Get system usage statistics
        const usersResult = await pool.query(`
            SELECT
                COUNT(*) AS total_users,
                COUNT(*) FILTER (
                    WHERE UPPER(TRIM(role)) = 'RECRUITER'
                ) AS total_recruiters,
                COUNT(*) FILTER (
                    WHERE UPPER(TRIM(role)) = 'USER'
                ) AS total_candidates,
                COUNT(*) FILTER (
                    WHERE UPPER(TRIM(role)) = 'ADMIN'
                ) AS total_admins
            FROM users
        `);

        const sessionsResult = await pool.query(`
            SELECT
                COUNT(*) AS total_sessions,
                COUNT(*) FILTER (
                    WHERE status = 'COMPLETED'
                ) AS completed_sessions,
                COUNT(*) FILTER (
                    WHERE status IN ('STARTED', 'RESUMED')
                ) AS active_sessions,
                COUNT(*) FILTER (
                    WHERE status = 'PAUSED'
                ) AS paused_sessions
            FROM "InterviewSession"
        `);

        const aiResult = await pool.query(`
            SELECT
                COUNT(*) AS total_ai_analyses
            FROM "InterviewBehaviorAnalysis"
        `);

        res.status(200).json({
            success: true,
            health: {
                database: "Connected",
                server: "Running",
                users: usersResult.rows[0],
                interviews: sessionsResult.rows[0],
                ai: aiResult.rows[0],
                checkedAt: new Date()
            }
        });

    } catch (error) {

        console.error(
            "System Health Report Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "System health check failed",
            health: {
                database: "Disconnected",
                server: "Running"
            },
            error: error.message
        });
    }
};
// ============================================================
// ADMIN - PLATFORM USAGE ANALYTICS
// ============================================================

export const getPlatformUsageAnalytics = async (req, res) => {
    try {

        const usersResult = await pool.query(`
            SELECT
                COUNT(*) AS total_users,

                COUNT(*) FILTER (
                    WHERE UPPER(TRIM(role)) = 'RECRUITER'
                ) AS total_recruiters,

                COUNT(*) FILTER (
                    WHERE UPPER(TRIM(role)) = 'USER'
                ) AS total_candidates,

                COUNT(*) FILTER (
                    WHERE UPPER(TRIM(role)) = 'ADMIN'
                ) AS total_admins

            FROM users
        `);

        const interviewsResult = await pool.query(`
            SELECT
                COUNT(*) AS total_interviews,

                COUNT(*) FILTER (
                    WHERE status = 'COMPLETED'
                ) AS completed_interviews,

                COUNT(*) FILTER (
                    WHERE status IN ('STARTED', 'RESUMED')
                ) AS active_interviews,

                COUNT(*) FILTER (
                    WHERE status = 'PAUSED'
                ) AS paused_interviews

            FROM "InterviewSession"
        `);

        const aiResult = await pool.query(`
            SELECT
                COUNT(*) AS total_ai_analyses
            FROM "InterviewBehaviorAnalysis"
        `);

        const templatesResult = await pool.query(`
            SELECT
                COUNT(*) AS total_templates
            FROM "InterviewTemplate"
        `);

        res.status(200).json({
            success: true,
            analytics: {
                users: usersResult.rows[0],
                interviews: interviewsResult.rows[0],
                ai: aiResult.rows[0],
                templates: templatesResult.rows[0],
                generatedAt: new Date()
            }
        });

    } catch (error) {

        console.error(
            "Platform Usage Analytics Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load platform usage analytics",
            error: error.message
        });
    }
};