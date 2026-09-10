import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";

import {
    registerUser,
    loginUser
} from "../controllers/authController.js";

const router = express.Router();

// =========================
// Register
// =========================
router.post("/register", registerUser);

// =========================
// Login
// =========================
router.post("/login", loginUser);

// =========================
// Google Login
// =========================
router.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })
);

// =========================
// Google Callback
// =========================
router.get(
    "/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login"
    }),
    async (req, res) => {

        const token = jwt.sign(
            {
                id: req.user.id,
                email: req.user.email,
                role: req.user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        // Redirect based on role
        if (req.user.role === "USER") {

            return res.redirect(
                `https://frontend-ruby-kappa-81.vercel.app/candidate.html?token=${token}`
            );

        }

        if (req.user.role === "RECRUITER") {

            return res.redirect(
                `https://frontend-ruby-kappa-81.vercel.app/recruiter.html?token=${token}`
            );

        }

        if (req.user.role === "ADMIN") {

            return res.redirect(
                `https://frontend-ruby-kappa-81.vercel.app/admin.html?token=${token}`
            );

        }

        res.redirect(
            `https://frontend-ruby-kappa-81.vercel.app/login.html`
        );

    }
);

export default router;