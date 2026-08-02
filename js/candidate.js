/* ── Candidate Sections ── */
function candidateOverview() {
  var userName = state.user ? state.user.name.split(' ')[0] : 'Candidate';
  return `<div class="space-y-6">
    <div><h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Good morning, ${userName} 👋</h1><p class="text-white/40 text-sm mt-1">Welcome to your SmartHire AI dashboard.</p></div>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      ${statCard(icon('play', 18), 'Sessions Completed', '0', null, INDIGO)}
      ${statCard(icon('star', 18), 'Avg. Score', '—', null, CYAN)}
      ${statCard(icon('trendingUp', 18), 'Improvement', '—', null, EMERALD)}
      ${statCard(icon('award', 18), 'Top Skill', '—', null, AMBER)}
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <div class="flex items-center justify-between mb-5">
          <div><p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Performance Trend</p><p class="text-white/35 text-xs mt-0.5">No data yet</p></div>
        </div>
        <div class="flex flex-col items-center justify-center h-40 text-center">
          <p class="text-white/30 text-sm">Complete your first interview to see performance trends.</p>
        </div>
      </div>
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Skill Scores</p>
        <div class="flex flex-col items-center justify-center h-40 text-center">
          <p class="text-white/30 text-sm">No skill data yet. Upload your resume to get started.</p>
        </div>
      </div>
    </div>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <div class="flex items-center justify-between mb-4">
        <p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Recent Sessions</p>
      </div>
      <div class="flex flex-col items-center justify-center py-8 text-center">
        <p class="text-white/30 text-sm">No sessions yet. Start a mock interview to begin.</p>
      </div>
    </div>
  </div>`;
}

function candidateInterviews() {
  var types = [
    { title: 'Technical Interview', desc: 'Data structures, algorithms, system design', icon: icon('cpu', 20), color: INDIGO, duration: '45 min', difficulty: 'Hard' },
    { title: 'HR Round', desc: 'Culture fit, career goals, soft skills', icon: icon('messageSquare', 20), color: CYAN, duration: '30 min', difficulty: 'Medium' },
    { title: 'Behavioural', desc: 'STAR-method situational questions', icon: icon('brain', 20), color: EMERALD, duration: '30 min', difficulty: 'Medium' },
    { title: 'Aptitude Test', desc: 'Logical reasoning, quantitative analysis', icon: icon('target', 20), color: AMBER, duration: '25 min', difficulty: 'Medium' },
  ];
  return `<div class="space-y-6">
    <div><h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Mock Interviews</h1><p class="text-white/40 text-sm mt-1">Choose an interview type to begin your AI-powered session.</p></div>
    <div class="grid grid-cols-2 gap-4">
      ${types.map(function(t) {
        return `<div class="interview-card rounded-xl border border-white/7 p-6 hover:border-white/15 transition-all group cursor-pointer" style="background:#0d0f1e">
          <div class="flex items-start justify-between mb-4">
            <div class="interview-icon" style="background:${t.color}20"><span style="color:${t.color}">${t.icon}</span></div>
            <div class="flex gap-2">${badge(t.duration, 'slate')}${badge(t.difficulty, t.difficulty === 'Hard' ? 'rose' : 'amber')}</div>
          </div>
          <h3 class="text-white font-semibold mb-1" style="font-family:'Outfit',sans-serif">${t.title}</h3>
          <p class="text-white/40 text-xs leading-relaxed mb-5">${t.desc}</p>
          <button class="w-full py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90" style="background:${t.color}">${icon('play', 14)} Start Session</button>
        </div>`;
      }).join('')}
    </div>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background:rgba(99,102,241,0.15)">${icon('video', 18)}</div>
        <div><p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Webcam &amp; Microphone Setup</p><p class="text-white/40 text-xs">Ensure camera and mic are enabled for full AI analysis</p></div>
        <button class="ml-auto px-4 py-2 rounded-lg text-xs font-medium text-white" style="background:${INDIGO}">Test Devices</button>
      </div>
      <div class="grid grid-cols-3 gap-3">
        ${[{ label: 'Eye Contact Tracking', icon: icon('eye', 14) }, { label: 'Speech Recognition', icon: icon('mic', 14) }, { label: 'Confidence Analysis', icon: icon('activity', 14) }].map(function(f) {
          return `<div class="flex items-center gap-2 p-3 rounded-lg border border-white/6" style="background:#141627"><span class="text-emerald-400">${f.icon}</span><div><p class="text-white text-xs font-medium">${f.label}</p><p class="text-emerald-400 text-xs">Ready</p></div></div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function candidateAnalytics() {
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Performance Analytics</h1>
    <div class="grid grid-cols-2 gap-4">
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Score by Category</p>
        <div class="flex flex-col items-center justify-center h-48 text-center">
          <p class="text-white/30 text-sm">No data available. Complete interviews to see analytics.</p>
        </div>
      </div>
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Weekly Progress</p>
        <div class="flex flex-col items-center justify-center h-48 text-center">
          <p class="text-white/30 text-sm">No data available. Complete interviews to see progress.</p>
        </div>
      </div>
    </div>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">AI-Generated Feedback</p>
      <div class="flex flex-col items-center justify-center py-8 text-center">
        <p class="text-white/30 text-sm">No feedback yet. Complete an interview to receive AI-generated feedback.</p>
      </div>
    </div>
  </div>`;
}

function candidateResume() {
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Resume &amp; Skills</h1>
    <div class="grid grid-cols-2 gap-4">
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Upload Resume</p>
        <div class="upload-zone border-2 border-dashed rounded-xl p-8 text-center cursor-pointer group">
          <div class="upload-icon-wrap">${icon('upload', 20)}</div>
          <p class="text-white/60 text-sm font-medium mb-1">Drag &amp; drop your resume</p>
          <p class="text-white/30 text-xs">PDF, DOCX — up to 5 MB</p>
          <button class="mt-4 px-4 py-2 rounded-lg text-xs font-medium text-white/70 border border-white/10 hover:border-white/20 transition-colors">Browse Files</button>
        </div>
      </div>
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-1" style="font-family:'Outfit',sans-serif">AI-Extracted Skills</p>
        <p class="text-white/35 text-xs mb-4">Upload a resume to automatically detect skills</p>
        <div class="flex flex-col items-center justify-center py-8 text-center">
          <p class="text-white/30 text-sm">No resume uploaded yet.</p>
        </div>
      </div>
    </div>
  </div>`;
}

function candidateHistory() {
  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Interview History</h1>
    </div>
    <div class="rounded-xl border border-white/7 overflow-hidden" style="background:#0d0f1e">
      <table class="w-full text-xs"><thead><tr class="border-b border-white/6">
        ${['Session', 'Type', 'Date', 'Duration', 'Score', 'Report'].map(function(h) { return `<th class="px-5 py-3.5 text-left text-white/35 font-medium">${h}</th>`; }).join('')}
      </tr></thead><tbody>
      <tr><td colspan="6" class="px-5 py-10 text-center text-white/30 text-sm">No interview history yet. Start a mock interview to begin tracking.</td></tr>
      </tbody></table>
    </div>
  </div>`;
}

function candidateReports() {
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Reports</h1>
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <p class="text-white/30 text-sm">No reports available yet. Complete interviews to generate reports.</p>
    </div>
  </div>`;
}
