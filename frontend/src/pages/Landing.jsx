import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * The pyramid is the explanation, not decoration: each tier is one step of the
 * candidate journey, widest at the base (everyone starts there) narrowing to
 * the apex (the outcome). Hovering a step lights up its tier.
 *
 * Built from CSS 3D transforms rather than WebGL — no dependency, and it keeps
 * the single-stylesheet approach intact.
 */
const STEPS = [
  {
    id: 'hired',
    label: 'Get hired',
    detail: 'Recruiters compare scored candidates and shortlist on evidence, not gut feel.',
    w: 66,
    h: 30,
  },
  {
    id: 'score',
    label: 'Get scored',
    detail: 'Communication, technical depth, confidence and professionalism — each weighted.',
    w: 118,
    h: 32,
  },
  {
    id: 'practice',
    label: 'Practise',
    detail: 'An AI interviewer asks role-specific questions at the difficulty you choose.',
    w: 170,
    h: 34,
  },
  {
    id: 'resume',
    label: 'Upload résumé',
    detail: 'Your PDF is parsed so every question matches your real skills and history.',
    w: 222,
    h: 36,
  },
];

const ROLES = [
  {
    title: 'Candidates',
    body: 'Practise unlimited mock interviews, track every score, and export reports.',
  },
  {
    title: 'Recruiters',
    body: 'Review scored candidates, compare them side by side, and build question templates.',
  },
  {
    title: 'Administrators',
    body: 'Manage accounts and roles, tune the AI, and watch platform health in one place.',
  },
];

function Pyramid({ active, onHover }) {
  // stack upward from the base so each tier sits on the one below it
  let offset = 0;
  const placed = [...STEPS].reverse().map((step) => {
    const y = offset;
    offset -= step.h;
    return { ...step, y };
  });

  return (
    <div className="stage" aria-hidden="true">
      <div className="glow" />
      <div className="pyramid">
        {placed.map((step) => (
          <div
            key={step.id}
            className={`tier${active === step.id ? ' on' : ''}`}
            style={{ '--w': `${step.w}px`, '--h': `${step.h}px`, '--y': `${step.y}px` }}
            onMouseEnter={() => onHover(step.id)}
            onMouseLeave={() => onHover(null)}
          >
            <i className="face front" />
            <i className="face back" />
            <i className="face left" />
            <i className="face right" />
            <i className="face top" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const [active, setActive] = useState(null);

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          SmartHire<span>_AI</span>
        </Link>
        <div className="topbar-end push">
          <Link to="/login" className="btn">
            Log in
          </Link>
          <Link to="/register" className="btn btn-primary">
            Register
          </Link>
        </div>
      </header>

      <main className="landing">
        {/* floating shapes, purely atmospheric */}
        <div className="orbs" aria-hidden="true">
          <span className="orb orb-1" />
          <span className="orb orb-2" />
          <span className="orb orb-3" />
        </div>

        <section className="hero">
          <div className="hero-copy">
            <span className="badge badge-info">AI-powered assessment</span>
            <h1>
              SmartHire<span>_AI</span>
            </h1>
            <p className="lede">
              Practise technical interviews with an AI interviewer, get scored on communication,
              confidence and technical depth, and let recruiters find you on evidence.
            </p>

            <div className="actions">
              <Link to="/register" className="btn btn-primary">
                Start practising
              </Link>
              <Link to="/login" className="btn">
                Log in
              </Link>
            </div>

            <p className="mono muted">candidates &middot; recruiters &middot; administrators</p>
          </div>

          <div className="hero-visual">
            <Pyramid active={active} onHover={setActive} />

            <ol className="steps">
              {STEPS.map((step, index) => (
                <li
                  key={step.id}
                  className={active === step.id ? 'on' : undefined}
                  onMouseEnter={() => setActive(step.id)}
                  onMouseLeave={() => setActive(null)}
                >
                  <b>{STEPS.length - index}</b>
                  <div>
                    <strong>{step.label}</strong>
                    <small>{step.detail}</small>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="roles">
          {ROLES.map((role) => (
            <article key={role.title} className="role-card">
              {/* six faces, so it stays solid through a full rotation */}
              <div className="role-cube" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <h2>{role.title}</h2>
              <p>{role.body}</p>
            </article>
          ))}
        </section>

        <footer className="landing-foot">
          <p className="mono muted">
            SmartHire AI &mdash; AI-powered mock interview &amp; candidate assessment platform
          </p>
        </footer>
      </main>
    </>
  );
}
