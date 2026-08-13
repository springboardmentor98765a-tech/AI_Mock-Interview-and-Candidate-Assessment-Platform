import pool from "../db.js";
import fs from "fs-extra";
import path from "path";

// =====================================
// Upload Resume
// =====================================
export const uploadResume = async (req, res) => {

    try {

        const userId = req.user.id;
        const file = req.file;

        if (!file) {

            return res.status(400).json({
                success: false,
                message: "Please upload a PDF resume"
            });

        }

        // Normalize uploaded file path
        const filePath = path.normalize(file.path);

        // Check existing resume
        const existingResume = await pool.query(
            "SELECT * FROM resumes WHERE user_id = $1",
            [userId]
        );

        // Delete old file
        if (existingResume.rows.length > 0) {

            const oldPath = path.normalize(
                existingResume.rows[0].file_path
            );

            if (await fs.pathExists(oldPath)) {
                await fs.remove(oldPath);
            }

            await pool.query(
                "DELETE FROM resumes WHERE user_id = $1",
                [userId]
            );

        }

        // Save new resume
        const result = await pool.query(

            `INSERT INTO resumes
            (user_id, file_name, file_path)
            VALUES ($1, $2, $3)
            RETURNING *`,

            [
                userId,
                file.originalname,
                filePath
            ]

        );

        res.status(201).json({

            success: true,
            message: "Resume Uploaded Successfully",
            resume: result.rows[0]

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,
            message: "Internal Server Error"

        });

    }

};

// =====================================
// Get Resume
// =====================================
export const getResume = async (req, res) => {

    try {

        const userId = req.user.id;

        const result = await pool.query(
            "SELECT * FROM resumes WHERE user_id = $1",
            [userId]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Resume Not Found"
            });

        }

        res.status(200).json({

            success: true,
            resume: result.rows[0]

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,
            message: "Internal Server Error"

        });

    }

};

// =====================================
// Delete Resume
// =====================================
export const deleteResume = async (req, res) => {

    try {

        const userId = req.user.id;

        const result = await pool.query(
            "SELECT * FROM resumes WHERE user_id = $1",
            [userId]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Resume Not Found"
            });

        }

        const filePath = path.normalize(
            result.rows[0].file_path
        );

        if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
        }

        await pool.query(
            "DELETE FROM resumes WHERE user_id = $1",
            [userId]
        );

        res.status(200).json({

            success: true,
            message: "Resume Deleted Successfully"

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,
            message: "Internal Server Error"

        });

    }

};