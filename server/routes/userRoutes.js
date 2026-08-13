import express from "express";

import {

verifyToken

} from "../middleware/authMiddleware.js";

import {

getProfile,
updateProfile

} from "../controllers/userController.js";

const router = express.Router();

router.get("/profile", verifyToken, getProfile);

router.put("/profile", verifyToken, updateProfile);

export default router;