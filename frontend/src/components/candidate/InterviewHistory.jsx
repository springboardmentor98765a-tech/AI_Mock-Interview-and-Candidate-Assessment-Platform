import { useState } from 'react';
import { Clock, Download, ChevronDown, ChevronUp, Tag, Star } from 'lucide-react';
import { interviewHistory } from '../../data/mockData';

function ScoreRing({ score, size = 60 }) {
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 85 ? 'var(--accent-green)' : score >= 70 ? 'var(--accent-primary)' : 'var(--accent-amber)';
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-medium)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transformOrigin: `${size / 2}px ${size / 2}px`, transform: 'rotate(-90deg)', transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fill={color} fontSize="13" fontFamily="var(--font-heading)" fontWeight="700">{score}</text>
    </svg>
  );
}

export default function InterviewHistory() {
  const [expanded, setExpanded] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const handleDownload = (id) => {
    setDownloading(id);
    setTimeout(() => setDownloading(null), 2000);
  };

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <h1>Interview History</h1>
        <p>Complete record of all your mock interview sessions with detailed AI feedback</p>
      </div>

      {/* Stats Summary */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-8)' }}>
        {[
          { label: 'Total Sessions', value: interviewHistory.length, icon: '🎙️', sub: 'Since March 2026' },
          { label: 'Average Score', value: `${Math.round(interviewHistory.reduce((a, b) => a + b.score, 0) / interviewHistory.length)}`, icon: '⭐', sub: 'Across all sessions' },
          { label: 'Best Score', value: `${Math.max(...interviewHistory.map(i => i.score))}`, icon: '🏆', sub: 'Personal best' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="timeline">
        {interviewHistory.map((item, i) => (
          <div key={item.id} className="timeline-item animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s`, opacity: 0 }}>
            <div className="timeline-dot">
              <Star size={14} color="var(--accent-primary)" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="card" style={{ marginBottom: 0 }}>
                {/* Header */}
                <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
                  <ScoreRing score={item.score} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <h4 style={{ marginBottom: 4 }}>{item.title}</h4>
                    <div className="flex items-center gap-3 flex-wrap" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1"><Clock size={12} /> {item.date}</span>
                      <span>⏱ {item.duration}</span>
                      <span>❓ {item.questions} questions</span>
                    </div>
                    <div className="flex gap-2 flex-wrap mt-2">
                      {item.tags.map(tag => (
                        <span key={tag} className="skill-tag" style={{ fontSize: '0.72rem', padding: '2px 9px' }}>
                          <Tag size={10} /> {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${item.score >= 85 ? 'badge-success' : item.score >= 70 ? 'badge-primary' : 'badge-warning'}`}>
                      {item.score >= 85 ? 'Excellent' : item.score >= 70 ? 'Good' : 'Fair'}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDownload(item.id)}
                      id={`download-btn-${item.id}`}
                      style={{ minWidth: 120 }}
                    >
                      {downloading === item.id ? (
                        <><div style={{ width: 12, height: 12, border: '2px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Generating...</>
                      ) : (
                        <><Download size={13} /> PDF Report</>
                      )}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    >
                      {expanded === item.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Feedback */}
                {expanded === item.id && (
                  <div className="animate-fade-in" style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--border-subtle)' }}>
                    <h5 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
                      AI Feedback
                    </h5>
                    <div style={{
                      background: 'hsla(252,100%,68%,0.04)',
                      border: '1px solid var(--border-accent)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-4)',
                    }}>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        💬 {item.feedback}
                      </p>
                    </div>
                    <div className="grid-3 mt-4" style={{ gap: 'var(--space-3)' }}>
                      {[
                        { label: 'Technical', score: item.score + 1 },
                        { label: 'Communication', score: item.score - 8 },
                        { label: 'Confidence', score: item.score + 5 > 100 ? 99 : item.score + 5 },
                      ].map(m => (
                        <div key={m.label}>
                          <div className="flex justify-between" style={{ fontSize: '0.75rem', marginBottom: 5 }}>
                            <span className="text-muted">{m.label}</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.score}</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${m.score}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
