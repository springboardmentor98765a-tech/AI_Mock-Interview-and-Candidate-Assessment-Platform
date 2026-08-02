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

const loginSubmit = document.querySelector(".login-box button");

if(loginSubmit){

    loginSubmit.addEventListener("click",()=>{

        loginModal.style.display="none";

        toast.innerHTML="✅ Login Successful!";

        toast.style.display="block";

        setTimeout(()=>{

            toast.style.display="none";

        },3000);

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

        e.preventDefault();

        const target = document.querySelector(this.getAttribute("href"));

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

const roleSelect=document.querySelector(".login-box select");

if(loginSubmit){

loginSubmit.addEventListener("click",()=>{

    if(roleSelect){

        localStorage.setItem("userRole",roleSelect.value);

    }

});

}

const savedRole=localStorage.getItem("userRole");

if(savedRole && roleSelect){

    roleSelect.value=savedRole;

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

if(themeBtn){

    themeBtn.addEventListener("click",()=>{

        document.body.classList.toggle("dark-mode");

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

showToast("🔔 No New Notifications");

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
        SIDEBAR ACTIVE
    ==========================*/

    const menuItems = document.querySelectorAll(".sidebar ul li");

    menuItems.forEach(item => {

        item.addEventListener("click", () => {

            menuItems.forEach(i => i.classList.remove("active"));

            item.classList.add("active");

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

    const uploadBtn = document.querySelector(".upload-box button");

    if (uploadBtn) {

        uploadBtn.addEventListener("click", () => {

            showToast("✅ Resume Uploaded Successfully!");

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

    /*==========================
        QUICK ACTIONS
    ==========================*/

    document.querySelectorAll(".quick-grid button").forEach(btn => {

        btn.addEventListener("click", () => {

            showToast(btn.innerText + " Coming Soon");

        });

    });

}
/*==================================================
        CANDIDATE DASHBOARD - PART 2
==================================================*/

if(document.querySelector(".sidebar")){

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

if(interviewBtn){

interviewBtn.addEventListener("click",()=>{

showToast("🎤 Starting AI Mock Interview...");

});

}

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

showToast("👋 Welcome Back Candidate!");

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

downloadBtn.addEventListener("click",()=>{

showToast("⬇ Resume Download Started");

});

}

/*=========================================
        PLACEMENT STATUS
=========================================*/

const placement=document.querySelector(".placement-box h1");

if(placement){

placement.addEventListener("click",()=>{

showToast("🎯 You are 91% Placement Ready!");

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

// ========================================
// Add Candidate
// ========================================

const addCandidate=document.querySelector(".candidate-management .primary-btn");

if(addCandidate){

addCandidate.addEventListener("click",()=>{

showToast("✅ Add Candidate feature coming soon.");

});

}
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
// Add User
// ========================================

const addUser=document.querySelector(".user-management .primary-btn");

if(addUser){

addUser.addEventListener("click",()=>{

showToast("➕ Add User feature coming soon.");

});

}

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

});

}
/*=========================================
ROLE BASED LOGIN
=========================================*/



if(loginSubmit){

    loginSubmit.addEventListener("click",()=>{

        const role = roleSelect.value;

        if(role===""){

            showToast("⚠ Please select a role.");

            return;

        }

        localStorage.setItem("userRole",role);

        showToast("✅ Login Successful!");

        setTimeout(()=>{

            if(role==="candidate"){

                window.location.href="pages/candidate.html";

            }

            else if(role==="recruiter"){

                window.location.href="pages/recruiter.html";

            }

            else if(role==="admin"){

                window.location.href="pages/admin.html";

            }

        },1000);

    });

}