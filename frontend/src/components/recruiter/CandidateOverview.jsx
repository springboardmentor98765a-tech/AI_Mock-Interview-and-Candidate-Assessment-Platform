import { Users, BarChart2, Briefcase, Video, ArrowUp, ArrowDown } from 'lucide-react';
import { recruiterStats, candidates } from '../../data/mockData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const iconMap = { users: Users, 'bar-chart': BarChart2, briefcase: Briefcase, video: Video };
const iconColors = ['var(--accent-primary)', 'var(--accent-teal)', 'var(--accent-amber)', 'var(--accent-secondary)'];
const iconBgs = [
  'hsla(252,100%,68%,0.12)', 'hsla(174,80%,55%,0.12)', 'hsla(38,95%,60%,0.12)', 'hsla(280,90%,65%,0.12)'
];

const skillData = [
  { name: 'React', count: 48 }, { name: 'Python', count: 41 }, { name: 'Node.js', count: 37 },
  { name: 'TypeScript', count: 33 }, { name: 'AWS', count: 29 }, { name: 'Docker', count: 25 },
];
const FILL_COLORS = ['hsl(252,100%,68%)', 'hsl(280,90%,65%)', 'hsl(174,80%,55%)', 'hsl(38,95%,60%)', 'hsl(142,70%,55%)', 'hsl(350,90%,65%)'];

export default function CandidateOverview() {
  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <h1>Candidate Overview</h1>
        <p>Real-time analytics across all applicants and open positions</p>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        {recruiterStats.map((stat, i) => {
          const Icon = iconMap[stat.icon];
          return (
            <div key={stat.label} className={`stat-card animate-fade-in-up delay-${i + 1}`}>
              <div className="flex items-center justify-between">
                <div className="stat-icon" style={{ background: iconBgs[i] }}>
                  <Icon size={20} color={iconColors[i]} />
                </div>
                <span className={`stat-change ${stat.up ? 'up' : 'down'}`}>
                  {stat.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {stat.change}
                </span>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts & Tables */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-8)' }}>
        {/* Top Skills Chart */}
        <div className="card">
          <h3 className="section-title">Top Skills in Pool</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={skillData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip cursor={{ fill: 'hsla(252,100%,68%,0.05)' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Candidates">
                {skillData.map((_, i) => <Cell key={i} fill={FILL_COLORS[i % FILL_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Score Distribution */}
        <div className="card">
          <h3 className="section-title">Score Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {[
              { range: '90–100', count: 12, color: 'green', pct: 9.6 },
              { range: '80–89',  count: 48, color: '',      pct: 38.4 },
              { range: '70–79',  count: 41, color: 'teal',  pct: 32.8 },
              { range: '60–69',  count: 18, color: 'amber', pct: 14.4 },
              { range: '<60',    count: 6,  color: 'rose',  pct: 4.8 },
            ].map(r => (
              <div key={r.range}>
                <div className="flex justify-between" style={{ fontSize: '0.78rem', marginBottom: 5 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Score {r.range}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.count} candidates <span className="text-muted">({r.pct}%)</span></span>
                </div>
                <div className="progress-bar">
                  <div className={`progress-fill ${r.color}`} style={{ width: `${r.pct * 2}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Candidates Quick View */}
      <div className="card">
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-6)' }}>
          <h3>Top Candidates</h3>
          <span className="badge badge-primary">{candidates.filter(c => c.status === 'shortlisted').length} Shortlisted</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {candidates.filter(c => c.score >= 80).slice(0, 4).map((c, i) => (
            <div key={c.id} className="flex items-center gap-4" style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              transition: 'background 0.2s',
              cursor: 'pointer'
            }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', width: 20 }}>#{i + 1}</span>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, hsl(${220 + i * 30},80%,50%), hsl(${250 + i * 30},80%,60%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: '0.8rem', flexShrink: 0 }}>
                {c.initials}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 2 }}>{c.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.role}</p>
              </div>
              <div className="flex items-center gap-3">
                {c.skills.map(s => <span key={s} className="skill-tag" style={{ fontSize: '0.72rem', padding: '2px 9px' }}>{s}</span>)}
                <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--accent-primary)', minWidth: 40, textAlign: 'right' }}>{c.score}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
