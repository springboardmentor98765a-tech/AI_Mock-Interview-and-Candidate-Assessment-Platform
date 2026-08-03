(() => {
    const loginFormSection = document.getElementById("loginFormSection");
    const registerFormSection = document.getElementById("registerFormSection");
    const showRegisterBtn = document.getElementById("showRegister");
    const showLoginBtn = document.getElementById("showLogin");
    const loginSubmit = document.getElementById("loginSubmit");
    const registerSubmit = document.getElementById("registerSubmit");
    const roleSelect = document.getElementById("roleSelect");
    const registerRoleSelect = document.getElementById("registerRoleSelect");
    const loginAuthMessage = document.getElementById("loginAuthMessage");
    const registerAuthMessage = document.getElementById("registerAuthMessage");
    const loginModal = document.getElementById("loginModal");

    function showToastMessage(message) {
        if(typeof window.showToast === "function"){
            window.showToast(message);
            return;
        }

        const toast = document.getElementById("toast");

        if(!toast){
            return;
        }

        toast.innerHTML = message;
        toast.style.display = "block";

        setTimeout(() => {
            toast.style.display = "none";
        }, 3000);
    }

    function showAuthMessage(message, isError = false, target = loginAuthMessage) {
        if(!target){
            return;
        }

        target.textContent = message;
        target.style.display = "block";
        target.style.color = isError ? "#dc2626" : "#16a34a";
    }

    function clearAuthMessages() {
        if(loginAuthMessage){
            loginAuthMessage.style.display = "none";
            loginAuthMessage.textContent = "";
        }

        if(registerAuthMessage){
            registerAuthMessage.style.display = "none";
            registerAuthMessage.textContent = "";
        }
    }

    function setAuthButtonState(button, isLoading, label) {
        if(!button){
            return;
        }

        button.disabled = isLoading;
        button.textContent = isLoading ? "Please wait..." : label;
    }

    function getApiBaseUrl() {
        return ["http://localhost:8080", "http://127.0.0.1:8080"];
    }

    async function sendAuthRequest(endpoint, payload) {
        const baseUrls = getApiBaseUrl();
        let lastError = null;

        for(const baseUrl of baseUrls){
            try{
                const response = await fetch(`${baseUrl}${endpoint}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    mode: "cors",
                    body: JSON.stringify(payload)
                });

                const data = await response.json().catch(() => ({}));

                if(!response.ok){
                    throw new Error(data.message || data.error || "Request failed");
                }

                return data;
            }catch(error){
                lastError = error;
            }
        }

        throw lastError || new Error("Unable to reach backend. Make sure Spring Boot is running on localhost:8080.");
    }

    function storeAuthData(token, role, email) {
        localStorage.setItem("authToken", token);
        localStorage.setItem("userRole", role);

        if(email){
            localStorage.setItem("userEmail", email);
        }
    }

    function routeToDashboard(role) {
        if(role === "candidate"){
            window.location.href = "pages/candidate.html";
        }else if(role === "recruiter"){
            window.location.href = "pages/recruiter.html";
        }else if(role === "admin"){
            window.location.href = "pages/admin.html";
        }
    }

    function toggleAuthForms(showLogin) {
        clearAuthMessages();

        if(loginFormSection){
            loginFormSection.style.display = showLogin ? "block" : "none";
        }

        if(registerFormSection){
            registerFormSection.style.display = showLogin ? "none" : "block";
        }
    }

    async function handleLoginSubmit(event) {
        if(event){
            event.preventDefault();
        }

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const selectedRole = roleSelect ? roleSelect.value : "";

        if(!email || !password){
            showAuthMessage("Please enter your email and password.", true, loginAuthMessage);
            return;
        }

        if(!selectedRole){
            showAuthMessage("Please select your role.", true, loginAuthMessage);
            return;
        }

        setAuthButtonState(loginSubmit, true, "Login");
        showAuthMessage("Signing in...", false, loginAuthMessage);

        try{
            const data = await sendAuthRequest("/api/auth/login", {
                email,
                username: email,
                password,
                role: selectedRole
            });

            const token = data.token || data.accessToken || data.jwt || data.jwtToken;

            if(!token){
                throw new Error("No token was returned by the backend.");
            }

            storeAuthData(token, selectedRole, email);
            showToastMessage("✅ Login Successful!");
            showAuthMessage("Login successful. Redirecting...", false, loginAuthMessage);

            setTimeout(() => {
                if(loginModal){
                    loginModal.style.display = "none";
                }
                routeToDashboard(selectedRole);
            }, 800);
        }catch(error){
            const message = error.message.includes("Failed to fetch")
                ? "Unable to reach the backend. Please make sure the Spring Boot server is running and CORS is enabled."
                : error.message;

            showAuthMessage(message, true, loginAuthMessage);
        }finally{
            setAuthButtonState(loginSubmit, false, "Login");
        }
    }

    async function handleRegisterSubmit(event) {
        if(event){
            event.preventDefault();
        }

        const name = document.getElementById("registerName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value;
        const selectedRole = registerRoleSelect ? registerRoleSelect.value : "";

        if(!name || !email || !password){
            showAuthMessage("Please fill in your full name, email and password.", true, registerAuthMessage);
            return;
        }

        if(!selectedRole){
            showAuthMessage("Please select your role.", true, registerAuthMessage);
            return;
        }

        setAuthButtonState(registerSubmit, true, "Register");
        showAuthMessage("Creating your account...", false, registerAuthMessage);

        try{
            await sendAuthRequest("/api/auth/register", {
                name,
                username: email,
                email,
                password,
                role: selectedRole
            });

            showToastMessage("✅ Account created successfully!");
            showAuthMessage("Account created successfully. You can now log in.", false, registerAuthMessage);

            if(document.getElementById("email")){
                document.getElementById("email").value = email;
            }

            if(roleSelect){
                roleSelect.value = selectedRole;
            }

            setTimeout(() => toggleAuthForms(true), 800);
        }catch(error){
            const message = error.message.includes("Failed to fetch")
                ? "Unable to reach the backend. Please make sure the Spring Boot server is running and CORS is enabled."
                : error.message;

            showAuthMessage(message, true, registerAuthMessage);
        }finally{
            setAuthButtonState(registerSubmit, false, "Register");
        }
    }

    function bindOnce(element, eventName, handler) {
        if(!element || element.dataset.authBound === "true"){
            return;
        }

        element.addEventListener(eventName, handler);
        element.dataset.authBound = "true";
    }

    bindOnce(loginSubmit, "click", handleLoginSubmit);
    bindOnce(registerSubmit, "click", handleRegisterSubmit);

    if(showRegisterBtn){
        bindOnce(showRegisterBtn, "click", () => toggleAuthForms(false));
    }

    if(showLoginBtn){
        bindOnce(showLoginBtn, "click", () => toggleAuthForms(true));
    }

    if(roleSelect){
        const savedRole = localStorage.getItem("userRole");
        if(savedRole){
            roleSelect.value = savedRole;
        }
    }

    if(registerRoleSelect){
        const savedRole = localStorage.getItem("userRole");
        if(savedRole){
            registerRoleSelect.value = savedRole;
        }
    }

    window.addEventListener("load", () => {
        const savedToken = localStorage.getItem("authToken");
        const savedRole = localStorage.getItem("userRole");
        const isLandingPage = window.location.pathname === "/" || window.location.pathname.endsWith("/index.html");

        if(savedToken && savedRole && isLandingPage){
            routeToDashboard(savedRole);
        }
    });
})();

if(showRegisterBtn){
    showRegisterBtn.addEventListener("click", () => toggleAuthForms(false));
}

if(showLoginBtn){
    showLoginBtn.addEventListener("click", () => toggleAuthForms(true));
}

if(roleSelect){
    const savedRole = localStorage.getItem("userRole");
    if(savedRole){
        roleSelect.value = savedRole;
    }
}

if(registerRoleSelect){
    const savedRole = localStorage.getItem("userRole");
    if(savedRole){
        registerRoleSelect.value = savedRole;
    }
}

window.addEventListener("load", () => {

    const savedToken = localStorage.getItem("authToken");
    const savedRole = localStorage.getItem("userRole");
    const isLandingPage = window.location.pathname === "/" || window.location.pathname.endsWith("/index.html");

    if(savedToken && savedRole && isLandingPage){
        routeToDashboard(savedRole);
    }

});
