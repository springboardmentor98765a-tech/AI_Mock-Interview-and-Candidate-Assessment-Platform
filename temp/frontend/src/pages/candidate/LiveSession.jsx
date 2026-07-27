import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const TOTAL = 10;
const METRICS = [['Eye contact', '87%'], ['Confidence', 'High'], ['Pace', '148 wpm']];

const formatTime = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

export default function LiveSession() {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(262);
  const [question, setQuestion] = useState(3);

  useEffect(() => {
    const id = setInterval(() => setSeconds((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">SmartHire<span>_AI</span></Link>
        <span className="badge badge-bad">Recording</span>

        <div className="topbar-end push">
          <span className="mono muted">Q{question} of {TOTAL}</span>
          <span className="badge badge-warn">{formatTime(seconds)}</span>
          <button className="btn btn-danger" onClick={() => navigate('/interview/results')}>End session</button>
        </div>
      </header>

      <main className="container">
        <div className="grid cols-2">
          <section className="card">
            <h2>Camera</h2>
            <div className="drop">
              <p>Webcam active &middot; 720p</p>
              <span className="badge badge-bad">REC</span>
            </div>
            {METRICS.map(([label, val]) => (
              <div key={label} className="row">
                <div><strong>{val}</strong><small>{label}</small></div>
              </div>
            ))}
          </section>

          <section className="card">
            <h2>Question {question} of {TOTAL}</h2>
            <p className="quote">What does CPU stand for, and what is its main job?</p>
            <p className="label gap-top"> Your response</p>
            <p className="note">CPU stands for Central Processing Unit.</p>

            <div className="actions gap-top">
              <button className="btn" onClick={() => setQuestion((q) => Math.min(q + 1, TOTAL))}>Skip question</button>
              <button className="btn btn-primary" onClick={() => navigate('/interview/results')}>Submit answer</button>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
