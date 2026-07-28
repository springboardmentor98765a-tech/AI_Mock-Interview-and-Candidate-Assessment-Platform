/* ── Candidate Sections ── */
function candidateOverview() {
  return `<div class="space-y-6">
    <div><h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Good morning, Adaeze 👋</h1><p class="text-white/40 text-sm mt-1">You have 2 recommended interviews scheduled today.</p></div>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      ${statCard(icon('play', 18), 'Sessions Completed', '24', '+3 this week', INDIGO)}
      ${statCard(icon('star', 18), 'Avg. Score', '79%', '+4.2%', CYAN)}
      ${statCard(icon('trendingUp', 18), 'Improvement', '+31pts', '+8.7%', EMERALD)}
      ${statCard(icon('award', 18), 'Top Skill', 'Aptitude', null, AMBER)}
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <div class="flex items-center justify-between mb-5">
          <div><p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Performance Trend</p><p class="text-white/35 text-xs mt-0.5">Last 6 weeks</p></div>
          <div class="flex items-center gap-4 text-xs text-white/40">
            <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${INDIGO}"></span>Confidence</span>
            <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${CYAN}"></span>Fluency</span>
            <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${EMERALD}"></span>Technical</span>
          </div>
        </div>
        <div class="chart-container" style="height:180px"><canvas id="chart-perf-area"></canvas></div>
      </div>
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Skill Scores</p>
        <div class="space-y-4">
          ${skills.map(function(s) { return `<div><div class="flex justify-between text-xs mb-1.5"><span class="text-white/60">${s.name}</span><span class="text-white font-mono font-medium">${s.score}%</span></div>${progressBar(s.score, s.color)}</div>`; }).join('')}
        </div>
        <div class="mt-5 pt-4 border-t border-white/7">
          <p class="text-xs text-white/35 mb-1">AI Recommendation</p>
          <p class="text-xs text-white/60 leading-relaxed">Focus on <span style="color:${AMBER}">Aptitude &amp; Reasoning</span> to push your overall score above 80.</p>
        </div>
      </div>
    </div>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <div class="flex items-center justify-between mb-4">
        <p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Recent Sessions</p>
        <button class="text-xs font-medium flex items-center gap-1" style="color:${INDIGO}">View all ${icon('chevronRight')}</button>
      </div>
      <div class="space-y-2">
        ${sessions.map(function(s) {
          var bc = s.type === 'Technical' ? 'indigo' : s.type === 'HR' ? 'cyan' : s.type === 'Aptitude' ? 'emerald' : 'amber';
          return `<div class="session-row flex items-center gap-3 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-all">
            <div class="session-icon">${icon('monitorPlay', 15)}</div>
            <div class="flex-1 min-w-0"><p class="text-white text-xs font-medium truncate">${s.title}</p><p class="text-white/35 text-xs">${s.date}</p></div>
            ${badge(s.type, bc)}
            <div class="text-right"><p class="text-white font-mono text-sm font-semibold">${s.score}%</p></div>
          </div>`;
        }).join('')}
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
        <div class="chart-container" style="height:220px"><canvas id="chart-cat-bar"></canvas></div>
      </div>
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Weekly Progress</p>
        <div class="chart-container" style="height:220px"><canvas id="chart-weekly-line"></canvas></div>
      </div>
    </div>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">AI-Generated Feedback</p>
      <div class="space-y-3">
        ${[
          { text: 'Excellent use of the STAR method in behavioural responses. Your structured answers stand out.', icon: icon('checkCircle', 14), color: EMERALD },
          { text: 'Reduce filler words (um, uh) — detected 12 instances in your last session. Practice deliberate pauses.', icon: icon('alertCircle', 14), color: AMBER },
          { text: 'Eye contact dipped during system design questions. Look directly at the camera when explaining diagrams.', icon: icon('eye', 14), color: ROSE },
          { text: 'Your technical vocabulary score is in the top 15% of candidates at your level.', icon: icon('star', 14), color: INDIGO },
        ].map(function(f) {
          return `<div class="flex items-start gap-3 p-3 rounded-lg border border-white/6"><span style="color:${f.color}" class="mt-0.5">${f.icon}</span><p class="text-white/60 text-xs leading-relaxed">${f.text}</p></div>`;
        }).join('')}
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
        <div class="mt-4 flex items-center gap-3 p-3 rounded-lg" style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2)">
          ${icon('checkCircle', 15)}
          <div><p class="text-white text-xs font-medium">Adaeze_Okonkwo_Resume.pdf</p><p class="text-emerald-400 text-xs">Uploaded &bull; Jul 20, 2025</p></div>
        </div>
      </div>
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-1" style="font-family:'Outfit',sans-serif">AI-Extracted Skills</p>
        <p class="text-white/35 text-xs mb-4">Automatically detected from your resume</p>
        <div class="flex flex-wrap gap-2">
          ${['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS', 'Python', 'REST APIs', 'System Design', 'Agile', 'CI/CD', 'GraphQL'].map(function(s) {
            return `<span class="skill-tag">${s}</span>`;
          }).join('')}
        </div>
        <div class="mt-4 pt-4 border-t border-white/7">
          <p class="text-xs text-white/35 mb-2">Missing Skills Detected</p>
          <div class="flex flex-wrap gap-2">
            ${['Kubernetes', 'Redis', 'Kafka'].map(function(s) {
              return `<span class="skill-tag-missing">${s}</span>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function candidateHistory() {
  var rows = [
    { title: 'Software Engineer – Technical', type: 'Technical', date: 'Jul 22, 2025', dur: '43 min', score: 83 },
    { title: 'Product Manager – HR Round', type: 'HR', date: 'Jul 19, 2025', dur: '28 min', score: 76 },
    { title: 'Data Analyst – Aptitude', type: 'Aptitude', date: 'Jul 14, 2025', dur: '22 min', score: 91 },
    { title: 'Full Stack – Behavioural', type: 'Behavioural', date: 'Jul 10, 2025', dur: '31 min', score: 68 },
    { title: 'Backend Engineer – Technical', type: 'Technical', date: 'Jul 5, 2025', dur: '47 min', score: 75 },
    { title: 'UX Designer – HR Round', type: 'HR', date: 'Jul 1, 2025', dur: '29 min', score: 80 },
  ];
  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Interview History</h1>
      <div class="flex gap-2"><button class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white/50 border border-white/7 hover:border-white/15 transition-all" style="background:#141627">${icon('filter', 12)} Filter</button></div>
    </div>
    <div class="rounded-xl border border-white/7 overflow-hidden" style="background:#0d0f1e">
      <table class="w-full text-xs"><thead><tr class="border-b border-white/6">
        ${['Session', 'Type', 'Date', 'Duration', 'Score', 'Report'].map(function(h) { return `<th class="px-5 py-3.5 text-left text-white/35 font-medium">${h}</th>`; }).join('')}
      </tr></thead><tbody>
      ${rows.map(function(r) {
        var bc = r.type === 'Technical' ? 'indigo' : r.type === 'HR' ? 'cyan' : r.type === 'Aptitude' ? 'emerald' : 'amber';
        var sc = r.score >= 80 ? 'text-emerald-400' : r.score >= 70 ? 'text-amber-400' : 'text-rose-400';
        return `<tr class="border-b border-white/4 hover:bg-white/2 transition-colors">
          <td class="px-5 py-3.5 text-white/80">${r.title}</td>
          <td class="px-5 py-3.5">${badge(r.type, bc)}</td>
          <td class="px-5 py-3.5 text-white/40">${r.date}</td>
          <td class="px-5 py-3.5 text-white/40 font-mono">${r.dur}</td>
          <td class="px-5 py-3.5"><span class="font-mono font-semibold ${sc}">${r.score}%</span></td>
          <td class="px-5 py-3.5"><button class="flex items-center gap-1 text-white/40 hover:text-indigo-400 transition-colors">${icon('downloadLg', 13)} Download</button></td>
        </tr>`;
      }).join('')}
      </tbody></table>
    </div>
  </div>`;
}

function candidateReports() {
  var reports = [
    { title: 'Full Performance Report', desc: 'Complete assessment including all interview rounds', size: '2.4 MB', date: 'Jul 22, 2025', color: INDIGO },
    { title: 'Technical Skills Report', desc: 'In-depth analysis of your coding and system design answers', size: '1.1 MB', date: 'Jul 22, 2025', color: CYAN },
    { title: 'Communication Analysis', desc: 'Speech patterns, filler words, pacing, and clarity score', size: '0.8 MB', date: 'Jul 19, 2025', color: EMERALD },
    { title: 'Improvement Roadmap', desc: 'AI-personalized 30-day practice plan and milestones', size: '0.5 MB', date: 'Jul 22, 2025', color: AMBER },
  ];
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Reports</h1>
    <div class="grid grid-cols-2 gap-4">
      ${reports.map(function(r) {
        return `<div class="report-card rounded-xl border border-white/7 p-5 flex items-start gap-4 hover:border-white/15 transition-all" style="background:#0d0f1e">
          <div class="report-icon" style="background:${r.color}20"><span style="color:${r.color}">${icon('fileText', 18)}</span></div>
          <div class="flex-1 min-w-0">
            <p class="text-white text-sm font-semibold" style="font-family:'Outfit',sans-serif">${r.title}</p>
            <p class="text-white/35 text-xs mt-0.5 mb-3">${r.desc}</p>
            <div class="flex items-center justify-between">
              <span class="text-white/25 text-xs font-mono">${r.size} &middot; ${r.date}</span>
              <button class="report-dl-btn flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style="background:${r.color}">${icon('downloadLg', 11)} Download</button>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
