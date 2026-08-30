import { useEffect, useRef, useState } from 'react'
import { BrainCircuit, CheckCircle2, LoaderCircle, Mic, Pause, Play, Send, Square, Volume2, X } from 'lucide-react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { candidateApi } from '../auth/api'

const formatTime = (seconds) => `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`
const FILLER_WORDS = ['um', 'uh', 'like', 'basically', 'actually', 'you know', 'sort of', 'kind of']
const speechMetrics = (text, seconds) => { const words = text.toLowerCase().match(/[a-z']+/g) || []; const joined = ` ${text.toLowerCase().replace(/[^a-z\s']/g, ' ')} `; const found = FILLER_WORDS.flatMap((word) => Array.from(joined.matchAll(new RegExp(`\\b${word.replace(' ', '\\s+')}\\b`, 'g'))).map(() => word)); return { word_count: words.length, filler_count: found.length, filler_words: [...new Set(found)], speech_seconds: Math.max(0, seconds), speaking_pace_wpm: seconds ? Math.round(words.length / seconds * 60) : 0 } }
const calculateEyeContactPercentage = (monitor) => {
  if (!monitor?.monitoring_checks) return null

  return Math.round(
    ((monitor.eye_contact_checks || 0) / monitor.monitoring_checks) * 100
  )
}

export default function InterviewGenerator({ onClose, onFinished, initialSession = null }) {
  const [details, setDetails] = useState({ role_title: 'Software Developer', domain: 'Technical', difficulty: 'Medium', question_count: 5, duration_minutes: 5 })
  const [session, setSession] = useState(initialSession); const [answer, setAnswer] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [remaining, setRemaining] = useState(0); const [listening, setListening] = useState(false); const [liveTranscript, setLiveTranscript] = useState(''); const [warning, setWarning] = useState(''); const [showEndedReport, setShowEndedReport] = useState(false); const [ready, setReady] = useState(false)
  const stream = useRef(null)
  const recorder = useRef(null)
  const chunks = useRef([])
  const questionStartedAt = useRef(null)
  const recognition = useRef(null)
  const welcomeSpoken = useRef(false)
  const automaticallySpokenQuestions = useRef(new Set())
  const automaticSpeechTimer = useRef(null)
  const speechRun = useRef(0)

  const monitoring = useRef({
    monitoring_checks: 0,
    face_visible_checks: 0,
    eye_contact_checks: 0,
    gaze_left_checks: 0,
    gaze_right_checks: 0,
    gaze_down_checks: 0,
    eyes_closed_checks: 0,
    multiple_face_events: 0,
    off_camera_events: 0,
    expression_signal: 'not available'
  })
  const question = session?.questions?.[session.current_question]; const paused = session?.status === 'PAUSED'; const finished = ['COMPLETED', 'ENDED'].includes(session?.status)

  const generate = async (event) => { event.preventDefault(); if (busy) return; setBusy(true); setError(''); try { const created = await candidateApi.generateInterview(details); setSession(await candidateApi.startInterview(created.id)); setReady(false) } catch (err) { setError(err.message) } finally { setBusy(false) } }
  const readQuestion = () => { if (!question?.text || !window.speechSynthesis) { setError('Question reading is not supported by this browser.'); return }; speechRun.current += 1; window.clearTimeout(automaticSpeechTimer.current); window.speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(question.text); speech.rate = 0.95; speech.onerror = () => setError('The browser could not read the question aloud. Check the device volume and try again.'); window.speechSynthesis.speak(speech) }
  const speakQuestionAutomatically = (questionIndex, questionText, delay = 180) => {
    if (!questionText || !window.speechSynthesis || automaticallySpokenQuestions.current.has(questionIndex)) return
    automaticallySpokenQuestions.current.add(questionIndex)
    const currentSpeechRun = speechRun.current
    window.clearTimeout(automaticSpeechTimer.current)
    automaticSpeechTimer.current = window.setTimeout(() => {
      if (speechRun.current !== currentSpeechRun) return
      window.speechSynthesis.cancel()
      const speech = new SpeechSynthesisUtterance(questionText)
      speech.rate = 0.95
      window.speechSynthesis.speak(speech)
    }, delay)
  }
  const startRecording = (media) => { if (!window.MediaRecorder) return; try { const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm'; const value = new MediaRecorder(media, { mimeType }); chunks.current = []; value.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data) }; value.start(1000); recorder.current = value } catch { setError('Recording could not start.') } }
  const finishRecording = async (id) => {
    const value = recorder.current;
    if (!value || value.state === 'inactive') return null;
    const blob = await new Promise((resolve) => {
      value.addEventListener('stop', () => resolve(new Blob(chunks.current, { type: value.mimeType || 'video/webm' })), { once: true });
      value.stop()
    });
    recorder.current = null;
    if (blob.size) {
      return await candidateApi.uploadInterviewRecording(
        id,
        new File([blob], 'interview.webm', { type: blob.type || 'video/webm' })
      );
    }
    return null;
  }
  const stopMedia = () => { recognition.current?.stop(); speechRun.current += 1; window.clearTimeout(automaticSpeechTimer.current); window.speechSynthesis?.cancel(); stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null; if (document.fullscreenElement) document.exitFullscreen?.() }
  const begin = async () => { try { setError(''); const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); stream.current = media; await document.documentElement.requestFullscreen(); startRecording(media); setReady(true); questionStartedAt.current = Date.now() } catch { stopMedia(); setError('Camera, microphone, and fullscreen permission are required.') } }
  const action = async (type) => {
    setBusy(true);
    try {
      if (type === 'pause' || type === 'end') { speechRun.current += 1; window.clearTimeout(automaticSpeechTimer.current); window.speechSynthesis?.cancel() }
      if (type === 'end') await candidateApi.saveInterviewMonitoring(session.id, monitoring.current);
      const updated = await (type === 'pause' ? candidateApi.pauseInterview(session.id) : type === 'resume' ? candidateApi.resumeInterview(session.id) : candidateApi.endInterview(session.id));
      if (type === 'end') {
        const finalSession = await finishRecording(updated.id);
        setSession(finalSession || updated);
        stopMedia();
      } else {
        setSession(updated);
        if (type === 'pause') recorder.current?.pause();
        if (type === 'resume') {
          recorder.current?.resume();
          questionStartedAt.current = Date.now()
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const submit = async (event) => {
    event.preventDefault();
    if (paused) return;
    setBusy(true);
    try {
      const spent = questionStartedAt.current ? Math.round((Date.now() - questionStartedAt.current) / 1000) : 0;
      const finalQuestion = session.current_question + 1 === session.questions.length;
      if (finalQuestion) {
        const latestMonitoring = { ...monitoring.current };
        console.log('Saving final monitoring data:', latestMonitoring);
        await candidateApi.saveInterviewMonitoring(session.id, latestMonitoring)
      }
      const updated = await candidateApi.saveInterviewAnswer(session.id, answer, spent, speechMetrics(answer, spent));
      setAnswer('');
      setLiveTranscript('');
      questionStartedAt.current = Date.now();
      if (updated.status === 'COMPLETED') {
        const finalSession = await finishRecording(updated.id);
        setSession(finalSession || updated);
        stopMedia();
        onFinished?.()
      } else {
        setSession(updated);
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const startListening = () => { const API = window.SpeechRecognition || window.webkitSpeechRecognition; if (!API) { setError('Voice input needs Google Chrome or Microsoft Edge.'); return }; setLiveTranscript(''); const value = new API(); recognition.current = value; value.continuous = true; value.interimResults = true; value.onstart = () => setListening(true); value.onresult = (event) => { let finalText = ''; let interimText = ''; for (let i = event.resultIndex; i < event.results.length; i += 1) { const text = event.results[i][0].transcript; if (event.results[i].isFinal) finalText += `${text} `; else interimText += text }; if (finalText) setAnswer((previous) => `${previous} ${finalText}`.trim()); setLiveTranscript(interimText.trim()) }; value.onend = () => { setListening(false); setLiveTranscript('') }; value.onerror = () => { setListening(false); setLiveTranscript(''); setError('Voice input stopped. Check microphone permission.') }; value.start() }
  useEffect(() => { if (!session) return undefined; setRemaining(session.remaining_seconds ?? session.duration_limit_seconds); if (session.status !== 'IN_PROGRESS') return undefined; const timer = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000); return () => clearInterval(timer) }, [session?.id, session?.current_question, session?.status])
  useEffect(() => {
    if (!ready || paused || session?.status !== 'IN_PROGRESS' || !question?.text || !window.speechSynthesis) return undefined
    const questionIndex = session.current_question
    if (!welcomeSpoken.current && questionIndex === 0) {
      welcomeSpoken.current = true
      const currentSpeechRun = speechRun.current
      window.speechSynthesis.cancel()
      const welcome = new SpeechSynthesisUtterance("Welcome to your AI mock interview. Let's begin with your first question.")
      welcome.rate = 0.95
      welcome.onend = () => { if (speechRun.current === currentSpeechRun) speakQuestionAutomatically(questionIndex, question.text, 350) }
      welcome.onerror = () => { if (speechRun.current === currentSpeechRun) speakQuestionAutomatically(questionIndex, question.text, 180) }
      window.speechSynthesis.speak(welcome)
    } else {
      speakQuestionAutomatically(questionIndex, question.text)
    }
    return undefined
  }, [ready, paused, session?.status, session?.current_question, question?.text])
  useEffect(() => { if (!ready) return undefined; const onVisibility = () => { if (document.hidden) setWarning('Warning: tab change detected. Return to the interview.') }; const onFullscreen = () => { if (!document.fullscreenElement) setWarning('Warning: fullscreen mode was exited.') }; document.addEventListener('visibilitychange', onVisibility); document.addEventListener('fullscreenchange', onFullscreen); return () => { document.removeEventListener('visibilitychange', onVisibility); document.removeEventListener('fullscreenchange', onFullscreen) } }, [ready])
  useEffect(() => () => stopMedia(), [])

  const content = !session ? <form onSubmit={generate} style={{ display: 'grid', gap: 15 }}><p style={{ ...muted, marginTop: -8 }}>Configure your mock interview</p><Input label="Target role" value={details.role_title} disabled={busy} items={ROLE_OPTIONS} onChange={(role_title) => setDetails({ ...details, role_title })} /><div style={setupGrid}><Choices label="Interview domain" value={details.domain} disabled={busy} items={['Technical', 'Behavioral', 'Aptitude']} set={(domain) => setDetails({ ...details, domain })} /><Choices label="Difficulty" value={details.difficulty} disabled={busy} items={['Easy', 'Medium', 'Hard']} set={(difficulty) => setDetails({ ...details, difficulty })} /><Choices label="Number of questions" value={details.question_count} disabled={busy} items={[3, 5, 10]} set={(question_count) => setDetails({ ...details, question_count: Number(question_count) })} /><Choices label="Interview duration" value={details.duration_minutes} disabled={busy} items={[5, 10]} format={(value) => `${value} minutes`} set={(duration_minutes) => setDetails({ ...details, duration_minutes: Number(duration_minutes) })} /></div><p style={fieldHint}>Your saved resume is used by SmartHire separately for resume analysis. Interview question generation uses the configuration above.</p><button className="btn btn-primary" disabled={busy}>{busy ? <><LoaderCircle size={16} className="spin" /> Generating interview questions...</> : 'Generate interview questions'}</button></form> : session.status === 'COMPLETED' || showEndedReport ? <Report session={session} onClose={onClose} /> : session.status === 'ENDED' ? <Finished session={session} onClose={onClose} onReport={() => setShowEndedReport(true)} /> : !ready ? <ProctorGate begin={begin} /> : <QuestionForm session={session} question={question} remaining={remaining} paused={paused} busy={busy} answer={answer} setAnswer={setAnswer} submit={submit} action={action} readQuestion={readQuestion} listening={listening} startListening={startListening} recognition={recognition} liveTranscript={liveTranscript} error={error} />
  return <div style={overlay}><div className="glass-strong" style={(session?.status === 'COMPLETED' || showEndedReport) ? reportModalCard : card}><button type="button" onClick={() => { stopMedia(); onClose() }} style={close}><X /></button><h2 style={title}><BrainCircuit size={25} /> AI interview practice</h2>{warning && <div style={warningBox}>{warning}</div>}{content}{error && !session && <p style={errorStyle}>{error}</p>}</div>{ready && <CameraPreview stream={stream.current} onMonitoring={(next) => { monitoring.current = next; console.log('LIVE MONITORING:', next); if (next.multiple_face_events || next.off_camera_events) setWarning(next.multiple_face_events ? 'Warning: more than one face detected.' : 'Warning: please look towards the camera.') }} />}</div>
}

function ProctorGate({ begin }) {
  const [testing, setTesting] = useState(false); const [camera, setCamera] = useState('Not tested'); const [microphone, setMicrophone] = useState('Not tested'); const [message, setMessage] = useState('')
  const testDevices = async () => { setTesting(true); setMessage(''); try { const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); setCamera(media.getVideoTracks().length ? 'Ready' : 'Not available'); setMicrophone(media.getAudioTracks().length ? 'Ready' : 'Not available'); media.getTracks().forEach((track) => track.stop()) } catch { setCamera('Not available'); setMicrophone('Not available'); setMessage('Allow camera and microphone access in your browser, then test again.') } finally { setTesting(false) } }
  const readyToStart = camera === 'Ready' && microphone === 'Ready'
  return <div><h3 style={{ color: '#f0f0ff' }}>Before you start</h3><p style={muted}>SmartHire needs camera, microphone, and fullscreen access for this monitored interview.</p><section style={deviceCard}><p style={reportEyebrow}>Device check</p><DeviceStatus label="Camera" value={camera} /><DeviceStatus label="Microphone" value={microphone} /><DeviceStatus label="Fullscreen" value="Required" /><button type="button" className="btn btn-outline" style={{ marginTop: 12 }} onClick={testDevices} disabled={testing}>{testing ? <><LoaderCircle size={15} className="spin" /> Testing...</> : 'Test camera & microphone'}</button>{message && <p style={errorStyle}>{message}</p>}</section><div style={notice}><strong>Recording & privacy notice</strong><p style={{ ...muted, marginTop: 8 }}>By clicking the button below, you explicitly consent to recording your camera and microphone during this interview. The recording is uploaded only after the session ends and is accessible only to you and authorised platform administrators.</p><p style={{ ...muted, marginTop: 8 }}>Camera monitoring supports interview analysis. Please remain visible on camera. Changing tabs, leaving fullscreen, or unusual camera activity may generate monitoring warnings. You may pause the interview when needed.</p></div><button className="btn btn-primary" style={full} onClick={begin} disabled={!readyToStart || testing}><Mic size={16} /> I consent — start recorded interview</button>{!readyToStart && <p style={{ ...muted, fontSize: '.78rem', textAlign: 'center', marginTop: 9 }}>Test your camera and microphone before starting.</p>}</div>
}

function DeviceStatus({ label, value }) { const ready = value === 'Ready'; const required = value === 'Required'; return <div style={deviceRow}><span>{label}</span><strong style={{ color: ready ? '#86efac' : required ? '#fbbf24' : value === 'Not available' ? '#f87171' : '#a0a0c0' }}>● {value}</strong></div> }
function QuestionForm({ session, question, remaining, paused, busy, answer, setAnswer, submit, action, readQuestion, listening, startListening, recognition, liveTranscript, error }) {
  const isLastQuestion = session.current_question + 1 === session.questions.length;
  const buttonContent = busy ? (
    <span>Processing report & analysis...</span>
  ) : (
    <>
      <Send size={16} /> Save answer and continue
    </>
  );

  return <form onSubmit={submit}><div style={timerBar}><span>Time left: {formatTime(remaining)}</span><span>{session.questions_attempted}/{session.questions.length} completed</span></div><div style={meta}><span>{session.role_title} · {session.domain} · {session.difficulty}</span><span>Question {session.current_question + 1} of {session.questions.length}</span></div><div style={controls}><strong>{paused ? 'Paused' : 'In progress'}</strong><button type="button" className="btn btn-outline" onClick={() => action(paused ? 'resume' : 'pause')} disabled={busy}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Resume' : 'Pause'}</button><button type="button" className="btn btn-outline" onClick={() => action('end')} disabled={busy}><Square size={16} /> End</button></div><div style={questionBox}>{question?.text}</div>{liveTranscript && <div style={liveTranscriptBox}><strong>Listening:</strong> {liveTranscript}</div>}<div style={controls}><button type="button" className="btn btn-outline" onClick={readQuestion} disabled={paused}><Volume2 size={16} /> Read question aloud</button><button type="button" className="btn btn-outline" onClick={listening ? () => recognition.current?.stop() : startListening} disabled={paused}><Mic size={16} /> {listening ? 'Stop listening' : 'Answer by voice'}</button></div><textarea className="form-input" rows="6" value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={paused} placeholder="Type or speak your answer..." required style={{ marginTop: 15 }} />{error && <p style={errorStyle}>{error}</p>}<button className="btn btn-primary" disabled={busy || paused || remaining === 0} style={full}>{buttonContent}</button></form>
}

function Input({ label, value, onChange, disabled, items }) { return <label className="form-group"><span className="form-label">{label}</span>{items ? <select className="form-input" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{items.map((item) => <option key={item} value={item}>{item}</option>)}</select> : <input className="form-input" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} required />}</label> }
function Choices({ label, value, items, set, disabled, format = (item) => item }) { return <label className="form-group"><span className="form-label">{label}</span><select className="form-input" value={value} disabled={disabled} onChange={(event) => set(event.target.value)}>{items.map((item) => <option key={item} value={item}>{format(item)}</option>)}</select></label> }
function Finished({ session, onClose, onReport }) { return <div style={{ textAlign: 'center', padding: 18 }}><CheckCircle2 size={48} color="#86efac" /><h3 style={title}>Interview {session.status === 'COMPLETED' ? 'completed' : 'ended'}</h3><p style={muted}>Duration: {formatTime(session.duration_seconds || 0)} · Questions attempted: {session.questions_attempted}</p>{onReport && <button className="btn btn-outline" style={full} onClick={onReport}>View report</button>}<button className="btn btn-primary" style={full} onClick={onClose}>Close</button></div> }
function Report({ session, onClose }) {
  const feedback = session.feedback || {}
  const scores = feedback.category_scores || {}
  const speech = feedback.communication_analysis || {}
  const monitor = session.monitoring_summary || speech.camera_monitoring || {}
  const checks = monitor.monitoring_checks || 0
  const percentage = (value) => checks ? Math.round((value || 0) / checks * 100) : null
  const eyeContact = percentage(monitor.eye_contact_checks)
  const facePresence = percentage(monitor.face_visible_checks)
  const eyesOpen = checks ? Math.round(((checks - (monitor.eyes_closed_checks || 0)) / checks) * 100) : null
  const emotion = session.emotion_analysis || monitor.emotion_analysis || null
  const attention = monitor.attention_analysis || session.attention_analysis || null
  const engagement = monitor.engagement_analysis || null
  const confidence = monitor.confidence_analysis || null
  const behavior = monitor.behavior_summary || null
  const attentionComponents = attention?.components || {}
  const visualMetrics = [
    ['Eye contact', attentionComponents.eye_contact_percentage ?? eyeContact],
    ['Attention', attention?.attention_score],
    ['Face presence', attentionComponents.face_presence_percentage ?? facePresence],
    ['Eyes open', attentionComponents.eye_open_percentage ?? eyesOpen]
  ]
  const communicationMetrics = [
    ['Words spoken', speech.word_count || 0],
    ['Filler words', `${speech.filler_word_count || 0}${speech.filler_words?.length ? ` (${speech.filler_words.join(', ')})` : ''}`],
    ['Speaking pace', `${speech.speaking_pace_wpm || 0} wpm`],
    ['Eye contact', eyeContact === null ? 'Not available' : `${eyeContact}%`],
    ['Looking left', monitor.gaze_left_checks || 0],
    ['Looking right', monitor.gaze_right_checks || 0],
    ['Looking down', monitor.gaze_down_checks || 0],
    ['Eyes closed', monitor.eyes_closed_checks || 0]
  ]

  return <div style={reportLayout}>
    <header style={reportHeader}><div><p style={reportEyebrow}>AI interview performance report</p><h3 style={reportTitle}>Your interview insights</h3><p style={muted}>{feedback.summary || `${session.questions_attempted} answers assessed by AI`}</p></div><div style={overallScore}><span>Overall score</span><strong style={overallScoreValue}>{feedback.overall_score ?? '—'}<small>/100</small></strong><em>{session.questions_attempted} answer{session.questions_attempted === 1 ? '' : 's'} assessed</em></div></header>

    {behavior && <ReportCard title="Interview behavior overview">{behavior.status === 'success' ? <><div style={behaviorTop}><div><span style={reportEyebrow}>Overall interview behavior indicator</span><strong style={attentionScore}>{behavior.overall_behavior_indicator}%</strong><p style={{ ...muted, margin: 0 }}>{behavior.overall_behavior_level}</p></div><div style={behaviorMetrics}>{[['Eye contact', behavior.eye_contact], ['Attention', behavior.attention], ['Engagement', behavior.engagement], ['Confidence', behavior.confidence]].map(([label, value]) => <MetricLine key={label} label={label} value={value === null ? 'Not available' : `${value}%`} />)}<MetricLine label="Dominant detected expression" value={behavior.dominant_emotion ? behavior.dominant_emotion.charAt(0).toUpperCase() + behavior.dominant_emotion.slice(1) : 'Not available'} /></div></div></> : <p style={muted}>Interview behavior overview is not available because there were not enough observable signals.</p>}<p style={disclaimer}>These indicators summarize observable interview behavior and facial signals. They are not measurements of internal mental state, personality, or psychological traits.</p></ReportCard>}

    <section><h4 style={sectionTitle}>Performance scores</h4><div style={reportGrid}>{Object.entries(scores).map(([name, value]) => <MetricCard key={name} label={name.replaceAll('_', ' ')} value={`${value}/100`} accent="#818cf8" />)}</div></section>

    <div style={reportGrid}>
      <ReportCard title="Interview recording"><RecordingPreview interviewId={session.id} available={session.has_recording} /></ReportCard>
      <ReportCard title="Visual analysis"><div style={compactList}>{visualMetrics.map(([label, value]) => <MetricLine key={label} label={label} value={value === null || value === undefined ? 'Not available' : `${value}%`} />)}<MetricLine label="Expression signal" value={monitor.expression_signal || 'Not available'} /></div></ReportCard>
    </div>

    <ReportCard title="Communication analysis"><div style={metricGrid}>{communicationMetrics.map(([label, value]) => <MetricCard key={label} label={label} value={value} />)}</div></ReportCard>

    {attention && attention.attention_score !== null && <ReportCard title="Attention analysis"><div style={attentionTop}><div><span style={reportEyebrow}>Attention score</span><strong style={attentionScore}>{attention.attention_score}%</strong></div><div><span style={reportEyebrow}>Visual attention estimate</span><strong style={{ ...attentionScore, fontSize: '1.25rem' }}>{attention.attention_level || 'Not available'}</strong></div></div><div style={{ display: 'grid', gap: 10, marginTop: 16 }}>{[['Eye contact', attentionComponents.eye_contact_percentage], ['Face presence', attentionComponents.face_presence_percentage], ['Gaze focus', attentionComponents.gaze_focus_percentage], ['Eyes open', attentionComponents.eye_open_percentage]].map(([label, value]) => <ProgressRow key={label} label={label} value={value} />)}</div><p style={disclaimer}>Attention is an estimated visual signal based on face visibility, gaze direction, eye contact, and eye state. It does not measure a person's internal mental state.</p></ReportCard>}

    {engagement && <ReportCard title="Engagement analysis">{engagement.status === 'success' ? <><div style={attentionTop}><div><span style={reportEyebrow}>Engagement score</span><strong style={attentionScore}>{engagement.engagement_score}%</strong></div><div><span style={reportEyebrow}>Engagement estimate</span><strong style={{ ...attentionScore, fontSize: '1.25rem' }}>{engagement.engagement_level}</strong></div></div><div style={{ display: 'grid', gap: 10, marginTop: 16 }}>{[['Eye contact', engagement.components?.eye_contact_percentage], ['Attention', engagement.components?.attention_score], ['Facial activity', engagement.components?.facial_activity_percentage], ['Emotion stability', engagement.components?.emotion_stability_percentage]].map(([label, value]) => <ProgressRow key={label} label={label} value={value} />)}</div></> : <p style={muted}>Engagement estimate is not available because there were not enough observable signals.</p>}<p style={disclaimer}>Engagement is an estimated visual and behavioral signal based on observable interview activity. It does not measure a person's internal mental state, motivation, or personality.</p></ReportCard>}

    {confidence && <ReportCard title="Confidence indicators">{confidence.status === 'success' ? <><div style={attentionTop}><div><span style={reportEyebrow}>Confidence indicator</span><strong style={attentionScore}>{confidence.confidence_score}%</strong></div><div><span style={reportEyebrow}>Confidence level</span><strong style={{ ...attentionScore, fontSize: '1.25rem' }}>{confidence.confidence_level}</strong></div></div><div style={{ display: 'grid', gap: 10, marginTop: 16 }}>{[['Eye contact', confidence.components?.eye_contact_percentage], ['Attention', confidence.components?.attention_score], ['Engagement', confidence.components?.engagement_score], ['Communication signal', confidence.components?.communication_signal]].map(([label, value]) => <ProgressRow key={label} label={label} value={value} />)}</div></> : <p style={muted}>Confidence indicators are not available because there were not enough observable signals.</p>}<p style={disclaimer}>Confidence is an estimated indicator based on observable interview behavior such as eye contact, attention, engagement, and communication. It does not measure a person's actual internal confidence or personality.</p></ReportCard>}

    <ReportCard title="Emotion analysis">{emotion?.status === 'success' ? <><div style={dominantEmotion}><span>Dominant emotion</span><strong>{emotion.dominant_emotion}</strong></div><div style={{ display: 'grid', gap: 8, marginTop: 14 }}>{Object.entries(emotion.emotion_distribution || {}).map(([label, value]) => <ProgressRow key={label} label={label} value={Math.round(value * 100)} />)}</div></> : <p style={muted}>Emotion analysis is unavailable because no face was detected in the saved recording.</p>}</ReportCard>

    <div style={reportGrid}><ReportCard title="Strengths"><FeedbackList items={feedback.strengths} empty="No strengths were generated." tone="#86efac" /></ReportCard><ReportCard title="Improve next"><FeedbackList items={feedback.improvements} empty="No improvement suggestions were generated." tone="#fbbf24" /></ReportCard></div>
    <p style={disclaimer}>Eye contact and expression are local visual signals, not emotion, honesty, or personality judgements.</p>
    <button className="btn btn-primary" style={full} onClick={onClose}>Close report</button>
  </div>
}

function RecordingPreview({ interviewId, available }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!available) return undefined
    let objectUrl = ''
    const loadRecording = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
        const response = await fetch(`${apiUrl}/interviews/${interviewId}/recording`, { headers: { Authorization: `Bearer ${localStorage.getItem('smarthire_token')}` } })
        if (!response.ok) throw new Error('Interview recording unavailable')
        objectUrl = URL.createObjectURL(await response.blob())
        setUrl(objectUrl)
      } catch (err) { setError(err.message) }
    }
    loadRecording()
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [available, interviewId])

  if (!available || error) return <p style={muted}>Interview recording unavailable</p>
  if (!url) return <p style={muted}>Loading secure recording…</p>
  return <video controls preload="metadata" style={recordingVideo}><source src={url} />Your browser cannot play this interview recording.</video>
}

function ReportCard({ title, children }) { return <section style={reportCard}><h4 style={{ ...sectionTitle, marginTop: 0 }}>{title}</h4>{children}</section> }
function MetricCard({ label, value, accent }) { return <div style={{ ...metricCard, borderColor: accent ? `${accent}66` : 'rgba(129,140,248,.25)' }}><span>{label}</span><strong style={accent ? { color: accent } : undefined}>{value}</strong></div> }
function MetricLine({ label, value }) { return <div style={scoreRow}><span>{label}</span><strong>{value}</strong></div> }
function ProgressRow({ label, value }) { const numericValue = Number(value) || 0; return <div style={progressRow}><span style={{ textTransform: 'capitalize' }}>{label}</span><div style={progressValue}><div style={progressTrack}><div style={{ ...progressFill, width: `${Math.max(0, Math.min(100, numericValue))}%` }} /></div><strong>{numericValue}%</strong></div></div> }
function FeedbackList({ items, empty, tone }) { return items?.length ? <ul style={{ ...feedbackList, color: tone }}>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p style={muted}>{empty}</p> }
function CameraPreview({ stream, onMonitoring }) {
  const video = useRef(null)

  const summary = useRef({
    monitoring_checks: 0,
    face_visible_checks: 0,
    eye_contact_checks: 0,
    gaze_left_checks: 0,
    gaze_right_checks: 0,
    gaze_down_checks: 0,
    eyes_closed_checks: 0,
    multiple_face_events: 0,
    off_camera_events: 0,
    expression_signal: 'not available'
  })

  const onMonitoringRef = useRef(onMonitoring)

  const [status, setStatus] = useState('Checking camera…')

  useEffect(() => {
    onMonitoringRef.current = onMonitoring
  }, [onMonitoring])

  useEffect(() => {
    if (video.current && stream) {
      video.current.srcObject = stream
    }
  }, [stream])

  useEffect(() => {
    if (!stream) return undefined

    let landmarker
    let timer
    let active = true

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

    const getIrisHorizontalRatio = (landmarks, irisIndices, leftCorner, rightCorner) => {
      const irisPoints = irisIndices
        .map((index) => landmarks[index])
        .filter(Boolean)

      if (!irisPoints.length) return null

      const irisX =
        irisPoints.reduce((sum, point) => sum + point.x, 0) /
        irisPoints.length

      const eyeLeft = landmarks[leftCorner]
      const eyeRight = landmarks[rightCorner]

      if (!eyeLeft || !eyeRight) return null

      const minX = Math.min(eyeLeft.x, eyeRight.x)
      const maxX = Math.max(eyeLeft.x, eyeRight.x)

      const width = maxX - minX

      if (width <= 0.001) return null

      return clamp((irisX - minX) / width, 0, 1)
    }

    const getEyeOpenness = (landmarks, topIndex, bottomIndex, leftIndex, rightIndex) => {
      const top = landmarks[topIndex]
      const bottom = landmarks[bottomIndex]
      const left = landmarks[leftIndex]
      const right = landmarks[rightIndex]

      if (!top || !bottom || !left || !right) return null

      const verticalDistance = Math.abs(top.y - bottom.y)
      const horizontalDistance = Math.abs(left.x - right.x)

      if (horizontalDistance <= 0.001) return null

      return verticalDistance / horizontalDistance
    }

    const check = () => {
      if (!active || !video.current || video.current.readyState < 2 || !landmarker) {
        return
      }

      const result = landmarker.detectForVideo(
        video.current,
        performance.now()
      )

      summary.current.monitoring_checks += 1

      const faces = result.faceLandmarks || []

      if (faces.length === 0) {
        summary.current.off_camera_events += 1
        setStatus('Face not visible')
        onMonitoringRef.current?.({ ...summary.current })
        return
      }

      if (faces.length > 1) {
        summary.current.multiple_face_events += 1
        setStatus('Multiple faces')
        onMonitoringRef.current?.({ ...summary.current })
        return
      }

      const landmarks = faces[0]
      summary.current.face_visible_checks += 1

      const leftEyeRatio = getIrisHorizontalRatio(
        landmarks,
        [468, 469, 470, 471, 472],
        33,
        133
      )

      const rightEyeRatio = getIrisHorizontalRatio(
        landmarks,
        [473, 474, 475, 476, 477],
        362,
        263
      )

      const leftOpenness = getEyeOpenness(
        landmarks,
        159,
        145,
        33,
        133
      )

      const rightOpenness = getEyeOpenness(
        landmarks,
        386,
        374,
        362,
        263
      )

      const eyesClosed =
        leftOpenness !== null &&
        rightOpenness !== null &&
        leftOpenness < 0.20 &&
        rightOpenness < 0.20

      if (eyesClosed) {
        summary.current.eyes_closed_checks += 1
        setStatus('Eyes closed')
        onMonitoringRef.current?.({ ...summary.current })
        return
      }

      if (leftEyeRatio === null || rightEyeRatio === null) {
        setStatus('Eye tracking unavailable')
        onMonitoringRef.current?.({ ...summary.current })
        return
      }

      const averageEyeRatio = (leftEyeRatio + rightEyeRatio) / 2

      let gaze = 'center'

      if (averageEyeRatio < 0.40) {
        gaze = 'right'
      } else if (averageEyeRatio > 0.60) {
        gaze = 'left'
      }

      const irisPoints = [
        ...[468, 469, 470, 471, 472],
        ...[473, 474, 475, 476, 477]
      ]
        .map((index) => landmarks[index])
        .filter(Boolean)

      const averageIrisY =
        irisPoints.reduce((sum, point) => sum + point.y, 0) /
        irisPoints.length

      const eyeTopY = Math.min(
        landmarks[159]?.y ?? averageIrisY,
        landmarks[386]?.y ?? averageIrisY
      )

      const eyeBottomY = Math.max(
        landmarks[145]?.y ?? averageIrisY,
        landmarks[374]?.y ?? averageIrisY
      )

      const eyeHeight = eyeBottomY - eyeTopY

      const verticalRatio =
        eyeHeight > 0.001
          ? (averageIrisY - eyeTopY) / eyeHeight
          : 0.5

      if (verticalRatio > 0.65) {
        gaze = 'down'
      }

      if (gaze === 'center') {
        summary.current.eye_contact_checks += 1
        setStatus('Looking at camera')
      } else if (gaze === 'left') {
        summary.current.gaze_left_checks += 1
        summary.current.off_camera_events += 1
        setStatus('Looking left')
      } else if (gaze === 'right') {
        summary.current.gaze_right_checks += 1
        summary.current.off_camera_events += 1
        setStatus('Looking right')
      } else if (gaze === 'down') {
        summary.current.gaze_down_checks += 1
        summary.current.off_camera_events += 1
        setStatus('Looking down')
      }

      const smile =
        (result.faceBlendshapes?.[0]?.categories || [])
          .filter((item) => item.categoryName.includes('mouthSmile'))
          .reduce((sum, item) => sum + item.score, 0)

      summary.current.expression_signal =
        smile > 0.45
          ? 'positive expression signal'
          : 'neutral expression signal'

      onMonitoringRef.current?.({ ...summary.current })
    }

    const setup = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )

        landmarker = await FaceLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task'
            },
            runningMode: 'VIDEO',
            numFaces: 2,
            outputFaceBlendshapes: true
          }
        )

        timer = setInterval(check, 500)
      } catch (error) {
        console.error('Eye tracking setup failed:', error)
        setStatus('Eye tracking unavailable')
      }
    }

    setup()

    return () => {
      active = false
      clearInterval(timer)
      landmarker?.close()
    }
  }, [stream])

  return (
    <div style={cameraPreview}>
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)'
        }}
      />

      <span style={cameraLabel}>
        ● {status}
      </span>
    </div>
  )
}
const overlay = { position: 'fixed', inset: 0, zIndex: 2000, overflowY: 'auto', display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(0,0,0,.72)' }; const card = { width: '100%', maxWidth: 650, borderRadius: 20, padding: 28, margin: 'auto' }; const reportModalCard = { ...card, maxWidth: 1040 }; const title = { color: '#f0f0ff', fontFamily: 'Outfit', display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }; const muted = { color: '#a0a0c0', lineHeight: 1.6 }; const close = { float: 'right', background: 'transparent', color: '#a0a0c0' }; const full = { width: '100%', justifyContent: 'center', marginTop: 18 }; const errorStyle = { color: '#f87171', marginTop: 12 }; const notice = { padding: 15, marginTop: 18, borderRadius: 12, background: 'rgba(99,102,241,.10)', border: '1px solid rgba(129,140,248,.35)', color: '#f0f0ff' }; const timerBar = { display: 'flex', justifyContent: 'space-between', padding: '10px 14px', marginBottom: 14, borderRadius: 10, background: 'rgba(99,102,241,.18)', color: '#c7d2fe', fontWeight: 800 }; const meta = { display: 'flex', justifyContent: 'space-between', color: '#a0a0c0', marginBottom: 12 }; const controls = { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }; const questionBox = { padding: 20, borderRadius: 14, background: 'rgba(99,102,241,.10)', border: '1px solid rgba(129,140,248,.35)', color: '#f0f0ff', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 8 }; const liveTranscriptBox = { padding: '8px 14px', borderRadius: 8, background: 'rgba(34,197,94,.10)', border: '1px solid rgba(134,239,172,.3)', color: '#bbf7d0', fontSize: '.9rem', fontStyle: 'italic', marginBottom: 12 }; const warningBox = { padding: 12, borderRadius: 10, marginBottom: 12, background: 'rgba(127,29,29,.9)', color: '#fee2e2' }; const scoreRow = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', color: '#dadaeb', borderBottom: '1px solid rgba(255,255,255,.08)' }; const sectionTitle = { color: '#f0f0ff', marginTop: 18, marginBottom: 8 }; const cameraPreview = { position: 'fixed', right: 22, bottom: 22, zIndex: 2100, width: 170, height: 128, overflow: 'hidden', borderRadius: 12, background: '#11111c', border: '2px solid rgba(129,140,248,.8)' }; const cameraLabel = { position: 'absolute', left: 8, bottom: 7, padding: '3px 7px', borderRadius: 6, background: 'rgba(0,0,0,.7)', color: '#d9f99d', fontSize: '.7rem' }
const reportLayout = { display: 'grid', gap: 18 }; const reportHeader = { display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 18, borderBottom: '1px solid rgba(129,140,248,.25)' }; const reportEyebrow = { margin: 0, color: '#a5b4fc', fontSize: '.75rem', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }; const reportTitle = { color: '#f0f0ff', fontFamily: 'Outfit', fontSize: '1.7rem', margin: '5px 0' }; const overallScore = { minWidth: 160, padding: '13px 18px', borderRadius: 14, textAlign: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,.24), rgba(139,92,246,.14))', border: '1px solid rgba(129,140,248,.4)', display: 'grid', gap: 2, color: '#c7d2fe' }; const overallScoreValue = { color: '#67e8f9', fontSize: '2.1rem', lineHeight: 1 }; const reportGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }; const reportCard = { padding: '16px 18px', borderRadius: 14, background: 'rgba(20,20,36,.78)', border: '1px solid rgba(129,140,248,.25)' }; const metricGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }; const metricCard = { display: 'grid', gap: 6, padding: '12px 13px', borderRadius: 11, background: 'rgba(99,102,241,.08)', border: '1px solid', color: '#a0a0c0', textTransform: 'capitalize', fontSize: '.82rem' }; const compactList = { display: 'grid', gap: 2 }; const recordingVideo = { display: 'block', width: '100%', maxHeight: 260, borderRadius: 10, background: '#05050c' }; const attentionTop = { display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'end' }; const attentionScore = { display: 'block', color: '#67e8f9', fontSize: '2rem', marginTop: 4, textTransform: 'capitalize' }; const behaviorTop = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 22, alignItems: 'center' }; const behaviorMetrics = { display: 'grid', gap: 2 }; const dominantEmotion = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 13px', borderRadius: 10, background: 'rgba(103,232,249,.08)', color: '#b5b5d6' }; const progressRow = { display: 'grid', gridTemplateColumns: 'minmax(90px, .8fr) minmax(140px, 1.2fr)', alignItems: 'center', gap: 12, fontSize: '.85rem', color: '#c8c8e2' }; const progressValue = { display: 'flex', alignItems: 'center', gap: 9 }; const progressTrack = { flex: 1, height: 7, overflow: 'hidden', borderRadius: 99, background: 'rgba(255,255,255,.09)' }; const progressFill = { height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #6366f1, #67e8f9)' }; const feedbackList = { margin: 0, paddingLeft: 18, display: 'grid', gap: 9, lineHeight: 1.45 }; const disclaimer = { ...muted, fontSize: '.76rem', margin: 0 }
const ROLE_OPTIONS = ['Software Developer', 'Web Developer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Analyst', 'Data Scientist', 'Machine Learning Engineer', 'AI Engineer', 'DevOps Engineer']; const setupGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }; const fieldHint = { ...muted, margin: 0, padding: '9px 11px', borderRadius: 9, background: 'rgba(255,255,255,.03)', fontSize: '.76rem' }; const deviceCard = { padding: 15, marginTop: 18, borderRadius: 12, background: 'rgba(99,102,241,.08)', border: '1px solid rgba(129,140,248,.28)' }; const deviceRow = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', color: '#dadaeb', borderBottom: '1px solid rgba(255,255,255,.07)', fontSize: '.88rem' }
