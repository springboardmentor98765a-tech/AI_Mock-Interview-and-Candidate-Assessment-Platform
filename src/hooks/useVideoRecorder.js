import { useRef, useState, useCallback } from 'react'

/**
 * useVideoRecorder
 *
 * Records the webcam video stream independently of the STT audio pipeline.
 * Accepts a MediaStream (video-only, already acquired by Phase 1 camera code).
 * Never touches the microphone or the existing STT MediaRecorder.
 *
 * Usage:
 *   const rec = useVideoRecorder()
 *   rec.start(videoStream)     — begin recording
 *   rec.pause()                — pause (matches session pause)
 *   rec.resume()               — resume
 *   const blob = await rec.stop()  — stop and get the Blob
 */
export function useVideoRecorder() {
  const mediaRecorderRef = useRef(null)
  const chunksRef        = useRef([])
  const startTimeRef     = useRef(null)
  const endTimeRef       = useRef(null)
  const mimeTypeRef      = useRef('video/webm')

  const [recState, setRecState] = useState('idle') // 'idle' | 'recording' | 'paused' | 'stopped'

  // Pick the best supported MIME type for video recording
  function pickMime() {
    const candidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/ogg;codecs=theora',
    ]
    for (const mime of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
        return mime
      }
    }
    return ''
  }

  const start = useCallback((stream) => {
    if (!stream || !stream.active) {
      console.warn('[VideoRecorder] No active stream provided — skipping')
      return
    }
    if (typeof MediaRecorder === 'undefined') {
      console.warn('[VideoRecorder] MediaRecorder not supported in this browser')
      return
    }

    // Stop any existing recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    chunksRef.current = []
    const mime = pickMime()
    mimeTypeRef.current = mime || 'video/webm'

    let recorder
    try {
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    } catch (e) {
      console.error('[VideoRecorder] Failed to create MediaRecorder:', e.message)
      return
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }

    recorder.onstart = () => {
      startTimeRef.current = new Date().toISOString()
      console.log('[VideoRecorder] Recording started, mime:', mimeTypeRef.current)
      setRecState('recording')
    }

    recorder.onpause = () => {
      console.log('[VideoRecorder] Paused')
      setRecState('paused')
    }

    recorder.onresume = () => {
      console.log('[VideoRecorder] Resumed')
      setRecState('recording')
    }

    recorder.onstop = () => {
      endTimeRef.current = new Date().toISOString()
      console.log(`[VideoRecorder] Stopped — ${chunksRef.current.length} chunks collected`)
      setRecState('stopped')
    }

    recorder.onerror = (e) => {
      console.error('[VideoRecorder] Error:', e.error?.message || e)
      setRecState('idle')
    }

    mediaRecorderRef.current = recorder
    // Collect a chunk every 5s so we always have data even on short recordings
    recorder.start(5000)
  }, [])

  const pause = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (!mr || mr.state !== 'recording') return
    try {
      mr.pause()
    } catch (e) {
      console.warn('[VideoRecorder] Pause failed:', e.message)
    }
  }, [])

  const resume = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (!mr || mr.state !== 'paused') return
    try {
      mr.resume()
    } catch (e) {
      console.warn('[VideoRecorder] Resume failed:', e.message)
    }
  }, [])

  // Returns a Promise<Blob> — resolves when onstop fires and blob is built
  const stop = useCallback(() => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current
      if (!mr || mr.state === 'inactive') {
        // No recording in progress — resolve with null
        resolve(null)
        return
      }

      const originalOnStop = mr.onstop
      mr.onstop = (e) => {
        if (originalOnStop) originalOnStop(e)
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || 'video/webm' })
        console.log(`[VideoRecorder] Blob created — ${(blob.size / 1024).toFixed(1)} KB, type: ${blob.type}`)
        resolve(blob)
      }

      try {
        mr.stop()
      } catch (err) {
        console.warn('[VideoRecorder] Stop error:', err.message)
        resolve(null)
      }
    })
  }, [])

  return {
    recState,
    mimeType: mimeTypeRef.current,
    startTime: startTimeRef.current,
    endTime: endTimeRef.current,
    start,
    pause,
    resume,
    stop,
  }
}
