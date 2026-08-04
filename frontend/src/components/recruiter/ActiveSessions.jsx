import { useEffect, useState } from 'react';
import { activeSessions } from '../../data/mockData';
import { MonitorPlay, Clock, Wifi } from 'lucide-react';

function ConfidenceRing({ value, size = 52 }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 85 ? 'var(--accent-green)' : value >= 70 ? 'var(--accent-primary)' : 'var(--accent-amber)';
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-medium)" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transformOrigin: `${size/2}px ${size/2}px`, transform: 'rotate(-90deg)', transition: 'stroke-dashoffset 1s ease' }} />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" fill={color} fontSize="11" fontFamily="var(--font-heading)" fontWeight="700">{value}</text>
    </svg>
  );
}

export default function ActiveSessions() {
  const [sessions, setSessions] = useState(activeSessions.map(s => ({ ...s })));
  const [elapsed, setElapsed] = useState({});

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSessions(prev => prev.map(s => ({
        ...s,
        confidence: Math.min(98, Math.max(45, s.confidence + (Math.random() - 0.45) * 3)),
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const statusColor = (status) => {
    switch (status) {
      case 'In Progress': return 'badge-primary';
      case 'Starting': return 'badge-warning';
      case 'Finishing': return 'badge-success';
      default: return 'badge-neutral';
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Active Sessions</h1>
            <p>Monitor candidates currently taking live AI interview sessions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="live-badge">
              <span className="live-dot" />
              LIVE
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{sessions.length} active sessions</span>
          </div>
        </div>
      </div>

      {/* Session Cards Grid */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-8)' }}>
        {sessions.map(s => (
          <div key={s.id} className="session-card">
            {/* Header */}
            <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: `linear-gradient(135deg, hsl(${200 + s.id * 40},80%,45%), hsl(${230 + s.id * 40},80%,55%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: '0.85rem', flexShrink: 0 }}>
                {s.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-2">
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{s.name}</p>
                  <span className={`badge ${statusColor(s.status)}`} style={{ fontSize: '0.65rem' }}>{s.status}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.role}</p>
              </div>
              <ConfidenceRing value={Math.round(s.confidence)} />
            </div>

            {/* Progress */}
            <div className="session-progress-wrap">
              <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-2)' }}>
                <span className="session-question-label">
                  Question {s.question} of {s.totalQuestions}
                </span>
                <div className="flex items-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Clock size={12} />
                  {s.elapsed}
                </div>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div className="progress-fill" style={{ width: `${(s.question / s.totalQuestions) * 100}%` }} />
              </div>
              <div className="flex justify-between" style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {Array.from({ length: s.totalQuestions }, (_, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: i < s.question ? 'var(--accent-primary)' : i === s.question - 1 ? 'var(--accent-green)' : 'var(--border-medium)',
                    transition: 'background 0.3s ease'
                  }} />
                ))}
              </div>
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-4" style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1">
                <Wifi size={12} color="var(--accent-green)" />
                Streaming
              </span>
              <span>Confidence: <strong style={{ color: Math.round(s.confidence) >= 75 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>{Math.round(s.confidence)}%</strong></span>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: '0.72rem', padding: '3px 10px' }}>
                <MonitorPlay size={12} />
                Watch Live
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="card">
        <h3 style={{ marginBottom: 'var(--space-6)' }}>Session Overview</h3>
        <div className="grid-4" style={{ gap: 'var(--space-4)' }}>
          {[
            { label: 'Active Sessions', value: sessions.length, color: 'var(--accent-primary)' },
            { label: 'Avg Confidence', value: Math.round(sessions.reduce((a, b) => a + b.confidence, 0) / sessions.length) + '%', color: 'var(--accent-teal)' },
            { label: 'Completing Soon', value: sessions.filter(s => s.status === 'Finishing').length, color: 'var(--accent-green)' },
            { label: 'Just Started', value: sessions.filter(s => s.status === 'Starting').length, color: 'var(--accent-amber)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: s.color }}>{s.value}</div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
