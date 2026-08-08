import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';

/**
 * The real voice interview.
 *
 * Questions arrive over the WebSocket as text. The candidate answers out loud
 * and the browser recording is sent back as audio, which the server stores
 * as-is — there is no transcription and no spoken question. Nothing on this
 * screen is simulated: if the socket is closed, the page says so rather than
 * showing a running timer.
 */

const formatTime = (sec) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

export default function LiveSession() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const interviewId = params.get('interview');

  const socketRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const [status, setStatus] = useState('connecting'); // connecting | ready | asking | answering | saving | complete | error
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState(null);
  const [recorded, setRecorded] = useState(null);
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [lastSkipped, setLastSkipped] = useState(null);
  const [progress, setProgress] = useState({ answered: 0, skipped: 0, total: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [micReady, setMicReady] = useState(false);
  const [recording, setRecording] = useState(false);

  // elapsed time, counted from when the socket opened — a real measurement,
  // not a decorative countdown
  useEffect(() => {
    if (status === 'connecting' || status === 'complete' || status === 'error') return undefined;
    const id = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  // Fetch the just-saved recording so the candidate can hear it back. The blob
  // URL is revoked on the way out — one per answer would otherwise leak for the
  // lifetime of the page.
  useEffect(() => {
    if (!recorded || !interviewId) return undefined;
    let url = null;
    let cancelled = false;

    api
      .answerAudioUrl(interviewId, recorded.sequence_no)
      .then((created) => {
        url = created;
        if (cancelled) URL.revokeObjectURL(created);
        else setPlaybackUrl(created);
      })
      .catch(() => setPlaybackUrl(null));

    return () => {
      cancelled = true;
      setPlaybackUrl(null);
      if (url) URL.revokeObjectURL(url);
    };
  }, [recorded, interviewId]);

  const send = useCallback((payload) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  }, []);

  // ---- connect ----
  useEffect(() => {
    if (!interviewId) {
      setError('No interview selected. Start one from the Interview section.');
      setStatus('error');
      return undefined;
    }

    // React StrictMode runs effects twice in development: the first socket is
    // closed by the cleanup below, and without this guard its onclose/onerror
    // would report a failure on the component that is still very much alive.
    let disposed = false;

    const socket = new WebSocket(api.voiceSocketUrl(interviewId));
    socketRef.current = socket;

    socket.onmessage = (event) => {
      if (disposed) return;
      const message = JSON.parse(event.data);

      if (message.type === 'ready') {
        setSession(message);
        setProgress({ answered: message.answered, skipped: message.skipped, total: message.total });
        setStatus('ready');
      } else if (message.type === 'question') {
        // May arrive unprompted, straight after a skip. The "skipped" notice is
        // left standing next to it so the candidate can see what just happened;
        // answering clears it.
        setQuestion(message);
        setRecorded(null);
        setStatus('asking');
      } else if (message.type === 'recorded') {
        setRecorded(message);
        setLastSkipped(null);
        setProgress({ answered: message.answered, skipped: message.skipped, total: message.total });
        setStatus('ready');
      } else if (message.type === 'skipped') {
        // The server sends the next question straight after this frame, so do
        // not clear `question` here — it would blank the screen for a moment.
        setLastSkipped(message.sequence_no);
        setRecorded(null);
        setProgress({ answered: message.answered, skipped: message.skipped, total: message.total });
      } else if (message.type === 'complete') {
        setProgress({ answered: message.answered, skipped: message.skipped, total: message.total });
        setQuestion(null);
        setStatus('complete');
      } else if (message.type === 'error') {
        setError(message.detail);
        // a per-answer error is recoverable; keep the session usable
        setStatus((prev) => (prev === 'saving' ? 'asking' : prev));
      }
    };

    socket.onerror = () => {
      if (disposed) return;
      setError('Connection failed. Is the API running?');
      setStatus('error');
    };

    socket.onclose = () => {
      if (disposed) return;
      setStatus((prev) => (prev === 'complete' ? prev : 'error'));
      setError((prev) => prev ?? 'The interview connection closed.');
    };

    return () => {
      disposed = true;
      socket.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [interviewId]);

  // ---- microphone ----
  const initMic = useCallback(async () => {
    if (recorderRef.current) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        chunksRef.current = [];
        setStatus('saving');

        const buffer = await blob.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);

        send({
          type: 'answer',
          audio_b64: btoa(binary),
          mime_type: recorder.mimeType.split(';')[0],
        });
      };

      recorderRef.current = recorder;
      setMicReady(true);
      return true;
    } catch (err) {
      setError(`Microphone unavailable: ${err.message}`);
      return false;
    }
  }, [send]);

  const askNext = async () => {
    setError(null);
    if (!(await initMic())) return;
    send({ type: 'next' });
  };

  const toggleRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (!recording) {
      chunksRef.current = [];
      recorder.start();
      setRecording(true);
      setStatus('answering');
    } else {
      recorder.stop();
      setRecording(false);
    }
  };

  const endSession = () => {
    send({ type: 'end' });
    socketRef.current?.close();
    navigate('/candidate#history');
  };

  const busy = status === 'saving';

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          SmartHire<span>_AI</span>
        </Link>
        <span className={`badge ${recording ? 'badge-bad' : 'badge-muted'}`}>
          {recording ? 'Recording' : 'Idle'}
        </span>

        <div className="topbar-end push">
          <span className="mono muted">
            {progress.answered} of {progress.total} answered
            {progress.skipped > 0 && ` · ${progress.skipped} skipped`}
          </span>
          <span className="badge badge-warn">{formatTime(elapsed)}</span>
          <button className="btn btn-danger" onClick={endSession}>
            End session
          </button>
        </div>
      </header>

      <main className="container">
        {status === 'connecting' && <p className="note">Connecting to the interview…</p>}

        {error && <p className="error">{error}</p>}

        {status === 'error' && (
          <div className="card">
            <h2>Session unavailable</h2>
            <p className="muted">
              The voice interview could not start. Generate an interview from your dashboard and try
              again.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/candidate#interview')}>
              Back to dashboard
            </button>
          </div>
        )}

        {status === 'complete' && (
          <div className="card">
            <h2>Interview complete</h2>
            <p className="note">
              You answered {progress.answered} of {progress.total} questions in{' '}
              {formatTime(elapsed)}.
              {progress.skipped > 0 &&
                ` ${progress.skipped} ${
                  progress.skipped === 1 ? 'question was' : 'questions were'
                } skipped and count as not attempted.`}
            </p>
            <p className="muted">
              Your spoken answers were recorded and saved against this interview. Nothing was
              transcribed and scoring is not implemented yet, so there is no result to show — the
              recordings themselves are what was kept.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/candidate#history')}>
              Back to history
            </button>
          </div>
        )}

        {session && status !== 'complete' && status !== 'error' && (
          <div className="grid cols-2">
            <section className="card">
              <h2>Session</h2>
              <div className="row">
                <div>
                  <strong>
                    {session.interview_type} &middot; {session.difficulty}
                  </strong>
                  <small>{session.domain}</small>
                </div>
              </div>
              <div className="row">
                <div>
                  <strong>Microphone</strong>
                  <small>{micReady ? 'Ready' : 'Granted when you start the first question'}</small>
                </div>
                <span className={`badge ${micReady ? 'badge-ok' : 'badge-muted'}`}>
                  {micReady ? 'ready' : 'not requested'}
                </span>
              </div>

              <p className="muted gap-top">
                Answers are spoken, recorded in the browser and stored as audio on the server. No
                transcription, webcam, eye-contact or confidence analysis exists — those are
                unbuilt modules, so nothing on this screen claims to measure them.
              </p>
            </section>

            <section className="card">
              <h2>
                {question
                  ? `Question ${question.sequence_no} of ${progress.total}`
                  : 'Ready when you are'}
              </h2>

              {question ? (
                <>
                  <p className="quote">{question.text}</p>
                  <small className="muted">{question.category}</small>
                </>
              ) : (
                <p className="note">Press “Next question” to begin. Read it, then answer aloud.</p>
              )}

              {status === 'saving' && <p className="note">Saving your recording…</p>}

              {lastSkipped !== null && (
                <p className="note">
                  Question {lastSkipped} skipped — recorded as <strong>not attempted</strong>. It
                  will not be asked again.
                </p>
              )}

              {recorded && (
                <>
                  <p className="label gap-top">Your answer, as recorded</p>
                  <p className="note">
                    Question {recorded.sequence_no} saved — {(recorded.bytes / 1024).toFixed(0)} KB
                    of {recorded.mime_type} audio.
                  </p>
                  {playbackUrl && <audio controls src={playbackUrl} className="gap-top" />}
                </>
              )}

              <div className="actions gap-top">
                {question && (
                  <button
                    className={recording ? 'btn btn-danger' : 'btn btn-primary'}
                    onClick={toggleRecording}
                    disabled={busy || !micReady}
                  >
                    {recording ? 'Stop and send' : 'Answer out loud'}
                  </button>
                )}
                {question && !recording && (
                  <button
                    className="btn"
                    onClick={() => {
                      // The server marks it not attempted and sends the next
                      // question on its own — no follow-up "next" needed.
                      setRecorded(null);
                      send({ type: 'skip' });
                    }}
                    disabled={busy}
                  >
                    Skip
                  </button>
                )}
                {!recording && (
                  <button className="btn" onClick={askNext} disabled={busy || recording}>
                    {question ? 'Next question' : 'Start'}
                  </button>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  );
}
