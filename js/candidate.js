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
  var history = data.history || [];
  var modalHtml = state.activeReportModal ? renderReportModal(state.activeReportModal) : '';

  return `<div class="space-y-6">
    <div><h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Good day, ${userName} 👋</h1><p class="text-white/40 text-sm mt-1">Welcome to your SmartHire AI evaluation dashboard.</p></div>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      ${statCard(icon('play', 18), 'Sessions Completed', String(data.sessions_completed), null, INDIGO)}
      ${statCard(icon('star', 18), 'Avg. Score', hasData ? overall.toFixed(1) + '%' : '—', null, CYAN)}
      ${statCard(icon('activity', 18), 'Rating Rubric', data.performance_rating || '—', null, EMERALD)}
      ${statCard(icon('award', 18), 'Top Parameter', data.top_skill || '—', null, AMBER)}
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <div class="flex items-center justify-between mb-4">
          <div><p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Assessment Breakdown</p><p class="text-white/35 text-xs mt-0.5">${hasData ? 'Weighted parameter scores across completed sessions' : 'No evaluation data yet'}</p></div>
          ${hasData ? renderRubricBadge(data.performance_rating, overall) : ''}
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
          <div class="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex justify-between font-medium"><span>90-100%</span><span>Excellent</span></div>
          <div class="p-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex justify-between font-medium"><span>75-89%</span><span>Good</span></div>
          <div class="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 flex justify-between font-medium"><span>60-74%</span><span>Average</span></div>
          <div class="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 flex justify-between font-medium"><span>40-59%</span><span>Needs Imp.</span></div>
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
              <p class="text-white/40 text-xs mt-0.5">${h.domain || 'General Domain'} &bull; ${h.completed_at || 'Recently'}</p>
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
  var devReady = state.deviceTested;

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
            <span class="mic-device-dot ${devReady ? 'ready' : 'warn'}"></span>
            Webcam: <span class="mic-device-label ${devReady ? 'ready' : 'warn'}">${devReady ? 'Ready' : 'Not tested'}</span>
          </span>
          <span class="mic-device-indicator">
            <span class="mic-device-dot ${devReady ? 'ready' : 'warn'}"></span>
            Mic: <span class="mic-device-label ${devReady ? 'ready' : 'warn'}">${devReady ? 'Ready' : 'Not tested'}</span>
          </span>
        </div>
        <button id="btn-test-devices" class="mic-test-btn">${icon('video', 10)} Test Devices</button>
      </div>
      <p id="device-status" class="mic-device-msg" role="status">${devReady ? 'Devices verified successfully.' : 'Test your camera and microphone before starting.'}</p>

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
  var question = session.questions[state.currentQuestionIndex];
  var total = session.questions.length;
  var transcriptText = state.currentTranscript || '';
  return `<div class="max-w-5xl mx-auto space-y-6">
    <div class="flex items-center justify-between"><div><p class="text-white/40 text-xs uppercase tracking-wider">Live ${session.interview.interview_type} interview</p><h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Question ${state.currentQuestionIndex + 1} of ${total}</h1></div><button id="btn-end-session" class="text-xs text-white/50 hover:text-white">End session</button></div>
    <div class="grid grid-cols-2 gap-5"><div class="rounded-xl border border-white/7 overflow-hidden" style="background:#0d0f1e"><video id="candidate-camera" autoplay muted playsinline class="w-full aspect-video object-cover" style="background:#141627"></video><p class="px-4 py-3 text-xs text-emerald-400">Camera and microphone connected</p></div><div class="rounded-xl border border-white/7 p-6 flex flex-col" style="background:#0d0f1e"><div class="flex items-center gap-2 mb-4">${badge(question.category || 'Interview', 'indigo')}${badge(question.difficulty || 'medium', 'amber')}</div><p class="text-white text-lg leading-relaxed flex-1">${question.question_text}</p></div></div>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <p class="text-white/70 text-sm mb-3">Live voice response</p>
      <div id="transcript-box" class="rounded-lg border border-white/6 p-4 min-h-[60px]" style="background:#141627">
        ${transcriptText ? `<p class="text-white/80 text-sm leading-relaxed">${transcriptText}</p>` : `<p class="text-white/25 text-sm italic">Waiting for interviewer...</p>`}
      </div>
      <p id="session-status" class="mt-3 text-xs text-white/40" role="status">${state.sessionMessage || ''}</p>
    </div>
  </div>`;
}

async function speakCurrentQuestion() {
  var session = state.currentInterview;
  if (!session) return;
  stopAutoRecording();
  var question = session.questions[state.currentQuestionIndex];
  var done = false;
  function onStartListening() {
    if (done) return;
    done = true;
    startAutoRecording();
  }

  setSessionStatus('AI interviewer is speaking...', 'text-indigo-300');
  var box = document.getElementById('transcript-box');
  if (box) box.innerHTML = '<p class="text-indigo-300 text-sm animate-pulse">AI interviewer is speaking the question...</p>';

  var fallbackTimeout = setTimeout(onStartListening, 10000);

  try {
    var data = await api.speakInterviewQuestion(session.interview.id, question.id);
    if (state.interviewerAudio) state.interviewerAudio.pause();
    var audio = new Audio('data:' + (data.mime_type || 'audio/wav') + ';base64,' + data.audio_base64);
    state.interviewerAudio = audio;
    audio.onended = function() { clearTimeout(fallbackTimeout); onStartListening(); };
    audio.onerror = function() { clearTimeout(fallbackTimeout); onStartListening(); };
    await audio.play();
  } catch (err) {
    clearTimeout(fallbackTimeout);
    onStartListening();
  }
}

function startAutoRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') return;

  function doStart() {
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
      var s = ev.inputBuffer.getChannelData(0), sum = 0;
      for (var i = 0; i < s.length; i++) sum += s[i] * s[i];
      var vol = Math.sqrt(sum / s.length);
      if (vol > 0.008) { heard = true; silence = 0; } else if (heard) silence++;
      if (heard && silence >= 20) stopAutoRecording();
      if (!heard && Date.now() - started > 7000) stopAutoRecording();
      if (Date.now() - started > 45000) stopAutoRecording();
    };
    state.audioMonitor = { ctx: ctx, src: src, proc: proc, gain: gain };
    state.autoStopFallback = setTimeout(function() { stopAutoRecording(); }, 30000);
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
    var transcript;
    for (var attempt = 0; attempt < 3; attempt++) {
      try {
        var res = await api.transcribeChunk(base64Clean, mimeType);
        transcript = (res.transcript || '').trim();
        break;
      } catch(e) {
        if (attempt < 2) { await new Promise(function(r) { setTimeout(r, 2000); }); } else throw e;
      }
    }

    if (!transcript || transcript.length < 2) {
      setSessionStatus('No speech detected.', 'text-amber-300');
      if (box) box.innerHTML = '<p class="text-amber-300 text-sm">No speech detected. Moving to next question...</p>';
      setTimeout(nextQuestion, 2000);
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
  if (state.currentQuestionIndex < state.currentInterview.questions.length - 1) {
    state.currentQuestionIndex += 1;
    state.currentTranscript = '';
    state.sessionMessage = '';
    render();
  } else {
    stopInterviewDevices();
    state.analyticsData = null;
    state.historyData = null;
    state.reportsData = null;
    state.sessionMessage = 'Interview complete. Total score: ' + (state.currentInterview.interview.total_score || 0) + '%.';
    state.section = 'history';
    render();
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
    var started = await api.startInterview(generated.interview.id);
    state.currentInterview = started;
    state.currentQuestionIndex = 0;
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

async function enableInterviewDevices() {
  if (state.interviewStream) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('This browser does not support camera and microphone access.');
  state.interviewStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: { echoCancellation: true, noiseSuppression: true } });
}

function stopInterviewDevices() {
  if (state.audioMonitor) { try { state.audioMonitor.proc.disconnect(); state.audioMonitor.src.disconnect(); state.audioMonitor.ctx.close(); } catch(e) {} state.audioMonitor = null; }
  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') { try { state.mediaRecorder.stop(); } catch(e) {} }
  state.mediaRecorder = null;
  state.recordedChunks = [];
  if (state.interviewerAudio) { state.interviewerAudio.pause(); state.interviewerAudio = null; }
  if (state.interviewStream) state.interviewStream.getTracks().forEach(function(track) { track.stop(); });
  state.interviewStream = null;
}

function setSessionStatus(message, color) {
  var el = document.getElementById('session-status');
  if (!el) return;
  el.textContent = message;
  el.className = 'mt-3 text-xs ' + (color || 'text-white/40');
}

async function testCandidateDevices() {
  var status = document.getElementById('device-status');
  var button = document.getElementById('btn-test-devices');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    status.textContent = 'This browser does not support camera and microphone testing.';
    status.className = 'mt-3 text-xs text-rose-400';
    state.deviceTested = false;
    return;
  }
  button.disabled = true;
  button.textContent = 'Testing...';
  status.textContent = 'Requesting camera and microphone access...';
  try {
    var stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach(function(track) { track.stop(); });
    status.textContent = 'Camera and microphone are available.';
    status.className = 'mt-3 text-xs text-emerald-400';
    state.deviceTested = true;
    state.configError = '';
    render();
    return;
  } catch (error) {
    state.deviceTested = false;
    status.textContent = error.name === 'NotAllowedError' ? 'Permission was denied. Allow camera and microphone access, then try again.' : 'Unable to access your camera or microphone: ' + error.message;
    status.className = 'mt-3 text-xs text-rose-400';
  } finally {
    button.disabled = false;
    button.textContent = 'Test Devices';
  }
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
  var backToInterviews = document.getElementById('btn-back-to-interviews');
  if (backToInterviews) backToInterviews.addEventListener('click', function() { state.section = 'interviews'; render(); });
  var endSession = document.getElementById('btn-end-session');
  if (endSession) endSession.addEventListener('click', function() { stopInterviewDevices(); state.section = 'interviews'; render(); });

  document.querySelectorAll('.btn-view-report').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var id = this.dataset.id;
      try {
        var report = await api.getInterviewReport(id);
        state.activeReportModal = report;
        render();
      } catch(e) {
        window.alert('Unable to load report: ' + e.message);
      }
    });
  });

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

  var camera = document.getElementById('candidate-camera');
  if (camera && state.interviewStream) camera.srcObject = state.interviewStream;
  if (camera && state.interviewStream) speakCurrentQuestion();
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
  var comm = report.communication_score || report.total_score || 0;
  var conf = report.confidence_score || report.total_score || 0;
  var tech = report.technical_score || report.total_score || 0;
  var prof = report.professionalism_score || report.total_score || 0;
  var overall = report.overall_score || report.total_score || 0;
  var rating = report.performance_rating || reportScoreRating(overall);

  var strengths = report.strengths || [];
  var weaknesses = report.weaknesses || [];
  var improvements = report.improvements || [];
  var recommendations = report.recommendations || [];
  var resources = report.resources || [];
  var questions = report.questions || [];
  var params = report.detailed_parameters || {};

  /* ── Format date ── */
  var dateStr = report.completed_at || report.created_at || '';
  var dateLine = dateStr;
  if (dateStr) {
    try {
      var d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        dateLine = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ', ' +
          d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      }
    } catch(e) {}
  }

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

        <!-- 1. Report header -->
        <div class="report-section" id="report-overview">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button id="report-back" class="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-indigo-300 transition-colors mb-3">${icon('arrowLeft', 13)} Back to Interview History</button>
              <p class="text-xs uppercase tracking-widest text-indigo-400 font-semibold">AI Assessment Report</p>
              <h2 class="text-2xl lg:text-3xl font-bold text-white mt-1" style="font-family:'Outfit',sans-serif">${itype} Interview</h2>
              <p class="text-white/40 text-sm mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="capitalize">${itype}</span><span class="text-white/20">&bull;</span>
                <span>${report.domain || 'General'}</span><span class="text-white/20">&bull;</span>
                <span>${diff}</span><span class="text-white/20">&bull;</span>
                <span class="inline-flex items-center gap-1">${icon('calendar', 12)} ${dateLine}</span>
              </p>
            </div>
            <div class="text-right shrink-0">
              ${renderRubricBadge(rating, overall)}
              <p class="text-3xl font-extrabold text-white mt-2" style="font-family:'Outfit',sans-serif">${overall.toFixed(1)}%</p>
              <p class="text-white/40 text-xs">Overall Score</p>
            </div>
          </div>
        </div>

        <!-- 2. Executive summary -->
        <div class="report-section grid grid-cols-1 md:grid-cols-5 gap-4" id="report-overview2">
          <div class="md:col-span-2 rounded-xl border border-white/7 p-6 flex flex-col items-center justify-center text-center" style="background:#141627">
            ${renderScoreRing(overall, rating)}
            <p class="text-white/60 text-sm mt-3">Overall Performance</p>
          </div>
          <div class="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${[
              { label: 'Communication', val: comm, color: INDIGO, icon: icon('messageSquare', 16), w: '30%' },
              { label: 'Confidence', val: conf, color: CYAN, icon: icon('activity', 16), w: '25%' },
              { label: 'Technical Relevance', val: tech, color: EMERALD, icon: icon('cpu', 16), w: '30%' },
              { label: 'Professionalism', val: prof, color: AMBER, icon: icon('briefcase', 16), w: '15%' },
            ].map(function(m) {
              return `<div class="p-4 rounded-xl border border-white/7" style="background:#0d0f1e">
                <div class="flex items-center gap-2 mb-2">
                  <span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style="background:${m.color}1f;color:${m.color}">${m.icon}</span>
                  <p class="text-white/70 text-xs font-medium">${m.label} <span class="text-white/30">(${m.w})</span></p>
                </div>
                <p class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">${m.val.toFixed(1)}%</p>
                <div class="w-full h-1.5 rounded-full bg-white/6 overflow-hidden mt-2">
                  <div class="h-full rounded-full report-progress" data-w="${Math.min(100, Math.max(0, m.val))}" style="background:${m.color}"></div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- 3. Performance Breakdown -->
        <div class="report-section" id="report-performance">
          <h3 class="text-lg font-semibold text-white mb-4" style="font-family:'Outfit',sans-serif">Performance Breakdown</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${dimGroups.map(function(g) {
              var fallback = fallbackFor(g);
              var items = g.keys.map(function(k) { return { name: prettyParam(k), val: params[k] !== undefined ? params[k] : fallback }; });
              return `<div class="rounded-xl border border-white/7 p-4" style="background:#141627">
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

        <!-- 4. Quick performance summary -->
        <div class="report-section rounded-xl border border-white/7 p-5" style="background:#141627">
          <p class="text-white font-semibold text-sm mb-3" style="font-family:'Outfit',sans-serif">Performance Summary</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <p class="text-white/40 text-[11px]">Strongest Area</p>
              <p class="text-white text-sm font-semibold mt-1">${strongest ? prettyParam(strongest.key) : '—'}</p>
              <p class="text-emerald-400 text-xs font-bold mt-0.5">${strongest ? strongest.val.toFixed(0) + '%' : '—'}</p>
            </div>
            <div class="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
              <p class="text-white/40 text-[11px]">Needs Most Attention</p>
              <p class="text-white text-sm font-semibold mt-1">${weakest ? prettyParam(weakest.key) : '—'}</p>
              <p class="text-rose-400 text-xs font-bold mt-0.5">${weakest ? weakest.val.toFixed(0) + '%' : '—'}</p>
            </div>
            <div class="p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5">
              <p class="text-white/40 text-[11px]">Overall Performance</p>
              <p class="text-white text-sm font-semibold mt-1">${overall.toFixed(1)}%</p>
              <p class="text-indigo-300 text-xs font-bold mt-0.5 capitalize">${rating}</p>
            </div>
            <div class="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <p class="text-white/40 text-[11px]">Improvement Potential</p>
              <p class="text-white text-sm font-semibold mt-1">${overall < 60 ? 'High' : overall < 75 ? 'Moderate' : 'Low'}</p>
              <p class="text-amber-400 text-xs font-bold mt-0.5">${overall < 60 ? 'Focus needed' : overall < 75 ? 'Keep growing' : 'Great shape'}</p>
            </div>
          </div>
        </div>

        <!-- 5. Strengths & Weaknesses -->
        <div class="report-section grid grid-cols-1 md:grid-cols-2 gap-4" id="report-gaps">
          <div class="rounded-xl border border-emerald-500/20 p-5" style="background:linear-gradient(180deg,rgba(16,185,129,0.06),transparent);background-color:#0d0f1e">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:rgba(16,185,129,0.15);color:#34d399">${icon('checkCircle2', 15)}</span>
              <p class="text-white text-sm font-semibold uppercase tracking-wider" style="font-family:'Outfit',sans-serif">Strengths</p>
            </div>
            <ul class="space-y-2">
              ${strengths.length ? strengths.map(function(s) { return `<li class="flex items-start gap-2 text-sm text-white/80 leading-relaxed"><span class="mt-1.5 text-emerald-400">${icon('checkCircle', 13)}</span><span>${s}</span></li>`; }).join('') : '<li class="text-sm text-white/50">Good engagement throughout the interview.</li>'}
            </ul>
          </div>
          <div class="rounded-xl border border-amber-500/20 p-5" style="background:linear-gradient(180deg,rgba(245,158,11,0.05),transparent);background-color:#0d0f1e">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:rgba(245,158,11,0.15);color:#fbbf24">${icon('alertTriangle', 15)}</span>
              <p class="text-white text-sm font-semibold uppercase tracking-wider" style="font-family:'Outfit',sans-serif">Weaknesses &amp; Gaps</p>
            </div>
            <ul class="space-y-2">
              ${weaknesses.length ? weaknesses.map(function(w) { return `<li class="flex items-start gap-2 text-sm text-white/80 leading-relaxed"><span class="mt-1.5 text-amber-400">${icon('alertCircle', 13)}</span><span>${w}</span></li>`; }).join('') : '<li class="text-sm text-white/50">Consider elaborating on specific technical metrics.</li>'}
            </ul>
          </div>
        </div>

        <!-- 6. AI Improvement Plan -->
        <div class="report-section" id="report-plan">
          <div class="flex items-center gap-2 mb-4">
            <span class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:rgba(99,102,241,0.15);color:#a5b4fc">${icon('lightbulb', 15)}</span>
            <h3 class="text-lg font-semibold text-white" style="font-family:'Outfit',sans-serif">AI Improvement Plan</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="rounded-xl border border-white/7 p-5" style="background:#141627">
              <p class="text-white/40 text-[11px] uppercase tracking-wider font-semibold">What to Improve</p>
              <div class="mt-3 space-y-3">
                ${improvements.length ? improvements.slice(0, 4).map(function(imp, i) {
                  return `<div class="flex items-start gap-3">
                    <span class="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0" style="background:rgba(99,102,241,0.15);color:#a5b4fc">${String(i + 1).padStart(2, '0')}</span>
                    <p class="text-sm text-white/80 leading-relaxed">${imp}</p>
                  </div>`;
                }).join('') : '<p class="text-sm text-white/50">Focus on structured responses.</p>'}
              </div>
            </div>
            <div class="rounded-xl border border-white/7 p-5" style="background:#141627">
              <p class="text-white/40 text-[11px] uppercase tracking-wider font-semibold">How to Improve</p>
              <div class="mt-3 space-y-3">
                ${improvements.length > 4 ? improvements.slice(4).map(function(imp, i) {
                  return `<div class="flex items-start gap-3">
                    <span class="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0" style="background:rgba(6,182,212,0.15);color:#67e8f9">${String(i + 5).padStart(2, '0')}</span>
                    <p class="text-sm text-white/80 leading-relaxed">${imp}</p>
                  </div>`;
                }).join('') : '<p class="text-sm text-white/50">Practice delivering complete, structured answers.</p>'}
              </div>
            </div>
            <div class="rounded-xl border border-white/7 p-5" style="background:#141627">
              <p class="text-white/40 text-[11px] uppercase tracking-wider font-semibold">Practice Next</p>
              <div class="mt-3 space-y-3">
                ${recommendations.length ? recommendations.map(function(rec, i) {
                  return `<div class="flex items-start gap-3">
                    <span class="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0" style="background:rgba(16,185,129,0.15);color:#34d399">${String(i + 1).padStart(2, '0')}</span>
                    <p class="text-sm text-white/80 leading-relaxed">${rec}</p>
                  </div>`;
                }).join('') : '<p class="text-sm text-white/50">Take another mock interview to keep improving.</p>'}
              </div>
            </div>
          </div>
        </div>

        <!-- 7. Learning Resources -->
        ${resources.length ? `<div class="report-section" id="report-resources">
          <div class="flex items-center gap-2 mb-4">
            <span class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:rgba(6,182,212,0.15);color:#67e8f9">${icon('bookOpen', 15)}</span>
            <h3 class="text-lg font-semibold text-white" style="font-family:'Outfit',sans-serif">Recommended Learning Resources</h3>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            ${resources.map(function(res) {
              return `<div class="p-4 rounded-xl border border-white/7 flex flex-col justify-between transition-colors hover:border-white/15" style="background:#141627">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider" style="background:rgba(99,102,241,0.15);color:#a5b4fc;border:1px solid rgba(99,102,241,0.25)">${res.type || 'Resource'}</span>
                  </div>
                  <p class="text-white text-sm font-semibold">${res.title}</p>
                  <p class="text-white/40 text-xs mt-1 leading-relaxed">${res.description}</p>
                </div>
                ${res.link ? `<a href="${res.link}" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200 font-medium transition-colors">Explore Resource ${icon('chevronRight', 12)}</a>` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        <!-- 8. Question-by-Question Analysis -->
        ${questions.length ? `<div class="report-section" id="report-questions">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:rgba(99,102,241,0.15);color:#a5b4fc">${icon('messageSquare', 15)}</span>
              <h3 class="text-lg font-semibold text-white" style="font-family:'Outfit',sans-serif">Question-by-Question Analysis</h3>
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
              return `<div class="rounded-xl border border-white/7 overflow-hidden" style="background:#141627">
                <button class="report-accordion w-full flex items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]" data-target=".report-q-body-${idx}">
                  <div class="flex items-center gap-3 min-w-0">
                    <span class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style="background:${qColor}1f;color:${qColor}">Q${idx + 1}</span>
                    <div class="min-w-0">
                      <p class="text-white/70 text-xs font-semibold uppercase tracking-wider">${cat}</p>
                      <p class="text-white text-sm truncate mt-0.5 max-w-md">${q.question_text}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-4 shrink-0">
                    <div class="text-right hidden sm:block">
                      <p class="text-white font-bold text-sm">${qScore.toFixed(0)}%</p>
                      <p class="text-[10px]" style="color:${qColor}">${qRating}</p>
                    </div>
                    <span class="report-chevron text-white/40 transition-transform">${icon('chevronDown', 14)}</span>
                  </div>
                </button>
                <div class="report-q-body-${idx} hidden px-5 pb-5 space-y-4 border-t border-white/6 pt-4">
                  <div>
                    <p class="text-[11px] uppercase tracking-wider text-white/40 font-semibold mb-1.5">Question</p>
                    <p class="text-white/80 text-sm leading-relaxed">${q.question_text}</p>
                  </div>
                  <div>
                    <p class="text-[11px] uppercase tracking-wider text-indigo-400 font-semibold mb-1.5">Your Response</p>
                    <div class="rounded-lg border-l-2 p-3 text-sm text-white/75 leading-relaxed" style="border-color:${INDIGO};background:rgba(99,102,241,0.05)">${q.answer_text || 'No response recorded.'}</div>
                  </div>
                  <div>
                    <p class="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold mb-1.5">AI Feedback</p>
                    <div class="rounded-lg border border-emerald-500/15 p-3 text-sm text-white/75 leading-relaxed" style="background:rgba(16,185,129,0.04)">${q.feedback || 'Answer evaluated.'}</div>
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

function renderScoreRing(score, rating) {
  var pct = Math.min(100, Math.max(0, score));
  var r = 62;
  var c = 2 * Math.PI * r;
  var filled = (pct / 100) * c;
  var color = score >= 75 ? EMERALD : score >= 60 ? INDIGO : score >= 40 ? AMBER : ROSE;
  var ratingColor = rating === 'Excellent' ? EMERALD : rating === 'Good' ? INDIGO : rating === 'Average' ? AMBER : rating === 'Needs Improvement' ? ROSE : '#e11d48';
  return `<div class="relative w-44 h-44">
    <svg viewBox="0 0 160 160" class="w-full h-full -rotate-90">
      <circle cx="80" cy="80" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="12" />
      <circle cx="80" cy="80" r="${r}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"
        stroke-dasharray="${filled} ${c - filled}" style="transition:stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)" />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <span class="text-4xl font-extrabold text-white" style="font-family:'Outfit',sans-serif">${score.toFixed(1)}%</span>
      <span class="text-xs font-semibold mt-1 capitalize" style="color:${ratingColor}">${rating}</span>
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
      var d = new Date(ds);
      if (isNaN(d.getTime())) return false;
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
        var dateLine = dateStr;
        var timeLine = '';
        if (dateStr) {
          var parts = dateStr.split('T');
          dateLine = parts[0];
          timeLine = parts.length > 1 ? parts[1].split('.')[0].slice(0, 5) : '';
        }
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
              <p class="text-white/40 text-xs">${r.domain || 'General Domain'} &bull; ${r.completed_at || 'Recently'}</p>
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
