
/* ==========================================================
    AI INTERVIEW PRO
    DEDICATED INTERVIEW SESSION PAGE (Module 4)

    Full-screen proctored interview: webcam/mic device check,
    recording, timer (pause-aware), pause/resume, explicit
    end-session, and full-screen-exit violation tracking with
    auto-submit after MAX_VIOLATIONS. Redirects back to the
    candidate dashboard's analytics/history on completion.
========================================================== */

requireAuth("candidate");

function show(el) { if (el) el.style.display = ""; }
function hide(el) { if (el) el.style.display = "none"; }

const ACTIVE_SESSION_KEY = "aiip_active_interview_id";

function saveActiveSessionToStorage(interviewId) {
  try { localStorage.setItem(ACTIVE_SESSION_KEY, interviewId); } catch (err) { /* non-fatal */ }
}
function clearActiveSessionFromStorage() {
  try { localStorage.removeItem(ACTIVE_SESSION_KEY); } catch (err) { /* non-fatal */ }
}

const MAX_FULLSCREEN_VIOLATIONS = 3;

const params = new URLSearchParams(window.location.search);
const interviewId = params.get("interview_id");

const state = {
  interviewId: interviewId,
  sessionId: null,
  currentQuestionId: null,
  currentQuestionText: "",
  deadlineAt: null,
  timerIntervalId: null,
  interviewActive: false,   // true once the candidate has clicked "Begin"
  intentionalExit: false,   // true right before we deliberately drop fullscreen
  ending: false,            // guards against double-finalizing
};

if (!interviewId) {
  document.getElementById("preflightTitle").textContent = "No interview specified.";
  document.getElementById("preflightSubtitle").textContent = "Please start an interview from your dashboard.";
  hide(document.getElementById("deviceCheckPanel"));
  hide(document.getElementById("beginInterviewBtn"));
}

/* ==========================================================
   DEVICE CHECK (webcam / microphone access)
========================================================== */

const deviceState = {
  stream: null,
  cameraGranted: false,
  micGranted: false,
  recorder: null,
  recordedChunks: [],
  recordingMimeType: null,
};

function updateDeviceStatusUI() {
  const cameraDot = document.getElementById("cameraStatusDot");
  const cameraText = document.getElementById("cameraStatusText");
  const micDot = document.getElementById("micStatusDot");
  const micText = document.getElementById("micStatusTextCheck");
  const enableBtn = document.getElementById("enableDevicesBtn");
  const placeholder = document.getElementById("devicePreviewPlaceholder");

  if (cameraDot) cameraDot.className = "status-dot " + (deviceState.cameraGranted ? "status-on" : "status-off");
  if (cameraText) cameraText.textContent = deviceState.cameraGranted ? "Enabled" : "Not enabled";
  if (micDot) micDot.className = "status-dot " + (deviceState.micGranted ? "status-on" : "status-off");
  if (micText) micText.textContent = deviceState.micGranted ? "Enabled" : "Not enabled";

  if (enableBtn) {
    const ready = deviceState.cameraGranted || deviceState.micGranted;
    enableBtn.classList.toggle("devices-ready", ready);
    enableBtn.textContent = ready ? "✅ Devices Ready (click to re-check)" : "🎥 Enable Camera & Microphone";
  }

  if (placeholder) placeholder.style.display = deviceState.cameraGranted ? "none" : "";
}

async function enableDevices() {
  const errorEl = document.getElementById("deviceCheckError");
  if (errorEl) errorEl.textContent = "";

  if (deviceState.stream) {
    deviceState.stream.getTracks().forEach((t) => t.stop());
    deviceState.stream = null;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    deviceState.stream = stream;
    deviceState.cameraGranted = stream.getVideoTracks().length > 0;
    deviceState.micGranted = stream.getAudioTracks().length > 0;
  } catch (err) {
    console.warn("Camera+mic request failed, trying microphone only:", err);
    try {
      const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      deviceState.stream = audioOnlyStream;
      deviceState.cameraGranted = false;
      deviceState.micGranted = audioOnlyStream.getAudioTracks().length > 0;
      if (errorEl) errorEl.textContent = "Camera access wasn't granted - continuing with microphone only.";
    } catch (err2) {
      deviceState.stream = null;
      deviceState.cameraGranted = false;
      deviceState.micGranted = false;
      if (errorEl) {
        errorEl.textContent =
          "Camera/microphone access was denied or unavailable. You can still take the interview - just type or use the Speak Your Answer button.";
      }
    }
  }

  const previewEl = document.getElementById("devicePreviewVideo");
  if (previewEl) {
    previewEl.srcObject = deviceState.cameraGranted ? deviceState.stream : null;
  }

  updateDeviceStatusUI();
}

const enableDevicesBtnEl = document.getElementById("enableDevicesBtn");
if (enableDevicesBtnEl) {
  enableDevicesBtnEl.addEventListener("click", enableDevices);
}

function releaseDevices() {
  if (deviceState.stream) {
    deviceState.stream.getTracks().forEach((t) => t.stop());
    deviceState.stream = null;
  }
  deviceState.cameraGranted = false;
  deviceState.micGranted = false;
}

window.addEventListener("beforeunload", () => {
  if (deviceState.recorder && deviceState.recorder.state !== "inactive") {
    deviceState.recorder.stop();
  }
  releaseDevices();
});

/* ==========================================================
   RECORDING (video/audio via MediaRecorder)
========================================================== */

function startSessionRecording() {
  deviceState.recordedChunks = [];

  const cameraBox = document.getElementById("sessionCameraBox");
  const cameraPreview = document.getElementById("sessionCameraPreview");
  const recIndicator = document.getElementById("recIndicator");

  if (!deviceState.stream || (!deviceState.cameraGranted && !deviceState.micGranted)) {
    hide(cameraBox);
    return;
  }

  show(cameraBox);
  if (cameraPreview) {
    cameraPreview.srcObject = deviceState.cameraGranted ? deviceState.stream : null;
  }

  if (!window.MediaRecorder) {
    console.warn("MediaRecorder is not supported in this browser - session will not be recorded.");
    return;
  }

  const mimeCandidates = ["video/webm;codecs=vp8,opus", "video/webm", "audio/webm"];
  const supportedMime = mimeCandidates.find(
    (m) => window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(m)
  );

  try {
    deviceState.recorder = supportedMime
      ? new MediaRecorder(deviceState.stream, { mimeType: supportedMime })
      : new MediaRecorder(deviceState.stream);
    deviceState.recordingMimeType = deviceState.recorder.mimeType || supportedMime || "video/webm";
  } catch (err) {
    console.warn("Could not start MediaRecorder:", err);
    deviceState.recorder = null;
    return;
  }

  deviceState.recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      deviceState.recordedChunks.push(event.data);
    }
  };

  deviceState.recorder.start(1000);
  show(recIndicator);
}

function stopSessionRecording() {
  return new Promise((resolve) => {
    hide(document.getElementById("recIndicator"));

    if (deviceState.recorder && deviceState.recorder.state !== "inactive") {
      deviceState.recorder.onstop = () => resolve();
      deviceState.recorder.stop();
    } else {
      resolve();
    }
  });
}

async function uploadSessionRecording(sessionId) {
  if (!sessionId || deviceState.recordedChunks.length === 0) return;

  const blob = new Blob(deviceState.recordedChunks, {
    type: deviceState.recordingMimeType || "video/webm",
  });

  const formData = new FormData();
  formData.append("file", blob, "session-recording.webm");
  formData.append("recording_type", deviceState.cameraGranted ? "video" : "audio");

  try {
    await fetch(API_BASE_URL + "/sessions/" + sessionId + "/recordings", {
      method: "POST",
      headers: { Authorization: "Bearer " + getToken() },
      body: formData,
    });
  } catch (err) {
    console.warn("Could not upload session recording:", err);
  }
}

async function reportDeviceStatus(sessionId) {
  try {
    await authFetch("/sessions/" + sessionId + "/devices", {
      method: "POST",
      body: JSON.stringify({
        camera_enabled: deviceState.cameraGranted,
        microphone_enabled: deviceState.micGranted,
      }),
    });
  } catch (err) {
    console.warn("Could not report device status:", err);
  }
}

/* ==========================================================
   FULL-SCREEN ENFORCEMENT + VIOLATIONS
========================================================== */

function updateViolationBadge(count) {
  const badge = document.getElementById("violationBadge");
  if (!badge) return;
  badge.textContent = "Violations: " + count + "/" + MAX_FULLSCREEN_VIOLATIONS;
  show(badge);
}

function showViolationOverlay(count) {
  const overlay = document.getElementById("violationOverlay");
  const text = document.getElementById("violationOverlayText");
  if (text) {
    text.textContent =
      "That's violation " + count + " of " + MAX_FULLSCREEN_VIOLATIONS +
      ". One more and your interview will be submitted automatically.";
  }
  show(overlay);
}

function hideViolationOverlay() {
  hide(document.getElementById("violationOverlay"));
}

async function reportFullscreenViolation() {
  if (!state.sessionId || state.ending) return;

  try {
    const response = await authFetch("/sessions/" + state.sessionId + "/violations", { method: "POST" });
    const data = await response.json();

    updateViolationBadge(data.violation_count);
    showViolationOverlay(data.violation_count);

    if (data.auto_submitted) {
      await finalizeAndRedirect("Your interview was auto-submitted after too many full-screen exits.");
    }
  } catch (err) {
    console.warn("Could not report full-screen violation:", err);
  }
}

document.addEventListener("fullscreenchange", () => {
  if (!state.interviewActive || state.ending) return;

  if (!document.fullscreenElement && !state.intentionalExit) {
    reportFullscreenViolation();
  } else if (document.fullscreenElement) {
    hideViolationOverlay();
  }
});

const returnFullscreenBtnEl = document.getElementById("returnFullscreenBtn");
if (returnFullscreenBtnEl) {
  returnFullscreenBtnEl.addEventListener("click", () => {
    document.documentElement.requestFullscreen().then(hideViolationOverlay).catch(() => {});
  });
}

/* ==========================================================
   BEGIN / RESUME INTERVIEW
========================================================== */

async function loadPreflightInfo() {
  if (!interviewId) return;

  try {
    const response = await authFetch("/interviews/" + interviewId);
    if (!response.ok) {
      document.getElementById("preflightTitle").textContent = "Couldn't load this interview.";
      return;
    }

    const interview = await response.json();
    const isResume = interview.status === "in_progress";

    document.getElementById("preflightTitle").textContent = isResume
      ? "Resume your interview"
      : "Ready to begin your interview?";
    document.getElementById("preflightSubtitle").textContent =
      interview.interview_type + " interview on \"" + interview.domain + "\" (" + interview.difficulty + ")";

    const beginBtn = document.getElementById("beginInterviewBtn");
    if (beginBtn) beginBtn.textContent = isResume ? "▶ Resume Interview (Full Screen)" : "🚀 Begin Interview (Full Screen)";
  } catch (err) {
    console.warn("Could not load interview info:", err);
  }
}

async function beginOrResumeInterview() {
  const beginBtn = document.getElementById("beginInterviewBtn");
  const errorEl = document.getElementById("preflightError");
  if (errorEl) errorEl.textContent = "";

  if (beginBtn) beginBtn.disabled = true;

  // Full screen must be requested synchronously-ish from this click gesture.
  try {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch (err) {
    console.warn("Full-screen request failed or was denied:", err);
  }

  try {
    const response = await authFetch("/interviews/start?interview_id=" + interviewId, { method: "POST" });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (errorEl) errorEl.textContent = data.detail || "Could not start the interview.";
      if (beginBtn) beginBtn.disabled = false;
      return;
    }

    const startData = await response.json();
    state.sessionId = startData.session ? startData.session.id : null;
    updateViolationBadge(startData.session ? startData.session.fullscreen_violations : 0);

    hide(document.getElementById("preflightPanel"));
    show(document.getElementById("aiInterviewSession"));
    show(document.getElementById("liveControls"));
    updatePauseResumeButton(false);

    state.interviewActive = true;
    saveActiveSessionToStorage(interviewId);

    startSessionRecording();
    if (state.sessionId) reportDeviceStatus(state.sessionId);

    await loadSession(interviewId);
  } catch (err) {
    if (errorEl) errorEl.textContent = "Something went wrong starting the interview.";
    if (beginBtn) beginBtn.disabled = false;
  }
}

const beginInterviewBtnEl = document.getElementById("beginInterviewBtn");
if (beginInterviewBtnEl) {
  beginInterviewBtnEl.addEventListener("click", beginOrResumeInterview);
}

/* ==========================================================
   PAUSE / RESUME
========================================================== */

async function pauseSession() {
  if (!state.sessionId) return;

  try {
    await authFetch("/sessions/" + state.sessionId + "/pause", { method: "POST" });
  } catch (err) {
    console.warn("Could not pause session:", err);
    return;
  }

  stopTimer();
  if (deviceState.recorder && deviceState.recorder.state === "recording") {
    deviceState.recorder.pause();
  }
  updatePauseResumeButton(true);
}

async function resumeSession() {
  if (!state.sessionId) return;

  try {
    await authFetch("/sessions/" + state.sessionId + "/resume", { method: "POST" });
  } catch (err) {
    console.warn("Could not resume session:", err);
    return;
  }

  if (deviceState.recorder && deviceState.recorder.state === "paused") {
    deviceState.recorder.resume();
  }
  updatePauseResumeButton(false);

  await loadSession(state.interviewId);
}

function updatePauseResumeButton(isPaused) {
  const btn = document.getElementById("pauseResumeBtn");
  if (!btn) return;
  show(btn);
  btn.textContent = isPaused ? "▶ Resume" : "⏸ Pause";
  btn.dataset.paused = isPaused ? "true" : "false";
}

const pauseResumeBtnEl = document.getElementById("pauseResumeBtn");
if (pauseResumeBtnEl) {
  pauseResumeBtnEl.addEventListener("click", () => {
    const isPaused = pauseResumeBtnEl.dataset.paused === "true";
    if (isPaused) resumeSession();
    else pauseSession();
  });
}

/* ==========================================================
   END SESSION (explicit, candidate-initiated)
========================================================== */

const endSessionBtnEl = document.getElementById("endSessionBtn");
if (endSessionBtnEl) {
  endSessionBtnEl.addEventListener("click", async () => {
    if (!state.sessionId) return;
    const confirmed = window.confirm(
      "End this interview now? Whatever you've answered so far will be scored and submitted."
    );
    if (!confirmed) return;

    try {
      await authFetch("/sessions/" + state.sessionId + "/end", { method: "POST" });
    } catch (err) {
      console.warn("Could not end session:", err);
    }

    await finalizeAndRedirect("Your interview has been submitted.");
  });
}

/* ==========================================================
   TIMER
========================================================== */

function startTimer(deadlineAt) {
  stopTimer();
  state.deadlineAt = deadlineAt;

  const timerEl = document.getElementById("sessionTimer");
  if (!timerEl || !deadlineAt) return;
  show(timerEl);

  function tick() {
    const remainingMs = new Date(state.deadlineAt).getTime() - Date.now();

    if (remainingMs <= 0) {
      timerEl.textContent = "⏱ 00:00";
      handleInterviewTimeout();
      return;
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const ss = String(totalSeconds % 60).padStart(2, "0");
    timerEl.textContent = "⏱ " + mm + ":" + ss;

    if (totalSeconds <= 60) {
      timerEl.classList.add("session-timer-warning");
    }
  }

  tick();
  state.timerIntervalId = setInterval(tick, 1000);
}

function stopTimer() {
  if (state.timerIntervalId) {
    clearInterval(state.timerIntervalId);
    state.timerIntervalId = null;
  }
  const timerEl = document.getElementById("sessionTimer");
  if (timerEl) {
    hide(timerEl);
    timerEl.classList.remove("session-timer-warning");
  }
}

async function handleInterviewTimeout() {
  stopTimer();

  try {
    await authFetch("/interviews/" + state.interviewId + "/timeout", { method: "POST" });
  } catch (err) {
    console.warn("Could not register interview timeout:", err);
  }

  await finalizeAndRedirect("Time's up! Your interview ended automatically.");
}

/* ==========================================================
   QUESTION FLOW
========================================================== */

async function loadSession(interviewIdArg) {
  const response = await authFetch("/interviews/" + interviewIdArg + "/session");

  if (!response.ok) {
    console.error("Could not load interview session.");
    return;
  }

  const session = await response.json();

  if (session.session) {
    state.sessionId = session.session.id;
    updateViolationBadge(session.session.fullscreen_violations);
  }

  updatePauseResumeButton(!!session.is_paused);

  if (session.deadline_at) {
    startTimer(session.deadline_at);
  }

  if (session.is_complete) {
    await finalizeAndRedirect("Nice work - you answered every question!");
    return;
  }

  renderQuestion(session);
}

function renderQuestion(session) {
  const question = session.current_question;

  state.currentQuestionId = question.id;
  state.currentQuestionText = question.question_text;

  document.getElementById("sessionProgressText").textContent =
    "Question " + (session.answered_count + 1) + " of " + session.total_questions;

  document.getElementById("sessionProgressFill").style.width =
    Math.round((session.answered_count / session.total_questions) * 100) + "%";

  document.getElementById("questionCategory").textContent = question.category;
  document.getElementById("questionText").textContent = question.question_text;

  const answerBox = document.getElementById("answerText");
  answerBox.value = "";
  document.getElementById("answerError").textContent = "";

  speakText(question.question_text);
}

function speakText(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

const speakQuestionBtnEl = document.getElementById("speakQuestionBtn");
if (speakQuestionBtnEl) {
  speakQuestionBtnEl.addEventListener("click", () => {
    speakText(state.currentQuestionText);
  });
}

/* ---------------- Voice answer capture (speech-to-text) ---------------- */

const micBtnEl = document.getElementById("micBtn");
const micStatusEl = document.getElementById("micStatus");
const answerTextEl = document.getElementById("answerText");

let recognizer = null;
let isRecording = false;

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognitionCtor && micBtnEl) {

  recognizer = new SpeechRecognitionCtor();
  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.lang = "en-US";

  let baseAnswerText = "";

  recognizer.onstart = () => {
    isRecording = true;
    micBtnEl.classList.add("recording");
    micBtnEl.textContent = "⏹ Stop Recording";
    micStatusEl.textContent = "Listening...";
    baseAnswerText = answerTextEl.value ? answerTextEl.value + " " : "";
  };

  recognizer.onresult = (event) => {
    let transcript = "";
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    answerTextEl.value = (baseAnswerText + transcript).trim();
  };

  recognizer.onerror = (event) => {
    micStatusEl.textContent = "Voice input error: " + event.error;
  };

  recognizer.onend = () => {
    isRecording = false;
    micBtnEl.classList.remove("recording");
    micBtnEl.textContent = "🎤 Speak Your Answer";
    micStatusEl.textContent = "";
  };

  micBtnEl.addEventListener("click", () => {
    if (isRecording) {
      recognizer.stop();
    } else {
      try {
        recognizer.start();
      } catch (err) {
        console.warn("Could not start voice recognition:", err);
      }
    }
  });

} else if (micBtnEl) {
  micBtnEl.disabled = true;
  micBtnEl.textContent = "🎤 Voice not supported in this browser";
  micStatusEl.textContent = "Try Chrome on desktop, or just type your answer below.";
}

/* ---------------- Submit answer ---------------- */

const submitAnswerBtnEl = document.getElementById("submitAnswerBtn");

if (submitAnswerBtnEl) {
  submitAnswerBtnEl.addEventListener("click", async () => {

    const answerErrorEl = document.getElementById("answerError");
    answerErrorEl.textContent = "";

    const answerValue = answerTextEl.value.trim();

    if (!answerValue) {
      answerErrorEl.textContent = "Please provide an answer (speak or type) before submitting.";
      return;
    }

    if (isRecording && recognizer) {
      recognizer.stop();
    }

    submitAnswerBtnEl.disabled = true;
    const originalText = submitAnswerBtnEl.textContent;
    submitAnswerBtnEl.textContent = "Saving...";

    try {
      const response = await authFetch(
        "/interviews/" + state.interviewId + "/questions/" + state.currentQuestionId + "/answer",
        {
          method: "PUT",
          body: JSON.stringify({ answer_text: answerValue }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not save your answer.");
      }

      await loadSession(state.interviewId);

    } catch (err) {
      answerErrorEl.textContent = err.message || "Something went wrong saving your answer.";
    } finally {
      submitAnswerBtnEl.disabled = false;
      submitAnswerBtnEl.textContent = originalText;
    }

  });
}

/* ==========================================================
   FINALIZE + REDIRECT
========================================================== */

async function finalizeAndRedirect(message) {
  if (state.ending) return;
  state.ending = true;
  state.interviewActive = false;
  state.intentionalExit = true;

  stopTimer();
  window.speechSynthesis && window.speechSynthesis.cancel();
  hideViolationOverlay();

  const finishingOverlay = document.getElementById("finishingOverlay");
  const finishingSubtitle = document.getElementById("finishingSubtitle");
  if (finishingSubtitle) finishingSubtitle.textContent = message || "Saving your answers and recording.";
  show(finishingOverlay);

  await stopSessionRecording();
  await uploadSessionRecording(state.sessionId);
  releaseDevices();
  clearActiveSessionFromStorage();

  if (document.fullscreenElement) {
    try { await document.exitFullscreen(); } catch (err) { /* non-fatal */ }
  }

  setTimeout(() => {
    window.location.href = "candidate.html?completed_interview=" + state.interviewId + "#analytics";
  }, 1200);
}

/* ==========================================================
   INITIAL LOAD
========================================================== */

loadPreflightInfo();
