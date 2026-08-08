
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

    const raw = localStorage.getItem("rememberedCredentialsList");

    if(!raw) return [];

    try{

        const list = JSON.parse(raw);
        return Array.isArray(list) ? list : [];

    } catch(err){

        return [];

    }

}

function saveRememberedAccounts(list){

    localStorage.setItem("rememberedCredentialsList", JSON.stringify(list));

}

function upsertRememberedAccount(email, password){

    const list = getRememberedAccounts();
    const existingIndex = list.findIndex(acc => acc.email === email);

    if(existingIndex > -1){
        list[existingIndex].password = password;
    } else {
        list.push({ email: email, password: password });
    }

    saveRememberedAccounts(list);

}

function removeRememberedAccount(email){

    const list = getRememberedAccounts().filter(acc => acc.email !== email);
    saveRememberedAccounts(list);

}

function clearLoginFields(){

    document.getElementById("login-email").value = "";
    document.getElementById("login-password").value = "";

}

function fillLoginFields(email, password){

    // Always clear first so nothing from a previous selection lingers
    clearLoginFields();

    document.getElementById("login-email").value = email;
    document.getElementById("login-password").value = password;
    document.getElementById("remember-me").checked = true;

}

function renderSavedAccountsDropdown(){

    const dropdown = document.getElementById("savedAccountsList");

    if(!dropdown) return;

    const accounts = getRememberedAccounts();

    dropdown.innerHTML = "";

    if(accounts.length === 0){
        dropdown.classList.remove("show");
        return;
    }

    accounts.forEach(acc => {

        const item = document.createElement("div");
        item.className = "saved-account-item";

        const icon = document.createElement("div");
        icon.className = "saved-account-icon";
        icon.textContent = "\ud83d\udd11";

        const textWrap = document.createElement("div");
        textWrap.className = "saved-account-text";

        const emailLine = document.createElement("div");
        emailLine.className = "saved-account-email";
        emailLine.textContent = acc.email;

        const passwordLine = document.createElement("div");
        passwordLine.className = "saved-account-hint";
        // Masked, like a browser's own saved-password list -
        // the real value still fills the field on click.
        passwordLine.textContent = "\u2022".repeat(Math.min(acc.password.length, 10));

        textWrap.appendChild(emailLine);
        textWrap.appendChild(passwordLine);

        const removeBtn = document.createElement("div");
        removeBtn.className = "saved-account-remove";
        removeBtn.textContent = "\u00d7";
        removeBtn.title = "Remove this saved account";

        item.appendChild(icon);
        item.appendChild(textWrap);
        item.appendChild(removeBtn);

        item.addEventListener("click", (e) => {

            if(e.target === removeBtn){

                e.stopPropagation();
                removeRememberedAccount(acc.email);
                renderSavedAccountsDropdown();
                return;

            }

            fillLoginFields(acc.email, acc.password);

            dropdown.classList.remove("show");

        });

        dropdown.appendChild(item);

    });

    dropdown.classList.add("show");

}

loginBtn.onclick = () => {

    loginModal.style.display = "flex";
    clearLoginFields();
    document.getElementById("remember-me").checked = false;
    renderSavedAccountsDropdown();

};

document.getElementById("login-email").addEventListener("click", () => {

    renderSavedAccountsDropdown();

});

document.addEventListener("click", (e) => {

    const emailBox = document.querySelector(".email-box");
    const dropdown = document.getElementById("savedAccountsList");

    if(dropdown && emailBox && !emailBox.contains(e.target)){
        dropdown.classList.remove("show");
    }

});



closeLogin.onclick = () => {

    loginModal.style.display = "none";

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

    }



    if(event.target === registerModal){

        registerModal.style.display="none";

    }



    if(event.target === forgotModal){

        forgotModal.style.display="none";

    }



};








/* ===============================
        LOGIN VALIDATION
================================ */


const loginFormButton = document.querySelector(".login-submit");



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

            localStorage.setItem("rememberUser", email);
            upsertRememberedAccount(email, password);

        } else {

            localStorage.removeItem("rememberUser");
            removeRememberedAccount(email);

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




forgotLink.onclick=(e)=>{


    e.preventDefault();



    forgotModal.style.display="flex";


};




forgotClose.onclick=()=>{


    forgotModal.style.display="none";


};






document
.getElementById("reset-submit")
.onclick=()=>{


    let email =
    document.getElementById("reset-email").value;



    if(email===""){


        alert("Enter your email");


        return;


    }



    alert(
    "Verification code sent to your email"
    );



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


document
.querySelectorAll(".hero-buttons button")
.forEach(button=>{


button.onclick=()=>{


    document
    .querySelector("#features")
    .scrollIntoView({

        behavior:"smooth"

    });



};



});









/* ===============================
        CONTACT FORM
================================ */


const contactForm =
document.querySelector(".contact-form");



contactForm.addEventListener("submit",(e)=>{


    e.preventDefault();



    alert(
    "Message Sent Successfully!"
    );



    contactForm.reset();



});









/* ===============================
        REMEMBER USER
================================ */


window.onload=()=>{


    const user =
    localStorage.getItem("rememberUser");



    if(user){


        console.log(
        "Remembered user:",
        user
        );


    }


    // Handle a return trip from Google OAuth (token/role/name in the URL)
    const handledGoogleRedirect = handleGoogleRedirectIfPresent();

    // If a valid session already exists, skip the landing page
    // (skip this when we just handled a Google redirect above, so we
    // don't fight with the role-selection modal / dashboard redirect)
    if (!handledGoogleRedirect) {
        redirectIfAlreadyLoggedIn();
    }


};