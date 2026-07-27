import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          SmartHire<span>_AI</span>
        </Link>
      </header>

      <main className="center page-fill">

        <h1>
          SmartHire<span>_AI</span>
        </h1>

        <p className="muted">
          AI-Powered Mock Interview and Candidate Assessment Platform
        </p>

        <div className="actions">
          <Link to="/register" className="btn btn-primary">
            Register
          </Link>
          <Link to="/login" className="btn">
            Log in
          </Link>
        </div>

        <p className="mono muted">candidates &middot; recruiters &middot; administrators</p>
      </main>
    </>
  );
}
