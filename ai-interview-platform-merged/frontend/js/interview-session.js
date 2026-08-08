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

let interviewId = null;
let interview = null;
let questions = [];
let currentIndex = 0;
let localAnswers = {}; // questionId -> { text, inputMode }

let webcamStream = null;
let faceApiReady = false;
let faceCheckTimer = null;
let noFaceStreak = 0;

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
    webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 }, audio: false });
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
  stopWebcamTracks(); // turn the camera off right away — proctoring listeners (incl. the
                       // leave-page guard) stay armed until the /finish call below settles
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
    if (!sessionActive || !faceApiReady) return;
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
