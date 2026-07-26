# SmartHire AI - Modern AI Recruitment Platform

SmartHire AI is a modern SaaS-style frontend website for an AI-powered recruitment platform designed to transform hiring through AI-driven mock interviews, resume analysis, candidate analytics, and recruiter dashboards.

---

## 🚀 Technical Highlights

- **Pure Frontend Architecture**: Built strictly using standard **HTML5**, **CSS3**, and **Vanilla JavaScript (ES6+)**.
- **Zero Heavy Dependencies**: No frameworks (React, Angular, Vue, Bootstrap, Tailwind, Node.js, Express, PHP), no databases, no backend, and no external storage APIs.
- **SaaS Design System**:
  - **Primary**: `#2563EB` (Royal Blue)
  - **Secondary**: `#7C3AED` (Violet/Purple)
  - **Accent**: `#06B6D4` (Cyan)
  - **Background**: `#F8FAFC` (Slate Light Gray)
  - Glassmorphic navigation headers, soft elevation shadows, rounded card corners, and responsive grids.
- **UI Demonstration**: Interactive buttons trigger custom non-intrusive feedback toast alerts to demonstrate features.

---

## 📁 Project Structure

```
SmartHireAI/
├── index.html          # Public Landing Page (Navbar, Hero, Features, Workflow Pipeline, Stats Counters, Testimonials, Footer)
├── login.html          # Login Portal UI Card (Email, Password, Non-functional UI links)
├── candidate.html      # Candidate Dashboard (Resume Upload, Mock Interview, History, Analytics, PDF Reports, Progress)
├── recruiter.html      # Recruiter Dashboard (Candidate Analytics, Reports, Candidate Comparison, Templates, Session Monitor, Candidate Table)
├── admin.html          # Admin Dashboard (User/Recruiter Mgmt, Platform Settings, Telemetry, AI Configs, Platform Analytics, Audit Log)
├── css/
│   └── style.css       # Clean Design System, Layout Utilities, Glassmorphism, CSS Charts, Media Queries
├── js/
│   └── script.js       # Mobile Menu Toggle, Scroll Animations, Animated Stat Counters, Active Link Highlighting, UI Toast Alerts
├── images/
│   └── hero.svg        # Scalable Vector Graphics Hero Graphic
└── README.md           # Documentation
```

---

## 🌐 Pages Overview

1. **Home Page (`index.html`)**:
   - Sticky Glassmorphism Header Navigation
   - Hero Section with Gradient Headings & CTA Buttons
   - 6 Core Feature Cards (AI Resume Analysis, Mock Interviews, Performance Analytics, Recruiter Dashboard, Candidate Reports, Admin Management)
   - 5-Step Connected Workflow Pipeline (Resume Upload → AI Analysis → Mock Interview → Performance Report → Recruiter Review)
   - Animated Statistics Counter (1,200+ Candidates, 300+ Recruiters, 95% Accuracy, 5,000+ Interviews)
   - Testimonials Grid & Footer

2. **Login Page (`login.html`)**:
   - Centered Glass Card UI with Email & Password input controls
   - UI Demonstration Login Button & Styled Non-Functional Links

3. **Candidate Dashboard (`candidate.html`)**:
   - Left Sidebar Navigation & Welcome Banner
   - 4 Quick Stat Cards (Resume Score, Interview Score, Completed Interviews, Improvement %)
   - Feature Cards matching all candidate tools (Upload Resumes, Attend Mock Interviews, View History, Access Analytics, Download Reports, Track Progress)
   - Pure CSS Interactive Bar & Progress Visualizers

4. **Recruiter Dashboard (`recruiter.html`)**:
   - Recruiter Metric Cards (Total Candidates, Interviews, Shortlisted, Rejected)
   - Feature Cards for Analytics Review, Candidate Reports, Candidate Comparison, Interview Templates, and Live Session Monitoring
   - Detailed Candidate Table with status badges and action triggers

5. **Admin Dashboard (`admin.html`)**:
   - Admin Metric Cards (Total Users, Recruiters, Candidates, Completed Interviews)
   - Feature Cards for User/Recruiter Management, Platform Settings, Telemetry Monitoring, AI Hyper-parameter Configurations, and Platform-wide Analytics
   - Detailed System Activity & Audit Log Table

---

## 💻 How to Run

Since SmartHire AI is a pure static frontend web application, no server installation or build steps are required.

1. Open the project root directory in your file explorer.
2. Double-click **`index.html`** to open it directly in any standard browser (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari).
3. Navigate between pages using the sticky navbar or dashboard sidebar menus.
