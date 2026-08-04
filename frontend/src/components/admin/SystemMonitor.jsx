import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { systemData as initialData } from '../../data/mockData';
import { Cpu, MemoryStick, Zap, Clock } from 'lucide-react';

const metrics = [
  { key: 'cpu',         label: 'CPU Usage',     unit: '%',    color: 'hsl(252,100%,68%)', icon: Cpu,         warn: 70 },
  { key: 'memory',      label: 'Memory',        unit: '%',    color: 'hsl(280,90%,65%)',  icon: MemoryStick, warn: 80 },
  { key: 'apiRequests', label: 'API Req/s',     unit: '/s',   color: 'hsl(174,80%,55%)',  icon: Zap,         warn: 180 },
  { key: 'latency',     label: 'Avg Latency',   unit: 'ms',   color: 'hsl(38,95%,60%)',   icon: Clock,       warn: 150 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: '0.78rem' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color, fontWeight: 600 }}>{p.value}{p.unit}</p>)}
      </div>
    );
  }
  return null;
};

export default function SystemMonitor() {
  const [data, setData] = useState(initialData);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setData(prev => {
        const newPoint = {
          time: `${prev.length}s`,
          cpu: Math.floor(30 + Math.random() * 50),
          memory: Math.floor(55 + Math.random() * 22),
          apiRequests: Math.floor(100 + Math.random() * 100),
          latency: Math.floor(100 + Math.random() * 70),
        };
        return [...prev.slice(-24), newPoint];
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [running]);

  const latest = data[data.length - 1];

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1>System Monitor</h1>
            <p>Real-time telemetry: server load, API performance, and infrastructure health</p>
          </div>
          <div className="flex items-center gap-3">
            {running && <div className="live-badge"><span className="live-dot" />LIVE</div>}
            <button className={`btn ${running ? 'btn-secondary' : 'btn-primary'} btn-sm`} onClick={() => setRunning(v => !v)}>
              {running ? '⏸ Pause' : '▶ Resume'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        {metrics.map((m, i) => {
          const Icon = m.icon;
          const val = Math.round(latest?.[m.key] || 0);
          const isWarn = val > m.warn;
          return (
            <div key={m.key} className={`stat-card animate-fade-in-up delay-${i + 1}`} style={{ borderColor: isWarn ? 'hsla(350,90%,65%,0.3)' : 'var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={m.color} />
                </div>
                {isWarn && <span className="badge badge-danger" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>HIGH</span>}
              </div>
              <div className="flex items-end gap-1">
                <span className="stat-value monitor-value" style={{ color: m.color }}>{val}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', paddingBottom: 4 }}>{m.unit}</span>
              </div>
              <span className="stat-label">{m.label}</span>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid-2" style={{ gap: 'var(--space-6)' }}>
        {metrics.map(m => (
          <div key={m.key} className="card">
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
              <h4 style={{ fontSize: '0.9rem', color: m.color }}>{m.label}</h4>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: m.color, fontWeight: 600 }}>
                {Math.round(latest?.[m.key] || 0)}{m.unit}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={data} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={m.color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={m.color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2} fill={`url(#grad-${m.key})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Log Stream */}
      <div className="card mt-6">
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
          <h3>Recent Log Stream</h3>
          <span className="badge badge-neutral">Last 10 entries</span>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.78rem', lineHeight: 1.8,
          background: 'hsl(222,50%,4%)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
          maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-subtle)'
        }}>
          {[
            { level: 'INFO', msg: 'Interview session started: user_id=4821, template=React_Technical' },
            { level: 'INFO', msg: 'AI response generated in 138ms: question_id=3' },
            { level: 'WARN', msg: 'High memory usage detected: 77.4% — approaching threshold' },
            { level: 'INFO', msg: 'Resume parsed successfully: skills_extracted=8' },
            { level: 'INFO', msg: 'PDF report generated: interview_id=7204' },
            { level: 'ERROR', msg: 'Webhook delivery failed: endpoint=greenhouse.io — retrying (1/3)' },
            { level: 'INFO', msg: 'Session completed: score=87, duration=47m' },
            { level: 'INFO', msg: 'New user registered: role=Candidate, email=***@email.com' },
            { level: 'WARN', msg: 'API rate limit approaching: 87% of quota used' },
            { level: 'INFO', msg: 'Billing cycle renewed: plan=Enterprise, amount=$399' },
          ].map((log, i) => (
            <div key={i} style={{
              color: log.level === 'ERROR' ? 'var(--accent-rose)' : log.level === 'WARN' ? 'var(--accent-amber)' : 'hsl(220,15%,65%)',
              marginBottom: 2
            }}>
              <span style={{ color: 'var(--text-muted)' }}>[{new Date(Date.now() - (10 - i) * 45000).toISOString().slice(11, 19)}] </span>
              <span style={{ color: log.level === 'ERROR' ? 'var(--accent-rose)' : log.level === 'WARN' ? 'var(--accent-amber)' : 'var(--accent-teal)', fontWeight: 600 }}>
                {log.level}
              </span>
              {' '}{log.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
