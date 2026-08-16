(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const q = (sel) => document.querySelector(sel);

  const typeLabel = (type) => {
    const map = { technical: "Technical Interview", hr: "HR / Behavioral", behavioral: "Behavioral Interview", resume: "Resume-Based Interview", coding: "Coding Practice", mixed: "Job Ready / Mixed" };
    return map[String(type || "").toLowerCase()] || "AI Interview";
  };

  const getState = () => window.interviewSessionState || null;
  const getLiveState = () => window.liveInterviewState || null;

  const updateStepper = (state) => {
    const wrap = $("shQuestionStepper");
    if (!wrap) return;
    const questions = Array.isArray(state?.questions) ? state.questions : [];
    const total = questions.length || 0;
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
    const answer = $("interviewAnswerBox")?.value || "";
    const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
    const started = Number(state?.questionStartedAt || 0);
    const elapsed = started ? Math.max(0, Math.floor((Date.now() - started) / 1000)) : 0;
    const mins = Math.floor(elapsed / 60), secs = elapsed % 60;
    if ($("shAnswerWords")) $("shAnswerWords").textContent = `${words} word${words === 1 ? "" : "s"}`;
    if ($("shResponseTime")) $("shResponseTime").textContent = `${mins}:${String(secs).padStart(2, "0")}`;
    if ($("shAnswerLengthState")) $("shAnswerLengthState").textContent = words === 0 ? "Waiting" : words < 30 ? "Short" : words <= 180 ? "Healthy" : "Detailed";
    if ($("shResponseTimeState")) $("shResponseTimeState").textContent = elapsed === 0 ? "Not started" : elapsed <= 120 ? "On pace" : "Take your time";
    let tip = "Give a structured answer with a clear situation, action and result.";
    if (words > 0 && words < 30) tip = "Add one concrete example or result to make your answer stronger.";
    else if (words > 180) tip = "Good detail. Keep the next answer focused on the most relevant points.";
    else if (elapsed > 120 && words < 20) tip = "Take a breath, then answer with your main point and one supporting example.";
    if ($("shAiTip")) $("shAiTip").textContent = tip;
  };

  const status = (el, text, state="ok") => {
    if (!el) return;
    el.textContent = text;
    el.classList.remove("warning", "error");
    if (state !== "ok") el.classList.add(state);
  };

  const updateSystem = () => {
    const live = getLiveState();
    const camera = !!live?.cameraOn;
    const mic = !!live?.micOn;
    const recording = !!live?.recordingActive;
    status($("shSystemCamera"), camera ? "Ready" : "Off", camera ? "ok" : "warning");
    status($("shSystemMic"), mic ? "Ready" : "Muted", mic ? "ok" : "warning");
    status($("shSystemRecording"), recording ? "Active" : "Idle", recording ? "ok" : "warning");
    status($("shSystemInternet"), navigator.onLine ? "Excellent" : "Offline", navigator.onLine ? "ok" : "error");
    const fetchError = $("interviewError")?.textContent?.toLowerCase().includes("failed to fetch") || false;
    status($("shSystemAI"), fetchError ? "Unavailable" : "Ready", fetchError ? "error" : "ok");
    const issues = [!camera, !mic, !navigator.onLine, fetchError].filter(Boolean).length;
    const summary = $("shSystemSummary");
    const note = $("shSystemNote");
    if (issues === 0) {
      if (summary) summary.textContent = "Ready";
      if (note) { note.className = "sh-system-note"; note.innerHTML = '<i class="fa-solid fa-circle-check"></i> Your interview environment is ready.'; }
    } else {
      if (summary) summary.textContent = `${issues} check${issues > 1 ? "s" : ""}`;
      if (note) { note.className = fetchError || !navigator.onLine ? "sh-system-note error" : "sh-system-note warning"; note.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${fetchError ? "AI service connection needs attention." : "Turn on your camera and microphone before answering."}`; }
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

  bind();
  tick();
  setInterval(tick, 1000);
})();
