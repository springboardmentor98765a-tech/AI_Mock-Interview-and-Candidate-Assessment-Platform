import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import FeatureCard from "../components/FeatureCard";
import Workflow from "../components/Workflow";
import CTA from "../components/CTA";
import Footer from "../components/Footer";

function Landing() {
  return (
    <>
      <Navbar />

      <Hero />

      <section className="features">

        <h2>Why Choose SmartHire AI?</h2>

        <div className="feature-grid">

          <FeatureCard
            icon="📄"
            title="Resume Analysis"
            description="Upload resumes and automatically extract skills, technologies, education, and experience."
          />

          <FeatureCard
            icon="🎤"
            title="AI Mock Interview"
            description="Practice HR, Technical, Behavioral, and Aptitude interviews powered by AI."
          />

          <FeatureCard
            icon="😊"
            title="Speech Analysis"
            description="Evaluate communication, grammar, confidence, pace, and filler words."
          />

          <FeatureCard
            icon="📊"
            title="Performance Analytics"
            description="Track scores, strengths, weaknesses, and interview progress with dashboards."
          />

        </div>

      </section>

      <Workflow />

       <CTA />

       <Footer />

    </>
  );
}

export default Landing;