import express from "express";
import upload from "../middleware/uploadMiddleware.js";

import {
    uploadResume,
    getResume,
    deleteResume
} from "../controllers/resumeController.js";

import {
    verifyToken
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ===================================
// Upload Resume
// ===================================
router.post(
    "/upload",
    verifyToken,
    upload.single("resume"),
    uploadResume
);

// ===================================
// Get Resume
// ===================================
router.get(
    "/my-resume",
    verifyToken,
    getResume
);

// ===================================
// Delete Resume
// ===================================
router.delete(
    "/delete",
    verifyToken,
    deleteResume
);

export default router;