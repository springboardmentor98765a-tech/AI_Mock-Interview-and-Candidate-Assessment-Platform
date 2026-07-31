// 1. Login Function
function loginUser() {
    const roleSelect = document.getElementById("role");
    const selectedRole = roleSelect ? roleSelect.value : "";

    if (!selectedRole) {
        alert("Kripya koi ek Role select karein!");
        return;
    }

    // Role ko session / localStorage me save karein
    localStorage.setItem("userRole", selectedRole);

    // Dynamic Redirect logic
    window.location.href = `${selectedRole}.html`;
}

// 2. Check Access Protection on Dashboards
function protectRoute(requiredRole) {
    const currentRole = localStorage.getItem("userRole");

    if (!currentRole) {
        alert("Pehle Login karein!");
        window.location.href = "login.html";
    } else if (currentRole !== requiredRole) {
        alert(`Access Denied! Aapka role (${currentRole}) is page ke liye valid nahi hai.`);
        window.location.href = `${currentRole}.html`;
    }
}

// 3. Logout Function
function logoutUser() {
    localStorage.removeItem("userRole");
    window.location.href = "login.html";
}