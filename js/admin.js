/* ── Admin Sections ── */
function adminOverview() {
  return `<div class="space-y-6">
    <div><h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Admin Overview</h1><p class="text-white/40 text-sm mt-1">Platform-wide metrics</p></div>
    <div class="grid grid-cols-4 gap-4">
      ${statCard(icon('users', 18), 'Total Users', '0', null, EMERALD)}
      ${statCard(icon('briefcase', 18), 'Recruiters', '0', null, CYAN)}
      ${statCard(icon('monitorPlay', 18), 'Sessions This Month', '0', null, INDIGO)}
      ${statCard(icon('globe', 18), 'System Uptime', '—', null, EMERALD)}
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <div class="flex items-center justify-between mb-4">
          <p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Platform Growth</p>
        </div>
        <div class="flex flex-col items-center justify-center h-40 text-center">
          <p class="text-white/30 text-sm">No growth data yet.</p>
        </div>
      </div>
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">System Health</p>
        <div class="flex flex-col items-center justify-center h-40 text-center">
          <p class="text-white/30 text-sm">No health data available.</p>
        </div>
      </div>
    </div>
  </div>`;
}

function adminUsers() {
  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">User Management</h1>
      <button class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style="background:${EMERALD}">${icon('plusCircle', 14)} Add User</button>
    </div>
    <div class="rounded-xl border border-white/7 overflow-hidden" style="background:#0d0f1e">
      <table class="w-full text-xs"><thead><tr class="border-b border-white/6">
        ${['User', 'Email', 'Role', 'Joined', 'Sessions', 'Status', 'Actions'].map(function(h) { return `<th class="px-5 py-4 text-left text-white/35 font-medium">${h}</th>`; }).join('')}
      </tr></thead><tbody>
      <tr><td colspan="7" class="px-5 py-10 text-center text-white/30 text-sm">No users registered yet.</td></tr>
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
        <div class="flex flex-col items-center justify-center h-48 text-center">
          <p class="text-white/30 text-sm">No session data yet.</p>
        </div>
      </div>
      <div class="rounded-xl border border-white/7 p-5 flex flex-col" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">User Distribution</p>
        <div class="flex flex-col items-center justify-center flex-1 text-center">
          <p class="text-white/30 text-sm">No user data yet.</p>
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
  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Activity Log</h1>
      <button class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white/50 border border-white/7 hover:border-white/15 transition-all" style="background:#141627">${icon('refreshCw', 12)} Refresh</button>
    </div>
    <div class="rounded-xl border border-white/7 overflow-hidden" style="background:#0d0f1e">
      <div class="px-5 py-3 border-b border-white/6 flex items-center gap-2">${icon('activity', 14)}<span class="text-white/50 text-xs">Live audit trail</span></div>
      <div class="flex flex-col items-center justify-center py-10 text-center">
        <p class="text-white/30 text-sm">No activity recorded yet.</p>
      </div>
    </div>
  </div>`;
}
