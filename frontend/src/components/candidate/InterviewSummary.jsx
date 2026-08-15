// ============================================================
//  InterviewSummary.jsx — Comprehensive Post-Interview Breakdown
// ============================================================
import { useState } from 'react';
import { Award, CheckCircle, AlertTriangle, ArrowLeft, RefreshCw, BarChart2, BookOpen, Clock, Tag, Video, VideoOff } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function InterviewSummary({ session, onBack }) {
  const [videoError, setVideoError] = useState(false);

  const {
    id,
    job_role,
    domain,
    interview_type,
    difficulty,
    score,
    duration,
    questions = [],
    started_at,
    ended_at,
    has_recording,
    auto_expired,
  } = session;

  const totalQuestions = questions.length;
  const answeredQuestions = questions.filter(q => q.user_answer && q.user_answer.trim() !== '');

  // Calculate duration in seconds & formatted string
  let totalDurationSecs = duration || 0;
  if (!totalDurationSecs && started_at && ended_at) {
    const s = new Date(started_at).getTime();
    const e = new Date(ended_at).getTime();
    totalDurationSecs = Math.max(0, Math.floor((e - s) / 1000));
  }

  const formatSecs = (secs) => {
    const m = Math.floor((secs || 0) / 60);
    const s = (secs || 0) % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const avgTimePerQuestion = totalQuestions > 0 ? Math.round(totalDurationSecs / totalQuestions) : 0;

  const resultData = session.result;
  const rawScore = resultData?.overall_score ?? score;
  const hasScore = rawScore !== null && rawScore !== undefined && parseFloat(rawScore) > 0;
  const finalScoreDisplay = hasScore ? `${parseFloat(rawScore).toFixed(1)}%` : 'Evaluation Pending';

  const scoreColor = !hasScore ? 'var(--text-muted)' :
    parseFloat(rawScore) >= 80 ? 'var(--accent-green)' :
    parseFloat(rawScore) >= 60 ? 'var(--accent-amber)' : 'var(--accent-rose)';

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          fontSize: '0.85rem', marginBottom: 16, padding: 0
        }}
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Auto Expiration Banner if applicable */}
      {auto_expired && (
        <div style={{
          background: 'hsla(38,95%,60%,0.15)', border: '1px solid var(--accent-amber)',
          borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: 20,
          color: 'var(--accent-amber)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 10
        }}>
          <AlertTriangle size={20} />
          <div>
            <strong>Interview time has ended.</strong>
            <p style={{ fontSize: '0.82rem', margin: 0, opacity: 0.9 }}>
              The interview timer reached zero. All recorded answers, timing data, and media stream recordings were automatically saved.
            </p>
          </div>
        </div>
      )}

      {/* Main Score Hero Card */}
      <div style={{
        background: 'linear-gradient(135deg, hsla(252,100%,68%,0.15), hsla(280,90%,65%,0.15))',
        border: '1px solid var(--border-accent)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 24,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Award size={22} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Interview Completed
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 700, marginBottom: 6 }}>
            {job_role} Summary
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Domain: <strong style={{ color: '#fff' }}>{domain}</strong> &bull; Type: <strong style={{ color: '#fff' }}>{interview_type}</strong> &bull; Difficulty: <strong style={{ color: '#fff' }}>{difficulty}</strong>
          </p>
        </div>

        {/* Score Ring / Gauge */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: 'var(--bg-elevated)', padding: '20px 32px', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-md)'
        }}>
          <span style={{ fontSize: hasScore ? '2.5rem' : '1.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: scoreColor }}>
            {finalScoreDisplay}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Overall AI Assessment
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ padding: '18px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
            <BarChart2 size={16} /> <span style={{ fontSize: '0.8rem' }}>Questions Completed</span>
          </div>
          <p style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            {answeredQuestions.length} / {totalQuestions}
          </p>
        </div>

        <div className="card" style={{ padding: '18px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
            <Clock size={16} /> <span style={{ fontSize: '0.8rem' }}>Total Duration</span>
          </div>
          <p style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            {formatSecs(totalDurationSecs)}
          </p>
        </div>

        <div className="card" style={{ padding: '18px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
            <Clock size={16} /> <span style={{ fontSize: '0.8rem' }}>Average Time / Question</span>
          </div>
          <p style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--accent-teal)' }}>
            {formatSecs(avgTimePerQuestion)}
          </p>
        </div>
      </div>

      {/* Authorized Video Recording Playback Section */}
      <div className="card" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', marginBottom: 28, border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Video size={20} color="var(--accent-primary)" />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700 }}>
            Recorded Session Playback
          </h3>
        </div>

        {id && !videoError ? (
          <div style={{
            width: '100%', maxHeight: '400px', borderRadius: 'var(--radius-md)', overflow: 'hidden',
            background: 'hsl(222,47%,5%)', border: '1px solid var(--border-medium)', display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
            <video
              controls
              crossOrigin="use-credentials"
              src={`${API_BASE}/api/interviews/sessions/${id}/recording`}
              onError={() => setVideoError(true)}
              style={{ width: '100%', maxHeight: '380px', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
        ) : (
          <div style={{
            padding: '30px', textAlign: 'center', background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)',
            color: 'var(--text-muted)'
          }}>
            <VideoOff size={32} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
            <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>Recording unavailable.</p>
          </div>
        )}

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 10 }}>
          🔒 Recording access is protected by backend role-based authorization. Only authorized candidates, recruiters, and admins can view this media stream.
        </p>
      </div>

      {/* Question Breakdown */}
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>
        Question Timing &amp; Performance Breakdown
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {questions.map((q, idx) => {
          const qScore = q.score !== null && q.score !== undefined ? parseFloat(q.score) : 80;
          return (
            <div key={idx} className="card" style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.8rem', color: 'var(--accent-primary)'
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                    {q.category || domain}
                  </span>
                  {q.time_spent > 0 && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-teal)', background: 'hsla(174,80%,55%,0.1)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                      ⏱ Time spent: {formatSecs(q.time_spent)}
                    </span>
                  )}
                </div>

                <div style={{
                  fontSize: '0.9rem', fontWeight: 700, color: qScore >= 75 ? 'var(--accent-green)' : 'var(--accent-amber)',
                  background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: 'var(--radius-sm)'
                }}>
                  {qScore.toFixed(0)} / 100
                </div>
              </div>

              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
                {q.question_text}
              </h4>

              {/* Candidate Answer */}
              <div style={{ background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  Your Answer
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {q.user_answer || '(No answer recorded)'}
                </p>
              </div>

              {/* AI Feedback */}
              {q.feedback && (
                <div style={{ background: 'hsla(252,100%,68%,0.06)', borderLeft: '3px solid var(--accent-primary)', padding: '10px 14px', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', marginBottom: 12 }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    AI Evaluator Feedback
                  </p>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {q.feedback}
                  </p>
                </div>
              )}

              {/* Sample Answer */}
              {q.sample_answer && (
                <div style={{ background: 'hsla(174,80%,55%,0.06)', borderLeft: '3px solid var(--accent-teal)', padding: '10px 14px', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent-teal)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    Recommended Sample Answer
                  </p>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {q.sample_answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
