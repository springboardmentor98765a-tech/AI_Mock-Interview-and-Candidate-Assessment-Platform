import express from "express";
import {
    verifyToken,
    authorizeRoles
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ================= USER Dashboard =================
router.get(
    "/user",
    verifyToken,
    authorizeRoles("USER"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Welcome User Dashboard",
            user: req.user
        });
    }
);

// ================= RECRUITER Dashboard =================
router.get(
    "/recruiter",
    verifyToken,
    authorizeRoles("RECRUITER"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Welcome Recruiter Dashboard",
            user: req.user
        });
    }
);

// ================= ADMIN Dashboard =================
router.get(
    "/admin",
    verifyToken,
    authorizeRoles("ADMIN"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Welcome Admin Dashboard",
            user: req.user
        });
    }
);

// ================= Common Dashboard =================
router.get(
    "/dashboard",
    verifyToken,
    authorizeRoles("USER", "RECRUITER", "ADMIN"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Dashboard Access Granted",
            user: req.user
        });
    }
);

export default router;