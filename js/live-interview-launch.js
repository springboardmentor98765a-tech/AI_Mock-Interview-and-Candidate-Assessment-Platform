(() => {
  const token = localStorage.getItem("authToken");
  const role = localStorage.getItem("userRole");
  if (!token) { window.location.href = "../index.html"; return; }
  if (role && role !== "candidate") {
    window.location.href = role === "recruiter" ? "recruiter.html" : role === "admin" ? "admin.html" : "../index.html";
    return;
  }

  const setup = (() => {
    try { return JSON.parse(sessionStorage.getItem("smarthire.interviewSetup") || "{}"); }
    catch (_) { return {}; }
  })();

  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el && value) el.value = value;
  };

  setValue("jobRole", setup.jobRole || "Frontend Developer");
  setValue("interviewType", setup.interviewType || "technical");
  setValue("difficulty", setup.difficulty || "medium");
  setValue("domain", setup.jobRole || "software engineering");
  setValue("experienceLevel", "mid");

  window.smartHireInterviewDurationSeconds = Math.max(60, Number(setup.duration || 15) * 60);

  const savedTheme = localStorage.getItem("smarthire.theme");
  if (savedTheme === "dark") document.body.classList.add("dark-mode");
  if (savedTheme === "light") document.body.classList.remove("dark-mode");

  const rolePill = document.getElementById("liveRoomRolePill");
  if (rolePill) rolePill.textContent = setup.jobRole || "Frontend Developer";

  const notice = document.getElementById("liveRoomSetupNotice");
  if (notice) notice.style.display = "block";

  // The existing script.js owns the real interview/session/recording flow.
  // Trigger it only after its listener has been registered.
  window.setTimeout(() => {
    const launch = document.querySelector(".hidden-interview-launch .interview-details button");
    if (launch) {
      launch.click();
      if (notice) notice.style.display = "none";
      sessionStorage.removeItem("smarthire.interviewSetup");
    }
  }, 250);
})();