/* ── Admin Sections ── */
function adminOverview() {
  return `<div class="space-y-6">
    <div><h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Admin Overview</h1><p class="text-white/40 text-sm mt-1">Platform-wide metrics &middot; July 2025</p></div>
    <div class="grid grid-cols-4 gap-4">
      ${statCard(icon('users', 18), 'Total Users', '2,481', '+148', EMERALD)}
      ${statCard(icon('briefcase', 18), 'Recruiters', '84', '+12', CYAN)}
      ${statCard(icon('monitorPlay', 18), 'Sessions This Month', '4,110', '+23%', INDIGO)}
      ${statCard(icon('globe', 18), 'System Uptime', '99.97%', null, EMERALD)}
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <div class="flex items-center justify-between mb-4">
          <p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Platform Growth</p>
          <div class="flex gap-4 text-xs text-white/40">
            <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${EMERALD}"></span>Users</span>
            <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${INDIGO}"></span>Sessions</span>
            <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${CYAN}"></span>Reports</span>
          </div>
        </div>
        <div class="chart-container" style="height:200px"><canvas id="chart-growth"></canvas></div>
      </div>
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">System Health</p>
        <div class="space-y-3">
          ${[
            { label: 'API Response', value: '142ms', status: 'Healthy', color: EMERALD },
            { label: 'AI Model Latency', value: '380ms', status: 'Healthy', color: EMERALD },
            { label: 'Database Load', value: '34%', status: 'Healthy', color: EMERALD },
            { label: 'Storage Used', value: '61%', status: 'Warning', color: AMBER },
            { label: 'Active Connections', value: '1,247', status: 'Healthy', color: EMERALD },
          ].map(function(s) {
            return `<div class="flex items-center justify-between"><div><p class="text-white/60 text-xs">${s.label}</p><p class="text-white font-mono text-sm font-medium">${s.value}</p></div>${badge(s.status, s.status === 'Healthy' ? 'emerald' : 'amber')}</div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function adminUsers() {
  var users = [
    { name: 'Aradhya Ray', email: 'aradhya@example.com', role: 'Candidate', joined: 'Jun 3, 2025', status: 'Active', sessions: 7 },
    { name: 'Ravi Verma', email: 'ravi@corp.com', role: 'Recruiter', joined: 'May 15, 2025', status: 'Active', sessions: 0 },
    { name: 'Raju Verma', email: 'raju@example.com', role: 'Candidate', joined: 'Jul 1, 2025', status: 'Active', sessions: 8 },
    { name: 'Sai Abhi', email: 'abhi@example.com', role: 'Candidate', joined: 'Jun 28, 2025', status: 'Suspended', sessions: 4 },
    { name: 'Tech Recruits Ltd', email: 'hr@techrecruit.ng', role: 'Recruiter', joined: 'Apr 10, 2025', status: 'Active', sessions: 0 },
    { name: 'Arman Malik', email: 'arman@example.com', role: 'Candidate', joined: 'Jul 15, 2025', status: 'Active', sessions: 6 },
  ];
  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">User Management</h1>
      <button class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style="background:${EMERALD}">${icon('plusCircle', 14)} Add User</button>
    </div>
    <div class="rounded-xl border border-white/7 overflow-hidden" style="background:#0d0f1e">
      <table class="w-full text-xs"><thead><tr class="border-b border-white/6">
        ${['User', 'Email', 'Role', 'Joined', 'Sessions', 'Status', 'Actions'].map(function(h) { return `<th class="px-5 py-4 text-left text-white/35 font-medium">${h}</th>`; }).join('')}
      </tr></thead><tbody>
      ${users.map(function(u) {
        return `<tr class="border-b border-white/4 hover:bg-white/2 transition-colors">
          <td class="px-5 py-3.5"><div class="flex items-center gap-2.5"><div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style="background:${u.role === 'Recruiter' ? CYAN : EMERALD}">${u.name[0]}</div><span class="text-white/80 font-medium">${u.name}</span></div></td>
          <td class="px-5 py-3.5 text-white/40 font-mono">${u.email}</td>
          <td class="px-5 py-3.5">${badge(u.role, u.role === 'Recruiter' ? 'cyan' : 'emerald')}</td>
          <td class="px-5 py-3.5 text-white/40">${u.joined}</td>
          <td class="px-5 py-3.5 text-white/50 font-mono">${u.sessions || '—'}</td>
          <td class="px-5 py-3.5">${badge(u.status, u.status === 'Active' ? 'emerald' : 'rose')}</td>
          <td class="px-5 py-3.5"><div class="flex gap-2"><button class="text-white/30 hover:text-cyan-400 transition-colors">${icon('edit2', 13)}</button><button class="text-white/30 hover:text-rose-400 transition-colors">${icon('alertCircle', 13)}</button></div></td>
        </tr>`;
      }).join('')}
      </tbody></table>
    </div>
  </div>`;
}

function adminAnalytics() {
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Platform Analytics</h1>
    <div class="grid grid-cols-2 gap-4">
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Monthly Sessions</p>
        <div class="chart-container" style="height:200px"><canvas id="chart-monthly-sessions"></canvas></div>
      </div>
      <div class="rounded-xl border border-white/7 p-5 flex flex-col" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">User Distribution</p>
        <div class="flex items-center gap-6 flex-1">
          <div style="width:140px;height:140px"><canvas id="chart-pie" width="140" height="140"></canvas></div>
          <div class="space-y-3">
            ${[{ name: 'Candidates', value: '2,340', color: EMERALD }, { name: 'Recruiters', value: '84', color: CYAN }, { name: 'Admins', value: '12', color: INDIGO }].map(function(d) {
              return `<div class="flex items-center gap-2"><span class="legend-dot" style="background:${d.color}"></span><div><p class="text-white/60 text-xs">${d.name}</p><p class="text-white font-mono text-sm font-semibold">${d.value}</p></div></div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function adminAI() {
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">AI Configuration</h1>
    <div class="grid grid-cols-2 gap-4">
      <div class="rounded-xl border border-white/7 p-5 space-y-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Model Settings</p>
        ${[
          { label: 'Interview Model', val: 'GPT-4o Fine-tuned' },
          { label: 'Speech Engine', val: 'Whisper v3' },
          { label: 'Vision Model', val: 'MediaPipe Holistic' },
          { label: 'Scoring Engine', val: 'SmartHire-Score-v2' },
        ].map(function(s) {
          return `<div class="flex items-center justify-between"><p class="text-white/50 text-xs">${s.label}</p><span class="ai-model-tag">${s.val}</span></div>`;
        }).join('')}
      </div>
      <div class="rounded-xl border border-white/7 p-5 space-y-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Generation Parameters</p>
        <div>
          <div class="flex justify-between text-xs mb-2"><span class="text-white/50">Temperature</span><span class="text-white font-mono" id="temp-val">${state.temp.toFixed(1)}</span></div>
          <input type="range" id="temp-slider" min="0" max="1" step="0.1" value="${state.temp}" class="w-full accent-emerald-400" />
          <div class="flex justify-between text-xs text-white/25 mt-1"><span>Creative</span><span>Precise</span></div>
        </div>
        ${[
          { label: 'Max Questions / Session', val: '15' },
          { label: 'Session Timeout', val: '60 min' },
          { label: 'Confidence Threshold', val: '0.75' },
        ].map(function(s) {
          return `<div class="flex items-center justify-between"><p class="text-white/50 text-xs">${s.label}</p><input value="${s.val}" class="ai-input" /></div>`;
        }).join('')}
        <button class="w-full py-2 rounded-lg text-xs font-medium text-white" style="background:${EMERALD}">Save Configuration</button>
      </div>
    </div>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Active AI Modules</p>
      <div class="grid grid-cols-3 gap-3">
        ${[
          { name: 'Question Generation', desc: 'Dynamically creates interview questions', status: true },
          { name: 'Speech-to-Text', desc: 'Real-time transcription via Whisper', status: true },
          { name: 'Eye Contact Monitor', desc: 'Webcam-based gaze detection', status: true },
          { name: 'Confidence Scorer', desc: 'Voice + visual confidence analysis', status: true },
          { name: 'Skill Extractor', desc: 'NLP-based resume parsing', status: true },
          { name: 'Filler Word Detector', desc: 'Identifies um, uh, like patterns', status: false },
        ].map(function(m) {
          return `<div class="p-3 rounded-lg border border-white/6 flex items-start gap-3" style="background:#141627"><div class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style="background:${m.status ? EMERALD : AMBER}"></div><div><p class="text-white/80 text-xs font-medium">${m.name}</p><p class="text-white/30 text-xs mt-0.5">${m.desc}</p></div></div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function adminActivity() {
  var logs = [
    { time: '14:32:07', user: 'Aradhya Ray', action: 'Completed Technical Interview Session', type: 'session', ip: '105.112.80.4' },
    { time: '14:28:51', user: 'Ravi Verma', action: 'Created new interview template: Senior SWE', type: 'template', ip: '197.210.76.22' },
    { time: '14:15:20', user: 'Sai Abhi', action: 'Uploaded resume PDF', type: 'upload', ip: '41.58.134.9' },
    { time: '14:02:44', user: 'System', action: 'AI model health check passed', type: 'system', ip: '—' },
    { time: '13:55:18', user: 'Shankar Trivedi', action: 'Login attempt failed (invalid credentials)', type: 'security', ip: '105.112.81.7' },
    { time: '13:44:09', user: 'Kanoj Bhat', action: 'Downloaded Full Performance Report', type: 'report', ip: '197.210.66.30' },
    { time: '13:31:55', user: 'System', action: 'Daily database backup completed', type: 'system', ip: '—' },
    { time: '13:20:37', user: 'Kalyan Rai', action: 'Updated AI model temperature to 0.7', type: 'config', ip: '192.168.1.1' },
  ];
  function typeColor(t) { return t === 'session' ? 'indigo' : t === 'security' ? 'rose' : t === 'system' ? 'emerald' : t === 'config' ? 'amber' : 'slate'; }
  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Activity Log</h1>
      <button class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white/50 border border-white/7 hover:border-white/15 transition-all" style="background:#141627">${icon('refreshCw', 12)} Refresh</button>
    </div>
    <div class="rounded-xl border border-white/7 overflow-hidden" style="background:#0d0f1e">
      <div class="px-5 py-3 border-b border-white/6 flex items-center gap-2">${icon('activity', 14)}<span class="text-white/50 text-xs">Live audit trail &middot; ${logs.length} events today</span></div>
      <div class="divide-y divide-white/4">
        ${logs.map(function(l) {
          return `<div class="flex items-center gap-4 px-5 py-3 hover:bg-white/2 transition-colors">
            <span class="text-white/25 font-mono text-xs w-16 shrink-0">${l.time}</span>
            ${badge(l.type, typeColor(l.type))}
            <span class="text-white/60 text-xs font-medium w-32 shrink-0 truncate">${l.user}</span>
            <span class="text-white/40 text-xs flex-1">${l.action}</span>
            <span class="text-white/20 font-mono text-xs w-28 text-right shrink-0">${l.ip}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}
