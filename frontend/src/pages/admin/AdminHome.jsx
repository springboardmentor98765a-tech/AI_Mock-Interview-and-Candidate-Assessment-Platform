import React, { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import Section from '../../components/Section';
import { listTickets, setTicketStatus } from '../../lib/tickets';

const STATS = [
  ['312', 'Total users'],
  ['48', 'Recruiters'],
  ['1,284', 'Interviews'],
  ['72%', 'Platform avg'],
];

const ACTIVITY = [
  ['Recruiter created', 'KUMAR KUMAR added by admin', '2 min ago', 'badge-ok'],
  ['AI model updated', 'Scoring model switched to v2.4', '1 hr ago', 'badge-info'],
  ['User blocked', 'Karan Patel blocked for policy breach', '3 hr ago', 'badge-bad'],
  ['Settings changed', 'Session cap raised to 12 questions', '5 hr ago', 'badge-warn'],
];

const INITIAL_USERS = [
  { id: 'u1', name: 'DIV KUMAR', initials: 'DK', email: 'div@smarthire.ai', role: 'candidate', blocked: false },
  { id: 'u2', name: 'Sonia Rathod', initials: 'SR', email: 'sonia@smarthire.ai', role: 'recruiter', blocked: false },
  { id: 'u3', name: 'Karan Patel', initials: 'KP', email: 'karan@smarthire.ai', role: 'candidate', blocked: true },
  { id: 'u4', name: 'Rajesh Kumar', initials: 'RK', email: 'rajesh@smarthire.ai', role: 'recruiter', blocked: false },
];

/* ---------- API usage & latency ---------- */

const API_STATS = [
  ['48,912', 'Requests (24h)'],
  ['142 ms', 'Avg latency'],
  ['380 ms', 'p95 latency'],
  ['0.4%', 'Error rate'],
];

// avg latency in ms per 3-hour bucket; bar heights scaled for the chart
const LATENCY = [
  ['00:00', 118, 59],
  ['03:00', 104, 52],
  ['06:00', 132, 66],
  ['09:00', 186, 93],
  ['12:00', 214, 107],
  ['15:00', 198, 99],
  ['18:00', 164, 82],
  ['21:00', 136, 68],
];

const ENDPOINTS = [
  { path: 'POST /api/v1/interviews/score', calls: '12,480', avg: '412 ms', errors: '0.9%', tone: 'badge-warn' },
  { path: 'GET  /api/v1/candidates', calls: '9,204', avg: '86 ms', errors: '0.1%', tone: 'badge-ok' },
  { path: 'POST /api/v1/auth/login', calls: '7,881', avg: '124 ms', errors: '2.1%', tone: 'badge-bad' },
  { path: 'GET  /api/v1/analytics', calls: '6,340', avg: '198 ms', errors: '0.2%', tone: 'badge-ok' },
  { path: 'POST /api/v1/resume/parse', calls: '3,120', avg: '640 ms', errors: '1.4%', tone: 'badge-warn' },
];

const STATUS_TONE = { open: 'badge-warn', resolved: 'badge-ok', dismissed: 'badge-muted' };

export default function AdminHome() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [tickets, setTickets] = useState(listTickets);
  const [filter, setFilter] = useState('open');

  const [settings, setSettings] = useState({
    maxQuestions: 12,
    sessionMinutes: 30,
    openSignup: true,
    maintenance: false,
  });
  const [savedSettings, setSavedSettings] = useState(false);

  const [ai, setAi] = useState({ model: 'claude-sonnet-5', temperature: 0.4 });

  const visibleTickets = filter === 'all' ? tickets : tickets.filter((t) => t.status === filter);
  const openCount = tickets.filter((t) => t.status === 'open').length;

  const act = (id, status) => setTickets(setTicketStatus(id, status));

  const toggleBlocked = (id) =>
    setUsers(users.map((u) => (u.id === id ? { ...u, blocked: !u.blocked } : u)));

  return (
    <AppLayout>
      {/* ---------- overview ---------- */}
      <Section
        id="overview"
        title="Platform overview"
        subtitle="Users, tickets, API health, configuration and activity."
      >
        <div className="grid cols-4">
          {STATS.map(([value, label]) => (
            <div key={label} className="stat">
              <b>{value}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {openCount > 0 && (
          <p className="note">
            {openCount} report ticket{openCount === 1 ? '' : 's'} awaiting review in the Tickets
            section below.
          </p>
        )}
      </Section>

      {/* ---------- users ---------- */}
      <Section id="users" title="Manage users" subtitle={`${users.length} accounts. Change a role or block an account.`}>
        <div className="card">
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="end">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="cell">
                        <span className="avatar">{user.initials}</span>
                        {user.name}
                      </div>
                    </td>
                    <td className="num">{user.email}</td>
                    <td>
                      <select
                        aria-label={`Role for ${user.name}`}
                        value={user.role}
                        onChange={(e) =>
                          setUsers(users.map((u) => (u.id === user.id ? { ...u, role: e.target.value } : u)))
                        }
                      >
                        <option value="candidate">candidate</option>
                        <option value="recruiter">recruiter</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${user.blocked ? 'badge-bad' : 'badge-ok'}`}>
                        {user.blocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="end">
                      <button className="btn" onClick={() => toggleBlocked(user.id)}>
                        {user.blocked ? 'Unblock' : 'Block'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ---------- tickets ---------- */}
      <Section
        id="tickets"
        title="Report tickets"
        subtitle="Reports raised by candidates and recruiters against each other."
      >
        <div className="card">
          <h2>Filter</h2>
          <div className="choices">
            {['open', 'resolved', 'dismissed', 'all'].map((value) => (
              <button
                key={value}
                type="button"
                className={value === filter ? 'choice on' : 'choice'}
                onClick={() => setFilter(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>
            {filter === 'all' ? 'All tickets' : `${filter} tickets`} ({visibleTickets.length})
          </h2>

          {visibleTickets.length === 0 ? (
            <p className="note">
              No {filter === 'all' ? '' : filter} tickets. Raise one from a candidate or recruiter
              account to see it here.
            </p>
          ) : (
            visibleTickets.map((ticket) => (
              <div key={ticket.id} className="row">
                <div>
                  <strong>
                    {ticket.fromName} ({ticket.fromRole}) reported {ticket.against} (
                    {ticket.againstRole})
                  </strong>
                  <small>
                    {ticket.id} &middot; {ticket.reason} &middot; {ticket.raised}
                  </small>
                  <p className="muted">{ticket.details}</p>
                </div>
                <span className={`badge ${STATUS_TONE[ticket.status]}`}>{ticket.status}</span>
                {ticket.status === 'open' && (
                  <div className="actions">
                    <button className="btn" onClick={() => act(ticket.id, 'dismissed')}>
                      Dismiss
                    </button>
                    <button className="btn btn-primary" onClick={() => act(ticket.id, 'resolved')}>
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Section>

      {/* ---------- api ---------- */}
      <Section id="api" title="API usage & latency" subtitle="Request volume and response times over the last 24 hours.">
        <div className="grid cols-4">
          {API_STATS.map(([value, label]) => (
            <div key={label} className="stat">
              <b>{value}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Average latency by hour</h2>
          <div className="chart">
            {LATENCY.map(([time, ms, height]) => (
              <div key={time} title={`${time} — ${ms} ms`}>
                <i style={{ height: `${height}px` }} />
                <span>{time}</span>
              </div>
            ))}
          </div>
          <p className="note">Latency peaks at 12:00 (214 ms), tracking interview volume.</p>
        </div>

        <div className="card">
          <h2>Slowest endpoints</h2>
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Calls</th>
                  <th>Avg latency</th>
                  <th className="end">Errors</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map((endpoint) => (
                  <tr key={endpoint.path}>
                    <td className="num">{endpoint.path}</td>
                    <td className="num">{endpoint.calls}</td>
                    <td className="num">{endpoint.avg}</td>
                    <td className="end">
                      <span className={`badge ${endpoint.tone}`}>{endpoint.errors}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ---------- activity ---------- */}
      <Section id="activity" title="System activity" subtitle="Audit log of configuration changes and account actions.">
        <div className="card">
          {ACTIVITY.map(([title, detail, when, tone]) => (
            <div key={title} className="row">
              <div>
                <strong>{title}</strong>
                <small>{detail}</small>
              </div>
              <span className="mono muted">{when}</span>
              <span className={`badge ${tone}`}>log</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- ai ---------- */}
      <Section id="ai" title="AI configuration" subtitle="Model and sampling applied to every scored session.">
        <div className="card card-narrow">
          <h2>Model</h2>

          <div className="field">
            <label className="label" htmlFor="ai-model">
              Scoring &amp; interview model
            </label>
            <select
              id="ai-model"
              value={ai.model}
              onChange={(e) => setAi({ ...ai, model: e.target.value })}
            >
              <option value="claude-opus-5">claude-opus-5</option>
              <option value="claude-sonnet-5">claude-sonnet-5</option>
              <option value="claude-haiku-4-5">claude-haiku-4-5</option>
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="ai-temp">
              Temperature ({ai.temperature})
            </label>
            <input
              id="ai-temp"
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={ai.temperature}
              onChange={(e) =>
                setAi({ ...ai, temperature: Math.min(1, Math.max(0, Number(e.target.value) || 0)) })
              }
            />
          </div>
        </div>
      </Section>

      {/* ---------- settings ---------- */}
      <Section id="settings" title="Platform settings" subtitle="Limits and rules applied to every interview.">
        <form
          className="card card-narrow"
          onSubmit={(e) => {
            e.preventDefault();
            setSavedSettings(true);
            setTimeout(() => setSavedSettings(false), 2500);
          }}
        >
          <h2>Session limits</h2>

          <div className="field">
            <label className="label" htmlFor="max-questions">
              Max questions per session
            </label>
            <input
              id="max-questions"
              type="number"
              min={1}
              max={50}
              value={settings.maxQuestions}
              onChange={(e) =>
                setSettings({ ...settings, maxQuestions: Number(e.target.value) || 1 })
              }
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="session-minutes">
              Session time limit (minutes)
            </label>
            <input
              id="session-minutes"
              type="number"
              min={5}
              max={120}
              value={settings.sessionMinutes}
              onChange={(e) =>
                setSettings({ ...settings, sessionMinutes: Number(e.target.value) || 5 })
              }
            />
          </div>

          <label className="check">
            <input
              type="checkbox"
              checked={settings.openSignup}
              onChange={(e) => setSettings({ ...settings, openSignup: e.target.checked })}
            />
            Allow public candidate sign-up
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={settings.maintenance}
              onChange={(e) => setSettings({ ...settings, maintenance: e.target.checked })}
            />
            Maintenance mode (blocks new sessions)
          </label>

          {savedSettings && <p className="note">Settings saved.</p>}

          <button type="submit" className="btn btn-primary btn-block">
            Save settings
          </button>
        </form>
      </Section>
    </AppLayout>
  );
}
