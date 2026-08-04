import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { competencyData, categoryScores, timeDistribution } from '../../data/mockData';
import { Award, TrendingUp, MessageSquare, Activity } from 'lucide-react';

const COLORS = ['hsl(252,100%,68%)', 'hsl(280,90%,65%)', 'hsl(174,80%,55%)', 'hsl(38,95%,60%)'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '0.8rem'
      }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || p.fill, fontWeight: 600 }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const metricHighlights = [
  { label: 'Overall Score', value: '87', unit: '/100', icon: Award, color: 'var(--accent-primary)' },
  { label: 'Communication', value: '79', unit: '%', icon: MessageSquare, color: 'var(--accent-teal)' },
  { label: 'Improvement', value: '+33', unit: 'pts', icon: TrendingUp, color: 'var(--accent-green)' },
  { label: 'Consistency', value: '91', unit: '%', icon: Activity, color: 'var(--accent-amber)' },
];

export default function Analytics() {
  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <h1>Performance Analytics</h1>
        <p>Deep-dive into your interview performance across all competencies</p>
      </div>

      {/* KPI Row */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        {metricHighlights.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`stat-card animate-fade-in-up delay-${i + 1}`}>
              <div className="flex items-center gap-3">
                <div className="stat-icon" style={{ background: `${m.color}18` }}>
                  <Icon size={20} color={m.color} />
                </div>
                <span className="stat-label">{m.label}</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="stat-value">{m.value}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', paddingBottom: 4 }}>{m.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts Row */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-8)' }}>
        {/* Radar Chart */}
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: 'var(--space-2)' }}>Competency Radar</h3>
          <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-4)' }}>Multi-dimensional performance breakdown</p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={competencyData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="var(--border-subtle)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-body)' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="You" dataKey="A" stroke="hsl(252,100%,68%)" fill="hsl(252,100%,68%)" fillOpacity={0.2} strokeWidth={2} dot={{ r: 4, fill: 'hsl(252,100%,68%)' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: 'var(--space-2)' }}>Category Scores</h3>
          <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-4)' }}>Score breakdown by question category</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryScores} margin={{ top: 10, right: 10, left: -20, bottom: 10 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(252,100%,68%,0.05)' }} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]} name="Score">
                {categoryScores.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-2">
        {/* Pie Chart — Time Distribution */}
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: 'var(--space-2)' }}>Time Distribution</h3>
          <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-4)' }}>How you spent your answer time</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={timeDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {timeDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {timeDistribution.map(d => (
                <div key={d.name} className="flex items-center gap-3">
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{d.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed metrics text */}
        <div className="card">
          <h3 className="section-title">Feedback Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {[
              { label: 'Technical Depth', score: 88, note: 'Strong React and JS fundamentals. Minor gaps in system design trade-offs.' },
              { label: 'Communication', score: 79, note: 'Clear articulation. Improve sentence structure on complex topics.' },
              { label: 'Confidence', score: 84, note: 'Consistent tone with good eye contact simulation. Minimal filler words.' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{item.score}/100</span>
                </div>
                <div className="progress-bar" style={{ marginBottom: 6 }}>
                  <div className="progress-fill" style={{ width: `${item.score}%` }} />
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
