
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
  permissionRequested: false,
  recorder: null,
  recordedChunks: [],
  recordingMimeType: null,
};

function updateDeviceStatusUI() {
  const enableBtn = document.getElementById("enableDevicesBtn");
  const placeholder = document.getElementById("devicePreviewPlaceholder");
  const liveTag = document.getElementById("livePreviewTag");

  if (enableBtn) {
    const ready = deviceState.cameraGranted || deviceState.micGranted;
    enableBtn.classList.toggle("devices-ready", ready);
    enableBtn.textContent = ready ? "Devices ready - check again" : "Enable camera & microphone";
  }

  if (placeholder) placeholder.style.display = deviceState.cameraGranted ? "none" : "";
  if (liveTag) liveTag.style.display = deviceState.cameraGranted ? "" : "none";

  const missingStatus = deviceState.permissionRequested ? "failed" : "pending";
  setCheckStatus("camera", deviceState.cameraGranted ? "passed" : missingStatus,
    deviceState.cameraGranted ? "Camera is working" :
      (deviceState.permissionRequested ? "Camera unavailable - allow it in browser settings or continue without video" : "Enable access to check your camera"));
  setCheckStatus("microphone", deviceState.micGranted ? "passed" : missingStatus,
    deviceState.micGranted ? "Microphone is working" :
      (deviceState.permissionRequested ? "Microphone unavailable - allow it in browser settings or type your answers" : "Enable access to check your microphone"));

  if (deviceState.cameraGranted) {
    startPreflightFaceLoop();
  } else {
    stopPreflightFaceLoop();
    setCheckStatus("faceVerification", "pending", "Waiting for camera...");
    setCheckStatus("lighting", "pending", "Waiting for camera...");
  }

  updateSecuritySummary();
  updateBeginButtonState();
}

async function enableDevices() {
  const errorEl = document.getElementById("deviceCheckError");
  if (errorEl) errorEl.textContent = "";
  deviceState.permissionRequested = true;

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
      if (errorEl) errorEl.textContent = "Camera access is unavailable. Your microphone is ready, and you may continue without video.";
    } catch (err2) {
      deviceState.stream = null;
      deviceState.cameraGranted = false;
      deviceState.micGranted = false;
      if (errorEl) {
        errorEl.textContent =
          "Camera and microphone access is unavailable. Allow access in your browser settings, or continue and type your answers.";
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

/* ==========================================================
   PRE-INTERVIEW SECURITY CHECK
   (Module 4 device access + Module 6 CNN stage used here for a
   one-time face/lighting/multi-person verification pass, plus
   browser/full-screen/network diagnostics - modeled after the
   pre-checks used by large-scale proctored online exams.)
========================================================== */

const CHECK_KEYS = ["faceVerification", "camera", "microphone", "speaker", "lighting", "browser", "fullscreen", "network"];
const BLOCKING_CHECKS = ["browser", "fullscreen", "network"];
const CHECK_LABELS = {
  pending: "Checking…",
  passed: "Ready",
  warning: "Needs attention",
  failed: "Unavailable",
};

function setCheckStatus(key, status, subtext) {
  const pill = document.getElementById("check-" + key + "-pill");
  const subtextEl = document.getElementById("check-" + key + "-subtext");
  const row = document.querySelector('[data-check="' + key + '"]');
  if (pill) {
    pill.className = "check-pill check-pill-" + status;
    pill.textContent = CHECK_LABELS[status] || CHECK_LABELS.pending;
    pill.dataset.status = status;
  }
  if (row) row.dataset.status = status;
  if (subtextEl && subtext) subtextEl.textContent = subtext;
  updateReadinessProgress();
  updateSecuritySummary();
  updateBeginButtonState();
}

function getCheckStatus(key) {
  const pill = document.getElementById("check-" + key + "-pill");
  return pill && pill.dataset.status ? pill.dataset.status : "pending";
}

function updateReadinessProgress() {
  const readyCount = CHECK_KEYS.filter((key) => getCheckStatus(key) === "passed").length;
  const completeCount = CHECK_KEYS.filter((key) => getCheckStatus(key) !== "pending").length;
  const countEl = document.getElementById("readinessProgressCount");
  const textEl = document.getElementById("readinessProgressText");
  const barEl = document.getElementById("readinessProgressBar");
  const fillEl = document.getElementById("readinessProgressFill");

  if (countEl) countEl.textContent = readyCount + " of " + CHECK_KEYS.length + " ready";
  if (textEl) textEl.textContent = completeCount < CHECK_KEYS.length ? "Checking your setup…" : "Setup check complete";
  if (barEl) barEl.setAttribute("aria-valuenow", String(readyCount));
  if (fillEl) fillEl.style.width = (readyCount / CHECK_KEYS.length * 100) + "%";
}

function checkBrowserCompatibility() {
  const hasSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const hasMediaRecorder = !!window.MediaRecorder;
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const isChromeLike = /Chrome|Edg\//.test(navigator.userAgent) && !/OPR\//.test(navigator.userAgent);

  if (hasGetUserMedia && hasMediaRecorder && hasSpeechRecognition && isChromeLike) {
    setCheckStatus("browser", "passed", "Chrome/Edge detected - all interview features supported");
  } else if (hasGetUserMedia && hasMediaRecorder) {
    setCheckStatus("browser", "warning", "Supported, but voice-to-text works best in Chrome or Edge");
  } else {
    setCheckStatus("browser", "failed", "This browser is missing features this interview needs - please switch to Chrome");
  }
}

function checkFullscreenReadiness() {
  const supported = !!(document.documentElement.requestFullscreen);
  if (supported) {
    setCheckStatus("fullscreen", "passed", "Full-screen mode is supported - close other windows before you begin");
  } else {
    setCheckStatus("fullscreen", "failed", "Full-screen mode isn't supported in this browser");
  }
}

async function checkNetwork() {
  setCheckStatus("network", "pending", "Checking...");
  if (!navigator.onLine) {
    setCheckStatus("network", "failed", "No internet connection detected");
    return;
  }
  try {
    const started = performance.now();
    const response = await fetch(API_BASE_URL + "/health", { cache: "no-store" });
    const elapsedMs = Math.round(performance.now() - started);
    if (response.ok) {
      setCheckStatus("network", elapsedMs < 800 ? "passed" : "warning",
        elapsedMs < 800 ? ("Connected - " + elapsedMs + "ms") : ("Connected but slow - " + elapsedMs + "ms"));
    } else {
      setCheckStatus("network", "warning", "Server reachable but responded unexpectedly");
    }
  } catch (err) {
    setCheckStatus("network", "failed", "Could not reach the interview server");
  }
}

function setupSpeakerTest() {
  const btn = document.getElementById("testSpeakerBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 440;
      gain.gain.value = 0.15;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        ctx.close();
      }, 600);
      setCheckStatus("speaker", "passed", "Test tone played - replay it if needed");
      btn.textContent = "Replay";
    } catch (err) {
      setCheckStatus("speaker", "warning", "Couldn't play a test tone in this browser - check your volume manually");
    }
  });
}

/* ---- one-time face verification + lighting check, using the same
   face-api.js CNN models as the live Module 6 tracking (loaded lazily
   here so the pre-flight check doesn't wait on it unnecessarily). ---- */

let preflightFaceIntervalId = null;

function computeFrameBrightness(videoEl) {
  const w = 64, h = 48;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(videoEl, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return sum / (data.length / 4) / 255; // 0..1
}

async function preflightCheckTick() {
  const videoEl = document.getElementById("devicePreviewVideo");
  const overlayEl = document.getElementById("devicePreviewOverlay");
  if (!videoEl || videoEl.readyState < 2) return;

  const brightness = computeFrameBrightness(videoEl);
  if (brightness < 0.18) {
    setCheckStatus("lighting", "warning", "Room looks too dark - try facing a light source");
  } else if (brightness > 0.92) {
    setCheckStatus("lighting", "warning", "Very bright / overexposed - try reducing backlight");
  } else {
    setCheckStatus("lighting", "passed", "Lighting looks good");
  }

  if (typeof faceapi === "undefined" || !emotionState.modelsLoaded) {
    setCheckStatus("faceVerification", "pending", "Loading face verification model...");
    return;
  }

  try {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
    const results = await faceapi.detectAllFaces(videoEl, options).withFaceLandmarks(true);

    if (overlayEl) {
      overlayEl.width = videoEl.clientWidth;
      overlayEl.height = videoEl.clientHeight;
      const ctx = overlayEl.getContext("2d");
      ctx.clearRect(0, 0, overlayEl.width, overlayEl.height);
      if (videoEl.videoWidth) {
        const scaleX = overlayEl.width / videoEl.videoWidth;
        const scaleY = overlayEl.height / videoEl.videoHeight;
        results.forEach((r) => {
          ctx.strokeStyle = results.length === 1 ? "#22c55e" : "#f59e0b";
          ctx.lineWidth = 2;
          const box = r.detection.box;
          ctx.strokeRect(box.x * scaleX, box.y * scaleY, box.width * scaleX, box.height * scaleY);
        });
      }
    }

    if (results.length === 0) {
      setCheckStatus("faceVerification", "warning", "No face detected - please center yourself in frame");
    } else if (results.length > 1) {
      setCheckStatus("faceVerification", "failed", results.length + " faces detected - only the candidate should be visible");
    } else {
      const box = results[0].detection.box;
      const centerX = (box.x + box.width / 2) / videoEl.videoWidth;
      const centered = centerX > 0.28 && centerX < 0.72;
      if (centered) {
        setCheckStatus("faceVerification", "passed", "Face verified - centered and clearly visible");
      } else {
        setCheckStatus("faceVerification", "warning", "Face not clearly centered - please position yourself in the middle of the frame");
      }
    }
  } catch (err) {
    console.warn("Preflight face check failed:", err);
  }
}

async function startPreflightFaceLoop() {
  if (preflightFaceIntervalId) return;
  setCheckStatus("faceVerification", "pending", "Loading face verification model...");
  setCheckStatus("lighting", "pending", "Analyzing...");
  if (!emotionState.modelsLoaded) {
    await loadFaceApiModels();
  }
  preflightFaceIntervalId = setInterval(() => {
    preflightCheckTick();
    updateSecuritySummary();
    updateBeginButtonState();
  }, 1200);
  preflightCheckTick();
}

function stopPreflightFaceLoop() {
  if (preflightFaceIntervalId) {
    clearInterval(preflightFaceIntervalId);
    preflightFaceIntervalId = null;
  }
}

function updateSecuritySummary() {
  const summaryEl = document.getElementById("securityCheckSummary");
  if (!summaryEl) return;

  const statuses = CHECK_KEYS.map(getCheckStatus);
  const blockingFailures = BLOCKING_CHECKS.filter((key) => getCheckStatus(key) === "failed");
  const hasFailed = statuses.includes("failed");
  const hasWarning = statuses.includes("warning");
  const hasPending = statuses.includes("pending");
  const consentEl = document.getElementById("consentCheckbox");
  const consented = consentEl ? consentEl.checked : false;

  summaryEl.className = "security-check-summary";
  if (!consented) {
    summaryEl.textContent = "Review the setup and provide consent to start the interview.";
  } else if (blockingFailures.length) {
    summaryEl.textContent = "Resolve the unavailable browser, full-screen, or network check before starting.";
    summaryEl.classList.add("summary-blocked");
  } else if (hasFailed || hasWarning) {
    summaryEl.textContent = "Some optional checks need attention. You may still start the interview.";
    summaryEl.classList.add("summary-warning");
  } else if (hasPending) {
    summaryEl.textContent = "Checks are still running. You may start once the required checks are ready.";
  } else {
    summaryEl.textContent = "Your setup is ready. You can start the interview.";
    summaryEl.classList.add("summary-ok");
  }
}

function updateBeginButtonState() {
  const beginBtn = document.getElementById("beginInterviewBtn");
  const consentEl = document.getElementById("consentCheckbox");
  if (!beginBtn) return;
  const consented = consentEl ? consentEl.checked : false;
  const hasBlockingFailure = BLOCKING_CHECKS.some((key) => getCheckStatus(key) === "failed");
  const hasBlockingPending = BLOCKING_CHECKS.some((key) => getCheckStatus(key) === "pending");
  beginBtn.disabled = !consented || hasBlockingFailure || hasBlockingPending;
}

function runSecurityChecks() {
  checkBrowserCompatibility();
  checkFullscreenReadiness();
  checkNetwork();
  updateDeviceStatusUI(); // re-derives camera/mic/face/lighting rows from current deviceState
  updateSecuritySummary();
}

const runChecksAgainBtnEl = document.getElementById("runChecksAgainBtn");
if (runChecksAgainBtnEl) {
  runChecksAgainBtnEl.addEventListener("click", () => {
    runSecurityChecks();
    if (deviceState.cameraGranted) preflightCheckTick();
  });
}

const consentCheckboxEl = document.getElementById("consentCheckbox");
if (consentCheckboxEl) {
  consentCheckboxEl.addEventListener("change", () => {
    updateSecuritySummary();
    updateBeginButtonState();
  });
}

setupSpeakerTest();
runSecurityChecks();

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

// Module 6 - CNN + RNN: consecutive-tick thresholds before the instant,
// client-side warning banners appear. Mirrors backend/app/ml/features.py
// (kept in sync manually - see that file's docstring for why).
const EYE_CONTACT_WARNING_TICKS = 3;
const NO_FACE_WARNING_TICKS = 2;
const MULTI_FACE_WARNING_TICKS = 2;

// Rather than surfacing raw expression labels (happy/sad/angry/etc) to
// the candidate, only signals tied to FEAR, CONFUSION, and NERVOUSNESS
// are used - collapsed into a single 0-100 "confidence" percentage.
// Everything else face-api.js reports (happy, neutral, sad, angry,
// disgusted) is read from the model but deliberately ignored here.
//
//   fear         -> expressions.fearful, used directly
//   confusion    -> face-api has no "confused" class; expressions.surprised
//                   (raised brows / widened eyes) is used as the closest
//                   available proxy - documented here rather than silently
//                   relabeled
//   nervousness  -> not a facial expression at all in this model, so it's
//                   estimated behaviorally instead: how much the
//                   candidate's gaze has been jumping around over the
//                   last few ticks (see gazeJitter in detectEmotionTick),
//                   blended with the fear score
const CONFIDENCE_WEIGHTS = {
  fear: 0.45,
  confusion: 0.30,
  nervousness: 0.25,
};

function emptyEmotionBatch() {
  return {
    samplesCount: 0,
    faceDetectedCount: 0,
    eyeContactCount: 0,
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
  // Module 6 - CNN + RNN: raw per-tick feature vectors waiting to be
  // posted to the backend RNN stage, plus client-side counters used
  // for the *instant* on-screen warning banners (the RNN's own view,
  // returned from the server, is the slower/smoothed signal used for
  // the recruiter-facing proctoring flag badge).
  pendingTicks: [],
  consecutiveNoEyeContact: 0,
  consecutiveNoFace: 0,
  consecutiveMultiFace: 0,
  proctoringFlagTotal: 0,
  // Last few gaze-offset readings, used to estimate nervousness from
  // how much the gaze is jumping around rather than from any facial
  // expression label.
  recentGazeOffsets: [],
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

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Eye Aspect Ratio (EAR): a standard, cheap way to tell open vs. closed/
// squinted eyes from 68-point landmarks, used both for the eye-openness
// feature fed to the backend RNN and as one signal in the eye-contact
// heuristic below. https://vision.fau.edu/~fkokkinos/EAR - the 68-point
// eye has 6 points; face-api's *Tiny* landmark net gives fewer points
// per eye, so this falls back gracefully if some points are missing.
function eyeAspectRatio(eyePoints) {
  if (!eyePoints || eyePoints.length < 4) return 0.3; // assume "open" if unavailable
  const p = eyePoints;
  const horizontal = dist(p[0], p[Math.min(3, p.length - 1)]);
  if (!horizontal) return 0.3;
  let verticalSum = 0;
  let verticalCount = 0;
  for (let i = 1; i < p.length - 1; i++) {
    verticalSum += dist(p[i], p[p.length - 1 - i]);
    verticalCount++;
  }
  const vertical = verticalCount ? verticalSum / verticalCount : horizontal * 0.3;
  return vertical / horizontal;
}

// Approximate "is the candidate looking at the camera" heuristic: the
// nose sits roughly centered between the two eyes, relative to eye
// spacing, AND the eyes are open enough to plausibly be looking at
// anything. This is a lightweight, browser-only approximation - not
// precise gaze tracking - but it's enough to reward facing the camera
// vs. looking away/eyes-closed for extended periods.
function estimateEyeContact(result) {
  const landmarks = result.landmarks;
  if (!landmarks) return { eyeContact: false, gazeOffset: 1, eyeOpenness: 0 };

  const nose = landmarks.getNose();
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  if (!nose.length || !leftEye.length || !rightEye.length) {
    return { eyeContact: false, gazeOffset: 1, eyeOpenness: 0 };
  }

  const noseX = nose[Math.floor(nose.length / 2)].x;
  const leftEyeX = avgX(leftEye);
  const rightEyeX = avgX(rightEye);
  const eyeMidX = (leftEyeX + rightEyeX) / 2;
  const eyeSpan = Math.abs(rightEyeX - leftEyeX) || 1;

  const gazeOffset = Math.max(0, Math.min(1, Math.abs(noseX - eyeMidX) / eyeSpan / 0.6));

  const earLeft = eyeAspectRatio(leftEye);
  const earRight = eyeAspectRatio(rightEye);
  // Typical open-eye EAR is roughly 0.25-0.35 for face-api's landmark
  // sets; normalize onto a 0..1 "openness" scale for the RNN feature.
  const eyeOpenness = Math.max(0, Math.min(1, ((earLeft + earRight) / 2) / 0.35));

  const eyeContact = gazeOffset < 0.6 && eyeOpenness > 0.25;
  return { eyeContact, gazeOffset, eyeOpenness };
}

function stdDev(values) {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// Tracks how much the gaze has been moving around over the last few
// ticks and returns a 0..1 "jitter" score - the behavioral stand-in for
// nervousness (fidgety, unsettled gaze), independent of any facial
// expression label.
function updateGazeJitter(gazeOffset) {
  const history = emotionState.recentGazeOffsets;
  history.push(gazeOffset);
  if (history.length > 5) history.shift();
  // gazeOffset is 0..1, so its stddev across 5 samples tops out well
  // under 0.5 in practice - scale up so a genuinely jumpy gaze reads
  // close to 1.
  return Math.max(0, Math.min(1, stdDev(history) * 2.2));
}

function computeConfidence(expressions, gazeJitter) {
  const fear = expressions.fearful || 0;
  const confusion = expressions.surprised || 0; // closest available proxy - see comment above
  const nervousness = Math.max(0, Math.min(1, 0.6 * fear + 0.4 * gazeJitter));

  const stressIndex =
    CONFIDENCE_WEIGHTS.fear * fear +
    CONFIDENCE_WEIGHTS.confusion * confusion +
    CONFIDENCE_WEIGHTS.nervousness * nervousness;

  return Math.max(0, Math.min(100, Math.round((1 - stressIndex) * 100)));
}

function computeEngagement(eyeContact, visualConfidence) {
  const eyeComponent = eyeContact ? 100 : 40;
  return Math.round(0.6 * eyeComponent + 0.4 * visualConfidence);
}

function recordEmotionSample({ faceDetected, eyeContact, visualConfidence, engagement }) {
  const batch = emotionState.batch;
  batch.samplesCount += 1;
  if (faceDetected) {
    batch.faceDetectedCount += 1;
    if (eyeContact) batch.eyeContactCount += 1;
    if (typeof visualConfidence === "number") batch.confidenceSum += visualConfidence;
    if (typeof engagement === "number") batch.engagementSum += engagement;
  }
}

function updateConfidenceBadge(faceDetected, visualConfidence) {
  const badge = document.getElementById("emotionBadge");
  if (!badge) return;
  if (!faceDetected) {
    hide(badge);
    return;
  }
  const pct = Math.round(visualConfidence || 0);
  const icon = pct >= 65 ? "🙂" : pct >= 40 ? "😐" : "😟";
  badge.textContent = icon + " Confidence: " + pct + "%";
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

function updateWarningBanners() {
  const eyeBanner = document.getElementById("eyeContactWarningBanner");
  const faceBanner = document.getElementById("faceWarningBanner");

  if (eyeBanner) {
    const show_ = emotionState.consecutiveNoFace < NO_FACE_WARNING_TICKS &&
      emotionState.consecutiveNoEyeContact >= EYE_CONTACT_WARNING_TICKS;
    eyeBanner.style.display = show_ ? "" : "none";
  }

  if (faceBanner) {
    if (emotionState.consecutiveMultiFace >= MULTI_FACE_WARNING_TICKS) {
      faceBanner.textContent = "🚫 Multiple people detected - only the candidate should be visible";
      faceBanner.style.display = "";
    } else if (emotionState.consecutiveNoFace >= NO_FACE_WARNING_TICKS) {
      faceBanner.textContent = "⚠️ Face not detected - please stay in frame";
      faceBanner.style.display = "";
    } else {
      faceBanner.style.display = "none";
    }
  }
}

function bumpProctoringFlagBadge(amount) {
  if (amount <= 0) return;
  emotionState.proctoringFlagTotal += amount;
  const badge = document.getElementById("proctoringFlagBadge");
  if (badge) {
    badge.textContent = "🛡 Proctoring Flags: " + emotionState.proctoringFlagTotal;
    show(badge);
  }
}

async function detectEmotionTick() {
  if (!emotionState.modelsLoaded || emotionState.detecting) return;

  const videoEl = document.getElementById("sessionCameraPreview");
  const canvasEl = document.getElementById("emotionOverlayCanvas");
  if (!videoEl || !deviceState.cameraGranted || videoEl.readyState < 2) return;

  emotionState.detecting = true;
  try {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
    // detectAllFaces (not detectSingleFace) so a second/third person
    // entering frame can be flagged, not just silently ignored.
    const results = await faceapi
      .detectAllFaces(videoEl, options)
      .withFaceLandmarks(true)
      .withFaceExpressions();

    const multipleFaces = results.length > 1;
    emotionState.consecutiveMultiFace = multipleFaces ? emotionState.consecutiveMultiFace + 1 : 0;

    if (results.length === 0) {
      emotionState.consecutiveNoFace += 1;
      emotionState.consecutiveNoEyeContact += 1;
      emotionState.recentGazeOffsets = []; // no face -> stale gaze history isn't meaningful
      recordEmotionSample({ faceDetected: false });
      updateConfidenceBadge(false);
      emotionState.pendingTicks.push({
        face_detected: false, eye_contact: false, eye_openness: 0,
        gaze_offset: 1, expression_valence: 0, multiple_faces: false,
      });
      if (canvasEl) canvasEl.getContext("2d").clearRect(0, 0, canvasEl.width, canvasEl.height);
      updateWarningBanners();
      return;
    }

    emotionState.consecutiveNoFace = 0;
    // Use the largest detected face (closest to camera) as "the candidate".
    const result = results.reduce((a, b) => (a.detection.box.area > b.detection.box.area ? a : b));

    const expressions = result.expressions;
    const { eyeContact, gazeOffset, eyeOpenness } = estimateEyeContact(result);
    const gazeJitter = updateGazeJitter(gazeOffset);
    const visualConfidence = computeConfidence(expressions, gazeJitter);
    const engagement = computeEngagement(eyeContact, visualConfidence);

    emotionState.consecutiveNoEyeContact = eyeContact ? 0 : emotionState.consecutiveNoEyeContact + 1;

    recordEmotionSample({
      faceDetected: true,
      eyeContact,
      visualConfidence,
      engagement,
    });

    emotionState.pendingTicks.push({
      face_detected: true,
      eye_contact: eyeContact,
      eye_openness: eyeOpenness,
      gaze_offset: gazeOffset,
      expression_valence: visualConfidence / 100,
      multiple_faces: multipleFaces,
    });

    drawFaceOverlay(canvasEl, videoEl, result, eyeContact);
    updateConfidenceBadge(true, visualConfidence);
    updateLiveInsightMeters(eyeContact, visualConfidence, engagement);
    updateWarningBanners();
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

// Module 6 - CNN + RNN: ships the small raw per-tick feature vectors
// (never images) collected since the last call to the backend RNN
// stage (app/ml/engagement_engine.py), and applies its response - a
// server-confirmed (consecutive-tick-gated) set of proctoring flags,
// used for the recruiter-facing badge count.
async function postEngagementTicks() {
  if (!state.sessionId || emotionState.pendingTicks.length === 0) return;

  const ticks = emotionState.pendingTicks;
  emotionState.pendingTicks = [];

  try {
    const response = await authFetch("/sessions/" + state.sessionId + "/engagement-ticks", {
      method: "POST",
      body: JSON.stringify({ ticks }),
    });
    if (!response.ok) return;
    const data = await response.json();
    const flags = data.flags || {};
    const flagCount = (flags.eye_contact_missing ? 1 : 0) +
      (flags.no_face_detected ? 1 : 0) +
      (flags.multiple_faces_detected ? 1 : 0);
    bumpProctoringFlagBadge(flagCount);
  } catch (err) {
    console.warn("Could not post engagement ticks:", err);
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
  emotionState.engagementPostIntervalId = setInterval(postEngagementTicks, 7500);
}

function stopEmotionDetectionLoop() {
  if (emotionState.detectIntervalId) {
    clearInterval(emotionState.detectIntervalId);
    emotionState.detectIntervalId = null;
  }
}

function stopEmotionTracking() {
  stopEmotionDetectionLoop();
  if (emotionState.engagementPostIntervalId) {
    clearInterval(emotionState.engagementPostIntervalId);
    emotionState.engagementPostIntervalId = null;
  }
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

    document.getElementById("preflightTitle").textContent = "Let’s get you ready";
    document.getElementById("preflightSubtitle").textContent =
      "Complete the quick setup below before " + (isResume ? "resuming" : "starting") + " your " +
      interview.difficulty + " " + interview.interview_type + " interview on " + interview.domain + ".";

    const beginBtn = document.getElementById("beginInterviewBtn");
    if (beginBtn) beginBtn.textContent = isResume ? "Resume Interview" : "Start Interview";
  } catch (err) {
    console.warn("Could not load interview info:", err);
  }
}

async function beginOrResumeInterview() {
  const beginBtn = document.getElementById("beginInterviewBtn");
  const errorEl = document.getElementById("preflightError");
  if (errorEl) errorEl.textContent = "";

  const consentEl = document.getElementById("consentCheckbox");
  if (consentEl && !consentEl.checked) {
    if (errorEl) errorEl.textContent = "Please confirm the privacy consent checkbox before beginning.";
    return;
  }

  stopPreflightFaceLoop();
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
      updateBeginButtonState();
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
    updateBeginButtonState();
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
