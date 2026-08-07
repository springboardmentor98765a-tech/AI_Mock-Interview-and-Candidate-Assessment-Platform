(() => {
    const API_BASE_URL = (window.smartHireApi && window.smartHireApi.baseUrl)
        ? window.smartHireApi.baseUrl
        : "http://localhost:8080";

    const loginFormSection = document.getElementById("loginFormSection");
    const registerFormSection = document.getElementById("registerFormSection");
    const showRegisterBtn = document.getElementById("showRegister");
    const showLoginBtn = document.getElementById("showLogin");
    const showRegisterTab = document.getElementById("showRegisterTab");
    const showLoginTab = document.getElementById("showLoginTab");
    const loginSubmit = document.getElementById("loginSubmit");
    const registerSubmit = document.getElementById("registerSubmit");
    const roleSelect = document.getElementById("roleSelect");
    const registerRoleSelect = document.getElementById("registerRoleSelect");
    const loginAuthMessage = document.getElementById("loginAuthMessage");
    const registerAuthMessage = document.getElementById("registerAuthMessage");
    const loginModal = document.getElementById("loginModal");
    const authContainer = document.getElementById("loginModal");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const forgotPasswordBtn = document.getElementById("forgotPassword");
    const loader = document.getElementById("loader");

    function showToast(message, type = "success") {
        const toast = document.getElementById("toast");
        if (!toast) return;

        toast.className = `toast ${type}`;
        toast.innerHTML = message;
        toast.style.display = "block";

        clearTimeout(showToast.timeoutId);
        showToast.timeoutId = setTimeout(() => {
            toast.style.display = "none";
        }, 3200);
    }

    function setMessage(msg, isError = false, target = loginAuthMessage) {
        if (!target) return;

        target.className = `auth-message ${isError ? "error" : "success"}`;
        target.textContent = msg;
    }

    function clearMessages() {
        if (loginAuthMessage) {
            loginAuthMessage.textContent = "";
            loginAuthMessage.className = "auth-message";
        }

        if (registerAuthMessage) {
            registerAuthMessage.textContent = "";
            registerAuthMessage.className = "auth-message";
        }

        document.querySelectorAll(".field-error").forEach((err) => {
            err.textContent = "";
        });
    }

    function toggleForms(showLogin) {
        clearMessages();

        if (loginFormSection) {
            loginFormSection.style.display = showLogin ? "block" : "none";
        }

        if (registerFormSection) {
            registerFormSection.style.display = showLogin ? "none" : "block";
        }

        if (showLoginTab) {
            showLoginTab.classList.toggle("active", showLogin);
        }

        if (showRegisterTab) {
            showRegisterTab.classList.toggle("active", !showLogin);
        }

        if (authContainer) {
            authContainer.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    }

    function setLoading(button, loading, text) {
        if (!button) return;

        button.disabled = loading;
        const label = button.querySelector(".btn-label");

        if (label) {
            label.textContent = loading ? "Loading..." : text;
        } else {
            button.innerHTML = loading ? "Loading..." : text;
        }

        if (loader) {
            loader.style.display = loading ? "flex" : "none";
        }
    }

    function setFieldError(fieldId, message) {
        const errorEl = document.querySelector(`[data-error-for="${fieldId}"]`);
        if (errorEl) {
            errorEl.textContent = message;
        }
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validateLoginForm() {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const role = roleSelect ? roleSelect.value : "";
        let valid = true;

        setFieldError("email", "");
        setFieldError("password", "");
        setFieldError("roleSelect", "");

        if (!email) {
            setFieldError("email", "Email is required");
            valid = false;
        } else if (!validateEmail(email)) {
            setFieldError("email", "Please enter a valid email");
            valid = false;
        }

        if (!password) {
            setFieldError("password", "Password is required");
            valid = false;
        }

        if (!role) {
            setFieldError("roleSelect", "Please select a role");
            valid = false;
        }

        return valid;
    }

    function validateRegisterForm() {
        const name = document.getElementById("registerName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value;
        const confirmPassword = document.getElementById("registerConfirmPassword").value;
        const role = registerRoleSelect ? registerRoleSelect.value : "";
        let valid = true;

        setFieldError("registerName", "");
        setFieldError("registerEmail", "");
        setFieldError("registerPassword", "");
        setFieldError("registerConfirmPassword", "");
        setFieldError("registerRoleSelect", "");

        if (!name) {
            setFieldError("registerName", "Full name is required");
            valid = false;
        }

        if (!email) {
            setFieldError("registerEmail", "Email is required");
            valid = false;
        } else if (!validateEmail(email)) {
            setFieldError("registerEmail", "Please enter a valid email");
            valid = false;
        }

        if (!password) {
            setFieldError("registerPassword", "Password is required");
            valid = false;
        } else if (password.length < 6) {
            setFieldError("registerPassword", "Password must be at least 6 characters");
            valid = false;
        }

        if (!confirmPassword) {
            setFieldError("registerConfirmPassword", "Please confirm your password");
            valid = false;
        } else if (password !== confirmPassword) {
            setFieldError("registerConfirmPassword", "Passwords do not match");
            valid = false;
        }

        if (!role) {
            setFieldError("registerRoleSelect", "Please select a role");
            valid = false;
        }

        return valid;
    }

    async function apiRequest(url, body) {
        if (window.smartHireApi && typeof window.smartHireApi.requestJson === "function") {
            return window.smartHireApi.requestJson(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                retries: 1
            });
        }

        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        let data = {};

        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok) {
            throw new Error(data.message || "Authentication request failed");
        }

        return data;
    }

    function saveUser(token, role, email, name, userId) {
        localStorage.setItem("authToken", token || "");
        localStorage.setItem("userRole", role || "");
        localStorage.setItem("userEmail", email || "");
        localStorage.setItem("userName", name || "User");
        if (userId !== undefined && userId !== null) {
            localStorage.setItem("userId", String(userId));
        }
    }

    function clearUser() {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userName");
    }

    function redirectToDashboard(role) {
        const normalizedRole = (role || "").toLowerCase();

        if (!normalizedRole || window.location.pathname.includes("/pages/")) {
            return;
        }

        switch (normalizedRole) {
            case "candidate":
                window.location.href = "pages/candidate.html";
                break;
            case "recruiter":
                window.location.href = "pages/recruiter.html";
                break;
            case "admin":
                window.location.href = "pages/admin.html";
                break;
            default:
                showToast("Invalid role selected", "error");
        }
    }

    async function handleLogin(event) {
        event.preventDefault();

        if (!validateLoginForm()) {
            showToast("Please fix the highlighted fields", "error");
            return;
        }

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const selectedRole = roleSelect ? roleSelect.value : "";

        setLoading(loginSubmit, true, "Login");

        try {
            const result = await apiRequest("/api/auth/login", {
                email,
                password
            });

            const token = result.token || result.jwt || result.jwtToken || result.accessToken;
            const role = (result.role || selectedRole || "").toLowerCase();
            const name = result.name || email.split("@")[0];
            const userId = result.userId;

            if (!token) {
                throw new Error("Invalid Credentials");
            }

            saveUser(token, role, email, name, userId);
            setMessage("Login successful", false, loginAuthMessage);
            showToast("✔ Login Successful", "success");

            setTimeout(() => {
                if (loginModal) {
                    loginModal.style.display = "none";
                }
                redirectToDashboard(role);
            }, 800);
        } catch (error) {
            setMessage("Invalid Credentials", true, loginAuthMessage);
            showToast("Invalid Credentials", "error");
        } finally {
            setLoading(loginSubmit, false, "Login");
        }
    }

    async function handleRegister(event) {
        event.preventDefault();

        if (!validateRegisterForm()) {
            showToast("Please fix the highlighted fields", "error");
            return;
        }

        const name = document.getElementById("registerName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value;
        const role = registerRoleSelect ? registerRoleSelect.value : "";

        setLoading(registerSubmit, true, "Create Account");

        try {
            await apiRequest("/api/auth/register", {
                name,
                email,
                password,
                role
            });

            setMessage("Registration successful. You can now log in.", false, registerAuthMessage);
            showToast("✔ Registration Successful", "success");
            toggleForms(true);

            if (document.getElementById("email")) {
                document.getElementById("email").value = email;
            }
        } catch (error) {
            setMessage("Registration failed", true, registerAuthMessage);
            showToast("Registration failed", "error");
        } finally {
            setLoading(registerSubmit, false, "Create Account");
        }
    }

    function handleForgotPassword() {
        showToast("Forgot password flow will be available soon", "error");
    }

    function attachPasswordToggles() {
        document.querySelectorAll(".password-toggle").forEach((button) => {
            button.addEventListener("click", () => {
                const targetId = button.getAttribute("data-target");
                const input = document.getElementById(targetId);
                if (!input) return;

                const isPassword = input.type === "password";
                input.type = isPassword ? "text" : "password";
                const icon = button.querySelector("i");
                if (icon) {
                    icon.className = isPassword ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
                }
            });
        });
    }

    function bindLogoutHandlers() {
        document.querySelectorAll("li, button, a").forEach((element) => {
            const text = (element.textContent || "").trim().toLowerCase();
            if (text.includes("logout")) {
                element.addEventListener("click", (event) => {
                    event.preventDefault();
                    clearUser();
                    window.location.href = "../index.html";
                });
            }
        });
    }

    function initAuthFlow() {
        clearMessages();
        attachPasswordToggles();
        bindLogoutHandlers();

        if (loginForm) {
            loginForm.addEventListener("submit", handleLogin);
        }

        if (registerForm) {
            registerForm.addEventListener("submit", handleRegister);
        }

        if (showRegisterBtn) {
            showRegisterBtn.addEventListener("click", () => toggleForms(false));
        }

        if (showLoginBtn) {
            showLoginBtn.addEventListener("click", () => toggleForms(true));
        }

        if (showRegisterTab) {
            showRegisterTab.addEventListener("click", () => toggleForms(false));
        }

        if (showLoginTab) {
            showLoginTab.addEventListener("click", () => toggleForms(true));
        }

        if (forgotPasswordBtn) {
            forgotPasswordBtn.addEventListener("click", handleForgotPassword);
        }

        ["email", "password", "roleSelect"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("input", () => {
                    if (loginFormSection && loginFormSection.style.display !== "none") {
                        validateLoginForm();
                    }
                });
            }
        });

        ["registerName", "registerEmail", "registerPassword", "registerConfirmPassword", "registerRoleSelect"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("input", () => {
                    if (registerFormSection && registerFormSection.style.display !== "none") {
                        validateRegisterForm();
                    }
                });
            }
        });

        const path = window.location.pathname.toLowerCase();

        if (path.includes("/pages/")) {
            const token = localStorage.getItem("authToken");
            if (!token) {
                window.location.href = "../index.html";
                return;
            }
        } else if (path.endsWith("/index.html") || path === "/" || path.endsWith("/")) {
            if (!localStorage.getItem("authToken") && loginModal) {
                loginModal.style.display = "flex";
            }
        }
    }

    window.SmartHireAuth = {
        showToast,
        saveUser,
        clearUser,
        redirectToDashboard,
        toggleForms,
        initAuthFlow
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAuthFlow);
    } else {
        initAuthFlow();
    }
})();