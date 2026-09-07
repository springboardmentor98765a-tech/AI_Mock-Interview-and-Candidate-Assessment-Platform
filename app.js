// ==========================================================================
// AI-Driven Interview Platform - Frontend Client Application
// ==========================================================================

const API_BASE = "http://127.0.0.1:8000";

let state = {
  token: localStorage.getItem("ai_interview_token") || null,
  currentUser: null,
  activeInterview: null,
  activeQuestionIndex: 0,
  isAuthLoginMode: true,

  // Media & Recording state
  mediaStream: null,
  mediaRecorder: null,
  recordedChunks: [],
  devicePermissionGranted: false,
  deviceErrorMsg: null,
  isRecording: false,

  // Timer & Session state
  timerInterval: null,
  totalElapsedSeconds: 0,
  questionElapsedSeconds: 0,
  maxInterviewDurationSeconds: 20 * 60, // 20 minutes default total
  sessionStatus: "Created", // Created, In Progress, Paused, Ended, Completed

  // Real-Time Computer Vision & Behavioral Analysis State
  videoAnalysis: {
    isStreaming: false,
    intervalId: null,
    sessionId: null,
    lastTelemetry: null,
    canvas: null,
    targetVideoId: null
  },
  behaviorStudio: {
    stream: null,
    isStreaming: false,
    sessionId: null,
    intervalId: null,
    timerInterval: null,
    elapsedSeconds: 0,
    framesProcessed: 0
  }
};

// Initialization on DOM load
document.addEventListener("DOMContentLoaded", () => {
  if (state.token) {
    fetchCurrentUser();
  } else {
    updateNavbar();
    navigateTo("landing");
  }
});

// Generic Fetch Wrapper with Auth Header
async function apiFetch(endpoint, options = {}) {
  const headers = options.headers || {};
  if (state.token) {
    headers["Authorization"] = `Bearer ${state.token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err);
    throw err;
  }
}

// Navigation Handler
function navigateTo(viewId) {
  document.querySelectorAll(".view-section").forEach(el => el.classList.remove("active"));
  const target = document.getElementById(`view-${viewId}`);
  if (target) {
    target.classList.add("active");
  }
}

function updateNavbar() {
  const container = document.getElementById("nav-controls");
  const labsBtn = `
    <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; border-color: var(--secondary); color: var(--secondary);" onclick="navigateTo('speech-analysis')">
      🎙️ Speech Lab
    </button>
    <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; border-color: var(--primary); color: var(--primary);" onclick="navigateTo('behavior-studio')">
      👁️ Video Lab
    </button>
    <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; border-color: var(--accent-success); color: var(--accent-success);" onclick="loadAndDisplayAssessment(state.activeInterview ? state.activeInterview.id : 'int_sample_001')">
      📊 AI Assessment
    </button>
  `;
  if (state.currentUser) {
    const roleBadgeClass = `badge-${state.currentUser.role}`;
    container.innerHTML = `
      ${labsBtn}
      <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="routeRoleDashboard()">
        Portal
      </button>
      <span style="font-size: 0.9rem; margin-right: 0.25rem;">
        <strong>${state.currentUser.full_name}</strong>
      </span>
      <span class="badge ${roleBadgeClass}">${state.currentUser.role}</span>
      <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="logout()">Logout</button>
    `;
  } else {
    container.innerHTML = `
      ${labsBtn}
      <button class="btn btn-outline" onclick="showAuthModal('login')">Sign In</button>
      <button class="btn btn-primary" onclick="showAuthModal('register')">Get Started</button>
    `;
  }
}

// Auth Handlers
function showAuthModal(mode = 'login') {
  toggleAuthTab(mode);
  navigateTo("auth");
}

function toggleAuthTab(mode) {
  state.isAuthLoginMode = (mode === 'login');
  const title = document.getElementById("auth-title");
  const subtitle = document.getElementById("auth-subtitle");
  const submitBtn = document.getElementById("auth-submit-btn");
  const nameGroup = document.getElementById("group-name");
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");

  if (state.isAuthLoginMode) {
    title.innerText = "Account Login";
    subtitle.innerText = "Access your personalized AI interview portal";
    submitBtn.innerText = "Sign In to Platform";
    nameGroup.style.display = "none";
    tabLogin.className = "btn btn-full btn-primary";
    tabRegister.className = "btn btn-full btn-outline";
  } else {
    title.innerText = "Create Account";
    subtitle.innerText = "Join the AI-Driven Interview Platform";
    submitBtn.innerText = "Register & Get Started";
    nameGroup.style.display = "block";
    tabLogin.className = "btn btn-full btn-outline";
    tabRegister.className = "btn btn-full btn-primary";
  }
}

async function quickLogin(role) {
  let email = "candidate@example.com";
  if (role === "recruiter") email = "recruiter@example.com";
  if (role === "admin") email = "admin@example.com";

  try {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: "password123" })
    });
    
    state.token = data.access_token;
    localStorage.setItem("ai_interview_token", state.token);
    state.currentUser = data.user;
    updateNavbar();
    routeRoleDashboard();
  } catch (err) {
    alert(`Quick login failed: ${err.message}`);
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const role = document.getElementById("auth-role").value;
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;
  const fullName = document.getElementById("auth-name").value;

  const endpoint = state.isAuthLoginMode ? "/api/auth/login" : "/api/auth/register";
  const payload = state.isAuthLoginMode
    ? { email, password }
    : { email, password, full_name: fullName || email.split('@')[0], role };

  try {
    const data = await apiFetch(endpoint, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    state.token = data.access_token;
    localStorage.setItem("ai_interview_token", state.token);
    state.currentUser = data.user;
    updateNavbar();
    routeRoleDashboard();
  } catch (err) {
    alert(`Authentication Error: ${err.message}`);
  }
}

async function fetchCurrentUser() {
  try {
    const user = await apiFetch("/api/auth/me");
    state.currentUser = user;
    updateNavbar();
    routeRoleDashboard();
  } catch (err) {
    logout();
  }
}

function logout() {
  stopTimer();
  stopMediaTracks();
  state.token = null;
  state.currentUser = null;
  state.activeInterview = null;
  localStorage.removeItem("ai_interview_token");
  updateNavbar();
  navigateTo("landing");
}

function routeRoleDashboard() {
  if (!state.currentUser) return;
  const role = state.currentUser.role;
  if (role === "candidate") {
    navigateTo("candidate");
    document.getElementById("cand-user-badge").innerText = state.currentUser.full_name;
    fetchMyResume();
  } else if (role === "recruiter") {
    navigateTo("recruiter");
    if (state.currentUser.company) {
      document.getElementById("rec-company-badge").innerText = state.currentUser.company;
    }
    loadRecruiterDashboard();
  } else if (role === "admin") {
    navigateTo("admin");
    loadAdminDashboard();
  }
}

// Module 2: Resume Upload & AI Parsing
async function fetchMyResume() {
  try {
    const data = await apiFetch("/api/resume/me");
    if (data.has_resume && data.parsed_data) {
      renderParsedResume(data.parsed_data);
    }
  } catch (err) {
    console.error("Failed to load resume:", err);
  }
}

async function handleResumeUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const dropzone = document.getElementById("resume-dropzone");
  dropzone.innerHTML = `<div class="spinner"></div><p style="margin-top:0.5rem;">Parsing resume with Gemini 2.5 Flash...</p>`;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const data = await apiFetch("/api/resume/upload", {
      method: "POST",
      body: formData
    });
    renderParsedResume(data.resume);
  } catch (err) {
    alert(`Resume Upload Failed: ${err.message}`);
  } finally {
    dropzone.innerHTML = `
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">📥</div>
      <h4 style="margin-bottom: 0.25rem;">Drop PDF Resume Here</h4>
      <p style="font-size: 0.85rem;">or click to browse files (PDF only)</p>
      <input type="file" id="resume-file-input" accept=".pdf" style="display: none;" onchange="handleResumeUpload(event)" />
    `;
  }
}

function renderParsedResume(data) {
  const output = document.getElementById("resume-parsed-output");
  output.style.display = "block";
  document.getElementById("resume-cand-name").innerText = data.name || "Candidate Resume";
  document.getElementById("resume-seniority").innerText = data.seniority_level || "Mid-Level";
  document.getElementById("resume-summary").innerText = data.summary || "Summary extracted successfully.";

  const skillsContainer = document.getElementById("resume-skills-list");
  skillsContainer.innerHTML = (data.skills || [])
    .map(s => `<span class="skill-chip">${s}</span>`)
    .join("");
}

// ==========================================================================
// 2. Webcam & Microphone Permission & Media Handling
// ==========================================================================

async function requestMediaPermissions() {
  state.deviceErrorMsg = null;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    state.mediaStream = stream;
    state.devicePermissionGranted = true;
    bindWebcamVideo();
    return true;
  } catch (err) {
    console.warn("Camera/Microphone media stream request failed:", err);
    state.devicePermissionGranted = false;
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      state.deviceErrorMsg = "Camera & Microphone permission was denied. Please allow camera permissions in browser settings.";
    } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      state.deviceErrorMsg = "No camera or microphone device found. Please connect your webcam.";
    } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
      state.deviceErrorMsg = "Camera or microphone is currently in use by another application.";
    } else {
      state.deviceErrorMsg = `Media Device Error: ${err.message}`;
    }
    updateWebcamUI();
    return false;
  }
}

function bindWebcamVideo() {
  const videoEl = document.getElementById("webcam-preview");
  if (videoEl && state.mediaStream) {
    videoEl.srcObject = state.mediaStream;
    videoEl.play().catch(e => console.log("Video preview play error:", e));
  }
  updateWebcamUI();
}

function updateWebcamUI() {
  const placeholder = document.getElementById("webcam-placeholder-box");
  const videoEl = document.getElementById("webcam-preview");
  const errorAlert = document.getElementById("webcam-error-alert");

  if (state.devicePermissionGranted && state.mediaStream) {
    if (placeholder) placeholder.style.display = "none";
    if (videoEl) videoEl.style.display = "block";
    if (errorAlert) errorAlert.style.display = "none";
  } else {
    if (placeholder) placeholder.style.display = "flex";
    if (videoEl) videoEl.style.display = "none";
    if (errorAlert) {
      errorAlert.style.display = "block";
      errorAlert.innerHTML = `⚠️ ${state.deviceErrorMsg || "Webcam & Mic stream uninitialized. Text mode fallback available."}`;
    }
  }
}

function stopMediaTracks() {
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach(track => track.stop());
    state.mediaStream = null;
  }
  state.isRecording = false;
}

// ==========================================================================
// 3. MediaRecorder API Video & Audio Capture
// ==========================================================================

function startMediaRecording() {
  if (!state.mediaStream) return;
  state.recordedChunks = [];
  state.localVideoUrl = null;

  try {
    let options = {};
    if (typeof MediaRecorder.isTypeSupported === 'function') {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        options = { mimeType: 'video/webm;codecs=vp9,opus' };
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        options = { mimeType: 'video/webm;codecs=vp8,opus' };
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options = { mimeType: 'video/webm' };
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = { mimeType: 'video/mp4' };
      }
    }

    state.mediaRecorder = new MediaRecorder(state.mediaStream, options);

    state.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        state.recordedChunks.push(event.data);
      }
    };

    state.mediaRecorder.start(500); // Generate timeslices every 500ms
    state.isRecording = true;
  } catch (err) {
    console.warn("MediaRecorder start error:", err);
    state.isRecording = false;
  }
}

function pauseMediaRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state === "recording") {
    state.mediaRecorder.pause();
    state.isRecording = false;
  }
}

function resumeMediaRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state === "paused") {
    state.mediaRecorder.resume();
    state.isRecording = true;
  }
}

async function stopAndUploadRecording(interviewId) {
  if (!state.mediaRecorder) return null;
  return new Promise((resolve) => {
    state.mediaRecorder.onstop = async () => {
      state.isRecording = false;
      if (state.recordedChunks.length > 0) {
        const mimeType = state.mediaRecorder.mimeType || 'video/webm';
        const blob = new Blob(state.recordedChunks, { type: mimeType });
        
        // Save local ObjectURL for instant playback & client-side download
        state.localVideoUrl = URL.createObjectURL(blob);

        const formData = new FormData();
        formData.append("file", blob, `interview_${interviewId}.webm`);
        formData.append("media_type", "video");

        try {
          const result = await apiFetch(`/api/interview/${interviewId}/upload_recording`, {
            method: "POST",
            body: formData
          });
          resolve(result);
        } catch (err) {
          console.error("Failed to upload recording blob to backend:", err);
          resolve(null);
        }
      } else {
        resolve(null);
      }
    };

    if (state.mediaRecorder.state !== "inactive") {
      try {
        if (typeof state.mediaRecorder.requestData === 'function') {
          state.mediaRecorder.requestData();
        }
      } catch(e) {}
      state.mediaRecorder.stop();
    } else {
      resolve(null);
    }
  });
}

// ==========================================================================
// 4. Timer-Based Workflow Engine
// ==========================================================================

function startTimer() {
  stopTimer();
  state.timerInterval = setInterval(() => {
    if (state.sessionStatus === "In Progress") {
      state.totalElapsedSeconds++;
      state.questionElapsedSeconds++;
      updateTimerDisplay();
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function updateTimerDisplay() {
  const elTotal = document.getElementById("timer-total");
  const elQuestion = document.getElementById("timer-question");
  const elRemaining = document.getElementById("timer-remaining");

  if (elTotal) elTotal.innerText = formatTimeHHMMSS(state.totalElapsedSeconds);
  if (elQuestion) elQuestion.innerText = formatTimeMMSS(state.questionElapsedSeconds);

  if (elRemaining) {
    const rem = Math.max(0, state.maxInterviewDurationSeconds - state.totalElapsedSeconds);
    elRemaining.innerText = formatTimeMMSS(rem);
    if (rem < 180) {
      elRemaining.className = "timer-value danger";
    } else if (rem < 300) {
      elRemaining.className = "timer-value warning";
    } else {
      elRemaining.className = "timer-value";
    }
  }
}

function formatTimeHHMMSS(sec) {
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatTimeMMSS(sec) {
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ==========================================================================
// 1. Session Lifecycle Handlers
// ==========================================================================

async function handleStartInterview(event) {
  event.preventDefault();
  const domain = document.getElementById("int-domain").value;
  const difficulty = document.getElementById("int-difficulty").value;
  const type = document.getElementById("int-type").value;
  const count = parseInt(document.getElementById("int-count").value);

  const container = document.getElementById("candidate-interview-section");
  container.innerHTML = `
    <div class="glass-card" style="text-align: center; padding: 3rem;">
      <div class="spinner" style="width:40px; height:40px;"></div>
      <h3 style="margin-top: 1rem;">Generating Dynamic Questions with Gemini 2.5 Flash...</h3>
      <p>Customizing interview prompt based on your skills and domain level</p>
    </div>
  `;

  try {
    const data = await apiFetch("/api/interview/create", {
      method: "POST",
      body: JSON.stringify({ domain, difficulty, type, question_count: count })
    });

    state.activeInterview = data.interview;
    state.activeQuestionIndex = 0;
    state.totalElapsedSeconds = 0;
    state.questionElapsedSeconds = 0;
    state.sessionStatus = "Created";

    renderActiveInterview();
    // Attempt requesting media device permissions and auto-starting session timer & camera
    await requestMediaPermissions();
    await handleStartSession();
  } catch (err) {
    alert(`Failed to start interview: ${err.message}`);
    container.innerHTML = "";
  }
}

async function handleStartSession() {
  if (!state.activeInterview) return;
  try {
    await apiFetch(`/api/interview/${state.activeInterview.id}/session/start`, {
      method: "POST"
    });
    state.sessionStatus = "In Progress";

    // Ensure camera/mic active
    if (!state.mediaStream) {
      await requestMediaPermissions();
    }

    startMediaRecording();
    startTimer();
    renderActiveInterview();

    // Initialize & Start AI Video Behavioral Analysis Stream
    try {
      await apiFetch("/api/interview-analysis/start", {
        method: "POST",
        body: JSON.stringify({
          session_id: state.activeInterview.id,
          candidate_name: state.currentUser?.full_name || "Candidate"
        })
      });
    } catch (visErr) {
      console.warn("Vision analyzer init notice:", visErr);
    }
    startVideoAnalysisStream(state.activeInterview.id, "webcam-preview");
  } catch (err) {
    alert(`Failed to start interview session: ${err.message}`);
  }
}

async function handlePauseSession() {
  if (!state.activeInterview) return;
  try {
    await apiFetch(`/api/interview/${state.activeInterview.id}/session/pause`, {
      method: "POST"
    });
    state.sessionStatus = "Paused";
    pauseMediaRecording();
    pauseVideoAnalysisStream();
    renderActiveInterview();
  } catch (err) {
    alert(`Failed to pause session: ${err.message}`);
  }
}

async function handleResumeSession() {
  if (!state.activeInterview) return;
  try {
    await apiFetch(`/api/interview/${state.activeInterview.id}/session/resume`, {
      method: "POST"
    });
    state.sessionStatus = "In Progress";
    resumeMediaRecording();
    resumeVideoAnalysisStream(state.activeInterview.id, "webcam-preview");
    renderActiveInterview();
  } catch (err) {
    alert(`Failed to resume session: ${err.message}`);
  }
}

async function handleEndSession() {
  if (!state.activeInterview) return;
  const container = document.getElementById("candidate-interview-section");
  container.innerHTML = `
    <div class="glass-card" style="text-align: center; padding: 3rem;">
      <div class="spinner" style="width:40px; height:40px;"></div>
      <h3 style="margin-top: 1rem;">Finalizing Session & Uploading Recording...</h3>
      <p>Saving candidate audio/video stream and computing session metrics</p>
    </div>
  `;

  try {
    stopTimer();
    stopVideoAnalysisStream();

    // Finalize video analysis session
    try {
      await apiFetch("/api/interview-analysis/stop", {
        method: "POST",
        body: JSON.stringify({ session_id: state.activeInterview.id })
      });
    } catch (visStopErr) {
      console.warn("Vision analyzer stop notice:", visStopErr);
    }

    await stopAndUploadRecording(state.activeInterview.id);
    stopMediaTracks();

    await apiFetch(`/api/interview/${state.activeInterview.id}/session/end`, {
      method: "POST",
      body: JSON.stringify({ total_duration: state.totalElapsedSeconds })
    });

    state.sessionStatus = "Ended";
    await handleFinalizeInterview();
  } catch (err) {
    alert(`Error ending session: ${err.message}`);
  }
}

function renderActiveInterview() {
  const container = document.getElementById("candidate-interview-section");
  const interview = state.activeInterview;
  if (!interview || !interview.questions.length) return;

  const currentQ = interview.questions[state.activeQuestionIndex];
  const totalQ = interview.questions.length;
  const progressPct = ((state.activeQuestionIndex + 1) / totalQ) * 100;
  const existingEval = currentQ.evaluation;

  const answeredCount = interview.questions.filter(q => q.user_answer).length;

  container.innerHTML = `
    <!-- Timer Dashboard Bar -->
    <div class="timer-dashboard">
      <div class="timer-box">
        <div class="timer-label">Total Duration</div>
        <div class="timer-value" id="timer-total">${formatTimeHHMMSS(state.totalElapsedSeconds)}</div>
      </div>
      <div class="timer-box">
        <div class="timer-label">Current Question</div>
        <div class="timer-value" id="timer-question">${formatTimeMMSS(state.questionElapsedSeconds)}</div>
      </div>
      <div class="timer-box">
        <div class="timer-label">Remaining Time</div>
        <div class="timer-value" id="timer-remaining">${formatTimeMMSS(Math.max(0, state.maxInterviewDurationSeconds - state.totalElapsedSeconds))}</div>
      </div>
      <div class="timer-box">
        <div class="timer-label">Completed</div>
        <div class="timer-value" style="color: var(--accent-success);">${answeredCount} / ${totalQ}</div>
      </div>
    </div>

    <!-- Main Interview Interactive Layout Grid -->
    <div class="interview-grid">

      <!-- Left Column: Question & Answer Workspace -->
      <div class="glass-card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <span class="badge badge-candidate">${interview.domain} (${interview.difficulty})</span>
          <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">
            Session Status: <strong style="color: var(--secondary);">${state.sessionStatus}</strong>
          </span>
          <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">Question ${state.activeQuestionIndex + 1} of ${totalQ}</span>
        </div>

        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width: ${progressPct}%;"></div>
        </div>

        <div class="question-box">
          <span style="font-size: 0.8rem; text-transform: uppercase; color: var(--secondary); font-weight: 600;">Category: ${currentQ.category || 'Technical'}</span>
          <h3 style="margin-top: 0.5rem; line-height: 1.4;">${currentQ.question}</h3>
        </div>

        <form onsubmit="handleAnswerSubmit(event, ${currentQ.id})">
          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label style="margin-bottom: 0;">Your Answer / Solution Outline</label>
              <button type="button" class="btn btn-outline" style="font-size: 0.75rem; padding: 0.2rem 0.6rem; border-color: var(--secondary); color: var(--secondary);" onclick="toggleCandidateVoiceDictation()">
                <span id="cand-dictate-btn-text">🎙️ Dictate with Mic</span>
              </button>
            </div>
            <textarea id="cand-answer-input" class="form-control" rows="5" placeholder="Type your response or use voice dictation..." ${state.sessionStatus === 'Paused' ? 'disabled' : ''} required>${currentQ.user_answer || ''}</textarea>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; flex-wrap: wrap; gap: 0.75rem;">
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button type="submit" id="btn-submit-answer" class="btn btn-primary" ${state.sessionStatus === 'Paused' ? 'disabled' : ''}>
                ⚡ Evaluate Answer with AI
              </button>
              <button type="button" class="btn btn-outline" style="border-color: var(--secondary); color: var(--secondary);" onclick="analyzeCandidateAnswerSpeech()" ${state.sessionStatus === 'Paused' ? 'disabled' : ''}>
                📊 Speech & Pace Metrics
              </button>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              ${state.activeQuestionIndex > 0 ? `<button type="button" class="btn btn-outline" onclick="handlePrevQuestion()">⏮️ Prev</button>` : ''}
              ${state.activeQuestionIndex === totalQ - 1 
                ? `<button type="button" class="btn btn-secondary" onclick="handleEndSession()">Finish & View Report 📊</button>`
                : `<button type="button" class="btn btn-outline" onclick="handleNextQuestion()">Next Question ➔</button>`
              }
            </div>
          </div>
        </form>

        <div id="evaluation-output-container">
          ${existingEval ? renderEvaluationBox(existingEval) : ''}
        </div>
      </div>

      <!-- Right Column: Live Webcam Preview & Session Action Controls -->
      <div>
        <div class="glass-card" style="margin-bottom: 1.5rem;">
          <h4 style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
            <span>📹 Live Candidate Camera</span>
            ${state.isRecording ? `<span class="rec-badge"><span class="rec-dot"></span> REC</span>` : (state.sessionStatus === 'Paused' ? `<span class="paused-badge">PAUSED</span>` : `<span class="badge badge-candidate">LIVE</span>`)}
          </h4>

          <div class="webcam-container">
            <video id="webcam-preview" class="webcam-video" autoplay muted playsinline style="${state.devicePermissionGranted ? 'display:block;' : 'display:none;'}"></video>
            
            <div id="webcam-placeholder-box" class="webcam-placeholder" style="${state.devicePermissionGranted ? 'display:none;' : 'display:flex;'}">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📷</div>
              <h4 style="margin-bottom: 0.25rem;">Camera Preview</h4>
              <p style="font-size: 0.8rem; margin-bottom: 1rem; color: var(--text-muted);">
                ${state.deviceErrorMsg || 'Requesting browser permission for camera and microphone...'}
              </p>
              <button class="btn btn-outline" style="font-size: 0.8rem;" onclick="requestMediaPermissions()">
                🎙️ Grant Camera/Mic Permission
              </button>
            </div>
          </div>

          <!-- Live Real-Time Computer Vision & Behavioral HUD -->
          <div class="live-hud-container" id="interview-live-hud" style="margin-top: 1rem;">
            <div class="hud-header">
              <span style="font-size: 0.8rem; font-weight: 700; color: var(--secondary); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.4rem;">
                <span class="pulse-dot"></span> Live Interview Analysis
              </span>
              <span id="live-face-status" class="badge badge-outline" style="font-size: 0.72rem;">Awaiting Stream</span>
            </div>

            <div class="hud-grid">
              <div class="hud-metric-box">
                <div class="hud-metric-title">CNN Emotion</div>
                <div class="hud-metric-val">
                  <span id="live-emotion-label" style="color: var(--primary); font-size: 0.95rem;">Analyzing...</span>
                  <span id="live-emotion-conf" style="font-size: 0.75rem; color: var(--text-muted);"></span>
                </div>
              </div>

              <div class="hud-metric-box">
                <div class="hud-metric-title">Eye Gaze</div>
                <div class="hud-metric-val">
                  <span id="live-gaze-dir" style="font-size: 0.85rem; color: var(--text-main);">Looking at Camera</span>
                </div>
                <span id="live-eyes-closed-warning" style="display:none; color:var(--accent-danger); font-size:0.7rem; font-weight:600;">⚠️ Closed</span>
              </div>

              <div class="hud-metric-box">
                <div class="hud-metric-title">Eye Contact</div>
                <div class="hud-metric-val">
                  <span id="live-eye-contact-pct" style="color: var(--accent-success);">0%</span>
                  <span id="live-eye-contact-level" class="badge badge-success" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">High</span>
                </div>
              </div>

              <div class="hud-metric-box">
                <div class="hud-metric-title">Head Pose</div>
                <div class="hud-metric-val">
                  <span id="live-head-dir" style="font-size: 0.85rem; color: var(--text-main);">Forward</span>
                </div>
              </div>

              <div class="hud-metric-box">
                <div class="hud-metric-title">Attention</div>
                <div class="hud-metric-val">
                  <span id="live-attention-score" style="color: var(--secondary);">0%</span>
                  <span id="live-attention-level" class="badge badge-candidate" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">Low</span>
                </div>
              </div>

              <div class="hud-metric-box">
                <div class="hud-metric-title">Engagement</div>
                <div class="hud-metric-val">
                  <span id="live-engagement-score" style="color: var(--primary);">0%</span>
                  <span id="live-engagement-level" class="badge badge-candidate" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">Low</span>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.06); font-size: 0.75rem;">
              <span>Confidence Indicators: <strong id="live-confidence-level" style="color: var(--secondary);">Moderate</strong></span>
              <span>Facial Activity: <strong id="live-facial-activity">30</strong></span>
            </div>
          </div>

          <div id="webcam-error-alert" style="margin-top: 0.75rem; font-size: 0.8rem; color: var(--accent-warning); ${state.deviceErrorMsg ? 'display:block;' : 'display:none;'}">
            ⚠️ ${state.deviceErrorMsg || ''}
          </div>
        </div>

        <!-- Session Controls Card -->
        <div class="glass-card">
          <h4 style="margin-bottom: 0.75rem;">⚡ Session Control Panel</h4>
          <p style="font-size: 0.85rem; margin-bottom: 1rem;">Manage active interview session state and recording stream</p>
          
          <div class="session-controls">
            ${state.sessionStatus === 'Created' 
              ? `<button class="btn btn-primary btn-full" onclick="handleStartSession()">▶️ Start Interview Session</button>`
              : ''
            }

            ${state.sessionStatus === 'In Progress' 
              ? `<button class="btn btn-outline btn-full" style="border-color: var(--accent-warning); color: var(--accent-warning);" onclick="handlePauseSession()">⏸️ Pause Session</button>`
              : ''
            }

            ${state.sessionStatus === 'Paused' 
              ? `<button class="btn btn-primary btn-full" onclick="handleResumeSession()">▶️ Resume Session</button>`
              : ''
            }

            ${(state.sessionStatus === 'In Progress' || state.sessionStatus === 'Paused') 
              ? `<button class="btn btn-outline btn-full" style="border-color: var(--accent-danger); color: var(--accent-danger); margin-top: 0.5rem;" onclick="handleEndSession()">🛑 End Interview Session</button>`
              : ''
            }
          </div>
        </div>
      </div>

    </div>
  `;

  // Bind media stream if available
  bindWebcamVideo();
}

async function handleAnswerSubmit(event, questionId) {
  event.preventDefault();
  const answer = document.getElementById("cand-answer-input").value;
  const evalContainer = document.getElementById("evaluation-output-container");
  const submitBtn = document.getElementById("btn-submit-answer");

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<div class="spinner"></div> Evaluating...`;

  try {
    const data = await apiFetch(`/api/interview/${state.activeInterview.id}/answer`, {
      method: "POST",
      body: JSON.stringify({ 
        question_id: questionId, 
        candidate_answer: answer,
        time_spent: state.questionElapsedSeconds
      })
    });

    const currentQ = state.activeInterview.questions[state.activeQuestionIndex];
    currentQ.user_answer = answer;
    currentQ.evaluation = data.evaluation;

    evalContainer.innerHTML = renderEvaluationBox(data.evaluation);
  } catch (err) {
    alert(`Evaluation Error: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `⚡ Re-Evaluate Answer`;
  }
}

function renderEvaluationBox(evalData) {
  const missingHtml = (evalData.missing_points || [])
    .map(p => `<li>${p}</li>`)
    .join("");

  return `
    <div class="evaluation-box">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h4 style="color: var(--accent-success);">AI Real-Time Feedback</h4>
        <span class="badge badge-success" style="font-size: 1rem;">Score: ${evalData.score} / 10</span>
      </div>
      <p style="font-size: 0.95rem; margin-bottom: 1rem; color: var(--text-main);">${evalData.feedback}</p>
      
      ${missingHtml ? `
        <div style="font-size: 0.85rem; color: var(--text-muted);">
          <strong>Key Points to Enhance:</strong>
          <ul style="padding-left: 1.25rem; margin-top: 0.35rem;">${missingHtml}</ul>
        </div>
      ` : ''}
    </div>
  `;
}

let candidateSpeechDictationRecog = null;

function toggleCandidateVoiceDictation() {
  const btnText = document.getElementById("cand-dictate-btn-text");
  const textarea = document.getElementById("cand-answer-input");
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech recognition is not supported in this browser. Please use Google Chrome or Edge.");
    return;
  }

  if (candidateSpeechDictationRecog) {
    try { candidateSpeechDictationRecog.stop(); } catch(e) {}
    candidateSpeechDictationRecog = null;
    if (btnText) btnText.innerText = "🎙️ Dictate with Mic";
    return;
  }

  try {
    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-US';

    let initialText = textarea ? textarea.value : "";
    if (initialText && !initialText.endsWith(" ")) initialText += " ";

    recog.onresult = (e) => {
      let speechSoFar = '';
      for (let i = 0; i < e.results.length; ++i) {
        speechSoFar += e.results[i][0].transcript;
        if (e.results[i].isFinal) speechSoFar += " ";
      }
      if (textarea) {
        textarea.value = initialText + speechSoFar;
      }
    };

    recog.onstart = () => {
      if (btnText) btnText.innerText = "🛑 Stop Dictation";
    };

    recog.onend = () => {
      if (btnText) btnText.innerText = "🎙️ Dictate with Mic";
      candidateSpeechDictationRecog = null;
    };

    recog.onerror = (err) => {
      console.warn("Candidate dictation notice:", err.error);
      if (btnText) btnText.innerText = "🎙️ Dictate with Mic";
      candidateSpeechDictationRecog = null;
    };

    recog.start();
    candidateSpeechDictationRecog = recog;
  } catch (err) {
    alert(`Voice dictation error: ${err.message}`);
  }
}

async function analyzeCandidateAnswerSpeech() {
  const textarea = document.getElementById("cand-answer-input");
  const evalContainer = document.getElementById("evaluation-output-container");
  const text = (textarea ? textarea.value : "").trim();

  if (!text) {
    alert("Please enter or dictate an answer first to analyze communication quality.");
    return;
  }

  const duration = Math.max(5, state.questionElapsedSeconds || 30);
  if (evalContainer) {
    evalContainer.innerHTML = `
      <div class="glass-card" style="text-align: center; padding: 1.5rem; margin-top: 1rem;">
        <div class="spinner"></div>
        <p style="margin-top: 0.5rem;">Analyzing speech pace, grammar, and filler words...</p>
      </div>
    `;
  }

  try {
    const data = await apiFetch("/api/speech/text-analyze", {
      method: "POST",
      body: JSON.stringify({
        transcript: text,
        audio_duration: duration
      })
    });

    const comm = data.communication || {};
    const pace = data.pace || {};
    const fillers = data.fillers || {};
    const grammar = data.grammar || {};

    if (evalContainer) {
      evalContainer.innerHTML = `
        <div class="evaluation-box" style="margin-top: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <h4 style="color: var(--secondary);">📊 Answer Communication Analysis</h4>
            <span class="badge badge-success" style="font-size: 0.95rem;">Comm Score: ${comm.overall_score || 85}%</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.5rem; margin-bottom: 1rem; text-align: center;">
            <div class="metric-cell"><span class="label">Pace</span><span class="val">${pace.wpm} WPM</span></div>
            <div class="metric-cell"><span class="label">Pace Status</span><span class="val" style="font-size:0.95rem;">${pace.category}</span></div>
            <div class="metric-cell"><span class="label">Fillers</span><span class="val">${fillers.total} (${fillers.rate}%)</span></div>
            <div class="metric-cell"><span class="label">Grammar</span><span class="val">${grammar.score}%</span></div>
          </div>

          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">
            💡 <strong>Pace Recommendation:</strong> ${pace.recommendation}
          </p>

          ${fillers.total > 0 ? `
            <div style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--accent-warning);">
              🗣️ <strong>Highlighted Fillers:</strong> ${fillers.highlighted_transcript}
            </div>
          ` : ''}

          <div style="margin-top: 1rem; text-align: right;">
            <button class="btn btn-outline" style="font-size: 0.8rem; padding: 0.25rem 0.6rem;" onclick="navigateTo('speech-analysis')">
              Open Full Speech Lab ➔
            </button>
          </div>
        </div>
      `;
    }
  } catch (err) {
    if (evalContainer) {
      evalContainer.innerHTML = `<div class="alert-box error" style="margin-top: 1rem;">❌ ${err.message}</div>`;
    }
  }
}

function handleNextQuestion() {
  if (state.activeQuestionIndex < state.activeInterview.questions.length - 1) {
    state.activeQuestionIndex++;
    state.questionElapsedSeconds = 0;
    renderActiveInterview();
  }
}

function handlePrevQuestion() {
  if (state.activeQuestionIndex > 0) {
    state.activeQuestionIndex--;
    state.questionElapsedSeconds = 0;
    renderActiveInterview();
  }
}

async function handleFinalizeInterview() {
  if (!state.activeInterview) return;
  const interviewId = state.activeInterview.id;

  try {
    await apiFetch(`/api/interview/${interviewId}/finalize`, {
      method: "POST",
      body: JSON.stringify({ total_duration: state.totalElapsedSeconds })
    });
    
    // Automatically transition to the dynamic AI Assessment Results page
    await loadAndDisplayAssessment(interviewId);
  } catch (err) {
    alert(`Failed to finalize interview: ${err.message}`);
  }
}

// Module 5: Performance Analytics & Session Storage Viewer
function renderFullReport(report, targetContainer, extraSessionData = {}, behaviorReport = null) {
  const catScores = report.category_scores || {};
  
  const metricBarsHtml = Object.entries(catScores).map(([cat, val]) => `
    <div class="metric-row">
      <div class="metric-header">
        <span>${cat}</span>
        <span>${val}%</span>
      </div>
      <div class="metric-bar">
        <div class="metric-fill" style="width: ${val}%;"></div>
      </div>
    </div>
  `).join("");

  const strengthsHtml = (report.strengths || []).map(s => `<li>${s}</li>`).join("");
  const weaknessesHtml = (report.weaknesses || []).map(w => `<li>${w}</li>`).join("");
  const roadmapHtml = (report.ai_growth_roadmap || []).map(r => `<li>${r}</li>`).join("");

  const videoRef = extraSessionData.video_recording_ref;
  const audioRef = extraSessionData.audio_recording_ref;

  const videoPlaybackSrc = state.localVideoUrl || (videoRef ? `${API_BASE}${videoRef}` : null);
  const videoDownloadUrl = videoRef ? `${API_BASE}${videoRef}?download=true` : state.localVideoUrl;

  targetContainer.innerHTML = `
    <div class="glass-card" style="max-width: 850px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2>🏆 Performance Analytics Report</h2>
          <p>AI Evaluation Benchmark, Speech & Vision Behavioral Metrics</p>
        </div>
        <div style="text-align: right;">
          <span class="badge badge-success" style="font-size: 1.2rem; padding: 0.5rem 1rem;">
            Score: ${report.overall_score}% (${report.recommendation})
          </span>
        </div>
      </div>

      <!-- Stored Session Metadata Card -->
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 1rem 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
        <h4 style="margin-bottom: 0.75rem; color: var(--secondary);">📌 Stored Session Record</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; font-size: 0.85rem;">
          <div><strong>Candidate ID:</strong> <code>${extraSessionData.candidate_id || state.currentUser?.id || 'N/A'}</code></div>
          <div><strong>Interview ID:</strong> <code>${extraSessionData.interview_id || 'N/A'}</code></div>
          <div><strong>Session ID:</strong> <code>${extraSessionData.session_id || 'sess_active'}</code></div>
          <div><strong>Status:</strong> <span class="badge badge-success">${extraSessionData.status || 'Completed'}</span></div>
          <div><strong>Total Duration:</strong> ${formatTimeHHMMSS(extraSessionData.duration_seconds || state.totalElapsedSeconds)}</div>
          <div><strong>Questions Attempted:</strong> ${extraSessionData.questions_attempted || 'All'}</div>
        </div>
      </div>

      <!-- AI Video, Emotion & Eye Tracking Behavioral Vision Report -->
      ${behaviorReport ? `
        <div class="behavior-report-card" style="margin-bottom: 2rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h3 style="color: var(--secondary); margin-bottom: 0.25rem;">👁️ AI Video, Emotion & Eye Tracking Report</h3>
              <p style="font-size: 0.82rem; color: var(--text-muted);">Measured continuously from ${behaviorReport.total_frames_analyzed || 0} candidate video frames (${behaviorReport.face_presence_percentage}% face presence)</p>
            </div>
            <span class="badge badge-success" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">
              Overall: ${behaviorReport.overall_observable_indicators}
            </span>
          </div>

          <!-- Behavioral Metrics Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div class="telemetry-card">
              <div class="telemetry-label">Interview Duration</div>
              <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary); margin-top: 0.25rem;">
                ${behaviorReport.interview_duration}
              </div>
            </div>

            <div class="telemetry-card">
              <div class="telemetry-label">Eye Contact</div>
              <div style="font-size: 1.3rem; font-weight: 700; color: var(--accent-success); margin-top: 0.25rem; display: flex; align-items: baseline; gap: 0.35rem;">
                ${behaviorReport.eye_contact?.percentage}%
                <span class="badge badge-success" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">${behaviorReport.eye_contact?.level}</span>
              </div>
            </div>

            <div class="telemetry-card">
              <div class="telemetry-label">Attention Score</div>
              <div style="font-size: 1.3rem; font-weight: 700; color: var(--secondary); margin-top: 0.25rem; display: flex; align-items: baseline; gap: 0.35rem;">
                ${behaviorReport.attention?.score}%
                <span class="badge badge-candidate" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">${behaviorReport.attention?.level}</span>
              </div>
            </div>

            <div class="telemetry-card">
              <div class="telemetry-label">Engagement Score</div>
              <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary); margin-top: 0.25rem; display: flex; align-items: baseline; gap: 0.35rem;">
                ${behaviorReport.engagement?.score}%
                <span class="badge badge-candidate" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">${behaviorReport.engagement?.level}</span>
              </div>
            </div>

            <div class="telemetry-card">
              <div class="telemetry-label">Head Stability</div>
              <div style="font-size: 1.3rem; font-weight: 700; color: var(--text-main); margin-top: 0.25rem;">
                ${behaviorReport.head_stability_percentage}%
              </div>
            </div>

            <div class="telemetry-card">
              <div class="telemetry-label">Confidence Indicators</div>
              <div style="font-size: 1.15rem; font-weight: 700; color: var(--secondary); margin-top: 0.25rem;">
                ${behaviorReport.confidence_indicators?.level} (${behaviorReport.confidence_indicators?.score}%)
              </div>
            </div>
          </div>

          <!-- Emotion Distribution & Gaze Breakdown -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
            
            <div style="background: rgba(0,0,0,0.25); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <h4 style="margin-bottom: 0.75rem; color: var(--text-main); font-size: 0.95rem;">🎭 CNN Emotion Estimates Distribution</h4>
              <div class="dist-bar-wrapper">
                <div class="dist-bar-header">
                  <span>Nervous</span>
                  <strong>${behaviorReport.emotion_estimates?.Nervous || 0}%</strong>
                </div>
                <div class="dist-bar-bg"><div class="dist-bar-fill dist-bar-nervous" style="width: ${behaviorReport.emotion_estimates?.Nervous || 0}%;"></div></div>
              </div>
              <div class="dist-bar-wrapper">
                <div class="dist-bar-header">
                  <span>Scared</span>
                  <strong>${behaviorReport.emotion_estimates?.Scared || 0}%</strong>
                </div>
                <div class="dist-bar-bg"><div class="dist-bar-fill dist-bar-scared" style="width: ${behaviorReport.emotion_estimates?.Scared || 0}%;"></div></div>
              </div>
              <div class="dist-bar-wrapper">
                <div class="dist-bar-header">
                  <span>Confused</span>
                  <strong>${behaviorReport.emotion_estimates?.Confused || 0}%</strong>
                </div>
                <div class="dist-bar-bg"><div class="dist-bar-fill dist-bar-confused" style="width: ${behaviorReport.emotion_estimates?.Confused || 0}%;"></div></div>
              </div>
              <p style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.5rem;">
                ℹ️ Observable facial expression model estimates.
              </p>
            </div>

            <div style="background: rgba(0,0,0,0.25); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <h4 style="margin-bottom: 0.75rem; color: var(--text-main); font-size: 0.95rem;">👁️ Eye Gaze & Posture Distribution</h4>
              <div style="display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.85rem;">
                <div style="display: flex; justify-content: space-between;">
                  <span>Camera Eye Contact:</span>
                  <strong style="color: var(--accent-success);">${behaviorReport.gaze_distribution?.camera || 0}%</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>Looking Left:</span>
                  <strong>${behaviorReport.gaze_distribution?.left || 0}%</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>Looking Right:</span>
                  <strong>${behaviorReport.gaze_distribution?.right || 0}%</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>Looking Down:</span>
                  <strong>${behaviorReport.gaze_distribution?.down || 0}%</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>Eyes Closed:</span>
                  <strong>${behaviorReport.gaze_distribution?.eyes_closed || 0}%</strong>
                </div>
              </div>
            </div>

          </div>

          <!-- Data-Driven Areas to Improve -->
          <div style="background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.25); padding: 1.25rem; border-radius: var(--radius-md);">
            <h4 style="color: var(--secondary); margin-bottom: 0.5rem; font-size: 0.95rem;">🎯 Vision & Behavioral Growth Feedback</h4>
            <ul style="font-size: 0.88rem; padding-left: 1.2rem; margin: 0; color: var(--text-main);">
              ${(behaviorReport.areas_to_improve || []).map(a => `<li style="margin-bottom: 0.35rem;">${a}</li>`).join("")}
            </ul>
          </div>
        </div>
      ` : ''}

      <!-- Recording Playback & Video Download Container -->
      ${(videoPlaybackSrc || audioRef) ? `
        <div class="media-player-box" style="margin-bottom: 1.5rem;">
          <h4 style="margin-bottom: 0.35rem; color: var(--primary); display: flex; justify-content: space-between; align-items: center;">
            <span>🎥 Candidate Video Recording Playback</span>
            <span class="badge badge-success">Recorded Stream</span>
          </h4>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
            Watch candidate's recorded interview stream or download the video file (.webm) to your device.
          </p>

          ${videoPlaybackSrc ? `
            <video controls playsinline preload="auto" style="width: 100%; border-radius: var(--radius-sm); max-height: 400px; background: #000; display: block;">
              <source src="${videoPlaybackSrc}" type="video/webm">
              <source src="${videoPlaybackSrc}" type="video/mp4">
              Your browser does not support the video playback tag.
            </video>
            
            <div style="margin-top: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
              ${videoDownloadUrl ? `
                <a href="${videoDownloadUrl}" download="interview_${extraSessionData.interview_id || 'recording'}.webm" target="_blank" class="btn btn-primary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;">
                  📥 Download Video Recording (.webm)
                </a>
              ` : ''}
              ${videoRef ? `
                <a href="${API_BASE}${videoRef}" target="_blank" class="btn btn-outline" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.85rem;">
                  🔗 Direct Stream Link
                </a>
              ` : ''}
            </div>
          ` : `
            <audio controls preload="auto" style="width: 100%; margin-top: 0.5rem;">
              <source src="${API_BASE}${audioRef}" type="audio/webm">
              Your browser does not support the audio tag.
            </audio>
          `}
        </div>
      ` : ''}

      <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 2rem;">
        <h4 style="margin-bottom: 0.5rem; color: var(--secondary);">Executive AI Summary</h4>
        <p style="font-size: 0.95rem;">${report.summary}</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
        <div>
          <h4 style="margin-bottom: 1rem;">Domain Mastery Metrics</h4>
          ${metricBarsHtml}
        </div>

        <div>
          <h4 style="margin-bottom: 0.75rem; color: var(--accent-success);">Key Strengths</h4>
          <ul style="font-size: 0.9rem; padding-left: 1.2rem; margin-bottom: 1.25rem; color: var(--text-muted);">${strengthsHtml}</ul>

          <h4 style="margin-bottom: 0.75rem; color: var(--accent-warning);">Areas for Growth</h4>
          <ul style="font-size: 0.9rem; padding-left: 1.2rem; color: var(--text-muted);">${weaknessesHtml}</ul>
        </div>
      </div>

      <div style="background: var(--primary-light); border: 1px solid rgba(99,102,241,0.3); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
        <h4 style="color: var(--primary); margin-bottom: 0.5rem;">🚀 AI Growth Roadmap</h4>
        <ul style="font-size: 0.9rem; padding-left: 1.2rem;">${roadmapHtml}</ul>
      </div>

      <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem; flex-wrap: wrap;">
        <button class="btn btn-primary" style="flex: 1;" onclick="loadAndDisplayAssessment('${extraSessionData.interview_id || 'int_sample_001'}')">
          ⚡ View AI Feedback & Scoring Assessment
        </button>
        <button class="btn btn-outline" style="flex: 1;" onclick="routeRoleDashboard()">
          Back to Candidate Dashboard
        </button>
      </div>
    </div>
  `;
}

// Recruiter Dashboard Loader
async function loadRecruiterDashboard() {
  try {
    const data = await apiFetch("/api/analytics/recruiter");
    document.getElementById("rec-stat-total").innerText = data.stats.total_candidates;
    document.getElementById("rec-stat-completed").innerText = data.stats.assessments_completed;
    document.getElementById("rec-stat-avg").innerText = `${data.stats.average_score}%`;

    const tbody = document.getElementById("rec-candidates-tbody");
    tbody.innerHTML = data.candidates.map(c => `
      <tr>
        <td>
          <strong>${c.name}</strong>
          <div style="font-size: 0.8rem; color: var(--text-dim);">${c.email}</div>
        </td>
        <td>
          ${c.skills.slice(0, 4).map(s => `<span class="skill-chip" style="font-size:0.75rem;">${s}</span>`).join('')}
        </td>
        <td>
          <strong>${c.latest_score ? c.latest_score + '%' : 'N/A'}</strong>
        </td>
        <td>
          <span class="badge ${c.recommendation.includes('Hire') ? 'badge-success' : 'badge-admin'}">${c.recommendation}</span>
        </td>
        <td>
          ${c.latest_interview_id 
            ? `<div style="display: flex; gap: 0.4rem;">
                <button class="btn btn-primary" style="font-size: 0.75rem; padding: 0.25rem 0.55rem;" onclick="loadAndDisplayAssessment('${c.latest_interview_id}')">📊 Assessment</button>
                <button class="btn btn-outline" style="font-size: 0.75rem; padding: 0.25rem 0.55rem;" onclick="openReportModal('${c.latest_interview_id}')">Legacy</button>
               </div>`
            : `<span style="font-size:0.8rem; color:var(--text-dim);">No Interview</span>`
          }
        </td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Failed to load recruiter data:", err);
  }
}

// Admin Dashboard Loader
async function loadAdminDashboard() {
  try {
    const data = await apiFetch("/api/analytics/admin");
    document.getElementById("admin-stat-users").innerText = data.stats.total_users;
    document.getElementById("admin-stat-resumes").innerText = data.stats.resumes_parsed;
    document.getElementById("admin-stat-interviews").innerText = data.stats.total_interviews;

    const tbody = document.getElementById("admin-users-tbody");
    tbody.innerHTML = data.users.map(u => `
      <tr>
        <td><code>${u.id}</code></td>
        <td>
          <strong>${u.name}</strong>
          <div style="font-size: 0.8rem; color: var(--text-dim);">${u.email}</div>
        </td>
        <td><span class="badge badge-${u.role}">${u.role}</span></td>
        <td>
          <span class="badge ${u.status === 'Active' ? 'badge-success' : 'badge-admin'}">${u.status}</span>
        </td>
        <td>
          <button class="btn btn-outline" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;" onclick="toggleUserStatus('${u.id}', '${u.status === 'Active' ? 'Suspended' : 'Active'}')">
            Toggle Status
          </button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Failed to load admin data:", err);
  }
}

async function toggleUserStatus(userId, newStatus) {
  try {
    await apiFetch(`/api/analytics/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus })
    });
    loadAdminDashboard();
  } catch (err) {
    alert(`Status update failed: ${err.message}`);
  }
}

// Report Modal
async function openReportModal(interviewId) {
  const modal = document.getElementById("report-modal-overlay");
  const content = document.getElementById("report-modal-content");
  modal.style.display = "block";
  content.innerHTML = `<div style="text-align:center; padding:2rem;"><div class="spinner"></div><p style="margin-top:0.5rem;">Loading Report Data & Recording...</p></div>`;

  try {
    const data = await apiFetch(`/api/analytics/report/${interviewId}`);
    const behaviorReport = await apiFetch(`/api/interview-analysis/${interviewId}/report`).catch(() => null);
    renderFullReport(data.report, content, data, behaviorReport);
  } catch (err) {
    content.innerHTML = `<p style="color: var(--accent-danger);">Failed to load report: ${err.message}</p>`;
  }
}

function closeReportModal() {
  document.getElementById("report-modal-overlay").style.display = "none";
}

// ==========================================================================
// 6. Speech-to-Text & Communication Analysis Module
// ==========================================================================

const speechState = {
  stream: null,
  mediaRecorder: null,
  recordedChunks: [],
  audioBlob: null,
  audioUrl: null,
  isRecording: false,
  isPaused: false,
  recordingSeconds: 0,
  timerInterval: null,
  speechRecognition: null,
  liveText: "",
  analysisData: null,
  currentMode: "mic",
  audioContext: null,
  analyserNode: null,
  animFrameId: null
};

// Common fillers list for instant live client-side matching while speaking
const LIVE_FILLERS_LIST = ["um", "uh", "hmm", "like", "you know", "actually", "basically", "so", "well", "i mean"];

// Preset samples for testing direct transcript calculations
const SPEECH_PRESETS = {
  balanced: {
    text: "In my recent project, I designed a scalable asynchronous FastAPI backend with PostgreSQL, utilizing Docker for consistent deployment. We optimized database query latency by introducing a Redis caching layer, which reduced response times by forty percent while maintaining high test coverage and system resilience.",
    duration: 35
  },
  fillers: {
    text: "Um, in my previous project, basically we, you know, designed a microservices architecture. Actually, like, the main bottleneck was query latency, so, I mean, I implemented Redis caching, which, like, improved performance significantly, you know?",
    duration: 32
  },
  grammar: {
    text: "I is building a high concurrency system and they was using more better tools because we could of done it faster if we had went with asynchronous microservices.",
    duration: 25
  },
  fast: {
    text: "We deployed a distributed containerized Kubernetes cluster orchestrated with automated CI/CD pipelines, integrating continuous monitoring and distributed tracing to ensure zero-downtime rolling updates across twenty multi-tenant microservices.",
    duration: 12
  }
};

function switchSpeechStudioMode(mode) {
  speechState.currentMode = mode;
  const micBtn = document.getElementById("speech-mode-mic-btn");
  const textBtn = document.getElementById("speech-mode-text-btn");
  const micPanel = document.getElementById("speech-mic-panel");
  const textPanel = document.getElementById("speech-text-panel");

  if (mode === "mic") {
    if (micBtn) micBtn.className = "studio-mode-btn active";
    if (textBtn) textBtn.className = "studio-mode-btn";
    if (micPanel) micPanel.style.display = "block";
    if (textPanel) textPanel.style.display = "none";
  } else {
    if (micBtn) micBtn.className = "studio-mode-btn";
    if (textBtn) textBtn.className = "studio-mode-btn active";
    if (micPanel) micPanel.style.display = "none";
    if (textPanel) textPanel.style.display = "block";
  }
}

function loadSpeechPreset(key) {
  const preset = SPEECH_PRESETS[key];
  if (preset) {
    const textEl = document.getElementById("speech-direct-text");
    const durEl = document.getElementById("speech-direct-duration");
    if (textEl) textEl.value = preset.text;
    if (durEl) durEl.value = preset.duration;
  }
}

function showSpeechAlert(msg) {
  const box = document.getElementById("speech-alert-box");
  const text = document.getElementById("speech-alert-msg");
  if (box && text) {
    text.innerText = msg;
    box.style.display = "block";
  }
}

function hideSpeechAlert() {
  const box = document.getElementById("speech-alert-box");
  if (box) box.style.display = "none";
}

// --------------------------------------------------------------------------
// Real-Time Audio Frequency Waveform Visualizer
// --------------------------------------------------------------------------

function startWaveformVisualizer() {
  const canvas = document.getElementById("speech-waveform-canvas");
  if (!canvas || !speechState.analyserNode) return;
  canvas.style.display = "block";
  const ctx = canvas.getContext("2d");
  const bufferLength = speechState.analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    if (!speechState.isRecording && !speechState.isPaused) {
      if (canvas) canvas.style.display = "none";
      return;
    }
    speechState.animFrameId = requestAnimationFrame(draw);
    speechState.analyserNode.getByteFrequencyData(dataArray);

    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255.0) * canvas.height * 0.9;
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, "#6366f1");
      gradient.addColorStop(1, "#06b6d4");

      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
      x += barWidth;
    }
  }
  draw();
}

function stopWaveformVisualizer() {
  if (speechState.animFrameId) {
    cancelAnimationFrame(speechState.animFrameId);
    speechState.animFrameId = null;
  }
  if (speechState.audioContext) {
    try { speechState.audioContext.close(); } catch(e) {}
    speechState.audioContext = null;
    speechState.analyserNode = null;
  }
  const canvas = document.getElementById("speech-waveform-canvas");
  if (canvas) canvas.style.display = "none";
}

function updateLiveSpeechMetrics() {
  const text = speechState.liveText || "";
  const words = text.match(/\b[\w'-]+\b/g) || [];
  const wordCount = words.length;

  const mins = Math.max(0.05, speechState.recordingSeconds / 60);
  const liveWpm = Math.round(wordCount / mins);

  let fillerCount = 0;
  const lower = text.toLowerCase();
  for (const f of LIVE_FILLERS_LIST) {
    const re = new RegExp('\\b' + f + '\\b', 'gi');
    const matches = lower.match(re);
    if (matches) fillerCount += matches.length;
  }

  const paceEl = document.getElementById("live-stat-pace");
  const wordsEl = document.getElementById("live-stat-words");
  const fillersEl = document.getElementById("live-stat-fillers");
  const metricsBar = document.getElementById("speech-live-metrics-bar");

  if (metricsBar && speechState.isRecording) metricsBar.style.display = "flex";
  if (paceEl) paceEl.innerText = `${liveWpm} WPM`;
  if (wordsEl) wordsEl.innerText = `${wordCount} words`;
  if (fillersEl) fillersEl.innerText = `${fillerCount}`;

  // Highlight live fillers in preview
  const liveEl = document.getElementById("speech-live-transcript");
  if (liveEl && text) {
    let highlighted = text;
    for (const f of LIVE_FILLERS_LIST) {
      const re = new RegExp('\\b(' + f + ')\\b', 'gi');
      highlighted = highlighted.replace(re, '<mark class="filler-tag" style="background:rgba(245,158,11,0.35);color:#fde047;padding:0.1rem 0.35rem;border-radius:4px;font-weight:600;">$1</mark>');
    }
    liveEl.innerHTML = `"${highlighted}"`;
  }
}

// --------------------------------------------------------------------------
// Microphone Audio Capture & Web Speech API Streaming
// --------------------------------------------------------------------------

async function startSpeechRecording() {
  hideSpeechAlert();
  speechState.recordedChunks = [];
  speechState.audioBlob = null;
  speechState.audioUrl = null;
  speechState.recordingSeconds = 0;
  speechState.liveText = "";

  const liveEl = document.getElementById("speech-live-transcript");
  if (liveEl) liveEl.innerText = "Listening... Speak clearly into your microphone.";

  const playerCard = document.getElementById("speech-player-card");
  if (playerCard) playerCard.style.display = "none";

  const resultsDiv = document.getElementById("speech-results-dashboard");
  if (resultsDiv) resultsDiv.style.display = "none";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    speechState.stream = stream;

    // Initialize Web Audio API Analyser for Live Waveform
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        speechState.audioContext = audioCtx;
        speechState.analyserNode = analyser;
        startWaveformVisualizer();
      }
    } catch(e) {
      console.warn("AudioContext visualizer notice:", e);
    }

    let mimeType = 'audio/webm';
    if (typeof MediaRecorder.isTypeSupported === 'function') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    speechState.mediaRecorder = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        speechState.recordedChunks.push(event.data);
      }
    };

    recorder.onstop = async () => {
      const fullBlob = new Blob(speechState.recordedChunks, { type: mimeType });
      speechState.audioBlob = fullBlob;
      const url = URL.createObjectURL(fullBlob);
      speechState.audioUrl = url;

      const audioEl = document.getElementById("speech-audio-element");
      const downloadBtn = document.getElementById("btn-download-speech-audio");
      if (audioEl) {
        audioEl.src = url;
      }
      if (downloadBtn) {
        downloadBtn.href = url;
      }
      if (playerCard) {
        playerCard.style.display = "block";
      }

      stopWaveformVisualizer();

      // Stop audio tracks
      if (speechState.stream) {
        speechState.stream.getTracks().forEach(t => t.stop());
        speechState.stream = null;
      }

      // Automatic instant analysis trigger after recording if toggle enabled
      const autoToggle = document.getElementById("speech-auto-analyze-toggle");
      if ((!autoToggle || autoToggle.checked) && speechState.recordingSeconds >= 2) {
        await analyzeRecordedSpeech();
      }
    };

    recorder.start(250);
    speechState.isRecording = true;
    speechState.isPaused = false;

    // Start Web Speech API Recognition if available for real-time live preview
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'en-US';

        recog.onresult = (e) => {
          let interim = '';
          let final = '';
          for (let i = 0; i < e.results.length; ++i) {
            if (e.results[i].isFinal) {
              final += e.results[i][0].transcript + ' ';
            } else {
              interim += e.results[i][0].transcript;
            }
          }
          speechState.liveText = (final + interim).trim();
          updateLiveSpeechMetrics();
        };

        recog.onerror = (e) => {
          console.warn("[WebSpeech] Recognition notice:", e.error);
        };

        recog.start();
        speechState.speechRecognition = recog;
      } catch (recErr) {
        console.warn("[WebSpeech] Initializer notice:", recErr);
      }
    }

    // Start Recording Timer
    speechState.timerInterval = setInterval(() => {
      speechState.recordingSeconds++;
      updateSpeechTimerDisplay();
      updateLiveSpeechMetrics();
    }, 1000);

    updateSpeechRecorderControls();
  } catch (err) {
    console.error("Microphone access error:", err);
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      showSpeechAlert("Microphone permission was denied. Please allow microphone access in your browser settings to record audio.");
    } else if (err.name === 'NotFoundError') {
      showSpeechAlert("No microphone device detected. Please connect an audio input device.");
    } else {
      showSpeechAlert(`Microphone error: ${err.message}`);
    }
  }
}

function pauseSpeechRecording() {
  if (speechState.mediaRecorder && speechState.mediaRecorder.state === 'recording') {
    speechState.mediaRecorder.pause();
    speechState.isPaused = true;
    if (speechState.timerInterval) clearInterval(speechState.timerInterval);
    updateSpeechRecorderControls();
  }
}

function resumeSpeechRecording() {
  if (speechState.mediaRecorder && speechState.mediaRecorder.state === 'paused') {
    speechState.mediaRecorder.resume();
    speechState.isPaused = false;
    speechState.timerInterval = setInterval(() => {
      speechState.recordingSeconds++;
      updateSpeechTimerDisplay();
      updateLiveSpeechMetrics();
    }, 1000);
    updateSpeechRecorderControls();
  }
}

function stopSpeechRecording() {
  if (speechState.timerInterval) {
    clearInterval(speechState.timerInterval);
    speechState.timerInterval = null;
  }

  if (speechState.speechRecognition) {
    try { speechState.speechRecognition.stop(); } catch (e) {}
  }

  if (speechState.mediaRecorder && speechState.mediaRecorder.state !== 'inactive') {
    speechState.mediaRecorder.stop();
  }

  speechState.isRecording = false;
  speechState.isPaused = false;
  updateSpeechRecorderControls();
}

function resetSpeechRecording() {
  stopSpeechRecording();
  stopWaveformVisualizer();
  speechState.audioBlob = null;
  speechState.audioUrl = null;
  speechState.recordingSeconds = 0;
  speechState.liveText = "";
  hideSpeechAlert();

  const timerEl = document.getElementById("speech-timer-display");
  if (timerEl) {
    timerEl.innerText = "00:00";
    timerEl.className = "timer-digits";
  }

  const metricsBar = document.getElementById("speech-live-metrics-bar");
  if (metricsBar) metricsBar.style.display = "none";

  const liveEl = document.getElementById("speech-live-transcript");
  if (liveEl) liveEl.innerText = 'Listening stream is inactive. Click "Start Recording" and speak to observe live partial transcription.';

  const playerCard = document.getElementById("speech-player-card");
  if (playerCard) playerCard.style.display = "none";

  const resultsDiv = document.getElementById("speech-results-dashboard");
  if (resultsDiv) resultsDiv.style.display = "none";

  updateSpeechRecorderControls();
}

function updateSpeechTimerDisplay() {
  const timerEl = document.getElementById("speech-timer-display");
  if (timerEl) {
    const mins = Math.floor(speechState.recordingSeconds / 60);
    const secs = speechState.recordingSeconds % 60;
    timerEl.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    timerEl.className = speechState.isRecording ? "timer-digits recording" : "timer-digits";
  }
}

function updateSpeechRecorderControls() {
  const statusPill = document.getElementById("speech-rec-status");
  const btnStart = document.getElementById("btn-start-speech-rec");
  const btnPause = document.getElementById("btn-pause-speech-rec");
  const btnResume = document.getElementById("btn-resume-speech-rec");
  const btnStop = document.getElementById("btn-stop-speech-rec");

  if (!speechState.isRecording) {
    if (statusPill) {
      statusPill.className = "recording-status-pill";
      statusPill.innerText = speechState.audioBlob ? "Audio Ready for Analysis" : "Ready to Record";
    }
    if (btnStart) btnStart.style.display = "inline-flex";
    if (btnPause) btnPause.style.display = "none";
    if (btnResume) btnResume.style.display = "none";
    if (btnStop) btnStop.style.display = "none";
  } else if (speechState.isPaused) {
    if (statusPill) {
      statusPill.className = "recording-status-pill paused";
      statusPill.innerText = "⏸️ Recording Paused";
    }
    if (btnStart) btnStart.style.display = "none";
    if (btnPause) btnPause.style.display = "none";
    if (btnResume) btnResume.style.display = "inline-flex";
    if (btnStop) btnStop.style.display = "inline-flex";
  } else {
    if (statusPill) {
      statusPill.className = "recording-status-pill recording";
      statusPill.innerText = "🔴 Live Recording Active";
    }
    if (btnStart) btnStart.style.display = "none";
    if (btnPause) btnPause.style.display = "inline-flex";
    if (btnResume) btnResume.style.display = "none";
    if (btnStop) btnStop.style.display = "inline-flex";
  }
}

// --------------------------------------------------------------------------
// Speech Analysis API Calls & Execution
// --------------------------------------------------------------------------

async function analyzeRecordedSpeech() {
  hideSpeechAlert();
  if (!speechState.audioBlob) {
    showSpeechAlert("Please record your speech before requesting communication analysis.");
    return;
  }

  if (speechState.recordingSeconds < 2) {
    showSpeechAlert("Recording is too short. Please speak for at least 3 seconds for accurate pace and acoustic metrics.");
    return;
  }

  const spinner = document.getElementById("speech-loading-spinner");
  const resultsDiv = document.getElementById("speech-results-dashboard");
  const btnAnalyze = document.getElementById("btn-run-speech-analysis");

  if (spinner) spinner.style.display = "block";
  if (resultsDiv) resultsDiv.style.display = "none";
  if (btnAnalyze) {
    btnAnalyze.disabled = true;
    btnAnalyze.innerHTML = `<div class="spinner"></div> Analyzing Speech...`;
  }

  const formData = new FormData();
  formData.append("file", speechState.audioBlob, "recording.webm");
  if (speechState.recordingSeconds > 0) {
    formData.append("explicit_duration", speechState.recordingSeconds.toString());
  }
  if (speechState.liveText && speechState.liveText.trim()) {
    formData.append("live_transcript", speechState.liveText.trim());
  }

  try {
    const data = await apiFetch("/api/speech/analyze", {
      method: "POST",
      body: formData
    });

    speechState.analysisData = data;
    renderSpeechAnalysisDashboard(data);
  } catch (err) {
    console.error("Speech analysis failed:", err);
    showSpeechAlert(`Speech analysis failed: ${err.message || 'Unable to process audio. Please try again.'}`);
  } finally {
    if (spinner) spinner.style.display = "none";
    if (btnAnalyze) {
      btnAnalyze.disabled = false;
      btnAnalyze.innerHTML = `⚡ Re-Analyze Speech & Communication`;
    }
  }
}

async function analyzeTextDirectSpeech() {
  hideSpeechAlert();
  const text = (document.getElementById("speech-direct-text")?.value || "").trim();
  const duration = parseFloat(document.getElementById("speech-direct-duration")?.value || "30");

  if (!text) {
    showSpeechAlert("Please provide a transcript text to analyze.");
    return;
  }

  const spinner = document.getElementById("speech-loading-spinner");
  const resultsDiv = document.getElementById("speech-results-dashboard");

  if (spinner) spinner.style.display = "block";
  if (resultsDiv) resultsDiv.style.display = "none";

  try {
    const data = await apiFetch("/api/speech/text-analyze", {
      method: "POST",
      body: JSON.stringify({
        transcript: text,
        audio_duration: duration
      })
    });

    speechState.analysisData = data;
    renderSpeechAnalysisDashboard(data);
  } catch (err) {
    console.error("Text speech analysis failed:", err);
    showSpeechAlert(`Analysis failed: ${err.message}`);
  } finally {
    if (spinner) spinner.style.display = "none";
  }
}

// --------------------------------------------------------------------------
// Dashboard Rendering Functions
// --------------------------------------------------------------------------

function renderSpeechAnalysisDashboard(data) {
  const container = document.getElementById("speech-results-dashboard");
  if (!container) return;

  const comm = data.communication || {};
  const pace = data.pace || {};
  const fillers = data.fillers || {};
  const pauses = data.pauses || {};
  const pron = data.pronunciation || {};
  const grammar = data.grammar || {};
  const feedback = data.feedback || {};

  // Color helper for pace
  let paceColorClass = "normal";
  if (pace.category === "Very Slow") paceColorClass = "very-slow";
  else if (pace.category === "Slow") paceColorClass = "slow";
  else if (pace.category === "Fast") paceColorClass = "fast";
  else if (pace.category === "Very Fast") paceColorClass = "very-fast";

  // Timeline bars HTML
  const timelineSegments = (pauses.timeline || []).map(seg => `
    <div class="timeline-segment ${seg.type}" style="flex: ${Math.max(1, seg.duration)};" title="${seg.type === 'speech' ? '🗣️ Speech' : '⏸️ Pause'}: ${seg.start}s - ${seg.end}s (${seg.duration}s)">
      ${seg.duration >= 1.2 ? seg.duration + 's' : ''}
    </div>
  `).join("");

  // Filler frequency bars HTML
  const fillerEntries = Object.entries(fillers.words || {});
  const fillerBarsHtml = fillerEntries.length === 0 ? `
    <p style="color: var(--accent-success); font-size: 0.9rem;">✅ No filler words detected! Exceptionally fluent delivery.</p>
  ` : fillerEntries.map(([word, count]) => `
    <div class="filler-chip-row">
      <span class="filler-name">"${word}"</span>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${Math.min(100, (count / Math.max(1, fillers.total)) * 100)}%;"></div>
      </div>
      <span class="filler-count">${count}x</span>
    </div>
  `).join("");

  // Grammar sentence-by-sentence analysis HTML
  const sentencesAnalysis = grammar.sentences_analysis || [];
  const totalSentences = grammar.total_sentences_count || sentencesAnalysis.length || (grammar.mistakes ? 1 : 0);
  const passedSentences = grammar.passed_sentences_count !== undefined ? grammar.passed_sentences_count : (sentencesAnalysis.filter(s => s.is_valid).length);
  const sentenceAccuracy = totalSentences > 0 ? Math.round((passedSentences / totalSentences) * 100) : 100;

  const sentenceBreakdownHtml = sentencesAnalysis.length === 0 ? (
    grammar.mistakes && grammar.mistakes.length === 0 ? `
      <div class="sentence-analysis-card status-correct">
        <div class="sentence-card-header">
          <span class="sentence-index-pill">📄 Full Transcript</span>
          <span class="sentence-status-pill correct">✅ 100% Grammatically Correct</span>
        </div>
        <p style="color: var(--accent-success); font-size: 0.9rem; margin-top: 0.5rem;">
          ✅ Flawless syntax and tense agreement across all spoken content.
        </p>
      </div>
    ` : (grammar.mistakes || []).map((m, idx) => `
      <div class="sentence-analysis-card status-mistake">
        <div class="sentence-card-header">
          <span class="sentence-index-pill">⚠️ Issue #${idx + 1}</span>
          <span class="sentence-status-pill mistake">${m.severity} Severity</span>
        </div>
        <div class="sentence-comparison-box">
          <div class="sentence-row-wrong">
            <span class="badge-incorrect-tag">❌ Spoken:</span>
            <span>"${m.original_sentence || ''}"</span>
          </div>
          <div class="sentence-row-corrected">
            <span class="badge-correct-tag">✅ Suggested:</span>
            <span>"${m.suggested_correction || ''}"</span>
          </div>
        </div>
        <div class="correction-row" style="margin-top: 0.5rem;">
          <span>Incorrect: <strong class="inc">${m.incorrect_portion}</strong></span> 
          <span style="color: var(--text-dim);">➔</span> 
          <span>Correction: <strong class="sug">${m.suggested_correction}</strong></span>
        </div>
        <div class="explanation-text" style="margin-top: 0.4rem;">💡 ${m.explanation}</div>
      </div>
    `).join("")
  ) : sentencesAnalysis.map(sent => {
    const isClean = sent.is_valid;
    const mistakesInSent = sent.mistakes || [];

    const mistakesListHtml = mistakesInSent.map(m => `
      <div style="background: rgba(0,0,0,0.2); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); margin-top: 0.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.8rem; font-weight: 700; color: #fca5a5;">❌ '${m.incorrect_portion}' ➔ ✅ '${m.suggested_correction}'</span>
          <span class="severity-tag ${m.severity}">${m.severity}</span>
        </div>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">💡 ${m.explanation}</p>
      </div>
    `).join("");

    return `
      <div class="sentence-analysis-card ${isClean ? 'status-correct' : 'status-mistake'}">
        <div class="sentence-card-header">
          <span class="sentence-index-pill">📄 Sentence #${sent.sentence_index}</span>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <span class="sentence-status-pill ${isClean ? 'correct' : 'mistake'}">
              ${isClean ? '✅ Grammatically Sound' : `⚠️ ${mistakesInSent.length} Issue${mistakesInSent.length > 1 ? 's' : ''}`}
            </span>
            <span class="badge ${sent.score >= 90 ? 'badge-success' : 'badge-admin'}" style="font-size: 0.75rem;">
              Score: ${sent.score}%
            </span>
          </div>
        </div>

        <div class="sentence-comparison-box">
          <div class="sentence-row-wrong">
            <span class="badge-incorrect-tag">🗣️ Spoken:</span>
            <span>"${sent.original_sentence}"</span>
          </div>
          ${!isClean ? `
            <div class="sentence-row-corrected">
              <span class="badge-correct-tag">✨ Corrected:</span>
              <span>"${sent.corrected_sentence}"</span>
            </div>
          ` : ''}
        </div>

        ${isClean ? `
          <div style="font-size: 0.84rem; color: var(--accent-success); display: flex; align-items: center; gap: 0.4rem; margin-top: 0.25rem;">
            <span>✓ Verified: Subject-verb agreement, tense forms, and syntax are correct.</span>
          </div>
        ` : `
          <div style="margin-top: 0.5rem;">
            <strong style="font-size: 0.8rem; color: var(--secondary);">Detected Corrections for this Sentence:</strong>
            ${mistakesListHtml}
          </div>
        `}
      </div>
    `;
  }).join("");

  // Pronunciation issues HTML
  const pronIssues = pron.issues || [];
  const pronHtml = pronIssues.length === 0 ? `
    <p style="color: var(--accent-success); font-size: 0.9rem;">✅ Clear phonetic articulation across all technical vocabulary.</p>
  ` : pronIssues.map(issue => `
    <div class="pron-issue-item">
      <div class="word-status-flex">
        <span class="word-name">"${issue.word}"</span>
        <span class="badge badge-warning">${issue.status}</span>
      </div>
      <p class="pron-feedback">💡 ${issue.feedback}</p>
    </div>
  `).join("");

  // AI Feedback lists
  const strengthsList = (feedback.strengths || []).map(s => `<li>${s}</li>`).join("");
  const improvementsList = (feedback.improvements || []).map(i => `<li>${i}</li>`).join("");
  const recommendationsList = (feedback.recommendations || []).map(r => `<li>${r}</li>`).join("");

  container.innerHTML = `
    <!-- Top Row: Overall Communication Index & Spoken Transcript Viewer -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem;">
      
      <!-- Widget 1: Communication Quality Index -->
      <div class="glass-card">
        <div class="overall-score-banner">
          <div class="circular-score-indicator">
            <svg viewBox="0 0 36 36" class="circular-chart">
              <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path class="circle" stroke-dasharray="${comm.overall_score || 0}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <text x="18" y="20.35" class="percentage">${comm.overall_score || 0}%</text>
            </svg>
          </div>
          <div>
            <h3>Communication Quality Index</h3>
            <p style="font-size: 0.85rem; margin-top: 0.25rem;">
              Multi-dimensional composite score derived from actual spoken audio and transcript analytics.
            </p>
          </div>
        </div>

        <div class="component-score-grid">
          <div class="score-component-box">
            <div class="comp-label"><span>✍️ Grammar</span><strong>${comm.grammar || 0}%</strong></div>
            <div class="progress-track"><div class="progress-fill" style="width: ${comm.grammar || 0}%;"></div></div>
          </div>
          <div class="score-component-box">
            <div class="comp-label"><span>🌊 Fluency</span><strong>${comm.fluency || 0}%</strong></div>
            <div class="progress-track"><div class="progress-fill" style="width: ${comm.fluency || 0}%;"></div></div>
          </div>
          <div class="score-component-box">
            <div class="comp-label"><span>🎯 Pronunciation</span><strong>${comm.pronunciation || 0}%</strong></div>
            <div class="progress-track"><div class="progress-fill" style="width: ${comm.pronunciation || 0}%;"></div></div>
          </div>
          <div class="score-component-box">
            <div class="comp-label"><span>⚡ Pace</span><strong>${comm.pace || 0}%</strong></div>
            <div class="progress-track"><div class="progress-fill" style="width: ${comm.pace || 0}%;"></div></div>
          </div>
          <div class="score-component-box">
            <div class="comp-label"><span>💎 Clarity</span><strong>${comm.clarity || 0}%</strong></div>
            <div class="progress-track"><div class="progress-fill" style="width: ${comm.clarity || 0}%;"></div></div>
          </div>
          <div class="score-component-box">
            <div class="comp-label"><span>📚 Vocabulary</span><strong>${comm.vocabulary || 0}%</strong></div>
            <div class="progress-track"><div class="progress-fill" style="width: ${comm.vocabulary || 0}%;"></div></div>
          </div>
          <div class="score-component-box">
            <div class="comp-label"><span>🦁 Confidence</span><strong>${comm.confidence || 0}%</strong></div>
            <div class="progress-track"><div class="progress-fill" style="width: ${comm.confidence || 0}%;"></div></div>
          </div>
        </div>
      </div>

      <!-- Widget 2: Spoken Transcript Viewer -->
      <div class="glass-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
          <h4>📝 Transcribed Spoken Answer</h4>
          <div style="display: flex; gap: 0.5rem;">
            <button id="btn-copy-transcript" class="btn btn-outline" style="font-size: 0.8rem; padding: 0.3rem 0.75rem;" onclick="copySpeechTranscript()">
              📋 Copy
            </button>
            <button class="btn btn-outline" style="font-size: 0.8rem; padding: 0.3rem 0.75rem;" onclick="downloadSpeechTranscript()">
              📥 Download TXT
            </button>
          </div>
        </div>

        <div class="stats-badges-row">
          <span class="stat-pill">⏱️ Duration: <strong>${data.audio_duration || 0}s</strong></span>
          <span class="stat-pill">🔤 Words: <strong>${data.word_count || 0}</strong></span>
          <span class="stat-pill">🔡 Characters: <strong>${data.character_count || 0}</strong></span>
          <span class="stat-pill">📄 Sentences: <strong>${data.sentence_count || 0}</strong></span>
        </div>

        <div class="transcript-content-box" id="speech-transcript-text-container">
          ${grammar.highlighted_transcript || fillers.highlighted_transcript || data.transcript}
        </div>
      </div>

    </div>

    <!-- Middle Row: Pace, Fillers, Pauses & Pronunciation Metrics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">

      <!-- Widget 3: Speech Pace (WPM) -->
      <div class="glass-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h4>⚡ Speaking Pace</h4>
          <span class="badge ${pace.category === 'Normal' ? 'badge-success' : 'badge-candidate'}">
            ${pace.category}
          </span>
        </div>

        <div class="wpm-display-large">
          <span class="wpm-val">${pace.wpm || 0}</span>
          <span class="wpm-unit">Words / Min</span>
        </div>

        <div class="pace-gauge-track">
          <div class="gauge-zone very-slow ${paceColorClass === 'very-slow' ? 'active-zone' : ''}" title="<100 WPM: Very Slow"></div>
          <div class="gauge-zone slow ${paceColorClass === 'slow' ? 'active-zone' : ''}" title="100-119 WPM: Slow"></div>
          <div class="gauge-zone normal ${paceColorClass === 'normal' ? 'active-zone' : ''}" title="120-160 WPM: Ideal"></div>
          <div class="gauge-zone fast ${paceColorClass === 'fast' ? 'active-zone' : ''}" title="161-180 WPM: Fast"></div>
          <div class="gauge-zone very-fast ${paceColorClass === 'very-fast' ? 'active-zone' : ''}" title=">180 WPM: Very Fast"></div>
        </div>
        <div class="gauge-labels">
          <span>0</span>
          <span>100</span>
          <span>120 (Ideal) 160</span>
          <span>180+</span>
        </div>

        <div class="recommendation-box">
          💡 ${pace.recommendation || 'Maintain 120-160 WPM for conversational clarity.'}
        </div>
      </div>

      <!-- Widget 4: Filler-Word Detection -->
      <div class="glass-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h4>🗣️ Filler Words</h4>
          <span class="badge ${fillers.rate <= 3.0 ? 'badge-success' : 'badge-admin'}">
            Rate: ${fillers.rate || 0}%
          </span>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 1rem; color: var(--text-muted);">
          <div>Total: <strong style="color: var(--text-main);">${fillers.total || 0}</strong></div>
          <div>Most Used: <strong style="color: var(--accent-warning);">${fillers.most_used ? `"${fillers.most_used}" (${fillers.most_used_count}x)` : 'None'}</strong></div>
        </div>

        <div style="max-height: 180px; overflow-y: auto;">
          ${fillerBarsHtml}
        </div>
      </div>

      <!-- Widget 5: Pause & Silence Dynamics -->
      <div class="glass-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h4>⏸️ Pause Dynamics</h4>
          <span class="badge badge-candidate">${pauses.silence_percentage || 0}% Silence</span>
        </div>

        <div class="mini-metrics-grid">
          <div class="metric-cell">
            <span class="label">Pauses</span>
            <span class="val">${pauses.count || 0}</span>
          </div>
          <div class="metric-cell">
            <span class="label">Avg Pause</span>
            <span class="val">${pauses.average_duration || 0}s</span>
          </div>
          <div class="metric-cell">
            <span class="label">Longest</span>
            <span class="val">${pauses.longest_duration || 0}s</span>
          </div>
          <div class="metric-cell">
            <span class="label">Silence</span>
            <span class="val">${pauses.total_silence_duration || 0}s</span>
          </div>
        </div>

        <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted);">Audio Flow Timeline (Speech vs Pauses):</label>
        <div class="timeline-bar-wrapper">
          ${timelineSegments}
        </div>
        <div class="timeline-legend">
          <span class="legend-item"><span class="dot speech"></span> Speech</span>
          <span class="legend-item"><span class="dot pause"></span> Pause</span>
        </div>
      </div>

      <!-- Widget 6: Pronunciation Evaluation -->
      <div class="glass-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h4>🎯 Pronunciation</h4>
          <span class="badge badge-success">Score: ${pron.score || 100}/100</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem;">
          ${pron.clarity_assessment || 'Speech articulation is clear and steady.'}
        </p>

        <div style="max-height: 180px; overflow-y: auto;">
          ${pronHtml}
        </div>
      </div>

    </div>

    <!-- Widget 7: Grammar & Language Analysis -->
    <div class="glass-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <h4>✍️ Grammar & Linguistic Verification (Sentence-by-Sentence)</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">Every spoken sentence is checked for subject-verb agreement, tense consistency, syntax, and phrasing.</p>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span style="font-size: 0.85rem; color: var(--text-muted);">Issues: <strong>${grammar.mistakes_count || 0}</strong></span>
          <span class="badge ${grammar.score >= 85 ? 'badge-success' : 'badge-admin'}">Grammar Score: ${grammar.score || 100}%</span>
        </div>
      </div>

      <div class="grammar-accuracy-banner">
        <div>
          <span style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">📊 Sentence Accuracy: </span>
          <strong style="color: ${sentenceAccuracy >= 80 ? 'var(--accent-success)' : 'var(--accent-warning)'};">${sentenceAccuracy}%</strong>
          <span style="font-size: 0.85rem; color: var(--text-muted); margin-left: 0.35rem;">(${passedSentences} of ${totalSentences} sentence${totalSentences !== 1 ? 's' : ''} flawless)</span>
        </div>
        <div>
          <span style="font-size: 0.82rem; color: var(--text-dim);">Evaluated with Deterministic NLP & Linguistic Rules</span>
        </div>
      </div>

      <div class="sentence-breakdown-container">
        ${sentenceBreakdownHtml}
      </div>

      ${(grammar.improvement_suggestions && grammar.improvement_suggestions.length > 0) ? `
        <div class="suggestions-box" style="margin-top: 1.25rem;">
          <strong style="color: var(--secondary);">💡 Language Clarity Tips:</strong>
          <ul>
            ${grammar.improvement_suggestions.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>

    <!-- Widget 8: AI Speech & Communication Coaching -->
    <div class="glass-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <h3 style="color: var(--primary);">🧠 Personalized AI Speech & Communication Coaching</h3>
        <span class="badge badge-candidate">Executive Coaching</span>
      </div>
      <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1.25rem;">
        Actionable communication guidance synthesized from your speaking speed, hesitation rate, and syntactical formulation.
      </p>

      <div class="feedback-columns-grid">
        <div class="feedback-col strengths-col">
          <h4>🌟 Notable Strengths</h4>
          <ul>${strengthsList || '<li>Clear vocal enunciation and composure throughout response.</li>'}</ul>
        </div>

        <div class="feedback-col improvements-col">
          <h4>🛠️ Areas for Refinement</h4>
          <ul>${improvementsList || '<li>Maintain current vocal cadence across longer technical explanations.</li>'}</ul>
        </div>
      </div>

      <div class="practice-box" style="margin-top: 1.25rem;">
        <h4>🚀 Recommended Practice Drills</h4>
        <ol>${recommendationsList || '<li>Practice reading 2-minute technical architecture overviews at 140 WPM.</li>'}</ol>
      </div>
    </div>
  `;

  container.style.display = "flex";
  setTimeout(() => {
    container.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 150);
}

function copySpeechTranscript() {
  if (speechState.analysisData && speechState.analysisData.transcript) {
    navigator.clipboard.writeText(speechState.analysisData.transcript);
    const btn = document.getElementById("btn-copy-transcript");
    if (btn) {
      btn.innerText = "✅ Copied!";
      setTimeout(() => { btn.innerText = "📋 Copy"; }, 2000);
    }
  }
}

function downloadSpeechTranscript() {
  if (speechState.analysisData && speechState.analysisData.transcript) {
    const blob = new Blob([speechState.analysisData.transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `speech_transcript_${speechState.analysisData.session_id || 'sample'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ==========================================================================
// 7. AI Video & Behavioral Vision Stream Engine
// ==========================================================================

function startVideoAnalysisStream(sessionId, videoElementId = "webcam-preview") {
  if (!sessionId) return;
  stopVideoAnalysisStream();

  state.videoAnalysis.sessionId = sessionId;
  state.videoAnalysis.targetVideoId = videoElementId;
  state.videoAnalysis.isStreaming = true;

  if (!state.videoAnalysis.canvas) {
    state.videoAnalysis.canvas = document.createElement("canvas");
    state.videoAnalysis.canvas.width = 320;
    state.videoAnalysis.canvas.height = 240;
  }

  const canvas = state.videoAnalysis.canvas;
  const ctx = canvas.getContext("2d");

  // Sample and stream frames at ~2.5 FPS (every 400ms) without UI freezing
  state.videoAnalysis.intervalId = setInterval(async () => {
    if (!state.videoAnalysis.isStreaming) return;
    const videoEl = document.getElementById(state.videoAnalysis.targetVideoId);
    if (!videoEl || videoEl.paused || videoEl.ended || videoEl.readyState < 2) return;

    try {
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      const frameDataUrl = canvas.toDataURL("image/jpeg", 0.6);

      const data = await apiFetch("/api/interview-analysis/frame", {
        method: "POST",
        body: JSON.stringify({
          session_id: state.videoAnalysis.sessionId,
          frame_data: frameDataUrl
        })
      });

      state.videoAnalysis.lastTelemetry = data;
      updateLiveBehaviorHUD(data);
    } catch (err) {
      console.warn("Frame analysis stream tick error:", err.message);
    }
  }, 400);
}

function pauseVideoAnalysisStream() {
  state.videoAnalysis.isStreaming = false;
}

function resumeVideoAnalysisStream(sessionId, videoElementId = "webcam-preview") {
  state.videoAnalysis.isStreaming = true;
  if (!state.videoAnalysis.intervalId) {
    startVideoAnalysisStream(sessionId, videoElementId);
  }
}

function stopVideoAnalysisStream() {
  state.videoAnalysis.isStreaming = false;
  if (state.videoAnalysis.intervalId) {
    clearInterval(state.videoAnalysis.intervalId);
    state.videoAnalysis.intervalId = null;
  }
}

function updateLiveBehaviorHUD(data) {
  if (!data) return;

  // 1. Face Status
  const faceStatusEl = document.getElementById("live-face-status");
  if (faceStatusEl) {
    if (data.face_detected) {
      faceStatusEl.className = "badge badge-success";
      faceStatusEl.innerText = data.face_status || "Face Detected";
    } else {
      faceStatusEl.className = "badge badge-outline";
      faceStatusEl.innerText = "No Face Detected";
    }
  }

  // 2. Emotion
  const emotionLabelEl = document.getElementById("live-emotion-label");
  const emotionConfEl = document.getElementById("live-emotion-conf");
  if (emotionLabelEl && data.emotion) {
    emotionLabelEl.innerText = data.emotion.label || "Analyzing...";
    if (data.emotion.confidence && data.face_detected) {
      const confPct = Math.round(data.emotion.confidence * 100);
      if (emotionConfEl) emotionConfEl.innerText = `(${confPct}%)`;
    } else if (emotionConfEl) {
      emotionConfEl.innerText = "";
    }
  }

  // 3. Gaze
  const gazeDirEl = document.getElementById("live-gaze-dir");
  const eyesClosedWarningEl = document.getElementById("live-eyes-closed-warning");
  if (gazeDirEl && data.gaze) {
    const dir = data.gaze.direction || "unknown";
    if (dir === "camera") {
      gazeDirEl.innerText = "Looking at Camera";
      gazeDirEl.style.color = "var(--accent-success)";
    } else if (dir === "left") {
      gazeDirEl.innerText = "Looking Left";
      gazeDirEl.style.color = "var(--text-main)";
    } else if (dir === "right") {
      gazeDirEl.innerText = "Looking Right";
      gazeDirEl.style.color = "var(--text-main)";
    } else if (dir === "down") {
      gazeDirEl.innerText = "Looking Down";
      gazeDirEl.style.color = "var(--accent-warning)";
    } else if (dir === "eyes_closed") {
      gazeDirEl.innerText = "Eyes Closed";
      gazeDirEl.style.color = "var(--accent-danger)";
    } else {
      gazeDirEl.innerText = "Unknown";
      gazeDirEl.style.color = "var(--text-muted)";
    }

    if (eyesClosedWarningEl) {
      eyesClosedWarningEl.style.display = data.gaze.eyes_closed ? "inline" : "none";
    }
  }

  // 4. Eye Contact
  const eyeContactPctEl = document.getElementById("live-eye-contact-pct");
  const eyeContactLevelEl = document.getElementById("live-eye-contact-level");
  if (eyeContactPctEl && data.eye_contact) {
    eyeContactPctEl.innerText = `${data.eye_contact.percentage}%`;
    if (eyeContactLevelEl) {
      eyeContactLevelEl.innerText = data.eye_contact.level;
      eyeContactLevelEl.className = `badge ${data.eye_contact.level === 'High' ? 'badge-success' : (data.eye_contact.level === 'Moderate' ? 'badge-candidate' : 'badge-outline')}`;
    }
  }

  // 5. Head Pose
  const headDirEl = document.getElementById("live-head-dir");
  if (headDirEl && data.head_pose) {
    const hp = data.head_pose.direction || "unknown";
    const hpMap = {
      "forward": "Forward",
      "turning_left": "Turning Left",
      "turning_right": "Turning Right",
      "looking_up": "Looking Up",
      "looking_down": "Looking Down"
    };
    headDirEl.innerText = hpMap[hp] || hp;
  }

  // 6. Attention
  const attentionScoreEl = document.getElementById("live-attention-score");
  const attentionLevelEl = document.getElementById("live-attention-level");
  if (attentionScoreEl && data.attention) {
    attentionScoreEl.innerText = `${data.attention.score}%`;
    if (attentionLevelEl) {
      attentionLevelEl.innerText = data.attention.level;
      attentionLevelEl.className = `badge ${data.attention.level === 'High' ? 'badge-success' : (data.attention.level === 'Medium' ? 'badge-candidate' : 'badge-outline')}`;
    }
  }

  // 7. Engagement
  const engagementScoreEl = document.getElementById("live-engagement-score");
  const engagementLevelEl = document.getElementById("live-engagement-level");
  if (engagementScoreEl && data.engagement) {
    engagementScoreEl.innerText = `${data.engagement.score}%`;
    if (engagementLevelEl) {
      engagementLevelEl.innerText = data.engagement.level;
      engagementLevelEl.className = `badge ${data.engagement.level === 'High' ? 'badge-success' : (data.engagement.level === 'Medium' ? 'badge-candidate' : 'badge-outline')}`;
    }
  }

  // 8. Confidence Indicators & Facial Activity
  const confidenceLevelEl = document.getElementById("live-confidence-level");
  if (confidenceLevelEl && data.confidence_indicators) {
    confidenceLevelEl.innerText = `${data.confidence_indicators.level} (${data.confidence_indicators.score}%)`;
  }

  const facialActivityEl = document.getElementById("live-facial-activity");
  if (facialActivityEl && data.facial_activity_score !== undefined) {
    facialActivityEl.innerText = `${data.facial_activity_score}`;
  }
}

// ==========================================================================
// 8. Standalone AI Video & Behavioral Lab Studio
// ==========================================================================

async function startBehaviorStudioCamera() {
  const startBtn = document.getElementById("btn-start-bs-cam");
  const stopBtn = document.getElementById("btn-stop-bs-cam");
  const reportBtn = document.getElementById("btn-report-bs");
  const statusPill = document.getElementById("bs-rec-status");
  const videoEl = document.getElementById("bs-webcam-preview");
  const placeholder = document.getElementById("bs-webcam-placeholder");

  startBtn.disabled = true;
  startBtn.innerHTML = `<div class="spinner"></div> Connecting...`;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    state.behaviorStudio.stream = stream;
    state.behaviorStudio.isStreaming = true;
    state.behaviorStudio.sessionId = `studio_${Date.now()}`;
    state.behaviorStudio.framesProcessed = 0;
    state.behaviorStudio.elapsedSeconds = 0;

    videoEl.srcObject = stream;
    videoEl.style.display = "block";
    placeholder.style.display = "none";

    startBtn.style.display = "none";
    stopBtn.style.display = "inline-flex";
    reportBtn.style.display = "inline-flex";

    statusPill.className = "recording-status-pill recording";
    statusPill.innerHTML = `<span class="pulse-dot"></span> Streaming Live`;

    // Start studio session on backend
    await apiFetch("/api/interview-analysis/start", {
      method: "POST",
      body: JSON.stringify({
        session_id: state.behaviorStudio.sessionId,
        candidate_name: state.currentUser?.full_name || "Studio Candidate"
      })
    });

    // Start Studio Timer
    state.behaviorStudio.timerInterval = setInterval(() => {
      state.behaviorStudio.elapsedSeconds++;
      const timerEl = document.getElementById("bs-session-timer");
      if (timerEl) timerEl.innerText = formatTimeMMSS(state.behaviorStudio.elapsedSeconds);
    }, 1000);

    // Frame Analysis Loop
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");

    state.behaviorStudio.intervalId = setInterval(async () => {
      if (!state.behaviorStudio.isStreaming) return;
      if (!videoEl || videoEl.paused || videoEl.ended || videoEl.readyState < 2) return;

      try {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const frameDataUrl = canvas.toDataURL("image/jpeg", 0.6);

        const data = await apiFetch("/api/interview-analysis/frame", {
          method: "POST",
          body: JSON.stringify({
            session_id: state.behaviorStudio.sessionId,
            frame_data: frameDataUrl
          })
        });

        state.behaviorStudio.framesProcessed++;
        const counterEl = document.getElementById("bs-frame-counter");
        if (counterEl) counterEl.innerText = state.behaviorStudio.framesProcessed;

        updateBehaviorStudioHUD(data);
      } catch (err) {
        console.warn("Studio frame error:", err.message);
      }
    }, 400);

  } catch (err) {
    alert(`Could not start camera: ${err.message}`);
    startBtn.disabled = false;
    startBtn.innerHTML = `▶️ Start Camera Analysis`;
  }
}

function stopBehaviorStudioCamera() {
  state.behaviorStudio.isStreaming = false;
  if (state.behaviorStudio.intervalId) {
    clearInterval(state.behaviorStudio.intervalId);
    state.behaviorStudio.intervalId = null;
  }
  if (state.behaviorStudio.timerInterval) {
    clearInterval(state.behaviorStudio.timerInterval);
    state.behaviorStudio.timerInterval = null;
  }
  if (state.behaviorStudio.stream) {
    state.behaviorStudio.stream.getTracks().forEach(t => t.stop());
    state.behaviorStudio.stream = null;
  }

  const startBtn = document.getElementById("btn-start-bs-cam");
  const stopBtn = document.getElementById("btn-stop-bs-cam");
  const statusPill = document.getElementById("bs-rec-status");
  const videoEl = document.getElementById("bs-webcam-preview");
  const placeholder = document.getElementById("bs-webcam-placeholder");

  if (startBtn) {
    startBtn.style.display = "inline-flex";
    startBtn.disabled = false;
    startBtn.innerHTML = `▶️ Resume Camera Analysis`;
  }
  if (stopBtn) stopBtn.style.display = "none";
  if (videoEl) videoEl.style.display = "none";
  if (placeholder) placeholder.style.display = "flex";

  if (statusPill) {
    statusPill.className = "recording-status-pill";
    statusPill.innerText = "Camera Paused";
  }

  // Notify backend of session stop
  if (state.behaviorStudio.sessionId) {
    apiFetch("/api/interview-analysis/stop", {
      method: "POST",
      body: JSON.stringify({ session_id: state.behaviorStudio.sessionId })
    }).catch(() => {});
  }
}

function resetBehaviorStudioSession() {
  stopBehaviorStudioCamera();
  state.behaviorStudio.sessionId = null;
  state.behaviorStudio.framesProcessed = 0;
  state.behaviorStudio.elapsedSeconds = 0;

  const startBtn = document.getElementById("btn-start-bs-cam");
  const reportBtn = document.getElementById("btn-report-bs");
  const timerEl = document.getElementById("bs-session-timer");
  const counterEl = document.getElementById("bs-frame-counter");
  const reportContainer = document.getElementById("bs-report-container");

  if (startBtn) startBtn.innerHTML = `▶️ Start Camera Analysis`;
  if (reportBtn) reportBtn.style.display = "none";
  if (timerEl) timerEl.innerText = "00:00";
  if (counterEl) counterEl.innerText = "0";
  if (reportContainer) {
    reportContainer.innerHTML = "";
    reportContainer.style.display = "none";
  }

  // Reset HUD values
  updateBehaviorStudioHUD({
    face_detected: false,
    face_status: "Awaiting Stream",
    emotion: { label: "Analyzing...", confidence: 0 },
    gaze: { direction: "camera", eyes_closed: false },
    head_pose: { direction: "forward" },
    eye_contact: { percentage: 0, level: "Low" },
    attention: { score: 0, level: "Low" },
    engagement: { score: 0, level: "Low" },
    confidence_indicators: { level: "Moderate", score: 50, indicators: { eye_contact: 0, head_stability: 0, facial_stability: 50 } },
    facial_activity_score: 0
  });
}

function updateBehaviorStudioHUD(data) {
  if (!data) return;

  const statusPill = document.getElementById("bs-face-status-pill");
  if (statusPill) {
    statusPill.className = `badge ${data.face_detected ? 'badge-success' : 'badge-outline'}`;
    statusPill.innerText = data.face_status || (data.face_detected ? "Face Detected" : "No Face");
  }

  // Emotion
  const emLabel = document.getElementById("bs-emotion-label");
  const emConf = document.getElementById("bs-emotion-conf");
  const emBar = document.getElementById("bs-emotion-bar");
  if (emLabel && data.emotion) {
    emLabel.innerText = data.emotion.label || "Analyzing...";
    const confPct = Math.round((data.emotion.confidence || 0) * 100);
    if (emConf) emConf.innerText = data.face_detected ? `${confPct}%` : "0%";
    if (emBar) emBar.style.width = data.face_detected ? `${confPct}%` : "0%";
  }

  // Gaze
  const gazeLabel = document.getElementById("bs-gaze-label");
  const eyesClosedWarning = document.getElementById("bs-eyes-closed-warning");
  if (gazeLabel && data.gaze) {
    const dir = data.gaze.direction || "unknown";
    const dirMap = {
      "camera": "Looking at Camera",
      "left": "Looking Left",
      "right": "Looking Right",
      "down": "Looking Down",
      "eyes_closed": "Eyes Closed",
      "unknown": "Searching..."
    };
    gazeLabel.innerText = dirMap[dir] || dir;
    gazeLabel.className = `badge ${dir === 'camera' ? 'badge-success' : (dir === 'eyes_closed' ? 'badge-danger' : 'badge-candidate')}`;
    if (eyesClosedWarning) {
      eyesClosedWarning.style.display = data.gaze.eyes_closed ? "inline" : "none";
    }
  }

  // Eye Contact
  const eyeContactPct = document.getElementById("bs-eye-contact-pct");
  const eyeContactLevel = document.getElementById("bs-eye-contact-level");
  const eyeContactBar = document.getElementById("bs-eye-contact-bar");
  if (eyeContactPct && data.eye_contact) {
    eyeContactPct.innerText = `${data.eye_contact.percentage}%`;
    if (eyeContactLevel) {
      eyeContactLevel.innerText = data.eye_contact.level;
      eyeContactLevel.className = `badge ${data.eye_contact.level === 'High' ? 'badge-success' : (data.eye_contact.level === 'Moderate' ? 'badge-candidate' : 'badge-outline')}`;
    }
    if (eyeContactBar) eyeContactBar.style.width = `${data.eye_contact.percentage}%`;
  }

  // Head Direction
  const headLabel = document.getElementById("bs-head-label");
  if (headLabel && data.head_pose) {
    const hp = data.head_pose.direction || "unknown";
    const hpMap = {
      "forward": "Forward",
      "turning_left": "Turning Left",
      "turning_right": "Turning Right",
      "looking_up": "Looking Up",
      "looking_down": "Looking Down"
    };
    headLabel.innerText = hpMap[hp] || hp;
  }

  // Attention
  const attScore = document.getElementById("bs-attention-score");
  const attLevel = document.getElementById("bs-attention-level");
  const attBar = document.getElementById("bs-attention-bar");
  if (attScore && data.attention) {
    attScore.innerText = `${data.attention.score}%`;
    if (attLevel) {
      attLevel.innerText = data.attention.level;
      attLevel.className = `badge ${data.attention.level === 'High' ? 'badge-success' : (data.attention.level === 'Medium' ? 'badge-candidate' : 'badge-outline')}`;
    }
    if (attBar) attBar.style.width = `${data.attention.score}%`;
  }

  // Engagement
  const engScore = document.getElementById("bs-engagement-score");
  const engLevel = document.getElementById("bs-engagement-level");
  const engBar = document.getElementById("bs-engagement-bar");
  if (engScore && data.engagement) {
    engScore.innerText = `${data.engagement.score}%`;
    if (engLevel) {
      engLevel.innerText = data.engagement.level;
      engLevel.className = `badge ${data.engagement.level === 'High' ? 'badge-success' : (data.engagement.level === 'Medium' ? 'badge-candidate' : 'badge-outline')}`;
    }
    if (engBar) engBar.style.width = `${data.engagement.score}%`;
  }

  // Confidence & Sub indicators
  const confLevel = document.getElementById("bs-confidence-level");
  const subEye = document.getElementById("bs-sub-eye");
  const subHead = document.getElementById("bs-sub-head");
  const subFacial = document.getElementById("bs-sub-facial");

  if (confLevel && data.confidence_indicators) {
    confLevel.innerText = `${data.confidence_indicators.level} (${data.confidence_indicators.score}%)`;
    const inds = data.confidence_indicators.indicators || {};
    if (subEye) subEye.innerText = `${inds.eye_contact || 0}%`;
    if (subHead) subHead.innerText = `${inds.head_stability || 0}%`;
    if (subFacial) subFacial.innerText = `${data.facial_activity_score || 0}`;
  }
}

async function generateBehaviorStudioReport() {
  if (!state.behaviorStudio.sessionId) {
    alert("Please start and record a camera session first.");
    return;
  }

  const container = document.getElementById("bs-report-container");
  container.style.display = "block";
  container.innerHTML = `<div class="glass-card" style="text-align:center; padding:2rem;"><div class="spinner"></div><p style="margin-top:0.5rem;">Synthesizing AI Video Behavioral Report...</p></div>`;

  try {
    const report = await apiFetch(`/api/interview-analysis/${state.behaviorStudio.sessionId}/report`);
    
    container.innerHTML = `
      <div class="behavior-report-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="color: var(--secondary); margin-bottom: 0.25rem;">📊 Final AI Interview Behavior Report</h2>
            <p style="color: var(--text-muted); font-size: 0.88rem;">Session: <code>${report.session_id}</code> | Frames Analyzed: <strong>${report.total_frames_analyzed}</strong> (${report.face_presence_percentage}% face presence)</p>
          </div>
          <span class="badge badge-success" style="font-size: 1.1rem; padding: 0.5rem 1rem;">
            ${report.overall_observable_indicators}
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <div class="telemetry-card">
            <div class="telemetry-label">Session Duration</div>
            <div style="font-size: 1.4rem; font-weight: 700; color: var(--primary); margin-top: 0.25rem;">${report.interview_duration}</div>
          </div>
          <div class="telemetry-card">
            <div class="telemetry-label">Eye Contact</div>
            <div style="font-size: 1.4rem; font-weight: 700; color: var(--accent-success); margin-top: 0.25rem;">${report.eye_contact?.percentage}% (${report.eye_contact?.level})</div>
          </div>
          <div class="telemetry-card">
            <div class="telemetry-label">Attention Score</div>
            <div style="font-size: 1.4rem; font-weight: 700; color: var(--secondary); margin-top: 0.25rem;">${report.attention?.score}% (${report.attention?.level})</div>
          </div>
          <div class="telemetry-card">
            <div class="telemetry-label">Engagement Score</div>
            <div style="font-size: 1.4rem; font-weight: 700; color: var(--primary); margin-top: 0.25rem;">${report.engagement?.score}% (${report.engagement?.level})</div>
          </div>
          <div class="telemetry-card">
            <div class="telemetry-label">Head Stability</div>
            <div style="font-size: 1.4rem; font-weight: 700; color: var(--text-main); margin-top: 0.25rem;">${report.head_stability_percentage}%</div>
          </div>
          <div class="telemetry-card">
            <div class="telemetry-label">Confidence Indicators</div>
            <div style="font-size: 1.2rem; font-weight: 700; color: var(--secondary); margin-top: 0.25rem;">${report.confidence_indicators?.level} (${report.confidence_indicators?.score}%)</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
          <div style="background: rgba(0,0,0,0.25); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <h4 style="margin-bottom: 0.75rem; color: var(--text-main);">🎭 CNN Emotion Estimates Distribution</h4>
            <div class="dist-bar-wrapper">
              <div class="dist-bar-header"><span>Nervous</span><strong>${report.emotion_estimates?.Nervous || 0}%</strong></div>
              <div class="dist-bar-bg"><div class="dist-bar-fill dist-bar-nervous" style="width: ${report.emotion_estimates?.Nervous || 0}%;"></div></div>
            </div>
            <div class="dist-bar-wrapper">
              <div class="dist-bar-header"><span>Scared</span><strong>${report.emotion_estimates?.Scared || 0}%</strong></div>
              <div class="dist-bar-bg"><div class="dist-bar-fill dist-bar-scared" style="width: ${report.emotion_estimates?.Scared || 0}%;"></div></div>
            </div>
            <div class="dist-bar-wrapper">
              <div class="dist-bar-header"><span>Confused</span><strong>${report.emotion_estimates?.Confused || 0}%</strong></div>
              <div class="dist-bar-bg"><div class="dist-bar-fill dist-bar-confused" style="width: ${report.emotion_estimates?.Confused || 0}%;"></div></div>
            </div>
            <p style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.5rem;">
              ℹ️ Observable facial expression model estimates.
            </p>
          </div>

          <div style="background: rgba(0,0,0,0.25); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <h4 style="margin-bottom: 0.75rem; color: var(--text-main);">👁️ Eye Gaze & Orientation Distribution</h4>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem;">
              <div style="display: flex; justify-content: space-between;"><span>Camera Eye Contact:</span><strong style="color: var(--accent-success);">${report.gaze_distribution?.camera || 0}%</strong></div>
              <div style="display: flex; justify-content: space-between;"><span>Looking Left:</span><strong>${report.gaze_distribution?.left || 0}%</strong></div>
              <div style="display: flex; justify-content: space-between;"><span>Looking Right:</span><strong>${report.gaze_distribution?.right || 0}%</strong></div>
              <div style="display: flex; justify-content: space-between;"><span>Looking Down:</span><strong>${report.gaze_distribution?.down || 0}%</strong></div>
              <div style="display: flex; justify-content: space-between;"><span>Eyes Closed:</span><strong>${report.gaze_distribution?.eyes_closed || 0}%</strong></div>
            </div>
          </div>
        </div>

        <div style="background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.25); padding: 1.25rem; border-radius: var(--radius-md);">
          <h4 style="color: var(--secondary); margin-bottom: 0.5rem;">🎯 Data-Driven Areas to Improve</h4>
          <ul style="font-size: 0.9rem; padding-left: 1.2rem; margin: 0; color: var(--text-main);">
            ${(report.areas_to_improve || []).map(a => `<li style="margin-bottom: 0.35rem;">${a}</li>`).join("")}
          </ul>
        </div>
      </div>
    `;

    container.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    container.innerHTML = `<div class="alert-box error">❌ Failed to generate report: ${err.message}</div>`;
  }
}

// ==========================================================================
// AI FEEDBACK & SCORING MODULE - FRONTEND IMPLEMENTATION
// ==========================================================================

state.currentAssessment = null;

async function loadAndDisplayAssessment(interviewId, isRegenerate = false) {
  if (!interviewId) interviewId = "int_sample_001";
  
  navigateTo("assessment");
  window.scrollTo({ top: 0, behavior: "smooth" });

  const genBox = document.getElementById("assessment-generating-box");
  const contentContainer = document.getElementById("assessment-content-container");

  if (genBox) genBox.style.display = "block";
  if (contentContainer) contentContainer.style.display = "none";

  // Stage animation simulator corresponding to backend lifecycle
  const stageElements = [
    document.getElementById("stage-1"),
    document.getElementById("stage-2"),
    document.getElementById("stage-3"),
    document.getElementById("stage-4"),
    document.getElementById("stage-5"),
    document.getElementById("stage-6"),
    document.getElementById("stage-7")
  ];

  // Reset stage classes
  stageElements.forEach((el, idx) => {
    if (el) {
      el.className = "stage-item";
      el.querySelector(".stage-icon").innerText = "⏳";
    }
  });

  const advanceStage = (idx) => {
    if (stageElements[idx]) {
      stageElements[idx].className = "stage-item active";
      stageElements[idx].querySelector(".stage-icon").innerText = "⚡";
    }
    if (idx > 0 && stageElements[idx - 1]) {
      stageElements[idx - 1].className = "stage-item completed";
      stageElements[idx - 1].querySelector(".stage-icon").innerText = "✅";
    }
  };

  advanceStage(0);
  setTimeout(() => advanceStage(1), 300);
  setTimeout(() => advanceStage(2), 600);
  setTimeout(() => advanceStage(3), 900);
  setTimeout(() => advanceStage(4), 1200);
  setTimeout(() => advanceStage(5), 1500);
  setTimeout(() => advanceStage(6), 1800);

  const endpoint = isRegenerate
    ? `/api/interview/${interviewId}/assessment/regenerate`
    : `/api/interview/${interviewId}/assessment`;

  try {
    const assessmentData = await apiFetch(endpoint, {
      method: "POST"
    });

    state.currentAssessment = assessmentData;

    // Mark all stages completed
    stageElements.forEach((el) => {
      if (el) {
        el.className = "stage-item completed";
        el.querySelector(".stage-icon").innerText = "✅";
      }
    });

    const genTitle = document.getElementById("assess-gen-title");
    if (genTitle) genTitle.innerText = "Assessment Complete 🎉";

    setTimeout(() => {
      if (genBox) genBox.style.display = "none";
      if (contentContainer) {
        contentContainer.style.display = "flex";
        renderAssessmentDashboard(assessmentData, contentContainer);
      }
    }, 500);

  } catch (err) {
    if (genBox) {
      genBox.innerHTML = `
        <div class="alert-box error" style="max-width:600px; margin:0 auto;">
          <h3>Assessment Generation Error</h3>
          <p>${err.message}</p>
          <button class="btn btn-outline" style="margin-top:1rem;" onclick="routeRoleDashboard()">Return to Portal</button>
        </div>
      `;
    }
  }
}

function renderAssessmentDashboard(data, container) {
  // Update header metadata badges
  const domainBadge = document.getElementById("assess-domain-badge");
  const diffBadge = document.getElementById("assess-difficulty-badge");
  const typeBadge = document.getElementById("assess-type-badge");
  const candName = document.getElementById("assess-candidate-name");

  if (domainBadge) domainBadge.innerText = data.domain || "Full Stack";
  if (diffBadge) diffBadge.innerText = data.difficulty || "Medium";
  if (typeBadge) typeBadge.innerText = data.interview_type || "Technical";
  if (candName) candName.innerText = data.candidate_name || "Candidate";

  const ratingSlug = (data.performance_rating || "Good").toLowerCase().replace(/\s+/g, '-');
  const ratingBadgeClass = `rating-pill-${ratingSlug}`;

  const comm = data.communication || {};
  const conf = data.confidence || {};
  const tech = data.technical_relevance || {};
  const prof = data.professionalism || {};

  // Build Submetrics Table HTML
  const buildSubmetricsRows = (submetrics) => {
    return (submetrics || []).map(s => `
      <div class="submetric-row">
        <div>
          <strong>${s.name}</strong>
          <span style="font-size:0.75rem; color:var(--text-dim); margin-left:0.35rem;">(${Math.round(s.weight * 100)}%)</span>
        </div>
        <div>
          <div class="metric-bar" style="height:6px; margin-bottom:0.25rem;">
            <div class="metric-fill" style="width:${s.score !== null ? s.score : 0}%;"></div>
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted);">${s.evidence || s.description}</div>
        </div>
        <div style="text-align:right; font-weight:700; color:${s.score !== null ? 'var(--text-main)' : 'var(--text-dim)'};">
          ${s.score !== null ? `${s.score}%` : '<span class="badge badge-outline" style="font-size:0.65rem;">N/A</span>'}
        </div>
      </div>
    `).join("");
  };

  // Build Strengths, Weaknesses, Suggestions HTML
  const strengthsHtml = (data.strengths || []).map(s => `
    <li style="margin-bottom:0.4rem; display:flex; align-items:flex-start; gap:0.5rem;">
      <span style="color:var(--accent-success); font-weight:700;">✓</span> <span>${s}</span>
    </li>
  `).join("");

  const weaknessesHtml = (data.weaknesses || []).map(w => `
    <li style="margin-bottom:0.4rem; display:flex; align-items:flex-start; gap:0.5rem;">
      <span style="color:var(--accent-warning); font-weight:700;">⚠</span> <span>${w}</span>
    </li>
  `).join("");

  const suggestionsHtml = (data.improvement_suggestions || []).map(i => `
    <li style="margin-bottom:0.4rem; display:flex; align-items:flex-start; gap:0.5rem;">
      <span style="color:var(--secondary); font-weight:700;">💡</span> <span>${i}</span>
    </li>
  `).join("");

  const practiceHtml = (data.practice_recommendations || []).map(p => `
    <li style="margin-bottom:0.4rem; display:flex; align-items:flex-start; gap:0.5rem;">
      <span style="color:var(--primary); font-weight:700;">🎯</span> <span>${p}</span>
    </li>
  `).join("");

  // Build Learning Resources HTML
  const resourcesHtml = (data.learning_resources || []).map(r => `
    <div class="resource-item-card">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
          <span class="badge badge-candidate" style="font-size:0.7rem;">${r.category}</span>
          <span style="font-size:0.75rem; color:var(--text-dim);">${r.type}</span>
        </div>
        <h4 style="font-size:0.95rem; margin-bottom:0.35rem; color:var(--text-main);">${r.title}</h4>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">${r.description}</p>
      </div>
      <a href="${r.url}" target="_blank" class="btn btn-outline" style="font-size:0.8rem; text-decoration:none; text-align:center; padding:0.35rem;">
        Open Resource ↗
      </a>
    </div>
  `).join("");

  // Build Evidence HTML
  const evidenceHtml = (data.evidence || []).map(e => `
    <div class="evidence-card">
      <div class="evidence-header">
        <strong>${e.metric}</strong>
        <span class="badge badge-candidate">${e.score}%</span>
      </div>
      <div style="font-size:0.85rem; color:var(--text-main); margin-bottom:0.35rem;">
        🔍 <strong>Observation:</strong> ${e.evidence}
      </div>
      <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.35rem;">
        ⚡ <strong>Impact:</strong> ${e.impact}
      </div>
      <div style="font-size:0.8rem; color:var(--secondary);">
        💡 <strong>Action:</strong> ${e.recommendation}
      </div>
    </div>
  `).join("");

  // Build Question-Level Review HTML
  const questionsHtml = (data.question_evaluations || []).map((q, idx) => `
    <div class="q-eval-card">
      <div class="q-eval-header" onclick="toggleAccordionPanel('q-panel-${idx}')">
        <div>
          <span class="badge badge-outline" style="font-size:0.75rem; margin-right:0.5rem;">Q${idx + 1}</span>
          <strong style="font-size:0.95rem; color:var(--text-main);">${q.question.slice(0, 75)}${q.question.length > 75 ? '...' : ''}</strong>
        </div>
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <span class="badge ${q.score >= 75 ? 'badge-success' : 'badge-candidate'}" style="font-size:0.85rem; font-weight:700;">Score: ${q.score}%</span>
          <span style="font-size:0.85rem; color:var(--text-dim);" id="icon-q-panel-${idx}">▼</span>
        </div>
      </div>
      <div class="accordion-content" id="q-panel-${idx}" style="display:none; padding:1.25rem;">
        <div style="background:rgba(0,0,0,0.25); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:0.75rem 1rem; margin-bottom:1rem;">
          <label style="font-size:0.75rem; font-weight:700; color:var(--secondary); text-transform:uppercase;">Interview Question:</label>
          <p style="color:var(--text-main); font-size:0.95rem; margin-top:0.25rem;">${q.question}</p>
        </div>

        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:0.75rem 1rem; margin-bottom:1rem;">
          <label style="font-size:0.75rem; font-weight:700; color:var(--primary); text-transform:uppercase;">Candidate Spoken Answer:</label>
          <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.25rem; font-style:italic;">"${q.candidate_answer}"</p>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:0.5rem; margin-bottom:1rem; text-align:center;">
          <div class="telemetry-card" style="padding:0.6rem;">
            <span style="font-size:0.75rem; color:var(--text-dim);">Accuracy</span>
            <div style="font-weight:700; color:var(--text-main);">${q.technical_accuracy}%</div>
          </div>
          <div class="telemetry-card" style="padding:0.6rem;">
            <span style="font-size:0.75rem; color:var(--text-dim);">Keywords</span>
            <div style="font-weight:700; color:var(--text-main);">${q.keyword_relevance}%</div>
          </div>
          <div class="telemetry-card" style="padding:0.6rem;">
            <span style="font-size:0.75rem; color:var(--text-dim);">Problem Solving</span>
            <div style="font-weight:700; color:var(--text-main);">${q.problem_solving}%</div>
          </div>
          <div class="telemetry-card" style="padding:0.6rem;">
            <span style="font-size:0.75rem; color:var(--text-dim);">Domain</span>
            <div style="font-weight:700; color:var(--text-main);">${q.domain_knowledge}%</div>
          </div>
          <div class="telemetry-card" style="padding:0.6rem;">
            <span style="font-size:0.75rem; color:var(--text-dim);">Completeness</span>
            <div style="font-weight:700; color:var(--text-main);">${q.answer_completeness}%</div>
          </div>
        </div>

        <div style="font-size:0.88rem; color:var(--text-main); margin-bottom:0.5rem;">
          💬 <strong>AI Feedback:</strong> ${q.feedback}
        </div>
        <div style="font-size:0.85rem; color:var(--secondary); margin-bottom:0.75rem;">
          💡 <strong>Improvement Suggestion:</strong> ${q.improvement_suggestion}
        </div>

        ${(q.matched_keywords && q.matched_keywords.length) ? `
          <div style="margin-top:0.5rem;">
            <label style="font-size:0.75rem; color:var(--text-dim); font-weight:600;">Matched Concepts:</label>
            <div style="display:flex; gap:0.35rem; flex-wrap:wrap; margin-top:0.25rem;">
              ${q.matched_keywords.map(k => `<span class="skill-chip" style="font-size:0.75rem;">${k}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `).join("");

  container.innerHTML = `
    <!-- 1. Overall Performance Hero Banner -->
    <div class="overall-hero-card">
      <div class="overall-score-circle" style="--score-pct: ${data.overall_score};">
        <div class="overall-score-inner">
          <span class="overall-score-number">${data.overall_score}</span>
          <span class="overall-score-max">Score / 100</span>
        </div>
      </div>

      <div>
        <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem; flex-wrap:wrap;">
          <span class="badge ${ratingBadgeClass}" style="font-size:1.05rem; font-weight:700; padding:0.35rem 0.85rem;">
            Performance: ${data.performance_rating}
          </span>
          <span class="badge badge-success" style="font-size:0.85rem; padding:0.35rem 0.75rem;">
            Hiring Verdict: ${data.recommendation}
          </span>
        </div>
        <h2 style="font-size:1.6rem; margin-bottom:0.35rem;">Candidate Assessment Benchmark</h2>
        <p style="font-size:0.9rem; color:var(--text-muted); margin:0;">
          Calculated via deterministic 4-pillar weighting: Communication (30%), Confidence (25%), Technical Relevance (30%), and Professionalism (15%).
        </p>
      </div>

      <div style="text-align:right; font-size:0.85rem; color:var(--text-dim);">
        <div><strong>Interview ID:</strong> <code>${data.interview_id}</code></div>
        <div><strong>Session Duration:</strong> ${formatTimeHHMMSS(data.duration_seconds || 0)}</div>
        <div><strong>Questions Evaluated:</strong> ${data.questions_attempted} / ${data.total_questions}</div>
      </div>
    </div>

    <!-- 2. Four Core Category Score Cards -->
    <div class="category-cards-grid">
      
      <!-- Card 1: Communication -->
      <div class="cat-score-card">
        <div class="cat-card-header">
          <span class="cat-card-title">🎙️ Communication</span>
          <span class="cat-weight-tag">30% Weight</span>
        </div>
        <div class="cat-score-display">
          <span class="cat-score-num" style="color:var(--secondary);">${comm.score}%</span>
          <span class="cat-score-denom">/ 100</span>
        </div>
        <div class="metric-bar" style="height:6px; margin-bottom:0.75rem;">
          <div class="metric-fill" style="width:${comm.score}%; background:var(--secondary);"></div>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted);">
          Speech clarity, grammar precision, WPM pace (${comm.wpm || 135} WPM), and filler composure.
        </div>
      </div>

      <!-- Card 2: Confidence -->
      <div class="cat-score-card">
        <div class="cat-card-header">
          <span class="cat-card-title">👁️ Confidence</span>
          <span class="cat-weight-tag">25% Weight</span>
        </div>
        <div class="cat-score-display">
          <span class="cat-score-num" style="color:var(--primary);">${conf.score}%</span>
          <span class="cat-score-denom">/ 100</span>
        </div>
        <div class="metric-bar" style="height:6px; margin-bottom:0.75rem;">
          <div class="metric-fill" style="width:${conf.score}%; background:var(--primary);"></div>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted);">
          ${conf.video_analysis_available ? `Eye contact (${conf.eye_contact}%), facial engagement, and low hesitation.` : `Vocal poise, steady tempo, and minimal response hesitation.`}
        </div>
      </div>

      <!-- Card 3: Technical Relevance -->
      <div class="cat-score-card">
        <div class="cat-card-header">
          <span class="cat-card-title">⚡ Technical Relevance</span>
          <span class="cat-weight-tag">30% Weight</span>
        </div>
        <div class="cat-score-display">
          <span class="cat-score-num" style="color:var(--accent-success);">${tech.score}%</span>
          <span class="cat-score-denom">/ 100</span>
        </div>
        <div class="metric-bar" style="height:6px; margin-bottom:0.75rem;">
          <div class="metric-fill" style="width:${tech.score}%; background:var(--accent-success);"></div>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted);">
          Technical accuracy (${tech.technical_accuracy}%), domain knowledge, and problem-solving.
        </div>
      </div>

      <!-- Card 4: Professionalism -->
      <div class="cat-score-card">
        <div class="cat-card-header">
          <span class="cat-card-title">💼 Professionalism</span>
          <span class="cat-weight-tag">15% Weight</span>
        </div>
        <div class="cat-score-display">
          <span class="cat-score-num" style="color:var(--accent-warning);">${prof.score}%</span>
          <span class="cat-score-denom">/ 100</span>
        </div>
        <div class="metric-bar" style="height:6px; margin-bottom:0.75rem;">
          <div class="metric-fill" style="width:${prof.score}%; background:var(--accent-warning);"></div>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted);">
          Response organization, time management, and structured interview etiquette.
        </div>
      </div>

    </div>

    <!-- 3. Radar & Category Comparison Visualizer -->
    <div class="glass-card" style="margin-bottom:2rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.5rem;">
        <div>
          <h3 style="color:var(--secondary); margin-bottom:0.25rem;">📊 Multi-Pillar Competency Radar</h3>
          <p style="font-size:0.82rem; color:var(--text-muted);">Real-time competency mapping against the 80% baseline industry benchmark.</p>
        </div>
        <span class="badge badge-candidate">HTML5 Canvas Telemetry</span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:1.5rem; align-items:center;">
        <div style="display:flex; justify-content:center;">
          <canvas id="assessment-radar-canvas" width="360" height="280" style="max-width:100%; border-radius:var(--radius-sm);"></canvas>
        </div>
        <div>
          <h4 style="margin-bottom:0.75rem; font-size:0.95rem;">Category Score Comparison:</h4>
          
          <div class="metric-row" style="margin-bottom:0.75rem;">
            <div class="metric-header"><span>🎙️ Communication (30%)</span><strong>${comm.score}%</strong></div>
            <div class="metric-bar"><div class="metric-fill" style="width:${comm.score}%; background:var(--secondary);"></div></div>
          </div>

          <div class="metric-row" style="margin-bottom:0.75rem;">
            <div class="metric-header"><span>👁️ Confidence (25%)</span><strong>${conf.score}%</strong></div>
            <div class="metric-bar"><div class="metric-fill" style="width:${conf.score}%; background:var(--primary);"></div></div>
          </div>

          <div class="metric-row" style="margin-bottom:0.75rem;">
            <div class="metric-header"><span>⚡ Technical Relevance (30%)</span><strong>${tech.score}%</strong></div>
            <div class="metric-bar"><div class="metric-fill" style="width:${tech.score}%; background:var(--accent-success);"></div></div>
          </div>

          <div class="metric-row" style="margin-bottom:0.75rem;">
            <div class="metric-header"><span>💼 Professionalism (15%)</span><strong>${prof.score}%</strong></div>
            <div class="metric-bar"><div class="metric-fill" style="width:${prof.score}%; background:var(--accent-warning);"></div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. Expandable Sub-Metric Breakdowns Group -->
    <div style="margin-bottom:2rem;">
      <h3 style="margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
        <span>🔍 Detailed Metric Breakdowns</span>
        <span style="font-size:0.8rem; font-weight:normal; color:var(--text-dim);">Click to expand / collapse</span>
      </h3>

      <div class="breakdown-accordion-group">
        
        <!-- Accordion 1: Communication -->
        <div class="accordion-panel open" id="panel-comm">
          <button class="accordion-header-btn" onclick="toggleAccordionPanel('panel-comm')">
            <span>🎙️ Communication Score Breakdown (${comm.score}%)</span>
            <span id="icon-panel-comm">▲</span>
          </button>
          <div class="accordion-content" style="display:block;">
            ${buildSubmetricsRows(comm.sub_metrics)}
          </div>
        </div>

        <!-- Accordion 2: Confidence -->
        <div class="accordion-panel" id="panel-conf">
          <button class="accordion-header-btn" onclick="toggleAccordionPanel('panel-conf')">
            <span>👁️ Confidence Score Breakdown (${conf.score}%)</span>
            <span id="icon-panel-conf">▼</span>
          </button>
          <div class="accordion-content">
            ${buildSubmetricsRows(conf.sub_metrics)}
          </div>
        </div>

        <!-- Accordion 3: Technical Relevance -->
        <div class="accordion-panel" id="panel-tech">
          <button class="accordion-header-btn" onclick="toggleAccordionPanel('panel-tech')">
            <span>⚡ Technical Relevance Breakdown (${tech.score}%)</span>
            <span id="icon-panel-tech">▼</span>
          </button>
          <div class="accordion-content">
            ${buildSubmetricsRows(tech.sub_metrics)}
          </div>
        </div>

        <!-- Accordion 4: Professionalism -->
        <div class="accordion-panel" id="panel-prof">
          <button class="accordion-header-btn" onclick="toggleAccordionPanel('panel-prof')">
            <span>💼 Professionalism Breakdown (${prof.score}%)</span>
            <span id="icon-panel-prof">▼</span>
          </button>
          <div class="accordion-content">
            ${buildSubmetricsRows(prof.sub_metrics)}
          </div>
        </div>

      </div>
    </div>

    <!-- 5. Question-by-Question Evaluation Accordion List -->
    <div style="margin-bottom:2.5rem;">
      <h3 style="margin-bottom:1rem;">📝 Question-by-Question Deep Dive</h3>
      ${questionsHtml}
    </div>

    <!-- 6. Personalized Feedback Section -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:1.5rem; margin-bottom:2rem;">
      
      <!-- Strengths Card -->
      <div class="glass-card">
        <h3 style="color:var(--accent-success); margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
          <span>🌟</span> Key Strengths
        </h3>
        <ul style="padding:0; list-style:none; font-size:0.9rem;">
          ${strengthsHtml}
        </ul>
      </div>

      <!-- Weaknesses Card -->
      <div class="glass-card">
        <h3 style="color:var(--accent-warning); margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
          <span>🎯</span> Targeted Growth Areas
        </h3>
        <ul style="padding:0; list-style:none; font-size:0.9rem;">
          ${weaknessesHtml}
        </ul>
      </div>

    </div>

    <!-- 7. Actionable Improvement Suggestions & Practice Drills -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:1.5rem; margin-bottom:2rem;">
      
      <div class="glass-card">
        <h3 style="color:var(--secondary); margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
          <span>💡</span> Actionable Recommendations
        </h3>
        <ul style="padding:0; list-style:none; font-size:0.9rem;">
          ${suggestionsHtml}
        </ul>
      </div>

      <div class="glass-card">
        <h3 style="color:var(--primary); margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
          <span>🏋️</span> Personalized Practice Drills
        </h3>
        <ul style="padding:0; list-style:none; font-size:0.9rem;">
          ${practiceHtml}
        </ul>
      </div>

    </div>

    <!-- 8. Curated Learning Resources Grid -->
    ${(data.learning_resources && data.learning_resources.length) ? `
      <div class="glass-card" style="margin-bottom:2rem;">
        <h3 style="color:var(--secondary); margin-bottom:0.5rem;">📚 Recommended Learning Resources</h3>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.25rem;">Hand-picked documentation and practice frameworks to sharpen your interview performance.</p>
        <div class="resources-grid">
          ${resourcesHtml}
        </div>
      </div>
    ` : ''}

    <!-- 9. Explainable Assessment Evidence -->
    ${(data.evidence && data.evidence.length) ? `
      <div class="glass-card" style="margin-bottom:2.5rem;">
        <h3 style="color:var(--primary); margin-bottom:0.5rem;">🔬 Explainable Evidence & Impact Map</h3>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.25rem;">Every major feedback insight is directly backed by observed telemetry and transcript measurements.</p>
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
          ${evidenceHtml}
        </div>
      </div>
    ` : ''}

    <div style="display:flex; justify-content:center; gap:1rem; margin-top:1rem;">
      <button class="btn btn-outline" style="padding:0.75rem 1.75rem;" onclick="routeRoleDashboard()">
        ⬅️ Return to Candidate Portal
      </button>
      <button class="btn btn-primary" style="padding:0.75rem 1.75rem;" onclick="regenerateCurrentAssessment()">
        🔄 Regenerate Dynamic Assessment
      </button>
    </div>
  `;

  // Draw Radar Chart on Canvas
  setTimeout(() => {
    drawAssessmentRadarChart("assessment-radar-canvas", {
      "Communication": comm.score || 0,
      "Confidence": conf.score || 0,
      "Technical": tech.score || 0,
      "Professionalism": prof.score || 0
    });
  }, 100);
}

function toggleAccordionPanel(panelId) {
  const panel = document.getElementById(panelId);
  const icon = document.getElementById(`icon-${panelId}`);
  if (!panel) return;

  if (panel.style.display === "none" || !panel.style.display) {
    panel.style.display = "block";
    if (icon) icon.innerText = "▲";
  } else {
    panel.style.display = "none";
    if (icon) icon.innerText = "▼";
  }
}

function drawAssessmentRadarChart(canvasId, scores) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 35;

  ctx.clearRect(0, 0, width, height);

  const keys = Object.keys(scores);
  const values = Object.values(scores);
  const numAxes = keys.length;
  const angleStep = (Math.PI * 2) / numAxes;

  // Draw concentric polygon grid circles
  const levels = 4;
  for (let l = 1; l <= levels; l++) {
    const r = (radius / levels) * l;
    ctx.beginPath();
    for (let i = 0; i < numAxes; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw percentage labels on top axis
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "9px Outfit, sans-serif";
    ctx.fillText(`${l * 25}%`, centerX + 4, centerY - r + 8);
  }

  // Draw axis spokes
  for (let i = 0; i < numAxes; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.stroke();

    // Draw axis labels
    const labelDistance = radius + 20;
    const lx = centerX + Math.cos(angle) * labelDistance;
    const ly = centerY + Math.sin(angle) * labelDistance;

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 11px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${keys[i]} (${values[i]}%)`, lx, ly);
  }

  // Draw 80% Benchmark Reference Polygon
  ctx.beginPath();
  for (let i = 0; i < numAxes; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const r = (radius * 80) / 100;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw Actual Candidate Score Polygon
  ctx.beginPath();
  for (let i = 0; i < numAxes; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const valPct = Math.max(10, Math.min(100, values[i]));
    const r = (radius * valPct) / 100;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // Gradient fill for candidate polygon
  const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, radius);
  gradient.addColorStop(0, "rgba(99, 102, 241, 0.45)");
  gradient.addColorStop(1, "rgba(6, 182, 212, 0.2)");
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw vertices dots
  for (let i = 0; i < numAxes; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const valPct = Math.max(10, Math.min(100, values[i]));
    const r = (radius * valPct) / 100;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;

    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#38bdf8";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

async function regenerateCurrentAssessment() {
  if (!state.currentAssessment || !state.currentAssessment.interview_id) {
    await loadAndDisplayAssessment("int_sample_001", true);
    return;
  }
  await loadAndDisplayAssessment(state.currentAssessment.interview_id, true);
}

function exportAssessmentJSON() {
  if (!state.currentAssessment) {
    alert("No assessment data available to export.");
    return;
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.currentAssessment, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `assessment_${state.currentAssessment.interview_id || 'result'}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}