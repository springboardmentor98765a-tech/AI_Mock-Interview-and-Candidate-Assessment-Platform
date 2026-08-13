import pool from "../db.js";
import { generateInterviewQuestions } from "../services/interviewService.js";

// ==========================================
// Generate AI Interview Questions
// ==========================================
export const generateQuestions = async (req, res) => {

    try {

        const userId = req.user.id;

        // Get uploaded resume
        const result = await pool.query(
            "SELECT * FROM resumes WHERE user_id = $1",
            [userId]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Please upload your resume first"
            });

        }

        // Get request data
        const {
            skills,
            type,
            difficulty,
            domain
        } = req.body;

        if (!skills) {

            return res.status(400).json({
                success: false,
                message: "Skills are required"
            });

        }

        // Generate interview
        const aiResponse =
            await generateInterviewQuestions(
                type,
                difficulty,
                domain,
                skills
            );

        const cleanedResponse = aiResponse
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        const questions = JSON.parse(cleanedResponse);

        // Generate Session ID
        const sessionId =
            "INT-" +
            Date.now();

        res.status(200).json({

            success: true,

            message:
                "Interview Questions Generated Successfully",

            sessionId,

            interviewType: type,

            difficulty,

            domain,

            questions:
                questions.questions

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Interview Generation Failed",

            error:
                error.message

        });

    }

};