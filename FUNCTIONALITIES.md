# 📖 SmartHire AI — Complete Functionalities & Pages Guide

This document provides a comprehensive, end-to-end breakdown of every page, view, module, and user journey within **SmartHire AI**.

---

## 📑 Table of Contents
1. [User Roles & Access Control](#-user-roles--access-control)
2. [Authentication & Onboarding Flow](#-authentication--onboarding-flow)
3. [Candidate Portal](#-candidate-portal)
   - [Candidate Overview & Readiness Hub](#1-candidate-overview--readiness-hub)
   - [AI Mock Interview Generator](#2-ai-mock-interview-generator)
   - [Live Multi-Modal Interview Arena](#3-live-multi-modal-interview-arena)
   - [Performance Reports & Video Playback](#4-performance-reports--video-playback)
   - [Practice Assessments & Quizzes](#5-practice-assessments--quizzes)
   - [Job Board & 1-Click Applications](#6-job-board--1-click-applications)
   - [AI Resume Analyzer & ATS Optimizer](#7-ai-resume-analyzer--ats-optimizer)
   - [Candidate Profile & Privacy Controls](#8-candidate-profile--privacy-controls)
4. [Recruiter Portal](#-recruiter-portal)
   - [Recruiter Overview & Pipeline Metrics](#1-recruiter-overview--pipeline-metrics)
   - [Job Postings & Requisitions Manager](#2-job-postings--requisitions-manager)
   - [Candidate ATS Talent Pool](#3-candidate-ats-talent-pool)
   - [Candidate Comparison Matrix](#4-candidate-comparison-matrix)
   - [Interview Activity & Score Audits](#5-interview-activity--score-audits)
5. [Administrator Portal](#-administrator-portal)
   - [Platform Overview & Activity Progression](#1-platform-overview--activity-progression)
   - [Real-Time System & AI Telemetry](#2-real-time-system--ai-telemetry)
   - [User & Recruiter Management](#3-user--recruiter-management)
   - [Audit Logs & Event Tracking](#4-audit-logs--event-tracking)
   - [System Health Report (PDF Export)](#5-system-health-report-pdf-export)
6. [Cross-Cutting Platform Features](#-cross-cutting-platform-features)

---

## 👥 User Roles & Access Control

SmartHire AI enforces strict **Role-Based Access Control (RBAC)** across three distinct persona types:

| Role | Target User | Key Capabilities |
| :--- | :--- | :--- |
| **Candidate** | Job seekers, students, and interviewees | Practice mock interviews with real-time AI vision & speech feedback, view detailed analytics reports, apply for jobs, analyze resumes, take skill quizzes. |
| **Recruiter** | Hiring managers, talent acquisition teams | Post job requisitions, view and filter the applicant talent pool, run side-by-side multi-candidate comparisons, review candidate interview recordings and AI scorecards. |
| **Admin** | System administrators & platform operators | Oversee all platform activity, monitor AI/infrastructure telemetry, manage user/recruiter accounts, inspect system audit logs, export high-fidelity system health reports in PDF. |

---

## 🔐 Authentication & Onboarding Flow

### 1. Sign In Page
* **Dual Login Options**:
  * **Email & Password**: Authenticates against SQLite with salted bcrypt hashing and issues a signed JSON Web Token (JWT).
  * **Continue with Google**: One-tap OAuth 2.0 integration verified via Google Identity Services (`google-auth`). Automatically assigns new Google users to the Candidate role.
* **Security Guardrails**:
  * Visual password visibility toggle (eye icon).
  * Rate-limiting and error feedback on invalid credentials.
  * Direct link to Password Recovery.

### 2. Registration Page
* **Public Registration**: Users can register independently as either a **Candidate** or a **Recruiter**.
* **Admin Registration Protection**: Public registration for the `Admin` role is strictly blocked by backend validation; administrative access can only be granted by existing administrators or configured via environment variables (`ADMIN_EMAILS`).

### 3. Password Reset & Recovery
* **Forgot Password Modal**: Users enter their registered email address to receive a secure, cryptographically generated password reset token.
* **Email Delivery**: Integrates with the **Resend API** to deliver a responsive, branded HTML email containing a time-limited (5-minute expiration) reset link.
* **Password Reset View**: Validates the single-use token and updates the user's hashed password in the database.

---

## 🎓 Candidate Portal

The Candidate Portal is a complete interview readiness cockpit designed to build interview mastery through generative AI and multi-modal proctoring.

```
[Candidate Workspace]
 ├── Overview (Readiness Score, Recent Interviews, Quick Links)
 ├── Mock Interviews (Configurator -> Live Arena -> Report)
 ├── Performance Reports (Video Replay, Pillar Scores, Transcripts)
 ├── Practice Assessments (Timed Conceptual Quizzes)
 ├── Explore Jobs (Search, Filter, 1-Click Apply)
 ├── Resume Analyzer (ATS Match Score, Keyword Gap Analysis)
 └── Profile & Privacy (Avatar, Personal Info, Recruiter Visibility)
```

### 1. Candidate Overview & Readiness Hub
* **Candidate Readiness Score**: Dynamic composite rating (0–100%) calculated across recent interview performances.
* **Quick Stats Cards**: Displays Total Completed Interviews, Average Technical Score, Average Communication Score, and Job Applications sent.
* **Recent Activity Feed**: Quick-access cards to resume past interviews, review new feedback reports, or attempt recommended practice assessments.

### 2. AI Mock Interview Generator
* **Flexible Customization**:
  * **Job Role**: Select from popular tech and business domains (Full Stack, Backend, Frontend, Data Scientist, ML Engineer, DevOps, Product Manager) or enter a custom target title.
  * **Experience Level**: Entry-Level (0-2 yrs), Mid-Level (3-5 yrs), Senior (5+ yrs), Lead / Principal.
  * **Duration & Question Count**: Choose from 3, 5, or 10 questions with customized pacing.
  * **Focus Areas**: Select Behavioral, System Design, Core Fundamentals, or Problem Solving.
* **Multi-Tier AI Question Engine**:
  * Uses **Groq (Qwen 3.6 / LLaMA)** for sub-second generation.
  * Automatic fallback to **Google Gemini Flash** (`gemini-3.6-flash` / `gemini-3.5-flash`).
  * Secondary failover to **Xiaomi Mimo** and an indigenous curated fallback question bank if offline.

### 3. Live Multi-Modal Interview Arena
* **Interactive Webcam & Audio Capture**: Browser-native WebRTC MediaStream recording of synchronized video and audio.
* **Real-Time Computer Vision Telemetry**:
  * **MediaPipe FaceMesh**: Tracks 478 3D facial landmarks at 30 FPS in client Web Workers.
  * **Head Pose & Attention Monitoring**: Detects yaw, pitch, and roll to compute continuous candidate eye contact and attention percentage.
  * **Custom CNN Emotion Model**: Classifies real-time facial micro-expressions into Confidence, Nervousness, Confusion, and Neutrality.
  * **Gaze Direction Tracking**: MobileNetV2 CNN identifies looking away, screen deviation, or multi-person presence anomalies.
* **Real-Time Speech & Linguistic Processing**:
  * **Groq Whisper STT**: Ultra-low-latency transcription of candidate spoken responses.
  * **Speech Pace Calculation**: Measures Words Per Minute (WPM) against optimal conversational bands (120–150 WPM).
  * **Hesitation & Filler Word Counter**: Highlights filler terms (*"um"*, *"like"*, *"basically"*, *"you know"*).
  * **Grammar & Articulation Rating**: Syntactic analysis of answer coherence.
* **Live Question Prompter**: Features voice synthesis (Text-to-Speech) for an authentic conversational experience, question progression controls, and interview timers.

### 4. Performance Reports & Video Playback
* **Overall Composite Score**: Weighted breakdown across four enterprise assessment pillars:
  $$\text{Score} = (\text{Technical} \times 0.30) + (\text{Communication} \times 0.30) + (\text{Confidence} \times 0.25) + (\text{Professionalism} \times 0.15)$$
* **Synchronized Video Recording Replay**: Built-in video player streaming candidate recordings with timestamped behavioral anomaly tags.
* **Interactive Radar & Bar Charts**: Chart.js visualizations benchmarking candidate performance against industry percentiles.
* **Question-by-Question Deep Dive**: Side-by-side inspection of candidate transcript, AI-identified strengths, areas for improvement, and ideal answer recommendations.
* **PDF Report Download**: Generates an executive candidate interview scorecard using `jspdf` for offline review or portfolio sharing.

### 5. Practice Assessments & Quizzes
* **Curated Skill Quizzes**: Timed multiple-choice assessments covering Python, JavaScript, Algorithms, System Design, and Cloud Architecture.
* **Instant Evaluation**: Immediate scoring with detailed explanations for each correct and incorrect option.
* **Readiness Integration**: Practice assessment performance dynamically factors into the candidate's global Readiness Score.

### 6. Job Board & 1-Click Applications
* **Real-Time Job Requisitions**: Browse verified openings posted directly by recruiters on the platform.
* **Intelligent Filtering**: Filter by role, department, seniority level, and location (Remote, Hybrid, Onsite).
* **1-Click Apply**: Candidate profile, readiness metrics, and latest interview scores are bundled and submitted directly to the recruiter's ATS dashboard.
* **Application Tracker**: Live tracking of application states: *Applied*, *Under Review*, *Interview Shortlisted*, *Offered*, or *Archived*.

### 7. AI Resume Analyzer & ATS Optimizer
* **Resume Upload & Parsing**: Supports PDF and DOCX resume uploads with automatic text extraction.
* **ATS Compatibility Match**: Scores resume alignment against targeted roles or specific job descriptions.
* **Actionable Feedback**: Identifies missing technical keywords, formatting red flags, and quantified achievement suggestions.

### 8. Candidate Profile & Privacy Controls
* **Profile Management**: Update name, bio, target job roles, skills tags, LinkedIn, and GitHub links.
* **Avatar Upload**: Custom profile image upload with automatic thumbnail cropping.
* **ATS Candidate Privacy Toggle**:
  * **Public / Discoverable**: Candidate profile, readiness score, and top interview reports are visible in the recruiter talent pool.
  * **Stealth / Private Mode**: Candidate profile is completely hidden from recruiter search and talent pools until the candidate explicitly applies to a specific job.

---

## 💼 Recruiter Portal

The Recruiter Portal transforms unstructured interview data into actionable hiring intelligence.

```
[Recruiter Workspace]
 ├── Overview (Pipeline Funnel, Top Candidates, Open Requisitions)
 ├── Job Requisitions (Create, Edit, Publish, Close Postings)
 ├── ATS Talent Pool (Search, Skill Filters, Candidate Cards, Modal View)
 ├── Comparison Matrix (Side-by-Side Candidate Evaluation)
 └── Interview Activity (Audit Candidate Submissions & Scores)
```

### 1. Recruiter Overview & Pipeline Metrics
* **Talent Metrics**: Real-time counter of Active Job Postings, Total Applicants, Evaluated Candidates, and Shortlisted Talent.
* **Top Recommended Candidates**: AI-ranked leaderboard highlighting candidates with the highest Readiness and Technical Scores.
* **Recent Submissions Feed**: Instant alerts when a candidate completes an interview or submits an application.

### 2. Job Postings & Requisitions Manager
* **Job Creation Wizard**: Define job title, department, employment type, location, experience requirements, salary range, and required skill tags.
* **Status Management**: Toggle listings between *Draft*, *Active / Published*, and *Closed*.
* **Applicant Breakdown**: Direct counter showing total applicants per individual job requisition.

### 3. Candidate ATS Talent Pool
* **Intelligent Candidate Search**: Real-time search bar filtering across candidate names, target roles, and specific skill tags.
* **Readiness & Experience Sliders**: Filter talent by minimum Readiness Score (e.g. $\ge 80\%$) and years of experience.
* **Privacy-Respecting View**: Automatically excludes candidates who have toggled Stealth Mode, ensuring candidate data compliance.
* **Candidate Detail Modal**:
  * Full candidate resume summary and contact information.
  * History of mock interview scores, communication ratings, and proctoring trust scores.
  * Direct action buttons to Shortlist, Reject, or Schedule an Official Interview.

### 4. Candidate Comparison Matrix
* **Multi-Candidate Benchmark**: Select up to 4 candidates simultaneously for a side-by-side comparative analysis.
* **Pillar-by-Pillar Comparison**: Visual comparison across Technical Competence, Communication Clarity, Emotional Confidence, and Professionalism.
* **Comparative Radar Chart**: Overlaid multi-series radar chart highlighting strengths and weaknesses between finalists.

### 5. Interview Activity & Score Audits
* **Comprehensive Log**: Chronological feed of all interviews conducted across the recruiter's active jobs.
* **Direct Report Access**: 1-click modal access to full candidate scorecards, transcripts, and video playback recordings.

---

## 🛡️ Administrator Portal

The Administrator Portal provides platform-wide governance, system monitoring, and administrative control.

```
[Admin Workspace]
 ├── Platform Overview (User Totals, Interview Counts, 14-Day Chart)
 ├── System & AI Telemetry (Groq STT, Vision FPS, LLM Latency, SQLite WAL)
 ├── User Management (Search, Role Filter, Deactivate, Delete)
 ├── Platform Activity Log (Audit Trail of Logins, Interviews, Jobs)
 └── System Health Report (1-Click Administrative PDF Export)
```

### 1. Platform Overview & Activity Progression
* **High-Level KPI Badges**: Total Registered Users, Active Candidates, Active Recruiters, and Total Interviews Conducted.
* **14-Day Platform Activity Progression**: Continuous Chart.js line graph displaying daily candidate interview volume over the past two weeks with smooth bezier curves.
* **Recent Interviews Table**: Live table of recently completed interviews with status badges, composite scores, candidate details, and an instant *"View Report"* modal trigger.
* **Recent Registrations**: Quick glance at newly registered platform users.
* **Administrative Shortcuts**: Fast navigation to User Management, Audit Logs, and System Health.

### 2. Real-Time System & AI Telemetry Card
* **Groq Whisper STT**: Live health indicator and latency status for transcription APIs.
* **MediaPipe Vision**: Real-time client-side vision processing frame rate (Target: 30 FPS).
* **LLM Fallback Latency**: Real-time response time monitoring for Groq/Gemini generation.
* **SQLite WAL Status**: Real-time database write-ahead log health and active connection tracking.

### 3. User & Recruiter Management
* **Search & Role Filtering**: Search users by name or email, with segmented tabs: *All Users*, *Candidates*, *Recruiters*, and *Administrators*.
* **Status Badges**: Indicates active or deactivated account status.
* **Administrative Actions**: Secure endpoints to deactivate or permanently delete accounts with confirmation modals.

### 4. Platform Activity Log & Audit Trail
* **Audited Events**: Tracks user registrations, successful logins, password resets, interview creations, interview completions, and job status modifications.
* **Security Context**: Logs event timestamps, user roles, and severity levels (*info*, *warning*, *critical*).

### 5. System Health Report (PDF Export)
* **1-Click Executive PDF Generation**: Built directly into the overview and activity log pages using `jspdf`.
* **Report Contents**:
  * Platform summary metrics (Users, Recruiters, Candidates, Interviews).
  * System uptime, database engine status (SQLite WAL), and schema version.
  * AI Service operational metrics (Groq Whisper, Gemini Flash, MediaPipe).
  * 14-day interview completion timeline data table.
  * Complete audit trail log with timestamps and event details.

---

## ⚙️ Cross-Cutting Platform Features

1. **Dark Mode & Glassmorphism Design**:
   - Modern, high-contrast dark aesthetic built with customized CSS variables (`--bg-primary`, `--accent-primary`, `--glass-bg`).
   - Smooth backdrop blur filters and glowing accent borders.
2. **Modular Single Page Application (SPA)**:
   - Zero full-page reloads; lightning-fast view transitions handled by `frontend/js/app.js`.
   - Dynamic browser hash routing (`#candidate`, `#recruiter`, `#admin`, `#login`).
3. **Responsive Mobile & Desktop Layouts**:
   - Adaptive CSS grid and flexbox architecture supporting mobile screens, tablets, and ultrawide monitors.
4. **Toast Notification System**:
   - Non-intrusive toast alert component with automatic dismiss timers for success, warning, and error messages.
