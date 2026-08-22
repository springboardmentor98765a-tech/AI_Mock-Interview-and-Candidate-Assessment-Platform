(() => {
  const token = localStorage.getItem("authToken");
  const role = localStorage.getItem("userRole");

  if (!token || role !== "candidate") {
    return;
  }

  const apiBase = (window.smartHireApi && window.smartHireApi.baseUrl)
    ? window.smartHireApi.baseUrl
    : "http://localhost:8080";

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`
  });

  const $ = (id) => document.getElementById(id);
  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  const scoreText = (n) => Number.isFinite(Number(n)) ? `${Math.round(Number(n))}%` : "—";
  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  const userName = localStorage.getItem("userName") || "Candidate";
  const userEmail = localStorage.getItem("userEmail") || "";
  setText("dashboardUserName", userName);
  setText("dashboardUserRole", "Candidate");
  setText("sidebarUserName", userName);
  setText("sidebarUserEmail", userEmail || "Signed in");
  setText("welcomeHeading", `Good morning, ${userName} 👋`);
  setText("welcomeSubtitle", "Track your progress and improve your interview skills with AI guidance.");

  // Sidebar + responsive navigation
  const sidebar = $("candidateSidebar");
  const sidebarCollapse = $("sidebarCollapse");
  const SIDEBAR_PREF_KEY = "smarthire.sidebarCollapsed.v2";
  const syncSidebarToggle = () => {
    const collapsed = sidebar?.classList.contains("collapsed");
    if (sidebarCollapse) {
      sidebarCollapse.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
      sidebarCollapse.setAttribute("title", collapsed ? "Expand sidebar" : "Collapse sidebar");
      const icon = sidebarCollapse.querySelector("i");
      if (icon) icon.className = collapsed ? "fa-solid fa-chevron-right" : "fa-solid fa-chevron-left";
    }
  };
  sidebarCollapse?.addEventListener("click", () => {
    sidebar?.classList.toggle("collapsed");
    localStorage.setItem(SIDEBAR_PREF_KEY, sidebar?.classList.contains("collapsed") ? "1" : "0");
    syncSidebarToggle();
  });
  // Start expanded by default. The v2 preference intentionally ignores the
  // old collapsed flag created by earlier builds so users are not surprised
  // by a permanently collapsed navigation after an upgrade.
  if (localStorage.getItem(SIDEBAR_PREF_KEY) === "1") sidebar?.classList.add("collapsed");
  syncSidebarToggle();
  $("mobileMenu")?.addEventListener("click", () => sidebar?.classList.toggle("mobile-open"));
  document.querySelectorAll(".candidate-nav-link").forEach((link) => {
    link.addEventListener("click", () => sidebar?.classList.remove("mobile-open"));
  });

  // Global SmartHire theme controller owns light/dark mode for all pages.
  // Keeping a single controller prevents double-toggle bugs when both the
  // dashboard script and smarthire-theme.js listen to the same button.

  const setRing = (id, value) => {
    const el = $(id);
    if (!el) return;
    const n = clamp(value);
    el.style.setProperty("--value", Number.isFinite(Number(value)) ? n : 0);
  };

  const renderHistory = (items) => {
    const body = $("interviewHistoryBody");
    if (!body) return;

    if (!Array.isArray(items) || !items.length) {
      body.innerHTML = '<tr><td colspan="4" class="empty-state">No completed interviews yet. Start your first AI mock interview.</td></tr>';
      setText("candidateInterviewCountValue", "0");
      setText("candidateInterviewCountHint", "Start your first AI interview");
      setText("candidateOverallPerformanceValue", "—");
      setText("candidateOverallPerformanceHint", "Complete an interview to score");
      setText("readinessValue", "—");
      setText("growthValue", "—");
      setText("prepProgressText", "Ready for your first session");
      setText("preparationRole", "Start your first interview");
      setText("latestReportRole", "No report yet");
      setText("latestReportDate", "Complete an interview to generate a report");
      return;
    }

    const safeItems = items.filter(Boolean);
    const scores = safeItems.map(x => Number(x.overallScore)).filter(Number.isFinite);
    const avg = scores.length ? scores.reduce((a,b) => a+b, 0) / scores.length : null;
    const latest = safeItems[0];
    const latestScore = Number(latest?.overallScore);
    const firstScore = Number(safeItems[safeItems.length - 1]?.overallScore);
    const improvement = Number.isFinite(latestScore) && Number.isFinite(firstScore)
      ? Math.round(latestScore - firstScore)
      : null;

    setText("candidateInterviewCountValue", String(safeItems.length));
    setText("candidateInterviewCountHint", `${safeItems.length} completed interview${safeItems.length === 1 ? "" : "s"}`);
    setText("candidateOverallPerformanceValue", scoreText(avg));
    setText("candidateOverallPerformanceHint", improvement !== null
      ? `${improvement >= 0 ? "+" : ""}${improvement}% vs first recorded score`
      : "Average recent interview score");
    setText("readinessValue", scoreText(avg));
    setRing("readinessRing", avg);
    setText("growthValue", scoreText(avg));
    setRing("growthRing", avg);
    setText("preparationRole", latest?.jobRole || "AI Mock Interview");
    setText("prepProgressText", `Latest score: ${scoreText(latestScore)}`);
    setText("prepProgressPercent", scoreText(latestScore));
    const prepBar = $("prepProgressBar");
    if (prepBar) prepBar.style.width = `${clamp(latestScore)}%`;

    body.innerHTML = "";
    safeItems.slice(0, 6).forEach((item) => {
      const date = item.interviewDate ? new Date(item.interviewDate) : null;
      const dateText = date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
        : "—";
      const roleText = item.jobRole || "AI Mock Interview";
      const score = Number(item.overallScore);
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${escapeHtml(roleText)}</strong></td>
        <td class="history-score">${scoreText(score)}</td>
        <td>${dateText}</td>
        <td><span class="history-status">Completed</span></td>`;
      body.appendChild(row);
    });

    if (latest?.interviewId) {
      const d = latest.interviewDate ? new Date(latest.interviewDate) : null;
      setText("latestReportRole", latest.jobRole || "AI Mock Interview");
      setText("latestReportDate", d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString() : "Latest completed session");
      setText("latestReportScore", scoreText(latestScore));
      localStorage.setItem("smarthire.latestReportRole", latest.jobRole || "AI Mock Interview");
      localStorage.setItem("smarthire.latestReportDate", d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString() : "Latest completed session");
      localStorage.setItem("smarthire.lastOverallPerformance", String(latestScore));
      $("downloadAnalyticsReport")?.setAttribute("data-interview-id", latest.interviewId);
    }

    drawPerformanceChart(scores);
  };

  const drawPerformanceChart = (scores) => {
    const line = $("chartLine"), area = $("chartArea"), empty = $("chartEmpty");
    if (!line || !area || !empty) return;
    if (!scores.length) {
      line.setAttribute("points", "0,170 520,170");
      area.setAttribute("d", "M0 170 L0 170 L520 170 Z");
      empty.style.display = "grid";
      return;
    }
    empty.style.display = "none";
    const data = scores.slice(0, 10).reverse();
    const max = Math.max(100, ...data), min = Math.min(0, ...data);
    const points = data.map((score, i) => {
      const x = data.length === 1 ? 260 : (i * 500 / (data.length - 1)) + 10;
      const y = 165 - ((score - min) / Math.max(1, max - min)) * 130;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    line.setAttribute("points", points.join(" "));
    area.setAttribute("d", `M${points[0]} L${points.join(" L")} L${points[points.length-1].split(",")[0]},170 L0,170 Z`);
  };

  const loadLatestReport = async (interviewId) => {
    if (!interviewId) return;
    try {
      const response = await fetch(`${apiBase}/api/interviews/${interviewId}/report`, { headers: authHeaders() });
      if (!response.ok) return;
      const report = await response.json();
      const e = report?.evaluation || {};
      setText("reportTechnical", scoreText(e.technicalScore));
      setText("reportCommunication", scoreText(e.communicationScore));
      setText("reportProblemSolving", scoreText(e.problemSolvingScore));
      setText("reportConfidence", scoreText(e.confidenceScore));
      setText("latestReportScore", scoreText(e.overallScore));
      if (e.recommendation) setText("aiRecommendationText", e.recommendation);
      renderWeakAreas(e);
      setText("skillTechnical", scoreText(e.technicalScore));
      setText("skillCommunication", scoreText(e.communicationScore));
      setText("skillConfidence", scoreText(e.confidenceScore));
      setText("skillProblemSolving", scoreText(e.problemSolvingScore));
      localStorage.setItem("smarthire.skillTechnical", String(Number(e.technicalScore) || 0));
      localStorage.setItem("smarthire.skillCommunication", String(Number(e.communicationScore) || 0));
      localStorage.setItem("smarthire.skillConfidence", String(Number(e.confidenceScore) || 0));
      localStorage.setItem("smarthire.skillProblemSolving", String(Number(e.problemSolvingScore) || 0));
      localStorage.setItem("smarthire.lastOverallPerformance", String(Number(e.overallScore) || 0));
      const reportLink = $("candidateLatestReportLink");
      if (reportLink && interviewId) reportLink.href = `interview-report.html?interviewId=${encodeURIComponent(interviewId)}`;
      localStorage.setItem("smarthire.latestReportInterviewId", String(interviewId));
    } catch (_) {}
  };

  const renderWeakAreas = (evaluation) => {
    const el = $("candidateWeakAreas");
    if (!el) return;
    const metrics = [
      ["Communication", Number(evaluation?.communicationScore)],
      ["Confidence", Number(evaluation?.confidenceScore)],
      ["Technical relevance", Number(evaluation?.technicalScore)],
      ["Professionalism", Number(evaluation?.professionalismScore)],
      ["Problem solving", Number(evaluation?.problemSolvingScore)]
    ].filter(([,score]) => Number.isFinite(score)).sort((a,b) => a[1]-b[1]);
    if (!metrics.length) { el.innerHTML = '<p>Complete an interview to receive weak-area predictions.</p>'; return; }
    const focus=metrics.slice(0,3);
    el.innerHTML=focus.map(([label,score])=>`<p><i class="fa-solid fa-triangle-exclamation"></i> <strong>${escapeHtml(label)}</strong> — ${Math.round(score)}%. Focus practice here before the next interview.</p>`).join('');
  };

  const loadDashboard = async () => {
    const userId = Number(localStorage.getItem("userId") || 0);
    if (!userId) return;

    try {
      const response = await fetch(`${apiBase}/api/interviews/history/${userId}`, { headers: authHeaders() });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const history = await response.json();
      renderHistory(Array.isArray(history) ? history : []);
      if (Array.isArray(history) && history[0]?.interviewId) {
        await loadLatestReport(history[0].interviewId);
      }
    } catch (_) {
      renderHistory([]);
    }

    const atsScore = Number(localStorage.getItem("smarthire.lastAtsScore"));
    const resumeScore = Number(localStorage.getItem("smarthire.lastResumeScore"));
    if (Number.isFinite(atsScore)) {
      setText("candidateAtsScoreValue", scoreText(atsScore));
      setText("candidateAtsScoreHint", "From latest ATS analysis");
      setText("atsRingValue", scoreText(atsScore));
      setText("atsLargeValue", scoreText(atsScore));
      setRing("atsRing", atsScore);
      setRing("atsLargeRing", atsScore);
    }
    if (Number.isFinite(resumeScore)) {
      setText("candidateResumeScoreValue", scoreText(resumeScore));
      setText("candidateResumeScoreHint", "From latest resume analysis");
    }
  };

  $("downloadAnalyticsReport")?.addEventListener("click", async () => {
    const userId = Number(localStorage.getItem("userId") || 0);
    if (!userId) return;
    const button = $("downloadAnalyticsReport");
    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Preparing...';
    try {
      const response = await fetch(`${apiBase}/api/analytics/report/${userId}`, { headers: authHeaders() });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smarthire-analytics-report-${userId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("The report could not be downloaded yet. Complete an interview and try again.");
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  });

  loadDashboard();
})();
