import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Video, VideoOff, Clock, ChevronRight, ChevronLeft,
  BarChart3, CheckCircle, AlertTriangle, ArrowLeft, Volume2, Eye,
  FileText, TrendingUp, Shield, Activity, Zap, Brain
} from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip
} from 'recharts'
import '../styles/mock-interview.css'

const QUESTIONS = [
  { id: 1, category: 'Technical',      text: 'Explain the difference between var, let, and const in JavaScript. When would you use each?' },
  { id: 2, category: 'Technical',      text: 'What is the virtual DOM in React? How does reconciliation work?' },
  { id: 3, category: 'Problem Solving',text: 'Walk me through how you would design a URL shortener system.' },
  { id: 4, category: 'Behavioral',     text: 'Tell me about a time you faced a difficult technical problem. How did you approach it?' },
  { id: 5, category: 'Technical',      text: 'What are closures in JavaScript? Provide a real-world use case.' },
  { id: 6, category: 'Communication',  text: 'How do you explain a complex technical concept to a non-technical stakeholder?' },
  { id: 7, category: 'Problem Solving',text: 'Given an array of integers, find the two numbers that add up to a target sum.' },
  { id: 8, category: 'Behavioral',     text: 'Describe your experience working in an agile development environment.' },
]

const TRANSCRIPT_LINES = [
  { time: '00:12', text: 'So var is function-scoped and can be re-declared, which can cause bugs in larger codebases.' },
  { time: '00:28', text: 'Let and const are block-scoped. Let allows reassignment, while const does not.' },
  { time: '00:45', text: 'I typically avoid var in modern JavaScript and prefer const by default, using let only when reassignment is needed.' },
  { time: '01:02', text: 'This helps prevent accidental mutations and makes the code more predictable and easier to reason about.' },
]

const SCORES = {
  technical:       82,
  communication:   76,
  grammar:         88,
  confidence:      71,
  problemSolving:  85,
  overall:         80,
}

const INTEGRITY = {
  speakingDuration: 73,
  silenceRatio:     12,
  avgPauseDuration: 2.1,
  wordCount:        347,
  wpm:              142,
  consistencyScore: 86,
  confidenceIndex:  71,
  sentimentScore:   78,
  riskLevel:        'Low',
  indicators: [
    { label: 'Speech Consistency',   value: 86, status: 'good'    },
    { label: 'Confidence Level',     value: 71, status: 'fair'    },
    { label: 'Answer Completeness',  value: 80, status: 'good'    },
    { label: 'Pacing & Fluency',     value: 74, status: 'fair'    },
    { label: 'Vocabulary Richness',  value: 88, status: 'good'    },
    { label: 'Filler Word Usage',    value: 65, status: 'warning' },
  ],
}

const radarData = [
  { subject: 'Technical',       score: SCORES.technical       },
  { subject: 'Communication',   score: SCORES.communication   },
  { subject: 'Grammar',         score: SCORES.grammar         },
  { subject: 'Confidence',      score: SCORES.confidence      },
  { subject: 'Problem Solving', score: SCORES.problemSolving  },
]

const scoreBarData = [
  { name: 'Technical',        score: SCORES.technical       },
  { name: 'Communication',    score: SCORES.communication   },
  { name: 'Grammar',          score: SCORES.grammar         },
  { name: 'Confidence',       score: SCORES.confidence      },
  { name: 'Problem Solving',  score: SCORES.problemSolving  },
]

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function ScoreBar({ label, value }) {
  const color = value >= 80 ? '#10b981' : value >= 65 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}/100</span>
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

function IntegrityBar({ label, value, status }) {
  const color = status === 'good' ? '#10b981' : status === 'fair' ? '#f59e0b' : '#ef4444'
  const bg    = status === 'good' ? 'rgba(16,185,129,0.1)' : status === 'fair' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'
  return (
    <div style={{ padding: '10px 14px', background: bg, borderRadius: 8, border: `1px solid ${color}33`, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color }}>{value}%</span>
      </div>
      <div className="progress-bar-container" style={{ height: 5 }}>
        <div className="progress-bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

function MockInterview() {
  const navigate = useNavigate()
  const [phase, setPhase]         = useState('intro')
  const [currentQ, setCurrentQ]   = useState(0)
  const [timeLeft, setTimeLeft]   = useState(120)
  const [totalTime, setTotalTime] = useState(0)
  const [micOn, setMicOn]         = useState(true)
  const [camOn, setCamOn]         = useState(true)
  const [answered, setAnswered]   = useState([])
  const [activeTab, setActiveTab] = useState('feedback')
  const timerRef = useRef(null)
  const totalRef = useRef(null)

  useEffect(() => {
    if (phase === 'interview') {
      timerRef.current = setInterval(() => setTimeLeft(t => {
        if (t <= 1) { handleNext(); return 120 }
        return t - 1
      }), 1000)
      totalRef.current = setInterval(() => setTotalTime(t => t + 1), 1000)
    }
    return () => {
      clearInterval(timerRef.current)
      clearInterval(totalRef.current)
    }
  }, [phase, currentQ])

  const handleNext = () => {
    setAnswered(a => [...new Set([...a, currentQ])])
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(q => q + 1)
      setTimeLeft(120)
    } else {
      clearInterval(timerRef.current)
      clearInterval(totalRef.current)
      setPhase('results')
    }
  }

  const handlePrev = () => {
    if (currentQ > 0) { setCurrentQ(q => q - 1); setTimeLeft(120) }
  }

  const timerColor = timeLeft > 60 ? '#10b981' : timeLeft > 30 ? '#f59e0b' : '#ef4444'
  const progress   = ((currentQ + 1) / QUESTIONS.length) * 100

  if (phase === 'intro') return (
    <div className="mi-page">
      <div className="mi-intro-card">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mi-intro-icon"><Brain size={36} /></div>
          <h1 className="mi-intro-title">AI Mock Interview</h1>
          <p className="mi-intro-sub">Simulate a real interview with AI-powered analysis, speech scoring, and integrity indicators powered by Whisper-based speech-to-text.</p>
          <div className="mi-intro-grid">
            {[
              { icon: <Clock size={18} />,    label: '8 Questions',       sub: '2 min each' },
              { icon: <Mic size={18} />,      label: 'Speech Analysis',   sub: 'Real-time' },
              { icon: <Shield size={18} />,   label: 'Integrity Check',   sub: 'AI-powered' },
              { icon: <BarChart3 size={18} />, label: 'Instant Feedback', sub: 'Detailed report' },
            ].map((item, i) => (
              <div key={i} className="mi-intro-feature">
                <div className="mi-feature-icon">{item.icon}</div>
                <div><div style={{ fontWeight: 600, fontSize: 13 }}>{item.label}</div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.sub}</div></div>
              </div>
            ))}
          </div>
          <div className="mi-intro-rules">
            <p><CheckCircle size={14} style={{ color: '#10b981' }} /> Ensure you are in a quiet environment</p>
            <p><CheckCircle size={14} style={{ color: '#10b981' }} /> Allow microphone access when prompted</p>
            <p><CheckCircle size={14} style={{ color: '#10b981' }} /> Answer each question within 2 minutes</p>
            <p><AlertTriangle size={14} style={{ color: '#f59e0b' }} /> Do not navigate away during the interview</p>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28 }}>
            <Link to="/student" className="btn btn-outline">← Back to Dashboard</Link>
            <button className="btn btn-primary" onClick={() => setPhase('interview')}>
              Start Interview <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )

  if (phase === 'interview') {
    const q = QUESTIONS[currentQ]
    return (
      <div className="mi-page">
        <div className="mi-header">
          <div className="mi-header-left">
            <button className="btn btn-ghost btn-sm" onClick={() => setPhase('intro')}><ArrowLeft size={16} /> Exit</button>
            <span className="mi-header-title">AI Mock Interview</span>
          </div>
          <div className="mi-header-center">
            <div className="mi-progress-bar">
              <div className="mi-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="mi-progress-label">{currentQ + 1} / {QUESTIONS.length}</span>
          </div>
          <div className="mi-header-right">
            <div className="mi-total-time"><Clock size={14} /> {formatTime(totalTime)}</div>
          </div>
        </div>

        <div className="mi-main">
          <div className="mi-video-col">
            <div className="mi-camera-box">
              {camOn ? (
                <div className="mi-camera-placeholder">
                  <div className="mi-camera-avatar">👤</div>
                  <p>Camera Active</p>
                  <div className="mi-recording-dot" />
                </div>
              ) : (
                <div className="mi-camera-off">
                  <VideoOff size={36} />
                  <p>Camera Off</p>
                </div>
              )}
            </div>
            <div className="mi-controls">
              <button className={`mi-ctrl-btn ${micOn ? 'active' : 'inactive'}`} onClick={() => setMicOn(m => !m)}>
                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                <span>{micOn ? 'Mic On' : 'Mic Off'}</span>
              </button>
              <button className={`mi-ctrl-btn ${camOn ? 'active' : 'inactive'}`} onClick={() => setCamOn(c => !c)}>
                {camOn ? <Video size={20} /> : <VideoOff size={20} />}
                <span>{camOn ? 'Cam On' : 'Cam Off'}</span>
              </button>
            </div>
            <div className="mi-voice-meter">
              <Volume2 size={14} />
              <span style={{ fontSize: 12, marginLeft: 6, color: 'var(--text-secondary)' }}>Voice Level</span>
              <div className="mi-voice-bars">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="mi-voice-bar" style={{ height: micOn ? `${Math.random() * 70 + 20}%` : '20%', background: micOn ? '#6366f1' : '#cbd5e1' }} />
                ))}
              </div>
            </div>
          </div>

          <div className="mi-question-col">
            <div className="mi-q-nav">
              {QUESTIONS.map((_, i) => (
                <div key={i} className={`mi-q-dot ${i === currentQ ? 'current' : answered.includes(i) ? 'done' : 'pending'}`} onClick={() => { setCurrentQ(i); setTimeLeft(120) }} />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={currentQ} className="mi-question-card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <div className="mi-q-meta">
                  <span className="badge purple">{q.category}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Q{currentQ + 1} of {QUESTIONS.length}</span>
                </div>
                <p className="mi-question-text">{q.text}</p>
                <div className="mi-timer" style={{ color: timerColor, borderColor: timerColor }}>
                  <Clock size={16} />
                  <span>{formatTime(timeLeft)}</span>
                </div>
                <div className="mi-answer-area">
                  <textarea className="mi-textarea" placeholder="Type your answer here, or speak aloud with mic enabled..." rows={5} />
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mi-actions">
              <button className="btn btn-outline" onClick={handlePrev} disabled={currentQ === 0}><ChevronLeft size={16} /> Previous</button>
              <button className="btn btn-primary" onClick={handleNext}>
                {currentQ === QUESTIONS.length - 1 ? 'Finish Interview' : 'Next Question'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mi-page">
      <div className="mi-results-container">
        <motion.div className="mi-results-header" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mi-results-title-row">
            <div>
              <h1 className="mi-results-title">Interview Complete</h1>
              <p className="mi-results-sub">AI analysis of your performance · Duration: {formatTime(totalTime)}</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/student" className="btn btn-outline"><ArrowLeft size={16} /> Dashboard</Link>
              <button className="btn btn-primary"><FileText size={16} /> Download Report</button>
            </div>
          </div>
          <div className="mi-overall-score">
            <div className="mi-score-circle">
              <span className="mi-score-value">{SCORES.overall}</span>
              <span className="mi-score-label">Overall</span>
            </div>
            <div className="mi-score-breakdown">
              {[
                { label: 'Questions Answered', value: `${QUESTIONS.length}/${QUESTIONS.length}`, icon: <CheckCircle size={16} color="#10b981" /> },
                { label: 'Interview Duration',  value: formatTime(totalTime),                     icon: <Clock size={16} color="#6366f1" /> },
                { label: 'Words Per Minute',    value: `${INTEGRITY.wpm} WPM`,                    icon: <Zap size={16} color="#f59e0b" /> },
                { label: 'Risk Level',          value: INTEGRITY.riskLevel,                       icon: <Shield size={16} color="#10b981" /> },
              ].map((item, i) => (
                <div key={i} className="mi-meta-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                    {item.icon}
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="mi-tabs">
          {[
            { key: 'feedback',  label: 'AI Feedback',          icon: <Brain size={15} />    },
            { key: 'transcript',label: 'Transcript',           icon: <FileText size={15} /> },
            { key: 'integrity', label: 'Integrity Analysis',   icon: <Shield size={15} />   },
          ].map(t => (
            <button key={t.key} className={`mi-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'feedback' && (
            <motion.div key="feedback" className="mi-tab-content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mi-results-grid">
                <div className="mi-card">
                  <h3 className="mi-card-title">Performance Radar</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v}/100`]} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mi-card">
                  <h3 className="mi-card-title">Score Breakdown</h3>
                  <div style={{ marginTop: 8 }}>
                    <ScoreBar label="Technical Knowledge"  value={SCORES.technical}      />
                    <ScoreBar label="Communication Skills" value={SCORES.communication}  />
                    <ScoreBar label="Grammar & Fluency"    value={SCORES.grammar}        />
                    <ScoreBar label="Confidence"           value={SCORES.confidence}     />
                    <ScoreBar label="Problem Solving"      value={SCORES.problemSolving} />
                  </div>
                  <div style={{ marginTop: 16, padding: '14px', background: 'rgba(99,102,241,0.06)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.15)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)', marginBottom: 6 }}>AI Recommendation</div>
                    <span className="badge green" style={{ marginBottom: 8 }}>Recommended</span>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, marginTop: 6 }}>
                      Strong technical and problem-solving skills. Focus on improving confidence and reducing filler words. Communication is clear but could be more structured.
                    </p>
                  </div>
                </div>
                <div className="mi-card" style={{ gridColumn: '1 / -1' }}>
                  <h3 className="mi-card-title">Score by Category</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={scoreBarData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v}/100`]} />
                      <Bar dataKey="score" radius={[5,5,0,0]} fill="#6366f1" name="Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'transcript' && (
            <motion.div key="transcript" className="mi-tab-content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mi-card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 className="mi-card-title">Speech Transcript — Q1</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge blue">{INTEGRITY.wpm} WPM</span>
                    <span className="badge green">{INTEGRITY.wordCount} Words</span>
                  </div>
                </div>
                <div className="mi-transcript">
                  {TRANSCRIPT_LINES.map((line, i) => (
                    <div key={i} className="mi-transcript-line">
                      <span className="mi-transcript-time">{line.time}</span>
                      <span className="mi-transcript-text">{line.text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                  Transcript generated using AI speech-to-text analysis (Whisper-based model). Accuracy may vary depending on audio quality.
                </div>
              </div>
              <div className="mi-results-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {[
                  { label: 'Speaking Duration', value: `${INTEGRITY.speakingDuration}%`, sub: 'of total time', icon: <Mic size={16} color="#6366f1" /> },
                  { label: 'Silence Ratio',     value: `${INTEGRITY.silenceRatio}%`,     sub: 'detected pauses', icon: <Activity size={16} color="#f59e0b" /> },
                  { label: 'Avg Pause',          value: `${INTEGRITY.avgPauseDuration}s`, sub: 'between answers', icon: <Clock size={16} color="#0ea5e9" /> },
                ].map((m, i) => (
                  <div key={i} className="mi-card" style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>{m.icon}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{m.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.sub}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'integrity' && (
            <motion.div key="integrity" className="mi-tab-content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mi-card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <h3 className="mi-card-title">AI Integrity Analysis</h3>
                  <span className="badge green"><Shield size={12} /> {INTEGRITY.riskLevel} Risk</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Based on speech pattern analysis, response timing, and behavioral indicators. This does not accuse of cheating — it provides AI-based integrity indicators only.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Speech Consistency', value: INTEGRITY.consistencyScore, color: '#10b981' },
                    { label: 'Confidence Index',   value: INTEGRITY.confidenceIndex,  color: '#f59e0b' },
                    { label: 'Sentiment Score',    value: INTEGRITY.sentimentScore,   color: '#6366f1' },
                    { label: 'Overall Integrity',  value: 82,                          color: '#10b981' },
                  ].map((m, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: 16, background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: m.color }}>{m.value}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
                <h4 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Detailed Indicators</h4>
                {INTEGRITY.indicators.map((ind, i) => (
                  <IntegrityBar key={i} label={ind.label} value={ind.value} status={ind.status} />
                ))}
              </div>
              <div className="mi-card">
                <h3 className="mi-card-title" style={{ marginBottom: 12 }}>Analysis Notes</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { icon: <CheckCircle size={15} color="#10b981" />, text: 'Speech patterns are consistent with natural delivery — no unusual pauses detected.' },
                    { icon: <CheckCircle size={15} color="#10b981" />, text: 'Answer content aligns with the asked questions based on keyword analysis.' },
                    { icon: <AlertTriangle size={15} color="#f59e0b" />, text: 'Slightly elevated filler word usage (um, uh, like) — consider practicing structured responses.' },
                    { icon: <CheckCircle size={15} color="#10b981" />, text: 'Response time within normal range — no significant delays detected before answering.' },
                    { icon: <Eye size={15} color="#6366f1" />, text: 'Sentiment analysis indicates positive and professional tone throughout the interview.' },
                  ].map((note, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <span style={{ flexShrink: 0, marginTop: 2 }}>{note.icon}</span>
                      {note.text}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default MockInterview
