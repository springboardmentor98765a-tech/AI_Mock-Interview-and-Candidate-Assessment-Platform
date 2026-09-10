import express from "express";
import {
    analyzeResume,
    analyzeCommunication,
    saveBehaviorAnalysis,
    getLatestInterviewPerformance,
    getSkillWiseAnalytics,
    getCandidateRanking,
    getCandidatePerformanceOverview,
    createInterviewTemplate,
    createInterviewReminder,
    getInterviewTemplates,
    getAdminAIPerformance
} from "../controllers/aiController.js";
import {
    verifyToken,
    authorizeRoles
} from "../middleware/authMiddleware.js";

const router = express.Router();

// =====================================
// AI Skill Extraction
// =====================================
router.get(
    "/extract-skills",
    verifyToken,
    analyzeResume
);
// =====================================
// Module 5 - Communication Analysis
// =====================================

router.post(
    "/analyze-communication",
    verifyToken,
    analyzeCommunication
);
// =====================================
// MODULE 6 - BEHAVIOR ANALYSIS
// =====================================

router.post(
    "/save-behavior-analysis",
    verifyToken,
    saveBehaviorAnalysis
);
// Get latest Module 7 interview performance
router.get(
    "/latest-interview-performance",
    verifyToken,
    getLatestInterviewPerformance
);
// ============================================================
// MODULE 8 - SKILL-WISE ANALYTICS
// ============================================================

router.get(
    "/skill-wise-analytics",
    verifyToken,
    getSkillWiseAnalytics
);
// ============================================================
// MODULE 8 - CANDIDATE RANKING
// ============================================================

router.get(
    "/candidate-ranking",
    verifyToken,
    getCandidateRanking
);
// ============================================================
// MODULE 10 - RECRUITER CANDIDATE PERFORMANCE OVERVIEW
// ============================================================

router.get(
    "/candidate-performance-overview",
    verifyToken,
    getCandidatePerformanceOverview
);
// ============================================================
// MODULE 10 - INTERVIEW TEMPLATES
// ============================================================

router.post(
    "/interview-templates",
    verifyToken,
    createInterviewTemplate
);

router.get(
    "/interview-templates",
    verifyToken,
    getInterviewTemplates
);
// ============================================================
// MODULE 9 - INTERVIEW REMINDERS
// ============================================================

router.post(
    "/interview-reminder",
    verifyToken,
    createInterviewReminder
);
// ============================================================
// ADMIN - AI PERFORMANCE MONITORING
// ============================================================

router.get(
    "/admin/ai-performance",
    verifyToken,
    authorizeRoles("ADMIN"),
    getAdminAIPerformance
);
export default router;