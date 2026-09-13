
/* ==========================================================
              AI INTERVIEW PRO
                 FINAL script.js
========================================================== */



/* ===============================
        LOGIN MODAL
================================ */


const loginBtn = document.getElementById("loginBtn");

const loginModal = document.getElementById("loginModal");

const closeLogin = document.getElementById("closeLogin");



function getRememberedAccounts(){
    return SavedLoginStore.get(localStorage);
}

function saveRememberedAccounts(accounts){
    return SavedLoginStore.save(accounts, localStorage);
}

function upsertRememberedAccount(email, password, role){
    return SavedLoginStore.upsert(email, password, role, localStorage);
}

function useRememberedAccount(account){
    const emailInput = document.getElementById("login-email");
    emailInput.value = account.email;
    emailInput.readOnly = true;
    document.getElementById("login-password").value = account.password || "";
    document.getElementById("login-role").value = account.role || "";
    document.getElementById("remember-me").checked = true;
    closeSavedAccountsDropdown();
    document.querySelector(".login-submit").focus();
}

function removeRememberedAccount(email){
    return SavedLoginStore.remove(email, localStorage);
}

function renderSavedAccountsDropdown(show = true){
    const dropdown = document.getElementById("savedAccountsList");
    const emailInput = document.getElementById("login-email");
    if(!dropdown) return;
    const accounts = getRememberedAccounts();
    dropdown.innerHTML = "";
    accounts.forEach(account => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "saved-account-item";
        item.setAttribute("role", "option");
        const roleLabel = account.role ? account.role.charAt(0).toUpperCase() + account.role.slice(1) : "Saved account";
        const initial = account.email.charAt(0).toUpperCase();
        item.innerHTML = "<span class=\"saved-account-icon\" aria-hidden=\"true\">"+initial+"</span><span class=\"saved-account-text\"><strong>"+
            account.email.replace(/[&<>\"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]))+
            "</strong><small>Saved credentials · "+roleLabel+"</small></span><span class=\"saved-account-remove\" title=\"Remove saved login\" aria-label=\"Remove saved login\">×</span>";
        item.addEventListener("click", event => {
            if(event.target.closest(".saved-account-remove")){
                event.stopPropagation();
                removeRememberedAccount(account.email);
                renderSavedAccountsDropdown(true);
                return;
            }
            useRememberedAccount(account);
        });
        dropdown.appendChild(item);
    });
    if(accounts.length){
        const other = document.createElement("button");
        other.type = "button";
        other.className = "saved-accounts-other";
        other.textContent = "＋ Use another email";
        other.addEventListener("click", event => {
            event.stopPropagation();
            closeSavedAccountsDropdown();
            emailInput.readOnly = false;
            emailInput.value = "";
            document.getElementById("login-password").value = "";
            document.getElementById("login-role").value = "";
            emailInput.focus();
        });
        dropdown.appendChild(other);
        const footer = document.createElement("button");
        footer.type = "button";
        footer.className = "saved-accounts-footer";
        footer.innerHTML = "<span aria-hidden=\"true\">◉</span> Manage saved logins";
        footer.addEventListener("click", event => {
            event.stopPropagation();
            openSavedLoginManager();
        });
        dropdown.appendChild(footer);
    }
    const shouldShow = show && accounts.length > 0;
    dropdown.classList.toggle("show", shouldShow);
    emailInput?.setAttribute("aria-expanded", String(shouldShow));
}

function renderSavedLoginManager(){
    const list = document.getElementById("manageSavedAccountsList");
    const clearButton = document.getElementById("clearAllSavedLogins");
    if(!list) return;
    const accounts = getRememberedAccounts();
    list.innerHTML = "";
    if(!accounts.length){
        list.innerHTML = "<div class=\"saved-manager-empty\"><span>🔐</span><strong>No saved logins</strong><p>Select Remember Me after a successful login to save an account on this browser.</p></div>";
    }
    accounts.forEach(account => {
        const row = document.createElement("article");
        row.className = "saved-manager-row";
        const roleLabel = account.role.charAt(0).toUpperCase() + account.role.slice(1);
        row.innerHTML = "<span class=\"saved-manager-avatar\">"+account.email.charAt(0).toUpperCase()+"</span><div><strong></strong><small>"+roleLabel+" account · password saved on this browser</small></div><button type=\"button\" class=\"saved-manager-use\">Use</button><button type=\"button\" class=\"saved-manager-delete\" aria-label=\"Remove saved login\">Remove</button>";
        row.querySelector("strong").textContent = account.email;
        row.querySelector(".saved-manager-use").addEventListener("click", () => {
            useRememberedAccount(account);
            closeSavedLoginManager();
        });
        row.querySelector(".saved-manager-delete").addEventListener("click", () => {
            removeRememberedAccount(account.email);
            renderSavedLoginManager();
            renderSavedAccountsDropdown(false);
        });
        list.appendChild(row);
    });
    if(clearButton) clearButton.disabled = accounts.length === 0;
    const count = document.getElementById("savedLoginCount");
    if(count) count.textContent = accounts.length + (accounts.length === 1 ? " account" : " accounts");
}

function openSavedLoginManager(){
    closeSavedAccountsDropdown();
    renderSavedLoginManager();
    document.getElementById("savedLoginsModal").style.display = "flex";
}

function closeSavedLoginManager(){
    document.getElementById("savedLoginsModal").style.display = "none";
}

function closeSavedAccountsDropdown(){
    document.getElementById("savedAccountsList")?.classList.remove("show");
    document.getElementById("login-email")?.setAttribute("aria-expanded", "false");
}

// The old standalone remembered email caused the admin address to keep returning.
localStorage.removeItem("rememberUser");
saveRememberedAccounts(getRememberedAccounts());

document.getElementById("closeSavedLogins").addEventListener("click", closeSavedLoginManager);
document.getElementById("doneSavedLogins").addEventListener("click", closeSavedLoginManager);
document.getElementById("clearAllSavedLogins").addEventListener("click", () => {
    if(!window.confirm("Remove every saved login from this browser?")) return;
    SavedLoginStore.clear(localStorage);
    renderSavedLoginManager();
    renderSavedAccountsDropdown(false);
});

document.getElementById("savedLoginsModal").addEventListener("click", event => {
    if(event.target === event.currentTarget) closeSavedLoginManager();
});

document.addEventListener("keydown", event => {
    const manager = document.getElementById("savedLoginsModal");
    if(event.key === "Escape" && manager.style.display === "flex") closeSavedLoginManager();
});

function clearLoginFields(){

    document.getElementById("login-email").value = "";
    document.getElementById("login-password").value = "";

}

loginBtn.onclick = () => {

    loginModal.style.display = "flex";
    clearLoginFields();
    document.getElementById("login-role").value = "";
    document.getElementById("remember-me").checked = false;
    document.getElementById("login-error").textContent = "";
    closeSavedAccountsDropdown();
    document.getElementById("login-email").readOnly = getRememberedAccounts().length > 0;

};

const loginEmailInput = document.getElementById("login-email");
loginEmailInput.addEventListener("click", event => {
    event.stopPropagation();
    if(getRememberedAccounts().length){
        loginEmailInput.readOnly = true;
        renderSavedAccountsDropdown(true);
    } else {
        loginEmailInput.readOnly = false;
    }
});
loginEmailInput.addEventListener("keydown", event => {
    if(event.key === "ArrowDown"){
        event.preventDefault();
        renderSavedAccountsDropdown(true);
        document.querySelector(".saved-account-item")?.focus();
    } else if(event.key === "Escape"){
        closeSavedAccountsDropdown();
    }
});
document.addEventListener("click", event => {
    const emailBox = document.querySelector(".email-box");
    if(emailBox && !emailBox.contains(event.target)){
        closeSavedAccountsDropdown();
    }
});



closeLogin.onclick = () => {

    loginModal.style.display = "none";
    closeSavedAccountsDropdown();

};






/* ===============================
        REGISTER MODAL
================================ */


const registerBtn = document.getElementById("registerBtn");

const registerModal = document.getElementById("registerModal");

const closeRegister = document.getElementById("closeRegister");



registerBtn.onclick = () => {

    registerModal.style.display = "flex";

};



closeRegister.onclick = () => {

    registerModal.style.display = "none";

};







/* ===============================
        OUTSIDE CLICK CLOSE
================================ */


window.onclick = (event)=>{


    if(event.target === loginModal){

        loginModal.style.display="none";
        closeSavedAccountsDropdown();

    }



    if(event.target === registerModal){

        registerModal.style.display="none";

    }



    if(event.target === forgotModal){

        closePasswordReset();

    }



};








/* ===============================
        LOGIN VALIDATION
================================ */


const loginFormButton = document.querySelector(".login-submit");

document.getElementById("login-form")?.addEventListener("submit", event => {
    event.preventDefault();
    loginFormButton.click();
});



loginFormButton.addEventListener("click", async ()=>{


    const email =
    document.getElementById("login-email").value.trim();



    const password =
    document.getElementById("login-password").value;



    const role =
    document.getElementById("login-role").value;



    const error =
    document.getElementById("login-error");




    if(email===""){


        error.innerHTML="Please enter email";

        return;

    }

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){

        error.innerHTML="Please enter a valid email address";

        return;

    }





    if(password===""){


        error.innerHTML="Please enter password";

        return;

    }




    if(password.length < 6){


        error.innerHTML="Password must contain minimum 6 characters";

        return;

    }





    if(role===""){


        error.innerHTML="Please select your role";

        return;

    }





    error.innerHTML="";


    loginFormButton.disabled = true;
    const originalLoginText = loginFormButton.innerHTML;
    loginFormButton.innerHTML = "Logging in...";


    try{

        const response = await fetch(API_BASE_URL + "/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: password })
        });

        const data = await response.json();

        if(!response.ok){

            error.innerHTML = data.detail || "Login failed. Please try again.";
            return;

        }

        if(data.user.role !== role){

            error.innerHTML =
                "This account is registered as \"" + data.user.role +
                "\", not \"" + role + "\". Please select the correct role.";
            return;

        }

        if(document.getElementById("remember-me").checked){
            upsertRememberedAccount(data.user.email || email, password, data.user.role);
        }

        saveSession(data.access_token, data.user);

        loginModal.style.display = "none";

        redirectToDashboard(data.user.role);

    } catch(err){

        console.error("Login error:", err);
        error.innerHTML = "Unable to reach the server. Please try again later.";

    } finally {

        loginFormButton.disabled = false;
        loginFormButton.innerHTML = originalLoginText;

    }


});








/* ===============================
        REGISTER VALIDATION
================================ */



const registerButton =
document.querySelector(".register-submit");




registerButton.addEventListener("click", async ()=>{


    const name =
    document.getElementById("register-name").value.trim();



    const email =
    document.getElementById("register-email").value.trim();



    const role =
    document.getElementById("register-role").value;



    const password =
    document.getElementById("register-password").value;



    const confirm =
    document.getElementById("confirm-password").value;




    const error =
    document.getElementById("register-error");





    if(name===""){


        error.innerHTML="Enter your name";

        return;

    }






    if(email===""){


        error.innerHTML="Enter your email";

        return;

    }






    if(role===""){


        error.innerHTML="Select your role";

        return;

    }






    if(password.length < 6){


        error.innerHTML=
        "Password must contain minimum 6 characters";


        return;

    }






    if(password!==confirm){


        error.innerHTML=
        "Passwords do not match";


        return;

    }




    error.innerHTML="";


    registerButton.disabled = true;
    const originalRegisterText = registerButton.innerHTML;
    registerButton.innerHTML = "Creating account...";


    try{

        const response = await fetch(API_BASE_URL + "/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                full_name: name,
                email: email,
                password: password,
                confirm_password: confirm,
                role: role
            })
        });

        const data = await response.json();

        if(!response.ok){

            error.innerHTML = data.detail || "Registration failed. Please try again.";
            return;

        }

        saveSession(data.access_token, data.user);

        registerModal.style.display = "none";

        redirectToDashboard(data.user.role);

    } catch(err){

        console.error("Registration error:", err);
        error.innerHTML = "Unable to reach the server. Please try again later.";

    } finally {

        registerButton.disabled = false;
        registerButton.innerHTML = originalRegisterText;

    }


});









/* ===============================
        PASSWORD SHOW/HIDE
================================ */



function togglePassword(id){


    const input =
    document.getElementById(id);



    if(input.type==="password"){


        input.type="text";


    }

    else{


        input.type="password";


    }



}









/* ===============================
        PASSWORD STRENGTH
================================ */


const registerPassword =
document.getElementById("register-password");




if(registerPassword){



registerPassword.addEventListener("input",()=>{


    let password =
    registerPassword.value;



    let strength =
    document.getElementById("strength");



    let text =
    document.getElementById("strength-text");



    let score=0;




    if(password.length>=8)
        score++;



    if(/[A-Z]/.test(password))
        score++;



    if(/[0-9]/.test(password))
        score++;



    if(/[!@#$%^&*]/.test(password))
        score++;





    if(score<=1){


        strength.style.width="25%";

        text.innerHTML="Weak Password";


    }


    else if(score<=3){


        strength.style.width="60%";

        text.innerHTML="Medium Password";


    }


    else{


        strength.style.width="100%";

        text.innerHTML="Strong Password";


    }



});



}








/* ===============================
        GOOGLE BUTTON
================================ */



const googleButtons =
document.querySelectorAll(".google-btn");



googleButtons.forEach(button=>{


    button.onclick=()=>{


        window.location.href = API_BASE_URL + "/auth/google";


    };


});









/* ===============================
        FORGOT PASSWORD
================================ */


const forgotLink =
document.getElementById("forgot-link");



const forgotModal =
document.getElementById("forgot-modal");



const forgotClose =
document.getElementById("forgot-close");

let resetEmail = "";
let resetToken = "";
let resetResendTimer = null;

function setResetStatus(message = "", type = ""){
    const statusBox = document.getElementById("reset-status");
    statusBox.textContent = message;
    statusBox.className = `reset-status${type ? ` ${type}` : ""}`;
}

function showResetStep(step){
    document.querySelectorAll("[data-reset-step]").forEach(panel => {
        const active = Number(panel.dataset.resetStep) === step;
        panel.hidden = !active;
        panel.classList.toggle("active", active);
    });
    document.querySelectorAll("[data-reset-progress]").forEach(item => {
        const itemStep = Number(item.dataset.resetProgress);
        item.classList.toggle("active", itemStep === step);
        item.classList.toggle("complete", itemStep < step);
    });
    setResetStatus();
}

function resetPasswordResetFlow(){
    resetEmail = "";
    resetToken = "";
    clearInterval(resetResendTimer);
    document.getElementById("reset-code").value = "";
    document.getElementById("reset-new-password").value = "";
    document.getElementById("reset-confirm-password").value = "";
    showResetStep(1);
}

function closePasswordReset(){
    forgotModal.style.display = "none";
    clearInterval(resetResendTimer);
}

function setButtonBusy(button, busy, busyText){
    if(!button.dataset.label) button.dataset.label = button.innerHTML;
    button.disabled = busy;
    button.innerHTML = busy ? `<span class="reset-spinner"></span>${busyText}` : button.dataset.label;
}

function apiErrorMessage(data, fallback){
    const detail = data && data.detail;
    if(Array.isArray(detail)) return detail[0]?.msg?.replace(/^Value error, /, "") || fallback;
    return typeof detail === "string" ? detail : fallback;
}

function startResetCountdown(seconds = 60){
    clearInterval(resetResendTimer);
    const resend = document.getElementById("resend-reset-code");
    const countdown = document.getElementById("reset-resend-countdown");
    let remaining = seconds;
    resend.disabled = true;
    resend.innerHTML = `Resend in <span id="reset-resend-countdown">${remaining}s</span>`;
    resetResendTimer = setInterval(() => {
        remaining -= 1;
        const currentCountdown = document.getElementById("reset-resend-countdown");
        if(currentCountdown) currentCountdown.textContent = `${remaining}s`;
        if(remaining <= 0){
            clearInterval(resetResendTimer);
            resend.disabled = false;
            resend.innerHTML = "Resend code";
        }
    }, 1000);
}

async function requestPasswordReset(isResend = false){
    const input = document.getElementById("reset-email");
    const button = isResend ? document.getElementById("resend-reset-code") : document.getElementById("reset-submit");
    const email = (isResend ? resetEmail : input.value).trim().toLowerCase();
    if(!email || (!isResend && !input.checkValidity())){
        setResetStatus("Enter a valid registered email address.", "error");
        input.focus();
        return;
    }
    setButtonBusy(button, true, isResend ? "Sending…" : "Sending code…");
    try{
        const response = await fetch(API_BASE_URL + "/password-reset/request", {
            method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email})
        });
        const data = await response.json().catch(() => ({}));
        if(!response.ok) throw new Error(apiErrorMessage(data, "Could not send the verification code."));
        resetEmail = email;
        document.getElementById("reset-email-display").textContent = email;
        showResetStep(2);
        setResetStatus(isResend ? "A new verification code was requested. Check your inbox." : data.message, "success");
        startResetCountdown();
        document.getElementById("reset-code").focus();
    } catch(error){
        setResetStatus(error.message, "error");
    } finally {
        setButtonBusy(button, false);
    }
}

forgotLink.onclick = event => {
    event.preventDefault();
    resetPasswordResetFlow();
    document.getElementById("reset-email").value = document.getElementById("login-email").value.trim();
    forgotModal.style.display = "flex";
    setTimeout(() => document.getElementById("reset-email").focus(), 50);
};

forgotClose.onclick = closePasswordReset;
document.getElementById("reset-submit").onclick = () => requestPasswordReset(false);
document.getElementById("reset-google-signin").onclick = () => {
    window.location.href = API_BASE_URL + "/auth/google";
};
document.getElementById("resend-reset-code").onclick = () => requestPasswordReset(true);
document.getElementById("reset-back-email").onclick = () => {
    clearInterval(resetResendTimer);
    showResetStep(1);
    document.getElementById("reset-email").focus();
};
document.getElementById("reset-code").addEventListener("input", event => {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6);
});
document.getElementById("verify-reset-code").onclick = async event => {
    const button = event.currentTarget;
    const code = document.getElementById("reset-code").value.trim();
    if(!/^\d{6}$/.test(code)){
        setResetStatus("Enter the complete six-digit verification code.", "error");
        return;
    }
    setButtonBusy(button, true, "Verifying…");
    try{
        const response = await fetch(API_BASE_URL + "/password-reset/verify", {
            method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email: resetEmail, code})
        });
        const data = await response.json().catch(() => ({}));
        if(!response.ok) throw new Error(apiErrorMessage(data, "The code is invalid or expired."));
        resetToken = data.reset_token;
        clearInterval(resetResendTimer);
        showResetStep(3);
        setResetStatus("Email verified. Create your new password.", "success");
        document.getElementById("reset-new-password").focus();
    } catch(error){
        setResetStatus(error.message, "error");
    } finally {
        setButtonBusy(button, false);
    }
};
document.getElementById("complete-password-reset").onclick = async event => {
    const button = event.currentTarget;
    const password = document.getElementById("reset-new-password").value;
    const confirmPassword = document.getElementById("reset-confirm-password").value;
    if(password.length < 6 || !/[A-Za-z]/.test(password) || !/\d/.test(password)){
        setResetStatus("Use at least six characters with one letter and one number.", "error");
        return;
    }
    if(password !== confirmPassword){
        setResetStatus("The two passwords do not match.", "error");
        return;
    }
    setButtonBusy(button, true, "Updating…");
    try{
        const response = await fetch(API_BASE_URL + "/password-reset/complete", {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email: resetEmail, reset_token: resetToken, password, confirm_password: confirmPassword})
        });
        const data = await response.json().catch(() => ({}));
        if(!response.ok) throw new Error(apiErrorMessage(data, "The password could not be updated."));
        removeRememberedAccount(resetEmail);
        renderSavedAccountsDropdown(false);
        document.getElementById("login-email").value = resetEmail;
        document.getElementById("login-password").value = "";
        document.getElementById("remember-me").checked = false;
        setResetStatus("Password updated successfully. You can now log in with it.", "success");
        button.innerHTML = "✓ Password updated";
        setTimeout(() => {
            closePasswordReset();
            loginModal.style.display = "flex";
            document.getElementById("login-password").focus();
        }, 1400);
    } catch(error){
        setResetStatus(error.message, "error");
        setButtonBusy(button, false);
    }
};









/* ===============================
        FAQ ACCORDION
================================ */


const faqButtons =
document.querySelectorAll(".faq-question");



faqButtons.forEach(button=>{


    button.onclick=()=>{


        const answer =
        button.nextElementSibling;



        answer.style.display =
        answer.style.display==="block"
        ?
        "none"
        :
        "block";



    };


});








/* ===============================
        COUNTER ANIMATION
================================ */


const counters =
document.querySelectorAll(".counter");



counters.forEach(counter=>{


    let target =
    Number(counter.dataset.target);



    let count=0;



    let interval =
    setInterval(()=>{


        count += Math.ceil(target/100);



        if(count>=target){


            counter.innerHTML=target;


            clearInterval(interval);


        }


        else{


            counter.innerHTML=count;


        }



    },20);



});









/* ===============================
        HERO BUTTON SCROLL
================================ */


document.getElementById("heroGetStarted")?.addEventListener("click", () => registerBtn.click());
document.getElementById("heroLearnMore")?.addEventListener("click", () => {
    document.querySelector("#how")?.scrollIntoView({ behavior: "smooth" });
});

document.getElementById("footerRegister")?.addEventListener("click", () => registerBtn.click());
document.getElementById("footerLogin")?.addEventListener("click", () => loginBtn.click());
document.getElementById("footerOpenLogin")?.addEventListener("click", () => loginBtn.click());
document.getElementById("footerYear").textContent = new Date().getFullYear();

const pageProgress = document.getElementById("pageProgress");
const updateHomepageProgress = () => {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    const progress = available > 0 ? Math.min(100, window.scrollY / available * 100) : 0;
    pageProgress.style.width = progress + "%";
    document.querySelector("header")?.classList.toggle("scrolled", window.scrollY > 24);
};
window.addEventListener("scroll", updateHomepageProgress, { passive: true });
updateHomepageProgress();

const homepageSections = [...document.querySelectorAll("body > section[id]")];
const navLinks = [...document.querySelectorAll(".nav-links a[href^='#']")];
if("IntersectionObserver" in window){
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if(entry.isIntersecting){
                entry.target.classList.add("section-visible");
                const active = navLinks.find(link => link.getAttribute("href") === "#" + entry.target.id);
                if(active){
                    navLinks.forEach(link => link.classList.remove("active"));
                    active.classList.add("active");
                }
            }
        });
    }, { threshold: 0.16, rootMargin: "-10% 0px -55%" });
    homepageSections.forEach(section => {
        section.classList.add("section-reveal");
        revealObserver.observe(section);
    });
}

const heroPreview = document.querySelector(".dashboard-card");
if(heroPreview && window.matchMedia("(pointer:fine)").matches){
    heroPreview.addEventListener("pointermove", event => {
        const box = heroPreview.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - .5;
        const y = (event.clientY - box.top) / box.height - .5;
        heroPreview.style.transform = `perspective(900px) rotateX(${-y * 3}deg) rotateY(${x * 4}deg) translateY(-3px)`;
    });
    heroPreview.addEventListener("pointerleave", () => {
        heroPreview.style.transform = "";
    });
}









/* ===============================
        CONTACT FORM
================================ */


const contactForm = document.getElementById("feedbackForm");



contactForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const button = contactForm.querySelector("button[type=submit]");
    const statusBox = document.getElementById("feedbackStatus");
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Submitting...";
    statusBox.className = "";
    statusBox.textContent = "";
    try {
        const ratingValue = document.getElementById("feedbackRating").value;
        const response = await fetch(API_BASE_URL + "/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: document.getElementById("feedbackName").value.trim(),
                email: document.getElementById("feedbackEmail").value.trim(),
                category: document.getElementById("feedbackCategory").value,
                rating: ratingValue ? Number(ratingValue) : null,
                message: document.getElementById("feedbackMessage").value.trim()
            })
        });
        const data = await response.json();
        if(!response.ok) throw new Error(data.detail || "Feedback could not be submitted.");
        statusBox.className = "success";
        statusBox.textContent = data.message;
        contactForm.reset();
    } catch(error) {
        statusBox.className = "error";
        statusBox.textContent = error.message || "Unable to reach the server. Please try again.";
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
});









window.onload=()=>{
    // Handle a return trip from Google OAuth (token/role/name in the URL)
    const handledGoogleRedirect = handleGoogleRedirectIfPresent();

    // If a valid session already exists, skip the landing page
    // (skip this when we just handled a Google redirect above, so we
    // don't fight with the role-selection modal / dashboard redirect)
    if (!handledGoogleRedirect) {
        redirectIfAlreadyLoggedIn();
    }


};
