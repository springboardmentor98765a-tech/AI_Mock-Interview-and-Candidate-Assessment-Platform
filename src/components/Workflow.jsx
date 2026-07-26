import "../styles/Landing.css";

function Workflow() {
  return (
    <section className="workflow">

      <h2>How SmartHire AI Works</h2>

      <div className="workflow-container">

        <div className="step">
          <div className="step-number">1</div>
          <h3>Upload Resume</h3>
          <p>Upload your resume and let AI identify your skills and experience.</p>
        </div>

        <div className="step">
          <div className="step-number">2</div>
          <h3>Select Interview</h3>
          <p>Choose HR, Technical, Behavioral or Aptitude interview.</p>
        </div>

        <div className="step">
          <div className="step-number">3</div>
          <h3>Attend Interview</h3>
          <p>Answer AI-generated questions with webcam and microphone.</p>
        </div>

        <div className="step">
          <div className="step-number">4</div>
          <h3>Get AI Feedback</h3>
          <p>Receive communication, confidence and technical scores.</p>
        </div>

        <div className="step">
          <div className="step-number">5</div>
          <h3>Improve</h3>
          <p>Track your progress through analytics and personalized recommendations.</p>
        </div>

      </div>
    </section>
  );
}

export default Workflow;