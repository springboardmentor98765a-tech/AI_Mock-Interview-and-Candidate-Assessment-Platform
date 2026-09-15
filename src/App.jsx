import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminRecruiters from "./pages/AdminRecruiters";
import AdminAnalytics from "./pages/AdminAnalytics";

import RecruiterDashboard from "./pages/RecruiterDashboard";
import RecruiterCandidates from "./pages/RecruiterCandidates";
import RecruiterReports from "./pages/RecruiterReports";
import RecruiterCompare from "./pages/RecruiterCompare";
import RecruiterTemplates from "./pages/RecruiterTemplates";
import RecruiterMonitoring from "./pages/RecruiterMonitoring";

import CandidateDashboard from "./pages/CandidateDashboard";
import ResumeUpload from "./pages/ResumeUpload";
import InterviewGeneration from "./pages/InterviewGeneration";
import MockInterview from "./pages/MockInterview";
import InterviewComplete from "./pages/InterviewComplete";

import "./App.css";

// =========================================================
// LANDING PAGE
// =========================================================

function LandingPage() {
  const goToLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="landing-page">

      {/* NAVBAR */}

      <nav className="navbar">

        <div className="logo">
          <div className="logo-icon">S</div>

          <span>
            SmartHire<span className="logo-ai"> AI</span>
          </span>
        </div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
        </div>

        <button
          className="nav-login"
          onClick={goToLogin}
        >
          Login
        </button>

      </nav>

      {/* HERO */}

      <section className="hero" id="home">

        <div className="hero-content">

          <div className="badge">
            ✨ AI-Powered Interview Platform
          </div>

          <h1>
            Hire Smarter.
            <br />
            <span>Interview Better.</span>
          </h1>

          <p>
            SmartHire AI helps candidates practice interviews,
            recruiters evaluate talent, and organizations make
            smarter hiring decisions using intelligent AI-powered
            assessment.
          </p>

          <div className="hero-buttons">

            <button
              className="primary-btn"
              onClick={goToLogin}
            >
              Get Started
              <span>→</span>
            </button>

            <button
              className="secondary-btn"
              onClick={() =>
                document
                  .getElementById("features")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
            >
              Explore Features
            </button>

          </div>

          <div className="trust-row">

            <div>
              <strong>AI</strong>
              <span>Powered</span>
            </div>

            <div className="trust-line"></div>

            <div>
              <strong>360°</strong>
              <span>Assessment</span>
            </div>

            <div className="trust-line"></div>

            <div>
              <strong>3</strong>
              <span>User Roles</span>
            </div>

          </div>

        </div>

        {/* VISUAL */}

        <div className="hero-visual">

          <div className="floating-card card-one">

            <div className="mini-icon">🎯</div>

            <div>
              <strong>AI Assessment</strong>
              <small>Intelligent evaluation</small>
            </div>

          </div>

          <div className="dashboard-preview">

            <div className="preview-top">
              <div className="preview-dot"></div>
              <div className="preview-dot"></div>
              <div className="preview-dot"></div>
            </div>

            <div className="preview-content">

              <div className="preview-sidebar">

                <div className="side-logo">S</div>

                <div className="side-item active"></div>
                <div className="side-item"></div>
                <div className="side-item"></div>
                <div className="side-item"></div>

              </div>

              <div className="preview-main">

                <div className="preview-heading">

                  <div>
                    <small>Welcome back</small>
                    <h3>SmartHire Dashboard</h3>
                  </div>

                  <div className="avatar">L</div>

                </div>

                <div className="stats-grid">

                  <div className="stat-box">
                    <span>Interviews</span>
                    <strong>24</strong>
                    <small>↑ 18%</small>
                  </div>

                  <div className="stat-box">
                    <span>Performance</span>
                    <strong>86%</strong>
                    <small>↑ 12%</small>
                  </div>

                  <div className="stat-box">
                    <span>Skills</span>
                    <strong>18</strong>
                    <small>Analyzed</small>
                  </div>

                </div>

                <div className="chart-box">

                  <div className="chart-title">
                    Performance Analytics
                  </div>

                  <div className="fake-chart">

                    <div className="chart-bar bar-1"></div>
                    <div className="chart-bar bar-2"></div>
                    <div className="chart-bar bar-3"></div>
                    <div className="chart-bar bar-4"></div>
                    <div className="chart-bar bar-5"></div>
                    <div className="chart-bar bar-6"></div>
                    <div className="chart-bar bar-7"></div>

                  </div>

                </div>

              </div>

            </div>

          </div>

          <div className="floating-card card-two">

            <div className="score-circle">92</div>

            <div>
              <strong>Performance</strong>
              <small>Excellent score</small>
            </div>

          </div>

        </div>

      </section>

      {/* FEATURES */}

      <section
        className="features-section"
        id="features"
      >

        <div className="section-heading">

          <div className="badge">
            🚀 Powerful Platform
          </div>

          <h2>
            Everything you need for
            <span> smarter hiring</span>
          </h2>

          <p>
            One intelligent platform connecting candidates,
            recruiters, and administrators.
          </p>

        </div>

        <div className="feature-grid">

          <div className="feature-card">

            <div className="feature-icon pink">
              🎓
            </div>

            <h3>For Candidates</h3>

            <p>
              Practice AI mock interviews, upload resumes,
              analyze performance, and track your improvement.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-icon purple">
              💼
            </div>

            <h3>For Recruiters</h3>

            <p>
              Evaluate candidates, compare performance,
              create interview templates, and access reports.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-icon violet">
              👑
            </div>

            <h3>For Administrators</h3>

            <p>
              Manage users, configure AI settings, monitor
              activities, and access platform-wide analytics.
            </p>

          </div>

        </div>

      </section>

      {/* ABOUT */}

      <section
        className="about-section"
        id="about"
      >

        <div className="about-content">

          <div className="badge">
            💡 Why SmartHire AI?
          </div>

          <h2>
            Transforming the way
            <span> talent is discovered.</span>
          </h2>

          <p>
            SmartHire AI brings artificial intelligence into the
            interview and assessment process, creating a more
            structured, insightful, and data-driven experience
            for everyone involved.
          </p>

          <button
            className="primary-btn"
            onClick={goToLogin}
          >
            Start Your Journey →
          </button>

        </div>

      </section>

      {/* FOOTER */}

      <footer>

        <div className="logo">

          <div className="logo-icon">S</div>

          <span>
            SmartHire<span className="logo-ai"> AI</span>
          </span>

        </div>

        <p>
          © 2026 SmartHire AI. Intelligent hiring for a smarter future.
        </p>

      </footer>

    </div>
  );
}

// =========================================================
// APP
// =========================================================

function App() {
  return (
    <Routes>

      {/* =====================================================
          LANDING PAGE
      ===================================================== */}

      <Route
        path="/"
        element={<LandingPage />}
      />

      {/* =====================================================
          LOGIN
      ===================================================== */}

      <Route
        path="/login"
        element={<Login />}
      />

      {/* =====================================================
          ADMIN
      ===================================================== */}

      <Route
        path="/admin"
        element={<AdminDashboard />}
      />

      <Route
        path="/admin/users"
        element={<AdminUsers />}
      />

      <Route
        path="/admin/recruiters"
        element={<AdminRecruiters />}
      />

      <Route
        path="/admin/analytics"
        element={<AdminAnalytics />}
      />

      {/* =====================================================
          RECRUITER
      ===================================================== */}

      <Route
        path="/recruiter"
        element={<RecruiterDashboard />}
      />

      <Route
        path="/recruiter/candidates"
        element={<RecruiterCandidates />}
      />

      <Route
        path="/recruiter/reports"
        element={<RecruiterReports />}
      />

      <Route
        path="/recruiter/compare"
        element={<RecruiterCompare />}
      />

      <Route
        path="/recruiter/templates"
        element={<RecruiterTemplates />}
      />

      <Route
        path="/recruiter/monitoring"
        element={<RecruiterMonitoring />}
      />

      {/* =====================================================
          CANDIDATE
      ===================================================== */}

      <Route
        path="/candidate"
        element={<CandidateDashboard />}
      />

      <Route
        path="/candidate/resume"
        element={<ResumeUpload />}
      />

      <Route
        path="/candidate/interview-generation"
        element={<InterviewGeneration />}
      />

      <Route
        path="/candidate/mock-interview"
        element={<MockInterview />}
      />

      <Route
        path="/candidate/interview-complete"
        element={<InterviewComplete />}
      />

      {/* =====================================================
          FALLBACK
      ===================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}

export default App;