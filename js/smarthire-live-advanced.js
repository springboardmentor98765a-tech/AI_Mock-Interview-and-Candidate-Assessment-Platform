/* SmartHire Live Interview — synchronized signals/controller */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const typeLabel = (type) => {
    const map = { technical: "Technical Interview", hr: "HR / Behavioral", behavioral: "Behavioral Interview", resume: "Resume-Based Interview", coding: "Coding Practice", mixed: "Job Ready / Mixed" };
    return map[String(type || "").toLowerCase()] || "AI Interview";
  };
  const getState = () => window.interviewSessionState || null;
  const getLiveState = () => window.liveInterviewState || null;

  const actualTracks = () => {
    const live = getLiveState();
    const stream = live?.stream || $("liveInterviewVideo")?.srcObject || null;
    const videoTrack = stream?.getVideoTracks?.()[0] || null;
    const audioTrack = stream?.getAudioTracks?.()[0] || null;
    return {
      stream,
      videoTrack,
      audioTrack,
      cameraOn: Boolean(videoTrack && videoTrack.readyState !== "ended" && videoTrack.enabled),
      micOn: Boolean(audioTrack && audioTrack.readyState !== "ended" && audioTrack.enabled)
    };
  };

  const updateStepper = (state) => {
    const wrap = $("shQuestionStepper");
    if (!wrap) return;
    const questions = Array.isArray(state?.questions) ? state.questions : [];
    const total = questions.length;
    const current = Number(state?.currentIndex || 0);
    const answers = state?.answers || {};
    wrap.innerHTML = "";
    if (!total) {
      wrap.innerHTML = '<span style="color:#817b92;font-size:11px;font-weight:700">Waiting for AI questions…</span>';
      if ($("shProgressSummary")) $("shProgressSummary").textContent = "Waiting";
      return;
    }
    for (let i = 0; i < total; i++) {
      const step = document.createElement("div");
      step.className = "sh-step" + (i < current ? " done" : "") + (i === current ? " current" : "");
      const dot = document.createElement("span");
      dot.className = "sh-step-dot";
      const answered = typeof answers[i] === "string" && answers[i].trim();
      dot.textContent = i < current && answered ? "✓" : String(i + 1);
      step.appendChild(dot);
      wrap.appendChild(step);
    }
    if ($("shProgressSummary")) $("shProgressSummary").textContent = `${Math.min(current + 1, total)} / ${total}`;
  };

  const updateContext = (state) => {
    const current = state?.questions?.[Number(state?.currentIndex || 0)] || {};
    const role = state?.jobRole || localStorage.getItem("smarthire.jobRole") || $("liveRoomRolePill")?.textContent || "Interview";
    const type = state?.interviewType || "technical";
    const difficulty = current.difficulty || state?.difficulty || "Medium";
    const question = current.question || $("interviewQuestionText")?.textContent || "Your current AI-generated question will appear here.";
    if ($("shContextRole")) $("shContextRole").textContent = role;
    if ($("shContextType")) $("shContextType").textContent = typeLabel(type);
    if ($("shContextDifficulty")) $("shContextDifficulty").textContent = difficulty;
    if ($("shContextQuestion")) $("shContextQuestion").textContent = question;
    if ($("shQuestionType")) $("shQuestionType").textContent = current.category || "General";
    if ($("shQuestionDifficulty")) $("shQuestionDifficulty").textContent = difficulty;
    if ($("shQuestionTime")) $("shQuestionTime").textContent = "~2 min";
    const total = state?.questions?.length || 0;
    const idx = Number(state?.currentIndex || 0);
    if ($("shQuestionProgress")) $("shQuestionProgress").textContent = total ? `${Math.round(((idx + 1) / total) * 100)}%` : "0%";
  };

  const updateInsights = (state) => {
    const answerBox = $("interviewAnswerBox");
    const live = getLiveState();
    let speechInsight = null;
    try { speechInsight = JSON.parse(localStorage.getItem("smarthire.speechInsights") || "null"); } catch (_) {}
    const speechText = [live?.transcript || "", live?.speechInterimTranscript || ""].filter(Boolean).join(" ").trim();
    const answer = (answerBox?.value || speechText || live?.transcript || "").trim();
    const words = answer ? answer.split(/\s+/).length : 0;
    const started = Number(state?.questionStartedAt || 0);
    const paused = Boolean(state?.paused);
    const elapsed = started && !paused ? Math.max(0, Math.floor((Date.now() - started) / 1000)) : 0;
    const mins = Math.floor(elapsed / 60), secs = elapsed % 60;
    if ($("shAnswerWords")) $("shAnswerWords").textContent = `${words} word${words === 1 ? "" : "s"}`;
    if ($("shResponseTime")) $("shResponseTime").textContent = `${mins}:${String(secs).padStart(2, "0")}`;
    if ($("shAnswerLengthState")) $("shAnswerLengthState").textContent = words === 0 ? "Waiting" : words < 30 ? "Short" : words <= 180 ? "Healthy" : "Detailed";
    if ($("shResponseTimeState")) $("shResponseTimeState").textContent = elapsed === 0 ? (paused ? "Paused" : "Not started") : elapsed <= 120 ? "On pace" : "Take your time";
    let tip = "Give a structured answer with a clear situation, action and result.";
    if (words > 0 && words < 30) tip = "Add one concrete example or result to make your answer stronger.";
    else if (words > 180) tip = "Good detail. Keep the next answer focused on the most relevant points.";
    else if (elapsed > 120 && words < 20) tip = "Take a breath, then answer with your main point and one supporting example.";
    if ($("shAiTip")) $("shAiTip").textContent = tip;

    const pace = Number(speechInsight?.speakingPaceWpm || 0);
    const fillers = Number(speechInsight?.fillerWordCount || 0);
    const communication = Number(speechInsight?.communicationScore || 0);
    if ($("shSpeechPace")) $("shSpeechPace").textContent = `${Math.round(pace)} WPM`;
    if ($("shSpeechPaceState")) $("shSpeechPaceState").textContent = pace === 0 ? "Waiting" : pace <= 165 ? "Good pace" : "Fast";
    if ($("shFillerWords")) $("shFillerWords").textContent = String(Math.round(fillers));
    if ($("shFillerWordsState")) $("shFillerWordsState").textContent = fillers <= 3 ? "Excellent" : fillers <= 8 ? "Good" : "Needs focus";
    if ($("shCommunicationScore")) $("shCommunicationScore").textContent = `${Math.round(communication)}%`;
    if ($("shCommunicationState")) $("shCommunicationState").textContent = communication === 0 ? "Waiting" : communication >= 75 ? "Good" : communication >= 60 ? "Average" : "Improve";
  };

  const status = (el, text, state = "ok") => {
    if (!el) return;
    el.textContent = text;
    el.classList.remove("warning", "error", "ok");
    el.classList.add(state);
  };

  const updateSystem = () => {
    const live = getLiveState();
    const tracks = actualTracks();
    const camera = tracks.cameraOn;
    const mic = tracks.micOn;
    const recording = Boolean(live?.recordingActive || live?.videoRecorder?.state === "recording" || live?.audioRecorder?.state === "recording");
    const speechListening = Boolean(live?.speechListening);
    const online = navigator.onLine;
    const fetchError = $("interviewError")?.textContent?.toLowerCase().includes("failed to fetch") || false;

    // Keep the source state synchronized with actual MediaStream tracks.
    if (live && live.stream === tracks.stream) {
      live.cameraOn = camera;
      live.micOn = mic;
      live.recordingActive = recording;
    }

    status($("shSystemCamera"), camera ? "ON" : "OFF", camera ? "ok" : "warning");
    status($("shSystemMic"), mic ? "LIVE" : "MUTED", mic ? "ok" : "warning");
    status($("shSystemRecording"), recording ? "RECORDING" : "IDLE", recording ? "ok" : "warning");
    status($("shSystemInternet"), online ? "ONLINE" : "OFFLINE", online ? "ok" : "error");
    status($("shSystemAI"), fetchError ? "UNAVAILABLE" : "READY", fetchError ? "error" : "ok");

    // The main camera card and environment summary use the same real state.
    const cameraPill = $("liveCameraStatus");
    if (cameraPill) {
      cameraPill.textContent = camera ? "On" : "Off";
      cameraPill.classList.toggle("on", camera);
      cameraPill.classList.toggle("off", !camera);
    }
    if ($("liveCameraStatusText")) $("liveCameraStatusText").textContent = camera ? "ON" : "OFF";
    if ($("liveMicStatus")) $("liveMicStatus").textContent = mic ? "LIVE" : "MUTED";
    if ($("liveRecordingStatusText")) $("liveRecordingStatusText").textContent = recording ? "RECORDING" : "IDLE";
    if ($("liveRecordingStatus")) {
      $("liveRecordingStatus").textContent = recording ? "Recording" : "Idle";
      $("liveRecordingStatus").classList.toggle("on", recording);
      $("liveRecordingStatus").classList.toggle("off", !recording);
    }

    const summary = $("shSystemSummary");
    const note = $("shSystemNote");
    const issues = [!camera, !mic, !online, fetchError].filter(Boolean).length;
    if (issues === 0) {
      if (summary) summary.textContent = "All systems operational";
      if (note) { note.className = "sh-system-note"; note.innerHTML = '<i class="fa-solid fa-circle-check"></i> Camera, microphone, connection and AI services are ready.'; }
    } else {
      if (summary) summary.textContent = `${issues} check${issues > 1 ? "s" : ""}`;
      let message = !camera || !mic ? "Turn on your camera and microphone before answering." : "Interview environment needs attention.";
      if (fetchError) message = "AI service connection needs attention.";
      if (!online) message = "Internet connection is offline.";
      if (note) { note.className = fetchError || !online ? "sh-system-note error" : "sh-system-note warning"; note.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${message}`; }
    }

    const monitoring = $("liveAdvancedValidation");
    if (monitoring && !speechListening && camera && mic) {
      monitoring.style.display = "none";
    }
  };

  const clickExisting = (id) => { const el = $(id); if (el) el.click(); };

  const bind = () => {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-sh-control]");
      if (!btn) return;
      const action = btn.dataset.shControl;
      if (action === "mic") clickExisting("liveMicToggleBtn");
      if (action === "camera") clickExisting("liveCameraToggleBtn");
      if (action === "play") clickExisting("liveQuestionPlayBtn");
      if (action === "pause") clickExisting("interviewPauseBtn");
      if (action === "help") clickExisting("liveHelpBtn");
    });
    $("shContextPlay")?.addEventListener("click", () => clickExisting("liveQuestionPlayBtn"));
    $("shContextRepeat")?.addEventListener("click", () => clickExisting("liveQuestionPlayBtn"));
    $("interviewAnswerBox")?.addEventListener("input", () => updateInsights(getState()));
    window.addEventListener("online", updateSystem);
    window.addEventListener("offline", updateSystem);
  };

  const tick = () => {
    const state = getState();
    updateStepper(state);
    updateContext(state);
    updateInsights(state);
    updateSystem();
  };

  const init = () => {
    bind();
    tick();
    window.setInterval(tick, 500);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
