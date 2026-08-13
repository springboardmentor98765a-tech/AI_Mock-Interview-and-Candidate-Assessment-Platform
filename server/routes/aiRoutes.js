import express from "express";
import { analyzeResume } from "../controllers/aiController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// =====================================
// AI Skill Extraction
// =====================================
router.get(
    "/extract-skills",
    verifyToken,
    analyzeResume
);

export default router;