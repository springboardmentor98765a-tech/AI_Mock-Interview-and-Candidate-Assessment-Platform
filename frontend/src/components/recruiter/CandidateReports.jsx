import { useState, useEffect } from 'react';
import {
  Search, ChevronDown, ChevronUp, Filter, Star, Clock, Video,
  CheckCircle, AlertCircle, X, Award, BarChart2, Shield, RefreshCw,
  Volume2, Mic
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STATUS_BADGE = {
  'completed':   'badge-success',
  'in_progress': 'badge-primary',
  'paused':      'badge-warning',
  'created':     'badge-neutral',
};

function formatSecs(secs) {
  const m = Math.floor((secs || 0) / 60);
  const s = (secs || 0) % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function CandidateReports() {
  const [interviews, setInterviews]     = useState([]);
  const [analytics, setAnalytics]       = useState(null);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter]     = useState('all');
  const [sortKey, setSortKey]           = useState('completed_at');
  const [sortOrder, setSortOrder]       = useState('desc');
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionDetail, setSessionDetail]         = useState(null);
  const [loadingDetail, setLoadingDetail]         = useState(false);

  // Fetch interviews & analytics from backend
  const fetchData = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (statusFilter !== 'all') queryParams.append('status_filter', statusFilter);
      if (typeFilter !== 'all') queryParams.append('interview_type', typeFilter);
      if (sortKey) queryParams.append('sort_by', sortKey);
      if (sortOrder) queryParams.append('sort_order', sortOrder);

      const [resInterviews, resAnalytics] = await Promise.all([
        fetch(`${API_BASE}/api/recruiter/interviews?${queryParams.toString()}`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/recruiter/analytics`, { credentials: 'include' })
      ]);

      if (resInterviews.ok) {
        const data = await resInterviews.json();
        setInterviews(data);
      }
      if (resAnalytics.ok) {
        const data = await resAnalytics.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('[CandidateReports] Error fetching database results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 15000); // Periodic 15s refresh
    return () => clearInterval(interval);
  }, [search, statusFilter, typeFilter, sortKey, sortOrder]);

  // Load detailed session data when a row is selected
  const handleSelectCandidate = async (sessionId) => {
    if (selectedSessionId === sessionId) {
      setSelectedSessionId(null);
      setSessionDetail(null);
      return;
    }

    setSelectedSessionId(sessionId);
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API_BASE}/api/recruiter/interviews/${sessionId}/details`, {
        credentials: 'include'
      });
      if (res.ok) {
        const detail = await res.json();
        setSessionDetail(detail);
      }
    } catch (err) {
      console.error('[CandidateReports] Failed to fetch session details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(o => o === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Candidate Results &amp; Analytics</h1>
            <p>Database-backed evaluation, performance metrics, and video recordings for all applicants</p>
          </div>
          <button className="btn btn-secondary btn-sm flex items-center gap-2" onClick={fetchData}>
            <RefreshCw size={14} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Analytics Overview Cards */}
      {analytics && (
        <div className="grid-4" style={{ marginBottom: 'var(--space-6)', gap: 'var(--space-4)' }}>
          <div className="card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Interviews
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', marginTop: 4 }}>
              {analytics.total_interviews}
            </div>
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Completed
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--accent-green)', marginTop: 4 }}>
              {analytics.completed_interviews}
            </div>
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Average Score
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--accent-primary)', marginTop: 4 }}>
              {analytics.average_score}%
            </div>
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Avg Duration
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--accent-teal)', marginTop: 4 }}>
              {formatSecs(analytics.average_duration)}
            </div>
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <div className="search-bar">
          <Search className="search-bar-icon" />
          <input
            id="candidate-search"
            type="text"
            placeholder="Search candidate name, email, or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
          {['all', 'completed', 'in_progress', 'created'].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Type:</span>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{
              background: 'var(--bg-input)', border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '4px 10px', fontSize: '0.82rem'
            }}
          >
            <option value="all">All Types</option>
            <option value="Technical Interview">Technical</option>
            <option value="HR Interview">HR</option>
            <option value="Behavioral Interview">Behavioral</option>
            <option value="Aptitude Interview">Aptitude</option>
          </select>
        </div>

        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {interviews.length} Results
        </span>
      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('candidate_name')}>
                  Candidate {sortKey === 'candidate_name' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                </th>
                <th>Role &amp; Type</th>
                <th>Status</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('score')}>
                  Overall Score {sortKey === 'score' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('duration')}>
                  Duration {sortKey === 'duration' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                </th>
                <th>Completed Questions</th>
                <th>Recommendation</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('completed_at')}>
                  Date {sortKey === 'completed_at' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading database results...
                  </td>
                </tr>
              ) : interviews.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No interview sessions match the criteria.
                  </td>
                </tr>
              ) : (
                interviews.map(item => {
                  const isExpanded = selectedSessionId === item.id;
                  const stKey = (item.status || 'created').toLowerCase();
                  const scoreVal = item.overall_score || 0;
                  const scoreColor = scoreVal >= 80 ? 'var(--accent-green)' : scoreVal >= 60 ? 'var(--accent-amber)' : 'var(--accent-primary)';

                  return (
                    <tr key={item.id} onClick={() => handleSelectCandidate(item.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: '0.75rem', flexShrink: 0
                          }}>
                            {item.candidate_name ? item.candidate_name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, display: 'block' }}>{item.candidate_name}</span>
                            <span className="text-muted text-xs">{item.candidate_email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <span style={{ fontWeight: 500, display: 'block', color: 'var(--text-primary)' }}>{item.job_role}</span>
                          <span className="text-muted text-xs">{item.interview_type} &bull; {item.difficulty}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[stKey] || 'badge-neutral'}`}>
                          {(item.status || 'CREATED').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: scoreColor }}>
                          {stKey === 'completed' ? `${scoreVal.toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>{formatSecs(item.duration)}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {item.completed_questions} / {item.total_questions}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                          {item.recommendation || 'Under Review'}
                        </span>
                      </td>
                      <td>
                        <span className="text-muted text-xs">
                          {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : (item.created_at ? new Date(item.created_at).toLocaleDateString() : '—')}
                        </span>
                      </td>
                      <td>
                        {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Candidate Detail Modal / Section */}
      {selectedSessionId && (
        <div style={{ marginTop: 'var(--space-6)', background: 'var(--bg-card)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
            <div className="flex items-center gap-3">
              <Award size={24} color="var(--accent-primary)" />
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700 }}>
                Candidate Performance Breakdown
              </h2>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSessionId(null)}>
              <X size={18} /> Close Details
            </button>
          </div>

          {loadingDetail ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading detailed candidate report from database...
            </div>
          ) : sessionDetail ? (
            <div>
              {/* Profile & General Summary */}
              <div className="grid-2" style={{ gap: 20, marginBottom: 24 }}>
                <div style={{ background: 'var(--bg-elevated)', padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
                    Candidate Information
                  </h4>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                    <strong>Name:</strong> {sessionDetail.candidate?.name || 'N/A'}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                    <strong>Email:</strong> {sessionDetail.candidate?.email || 'N/A'}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                    <strong>Target Role:</strong> {sessionDetail.session?.job_role}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                    <strong>Domain:</strong> {sessionDetail.session?.domain}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                    <strong>Experience Level:</strong> {sessionDetail.session?.experience_level || 'Mid Level'}
                  </p>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
                    Interview Session Summary
                  </h4>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                    <strong>Interview Type:</strong> {sessionDetail.session?.interview_type}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                    <strong>Difficulty:</strong> {sessionDetail.session?.difficulty}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                    <strong>Questions Completed:</strong> {sessionDetail.session?.completed_questions} / {sessionDetail.session?.total_questions}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                    <strong>Total Duration:</strong> {formatSecs(sessionDetail.result?.total_duration || sessionDetail.session?.duration || 0)}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                    <strong>Recommendation:</strong> <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{sessionDetail.result?.recommendation || 'Under Review'}</span>
                  </p>
                </div>
              </div>

              {/* Video Recording Playback Section */}
              <div style={{ background: 'var(--bg-surface)', padding: 20, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: 24 }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                  <Video size={18} color="var(--accent-primary)" />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Interview Video / Audio Recording</h4>
                </div>

                {sessionDetail.has_recording ? (
                  <div style={{ maxWidth: 500, margin: '0 auto' }}>
                    <video
                      controls
                      crossOrigin="use-credentials"
                      src={`${API_BASE}/api/interviews/sessions/${selectedSessionId}/recording`}
                      style={{ width: '100%', borderRadius: 'var(--radius-md)', background: '#000' }}
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    No media recording uploaded for this session.
                  </div>
                )}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                  🔒 Protected access: Backend verifies recruiter authorization before streaming media files.
                </p>
              </div>

              {/* Question Level Analytics */}
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>
                Question-by-Question Analysis
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(sessionDetail.question_results || []).map((qr, i) => (
                  <div key={i} style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>
                        Q{qr.question_number}: {qr.answer_type || 'General'}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className={`badge ${qr.answer_status === 'Answered' ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.7rem' }}>
                          {qr.answer_status}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-teal)', fontWeight: 600 }}>
                          ⏱ {formatSecs(qr.time_spent)}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: qr.score >= 75 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                          {qr.score !== null && qr.score !== undefined ? `${qr.score}/100` : 'Pending'}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 8 }}>
                      {qr.question_text}
                    </p>

                    {/* Per-Question Voice Answer Audio Player */}
                    <div style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-teal)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Volume2 size={13} /> Candidate Voice Answer Recording
                        </span>
                        {qr.audio_duration > 0 && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Duration: {formatSecs(qr.audio_duration)}
                          </span>
                        )}
                      </div>
                      <audio
                        controls
                        crossOrigin="use-credentials"
                        src={`${API_BASE}/api/interviews/sessions/${selectedSessionId}/answers/audio/${qr.question_id || qr.id}`}
                        style={{ width: '100%', height: 36, borderRadius: 'var(--radius-sm)' }}
                      />
                    </div>

                    {qr.user_answer && (
                      <div style={{ background: 'var(--bg-input)', padding: 10, borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Candidate Answer Transcript:</span>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: 2 }}>{qr.user_answer}</p>
                      </div>
                    )}

                    {qr.evaluation && (
                      <div style={{ background: 'hsla(252,100%,68%,0.06)', borderLeft: '3px solid var(--accent-primary)', padding: '8px 12px', borderRadius: '0 4px 4px 0' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase' }}>AI Evaluation:</span>
                        <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginTop: 2 }}>{qr.evaluation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
