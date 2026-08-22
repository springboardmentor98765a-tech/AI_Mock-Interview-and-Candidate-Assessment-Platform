import { useState, useRef, useCallback, useEffect } from 'react'

function pickMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]
  for (const m of candidates) {
    try {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m
    } catch (_) {}
  }
  return ''
}

function mimeToExt(mimeType) {
  if (!mimeType) return 'webm'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

const STT_PATH         = '/api/stt/transcribe'
const DEFAULT_MAX_MS   = 120000
const POLL_MS          = 100

// ── VAD Configuration ──────────────────────────────────────────────────────
// These are tunable. The adaptive noise-floor logic adjusts speechThreshold
// at runtime, but these set the bounds.
const VAD = {
  CALIBRATION_POLLS:     5,       // first 5 polls (500ms) to sample noise floor
  ABSOLUTE_SPEECH_MIN:   0.025,   // always detect speech above this even before calibration
  DEFAULT_NOISE_FLOOR:   0.004,   // safe default if calibration gets no samples
  NOISE_MULTIPLIER:      3.5,     // speechThreshold = noiseFloor * this
  THRESHOLD_FLOOR:       0.015,   // minimum speechThreshold regardless of noise floor
  SILENCE_DURATION_MS:   4000,    // continuous silence required to auto-stop after speech
  SPIKE_TOLERANCE_POLLS: 5,       // brief noise bursts shorter than this (500ms) don't reset silence timer
  NO_SPEECH_TIMEOUT_MS:  120000,  // do not auto-stop while candidate is thinking; rely on full question limit
}

// Known Whisper hallucination patterns for short/silent audio
const HALLUCINATION_PATTERNS = [
  /^(bye|goodbye|thank you for watching|thanks for watching|subscribe|see you)/i,
  /^(please subscribe|like and subscribe|click the bell)/i,
  /^(thank you|thanks)\.?$/i,
]

export function useLocalSpeechRecognition({
  onComplete     = null,
  onAutoStop     = null,
  maxRecordingMs = DEFAULT_MAX_MS,
} = {}) {
  const isSupported = typeof window !== 'undefined' && !!window.MediaRecorder

  const [micState,          setMicState]          = useState('idle')
  const [transcript,        setTranscript]        = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error,             setError]             = useState(null)

  const mountedRef      = useRef(true)
  const recorderRef     = useRef(null)
  const chunksRef       = useRef([])
  const maxTimerRef     = useRef(null)
  const noSpeechTimerRef = useRef(null)
  const recordStartRef  = useRef(0)
  const onCompleteRef   = useRef(onComplete)
  const onAutoStopRef   = useRef(onAutoStop)

  const audioCtxRef       = useRef(null)
  const pollTimerRef      = useRef(null)
  const speechDetectedRef = useRef(false)
  const stoppedRef        = useRef(false)

  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])
  useEffect(() => { onAutoStopRef.current = onAutoStop }, [onAutoStop])

  const _teardownAudio = useCallback(() => {
    clearInterval(pollTimerRef.current)
    pollTimerRef.current = null
    clearTimeout(noSpeechTimerRef.current)
    noSpeechTimerRef.current = null
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close() } catch (_) {}
      audioCtxRef.current = null
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimeout(maxTimerRef.current)
      _teardownAudio()
      try {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          recorderRef.current.stop()
        }
      } catch (_) {}
    }
  }, [_teardownAudio])

  // ── Validate transcript for hallucinations ──────────────────────────────
  const _validateTranscript = useCallback((text, audioDurationS) => {
    if (!text) return text

    const wordCount = text.trim().split(/\s+/).length

    if (audioDurationS > 10 && wordCount < 3) {
      console.warn(`[FinalSTT] WARNING: Only ${wordCount} words from ${audioDurationS}s audio — possible truncation or hallucination`)
    }

    if (audioDurationS > 5) {
      for (const pattern of HALLUCINATION_PATTERNS) {
        if (pattern.test(text.trim())) {
          console.warn(`[FinalSTT] WARNING: Transcript matches hallucination pattern: "${text.trim()}" — submitting anyway (Whisper is authoritative)`)
          break
        }
      }
    }

    return text
  }, [])

  // ── Send FULL recording to Faster-Whisper ──────────────────────────────
  const _transcribeBlob = useCallback(async (blob, filename) => {
    if (!mountedRef.current) return
    setMicState('transcribing')
    setInterimTranscript('Transcribing...')

    const recordingDuration = ((Date.now() - recordStartRef.current) / 1000).toFixed(1)
    const tRecorderStop = performance.now()

    console.log(`[FinalSTT] request sent (${blob.size} bytes, recording was ${recordingDuration}s)`)

    const tRequestStart = performance.now()
    console.log(`[STT-LATENCY] recorder-stop → request-start = ${(tRequestStart - tRecorderStop).toFixed(0)}ms`)

    try {
      const form = new FormData()
      form.append('audio', blob, filename)
      const token   = localStorage.getItem('token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      const res  = await fetch(STT_PATH, { method: 'POST', headers, body: form })
      const tResponseReceived = performance.now()

      const data = await res.json()

      if (!mountedRef.current) return
      if (!res.ok) throw new Error(data.message || `STT error ${res.status}`)

      console.log('[FinalSTT] response received')
      const rawText   = (data.transcript || '').trim()
      const elapsed   = ((tResponseReceived - tRequestStart) / 1000).toFixed(2)
      const wordCount = rawText ? rawText.split(/\s+/).length : 0

      console.log(`[FinalSTT] Completed in ${elapsed}s | words=${wordCount} | lang=${data.language} | "${rawText.slice(0, 100)}"`)
      console.log(`[FinalSTT] transcript received: "${rawText}"`)
      console.log(`[FinalSTT] Word count: ${wordCount}`)
      console.log(`[STT-LATENCY] total final STT = ${elapsed}s`)

      if (data.duration_s) {
        console.log(`[STT-LATENCY] Python transcription = ${data.duration_s}s`)
        const overhead = (parseFloat(elapsed) - data.duration_s).toFixed(2)
        console.log(`[STT-LATENCY] network + overhead = ${overhead}s`)
      }

      const validatedText = _validateTranscript(rawText, parseFloat(recordingDuration))

      // ── STT metadata for speech analysis (backward-compatible 2nd arg) ──
      const sttMeta = {
        audio_duration_s: typeof data.audio_duration_s === 'number' ? data.audio_duration_s : null,
        segments_meta:    Array.isArray(data.segments_meta) ? data.segments_meta : [],
      }
      if (sttMeta.audio_duration_s) {
        console.log(`[FinalSTT] audio_duration_s=${sttMeta.audio_duration_s}s segments=${sttMeta.segments_meta.length}`)
      }
      // ─────────────────────────────────────────────────────────────────────

      setTranscript(validatedText)
      setInterimTranscript('')
      setMicState('stopped')
      onCompleteRef.current?.(validatedText, sttMeta)
    } catch (e) {
      if (!mountedRef.current) return
      console.error('[FinalSTT] Transcription error:', e.message)
      setError(e.message)
      setInterimTranscript('')
      setMicState('stopped')
      onCompleteRef.current?.('', null)
    }
  }, [_validateTranscript])


  // ── Start recording with adaptive VAD ─────────────────────────────────
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('MediaRecorder is not supported in this browser.')
      return
    }

    clearTimeout(maxTimerRef.current)
    clearTimeout(noSpeechTimerRef.current)
    _teardownAudio()

    stoppedRef.current        = false
    speechDetectedRef.current = false
    recordStartRef.current    = Date.now()

    setTranscript('')
    setInterimTranscript('Listening...')
    setError(null)
    setMicState('recording')
    chunksRef.current = []

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return }

        const mimeType = pickMimeType()
        const mrOpts   = mimeType ? { mimeType } : {}
        const mr       = new MediaRecorder(stream, mrOpts)
        recorderRef.current = mr
        chunksRef.current   = []

        // ── Adaptive VAD ─────────────────────────────────────────────────
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext
          if (AudioCtx) {
            const ctx      = new AudioCtx()
            const source   = ctx.createMediaStreamSource(stream)
            const analyser = ctx.createAnalyser()
            analyser.fftSize = 2048
            source.connect(analyser)
            audioCtxRef.current = ctx

            const pcmData = new Float32Array(analyser.fftSize)

            // VAD state
            let calibrationSamples = []
            let noiseFloor         = VAD.DEFAULT_NOISE_FLOOR
            let speechThreshold    = VAD.ABSOLUTE_SPEECH_MIN
            let calibrated         = false
            let silenceStartTime   = null
            let speechBurstCount   = 0     // consecutive above-threshold polls during silence tracking
            let pollCount          = 0

            pollTimerRef.current = setInterval(() => {
              if (recorderRef.current?.state !== 'recording') return
              pollCount++

              analyser.getFloatTimeDomainData(pcmData)

              let sum = 0
              for (let i = 0; i < pcmData.length; i++) {
                sum += pcmData[i] * pcmData[i]
              }
              const rms = Math.sqrt(sum / pcmData.length)

              // ── Phase 1: Noise floor calibration (first ~500ms) ────────
              // Non-blocking: speech detection still runs during calibration.
              // Only samples below ABSOLUTE_SPEECH_MIN contribute to noise floor.
              if (!calibrated) {
                if (rms < VAD.ABSOLUTE_SPEECH_MIN) {
                  calibrationSamples.push(rms)
                }
                if (pollCount >= VAD.CALIBRATION_POLLS) {
                  if (calibrationSamples.length > 0) {
                    noiseFloor = calibrationSamples.reduce((a, b) => a + b, 0) / calibrationSamples.length
                  }
                  speechThreshold = Math.max(noiseFloor * VAD.NOISE_MULTIPLIER, VAD.THRESHOLD_FLOOR)
                  calibrated = true
                  console.log(`[VAD] Noise floor calibrated: ${noiseFloor.toFixed(4)} | speechThreshold: ${speechThreshold.toFixed(4)} (from ${calibrationSamples.length} samples)`)
                }
              }

              // ── Phase 2: Speech detection ──────────────────────────────
              const isSpeech = rms > speechThreshold || (!calibrated && rms > VAD.ABSOLUTE_SPEECH_MIN)

              if (isSpeech) {
                if (!speechDetectedRef.current) {
                  speechDetectedRef.current = true
                  clearTimeout(noSpeechTimerRef.current)
                  noSpeechTimerRef.current = null
                  console.log(`[VAD] Speech detected (RMS=${rms.toFixed(4)}, threshold=${speechThreshold.toFixed(4)})`)
                }

                // Count consecutive speech polls during silence tracking
                speechBurstCount++

                // Only reset silence timer if this is sustained speech (> SPIKE_TOLERANCE)
                // Brief spikes (keyboard tap, cough) don't reset
                if (speechBurstCount > VAD.SPIKE_TOLERANCE_POLLS) {
                  silenceStartTime = null
                }
              } else {
                // Below threshold
                speechBurstCount = 0

                if (!speechDetectedRef.current) return

                // Start silence timer if not already running
                if (silenceStartTime === null) {
                  silenceStartTime = Date.now()
                }

                const silenceDuration = Date.now() - silenceStartTime

                if (silenceDuration >= VAD.SILENCE_DURATION_MS) {
                  if (!stoppedRef.current) {
                    stoppedRef.current = true
                    const recDuration = ((Date.now() - recordStartRef.current) / 1000).toFixed(1)
                    console.log(`[VAD] Auto-stop after ${(silenceDuration / 1000).toFixed(1)}s confirmed silence (recorded ${recDuration}s)`)
                    onAutoStopRef.current?.()
                    recorderRef.current?.stop()
                  }
                }
              }
            }, POLL_MS)
          }
        } catch (audioErr) {
          console.warn('[VAD] Web Audio API unavailable — silence detection disabled:', audioErr.message)
        }

        // ── MediaRecorder handlers ───────────────────────────────────────
        mr.onstart = () => {
          console.log('[STT] microphone/recording started')
        }

        mr.ondataavailable = e => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data)
            console.log(`[STT] audio chunks received: ${e.data.size} bytes`)
          }
        }

        mr.onstop = () => {
          console.log('[LocalSTT] recording stopped')
          stream.getTracks().forEach(t => t.stop())
          clearTimeout(maxTimerRef.current)
          clearTimeout(noSpeechTimerRef.current)
          _teardownAudio()

          if (!mountedRef.current) return
          if (chunksRef.current.length === 0) {
            console.log('[FinalSTT] No audio chunks recorded')
            setMicState('stopped')
            setInterimTranscript('')
            onCompleteRef.current?.('')
            return
          }

          const actualMime = mr.mimeType || mimeType || 'audio/webm'
          const blob       = new Blob(chunksRef.current, { type: actualMime })
          const filename   = `audio.${mimeToExt(actualMime)}`

          const recDuration = ((Date.now() - recordStartRef.current) / 1000).toFixed(1)
          console.log(`[LocalSTT] Final blob: ${blob.size} bytes`)
          console.log(`[FinalSTT] Recording stopped — ${chunksRef.current.length} chunks, ${blob.size} bytes, ${recDuration}s`)

          _transcribeBlob(blob, filename)
        }

        mr.onerror = () => {
          if (!mountedRef.current) return
          setError('Recording error. Please try again.')
          setMicState('stopped')
          setInterimTranscript('')
          _teardownAudio()
        }

        mr.start(500)

        // Safety: if no speech detected at all, stop after timeout
        noSpeechTimerRef.current = setTimeout(() => {
          if (!speechDetectedRef.current && !stoppedRef.current && recorderRef.current?.state === 'recording') {
            stoppedRef.current = true
            console.log(`[VAD] No speech detected after ${VAD.NO_SPEECH_TIMEOUT_MS / 1000}s — auto-stopping`)
            recorderRef.current?.stop()
          }
        }, VAD.NO_SPEECH_TIMEOUT_MS)

        // Absolute max recording duration
        maxTimerRef.current = setTimeout(() => {
          if (!stoppedRef.current && recorderRef.current?.state === 'recording') {
            stoppedRef.current = true
            const recDuration = ((Date.now() - recordStartRef.current) / 1000).toFixed(1)
            console.log(`[VAD] Max recording time (${maxRecordingMs / 1000}s) reached — stopping (recorded ${recDuration}s)`)
            onAutoStopRef.current?.()
            recorderRef.current.stop()
          }
        }, maxRecordingMs)
      })
      .catch(e => {
        if (!mountedRef.current) return
        const msg =
          e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError'
            ? 'Microphone access denied. Please allow microphone in browser settings.'
            : e.name === 'NotFoundError'
            ? 'No microphone detected. Please connect a microphone.'
            : `Microphone error: ${e.message}`
        setError(msg)
        setMicState('stopped')
        setInterimTranscript('')
      })
  }, [isSupported, _transcribeBlob, maxRecordingMs, _teardownAudio])

  const stopListening = useCallback(() => {
    clearTimeout(maxTimerRef.current)
    clearTimeout(noSpeechTimerRef.current)
    _teardownAudio()
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      if (!stoppedRef.current) {
        stoppedRef.current = true
        recorderRef.current.stop()
      }
    } else if (micState !== 'transcribing') {
      setMicState('stopped')
      setInterimTranscript('')
    }
  }, [micState, _teardownAudio])

  const pauseListening = useCallback(() => {
    clearTimeout(maxTimerRef.current)
    _teardownAudio()
    if (recorderRef.current?.state === 'recording') {
      try { recorderRef.current.pause() } catch (_) {}
    }
    setMicState('paused')
    setInterimTranscript('')
  }, [_teardownAudio])

  const resumeListening = useCallback(() => {
    if (recorderRef.current?.state === 'paused') {
      try { recorderRef.current.resume() } catch (_) {}
      setMicState('recording')
      setInterimTranscript('Listening...')
    } else {
      startListening()
    }
  }, [startListening])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [])

  const isListening = micState === 'recording' || micState === 'transcribing'
  const isPaused    = micState === 'paused'

  return {
    transcript,
    interimTranscript,
    isListening,
    isPaused,
    isSupported,
    micState,
    confidence: null,
    error,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    resetTranscript,
  }
}
