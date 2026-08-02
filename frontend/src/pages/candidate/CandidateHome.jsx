import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import Section from '../../components/Section';
import ReportDialog from '../../components/ReportDialog';
import { useAuth } from '../../context/AuthContext';
import { downloadTextFile, buildSummaryReport, buildSessionReport } from '../../lib/report';
import { createTicket, listTickets } from '../../lib/tickets';

const STATS = [
  ['6', 'Interviews'],
  ['78%', 'Avg score'],
  ['1', 'Awaiting result'],
  ['82%', 'Best score'],
];

const SKILLS = [
  ['Communication', 82, 6],
  ['Technical', 80, 8],
  ['Confidence', 74, -3],
  ['Professionalism', 77, 2],
];

const SESSIONS = [
  { id: 's6', type: 'Technical', date: '24 Oct 2026', duration: '18m', score: 82, status: 'Completed', tone: 'badge-ok' },
  { id: 's5', type: 'Aptitude', date: '22 Oct 2026', duration: '15m', score: 75, status: 'Completed', tone: 'badge-ok' },
  { id: 's4', type: 'HR round', date: '21 Oct 2026', duration: '12m', score: null, status: 'Processing', tone: 'badge-info' },
  { id: 's3', type: 'Behavioural', date: '18 Oct 2026', duration: '20m', score: 71, status: 'Completed', tone: 'badge-ok' },
];

const RECRUITERS = [
  { id: 'r1', name: 'Sonia Rathod', initials: 'SR', org: 'TechCorp' },
  { id: 'r2', name: 'Rajesh Kumar', initials: 'RK', org: 'Infosys' },
  { id: 'r3', name: 'Neha Sharma', initials: 'NS', org: 'TCS' },
];

const BREAKDOWN = [
  ['Communication', 82, '30%'],
  ['Confidence', 74, '25%'],
  ['Technical relevance', 80, '30%'],
  ['Professionalism', 77, '15%'],
];

const TYPES = ['technical', 'hr', 'aptitude', 'behavioural'];
const LEVELS = ['easy', 'medium', 'hard'];
const MAX_MB = 5;

export default function CandidateHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const me = user?.name ?? 'Candidate';

  // resume
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);

  // interview setup
  const [setup, setSetup] = useState({
    type: 'technical',
    level: 'medium',
    domain: 'Backend engineer - Python',
    count: 10,
  });

  // reporting
  const [reportTarget, setReportTarget] = useState(null);
  const [tickets, setTickets] = useState(listTickets);

  // settings
  const [profile, setProfile] = useState({ name: me, email: user?.email ?? '', password: '' });
  const [savedProfile, setSavedProfile] = useState(false);

  const myTickets = tickets.filter((t) => t.fromName === me);

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') return setFileError('Only PDF files are accepted.');
    if (f.size > MAX_MB * 1024 * 1024) return setFileError(`File exceeds ${MAX_MB} MB limit.`);
    setFileError(null);
    setFile({ name: f.name, size: `${(f.size / (1024 * 1024)).toFixed(1)} MB` });
  };

  const submitReport = ({ reason, details }) => {
    createTicket({
      fromName: me,
      fromRole: 'candidate',
      against: reportTarget.name,
      againstRole: 'recruiter',
      reason,
      details,
    });
    setTickets(listTickets());
    setReportTarget(null);
  };

  const Picker = ({ label, items, active, field }) => (
    <div className="field">
      <span className="label">{label}</span>
      <div className="choices">
        {items.map((value) => (
          <button
            key={value}
            type="button"
            className={value === active ? 'choice on' : 'choice'}
            onClick={() => setSetup((prev) => ({ ...prev, [field]: value }))}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <AppLayout>
      {/* ---------- overview ---------- */}
      <Section
        id="overview"
        title={`Welcome back, ${me.split(' ')[0]}`}
        subtitle="One session is still being scored. Scroll for resume, interviews, analytics and settings."
        action={
          <button
            className="btn btn-primary"
            onClick={() =>
              downloadTextFile(
                'smarthire-performance-summary.txt',
                buildSummaryReport({
                  candidate: me,
                  stats: STATS,
                  skills: SKILLS.map(([label, value]) => [label, value]),
                })
              )
            }
          >
            Download summary
          </button>
        }
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

      {/* ---------- resume ---------- */}
      <Section id="resume" title="Resume" subtitle="Upload a PDF to match interview questions to your skills.">
        <div className="grid cols-2">
          <div className="card">
            <h2>Upload</h2>
            <div
              className="drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0]);
              }}
            >
              <p>Drop your resume PDF here, or choose a file. Max {MAX_MB} MB.</p>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <button className="btn btn-primary" onClick={() => inputRef.current?.click()}>
                Browse files
              </button>
            </div>

            {fileError && <p className="error">{fileError}</p>}

            {file ? (
              <div className="row">
                <span className="avatar">PDF</span>
                <div>
                  <strong>{file.name}</strong>
                  <small>{file.size}</small>
                </div>
                <span className="badge badge-ok">Ready</span>
                <button className="btn" onClick={() => setFile(null)}>
                  Remove
                </button>
              </div>
            ) : (
              <p className="note">No resume uploaded yet.</p>
            )}
          </div>

          <div className="card">
            <h2>Status</h2>
            {file ? (
              <p className="note">
                Resume <strong>{file.name}</strong> uploaded. Configure a session below.
              </p>
            ) : (
              <p className="note">Upload your resume to generate matched questions.</p>
            )}
          </div>
        </div>
      </Section>

      {/* ---------- interview ---------- */}
      <Section id="interview" title="Configure session" subtitle="Questions are generated to match the role and level.">
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            navigate('/interview/live');
          }}
        >
          <h2>Session settings</h2>
          <Picker label="Interview type" items={TYPES} active={setup.type} field="type" />

          <div className="field">
            <label className="label" htmlFor="domain">
              Domain / role
            </label>
            <input
              id="domain"
              type="text"
              value={setup.domain}
              onChange={(e) => setSetup({ ...setup, domain: e.target.value })}
            />
          </div>

          <Picker label="Difficulty" items={LEVELS} active={setup.level} field="level" />

          <div className="field">
            <label className="label" htmlFor="count">
              Number of questions
            </label>
            <input
              id="count"
              type="number"
              min={1}
              max={50}
              value={setup.count}
              onChange={(e) => setSetup({ ...setup, count: Number(e.target.value) || 1 })}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            Launch session
          </button>
        </form>
      </Section>

      {/* ---------- history ---------- */}
      <Section id="history" title="Interview history" subtitle={`${SESSIONS.length} sessions recorded.`}>
        <div className="card">
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th className="end">Report</th>
                </tr>
              </thead>
              <tbody>
                {SESSIONS.map((session) => (
                  <tr key={session.id}>
                    <td>{session.type}</td>
                    <td className="num">{session.date}</td>
                    <td className="num">{session.duration}</td>
                    <td>
                      <span className={`badge ${session.tone}`}>{session.status}</span>
                    </td>
                    <td className="num">{session.score ? `${session.score}%` : '--'}</td>
                    <td className="end">
                      <button
                        className="btn"
                        disabled={!session.score}
                        onClick={() =>
                          downloadTextFile(
                            `smarthire-report-${session.id}.txt`,
                            buildSessionReport({
                              candidate: me,
                              session: { ...session, score: `${session.score}%` },
                              breakdown: BREAKDOWN,
                            })
                          )
                        }
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ---------- analytics ---------- */}
      <Section id="analytics" title="Analytics" subtitle="Skill breakdown and change since your last session.">
        <div className="card">
          {SKILLS.map(([label, value, delta]) => (
            <div key={label} className="meter">
              <div>
                <em>
                  {label}{' '}
                  <span className={`delta ${delta >= 0 ? 'delta-up' : 'delta-down'}`}>
                    {delta >= 0 ? `+${delta}` : delta}
                  </span>
                </em>
                <b>{value}%</b>
              </div>
              <div className="bar">
                <i style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
          <p className="note">Confidence dropped 3 points. Practise deliberate pausing.</p>
        </div>
      </Section>

      {/* ---------- report ---------- */}
      <Section id="report" title="Report a recruiter" subtitle="Raises a ticket for an administrator to review.">
        <div className="grid cols-2">
          <div className="card">
            <h2>Recruiters you have worked with</h2>
            {RECRUITERS.map((recruiter) => (
              <div key={recruiter.id} className="row">
                <span className="avatar">{recruiter.initials}</span>
                <div>
                  <strong>{recruiter.name}</strong>
                  <small>{recruiter.org}</small>
                </div>
                <button className="btn btn-danger" onClick={() => setReportTarget(recruiter)}>
                  Report
                </button>
              </div>
            ))}
          </div>

          <div className="card">
            <h2>Your reports ({myTickets.length})</h2>
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
        </div>
      </Section>

      {/* ---------- settings ---------- */}
      <Section id="settings" title="Account settings" subtitle="Manage your profile details and password.">
        <form
          className="card card-narrow"
          onSubmit={(e) => {
            e.preventDefault();
            setSavedProfile(true);
            setTimeout(() => setSavedProfile(false), 2500);
          }}
        >
          <h2>Candidate profile</h2>

          <div className="field">
            <label className="label" htmlFor="profile-name">
              Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="profile-email">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="profile-password">
              New password
            </label>
            <input
              id="profile-password"
              type="password"
              value={profile.password}
              placeholder="Leave blank to keep current"
              onChange={(e) => setProfile({ ...profile, password: e.target.value })}
            />
          </div>

          {savedProfile && <p className="note">Settings saved.</p>}

          <button type="submit" className="btn btn-primary btn-block">
            Save
          </button>
        </form>
      </Section>

      {reportTarget && (
        <ReportDialog
          target={reportTarget.name}
          targetRole="recruiter"
          onCancel={() => setReportTarget(null)}
          onSubmit={submitReport}
        />
      )}
    </AppLayout>
  );
}
