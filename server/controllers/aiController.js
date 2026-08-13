import fs from "fs";
import { createRequire } from "module";
import pool from "../db.js";
import { analyzeResumeWithAI } from "../services/geminiService.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// ======================================
// Complete Resume Analysis
// ======================================
export const analyzeResume = async (req, res) => {

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
                message: "Resume not found"
            });

        }

        const resumePath = result.rows[0].file_path;

        if (!fs.existsSync(resumePath)) {

            return res.status(404).json({
                success: false,
                message: "Resume file not found"
            });

        }

        // Read PDF
        const buffer = fs.readFileSync(resumePath);

        // Extract PDF Text
        const pdfData = await pdfParse(buffer);

        // Gemini Analysis
        const aiResponse = await analyzeResumeWithAI(pdfData.text);

        // Remove markdown if Gemini returns ```json
        const cleanedResponse = aiResponse
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        const analysis = JSON.parse(cleanedResponse);

        res.status(200).json({

            success: true,

            message: "Resume Analysis Successful",

            skills: analysis.skills,

            experience: analysis.experience,

            technologies: analysis.technologies,

            education: analysis.education,

            summary: analysis.summary

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Resume Analysis Failed",

            error: error.message

        });

    }

};