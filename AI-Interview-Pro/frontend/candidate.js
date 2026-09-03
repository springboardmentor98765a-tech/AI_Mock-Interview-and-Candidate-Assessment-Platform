
/* ==========================================================
            AI INTERVIEW PRO
            CANDIDATE DASHBOARD JS
========================================================== */



/* ===============================
        AUTH GUARD (added)
================================ */

requireAuth("candidate");
wireLogoutButton("#logoutBtn");





/* ===============================
        SIDEBAR SMOOTH SCROLL
================================ */



const sidebarLinks =
document.querySelectorAll(
    ".candidate-sidebar nav a"
);



sidebarLinks.forEach(link=>{


    link.addEventListener("click",(e)=>{


        e.preventDefault();



        const section =
        document.querySelector(
            link.getAttribute("href")
        );



        if(section){


            section.scrollIntoView({

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


        const sectionTop =
        section.offsetTop - 150;



        if(window.scrollY >= sectionTop){


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
        START INTERVIEW (scrolls to the
        real AI Interview setup form below)
================================ */



const startInterview =
document.querySelector(
    ".start-interview"
);



if(startInterview){


startInterview.addEventListener(
"click",
()=>{


    const setupPanel =
    document.getElementById("aiInterviewSetup");


    if(setupPanel){

        setupPanel.scrollIntoView({ behavior: "smooth" });

    }


});


}




/* ===============================
        SAVE SETTINGS
================================ */



const saveButton =
document.querySelector(
    ".settings-panel button"
);



if(saveButton){


saveButton.addEventListener(
"click",
()=>{


    alert(
        "Settings saved successfully ✅"
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


logout.addEventListener(
"click",
()=>{


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
        RESUME ACTIONS
================================ */



const resumeCard =
document.querySelector(
    ".resume-score-card"
);



if(resumeCard){


resumeCard.addEventListener(
"click",
()=>{


    alert(
        "Opening detailed AI Resume Report 📄"
    );


});


}








/* ===============================
        ACHIEVEMENT ANIMATION
================================ */



const achievementCards =
document.querySelectorAll(
    ".achievement-card"
);



achievementCards.forEach(card=>{


    card.addEventListener(
    "mouseenter",
    ()=>{


        card.style.transform =
        "translateY(-10px)";


    });



    card.addEventListener(
    "mouseleave",
    ()=>{


        card.style.transform =
        "translateY(0)";


    });



});









/* ===============================
        PAGE LOAD
================================ */



window.addEventListener(
"load",
()=>{


console.log(
"Candidate Dashboard Loaded Successfully 🚀"
);


});


/* ===============================
        RESUME UPLOAD
================================ */


const resumeInput =
document.getElementById("resumeFile");


const fileName =
document.getElementById("file-name");


const analyzeButton =
document.getElementById("analyzeResume");




if(resumeInput){


resumeInput.addEventListener(
"change",
()=>{


    if(resumeInput.files.length > 0){


        fileName.innerHTML =
        resumeInput.files[0].name;


    }


});


}





// analyzeButton real click handler is wired further down,
// in the AI INTERVIEW / RESUME FUNCTIONAL LOGIC block.


const userName = localStorage.getItem("userName");

if (userName) {

    const welcomeUser = document.getElementById("welcomeUser");
    const overviewUser = document.getElementById("overviewUser");

    if (welcomeUser) {
        welcomeUser.innerHTML = `Welcome, ${userName} 👋`;
    }

    if (overviewUser) {
        overviewUser.textContent = userName;
    }

}

/* ==========================================================
   AI INTERVIEW / RESUME - FUNCTIONAL LOGIC
   (Module 2 - Resume Parsing, Module 3 - AI Interview Generation)
========================================================== */

// Minimal dashboard-side state: the live interview itself now runs on
// its own full-page (interview-session.html) - see MODULE 4 there.
const aiState = {
  currentInterviewId: null,
};

const ACTIVE_SESSION_KEY = "aiip_active_interview_id";

function getActiveSessionFromStorage() {
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch (err) {
    return null;
  }
}

function clearActiveSessionFromStorage() {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (err) { /* non-fatal */ }
}

/* ==========================================================
   MODULE 4 - INTERVIEW SESSION MANAGEMENT (entry points only)
   The actual live session - webcam/mic, recording, timer,
   pause/resume, full-screen proctoring, question flow - runs on
   its own dedicated page: interview-session.html. This dashboard
   only (a) sends the candidate there after generating an interview,
   and (b) sends them back there if they refresh mid-interview.
========================================================== */

async function resumeActiveInterviewIfAny() {
  const savedInterviewId = getActiveSessionFromStorage();
  if (!savedInterviewId) return;

  try {
    const response = await authFetch("/interviews/" + savedInterviewId + "/session");

    if (!response.ok) {
      clearActiveSessionFromStorage();
      return;
    }

    const session = await response.json();

    if (session.is_complete || session.interview.status === "completed") {
      clearActiveSessionFromStorage();
      return;
    }

    window.location.href = "interview-session.html?interview_id=" + savedInterviewId;
  } catch (err) {
    console.warn("Could not resume active interview session:", err);
  }
}

function show(el) { if (el) el.style.display = ""; }
function hide(el) { if (el) el.style.display = "none"; }

/* ---------------------------------------------------------
   RESUME UPLOAD (Module 2)
--------------------------------------------------------- */

async function uploadResumeFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(API_BASE_URL + "/resume/upload", {
    method: "POST",
    headers: { Authorization: "Bearer " + getToken() },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Resume upload failed.");
  }

  return data;
}

function renderResumeResults(resume) {
  const resultsPanel = document.getElementById("resumeResultsPanel");
  const skillsCard = document.getElementById("resumeSkillsCard");
  const summaryCard = document.getElementById("resumeSummaryCard");

  const skills = resume.resume_skills || [];
  const byCategory = resume.resume_skills_by_category || {};
  const experience = resume.resume_experience || [];
  const education = resume.resume_education || [];

  document.getElementById("resumeExperienceCircle").textContent =
    resume.resume_experience_years != null ? resume.resume_experience_years + "y" : "-";

  document.getElementById("resumeSkillsSummaryText").textContent =
    skills.length ? skills.join(", ") : "No skills detected";

  document.getElementById("resumeEducationText").textContent =
    education.length
      ? education.map(e => e.degree + (e.institution ? " - " + e.institution : "")).join(" | ")
      : "Not detected";

  document.getElementById("resumeWorkExpText").textContent =
    experience.length ? experience.length + " entries found" : "Not detected";

  show(resultsPanel);

  const categoryContainer = document.getElementById("resumeSkillsByCategory");
  categoryContainer.innerHTML = "";

  const categoryLabels = {
    languages: "Languages",
    databases: "Databases",
    frameworks: "Frameworks",
    cloud_devops: "Cloud / DevOps",
    data_ml: "Data / Machine Learning",
    web_core: "Web Core",
  };

  Object.keys(byCategory).forEach(cat => {
    const items = byCategory[cat];
    if (!items || items.length === 0) return;

    const block = document.createElement("div");
    block.className = "resume-category-block";

    const title = document.createElement("div");
    title.className = "resume-category-title";
    title.textContent = categoryLabels[cat] || cat;

    const list = document.createElement("div");
    list.className = "resume-skills-list";

    items.forEach(skill => {
      const chip = document.createElement("span");
      chip.className = "resume-skill-chip";
      chip.textContent = skill;
      list.appendChild(chip);
    });

    block.appendChild(title);
    block.appendChild(list);
    categoryContainer.appendChild(block);
  });

  if (skills.length === 0 && Object.keys(byCategory).length === 0) {
    categoryContainer.innerHTML = "<p class=\"hint\">No specific skills detected.</p>";
  }

  show(skillsCard);

  if (resume.resume_summary) {
    document.getElementById("resumeSummaryText").textContent = resume.resume_summary;
    show(summaryCard);
  } else {
    hide(summaryCard);
  }

  const useResumeCheckbox = document.getElementById("setupUseResume");
  const resumeHint = document.getElementById("setupResumeHint");

  if (skills.length > 0) {
    useResumeCheckbox.disabled = false;
    resumeHint.textContent =
      "Resume loaded (" + skills.length + " skills detected) - ready to use for a technical interview.";
  } else {
    useResumeCheckbox.disabled = true;
    resumeHint.textContent = "No skills detected on your resume yet - type a domain manually instead.";
  }
}

// NOTE: intentionally not called anywhere. Previously this ran on every
// dashboard page load and re-displayed the candidate's last-uploaded
// resume skills, even after they'd navigated away and back in a new
// session - so the "Skills Detected" panel never actually reset. Skills
// now only ever appear right after an explicit upload (see the
// analyzeResume click handler above), which resets on every fresh visit
// to this page since resumeResultsPanel/resumeSkillsCard start hidden.
async function loadExistingResume() {
  try {
    const response = await authFetch("/resume");
    if (!response.ok) return;

    const data = await response.json();

    if (data.resume_skills && data.resume_skills.length > 0) {
      renderResumeResults(data);
    }
  } catch (err) {
    console.warn("Could not load existing resume:", err);
  }
}

const resumeInputEl = document.getElementById("resumeFile");
const analyzeButtonEl = document.getElementById("analyzeResume");
const resumeUploadStatusEl = document.getElementById("resumeUploadStatus");

if (analyzeButtonEl) {
  analyzeButtonEl.addEventListener("click", async () => {

    if (!resumeInputEl || resumeInputEl.files.length === 0) {
      resumeUploadStatusEl.textContent = "Please choose a resume file first.";
      resumeUploadStatusEl.style.color = "#dc2626";
      return;
    }

    const file = resumeInputEl.files[0];

    analyzeButtonEl.disabled = true;
    resumeUploadStatusEl.style.color = "#2563eb";
    resumeUploadStatusEl.textContent = "Analyzing resume with AI...";

    try {
      const resume = await uploadResumeFile(file);
      renderResumeResults(resume);
      resumeUploadStatusEl.style.color = "#16a34a";
      resumeUploadStatusEl.textContent = "Resume analyzed successfully!";
    } catch (err) {
      resumeUploadStatusEl.style.color = "#dc2626";
      resumeUploadStatusEl.textContent = err.message || "Something went wrong analyzing your resume.";
    } finally {
      analyzeButtonEl.disabled = false;
    }

  });
}

/* ---------------------------------------------------------
   INTERVIEW SETUP (Module 3)
--------------------------------------------------------- */

const setupUseResumeEl = document.getElementById("setupUseResume");
const setupDomainWrapEl = document.getElementById("setupDomainWrap");
const setupDomainEl = document.getElementById("setupDomain");

if (setupUseResumeEl) {
  setupUseResumeEl.addEventListener("change", () => {
    if (setupUseResumeEl.checked) {
      hide(setupDomainWrapEl);
    } else {
      show(setupDomainWrapEl);
    }
  });
}

const generateInterviewBtnEl = document.getElementById("generateInterviewBtn");
const setupErrorEl = document.getElementById("setupError");

if (generateInterviewBtnEl) {
  generateInterviewBtnEl.addEventListener("click", async () => {

    setupErrorEl.textContent = "";

    const interviewType = document.getElementById("setupType").value;
    const difficulty = document.getElementById("setupDifficulty").value;
    const numQuestions = parseInt(document.getElementById("setupNumQuestions").value, 10) || 5;
    const durationMinutes = parseInt(document.getElementById("setupDuration").value, 10) || 0;
    const useResume = setupUseResumeEl.checked;
    const domain = setupDomainEl.value.trim();

    if (!useResume && !domain) {
      setupErrorEl.textContent = "Please enter a domain, or check the resume-skills option.";
      return;
    }

    const payload = {
      interview_type: interviewType,
      difficulty: difficulty,
      num_questions: numQuestions,
      use_resume_skills: useResume,
      duration_minutes: durationMinutes > 0 ? durationMinutes : null,
    };

    if (!useResume) {
      payload.domain = domain;
    }

    generateInterviewBtnEl.disabled = true;
    const originalText = generateInterviewBtnEl.textContent;
    generateInterviewBtnEl.textContent = "Generating with AI...";

    try {
      const response = await authFetch("/interviews/generate", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not generate interview questions.");
      }

      // Module 4 - the live session runs on its own full-page.
      window.location.href = "interview-session.html?interview_id=" + data.id;

    } catch (err) {
      setupErrorEl.textContent = err.message || "Something went wrong. Please try again.";
    } finally {
      generateInterviewBtnEl.disabled = false;
      generateInterviewBtnEl.textContent = originalText;
    }

  });
}

const scrollToSetupBtnEl = document.getElementById("scrollToSetupBtn");
if (scrollToSetupBtnEl) {
  scrollToSetupBtnEl.addEventListener("click", () => {
    const setupPanel = document.getElementById("aiInterviewSetup");
    if (setupPanel) setupPanel.scrollIntoView({ behavior: "smooth" });
  });
}

/* ---------------------------------------------------------
   INTERVIEW HISTORY
--------------------------------------------------------- */

function formatDate(isoString) {
  if (!isoString) return "-";
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function loadHistory() {
  const tbody = document.getElementById("historyTableBody");
  if (!tbody) return;

  try {
    const response = await authFetch("/interviews/history");

    if (!response.ok) {
      tbody.innerHTML = "<tr><td colspan=\"6\">Could not load history.</td></tr>";
      return;
    }

    const interviews = await response.json();

    if (interviews.length === 0) {
      tbody.innerHTML = "<tr><td colspan=\"6\">No completed interviews yet. Finish one above to see it here.</td></tr>";
      return;
    }

    tbody.innerHTML = "";

    interviews.forEach(interview => {
      const row = document.createElement("tr");

      row.innerHTML =
        "<td>" + interview.interview_type + " - " + interview.domain + "</td>" +
        "<td>" + interview.difficulty + "</td>" +
        "<td>" + formatDate(interview.completed_at || interview.created_at) + "</td>" +
        "<td>" + interview.answered_count + " / " + interview.total_questions + "</td>" +
        "<td>" + (interview.overall_score != null ? Math.round(interview.overall_score) + "%" : "-") + "</td>" +
        "<td><span class=\"status-badge status-" + interview.status + "\">" + interview.status +
          (interview.time_expired ? " (time expired)" : "") + "</span></td>";

      row.addEventListener("click", () => viewInterviewDetail(interview.id));

      tbody.appendChild(row);
    });

  } catch (err) {
    tbody.innerHTML = "<tr><td colspan=\"6\">Could not load history.</td></tr>";
  }
}

async function viewInterviewDetail(interviewId) {
  const panel = document.getElementById("historyDetailPanel");
  const titleEl = document.getElementById("historyDetailTitle");
  const scoreEl = document.getElementById("historyDetailScore");
  const recordingsEl = document.getElementById("historyDetailRecordings");
  const qaEl = document.getElementById("historyDetailQA");
  const assessmentEl = document.getElementById("historyDetailAssessment");

  try {
    const response = await authFetch("/interviews/" + interviewId);

    if (!response.ok) return;

    const interview = await response.json();
    let assessment = interview.assessment || null;
    if (!assessment) {
      const assessmentResponse = await authFetch("/interviews/" + interviewId + "/assessment");
      if (assessmentResponse.ok) assessment = await assessmentResponse.json();
    }

    titleEl.textContent =
      interview.interview_type + " interview - " + interview.domain + " (" + interview.difficulty + ")";

    if (scoreEl) {
      const displayScore = assessment ? assessment.overall_score : interview.overall_score;
      scoreEl.textContent = displayScore != null
        ? "Overall score: " + Math.round(displayScore) + "%" + (assessment ? " · " + assessment.performance_rating : "")
        : "";
    }

    renderModule7Assessment(assessmentEl, assessment);

    if (recordingsEl) {
      recordingsEl.innerHTML = "<p class=\"hint\">Loading your session recording...</p>";
      loadHistoryDetailRecordings(interviewId, recordingsEl);
    }

    qaEl.innerHTML = "";

    interview.questions.forEach((q, index) => {
      const item = document.createElement("div");
      item.className = "qa-item";

      const questionLine = document.createElement("div");
      questionLine.className = "qa-question";
      questionLine.textContent = (index + 1) + ". " + q.question_text;

      const answerLine = document.createElement("div");
      answerLine.className = "qa-answer";
      answerLine.textContent = q.answer_text ? "Your answer: " + q.answer_text : "Not answered.";

      item.appendChild(questionLine);
      item.appendChild(answerLine);

      if (q.overall_score != null) {
        const scoreLine = document.createElement("div");
        scoreLine.className = "qa-score";
        scoreLine.textContent =
          "Score: " + Math.round(q.overall_score) + "% " +
          "(Technical " + Math.round(q.technical_score) + "%, " +
          "Communication " + Math.round(q.communication_score) + "%, " +
          "Confidence " + Math.round(q.confidence_score) + "%, " +
          "Professionalism " + Math.round(q.professionalism_score != null ? q.professionalism_score : q.communication_score) + "%)";
        item.appendChild(scoreLine);
      }

      if (q.question_feedback) {
        const feedbackLine = document.createElement("p");
        feedbackLine.className = "qa-feedback";
        feedbackLine.textContent = q.question_feedback;
        item.appendChild(feedbackLine);
      }

      // Module 5 - Speech-to-Text & Communication Analysis: only shown
      // for answers actually spoken (voice input), not typed.
      if (q.speech_duration_seconds) {
        const speechLine = document.createElement("div");
        speechLine.className = "qa-speech-metrics";

        const fillerSpan = document.createElement("span");
        fillerSpan.textContent = "🗯 " + (q.filler_word_count != null ? q.filler_word_count : 0) + " filler words";
        speechLine.appendChild(fillerSpan);

        if (q.speaking_pace_wpm != null) {
          const paceSpan = document.createElement("span");
          paceSpan.textContent = "⏱ " + Math.round(q.speaking_pace_wpm) + " WPM";
          speechLine.appendChild(paceSpan);
        }

        if (q.pronunciation_score != null) {
          const claritySpan = document.createElement("span");
          claritySpan.textContent = "🔊 " + Math.round(q.pronunciation_score) + "% clarity";
          speechLine.appendChild(claritySpan);
        }

        item.appendChild(speechLine);
      }

      qaEl.appendChild(item);
    });

    show(panel);
    panel.scrollIntoView({ behavior: "smooth" });

  } catch (err) {
    console.error("Could not load interview detail:", err);
  }
}

function renderModule7Assessment(container, assessment) {
  if (!container) return;
  container.innerHTML = "";
  if (!assessment) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "A detailed assessment is not available for this interview.";
    container.appendChild(empty);
    return;
  }

  const scoreGrid = document.createElement("div");
  scoreGrid.className = "assessment-score-grid";
  [
    ["Communication", assessment.communication_score, "30%"],
    ["Confidence", assessment.confidence_score, "25%"],
    ["Technical relevance", assessment.technical_score, "30%"],
    ["Professionalism", assessment.professionalism_score, "15%"],
  ].forEach(([label, value, weight]) => {
    const card = document.createElement("div");
    card.className = "assessment-score-card";
    const heading = document.createElement("span");
    heading.textContent = label + " · " + weight;
    const score = document.createElement("strong");
    score.textContent = Math.round(value) + "%";
    const track = document.createElement("div");
    track.className = "assessment-mini-track";
    const fill = document.createElement("span");
    fill.style.width = Math.max(0, Math.min(100, value)) + "%";
    track.appendChild(fill);
    card.append(heading, score, track);
    scoreGrid.appendChild(card);
  });
  container.appendChild(scoreGrid);

  const feedback = assessment.feedback || {};
  if (feedback.overall_summary) {
    const summary = document.createElement("p");
    summary.className = "assessment-summary";
    summary.textContent = feedback.overall_summary;
    container.appendChild(summary);
  }

  const feedbackGrid = document.createElement("div");
  feedbackGrid.className = "assessment-feedback-grid";
  [
    ["Strengths", feedback.strengths],
    ["Areas to improve", feedback.weaknesses],
    ["Next steps", feedback.improvement_suggestions],
    ["Practice recommendations", feedback.practice_recommendations],
    ["Learning resources", feedback.learning_resources],
  ].forEach(([title, items]) => {
    if (!Array.isArray(items) || !items.length) return;
    const section = document.createElement("section");
    const heading = document.createElement("h4");
    heading.textContent = title;
    const list = document.createElement("ul");
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    section.append(heading, list);
    feedbackGrid.appendChild(section);
  });
  container.appendChild(feedbackGrid);

  if (Array.isArray(assessment.missing_data) && assessment.missing_data.length) {
    const missing = document.createElement("p");
    missing.className = "assessment-data-note";
    missing.textContent = "Some optional inputs were unavailable: " + assessment.missing_data.join(", ").replaceAll("_", " ") + ". Scores were normalized from available evidence.";
    container.appendChild(missing);
  }
}

// Module 6 - Emotion Detection & Eye Tracking: renders a small summary
// card of the session's real, accumulated webcam-analysis stats (eye
// contact %, dominant emotion, visual confidence, engagement). Returns
// null when the session never collected any samples (camera was off,
// or face-api.js couldn't load in the candidate's browser).
function buildSessionEmotionSummary(session) {
  if (!session || !session.emotion_sample_count) return null;

  const box = document.createElement("div");
  box.className = "session-emotion-summary";

  const heading = document.createElement("h4");
  heading.textContent = "🧠 Emotion & Eye Tracking Summary";
  box.appendChild(heading);

  const rows = [
    ["👀 Eye contact", session.eye_contact_percentage != null ? Math.round(session.eye_contact_percentage) + "%" : "-"],
    ["🧍 Attention (in frame)", session.attention_percentage != null ? Math.round(session.attention_percentage) + "%" : "-"],
    ["🙂 Dominant emotion", session.dominant_emotion || "-"],
    ["😊 Visual confidence", session.avg_visual_confidence != null ? Math.round(session.avg_visual_confidence) + "%" : "-"],
    ["🎯 Engagement", session.avg_engagement != null ? Math.round(session.avg_engagement) + "%" : "-"],
  ];

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "emotion-stat-row";

    const labelSpan = document.createElement("span");
    labelSpan.textContent = label;

    const valueStrong = document.createElement("strong");
    valueStrong.textContent = value;

    row.appendChild(labelSpan);
    row.appendChild(valueStrong);
    box.appendChild(row);
  });

  // Module 6 - Interview behavior analysis: a rule-based summary
  // sentence the backend derives from the stats above.
  if (session.behavior_summary) {
    const behaviorP = document.createElement("p");
    behaviorP.className = "hint";
    behaviorP.style.marginTop = "10px";
    behaviorP.textContent = session.behavior_summary;
    box.appendChild(behaviorP);
  }

  return box;
}

// Module 4 - fetches the session tied to this interview (which embeds
// its recordings) so the candidate can play back their own webcam/mic
// recording straight from their dashboard history.
async function loadHistoryDetailRecordings(interviewId, container) {
  try {
    const response = await authFetch("/interviews/" + interviewId + "/session");
    if (!response.ok) {
      container.innerHTML = "";
      return;
    }

    const data = await response.json();
    const sessionId = data.session ? data.session.id : null;
    const recordings = (data.session && data.session.recordings) || [];

    // Module 6 - Emotion Detection & Eye Tracking: session-level summary,
    // built from the running aggregates the backend computed from the
    // candidate's own webcam samples (see /sessions/{id}/emotion-samples).
    const emotionSummaryEl = buildSessionEmotionSummary(data.session);

    if (!recordings.length) {
      container.innerHTML = "<p class=\"hint\">No recording was saved for this session.</p>";
      if (emotionSummaryEl) container.prepend(emotionSummaryEl);
      return;
    }

    container.innerHTML = "<p class=\"hint\">🎬 Your session recording" + (recordings.length > 1 ? "s" : "") + "</p>";
    if (emotionSummaryEl) container.prepend(emotionSummaryEl);

    recordings.forEach((recording) => {
      const wrap = document.createElement("div");
      wrap.className = "history-recording-clip";

      // recording_url is normally a relative "/media/..." path, but be
      // defensive in case it's ever already absolute (e.g. a future S3
      // backend) - don't double-prefix it in that case.
      const recordingUrl = /^https?:\/\//i.test(recording.recording_url || "")
        ? recording.recording_url
        : API_BASE_URL + recording.recording_url;

      const media = document.createElement(recording.recording_type === "audio" ? "audio" : "video");
      media.controls = true;
      media.preload = "metadata";
      media.src = recordingUrl;
      if (recording.recording_type !== "audio") {
        media.style.width = "100%";
        media.style.maxWidth = "360px";
        media.style.borderRadius = "12px";
      }

      wrap.appendChild(media);

      // If playback fails inline (older recording, moved/renamed file,
      // unsupported codec, etc.), don't just leave a blank/broken player -
      // show a direct link so the recording is still reachable.
      const errorMsg = document.createElement("p");
      errorMsg.className = "hint recording-clip-error";
      errorMsg.style.display = "none";
      errorMsg.innerHTML = "⚠ Couldn't play this recording inline. " +
        "<a href=\"" + recordingUrl + "\" target=\"_blank\" rel=\"noopener\">Open it directly</a>.";
      media.addEventListener("error", () => {
        media.style.display = "none";
        errorMsg.style.display = "";
      });
      wrap.appendChild(errorMsg);

      if (sessionId) {
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "delete-recording-btn";
        deleteBtn.title = "Delete this recording";
        deleteBtn.innerHTML = "🗑 Delete recording";
        deleteBtn.addEventListener("click", () => {
          deleteRecording(sessionId, recording.id, wrap, container);
        });
        wrap.appendChild(deleteBtn);
      }

      container.appendChild(wrap);
    });
  } catch (err) {
    console.warn("Could not load session recording:", err);
    container.innerHTML = "";
  }
}

async function deleteRecording(sessionId, recordingId, clipEl, container) {
  const confirmed = window.confirm("Delete this recording? This can't be undone.");
  if (!confirmed) return;

  try {
    const response = await authFetch(
      "/sessions/" + sessionId + "/recordings/" + recordingId,
      { method: "DELETE" }
    );

    if (!response.ok) {
      window.alert("Could not delete the recording. Please try again.");
      return;
    }

    clipEl.remove();

    if (!container.querySelector(".history-recording-clip")) {
      container.innerHTML = "<p class=\"hint\">No recording was saved for this session.</p>";
    }
  } catch (err) {
    console.warn("Could not delete recording:", err);
    window.alert("Could not delete the recording. Please try again.");
  }
}

const closeHistoryDetailEl = document.getElementById("closeHistoryDetail");
if (closeHistoryDetailEl) {
  closeHistoryDetailEl.addEventListener("click", () => {
    hide(document.getElementById("historyDetailPanel"));
  });
}

/* ---------------------------------------------------------
   PERFORMANCE ANALYTICS (real, computed from interview history)
--------------------------------------------------------- */

function formatPercent(value) {
  return value == null ? "-" : Math.round(value) + "%";
}

async function loadAnalytics() {
  try {
    const response = await authFetch("/interviews/analytics");
    if (!response.ok) return;

    const a = await response.json();

    // ---- Overview section ----
    setText("statReadiness", formatPercent(a.interview_readiness));
    setText("statResumeScore", formatPercent(a.resume_score));
    setText("statCompletedInterviews", a.completed_interviews);
    setText("statAverageScore", formatPercent(a.average_score));
    setText(
      "statSkillGrowth",
      a.skill_growth_percent > 0
        ? "+" + a.skill_growth_percent + "%"
        : a.skill_growth_percent + "%"
    );

    // ---- Mock interview room stats ----
    setText("statLastScore", formatPercent(a.last_score));
    setText("statQuestionsAnswered", a.total_questions_answered);
    setText(
      "statAverageTime",
      a.average_duration_minutes != null ? Math.round(a.average_duration_minutes) + " min" : "-"
    );

    // ---- Analytics section (progress bars) ----
    setProgress("communicationProgressBar", "communicationScoreText", a.communication_avg);
    setProgress("technicalProgressBar", "technicalScoreText", a.technical_avg);
    setProgress("confidenceProgressBar", "confidenceScoreText", a.confidence_avg);
    setProgress("professionalismProgressBar", "professionalismScoreText", a.professionalism_avg);

    const analyticsEmptyHint = document.getElementById("analyticsEmptyHint");
    if (analyticsEmptyHint) {
      analyticsEmptyHint.style.display = a.completed_interviews > 0 ? "none" : "";
    }

    // ---- Module 5 - Speech-to-Text & Communication Analysis ----
    setText(
      "statAvgFillerWords",
      a.avg_filler_word_count != null ? a.avg_filler_word_count.toFixed(1) : "-"
    );
    setText(
      "statAvgPace",
      a.avg_speaking_pace_wpm != null ? Math.round(a.avg_speaking_pace_wpm) + " WPM" : "-"
    );
    setProgress("clarityProgressBar", "statAvgClarity", a.avg_pronunciation_score);

    // ---- Module 6 - Emotion Detection & Eye Tracking ----
    setProgress("eyeContactProgressBar", "statAvgEyeContact", a.avg_eye_contact_percentage);
    setProgress("attentionProgressBar", "statAvgAttention", a.avg_attention_percentage);
    setProgress("visualConfidenceProgressBar", "statAvgVisualConfidence", a.avg_visual_confidence);
    setProgress("engagementProgressBar", "statAvgEngagement", a.avg_engagement);

    const speechEmotionEmptyHint = document.getElementById("speechEmotionEmptyHint");
    if (speechEmotionEmptyHint) {
      const hasSpeechOrEmotionData =
        a.avg_speaking_pace_wpm != null || a.avg_eye_contact_percentage != null;
      speechEmotionEmptyHint.style.display = hasSpeechOrEmotionData ? "none" : "";
    }

    // ---- Achievements (unlocked only once genuinely earned) ----
    updateAchievement(
      "achv10Interviews",
      "achv10InterviewsText",
      a.completed_interviews >= 10,
      "Completed " + a.completed_interviews + " AI interviews.",
      "Complete 10 AI interviews to unlock (" + a.completed_interviews + "/10 so far)."
    );
    updateAchievement(
      "achvTopPerformer",
      "achvTopPerformerText",
      a.average_score != null && a.average_score >= 85,
      "Maintaining an average score of " + Math.round(a.average_score) + "%.",
      "Maintain an average score above 85% to unlock."
    );
    updateAchievement(
      "achvSkillGrowth",
      "achvSkillGrowthText",
      a.skill_growth_percent > 0,
      "Your score improved by " + a.skill_growth_percent + "% across recent interviews.",
      "Improve your score across interviews to unlock."
    );

  } catch (err) {
    console.warn("Could not load analytics:", err);
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setProgress(barId, textId, value) {
  const bar = document.getElementById(barId);
  const text = document.getElementById(textId);
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));

  if (bar) bar.style.width = pct + "%";
  if (text) text.textContent = formatPercent(value);
}

function updateAchievement(cardId, textId, unlocked, unlockedText, lockedText) {
  const card = document.getElementById(cardId);
  const text = document.getElementById(textId);

  if (card) card.classList.toggle("locked", !unlocked);
  if (text) text.textContent = unlocked ? unlockedText : lockedText;
}

/* ---------------------------------------------------------
   INITIAL LOAD
--------------------------------------------------------- */

loadHistory();
loadAnalytics();

// Module 4 - session storage & management: if the candidate refreshed
// mid-interview, pick up right where they left off instead of losing
// their progress.
resumeActiveInterviewIfAny();

// Module 4 - interview-session.html redirects back here with this query
// param once an interview ends, so the candidate lands straight on
// their performance analytics/score for that attempt.
(function showCompletedInterviewIfLinked() {
  const params = new URLSearchParams(window.location.search);
  const completedId = params.get("completed_interview");
  if (!completedId) return;

  const analyticsSection = document.getElementById("analytics");
  if (analyticsSection) analyticsSection.scrollIntoView({ behavior: "smooth" });

  viewInterviewDetail(completedId);
})();
