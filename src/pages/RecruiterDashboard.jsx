import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import recordingApi from '../services/recordingApi'
import cvApi        from '../services/cvApi'
import analyticsApi from '../services/analyticsApi'
import { computeShortlistInsight, getInsightStatusColor, getInsightBadgeClass } from '../services/shortlistInsight'
import {
  Users, Briefcase, FileText, Calendar, Video, Download,
  Eye, Star, Award, TrendingUp, TrendingDown, BarChart3,
  Activity, Search, ChevronUp, ChevronDown, MessageSquare,
  X, CheckCircle, Send, Plus, Brain, Zap, Target, GitCompare, Lightbulb
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

// skillsData and scoreDistribution are computed inside the component via useMemo
// from real analytics API data — the module-scope mock arrays were removed.

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

  // Req 11 — Candidate comparison: Set of interviewId strings
  const [compareSet, setCompareSet] = useState(new Set())
  const MAX_COMPARE = 4

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

  // Module 8: recruiter analytics from /api/analytics/recruiter
  const [analytics,        setAnalytics]        = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadResults() {
      setAiResultsLoading(true)
      setAnalyticsLoading(true)
      setAiResultsError('')
      try {
        const [resultsRes, analyticsRes] = await Promise.allSettled([
          recordingApi.getResults(),
          analyticsApi.getRecruiterAnalytics(),
        ])
        if (!cancelled) {
          if (resultsRes.status === 'fulfilled') setAiResults(resultsRes.value.results || [])
          else setAiResultsError(resultsRes.reason?.message || 'Failed to load')
          if (analyticsRes.status === 'fulfilled' && analyticsRes.value?.success) {
            setAnalytics(analyticsRes.value)
          }
        }
      } catch (e) {
        if (!cancelled) setAiResultsError(e.message)
      } finally {
        if (!cancelled) {
          setAiResultsLoading(false)
          setAnalyticsLoading(false)
        }
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

  // Real candidates: use analytics candidateRankings (merit-based) when available,
  // otherwise fall back to aiResults in received order.
  const realCandidates = useMemo(() => {
    // Prefer analytics candidateRankings which provides proper merit-based rank
    if (analytics?.candidateRankings && analytics.candidateRankings.length > 0) {
      return analytics.candidateRankings.map(r => {
        // Backend analytics returns overallScore; fall back to score for compatibility
        const score = r.overallScore ?? r.score
        const rec = r.hireRecommendation || (
          score >= 85 ? 'Highly Recommended' :
          score >= 70 ? 'Recommended' :
          score >= 50 ? 'Needs Review' : 'Not Recommended'
        )
        return {
          id:               r.interviewId,
          interviewId:      r.interviewId,
          rank:             r.rank,           // merit-based rank from backend
          name:             r.candidateName || 'Candidate',
          email:            r.candidateEmail || '—',
          role:             r.role || 'General',
          interviewType:    r.interviewType || 'Mixed',
          difficulty:       r.difficulty || 'Medium',
          // Authentic score columns: interview score is the real AI score
          interviewScore:   score != null ? Number(score) : null,
          // resumeScore: only available if backend provides it explicitly
          resumeScore:      r.resumeScore != null ? Number(r.resumeScore) : null,
          finalScore:       score != null ? Number(score) : 0,
          performanceRating: r.performanceRating || null,
          rec,
          date:             r.completedAt ? new Date(r.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
          duration:         r.duration || 0,
          questionsAnswered: r.questionsAnswered || 0,
          recordingCount:   0,
          recordingId:      null,
          overallFeedback:  r.overallFeedback,
          strengths:        r.strengths,
          weaknesses:       r.weaknesses,
          categoryScores:   r.categoryScores,
        }
      })
    }
    // Fallback: map from aiResults (no merit rank guaranteed, but preserves UI)
    return (aiResults || []).map((r, i) => {
      const score = r.score != null ? Number(r.score) : 0
      const rec = r.hire_recommendation || (score >= 85 ? 'Highly Recommended' : score >= 70 ? 'Recommended' : score >= 50 ? 'Needs Review' : 'Not Recommended')
      return {
        id:               r.interview_id,
        interviewId:      r.interview_id,
        rank:             i + 1,   // position-based fallback
        name:             r.candidate_name || 'Candidate',
        email:            r.candidate_email || '—',
        role:             r.role || 'General',
        interviewType:    r.interview_type || 'Mixed',
        difficulty:       r.difficulty || 'Medium',
        interviewScore:   score,
        resumeScore:      null,   // not available in fallback path
        finalScore:       score,
        performanceRating: null,
        rec,
        date:             r.completed_at ? new Date(r.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
        duration:         r.duration || 0,
        questionsAnswered: r.questions_answered || 0,
        recordingCount:   Number(r.recording_count) || 0,
        recordingId:      r.recording_id,
        overallFeedback:  r.overall_feedback,
        strengths:        r.strengths,
        weaknesses:       r.weaknesses,
        categoryScores:   r.category_scores,
      }
    })
  }, [analytics, aiResults])

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

  // Module 8: M7 canonical category radar for Top Candidate vs Average
  // Top candidate = rank 1 from merit-based analytics ranking (NOT aiResults[0])
  const skillsData = useMemo(() => {
    const M7_CATS = [
      { key: 'communication',      label: 'Communication'  },
      { key: 'confidence',         label: 'Confidence'     },
      { key: 'technicalRelevance', label: 'Technical'      },
      { key: 'professionalism',    label: 'Professional'   },
    ]

    // Category averages from analytics API
    const catAvgs = analytics?.categoryAverages || null

    // Top candidate = rank 1 from realCandidates (merit-ranked when analytics loaded)
    const topCandidate = realCandidates.find(c => c.rank === 1) || realCandidates[0] || null

    // Analytics candidateRankings exposes M7 scores as flat top-level properties
    // (communication, confidence, technicalRelevance, professionalism).
    // The categoryScores field (from aiResults fallback) uses a different nested shape.
    // We try the flat analytics properties first, then fall back to the nested path,
    // then fall back to the candidate's overall finalScore if nothing else is available.
    const topRaw = analytics?.candidateRankings?.find(r => r.rank === 1) ||
                   analytics?.candidateRankings?.[0] || null

    return M7_CATS.map(cat => {
      const avgVal = catAvgs?.[cat.key] ?? 0
      let topVal = 0

      if (topRaw && topRaw[cat.key] != null) {
        // Flat M7 property from analytics candidateRankings (preferred path)
        topVal = Number(topRaw[cat.key]) || 0
      } else if (topCandidate?.categoryScores?.module7_scores) {
        // Nested M7 structure from aiResults path: { communication: { score: N }, ... }
        const m7 = topCandidate.categoryScores.module7_scores
        topVal = m7[cat.key]?.score ?? m7[cat.key] ?? 0
      } else if (topCandidate?.categoryScores) {
        // Legacy flat categoryScores (pre-M7 interviews)
        const legacyKeyMap = { communication: 'communication', confidence: 'confidence', technicalRelevance: 'technical', professionalism: 'professionalism' }
        topVal = Number(topCandidate.categoryScores[legacyKeyMap[cat.key]]) || 0
      }
      // Final fallback: if still 0, use the candidate's overall finalScore as a proxy
      if (topVal === 0 && topCandidate?.finalScore) topVal = topCandidate.finalScore

      return { skill: cat.label, A: Number(topVal) || 0, B: Math.round(avgVal) }
    })
  }, [analytics, realCandidates])

  // Module 8: real weekly trend from analytics API
  const weeklyTrendData = useMemo(() => {
    if (analytics?.weeklyTrend && analytics.weeklyTrend.length > 0) {
      return analytics.weeklyTrend.map(w => ({
        week: w.weekLabel || w.week,
        completed: w.completed || 0,
      }))
    }
    // If analytics not loaded yet, return empty (no fake data)
    return []
  }, [analytics])

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
  const handleSectionChange = (section) => {
    setActiveSection(section)
    setSearch('')
    setPage(1)
    // Clear comparison selection when leaving ranking-related sections
    if (!['candidates', 'ai-ranking', 'compare'].includes(section)) {
      setCompareSet(new Set())
    }
  }

  // Req 11 — toggle compare selection
  const handleToggleCompare = useCallback((interviewId) => {
    setCompareSet(prev => {
      const next = new Set(prev)
      if (next.has(interviewId)) {
        next.delete(interviewId)
      } else if (next.size >= MAX_COMPARE) {
        showToast(`Maximum ${MAX_COMPARE} candidates can be compared at once`)
        return prev
      } else {
        next.add(interviewId)
      }
      return next
    })
  }, [MAX_COMPARE]) // eslint-disable-line react-hooks/exhaustive-deps
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
    // Safe score display — never output undefined/null/NaN in the report
    const safeScore = (v, label) => v != null && isFinite(Number(v)) ? `${Math.round(Number(v))}/100` : 'Not available'
    const safeList  = (arr, label) => {
      if (!Array.isArray(arr) || arr.length === 0) return `  (${label} not available)`
      return arr.map(s => `• ${s}`).join('\n')
    }

    // Module 7 category scores (from the analytics ranking shape)
    const cats = [
      c.communication      != null ? `  Communication:       ${Math.round(Number(c.communication))}/100 (30%)` : null,
      c.confidence         != null ? `  Confidence:          ${Math.round(Number(c.confidence))}/100 (25%)` : null,
      c.technicalRelevance != null ? `  Technical Relevance: ${Math.round(Number(c.technicalRelevance))}/100 (30%)` : null,
      c.professionalism    != null ? `  Professionalism:     ${Math.round(Number(c.professionalism))}/100 (15%)` : null,
    ].filter(Boolean)

    const categorySection = cats.length > 0
      ? `\nModule 7 Category Breakdown:\n${cats.join('\n')}`
      : '\nModule 7 Category Breakdown:\n  Not available (legacy interview or scores not yet computed)'

    const resumeSection = c.resumeScore != null
      ? `\nResume / ATS Score: ${Math.round(Number(c.resumeScore))}/100`
      : '\nResume / ATS Score: Not available'

    const ratingSection = c.performanceRating
      ? `\nPerformance Rating: ${c.performanceRating}`
      : ''

    const summarySection = c.overallFeedback
      ? `\nAI Evaluation Summary:\n${c.overallFeedback}`
      : '\nAI Evaluation Summary:\n  Not available'

    const strengthsSection = `\nStrengths:\n${safeList(c.strengths, 'AI-identified strengths')}`
    const weaknessSection  = `\nAreas for Improvement:\n${safeList(c.weaknesses, 'AI-identified areas')}`

    const text = [
      'AI INTERVIEW EVALUATION REPORT',
      '================================',
      '',
      `Candidate:          ${c.name || '—'}`,
      `Email:              ${c.email || '—'}`,
      `Role:               ${c.role || '—'}`,
      `Interview Date:     ${c.date || '—'}`,
      `Interview Type:     ${c.interviewType || '—'}`,
      `Difficulty:         ${c.difficulty || '—'}`,
      '',
      `Overall AI Score:   ${safeScore(c.interviewScore)}`,
      `Hire Recommendation: ${c.rec || '—'}`,
      ratingSection,
      resumeSection,
      categorySection,
      summarySection,
      strengthsSection,
      weaknessSection,
      '',
      `Questions: ${c.questionsAnswered ?? '—'}/${c.questionCount ?? '—'} answered`,
      `Duration:  ${c.duration ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : '—'}`,
      '',
      `Report generated: ${new Date().toLocaleString('en-IN')}`,
    ].join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(c.name || 'candidate').replace(/\s+/g, '_')}_ai_report.txt`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Report downloaded for ${c.name || 'candidate'}`)
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
        { icon: <Award size={18} />,      label: 'AI Ranking',    section: 'ai-ranking'   },
        { icon: <Video size={18} />,      label: 'AI Results',    section: 'ai-results'   },
        { icon: <Video size={18} />,      label: 'Mock Interview', onClick: () => navigate('/mock-interview') },
        { icon: <Star size={18} />,       label: 'Assessments',   section: 'assessments'  },
        { icon: <GitCompare size={18} />, label: 'Compare',        section: 'compare',
          badge: compareSet.size >= 2 ? String(compareSet.size) : undefined },
        { icon: <Lightbulb size={18} />,  label: 'Shortlist Insights', section: 'shortlist' },
      ],
    },
  ]

  const renderRankingTable = (showCompare = false) => (
    <>
      <div className="table-search-wrapper">
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input className="table-search-bar" style={{ paddingLeft: 32 }} placeholder="Search candidates..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {analytics?.candidateRankings ? (
            <span className="badge green" style={{ fontSize: 10 }}>Merit-ranked</span>
          ) : (
            <span className="badge orange" style={{ fontSize: 10 }}>Position order</span>
          )}
          <span className="badge purple">{filtered.length} candidates</span>
          {showCompare && compareSet.size >= 2 && (
            <button className="btn btn-primary btn-sm" onClick={() => handleSectionChange('compare')}>
              <GitCompare size={13} /> Compare ({compareSet.size})
            </button>
          )}
          {showCompare && compareSet.size > 0 && (
            <button className="btn btn-outline btn-sm" onClick={() => setCompareSet(new Set())}>
              <X size={13} /> Clear
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={handleExport}><Download size={13} /> Export CSV</button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead><tr>
            {showCompare && <th style={{ width: 36 }}>Cmp</th>}
            <th>Rank</th>
            <th className="sortable-th" onClick={() => handleSort('name')}><div className="th-inner">Candidate <SortIcon field="name" /></div></th>
            <th>Role</th>
            <th className="sortable-th" onClick={() => handleSort('interviewScore')}><div className="th-inner">AI Score <SortIcon field="interviewScore" /></div></th>
            <th>Resume Score</th>
            <th className="sortable-th" onClick={() => handleSort('rec')}><div className="th-inner">Recommendation <SortIcon field="rec" /></div></th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            {paginated.length === 0
              ? <tr><td colSpan={showCompare ? 8 : 7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No candidates found</td></tr>
              : paginated.map((c, i) => (
                <tr key={c.interviewId || i} style={compareSet.has(c.interviewId) ? { background: 'rgba(99,102,241,0.07)' } : undefined}>
                  {showCompare && (
                    <td>
                      <input
                        type="checkbox"
                        checked={compareSet.has(c.interviewId)}
                        onChange={() => handleToggleCompare(c.interviewId)}
                        style={{ cursor: 'pointer', width: 16, height: 16 }}
                        aria-label={`Select ${c.name} for comparison`}
                      />
                    </td>
                  )}
                  <td><RankMedal rank={c.rank} /></td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="user-avatar">{c.name.charAt(0)}</div><div><span style={{ fontWeight: 500 }}>{c.name}</span>{c.performanceRating && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.performanceRating}</div>}</div></div></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.role}</td>
                  {/* AI/Interview Score: the real Module 7 overall score — not a copy of another column */}
                  <td><span style={{ fontWeight: 800, fontSize: 15, color: c.interviewScore != null && c.interviewScore >= 85 ? '#10b981' : c.interviewScore != null && c.interviewScore >= 70 ? '#f59e0b' : '#ef4444' }}>{c.interviewScore != null ? c.interviewScore : '—'}</span></td>
                  {/* Resume Score: only if backend provided it; null → '—' (no duplication) */}
                  <td><span style={{ fontWeight: 600, fontSize: 13, color: c.resumeScore != null ? 'var(--text-primary)' : 'var(--text-muted)' }}>{c.resumeScore != null ? c.resumeScore : '—'}</span></td>
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
                <div className="card-header">
                  <h2>Competency Radar</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge purple">Top Candidate</span>
                    <span className="badge blue">Platform Avg</span>
                  </div>
                </div>
                {analyticsLoading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading analytics…</div>
                ) : skillsData.every(d => d.A === 0 && d.B === 0) ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No interview data available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={skillsData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar name="Top Candidate" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                      <Radar name="Platform Avg"  dataKey="B" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.12} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(val) => [`${val}/100`]} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
                <div className="card-header">
                  <h2>Weekly Interviews</h2>
                  <span className="badge green">{analyticsLoading ? '…' : weeklyTrendData.length > 0 ? 'Real data' : 'No data'}</span>
                </div>
                {analyticsLoading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
                ) : weeklyTrendData.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No interview history available yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={weeklyTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} name="Completed" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
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
              {renderRankingTable(true)}
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
              {/* Module 8: Competency Radar using canonical M7 categories */}
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="card-header">
                  <h2>Competency Radar</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge purple">Top Candidate</span>
                    <span className="badge blue">Platform Avg</span>
                  </div>
                </div>
                {analyticsLoading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
                ) : skillsData.every(d => d.A === 0 && d.B === 0) ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No interview data available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={skillsData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar name="Top Candidate" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                      <Radar name="Platform Avg"  dataKey="B" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.12} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(val) => [`${val}/100`]} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
              {/* Module 8: Real weekly trend — completed interviews only (no fake scheduled line) */}
              <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="card-header">
                  <h2>Weekly Interview Trend</h2>
                  <span className="badge {analyticsLoading ? 'gray' : weeklyTrendData.length > 0 ? 'green' : 'orange'}">
                    {analyticsLoading ? 'Loading' : weeklyTrendData.length > 0 ? 'Completed' : 'No data'}
                  </span>
                </div>
                {analyticsLoading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading analytics…</div>
                ) : weeklyTrendData.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No interview history available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={weeklyTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} name="Completed" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
              {/* Score Distribution: sourced from realCandidates (real DB data) */}
              <motion.div className="card full-width" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="card-header"><h2>Score Distribution</h2><span className="badge gray">All Candidates</span></div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={scoreDistribution} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
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
            {renderRankingTable(true)}
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
            {renderRankingTable(true)}
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

    case 'compare': {
      // Req 11 — Candidate Comparison
      const compareList = realCandidates.filter(c => compareSet.has(c.interviewId))
      if (compareList.length < 2) {
        return (
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header"><h2>Candidate Comparison</h2><span className="badge gray">Select candidates from ranking</span></div>
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <GitCompare size={40} style={{ color: 'var(--text-muted)', marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>No candidates selected for comparison</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                Go to <strong>AI Ranking</strong> or <strong>Candidates</strong>, then check up to {MAX_COMPARE} candidates and click &ldquo;Compare&rdquo;.
              </div>
              <button className="btn btn-primary" onClick={() => handleSectionChange('ai-ranking')}>
                <Award size={14} /> Go to AI Ranking
              </button>
            </div>
          </motion.div>
        )
      }

      // Score coloring helper — safe for null
      const cmpColor = (v) => {
        if (v == null) return 'var(--text-muted)'
        return v >= 85 ? '#10b981' : v >= 70 ? '#f59e0b' : '#ef4444'
      }
      const cmpVal = (v, suffix = '') => v != null ? `${v}${suffix}` : '—'

      // Highlight the best value in each metric row
      const bestOf = (vals) => {
        const nums = vals.map(v => v != null ? Number(v) : -Infinity)
        const max  = Math.max(...nums)
        if (!isFinite(max) || max < 0) return -1
        return nums.indexOf(max)
      }

      const metrics = [
        { label: 'Overall AI Score',      key: 'interviewScore',      suffix: '/100' },
        { label: 'Resume / ATS Score',    key: 'resumeScore',          suffix: '/100' },
        { label: 'Performance Rating',    key: 'performanceRating',    suffix: '',     isText: true },
        { label: 'Communication (30%)',   key: 'communication',        suffix: '/100' },
        { label: 'Confidence (25%)',      key: 'confidence',           suffix: '/100' },
        { label: 'Technical (30%)',       key: 'technicalRelevance',   suffix: '/100' },
        { label: 'Professionalism (15%)', key: 'professionalism',      suffix: '/100' },
        { label: 'Hire Recommendation',   key: 'rec',                  suffix: '',     isText: true },
        { label: 'Rank',                  key: 'rank',                 suffix: '',     lowerIsBetter: true },
        { label: 'Interview Date',        key: 'date',                 suffix: '',     isText: true },
      ]

      const handleDownloadComparison = () => {
        const header = ['Metric', ...compareList.map(c => c.name)].join(' | ')
        const rows   = metrics.map(m => {
          const vals = compareList.map(c => c[m.key] != null ? `${c[m.key]}${m.suffix}` : '—')
          return [m.label, ...vals].join(' | ')
        })
        const text = ['CANDIDATE COMPARISON REPORT', '===========================', '', header, ...rows, '', `Generated: ${new Date().toLocaleString('en-IN')}`].join('\n')
        const blob = new Blob([text], { type: 'text/plain' })
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = 'candidate_comparison.txt'; a.click()
        URL.revokeObjectURL(url); showToast('Comparison downloaded')
      }

      return (
        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card-header">
            <div>
              <h2>Candidate Comparison</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Side-by-side comparison of {compareList.length} selected candidates</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setCompareSet(new Set())}>
                <X size={13} /> Clear Selection
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleDownloadComparison}>
                <Download size={13} /> Download
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 480 }}>
              <thead><tr>
                <th style={{ width: 180, minWidth: 160 }}>Metric</th>
                {compareList.map((c, i) => (
                  <th key={c.interviewId || i} style={{ textAlign: 'center', minWidth: 130 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 14 }}>{c.name.charAt(0)}</div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.role}</div>
                      <RankMedal rank={c.rank} />
                    </div>
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {metrics.map(m => {
                  const vals = compareList.map(c => c[m.key])
                  const bestIdx = m.isText ? -1 : bestOf(m.lowerIsBetter ? vals.map(v => v != null ? -Number(v) : null) : vals)
                  return (
                    <tr key={m.label}>
                      <td style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', paddingLeft: 12 }}>{m.label}</td>
                      {vals.map((v, i) => (
                        <td key={i} style={{ textAlign: 'center' }}>
                          <span style={{
                            fontWeight: bestIdx === i ? 800 : 600,
                            fontSize: !m.isText && v != null ? 14 : 13,
                            color: m.isText ? 'var(--text-primary)' : cmpColor(v),
                            textDecoration: bestIdx === i ? 'underline' : 'none',
                          }}>
                            {m.isText ? (v || '—') : cmpVal(v, m.suffix)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)' }}>
            Underlined values indicate the best result in each row. '—' indicates data not available.
          </div>
        </motion.div>
      )
    }

    case 'shortlist': {
      // Req 15 — Shortlisting Insights
      const sortedForShortlist = [...realCandidates].sort((a, b) => {
        const order = { strong: 0, consider: 1, review: 2, weak: 3, unknown: 4 }
        const ia = computeShortlistInsight(a)
        const ib = computeShortlistInsight(b)
        const od = (order[ia.status] ?? 5) - (order[ib.status] ?? 5)
        if (od !== 0) return od
        return (b.interviewScore ?? -1) - (a.interviewScore ?? -1)
      })

      return (
        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card-header">
            <div>
              <h2>Shortlisting Insights</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Deterministic AI-derived shortlisting analysis for each candidate</p>
            </div>
            <span className="badge blue">{sortedForShortlist.length} candidates</span>
          </div>
          {sortedForShortlist.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No completed candidate interviews to analyse yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
              {sortedForShortlist.map((c, i) => {
                const insight = computeShortlistInsight(c)
                const color   = getInsightStatusColor(insight.status)
                const badgeCls = getInsightBadgeClass(insight.status)
                return (
                  <motion.div key={c.interviewId || i}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ display: 'flex', gap: 14, padding: '14px 16px', background: 'var(--bg-primary)', borderRadius: 10, border: `1px solid ${color}28`, alignItems: 'flex-start' }}
                  >
                    {/* Avatar + rank */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <div className="user-avatar" style={{ width: 40, height: 40, fontSize: 18 }}>{c.name.charAt(0)}</div>
                      <RankMedal rank={c.rank} />
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.role}</span>
                        <span className={`badge ${badgeCls}`} style={{ fontSize: 11 }}>{insight.title}</span>
                        {c.interviewScore != null && (
                          <span style={{ fontSize: 13, fontWeight: 800, color }}>Score: {c.interviewScore}/100</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{insight.summary}</div>
                      {/* Top 2 reasons */}
                      {insight.reasons.slice(0, 2).map((r, ri) => (
                        <div key={ri} style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 4, marginBottom: 2 }}>
                          <span style={{ color }}>›</span> {r}
                        </div>
                      ))}
                      {/* Strengths chips */}
                      {insight.strengths.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                          {insight.strengths.slice(0, 3).map((s, si) => (
                            <span key={si} style={{ fontSize: 10, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '2px 8px' }}>✓ {s}</span>
                          ))}
                        </div>
                      )}
                      {/* Concern chips */}
                      {insight.concerns.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          {insight.concerns.slice(0, 2).map((cc, ci) => (
                            <span key={ci} style={{ fontSize: 10, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '2px 8px' }}>⚠ {cc}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }}
                        onClick={() => setViewCandidate(c)}>
                        <Eye size={12} /> Profile
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                        onClick={() => handleDownloadReport(c)}>
                        <Download size={12} /> Report
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
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

      {viewCandidate && (() => {
        // Compute shortlist insight once for this candidate
        const insight = computeShortlistInsight(viewCandidate)
        const insightColor = getInsightStatusColor(insight.status)
        const insightBadge = getInsightBadgeClass(insight.status)

        // Safe score row helper: never outputs undefined/null/NaN
        const scoreRow = (label, value, note) => {
          const display = value != null && isFinite(Number(value))
            ? `${Math.round(Number(value))}/100`
            : '—'
          const color = value != null && isFinite(Number(value))
            ? (Number(value) >= 85 ? '#10b981' : Number(value) >= 70 ? '#f59e0b' : '#ef4444')
            : 'var(--text-muted)'
          return (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
                {note && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>{note}</div>}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color }}>{display}</span>
            </div>
          )
        }

        const textRow = (label, value) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{value || '—'}</span>
          </div>
        )

        return (
          <Modal title="Candidate Profile" onClose={() => setViewCandidate(null)}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
                {viewCandidate.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{viewCandidate.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{viewCandidate.role}</div>
                {viewCandidate.email && viewCandidate.email !== '—' && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{viewCandidate.email}</div>
                )}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <RankMedal rank={viewCandidate.rank} />
                {viewCandidate.performanceRating && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', background: 'rgba(99,102,241,0.1)', borderRadius: 12, padding: '2px 8px' }}>
                    {viewCandidate.performanceRating}
                  </span>
                )}
              </div>
            </div>

            {/* Shortlist Insight Banner */}
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: `${insightColor}12`, border: `1px solid ${insightColor}30` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Lightbulb size={13} style={{ color: insightColor }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: insightColor }}>{insight.title}</span>
                <span className={`badge ${insightBadge}`} style={{ fontSize: 10, marginLeft: 'auto' }}>{insight.status}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{insight.summary}</div>
            </div>

            {/* Score rows — safe display only, no undefined/null/NaN */}
            {scoreRow('Interview / AI Score', viewCandidate.interviewScore, 'Module 7 overall score')}
            {scoreRow('Resume / ATS Score',   viewCandidate.resumeScore,   viewCandidate.resumeScore == null ? 'No resume linked to this interview' : null)}

            {/* M7 category scores — only shown when available */}
            {(viewCandidate.communication != null || viewCandidate.confidence != null ||
              viewCandidate.technicalRelevance != null || viewCandidate.professionalism != null) && (
              <div style={{ margin: '10px 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Module 7 Category Scores
              </div>
            )}
            {viewCandidate.communication      != null && scoreRow('Communication',       viewCandidate.communication,      '30% weight')}
            {viewCandidate.confidence         != null && scoreRow('Confidence',           viewCandidate.confidence,         '25% weight')}
            {viewCandidate.technicalRelevance != null && scoreRow('Technical Relevance',  viewCandidate.technicalRelevance, '30% weight')}
            {viewCandidate.professionalism    != null && scoreRow('Professionalism',       viewCandidate.professionalism,    '15% weight')}

            {/* Other info */}
            <div style={{ margin: '10px 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Interview Details
            </div>
            {textRow('Recommendation', viewCandidate.rec)}
            {textRow('Interview Date', viewCandidate.date)}
            {textRow('Interview Type', viewCandidate.interviewType)}
            {textRow('Difficulty',     viewCandidate.difficulty)}

            {/* Insight reasons */}
            {insight.reasons.length > 0 && (
              <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Shortlist Analysis</div>
                {insight.reasons.slice(0, 4).map((r, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3, display: 'flex', gap: 4 }}>
                    <span style={{ color: insightColor }}>›</span> {r}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setViewCandidate(null)}>Close</button>
              {viewCandidate.interviewId && (
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setViewCandidate(null); openDetail(viewCandidate.interviewId) }}>
                  <Eye size={14} /> Full Detail
                </button>
              )}
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { handleDownloadReport(viewCandidate); setViewCandidate(null) }}>
                <Download size={14} /> Report
              </button>
            </div>
          </Modal>
        )
      })()}


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
