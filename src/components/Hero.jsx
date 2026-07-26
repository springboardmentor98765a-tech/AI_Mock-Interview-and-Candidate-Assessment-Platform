import { Link } from "react-router-dom";
import "../styles/Landing.css";

function Hero() {
  return (
    <section className="hero">

      <div className="hero-content">

        <h1>SmartHire AI</h1>

        <h2>AI-Powered Mock Interview & Candidate Assessment Platform</h2>

        <p>
          Practice technical, HR, behavioral, and aptitude interviews with
          AI-generated questions, receive instant feedback, and improve your
          interview skills through smart analytics.
        </p>

        <div className="hero-buttons">
          <Link to="/login">
            <button>Get Started</button>
          </Link>
        </div>

      </div>

    </section>
  );
}

export default Hero;