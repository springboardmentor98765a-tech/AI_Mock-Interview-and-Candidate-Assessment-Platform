import React from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import PageHead from '../../components/PageHead';
import { useAuth } from '../../context/AuthContext';
import { downloadTextFile, buildSummaryReport } from '../../lib/report';

const STATS = [
  ['6', 'Interviews'],
  ['78%', 'Avg score'],
  ['1', 'Awaiting result'],
  ['82%', 'Best score'],
];

// current score, and change vs the previous session
const PROGRESS = [
  ['Communication', 82, 6],
  ['Technical', 80, 8],
  ['Confidence', 74, -3],
  ['Professionalism', 77, 2],
];

const RECENT = [
  { type: 'Technical', date: '24 Oct 2026', status: 'Completed', tone: 'badge-ok', score: '82%' },
  { type: 'Aptitude', date: '22 Oct 2026', status: 'Completed', tone: 'badge-ok', score: '75%' },
  { type: 'HR round', date: '21 Oct 2026', status: 'Processing', tone: 'badge-info', score: '--' },
];

export default function CandidateDashboard() {
  const { user } = useAuth();
  const candidate = user?.name ?? 'Candidate';

  const handleDownload = () => {
    downloadTextFile(
      'smarthire-performance-summary.txt',
      buildSummaryReport({
        candidate,
        stats: STATS,
        skills: PROGRESS.map(([label, value]) => [label, value]),
      })
    );
  };

  return (
    <AppLayout>
      <PageHead
        title={`Welcome back, ${candidate.split(' ')[0]}`}
        subtitle="One session is still being scored. Everything else is up to date."
        action={
          <Link to="/interview/setup" className="btn btn-primary">
            Start mock interview
          </Link>
        }
      />

      <div className="grid cols-4">
        {STATS.map(([value, label]) => (
          <div key={label} className="stat">
            <b>{value}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="grid cols-3">
        <Link to="/resume" className="tile">
          <strong>Upload resume</strong>
          <span>Add a PDF so questions match your real skills and experience.</span>
        </Link>

        <Link to="/interview/setup" className="tile">
          <strong>Attend mock interview</strong>
          <span>Technical, HR, aptitude or behavioural, at your chosen difficulty.</span>
        </Link>

        <Link to="/interview/history" className="tile">
          <strong>Interview history</strong>
          <span>Every past session with its score, transcript and result.</span>
        </Link>

        <Link to="/analytics" className="tile">
          <strong>Performance analytics</strong>
          <span>Score trends and a skill-by-skill breakdown over time.</span>
        </Link>

        <button type="button" className="tile" onClick={handleDownload}>
          <strong>Download reports</strong>
          <span>Export your performance summary as a shareable file.</span>
        </button>

        <Link to="/analytics" className="tile">
          <strong>View progress</strong>
          <span>Track how each skill has moved since your last session.</span>
        </Link>
      </div>

      <section className="card">
        <h2>Recent sessions</h2>
        <div className="scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Date</th>
                <th>Status</th>
                <th className="end">Score</th>
              </tr>
            </thead>
            <tbody>
              {RECENT.map((session) => (
                <tr key={session.type}>
                  <td>{session.type}</td>
                  <td className="num">{session.date}</td>
                  <td>
                    <span className={`badge ${session.tone}`}>{session.status}</span>
                  </td>
                  <td className="num end">{session.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link to="/interview/history" className="btn btn-block">
          View full history
        </Link>
      </section>
    </AppLayout>
  );
}
