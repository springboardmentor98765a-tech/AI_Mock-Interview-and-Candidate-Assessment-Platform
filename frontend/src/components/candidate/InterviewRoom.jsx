// ============================================================
//  InterviewRoom.jsx — Candidate Assigned Interviews & Practice Room
// ============================================================
import { useState, useEffect } from 'react';
import { Play, CheckCircle, Clock, Video, Tag, Award, AlertCircle } from 'lucide-react';
import InterviewSession from './InterviewSession';
import InterviewSummary from './InterviewSummary';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function InterviewRoom() {
  const [assignedSessions, setAssignedSessions] = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [activeSession, setActiveSession]       = useState(null);
  const [summarySession, setSummarySession]     = useState(null);

  useEffect(() => {
    fetchAssignedSessions();
  }, []);

  const fetchAssignedSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sessions`, {
        method: 'GET',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAssignedSessions(data);
      }
    } catch (_err) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async (session) => {
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${session.id}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (res.ok) {
        const detail = await res.json();
        if (detail.status === 'completed') {
          setSummarySession(detail);
        } else {
          setActiveSession(detail);
        }
        return;
      }
    } catch (_e) {
      /* ignore */
    }
    setActiveSession(session);
  };

  if (summarySession) {
    return <InterviewSummary session={summarySession} onBack={() => setSummarySession(null)} />;
  }

  if (activeSession) {
    return <InterviewSession session={activeSession} onBackToGenerator={() => { setActiveSession(null); fetchAssignedSessions(); }} />;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, hsla(252,100%,68%,0.12), hsla(280,90%,65%,0.12))',
        border: '1px solid var(--border-accent)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Video size={28} color="var(--accent-primary)" />
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 700 }}>
              Candidate Interview Room
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              View and take interviews assigned to you by recruiters and administrators.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <div className="auth-loading-spinner" style={{ margin: '0 auto 12px' }} />
          <p>Loading assigned interviews...</p>
        </div>
      ) : assignedSessions.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
          <AlertCircle size={36} color="var(--accent-primary)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 6 }}>
            No Assigned Interviews Found
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto' }}>
            You do not currently have any assigned interviews. When a recruiter assigns an AI interview session to you, it will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'var(--font-heading)', marginBottom: 4 }}>
            Your Assigned Interview Sessions ({assignedSessions.length})
          </h3>

          {assignedSessions.map((item) => {
            const isCompleted = item.status === 'completed';
            const isInProgress = item.status === 'in_progress';
            return (
              <div key={item.id} className="card" style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: '0.72rem', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontWeight: 600,
                        background: isCompleted ? 'hsla(142,70%,55%,0.12)' : isInProgress ? 'hsla(38,95%,60%,0.12)' : 'hsla(252,100%,68%,0.12)',
                        color: isCompleted ? 'var(--accent-green)' : isInProgress ? 'var(--accent-amber)' : 'var(--accent-primary)'
                      }}>
                        {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Pending Interview'}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Difficulty: {item.difficulty}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {item.job_role}
                    </h4>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span><Tag size={10} style={{ display: 'inline', marginRight: 4 }} />Domain: {item.domain}</span>
                      <span>Type: {item.interview_type}</span>
                      <span>Questions: {item.num_questions}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenSession(item)}
                    style={{
                      padding: '10px 22px', borderRadius: 'var(--radius-md)',
                      background: isCompleted ? 'var(--bg-elevated)' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                      border: isCompleted ? '1px solid var(--border-medium)' : 'none',
                      color: isCompleted ? 'var(--text-primary)' : '#fff',
                      fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem',
                      boxShadow: isCompleted ? 'none' : 'var(--shadow-glow)'
                    }}
                  >
                    {isCompleted ? (
                      <><Award size={16} /> View Results</>
                    ) : (
                      <><Play size={16} /> {isInProgress ? 'Resume Interview' : 'Start Interview'}</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
