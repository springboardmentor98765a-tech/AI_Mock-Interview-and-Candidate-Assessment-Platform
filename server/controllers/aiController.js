import fs from "fs";
import nodemailer from "nodemailer";
import { createRequire } from "module";
import pool from "../db.js";
import {
    analyzeResumeWithAI,
    analyzeCommunicationWithAI,
    analyzeTechnicalRelevanceWithAI,
    classifyInterviewSkillWithAI
} from "../services/geminiService.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
// ============================================================
// MODULE 9 - EMAIL NOTIFICATIONS
// ============================================================

const emailTransporter =
    nodemailer.createTransport({
        service: "gmail",

        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },

        tls: {
            rejectUnauthorized: false
        }
    });

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
// ======================================
// Module 5 - Communication Analysis
// ======================================

export const analyzeCommunication = async (req, res) => {

    try {

        const candidateId = req.user.id;

        const {
            answerId,
            sessionId,
            transcript
        } = req.body;


        // ======================================
        // VALIDATION
        // ======================================

        if (!answerId || !sessionId || !transcript) {

            return res.status(400).json({

                success: false,

                message:
                    "Answer ID, session ID and transcript are required"

            });

        }


        // ======================================
        // VERIFY ANSWER BELONGS TO CANDIDATE
        // ======================================

        const answerResult =
            await pool.query(

                `SELECT *
                 FROM "InterviewAnswer"
                 WHERE id = $1
                 AND session_id = $2
                 AND candidate_id = $3`,

                [
                    answerId,
                    sessionId,
                    candidateId
                ]

            );


        if (answerResult.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Interview answer not found"

            });

        }


        // ======================================
        // GEMINI ANALYSIS
        // ======================================

        const analysis =
            await analyzeCommunicationWithAI(
                transcript
            );
        // ======================================
// SPEECH PACE ANALYSIS
// ======================================

const words = transcript
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const wordCount = words.length;

// Get time spent from InterviewAnswer
const answerTimeResult = await pool.query(
    `SELECT time_spent
     FROM "InterviewAnswer"
     WHERE id = $1`,
    [answerId]
);

const timeSpent =
    answerTimeResult.rows[0]?.time_spent || 0;

// Calculate Words Per Minute
let speechRate = 0;

if (timeSpent > 0) {
    speechRate =
        Math.round(
            (wordCount / (timeSpent / 60)) * 100
        ) / 100;
}

// Categorize speech pace
let speechRateCategory = "NORMAL";

if (speechRate < 100) {
    speechRateCategory = "SLOW";
} else if (speechRate > 160) {
    speechRateCategory = "FAST";
}

// Basic communication score
const grammarScore =
    Number(analysis.grammar_score) || 0;

const fillerScore =
    Number(analysis.filler_word_count) || 0;

const fillerPenalty =
    Math.min(fillerScore * 2, 20);

const paceScore =
    speechRate >= 100 &&
    speechRate <= 160
        ? 100
        : speechRate >= 80 &&
          speechRate <= 180
            ? 80
            : 60;

const communicationScore =
    Math.round(
        (
            grammarScore +
            (100 - fillerPenalty) +
            paceScore
        ) / 3
    );

        // ======================================
        // SAVE COMMUNICATION ANALYSIS
        // ======================================

        const result =
            await pool.query(

               `INSERT INTO "CommunicationAnalysis"
(
    answer_id,
    session_id,
    candidate_id,
    transcript,
    grammar_score,
    filler_word_count,
    filler_words,
    speech_rate,
    speech_rate_category,
    pronunciation_score,
    communication_score,
    grammar_feedback,
    communication_feedback
)
VALUES
(
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9,
    $10,
    $11,
    $12,
    $13
)
RETURNING *`,

                [
    answerId,
    sessionId,
    candidateId,
    transcript,

    grammarScore,

    analysis.filler_word_count || 0,

    Array.isArray(analysis.filler_words)
        ? analysis.filler_words.join(", ")
        : String(
            analysis.filler_words || ""
        ),

    speechRate,

    speechRateCategory,

    // Pronunciation will be added after
    // actual audio-based evaluation
    0,

    communicationScore,

    analysis.grammar_feedback || "",

    analysis.communication_feedback || ""
]

            );


        // ======================================
        // SUCCESS
        // ======================================

        res.status(201).json({

            success: true,

            message:
                "Communication analysis completed successfully",

            analysis:
                result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "Communication Analysis Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Communication analysis failed",

            error:
                error.message

        });

    }

};

// ============================================================
// MODULE 6 + MODULE 7 - SAVE INTERVIEW BEHAVIOR & AI SCORING
// ============================================================

export const saveBehaviorAnalysis = async (req, res) => {

    try {

        const candidateId = req.user.id;

        const {
            sessionId,
            engagementScore,
            positiveScore,
            neutralScore,
            stressScore,
            dominantEmotion,
            dominantPercentage,
            averageConfidence,
            totalReadings,

            // Module 6 real-time measurements
            eyeContactScore,
            attentionScore,

            // Module 7 technical/domain score
            domainScore
        } = req.body;


        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (!sessionId) {

            return res.status(400).json({
                success: false,
                message: "Session ID is required"
            });

        }


        // ----------------------------------------------------
        // VERIFY SESSION BELONGS TO CANDIDATE
        // ----------------------------------------------------

        const sessionResult = await pool.query(

            `SELECT id
             FROM "InterviewSession"
             WHERE id = $1
             AND candidate_id = $2`,

            [
                sessionId,
                candidateId
            ]

        );


        if (sessionResult.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Interview session not found"
            });

        }


        // ----------------------------------------------------
        // GET COMMUNICATION SCORE
        // ----------------------------------------------------

        const communicationResult = await pool.query(

            `SELECT
                COALESCE(
                    ROUND(AVG(communication_score)),
                    0
                ) AS communication_score
             FROM "CommunicationAnalysis"
             WHERE session_id = $1
             AND candidate_id = $2`,

            [
                sessionId,
                candidateId
            ]

        );


        const communicationScore = Number(
            communicationResult.rows[0]?.communication_score || 0
        );
        // ----------------------------------------------------
// MODULE 7 - TECHNICAL RELEVANCE ANALYSIS
// ----------------------------------------------------

// Get all candidate answers for this interview
const answersResult = await pool.query(
    `SELECT question, answer
     FROM "InterviewAnswer"
     WHERE session_id = $1
     AND candidate_id = $2
     ORDER BY question_number`,
    [
        sessionId,
        candidateId
    ]
);

let technicalScore = 0;

if (answersResult.rows.length > 0) {

    const technicalScores = [];

    for (const interviewAnswer of answersResult.rows) {

        if (
            !interviewAnswer.question ||
            !interviewAnswer.answer
        ) {
            continue;
        }

        try {

            const technicalAnalysis =
                await analyzeTechnicalRelevanceWithAI(
                    interviewAnswer.question,
                    interviewAnswer.answer
                );

            technicalScores.push(
                Number(
                    technicalAnalysis.technical_score
                ) || 0
            );

        }
        catch (error) {

            console.error(
                "Technical evaluation failed for one answer:",
                error.message
            );

        }
    }

    if (technicalScores.length > 0) {

        technicalScore =
            Math.round(
                technicalScores.reduce(
                    (sum, score) => sum + score,
                    0
                ) / technicalScores.length
            );

    }

}

technicalScore = Math.min(
    Math.max(technicalScore, 0),
    100
);


        // ----------------------------------------------------
        // MODULE 6 SCORES
        // ----------------------------------------------------

        const engagement = Math.min(
            Math.max(Number(engagementScore || 0), 0),
            100
        );

        const eyeContact = Math.min(
            Math.max(Number(eyeContactScore || 0), 0),
            100
        );

        const attention = Math.min(
            Math.max(Number(attentionScore || 0), 0),
            100
        );

        


        // ----------------------------------------------------
        // MODULE 7 - CONFIDENCE SCORE
        //
        // Confidence consists of:
        // Eye Contact
        // Facial Engagement
        // Attention
        // Speaking Confidence
        //
        // Available Module 6 measurements are used here.
        // ----------------------------------------------------

        const confidenceScore = Math.round(
            (
                eyeContact +
                engagement +
                attention +
                Number(averageConfidence || 0)
            ) / 4
        );


        // ----------------------------------------------------
        // MODULE 7 - PROFESSIONALISM SCORE
        //
        // Based on available communication and behavior
        // indicators from the interview.
        // ----------------------------------------------------

        const professionalismScore = Math.round(
            (
                communicationScore +
                engagement +
                attention
            ) / 3
        );


        // ----------------------------------------------------
        // MODULE 7 - OVERALL SCORE
        //
        // Communication       = 30%
        // Confidence          = 25%
        // Technical Relevance = 30%
        // Professionalism     = 15%
        // ----------------------------------------------------

        const overallScore = Math.round(

            (
                (communicationScore * 0.30) +
                (confidenceScore * 0.25) +
                (technicalScore * 0.30) +
                (professionalismScore * 0.15)
            ) * 100

        ) / 100;


        // ----------------------------------------------------
        // PERFORMANCE RATING
        // ----------------------------------------------------

        let performanceRating = "Poor";

        if (overallScore >= 90) {

            performanceRating = "Excellent";

        }
        else if (overallScore >= 75) {

            performanceRating = "Good";

        }
        else if (overallScore >= 60) {

            performanceRating = "Average";

        }
        else if (overallScore >= 40) {

            performanceRating = "Needs Improvement";

        }


        // ----------------------------------------------------
        // BEHAVIOR SCORE
        // ----------------------------------------------------

        const behaviorScore = Math.round(
            (
                communicationScore +
                engagement
            ) / 2
        );


        // ----------------------------------------------------
        // BEHAVIOR FEEDBACK
        // ----------------------------------------------------

        let behaviorFeedback = "";

        if (behaviorScore >= 80) {

            behaviorFeedback =
                "Strong overall interview behavior with good engagement and communication.";

        }
        else if (behaviorScore >= 60) {

            behaviorFeedback =
                "Moderate interview behavior with satisfactory engagement and communication.";

        }
        else {

            behaviorFeedback =
                "Interview behavior showed areas that could be improved, particularly engagement and communication.";

        }


        // ----------------------------------------------------
        // EMOTION DETAILS
        // ----------------------------------------------------

        const emotionDetails = JSON.stringify({

            dominantEmotion:
                dominantEmotion || "Unknown",

            dominantPercentage:
                Number(dominantPercentage || 0),

            averageConfidence:
                Number(averageConfidence || 0),

            positiveScore:
                Number(positiveScore || 0),

            neutralScore:
                Number(neutralScore || 0),

            stressScore:
                Number(stressScore || 0),

            totalReadings:
                Number(totalReadings || 0),

            eyeContactScore:
                eyeContact,

            attentionScore:
                attention,

            engagementScore:
                engagement

        });


        // ----------------------------------------------------
        // AI FEEDBACK - BASIC MODULE 7 FEEDBACK
        // ----------------------------------------------------

        const strengths = [];

        const weaknesses = [];

        const improvementSuggestions = [];

        const practiceRecommendations = [];

        const learningResources = [];


        // Communication

        if (communicationScore >= 75) {

            strengths.push(
                "Good verbal communication and response quality."
            );

        }
        else {

            weaknesses.push(
                "Communication quality needs improvement."
            );

            improvementSuggestions.push(
                "Improve grammar, speech clarity, speaking pace and reduce filler words."
            );

            practiceRecommendations.push(
                "Practice answering interview questions aloud with clear and complete responses."
            );

        }


        // Confidence

        if (confidenceScore >= 75) {

            strengths.push(
                "Good confidence and interview presence."
            );

        }
        else {

            weaknesses.push(
                "Confidence and attention during the interview can be improved."
            );

            improvementSuggestions.push(
                "Maintain consistent eye contact, stay attentive and respond with greater confidence."
            );

            practiceRecommendations.push(
                "Practice mock interviews while maintaining eye contact and confident speaking."
            );

        }


        // Technical

        if (technicalScore >= 75) {

            strengths.push(
                "Good technical relevance and domain understanding."
            );

        }
        else {

            weaknesses.push(
                "Technical relevance and domain knowledge need improvement."
            );

            improvementSuggestions.push(
                "Strengthen technical concepts and provide more accurate, relevant answers."
            );

            practiceRecommendations.push(
                "Practice technical interview questions related to your target domain."
            );

        }


        // Professionalism

        if (professionalismScore >= 75) {

            strengths.push(
                "Professional interview behavior was satisfactory."
            );

        }
        else {

            weaknesses.push(
                "Professional interview behavior can be improved."
            );

            improvementSuggestions.push(
                "Organize responses clearly and maintain professional communication throughout the interview."
            );

        }


        // Learning resources

        learningResources.push(
            "Practice common technical interview questions."
        );

        learningResources.push(
            "Review communication and professional interview techniques."
        );

        learningResources.push(
            "Use mock interviews to improve confidence and response organization."
        );


        // ----------------------------------------------------
        // REMOVE OLD ANALYSIS FOR SAME SESSION
        // ----------------------------------------------------

        await pool.query(

            `DELETE FROM "InterviewBehaviorAnalysis"
             WHERE session_id = $1
             AND candidate_id = $2`,

            [
                sessionId,
                candidateId
            ]

        );


        // ----------------------------------------------------
        // SAVE MODULE 6 + MODULE 7 ANALYSIS
        // ----------------------------------------------------

        const result = await pool.query(

            `INSERT INTO "InterviewBehaviorAnalysis"
            (
                session_id,
                candidate_id,

                confidence_score,
                dominant_emotion,

                eye_contact_score,
                attention_score,
                engagement_score,

                behavior_score,

                emotion_details,
                behavior_feedback,

                communication_score,
                domain_score,

                technical_relevance_score,
                professionalism_score,

                overall_score,
                performance_rating,

                strengths,
                weaknesses,
                improvement_suggestions,
                practice_recommendations,
                learning_resources
            )

            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                $12,
                $13,
                $14,
                $15,
                $16,
                $17,
                $18,
                $19,
                $20,
                $21
            )

            RETURNING *`,

            [

                sessionId,

                candidateId,

                confidenceScore,

                dominantEmotion || "Unknown",

                eyeContact,

                attention,

                engagement,

                behaviorScore,

                emotionDetails,

                behaviorFeedback,

                communicationScore,

                technicalScore,

                technicalScore,

                professionalismScore,

                overallScore,

                performanceRating,

                strengths.join("\n"),

                weaknesses.join("\n"),

                improvementSuggestions.join("\n"),

                practiceRecommendations.join("\n"),

                learningResources.join("\n")

            ]

        );


        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        console.log(
            "✅ Module 7 AI scoring saved:",
            sessionId,
            "Overall:",
            overallScore
        );


        res.status(201).json({

            success: true,

            message:
                "AI feedback and scoring completed successfully",

            scoring: {

                communicationScore,

                confidenceScore,

                technicalRelevanceScore:
                    technicalScore,

                professionalismScore,

                overallScore,

                performanceRating

            },

            feedback: {

                strengths,

                weaknesses,

                improvementSuggestions,

                practiceRecommendations,

                learningResources

            },

            analysis:
                result.rows[0]

        });


    }

    catch (error) {

        console.error(
            "AI Scoring Error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to generate AI feedback and scoring",

            error:
                error.message

        });

    }

};
// ============================================================
// MODULE 7 - GET LATEST INTERVIEW PERFORMANCE
// ============================================================

export const getLatestInterviewPerformance = async (req, res) => {

    try {

        const candidateId = req.user.id;

        const result = await pool.query(
            `SELECT
                technical_relevance_score,
                communication_score,
                confidence_score,
                professionalism_score,
                overall_score,
                performance_rating,
                strengths,
                weaknesses,
                improvement_suggestions,
                practice_recommendations,
                learning_resources,
                analyzed_at
             FROM "InterviewBehaviorAnalysis"
             WHERE candidate_id = $1
             ORDER BY analyzed_at DESC
             LIMIT 1`,
            [
                candidateId
            ]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "No interview performance analysis found"
            });

        }

        res.json({
            success: true,
            analysis: result.rows[0]
        });

    }
    catch (error) {

        console.error(
            "Get Latest Interview Performance Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load interview performance"
        });

    }

};
// ============================================================
// MODULE 8 - SKILL-WISE ANALYTICS
// ============================================================

export const getSkillWiseAnalytics = async (req, res) => {

    try {

        const candidateId = req.user.id;
        const { sessionId } = req.query;

        if (!sessionId) {

            return res.status(400).json({
                success: false,
                message: "Session ID is required"
            });

        }

        // ----------------------------------------------------
        // VERIFY SESSION
        // ----------------------------------------------------

        const sessionResult = await pool.query(
            `SELECT id
             FROM "InterviewSession"
             WHERE id = $1
             AND candidate_id = $2`,
            [
                sessionId,
                candidateId
            ]
        );

        if (sessionResult.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Interview session not found"
            });

        }

        // ----------------------------------------------------
        // GET INTERVIEW QUESTIONS AND ANSWERS
        // ----------------------------------------------------

        const answerResult = await pool.query(
            `SELECT
                question_number,
                question,
                answer
             FROM "InterviewAnswer"
             WHERE session_id = $1
             AND candidate_id = $2
             ORDER BY question_number`,
            [
                sessionId,
                candidateId
            ]
        );

        if (answerResult.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "No interview answers found"
            });

        }

        // ----------------------------------------------------
        // ANALYZE EACH QUESTION
        // ----------------------------------------------------

        const skillResults = {};

        for (const item of answerResult.rows) {

            const question =
                item.question || "";

            const answer =
                item.answer || "";

            if (!question.trim()) {
                continue;
            }

            // Identify skill
            const skillAnalysis =
                await classifyInterviewSkillWithAI(
                    question
                );

            // Evaluate technical answer
            const technicalAnalysis =
                await analyzeTechnicalRelevanceWithAI(
                    question,
                    answer
                );

            const skill =
                skillAnalysis.skill ||
                "General";

            const category =
                skillAnalysis.category ||
                "General";

            const score =
                Math.min(
                    Math.max(
                        Number(
                            technicalAnalysis.technical_score
                        ) || 0,
                        0
                    ),
                    100
                );

            // ------------------------------------------------
            // GROUP RESULTS BY SKILL
            // ------------------------------------------------

            if (!skillResults[skill]) {

                skillResults[skill] = {
                    skill,
                    category,
                    questions: 0,
                    totalScore: 0
                };

            }

            skillResults[skill].questions += 1;

            skillResults[skill].totalScore += score;

        }

        // ----------------------------------------------------
        // CALCULATE AVERAGE SCORE
        // ----------------------------------------------------

        const analytics =
            Object.values(skillResults)
                .map(item => ({

                    skill:
                        item.skill,

                    category:
                        item.category,

                    questions:
                        item.questions,

                    score:
                        Math.round(
                            item.totalScore /
                            item.questions
                        )

                }))
                .sort(
                    (a, b) =>
                        b.score - a.score
                );

        // ----------------------------------------------------
        // FIND STRONGEST AND WEAKEST SKILLS
        // ----------------------------------------------------

        const strongestSkill =
            analytics.length > 0
                ? analytics[0]
                : null;

        const weakestSkill =
            analytics.length > 0
                ? analytics[analytics.length - 1]
                : null;

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        res.status(200).json({

            success: true,

            sessionId,

            skillAnalytics:
                analytics,

            strongestSkill,

            weakestSkill

        });

    }
    catch (error) {

        console.error(
            "Skill-wise Analytics Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to generate skill-wise analytics",

            error:
                error.message

        });

    }

};
// ============================================================
// MODULE 8 - CANDIDATE RANKING METRICS
// ============================================================

export const getCandidateRanking = async (req, res) => {
    try {

        // ----------------------------------------------------
        // GET CANDIDATE RANKING
        // ----------------------------------------------------

        const result = await pool.query(
            `
            SELECT
                uba.candidate_id,
                u.name,
                u.email,

                COUNT(uba.id) AS interview_count,

                ROUND(
                    AVG(uba.overall_score)
                ) AS overall_score,

                ROUND(
                    AVG(uba.technical_relevance_score)
                ) AS technical_score,

                ROUND(
                    AVG(uba.communication_score)
                ) AS communication_score,

                ROUND(
                    AVG(uba.confidence_score)
                ) AS confidence_score,

                ROUND(
                    AVG(uba.professionalism_score)
                ) AS professionalism_score

            FROM "InterviewBehaviorAnalysis" uba

            JOIN users u
    ON u.id::text = uba.candidate_id::text

            GROUP BY
                uba.candidate_id,
                u.name,
                u.email

            ORDER BY
                AVG(uba.overall_score) DESC
            `
        );


        // ----------------------------------------------------
        // ADD RANK
        // ----------------------------------------------------

        const ranking = result.rows.map(
            (candidate, index) => ({

                rank: index + 1,

                candidateId:
                    candidate.candidate_id,

                name:
                    candidate.name,

                email:
                    candidate.email,

                interviewCount:
                    Number(
                        candidate.interview_count
                    ),

                overallScore:
                    Number(
                        candidate.overall_score || 0
                    ),

                technicalScore:
                    Number(
                        candidate.technical_score || 0
                    ),

                communicationScore:
                    Number(
                        candidate.communication_score || 0
                    ),

                confidenceScore:
                    Number(
                        candidate.confidence_score || 0
                    ),

                professionalismScore:
                    Number(
                        candidate.professionalism_score || 0
                    )

            })
        );


        // ----------------------------------------------------
        // TOP CANDIDATE
        // ----------------------------------------------------

        const topCandidate =
            ranking.length > 0
                ? ranking[0]
                : null;


        // ----------------------------------------------------
        // SUCCESS RESPONSE
        // ----------------------------------------------------

        res.status(200).json({

            success: true,

            message:
                "Candidate ranking generated successfully",

            totalCandidates:
                ranking.length,

            topCandidate,

            rankings:
                ranking

        });

    }
    catch (error) {

        console.error(
            "Candidate Ranking Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to generate candidate ranking",

            error:
                error.message

        });

    }
};
// ============================================================
// MODULE 10 - RECRUITER CANDIDATE PERFORMANCE OVERVIEW
// ============================================================

export const getCandidatePerformanceOverview = async (req, res) => {
    try {

        const result = await pool.query(
            `
            SELECT
                uba.candidate_id,
                u.name,
                u.email,

                COUNT(uba.id) AS interview_count,

                ROUND(AVG(uba.overall_score)) AS overall_score,
                ROUND(AVG(uba.technical_relevance_score)) AS technical_score,
                ROUND(AVG(uba.communication_score)) AS communication_score,
                ROUND(AVG(uba.confidence_score)) AS confidence_score,
                ROUND(AVG(uba.professionalism_score)) AS professionalism_score,

                MAX(uba.analyzed_at) AS last_interview

            FROM "InterviewBehaviorAnalysis" uba

            JOIN users u
                ON u.id::text = uba.candidate_id::text

            GROUP BY
                uba.candidate_id,
                u.name,
                u.email

            ORDER BY
                AVG(uba.overall_score) DESC
            `
        );

        const candidates = result.rows.map(candidate => ({
            candidateId: candidate.candidate_id,

            name: candidate.name,

            email: candidate.email,

            interviewCount:
                Number(candidate.interview_count || 0),

            overallScore:
                Number(candidate.overall_score || 0),

            technicalScore:
                Number(candidate.technical_score || 0),

            communicationScore:
                Number(candidate.communication_score || 0),

            confidenceScore:
                Number(candidate.confidence_score || 0),

            professionalismScore:
                Number(candidate.professionalism_score || 0),

            lastInterview:
                candidate.last_interview
        }));

        res.status(200).json({
            success: true,

            message:
                "Candidate performance overview generated successfully",

            totalCandidates:
                candidates.length,

            candidates
        });

    } catch (error) {

        console.error(
            "Candidate Performance Overview Error:",
            error
        );

        res.status(500).json({
            success: false,

            message:
                "Failed to generate candidate performance overview",

            error:
                error.message
        });
    }
};
// ============================================================
// MODULE 10 - INTERVIEW TEMPLATES
// ============================================================

// CREATE INTERVIEW TEMPLATE
export const createInterviewTemplate = async (req, res) => {
    try {

        const recruiterId = req.user.id;

        const {
            title,
            jobRole,
            description,
            questions
        } = req.body;

        // Validation
        if (!title || !jobRole) {
            return res.status(400).json({
                success: false,
                message: "Template title and job role are required"
            });
        }

        const templateQuestions =
            Array.isArray(questions) ? questions : [];

        const result = await pool.query(
            `
            INSERT INTO "InterviewTemplate"
            (
                recruiter_id,
                title,
                job_role,
                description,
                questions
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            `,
            [
                recruiterId,
                title,
                jobRole,
                description || "",
                JSON.stringify(templateQuestions)
            ]
        );

        res.status(201).json({
            success: true,
            message: "Interview template created successfully",
            template: result.rows[0]
        });

    } catch (error) {

        console.error(
            "Create Interview Template Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to create interview template",
            error: error.message
        });
    }
};


// GET RECRUITER INTERVIEW TEMPLATES
export const getInterviewTemplates = async (req, res) => {
    try {

        const recruiterId = req.user.id;

        const result = await pool.query(
            `
            SELECT
                id,
                recruiter_id,
                title,
                job_role,
                description,
                questions,
                created_at
            FROM "InterviewTemplate"
            WHERE recruiter_id = $1
            ORDER BY created_at DESC
            `,
            [recruiterId]
        );

        res.status(200).json({
            success: true,
            message: "Interview templates retrieved successfully",
            totalTemplates: result.rows.length,
            templates: result.rows
        });

    } catch (error) {

        console.error(
            "Get Interview Templates Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to retrieve interview templates",
            error: error.message
        });
    }
};
// ============================================================
// MODULE 9 - INTERVIEW REMINDERS + EMAIL NOTIFICATION
// ============================================================

export const createInterviewReminder = async (req, res) => {

    try {

        const candidateId = req.user.id;

        const {
            interviewDate,
            interviewTime
        } = req.body;

        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (!interviewDate || !interviewTime) {

            return res.status(400).json({
                success: false,
                message: "Interview date and time are required"
            });

        }

        // ----------------------------------------------------
        // CREATE REMINDER DATE
        // ----------------------------------------------------

        const reminderDateTime =
            new Date(`${interviewDate}T${interviewTime}`);

        if (isNaN(reminderDateTime.getTime())) {

            return res.status(400).json({
                success: false,
                message: "Invalid interview date or time"
            });

        }

        // ----------------------------------------------------
        // GET CANDIDATE EMAIL
        // ----------------------------------------------------

        const candidateResult = await pool.query(
            `SELECT name, email
             FROM users
             WHERE id = $1`,
            [candidateId]
        );

        if (candidateResult.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Candidate not found"
            });

        }

        const candidate = candidateResult.rows[0];

        // ----------------------------------------------------
        // SEND EMAIL NOTIFICATION
        // ----------------------------------------------------

        await emailTransporter.sendMail({

            from: process.env.EMAIL_USER,

            to: candidate.email,

            subject: "SmartHire AI - Interview Reminder",

            text:
`Hello ${candidate.name || "Candidate"},

Your SmartHire AI interview is scheduled for:

Date: ${interviewDate}
Time: ${interviewTime}

You have successfully created an interview reminder.

Please be ready before the scheduled interview time.

Regards,
SmartHire AI`
        });

        // ----------------------------------------------------
        // RETURN REMINDER DETAILS
        // ----------------------------------------------------

        res.status(201).json({

            success: true,

            message:
                "Interview reminder created and email notification sent successfully",

            emailSent: true,

            reminder: {

                candidateId,

                interviewDate,

                interviewTime,

                reminderTime:
                    new Date(
                        reminderDateTime.getTime()
                        - 30 * 60 * 1000
                    ).toISOString()

            }

        });

    }

    catch (error) {

        console.error(
            "Interview Reminder / Email Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to create interview reminder or send email",

            error:
                error.message

        });

    }

};
// ============================================================
// ADMIN - AI PERFORMANCE MONITORING
// ============================================================

export const getAdminAIPerformance = async (req, res) => {
    try {

        const result = await pool.query(`
            SELECT
                COUNT(*) AS total_analyses,

                ROUND(AVG(overall_score)) AS average_overall_score,

                ROUND(AVG(technical_relevance_score))
                    AS average_technical_score,

                ROUND(AVG(communication_score))
                    AS average_communication_score,

                ROUND(AVG(confidence_score))
                    AS average_confidence_score,

                ROUND(AVG(professionalism_score))
                    AS average_professionalism_score,

                COUNT(*) FILTER (
                    WHERE performance_rating = 'Excellent'
                ) AS excellent_count,

                COUNT(*) FILTER (
                    WHERE performance_rating = 'Good'
                ) AS good_count,

                COUNT(*) FILTER (
                    WHERE performance_rating = 'Average'
                ) AS average_count,

                COUNT(*) FILTER (
                    WHERE performance_rating = 'Needs Improvement'
                ) AS needs_improvement_count,

                COUNT(*) FILTER (
                    WHERE performance_rating = 'Poor'
                ) AS poor_count

            FROM "InterviewBehaviorAnalysis"
        `);

        res.status(200).json({
            success: true,
            performance: result.rows[0]
        });

    } catch (error) {

        console.error(
            "Admin AI Performance Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load AI performance data",
            error: error.message
        });
    }
};