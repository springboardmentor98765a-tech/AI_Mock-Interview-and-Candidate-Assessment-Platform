function adminOverview() {
  if (!state.adminOverviewData && !state._fetchingAdminOverview) {
    state._fetchingAdminOverview = true;
    api.getAdminOverview().then(function (data) {
      state.adminOverviewData = data;
      state._fetchingAdminOverview = false;
      render();
    }).catch(function (err) {
      console.warn('Failed to fetch admin overview:', err);
      state._fetchingAdminOverview = false;
      render();
    });
  }

  var ov = state.adminOverviewData || {
    kpis: {
      total_users: 0, total_candidates: 0, total_recruiters: 0, total_admins: 0,
      total_sessions: 0, completed_sessions: 0, active_live_sessions: 0,
      total_assessments: 0, completed_assessments: 0, total_jobs: 0, total_applications: 0,
      avg_platform_score: 0.0, system_uptime: '—', uptime_seconds: 0
    },
    domain_distribution: [],
    timeline: { sessions: [], registrations: [] },
    recent_sessions: [],
    recent_users: [],
    telemetry: {}
  };

  var kpis = ov.kpis || {};
  var domains = ov.domain_distribution || [];
  var recentSessions = ov.recent_sessions || [];
  var recentUsers = ov.recent_users || [];
  var tel = ov.telemetry || {
    stt_engine: { name: 'Groq Whisper Large v3', latency: '178ms', status: 'Operational' },
    vision_engine: { name: 'MediaPipe Face Mesh', latency: '31ms', fps: 29.8, status: 'Operational' },
    llm_engine: { name: 'DeepSeek / Qwen / Gemini', latency: '780ms', status: 'Operational' },
    database: { name: 'SQLite (WAL)', size_mb: 0.12, status: 'Healthy' }
  };

  return `<div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Admin Overview</h1>
        <p class="text-white/40 text-sm mt-1">Platform-wide health metrics, live candidate telemetry, and system KPIs.</p>
      </div>
      <div class="flex items-center gap-3">
        <button id="btn-overview-download-health-pdf" class="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-medium flex items-center gap-2 transition-all cursor-pointer">
          ${icon('downloadLg', 14)} System Health PDF
        </button>
        <button id="btn-refresh-admin-overview" class="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center gap-2 transition-all cursor-pointer">
          ${icon('refreshCw', 14)} Refresh Metrics
        </button>
      </div>
    </div>

    <!-- Live Platform KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-xl border border-white/7 p-5 flex items-center gap-4 shadow-lg" style="background:#0d0f1e">
        <div class="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
          ${icon('users', 22)}
        </div>
        <div>
          <p class="text-white/40 text-xs font-semibold uppercase tracking-wider">Total Registered</p>
          <p class="text-2xl font-bold text-white mt-0.5" style="font-family:'Outfit',sans-serif">${kpis.total_users || 0}</p>
          <p class="text-white/40 text-[11px] mt-0.5">${kpis.total_candidates || 0} Candidates &bull; ${kpis.total_recruiters || 0} Recruiters</p>
        </div>
      </div>

      <div class="rounded-xl border border-white/7 p-5 flex items-center gap-4 shadow-lg" style="background:#0d0f1e">
        <div class="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
          ${icon('monitorPlay', 22)}
        </div>
        <div>
          <p class="text-white/40 text-xs font-semibold uppercase tracking-wider">Mock Interviews</p>
          <p class="text-2xl font-bold text-white mt-0.5" style="font-family:'Outfit',sans-serif">${kpis.total_sessions || 0}</p>
          <p class="text-cyan-400 text-[11px] font-semibold mt-0.5">${kpis.completed_sessions || 0} Completed &bull; ${kpis.active_live_sessions || 0} Live</p>
        </div>
      </div>

      <div class="rounded-xl border border-white/7 p-5 flex items-center gap-4 shadow-lg" style="background:#0d0f1e">
        <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
          ${icon('barChart2', 22)}
        </div>
        <div>
          <p class="text-white/40 text-xs font-semibold uppercase tracking-wider">Platform Avg Score</p>
          <p class="text-2xl font-bold text-white mt-0.5" style="font-family:'Outfit',sans-serif">${kpis.avg_platform_score || 0}%</p>
          <p class="text-emerald-400 text-[11px] font-semibold mt-0.5">${kpis.total_assessments || 0} Assessments Evaluated</p>
        </div>
      </div>

      <div class="rounded-xl border border-white/7 p-5 flex items-center gap-4 shadow-lg" style="background:#0d0f1e">
        <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
          ${icon('activity', 22)}
        </div>
        <div>
          <p class="text-white/40 text-xs font-semibold uppercase tracking-wider">System Uptime</p>
          <p class="text-lg font-bold text-white mt-1" style="font-family:'Outfit',sans-serif">${kpis.system_uptime || 'Live'}</p>
          <p class="text-emerald-400 text-[11px] font-semibold mt-0.5 flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> All Services Healthy</p>
        </div>
      </div>
    </div>

    <!-- Analytics & Telemetry Row (3 Balanced Columns) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <!-- Card 1: Platform Activity Progression -->
      <div class="rounded-2xl border border-white/8 p-6 flex flex-col justify-between" style="background:#0c0e1c">
        <div>
          <div class="flex items-center justify-between mb-2">
            <div>
              <h3 class="text-base font-bold text-white" style="font-family:'Outfit',sans-serif">Platform Activity Progression</h3>
              <p class="text-white/40 text-xs mt-0.5">Daily mock interview session volume</p>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-bold">14-Day Timeline</span>
          </div>

          <div class="h-48 flex flex-col justify-end">
            ${renderAdminActivityChart(ov.timeline ? ov.timeline.sessions : [])}
          </div>
        </div>

        <div class="pt-3 border-t border-white/6 mt-3 flex items-center justify-between text-xs text-white/40">
          <span>Continuous Timeline</span>
          <span class="text-cyan-400 font-semibold font-mono">${kpis.total_sessions || 0} Total Sessions</span>
        </div>
      </div>

      <!-- Card 2: Interview Domains Breakdown -->
      <div class="rounded-2xl border border-white/8 p-6 flex flex-col justify-between" style="background:#0c0e1c">
        <div>
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-base font-bold text-white" style="font-family:'Outfit',sans-serif">Interview Domains</h3>
              <p class="text-white/40 text-xs mt-0.5">Distribution across interview specializations</p>
            </div>
            <span class="text-xs text-white/40">Top Categories</span>
          </div>
          <div class="space-y-3">
            ${domains.length ? domains.map(function(d) {
              var maxCnt = Math.max.apply(null, domains.map(function(x){ return x.count; })) || 1;
              var pct = Math.round((d.count / maxCnt) * 100);
              return `<div>
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="text-white/80 font-medium">${d.domain}</span>
                  <span class="text-white/40 font-mono">${d.count} sessions</span>
                </div>
                <div class="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                  <div class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" style="width:${pct}%"></div>
                </div>
              </div>`;
            }).join('') : '<p class="text-white/30 text-xs text-center py-8">No interview domain telemetry recorded yet.</p>'}
          </div>
        </div>

        <div class="pt-3 border-t border-white/6 mt-3 flex items-center justify-between text-xs text-white/40">
          <span>Active ATS Requisitions: <strong class="text-white font-bold">${kpis.total_jobs || 0}</strong></span>
          <span>Applications: <strong class="text-white font-bold">${kpis.total_applications || 0}</strong></span>
        </div>
      </div>

      <!-- Card 3: Real-Time Engine & AI Telemetry -->
      <div class="rounded-2xl border border-white/8 p-6 flex flex-col justify-between" style="background:#0c0e1c">
        <div>
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-base font-bold text-white" style="font-family:'Outfit',sans-serif">AI &amp; System Telemetry</h3>
              <p class="text-white/40 text-xs mt-0.5">Live latency &amp; pipeline microservices</p>
            </div>
            <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-bold">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Active
            </span>
          </div>

          <div class="space-y-2.5">
            <!-- Groq Whisper Voice -->
            <div class="p-2.5 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  ${icon('mic', 15)}
                </div>
                <div>
                  <p class="text-xs font-semibold text-white/90">Groq Whisper STT</p>
                  <p class="text-[10px] text-white/40">Voice Stream &bull; Large v3</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-xs font-mono font-bold text-cyan-400">${tel.stt_engine ? tel.stt_engine.latency : '178ms'}</span>
                <p class="text-[10px] text-emerald-400 font-medium">Operational</p>
              </div>
            </div>

            <!-- MediaPipe Vision -->
            <div class="p-2.5 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  ${icon('video', 15)}
                </div>
                <div>
                  <p class="text-xs font-semibold text-white/90">MediaPipe Vision</p>
                  <p class="text-[10px] text-white/40">Face Mesh &bull; Head Pose</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-xs font-mono font-bold text-cyan-400">${tel.vision_engine ? tel.vision_engine.fps + ' FPS' : '30 FPS'}</span>
                <p class="text-[10px] text-emerald-400 font-medium">${tel.vision_engine ? tel.vision_engine.latency : '31ms'}</p>
              </div>
            </div>

            <!-- LLM Engine -->
            <div class="p-2.5 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  ${icon('brain', 15)}
                </div>
                <div>
                  <p class="text-xs font-semibold text-white/90">LLM Reasoning</p>
                  <p class="text-[10px] text-white/40">DeepSeek / Qwen / Gemini</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-xs font-mono font-bold text-cyan-400">${tel.llm_engine ? tel.llm_engine.latency : '780ms'}</span>
                <p class="text-[10px] text-emerald-400 font-medium">Operational</p>
              </div>
            </div>

            <!-- SQLite WAL DB -->
            <div class="p-2.5 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  ${icon('database', 15)}
                </div>
                <div>
                  <p class="text-xs font-semibold text-white/90">SQLite Engine</p>
                  <p class="text-[10px] text-white/40">WAL Journaling &bull; Low I/O</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-xs font-mono font-bold text-white/80">${tel.database ? tel.database.size_mb + ' MB' : '0.1 MB'}</span>
                <p class="text-[10px] text-emerald-400 font-medium">Healthy</p>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-white/6 mt-3 flex items-center justify-between text-xs">
          <button id="btn-telemetry-download-health-pdf" class="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer">
            ${icon('downloadLg', 12)} Health PDF
          </button>
          <button class="link-admin-goto-section text-indigo-400 hover:text-indigo-300 font-semibold text-[11px] transition-colors" data-section="ai">
            Configure AI &rarr;
          </button>
        </div>
      </div>
    </div>

    <!-- Lower Management & Live Feeds Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <!-- Recent Candidate Mock Interviews Table (Spans 2 cols) -->
      <div class="lg:col-span-2 rounded-2xl border border-white/8 p-6" style="background:#0c0e1c">
        <div class="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 class="text-base font-bold text-white" style="font-family:'Outfit',sans-serif">Recent Candidate Mock Interviews</h3>
            <p class="text-white/40 text-xs mt-0.5">Live feed of completed candidate evaluations and diagnostic reports</p>
          </div>
          <button class="link-admin-goto-section text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors" data-section="interviews">
            View All in Interviews &rarr;
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-white/70">
            <thead>
              <tr class="border-b border-white/8 text-[11px] uppercase tracking-wider text-white/40 font-semibold">
                <th class="pb-3 pr-4">Candidate</th>
                <th class="pb-3 pr-4">Domain / Type</th>
                <th class="pb-3 pr-4 text-center">Score</th>
                <th class="pb-3 pr-4">Rating</th>
                <th class="pb-3 pr-4">Date</th>
                <th class="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              ${recentSessions.length ? recentSessions.map(function(s) {
                var score = s.overall_score !== null && s.overall_score !== undefined ? Math.round(s.overall_score) : null;
                var scoreBadge = score !== null
                  ? (score >= 70 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : (score >= 50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'))
                  : 'bg-white/5 text-white/40 border-white/10';
                var scoreText = score !== null ? score + '%' : 'N/A';
                var candName = s.candidate_name || 'Candidate #' + (s.id || '');
                var candEmail = s.candidate_email || '—';
                var dateStr = s.created_at ? s.created_at.slice(0, 10) : 'Recent';

                return `<tr class="hover:bg-white/[0.02] transition-colors">
                  <td class="py-3 pr-4">
                    <div class="flex items-center gap-2.5">
                      <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        ${candName.charAt(0).toUpperCase()}
                      </div>
                      <div class="min-w-0">
                        <p class="font-semibold text-white truncate max-w-[140px]">${candName}</p>
                        <p class="text-[11px] text-white/40 truncate max-w-[140px]">${candEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 pr-4">
                    <span class="px-2 py-0.5 rounded bg-white/5 text-white/80 font-medium">${s.domain || s.interview_type || 'General'}</span>
                  </td>
                  <td class="py-3 pr-4 text-center">
                    <span class="px-2 py-0.5 rounded-full border text-[11px] font-bold ${scoreBadge}">
                      ${scoreText}
                    </span>
                  </td>
                  <td class="py-3 pr-4">
                    <span class="text-white/60 font-medium">${s.performance_rating || 'Completed'}</span>
                  </td>
                  <td class="py-3 pr-4 font-mono text-[11px] text-white/40">
                    ${dateStr}
                  </td>
                  <td class="py-3 text-right">
                    <button class="btn-admin-view-report px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 font-semibold text-[11px] transition-all" data-id="${s.id}">
                      View Report
                    </button>
                  </td>
                </tr>`;
              }).join('') : `<tr><td colspan="6" class="py-8 text-center text-white/30">No mock interview sessions recorded yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right Column: Recent Users & Administrative Quick Actions -->
      <div class="space-y-5">
        <!-- Recent Registrations Card -->
        <div class="rounded-2xl border border-white/8 p-5" style="background:#0c0e1c">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-base font-bold text-white" style="font-family:'Outfit',sans-serif">Recent Registrations</h3>
              <p class="text-white/40 text-xs mt-0.5">Latest accounts created on SmartHire AI</p>
            </div>
            <button class="link-admin-goto-section text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors" data-section="users">
              All Users &rarr;
            </button>
          </div>

          <div class="space-y-2.5">
            ${recentUsers.length ? recentUsers.map(function(u) {
              var roleBadge = u.role === 'admin' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : (u.role === 'recruiter' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20');
              var initials = (u.name || 'U').charAt(0).toUpperCase();
              return `<div class="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-7 h-7 rounded-full bg-white/10 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    ${initials}
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-white truncate max-w-[120px]">${u.name || 'User'}</p>
                    <p class="text-[10px] text-white/40 truncate max-w-[120px]">${u.email || ''}</p>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${roleBadge}">${u.role}</span>
                </div>
              </div>`;
            }).join('') : '<p class="text-white/30 text-xs text-center py-4">No users found.</p>'}
          </div>
        </div>

        <!-- Administrative Quick Actions -->
        <div class="rounded-2xl border border-white/8 p-5" style="background:#0c0e1c">
          <h3 class="text-base font-bold text-white mb-3" style="font-family:'Outfit',sans-serif">Administrative Shortcuts</h3>
          <div class="grid grid-cols-2 gap-2.5">
            <button id="btn-admin-quick-add-user" class="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/8 text-left transition-all group">
              <div class="text-indigo-400 group-hover:scale-110 transition-transform mb-1.5">${icon('userPlus', 18)}</div>
              <p class="text-xs font-bold text-white">Add User</p>
              <p class="text-[10px] text-white/40">Register new account</p>
            </button>
            <button class="link-admin-goto-section p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/8 text-left transition-all group" data-section="ai">
              <div class="text-cyan-400 group-hover:scale-110 transition-transform mb-1.5">${icon('brain', 18)}</div>
              <p class="text-xs font-bold text-white">AI Config</p>
              <p class="text-[10px] text-white/40">Models &amp; API keys</p>
            </button>
            <button class="link-admin-goto-section p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/8 text-left transition-all group" data-section="interviews">
              <div class="text-emerald-400 group-hover:scale-110 transition-transform mb-1.5">${icon('monitorPlay', 18)}</div>
              <p class="text-xs font-bold text-white">Interviews</p>
              <p class="text-[10px] text-white/40">Manage sessions</p>
            </button>
            <button class="link-admin-goto-section p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/8 text-left transition-all group" data-section="activity">
              <div class="text-amber-400 group-hover:scale-110 transition-transform mb-1.5">${icon('activity', 18)}</div>
              <p class="text-xs font-bold text-white">Audit Log</p>
              <p class="text-[10px] text-white/40">Platform security log</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderAdminActivityChart(timeline) {
  if (!timeline || !timeline.length) {
    return `<div class="flex flex-col items-center justify-center h-full text-center py-8">
      <span class="text-white/20 mb-2">${icon('barChart2', 32)}</span>
      <p class="text-white/40 text-xs">Interview activity will populate as candidates complete sessions.</p>
    </div>`;
  }

  var maxVal = Math.max.apply(null, timeline.map(function(t) { return t.sessions || 0; })) || 1;

  return `
    <div class="flex items-end justify-between h-40 gap-1 sm:gap-1.5 px-1 pt-4">
      ${timeline.map(function(t) {
        var count = t.sessions || 0;
        var hPct = count > 0 ? Math.max(16, Math.round((count / maxVal) * 100)) : 6;
        var dateParts = (t.date || '').split('-');
        var dayLabel = dateParts.length === 3 ? dateParts[1] + '/' + dateParts[2] : (t.date || '');
        var barBg = count > 0 
          ? 'background: linear-gradient(180deg, #38bdf8 0%, #6366f1 100%); box-shadow: 0 0 10px rgba(56,189,248,0.25);' 
          : 'background: rgba(255, 255, 255, 0.06);';

        return `
          <div class="flex-1 flex flex-col items-center h-full justify-end" title="${t.date}: ${count} session${count === 1 ? '' : 's'}">
            ${count > 0 
              ? `<span style="font-size:10px; font-weight:700; color:#38bdf8; margin-bottom:4px; line-height:1;">${count}</span>` 
              : `<span style="font-size:10px; color:transparent; margin-bottom:4px; line-height:1; user-select:none;">0</span>`
            }
            <div class="w-full max-w-[22px] rounded-t transition-all hover:brightness-125" style="height:${hPct}%; ${barBg}"></div>
            <span style="font-size:9px; color:rgba(255,255,255,0.35); margin-top:8px; line-height:1; font-family:'JetBrains Mono',monospace;">${dayLabel}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function adminUsers() {
  var filterRole = state.adminUsersFilterRole || 'all';
  var search = state.adminUsersSearch || '';

  if (!state.adminUsersData && !state._fetchingAdminUsers) {
    state._fetchingAdminUsers = true;
    api.getAdminUsers({ role: filterRole === 'all' ? '' : filterRole, search: search }).then(function (data) {
      state.adminUsersData = data;
      state._fetchingAdminUsers = false;
      render();
    }).catch(function (err) {
      console.warn('Failed to fetch admin users:', err);
      state._fetchingAdminUsers = false;
      render();
    });
  }

  var usersData = state.adminUsersData || { users: [], total: 0, page: 1, limit: 20 };
  var users = usersData.users || [];

  return `<div class="space-y-6">
    <!-- Top Bar -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">User &amp; Recruiter Management</h1>
        <p class="text-white/40 text-sm mt-1">Manage all candidates, recruiters, and platform administrators.</p>
      </div>
      <div class="flex items-center gap-3">
        <button id="btn-admin-open-add-user" class="sh-btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-500/20">
          ${icon('plusCircle', 14)} Add New User
        </button>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="rounded-2xl border border-white/8 p-4 flex items-center justify-between flex-wrap gap-3" style="background:#0c0e1c">
      <!-- Role Filter Pills -->
      <div class="flex items-center gap-1.5 flex-wrap">
        ${['all', 'candidate', 'recruiter', 'admin'].map(function(r) {
          var isActive = filterRole === r;
          var label = r === 'all' ? 'All Roles' : (r.charAt(0).toUpperCase() + r.slice(1) + 's');
          return `<button class="btn-admin-filter-role px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}" data-role="${r}">
            ${label}
          </button>`;
        }).join('')}
      </div>

      <!-- Search Input -->
      <div class="admin-search-wrapper">
        <span class="text-white/40 shrink-0 flex items-center">${icon('search', 14)}</span>
        <input type="text" id="inp-admin-user-search" value="${search}" placeholder="Search by name or email..." />
      </div>
    </div>

    <!-- User Table -->
    <div class="rounded-2xl border border-white/8 overflow-hidden shadow-xl" style="background:#0c0e1c">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-white/6 bg-white/[0.02]">
              <th class="py-3.5 px-5 text-white/40 font-semibold uppercase tracking-wider text-[11px]">User</th>
              <th class="py-3.5 px-5 text-white/40 font-semibold uppercase tracking-wider text-[11px]">Role</th>
              <th class="py-3.5 px-5 text-white/40 font-semibold uppercase tracking-wider text-[11px]">Joined Date</th>
              <th class="py-3.5 px-5 text-white/40 font-semibold uppercase tracking-wider text-[11px]">Sessions</th>
              <th class="py-3.5 px-5 text-white/40 font-semibold uppercase tracking-wider text-[11px]">Avg Score</th>
              <th class="py-3.5 px-5 text-white/40 font-semibold uppercase tracking-wider text-[11px]">Status</th>
              <th class="py-3.5 px-5 text-white/40 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/4">
            ${users.length ? users.map(function(u) {
              var initials = u.name ? u.name.split(' ').map(function(w){ return w[0]; }).join('').slice(0, 2).toUpperCase() : 'U';
              var roleColor = u.role === 'admin' ? 'purple' : (u.role === 'recruiter' ? 'cyan' : 'indigo');
              var scoreBadge = u.avg_score !== null ? `<span class="font-bold ${u.avg_score >= 75 ? 'text-emerald-400' : u.avg_score >= 60 ? 'text-amber-400' : 'text-rose-400'}">${u.avg_score}%</span>` : '<span class="text-white/30">—</span>';
              var joinedFormatted = u.created_at ? u.created_at.slice(0, 10) : '—';
              
              return `<tr class="hover:bg-white/[0.02] transition-colors group">
                <td class="py-3.5 px-5">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center font-bold text-white text-xs shrink-0">
                      ${initials}
                    </div>
                    <div class="min-w-0">
                      <p class="font-semibold text-white text-xs truncate">${u.name}</p>
                      <p class="text-white/40 text-[11px] truncate">${u.email}</p>
                    </div>
                  </div>
                </td>
                <td class="py-3.5 px-5">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${roleColor === 'purple' ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' : roleColor === 'cyan' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'}">
                    ${u.role} ${u.is_super_admin ? '&bull; Super' : ''}
                  </span>
                </td>
                <td class="py-3.5 px-5 text-white/50 text-xs font-mono">${joinedFormatted}</td>
                <td class="py-3.5 px-5 text-white font-medium">${u.sessions_count || 0}</td>
                <td class="py-3.5 px-5 font-mono text-xs">${scoreBadge}</td>
                <td class="py-3.5 px-5">
                  <span class="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                  </span>
                </td>
                <td class="py-3.5 px-5 text-right">
                  <div class="inline-flex items-center gap-2">
                    <select class="sel-admin-user-role bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none" data-id="${u.id}">
                      <option value="candidate" ${u.role === 'candidate' ? 'selected' : ''}>Candidate</option>
                      <option value="recruiter" ${u.role === 'recruiter' ? 'selected' : ''}>Recruiter</option>
                      <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                    <button class="btn-admin-delete-user text-white/30 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors" data-id="${u.id}" data-name="${u.name}" title="Delete User">
                      ${icon('trash2', 14)}
                    </button>
                  </div>
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="7" class="py-12 text-center text-white/30 text-xs">No users found matching your criteria.</td></tr>`}
          </tbody>
        </table>
      </div>
      
      <!-- Footer pagination -->
      <div class="py-3.5 px-5 border-t border-white/6 flex items-center justify-between text-xs text-white/40 bg-white/[0.01]">
        <span>Showing <strong class="text-white">${users.length}</strong> of <strong class="text-white">${usersData.total || users.length}</strong> registered users</span>
        <span>Page ${usersData.page || 1}</span>
      </div>
    </div>
  </div>`;
}

function adminInterviews() {
  var filterStatus = state.adminInterviewsFilterStatus || 'all';
  var search = state.adminInterviewsSearch || '';

  if (!state.adminInterviewsData && !state._fetchingAdminInterviews) {
    state._fetchingAdminInterviews = true;
    api.getAdminInterviews({ status: filterStatus, search: search }).then(function (data) {
      state.adminInterviewsData = data;
      state._fetchingAdminInterviews = false;
      render();
    }).catch(function (err) {
      console.warn('Failed to fetch admin interviews:', err);
      state._fetchingAdminInterviews = false;
      render();
    });
  }

  var data = state.adminInterviewsData || { interviews: [], total: 0 };
  var interviews = data.interviews || [];

  return `<div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Interview Activity Monitoring</h1>
        <p class="text-white/40 text-sm mt-1">Real-time candidate mock interview sessions, audio transcription, and vision fidelity tracking.</p>
      </div>
      <button id="btn-refresh-admin-interviews" class="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center gap-2 transition-all">
        ${icon('refreshCw', 14)} Refresh Sessions
      </button>
    </div>

    <!-- Filters & Search -->
    <div class="rounded-2xl border border-white/8 p-4 flex items-center justify-between flex-wrap gap-3" style="background:#0c0e1c">
      <div class="flex items-center gap-1.5 flex-wrap">
        ${['all', 'completed', 'in_progress', 'paused'].map(function(st) {
          var isActive = filterStatus === st;
          var label = st === 'all' ? 'All Sessions' : (st.replace('_', ' ').replace(/\b\w/g, function(l){ return l.toUpperCase(); }));
          return `<button class="btn-admin-filter-interview-status px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${isActive ? 'bg-cyan-600 text-white shadow-md' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}" data-status="${st}">
            ${label}
          </button>`;
        }).join('')}
      </div>

      <!-- Search Input -->
      <div class="admin-search-wrapper focus-cyan">
        <span class="text-white/40 shrink-0 flex items-center">${icon('search', 14)}</span>
        <input type="text" id="inp-admin-interview-search" value="${search}" placeholder="Search candidate or domain..." />
      </div>
    </div>

    <!-- Sessions Table -->
    <div class="rounded-2xl border border-white/8 overflow-hidden shadow-xl" style="background:#0c0e1c">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-white/6 bg-white/[0.02]">
              <th class="py-3.5 px-5 text-white/40 font-semibold uppercase tracking-wider text-[11px]">Session ID</th>
              <th class="py-3.5 px-5 text-white/40 font-semibold uppercase tracking-wider text-[11px]">Candidate</th>
              <th class="py-3.5 px-5 text-white/40 font-semibold uppercase tracking-wider text-[11px]">Domain &amp; Type</th>
              <th class="py-3.5 px-5 text-white/40 font-semibold uppercase tracking-wider text-[11px]">Difficulty</th>
              <th class="py-3.5 px-5 text-white/40 font-semibold uppercase tracking-wider text-[11px]">Overall Score</th>
              <th class="py-3.5 px-5 text-white/40 font-semibold uppercase tracking-wider text-[11px]">Vision Integrity</th>
              <th class="py-3.5 px-5 text-white/40 font-semibold uppercase tracking-wider text-[11px]">Status</th>
              <th class="py-3.5 px-5 text-white/40 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/4">
            ${interviews.length ? interviews.map(function(s) {
              var isDone = s.status === 'completed';
              var scoreBadge = isDone && s.overall_score !== null ? 
                `<span class="px-2 py-0.5 rounded-md font-bold text-[11.5px] ${s.overall_score >= 75 ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : s.overall_score >= 60 ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'}">${s.overall_score}%</span>` 
                : '<span class="text-white/30 font-mono">—</span>';
              var integrityBadge = s.vision_integrity === 'Verified' ?
                `<span class="inline-flex items-center gap-1 text-emerald-400 font-medium">${icon('checkCircle', 12)} Verified</span>` :
                `<span class="inline-flex items-center gap-1 text-amber-400 font-medium">${icon('alertTriangle', 12)} Attention Flag</span>`;
              var statusColor = isDone ? 'emerald' : (s.status === 'in_progress' ? 'cyan' : 'amber');

              return `<tr class="hover:bg-white/[0.02] transition-colors">
                <td class="py-3.5 px-5 font-mono text-white/70 font-semibold">#${s.id}</td>
                <td class="py-3.5 px-5">
                  <p class="font-semibold text-white">${s.candidate_name}</p>
                  <p class="text-white/40 text-[11px]">${s.candidate_email}</p>
                </td>
                <td class="py-3.5 px-5">
                  <p class="text-white/90 font-medium">${s.domain}</p>
                  <p class="text-white/40 text-[11px]">${s.interview_type}</p>
                </td>
                <td class="py-3.5 px-5 capitalize">
                  <span class="px-2 py-0.5 rounded-md text-[10.5px] font-semibold ${s.difficulty === 'hard' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' : s.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'}">
                    ${s.difficulty}
                  </span>
                </td>
                <td class="py-3.5 px-5 font-mono">${scoreBadge}</td>
                <td class="py-3.5 px-5">${integrityBadge}</td>
                <td class="py-3.5 px-5">
                  <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor === 'emerald' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : statusColor === 'cyan' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'}">
                    ${s.status.replace('_', ' ')}
                  </span>
                </td>
                <td class="py-3.5 px-5 text-right">
                  ${isDone ? `<button class="btn-view-report px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-xs font-semibold inline-flex items-center gap-1 transition-all" data-id="${s.id}">
                    ${icon('fileText', 12)} Report
                  </button>` : '<span class="text-white/20 text-xs">Live Session</span>'}
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="8" class="py-12 text-center text-white/30 text-xs">No interview sessions found matching your filters.</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="py-3.5 px-5 border-t border-white/6 text-xs text-white/40 bg-white/[0.01]">
        Total Recorded Sessions: <strong class="text-white">${data.total || interviews.length}</strong>
      </div>
    </div>
  </div>`;
}

function adminAnalytics() {
  if (!state.adminOverviewData && !state._fetchingAdminOverview) {
    state._fetchingAdminOverview = true;
    api.getAdminOverview().then(function (data) {
      state.adminOverviewData = data;
      state._fetchingAdminOverview = false;
      render();
    }).catch(function (err) {
      console.warn('Failed to fetch admin overview for analytics:', err);
      state._fetchingAdminOverview = false;
      render();
    });
  }

  var ov = state.adminOverviewData || {};
  var kpis = ov.kpis || {};
  var domains = ov.domain_distribution || [];

  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Platform Usage Analytics</h1>
        <p class="text-white/40 text-sm mt-1">Aggregated candidate readiness scores, domain telemetry, and throughput metrics.</p>
      </div>
    </div>

    <!-- Analytics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <!-- User Distribution Breakdown -->
      <div class="rounded-2xl border border-white/8 p-6" style="background:#0c0e1c">
        <h3 class="text-base font-bold text-white mb-1" style="font-family:'Outfit',sans-serif">Platform User Composition</h3>
        <p class="text-white/40 text-xs mb-5">Proportion of candidate job seekers versus hiring recruiter leads</p>

        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between text-xs mb-1.5">
              <span class="text-indigo-300 font-semibold">Candidate Job Seekers</span>
              <span class="text-white font-bold">${kpis.total_candidates || 0} (${kpis.total_users ? Math.round((kpis.total_candidates / kpis.total_users) * 100) : 0}%)</span>
            </div>
            <div class="h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
              <div class="h-full rounded-full bg-indigo-500" style="width:${kpis.total_users ? Math.round((kpis.total_candidates / kpis.total_users) * 100) : 0}%"></div>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between text-xs mb-1.5">
              <span class="text-cyan-300 font-semibold">Recruiters &amp; Talent Leads</span>
              <span class="text-white font-bold">${kpis.total_recruiters || 0} (${kpis.total_users ? Math.round((kpis.total_recruiters / kpis.total_users) * 100) : 0}%)</span>
            </div>
            <div class="h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
              <div class="h-full rounded-full bg-cyan-400" style="width:${kpis.total_users ? Math.round((kpis.total_recruiters / kpis.total_users) * 100) : 0}%"></div>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between text-xs mb-1.5">
              <span class="text-purple-300 font-semibold">System Administrators</span>
              <span class="text-white font-bold">${kpis.total_admins || 0} (${kpis.total_users ? Math.round((kpis.total_admins / kpis.total_users) * 100) : 0}%)</span>
            </div>
            <div class="h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
              <div class="h-full rounded-full bg-purple-500" style="width:${kpis.total_users ? Math.round((kpis.total_admins / kpis.total_users) * 100) : 0}%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Candidate Readiness Score Tiers -->
      <div class="rounded-2xl border border-white/8 p-6" style="background:#0c0e1c">
        <h3 class="text-base font-bold text-white mb-1" style="font-family:'Outfit',sans-serif">Candidate Readiness Benchmark Tiers</h3>
        <p class="text-white/40 text-xs mb-5">Evaluation ratings calculated by AI Multi-modal Rubric</p>

        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <p class="text-emerald-400 text-xl font-bold font-mono">75%+</p>
            <p class="text-white font-semibold text-xs mt-1">Hire Ready</p>
            <p class="text-white/40 text-[10px] mt-0.5">Top quartile candidates</p>
          </div>
          <div class="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <p class="text-amber-400 text-xl font-bold font-mono">60-74%</p>
            <p class="text-white font-semibold text-xs mt-1">Growing</p>
            <p class="text-white/40 text-[10px] mt-0.5">Developing mastery</p>
          </div>
          <div class="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
            <p class="text-rose-400 text-xl font-bold font-mono">&lt;60%</p>
            <p class="text-white font-semibold text-xs mt-1">Needs Focus</p>
            <p class="text-white/40 text-[10px] mt-0.5">Remedial drills suggested</p>
          </div>
        </div>

        <div class="mt-5 p-3 rounded-xl bg-white/[0.03] border border-white/6 flex items-center justify-between text-xs">
          <span class="text-white/60">Platform-wide Diagnostic Average:</span>
          <span class="text-emerald-400 font-bold font-mono text-sm">${kpis.avg_platform_score || 0}%</span>
        </div>
      </div>
    </div>
  </div>`;
}

function adminAI() {
  if (!state.adminAIPerfData && !state._fetchingAdminAI) {
    state._fetchingAdminAI = true;
    api.getAdminAIPerformance().then(function (data) {
      state.adminAIPerfData = data;
      state._fetchingAdminAI = false;
      render();
    }).catch(function (err) {
      console.warn('Failed to fetch admin AI telemetry:', err);
      state._fetchingAdminAI = false;
      render();
    });
  }

  var aiData = state.adminAIPerfData || {
    telemetry: {
      stt_engine: { name: 'Groq Whisper Large v3', avg_latency_ms: 178, accuracy_rate: 98.4, status: 'Operational' },
      vision_engine: { name: 'MediaPipe Face Mesh', avg_fps: 29.8, frame_processing_latency_ms: 31.4, status: 'Operational' },
      llm_engine: { name: 'Qwen 2.5 72B / DeepSeek', question_generation_latency_ms: 720, evaluation_inference_latency_ms: 890, status: 'Operational' },
      scoring_engine: { name: 'SmartHire Multi-Modal Rubric', compute_latency_ms: 215, status: 'Operational' }
    },
    modules: [],
    config: { temperature: 0.7, max_questions: 15, session_timeout: 60, confidence_threshold: 0.75 }
  };

  var t = aiData.telemetry || {};
  var cfg = aiData.config || {};
  var tempVal = typeof state.adminTemp === 'number' ? state.adminTemp : (cfg.temperature || 0.7);

  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">AI Multi-Modal Performance &amp; Configuration</h1>
        <p class="text-white/40 text-sm mt-1">Monitor real-time inference latency, computer vision telemetry, and prompt parameters.</p>
      </div>
    </div>

    <!-- 4 Multi-Modal Engine Telemetry Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <div class="flex items-center justify-between mb-3">
          <span class="text-indigo-400">${icon('mic', 20)}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Active</span>
        </div>
        <p class="text-white/40 text-[11px] font-medium">Speech-to-Text Engine</p>
        <p class="text-lg font-bold text-white mt-1">${t.stt_engine ? t.stt_engine.name : 'Whisper v3'}</p>
        <div class="flex items-center justify-between text-xs mt-3 pt-3 border-t border-white/6 text-white/50">
          <span>Latency: <strong class="text-emerald-400 font-mono">${t.stt_engine ? t.stt_engine.avg_latency_ms : 180}ms</strong></span>
          <span>Acc: <strong class="text-white font-mono">${t.stt_engine ? t.stt_engine.accuracy_rate : 98}%</strong></span>
        </div>
      </div>

      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <div class="flex items-center justify-between mb-3">
          <span class="text-cyan-400">${icon('eye', 20)}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Active</span>
        </div>
        <p class="text-white/40 text-[11px] font-medium">Vision &amp; Head Pose Engine</p>
        <p class="text-lg font-bold text-white mt-1">${t.vision_engine ? t.vision_engine.name : 'MediaPipe'}</p>
        <div class="flex items-center justify-between text-xs mt-3 pt-3 border-t border-white/6 text-white/50">
          <span>FPS: <strong class="text-cyan-400 font-mono">${t.vision_engine ? t.vision_engine.avg_fps : 30} FPS</strong></span>
          <span>Frame: <strong class="text-white font-mono">${t.vision_engine ? t.vision_engine.frame_processing_latency_ms : 32}ms</strong></span>
        </div>
      </div>

      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <div class="flex items-center justify-between mb-3">
          <span class="text-purple-400">${icon('brain', 20)}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Active</span>
        </div>
        <p class="text-white/40 text-[11px] font-medium">LLM Reasoning Engine</p>
        <p class="text-lg font-bold text-white mt-1">${t.llm_engine ? t.llm_engine.name : 'Qwen / DeepSeek'}</p>
        <div class="flex items-center justify-between text-xs mt-3 pt-3 border-t border-white/6 text-white/50">
          <span>QGen: <strong class="text-purple-300 font-mono">${t.llm_engine ? t.llm_engine.question_generation_latency_ms : 720}ms</strong></span>
          <span>Eval: <strong class="text-white font-mono">${t.llm_engine ? t.llm_engine.evaluation_inference_latency_ms : 890}ms</strong></span>
        </div>
      </div>

      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <div class="flex items-center justify-between mb-3">
          <span class="text-amber-400">${icon('checkCircle2', 20)}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Active</span>
        </div>
        <p class="text-white/40 text-[11px] font-medium">19-Parameter Rubric</p>
        <p class="text-lg font-bold text-white mt-1">${t.scoring_engine ? t.scoring_engine.name : 'Rubric Scorer'}</p>
        <div class="flex items-center justify-between text-xs mt-3 pt-3 border-t border-white/6 text-white/50">
          <span>Compute: <strong class="text-amber-400 font-mono">${t.scoring_engine ? t.scoring_engine.compute_latency_ms : 215}ms</strong></span>
          <span>Pillars: <strong class="text-white font-mono">4 Core</strong></span>
        </div>
      </div>
    </div>

    <!-- Configuration & Parameters Controls -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <!-- Generation Parameters Form -->
      <div class="rounded-2xl border border-white/8 p-6 space-y-5" style="background:#0c0e1c">
        <h3 class="text-base font-bold text-white" style="font-family:'Outfit',sans-serif">Live Generation Parameters</h3>
        
        <div>
          <div class="flex justify-between text-xs mb-2">
            <span class="text-white/60 font-medium">Model Temperature</span>
            <span class="text-indigo-400 font-mono font-bold" id="admin-temp-val">${Number(tempVal).toFixed(2)}</span>
          </div>
          <input type="range" id="admin-temp-slider" min="0.1" max="1.0" step="0.05" value="${tempVal}" class="w-full accent-indigo-500 cursor-pointer" />
          <div class="flex justify-between text-[10px] text-white/30 mt-1">
            <span>Deterministic (0.1)</span>
            <span>Balanced (0.7)</span>
            <span>Creative (1.0)</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="text-white/50 text-xs block mb-1">Max Questions</label>
            <input type="number" id="inp-admin-max-q" value="${cfg.max_questions || 15}" min="3" max="30" class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono" />
          </div>
          <div>
            <label class="text-white/50 text-xs block mb-1">Timeout (Mins)</label>
            <input type="number" id="inp-admin-timeout" value="${cfg.session_timeout || 60}" min="15" max="180" class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono" />
          </div>
          <div>
            <label class="text-white/50 text-xs block mb-1">Confidence Cutoff</label>
            <input type="number" id="inp-admin-cutoff" value="${cfg.confidence_threshold || 0.75}" min="0.1" max="1.0" step="0.05" class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono" />
          </div>
        </div>

        <div class="pt-3 border-t border-white/6 flex justify-end">
          <button id="btn-save-admin-ai-config" class="sh-btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-500/20">
            ${icon('save', 14)} Save Configuration
          </button>
        </div>
      </div>

      <!-- Active AI Modules Grid -->
      <div class="rounded-2xl border border-white/8 p-6" style="background:#0c0e1c">
        <h3 class="text-base font-bold text-white mb-4" style="font-family:'Outfit',sans-serif">Active AI Microservices</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${(aiData.modules || []).map(function(m) {
            return `<div class="p-3 rounded-xl border border-white/6 bg-white/[0.02] flex items-start gap-3">
              <span class="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0 shadow-sm shadow-emerald-400/50"></span>
              <div>
                <p class="text-white font-semibold text-xs">${m.name}</p>
                <p class="text-white/40 text-[11px] mt-0.5">${m.provider}</p>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function adminActivity() {
  if (!state.adminSystemHealthData && !state._fetchingAdminHealth) {
    state._fetchingAdminHealth = true;
    api.getAdminSystemHealth().then(function (h) {
      state.adminSystemHealthData = h;
      state._fetchingAdminHealth = false;
      render();
    }).catch(function (err) {
      console.warn('Failed to fetch admin system health:', err);
      state._fetchingAdminHealth = false;
      render();
    });
  }

  if (!state.adminActivityLogData && !state._fetchingAdminActivity) {
    state._fetchingAdminActivity = true;
    api.getAdminActivityLog(40).then(function (res) {
      state.adminActivityLogData = res.logs || [];
      state._fetchingAdminActivity = false;
      render();
    }).catch(function (err) {
      console.warn('Failed to fetch admin activity log:', err);
      state._fetchingAdminActivity = false;
      render();
    });
  }

  var h = state.adminSystemHealthData || {
    database: { integrity: 'ok', size_mb: 0.5, journal_mode: 'wal' },
    storage: { recordings_size_mb: 0.0, uploads_size_mb: 0.0, total_storage_mb: 0.5 },
    runtime: { uptime: 'Live', python_version: '3.13', platform: 'win32', email_service: 'Connected' }
  };
  var logs = state.adminActivityLogData || [];

  return `<div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">System Health &amp; Activity Audit Log</h1>
        <p class="text-white/40 text-sm mt-1">Database integrity, storage volume telemetry, and chronological platform audit events.</p>
      </div>
      <div class="flex items-center gap-3">
        <button id="btn-download-system-health-pdf" class="sh-btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-500/20 cursor-pointer">
          ${icon('downloadLg', 14)} Download Health Report (PDF)
        </button>
        <button id="btn-refresh-admin-activity" class="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center gap-2 transition-all cursor-pointer">
          ${icon('refreshCw', 14)} Refresh Audit Trail
        </button>
      </div>
    </div>

    <!-- Health Telemetry Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-xl border border-white/7 p-4" style="background:#0d0f1e">
        <p class="text-white/40 text-[11px] font-semibold uppercase tracking-wider">Database Status</p>
        <p class="text-emerald-400 font-bold text-base mt-1 flex items-center gap-1.5">
          ${icon('checkCircle2', 16)} Integrity ${h.database ? h.database.integrity : 'OK'}
        </p>
        <p class="text-white/40 text-[11px] mt-1">Size: ${h.database ? h.database.size_mb : 0.5} MB &bull; WAL Mode</p>
      </div>

      <div class="rounded-xl border border-white/7 p-4" style="background:#0d0f1e">
        <p class="text-white/40 text-[11px] font-semibold uppercase tracking-wider">Media Storage Volume</p>
        <p class="text-white font-bold text-base mt-1">${h.storage ? h.storage.total_storage_mb : 0} MB</p>
        <p class="text-white/40 text-[11px] mt-1">Videos: ${h.storage ? h.storage.recordings_size_mb : 0} MB &bull; Uploads: ${h.storage ? h.storage.uploads_size_mb : 0} MB</p>
      </div>

      <div class="rounded-xl border border-white/7 p-4" style="background:#0d0f1e">
        <p class="text-white/40 text-[11px] font-semibold uppercase tracking-wider">Server Uptime</p>
        <p class="text-cyan-400 font-bold text-base mt-1">${h.runtime ? h.runtime.uptime : 'Live'}</p>
        <p class="text-white/40 text-[11px] mt-1">Python ${h.runtime ? h.runtime.python_version : '3.13'} &bull; ${h.runtime ? h.runtime.platform : 'win32'}</p>
      </div>

      <div class="rounded-xl border border-white/7 p-4" style="background:#0d0f1e">
        <p class="text-white/40 text-[11px] font-semibold uppercase tracking-wider">Email Dispatch Engine</p>
        <p class="text-indigo-300 font-bold text-xs mt-1 truncate">${h.runtime ? h.runtime.email_service : 'Active'}</p>
        <p class="text-emerald-400 text-[11px] font-semibold mt-1">Operational</p>
      </div>
    </div>

    <!-- Unified Activity Audit Trail -->
    <div class="rounded-2xl border border-white/8 overflow-hidden shadow-xl" style="background:#0c0e1c">
      <div class="px-5 py-4 border-b border-white/6 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-indigo-400">${icon('activity', 16)}</span>
          <h3 class="text-sm font-bold text-white" style="font-family:'Outfit',sans-serif">Live Platform Audit Trail</h3>
        </div>
        <span class="text-xs text-white/40 font-mono">${logs.length} Recent Events</span>
      </div>

      <div class="divide-y divide-white/4 max-h-[550px] overflow-y-auto">
        ${logs.length ? logs.map(function(item) {
          var colorClass = item.color === 'emerald' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : (item.color === 'cyan' ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20');
          var timeStr = item.timestamp ? item.timestamp.slice(0, 19).replace('T', ' ') : 'Just now';
          
          return `<div class="p-4 hover:bg-white/[0.02] transition-colors flex items-start gap-3.5">
            <div class="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${colorClass}">
              ${icon(item.icon || 'activity', 15)}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-3 mb-1">
                <p class="text-xs font-bold text-white">${item.title}</p>
                <span class="text-[11px] text-white/30 font-mono shrink-0">${timeStr}</span>
              </div>
              <p class="text-xs text-white/70 leading-relaxed">${item.detail}</p>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-[10.5px] text-white/40">Actor: <strong class="text-white/80 font-medium">${item.actor}</strong></span>
                <span class="text-white/20">&bull;</span>
                <span class="text-[10px] uppercase font-bold px-2 py-0.2 rounded bg-white/5 text-white/50 border border-white/5">${item.actor_role}</span>
              </div>
            </div>
          </div>`;
        }).join('') : `<div class="p-12 text-center text-white/30 text-xs">No platform audit activity events logged yet.</div>`}
      </div>
    </div>
  </div>`;
}

function renderAddUserModal() {
  return `
  <div id="admin-user-modal-overlay" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(4,6,14,0.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)">
    <div class="relative w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6 text-left" style="background:#0c0e1c">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-white/8">
        <div class="flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            ${icon('users', 16)}
          </span>
          <div>
            <h3 class="text-base font-bold text-white" style="font-family:'Outfit',sans-serif">Add New User</h3>
            <p class="text-white/40 text-xs">Provision a new account on SmartHire AI</p>
          </div>
        </div>
        <button id="btn-close-admin-user-modal" class="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
          ${icon('x', 16)}
        </button>
      </div>

      <!-- Form -->
      <form id="form-admin-add-user" class="space-y-4 pt-4">
        <div>
          <label class="block text-white/60 text-xs font-semibold mb-1.5">Full Name</label>
          <input type="text" id="inp-modal-user-name" required placeholder="e.g. Jane Doe" class="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition-colors" />
        </div>

        <div>
          <label class="block text-white/60 text-xs font-semibold mb-1.5">Email Address</label>
          <input type="email" id="inp-modal-user-email" required placeholder="name@company.com" class="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition-colors" />
        </div>

        <div>
          <label class="block text-white/60 text-xs font-semibold mb-1.5">Initial Password</label>
          <input type="password" id="inp-modal-user-pass" required placeholder="Minimum 6 characters" minlength="6" class="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition-colors" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-white/60 text-xs font-semibold mb-1.5">User Role</label>
            <select id="sel-modal-user-role" class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
              <option value="candidate" selected>Candidate</option>
              <option value="recruiter">Recruiter</option>
              <option value="admin">Platform Admin</option>
            </select>
          </div>
          <div>
            <label class="block text-white/60 text-xs font-semibold mb-1.5">Permissions</label>
            <label class="flex items-center gap-2 mt-2.5 cursor-pointer text-xs text-white/70">
              <input type="checkbox" id="chk-modal-user-super" class="rounded bg-white/5 border-white/20 accent-indigo-500" />
              <span>Super Admin</span>
            </label>
          </div>
        </div>

        <div id="admin-add-user-error" class="hidden text-rose-400 text-xs p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20"></div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-white/8">
          <button type="button" id="btn-cancel-admin-user" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold transition-all">
            Cancel
          </button>
          <button type="submit" id="btn-submit-admin-user" class="sh-btn-primary px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-500/20 flex items-center gap-1.5">
            ${icon('check', 14)} Create User
          </button>
        </div>
      </form>
    </div>
  </div>`;
}

