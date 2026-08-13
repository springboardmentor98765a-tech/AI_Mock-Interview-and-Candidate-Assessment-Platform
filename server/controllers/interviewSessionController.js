import pool from "../db.js";
import fs from "fs";
import path from "path";

// ============================================
// CREATE INTERVIEW SESSION
// ============================================
export const createInterviewSession = async (req, res) => {

    try {

        const candidateId = req.user.id;

        const { interviewId } = req.body;

        if (!interviewId) {

            return res.status(400).json({

                success: false,

                message: "Interview ID is required"

            });

        }

        const result = await pool.query(

            `INSERT INTO "InterviewSession"
            (candidate_id, interview_id, status)
            VALUES ($1, $2, $3)
            RETURNING *`,

            [
                candidateId,
                interviewId,
                "CREATED"
            ]

        );

        res.status(201).json({

            success: true,

            message: "Interview session created successfully",

            session: result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "Create Session Error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Failed to create interview session",

            error: error.message

        });

    }

};


// ============================================
// START INTERVIEW SESSION
// ============================================
export const startInterviewSession = async (req, res) => {

    try {

        const { id } = req.params;

        const candidateId = req.user.id;

        const result = await pool.query(

            `UPDATE "InterviewSession"

             SET start_time = CURRENT_TIMESTAMP,

                 status = 'STARTED'

             WHERE id = $1

             AND candidate_id = $2

             AND status = 'CREATED'

             RETURNING *`,

            [
                id,
                candidateId
            ]

        );

        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Session not found or cannot be started"

            });

        }

        res.status(200).json({

            success: true,

            message: "Interview session started",

            session: result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "Start Session Error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Failed to start interview session",

            error: error.message

        });

    }

};


// ============================================
// PAUSE INTERVIEW SESSION
// ============================================
export const pauseInterviewSession = async (req, res) => {

    try {

        const { id } = req.params;

        const candidateId = req.user.id;

        const result = await pool.query(

            `UPDATE "InterviewSession"

             SET status = 'PAUSED'

             WHERE id = $1

             AND candidate_id = $2

             AND status = 'STARTED'

             RETURNING *`,

            [
                id,
                candidateId
            ]

        );

        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Session not found or cannot be paused"

            });

        }

        res.status(200).json({

            success: true,

            message: "Interview session paused",

            session: result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "Pause Session Error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Failed to pause interview session",

            error: error.message

        });

    }

};


// ============================================
// RESUME INTERVIEW SESSION
// ============================================
export const resumeInterviewSession = async (req, res) => {

    try {

        const { id } = req.params;

        const candidateId = req.user.id;

        const result = await pool.query(

            `UPDATE "InterviewSession"

             SET status = 'RESUMED'

             WHERE id = $1

             AND candidate_id = $2

             AND status = 'PAUSED'

             RETURNING *`,

            [
                id,
                candidateId
            ]

        );

        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Session not found or cannot be resumed"

            });

        }

        res.status(200).json({

            success: true,

            message: "Interview session resumed",

            session: result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "Resume Session Error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Failed to resume interview session",

            error: error.message

        });

    }

};


// ============================================
// END INTERVIEW SESSION
// ============================================
export const endInterviewSession = async (req, res) => {

    try {

        const { id } = req.params;

        const candidateId = req.user.id;

        const result = await pool.query(

            `UPDATE "InterviewSession"

             SET

                 end_time = CURRENT_TIMESTAMP,

                 duration =
                    EXTRACT(
                        EPOCH FROM
                        (CURRENT_TIMESTAMP - start_time)
                    )::INTEGER,

                 status = 'COMPLETED'

             WHERE id = $1

             AND candidate_id = $2

             AND status IN ('STARTED', 'RESUMED', 'PAUSED')

             RETURNING *`,

            [
                id,
                candidateId
            ]

        );

        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Session not found or cannot be ended"

            });

        }

        res.status(200).json({

            success: true,

            message: "Interview session completed",

            session: result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "End Session Error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Failed to end interview session",

            error: error.message

        });

    }

};


// ============================================
// GET SESSION
// ============================================
export const getInterviewSession = async (req, res) => {

    try {

        const { id } = req.params;

        const candidateId = req.user.id;

        const result = await pool.query(

            `SELECT *

             FROM "InterviewSession"

             WHERE id = $1

             AND candidate_id = $2`,

            [
                id,
                candidateId
            ]

        );

        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Interview session not found"

            });

        }

        res.status(200).json({

            success: true,

            session: result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "Get Session Error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Failed to get interview session",

            error: error.message

        });

    }

};
// ============================================
// UPLOAD INTERVIEW RECORDING
// ============================================

export const uploadInterviewRecording = async (req, res) => {

    try {

        const candidateId = req.user.id;

        const sessionId = req.body.sessionId;

        const recordingType =
            req.body.recordingType || "VIDEO";

        if (!sessionId) {

            return res.status(400).json({

                success: false,

                message: "Session ID is required"

            });

        }

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message: "Recording file is required"

            });

        }

        // ========================================
        // CHECK SESSION OWNERSHIP
        // ========================================

        const sessionResult = await pool.query(

            `SELECT *
             FROM "InterviewSession"
             WHERE id = $1
             AND candidate_id = $2`,

            [
                sessionId,
                candidateId
            ]

        );

        if (sessionResult.rows.length === 0) {

            // Delete unauthorized uploaded file
            if (fs.existsSync(req.file.path)) {

                fs.unlinkSync(req.file.path);

            }

            return res.status(403).json({

                success: false,

                message: "Unauthorized session access"

            });

        }

        // ========================================
        // SAVE RECORDING INFORMATION
        // ========================================

        const result = await pool.query(

            `INSERT INTO "InterviewRecording"
            (
                session_id,
                recording_type,
                file_path,
                duration
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *`,

            [
                sessionId,
                recordingType,
                req.file.path,
                0
            ]

        );

        res.status(201).json({

            success: true,

            message:
                "Interview recording stored successfully",

            recording: result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "Recording Upload Error:",
            error
        );

        // Remove uploaded file if database insertion fails
        if (
            req.file &&
            fs.existsSync(req.file.path)
        ) {

            fs.unlinkSync(req.file.path);

        }

        res.status(500).json({

            success: false,

            message:
                "Failed to store interview recording",

            error: error.message

        });

    }

};
// ============================================
// GET ALL INTERVIEW RECORDINGS FOR RECRUITER
// ============================================

// ============================================
// GET ALL INTERVIEW RECORDINGS FOR RECRUITER
// ============================================

export const getRecruiterRecordings = async (req, res) => {

    try {

        const result = await pool.query(`

            SELECT
                ir.id AS recording_id,
                ir.session_id,
                ir.recording_type,
                ir.file_path,
                ir.duration,

                s.candidate_id,
                s.interview_id,
                s.status,
                s.start_time,
                s.end_time,
                s.questions_attempted,

                u.name AS candidate_name,
                u.email AS candidate_email

            FROM "InterviewRecording" ir

            INNER JOIN "InterviewSession" s
                ON ir.session_id = s.id

            LEFT JOIN users u
                ON u.id::text = s.candidate_id

            ORDER BY ir.created_at DESC

        `);


        res.status(200).json({

            success: true,

            recordings: result.rows

        });

    }

    catch (error) {

        console.error(
            "Get Recruiter Recordings Error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to fetch interview recordings",

            error:
                error.message

        });

    }

};


// ============================================
// GET / STREAM SINGLE RECORDING
// ============================================

export const getRecruiterRecording = async (req, res) => {

    try {

        const { id } = req.params;


        const result = await pool.query(`

            SELECT
                ir.file_path,
                ir.recording_type

            FROM "InterviewRecording" ir

            INNER JOIN "InterviewSession" s
                ON ir.session_id = s.id

            WHERE ir.id = $1

        `, [id]);


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Recording not found"

            });

        }


        const recording =
            result.rows[0];


        const filePath =
            path.resolve(
                recording.file_path
            );


        if (!fs.existsSync(filePath)) {

            return res.status(404).json({

                success: false,

                message:
                    "Recording file not found on server"

            });

        }


        // ========================================
        // SEND VIDEO
        // ========================================

        res.setHeader(
            "Content-Type",
            "video/webm"
        );


        res.sendFile(filePath);

    }

    catch (error) {

        console.error(
            "Get Recruiter Recording Error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to access recording",

            error: error.message

        });

    }

};
// ============================================
// SAVE INTERVIEW ANSWER
// ============================================

export const saveInterviewAnswer = async (req, res) => {

    try {

        const { id } = req.params;

        const candidateId = req.user.id;

        const {
            questionNumber,
            question,
            answer,
            timeSpent
        } = req.body;


        // ========================================
        // VALIDATION
        // ========================================

        if (
            questionNumber === undefined ||
            !question ||
            !answer
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Question number, question and answer are required"

            });

        }


        // ========================================
        // CHECK SESSION OWNERSHIP
        // ========================================

        const sessionResult =
            await pool.query(

                `SELECT *
                 FROM "InterviewSession"
                 WHERE id = $1
                 AND candidate_id = $2`,

                [
                    id,
                    candidateId
                ]

            );


        if (sessionResult.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Interview session not found"

            });

        }


        const session =
            sessionResult.rows[0];


        // ========================================
        // CHECK SESSION STATUS
        // ========================================

        if (
            session.status !== "STARTED" &&
            session.status !== "RESUMED"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Interview must be started or resumed before submitting an answer"

            });

        }


        // ========================================
        // INSERT / UPDATE ANSWER
        // ========================================

        const answerResult =
            await pool.query(

                `INSERT INTO "InterviewAnswer"
                (
                    session_id,
                    candidate_id,
                    question_number,
                    question,
                    answer,
                    time_spent
                )
                VALUES
                ($1, $2, $3, $4, $5, $6)

                ON CONFLICT
                (session_id, question_number)

                DO UPDATE SET

                    question = EXCLUDED.question,
                    answer = EXCLUDED.answer,
                    time_spent = EXCLUDED.time_spent,
                    submitted_at = CURRENT_TIMESTAMP

                RETURNING *`,

                [
                    id,
                    candidateId,
                    questionNumber,
                    question,
                    answer,
                    timeSpent || 0
                ]

            );


        // ========================================
        // UPDATE QUESTIONS ATTEMPTED
        // ========================================

        const countResult =
            await pool.query(

                `SELECT COUNT(*) AS count
                 FROM "InterviewAnswer"
                 WHERE session_id = $1`,

                [id]

            );


        const questionsAttempted =
            parseInt(
                countResult.rows[0].count
            );


        await pool.query(

            `UPDATE "InterviewSession"

             SET questions_attempted = $1

             WHERE id = $2`,

            [
                questionsAttempted,
                id
            ]

        );


        // ========================================
        // SUCCESS RESPONSE
        // ========================================

        res.status(200).json({

            success: true,

            message:
                "Answer submitted and saved successfully",

            answer:
                answerResult.rows[0],

            questionsAttempted

        });

    }

    catch (error) {

        console.error(
            "Save Answer Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to save interview answer",

            error:
                error.message

        });

    }

};



// ============================================
// RECRUITER - STREAM RECORDING
// ============================================

export const streamRecruiterRecording = async (req, res) => {

    try {

        const { id } = req.params;


        const result = await pool.query(

            `SELECT
                r.id,
                r.file_path,
                r.recording_type

             FROM "InterviewRecording" r

             INNER JOIN "InterviewSession" s
                ON r.session_id = s.id

             WHERE r.id = $1`,

            [id]

        );


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Recording not found"

            });

        }


        const recording =
            result.rows[0];


        const filePath =
            recording.file_path;


        // ========================================
        // CHECK FILE EXISTS
        // ========================================

        if (!fs.existsSync(filePath)) {

            return res.status(404).json({

                success: false,

                message:
                    "Recording file not found on server"

            });

        }


        // ========================================
        // SET CONTENT TYPE
        // ========================================

        if (
            recording.recording_type ===
            "VIDEO"
        ) {

            res.setHeader(
                "Content-Type",
                "video/webm"
            );

        }

        else {

            res.setHeader(
                "Content-Type",
                "audio/webm"
            );

        }


        res.setHeader(
            "Content-Disposition",
            "inline"
        );


        // ========================================
        // SEND RECORDING
        // ========================================

        res.sendFile(
            path.resolve(filePath)
        );

    }

    catch (error) {

        console.error(
            "Recruiter Recording Stream Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to access recording",

            error:
                error.message

        });

    }

};