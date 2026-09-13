
/* ==========================================================
            AI INTERVIEW PRO
            RECRUITER DASHBOARD JS
========================================================== */



/* ===============================
        AUTH GUARD (added)
================================ */

requireAuth("recruiter");
wireLogoutButton("#logoutBtn");



/* ===============================
        SIDEBAR SMOOTH SCROLL
================================ */


const sidebarLinks = document.querySelectorAll(
    ".recruiter-sidebar nav a[href^='#']"
);

function setDashboardNavigation(open) {
    document.body.classList.toggle("nav-open", open);
    const toggle = document.getElementById("sidebarToggle");
    if (toggle) {
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
        toggle.textContent = open ? "×" : "☰";
    }
}

document.getElementById("sidebarToggle")?.addEventListener("click", () => {
    setDashboardNavigation(!document.body.classList.contains("nav-open"));
});
document.getElementById("sidebarBackdrop")?.addEventListener("click", () => setDashboardNavigation(false));
document.getElementById("backToTop")?.addEventListener("click", () => window.scrollTo({top:0, behavior:"smooth"}));
window.addEventListener("scroll", () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
    const progressBar = document.getElementById("pageProgress");
    const backToTop = document.getElementById("backToTop");
    if (progressBar) progressBar.style.width = Math.min(100, progress) + "%";
    if (backToTop) backToTop.classList.toggle("show", window.scrollY > 600);
}, {passive:true});



sidebarLinks.forEach(link => {


    link.addEventListener("click",(e)=>{


        e.preventDefault();


        const target =
        document.querySelector(
            link.getAttribute("href")
        );



        if(target){


            target.scrollIntoView({

                behavior:"smooth"

            });

            setDashboardNavigation(false);


        }



    });


});







/* ===============================
        ACTIVE SIDEBAR
================================ */


const sections =
document.querySelectorAll(".section");



window.addEventListener("scroll",()=>{


    let current="";



    sections.forEach(section=>{


        const top =
        section.offsetTop - 150;



        if(window.scrollY >= top){


            current =
            section.getAttribute("id");


        }


    });





    sidebarLinks.forEach(link=>{


        link.classList.remove("active");



        if(
            link.getAttribute("href")
            ===
            "#"+current
        ){


            link.classList.add("active");


        }


    });



});























/* ===============================
        REPORT GENERATION
================================ */



const reportButtons =
document.querySelectorAll(".report-card button");



reportButtons.forEach(button=>{


    button.addEventListener("click",()=>{


        downloadConsentScopedReport();


    });


});








/* ===============================
        SAVE SETTINGS
================================ */



const saveSettings =
document.querySelector(
    ".settings-panel button"
);



if(saveSettings){


saveSettings.addEventListener("click",()=>{


    recruiterToast("Recruiter settings saved successfully ✓");


});


}









/* ===============================
        LOGOUT
================================ */



const logout =
document.querySelector(
    ".sidebar-footer button"
);



if(logout){


logout.addEventListener("click",()=>{


    const confirmLogout =
    confirm(
        "Are you sure you want to logout?"
    );



    if(confirmLogout){


        window.location.href="index.html";


    }



});


}









/* ===============================
        PAGE LOAD
================================ */


window.addEventListener("load",()=>{


    console.log(
        "Recruiter Dashboard Loaded Successfully"
    );


});


/* ==========================================================
   MODULE 4 - CANDIDATE MANAGEMENT / RESUME SCREENING /
   VIEW PROFILE (top scores, computed live + recordings inside
   the profile modal rather than a separate page)
========================================================== */

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

function initials(fullName) {
  if (!fullName) return "?";
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function scoreGrade(score) {
  if (score == null) return "-";
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "A-";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  return "D";
}

let leaderboardCache = [];

document.getElementById("refreshResumeScreening")?.addEventListener("click", loadCandidateLeaderboard);
window.addEventListener("focus", () => loadCandidateLeaderboard());

async function loadCandidateLeaderboard() {
  const candidatesStatusEl = document.getElementById("candidatesStatus");
  const screeningStatusEl = document.getElementById("screeningStatus");

  try {
    const response = await authFetch("/candidates/leaderboard");

    if (!response.ok) {
      if (candidatesStatusEl) candidatesStatusEl.textContent = "Could not load candidates.";
      if (screeningStatusEl) screeningStatusEl.textContent = "Could not load resumes.";
      return;
    }

    leaderboardCache = await response.json();
    renderCandidateManagement();
    renderResumeScreening();
  } catch (err) {
    console.warn("Could not load candidate leaderboard:", err);
    if (candidatesStatusEl) candidatesStatusEl.textContent = "Could not load candidates.";
    if (screeningStatusEl) screeningStatusEl.textContent = "Could not load resumes.";
  }
}

/* ---------------- Candidate Management: top mock-interview scores ---------------- */

function renderCandidateManagement() {
  const statusEl = document.getElementById("candidatesStatus");
  const gridEl = document.getElementById("candidatesGrid");
  if (!gridEl) return;

  const ranked = leaderboardCache
    .filter((c) => c.best_interview_score != null)
    .sort((a, b) => b.best_interview_score - a.best_interview_score);

  if (!ranked.length) {
    if (statusEl) statusEl.textContent = "No candidates have completed a mock interview yet.";
    gridEl.innerHTML = "";
    return;
  }

  if (statusEl) statusEl.textContent = ranked.length + " candidate(s) with a scored mock interview.";

  gridEl.innerHTML = ranked
    .map((c, index) => {
      const skillsHtml = c.top_skills.length
        ? "<div class=\"skills\">" + c.top_skills.map((s) => "<span>" + escapeHtml(s) + "</span>").join("") + "</div>"
        : "";

      return (
        "<div class=\"candidate-card\">" +
          "<div class=\"candidate-header\">" +
            "<div class=\"candidate-avatar\">" + escapeHtml(initials(c.full_name)) + "</div>" +
            "<div>" +
              "<h3>" + escapeHtml(c.full_name) + "</h3>" +
              "<p>" + escapeHtml(c.best_interview_domain || "Mock interview") + "</p>" +
            "</div>" +
            "<span class=\"rank\"> #" + (index + 1) + " </span>" +
          "</div>" +
          skillsHtml +
          "<div class=\"candidate-score\">" +
            "<div>" +
              "<p>Best Interview Score</p>" +
              "<h2>" + Math.round(c.best_interview_score) + "%</h2>" +
            "</div>" +
            "<div class=\"score-circle\">" + scoreGrade(c.best_interview_score) + "</div>" +
          "</div>" +
          "<p class=\"profile-empty-text\">" + c.completed_interviews + " scored interview(s) taken</p>" +
          "<div class=\"candidate-actions\">" +
            "<button class=\"view-btn\" data-candidate-id=\"" + c.id + "\">View Profile</button>" +
          "</div>" +
        "</div>"
      );
    })
    .join("");

  gridEl.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => openCandidateProfile(btn.dataset.candidateId));
  });
}

/* ---------------- Resume Screening: top resume (ATS) scores ---------------- */

function renderResumeScreening() {
  const statusEl = document.getElementById("screeningStatus");
  const tbodyEl = document.getElementById("screeningTableBody");
  if (!tbodyEl) return;

  const ranked = leaderboardCache
    .filter((c) => c.resume_score != null)
    .sort((a, b) => b.resume_score - a.resume_score);

  if (!ranked.length) {
    if (statusEl) statusEl.textContent = "No resumes available from candidates who shared access with you. Ask the candidate to share an interview, then refresh.";
    tbodyEl.innerHTML = "";
    return;
  }

  if (statusEl) statusEl.textContent = ranked.length + " candidate(s) with an uploaded resume.";

  tbodyEl.innerHTML = ranked
    .map((c) => {
      const scoreClass = c.resume_score >= 80 ? " class=\"high\"" : "";
      const skillsText = c.top_skills.length ? c.top_skills.join(", ") : "-";
      return (
        "<tr>" +
          "<td>" + escapeHtml(c.full_name) + "</td>" +
          "<td>" + escapeHtml(skillsText) + "</td>" +
          "<td" + scoreClass + ">" + Math.round(c.resume_score) + "%</td>" +
          "<td>" + (c.completed_interviews > 0 ? c.completed_interviews + " interview(s) taken" : "-") + "</td>" +
          "<td>" +
            "<button type=\"button\" class=\"skill-view-btn\" data-candidate-id=\"" + c.id + "\">" +
              "<span class=\"skill-view-btn-icon\">🧠</span>" +
              "<span class=\"skill-view-btn-text\">View Skills</span>" +
              "<span class=\"skill-view-btn-arrow\">→</span>" +
            "</button>" +
          "</td>" +
        "</tr>"
      );
    })
    .join("");

  tbodyEl.querySelectorAll(".skill-view-btn").forEach((btn) => {
    btn.addEventListener("click", () => openResumeSkillsProfile(btn.dataset.candidateId));
  });
}

/* ---------------- View Profile modal: analytics + resume + recordings ---------------- */

function recordingClipMarkup(recording) {
  const url = recording.recording_url;
  const isAudio = recording.recording_type === "audio";
  const label =
    (isAudio ? "🎙 Audio" : "🎬 Video") +
    " - " + escapeHtml(recording.interview_domain) +
    (recording.interview_score != null ? " (" + Math.round(recording.interview_score) + "%)" : "");

  const clipId = "rec-" + recording.id;
  const mediaTag = isAudio
    ? "<audio controls preload=\"metadata\" data-protected-src=\"" + escapeHtml(url) + "\"></audio>"
    : "<video controls preload=\"metadata\" playsinline data-protected-src=\"" + escapeHtml(url) + "\"></video>";

  // Some recordings can fail to play inline (unsupported codec, the
  // backend not running, a moved/renamed file, etc). Rather than leaving
  // the recruiter looking at a blank/broken player with no way to tell
  // why, show a visible fallback message + a direct link the moment the
  // media element fires an error, so the recording is always reachable.
  return (
    "<div class=\"recording-clip\" id=\"" + clipId + "\">" +
      mediaTag +
      "<p class=\"recording-clip-error\" style=\"display:none;\">" +
        "⚠ Couldn't load this protected recording." +
      "</p>" +
      "<p class=\"recording-clip-label\">" + label + "</p>" +
    "</div>"
  );
}

async function wireRecordingErrorFallbacks(container) {
  for (const clipEl of container.querySelectorAll(".recording-clip")) {
    const mediaEl = clipEl.querySelector("video, audio");
    const errorEl = clipEl.querySelector(".recording-clip-error");
    if (!mediaEl || !errorEl) continue;
    mediaEl.addEventListener("error", () => {
      mediaEl.style.display = "none";
      errorEl.style.display = "";
    });
    try {
      const response = await authFetch(mediaEl.dataset.protectedSrc, { headers: {} });
      if (!response.ok) throw new Error("Recording access denied");
      const objectUrl = URL.createObjectURL(await response.blob());
      mediaEl.src = objectUrl;
      mediaEl.addEventListener("emptied", () => URL.revokeObjectURL(objectUrl), { once: true });
    } catch (err) {
      mediaEl.style.display = "none";
      errorEl.style.display = "";
    }
  }
}

function profileStatCard(value, label) {
  return (
    "<div class=\"profile-stat-card\">" +
      "<div class=\"stat-value\">" + (value == null ? "-" : value) + "</div>" +
      "<div class=\"stat-label\">" + escapeHtml(label) + "</div>" +
    "</div>"
  );
}

function candidateProfileMarkup(profile) {
  const user = profile.user;
  const analytics = profile.analytics;
  const resume = profile.resume;
  const recordings = profile.recordings || [];

  const avatarHtml = user.profile_picture
    ? "<img src=\"" + escapeHtml(user.profile_picture) + "\" alt=\"\" />"
    : escapeHtml(initials(user.full_name));

  let html = "";

  html += "<div class=\"profile-header\">";
  html += "<div class=\"profile-header-avatar\">" + avatarHtml + "</div>";
  html += "<div><h3>" + escapeHtml(user.full_name) + "</h3><p>" + escapeHtml(user.email) + "</p></div>";
  html += "</div>";

  // Performance analytics
  html += "<div class=\"profile-section-title\">📊 Performance Analytics</div>";
  html += "<div class=\"profile-analytics-grid\">";
  html += profileStatCard(analytics.completed_interviews, "Interviews completed");
  html += profileStatCard(analytics.average_score != null ? Math.round(analytics.average_score) + "%" : null, "Average score");
  html += profileStatCard(analytics.last_score != null ? Math.round(analytics.last_score) + "%" : null, "Most recent score");
  html += profileStatCard(analytics.resume_score != null ? Math.round(analytics.resume_score) + "%" : null, "Resume score");
  html += profileStatCard(analytics.interview_readiness != null ? Math.round(analytics.interview_readiness) + "%" : null, "Interview readiness");
  html += profileStatCard(analytics.technical_avg != null ? Math.round(analytics.technical_avg) + "%" : null, "Technical avg");
  html += profileStatCard(analytics.communication_avg != null ? Math.round(analytics.communication_avg) + "%" : null, "Communication avg");
  html += profileStatCard(analytics.confidence_avg != null ? Math.round(analytics.confidence_avg) + "%" : null, "Confidence avg");
  html += "</div>";

  // Resume
  html += "<div class=\"profile-section-title\">📄 Resume</div>";
  if (resume) {
    if (resume.resume_summary) {
      html += "<div class=\"profile-resume-summary\">" + escapeHtml(resume.resume_summary) + "</div>";
    }
    if (resume.resume_skills && resume.resume_skills.length) {
      html += "<div class=\"profile-skill-chips\">" +
        resume.resume_skills.map((s) => "<span class=\"profile-skill-chip\">" + escapeHtml(s) + "</span>").join("") +
        "</div>";
    }
    const expYears = resume.resume_experience_years != null ? resume.resume_experience_years + " yrs experience" : null;
    const fileLine = resume.resume_file_name ? "File: " + resume.resume_file_name : null;
    const metaBits = [expYears, fileLine].filter(Boolean).join(" &middot; ");
    if (metaBits) html += "<p class=\"profile-empty-text\">" + escapeHtml(metaBits) + "</p>";

  } else {
    html += "<p class=\"profile-empty-text\">This candidate hasn't uploaded a resume yet.</p>";
  }

  // Interview history
  html += "<div class=\"profile-section-title\">🎯 Interview History</div>";
  const completedInterviews = (profile.interviews || []).filter((i) => i.status === "completed");
  if (completedInterviews.length) {
    html += completedInterviews
      .map((i) => (
        "<div class=\"profile-interview-row\">" +
          "<span>" + escapeHtml(i.interview_type) + " - " + escapeHtml(i.domain) + " (" + escapeHtml(i.difficulty) + ")</span>" +
          "<span>" + (i.overall_score != null ? Math.round(i.overall_score) + "%" : "-") + "</span>" +
        "</div>"
      ))
      .join("");
  } else {
    html += "<p class=\"profile-empty-text\">No completed interviews yet.</p>";
  }

  // Session recordings (kept inside the profile only, not a separate page)
  html += "<div class=\"profile-section-title\">🎥 Session Recordings</div>";
  if (recordings.length) {
    html += "<div class=\"recording-clip-row\">" + recordings.map(recordingClipMarkup).join("") + "</div>";
  } else {
    html += "<p class=\"no-recordings-text\">No recordings saved for this candidate yet.</p>";
  }

  return html;
}

async function openCandidateProfile(candidateId) {
  const overlay = document.getElementById("candidateProfileOverlay");
  const contentEl = document.getElementById("candidateProfileContent");
  if (!overlay || !contentEl) return;

  overlay.classList.remove("skills-only");
  contentEl.innerHTML = "<p class=\"hint\">Loading profile...</p>";
  overlay.style.display = "";

  try {
    const response = await authFetch("/candidates/" + candidateId + "/profile");

    if (!response.ok) {
      contentEl.innerHTML = "<p class=\"hint\">Could not load this candidate's profile.</p>";
      return;
    }

    const profile = await response.json();
    contentEl.innerHTML = candidateProfileMarkup(profile);
    wireRecordingErrorFallbacks(contentEl);

  } catch (err) {
    console.warn("Could not load candidate profile:", err);
    contentEl.innerHTML = "<p class=\"hint\">Could not load this candidate's profile.</p>";
  }
}

/* ---------------- Resume Screening: skills-only quick view ----------------
   Deliberately lighter than the Candidate Management profile - just the
   resume's extracted skills (grouped by category when available), not
   the full analytics / interview history / recordings. Reuses the same
   overlay shell so it still opens/closes/looks consistent. */

function resumeSkillsOnlyMarkup(profile) {
  const user = profile.user;
  const resume = profile.resume;

  const avatarHtml = user.profile_picture
    ? "<img src=\"" + escapeHtml(user.profile_picture) + "\" alt=\"\" />"
    : escapeHtml(initials(user.full_name));

  let html = "";

  html += "<div class=\"profile-header\">";
  html += "<div class=\"profile-header-avatar\">" + avatarHtml + "</div>";
  html += "<div><h3>" + escapeHtml(user.full_name) + "</h3><p>" + escapeHtml(user.email) + "</p></div>";
  html += "</div>";

  html += "<div class=\"profile-section-title\">🧠 Resume Extracted Skills</div>";

  if (!resume) {
    html += "<p class=\"profile-empty-text\">This candidate hasn't uploaded a resume yet.</p>";
    return html;
  }

  const byCategory = resume.resume_skills_by_category || {};
  const categories = Object.keys(byCategory).filter((cat) => byCategory[cat] && byCategory[cat].length);

  if (categories.length) {
    html += categories
      .map((cat) => (
        "<p class=\"skills-only-category\">" + escapeHtml(cat) + "</p>" +
        "<div class=\"profile-skill-chips\">" +
          byCategory[cat].map((s) => "<span class=\"profile-skill-chip\">" + escapeHtml(s) + "</span>").join("") +
        "</div>"
      ))
      .join("");
  } else if (resume.resume_skills && resume.resume_skills.length) {
    html += "<div class=\"profile-skill-chips\">" +
      resume.resume_skills.map((s) => "<span class=\"profile-skill-chip\">" + escapeHtml(s) + "</span>").join("") +
      "</div>";
  } else {
    html += "<p class=\"profile-empty-text\">No skills could be extracted from this resume.</p>";
  }

  if (resume.resume_score != null) {
    html += "<p class=\"profile-empty-text\">AI resume score: " + Math.round(resume.resume_score) + "%</p>";
  }

  return html;
}

async function openResumeSkillsProfile(candidateId) {
  const overlay = document.getElementById("candidateProfileOverlay");
  const contentEl = document.getElementById("candidateProfileContent");
  if (!overlay || !contentEl) return;

  overlay.classList.add("skills-only");
  contentEl.innerHTML = "<p class=\"hint\">Loading skills...</p>";
  overlay.style.display = "";

  try {
    const response = await authFetch("/candidates/" + candidateId + "/profile");

    if (!response.ok) {
      contentEl.innerHTML = "<p class=\"hint\">Could not load this candidate's skills.</p>";
      return;
    }

    const profile = await response.json();
    contentEl.innerHTML = resumeSkillsOnlyMarkup(profile);
  } catch (err) {
    console.warn("Could not load candidate skills:", err);
    contentEl.innerHTML = "<p class=\"hint\">Could not load this candidate's skills.</p>";
  }
}

function closeCandidateProfile() {
  const overlay = document.getElementById("candidateProfileOverlay");
  if (overlay) {
    overlay.style.display = "none";
    overlay.classList.remove("skills-only");
  }
}

const closeCandidateProfileBtnEl = document.getElementById("closeCandidateProfileBtn");
if (closeCandidateProfileBtnEl) {
  closeCandidateProfileBtnEl.addEventListener("click", closeCandidateProfile);
}

const candidateProfileOverlayEl = document.getElementById("candidateProfileOverlay");
if (candidateProfileOverlayEl) {
  candidateProfileOverlayEl.addEventListener("click", (e) => {
    if (e.target === candidateProfileOverlayEl) closeCandidateProfile();
  });
}

loadCandidateLeaderboard();

/* ==========================================================
   MODULE 8 - CONSENT-SCOPED SHARED INTERVIEWS & RANKINGS
========================================================== */
let sharedInterviewCache = [];
let protectedObjectUrls = [];

function recruiterFormatPercent(value) {
  return value == null ? "Not available" : Math.round(value) + "%";
}

function recruiterToast(message) {
  const toast = document.getElementById("recruiterToast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function downloadConsentScopedReport() {
  if (!sharedInterviewCache.length) {
    recruiterToast("No candidate-authorized interviews are available to export.");
    return;
  }
  const headers=["Candidate","Email","Interview Type","Domain","Difficulty","Completed","Overall Score","Rating","Permission Granted"];
  const quote=value=>'"'+String(value==null?"":value).replaceAll('"','""')+'"';
  const rows=sharedInterviewCache.map(item=>[
    item.candidate_name,item.candidate_email,item.interview_type,item.domain,item.difficulty,
    item.completed_at,item.overall_score,item.performance_rating,item.granted_at,
  ]);
  const csv=[headers,...rows].map(row=>row.map(quote).join(",")).join("\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a"); link.href=url;
  link.download="consent-scoped-interview-report-"+new Date().toISOString().slice(0,10)+".csv";
  link.click(); URL.revokeObjectURL(url);
  recruiterToast("Consent-scoped report downloaded.");
}

function sharedQueryString() {
  const params = new URLSearchParams();
  const mappings = [
    ["q", "sharedSearch"], ["interview_type", "sharedTypeFilter"],
    ["difficulty", "sharedDifficultyFilter"], ["sort", "sharedSort"],
  ];
  mappings.forEach(([key,id]) => {
    const value = document.getElementById(id)?.value.trim();
    if (value) params.set(key,value);
  });
  return params.toString();
}

async function loadSharedInterviews() {
  const statusEl = document.getElementById("sharedResultsStatus");
  const grid = document.getElementById("sharedInterviewGrid");
  if (!grid) return;
  statusEl.textContent = "Loading authorized interviews…";
  grid.innerHTML = Array.from({length:3},()=>"<div class=\"shared-interview-card\"><p class=\"hint\">Loading…</p></div>").join("");
  try {
    const response = await authFetch("/recruiter/shared-interviews?" + sharedQueryString());
    if (!response.ok) throw new Error("Unable to load shared interviews");
    sharedInterviewCache = await response.json();
    renderSharedInterviews();
    updateSharedOverview();
  } catch (err) {
    statusEl.textContent = "Could not load shared interviews.";
    grid.innerHTML = "<div class=\"shared-empty\">The authorized report service is unavailable. Try again.</div>";
  }
}

function updateSharedOverview() {
  const scores = sharedInterviewCache.map(i=>i.overall_score).filter(v=>v!=null);
  const candidates = new Set(sharedInterviewCache.map(i=>i.candidate_id));
  const average = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
  const set = (id,value) => { const el=document.getElementById(id); if(el) el.textContent=value; };
  set("sharedInterviewCount",sharedInterviewCache.length);
  set("sharedCandidateCount",candidates.size);
  set("sharedAverageScore",recruiterFormatPercent(average));
  set("sharedTopScore",recruiterFormatPercent(scores.length?Math.max(...scores):null));
}

function renderSharedInterviews() {
  const grid=document.getElementById("sharedInterviewGrid");
  const statusEl=document.getElementById("sharedResultsStatus");
  grid.innerHTML="";
  statusEl.textContent=sharedInterviewCache.length+" interview(s) currently shared with you.";
  if(!sharedInterviewCache.length){
    grid.innerHTML="<div class=\"shared-empty\"><strong>No authorized interviews yet</strong><br><br>A candidate must select your recruiter account and grant permission before a report appears here.</div>";
    return;
  }
  sharedInterviewCache.forEach(item=>{
    const card=document.createElement("article"); card.className="shared-interview-card";
    card.innerHTML="<div class=\"shared-card-top\"><div class=\"shared-avatar\">"+escapeHtml(initials(item.candidate_name))+"</div><div><h3>"+
      escapeHtml(item.candidate_name)+"</h3><p>"+escapeHtml(item.candidate_email)+"</p></div><span class=\"consent-badge\">● Access granted</span></div>"+
      "<p class=\"shared-domain\">"+escapeHtml(item.interview_type.toUpperCase()+" · "+item.domain)+"</p><p class=\"shared-meta\">"+
      escapeHtml(item.difficulty)+" difficulty · "+escapeHtml(item.performance_rating||"Awaiting rating")+"</p><div class=\"shared-score-row\"><div><span class=\"shared-score\">"+
      recruiterFormatPercent(item.overall_score)+"</span><p class=\"shared-date\">Completed "+new Date(item.completed_at).toLocaleDateString()+"</p></div></div>"+
      "<button type=\"button\" class=\"view-shared-report\">View full interview →</button>";
    card.querySelector("button").addEventListener("click",()=>openSharedReport(item.interview_id));
    grid.appendChild(card);
  });
}

function reportStat(label,value){
  return "<div class=\"report-stat\"><span>"+escapeHtml(label)+"</span><strong>"+escapeHtml(value==null?"Not available":value)+"</strong></div>";
}

function feedbackCard(title,items){
  if(!Array.isArray(items)||!items.length) return "";
  return "<article class=\"report-feedback-card\"><h4>"+escapeHtml(title)+"</h4><ul>"+items.map(i=>"<li>"+escapeHtml(i)+"</li>").join("")+"</ul></article>";
}

function sharedReportMarkup(data){
  const i=data.interview, s=data.session, a=i.assessment, f=a?.feedback||{};
  const tabs=["Overview","Questions & Answers","AI Feedback","Communication","Behavior","Recordings"];
  let html="<div class=\"report-hero\"><div><h2 id=\"sharedReportTitle\">"+escapeHtml(data.candidate.full_name)+"</h2><p>"+
    escapeHtml(i.interview_type.toUpperCase()+" interview · "+i.domain+" · "+i.difficulty)+"</p><p>Permission granted "+new Date(data.share.granted_at).toLocaleString()+"</p></div><div class=\"report-overall\"><strong>"+
    recruiterFormatPercent(a?.overall_score??i.overall_score)+"</strong><span>"+escapeHtml(a?.performance_rating||"Overall score")+"</span></div></div>";
  html+="<div class=\"report-tabs\">"+tabs.map((t,n)=>"<button class=\"report-tab "+(n===0?"active":"")+"\" data-report-tab=\""+n+"\">"+t+"</button>").join("")+"</div>";
  html+="<section class=\"report-tab-panel\" data-report-panel=\"0\"><div class=\"report-stat-grid\">"+
    reportStat("Communication",recruiterFormatPercent(a?.communication_score))+reportStat("Confidence",recruiterFormatPercent(a?.confidence_score))+
    reportStat("Technical relevance",recruiterFormatPercent(a?.technical_score))+reportStat("Professionalism",recruiterFormatPercent(a?.professionalism_score))+
    reportStat("Questions answered",i.answered_count+" / "+i.total_questions)+reportStat("Duration",s?.duration_seconds!=null?Math.round(s.duration_seconds/60)+" min":null)+
    reportStat("Completed",i.completed_at?new Date(i.completed_at).toLocaleDateString():null)+reportStat("Consent","Active")+"</div></section>";
  html+="<section class=\"report-tab-panel\" data-report-panel=\"1\" hidden>"+(i.questions||[]).map((q,n)=>"<article class=\"report-question\"><h4>"+(n+1)+". "+escapeHtml(q.question_text)+"</h4><p class=\"report-answer\">"+escapeHtml(q.answer_text||"Not answered")+"</p><div class=\"report-stat-grid\">"+
    reportStat("Overall",recruiterFormatPercent(q.overall_score))+reportStat("Technical",recruiterFormatPercent(q.technical_score))+reportStat("Communication",recruiterFormatPercent(q.communication_score))+reportStat("Confidence",recruiterFormatPercent(q.confidence_score))+"</div>"+(q.question_feedback?"<p class=\"qa-feedback\">"+escapeHtml(q.question_feedback)+"</p>":"")+"</article>").join("")+"</section>";
  html+="<section class=\"report-tab-panel\" data-report-panel=\"2\" hidden><p class=\"assessment-summary\">"+escapeHtml(f.overall_summary||"No written summary is available.")+"</p><div class=\"report-feedback-grid\">"+
    feedbackCard("Strengths",f.strengths)+feedbackCard("Areas to improve",f.weaknesses)+feedbackCard("Next steps",f.improvement_suggestions)+feedbackCard("Practice",f.practice_recommendations)+feedbackCard("Learning resources",f.learning_resources)+"</div></section>";
  const spoken=(i.questions||[]).filter(q=>q.speech_duration_seconds);
  const avg=(key)=>{const vals=spoken.map(q=>q[key]).filter(v=>v!=null);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;};
  html+="<section class=\"report-tab-panel\" data-report-panel=\"3\" hidden><div class=\"report-stat-grid\">"+reportStat("Filler words / answer",avg("filler_word_count")?.toFixed(1))+reportStat("Speaking pace",avg("speaking_pace_wpm")!=null?Math.round(avg("speaking_pace_wpm"))+" WPM":null)+reportStat("Pronunciation",recruiterFormatPercent(avg("pronunciation_score")))+reportStat("Spoken answers",spoken.length)+"</div></section>";
  html+="<section class=\"report-tab-panel\" data-report-panel=\"4\" hidden><div class=\"report-stat-grid\">"+reportStat("Eye contact",recruiterFormatPercent(s?.eye_contact_percentage))+reportStat("Attention",recruiterFormatPercent(s?.attention_percentage))+reportStat("Visual confidence",recruiterFormatPercent(s?.avg_visual_confidence))+reportStat("Engagement",recruiterFormatPercent(s?.avg_engagement))+reportStat("Dominant emotion",s?.dominant_emotion)+reportStat("Fullscreen exits",s?.fullscreen_violations)+reportStat("Integrity risk",recruiterFormatPercent(s?.latest_integrity_risk))+reportStat("Multiple-face warnings",s?.multiple_faces_warning_count)+"</div><p class=\"assessment-summary\">"+escapeHtml(s?.behavior_summary||"No camera-based behavior summary was captured.")+"</p></section>";
  const recordings=s?.recordings||[];
  html+="<section class=\"report-tab-panel\" data-report-panel=\"5\" hidden><p class=\"hint\">Recordings remain protected and stop loading after consent is revoked.</p><div id=\"protectedRecordings\">"+(recordings.length?recordings.map(r=>"<div class=\"protected-recording-slot\" data-url=\""+escapeHtml(r.recording_url)+"\" data-type=\""+escapeHtml(r.recording_type)+"\"><p>Loading protected "+escapeHtml(r.recording_type)+"…</p></div>").join(""):"<p>No recording was saved.</p>")+"</div></section>";
  return html;
}

async function loadProtectedRecordings(container){
  for(const slot of container.querySelectorAll(".protected-recording-slot")){
    try{
      const response=await authFetch(slot.dataset.url,{headers:{}});
      if(response.status===403){ closeSharedReport(); recruiterToast("Candidate access was revoked."); return; }
      if(!response.ok) throw new Error("Unavailable");
      const url=URL.createObjectURL(await response.blob()); protectedObjectUrls.push(url);
      const media=document.createElement(slot.dataset.type==="audio"?"audio":"video");
      media.controls=true; media.preload="metadata"; media.className="protected-media"; media.src=url;
      slot.innerHTML=""; slot.appendChild(media);
    }catch(err){slot.innerHTML="<p class=\"recording-clip-error\">Protected recording could not be loaded.</p>";}
  }
}

async function openSharedReport(interviewId){
  const overlay=document.getElementById("sharedReportOverlay"),content=document.getElementById("sharedReportContent");
  overlay.style.display=""; content.innerHTML="<p class=\"hint\">Verifying candidate permission and loading report…</p>";
  try{
    const response=await authFetch("/recruiter/shared-interviews/"+interviewId);
    if(!response.ok){ closeSharedReport(); recruiterToast(response.status===403?"Candidate access is no longer active.":"Could not load report."); loadSharedInterviews(); return; }
    const data=await response.json(); content.innerHTML=sharedReportMarkup(data);
    content.querySelectorAll("[data-report-tab]").forEach(btn=>btn.addEventListener("click",()=>{
      content.querySelectorAll("[data-report-tab]").forEach(b=>b.classList.toggle("active",b===btn));
      content.querySelectorAll("[data-report-panel]").forEach(p=>p.hidden=p.dataset.reportPanel!==btn.dataset.reportTab);
    }));
    loadProtectedRecordings(content);
  }catch(err){content.innerHTML="<p class=\"hint\">Could not load this authorized report.</p>";}
}

function closeSharedReport(){
  document.getElementById("sharedReportOverlay").style.display="none";
  protectedObjectUrls.forEach(URL.revokeObjectURL); protectedObjectUrls=[];
}

async function loadRecruiterRankings(){
  const body=document.getElementById("rankingTableBody"); if(!body)return;
  try{
    const response=await authFetch("/recruiter/rankings"); const rows=response.ok?await response.json():[];
    body.innerHTML=rows.length?rows.map(row=>"<tr><td><span class=\"rank-medal\">"+(row.rank===1?"🥇":row.rank===2?"🥈":row.rank===3?"🥉":"#"+row.rank)+"</span></td><td><strong>"+escapeHtml(row.candidate_name)+"</strong><br><span class=\"hint\">"+escapeHtml(row.candidate_email)+"</span></td><td>"+row.shared_interviews+"</td><td>"+recruiterFormatPercent(row.average_score)+"</td><td>"+recruiterFormatPercent(row.best_score)+"</td><td>"+recruiterFormatPercent(row.technical_average)+"</td><td>"+recruiterFormatPercent(row.communication_average)+"</td><td class=\""+(row.improvement>=0?"trend-up":"trend-down")+"\">"+(row.improvement>0?"+":"")+row.improvement+"%</td></tr>").join(""):"<tr><td colspan=\"8\">No consented candidates to rank yet.</td></tr>";
    const averageOf = (key) => {
      const values=rows.map(r=>r[key]).filter(v=>v!=null);
      return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
    };
    const technical=averageOf("technical_average"), communication=averageOf("communication_average"), overall=averageOf("average_score");
    const growthRows=rows.filter(r=>r.shared_interviews>=2);
    const growth=growthRows.length?growthRows.reduce((sum,r)=>sum+r.improvement,0)/growthRows.length:null;
    const dimensions=[["Technical",technical],["Communication",communication],["Overall",overall]].filter(d=>d[1]!=null).sort((a,b)=>b[1]-a[1]);
    document.getElementById("analyticsCoverage").textContent=rows.length+" candidate"+(rows.length===1?"":"s");
    document.getElementById("analyticsGrowth").textContent=growth==null?"Not enough data":(growth>0?"+":"")+growth.toFixed(1)+"%";
    document.getElementById("analyticsStrongest").textContent=dimensions.length?dimensions[0][0]+" "+Math.round(dimensions[0][1])+"%":"Not available";
    [["portfolioTechnicalBar",technical],["portfolioCommunicationBar",communication],["portfolioOverallBar",overall]].forEach(([id,value])=>{
      const bar=document.getElementById(id); if(bar) bar.style.width=(value||0)+"%";
    });
  }catch(err){body.innerHTML="<tr><td colspan=\"8\">Could not load rankings.</td></tr>";}
}

let sharedFilterTimer;
["sharedSearch","sharedTypeFilter","sharedDifficultyFilter","sharedSort"].forEach(id=>document.getElementById(id)?.addEventListener(id==="sharedSearch"?"input":"change",()=>{
  clearTimeout(sharedFilterTimer); sharedFilterTimer=setTimeout(loadSharedInterviews,200);
}));
document.getElementById("clearSharedFilters")?.addEventListener("click",()=>{
  ["sharedSearch","sharedTypeFilter","sharedDifficultyFilter"].forEach(id=>document.getElementById(id).value=""); document.getElementById("sharedSort").value="newest"; loadSharedInterviews();
});
document.getElementById("closeSharedReportBtn")?.addEventListener("click",closeSharedReport);
document.getElementById("sharedReportOverlay")?.addEventListener("click",event=>{if(event.target.id==="sharedReportOverlay")closeSharedReport();});
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeSharedReport();});

loadSharedInterviews();
loadRecruiterRankings();
