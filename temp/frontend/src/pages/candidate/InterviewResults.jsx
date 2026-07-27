import React from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import PageHead from '../../components/PageHead';
import { useAuth } from '../../context/AuthContext';
import { downloadTextFile, buildSessionReport } from '../../lib/report';

const STATS = [['79%', 'Overall score'], ['10', 'Questions'], ['18m', 'Duration'], ['Good', 'Rating']];
const BREAKDOWN = [['Communication', 82, '30%'], ['Confidence', 74, '25%'], ['Technical relevance', 80, '30%'], ['Professionalism', 77, '15%']];


export default function InterviewResults() {
  const { user } = useAuth();

  const handleDownload = () => {
    downloadTextFile('smarthire-session-report.txt', buildSessionReport({
      candidate: user?.name ?? 'Candidate',
      session: { type: 'Technical', date: '24 Oct 2026', duration: '18m', score: '79%' },
      breakdown: BREAKDOWN,
      notes: ANALYSIS.map(([t, d]) => `${t}: ${d}`),
    }));
  };

  return (
    <AppLayout>
      <PageHead
        title="Session results"
        subtitle="Scored across four weighted categories by the AI evaluator."
        action={
          <div className="actions">
            <button className="btn" onClick={handleDownload}>Download report</button>
            <Link to="/interview/setup" className="btn btn-primary">Retake session</Link>
          </div>
        }
      />

      <div className="grid cols-4">
        {STATS.map(([val, label]) => (
          <div key={label} className="stat"><b>{val}</b><span>{label}</span></div>
        ))}
      </div>

      <div className="grid cols-2">
        <section className="card">
          <h2>Score breakdown</h2>
          {BREAKDOWN.map(([label, val, weight]) => (
            <div key={label} className="meter">
              <div><em>{label} <span className="mono">({weight})</span></em><b>{val}%</b></div>
              <div className="bar"><i style={{ width: `${val}%` }} /></div>
            </div>
          ))}
        </section>

        <section className="card">
          <h2>AI analysis</h2>
        </section>
      </div>
    </AppLayout>
  );
}
