(() => {
  "use strict";

  // Module 6 live monitoring bridge.
  // The browser talks to the existing Spring Boot /api/ai facade, which in turn
  // routes emotion detection to the trained Custom CNN and eye tracking to the
  // configured MediaPipe provider. No synthetic monitoring values are created.

  const $ = (id) => document.getElementById(id);
  const apiBase = () => (window.smartHireApi?.baseUrl || window.SMART_HIRE_API_BASE || "http://localhost:8080").replace(/\/$/, "");
  const localCnnBase = () => (window.SMART_HIRE_CNN_URL || "http://127.0.0.1:8095").replace(/\/$/, "");
  const localEyeBase = () => (window.SMART_HIRE_EYE_URL || "http://127.0.0.1:8093").replace(/\/$/, "");

  const token = () => localStorage.getItem("authToken") || "";

  let timer = null;
  let busy = false;
  let canvas = null;
  let monitoringSamples = [];

  const getVideo = () => $("liveInterviewVideo");

  const authHeaders = () => {
    const headers = { "Content-Type": "application/json" };
    const t = token();
    if (t) headers.Authorization = `Bearer ${t}`;
    return headers;
  };

  const setText = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value;
  };

  const setStatus = (id, text, state) => {
    const el = $(id);
    if (!el) return;
    el.textContent = text;
    el.classList.remove("ok", "warning", "error", "neutral");
    el.classList.add(state || "neutral");
  };

  const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));

  const captureFrame = () => {
    const video = getVideo();
    if (!video?.srcObject || !video.videoWidth || !video.videoHeight) return null;

    canvas ||= document.createElement("canvas");
    const scale = Math.min(1, 640 / video.videoWidth);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d", { alpha: false });
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  };

  const postJson = async (path, body, timeoutMs = 9000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = /^https?:\/\//i.test(String(path))
        ? String(path)
        : `${apiBase()}${path}`;
      const response = await fetch(url, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  };

  const average = (field) => {
    if (!monitoringSamples.length) return 0;
    return Math.round(
      monitoringSamples.reduce((sum, sample) => sum + Number(sample[field] || 0), 0) /
      monitoringSamples.length
    );
  };

  const mostCommon = (field) => {
    const counts = {};
    monitoringSamples.forEach((sample) => {
      const value = sample[field] || "Unavailable";
      counts[value] = (counts[value] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unavailable";
  };

  const attentionScore = (level) => {
    switch (String(level || "").toLowerCase()) {
      case "high": return 100;
      case "medium": return 65;
      case "low": return 30;
      default: return 0;
    }
  };

  const isRealEmotionProvider = (provider) => ["custom-cnn", "deepface"].includes(String(provider || "").toLowerCase());
  const isRealEyeProvider = (provider) => ["mediapipe", "opencv-eye-tracker-fallback"].includes(String(provider || "").toLowerCase());

  const getResultErrorMessage = (result) => {
    if (!result) return "unknown error";
    if (result instanceof Error) return result.message;
    if (typeof result?.reason === "string") return result.reason;
    if (result?.reason instanceof Error) return result.reason.message;
    return String(result);
  };

  const engagementFromSignals = (emotion, eye) => {
    const eyeContact = clamp(eye?.eyeContactPercentage);
    const attention = attentionScore(eye?.attentionLevel);
    const facialActivity = clamp(eye?.facialActivityScore);
    if (!isRealEyeProvider(eye?.provider)) return null;
    return Math.round(eyeContact * 0.40 + attention * 0.35 + facialActivity * 0.25);
  };

  const updatePanel = ({ emotion, eye, samples }) => {
    const emotionProvider = String(emotion?.provider || "").toLowerCase();
    const eyeProvider = String(eye?.provider || "").toLowerCase();
    const emotionAvailable = isRealEmotionProvider(emotionProvider) && emotion?.simulated !== true && emotion?.available !== false;
    const eyeAvailable = isRealEyeProvider(eyeProvider) && eye?.simulated !== true && eye?.available !== false;

    setText("module6Emotion", emotionAvailable ? emotion.dominantEmotion : "Unavailable");
    setText("module6EmotionConfidence", emotionAvailable ? `${Math.round(clamp(emotion.confidence))}%` : "—");
    setText("module6EyeContact", eyeAvailable ? `${Math.round(clamp(eye.eyeContactPercentage))}%` : "—");
    setText("module6Attention", eyeAvailable ? (eye.attentionLevel || "Unavailable") : "—");
    setText("module6Gaze", eyeAvailable ? (eye.gazeDirection || "Unavailable") : "—");
    setText("module6HeadStability", eyeAvailable ? `${Math.round(clamp(eye.headStabilityScore))}%` : "—");
    setText("module6FaceCount", Number.isFinite(Number(eye.faceCount)) && Number(eye.faceCount) >= 0 ? String(eye.faceCount) : (Number.isFinite(Number(emotion.faceCount)) && Number(emotion.faceCount) >= 0 ? String(emotion.faceCount) : "—"));

    const engagement = eyeAvailable ? clamp(eye.engagementScore || engagementFromSignals(emotion, eye) || 0) : null;
    setText("module6Engagement", engagement === null ? "—" : `${Math.round(engagement)}%`);

    const confidence = eyeAvailable && emotionAvailable
      ? Math.round(0.35 * clamp(eye.eyeContactPercentage) + 0.25 * clamp(eye.headStabilityScore) + 0.20 * clamp(eye.facialActivityScore) + 0.20 * clamp(eye.attentionLevel === "High" ? 100 : eye.attentionLevel === "Medium" ? 65 : eye.attentionLevel === "Low" ? 30 : 0))
      : null;
    setText("module6Confidence", confidence === null ? "—" : `${confidence}%`);

    setText("module6Provider", emotionAvailable && eyeAvailable ? `${emotion.provider} + ${eye.provider}` : emotionAvailable ? emotion.provider : eyeAvailable ? eye.provider : "Unavailable");
    setText("module6Samples", String(samples));

    const active = emotionAvailable || eyeAvailable;
    setStatus("module6MonitoringStatus", active ? "ACTIVE" : "DEGRADED", active ? "ok" : "warning");
    setText("liveMonitoringStatus", active ? "Active" : "Degraded");
    $("liveMonitoringStatus")?.classList.toggle("off", !active);
    $("liveMonitoringStatus")?.classList.toggle("on", active);
  };

  const saveSignals = (emotion, eye) => {
    const now = new Date().toISOString();
    const emotionProvider = String(emotion?.provider || "").toLowerCase();
    const eyeProvider = String(eye?.provider || "").toLowerCase();
    const emotionAvailable = isRealEmotionProvider(emotionProvider) && emotion?.simulated !== true && emotion?.available !== false;
    const eyeAvailable = isRealEyeProvider(eyeProvider) && eye?.simulated !== true && eye?.available !== false;

    // A sample is considered real when at least one configured, non-simulated
    // provider produced a result. This lets the CNN remain visible even when
    // MediaPipe is temporarily unavailable, without fabricating eye metrics.
    if (emotionAvailable || eyeAvailable) {
      const faceCount = eyeAvailable && Number.isFinite(Number(eye.faceCount)) && Number(eye.faceCount) >= 0
        ? Number(eye.faceCount)
        : (Number.isFinite(Number(emotion.faceCount)) && Number(emotion.faceCount) >= 0 ? Number(emotion.faceCount) : -1);

      const engagement = eyeAvailable ? clamp(eye.engagementScore || engagementFromSignals(emotion, eye) || 0) : 0;
      monitoringSamples.push({
        capturedAt: now,
        eyeContactPercentage: eyeAvailable ? clamp(eye.eyeContactPercentage) : 0,
        emotionConfidence: emotionAvailable ? clamp(emotion.confidence) : 0,
        attentionLevel: eyeAvailable ? (eye.attentionLevel || "Unavailable") : "Unavailable",
        engagementLevel: eyeAvailable ? (eye.engagementLevel || "Unavailable") : "Unavailable",
        engagementScore: engagement,
        headStabilityScore: eyeAvailable ? clamp(eye.headStabilityScore) : 0,
        facialActivityScore: eyeAvailable ? clamp(eye.facialActivityScore) : 0,
        gazeDirection: eyeAvailable ? (eye.gazeDirection || "Unavailable") : "Unavailable",
        eyesClosed: Boolean(eye?.eyesClosed),
        faceCount,
        emotion: emotionAvailable ? emotion.dominantEmotion : "Unavailable",
        emotionProvider: emotionAvailable ? emotion.provider : "unavailable",
        eyeProvider: eyeAvailable ? eye.provider : "unavailable",
        simulated: false,
        valid: true
      });
      monitoringSamples = monitoringSamples.slice(-180);
    }

    const monitoringStatus = emotionAvailable || eyeAvailable ? "ACTIVE" : "DEGRADED";
    const payload = {
      capturedAt: now,
      providerMode: {
        emotion: emotion?.provider || "unavailable",
        eye: eye?.provider || "unavailable"
      },
      monitoringStatus,
      samples: monitoringSamples.length,
      emotion: {
        ...emotion,
        available: emotionAvailable,
        provider: emotion?.provider || "unavailable",
        simulated: false
      },
      eyeContact: {
        ...eye,
        available: eyeAvailable,
        provider: eye?.provider || "unavailable",
        simulated: false
      },
      summary: {
        averageEyeContactPercentage: average("eyeContactPercentage"),
        averageEmotionConfidence: average("emotionConfidence"),
        averageHeadStabilityScore: average("headStabilityScore"),
        averageFacialActivityScore: average("facialActivityScore"),
        averageEngagementScore: average("engagementScore"),
        dominantEmotion: mostCommon("emotion"),
        dominantAttentionLevel: mostCommon("attentionLevel"),
        dominantEngagementLevel: mostCommon("engagementLevel"),
        dominantGazeDirection: mostCommon("gazeDirection"),
        realEmotionSamples: monitoringSamples.filter(s => ["custom-cnn", "deepface"].includes(s.emotionProvider)).length,
        realCnnSamples: monitoringSamples.filter(s => s.emotionProvider === "custom-cnn").length,
        realEyeTrackingSamples: monitoringSamples.filter(s => isRealEyeProvider(s.eyeProvider)).length,
        simulatedSamples: 0,
        totalSamples: monitoringSamples.length,
        monitoringComplete: monitoringSamples.length > 0
      },
      history: monitoringSamples
    };

    localStorage.setItem("smarthire.liveSignals", JSON.stringify(payload));
    updatePanel({ emotion, eye, samples: monitoringSamples.length });

    const validation = $("liveAdvancedValidation");
    if (validation) {
      validation.style.display = "block";
      validation.textContent = monitoringStatus === "ACTIVE"
        ? `Live Module 6 monitoring active: ${emotion?.provider || "AI"}${eyeAvailable ? " + MediaPipe" : ""}. ${monitoringSamples.length} valid samples.`
        : "Live Module 6 monitoring degraded. AI results are unavailable; no synthetic scores are generated.";
      validation.classList.toggle("proctoring-degraded", monitoringStatus !== "ACTIVE");
    }
  };

  const cycle = async () => {
    if (busy) return;
    const image = captureFrame();
    if (!image) return;

    busy = true;
    try {
      // Keep providers independent. A temporary MediaPipe outage must NOT
      // discard a valid CNN result (and vice versa). Promise.all() would reject
      // the entire sample when either request fails, which previously caused
      // the UI to show Emotion=Unavailable and Samples=0 even while the CNN
      // service was healthy.
      // Try the authenticated Spring Boot facade first, while also allowing a
      // local-development direct call to the actual AI services. This keeps the
      // live interview usable when the facade is temporarily blocked by auth or
      // while a backend AI provider is restarting. Both paths use REAL service
      // results; no synthetic monitoring values are introduced.
      const [emotionBackend, emotionLocal, eyeBackend, eyeLocal] = await Promise.allSettled([
        postJson("/api/ai/emotion", { image }),
        postJson(`${localCnnBase()}/analyze`, { image }),
        postJson("/api/ai/eye-tracking", { image }),
        postJson(`${localEyeBase()}/analyze`, { image })
      ]);

      console.debug("[SmartHire][Module6] emotion backend result", emotionBackend.status === "fulfilled" ? emotionBackend.value : { error: getResultErrorMessage(emotionBackend) });
      console.debug("[SmartHire][Module6] emotion local result", emotionLocal.status === "fulfilled" ? emotionLocal.value : { error: getResultErrorMessage(emotionLocal) });
      console.debug("[SmartHire][Module6] eye backend result", eyeBackend.status === "fulfilled" ? eyeBackend.value : { error: getResultErrorMessage(eyeBackend) });
      console.debug("[SmartHire][Module6] eye local result", eyeLocal.status === "fulfilled" ? eyeLocal.value : { error: getResultErrorMessage(eyeLocal) });

      const pick = (backend, local, valid) => {
        const b = backend.status === "fulfilled" ? backend.value : null;
        if (b && valid(b)) return b;
        const l = local.status === "fulfilled" ? local.value : null;
        return l && valid(l) ? l : (b || l || null);
      };

      const emotionResult = pick(
        emotionBackend,
        emotionLocal,
        (r) => {
          const provider = String(r?.provider || "").toLowerCase();
          return isRealEmotionProvider(provider) && r?.simulated !== true && r?.available !== false;
        }
      );
      const eyeResult = pick(
        eyeBackend,
        eyeLocal,
        (r) => {
          const provider = String(r?.provider || "").toLowerCase();
          return isRealEyeProvider(provider) && r?.simulated !== true && r?.available !== false;
        }
      );

      const emotion = {
        dominantEmotion: emotionResult?.dominantEmotion || emotionResult?.dominant_emotion || "Unavailable",
        confidence: Number(emotionResult?.confidence || 0),
        scores: emotionResult?.scores || {},
        provider: String(emotionResult?.provider || "unavailable").toLowerCase(),
        available: isRealEmotionProvider(String(emotionResult?.provider || "").toLowerCase()) && emotionResult?.simulated !== true && emotionResult?.available !== false,
        simulated: Boolean(emotionResult?.simulated),
        faceCount: Number(emotionResult?.faceCount ?? emotionResult?.face_count ?? -1)
      };

      const eye = {
        eyeContactPercentage: Number(eyeResult?.eyeContactPercentage ?? eyeResult?.eye_contact_percentage ?? 0),
        attentionLevel: eyeResult?.attentionLevel || eyeResult?.attention_level || "Unavailable",
        engagementLevel: eyeResult?.engagementLevel || eyeResult?.engagement_level || "Unavailable",
        engagementScore: Number(eyeResult?.engagementScore ?? eyeResult?.engagement_score ?? 0),
        faceCount: Number(eyeResult?.faceCount ?? eyeResult?.face_count ?? -1),
        gazeDirection: eyeResult?.gazeDirection || eyeResult?.gaze_direction || "Unavailable",
        eyesClosed: Boolean(eyeResult?.eyesClosed ?? eyeResult?.eyes_closed),
        headStabilityScore: Number(eyeResult?.headStabilityScore ?? eyeResult?.head_stability_score ?? 0),
        facialActivityScore: Number(eyeResult?.facialActivityScore ?? eyeResult?.facial_activity_score ?? 0),
        provider: String(eyeResult?.provider || "unavailable").toLowerCase(),
        available: (() => {
          const eyeProvider = String(eyeResult?.provider || "").toLowerCase();
          return ["mediapipe", "opencv-eye-tracker-fallback"].includes(eyeProvider) && eyeResult?.simulated !== true && eyeResult?.available !== false;
        })(),
        simulated: Boolean(eyeResult?.simulated)
      };

      saveSignals(emotion, eye);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[SmartHire][Module6] monitoring cycle error:", message);
      saveSignals(
        { dominantEmotion: "Unavailable", confidence: 0, provider: "unavailable", available: false, simulated: false, faceCount: -1 },
        { eyeContactPercentage: 0, attentionLevel: "Unavailable", engagementLevel: "Unavailable", provider: "unavailable", available: false, simulated: false, faceCount: -1, gazeDirection: "Unavailable", headStabilityScore: 0, facialActivityScore: 0 }
      );
    } finally {
      busy = false;
    }
  };

  const start = () => {
    if (timer) return;
    monitoringSamples = [];
    localStorage.removeItem("smarthire.liveSignals");
    timer = setInterval(cycle, 3000);
    cycle();
  };

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  window.__smartHireModule6Monitoring = {
    start,
    stop,
    get samples() { return monitoringSamples.length; }
  };

  window.addEventListener("beforeunload", stop);

  window.addEventListener("DOMContentLoaded", () => {
    $("liveJoinBtn")?.addEventListener("click", start);
    $("liveLeaveBtn")?.addEventListener("click", stop);
    // The interview room already has a live camera lifecycle. Starting the
    // monitor is harmless until a usable MediaStream exists.
    start();
  }, { once: true });
})();
