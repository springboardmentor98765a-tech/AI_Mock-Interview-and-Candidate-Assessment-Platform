// ============================================================
// Live Proctored Interview Session
// Talks to the Python Module 3 service (apiFetchPy, from script.js)
// for questions / answers / violations / finishing the session.
// ============================================================

const DIFFICULTY_SECONDS = { easy: 90, medium: 120, hard: 150 };
const MAX_STRIKES = 5;
const VIOLATION_COOLDOWN_MS = 8000; // don't spam the same violation type more than once per 8s
const FACE_CHECK_INTERVAL_MS = 1500;
const NO_FACE_STRIKES_BEFORE_WARN = 3; // ~4.5s of no face before it counts as a violation
const FACE_MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

// --- Behavior analytics thresholds (emotion / gaze / attention / engagement) ---
const LOOK_AWAY_X_RATIO = 0.28;   // horizontal face-offset ratio considered "looking away"
const LOOK_DOWN_Y_RATIO = 0.22;   // vertical face-offset ratio considered "looking down"
const EAR_CLOSED_THRESHOLD = 0.21; // eye-aspect-ratio below this ~= eyes closed

let interviewId = null;
let interview = null;
let questions = [];
let currentIndex = 0;
let localAnswers = {}; // questionId -> { text, inputMode }

let webcamStream = null;
let faceApiReady = false;
let faceCheckTimer = null;
let noFaceStreak = 0;

// --- Session recording (webcam + mic -> uploaded once the interview ends) ---
// Auto-starts silently alongside the camera; if MediaRecorder isn't
// supported or fails to init, the interview proceeds without a
// recording rather than blocking the candidate.
let mediaRecorder = null;
let recordedChunks = [];

// --- Module 5: voice recognition confidence per question, used as a
// pronunciation/clarity proxy (see backend/communication_analysis.py) ---
let voiceConfidenceByQuestion = {};

// --- Behavior analytics state (emotion / gaze / attention / engagement / confidence) ---
// analyticsReady stays false (and the panel shows "unavailable") if the
// landmark/expression models fail to load — core proctoring above still
// works either way, this is purely additive.
let analyticsReady = false;
let currentEmotionLabel = '—';
let emotionSampleCount = 0;
let emotionScoreTotals = { nervous: 0, scared: 0, confused: 0, calm: 0 };
let previousExpressionLabel = null;
let expressionChangeCount = 0;

let eyeContactSeconds = 0;
let trackedSeconds = 0;

let currentAttentionLevel = '—';
let attentionSampleTotals = { high: 0, medium: 0, low: 0 };

let engagementScoreTotal = 0;
let engagementSampleCount = 0;
let headPositionHistory = [];

let questionTimerInterval = null;
let questionSecondsLeft = 0;
let questionStartedAt = 0;

let overallTimerInterval = null;
let overallSecondsElapsed = 0;

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
  btn.textContent = 'Requesting camera…';

  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 480, height: 360 },
      audio: true,
    });
  } catch (err) {
    errBox.textContent =
      'Camera access is required for this proctored assessment. Please allow camera permission and try again.';
    errBox.style.display = 'block';
    btn.disabled = false;
    btn.textContent = '▶ Enable Camera & Start';
    return;
  }

  const video = document.getElementById('webcamVideo');
  video.srcObject = webcamStream;

  startInterviewRecording(webcamStream);

  // Fullscreen is best-effort — some browsers/embedded contexts block it,
  // so a failure here doesn't stop the interview, it just skips that check.
  try {
    await (document.documentElement.requestFullscreen && document.documentElement.requestFullscreen());
  } catch (err) {
    console.warn('Fullscreen request failed/denied:', err);
  }

  document.getElementById('preStartOverlay').style.display = 'none';
  document.getElementById('sessionShell').style.display = 'flex';
  sessionActive = true;

  attachProctoringListeners();
  setupFaceDetection(); // async, non-blocking
  startOverallTimer();
  renderQuestion(0);
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

  questionStartedAt = Date.now();
  startQuestionTimer(DIFFICULTY_SECONDS[q.difficulty] || 120);
}

function startQuestionTimer(seconds) {
  clearInterval(questionTimerInterval);
  questionSecondsLeft = seconds;
  updateQuestionTimerDisplay();
  questionTimerInterval = setInterval(() => {
    questionSecondsLeft -= 1;
    updateQuestionTimerDisplay();
    if (questionSecondsLeft <= 0) {
      clearInterval(questionTimerInterval);
      showToast("Time's up for this question — moving on.", 'info');
      advanceFromTimeout();
    }
  }, 1000);
}

function updateQuestionTimerDisplay() {
  const el = document.getElementById('questionTimer');
  const m = Math.floor(Math.max(0, questionSecondsLeft) / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.max(0, questionSecondsLeft % 60)
    .toString()
    .padStart(2, '0');
  el.textContent = `⏱ ${m}:${s}`;
  el.classList.toggle('session-timer-low', questionSecondsLeft <= 10);
}

function startOverallTimer() {
  overallTimerInterval = setInterval(() => {
    overallSecondsElapsed += 1;
    const m = Math.floor(overallSecondsElapsed / 60).toString().padStart(2, '0');
    const s = (overallSecondsElapsed % 60).toString().padStart(2, '0');
    document.getElementById('overallTimer').textContent = `Total ${m}:${s}`;
  }, 1000);
}

async function saveCurrentAnswer() {
  const q = questions[currentIndex];
  const text = document.getElementById('answerText').value.trim();
  const inputMode = localAnswers[q.id]?.inputMode === 'voice' && !text ? 'typed' : localAnswers[q.id]?.usedVoice ? 'voice' : 'typed';
  const timeTaken = Math.max(0, Math.round((Date.now() - questionStartedAt) / 1000));

  const confidenceSamples = voiceConfidenceByQuestion[q.id];
  const voiceConfidence =
    inputMode === 'voice' && confidenceSamples && confidenceSamples.length
      ? confidenceSamples.reduce((a, b) => a + b, 0) / confidenceSamples.length
      : null;

  localAnswers[q.id] = { text, inputMode, usedVoice: localAnswers[q.id]?.usedVoice };

  try {
    await apiFetchPy(`/interviews/${interviewId}/answers`, {
      method: 'POST',
      body: JSON.stringify({
        questionId: q.id,
        answerText: text,
        inputMode,
        timeTakenSeconds: timeTaken,
        voiceConfidence,
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

async function advanceFromTimeout() {
  await saveCurrentAnswer();
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

  clearInterval(questionTimerInterval);
  clearInterval(overallTimerInterval);
  clearInterval(faceCheckTimer);
  stopVoiceInputIfActive();

  // Recorder must be stopped (and its final chunk flushed) BEFORE the
  // tracks it's reading from are stopped, or the last second or so of
  // the recording can be lost.
  const recordingBlob = await stopInterviewRecording();
  stopWebcamTracks(); // turn the camera off right away — proctoring listeners (incl. the
                       // leave-page guard) stay armed until the /finish call below settles
  uploadInterviewRecording(recordingBlob); // fire-and-forget — never blocks scoring/finish

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  document.getElementById('sessionShell').style.display = 'none';
  const overlay = document.getElementById('finishOverlay');
  overlay.style.display = 'flex';
  document.getElementById('finishHeading').textContent = '⏳ Scoring your interview…';
  document.getElementById('finishSubtext').textContent = 'The AI is reviewing your answers. This takes a few seconds.';
  document.getElementById('finishScoreBox').style.display = 'none';
  renderFinalBehaviorReport();
  renderCommunicationReport(); // fire-and-forget — Module 5, independent of scoring

  try {
    const finishBody = {};
    const behaviorMetrics = buildBehaviorMetricsPayload();
    if (behaviorMetrics) finishBody.behaviorMetrics = behaviorMetrics;

    const result = await apiFetchPy(`/interviews/${interviewId}/finish`, {
      method: 'PATCH',
      body: JSON.stringify(finishBody),
    });
    document.getElementById('finishHeading').textContent = '✅ Interview complete';
    document.getElementById('finishSubtext').textContent = `"${result.interview_type}" — report ready.`;
    document.getElementById('finishScoreBox').style.display = 'block';
    document.getElementById('finishScoreCircle').textContent = `${result.score}%`;
    document.getElementById('finishRatingLabel').textContent = result.rating_label || '';
    document.getElementById('finishFeedbackText').textContent = result.ai_feedback || '';
    renderScoreBreakdown(result);
    renderFeedbackBreakdown(result);
  } catch (err) {
    document.getElementById('finishHeading').textContent = '⚠️ Could not score interview';
    document.getElementById('finishSubtext').textContent =
      err.message || 'Something went wrong while scoring. Your answers were saved — try again from the dashboard.';
  } finally {
    // Only now is it safe to let the candidate navigate away freely.
    sessionFinished = true;
    finishInProgress = false;
    removeProctoringListeners();
  }
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
    const q = questions[currentIndex];
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
        // Web Speech API's own confidence for what it just recognized —
        // used as an honest proxy for speech clarity (Module 5), not a
        // linguistic pronunciation score. Some browsers always report 1;
        // this is still the best signal actually available client-side.
        const confidence = event.results[i][0].confidence;
        if (typeof confidence === 'number' && confidence > 0) {
          if (!voiceConfidenceByQuestion[q.id]) voiceConfidenceByQuestion[q.id] = [];
          voiceConfidenceByQuestion[q.id].push(confidence);
        }
      } else {
        interimTranscript += transcript;
      }
    }
    if (finalTranscript) baseTextBeforeVoice += `${finalTranscript} `;
    textarea.value = baseTextBeforeVoice + interimTranscript;
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

  if (!sessionActive) return;

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
  if (!sessionActive) return;
  if (document.hidden) {
    setChecklistState('chkTab', 'bad', 'Switched away');
    logViolation('tab_switch', 'You switched away from the interview tab.');
  } else {
    setChecklistState('chkTab', 'ok', 'Focused');
  }
}

function handleWindowBlur() {
  if (!sessionActive) return;
  setChecklistState('chkTab', 'bad', 'Lost focus');
  logViolation('tab_switch', 'The interview window lost focus.');
}

function handleFullscreenChange() {
  if (!sessionActive) return;
  if (!document.fullscreenElement) {
    setChecklistState('chkFullscreen', 'bad', 'Exited');
    logViolation('fullscreen_exit', 'You exited fullscreen mode.');
  } else {
    setChecklistState('chkFullscreen', 'ok', 'Active');
  }
}

function handleCopyPasteBlock(e) {
  if (!sessionActive) return;
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
  if (webcamStream) {
    webcamStream.getTracks().forEach((t) => t.stop());
    webcamStream = null;
  }
}

// ---------------------------------------------------------------
// Session recording — webcam + mic, auto-started silently alongside
// the camera. Uploaded once via POST /interviews/:id/recording when
// the interview finishes; viewable afterward by the candidate and by
// staff (coach/recruiter/admin) through watchRecording() in script.js.
// Best-effort: any failure here (unsupported browser, upload error)
// is swallowed so it never blocks the interview itself.
// ---------------------------------------------------------------
function startInterviewRecording(stream) {
  if (typeof MediaRecorder === 'undefined') {
    console.warn('MediaRecorder is not supported in this browser — proceeding without a recording.');
    return;
  }

  recordedChunks = [];
  const candidateTypes = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm'];
  const mimeType = candidateTypes.find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));

  try {
    mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  } catch (err) {
    console.warn('Could not start session recording — proceeding without one:', err);
    mediaRecorder = null;
    return;
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.onerror = (e) => console.warn('Recording error:', e.error || e);

  // Collect a chunk every second rather than only at the end — if the
  // tab crashes mid-interview we still have everything up to that point
  // instead of losing the whole recording.
  mediaRecorder.start(1000);
}

// Stops the recorder and resolves with the finished Blob (or null if
// there's nothing to stop / nothing was captured). Tracks must stay
// live until this resolves, or the last chunk can be lost — callers
// should stop webcam tracks AFTER awaiting this, not before.
function stopInterviewRecording() {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      resolve(null);
      return;
    }
    mediaRecorder.onstop = () => {
      const blob = recordedChunks.length ? new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'video/webm' }) : null;
      mediaRecorder = null;
      recordedChunks = [];
      resolve(blob && blob.size > 0 ? blob : null);
    };
    try {
      mediaRecorder.stop();
    } catch (err) {
      console.warn('Error stopping recorder:', err);
      resolve(null);
    }
  });
}

async function uploadInterviewRecording(blob) {
  if (!blob) return;
  try {
    const formData = new FormData();
    formData.append('file', blob, 'interview.webm');
    const token = getToken();
    const res = await fetch(`${PY_API_BASE_URL}/interviews/${interviewId}/recording`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      console.warn('Recording upload failed with status', res.status);
    }
  } catch (err) {
    // Never block the finish flow on an upload failure — the interview
    // score/answers already saved are what matters most.
    console.warn('Recording upload error:', err);
  }
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
    showBehaviorUnavailable();
    return;
  }

  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL);
  } catch (err) {
    console.warn('Face detection models failed to load:', err);
    label.textContent = 'Face detection unavailable (models failed to load) — tab & fullscreen checks still active.';
    setChecklistState('chkFace', 'warn', 'Unavailable');
    showBehaviorUnavailable();
    return;
  }

  faceApiReady = true;
  setChecklistState('chkFace', 'ok', 'Active');
  label.textContent = 'Watching for face presence…';
  dot.className = 'session-face-dot session-face-dot-ok';

  // Emotion / eye-contact / attention / engagement analytics ride on two
  // extra, smaller models (68-point landmarks + expression classifier).
  // They're strictly additive on top of the tinyFaceDetector above — if a
  // slow connection or blocked CDN keeps them from loading, core
  // proctoring (face presence / multi-face / look-away) keeps working
  // exactly as before, just without the behavior-monitoring panel.
  try {
    await Promise.all([
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(FACE_MODEL_URL),
    ]);
    analyticsReady = true;
  } catch (err) {
    console.warn('Behavior analytics models failed to load:', err);
    analyticsReady = false;
    showBehaviorUnavailable();
  }

  const video = document.getElementById('webcamVideo');
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

  faceCheckTimer = setInterval(async () => {
    if (!sessionActive || !faceApiReady) return;
    try {
      if (analyticsReady) {
        const detections = await faceapi
          .detectAllFaces(video, options)
          .withFaceLandmarks(true)
          .withFaceExpressions();
        handleFaceDetections(detections, video, true);
      } else {
        const detections = await faceapi.detectAllFaces(video, options);
        handleFaceDetections(detections, video, false);
      }
    } catch (err) {
      // A transient detection error shouldn't crash the loop.
      console.warn('Face detection frame error:', err);
    }
  }, FACE_CHECK_INTERVAL_MS);
}

function showBehaviorUnavailable() {
  const note = document.getElementById('behaviorUnavailableNote');
  if (note) note.style.display = 'block';
}

function handleFaceDetections(detections, video, withAnalytics) {
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
    recordAttentionSample('low');
    return;
  }

  noFaceStreak = 0;

  if (detections.length > 1) {
    dot.className = 'session-face-dot session-face-dot-bad';
    label.textContent = `${detections.length} faces detected — only the candidate should be visible.`;
    logViolation('multi_face', `${detections.length} faces detected in frame.`);
    recordAttentionSample('low');
    return;
  }

  const single = detections[0];
  const box = withAnalytics ? single.detection.box : single.box;

  // Single face — rough "looking away" heuristic: is the face's
  // bounding-box center significantly off from the frame center?
  const frameWidth = video.videoWidth || 480;
  const frameHeight = video.videoHeight || 360;
  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;
  const offsetRatioX = Math.abs(faceCenterX - frameWidth / 2) / frameWidth;
  const offsetRatioY = (faceCenterY - frameHeight / 2) / frameHeight; // signed: positive = lower in frame
  const lookingAway = offsetRatioX > LOOK_AWAY_X_RATIO;

  if (lookingAway) {
    dot.className = 'session-face-dot session-face-dot-warn';
    label.textContent = 'Please look at the screen.';
    logViolation('look_away', 'You appear to be looking away from the screen.');
  } else {
    dot.className = 'session-face-dot session-face-dot-ok';
    label.textContent = 'Face detected — you are good.';
  }

  if (withAnalytics) {
    updateBehaviorAnalytics(single, offsetRatioX, offsetRatioY, lookingAway);
  } else {
    // No landmarks/expressions available this tick — still feed a coarse
    // attention signal from head position so the panel isn't left blank.
    recordAttentionSample(lookingAway ? 'medium' : 'high');
  }
}

// =================================================================
// Behavior analytics — Parts 1-9 of the CNN brief, adapted to run
// fully client-side with face-api.js (browser CNNs under the hood)
// instead of a custom offline-trained model:
//
//   Part 1-3 (emotion):     face-api.js ships a general 7-class expression
//                           model (neutral/happy/sad/angry/fearful/
//                           disgusted/surprised) rather than a bespoke
//                           3-class Nervous/Scared/Confused CNN. Those 7
//                           classes are combined below into weighted
//                           Nervous / Scared / Confused / Calm-Confident
//                           scores so the *reported categories* match the
//                           brief without requiring an offline training
//                           pipeline. This is an approximation, not a
//                           literal 3-class CNN.
//   Part 4-5 (eye/gaze):    68-point face landmarks give eye corner
//                           positions (eye-aspect-ratio -> eyes open/
//                           closed) and, combined with the face
//                           bounding-box offset, an approximate gaze/
//                           head-direction state and eye-contact %.
//   Part 6 (attention):     combines gaze state + face presence into
//                           High / Medium / Low.
//   Part 7 (engagement):    weighted blend of eye contact, attention,
//                           emotion, and facial-expression variability.
//   Part 8 (confidence):    weighted blend of eye contact, head-position
//                           stability, and calm-vs-fearful emotion.
//   Part 9 (final report):  renderFinalBehaviorReport(), called from
//                           finishInterview() below.
// =================================================================

function updateBehaviorAnalytics(faceResult, offsetRatioX, offsetRatioY, lookingAway) {
  trackedSeconds += FACE_CHECK_INTERVAL_MS / 1000;

  // --- Emotion (Parts 1-3) ---
  const expressions = faceResult.expressions || {};
  const nervous = (expressions.fearful || 0) * 0.6 + (expressions.sad || 0) * 0.4;
  const scared = (expressions.fearful || 0) * 0.7 + (expressions.surprised || 0) * 0.3;
  const confused =
    (expressions.surprised || 0) * 0.5 + (expressions.disgusted || 0) * 0.2 + (1 - (expressions.neutral || 0)) * 0.1;
  const calm = (expressions.neutral || 0) * 0.7 + (expressions.happy || 0) * 0.3;

  emotionScoreTotals.nervous += nervous;
  emotionScoreTotals.scared += scared;
  emotionScoreTotals.confused += confused;
  emotionScoreTotals.calm += calm;
  emotionSampleCount += 1;

  const scores = { Nervous: nervous, Scared: scared, Confused: confused, 'Calm / Confident': calm };
  const topLabel = Object.keys(scores).reduce((a, b) => (scores[a] >= scores[b] ? a : b));
  currentEmotionLabel = topLabel;

  if (previousExpressionLabel && previousExpressionLabel !== topLabel) {
    expressionChangeCount += 1;
  }
  previousExpressionLabel = topLabel;

  // --- Eye state / gaze (Part 4) ---
  let eyesClosed = false;
  if (faceResult.landmarks) {
    const ear = computeEyeAspectRatio(faceResult.landmarks);
    eyesClosed = ear !== null && ear < EAR_CLOSED_THRESHOLD;
  }

  let gazeState = 'Looking at camera';
  if (eyesClosed) gazeState = 'Eyes closed';
  else if (offsetRatioY > LOOK_DOWN_Y_RATIO) gazeState = 'Looking down';
  else if (lookingAway) gazeState = 'Looking left/right';

  const onCamera = gazeState === 'Looking at camera';

  // --- Eye contact % (Part 5) ---
  if (onCamera) eyeContactSeconds += FACE_CHECK_INTERVAL_MS / 1000;
  const eyeContactPct = trackedSeconds > 0 ? Math.round((eyeContactSeconds / trackedSeconds) * 100) : 0;

  // --- Attention (Part 6) ---
  let attentionLevel = 'High';
  if (!onCamera && !eyesClosed) attentionLevel = 'Medium';
  if (eyesClosed || (!onCamera && gazeState === 'Looking down')) attentionLevel = 'Low';
  recordAttentionSample(attentionLevel.toLowerCase());

  // --- Head-position history, used for confidence stability (Part 8) ---
  headPositionHistory.push(offsetRatioX);
  if (headPositionHistory.length > 20) headPositionHistory.shift();

  // --- Engagement (Part 7): eye contact + attention + emotion + facial activity ---
  const attentionScoreMap = { high: 1, medium: 0.55, low: 0.15 };
  const facialActivityScore = Math.min(1, (expressionChangeCount / Math.max(1, emotionSampleCount)) * 4);
  const engagementScore =
    0.35 * (eyeContactPct / 100) +
    0.3 * attentionScoreMap[attentionLevel.toLowerCase()] +
    0.25 * calm +
    0.1 * facialActivityScore;
  engagementScoreTotal += engagementScore;
  engagementSampleCount += 1;
  const engagementPct = Math.round((engagementScoreTotal / engagementSampleCount) * 100);

  renderBehaviorPanel({ emotionLabel: currentEmotionLabel, eyeContactPct, attentionLevel, engagementPct });
}

// Standard eye-aspect-ratio (EAR) from 6 eye landmark points per eye —
// low EAR means the eye is closed/near-closed.
function computeEyeAspectRatio(landmarks) {
  try {
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const earFor = (pts) => {
      const vertical = dist(pts[1], pts[5]) + dist(pts[2], pts[4]);
      const horizontal = dist(pts[0], pts[3]);
      return horizontal === 0 ? null : vertical / (2 * horizontal);
    };
    const left = earFor(landmarks.getLeftEye());
    const right = earFor(landmarks.getRightEye());
    if (left === null || right === null) return null;
    return (left + right) / 2;
  } catch (err) {
    return null;
  }
}

function recordAttentionSample(level) {
  if (attentionSampleTotals[level] === undefined) return;
  attentionSampleTotals[level] += 1;
  const dominant = Object.keys(attentionSampleTotals).reduce((a, b) =>
    attentionSampleTotals[a] >= attentionSampleTotals[b] ? a : b
  );
  currentAttentionLevel = dominant.charAt(0).toUpperCase() + dominant.slice(1);
}

function renderBehaviorPanel({ emotionLabel, eyeContactPct, attentionLevel, engagementPct }) {
  const emotionEl = document.getElementById('emotionValue');
  const eyeEl = document.getElementById('eyeContactValue');
  const attentionEl = document.getElementById('attentionValue');
  const engagementEl = document.getElementById('engagementValue');
  const confidenceEl = document.getElementById('confidenceValue');

  if (emotionEl) emotionEl.textContent = emotionLabel;
  if (eyeEl) eyeEl.textContent = `${eyeContactPct}%`;
  if (attentionEl) attentionEl.textContent = attentionLevel;
  if (engagementEl) engagementEl.textContent = `${engagementPct}%`;
  if (confidenceEl) confidenceEl.textContent = computeConfidenceLabel();
}

// Confidence (Part 8): blends eye-contact ratio, head-position stability,
// and calm-vs-fearful emotion balance into a single Low/Moderate/High label.
function computeConfidenceLabel() {
  if (emotionSampleCount === 0) return '—';

  const avgCalm = emotionScoreTotals.calm / emotionSampleCount;
  const avgNervousScared = (emotionScoreTotals.nervous + emotionScoreTotals.scared) / (2 * emotionSampleCount);
  const eyeContactRatio = trackedSeconds > 0 ? eyeContactSeconds / trackedSeconds : 0;

  let headStability = 1;
  if (headPositionHistory.length > 1) {
    const mean = headPositionHistory.reduce((a, b) => a + b, 0) / headPositionHistory.length;
    const variance = headPositionHistory.reduce((a, b) => a + (b - mean) ** 2, 0) / headPositionHistory.length;
    headStability = Math.max(0, 1 - variance * 20);
  }

  const confidenceScore =
    0.4 * eyeContactRatio + 0.3 * headStability + 0.3 * ((avgCalm - avgNervousScared + 1) / 2);

  if (confidenceScore > 0.66) return 'High';
  if (confidenceScore > 0.4) return 'Moderate';
  return 'Low';
}

// ---------------------------------------------------------------
// Module 7 — AI Feedback & Scoring. The finish response (InterviewOut)
// already carries the 4 weighted category scores, rating label, and
// structured feedback computed server-side (see app/scoring_engine.py);
// this just renders them.
// ---------------------------------------------------------------
function renderScoreBreakdown(result) {
  const box = document.getElementById('scoreBreakdownBox');
  const list = document.getElementById('scoreBreakdownList');
  if (!box || !list) return;

  const rows = [
    ['Communication (30%)', result.skill_communication],
    ['Confidence (25%)', result.skill_confidence],
    ['Technical Relevance (30%)', result.skill_technical],
    ['Professionalism (15%)', result.skill_professionalism],
  ].filter(([, value]) => value !== null && value !== undefined);

  if (!rows.length) {
    box.style.display = 'none';
    return;
  }

  list.innerHTML = '';
  rows.forEach(([label, value]) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = `${value}%`;
    li.appendChild(span);
    li.appendChild(strong);
    list.appendChild(li);
  });
  box.style.display = 'block';
}

function renderFeedbackBreakdown(result) {
  const box = document.getElementById('feedbackBreakdownBox');
  if (!box) return;

  let feedback = null;
  try {
    feedback = result.feedback_json ? JSON.parse(result.feedback_json) : null;
  } catch (e) {
    feedback = null;
  }
  if (!feedback) {
    box.style.display = 'none';
    return;
  }

  const sections = [
    ['strengths', '✅ Strengths'],
    ['weaknesses', '⚠️ Weaknesses'],
    ['improvements', '💡 Improvement Suggestions'],
    ['practice_recommendations', '🎯 Practice Recommendations'],
    ['learning_resources', '📚 Learning Resources'],
  ];

  let html = '';
  sections.forEach(([key, title]) => {
    const items = feedback[key];
    if (!Array.isArray(items) || !items.length) return;
    html += `<h4>${title}</h4><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  });

  if (!html) {
    box.style.display = 'none';
    return;
  }
  box.innerHTML = html;
  box.style.display = 'block';
}

// Module 7 wiring: packages the same aggregates renderFinalBehaviorReport()
// already computes into the shape PATCH /finish expects, so the backend's
// Confidence Score can use real webcam-analytics data instead of guessing.
// Returns null when no webcam analytics ran this session (e.g. camera
// unavailable) — the backend gracefully falls back to AI-only scoring.
function buildBehaviorMetricsPayload() {
  if (emotionSampleCount === 0) return null;

  const eyeContactPct = trackedSeconds > 0 ? Math.round((eyeContactSeconds / trackedSeconds) * 100) : null;
  const engagementPct = engagementSampleCount > 0 ? Math.round((engagementScoreTotal / engagementSampleCount) * 100) : null;
  const dominantEmotionKey = Object.keys(emotionScoreTotals).reduce((a, b) =>
    emotionScoreTotals[a] >= emotionScoreTotals[b] ? a : b
  );
  const emotionLabelMap = { nervous: 'Nervous', scared: 'Scared', confused: 'Confused', calm: 'Calm / Confident' };

  return {
    eyeContactPct,
    engagementPct,
    attentionLevel: currentAttentionLevel !== '—' ? currentAttentionLevel : null,
    confidenceLabel: computeConfidenceLabel() !== '—' ? computeConfidenceLabel() : null,
    dominantEmotion: emotionLabelMap[dominantEmotionKey] || null,
  };
}

// Part 9: final combined report, called once from finishInterview().
function renderFinalBehaviorReport() {
  const box = document.getElementById('behaviorReportBox');
  const list = document.getElementById('behaviorReportList');
  if (!box || !list) return;

  if (emotionSampleCount === 0) {
    box.style.display = 'none';
    return;
  }

  const eyeContactPct = trackedSeconds > 0 ? Math.round((eyeContactSeconds / trackedSeconds) * 100) : 0;
  const engagementPct =
    engagementSampleCount > 0 ? Math.round((engagementScoreTotal / engagementSampleCount) * 100) : 0;

  const emotionLabelMap = { nervous: 'Nervous', scared: 'Scared', confused: 'Confused', calm: 'Calm / Confident' };
  const dominantEmotionKey = Object.keys(emotionScoreTotals).reduce((a, b) =>
    emotionScoreTotals[a] >= emotionScoreTotals[b] ? a : b
  );

  const rows = [
    ['Dominant emotion', emotionLabelMap[dominantEmotionKey] || '—'],
    ['Eye contact', `${eyeContactPct}%`],
    ['Attention', currentAttentionLevel],
    ['Engagement', `${engagementPct}%`],
    ['Confidence-related indicators', computeConfidenceLabel()],
  ];

  list.innerHTML = '';
  rows.forEach(([lbl, value]) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = lbl;
    const strong = document.createElement('strong');
    strong.textContent = value;
    li.appendChild(span);
    li.appendChild(strong);
    list.appendChild(li);
  });
  box.style.display = 'block';
}

// =================================================================
// Module 5 — Speech-to-Text & Communication Analysis. Metrics are
// computed server-side per-answer (see backend-python/app/
// communication_analysis.py) as each answer is saved; this pulls them
// all back via GET /answers and aggregates into one summary. Labeling
// mirrors that module's honesty notes: "pace" is only a real speech
// metric for voice answers, and "pronunciation" is Web Speech API
// recognition confidence, not phonetic analysis.
// =================================================================
async function renderCommunicationReport() {
  const box = document.getElementById('commReportBox');
  const list = document.getElementById('commReportList');
  if (!box || !list) return;

  let answers;
  try {
    answers = await apiFetchPy(`/interviews/${interviewId}/answers`);
  } catch (err) {
    console.warn('Could not load answers for communication report:', err);
    return;
  }

  const answered = answers.filter((a) => (a.answer_text || '').trim());
  if (!answered.length) {
    box.style.display = 'none';
    return;
  }

  const totalFillers = answered.reduce((sum, a) => sum + (a.filler_word_count || 0), 0);
  const fillerSet = new Set();
  answered.forEach((a) => {
    try {
      (JSON.parse(a.filler_words_found || '[]')).forEach((w) => fillerSet.add(w));
    } catch (e) {
      /* ignore malformed JSON, just skip */
    }
  });

  const totalGrammarIssues = answered.reduce((sum, a) => sum + (a.grammar_issue_count || 0), 0);

  const voiceAnswers = answered.filter((a) => a.input_mode === 'voice');
  const wpmValues = answered.filter((a) => a.speech_wpm != null).map((a) => a.speech_wpm);
  const avgWpm = wpmValues.length ? Math.round(wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length) : null;

  const pronunciationValues = voiceAnswers.filter((a) => a.pronunciation_score != null).map((a) => a.pronunciation_score);
  const avgPronunciation = pronunciationValues.length
    ? Math.round(pronunciationValues.reduce((a, b) => a + b, 0) / pronunciationValues.length)
    : null;

  const usedVoiceAtAll = voiceAnswers.length > 0;
  const paceLabel = avgWpm == null ? '—' : commPaceLabel(avgWpm, usedVoiceAtAll);
  const pronunciationLabel = avgPronunciation == null ? 'N/A (no voice answers)' : commPronunciationLabel(avgPronunciation);

  const rows = [
    ['Filler words used', `${totalFillers}${fillerSet.size ? ` (${[...fillerSet].join(', ')})` : ''}`],
    ['Grammar issues flagged', `${totalGrammarIssues} across ${answered.length} answer${answered.length === 1 ? '' : 's'}`],
    [usedVoiceAtAll ? 'Speaking pace (avg)' : 'Response pace (avg)', paceLabel],
    ['Pronunciation clarity (avg)', pronunciationLabel],
  ];

  list.innerHTML = '';
  rows.forEach(([lbl, value]) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = lbl;
    const strong = document.createElement('strong');
    strong.textContent = value;
    li.appendChild(span);
    li.appendChild(strong);
    list.appendChild(li);
  });
  box.style.display = 'block';
}

function commPaceLabel(wpm, isVoice) {
  if (!isVoice) return `${wpm} wpm (typing pace — not a speech metric)`;
  if (wpm < 110) return `${wpm} wpm (slower than typical conversational pace)`;
  if (wpm <= 160) return `${wpm} wpm (natural conversational pace)`;
  return `${wpm} wpm (faster than typical — may be rushing)`;
}

function commPronunciationLabel(score) {
  if (score >= 80) return `${score}/100 (speech recognized clearly)`;
  if (score >= 50) return `${score}/100 (moderate — some words may have been misheard)`;
  return `${score}/100 (low — the browser struggled to recognize speech clearly)`;
}
