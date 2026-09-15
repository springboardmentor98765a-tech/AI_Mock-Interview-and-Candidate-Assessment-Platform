import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState("candidate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (role === "admin") {
      navigate("/admin");
    } else if (role === "recruiter") {
      navigate("/recruiter");
    } else {
      navigate("/candidate");
    }
  };

  return (
    <div className="login-page">

      {/* LEFT SIDE */}

      <div className="login-left">

        <div className="login-brand">
          <div className="login-logo">S</div>

          <span>
            SmartHire<span> AI</span>
          </span>
        </div>

        <div className="login-left-content">

          <div className="login-badge">
            ✨ Intelligent Hiring Platform
          </div>

          <h1>
            Welcome to
            <br />
            <span>SmartHire AI</span>
          </h1>

          <p>
            Your intelligent platform for smarter interviews,
            better assessments, and data-driven hiring decisions.
          </p>

          <div className="login-highlights">

            <div>
              <span>✓</span>
              AI-powered assessments
            </div>

            <div>
              <span>✓</span>
              Personalized interview experience
            </div>

            <div>
              <span>✓</span>
              Intelligent performance analytics
            </div>

          </div>

        </div>

      </div>

      {/* RIGHT SIDE */}

      <div className="login-right">

        <div className="login-card">

          <div className="mobile-logo">
            <div className="login-logo">S</div>

            <span>
              SmartHire<span> AI</span>
            </span>
          </div>

          <h2>Sign in</h2>

          <p className="login-subtitle">
            Choose your role and continue to your dashboard.
          </p>

          {/* ROLE SELECTOR */}

          <div className="role-selector">

            <button
              type="button"
              className={role === "candidate" ? "selected" : ""}
              onClick={() => setRole("candidate")}
            >
              <span>🎓</span>
              Candidate
            </button>

            <button
              type="button"
              className={role === "recruiter" ? "selected" : ""}
              onClick={() => setRole("recruiter")}
            >
              <span>💼</span>
              Recruiter
            </button>

            <button
              type="button"
              className={role === "admin" ? "selected" : ""}
              onClick={() => setRole("admin")}
            >
              <span>👑</span>
              Admin
            </button>

          </div>

          <form onSubmit={handleLogin}>

            <label>Email Address</label>

            <div className="input-wrapper">

              <span>✉</span>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

            </div>

            <label>Password</label>

            <div className="input-wrapper">

              <span>🔒</span>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

            </div>

            <div className="login-options">

              <label className="remember">

                <input type="checkbox" />

                <span>Remember me</span>

              </label>

              <button
                type="button"
                className="forgot"
              >
                Forgot password?
              </button>

            </div>

            <button
              type="submit"
              className="signin-btn"
            >
              Sign In
              <span>→</span>
            </button>

          </form>

          <div className="demo-info">

            <strong>Demo Login</strong>

            <p>
              Select any role and enter any valid email/password
              to preview that dashboard.
            </p>

          </div>

          <button
            className="back-home"
            onClick={() => navigate("/")}
          >
            ← Back to Home
          </button>

        </div>

      </div>

    </div>
  );
}

export default Login;