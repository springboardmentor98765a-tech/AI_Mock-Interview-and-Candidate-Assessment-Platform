import React, { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import Section from '../../components/Section';
import ReportDialog from '../../components/ReportDialog';
import { Panel, NotAvailable } from '../../components/Panel';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';

const STATUS_TONE = { OPEN: 'badge-warn', RESOLVED: 'badge-ok', DISMISSED: 'badge-muted' };

const initials = (name) =>
  String(name).split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

const shortTime = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

export default function RecruiterHome() {
  const { user } = useAuth();
  const me = user?.name ?? 'Recruiter';

  const stats = useApi(() => api.recruiterAnalytics());
  const candidates = useApi(() => api.recruiterCandidates());
  const live = useApi(() => api.liveInterviews());
  const tickets = useApi(() => api.listTickets());

  const [reportTarget, setReportTarget] = useState(null);
  const [resume, setResume] = useState({ open: null, data: null, error: null, loading: false });

  const s = stats.data;

  const viewResume = async (candidate) => {
    setResume({ open: candidate.user_id, data: null, error: null, loading: true });
    try {
      const data = await api.candidateResume(candidate.user_id);
      setResume({ open: candidate.user_id, data, error: null, loading: false });
    } catch (err) {
      setResume({ open: candidate.user_id, data: null, error: err, loading: false });
    }
  };

  return (
    <AppLayout>
      {/* ---------- overview ---------- */}
      <Section
        id="overview"
        title={`Welcome, ${me.split(' ')[0]}`}
        subtitle="Live counts across the candidate pool."
      >
        <Panel {...stats} onRetry={stats.reload}>
          {s && (
            <div className="grid cols-4">
              <div className="stat">
                <b>{s.candidates_total}</b>
                <span>Candidates</span>
              </div>
              <div className="stat">
                <b>{s.candidates_with_resume}</b>
                <span>With résumé</span>
              </div>
              <div className="stat">
                <b>{s.interviews_total}</b>
                <span>Interviews</span>
              </div>
              <div className="stat">
                <b>{s.live_now}</b>
                <span>Live now</span>
              </div>
            </div>
          )}
        </Panel>
      </Section>

      {/* ---------- candidates ---------- */}
      <Section
        id="candidates"
        title="Candidates"
        subtitle="Real accounts, ordered by interview activity."
      >
        <div className="card">
          <Panel
            {...candidates}
            isEmpty={candidates.data?.length === 0}
            empty="No candidates have registered yet."
            onRetry={candidates.reload}
          >
            <div className="scroll-x">
              <table className="table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Interviews</th>
                    <th>Completed</th>
                    <th>Résumé</th>
                    <th>Last active</th>
                    <th className="end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.data?.map((c) => (
                    <tr key={c.user_id}>
                      <td>
                        <div className="cell">
                          <span className="avatar">{initials(c.name)}</span>
                          {c.name}
                        </div>
                      </td>
                      <td className="num">{c.interviews_total}</td>
                      <td className="num">{c.interviews_completed}</td>
                      <td>
                        <span className={`badge ${c.has_resume ? 'badge-ok' : 'badge-muted'}`}>
                          {c.has_resume ? 'Parsed' : 'None'}
                        </span>
                      </td>
                      <td className="num">{shortTime(c.last_active_at)}</td>
                      <td className="end">
                        <div className="actions actions-end">
                          {c.has_resume && (
                            <button className="btn" onClick={() => viewResume(c)}>
                              Résumé
                            </button>
                          )}
                          <button className="btn" onClick={() => setReportTarget(c)}>
                            Report
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {resume.open && (
          <div className="card">
            <h2>Extracted profile</h2>
            {resume.loading && <p className="note">Loading…</p>}
            {resume.error && (
              <p className="note">
                {resume.error.status === 404
                  ? 'This candidate has no parsed résumé.'
                  : (resume.error.detail ?? 'Could not load the résumé.')}
              </p>
            )}
            {resume.data?.extracted && (
              <>
                <p className="muted">{resume.data.extracted.summary}</p>
                <div className="row">
                  <div>
                    <strong>Experience</strong>
                    <small>{resume.data.extracted.total_experience_years} years</small>
                  </div>
                </div>
                <p className="label gap-top">Technologies</p>
                <div className="tags">
                  {resume.data.extracted.technologies.map((t) => (
                    <span key={t} className="badge badge-info">
                      {t}
                    </span>
                  ))}
                </div>
                <p className="label gap-top">Skills</p>
                <div className="tags">
                  {resume.data.extracted.skills.map((t) => (
                    <span key={t} className="badge badge-muted">
                      {t}
                    </span>
                  ))}
                </div>
              </>
            )}
            <div className="actions gap-top">
              <button className="btn" onClick={() => setResume({ open: null })}>
                Close
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* ---------- analytics ---------- */}
      <Section
        id="analytics"
        title="Candidate analytics"
        subtitle="What the data actually supports today."
      >
        <Panel {...stats} onRetry={stats.reload}>
          {s && (
            <div className="card">
              <h2>Most common technologies across parsed résumés</h2>
              {s.top_technologies.length === 0 ? (
                <p className="note">No parsed résumés yet, so there is nothing to aggregate.</p>
              ) : (
                s.top_technologies.map((row) => {
                  const peak = s.top_technologies[0].count || 1;
                  return (
                    <div key={row.label} className="row">
                      <div>
                        <strong>{row.label}</strong>
                        <small>
                          {row.count} candidate{row.count === 1 ? '' : 's'}
                        </small>
                      </div>
                      <div className="meter">
                        <i style={{ width: `${Math.round((row.count / peak) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </Panel>

        <div className="grid cols-2">
          <NotAvailable
            what="Score distribution"
            reason="Interviews are recorded but not yet scored, so there is no distribution to plot. This needs the scoring engine (Module 7)."
          />
          <NotAvailable
            what="Pool skill averages"
            reason="Communication, confidence, technical and professionalism ratings do not exist yet — nothing in the platform produces them."
          />
        </div>
      </Section>

      {/* ---------- compare ---------- */}
      <Section
        id="compare"
        title="Compare candidates"
        subtitle="Side-by-side comparison of scored performance."
      >
        <NotAvailable
          what="Score comparison"
          reason="Comparing candidates requires scores, and no interview has ever been scored. Until the scoring engine exists, use the Candidates table above — interview counts, completion and résumé data are real."
        />
      </Section>

      {/* ---------- templates ---------- */}
      <Section
        id="templates"
        title="Interview templates"
        subtitle="Reusable question sets you can launch for any candidate."
      >
        <div className="card">
          <h2>Saved templates</h2>
          <p className="note">
            <span className="badge badge-muted">Not yet available</span>
          </p>
          <p className="muted">
            There is no templates table on the server, so a template created here would vanish on
            reload. Candidates generate interviews directly by type, domain and difficulty in the
            meantime — that path is fully working.
          </p>
        </div>
      </Section>

      {/* ---------- sessions ---------- */}
      <Section
        id="sessions"
        title="Monitor sessions"
        subtitle="Interviews currently in progress, from live session status."
      >
        <div className="card">
          <h2>
            Live now{live.data ? ` (${live.data.length})` : ''}
            <button className="btn" onClick={live.reload} style={{ float: 'right' }}>
              Refresh
            </button>
          </h2>

          <Panel
            {...live}
            isEmpty={live.data?.length === 0}
            empty="No interviews are in progress. A session appears here as soon as a candidate starts one."
            onRetry={live.reload}
          >
            {live.data?.map((row) => (
              <div key={row.interview_id} className="row">
                <span className="avatar">{initials(row.candidate_name)}</span>
                <div>
                  <strong>{row.candidate_name}</strong>
                  <small>
                    {row.interview_type} &middot; {row.domain} &middot; {row.difficulty}
                  </small>
                </div>
                <span className="mono muted">
                  Q{row.questions_answered} of {row.questions_total}
                </span>
                <span className="badge badge-bad">live</span>
              </div>
            ))}
          </Panel>
        </div>
      </Section>

      {/* ---------- reports ---------- */}
      <Section
        id="report"
        title="Reports you have raised"
        subtitle="Flag a candidate from the Candidates section above."
      >
        <div className="card">
          <Panel
            {...tickets}
            isEmpty={tickets.data?.length === 0}
            empty="You have not raised any reports."
            onRetry={tickets.reload}
          >
            {tickets.data?.map((ticket) => (
              <div key={ticket.id} className="row">
                <div>
                  <strong>{ticket.against_name}</strong>
                  <small>
                    #{ticket.id} &middot; {ticket.reason} &middot; {shortTime(ticket.created_at)}
                  </small>
                  {ticket.details && <p className="muted">{ticket.details}</p>}
                </div>
                <span className={`badge ${STATUS_TONE[ticket.status]}`}>
                  {ticket.status.toLowerCase()}
                </span>
              </div>
            ))}
          </Panel>
        </div>
      </Section>

      {reportTarget && (
        <ReportDialog
          target={reportTarget.name}
          targetRole="candidate"
          onCancel={() => setReportTarget(null)}
          onSubmit={async ({ reason, details }) => {
            await api.createTicket({ againstId: reportTarget.user_id, reason, details });
            setReportTarget(null);
            tickets.reload();
          }}
        />
      )}
    </AppLayout>
  );
}
