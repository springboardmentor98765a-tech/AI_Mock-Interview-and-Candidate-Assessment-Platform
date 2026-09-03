function recruiterOverview() {
  if (state.recruiterSummaryData === null && !state._fetchingRecruiterSummary) {
    state._fetchingRecruiterSummary = true;
    api.getRecruiterSummary().then(function(data) {
      state.recruiterSummaryData = data;
      state._fetchingRecruiterSummary = false;
      render();
    }).catch(function(err) {
      console.warn('Failed to fetch recruiter summary:', err);
      state._fetchingRecruiterSummary = false;
      state.recruiterSummaryData = {
        total_candidates: 0,
        shortlisted_count: 0,
        active_live_sessions: 0,
        avg_candidate_score: 0,
        hiring_funnel: { applied: 0, assessed: 0, shortlisted: 0, under_review: 0, rejected: 0 },
        top_candidates: []
      };
      render();
    });
  }

  var summary = state.recruiterSummaryData || {
    total_candidates: 0,
    shortlisted_count: 0,
    active_live_sessions: 0,
    avg_candidate_score: 0,
    hiring_funnel: { applied: 0, assessed: 0, shortlisted: 0, under_review: 0, rejected: 0 },
    top_candidates: []
  };

  var funnel = summary.hiring_funnel || {};
  var maxFunnel = Math.max(funnel.applied || 1, 1);

  return `<div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Recruiter Dashboard</h1>
        <p class="text-white/40 text-sm mt-1">Real-time candidate evaluation, assessment scores, and live interview monitoring.</p>
      </div>
      <div class="flex items-center gap-3">
        <button id="btn-refresh-recruiter" class="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center gap-2 transition-all">
          ${icon('refreshCw', 14)} Refresh Data
        </button>
      </div>
    </div>

    <!-- Live Stat Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-xl border border-white/7 p-5 flex items-center gap-4 shadow-lg" style="background:#0d0f1e">
        <div class="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
          ${icon('users', 22)}
        </div>
        <div>
          <p class="text-white/40 text-xs font-semibold uppercase tracking-wider">Total Candidates</p>
          <p class="text-2xl font-bold text-white mt-0.5" style="font-family:'Outfit',sans-serif">${summary.total_candidates}</p>
        </div>
      </div>

      <div class="rounded-xl border border-white/7 p-5 flex items-center gap-4 shadow-lg" style="background:#0d0f1e">
        <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          ${icon('checkCircle', 22)}
        </div>
        <div>
          <p class="text-white/40 text-xs font-semibold uppercase tracking-wider">Shortlisted</p>
          <p class="text-2xl font-bold text-emerald-400 mt-0.5" style="font-family:'Outfit',sans-serif">${summary.shortlisted_count}</p>
        </div>
      </div>

      <div class="rounded-xl border border-white/7 p-5 flex items-center gap-4 shadow-lg" style="background:#0d0f1e">
        <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          ${icon('monitorPlay', 22)}
        </div>
        <div>
          <p class="text-white/40 text-xs font-semibold uppercase tracking-wider">Active Live Sessions</p>
          <div class="flex items-center gap-2 mt-0.5">
            <p class="text-2xl font-bold text-amber-400" style="font-family:'Outfit',sans-serif">${summary.active_live_sessions}</p>
            ${summary.active_live_sessions > 0 ? '<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>' : ''}
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-white/7 p-5 flex items-center gap-4 shadow-lg" style="background:#0d0f1e">
        <div class="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          ${icon('award', 22)}
        </div>
        <div>
          <p class="text-white/40 text-xs font-semibold uppercase tracking-wider">Avg. Candidate Score</p>
          <p class="text-2xl font-bold text-indigo-300 mt-0.5" style="font-family:'Outfit',sans-serif">${summary.avg_candidate_score}%</p>
        </div>
      </div>
    </div>

    <!-- Main Grid: Hiring Funnel + Top Candidates -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Hiring Funnel Breakdown -->
      <div class="lg:col-span-2 rounded-xl border border-white/7 p-6 space-y-5" style="background:#0d0f1e">
        <div class="flex items-center justify-between border-b border-white/6 pb-4">
          <div>
            <h3 class="text-white font-bold text-base" style="font-family:'Outfit',sans-serif">Candidate Hiring Pipeline</h3>
            <p class="text-white/40 text-xs mt-0.5">Real-time candidate progression from application to shortlisting</p>
          </div>
          <span class="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">Live Pipeline</span>
        </div>

        <div class="space-y-4">
          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <span class="text-white/80 font-medium flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-cyan-400"></span> Total Registered Candidates</span>
              <span class="text-white font-semibold">${funnel.applied || 0}</span>
            </div>
            <div class="w-full h-3 rounded-full bg-white/5 overflow-hidden">
              <div class="h-full bg-cyan-500 rounded-full transition-all duration-500" style="width:${Math.round(((funnel.applied || 0)/maxFunnel)*100)}%"></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <span class="text-white/80 font-medium flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-indigo-400"></span> Completed Assessments / Interviews</span>
              <span class="text-white font-semibold">${funnel.assessed || 0}</span>
            </div>
            <div class="w-full h-3 rounded-full bg-white/5 overflow-hidden">
              <div class="h-full bg-indigo-500 rounded-full transition-all duration-500" style="width:${Math.round(((funnel.assessed || 0)/maxFunnel)*100)}%"></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <span class="text-white/80 font-medium flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> Shortlisted Candidates</span>
              <span class="text-white font-semibold">${funnel.shortlisted || 0}</span>
            </div>
            <div class="w-full h-3 rounded-full bg-white/5 overflow-hidden">
              <div class="h-full bg-emerald-500 rounded-full transition-all duration-500" style="width:${Math.round(((funnel.shortlisted || 0)/maxFunnel)*100)}%"></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <span class="text-white/80 font-medium flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-amber-400"></span> Under Review</span>
              <span class="text-white font-semibold">${funnel.under_review || 0}</span>
            </div>
            <div class="w-full h-3 rounded-full bg-white/5 overflow-hidden">
              <div class="h-full bg-amber-500 rounded-full transition-all duration-500" style="width:${Math.round(((funnel.under_review || 0)/maxFunnel)*100)}%"></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-xs mb-1.5">
              <span class="text-white/80 font-medium flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-rose-400"></span> Rejected</span>
              <span class="text-white font-semibold">${funnel.rejected || 0}</span>
            </div>
            <div class="w-full h-3 rounded-full bg-white/5 overflow-hidden">
              <div class="h-full bg-rose-500 rounded-full transition-all duration-500" style="width:${Math.round(((funnel.rejected || 0)/maxFunnel)*100)}%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Candidates Spotlight -->
      <div class="rounded-xl border border-white/7 p-6 space-y-4 flex flex-col justify-between" style="background:#0d0f1e">
        <div>
          <div class="flex items-center justify-between border-b border-white/6 pb-4 mb-4">
            <h3 class="text-white font-bold text-base" style="font-family:'Outfit',sans-serif">Top Performers</h3>
            <span class="text-xs text-indigo-400 font-semibold">AI Ranked</span>
          </div>

          ${summary.top_candidates.length ? `<div class="space-y-3">
            ${summary.top_candidates.map(function(c, idx) {
              var statusBadge = c.status === 'shortlisted' ? '<span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">Shortlisted</span>' :
                                c.status === 'rejected' ? '<span class="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">Rejected</span>' :
                                c.status === 'under_review' ? '<span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">Review</span>' :
                                '<span class="px-2 py-0.5 rounded bg-white/5 text-white/50 border border-white/10 text-[10px]">New</span>';

              return `<div class="p-3 rounded-xl border border-white/6 flex items-center justify-between hover:border-indigo-500/30 transition-all" style="background:#141627">
                <div class="flex items-center gap-3">
                  <div class="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/30">#${idx + 1}</div>
                  <div>
                    <p class="text-white text-xs font-semibold">${c.name}</p>
                    <p class="text-white/40 text-[11px]">${c.domain} &bull; ${c.total_sessions} sessions</p>
                  </div>
                </div>
                <div class="text-right flex flex-col items-end gap-1">
                  <span class="text-xs font-bold text-emerald-400">${c.overall_score}%</span>
                  ${statusBadge}
                </div>
              </div>`;
            }).join('')}
          </div>` : `<div class="flex flex-col items-center justify-center py-10 text-center text-white/30 text-xs">
            <p>No candidate evaluations completed yet.</p>
          </div>`}
        </div>

        <button id="btn-goto-candidates" class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20">
          View All Candidates
        </button>
      </div>
    </div>
  </div>`;
}


// 2. Candidate roster and shortlisting management
function recruiterCandidates() {
  if (state.recruiterCandidatesData === null && !state._fetchingRecruiterCandidates) {
    state._fetchingRecruiterCandidates = true;
    api.getRecruiterCandidates({ search: state.recruiterCandidatesSearch, status_filter: state.recruiterCandidatesStatusFilter }).then(function(data) {
      state.recruiterCandidatesData = data.candidates || [];
      state._fetchingRecruiterCandidates = false;
      render();
    }).catch(function(err) {
      console.warn('Failed to fetch candidates:', err);
      state._fetchingRecruiterCandidates = false;
      state.recruiterCandidatesData = [];
      render();
    });
  }

  var candidates = state.recruiterCandidatesData || [];

  return `<div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Candidate Directory</h1>
        <p class="text-white/40 text-sm mt-1">Review candidate AI interview ratings, scores, and manage shortlisting status.</p>
      </div>

    <!-- Search & Filter Controls -->
      <div class="flex items-center gap-3">
        <!-- Search -->
        <div class="relative w-64">
          <input id="inp-candidate-search" type="text" value="${state.recruiterCandidatesSearch || ''}" placeholder="Search candidate..." class="w-full px-4 py-2.5 pl-9 rounded-xl bg-[#0d0f1e] border border-white/12 text-white text-xs placeholder-white/40 focus:outline-none focus:border-indigo-500 transition-all shadow-inner" />
          <div class="absolute left-3 top-3 text-white/40 pointer-events-none">${icon('search', 14)}</div>
        </div>

        <!-- Filter Tabs -->
        <select id="sel-candidate-status-filter" class="px-4 py-2.5 rounded-xl bg-[#0d0f1e] border border-white/12 text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer shadow-inner">
          <option value="all" ${state.recruiterCandidatesStatusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
          <option value="shortlisted" ${state.recruiterCandidatesStatusFilter === 'shortlisted' ? 'selected' : ''}>Shortlisted</option>
          <option value="under_review" ${state.recruiterCandidatesStatusFilter === 'under_review' ? 'selected' : ''}>Under Review</option>
          <option value="rejected" ${state.recruiterCandidatesStatusFilter === 'rejected' ? 'selected' : ''}>Rejected</option>
          <option value="new" ${state.recruiterCandidatesStatusFilter === 'new' ? 'selected' : ''}>New / Unclassified</option>
        </select>
      </div>
    </div>

    <!-- Candidates Table -->
    <div class="rounded-xl border border-white/7 overflow-hidden shadow-xl" style="background:#0d0f1e">
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left">
          <thead>
            <tr class="border-b border-white/8 bg-[#090a15] text-white/40 uppercase tracking-wider font-semibold">
              <th class="p-4 px-5">Candidate</th>
              <th class="p-4 px-5">Target Domain</th>
              <th class="p-4 px-5 text-center">Tech Score</th>
              <th class="p-4 px-5 text-center">Assessment</th>
              <th class="p-4 px-5 text-center">Overall</th>
              <th class="p-4 px-5 text-center">Status</th>
              <th class="p-4 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/6 text-white/80">
            ${candidates.length ? candidates.map(function(c) {
              var isSelectedForCompare = (state.recruiterCompareSelectedIds || []).includes(c.id);

              var statusBadge = c.status === 'shortlisted' ? '<span class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px]">Shortlisted</span>' :
                                c.status === 'rejected' ? '<span class="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold text-[11px]">Rejected</span>' :
                                c.status === 'under_review' ? '<span class="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold text-[11px]">Under Review</span>' :
                                '<span class="px-2.5 py-1 rounded-full bg-white/5 text-white/50 border border-white/10 text-[11px]">New</span>';

              var scoreColor = c.overall_score >= 80 ? 'text-emerald-400' : c.overall_score >= 60 ? 'text-indigo-300' : 'text-white/60';

              return `<tr class="hover:bg-white/[0.02] transition-colors">
                <td class="p-4 px-5">
                  <div class="flex items-center gap-3">
                    <input type="checkbox" class="chk-compare-candidate w-4 h-4 rounded border-white/20 text-indigo-600 focus:ring-0 cursor-pointer" data-id="${c.id}" ${isSelectedForCompare ? 'checked' : ''} />
                    <div class="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 font-bold flex items-center justify-center text-xs shrink-0">
                      ${c.name.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p class="font-semibold text-white text-xs">${c.name}</p>
                      <p class="text-white/40 text-[11px]">${c.email}</p>
                    </div>
                  </div>
                </td>

                <td class="p-4 px-5">
                  <span class="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80 font-medium">${c.domain}</span>
                </td>

                <td class="p-4 px-5 text-center font-semibold text-white/90">
                  ${c.technical_score ? c.technical_score + '%' : '—'}
                </td>

                <td class="p-4 px-5 text-center font-semibold text-white/90">
                  ${c.assessment_score ? c.assessment_score + '%' : '—'}
                </td>

                <td class="p-4 px-5 text-center">
                  <span class="font-bold text-sm ${scoreColor}">${c.overall_score ? c.overall_score + '%' : 'N/A'}</span>
                </td>

                <td class="p-4 px-5 text-center">
                  ${statusBadge}
                </td>

                <td class="p-4 px-5 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button class="btn-shortlist-candidate px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-xs transition-all cursor-pointer flex items-center gap-1" data-id="${c.id}" data-status="shortlisted" title="Shortlist Candidate">
                      Shortlist
                    </button>
                    <button class="btn-shortlist-candidate px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium transition-all cursor-pointer" data-id="${c.id}" data-status="under_review" title="Mark Under Review">
                      Review
                    </button>
                    <button class="btn-shortlist-candidate px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-medium transition-all cursor-pointer" data-id="${c.id}" data-status="rejected" title="Reject Candidate">
                      Reject
                    </button>
                  </div>
                </td>
              </tr>`;
            }).join('') : `<tr>
              <td colspan="7" class="p-12 text-center text-white/30 text-xs">
                No candidates matched your search or status filter.
              </td>
            </tr>`}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}


// 3. Candidate comparison matrix
function recruiterCompare() {
  var selectedIds = state.recruiterCompareSelectedIds || [];

  if (selectedIds.length > 0 && state.recruiterCompareData === null && !state._fetchingCompare) {
    state._fetchingCompare = true;
    api.getRecruiterCompare(selectedIds).then(function(data) {
      state.recruiterCompareData = data.comparison || [];
      state._fetchingCompare = false;
      render();
    }).catch(function(err) {
      console.warn('Failed to fetch compare:', err);
      state._fetchingCompare = false;
      state.recruiterCompareData = [];
      render();
    });
  }

  var comparison = state.recruiterCompareData || [];
  var candidatesList = state.recruiterCandidatesData || [];

  return `<div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Candidate Comparison Tool</h1>
        <p class="text-white/40 text-sm mt-1">Side-by-side evaluation of technical skills, communication, and AI match fit.</p>
      </div>

      ${selectedIds.length ? `<button id="btn-clear-compare" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/12 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer">${icon('x', 14)} Clear Selection (${selectedIds.length})</button>` : ''}
    </div>

    <!-- Candidate Selector Grid -->
    <div class="p-5 rounded-xl border border-white/7 space-y-3" style="background:#0d0f1e">
      <p class="text-white/60 text-xs font-semibold uppercase tracking-wider">Select Candidates to Compare (Select up to 4):</p>
      <div class="flex flex-wrap items-center gap-3">
        ${candidatesList.length ? candidatesList.map(function(cand) {
          var isChecked = selectedIds.includes(cand.id);
          return `<label class="px-3.5 py-2 rounded-xl border ${isChecked ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/10' : 'border-white/10 bg-white/5 text-white/60'} text-xs font-medium flex items-center gap-2 cursor-pointer transition-all hover:border-indigo-500/50">
            <input type="checkbox" class="chk-compare-select w-4 h-4 rounded border-white/20 text-indigo-600 focus:ring-0 cursor-pointer" data-id="${cand.id}" ${isChecked ? 'checked' : ''} />
            <span>${cand.name}</span>
          </label>`;
        }).join('') : '<p class="text-white/30 text-xs">No registered candidates available for comparison.</p>'}
      </div>
    </div>

    <!-- Comparison Cards Grid -->
    ${comparison.length ? `<div class="grid grid-cols-1 md:grid-cols-${Math.min(comparison.length, 3)} gap-6">
      ${comparison.map(function(c) {
        return `<div class="rounded-xl border border-white/10 p-6 space-y-5 shadow-xl flex flex-col justify-between" style="background:#0d0f1e">
          <div class="space-y-4">
            <!-- Candidate Header -->
            <div class="flex items-center justify-between border-b border-white/6 pb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 font-bold flex items-center justify-center text-sm">
                  ${c.name.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <h3 class="text-white font-bold text-sm" style="font-family:'Outfit',sans-serif">${c.name}</h3>
                  <p class="text-white/40 text-xs">${c.domain}</p>
                </div>
              </div>
              <span class="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">${c.overall_score}% Overall</span>
            </div>

            <!-- Parameters Grid -->
            <div class="space-y-3 text-xs">
              <div>
                <div class="flex justify-between text-white/70 mb-1"><span>Technical Proficiency</span> <strong class="text-white">${c.technical_score}%</strong></div>
                <div class="w-full h-2 rounded-full bg-white/5 overflow-hidden"><div class="h-full bg-indigo-500 rounded-full" style="width:${c.technical_score}%"></div></div>
              </div>

              <div>
                <div class="flex justify-between text-white/70 mb-1"><span>Communication Skill</span> <strong class="text-white">${c.communication_score}%</strong></div>
                <div class="w-full h-2 rounded-full bg-white/5 overflow-hidden"><div class="h-full bg-cyan-500 rounded-full" style="width:${c.communication_score}%"></div></div>
              </div>

              <div>
                <div class="flex justify-between text-white/70 mb-1"><span>Confidence & Delivery</span> <strong class="text-white">${c.confidence_score}%</strong></div>
                <div class="w-full h-2 rounded-full bg-white/5 overflow-hidden"><div class="h-full bg-emerald-500 rounded-full" style="width:${c.confidence_score}%"></div></div>
              </div>

              <div>
                <div class="flex justify-between text-white/70 mb-1"><span>Practice Assessment</span> <strong class="text-white">${c.assessment_score}%</strong></div>
                <div class="w-full h-2 rounded-full bg-white/5 overflow-hidden"><div class="h-full bg-amber-500 rounded-full" style="width:${c.assessment_score}%"></div></div>
              </div>
            </div>

            <!-- AI Recruitment Recommendation -->
            <div class="p-3.5 rounded-xl border border-white/6 text-xs space-y-1" style="background:#141627">
              <p class="text-indigo-300 font-semibold flex items-center gap-1.5">${icon('brain', 14)} AI Hiring Recommendation:</p>
              <p class="text-white/80 leading-relaxed">${c.ai_recommendation}</p>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="pt-2 flex items-center gap-2">
            <button class="btn-shortlist-candidate w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5" data-id="${c.id}" data-status="shortlisted">
              ${icon('checkCircle', 14)} Shortlist Candidate
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>` : `<div class="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-white/7 p-8" style="background:#0d0f1e">
      <div class="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/30 mb-3">${icon('barChart2', 28)}</div>
      <h3 class="text-white font-semibold text-base mb-1">Select Candidates to Compare</h3>
      <p class="text-white/40 text-xs max-w-md">Check 2 or more candidates above or from the Candidate Directory to view a detailed side-by-side skill evaluation.</p>
    </div>`}
  </div>`;
}


// 4. Sessions tracker
function recruiterSessions() {
  if (state.recruiterSessionsData === null && !state._fetchingSessions) {
    state._fetchingSessions = true;
    api.getRecruiterSessions(state.recruiterSessionsStatusFilter).then(function(data) {
      state.recruiterSessionsData = data.sessions || [];
      state._fetchingSessions = false;
      render();
    }).catch(function(err) {
      console.warn('Failed to fetch recruiter sessions:', err);
      state._fetchingSessions = false;
      state.recruiterSessionsData = [];
      render();
    });
  }

  var sessions = state.recruiterSessionsData || [];

  return `<div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Interview Sessions Directory</h1>
        <p class="text-white/40 text-sm mt-1">Real-time status tracking for all candidate interviews (Live, Completed, Paused).</p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Status Filter Dropdown -->
        <select id="sel-sessions-status-filter" class="px-4 py-2.5 rounded-xl bg-[#0d0f1e] border border-white/12 text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer shadow-inner">
          <option value="all" ${state.recruiterSessionsStatusFilter === 'all' ? 'selected' : ''}>All Sessions</option>
          <option value="live" ${state.recruiterSessionsStatusFilter === 'live' ? 'selected' : ''}>Live / In Progress</option>
          <option value="completed" ${state.recruiterSessionsStatusFilter === 'completed' ? 'selected' : ''}>Completed / Done</option>
          <option value="paused" ${state.recruiterSessionsStatusFilter === 'paused' ? 'selected' : ''}>Paused</option>
          <option value="created" ${state.recruiterSessionsStatusFilter === 'created' ? 'selected' : ''}>Created / Unstarted</option>
        </select>

        <button id="btn-refresh-sessions" class="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center gap-2 transition-all cursor-pointer">
          ${icon('refreshCw', 14)} Refresh Feed
        </button>
      </div>
    </div>

    <!-- Active Sessions Grid -->
    ${sessions.length ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      ${sessions.map(function(s) {
        var elapsedMin = Math.floor((s.elapsed_seconds || 0) / 60);
        var elapsedSec = (s.elapsed_seconds || 0) % 60;
        var timeStr = elapsedMin + 'm ' + String(elapsedSec).padStart(2, '0') + 's';

        var statusBadge = s.status === 'completed' ? '<span class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> COMPLETED</span>' :
                          s.status === 'in_progress' ? '<span class="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> IN PROGRESS</span>' :
                          s.status === 'paused' ? '<span class="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider">PAUSED</span>' :
                          '<span class="px-2.5 py-1 rounded-full bg-white/5 text-white/50 border border-white/10 text-[10px] uppercase">CREATED</span>';

        return `<div class="rounded-xl border ${s.status === 'in_progress' ? 'border-amber-500/30' : 'border-white/10'} p-6 space-y-4 shadow-xl relative overflow-hidden flex flex-col justify-between" style="background:#0d0f1e">
          <div>
            <div class="flex items-center justify-between border-b border-white/6 pb-4 mb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 font-bold flex items-center justify-center text-sm shrink-0">
                  ${s.candidate_name.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <h3 class="text-white font-bold text-sm" style="font-family:'Outfit',sans-serif">${s.candidate_name}</h3>
                  <p class="text-white/40 text-xs">${s.candidate_email}</p>
                </div>
              </div>
              ${statusBadge}
            </div>

            <div class="space-y-3 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-white/80 font-semibold uppercase tracking-wider text-[11px]">${s.interview_type}</span>
                <span class="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-indigo-300 font-medium">${s.domain}</span>
              </div>

              <div class="p-3 rounded-lg border border-white/6 space-y-1.5" style="background:#141627">
                <div class="flex justify-between text-white/60"><span>Session ID:</span> <strong class="text-indigo-300">#${s.session_id}</strong></div>
                <div class="flex justify-between text-white/60"><span>Questions:</span> <span class="text-white">${s.total_questions} Questions</span></div>
                ${s.overall_score ? `<div class="flex justify-between text-white/60"><span>Overall Score:</span> <strong class="text-emerald-400 font-bold">${s.overall_score}%</strong></div>` : ''}
                ${s.status === 'in_progress' ? `<div class="flex justify-between text-white/60"><span>Elapsed Time:</span> <strong class="text-amber-300 font-mono">${timeStr}</strong></div>` : ''}
                <div class="flex justify-between text-white/60"><span>Date:</span> <span class="text-white/80">${formatDateTime(s.created_at)}</span></div>
              </div>
            </div>
          </div>

          <!-- Session Actions -->
          <div class="pt-3 border-t border-white/6 flex items-center gap-2">
            <button class="btn-play-video w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer" data-session-id="${s.session_id}" data-rec-id="${s.recording_id || ''}">
              ${icon('play', 14)} Watch Video
            </button>

            ${s.status === 'completed' ? `<button class="btn-view-report w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer" data-id="${s.session_id}">
              ${icon('fileText', 14)} View Report
            </button>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>` : `<div class="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-white/7 p-8" style="background:#0d0f1e">
      <div class="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/30 mb-3">${icon('monitorPlay', 28)}</div>
      <h3 class="text-white font-semibold text-base mb-1">No Sessions Found</h3>
      <p class="text-white/40 text-xs max-w-md">No candidate interview sessions match the selected status filter in the database.</p>
    </div>`}
  </div>`;
}


// 5. Interview templates
function recruiterTemplates() {
  if (state.recruiterTemplatesData === null && !state._fetchingTemplates) {
    state._fetchingTemplates = true;
    api.getRecruiterTemplates().then(function(data) {
      state.recruiterTemplatesData = data.templates || [];
      state._fetchingTemplates = false;
      render();
    }).catch(function(err) {
      console.warn('Failed to fetch templates:', err);
      state._fetchingTemplates = false;
      state.recruiterTemplatesData = [];
      render();
    });
  }

  var templates = state.recruiterTemplatesData || [];
  var modalHtml = state.showCreateTemplateModal ? renderCreateTemplateModal() : '';

  return `<div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Interview Templates</h1>
        <p class="text-white/40 text-sm mt-1">Configure and manage preset interview rounds, topic guidelines, and question criteria stored in database.</p>
      </div>
      <button id="btn-open-create-template" class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all cursor-pointer" style="background:${CYAN}">
        ${icon('plusCircle', 14)} Create New Template
      </button>
    </div>

    <!-- Templates Grid -->
    ${templates.length ? `<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      ${templates.map(function(tpl) {
        var badgeColor = tpl.interview_type.indexOf('Technical') !== -1 ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' :
                         tpl.interview_type.indexOf('Behavioral') !== -1 ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' :
                         'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';

        return `<div class="p-5 rounded-xl border border-white/10 space-y-4 flex flex-col justify-between shadow-lg" style="background:#0d0f1e">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-1 rounded border text-xs font-semibold ${badgeColor}">${tpl.interview_type}</span>
              <span class="text-white/40 text-xs">${tpl.num_questions} Questions &bull; ${tpl.duration_minutes}m</span>
            </div>

            <div>
              <h3 class="text-white font-bold text-base" style="font-family:'Outfit',sans-serif">${tpl.title}</h3>
              <p class="text-white/40 text-xs mt-1 leading-relaxed">${tpl.description || 'Custom interview template preset.'}</p>
            </div>

            <!-- Topics -->
            ${tpl.topics && tpl.topics.length ? `<div class="flex flex-wrap gap-2 pt-2 pb-1">
              ${tpl.topics.map(function(t) { return `<span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80 text-[11px] font-medium shrink-0 mb-1">${t}</span>`; }).join('')}
            </div>` : ''}
          </div>

          <div class="pt-3 border-t border-white/8 flex items-center justify-between mt-2">
            <span class="text-[11px] text-white/50 capitalize font-medium">${tpl.domain} &bull; ${tpl.difficulty}</span>
            ${!tpl.is_system ? `<button class="btn-delete-template text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer" data-id="${tpl.id}">
              ${icon('trash', 12)} Delete
            </button>` : '<span class="text-[11px] text-white/40 font-medium">System Preset</span>'}
          </div>
        </div>`;
      }).join('')}
    </div>` : `<div class="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-white/7 p-8" style="background:#0d0f1e">
      <div class="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/30 mb-3">${icon('layers', 28)}</div>
      <h3 class="text-white font-semibold text-base mb-1">No Templates Found</h3>
      <p class="text-white/40 text-xs max-w-md">Click "Create New Template" to configure a custom interview preset.</p>
    </div>`}
  </div>${modalHtml}`;
}

// Create template modal
function renderCreateTemplateModal() {
  return `<div id="template-modal-overlay" class="fixed inset-0 top-0 left-0 w-full h-full z-[99999] flex items-center justify-center p-4 sm:p-6" style="background:rgba(4,6,14,0.85);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)">
    <div id="template-modal-container" class="relative w-full max-w-lg rounded-2xl border border-white/12 overflow-hidden shadow-2xl space-y-0 animate-in fade-in zoom-in-95 duration-200" style="background:#0d0f1e">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-white/8 flex items-center justify-between" style="background:#090a15">
        <h3 class="text-white font-bold text-base" style="font-family:'Outfit',sans-serif">Create Interview Template</h3>
        <button id="btn-close-template-modal" class="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors text-xl font-bold cursor-pointer">&times;</button>
      </div>

      <!-- Form -->
      <div class="p-6 space-y-4 text-xs">
        <div>
          <label class="block text-white/70 font-medium mb-1">Template Title *</label>
          <input id="inp-tpl-title" type="text" placeholder="e.g. Senior Frontend Developer" class="w-full px-4 py-2.5 rounded-xl bg-[#141627] border border-white/12 text-white text-xs placeholder-white/30 focus:outline-none focus:border-indigo-500" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-white/70 font-medium mb-1">Interview Type *</label>
            <select id="sel-tpl-type" class="w-full px-4 py-2.5 rounded-xl bg-[#141627] border border-white/12 text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer">
              <option value="Technical Interview">Technical Interview</option>
              <option value="Behavioral Interview">Behavioral Interview</option>
              <option value="System Design">System Design</option>
              <option value="HR Screening">HR Screening</option>
            </select>
          </div>

          <div>
            <label class="block text-white/70 font-medium mb-1">Target Domain</label>
            <input id="inp-tpl-domain" type="text" placeholder="e.g. Software Engineering" class="w-full px-4 py-2.5 rounded-xl bg-[#141627] border border-white/12 text-white text-xs placeholder-white/30 focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-white/70 font-medium mb-1">Difficulty</label>
            <select id="sel-tpl-difficulty" class="w-full px-4 py-2.5 rounded-xl bg-[#141627] border border-white/12 text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer">
              <option value="easy">Easy</option>
              <option value="medium" selected>Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label class="block text-white/70 font-medium mb-1">Duration (Min)</label>
            <input id="inp-tpl-duration" type="number" value="15" min="5" max="60" class="w-full px-4 py-2.5 rounded-xl bg-[#141627] border border-white/12 text-white text-xs focus:outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label class="block text-white/70 font-medium mb-1">Num Questions</label>
            <input id="inp-tpl-questions" type="number" value="5" min="1" max="15" class="w-full px-4 py-2.5 rounded-xl bg-[#141627] border border-white/12 text-white text-xs focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div>
          <label class="block text-white/70 font-medium mb-1">Key Topics (Comma separated)</label>
          <input id="inp-tpl-topics" type="text" placeholder="e.g. React, JavaScript, Performance, State Management" class="w-full px-4 py-2.5 rounded-xl bg-[#141627] border border-white/12 text-white text-xs placeholder-white/30 focus:outline-none focus:border-indigo-500" />
        </div>

        <div>
          <label class="block text-white/70 font-medium mb-1">Description / Guidelines</label>
          <textarea id="inp-tpl-desc" rows="2" placeholder="Brief description of evaluation criteria..." class="w-full px-4 py-2.5 rounded-xl bg-[#141627] border border-white/12 text-white text-xs placeholder-white/30 focus:outline-none focus:border-indigo-500 resize-none"></textarea>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-white/8 flex items-center justify-end gap-3" style="background:#090a15">
        <button id="btn-cancel-template" class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all cursor-pointer">
          Cancel
        </button>
        <button id="btn-submit-create-template" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2">
          ${icon('checkCircle', 14)} Save Template
        </button>
      </div>

    </div>
  </div>`;
}
