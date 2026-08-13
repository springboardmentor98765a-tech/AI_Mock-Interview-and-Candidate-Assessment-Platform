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