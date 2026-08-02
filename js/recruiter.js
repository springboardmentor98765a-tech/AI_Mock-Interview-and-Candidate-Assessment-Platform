/* ── Recruiter Sections ── */
function recruiterOverview() {
  return `<div class="space-y-6">
    <div><h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Recruiter Dashboard</h1><p class="text-white/40 text-sm mt-1">Welcome to your recruitment overview.</p></div>
    <div class="grid grid-cols-4 gap-4">
      ${statCard(icon('users', 18), 'Total Candidates', '0', null, CYAN)}
      ${statCard(icon('checkCircle', 18), 'Shortlisted', '0', null, EMERALD)}
      ${statCard(icon('monitorPlay', 18), 'Active Sessions', '0', null, AMBER)}
      ${statCard(icon('award', 18), 'Avg. Score', '—', null, INDIGO)}
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Hiring Funnel</p>
        <div class="flex flex-col items-center justify-center h-40 text-center">
          <p class="text-white/30 text-sm">No hiring data yet.</p>
        </div>
      </div>
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Top Candidates</p>
        <div class="flex flex-col items-center justify-center h-40 text-center">
          <p class="text-white/30 text-sm">No candidates yet.</p>
        </div>
      </div>
    </div>
  </div>`;
}

function recruiterCandidates() {
  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Candidates</h1>
    </div>
    <div class="rounded-xl border border-white/7 overflow-hidden" style="background:#0d0f1e">
      <table class="w-full text-xs"><thead><tr class="border-b border-white/6">
        ${['Candidate', 'Role', 'Score', 'Sessions', 'Trend', 'Status', 'Action'].map(function(h) { return `<th class="px-5 py-4 text-left text-white/35 font-medium">${h}</th>`; }).join('')}
      </tr></thead><tbody>
      <tr><td colspan="7" class="px-5 py-10 text-center text-white/30 text-sm">No candidates registered yet.</td></tr>
      </tbody></table>
    </div>
  </div>`;
}

function recruiterCompare() {
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Candidate Comparison</h1>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Candidate Comparison</p>
      <div class="flex flex-col items-center justify-center h-60 text-center">
        <p class="text-white/30 text-sm">No candidate data available for comparison.</p>
      </div>
    </div>
  </div>`;
}

function recruiterTemplates() {
  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Interview Templates</h1>
      <button class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style="background:${CYAN}">${icon('plusCircle', 14)} New Template</button>
    </div>
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <p class="text-white/30 text-sm">No templates created yet. Click "New Template" to create one.</p>
    </div>
  </div>`;
}

function recruiterSessions() {
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Live Sessions</h1>
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <p class="text-white/30 text-sm">No active sessions. Sessions will appear here when candidates start interviews.</p>
    </div>
  </div>`;
}
