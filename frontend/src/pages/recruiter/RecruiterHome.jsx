import React, { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import Section from '../../components/Section';
import ReportDialog from '../../components/ReportDialog';
import { useAuth } from '../../context/AuthContext';
import { downloadTextFile, buildSessionReport } from '../../lib/report';
import { createTicket, listTickets } from '../../lib/tickets';

const STATS = [
  ['24', 'Candidates'],
  ['18', 'Assessed'],
  ['69%', 'Avg score'],
  ['2', 'Live now'],
];

const CANDIDATES = [
  { id: 'c1', name: 'DIV KUMAR', initials: 'DK', sessions: 6, score: 79, rank: '#1', tone: 'badge-ok', skills: [82, 74, 80, 77] },
  { id: 'c2', name: 'Priya P.', initials: 'PP', sessions: 4, score: 74, rank: '#2', tone: 'badge-info', skills: [78, 71, 72, 75] },
  { id: 'c3', name: 'Rahul V.', initials: 'RV', sessions: 5, score: 63, rank: '#3', tone: 'badge-warn', skills: [64, 58, 68, 62] },
  { id: 'c4', name: 'Sneha L.', initials: 'SL', sessions: 3, score: 58, rank: '#4', tone: 'badge-muted', skills: [61, 52, 59, 60] },
];

const SKILL_LABELS = ['Communication', 'Confidence', 'Technical', 'Professionalism'];

const DISTRIBUTION = [
  ['0-40', 18],
  ['41-55', 46],
  ['56-70', 104],
  ['71-85', 90],
  ['86-100', 18],
];

const POOL_SKILLS = [
  ['Communication', 74],
  ['Technical', 68],
  ['Confidence', 62],
  ['Professionalism', 79],
];

const LIVE = [
  { id: 'm1', name: 'DIV KUMAR', initials: 'DK', template: 'Backend - Python', progress: 'Q7 of 10', state: 'live', tone: 'badge-bad' },
  { id: 'm2', name: 'Priya P.', initials: 'PP', template: 'Frontend - React', progress: 'Q3 of 8', state: 'live', tone: 'badge-bad' },
  { id: 'm3', name: 'Rahul V.', initials: 'RV', template: 'Data engineer', progress: 'Complete', state: 'scoring', tone: 'badge-info' },
  { id: 'm4', name: 'Sneha L.', initials: 'SL', template: 'QA automation', progress: 'Not started', state: 'queued', tone: 'badge-muted' },
];

const BREAKDOWN = [
  ['Communication', 82, '30%'],
  ['Confidence', 74, '25%'],
  ['Technical relevance', 80, '30%'],
  ['Professionalism', 77, '15%'],
];

const TYPES = ['technical', 'hr', 'aptitude', 'behavioural'];
const LEVELS = ['easy', 'medium', 'hard'];
const TONE_BY_LEVEL = { easy: 'badge-ok', medium: 'badge-info', hard: 'badge-warn' };

export default function RecruiterHome() {
  const { user } = useAuth();
  const me = user?.name ?? 'Recruiter';

  const [selected, setSelected] = useState(['c1', 'c3']);
  const [reportTarget, setReportTarget] = useState(null);
  const [tickets, setTickets] = useState(listTickets);
  const [templates, setTemplates] = useState([
    { id: 't1', name: 'Backend engineer - Python', type: 'technical', level: 'medium', questions: 10 },
    { id: 't2', name: 'Frontend screen - React', type: 'technical', level: 'easy', questions: 8 },
  ]);
  const [form, setForm] = useState({ name: '', type: 'technical', level: 'medium', questions: 10 });
  const [formError, setFormError] = useState(null);

  const myTickets = tickets.filter((t) => t.fromName === me);
  const chosen = CANDIDATES.filter((c) => selected.includes(c.id));
  const best = (index) => Math.max(...chosen.map((c) => c.skills[index]));

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const downloadFor = (candidate) =>
    downloadTextFile(
      `smarthire-report-${candidate.name.replace(/\W+/g, '-').toLowerCase()}.txt`,
      buildSessionReport({
        candidate: candidate.name,
        session: { type: 'Latest assessment', date: '24 Oct 2026', duration: '18m', score: `${candidate.score}%` },
        breakdown: BREAKDOWN,
      })
    );

  const submitReport = ({ reason, details }) => {
    createTicket({
      fromName: me,
      fromRole: 'recruiter',
      against: reportTarget.name,
      againstRole: 'candidate',
      reason,
      details,
    });
    setTickets(listTickets());
    setReportTarget(null);
  };

  const addTemplate = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return setFormError('Give the template a name.');
    if (templates.some((t) => t.name.toLowerCase() === name.toLowerCase()))
      return setFormError('A template with that name already exists.');
    setFormError(null);
    setTemplates([{ id: `t${Date.now()}`, ...form, name }, ...templates]);
    setForm({ name: '', type: 'technical', level: 'medium', questions: 10 });
  };

  return (
    <AppLayout>
      {/* ---------- overview ---------- */}
      <Section
        id="overview"
        title="Recruiter dashboard"
        subtitle="Review candidates, compare them, manage templates and monitor live sessions."
      >
        <div className="grid cols-4">
          {STATS.map(([value, label]) => (
            <div key={label} className="stat">
              <b>{value}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- candidates ---------- */}
      <Section
        id="candidates"
        title="Candidates"
        subtitle="Ranked by average score. Tick two or more to compare them below."
      >
        <div className="card">
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th className="pick" />
                  <th>Candidate</th>
                  <th>Sessions</th>
                  <th>Avg score</th>
                  <th>Rank</th>
                  <th className="end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {CANDIDATES.map((candidate) => (
                  <tr key={candidate.id}>
                    <td className="pick">
                      <input
                        type="checkbox"
                        aria-label={`Select ${candidate.name}`}
                        checked={selected.includes(candidate.id)}
                        onChange={() => toggle(candidate.id)}
                      />
                    </td>
                    <td>
                      <div className="cell">
                        <span className="avatar">{candidate.initials}</span>
                        {candidate.name}
                      </div>
                    </td>
                    <td className="num">{candidate.sessions}</td>
                    <td className="num">{candidate.score}%</td>
                    <td>
                      <span className={`badge ${candidate.tone}`}>{candidate.rank}</span>
                    </td>
                    <td className="end">
                      <div className="actions actions-end">
                        <button className="btn" onClick={() => downloadFor(candidate)}>
                          Report
                        </button>
                        <button className="btn btn-danger" onClick={() => setReportTarget(candidate)}>
                          Flag
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ---------- analytics ---------- */}
      <Section id="analytics" title="Candidate analytics" subtitle="Aggregate performance across your pool.">
        <div className="grid cols-2">
          <div className="card">
            <h2>Score distribution</h2>
            <div className="chart">
              {DISTRIBUTION.map(([band, height]) => (
                <div key={band}>
                  <i style={{ height: `${height}px` }} />
                  <span>{band}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Pool skill averages</h2>
            {POOL_SKILLS.map(([label, value]) => (
              <div key={label} className="meter">
                <div>
                  <em>{label}</em>
                  <b>{value}%</b>
                </div>
                <div className="bar">
                  <i style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
            <p className="note">Confidence is the weakest skill across the pool at 62%.</p>
          </div>
        </div>
      </Section>

      {/* ---------- compare ---------- */}
      <Section id="compare" title="Compare candidates" subtitle="Highest score in each row is highlighted.">
        <div className="card">
          {chosen.length < 2 ? (
            <p className="note">Select at least two candidates in the Candidates section above.</p>
          ) : (
            <div className="scroll-x">
              <table className="table">
                <thead>
                  <tr>
                    <th>Category</th>
                    {chosen.map((c) => (
                      <th key={c.id} className="end">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SKILL_LABELS.map((label, index) => (
                    <tr key={label}>
                      <td>{label}</td>
                      {chosen.map((c) => (
                        <td key={c.id} className="num end">
                          {c.skills[index] === best(index) ? (
                            <span className="badge badge-ok">{c.skills[index]}%</span>
                          ) : (
                            `${c.skills[index]}%`
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td>Overall</td>
                    {chosen.map((c) => (
                      <td key={c.id} className="num end">
                        {c.score}%
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Section>

      {/* ---------- templates ---------- */}
      <Section id="templates" title="Interview templates" subtitle="Reusable question sets you can launch for any candidate.">
        <div className="grid cols-2">
          <form className="card" onSubmit={addTemplate}>
            <h2>Create template</h2>

            <div className="field">
              <label className="label" htmlFor="tpl-name">
                Template name
              </label>
              <input
                id="tpl-name"
                type="text"
                value={form.name}
                placeholder="e.g. Senior backend - system design"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="field">
              <span className="label">Type</span>
              <div className="choices">
                {TYPES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={value === form.type ? 'choice on' : 'choice'}
                    onClick={() => setForm({ ...form, type: value })}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="label">Difficulty</span>
              <div className="choices">
                {LEVELS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={value === form.level ? 'choice on' : 'choice'}
                    onClick={() => setForm({ ...form, level: value })}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {formError && <p className="error">{formError}</p>}

            <button type="submit" className="btn btn-primary btn-block">
              Save template
            </button>
          </form>

          <div className="card">
            <h2>Saved templates ({templates.length})</h2>
            {templates.map((template) => (
              <div key={template.id} className="row">
                <div>
                  <strong>{template.name}</strong>
                  <small>
                    {template.type} &middot; {template.questions} questions
                  </small>
                </div>
                <span className={`badge ${TONE_BY_LEVEL[template.level]}`}>{template.level}</span>
                <button
                  className="btn"
                  onClick={() => setTemplates(templates.filter((t) => t.id !== template.id))}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ---------- sessions ---------- */}
      <Section id="sessions" title="Monitor sessions" subtitle="Live, queued and awaiting-score interviews.">
        <div className="card">
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Template</th>
                  <th>Progress</th>
                  <th className="end">State</th>
                </tr>
              </thead>
              <tbody>
                {LIVE.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <div className="cell">
                        <span className="avatar">{session.initials}</span>
                        {session.name}
                      </div>
                    </td>
                    <td>{session.template}</td>
                    <td className="num">{session.progress}</td>
                    <td className="end">
                      <span className={`badge ${session.tone}`}>{session.state}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ---------- report ---------- */}
      <Section id="report" title="Reports you have raised" subtitle="Flag a candidate from the Candidates section above.">
        <div className="card">
          {myTickets.length === 0 ? (
            <p className="note">You have not reported anyone.</p>
          ) : (
            myTickets.map((ticket) => (
              <div key={ticket.id} className="row">
                <div>
                  <strong>
                    {ticket.against} &middot; {ticket.reason}
                  </strong>
                  <small>
                    {ticket.id} &middot; raised {ticket.raised}
                  </small>
                </div>
                <span
                  className={`badge ${
                    ticket.status === 'open'
                      ? 'badge-warn'
                      : ticket.status === 'resolved'
                        ? 'badge-ok'
                        : 'badge-muted'
                  }`}
                >
                  {ticket.status}
                </span>
              </div>
            ))
          )}
        </div>
      </Section>

      {reportTarget && (
        <ReportDialog
          target={reportTarget.name}
          targetRole="candidate"
          onCancel={() => setReportTarget(null)}
          onSubmit={submitReport}
        />
      )}
    </AppLayout>
  );
}
