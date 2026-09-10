import express from "express";

import {

verifyToken,
authorizeRoles

} from "../middleware/authMiddleware.js";

import {

getProfile,
updateProfile,
getAllUsers,
deleteUser,
getSystemHealthReport,
getPlatformUsageAnalytics

} from "../controllers/userController.js";

const router = express.Router();

router.get("/profile", verifyToken, getProfile);

router.put("/profile", verifyToken, updateProfile);
// ============================================================
// ADMIN - MANAGE USERS
// ============================================================

router.get(
    "/admin/users",
    verifyToken,
    authorizeRoles("admin"),
    getAllUsers
);

router.delete(
    "/admin/users/:id",
    verifyToken,
    authorizeRoles("admin"),
    deleteUser
);
// ============================================================
// ADMIN - SYSTEM ACTIVITY / HEALTH REPORT
// ============================================================

router.get(
    "/admin/system-health",
    verifyToken,
    authorizeRoles("ADMIN"),
    getSystemHealthReport
);
// ============================================================
// ADMIN - PLATFORM USAGE ANALYTICS
// ============================================================

router.get(
    "/admin/platform-usage",
    verifyToken,
    authorizeRoles("ADMIN"),
    getPlatformUsageAnalytics
);
export default router;