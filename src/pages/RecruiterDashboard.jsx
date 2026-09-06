import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import recordingApi from '../services/recordingApi'
import cvApi        from '../services/cvApi'
import {
  Users, Briefcase, FileText, Calendar, Video, Download,
  Eye, Star, Award, TrendingUp, TrendingDown, BarChart3,
  Activity, Search, ChevronUp, ChevronDown, MessageSquare,
  X, CheckCircle, Send, Plus, Brain, Zap, Target
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, BarChart, Bar
} from 'recharts'

const ALL_CANDIDATES = [
  { rank: 1, name: 'Arjun Reddy',  role: 'Frontend Developer', resumeScore: 92, interviewScore: 88, aiScore: 95, finalScore: 91.7, rec: 'Highly Recommended', date: 'Jul 25, 2025' },
  { rank: 2, name: 'Kavya Nair',   role: 'Data Analyst',       resumeScore: 88, interviewScore: 85, aiScore: 90, finalScore: 87.7, rec: 'Highly Recommended', date: 'Jul 24, 2025' },
  { rank: 3, name: 'Rohan Joshi',  role: 'Backend Developer',  resumeScore: 85, interviewScore: 82, aiScore: 84, finalScore: 83.7, rec: 'Recommended',        date: 'Jul 23, 2025' },
  { rank: 4, name: 'Meera Iyer',   role: 'UI/UX Designer',     resumeScore: 78, interviewScore: 75, aiScore: 72, finalScore: 75.0, rec: 'Recommended',        date: 'Jul 22, 2025' },
  { rank: 5, name: 'Sanjay Das',   role: 'DevOps Engineer',    resumeScore: 70, interviewScore: 68, aiScore: 65, finalScore: 67.7, rec: 'Needs Review',       date: 'Jul 21, 2025' },
  { rank: 6, name: 'Pooja Mehta',  role: 'QA Engineer',        resumeScore: 62, interviewScore: 58, aiScore: 55, finalScore: 58.3, rec: 'Not Recommended',    date: 'Jul 20, 2025' },
  { rank: 7, name: 'Kiran Rao',    role: 'Data Engineer',      resumeScore: 74, interviewScore: 70, aiScore: 68, finalScore: 70.7, rec: 'Needs Review',       date: 'Jul 19, 2025' },
]

const SCHEDULED_INTERVIEWS = [
  { candidate: 'Arjun Reddy',  role: 'Frontend Developer', date: 'Jul 30, 2025', time: '10:00 AM', type: 'Video Call',  status: 'Confirmed' },
  { candidate: 'Kavya Nair',   role: 'Data Analyst',       date: 'Aug 1, 2025',  time: '2:00 PM',  type: 'Video Call',  status: 'Confirmed' },
  { candidate: 'Rohan Joshi',  role: 'Backend Developer',  date: 'Aug 3, 2025',  time: '11:00 AM', type: 'In-Person',   status: 'Pending'   },
  { candidate: 'Meera Iyer',   role: 'UI/UX Designer',     date: 'Aug 5, 2025',  time: '3:00 PM',  type: 'Phone',       status: 'Scheduled' },
  { candidate: 'Sanjay Das',   role: 'DevOps Engineer',    date: 'Aug 7, 2025',  time: '9:00 AM',  type: 'Video Call',  status: 'Pending'   },
]

const JOB_POSTINGS = [
  { id: 'JOB-001', title: 'Frontend Developer',  dept: 'Engineering',  applicants: 24, status: 'Active',   posted: 'Jul 15, 2025', deadline: 'Aug 15, 2025' },
  { id: 'JOB-002', title: 'Data Analyst',         dept: 'Analytics',    applicants: 18, status: 'Active',   posted: 'Jul 18, 2025', deadline: 'Aug 18, 2025' },
  { id: 'JOB-003', title: 'Backend Developer',    dept: 'Engineering',  applicants: 31, status: 'Active',   posted: 'Jul 20, 2025', deadline: 'Aug 20, 2025' },
  { id: 'JOB-004', title: 'UI/UX Designer',       dept: 'Design',       applicants: 12, status: 'Paused',   posted: 'Jul 10, 2025', deadline: 'Aug 10, 2025' },
  { id: 'JOB-005', title: 'DevOps Engineer',      dept: 'Operations',   applicants: 9,  status: 'Active',   posted: 'Jul 22, 2025', deadline: 'Aug 22, 2025' },
]

const ASSESSMENTS = [
  { candidate: 'Arjun Reddy',  type: 'Technical',      score: 92, duration: '45 min', date: 'Jul 24, 2025', status: 'Completed' },
  { candidate: 'Kavya Nair',   type: 'Aptitude',        score: 88, duration: '30 min', date: 'Jul 23, 2025', status: 'Completed' },
  { candidate: 'Rohan Joshi',  type: 'Technical',      score: 85, duration: '45 min', date: 'Jul 22, 2025', status: 'Completed' },
  { candidate: 'Meera Iyer',   type: 'Design Review',  score: 78, duration: '60 min', date: 'Jul 21, 2025', status: 'Completed' },
  { candidate: 'Sanjay Das',   type: 'Technical',      score: 70, duration: '45 min', date: 'Jul 20, 2025', status: 'In Review' },
  { candidate: 'Pooja Mehta',  type: 'Aptitude',        score: 62, duration: '30 min', date: 'Jul 19, 2025', status: 'Completed' },
]

const skillsData = [
  { skill: 'Technical',        A: 85, B: 72 },
  { skill: 'Communication',   A: 78, B: 68 },
  { skill: 'Problem Solving', A: 90, B: 75 },
  { skill: 'Leadership',      A: 65, B: 80 },
  { skill: 'Teamwork',        A: 82, B: 78 },
  { skill: 'Creativity',      A: 70, B: 85 },
]

const interviewData = [
  { week: 'Week 1', completed: 12, scheduled: 18 },
  { week: 'Week 2', completed: 15, scheduled: 14 },
  { week: 'Week 3', completed: 18, scheduled: 20 },
  { week: 'Week 4', completed: 22, scheduled: 16 },
]

const scoreDistribution = [
  { range: '90–100', count: 2 },
  { range: '80–89',  count: 3 },
  { range: '70–79',  count: 4 },
  { range: '60–69',  count: 2 },
  { range: '<60',    count: 1 },
]

function RecBadge({ rec }) {
  const map = { 'Highly Recommended': 'green', 'Recommended': 'blue', 'Needs Review': 'orange', 'Not Recommended': 'red', 'Consider': 'orange' }
  return <span className={`badge ${map[rec] || 'gray'}`}>{rec}</span>
}
function ScoreCell({ score }) {
  const s = Number(score) || 0
  const c = s >= 85 ? '#10b981' : s >= 70 ? '#f59e0b' : '#ef4444'
  return <span style={{ fontWeight: 700, color: c }}>{s}</span>
}
function RankMedal({ rank }) {
  const cls = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'default'
  return <div className={`rank-medal ${cls}`}>#{rank}</div>
}

function Toast({ msg, onClose }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 18px', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: 10, minWidth: 280, maxWidth: 400 }}>
          <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: 'var(--text-primary)', flex: 1 }}>{msg}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={15} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Behavioral & Visual Assessment panel ─────────────────────────────── */
/**
 * Renders the CV analysis result inline inside the detail modal.
 * Receives exact DB column values; converts 0-1 floats to % where appropriate.
 */
function CvAnalysisPanel({ cvData, cvLoading, cvError, interviewId, onRetrigger, retriggerBusy }) {
  // Helper: format a 0-1 float as a percentage string, or '—' if null
  const pct  = (v) => v != null ? `${Math.round(v * 100)}%` : '—'
  // Helper: format a 0-1 float as a 2-decimal score string
  const sc   = (v) => v != null ? v.toFixed(2) : '—'
  // Helper: format degrees
  const deg  = (v) => v != null ? `${Math.round(v)}°` : '—'

  const statusColor = {
    completed:  '#10b981',
    processing: '#f59e0b',
    pending:    '#f59e0b',
    error:      '#ef4444',
    failed:     '#ef4444',
  }

  const containerStyle = {
    marginBottom: 20,
    borderRadius: 10,
    border: '1px solid rgba(99,102,241,0.18)',
    background: 'rgba(99,102,241,0.04)',
    overflow: 'hidden',
  }
  const headerStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(99,102,241,0.12)',
    background: 'rgba(99,102,241,0.07)',
  }
  const sectionLabel = {
    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6,
  }
  const metricBox = {
    background: 'var(--bg-primary)', borderRadius: 8,
    padding: '10px 12px', border: '1px solid var(--border-light)',
  }
  const metricLabel = {
    fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4,
  }
  const metricValue = {
    fontSize: 18, fontWeight: 800, color: 'var(--text-primary)',
  }

  // Loading state
  if (cvLoading) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>Behavioral & Visual Assessment</span>
        </div>
        <div style={{ padding: 20, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          Loading behavioral analysis…
        </div>
      </div>
    )
  }

  // No data and no error — not yet triggered or still pending
  if (!cvData && !cvError) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>Behavioral & Visual Assessment</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b' }}>Not yet analyzed</span>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Video analysis has not been run yet or is still processing.
          </span>
          <button
            className="btn btn-outline btn-sm"
            disabled={retriggerBusy}
            onClick={() => onRetrigger(interviewId)}
          >
            {retriggerBusy ? 'Queuing…' : 'Run Analysis'}
          </button>
        </div>
      </div>
    )
  }

  // Error state
  if (cvError && !cvData) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>Behavioral & Visual Assessment</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444' }}>Error</span>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#ef4444' }}>{cvError}</span>
          <button
            className="btn btn-outline btn-sm"
            disabled={retriggerBusy}
            onClick={() => onRetrigger(interviewId)}
          >
            {retriggerBusy ? 'Queuing…' : 'Re-run Analysis'}
          </button>
        </div>
      </div>
    )
  }

  const a = cvData
  const statusKey = (a.status || '').toLowerCase()

  // Status is pending/processing — show status only, no scores yet
  if (statusKey === 'pending' || statusKey === 'processing') {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>Behavioral & Visual Assessment</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: statusColor[statusKey] || '#f59e0b' }}>
            {statusKey === 'processing' ? 'Processing…' : 'Pending…'}
          </span>
        </div>
        <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
          Video analysis is in progress. Refresh this panel in a moment to see results.
        </div>
      </div>
    )
  }

  // Error status from DB row
  if (statusKey === 'error' || statusKey === 'failed') {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>Behavioral & Visual Assessment</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>Failed</span>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#ef4444' }}>{a.error_message || 'Analysis failed.'}</span>
          <button
            className="btn btn-outline btn-sm"
            disabled={retriggerBusy}
            onClick={() => onRetrigger(interviewId)}
          >
            {retriggerBusy ? 'Queuing…' : 'Re-run Analysis'}
          </button>
        </div>
      </div>
    )
  }

  // Completed — render full results
  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>Behavioral & Visual Assessment</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {a.analyzed_at && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {new Date(a.analyzed_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 20 }}>Completed</span>
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Primary metrics — 4 columns */}
        <div style={{ ...sectionLabel, marginBottom: 8 }}>Primary Signals</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Engagement',    value: pct(a.engagement_estimate),  note: 'composite' },
            { label: 'Eye Contact',   value: a.eye_contact_pct != null ? `${Math.round(a.eye_contact_pct)}%` : '—', note: '% of face-frames' },
            { label: 'Attention',     value: pct(a.attention_score),       note: 'eye + posture' },
            { label: 'Confidence',    value: pct(a.confidence_indicator),  note: 'behavioral signal' },
          ].map(({ label, value, note }) => (
            <div key={label} style={metricBox}>
              <div style={metricLabel}>{label}</div>
              <div style={metricValue}>{value}</div>
              {note && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{note}</div>}
            </div>
          ))}
        </div>

        {/* Secondary metrics — 4 columns */}
        <div style={{ ...sectionLabel, marginBottom: 8 }}>Secondary Signals</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Head Movement', value: deg(a.head_movement_deg),      note: 'mean yaw+pitch' },
            { label: 'Facial Activity', value: sc(a.facial_activity),       note: 'temporal change' },
            { label: 'Facing Camera', value: pct(a.facing_camera_rate),     note: 'posture rate' },
            { label: 'Face Detected', value: pct(a.face_detection_rate),    note: 'of sampled frames' },
          ].map(({ label, value, note }) => (
            <div key={label} style={metricBox}>
              <div style={metricLabel}>{label}</div>
              <div style={{ ...metricValue, fontSize: 16 }}>{value}</div>
              {note && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{note}</div>}
            </div>
          ))}
        </div>

        {/* Affect levels — horizontal bar-style */}
        <div style={{ ...sectionLabel, marginBottom: 8 }}>Observable Affect Indicators</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          {[
            { label: 'Disquietment',    v: a.disquietment_level },
            { label: 'Fear',            v: a.fear_level },
            { label: 'Doubt / Confusion', v: a.doubt_confusion_level },
            { label: 'Disconnection',   v: a.disconnection_level },
          ].map(({ label, v }) => {
            const pctNum = v != null ? Math.round(v * 100) : null
            const barColor = pctNum != null && pctNum > 40 ? '#f59e0b' : '#6366f1'
            return (
              <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{pctNum != null ? `${pctNum}%` : '—'}</span>
                </div>
                {pctNum != null && (
                  <div style={{ height: 4, borderRadius: 4, background: 'var(--border-light)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, pctNum)}%`, borderRadius: 4, background: barColor, transition: 'width 0.5s ease' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Live Interview Compliance & Warnings */}
        {(a.warning_count != null || a.avg_face_visibility != null) && (
          <div style={{ marginTop: 12, marginBottom: 8, background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Live Interview Compliance
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: (a.warning_count || 0) === 0 ? '#10b981' : (a.warning_count || 0) >= 3 ? '#ef4444' : '#f59e0b',
                background: (a.warning_count || 0) === 0 ? 'rgba(16,185,129,0.1)' : (a.warning_count || 0) >= 3 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                padding: '2px 8px',
                borderRadius: 20,
              }}>
                Warnings: {a.warning_count ?? 0} / 3
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-primary)' }}>
              {a.avg_face_visibility != null && (
                <div>Avg Face Visibility: <strong>{Math.round(a.avg_face_visibility)}%</strong></div>
              )}
              {a.warning_count > 0 && (
                <div style={{ color: a.warning_count >= 3 ? '#ef4444' : '#f59e0b' }}>
                  {a.warning_count >= 4 ? 'Interview Terminated by Violation' : `${a.warning_count} recorded warning incident(s)`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Frame coverage footnote */}
        {a.frames_total != null && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
            Analyzed {a.frames_with_face ?? '?'} / {a.frames_total} sampled frames (1 FPS)
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Module 7 AI Assessment panel (recruiter view) ─────────────────────── */
function Module7Panel({ categoryScores }) {
  const cs  = categoryScores || {}
  const m7s = cs.module7_scores  || null
  const m7fb = cs.module7_feedback || null

  if (!m7s || m7s.overallScore == null) return null

  const ratingColor = (r) => {
    if (r === 'Excellent') return '#10b981'
    if (r === 'Good')      return '#6366f1'
    if (r === 'Average')   return '#f59e0b'
    return '#ef4444'
  }
  const catColor = (s) => {
    if (s == null) return 'var(--border)'
    if (s >= 80)   return '#10b981'
    if (s >= 60)   return '#f59e0b'
    return '#ef4444'
  }
  const catStr  = (s) => (s != null && typeof s === 'number') ? `${s}/100` : '—'
  const scoreC  = (s) => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444'

  const M7_CATS = [
    { key: 'communication',      label: 'Communication',       pct: '30%', value: m7s.communication?.score },
    { key: 'confidence',         label: 'Confidence',          pct: '25%', value: m7s.confidence?.score },
    { key: 'technicalRelevance', label: 'Technical Relevance', pct: '30%', value: m7s.technicalRelevance?.score },
    { key: 'professionalism',    label: 'Professionalism',     pct: '15%', value: m7s.professionalism?.score },
  ]

  // Radar chart data for Recharts
  const radarData = M7_CATS.map(c => ({ skill: c.label.split(' ')[0], score: c.value ?? 0 }))

  const containerStyle = {
    marginBottom: 20,
    borderRadius: 10,
    border: '1px solid rgba(99,102,241,0.18)',
    background: 'rgba(99,102,241,0.04)',
    overflow: 'hidden',
  }
  const headerStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(99,102,241,0.12)',
    background: 'rgba(99,102,241,0.07)',
  }

  return (
    <div style={containerStyle}>
      {/* Panel header */}
      <div style={headerStyle}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Brain size={14} /> Module 7 AI Assessment
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {m7s.scoringMeta?.hasCvData && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>CV-augmented</span>
          )}
          {m7s.performanceRating && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
              background: `${ratingColor(m7s.performanceRating)}18`,
              color: ratingColor(m7s.performanceRating),
              border: `1px solid ${ratingColor(m7s.performanceRating)}40`,
            }}>
              {m7s.performanceRating}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Overall score hero row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16,
          background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(99,102,241,0.03))',
          borderRadius: 8, padding: '12px 16px', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div style={{ textAlign: 'center', minWidth: 64 }}>
            <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, color: scoreC(m7s.overallScore) }}>
              {m7s.overallScore}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>/ 100</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 5 }}>Overall Performance Score</div>
            <div style={{ height: 7, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${m7s.overallScore}%`, background: scoreC(m7s.overallScore), borderRadius: 4, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
              Comm 30% · Conf 25% · Tech 30% · Prof 15%
            </div>
          </div>
        </div>

        {/* Two-column: category bars + radar chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14, alignItems: 'start' }}>
          {/* Category bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {M7_CATS.map(({ key, label, pct, value }) => (
              <div key={key} style={{ background: 'var(--bg-primary)', borderRadius: 7, padding: '8px 12px', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>{pct}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: catColor(value) }}>{catStr(value)}</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${value ?? 0}%`, background: catColor(value), borderRadius: 3, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Radar chart */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Category Radar</div>
            <ResponsiveContainer width="100%" height={160}>
              <RadarChart data={radarData} margin={{ top: 4, right: 10, bottom: 4, left: 10 }}>
                <PolarGrid stroke="rgba(99,102,241,0.18)" />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.22} />
                <Tooltip contentStyle={{ borderRadius: 7, fontSize: 11 }} formatter={(v) => [`${v}/100`]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Module 7 feedback — recruiter-relevant subset */}
        {m7fb ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Strengths */}
            {Array.isArray(m7fb.strengths) && m7fb.strengths.length > 0 && (
              <div style={{ background: 'var(--success-bg)', borderRadius: 7, padding: '10px 12px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={12} /> AI-Identified Strengths
                </div>
                <ul style={{ paddingLeft: 16, margin: 0, fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.6, listStyleType: 'disc' }}>
                  {m7fb.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {Array.isArray(m7fb.weaknesses) && m7fb.weaknesses.length > 0 && (
              <div style={{ background: 'var(--warning-bg)', borderRadius: 7, padding: '10px 12px', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Target size={12} /> Areas for Improvement
                </div>
                <ul style={{ paddingLeft: 16, margin: 0, fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.6, listStyleType: 'disc' }}>
                  {m7fb.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            {/* Improvement suggestions */}
            {Array.isArray(m7fb.improvementSuggestions) && m7fb.improvementSuggestions.length > 0 && (
              <div style={{ background: 'var(--bg-primary)', borderRadius: 7, padding: '10px 12px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Zap size={12} /> Improvement Suggestions
                </div>
                <ol style={{ paddingLeft: 16, margin: 0, fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  {m7fb.improvementSuggestions.map((s, i) => <li key={i} style={{ marginBottom: 2 }}>{s}</li>)}
                </ol>
              </div>
            )}

          </div>
        ) : (
          <div style={{ padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 7, border: '1px dashed var(--border)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Brain size={13} style={{ flexShrink: 0 }} />
            AI narrative feedback unavailable. Scores above reflect the formal assessment.
          </div>
        )}
      </div>
    </div>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-xl)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  )
}

function RecruiterDashboard() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')
  const [search, setSearch]       = useState('')
  const [sortField, setSortField] = useState('rank')
  const [sortDir, setSortDir]     = useState('asc')
  const [page, setPage]           = useState(1)
  const [toast, setToast]         = useState('')
  const [viewCandidate, setViewCandidate]   = useState(null)
  const [scheduleOpen, setScheduleOpen]     = useState(false)
  const [messageCandidate, setMessageCandidate] = useState(null)
  const [scheduleForm, setScheduleForm] = useState({ candidate: '', date: '', time: '', type: 'Video Call', notes: '' })
  const [msgText, setMsgText] = useState('')
  const PAGE_SIZE = 5

  // Live AI interview results from backend
  const [aiResults, setAiResults]       = useState([])
  const [aiResultsLoading, setAiResultsLoading] = useState(false)
  const [aiResultsError,   setAiResultsError]   = useState('')
  const [detailOpen, setDetailOpen]     = useState(null)  // interview detail modal
  const [detail,     setDetail]         = useState(null)  // { interview, questions, recordings }
  const [detailLoading, setDetailLoading] = useState(false)

  // CV analysis state — loaded when a detail modal opens
  const [cvData,    setCvData]    = useState(null)   // analysis object or null
  const [cvLoading, setCvLoading] = useState(false)
  const [cvError,   setCvError]   = useState('')
  const [cvTriggerBusy, setCvTriggerBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadResults() {
      setAiResultsLoading(true)
      setAiResultsError('')
      try {
        const data = await recordingApi.getResults()
        if (!cancelled) setAiResults(data.results || [])
      } catch (e) {
        if (!cancelled) setAiResultsError(e.message)
      } finally {
        if (!cancelled) setAiResultsLoading(false)
      }
    }
    loadResults()
    return () => { cancelled = true }
  }, [])

  async function openDetail(interviewId) {
    setDetailOpen(interviewId)
    setDetailLoading(true)
    setDetail(null)
    // Reset CV state for new modal
    setCvData(null)
    setCvError('')
    setCvLoading(true)
    try {
      // Fetch interview detail and CV result in parallel
      const [detailData, cvResult] = await Promise.allSettled([
        recordingApi.getDetail(interviewId),
        cvApi.getResult(interviewId),
      ])
      if (detailData.status === 'fulfilled') setDetail(detailData.value)
      else setDetail({ error: detailData.reason?.message || 'Failed to load' })
      if (cvResult.status === 'fulfilled' && cvResult.value?.analysis) {
        setCvData(cvResult.value.analysis)
      } else {
        // 404 means not yet triggered / still pending — not an error worth showing
        const msg = cvResult.reason?.message || ''
        if (!msg.includes('not yet available') && !msg.includes('404')) {
          setCvError(msg)
        }
      }
    } finally {
      setDetailLoading(false)
      setCvLoading(false)
    }
  }

  async function handleCvRetrigger(interviewId) {
    setCvTriggerBusy(true)
    setCvError('')
    try {
      await cvApi.trigger(interviewId)
      showToast('Video re-analysis queued. Check back in a minute.')
      setCvData(null)   // clear stale data; recruiter can refresh to see result
    } catch (e) {
      setCvError(e.message)
      showToast('Re-trigger failed: ' + e.message)
    } finally {
      setCvTriggerBusy(false)
    }
  }

  // Real candidates mapped from actual AI interview database results
  const realCandidates = useMemo(() => {
    return (aiResults || []).map((r, i) => {
      const score = r.score != null ? Number(r.score) : 0
      const rec = r.hire_recommendation || (score >= 85 ? 'Highly Recommended' : score >= 70 ? 'Recommended' : score >= 50 ? 'Needs Review' : 'Not Recommended')
      return {
        id:                r.interview_id,
        interviewId:       r.interview_id,
        rank:              i + 1,
        name:              r.candidate_name || 'Candidate',
        email:             r.candidate_email || '—',
        role:              r.role || 'General',
        interviewType:     r.interview_type || 'Mixed',
        difficulty:        r.difficulty || 'Medium',
        resumeScore:       score,
        interviewScore:    score,
        aiScore:           score,
        finalScore:        score,
        rec:               rec,
        date:              r.completed_at ? new Date(r.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
        duration:          r.duration || 0,
        questionsAnswered: r.questions_answered || 0,
        recordingCount:    Number(r.recording_count) || 0,
        recordingId:       r.recording_id,
        overallFeedback:   r.overall_feedback,
        strengths:         r.strengths,
        weaknesses:        r.weaknesses,
        categoryScores:    r.category_scores,
      }
    })
  }, [aiResults])

  const totalCandidatesCount = useMemo(() => {
    return new Set(aiResults.map(r => r.candidate_email || r.candidate_name)).size
  }, [aiResults])

  const avgScoreVal = useMemo(() => {
    if (aiResults.length === 0) return '—'
    const total = aiResults.reduce((sum, r) => sum + (Number(r.score) || 0), 0)
    return `${(total / aiResults.length).toFixed(1)}/100`
  }, [aiResults])

  const stats = useMemo(() => [
    { label: 'Total Candidates', value: String(totalCandidatesCount), trend: `${totalCandidatesCount} active`, up: true,  icon: <Users size={22} />,    color: 'purple' },
    { label: 'Completed Interviews', value: String(aiResults.length), trend: `${aiResults.length} total`, up: true,  icon: <Calendar size={22} />,  color: 'green'  },
    { label: 'Average AI Score', value: avgScoreVal, trend: aiResults.length > 0 ? 'AI Evaluated' : 'No data', up: true,  icon: <Star size={22} />,      color: 'orange' },
    { label: 'Open Positions',   value: '5',     trend: 'Active', up: true,  icon: <Briefcase size={22} />, color: 'blue'   },
  ], [totalCandidatesCount, aiResults.length, avgScoreVal])

  const activities = useMemo(() => {
    if (aiResults.length === 0) {
      return [{ text: 'No AI interviews completed yet', color: 'blue', time: 'Awaiting candidates' }]
    }
    return aiResults.slice(0, 5).map(r => ({
      text: `AI Interview: ${r.candidate_name || 'Candidate'} — ${r.role} (${r.score != null ? `${r.score}/100` : 'Evaluated'})`,
      color: (r.score || 0) >= 80 ? 'green' : (r.score || 0) >= 60 ? 'blue' : 'orange',
      time: r.completed_at ? new Date(r.completed_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Recently',
    }))
  }, [aiResults])

  const skillsData = useMemo(() => {
    const categories = ['Technical', 'Communication', 'Problem Solving', 'Confidence', 'Grammar']
    if (aiResults.length === 0) {
      return categories.map(cat => ({ skill: cat, A: 0, B: 0 }))
    }
    const catSums = { technical: 0, communication: 0, problem_solving: 0, confidence: 0, grammar: 0 }
    let count = 0
    const topCandidate = aiResults[0]
    aiResults.forEach(r => {
      if (r.category_scores && typeof r.category_scores === 'object') {
        count++
        catSums.technical += Number(r.category_scores.technical) || Number(r.score) || 0
        catSums.communication += Number(r.category_scores.communication) || Number(r.score) || 0
        catSums.problem_solving += Number(r.category_scores.problem_solving) || Number(r.score) || 0
        catSums.confidence += Number(r.category_scores.confidence) || Number(r.score) || 0
        catSums.grammar += Number(r.category_scores.grammar) || Number(r.score) || 0
      }
    })
    const div = count || 1
    return [
      { skill: 'Technical', A: Number(topCandidate?.category_scores?.technical) || Number(topCandidate?.score) || 0, B: Math.round(catSums.technical / div) },
      { skill: 'Communication', A: Number(topCandidate?.category_scores?.communication) || Number(topCandidate?.score) || 0, B: Math.round(catSums.communication / div) },
      { skill: 'Problem Solving', A: Number(topCandidate?.category_scores?.problem_solving) || Number(topCandidate?.score) || 0, B: Math.round(catSums.problem_solving / div) },
      { skill: 'Confidence', A: Number(topCandidate?.category_scores?.confidence) || Number(topCandidate?.score) || 0, B: Math.round(catSums.confidence / div) },
      { skill: 'Grammar', A: Number(topCandidate?.category_scores?.grammar) || Number(topCandidate?.score) || 0, B: Math.round(catSums.grammar / div) },
    ]
  }, [aiResults])

  const scoreDistribution = useMemo(() => {
    const bins = { '90–100': 0, '80–89': 0, '70–79': 0, '60–69': 0, '<60': 0 }
    aiResults.forEach(r => {
      const s = Number(r.score) || 0
      if (s >= 90) bins['90–100']++
      else if (s >= 80) bins['80–89']++
      else if (s >= 70) bins['70–79']++
      else if (s >= 60) bins['60–69']++
      else bins['<60']++
    })
    return Object.entries(bins).map(([range, count]) => ({ range, count }))
  }, [aiResults])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }
  const handleSectionChange = (section) => { setActiveSection(section); setSearch(''); setPage(1) }
  const setSchField = (f) => (e) => setScheduleForm(p => ({ ...p, [f]: e.target.value }))

  const handleExport = () => {
    if (realCandidates.length === 0) {
      showToast('No interview candidates to export')
      return
    }
    const headers = ['Rank','Name','Email','Role','Score','Recommendation','Date']
    const rows = realCandidates.map(c => [c.rank, c.name, c.email, c.role, c.finalScore, c.rec, c.date])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'candidate_ai_rankings.csv'; a.click()
    URL.revokeObjectURL(url); showToast('Rankings exported as CSV')
  }

  const handleDownloadReport = (c) => {
    const text = `AI INTERVIEW EVALUATION REPORT\n\nCandidate: ${c.name}\nEmail: ${c.email}\nRole: ${c.role}\nInterview Date: ${c.date}\nOverall AI Score: ${c.finalScore}/100\nHiring Recommendation: ${c.rec}\n\nAI Summary:\n${c.overallFeedback || 'Assessment completed successfully.'}\n\nStrengths:\n${Array.isArray(c.strengths) ? c.strengths.map(s => `• ${s}`).join('\n') : '• Solid technical fundamentals'}\n\nAreas for Improvement:\n${Array.isArray(c.weaknesses) ? c.weaknesses.map(w => `• ${w}`).join('\n') : '• None noted'}`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${c.name.replace(/\s+/g, '_')}_ai_report.txt`; a.click()
    URL.revokeObjectURL(url); showToast(`Report downloaded for ${c.name}`)
  }

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp size={12} style={{ opacity: 0.3 }} />
    return sortDir === 'asc' ? <ChevronUp size={12} style={{ color: 'var(--primary)' }} /> : <ChevronDown size={12} style={{ color: 'var(--primary)' }} />
  }

  const filtered = useMemo(() => realCandidates
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.role.toLowerCase().includes(search.toLowerCase()) || c.rec.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const va = a[sortField], vb = b[sortField]
      if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    }),
  [realCandidates, search, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const sidebarLinks = [
    {
      title: 'Dashboard',
      items: [
        { icon: <BarChart3 size={18} />, label: 'Overview',  section: 'overview'  },
        { icon: <Activity size={18} />,  label: 'Analytics', section: 'analytics' },
        { icon: <FileText size={18} />,  label: 'Reports',   section: 'reports'   },
      ],
    },
    {
      title: 'Recruitment',
      items: [
        { icon: <Users size={18} />,    label: 'Candidates',   section: 'candidates'   },
        { icon: <Calendar size={18} />, label: 'Interviews',   section: 'interviews'   },
        { icon: <Briefcase size={18} />, label: 'Job Postings', section: 'job-postings' },
      ],
    },
    {
      title: 'AI Tools',
      items: [
        { icon: <Award size={18} />, label: 'AI Ranking',    section: 'ai-ranking'   },
        { icon: <Video size={18} />, label: 'AI Results',    section: 'ai-results'   },
        { icon: <Video size={18} />, label: 'Mock Interview', onClick: () => navigate('/mock-interview') },
        { icon: <Star size={18} />,  label: 'Assessments',   section: 'assessments'  },
      ],
    },
  ]

  const renderRankingTable = () => (
    <>
      <div className="table-search-wrapper">
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input className="table-search-bar" style={{ paddingLeft: 32 }} placeholder="Search candidates..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge purple">{filtered.length} candidates</span>
          <button className="btn btn-outline btn-sm" onClick={handleExport}><Download size={13} /> Export CSV</button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead><tr>
            <th>Rank</th>
            <th className="sortable-th" onClick={() => handleSort('name')}><div className="th-inner">Candidate <SortIcon field="name" /></div></th>
            <th>Role</th>
            <th className="sortable-th" onClick={() => handleSort('resumeScore')}><div className="th-inner">Resume <SortIcon field="resumeScore" /></div></th>
            <th className="sortable-th" onClick={() => handleSort('interviewScore')}><div className="th-inner">Interview <SortIcon field="interviewScore" /></div></th>
            <th className="sortable-th" onClick={() => handleSort('aiScore')}><div className="th-inner">AI Score <SortIcon field="aiScore" /></div></th>
            <th className="sortable-th" onClick={() => handleSort('finalScore')}><div className="th-inner">Final <SortIcon field="finalScore" /></div></th>
            <th className="sortable-th" onClick={() => handleSort('rec')}><div className="th-inner">Recommendation <SortIcon field="rec" /></div></th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            {paginated.length === 0
              ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No candidates found</td></tr>
              : paginated.map((c, i) => (
                <tr key={i}>
                  <td><RankMedal rank={c.rank} /></td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="user-avatar">{c.name.charAt(0)}</div><span style={{ fontWeight: 500 }}>{c.name}</span></div></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.role}</td>
                  <td><ScoreCell score={c.resumeScore} /></td>
                  <td><ScoreCell score={c.interviewScore} /></td>
                  <td><ScoreCell score={c.aiScore} /></td>
                  <td><span style={{ fontWeight: 800, fontSize: 15, color: c.finalScore >= 85 ? '#10b981' : c.finalScore >= 70 ? '#f59e0b' : '#ef4444' }}>{c.finalScore.toFixed(1)}</span></td>
                  <td><RecBadge rec={c.rec} /></td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-sm" title="View Profile" onClick={() => setViewCandidate(c)}><Eye size={14} /></button>
                      <button className="btn btn-ghost btn-sm" title="Download Report" onClick={() => handleDownloadReport(c)}><Download size={14} /></button>
                      <button className="btn btn-ghost btn-sm" title="Send Message" onClick={() => setMessageCandidate(c)}><MessageSquare size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span className="pagination-info">Showing {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}</span>
        <div className="pagination-btns">
          <button className={`page-btn ${page===1?'disabled':''}`} onClick={() => setPage(p => Math.max(1,p-1))}>← Prev</button>
          {Array.from({ length: totalPages }, (_, i) => <button key={i} className={`page-btn ${page===i+1?'active':''}`} onClick={() => setPage(i+1)}>{i+1}</button>)}
          <button className={`page-btn ${page===totalPages?'disabled':''}`} onClick={() => setPage(p => Math.min(totalPages,p+1))}>Next →</button>
        </div>
      </div>
    </>
  )

  // ── Helpers used by the detail modal (hoisted to component scope so the
  //    modal can be rendered from ANY section, not only 'ai-results') ────
  const scoreColor = (s) => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444'
  const fmtDur = (s) => { if (!s) return '—'; const m = Math.floor(s/60); const ss = s%60; return `${m}m ${ss}s` }
  const fmtSA = (val, suffix = '') => {
    if (val === null || val === undefined) return 'Not available'
    if (val === 'insufficient_audio' || val === 'insufficient_data') return 'Insufficient audio'
    if (typeof val === 'number') return `${val}${suffix}`
    return String(val)
  }
  const renderCommBreakdown = (categoryScores) => {
    if (!categoryScores) return null
    const cs = categoryScores
    const sas = cs.speech_analysis_summary
    const rows = [
      ['Overall Communication',   cs.communication     != null ? `${cs.communication}/100`     : '—'],
      ['Technical Relevance',      cs.technical         != null ? `${cs.technical}/100`         : '—'],
      ['Confidence',               cs.confidence        != null ? `${cs.confidence}/100`        : '—'],
      ['Professionalism / Grammar',cs.professionalism   != null ? `${cs.professionalism}/100`   : (cs.grammar != null ? `${cs.grammar}/100` : '—')],
    ]
    const speechRows = sas ? [
      ['Avg Speaking Pace',    sas.avg_words_per_minute    != null ? `${sas.avg_words_per_minute} WPM (${sas.dominant_pace || '—'})` : 'Not available'],
      ['Avg Grammar Score',    sas.avg_grammar_score       != null ? `${sas.avg_grammar_score}/100` : 'Not available'],
      ['Avg Filler Rate',      sas.avg_filler_rate         != null ? `${sas.avg_filler_rate}%`      : 'Not available'],
      ['Avg Comm Score (Speech)', sas.avg_communication_score != null ? `${sas.avg_communication_score}/100` : 'Not available'],
      ['Answers Analysed',     `${sas.answers_analysed ?? 0} / ${sas.total_answers ?? '?'}`],
    ] : null
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--text-primary)' }}>Score Breakdown</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {rows.map(([label, val]) => (
            <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{val}</div>
            </div>
          ))}
        </div>
        {speechRows && (
          <>
            <div style={{ fontWeight: 700, fontSize: 13, margin: '14px 0 8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={14} style={{ color: 'var(--primary)' }} /> Speech & Communication Analysis
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(aggregated from real audio)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {speechRows.map(([label, val]) => (
                <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{val}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }
  const renderQuestionSpeech = (sa) => {
    if (!sa) return null
    const metrics = [
      ['WPM',        fmtSA(sa.words_per_minute, '') + (sa.pace_label && sa.pace_label !== 'insufficient_data' ? ` (${sa.pace_label})` : '')],
      ['Fillers',    sa.filler_count != null ? `${sa.filler_count} (${fmtSA(sa.filler_rate, '%')})` : 'Not available'],
      ['Grammar',    fmtSA(sa.grammar_score, '/100')],
      ['Clarity',    fmtSA(sa.speech_clarity_score, '/100')],
      ['Completeness', fmtSA(sa.response_completeness_score, '/100')],
      ['Pronunciation', sa.pronunciation_score === 'insufficient_audio' ? 'Insufficient audio' : fmtSA(sa.pronunciation_score, '/100')],
    ]
    return (
      <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(99,102,241,0.06)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Speech Analysis
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {metrics.map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: val === 'Not available' || val === 'Insufficient audio' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{val}</div>
            </div>
          ))}
        </div>
        {sa.communication_score != null && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
            Communication score: <strong style={{ color: scoreColor(sa.communication_score) }}>{sa.communication_score}/100</strong>
            {sa.intelligibility_note && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>({sa.intelligibility_note})</span>
            )}
          </div>
        )}
        {Array.isArray(sa.strengths) && sa.strengths.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 11, color: '#10b981' }}>✓ {sa.strengths.join(' · ')}</div>
        )}
        {Array.isArray(sa.weaknesses) && sa.weaknesses.length > 0 && (
          <div style={{ fontSize: 11, color: '#f59e0b' }}>⚠ {sa.weaknesses.join(' · ')}</div>
        )}
      </div>
    )
  }

  const renderSection = () => {
    switch (activeSection) {

      case 'overview':
        return (
          <>
            <div className="stats-row">
              {stats.map((s, i) => (
                <motion.div key={i} className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <div className={`stat-icon ${s.color}`}>{s.icon}</div>
                  <div className="stat-details"><h3>{s.value}</h3><p>{s.label}</p>
                    <span className={`stat-trend ${s.up ? 'up' : 'down'}`}>{s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {s.trend}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="dashboard-grid">
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <div className="card-header"><h2>Candidate Skills Radar</h2><div style={{ display: 'flex', gap: 8 }}><span className="badge purple">Top Candidate</span><span className="badge blue">Average</span></div></div>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={skillsData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Top Candidate" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                    <Radar name="Average"       dataKey="B" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.12} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
                <div className="card-header"><h2>Weekly Interviews</h2><span className="badge green">↑ On Track</span></div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={interviewData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} name="Completed" />
                    <Line type="monotone" dataKey="scheduled" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} name="Scheduled" strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.49 }}>
                <div className="card-header"><h2>Recent Activity</h2></div>
                <div className="activity-list">
                  {activities.map((a, i) => (
                    <div key={i} className="activity-item">
                      <div className={`activity-dot ${a.color}`} />
                      <div className="activity-content"><div className="activity-text">{a.text}</div><div className="activity-time">{a.time}</div></div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.56 }}>
                <div className="card-header"><h2>Quick Actions</h2></div>
                <div className="quick-actions-grid">
                  <button className="quick-action-btn" onClick={() => setScheduleOpen(true)}><Calendar size={18} /> Schedule Interview</button>
                  <button className="quick-action-btn" onClick={() => handleSectionChange('candidates')}><Users size={18} /> View All Candidates</button>
                  <button className="quick-action-btn" onClick={handleExport}><FileText size={18} /> Generate Report</button>
                  <button className="quick-action-btn" onClick={() => navigate('/mock-interview')}><Video size={18} /> Start Live Session</button>
                </div>
              </motion.div>
            </div>
            <motion.div className="card" style={{ marginTop: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.63 }}>
              <div className="card-header"><h2>AI Applicant Ranking</h2></div>
              {renderRankingTable()}
            </motion.div>
          </>
        )

      case 'analytics':
        return (
          <>
            <div className="stats-row" style={{ marginBottom: 20 }}>
              {stats.map((s, i) => (
                <motion.div key={i} className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <div className={`stat-icon ${s.color}`}>{s.icon}</div>
                  <div className="stat-details"><h3>{s.value}</h3><p>{s.label}</p>
                    <span className={`stat-trend ${s.up ? 'up' : 'down'}`}>{s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {s.trend}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="dashboard-grid">
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="card-header"><h2>Candidate Skills Radar</h2><div style={{ display: 'flex', gap: 8 }}><span className="badge purple">Top Candidate</span><span className="badge blue">Average</span></div></div>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={skillsData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Top Candidate" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                    <Radar name="Average"       dataKey="B" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.12} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header"><h2>Weekly Interview Trend</h2></div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={interviewData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} name="Completed" />
                    <Line type="monotone" dataKey="scheduled" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} name="Scheduled" strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
              <motion.div className="card full-width" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="card-header"><h2>Score Distribution</h2><span className="badge gray">All Candidates</span></div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={scoreDistribution} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} name="Candidates" />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </>
        )

      case 'reports':
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <div><h2>Candidate Reports</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Assessment reports for all completed AI interviews</p></div>
              <button className="btn btn-outline btn-sm" onClick={handleExport}><Download size={13} /> Export All</button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead><tr>
                  <th>Candidate</th><th>Role</th><th>AI Score</th><th>Date</th><th>Recommendation</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {realCandidates.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No completed candidate interview reports yet.</td></tr>
                  ) : realCandidates.map((c, i) => (
                    <tr key={i}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="user-avatar">{c.name.charAt(0)}</div><div><span style={{ fontWeight: 500 }}>{c.name}</span><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div></div></div></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.role}</td>
                      <td><ScoreCell score={c.finalScore} /></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.date}</td>
                      <td><RecBadge rec={c.rec} /></td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-outline btn-sm" onClick={() => openDetail(c.interviewId)}><Eye size={13} /> View</button>
                          <button className="btn btn-primary btn-sm" onClick={() => handleDownloadReport(c)}><Download size={13} /> Download</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )

      case 'candidates':
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header"><h2>AI Applicant Ranking</h2><span className="badge purple">Auto-ranked by AI</span></div>
            {renderRankingTable()}
          </motion.div>
        )

      case 'interviews':
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <div><h2>Interview Schedule</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Upcoming and scheduled candidate sessions</p></div>
              <button className="btn btn-primary btn-sm" onClick={() => setScheduleOpen(true)}><Plus size={14} /> Schedule New</button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead><tr>
                  <th>Candidate</th><th>Role</th><th>Date</th><th>Time</th><th>Type</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {SCHEDULED_INTERVIEWS.map((iv, i) => (
                    <tr key={i}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="user-avatar">{iv.candidate.charAt(0)}</div><span style={{ fontWeight: 500 }}>{iv.candidate}</span></div></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{iv.role}</td>
                      <td style={{ fontSize: 13 }}>{iv.date}</td>
                      <td style={{ fontSize: 13 }}>{iv.time}</td>
                      <td><span className="badge gray" style={{ fontSize: 11 }}>{iv.type}</span></td>
                      <td><span className={`badge ${iv.status === 'Confirmed' ? 'green' : iv.status === 'Pending' ? 'orange' : 'blue'}`}>{iv.status}</span></td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-outline btn-sm" onClick={() => showToast(`Interview details: ${iv.candidate} on ${iv.date} at ${iv.time}`)}><Eye size={13} /> View</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => {
                            const c = realCandidates.find(x => x.name === iv.candidate) || { name: iv.candidate, role: iv.role }
                            setMessageCandidate(c)
                          }}><MessageSquare size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )

      case 'job-postings':
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <div><h2>Job Postings</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{JOB_POSTINGS.filter(j => j.status === 'Active').length} active · {JOB_POSTINGS.length} total</p></div>
              <button className="btn btn-primary btn-sm" onClick={() => showToast('Create job posting: feature coming soon')}><Plus size={14} /> New Posting</button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead><tr>
                  <th>Job ID</th><th>Title</th><th>Department</th><th>Applicants</th><th>Posted</th><th>Deadline</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {JOB_POSTINGS.map((j, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{j.id}</td>
                      <td style={{ fontWeight: 500 }}>{j.title}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{j.dept}</td>
                      <td><span className="badge blue" style={{ fontSize: 12 }}>{j.applicants}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{j.posted}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{j.deadline}</td>
                      <td><span className={`badge ${j.status === 'Active' ? 'green' : 'orange'}`}>{j.status}</span></td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-outline btn-sm" onClick={() => showToast(`Viewing applicants for: ${j.title}`)}><Eye size={13} /> View</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => showToast(`${j.title} posting ${j.status === 'Active' ? 'paused' : 'activated'}`)}>
                            {j.status === 'Active' ? 'Pause' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )

      case 'ai-ranking':
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <div><h2>AI Applicant Ranking</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Automatically ranked by composite AI score</p></div>
            </div>
            {renderRankingTable()}
          </motion.div>
        )

      case 'assessments':
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <div><h2>Candidate Assessments</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>AI-powered technical and aptitude assessments</p></div>
              <span className="badge green">{realCandidates.length} Completed</span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead><tr>
                  <th>Candidate</th><th>Role</th><th>Type</th><th>Score</th><th>Date</th><th>Recommendation</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {realCandidates.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No candidate assessments completed yet.</td></tr>
                  ) : realCandidates.map((a, i) => (
                    <tr key={i}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="user-avatar">{a.name.charAt(0)}</div><span style={{ fontWeight: 500 }}>{a.name}</span></div></td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{a.role}</td>
                      <td><span className="badge gray" style={{ fontSize: 11 }}>{a.interviewType}</span></td>
                      <td><span style={{ fontWeight: 700, color: a.finalScore >= 85 ? '#10b981' : a.finalScore >= 70 ? '#f59e0b' : '#ef4444' }}>{a.finalScore}/100</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.date}</td>
                      <td><RecBadge rec={a.rec} /></td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-outline btn-sm" onClick={() => openDetail(a.interviewId)}><Eye size={13} /> View</button>
                          <button className="btn btn-primary btn-sm" onClick={() => handleDownloadReport(a)}><Download size={13} /> Report</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )

    case 'ai-results': {

        return (
          <>
            <div className="card">
              <div className="card-header">
                <h2>AI Interview Results</h2>
                <span className="badge green">{aiResults.length} completed</span>
              </div>
              {aiResultsLoading && <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading results…</div>}
              {aiResultsError  && <div style={{ padding: 16, color: '#ef4444', fontSize: 13 }}>Error: {aiResultsError}</div>}
              {!aiResultsLoading && !aiResultsError && aiResults.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No completed AI interviews yet. Candidates complete mock interviews from the Student Dashboard.</div>
              )}
              {aiResults.length > 0 && (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead><tr>
                      <th>Candidate</th>
                      <th>Role</th>
                      <th>Type</th>
                      <th>Score</th>
                      <th>Duration</th>
                      <th>Completed</th>
                      <th>Actions</th>
                    </tr></thead>
                    <tbody>
                      {aiResults.map((r, i) => (
                        <tr key={r.interview_id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="user-avatar">{(r.candidate_name || '?').charAt(0).toUpperCase()}</div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.candidate_name || '—'}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.candidate_email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.role}</td>
                          <td><span className="badge purple" style={{ fontSize: 11 }}>{r.interview_type}</span></td>
                          <td>
                            {r.score != null
                              ? <span style={{ fontWeight: 800, fontSize: 15, color: scoreColor(r.score) }}>{r.score}/100</span>
                              : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDur(r.duration)}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {r.completed_at ? new Date(r.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td>
                            <button className="btn btn-ghost btn-sm" title="View Detail" onClick={() => openDetail(r.interview_id)}>
                              <Eye size={14} /> Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Detail modal is rendered at top-level return so it works from any section */}
          </>

        )
      }

    default:
      return null
    }
  }

  // ── Detail modal — rendered at top-level so it's available from ANY section ──
  // Triggered by openDetail(interviewId) which is called by View buttons in
  // both the 'reports' table (line ~879) and the 'ai-results' table (line ~1174).
  const detailModal = detailOpen && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && setDetailOpen(null)}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 780, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>AI Interview Detail & Evaluation</h2>
          <button onClick={() => setDetailOpen(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>
        </div>
        {detailLoading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading interview evaluation…</div>}
        {detail?.error && <div style={{ color: '#ef4444', fontSize: 13 }}>Error: {detail.error}</div>}
        {detail && !detail.error && (
          <>
            {/* Header info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                ['Candidate', detail.interview.candidateName],
                ['Email',     detail.interview.candidateEmail],
                ['Role',      detail.interview.role],
                ['Type',      detail.interview.interviewType],
                ['Difficulty',detail.interview.difficulty],
                ['Score',     detail.interview.score != null ? `${detail.interview.score}/100` : '—'],
                ['Duration',  fmtDur(detail.interview.duration)],
                ['Questions', `${detail.interview.questionsAnswered} / ${detail.interview.questionCount} answered`],
                ['Recommendation', detail.interview.hireRecommendation || 'Consider'],
              ].map(([k,v]) => (
                <div key={k} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Score + Communication Breakdown (legacy LLM evaluation) */}
            {renderCommBreakdown(detail.interview.categoryScores)}

            {/* Module 7 AI Assessment */}
            <Module7Panel categoryScores={detail.interview.categoryScores} />

            {/* Video Player */}
            {detail.recordings && detail.recordings.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: 'var(--text-primary)', display: 'flex' }}>🎥 Interview Recording</div>
                          <div style={{ background: '#0f172a', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <video
                  src={recordingApi.getStreamUrl(detail.recordings[0].id)}
                  controls
                  playsInline
                  style={{ width: '100%', maxHeight: 320, display: 'block' }}
                />
              </div>
            </div>
            )}

            {/* Behavioral & Visual Assessment (CV Analysis) — Module 6 */}
            <CvAnalysisPanel
              cvData={cvData}
              cvLoading={cvLoading}
              cvError={cvError}
              interviewId={detailOpen}
              onRetrigger={handleCvRetrigger}
              retriggerBusy={cvTriggerBusy}
            />

            {/* Overall AI Feedback */}
            {detail.interview.overallFeedback && (
              <div style={{ background: 'var(--primary-bg)', borderRadius: 8, padding: 14, marginBottom: 16, border: '1px solid rgba(99,102,241,0.2)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)', marginBottom: 4 }}>AI Evaluation Summary</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{detail.interview.overallFeedback}</div>
              </div>
            )}

            {/* Strengths & Weaknesses */}
            {((detail.interview.strengths && detail.interview.strengths.length > 0) || (detail.interview.weaknesses && detail.interview.weaknesses.length > 0)) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {detail.interview.strengths && Array.isArray(detail.interview.strengths) && detail.interview.strengths.length > 0 && (
                  <div style={{ background: 'var(--success-bg)', borderRadius: 8, padding: 12, border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', marginBottom: 6 }}>Key Strengths</div>
                    <ul style={{ paddingLeft: 16, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, listStyleType: 'disc' }}>
                      {detail.interview.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {detail.interview.weaknesses && Array.isArray(detail.interview.weaknesses) && detail.interview.weaknesses.length > 0 && (
                  <div style={{ background: 'var(--warning-bg)', borderRadius: 8, padding: 12, border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning)', marginBottom: 6 }}>Areas for Improvement</div>
                    <ul style={{ paddingLeft: 16, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, listStyleType: 'disc' }}>
                      {detail.interview.weaknesses.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Recommendations */}
            {detail.interview.recommendations && Array.isArray(detail.interview.recommendations) && detail.interview.recommendations.length > 0 && (
              <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 12, marginBottom: 16, border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 6 }}>Recommendations</div>
                <ul style={{ paddingLeft: 16, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, listStyleType: 'disc' }}>
                  {detail.interview.recommendations.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per-question scores + speech analysis */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--text-primary)' }}>Per-Question Results & Transcripts</div>
              {detail.questions.map((q, qi) => (
                <div key={q.id} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '12px 16px', marginBottom: 10, border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Q{qi + 1} · {q.category || 'General'}</span>
                    {q.score != null && <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(q.score) }}>{q.score}/100</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.5 }}>{q.question}</div>
                  {q.answer ? (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>" {q.answer}"</div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#ef4444' }}>No answer recorded</div>
                  )}
                  {q.feedback && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5, borderTop: '1px solid var(--border-light)', paddingTop: 6 }}>{q.feedback}</div>
                  )}
                  {renderQuestionSpeech(q.speechAnalysis)}
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  )

  return (
    <DashboardLayout
      title="Recruiter Dashboard" role="Senior Recruiter" userName="HR Manager"
      sidebarLinks={sidebarLinks} activeSection={activeSection} onSectionChange={handleSectionChange}
    >
      <Toast msg={toast} onClose={() => setToast('')} />

      {/* Detail modal — always mounted so View works from any section (Reports, AI Results, etc.) */}
      {detailModal}

      {viewCandidate && (
        <Modal title="Candidate Profile" onClose={() => setViewCandidate(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>{viewCandidate.name.charAt(0)}</div>
            <div><div style={{ fontWeight: 700, fontSize: 16 }}>{viewCandidate.name}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{viewCandidate.role}</div></div>
            <div style={{ marginLeft: 'auto' }}><RankMedal rank={viewCandidate.rank} /></div>
          </div>
          {[['Resume Score', `${viewCandidate.resumeScore}/100`],['Interview Score', `${viewCandidate.interviewScore}/100`],['AI Score', `${viewCandidate.aiScore}/100`],['Final Score', `${viewCandidate.finalScore.toFixed(1)}/100`],['Recommendation', viewCandidate.rec],['Report Date', viewCandidate.date]].map(([k,v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setViewCandidate(null)}>Close</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { handleDownloadReport(viewCandidate); setViewCandidate(null) }}><Download size={14} /> Download Report</button>
          </div>
        </Modal>
      )}

      {scheduleOpen && (
        <Modal title="Schedule Interview" onClose={() => setScheduleOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-field"><label>Candidate Name</label><input type="text" placeholder="Enter candidate name" value={scheduleForm.candidate} onChange={setSchField('candidate')} /></div>
            <div className="form-field"><label>Date</label><input type="date" value={scheduleForm.date} onChange={setSchField('date')} /></div>
            <div className="form-field"><label>Time</label><input type="time" value={scheduleForm.time} onChange={setSchField('time')} /></div>
            <div className="form-field"><label>Interview Type</label>
              <select value={scheduleForm.type} onChange={setSchField('type')}><option>Video Call</option><option>In-Person</option><option>Phone</option></select>
            </div>
            <div className="form-field"><label>Notes</label><input type="text" placeholder="Optional notes..." value={scheduleForm.notes} onChange={setSchField('notes')} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setScheduleOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { setScheduleOpen(false); showToast(`Interview scheduled for ${scheduleForm.candidate || 'candidate'} on ${scheduleForm.date || 'selected date'}`) }}>
              <Calendar size={14} /> Schedule
            </button>
          </div>
        </Modal>
      )}

      {messageCandidate && (
        <Modal title={`Message ${messageCandidate.name}`} onClose={() => setMessageCandidate(null)}>
          <div className="form-field">
            <label>Message</label>
            <textarea rows={4} placeholder={`Write a message to ${messageCandidate.name}...`} value={msgText} onChange={e => setMsgText(e.target.value)}
              style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 14, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setMessageCandidate(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={!msgText.trim()} onClick={() => { setMessageCandidate(null); setMsgText(''); showToast(`Message sent to ${messageCandidate.name}`) }}>
              <Send size={14} /> Send
            </button>
          </div>
        </Modal>
      )}

      {renderSection()}
    </DashboardLayout>
  )
}

export default RecruiterDashboard
