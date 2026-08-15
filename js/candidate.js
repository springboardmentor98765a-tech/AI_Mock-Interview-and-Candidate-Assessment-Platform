/* ── Candidate Sections ── */
function candidateOverview() {
  var userName = state.user ? state.user.name.split(' ')[0] : 'Candidate';
  if (!state.analyticsData) {
    api.getAnalyticsSummary().then(function(data) {
      state.analyticsData = data;
      render();
    }).catch(function() {});
  }
  var data = state.analyticsData || { sessions_completed: 0 };
  var hasData = data.sessions_completed > 0;
  var overall = data.avg_overall || 0;
  var activeRating = data.performance_rating || reportScoreRating(overall);
  var ratingColor = activeRating === 'Excellent' ? EMERALD : activeRating === 'Good' ? INDIGO : activeRating === 'Average' ? AMBER : ROSE;
  var history = data.history || [];
  var modalHtml = state.activeReportModal ? renderReportModal(state.activeReportModal) : '';

  var rubricTiers = [
    { range: '90–100%', label: 'Excellent', text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', activeBg: 'background:rgba(16,185,129,0.22);border:1.5px solid #10b981' },
    { range: '75–89%', label: 'Good', text: 'text-indigo-300', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', activeBg: 'background:rgba(99,102,241,0.22);border:1.5px solid #818cf8' },
    { range: '60–74%', label: 'Average', text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/20', activeBg: 'background:rgba(245,158,11,0.22);border:1.5px solid #fbbf24' },
    { range: '40–59%', label: 'Needs Improvement', text: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/20', activeBg: 'background:rgba(244,63,94,0.22);border:1.5px solid #f43f5e' },
    { range: 'Below 40%', label: 'Poor', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', activeBg: 'background:rgba(225,29,72,0.25);border:1.5px solid #f43f5e' },
  ];

  return `<div class="space-y-6">
    <div><h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Good day, ${userName} 👋</h1><p class="text-white/40 text-sm mt-1">Welcome to your SmartHire AI evaluation dashboard.</p></div>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      ${statCard(icon('play', 18), 'Sessions Completed', String(data.sessions_completed), null, INDIGO)}
      ${statCard(icon('star', 18), 'Avg. Score', hasData ? overall.toFixed(1) + '%' : '—', null, CYAN)}
      ${statCard(icon('activity', 18), 'Rating Rubric', activeRating || '—', null, ratingColor)}
      ${statCard(icon('award', 18), 'Top Parameter', data.top_skill || '—', null, AMBER)}
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <div class="flex items-center justify-between mb-4">
          <div><p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Assessment Breakdown</p><p class="text-white/35 text-xs mt-0.5">${hasData ? 'Weighted parameter scores across completed sessions' : 'No evaluation data yet'}</p></div>
          ${hasData ? renderRubricBadge(activeRating, overall) : ''}
        </div>
        ${hasData ? `<div class="space-y-3 pt-2">
          ${[
            { name: 'Communication Score (30%)', val: data.avg_communication || 0, col: INDIGO },
            { name: 'Confidence Score (25%)', val: data.avg_confidence || 0, col: CYAN },
            { name: 'Technical Relevance (30%)', val: data.avg_technical || 0, col: EMERALD },
            { name: 'Professionalism (15%)', val: data.avg_professionalism || 0, col: AMBER },
          ].map(function(d) {
            return `<div>
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-white/80 font-medium">${d.name}</span>
                <span class="text-white font-bold">${d.val.toFixed(1)}%</span>
              </div>
              <div class="w-full h-2 rounded-full bg-white/6 overflow-hidden">
                <div class="h-full rounded-full" style="width:${Math.min(100, Math.max(0, d.val))}%;background:${d.col}"></div>
              </div>
            </div>`;
          }).join('')}
        </div>` : `<div class="flex flex-col items-center justify-center h-40 text-center"><p class="text-white/30 text-sm">Complete your first interview session to unlock assessment trends.</p></div>`}
      </div>
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-1" style="font-family:'Outfit',sans-serif">Rubric Scale</p>
        <p class="text-white/35 text-xs mb-3">Evaluation grading rubric</p>
        <div class="space-y-2 text-xs">
          ${rubricTiers.map(function(rub) {
            var isCurrent = hasData && (activeRating === rub.label);
            var styleAttr = isCurrent ? rub.activeBg : '';
            var classAttr = isCurrent
              ? 'p-2 rounded flex items-center justify-between font-bold text-white shadow-lg transition-all'
              : 'p-2 rounded ' + rub.bg + ' border ' + rub.border + ' ' + rub.text + ' flex justify-between font-medium transition-all';
            return `<div class="${classAttr}" style="${styleAttr}">
              <span>${rub.range}</span>
              <span class="flex items-center gap-1.5">
                ${isCurrent ? `<span class="px-1.5 py-0.5 rounded text-[10px] uppercase font-extrabold bg-white/20 text-white">Current</span>` : ''}
                ${rub.label}
              </span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <div class="flex items-center justify-between mb-4">
        <p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Recent Evaluation Reports</p>
      </div>
      ${history.length ? `<div class="space-y-3">
        ${history.slice(0, 3).map(function(h) {
          var s = h.overall_score || h.total_score || 0;
          return `<div class="flex items-center justify-between p-3.5 rounded-lg border border-white/6 bg-white/[0.01]">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-white font-semibold text-sm uppercase">${h.interview_type} Interview</span>
                ${renderRubricBadge(h.performance_rating, s)}
              </div>
              <p class="text-white/40 text-xs mt-0.5">${h.domain || 'General Domain'} &bull; ${formatDateTime(h.completed_at || h.created_at)}</p>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-white font-bold text-base">${s.toFixed(1)}%</span>
              <button class="btn-view-report text-xs px-3 py-1.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 font-semibold" data-id="${h.id}">View AI Report</button>
            </div>
          </div>`;
        }).join('')}
      </div>` : `<div class="flex flex-col items-center justify-center py-8 text-center"><p class="text-white/30 text-sm">No sessions yet. Start a mock interview to begin.</p></div>`}
    </div>
  </div>${modalHtml}`;
}

var INTERVIEW_TYPES = [
  { key: 'technical', title: 'Technical Interview', domain: 'Software Engineering', icon: icon('cpu', 20), color: INDIGO },
  { key: 'hr', title: 'HR Round', domain: 'General', icon: icon('messageSquare', 20), color: CYAN },
  { key: 'behavioral', title: 'Behavioural', domain: 'General', icon: icon('brain', 20), color: EMERALD },
  { key: 'aptitude', title: 'Aptitude Test', domain: 'General', icon: icon('target', 20), color: AMBER },
];

function currentInterviewType() {
  return INTERVIEW_TYPES.find(function(t) { return t.title === state.configRound; }) || INTERVIEW_TYPES[0];
}

function candidateInterviews() {
  var t = currentInterviewType();
  return `<div class="mic-page">
    ${renderConfigModal(t)}
  </div>`;
}

var CONFIG_FOCUS = {
  technical: ['Data Structures', 'Algorithms', 'Programming', 'Database', 'System Design', 'Core CS'],
  hr: ['Communication', 'Career Goals', 'Culture Fit', 'Leadership', 'Teamwork'],
  behavioral: ['Teamwork', 'Leadership', 'Problem Solving', 'Conflict Resolution', 'Adaptability'],
  aptitude: ['Quantitative Ability', 'Logical Reasoning', 'Verbal Ability', 'Data Interpretation'],
};
var QUESTION_STYLES = ['Standard', 'Scenario Based', 'Skill Focused', 'Mixed'];
var INTERVIEWER_STYLES = ['Professional', 'Friendly', 'Strict'];

function renderResumeUploadArea() {
  var res = state.configResume;
  var status = state.resumeStatus || 'idle';
  var err = state.resumeError || '';

  if (status === 'uploading' || status === 'analyzing') {
    return `<div class="mic-resume-zone mic-resume-zone-active">
      <span class="mic-upload-icon animate-pulse" style="color:#818cf8">${icon('cpu', 16)}</span>
      <p class="mic-upload-main" style="color:#a5b4fc">${status === 'uploading' ? 'Uploading resume...' : 'Analyzing resume...'}</p>
      <p class="mic-upload-sub">Extracting skills, projects & experience</p>
    </div>`;
  }

  if (res && status === 'ready') {
    return `<div class="mic-resume-card">
      <div style="display:flex;align-items:center;gap:0.625rem;min-width:0">
        <span class="mic-file-icon">📄</span>
        <div style="min-width:0">
          <p class="mic-file-name" title="${res.filename}">${res.filename}</p>
          <p class="mic-file-meta">${res.size_mb} MB &bull; <span style="color:#34d399;font-weight:600">✓ Resume ready</span></p>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:0.375rem;flex-shrink:0">
        <button id="btn-replace-resume" class="mic-resume-action-btn">Replace</button>
        <button id="btn-remove-resume" class="mic-resume-action-btn mic-remove-btn">Remove</button>
      </div>
      <input type="file" id="mic-resume-file" accept=".pdf,.docx" style="display:none" />
    </div>`;
  }

  var isErr = status === 'error' || err;
  return `<div id="mic-resume-dropzone" class="mic-resume-zone ${isErr ? 'mic-resume-zone-error' : ''}">
    <input type="file" id="mic-resume-file" accept=".pdf,.docx" style="display:none" />
    <span class="mic-upload-icon" style="${isErr ? 'color:#f43f5e' : ''}">${icon(isErr ? 'alertTriangle' : 'uploadCloud', 16)}</span>
    <p class="mic-upload-main" style="${isErr ? 'color:#fda4af' : ''}">${isErr ? err : 'Click or drag & drop PDF / DOCX resume'}</p>
    <p class="mic-upload-sub">${isErr ? 'Click to try again' : 'Max 5MB &bull; Personalized AI interview'}</p>
  </div>`;
}

function renderConfigModal(t) {
  var isQ = state.configMode === 'questions';
  var focusOptions = CONFIG_FOCUS[t.key] || [];
  var configError = state.configError || '';
  var webcamReady = state.webcamStatus === 'Ready';
  var micReady = state.micStatus === 'Ready';
  var devReady = webcamReady && micReady;

  /* ── Active chip class helpers ── */
  function chipClass(isActive, colorName) {
    if (!isActive) return 'mic-chip';
    if (colorName === 'cyan') return 'mic-chip active-cyan';
    if (colorName === 'emerald') return 'mic-chip active-emerald';
    if (colorName === 'amber') return 'mic-chip active-amber';
    return 'mic-chip active';
  }

  /* ── Determine focus chip accent per interview type ── */
  var focusAccent = t.key === 'hr' ? 'cyan' : t.key === 'behavioral' ? 'emerald' : t.key === 'aptitude' ? 'amber' : 'indigo';

  return `<div class="mic-card">

    <!-- Header -->
    <div class="mic-header">
      <div class="mic-header-title">
        <span class="mic-title-icon">${icon('video', 14)}</span>
        Configure Live AI Mock Interview
      </div>
      <p class="mic-header-sub">Select your target role and round type for a dynamic human-like interview.</p>
    </div>

    <div class="mic-body">
      ${configError ? `<div class="mic-error config-error-box">${icon('alertCircle', 13)} ${configError}</div>` : ''}

      <!-- Target Job Role -->
      <div class="mic-field">
        <label class="mic-label">Target Job Role</label>
        <div class="relative">
          <span class="mic-input-icon">${icon('briefcase', 13)}</span>
          <input id="config-job-role" value="${state.configJobRole}" placeholder="e.g. Software Engineer, Data Analyst" class="mic-input mic-input-with-icon" />
        </div>
      </div>

      <!-- Interview Round Type -->
      <div class="mic-field">
        <label class="mic-label">Interview Round Type</label>
        <select id="config-round-select" class="mic-select">
          ${INTERVIEW_TYPES.map(function(opt) {
            return `<option value="${opt.title}" ${opt.title === state.configRound ? 'selected' : ''}>${opt.title}</option>`;
          }).join('')}
        </select>
      </div>

      <!-- Difficulty + Duration -->
      <div class="mic-row-2">
        <div class="mic-field">
          <label class="mic-label">Difficulty</label>
          <select id="config-diff-select" class="mic-select">
            <option value="easy" ${state.configDifficulty === 'easy' ? 'selected' : ''}>Easy</option>
            <option value="medium" ${state.configDifficulty === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="hard" ${state.configDifficulty === 'hard' ? 'selected' : ''}>Hard</option>
          </select>
        </div>
        <div class="mic-field">
          <label class="mic-label">Duration</label>
          <select id="config-duration-select" class="mic-select">
            ${[10, 15, 20, 30].map(function(m) {
              return `<option value="${m}" ${state.configTimeDuration === m ? 'selected' : ''}>${m} minutes</option>`;
            }).join('')}
          </select>
        </div>
      </div>

      <!-- Upload Resume (Optional) -->
      <div class="mic-field">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <label class="mic-label">Upload Resume <span style="font-weight:400;text-transform:none;opacity:0.6">(Optional)</span></label>
          <span style="font-size:0.625rem;color:rgba(255,255,255,0.35);font-family:'Inter',sans-serif;font-weight:500">PERSONALIZED INTERVIEW FROM YOUR RESUME</span>
        </div>
        ${renderResumeUploadArea()}
      </div>


      <!-- Interview Focus -->
      <div class="mic-field">
        <label class="mic-label">Interview Focus</label>
        <div class="mic-chips">
          ${focusOptions.map(function(f) {
            var isActive = state.configFocus.indexOf(f) !== -1;
            return `<button class="${chipClass(isActive, focusAccent)} config-focus-btn" data-focus="${f}">${isActive ? '✓ ' : ''}${f}</button>`;
          }).join('')}
        </div>
      </div>

      <!-- Question Style -->
      <div class="mic-field">
        <label class="mic-label">Question Style</label>
        <div class="mic-chips">
          ${QUESTION_STYLES.map(function(qs) {
            var isActive = state.configQuestionStyle === qs;
            return `<button class="${chipClass(isActive, 'cyan')} config-style-btn" data-style="${qs}">${qs}</button>`;
          }).join('')}
        </div>
      </div>

      <!-- AI Interviewer -->
      <div class="mic-field">
        <label class="mic-label">AI Interviewer</label>
        <div class="mic-chips">
          ${INTERVIEWER_STYLES.map(function(ist) {
            var isActive = state.configInterviewerStyle === ist;
            return `<button class="${chipClass(isActive, 'emerald')} config-interviewer-btn" data-interviewer="${ist}">${ist}</button>`;
          }).join('')}
        </div>
      </div>

      <!-- Device Status -->
      <div class="mic-device-bar">
        <div style="display:flex;align-items:center;gap:1rem">
          <span class="mic-device-indicator">
            <span class="mic-device-dot ${webcamReady ? 'ready' : 'warn'}"></span>
            Webcam: <span class="mic-device-label ${webcamReady ? 'ready' : 'warn'}">${state.webcamStatus || 'Not tested'}</span>
          </span>
          <span class="mic-device-indicator">
            <span class="mic-device-dot ${micReady ? 'ready' : 'warn'}"></span>
            Mic: <span class="mic-device-label ${micReady ? 'ready' : 'warn'}">${state.micStatus || 'Not tested'}</span>
          </span>
        </div>
        <button id="btn-test-devices" class="mic-test-btn">${icon('video', 10)} Test Devices</button>
      </div>
      <p id="device-status" class="mic-device-msg" role="status">${devReady ? 'Devices verified successfully.' : (state.deviceError || 'Test your camera and microphone before starting.')}</p>

      <!-- Summary -->
      <div class="mic-summary">
        <span><strong>Role:</strong> <span id="config-summary-role">${state.configJobRole || 'General'}</span></span>
        <span class="mic-sep">&bull;</span>
        <span><strong>Round:</strong> ${t.title}</span>
        <span class="mic-sep">&bull;</span>
        <span><strong>Difficulty:</strong> <span style="text-transform:capitalize">${state.configDifficulty}</span></span>
        <span class="mic-sep">&bull;</span>
        <span><strong>Duration:</strong> ${state.configTimeDuration} min</span>
        <span class="mic-sep">&bull;</span>
        <span><strong>Resume:</strong> <span style="${state.configResume ? 'color:#6ee7b7;font-weight:600' : ''}">${state.configResume ? 'Uploaded (' + state.configResume.filename + ')' : 'Not uploaded'}</span></span>
      </div>

      <!-- CTA -->
      <button id="config-start" class="mic-cta" data-interview-type="${t.key}" data-domain="${t.domain}">${icon('play', 14)} Enter Live AI Interview Room</button>
    </div>
  </div>`;
}


function candidateSession() {
  var session = state.currentInterview;
  if (!session || !session.interview || !session.questions || !session.questions.length) {
    return `<div class="flex flex-col items-center justify-center h-80 text-center"><h2 class="text-xl font-semibold text-white mb-2">No active interview</h2><p class="text-white/40 text-sm mb-5">Choose an interview type to generate a session.</p><button id="btn-back-to-interviews" class="px-4 py-2 rounded-lg text-sm text-white" style="background:${INDIGO}">Choose Interview</button></div>`;
  }

  var interview = session.interview;
  var status = interview.status || 'created';
  var total = session.questions.length;
  var currentIdx = state.currentQuestionIndex || 0;
  if (currentIdx >= total) currentIdx = total - 1;
  var question = session.questions[currentIdx];
  var durationMin = interview.duration || 15;
  var totalSec = durationMin * 60;
  var elapsed = state.sessionElapsedSeconds || interview.elapsed_seconds || 0;
  var remainSec = Math.max(0, totalSec - elapsed);
  var min = Math.floor(remainSec / 60);
  var sec = remainSec % 60;
  var timerStr = (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec;

  // Case 1: Session is Completed
  if (status === 'completed') {
    var answeredCount = session.questions.filter(function(q) { return q.answer_text; }).length;
    var elMin = Math.floor(elapsed / 60);
    var elSec = elapsed % 60;
    var durText = elMin + ' min ' + elSec + ' sec';
    var modalHtml = state.activeReportModal ? renderReportModal(state.activeReportModal) : '';

    return `<div class="max-w-xl mx-auto my-12 p-8 rounded-2xl border border-white/10 text-center space-y-6" style="background:#0c0e1c">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
        ${icon('checkCircle', 32)}
      </div>
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Interview Completed</h1>
      <p class="text-white/50 text-sm">Your AI Mock Interview session has been finished and evaluated.</p>
      
      <div class="grid grid-cols-2 gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
        <div>
          <p class="text-white/40 text-xs uppercase font-medium">Questions Completed</p>
          <p class="text-lg font-bold text-white mt-1">${answeredCount} / ${total}</p>
        </div>
        <div>
          <p class="text-white/40 text-xs uppercase font-medium">Duration</p>
          <p class="text-lg font-bold text-white mt-1">${durText}</p>
        </div>
      </div>

      <div class="flex items-center gap-3 pt-2">
        <button id="btn-view-interview-report" data-id="${interview.id}" class="flex-1 py-3 px-4 rounded-xl font-semibold text-sm text-white transition-all shadow-lg hover:brightness-110" style="background:${INDIGO}">View Summary</button>
        <button id="btn-back-to-interviews" class="py-3 px-4 rounded-xl text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20">Back</button>
      </div>
    </div>
    ${modalHtml}`;
  }

  // Header meta bar
  var itype = (interview.interview_type || 'technical').toUpperCase();
  var domain = interview.domain || 'General';
  var difficulty = (interview.difficulty || 'medium').toUpperCase();

  var webcamReady = state.webcamStatus === 'Ready';
  var micReady = state.micStatus === 'Ready';
  var devReady = webcamReady && micReady;
  var webcamLabel = state.webcamStatus || 'Requesting...';
  var micLabel = state.micStatus || 'Requesting...';
  var webcamDot = webcamReady ? 'bg-emerald-400' : 'bg-rose-400';
  var micDot = micReady ? 'bg-emerald-400' : 'bg-rose-400';
  var webcamBadgeStyle = webcamReady
    ? 'background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3)'
    : 'background:rgba(244,63,94,0.15);color:#f43f5e;border:1px solid rgba(244,63,94,0.3)';
  var micBadgeStyle = micReady
    ? 'background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3)'
    : 'background:rgba(244,63,94,0.15);color:#f43f5e;border:1px solid rgba(244,63,94,0.3)';

  // Recording Status Badge UI
  var recStatus = state.sessionRecordingStatus || (status === 'created' ? 'ready' : 'idle');
  var recLabel = 'Ready';
  var recDot = 'bg-amber-400';
  var recBadgeStyle = 'background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)';

  if (recStatus === 'recording') {
    recLabel = 'Recording';
    recDot = 'bg-emerald-400 animate-pulse';
    recBadgeStyle = 'background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3)';
  } else if (recStatus === 'paused') {
    recLabel = 'Paused';
    recDot = 'bg-amber-400';
    recBadgeStyle = 'background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)';
  } else if (recStatus === 'processing') {
    recLabel = 'Processing...';
    recDot = 'bg-cyan-400 animate-pulse';
    recBadgeStyle = 'background:rgba(6,182,212,0.15);color:#67e8f9;border:1px solid rgba(6,182,212,0.3)';
  } else if (recStatus === 'saved') {
    recLabel = 'Saved';
    recDot = 'bg-emerald-400';
    recBadgeStyle = 'background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3)';
  } else if (recStatus === 'error') {
    recLabel = state.sessionRecordingError || 'Upload failed';
    recDot = 'bg-rose-400';
    recBadgeStyle = 'background:rgba(244,63,94,0.15);color:#f43f5e;border:1px solid rgba(244,63,94,0.3)';
  }

  // Status Badge UI
  var statusBadge = '';
  if (status === 'created') statusBadge = badge('Ready to Start', 'amber');
  else if (status === 'in_progress') statusBadge = badge('● Live In Progress', 'emerald');
  else if (status === 'paused') statusBadge = badge('⏸ Paused', 'amber');

  // Case 2: Session is Created (Pre-start)
  if (status === 'created') {
    return `<div class="max-w-5xl mx-auto space-y-6">
      <!-- Live Room Header -->
      <div class="flex items-center justify-between p-6 rounded-2xl border border-white/8" style="background:#0c0e1c">
        <div>
          <div class="flex items-center gap-2 mb-2">
            ${badge(itype + ' INTERVIEW', 'indigo')}
            ${badge(domain, 'indigo')}
            ${badge(difficulty, 'amber')}
            ${statusBadge}
          </div>
          <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Live AI Interview Room</h1>
          <p class="text-white/50 text-sm mt-1">Camera and microphone ready. Click <strong>Start Interview</strong> to begin your session.</p>
        </div>
        <div class="text-right">
          <p class="text-white/40 text-xs uppercase tracking-wider font-semibold">Configured Duration</p>
          <p class="text-2xl font-bold text-indigo-400 mt-1">${durationMin} min</p>
        </div>
      </div>

      <!-- Preview Grid -->
      <div class="grid grid-cols-2 gap-5">
        <div class="rounded-xl border border-white/7 overflow-hidden relative flex flex-col justify-between" style="background:#0d0f1e">
          <div class="relative w-full aspect-video bg-[#141627] flex items-center justify-center overflow-hidden">
            <video id="candidate-camera" autoplay muted playsinline class="w-full h-full object-cover"></video>
            ${!webcamReady ? `<div class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/75 backdrop-blur-sm">
              <div class="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 mb-2">${icon('videoOff', 20)}</div>
              <p class="text-xs font-semibold text-rose-300">Webcam Not Available</p>
              <p class="text-[11px] text-white/50 mt-1 max-w-xs">${state.webcamStatus || 'Allow camera permission to enable video preview.'}</p>
            </div>` : ''}
          </div>
          <div class="p-3 border-t border-white/6 bg-white/[0.02] flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5" style="${webcamBadgeStyle}">
                <span class="w-1.5 h-1.5 rounded-full ${webcamDot}"></span>
                Webcam: ${webcamLabel}
              </span>
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5" style="${micBadgeStyle}">
                <span class="w-1.5 h-1.5 rounded-full ${micDot}"></span>
                Mic: ${micLabel}
              </span>
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5" style="${recBadgeStyle}">
                <span class="w-1.5 h-1.5 rounded-full ${recDot}"></span>
                Recording: ${recLabel}
              </span>
            </div>
            <button id="btn-test-room-devices" class="px-3 py-1 rounded-lg text-xs font-semibold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-all shrink-0">
              ${icon('video', 12)} Test Devices
            </button>
          </div>
          ${state.deviceError ? `<p class="px-3 py-2 text-xs text-rose-400 bg-rose-500/10 border-t border-rose-500/20">${state.deviceError}</p>` : ''}
        </div>
        
        <div class="rounded-xl border border-white/7 p-6 flex flex-col justify-between" style="background:#0d0f1e">
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-white">Interview Overview</h3>
            <div class="space-y-2 text-sm text-white/70">
              <div class="flex justify-between py-2 border-b border-white/5"><span>Total Questions:</span> <strong class="text-white">${total} Questions</strong></div>
              <div class="flex justify-between py-2 border-b border-white/5"><span>Time Duration:</span> <strong class="text-white">${durationMin} Minutes</strong></div>
              <div class="flex justify-between py-2 border-b border-white/5"><span>Difficulty Level:</span> <strong class="text-white">${difficulty}</strong></div>
            </div>
          </div>
          
          <button id="btn-start-interview-session" class="w-full py-4 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.01]" style="background:${INDIGO}">
            ${icon('play', 18)} Start Interview
          </button>
        </div>
      </div>
    </div>`;
  }

  // Case 3: Session is in_progress or paused
  var transcriptText = state.currentTranscript || '';
  var isPaused = status === 'paused';

  return `<div class="max-w-5xl mx-auto space-y-6">
    <!-- Active Room Bar -->
    <div class="flex items-center justify-between p-5 rounded-2xl border border-white/8" style="background:#0c0e1c">
      <div class="flex items-center gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-white/40 text-xs uppercase tracking-wider font-semibold">${itype} &bull; ${domain}</span>
            ${statusBadge}
          </div>
          <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Question ${currentIdx + 1} of ${total}</h1>
        </div>
      </div>

      <!-- Controls & Timer -->
      <div class="flex items-center gap-4">
        <div class="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-center">
          <p class="text-white/40 text-[10px] uppercase font-bold tracking-wider">Time Remaining</p>
          <p id="session-timer-display" class="text-xl font-mono font-bold ${remainSec < 60 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}">${timerStr}</p>
        </div>

        <div class="flex items-center gap-2">
          ${isPaused ? `
            <button id="btn-resume-interview-session" class="px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 transition-all">
              ${icon('play', 14)} Resume Interview
            </button>
          ` : `
            <button id="btn-pause-interview-session" class="px-4 py-2.5 rounded-xl font-semibold text-xs text-white/80 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 flex items-center gap-1.5 transition-all">
              ${icon('pause', 14)} Pause Interview
            </button>
          `}

          <button id="btn-next-question" class="px-4 py-2.5 rounded-xl font-semibold text-xs text-white flex items-center gap-1.5 transition-all hover:brightness-110" style="background:${INDIGO}">
            Next Question ${icon('arrowRight', 14)}
          </button>

          <button id="btn-end-interview-session" class="px-3.5 py-2.5 rounded-xl font-semibold text-xs text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-all">
            End Interview
          </button>
        </div>
      </div>
    </div>

    ${isPaused ? `
      <div class="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-center font-medium text-sm flex items-center justify-center gap-2">
        <span>⏸ Interview Paused. Click <strong>Resume Interview</strong> to continue.</span>
      </div>
    ` : ''}

    <!-- Live Interview Content Grid -->
    <div class="grid grid-cols-2 gap-5">
      <div class="rounded-xl border border-white/7 overflow-hidden relative flex flex-col justify-between" style="background:#0d0f1e">
        <div class="relative w-full aspect-video bg-[#141627] flex items-center justify-center overflow-hidden">
          <video id="candidate-camera" autoplay muted playsinline class="w-full h-full object-cover"></video>
          ${!webcamReady ? `<div class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/75 backdrop-blur-sm">
            <div class="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 mb-2">${icon('videoOff', 20)}</div>
            <p class="text-xs font-semibold text-rose-300">Webcam Not Available</p>
            <p class="text-[11px] text-white/50 mt-1 max-w-xs">${state.webcamStatus || 'Allow camera permission to enable video preview.'}</p>
          </div>` : ''}
        </div>
        <div class="p-3 border-t border-white/6 bg-white/[0.02] flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5" style="${webcamBadgeStyle}">
              <span class="w-1.5 h-1.5 rounded-full ${webcamDot}"></span>
              Webcam: ${webcamLabel}
            </span>
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5" style="${micBadgeStyle}">
              <span class="w-1.5 h-1.5 rounded-full ${micDot}"></span>
              Mic: ${micLabel}
            </span>
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5" style="${recBadgeStyle}">
              <span class="w-1.5 h-1.5 rounded-full ${recDot}"></span>
              Recording: ${recLabel}
            </span>
          </div>
          <button id="btn-test-room-devices" class="px-3 py-1 rounded-lg text-xs font-semibold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-all shrink-0">
            ${icon('video', 12)} Test Devices
          </button>
        </div>
        ${state.deviceError ? `<p class="px-3 py-2 text-xs text-rose-400 bg-rose-500/10 border-t border-rose-500/20">${state.deviceError}</p>` : ''}
      </div>

      <div class="rounded-xl border border-white/7 p-6 flex flex-col justify-between" style="background:#0d0f1e">
        <div class="flex items-center gap-2 mb-4">
          ${badge(question.category || 'Interview', 'indigo')}
          ${badge(question.difficulty || 'medium', 'amber')}
        </div>
        <p class="text-white text-lg leading-relaxed flex-1">${question.question_text}</p>
        <div class="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-xs text-white/40">
          <span>Question ${currentIdx + 1} of ${total}</span>
          <span>Current Progress: ${Math.round(((currentIdx + 1) / total) * 100)}%</span>
        </div>
      </div>
    </div>

    <!-- Live Response Box -->
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <p class="text-white/70 text-sm mb-3">Live voice response</p>
      <div id="transcript-box" class="rounded-lg border border-white/6 p-4 min-h-[60px]" style="background:#141627">
        ${transcriptText ? `<p class="text-white/80 text-sm leading-relaxed">${transcriptText}</p>` : `<p class="text-white/25 text-sm italic">${isPaused ? 'Interview paused.' : 'Waiting for interviewer...'}</p>`}
      </div>
      <p id="session-status" class="mt-3 text-xs text-white/40" role="status">${state.sessionMessage || ''}</p>
    </div>

    <!-- Confirmation Modal Container -->
    ${state.showEndConfirmModal ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div class="w-full max-w-md p-6 rounded-2xl border border-white/10 space-y-5 shadow-2xl" style="background:#0c0e1c">
          <h3 class="text-xl font-bold text-white">End Interview?</h3>
          <p class="text-white/60 text-sm leading-relaxed">Are you sure you want to end the interview? Your progress so far will be saved and evaluated.</p>
          <div class="flex items-center gap-3 pt-2">
            <button id="modal-confirm-cancel" class="flex-1 py-2.5 rounded-xl font-semibold text-xs text-white/70 hover:text-white border border-white/10 hover:border-white/20">Cancel</button>
            <button id="modal-confirm-end" class="flex-1 py-2.5 rounded-xl font-semibold text-xs text-white bg-rose-600 hover:bg-rose-500 shadow-md">End Interview</button>
          </div>
        </div>
      </div>
    ` : ''}
  </div>`;
}

function speakWithWebSpeech(text, callback) {
  if ('speechSynthesis' in window) {
    var finished = false;
    function done() {
      if (finished) return;
      finished = true;
      if (callback) callback();
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch(e) {}

    var utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.onend = done;
    utterance.onerror = done;

    setTimeout(done, 12000);

    try {
      window.speechSynthesis.speak(utterance);
    } catch(e) {
      done();
    }
  } else {
    if (callback) callback();
  }
}

async function speakCurrentQuestion() {
  var session = state.currentInterview;
  if (!session || !session.interview || session.interview.status !== 'in_progress') return;

  state.isAiSpeaking = true;
  stopAutoRecording();
  var question = session.questions[state.currentQuestionIndex];
  var done = false;

  function onStartListening() {
    if (done) return;
    done = true;
    state.isAiSpeaking = false;
    if (state.currentInterview && state.currentInterview.interview && state.currentInterview.interview.status === 'in_progress') {
      startAutoRecording();
    }
  }

  setSessionStatus('AI interviewer is speaking...', 'text-indigo-300');
  var box = document.getElementById('transcript-box');
  if (box) box.innerHTML = '<p class="text-indigo-300 text-sm animate-pulse">AI interviewer is speaking the question...</p>';

  var fallbackTimeout = setTimeout(onStartListening, 25000);
  var questionText = 'Question ' + (question.sequence_no || (state.currentQuestionIndex + 1)) + '. ' + question.question_text;

  try {
    var data = await api.speakInterviewQuestion(session.interview.id, question.id);
    if (state.interviewerAudio) {
      try { state.interviewerAudio.pause(); } catch(e) {}
    }
    var audio = new Audio('data:' + (data.mime_type || 'audio/wav') + ';base64,' + data.audio_base64);
    state.interviewerAudio = audio;
    audio.onended = function() { clearTimeout(fallbackTimeout); onStartListening(); };
    audio.onerror = function() {
      clearTimeout(fallbackTimeout);
      speakWithWebSpeech(questionText, onStartListening);
    };
    await audio.play();
  } catch (err) {
    clearTimeout(fallbackTimeout);
    speakWithWebSpeech(questionText, onStartListening);
  }
}

function startAutoRecording() {
  if (!state.currentInterview || !state.currentInterview.interview || state.currentInterview.interview.status !== 'in_progress') return;
  if (state.isAiSpeaking) return;
  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') return;

  function doStart() {
    if (!state.currentInterview || !state.currentInterview.interview || state.currentInterview.interview.status !== 'in_progress') return;
    if (state.isAiSpeaking) return;

    setSessionStatus('Listening... Speak your answer.', 'text-emerald-300');
    var box = document.getElementById('transcript-box');
    if (box) box.innerHTML = '<p class="text-emerald-300 text-sm animate-pulse">Listening... Speak your answer now.</p>';

    state.recordedMimeType = 'audio/webm';
    state.recordedChunks = [];

    var recorder;
    try { recorder = new MediaRecorder(state.interviewStream); } catch(e) {
      setSessionStatus('Recording not supported in this browser.', 'text-rose-400');
      return;
    }
    state.recordedMimeType = recorder.mimeType || 'audio/webm';
    state.mediaRecorder = recorder;
    recorder.ondataavailable = function(e) { if (e.data && e.data.size > 0) state.recordedChunks.push(e.data); };
    recorder.onstop = function() { onRecordingStop(); };
    recorder.onerror = function(e) { setSessionStatus('Recording error.', 'text-rose-400'); };
    try { recorder.start(); } catch(e) { setSessionStatus('Could not start recording.', 'text-rose-400'); return; }

    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume();
    var src = ctx.createMediaStreamSource(state.interviewStream);
    var proc = ctx.createScriptProcessor(2048, 1, 1);
    var gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(proc); proc.connect(gain); gain.connect(ctx.destination);

    var heard = false, silence = 0, started = Date.now();
    proc.onaudioprocess = function(ev) {
      if (!state.currentInterview || !state.currentInterview.interview || state.currentInterview.interview.status !== 'in_progress' || state.isAiSpeaking) {
        stopAutoRecording();
        return;
      }
      var s = ev.inputBuffer.getChannelData(0), sum = 0;
      for (var i = 0; i < s.length; i++) sum += s[i] * s[i];
      var vol = Math.sqrt(sum / s.length);
      if (vol > 0.008) { heard = true; silence = 0; } else if (heard) silence++;
      if (heard && silence >= 20) stopAutoRecording();
      if (!heard && Date.now() - started > 10000) stopAutoRecording();
      if (Date.now() - started > 60000) stopAutoRecording();
    };
    state.audioMonitor = { ctx: ctx, src: src, proc: proc, gain: gain };
    state.autoStopFallback = setTimeout(function() { stopAutoRecording(); }, 45000);
  }

  if (!state.interviewStream || !state.interviewStream.active) {
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function(stream) {
      state.interviewStream = stream;
      doStart();
    }).catch(function() {
      setSessionStatus('Could not access microphone.', 'text-rose-400');
    });
  } else {
    doStart();
  }
}

function stopAutoRecording() {
  if (state.autoStopFallback) { clearTimeout(state.autoStopFallback); state.autoStopFallback = null; }
  if (state.audioMonitor) {
    try {
      state.audioMonitor.proc.disconnect();
      state.audioMonitor.src.disconnect();
      state.audioMonitor.gain.disconnect();
      state.audioMonitor.ctx.close();
    } catch(e) {}
    state.audioMonitor = null;
  }
  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
    try { state.mediaRecorder.stop(); } catch(e) {}
  }
}

async function onRecordingStop() {
  if (!state.currentInterview || !state.currentInterview.interview || state.currentInterview.interview.status !== 'in_progress' || state.isAiSpeaking) {
    state.recordedChunks = [];
    state.mediaRecorder = null;
    return;
  }

  setSessionStatus('Transcribing with Gemini AI...', 'text-indigo-300');
  var box = document.getElementById('transcript-box');
  if (box) box.innerHTML = '<p class="text-indigo-300 text-sm animate-pulse">Transcribing your answer...</p>';

  try {
    var mimeType = state.recordedMimeType || 'audio/webm';
    var blob = new Blob(state.recordedChunks, { type: mimeType });
    state.recordedChunks = [];
    state.mediaRecorder = null;

    var base64Full = await blobToBase64(blob);
    var base64Clean = base64Full.split(',')[1];
    var transcript = '';
    for (var attempt = 0; attempt < 3; attempt++) {
      try {
        var res = await api.transcribeChunk(base64Clean, mimeType);
        transcript = (res.transcript || '').trim();
        break;
      } catch(e) {
        if (attempt < 2) { await new Promise(function(r) { setTimeout(r, 2000); }); } else throw e;
      }
    }

    if (!transcript || transcript.length < 3) {
      setSessionStatus('No answer detected. Speak your answer clearly or click Next Question.', 'text-amber-300');
      if (box) box.innerHTML = '<p class="text-amber-300 text-sm">No answer detected. Speak your answer clearly or click Next Question.</p>';
      return;
    }

    if (box) box.innerHTML = '<div class="text-white/90 text-sm leading-relaxed mb-3 font-medium">"' + transcript + '"</div>';

    setSessionStatus('Evaluating answer with AI...', 'text-indigo-300');
    var q = state.currentInterview.questions[state.currentQuestionIndex];
    var result = await api.submitInterviewAnswer(state.currentInterview.interview.id, q.id, transcript);

    state.currentInterview.interview = result.interview;
    state.currentInterview.questions[state.currentQuestionIndex] = result.question;
    state.currentTranscript = transcript;

    var score = result.question.score || 0;
    var feedback = result.question.feedback || 'Answer evaluated successfully.';

    setSessionStatus('Score: ' + score + '%', 'text-emerald-300');

    if (box) {
      box.innerHTML = '<div class="text-white/90 text-sm leading-relaxed mb-3 font-medium">"' + transcript + '"</div>' +
        '<div class="mt-3 p-3 rounded-lg border border-indigo-500/25 bg-indigo-500/10">' +
          '<div class="flex items-center justify-between mb-1.5">' +
            '<span class="text-xs font-semibold text-indigo-300">AI Evaluation Score</span>' +
            '<span class="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200">' + score + '%</span>' +
          '</div>' +
          '<p class="text-xs text-white/70 leading-relaxed">' + feedback + '</p>' +
        '</div>';
    }

    setTimeout(nextQuestion, 4000);
  } catch (err) {
    setSessionStatus('Error: ' + err.message, 'text-rose-400');
    if (box) box.innerHTML = '<p class="text-rose-400 text-sm">Error: ' + err.message + '</p>';
  }
}

async function convertToWav(blob) {
  var ctx = new (window.AudioContext || window.webkitAudioContext)();
  var arrayBuffer = await blob.arrayBuffer();
  var audioBuffer;
  try { audioBuffer = await ctx.decodeAudioData(arrayBuffer); } catch(e) { ctx.close(); throw new Error('Could not decode audio.'); }
  var raw = audioBuffer.getChannelData(0);
  var targetRate = 16000;
  var ratio = audioBuffer.sampleRate / targetRate;
  var length = Math.ceil(raw.length / ratio);
  var samples = new Float32Array(length);
  for (var i = 0; i < length; i++) samples[i] = raw[Math.min(Math.floor(i * ratio), raw.length - 1)];
  var max = 0;
  for (var i = 0; i < samples.length; i++) { var a = Math.abs(samples[i]); if (a > max) max = a; }
  if (max > 0 && max < 0.5) { var gain = 0.9 / max; for (var i = 0; i < samples.length; i++) samples[i] *= gain; }
  ctx.close();
  var buffer = new ArrayBuffer(44 + samples.length * 2);
  var view = new DataView(buffer);
  function ws(p, v) { for (var i = 0; i < v.length; i++) view.setUint8(p + i, v.charCodeAt(i)); }
  ws(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true); view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); ws(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (var i = 0; i < samples.length; i++) {
    var s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  var bytes = new Uint8Array(buffer); var binary = '';
  for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

function nextQuestion() {
  stopAutoRecording();
  if (state.interviewerAudio) {
    try { state.interviewerAudio.pause(); } catch(e) {}
  }
  if (!state.currentInterview || !state.currentInterview.questions) return;

  if (state.currentQuestionIndex < state.currentInterview.questions.length - 1) {
    state.currentQuestionIndex += 1;
    state.currentTranscript = '';
    state.sessionMessage = '';
    render();
    if (state.currentInterview && state.currentInterview.interview && state.currentInterview.interview.status === 'in_progress') {
      speakCurrentQuestion();
    }
  } else {
    confirmEndInterviewSession();
  }
}

function blobToBase64(blob) {
  return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onloadend = function() { resolve(reader.result); };
    reader.readAsDataURL(blob);
  });
}

async function startCandidateInterview(button) {
  var role = (state.configJobRole || '').trim();
  if (!role) {
    state.configError = 'Please enter your target job role.';
    render();
    return;
  }
  if (!state.deviceTested) {
    state.configError = 'Please test your camera and microphone before starting the interview.';
    render();
    return;
  }
  button.disabled = true;
  var original = button.innerHTML;
  button.textContent = 'Preparing your interview...';
  try {
    await enableInterviewDevices();
    var itype = currentInterviewType();
    var payload = { interview_type: itype.key, domain: role, difficulty: state.configDifficulty, skills: state.configFocus || [] };
    if (state.configMode === 'time') payload.time_duration = state.configTimeDuration;
    else payload.num_questions = state.configNumQuestions;
    if (state.configResume) payload.resume_context = state.configResume;

    var generated = await api.generateInterview(payload);
    state.currentInterview = generated;
    state.currentQuestionIndex = generated.interview.current_question_index || 0;
    state.sessionElapsedSeconds = generated.interview.elapsed_seconds || 0;
    state.currentTranscript = '';
    state.sessionMessage = '';
    state.configError = '';
    state.section = 'session';
    render();
  } catch (error) {
    stopInterviewDevices();
    button.disabled = false;
    button.innerHTML = original;
    window.alert(error.message);
  }
}

function startSessionTimer() {
  stopSessionTimer();
  state.sessionTimerInterval = setInterval(function() {
    if (!state.currentInterview || !state.currentInterview.interview) {
      stopSessionTimer();
      return;
    }
    var interview = state.currentInterview.interview;
    if (interview.status !== 'in_progress') return;

    state.sessionElapsedSeconds = (state.sessionElapsedSeconds || 0) + 1;
    var durationMin = interview.duration || 15;
    var totalSec = durationMin * 60;
    var remainSec = Math.max(0, totalSec - state.sessionElapsedSeconds);

    var timerEl = document.getElementById('session-timer-display');
    if (timerEl) {
      var min = Math.floor(remainSec / 60);
      var sec = remainSec % 60;
      timerEl.textContent = (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec;
      if (remainSec < 60) {
        timerEl.className = 'text-xl font-mono font-bold text-rose-400 animate-pulse';
      }
    }

    if (state.sessionElapsedSeconds % 10 === 0) {
      api.updateInterview(interview.id, {
        elapsed_seconds: state.sessionElapsedSeconds,
        current_question_index: state.currentQuestionIndex || 0
      }).catch(function() {});
    }

    if (remainSec <= 0) {
      stopSessionTimer();
      autoEndInterviewTimerExpired();
    }
  }, 1000);
}

function stopSessionTimer() {
  if (state.sessionTimerInterval) {
    clearInterval(state.sessionTimerInterval);
    state.sessionTimerInterval = null;
  }
}

function getBestSupportedVideoMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  var types = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=h264,aac',
    'video/mp4',
    'video/x-matroska;codecs=avc1,opus',
    'video/x-matroska',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  for (var i = 0; i < types.length; i++) {
    if (MediaRecorder.isTypeSupported(types[i])) return types[i];
  }
  return '';
}

function startSessionMediaRecorder() {
  if (typeof MediaRecorder === 'undefined') {
    state.sessionRecordingStatus = 'unsupported';
    state.sessionRecordingError = 'MediaRecorder not supported';
    return;
  }
  if (!state.interviewStream || !state.interviewStream.active) {
    state.sessionRecordingStatus = 'error';
    state.sessionRecordingError = 'Camera/mic stream not active';
    return;
  }

  if (state.sessionMediaRecorder && state.sessionMediaRecorder.state === 'paused') {
    try {
      state.sessionMediaRecorder.resume();
      state.sessionRecordingStatus = 'recording';
      render();
    } catch(e) {
      console.warn('Could not resume session MediaRecorder:', e);
    }
    return;
  }

  if (state.sessionMediaRecorder && state.sessionMediaRecorder.state === 'recording') {
    return;
  }

  state.sessionRecordingChunks = [];
  var mimeType = getBestSupportedVideoMimeType();
  var options = mimeType ? { mimeType: mimeType } : {};

  try {
    state.sessionMediaRecorder = new MediaRecorder(state.interviewStream, options);
  } catch(e1) {
    try {
      state.sessionMediaRecorder = new MediaRecorder(state.interviewStream);
    } catch(e2) {
      state.sessionRecordingStatus = 'error';
      state.sessionRecordingError = 'Failed to init recorder';
      return;
    }
  }

  state.sessionMediaRecorder.ondataavailable = function(evt) {
    if (evt.data && evt.data.size > 0) {
      if (!state.sessionRecordingChunks) state.sessionRecordingChunks = [];
      state.sessionRecordingChunks.push(evt.data);
    }
  };

  state.sessionMediaRecorder.onerror = function(evt) {
    console.error('Session MediaRecorder error:', evt);
    state.sessionRecordingStatus = 'error';
    state.sessionRecordingError = 'Recording error';
    render();
  };

  try {
    state.sessionMediaRecorder.start(1000);
    state.sessionRecordingStatus = 'recording';
    state.sessionRecordingError = '';
  } catch(e) {
    state.sessionRecordingStatus = 'error';
    state.sessionRecordingError = 'Failed to start recorder';
  }
}

function pauseSessionMediaRecorder() {
  if (state.sessionMediaRecorder && state.sessionMediaRecorder.state === 'recording') {
    try {
      state.sessionMediaRecorder.pause();
      state.sessionRecordingStatus = 'paused';
    } catch(e) {
      console.warn('Failed to pause session MediaRecorder:', e);
    }
  }
}

async function stopAndUploadSessionRecording(interviewId) {
  if (!interviewId) return null;
  state.sessionRecordingStatus = 'processing';
  render();

  if (!state.sessionMediaRecorder || state.sessionMediaRecorder.state === 'inactive') {
    if (state.sessionRecordingChunks && state.sessionRecordingChunks.length > 0) {
      return await finalizeAndUploadBlob(interviewId);
    }
    state.sessionRecordingStatus = 'saved';
    render();
    return null;
  }

  return new Promise(function(resolve) {
    state.sessionMediaRecorder.onstop = async function() {
      var res = await finalizeAndUploadBlob(interviewId);
      resolve(res);
    };

    try {
      state.sessionMediaRecorder.stop();
    } catch(e) {
      state.sessionRecordingStatus = 'error';
      state.sessionRecordingError = 'Error stopping recorder';
      render();
      resolve(null);
    }
  });
}

async function finalizeAndUploadBlob(interviewId) {
  if (!interviewId || !state.sessionRecordingChunks || state.sessionRecordingChunks.length === 0) {
    state.sessionRecordingStatus = 'saved';
    render();
    return null;
  }

  var actualMime = (state.sessionMediaRecorder && state.sessionMediaRecorder.mimeType) || 'video/webm';
  var blob = new Blob(state.sessionRecordingChunks, { type: actualMime });
  state.sessionRecordingChunks = [];

  state.sessionRecordingStatus = 'processing';
  render();

  try {
    var elapsedSec = state.sessionElapsedSeconds || 0;
    var res = await api.uploadInterviewRecording(interviewId, blob, {
      recording_type: 'video',
      duration: elapsedSec,
      mime_type: actualMime
    });
    state.sessionRecordingStatus = 'saved';
    state.sessionRecordingMeta = res.recording;
    state.sessionRecordingError = '';
    state.recordingsData = null;
    render();
    return res;
  } catch(err) {
    console.error('Recording upload error:', err);
    state.sessionRecordingStatus = 'error';
    state.sessionRecordingError = err.message || 'Upload failed';
    render();
    return null;
  }
}

async function autoEndInterviewTimerExpired() {
  if (!state.currentInterview || !state.currentInterview.interview) return;
  stopAutoRecording();
  stopSessionTimer();
  var id = state.currentInterview.interview.id;
  await stopAndUploadSessionRecording(id);
  stopInterviewDevices();
  try {
    var res = await api.endInterview(id, state.sessionElapsedSeconds || 0);
    if (res && res.interview) state.currentInterview.interview = res.interview;
    else state.currentInterview.interview.status = 'completed';
    render();
  } catch(e) {
    if (state.currentInterview && state.currentInterview.interview) {
      state.currentInterview.interview.status = 'completed';
    }
    render();
  }
}

async function startInterviewSession() {
  if (!state.currentInterview || !state.currentInterview.interview) return;
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.resume(); } catch(e) {}
  }
  var id = state.currentInterview.interview.id;
  try {
    var started = await api.startInterview(id);
    state.currentInterview = started;
    state.currentInterview.interview.status = 'in_progress';
    state.sessionElapsedSeconds = started.interview.elapsed_seconds || 0;
    state.currentQuestionIndex = started.interview.current_question_index || 0;
    startSessionMediaRecorder();
    render();
    startSessionTimer();
    speakCurrentQuestion();
  } catch (err) {
    window.alert('Unable to start interview: ' + err.message);
  }
}

async function pauseInterviewSession() {
  if (!state.currentInterview || !state.currentInterview.interview) return;
  var id = state.currentInterview.interview.id;
  stopSessionTimer();
  stopAutoRecording();
  pauseSessionMediaRecorder();
  if (state.interviewerAudio) state.interviewerAudio.pause();

  try {
    var res = await api.pauseInterview(id, state.currentQuestionIndex || 0, state.sessionElapsedSeconds || 0);
    if (res && res.interview) state.currentInterview.interview = res.interview;
    else state.currentInterview.interview.status = 'paused';
    render();
  } catch(err) {
    state.currentInterview.interview.status = 'paused';
    render();
  }
}

async function resumeInterviewSession() {
  if (!state.currentInterview || !state.currentInterview.interview) return;
  var id = state.currentInterview.interview.id;

  try {
    var res = await api.resumeInterview(id);
    if (res && res.interview) state.currentInterview.interview = res.interview;
    else state.currentInterview.interview.status = 'in_progress';
    startSessionMediaRecorder();
    render();
    startSessionTimer();
    speakCurrentQuestion();
  } catch(err) {
    state.currentInterview.interview.status = 'in_progress';
    startSessionMediaRecorder();
    render();
    startSessionTimer();
    speakCurrentQuestion();
  }
}

function showEndInterviewModal() {
  state.showEndConfirmModal = true;
  render();
}

function closeEndInterviewModal() {
  state.showEndConfirmModal = false;
  render();
}

async function confirmEndInterviewSession() {
  state.showEndConfirmModal = false;
  if (!state.currentInterview || !state.currentInterview.interview) return;
  stopSessionTimer();
  stopAutoRecording();
  if (state.interviewerAudio) state.interviewerAudio.pause();

  var id = state.currentInterview.interview.id;
  await stopAndUploadSessionRecording(id);
  stopInterviewDevices();

  try {
    var res = await api.endInterview(id, state.sessionElapsedSeconds || 0);
    if (res && res.interview) state.currentInterview.interview = res.interview;
    else state.currentInterview.interview.status = 'completed';
    render();
  } catch(err) {
    if (state.currentInterview && state.currentInterview.interview) {
      state.currentInterview.interview.status = 'completed';
    }
    render();
  }
}

async function enableInterviewDevices() {
  if (state.interviewStream && state.interviewStream.active) {
    var vTr = state.interviewStream.getVideoTracks();
    var aTr = state.interviewStream.getAudioTracks();
    state.webcamStatus = (vTr.length && vTr[0].readyState === 'live') ? 'Ready' : 'Not available';
    state.micStatus = (aTr.length && aTr[0].readyState === 'live') ? 'Ready' : 'Not available';
    return state.interviewStream;
  }

  state.webcamStatus = 'Requesting access...';
  state.micStatus = 'Requesting access...';
  state.deviceError = '';

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    state.webcamStatus = 'Not supported';
    state.micStatus = 'Not supported';
    state.deviceError = 'This browser does not support camera and microphone access.';
    return null;
  }

  var videoTrack = null;
  var audioTrack = null;
  var videoErr = null;
  var audioErr = null;

  try {
    var combinedStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: { echoCancellation: true, noiseSuppression: true }
    });
    var vTracks = combinedStream.getVideoTracks();
    var aTracks = combinedStream.getAudioTracks();
    if (vTracks.length) videoTrack = vTracks[0];
    if (aTracks.length) audioTrack = aTracks[0];
  } catch (err) {
    try {
      var vStream = await navigator.mediaDevices.getUserMedia({ video: true });
      var vt = vStream.getVideoTracks();
      if (vt.length) videoTrack = vt[0];
    } catch (ve) {
      videoErr = ve;
    }

    try {
      var aStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      var at = aStream.getAudioTracks();
      if (at.length) audioTrack = at[0];
    } catch (ae) {
      audioErr = ae;
    }
  }

  if (videoTrack && videoTrack.readyState === 'live') {
    state.webcamStatus = 'Ready';
  } else if (videoErr) {
    if (videoErr.name === 'NotAllowedError' || videoErr.name === 'PermissionDeniedError') {
      state.webcamStatus = 'Permission denied';
    } else if (videoErr.name === 'NotFoundError' || videoErr.name === 'DevicesNotFoundError') {
      state.webcamStatus = 'Not found';
    } else if (videoErr.name === 'NotReadableError' || videoErr.name === 'TrackStartError') {
      state.webcamStatus = 'In use by another app';
    } else {
      state.webcamStatus = 'Not available';
    }
  } else {
    state.webcamStatus = 'Not available';
  }

  if (audioTrack && audioTrack.readyState === 'live') {
    state.micStatus = 'Ready';
  } else if (audioErr) {
    if (audioErr.name === 'NotAllowedError' || audioErr.name === 'PermissionDeniedError') {
      state.micStatus = 'Permission denied';
    } else if (audioErr.name === 'NotFoundError' || audioErr.name === 'DevicesNotFoundError') {
      state.micStatus = 'Not found';
    } else if (audioErr.name === 'NotReadableError' || audioErr.name === 'TrackStartError') {
      state.micStatus = 'In use by another app';
    } else {
      state.micStatus = 'Not available';
    }
  } else {
    state.micStatus = 'Not available';
  }

  var tracks = [];
  if (videoTrack) tracks.push(videoTrack);
  if (audioTrack) tracks.push(audioTrack);

  if (tracks.length > 0) {
    state.interviewStream = new MediaStream(tracks);
    state.deviceTested = true;
  } else {
    state.interviewStream = null;
    state.deviceTested = false;
  }

  var errs = [];
  if (state.webcamStatus !== 'Ready') errs.push('Camera: ' + state.webcamStatus);
  if (state.micStatus !== 'Ready') errs.push('Microphone: ' + state.micStatus);
  state.deviceError = errs.join(' | ');

  return state.interviewStream;
}

function stopInterviewDevices() {
  if (state.audioMonitor) { try { state.audioMonitor.proc.disconnect(); state.audioMonitor.src.disconnect(); state.audioMonitor.ctx.close(); } catch(e) {} state.audioMonitor = null; }
  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') { try { state.mediaRecorder.stop(); } catch(e) {} }
  state.mediaRecorder = null;
  state.recordedChunks = [];
  if (state.interviewerAudio) { try { state.interviewerAudio.pause(); } catch(e) {} state.interviewerAudio = null; }
  if (state.interviewStream) {
    state.interviewStream.getTracks().forEach(function(track) {
      try { track.stop(); } catch(e) {}
    });
  }
  state.interviewStream = null;
  state.webcamStatus = 'Not active';
  state.micStatus = 'Not active';
  state.isRequestingDevices = false;
  state.deviceRequestFailed = false;
}

function setSessionStatus(message, color) {
  var el = document.getElementById('session-status');
  if (!el) return;
  el.textContent = message;
  el.className = 'mt-3 text-xs ' + (color || 'text-white/40');
}

async function testCandidateDevices() {
  var status = document.getElementById('device-status');
  var button = document.getElementById('btn-test-devices') || document.getElementById('btn-test-room-devices');
  if (button) {
    button.disabled = true;
    button.textContent = 'Testing...';
  }
  if (status) {
    status.textContent = 'Checking camera and microphone access...';
    status.className = 'mt-3 text-xs text-indigo-300';
  }

  state.deviceRequestFailed = false;
  await enableInterviewDevices();

  var camera = document.getElementById('candidate-camera');
  if (camera && state.interviewStream) {
    camera.srcObject = state.interviewStream;
  }

  if (button) {
    button.disabled = false;
    button.textContent = 'Test Devices';
  }

  var isSuccess = state.webcamStatus === 'Ready' && state.micStatus === 'Ready';
  if (status) {
    if (isSuccess) {
      status.textContent = 'Camera and microphone are ready.';
      status.className = 'mt-3 text-xs text-emerald-400';
    } else {
      status.textContent = state.deviceError || 'Device test completed with warnings.';
      status.className = 'mt-3 text-xs text-rose-400';
    }
  }

  render();
}

function bindCandidateInterviewEvents() {
  /* ── Resume file events ── */
  var dropzone = document.getElementById('mic-resume-dropzone');
  var fileInput = document.getElementById('mic-resume-file');
  var replaceBtn = document.getElementById('btn-replace-resume');
  var removeBtn = document.getElementById('btn-remove-resume');

  function handleFileSelect(file) {
    if (!file) return;
    var ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'pdf' && ext !== 'docx') {
      state.resumeError = 'Please upload a PDF or DOCX file under 5MB.';
      state.resumeStatus = 'error';
      render();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      state.resumeError = 'Please upload a PDF or DOCX file under 5MB.';
      state.resumeStatus = 'error';
      render();
      return;
    }
    state.resumeError = '';
    state.resumeStatus = 'uploading';
    render();

    setTimeout(function() {
      if (state.resumeStatus === 'uploading') {
        state.resumeStatus = 'analyzing';
        render();
      }
    }, 600);

    api.uploadResume(file).then(function(res) {
      state.configResume = res.resume;
      state.resumeStatus = 'ready';
      state.resumeError = '';
      render();
    }).catch(function(err) {
      state.configResume = null;
      state.resumeStatus = 'error';
      state.resumeError = err.message || 'Please upload a PDF or DOCX file under 5MB.';
      render();
    });
  }

  if (dropzone) {
    dropzone.addEventListener('click', function(e) {
      if (e.target.tagName !== 'INPUT' && fileInput) fileInput.click();
    });
    dropzone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropzone.classList.add('mic-resume-zone-active');
    });
    dropzone.addEventListener('dragleave', function(e) {
      e.preventDefault();
      dropzone.classList.remove('mic-resume-zone-active');
    });
    dropzone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropzone.classList.remove('mic-resume-zone-active');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });
  }

  if (replaceBtn && fileInput) {
    replaceBtn.addEventListener('click', function() { fileInput.click(); });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', function() {
      state.configResume = null;
      state.resumeStatus = 'idle';
      state.resumeError = '';
      render();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function() {
      if (this.files && this.files[0]) handleFileSelect(this.files[0]);
    });
  }

  var configRoundSelect = document.getElementById('config-round-select');
  if (configRoundSelect) configRoundSelect.addEventListener('change', function() {
    state.configRound = this.value;
    state.configFocus = [];
    state.configError = '';
    render();
  });
  document.querySelectorAll('.config-mode-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { state.configMode = this.dataset.mode; state.configError = ''; render(); });
  });
  document.querySelectorAll('.config-qty-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { state.configNumQuestions = parseInt(this.dataset.qty); render(); });
  });
  document.querySelectorAll('.config-time-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { state.configTimeDuration = parseInt(this.dataset.time); state.configMode = 'time'; render(); });
  });
  var configDiffSelect = document.getElementById('config-diff-select');
  if (configDiffSelect) configDiffSelect.addEventListener('change', function() { state.configDifficulty = this.value; state.configError = ''; render(); });
  var configDurationSelect = document.getElementById('config-duration-select');
  if (configDurationSelect) configDurationSelect.addEventListener('change', function() { state.configTimeDuration = parseInt(this.value); state.configMode = 'time'; render(); });
  document.querySelectorAll('.config-focus-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var f = this.dataset.focus;
      var i = state.configFocus.indexOf(f);
      if (i === -1) state.configFocus.push(f);
      else state.configFocus.splice(i, 1);
      render();
    });
  });
  document.querySelectorAll('.config-style-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { state.configQuestionStyle = this.dataset.style; render(); });
  });
  document.querySelectorAll('.config-interviewer-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { state.configInterviewerStyle = this.dataset.interviewer; render(); });
  });
  var configJobRole = document.getElementById('config-job-role');
  if (configJobRole) configJobRole.addEventListener('input', function() {
    state.configJobRole = this.value;
    state.configError = '';
    var errEl = document.querySelector('.config-error-box');
    if (errEl) errEl.remove();
    var summary = document.querySelector('#config-summary-role');
    if (summary) summary.textContent = (this.value || 'General');
  });
  var configStart = document.getElementById('config-start');
  if (configStart) configStart.addEventListener('click', function() { startCandidateInterview(this); });
  var testDevices = document.getElementById('btn-test-devices');
  if (testDevices) testDevices.addEventListener('click', testCandidateDevices);
  var testRoomDevices = document.getElementById('btn-test-room-devices');
  if (testRoomDevices) testRoomDevices.addEventListener('click', testCandidateDevices);
  var backToInterviews = document.getElementById('btn-back-to-interviews');
  if (backToInterviews) backToInterviews.addEventListener('click', function() { state.section = 'interviews'; render(); });
  var endSession = document.getElementById('btn-end-session');
  if (endSession) endSession.addEventListener('click', function() { stopInterviewDevices(); state.section = 'interviews'; render(); });

  var btnStartSession = document.getElementById('btn-start-interview-session');
  if (btnStartSession) btnStartSession.addEventListener('click', startInterviewSession);

  var btnPauseSession = document.getElementById('btn-pause-interview-session');
  if (btnPauseSession) btnPauseSession.addEventListener('click', pauseInterviewSession);

  var btnResumeSession = document.getElementById('btn-resume-interview-session');
  if (btnResumeSession) btnResumeSession.addEventListener('click', resumeInterviewSession);

  var btnEndInterviewSession = document.getElementById('btn-end-interview-session');
  if (btnEndInterviewSession) btnEndInterviewSession.addEventListener('click', showEndInterviewModal);

  var btnNextQ = document.getElementById('btn-next-question');
  if (btnNextQ) btnNextQ.addEventListener('click', nextQuestion);

  var modalCancel = document.getElementById('modal-confirm-cancel');
  if (modalCancel) modalCancel.addEventListener('click', closeEndInterviewModal);

  var modalEnd = document.getElementById('modal-confirm-end');
  if (modalEnd) modalEnd.addEventListener('click', confirmEndInterviewSession);

  if (!window._reportDelegationBound) {
    window._reportDelegationBound = true;
    document.addEventListener('click', async function(e) {
      var btn = e.target.closest('.btn-view-report, #btn-view-interview-report, .history-report-btn');
      if (btn) {
        e.preventDefault();
        var id = btn.dataset.id || btn.dataset.reportId;
        if (!id) return;
        try {
          var report = await api.getInterviewReport(id);
          state.activeReportModal = report;
          render();
        } catch(err) {
          window.alert('Unable to load report: ' + (err.message || 'Report not found'));
        }
      }

      var playBtn = e.target.closest('.btn-play-video');
      if (playBtn) {
        e.preventDefault();
        var sessionId = playBtn.dataset.sessionId;
        var recId = playBtn.dataset.recId;
        var recordings = state.recordingsData || [];
        var found = recordings.find(function(r) { return String(r.id) === String(recId) || String(r.session_id) === String(sessionId); });
        if (found) {
          state.activeVideoModal = found;
          render();
        }
      }

      var closeVideo = e.target.closest('#video-modal-close, #video-modal-close-btn');
      if (closeVideo) {
        e.preventDefault();
        state.activeVideoModal = null;
        render();
      }

      var videoOverlay = document.getElementById('video-modal-overlay');
      if (videoOverlay && e.target === videoOverlay) {
        state.activeVideoModal = null;
        render();
      }
    });
  }

  if (!window._videoEscBound) {
    window._videoEscBound = true;
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && state.activeVideoModal) {
        state.activeVideoModal = null;
        render();
      }
    });
  }

  var reportClose = document.getElementById('report-modal-close');
  if (reportClose) reportClose.addEventListener('click', function() { state.activeReportModal = null; render(); });
  var reportOverlay = document.getElementById('report-modal-overlay');
  if (reportOverlay) reportOverlay.addEventListener('click', function(e) { if (e.target === reportOverlay) { state.activeReportModal = null; render(); } });
  var reportBack = document.getElementById('report-back');
  if (reportBack) reportBack.addEventListener('click', function() { state.activeReportModal = null; render(); });

  /* ── Report accordion ── */
  document.querySelectorAll('.report-accordion').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var body = document.querySelector(this.dataset.target);
      if (!body) return;
      var chev = this.querySelector('.report-chevron');
      var isHidden = body.classList.contains('hidden');
      document.querySelectorAll('.report-accordion').forEach(function(other) {
        if (other !== btn) {
          var otherBody = document.querySelector(other.dataset.target);
          if (otherBody) otherBody.classList.add('hidden');
          var otherChev = other.querySelector('.report-chevron');
          if (otherChev) otherChev.style.transform = '';
        }
      });
      if (isHidden) {
        body.classList.remove('hidden');
        if (chev) chev.style.transform = 'rotate(180deg)';
        body.querySelectorAll('.report-progress').forEach(function(bar) {
          var w = parseFloat(bar.dataset.w || '0');
          window.requestAnimationFrame(function() { window.requestAnimationFrame(function() { bar.style.width = w + '%'; }); });
        });
      } else {
        body.classList.add('hidden');
        if (chev) chev.style.transform = '';
      }
    });
  });

  /* ── Report nav scroll ── */
  document.querySelectorAll('.report-nav-link').forEach(function(link) {
    link.addEventListener('click', function() {
      var target = document.querySelector(this.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ── Animate report progress bars ── */
  document.querySelectorAll('.report-progress').forEach(function(bar) {
    var w = parseFloat(bar.dataset.w || '0');
    window.requestAnimationFrame(function() {
      window.requestAnimationFrame(function() { bar.style.width = w + '%'; });
    });
  });

  /* ── History toolbar bindings ── */
  var histSearch = document.getElementById('hist-search');
  if (histSearch) histSearch.addEventListener('input', function() { state.historySearch = this.value; state.historyPage = 1; render(); });
  var histType = document.getElementById('hist-type-filter');
  if (histType) histType.addEventListener('change', function() { state.historyTypeFilter = this.value; state.historyPage = 1; render(); });
  var histDate = document.getElementById('hist-date-filter');
  if (histDate) histDate.addEventListener('change', function() { state.historyDateFilter = this.value; state.historyPage = 1; render(); });
  var histRating = document.getElementById('hist-rating-filter');
  if (histRating) histRating.addEventListener('change', function() { state.historyRatingFilter = this.value; state.historyPage = 1; render(); });
  var histSort = document.getElementById('hist-sort');
  if (histSort) histSort.addEventListener('change', function() { state.historySort = this.value; state.historyPage = 1; render(); });
  var histPrev = document.getElementById('hist-prev');
  if (histPrev) histPrev.addEventListener('click', function() { if (state.historyPage > 1) { state.historyPage--; render(); } });
  var histNext = document.getElementById('hist-next');
  if (histNext) histNext.addEventListener('click', function() { state.historyPage++; render(); });

  /* ── Animate score bars ── */
  document.querySelectorAll('.score-bar').forEach(function(bar) {
    var target = parseFloat(bar.dataset.score || '0');
    window.requestAnimationFrame(function() {
      window.requestAnimationFrame(function() { bar.style.width = target + '%'; });
    });
  });

  /* ── History trend chart ── */
  var trendCanvas = document.getElementById('chart-history-trend');
  if (trendCanvas && state.historyData && state.historyData.length >= 2) {
    var trendItems = state.historyData.slice(0, 6).slice().reverse();
    var labels = trendItems.map(function(h) { return '#' + h.id; });
    var vals = trendItems.map(function(h) { return h.overall_score || h.total_score || 0; });
    drawAreaChart('chart-history-trend', [
      { label: 'Score', data: vals, color: INDIGO },
    ], labels);
  }

  /* ── Camera Stream Binding & Lifecycle ── */
  if (state.section === 'session' && !state.interviewStream && !state.isRequestingDevices && !state.deviceRequestFailed) {
    state.isRequestingDevices = true;
    enableInterviewDevices().then(function(stream) {
      state.isRequestingDevices = false;
      var cam = document.getElementById('candidate-camera');
      if (cam && stream) cam.srcObject = stream;
      render();
    }).catch(function() {
      state.isRequestingDevices = false;
      state.deviceRequestFailed = true;
      render();
    });
  } else if (state.section === 'session' && state.interviewStream) {
    var cam = document.getElementById('candidate-camera');
    if (cam && cam.srcObject !== state.interviewStream) {
      cam.srcObject = state.interviewStream;
    }
  } else if (state.section !== 'session' && state.section !== 'assessment-session' && state.interviewStream) {
    stopInterviewDevices();
  }
}

function renderRubricBadge(rating, score) {
  var r = rating || (score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Average' : score >= 40 ? 'Needs Improvement' : 'Poor');
  var style = 'background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3)';
  if (r === 'Good') style = 'background:rgba(99,102,241,0.15);color:#818cf8;border:1px solid rgba(99,102,241,0.3)';
  else if (r === 'Average') style = 'background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)';
  else if (r === 'Needs Improvement') style = 'background:rgba(244,63,94,0.15);color:#f43f5e;border:1px solid rgba(244,63,94,0.3)';
  else if (r === 'Poor') style = 'background:rgba(225,29,72,0.2);color:#fda4af;border:1px solid rgba(225,29,72,0.4)';
  return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold" style="${style}">${r}</span>`;
}

function renderReportModal(report) {
  if (!report) return '';
  var comm = (report.communication_score !== null && report.communication_score !== undefined) ? report.communication_score : (report.total_score || 0);
  var conf = (report.confidence_score !== null && report.confidence_score !== undefined) ? report.confidence_score : (report.total_score || 0);
  var tech = (report.technical_score !== null && report.technical_score !== undefined) ? report.technical_score : (report.total_score || 0);
  var prof = (report.professionalism_score !== null && report.professionalism_score !== undefined) ? report.professionalism_score : (report.total_score || 0);
  var overall = (report.overall_score !== null && report.overall_score !== undefined) ? report.overall_score : (report.total_score || 0);
  var rating = report.performance_rating || reportScoreRating(overall);

  var strengths = report.strengths || [];
  var weaknesses = report.weaknesses || [];
  var improvements = report.improvements || [];
  var recommendations = report.recommendations || [];
  var resources = report.resources || [];
  var questions = report.questions || [];
  var params = report.detailed_parameters || {};
  if (!params || Object.keys(params).length === 0) {
    params = {
      speech_clarity: comm, grammar_quality: comm, filler_word_freq: comm, speaking_pace: comm, response_completeness: comm,
      eye_contact_consistency: conf, facial_engagement: conf, response_hesitation: conf, speaking_confidence: conf, attention_level: conf,
      technical_accuracy: tech, keyword_relevance: tech, problem_solving_ability: tech, domain_knowledge: tech, answer_completeness: tech,
      time_management: prof, response_organization: prof, professional_communication: prof, interview_etiquette: prof
    };
  }

  /* ── Format date ── */
  var dateLine = formatDateTime(report.completed_at || report.created_at);

  var itype = report.interview_type ? report.interview_type.charAt(0).toUpperCase() + report.interview_type.slice(1) : 'Interview';
  var diff = report.difficulty ? report.difficulty.charAt(0).toUpperCase() + report.difficulty.slice(1) : 'General';

  /* ── Performance summary computations ── */
  var paramEntries = Object.keys(params).filter(function(k) { return typeof params[k] === 'number'; })
    .map(function(k) { return { key: k, val: params[k] }; });
  var strongest = paramEntries.length ? paramEntries.reduce(function(a, b) { return a.val >= b.val ? a : b; }) : null;
  var weakest = paramEntries.length ? paramEntries.reduce(function(a, b) { return a.val <= b.val ? a : b; }) : null;
  function prettyParam(key) {
    var map = {
      speech_clarity: 'Speech Clarity', grammar_quality: 'Grammar Quality', filler_word_freq: 'Filler Word Control',
      speaking_pace: 'Speaking Pace', response_completeness: 'Response Completeness',
      eye_contact_consistency: 'Eye Contact', facial_engagement: 'Facial Engagement',
      response_hesitation: 'Response Hesitation', speaking_confidence: 'Speaking Confidence', attention_level: 'Attention Level',
      technical_accuracy: 'Technical Accuracy', keyword_relevance: 'Keyword Relevance',
      problem_solving_ability: 'Problem Solving', domain_knowledge: 'Domain Knowledge', answer_completeness: 'Answer Completeness',
      time_management: 'Time Management', response_organization: 'Response Organization',
      professional_communication: 'Professional Communication', interview_etiquette: 'Etiquette',
    };
    return map[key] || key;
  }

  var avgQScore = questions.length ? questions.reduce(function(s, q) { return s + (q.score || 0); }, 0) / questions.length : 0;

  /* ── Section nav ── */
  var sections = [
    { id: 'report-overview', label: 'Overview' },
    { id: 'report-performance', label: 'Performance' },
    { id: 'report-gaps', label: 'Strengths & Gaps' },
    { id: 'report-plan', label: 'Improvement Plan' },
    { id: 'report-resources', label: 'Resources' },
    { id: 'report-questions', label: 'Question Analysis' },
  ];

  /* ── Dimension groups ── */
  var dimGroups = [
    { name: 'Communication', color: INDIGO, icon: icon('messageSquare', 13), keys: ['speech_clarity', 'grammar_quality', 'speaking_pace', 'response_completeness'] },
    { name: 'Confidence', color: CYAN, icon: icon('activity', 13), keys: ['eye_contact_consistency', 'facial_engagement', 'speaking_confidence', 'attention_level'] },
    { name: 'Technical', color: EMERALD, icon: icon('cpu', 13), keys: ['technical_accuracy', 'keyword_relevance', 'problem_solving_ability', 'domain_knowledge'] },
    { name: 'Professionalism', color: AMBER, icon: icon('briefcase', 13), keys: ['time_management', 'response_organization', 'professional_communication', 'interview_etiquette'] },
  ];
  function fallbackFor(group) {
    return group.name === 'Communication' ? comm : group.name === 'Confidence' ? conf : group.name === 'Technical' ? tech : prof;
  }

  return `<div id="report-modal-overlay" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto report-overlay" style="background:rgba(0,0,0,0.8);backdrop-filter:blur(6px)">
    <div class="w-full max-w-5xl my-6 lg:my-10 rounded-2xl border border-white/10 overflow-hidden report-modal-card" style="background:#0d0f1e">

      <!-- Sticky nav -->
      <div class="sticky top-0 z-20 px-6 py-3 border-b border-white/6 flex items-center gap-1 overflow-x-auto report-nav" style="background:#0d0f1e;backdrop-filter:blur(8px)">
        ${sections.map(function(s) { return `<button class="report-nav-link whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors" data-target="#${s.id}">${s.label}</button>`; }).join('')}
        <div class="ml-auto shrink-0">
          <button id="report-modal-close" class="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors">&times;</button>
        </div>
      </div>

      <div class="p-6 lg:p-10 space-y-8">

        <!-- 1. Report Header Bar -->
        <div class="report-section" id="report-overview">
          <div class="p-6 rounded-2xl border border-white/8 relative overflow-hidden" style="background:#0c0e1c">
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500"></div>
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <button id="report-back" class="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-indigo-300 transition-colors mb-2">${icon('arrowLeft', 13)} Back to Interview History</button>
                <div class="flex items-center gap-2 mb-1">
                  <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">AI Assessment Report</span>
                  ${renderRubricBadge(rating, overall)}
                </div>
                <h2 class="text-2xl font-bold text-white mt-1" style="font-family:'Outfit',sans-serif">${itype} Interview Assessment</h2>
                <p class="text-white/40 text-xs mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span class="capitalize text-white/70 font-medium">${itype}</span><span class="text-white/20">&bull;</span>
                  <span>${report.domain || 'General'}</span><span class="text-white/20">&bull;</span>
                  <span>${diff}</span><span class="text-white/20">&bull;</span>
                  <span class="inline-flex items-center gap-1">${icon('calendar', 12)} ${dateLine}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Dashboard Score Cards: Overall Score Card + 4 Category Score Cards -->
        <div class="report-section grid grid-cols-1 lg:grid-cols-12 gap-4" id="report-overview2">
          
          <!-- Overall Performance Card (Pure Flow Layout - No Absolute Collisions) -->
          <div class="lg:col-span-4 rounded-2xl border border-white/8 p-6 flex flex-col items-center justify-between text-center relative overflow-hidden" style="background:#0c0e1c">
            <div class="w-full">
              <p class="text-white/50 text-xs font-semibold uppercase tracking-wider">Overall Performance</p>
            </div>
            
            <div class="my-5 flex flex-col items-center justify-center space-y-2">
              <div class="text-4xl lg:text-5xl font-extrabold text-white" style="font-family:'Outfit',sans-serif">${overall.toFixed(1)}%</div>
              <span class="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider" style="${reportRatingStyle(rating)}">${rating}</span>
            </div>

            <div class="w-full pt-3 border-t border-white/5">
              <p class="text-white/40 text-xs font-medium">Overall Interview Score</p>
            </div>
          </div>

          <!-- Category Score Cards Grid (2x2 Grid) -->
          <div class="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            ${[
              { label: 'Communication', val: comm, color: INDIGO, icon: icon('messageSquare', 15), w: '30%' },
              { label: 'Confidence', val: conf, color: CYAN, icon: icon('activity', 15), w: '25%' },
              { label: 'Technical Relevance', val: tech, color: EMERALD, icon: icon('cpu', 15), w: '30%' },
              { label: 'Professionalism', val: prof, color: AMBER, icon: icon('briefcase', 15), w: '15%' },
            ].map(function(m) {
              var r = reportScoreRating(m.val);
              return `<div class="p-4 rounded-2xl border border-white/8 flex flex-col justify-between space-y-3" style="background:#0c0e1c">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style="background:${m.color}1a;color:${m.color};border:1px solid ${m.color}33">${m.icon}</span>
                    <p class="text-white font-semibold text-xs">${m.label}</p>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[11px] font-semibold text-white/40 bg-white/5 border border-white/5">[${m.w}]</span>
                </div>
                <div class="flex items-baseline justify-between pt-1">
                  <span class="text-2xl font-extrabold text-white" style="font-family:'Outfit',sans-serif">${m.val.toFixed(1)}%</span>
                  <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style="${reportRatingStyle(r)}">${r}</span>
                </div>
                <div class="w-full h-1.5 rounded-full bg-white/6 overflow-hidden">
                  <div class="h-full rounded-full report-progress" data-w="${Math.min(100, Math.max(0, m.val))}" style="background:${m.color}"></div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- 3. Performance Breakdown -->
        <div class="report-section" id="report-performance">
          <h3 class="text-base font-semibold text-white mb-3" style="font-family:'Outfit',sans-serif">Performance Breakdown</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${dimGroups.map(function(g) {
              var fallback = fallbackFor(g);
              var items = g.keys.map(function(k) { return { name: prettyParam(k), val: params[k] !== undefined ? params[k] : fallback }; });
              return `<div class="rounded-2xl border border-white/8 p-4" style="background:#0c0e1c">
                <div class="flex items-center gap-2 mb-3">
                  <span class="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style="background:${g.color}1f;color:${g.color}">${g.icon}</span>
                  <p class="text-white/70 text-xs font-semibold uppercase tracking-wider">${g.name}</p>
                </div>
                <div class="space-y-2.5">
                  ${items.map(function(it) {
                    var pct = Math.min(100, Math.max(0, it.val));
                    return `<div>
                      <div class="flex items-center justify-between text-xs mb-1">
                        <span class="text-white/60">${it.name}</span>
                        <span class="text-white font-semibold">${it.val.toFixed(0)}%</span>
                      </div>
                      <div class="w-full h-1.5 rounded-full bg-white/6 overflow-hidden">
                        <div class="h-full rounded-full report-progress" data-w="${pct}" style="background:${g.color}"></div>
                      </div>
                    </div>`;
                  }).join('')}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- 4. Quick Performance Summary -->
        <div class="report-section rounded-2xl border border-white/8 p-5" style="background:#0c0e1c">
          <p class="text-white font-semibold text-sm mb-3" style="font-family:'Outfit',sans-serif">Performance Summary</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <p class="text-white/40 text-[11px]">Strongest Area</p>
              <p class="text-white text-xs font-semibold mt-1">${strongest ? prettyParam(strongest.key) : '—'}</p>
              <p class="text-emerald-400 text-xs font-bold mt-0.5">${strongest ? strongest.val.toFixed(0) + '%' : '—'}</p>
            </div>
            <div class="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
              <p class="text-white/40 text-[11px]">Needs Most Attention</p>
              <p class="text-white text-xs font-semibold mt-1">${weakest ? prettyParam(weakest.key) : '—'}</p>
              <p class="text-rose-400 text-xs font-bold mt-0.5">${weakest ? weakest.val.toFixed(0) + '%' : '—'}</p>
            </div>
            <div class="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
              <p class="text-white/40 text-[11px]">Overall Score</p>
              <p class="text-white text-xs font-semibold mt-1">${overall.toFixed(1)}%</p>
              <p class="text-indigo-300 text-xs font-bold mt-0.5 capitalize">${rating}</p>
            </div>
            <div class="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <p class="text-white/40 text-[11px]">Improvement Potential</p>
              <p class="text-white text-xs font-semibold mt-1">${overall < 60 ? 'High' : overall < 75 ? 'Moderate' : 'Low'}</p>
              <p class="text-amber-400 text-xs font-bold mt-0.5">${overall < 60 ? 'Focus needed' : overall < 75 ? 'Keep growing' : 'Great shape'}</p>
            </div>
          </div>
        </div>

        <!-- 5. Strengths & Weaknesses -->
        <div class="report-section grid grid-cols-1 md:grid-cols-2 gap-4" id="report-gaps">
          <div class="rounded-2xl border border-emerald-500/20 p-5" style="background:linear-gradient(180deg,rgba(16,185,129,0.06),transparent);background-color:#0c0e1c">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:rgba(16,185,129,0.15);color:#34d399">${icon('checkCircle2', 15)}</span>
              <p class="text-white text-xs font-semibold uppercase tracking-wider" style="font-family:'Outfit',sans-serif">Strengths</p>
            </div>
            <ul class="space-y-2">
              ${strengths.length ? strengths.map(function(s) { return `<li class="flex items-start gap-2 text-xs text-white/80 leading-relaxed"><span class="mt-0.5 text-emerald-400 shrink-0">${icon('checkCircle', 13)}</span><span>${s}</span></li>`; }).join('') : '<li class="text-xs text-white/50">Good engagement throughout the interview.</li>'}
            </ul>
          </div>
          <div class="rounded-2xl border border-amber-500/20 p-5" style="background:linear-gradient(180deg,rgba(245,158,11,0.05),transparent);background-color:#0c0e1c">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:rgba(245,158,11,0.15);color:#fbbf24">${icon('alertTriangle', 15)}</span>
              <p class="text-white text-xs font-semibold uppercase tracking-wider" style="font-family:'Outfit',sans-serif">Weaknesses &amp; Gaps</p>
            </div>
            <ul class="space-y-2">
              ${weaknesses.length ? weaknesses.map(function(w) { return `<li class="flex items-start gap-2 text-xs text-white/80 leading-relaxed"><span class="mt-0.5 text-amber-400 shrink-0">${icon('alertCircle', 13)}</span><span>${w}</span></li>`; }).join('') : '<li class="text-xs text-white/50">Consider elaborating on specific technical metrics.</li>'}
            </ul>
          </div>
        </div>

        <!-- 6. AI Improvement Plan -->
        <div class="report-section" id="report-plan">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:rgba(99,102,241,0.15);color:#a5b4fc">${icon('lightbulb', 15)}</span>
            <h3 class="text-base font-semibold text-white" style="font-family:'Outfit',sans-serif">AI Improvement Plan</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="rounded-2xl border border-white/8 p-4" style="background:#0c0e1c">
              <p class="text-white/40 text-[11px] uppercase tracking-wider font-semibold">What to Improve</p>
              <div class="mt-3 space-y-3">
                ${improvements.length ? improvements.slice(0, 4).map(function(imp, i) {
                  return `<div class="flex items-start gap-2.5">
                    <span class="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0" style="background:rgba(99,102,241,0.15);color:#a5b4fc">${String(i + 1).padStart(2, '0')}</span>
                    <p class="text-xs text-white/80 leading-relaxed">${imp}</p>
                  </div>`;
                }).join('') : '<p class="text-xs text-white/50">Focus on structured responses.</p>'}
              </div>
            </div>
            <div class="rounded-2xl border border-white/8 p-4" style="background:#0c0e1c">
              <p class="text-white/40 text-[11px] uppercase tracking-wider font-semibold">How to Improve</p>
              <div class="mt-3 space-y-3">
                ${improvements.length > 4 ? improvements.slice(4).map(function(imp, i) {
                  return `<div class="flex items-start gap-2.5">
                    <span class="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0" style="background:rgba(6,182,212,0.15);color:#67e8f9">${String(i + 5).padStart(2, '0')}</span>
                    <p class="text-xs text-white/80 leading-relaxed">${imp}</p>
                  </div>`;
                }).join('') : '<p class="text-xs text-white/50">Practice delivering complete, structured answers.</p>'}
              </div>
            </div>
            <div class="rounded-2xl border border-white/8 p-4" style="background:#0c0e1c">
              <p class="text-white/40 text-[11px] uppercase tracking-wider font-semibold">Practice Next</p>
              <div class="mt-3 space-y-3">
                ${recommendations.length ? recommendations.map(function(rec, i) {
                  return `<div class="flex items-start gap-2.5">
                    <span class="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0" style="background:rgba(16,185,129,0.15);color:#34d399">${String(i + 1).padStart(2, '0')}</span>
                    <p class="text-xs text-white/80 leading-relaxed">${rec}</p>
                  </div>`;
                }).join('') : '<p class="text-xs text-white/50">Take another mock interview to keep improving.</p>'}
              </div>
            </div>
          </div>
        </div>

        <!-- 7. Learning Resources -->
        ${resources.length ? `<div class="report-section" id="report-resources">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:rgba(6,182,212,0.15);color:#67e8f9">${icon('bookOpen', 15)}</span>
            <h3 class="text-base font-semibold text-white" style="font-family:'Outfit',sans-serif">Recommended Learning Resources</h3>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            ${resources.map(function(res) {
              return `<div class="p-4 rounded-2xl border border-white/8 flex flex-col justify-between transition-colors hover:border-white/15" style="background:#0c0e1c">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider" style="background:rgba(99,102,241,0.15);color:#a5b4fc;border:1px solid rgba(99,102,241,0.25)">${res.type || 'Resource'}</span>
                  </div>
                  <p class="text-white text-xs font-semibold">${res.title}</p>
                  <p class="text-white/40 text-xs mt-1 leading-relaxed">${res.description}</p>
                </div>
                ${res.link ? `<a href="${res.link}" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200 font-medium transition-colors">Explore Resource ${icon('chevronRight', 12)}</a>` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        <!-- 8. Question-by-Question Analysis -->
        ${questions.length ? `<div class="report-section" id="report-questions">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:rgba(99,102,241,0.15);color:#a5b4fc">${icon('messageSquare', 15)}</span>
              <h3 class="text-base font-semibold text-white" style="font-family:'Outfit',sans-serif">Question-by-Question Analysis</h3>
            </div>
            <div class="text-right">
              <p class="text-white/60 text-xs">${questions.length} Questions &bull; Avg Score: <strong class="text-white">${avgQScore.toFixed(0)}%</strong></p>
            </div>
          </div>
          <div class="space-y-3">
            ${questions.map(function(q, idx) {
              var qScore = q.score || 0;
              var qRating = reportScoreRating(qScore);
              var cat = q.category || 'General';
              var qColor = qScore >= 75 ? EMERALD : qScore >= 60 ? INDIGO : qScore >= 40 ? AMBER : ROSE;
              return `<div class="rounded-2xl border border-white/8 overflow-hidden" style="background:#0c0e1c">
                <button class="report-accordion w-full flex items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]" data-target=".report-q-body-${idx}">
                  <div class="flex items-center gap-3 min-w-0">
                    <span class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0" style="background:${qColor}1f;color:${qColor}">${idx + 1}</span>
                    <div class="min-w-0">
                      <p class="text-white/70 text-xs font-semibold uppercase tracking-wider">${cat}</p>
                      <p class="text-white text-xs font-medium truncate mt-0.5 max-w-md">${q.question_text}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-4 shrink-0">
                    <div class="text-right hidden sm:block">
                      <p class="text-white font-bold text-xs">${qScore.toFixed(0)}%</p>
                      <p class="text-[10px]" style="color:${qColor}">${qRating}</p>
                    </div>
                    <span class="report-chevron text-white/40 transition-transform">${icon('chevronDown', 14)}</span>
                  </div>
                </button>
                <div class="report-q-body-${idx} hidden px-5 pb-5 space-y-4 border-t border-white/6 pt-4">
                  <div>
                    <p class="text-[11px] uppercase tracking-wider text-white/40 font-semibold mb-1.5">Question</p>
                    <p class="text-white/80 text-xs leading-relaxed">${q.question_text}</p>
                  </div>
                  <div>
                    <p class="text-[11px] uppercase tracking-wider text-indigo-400 font-semibold mb-1.5">Your Response</p>
                    <div class="rounded-xl border-l-2 p-3 text-xs text-white/75 leading-relaxed" style="border-color:${INDIGO};background:rgba(99,102,241,0.05)">${q.answer_text || 'No response recorded.'}</div>
                  </div>
                  <div>
                    <p class="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold mb-1.5">AI Feedback</p>
                    <div class="rounded-xl border border-emerald-500/15 p-3 text-xs text-white/75 leading-relaxed" style="background:rgba(16,185,129,0.04)">${q.feedback || 'Answer evaluated.'}</div>
                  </div>
                  <div class="flex items-center gap-2 justify-end">
                    <span class="text-xs text-white/40">Question Score</span>
                    <div class="w-28 h-1.5 rounded-full bg-white/6 overflow-hidden">
                      <div class="h-full rounded-full report-progress" data-w="${Math.min(100, Math.max(0, qScore))}" style="background:${qColor}"></div>
                    </div>
                    <span class="text-white font-bold text-xs">${qScore.toFixed(0)}%</span>
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

      </div>
    </div>
  </div>`;
}

function reportScoreRating(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Average';
  if (score >= 40) return 'Needs Improvement';
  return 'Poor';
}

function reportRatingStyle(r) {
  if (r === 'Excellent') return 'background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3)';
  if (r === 'Good') return 'background:rgba(99,102,241,0.15);color:#818cf8;border:1px solid rgba(99,102,241,0.3)';
  if (r === 'Average') return 'background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)';
  if (r === 'Needs Improvement') return 'background:rgba(244,63,94,0.15);color:#f43f5e;border:1px solid rgba(244,63,94,0.3)';
  return 'background:rgba(225,29,72,0.2);color:#fda4af;border:1px solid rgba(225,29,72,0.4)';
}

function renderScoreRing(score, rating) {
  var pct = Math.min(100, Math.max(0, score));
  var r = 52;
  var c = 2 * Math.PI * r;
  var filled = (pct / 100) * c;
  var color = score >= 75 ? EMERALD : score >= 60 ? INDIGO : score >= 40 ? AMBER : ROSE;
  var ratingColor = rating === 'Excellent' ? EMERALD : rating === 'Good' ? INDIGO : rating === 'Average' ? AMBER : rating === 'Needs Improvement' ? ROSE : '#e11d48';
  return `<div class="relative w-32 h-32">
    <svg viewBox="0 0 130 130" class="w-full h-full -rotate-90">
      <circle cx="65" cy="65" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="9" />
      <circle cx="65" cy="65" r="${r}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round"
        stroke-dasharray="${filled} ${c - filled}" style="transition:stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)" />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <span class="text-3xl font-extrabold text-white" style="font-family:'Outfit',sans-serif">${score.toFixed(1)}%</span>
      <span class="text-xs font-semibold mt-0.5 capitalize" style="color:${ratingColor}">${rating}</span>
    </div>
  </div>`;
}

function candidateAnalytics() {
  if (!state.analyticsData) {
    api.getAnalyticsSummary().then(function(data) {
      state.analyticsData = data;
      render();
    }).catch(function() {});
  }
  var data = state.analyticsData || { sessions_completed: 0 };
  var hasData = data.sessions_completed > 0;
  var comm = data.avg_communication || 0;
  var conf = data.avg_confidence || 0;
  var tech = data.avg_technical || 0;
  var prof = data.avg_professionalism || 0;
  var overall = data.avg_overall || 0;

  var modalHtml = state.activeReportModal ? renderReportModal(state.activeReportModal) : '';

  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Performance Analytics</h1>
        <p class="text-white/40 text-sm mt-1">Multi-dimensional assessment feedback across completed sessions.</p>
      </div>
      ${hasData ? renderRubricBadge(data.performance_rating, overall) : ''}
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      ${statCard(icon('play', 18), 'Sessions Evaluated', String(data.sessions_completed), null, INDIGO)}
      ${statCard(icon('star', 18), 'Overall Score', hasData ? overall.toFixed(1) + '%' : '—', null, CYAN)}
      ${statCard(icon('award', 18), 'Top Parameter', data.top_skill || '—', null, EMERALD)}
      ${statCard(icon('activity', 18), 'Rating Rubric', data.performance_rating || '—', null, AMBER)}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="rounded-xl border border-white/7 p-5 space-y-4" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Assessment Breakdown by Dimension</p>
        ${hasData ? `<div class="space-y-4 pt-2">
          ${[
            { name: 'Communication Score (30%)', desc: 'Clarity, grammar, pace, filler words', val: comm, col: INDIGO },
            { name: 'Confidence Score (25%)', desc: 'Eye contact, engagement, hesitation', val: conf, col: CYAN },
            { name: 'Technical Relevance (30%)', desc: 'Accuracy, domain knowledge, keywords', val: tech, col: EMERALD },
            { name: 'Professionalism (15%)', desc: 'Time management, organization, etiquette', val: prof, col: AMBER },
          ].map(function(d) {
            return `<div>
              <div class="flex items-center justify-between text-xs mb-1">
                <div><span class="text-white font-medium">${d.name}</span><p class="text-white/35 text-[10px]">${d.desc}</p></div>
                <span class="text-white font-bold text-sm">${d.val.toFixed(1)}%</span>
              </div>
              <div class="w-full h-2 rounded-full bg-white/6 overflow-hidden">
                <div class="h-full rounded-full" style="width:${Math.min(100, Math.max(0, d.val))}%;background:${d.col}"></div>
              </div>
            </div>`;
          }).join('')}
        </div>` : `<div class="flex flex-col items-center justify-center h-48 text-center"><p class="text-white/30 text-sm">Complete interviews to unlock assessment analytics.</p></div>`}
      </div>

      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Performance Rubric Distribution</p>
        <div class="space-y-3">
          ${[
            { range: '90 - 100%', label: 'Excellent', color: '#10b981' },
            { range: '75 - 89%', label: 'Good', color: '#818cf8' },
            { range: '60 - 74%', label: 'Average', color: '#f59e0b' },
            { range: '40 - 59%', label: 'Needs Improvement', color: '#f43f5e' },
            { range: 'Below 40%', label: 'Poor', color: '#e11d48' },
          ].map(function(rub) {
            var isCurrent = data.performance_rating === rub.label;
            return `<div class="flex items-center justify-between p-2.5 rounded-lg border border-white/5" style="${isCurrent ? 'background:rgba(255,255,255,0.05);border-color:' + rub.color + '60' : 'background:#141627'}">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full" style="background:${rub.color}"></span>
                <span class="text-xs text-white/80 font-medium">${rub.label}</span>
                <span class="text-[10px] text-white/40">(${rub.range})</span>
              </div>
              ${isCurrent ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded" style="background:${rub.color}25;color:${rub.color}">Current Rating</span>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>${modalHtml}`;
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
  if (!state.historyData) {
    api.getInterviewHistory().then(function(res) {
      state.historyData = res.history || [];
      render();
    }).catch(function() {});
  }
  var history = state.historyData || [];
  var modalHtml = state.activeReportModal ? renderReportModal(state.activeReportModal) : '';

  /* ── Summary metrics ── */
  var total = history.length;
  var scores = history.map(function(h) { return h.overall_score || h.total_score || 0; });
  var avgScore = scores.length ? scores.reduce(function(a, b) { return a + b; }, 0) / scores.length : 0;
  var bestScore = scores.length ? Math.max.apply(null, scores) : 0;
  var trend = null;
  if (scores.length >= 2) {
    var diff = scores[0] - scores[1];
    trend = diff >= 0 ? '+' + diff.toFixed(1) : diff.toFixed(1);
  }

  /* ── Apply search + filters ── */
  var q = (state.historySearch || '').toLowerCase();
  var filtered = history.filter(function(h) {
    if (q) {
      var hay = ((h.interview_type || '') + ' ' + (h.domain || '') + ' #' + h.id).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (state.historyTypeFilter !== 'all' && (h.interview_type || '').toLowerCase() !== state.historyTypeFilter) return false;
    if (state.historyRatingFilter !== 'all') {
      var r = h.performance_rating || '';
      if (state.historyRatingFilter === 'excellent' && r !== 'Excellent') return false;
      if (state.historyRatingFilter === 'good' && r !== 'Good') return false;
      if (state.historyRatingFilter === 'average' && r !== 'Average') return false;
      if (state.historyRatingFilter === 'improve' && r !== 'Needs Improvement') return false;
      if (state.historyRatingFilter === 'poor' && r !== 'Poor') return false;
    }
    if (state.historyDateFilter !== 'all') {
      var ds = h.completed_at || h.created_at || '';
      var d = parseUTCDate(ds);
      if (!d || isNaN(d.getTime())) return false;
      var now = Date.now();
      var days = state.historyDateFilter === '7' ? 7 : state.historyDateFilter === '30' ? 30 : state.historyDateFilter === '90' ? 90 : 365;
      if ((now - d.getTime()) > days * 86400000) return false;
    }
    return true;
  });

  /* ── Sort ── */
  if (state.historySort === 'oldest') filtered = filtered.slice().reverse();
  else if (state.historySort === 'high') filtered = filtered.slice().sort(function(a, b) { return (b.overall_score || b.total_score || 0) - (a.overall_score || a.total_score || 0); });
  else if (state.historySort === 'low') filtered = filtered.slice().sort(function(a, b) { return (a.overall_score || a.total_score || 0) - (b.overall_score || b.total_score || 0); });

  /* ── Pagination ── */
  var perPage = state.historyPerPage;
  var totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  if (state.historyPage > totalPages) state.historyPage = totalPages;
  var pageItems = filtered.slice((state.historyPage - 1) * perPage, state.historyPage * perPage);

  /* ── Performance overview stats ── */
  function avgOf(type) {
    var arr = history.filter(function(h) { return (h.interview_type || '').toLowerCase() === type; })
      .map(function(h) { return h.overall_score || h.total_score || 0; });
    return arr.length ? arr.reduce(function(a, b) { return a + b; }, 0) / arr.length : null;
  }
  var techAvg = avgOf('technical');
  var behAvg = avgOf('behavioral');
  var hrAvg = avgOf('hr');
  var latestScore = scores.length ? scores[0] : null;

  var typeOptions = [
    { v: 'all', l: 'All Types' }, { v: 'technical', l: 'Technical' },
    { v: 'behavioral', l: 'Behavioral' }, { v: 'hr', l: 'HR' }, { v: 'aptitude', l: 'Aptitude' },
  ];
  var ratingOptions = [
    { v: 'all', l: 'All Ratings' }, { v: 'excellent', l: 'Excellent' }, { v: 'good', l: 'Good' },
    { v: 'average', l: 'Average' }, { v: 'improve', l: 'Needs Improvement' }, { v: 'poor', l: 'Poor' },
  ];
  var sortOptions = [
    { v: 'newest', l: 'Newest' }, { v: 'oldest', l: 'Oldest' },
    { v: 'high', l: 'Highest Score' }, { v: 'low', l: 'Lowest Score' },
  ];
  var dateOptions = [
    { v: 'all', l: 'All Dates' }, { v: '7', l: 'Last 7 Days' },
    { v: '30', l: 'Last 30 Days' }, { v: '90', l: 'Last 90 Days' }, { v: '365', l: 'This Year' },
  ];
  function selOptions(opts, current) {
    return opts.map(function(o) {
      return `<option value="${o.v}" ${o.v === current ? 'selected' : ''}>${o.l}</option>`;
    }).join('');
  }

  /* ── Trend chart data (last 6 interviews) ── */
  var trendData = history.slice(0, 6).map(function(h) { return h.overall_score || h.total_score || 0; });
  var trendLabels = history.slice(0, 6).map(function(_, i) { return '#' + (history.length - i); });
  var chartHtml = '';
  if (trendData.length >= 2) {
    chartHtml = `<div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <div class="flex items-center justify-between mb-4">
        <div><p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Score Trend</p><p class="text-white/35 text-xs mt-0.5">Your scores across recent interviews</p></div>
        ${renderRubricBadge('', avgScore)}
      </div>
      <div class="chart-container" style="height:180px"><canvas id="chart-history-trend"></canvas></div>
    </div>`;
  }

  return `<div class="space-y-6">
    <!-- Page header -->
    <div>
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Interview History</h1>
      <p class="text-white/40 text-sm mt-1">Review your previous interviews and track your progress over time.</p>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div class="stat-icon" style="background:${INDIGO}22"><span style="color:${INDIGO}">${icon('monitorPlay', 18)}</span></div>
        </div>
        <div><p class="stat-value">${total}</p><p class="stat-label">Total Interviews</p></div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div class="stat-icon" style="background:${CYAN}22"><span style="color:${CYAN}">${icon('star', 18)}</span></div>
        </div>
        <div><p class="stat-value">${avgScore ? avgScore.toFixed(1) + '%' : '—'}</p><p class="stat-label">Average Score</p></div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div class="stat-icon" style="background:${EMERALD}22"><span style="color:${EMERALD}">${icon('award', 18)}</span></div>
        </div>
        <div><p class="stat-value">${bestScore ? bestScore.toFixed(1) + '%' : '—'}</p><p class="stat-label">Best Score</p></div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div class="stat-icon" style="background:${trend !== null && trend.startsWith('+') ? EMERALD : ROSE}22"><span style="color:${trend !== null && trend.startsWith('+') ? EMERALD : ROSE}">${icon('trendingUp', 18)}</span></div>
          ${trend !== null ? `<span class="delta ${trend.startsWith('+') ? 'positive' : 'negative'}">${trend.startsWith('+') ? icon('arrowUpRight') : icon('arrowDownRight')} ${trend}pts</span>` : ''}
        </div>
        <div><p class="stat-value">${trend !== null ? trend + ' pts' : '—'}</p><p class="stat-label">vs Previous Interview</p></div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="rounded-xl border border-white/7 p-4" style="background:#0d0f1e">
      <div class="flex flex-col md:flex-row md:items-center gap-3">
        <div class="flex-1 relative min-w-0">
          ${icon('search', 14)}
          <input id="hist-search" value="${state.historySearch}" placeholder="Search interviews..." class="history-search-input" />
        </div>
        <div class="flex flex-wrap gap-2">
          <select id="hist-date-filter" class="history-select">${selOptions(dateOptions, state.historyDateFilter)}</select>
          <select id="hist-type-filter" class="history-select">${selOptions(typeOptions, state.historyTypeFilter)}</select>
          <select id="hist-rating-filter" class="history-select">${selOptions(ratingOptions, state.historyRatingFilter)}</select>
          <select id="hist-sort" class="history-select">${selOptions(sortOptions, state.historySort)}</select>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-xl border border-white/7 overflow-hidden" style="background:#0d0f1e">
      <div class="overflow-x-auto">
      <table class="w-full text-sm history-table"><thead><tr class="border-b border-white/6">
        <th class="px-5 py-4 text-left text-white/35 font-medium text-xs uppercase tracking-wider">Session</th>
        <th class="px-5 py-4 text-left text-white/35 font-medium text-xs uppercase tracking-wider">Type</th>
        <th class="px-5 py-4 text-left text-white/35 font-medium text-xs uppercase tracking-wider">Date &amp; Time</th>
        <th class="px-5 py-4 text-left text-white/35 font-medium text-xs uppercase tracking-wider">Questions</th>
        <th class="px-5 py-4 text-left text-white/35 font-medium text-xs uppercase tracking-wider">Rating</th>
        <th class="px-5 py-4 text-left text-white/35 font-medium text-xs uppercase tracking-wider">Score</th>
        <th class="px-5 py-4 text-right text-white/35 font-medium text-xs uppercase tracking-wider">Report</th>
      </tr></thead><tbody>
      ${pageItems.length ? pageItems.map(function(i) {
        var score = i.overall_score || i.total_score || 0;
        var rating = i.performance_rating || '';
        var dateStr = i.completed_at || i.created_at || '';
        var dateLine = formatDate(dateStr);
        var timeLine = formatTime(dateStr);
        var typeLower = (i.interview_type || '').toLowerCase();
        var typePill = badge(i.interview_type || 'General', typeLower === 'technical' ? 'indigo' : typeLower === 'behavioral' ? 'emerald' : typeLower === 'hr' ? 'cyan' : 'amber');
        return `<tr class="border-b border-white/4 history-row transition-colors">
          <td class="px-5 py-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style="background:rgba(99,102,241,0.12);color:#818cf8;border:1px solid rgba(99,102,241,0.25)">#${i.id}</div>
              <div class="min-w-0">
                <p class="text-white font-semibold text-sm leading-tight">${i.domain || 'General'}</p>
                <p class="text-white/35 text-xs mt-0.5">${i.difficulty ? i.difficulty.charAt(0).toUpperCase() + i.difficulty.slice(1) : ''} difficulty</p>
              </div>
            </div>
          </td>
          <td class="px-5 py-4">${typePill}</td>
          <td class="px-5 py-4">
            <p class="text-white/70 text-xs">${dateLine}</p>
            ${timeLine ? `<p class="text-white/35 text-xs mt-0.5 flex items-center gap-1">${icon('clock', 11)} ${timeLine}</p>` : ''}
          </td>
          <td class="px-5 py-4">
            <span class="text-white/70 font-mono text-xs">${i.questions_answered || 0} / ${i.total_questions || 0}</span>
          </td>
          <td class="px-5 py-4">${renderRubricBadge(rating, score)}</td>
          <td class="px-5 py-4">
            <div class="w-24">
              <div class="flex items-center justify-between mb-1">
                <span class="text-white font-bold text-sm">${score.toFixed(1)}%</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-white/6 overflow-hidden">
                <div class="h-full rounded-full score-bar" data-score="${Math.min(100, Math.max(0, score))}" style="background:${score >= 75 ? EMERALD : score >= 60 ? AMBER : ROSE};width:0%"></div>
              </div>
            </div>
          </td>
          <td class="px-5 py-4 text-right">
            <button class="btn-view-report history-report-btn" data-id="${i.id}">View Report ${icon('chevronRight', 12)}</button>
          </td>
        </tr>`;
      }).join('') : `<tr><td colspan="7" class="px-5 py-16 text-center">
        <div class="flex flex-col items-center gap-3">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white/20" style="background:#141627">${icon('fileText', 22)}</div>
          <p class="text-white/50 text-sm">${history.length ? 'No interviews match your filters.' : 'No interview history yet. Start a mock interview to begin tracking.'}</p>
        </div>
      </td></tr>`}
      </tbody></table>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between px-5 py-4 border-t border-white/6">
        <p class="text-xs text-white/40">Showing ${filtered.length ? ((state.historyPage - 1) * perPage + 1) + '-' + Math.min(state.historyPage * perPage, filtered.length) : 0} of ${filtered.length} interviews</p>
        <div class="flex items-center gap-2">
          <button id="hist-prev" class="history-page-btn" ${state.historyPage <= 1 ? 'disabled' : ''}>${icon('chevronRight', 12)}</button>
          <span class="text-xs text-white/50 font-mono">${state.historyPage} / ${totalPages}</span>
          <button id="hist-next" class="history-page-btn" ${state.historyPage >= totalPages ? 'disabled' : ''}>${icon('chevronRight', 12)}</button>
        </div>
      </div>
    </div>

    <!-- Trend chart + Performance overview -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      ${chartHtml || `<div class="lg:col-span-1 rounded-xl border border-white/7 p-5 flex items-center justify-center h-56 text-center" style="background:#0d0f1e"><p class="text-white/30 text-sm">Complete more interviews to see your score trend.</p></div>`}
      <div class="lg:col-span-2 rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Performance Overview</p>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          ${[
            { l: 'Average Score', v: avgScore ? avgScore.toFixed(1) + '%' : '—', c: INDIGO },
            { l: 'Technical Avg', v: techAvg !== null ? techAvg.toFixed(1) + '%' : '—', c: INDIGO },
            { l: 'Behavioral Avg', v: behAvg !== null ? behAvg.toFixed(1) + '%' : '—', c: EMERALD },
            { l: 'HR Avg', v: hrAvg !== null ? hrAvg.toFixed(1) + '%' : '—', c: CYAN },
            { l: 'Latest Score', v: latestScore !== null ? latestScore.toFixed(1) + '%' : '—', c: AMBER },
            { l: 'Improvement', v: trend !== null ? trend + ' pts' : '—', c: trend !== null && trend.startsWith('+') ? EMERALD : ROSE },
          ].map(function(card) {
            return `<div class="p-3 rounded-lg border border-white/6" style="background:#141627">
              <p class="text-white/40 text-xs">${card.l}</p>
              <p class="text-white font-bold text-base mt-1" style="color:${card.c}">${card.v}</p>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>${modalHtml}`;
}

function candidateReports() {
  if (!state.reportsData) {
    api.getInterviewHistory().then(function(res) {
      state.reportsData = res.history || [];
      render();
    }).catch(function() {});
  }
  var reports = state.reportsData || [];
  var modalHtml = state.activeReportModal ? renderReportModal(state.activeReportModal) : '';

  return `<div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Evaluation Reports</h1>
      <p class="text-white/40 text-sm mt-1">Detailed AI feedback reports, strengths, and practice recommendations.</p>
    </div>
    ${reports.length ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${reports.map(function(r) {
        var score = r.overall_score || r.total_score || 0;
        return `<div class="rounded-xl border border-white/7 p-5 space-y-4" style="background:#0d0f1e">
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-white font-semibold text-base uppercase" style="font-family:'Outfit',sans-serif">${r.interview_type} Interview</h3>
                ${renderRubricBadge(r.performance_rating, score)}
              </div>
              <p class="text-white/40 text-xs">${r.domain || 'General Domain'} &bull; ${formatDateTime(r.completed_at || r.created_at)}</p>
            </div>
            <div class="text-right">
              <span class="text-2xl font-bold text-white">${score.toFixed(1)}%</span>
            </div>
          </div>
          <div class="grid grid-cols-4 gap-2 pt-2 border-t border-white/6 text-center">
            <div><p class="text-[10px] text-white/35">Comm 30%</p><p class="text-xs font-bold text-indigo-300">${(r.communication_score || score).toFixed(0)}%</p></div>
            <div><p class="text-[10px] text-white/35">Conf 25%</p><p class="text-xs font-bold text-cyan-300">${(r.confidence_score || score).toFixed(0)}%</p></div>
            <div><p class="text-[10px] text-white/35">Tech 30%</p><p class="text-xs font-bold text-emerald-300">${(r.technical_score || score).toFixed(0)}%</p></div>
            <div><p class="text-[10px] text-white/35">Prof 15%</p><p class="text-xs font-bold text-amber-300">${(r.professionalism_score || score).toFixed(0)}%</p></div>
          </div>
          <button class="btn-view-report w-full py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 text-xs font-semibold transition-colors" data-id="${r.id}">View Detailed AI Evaluation Report</button>
        </div>`;
      }).join('')}
    </div>` : `<div class="flex flex-col items-center justify-center py-16 text-center">
      <p class="text-white/30 text-sm">No reports available yet. Complete interviews to generate reports.</p>
    </div>`}
  </div>${modalHtml}`;
}

function candidateRecordings() {
  if ((state.recordingsData === null || state.recordingsData === undefined) && !state._fetchingRecordings) {
    state._fetchingRecordings = true;
    api.getAllRecordings().then(function(res) {
      state._fetchingRecordings = false;
      state.recordingsData = res.recordings || [];
      render();
    }).catch(function() {
      state._fetchingRecordings = false;
      state.recordingsData = [];
      render();
    });
  }
  var recordings = state.recordingsData || [];
  var modalHtml = state.activeReportModal ? renderReportModal(state.activeReportModal) : '';
  var videoModalHtml = state.activeVideoModal ? renderVideoPlayerModal(state.activeVideoModal) : '';

  var totalSec = recordings.reduce(function(acc, r) { return acc + (r.duration || 0); }, 0);
  var totalMin = Math.round(totalSec / 60);

  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Interview Recordings</h1>
        <p class="text-white/40 text-sm mt-1">Access, review, and playback full video & audio recordings from your completed mock interviews.</p>
      </div>
    </div>

    <!-- Stat Header Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="rounded-xl border border-white/7 p-5 flex items-center gap-4" style="background:#0d0f1e">
        <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          ${icon('film', 20)}
        </div>
        <div>
          <p class="text-white/40 text-xs uppercase tracking-wider font-semibold">Saved Recordings</p>
          <p class="text-xl font-bold text-white mt-0.5">${recordings.length} ${recordings.length === 1 ? 'Session' : 'Sessions'}</p>
        </div>
      </div>

      <div class="rounded-xl border border-white/7 p-5 flex items-center gap-4" style="background:#0d0f1e">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          ${icon('clock', 20)}
        </div>
        <div>
          <p class="text-white/40 text-xs uppercase tracking-wider font-semibold">Total Video Time</p>
          <p class="text-xl font-bold text-white mt-0.5">${totalMin} Minutes</p>
        </div>
      </div>

      <div class="rounded-xl border border-white/7 p-5 flex items-center gap-4" style="background:#0d0f1e">
        <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
          ${icon('shield', 20)}
        </div>
        <div>
          <p class="text-white/40 text-xs uppercase tracking-wider font-semibold">Storage Privacy</p>
          <p class="text-xs font-semibold text-cyan-300 mt-1">Encrypted JWT Access Control</p>
        </div>
      </div>
    </div>

    ${recordings.length ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      ${recordings.map(function(rec) {
        var score = rec.overall_score || 0;
        var durStr = Math.floor(rec.duration / 60) + 'm ' + (rec.duration % 60) + 's';
        var sizeMb = rec.file_size_bytes ? (rec.file_size_bytes / (1024 * 1024)).toFixed(1) + ' MB' : 'Video';
        return `<div class="rounded-xl border border-white/10 overflow-hidden space-y-0 flex flex-col justify-between hover:border-indigo-500/30 transition-all duration-300 shadow-lg" style="background:#0d0f1e">
          <div>
            <!-- Video Thumbnail Header -->
            <div class="relative w-full aspect-video bg-gradient-to-br from-[#121528] via-[#090b16] to-[#181b36] flex flex-col items-center justify-center group overflow-hidden cursor-pointer btn-play-video" data-session-id="${rec.session_id}" data-rec-id="${rec.id}">
              <div class="w-12 h-12 rounded-full bg-indigo-600/90 group-hover:bg-indigo-500 group-hover:scale-110 flex items-center justify-center text-white shadow-lg shadow-indigo-500/40 transition-all duration-300 z-10">
                ${icon('play', 20)}
              </div>
              <span class="text-xs font-semibold text-white/90 mt-2 z-10 group-hover:text-indigo-200 transition-colors">Watch Session Recording</span>

              <div class="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-[10px] font-medium text-emerald-300 backdrop-blur-md z-10 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>HD RECORDING</span>
              </div>

              <div class="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white/90 backdrop-blur-sm z-10">${durStr}</div>
            </div>

            <!-- Card Content -->
            <div class="p-5 space-y-4">
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="text-white font-bold text-sm uppercase tracking-wide" style="font-family:'Outfit',sans-serif">${rec.interview_type} Interview</h3>
                  <p class="text-white/40 text-xs mt-0.5">${rec.domain || 'General'} &bull; <span class="capitalize text-indigo-300/80">${rec.difficulty || 'medium'}</span></p>
                </div>
                ${score ? renderRubricBadge(rec.performance_rating, score) : ''}
              </div>

              <div class="p-3 rounded-lg border border-white/6 space-y-1.5 text-xs" style="background:#141627">
                <div class="flex justify-between text-white/60"><span>Candidate:</span> <strong class="text-white font-medium">${rec.candidate_name || 'Candidate'}</strong></div>
                <div class="flex justify-between text-white/60"><span>Recorded:</span> <span class="text-white/80">${formatDateTime(rec.created_at)}</span></div>
                <div class="flex justify-between text-white/60"><span>Size:</span> <span class="text-white/80">${sizeMb}</span></div>
              </div>
            </div>
          </div>

          <!-- Card Actions -->
          <div class="p-5 pt-0 grid grid-cols-2 gap-2.5">
            <button class="btn-play-video px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all" data-session-id="${rec.session_id}" data-rec-id="${rec.id}">
              ${icon('play', 14)} Watch Video
            </button>
            <button class="btn-view-report px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all" data-id="${rec.session_id}">
              ${icon('fileText', 14)} Report
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>` : `<div class="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-white/7 p-8" style="background:#0d0f1e">
      <div class="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/30 mb-3">${icon('film', 28)}</div>
      <h3 class="text-white font-semibold text-base mb-1">No Recordings Available Yet</h3>
      <p class="text-white/40 text-xs max-w-md">Attend and complete mock interview sessions with your webcam enabled to view saved session recordings here.</p>
    </div>`}
  </div>${modalHtml}`;
}

function renderVideoPlayerModal(rec) {
  if (!rec) return '';
  var token = localStorage.getItem('smarthire_token') || (state && state.token) || '';
  var streamUrl = '/api/interviews/' + rec.session_id + '/recordings/' + rec.id + '/stream?token=' + encodeURIComponent(token);
  var dlExt = 'webm';
  if (rec.file_path && rec.file_path.lastIndexOf('.') !== -1) {
    dlExt = rec.file_path.split('.').pop();
  } else if (rec.mime_type && rec.mime_type.indexOf('mp4') !== -1) {
    dlExt = 'mp4';
  } else if (rec.mime_type && (rec.mime_type.indexOf('matroska') !== -1 || rec.mime_type.indexOf('mkv') !== -1)) {
    dlExt = 'mkv';
  }

  var durSec = rec.duration || 0;
  var durStr = Math.floor(durSec / 60) + 'm ' + String(durSec % 60).padStart(2, '0') + 's';
  var sizeMb = rec.file_size_bytes ? (rec.file_size_bytes / (1024 * 1024)).toFixed(1) + ' MB' : 'N/A';
  var interviewTypeTitle = (rec.interview_type || 'Technical') + ' Session Recording';
  var dateStr = formatDateTime(rec.created_at || rec.session_created_at);

  return `<div id="video-modal-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;z-index:999999;background:rgba(4,6,14,0.88);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box">
    <div id="video-modal-container" class="animate-in fade-in zoom-in-95 duration-200" style="position:relative;width:min(1000px,100%);max-height:calc(100vh - 48px);background:#0d0f1e;border:1px solid rgba(255,255,255,0.12);border-radius:1rem;box-shadow:0 25px 50px -12px rgba(0,0,0,0.85);display:flex;flex-direction:column;overflow:hidden;margin:auto">
      
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-white/8 flex items-start justify-between shrink-0" style="background:#090a15">
        <div>
          <h3 class="text-white font-bold text-base capitalize tracking-wide" style="font-family:'Outfit',sans-serif">${interviewTypeTitle}</h3>
          <p class="text-white/40 text-xs mt-0.5">${rec.domain || 'General Domain'} &bull; Candidate: <strong class="text-white/80 font-medium">${rec.candidate_name || 'Candidate'}</strong> &bull; ${dateStr}</p>
        </div>
        <button id="video-modal-close" class="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors text-xl font-bold ml-4" title="Close (Esc)">&times;</button>
      </div>

      <!-- HTML5 Video Player Container -->
      <div class="relative w-full flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[220px]" style="max-height:calc(100vh - 200px);aspect-ratio:16/9;background:#000">
        <video controls autoplay class="w-full h-full object-contain" style="max-height:calc(100vh - 200px);aspect-ratio:16/9;background:#000">
          <source src="${streamUrl}" type="${rec.mime_type || 'video/webm'}">
          Your browser does not support HTML5 video streaming.
        </video>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0" style="background:#090a15">
        <div class="flex items-center gap-4 text-xs text-white/50 font-medium">
          <span>Session ID: <strong class="text-indigo-300 font-semibold">#${rec.session_id}</strong></span>
          <span>Size: <strong class="text-white/80 font-semibold">${sizeMb}</strong></span>
          <span>Duration: <strong class="text-white/80 font-semibold">${durStr}</strong></span>
        </div>
        <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
          <a href="${streamUrl}" download="interview_session_${rec.session_id}.${dlExt}" target="_blank" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center gap-2 transition-all">
            ${icon('downloadLg', 14)} Download Recording (.${dlExt.toUpperCase()})
          </a>
          <button id="video-modal-close-btn" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/30">
            Close
          </button>
        </div>
      </div>

    </div>
  </div>`;
}


/* ══════════════════════════════════════════════════
   PRACTICE ASSESSMENT FEATURE IMPLEMENTATION
   ══════════════════════════════════════════════════ */

var ALL_ASSESSMENT_TOPICS = [
  'Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Data Interpretation',
  'Data Structures', 'Algorithms', 'Programming', 'Database', 'SQL',
  'Operating Systems', 'Computer Networks', 'OOP & Design Patterns',
  'Java', 'Python', 'JavaScript', 'React', 'Node.js',
  'Cloud & DevOps', 'AI & Machine Learning', 'System Design'
];

function candidateAssessment() {
  var topics = state.assessmentSelectedTopics || [];
  var devReady = state.deviceTested;

  return `<div class="mic-page">
    <!-- Page Header -->
    <div style="width:100%;max-width:580px;margin-bottom:1rem">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Practice Assessment</h1>
      <p class="text-white/40 text-xs mt-1">Configure your AI-powered assessment and test your skills under real interview conditions.</p>
    </div>

    <!-- Main Config Card -->
    <div class="mic-card">
      <!-- Header -->
      <div class="mic-header">
        <div class="mic-header-title">
          <span class="mic-title-icon">${icon('clipboard', 14)}</span>
          Configure Practice Assessment
        </div>
        <p class="mic-header-sub">Set your role, topics, difficulty, and assessment preferences.</p>
      </div>

      <div class="mic-body">
        ${state.assessmentError ? `<div class="mic-error">${icon('alertTriangle', 13)} ${state.assessmentError}</div>` : ''}

        <!-- TARGET JOB ROLE -->
        <div class="mic-field">
          <label class="mic-label">Target Job Role</label>
          <div class="relative">
            <span class="mic-input-icon">${icon('briefcase', 13)}</span>
            <input id="inp-assessment-role" value="${state.assessmentTargetRole || ''}" placeholder="e.g. Software Engineer, Data Analyst" class="mic-input mic-input-with-icon" />
          </div>
        </div>

        <!-- ASSESSMENT TOPICS -->
        <div class="mic-field">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <label class="mic-label">Assessment Topics</label>
            <span style="font-size:0.65rem;color:#818cf8;font-weight:600">${topics.length} selected</span>
          </div>
          <div class="mic-chips">
            ${ALL_ASSESSMENT_TOPICS.map(function(t) {
              var isSelected = topics.includes(t);
              return `<button class="mic-chip ${isSelected ? 'active' : ''} btn-topic-chip" data-topic="${t}">${isSelected ? '✓ ' : ''}${t}</button>`;
            }).join('')}
          </div>
        </div>

        <!-- DIFFICULTY + QUESTIONS -->
        <div class="mic-row-2">
          <div class="mic-field">
            <label class="mic-label">Difficulty</label>
            <select id="config-assessment-diff-select" class="mic-select">
              <option value="easy" ${state.assessmentDifficulty === 'easy' ? 'selected' : ''}>Easy</option>
              <option value="medium" ${state.assessmentDifficulty === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="hard" ${state.assessmentDifficulty === 'hard' ? 'selected' : ''}>Hard</option>
            </select>
          </div>
          <div class="mic-field">
            <label class="mic-label">Questions</label>
            <select id="config-assessment-num-select" class="mic-select">
              <option value="5" ${state.assessmentNumQuestions === 5 ? 'selected' : ''}>5 Questions</option>
              <option value="10" ${state.assessmentNumQuestions === 10 ? 'selected' : ''}>10 Questions</option>
              <option value="15" ${state.assessmentNumQuestions === 15 ? 'selected' : ''}>15 Questions</option>
              <option value="20" ${state.assessmentNumQuestions === 20 ? 'selected' : ''}>20 Questions</option>
              <option value="30" ${state.assessmentNumQuestions === 30 ? 'selected' : ''}>30 Questions</option>
            </select>
          </div>
        </div>

        <!-- TIME LIMIT -->
        <div class="mic-field">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <label class="mic-label">Time Limit</label>
            <div style="display:flex;align-items:center;gap:0.375rem">
              <span style="font-size:0.65rem;color:rgba(255,255,255,0.4)">Custom:</span>
              <input id="inp-assessment-custom-time" type="number" min="1" max="180" value="${state.assessmentCustomTime || ''}" class="mic-input" style="width:3.5rem;height:1.625rem;padding:0 0.375rem;font-size:0.7rem;text-align:center" placeholder="15" />
              <span style="font-size:0.65rem;color:rgba(255,255,255,0.4)">min</span>
            </div>
          </div>
          <div class="mic-chips">
            ${[5, 10, 15, 20, 30].map(function(m) {
              var isSel = (state.assessmentTimeLimit === m);
              return `<button class="mic-chip ${isSel ? 'active' : ''} btn-assessment-time" data-time="${m}">${m} min</button>`;
            }).join('')}
          </div>
        </div>

        <!-- UPLOAD RESUME (OPTIONAL) -->
        <div class="mic-field">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <label class="mic-label">Upload Resume <span style="font-weight:400;text-transform:none;opacity:0.6">(Optional)</span></label>
            <span style="font-size:0.625rem;color:rgba(255,255,255,0.35);font-family:'Inter',sans-serif;font-weight:500">PERSONALIZED INTERVIEW FROM YOUR RESUME</span>
          </div>
          ${state.assessmentResume ? `
            <div class="mic-resume-card">
              <div style="display:flex;align-items:center;gap:0.625rem;min-width:0">
                <span class="mic-file-icon">📄</span>
                <div style="min-width:0">
                  <p class="mic-file-name" title="${state.assessmentResume.filename || state.assessmentResume.candidate_name || 'Resume'}">${state.assessmentResume.filename || state.assessmentResume.candidate_name || 'Resume'}</p>
                  <p class="mic-file-meta"><span style="color:#34d399;font-weight:600">✓ Resume ready</span> &bull; ${state.assessmentResume.skills ? state.assessmentResume.skills.length + ' skills' : 'Context ready'}</p>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:0.375rem;flex-shrink:0">
                <label for="inp-assessment-resume-replace" class="mic-resume-action-btn" style="display:inline-flex;align-items:center;cursor:pointer">Replace</label>
                <input type="file" id="inp-assessment-resume-replace" accept=".pdf,.docx" style="display:none" />
                <button id="btn-assessment-resume-remove" class="mic-resume-action-btn mic-remove-btn">Remove</button>
              </div>
            </div>
          ` : `
            <div id="assessment-resume-dropzone" class="mic-resume-zone">
              <input type="file" id="inp-assessment-resume" accept=".pdf,.docx" style="display:none" />
              <span class="mic-upload-icon">${icon('uploadCloud', 16)}</span>
              <p class="mic-upload-main">Click or drag & drop PDF / DOCX resume</p>
              <p class="mic-upload-sub">Max 5MB &bull; Personalizes assessment questions</p>
            </div>
          `}
        </div>

        <!-- ASSESSMENT MONITORING -->
        <div class="mic-field">
          <label class="mic-label">Assessment Monitoring</label>
          <div style="display:flex;align-items:center;gap:1rem;padding:0.5rem 0.75rem;border-radius:0.5rem;background:#0a0c18;border:1px solid rgba(255,255,255,0.05)">
            <span class="mic-device-indicator">
              <span class="mic-device-dot ready"></span>
              <span class="mic-device-label ready">Face Tracking</span>
            </span>
            <span class="mic-device-indicator">
              <span class="mic-device-dot ready"></span>
              <span class="mic-device-label ready">Eye Contact</span>
            </span>
            <span class="mic-device-indicator">
              <span class="mic-device-dot ready"></span>
              <span class="mic-device-label ready">Emotion Recognition</span>
            </span>
          </div>
        </div>

        <!-- DEVICE STATUS -->
        <div class="mic-device-bar">
          <div style="display:flex;align-items:center;gap:1rem">
            <span class="mic-device-indicator">
              <span class="mic-device-dot ${devReady ? 'ready' : 'warn'}"></span>
              Webcam: <span class="mic-device-label ${devReady ? 'ready' : 'warn'}">${devReady ? 'Ready' : 'Not tested'}</span>
            </span>
            <span class="mic-device-indicator">
              <span class="mic-device-dot ${devReady ? 'ready' : 'warn'}"></span>
              Mic: <span class="mic-device-label ${devReady ? 'ready' : 'warn'}">${devReady ? 'Ready' : 'Not tested'}</span>
            </span>
          </div>
          <button id="btn-test-assessment-devices" class="mic-test-btn">${icon('video', 10)} Test Devices</button>
        </div>

        <!-- SUMMARY -->
        <div class="mic-summary">
          <span><strong>Role:</strong> ${state.assessmentTargetRole || 'Software Engineer'}</span>
          <span class="mic-sep">&bull;</span>
          <span><strong>Topics:</strong> ${topics.length}</span>
          <span class="mic-sep">&bull;</span>
          <span><strong>Difficulty:</strong> <span style="text-transform:capitalize">${state.assessmentDifficulty || 'medium'}</span></span>
          <span class="mic-sep">&bull;</span>
          <span><strong>Questions:</strong> ${state.assessmentNumQuestions || 10}</span>
          <span class="mic-sep">&bull;</span>
          <span><strong>Duration:</strong> ${state.assessmentTimeLimit || 10} min</span>
          <span class="mic-sep">&bull;</span>
          <span><strong>Resume:</strong> <span style="${state.assessmentResume ? 'color:#6ee7b7;font-weight:600' : ''}">${state.assessmentResume ? 'Ready' : 'None'}</span></span>
        </div>

        <!-- CTA BUTTON -->
        <button id="btn-start-assessment" class="mic-cta">${icon('play', 14)} Start AI Practice Assessment</button>
      </div>
    </div>
  </div>`;
}


function candidateAssessmentSession() {
  var assessment = state.currentAssessment;
  var questions = state.currentAssessmentQuestions || [];
  var idx = state.assessmentQuestionIndex || 0;
  var q = questions[idx];

  if (!q) {
    return `<div class="p-8 text-center text-white/50">Loading assessment questions...</div>`;
  }

  var timeRem = state.assessmentTimeRemaining || 0;
  var mins = Math.floor(timeRem / 60);
  var secs = timeRem % 60;
  var timeStr = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
  var isUrgent = (timeRem <= 120);

  var answeredCount = Object.keys(state.assessmentAnswers || {}).length;
  var currentSelectedAnswer = state.assessmentAnswers[q.id] || '';

  var modalHtml = state.submitConfirmModal ? `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div class="bg-[#0d0f1e] border border-white/10 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <h3 class="text-lg font-bold text-white" style="font-family:'Outfit',sans-serif">Submit Practice Assessment?</h3>
        <p class="text-white/60 text-xs leading-relaxed">
          You have answered <strong class="text-indigo-400">${answeredCount}</strong> out of <strong class="text-white">${questions.length}</strong> questions.
          ${answeredCount < questions.length ? '<br/><span class="text-amber-400 font-medium">Warning: You have unanswered questions.</span>' : ''}
        </p>
        <div class="flex justify-end gap-3 pt-2">
          <button id="btn-modal-cancel-submit" class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors">Continue Test</button>
          <button id="btn-modal-confirm-submit" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/30 transition-all">Submit Now</button>
        </div>
      </div>
    </div>
  ` : '';

  return `<div class="space-y-4">
    <!-- Top Bar -->
    <div class="flex items-center justify-between p-4 rounded-xl border border-white/7" style="background:#0d0f1e">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-white font-bold text-base" style="font-family:'Outfit',sans-serif">Practice Assessment</h2>
          <span class="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">${assessment ? assessment.target_role : 'Technical'}</span>
        </div>
        <p class="text-white/40 text-xs mt-0.5">Question ${idx + 1} of ${questions.length} &bull; Answered ${answeredCount}/${questions.length}</p>
      </div>

      <div class="flex items-center gap-4">
        <!-- Timer -->
        <div class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border ${isUrgent ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse' : 'bg-white/5 border-white/10 text-indigo-300'}">
          ${icon('clock', 14)}
          <span class="font-mono font-bold text-sm">${timeStr}</span>
        </div>
        <button id="btn-session-submit-trigger" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-500/20">
          Submit Assessment
        </button>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div class="h-full bg-indigo-500 transition-all duration-300" style="width:${((idx + 1) / questions.length) * 100}%"></div>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left: MCQ Question View -->
      <div class="lg:col-span-2 rounded-xl border border-white/7 p-6 space-y-6 flex flex-col justify-between" style="background:#0d0f1e">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 font-medium">${q.topic || 'General'}</span>
            <span class="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 capitalize font-medium">${q.difficulty || 'medium'}</span>
          </div>

          <h3 class="text-white font-semibold text-lg leading-snug" style="font-family:'Outfit',sans-serif">
            ${idx + 1}. ${q.question_text}
          </h3>

          <div class="space-y-3 pt-2">
            ${(q.options || []).map(function(opt, oIdx) {
              var isSelected = (currentSelectedAnswer === opt);
              var letter = String.fromCharCode(65 + oIdx);
              return `<button class="btn-mcq-option w-full p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${isSelected ? 'bg-indigo-500/20 border-indigo-500/60 text-white shadow-md shadow-indigo-500/10' : 'bg-white/[0.01] border-white/10 text-white/70 hover:bg-white/[0.03] hover:border-white/20'}" data-option="${opt.replace(/"/g, '&quot;')}">
                <span class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${isSelected ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/60'}">${letter}</span>
                <span class="text-sm font-medium pt-0.5 leading-normal">${opt}</span>
              </button>`;
            }).join('')}
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="flex items-center justify-between pt-6 border-t border-white/6">
          <button id="btn-prev-question" class="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-colors ${idx === 0 ? 'opacity-40 cursor-not-allowed' : ''}" ${idx === 0 ? 'disabled' : ''}>
            &larr; Previous Question
          </button>
          <span class="text-xs text-white/40 font-mono">${idx + 1} / ${questions.length}</span>
          ${idx < questions.length - 1 ? `
            <button id="btn-next-question" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all">
              Next Question &rarr;
            </button>
          ` : `
            <button id="btn-session-submit-trigger-2" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all">
              Submit Assessment
            </button>
          `}
        </div>
      </div>

      <!-- Right: Live Monitoring Panel -->
      <div class="rounded-xl border border-white/7 p-5 space-y-5" style="background:#0d0f1e">
        <div class="flex items-center justify-between border-b border-white/6 pb-3">
          <h4 class="text-white font-semibold text-xs tracking-wider uppercase" style="font-family:'Outfit',sans-serif">Live Monitoring Panel</h4>
          <span class="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Active</span>
        </div>

        <!-- Webcam Stream -->
        <div class="relative rounded-lg overflow-hidden border border-white/10 aspect-video bg-black/60 flex items-center justify-center">
          <video id="assessment-webcam" class="w-full h-full object-cover" autoplay playsinline muted></video>
          <div class="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white/70 backdrop-blur-sm">Candidate Feed</div>
        </div>

        <!-- Monitoring Status List -->
        <div class="space-y-2.5 text-xs">
          <div class="flex items-center justify-between p-2.5 rounded-lg border border-white/6" style="background:#141627">
            <span class="text-white/60">Camera</span>
            <span class="font-medium text-emerald-400 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Ready</span>
          </div>
          <div class="flex items-center justify-between p-2.5 rounded-lg border border-white/6" style="background:#141627">
            <span class="text-white/60">Face</span>
            <span class="font-medium text-emerald-400 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ${state.assessmentFaceStatus || 'Detected'}</span>
          </div>
          <div class="flex items-center justify-between p-2.5 rounded-lg border border-white/6" style="background:#141627">
            <span class="text-white/60">Eye Contact</span>
            <span class="font-bold text-indigo-300">${state.assessmentEyeContact || 88}%</span>
          </div>
          <div class="flex items-center justify-between p-2.5 rounded-lg border border-white/6" style="background:#141627">
            <span class="text-white/60">Expression</span>
            <span class="font-medium text-cyan-300">${state.assessmentExpression || 'Neutral'}</span>
          </div>
        </div>

        <p class="text-[11px] text-white/35 text-center leading-relaxed">
          Assessment integrity system tracks face presence and gaze orientation.
        </p>
      </div>
    </div>
  </div>${modalHtml}`;
}

function candidateAssessmentResult() {
  var res = state.assessmentResult;
  if (!res) {
    return `<div class="p-8 text-center text-white/50">No assessment result found.</div>`;
  }

  var a = res.assessment || {};
  var questions = res.questions || [];

  var pct = a.score_percentage || 0;
  var topicPerf = a.topic_performance || {};
  var diffPerf = a.difficulty_performance || {};
  var integrity = a.integrity_metrics || { face_detected_pct: 95, eye_contact_pct: 88, look_away_events: 1, multiple_faces_events: 0 };
  var fb = a.ai_feedback || {};

  return `<div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Assessment Results</h1>
        <p class="text-white/40 text-sm mt-1">${a.target_role || 'Technical'} Practice Assessment &bull; Completed ${formatDateTime(a.completed_at || a.created_at)}</p>
      </div>
      <button id="btn-new-assessment" class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition-all">
        Configure New Assessment
      </button>
    </div>

    <!-- Top Score Overview Grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="md:col-span-1 rounded-xl border border-indigo-500/30 p-6 text-center space-y-2 flex flex-col items-center justify-center" style="background:linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.05))">
        <span class="text-xs text-indigo-300 font-semibold uppercase tracking-wider">OVERALL SCORE</span>
        <span class="text-4xl font-extrabold text-white" style="font-family:'Outfit',sans-serif">${pct.toFixed(1)}%</span>
        <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold ${pct >= 75 ? 'bg-emerald-500/20 text-emerald-300' : pct >= 50 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}">
          ${pct >= 75 ? 'Pass / High Proficiency' : pct >= 50 ? 'Moderate Proficiency' : 'Needs Practice'}
        </span>
      </div>

      <div class="md:col-span-3 rounded-xl border border-white/7 p-6 grid grid-cols-4 gap-4 items-center" style="background:#0d0f1e">
        <div class="text-center p-3 rounded-lg border border-white/6" style="background:#141627">
          <p class="text-white/40 text-xs">Total Questions</p>
          <p class="text-2xl font-bold text-white mt-1">${a.total_questions || questions.length}</p>
        </div>
        <div class="text-center p-3 rounded-lg border border-emerald-500/20" style="background:rgba(16,185,129,0.05)">
          <p class="text-emerald-400 text-xs">Correct</p>
          <p class="text-2xl font-bold text-emerald-300 mt-1">${a.correct_answers || 0}</p>
        </div>
        <div class="text-center p-3 rounded-lg border border-rose-500/20" style="background:rgba(244,63,94,0.05)">
          <p class="text-rose-400 text-xs">Incorrect</p>
          <p class="text-2xl font-bold text-rose-300 mt-1">${a.incorrect_answers || 0}</p>
        </div>
        <div class="text-center p-3 rounded-lg border border-white/6" style="background:#141627">
          <p class="text-white/40 text-xs">Unanswered</p>
          <p class="text-2xl font-bold text-white/60 mt-1">${a.unanswered || 0}</p>
        </div>
      </div>
    </div>

    <!-- Performance Breakdown & Integrity Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Topic Performance Breakdown -->
      <div class="lg:col-span-2 rounded-xl border border-white/7 p-6 space-y-4" style="background:#0d0f1e">
        <h3 class="text-white font-semibold text-base" style="font-family:'Outfit',sans-serif">Topic Performance Breakdown</h3>
        <div class="space-y-3">
          ${Object.keys(topicPerf).length ? Object.keys(topicPerf).map(function(t) {
            var item = topicPerf[t];
            var p = item.percentage || 0;
            return `<div>
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-white/80 font-medium">${t}</span>
                <span class="text-white font-bold">${item.correct}/${item.total} (${p.toFixed(0)}%)</span>
              </div>
              <div class="w-full h-2 rounded-full bg-white/6 overflow-hidden">
                <div class="h-full rounded-full transition-all" style="width:${p}%;background:${p >= 75 ? EMERALD : p >= 50 ? AMBER : ROSE}"></div>
              </div>
            </div>`;
          }).join('') : '<p class="text-white/40 text-xs">No topic statistics available.</p>'}
        </div>
      </div>

      <!-- Assessment Integrity Card -->
      <div class="rounded-xl border border-white/7 p-6 space-y-4" style="background:#0d0f1e">
        <h3 class="text-white font-semibold text-base" style="font-family:'Outfit',sans-serif">Assessment Integrity</h3>
        <div class="space-y-3 text-xs">
          <div class="flex items-center justify-between p-2.5 rounded-lg border border-white/6" style="background:#141627">
            <span class="text-white/60">Face Detection Rate</span>
            <span class="font-bold text-emerald-400">${integrity.face_detected_pct || 95}%</span>
          </div>
          <div class="flex items-center justify-between p-2.5 rounded-lg border border-white/6" style="background:#141627">
            <span class="text-white/60">Eye Contact Percentage</span>
            <span class="font-bold text-indigo-300">${integrity.eye_contact_pct || 88}%</span>
          </div>
          <div class="flex items-center justify-between p-2.5 rounded-lg border border-white/6" style="background:#141627">
            <span class="text-white/60">Look-away Events</span>
            <span class="font-bold text-amber-300">${integrity.look_away_events || 1}</span>
          </div>
          <div class="flex items-center justify-between p-2.5 rounded-lg border border-white/6" style="background:#141627">
            <span class="text-white/60">Multiple Faces Events</span>
            <span class="font-bold text-emerald-400">${integrity.multiple_faces_events || 0}</span>
          </div>
        </div>
        <p class="text-[11px] text-white/35 leading-relaxed">
          Metrics summarize camera presence during the session.
        </p>
      </div>
    </div>

    <!-- AI Assessment Feedback Section -->
    <div class="rounded-xl border border-indigo-500/30 p-6 space-y-6" style="background:#0d0f1e">
      <div class="flex items-center gap-2">
        <span class="text-indigo-400">${icon('brain', 20)}</span>
        <h3 class="text-white font-bold text-lg" style="font-family:'Outfit',sans-serif">AI Assessment Feedback</h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Strengths -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold text-emerald-400 uppercase tracking-wider">STRENGTHS</h4>
          <ul class="space-y-1.5 text-xs text-white/70">
            ${(fb.strengths || ["Strong performance across core concepts."]).map(function(s) {
              return `<li class="flex items-start gap-2"><span class="text-emerald-400 mt-0.5">&bull;</span><span>${s}</span></li>`;
            }).join('')}
          </ul>
        </div>

        <!-- Areas to Improve -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider">AREAS TO IMPROVE</h4>
          <ul class="space-y-1.5 text-xs text-white/70">
            ${(fb.areas_to_improve || ["Review missed questions in the detailed review below."]).map(function(a) {
              return `<li class="flex items-start gap-2"><span class="text-amber-400 mt-0.5">&bull;</span><span>${a}</span></li>`;
            }).join('')}
          </ul>
        </div>
      </div>

      <div class="pt-4 border-t border-white/6 space-y-3">
        <div>
          <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider">RECOMMENDED DIFFICULTY TIER</h4>
          <p class="text-xs text-white/80 mt-1">${fb.difficulty_recommendation || 'Continue practicing medium difficulty questions.'}</p>
        </div>

        <div>
          <h4 class="text-xs font-bold text-cyan-400 uppercase tracking-wider">PERSONALIZED PREPARATION SUGGESTIONS</h4>
          <ul class="space-y-1.5 text-xs text-white/70 mt-1">
            ${(fb.personalized_suggestions || ["Focus on time management during multi-step problems."]).map(function(ps) {
              return `<li class="flex items-start gap-2"><span class="text-cyan-400 mt-0.5">&bull;</span><span>${ps}</span></li>`;
            }).join('')}
          </ul>
        </div>
      </div>
    </div>

    <!-- Question Review Section -->
    <div class="rounded-xl border border-white/7 p-6 space-y-4" style="background:#0d0f1e">
      <h3 class="text-white font-bold text-lg" style="font-family:'Outfit',sans-serif">Question Review</h3>
      <p class="text-white/40 text-xs">Detailed evaluation key for all ${questions.length} questions.</p>

      <div class="space-y-4 pt-2">
        ${questions.map(function(q, qIdx) {
          var isCorr = q.is_correct;
          var candAns = q.candidate_answer || 'Unanswered';
          var corrAns = q.correct_answer || 'N/A';
          return `<div class="p-4 rounded-xl border ${isCorr ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : candAns === 'Unanswered' ? 'border-white/10 bg-white/[0.01]' : 'border-rose-500/30 bg-rose-500/[0.02]'} space-y-3">
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-white">Q${qIdx + 1}.</span>
                  <span class="text-xs px-2 py-0.5 rounded bg-white/5 text-white/60 font-medium">${q.topic || 'General'}</span>
                  <span class="text-xs px-2 py-0.5 rounded bg-white/5 text-white/60 capitalize font-medium">${q.difficulty || 'medium'}</span>
                </div>
                <h4 class="text-white font-medium text-sm pt-1">${q.question_text}</h4>
              </div>
              <span class="text-xs px-2.5 py-1 rounded-full font-bold uppercase shrink-0 ${isCorr ? 'bg-emerald-500/20 text-emerald-300' : candAns === 'Unanswered' ? 'bg-white/10 text-white/50' : 'bg-rose-500/20 text-rose-300'}">
                ${isCorr ? 'Correct' : candAns === 'Unanswered' ? 'Unanswered' : 'Incorrect'}
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
              <div class="p-2.5 rounded-lg border border-white/6" style="background:#141627">
                <span class="text-white/40 block text-[10px]">Your Answer:</span>
                <span class="font-medium ${isCorr ? 'text-emerald-300' : 'text-rose-300'}">${candAns}</span>
              </div>
              <div class="p-2.5 rounded-lg border border-emerald-500/20" style="background:rgba(16,185,129,0.05)">
                <span class="text-emerald-400 block text-[10px]">Correct Answer:</span>
                <span class="font-medium text-emerald-200">${corrAns}</span>
              </div>
            </div>

            <div class="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
              <span class="font-semibold block mb-0.5 text-indigo-300">Explanation:</span>
              ${q.explanation || 'Option evaluated based on standard technical principles.'}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

/* ── Practice Assessment Event Binding ── */
function startAssessmentTimer() {
  if (state.assessmentTimerInterval) {
    clearInterval(state.assessmentTimerInterval);
  }
  state.assessmentTimerInterval = setInterval(function() {
    if (state.assessmentTimeRemaining > 0) {
      state.assessmentTimeRemaining--;
      var timerEl = document.querySelector('.font-mono');
      if (timerEl) {
        var mins = Math.floor(state.assessmentTimeRemaining / 60);
        var secs = state.assessmentTimeRemaining % 60;
        timerEl.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
      }
    } else {
      clearInterval(state.assessmentTimerInterval);
      state.assessmentTimerInterval = null;
      stopAssessmentWebcam();
      // Auto-submit assessment when timer hits zero
      if (state.currentAssessment && state.section === 'assessment-session') {
        api.submitAssessment(state.currentAssessment.id, {
          answers: state.assessmentAnswers,
          integrity_metrics: state.assessmentIntegrity,
        }).then(function(res) {
          state.assessmentResult = res;
          state.section = 'assessment-result';
          render();
        }).catch(function(err) {
          alert('Assessment time expired. Submission error: ' + err.message);
        });
      }
    }
  }, 1000);
}

function startAssessmentWebcam() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(function(stream) {
        state.assessmentStream = stream;
        var videoEl = document.getElementById('assessment-webcam');
        if (videoEl) {
          videoEl.srcObject = stream;
        }
      })
      .catch(function(_) {
        state.assessmentFaceStatus = 'No Camera';
      });
  }
}

function stopAssessmentWebcam() {
  if (state.assessmentStream) {
    state.assessmentStream.getTracks().forEach(function(track) { track.stop(); });
    state.assessmentStream = null;
  }
}

function bindCandidateAssessmentEvents() {
  // Topic Chip Toggles
  document.querySelectorAll('.btn-topic-chip').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var topic = this.dataset.topic;
      var topics = state.assessmentSelectedTopics || [];
      if (topics.includes(topic)) {
        state.assessmentSelectedTopics = topics.filter(function(t) { return t !== topic; });
      } else {
        state.assessmentSelectedTopics.push(topic);
      }
      render();
    });
  });

  // Role Input
  var roleInp = document.getElementById('inp-assessment-role');
  if (roleInp) {
    roleInp.addEventListener('input', function() {
      state.assessmentTargetRole = this.value;
    });
  }

  // Difficulty Select Dropdown
  var diffSelect = document.getElementById('config-assessment-diff-select');
  if (diffSelect) {
    diffSelect.addEventListener('change', function() {
      state.assessmentDifficulty = this.value;
      render();
    });
  }

  // Question Count Select Dropdown
  var numSelect = document.getElementById('config-assessment-num-select');
  if (numSelect) {
    numSelect.addEventListener('change', function() {
      state.assessmentNumQuestions = parseInt(this.value, 10);
      render();
    });
  }

  // Difficulty Selector (compat)
  document.querySelectorAll('.btn-assessment-diff').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.assessmentDifficulty = this.dataset.diff;
      render();
    });
  });

  // Question Count Selector (compat)
  document.querySelectorAll('.btn-assessment-num').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.assessmentNumQuestions = parseInt(this.dataset.num, 10);
      render();
    });
  });


  // Time Limit Selector
  document.querySelectorAll('.btn-assessment-time').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.assessmentTimeLimit = parseInt(this.dataset.time, 10);
      render();
    });
  });

  // Custom Time Input
  var customTimeInp = document.getElementById('inp-assessment-custom-time');
  if (customTimeInp) {
    customTimeInp.addEventListener('input', function() {
      var val = parseInt(this.value, 10);
      if (val > 0) {
        state.assessmentCustomTime = val;
        state.assessmentTimeLimit = val;
      }
    });
  }

  // Resume Upload
  var resumeInp = document.getElementById('inp-assessment-resume');
  if (resumeInp) {
    resumeInp.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        state.assessmentResumeStatus = 'loading';
        api.uploadResume(this.files[0]).then(function(res) {
          state.assessmentResume = res.resume;
          state.assessmentResumeStatus = 'ready';
          render();
        }).catch(function(err) {
          state.assessmentError = err.message;
          render();
        });
      }
    });
  }

  var resumeReplaceInp = document.getElementById('inp-assessment-resume-replace');
  if (resumeReplaceInp) {
    resumeReplaceInp.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        api.uploadResume(this.files[0]).then(function(res) {
          state.assessmentResume = res.resume;
          render();
        }).catch(function(err) {
          state.assessmentError = err.message;
          render();
        });
      }
    });
  }

  var resumeRemoveBtn = document.getElementById('btn-assessment-resume-remove');
  if (resumeRemoveBtn) {
    resumeRemoveBtn.addEventListener('click', function() {
      state.assessmentResume = null;
      render();
    });
  }

  var dropzone = document.getElementById('assessment-resume-dropzone');

  if (dropzone) {
    dropzone.addEventListener('click', function() {
      var fileInp = document.getElementById('inp-assessment-resume');
      if (fileInp) fileInp.click();
    });
  }

  // Test Devices Button
  var testDevBtn = document.getElementById('btn-test-assessment-devices');
  if (testDevBtn) {
    testDevBtn.addEventListener('click', function() {
      state.deviceTested = true;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(function(stream) {
            stream.getTracks().forEach(function(t) { t.stop(); });
            render();
          })
          .catch(function() {
            render();
          });
      } else {
        render();
      }
    });
  }

  // Start Assessment CTA

  var startBtn = document.getElementById('btn-start-assessment');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      state.assessmentError = '';
      startBtn.disabled = true;
      startBtn.innerHTML = `${icon('refreshCw', 16)} Generating Assessment...`;

      var payload = {
        target_role: state.assessmentTargetRole || 'Software Engineer',
        topics: state.assessmentSelectedTopics.length ? state.assessmentSelectedTopics : ['Data Structures'],
        difficulty: state.assessmentDifficulty || 'medium',
        num_questions: state.assessmentNumQuestions || 10,
        time_limit_minutes: state.assessmentTimeLimit || 10,
        resume_context: state.assessmentResume,
      };

      api.generateAssessment(payload).then(function(res) {
        state.currentAssessment = res.assessment;
        state.currentAssessmentQuestions = res.questions;
        state.assessmentQuestionIndex = 0;
        state.assessmentAnswers = {};
        state.assessmentTimeRemaining = (res.assessment.time_limit_minutes || 10) * 60;
        
        return api.startAssessment(res.assessment.id);
      }).then(function(_) {
        state.section = 'assessment-session';
        render();
        startAssessmentTimer();
        startAssessmentWebcam();
      }).catch(function(err) {
        state.assessmentError = err.message;
        render();
      });
    });
  }

  // MCQ Option Selection
  document.querySelectorAll('.btn-mcq-option').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var opt = this.dataset.option;
      var q = state.currentAssessmentQuestions[state.assessmentQuestionIndex];
      if (q) {
        state.assessmentAnswers[q.id] = opt;
        render();
      }
    });
  });

  // Question Navigation
  var prevBtn = document.getElementById('btn-prev-question');
  if (prevBtn) {
    prevBtn.addEventListener('click', function() {
      if (state.assessmentQuestionIndex > 0) {
        state.assessmentQuestionIndex--;
        render();
      }
    });
  }

  var nextBtn = document.getElementById('btn-next-question');
  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      if (state.assessmentQuestionIndex < state.currentAssessmentQuestions.length - 1) {
        state.assessmentQuestionIndex++;
        render();
      }
    });
  }

  // Submit Trigger Modal
  var submitTriggers = [
    document.getElementById('btn-session-submit-trigger'),
    document.getElementById('btn-session-submit-trigger-2')
  ];
  submitTriggers.forEach(function(btn) {
    if (btn) {
      btn.addEventListener('click', function() {
        state.submitConfirmModal = true;
        render();
      });
    }
  });

  var cancelSubmitBtn = document.getElementById('btn-modal-cancel-submit');
  if (cancelSubmitBtn) {
    cancelSubmitBtn.addEventListener('click', function() {
      state.submitConfirmModal = false;
      render();
    });
  }

  var confirmSubmitBtn = document.getElementById('btn-modal-confirm-submit');
  if (confirmSubmitBtn) {
    confirmSubmitBtn.addEventListener('click', function() {
      state.submitConfirmModal = false;
      confirmSubmitBtn.disabled = true;
      confirmSubmitBtn.textContent = 'Submitting...';

      if (state.assessmentTimerInterval) {
        clearInterval(state.assessmentTimerInterval);
        state.assessmentTimerInterval = null;
      }
      stopAssessmentWebcam();

      api.submitAssessment(state.currentAssessment.id, {
        answers: state.assessmentAnswers,
        integrity_metrics: state.assessmentIntegrity,
      }).then(function(res) {
        state.assessmentResult = res;
        state.section = 'assessment-result';
        render();
      }).catch(function(err) {
        alert('Submission failed: ' + err.message);
      });
    });
  }

  // New Assessment Button from Result Screen
  var newAssessmentBtn = document.getElementById('btn-new-assessment');
  if (newAssessmentBtn) {
    newAssessmentBtn.addEventListener('click', function() {
      state.currentAssessment = null;
      state.currentAssessmentQuestions = [];
      state.assessmentResult = null;
      state.section = 'assessment';
      render();
    });
  }
}

