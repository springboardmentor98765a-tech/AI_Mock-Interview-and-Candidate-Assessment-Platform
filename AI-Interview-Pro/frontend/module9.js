/* Shared production/preview UI. The preview supplies its own isolated API. */
(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const percent = n => n == null ? "—" : Number(n).toFixed(1) + "%";
  const date = value => value ? new Date(value).toLocaleString([], {dateStyle:"medium",timeStyle:"short"}) : "—";
  const keys = ["email_enabled", "reminders_enabled", "session_alerts_enabled", "performance_enabled"];
  let notifications = [], reportItems = [], loading = false;
  let currentUser;
  const apiFetch = (...args) => window.module9Preview ? window.module9Preview.fetch(...args) : authFetch(...args);
  function message(text, error = false) { $("statusMessage").textContent = text; $("statusMessage").classList.toggle("error", error); }
  async function api(path, options = {}) {
    const response = await apiFetch("/module9" + path, options);
    if (!response.ok) {
      let detail = "Request failed. Please try again.";
      try { detail = (await response.json()).detail || detail; } catch (_) {}
      throw new Error(typeof detail === "string" ? detail : "Please check your input.");
    }
    return response;
  }
  async function json(path, options) { return (await api(path, options)).json(); }
  function showPanel(id) {
    document.querySelectorAll(".workspace-panel").forEach(panel => panel.hidden = panel.id !== id);
    document.querySelectorAll("[data-panel]").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.panel === id);
      if (tab.dataset.panel === id) tab.setAttribute("aria-current", "page"); else tab.removeAttribute("aria-current");
    });
  }
  document.querySelectorAll("[data-panel]").forEach(tab => tab.addEventListener("click", () => showPanel(tab.dataset.panel)));
  function renderInbox() {
    const filter = $("inboxFilter").value;
    const items = notifications.filter(n => filter === "all" || (filter === "unread" ? !n.read : n.kind === filter));
    const delivery = {disabled:"Email off",pending:"Email queued",sent:"Email sent",failed:"Email failed",not_configured:"Email not configured"};
    $("inboxList").innerHTML = items.length ? items.map(n => `<article class="notification ${n.read ? "" : "unread"}">
      <span class="symbol" aria-hidden="true">${{reminder:"◷",session:"▶",performance:"↗"}[n.kind] || "•"}</span>
      <div class="copy"><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><small>${esc(date(n.created_at))} · ${esc(delivery[n.email_status] || n.email_status)}</small></div>
      ${n.read ? '<span class="badge dim">Read</span>' : `<button class="secondary" data-read="${esc(n.id)}">Mark read</button>`}</article>`).join("") : '<p class="empty">You’re all caught up. New updates will appear here.</p>';
  }
  async function loadInbox() {
    const data = await json("/notifications"); notifications = data.items;
    $("unreadCount").textContent = data.unread; $("inboxBadge").textContent = data.unread; renderInbox();
  }
  async function loadReminders() {
    const items = await json("/reminders");
    $("reminderList").innerHTML = items.length ? items.map(r => `<article class="reminder-card"><h3>${esc(r.title)}</h3><p class="muted">${esc(date(r.scheduled_at))}</p><small>Reminder: ${esc(date(r.remind_at))}</small><div class="actions"><span class="badge ${r.status === "scheduled" ? "good" : "dim"}">${esc(r.status)}</span>${r.status !== "cancelled" ? `<button class="secondary" data-cancel="${esc(r.id)}">Cancel reminder</button>` : ""}</div></article>`).join("") : '<p class="empty">No reminders yet. Plan your next practice session.</p>';
  }
  function renderReports() {
    const search = $("reportSearch").value.toLowerCase();
    const items = reportItems.filter(i => (i.domain + " " + i.candidate).toLowerCase().includes(search));
    $("reportRows").innerHTML = items.length ? items.map(i => `<tr><td><strong>${esc(i.domain)}</strong><small>${esc(i.candidate)} · ${esc(i.type)}</small></td><td>${esc(date(i.completed_at))}</td><td>${percent(i.score)}</td><td><span class="badge ${i.score >= 75 ? "good" : "dim"}">${esc(i.rating)}</span></td><td><button class="secondary" data-report="${esc(i.id)}" data-format="html">HTML / Print</button><button class="secondary" data-report="${esc(i.id)}" data-format="csv">CSV</button></td></tr>`).join("") : '<tr><td colspan="5" class="empty">No completed reports available for this account.</td></tr>';
  }
  async function loadReports() {
    const data = await json("/reports"); reportItems = data.items;
    $("completedCount").textContent = data.summary.completed;
    $("averageScore").textContent = percent(data.summary.average); $("bestScore").textContent = percent(data.summary.best);
    $("downloadSummary").disabled = !reportItems.length;
    $("skillSummary").innerHTML = Object.entries(data.summary.dimensions).map(([key, value]) => `<article><span>${esc(key.replace("_score", "").replaceAll("_", " "))}</span><strong>${percent(value)}</strong><progress max="100" value="${Number(value) || 0}" aria-label="${esc(key)}"></progress></article>`).join(""); renderReports();
  }
  async function loadPreferences() {
    const pref = await json("/preferences");
    keys.forEach(key => $(key).checked = pref[key]);
    $("emailStatus").textContent = pref.email_configured ? "Email delivery is configured. Opt in above to receive updates at your registered address." : "Email delivery is not configured on this server. Your inbox still works; queued emails will wait for SMTP setup.";
  }
  async function refresh() {
    if (loading) return; loading = true; $("refreshAll").disabled = true;
    try {
      const results = await Promise.allSettled([loadInbox(), loadReminders(), loadReports(), loadPreferences()]);
      const failed = results.find(r => r.status === "rejected");
      if (failed) throw failed.reason;
    } catch (error) { message(error.message, true); }
    finally { loading = false; $("refreshAll").disabled = false; }
  }
  async function act(button, task) {
    button.disabled = true;
    try { await task(); } catch (error) { message(error.message, true); }
    finally { button.disabled = false; }
  }
  async function download(path, name) {
    const response = await api(path);
    const url = URL.createObjectURL(await response.blob()); const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    message("Report downloaded. HTML reports can be printed or saved as PDF.");
  }
  $("refreshAll").addEventListener("click", refresh);
  $("inboxFilter").addEventListener("change", renderInbox);
  $("reportSearch").addEventListener("input", renderReports);
  $("markAllRead").addEventListener("click", e => act(e.currentTarget, async () => { await json("/notifications/read-all", {method:"POST"}); await loadInbox(); }));
  $("inboxList").addEventListener("click", e => {
    const button = e.target.closest("[data-read]");
    if (button) act(button, async () => { await json("/notifications/" + button.dataset.read + "/read", {method:"POST"}); await loadInbox(); });
  });
  $("reminderForm").addEventListener("submit", e => {
    e.preventDefault(); act(e.submitter, async () => {
      const scheduled = new Date($("reminderTime").value);
      if (!Number.isFinite(scheduled.getTime()) || scheduled <= new Date()) throw new Error("Choose a future date and time.");
      await json("/reminders", {method:"POST",body:JSON.stringify({title:$("reminderTitle").value.trim(),scheduled_at:scheduled.toISOString(),lead_minutes:Number($("reminderLead").value)})});
      $("reminderForm").reset(); await loadReminders(); message("Reminder scheduled in your local timezone.");
    });
  });
  $("reminderList").addEventListener("click", e => {
    const button = e.target.closest("[data-cancel]");
    if (button) act(button, async () => { await json("/reminders/" + button.dataset.cancel, {method:"DELETE"}); await loadReminders(); message("Reminder cancelled."); });
  });
  $("preferencesForm").addEventListener("submit", e => {e.preventDefault(); act(e.submitter, async () => {
    await json("/preferences", {method:"PUT",body:JSON.stringify(Object.fromEntries(keys.map(key => [key,$(key).checked])))});
    message("Notification preferences saved.");
  });});
  $("reportRows").addEventListener("click", e => {
    const button = e.target.closest("[data-report]");
    if (button) act(button, () => download("/reports/" + button.dataset.report + "/download?format=" + button.dataset.format,"interview-report." + button.dataset.format));
  });
  $("downloadSummary").addEventListener("click", e => act(e.currentTarget, () => download("/reports/summary/download", "performance-summary.csv")));
  async function init() {
    if (window.module9Preview) {currentUser = window.module9Preview.user; $("demoBanner").hidden = false;}
    else {
      if (!getToken()) {location.href = "index.html"; return;}
      const response = await authFetch("/verify-token");
      if (!response.ok) {location.href = "index.html"; return;}
      currentUser = await response.json();
    }
    const dashboard = currentUser.role === "recruiter" ? "recruiter.html" : currentUser.role === "admin" ? "admin.html" : "candidate.html";
    $("backLink").href = $("dashboardLink").href = window.module9Preview ? "index.html" : dashboard;
    if (currentUser.role === "recruiter") $("reportScope").textContent = "Only completed interviews actively shared with you. Revoked access removes downloads.";
    await refresh();
    setInterval(() => {if (!document.hidden) loadInbox().catch(() => {});}, 30000);
    window.addEventListener("focus", () => {loadInbox().catch(() => {}); loadReports().catch(() => {});});
  }
  init().catch(error => message("Unable to load your workspace: " + error.message, true));
})();
