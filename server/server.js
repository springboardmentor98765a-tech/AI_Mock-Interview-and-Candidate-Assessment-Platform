import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import "./db.js";
import authRoutes from "./routes/authRoutes.js";
import protectedRoutes from "./routes/protectedRoutes.js";
import session from "express-session";
import passport from "./config/passport.js";
import userRoutes from "./routes/userRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import interviewRoutes from "./routes/interviewRoutes.js";
import interviewSessionRoutes
    from "./routes/interviewSessionRoutes.js";
   


dotenv.config();

const app = express();
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false
    })
);
app.use("/api/user", userRoutes);
app.use(passport.initialize());
app.use(passport.session());

// Middleware
app.use(cors());
app.use(express.json());

//Routes
app.use("/api/auth", authRoutes);

//protected routes
app.use("/api/protected", protectedRoutes);

// Test Route
app.get("/", (req, res) => {
    res.send("🚀 SmartHire AI Backend is Running...");
});

// Resume Routes
app.use("/api/resume", resumeRoutes);

// AI Routes
app.use("/api/ai", aiRoutes);

// Interview Routes
app.use("/api/interview", interviewRoutes);
app.use(
    "/api/interview",
    interviewSessionRoutes
);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server Running on http://localhost:${PORT}`);
});