import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';

/**
 * The real voice interview (Modules 3, 4 and 5).
 *
 * Questions arrive over the WebSocket as text. The candidate answers out loud;
 * the browser recording is sent back as audio, which the server stores and
 * then transcribes and analyses.
 *
 * Two things on this screen are deliberately unlike the rest:
 *
 *   The webcam is optional and off by default, and the screen says plainly
 *   what happens when it is on: the video is uploaded and stored against the
 *   interview. Only the candidate can play it back, and every access is
 *   logged. Recording someone's face is not something to do quietly, so
 *   nothing here is implied — it is stated on screen before and during.
 *
 *   The countdown is a real budget, not decoration. It comes from the
 *   administrator's session length, divided across the questions, and it warns
 *   rather than cutting the candidate off mid-sentence.
 */

const formatTime = (sec) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/**
 * Turn a getUserMedia failure into something the candidate can act on.
 *
 * The browser's own `err.message` is written for developers ("Requested device
 * not found"), and it does not distinguish the cases that need completely
 * different responses from the user: a permission they can grant, a device
 * they need to plug in, and another application they need to quit.
 *
 * `device` is "camera" or "microphone" — the same failures apply to both.
 */
function describeMediaError(err, device) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return (
        `Permission to use your ${device} was declined. Allow it from the ` +
        `padlock icon in your browser's address bar, then try again.`
      );
    case 'NotFoundError':
    case 'OverconstrainedError':
      return (
        `No ${device} was found. Connect one and try again — or carry on ` +
        `without it if you prefer.`
      );
    case 'NotReadableError':
    case 'AbortError':
      return (
        `Your ${device} is in use by another application. Close anything else ` +
        `using it (a video call, for instance) and try again.`
      );
    default:
      return `Your ${device} could not be started: ${err?.message || 'unknown error'}`;
  }
}

/**
 * getUserMedia is undefined outside a secure context, so a plain-HTTP host
 * other than localhost fails with a TypeError that reads like a bug rather
 * than a browser policy. Say what it actually is.
 */
function mediaUnsupportedReason() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return window.isSecureContext === false
      ? 'Your browser only allows camera and microphone access over HTTPS. Open this page on localhost or an https:// address.'
      : 'This browser does not support microphone or camera capture.';
  }
  if (typeof MediaRecorder === 'undefined') {
    // Permission could be granted and a stream obtained, and the recording
    // would still fail — worth catching before asking for the permission.
    return 'This browser cannot record media (no MediaRecorder support). Try Chrome, Edge or Firefox.';
  }
  return null;
}

/** Counted words as badges. Hoisted: a component defined inside the page would
 *  be a new type on every render and remount its children each time. */
function CountTags({ counts, variant = 'badge-muted' }) {
  const entries = Object.entries(counts || {});
  if (entries.length === 0) return <p className="note">None.</p>;
  return (
    <div className="tags">
      {entries.map(([word, count]) => (
        <span className={`badge ${variant}`} key={word}>
          {word} × {count}
        </span>
      ))}
    </div>
  );
}

/** One answer's analysis. Every section can independently be unavailable, and
 *  says why — an absent section is never rendered as a clean result. */
function AnswerAnalysis({ data }) {
  if (!data) return null;

  if (data.available === false) {
    return (
      <p className="note gap-top">
        {data.reason || 'This answer was not analysed.'} Your recording was saved either way.
      </p>
    );
  }

  const { fillers, pace, communication, pronunciation, transcript } = data;

  return (
    <div className="gap-top">
      {transcript !== undefined && (
        <>
          <p className="label">Transcript</p>
          {transcript ? (
            <p className="quote">{transcript}</p>
          ) : (
            <p className="note">
              No speech was picked up in this recording. Play it back above to check.
            </p>
          )}
        </>
      )}

      {/* --- measured --- */}
      <p className="label gap-top">Measured</p>

      <div className="row">
        <div>
          <strong>Filler words</strong>
          <small>
            {fillers?.total ?? 0} in {fillers?.word_count ?? 0} words
            {fillers?.per_100_words !== null && fillers?.per_100_words !== undefined
              ? ` · ${fillers.per_100_words} per 100 words`
              : ' · too short to give a rate'}
          </small>
        </div>
      </div>
      <CountTags counts={fillers?.by_word} variant="badge-warn" />

      {Object.keys(fillers?.discourse_markers || {}).length > 0 && (
        <>
          <p className="label gap-top">Also heard — not counted as fillers</p>
          <CountTags counts={fillers.discourse_markers} />
          <small className="muted">
            Each of these is also an ordinary word, so only some uses are filler. Listen back
            before treating them as a habit.
          </small>
        </>
      )}

      <div className="row gap-top">
        <div>
          <strong>Speaking pace</strong>
          {pace?.available ? (
            <small>
              {pace.words_per_minute} words per minute over {pace.duration_seconds}s of speech ·
              comfortable is {pace.comfortable_range?.[0]}–{pace.comfortable_range?.[1]}
            </small>
          ) : (
            <small>{pace?.reason || 'Not measured.'}</small>
          )}
        </div>
        {pace?.available && (
          <span className={`badge ${pace.verdict === 'comfortable' ? 'badge-ok' : 'badge-warn'}`}>
            {pace.verdict}
          </span>
        )}
      </div>

      {/* --- assessed --- */}
      <p className="label gap-top">AI assessment — an opinion, not a measurement</p>

      {communication?.available ? (
        <>
          <div className="row">
            <div>
              <strong>Clarity</strong>
              <small>{communication.clarity}</small>
            </div>
          </div>
          <div className="row">
            <div>
              <strong>Structure</strong>
              <small>{communication.structure}</small>
            </div>
          </div>
          <div className="row">
            <div>
              <strong>Conciseness</strong>
              <small>{communication.conciseness}</small>
            </div>
          </div>

          <p className="label gap-top">
            Grammar — {communication.grammar_issues?.length || 0}{' '}
            {communication.grammar_issues?.length === 1 ? 'issue' : 'issues'}
          </p>
          {communication.grammar_issues?.length ? (
            communication.grammar_issues.map((issue, index) => (
              <div className="row" key={`${issue.excerpt}-${index}`}>
                <div>
                  <strong>“{issue.excerpt}”</strong>
                  <small>
                    {issue.issue} → {issue.suggestion}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <p className="note">Nothing flagged in this answer.</p>
          )}

          {communication.strengths?.length > 0 && (
            <>
              <p className="label gap-top">Strengths</p>
              {communication.strengths.map((item) => (
                <div className="row" key={item}>
                  <div>
                    <small>{item}</small>
                  </div>
                </div>
              ))}
            </>
          )}
          {communication.improvements?.length > 0 && (
            <>
              <p className="label gap-top">To work on</p>
              {communication.improvements.map((item) => (
                <div className="row" key={item}>
                  <div>
                    <small>{item}</small>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      ) : (
        <p className="note">{communication?.reason || 'Communication review unavailable.'}</p>
      )}

      <div className="row gap-top">
        <div>
          <strong>Pronunciation</strong>
          {pronunciation?.available ? (
            <small>
              {pronunciation.intelligibility} — {pronunciation.notes}
            </small>
          ) : (
            <small>{pronunciation?.reason || 'Not assessed.'}</small>
          )}
        </div>
      </div>
      {pronunciation?.available && pronunciation.unclear_words?.length > 0 && (
        <>
          <p className="label">Hard to make out</p>
          <div className="tags">
            {pronunciation.unclear_words.map((word) => (
              <span className="badge badge-warn" key={word}>
                {word}
              </span>
            ))}
          </div>
        </>
      )}
      {pronunciation?.available && (
        <small className="muted">
          Listening notes only. There is no pronunciation score — scoring speech properly needs
          phoneme-level analysis this platform does not do.
        </small>
      )}
    </div>
  );
}

export default function LiveSession() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const interviewId = params.get('interview');

  const socketRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const videoRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  // Wall-clock start of the current recording. The measured speaking time is
  // what pace is computed from, so it is taken here rather than inferred from
  // when the question was asked — that interval also contains thinking time.
  const startedAtRef = useRef(null);

  const [status, setStatus] = useState('connecting'); // connecting | ready | asking | answering | saving | analysing | paused | complete | error
  // The status the interview was in when it was paused, so resuming puts the
  // screen back where it was rather than dumping the candidate at "ready".
  const beforePauseRef = useRef('ready');
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState(null);
  const [recorded, setRecorded] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [lastSkipped, setLastSkipped] = useState(null);
  const [progress, setProgress] = useState({ answered: 0, skipped: 0, total: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(null);
  const [micReady, setMicReady] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  // { state: 'uploading' | 'saved' | 'failed', detail } for the video upload.
  const [upload, setUpload] = useState(null);
  const [recording, setRecording] = useState(false);

  // Elapsed interview time — a real measurement, not a decorative counter.
  // It stops while paused, because paused time is real time but it is not
  // interview time and the candidate should not be charged for it.
  useEffect(() => {
    if (['connecting', 'complete', 'error', 'paused'].includes(status)) return undefined;
    const id = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  // Per-question countdown (Module 4). Soft expiry: it runs to zero and goes
  // negative to show the overrun, and nothing is cut off. An interview is a
  // conversation, and truncating someone mid-sentence measures their reflexes
  // rather than their answer.
  //
  // Paused is excluded for the same reason as above — otherwise pausing would
  // be a way to run the clock down, or to gain free thinking time, depending on
  // which way it leaked.
  useEffect(() => {
    if (!question || !session?.question_seconds) return undefined;
    setRemaining(session.question_seconds);
    return undefined;
  }, [question, session?.question_seconds]);

  useEffect(() => {
    if (!question || !session?.question_seconds || status === 'paused') return undefined;
    const id = setInterval(() => setRemaining((v) => (v === null ? null : v - 1)), 1000);
    return () => clearInterval(id);
  }, [question, session?.question_seconds, status]);

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
        setAnalysis(null);
        setStatus('asking');
      } else if (message.type === 'recorded') {
        setRecorded(message);
        setLastSkipped(null);
        setProgress({ answered: message.answered, skipped: message.skipped, total: message.total });
        // The audio is safe at this point; the transcript is still coming.
        setStatus(message.analysis_pending ? 'analysing' : 'ready');
      } else if (message.type === 'analysis') {
        setAnalysis(message);
        setStatus('ready');
      } else if (message.type === 'paused') {
        setStatus('paused');
      } else if (message.type === 'resumed') {
        // Back to whatever was on screen before, so resuming does not lose the
        // question the candidate was part-way through reading.
        setStatus(beforePauseRef.current);
      } else if (message.type === 'closed') {
        setProgress({ answered: message.answered, skipped: message.skipped, total: message.total });
        setQuestion(null);
        setStatus('complete');
      } else if (message.type === 'skipped') {
        // The server sends the next question straight after this frame, so do
        // not clear `question` here — it would blank the screen for a moment.
        setLastSkipped(message.sequence_no);
        setRecorded(null);
        setAnalysis(null);
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

    const unsupported = mediaUnsupportedReason();
    if (unsupported) {
      setError(unsupported);
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        chunksRef.current = [];
        setStatus('saving');

        // Measured speaking time, in seconds. The server sanity-checks it and
        // withholds pace entirely rather than trusting a nonsense value.
        const seconds = startedAtRef.current
          ? (Date.now() - startedAtRef.current) / 1000
          : null;
        startedAtRef.current = null;

        const buffer = await blob.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);

        send({
          type: 'answer',
          audio_b64: btoa(binary),
          mime_type: recorder.mimeType.split(';')[0],
          duration_seconds: seconds,
        });
      };

      recorderRef.current = recorder;
      setMicReady(true);
      return true;
    } catch (err) {
      setError(describeMediaError(err, 'microphone'));
      setMicReady(false);
      return false;
    }
  }, [send]);

  // ---- webcam ----
  //
  // Preview and local recording only. The stream is never sent anywhere: there
  // is no upload path for video in this app, by design.
  const startCamera = useCallback(async () => {
    setCameraError(null);

    const unsupported = mediaUnsupportedReason();
    if (unsupported) {
      setCameraError(unsupported);
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const recorder = new MediaRecorder(stream);
      const startedAt = Date.now();
      recorder.ondataavailable = (e) => videoChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(videoChunksRef.current, { type: recorder.mimeType });
        videoChunksRef.current = [];

        // Local playback first, so the candidate can watch it back even if the
        // upload fails.
        setVideoUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return URL.createObjectURL(blob);
        });

        if (!interviewId) return;
        setUpload({ state: 'uploading', detail: null });
        try {
          const saved = await api.uploadRecording(
            interviewId,
            blob,
            (Date.now() - startedAt) / 1000,
          );
          setUpload({
            state: 'saved',
            detail: `${(saved.size_bytes / (1024 * 1024)).toFixed(1)} MB saved`,
          });
        } catch (err) {
          // The interview itself is unaffected — answers went over the socket
          // and are already stored. Say so, rather than implying data loss.
          setUpload({ state: 'failed', detail: err.message });
        }
      };
      videoRecorderRef.current = { recorder, stream };
      recorder.start();

      setCameraOn(true);
      return true;
    } catch (err) {
      // The camera is optional, so every one of these ends with the same
      // reassurance: the interview is not blocked by it.
      setCameraError(
        `${describeMediaError(err, 'camera')} The interview runs fine without it.`,
      );
      setCameraOn(false);
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    const held = videoRecorderRef.current;
    if (!held) return;
    if (held.recorder.state !== 'inactive') held.recorder.stop();
    held.stream.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    videoRecorderRef.current = null;
    setCameraOn(false);
  }, []);

  // Camera off and video discarded when the page goes away. This is the
  // promise the panel makes to the candidate, so it must hold on every exit
  // path — navigation, reload, or closing the tab.
  useEffect(
    () => () => {
      const held = videoRecorderRef.current;
      if (held) {
        if (held.recorder.state !== 'inactive') held.recorder.stop();
        held.stream.getTracks().forEach((track) => track.stop());
      }
      setVideoUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
    },
    [],
  );

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
      startedAtRef.current = Date.now();
      recorder.start();
      setRecording(true);
      setStatus('answering');
    } else {
      recorder.stop();
      setRecording(false);
    }
  };

  const togglePause = () => {
    if (status === 'paused') {
      send({ type: 'resume' });
      return;
    }
    // Remember where we were so resuming restores it, then pause.
    beforePauseRef.current = question ? 'asking' : 'ready';
    send({ type: 'pause' });
  };

  const endSession = () => {
    stopCamera();
    // Do NOT close the socket here. `end` is what marks the interview
    // COMPLETED server-side; closing first would race the frame and leave the
    // session IN_PROGRESS for ever — which is exactly the bug this replaced.
    // The `closed` frame drives the navigation instead.
    send({ type: 'end' });
  };

  // Leave for the history page once the server confirms the session is closed.
  useEffect(() => {
    if (status !== 'complete') return undefined;
    const id = setTimeout(() => socketRef.current?.close(), 250);
    return () => clearTimeout(id);
  }, [status]);

  const busy = status === 'saving';
  const paused = status === 'paused';
  const overrun = remaining !== null && remaining < 0;

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          SmartHire<span>_AI</span>
        </Link>
        <span
          className={`badge ${
            status === 'paused' ? 'badge-warn' : recording ? 'badge-bad' : 'badge-muted'
          }`}
        >
          {status === 'paused' ? 'Paused' : recording ? 'Recording' : 'Idle'}
        </span>

        <div className="topbar-end push">
          <span className="mono muted">
            {progress.answered} of {progress.total} answered
            {progress.skipped > 0 && ` · ${progress.skipped} skipped`}
          </span>
          {question && remaining !== null && (
            <span className={`badge ${overrun ? 'badge-bad' : 'badge-ok'}`}>
              {overrun ? `+${formatTime(Math.abs(remaining))} over` : formatTime(remaining)}
            </span>
          )}
          <span className="badge badge-warn">{formatTime(elapsed)}</span>
          {session && status !== 'complete' && status !== 'error' && (
            <button
              className="btn"
              onClick={togglePause}
              // Pausing mid-recording would leave a half-captured answer with a
              // duration that no longer matches the audio, and pace is computed
              // from that duration. Stop the recording first.
              disabled={recording || busy || status === 'analysing'}
              title={recording ? 'Stop the recording before pausing' : undefined}
            >
              {status === 'paused' ? 'Resume' : 'Pause'}
            </button>
          )}
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
              {formatTime(elapsed)} of interview time.
              {progress.answered + progress.skipped < progress.total &&
                ` ${
                  progress.total - progress.answered - progress.skipped
                } were left unanswered — the session was ended early, and they are recorded as unanswered rather than skipped.`}
              {progress.skipped > 0 &&
                ` ${progress.skipped} ${
                  progress.skipped === 1 ? 'question was' : 'questions were'
                } skipped and count as not attempted.`}
            </p>
            <p className="muted">
              Your recordings, transcripts and per-answer communication analysis are saved against
              this interview. There is no overall score — scoring is a separate module that is not
              built, so nothing here ranks or grades you.
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

              <div className="row">
                <div>
                  <strong>Time per question</strong>
                  <small>
                    {session.question_seconds
                      ? `${formatTime(session.question_seconds)} — set by your administrator's session length, split across ${progress.total} questions`
                      : 'No limit set for this interview.'}
                  </small>
                </div>
              </div>

              {/* --- webcam --- */}
              <div className="row">
                <div>
                  <strong>Camera</strong>
                  <small>
                    {cameraOn
                      ? 'Recording — this will be saved to your interview when you turn it off'
                      : 'Optional. Turning it on records video that is stored with this interview.'}
                  </small>
                </div>
                <button className="btn" onClick={cameraOn ? stopCamera : startCamera}>
                  {cameraOn ? 'Turn off' : 'Turn on'}
                </button>
              </div>

              {cameraError && <p className="note">{cameraError}</p>}

              <video
                ref={videoRef}
                muted
                playsInline
                className="gap-top"
                style={{
                  width: '100%',
                  borderRadius: 8,
                  display: cameraOn ? 'block' : 'none',
                  background: '#000',
                }}
              />

              {cameraOn && (
                <small className="muted">
                  You are being recorded. When you turn the camera off, this video is uploaded and
                  stored against this interview. Only you can play it back — recruiters and
                  administrators cannot — and every playback is logged.
                </small>
              )}

              {upload?.state === 'uploading' && (
                <p className="note">Uploading your camera recording…</p>
              )}
              {upload?.state === 'failed' && (
                <p className="note">
                  Your camera recording could not be uploaded: {upload.detail} Your spoken answers
                  were sent separately and are safely stored — only the video is affected. It is
                  still playable below until you leave this page.
                </p>
              )}

              {videoUrl && !cameraOn && (
                <>
                  <p className="label gap-top">Your camera recording</p>
                  <video controls src={videoUrl} style={{ width: '100%', borderRadius: 8 }} />
                  <small className="muted">
                    {upload?.state === 'saved'
                      ? `Saved to this interview — ${upload.detail}. Only you can play it back, and every access is logged.`
                      : 'Playing from this browser tab. Download it if you want your own copy.'}
                  </small>
                </>
              )}

              <p className="muted gap-top">
                Your spoken answer is recorded, stored, transcribed and analysed for fillers, pace,
                grammar and clarity. No eye-contact, emotion or confidence analysis exists — that
                is an unbuilt module, so nothing here claims to measure it.
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

              {status === 'paused' && (
                <p className="note">
                  <strong>Paused.</strong> The clock is stopped and the next question is not
                  available until you resume. Time spent paused is recorded separately and does
                  not count towards your interview time.
                </p>
              )}

              {overrun && status !== 'paused' && (
                <p className="note">
                  You are past the suggested time for this question. Nothing has been cut off —
                  finish your thought, then stop the recording.
                </p>
              )}

              {status === 'saving' && <p className="note">Saving your recording…</p>}
              {status === 'analysing' && (
                <p className="note">
                  Recording saved. Transcribing and analysing your answer — this takes a few
                  seconds.
                </p>
              )}

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
                    of {recorded.mime_type} audio
                    {recorded.duration_seconds ? `, ${recorded.duration_seconds}s of speech` : ''}.
                  </p>
                  {playbackUrl && <audio controls src={playbackUrl} className="gap-top" />}
                </>
              )}

              <AnswerAnalysis data={analysis} />

              <div className="actions gap-top">
                {question && (
                  <button
                    className={recording ? 'btn btn-danger' : 'btn btn-primary'}
                    onClick={toggleRecording}
                    disabled={busy || !micReady || paused}
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
                      setAnalysis(null);
                      send({ type: 'skip' });
                    }}
                    disabled={busy || paused}
                  >
                    Skip
                  </button>
                )}
                {!recording && (
                  <button className="btn" onClick={askNext} disabled={busy || recording || paused}>
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
