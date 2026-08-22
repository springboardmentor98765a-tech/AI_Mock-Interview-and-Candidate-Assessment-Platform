import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Video, VideoOff, Clock, ChevronRight, ChevronLeft,
  BarChart3, CheckCircle, AlertTriangle, ArrowLeft, Volume2, Eye,
  FileText, TrendingUp, Shield, Activity, Zap, Brain, Star, Loader,
  RefreshCw, Award, Target, ChevronDown, ChevronUp
} from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import interviewApi from '../services/interviewApi'
import recordingApi from '../services/recordingApi'
import resumeApi from '../services/resumeApi'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useLocalSpeechRecognition } from '../hooks/useLocalSpeechRecognition'
import { useVideoRecorder } from '../hooks/useVideoRecorder'
import AiAvatar from '../components/AiAvatar'
import ProgressiveSubtitle from '../components/ProgressiveSubtitle'
import '../styles/mock-interview.css'
import '../styles/speech.css'
import '../styles/conversational-interview.css'

const VOICE_COMMANDS = [
  'move to the next question',
  'move to next question',
  'move on to the next question',
  'move on to next question',
  "let's move to the next question",
  "lets move to the next question",
  "let's move on",
  "lets move on",
  'skip this question',
  'skip the question',
  'skip question',
  'next question',
  'go to the next question',
  'go to next question',
  'next',
  'skip',
]

function extractVoiceCommand(rawText) {
  if (!rawText) return { isCommand: false, cleanedAnswer: '' }
  const trimmed = rawText.trim().replace(/[\.\!\?]+$/, '').trim()
  const lower = trimmed.toLowerCase()

  for (const cmd of VOICE_COMMANDS) {
    if (lower === cmd || lower === `please ${cmd}`) {
      return { isCommand: true, cleanedAnswer: '(Skipped by candidate)' }
    }
    if (lower.endsWith(` ${cmd}`)) {
      const idx = lower.lastIndexOf(cmd)
      const substantive = trimmed.slice(0, idx).trim().replace(/[\.\!\?,]+$/, '').trim()
      return { isCommand: true, cleanedAnswer: substantive || '(Skipped by candidate)' }
    }
  }

  return { isCommand: false, cleanedAnswer: rawText.trim() }
}

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function ScoreBar({ label, value }) {
  const v     = Math.min(100, Math.max(0, value || 0))
  const color = v >= 80 ? '#10b981' : v >= 65 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{v}/100</span>
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${v}%`, background: color }} />
      </div>
    </div>
  )
}

function LoadingCard({ title, subtitle }) {
  return (
    <div className="mi-page">
      <div className="mi-intro-card" style={{ textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="mi-intro-icon" style={{ margin: '0 auto 20px' }}>
            <Loader size={32} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{subtitle}</p>
          <div style={{ marginTop: 24 }}>
            <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), #8b5cf6)', borderRadius: 2 }}
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function MockInterview() {
  const { user }   = useAuth()
  const navigate   = useNavigate()

  const [phase, setPhase]               = useState('setup')
  const [setupStep, setSetupStep]       = useState('resume')

  const [resumeHistory, setResumeHistory]       = useState([])
  const [selectedResumeId, setSelectedResumeId] = useState(null)
  const [recommendedRoles, setRecommendedRoles] = useState([])
  const [selectedRole, setSelectedRole]         = useState('')
  const [interviewType, setInterviewType]       = useState('Mixed')
  const [difficulty, setDifficulty]             = useState('Medium')
  const [questionCount, setQuestionCount]       = useState(10)

  const [interviewId, setInterviewId]   = useState(null)
  const [questions, setQuestions]       = useState([])
  const [answers, setAnswers]           = useState({})
  const [currentQ, setCurrentQ]         = useState(0)
  const [timeLeft, setTimeLeft]         = useState(120)
  const [totalTime, setTotalTime]       = useState(0)
  const [micOn, setMicOn]               = useState(true)
  const [camOn, setCamOn]               = useState(true)
  const [answered, setAnswered]         = useState([])
  const [activeTab, setActiveTab]       = useState('feedback')
  const [sessionStatus, setSessionStatus] = useState('active') // 'active' | 'paused'
  const [cameraStatus,  setCameraStatus]  = useState('inactive') // 'inactive'|'initializing'|'active'|'denied'|'unavailable'
  const [cameraError,   setCameraError]   = useState('')
  const [uploadState,   setUploadState]   = useState('idle') // 'idle'|'uploading'|'done'|'failed'
  const [uploadError,   setUploadError]   = useState('')

  // Video recorder — isolated from STT pipeline
  const videoRecorder = useVideoRecorder()

  const [evalResult, setEvalResult]     = useState(null)
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [sttStatusMsg, setSttStatusMsg] = useState('')

  const [sttMode, setSttMode] = useState(
    () => (typeof window !== 'undefined' && !!window.MediaRecorder) ? 'local' : 'browser'
  )

  const timerRef          = useRef(null)
  const totalRef          = useRef(null)
  const audioRef          = useRef(null)
  const finalTextRef      = useRef('')

  // Camera
  const videoRef            = useRef(null)
  const cameraStreamRef     = useRef(null)

  // Timestamp-based timing
  const interviewStartMsRef = useRef(0)   // Date.now() when interview phase starts
  const totalPausedMsRef    = useRef(0)   // accumulated pause ms for total duration
  const pauseStartMsRef     = useRef(0)   // when current pause began
  const qStartMsRef         = useRef(0)   // Date.now() when current question starts
  const qPausedMsRef        = useRef(0)   // pause ms accumulated for current question
  const qTimeTakenRef       = useRef({})  // { [questionId]: seconds } — actual time spent answering

  const handleFinishRef        = useRef(null)
  const submitAnswerRef        = useRef(null)
  const handleNextRef          = useRef(null)
  const startListeningRef      = useRef(null)
  const stopListeningRef       = useRef(null)
  const resetTranscriptRef     = useRef(null)
  const startCountdownRef         = useRef(null)
  const resumeCountdownRef        = useRef(null)
  const sttSupportedRef           = useRef(false)
  const browserSttDebounceRef     = useRef(null)
  const lastBrowserSttTextRef     = useRef('')
  const sttModeRef             = useRef(sttMode)
  const localSttPendingNextRef = useRef(false)
  const localSttStateRef       = useRef('idle')
  const voiceCommandTriggeredRef = useRef(false)
  // Stores {audio_duration_s, segments_meta} from the most recent Faster-Whisper response
  // Used by submitAnswerToBackend to send real speech metadata for analysis
  const sttMetaRef             = useRef(null)


  const [ttsLoading, setTtsLoading] = useState(false)
  const [ttsPlaying, setTtsPlaying] = useState(false)
  const [ttsFailed, setTtsFailed]   = useState(false)

  const saveAnswer = useCallback((questionId, text) => {
    setAnswers(prev => ({ ...prev, [questionId]: text }))
  }, [])

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop())
      cameraStreamRef.current = null
      console.log('[CAMERA] Stream stopped')
    }
    setCameraStatus('inactive')
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const handleFinish = useCallback(async () => {
    clearInterval(timerRef.current)
    clearInterval(totalRef.current)
    const activeMs      = Date.now() - interviewStartMsRef.current - totalPausedMsRef.current
    const finalDuration = Math.floor(activeMs / 1000)

    // Stop STT so it doesn't interfere during upload
    stopListeningRef.current?.()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }

    // Stop video recorder and collect blob (non-blocking on failure)
    let videoBlob = null
    try {
      videoBlob = await videoRecorder.stop()
    } catch (recErr) {
      console.warn('[VideoRecorder] Stop failed (non-fatal):', recErr.message)
    }

    stopCamera()
    setPhase('evaluating')

    const answerPayload = questions.map(q => {
      const timeTaken = qTimeTakenRef.current[q.id] || 0
      return {
        questionId: q.id,
        answer:     answers[q.id] || '',
        timeTaken,
      }
    })

    // Run evaluation and recording upload in parallel — results never blocked by upload failure
    let evalData = null
    let evalErr  = null
    try {
      const data = await interviewApi.complete({
        interviewId,
        answers: answerPayload,
        duration: finalDuration || totalTime,
      })
      evalData = data.result
    } catch (err) {
      evalErr = err.message
    }

    // Upload video recording if we have one
    if (videoBlob && videoBlob.size > 0 && interviewId) {
      setUploadState('uploading')
      const endTime = new Date().toISOString()
      try {
        await recordingApi.uploadRecording({
          interviewId,
          blob:          videoBlob,
          recordingType: 'video',
          startTime:     videoRecorder.startTime,
          endTime,
          duration:      finalDuration || totalTime,
          mimeType:      videoBlob.type,
        })
        console.log('[VideoRecorder] Upload complete')
        setUploadState('done')
      } catch (uploadErr) {
        console.warn('[VideoRecorder] Upload failed (non-fatal — results preserved):', uploadErr.message)
        setUploadState('failed')
        setUploadError(uploadErr.message)
      }
    } else {
      setUploadState('done')
    }

    // Show results regardless of upload outcome
    if (evalErr) setError(evalErr)
    setEvalResult(evalData)
    setPhase('results')
  }, [interviewId, questions, answers, totalTime, stopCamera, videoRecorder])

  useEffect(() => { handleFinishRef.current = handleFinish }, [handleFinish])

  const submitAnswerToBackend = useCallback(async (finalAns) => {
    const q = questions[currentQ]
    if (!q || !interviewId) return

    const trimmedAns = (finalAns || '').trim()
    if (!trimmedAns) {
      console.warn('[ANSWER] transcript rejected: Empty answer passed to submitAnswerToBackend. Aborting submission to prevent empty answer progression.')
      setTtsLoading(false)
      setTtsPlaying(false)
      setTtsFailed(false)
      return
    }

    console.log(`[ANSWER] submitAnswer called for question #${currentQ + 1} (${trimmedAns.split(/\s+/).length} words)`)
    setAnswers(prev => ({ ...prev, [q.id]: trimmedAns }))

    setTtsLoading(true)
    setTtsPlaying(false)
    setTtsFailed(false)

    // Read and clear STT metadata from ref (populated by localSttOnComplete)
    const currentSttMeta = sttMetaRef.current
    sttMetaRef.current = null

    try {
      const actualTimeTaken = 120 - timeLeft
      // Record into the ref map so handleFinish can use it too
      qTimeTakenRef.current[q.id] = actualTimeTaken
      const resData = await interviewApi.submitAnswer({
        interviewId,
        questionId: q.id,
        answer: trimmedAns,
        timeTaken: actualTimeTaken,
        // Speech analysis metadata — sent to backend for per-answer analysis
        audioDurationS: currentSttMeta?.audio_duration_s ?? null,
        segmentsMeta:   currentSttMeta?.segments_meta   ?? [],
      })

      console.log('[QUESTION] advancing to next question')
      setSttStatusMsg('')
      voiceCommandTriggeredRef.current = false
      if (resData?.response?.text) {
        console.log('[FLOW] Adaptive response received:', resData.response.text.slice(0, 60))
        if (currentQ < questions.length - 1) {
          setQuestions(prevQ => {
            const nextArr = [...prevQ]
            nextArr[currentQ + 1] = { ...nextArr[currentQ + 1], question: resData.response.text }
            return nextArr
          })
          setCurrentQ(c => c + 1)
          setTimeLeft(120)
        } else {
          handleFinishRef.current?.()
        }
      } else {
        if (currentQ < questions.length - 1) {
          setCurrentQ(c => c + 1)
          setTimeLeft(120)
        } else {
          handleFinishRef.current?.()
        }
      }
    } catch (err) {
      console.warn('[Pipeline] Error submitting answer:', err.message)
      setTtsLoading(false)
      if (currentQ < questions.length - 1) {
        setCurrentQ(c => c + 1)
        setTimeLeft(120)
      } else {
        handleFinishRef.current?.()
      }
    }
  }, [interviewId, currentQ, questions, timeLeft])


  useEffect(() => { submitAnswerRef.current = submitAnswerToBackend }, [submitAnswerToBackend])

  const sttOnSilence = useCallback(() => {
    const rawActive = (finalTextRef.current || '').trim()
    if (rawActive) {
      stopListeningRef.current?.()
      const { isCommand, cleanedAnswer } = extractVoiceCommand(rawActive)
      const finalSubstantiveAnswer = isCommand ? cleanedAnswer : rawActive
      console.log(`[ANSWER] transcript accepted from silence: "${finalSubstantiveAnswer.slice(0, 80)}"`)
      submitAnswerRef.current?.(finalSubstantiveAnswer)
    } else {
      console.log('[STT] Silence detected with no speech transcript — continuing to listen')
    }
  }, [])

  const {
    transcript:         _bTranscript,
    interimTranscript:  _bInterimTranscript,
    isListening:        _bIsListening,
    isPaused:           _bIsPaused,
    isSupported:        sttSupported,
    micState:           _bMicState,
    confidence:         _bConfidence,
    error:              sttError,
    startListening:     _bStartListening,
    stopListening:      _bStopListening,
    pauseListening,
    resumeListening,
    resetTranscript:    _bResetTranscript,
  } = useSpeechRecognition({ onSilence: sttOnSilence, silenceTimeout: 4000 })

  const localSttOnComplete = useCallback((text, sttMeta) => {
    if (!localSttPendingNextRef.current) return
    localSttPendingNextRef.current = false

    // Store STT metadata so submitAnswerToBackend can forward it to the backend
    if (sttMeta && sttMeta.audio_duration_s) {
      sttMetaRef.current = sttMeta
      console.log(`[SpeechAnalysis] STT meta received: duration=${sttMeta.audio_duration_s}s segments=${sttMeta.segments_meta?.length ?? 0}`)
    }

    // Resilient fallback: If Whisper returns empty, use live browser transcript or active text captured during speech
    const rawCandidateText = (text && text.trim()) || (_bTranscript && _bTranscript.trim()) || (finalTextRef.current && finalTextRef.current.trim()) || ''

    if (!rawCandidateText) {
      console.warn('[ANSWER] transcript rejected: STT produced empty transcript. Keeping candidate on current question.')
      setSttStatusMsg('Could not hear your answer. Please speak clearly into your microphone.')
      setTtsLoading(false)
      setTtsPlaying(false)
      setTtsFailed(false)
      return
    }

    const { isCommand, cleanedAnswer } = extractVoiceCommand(rawCandidateText)
    const finalSubstantiveAnswer = isCommand ? cleanedAnswer : rawCandidateText

    console.log(`[ANSWER] transcript accepted: "${finalSubstantiveAnswer.slice(0, 80)}" (${finalSubstantiveAnswer.split(/\s+/).length} words)`)
    setSttStatusMsg('')
    resetTranscriptRef.current?.()
    setTtsLoading(false)
    setTtsPlaying(false)
    setTtsFailed(false)
    submitAnswerRef.current?.(finalSubstantiveAnswer)
  }, [_bTranscript])


  // Called by the hook right before silence-detection fires mr.stop().
  const localSttOnAutoStop = useCallback(() => {
    localSttPendingNextRef.current = true
    setAnswered(a => [...new Set([...a, currentQ])])
    // Stop browser STT too — we're done recording
    try { _bStopListening() } catch (_) {}
  }, [currentQ, _bStopListening])

  const localStt = useLocalSpeechRecognition({
    onComplete: localSttOnComplete,
    onAutoStop: localSttOnAutoStop,
  })

  // Authoritative final transcript: from Whisper in local mode, from browser STT otherwise
  const transcript = sttMode === 'local' ? localStt.transcript : _bTranscript

  // Live interim text: during recording show browser STT (if available), otherwise show hook status
  const interimTranscript = sttMode === 'local'
    ? (localStt.micState === 'recording'
      ? (sttSupported
        ? ((_bTranscript || '') + (_bInterimTranscript ? ' ' + _bInterimTranscript : '')).trim() || 'Listening...'
        : localStt.interimTranscript)
      : localStt.interimTranscript)
    : _bInterimTranscript

  const isListening = sttMode === 'local' ? localStt.isListening : _bIsListening
  const isPaused    = sttMode === 'local' ? localStt.isPaused    : _bIsPaused
  const micState    = sttMode === 'local' ? localStt.micState    : _bMicState
  const confidence  = sttMode === 'local' ? null                 : _bConfidence

  // Combined start: starts local recording AND browser STT simultaneously
  const startListeningCombined = useCallback(() => {
    localStt.startListening()
    if (sttSupported) {
      try {
        _bResetTranscript()
        _bStartListening()
        console.log('[LiveSTT] Started (browser SpeechRecognition for live display)')
      } catch (e) {
        console.warn('[LiveSTT] Browser STT start failed (non-fatal):', e.message)
      }
    }
  }, [localStt.startListening, sttSupported, _bStartListening, _bResetTranscript])

  // Combined stop: stops both
  const stopListeningCombined = useCallback(() => {
    localStt.stopListening()
    try { _bStopListening() } catch (_) {}
  }, [localStt.stopListening, _bStopListening])

  // Combined reset: resets both
  const resetTranscriptCombined = useCallback(() => {
    localStt.resetTranscript()
    try { _bResetTranscript() } catch (_) {}
    lastBrowserSttTextRef.current = ''
  }, [localStt.resetTranscript, _bResetTranscript])

  const startListening  = sttMode === 'local' ? startListeningCombined  : _bStartListening
  const stopListening   = sttMode === 'local' ? stopListeningCombined   : _bStopListening
  const resetTranscript = sttMode === 'local' ? resetTranscriptCombined : _bResetTranscript

  useEffect(() => { localSttStateRef.current = localStt.micState }, [localStt.micState])
  useEffect(() => { sttModeRef.current = sttMode }, [sttMode])

  useEffect(() => {
    startListeningRef.current  = startListening
    stopListeningRef.current   = stopListening
    resetTranscriptRef.current = resetTranscript
  }, [startListening, stopListening, resetTranscript])

  useEffect(() => {
    sttSupportedRef.current = sttMode === 'local' ? localStt.isSupported : sttSupported
  }, [sttMode, localStt.isSupported, sttSupported])

  useEffect(() => {
    if (!localStt.error) return
    if (sttMode === 'local' && sttSupported) {
      console.warn('[STT] Local STT error — switching to browser fallback:', localStt.error)
      setSttMode('browser')
    }
  }, [localStt.error, sttMode, sttSupported])

  useEffect(() => {
    resumeApi.getHistory()
      .then(d => setResumeHistory(d.resumes || []))
      .catch(() => setResumeHistory([]))
  }, [])

  useEffect(() => {
    if (phase === 'interview') {
      // Timestamp-based total duration — accurate through re-renders and pauses
      totalRef.current = setInterval(() => {
        if (interviewStartMsRef.current === 0) return
        const activeMs = Date.now() - interviewStartMsRef.current - totalPausedMsRef.current
        setTotalTime(Math.floor(activeMs / 1000))
      }, 500)
    }
    return () => clearInterval(totalRef.current)
  }, [phase])

  const handleRecommendRoles = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      if (!selectedResumeId) {
        setSetupStep('role')
        setLoading(false)
        return
      }
      const resume = resumeHistory.find(r => r.id === selectedResumeId)
      const analysisId = resume?.analysis?.id
      if (!analysisId) {
        setSetupStep('role')
        setLoading(false)
        return
      }
      const data = await interviewApi.recommendRoles(analysisId)
      setRecommendedRoles(data.roles || [])
      setSetupStep('role')
    } catch (err) {
      setError(err.message)
      setSetupStep('role')
    } finally {
      setLoading(false)
    }
  }, [selectedResumeId, resumeHistory])

  const questionCountNum = Number(questionCount)
  const questionCountError = useMemo(() => {
    if (questionCount === '' || questionCount === null || questionCount === undefined) {
      return 'Please enter number of questions'
    }
    if (isNaN(questionCountNum) || !Number.isInteger(questionCountNum) || questionCountNum < 1) {
      return 'Must be at least 1 question'
    }
    if (questionCountNum > 50) {
      return 'Maximum is 50 questions'
    }
    return ''
  }, [questionCount, questionCountNum])

  const handleGenerateInterview = useCallback(async () => {
    if (!selectedRole) { setError('Please select a role'); return }
    const countNum = parseInt(questionCount, 10)
    if (isNaN(countNum) || countNum < 1) {
      setError('Please enter a valid number of questions (minimum 1)')
      return
    }
    setError('')
    setLoading(true)
    try {
      const resume = resumeHistory.find(r => r.id === selectedResumeId)
      const analysisId = resume?.analysis?.id || null

      const data = await interviewApi.generate({
        resumeAnalysisId: analysisId,
        selectedRole,
        interviewType,
        difficulty,
        questionCount: countNum,
      })
      setInterviewId(data.interview.id)
      setQuestions(data.questions)
      setPhase('intro')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedRole, selectedResumeId, resumeHistory, interviewType, difficulty, questionCount])

  const handleStartInterview = useCallback(async () => {
    try {
      await interviewApi.start(interviewId)
    } catch (_) {}
    interviewStartMsRef.current = Date.now()
    totalPausedMsRef.current    = 0
    pauseStartMsRef.current     = 0
    qPausedMsRef.current        = 0
    setSessionStatus('active')
    setUploadState('idle')
    setUploadError('')
    console.log('[SESSION] Interview started, timestamp anchored')
    // Start video recording from the live camera stream (if available)
    if (cameraStreamRef.current && cameraStreamRef.current.active) {
      videoRecorder.start(cameraStreamRef.current)
    } else {
      console.warn('[VideoRecorder] Camera stream not available at interview start — skipping video recording')
    }
    setPhase('interview')
  }, [interviewId, videoRecorder])

  const handleNext = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    const activeText = (transcript || '').trim() || (finalTextRef.current || '').trim() || (_bTranscript || '').trim()
    if (sttModeRef.current === 'local' && localSttStateRef.current === 'recording') {
      localSttPendingNextRef.current = true
      setAnswered(a => [...new Set([...a, currentQ])])
      stopListeningRef.current?.()
      return
    }
    stopListeningRef.current?.()
    if (activeText) {
      console.log(`[ANSWER] transcript accepted from manual submit: "${activeText.slice(0, 60)}"`)
      resetTranscriptRef.current?.()
      setTtsLoading(false)
      setTtsPlaying(false)
      setTtsFailed(false)
      setAnswered(a => [...new Set([...a, currentQ])])
      submitAnswerRef.current?.(activeText)
    } else {
      console.warn('[ANSWER] transcript rejected: No answer provided when Next clicked. Prompting candidate.')
      setSttStatusMsg('No speech detected. Please speak clearly into your microphone or click "Speak Now".')
    }
  }, [currentQ, transcript, _bTranscript])

  useEffect(() => { handleNextRef.current = handleNext }, [handleNext])

  // Timestamp-based per-question countdown — resets qStartMs and qPausedMs for this question
  const startCountdown = useCallback(() => {
    qStartMsRef.current  = Date.now()
    qPausedMsRef.current = 0
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const elapsed    = Math.floor((Date.now() - qStartMsRef.current - qPausedMsRef.current) / 1000)
      const remaining  = Math.max(0, 120 - elapsed)
      setTimeLeft(remaining)
      // Record elapsed time for the current question into the map
      const q = questions[currentQ]
      if (q) qTimeTakenRef.current[q.id] = elapsed
      if (remaining <= 0) {
        clearInterval(timerRef.current)
        const finalActive = (transcript || '').trim() || (finalTextRef.current || '').trim() || (_bTranscript || '').trim()
        if (finalActive) {
          submitAnswerRef.current?.(finalActive)
        } else {
          console.warn('[Timer] 120s time limit expired with no answer — submitting timeout indicator')
          submitAnswerRef.current?.('[No answer provided - time limit expired]')
        }
      }
    }, 500)
  }, [questions, currentQ, transcript, _bTranscript])

  // Resume countdown without resetting qStartMs (used after unpause)
  const resumeCountdown = useCallback(() => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const elapsed    = Math.floor((Date.now() - qStartMsRef.current - qPausedMsRef.current) / 1000)
      const remaining  = Math.max(0, 120 - elapsed)
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearInterval(timerRef.current)
        const finalActive = (transcript || '').trim() || (finalTextRef.current || '').trim() || (_bTranscript || '').trim()
        if (finalActive) {
          submitAnswerRef.current?.(finalActive)
        } else {
          console.warn('[Timer] 120s time limit expired with no answer — submitting timeout indicator')
          submitAnswerRef.current?.('[No answer provided - time limit expired]')
        }
      }
    }, 500)
  }, [transcript, _bTranscript])

  useEffect(() => { startCountdownRef.current  = startCountdown  }, [startCountdown])
  useEffect(() => { resumeCountdownRef.current = resumeCountdown }, [resumeCountdown])

  useEffect(() => {
    if (phase !== 'interview' || !questions[currentQ]) return
    clearInterval(timerRef.current)
    setTimeLeft(120)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setTtsLoading(true)
    setTtsPlaying(false)
    setTtsFailed(false)

    console.log('[FLOW] Question displayed')
    console.log('[FLOW] TTS requested')

    let activeEffect = true
    const token = localStorage.getItem('token')

    fetch('/api/interview/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text: questions[currentQ].question }),
    })
      .then(res => { if (!res.ok) throw new Error(`TTS ${res.status}`); return res.blob() })
      .then(blob => {
        if (!activeEffect) return
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        setTtsLoading(false)
        setTtsPlaying(true)
        setTtsFailed(false)
        console.log('[FLOW] Audio playback started')

        const onAudioEnd = () => {
          console.log('[FLOW] Audio playback finished')
          setTtsPlaying(false)
          URL.revokeObjectURL(url)
          audioRef.current = null
          startCountdownRef.current?.()
          if (sttSupportedRef.current) {
            console.log('[FLOW] Listening started automatically')
            startListeningRef.current?.()
          }
        }
        audio.onended = onAudioEnd
        audio.onerror = onAudioEnd
        audio.play().catch(err => {
          console.warn('[TTS] Audio play error:', err.message)
          onAudioEnd()
        })
      })
      .catch(err => {
        console.warn('[TTS] Voice playback failed:', err.message)
        setTtsLoading(false)
        setTtsPlaying(false)
        setTtsFailed(true)
        startCountdownRef.current?.()
        if (sttSupportedRef.current) {
          console.log('[FLOW] Listening started automatically (TTS fallback)')
          startListeningRef.current?.()
        }
      })
    return () => {
      activeEffect = false
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      clearInterval(timerRef.current)
    }
  }, [phase, currentQ, questions])

  useEffect(() => {
    resetTranscriptRef.current?.()
    stopListeningRef.current?.()
    voiceCommandTriggeredRef.current = false
    setSttStatusMsg('')
  }, [currentQ])

  // Real-time verbal command detection (e.g. "next question", "move to the next question", "skip this question", "let's move on")
  useEffect(() => {
    if (phase !== 'interview') return
    const candidateSpeech = ((_bTranscript || '') + ' ' + (_bInterimTranscript || '')).trim()
    if (!candidateSpeech) return
    const cmdResult = extractVoiceCommand(candidateSpeech)
    if (cmdResult.isCommand && !voiceCommandTriggeredRef.current && !ttsLoading && !ttsPlaying) {
      voiceCommandTriggeredRef.current = true
      console.log(`[VoiceCommand] Detected verbal command: "${candidateSpeech}" -> Submitting: "${cmdResult.cleanedAnswer}"`)
      stopListening()
      resetTranscript()
      setAnswered(a => [...new Set([...a, currentQ])])
      submitAnswerRef.current?.(cmdResult.cleanedAnswer)
    }
  }, [phase, _bTranscript, _bInterimTranscript, ttsLoading, ttsPlaying, currentQ, stopListening, resetTranscript])

  const lastStreamedRef = useRef('')
  useEffect(() => {
    if (!transcript) return
    finalTextRef.current = transcript
    const q = questions[currentQ]
    if (!q) return
    setAnswers(prev => ({ ...prev, [q.id]: transcript }))
  }, [transcript, currentQ, questions, interviewId])

  // Debounced browser STT → backgroundReasoner (only in local mode during recording)
  // Browser STT finalized text is sent to updateTranscript every 2s for background reasoning.
  // This is NOT the authoritative transcript — just context for the reasoner.
  useEffect(() => {
    if (sttMode !== 'local') return
    if (localStt.micState !== 'recording') return
    if (!interviewId) return
    if (!_bTranscript || _bTranscript.trim().length < 5) return
    if (_bTranscript === lastBrowserSttTextRef.current) return

    clearTimeout(browserSttDebounceRef.current)
    browserSttDebounceRef.current = setTimeout(() => {
      if (localStt.micState !== 'recording') return
      lastBrowserSttTextRef.current = _bTranscript
      console.log(`[LiveSTT] Sending context to backend (${_bTranscript.split(/\s+/).length} words)`)
      interviewApi.updateTranscript({ interviewId, transcript: _bTranscript })
        .catch(e => console.warn('[LiveSTT] Backend context update failed (non-fatal):', e.message))
    }, 2000)

    return () => clearTimeout(browserSttDebounceRef.current)
  }, [sttMode, localStt.micState, interviewId, _bTranscript])

  const handlePrev = () => {
    stopListening()
    resetTranscript()
    if (currentQ > 0) { setCurrentQ(q => q - 1); setTimeLeft(120) }
  }

  const handlePause = useCallback(async () => {
    if (sessionStatus === 'paused') return
    clearInterval(timerRef.current)
    clearInterval(totalRef.current)
    pauseStartMsRef.current = Date.now()
    setSessionStatus('paused')
    stopListeningRef.current?.()
    if (audioRef.current) { audioRef.current.pause() }
    // Pause the video recorder to match session state
    videoRecorder.pause()
    console.log('[SESSION] Paused')
    try { await interviewApi.pause(interviewId) }
    catch (e) { console.warn('[SESSION] Pause API failed (non-fatal):', e.message) }
  }, [sessionStatus, interviewId, videoRecorder])

  const handleResume = useCallback(async () => {
    if (sessionStatus !== 'paused') return
    const pausedMs = Date.now() - pauseStartMsRef.current
    totalPausedMsRef.current += pausedMs
    qPausedMsRef.current     += pausedMs
    pauseStartMsRef.current   = 0
    setSessionStatus('active')
    // Restart total timer
    totalRef.current = setInterval(() => {
      const activeMs = Date.now() - interviewStartMsRef.current - totalPausedMsRef.current
      setTotalTime(Math.floor(activeMs / 1000))
    }, 500)
    // Resume per-question countdown from where it left off
    resumeCountdownRef.current?.()
    // Resume STT
    if (sttSupportedRef.current) startListeningRef.current?.()
    // Resume video recorder
    videoRecorder.resume()
    console.log(`[SESSION] Resumed after ${Math.round(pausedMs / 1000)}s pause`)
    try { await interviewApi.resume(interviewId) }
    catch (e) { console.warn('[SESSION] Resume API failed (non-fatal):', e.message) }
  }, [sessionStatus, interviewId, videoRecorder])

  // ── Camera initialization on intro/interview phase ──────────────────────
  useEffect(() => {
    const needCamera = phase === 'intro' || phase === 'interview'
    if (!needCamera) {
      // Leaving — stop camera tracks
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop())
        cameraStreamRef.current = null
        console.log('[CAMERA] Tracks stopped (phase left)')
      }
      setCameraStatus('inactive')
      if (videoRef.current) videoRef.current.srcObject = null
      return
    }
    if (cameraStreamRef.current) return // already running

    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('[CAMERA] getUserMedia not available in this browser')
      setCameraStatus('unavailable')
      setCameraError('Camera not supported in this browser')
      return
    }

    setCameraStatus('initializing')
    setCameraError('')
    console.log('[CAMERA] Requesting video-only stream (audio handled separately by STT)')

    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        cameraStreamRef.current = stream
        const tracks = stream.getVideoTracks()
        console.log(`[CAMERA] Stream active — ${tracks.length} video track(s): ${tracks.map(t => t.label).join(', ')}`)
        setCameraStatus('active')
        setCameraError('')
      })
      .catch(e => {
        const msg = e.name === 'NotAllowedError'  ? 'Camera permission denied. Click the camera icon in your browser address bar to allow access.'
          : e.name === 'NotFoundError'            ? 'No camera detected. Connect a webcam and refresh.'
          : e.name === 'NotReadableError'         ? 'Camera is in use by another application. Close other apps using the camera.'
          : e.name === 'OverconstrainedError'     ? 'Camera does not meet requirements. Try a different camera.'
          : `Camera error: ${e.message}`
        console.warn('[CAMERA] Failed:', e.name, '—', e.message)
        setCameraStatus('denied')
        setCameraError(msg)
      })
  }, [phase])

  // Assign stream to <video> whenever phase transitions, cameraStatus updates, or candidate PIP renders
  useEffect(() => {
    if (cameraStatus !== 'active' || !cameraStreamRef.current || !videoRef.current) return
    const el = videoRef.current
    console.log('[CAMERA] Video element attached')
    el.srcObject = cameraStreamRef.current
    el.onloadedmetadata = () => {
      console.log('[CAMERA] Stream active — video metadata ready')
      el.play()
        .then(() => console.log('[CAMERA] Video playing'))
        .catch(e => console.warn('[CAMERA] Video error:', e.message))
    }
    el.play()
      .then(() => console.log('[CAMERA] Video playing'))
      .catch(e => console.warn('[CAMERA] Video error:', e.message))
  }, [phase, cameraStatus, camOn])

  const timerColor = timeLeft > 60 ? '#10b981' : timeLeft > 30 ? '#f59e0b' : '#ef4444'
  const progress   = questions.length > 0 ? ((currentQ + 1) / questions.length) * 100 : 0

  /* ── PHASE: SETUP ─────────────────────────────────────────────────────── */
  if (phase === 'setup') {
    if (loading) return <LoadingCard title="Analyzing your resume..." subtitle="AI is recommending the best roles for your profile" />

    return (
      <div className="mi-page">
        <div className="mi-intro-card" style={{ maxWidth: 700, textAlign: 'left' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mi-intro-icon" style={{ marginBottom: 20 }}>
              <Brain size={32} />
            </div>

            {setupStep === 'resume' && (
              <>
                <h1 className="mi-intro-title" style={{ textAlign: 'center' }}>AI Mock Interview</h1>
                <p className="mi-intro-sub" style={{ textAlign: 'center' }}>Select a resume to get AI-powered role recommendations, or skip to choose a role manually.</p>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Select Resume (Optional)
                  </div>
                  {resumeHistory.length === 0 ? (
                    <div style={{ padding: 16, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                      No resume analysis found. You can still continue without one.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {resumeHistory.slice(0, 5).map(r => (
                        <div
                          key={r.id}
                          onClick={() => setSelectedResumeId(selectedResumeId === r.id ? null : r.id)}
                          style={{
                            padding: '12px 16px', borderRadius: 8, border: `2px solid ${selectedResumeId === r.id ? 'var(--primary)' : 'var(--border)'}`,
                            background: selectedResumeId === r.id ? 'var(--primary-bg)' : 'var(--bg-primary)',
                            cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.originalName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(r.uploadDate).toLocaleDateString()}</div>
                          </div>
                          {selectedResumeId === r.id && <CheckCircle size={18} color="var(--primary)" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <Link to="/student" className="btn btn-outline">← Back</Link>
                  <button className="btn btn-outline" onClick={() => setSetupStep('role')}>
                    Skip → Manual Role
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleRecommendRoles}
                    disabled={!selectedResumeId}
                  >
                    Get AI Role Recommendations <ChevronRight size={16} />
                  </button>
                </div>
                {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 12, textAlign: 'center' }}>{error}</p>}
              </>
            )}

            {setupStep === 'role' && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {recommendedRoles.length > 0 ? '⭐ Recommended Roles' : 'Select Your Role'}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  {recommendedRoles.length > 0 ? 'Based on your resume analysis' : 'Enter the role you want to practice for'}
                </p>

                {recommendedRoles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {recommendedRoles.map((r, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedRole(r.role)}
                        style={{
                          padding: '12px 16px', borderRadius: 8,
                          border: `2px solid ${selectedRole === r.role ? 'var(--primary)' : 'var(--border)'}`,
                          background: selectedRole === r.role ? 'var(--primary-bg)' : 'var(--bg-primary)',
                          cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Star size={14} color="#f59e0b" fill="#f59e0b" />
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{r.role}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-bg)', padding: '2px 8px', borderRadius: 20 }}>{r.confidence}%</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.reason}</div>
                        </div>
                        {selectedRole === r.role && <CheckCircle size={18} color="var(--primary)" style={{ flexShrink: 0, marginLeft: 8, marginTop: 2 }} />}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                    {recommendedRoles.length > 0 ? 'Or enter a custom role:' : 'Role Title:'}
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Full Stack Developer, Data Scientist..."
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
                      fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-primary)', boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Interview Type</div>
                    <select
                      value={interviewType}
                      onChange={e => setInterviewType(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    >
                      {['Technical', 'HR', 'Behavioral', 'Aptitude', 'Mixed'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Difficulty</div>
                    <select
                      value={difficulty}
                      onChange={e => setDifficulty(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    >
                      {['Easy', 'Medium', 'Hard'].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Number of Questions</div>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Enter number of questions"
                      value={questionCount}
                      onChange={e => {
                        const val = e.target.value
                        if (val === '' || /^\d+$/.test(val)) {
                          setQuestionCount(val === '' ? '' : parseInt(val, 10))
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: `1px solid ${questionCountError ? 'var(--danger)' : 'var(--border)'}`,
                        fontSize: 13,
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        boxSizing: 'border-box',
                      }}
                    />
                    {questionCountError && (
                      <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, lineHeight: 1.3 }}>
                        {questionCountError}
                      </div>
                    )}
                  </div>
                </div>

                {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button className="btn btn-outline" onClick={() => { setSetupStep('resume'); setRecommendedRoles([]) }}>← Back</button>
                  <button
                    className="btn btn-primary"
                    onClick={handleGenerateInterview}
                    disabled={!selectedRole || !!questionCountError || loading}
                  >
                    {loading ? <><Loader size={14} /> Generating…</> : <>Generate Interview <ChevronRight size={16} /></>}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    )
  }

  /* ── PHASE: LOADING (generating questions) ───────────────────────────── */
  if (loading && phase === 'setup') {
    return <LoadingCard title="Generating interview questions..." subtitle="AI is creating role-specific questions for your interview" />
  }

  /* ── PHASE: EVALUATING ───────────────────────────────────────────────── */
  if (phase === 'evaluating') {
    const uploadMsg = uploadState === 'uploading' ? 'Saving your recording…'
      : uploadState === 'failed'   ? `Recording upload failed (results unaffected): ${uploadError}`
      : uploadState === 'done'     ? 'Recording saved.'
      : ''
    return (
      <LoadingCard
        title="Evaluating your performance..."
        subtitle={uploadMsg || 'AI is reviewing all your answers and generating detailed feedback'}
      />
    )
  }

  /* ── PHASE: INTRO ────────────────────────────────────────────────────── */
  if (phase === 'intro') return (
    <div className="mi-page">
      <div className="mi-intro-card" style={{ maxWidth: 820 }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>

          {/* Camera preview + interview details side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, marginBottom: 24 }}>
            <div>
              <div className="mi-intro-icon"><Brain size={36} /></div>
              <h1 className="mi-intro-title">AI Mock Interview</h1>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                <span className="badge blue">{selectedRole}</span>
                <span className="badge purple">{interviewType}</span>
                <span className="badge" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 20, padding: '3px 10px', fontSize: 12 }}>{difficulty}</span>
              </div>
              <p className="mi-intro-sub">
                {questions.length} AI-generated questions tailored for <strong>{selectedRole}</strong> role.
              </p>
              <div className="mi-intro-grid">
                {[
                  { icon: <Clock size={18} />,     label: `${questions.length} Questions`, sub: '2 min each' },
                  { icon: <Brain size={18} />,     label: 'AI Questions',    sub: selectedRole },
                  { icon: <Shield size={18} />,    label: difficulty,        sub: 'Difficulty' },
                  { icon: <BarChart3 size={18} />, label: 'Instant Feedback', sub: 'Detailed report' },
                ].map((item, i) => (
                  <div key={i} className="mi-intro-feature">
                    <div className="mi-feature-icon">{item.icon}</div>
                    <div><div style={{ fontWeight: 600, fontSize: 13 }}>{item.label}</div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.sub}</div></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Camera preview panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Camera Preview</div>
              <div style={{
                position: 'relative', width: '100%', paddingBottom: '75%',
                background: '#0f1117', borderRadius: 12, overflow: 'hidden',
                border: `2px solid ${cameraStatus === 'active' ? '#10b981' : cameraStatus === 'denied' ? '#ef4444' : 'var(--border)'}`,
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover', display: cameraStatus === 'active' ? 'block' : 'none',
                    transform: 'scaleX(-1)', // mirror for natural feel
                  }}
                />
                {cameraStatus !== 'active' && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12,
                  }}>
                    {cameraStatus === 'initializing' && (
                      <><Loader size={24} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>Requesting camera…</span></>
                    )}
                    {(cameraStatus === 'denied' || cameraStatus === 'unavailable') && (
                      <><VideoOff size={24} style={{ color: '#ef4444' }} />
                      <span style={{ fontSize: 11, color: '#ef4444', textAlign: 'center', lineHeight: 1.4 }}>{cameraError}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>Interview will still work without camera.</span></>
                    )}
                    {cameraStatus === 'inactive' && (
                      <><Video size={24} style={{ color: '#475569' }} />
                      <span style={{ fontSize: 12, color: '#475569' }}>Starting camera…</span></>
                    )}
                  </div>
                )}
              </div>
              {/* Status indicators */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cameraStatus === 'active' ? '#10b981' : cameraStatus === 'denied' ? '#ef4444' : '#f59e0b', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Camera: {cameraStatus === 'active' ? 'Ready' : cameraStatus === 'denied' ? 'Denied' : cameraStatus === 'initializing' ? 'Requesting…' : 'Not available'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Microphone: Handled by STT pipeline</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mi-intro-rules">
            <p><CheckCircle size={14} style={{ color: '#10b981' }} /> Ensure you are in a quiet environment</p>
            <p><CheckCircle size={14} style={{ color: '#10b981' }} /> Allow microphone access when prompted by the interview</p>
            <p><CheckCircle size={14} style={{ color: '#10b981' }} /> Answer each question within 2 minutes</p>
            <p><AlertTriangle size={14} style={{ color: '#f59e0b' }} /> Do not navigate away during the interview</p>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28 }}>
            <button className="btn btn-outline" onClick={() => setPhase('setup')}>← Change Settings</button>
            <button className="btn btn-primary" onClick={handleStartInterview}>
              Start Interview <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )

  /* ── PHASE: INTERVIEW ────────────────────────────────────────────────── */
  if (phase === 'interview') {
    const q = questions[currentQ]

    const avatarState = ttsLoading
      ? 'thinking'
      : ttsPlaying
      ? 'speaking'
      : isListening
      ? 'listening'
      : (answers[q?.id] || transcript)
      ? 'waiting'
      : 'idle'

    const statusText = ttsLoading
      ? 'AI is thinking...'
      : ttsPlaying
      ? `${selectedRole || 'AI Interviewer'} is speaking...`
      : isListening
      ? 'Listening to your answer...'
      : 'Response captured.'

    return (
      <div className="civ-container">
        <div className="civ-header">
          <div className="civ-header-brand">
            <button
              className="civ-btn-ghost"
              onClick={() => {
                clearInterval(timerRef.current)
                clearInterval(totalRef.current)
                stopListening()
                if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
                setPhase('intro')
              }}
            >
              <ArrowLeft size={16} /> Exit
            </button>
            <div>
              <div className="civ-role-title">{selectedRole || 'AI Mock Interview'}</div>
              <div className="civ-role-subtitle">{interviewType} • {difficulty}</div>
            </div>
          </div>

          <div className="civ-header-center">
            <div className="civ-progress-pill">
              <span>Question</span>
              <span className="active">{currentQ + 1}</span>
              <span>of</span>
              <span>{questions.length}</span>
            </div>
          </div>

          <div className="civ-header-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="civ-timer-badge" style={{ borderColor: timerColor, color: timerColor }}>
              <Clock size={14} />
              <span>{formatTime(timeLeft)}</span>
            </div>

            {currentQ === questions.length - 1 && (
              <button
                className="civ-btn-ghost"
                onClick={handleFinish}
                disabled={ttsLoading || ttsPlaying}
                title="Finish Interview"
              >
                <span>Finish</span>
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="civ-stage">
          {camOn && (
            <div className="civ-candidate-pip">
              <div className="civ-pip-label">
                <span className="civ-pip-dot" style={{ background: cameraStatus === 'active' ? '#10b981' : '#64748b' }} /> You
              </div>
              {cameraStatus === 'active' ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    transform: 'scaleX(-1)', borderRadius: 8,
                    display: 'block',
                  }}
                />
              ) : (
                <div className="civ-pip-avatar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {cameraStatus === 'initializing' ? <Loader size={20} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} /> : <VideoOff size={20} style={{ color: '#64748b' }} />}
                  <span style={{ fontSize: 10, color: '#64748b' }}>{cameraStatus === 'initializing' ? 'Starting…' : 'No Camera'}</span>
                </div>
              )}
              <div className="civ-pip-voice-meter">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className="civ-pip-bar"
                    style={{
                      height: isListening ? `${Math.random() * 60 + 20}%` : '20%',
                      background: isListening ? '#10b981' : '#64748b',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="civ-avatar-center">
            <AiAvatar
              state={avatarState}
              roleTitle={selectedRole}
            />
          </div>

          <div className="civ-subtitle-wrapper">
            <ProgressiveSubtitle
              questionText={q?.question || ''}
              isTtsPlaying={ttsPlaying}
              isTtsLoading={ttsLoading}
              userAnswer={answers[q.id] || ''}
              interimTranscript={interimTranscript}
              isListening={isListening}
              ttsFailed={ttsFailed}
              onAnswerChange={(newAns) => saveAnswer(q.id, newAns)}
            />

            {sttStatusMsg && (
              <div style={{
                margin: '12px auto 0',
                maxWidth: 680,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 10,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: 13, fontWeight: 500 }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{sttStatusMsg}</span>
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    setSttStatusMsg('')
                    startListening()
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', fontSize: 12, whiteSpace: 'nowrap' }}
                >
                  <Mic size={14} /> Speak Now
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="civ-controls">
          <div className="civ-mic-status">
            <span className={`civ-status-dot ${isListening ? 'active' : ''}`} />
            <span className="civ-status-text">
              {sessionStatus === 'paused' ? '⏸ Interview paused' : statusText}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>Total: {formatTime(totalTime)}</span>
          </div>

          <div className="civ-ctrl-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              className={`civ-ctrl-btn ${isListening ? 'active' : ''}`}
              onClick={() => {
                if (isListening) stopListening()
                else {
                  setSttStatusMsg('')
                  startListening()
                }
              }}
              title={isListening ? 'Mute Microphone' : 'Start Listening'}
              disabled={sessionStatus === 'paused'}
            >
              {isListening ? <Mic size={18} /> : <MicOff size={18} />}
              <span>{isListening ? 'Mic On' : 'Mic Off'}</span>
            </button>

            <button
              className={`civ-ctrl-btn ${camOn ? 'active' : ''}`}
              onClick={() => setCamOn(c => !c)}
              title={camOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {camOn ? <Video size={18} /> : <VideoOff size={18} />}
              <span>{camOn ? 'Camera' : 'Camera Off'}</span>
            </button>

            {sessionStatus === 'active' ? (
              <button
                className="civ-ctrl-btn"
                onClick={handlePause}
                title="Pause Interview"
                style={{ color: '#f59e0b' }}
              >
                <Eye size={18} />
                <span>Pause</span>
              </button>
            ) : (
              <button
                className="civ-ctrl-btn active"
                onClick={handleResume}
                title="Resume Interview"
                style={{ color: '#10b981' }}
              >
                <Activity size={18} />
                <span>Resume</span>
              </button>
            )}

            <button
              className="civ-ctrl-btn"
              onClick={handleFinish}
              disabled={ttsLoading && sessionStatus === 'active'}
              title="End Interview"
              style={{ color: '#ef4444' }}
            >
              <CheckCircle size={18} />
              <span>End</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── PHASE: RESULTS ──────────────────────────────────────────────────── */
  const evaluation   = evalResult?.evaluation || {}
  const catScores    = evaluation?.category_scores || {}
  const overallScore = evaluation?.overall_score   ?? evalResult?.evaluation?.overall_score ?? 0
  const answeredCount = evalResult?.questionsAnswered ?? questions.length

  const radarData = [
    { subject: 'Technical',       score: catScores.technical       || 0 },
    { subject: 'Communication',   score: catScores.communication   || 0 },
    { subject: 'Grammar',         score: catScores.grammar         || 0 },
    { subject: 'Confidence',      score: catScores.confidence      || 0 },
    { subject: 'Problem Solving', score: catScores.problem_solving || 0 },
  ]

  const scoreBarData = [
    { name: 'Technical',        score: catScores.technical       || 0 },
    { name: 'Communication',    score: catScores.communication   || 0 },
    { name: 'Grammar',          score: catScores.grammar         || 0 },
    { name: 'Confidence',       score: catScores.confidence      || 0 },
    { name: 'Problem Solving',  score: catScores.problem_solving || 0 },
  ]

  const hireColor = {
    'Recommended':     '#10b981',
    'Consider':        '#f59e0b',
    'Not Recommended': '#ef4444',
  }[evaluation?.hire_recommendation] || '#6366f1'

  return (
    <div className="mi-page">
      <div className="mi-results-container">
        <motion.div className="mi-results-header" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mi-results-title-row">
            <div>
              <h1 className="mi-results-title">Interview Complete</h1>
              <p className="mi-results-sub">
                {selectedRole} · {interviewType} · {difficulty} · Duration: {formatTime(evalResult?.duration || totalTime)}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/student" className="btn btn-outline"><ArrowLeft size={16} /> Dashboard</Link>
              <button className="btn btn-primary" onClick={() => { setPhase('setup'); setSetupStep('resume'); setEvalResult(null); setAnswers({}); setAnswered([]); setCurrentQ(0); setTotalTime(0) }}>
                <RefreshCw size={16} /> New Interview
              </button>
            </div>
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <div className="mi-overall-score">
            <div className="mi-score-circle">
              <span className="mi-score-value">{overallScore}</span>
              <span className="mi-score-label">Overall</span>
            </div>
            <div className="mi-score-breakdown">
              {[
                { label: 'Questions Answered', value: `${answeredCount}/${questions.length}`, icon: <CheckCircle size={16} color="#10b981" /> },
                { label: 'Interview Duration',  value: formatTime(evalResult?.duration || totalTime), icon: <Clock size={16} color="#6366f1" /> },
                { label: 'Role',                value: selectedRole, icon: <Target size={16} color="#f59e0b" /> },
                { label: 'Recommendation',      value: evaluation?.hire_recommendation || '—', icon: <Award size={16} color={hireColor} /> },
              ].map((item, i) => (
                <div key={i} className="mi-meta-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                    {item.icon}
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="mi-tabs">
          {[
            { key: 'feedback',    label: 'AI Feedback',         icon: <Brain size={15} />    },
            { key: 'questions',   label: 'Question Feedback',   icon: <FileText size={15} /> },
            { key: 'insights',    label: 'Strengths & Tips',    icon: <TrendingUp size={15} /> },
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
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={v => [`${v}/100`]} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mi-card">
                  <h3 className="mi-card-title">Score Breakdown</h3>
                  <div style={{ marginTop: 8 }}>
                    <ScoreBar label="Technical Knowledge"  value={catScores.technical       || 0} />
                    <ScoreBar label="Communication Skills" value={catScores.communication   || 0} />
                    <ScoreBar label="Grammar & Fluency"    value={catScores.grammar         || 0} />
                    <ScoreBar label="Confidence"           value={catScores.confidence      || 0} />
                    <ScoreBar label="Problem Solving"      value={catScores.problem_solving || 0} />
                  </div>
                  {evaluation?.overall_feedback && (
                    <div style={{ marginTop: 16, padding: '14px', background: 'rgba(99,102,241,0.06)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.15)' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)', marginBottom: 6 }}>AI Overall Feedback</div>
                      <span className="badge" style={{ background: hireColor + '20', color: hireColor, border: `1px solid ${hireColor}40`, borderRadius: 20, padding: '3px 10px', fontSize: 12, marginBottom: 8, display: 'inline-block' }}>
                        {evaluation.hire_recommendation}
                      </span>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, marginTop: 6 }}>{evaluation.overall_feedback}</p>
                    </div>
                  )}
                </div>
                <div className="mi-card" style={{ gridColumn: '1 / -1' }}>
                  <h3 className="mi-card-title">Score by Category</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={scoreBarData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={v => [`${v}/100`]} />
                      <Bar dataKey="score" radius={[5, 5, 0, 0]} fill="#6366f1" name="Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'questions' && (
            <motion.div key="questions" className="mi-tab-content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {(evaluation?.question_feedback || []).length === 0 ? (
                <div className="mi-card" style={{ textAlign: 'center', padding: 32 }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Question-level feedback not available.</p>
                </div>
              ) : (
                (evaluation.question_feedback || []).map((fb, idx) => {
                  const q = questions[fb.question_index ?? idx]
                  if (!q) return null
                  return (
                    <div key={idx} className="mi-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                        <div>
                          <span className="badge purple" style={{ marginRight: 6 }}>Q{idx + 1}</span>
                          <span className="badge" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 20, padding: '3px 10px', fontSize: 11 }}>{q.category}</span>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: fb.score >= 80 ? '#10b981' : fb.score >= 60 ? '#f59e0b' : '#ef4444', flexShrink: 0 }}>
                          {fb.score}/100
                        </span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 10 }}>{q.question}</p>
                      {answers[q.id] && (
                        <div style={{ padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.6 }}>
                          <strong>Your answer:</strong> {answers[q.id]}
                        </div>
                      )}
                      {fb.feedback && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 6 }}><strong>Feedback:</strong> {fb.feedback}</p>}
                      {fb.strengths && <p style={{ fontSize: 13, color: '#10b981', lineHeight: 1.6, marginBottom: 4 }}>✓ {fb.strengths}</p>}
                      {fb.improvements && <p style={{ fontSize: 13, color: '#f59e0b', lineHeight: 1.6 }}>💡 {fb.improvements}</p>}
                    </div>
                  )
                })
              )}
            </motion.div>
          )}

          {activeTab === 'insights' && (
            <motion.div key="insights" className="mi-tab-content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mi-results-grid">
                <div className="mi-card">
                  <h3 className="mi-card-title" style={{ color: '#10b981' }}>✓ Strengths</h3>
                  {(evaluation?.strengths || []).length === 0
                    ? <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No strengths data available.</p>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {evaluation.strengths.map((s, i) => (
                          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            <CheckCircle size={15} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                            {s}
                          </div>
                        ))}
                      </div>
                  }
                </div>
                <div className="mi-card">
                  <h3 className="mi-card-title" style={{ color: '#f59e0b' }}>Areas to Improve</h3>
                  {(evaluation?.weaknesses || []).length === 0
                    ? <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No weakness data available.</p>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {evaluation.weaknesses.map((w, i) => (
                          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                            {w}
                          </div>
                        ))}
                      </div>
                  }
                </div>
                <div className="mi-card" style={{ gridColumn: '1 / -1' }}>
                  <h3 className="mi-card-title">💡 Recommendations</h3>
                  {(evaluation?.recommendations || []).length === 0
                    ? <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No recommendations available.</p>
                    : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                        {evaluation.recommendations.map((r, i) => (
                          <div key={i} style={{ padding: 14, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            <span style={{ fontWeight: 700, color: 'var(--primary)', marginRight: 6 }}>{i + 1}.</span>{r}
                          </div>
                        ))}
                      </div>
                  }
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
