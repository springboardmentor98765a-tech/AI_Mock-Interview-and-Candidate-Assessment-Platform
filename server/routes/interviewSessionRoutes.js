import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import {
    createInterviewSession,
    startInterviewSession,
    pauseInterviewSession,
    resumeInterviewSession,
    endInterviewSession,
    saveInterviewAnswer,
    getInterviewSession,
    uploadInterviewRecording,
    streamRecruiterRecording,
    getRecruiterRecordings,
    getRecruiterRecording
} from "../controllers/interviewSessionController.js";

import {
    verifyToken,
    authorizeRoles
} from "../middleware/authMiddleware.js";

const router = express.Router();


// ============================================
// CREATE SESSION
// ============================================

router.post(
    "/session",
    verifyToken,
    createInterviewSession
);


// ============================================
// START SESSION
// ============================================

router.post(
    "/session/:id/start",
    verifyToken,
    startInterviewSession
);


// ============================================
// PAUSE SESSION
// ============================================

router.post(
    "/session/:id/pause",
    verifyToken,
    pauseInterviewSession
);


// ============================================
// RESUME SESSION
// ============================================

router.post(
    "/session/:id/resume",
    verifyToken,
    resumeInterviewSession
);


// ============================================
// END SESSION
// ============================================

router.post(
    "/session/:id/end",
    verifyToken,
    endInterviewSession
);


// ============================================
// GET SESSION
// ============================================

router.get(
    "/session/:id",
    verifyToken,
    getInterviewSession
);
// ============================================
// UPLOAD RECORDING
// ============================================

router.post(

    "/recording",

    verifyToken,

    upload.single("recording"),

    uploadInterviewRecording

);
// ============================================
// SAVE INTERVIEW ANSWER
// ============================================

router.post(
    "/session/:id/answer",
    verifyToken,
    saveInterviewAnswer
);
// ============================================
// RECRUITER - GET ALL RECORDINGS
// ============================================

router.get(
    "/recruiter/recordings",
    verifyToken,
    authorizeRoles("RECRUITER"),
    getRecruiterRecordings
);


// ============================================
// RECRUITER - STREAM RECORDING
// ============================================

router.get(
    "/recruiter/recordings/:id",
    verifyToken,
    authorizeRoles("RECRUITER"),
    streamRecruiterRecording
);
// ============================================
// RECRUITER - GET ALL RECORDINGS
// ============================================

router.get(
    "/recruiter/recordings",
    verifyToken,
    getRecruiterRecordings
);


// ============================================
// RECRUITER - GET SINGLE RECORDING
// ============================================

router.get(
    "/recruiter/recordings/:id",
    verifyToken,
    getRecruiterRecording
);
export default router;