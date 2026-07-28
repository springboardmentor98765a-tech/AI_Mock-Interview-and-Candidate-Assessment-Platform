/* ── Recruiter Sections ── */
function recruiterOverview() {
  return `<div class="space-y-6">
    <div><h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Recruiter Dashboard</h1><p class="text-white/40 text-sm mt-1">Q3 2025 hiring pipeline overview</p></div>
    <div class="grid grid-cols-4 gap-4">
      ${statCard(icon('users', 18), 'Total Candidates', '148', '+23', CYAN)}
      ${statCard(icon('checkCircle', 18), 'Shortlisted', '18', '+4', EMERALD)}
      ${statCard(icon('monitorPlay', 18), 'Active Sessions', '7', null, AMBER)}
      ${statCard(icon('award', 18), 'Avg. Score', '76%', '+3.1%', INDIGO)}
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Hiring Funnel</p>
        <div class="chart-container" style="height:200px"><canvas id="chart-funnel"></canvas></div>
      </div>
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Top Candidates</p>
        <div class="space-y-3">
          ${candidates.filter(function(c) { return c.status === 'Top Pick' || c.status === 'Shortlisted'; }).slice(0, 5).map(function(c) {
            return `<div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white" style="background:${CYAN}">${c.name[0]}</div>
              <div class="flex-1 min-w-0"><p class="text-white text-xs font-medium truncate">${c.name}</p><p class="text-white/35 text-xs truncate">${c.role}</p></div>
              <span class="text-white font-mono text-sm font-semibold">${c.score}%</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function recruiterCandidates() {
  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Candidates</h1>
      <button class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style="background:${CYAN}">${icon('filter', 14)} Filter</button>
    </div>
    <div class="rounded-xl border border-white/7 overflow-hidden" style="background:#0d0f1e">
      <table class="w-full text-xs"><thead><tr class="border-b border-white/6">
        ${['Candidate', 'Role', 'Score', 'Sessions', 'Trend', 'Status', 'Action'].map(function(h) { return `<th class="px-5 py-4 text-left text-white/35 font-medium">${h}</th>`; }).join('')}
      </tr></thead><tbody>
      ${candidates.map(function(c) {
        var sc = c.score >= 85 ? 'text-emerald-400' : c.score >= 75 ? 'text-amber-400' : 'text-white/60';
        var bc = c.status === 'Top Pick' ? 'emerald' : c.status === 'Shortlisted' ? 'cyan' : 'amber';
        return `<tr class="border-b border-white/4 hover:bg-white/2 transition-colors">
          <td class="px-5 py-3.5"><div class="flex items-center gap-2.5"><div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style="background:${CYAN}">${c.name[0]}</div><span class="text-white/80 font-medium">${c.name}</span></div></td>
          <td class="px-5 py-3.5 text-white/50">${c.role}</td>
          <td class="px-5 py-3.5"><span class="font-mono font-semibold ${sc}">${c.score}%</span></td>
          <td class="px-5 py-3.5 text-white/50 font-mono">${c.sessions}</td>
          <td class="px-5 py-3.5 text-emerald-400 font-mono text-xs">${c.trend}pts</td>
          <td class="px-5 py-3.5">${badge(c.status, bc)}</td>
          <td class="px-5 py-3.5"><button class="text-white/40 hover:text-cyan-400 transition-colors text-xs flex items-center gap-1">${icon('eye', 12)} View</button></td>
        </tr>`;
      }).join('')}
      </tbody></table>
    </div>
  </div>`;
}

function recruiterCompare() {
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Candidate Comparison</h1>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Top 3 Candidates &middot; Radar Comparison</p>
      <div class="chart-container" style="height:280px"><canvas id="chart-compare"></canvas></div>
      <div class="flex gap-6 mt-4 justify-center text-xs text-white/40">
        <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${CYAN}"></span>Aradhya Ray</span>
        <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${EMERALD}"></span>Amina Bello</span>
        <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${INDIGO}"></span>Ngozi Eze</span>
      </div>
    </div>
  </div>`;
}

function recruiterTemplates() {
  var templates = [
    { title: 'Senior Software Engineer', rounds: 4, questions: 32, type: 'Technical', color: INDIGO },
    { title: 'Product Manager', rounds: 3, questions: 24, type: 'HR + Behavioural', color: CYAN },
    { title: 'Data Science Intern', rounds: 2, questions: 18, type: 'Aptitude', color: EMERALD },
    { title: 'UX/UI Designer', rounds: 3, questions: 20, type: 'Portfolio + HR', color: AMBER },
  ];
  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Interview Templates</h1>
      <button class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style="background:${CYAN}">${icon('plusCircle', 14)} New Template</button>
    </div>
    <div class="grid grid-cols-2 gap-4">
      ${templates.map(function(t) {
        var bc = t.type === 'Technical' ? 'indigo' : t.type.includes('HR') ? 'cyan' : t.type === 'Aptitude' ? 'emerald' : 'amber';
        return `<div class="rounded-xl border border-white/7 p-5 hover:border-white/15 transition-all" style="background:#0d0f1e">
          <div class="flex items-start justify-between mb-3"><h3 class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">${t.title}</h3><button class="text-white/30 hover:text-white/60 transition-colors">${icon('moreVertical')}</button></div>
          <div class="flex gap-2 mb-4">${badge(t.type, bc)}</div>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="p-2.5 rounded-lg" style="background:#141627"><p class="text-white/35">Rounds</p><p class="text-white font-mono font-semibold mt-0.5">${t.rounds}</p></div>
            <div class="p-2.5 rounded-lg" style="background:#141627"><p class="text-white/35">Questions</p><p class="text-white font-mono font-semibold mt-0.5">${t.questions}</p></div>
          </div>
          <div class="mt-3 flex gap-2">
            <button class="flex-1 py-2 rounded-lg text-xs font-medium text-white/60 border border-white/8 hover:border-white/20 hover:text-white/80 transition-all flex items-center justify-center gap-1.5">${icon('edit2', 11)} Edit</button>
            <button class="flex-1 py-2 rounded-lg text-xs font-medium text-white flex items-center justify-center gap-1.5" style="background:${CYAN}">${icon('play', 11)} Use</button>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function recruiterSessions() {
  var live = [
    { candidate: 'Sai Abhi', role: 'Data Analyst', elapsed: '18:34', status: 'Live', score: 71 },
    { candidate: 'Kalyan Rai', role: 'Backend Engineer', elapsed: '07:12', status: 'Live', score: 64 },
    { candidate: 'Raju Verma', role: 'Product Manager', elapsed: '34:55', status: 'Reviewing', score: 80 },
  ];
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Live Sessions</h1>
    <div class="grid grid-cols-3 gap-4">
      ${live.map(function(s) {
        return `<div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
          <div class="flex items-center gap-2 mb-4">
            <span class="w-2 h-2 rounded-full ${s.status === 'Live' ? 'animate-pulse' : ''}" style="background:${s.status === 'Live' ? ROSE : AMBER}"></span>
            <span class="text-xs font-medium" style="color:${s.status === 'Live' ? ROSE : AMBER}">${s.status}</span>
          </div>
          <p class="text-white font-semibold mb-0.5" style="font-family:'Outfit',sans-serif">${s.candidate}</p>
          <p class="text-white/40 text-xs mb-4">${s.role}</p>
          <div class="grid grid-cols-2 gap-2 text-xs mb-4">
            <div class="p-2 rounded-lg" style="background:#141627"><p class="text-white/30">Elapsed</p><p class="text-white font-mono mt-0.5">${s.elapsed}</p></div>
            <div class="p-2 rounded-lg" style="background:#141627"><p class="text-white/30">Live Score</p><p class="text-white font-mono mt-0.5">${s.score}%</p></div>
          </div>
          <button class="w-full py-2 rounded-lg text-xs font-medium text-white flex items-center justify-center gap-1.5" style="background:${CYAN}">${icon('eye', 12)} Monitor</button>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
