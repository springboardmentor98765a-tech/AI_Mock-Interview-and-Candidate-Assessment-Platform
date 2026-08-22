(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const body = document.body;

  const isFullscreen = () => Boolean(document.fullscreenElement);
  const isInterviewActive = () => Boolean(window.interviewSessionState?.active);

  const createUI = () => {
    if ($("shExamModeGate")) return;

    const gate = document.createElement("div");
    gate.id = "shExamModeGate";
    gate.className = "sh-exam-gate";
    gate.innerHTML = `
      <div class="sh-exam-gate-card" role="dialog" aria-modal="true" aria-labelledby="shExamGateTitle">
        <div class="sh-exam-gate-icon"><i class="fa-solid fa-expand"></i></div>
        <span class="sh-exam-gate-kicker">SECURE INTERVIEW MODE</span>
        <h2 id="shExamGateTitle">Enter Full-Screen Interview</h2>
        <p>For a real exam-style experience, SmartHire keeps the interview workspace in full screen and keeps your camera visible while you scroll.</p>
        <div class="sh-exam-gate-checks">
          <span><i class="fa-solid fa-check"></i> Full-screen interview workspace</span>
          <span><i class="fa-solid fa-camera"></i> Fixed camera preview</span>
          <span><i class="fa-solid fa-microphone"></i> Microphone monitoring</span>
        </div>
        <button type="button" id="shEnterExamModeBtn" class="primary-btn sh-exam-enter-btn"><i class="fa-solid fa-expand"></i> Enter Exam Mode</button>
        <small>Chrome requires a user click before a website can enter full screen.</small>
      </div>`;
    document.body.appendChild(gate);

    const reentry = document.createElement("div");
    reentry.id = "shFullscreenReentry";
    reentry.className = "sh-fullscreen-reentry";
    reentry.innerHTML = `<span><i class="fa-solid fa-triangle-exclamation"></i> Full screen was exited. Interview is paused until Exam Mode is restored.</span><button type="button" id="shReenterExamBtn" class="primary-btn">Resume Exam Mode</button>`;
    document.body.appendChild(reentry);

    $("shEnterExamModeBtn")?.addEventListener("click", enterExamMode);
    $("shReenterExamBtn")?.addEventListener("click", enterExamMode);
  };

  const pauseIfNeeded = () => {
    if (!isInterviewActive()) return;
    const pause = $("interviewPauseBtn");
    if (pause && !pause.disabled && getComputedStyle(pause).display !== "none") {
      pause.click();
    }
  };

  const resumeIfNeeded = () => {
    const resume = $("interviewResumeBtn");
    if (resume && !resume.disabled && getComputedStyle(resume).display !== "none") {
      resume.click();
    }
  };

  async function enterExamMode() {
    try {
      const root = document.documentElement;
      if (!isFullscreen() && root.requestFullscreen) {
        await root.requestFullscreen({ navigationUI: "hide" });
      }
      body.classList.add("exam-mode");
      $("shExamModeGate")?.classList.add("hidden");
      $("shFullscreenReentry")?.classList.remove("visible");
      resumeIfNeeded();
    } catch (error) {
      const gate = $("shExamModeGate");
      if (gate) gate.classList.remove("hidden");
      const message = error?.name === "NotAllowedError"
        ? "Full screen was blocked. Click Enter Exam Mode again and allow the browser request."
        : "Unable to enter full screen. Please use Chrome/Edge on localhost and try again.";
      const small = gate?.querySelector("small");
      if (small) small.textContent = message;
    }
  }

  const handleFullscreenChange = () => {
    if (isFullscreen()) {
      body.classList.add("exam-mode");
      $("shExamModeGate")?.classList.add("hidden");
      $("shFullscreenReentry")?.classList.remove("visible");
      return;
    }

    if (!isInterviewActive()) return;
    body.classList.remove("exam-mode");
    pauseIfNeeded();
    $("shFullscreenReentry")?.classList.add("visible");
  };

  const pinCamera = () => {
    body.classList.add("camera-pinned");
  };

  const hideGateAfterCompletion = () => {
    const evaluation = $("interviewEvaluationResult");
    const completed = evaluation && getComputedStyle(evaluation).display !== "none";
    if (completed) {
      $("shExamModeGate")?.classList.add("hidden");
      $("shFullscreenReentry")?.classList.remove("visible");
    }
  };

  const init = () => {
    createUI();
    pinCamera();
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // The interview is launched automatically from interview-setup.html. The
    // fullscreen request itself must still come from a real user click.
    setTimeout(() => {
      if (!isFullscreen()) {
        $("shExamModeGate")?.classList.remove("hidden");
      }
    }, 900);

    setInterval(() => {
      pinCamera();
      hideGateAfterCompletion();
    }, 1000);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
