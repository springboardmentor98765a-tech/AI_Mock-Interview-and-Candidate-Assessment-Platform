import { useState } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip
} from 'recharts';
import { candidates, comparisonRadarData } from '../../data/mockData';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

const METRICS = [
  { key: 'technical', label: 'Technical', color1: 'hsl(252,100%,68%)', color2: 'hsl(174,80%,55%)' },
  { key: 'communication', label: 'Communication', color1: 'hsl(252,100%,68%)', color2: 'hsl(174,80%,55%)' },
  { key: 'confidence', label: 'Confidence', color1: 'hsl(252,100%,68%)', color2: 'hsl(174,80%,55%)' },
];

function DeltaBadge({ a, b }) {
  const d = a - b;
  if (Math.abs(d) < 2) return <span className="badge badge-neutral"><Minus size={10} /> Tie</span>;
  return d > 0
    ? <span className="badge badge-success"><ArrowUp size={10} /> +{d}</span>
    : <span className="badge badge-danger"><ArrowDown size={10} /> {d}</span>;
}

export default function ComparisonDashboard() {
  const [c1Id, setC1Id] = useState(1);
  const [c2Id, setC2Id] = useState(2);
  const c1 = candidates.find(c => c.id === c1Id);
  const c2 = candidates.find(c => c.id === c2Id);

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <h1>Comparison Dashboard</h1>
        <p>Side-by-side candidate performance analysis to make data-driven hiring decisions</p>
      </div>

      {/* Selectors */}
      <div className="comparison-grid" style={{ marginBottom: 'var(--space-8)' }}>
        {/* Candidate 1 */}
        <div>
          <label className="form-label" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>Candidate A</label>
          <select className="form-control" value={c1Id} onChange={e => setC1Id(Number(e.target.value))} id="compare-candidate-1">
            {candidates.filter(c => c.id !== c2Id).map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.role}</option>
            ))}
          </select>
        </div>

        <div className="vs-divider">
          <div className="vs-badge">VS</div>
        </div>

        {/* Candidate 2 */}
        <div>
          <label className="form-label" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>Candidate B</label>
          <select className="form-control" value={c2Id} onChange={e => setC2Id(Number(e.target.value))} id="compare-candidate-2">
            {candidates.filter(c => c.id !== c1Id).map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Profile Cards */}
      <div className="comparison-grid" style={{ marginBottom: 'var(--space-8)' }}>
        {/* C1 Card */}
        <div className="card" style={{ borderColor: 'hsla(252,100%,68%,0.3)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, hsl(252,80%,50%), hsl(280,80%,60%))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: '1.3rem', margin: '0 auto var(--space-4)' }}>
            {c1.initials}
          </div>
          <h3 style={{ marginBottom: 4 }}>{c1.name}</h3>
          <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-4)' }}>{c1.role}</p>
          <div style={{ fontSize: '3rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: 4 }}>
            {c1.score}
          </div>
          <p className="text-xs text-muted">Overall Score</p>
          <span className={`badge badge-success`} style={{ marginTop: 'var(--space-3)' }}>{c1.status}</span>
        </div>

        {/* Middle: Key metrics comparison */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', justifyContent: 'center', padding: '0 var(--space-4)' }}>
          {[
            { label: 'Technical', v1: c1.technical, v2: c2.technical },
            { label: 'Confidence', v1: c1.confidence, v2: c2.confidence },
            { label: 'Communication', v1: c1.communication, v2: c2.communication },
            { label: 'Overall', v1: c1.score, v2: c2.score },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{m.label}</p>
              <DeltaBadge a={m.v1} b={m.v2} />
            </div>
          ))}
        </div>

        {/* C2 Card */}
        <div className="card" style={{ borderColor: 'hsla(174,80%,55%,0.3)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, hsl(174,80%,40%), hsl(200,80%,50%))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: '1.3rem', margin: '0 auto var(--space-4)' }}>
            {c2.initials}
          </div>
          <h3 style={{ marginBottom: 4 }}>{c2.name}</h3>
          <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-4)' }}>{c2.role}</p>
          <div style={{ fontSize: '3rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'hsl(174,80%,55%)', marginBottom: 4 }}>
            {c2.score}
          </div>
          <p className="text-xs text-muted">Overall Score</p>
          <span className={`badge badge-${c2.status === 'shortlisted' ? 'success' : 'warning'}`} style={{ marginTop: 'var(--space-3)' }}>{c2.status}</span>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 className="section-title">Multi-Dimensional Comparison</h3>
        <ResponsiveContainer width="100%" height={360}>
          <RadarChart data={comparisonRadarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
            <PolarGrid stroke="var(--border-subtle)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-body)' }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name={c1.name} dataKey="candidate1" stroke="hsl(252,100%,68%)" fill="hsl(252,100%,68%)" fillOpacity={0.15} strokeWidth={2} dot={{ r: 4 }} />
            <Radar name={c2.name} dataKey="candidate2" stroke="hsl(174,80%,55%)" fill="hsl(174,80%,55%)" fillOpacity={0.12} strokeWidth={2} dot={{ r: 4 }} />
            <Legend wrapperStyle={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 8 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Metric Bars */}
      <div className="grid-2">
        {[
          { label: c1.name, metrics: [{ l: 'Technical', v: c1.technical }, { l: 'Confidence', v: c1.confidence }, { l: 'Communication', v: c1.communication }], color: 'hsl(252,100%,68%)' },
          { label: c2.name, metrics: [{ l: 'Technical', v: c2.technical }, { l: 'Confidence', v: c2.confidence }, { l: 'Communication', v: c2.communication }], color: 'hsl(174,80%,55%)' },
        ].map(card => (
          <div key={card.label} className="card">
            <h4 style={{ marginBottom: 'var(--space-5)' }}>{card.label}</h4>
            {card.metrics.map(m => (
              <div key={m.l} style={{ marginBottom: 'var(--space-4)' }}>
                <div className="flex justify-between" style={{ marginBottom: 6, fontSize: '0.82rem' }}>
                  <span className="text-secondary">{m.l}</span>
                  <span style={{ fontWeight: 700, color: card.color }}>{m.v}</span>
                </div>
                <div className="progress-bar" style={{ height: 8 }}>
                  <div style={{ height: '100%', width: `${m.v}%`, background: card.color, borderRadius: 99, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
