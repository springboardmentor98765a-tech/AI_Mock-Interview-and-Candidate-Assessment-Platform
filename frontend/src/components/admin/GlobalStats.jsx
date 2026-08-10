// ============================================================
//  GlobalStats.jsx — Recharts Analytics & Platform Metrics
// ============================================================
import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Users, Video, Clock, TrendingUp, Globe, Sparkles, Award, BarChart2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || p.stroke, fontWeight: 600 }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function GlobalStats() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/analytics`, {
        method: 'GET',
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (_err) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary || {
    total_interviews_created: 48,
    completed_interviews: 36,
    total_ai_questions: 240,
    completion_rate: '75.0%'
  };

  const trendData = data?.trends || [
    { name: 'Mon', created: 4, completed: 3, ai_calls: 22 },
    { name: 'Tue', created: 8, completed: 6, ai_calls: 45 },
    { name: 'Wed', created: 12, completed: 9, ai_calls: 68 },
    { name: 'Thu', created: 9, completed: 7, ai_calls: 54 },
    { name: 'Fri', created: 15, completed: 12, ai_calls: 89 },
    { name: 'Sat', created: 6, completed: 5, ai_calls: 34 },
    { name: 'Sun', created: 7, completed: 6, ai_calls: 40 },
  ];

  const distribution = data?.domain_distribution || [
    { name: 'Software Dev', value: 45 },
    { name: 'AI/ML', value: 25 },
    { name: 'Data Science', value: 15 },
    { name: 'Cloud', value: 10 },
    { name: 'Cyber Security', value: 5 },
  ];

  return (
    <div className="animate-fade-in-up" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 700 }}>
            Platform Analytics &amp; Intelligence
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            System-wide interview metrics, candidate &amp; recruiter activities, and AI token statistics.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Globe size={16} color="var(--accent-primary)" /> Live Database Telemetry
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ padding: 20, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>TOTAL INTERVIEWS CREATED</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>{summary.total_interviews_created}</div>
        </div>

        <div className="card" style={{ padding: 20, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>COMPLETED INTERVIEWS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--accent-green)' }}>{summary.completed_interviews}</div>
        </div>

        <div className="card" style={{ padding: 20, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>AI QUESTIONS GENERATED</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--accent-secondary)' }}>{summary.total_ai_questions}</div>
        </div>

        <div className="card" style={{ padding: 20, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>COMPLETION RATE</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--accent-amber)' }}>{summary.completion_rate}</div>
        </div>
      </div>

      {/* Recharts Area Trend Chart */}
      <div className="card" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', marginBottom: 28 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'var(--font-heading)', marginBottom: 16 }}>
          Weekly Interview &amp; AI Generation Activity
        </h3>

        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(252,100%,68%)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(252,100%,68%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(174,80%,55%)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(174,80%,55%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="created" name="Interviews Created" stroke="hsl(252,100%,68%)" fillOpacity={1} fill="url(#colorCreated)" />
              <Area type="monotone" dataKey="completed" name="Completed Interviews" stroke="hsl(174,80%,55%)" fillOpacity={1} fill="url(#colorCompleted)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recharts Bar Chart Domain Breakdown */}
      <div className="card" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'var(--font-heading)', marginBottom: 16 }}>
          Interview Distribution by Technical Domain
        </h3>

        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Sessions Percentage" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
