import express from "express";
import { generateQuestions } from "../controllers/interviewController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// Generate AI Interview Questions
// ==========================================
router.post(
    "/generate",
    verifyToken,
    generateQuestions
);

export default router;