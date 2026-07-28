/* ==========================================================================
   SmartHire AI - Shared JavaScript (all pages)
   Beginner-friendly vanilla JS. No frameworks, no backend, no APIs.
   Uses localStorage for dummy auth + theme persistence.
   ========================================================================== */

/* When loaded as an ES module, function names are not global by default,
   so inline onclick="..." attributes in the HTML would not find them.
   We attach every handler used by the HTML to window so they stay callable. */
const handlers = {
  openLoginModal, closeLoginModal, handleContactForm, loginUser,
  logoutUser, toggleSidebar, showSection, handleResumeUpload,
  startMockInterview, downloadReport, toggleTheme, showToast,
  renderDonutChart, renderLineChart
};
Object.keys(handlers).forEach(name => { window[name] = handlers[name]; });

/* ---------- STORAGE KEYS (kept in one place so they're easy to find) ---------- */
const STORAGE_KEYS = {
  username: "smartHireUsername",
  role:     "smartHireRole",
  loggedIn: "smartHireLoggedIn",
  theme:    "smartHireTheme"
};

/* ==========================================================================
   1. THEME (dark / light) — works on every page
   ========================================================================== */
function applyTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
}

/* Toggle between dark and light and remember the choice */
function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem(STORAGE_KEYS.theme, isDark ? "dark" : "light");
  syncThemeToggles(isDark);
}

/* Keep every theme toggle on the page in sync (topbar + settings) */
function syncThemeToggles(isDark) {
  const settingsToggle = document.getElementById("settingsThemeToggle");
  if (settingsToggle) settingsToggle.checked = isDark;
}

/* On page load: apply the saved theme (or system default) */
function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme) || "light";
  applyTheme(saved);
  syncThemeToggles(saved === "dark");
}

/* ==========================================================================
   2. LANDING PAGE — mobile nav + login modal + contact form
   ========================================================================== */

/* Toggle the mobile nav menu on small screens (index.html only) */
function toggleMobileNav() {
  const nav = document.getElementById("navLinks");
  if (nav) nav.classList.toggle("mobile-open");
}

/* Open / close the dummy login modal */
function openLoginModal() {
  const modal = document.getElementById("loginModal");
  if (modal) modal.classList.add("active");
}
function closeLoginModal() {
  const modal = document.getElementById("loginModal");
  if (modal) modal.classList.remove("active");
}

/* Handle the contact form on the landing page (front-end only) */
function handleContactForm(event) {
  event.preventDefault();
  const feedback = document.getElementById("contactFeedback");
  if (feedback) {
    feedback.textContent = "Thank you! Your message has been sent.";
    event.target.reset();
  }
  return false;
}

/* ==========================================================================
   3. LOGIN FLOW — save user to localStorage + redirect by role
   ========================================================================== */
function loginUser(event) {
  event.preventDefault();

  const name  = document.getElementById("loginName").value.trim();
  const email = document.getElementById("loginEmail").value.trim();
  const role  = document.getElementById("loginRole").value;

  // Basic validation
  if (!name || !email || !role) {
    alert("Please fill in your name, email, and role.");
    return false;
  }

  /* Save login details in localStorage so dashboards can read them later */
  localStorage.setItem(STORAGE_KEYS.username, name);
  localStorage.setItem(STORAGE_KEYS.role, role);
  localStorage.setItem(STORAGE_KEYS.loggedIn, "true");

  /* Redirect to the dashboard that matches the chosen role */
  const dashboards = {
    candidate: "candidate.html",
    recruiter: "recruiter.html",
    admin:     "admin.html"
  };
  window.location.href = dashboards[role] || "index.html";
  return false;
}

/* ==========================================================================
   4. LOGOUT — clear storage and go back to the landing page
   ========================================================================== */
function logoutUser() {
  localStorage.clear();
  window.location.href = "index.html";
}

/* ==========================================================================
   5. AUTH GUARD — redirect to index if a dashboard is opened without login
   ========================================================================== */
function requireLogin() {
  const loggedIn = localStorage.getItem(STORAGE_KEYS.loggedIn);
  if (loggedIn !== "true") {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

/* ==========================================================================
   6. DASHBOARD HELPERS — sidebar, sections, user chip, welcome name
   ========================================================================== */

/* Open / close the dashboard sidebar (used on mobile and desktop) */
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  const isOpen = sidebar.classList.toggle("open");
  showBackdrop(isOpen);
}

/* Show / hide the dark backdrop behind the mobile sidebar */
function showBackdrop(show) {
  let backdrop = document.querySelector(".sidebar-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";
    backdrop.onclick = () => toggleSidebar();
    document.body.appendChild(backdrop);
  }
  backdrop.classList.toggle("show", show);
}

/* Switch between dashboard sections (single-page feel, no reload) */
function showSection(id, linkEl) {
  // Hide every section, then show the chosen one
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("active");

  // Highlight the active sidebar link
  document.querySelectorAll(".sidebar-nav a").forEach(a => a.classList.remove("active"));
  if (linkEl) linkEl.classList.add("active");

  // Animate AI analysis progress bars when that section is opened
  if (id === "ai-analysis") animateAiBars();

  // Close the sidebar on mobile after navigating
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.remove("open");
    showBackdrop(false);
  }

  // Scroll back to top of content
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* Load the saved username + role into the dashboard UI */
function loadUserData() {
  const name = localStorage.getItem(STORAGE_KEYS.username) || "Guest";
  const role = localStorage.getItem(STORAGE_KEYS.role) || "";

  // Welcome heading
  const welcomeEl = document.getElementById("welcomeName");
  if (welcomeEl) welcomeEl.textContent = "Welcome, " + name + " 👋";

  // Topbar user chip
  const chip = document.getElementById("userChip");
  if (chip) {
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    chip.textContent = "👤 " + name + " · " + roleLabel;
  }
}

/* ==========================================================================
   7. PROGRESS BARS — reusable builder so we don't repeat HTML
   ========================================================================== */
function renderProgressBars(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "progress-item";
    row.innerHTML =
      '<div class="progress-head"><span>' + item.label + '</span><span>' + item.value + '%</span></div>' +
      '<div class="progress-track"><div class="progress-fill" data-width="' + item.value + '"></div></div>';
    container.appendChild(row);
  });

  // Animate the bars on the next frame
  requestAnimationFrame(() => {
    container.querySelectorAll(".progress-fill").forEach(bar => {
      bar.style.width = bar.getAttribute("data-width") + "%";
    });
  });
}

/* Animate the AI Interview Analysis progress bars when the section is opened.
   Each bar stores its target width in a data-value attribute. */
function animateAiBars() {
  const section = document.getElementById("ai-analysis");
  if (!section) return;
  const bars = section.querySelectorAll(".ai-progress-fill[data-value]");
  bars.forEach(bar => { bar.style.width = "0"; });
  requestAnimationFrame(() => {
    bars.forEach(bar => {
      bar.style.width = bar.getAttribute("data-value") + "%";
    });
  });
}

/* ==========================================================================
   8. CANDIDATE PAGE — dummy data + interactions
   ========================================================================== */

/* Performance / analytics / progress skill bars for the candidate */
const candidateSkills = [
  { label: "Technical Skills", value: 82 },
  { label: "Communication",    value: 75 },
  { label: "Problem Solving",   value: 70 },
  { label: "Confidence",        value: 78 }
];

/* Recent interviews shown on the candidate dashboard + history */
const candidateInterviews = [
  { name: "Python Developer Interview",     date: "2026-07-22", score: "82%", status: "Completed" },
  { name: "Full Stack Developer Interview", date: "2026-07-19", score: "76%", status: "Completed" },
  { name: "Data Analyst Interview",         date: "2026-07-15", score: "71%", status: "Completed" }
];

/* Score trend over recent mock interviews (oldest -> newest) */
const candidateTrend = [
  { label: "Jul 15", value: 71 },
  { label: "Jul 19", value: 76 },
  { label: "Jul 22", value: 82 }
];

/* Colours for the donut chart slices (match the purple/blue theme) */
const donutColors = ["#6366f1", "#0ea5e9", "#a855f7", "#10b981"];

/* ==========================================================================
   8a. DONUT CHART — Performance Analytics section
   Builds an inline SVG donut from candidateSkills (no chart library needed).
   ========================================================================== */
function renderDonutChart(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const size = 220;        // SVG width / height
  const stroke = 28;       // thickness of the ring
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  // Build one <circle> per skill, each covering a slice of the ring
  let circles = "";
  data.forEach((item, i) => {
    const dash = (item.value / 100) * circumference;
    const gap = circumference - dash;
    circles +=
      '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + radius + '"' +
      ' fill="none" stroke="' + donutColors[i % donutColors.length] + '"' +
      ' stroke-width="' + stroke + '"' +
      ' stroke-dasharray="' + dash + ' ' + gap + '"' +
      ' stroke-dashoffset="' + (-offset) + '"' +
      ' transform="rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')"></circle>';
    offset += dash;
  });

  // Average score shown in the middle of the donut
  const avg = Math.round(data.reduce((s, x) => s + x.value, 0) / data.length);

  container.innerHTML =
    '<svg viewBox="0 0 ' + size + ' ' + size + '" class="donut-svg">' + circles +
    '<text x="50%" y="46%" text-anchor="middle" class="donut-center-value">' + avg + '%</text>' +
    '<text x="50%" y="60%" text-anchor="middle" class="donut-center-label">Average</text>' +
    '</svg>';

  // Build the colour legend next to the chart
  const legend = document.getElementById("donutLegend");
  if (legend) {
    legend.innerHTML = data.map((item, i) =>
      '<div class="legend-item">' +
      '<span class="legend-dot" style="background:' + donutColors[i % donutColors.length] + '"></span>' +
      '<span class="legend-label">' + item.label + '</span>' +
      '<span class="legend-value">' + item.value + '%</span>' +
      '</div>'
    ).join("");
  }
}

/* ==========================================================================
   8b. LINE CHART — Improvement Progress section
   Builds an inline SVG line chart from candidateTrend (no chart library needed).
   ========================================================================== */
function renderLineChart(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const width = 600, height = 280;
  const padding = { top: 30, right: 24, bottom: 44, left: 44 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Scale values (0-100) to pixel coordinates inside the plot area
  const xStep = data.length > 1 ? plotW / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + plotH - (d.value / 100) * plotH,
    label: d.label,
    value: d.value
  }));

  // Grid lines at 0, 25, 50, 75, 100
  let grid = "";
  for (let v = 0; v <= 100; v += 25) {
    const gy = padding.top + plotH - (v / 100) * plotH;
    grid += '<line x1="' + padding.left + '" y1="' + gy + '" x2="' + (width - padding.right) + '" y2="' + gy + '" class="chart-grid"/>';
    grid += '<text x="' + (padding.left - 10) + '" y="' + (gy + 4) + '" text-anchor="end" class="chart-axis-text">' + v + '</text>';
  }

  // X-axis labels (session dates)
  let xLabels = "";
  points.forEach(p => {
    xLabels += '<text x="' + p.x + '" y="' + (height - padding.bottom + 22) + '" text-anchor="middle" class="chart-axis-text">' + p.label + '</text>';
  });

  // The trend line itself
  const linePath = points.map((p, i) => (i === 0 ? "M" : "L") + p.x + " " + p.y).join(" ");
  // Smooth area fill under the line
  const areaPath = linePath +
    " L " + points[points.length - 1].x + " " + (padding.top + plotH) +
    " L " + points[0].x + " " + (padding.top + plotH) + " Z";

  // Dots + value labels on each data point
  let dots = "";
  points.forEach(p => {
    dots += '<circle cx="' + p.x + '" cy="' + p.y + '" r="5" class="chart-dot"/>';
    dots += '<text x="' + p.x + '" y="' + (p.y - 12) + '" text-anchor="middle" class="chart-point-label">' + p.value + '%</text>';
  });

  container.innerHTML =
    '<svg viewBox="0 0 ' + width + ' ' + height + '" class="line-svg">' +
    '<defs><linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#6366f1" stop-opacity="0.3"/>' +
    '<stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>' +
    '</linearGradient></defs>' +
    grid + xLabels +
    '<path d="' + areaPath + '" fill="url(#trendGradient)"/>' +
    '<path d="' + linePath + '" fill="none" class="chart-line"/>' +
    dots +
    '</svg>';
}

function renderCandidateInterviews(tableId) {
  const tbody = document.getElementById(tableId);
  if (!tbody) return;
  tbody.innerHTML = "";

  candidateInterviews.forEach(i => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' + i.name + '</td>' +
      '<td>' + i.date + '</td>' +
      '<td>' + i.score + '</td>' +
      '<td><span class="badge badge-success">' + i.status + '</span></td>' +
      '<td><button class="btn btn-small" onclick="showToast(\'Opening report for ' + i.name + '\')">View Report</button></td>';
    tbody.appendChild(tr);
  });
}

/* Front-end only resume upload feedback */
function handleResumeUpload(event) {
  const file = event.target.files[0];
  const feedback = document.getElementById("resumeFeedback");
  if (!file || !feedback) return;
  feedback.className = "upload-feedback success";
  feedback.textContent = "✅ Resume uploaded successfully — " + file.name;
}

/* "Start" a mock interview — just a confirmation message (demo) */
function startMockInterview(role) {
  const feedback = document.getElementById("mockFeedback");
  if (!feedback) return;
  feedback.className = "mock-feedback success";
  feedback.textContent = "🎬 Starting " + role + " mock interview... (demo only)";
}

/* ==========================================================================
   8c. PDF REPORT — generate a real downloadable PDF using jsPDF
   Includes candidate name, overall score, skill breakdown, recent interviews.
   ========================================================================== */
function downloadReport() {
  // If jsPDF failed to load (offline), fall back to a friendly message
  if (typeof window.jspdf === "undefined" || !window.jspdf.jsPDF) {
    showToast("PDF library not loaded. Check your internet connection.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const name = localStorage.getItem(STORAGE_KEYS.username) || "Candidate";

  // ---- Header band ----
  doc.setFillColor(99, 102, 241);          // indigo
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("SmartHire AI", 14, 16);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Candidate Performance Report", 14, 25);

  // ---- Candidate details ----
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Candidate: " + name, 14, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Report generated: " + new Date().toLocaleDateString(), 14, 53);

  // ---- Overall score ----
  const avg = Math.round(candidateSkills.reduce((s, x) => s + x.value, 0) / candidateSkills.length);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Overall Score: " + avg + "%", 14, 65);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // ---- Skill breakdown ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Skill Breakdown", 14, 78);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 86;
  candidateSkills.forEach(skill => {
    doc.text(skill.label + ": " + skill.value + "%", 18, y);
    // Mini progress bar drawn as a filled rectangle
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(120, y - 4, 60, 5, 2, 2, "F");
    doc.setFillColor(99, 102, 241);
    doc.roundedRect(120, y - 4, (skill.value / 100) * 60, 5, 2, 2, "F");
    y += 10;
  });

  // ---- Recent interview history ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Recent Interview History", 14, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 12;

  // Table header
  doc.setFillColor(238, 242, 249);
  doc.rect(14, y - 5, 182, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Interview", 16, y + 1);
  doc.text("Date", 110, y + 1);
  doc.text("Score", 140, y + 1);
  doc.text("Status", 165, y + 1);
  doc.setFont("helvetica", "normal");
  y += 9;

  // Table rows
  candidateInterviews.forEach(i => {
    doc.text(i.name, 16, y + 1);
    doc.text(i.date, 110, y + 1);
    doc.text(i.score, 140, y + 1);
    doc.text(i.status, 165, y + 1);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 5, 196, y + 5);
    y += 9;
  });

  // ---- Footer ----
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("This is a system-generated report from SmartHire AI (demo).", 14, 285);

  // ---- Save the file ----
  doc.save("SmartHire_Candidate_Report.pdf");
  showToast("PDF report downloaded successfully.");
}

/* ==========================================================================
   9. RECRUITER PAGE — dummy data
   ========================================================================== */
const recruiterAnalytics = [
  { label: "Technical Skills",   value: 74 },
  { label: "Communication",      value: 68 },
  { label: "Problem Solving",    value: 71 },
  { label: "Behavioural Skills", value: 66 }
];

const recruiterCandidates = [
  { name: "Ananya Sharma",  role: "Python Developer",    score: "84%", interviews: "3", status: "Shortlisted" },
  { name: "Rahul Kumar",    role: "Full Stack Developer", score: "78%", interviews: "2", status: "In Review" },
  { name: "Priya Singh",    role: "Data Analyst",         score: "72%", interviews: "2", status: "In Review" },
  { name: "Vikram Mehta",   role: "Backend Developer",    score: "69%", interviews: "1", status: "Rejected" }
];

function renderRecruiterCandidates(tableId) {
  const tbody = document.getElementById(tableId);
  if (!tbody) return;
  tbody.innerHTML = "";

  recruiterCandidates.forEach(c => {
    const badgeClass =
      c.status === "Shortlisted" ? "badge-success" :
      c.status === "Rejected"    ? "badge-error"   : "badge-warning";
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' + c.name + '</td>' +
      '<td>' + c.role + '</td>' +
      '<td>' + c.score + '</td>' +
      '<td>' + c.interviews + '</td>' +
      '<td><span class="badge ' + badgeClass + '">' + c.status + '</span></td>' +
      '<td><button class="btn btn-small" onclick="showToast(\'Viewing ' + c.name + '\')">View</button></td>';
    tbody.appendChild(tr);
  });
}

function renderRecruiterReports(tableId) {
  const tbody = document.getElementById(tableId);
  if (!tbody) return;
  tbody.innerHTML = "";

  recruiterCandidates.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' + c.name + '</td>' +
      '<td>' + c.role + '</td>' +
      '<td><span class="badge badge-success">Ready</span></td>' +
      '<td><button class="btn btn-small" onclick="downloadReport()">Download</button></td>';
    tbody.appendChild(tr);
  });
}

/* Compare two candidates side by side with bars */
function renderCompareBars(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  const a = [
    { label: "Technical", value: 84 },
    { label: "Communication", value: 80 },
    { label: "Problem Solving", value: 78 },
    { label: "Behavioural", value: 75 }
  ];
  const b = [
    { label: "Technical", value: 76 },
    { label: "Communication", value: 70 },
    { label: "Problem Solving", value: 72 },
    { label: "Behavioural", value: 68 }
  ];

  const colA = document.createElement("div");
  colA.className = "compare-col";
  colA.innerHTML = "<h4>🟦 Ananya Sharma</h4>";
  const colB = document.createElement("div");
  colB.className = "compare-col";
  colB.innerHTML = "<h4>🟧 Rahul Kumar</h4>";

  a.forEach(item => {
    colA.insertAdjacentHTML("beforeend",
      '<div class="progress-item"><div class="progress-head"><span>' + item.label + '</span><span>' + item.value + '%</span></div>' +
      '<div class="progress-track"><div class="progress-fill" data-width="' + item.value + '"></div></div></div>');
  });
  b.forEach(item => {
    colB.insertAdjacentHTML("beforeend",
      '<div class="progress-item"><div class="progress-head"><span>' + item.label + '</span><span>' + item.value + '%</span></div>' +
      '<div class="progress-track"><div class="progress-fill" data-width="' + item.value + '"></div></div></div>');
  });

  container.appendChild(colA);
  container.appendChild(colB);

  requestAnimationFrame(() => {
    container.querySelectorAll(".progress-fill").forEach(bar => {
      bar.style.width = bar.getAttribute("data-width") + "%";
    });
  });
}

/* ==========================================================================
   10. ADMIN PAGE — dummy data
   ========================================================================== */
const adminUsers = [
  { name: "Ananya Sharma", email: "ananya@mail.com",  role: "Candidate", status: "Active" },
  { name: "Rahul Kumar",   email: "rahul@mail.com",   role: "Candidate", status: "Active" },
  { name: "Priya Singh",   email: "priya@mail.com",   role: "Candidate", status: "Inactive" },
  { name: "Meera Nair",    email: "meera@mail.com",   role: "Recruiter", status: "Active" },
  { name: "Vikram Mehta",  email: "vikram@mail.com",  role: "Recruiter", status: "Active" },
  { name: "Arjun Reddy",   email: "arjun@mail.com",   role: "Admin",     status: "Active" }
];

const adminRecruiters = [
  { name: "Meera Nair",    email: "meera@mail.com",   company: "Infosys",   status: "Active" },
  { name: "Vikram Mehta",  email: "vikram@mail.com",  company: "TCS",       status: "Active" },
  { name: "Sneha Iyer",    email: "sneha@mail.com",   company: "Wipro",     status: "Inactive" }
];

const adminActivity = [
  { icon: "👤", text: "New candidate registered",       time: "2 minutes ago" },
  { icon: "🗂️", text: "Recruiter created interview template", time: "18 minutes ago" },
  { icon: "✅", text: "Interview completed",            time: "1 hour ago" },
  { icon: "📑", text: "Report generated",               time: "3 hours ago" }
];

const platformAnalytics = [
  { label: "Candidates",   value: 78 },
  { label: "Recruiters",   value: 18 },
  { label: "Admins",       value: 4  },
  { label: "Active Today", value: 62 }
];

function renderAdminTable(tableId, rows, columns) {
  const tbody = document.getElementById(tableId);
  if (!tbody) return;
  tbody.innerHTML = "";

  rows.forEach(row => {
    const tr = document.createElement("tr");
    let cells = "";
    columns.forEach(col => {
      if (col === "status") {
        const badgeClass = row.status === "Active" ? "badge-success" : "badge-warning";
        cells += '<td><span class="badge ' + badgeClass + '">' + row.status + '</span></td>';
      } else {
        cells += '<td>' + row[col] + '</td>';
      }
    });
    cells += '<td><button class="btn btn-small" onclick="showToast(\'Manage ' + row.name + '\')">Manage</button></td>';
    tr.innerHTML = cells;
    tbody.appendChild(tr);
  });
}

function renderActivityList(listId) {
  const list = document.getElementById(listId);
  if (!list) return;
  list.innerHTML = "";

  adminActivity.forEach(a => {
    const li = document.createElement("li");
    li.innerHTML =
      '<span class="act-icon">' + a.icon + '</span>' +
      '<span class="act-text"><strong>' + a.text + '</strong><span>' + a.time + '</span></span>';
    list.appendChild(li);
  });
}

/* ==========================================================================
   11. TOAST — small popup notification (used by demo interactions)
   ========================================================================== */
let toastTimer = null;
function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  // Force reflow so the transition replays each time
  void toast.offsetWidth;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

/* ==========================================================================
   12. PAGE INIT — runs on every page once the DOM is ready
   ========================================================================== */
document.addEventListener("DOMContentLoaded", function () {
  // Apply saved theme first so there's no flash
  initTheme();

  // Wire up the topbar theme toggle button (present on every page)
  const themeBtn = document.getElementById("themeToggle");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

  // Landing page: mobile nav toggle + close modal on backdrop click
  const menuBtn = document.getElementById("menuToggle");
  if (menuBtn && document.getElementById("navLinks")) {
    menuBtn.addEventListener("click", toggleMobileNav);
  }
  const loginModal = document.getElementById("loginModal");
  if (loginModal) {
    loginModal.addEventListener("click", function (e) {
      if (e.target === loginModal) closeLoginModal();
    });
  }

  // Detect which dashboard we're on by checking for unique elements
  const isCandidate = document.body.contains(document.getElementById("resumeInput")) ||
                      window.location.pathname.endsWith("candidate.html");
  const isRecruiter = window.location.pathname.endsWith("recruiter.html");
  const isAdmin     = window.location.pathname.endsWith("admin.html");

  // If we're on a dashboard, guard the page + load user data
  if (isCandidate || isRecruiter || isAdmin) {
    if (!requireLogin()) return;   // bounce back to index if not logged in
    loadUserData();

    if (isCandidate) {
      renderProgressBars("perfBars", candidateSkills);
      renderDonutChart("donutChart", candidateSkills);
      renderLineChart("lineChart", candidateTrend);
      renderCandidateInterviews("recentInterviews");
      renderCandidateInterviews("historyTable");
    }

    if (isRecruiter) {
      renderProgressBars("analyticsBars",  recruiterAnalytics);
      renderProgressBars("analyticsBars2", recruiterAnalytics);
      renderRecruiterCandidates("candidateTable");
      renderRecruiterCandidates("candidateTable2");
      renderRecruiterReports("reportTable");
      renderCompareBars("compareBars");
    }

    if (isAdmin) {
      renderAdminTable("userTable",      adminUsers,      ["name", "email", "role", "status"]);
      renderAdminTable("recruiterTable", adminRecruiters, ["name", "email", "company", "status"]);
      renderActivityList("activityList");
      renderActivityList("activityList2");
      renderProgressBars("platformBars", platformAnalytics);
    }
  }
});
