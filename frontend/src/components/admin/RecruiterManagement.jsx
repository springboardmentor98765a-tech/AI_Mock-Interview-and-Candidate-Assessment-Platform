// ============================================================
//  RecruiterManagement.jsx — Recruiter Approval & Permissions
// ============================================================
import { useState, useEffect } from 'react';
import { UserCheck, UserX, Search, Shield, CheckCircle, Edit, Key, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function RecruiterManagement() {
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusMsg, setStatusMsg]   = useState('');

  useEffect(() => {
    fetchRecruiters();
  }, []);

  const fetchRecruiters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/recruiters`, {
        method: 'GET',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setRecruiters(data);
      }
    } catch (_err) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/recruiters/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setStatusMsg(`Recruiter status updated to ${status}`);
        setTimeout(() => setStatusMsg(''), 3000);
        fetchRecruiters();
      }
    } catch (_err) {
      /* ignore */
    }
  };

  const filtered = recruiters.filter(r =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in-up" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 700 }}>
          Recruiter Management
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Review recruiter accounts, approve pending registration, manage permissions &amp; suspend accounts.
        </p>
      </div>

      {statusMsg && (
        <div style={{
          background: 'hsla(142,70%,55%,0.1)', border: '1px solid var(--accent-green)',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16,
          color: 'var(--accent-green)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8
        }}>
          <CheckCircle size={16} /> {statusMsg}
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
          <input
            className="input"
            placeholder="Search recruiters by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 36, background: 'var(--bg-input)' }}
          />
        </div>
      </div>

      {/* Recruiter Table */}
      <div className="card" style={{ padding: 0, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-card)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '14px 18px' }}>Recruiter</th>
              <th style={{ padding: '14px 18px' }}>Status</th>
              <th style={{ padding: '14px 18px' }}>Interviews Created</th>
              <th style={{ padding: '14px 18px' }}>Permissions</th>
              <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const isApproved = r.is_active;
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.email}</div>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-full)',
                      background: isApproved ? 'hsla(142,70%,55%,0.12)' : 'hsla(350,90%,65%,0.12)',
                      color: isApproved ? 'var(--accent-green)' : 'var(--accent-rose)'
                    }}>
                      {isApproved ? 'Approved' : 'Suspended'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: 600 }}>
                    {r.total_interviews_created || 0} Sessions
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4, color: 'var(--accent-teal)' }}>AI Generator</span>
                      <span style={{ fontSize: '0.72rem', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4, color: 'var(--accent-primary)' }}>Templates</span>
                      <span style={{ fontSize: '0.72rem', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4, color: 'var(--accent-amber)' }}>Reports</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    {isApproved ? (
                      <button
                        onClick={() => handleStatusChange(r.id, 'suspended')}
                        style={{
                          padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'hsla(350,90%,65%,0.15)',
                          color: 'var(--accent-rose)', border: '1px solid var(--accent-rose)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600
                        }}
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(r.id, 'approved')}
                        style={{
                          padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'hsla(142,70%,55%,0.15)',
                          color: 'var(--accent-green)', border: '1px solid var(--accent-green)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600
                        }}
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
