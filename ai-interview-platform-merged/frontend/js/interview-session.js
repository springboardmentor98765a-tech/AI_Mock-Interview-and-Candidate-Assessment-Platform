// ============================================================
// Live Proctored Interview Session
// Talks to the Python Module 3 service (apiFetchPy, from script.js)
// for questions / answers / violations / finishing the session.
// ============================================================

// Per-question time "weight" by category + difficulty — used only to
// build the overall session time budget below, not shown per-question.
// Categories aren't interchangeable: a quick HR/Aptitude question
// deserves far less of the budget than a Behavioral story or an
// open-ended Technical design question.
const CATEGORY_DIFFICULTY_SECONDS = {
  HR: { easy: 60, medium: 90, hard: 120 },
  Aptitude: { easy: 60, medium: 90, hard: 120 },
  Behavioral: { easy: 90, medium: 120, hard: 180 },
  Technical: { easy: 90, medium: 150, hard: 240 }, // hard tier is largely
  // open-ended system-design questions (see question_bank.py) — these
  // need real thinking + explaining time, not a quick-recall window.
};
const DEFAULT_DIFFICULTY_SECONDS = { easy: 90, medium: 120, hard: 150 }; // fallback for unknown categories
const LONG_QUESTION_BONUS_SECONDS = 20; // extra reading/thinking time for a longer prompt
const LONG_QUESTION_WORD_THRESHOLD = 22;

function getQuestionTimeWeight(question) {
  const byCategory = CATEGORY_DIFFICULTY_SECONDS[question.category];
  const table = byCategory || DEFAULT_DIFFICULTY_SECONDS;
  let seconds = table[question.difficulty] || table.medium || 120;

  const wordCount = (question.question_text || '').trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > LONG_QUESTION_WORD_THRESHOLD) {
    seconds += LONG_QUESTION_BONUS_SECONDS;
  }
  return seconds;
}

// The whole session gets ONE countdown, not one per question — its
// length is just each question's weight added up, so a 5-question set
// and a 30-question set each get a total that actually fits their mix
// of categories/difficulties (e.g. five easy HR questions total far
// less time than five hard Technical ones would).
function computeSessionTimeBudget(qs) {
  return qs.reduce((sum, q) => sum + getQuestionTimeWeight(q), 0);
}

const MAX_STRIKES = 5;
const VIOLATION_COOLDOWN_MS = 8000; // don't spam the same violation type more than once per 8s
const FACE_CHECK_INTERVAL_MS = 1500;
const NO_FACE_STRIKES_BEFORE_WARN = 3; // ~4.5s of no face before it counts as a violation
const FACE_MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

let interviewId = null;
let interview = null;
let questions = [];
let currentIndex = 0;
let localAnswers = {}; // questionId -> { text, inputMode }

let webcamStream = null;
let faceApiReady = false;
let faceCheckTimer = null;
let noFaceStreak = 0;

// ---------------------------------------------------------------
// Recording — MediaRecorder captures the SAME webcamStream already
// used for proctoring/webcam preview (no second getUserMedia call).
// One recording per session: started once camera/mic access is
// granted, paused/resumed alongside the session itself, stopped and
// uploaded exactly once when the session ends (Finish, timeout
// auto-submit, or violation auto-submit all funnel through
// finishInterview() below).
// ---------------------------------------------------------------
let mediaRecorder = null;
let recordedChunks = [];
let recordingMimeType = '';
let recordingStartedAt = null;
let recordingSecondsRecorded = 0; // wall-clock seconds actually spent recording (excludes pauses)
let recordingSegmentStartedAt = null;

// Tried in order — the browser picks the first one it actually supports.
const RECORDING_MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

// Microphone level meter (Web Audio API) — proves the audio track is
// actually being captured, not just requested.
let micAudioCtx = null;
let micAnalyser = null;
let micLevelTimer = null;

// Pause/resume — sessionPaused is checked by the timers and by every
// proctoring listener so nothing ticks or fires warnings while paused.
let sessionPaused = false;
let pauseInProgress = false;

let overallTimerInterval = null;
let overallSecondsLeft = 0; // counts DOWN from the whole-session budget
let questionStartedAt = 0; // still tracked per-question for the answers' timeTakenSeconds field

let strikeCount = 0;
let lastViolationAt = {}; // type -> timestamp
let sessionActive = false;
let sessionFinished = false;
// True from the moment finishInterview() starts until its PATCH .../finish
// call actually settles (success or failure). Kept separate from
// sessionFinished so the beforeunload guard below stays armed for the
// full round trip — otherwise a stray click/refresh/reload right after
// clicking "Finish Interview" can silently cancel the in-flight request,
// and the interview is stuck "Scheduled" forever even though every
// answer was already saved.
let finishInProgress = false;

let recognition = null;
let micActive = false;
let baseTextBeforeVoice = '';

// ---------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------
async function initInterviewSession() {
  const params = new URLSearchParams(window.location.search);
  interviewId = params.get('id');

  // Fallback for static servers that strip the query string when
  // redirecting /interview-session.html -> /interview-session (e.g.
  // `serve`'s "clean URLs" behaviour) — script.js's goToInterviewSession()
  // stashes the id here right before navigating, just in case.
  if (!interviewId) {
    try {
      interviewId = sessionStorage.getItem('pendingInterviewId');
    } catch (e) {
      /* sessionStorage unavailable */
    }
  }
  try {
    sessionStorage.removeItem('pendingInterviewId');
  } catch (e) {
    /* no-op */
  }

  if (!interviewId) {
    showToast('No interview selected.', 'error');
    window.location.href = 'candidate.html';
    return;
  }

  try {
    const data = await apiFetchPy(`/interviews/${interviewId}`);
    interview = data.interview;
    questions = data.questions || [];
  } catch (err) {
    showToast(err.message || 'Could not load this interview.', 'error');
    window.location.href = 'candidate.html';
    return;
  }

  if (!questions.length) {
    showToast('This session has no AI-generated questions to answer.', 'info');
    window.location.href = 'candidate.html';
    return;
  }

  if (interview.status === 'completed') {
    document.getElementById('preStartOverlay').style.display = 'none';
    showCompletedAlready();
    return;
  }

  document.getElementById('sessionInterviewType').textContent = interview.interview_type;

  // Preload any answers already saved (e.g. candidate reloaded the page).
  try {
    const savedAnswers = await apiFetchPy(`/interviews/${interviewId}/answers`);
    (savedAnswers || []).forEach((a) => {
      localAnswers[a.question_id] = { text: a.answer_text || '', inputMode: a.input_mode || 'typed' };
    });
  } catch (err) {
    // Non-fatal — session just starts with blank answers.
    console.warn('Could not preload saved answers:', err);
  }
}

function showCompletedAlready() {
  const overlay = document.getElementById('finishOverlay');
  overlay.style.display = 'flex';
  document.getElementById('finishHeading').textContent = '✅ Already completed';
  document.getElementById('finishSubtext').textContent = 'You already finished this interview.';
  document.getElementById('finishScoreBox').style.display = 'block';
  document.getElementById('finishScoreCircle').textContent =
    interview.score !== null && interview.score !== undefined ? `${interview.score}%` : '—';
  document.getElementById('finishFeedbackText').textContent = interview.ai_feedback || '';
}

// ---------------------------------------------------------------
// Pre-start: camera permission + fullscreen
// ---------------------------------------------------------------
async function beginProctoredSession() {
  const btn = document.getElementById('preStartBtn');
  const errBox = document.getElementById('preStartError');
  errBox.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Requesting camera & microphone…';

  // Best-effort pre-check so we can give a specific message ("no camera
  // found" vs "no microphone found") before even prompting for
  // permission — device labels aren't available pre-permission, but
  // kind/count are, which is enough to catch the "no such device" case.
  let missingCamera = false;
  let missingMic = false;
  try {
    if (navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      missingCamera = !devices.some((d) => d.kind === 'videoinput');
      missingMic = !devices.some((d) => d.kind === 'audioinput');
    }
  } catch (e) {
    /* enumeration isn't critical — fall through to getUserMedia */
  }

  if (missingCamera || missingMic) {
    const what = missingCamera && missingMic ? 'camera or microphone' : missingCamera ? 'camera' : 'microphone';
    errBox.textContent = `No ${what} was found on this device. Please connect one and try again.`;
    errBox.style.display = 'block';
    btn.disabled = false;
    btn.textContent = '▶ Enable Camera & Start';
    return;
  }

  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 480, height: 360 },
      audio: true,
    });
  } catch (err) {
    errBox.textContent = preStartErrorMessage(err);
    errBox.style.display = 'block';
    btn.disabled = false;
    btn.textContent = '▶ Enable Camera & Start';
    return;
  }

  const video = document.getElementById('webcamVideo');
  video.srcObject = webcamStream;
  startMicLevelMeter();
  startRecording();

  // Fullscreen is best-effort — some browsers/embedded contexts block it,
  // so a failure here doesn't stop the interview, it just skips that check.
  try {
    await (document.documentElement.requestFullscreen && document.documentElement.requestFullscreen());
  } catch (err) {
    console.warn('Fullscreen request failed/denied:', err);
  }

  try {
    const updated = await apiFetchPy(`/interviews/${interviewId}/begin`, { method: 'PATCH' });
    interview = updated;
  } catch (err) {
    // Non-fatal — the candidate already has camera/mic access, so let
    // them proceed locally even if the status update didn't stick;
    // /finish will still succeed at the end.
    console.warn('Could not mark interview as started:', err);
  }

  document.getElementById('preStartOverlay').style.display = 'none';
  document.getElementById('sessionShell').style.display = 'flex';
  sessionActive = true;
  sessionPaused = false;
  updateSessionStatusBadge();

  attachProctoringListeners();
  setupFaceDetection(); // async, non-blocking
  startOverallTimer(computeSessionTimeBudget(questions));
  renderQuestion(0);
}

// Maps getUserMedia failures to a message that tells the candidate
// what actually went wrong and what to do about it.
function preStartErrorMessage(err) {
  switch (err && err.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera and microphone access were denied. Please allow both permissions in your browser and try again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera or microphone could be found on this device. Please connect one and try again.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Your camera or microphone is already in use by another application. Close it and try again.';
    default:
      return 'Camera and microphone access are required for this proctored assessment. Please allow both permissions and try again.';
  }
}

// ---------------------------------------------------------------
// Question rendering + navigation
// ---------------------------------------------------------------
function renderQuestion(index) {
  currentIndex = index;
  const q = questions[index];

  document.getElementById('sessionProgress').textContent = `Question ${index + 1} / ${questions.length}`;
  document.getElementById('qCategoryBadge').textContent = q.category;
  document.getElementById('qDifficultyBadge').textContent = q.difficulty;
  document.getElementById('questionText').textContent = q.question_text;

  const saved = localAnswers[q.id];
  document.getElementById('answerText').value = saved ? saved.text : '';
  document.getElementById('micStatus').textContent = '';
  stopVoiceInputIfActive();

  document.getElementById('nextBtn').textContent =
    index === questions.length - 1 ? 'Finish Interview ✔' : 'Save & Next ▶';

  questionStartedAt = Date.now(); // still used for the per-answer timeTakenSeconds field
}

// One countdown for the whole session — sized once at the start from
// computeSessionTimeBudget(questions), so it already scales with the
// question count and its mix of categories/difficulties (5 easy HR
// questions vs. 30 mixed questions each get an appropriately sized
// total instead of a per-question clock).
function startOverallTimer(seconds) {
  clearInterval(overallTimerInterval);
  if (typeof seconds === 'number') overallSecondsLeft = seconds;
  updateOverallTimerDisplay();
  overallTimerInterval = setInterval(() => {
    overallSecondsLeft -= 1;
    updateOverallTimerDisplay();
    if (overallSecondsLeft <= 0) {
      clearInterval(overallTimerInterval);
      showToast("Time's up for the interview — auto-submitting.", 'info');
      autoSubmitDueToTimeout();
    }
  }, 1000);
}

function updateOverallTimerDisplay() {
  const el = document.getElementById('overallTimer');
  const m = Math.floor(Math.max(0, overallSecondsLeft) / 60).toString().padStart(2, '0');
  const s = Math.max(0, overallSecondsLeft % 60).toString().padStart(2, '0');
  el.textContent = `Total ${m}:${s}`;
  el.classList.toggle('session-timer-low', overallSecondsLeft <= 30);
}

async function autoSubmitDueToTimeout() {
  if (finishInProgress || sessionFinished) return;
  await saveCurrentAnswer();
  finishInterview();
}

async function saveCurrentAnswer() {
  const q = questions[currentIndex];
  const text = document.getElementById('answerText').value.trim();
  const inputMode = localAnswers[q.id]?.inputMode === 'voice' && !text ? 'typed' : localAnswers[q.id]?.usedVoice ? 'voice' : 'typed';
  const timeTaken = Math.max(0, Math.round((Date.now() - questionStartedAt) / 1000));

  localAnswers[q.id] = { text, inputMode, usedVoice: localAnswers[q.id]?.usedVoice };

  try {
    await apiFetchPy(`/interviews/${interviewId}/answers`, {
      method: 'POST',
      body: JSON.stringify({
        questionId: q.id,
        answerText: text,
        inputMode,
        timeTakenSeconds: timeTaken,
      }),
    });
  } catch (err) {
    console.error('Failed to save answer:', err);
    showToast('Could not save that answer — check your connection.', 'error');
  }
}

async function goToNextQuestion() {
  document.getElementById('nextBtn').disabled = true;
  await saveCurrentAnswer();
  document.getElementById('nextBtn').disabled = false;

  if (currentIndex === questions.length - 1) {
    finishInterview();
  } else {
    renderQuestion(currentIndex + 1);
  }
}

// ---------------------------------------------------------------
// Finish
// ---------------------------------------------------------------
async function finishInterview() {
  if (finishInProgress || sessionFinished) return;
  finishInProgress = true;
  sessionActive = false;

  clearInterval(overallTimerInterval);
  clearInterval(faceCheckTimer);
  stopVoiceInputIfActive();

  // Stop the recorder first (while the stream is still live) so its
  // final chunk flushes cleanly, then release the camera/mic.
  const recordingBlob = await stopRecordingAndGetBlob();
  stopWebcamTracks(); // turn the camera off right away — proctoring listeners (incl. the
                       // leave-page guard) stay armed until everything below settles
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  document.getElementById('sessionShell').style.display = 'none';
  const overlay = document.getElementById('finishOverlay');
  overlay.style.display = 'flex';
  document.getElementById('finishHeading').textContent = '⏳ Scoring your interview…';
  document.getElementById('finishSubtext').textContent = 'The AI is reviewing your answers. This takes a few seconds.';
  document.getElementById('finishScoreBox').style.display = 'none';

  try {
    const result = await apiFetchPy(`/interviews/${interviewId}/finish`, { method: 'PATCH' });
    document.getElementById('finishHeading').textContent = '✅ Interview complete';
    document.getElementById('finishSubtext').textContent = `"${result.interview_type}" — report ready.`;
    document.getElementById('finishScoreBox').style.display = 'block';
    document.getElementById('finishScoreCircle').textContent = `${result.score}%`;
    document.getElementById('finishFeedbackText').textContent = result.ai_feedback || '';
  } catch (err) {
    document.getElementById('finishHeading').textContent = '⚠️ Could not score interview';
    document.getElementById('finishSubtext').textContent =
      err.message || 'Something went wrong while scoring. Your answers were saved — try again from the dashboard.';
  }

  // Uploading the recording never blocks or fails the score above —
  // it's a best-effort add-on, handled (and reported) entirely inside
  // uploadRecording() itself.
  await uploadRecording(recordingBlob);

  // Only now is it safe to let the candidate navigate away freely.
  sessionFinished = true;
  finishInProgress = false;
  removeProctoringListeners();
}

async function autoSubmitDueToViolations() {
  if (finishInProgress || sessionFinished) return;
  showToast('Too many proctoring warnings — auto-submitting your interview.', 'error');
  await saveCurrentAnswer();
  finishInterview();
}

// ---------------------------------------------------------------
// Question audio (reuses the same authenticated-blob approach as
// script.js's playQuestionAudio, scoped to the current question)
// ---------------------------------------------------------------
async function playCurrentQuestionAudio() {
  const q = questions[currentIndex];
  const btn = document.getElementById('playAudioBtn');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ Loading…';
  try {
    const token = getToken();
    const res = await fetch(`${PY_API_BASE_URL}/interviews/${interviewId}/questions/${q.id}/tts`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Could not generate audio for this question.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    btn.textContent = '🔊 Playing…';
    audio.addEventListener('ended', () => {
      btn.textContent = original;
      btn.disabled = false;
      URL.revokeObjectURL(url);
    });
    await audio.play();
  } catch (err) {
    showToast(err.message || 'Could not play question audio.', 'error');
    btn.textContent = original;
    btn.disabled = false;
  }
}

// ---------------------------------------------------------------
// Voice answer input (Web Speech API — Chrome/Edge). Falls back
// gracefully with a disabled button + note on unsupported browsers.
// ---------------------------------------------------------------
function toggleVoiceInput() {
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    document.getElementById('micStatus').textContent = 'Voice input is not supported in this browser — try Chrome.';
    return;
  }

  if (micActive) {
    stopVoiceInputIfActive();
    return;
  }

  recognition = new SpeechRecognitionCtor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  const textarea = document.getElementById('answerText');
  baseTextBeforeVoice = textarea.value ? `${textarea.value.trim()} ` : '';

  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalTranscript += transcript;
      else interimTranscript += transcript;
    }
    if (finalTranscript) baseTextBeforeVoice += `${finalTranscript} `;
    textarea.value = baseTextBeforeVoice + interimTranscript;
    const q = questions[currentIndex];
    localAnswers[q.id] = { ...(localAnswers[q.id] || {}), usedVoice: true };
  };

  recognition.onerror = (event) => {
    document.getElementById('micStatus').textContent = `Voice input error: ${event.error}`;
    stopVoiceInputIfActive();
  };

  recognition.onend = () => {
    if (micActive) {
      // Some browsers auto-stop after a pause — restart seamlessly
      // while the mic button is still toggled on.
      try {
        recognition.start();
      } catch (e) {
        micActive = false;
        updateMicButton();
      }
    }
  };

  try {
    recognition.start();
    micActive = true;
    updateMicButton();
    document.getElementById('micStatus').textContent = 'Listening…';
  } catch (err) {
    document.getElementById('micStatus').textContent = 'Could not start voice input.';
  }
}

function stopVoiceInputIfActive() {
  micActive = false;
  if (recognition) {
    try {
      recognition.onend = null;
      recognition.stop();
    } catch (e) {
      /* no-op */
    }
    recognition = null;
  }
  updateMicButton();
  const status = document.getElementById('micStatus');
  if (status && status.textContent === 'Listening…') status.textContent = '';
}

function updateMicButton() {
  const btn = document.getElementById('micBtn');
  if (!btn) return;
  btn.classList.toggle('session-mic-active', micActive);
  btn.textContent = micActive ? '⏹ Stop Voice Answer' : '🎙️ Start Voice Answer';
}

// ---------------------------------------------------------------
// Proctoring — violation logging (shared by all detectors below)
// ---------------------------------------------------------------
async function logViolation(type, message) {
  const now = Date.now();
  if (lastViolationAt[type] && now - lastViolationAt[type] < VIOLATION_COOLDOWN_MS) {
    return; // still cooling down — don't spam the same warning repeatedly
  }
  lastViolationAt[type] = now;

  strikeCount += 1;
  updateStrikeBadge();
  showWarningBanner(message);
  appendWarningLog(message);
  showToast(message, 'error');

  if (!sessionActive || sessionPaused) return;

  try {
    const result = await apiFetchPy(`/interviews/${interviewId}/violation`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
    if (result && (result.auto_submit || result.violations >= MAX_STRIKES)) {
      autoSubmitDueToViolations();
    }
  } catch (err) {
    console.error('Failed to log violation:', err);
  }
}

function updateStrikeBadge() {
  const el = document.getElementById('strikeBadge');
  el.textContent = `⚠ ${strikeCount}/${MAX_STRIKES} warnings`;
  el.classList.toggle('session-strikes-critical', strikeCount >= MAX_STRIKES - 1);
}

function showWarningBanner(message) {
  const banner = document.getElementById('warningBanner');
  banner.textContent = `⚠ ${message}`;
  banner.style.display = 'block';
  clearTimeout(showWarningBanner._t);
  showWarningBanner._t = setTimeout(() => {
    banner.style.display = 'none';
  }, 5000);
}

function appendWarningLog(message) {
  const list = document.getElementById('warningLog');
  const empty = list.querySelector('.session-warning-log-empty');
  if (empty) empty.remove();
  const li = document.createElement('li');
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  li.textContent = `${time} — ${message}`;
  list.prepend(li);
}

// ---------------------------------------------------------------
// Proctoring — tab focus / fullscreen / copy-paste
// ---------------------------------------------------------------
function attachProctoringListeners() {
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleWindowBlur);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('copy', handleCopyPasteBlock);
  document.addEventListener('paste', handleCopyPasteBlock);
  document.addEventListener('contextmenu', handleCopyPasteBlock);
  window.addEventListener('beforeunload', handleBeforeUnload);

  setChecklistState('chkTab', 'ok', 'Focused');
  setChecklistState('chkFullscreen', document.fullscreenElement ? 'ok' : 'warn', document.fullscreenElement ? 'Active' : 'Not active');
}

function handleVisibilityChange() {
  if (!sessionActive || sessionPaused) return;
  if (document.hidden) {
    setChecklistState('chkTab', 'bad', 'Switched away');
    logViolation('tab_switch', 'You switched away from the interview tab.');
  } else {
    setChecklistState('chkTab', 'ok', 'Focused');
  }
}

function handleWindowBlur() {
  if (!sessionActive || sessionPaused) return;
  setChecklistState('chkTab', 'bad', 'Lost focus');
  logViolation('tab_switch', 'The interview window lost focus.');
}

function handleFullscreenChange() {
  if (!sessionActive || sessionPaused) return;
  if (!document.fullscreenElement) {
    setChecklistState('chkFullscreen', 'bad', 'Exited');
    logViolation('fullscreen_exit', 'You exited fullscreen mode.');
  } else {
    setChecklistState('chkFullscreen', 'ok', 'Active');
  }
}

function handleCopyPasteBlock(e) {
  if (!sessionActive || sessionPaused) return;
  e.preventDefault();
  logViolation('copy_paste', 'Copy/paste/right-click is disabled during the assessment.');
}

function handleBeforeUnload(e) {
  if (!sessionFinished && (sessionActive || finishInProgress)) {
    e.preventDefault();
    e.returnValue = '';
  }
}

function setChecklistState(id, state, label) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('ok', 'warn', 'bad');
  el.classList.add(state);
  const span = el.querySelector('span');
  if (span) span.textContent = label;
}

function stopWebcamTracks() {
  stopMicLevelMeter();
  if (webcamStream) {
    webcamStream.getTracks().forEach((t) => t.stop());
    webcamStream = null;
  }
}

// ---------------------------------------------------------------
// Microphone level meter — small live bar showing the mic is
// actually picking up audio, driven by the same stream's audio track.
// ---------------------------------------------------------------
function startMicLevelMeter() {
  if (!webcamStream || webcamStream.getAudioTracks().length === 0) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  try {
    micAudioCtx = new AudioCtx();
    const source = micAudioCtx.createMediaStreamSource(webcamStream);
    micAnalyser = micAudioCtx.createAnalyser();
    micAnalyser.fftSize = 512;
    source.connect(micAnalyser);

    const data = new Uint8Array(micAnalyser.frequencyBinCount);
    const bar = document.getElementById('micLevelBar');

    micLevelTimer = setInterval(() => {
      if (!micAnalyser) return;
      micAnalyser.getByteFrequencyData(data);
      const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
      const pct = Math.min(100, Math.round((avg / 160) * 100));
      if (bar) bar.style.width = `${pct}%`;
    }, 150);
  } catch (err) {
    console.warn('Mic level meter unavailable:', err);
  }
}

function stopMicLevelMeter() {
  clearInterval(micLevelTimer);
  micLevelTimer = null;
  micAnalyser = null;
  if (micAudioCtx) {
    micAudioCtx.close().catch(() => {});
    micAudioCtx = null;
  }
}

// ---------------------------------------------------------------
// Recording — captures the session's webcam/mic stream to a single
// video file, uploaded once when the session ends. Pausing the
// session pauses the recorder too (MediaRecorder.pause()), so paused
// time isn't captured, matching the "no answers are being recorded"
// message already shown on the paused overlay.
// ---------------------------------------------------------------
function pickRecordingMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return RECORDING_MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

function startRecording() {
  if (typeof MediaRecorder === 'undefined') {
    console.warn('MediaRecorder is not supported in this browser — session will not be recorded.');
    return;
  }
  if (!webcamStream || webcamStream.getTracks().length === 0) return;

  recordingMimeType = pickRecordingMimeType();
  recordedChunks = [];

  try {
    mediaRecorder = recordingMimeType
      ? new MediaRecorder(webcamStream, { mimeType: recordingMimeType })
      : new MediaRecorder(webcamStream);
  } catch (err) {
    console.warn('Could not start session recording:', err);
    mediaRecorder = null;
    return;
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.onerror = (e) => {
    console.warn('Recording error:', e.error || e);
  };

  recordingMimeType = recordingMimeType || mediaRecorder.mimeType || 'video/webm';
  recordingStartedAt = new Date();
  recordingSegmentStartedAt = Date.now();
  recordingSecondsRecorded = 0;

  // 1s timeslices so ondataavailable fires incrementally rather than
  // only at stop() — keeps memory bounded for longer sessions and
  // means a crash/tab-close still leaves earlier chunks recoverable
  // in principle, even though today only the final upload uses them.
  mediaRecorder.start(1000);
  updateRecordingIndicator(true);
}

function pauseRecording() {
  if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
  try {
    mediaRecorder.pause();
  } catch (err) {
    console.warn('Could not pause recording:', err);
    return;
  }
  if (recordingSegmentStartedAt) {
    recordingSecondsRecorded += Math.round((Date.now() - recordingSegmentStartedAt) / 1000);
    recordingSegmentStartedAt = null;
  }
  updateRecordingIndicator(false);
}

function resumeRecording() {
  if (!mediaRecorder || mediaRecorder.state !== 'paused') return;
  try {
    mediaRecorder.resume();
  } catch (err) {
    console.warn('Could not resume recording:', err);
    return;
  }
  recordingSegmentStartedAt = Date.now();
  updateRecordingIndicator(true);
}

function updateRecordingIndicator(active) {
  const el = document.getElementById('recordingIndicator');
  if (!el) return;
  el.style.display = mediaRecorder ? 'inline-flex' : 'none';
  el.classList.toggle('session-recording-live', !!active);
  el.textContent = active ? '🔴 REC' : '⏸ REC paused';
}

// Stops the recorder (if any) and resolves with the finished Blob —
// or null if recording never started/isn't supported, so callers can
// treat "no recording" as a non-fatal, expected case.
function stopRecordingAndGetBlob() {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      resolve(null);
      return;
    }
    mediaRecorder.onstop = () => {
      if (recordingSegmentStartedAt) {
        recordingSecondsRecorded += Math.round((Date.now() - recordingSegmentStartedAt) / 1000);
        recordingSegmentStartedAt = null;
      }
      const blob = recordedChunks.length
        ? new Blob(recordedChunks, { type: recordingMimeType || 'video/webm' })
        : null;
      resolve(blob);
    };
    try {
      mediaRecorder.stop();
    } catch (err) {
      console.warn('Could not stop recording cleanly:', err);
      resolve(null);
    }
  });
}

// Uploads the recording blob. Failure here is logged and surfaced as
// a toast but never blocks scoring — the interview's answers/score
// are the part that matters most, and a recording upload issue
// shouldn't strand the candidate on the finish screen.
async function uploadRecording(blob) {
  if (!blob || blob.size === 0) return;
  const heading = document.getElementById('finishHeading');
  const previousHeading = heading ? heading.textContent : '';
  if (heading) heading.textContent = '💾 Saving your session recording…';

  try {
    const formData = new FormData();
    const ext = (recordingMimeType || 'video/webm').includes('mp4') ? 'mp4' : 'webm';
    formData.append('file', blob, `session.${ext}`);
    if (recordingStartedAt) formData.append('startedAt', recordingStartedAt.toISOString());
    formData.append('endedAt', new Date().toISOString());
    formData.append('durationSeconds', String(recordingSecondsRecorded));
    await apiUploadPy(`/interviews/${interviewId}/recording`, formData);
  } catch (err) {
    console.warn('Recording upload failed:', err);
    showToast('Your answers were saved, but the session recording could not be uploaded.', 'error');
  } finally {
    if (heading) heading.textContent = previousHeading;
  }
}

// ---------------------------------------------------------------
// Pause / resume — freezes both timers and suspends proctoring
// warnings until resumed. Webcam preview stays visible throughout.
// ---------------------------------------------------------------
async function togglePauseSession() {
  if (pauseInProgress || !sessionActive) return;
  if (sessionPaused) {
    await resumeSession();
  } else {
    await pauseSession();
  }
}

async function pauseSession() {
  pauseInProgress = true;
  const btn = document.getElementById('pauseBtn');
  if (btn) btn.disabled = true;

  try {
    await apiFetchPy(`/interviews/${interviewId}/pause`, { method: 'PATCH' });
  } catch (err) {
    console.error('Failed to pause interview:', err);
    showToast(err.message || 'Could not pause the interview — check your connection.', 'error');
    pauseInProgress = false;
    if (btn) btn.disabled = false;
    return;
  }

  sessionPaused = true;
  clearInterval(overallTimerInterval);
  clearInterval(faceCheckTimer);
  stopVoiceInputIfActive();
  pauseRecording();

  document.getElementById('nextBtn').disabled = true;
  document.getElementById('answerText').disabled = true;
  document.getElementById('micBtn').disabled = true;
  document.getElementById('pausedOverlay').style.display = 'flex';
  updateSessionStatusBadge();

  pauseInProgress = false;
  if (btn) {
    btn.disabled = false;
    btn.textContent = '▶ Resume';
  }
}

async function resumeSession() {
  pauseInProgress = true;
  const btn = document.getElementById('pauseBtn');
  if (btn) btn.disabled = true;

  try {
    await apiFetchPy(`/interviews/${interviewId}/resume`, { method: 'PATCH' });
  } catch (err) {
    console.error('Failed to resume interview:', err);
    showToast(err.message || 'Could not resume the interview — check your connection.', 'error');
    pauseInProgress = false;
    if (btn) btn.disabled = false;
    return;
  }

  sessionPaused = false;
  document.getElementById('pausedOverlay').style.display = 'none';
  document.getElementById('nextBtn').disabled = false;
  document.getElementById('answerText').disabled = false;
  document.getElementById('micBtn').disabled = false;
  updateSessionStatusBadge();

  // Resume the overall session countdown from wherever it was frozen,
  // and restart proctoring rather than re-rendering the question (which
  // would reset the candidate's in-progress answer text).
  startOverallTimer();
  setupFaceDetection();
  resumeRecording();

  pauseInProgress = false;
  if (btn) {
    btn.disabled = false;
    btn.textContent = '⏸ Pause';
  }
}

function updateSessionStatusBadge() {
  const el = document.getElementById('sessionStatusBadge');
  if (!el) return;
  const label = sessionPaused ? 'Paused' : sessionActive ? 'In Progress' : 'Scheduled';
  el.textContent = label;
  el.classList.toggle('session-status-paused', sessionPaused);
}

function removeProctoringListeners() {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('blur', handleWindowBlur);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('copy', handleCopyPasteBlock);
  document.removeEventListener('paste', handleCopyPasteBlock);
  document.removeEventListener('contextmenu', handleCopyPasteBlock);
  window.removeEventListener('beforeunload', handleBeforeUnload);
}

// ---------------------------------------------------------------
// Proctoring — webcam face detection (no face / multiple faces /
// looking away). Degrades gracefully if face-api.js can't load
// (offline, CDN blocked) — tab/fullscreen checks still run.
// ---------------------------------------------------------------
async function setupFaceDetection() {
  const label = document.getElementById('faceStatusLabel');
  const dot = document.getElementById('faceStatusDot');

  if (typeof faceapi === 'undefined') {
    label.textContent = 'Face detection unavailable (script failed to load) — tab & fullscreen checks still active.';
    setChecklistState('chkFace', 'warn', 'Unavailable');
    return;
  }

  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL);
  } catch (err) {
    console.warn('Face detection models failed to load:', err);
    label.textContent = 'Face detection unavailable (models failed to load) — tab & fullscreen checks still active.';
    setChecklistState('chkFace', 'warn', 'Unavailable');
    return;
  }

  faceApiReady = true;
  setChecklistState('chkFace', 'ok', 'Active');
  label.textContent = 'Watching for face presence…';
  dot.className = 'session-face-dot session-face-dot-ok';

  const video = document.getElementById('webcamVideo');
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

  faceCheckTimer = setInterval(async () => {
    if (!sessionActive || sessionPaused || !faceApiReady) return;
    try {
      const detections = await faceapi.detectAllFaces(video, options);
      handleFaceDetections(detections, video);
    } catch (err) {
      // A transient detection error shouldn't crash the loop.
      console.warn('Face detection frame error:', err);
    }
  }, FACE_CHECK_INTERVAL_MS);
}

function handleFaceDetections(detections, video) {
  const dot = document.getElementById('faceStatusDot');
  const label = document.getElementById('faceStatusLabel');

  if (detections.length === 0) {
    noFaceStreak += 1;
    if (noFaceStreak >= NO_FACE_STRIKES_BEFORE_WARN) {
      dot.className = 'session-face-dot session-face-dot-bad';
      label.textContent = 'No face detected — make sure you are visible on camera.';
      logViolation('no_face', 'No face detected on camera.');
    } else {
      dot.className = 'session-face-dot session-face-dot-warn';
      label.textContent = 'Checking for your face…';
    }
    return;
  }

  noFaceStreak = 0;

  if (detections.length > 1) {
    dot.className = 'session-face-dot session-face-dot-bad';
    label.textContent = `${detections.length} faces detected — only the candidate should be visible.`;
    logViolation('multi_face', `${detections.length} faces detected in frame.`);
    return;
  }

  // Single face — rough "looking away" heuristic: is the face's
  // bounding-box center significantly off from the frame center?
  const box = detections[0].box;
  const faceCenterX = box.x + box.width / 2;
  const frameCenterX = video.videoWidth / 2 || 240;
  const offsetRatio = Math.abs(faceCenterX - frameCenterX) / (video.videoWidth || 480);

  if (offsetRatio > 0.28) {
    dot.className = 'session-face-dot session-face-dot-warn';
    label.textContent = 'Please look at the screen.';
    logViolation('look_away', 'You appear to be looking away from the screen.');
  } else {
    dot.className = 'session-face-dot session-face-dot-ok';
    label.textContent = 'Face detected — you are good.';
  }
}
