import React from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import PageHead from '../../components/PageHead';
import { downloadTextFile, buildSessionReport } from '../../lib/report';

const STATS = [['24', 'Candidates'], ['18', 'Assessed'], ['69%', 'Avg score'], ['2', 'Live now']];
const CANDIDATES = [
  { id: 'c1', name: 'DIV KUMAR', initials: 'DK', sessions: 6, score: 79, rank: '#1', tone: 'badge-ok' },
  { id: 'c2', name: 'Priya P.', initials: 'PP', sessions: 4, score: 74, rank: '#2', tone: 'badge-info' },
  { id: 'c3', name: 'Rahul V.', initials: 'RV', sessions: 5, score: 63, rank: '#3', tone: 'badge-warn' },
  { id: 'c4', name: 'Sneha L.', initials: 'SL', sessions: 3, score: 58, rank: '#4', tone: 'badge-muted' },
];
const BREAKDOWN = [['Communication', 82, '30%'], ['Confidence', 74, '25%'], ['Technical relevance', 80, '30%'], ['Professionalism', 77, '15%']];

export default function RecruiterDashboard() {
  const downloadReport = (candidate) => {
    downloadTextFile(
      `smarthire-report-${candidate.name.replace(/\W+/g, '-').toLowerCase()}.txt`,
      buildSessionReport({
        candidate: candidate.name,
        session: { type: 'Latest assessment', date: '24 Oct 2026', duration: '18m', score: `${candidate.score}%` },
        breakdown: BREAKDOWN,
      })
    );
  };

  return (
    <AppLayout>
      <PageHead title="Recruiter dashboard" subtitle="Review assessed candidates, compare them and manage your interview templates." />

      <div className="grid cols-4">
        {STATS.map(([val, label]) => (
          <div key={label} className="stat"><b>{val}</b><span>{label}</span></div>
        ))}
      </div>

      <div className="grid cols-3">
        <Link to="/recruiter/analytics" className="tile">
          <strong>Candidate analytics</strong>
          <span>Aggregate scores, skill gaps and score distribution across your pool.</span>
        </Link>
        <Link to="/recruiter/reports" className="tile">
          <strong>Candidate reports</strong>
          <span>Open or export the full scored report for any candidate.</span>
        </Link>
        <Link to="/recruiter/compare" className="tile">
          <strong>Compare candidates</strong>
          <span>Put candidates side by side across every scored category.</span>
        </Link>
        <Link to="/recruiter/templates" className="tile">
          <strong>Interview templates</strong>
          <span>Create reusable question sets by role, difficulty and duration.</span>
        </Link>
        <Link to="/recruiter/sessions" className="tile">
          <strong>Monitor sessions</strong>
          <span>See which interviews are live, queued or awaiting scoring.</span>
        </Link>
      </div>

      <section className="card">
        <h2>Candidate rankings</h2>
        <div className="scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Sessions</th>
                <th>Avg score</th>
                <th>Rank</th>
                <th className="end">Report</th>
              </tr>
            </thead>
            <tbody>
              {CANDIDATES.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="cell">
                      <span className="avatar">{c.initials}</span>
                      {c.name}
                    </div>
                  </td>
                  <td className="num">{c.sessions}</td>
                  <td className="num">{c.score}%</td>
                  <td><span className={`badge ${c.tone}`}>{c.rank}</span></td>
                  <td className="end">
                    <button className="btn" onClick={() => downloadReport(c)}>Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppLayout>
  );
}
