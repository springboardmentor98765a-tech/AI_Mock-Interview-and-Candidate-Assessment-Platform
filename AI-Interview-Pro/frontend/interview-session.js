
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
   MODULE 6 - EMOTION DETECTION & EYE TRACKING

   Runs entirely client-side against the candidate's own webcam feed
   (face-api.js, loaded from a CDN in interview-session.html). Nothing
   here uploads video or images - only small periodic summary batches
   (counts + averages) are posted to POST /sessions/{id}/emotion-samples.
========================================================== */

const FACE_API_MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

const EXPRESSION_WEIGHTS = {
  happy: 1.0,
  neutral: 0.8,
  surprised: 0.55,
  sad: -0.5,
  angry: -0.35,
  fearful: -0.6,
  disgusted: -0.45,
};

const EMOTION_EMOJI = {
  neutral: "😐",
  happy: "🙂",
  sad: "😔",
  angry: "😠",
  fearful: "😨",
  disgusted: "🤢",
  surprised: "😮",
};

function emptyEmotionBatch() {
  return {
    samplesCount: 0,
    faceDetectedCount: 0,
    eyeContactCount: 0,
    emotionCounts: {},
    confidenceSum: 0,
    engagementSum: 0,
  };
}

const emotionState = {
  modelsLoaded: false,
  detecting: false,
  detectIntervalId: null,
  batchPostIntervalId: null,
  batch: emptyEmotionBatch(),
};

async function loadFaceApiModels() {
  if (typeof faceapi === "undefined") {
    console.warn("face-api.js did not load - emotion/eye-contact tracking disabled.");
    return false;
  }
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(FACE_API_MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_API_MODEL_URL),
    ]);
    emotionState.modelsLoaded = true;
    return true;
  } catch (err) {
    console.warn("Could not load face-api.js models:", err);
    return false;
  }
}

function avgX(points) {
  return points.reduce((sum, p) => sum + p.x, 0) / points.length;
}

// Approximate "is the candidate looking at the camera" heuristic: the
// nose sits roughly centered between the two eyes, relative to eye
// spacing. This is a lightweight, browser-only approximation - not
// precise gaze tracking - but it's enough to reward facing the camera
// vs. looking away for extended periods.
function estimateEyeContact(result) {
  const landmarks = result.landmarks;
  if (!landmarks) return false;

  const nose = landmarks.getNose();
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  if (!nose.length || !leftEye.length || !rightEye.length) return false;

  const noseX = nose[Math.floor(nose.length / 2)].x;
  const leftEyeX = avgX(leftEye);
  const rightEyeX = avgX(rightEye);
  const eyeMidX = (leftEyeX + rightEyeX) / 2;
  const eyeSpan = Math.abs(rightEyeX - leftEyeX) || 1;

  const horizontalOffsetRatio = Math.abs(noseX - eyeMidX) / eyeSpan;
  return horizontalOffsetRatio < 0.35;
}

function computeVisualConfidence(expressions) {
  let score = 0;
  Object.keys(expressions).forEach((key) => {
    const weight = EXPRESSION_WEIGHTS[key] != null ? EXPRESSION_WEIGHTS[key] : 0;
    score += expressions[key] * weight;
  });
  // Raw weighted score ranges roughly -0.6..1.0 -> map onto 0..100.
  return Math.max(0, Math.min(100, Math.round(((score + 0.6) / 1.6) * 100)));
}

function computeEngagement(eyeContact, visualConfidence) {
  const eyeComponent = eyeContact ? 100 : 40;
  return Math.round(0.6 * eyeComponent + 0.4 * visualConfidence);
}

function recordEmotionSample({ faceDetected, eyeContact, emotion, visualConfidence, engagement }) {
  const batch = emotionState.batch;
  batch.samplesCount += 1;
  if (faceDetected) {
    batch.faceDetectedCount += 1;
    if (eyeContact) batch.eyeContactCount += 1;
    if (emotion) batch.emotionCounts[emotion] = (batch.emotionCounts[emotion] || 0) + 1;
    if (typeof visualConfidence === "number") batch.confidenceSum += visualConfidence;
    if (typeof engagement === "number") batch.engagementSum += engagement;
  }
}

function updateEmotionBadge(emotion) {
  const badge = document.getElementById("emotionBadge");
  if (!badge) return;
  if (!emotion) {
    hide(badge);
    return;
  }
  badge.textContent = (EMOTION_EMOJI[emotion] || "🙂") + " " + emotion;
  show(badge);
}

function setMeter(fillId, valueId, pct) {
  const fill = document.getElementById(fillId);
  const value = document.getElementById(valueId);
  const clamped = Math.max(0, Math.min(100, Math.round(pct || 0)));
  if (fill) fill.style.width = clamped + "%";
  if (value) value.textContent = clamped + "%";
}

function updateLiveInsightMeters(eyeContact, visualConfidence, engagement) {
  const batch = emotionState.batch;
  const eyeContactPct = batch.faceDetectedCount
    ? (batch.eyeContactCount / batch.faceDetectedCount) * 100
    : (eyeContact ? 100 : 0);
  const attentionPct = batch.samplesCount
    ? (batch.faceDetectedCount / batch.samplesCount) * 100
    : 0;

  setMeter("eyeContactMeter", "eyeContactValue", eyeContactPct);
  setMeter("attentionMeter", "attentionValue", attentionPct);
  setMeter("visualConfidenceMeter", "visualConfidenceValue", visualConfidence);
  setMeter("engagementMeter", "engagementValue", engagement);
}

function drawFaceOverlay(canvasEl, videoEl, result, eyeContact) {
  if (!canvasEl) return;
  canvasEl.width = videoEl.clientWidth;
  canvasEl.height = videoEl.clientHeight;
  const ctx = canvasEl.getContext("2d");
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  if (!videoEl.videoWidth || !videoEl.videoHeight) return;
  const scaleX = canvasEl.width / videoEl.videoWidth;
  const scaleY = canvasEl.height / videoEl.videoHeight;
  const box = result.detection.box;

  ctx.strokeStyle = eyeContact ? "#22c55e" : "#f59e0b";
  ctx.lineWidth = 2;
  ctx.strokeRect(box.x * scaleX, box.y * scaleY, box.width * scaleX, box.height * scaleY);
}

async function detectEmotionTick() {
  if (!emotionState.modelsLoaded || emotionState.detecting) return;

  const videoEl = document.getElementById("sessionCameraPreview");
  const canvasEl = document.getElementById("emotionOverlayCanvas");
  if (!videoEl || !deviceState.cameraGranted || videoEl.readyState < 2) return;

  emotionState.detecting = true;
  try {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
    const result = await faceapi
      .detectSingleFace(videoEl, options)
      .withFaceLandmarks(true)
      .withFaceExpressions();

    if (!result) {
      recordEmotionSample({ faceDetected: false });
      updateEmotionBadge(null);
      if (canvasEl) {
        const ctx = canvasEl.getContext("2d");
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      }
      return;
    }

    const expressions = result.expressions;
    const dominant = Object.keys(expressions).reduce((a, b) => (expressions[a] > expressions[b] ? a : b));
    const eyeContact = estimateEyeContact(result);
    const visualConfidence = computeVisualConfidence(expressions);
    const engagement = computeEngagement(eyeContact, visualConfidence);

    recordEmotionSample({
      faceDetected: true,
      eyeContact,
      emotion: dominant,
      visualConfidence,
      engagement,
    });

    drawFaceOverlay(canvasEl, videoEl, result, eyeContact);
    updateEmotionBadge(dominant);
    updateLiveInsightMeters(eyeContact, visualConfidence, engagement);
  } catch (err) {
    console.warn("Emotion detection tick failed:", err);
  } finally {
    emotionState.detecting = false;
  }
}

async function postEmotionBatch() {
  const batch = emotionState.batch;
  if (!state.sessionId || batch.samplesCount === 0) return;

  const payload = {
    samples_count: batch.samplesCount,
    face_detected_count: batch.faceDetectedCount,
    eye_contact_count: batch.eyeContactCount,
    emotion_counts: batch.emotionCounts,
    avg_visual_confidence: batch.faceDetectedCount ? batch.confidenceSum / batch.faceDetectedCount : null,
    avg_engagement: batch.faceDetectedCount ? batch.engagementSum / batch.faceDetectedCount : null,
  };

  // Reset immediately so an in-flight detection tick doesn't get lost
  // and batches don't double-count while the request is in the air.
  emotionState.batch = emptyEmotionBatch();

  try {
    await authFetch("/sessions/" + state.sessionId + "/emotion-samples", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("Could not post emotion sample batch:", err);
  }
}

async function startEmotionTracking() {
  if (!deviceState.cameraGranted) return;

  const panel = document.getElementById("liveInsightsPanel");
  const statusEl = document.getElementById("emotionModelStatus");
  show(panel);
  if (statusEl) statusEl.textContent = "Loading facial analysis model...";

  const loaded = await loadFaceApiModels();
  if (!loaded) {
    if (statusEl) statusEl.textContent = "Facial analysis isn't available in this browser.";
    return;
  }
  if (statusEl) {
    statusEl.textContent =
      "Analyzing engagement locally in your browser - only summary scores are saved, never video.";
  }

  stopEmotionDetectionLoop();
  emotionState.detectIntervalId = setInterval(detectEmotionTick, 1500);
  emotionState.batchPostIntervalId = setInterval(postEmotionBatch, 10000);
}

function stopEmotionDetectionLoop() {
  if (emotionState.detectIntervalId) {
    clearInterval(emotionState.detectIntervalId);
    emotionState.detectIntervalId = null;
  }
}

function stopEmotionTracking() {
  stopEmotionDetectionLoop();
  if (emotionState.batchPostIntervalId) {
    clearInterval(emotionState.batchPostIntervalId);
    emotionState.batchPostIntervalId = null;
  }
  postEmotionBatch(); // flush whatever samples are left
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
    startEmotionTracking();
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
  stopEmotionDetectionLoop();
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
  if (emotionState.modelsLoaded && !emotionState.detectIntervalId) {
    emotionState.detectIntervalId = setInterval(detectEmotionTick, 1500);
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

  resetSpeechMetrics();
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

/* ==========================================================
   MODULE 5 - SPEECH-TO-TEXT & COMMUNICATION ANALYSIS

   Real-time transcription (browser Speech Recognition API) plus, from
   that same stream: live filler-word detection, speaking-pace (WPM)
   tracking, and a recognition-confidence-derived clarity/pronunciation
   estimate. These are sent along with the transcript on submit and
   blended into the answer's communication/confidence scores server-side
   (app/scoring.py::apply_speech_metrics) - never fabricated if the
   candidate typed instead of speaking.
========================================================== */

const FILLER_WORDS_CLIENT = [
  "um", "uh", "umm", "uhh", "erm", "hmm",
  "like", "you know", "i mean", "sort of", "kind of",
  "actually", "basically", "i guess", "i think", "not sure",
];

let speechAccumulatedMs = 0;
let speechSegmentStart = null;
let lastResultConfidenceSum = 0;
let lastResultConfidenceCount = 0;

function countFillerWords(text) {
  const lower = " " + (text || "").toLowerCase() + " ";
  let count = 0;
  FILLER_WORDS_CLIENT.forEach((phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = lower.match(new RegExp("\\b" + escaped + "\\b", "g"));
    if (matches) count += matches.length;
  });
  return count;
}

function currentSpeechDurationMs() {
  return speechAccumulatedMs + (speechSegmentStart ? Date.now() - speechSegmentStart : 0);
}

function setSpeechMetricText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateSpeechMetricsUI(fillerCount, wpm, clarityPct) {
  const panel = document.getElementById("speechMetricsPanel");
  if (panel) show(panel);
  setSpeechMetricText("fillerWordCountText", String(fillerCount || 0));
  setSpeechMetricText("speakingPaceText", wpm != null ? Math.round(wpm) + " WPM" : "- WPM");
  setSpeechMetricText("pronunciationScoreText", clarityPct != null ? Math.round(clarityPct) + "%" : "-");
}

function resetSpeechMetrics() {
  speechAccumulatedMs = 0;
  speechSegmentStart = null;
  lastResultConfidenceSum = 0;
  lastResultConfidenceCount = 0;
  hide(document.getElementById("speechMetricsPanel"));
  updateSpeechMetricsUI(0, null, null);
}

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
    speechSegmentStart = Date.now();
  };

  recognizer.onresult = (event) => {
    let transcript = "";
    let confSum = 0;
    let confCount = 0;

    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      const conf = event.results[i][0].confidence;
      if (event.results[i].isFinal && typeof conf === "number" && conf > 0) {
        confSum += conf;
        confCount += 1;
      }
    }

    answerTextEl.value = (baseAnswerText + transcript).trim();

    if (confCount > 0) {
      lastResultConfidenceSum = confSum;
      lastResultConfidenceCount = confCount;
    }

    const fillerCount = countFillerWords(answerTextEl.value);
    const elapsedMinutes = Math.max(currentSpeechDurationMs() / 60000, 0.05);
    const wordCount = (answerTextEl.value.match(/[a-zA-Z']+/g) || []).length;
    const wpm = wordCount / elapsedMinutes;
    const clarity = lastResultConfidenceCount > 0
      ? (lastResultConfidenceSum / lastResultConfidenceCount) * 100
      : null;

    updateSpeechMetricsUI(fillerCount, wpm, clarity);
  };

  recognizer.onerror = (event) => {
    micStatusEl.textContent = "Voice input error: " + event.error;
  };

  recognizer.onend = () => {
    isRecording = false;
    micBtnEl.classList.remove("recording");
    micBtnEl.textContent = "🎤 Speak Your Answer";
    micStatusEl.textContent = "";
    if (speechSegmentStart) {
      speechAccumulatedMs += Date.now() - speechSegmentStart;
      speechSegmentStart = null;
    }
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

    // Module 5 - Speech-to-Text & Communication Analysis: only attach
    // real speech-delivery metrics if the candidate meaningfully used
    // voice input for this answer (a couple of seconds is enough to
    // rule out an accidental mic tap). Typed answers send nulls, which
    // the backend leaves untouched (see scoring.py::apply_speech_metrics).
    const speechDurationMs = currentSpeechDurationMs();
    const usedVoice = speechDurationMs > 2000;

    const speechDurationSeconds = usedVoice ? Math.round(speechDurationMs / 1000) : null;
    const fillerWordCount = usedVoice ? countFillerWords(answerValue) : null;
    const wordCountFinal = (answerValue.match(/[a-zA-Z']+/g) || []).length;
    const speakingPaceWpm = usedVoice && speechDurationSeconds > 0
      ? wordCountFinal / (speechDurationSeconds / 60)
      : null;
    const pronunciationScore = usedVoice && lastResultConfidenceCount > 0
      ? (lastResultConfidenceSum / lastResultConfidenceCount) * 100
      : null;

    submitAnswerBtnEl.disabled = true;
    const originalText = submitAnswerBtnEl.textContent;
    submitAnswerBtnEl.textContent = "Saving...";

    try {
      const response = await authFetch(
        "/interviews/" + state.interviewId + "/questions/" + state.currentQuestionId + "/answer",
        {
          method: "PUT",
          body: JSON.stringify({
            answer_text: answerValue,
            filler_word_count: fillerWordCount,
            speaking_pace_wpm: speakingPaceWpm,
            pronunciation_score: pronunciationScore,
            speech_duration_seconds: speechDurationSeconds,
          }),
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

  stopEmotionTracking();
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
