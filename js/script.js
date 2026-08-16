/* ==========================================
   SMARTHIRE AI
   SCRIPT.JS - PART 1
========================================== */

// =============================
// ELEMENTS
// =============================

const loginBtn = document.querySelector(".login-btn");
const loginModal = document.getElementById("loginModal");
const closeBtn = document.querySelector(".close-btn");

const loader = document.getElementById("loader");
const toast = document.getElementById("toast");
const topBtn = document.getElementById("topBtn");
const API_BASE = (window.smartHireApi && window.smartHireApi.baseUrl) ? window.smartHireApi.baseUrl : "http://localhost:8080";

let currentResumeId = null;

const getAuthHeaders = (contentType = true) => {
    const headers = {};
    if (contentType) {
        headers["Content-Type"] = "application/json";
    }
    const token = localStorage.getItem("authToken");
    if (token) {
        headers["Authorization"] = "Bearer " + token;
    }
    return headers;
};

const handleUnauthorizedResponse = (response) => {
    if(response && response.status===401){
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userName");
        localStorage.removeItem("userId");
        window.location.href="../index.html";
        return true;
    }
    return false;
};

// =============================
// PAGE LOADER
// =============================


window.addEventListener("load", () => {

    if(loader){

        loader.style.display = "flex";

        setTimeout(() => {

            loader.style.display = "none";

        },1200);

    }

});

// =============================
// LOGIN POPUP
// =============================

if(loginBtn){

    loginBtn.addEventListener("click", () => {

        loginModal.style.display = "flex";

    });

}

if(closeBtn){

    closeBtn.addEventListener("click", () => {

        loginModal.style.display = "none";

    });

}

// Close when clicking outside

window.addEventListener("click", (event)=>{

    if(event.target === loginModal){

        loginModal.style.display="none";

    }

});

// =============================
// LOGIN BUTTON
// =============================

const loginSubmit = document.getElementById("loginSubmit");

if(loginSubmit){

    loginSubmit.addEventListener("click",(event)=>{

        event.stopPropagation();

    });

}

// =============================
// BACK TO TOP
// =============================

window.addEventListener("scroll", () => {

    if(topBtn){

        if(window.scrollY > 300){

            topBtn.style.display = "block";

        }else{

            topBtn.style.display = "none";

        }

    }

});

if(topBtn){

    topBtn.addEventListener("click",()=>{

        window.scrollTo({

            top:0,

            behavior:"smooth"

        });

    });

}
// ==========================================
// ANIMATED COUNTERS
// ==========================================

const counters = document.querySelectorAll(".counter");

const animateCounters = () => {

    counters.forEach(counter => {

        const target = +counter.getAttribute("data-target");

        const speed = target / 100;

        const updateCounter = () => {

            const current = +counter.innerText;

            if(current < target){

                counter.innerText = Math.ceil(current + speed);

                setTimeout(updateCounter,20);

            }

            else{

                if(target >= 1000000){

                    counter.innerText = "1M+";

                }

                else if(target >= 50000){

                    counter.innerText = "50K+";

                }

                else{

                    counter.innerText = target;

                }

            }

        };

        updateCounter();

    });

};

let counterStarted = false;

window.addEventListener("scroll",()=>{

    const stats = document.querySelector(".stats");

    if(stats){

        const sectionTop = stats.offsetTop - 400;

        if(window.scrollY >= sectionTop && !counterStarted){

            animateCounters();

            counterStarted = true;

        }

    }

});

// ==========================================
// SMOOTH NAVIGATION
// ==========================================

document.querySelectorAll('a[href^="#"]').forEach(link=>{

    link.addEventListener("click",function(e){

        const href=(this.getAttribute("href") || "").trim();

        // Bare "#" is a placeholder link, not a valid selector.
        if(!href || href === "#"){
            return;
        }

        e.preventDefault();

        let target=null;
        try{
            target=document.querySelector(href);
        }catch(error){
            console.warn("Ignoring invalid navigation selector:",href);
            return;
        }

        if(target){

            target.scrollIntoView({

                behavior:"smooth"

            });

        }

    });

});

// ==========================================
// NAVBAR SHADOW
// ==========================================

const navbar = document.querySelector(".navbar");

window.addEventListener("scroll",()=>{

    if(navbar){

        if(window.scrollY > 50){

            navbar.style.boxShadow = "0 10px 25px rgba(0,0,0,.15)";

        }

        else{

            navbar.style.boxShadow = "none";

        }

    }

});

// ==========================================
// ACTIVE NAVIGATION
// ==========================================

const navLinks = document.querySelectorAll("nav a");

navLinks.forEach(link=>{

    link.addEventListener("click",()=>{

        navLinks.forEach(item=>{

            item.classList.remove("active-link");

        });

        link.classList.add("active-link");

    });

});

// ==========================================
// BUTTON RIPPLE EFFECT
// ==========================================

document.querySelectorAll("button").forEach(button=>{

    button.addEventListener("click",function(e){

        const circle = document.createElement("span");

        const diameter = Math.max(this.clientWidth,this.clientHeight);

        circle.style.width = circle.style.height = diameter+"px";

        circle.style.left = e.offsetX - diameter/2 +"px";

        circle.style.top = e.offsetY - diameter/2 +"px";

        circle.classList.add("ripple");

        const ripple = this.querySelector(".ripple");

        if(ripple){

            ripple.remove();

        }

        this.appendChild(circle);

    });

});
/* ==========================================
   CONTACT FORM
========================================== */

const contactForm = document.querySelector(".contact-form");

if(contactForm){

    contactForm.addEventListener("submit",(e)=>{

        e.preventDefault();

        showToast("✅ Message Sent Successfully!");

        contactForm.reset();

    });

}

/* ==========================================
   NEWSLETTER
========================================== */

const newsletterBtn=document.querySelector(".newsletter-box button");

const newsletterInput=document.querySelector(".newsletter-box input");

if(newsletterBtn){

newsletterBtn.addEventListener("click",()=>{

    if(newsletterInput.value.trim()==""){

        showToast("⚠ Please enter your email");

        return;

    }

    showToast("🎉 Subscription Successful!");

    newsletterInput.value="";

});

}

/* ==========================================
   SHOW TOAST
========================================== */

function showToast(message){

    if(!toast){
        return;
    }

    toast.innerHTML = message;

    toast.style.display = "block";

    setTimeout(() => {

        toast.style.display = "none";

    }, 3000);

}

/* ==========================================
   DYNAMIC HERO STATS (Backend-driven)
========================================== */

async function loadHeroStats() {
    try {
        // Public landing page - must never call an ADMIN-protected endpoint
        // (that always returned 403 for anonymous visitors). Use the public
        // stats-only endpoint instead; no auth header is sent or needed.
        const response = await fetch(`${API_BASE}/api/public/platform-stats`);
        if (!response.ok) return;
        const data = await response.json();
        const stats = Array.isArray(data.stats) ? data.stats : [];
        const lookup = new Map(stats.map(s => [String(s.label || "").toLowerCase(), s]));

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        const totalUsers = lookup.get("total users");
        const recruiters = lookup.get("recruiters");
        const aiUsage = lookup.get("ai usage");

        if (totalUsers) setText("heroCandidatesCount", totalUsers.value + "+");
        if (recruiters) setText("heroCompaniesCount", recruiters.value + "+");
        if (aiUsage) setText("heroAtsAccuracy", Math.min(100, Math.round(Number(aiUsage.value) || 0)) + "%");

        // Update stats section counters
        if (totalUsers) {
            const el = document.getElementById("statCandidates");
            if (el) { el.setAttribute("data-target", totalUsers.value); el.textContent = totalUsers.value; }
        }
        if (recruiters) {
            const el = document.getElementById("statCompanies");
            if (el) { el.setAttribute("data-target", recruiters.value); el.textContent = recruiters.value; }
        }
        if (aiUsage) {
            const el = document.getElementById("statAssessments");
            if (el) { el.setAttribute("data-target", aiUsage.value); el.textContent = aiUsage.value; }
        }
    } catch (error) {
        // Backend unavailable - leave placeholders
    }
}

// Load hero stats on page load (landing page only - this calls an ADMIN-only
// endpoint and the target elements only exist on index.html, so guard it to
// avoid firing on candidate/recruiter/admin dashboard pages)
window.addEventListener("load", () => {
    if (document.getElementById("heroCandidatesCount")) {
        loadHeroStats();
    }
});

/* ==========================================
   WELCOME POPUP
========================================== */

window.addEventListener("load",()=>{

    setTimeout(()=>{

        showToast("👋 Welcome to SmartHire AI");

    },1800);

});

/* ==========================================
   SAVE USER ROLE
========================================== */

const roleSelect=document.getElementById("roleSelect");

if(roleSelect){

    const savedRole=localStorage.getItem("userRole");

    if(savedRole){

        roleSelect.value=savedRole;

    }

}
/* ==========================================
   SCROLL REVEAL
========================================== */

const revealElements = document.querySelectorAll(
".feature-card,.stat-card,.testimonial-card,.workflow-card,.price-card,.mini-card"
);

const revealOnScroll = () => {

    revealElements.forEach(element => {

        const windowHeight = window.innerHeight;
        const revealTop = element.getBoundingClientRect().top;
        const revealPoint = 120;

        if(revealTop < windowHeight - revealPoint){

            element.classList.add("show");

        }

    });

};

window.addEventListener("scroll", revealOnScroll);
revealOnScroll();

/* ==========================================
   DARK MODE
========================================== */

const themeBtn = document.getElementById("themeToggle");

if(themeBtn && !window.smartHireTheme){
    themeBtn.addEventListener("click",()=>{
        const next = document.body.classList.contains("dark-mode") ? "light" : "dark";
        localStorage.setItem("smarthire.theme", next);
        document.body.classList.toggle("dark-mode", next === "dark");
    });
}

/* ==========================================
   FLOATING AI ASSISTANT
========================================== */

const aiButton=document.getElementById("aiAssistant");

if(aiButton){

aiButton.addEventListener("click",()=>{

showToast("🤖 AI Assistant will be available in Dashboard!");

});

}

/* ==========================================
   NOTIFICATION BUTTON
========================================== */

const notify=document.getElementById("notificationBtn");

if(notify){

notify.addEventListener("click",()=>{

const count = document.querySelector(".notification-count");
const current = count ? parseInt(count.textContent, 10) : 0;
if (current > 0) {
    showToast("🔔 " + current + " notification" + (current > 1 ? "s" : "") + " available in your dashboard");
} else {
    showToast("🔔 No new notifications");
}

});

}

/* ==========================================
   SHORTCUT KEY
========================================== */

document.addEventListener("keydown",(e)=>{

if(e.key==="l" || e.key==="L"){

if(loginModal){

loginModal.style.display="flex";

}

}

});
/*==================================================
        CANDIDATE DASHBOARD - PART 1
==================================================*/

// Only execute on candidate dashboard
if (document.querySelector(".sidebar")) {

    /*==========================
        SIDEBAR ACTIVE + SMOOTH SCROLL
    ==========================*/

    const menuItems = document.querySelectorAll(".sidebar ul li");

    // Map each sidebar menu label to its corresponding section selector
    const sectionMap = {
        "Dashboard": ".dashboard-header",
        "My Profile": ".settings-section",
        "Resume": ".resume-section",
        "ATS Analysis": ".ats-report",
        "Mock Interview": ".interview-section",
        "Analytics": ".analytics-section",
        "Calendar": ".productivity-section",
        "Reports": ".report-section",
        "Settings": ".settings-section"
    };

    // The sidebar is the scroll container for the menu items
    const sidebarEl = document.querySelector(".sidebar");

    // Bring the clicked menu item into view inside the sidebar (scroll only the sidebar)
    const scrollSidebarToItem = (menuItem) => {
        if (!sidebarEl || !menuItem) return;

        const itemTop = menuItem.offsetTop;
        const itemBottom = itemTop + menuItem.offsetHeight;
        const sidebarScrollTop = sidebarEl.scrollTop;
        const sidebarHeight = sidebarEl.clientHeight;

        // If the item is above the visible area, scroll up to reveal it
        if (itemTop < sidebarScrollTop) {
            sidebarEl.scrollTo({
                top: itemTop - 10,
                behavior: "smooth"
            });
        }
        // If the item is below the visible area, scroll down to reveal it
        else if (itemBottom > sidebarScrollTop + sidebarHeight) {
            sidebarEl.scrollTo({
                top: itemBottom - sidebarHeight + 10,
                behavior: "smooth"
            });
        }
    };

    menuItems.forEach(item => {

        item.addEventListener("click", () => {

            menuItems.forEach(i => i.classList.remove("active"));

            item.classList.add("active");

            // Keep the active menu item visible inside the sidebar
            scrollSidebarToItem(item);

            // Smooth scroll to the corresponding section
            const label = item.querySelector("span") ? item.querySelector("span").textContent.trim() : "";
            const selector = sectionMap[label];

            if (selector) {
                const targetSection = document.querySelector(selector);
                if (targetSection) {
                    // Use requestAnimationFrame to ensure the section is visible before scrolling
                    requestAnimationFrame(() => {
                        targetSection.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    });
                }
            }

        });

    });

    /*==========================
        LOGOUT POPUP
    ==========================*/

    const logoutItem = [...menuItems].find(item =>
        item.textContent.includes("Logout")
    );

    const logoutModal = document.getElementById("logoutModal");

    const cancelLogout = document.getElementById("cancelLogout");

    const confirmLogout = document.getElementById("confirmLogout");

    if (logoutItem) {

        logoutItem.addEventListener("click", () => {

            logoutModal.style.display = "flex";

        });

    }

    if (cancelLogout) {

        cancelLogout.addEventListener("click", () => {

            logoutModal.style.display = "none";

        });

    }

    if (confirmLogout) {

        confirmLogout.addEventListener("click", () => {

            window.location.href = "../index.html";

        });

    }

    /*==========================
        RESUME UPLOAD
    ==========================*/

    const resumeInput = document.getElementById("resumeFileInput");
    const resumeUploadBtn = document.getElementById("resumeUploadBtn");
    const resumeUploadStatus = document.getElementById("resumeUploadStatus");

    const resumeExtractLoading = document.getElementById("resumeExtractLoading");
    const resumeExtractError = document.getElementById("resumeExtractError");
    const resumeExtractResults = document.getElementById("resumeExtractResults");
    const resumeFileName = document.getElementById("resumeFileName");
    const resumePageCount = document.getElementById("resumePageCount");
    const resumeExtractedText = document.getElementById("resumeExtractedText");

    const resumeAnalysisLoading = document.getElementById("resumeAnalysisLoading");
    const resumeAnalysisError = document.getElementById("resumeAnalysisError");
    const resumeAnalysisResults = document.getElementById("resumeAnalysisResults");
    const resumeSkills = document.getElementById("resumeSkills");
    const resumeExperience = document.getElementById("resumeExperience");
    const resumeTechnologies = document.getElementById("resumeTechnologies");
    const resumeEducation = document.getElementById("resumeEducation");
    const resumeSummary = document.getElementById("resumeSummary");
    const missingSkillsHeading = document.getElementById("missingSkillsHeading");
    const resumeMissingSkills = document.getElementById("resumeMissingSkills");
    const resumeAtsScore = document.getElementById("resumeAtsScore");
    const atsScoreHeading = document.getElementById("atsScoreHeading");
    const atsScoreBreakdown = document.getElementById("atsScoreBreakdown");
    const keywordScoreEl = document.getElementById("keywordScore");
    const keywordScoreBar = document.getElementById("keywordScoreBar");
    const formattingScoreEl = document.getElementById("formattingScore");
    const formattingScoreBar = document.getElementById("formattingScoreBar");
    const skillsScoreEl = document.getElementById("skillsScore");
    const skillsScoreBar = document.getElementById("skillsScoreBar");
    const experienceScoreEl = document.getElementById("experienceScore");
    const experienceScoreBar = document.getElementById("experienceScoreBar");
    const educationScoreEl = document.getElementById("educationScore");
    const educationScoreBar = document.getElementById("educationScoreBar");
    const resumePreviewFileName = document.getElementById("resumePreviewFileName");
    const resumePreviewUpdated = document.getElementById("resumePreviewUpdated");

    // Restore the last selected/uploaded filename when returning to this page.
    const savedResumeFileName = localStorage.getItem("resumeFileName");
    if (resumePreviewFileName && savedResumeFileName) {
        resumePreviewFileName.textContent = savedResumeFileName;
        if (resumePreviewUpdated) resumePreviewUpdated.textContent = "Previously uploaded";
    }

    if (resumeUploadBtn && resumeInput && !window.SMART_HIRE_RESUME_STANDALONE) {

        resumeUploadBtn.addEventListener("click", () => {
            resumeInput.click();
        });

        resumeInput.addEventListener("change", async (event) => {

            const file = event.target.files[0];

            if (!file) {
                return;
            }

            if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
                resumeUploadStatus.innerHTML = "❌ Please select a PDF file.";
                resumeUploadStatus.style.color = "#e74c3c";
                showToast("❌ Only PDF files are allowed");
                resumeInput.value = "";
                return;
            }

            // Keep the selected file visible immediately. Do not wait for the
            // backend response to update the preview; this also makes the UI
            // resilient when upload/AI services are temporarily unavailable.
            if (resumePreviewFileName) {
                resumePreviewFileName.textContent = file.name;
            }
            if (resumePreviewUpdated) {
                const now = new Date();
                resumePreviewUpdated.textContent = "Selected just now";
            }
            if (resumeUploadStatus) {
                resumeUploadStatus.textContent = "⏳ Resume selected: " + file.name + " — uploading...";
                resumeUploadStatus.style.color = "#6c63ff";
            }

            const formData = new FormData();
            formData.append("resume", file, file.name);

            resumeUploadBtn.disabled = true;
            resumeUploadBtn.textContent = "Uploading...";
            resumeUploadStatus.innerHTML = "⏳ Uploading resume...";
            resumeUploadStatus.style.color = "#6c63ff";

            // Hide previous extract results
            if (resumeExtractResults) resumeExtractResults.style.display = "none";
            if (resumeExtractError) resumeExtractError.style.display = "none";

            // Hide previous analysis results
            if (resumeAnalysisResults) resumeAnalysisResults.style.display = "none";
            if (resumeAnalysisError) resumeAnalysisError.style.display = "none";

            try {

                // Step 1: Upload the PDF to /api/resume/upload
                console.log("📤 [Resume Upload] POST /api/resume/upload");
                console.log("📦 Sending multipart/form-data with file:", file.name, "size:", file.size, "type:", file.type);

                const uploadResponse = await fetch(`${API_BASE}/api/resume/upload`, {
                    method: "POST",
                    headers: getAuthHeaders(false),
                    body: formData
                });

                const uploadData = await uploadResponse.json();
                console.log("✅ [Resume Upload] Response received:", uploadData);

                if (!uploadResponse.ok || !uploadData.success) {
                    resumeUploadStatus.innerHTML = "❌ " + (uploadData.message || "Upload failed.");
                    resumeUploadStatus.style.color = "#e74c3c";
                    showToast("❌ " + (uploadData.message || "Upload failed"));
                    return;
                }

                // Update resume preview with the uploaded file name
                if (resumePreviewFileName) {
                    resumePreviewFileName.textContent = uploadData.fileName || file.name || "Resume.pdf";
                }
                if (resumePreviewUpdated) {
                    const now = new Date();
                    const dateStr = now.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
                    resumePreviewUpdated.textContent = "Last Updated: " + dateStr;
                }

                resumeUploadStatus.innerHTML = "✅ " + (uploadData.message || "Resume uploaded successfully!");
                resumeUploadStatus.style.color = "#27ae60";
                localStorage.setItem("resumeFileName", uploadData.fileName);

                // Step 2: Extract text from the same resume PDF
                if (resumeExtractLoading) resumeExtractLoading.style.display = "block";
                if (resumeExtractError) resumeExtractError.style.display = "none";
                if (resumeExtractResults) resumeExtractResults.style.display = "none";

                const extractFormData = new FormData();
                extractFormData.append("resume", file);

                console.log("📄 [Resume Extract] POST /api/resume/extract");
                console.log("📦 Sending multipart/form-data with file:", file.name);

                const extractResponse = await fetch(`${API_BASE}/api/resume/extract`, {
                    method: "POST",
                    headers: getAuthHeaders(false),
                    body: extractFormData
                });

                const extractData = await extractResponse.json();
                console.log("✅ [Resume Extract] Response received:", extractData);

                if (resumeExtractLoading) resumeExtractLoading.style.display = "none";

                if (extractResponse.ok && extractData.success) {

                    // Populate File Name
                    if (resumeFileName) {
                        resumeFileName.textContent = extractData.fileName || file.name || "Unknown";
                    }

                    // Populate Page Count
                    if (resumePageCount) {
                        resumePageCount.textContent = (extractData.pageCount !== undefined && extractData.pageCount !== null)
                            ? extractData.pageCount + " page(s)"
                            : "N/A";
                    }

                    // Populate Extracted Text
                    if (resumeExtractedText) {
                        resumeExtractedText.textContent = extractData.extractedText || "No text could be extracted from this resume.";
                    }

                    if (resumeExtractResults) resumeExtractResults.style.display = "block";
                    resumeUploadStatus.innerHTML = "✅ Resume uploaded and text extracted successfully!";
                    resumeUploadStatus.style.color = "#27ae60";
                    showToast("✅ Resume Text Extraction Complete!");

                    // Step 3: Analyze the resume with AI (Gemini)
                    if (resumeAnalysisLoading) resumeAnalysisLoading.style.display = "block";
                    if (resumeAnalysisError) resumeAnalysisError.style.display = "none";
                    if (resumeAnalysisResults) resumeAnalysisResults.style.display = "none";

                    const analyzeFormData = new FormData();
                    analyzeFormData.append("resume", file);

                    try {
                        console.log("🤖 [Resume Analysis] POST /api/resume/analyze");
                        console.log("📦 Sending multipart/form-data with file:", file.name);

                        const analyzeResponse = await fetch(`${API_BASE}/api/resume/analyze`, {
                            method: "POST",
                            headers: getAuthHeaders(false),
                            body: analyzeFormData
                        });

                        const analyzeData = await analyzeResponse.json();
                        console.log("✅ [Resume Analysis] Response received:", analyzeData);

                        if (resumeAnalysisLoading) resumeAnalysisLoading.style.display = "none";

                        if (analyzeResponse.ok && analyzeData.success) {

                            if (resumeUploadStatus) {
                                const analysisMessage = typeof analyzeData.message === "string" ? analyzeData.message.trim() : "";
                                resumeUploadStatus.innerHTML = analysisMessage && !analysisMessage.toLowerCase().includes("success")
                                    ? "✅ Resume analyzed. " + analysisMessage
                                    : "✅ Resume analyzed successfully.";
                                resumeUploadStatus.style.color = "#27ae60";
                            }

                            // Store the real Resume database ID for report download
                            currentResumeId = analyzeData.resumeId;

                            // Populate Skills. Gemini/backend responses may return a list, a comma-separated string,
                            // or grouped/nested values. Normalize every supported shape before rendering.
                            const normalizeAnalysisList = (...values) => {
                                const out = [];
                                const visit = (value) => {
                                    if (Array.isArray(value)) { value.forEach(visit); return; }
                                    if (typeof value === "string") {
                                        value.split(/[,;|\n]+/).map(v => v.trim()).filter(Boolean).forEach(v => out.push(v));
                                        return;
                                    }
                                    if (value && typeof value === "object") { Object.values(value).forEach(visit); }
                                };
                                values.forEach(visit);
                                return [...new Set(out)];
                            };

                            if (resumeSkills) {
                                const clientSkillDictionary = [
                                    "Java","JavaScript","TypeScript","Python","C","C++","C#","SQL",
                                    "HTML","CSS","React","Angular","Vue","Spring Boot","Spring",
                                    "REST APIs","REST","Git","GitHub","Docker","Kubernetes","AWS",
                                    "Azure","PostgreSQL","MySQL","MongoDB","Node.js","Express",
                                    "Data Structures","Algorithms","OOP","Problem Solving",
                                    "Communication","Teamwork","Machine Learning","Deep Learning",
                                    "TensorFlow","PyTorch","Pandas","NumPy","Power BI","Excel"
                                ];
                                const extractedForFallback = String(
                                    (extractData && extractData.extractedText) || ""
                                ).toLowerCase();
                                const detectedFromText = clientSkillDictionary.filter(skill => {
                                    const normalized = skill.toLowerCase();
                                    if (normalized === "c++" || normalized === "c#") {
                                        return extractedForFallback.includes(normalized);
                                    }
                                    return extractedForFallback.includes(normalized);
                                });

                                const skills = normalizeAnalysisList(
                                    analyzeData.skills, analyzeData.technicalSkills, analyzeData.softSkills,
                                    analyzeData.programmingLanguages, analyzeData.frameworks, analyzeData.libraries,
                                    detectedFromText
                                );

                                resumeSkills.innerHTML = skills.length > 0
                                    ? skills.map(skill =>
                                        '<span style="background:#6c63ff; color:#fff; padding:4px 12px; border-radius:20px; font-size:13px;">' + skill + '</span>'
                                    ).join("")
                                    : '<span style="color:#888;">No recognizable skills were found in the extracted resume text.</span>';
                            }

                            // Populate Experience
                            if (resumeExperience) {
                                resumeExperience.textContent = analyzeData.experience || "No experience information found.";
                            }

                            // Populate Technologies
                            if (resumeTechnologies) {
                                const technologies = normalizeAnalysisList(
                                    analyzeData.technologies, analyzeData.programmingLanguages, analyzeData.frameworks,
                                    analyzeData.libraries, analyzeData.databases, analyzeData.tools, analyzeData.cloudTechnologies
                                );
                                resumeTechnologies.innerHTML = technologies.length > 0
                                    ? technologies.map(tech =>
                                        '<span style="background:#27ae60; color:#fff; padding:4px 12px; border-radius:20px; font-size:13px;">' + tech + '</span>'
                                    ).join("")
                                    : '<span style="color:#888;">No technologies found.</span>';
                            }

                            // Populate Education
                            if (resumeEducation) {
                                resumeEducation.textContent = analyzeData.education || "No education information found.";
                            }

                            // Populate Summary
                            if (resumeSummary) {
                                resumeSummary.textContent = analyzeData.summary || "No summary generated.";
                            }

                            // Populate Missing Skills (red badges)
                            const missingSkills = normalizeAnalysisList(analyzeData.missingSkills);
                            if (resumeMissingSkills) {
                                if (missingSkills.length > 0) {
                                    resumeMissingSkills.innerHTML = missingSkills.map(skill =>
                                        '<span style="background:#e74c3c; color:#fff; padding:4px 12px; border-radius:20px; font-size:13px;">' + skill + '</span>'
                                    ).join("");
                                    resumeMissingSkills.style.display = "flex";
                                    if (missingSkillsHeading) missingSkillsHeading.style.display = "block";
                                } else {
                                    resumeMissingSkills.style.display = "none";
                                    if (missingSkillsHeading) missingSkillsHeading.style.display = "none";
                                }
                            }

                            // Populate ATS Score if returned by the backend
                            const atsScore = analyzeData.atsScore !== undefined ? analyzeData.atsScore : analyzeData.ats_score;
                            if (resumeAtsScore && atsScore !== undefined && atsScore !== null) {
                                resumeAtsScore.textContent = atsScore + "%";
                                resumeAtsScore.style.display = "block";
                                if (atsScoreHeading) atsScoreHeading.style.display = "block";
                                localStorage.setItem("smarthire.lastAtsScore", String(atsScore));
                                localStorage.setItem("smarthire.lastResumeScore", String(atsScore));
                            } else {
                                if (resumeAtsScore) resumeAtsScore.style.display = "none";
                                if (atsScoreHeading) atsScoreHeading.style.display = "none";
                            }

                            // Populate ATS Score Breakdown
                            const keywordScore = analyzeData.keywordScore;
                            const formattingScore = analyzeData.formattingScore;
                            const skillsScore = analyzeData.skillsScore;
                            const experienceScore = analyzeData.experienceScore;
                            const educationScore = analyzeData.educationScore;

                            const hasBreakdown = [keywordScore, formattingScore, skillsScore, experienceScore, educationScore]
                                .some(s => s !== undefined && s !== null);

                            if (atsScoreBreakdown && hasBreakdown) {
                                atsScoreBreakdown.style.display = "block";

                                if (keywordScoreEl) keywordScoreEl.textContent = (keywordScore !== undefined && keywordScore !== null) ? keywordScore + "%" : "N/A";
                                if (keywordScoreBar) keywordScoreBar.style.width = (keywordScore !== undefined && keywordScore !== null) ? keywordScore + "%" : "0%";

                                if (formattingScoreEl) formattingScoreEl.textContent = (formattingScore !== undefined && formattingScore !== null) ? formattingScore + "%" : "N/A";
                                if (formattingScoreBar) formattingScoreBar.style.width = (formattingScore !== undefined && formattingScore !== null) ? formattingScore + "%" : "0%";

                                if (skillsScoreEl) skillsScoreEl.textContent = (skillsScore !== undefined && skillsScore !== null) ? skillsScore + "%" : "N/A";
                                if (skillsScoreBar) skillsScoreBar.style.width = (skillsScore !== undefined && skillsScore !== null) ? skillsScore + "%" : "0%";

                                if (experienceScoreEl) experienceScoreEl.textContent = (experienceScore !== undefined && experienceScore !== null) ? experienceScore + "%" : "N/A";
                                if (experienceScoreBar) experienceScoreBar.style.width = (experienceScore !== undefined && experienceScore !== null) ? experienceScore + "%" : "0%";

                                if (educationScoreEl) educationScoreEl.textContent = (educationScore !== undefined && educationScore !== null) ? educationScore + "%" : "N/A";
                                if (educationScoreBar) educationScoreBar.style.width = (educationScore !== undefined && educationScore !== null) ? educationScore + "%" : "0%";
                            } else if (atsScoreBreakdown) {
                                atsScoreBreakdown.style.display = "none";
                            }

                            // Populate Resume Improvement Section
                            const resumeImprovementSection = document.getElementById("resumeImprovementSection");
                            const resumeStrengths = document.getElementById("resumeStrengths");
                            const resumeWeaknesses = document.getElementById("resumeWeaknesses");
                            const resumeSuggestions = document.getElementById("resumeSuggestions");

                            const strengths = Array.isArray(analyzeData.strengths) ? analyzeData.strengths : [];
                            const weaknesses = Array.isArray(analyzeData.weaknesses) ? analyzeData.weaknesses : [];
                            const suggestions = Array.isArray(analyzeData.improvementSuggestions) ? analyzeData.improvementSuggestions : [];

                            if (resumeImprovementSection && (strengths.length > 0 || weaknesses.length > 0 || suggestions.length > 0)) {
                                resumeImprovementSection.style.display = "block";

                                // Populate Strengths
                                if (resumeStrengths) {
                                    if (strengths.length > 0) {
                                        resumeStrengths.innerHTML = strengths.map(strength =>
                                            '<li style="padding:8px 0; border-bottom:1px solid #f0f0f0; display:flex; align-items:flex-start; gap:10px;">' +
                                            '<i class="fa-solid fa-check" style="color:#27ae60; margin-top:4px;"></i>' +
                                            '<span style="color:#333; font-size:14px;">' + strength + '</span>' +
                                            '</li>'
                                        ).join("");
                                    } else {
                                        resumeStrengths.innerHTML = '<li style="color:#888; font-size:14px;">No specific strengths identified.</li>';
                                    }
                                }

                                // Populate Weaknesses
                                if (resumeWeaknesses) {
                                    if (weaknesses.length > 0) {
                                        resumeWeaknesses.innerHTML = weaknesses.map(weakness =>
                                            '<li style="padding:8px 0; border-bottom:1px solid #f0f0f0; display:flex; align-items:flex-start; gap:10px;">' +
                                            '<i class="fa-solid fa-xmark" style="color:#e74c3c; margin-top:4px;"></i>' +
                                            '<span style="color:#333; font-size:14px;">' + weakness + '</span>' +
                                            '</li>'
                                        ).join("");
                                    } else {
                                        resumeWeaknesses.innerHTML = '<li style="color:#888; font-size:14px;">No specific weaknesses identified.</li>';
                                    }
                                }

                                // Populate Improvement Suggestions
                                if (resumeSuggestions) {
                                    if (suggestions.length > 0) {
                                        resumeSuggestions.innerHTML = suggestions.map(suggestion =>
                                            '<li style="padding:8px 0; border-bottom:1px solid #f0f0f0; display:flex; align-items:flex-start; gap:10px;">' +
                                            '<i class="fa-solid fa-arrow-right" style="color:#f39c12; margin-top:4px;"></i>' +
                                            '<span style="color:#333; font-size:14px;">' + suggestion + '</span>' +
                                            '</li>'
                                        ).join("");
                                    } else {
                                        resumeSuggestions.innerHTML = '<li style="color:#888; font-size:14px;">No specific suggestions available.</li>';
                                    }
                                }
                            } else if (resumeImprovementSection) {
                                resumeImprovementSection.style.display = "none";
                            }

                            if (resumeAnalysisResults) resumeAnalysisResults.style.display = "block";
                            resumeUploadStatus.innerHTML = "✅ Resume uploaded, extracted, and analyzed successfully!";
                            resumeUploadStatus.style.color = "#27ae60";
                            showToast("✅ AI Resume Analysis Complete!");

                        } else {
                            if (resumeAnalysisError) {
                                resumeAnalysisError.textContent = "❌ " + (analyzeData.message || "AI analysis failed.");
                                resumeAnalysisError.style.display = "block";
                            }
                            showToast("❌ " + (analyzeData.message || "AI analysis failed"));
                        }

                    } catch (analyzeErr) {
                        if (resumeAnalysisLoading) resumeAnalysisLoading.style.display = "none";
                        if (resumeAnalysisError) {
                            resumeAnalysisError.textContent = "❌ AI analysis error: " + analyzeErr.message;
                            resumeAnalysisError.style.display = "block";
                        }
                        showToast("❌ AI analysis failed: " + analyzeErr.message);
                    }

                } else {
                    if (resumeExtractError) {
                        resumeExtractError.textContent = "❌ " + (extractData.message || "Extraction failed.");
                        resumeExtractError.style.display = "block";
                    }
                    showToast("❌ " + (extractData.message || "Extraction failed"));
                }

            } catch (err) {

                if (resumeExtractLoading) resumeExtractLoading.style.display = "none";
                resumeUploadStatus.innerHTML = "❌ Network error. Could not reach server.";
                resumeUploadStatus.style.color = "#e74c3c";
                if (resumeExtractError) {
                    resumeExtractError.textContent = "❌ Network error: " + err.message;
                    resumeExtractError.style.display = "block";
                }
                showToast("❌ Upload/Extraction failed: " + err.message);

            } finally {

                resumeUploadBtn.disabled = false;
                resumeUploadBtn.textContent = "Upload Resume";
                resumeInput.value = "";

            }

        });

    }

    /*==========================
        REPORT DOWNLOAD
    ==========================*/

    document.querySelectorAll(".report-grid button").forEach(btn => {

        btn.addEventListener("click", () => {

            showToast("📄 Report Download Started");

        });

    });

}
/*==================================================
        CANDIDATE DASHBOARD - PART 2
==================================================*/

if(document.querySelector(".sidebar") || document.querySelector(".live-room-clean")){

/*==========================
      SETTINGS
==========================*/

const settings = document.querySelectorAll(".setting-item input");

settings.forEach(setting=>{

    const key = setting.parentElement.querySelector("span").innerText;

    const saved = localStorage.getItem(key);

    if(saved !== null){

        setting.checked = saved === "true";

    }

    setting.addEventListener("change",()=>{

        localStorage.setItem(key,setting.checked);

        showToast("⚙ Settings Saved");

    });

});

/*==========================
      DARK MODE
==========================*/

const darkToggle = settings[0];

if(darkToggle){

    darkToggle.addEventListener("change",()=>{

        document.body.classList.toggle("dark-mode");

    });

}

/*==========================
      PROGRESS ANIMATION
==========================*/

const progressBars=document.querySelectorAll("progress");

progressBars.forEach(bar=>{

    const value=bar.value;

    bar.value=0;

    let current=0;

    const interval=setInterval(()=>{

        current++;

        bar.value=current;

        if(current>=value){

            clearInterval(interval);

        }

    },15);

});

/*==========================
      CALENDAR CLICK
==========================*/

const dates=document.querySelectorAll(".calendar-table td");

dates.forEach(day=>{

    day.addEventListener("click",()=>{

        dates.forEach(d=>d.classList.remove("today"));

        day.classList.add("today");

    });

});

/*==========================
      COURSE BUTTONS
==========================*/

document.querySelectorAll(".course-card button").forEach(btn=>{

    btn.addEventListener("click",()=>{

        showToast("📚 Course Opened Successfully");

    });

});

/*==========================
      INTERVIEW BUTTON
==========================*/

const interviewBtn=document.querySelector(".interview-details button");

const getConfiguredInterviewDurationSeconds=()=>{
  const configured=Number(window.smartHireInterviewDurationSeconds);
  if (Number.isFinite(configured) && configured > 0) return configured;
  // IMPORTANT: this helper is invoked while interviewSessionState itself is
  // being initialized, so never reference the lexical variable here (it is
  // in the temporal dead zone at that moment). Use a window-scoped count that
  // is populated after questions are loaded instead.
  const questionCount=Number(window.smartHireInterviewQuestionCount) || 10;
  const secondsPerQuestion=180; // 3 minutes/question budget
  return Math.max(20*60, questionCount*secondsPerQuestion);
};

let liveInterviewState={

stream:null,

joined:false,

cameraOn:false,

micOn:false,

transcript:"",

recordingSupported:Boolean(window.MediaRecorder),

recordingActive:false,

recordingStartedAt:null,

videoRecorder:null,

audioRecorder:null,

recordedVideoChunks:[],

recordedAudioChunks:[],

videoRecordingBlob:null,

audioRecordingBlob:null,

videoRecordingName:"video-recording.webm",

audioRecordingName:"audio-recording.webm",

videoRecordingUrl:"",

audioRecordingUrl:"",

pendingRecordingSessionId:null,
recordingUploadPromise:null,
recordingUploadScheduled:false,
recordingUploadError:null,

lastSnapshotSyncAt:null,

speechSupported:false,

speechListening:false,

speechRecognition:null,

followUpLoading:false

};

const getLiveInterviewElements=()=>({

videoEl:document.getElementById("liveInterviewVideo"),

placeholderEl:document.getElementById("liveInterviewPlaceholder"),

errorEl:document.getElementById("liveInterviewError"),

cameraStatusEl:document.getElementById("liveCameraStatus"),

micStatusEl:document.getElementById("liveMicStatus"),

cameraToggleBtn:document.getElementById("liveCameraToggleBtn"),

micToggleBtn:document.getElementById("liveMicToggleBtn"),

joinBtn:document.getElementById("liveJoinBtn"),

leaveBtn:document.getElementById("liveLeaveBtn")

,speechStatusEl:document.getElementById("liveSpeechStatus")

,speechErrorEl:document.getElementById("liveSpeechError")

,transcriptEl:document.getElementById("liveTranscriptText")

,speechStartBtn:document.getElementById("liveSpeechStartBtn")

,speechStopBtn:document.getElementById("liveSpeechStopBtn")

,speechClearBtn:document.getElementById("liveSpeechClearBtn")

,followUpBtn:document.getElementById("liveGenerateFollowUpBtn")

,followUpLoadingEl:document.getElementById("liveFollowUpLoading")

,followUpErrorEl:document.getElementById("liveFollowUpError")

,followUpQuestionWrapEl:document.getElementById("liveFollowUpQuestionWrap")

,followUpQuestionTextEl:document.getElementById("liveFollowUpQuestionText")

,recordingStatusEl:document.getElementById("liveRecordingStatus")

,recordingStartBtn:document.getElementById("liveRecordingStartBtn")

,recordingStopBtn:document.getElementById("liveRecordingStopBtn")

,recordingDownloadBtn:document.getElementById("liveRecordingDownloadBtn")

,audioDownloadBtn:document.getElementById("liveAudioDownloadBtn")

,transcriptDownloadBtn:document.getElementById("liveTranscriptDownloadBtn")

,reportBtn:document.getElementById("liveReportBtn")

,emailPreviewBtn:document.getElementById("liveEmailPreviewBtn")

,recoveryNoticeEl:document.getElementById("liveRecoveryNotice")

,sessionTimelineEl:document.getElementById("liveSessionTimeline")

});

const setStatusPill=(el,isOn,onText,offText)=>{

if(!el){

return;

}

el.textContent=isOn ? onText : offText;

el.classList.remove("on","off");

el.classList.add(isOn ? "on" : "off");

};

const refreshLiveInterviewUI=()=>{

const { placeholderEl,cameraStatusEl,micStatusEl,cameraToggleBtn,micToggleBtn,joinBtn,leaveBtn,speechStatusEl,speechStartBtn,speechStopBtn,transcriptEl,followUpBtn,followUpLoadingEl,recordingStatusEl,recordingStartBtn,recordingStopBtn,recordingDownloadBtn,audioDownloadBtn,transcriptDownloadBtn }=getLiveInterviewElements();

setStatusPill(cameraStatusEl,liveInterviewState.cameraOn,"On","Off");

setStatusPill(micStatusEl,liveInterviewState.micOn,"Live","Muted");

// Sync the status-row microphone chip in the unified live interview workspace
const micRowEl=document.getElementById("liveMicStatusRow");
if(micRowEl){
    setStatusPill(micRowEl,liveInterviewState.micOn,"Live","Muted");
}

if(placeholderEl){

placeholderEl.style.display=liveInterviewState.stream ? "none" : "flex";

}

if(cameraToggleBtn){

cameraToggleBtn.textContent=liveInterviewState.cameraOn ? "Turn Camera Off" : "Turn Camera On";

}

if(micToggleBtn){

micToggleBtn.textContent=liveInterviewState.micOn ? "Mute Microphone" : "Unmute Microphone";

}

if(joinBtn){

joinBtn.disabled=liveInterviewState.joined;

}

if(leaveBtn){

leaveBtn.disabled=!liveInterviewState.joined;

}

if(speechStatusEl){

setStatusPill(speechStatusEl,liveInterviewState.speechListening,"Listening","Not Listening");

}

if(speechStartBtn){

speechStartBtn.disabled=!liveInterviewState.speechSupported || liveInterviewState.speechListening;

}

if(speechStopBtn){

speechStopBtn.disabled=!liveInterviewState.speechSupported || !liveInterviewState.speechListening;

}

if(transcriptEl && !liveInterviewState.transcript.trim()){

transcriptEl.textContent="Your speech will appear here when listening starts.";

}

if(followUpBtn){

followUpBtn.disabled=liveInterviewState.followUpLoading;

}

if(followUpLoadingEl){

followUpLoadingEl.style.display=liveInterviewState.followUpLoading ? "block" : "none";

}

if(recordingStatusEl){

setStatusPill(recordingStatusEl,liveInterviewState.recordingActive,"Recording","Idle");

}
const cameraTextEl=document.getElementById("liveCameraStatusText");
if(cameraTextEl){
    cameraTextEl.textContent=liveInterviewState.cameraOn ? "Ready" : "Off";
}
const recordingTextEl=document.getElementById("liveRecordingStatusText");
if(recordingTextEl){
    recordingTextEl.textContent=liveInterviewState.recordingActive ? "Recording" : "Idle";
}
const topStatusEl=document.getElementById("interviewTopStatus");
if(topStatusEl){
    const total=interviewSessionState.questions.length || 0;
    const current=total ? interviewSessionState.currentIndex + 1 : 1;
    topStatusEl.textContent=`Question ${current} / ${total || 1}`;
}

if(recordingStartBtn){

recordingStartBtn.disabled=!liveInterviewState.joined || liveInterviewState.recordingActive || !liveInterviewState.recordingSupported;

}

if(recordingStopBtn){

recordingStopBtn.disabled=!liveInterviewState.recordingActive;

}

if(recordingDownloadBtn){

recordingDownloadBtn.disabled=!liveInterviewState.videoRecordingBlob;

}

if(audioDownloadBtn){

audioDownloadBtn.disabled=!liveInterviewState.audioRecordingBlob;

}

if(transcriptDownloadBtn){

transcriptDownloadBtn.disabled=!Boolean((liveInterviewState.transcript || "").trim());

}

};

const setLiveInterviewError=(message)=>{

const { errorEl }=getLiveInterviewElements();

if(!errorEl){

return;

}

if(message){

errorEl.style.display="block";

errorEl.textContent=message;

return;

}

errorEl.style.display="none";

errorEl.textContent="";

};

const setLiveSpeechError=(message)=>{

const { speechErrorEl }=getLiveInterviewElements();

if(!speechErrorEl){

return;

}

if(message){

speechErrorEl.style.display="block";

speechErrorEl.textContent=message;

return;

}

speechErrorEl.style.display="none";

speechErrorEl.textContent="";

};

const setLiveFollowUpError=(message)=>{

const { followUpErrorEl }=getLiveInterviewElements();

if(!followUpErrorEl){

return;

}

if(message){

followUpErrorEl.style.display="block";

followUpErrorEl.textContent=message;

return;

}

followUpErrorEl.style.display="none";

followUpErrorEl.textContent="";

};

const renderFollowUpQuestion=(questionText)=>{

const { followUpQuestionWrapEl,followUpQuestionTextEl }=getLiveInterviewElements();

if(!followUpQuestionWrapEl || !followUpQuestionTextEl){

return;

}

if(typeof questionText!=="string" || !questionText.trim()){

followUpQuestionWrapEl.style.display="none";

followUpQuestionTextEl.textContent="";

return;

}

followUpQuestionTextEl.textContent=questionText.trim();

followUpQuestionWrapEl.style.display="block";

};

const generateLiveFollowUpQuestion=async ()=>{

const transcript=liveInterviewState.transcript.trim();

if(!transcript){

setLiveFollowUpError("Please speak first so AI can generate a follow-up question.");

renderFollowUpQuestion("");

return;

}

const currentQuestionEl=document.getElementById("interviewQuestionText");

const currentQuestion=(currentQuestionEl && currentQuestionEl.textContent) ? currentQuestionEl.textContent.trim() : "General interview question";

const jobRole=liveInterviewState.jobRole && liveInterviewState.jobRole.trim()

? liveInterviewState.jobRole.trim()

: "Software Engineer";

setLiveFollowUpError("");

liveInterviewState.followUpLoading=true;

refreshLiveInterviewUI();

try{

const response=await fetch(`${API_BASE}/api/interviews/followup`,{

method:"POST",

headers:getAuthHeaders(),

body:JSON.stringify({

jobRole,

question:currentQuestion,

candidateAnswer:transcript

})

});

if(!response.ok){

throw new Error("Failed to generate follow-up question (HTTP "+response.status+")");

}

const data=await response.json();

const followUpQuestion=(typeof data?.followUpQuestion==="string") ? data.followUpQuestion.trim() : "";

if(!followUpQuestion){

throw new Error("AI did not return a follow-up question.");

}

renderFollowUpQuestion(followUpQuestion);

showToast("❓ Follow-up question generated");

}catch(err){

setLiveFollowUpError(err.message || "Unable to generate follow-up question.");

renderFollowUpQuestion("");

}finally{

liveInterviewState.followUpLoading=false;

refreshLiveInterviewUI();

}

};

const LIVE_INTERVIEW_STORAGE_KEY="smarthire.liveInterviewSession";

const buildLiveInterviewTimeline=()=>{

return interviewSessionState.questions.map((item,index)=>{

const answer=(interviewSessionState.answers[index] || "").trim();

const skipped=interviewSessionState.skippedIndices.has(index);

return {

question:item?.question || "",

answer:answer,

status:skipped ? "Skipped" : (answer ? "Answered" : "Pending"),

timeTakenSeconds:Number(interviewSessionState.questionDurations[index] || 0)

};

});

};

const buildLiveInterviewSnapshot=()=>({

interviewId:interviewSessionState.interviewId,

jobRole:interviewSessionState.jobRole,

interviewType:interviewSessionState.interviewType,

difficulty:interviewSessionState.difficulty,

questions:interviewSessionState.questions,

answers:interviewSessionState.answers,

skippedIndices:Array.from(interviewSessionState.skippedIndices || []),

currentIndex:interviewSessionState.currentIndex,

timerSecondsRemaining:interviewSessionState.timerSecondsRemaining,

active:interviewSessionState.active,

questionStartedAt:interviewSessionState.questionStartedAt,

questionDurations:interviewSessionState.questionDurations,

timeline:buildLiveInterviewTimeline(),

live: {

joined:liveInterviewState.joined,

cameraOn:liveInterviewState.cameraOn,

micOn:liveInterviewState.micOn,

transcript:liveInterviewState.transcript,

recordingActive:liveInterviewState.recordingActive,

recordingSupported:liveInterviewState.recordingSupported,

recordingStartedAt:liveInterviewState.recordingStartedAt,

videoRecordingName:liveInterviewState.videoRecordingName || "video-recording.webm",

audioRecordingName:liveInterviewState.audioRecordingName || "audio-recording.webm"

}

});

const persistLiveInterviewSnapshot=async (syncBackend=false)=>{

if(!interviewSessionState.interviewId){

return;

}

const snapshot=buildLiveInterviewSnapshot();

localStorage.setItem(LIVE_INTERVIEW_STORAGE_KEY,JSON.stringify(snapshot));

liveInterviewState.lastSnapshotSyncAt=Date.now();

if(!syncBackend){

return;

}

try{

await fetch(`${API_BASE}/api/interviews/${interviewSessionState.interviewId}/session`,{

method:"POST",

headers:getAuthHeaders(),

keepalive:true,

body:JSON.stringify({

interviewId:interviewSessionState.interviewId,

userId:Number(localStorage.getItem("userId") || 0) || null,

transcript:liveInterviewState.transcript,

durationSeconds:Math.max(0,getConfiguredInterviewDurationSeconds()-interviewSessionState.timerSecondsRemaining),

timerSecondsRemaining:interviewSessionState.timerSecondsRemaining,

recordingActive:liveInterviewState.recordingActive,

recordingSupported:liveInterviewState.recordingSupported,

cameraOn:liveInterviewState.cameraOn,

microphoneOn:liveInterviewState.micOn,

videoRecordingName:liveInterviewState.videoRecordingName,

audioRecordingName:liveInterviewState.audioRecordingName,

sessionSummary:buildLiveSessionSummary(),

recoveryState:JSON.stringify(snapshot),

liveSignalsJson:localStorage.getItem("smarthire.liveSignals") || "{}",

speechInsightsJson:localStorage.getItem("smarthire.speechInsights") || "{}",

answers:interviewSessionState.questions.map((_,index)=>(interviewSessionState.answers[index] || "").trim()),

timeline:buildLiveInterviewTimeline()

})

});

}catch(error){

}

};

const loadLiveInterviewSnapshot=()=>{

try{

const raw=localStorage.getItem(LIVE_INTERVIEW_STORAGE_KEY);

if(!raw){

return null;

}

return JSON.parse(raw);

}catch(error){

return null;

}

};

const applyLiveInterviewSnapshot=(snapshot)=>{

if(!snapshot){

return;

}

interviewSessionState.interviewId=snapshot.interviewId || null;

interviewSessionState.jobRole=snapshot.jobRole || "";

interviewSessionState.interviewType=snapshot.interviewType || "";

interviewSessionState.difficulty=snapshot.difficulty || "";

interviewSessionState.questions=Array.isArray(snapshot.questions) ? snapshot.questions : [];

const restoredAnswers=Array.isArray(snapshot.answers)
? snapshot.answers
: Object.values(snapshot.answers || {});

interviewSessionState.answers=restoredAnswers.reduce((acc,value,index)=>{

acc[index]=typeof value==="string" ? value : "";

return acc;

}, {});

interviewSessionState.skippedIndices=new Set(Array.isArray(snapshot.skippedIndices) ? snapshot.skippedIndices : []);

interviewSessionState.currentIndex=Number(snapshot.currentIndex || 0);

interviewSessionState.timerSecondsRemaining=Number(snapshot.timerSecondsRemaining || getConfiguredInterviewDurationSeconds());

interviewSessionState.active=Boolean(snapshot.active);

interviewSessionState.questionStartedAt=Number(snapshot.questionStartedAt || Date.now());

interviewSessionState.lastRenderedQuestionIndex=Number(snapshot.currentIndex || 0);

interviewSessionState.questionDurations=Array.isArray(snapshot.timeline)
? snapshot.timeline.reduce((acc,item,index)=>{

acc[index]=Number(item?.timeTakenSeconds || 0);

return acc;

}, {}) : (snapshot.questionDurations || {});

liveInterviewState.joined=Boolean(snapshot.live?.joined);

liveInterviewState.cameraOn=Boolean(snapshot.live?.cameraOn);

liveInterviewState.micOn=Boolean(snapshot.live?.micOn);

liveInterviewState.transcript=typeof snapshot.live?.transcript==="string" ? snapshot.live.transcript : "";

liveInterviewState.recordingActive=Boolean(snapshot.live?.recordingActive);

liveInterviewState.recordingSupported=Boolean(snapshot.live?.recordingSupported ?? liveInterviewState.recordingSupported);

liveInterviewState.recordingStartedAt=snapshot.live?.recordingStartedAt || null;

liveInterviewState.videoRecordingName=snapshot.live?.videoRecordingName || "video-recording.webm";

liveInterviewState.audioRecordingName=snapshot.live?.audioRecordingName || "audio-recording.webm";

if(snapshot.live?.recordingActive){

const recoveryNotice=document.getElementById("liveRecoveryNotice");

if(recoveryNotice){

recoveryNotice.style.display="inline";

}

}

};

const clearLiveInterviewSnapshot=()=>{

localStorage.removeItem(LIVE_INTERVIEW_STORAGE_KEY);

};

const captureCurrentQuestionDuration=()=>{

if(!interviewSessionState.questionStartedAt){
return 0;
}

const elapsed=Math.min(getConfiguredInterviewDurationSeconds(), Math.max(0,Math.floor((Date.now()-interviewSessionState.questionStartedAt)/1000)));
const currentTotal=Number(interviewSessionState.questionDurations[interviewSessionState.currentIndex] || 0);
interviewSessionState.questionDurations[interviewSessionState.currentIndex]=currentTotal+elapsed;
interviewSessionState.questionStartedAt=Date.now();
return elapsed;
};

const syncCurrentQuestionTiming=async (completedOverride=null)=>{

    if(!interviewSessionState.sessionId || interviewSessionState.lastRenderedQuestionIndex===null){
    return null;
    }

    const index=interviewSessionState.currentIndex;
    const item=interviewSessionState.questions[index];
    if(!item){
    return null;
    }

    const segmentStart=interviewSessionState.questionStartedAt;
    if(!segmentStart){
    return null;
    }

    const durationSeconds=captureCurrentQuestionDuration();
    const answer=String(interviewSessionState.answers[index] || "").trim();
    const completed=completedOverride===null ? Boolean(answer) : Boolean(completedOverride);
    const endedAt=new Date().toISOString();

    const response=await fetch(`${API_BASE}/api/interview-sessions/${interviewSessionState.sessionId}/question-timing`,{
    method:"POST",
    headers:{
    ...getAuthHeaders(),
    "Content-Type":"application/json"
    },
    body:JSON.stringify({
    questionIndex:index,
    question:item.question || "",
    startedAt:new Date(segmentStart).toISOString(),
    endedAt:endedAt,
    durationSeconds:durationSeconds,
    completed:completed
    })
    });

    if(handleUnauthorizedResponse(response)){
    throw new Error("Authentication expired while saving question timing.");
    }

    let payload=null;
    try{
    payload=await response.json();
    }catch(error){}

    if(!response.ok){
    throw new Error(payload?.message || `Failed to save timing for question ${index+1} (HTTP ${response.status})`);
    }

    if(payload?.status){
    interviewSessionState.backendStatus=payload.status;
    }

    updateLiveSessionTimeline();
    persistLiveInterviewSnapshot(false);
    return payload;
    };

const updateLiveSessionTimeline=()=>{

const timelineEl=document.getElementById("liveSessionTimeline");

if(!timelineEl){

return;

}

const timeline=buildLiveInterviewTimeline();

if(!timeline.length){

timelineEl.innerHTML='<p style="margin:0; color:#64748b;">Timeline will appear here as you answer questions.</p>';

return;

}

timelineEl.innerHTML=timeline.map((item,index)=>"<div style=\"display:flex; justify-content:space-between; gap:12px; padding:10px 0; border-bottom:1px solid #edf2fb;\"><div><strong>Question "+(index+1)+"</strong><div style=\"color:#475569; margin-top:4px;\">"+((typeof item.question==="string" && item.question.trim()) ? item.question.trim() : "Interview question")+"</div><div style=\"font-size:12px; color:#64748b; margin-top:4px;\">Status: "+item.status+"</div></div><div style=\"text-align:right; color:#1f4f8a; min-width:80px;\">"+item.timeTakenSeconds+"s</div></div>").join("");

};

const buildLiveSessionSummary=()=>{

const answered=Object.values(interviewSessionState.answers).filter((answer)=>typeof answer==="string" && answer.trim()).length;

const skipped=interviewSessionState.skippedIndices.size;

return `Live interview session with ${interviewSessionState.questions.length} questions, ${answered} answered, ${skipped} skipped.`;

};

// Enforces the button-state matrix from the spec:
//  before start: only Start is enabled (handled by the start-interview form itself)
//  in progress:  Pause + Next + Skip + Prev + End enabled, Resume disabled
//  paused:       Resume + End enabled, everything else disabled
//  after end:    everything disabled
const refreshInterviewPauseControls=()=>{

const pauseBtn=document.getElementById("interviewPauseBtn");

const resumeBtn=document.getElementById("interviewResumeBtn");

const nextBtn=document.getElementById("interviewNextBtn");

const prevBtn=document.getElementById("interviewPrevBtn");

const skipBtn=document.getElementById("interviewSkipBtn");

const endBtn=document.getElementById("interviewEndBtn");

const answerEl=document.getElementById("interviewAnswerBox");

const statusBanner=document.getElementById("interviewSessionStatusBanner");

const active=interviewSessionState.active;

const paused=interviewSessionState.paused;

if(statusBanner){

statusBanner.style.display=(active && paused) ? "block" : "none";

}

if(pauseBtn){

pauseBtn.style.display=paused ? "none" : "inline-block";

pauseBtn.disabled=!active || paused;

}

if(resumeBtn){

resumeBtn.style.display=paused ? "inline-block" : "none";

resumeBtn.disabled=!active || !paused;

}

if(nextBtn) nextBtn.disabled=!active || paused || interviewSessionState.currentIndex>=interviewSessionState.questions.length-1;

if(prevBtn) prevBtn.disabled=!active || paused || interviewSessionState.currentIndex===0;

if(skipBtn) skipBtn.disabled=!active || paused;

if(endBtn) endBtn.disabled=!active;

if(answerEl) answerEl.disabled=!active || paused;

};

const syncCurrentAnswerToBackend=async ()=>{
  if(!interviewSessionState.sessionId) throw new Error("No interview session is available.");
  const item=interviewSessionState.questions[interviewSessionState.currentIndex];
  const answer=interviewSessionState.answers[interviewSessionState.currentIndex]||"";
  if(!item) throw new Error("Current interview question is unavailable.");
  const response=await fetch(`${API_BASE}/api/interview-sessions/${interviewSessionState.sessionId}/answers`,{
    method:"POST",
    headers:{...getAuthHeaders(),"Content-Type":"application/json"},
    body:JSON.stringify({
      question:item.question||"",
      answer:answer,
      category:item.category||"general",
      difficulty:item.difficulty||interviewSessionState.difficulty||"medium"
    })
  });
  if(handleUnauthorizedResponse(response)) throw new Error("Authentication expired while saving the answer.");
  let payload=null;
  try{payload=await response.json();}catch(error){}
  if(!response.ok) throw new Error(payload?.message || `Failed to save answer (HTTP ${response.status})`);
  if(payload?.status) interviewSessionState.backendStatus=payload.status;
  return payload;
};

const wireInterviewSessionControls=(questionsEl,errorEl)=>{

    const prevBtn=document.getElementById("interviewPrevBtn");
    const nextBtn=document.getElementById("interviewNextBtn");
    const skipBtn=document.getElementById("interviewSkipBtn");
    const endBtn=document.getElementById("interviewEndBtn");
    const pauseBtn=document.getElementById("interviewPauseBtn");
    const resumeBtn=document.getElementById("interviewResumeBtn");

    if(pauseBtn){
    pauseBtn.onclick=async ()=>{
    if(interviewSessionState.paused || !interviewSessionState.active){
    return;
    }

    saveCurrentInterviewAnswer();

    try{
    await syncCurrentQuestionTiming(Boolean(String(interviewSessionState.answers[interviewSessionState.currentIndex] || "").trim()));
    await callSessionAction("pause");

    interviewSessionState.paused=true;
    interviewSessionState.questionStartedAt=null;
    pauseInterviewTimer();
    pauseLiveRecording();

    refreshInterviewPauseControls();
    showToast("⏸ Interview paused");
    }catch(error){
    showToast("❌ "+(error.message || "Unable to pause the interview."));
    setLiveInterviewError("Unable to pause the interview: "+(error.message || "Server error."));
    }
    };
    }

    if(resumeBtn){
    resumeBtn.onclick=async ()=>{
    if(!interviewSessionState.paused || !interviewSessionState.active){
    return;
    }

    try{
    await callSessionAction("resume");

    interviewSessionState.paused=false;
    interviewSessionState.questionStartedAt=Date.now();
    resumeInterviewTimer(questionsEl,errorEl);
    resumeLiveRecording();

    refreshInterviewPauseControls();
    showToast("▶ Interview resumed");
    }catch(error){
    showToast("❌ "+(error.message || "Unable to resume the interview."));
    setLiveInterviewError("Unable to resume the interview: "+(error.message || "Server error."));
    }
    };
    }

    if(prevBtn){
    prevBtn.onclick=async ()=>{
    if(interviewSessionState.paused || interviewSessionState.currentIndex<=0){
    return;
    }

    saveCurrentInterviewAnswer();
    try{
    await syncCurrentQuestionTiming(Boolean(String(interviewSessionState.answers[interviewSessionState.currentIndex] || "").trim()));
    interviewSessionState.currentIndex-=1;
    interviewSessionState.questionStartedAt=Date.now();
    renderInterviewSession(questionsEl,errorEl);
    }catch(error){
    showToast("❌ "+(error.message || "Unable to move to the previous question."));
    setLiveInterviewError("Unable to move to the previous question: "+(error.message || "Server error."));
    }
    };
    }

    if(nextBtn){
    nextBtn.onclick=async ()=>{
    if(interviewSessionState.paused){
    return;
    }

    if(interviewSessionState.currentIndex>=interviewSessionState.questions.length-1){
    showToast("✅ You are at the last question");
    return;
    }

    saveCurrentInterviewAnswer();

    try{
    await syncCurrentQuestionTiming(Boolean(String(interviewSessionState.answers[interviewSessionState.currentIndex] || "").trim()));
    await syncCurrentAnswerToBackend();
    await callSessionAction("next-question");

    interviewSessionState.currentIndex+=1;
    interviewSessionState.questionStartedAt=Date.now();
    renderInterviewSession(questionsEl,errorEl);
    }catch(error){
    showToast("❌ "+(error.message || "Unable to move to the next question."));
    setLiveInterviewError("Unable to move to the next question: "+(error.message || "Server error."));
    }
    };
    }

    if(skipBtn){
    skipBtn.onclick=async ()=>{
    if(interviewSessionState.paused){
    return;
    }

    saveCurrentInterviewAnswer();

    try{
    await syncCurrentQuestionTiming(false);
    await callSessionAction("next-question");

    interviewSessionState.skippedIndices.add(interviewSessionState.currentIndex);

    if(interviewSessionState.currentIndex<interviewSessionState.questions.length-1){
    interviewSessionState.currentIndex+=1;
    interviewSessionState.questionStartedAt=Date.now();
    renderInterviewSession(questionsEl,errorEl);
    showToast("⏭ Question skipped");
    }else{
    showToast("⏭ Last question marked as skipped");
    }
    }catch(error){
    showToast("❌ "+(error.message || "Unable to skip the question."));
    setLiveInterviewError("Unable to skip the question: "+(error.message || "Server error."));
    }
    };
    }

    if(endBtn){
    endBtn.onclick=async ()=>{
      endBtn.disabled = true;
      try{
        await endInterviewSession(questionsEl,errorEl);
      }finally{
        refreshInterviewPauseControls();
      }
    };
    }

    };

    const updateRecordingDownloads=()=>{

const { recordingDownloadBtn,audioDownloadBtn }=getLiveInterviewElements();

if(recordingDownloadBtn){

recordingDownloadBtn.disabled=!liveInterviewState.videoRecordingBlob;

}

if(audioDownloadBtn){

audioDownloadBtn.disabled=!liveInterviewState.audioRecordingBlob;

}

};

const createMediaDownload=(blob,fileName)=>{

if(!blob){

throw new Error("No recording data available yet.");

}

const url=window.URL.createObjectURL(blob);

const link=document.createElement("a");

link.href=url;

link.download=fileName;

document.body.appendChild(link);

link.click();

document.body.removeChild(link);

window.URL.revokeObjectURL(url);

};

const stopRecorderSafely=(recorder)=>{

if(!recorder){

return;

}

try{

if(recorder.state!=="inactive"){

recorder.stop();

}

}catch(error){

}

};

const stopLiveRecording=()=>{

stopRecorderSafely(liveInterviewState.videoRecorder);

stopRecorderSafely(liveInterviewState.audioRecorder);

liveInterviewState.recordingActive=false;

liveInterviewState.recordingStartedAt=null;

const { recordingStatusEl }=getLiveInterviewElements();

if(recordingStatusEl){

setStatusPill(recordingStatusEl,false,"Recording","Idle");

}

refreshLiveInterviewUI();

updateRecordingDownloads();

persistLiveInterviewSnapshot(true);

return waitForRecordingUpload();
};

const pauseLiveRecording=()=>{

if(!liveInterviewState.recordingActive){

return;

}

try{

if(liveInterviewState.videoRecorder && liveInterviewState.videoRecorder.state==="recording"){

liveInterviewState.videoRecorder.pause();

}

if(liveInterviewState.audioRecorder && liveInterviewState.audioRecorder.state==="recording"){

liveInterviewState.audioRecorder.pause();

}

const { recordingStatusEl }=getLiveInterviewElements();

if(recordingStatusEl){

setStatusPill(recordingStatusEl,true,"Recording paused","Idle");

}

persistLiveInterviewSnapshot(true);

}catch(error){

// MediaRecorder.pause() can throw in unsupported browsers - recording keeps running, which is safe.

}

};

const resumeLiveRecording=()=>{

if(!liveInterviewState.recordingActive){

return;

}

try{

if(liveInterviewState.videoRecorder && liveInterviewState.videoRecorder.state==="paused"){

liveInterviewState.videoRecorder.resume();

}

if(liveInterviewState.audioRecorder && liveInterviewState.audioRecorder.state==="paused"){

liveInterviewState.audioRecorder.resume();

}

const { recordingStatusEl }=getLiveInterviewElements();

if(recordingStatusEl){

setStatusPill(recordingStatusEl,true,"Recording","Idle");

}

persistLiveInterviewSnapshot(true);

}catch(error){

}

};

const startLiveRecording=async ()=>{

if(liveInterviewState.recordingActive){

return;

}

if(!liveInterviewState.recordingSupported || !window.MediaRecorder){

setLiveInterviewError("Recording is not supported in this browser.");

return;

}

if(!liveInterviewState.stream){

const granted=await requestLiveInterviewMedia();

if(!granted){

return;

}

}

try{

const videoStream=liveInterviewState.stream;

const audioTracks=liveInterviewState.stream.getAudioTracks();

const videoMimeType=MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus") ? "video/webm;codecs=vp8,opus" : (MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "");

const audioMimeType=MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : (MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "");

if(!videoMimeType){

throw new Error("Video recording is not supported in this browser.");

}

const videoRecorder=new MediaRecorder(videoStream, { mimeType: videoMimeType });

const audioRecorder=audioTracks.length && audioMimeType ? new MediaRecorder(new MediaStream(audioTracks), { mimeType: audioMimeType }) : null;

liveInterviewState.recordedVideoChunks=[];

liveInterviewState.recordedAudioChunks=[];

liveInterviewState.videoRecordingBlob=null;

liveInterviewState.audioRecordingBlob=null;
liveInterviewState.recordingUploadPromise=null;
liveInterviewState.recordingUploadScheduled=false;
liveInterviewState.recordingUploadError=null;
liveInterviewState.recordingUploadFailed=false;

if(liveInterviewState.videoRecordingUrl){

window.URL.revokeObjectURL(liveInterviewState.videoRecordingUrl);

liveInterviewState.videoRecordingUrl="";

}

if(liveInterviewState.audioRecordingUrl){

window.URL.revokeObjectURL(liveInterviewState.audioRecordingUrl);

liveInterviewState.audioRecordingUrl="";

}

videoRecorder.ondataavailable=(event)=>{

if(event.data && event.data.size>0){

liveInterviewState.recordedVideoChunks.push(event.data);

}

};

if(audioRecorder){

audioRecorder.ondataavailable=(event)=>{

if(event.data && event.data.size>0){

liveInterviewState.recordedAudioChunks.push(event.data);

}

};

}

videoRecorder.onstop=()=>{

if(liveInterviewState.recordedVideoChunks.length){

liveInterviewState.videoRecordingBlob=new Blob(liveInterviewState.recordedVideoChunks,{ type: "video/webm" });

liveInterviewState.videoRecordingUrl=window.URL.createObjectURL(liveInterviewState.videoRecordingBlob);

}

updateRecordingDownloads();

persistLiveInterviewSnapshot(true);

scheduleRecordingUpload();

};

if(audioRecorder){

audioRecorder.onstop=()=>{

if(liveInterviewState.recordedAudioChunks.length){

liveInterviewState.audioRecordingBlob=new Blob(liveInterviewState.recordedAudioChunks,{ type: "audio/webm" });

liveInterviewState.audioRecordingUrl=window.URL.createObjectURL(liveInterviewState.audioRecordingBlob);

}

updateRecordingDownloads();

persistLiveInterviewSnapshot(true);

scheduleRecordingUpload();

};

}

videoRecorder.start(1000);

if(audioRecorder){

audioRecorder.start(1000);

}

liveInterviewState.videoRecorder=videoRecorder;

liveInterviewState.audioRecorder=audioRecorder;

liveInterviewState.recordingActive=true;

liveInterviewState.recordingStartedAt=Date.now();

const { recordingStatusEl }=getLiveInterviewElements();

if(recordingStatusEl){

setStatusPill(recordingStatusEl,true,"Recording","Idle");

}

refreshLiveInterviewUI();

showToast("⏺ Recording started");

persistLiveInterviewSnapshot(true);

}catch(error){

setLiveInterviewError(error.message || "Unable to start recording.");

}

};

const downloadLiveTranscript=()=>{

const transcript=(liveInterviewState.transcript || "").trim();

if(!transcript){

setLiveSpeechError("Transcript is empty. Speak during the interview first.");

return;

}

const blob=new Blob([transcript], { type: "text/plain;charset=utf-8" });

createMediaDownload(blob, `interview-transcript-${interviewSessionState.interviewId || "session"}.txt`);

showToast("Transcript downloaded");

};

const openLiveInterviewReportPage=()=>{

const interviewId=interviewSessionState.interviewId;

if(!interviewId){

showToast("No interview report is available yet.");

return;

}

window.location.href=`interview-report.html?interviewId=${interviewId}`;

};

const openEmailPreview=async ()=>{

const interviewId=interviewSessionState.interviewId;

if(!interviewId){

showToast("No interview report is available yet.");

return;

}

try{

const response=await fetch(`${API_BASE}/api/interviews/${interviewId}/report/email-preview`);

if(!response.ok){

throw new Error(`Failed to build email preview (HTTP ${response.status})`);

}

const preview=await response.json();

const subject=preview?.subject || "SmartHire AI Interview Report";

const body=preview?.body || "Your interview report is ready.";

const recipient=preview?.recipient || "candidate@smarthire.local";

window.location.href=`mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

}catch(error){

showToast(error.message || "Unable to prepare email preview");

}

};

const renderLiveTranscript=(interimText="")=>{

const { transcriptEl }=getLiveInterviewElements();

if(!transcriptEl){

return;

}

const fullText=[liveInterviewState.transcript,interimText].filter((part)=>typeof part==="string" && part.trim()).join(" ").trim();

transcriptEl.textContent=fullText || "Your speech will appear here when listening starts.";

transcriptEl.scrollTop=transcriptEl.scrollHeight;

persistLiveInterviewSnapshot();

};

const stopSpeechRecognition=()=>{

if(liveInterviewState.speechRecognition && liveInterviewState.speechListening){

liveInterviewState.speechListening=false;

try{

liveInterviewState.speechRecognition.stop();

}catch(error){

}

}

refreshLiveInterviewUI();

};

const startSpeechRecognition=()=>{

if(!liveInterviewState.speechSupported || !liveInterviewState.speechRecognition){

setLiveSpeechError("Speech Recognition is not supported in this browser. Please use a Chromium-based browser.");

refreshLiveInterviewUI();

return;

}

setLiveSpeechError("");

if(liveInterviewState.speechListening){

return;

}

liveInterviewState.speechListening=true;

refreshLiveInterviewUI();

try{

liveInterviewState.speechRecognition.start();

}catch(error){

liveInterviewState.speechListening=false;

setLiveSpeechError("Unable to start speech recognition. Please allow microphone access and try again.");

refreshLiveInterviewUI();

}

};

const initSpeechRecognition=()=>{

const RecognitionClass=window.SpeechRecognition || window.webkitSpeechRecognition;

if(!RecognitionClass){

liveInterviewState.speechSupported=false;

setLiveSpeechError("Speech Recognition is not available in this browser.");

refreshLiveInterviewUI();

return;

}

const recognition=new RecognitionClass();

recognition.lang="en-US";

recognition.continuous=true;

recognition.interimResults=true;

recognition.onresult=(event)=>{

let interimTranscript="";

for(let i=event.resultIndex;i<event.results.length;i++){

const result=event.results[i];

const text=(result[0]?.transcript || "").trim();

if(!text){

continue;

}

if(result.isFinal){

liveInterviewState.transcript=(liveInterviewState.transcript+" "+text).trim();

}else{

interimTranscript=(interimTranscript+" "+text).trim();

}

}

renderLiveTranscript(interimTranscript);

};

recognition.onerror=(event)=>{

if(event?.error==="not-allowed" || event?.error==="service-not-allowed"){

setLiveSpeechError("Microphone permission was denied for speech recognition.");

}else if(event?.error==="no-speech"){

setLiveSpeechError("No speech detected. Please speak clearly and try again.");

}else{

setLiveSpeechError("Speech recognition encountered an issue. You can try Start Listening again.");

}

liveInterviewState.speechListening=false;

refreshLiveInterviewUI();

};

recognition.onend=()=>{

const shouldContinue=liveInterviewState.speechListening;

if(shouldContinue){

try{

recognition.start();

return;

}catch(error){

liveInterviewState.speechListening=false;

setLiveSpeechError("Speech recognition stopped unexpectedly. Please start listening again.");

}

}

refreshLiveInterviewUI();

};

liveInterviewState.speechRecognition=recognition;

liveInterviewState.speechSupported=true;

setLiveSpeechError("");

refreshLiveInterviewUI();

};

const stopLiveInterviewMedia=()=>{

const { videoEl }=getLiveInterviewElements();

if(liveInterviewState.recordingActive){

stopLiveRecording();

}

if(liveInterviewState.stream){

liveInterviewState.stream.getTracks().forEach((track)=>track.stop());

}

if(videoEl){

videoEl.pause();

videoEl.srcObject=null;

}

liveInterviewState.stream=null;

liveInterviewState.joined=false;

liveInterviewState.cameraOn=false;

liveInterviewState.micOn=false;

liveInterviewState.followUpLoading=false;

stopSpeechRecognition();

refreshLiveInterviewUI();

};

const requestLiveInterviewMedia=async ()=>{

const { videoEl }=getLiveInterviewElements();

if(!videoEl){

return false;

}

if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){

setLiveInterviewError("Your browser does not support camera/microphone access for live interviews.");

return false;

}

try{

setLiveInterviewError("");

if(liveInterviewState.stream){

stopLiveInterviewMedia();

}

const stream=await navigator.mediaDevices.getUserMedia({ video:true, audio:true });

videoEl.srcObject=stream;

await videoEl.play();

const videoTrack=stream.getVideoTracks()[0] || null;

const audioTrack=stream.getAudioTracks()[0] || null;

liveInterviewState.stream=stream;

liveInterviewState.joined=true;

liveInterviewState.cameraOn=Boolean(videoTrack && videoTrack.enabled);

liveInterviewState.micOn=Boolean(audioTrack && audioTrack.enabled);

refreshLiveInterviewUI();

return true;

}catch(error){

stopLiveInterviewMedia();

let message="Unable to access camera or microphone. Please try again.";

switch(error && error.name){

case "NotAllowedError":

message="Camera or microphone permission was denied. Please allow access in your browser settings and try again.";

break;

case "NotFoundError":

message="No camera or microphone was found on this device.";

break;

case "NotReadableError":

message="Your camera or microphone is already in use by another application.";

break;

case "OverconstrainedError":

message="No camera/microphone on this device matches the required settings.";

break;

case "SecurityError":

message="Camera and microphone access is blocked in this browser context (page must be served over HTTPS or localhost).";

break;

}

setLiveInterviewError(message);

return false;

}

};

const toggleLiveCamera=async ()=>{

setLiveInterviewError("");

if(!liveInterviewState.stream){

const granted=await requestLiveInterviewMedia();

if(!granted){

return;

}

}

const videoTrack=liveInterviewState.stream?.getVideoTracks?.()[0];

if(!videoTrack){

setLiveInterviewError("No camera device was detected.");

return;

}

videoTrack.enabled=!videoTrack.enabled;

liveInterviewState.cameraOn=videoTrack.enabled;

refreshLiveInterviewUI();

};

const toggleLiveMic=async ()=>{

setLiveInterviewError("");

if(!liveInterviewState.stream){

const granted=await requestLiveInterviewMedia();

if(!granted){

return;

}

}

const audioTrack=liveInterviewState.stream?.getAudioTracks?.()[0];

if(!audioTrack){

setLiveInterviewError("No microphone device was detected.");

return;

}

audioTrack.enabled=!audioTrack.enabled;

liveInterviewState.micOn=audioTrack.enabled;

refreshLiveInterviewUI();

};

const initLiveInterviewPreview=()=>{

const { cameraToggleBtn,micToggleBtn,joinBtn,leaveBtn,videoEl,speechStartBtn,speechStopBtn,speechClearBtn,followUpBtn,recordingStartBtn,recordingStopBtn,recordingDownloadBtn,audioDownloadBtn,transcriptDownloadBtn,reportBtn,emailPreviewBtn }=getLiveInterviewElements();

if(!videoEl){

return;

}

refreshLiveInterviewUI();

initSpeechRecognition();

renderLiveTranscript();

const playQuestionBtn=document.getElementById("liveQuestionPlayBtn");
if(playQuestionBtn){
  playQuestionBtn.addEventListener("click",()=>{
    const questionEl=document.getElementById("interviewQuestionText");
    const text=questionEl?.textContent?.trim();
    if(!text){
      showToast("No interview question is available yet.");
      return;
    }
    if(!("speechSynthesis" in window)){
      showToast("Question audio is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(text);
    utterance.rate=0.95;
    utterance.pitch=1;
    window.speechSynthesis.speak(utterance);
  });
}

if(cameraToggleBtn){

cameraToggleBtn.addEventListener("click",async ()=>{

await toggleLiveCamera();

});

}

if(micToggleBtn){

micToggleBtn.addEventListener("click",async ()=>{

await toggleLiveMic();

});

}

if(joinBtn){

joinBtn.addEventListener("click",async ()=>{

const granted=await requestLiveInterviewMedia();

if(granted){

showToast("🎥 Live interview preview started");

startSpeechRecognition();

}

});

}

if(leaveBtn){

leaveBtn.addEventListener("click",()=>{

stopLiveInterviewMedia();

setLiveInterviewError("");

showToast("📴 Live interview preview stopped");

});

}

if(speechStartBtn){

speechStartBtn.addEventListener("click",()=>{

startSpeechRecognition();

});

}

if(speechStopBtn){

speechStopBtn.addEventListener("click",()=>{

stopSpeechRecognition();

});

}

if(speechClearBtn){

speechClearBtn.addEventListener("click",()=>{

liveInterviewState.transcript="";

renderLiveTranscript();

setLiveSpeechError("");

showToast("🧹 Transcript cleared");

});

}

if(followUpBtn){

followUpBtn.addEventListener("click",async ()=>{

await generateLiveFollowUpQuestion();

});

}

if(recordingStartBtn){

recordingStartBtn.addEventListener("click",async ()=>{

await startLiveRecording();

});

}

if(recordingStopBtn){

recordingStopBtn.addEventListener("click",()=>{

stopLiveRecording();

});

}

if(recordingDownloadBtn){

recordingDownloadBtn.addEventListener("click",()=>{

try{

createMediaDownload(liveInterviewState.videoRecordingBlob,`interview-video-${interviewSessionState.interviewId || "session"}.webm`);

}catch(error){

setLiveInterviewError(error.message || "Unable to download video recording.");

}

});

}

if(audioDownloadBtn){

audioDownloadBtn.addEventListener("click",()=>{

try{

createMediaDownload(liveInterviewState.audioRecordingBlob,`interview-audio-${interviewSessionState.interviewId || "session"}.webm`);

}catch(error){

setLiveInterviewError(error.message || "Unable to download audio recording.");

}

});

}

if(transcriptDownloadBtn){

transcriptDownloadBtn.addEventListener("click",()=>{

downloadLiveTranscript();

});

}

if(reportBtn){

reportBtn.addEventListener("click",()=>{

openLiveInterviewReportPage();

});

}

if(emailPreviewBtn){

emailPreviewBtn.addEventListener("click",async ()=>{

await openEmailPreview();

});

}

window.addEventListener("beforeunload",()=>{

stopLiveInterviewMedia();

});

};

let interviewSessionState={

questions:[],

interviewId:null,

sessionId:null,

backendStatus:"CREATED",

jobRole:"",

interviewType:"",

difficulty:"",

currentIndex:0,

skippedIndices:new Set(),

answers:{},

questionDurations:{},

questionStartedAt:null,

lastRenderedQuestionIndex:null,

timerSecondsRemaining:getConfiguredInterviewDurationSeconds(),

timerIntervalId:null,

active:false,

paused:false

};

// =============================
// MODULE 4: BACKEND SESSION STATE MACHINE HELPERS
// Talks to /api/interview-sessions/** (CREATED -> IN_PROGRESS -> PAUSED -> COMPLETED/CANCELLED).
// Backend session transitions are authoritative: local UI state changes only
// after the corresponding server transition succeeds.
// =============================

const createBackendInterviewSession=async (interviewId,totalQuestions)=>{

    const response=await fetch(`${API_BASE}/api/interview-sessions`,{

    method:"POST",

    headers:getAuthHeaders(),

    body:JSON.stringify({ interviewId:interviewId, totalQuestions:totalQuestions, maxDurationSeconds:getConfiguredInterviewDurationSeconds() })

    });

    if(handleUnauthorizedResponse(response)){

    throw new Error("Authentication expired. Please log in again.");

    }

    if(!response.ok){

    let message=`Failed to create interview session (HTTP ${response.status})`;
    try{
    const payload=await response.json();
    if(payload?.message) message=payload.message;
    }catch(error){}
    throw new Error(message);
    }

    const data=await response.json();
    if(!data || !data.id){
    throw new Error("Backend created an invalid interview session response.");
    }
    return data;

    };

    const callSessionAction=async (action)=>{

    if(!interviewSessionState.sessionId){

    throw new Error("No interview session is available.");

    }

    try{
    const response=await fetch(`${API_BASE}/api/interview-sessions/${interviewSessionState.sessionId}/${action}`,{

    method:"POST",

    headers:getAuthHeaders()

    });

    if(handleUnauthorizedResponse(response)){
    throw new Error("Authentication expired. Please log in again.");
    }

    let payload=null;
    try{
    payload=await response.json();
    }catch(error){}

    if(!response.ok){
    throw new Error(payload?.message || `Unable to ${action} interview session (HTTP ${response.status})`);
    }

    if(payload?.status){
    interviewSessionState.backendStatus=payload.status;
    }

    return payload;

    }catch(error){
    if(error instanceof Error){
    throw error;
    }
    throw new Error(`Unable to ${action} interview session.`);
    }

    };

    const uploadInterviewRecording=async (sessionId,videoBlob,audioBlob)=>{

    if(!sessionId || (!videoBlob && !audioBlob)){
    return null;
    }

    const formData=new FormData();
    if(videoBlob){
    formData.append("video",videoBlob,"interview-video.webm");
    }
    if(audioBlob){
    formData.append("audio",audioBlob,"interview-audio.webm");
    }

    const response=await fetch(`${API_BASE}/api/interview-sessions/${sessionId}/recording`,{
    method:"POST",
    headers:getAuthHeaders(false),
    body:formData
    });

    if(handleUnauthorizedResponse(response)){
    throw new Error("Authentication expired while uploading the recording.");
    }

    let payload=null;
    try{
    payload=await response.json();
    }catch(error){}

    if(!response.ok){
    throw new Error(payload?.message || `Recording upload failed (HTTP ${response.status})`);
    }

    if(payload?.status && payload.status!=="STORED"){
    throw new Error(`Recording was not stored. Backend status: ${payload.status}`);
    }

    liveInterviewState.recordingUploadError=null;
    // If a real Whisper service is enabled, prefer its transcript over the browser
    // speech-recognition transcript. The endpoint is optional and safely falls back.
    if(audioBlob){
      try{
        const whisperForm=new FormData(); whisperForm.append("audio",audioBlob,"interview-audio.webm");
        const whisperResponse=await fetch(`${API_BASE}/api/ai/speech/transcribe`,{method:"POST",headers:getAuthHeaders(false),body:whisperForm});
        if(whisperResponse.ok){
          const whisper=await whisperResponse.json();
          if(whisper?.transcript){
            liveInterviewState.transcript=whisper.transcript;
            const transcriptEl=document.getElementById("interviewTranscript"); if(transcriptEl) transcriptEl.value=whisper.transcript;
          }
        }
      }catch(e){ console.warn("Whisper transcription unavailable; browser transcript retained.",e); }
    }
    showToast("✅ Interview recording uploaded securely");
    return payload;
    };

    const scheduleRecordingUpload=()=>{

    if(!liveInterviewState.pendingRecordingSessionId || liveInterviewState.recordingUploadScheduled){
    return;
    }

    liveInterviewState.recordingUploadScheduled=true;

    setTimeout(async ()=>{
    liveInterviewState.recordingUploadScheduled=false;

    const videoBlob=liveInterviewState.videoRecordingBlob;
    const audioBlob=liveInterviewState.audioRecordingBlob;
    if(!videoBlob && !audioBlob){
    return;
    }

    const sessionId=liveInterviewState.pendingRecordingSessionId;
    liveInterviewState.recordingUploadPromise=(async ()=>{
    try{
    await uploadInterviewRecording(sessionId,videoBlob,audioBlob);
    liveInterviewState.recordingUploadError=null;
    liveInterviewState.recordingUploadFailed=false;
    persistLiveInterviewSnapshot(false);
    }catch(error){
    liveInterviewState.recordingUploadError=error.message || "Recording upload failed.";
    liveInterviewState.recordingUploadFailed=true;
    setLiveInterviewError("⚠ Recording could not be uploaded: "+liveInterviewState.recordingUploadError);
    showToast("❌ Recording upload failed");
    throw error;
    }
    })();

    try{
    await liveInterviewState.recordingUploadPromise;
    }catch(error){
    // Error is surfaced to the UI and retained in state for the end-flow warning.
    }
    })();

    };

    const waitForRecordingUpload=async ()=>{

    const started=Date.now();
    while(Date.now()-started<15000){
    const videoRecorder=liveInterviewState.videoRecorder;
    const audioRecorder=liveInterviewState.audioRecorder;
    const videoStopped=!videoRecorder || videoRecorder.state==="inactive";
    const audioStopped=!audioRecorder || audioRecorder.state==="inactive";

    if(videoStopped && audioStopped && !liveInterviewState.recordingUploadScheduled){
    if(liveInterviewState.recordingUploadPromise){
    try{
    await liveInterviewState.recordingUploadPromise;
    }catch(error){}
    }
    return;
    }

    await new Promise((resolve)=>setTimeout(resolve,50));
    }

    };

    const clampScore=(value)=>{

const number=Number(value);

if(!Number.isFinite(number)){

return 0;

}

if(number<0){

return 0;

}

if(number>100){

return 100;

}

return Math.round(number);

};

const setEvaluationScore=(scoreId,barId,value)=>{

const scoreEl=document.getElementById(scoreId);

const barEl=document.getElementById(barId);

const safeValue=clampScore(value);

if(scoreEl){

scoreEl.textContent=safeValue+"%";

}

if(barEl){

barEl.style.width=safeValue+"%";

}

};

const fillEvaluationList=(listId,items,emptyText)=>{

const listEl=document.getElementById(listId);

if(!listEl){

return;

}

listEl.innerHTML="";

if(!Array.isArray(items) || items.length===0){

const li=document.createElement("li");

li.textContent=emptyText;

listEl.appendChild(li);

return;

}

items.forEach((item)=>{

if(typeof item!=="string" || !item.trim()){

return;

}

const li=document.createElement("li");

li.textContent=item.trim();

listEl.appendChild(li);

});

if(!listEl.children.length){

const li=document.createElement("li");

li.textContent=emptyText;

listEl.appendChild(li);

}

};

const setCircularScore=(ringId,scoreId,value,color)=>{

const ringEl=document.getElementById(ringId);

const scoreEl=document.getElementById(scoreId);

const safeValue=clampScore(value);

if(scoreEl){

scoreEl.textContent=safeValue+"%";

}

if(ringEl){

ringEl.style.setProperty("--ring-value",safeValue);

ringEl.style.setProperty("--ring-color",color || "#1f78d1");

ringEl.style.background="conic-gradient(var(--ring-color) "+(safeValue*3.6)+"deg, rgba(31,120,209,.12) 0deg)";

}

};

const joinTextList=(items)=>{

if(!Array.isArray(items) || !items.length){

return "";

}

return items.filter((item)=>typeof item==="string" && item.trim()).map((item)=>item.trim()).join("\n");

};

const countFillerWords=(text)=>{

if(typeof text!=="string" || !text.trim()){

return 0;

}

const lowered=text.toLowerCase();

let count=0;

["um","uh","like","you know","basically","actually","literally","sort of","kind of","hmm"].forEach((word)=>{

let index=0;

while((index=lowered.indexOf(word,index))!==-1){

count+=1;

index+=word.length;

}

});

return count;

};

const hideInterviewEvaluationUI=()=>{

const loadingEl=document.getElementById("interviewEvaluationLoading");

const resultEl=document.getElementById("interviewEvaluationResult");

if(loadingEl){

loadingEl.style.display="none";

}

if(resultEl){

resultEl.style.display="none";

}

};

const renderInterviewEvaluation=(evaluation)=>{

const resultEl=document.getElementById("interviewEvaluationResult");

const recommendationEl=document.getElementById("evalRecommendation");

if(!resultEl){

return;

}

setCircularScore("evalOverallRing","evalOverallScore",evaluation?.overallScore,"#1f78d1");

setCircularScore("evalCommunicationRing","evalCommunicationScore",evaluation?.communicationScore,"#f08a24");

setCircularScore("evalConfidenceRing","evalConfidenceScore",evaluation?.confidenceScore,"#2d7a39");

setCircularScore("evalTechnicalRing","evalTechnicalScore",evaluation?.technicalScore,"#1d7f57");

setCircularScore("evalProfessionalismRing","evalProfessionalismScore",evaluation?.professionalismScore,"#5f46b3");

setEvaluationScore("evalGrammarScore","evalGrammarBar",evaluation?.grammarScore);

setEvaluationScore("evalSpeechClarityScore","evalSpeechClarityBar",evaluation?.speechClarityScore);

setEvaluationScore("evalSpeakingPaceScore","evalSpeakingPaceBar",evaluation?.speakingPaceScore);

setEvaluationScore("evalFillerWordScore","evalFillerWordBar",evaluation?.fillerWordScore);

setEvaluationScore("evalResponseCompletenessScore","evalResponseCompletenessBar",evaluation?.responseCompletenessScore);

setEvaluationScore("evalEyeContactScore","evalEyeContactBar",evaluation?.eyeContactPercentage);

setEvaluationScore("evalFacialEngagementScore","evalFacialEngagementBar",evaluation?.facialEngagementScore);

setEvaluationScore("evalResponseHesitationScore","evalResponseHesitationBar",evaluation?.responseHesitationScore);

setEvaluationScore("evalKeywordMatchingScore","evalKeywordMatchingBar",evaluation?.keywordMatchingScore);

setEvaluationScore("evalDomainRelevanceScore","evalDomainRelevanceBar",evaluation?.domainRelevanceScore);

setEvaluationScore("evalTechnicalAccuracyScore","evalTechnicalAccuracyBar",evaluation?.technicalAccuracyScore);

setEvaluationScore("evalAnswerCompletenessScore","evalAnswerCompletenessBar",evaluation?.answerCompletenessScore);

setEvaluationScore("evalTimeManagementScore","evalTimeManagementBar",evaluation?.timeManagementScore);

setEvaluationScore("evalAnswerOrganizationScore","evalAnswerOrganizationBar",evaluation?.answerOrganizationScore);

setEvaluationScore("evalInterviewEtiquetteScore","evalInterviewEtiquetteBar",evaluation?.interviewEtiquetteScore);

fillEvaluationList("evalStrengths",evaluation?.strengths,"No strengths returned.");

fillEvaluationList("evalWeaknesses",evaluation?.weaknesses,"No weaknesses returned.");

fillEvaluationList("evalImprovementSuggestions",evaluation?.improvementSuggestions,"No improvement suggestions returned.");

fillEvaluationList("evalPracticeRecommendations",evaluation?.practiceRecommendations,"No practice recommendations returned.");

fillEvaluationList("evalLearningResources",evaluation?.learningResources,"No learning resources returned.");

fillEvaluationList("evalFeedback",evaluation?.feedback,"No feedback returned.");

if(recommendationEl){

recommendationEl.textContent=(typeof evaluation?.recommendation==="string" && evaluation.recommendation.trim())

? evaluation.recommendation.trim()

: "No recommendation returned.";

}

const ratingEl=document.getElementById("evalRating");

if(ratingEl){

ratingEl.textContent=(typeof evaluation?.rating==="string" && evaluation.rating.trim()) ? evaluation.rating.trim() : "Pending";

}

resultEl.style.display="block";

};

const evaluateInterviewAnswers=async (payload,errorEl)=>{

const loadingEl=document.getElementById("interviewEvaluationLoading");

const resultEl=document.getElementById("interviewEvaluationResult");

if(!payload || !Array.isArray(payload.questions) || payload.questions.length===0){

return;

}

if(loadingEl){

loadingEl.style.display="block";

}

if(resultEl){

resultEl.style.display="none";

}

if(errorEl){

errorEl.style.display="none";

}

try{

const liveTranscript=(liveInterviewState.transcript || "").trim();

const timerSecondsRemaining=Number(interviewSessionState.timerSecondsRemaining || 0);

const totalDurationSeconds=Math.max(0,getConfiguredInterviewDurationSeconds()-timerSecondsRemaining);

const timeline=buildLiveInterviewTimeline();

const telemetry={

transcript:liveTranscript,

durationSeconds:totalDurationSeconds,

cameraAvailable:Boolean(liveInterviewState.stream && liveInterviewState.stream.getVideoTracks && liveInterviewState.stream.getVideoTracks().length),

microphoneAvailable:Boolean(liveInterviewState.stream && liveInterviewState.stream.getAudioTracks && liveInterviewState.stream.getAudioTracks().length),

cameraActive:Boolean(liveInterviewState.cameraOn),

microphoneActive:Boolean(liveInterviewState.micOn),

eyeContactPercentage:clampScore(liveInterviewState.cameraOn ? 72 + Math.min(10, liveTranscript.length/40) : 48),

facialEngagementScore:clampScore(liveInterviewState.cameraOn ? 68 + Math.min(12, liveTranscript.length/55) : 50),

responseHesitationScore:clampScore(100 - Math.min(35, countFillerWords(liveTranscript)*8) - (liveTranscript.length < 80 ? 10 : 0))

};

payload.sessionSummary=buildLiveSessionSummary();

payload.sessionTimeline=timeline;

payload.videoRecordingName=liveInterviewState.videoRecordingName;

payload.audioRecordingName=liveInterviewState.audioRecordingName;

payload.recordingSupported=liveInterviewState.recordingSupported;

payload.recordingActive=liveInterviewState.recordingActive;

payload.recordingDurationSeconds=liveInterviewState.recordingStartedAt ? Math.max(0,Math.floor((Date.now()-liveInterviewState.recordingStartedAt)/1000)) : 0;

payload.timerSecondsRemaining=timerSecondsRemaining;

payload.liveSignalsJson=localStorage.getItem("smarthire.liveSignals") || "{}";

payload.speechInsightsJson=localStorage.getItem("smarthire.speechInsights") || "{}";

Object.assign(payload,telemetry);

const response=await fetch(`${API_BASE}/api/interviews/evaluate`,{

method:"POST",

headers:getAuthHeaders(),

body:JSON.stringify(payload)

});

if(!response.ok){

throw new Error("Failed to evaluate interview (HTTP "+response.status+")");

}

const data=await response.json();

renderInterviewEvaluation(data || {});

showToast("🧠 Interview evaluation completed");

return data || {};

}catch(err){

if(errorEl){

errorEl.style.display="block";

errorEl.style.color="#e74c3c";

errorEl.textContent="⚠ "+(err.message || "Interview evaluation failed.");

}

showToast("❌ "+(err.message || "Interview evaluation failed"));

return null;

}finally{

if(loadingEl){

loadingEl.style.display="none";

}

}

};

const formatInterviewTime=(seconds)=>{

const mins=Math.floor(seconds/60);

const secs=seconds%60;

return String(mins).padStart(2,"0")+":"+String(secs).padStart(2,"0");

};

const renderInterviewTimer=()=>{

const formatted=formatInterviewTime(interviewSessionState.timerSecondsRemaining);
const timerEl=document.getElementById("interviewTimer");
const topTimerEl=document.getElementById("topTimerValue");

if(timerEl){
  timerEl.textContent=formatted;
}
if(topTimerEl){
  topTimerEl.textContent=formatted;
}

};

const stopInterviewTimer=()=>{

if(interviewSessionState.timerIntervalId){

clearInterval(interviewSessionState.timerIntervalId);

interviewSessionState.timerIntervalId=null;

}

};

// Pauses the countdown WITHOUT resetting timerSecondsRemaining - the interval is
// simply cleared so paused time never ticks down and never double-runs.
const pauseInterviewTimer=()=>{

stopInterviewTimer();

};

// Resumes the countdown from wherever timerSecondsRemaining currently sits.
const resumeInterviewTimer=(questionsEl,errorEl)=>{

if(interviewSessionState.timerIntervalId){

return;

}

startInterviewTimer(questionsEl,errorEl,false);

};

const saveCurrentInterviewAnswer=()=>{

if(!interviewSessionState.active || interviewSessionState.questions.length===0){

return;

}

const answerEl=document.getElementById("interviewAnswerBox");

if(!answerEl){

return;

}

interviewSessionState.answers[interviewSessionState.currentIndex]=answerEl.value || "";

updateLiveSessionTimeline();

persistLiveInterviewSnapshot();

};

const startInterviewTimer=(questionsEl,errorEl,resetTimer=true)=>{

stopInterviewTimer();

if(resetTimer){

interviewSessionState.timerSecondsRemaining=getConfiguredInterviewDurationSeconds();

}

renderInterviewTimer();

interviewSessionState.timerIntervalId=setInterval(()=>{

if(!interviewSessionState.active){

stopInterviewTimer();

return;

}

if(interviewSessionState.timerSecondsRemaining<=0){

stopInterviewTimer();

endInterviewSession(questionsEl,errorEl,{ message:"Time is over.", toast:"⏰ Time is over." });

return;

}

interviewSessionState.timerSecondsRemaining-=1;

renderInterviewTimer();

persistLiveInterviewSnapshot();

if(interviewSessionState.timerSecondsRemaining===0){

stopInterviewTimer();

endInterviewSession(questionsEl,errorEl,{ message:"Time is over.", toast:"⏰ Time is over." });

}

},1000);

};

const renderInterviewSession=(questionsEl,errorEl)=>{

const sessionEl=document.getElementById("interviewSession");

const numberEl=document.getElementById("interviewQuestionNumber");

const categoryEl=document.getElementById("interviewCategory");

const difficultyEl=document.getElementById("interviewDifficulty");
const answerModeEl=document.getElementById("interviewAnswerMode");
const optionsEl=document.getElementById("interviewOptions");

const questionTextEl=document.getElementById("interviewQuestionText");

const progressBarEl=document.getElementById("interviewProgressBar");

const answerEl=document.getElementById("interviewAnswerBox");

const prevBtn=document.getElementById("interviewPrevBtn");

const nextBtn=document.getElementById("interviewNextBtn");

if(!sessionEl || !numberEl || !categoryEl || !difficultyEl || !questionTextEl || !progressBarEl || !answerEl || !prevBtn || !nextBtn){

return;

}

const total=interviewSessionState.questions.length;

if(!interviewSessionState.active || total===0){

sessionEl.style.display="none";

return;

}

const index=interviewSessionState.currentIndex;

const current=interviewSessionState.questions[index];

if(interviewSessionState.lastRenderedQuestionIndex!==index){

interviewSessionState.questionStartedAt=Date.now();

interviewSessionState.lastRenderedQuestionIndex=index;

}

sessionEl.style.display="block";

if(questionsEl) questionsEl.style.display="none";

if(errorEl) errorEl.style.display="none";

numberEl.textContent="Question "+(index+1)+"/"+total;

categoryEl.textContent=current.category || "General";

difficultyEl.textContent=current.difficulty || "Not specified";
if(answerModeEl){
  const mode=Array.isArray(current.options)&&current.options.length>=2?"MCQ":(current.answerMode||"TEXT");
  answerModeEl.textContent=mode;
  answerModeEl.style.display=mode==="MCQ"?"inline-flex":"none";
  if(answerEl){
    answerEl.readOnly = mode === "MCQ";
    answerEl.placeholder = mode === "MCQ" ? "Select an option above..." : "Type your answer here or use voice input...";
  }
}

questionTextEl.textContent=current.question || "No question text available.";

const options=Array.isArray(current.options)?current.options.filter(v=>typeof v==="string"&&v.trim()):[];
if(optionsEl){
  if(options.length>=2){
    optionsEl.style.display="grid";
    optionsEl.innerHTML="";
    options.forEach((option,i)=>{
      const label=document.createElement("label");
      label.className="clean-mcq-option";
      const input=document.createElement("input");
      input.type="radio";
      input.name="interviewOption";
      input.value=option;
      input.checked=String(interviewSessionState.answers[index]||"")===option;
      const span=document.createElement("span");
      span.textContent=`${String.fromCharCode(65+i)}. ${option}`;
      if(input.checked) label.classList.add("selected");
      label.append(input,span);
      input.addEventListener("change",()=>{
        interviewSessionState.answers[index]=input.value;
        if(answerEl) answerEl.value=input.value;
        optionsEl.querySelectorAll(".clean-mcq-option").forEach(item=>item.classList.remove("selected"));
        label.classList.add("selected");
        updateLiveSessionTimeline();
        persistLiveInterviewSnapshot();
      });
      optionsEl.appendChild(label);
    });
  } else {
    optionsEl.style.display="none";
    optionsEl.innerHTML="";
  }
}


answerEl.value=interviewSessionState.answers[index] || "";

answerEl.oninput=()=>{

interviewSessionState.answers[index]=answerEl.value;

updateLiveSessionTimeline();

persistLiveInterviewSnapshot();

};

progressBarEl.style.width=Math.round(((index+1)/total)*100)+"%";

prevBtn.disabled=index===0;

nextBtn.disabled=index===total-1;

updateLiveSessionTimeline();

refreshInterviewPauseControls();

};

const showInterviewCompletionModal=(evaluation, interviewId)=>{
  const modal=document.getElementById("interviewCompletionModal");
  if(!modal) return;
  const pct=v=>Number.isFinite(Number(v))?Math.round(Number(v))+"%":"Pending";
  [["completionOverall",evaluation?.overallScore],["completionTechnical",evaluation?.technicalScore],["completionCommunication",evaluation?.communicationScore],["completionProblemSolving",evaluation?.problemSolvingScore]].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=pct(v);});
  const reportBtn=document.getElementById("completionReportBtn");
  const dashboardBtn=document.getElementById("completionDashboardBtn");
  reportBtn?.addEventListener("click",()=>{modal.hidden=true;window.location.href=`interview-report.html?interviewId=${encodeURIComponent(interviewId)}`;},{once:true});
  dashboardBtn?.addEventListener("click",()=>{modal.hidden=true;window.location.href="candidate.html";},{once:true});
  modal.querySelectorAll("[data-close-completion]").forEach(btn=>btn.addEventListener("click",()=>{modal.hidden=true;},{once:true}));
  modal.hidden=false;
};

const endInterviewSession=async (questionsEl,errorEl,options={})=>{

    if(!interviewSessionState.active || !interviewSessionState.sessionId){
    showToast("ℹ️ No active interview session is available.");
    setLiveInterviewError("There is no active interview session to end.");
    refreshInterviewPauseControls();
    return null;
    }

    saveCurrentInterviewAnswer();

    try{
    await syncCurrentQuestionTiming(Boolean(String(interviewSessionState.answers[interviewSessionState.currentIndex] || "").trim()));
    // Persist the final answer while the session is still IN_PROGRESS.
    // When the session is paused, the answer box is disabled, so there is nothing new to save.
    if(!interviewSessionState.paused){
        await syncCurrentAnswerToBackend();
    }

    // Backend is authoritative for the terminal state. End the session first;
    // recordings can still be uploaded against a COMPLETED session.
    await callSessionAction("end");
    }catch(error){
    showToast("❌ "+(error.message || "Unable to end the interview."));
    setLiveInterviewError("Unable to end the interview: "+(error.message || "Server error."));
    return;
    }

    let recordingError=null;
    if(liveInterviewState.recordingActive){
    try{
    await stopLiveRecording();
    }catch(error){
    recordingError=error;
    }
    }else if(liveInterviewState.recordingUploadPromise){
    try{
    await waitForRecordingUpload();
    }catch(error){
    recordingError=error;
    }
    }

    updateLiveSessionTimeline();

    const evaluationPayload={

    interviewId:interviewSessionState.interviewId,
    jobRole:interviewSessionState.jobRole,
    interviewType:interviewSessionState.interviewType,
    difficulty:interviewSessionState.difficulty,

    questions:interviewSessionState.questions.map((item)=>item?.question || ""),

    answers:interviewSessionState.questions.map((_,index)=>{
    const raw=interviewSessionState.answers[index];
    if(typeof raw==="string" && raw.trim()){
    return raw.trim();
    }
    return "No answer provided.";
    })

    };

    stopInterviewTimer();

    interviewSessionState.active=false;
    interviewSessionState.currentIndex=0;
    interviewSessionState.skippedIndices.clear();
    interviewSessionState.answers={};
    interviewSessionState.interviewId=null;
    interviewSessionState.sessionId=null;
    interviewSessionState.backendStatus="COMPLETED";
    interviewSessionState.paused=false;
    interviewSessionState.jobRole="";
    interviewSessionState.interviewType="";
    interviewSessionState.difficulty="";
    interviewSessionState.timerSecondsRemaining=getConfiguredInterviewDurationSeconds();
    interviewSessionState.lastRenderedQuestionIndex=null;
    interviewSessionState.questionStartedAt=null;

    persistLiveInterviewSnapshot(false);
    liveInterviewState.pendingRecordingSessionId=null;

    renderInterviewTimer();
    refreshInterviewPauseControls();

    const sessionEl=document.getElementById("interviewSession");
    if(sessionEl) sessionEl.style.display="none";
    const postActions=document.querySelector(".clean-post-interview-actions");
    if(postActions) postActions.style.display="flex";

    if(questionsEl){
    questionsEl.style.display="none";
    questionsEl.innerHTML="";
    }

    if(errorEl){
    errorEl.style.display="block";
    errorEl.style.color=recordingError ? "#b45309" : "#6c63ff";
    errorEl.textContent=recordingError
    ? `${options.message || "Interview session ended."} Recording upload failed: ${recordingError.message || "Unknown error"}.`
    : (options.message || "Interview session ended.");
    }

    if(recordingError){
    showToast("⚠ Interview ended, but recording upload failed. Please check the recording status.");
    }else{
    showToast(options.toast || "🛑 Interview session ended");
    }

    const completedInterviewId = evaluationPayload.interviewId;
    let evaluationResult = null;
    try{
      evaluationResult = await evaluateInterviewAnswers(evaluationPayload,errorEl);
    }catch(evaluationError){
      console.error("[Interview] evaluation failed after session end:", evaluationError);
      setLiveInterviewError("Interview ended successfully. AI evaluation could not be completed yet: " + (evaluationError?.message || "Unknown error."));
      showToast("✅ Interview ended. Evaluation will need to be retried from the report.");
    }

    if(completedInterviewId){
      showInterviewCompletionModal(evaluationResult || {}, completedInterviewId);
      const subtitle=document.getElementById("completionSubtitle");
      if(subtitle){ subtitle.textContent=evaluationResult ? "Your interview session, answers and evaluation have been saved. Your detailed report is ready." : "Your interview session and answers were saved. The detailed evaluation is still being finalized."; }
      showToast(evaluationResult ? "📄 Interview report is ready" : "✅ Interview ended");
    }

    return { completedInterviewId, evaluationResult, recordingError };
    };

    const readInterviewInput=(selectors, fallback)=>{

for(const selector of selectors){

const el=document.querySelector(selector);

if(el && typeof el.value === "string" && el.value.trim()){

return el.value.trim();

}

}

return fallback;

};

const formatHistoryDate=(value)=>{

if(!value){

return "-";

}

const date=new Date(value);

if(Number.isNaN(date.getTime())){

return String(value);

}

return date.toLocaleString();

};

const renderHistoryList=(items)=>{

const bodyEl=document.getElementById("interviewHistoryBody");

if(!bodyEl){

return;

}

bodyEl.innerHTML="";

if(!Array.isArray(items) || items.length===0){

bodyEl.innerHTML='<tr><td colspan="4" style="text-align:center; color:#6b7280;">No completed interviews found.</td></tr>';

return;

}

items.forEach((item)=>{

const interviewId=Number(item?.interviewId);

const dateText=formatHistoryDate(item?.interviewDate);

const jobRole=(typeof item?.jobRole==="string" && item.jobRole.trim()) ? item.jobRole.trim() : "Not provided";

const overallScore=Number.isFinite(Number(item?.overallScore)) ? Math.round(Number(item.overallScore))+"%" : "Pending";

const recommendation=(typeof item?.recommendation==="string" && item.recommendation.trim()) ? item.recommendation.trim() : "Pending evaluation";

const tr=document.createElement("tr");

tr.style.cursor="pointer";

tr.innerHTML="<td>"+dateText+"</td><td>"+jobRole+"</td><td>"+overallScore+"</td><td>"+recommendation+"</td>";

tr.addEventListener("click",()=>{

if(Number.isFinite(interviewId) && interviewId>0){

loadInterviewHistoryDetail(interviewId);

}

});

bodyEl.appendChild(tr);

});

};

const renderHistoryDetail=(detail)=>{

const detailsEl=document.getElementById("interviewHistoryDetails");

if(!detailsEl){

return;

}

const answers=Array.isArray(detail?.answers) ? detail.answers : [];

const feedback=Array.isArray(detail?.feedback) ? detail.feedback : [];

const evaluation=detail?.evaluation || null;

const answersHtml=answers.length

? answers.map((item,index)=>"<div style=\"margin-bottom:10px; padding:10px; border:1px solid #e4ebfb; border-radius:10px; background:#ffffff;\">"

+"<div style=\"font-weight:700; color:#1f4f8a; margin-bottom:6px;\">Q"+(index+1)+": "+(item?.question || "")+"</div>"

+"<div style=\"color:#2c3e50; margin-bottom:6px;\"><strong>Answer:</strong> "+(item?.answer || "No answer provided.")+"</div>"

+"<div style=\"font-size:12px; color:#64748b;\">Category: "+(item?.category || "General")+" | Difficulty: "+(item?.difficulty || "Not provided")+"</div>"

+"</div>").join("")

: "<p style=\"color:#6b7280; margin:0;\">No answer records available.</p>";

const feedbackHtml=feedback.length

? "<ul style=\"margin:0; padding-left:18px;\">"+feedback.map((item)=>"<li>"+item+"</li>").join("")+"</ul>"

: "<p style=\"color:#6b7280; margin:0;\">No feedback available.</p>";

const evaluationHtml=evaluation

? "<div style=\"display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:8px; margin-bottom:10px;\">"

+"<div style=\"background:#f2f7ff; border:1px solid #d9e8ff; border-radius:8px; padding:8px;\"><strong>Overall:</strong> "+(Number(evaluation.overallScore)||0)+"%</div>"

+"<div style=\"background:#f3fff8; border:1px solid #d8f4e5; border-radius:8px; padding:8px;\"><strong>Technical:</strong> "+(Number(evaluation.technicalScore)||0)+"%</div>"

+"<div style=\"background:#fff8f1; border:1px solid #ffe7ce; border-radius:8px; padding:8px;\"><strong>Communication:</strong> "+(Number(evaluation.communicationScore)||0)+"%</div>"

+"<div style=\"background:#f8f4ff; border:1px solid #eadfff; border-radius:8px; padding:8px;\"><strong>Problem Solving:</strong> "+(Number(evaluation.problemSolvingScore)||0)+"%</div>"

+"</div>"

+"<p style=\"margin:0 0 6px 0; color:#1f2d3d;\"><strong>Recommendation:</strong> "+(evaluation.recommendation || "Not available")+"</p>"

+"<p style=\"margin:0; color:#64748b; font-size:12px;\">Evaluated: "+formatHistoryDate(evaluation.evaluationDate)+"</p>"

: "<p style=\"color:#6b7280; margin:0;\">Evaluation summary is not available.</p>";

detailsEl.innerHTML=""

+"<h3 style=\"margin:0 0 10px 0; color:#1f2d3d;\">Interview Detail</h3>"

+"<p style=\"margin:0 0 10px 0; color:#64748b;\"><strong>Date:</strong> "+formatHistoryDate(detail?.interviewDate)+" | <strong>Job Role:</strong> "+(detail?.jobRole || "Not provided")+"</p>"

+"<h4 style=\"margin:0 0 8px 0; color:#1f4f8a;\">Evaluation</h4>"

+evaluationHtml

+"<h4 style=\"margin:12px 0 8px 0; color:#2d7a39;\">Feedback</h4>"

+feedbackHtml

+"<h4 style=\"margin:12px 0 8px 0; color:#364b8f;\">Questions and Answers</h4>"

+answersHtml;

detailsEl.style.display="block";

};

const loadInterviewHistoryDetail=async (interviewId)=>{

const userId=Number(localStorage.getItem("userId")||1);

const detailsEl=document.getElementById("interviewHistoryDetails");

if(!detailsEl){

return;

}

detailsEl.style.display="block";

detailsEl.innerHTML='<p style="margin:0; color:#1f4f8a;">Loading interview details...</p>';

try{

const response=await fetch(`${API_BASE}/api/interviews/history/`+userId+"/"+interviewId,{

headers:getAuthHeaders(false)

});

if(!response.ok){

throw new Error("Failed to load interview details (HTTP "+response.status+")");

}

const data=await response.json();

renderHistoryDetail(data || {});

}catch(err){

detailsEl.innerHTML='<p style="margin:0; color:#b23a3a;">'+(err.message || "Unable to load interview details")+'</p>';

}

};

const loadInterviewHistory=async ()=>{

const bodyEl=document.getElementById("interviewHistoryBody");

const detailsEl=document.getElementById("interviewHistoryDetails");

if(!bodyEl){

return;

}

if(detailsEl){

detailsEl.style.display="none";

detailsEl.innerHTML="";

}

bodyEl.innerHTML='<tr><td colspan="4" style="text-align:center; color:#1f4f8a;">Loading history...</td></tr>';

const userId=Number(localStorage.getItem("userId")||1);

try{

const response=await fetch(`${API_BASE}/api/interviews/history/`+userId,{

headers:getAuthHeaders(false)

});

if(!response.ok){

throw new Error("Failed to load interview history (HTTP "+response.status+")");

}

const data=await response.json();

renderHistoryList(Array.isArray(data) ? data : []);

}catch(err){

bodyEl.innerHTML='<tr><td colspan="4" style="text-align:center; color:#b23a3a;">'+(err.message || "Unable to load interview history")+'</td></tr>';

}

};

if(interviewBtn){

interviewBtn.addEventListener("click",async ()=>{

const loadingEl=document.getElementById("interviewLoading");

const errorEl=document.getElementById("interviewError");

const questionsEl=document.getElementById("interviewQuestions");

const prevBtn=document.getElementById("interviewPrevBtn");

const nextBtn=document.getElementById("interviewNextBtn");

const skipBtn=document.getElementById("interviewSkipBtn");

const endBtn=document.getElementById("interviewEndBtn");

const evaluationLoadingEl=document.getElementById("interviewEvaluationLoading");

const evaluationResultEl=document.getElementById("interviewEvaluationResult");

if(!questionsEl){

showToast("🎤 Starting AI Mock Interview...");

return;

}

// Reset UI state

if(loadingEl) loadingEl.style.display="block";

if(errorEl){

errorEl.style.display="none";

errorEl.textContent="";

errorEl.style.color="#e74c3c";

}

if(questionsEl){

questionsEl.innerHTML="";

questionsEl.style.display="none";

}

if(evaluationLoadingEl){

evaluationLoadingEl.style.display="none";

}

if(evaluationResultEl){

evaluationResultEl.style.display="none";

}

const sessionEl=document.getElementById("interviewSession");

if(sessionEl) sessionEl.style.display="none";

stopInterviewTimer();

interviewSessionState.timerSecondsRemaining=getConfiguredInterviewDurationSeconds();

renderInterviewTimer();

showToast("🎤 Starting AI Mock Interview...");

try{

// Request camera/microphone immediately from the Start Interview click.
// Browser permission prompts are most reliable when getUserMedia is called
// directly within the user's gesture rather than after several await calls.
if (!liveInterviewState.stream) {
  const mediaGranted = await requestLiveInterviewMedia();
  if (!mediaGranted) {
    showToast("⚠ Camera/microphone not enabled. You can continue, but recording will be unavailable until you enable them.", "error");
  }
}

const interviewPayload={

userId:Number(localStorage.getItem("userId")||1),

jobRole:readInterviewInput([
"#jobRole",
"#interviewJobRole",
"select[name='jobRole']",
"input[name='jobRole']"
],"Software Engineer"),

interviewType:readInterviewInput([
"#interviewType",
"select[name='interviewType']",
"input[name='interviewType']"
],"technical"),

domain:readInterviewInput([
"#domain",
"#interviewDomain",
"select[name='domain']",
"input[name='domain']"
],"java"),

experienceLevel:readInterviewInput([
"#experienceLevel",
"#interviewExperienceLevel",
"select[name='experienceLevel']",
"input[name='experienceLevel']"
],"mid"),

difficulty:readInterviewInput([
"#difficulty",
"#interviewDifficulty",
"select[name='difficulty']",
"input[name='difficulty']"
],"medium")

};

const response=await fetch(`${API_BASE}/api/interviews/start`,{

method:"POST",

headers:getAuthHeaders(),

body:JSON.stringify({

...interviewPayload

})

});

if(!response.ok){
    let serverMessage = "";
    try{
        const errorPayload = await response.json();
        serverMessage = typeof errorPayload?.message === "string" ? errorPayload.message.trim() : "";
    }catch(error){}
    throw new Error(serverMessage || "Failed to start interview (HTTP "+response.status+")");
}

const data=await response.json();

// Parse InterviewResponse

if(data && Array.isArray(data.questions) && data.questions.length>0){

const normalizedQuestions = data.questions

.map((item)=>({

question: typeof item?.question === "string" ? item.question.trim() : "",

category: typeof item?.category === "string" ? item.category.trim() : "General",

difficulty: typeof item?.difficulty === "string" ? item.difficulty.trim() : "Not specified",

answerMode: typeof item?.answerMode === "string" && item.answerMode.trim() ? item.answerMode.trim().toUpperCase() : (Array.isArray(item?.options) && item.options.length >= 2 ? "MCQ" : "TEXT"),

options: Array.isArray(item?.options) ? item.options.filter((option)=>typeof option === "string" && option.trim()).map((option)=>option.trim()) : []

}))

.filter((item)=>item.question.length>0);

const objectiveInterview = ["technical","assessment","quiz"].some(type => String(interviewPayload.interviewType || "").toLowerCase().includes(type));
const invalidObjectiveQuestions = objectiveInterview
  ? normalizedQuestions.filter(item => item.answerMode !== "MCQ" || item.options.length !== 4)
  : [];
if (objectiveInterview && invalidObjectiveQuestions.length > 0) {
  throw new Error("The interview server returned a non-MCQ question. Please restart the interview so SmartHire can load the verified question bank.");
}

if(normalizedQuestions.length===0){

if(errorEl){

errorEl.style.display="block";

errorEl.textContent="⚠ AI returned an empty question list.";

}

questionsEl.innerHTML='<li style="padding:10px 14px;background:#fff3cd;color:#856404;border-radius:10px;border-left:4px solid #ffc107;">No interview questions available. Please try again.</li>';

questionsEl.style.display="block";

showToast("⚠ AI returned no usable questions");

return;

}

interviewSessionState.questions=normalizedQuestions;
window.smartHireInterviewQuestionCount=normalizedQuestions.length || 10;
interviewSessionState.timerSecondsRemaining=getConfiguredInterviewDurationSeconds();

interviewSessionState.interviewId=Number(data.interviewId)||null;

interviewSessionState.jobRole=interviewPayload.jobRole;

interviewSessionState.interviewType=interviewPayload.interviewType;

interviewSessionState.difficulty=interviewPayload.difficulty;

interviewSessionState.currentIndex=0;

interviewSessionState.skippedIndices.clear();

interviewSessionState.answers={};

interviewSessionState.active=false;

interviewSessionState.paused=false;

interviewSessionState.sessionId=null;

interviewSessionState.backendStatus="CREATED";

const backendSession=await createBackendInterviewSession(interviewSessionState.interviewId,normalizedQuestions.length);

interviewSessionState.sessionId=backendSession.id;
liveInterviewState.pendingRecordingSessionId=backendSession.id;

        await callSessionAction("start");

        interviewSessionState.active=true;
        interviewSessionState.backendStatus="IN_PROGRESS";

        const evaluationResultEl = document.getElementById("interviewEvaluationResult");
        const evaluationLoadingEl = document.getElementById("interviewEvaluationLoading");
        if (evaluationResultEl) evaluationResultEl.style.display = "none";
        if (evaluationLoadingEl) evaluationLoadingEl.style.display = "none";
        window.scrollTo({ top: 0, behavior: "instant" });

        // Render the question IMMEDIATELY. Do not block question display behind
        // the camera/microphone permission prompt, which can stall or hang in some
        // browsers and left the interview question area empty.
        startInterviewTimer(questionsEl,errorEl);

        wireInterviewSessionControls(questionsEl,errorEl);

        renderInterviewSession(questionsEl,errorEl);

        showToast("✅ "+(data.message||"Interview questions generated!"));

}

else{

if(errorEl){

errorEl.style.display="block";

errorEl.textContent="⚠ No questions returned from server.";

}

questionsEl.innerHTML='<li style="padding:10px 14px;background:#fff3cd;color:#856404;border-radius:10px;border-left:4px solid #ffc107;">No interview questions were returned. Please retry.</li>';

questionsEl.style.display="block";

throw new Error("No questions returned from server");

}

}

catch(err){

if(errorEl){

errorEl.style.display="block";

errorEl.textContent="⚠ "+err.message;

}

showToast("❌ "+(err.message||"Failed to start interview"));

}

finally{

if(loadingEl) loadingEl.style.display="none";

}

});

}

initLiveInterviewPreview();

loadInterviewHistory();

const restoreLiveInterviewSessionFromStorage=async ()=>{

const snapshot=loadLiveInterviewSnapshot();

if(!snapshot || !snapshot.active || !Array.isArray(snapshot.questions) || snapshot.questions.length===0){

return;

}

applyLiveInterviewSnapshot(snapshot);

const questionsEl=document.getElementById("interviewQuestions");

const errorEl=document.getElementById("interviewError");

if(errorEl){

errorEl.style.display="none";

errorEl.textContent="";

}

wireInterviewSessionControls(questionsEl,errorEl);

renderInterviewSession(questionsEl,errorEl);

startInterviewTimer(questionsEl,errorEl,false);

const recoveryNotice=document.getElementById("liveRecoveryNotice");

if(recoveryNotice){

recoveryNotice.style.display="inline";

}

if(snapshot.live?.recordingActive){

const granted=await requestLiveInterviewMedia();

if(granted){

await startLiveRecording();

}

}

updateLiveSessionTimeline();

showToast("🔄 Live interview session restored");

};

restoreLiveInterviewSessionFromStorage();

const recruiterFormatDate=(value)=>{

if(!value){

return "-";

}

const date=new Date(value);

if(Number.isNaN(date.getTime())){

return String(value);

}

return date.toLocaleString();

};

const recruiterSetList=(listEl,items,fallback)=>{

if(!listEl){

return;

}

listEl.innerHTML="";

if(!Array.isArray(items) || items.length===0){

const li=document.createElement("li");

li.textContent=fallback;

listEl.appendChild(li);

return;

}

items.forEach((item)=>{

if(typeof item!=="string" || !item.trim()){

return;

}

const li=document.createElement("li");

li.textContent=item.trim();

listEl.appendChild(li);

});

if(!listEl.children.length){

const li=document.createElement("li");

li.textContent=fallback;

listEl.appendChild(li);

}

};

const buildRecruiterCandidateQuery=()=>{

const searchEl=document.getElementById("recruiterSearchInput");

const skillEl=document.getElementById("recruiterSkillFilter");

const experienceEl=document.getElementById("recruiterExperienceFilter");

const statusEl=document.getElementById("recruiterStatusFilter");

const atsEl=document.getElementById("recruiterAtsFilter");

const interviewEl=document.getElementById("recruiterInterviewFilter");

const params=new URLSearchParams();

if(searchEl && searchEl.value.trim()){

params.set("search",searchEl.value.trim());

}

if(skillEl && skillEl.value.trim()){

params.set("skill",skillEl.value.trim());

}

if(experienceEl && experienceEl.value.trim()){

params.set("experience",experienceEl.value.trim());

}

if(statusEl && statusEl.value.trim()){

params.set("status",statusEl.value.trim());

}

if(atsEl && atsEl.value.trim()){

params.set("minAtsScore",atsEl.value.trim());

}

if(interviewEl && interviewEl.value.trim()){

params.set("minInterviewScore",interviewEl.value.trim());

}

return params.toString();

};

const renderRecruiterCandidates=(items)=>{

const tbody=document.getElementById("recruiterCandidateTableBody");

if(!tbody){

return;

}

tbody.innerHTML="";

if(!Array.isArray(items) || items.length===0){

tbody.innerHTML='<tr><td colspan="7" style="text-align:center; color:#64748b;">No candidates match the selected filters.</td></tr>';

return;

}

items.forEach((candidate)=>{

const tr=document.createElement("tr");

const candidateId=Number(candidate?.candidateId);

const name=(typeof candidate?.candidateName==="string" && candidate.candidateName.trim()) ? candidate.candidateName.trim() : "Unknown Candidate";

const role=(typeof candidate?.jobRole==="string" && candidate.jobRole.trim()) ? candidate.jobRole.trim() : "Not provided";

const atsScore=Number.isFinite(Number(candidate?.resumeAtsScore)) ? Math.round(Number(candidate.resumeAtsScore))+"%" : "N/A";

const interviewScore=Number.isFinite(Number(candidate?.interviewScore)) ? Math.round(Number(candidate.interviewScore))+"%" : "Pending";

const recommendation=(typeof candidate?.recommendation==="string" && candidate.recommendation.trim()) ? candidate.recommendation.trim() : "Pending evaluation";

const resumeDate=recruiterFormatDate(candidate?.resumeUploadedDate);

tr.innerHTML=""

+"<td>"+name+"</td>"

+"<td>"+role+"</td>"

+"<td>"+atsScore+"</td>"

+"<td>"+interviewScore+"</td>"

+"<td>"+recommendation+"</td>"

+"<td>"+resumeDate+"</td>"

+"<td><button class=\"table-btn recruiter-view-btn\" type=\"button\">View Candidate</button></td>";

const viewBtn=tr.querySelector(".recruiter-view-btn");

if(viewBtn){

viewBtn.addEventListener("click",()=>{

if(Number.isFinite(candidateId) && candidateId>0){

window.location.href="recruiter-candidate-detail.html?candidateId="+candidateId;

}

});

}

tbody.appendChild(tr);

});

};

const updateRecruiterInsights=(items)=>{

const funnelEl=document.getElementById("recruiterFunnelSummary");

const topCandidatesEl=document.getElementById("recruiterTopCandidates");

const interviewed=items.filter((candidate)=>String(candidate?.status || "").toLowerCase()==="interviewed").length;

if(funnelEl){

const shortlisted=items.filter((candidate)=>String(candidate?.status || "").toLowerCase()==="shortlisted").length;

const rejected=items.filter((candidate)=>String(candidate?.status || "").toLowerCase()==="rejected").length;

funnelEl.textContent=`${items.length} candidates loaded • ${shortlisted} shortlisted • ${interviewed} interviewed • ${rejected} rejected`;

}

const totalCandidatesEl=document.getElementById("recruiterTotalCandidatesCounter");
const activeJobsEl=document.getElementById("recruiterActiveJobsCounter");
const interviewsEl=document.getElementById("recruiterInterviewsCounter");
const offersEl=document.getElementById("recruiterOffersCounter");
const candidatesHint=document.getElementById("recruiterCandidatesHint");
const jobsHint=document.getElementById("recruiterJobsHint");
const interviewsHint=document.getElementById("recruiterInterviewsHint");
const offersHint=document.getElementById("recruiterOffersHint");

if(totalCandidatesEl){
totalCandidatesEl.textContent=String(items.length);
}

if(activeJobsEl){
const uniqueRoles=new Set(items.map((item)=>String(item?.jobRole || "").trim()).filter((role)=>role));
activeJobsEl.textContent=String(uniqueRoles.size);
}

if(interviewsEl){
interviewsEl.textContent=String(interviewed);
}

if(offersEl){
const recommended=items.filter((item)=>String(item?.recommendation || "").toLowerCase().includes("hire") || String(item?.recommendation || "").toLowerCase().includes("strong")).length;
offersEl.textContent=String(recommended);
}

if(candidatesHint){
candidatesHint.textContent=items.length ? "Live candidate total" : "No candidates yet";
}

if(jobsHint){
jobsHint.textContent="Derived from active candidate roles";
}

if(interviewsHint){
interviewsHint.textContent="Candidates in interviewed status";
}

if(offersHint){
offersHint.textContent="High recommendation candidates";
}

if(topCandidatesEl){

const ranked=[...items]
.sort((left,right)=>{

const leftScore=Number.isFinite(Number(left?.interviewScore)) ? Number(left.interviewScore) : 0;

const rightScore=Number.isFinite(Number(right?.interviewScore)) ? Number(right.interviewScore) : 0;

return rightScore-leftScore;

})
.slice(0,4);

topCandidatesEl.innerHTML="";

if(!ranked.length){

topCandidatesEl.innerHTML='<div class="rank-item"><span>No live candidate rankings yet.</span><span>-</span></div>';

return;

}

ranked.forEach((candidate, index)=>{

const row=document.createElement("div");

row.className="rank-item";

const score=Number.isFinite(Number(candidate?.interviewScore)) ? Math.round(Number(candidate.interviewScore))+"%" : "Pending";

row.innerHTML=`<span>${index===0 ? "🥇" : index===1 ? "🥈" : index===2 ? "🥉" : "⭐"} ${recruiterSafeText(candidate?.candidateName, "Candidate")}</span><span>${score}</span>`;

topCandidatesEl.appendChild(row);

});

}

};

const loadRecruiterCandidates=async ()=>{

const tbody=document.getElementById("recruiterCandidateTableBody");

const loadingEl=document.getElementById("recruiterCandidatesLoading");

const errorEl=document.getElementById("recruiterCandidatesError");

if(!tbody){

return;

}

if(errorEl){

errorEl.style.display="none";

errorEl.textContent="";

}

if(loadingEl){

loadingEl.style.display="block";

}

tbody.innerHTML='<tr><td colspan="7" style="text-align:center; color:#1f4f8a;">Loading candidates...</td></tr>';

try{

const query=buildRecruiterCandidateQuery();

const response=await fetch(`${API_BASE}/api/recruiter/candidates`+(query ? "?"+query : ""),{
    headers:getAuthHeaders(false)
});

if(!response.ok){

if(handleUnauthorizedResponse(response)){
return;
}

throw new Error("Failed to load candidates (HTTP "+response.status+")");

}

const data=await response.json();

const items=Array.isArray(data) ? data : [];

renderRecruiterCandidates(items);

updateRecruiterInsights(items);

}catch(err){

tbody.innerHTML='<tr><td colspan="7" style="text-align:center; color:#b42318;">Unable to load candidates.</td></tr>';

if(errorEl){

errorEl.style.display="block";

errorEl.textContent=err.message || "Unable to load candidates.";

}

}finally{

if(loadingEl){

loadingEl.style.display="none";

}

}

};

const recruiterSafeText=(value,fallback)=>{

if(typeof value==="string" && value.trim()){

return value.trim();

}

return fallback;

};

const initRecruiterDashboard=()=>{

const tbody=document.getElementById("recruiterCandidateTableBody");

if(!tbody){

return;

}

const applyBtn=document.getElementById("recruiterApplyFiltersBtn");

const resetBtn=document.getElementById("recruiterResetFiltersBtn");

const searchEl=document.getElementById("recruiterSearchInput");

const experienceEl=document.getElementById("recruiterExperienceFilter");

const statusEl=document.getElementById("recruiterStatusFilter");

if(applyBtn){

applyBtn.addEventListener("click",async ()=>{

await loadRecruiterCandidates();

});

}

if(resetBtn){

resetBtn.addEventListener("click",async ()=>{

const skillEl=document.getElementById("recruiterSkillFilter");

const experienceEl=document.getElementById("recruiterExperienceFilter");

const statusEl=document.getElementById("recruiterStatusFilter");

const atsEl=document.getElementById("recruiterAtsFilter");

const interviewEl=document.getElementById("recruiterInterviewFilter");

if(searchEl) searchEl.value="";

if(skillEl) skillEl.value="";

if(experienceEl) experienceEl.value="";

if(statusEl) statusEl.value="";

if(atsEl) atsEl.value="";

if(interviewEl) interviewEl.value="";

await loadRecruiterCandidates();

});

}

if(searchEl){

searchEl.addEventListener("keydown",async (event)=>{

if(event.key==="Enter"){

event.preventDefault();

await loadRecruiterCandidates();

}

});

}

if(experienceEl){

experienceEl.addEventListener("keydown",async (event)=>{

if(event.key==="Enter"){

event.preventDefault();

await loadRecruiterCandidates();

}

});

}

if(statusEl){

statusEl.addEventListener("change",async ()=>{

await loadRecruiterCandidates();

});

}

loadRecruiterCandidates();

};

const loadRecruiterCandidateDetail=async ()=>{

const contentEl=document.getElementById("recruiterDetailContent");

if(!contentEl){

return;

}

const loadingEl=document.getElementById("recruiterDetailLoading");

const errorEl=document.getElementById("recruiterDetailError");

const params=new URLSearchParams(window.location.search);

const candidateId=Number(params.get("candidateId") || 0);

if(!Number.isFinite(candidateId) || candidateId<=0){

if(loadingEl) loadingEl.style.display="none";

if(errorEl){

errorEl.style.display="block";

errorEl.textContent="Candidate ID is missing in URL.";

}

return;

}

if(errorEl){

errorEl.style.display="none";

errorEl.textContent="";

}

if(loadingEl) loadingEl.style.display="block";

contentEl.style.display="none";

try{
const response=await fetch(`${API_BASE}/api/recruiter/candidates/`+candidateId,{

headers:getAuthHeaders(false)

});

if(!response.ok){

if(handleUnauthorizedResponse(response)){
return;
}

throw new Error("Failed to load candidate details (HTTP "+response.status+")");

}

const data=await response.json();

const heading=document.getElementById("candidateDetailHeading");

const subheading=document.getElementById("candidateDetailSubheading");

if(heading){

heading.textContent=(data?.candidateName || "Candidate")+" - Detail Profile";

}

if(subheading){

subheading.textContent="Comprehensive resume and interview insights for recruiter review.";

}

const interviewScores=data?.interviewScores || {};

const setText=(id,value)=>{

const el=document.getElementById(id);

if(el){

el.textContent=value;

}

};

setText("detailAtsScore",Number.isFinite(Number(data?.atsScore)) ? Math.round(Number(data.atsScore))+"%" : "N/A");

setText("detailInterviewOverall",Number.isFinite(Number(interviewScores?.overallScore)) ? Math.round(Number(interviewScores.overallScore))+"%" : "Pending");

setText("detailInterviewTechnical",Number.isFinite(Number(interviewScores?.technicalScore)) ? Math.round(Number(interviewScores.technicalScore))+"%" : "N/A");

setText("detailInterviewCommunication",Number.isFinite(Number(interviewScores?.communicationScore)) ? Math.round(Number(interviewScores.communicationScore))+"%" : "N/A");

setText("detailInterviewProblemSolving",Number.isFinite(Number(interviewScores?.problemSolvingScore)) ? Math.round(Number(interviewScores.problemSolvingScore))+"%" : "N/A");

setText("detailResumeSummary",(typeof data?.resumeSummary==="string" && data.resumeSummary.trim()) ? data.resumeSummary.trim() : "Resume summary not available.");

setText("detailJobRole",(typeof data?.jobRole==="string" && data.jobRole.trim()) ? data.jobRole.trim() : "Not provided");

setText("detailResumeDate",recruiterFormatDate(data?.resumeUploadedDate));

setText("detailRecommendation",(typeof data?.aiRecommendation==="string" && data.aiRecommendation.trim()) ? data.aiRecommendation.trim() : "Pending evaluation");

setText("detailCandidateStatus",(typeof data?.status==="string" && data.status.trim()) ? data.status.trim() : "New");

setText("detailRecruiterNotes",(typeof data?.recruiterNotes==="string" && data.recruiterNotes.trim()) ? data.recruiterNotes.trim() : "No recruiter notes yet.");

recruiterSetList(document.getElementById("detailStrengthsList"),data?.resumeStrengths,"No strengths available.");

recruiterSetList(document.getElementById("detailWeaknessesList"),data?.resumeWeaknesses,"No weaknesses available.");

recruiterSetList(document.getElementById("detailFeedbackList"),data?.aiFeedback,"No AI feedback available.");

const shortlistBtn=document.getElementById("detailShortlistBtn");

const rejectBtn=document.getElementById("detailRejectBtn");

const noteBtn=document.getElementById("detailNoteBtn");

const postRecruiterAction=async (actionType, notes)=>{
const actionResponse=await fetch(`${API_BASE}/api/recruiter/candidates/${candidateId}/${actionType}`,{

method:"POST",

headers:getAuthHeaders(),

body:JSON.stringify({

actorRole:"recruiter",

actionType,

subjectType:"candidate",

subjectId:candidateId,

notes:notes || actionType,

details:`Candidate ${actionType}`

})

});

if(!actionResponse.ok){

if(handleUnauthorizedResponse(actionResponse)){
return;
}

throw new Error(`Failed to ${actionType} candidate (HTTP ${actionResponse.status})`);

}

showToast(`Candidate ${actionType} successfully`);

await loadRecruiterCandidateDetail();

};

if(shortlistBtn){

shortlistBtn.onclick=async ()=>{

try{

await postRecruiterAction("shortlist","Shortlisted from recruiter detail page");

}catch(actionErr){

showToast(actionErr.message || "Unable to shortlist candidate");

}

};

}

if(rejectBtn){

rejectBtn.onclick=async ()=>{

try{

await postRecruiterAction("reject","Rejected from recruiter detail page");

}catch(actionErr){

showToast(actionErr.message || "Unable to reject candidate");

}

};

}

if(noteBtn){

noteBtn.onclick=async ()=>{

const note=window.prompt("Add a recruiter note for this candidate:");

if(note===null){

return;

}

try{

await postRecruiterAction("notes",note.trim() || "Recruiter note");

}catch(actionErr){

showToast(actionErr.message || "Unable to save recruiter note");

}

};

}

contentEl.style.display="block";

}catch(err){

if(errorEl){

errorEl.style.display="block";

errorEl.textContent=err.message || "Unable to load candidate detail.";

}

}finally{

if(loadingEl) loadingEl.style.display="none";

}

};

initRecruiterDashboard();

loadRecruiterCandidateDetail();

/*==========================
      AI REPORT
==========================*/

const aiBtn=document.querySelector(".ai-card button");

if(aiBtn){

aiBtn.addEventListener("click",()=>{

showToast("🤖 AI Report Generated");

});

}

}
/*==================================================
        CANDIDATE DASHBOARD - PART 3
==================================================*/

if(document.querySelector(".sidebar")){

/*=========================================
        CARD HOVER EFFECT
=========================================*/

const dashboardCards = document.querySelectorAll(
".dashboard-card,.analytics-card,.resume-card,.interview-box,.achievement-card,.goal-card,.settings-card,.course-card"
);

dashboardCards.forEach(card=>{

    card.addEventListener("mouseenter",()=>{

        card.style.transform="translateY(-8px)";

        card.style.transition=".3s";

    });

    card.addEventListener("mouseleave",()=>{

        card.style.transform="translateY(0px)";

    });

});

/*=========================================
        DAILY GOALS CHECK
=========================================*/

const goals=document.querySelectorAll(".goal-item progress");

goals.forEach(goal=>{

    goal.addEventListener("click",()=>{

        if(goal.value<goal.max){

            goal.value+=10;

        }

        if(goal.value>goal.max){

            goal.value=goal.max;

        }

        showToast("🎯 Goal Updated");

    });

});

/*=========================================
        ACHIEVEMENT CLICK
=========================================*/

const badges=document.querySelectorAll(".badge-box");

badges.forEach(badge=>{

    badge.addEventListener("click",()=>{

        showToast("🏆 Achievement Unlocked!");

    });

});

/*=========================================
        PROFILE CARD
=========================================*/

const profile=document.querySelector(".profile");

if(profile){

profile.addEventListener("click",()=>{

showToast("👤 Opening Profile...");

});

}

/*=========================================
        SEARCH BAR
=========================================*/

const search=document.querySelector(".search-box input");

if(search){

search.addEventListener("keyup",()=>{

console.log("Searching:",search.value);

});

}

/*=========================================
        DASHBOARD WELCOME
=========================================*/

setTimeout(()=>{

const userName = localStorage.getItem("userName") || "Candidate";
showToast("👋 Welcome back, " + userName + "!");

},1000);

}
/*==================================================
        CANDIDATE DASHBOARD - PART 4
==================================================*/

if(document.querySelector(".sidebar")){

/*=========================================
        AI ASSISTANT
=========================================*/

const aiAssistant=document.getElementById("aiAssistant");

if(aiAssistant){

aiAssistant.addEventListener("click",()=>{

showToast("🤖 AI Assistant: Try improving your ATS score by adding more project keywords.");

});

}

/*=========================================
        RESUME PREVIEW
=========================================*/

const previewBtn=document.querySelector(".resume-buttons .secondary-btn");

if(previewBtn){

previewBtn.addEventListener("click",()=>{

showToast("📄 Resume Preview Opened");

});

}

/*=========================================
        DOWNLOAD RESUME
=========================================*/

const downloadBtn=document.querySelector(".resume-buttons .primary-btn");

if(downloadBtn){

downloadBtn.addEventListener("click",async ()=>{

if(!currentResumeId){

showToast("⚠ Please analyze a resume first to generate a report");

return;

}

try{

const response=await fetch(`${API_BASE}/api/resume/report/${currentResumeId}`,{

headers:getAuthHeaders(false)

});

if(!response.ok){

if(response.status===404){

showToast("❌ Report not found or you do not have access");

}else{

showToast("❌ Failed to download report (HTTP "+response.status+")");

}

return;

}

const blob=await response.blob();

const url=window.URL.createObjectURL(blob);

const link=document.createElement("a");

link.href=url;

link.download="resume-report-"+currentResumeId+".pdf";

document.body.appendChild(link);

link.click();

document.body.removeChild(link);

window.URL.revokeObjectURL(url);

showToast("⬇ Resume Report Downloaded");

}catch(err){

showToast("❌ Download failed: "+err.message);

}

});

}

/*=========================================
        PLACEMENT STATUS
=========================================*/

const placement=document.querySelector(".placement-box h1");

if(placement){

placement.addEventListener("click",()=>{

const atsScore = parseInt(localStorage.getItem("smarthire.lastAtsScore") || "0", 10);
const readyPct = atsScore > 0 ? atsScore : 0;
showToast("🎯 Placement readiness: " + readyPct + "% based on your latest ATS analysis");

});

}

/*=========================================
        PROFILE IMAGE
=========================================*/

const profileImage=document.querySelector(".profile-summary img");

if(profileImage){

profileImage.addEventListener("click",()=>{

showToast("👤 Profile Photo");

});

}

/*=========================================
        SAVE DARK MODE
=========================================*/

const darkCheckbox=document.querySelector(".setting-item input");

if(darkCheckbox){

const savedMode=localStorage.getItem("darkMode");

if(savedMode==="true"){

document.body.classList.add("dark-mode");

darkCheckbox.checked=true;

}

darkCheckbox.addEventListener("change",()=>{

localStorage.setItem("darkMode",darkCheckbox.checked);

});

}

/*=========================================
        CARD FADE-IN
=========================================*/

const cards=document.querySelectorAll(
".dashboard-card,.analytics-card,.resume-card,.interview-box,.settings-card,.course-card"
);

cards.forEach((card,index)=>{

card.style.opacity="0";

card.style.transform="translateY(30px)";

setTimeout(()=>{

card.style.transition=".5s";

card.style.opacity="1";

card.style.transform="translateY(0)";

},index*120);

});

/*=========================================
        SESSION TIMER
=========================================*/

let seconds=0;

setInterval(()=>{

seconds++;

console.log("Dashboard Session:",seconds+" sec");

},1000);

}
/* ==========================================
   DASHBOARD COUNTER
========================================== */

window.addEventListener("load", () => {

    const counters = document.querySelectorAll(".counter");

    counters.forEach(counter => {

        const target = Number(counter.getAttribute("data-target"));

        let count = 0;

        const interval = setInterval(() => {

            count++;

            counter.textContent = count;

            if(count >= target){

                clearInterval(interval);

            }

        },15);

    });

});
/*==================================================
        RECRUITER DASHBOARD
==================================================*/

// ========================================
// Candidate Search
// ========================================

const recruiterSearch = document.querySelector(
'input[placeholder="Search candidates..."]'
);

if(recruiterSearch){

    recruiterSearch.addEventListener("keyup",()=>{

        const value = recruiterSearch.value.toLowerCase();

        const rows = document.querySelectorAll(".candidate-table tbody tr");

        rows.forEach(row=>{

            row.style.display = row.innerText
            .toLowerCase()
            .includes(value)
            ? ""
            : "none";

        });

    });

}

// ========================================
// View Candidate
// ========================================

document.querySelectorAll(".table-btn").forEach(button=>{

    button.addEventListener("click",()=>{

        showToast("👤 Opening Candidate Profile...");

    });

});

/*==================================================
        RECRUITER DASHBOARD - PART 2
==================================================*/

// ========================================
// Create Job Button
// ========================================

const createJobBtn = document.querySelector(".job-management .primary-btn");

if(createJobBtn){

    createJobBtn.addEventListener("click",()=>{

        showToast("💼 Create Job popup will open.");

    });

}

// ========================================
// Manage Job Buttons
// ========================================

document.querySelectorAll(".job-table .table-btn").forEach(button=>{

    button.addEventListener("click",()=>{

        showToast("📋 Opening Job Details...");

    });

});

// ========================================
// Notification Cards
// ========================================

document.querySelectorAll(".notify-box").forEach(box=>{

    box.addEventListener("click",()=>{

        box.style.opacity="0.5";

        showToast("✅ Notification marked as read.");

    });

});

// ========================================
// Recruiter Logout
// ========================================

const recruiterLogout = [...document.querySelectorAll(".sidebar li")].find(item =>
    item.innerText.includes("Logout")
);

if(recruiterLogout){

    recruiterLogout.addEventListener("click",()=>{

        const confirmLogout = confirm("Do you want to logout?");

        if(confirmLogout){

            showToast("👋 Logged out successfully.");

            setTimeout(()=>{
                window.location.href="../index.html";
            },1000);

        }

    });

}

// ========================================
// AI Welcome Message
// ========================================

window.addEventListener("load",()=>{

    if(document.title.includes("Recruiter")){

        setTimeout(()=>{

            showToast("🤖 AI Recruiter Assistant Ready.");

        },800);

    }

});
/*==================================================
        ADMIN DASHBOARD
==================================================*/

// ========================================
// Search Users
// ========================================

const adminSearch = document.querySelector(
'input[placeholder="Search users..."]'
);

if(adminSearch){

    adminSearch.addEventListener("keyup",()=>{

        const value = adminSearch.value.toLowerCase();

        const rows = document.querySelectorAll(".admin-table tbody tr");

        rows.forEach(row=>{

            row.style.display = row.innerText
            .toLowerCase()
            .includes(value)
            ? ""
            : "none";

        });

    });

}

// ========================================
// View User
// ========================================

document.querySelectorAll(".admin-table .table-btn").forEach(button=>{

    button.addEventListener("click",()=>{

        showToast("👤 Opening User Profile...");

    });

});

// ========================================
// System Control Buttons
// ========================================

document.querySelectorAll(".control-buttons button").forEach(button=>{

button.addEventListener("click",()=>{

showToast(button.innerText + " Executed Successfully");

});

});

// ========================================
// Admin Welcome
// ========================================

window.addEventListener("load",()=>{

if(document.title.includes("Admin")){

setTimeout(()=>{

showToast("🛡️ Welcome Administrator");

},800);

}

});

// ========================================
// Logout
// ========================================

const adminLogout=[...document.querySelectorAll(".sidebar li")].find(item=>
item.innerText.includes("Logout")
);

if(adminLogout){

adminLogout.addEventListener("click",()=>{

if(confirm("Logout from Admin Dashboard?")){

showToast("👋 Logged Out");

setTimeout(()=>{

window.location.href="../index.html";

},1000);

}

const adminFormatValue=(value,fallback)=>{

if(typeof value==="number" && Number.isFinite(value)){

return String(value);

}

if(typeof value==="string" && value.trim()){

return value.trim();

}

if(value===0){

return "0";

}

return fallback;

};

const renderAdminDashboard=(data)=>{

const stats=Array.isArray(data?.stats) ? data.stats : [];

const users=Array.isArray(data?.users) ? data.users : [];

const activities=Array.isArray(data?.recentActivities) ? data.recentActivities : [];

const statLookup=new Map(stats.map((stat)=>[String(stat?.label || "").toLowerCase(), stat]));

const setCounter=(id,labelFallback)=>{

const el=document.getElementById(id);

if(!el){

return;

}

const key=labelFallback.toLowerCase();

const stat=statLookup.get(key);

if(stat){

el.textContent=adminFormatValue(stat.value, el.textContent || "0");

}

};

setCounter("adminTotalUsers","Total Users");

setCounter("adminRecruitersCount","Recruiters");

setCounter("adminAiRequests","AI Usage");

const systemHealthValue=document.getElementById("adminSystemHealthValue");
const systemHealthHint=document.getElementById("adminSystemHealthHint");
const healthStat=stats.find((stat)=>String(stat?.label || "").toLowerCase().includes("health"));
if(systemHealthValue){
systemHealthValue.textContent=healthStat ? adminFormatValue(healthStat.value, "-") : "-";
}
if(systemHealthHint){
systemHealthHint.textContent=healthStat ? "Live" : "No health metric";
}

const platformStatsEl=document.getElementById("adminPlatformStats");

if(platformStatsEl){

platformStatsEl.textContent=stats.map((stat)=>`${adminFormatValue(stat.label, "Stat")}: ${adminFormatValue(stat.value, "0")}`).join(" • ");

}

const userTableBody=document.getElementById("adminUserTableBody");

if(userTableBody){

userTableBody.innerHTML="";

if(users.length===0){

userTableBody.innerHTML='<tr><td colspan="5" style="text-align:center; color:#64748b;">No users found.</td></tr>';

}
else{

users.forEach((user)=>{

const row=document.createElement("tr");

row.innerHTML=`<td>${adminFormatValue(user?.name, "Unknown User")}</td><td>${adminFormatValue(user?.role, "Unknown")}</td><td><span class="status ${String(user?.status || "active").toLowerCase()}">${adminFormatValue(user?.status, "Active")}</span></td><td>Now</td><td><button class="table-btn" type="button">View</button></td>`;

row.querySelector("button")?.addEventListener("click",()=>showToast(`👤 ${adminFormatValue(user?.name, "User")} details`));

userTableBody.appendChild(row);

});

}

}

const recentActivityEl=document.getElementById("adminRecentActivity");

if(recentActivityEl){

recentActivityEl.innerHTML="";

if(activities.length===0){

recentActivityEl.innerHTML='<div class="activity-item">No recent activity available.<small>Live updates will appear here.</small></div>';

}
else{

activities.forEach((activity)=>{

const item=document.createElement("div");

item.className="activity-item";

item.innerHTML=`${adminFormatValue(activity?.title, "Platform activity")}<small>${adminFormatValue(activity?.description, "Updated recently")}</small>`;

recentActivityEl.appendChild(item);

});

}

}

};

const loadAdminDashboard=async ()=>{

const dashboardRoot=document.querySelector(".admin-analytics");

if(!dashboardRoot){

return;

}

try{
const response=await fetch(`${API_BASE}/api/admin/dashboard`,{

headers:getAuthHeaders(false)

});

if(!response.ok){

if(handleUnauthorizedResponse(response)){
return;
}

throw new Error(`Failed to load admin dashboard (HTTP ${response.status})`);

}

const data=await response.json();

renderAdminDashboard(data);

}catch(err){

const platformStatsEl=document.getElementById("adminPlatformStats");

if(platformStatsEl){

platformStatsEl.textContent=err.message || "Unable to load admin dashboard.";

}

}

};

if(document.title.includes("Admin")){

window.addEventListener("load",()=>{

loadAdminDashboard();

});

}

});

}


// SmartHire advanced live-room UI bridge: expose read-only interview state for the premium UI layer.
try { window.interviewSessionState = interviewSessionState; } catch (_) {}
try { window.liveInterviewState = liveInterviewState; } catch (_) {}
