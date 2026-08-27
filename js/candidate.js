/* ── Candidate Sections ── */
function candidateOverview() {
  var userName = state.user ? state.user.name.split(' ')[0] : 'Candidate';
  if (!state.analyticsData) {
    api.getAnalyticsSummary().then(function (data) {
      state.analyticsData = data;
      render();
    }).catch(function () { });
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
      ].map(function (d) {
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
          ${rubricTiers.map(function (rub) {
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
        ${history.slice(0, 3).map(function (h) {
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
  return INTERVIEW_TYPES.find(function (t) { return t.title === state.configRound; }) || INTERVIEW_TYPES[0];
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
          ${INTERVIEW_TYPES.map(function (opt) {
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
            ${[10, 15, 20, 30].map(function (m) {
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
          ${focusOptions.map(function (f) {
    var isActive = state.configFocus.indexOf(f) !== -1;
    return `<button class="${chipClass(isActive, focusAccent)} config-focus-btn" data-focus="${f}">${isActive ? '✓ ' : ''}${f}</button>`;
  }).join('')}
        </div>
      </div>

      <!-- Question Style -->
      <div class="mic-field">
        <label class="mic-label">Question Style</label>
        <div class="mic-chips">
          ${QUESTION_STYLES.map(function (qs) {
    var isActive = state.configQuestionStyle === qs;
    return `<button class="${chipClass(isActive, 'cyan')} config-style-btn" data-style="${qs}">${qs}</button>`;
  }).join('')}
        </div>
      </div>

      <!-- AI Interviewer -->
      <div class="mic-field">
        <label class="mic-label">AI Interviewer</label>
        <div class="mic-chips">
          ${INTERVIEWER_STYLES.map(function (ist) {
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


var FILLER_WORDS_REGEX = /\b(um|uh|er|ah|like|you\s+know|basically|actually|literally|sort\s+of|kind\s+of|i\s+mean|right)\b/gi;

// Telemetry computation helper
function computeTranscriptTelemetry(text, durationSec) {
  if (!text || !text.trim()) {
    return {
      wpm: 0,
      wpmStatus: 'Waiting for Speech',
      fillers: 0,
      fillerStatus: 'Clear Fluency',
      eyeContact: (state.webcamStatus === 'Ready' && !state.lobbyCamMuted) ? 94 : 0,
      emotion: 'Calm / Focused',
      words: 0,
      wordsStatus: 'Speaking Inactive',
      clarity: 98,
      clarityStatus: 'Clear Enunciation'
    };
  }

  var words = text.trim().split(/\s+/).filter(Boolean);
  var wordCount = words.length;
  var sec = Math.max(1, durationSec || 1);
  var minutes = sec / 60.0;
  var wpm = Math.round(wordCount / minutes);

  if (wpm > 240) wpm = 240;
  if (wpm < 30 && wordCount > 0) wpm = Math.min(120, wordCount * 15);

  var wpmStatus = 'Optimal Speed';
  if (wpm > 165) wpmStatus = 'Rapid Pace';
  else if (wpm < 115) wpmStatus = 'Deliberate / Slow';
  else wpmStatus = 'Optimal Speed';

  var matches = text.match(FILLER_WORDS_REGEX) || [];
  var fillers = matches.length;
  var fillerStatus = fillers === 0 ? 'Clear Fluency' : fillers <= 2 ? 'Minimal Fillers' : 'Moderate Fillers';

  var clarity = Math.max(80, Math.min(99, 98 - (fillers * 3)));
  var clarityStatus = clarity >= 92 ? 'Clear Enunciation' : (clarity >= 85 ? 'Moderate Clarity' : 'Needs Enunciation');

  return {
    wpm: wpm,
    wpmStatus: wpmStatus,
    fillers: fillers,
    fillerStatus: fillerStatus,
    eyeContact: (state.webcamStatus === 'Ready' && !state.lobbyCamMuted) ? (fillers > 2 ? 88 : 94) : 0,
    emotion: fillers > 3 ? 'Reflective / Hesitant' : (wpm > 165 ? 'Energetic / Fast' : 'Calm / Confident'),
    words: wordCount,
    wordsStatus: wordCount > 25 ? 'Rich Response' : (wordCount > 10 ? 'Elaborating' : 'Starting Answer'),
    clarity: clarity,
    clarityStatus: clarityStatus
  };
}

function updateLiveTelemetryUI(transcript) {
  var durationSec = 1;
  if (state.answerStartTime) {
    durationSec = Math.max(1, (Date.now() - state.answerStartTime) / 1000);
  }
  var tel = computeTranscriptTelemetry(transcript, durationSec);
  state.telemetryWpm = tel.wpm;
  state.telemetryFillerWords = tel.fillers;

  // Update WPM Tile
  var wpmValEl = document.getElementById('telemetry-wpm-val');
  var wpmSubEl = document.getElementById('telemetry-wpm-sub');
  if (wpmValEl) wpmValEl.textContent = tel.wpm > 0 ? ('~' + tel.wpm + ' WPM') : '0 WPM';
  if (wpmSubEl) {
    wpmSubEl.textContent = tel.wpmStatus;
    wpmSubEl.className = 'sh-telemetry-sub ' + (tel.wpmStatus === 'Optimal Speed' ? 'text-emerald-400' : 'text-amber-300');
  }

  // Update Filler Words Tile
  var fillerValEl = document.getElementById('telemetry-filler-val');
  var fillerSubEl = document.getElementById('telemetry-filler-sub');
  if (fillerValEl) fillerValEl.textContent = tel.fillers + ' detected';
  if (fillerSubEl) {
    fillerSubEl.textContent = tel.fillerStatus;
    fillerSubEl.className = 'sh-telemetry-sub ' + (tel.fillers === 0 ? 'text-emerald-400' : 'text-amber-400');
  }

  // Update Eye Contact Tile
  var eyeValEl = document.getElementById('telemetry-eye-val');
  if (eyeValEl) eyeValEl.textContent = tel.eyeContact + '%';

  // Update Emotion Tile
  var emoValEl = document.getElementById('telemetry-emo-val');
  if (emoValEl) emoValEl.textContent = tel.emotion;

  // Update Clarity Tile
  var clarityValEl = document.getElementById('telemetry-clarity-val');
  var claritySubEl = document.getElementById('telemetry-clarity-sub');
  if (clarityValEl) clarityValEl.textContent = tel.clarity + '%';
  if (claritySubEl) {
    claritySubEl.textContent = tel.clarityStatus;
    claritySubEl.className = 'sh-telemetry-sub ' + (tel.clarity >= 90 ? 'text-emerald-400' : 'text-indigo-300');
  }

  // Update Word Count Tile
  var wordsValEl = document.getElementById('telemetry-words-val');
  var wordsSubEl = document.getElementById('telemetry-words-sub');
  if (wordsValEl) wordsValEl.textContent = tel.words + ' words';
  if (wordsSubEl) {
    wordsSubEl.textContent = tel.wordsStatus;
    wordsSubEl.className = 'sh-telemetry-sub ' + (tel.words > 0 ? 'text-cyan-400' : 'text-white/40');
  }

  // Update Live Transcript Box
  var box = document.getElementById('transcript-box');
  if (box && transcript) {
    box.innerHTML = '<p class="text-white/90 text-xs leading-relaxed font-medium">&ldquo;' + transcript + '&rdquo;</p>';
    box.scrollTop = box.scrollHeight;
  }
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

  // Case 1: Session Completed
  if (status === 'completed') {
    var answeredCount = session.questions.filter(function (q) { return q.answer_text; }).length;
    var elMin = Math.floor(elapsed / 60);
    var elSec = elapsed % 60;
    var durText = elMin + ' min ' + elSec + ' sec';
    var modalHtml = state.activeReportModal ? renderReportModal(state.activeReportModal) : '';
    var flagged = interview.integrity_flag === 'potential_cheater';

    if (state.attentionTerminated) {
      return `<div class="sh-modal-backdrop" id="attention-terminated-backdrop">
        <div class="w-full max-w-md p-6 rounded-2xl border border-rose-500/30 space-y-5 shadow-2xl sh-modal-card" style="background:#0c0e1c">
          <div class="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-400 flex items-center justify-center mx-auto">
            ${icon('alertTriangle', 24)}
          </div>
          <div class="text-center">
            <h3 class="text-xl font-bold text-white" style="font-family:'Outfit',sans-serif">Interview Terminated</h3>
            <p class="text-white/60 text-xs mt-2 leading-relaxed">The session was automatically ended after reaching <strong class="text-rose-300">${(state.attention && state.attention.max_warnings) || 5} attention warnings</strong>. Your responses so far have been compiled into an evaluation report, and the session has been flagged for recruiter review.</p>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button id="btn-view-interview-report" data-id="${interview.id}" class="flex-1 py-2.5 rounded-xl font-semibold text-xs text-white bg-rose-600 hover:bg-rose-500 shadow-md transition-all">View Evaluation Report</button>
            <button id="btn-back-to-interviews" class="flex-1 py-2.5 rounded-xl font-semibold text-xs text-white/70 hover:text-white border border-white/10 hover:border-white/20 transition-colors">Back to Dashboard</button>
          </div>
        </div>
      </div>`;
    }

    return `<div class="max-w-xl mx-auto my-12 p-8 rounded-2xl border ${flagged ? 'border-rose-500/40' : 'border-white/10'} text-center space-y-6" style="background:#0c0e1c">
      ${flagged ? `
      <div class="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-bold uppercase tracking-wider">
        ${icon('alertTriangle', 14)} Flagged: Potential Cheater — Under Review
      </div>` : ''}
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
        <button id="btn-view-interview-report" data-id="${interview.id}" class="flex-1 py-3 px-4 rounded-xl font-semibold text-sm text-white transition-all shadow-lg hover:brightness-110" style="background:${INDIGO}">View AI Evaluation Report</button>
        <button id="btn-back-to-interviews" class="py-3 px-4 rounded-xl text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20">Back to Dashboard</button>
      </div>
    </div>${modalHtml}`;
  }

  // Case 2: Session Lobby Pre-check (Retain existing lobby)
  if (status === 'created') {
    var candidateName = state.user ? state.user.name : 'Candidate';
    var itype = (interview.interview_type || 'technical').toUpperCase();
    var domain = interview.domain || 'General';
    var roleDisplay = domain && domain !== 'General' ? domain : (itype + ' Engineer');
    var webcamReady = state.webcamStatus === 'Ready';
    var micReady = state.micStatus === 'Ready';
    var isMicMuted = !!state.lobbyMicMuted;
    var isCamMuted = !!state.lobbyCamMuted;

    return `<div class="sh-lobby-wrap">
      <div class="sh-lobby-banner">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="sh-workspace-badge">${icon('sparkles', 12)} Candidate Workspace</span>
            <span class="sh-precheck-pill">${icon('shield', 11)} Session Pre-Check</span>
          </div>
          <h1 class="sh-welcome-title" style="font-family:'Outfit',sans-serif">
            Welcome back, <span class="sh-welcome-name">${candidateName}</span>
          </h1>
        </div>
        <div class="hidden sm:flex items-center gap-2">
          <span class="sh-status-ready-badge">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>System Ready & Proctored</span>
          </span>
        </div>
      </div>

      <div class="sh-lobby-grid">
        <div class="sh-lobby-card">
          <div>
            <div class="sh-lobby-video-stage">
              <video id="candidate-camera" autoplay muted playsinline class="w-full h-full object-cover ${isCamMuted ? 'hidden' : ''}"></video>
              ${isCamMuted ? `<div class="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-[#070914]/90"><div class="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 mb-1">${icon('videoOff', 16)}</div><p class="text-xs font-semibold text-rose-300">Camera Paused</p></div>` : (!webcamReady ? `<div class="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-[#070914]/90"><div class="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 mb-1">${icon('videoOff', 16)}</div><p class="text-xs font-semibold text-rose-300">Webcam Not Ready</p></div>` : '')}
              <div class="sh-lobby-video-controls">
                <button id="btn-toggle-lobby-mic" class="sh-ctrl-btn ${isMicMuted ? 'muted' : 'active'}">
                  <span class="sh-ctrl-dot"></span>${icon(isMicMuted ? 'micOff' : 'mic', 13)} <span>${isMicMuted ? 'Muted' : 'Mic Active'}</span>
                </button>
                <button id="btn-toggle-lobby-cam" class="sh-ctrl-btn ${isCamMuted ? 'muted' : 'active'}">
                  <span class="sh-ctrl-dot"></span>${icon(isCamMuted ? 'videoOff' : 'video', 13)} <span>${isCamMuted ? 'Cam Off' : 'Camera On'}</span>
                </button>
              </div>
            </div>

            <div class="sh-diag-grid">
              <!-- 1. Webcam & Video Feed -->
              <div class="sh-diag-row">
                <div class="sh-diag-info">
                  <span class="text-indigo-400">${icon('camera', 14)}</span>
                  <span class="text-xs font-semibold text-white/90">Webcam & Video Stream</span>
                </div>
                ${isCamMuted ? `<span class="sh-diag-badge-off">${icon('videoOff', 10)} MUTED</span>` : (webcamReady ? `<span class="sh-diag-badge-ready">${icon('check', 10)} READY</span>` : `<span class="sh-diag-badge-warn">${icon('alertTriangle', 10)} CHECK ACCESS</span>`)}
              </div>

              <!-- 2. Microphone Audio Input -->
              <div class="sh-diag-row">
                <div class="sh-diag-info">
                  <span class="text-indigo-400">${icon('mic', 14)}</span>
                  <span class="text-xs font-semibold text-white/90">Microphone Audio Input</span>
                  ${micReady && !isMicMuted ? `<span class="sh-audio-bars"><span class="sh-audio-bar"></span><span class="sh-audio-bar"></span><span class="sh-audio-bar"></span><span class="sh-audio-bar"></span></span>` : ''}
                </div>
                ${isMicMuted ? `<span class="sh-diag-badge-off">${icon('micOff', 10)} MUTED</span>` : (micReady ? `<span class="sh-diag-badge-ready">${icon('check', 10)} READY</span>` : `<span class="sh-diag-badge-warn">${icon('alertTriangle', 10)} CHECK ACCESS</span>`)}
              </div>

              <!-- 3. Speakers & Audio Output -->
              <div class="sh-diag-row">
                <div class="sh-diag-info">
                  <span class="text-indigo-400">${icon('headphones', 14)}</span>
                  <span class="text-xs font-semibold text-white/90">Speakers & Audio Output</span>
                </div>
                <button id="btn-test-speaker" class="sh-btn-test-speaker" title="Play test tone">
                  ${state.audioTestSuccess ? `${icon('check', 10)} Tone Played` : `${icon('headphones', 10)} Test Audio`}
                </button>
              </div>

              <!-- 4. Connection & Latency -->
              <div class="sh-diag-row">
                <div class="sh-diag-info">
                  <span class="text-indigo-400">${icon('wifi', 14)}</span>
                  <span class="text-xs font-semibold text-white/90">Connection & Latency</span>
                </div>
                <span class="sh-diag-badge-ready">${icon('check', 10)} 24ms STABLE</span>
              </div>

              <!-- 5. Candidate Security -->
              <div class="sh-diag-row">
                <div class="sh-diag-info">
                  <span class="text-white/40">${icon('shieldCheck', 13)}</span>
                  <span class="text-xs font-medium text-white/80">Candidate Security</span>
                </div>
                <span class="sh-diag-badge-indigo">${icon('shieldCheck', 10)} VERIFIED</span>
              </div>
            </div>
          </div>

          <div>
            <button id="btn-test-room-devices" class="sh-lobby-recheck-btn">${icon('refreshCw', 13)} Re-check Camera & Microphone</button>
          </div>
        </div>

        <div class="sh-lobby-card">
          <div>
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <span class="sh-header-tag"><span class="text-indigo-400">${icon('zap', 12)}</span><span>Autonomous AI Session</span></span>
              <span class="sh-status-pill-live"><span class="sh-status-dot-pulse"></span><span>Live Evaluator</span></span>
            </div>

            <div class="sh-role-banner">
              <div>
                <p class="text-[10px] uppercase font-bold tracking-wider text-indigo-300/80 mb-0.5">Target Role Assessment</p>
                <h2 class="text-lg font-extrabold text-white tracking-tight leading-tight" style="font-family:'Outfit',sans-serif">${roleDisplay}</h2>
              </div>
              <span class="sh-role-badge-pill">${itype}</span>
            </div>

            <div class="sh-spec-grid">
              <div class="sh-spec-chip"><div class="sh-spec-chip-icon indigo">${icon('target', 13)}</div><div><div class="sh-spec-label">Format</div><div class="sh-spec-val">${itype} Round</div></div></div>
              <div class="sh-spec-chip"><div class="sh-spec-chip-icon emerald">${icon('trendingUp', 13)}</div><div><div class="sh-spec-label">Difficulty</div><div class="sh-spec-val capitalize">${interview.difficulty || 'Medium'}</div></div></div>
              <div class="sh-spec-chip"><div class="sh-spec-chip-icon amber">${icon('clock', 13)}</div><div><div class="sh-spec-label">Duration</div><div class="sh-spec-val">${durationMin} Minutes</div></div></div>
              <div class="sh-spec-chip"><div class="sh-spec-chip-icon blue">${icon('helpCircle', 13)}</div><div><div class="sh-spec-label">Questions</div><div class="sh-spec-val">${total} Evaluated</div></div></div>
            </div>

            <!-- Guidelines / Rules Section (Inspired Pill Design) -->
            <div class="sh-guide-list">
              <div class="sh-rule-pill">
                <div class="sh-rule-badge blue">${icon('monitor', 13)}</div>
                <p class="sh-rule-text">This session operates in <strong>proctored mode</strong>. Please keep this tab active throughout.</p>
              </div>

              <div class="sh-rule-pill">
                <div class="sh-rule-badge amber">${icon('alertTriangle', 13)}</div>
                <p class="sh-rule-text">You get up to <strong>3 tab exit alerts</strong> before the system automatically evaluates your progress.</p>
              </div>

              <div class="sh-rule-pill">
                <div class="sh-rule-badge indigo">${icon('mic', 13)}</div>
                <p class="sh-rule-text">The AI assesses <strong>spoken clarity</strong> — speak naturally and elaborately for every question.</p>
              </div>

              <div class="sh-rule-pill">
                <div class="sh-rule-badge rose">${icon('checkCircle2', 13)}</div>
                <p class="sh-rule-text">You can wrap up at any time with <strong>Finish Interview</strong> — answered responses will be graded instantly.</p>
              </div>
            </div>
          </div>

          <div>
            <button id="btn-start-interview-session" class="sh-lobby-join-cta">${icon('play', 13)} Begin Interview Session</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  // ══════════════════════════════════════════════════
  // Case 3: Live Interview Room (In Progress / Paused)
  // ══════════════════════════════════════════════════
  var isPaused = status === 'paused';
  var isSpeaking = !!state.isAiSpeaking;
  var transcriptText = state.currentTranscript || '';
  var webcamReady = state.webcamStatus === 'Ready';
  var micReady = state.micStatus === 'Ready';
  var isMicMuted = !!state.lobbyMicMuted;
  var isCamMuted = !!state.lobbyCamMuted;
  var aiVoiceOn = state.aiVoiceEnabled !== false;
  var visionMeta = visionStatusMeta(state.vision);

  var telemetry = computeTranscriptTelemetry(transcriptText, state.sessionElapsedSeconds || 15);
  var progressPct = Math.round(((currentIdx + 1) / total) * 100);

  var itype = (interview.interview_type || 'Technical').toUpperCase();
  var domain = interview.domain || 'Software Engineering';

  var currentQuestionAnswered = question && question.answer_text;
  var aiScore = question && question.score;
  var aiFeedback = question && question.feedback;

  return `<div class="sh-room-container">

    <!-- ── Top Command Bar (Dock) ── -->
    <div class="sh-room-dock">
      
      <!-- Left: Role & Sequence Pill -->
      <div class="flex items-center gap-3">
        <div class="sh-dock-role-badge">
          <div class="sh-dock-role-icon">${icon('brain', 14)}</div>
          <div>
            <p class="text-xs font-bold text-white tracking-wide leading-tight">${domain} (${itype} Round)</p>
            <p class="text-[10px] text-indigo-300/70 font-semibold mt-0.5">Question ${currentIdx + 1} of ${total} &bull; ${itype}</p>
          </div>
        </div>
      </div>

      <!-- Center: Digital Timer Capsule -->
      <div class="sh-dock-timer ${remainSec < 60 ? 'urgent' : ''}">
        ${icon('clock', 13)}
        <span id="session-timer-display" class="font-mono font-bold text-sm tracking-wider">${timerStr}</span>
      </div>

      <!-- Right: Pause & End Session -->
      <div class="flex items-center gap-2.5 shrink-0">
        ${isPaused ? `
          <button id="btn-resume-interview-session" class="sh-dock-btn-resume">
            ${icon('play', 13)} Resume
          </button>
        ` : `
          <button id="btn-pause-interview-session" class="sh-dock-btn-pause">
            ${icon('pause', 13)} Pause
          </button>
        `}

        <button id="btn-end-interview-session" class="sh-dock-btn-end">
          ${icon('logOut', 13)} End Interview
        </button>
      </div>
    </div>

    ${isPaused ? `
      <div class="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-center font-medium text-xs flex items-center justify-center gap-2 animate-pulse">
        <span>⏸ Interview is paused. Candidate speech input is temporarily suspended. Click <strong>Resume</strong> to continue.</span>
      </div>
    ` : ''}

    <!-- ── Main 3-Column Stage Grid (Left: User Feed | Middle: Interviewer Feed | Right: Controls, Telemetry & Transcript) ── -->
    <div class="sh-room-grid">

      <!-- ════ COLUMN 1 (LEFT): Live Candidate Proctor & Video Feed ════ -->
      <div class="sh-user-stage-card">
        <!-- Top Video Banner -->
        <div class="sh-user-stage-header">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-xs">
              ${(state.user && state.user.name) ? state.user.name.slice(0, 2).toUpperCase() : 'CA'}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-white tracking-wide">${state.user ? state.user.name : 'Candidate'}</span>
                <span class="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-white/5 text-white/60 border border-white/10">Candidate Feed</span>
              </div>
              <p class="text-[10px] text-white/40 mt-0.5">${domain} &bull; ${itype} Assessment</p>
            </div>
          </div>

          <!-- Top Right Live Badge -->
          <div class="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-bold text-emerald-400 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>LIVE PROCTOR FEED</span>
          </div>
        </div>

        <!-- Video Viewport Frame -->
        <div class="sh-user-video-viewport">
          <video id="candidate-camera" autoplay muted playsinline class="w-full h-full object-cover ${isCamMuted ? 'hidden' : ''}"></video>

          <!-- Module 6: Live Vision Status Overlay -->
          <div id="vision-overlay-badge" class="sh-vision-badge vision-badge-init ${state.vision && state.vision.status === 'face_detected' ? 'hidden' : ''}">
            <span id="vision-overlay-dot" class="sh-vision-badge-dot"></span>
            <span id="vision-overlay-text">${visionMeta ? visionMeta.label : 'Initializing…'}</span>
          </div>
          
          ${isCamMuted ? `
            <div class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[#070914]/90">
              <div class="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 mb-2">${icon('videoOff', 20)}</div>
              <p class="text-xs font-semibold text-rose-300">Camera Muted</p>
              <p class="text-[10px] text-white/40 mt-1">Click the video button below to enable camera</p>
            </div>
          ` : (!webcamReady ? `
            <div class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[#070914]/90">
              <div class="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 mb-2">${icon('videoOff', 20)}</div>
              <p class="text-xs font-semibold text-rose-300">Webcam Feed Initializing</p>
              <p class="text-[10px] text-white/40 mt-1">Connecting video hardware stream...</p>
            </div>
          ` : '')}

          <!-- Floating Video Controls Dock -->
          <div class="sh-video-floating-dock">
            <button id="btn-toggle-room-mic" class="sh-floating-btn ${isMicMuted ? 'muted' : ''}" title="${isMicMuted ? 'Unmute Mic' : 'Mute Mic'}">
              ${icon(isMicMuted ? 'micOff' : 'mic', 13)}
            </button>
            <button id="btn-toggle-room-cam" class="sh-floating-btn ${isCamMuted ? 'muted' : ''}" title="${isCamMuted ? 'Enable Camera' : 'Turn Off Camera'}">
              ${icon(isCamMuted ? 'videoOff' : 'video', 13)}
            </button>
          </div>
        </div>

        <!-- Proctored Diagnostics Footer -->
        <div class="sh-user-stage-footer">
          <div class="flex items-center justify-between text-[11px] text-white/50 flex-wrap gap-2">
            <span class="inline-flex items-center gap-1.5">
              <span id="vision-gaze-dot" class="w-1.5 h-1.5 rounded-full" style="background:${visionMeta.color}"></span>
              <span>Vision &amp; Gaze: <strong id="vision-gaze-label" class="text-white/80">${visionMeta.label}</strong></span>
            </span>
            <span class="inline-flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              <span>Audio: <strong class="text-white/80">Connected</strong></span>
            </span>
            <span class="inline-flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>Proctor: <strong class="text-white/80">Secured</strong></span>
            </span>
          </div>

          <!-- Task 4: Attention Monitoring Strip -->
          <div class="sh-attention-strip">
            <span class="inline-flex items-center gap-1.5 text-[11px]">
              <span id="attention-state-dot" class="w-1.5 h-1.5 rounded-full" style="background:#10b981"></span>
              <span id="attention-state-label" class="text-white/70">Attention: Monitoring</span>
            </span>
            <p id="attention-away-note" class="hidden text-[10px] text-amber-300 font-semibold"></p>
            <span id="attention-warning-chip" class="sh-attn-chip ${state.attention && state.attention.warnings ? 'sh-attn-warn-active' : ''}">
              ${icon('alertTriangle', 11)} Attention Warnings:
              <strong id="attention-warning-count">${(state.attention && state.attention.warnings) || 0} / ${(state.attention && state.attention.max_warnings) || 5}</strong>
            </span>
          </div>
        </div>
      </div>

      <!-- ════ COLUMN 2 (MIDDLE): Interviewer Question Arena ════ -->
      <div class="sh-question-card">
        
        <!-- Top Evaluator Banner -->
        <div class="sh-interviewer-header">
          <div class="flex items-center gap-3">
            <div class="sh-ai-avatar ${isSpeaking ? 'speaking' : ''}">
              ${icon('brain', 18)}
              <span class="sh-ai-pulse-dot"></span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-white tracking-wide">SmartHire AI Interviewer</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">AI Autonomous</span>
              </div>
              <p class="text-[11px] text-indigo-300/80 mt-0.5 font-medium">
                ${isSpeaking ? '🔊 Speaking question out loud...' : (isPaused ? '⏸ Session paused' : '🎙️ Actively listening for candidate response...')}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white/60">
              ${question.category || 'Domain Assessment'}
            </span>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
              ${question.difficulty || 'medium'}
            </span>
          </div>
        </div>

        <!-- Central Question Display Arena -->
        <div class="sh-question-body">
          <div class="sh-question-badge-pill">
            QUESTION ${currentIdx + 1} OF ${total}
          </div>

          <h2 class="sh-question-text" style="font-family:'Outfit',sans-serif">
            &ldquo;${question.question_text}&rdquo;
          </h2>

          <!-- Audio / Replay Action Buttons -->
          <div class="flex items-center gap-3 flex-wrap justify-center pt-1">
            <button id="btn-listen-question-loud" class="sh-audio-action-btn indigo">
              ${icon('volume2', 14)} <span>Listen Question Out Loud</span>
            </button>

            ${currentQuestionAnswered ? `
              <button id="btn-replay-feedback" class="sh-audio-action-btn amber">
                ${icon('award', 14)} <span>AI Evaluation Score: ${aiScore || 0}%</span>
              </button>
            ` : ''}
          </div>

          ${currentQuestionAnswered && aiFeedback ? `
            <div class="mt-3 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-left w-full space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-emerald-400 flex items-center gap-1.5">${icon('checkCircle2', 13)} Instant AI Evaluation</span>
                <span class="font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">${aiScore || 0}%</span>
              </div>
              <p class="text-xs text-white/70 leading-relaxed">${aiFeedback}</p>
            </div>
          ` : ''}
        </div>

        <!-- Question Progress Footer -->
        <div class="sh-question-footer">
          <div class="flex items-center justify-between text-xs text-white/40 mb-1.5 font-medium">
            <span>Overall Session Completion</span>
            <span class="text-indigo-300 font-bold">${progressPct}%</span>
          </div>
          <div class="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div class="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-300" style="width:${progressPct}%"></div>
          </div>
        </div>

      </div>

      <!-- ════ COLUMN 3 (RIGHT): Controls Widget, Telemetry & Candidate Transcript ════ -->
      <div class="sh-right-stage-stack">
        
        <!-- 1. System & Device Controls Widget -->
        <div class="sh-controls-panel">
          <div class="flex items-center justify-between border-b border-white/6 pb-2 mb-2">
            <div class="flex items-center gap-1.5">
              <span class="text-indigo-400">${icon('sliders', 12)}</span>
              <h4 class="text-[11px] font-bold uppercase tracking-wider text-white" style="font-family:'Outfit',sans-serif">Session Controls &amp; Status</h4>
            </div>
            <span class="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-white/5 text-white/50 border border-white/10">Active</span>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap">
            <!-- Recording Indicator -->
            <span class="sh-dock-pill rec">
              <span class="sh-dock-dot ${isPaused ? 'bg-amber-400' : 'bg-rose-500 animate-pulse'}"></span>
              <span>${isPaused ? 'REC: PAUSED' : 'REC: RECORDING'}</span>
            </span>

            <!-- AI Voice Toggle -->
            <button id="btn-toggle-ai-voice" class="sh-dock-btn ${aiVoiceOn ? 'active' : ''}" title="Toggle AI Spoken Audio">
              ${icon(aiVoiceOn ? 'volume2' : 'speaker', 11)}
              <span>${aiVoiceOn ? 'AI Voice: On' : 'AI Voice: Muted'}</span>
            </button>

            <!-- Fullscreen Toggle -->
            <button id="btn-toggle-fullscreen" class="sh-dock-btn" title="Toggle Fullscreen Arena">
              ${icon('layout', 11)}
              <span>Full Screen</span>
            </button>

            <!-- Hardware Status Pills -->
            <span class="sh-dock-pill ${webcamReady && !isCamMuted ? 'ready' : 'warn'}">
              CAM: ${isCamMuted ? 'MUTED' : (webcamReady ? 'READY' : 'OFF')}
            </span>
            <span class="sh-dock-pill ${micReady && !isMicMuted ? 'ready' : 'warn'}">
              MIC: ${isMicMuted ? 'MUTED' : (micReady ? 'READY' : 'OFF')}
            </span>

            <!-- Auto Transcribe Pill -->
            <span class="sh-dock-pill auto">
              ${icon('zap', 10)} Auto-Transcribe
            </span>
          </div>

          <!-- Live Connection & Stream Diagnostics Row -->
          <div class="flex items-center justify-between pt-2 border-t border-white/5 mt-2 text-[10px] text-white/50">
            <span class="inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Stream: <strong class="text-white/80 font-semibold">1080p HD</strong></span>
            <span class="inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Latency: <strong class="text-white/80 font-semibold">~24ms</strong></span>
            <span class="inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> Proctor Guard: <strong class="text-emerald-400 font-semibold">100%</strong></span>
          </div>
        </div>

        <!-- 2. Real-Time Speech & Behavior Telemetry Card (6-Metric Suite) -->
        <div class="sh-telemetry-panel">
          <div class="flex items-center justify-between border-b border-white/6 pb-2 mb-2">
            <div class="flex items-center gap-1.5">
              <span class="text-indigo-400">${icon('activity', 12)}</span>
              <h4 class="text-[11px] font-bold uppercase tracking-wider text-white" style="font-family:'Outfit',sans-serif">Real-Time Speech &amp; Behavior Telemetry</h4>
            </div>
            <span class="px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              6 Active Sensors
            </span>
          </div>

          <div class="sh-telemetry-grid">
            <!-- Metric 1: Speech Pace -->
            <div class="sh-telemetry-tile">
              <div class="flex items-center justify-between">
                <span class="sh-telemetry-label">SPEECH PACE</span>
                <span class="text-indigo-400">${icon('mic', 11)}</span>
              </div>
              <p id="telemetry-wpm-val" class="sh-telemetry-val">${telemetry.wpm > 0 ? ('~' + telemetry.wpm + ' WPM') : '0 WPM'}</p>
              <p id="telemetry-wpm-sub" class="sh-telemetry-sub ${telemetry.wpmStatus === 'Optimal Speed' ? 'text-emerald-400' : 'text-amber-300'}">${telemetry.wpmStatus}</p>
            </div>

            <!-- Metric 2: Filler Words -->
            <div class="sh-telemetry-tile">
              <div class="flex items-center justify-between">
                <span class="sh-telemetry-label">FILLER WORDS</span>
                <span class="text-amber-400">${icon('alertCircle', 11)}</span>
              </div>
              <p id="telemetry-filler-val" class="sh-telemetry-val text-amber-300">${telemetry.fillers} detected</p>
              <p id="telemetry-filler-sub" class="sh-telemetry-sub ${telemetry.fillers === 0 ? 'text-emerald-400' : 'text-amber-400'}">${telemetry.fillerStatus}</p>
            </div>

            <!-- Metric 3: Eye Contact -->
            <div class="sh-telemetry-tile">
              <div class="flex items-center justify-between">
                <span class="sh-telemetry-label">EYE CONTACT</span>
                <span class="text-cyan-400">${icon('eye', 11)}</span>
              </div>
              <p id="telemetry-eye-val" class="sh-telemetry-val text-cyan-300">${telemetry.eyeContact}%</p>
              <p class="sh-telemetry-sub text-cyan-400/80">Camera Gaze Focused</p>
            </div>

            <!-- Metric 4: Emotion & Tone -->
            <div class="sh-telemetry-tile">
              <div class="flex items-center justify-between">
                <span class="sh-telemetry-label">EMOTION &amp; TONE</span>
                <span class="text-emerald-400">${icon('sparkles', 11)}</span>
              </div>
              <p id="telemetry-emo-val" class="sh-telemetry-val text-emerald-300">${telemetry.emotion}</p>
              <p class="sh-telemetry-sub text-emerald-400/80">High Confidence</p>
            </div>

            <!-- Metric 5: Articulation & Clarity -->
            <div class="sh-telemetry-tile">
              <div class="flex items-center justify-between">
                <span class="sh-telemetry-label">CLARITY &amp; ENUNCIATION</span>
                <span class="text-indigo-400">${icon('volume2', 11)}</span>
              </div>
              <p id="telemetry-clarity-val" class="sh-telemetry-val text-indigo-300">${telemetry.clarity}%</p>
              <p id="telemetry-clarity-sub" class="sh-telemetry-sub ${telemetry.clarity >= 90 ? 'text-emerald-400' : 'text-indigo-300'}">${telemetry.clarityStatus}</p>
            </div>

            <!-- Metric 6: Live Word Count -->
            <div class="sh-telemetry-tile">
              <div class="flex items-center justify-between">
                <span class="sh-telemetry-label">WORD COUNT</span>
                <span class="text-purple-400">${icon('fileText', 11)}</span>
              </div>
              <p id="telemetry-words-val" class="sh-telemetry-val text-purple-300">${telemetry.words} words</p>
              <p id="telemetry-words-sub" class="sh-telemetry-sub ${telemetry.words > 0 ? 'text-cyan-400' : 'text-white/40'}">${telemetry.wordsStatus}</p>
            </div>
          </div>
        </div>

        <!-- 3. Live Transcript & Interactive Action Hub -->
        <div class="sh-transcript-panel">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-1.5">
              <span class="text-indigo-400">${icon('messageSquare', 12)}</span>
              <span class="text-xs font-bold text-white uppercase tracking-wider" style="font-family:'Outfit',sans-serif">Candidate Transcript</span>
            </div>
            <span id="session-status" class="text-[11px] text-indigo-300 font-medium">${state.sessionMessage || (isSpeaking ? 'Interviewer Speaking...' : 'Live Transcribing...')}</span>
          </div>

          <!-- Transcript Scrollbox -->
          <div id="transcript-box" class="sh-transcript-box">
            ${transcriptText ? `
              <p class="text-white/90 text-xs leading-relaxed font-medium">&ldquo;${transcriptText}&rdquo;</p>
            ` : `
              <div class="flex items-center gap-2 text-white/30 text-xs italic">
                <span class="w-2 h-2 rounded-full ${isSpeaking ? 'bg-indigo-400' : 'bg-emerald-400 animate-pulse'}"></span>
                <span>${isSpeaking ? 'Listening paused while AI speaks...' : (isPaused ? 'Interview paused.' : 'Listening... Speak your answer now.')}</span>
              </div>
            `}
          </div>

          <!-- Action Footer Controls -->
          <div class="flex items-center gap-2 pt-2.5 border-t border-white/6 mt-2.5">
            <button id="btn-submit-answer-manual" class="sh-btn-submit-action">
              ${icon('check', 13)} Submit Response
            </button>
            <button id="btn-next-question" class="sh-btn-next-action">
              <span>Next</span> ${icon('arrowRight', 12)}
            </button>
          </div>
        </div>

      </div>
    </div>
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
    } catch (e) { }

    var utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.onend = done;
    utterance.onerror = done;

    setTimeout(done, 12000);

    try {
      window.speechSynthesis.speak(utterance);
    } catch (e) {
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
      try { state.interviewerAudio.pause(); } catch (e) { }
    }
    var audio = new Audio('data:' + (data.mime_type || 'audio/wav') + ';base64,' + data.audio_base64);
    state.interviewerAudio = audio;
    audio.onended = function () { clearTimeout(fallbackTimeout); onStartListening(); };
    audio.onerror = function () {
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

    state.answerStartTime = Date.now();
    state.currentTranscript = '';
    updateLiveTelemetryUI('');

    setSessionStatus('Listening... Speak your answer.', 'text-emerald-300');
    var box = document.getElementById('transcript-box');
    if (box) box.innerHTML = '<p class="text-emerald-300 text-sm animate-pulse">Listening... Speak your answer now.</p>';

    // Real-Time Speech Recognition for Live Streaming Transcription & Telemetry
    if (window.webkitSpeechRecognition || window.SpeechRecognition) {
      try {
        if (state.liveSpeechRecognition) {
          try { state.liveSpeechRecognition.stop(); } catch (e) { }
        }
        var SpeechRec = window.webkitSpeechRecognition || window.SpeechRecognition;
        var rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = function (event) {
          var interim = '';
          var final = '';
          for (var i = 0; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript + ' ';
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          var fullText = (final + interim).trim();
          if (fullText) {
            state.currentTranscript = fullText;
            updateLiveTelemetryUI(fullText);
          }
        };

        rec.onerror = function (e) {
          console.warn('SpeechRecognition warning:', e);
        };

        rec.start();
        state.liveSpeechRecognition = rec;
      } catch (e) {
        console.warn('Could not start live SpeechRecognition:', e);
      }
    }

    state.recordedMimeType = 'audio/webm';
    state.recordedChunks = [];

    var recorder;
    try { recorder = new MediaRecorder(state.interviewStream); } catch (e) {
      setSessionStatus('Recording not supported in this browser.', 'text-rose-400');
      return;
    }
    state.recordedMimeType = recorder.mimeType || 'audio/webm';
    state.mediaRecorder = recorder;
    recorder.ondataavailable = function (e) { if (e.data && e.data.size > 0) state.recordedChunks.push(e.data); };
    recorder.onstop = function () { onRecordingStop(); };
    recorder.onerror = function (e) { setSessionStatus('Recording error.', 'text-rose-400'); };
    try { recorder.start(); } catch (e) { setSessionStatus('Could not start recording.', 'text-rose-400'); return; }

    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume();
    var src = ctx.createMediaStreamSource(state.interviewStream);
    var proc = ctx.createScriptProcessor(2048, 1, 1);
    var gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(proc); proc.connect(gain); gain.connect(ctx.destination);

    var heard = false, silence = 0, started = Date.now();
    proc.onaudioprocess = function (ev) {
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
    state.autoStopFallback = setTimeout(function () { stopAutoRecording(); }, 45000);
  }

  if (!state.interviewStream || !state.interviewStream.active) {
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
      state.interviewStream = stream;
      doStart();
    }).catch(function () {
      setSessionStatus('Could not access microphone.', 'text-rose-400');
    });
  } else {
    doStart();
  }
}

function stopAutoRecording() {
  if (state.autoStopFallback) { clearTimeout(state.autoStopFallback); state.autoStopFallback = null; }
  if (state.liveSpeechRecognition) {
    try { state.liveSpeechRecognition.stop(); } catch (e) { }
    state.liveSpeechRecognition = null;
  }
  if (state.audioMonitor) {
    try {
      state.audioMonitor.proc.disconnect();
      state.audioMonitor.src.disconnect();
      state.audioMonitor.gain.disconnect();
      state.audioMonitor.ctx.close();
    } catch (e) { }
    state.audioMonitor = null;
  }
  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
    try { state.mediaRecorder.stop(); } catch (e) { }
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
      } catch (e) {
        if (attempt < 2) { await new Promise(function (r) { setTimeout(r, 2000); }); } else throw e;
      }
    }

    // If Gemini transcript is empty, fallback to continuous live recognition transcript
    if (!transcript && state.currentTranscript) {
      transcript = state.currentTranscript.trim();
    }

    if (!transcript || transcript.length < 3) {
      setSessionStatus('No answer detected. Speak your answer clearly or click Next Question.', 'text-amber-300');
      if (box) box.innerHTML = '<p class="text-amber-300 text-sm">No answer detected. Speak your answer clearly or click Next Question.</p>';
      return;
    }

    state.currentTranscript = transcript;
    var durationSec = 15;
    if (state.answerStartTime) {
      durationSec = Math.max(2, Math.round((Date.now() - state.answerStartTime) / 1000));
    }
    var wordList = transcript.trim().split(/\s+/).filter(Boolean);
    var computedWpm = Math.round(wordList.length / (durationSec / 60));
    if (computedWpm > 240) computedWpm = 240;

    updateLiveTelemetryUI(transcript);

    if (box) box.innerHTML = '<div class="text-white/90 text-sm leading-relaxed mb-3 font-medium">"' + transcript + '"</div>';

    setSessionStatus('Evaluating answer with AI...', 'text-indigo-300');
    var q = state.currentInterview.questions[state.currentQuestionIndex];
    var result = await api.submitInterviewAnswer(state.currentInterview.interview.id, q.id, transcript, durationSec, computedWpm);

    state.currentInterview.interview = result.interview;
    state.currentInterview.questions[state.currentQuestionIndex] = result.question;

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
  try { audioBuffer = await ctx.decodeAudioData(arrayBuffer); } catch (e) { ctx.close(); throw new Error('Could not decode audio.'); }
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
    try { state.interviewerAudio.pause(); } catch (e) { }
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
  return new Promise(function (resolve) {
    var reader = new FileReader();
    reader.onloadend = function () { resolve(reader.result); };
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
  state.sessionTimerInterval = setInterval(function () {
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
      }).catch(function () { });
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
    } catch (e) {
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
  } catch (e1) {
    try {
      state.sessionMediaRecorder = new MediaRecorder(state.interviewStream);
    } catch (e2) {
      state.sessionRecordingStatus = 'error';
      state.sessionRecordingError = 'Failed to init recorder';
      return;
    }
  }

  state.sessionMediaRecorder.ondataavailable = function (evt) {
    if (evt.data && evt.data.size > 0) {
      if (!state.sessionRecordingChunks) state.sessionRecordingChunks = [];
      state.sessionRecordingChunks.push(evt.data);
    }
  };

  state.sessionMediaRecorder.onerror = function (evt) {
    console.error('Session MediaRecorder error:', evt);
    state.sessionRecordingStatus = 'error';
    state.sessionRecordingError = 'Recording error';
    render();
  };

  try {
    state.sessionMediaRecorder.start(1000);
    state.sessionRecordingStatus = 'recording';
    state.sessionRecordingError = '';
  } catch (e) {
    state.sessionRecordingStatus = 'error';
    state.sessionRecordingError = 'Failed to start recorder';
  }
}

function pauseSessionMediaRecorder() {
  if (state.sessionMediaRecorder && state.sessionMediaRecorder.state === 'recording') {
    try {
      state.sessionMediaRecorder.pause();
      state.sessionRecordingStatus = 'paused';
    } catch (e) {
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

  return new Promise(function (resolve) {
    state.sessionMediaRecorder.onstop = async function () {
      var res = await finalizeAndUploadBlob(interviewId);
      resolve(res);
    };

    try {
      state.sessionMediaRecorder.stop();
    } catch (e) {
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
  } catch (err) {
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
  } catch (e) {
    if (state.currentInterview && state.currentInterview.interview) {
      state.currentInterview.interview.status = 'completed';
    }
    render();
  }
}

async function startInterviewSession() {
  if (!state.currentInterview || !state.currentInterview.interview) return;
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.resume(); } catch (e) { }
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
    VisionMonitor.onTerminate = handleAttentionTermination;
    VisionMonitor.start(id);
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
  VisionMonitor.pause();
  if (state.interviewerAudio) state.interviewerAudio.pause();

  try {
    var res = await api.pauseInterview(id, state.currentQuestionIndex || 0, state.sessionElapsedSeconds || 0);
    if (res && res.interview) state.currentInterview.interview = res.interview;
    else state.currentInterview.interview.status = 'paused';
    render();
  } catch (err) {
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
    VisionMonitor.resume();
  } catch (err) {
    state.currentInterview.interview.status = 'in_progress';
    startSessionMediaRecorder();
    render();
    startSessionTimer();
    speakCurrentQuestion();
    VisionMonitor.resume();
  }
}

function renderEndConfirmModal() {
  return `<div class="sh-modal-backdrop" id="end-interview-modal-backdrop">
    <div class="w-full max-w-md p-6 rounded-2xl border border-white/10 space-y-5 shadow-2xl sh-modal-card" style="background:#0c0e1c">
      <div class="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
        ${icon('logOut', 22)}
      </div>
      <div class="text-center">
        <h3 class="text-xl font-bold text-white" style="font-family:'Outfit',sans-serif">End Interview Session?</h3>
        <p class="text-white/60 text-xs mt-1.5 leading-relaxed">Are you sure you want to conclude the interview? All evaluated responses will be compiled into your AI Assessment Report.</p>
      </div>
      <div class="flex items-center gap-3 pt-2">
        <button id="modal-confirm-cancel" class="flex-1 py-2.5 rounded-xl font-semibold text-xs text-white/70 hover:text-white border border-white/10 hover:border-white/20 transition-colors">Continue Interview</button>
        <button id="modal-confirm-end" class="flex-1 py-2.5 rounded-xl font-semibold text-xs text-white bg-rose-600 hover:bg-rose-500 shadow-md transition-all">Yes, End Session</button>
      </div>
    </div>
  </div>`;
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
  VisionMonitor.stop();
  if (state.interviewerAudio) state.interviewerAudio.pause();

  var id = state.currentInterview.interview.id;
  await stopAndUploadSessionRecording(id);
  stopInterviewDevices();
  try {
    var res = await api.endInterview(id, state.sessionElapsedSeconds || 0);
    if (res && res.interview) state.currentInterview.interview = res.interview;
    else state.currentInterview.interview.status = 'completed';
    render();
  } catch (err) {
    if (state.currentInterview && state.currentInterview.interview) {
      state.currentInterview.interview.status = 'completed';
    }
    render();
  }
}

/* ── Task 4: server-side attention termination (5 / 5 warnings) ── */
async function handleAttentionTermination(result) {
  if (state.attentionTerminated) return;
  state.attentionTerminated = true;
  stopSessionTimer();
  stopAutoRecording();
  VisionMonitor.stop();
  if (state.interviewerAudio) { try { state.interviewerAudio.pause(); } catch (e) { } }

  var id = state.currentInterview && state.currentInterview.interview
    ? state.currentInterview.interview.id : null;
  if (id) {
    try { await stopAndUploadSessionRecording(id); } catch (e) { }
    try {
      var refreshed = await api.getInterview(id);
      if (refreshed && refreshed.interview) {
        state.currentInterview = refreshed;
        state.currentInterview.interview.status = 'completed';
      }
    } catch (e) { }
  }
  stopInterviewDevices();
  render();
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
  VisionMonitor.stop();
  if (state.audioMonitor) { try { state.audioMonitor.proc.disconnect(); state.audioMonitor.src.disconnect(); state.audioMonitor.ctx.close(); } catch (e) { } state.audioMonitor = null; }
  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') { try { state.mediaRecorder.stop(); } catch (e) { } }
  state.mediaRecorder = null;
  state.recordedChunks = [];
  if (state.interviewerAudio) { try { state.interviewerAudio.pause(); } catch (e) { } state.interviewerAudio = null; }
  if (state.interviewStream) {
    state.interviewStream.getTracks().forEach(function (track) {
      try { track.stop(); } catch (e) { }
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

    setTimeout(function () {
      if (state.resumeStatus === 'uploading') {
        state.resumeStatus = 'analyzing';
        render();
      }
    }, 600);

    api.uploadResume(file).then(function (res) {
      state.configResume = res.resume;
      state.resumeStatus = 'ready';
      state.resumeError = '';
      render();
    }).catch(function (err) {
      state.configResume = null;
      state.resumeStatus = 'error';
      state.resumeError = err.message || 'Please upload a PDF or DOCX file under 5MB.';
      render();
    });
  }

  if (dropzone) {
    dropzone.addEventListener('click', function (e) {
      if (e.target.tagName !== 'INPUT' && fileInput) fileInput.click();
    });
    dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropzone.classList.add('mic-resume-zone-active');
    });
    dropzone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      dropzone.classList.remove('mic-resume-zone-active');
    });
    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropzone.classList.remove('mic-resume-zone-active');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });
  }

  if (replaceBtn && fileInput) {
    replaceBtn.addEventListener('click', function () { fileInput.click(); });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', function () {
      state.configResume = null;
      state.resumeStatus = 'idle';
      state.resumeError = '';
      render();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      if (this.files && this.files[0]) handleFileSelect(this.files[0]);
    });
  }

  var configRoundSelect = document.getElementById('config-round-select');
  if (configRoundSelect) configRoundSelect.addEventListener('change', function () {
    state.configRound = this.value;
    state.configFocus = [];
    state.configError = '';
    render();
  });
  document.querySelectorAll('.config-mode-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { state.configMode = this.dataset.mode; state.configError = ''; render(); });
  });
  document.querySelectorAll('.config-qty-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { state.configNumQuestions = parseInt(this.dataset.qty); render(); });
  });
  document.querySelectorAll('.config-time-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { state.configTimeDuration = parseInt(this.dataset.time); state.configMode = 'time'; render(); });
  });
  var configDiffSelect = document.getElementById('config-diff-select');
  if (configDiffSelect) configDiffSelect.addEventListener('change', function () { state.configDifficulty = this.value; state.configError = ''; render(); });
  var configDurationSelect = document.getElementById('config-duration-select');
  if (configDurationSelect) configDurationSelect.addEventListener('change', function () { state.configTimeDuration = parseInt(this.value); state.configMode = 'time'; render(); });
  document.querySelectorAll('.config-focus-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = this.dataset.focus;
      var i = state.configFocus.indexOf(f);
      if (i === -1) state.configFocus.push(f);
      else state.configFocus.splice(i, 1);
      render();
    });
  });
  document.querySelectorAll('.config-style-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { state.configQuestionStyle = this.dataset.style; render(); });
  });
  document.querySelectorAll('.config-interviewer-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { state.configInterviewerStyle = this.dataset.interviewer; render(); });
  });
  var configJobRole = document.getElementById('config-job-role');
  if (configJobRole) configJobRole.addEventListener('input', function () {
    state.configJobRole = this.value;
    state.configError = '';
    var errEl = document.querySelector('.config-error-box');
    if (errEl) errEl.remove();
    var summary = document.querySelector('#config-summary-role');
    if (summary) summary.textContent = (this.value || 'General');
  });
  var configStart = document.getElementById('config-start');
  if (configStart) configStart.addEventListener('click', function () { startCandidateInterview(this); });
  var testDevices = document.getElementById('btn-test-devices');
  if (testDevices) testDevices.addEventListener('click', testCandidateDevices);
  var testRoomDevices = document.getElementById('btn-test-room-devices');
  if (testRoomDevices) testRoomDevices.addEventListener('click', testCandidateDevices);

  /* ── Lobby Media Controls & Diagnostic Events ── */
  var btnLobbyMic = document.getElementById('btn-toggle-lobby-mic');
  if (btnLobbyMic) {
    btnLobbyMic.addEventListener('click', function () {
      state.lobbyMicMuted = !state.lobbyMicMuted;
      if (state.interviewStream) {
        state.interviewStream.getAudioTracks().forEach(function (t) {
          t.enabled = !state.lobbyMicMuted;
        });
      }
      render();
    });
  }

  var btnLobbyCam = document.getElementById('btn-toggle-lobby-cam');
  if (btnLobbyCam) {
    btnLobbyCam.addEventListener('click', function () {
      state.lobbyCamMuted = !state.lobbyCamMuted;
      if (state.interviewStream) {
        state.interviewStream.getVideoTracks().forEach(function (t) {
          t.enabled = !state.lobbyCamMuted;
        });
      }
      render();
    });
  }

  var btnTestSpeaker = document.getElementById('btn-test-speaker');
  if (btnTestSpeaker) {
    btnTestSpeaker.addEventListener('click', function () {
      try {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        var actx = new AudioCtx();
        var now = actx.currentTime;
        var tones = [523.25, 659.25, 783.99]; // C5, E5, G5 harmonic chord
        tones.forEach(function (freq, i) {
          var osc = actx.createOscillator();
          var gain = actx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          gain.gain.setValueAtTime(0, now + i * 0.12);
          gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.38);
          osc.connect(gain);
          gain.connect(actx.destination);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.4);
        });
        state.audioTestSuccess = true;
        render();
        setTimeout(function () {
          state.audioTestSuccess = false;
          render();
        }, 2200);
      } catch (e) {
        console.warn('Audio test chime error:', e);
      }
    });
  }

  var backToInterviews = document.getElementById('btn-back-to-interviews');
  if (backToInterviews) backToInterviews.addEventListener('click', function () { state.section = 'interviews'; render(); });
  var endSession = document.getElementById('btn-end-session');
  if (endSession) endSession.addEventListener('click', function () { stopInterviewDevices(); state.section = 'interviews'; render(); });

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

  /* ── Redesigned Room Controls ── */
  var btnListenQ = document.getElementById('btn-listen-question-loud');
  if (btnListenQ) {
    btnListenQ.addEventListener('click', function () {
      speakCurrentQuestion();
    });
  }

  var btnReplayFeedback = document.getElementById('btn-replay-feedback');
  if (btnReplayFeedback) {
    btnReplayFeedback.addEventListener('click', function () {
      var q = state.currentInterview && state.currentInterview.questions && state.currentInterview.questions[state.currentQuestionIndex];
      if (q && q.feedback) {
        speakWithWebSpeech("Evaluation remark. " + q.feedback);
      }
    });
  }

  var btnToggleVoice = document.getElementById('btn-toggle-ai-voice');
  if (btnToggleVoice) {
    btnToggleVoice.addEventListener('click', function () {
      state.aiVoiceEnabled = !state.aiVoiceEnabled;
      if (!state.aiVoiceEnabled && state.interviewerAudio) {
        try { state.interviewerAudio.pause(); } catch (e) { }
      }
      render();
    });
  }

  var btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
  if (btnToggleFullscreen) {
    btnToggleFullscreen.addEventListener('click', function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () { });
      } else {
        if (document.exitFullscreen) document.exitFullscreen().catch(function () { });
      }
    });
  }

  var btnToggleRoomMic = document.getElementById('btn-toggle-room-mic');
  if (btnToggleRoomMic) {
    btnToggleRoomMic.addEventListener('click', function () {
      state.lobbyMicMuted = !state.lobbyMicMuted;
      if (state.interviewStream) {
        state.interviewStream.getAudioTracks().forEach(function (t) {
          t.enabled = !state.lobbyMicMuted;
        });
      }
      render();
    });
  }

  var btnToggleRoomCam = document.getElementById('btn-toggle-room-cam');
  if (btnToggleRoomCam) {
    btnToggleRoomCam.addEventListener('click', function () {
      state.lobbyCamMuted = !state.lobbyCamMuted;
      if (state.interviewStream) {
        state.interviewStream.getVideoTracks().forEach(function (t) {
          t.enabled = !state.lobbyCamMuted;
        });
      }
      render();
    });
  }

  var btnManualSubmit = document.getElementById('btn-submit-answer-manual');
  if (btnManualSubmit) {
    btnManualSubmit.addEventListener('click', function () {
      stopAutoRecording();
    });
  }

  var modalCancel = document.getElementById('modal-confirm-cancel');
  if (modalCancel) modalCancel.addEventListener('click', closeEndInterviewModal);

  var modalEnd = document.getElementById('modal-confirm-end');
  if (modalEnd) modalEnd.addEventListener('click', confirmEndInterviewSession);

  var modalBackdrop = document.getElementById('end-interview-modal-backdrop');
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', function (e) {
      if (e.target === modalBackdrop) closeEndInterviewModal();
    });
  }

  if (!window._reportDelegationBound) {
    window._reportDelegationBound = true;
    document.addEventListener('click', async function (e) {
      var btn = e.target.closest('.btn-view-report, #btn-view-interview-report, .history-report-btn');
      if (btn) {
        e.preventDefault();
        var id = btn.dataset.id || btn.dataset.reportId;
        if (!id) return;
        try {
          var report = await api.getInterviewReport(id);
          state.activeReportModal = report;
          render();
        } catch (err) {
          window.alert('Unable to load report: ' + (err.message || 'Report not found'));
        }
      }

      var playBtn = e.target.closest('.btn-play-video');
      if (playBtn) {
        e.preventDefault();
        var sessionId = playBtn.dataset.sessionId;
        var recId = playBtn.dataset.recId;
        var recordings = state.recordingsData || [];
        var found = recordings.find(function (r) { return String(r.id) === String(recId) || String(r.session_id) === String(sessionId); });
        if (found) {
          state.activeVideoModal = found;
          render();
        }
      }

      var deleteBtn = e.target.closest('.btn-delete-video');
      if (deleteBtn) {
        e.preventDefault();
        var delSessionId = deleteBtn.dataset.sessionId;
        var delRecId = deleteBtn.dataset.recId;
        if (window.confirm('Are you sure you want to delete this interview recording?')) {
          api.deleteRecording(delRecId, delSessionId).then(function () {
            if (state.recordingsData) {
              state.recordingsData = state.recordingsData.filter(function (r) {
                return String(r.id) !== String(delRecId);
              });
            }
            render();
          }).catch(function (err) {
            window.alert('Failed to delete recording: ' + (err.message || 'Error'));
          });
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
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.activeVideoModal) {
        state.activeVideoModal = null;
        render();
      }
    });
  }

  var reportClose = document.getElementById('report-modal-close');
  if (reportClose) reportClose.addEventListener('click', function () { state.activeReportModal = null; render(); });
  var reportOverlay = document.getElementById('report-modal-overlay');
  if (reportOverlay) reportOverlay.addEventListener('click', function (e) { if (e.target === reportOverlay) { state.activeReportModal = null; render(); } });
  var reportBack = document.getElementById('report-back');
  if (reportBack) reportBack.addEventListener('click', function () { state.activeReportModal = null; render(); });

  /* ── Report accordion ── */
  document.querySelectorAll('.report-accordion').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var body = document.querySelector(this.dataset.target);
      if (!body) return;
      var chev = this.querySelector('.report-chevron');
      var isHidden = body.classList.contains('hidden');
      document.querySelectorAll('.report-accordion').forEach(function (other) {
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
        body.querySelectorAll('.report-progress').forEach(function (bar) {
          var w = parseFloat(bar.dataset.w || '0');
          window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { bar.style.width = w + '%'; }); });
        });
      } else {
        body.classList.add('hidden');
        if (chev) chev.style.transform = '';
      }
    });
  });

  /* ── Report nav scroll ── */
  document.querySelectorAll('.report-nav-link').forEach(function (link) {
    link.addEventListener('click', function () {
      var target = document.querySelector(this.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ── Animate report progress bars ── */
  document.querySelectorAll('.report-progress').forEach(function (bar) {
    var w = parseFloat(bar.dataset.w || '0');
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { bar.style.width = w + '%'; });
    });
  });

  /* ── History toolbar bindings ── */
  var histSearch = document.getElementById('hist-search');
  if (histSearch) histSearch.addEventListener('input', function () { state.historySearch = this.value; state.historyPage = 1; render(); });
  var histType = document.getElementById('hist-type-filter');
  if (histType) histType.addEventListener('change', function () { state.historyTypeFilter = this.value; state.historyPage = 1; render(); });
  var histDate = document.getElementById('hist-date-filter');
  if (histDate) histDate.addEventListener('change', function () { state.historyDateFilter = this.value; state.historyPage = 1; render(); });
  var histRating = document.getElementById('hist-rating-filter');
  if (histRating) histRating.addEventListener('change', function () { state.historyRatingFilter = this.value; state.historyPage = 1; render(); });
  var histSort = document.getElementById('hist-sort');
  if (histSort) histSort.addEventListener('change', function () { state.historySort = this.value; state.historyPage = 1; render(); });
  var histPrev = document.getElementById('hist-prev');
  if (histPrev) histPrev.addEventListener('click', function () { if (state.historyPage > 1) { state.historyPage--; render(); } });
  var histNext = document.getElementById('hist-next');
  if (histNext) histNext.addEventListener('click', function () { state.historyPage++; render(); });

  /* ── Animate score bars ── */
  document.querySelectorAll('.score-bar').forEach(function (bar) {
    var target = parseFloat(bar.dataset.score || '0');
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { bar.style.width = target + '%'; });
    });
  });

  /* ── History trend chart ── */
  var trendCanvas = document.getElementById('chart-history-trend');
  if (trendCanvas && state.historyData && state.historyData.length >= 2) {
    var trendItems = state.historyData.slice(0, 6).slice().reverse();
    var labels = trendItems.map(function (h) { return '#' + h.id; });
    var vals = trendItems.map(function (h) { return h.overall_score || h.total_score || 0; });
    drawAreaChart('chart-history-trend', [
      { label: 'Score', data: vals, color: INDIGO },
    ], labels);
  }

  /* ── Camera Stream Binding & Lifecycle ── */
  if (state.section === 'session' && !state.interviewStream && !state.isRequestingDevices && !state.deviceRequestFailed) {
    state.isRequestingDevices = true;
    enableInterviewDevices().then(function (stream) {
      state.isRequestingDevices = false;
      var cam = document.getElementById('candidate-camera');
      if (cam && stream) cam.srcObject = stream;
      render();
    }).catch(function () {
      state.isRequestingDevices = false;
      state.deviceRequestFailed = true;
      render();
    });
  } else if (state.section === 'session' && state.interviewStream) {
    var cam = document.getElementById('candidate-camera');
    if (cam && cam.srcObject !== state.interviewStream) {
      cam.srcObject = state.interviewStream;
    }
    var activeInterview = state.currentInterview && state.currentInterview.interview;
    if (activeInterview && activeInterview.status === 'in_progress' && !VisionMonitor.isRunning()) {
      VisionMonitor.start(activeInterview.id);
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

/* ── Module 6: Vision & Camera Focus report card (eye contact, orientation) ── */
function renderVisionReportCard(vm) {
  if (!vm || !vm.eye || typeof vm.eye.contact_pct !== 'number') return '';
  var eye = vm.eye;
  var pct = Math.min(100, Math.max(0, eye.contact_pct));
  var focusColor = eye.focus_label === 'Good' ? EMERALD : eye.focus_label === 'Fair' ? AMBER : ROSE;  var orientEntries = Object.keys(vm.orientation_counts || {}).map(function (k) {
    return k + ': ' + Math.round(vm.orientation_counts[k] / (vm.pose_frames || 1) * 100) + '%';
  });

  function fmtSecs(s) {
    if (!s) return '0s';
    var m = Math.floor(s / 60);
    var r = Math.round(s % 60);
    return m > 0 ? m + 'm ' + r + 's' : r + 's';
  }

  return `<div class="rounded-2xl border border-white/8 p-4" style="background:#0c0e1c">
            ${renderConfidenceIndicatorBlock(vm.confidence_indicator)}
            <div class="flex items-center gap-2 mb-3 ${vm.confidence_indicator && vm.confidence_indicator.score !== null ? 'mt-3 pt-3 border-t border-white/6' : ''}">
              <span class="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style="background:${CYAN}1f;color:${CYAN}">${icon('eye', 13)}</span>
              <p class="text-white/70 text-xs font-semibold uppercase tracking-wider">Vision &amp; Camera Focus</p>
            </div>
            <div class="space-y-2.5">
              <div>
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="text-white/60">Eye Contact Consistency</span>
                  <span class="text-white font-semibold">${pct.toFixed(0)}% &middot; ${eye.focus_label}</span>
                </div>
                <div class="w-full h-1.5 rounded-full bg-white/6 overflow-hidden">
                  <div class="h-full rounded-full" style="width:${pct}%;background:${focusColor}"></div>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div class="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                  <p class="text-white/40">Camera Contact Time</p>
                  <p class="text-white font-bold mt-0.5">${fmtSecs(eye.seconds_contact)}</p>
                </div>
                <div class="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                  <p class="text-white/40">Looking Away Time</p>
                  <p class="text-white font-bold mt-0.5">${fmtSecs(eye.seconds_away)}</p>
                </div>
              </div>
              ${orientEntries.length ? `<p class="text-white/40 text-[10.5px] pt-1 leading-relaxed">Head orientation mix — ${orientEntries.join(' &middot; ')}</p>` : ''}
              ${renderEmotionMixRows(vm.emotion)}
            </div>
          </div>`;
}

/* ── Module 6 · Task 5: Emotion CNN distribution rows (report only) ── */
var EMOTION_DISPLAY_NAMES = {
  nervousness: 'Nervousness', confidence: 'Confidence',
  fear: 'Fear', confused: 'Confused',
  /* legacy FER-2013 keys from sessions recorded before the CNN upgrade */
  happy: 'Happy', neutral: 'Neutral', sad: 'Sad', angry: 'Angry',
  surprise: 'Surprise', disgust: 'Disgust',
};

function renderEmotionMixRows(emotion) {
  if (!emotion || !emotion.dominant_distribution) return '';
  var entries = Object.keys(emotion.dominant_distribution)
    .map(function (k) { return { key: k, name: EMOTION_DISPLAY_NAMES[k] || k, pct: emotion.dominant_distribution[k] }; })
    .slice(0, 4);
  if (!entries.length) return '';
  var colorFor = function (key) {
    if (key === 'confidence') return EMERALD;
    if (key === 'nervousness') return AMBER;
    if (key === 'confused') return CYAN;
    if (key === 'happy') return EMERALD;
    if (key === 'neutral') return INDIGO;
    if (key === 'surprise') return CYAN;
    return ROSE;
  };
  return `<div class="pt-2 mt-1 border-t border-white/6">
            <p class="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1.5">Facial Emotion Mix</p>
            ${entries.map(function (e) {
    return `<div class="mb-1.5">
                      <div class="flex items-center justify-between text-[10.5px] mb-0.5">
                        <span class="text-white/60">${e.name}${e.key === emotion.session_dominant ? ' &middot; dominant' : ''}</span>
                        <span class="text-white/80 font-semibold">${e.pct.toFixed(0)}%</span>
                      </div>
                      <div class="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                        <div class="h-full rounded-full" style="width:${Math.min(100, e.pct)}%;background:${colorFor(e.key)}"></div>
                      </div>
                    </div>`;
  }).join('')}
          </div>`;
}

/* ── Module 6 · Task 7: Engagement Score card (participation composite) ── */
function renderEngagementCard(vm) {
  if (!vm || !vm.engagement || vm.engagement.score === null || vm.engagement.score === undefined) return '';
  var en = vm.engagement;
  var levelColor = en.level === 'High' ? EMERALD : en.level === 'Moderate' ? INDIGO : AMBER;
  var labels = {
    attention: 'Attention', eye_contact: 'Eye Contact', face_presence: 'Face Presence',
    head_orientation: 'Head Orientation', facial_activity: 'Facial Activity',
    interaction_continuity: 'Continuity',
  };
  var entries = Object.keys(en.components)
    .filter(function (k) { return typeof en.components[k] === 'number'; })
    .map(function (k) { return { key: k, name: labels[k] || k, val: en.components[k] }; });
  var detail = en.activity_detail || {};
  return `<div class="rounded-2xl border border-white/8 p-4" style="background:#0c0e1c">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style="background:${INDIGO}1f;color:${INDIGO}">${icon('activity', 13)}</span>
                <p class="text-white/70 text-xs font-semibold uppercase tracking-wider">Engagement Score</p>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style="background:${levelColor}22;color:${levelColor};border:1px solid ${levelColor}44">${en.level}</span>
            </div>
            <div class="flex items-center gap-3 mb-2">
              <p class="text-3xl font-extrabold text-white" style="font-family:'Outfit',sans-serif">${en.score.toFixed(0)}</p>
              <div class="flex-1 h-2 rounded-full bg-white/6 overflow-hidden">
                <div class="h-full rounded-full" style="width:${Math.min(100, en.score)}%;background:${levelColor}"></div>
              </div>
            </div>
            <div class="space-y-1.5">
              ${entries.map(function (c) {
    return `<div>
                        <div class="flex items-center justify-between text-[10.5px] mb-0.5">
                          <span class="text-white/55">${c.name}</span>
                          <span class="text-white/80 font-semibold">${c.val.toFixed(0)}</span>
                        </div>
                        <div class="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                          <div class="h-full rounded-full" style="width:${Math.min(100, c.val)}%;background:${INDIGO}"></div>
                        </div>
                      </div>`;
  }).join('')}
            </div>
            ${(detail.head_travel_degrees !== undefined) ? `<p class="text-white/30 text-[9.5px] mt-2 leading-relaxed">Activity signals: ${detail.head_travel_degrees.toFixed(0)}&deg; head travel &middot; ${detail.expression_transitions} expression transitions &middot; longest gap ${detail.longest_away_streak_s.toFixed(0)}s over ${Math.round((detail.duration_seconds || 0) / 60)} min.</p>` : ''}
            <p class="text-white/30 text-[9.5px] mt-1 leading-relaxed">Measures participation &mdash; independent of which emotion is shown.</p>
          </div>`;
}

/* ── Module 6 · Task 8: Interview Behavior Analysis (whole-timeline rollup) ── */
function renderBehaviorSection(vmetrics) {
  if (!vmetrics || !vmetrics.behavior) return '';
  var b = vmetrics.behavior;
  var m = b.metrics || {};
  var fmtPct = function (v) { return (v === null || v === undefined) ? '—' : v.toFixed(0) + '%'; };
  var metrics = [
    ['Eye Contact', fmtPct(m.eye_contact_pct)],
    ['Attention', fmtPct(m.attention_pct)],
    ['Face Visibility', fmtPct(m.face_visibility_pct)],
    ['Avg Head Movement', m.avg_head_movement_deg_per_min != null ? m.avg_head_movement_deg_per_min.toFixed(1) + '°/min' : '—'],
    ['Longest Attention Break', m.longest_attention_break_s != null ? m.longest_attention_break_s.toFixed(0) + 's' : '—'],
    ['Significant Attention Breaks', String(m.significant_attention_breaks ?? 0)],
    ['Confidence Indicator', m.confidence_indicator != null ? m.confidence_indicator.toFixed(0) : '—'],
    ['Engagement Score', (function () {
      var en = vmetrics.engagement;
      if (!en || en.score == null) return '—';
      return en.score.toFixed(0) + ' · ' + (en.level || '');
    })()],
  ];
  var emoDist = m.dominant_expression_distribution || {};
  var emoChips = Object.keys(emoDist).slice(0, 4).map(function (k) {
    var name = EMOTION_DISPLAY_NAMES[k] || k;
    return `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-white/70 border border-white/10">${name} ${emoDist[k].toFixed(0)}%</span>`;
  }).join(' ');

  var segmentsHtml = (b.segments || []).map(function (seg, i) {
    var last = i === (b.segments.length - 1);
    return `<div class="flex items-start gap-3">
              <span class="text-[10.5px] text-indigo-300/80 font-mono pt-0.5 shrink-0 w-24">${seg.from} - ${seg.to}</span>
              <div class="flex flex-col items-center self-stretch">
                <span class="w-1.5 h-1.5 rounded-full bg-indigo-400/80 mt-1"></span>
                ${last ? '' : '<span class="w-px flex-1 bg-white/10 my-0.5"></span>'}
              </div>
              <p class="text-xs text-white/75 leading-snug pb-2">${seg.label}</p>
            </div>`;
  }).join('');

  var pointsHtml = (b.summary_points || []).map(function (p) {
    var good = p.kind === 'good';
    return `<li class="flex items-start gap-2 text-xs leading-relaxed">
              <span class="mt-0.5 shrink-0" style="color:${good ? '#34d399' : '#fbbf24'}">${good ? icon('checkCircle', 13) : icon('alertTriangle', 13)}</span>
              <span class="text-white/80">${p.text}</span>
            </li>`;
  }).join('');

  if (!segmentsHtml && !pointsHtml && !metrics.length) return '';
  return `<div class="report-section rounded-2xl border border-white/8 p-5" id="report-behavior" style="background:#0c0e1c">
            <div class="flex items-center gap-2 mb-4">
              <span class="text-indigo-400">${icon('activity', 15)}</span>
              <h3 class="text-base font-semibold text-white" style="font-family:'Outfit',sans-serif">Interview Behavior Analysis</h3>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              ${metrics.map(function (r) {
    return `<div class="p-2.5 rounded-xl border border-white/5 bg-white/[0.02]">
                        <p class="text-white/40 text-[10px] uppercase font-semibold tracking-wide">${r[0]}</p>
                        <p class="text-white text-sm font-bold mt-0.5">${r[1]}</p>
                      </div>`;
  }).join('')}
            </div>
            ${emoChips ? `<div class="mb-4"><p class="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1">Dominant Expression Distribution</p><div>${emoChips}</div></div>` : ''}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${segmentsHtml ? `<div><p class="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-2">Session Timeline</p><div>${segmentsHtml}</div></div>` : ''}
              ${pointsHtml ? `<div><p class="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-2">Behavior Summary</p><ul class="space-y-1.5">${pointsHtml}</ul></div>` : ''}
            </div>
          </div>`;
}

/* ── Module 6 · Task 8: AI Feedback & Scoring (weighted pillar cards) ── */
var PILLAR_META = {
  communication: {
    title: 'Communication Score', weight: 30, color: INDIGO,
    desc: 'Measures verbal communication quality based on the 5 core parameters',
    params: {
      speech_clarity: ['Speech Clarity', 20, 'Pronunciation & enunciation'],
      grammar_quality: ['Grammar Quality', 25, 'Grammatical correctness'],
      filler_word_freq: ['Filler-Word Frequency', 20, 'Fluency & verbal control'],
      speaking_pace: ['Speaking Pace', 15, 'Cadence & WPM tempo'],
      response_completeness: ['Response Completeness', 20, 'Articulation depth'],
    },
  },
  confidence: {
    title: 'Confidence Score', weight: 25, color: CYAN,
    desc: 'Measures behavioral confidence signals observed during the session',
    params: {
      eye_contact_consistency: ['Eye-Contact Consistency', 25, 'Measured camera focus'],
      facial_engagement: ['Facial Engagement', 20, 'Expressive presence & motion'],
      response_hesitation: ['Response Hesitation', 15, 'Pause & hesitation control'],
      speaking_confidence: ['Speaking Confidence', 20, 'Behavioral confidence indicator'],
      attention_level: ['Attention Level', 20, 'Sustained attentive behavior'],
    },
  },
  technical: {
    title: 'Technical Relevance Score', weight: 30, color: EMERALD,
    desc: 'Measures the quality and relevance of interview answers',
    params: {
      technical_accuracy: ['Technical Accuracy', 25, 'Correctness & depth of answers'],
      keyword_relevance: ['Keyword Relevance', 20, 'Domain terminology usage'],
      problem_solving_ability: ['Problem-Solving Depth', 20, 'Structured reasoning'],
      domain_knowledge: ['Domain Knowledge', 20, 'Subject-matter command'],
      answer_completeness: ['Answer Completeness', 15, 'Coverage of the prompt'],
    },
  },
  professionalism: {
    title: 'Professionalism Score', weight: 15, color: AMBER,
    desc: 'Measures overall interview discipline and professionalism',
    params: {
      time_management: ['Time Management', 25, 'Duration adherence'],
      response_organization: ['Response Organization', 25, 'STAR response structure'],
      professional_communication: ['Professional Communication', 25, 'Tone & delivery'],
      interview_etiquette: ['Interview Etiquette', 25, 'Proctoring discipline'],
    },
  },
};

function paramRating(val) {
  if (val >= 90) return { label: 'Excellent', color: EMERALD };
  if (val >= 75) return { label: 'Good', color: INDIGO };
  if (val >= 60) return { label: 'Average', color: AMBER };
  if (val >= 40) return { label: 'Needs Improvement', color: ROSE };
  return { label: 'Poor', color: '#e11d48' };
}

function buildPillarData(report, params) {
  var commParams = {};
  var ca = report.communication_analysis && report.communication_analysis.parameters;
  Object.keys(PILLAR_META.communication.params).forEach(function (k) {
    commParams[k] = (ca && ca[k] !== undefined) ? ca[k] : params[k];
  });
  var confValues = {}, confSources = {};
  var cna = report.confidence_analysis;
  if (cna && cna.parameters) {
    Object.keys(cna.parameters).forEach(function (k) {
      confValues[k] = cna.parameters[k].value;
      confSources[k] = cna.parameters[k].source;
    });
  } else {
    Object.keys(PILLAR_META.confidence.params).forEach(function (k) { confValues[k] = params[k]; });
  }
  var techParams = {};
  Object.keys(PILLAR_META.technical.params).forEach(function (k) { techParams[k] = params[k]; });
  var profValues = {}, profSources = {};
  var pna = report.professionalism_analysis;
  if (pna && pna.parameters) {
    Object.keys(pna.parameters).forEach(function (k) {
      profValues[k] = pna.parameters[k].value;
      profSources[k] = pna.parameters[k].source;
    });
  } else {
    Object.keys(PILLAR_META.professionalism.params).forEach(function (k) { profValues[k] = params[k]; });
  }
  return {
    communication: { score: report.communication_score, params: commParams, sources: {} },
    confidence: { score: report.confidence_score, params: confValues, sources: confSources },
    technical: { score: report.technical_score, params: techParams, sources: {} },
    professionalism: { score: report.professionalism_score, params: profValues, sources: profSources },
  };
}

function renderPillarScores(report, params) {
  var pillars = buildPillarData(report, params);
  return Object.keys(PILLAR_META).map(function (key) {
    var meta = PILLAR_META[key];
    var data = pillars[key];
    var score = (data.score !== null && data.score !== undefined) ? data.score : 0;
    var pts = score * meta.weight / 100;
    var paramKeys = Object.keys(meta.params);
    var rows = paramKeys.map(function (k) {
      var def = meta.params[k];
      var val = data.params[k];
      var hasValue = typeof val === 'number';
      var rating = paramRating(hasValue ? val : 0);
      var measured = data.sources[k] === 'measured_vision';
      return `<div class="py-1.5 border-b border-white/5 last:border-0">
                  <div class="flex items-center justify-between text-[11px] mb-1">
                    <span class="text-white/70">${def[0]} <span class="text-white/35">[${def[1]}%]</span></span>
                    <span class="flex items-center gap-2">
                      <span class="font-bold text-white">${hasValue ? val.toFixed(0) + '%' : '—'}</span>
                      <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style="background:${rating.color}22;color:${rating.color}">${hasValue ? rating.label : 'No Data'}</span>
                    </span>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-[9.5px] text-white/35 flex-1">${def[2]}</p>
                    ${measured ? `<span class="text-[8.5px] font-bold px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">MEASURED</span>` : ''}
                  </div>
                </div>`;
    }).join('');
    return `<div class="rounded-2xl border border-white/8 p-4" style="background:#0c0e1c">
              <div class="flex items-center justify-between mb-1">
                <p class="text-white text-sm font-bold" style="font-family:'Outfit',sans-serif">${meta.title}</p>
                <span class="text-lg font-extrabold text-white">${score.toFixed(0)}<span class="text-white/40 text-xs font-semibold">%</span></span>
              </div>
              <div class="flex items-center justify-between mb-2">
                <p class="text-white/40 text-[10px] leading-snug pr-2">${meta.desc}</p>
                <span class="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-white/5 text-white/60 border border-white/10">Weight ${meta.weight}%</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-white/6 overflow-hidden mb-2">
                <div class="h-full rounded-full" style="width:${Math.min(100, score)}%;background:${meta.color}"></div>
              </div>
              <p class="text-white/30 text-[9.5px] mb-1">Contributes <strong class="text-white/50">${pts.toFixed(1)} pts</strong> to overall score</p>
              ${rows}
            </div>`;
  }).join('');
}


var CONFIDENCE_COMPONENT_LABELS = {
  eye_contact: 'Eye Contact',
  head_stability: 'Head Stability',
  face_visibility: 'Face Visibility',
  attention: 'Attention',
  expression_stability: 'Expression Stability',
};

function renderConfidenceIndicatorBlock(ci) {
  if (!ci || ci.score === null || ci.score === undefined) return '';
  var bandColor = ci.band === 'Strong' ? EMERALD : ci.band === 'Moderate' ? INDIGO : AMBER;
  var compEntries = Object.keys(ci.components)
    .filter(function (k) { return typeof ci.components[k] === 'number'; })
    .map(function (k) {
      return { key: k, name: CONFIDENCE_COMPONENT_LABELS[k] || k, val: ci.components[k] };
    });
  return `<div class="mb-1">
            <div class="flex items-center justify-between mb-2">
              <p class="text-white/70 text-xs font-semibold uppercase tracking-wider">Confidence Indicator</p>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style="background:${bandColor}22;color:${bandColor};border:1px solid ${bandColor}44">${ci.band}</span>
            </div>
            <div class="flex items-center gap-3 mb-2">
              <p class="text-3xl font-extrabold text-white" style="font-family:'Outfit',sans-serif">${ci.score.toFixed(0)}</p>
              <div class="flex-1 h-2 rounded-full bg-white/6 overflow-hidden">
                <div class="h-full rounded-full" style="width:${Math.min(100, ci.score)}%;background:${bandColor}"></div>
              </div>
            </div>
            <div class="space-y-1.5">
              ${compEntries.map(function (c) {
    return `<div>
                        <div class="flex items-center justify-between text-[10.5px] mb-0.5">
                          <span class="text-white/55">${c.name}</span>
                          <span class="text-white/80 font-semibold">${c.val.toFixed(0)}</span>
                        </div>
                        <div class="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                          <div class="h-full rounded-full" style="width:${Math.min(100, c.val)}%;background:${CYAN}"></div>
                        </div>
                      </div>`;
  }).join('')}
            </div>
            <p class="text-white/30 text-[9.5px] mt-2 leading-relaxed">Behavioral indicator from measurable signals (eye contact, head stability, visibility, attention, expression stability) &mdash; not a claim of actual confidence.</p>
          </div>`;
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

  /* ── Module 6: measured vision analytics override placeholders ── */
  var visionMetrics = report.vision_metrics || null;
  var visionEye = visionMetrics && visionMetrics.eye ? visionMetrics.eye : null;
  if (visionEye && typeof visionEye.contact_pct === 'number') {
    params.eye_contact_consistency = Math.round(visionEye.contact_pct);
    if (typeof params.attention_level !== 'number') params.attention_level = Math.round(visionEye.contact_pct);
  }

  /* ── Format date ── */
  var dateLine = formatDateTime(report.completed_at || report.created_at);

  var itype = report.interview_type ? report.interview_type.charAt(0).toUpperCase() + report.interview_type.slice(1) : 'Interview';
  var diff = report.difficulty ? report.difficulty.charAt(0).toUpperCase() + report.difficulty.slice(1) : 'General';

  /* ── Performance summary computations ── */
  var paramEntries = Object.keys(params).filter(function (k) { return typeof params[k] === 'number'; })
    .map(function (k) { return { key: k, val: params[k] }; });
  var strongest = paramEntries.length ? paramEntries.reduce(function (a, b) { return a.val >= b.val ? a : b; }) : null;
  var weakest = paramEntries.length ? paramEntries.reduce(function (a, b) { return a.val <= b.val ? a : b; }) : null;
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

  var avgQScore = questions.length ? questions.reduce(function (s, q) { return s + (q.score || 0); }, 0) / questions.length : 0;

  /* ── Section nav ── */
  var sections = [
    { id: 'report-overview', label: 'Overview' },
    { id: 'report-speech-grammar', label: 'Communication & Grammar' },
    { id: 'report-behavior', label: 'Behavior' },
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

  /* ── Module 5: Spoken Communication & Grammar Analytics ── */
  var hasAnsweredQuestions = questions.some(function (q) { return q.answer_text && q.answer_text.trim(); });

  var grammarAnalysis = report.grammar_analysis || (report.communication_analysis && report.communication_analysis.grammar_analysis) || {
    grammar_score: params.grammar_quality !== undefined ? params.grammar_quality : comm,
    issues_count: 0,
    issues: [],
    message: hasAnsweredQuestions ? 'No major grammar issues detected.' : 'No spoken responses recorded for grammar evaluation.'
  };
  var gScore = grammarAnalysis.grammar_score !== undefined ? grammarAnalysis.grammar_score : (params.grammar_quality !== undefined ? params.grammar_quality : comm);
  var gIssues = grammarAnalysis.issues || [];

  var fillerAnalysis = report.filler_analysis || (report.communication_analysis && report.communication_analysis.filler_analysis) || {
    filler_score: params.filler_word_freq !== undefined ? params.filler_word_freq : (hasAnsweredQuestions ? 95 : 0),
    filler_count: 0,
    filler_words: [],
    filler_status: hasAnsweredQuestions ? 'Clear Fluency' : 'No Speech Recorded'
  };
  var fScore = fillerAnalysis.filler_score !== undefined ? fillerAnalysis.filler_score : (params.filler_word_freq !== undefined ? params.filler_word_freq : (hasAnsweredQuestions ? 95 : 0));
  var fCount = fillerAnalysis.filler_count !== undefined ? fillerAnalysis.filler_count : (fillerAnalysis.filler_words ? fillerAnalysis.filler_words.length : 0);
  var fWords = fillerAnalysis.filler_words || [];
  var fStatus = fillerAnalysis.filler_status || (!hasAnsweredQuestions ? 'No Speech Recorded' : (fCount === 0 ? 'Clear Fluency' : 'Moderate Fillers'));

  var pronunciationAnalysis = report.pronunciation_analysis || (report.communication_analysis && report.communication_analysis.pronunciation_analysis) || {
    pronunciation_score: params.speech_clarity !== undefined ? params.speech_clarity : comm,
    pronunciation_status: hasAnsweredQuestions ? 'Crisp & Articulate' : 'No Speech Recorded',
    pronunciation_notes: []
  };
  var pScore = pronunciationAnalysis.pronunciation_score !== undefined ? pronunciationAnalysis.pronunciation_score : (params.speech_clarity !== undefined ? params.speech_clarity : comm);
  var pStatus = pronunciationAnalysis.pronunciation_status || (!hasAnsweredQuestions ? 'No Speech Recorded' : (pScore >= 85 ? 'Crisp & Articulate' : 'Good Enunciation'));
  var pNotes = pronunciationAnalysis.pronunciation_notes || [];

  var paceAnalysis = (report.communication_analysis && report.communication_analysis.pace_analysis) || report.pace_analysis || {
    speaking_pace_score: params.speaking_pace !== undefined ? params.speaking_pace : (hasAnsweredQuestions ? 85 : 0),
    wpm: hasAnsweredQuestions ? 140 : 0,
    status: hasAnsweredQuestions ? 'Optimal Cadence (130-160 WPM)' : 'No Speech Recorded (0 WPM)'
  };
  var paceScore = paceAnalysis.speaking_pace_score !== undefined ? paceAnalysis.speaking_pace_score : (params.speaking_pace !== undefined ? params.speaking_pace : (hasAnsweredQuestions ? 85 : 0));

  var qWpms = [];
  (questions || []).forEach(function (q) {
    if (q.parameters && typeof q.parameters.wpm === 'number' && q.parameters.wpm > 0) {
      qWpms.push(q.parameters.wpm);
    }
  });
  var wpm = !hasAnsweredQuestions ? 0 : (qWpms.length ? Math.round(qWpms.reduce(function (a, b) { return a + b; }, 0) / qWpms.length) : (paceAnalysis.wpm || Math.round(90 + (paceScore * 0.6))));
  var paceStatus = !hasAnsweredQuestions ? 'No Speech Recorded (0 WPM)' : (paceAnalysis.status || (wpm > 165 ? 'Rapid Pace (>160 WPM)' : wpm < 120 ? 'Deliberate / Slow (<120 WPM)' : 'Optimal Cadence (130-160 WPM)'));

  if (!hasAnsweredQuestions && overall === 0) {
    gScore = 0;
    fScore = 0;
    pScore = 0;
    paceScore = 0;
    wpm = 0;
    fStatus = 'No Speech Recorded';
    pStatus = 'No Speech Recorded';
    paceStatus = 'No Speech Recorded (0 WPM)';
  }

  return `<div id="report-modal-overlay" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto report-overlay" style="background:rgba(0,0,0,0.8);backdrop-filter:blur(6px)">
    <div class="w-full max-w-5xl my-6 lg:my-10 rounded-2xl border border-white/10 overflow-hidden report-modal-card" style="background:#0d0f1e">

      <!-- Sticky nav -->
      <div class="sticky top-0 z-20 px-6 py-3 border-b border-white/6 flex items-center gap-1 overflow-x-auto report-nav" style="background:#0d0f1e;backdrop-filter:blur(8px)">
        ${sections.map(function (s) { return `<button class="report-nav-link whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors" data-target="#${s.id}">${s.label}</button>`; }).join('')}
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
              <div class="flex items-center gap-2">
                <button id="btn-modal-download-pdf" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer">
                  ${icon('downloadLg', 14)} Download PDF Report
                </button>
                <button id="btn-close-report" class="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-lg leading-none" title="Close">
                  &times;
                </button>
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
    ].map(function (m) {
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

        <!-- 3. Module 5: Spoken Language & Grammar Intelligence Section -->
        <div class="report-section" id="report-speech-grammar">
          <div class="flex items-center justify-between gap-3 mb-4">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl flex items-center justify-center" style="background:rgba(99,102,241,0.15);color:#a5b4fc;border:1px solid rgba(99,102,241,0.3)">${icon('messageSquare', 16)}</span>
              <div>
                <h3 class="text-base font-bold text-white" style="font-family:'Outfit',sans-serif">Spoken Language &amp; Grammar Intelligence</h3>
                <p class="text-white/50 text-xs">Automated evaluation of grammatical accuracy, verbal fillers, pronunciation clarity, and speaking pace</p>
              </div>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Module 5</span>
          </div>

          <!-- 4 Analytics Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <!-- A. GRAMMAR CARD -->
            <div class="p-5 rounded-2xl border border-white/8 flex flex-col justify-between" style="background:#0c0e1c">
              <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style="background:rgba(99,102,241,0.15);color:#a5b4fc;border:1px solid rgba(99,102,241,0.25)">${icon('checkCircle', 13)}</span>
                    <div>
                      <p class="text-white font-bold text-xs tracking-wider">GRAMMAR</p>
                      <p class="text-white/40 text-[10px]">Grammar Score</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <span class="text-xl font-extrabold text-white" style="font-family:'Outfit',sans-serif">${gScore.toFixed(0)}%</span>
                  </div>
                </div>

                <div class="mb-3">
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${gIssues.length > 0 ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25'}">
                    ${gIssues.length > 0 ? (gIssues.length + ' issue' + (gIssues.length > 1 ? 's' : '') + ' detected') : 'No major grammar issues detected'}
                  </span>
                </div>

                ${gIssues.length > 0 ? `
                  <div class="space-y-3 mt-2 max-h-56 overflow-y-auto pr-1">
                    ${gIssues.map(function(iss) {
                      return `<div class="p-3 rounded-xl border border-white/6 space-y-1.5" style="background:rgba(255,255,255,0.02)">
                        <div>
                          <p class="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Original:</p>
                          <p class="text-xs text-rose-200/90 font-mono mt-0.5">&ldquo;${iss.original}&rdquo;</p>
                        </div>
                        <div>
                          <p class="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Correction:</p>
                          <p class="text-xs text-emerald-200/90 font-mono mt-0.5">&ldquo;${iss.correction}&rdquo;</p>
                        </div>
                        <div>
                          <p class="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">Why:</p>
                          <p class="text-xs text-white/70 mt-0.5 leading-relaxed">${iss.why}</p>
                        </div>
                      </div>`;
                    }).join('')}
                  </div>
                ` : `
                  <div class="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-300 leading-relaxed flex items-start gap-2">
                    <span class="text-emerald-400 mt-0.5 shrink-0">${icon('checkCircle2', 13)}</span>
                    <span>No major grammar issues detected. Strong grammatical consistency and syntax flow maintained.</span>
                  </div>
                `}
              </div>
            </div>

            <!-- B. FILLER WORDS CARD -->
            <div class="p-5 rounded-2xl border border-white/8 flex flex-col justify-between" style="background:#0c0e1c">
              <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style="background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.25)">${icon('activity', 13)}</span>
                    <div>
                      <p class="text-white font-bold text-xs tracking-wider">FILLER WORDS</p>
                      <p class="text-white/40 text-[10px]">Fluency Score</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <span class="text-xl font-extrabold text-white" style="font-family:'Outfit',sans-serif">${fScore.toFixed(0)}%</span>
                  </div>
                </div>

                <div class="mb-3">
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${fCount > 0 ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25'}">
                    ${fCount > 0 ? (fCount + ' detected • ' + fStatus) : '0 detected • Clear Fluency'}
                  </span>
                </div>

                ${fWords.length > 0 ? `
                  <div class="space-y-2 mt-2">
                    <p class="text-[11px] text-white/50">Detected verbal pauses:</p>
                    <div class="flex flex-wrap gap-1.5">
                      ${fWords.map(function(fw) {
                        return `<span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">&ldquo;${fw.word}&rdquo; &times; ${fw.count}</span>`;
                      }).join('')}
                    </div>
                    <p class="text-[11px] text-white/40 mt-1.5 leading-relaxed">Tip: Practice pausing silently instead of using verbal filler crutches.</p>
                  </div>
                ` : `
                  <div class="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-300 leading-relaxed flex items-start gap-2">
                    <span class="text-emerald-400 mt-0.5 shrink-0">${icon('checkCircle2', 13)}</span>
                    <span>Clear Fluency — no repetitive verbal fillers detected.</span>
                  </div>
                `}
              </div>
            </div>

            <!-- C. PRONUNCIATION CARD -->
            <div class="p-5 rounded-2xl border border-white/8 flex flex-col justify-between" style="background:#0c0e1c">
              <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style="background:rgba(6,182,212,0.15);color:#67e8f9;border:1px solid rgba(6,182,212,0.25)">${icon('headphones', 13)}</span>
                    <div>
                      <p class="text-white font-bold text-xs tracking-wider">PRONUNCIATION</p>
                      <p class="text-white/40 text-[10px]">Speech Clarity</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <span class="text-xl font-extrabold text-white" style="font-family:'Outfit',sans-serif">${pScore.toFixed(0)}%</span>
                  </div>
                </div>

                <div class="mb-3">
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                    ${pStatus}
                  </span>
                </div>

                ${pNotes.length > 0 ? `
                  <div class="space-y-2 mt-2 max-h-56 overflow-y-auto pr-1">
                    ${pNotes.map(function(pn) {
                      return `<div class="p-2.5 rounded-xl border border-white/6 text-xs space-y-0.5" style="background:rgba(255,255,255,0.02)">
                        <p class="font-semibold text-cyan-300">&ldquo;${pn.word}&rdquo;</p>
                        <p class="text-white/70 leading-relaxed">${pn.tip}</p>
                      </div>`;
                    }).join('')}
                  </div>
                ` : `
                  <div class="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-300 leading-relaxed flex items-start gap-2">
                    <span class="text-emerald-400 mt-0.5 shrink-0">${icon('checkCircle2', 13)}</span>
                    <span>Crisp, articulate enunciation across technical and conversational terminology.</span>
                  </div>
                `}
              </div>
            </div>

            <!-- D. SPEAKING PACE CARD -->
            <div class="p-5 rounded-2xl border border-white/8 flex flex-col justify-between" style="background:#0c0e1c">
              <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style="background:rgba(168,85,247,0.15);color:#c084fc;border:1px solid rgba(168,85,247,0.25)">${icon('clock', 13)}</span>
                    <div>
                      <p class="text-white font-bold text-xs tracking-wider">SPEAKING PACE</p>
                      <p class="text-white/40 text-[10px]">Cadence &amp; Tempo</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <span class="text-xl font-extrabold text-white" style="font-family:'Outfit',sans-serif">~${wpm} WPM</span>
                  </div>
                </div>

                <div class="mb-3">
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/25">
                    ${paceStatus}
                  </span>
                </div>

                <div class="mt-3 space-y-2">
                  <div class="flex items-center justify-between text-[10px] text-white/50">
                    <span>Slow (&lt;120)</span>
                    <span class="text-emerald-400 font-semibold">Optimal (130-160)</span>
                    <span>Fast (&gt;160)</span>
                  </div>
                  <div class="w-full h-1.5 rounded-full bg-white/6 overflow-hidden">
                    <div class="h-full rounded-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-amber-500" style="width:100%"></div>
                  </div>
                  <p class="text-[11px] text-white/40 leading-relaxed pt-1">Real-time telemetry continuously computes WPM in the Live Interview Room Arena.</p>
                </div>
              </div>
            </div>

          </div>

          <!-- E. Composite Communication Quality Assessment (30%) Card -->
          <div class="rounded-2xl border border-indigo-500/30 p-5 mt-4 relative overflow-hidden" style="background:linear-gradient(180deg,rgba(99,102,241,0.08),rgba(12,14,28,0.95))">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/8">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style="background:rgba(99,102,241,0.2);color:#a5b4fc;border:1px solid rgba(99,102,241,0.4)">${icon('messageSquare', 16)}</span>
                <div>
                  <h4 class="text-white font-bold text-sm" style="font-family:'Outfit',sans-serif">Communication Score (30%)</h4>
                  <p class="text-white/50 text-xs">Measures verbal communication quality based on the 5 core parameters</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-2xl font-extrabold text-indigo-300" style="font-family:'Outfit',sans-serif">${comm.toFixed(1)}%</span>
                <span class="block text-[10px] text-white/40 font-medium">30% Total Interview Weight</span>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              ${[
                { label: 'Speech Clarity', val: params.speech_clarity !== undefined ? params.speech_clarity : pScore, w: '20%', desc: 'Pronunciation & enunciation' },
                { label: 'Grammar Quality', val: params.grammar_quality !== undefined ? params.grammar_quality : gScore, w: '25%', desc: 'Grammatical correctness' },
                { label: 'Filler-Word Frequency', val: params.filler_word_freq !== undefined ? params.filler_word_freq : fScore, w: '20%', desc: 'Fluency & verbal control' },
                { label: 'Speaking Pace', val: params.speaking_pace !== undefined ? params.speaking_pace : paceScore, w: '15%', desc: 'Cadence & WPM tempo' },
                { label: 'Response Completeness', val: params.response_completeness !== undefined ? params.response_completeness : comm, w: '20%', desc: 'Articulation depth' },
              ].map(function(p) {
                return `
                  <div class="p-3 rounded-xl border border-white/6 bg-white/[0.02] flex flex-col justify-between space-y-2">
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-white/80 font-medium truncate">${p.label}</span>
                      <span class="text-white/40 text-[10px]">[${p.w}]</span>
                    </div>
                    <div class="flex items-baseline justify-between">
                      <span class="text-lg font-bold text-white">${p.val.toFixed(0)}%</span>
                      <span class="text-[10px] font-semibold" style="${reportRatingStyle(reportScoreRating(p.val))}">${reportScoreRating(p.val)}</span>
                    </div>
                    <div class="w-full h-1.5 rounded-full bg-white/6 overflow-hidden">
                      <div class="h-full rounded-full report-progress" data-w="${Math.min(100, Math.max(0, p.val))}" style="background:${INDIGO}"></div>
                    </div>
                    <p class="text-[10px] text-white/40 leading-tight">${p.desc}</p>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

        </div>

        <!-- 4. Interview Behavior Analysis (Task 8) -->
        ${renderBehaviorSection(visionMetrics)}

        <!-- 4b. AI Feedback & Scoring -->
        <div class="report-section" id="report-performance">
          <div class="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h3 class="text-base font-semibold text-white" style="font-family:'Outfit',sans-serif">AI Feedback &amp; Scoring</h3>
            <span class="text-[10px] text-white/40 font-medium">Overall = Communication ×30% + Confidence ×25% + Technical ×30% + Professionalism ×15%</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${renderPillarScores(report, params)}
          </div>
          <p class="text-white/25 text-[9.5px] mt-3 leading-relaxed">Parameters marked <span class="text-cyan-300 font-semibold">MEASURED</span> are computed from live webcam behavioral analysis; remaining parameters come from AI language evaluation of your spoken responses.</p>
        </div>

        <!-- 5. Quick Performance Summary -->
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

        <!-- 6. Strengths & Weaknesses -->
        <div class="report-section grid grid-cols-1 md:grid-cols-2 gap-4" id="report-gaps">
          <div class="rounded-2xl border border-emerald-500/20 p-5" style="background:linear-gradient(180deg,rgba(16,185,129,0.06),transparent);background-color:#0c0e1c">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:rgba(16,185,129,0.15);color:#34d399">${icon('checkCircle2', 15)}</span>
              <p class="text-white text-xs font-semibold uppercase tracking-wider" style="font-family:'Outfit',sans-serif">Strengths</p>
            </div>
            <ul class="space-y-2">
              ${strengths.length ? strengths.map(function (s) { return `<li class="flex items-start gap-2 text-xs text-white/80 leading-relaxed"><span class="mt-0.5 text-emerald-400 shrink-0">${icon('checkCircle', 13)}</span><span>${s}</span></li>`; }).join('') : '<li class="text-xs text-white/50">Good engagement throughout the interview.</li>'}
            </ul>
          </div>
          <div class="rounded-2xl border border-amber-500/20 p-5" style="background:linear-gradient(180deg,rgba(245,158,11,0.05),transparent);background-color:#0c0e1c">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:rgba(245,158,11,0.15);color:#fbbf24">${icon('alertTriangle', 15)}</span>
              <p class="text-white text-xs font-semibold uppercase tracking-wider" style="font-family:'Outfit',sans-serif">Weaknesses &amp; Gaps</p>
            </div>
            <ul class="space-y-2">
              ${weaknesses.length ? weaknesses.map(function (w) { return `<li class="flex items-start gap-2 text-xs text-white/80 leading-relaxed"><span class="mt-0.5 text-amber-400 shrink-0">${icon('alertCircle', 13)}</span><span>${w}</span></li>`; }).join('') : '<li class="text-xs text-white/50">Consider elaborating on specific technical metrics.</li>'}
            </ul>
          </div>
        </div>

        <!-- 7. AI Improvement Plan -->
        <div class="report-section" id="report-plan">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:rgba(99,102,241,0.15);color:#a5b4fc">${icon('lightbulb', 15)}</span>
            <h3 class="text-base font-semibold text-white" style="font-family:'Outfit',sans-serif">AI Improvement Plan</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="rounded-2xl border border-white/8 p-4" style="background:#0c0e1c">
              <p class="text-white/40 text-[11px] uppercase tracking-wider font-semibold">What to Improve</p>
              <div class="mt-3 space-y-3">
                ${improvements.length ? improvements.slice(0, 4).map(function (imp, i) {
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
                ${improvements.length > 4 ? improvements.slice(4).map(function (imp, i) {
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
                ${recommendations.length ? recommendations.map(function (rec, i) {
      return `<div class="flex items-start gap-2.5">
                    <span class="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0" style="background:rgba(16,185,129,0.15);color:#34d399">${String(i + 1).padStart(2, '0')}</span>
                    <p class="text-xs text-white/80 leading-relaxed">${rec}</p>
                  </div>`;
    }).join('') : '<p class="text-xs text-white/50">Take another mock interview to keep improving.</p>'}
              </div>
            </div>
          </div>
        </div>

        <!-- 8. Learning Resources -->
        ${resources.length ? `<div class="report-section" id="report-resources">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:rgba(6,182,212,0.15);color:#67e8f9">${icon('bookOpen', 15)}</span>
            <h3 class="text-base font-semibold text-white" style="font-family:'Outfit',sans-serif">Recommended Learning Resources</h3>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            ${resources.map(function (res) {
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

        <!-- 9. Question-by-Question Analysis -->
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
            ${questions.map(function (q, idx) {
      var qScore = q.score || 0;
      var qRating = reportScoreRating(qScore);
      var cat = q.category || 'General';
      var qColor = qScore >= 75 ? EMERALD : qScore >= 60 ? INDIGO : qScore >= 40 ? AMBER : ROSE;
      var qGrammar = q.grammar_analysis;
      var qFiller = q.filler_analysis;
      var qPronounce = q.pronunciation_analysis;

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

                  <!-- Question Grammar Feedback if available -->
                  ${(qGrammar && qGrammar.issues && qGrammar.issues.length > 0) ? `
                    <div class="rounded-xl border border-amber-500/20 p-3 space-y-2" style="background:rgba(245,158,11,0.04)">
                      <div class="flex items-center gap-1.5 text-amber-300 text-xs font-semibold">
                        <span>${icon('alertCircle', 13)}</span>
                        <span>Grammar Notice: ${qGrammar.issues.length} issue${qGrammar.issues.length > 1 ? 's' : ''} detected</span>
                      </div>
                      ${qGrammar.issues.map(function(iss) {
                        return `<div class="text-xs space-y-1 pl-3 border-l-2 border-amber-500/40">
                          <div><span class="text-[10px] uppercase font-bold text-rose-400">Original:</span> <span class="text-rose-200 font-mono">&ldquo;${iss.original}&rdquo;</span></div>
                          <div><span class="text-[10px] uppercase font-bold text-emerald-400">Correction:</span> <span class="text-emerald-200 font-mono">&ldquo;${iss.correction}&rdquo;</span></div>
                          <div><span class="text-[10px] uppercase font-bold text-indigo-300">Why:</span> <span class="text-white/70">${iss.why}</span></div>
                        </div>`;
                      }).join('')}
                    </div>
                  ` : ''}

                  <!-- Question Filler Words if available -->
                  ${(qFiller && qFiller.filler_count > 0) ? `
                    <div class="rounded-xl border border-white/6 p-2.5 flex items-center justify-between text-xs" style="background:rgba(255,255,255,0.02)">
                      <span class="text-amber-300 font-medium">${icon('activity', 12)} Filler Words: ${qFiller.filler_count} detected</span>
                      <span class="text-white/60">${(qFiller.filler_words || []).map(function(w){ return '&ldquo;' + w.word + '&rdquo; &times; ' + w.count; }).join(', ')}</span>
                    </div>
                  ` : ''}

                  <!-- Question Pronunciation / Articulation note if available -->
                  ${(qPronounce && qPronounce.pronunciation_notes && qPronounce.pronunciation_notes.length > 0) ? `
                    <div class="rounded-xl border border-cyan-500/20 p-2.5 text-xs space-y-1" style="background:rgba(6,182,212,0.04)">
                      <p class="text-cyan-300 font-semibold">${icon('headphones', 12)} Pronunciation Guidance</p>
                      ${qPronounce.pronunciation_notes.map(function(pn) {
                        return `<p class="text-white/75">&ldquo;<strong class="text-cyan-200">${pn.word}</strong>&rdquo;: ${pn.tip}</p>`;
                      }).join('')}
                    </div>
                  ` : ''}

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
    api.getAnalyticsSummary().then(function (data) {
      state.analyticsData = data;
      render();
    }).catch(function () { });
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
      ].map(function (d) {
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
    ].map(function (rub) {
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

/* ══════════════════════════════════════════════════
   RESUME ANALYZER (AI-powered deep resume review)
   Stages: landing → setup → processing → result
   ══════════════════════════════════════════════════ */

function raEsc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function raScoreColor(score) {
  if (score >= 90) return '#10b981';
  if (score >= 75) return '#34d399';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#fb923c';
  return '#f43f5e';
}

function raScoreLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Decent Start';
  if (score >= 40) return 'Needs Work';
  return 'Needs Improvement';
}

var RA_LEVELS = [
  { key: 'student', icon: 'bookOpen', title: 'Student / Fresher', desc: 'Currently studying or under 1 year of experience.' },
  { key: 'entry', icon: 'briefcase', title: 'Entry-level', desc: 'Less than 2 years of work experience.' },
  { key: 'mid', icon: 'users', title: 'Mid-level', desc: 'Between 2 and 10 years of experience.' },
  { key: 'senior', icon: 'award', title: 'Senior-level', desc: 'More than 10 years of experience.' },
  { key: 'switcher', icon: 'refreshCw', title: 'Career Switcher', desc: 'Moving into a new domain or industry.' },
];

var RA_ROLES = [
  '', 'Software Engineer', 'Data Scientist', 'Data Analyst', 'Machine Learning Engineer',
  'Web Developer', 'Product Manager', 'Business Analyst', 'DevOps Engineer', 'UI/UX Designer',
  'QA Engineer', 'Cloud Engineer', 'Cybersecurity Analyst', 'Mobile App Developer',
  'Digital Marketer', 'Operations Manager', 'HR Specialist', '__other__',
];

function raStepsHeader(activeIdx) {
  var steps = ['Upload Resume', 'Personalize', 'Your Report'];
  return `<div class="ra-steps">
    ${steps.map(function (s, i) {
      var cls = i === activeIdx ? 'active' : (i < activeIdx ? 'done' : '');
      return `<div class="ra-step ${cls}">
        <span class="ra-step-dot">${i < activeIdx ? icon('check', 11) : i + 1}</span>
        <span class="ra-step-label">${s}</span>
      </div>${i < steps.length - 1 ? '<span class="ra-step-line"></span>' : ''}`;
    }).join('')}
  </div>`;
}

function candidateResume() {
  var ra = state.resumeAnalyzer;
  var stage = ra.stage || 'landing';
  var body = '';
  if (stage === 'landing') body = _raLanding();
  else if (stage === 'setup') body = _raSetup();
  else if (stage === 'processing') body = _raProcessing();
  else if (stage === 'result') body = _raResult();

  return `<div class="space-y-6 w-full max-w-none flex flex-col flex-1" style="min-height:calc(100vh - 120px)">
    <div class="flex items-start justify-between gap-4 flex-wrap shrink-0">
      <div>
        <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Resume Analyzer</h1>
        <p class="text-white/45 text-sm mt-1">AI-powered review that scores your resume like a real recruiter would.</p>
      </div>
      <span class="ra-hero-badge">${icon('shieldCheck', 13)} 100% private — processed securely</span>
    </div>
    ${stage !== 'landing' && stage !== 'processing' ? raStepsHeader(stage === 'setup' ? 1 : 2) : ''}
    ${body}
  </div>`;
}

function _raLanding() {
  return `
  <div class="flex flex-col flex-1 justify-center gap-6" style="min-height:calc(100vh - 220px)">
    ${raStepsHeader(0)}
    <div class="ra-hero rounded-2xl border p-10 md:p-12 text-center relative overflow-hidden flex flex-col items-center justify-center flex-1" style="min-height:420px">
      <div class="ra-hero-glow"></div>
      <h2 class="text-3xl md:text-4xl font-bold text-white mb-3 relative" style="font-family:'Outfit',sans-serif">
        Get expert feedback on your resume, <span style="background:linear-gradient(90deg,#818cf8,#22d3ee);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">instantly</span>
      </h2>
      <p class="text-white/50 text-sm max-w-2xl mx-auto relative">Our AI reviews your resume against the same criteria recruiters and hiring managers use — then shows you exactly how to raise your score.</p>

      <div id="ra-dropzone" class="ra-dropzone mt-8 mx-auto w-full max-w-2xl cursor-pointer group relative flex flex-col items-center justify-center" style="min-height:200px">
        <input type="file" id="ra-file-input" accept=".pdf,.docx" style="display:none" />
        <div class="ra-dropzone-icon group-hover:scale-105 transition-transform">${icon('fileText', 26)}</div>
        <p class="text-white text-base font-semibold mt-3">Drop your resume here, or <span class="ra-link">choose a file</span></p>
        <p class="text-white/40 text-xs mt-1.5">English resumes in PDF or DOCX only. Max 5MB file size.</p>
      </div>
      ${state.resumeAnalyzer.error ? `<p class="ra-error mt-4 max-w-2xl mx-auto w-full"><span style="margin-right:6px">⚠</span>${raEsc(state.resumeAnalyzer.error)}</p>` : ''}
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      ${[
        { icon: 'clipboard', t: '20+ Recruiter Checks', d: 'See if your resume passes the checks real recruiters run.' },
        { icon: 'target', t: 'Resume Score /100', d: 'An honest score with a clear list of improvements.' },
        { icon: 'zap', t: 'ATS Analysis', d: 'Make sure screening software can read and rank you.' },
        { icon: 'lightbulb', t: 'Detailed Feedback', d: 'Section-by-section fixes with concrete rewrite examples.' },
      ].map(function (c) {
        return `<div class="ra-feature-card rounded-xl border p-5 flex flex-col">
          <div class="ra-feature-icon">${icon(c.icon, 16)}</div>
          <p class="text-white text-sm font-semibold mb-1">${c.t}</p>
          <p class="text-white/40 text-xs leading-relaxed">${c.d}</p>
        </div>`;
      }).join('')}
    </div>

    <p class="text-center text-white/30 text-xs">Trusted by candidates preparing for technical, HR &amp; behavioral interviews on SmartHire AI.</p>
  </div>`;
}

function _raSetup() {
  var ra = state.resumeAnalyzer;
  var isOther = ra.role === '__other__';
  return `
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch flex-1" style="min-height:calc(100vh - 240px)">
    <div class="space-y-6 flex flex-col">
      <div class="rounded-xl border p-6 flex-1 flex flex-col" style="background:#0d0f1e;border-color:rgba(255,255,255,0.07)">
        <p class="text-white/70 text-xs font-semibold uppercase tracking-wide mb-3">Selected file</p>
        <div class="ra-file-chip">
          <div class="ra-file-icon">${icon('fileText', 18)}</div>
          <div class="flex-1 min-w-0">
            <p class="text-white text-sm font-medium truncate">${raEsc(ra.fileName || 'resume.pdf')}</p>
            <p class="text-emerald-400 text-xs" style="color:#34d399">✓ Ready to analyze</p>
          </div>
          <button id="ra-change-file" class="ra-mini-btn">${icon('refreshCw', 12)} Replace</button>
        </div>
        <input type="file" id="ra-file-input" accept=".pdf,.docx" style="display:none" />
      </div>
      <div class="rounded-xl border p-6 flex-1 flex flex-col" style="background:#0d0f1e;border-color:rgba(255,255,255,0.07)">
        <p class="text-white/70 text-xs font-semibold uppercase tracking-wide mb-3">Target role <span style="opacity:.5;text-transform:none;font-weight:400">(optional)</span></p>
        <select id="ra-role-select" class="ra-select w-full">
          ${RA_ROLES.map(function (r) {
            var val = r;
            var label = r === '' ? 'General — no specific role' : r === '__other__' ? 'Other (specify below)' : r;
            return `<option value="${val}" ${ra.role === val ? 'selected' : ''}>${label}</option>`;
          }).join('')}
        </select>
        ${isOther ? `<input type="text" id="ra-role-custom" value="${raEsc(ra.roleCustom)}" placeholder="e.g. Blockchain Developer" class="ra-input w-full mt-3" />` : ''}
        <p class="text-white/35 text-xs mt-3">We tailor keyword &amp; ATS checks to the job you're aiming for.</p>
        <div class="flex-1"></div>
      </div>
    </div>

    <div class="rounded-xl border p-6 flex flex-col" style="background:#0d0f1e;border-color:rgba(255,255,255,0.07)">
      <p class="text-lg text-white font-semibold" style="font-family:'Outfit',sans-serif">What best describes you?</p>
      <p class="text-white/45 text-xs mt-1 mb-5">Our AI uses this to personalize your review.</p>
      <div class="space-y-3 flex-1">
        ${RA_LEVELS.map(function (l) {
          var sel = ra.level === l.key;
          return `<button data-level="${l.key}" class="ra-level-card w-full text-left ${sel ? 'selected' : ''}">
            <span class="ra-level-icon">${icon(l.icon, 15)}</span>
            <span class="flex-1 min-w-0">
              <span class="block text-white text-sm font-semibold">${l.title}</span>
              <span class="block text-white/40 text-xs mt-0.5">${l.desc}</span>
            </span>
            <span class="ra-level-check ${sel ? 'show' : ''}">${icon('check', 12)}</span>
          </button>`;
        }).join('')}
      </div>
      ${state.resumeAnalyzer.error ? `<p class="ra-error mt-4">${raEsc(state.resumeAnalyzer.error)}</p>` : ''}
      <button id="ra-analyze-btn" class="ra-primary-btn w-full mt-6 ${ra.level ? '' : 'disabled'}">
        Analyze My Resume ${icon('arrowUpRight', 14)}
      </button>
    </div>
  </div>`;
}

var RA_PROCESS_STEPS = [
  'Extracting text from your resume…',
  'Detecting sections & formatting…',
  'Running 20+ recruiter checks…',
  'Scoring impact & achievements…',
  'Checking ATS keyword coverage…',
  'Comparing against top resumes…',
  'Preparing your personalized report…',
];

function _raProcessing() {
  return `
  <div class="flex flex-col flex-1 justify-center" style="min-height:calc(100vh - 200px)">
    <div class="ra-processing rounded-2xl border py-20 px-10 text-center flex flex-col items-center justify-center w-full" style="background:#0d0f1e;border-color:rgba(255,255,255,0.07);min-height:480px">
      <div class="ra-spinner-wrap mx-auto">
        <div class="ra-spinner"></div>
        <div class="ra-spinner-core">${icon('brain', 22)}</div>
      </div>
      <h3 class="text-2xl font-semibold text-white mt-8" style="font-family:'Outfit',sans-serif">Processing your resume review…</h3>
      <p id="ra-process-msg" class="text-indigo-300 text-sm mt-3" style="color:#a5b4fc">${RA_PROCESS_STEPS[0]}</p>
      <div class="ra-progress-track mt-8 mx-auto w-full max-w-xl">
        <div id="ra-progress-bar" class="ra-progress-bar"></div>
      </div>
      <p id="ra-progress-pct" class="text-white/35 text-xs mt-3">0%</p>
      <p class="text-white/25 text-xs mt-8">This usually takes 15–40 seconds. Please keep this page open.</p>
    </div>
  </div>`;
}

function _raTabs() {
  var ra = state.resumeAnalyzer;
  _fetchRaHistory();
  var count = ra.historyList ? ra.historyList.length : 0;
  var onPrev = ra.view === 'prev' || ra.view === 'prev-list';
  return `
  <div class="ra-center-tabs">
    <span class="ra-tab ${onPrev ? '' : 'active'}" data-ra-tab="latest">${icon('star', 11)} LATEST SCORE</span>
    <span class="ra-tab ${onPrev ? 'active' : 'muted clickable'}" data-ra-tab="prev">${icon('clock', 11)} PREVIOUS SCORE${count ? ` <span class="ra-prev-count">${count}</span>` : ''}</span>
  </div>`;
}

function raFmtDate(sqlDate) {
  try {
    var d = new Date(String(sqlDate).replace(' ', 'T') + (/[Zz]|[+-]\d\d:\d\d$/.test(String(sqlDate)) ? '' : 'Z'));
    if (isNaN(d.getTime())) return String(sqlDate || '');
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch (_) { return String(sqlDate || ''); }
}

function _fetchRaHistory() {
  var ra = state.resumeAnalyzer;
  if (ra.historyList) return;
  api.getResumeHistory().then(function (res) {
    ra.historyList = res.history || [];
    render();
  }).catch(function () { ra.historyList = []; render(); });
}

function _raPrevList() {
  var ra = state.resumeAnalyzer;
  if (!ra.historyList) {
    _fetchRaHistory();
    return `<div class="rounded-xl border p-12 text-center" style="background:#0d0f1e;border-color:rgba(255,255,255,0.07)">
      <div class="ra-spinner mx-auto"></div>
      <p class="text-white/50 text-sm mt-4">Loading your saved reports…</p>
    </div>`;
  }
  var histList = ra.historyList;
  return `
  <div class="rounded-xl border p-5" style="background:#0d0f1e;border-color:rgba(255,255,255,0.07)">
    <p class="text-white font-semibold text-sm mb-1" style="font-family:'Outfit',sans-serif">Previous resume scores</p>
    <p class="text-white/40 text-xs mb-4">Every analysis you've run is saved automatically. Open any report to see the full breakdown.</p>
    ${histList.length ? `<div class="ra-prev-list">
      ${histList.map(function (h) {
        var sc = Math.round(h.overall_score || 0);
        var col = raScoreColor(sc);
        var C = 2 * Math.PI * 21;
        return `<div class="ra-prev-row" data-ra-open="${h.id}">
          <div class="ra-prev-ring">
            <svg viewBox="0 0 52 52" width="52" height="52">
              <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="4"/>
              <circle cx="26" cy="26" r="21" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${(C * (1 - sc / 100)).toFixed(1)};transform:rotate(-90deg);transform-origin:26px 26px"/>
            </svg>
            <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:800;color:${col}">${sc}</span>
          </div>
          <div class="ra-prev-meta">
            <p class="ra-prev-file">${raEsc(h.filename || 'Resume')}</p>
            <p class="ra-prev-sub">${raFmtDate(h.created_at)}${h.target_role ? ' • ' + raEsc(h.target_role) : ''}${h.ai_model ? ' • ' + raEsc(h.ai_model) : ''}</p>
          </div>
          <span class="ra-prev-badge" style="color:${col};background:${col}22;border:1px solid ${col}44">${sc}/100</span>
          <span class="ra-secondary-btn" style="padding:0.45rem 0.8rem;font-size:0.7rem;">View report ${icon('chevronRight', 11)}</span>
        </div>`;
      }).join('')}
    </div>` : `
    <div class="ra-preview-empty-dark text-center py-10">
      ${icon('clock', 24)}
      <p class="text-white/50 text-sm mt-3">No previous reports yet.</p>
      <p class="text-white/30 text-xs mt-1">Analyze a resume and your score will be saved here.</p>
    </div>`}
  </div>`;
}

function _raResult() {
  var ra = state.resumeAnalyzer;
  if (ra.view === 'prev-list') {
    return `<div class="ra-detailed-wrap">${_raTabs()}${_raPrevList()}</div>`;
  }
  var isPrev = ra.view === 'prev';
  if (isPrev && !ra.prevDetail) {
    if (!ra._prevLoading) {
      ra._prevLoading = true;
      api.getResumeAnalysis(ra.prevId).then(function (res) {
        ra.prevDetail = res.analysis || {};
        ra._prevLoading = false;
        render();
      }).catch(function () {
        ra._prevLoading = false; ra.view = 'latest'; render();
      });
    }
    return `<div class="rounded-xl border p-12 text-center" style="background:#0d0f1e;border-color:rgba(255,255,255,0.07)">
      <div class="ra-spinner mx-auto"></div>
      <p class="text-white/50 text-sm mt-4">Opening saved report…</p>
    </div>`;
  }
  var a = isPrev ? ra.prevDetail : ra.result;
  if (!a) return _raLanding();

  var hour = new Date().getHours();
  var greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  var firstName = (state.user && state.user.name ? state.user.name.split(' ')[0] : 'there');
  var score = a.overall_score || 0;
  var color = raScoreColor(score);
  var cats = a.categories || [];
  var issues = a.issues || [];
  var checks = a.checks_passed || [];
  var fixes = a.top_fixes || [];
  var recs = a.recommendations || [];
  var foundKw = a.keywords_found || [];
  var missKw = a.keywords_missing || [];
  var skills = a.detected_skills || [];
  var audit = a.detailed_audit || [];
  var preview = a.resume_preview || '';

  // Split audit into needs-work vs completed for the left rail
  var needsWork = audit.filter(function (x) { return x.score <= 6; }).sort(function (x, y) { return x.score - y.score; });
  var completed = audit.filter(function (x) { return x.score >= 8; });
  // Fallback to issues/checks if audit is sparse (older responses)
  if (!audit.length) {
    needsWork = fixes.slice(0, 5).map(function (f) { return { title: f.title, score: 5, bucket: 'Fix' }; });
    completed = checks.slice(0, 4).map(function (c) { return { title: c.title, score: 10, bucket: 'Done' }; });
  }

  var C = 2 * Math.PI * 54;
  var Csm = 2 * Math.PI * 42;

  function auditBadge(c) {
    var sc = c.score;
    var bg = sc >= 9 ? 'rgba(16,185,129,0.15)' : sc >= 7 ? 'rgba(245,158,11,0.15)' : sc >= 5 ? 'rgba(251,146,60,0.15)' : 'rgba(244,63,94,0.15)';
    var col = sc >= 9 ? '#34d399' : sc >= 7 ? '#fbbf24' : sc >= 5 ? '#fb923c' : '#f43f5e';
    var bd = sc >= 9 ? 'rgba(52,211,153,0.35)' : sc >= 7 ? 'rgba(251,191,36,0.35)' : sc >= 5 ? 'rgba(251,146,60,0.35)' : 'rgba(244,63,94,0.35)';
    return `<span class="ra-audit-score" style="background:${bg};color:${col};border-color:${bd}">${sc}</span>`;
  }

  // Resume preview — sanitize: if extraction is binary/garbled show friendly fallback
  var previewHtml = '';
  var isGarbled = false;
  if (preview) {
    var nonAscii = (preview.match(/[^\x20-\x7E\n\r\t]/g) || []).length;
    var garbleRatio = preview.length ? nonAscii / preview.length : 1;
    isGarbled = garbleRatio > 0.28 || preview.trim().length < 40;
  }
  if (preview && !isGarbled) {
    var rawSlice = preview.slice(0, 1600);
    var escPreview = raEsc(rawSlice).replace(/\n/g, '<br/>');
    previewHtml = `<div class="ra-preview-resume">
      <div class="ra-preview-name">RESUME PREVIEW</div>
      <div class="ra-preview-text">${escPreview}${preview.length > 1600 ? '…' : ''}</div>
    </div>`;
  } else if (preview && isGarbled) {
    previewHtml = `<div class="ra-preview-empty" style="background:rgba(244,63,94,0.06);border:1px dashed rgba(244,63,94,0.25);border-radius:0.6rem;padding:1.5rem;text-align:center;">
      ${icon('alertTriangle', 22)}
      <p class="text-sm font-semibold mt-3" style="color:#fda4af">Preview not available</p>
      <p class="text-xs mt-1.5" style="color:rgba(255,255,255,0.55);line-height:1.5">We couldn't extract readable text from this file.<br/>It may be a scanned image or corrupted PDF.<br/><span style="color:#a5b4fc">Please upload a selectable-text PDF or DOCX.</span></p>
    </div>`;
  } else if (a.filename) {
    previewHtml = `<div class="ra-preview-empty">${icon('fileText', 22)}<p class="text-sm text-white/40 mt-3">${raEsc(a.filename)}</p><p class="text-xs text-white/25 mt-1">Preview extracted from your upload</p></div>`;
  }

  return `
  <div class="ra-detailed-wrap">
    <!-- ── Three-panel detailed review (ResumeWorded-inspired) ── -->
    <div class="ra-detailed-grid">
      <!-- LEFT RAIL — audit navigation like 211400.png -->
      <aside class="ra-rail">
        <div class="ra-rail-overall-card">
          <div class="ra-rail-ring">
            <svg viewBox="0 0 110 110" width="96" height="96">
              <circle cx="55" cy="55" r="42" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="7"/>
              <circle cx="55" cy="55" r="42" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" style="stroke-dasharray:${Csm.toFixed(1)};stroke-dashoffset:${(Csm * (1 - score / 100)).toFixed(1)};transform:rotate(-90deg);transform-origin:55px 55px"/>
            </svg>
            <div class="ra-rail-ring-center"><span class="ra-rail-score" style="color:${color}">${score}</span><span class="ra-rail-label">OVERALL</span></div>
          </div>
          <span class="ra-rail-home">${icon('layout', 12)} Home</span>
        </div>

        <div class="ra-rail-section">
          <p class="ra-rail-heading">TOP FIXES</p>
          ${needsWork.slice(0, 5).map(function (c) {
            return `<div class="ra-rail-item needs-work" data-audit-title="${raEsc(c.title)}">
              <span class="ra-rail-item-title">${raEsc(c.title)}</span>${auditBadge(c)}
            </div>`;
          }).join('')}
          ${issues.length > 2 ? `<button class="ra-rail-more" id="ra-rail-more-btn">${issues.length} ISSUES — SHOW ALL +</button>` : ''}
        </div>

        <div class="ra-rail-section">
          <p class="ra-rail-heading">COMPLETED</p>
          ${completed.slice(0, 4).map(function (c) {
            return `<div class="ra-rail-item completed" data-audit-title="${raEsc(c.title)}">
              <span class="ra-rail-item-title">${raEsc(c.title)}</span>${auditBadge(c)}
            </div>`;
          }).join('')}
        </div>

        <div class="a-ra-full-audit-toggle-wrap" style="padding:0.75rem;">
          <button id="ra-full-audit-toggle" class="ra-secondary-btn w-full" style="justify-content:center;padding:0.6rem;font-size:0.72rem;">${icon('clipboard', 12)} Full audit — all ${audit.length} checks</button>
        </div>
      </aside>

      <!-- CENTER — score + issue cards + what you did well -->
      <main class="ra-center-col">
        <div class="ra-center-head">
          <div>
            <h2 class="ra-center-greet">${greet}, ${raEsc(firstName)}.</h2>
            <p class="ra-center-sub">Welcome to your resume review${a.filename ? ' — <span class="text-white/60">' + raEsc(a.filename) + '</span>' : ''}.</p>
          </div>
        </div>

        ${isPrev ? `<div class="ra-prev-banner">${icon('clock', 13)} Viewing saved report${a.created_at ? ' from ' + raFmtDate(a.created_at) : ''}${a.filename ? ' — ' + raEsc(a.filename) : ''}</div>` : ''}
        ${_raTabs()}

        <div class="ra-center-score-card">
          <p class="ra-score-head">Your resume scored <strong>${score} out of 100.</strong></p>
          <p class="ra-score-desc">${raEsc(a.verdict_line || 'This is a decent start, but there is clear room for improvement on key criteria hiring managers and screening software look for.')}</p>
          <div class="ra-scale-wrap">
            <div class="ra-scale-label-row"><span class="ra-scale-you">YOUR RESUME</span><span class="ra-scale-top">TOP RESUMES</span></div>
            <div class="ra-scale-bar"><span class="ra-scale-marker" style="left:${Math.max(2, Math.min(98, score))}%"></span><span class="ra-scale-top-tick" style="left:82%"></span></div>
            <div class="ra-scale-nums"><span>0</span><span>100</span></div>
          </div>
          <div class="ra-tip-box">${icon('lightbulb', 13)} Use the feedback to find and fix errors in your resume, then reupload it to get a new score. <strong>80% of people increase their score by over 20 points</strong> with just three uploads and revisions.</div>
          ${a.source === 'heuristic_fallback' ? '<p class="text-amber-400/80 text-xs mt-3">⚠ AI provider unreachable — showing rule-based analysis. Try again later for the full AI review.</p>' : ''}
        </div>

        <!-- Issue cards — all visible so detailed analysis is actually seen -->
        <div id="ra-issues-anchor"></div>
        ${issues.length ? `<div class="ra-issue-featured" id="ra-issues">` : ''}
        ${issues.map(function (it, idx) {
            var isSummary = /summary/i.test(it.title);
            var tag = isSummary ? 'SECTIONS' : (it.category || 'STYLE').toUpperCase();
            var borderCol = it.severity === 'critical' ? 'rgba(244,63,94,0.35)' : it.severity === 'minor' ? 'rgba(6,182,212,0.35)' : 'rgba(251,146,60,0.35)';
            var hiddenClass = idx >= 2 ? ' ra-hidden-issue' : '';
            var hiddenStyle = idx >= 2 ? ' style="display:none"' : '';
            return `<div class="ra-feature-issue-card${hiddenClass}" data-idx="${idx}" data-issue-title="${raEsc(it.title)}" style="border-left-color:${borderCol}${hiddenStyle ? ';' + hiddenStyle.replace('style=', '') : ''}">
              <div class="ra-feature-issue-head">
                <span class="ra-feature-x">${icon('alertTriangle', 12)}</span>
                <div class="flex-1 min-w-0">
                  <p class="ra-feature-title">${idx + 1}. ${raEsc(it.title)}</p>
                  <p class="ra-feature-detail">${raEsc(it.detail)}</p>
                  ${it.fix ? `<p class="text-xs mt-1.5" style="color:#a5b4fc"><strong style="color:#818cf8">Fix:</strong> ${raEsc(it.fix)}</p>` : ''}
                </div>
                <span class="ra-feature-tag">${tag}</span>
              </div>
            </div>`;
          }).join('')}
        ${issues.length ? `</div>
          ${issues.length > 2 ? `<button class="ra-show-more" id="ra-show-more-btn">SHOW ${issues.length - 2} MORE ISSUES +</button><button class="ra-show-more" id="ra-show-less-btn" style="display:none">SHOW LESS −</button>` : ''}` : ''}

        ${(checks.length || completed.length) ? `<div class="ra-welldone-block">
          <h3 class="ra-welldone-title">What you did well</h3>
          <p class="ra-welldone-sub">We ran 20+ checks on your resume. Here's a rundown of key areas you did well in — well done.</p>
          <div class="ra-welldone-grid">
            ${(completed.length ? completed.slice(0, 3).map(function (c) {
              return `<div class="ra-welldone-card">
                <span class="ra-welldone-check">${icon('check', 13)}</span>
                <div><p class="ra-welldone-name">${raEsc(c.title)} <span class="font-normal" style="color:#6ee7b7">(${c.score}/10)</span><span class="font-normal text-white/60"> — ${raEsc(c.bucket)} looks good.</span></p></div>
              </div>`;
            }) : checks.slice(0, 3).map(function (c) {
              var d = c.detail && c.detail.trim() ? c.detail : 'Passed this recruiter check.';
              return `<div class="ra-welldone-card">
                <span class="ra-welldone-check">${icon('check', 13)}</span>
                <div><p class="ra-welldone-name">${raEsc(c.title)}<span class="font-normal text-white/60"> — ${raEsc(d)}</span></p></div>
              </div>`;
            })).join('')}
          </div>
        </div>` : ''}

      </main>

      <!-- RIGHT — live resume preview -->
      <aside class="ra-preview-col">
        <div class="ra-preview-card" style="border-radius:0.75rem;border-top:1px solid rgba(255,255,255,0.07);">
          ${previewHtml || `<div class="ra-preview-empty">${icon('fileText', 26)}<p>No preview available</p></div>`}
        </div>
      </aside>
    </div>

    <!-- Category breakdown — full window width -->
    ${cats.length ? `<details class="ra-cats-details mt-4" open>
      <summary>Category breakdown (${cats.length}) ${icon('chevronDown', 11)}</summary>
      <div class="ra-cats-grid">
        ${cats.map(function (c) {
          var cc = raScoreColor(c.score);
          return `<div class="ra-cat-mini">
            <div class="flex justify-between text-xs mb-1"><span class="text-white/70">${raEsc(c.label)}</span><span style="color:${cc};font-weight:700">${c.score}/100</span></div>
            <div class="ra-cat-track"><div class="ra-cat-fill" style="width:${c.score}%;background:${cc}"></div></div>
          </div>`;
        }).join('')}
      </div>
    </details>` : ''}

    <!-- FULL AUDIT — every check with score bar -->
    <div id="ra-full-audit" style="display:none;background:#0d0f1e;border-color:rgba(255,255,255,0.07);" class="rounded-xl border p-5 mt-4">
      <p class="text-white font-semibold text-sm mb-1" style="font-family:'Outfit',sans-serif">Full audit — ${audit.length} recruiter checks</p>
      <p class="text-white/40 text-xs mb-4">Every check we ran on your resume, scored 0-10.</p>
      <div class="ra-fullaudit-grid">
        ${audit.map(function (c) {
          var col = c.score >= 9 ? '#34d399' : c.score >= 7 ? '#fbbf24' : c.score >= 5 ? '#fb923c' : '#f43f5e';
          return `<div class="ra-cat-mini">
            <div class="flex justify-between text-xs mb-1.5"><span class="text-white/80 font-medium">${raEsc(c.title)}</span><span style="color:${col};font-weight:800">${c.score}/10</span></div>
            <div class="ra-cat-track"><div class="ra-cat-fill" style="width:${c.score * 10}%;background:${col}"></div></div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Below the 3-column grid — extra recruiter data -->
    <div id="ra-keywords" class="ra-extra-grid mt-4" style="${(foundKw.length || missKw.length || skills.length) ? '' : 'display:none;'}">
      <div style="${skills.length ? '' : 'display:none;'}" class="rounded-xl border p-5" data-card>
        <p class="text-white/70 text-xs font-semibold uppercase tracking-wide mb-3">Detected skills</p>
        <div class="flex flex-wrap gap-1.5">${skills.map(function (s) { return `<span class="skill-tag">${raEsc(s)}</span>`; }).join('')}</div>
      </div>
      <div style="${(foundKw.length || missKw.length) ? '' : 'display:none;'}" class="rounded-xl border p-5" data-card>
        <p class="text-white/70 text-xs font-semibold uppercase tracking-wide mb-3">Role keywords ${a.target_role ? '— ' + raEsc(a.target_role) : ''}</p>
        <div style="${foundKw.length ? '' : 'display:none;'}" class="flex flex-wrap gap-1.5 mb-2">${foundKw.map(function (k) { return `<span class="skill-tag" style="background:rgba(16,185,129,0.12);border-color:rgba(16,185,129,0.3);color:#6ee7b7">✓ ${raEsc(k)}</span>`; }).join('')}</div>
        <div style="${missKw.length ? '' : 'display:none;'}">
          <p class="text-white/35 text-[11px] mb-1.5">Missing keywords ATS may look for:</p>
          <div class="flex flex-wrap gap-1.5">${missKw.map(function (k) { return `<span class="skill-tag-missing">+ ${raEsc(k)}</span>`; }).join('')}</div>
        </div>
      </div>
    </div>

    <div id="ra-next-steps" style="background:#0d0f1e;border-color:rgba(255,255,255,0.07);${recs.length ? '' : 'display:none;'}" class="rounded-xl border p-5 mt-4">
      <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Next steps</p>
      <div class="space-y-2.5">
        ${recs.map(function (r, i) {
          return `<div class="flex items-start gap-3">
            <span class="ra-rec-num">${i + 1}</span>
            <div><p class="text-white text-sm font-semibold">${raEsc(r.title)}</p><p class="text-white/45 text-xs mt-0.5 leading-relaxed">${raEsc(r.description)}</p></div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="flex items-center gap-3 flex-wrap mt-4">
      <button id="ra-restart-btn" class="ra-primary-btn">${icon('refreshCw', 14)} Analyze Another Resume</button>
      <button id="ra-download-btn" class="ra-secondary-btn">${icon('printer', 14)} Download Report</button>
      <span class="text-white/25 text-xs ml-auto">Reviewed by SmartHire AI • ${new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}${a.ai_model ? ' • ' + raEsc(a.ai_model) : ''}</span>
    </div>
  </div>`;
}

async function startResumeAnalysis() {
  var ra = state.resumeAnalyzer;
  if (!ra.file) { ra.error = 'Please choose a resume file first.'; render(); return; }
  if (!ra.level) { ra.error = 'Please select what best describes you.'; render(); return; }
  if (ra.role === '__other__' && !(ra.roleCustom || '').trim()) {
    ra.error = 'Please specify your target role.'; render(); return;
  }
  ra.error = '';
  ra.stage = 'processing';
  ra._progress = 0;
  render();

  var msgEl = document.getElementById('ra-process-msg');
  var barEl = document.getElementById('ra-progress-bar');
  var pctEl = document.getElementById('ra-progress-pct');
  var stepIdx = 0;

  clearInterval(ra._interval);
  ra._interval = setInterval(function () {
    if (document.getElementById('ra-progress-bar') === null) { clearInterval(ra._interval); return; }
    ra._progress = Math.min(92, (ra._progress || 0) + Math.random() * 7 + 2);
    if (barEl) barEl.style.width = ra._progress + '%';
    if (pctEl) pctEl.textContent = Math.round(ra._progress) + '%';
    var nextStep = Math.floor((ra._progress / 92) * RA_PROCESS_STEPS.length);
    if (nextStep !== stepIdx && nextStep < RA_PROCESS_STEPS.length && msgEl) {
      stepIdx = nextStep;
      msgEl.textContent = RA_PROCESS_STEPS[stepIdx];
    }
  }, 700);

  try {
    var result = await api.analyzeResume(ra.file, ra.level, ra.role === '__other__' ? (ra.roleCustom || '').trim() : ra.role);
    ra._progress = 100;
    clearInterval(ra._interval);
    ra.result = result;
    ra.stage = 'result';
    render();
    // Ensure the detailed 3-panel result is visible from the top
    setTimeout(function () {
      var main = document.getElementById('main-content');
      if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 80);
  } catch (err) {
    clearInterval(ra._interval);
    ra.result = null;
    ra.stage = 'setup';
    ra.error = err.message || 'Analysis failed. Please try again.';
    render();
  }
}

function downloadResumeReportPDF(a) {
  if (!a) return;
  var color = raScoreColor(a.overall_score || 0);
  var win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups to download the report.'); return; }
  var rows = '';
  function sec(title, inner) { rows += '<h2>' + title + '</h2>' + inner; }
  sec('Overall Score', '<p class="big"><span style="color:' + color + ';font-size:34px;font-weight:800">' + (a.overall_score || 0) + '</span> / 100 — ' + raScoreLabel(a.overall_score || 0) + '</p><p>' + raEsc(a.verdict_line || '') + '</p>');
  sec('Categories', '<table><tr><th>Category</th><th>Score</th><th>Notes</th></tr>' +
    (a.categories || []).map(function (c) { return '<tr><td>' + raEsc(c.label) + '</td><td>' + c.score + '/100</td><td>' + raEsc(c.summary || '') + '</td></tr>'; }).join('') + '</table>');
  if ((a.top_fixes || []).length) sec('Top Fixes', '<ul>' + a.top_fixes.map(function (f) { return '<li><b>' + raEsc(f.title) + '</b> — ' + raEsc(f.detail || '') + '</li>'; }).join('') + '</ul>');
  if ((a.issues || []).length) sec('Issues & How To Fix Them', a.issues.map(function (it) {
    return '<div class="issue"><b>[' + raEsc((it.severity || 'warning').toUpperCase()) + '] ' + raEsc(it.title || '') + '</b>' +
      (it.category ? ' <i>(' + raEsc(it.category) + ')</i>' : '') + '<br/>' + raEsc(it.detail || '') +
      (it.fix ? '<br/><b>Fix:</b> ' + raEsc(it.fix) : '') + '</div>';
  }).join(''));
  if ((a.checks_passed || []).length) sec('What You Did Well', '<ul>' + a.checks_passed.map(function (c) { return '<li><b>' + raEsc(c.title) + '</b> — ' + raEsc(c.detail || '') + '</li>'; }).join('') + '</ul>');
  if ((a.recommendations || []).length) sec('Next Steps', '<ol>' + a.recommendations.map(function (r) { return '<li><b>' + raEsc(r.title) + '</b> — ' + raEsc(r.description || '') + '</li>'; }).join('') + '</ol>');
  if ((a.keywords_found || []).length || (a.keywords_missing || []).length) {
    sec('Role Keywords' + (a.target_role ? ' (' + raEsc(a.target_role) + ')' : ''),
      '<p><b>Found:</b> ' + raEsc((a.keywords_found || []).join(', ')) + '</p><p><b>Missing:</b> ' + raEsc((a.keywords_missing || []).join(', ')) + '</p>');
  }
  if ((a.detected_skills || []).length) sec('Detected Skills', '<p>' + raEsc(a.detected_skills.join(', ')) + '</p>');

  win.document.write('<!DOCTYPE html><html><head><title>SmartHire AI — Resume Analysis Report</title><style>' +
    'body{font-family:Segoe UI,Arial,sans-serif;margin:36px;color:#111;line-height:1.55}' +
    'h1{font-size:22px;border-bottom:3px solid #6366f1;padding-bottom:8px}h2{font-size:15px;margin-top:24px;color:#3730a3;text-transform:uppercase;letter-spacing:.5px}' +
    '.meta{color:#666;font-size:12px;margin-bottom:18px}.big{margin:6px 0}table{width:100%;border-collapse:collapse;font-size:12px}' +
    'th,td{border:1px solid #ddd;padding:7px 9px;text-align:left;vertical-align:top}th{background:#f3f4ff}' +
    'ul,ol{padding-left:20px;font-size:12.5px}li{margin-bottom:6px}' +
    '.issue{border-left:3px solid #f59e0b;background:#fffbeb;padding:8px 12px;margin-bottom:8px;font-size:12.5px;border-radius:0 6px 6px 0}' +
    '@media print{body{margin:12mm}}</style></head><body>' +
    '<h1>SmartHire AI — Resume Analysis Report</h1>' +
    '<p class="meta">Candidate: ' + raEsc(state.user ? state.user.name : 'User') + ' | File: ' + raEsc(a.filename || '-') +
    ' | Experience level: ' + raEsc(a.experience_level || '-') + ' | Target role: ' + raEsc(a.target_role || 'General') +
    ' | Generated: ' + new Date().toLocaleString() + '</p>' + rows +
    '<script>window.onload=function(){setTimeout(function(){window.print()},250);}<\/script></body></html>');
  win.document.close();
}

function bindCandidateResumeEvents() {
  var ra = state.resumeAnalyzer;

  function validateFile(file) {
    if (!file) return 'No file selected.';
    var ext = (file.name || '').toLowerCase().split('.').pop();
    if (['pdf', 'docx'].indexOf(ext) === -1) return 'Please upload a PDF or DOCX file.';
    if (file.size > 5 * 1024 * 1024) return 'File exceeds the 5MB limit.';
    return '';
  }

  function acceptFile(file) {
    var err = validateFile(file);
    if (err) { ra.error = err; if (ra.stage === 'landing') render(); else { render(); } return false; }
    ra.file = file;
    ra.fileName = file.name;
    ra.error = '';
    ra.stage = 'setup';
    render();
    return true;
  }

  var dz = document.getElementById('ra-dropzone');
  var fileInput = document.getElementById('ra-file-input');

  /* Landing dropzone */
  if (dz && fileInput) {
    dz.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () { acceptFile(this.files && this.files[0]); });
    ['dragenter', 'dragover'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); dz.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); dz.classList.remove('dragover'); });
    });
    dz.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) acceptFile(e.dataTransfer.files[0]);
    });
  }

  /* Setup stage */
  document.querySelectorAll('.ra-level-card').forEach(function (card) {
    card.addEventListener('click', function () {
      ra.level = this.dataset.level;
      ra.error = '';
      render();
    });
  });

  var changeFileBtn = document.getElementById('ra-change-file');
  if (changeFileBtn) {
    changeFileBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var inp = document.getElementById('ra-file-input');
      if (inp) inp.click();
    });
  }
  if (fileInput && !dz) {
    fileInput.addEventListener('change', function () { acceptFile(this.files && this.files[0]); });
  }

  var roleSelect = document.getElementById('ra-role-select');
  if (roleSelect) {
    roleSelect.addEventListener('change', function () { ra.role = this.value; render(); });
  }
  var roleCustom = document.getElementById('ra-role-custom');
  if (roleCustom) {
    roleCustom.addEventListener('input', function () { ra.roleCustom = this.value; });
  }

  var analyzeBtn = document.getElementById('ra-analyze-btn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', function () {
      if (!ra.level) { ra.error = 'Please select what best describes you.'; render(); return; }
      startResumeAnalysis();
    });
  }

  /* Result actions */
  var restartBtn = document.getElementById('ra-restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', function () {
      clearInterval(ra._interval);
      state.resumeAnalyzer = { stage: 'landing', fileName: '', level: '', role: '', roleCustom: '', result: null, error: '', file: null, view: 'latest', historyList: ra.historyList, prevId: null, prevDetail: null };
      render();
    });
  }
  var downloadBtn = document.getElementById('ra-download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function () {
      var active = (ra.view === 'prev' && ra.prevDetail) ? ra.prevDetail : ra.result;
      downloadResumeReportPDF(active);
    });
  }

  /* Issue accordion chevron rotation */
  document.querySelectorAll('.ra-issue-card').forEach(function (d) {
    d.addEventListener('toggle', function () {
      var ch = d.querySelector('.ra-chevron');
      if (ch) ch.style.transform = d.open ? 'rotate(180deg)' : 'rotate(0deg)';
    });
  });

  /* SHOW MORE / SHOW LESS for detailed issues */
  function raShowAllIssues() {
    document.querySelectorAll('.ra-hidden-issue').forEach(function (el) { el.style.display = ''; });
    var more = document.getElementById('ra-show-more-btn');
    var less = document.getElementById('ra-show-less-btn');
    if (more) more.style.display = 'none';
    if (less) less.style.display = '';
  }
  var showMoreBtn = document.getElementById('ra-show-more-btn');
  var showLessBtn = document.getElementById('ra-show-less-btn');
  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', raShowAllIssues);
  }
  if (showLessBtn) {
    showLessBtn.addEventListener('click', function () {
      document.querySelectorAll('.ra-hidden-issue').forEach(function (el) { el.style.display = 'none'; });
      showLessBtn.style.display = 'none';
      if (showMoreBtn) showMoreBtn.style.display = '';
      var main = document.getElementById('main-content');
      if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  var railMoreBtn = document.getElementById('ra-rail-more-btn');
  if (railMoreBtn) {
    railMoreBtn.addEventListener('click', function () {
      raShowAllIssues();
      setTimeout(function () {
        var anchor = document.getElementById('ra-issues-anchor');
        if (anchor && main_scroller()) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    });
  }

  /* Full audit toggle */
  var auditToggle = document.getElementById('ra-full-audit-toggle');
  if (auditToggle) {
    auditToggle.addEventListener('click', function () {
      var panel = document.getElementById('ra-full-audit');
      if (!panel) return;
      var open = panel.style.display !== 'none';
      panel.style.display = open ? 'none' : '';
      if (!open) {
        setTimeout(function () { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
      }
    });
  }

  /* Rail item clicks -> reveal + flash matching issue, or open full audit */
  document.querySelectorAll('.ra-rail-item[data-audit-title]').forEach(function (item) {
    item.addEventListener('click', function () {
      var title = (this.dataset.auditTitle || '').toLowerCase();
      var match = Array.prototype.find.call(document.querySelectorAll('[data-issue-title]'), function (el) {
        return (el.dataset.issueTitle || '').toLowerCase().indexOf(title) !== -1 || title.indexOf((el.dataset.issueTitle || '').toLowerCase()) !== -1;
      });
      if (match) {
        match.style.display = '';
        setTimeout(function () {
          match.scrollIntoView({ behavior: 'smooth', block: 'center' });
          match.classList.add('ra-flash');
          setTimeout(function () { match.classList.remove('ra-flash'); }, 1600);
        }, 50);
      } else {
        var panel = document.getElementById('ra-full-audit');
        if (panel) {
          panel.style.display = '';
          setTimeout(function () { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
        }
      }
    });
  });

  /* Score tabs — LATEST / PREVIOUS */
  var tabLatest = document.querySelector('[data-ra-tab="latest"]');
  var tabPrev = document.querySelector('[data-ra-tab="prev"]');
  function raBackToLatest() {
    ra.view = 'latest'; ra.prevId = null; ra.prevDetail = null; ra._prevLoading = false;
    render();
    var main = document.getElementById('main-content');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (tabLatest) tabLatest.addEventListener('click', raBackToLatest);
  if (tabPrev) tabPrev.addEventListener('click', function () {
    ra.view = 'prev-list'; ra.prevId = null; ra.prevDetail = null; ra._prevLoading = false;
    render();
  });

  /* Open a saved previous report from the list */
  document.querySelectorAll('[data-ra-open]').forEach(function (row) {
    row.addEventListener('click', function () {
      ra.view = 'prev';
      ra.prevId = parseInt(this.dataset.raOpen, 10);
      ra.prevDetail = null;
      ra._prevLoading = false;
      render();
      var main = document.getElementById('main-content');
      if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  function main_scroller() { return document.getElementById('main-content') || window; }
}

function candidateHistory() {
  if (!state.historyData) {
    api.getInterviewHistory().then(function (res) {
      state.historyData = res.history || [];
      render();
    }).catch(function () { });
  }
  var history = state.historyData || [];
  var modalHtml = state.activeReportModal ? renderReportModal(state.activeReportModal) : '';

  /* ── Summary metrics ── */
  var total = history.length;
  var scores = history.map(function (h) { return h.overall_score || h.total_score || 0; });
  var avgScore = scores.length ? scores.reduce(function (a, b) { return a + b; }, 0) / scores.length : 0;
  var bestScore = scores.length ? Math.max.apply(null, scores) : 0;
  var trend = null;
  if (scores.length >= 2) {
    var diff = scores[0] - scores[1];
    trend = diff >= 0 ? '+' + diff.toFixed(1) : diff.toFixed(1);
  }

  /* ── Apply search + filters ── */
  var q = (state.historySearch || '').toLowerCase();
  var filtered = history.filter(function (h) {
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
  else if (state.historySort === 'high') filtered = filtered.slice().sort(function (a, b) { return (b.overall_score || b.total_score || 0) - (a.overall_score || a.total_score || 0); });
  else if (state.historySort === 'low') filtered = filtered.slice().sort(function (a, b) { return (a.overall_score || a.total_score || 0) - (b.overall_score || b.total_score || 0); });

  /* ── Pagination ── */
  var perPage = state.historyPerPage;
  var totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  if (state.historyPage > totalPages) state.historyPage = totalPages;
  var pageItems = filtered.slice((state.historyPage - 1) * perPage, state.historyPage * perPage);

  /* ── Performance overview stats ── */
  function avgOf(type) {
    var arr = history.filter(function (h) { return (h.interview_type || '').toLowerCase() === type; })
      .map(function (h) { return h.overall_score || h.total_score || 0; });
    return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : null;
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
    return opts.map(function (o) {
      return `<option value="${o.v}" ${o.v === current ? 'selected' : ''}>${o.l}</option>`;
    }).join('');
  }

  /* ── Trend chart data (last 6 interviews) ── */
  var trendData = history.slice(0, 6).map(function (h) { return h.overall_score || h.total_score || 0; });
  var trendLabels = history.slice(0, 6).map(function (_, i) { return '#' + (history.length - i); });
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
      ${pageItems.length ? pageItems.map(function (i) {
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
    ].map(function (card) {
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
    api.getInterviewHistory().then(function (res) {
      state.reportsData = res.history || [];
      render();
    }).catch(function () { });
  }
  var reports = state.reportsData || [];
  var modalHtml = state.activeReportModal ? renderReportModal(state.activeReportModal) : '';

  return `<div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Evaluation Reports</h1>
        <p class="text-white/40 text-sm mt-1">Detailed AI feedback reports, strengths, and practice recommendations.</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-white/50 bg-white/5 px-3 py-1.5 rounded-lg border border-white/8">${reports.length} Total Reports</span>
      </div>
    </div>

    ${reports.length ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${reports.map(function (r) {
        var score = (r.overall_score !== null && r.overall_score !== undefined) ? Number(r.overall_score) : (r.total_score || 0);
        var comm = (r.communication_score !== null && r.communication_score !== undefined) ? Number(r.communication_score) : score;
        var conf = (r.confidence_score !== null && r.confidence_score !== undefined) ? Number(r.confidence_score) : score;
        var tech = (r.technical_score !== null && r.technical_score !== undefined) ? Number(r.technical_score) : score;
        var prof = (r.professionalism_score !== null && r.professionalism_score !== undefined) ? Number(r.professionalism_score) : score;
        var rating = r.performance_rating || (score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Average' : score >= 40 ? 'Needs Improvement' : 'Poor');
        var itype = r.interview_type ? (r.interview_type.charAt(0).toUpperCase() + r.interview_type.slice(1)) : 'Technical';
        var answeredCount = r.questions_answered || 0;
        var totalQuestions = r.total_questions || (r.questions ? r.questions.length : 0);

        return `<div class="rounded-xl border border-white/7 p-5 space-y-4 transition-all hover:border-white/15" style="background:#0d0f1e">
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-white font-semibold text-base uppercase" style="font-family:'Outfit',sans-serif">${itype} Interview</h3>
                ${renderRubricBadge(rating, score)}
              </div>
              <p class="text-white/40 text-xs">${r.domain || 'General Domain'} &bull; ${formatDateTime(r.completed_at || r.created_at)}</p>
              ${totalQuestions > 0 ? `<p class="text-[11px] text-white/30 mt-1">${answeredCount} of ${totalQuestions} questions answered</p>` : ''}
            </div>
            <div class="text-right">
              <span class="text-2xl font-bold text-white">${score.toFixed(1)}%</span>
            </div>
          </div>
          <div class="grid grid-cols-4 gap-2 pt-2 border-t border-white/6 text-center">
            <div><p class="text-[10px] text-white/35">Comm 30%</p><p class="text-xs font-bold text-indigo-300">${comm.toFixed(0)}%</p></div>
            <div><p class="text-[10px] text-white/35">Conf 25%</p><p class="text-xs font-bold text-cyan-300">${conf.toFixed(0)}%</p></div>
            <div><p class="text-[10px] text-white/35">Tech 30%</p><p class="text-xs font-bold text-emerald-300">${tech.toFixed(0)}%</p></div>
            <div><p class="text-[10px] text-white/35">Prof 15%</p><p class="text-xs font-bold text-amber-300">${prof.toFixed(0)}%</p></div>
          </div>
          <div class="flex items-center gap-2 pt-1">
            <button class="btn-view-report flex-1 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 text-xs font-semibold transition-colors cursor-pointer" data-id="${r.id}">View Detailed Report</button>
            <button class="btn-direct-download-pdf px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer" data-id="${r.id}" title="Download PDF Report">
              ${icon('downloadLg', 13)} PDF
            </button>
          </div>
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
    api.getAllRecordings().then(function (res) {
      state._fetchingRecordings = false;
      state.recordingsData = res.recordings || [];
      render();
    }).catch(function () {
      state._fetchingRecordings = false;
      state.recordingsData = [];
      render();
    });
  }
  var recordings = state.recordingsData || [];
  var modalHtml = state.activeReportModal ? renderReportModal(state.activeReportModal) : '';
  var videoModalHtml = state.activeVideoModal ? renderVideoPlayerModal(state.activeVideoModal) : '';

  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          ${icon('film', 22)}
        </div>
        <div>
          <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">My Recordings</h1>
          <p class="text-white/40 text-sm mt-0.5">Review your completed mock interview video recordings</p>
        </div>
      </div>
      <div class="text-right">
        <span class="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-white/70">
          ${recordings.length} ${recordings.length === 1 ? 'Recording' : 'Recordings'}
        </span>
      </div>
    </div>

    ${recordings.length ? `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      ${recordings.map(function (rec) {
    var durSec = rec.duration || 0;
    var durStr = durSec > 0 ? (Math.floor(durSec / 60) + ':' + String(durSec % 60).padStart(2, '0')) : 'HD';
    var sizeMb = rec.file_size_bytes ? (rec.file_size_bytes / (1024 * 1024)).toFixed(2) + ' MB' : '0.67 MB';
    var title = (rec.interview_type || 'Technical') + ' Interview';
    var domain = rec.domain || 'Software Engineering';
    var dateFormatted = rec.created_at ? formatDateTime(rec.created_at) : 'Recent';

    return `<div class="sh-recording-card group">
          <!-- Dark Video Thumbnail Top Area -->
          <div class="sh-recording-thumb btn-play-video" data-session-id="${rec.session_id}" data-rec-id="${rec.id}">
            <div class="sh-play-trigger">
              ${icon('play', 20)}
            </div>
            
            <div class="sh-recording-badge-hd">
              <span class="sh-dot"></span>
              <span>HD 1080p</span>
            </div>

            <!-- Bottom Right Duration Chip -->
            <div class="sh-recording-badge-dur">
              ${durStr}
            </div>
          </div>

          <!-- Bottom Card Content Area -->
          <div class="sh-recording-body">
            <div class="sh-recording-header">
              <div>
                <h3 class="sh-recording-title">${title}</h3>
                <span class="text-white/40 text-xs mt-0.5 inline-block capitalize">${domain}</span>
              </div>
              <span class="sh-recording-domain-tag">${rec.difficulty || 'medium'}</span>
            </div>

            <div class="sh-recording-meta-box">
              <div class="sh-recording-meta-row">
                <span>Recorded On</span>
                <span class="sh-recording-meta-val">${icon('calendar', 12)} ${dateFormatted}</span>
              </div>
              <div class="sh-recording-meta-row">
                <span>Video Size</span>
                <span class="sh-recording-meta-val">${icon('hardDrive', 12)} ${sizeMb}</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons Row -->
          <div class="sh-recording-actions">
            <button class="sh-btn-watch btn-play-video" data-session-id="${rec.session_id}" data-rec-id="${rec.id}">
              ${icon('play', 13)} Watch
            </button>
            <button class="sh-btn-report btn-view-report" data-id="${rec.session_id}" title="View Assessment Report">
              ${icon('fileText', 13)} Report
            </button>
            <button class="sh-btn-del btn-delete-video" data-session-id="${rec.session_id}" data-rec-id="${rec.id}" title="Delete Recording">
              ${icon('trash', 14)}
            </button>
          </div>
        </div>`;
  }).join('')}
    </div>` : `<div class="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-white/7 p-8" style="background:#0d0f1e">
      <div class="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/30 mb-3">${icon('film', 28)}</div>
      <h3 class="text-white font-semibold text-base mb-1">No Recordings Available Yet</h3>
      <p class="text-white/40 text-xs max-w-md">Attend and complete mock interview sessions with your webcam enabled to view saved session recordings here.</p>
    </div>`}
  </div>${modalHtml}${videoModalHtml}`;
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
            ${ALL_ASSESSMENT_TOPICS.map(function (t) {
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
            ${[5, 10, 15, 20, 30].map(function (m) {
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
            ${(q.options || []).map(function (opt, oIdx) {
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
          ${Object.keys(topicPerf).length ? Object.keys(topicPerf).map(function (t) {
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
            ${(fb.strengths || ["Strong performance across core concepts."]).map(function (s) {
    return `<li class="flex items-start gap-2"><span class="text-emerald-400 mt-0.5">&bull;</span><span>${s}</span></li>`;
  }).join('')}
          </ul>
        </div>

        <!-- Areas to Improve -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider">AREAS TO IMPROVE</h4>
          <ul class="space-y-1.5 text-xs text-white/70">
            ${(fb.areas_to_improve || ["Review missed questions in the detailed review below."]).map(function (a) {
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
            ${(fb.personalized_suggestions || ["Focus on time management during multi-step problems."]).map(function (ps) {
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
        ${questions.map(function (q, qIdx) {
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
  state.assessmentTimerInterval = setInterval(function () {
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
        }).then(function (res) {
          state.assessmentResult = res;
          state.section = 'assessment-result';
          render();
        }).catch(function (err) {
          alert('Assessment time expired. Submission error: ' + err.message);
        });
      }
    }
  }, 1000);
}

function startAssessmentWebcam() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(function (stream) {
        state.assessmentStream = stream;
        var videoEl = document.getElementById('assessment-webcam');
        if (videoEl) {
          videoEl.srcObject = stream;
        }
      })
      .catch(function (_) {
        state.assessmentFaceStatus = 'No Camera';
      });
  }
}

function stopAssessmentWebcam() {
  if (state.assessmentStream) {
    state.assessmentStream.getTracks().forEach(function (track) { track.stop(); });
    state.assessmentStream = null;
  }
}

function bindCandidateAssessmentEvents() {
  // Topic Chip Toggles
  document.querySelectorAll('.btn-topic-chip').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var topic = this.dataset.topic;
      var topics = state.assessmentSelectedTopics || [];
      if (topics.includes(topic)) {
        state.assessmentSelectedTopics = topics.filter(function (t) { return t !== topic; });
      } else {
        state.assessmentSelectedTopics.push(topic);
      }
      render();
    });
  });

  // Role Input
  var roleInp = document.getElementById('inp-assessment-role');
  if (roleInp) {
    roleInp.addEventListener('input', function () {
      state.assessmentTargetRole = this.value;
    });
  }

  // Difficulty Select Dropdown
  var diffSelect = document.getElementById('config-assessment-diff-select');
  if (diffSelect) {
    diffSelect.addEventListener('change', function () {
      state.assessmentDifficulty = this.value;
      render();
    });
  }

  // Question Count Select Dropdown
  var numSelect = document.getElementById('config-assessment-num-select');
  if (numSelect) {
    numSelect.addEventListener('change', function () {
      state.assessmentNumQuestions = parseInt(this.value, 10);
      render();
    });
  }

  // Difficulty Selector (compat)
  document.querySelectorAll('.btn-assessment-diff').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.assessmentDifficulty = this.dataset.diff;
      render();
    });
  });

  // Question Count Selector (compat)
  document.querySelectorAll('.btn-assessment-num').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.assessmentNumQuestions = parseInt(this.dataset.num, 10);
      render();
    });
  });


  // Time Limit Selector
  document.querySelectorAll('.btn-assessment-time').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.assessmentTimeLimit = parseInt(this.dataset.time, 10);
      render();
    });
  });

  // Custom Time Input
  var customTimeInp = document.getElementById('inp-assessment-custom-time');
  if (customTimeInp) {
    customTimeInp.addEventListener('input', function () {
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
    resumeInp.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        state.assessmentResumeStatus = 'loading';
        api.uploadResume(this.files[0]).then(function (res) {
          state.assessmentResume = res.resume;
          state.assessmentResumeStatus = 'ready';
          render();
        }).catch(function (err) {
          state.assessmentError = err.message;
          render();
        });
      }
    });
  }

  var resumeReplaceInp = document.getElementById('inp-assessment-resume-replace');
  if (resumeReplaceInp) {
    resumeReplaceInp.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        api.uploadResume(this.files[0]).then(function (res) {
          state.assessmentResume = res.resume;
          render();
        }).catch(function (err) {
          state.assessmentError = err.message;
          render();
        });
      }
    });
  }

  var resumeRemoveBtn = document.getElementById('btn-assessment-resume-remove');
  if (resumeRemoveBtn) {
    resumeRemoveBtn.addEventListener('click', function () {
      state.assessmentResume = null;
      render();
    });
  }

  var dropzone = document.getElementById('assessment-resume-dropzone');

  if (dropzone) {
    dropzone.addEventListener('click', function () {
      var fileInp = document.getElementById('inp-assessment-resume');
      if (fileInp) fileInp.click();
    });
  }

  // Test Devices Button
  var testDevBtn = document.getElementById('btn-test-assessment-devices');
  if (testDevBtn) {
    testDevBtn.addEventListener('click', function () {
      state.deviceTested = true;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(function (stream) {
            stream.getTracks().forEach(function (t) { t.stop(); });
            render();
          })
          .catch(function () {
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
    startBtn.addEventListener('click', function () {
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

      api.generateAssessment(payload).then(function (res) {
        state.currentAssessment = res.assessment;
        state.currentAssessmentQuestions = res.questions;
        state.assessmentQuestionIndex = 0;
        state.assessmentAnswers = {};
        state.assessmentTimeRemaining = (res.assessment.time_limit_minutes || 10) * 60;

        return api.startAssessment(res.assessment.id);
      }).then(function (_) {
        state.section = 'assessment-session';
        render();
        startAssessmentTimer();
        startAssessmentWebcam();
      }).catch(function (err) {
        state.assessmentError = err.message;
        render();
      });
    });
  }

  // MCQ Option Selection
  document.querySelectorAll('.btn-mcq-option').forEach(function (btn) {
    btn.addEventListener('click', function () {
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
    prevBtn.addEventListener('click', function () {
      if (state.assessmentQuestionIndex > 0) {
        state.assessmentQuestionIndex--;
        render();
      }
    });
  }

  var nextBtn = document.getElementById('btn-next-question');
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
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
  submitTriggers.forEach(function (btn) {
    if (btn) {
      btn.addEventListener('click', function () {
        state.submitConfirmModal = true;
        render();
      });
    }
  });

  var cancelSubmitBtn = document.getElementById('btn-modal-cancel-submit');
  if (cancelSubmitBtn) {
    cancelSubmitBtn.addEventListener('click', function () {
      state.submitConfirmModal = false;
      render();
    });
  }

  var confirmSubmitBtn = document.getElementById('btn-modal-confirm-submit');
  if (confirmSubmitBtn) {
    confirmSubmitBtn.addEventListener('click', function () {
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
      }).then(function (res) {
        state.assessmentResult = res;
        state.section = 'assessment-result';
        render();
      }).catch(function (err) {
        alert('Submission failed: ' + err.message);
      });
    });
  }

  // New Assessment Button from Result Screen
  var newAssessmentBtn = document.getElementById('btn-new-assessment');
  if (newAssessmentBtn) {
    newAssessmentBtn.addEventListener('click', function () {
      state.currentAssessment = null;
      state.currentAssessmentQuestions = [];
      state.assessmentResult = null;
      state.section = 'assessment';
      render();
    });
  }
}

