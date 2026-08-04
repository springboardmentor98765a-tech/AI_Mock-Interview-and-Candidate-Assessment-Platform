import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Filter, Star } from 'lucide-react';
import { candidates } from '../../data/mockData';

const STATUS_BADGE = {
  'shortlisted':  'badge-success',
  'under review': 'badge-warning',
  'pending':      'badge-neutral',
};

function ScoreBar({ value, color = 'var(--accent-primary)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
      <div className="progress-bar" style={{ flex: 1, height: 5 }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 99, transition: 'width 0.8s ease' }} />
      </div>
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: 28 }}>{value}</span>
    </div>
  );
}

export default function CandidateReports() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [sort, setSort] = useState({ key: 'score', dir: 'desc' });

  const filtered = candidates
    .filter(c =>
      (statusFilter === 'all' || c.status === statusFilter) &&
      (c.name.toLowerCase().includes(search.toLowerCase()) || c.role.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => sort.dir === 'desc' ? b[sort.key] - a[sort.key] : a[sort.key] - b[sort.key]);

  const toggleSort = (key) => {
    setSort(s => s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' });
  };

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <h1>Candidate Reports</h1>
        <p>Detailed profiles, interview transcripts, and AI-generated feedback for every applicant</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <div className="search-bar">
          <Search className="search-bar-icon" />
          <input
            id="candidate-search"
            type="text"
            placeholder="Search candidates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} color="var(--text-muted)" />
          {['all', 'shortlisted', 'under review', 'pending'].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {filtered.length} candidates
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Role</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('score')}>
                  <span className="flex items-center gap-1">Score {sort.key === 'score' ? (sort.dir === 'desc' ? '↓' : '↑') : '↕'}</span>
                </th>
                <th>Confidence</th>
                <th>Technical</th>
                <th>Communication</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <>
                  <tr key={c.id} onClick={() => setExpanded(expanded === c.id ? null : c.id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, hsl(${220 + c.id * 25},80%,50%), hsl(${250 + c.id * 25},80%,60%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: '0.75rem', flexShrink: 0 }}>
                          {c.initials}
                        </div>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                      </div>
                    </td>
                    <td><span className="text-secondary">{c.role}</span></td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: c.score >= 85 ? 'var(--accent-green)' : 'var(--accent-primary)' }}>
                        {c.score}
                      </span>
                    </td>
                    <td><ScoreBar value={c.confidence} color="hsl(252,100%,68%)" /></td>
                    <td><ScoreBar value={c.technical} color="hsl(174,80%,55%)" /></td>
                    <td><ScoreBar value={c.communication} color="hsl(280,90%,65%)" /></td>
                    <td><span className={`badge ${STATUS_BADGE[c.status]}`}>{c.status}</span></td>
                    <td><span className="text-muted text-xs">{c.date}</span></td>
                    <td>
                      {expanded === c.id ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
                    </td>
                  </tr>
                  {expanded === c.id && (
                    <tr key={`exp-${c.id}`}>
                      <td colSpan={9} style={{ padding: 0 }}>
                        <div className="animate-fade-in" style={{
                          padding: 'var(--space-5) var(--space-6)',
                          background: 'hsla(252,100%,68%,0.03)',
                          borderTop: '1px solid var(--border-subtle)',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}>
                          <div className="grid-2" style={{ gap: 'var(--space-6)' }}>
                            <div>
                              <h5 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
                                AI Feedback Transcript
                              </h5>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7, background: 'var(--bg-input)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                                💬 "{c.name} demonstrated {c.confidence >= 85 ? 'exceptional' : 'solid'} confidence throughout the session. Technical depth was {c.technical >= 85 ? 'above average' : 'satisfactory'} with clear communication during problem-solving. Recommend for {c.status === 'shortlisted' ? 'next round' : 'further evaluation'}."
                              </p>
                            </div>
                            <div>
                              <h5 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
                                Skills Assessed
                              </h5>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                                {c.skills.map(s => <span key={s} className="skill-tag">{s}</span>)}
                              </div>
                              <div className="flex gap-2">
                                <button className="btn btn-primary btn-sm">
                                  <Star size={13} /> Shortlist
                                </button>
                                <button className="btn btn-secondary btn-sm">View Full Report</button>
                                <button className="btn btn-ghost btn-sm">Schedule Follow-up</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
