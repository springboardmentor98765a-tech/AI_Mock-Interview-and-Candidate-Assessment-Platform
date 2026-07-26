import { Link } from "react-router-dom";
import "../styles/Landing.css";

function CTA() {
  return (
    <section className="cta">

      <h2>Ready to Ace Your Next Interview?</h2>

      <p>
        Start practicing with AI-powered mock interviews and boost your confidence.
      </p>

      <Link to="/candidate">
        <button>Start Now</button>
      </Link>

    </section>
  );
}

export default CTA;