(() => {
  const token = localStorage.getItem("authToken");
  const role = localStorage.getItem("userRole");
  if (!token) { window.location.href = "../index.html"; return; }
  if (role && role !== "candidate") {
    window.location.href = role === "recruiter" ? "recruiter.html" : role === "admin" ? "admin.html" : "../index.html";
    return;
  }
  const name = localStorage.getItem("userName") || "Candidate";
  const nameEl = document.getElementById("setupUserName"); if (nameEl) nameEl.textContent = name;
  // Theme is controlled globally by ../js/smarthire-theme.js.

  const error=document.getElementById("setupError"); const enter=document.getElementById("enterInterviewRoomBtn");
  const getConfig=()=>({
    jobRole:document.getElementById("setupJobRole")?.value.trim()||"Frontend Developer",
    type:document.getElementById("setupInterviewType")?.value||"technical",
    difficulty:document.getElementById("setupDifficulty")?.value||"medium",
    duration:document.getElementById("setupDuration")?.value||"15",
    resume:document.getElementById("setupResume")?.files?.[0]||null
  });
  const label={technical:"Technical",hr:"HR / Behavioral",behavioral:"Behavioral",aptitude:"Aptitude Assessment",mixed:"Job Ready / Mixed",resume:"Resume Based",coding:"Coding Practice"};
  enter?.addEventListener("click",()=>{
    const c=getConfig();
    if(!c.jobRole){
      if (error) { error.style.display="block"; error.textContent="Please enter a target job role."; }
      return;
    }
    const setBlueprint = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    setBlueprint("bpRole", c.jobRole);
    setBlueprint("bpType", label[c.type] || c.type);
    setBlueprint("bpDifficulty", c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1));
    setBlueprint("bpDuration", c.duration + " minutes");
    setBlueprint("bpResume", c.resume?.name || "Not attached");
    window.smartHireModal?.open("interviewBlueprintModal");
  });
  document.getElementById("confirmEnterInterview")?.addEventListener("click",()=>{
    const c=getConfig(); sessionStorage.setItem("smarthire.interviewSetup",JSON.stringify({jobRole:c.jobRole,interviewType:c.type,difficulty:c.difficulty,duration:c.duration,resumeName:c.resume?.name||""}));
    window.smartHireModal?.close("interviewBlueprintModal"); window.smartHireModal?.open("deviceCheckModal");
  });
  document.getElementById("continueToLiveRoom")?.addEventListener("click",()=>{window.smartHireModal?.close("deviceCheckModal");window.location.href="live-interview.html";});
})();
