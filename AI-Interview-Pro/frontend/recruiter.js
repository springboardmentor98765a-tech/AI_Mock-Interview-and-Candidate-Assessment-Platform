
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
    ".recruiter-sidebar nav a"
);



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


        alert(
            "Report generated successfully 📄"
        );


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


    alert(
        "Recruiter settings saved successfully"
    );


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
    if (statusEl) statusEl.textContent = "No candidates have uploaded a resume yet.";
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

function absoluteRecordingUrl(recordingUrl) {
  if (!recordingUrl) return "";
  // recording_url is normally a relative "/media/..." path, but be
  // defensive in case a storage backend (e.g. S3) ever returns an
  // already-absolute URL - don't double-prefix it in that case.
  return /^https?:\/\//i.test(recordingUrl) ? recordingUrl : API_BASE_URL + recordingUrl;
}

function recordingClipMarkup(recording) {
  const url = absoluteRecordingUrl(recording.recording_url);
  const isAudio = recording.recording_type === "audio";
  const label =
    (isAudio ? "🎙 Audio" : "🎬 Video") +
    " - " + escapeHtml(recording.interview_domain) +
    (recording.interview_score != null ? " (" + Math.round(recording.interview_score) + "%)" : "");

  const clipId = "rec-" + recording.id;
  const mediaTag = isAudio
    ? "<audio controls preload=\"metadata\" src=\"" + url + "\"></audio>"
    : "<video controls preload=\"metadata\" playsinline src=\"" + url + "\"></video>";

  // Some recordings can fail to play inline (unsupported codec, the
  // backend not running, a moved/renamed file, etc). Rather than leaving
  // the recruiter looking at a blank/broken player with no way to tell
  // why, show a visible fallback message + a direct link the moment the
  // media element fires an error, so the recording is always reachable.
  return (
    "<div class=\"recording-clip\" id=\"" + clipId + "\">" +
      mediaTag +
      "<p class=\"recording-clip-error\" style=\"display:none;\">" +
        "⚠ Couldn't play this recording inline. " +
        "<a href=\"" + url + "\" target=\"_blank\" rel=\"noopener\">Open it directly</a>." +
      "</p>" +
      "<p class=\"recording-clip-label\">" + label + "</p>" +
    "</div>"
  );
}

function wireRecordingErrorFallbacks(container) {
  container.querySelectorAll(".recording-clip").forEach((clipEl) => {
    const mediaEl = clipEl.querySelector("video, audio");
    const errorEl = clipEl.querySelector(".recording-clip-error");
    if (!mediaEl || !errorEl) return;
    mediaEl.addEventListener("error", () => {
      mediaEl.style.display = "none";
      errorEl.style.display = "";
    });
  });
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
    if (metaBits) html += "<p class=\"profile-empty-text\">" + metaBits + "</p>";

    html += "<button type=\"button\" class=\"profile-resume-text-toggle\" id=\"toggleResumeTextBtn\">View full resume text</button>";
    html += "<div class=\"profile-resume-fulltext\" id=\"resumeFullText\" style=\"display:none;\">" +
      escapeHtml(resume.resume_text || "(no extracted text)") + "</div>";
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

    const toggleBtn = document.getElementById("toggleResumeTextBtn");
    const fullTextEl = document.getElementById("resumeFullText");
    if (toggleBtn && fullTextEl) {
      toggleBtn.addEventListener("click", () => {
        const isHidden = fullTextEl.style.display === "none";
        fullTextEl.style.display = isHidden ? "" : "none";
        toggleBtn.textContent = isHidden ? "Hide full resume text" : "View full resume text";
      });
    }
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
