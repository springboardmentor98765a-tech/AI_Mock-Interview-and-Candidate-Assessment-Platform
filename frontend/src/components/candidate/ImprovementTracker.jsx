import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { improvementData } from '../../data/mockData';
import { TrendingUp, ArrowUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '0.8rem' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontWeight: 600, marginBottom: 2 }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ImprovementTracker() {
  const first = improvementData[0];
  const last = improvementData[improvementData.length - 1];
  const gains = [
    { label: 'Overall', gain: last.overall - first.overall, color: 'hsl(252,100%,68%)' },
    { label: 'Technical', gain: last.technical - first.technical, color: 'hsl(174,80%,55%)' },
    { label: 'Communication', gain: last.communication - first.communication, color: 'hsl(280,90%,65%)' },
    { label: 'Body Language', gain: last.bodyLanguage - first.bodyLanguage, color: 'hsl(38,95%,60%)' },
  ];

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <h1>Improvement Tracker</h1>
        <p>Track your performance growth over time across all interview dimensions</p>
      </div>

      {/* Gain Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        {gains.map((g, i) => (
          <div key={g.label} className={`stat-card animate-fade-in-up delay-${i + 1}`}>
            <div className="flex items-center gap-3">
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `${g.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={18} color={g.color} />
              </div>
              <span className="stat-label">{g.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="stat-value" style={{ color: g.color }}>+{g.gain}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>pts</span>
            </div>
            <div className="stat-change up">
              <ArrowUp size={12} />
              <span>+{Math.round(g.gain / first.overall * 100)}% from Session 1</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Line Chart */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-6)' }}>
          <div>
            <h3>Performance Trend</h3>
            <p className="text-xs text-muted mt-2">Score progression over 6 interview sessions</p>
          </div>
          <div className="flex items-center gap-4">
            {[
              { key: 'overall', label: 'Overall', color: 'hsl(252,100%,68%)' },
              { key: 'technical', label: 'Technical', color: 'hsl(174,80%,55%)' },
              { key: 'communication', label: 'Communication', color: 'hsl(280,90%,65%)' },
              { key: 'bodyLanguage', label: 'Body Lang', color: 'hsl(38,95%,60%)' },
            ].map(l => (
              <div key={l.key} className="flex items-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: 16, height: 3, borderRadius: 99, background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={improvementData} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="session" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[40, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={80} stroke="var(--border-medium)" strokeDasharray="4 4" label={{ value: 'Target', fill: 'var(--text-muted)', fontSize: 11 }} />
            <Line type="monotone" dataKey="overall" stroke="hsl(252,100%,68%)" strokeWidth={3} dot={{ r: 5, fill: 'hsl(252,100%,68%)' }} activeDot={{ r: 7 }} name="Overall" />
            <Line type="monotone" dataKey="technical" stroke="hsl(174,80%,55%)" strokeWidth={2} dot={{ r: 4, fill: 'hsl(174,80%,55%)' }} name="Technical" />
            <Line type="monotone" dataKey="communication" stroke="hsl(280,90%,65%)" strokeWidth={2} dot={{ r: 4, fill: 'hsl(280,90%,65%)' }} name="Communication" />
            <Line type="monotone" dataKey="bodyLanguage" stroke="hsl(38,95%,60%)" strokeWidth={2} dot={{ r: 4, fill: 'hsl(38,95%,60%)' }} name="Body Language" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Session Notes */}
      <div className="card">
        <h3 style={{ marginBottom: 'var(--space-6)' }}>Session Milestones</h3>
        <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
          {[
            { session: 'Session 1', score: 54, note: '🟡 Baseline established. High anxiety detected. Filler word rate: 18%' },
            { session: 'Session 2', score: 61, note: '📈 Improved answer structure. Reduced filler words to 11%' },
            { session: 'Session 3', score: 69, note: '✅ Technical knowledge demonstrably stronger. Cleaner speech patterns' },
            { session: 'Session 4', score: 74, note: '🚀 Crossed 70 threshold. System design confidence improved significantly' },
            { session: 'Session 5', score: 80, note: '⭐ Target reached! Body language score improved with better eye contact' },
            { session: 'Session 6', score: 87, note: '🏆 Personal best! Excellent holistic performance across all metrics' },
          ].map((s, i) => (
            <div key={s.session} style={{
              display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start',
              padding: 'var(--space-4)',
              background: i === 5 ? 'hsla(252,100%,68%,0.05)' : 'transparent',
              border: `1px solid ${i === 5 ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-md)',
              transition: 'all 0.2s ease'
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-md)', flexShrink: 0,
                background: `hsl(${130 + i * 20}, 70%, ${40 + i * 5}%)`, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', lineHeight: 1 }}>{s.score}</span>
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.7)' }}>pts</span>
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: 4 }}>{s.session}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
