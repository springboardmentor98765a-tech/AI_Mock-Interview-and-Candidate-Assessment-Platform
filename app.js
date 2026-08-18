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
  sessionStatus: "Created" // Created, In Progress, Paused, Ended, Completed
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
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "API Request Failed");
    }
    return data;
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
  if (state.currentUser) {
    const roleBadgeClass = `badge-${state.currentUser.role}`;
    container.innerHTML = `
      <span style="font-size: 0.9rem; margin-right: 0.5rem;">
        Welcome, <strong>${state.currentUser.full_name}</strong>
      </span>
      <span class="badge ${roleBadgeClass}">${state.currentUser.role}</span>
      <button class="btn btn-outline" style="padding: 0.4rem 0.9rem; font-size: 0.85rem;" onclick="logout()">Logout</button>
    `;
  } else {
    container.innerHTML = `
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
            <label>Your Answer / Solution Outline</label>
            <textarea id="cand-answer-input" class="form-control" rows="5" placeholder="Type your response here..." ${state.sessionStatus === 'Paused' ? 'disabled' : ''} required>${currentQ.user_answer || ''}</textarea>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; flex-wrap: wrap; gap: 0.75rem;">
            <button type="submit" id="btn-submit-answer" class="btn btn-primary" ${state.sessionStatus === 'Paused' ? 'disabled' : ''}>
              ⚡ Evaluate Answer with AI
            </button>
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
  const container = document.getElementById("candidate-interview-section");
  container.innerHTML = `
    <div class="glass-card" style="text-align: center; padding: 3rem;">
      <div class="spinner" style="width:40px; height:40px;"></div>
      <h3 style="margin-top: 1rem;">Synthesizing Executive Performance Report...</h3>
      <p>Gemini 2.5 Flash is calculating category depth, strengths, and roadmap</p>
    </div>
  `;

  try {
    const data = await apiFetch(`/api/interview/${state.activeInterview.id}/finalize`, {
      method: "POST",
      body: JSON.stringify({ total_duration: state.totalElapsedSeconds })
    });
    
    // Fetch updated complete session data
    const fullReportData = await apiFetch(`/api/analytics/report/${state.activeInterview.id}`);
    renderFullReport(fullReportData.report, container, fullReportData);
  } catch (err) {
    alert(`Failed to finalize report: ${err.message}`);
  }
}

// Module 5: Performance Analytics & Session Storage Viewer
function renderFullReport(report, targetContainer, extraSessionData = {}) {
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
          <p>AI Evaluation Benchmark & Session Metrics</p>
        </div>
        <div style="text-align: right;">
          <span class="badge badge-success" style="font-size: 1.2rem; padding: 0.5rem 1rem;">
            Score: ${report.overall_score}% (${report.recommendation})
          </span>
        </div>
      </div>

      <!-- Module 5: Stored Session Metadata Card -->
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

      <!-- Module 3: Recording Playback & Video Download Container -->
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

      <button class="btn btn-outline btn-full" onclick="routeRoleDashboard()">Back to Candidate Dashboard</button>
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
            ? `<button class="btn btn-outline" style="font-size: 0.8rem; padding: 0.3rem 0.75rem;" onclick="openReportModal('${c.latest_interview_id}')">View Report</button>`
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
    renderFullReport(data.report, content, data);
  } catch (err) {
    content.innerHTML = `<p style="color: var(--accent-danger);">Failed to load report: ${err.message}</p>`;
  }
}

function closeReportModal() {
  document.getElementById("report-modal-overlay").style.display = "none";
}