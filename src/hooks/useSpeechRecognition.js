import { useState, useEffect, useRef, useCallback } from 'react'

const DEFAULT_SILENCE_MS = 4000

export function useSpeechRecognition({
  onSilence       = null,
  silenceTimeout  = DEFAULT_SILENCE_MS,
  language        = 'en-US',
  continuous      = true,
  interimResults  = true,
} = {}) {
  const isSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const recognitionRef  = useRef(null)
  const silenceTimerRef = useRef(null)
  const finalTextRef    = useRef('')
  const mountedRef      = useRef(true)

  const [transcript,        setTranscript]        = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [micState,          setMicState]          = useState('idle')
  const [confidence,        setConfidence]        = useState(null)
  const [error,             setError]             = useState(null)

  const isListening = micState === 'listening'
  const isPaused    = micState === 'paused'

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer()
    if (!onSilence) return
    silenceTimerRef.current = setTimeout(() => {
      if (mountedRef.current) onSilence()
    }, silenceTimeout)
  }, [clearSilenceTimer, onSilence, silenceTimeout])

  const stopRecognition = useCallback(() => {
    clearSilenceTimer()
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_) {}
      recognitionRef.current = null
    }
  }, [clearSilenceTimer])

  const resetTranscript = useCallback(() => {
    finalTextRef.current = ''
    setTranscript('')
    setInterimTranscript('')
    setConfidence(null)
    setError(null)
  }, [])

  const buildRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SpeechRecognition()
    rec.continuous      = continuous
    rec.interimResults  = interimResults
    rec.lang            = language
    rec.maxAlternatives = 1

    rec.onstart = () => {
      if (!mountedRef.current) return
      console.log('[STT] Browser SpeechRecognition available:', isSupported)
      console.log('[STT] browser recognition started')
      setMicState('listening')
      setError(null)
      clearSilenceTimer()
    }

    rec.onresult = (event) => {
      if (!mountedRef.current) return
      let interim  = ''
      let newFinal = ''
      let bestConf = null

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const alt    = result[0]
        if (result.isFinal) {
          newFinal += alt.transcript
          if (alt.confidence != null) bestConf = alt.confidence
        } else {
          interim += alt.transcript
        }
      }

      if (interim) console.log(`[STT] Interim: "${interim.trim()}"`)

      if (newFinal) {
        console.log(`[STT] browser transcript received: "${newFinal.trim()}"`)
        const sep = finalTextRef.current && !finalTextRef.current.endsWith(' ') ? ' ' : ''
        finalTextRef.current += sep + newFinal.trim()
        setTranscript(finalTextRef.current)
        if (bestConf !== null) setConfidence(Math.round(bestConf * 100))
      }
      setInterimTranscript(interim)
      if (finalTextRef.current.trim() || interim.trim()) {
        resetSilenceTimer()
      }
    }

    rec.onerror = (event) => {
      if (!mountedRef.current) return
      if (event.error === 'no-speech') {
        setError(null)
        return
      }
      console.warn(`[STT] Browser STT error: ${event.error}`)
      const messages = {
        'not-allowed':    'Microphone access denied. Please allow microphone in browser settings.',
        'audio-capture':  'No microphone detected. Please connect a microphone.',
        'network':        'Network error during speech recognition.',
        'aborted':        null,
        'service-not-allowed': 'Speech service not allowed. Please check browser permissions.',
      }
      const msg = messages[event.error] !== undefined
        ? messages[event.error]
        : `Speech recognition error: ${event.error}`
      if (msg) setError(msg)
      setMicState('stopped')
      clearSilenceTimer()
    }

    rec.onend = () => {
      if (!mountedRef.current) return
      console.log('[STT] Browser STT ended')
      setInterimTranscript('')
      clearSilenceTimer()
      setMicState(prev => prev === 'listening' ? 'stopped' : prev)
    }

    return rec
  }, [continuous, interimResults, language, resetSilenceTimer, clearSilenceTimer])

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }
    stopRecognition()
    setError(null)
    setInterimTranscript('')
    setMicState('listening')
    const rec = buildRecognition()
    recognitionRef.current = rec
    try { rec.start() } catch (err) {
      setError('Failed to start speech recognition: ' + err.message)
      setMicState('stopped')
    }
  }, [isSupported, stopRecognition, buildRecognition])

  const stopListening = useCallback(() => {
    stopRecognition()
    setInterimTranscript('')
    setMicState('stopped')
  }, [stopRecognition])

  const pauseListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_) {}
      recognitionRef.current = null
    }
    clearSilenceTimer()
    setInterimTranscript('')
    setMicState('paused')
  }, [clearSilenceTimer])

  const resumeListening = useCallback(() => {
    if (!isSupported) return
    stopRecognition()
    const rec = buildRecognition()
    recognitionRef.current = rec
    setMicState('listening')
    try { rec.start() } catch (err) {
      setError('Failed to resume: ' + err.message)
      setMicState('paused')
    }
  }, [isSupported, stopRecognition, buildRecognition])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopRecognition()
    }
  }, [stopRecognition])

  return {
    transcript,
    interimTranscript,
    isListening,
    isPaused,
    isSupported,
    micState,
    confidence,
    error: error,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    resetTranscript,
  }
}
