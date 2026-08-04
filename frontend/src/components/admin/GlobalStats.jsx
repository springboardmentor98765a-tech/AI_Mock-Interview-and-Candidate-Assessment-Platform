import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell
} from 'recharts';
import { platformTrend, adminStats } from '../../data/mockData';
import { Users, Video, DollarSign, Clock, ArrowUp, ArrowDown, Globe, TrendingUp } from 'lucide-react';

const iconMap = ['users', 'video', 'dollar', 'clock'];
const iconComp = [Users, Video, DollarSign, Clock];
const iconColors = ['var(--accent-primary)', 'var(--accent-teal)', 'var(--accent-amber)', 'var(--accent-secondary)'];
const iconBgs = [
  'hsla(252,100%,68%,0.12)', 'hsla(174,80%,55%,0.12)', 'hsla(38,95%,60%,0.12)', 'hsla(280,90%,65%,0.12)'
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color || p.stroke, fontWeight: 600 }}>{p.name}: {typeof p.value === 'number' && p.value > 1000 ? p.value.toLocaleString() : p.value}</p>)}
      </div>
    );
  }
  return null;
};

const retentionData = [
  { week: 'W1', rate: 92 }, { week: 'W2', rate: 89 }, { week: 'W3', rate: 91 },
  { week: 'W4', rate: 87 }, { week: 'W5', rate: 90 }, { week: 'W6', rate: 93 },
  { week: 'W7', rate: 88 }, { week: 'W8', rate: 94 },
];

const topRoles = [
  { name: 'Frontend Dev', count: 412, fill: 'hsl(252,100%,68%)' },
  { name: 'Backend Dev', count: 318, fill: 'hsl(280,90%,65%)' },
  { name: 'ML Engineer', count: 247, fill: 'hsl(174,80%,55%)' },
  { name: 'DevOps', count: 189, fill: 'hsl(38,95%,60%)' },
  { name: 'Full Stack', count: 164, fill: 'hsl(142,70%,55%)' },
];

export default function GlobalStats() {
  const lastMonth = platformTrend[platformTrend.length - 1];

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1>Global Statistics</h1>
            <p>Platform-wide usage analytics, AI cost tracking, and user retention metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <Globe size={16} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Last updated: just now</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        {adminStats.map((s, i) => {
          const Icon = iconComp[i];
          const isUp = s.up;
          return (
            <div key={s.label} className={`stat-card animate-fade-in-up delay-${i + 1}`}>
              <div className="flex items-center justify-between">
                <div className="stat-icon" style={{ background: iconBgs[i] }}>
                  <Icon size={20} color={iconColors[i]} />
                </div>
                <span className={`stat-change ${isUp ? 'up' : 'down'}`}>
                  {isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {s.change}
                </span>
              </div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Main Trend Chart */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-6)' }}>
          <div>
            <h3>Platform Growth</h3>
            <p className="text-xs text-muted mt-2">Interviews, users, and AI costs over 6 months</p>
          </div>
          <div className="flex items-center gap-5">
            {[
              { label: 'Interviews', color: 'hsl(252,100%,68%)' },
              { label: 'Users', color: 'hsl(174,80%,55%)' },
              { label: 'AI Cost ($)', color: 'hsl(38,95%,60%)' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: 12, height: 3, borderRadius: 99, background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={platformTrend} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <defs>
              {[
                { id: 'interviews', color: 'hsl(252,100%,68%)' },
                { id: 'users', color: 'hsl(174,80%,55%)' },
                { id: 'cost', color: 'hsl(38,95%,60%)' },
              ].map(g => (
                <linearGradient key={g.id} id={`grad-${g.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={g.color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={g.color} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="interviews" stroke="hsl(252,100%,68%)" strokeWidth={2} fill="url(#grad-interviews)" name="Interviews" />
            <Area type="monotone" dataKey="users" stroke="hsl(174,80%,55%)" strokeWidth={2} fill="url(#grad-users)" name="Users" />
            <Area type="monotone" dataKey="cost" stroke="hsl(38,95%,60%)" strokeWidth={2} fill="url(#grad-cost)" name="AI Cost ($)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Row */}
      <div className="grid-2" style={{ gap: 'var(--space-6)' }}>
        {/* Retention Line */}
        <div className="card">
          <h3 className="section-title">
            <TrendingUp size={16} color="var(--accent-green)" />
            User Retention (8 weeks)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={retentionData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[80, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="rate" stroke="hsl(142,70%,55%)" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(142,70%,55%)' }} name="Retention %" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-6)' }}>
            <div>
              <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--accent-green)' }}>91.5%</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg retention</p>
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--accent-teal)' }}>94%</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last week</p>
            </div>
          </div>
        </div>

        {/* Top Roles */}
        <div className="card">
          <h3 className="section-title">Top Interview Roles</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topRoles} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Interviews">
                {topRoles.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats Footer */}
      <div className="card mt-6" style={{ background: 'linear-gradient(135deg, hsla(252,100%,68%,0.06), hsla(280,90%,65%,0.06))', border: '1px solid var(--border-accent)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-4)', textAlign: 'center' }}>
          {[
            { label: 'Countries', value: '47', icon: '🌍' },
            { label: 'Companies', value: '312', icon: '🏢' },
            { label: 'Avg Score', value: '76.4', icon: '⭐' },
            { label: 'Pass Rate', value: '68%', icon: '✅' },
            { label: 'Uptime', value: '99.9%', icon: '⚡' },
          ].map(s => (
            <div key={s.label} style={{ padding: 'var(--space-4) 0' }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
