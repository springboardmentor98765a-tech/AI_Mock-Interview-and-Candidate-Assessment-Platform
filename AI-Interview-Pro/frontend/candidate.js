
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

const aiState = {
  currentInterviewId: null,
  currentQuestionId: null,
  currentQuestionText: "",
  deadlineAt: null,
  timerIntervalId: null,
};

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

      await beginInterview(data.id);

    } catch (err) {
      setupErrorEl.textContent = err.message || "Something went wrong. Please try again.";
    } finally {
      generateInterviewBtnEl.disabled = false;
      generateInterviewBtnEl.textContent = originalText;
    }

  });
}

/* ---------------------------------------------------------
   LIVE INTERVIEW SESSION (voice speak + voice capture)
--------------------------------------------------------- */

async function beginInterview(interviewId) {
  aiState.currentInterviewId = interviewId;
  aiState.deadlineAt = null;
  stopTimer();

  const response = await authFetch("/interviews/start?interview_id=" + interviewId, {
    method: "POST",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    setupErrorEl.textContent = data.detail || "Could not start the interview.";
    return;
  }

  hide(document.getElementById("aiInterviewSetup"));
  hide(document.getElementById("aiInterviewComplete"));
  show(document.getElementById("aiInterviewSession"));

  await loadSession(interviewId);
}

/* ---------------- Timer (Timed Interview feature) ---------------- */

function startTimer(deadlineAt) {
  stopTimer();
  aiState.deadlineAt = deadlineAt;

  const timerEl = document.getElementById("sessionTimer");
  if (!timerEl || !deadlineAt) return;
  show(timerEl);

  function tick() {
    const remainingMs = new Date(aiState.deadlineAt).getTime() - Date.now();

    if (remainingMs <= 0) {
      timerEl.textContent = "⏱ 00:00";
      handleInterviewTimeout();
      return;
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const ss = String(totalSeconds % 60).padStart(2, "0");
    timerEl.textContent = "⏱ " + mm + ":" + ss;

    if (totalSeconds <= 60) {
      timerEl.classList.add("session-timer-warning");
    }
  }

  tick();
  aiState.timerIntervalId = setInterval(tick, 1000);
}

function stopTimer() {
  if (aiState.timerIntervalId) {
    clearInterval(aiState.timerIntervalId);
    aiState.timerIntervalId = null;
  }
  const timerEl = document.getElementById("sessionTimer");
  if (timerEl) {
    hide(timerEl);
    timerEl.classList.remove("session-timer-warning");
  }
}

async function handleInterviewTimeout() {
  stopTimer();

  try {
    await authFetch("/interviews/" + aiState.currentInterviewId + "/timeout", {
      method: "POST",
    });
  } catch (err) {
    console.warn("Could not register interview timeout:", err);
  }

  window.speechSynthesis && window.speechSynthesis.cancel();

  hide(document.getElementById("aiInterviewSession"));
  show(document.getElementById("aiInterviewComplete"));

  document.getElementById("completeSummary").textContent =
    "Time's up! Your interview ended automatically because the selected time limit was reached.";

  loadHistory();
  loadAnalytics();
}

async function loadSession(interviewId) {
  const response = await authFetch("/interviews/" + interviewId + "/session");

  if (!response.ok) {
    console.error("Could not load interview session.");
    return;
  }

  const session = await response.json();

  if (session.deadline_at && !aiState.deadlineAt) {
    startTimer(session.deadline_at);
  }

  if (session.is_complete) {
    showCompletion(session);
    return;
  }

  renderQuestion(session);
}

function renderQuestion(session) {
  const question = session.current_question;

  aiState.currentQuestionId = question.id;
  aiState.currentQuestionText = question.question_text;

  document.getElementById("sessionProgressText").textContent =
    "Question " + (session.answered_count + 1) + " of " + session.total_questions;

  document.getElementById("sessionProgressFill").style.width =
    Math.round((session.answered_count / session.total_questions) * 100) + "%";

  document.getElementById("questionCategory").textContent = question.category;
  document.getElementById("questionText").textContent = question.question_text;

  const answerBox = document.getElementById("answerText");
  answerBox.value = "";
  document.getElementById("answerError").textContent = "";

  speakText(question.question_text);
}

function speakText(text) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

const speakQuestionBtnEl = document.getElementById("speakQuestionBtn");
if (speakQuestionBtnEl) {
  speakQuestionBtnEl.addEventListener("click", () => {
    speakText(aiState.currentQuestionText);
  });
}

/* ---------------- Voice answer capture (speech-to-text) ---------------- */

const micBtnEl = document.getElementById("micBtn");
const micStatusEl = document.getElementById("micStatus");
const answerTextEl = document.getElementById("answerText");

let recognizer = null;
let isRecording = false;

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognitionCtor && micBtnEl) {

  recognizer = new SpeechRecognitionCtor();
  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.lang = "en-US";

  let baseAnswerText = "";

  recognizer.onstart = () => {
    isRecording = true;
    micBtnEl.classList.add("recording");
    micBtnEl.textContent = "⏹ Stop Recording";
    micStatusEl.textContent = "Listening...";
    baseAnswerText = answerTextEl.value ? answerTextEl.value + " " : "";
  };

  recognizer.onresult = (event) => {
    let transcript = "";
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    answerTextEl.value = (baseAnswerText + transcript).trim();
  };

  recognizer.onerror = (event) => {
    micStatusEl.textContent = "Voice input error: " + event.error;
  };

  recognizer.onend = () => {
    isRecording = false;
    micBtnEl.classList.remove("recording");
    micBtnEl.textContent = "🎤 Speak Your Answer";
    micStatusEl.textContent = "";
  };

  micBtnEl.addEventListener("click", () => {
    if (isRecording) {
      recognizer.stop();
    } else {
      try {
        recognizer.start();
      } catch (err) {
        console.warn("Could not start voice recognition:", err);
      }
    }
  });

} else if (micBtnEl) {
  micBtnEl.disabled = true;
  micBtnEl.textContent = "🎤 Voice not supported in this browser";
  micStatusEl.textContent = "Try Chrome on desktop, or just type your answer below.";
}

/* ---------------- Submit answer ---------------- */

const submitAnswerBtnEl = document.getElementById("submitAnswerBtn");

if (submitAnswerBtnEl) {
  submitAnswerBtnEl.addEventListener("click", async () => {

    const answerErrorEl = document.getElementById("answerError");
    answerErrorEl.textContent = "";

    const answerValue = answerTextEl.value.trim();

    if (!answerValue) {
      answerErrorEl.textContent = "Please provide an answer (speak or type) before submitting.";
      return;
    }

    if (isRecording && recognizer) {
      recognizer.stop();
    }

    submitAnswerBtnEl.disabled = true;
    const originalText = submitAnswerBtnEl.textContent;
    submitAnswerBtnEl.textContent = "Saving...";

    try {
      const response = await authFetch(
        "/interviews/" + aiState.currentInterviewId + "/questions/" + aiState.currentQuestionId + "/answer",
        {
          method: "PUT",
          body: JSON.stringify({ answer_text: answerValue }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not save your answer.");
      }

      await loadSession(aiState.currentInterviewId);

    } catch (err) {
      answerErrorEl.textContent = err.message || "Something went wrong saving your answer.";
    } finally {
      submitAnswerBtnEl.disabled = false;
      submitAnswerBtnEl.textContent = originalText;
    }

  });
}

/* ---------------- Completion ---------------- */

function showCompletion(session) {
  stopTimer();
  hide(document.getElementById("aiInterviewSession"));
  show(document.getElementById("aiInterviewComplete"));

  window.speechSynthesis && window.speechSynthesis.cancel();

  document.getElementById("completeSummary").textContent =
    "You answered all " + session.total_questions + " questions in this " +
    session.interview.interview_type + " interview on \"" + session.interview.domain + "\".";

  loadHistory();
  loadAnalytics();
}

const reviewAnswersBtnEl = document.getElementById("reviewAnswersBtn");
if (reviewAnswersBtnEl) {
  reviewAnswersBtnEl.addEventListener("click", () => {
    const historySection = document.getElementById("history");
    if (historySection) historySection.scrollIntoView({ behavior: "smooth" });
    if (aiState.currentInterviewId) {
      viewInterviewDetail(aiState.currentInterviewId);
    }
  });
}

const newInterviewBtnEl = document.getElementById("newInterviewBtn");
if (newInterviewBtnEl) {
  newInterviewBtnEl.addEventListener("click", () => {
    stopTimer();
    hide(document.getElementById("aiInterviewComplete"));
    hide(document.getElementById("aiInterviewSession"));
    show(document.getElementById("aiInterviewSetup"));
    aiState.currentInterviewId = null;
    aiState.currentQuestionId = null;
    aiState.deadlineAt = null;
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
  const qaEl = document.getElementById("historyDetailQA");

  try {
    const response = await authFetch("/interviews/" + interviewId);

    if (!response.ok) return;

    const interview = await response.json();

    titleEl.textContent =
      interview.interview_type + " interview - " + interview.domain + " (" + interview.difficulty + ")";

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
          "Grammar " + Math.round(q.grammar_score) + "%)";
        item.appendChild(scoreLine);
      }

      qaEl.appendChild(item);
    });

    show(panel);
    panel.scrollIntoView({ behavior: "smooth" });

  } catch (err) {
    console.error("Could not load interview detail:", err);
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
    setProgress("grammarProgressBar", "grammarScoreText", a.grammar_avg);

    const analyticsEmptyHint = document.getElementById("analyticsEmptyHint");
    if (analyticsEmptyHint) {
      analyticsEmptyHint.style.display = a.completed_interviews > 0 ? "none" : "";
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
