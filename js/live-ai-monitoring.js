(() => {
  "use strict";
  window.__smartHireRealMonitoring = true;
  const video = () => document.getElementById("liveInterviewVideo");
  const apiBase = () => (window.smartHireApi?.baseUrl || "http://localhost:8080") + "/api/ai";
  let timer = null;
  let busy = false;
  let canvas = null;

  const updatePill = (id, text, ok = true) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("on", ok);
    el.classList.toggle("off", !ok);
  };

  const captureFrame = () => {
    const v = video();
    if (!v || !v.videoWidth || !v.videoHeight || !v.srcObject) return null;
    canvas ||= document.createElement("canvas");
    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / v.videoWidth);
    canvas.width = Math.max(1, Math.round(v.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(v.videoHeight * scale));
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  };

  const saveSignals = (emotion, eye) => {
    const payload = {
      emotion: emotion || null,
      eyeContact: eye || null,
      capturedAt: new Date().toISOString(),
      providerMode: {
        emotion: emotion?.provider || "unavailable",
        eye: eye?.provider || "unavailable"
      }
    };
    localStorage.setItem("smarthire.liveSignals", JSON.stringify(payload));
    const eyePct = Number(eye?.eyeContactPercentage || 0);
    updatePill("liveEmotionLabel", emotion?.dominantEmotion || "Neutral", true);
    updatePill("liveEyeContactPct", `${Math.round(eyePct)}%`, eyePct >= 50);
    updatePill("liveAttentionLevel", eye?.attentionLevel || "Low", eye?.attentionLevel !== "Low");
    updatePill("liveEngagementLevel", eye?.engagementLevel || "Low", eye?.engagementLevel !== "Low");
  };

  const post = async (path, body) => {
    const response = await fetch(`${apiBase()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}` },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };

  const localFallback = () => {
    const v = video();
    const active = Boolean(v?.srcObject);
    return {
      emotion: { dominantEmotion: active ? "Neutral" : "Unavailable", confidence: active ? 62 : 0, provider: "local-fallback", simulated: true },
      eye: { eyeContactPercentage: active ? 60 : 0, lookingAway: !active, attentionLevel: active ? "Medium" : "Low", engagementLevel: active ? "Medium" : "Low", provider: "local-fallback", simulated: true }
    };
  };

  const cycle = async () => {
    if (busy) return;
    const image = captureFrame();
    if (!image) return;
    busy = true;
    try {
      const [emotionResult, eyeResult] = await Promise.all([
        post("/emotion", { image }),
        post("/eye-tracking", { image })
      ]);
      const emotion = {
        dominantEmotion: emotionResult.dominantEmotion || emotionResult.dominant_emotion || "Neutral",
        confidence: Number(emotionResult.confidence || 0),
        scores: emotionResult.scores || emotionResult.emotion || {},
        provider: emotionResult.provider || "deepface",
        simulated: Boolean(emotionResult.simulated)
      };
      const eye = {
        eyeContactPercentage: Number(eyeResult.eyeContactPercentage ?? eyeResult.eye_contact_percentage ?? 0),
        lookingAway: Number(eyeResult.eyeContactPercentage ?? eyeResult.eye_contact_percentage ?? 0) < 45,
        attentionLevel: eyeResult.attentionLevel || eyeResult.attention_level || "Low",
        engagementLevel: (Number(eyeResult.eyeContactPercentage ?? eyeResult.eye_contact_percentage ?? 0) >= 70 ? "High" : Number(eyeResult.eyeContactPercentage ?? eyeResult.eye_contact_percentage ?? 0) >= 45 ? "Medium" : "Low"),
        provider: eyeResult.provider || "mediapipe",
        simulated: Boolean(eyeResult.simulated)
      };
      saveSignals(emotion, eye);
    } catch (error) {
      const fallback = localFallback();
      saveSignals(fallback.emotion, fallback.eye);
      const status = document.getElementById("liveAdvancedValidation");
      if (status) {
        status.style.display = "block";
        status.textContent = "Real-time AI monitoring service unavailable; SmartHire is using local safe fallback metrics.";
      }
    } finally {
      busy = false;
    }
  };

  const start = () => {
    if (timer) return;
    cycle();
    timer = window.setInterval(cycle, 3000);
  };
  const stop = () => { if (timer) window.clearInterval(timer); timer = null; };

  window.addEventListener("beforeunload", stop);
  window.addEventListener("DOMContentLoaded", () => {
    const join = document.getElementById("liveJoinBtn");
    const leave = document.getElementById("liveLeaveBtn");
    join?.addEventListener("click", start);
    leave?.addEventListener("click", stop);
    start();
  });
})();
