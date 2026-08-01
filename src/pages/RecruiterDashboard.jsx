import { useEffect, useState } from 'react'
import { BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, MapPin, Plus, Users, X } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../auth/AuthContext'
import { recruiterApi } from '../auth/api'

const EMPTY_JOB = { title: '', company: '', location: '', employment_type: 'Full-time', description: '' }

function PostJobModal({ onClose, onCreated }) {
  const [job, setJob] = useState(EMPTY_JOB)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const update = (field) => (event) => setJob({ ...job, [field]: event.target.value })
  const submit = async (event) => {
    event.preventDefault(); setError(''); setSaving(true)
    try { onCreated(await recruiterApi.createJob(job)); onClose() } catch (err) { setError(err.message) } finally { setSaving(false) }
  }
  return <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)' }}>
    <form onSubmit={submit} className="glass-strong" style={{ width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20, padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}><div><h2 style={{ color: '#f0f0ff', fontFamily: 'Outfit' }}>Post a job</h2><p style={{ color: '#a0a0c0', fontSize: '.82rem', marginTop: 4 }}>This job will be saved in PostgreSQL.</p></div><button type="button" onClick={onClose} style={{ color: '#a0a0c0', background: 'transparent' }}><X /></button></div>
      <div style={{ display: 'grid', gap: 15 }}>
        <label className="form-group"><span className="form-label">Job title</span><input className="form-input" required value={job.title} onChange={update('title')} placeholder="e.g. Backend Developer" /></label>
        <div className="grid-cols-2" style={{ gap: 15 }}><label className="form-group"><span className="form-label">Company</span><input className="form-input" required value={job.company} onChange={update('company')} placeholder="Company name" /></label><label className="form-group"><span className="form-label">Location</span><input className="form-input" required value={job.location} onChange={update('location')} placeholder="e.g. Bengaluru / Remote" /></label></div>
        <label className="form-group"><span className="form-label">Employment type</span><select className="form-input" value={job.employment_type} onChange={update('employment_type')}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></label>
        <label className="form-group"><span className="form-label">Description</span><textarea className="form-input" required minLength="10" rows="5" value={job.description} onChange={update('description')} placeholder="Describe the role, skills, and responsibilities." /></label>
        {error && <p role="alert" style={{ color: '#f87171', fontSize: '.82rem' }}>{error}</p>}
        <button className="btn btn-primary" style={{ justifyContent: 'center', padding: 13 }} disabled={saving}>{saving ? 'Posting...' : 'Post job'}</button>
      </div>
    </form>
  </div>
}

function ScheduleInterviewModal({ application, onClose, onScheduled }) {
  const hasRequestedTime = Boolean(application.preferred_interview_at)
  const [choice, setChoice] = useState(hasRequestedTime ? 'requested' : 'custom')
  const [customTime, setCustomTime] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    const interviewAt = choice === 'requested' ? application.preferred_interview_at : customTime ? new Date(customTime).toISOString() : ''
    if (!interviewAt) { setError('Choose an interview date and time.'); return }
    setSaving(true); setError('')
    try { await onScheduled(interviewAt); onClose() } catch (err) { setError(err.message) } finally { setSaving(false) }
  }
  return <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)' }}>
    <form onSubmit={submit} className="glass-strong" style={{ width: '100%', maxWidth: 500, borderRadius: 20, padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}><div><h2 style={{ color: '#f0f0ff', fontFamily: 'Outfit' }}>Schedule interview</h2><p style={{ color: '#a0a0c0', fontSize: '.82rem', marginTop: 4 }}>{application.candidate_name} · {application.job_title}</p></div><button type="button" onClick={onClose} style={{ color: '#a0a0c0', background: 'transparent' }}><X /></button></div>
      {hasRequestedTime && <label style={{ display: 'flex', gap: 10, padding: 14, border: `1px solid ${choice === 'requested' ? 'rgba(99,102,241,.55)' : 'rgba(255,255,255,.1)'}`, borderRadius: 12, cursor: 'pointer', marginBottom: 12, background: choice === 'requested' ? 'rgba(99,102,241,.1)' : 'transparent' }}><input type="radio" name="schedule" checked={choice === 'requested'} onChange={() => setChoice('requested')} /><span><strong style={{ color: '#f0f0ff', fontSize: '.86rem' }}>Use candidate’s requested time</strong><span style={{ display: 'block', color: '#a0a0c0', fontSize: '.78rem', marginTop: 3 }}>{new Date(application.preferred_interview_at).toLocaleString()}</span></span></label>}
      <label style={{ display: 'block', padding: 14, border: `1px solid ${choice === 'custom' ? 'rgba(99,102,241,.55)' : 'rgba(255,255,255,.1)'}`, borderRadius: 12, cursor: 'pointer', background: choice === 'custom' ? 'rgba(99,102,241,.1)' : 'transparent' }}><span style={{ display: 'flex', gap: 10 }}><input type="radio" name="schedule" checked={choice === 'custom'} onChange={() => setChoice('custom')} /><strong style={{ color: '#f0f0ff', fontSize: '.86rem' }}>Choose a different time</strong></span>{choice === 'custom' && <input className="form-input" style={{ marginTop: 12 }} type="datetime-local" required value={customTime} onChange={(event) => setCustomTime(event.target.value)} />}</label>
      {error && <p style={{ color: '#f87171', fontSize: '.82rem', marginTop: 12 }}>{error}</p>}<button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 20 }} disabled={saving}>{saving ? 'Scheduling...' : 'Confirm interview'}</button>
    </form>
  </div>
}

export default function RecruiterDashboard() {
  const { user } = useAuth()
  const displayName = user?.name || 'Recruiter'
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [analytics, setAnalytics] = useState({ total_jobs: 0, open_jobs: 0, closed_jobs: 0, candidates: 0 })
  const [showPostJob, setShowPostJob] = useState(false)
  const [scheduleApplication, setScheduleApplication] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([recruiterApi.jobs(), recruiterApi.analytics(), recruiterApi.applications()]).then(([jobList, data, applicationList]) => { setJobs(jobList); setAnalytics(data); setApplications(applicationList) }).catch((err) => setError(err.message))
  }, [])
  const addJob = (job) => { setJobs((current) => [job, ...current]); setAnalytics((current) => ({ ...current, total_jobs: current.total_jobs + 1, open_jobs: current.open_jobs + 1 })) }
  const schedule = async (interviewAt) => {
    try { const updated = await recruiterApi.scheduleInterview(scheduleApplication.id, interviewAt); setApplications((items) => items.map((item) => item.id === updated.id ? updated : item)) } catch (err) { setError(err.message); throw err }
  }
  const handleRecruiterNavigation = (label) => {
    const targets = { Dashboard: 'recruiter-dashboard-top', Candidates: 'recruiter-applications', Schedule: 'recruiter-applications', Reports: 'recruiter-jobs', Analytics: 'recruiter-analytics' }
    const cards = document.querySelectorAll('.dashboard-content > .card')
    const section = label === 'Candidates' || label === 'Schedule' ? cards[1] : label === 'Reports' ? cards[0] : document.getElementById(targets[label])
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const stats = [
    { label: 'Total Job Posts', value: analytics.total_jobs, icon: BriefcaseBusiness, color: '#6366f1' },
    { label: 'Open Jobs', value: analytics.open_jobs, icon: CheckCircle2, color: '#22c55e' },
    { label: 'Closed Jobs', value: analytics.closed_jobs, icon: Clock3, color: '#f59e0b' },
    { label: 'Registered Candidates', value: analytics.candidates, icon: Users, color: '#06b6d4' },
  ]

  return <div className="dashboard-layout" id="recruiter-dashboard-top">
    <Sidebar role="recruiter" onNavigate={handleRecruiterNavigation} />
    <div className="dashboard-main"><Topbar title="Recruiter Dashboard" subtitle="Post and manage your real job listings" userName={displayName} userInitials={initials} roleBadge="Recruiter" />
      <main className="dashboard-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}><div><h2 style={{ color: '#f0f0ff', fontFamily: 'Outfit' }}>Your job posts</h2><p style={{ color: '#a0a0c0', fontSize: '.85rem', marginTop: 5 }}>All values below come from your PostgreSQL database.</p></div><button className="btn btn-primary" onClick={() => setShowPostJob(true)}><Plus size={16} /> Post a job</button></div>
        {error && <p role="alert" style={{ color: '#f87171', marginBottom: 20 }}>{error}</p>}
        <div className="grid-cols-4" id="recruiter-analytics" style={{ marginBottom: 32 }}>{stats.map(({ label, value, icon: Icon, color }) => <div className="stat-card" key={label}><div className="stat-card-icon" style={{ background: `${color}18` }}><Icon size={20} color={color} /></div><div className="stat-card-value" style={{ color }}>{value}</div><div className="stat-card-label">{label}</div></div>)}</div>
        <section className="card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><div><h3 style={{ color: '#f0f0ff', fontFamily: 'Outfit' }}>Posted jobs</h3><p style={{ color: '#606080', fontSize: '.78rem', marginTop: 3 }}>{jobs.length} job{jobs.length === 1 ? '' : 's'} posted by you</p></div></div>
          {jobs.length === 0 ? <div style={{ padding: '42px 12px', textAlign: 'center', color: '#a0a0c0' }}><BriefcaseBusiness size={34} color="#6366f1" style={{ marginBottom: 12 }} /><p>No jobs posted yet.</p><button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowPostJob(true)}><Plus size={16} /> Create your first job</button></div> : <div style={{ overflowX: 'auto' }}><table className="data-table"><thead><tr><th>Job</th><th>Location</th><th>Type</th><th>Posted</th><th>Status</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id}><td><div style={{ color: '#f0f0ff', fontWeight: 600 }}>{job.title}</div><div style={{ color: '#606080', fontSize: '.78rem', marginTop: 2 }}>{job.company}</div></td><td style={{ color: '#a0a0c0', fontSize: '.82rem' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><MapPin size={13} />{job.location}</span></td><td style={{ color: '#a0a0c0', fontSize: '.82rem' }}>{job.employment_type}</td><td style={{ color: '#a0a0c0', fontSize: '.78rem' }}>{new Date(job.created_at).toLocaleDateString()}</td><td><span className={`badge ${job.status === 'OPEN' ? 'badge-success' : 'badge-warning'}`}>{job.status}</span></td></tr>)}</tbody></table></div>}
        </section>
        <section className="card" style={{ marginTop: 28 }}><h3 style={{ color: '#f0f0ff', fontFamily: 'Outfit' }}>Candidate applications</h3><p style={{ color: '#606080', fontSize: '.78rem', margin: '3px 0 18px' }}>Review candidates who applied to your jobs and confirm requested interviews.</p>{applications.length === 0 ? <p style={{ color: '#a0a0c0', padding: '18px 0' }}>No candidate applications yet.</p> : <div style={{ overflowX: 'auto' }}><table className="data-table"><thead><tr><th>Candidate</th><th>Job</th><th>Requested time</th><th>Status</th><th>Action</th></tr></thead><tbody>{applications.map((application) => <tr key={application.id}><td><div style={{ color: '#f0f0ff', fontWeight: 600 }}>{application.candidate_name}</div><div style={{ color: '#606080', fontSize: '.76rem' }}>{application.candidate_email}</div></td><td style={{ color: '#a0a0c0' }}>{application.job_title}<div style={{ color: '#606080', fontSize: '.76rem' }}>{application.company}</div></td><td style={{ color: '#a0a0c0', fontSize: '.78rem' }}>{application.preferred_interview_at ? new Date(application.preferred_interview_at).toLocaleString() : 'Not requested'}</td><td><span className={`badge ${application.status === 'INTERVIEW_SCHEDULED' ? 'badge-success' : application.status === 'INTERVIEW_REQUESTED' ? 'badge-warning' : 'badge-primary'}`}>{application.status.replaceAll('_', ' ')}</span></td><td>{application.status === 'INTERVIEW_REQUESTED' ? <button className="btn btn-primary btn-sm" onClick={() => setScheduleApplication(application)}><CalendarDays size={13} /> Schedule</button> : application.scheduled_interview_at ? <span style={{ color: '#4ade80', fontSize: '.78rem' }}>{new Date(application.scheduled_interview_at).toLocaleString()}</span> : '—'}</td></tr>)}</tbody></table></div>}</section>
      </main>
    </div>
    {showPostJob && <PostJobModal onClose={() => setShowPostJob(false)} onCreated={addJob} />}
    {scheduleApplication && <ScheduleInterviewModal application={scheduleApplication} onClose={() => setScheduleApplication(null)} onScheduled={schedule} />}
  </div>
}
