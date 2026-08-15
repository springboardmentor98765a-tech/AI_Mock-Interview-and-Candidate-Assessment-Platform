import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import resumeApi from '../services/resumeApi'
import { useAuth } from '../context/AuthContext'
import {
  Upload, FileText, User, Mail, Phone, MapPin, Link2, Code2,
  Code, Cpu, Briefcase, GraduationCap, Star, Trash2, RefreshCw,
  CheckCircle, AlertCircle, X, Clock, ChevronDown, ChevronUp,
  BarChart3, Activity, Target, FolderOpen, Award,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/resume.css'

function Toast({ toasts, dismiss }) {
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380 }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
            className={`resume-toast resume-toast-${t.type}`}
          >
            {t.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{t.msg}</span>
            <button onClick={() => dismiss(t.id)}><X size={14} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function SkillTag({ label, color = 'default' }) {
  return <span className={`resume-skill-tag resume-skill-tag-${color}`}>{label}</span>
}

function SectionCard({ icon, title, children, delay = 0 }) {
  return (
    <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <div className="card-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{icon}{title}</h2>
      </div>
      {children}
    </motion.div>
  )
}

function ContactRow({ icon, label, value, href }) {
  if (!value) return null
  return (
    <div className="resume-contact-row">
      <div className="resume-contact-icon">{icon}</div>
      <div>
        <div className="resume-contact-label">{label}</div>
        {href
          ? <a href={href} target="_blank" rel="noopener noreferrer" className="resume-contact-value resume-link">{value}</a>
          : <div className="resume-contact-value">{value}</div>
        }
      </div>
    </div>
  )
}

function AtsScoreCard({ atsScore }) {
  if (!atsScore || typeof atsScore !== 'object') return null
  const overall = atsScore.overall ?? 0
  const breakdown = atsScore.breakdown || {}
  const strengths = Array.isArray(atsScore.strengths) ? atsScore.strengths : []
  const improvements = Array.isArray(atsScore.improvements) ? atsScore.improvements : []

  const categories = [
    { key: 'contactInformation', label: 'Contact Information', max: 10 },
    { key: 'skills', label: 'Skills', max: 20 },
    { key: 'education', label: 'Education', max: 15 },
    { key: 'projects', label: 'Projects', max: 20 },
    { key: 'professionalExperience', label: 'Professional Experience', max: 20 },
    { key: 'resumeStructure', label: 'Resume Structure', max: 10 },
    { key: 'atsCompatibility', label: 'ATS Compatibility', max: 5 },
  ]

  return (
    <SectionCard icon={<BarChart3 size={18} />} title="ATS Resume Score" delay={0.03}>
      <div className="ats-score-header">
        <div className="ats-score-badge-wrap">
          <span className="ats-score-number">{overall}</span>
          <span className="ats-score-total">/ 100</span>
        </div>
        <div className="ats-score-meter">
          <div className="ats-score-fill" style={{ width: `${Math.min(overall, 100)}%` }} />
        </div>
      </div>

      <div className="ats-section-title">Score Breakdown</div>
      <div className="ats-breakdown-list">
        {categories.map(cat => {
          const rawVal = breakdown[cat.key] ?? 0
          const val = Math.min(rawVal, cat.max)
          const pct = (val / cat.max) * 100
          return (
            <div key={cat.key} className="ats-breakdown-item">
              <div className="ats-breakdown-info">
                <span>{cat.label}</span>
                <span className="ats-breakdown-val">{val} / {cat.max}</span>
              </div>
              <div className="ats-mini-bar">
                <div className="ats-mini-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {strengths.length > 0 && (
        <>
          <div className="ats-section-title" style={{ marginTop: 20 }}>Strengths</div>
          <ul className="ats-list">
            {strengths.map((item, idx) => (
              <li key={idx}>
                <CheckCircle size={15} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {improvements.length > 0 && (
        <>
          <div className="ats-section-title" style={{ marginTop: 20 }}>Suggestions</div>
          <ul className="ats-list">
            {improvements.map((item, idx) => (
              <li key={idx}>
                <span className="ats-bullet-dot" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  )
}

function UploadZone({ onFile, uploading, progress }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  return (
    <div
      className={`resume-upload-zone${dragging ? ' dragging' : ''}${uploading ? ' uploading' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFile} />
      {uploading ? (
        <div className="resume-upload-progress">
          <div className="resume-spinner" />
          <p>Analysing your resume…</p>
          <div className="resume-progress-bar">
            <div className="resume-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="resume-progress-pct">{progress}%</span>
        </div>
      ) : (
        <>
          <div className="resume-upload-icon"><Upload size={32} /></div>
          <h3>Drop your resume here</h3>
          <p>or <span className="resume-link">click to browse</span></p>
          <p className="resume-upload-hint">PDF only · Max 5 MB</p>
        </>
      )}
    </div>
  )
}

function HistoryPanel({ history, onLoad, onDelete, currentId }) {
  const [open, setOpen] = useState(false)
  if (!history.length) return null
  return (
    <div className="resume-history-panel">
      <button className="resume-history-toggle" onClick={() => setOpen(o => !o)}>
        <Clock size={16} />
        Previous resumes ({history.length})
        {open ? <ChevronUp size={14} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={14} style={{ marginLeft: 'auto' }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            {history.map(r => (
              <div key={r.id} className={`resume-history-item${currentId === r.id ? ' active' : ''}`}>
                <div className="resume-history-info">
                  <FileText size={14} style={{ flexShrink: 0, color: 'var(--primary)' }} />
                  <div>
                    <div className="resume-history-name">{r.originalName}</div>
                    <div className="resume-history-date">{new Date(r.uploadDate).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="resume-history-actions">
                  <button title="Load this resume" onClick={() => onLoad(r.id)}><RefreshCw size={13} /></button>
                  <button title="Delete" className="danger" onClick={() => onDelete(r.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ResumeAnalysis() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const toastIdRef = useRef(0)

  const [toasts,     setToasts]     = useState([])
  const [uploading,  setUploading]  = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [analysis,   setAnalysis]   = useState(null)
  const [resumeMeta, setResumeMeta] = useState(null)
  const [history,    setHistory]    = useState([])
  const [currentId,  setCurrentId]  = useState(null)

  const pushToast = useCallback((msg, type = 'success') => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])

  const dismissToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const loadHistory = useCallback(async () => {
    try {
      const data = await resumeApi.getHistory()
      setHistory(data.resumes || [])
    } catch { /* silent */ }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const handleFile = async (file) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      pushToast('Only PDF files are accepted.', 'error'); return
    }
    if (file.size > 5 * 1024 * 1024) {
      pushToast('File is too large. Maximum size is 5 MB.', 'error'); return
    }

    setUploading(true); setProgress(0); setAnalysis(null); setResumeMeta(null)
    try {
      const data = await resumeApi.uploadResume(file, setProgress)
      setAnalysis(data.analysis)
      setResumeMeta(data.resume)
      setCurrentId(data.resume.id)
      pushToast('Resume uploaded and analysed successfully!')
      loadHistory()
    } catch (err) {
      pushToast(err.message || 'Upload failed. Please try again.', 'error')
    } finally {
      setUploading(false); setProgress(0)
    }
  }

  const handleLoad = async (id) => {
    try {
      const data = await resumeApi.getById(id)
      setAnalysis(data.analysis); setResumeMeta(data.resume); setCurrentId(id)
      pushToast('Resume loaded successfully.')
    } catch (err) {
      pushToast(err.message || 'Failed to load resume.', 'error')
    }
  }

  const handleDelete = async (id) => {
    try {
      await resumeApi.deleteResume(id)
      setHistory(prev => prev.filter(r => r.id !== id))
      if (currentId === id) { setAnalysis(null); setResumeMeta(null); setCurrentId(null) }
      pushToast('Resume deleted.')
    } catch (err) {
      pushToast(err.message || 'Failed to delete.', 'error')
    }
  }

  const sidebarLinks = [
    {
      title: 'Resume',
      items: [
        { icon: <FileText size={18} />,  label: 'Analysis',    section: 'resume' },
        { icon: <BarChart3 size={18} />, label: 'Dashboard',   onClick: () => navigate('/student') },
        { icon: <Activity size={18} />,  label: 'Performance', onClick: () => navigate('/student') },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: <Target size={18} />, label: 'Settings', onClick: () => navigate('/settings') },
      ],
    },
  ]

  const contact        = analysis?.contact        || {}
  const skills         = analysis?.skills         || []
  const techs          = analysis?.technologies   || []
  const exp            = analysis?.experience     || { entries: [], totalYears: 0 }
  const edu            = analysis?.education      || []
  const summary        = analysis?.summary        || ''
  const projects       = analysis?.projects       || exp.projects       || []
  const certifications = analysis?.certifications || exp.certifications || []
  const atsScore       = analysis?.atsScore       || null

  return (
    <DashboardLayout
      title="Resume Analysis"
      role={user?.role || 'USER'}
      userName={user?.name || 'User'}
      sidebarLinks={sidebarLinks}
      activeSection="resume"
    >
      <Toast toasts={toasts} dismiss={dismissToast} />

      <div className="resume-page">

        {/* ── Left column: upload + history ── */}
        <div className="resume-upload-col">
          <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="card-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={18} /> Upload Resume
              </h2>
              {resumeMeta && <span className="badge green">Analysed</span>}
            </div>
            <UploadZone onFile={handleFile} uploading={uploading} progress={progress} />
            {resumeMeta && (
              <div className="resume-file-info">
                <FileText size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{resumeMeta.originalName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {(resumeMeta.fileSize / 1024).toFixed(1)} KB ·{' '}
                    {new Date(resumeMeta.uploadDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          <HistoryPanel
            history={history}
            onLoad={handleLoad}
            onDelete={handleDelete}
            currentId={currentId}
          />
        </div>

        {/* ── Right column: results ── */}
        <div className="resume-results-col">
          {!analysis && !uploading && (
            <motion.div className="card resume-empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <h3>No resume analysed yet</h3>
              <p>Upload a PDF resume to extract skills, experience, education, and generate a professional summary.</p>
            </motion.div>
          )}

          {analysis && (
            <>
              {/* ATS Resume Score */}
              <AtsScoreCard atsScore={atsScore} />

              {/* Contact / Resume Information */}
              <SectionCard icon={<User size={18} />} title="Resume Information" delay={0.05}>
                <div className="resume-contact-grid">
                  <ContactRow icon={<User size={16} />}  label="Full Name" value={contact.name} />
                  <ContactRow icon={<Mail size={16} />}  label="Email"     value={contact.email}
                    href={contact.email ? `mailto:${contact.email}` : null} />
                  <ContactRow icon={<Phone size={16} />} label="Phone"     value={contact.phone} />
                  <ContactRow icon={<MapPin size={16} />} label="Location" value={contact.location} />
                  <ContactRow icon={<Link2 size={16} />} label="LinkedIn"  value={contact.linkedin}
                    href={contact.linkedin} />
                  <ContactRow icon={<Code2 size={16} />} label="GitHub"    value={contact.github}
                    href={contact.github} />
                </div>
                {!contact.name && !contact.email && !contact.phone && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                    Contact details could not be extracted. Ensure the resume is a text-based PDF (not a scanned image).
                  </p>
                )}
              </SectionCard>

              {/* Skills */}
              <SectionCard icon={<Star size={18} />} title={`Extracted Skills (${skills.length})`} delay={0.1}>
                {skills.length > 0
                  ? <div className="resume-tags-wrap">{skills.map(s => <SkillTag key={s} label={s} color="purple" />)}</div>
                  : <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No skills detected in this document.</p>
                }
              </SectionCard>

              {/* Technologies */}
              <SectionCard icon={<Cpu size={18} />} title={`Technologies Detected (${techs.length})`} delay={0.15}>
                {techs.length > 0
                  ? <div className="resume-tags-wrap">{techs.map(t => <SkillTag key={t} label={t} color="blue" />)}</div>
                  : <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No specific technologies were detected.</p>
                }
              </SectionCard>

              {/* Experience */}
              <SectionCard icon={<Briefcase size={18} />} title="Experience" delay={0.2}>
                {exp.totalYears > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <span className="badge blue">
                      {exp.totalYears} year{exp.totalYears !== 1 ? 's' : ''} total experience
                    </span>
                  </div>
                )}
                {exp.entries && exp.entries.length > 0 ? (
                  <div className="resume-exp-list">
                    {exp.entries.map((e, i) => (
                      <div key={i} className="resume-exp-item">
                        <div className="resume-exp-title">
                          {e.title}
                          {e.current && <span className="badge green" style={{ marginLeft: 8, fontSize: 11 }}>Current</span>}
                        </div>
                        {e.company  && <div className="resume-exp-company">{e.company}</div>}
                        {e.duration && <div className="resume-exp-duration">{e.duration}</div>}
                        {e.years != null && e.years > 0 && (
                          <div className="resume-exp-years">{e.years} year{e.years !== 1 ? 's' : ''}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    No experience entries could be parsed from this resume.
                  </p>
                )}
              </SectionCard>

              {/* Education */}
              <SectionCard icon={<GraduationCap size={18} />} title="Education" delay={0.25}>
                {edu.length > 0 ? (
                  <div className="resume-edu-list">
                    {edu.map((e, i) => (
                      <div key={i} className="resume-edu-item">
                        <div className="resume-edu-degree">{e.degree}</div>
                        {e.institution && <div className="resume-edu-inst">{e.institution}</div>}
                        <div className="resume-edu-meta">
                          {e.year       && <span><Clock size={12} /> {e.year}</span>}
                          {e.cgpa       && <span className="badge blue"   style={{ fontSize: 11 }}>CGPA {e.cgpa}</span>}
                          {e.percentage && <span className="badge purple" style={{ fontSize: 11 }}>{e.percentage}%</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No education details could be extracted.</p>
                )}
              </SectionCard>

              {/* Professional Summary */}
              <SectionCard icon={<Code size={18} />} title="Professional Summary" delay={0.3}>
                {summary
                  ? <p className="resume-summary-text">{summary}</p>
                  : <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Summary could not be generated.</p>
                }
              </SectionCard>

              {/* Projects — shown only when Gemini returns them */}
              {projects.length > 0 && (
                <SectionCard icon={<FolderOpen size={18} />} title={`Projects (${projects.length})`} delay={0.35}>
                  <div className="resume-exp-list">
                    {projects.map((p, i) => (
                      <div key={i} className="resume-exp-item">
                        <div className="resume-exp-title">{p.title}</div>
                        {p.description && (
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.6 }}>
                            {p.description}
                          </div>
                        )}
                        {Array.isArray(p.technologies) && p.technologies.length > 0 && (
                          <div className="resume-tags-wrap" style={{ marginTop: 8 }}>
                            {p.technologies.map(t => <SkillTag key={t} label={t} color="blue" />)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Certifications — shown only when Gemini returns them */}
              {certifications.length > 0 && (
                <SectionCard icon={<Award size={18} />} title={`Certifications (${certifications.length})`} delay={0.4}>
                  <div className="resume-tags-wrap">
                    {certifications.map((c, i) => (
                      <SkillTag key={i} label={typeof c === 'string' ? c : c.name || JSON.stringify(c)} color="green" />
                    ))}
                  </div>
                </SectionCard>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
