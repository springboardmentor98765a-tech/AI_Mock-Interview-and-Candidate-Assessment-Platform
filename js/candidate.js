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

function candidateInterviews() {
  var types = [
    { key: 'technical', title: 'Technical Interview', domain: 'Software Engineering', desc: 'Data structures, algorithms, system design', icon: icon('cpu', 20), color: INDIGO },
    { key: 'hr', title: 'HR Round', domain: 'General', desc: 'Culture fit, career goals, soft skills', icon: icon('messageSquare', 20), color: CYAN },
    { key: 'behavioral', title: 'Behavioural', domain: 'General', desc: 'STAR-method situational questions', icon: icon('brain', 20), color: EMERALD },
    { key: 'aptitude', title: 'Aptitude Test', domain: 'General', desc: 'Logical reasoning, quantitative analysis', icon: icon('target', 20), color: AMBER },
  ];
  var modal = '';
  if (state.configModal) {
    var t = types.find(function(x) { return x.key === state.configModal; });
    if (t) modal = renderConfigModal(t);
  }
  return `<div class="space-y-6">
    <div><h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Mock Interviews</h1><p class="text-white/40 text-sm mt-1">Choose an interview type, then configure your session.</p></div>
    <div class="grid grid-cols-2 gap-4">
      ${types.map(function(t) {
        return `<div class="interview-card rounded-xl border border-white/7 p-6 hover:border-white/15 transition-all group cursor-pointer" style="background:#0d0f1e">
          <div class="flex items-start justify-between mb-4">
            <div class="interview-icon" style="background:${t.color}20"><span style="color:${t.color}">${t.icon}</span></div>
          </div>
          <h3 class="text-white font-semibold mb-1" style="font-family:'Outfit',sans-serif">${t.title}</h3>
          <p class="text-white/40 text-xs leading-relaxed mb-5">${t.desc}</p>
          <button class="btn-configure-session w-full py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90" data-interview-type="${t.key}" data-domain="${t.domain}" style="background:${t.color}">${icon('play', 14)} Configure &amp; Start</button>
        </div>`;
      }).join('')}
    </div>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background:rgba(99,102,241,0.15)">${icon('video', 18)}</div>
        <div><p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Webcam &amp; Microphone Setup</p><p class="text-white/40 text-xs">Ensure camera and mic are enabled for full AI analysis</p></div>
        <button id="btn-test-devices" class="ml-auto px-4 py-2 rounded-lg text-xs font-medium text-white" style="background:${INDIGO}">Test Devices</button>
      </div>
      <div class="grid grid-cols-3 gap-3">
        ${[{ label: 'Eye Contact Tracking', icon: icon('eye', 14) }, { label: 'Speech Recognition', icon: icon('mic', 14) }, { label: 'Confidence Analysis', icon: icon('activity', 14) }].map(function(f) {
          return `<div class="flex items-center gap-2 p-3 rounded-lg border border-white/6" style="background:#141627"><span class="text-emerald-400">${f.icon}</span><div><p class="text-white text-xs font-medium">${f.label}</p><p class="text-emerald-400 text-xs">Ready</p></div></div>`;
        }).join('')}
      </div>
      <p id="device-status" class="mt-3 text-xs text-white/40" role="status">Camera and microphone have not been tested yet.</p>
    </div>
  </div>${modal}`;
}

function renderConfigModal(t) {
  var isQ = state.configMode === 'questions';
  return `<div id="config-overlay" class="fixed inset-0 z-50 flex items-center justify-center" style="background:rgba(0,0,0,0.6);backdrop-filter:blur(4px)">
    <div class="w-full max-w-lg rounded-2xl border border-white/10 p-6 space-y-5" style="background:#0d0f1e">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:${t.color}20"><span style="color:${t.color}">${t.icon}</span></div>
          <div><p class="text-white font-semibold" style="font-family:'Outfit',sans-serif">${t.title}</p><p class="text-white/40 text-xs">${t.domain}</p></div>
        </div>
        <button id="config-close" class="text-white/30 hover:text-white/70 text-xl leading-none">&times;</button>
      </div>

      <div>
        <p class="text-xs text-white/40 mb-2 font-medium uppercase tracking-wider">Difficulty</p>
        <div class="grid grid-cols-3 gap-2">
          ${['easy', 'medium', 'hard'].map(function(d) {
            var sel = state.configDifficulty === d;
            var col = d === 'easy' ? EMERALD : d === 'medium' ? AMBER : ROSE;
            return `<button class="config-diff-btn py-2 rounded-lg text-xs font-semibold border transition-all" data-diff="${d}" style="${sel ? 'background:' + col + '25;border-color:' + col + '60;color:' + col : 'background:#141627;border-color:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5)'}">${d.charAt(0).toUpperCase() + d.slice(1)}</button>`;
          }).join('')}
        </div>
      </div>

      <div>
        <p class="text-xs text-white/40 mb-2 font-medium uppercase tracking-wider">Selection Mode</p>
        <div class="grid grid-cols-2 gap-2">
          <button class="config-mode-btn py-2.5 rounded-lg text-xs font-semibold border transition-all" data-mode="questions" style="${isQ ? 'background:' + INDIGO + '25;border-color:' + INDIGO + '60;color:' + INDIGO : 'background:#141627;border-color:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5)'}">By Questions</button>
          <button class="config-mode-btn py-2.5 rounded-lg text-xs font-semibold border transition-all" data-mode="time" style="${!isQ ? 'background:' + INDIGO + '25;border-color:' + INDIGO + '60;color:' + INDIGO : 'background:#141627;border-color:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5)'}">By Time</button>
        </div>
      </div>

      ${isQ ? `<div>
        <p class="text-xs text-white/40 mb-2 font-medium uppercase tracking-wider">Number of Questions</p>
        <div class="grid grid-cols-4 gap-2">
          ${[3, 5, 10, 15].map(function(n) {
            var sel = state.configNumQuestions === n;
            return `<button class="config-qty-btn py-2 rounded-lg text-xs font-semibold border transition-all" data-qty="${n}" style="${sel ? 'background:' + INDIGO + '25;border-color:' + INDIGO + '60;color:' + INDIGO : 'background:#141627;border-color:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5)'}">${n}</button>`;
          }).join('')}
        </div>
      </div>` : `<div>
        <p class="text-xs text-white/40 mb-2 font-medium uppercase tracking-wider">Interview Duration</p>
        <div class="grid grid-cols-4 gap-2">
          ${[20, 30, 45, 60].map(function(m) {
            var sel = state.configTimeDuration === m;
            var label = m >= 60 ? '1 hr' : m + ' min';
            return `<button class="config-time-btn py-2 rounded-lg text-xs font-semibold border transition-all" data-time="${m}" style="${sel ? 'background:' + INDIGO + '25;border-color:' + INDIGO + '60;color:' + INDIGO : 'background:#141627;border-color:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5)'}">${label}</button>`;
          }).join('')}
        </div>
      </div>`}

      <button id="config-start" class="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90" style="background:linear-gradient(135deg,${t.color},${t.color}cc)" data-interview-type="${t.key}" data-domain="${t.domain}">${icon('play', 14)} Start Interview</button>
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
  button.disabled = true;
  var original = button.innerHTML;
  button.textContent = 'Creating session...';
  try {
    await enableInterviewDevices();
    var payload = { interview_type: button.dataset.interviewType, domain: button.dataset.domain, difficulty: state.configDifficulty };
    if (state.configMode === 'time') payload.time_duration = state.configTimeDuration;
    else payload.num_questions = state.configNumQuestions;
    var generated = await api.generateInterview(payload);
    var started = await api.startInterview(generated.interview.id);
    state.currentInterview = started;
    state.currentQuestionIndex = 0;
    state.currentTranscript = '';
    state.sessionMessage = '';
    state.configModal = null;
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
  } catch (error) {
    status.textContent = error.name === 'NotAllowedError' ? 'Permission was denied. Allow camera and microphone access, then try again.' : 'Unable to access your camera or microphone: ' + error.message;
    status.className = 'mt-3 text-xs text-rose-400';
  } finally {
    button.disabled = false;
    button.textContent = 'Test Devices';
  }
}

function bindCandidateInterviewEvents() {
  document.querySelectorAll('.btn-configure-session').forEach(function(button) {
    button.addEventListener('click', function() {
      state.configModal = button.dataset.interviewType;
      state.configDifficulty = 'medium';
      state.configMode = 'questions';
      state.configNumQuestions = 5;
      state.configTimeDuration = 30;
      render();
    });
  });
  document.querySelectorAll('.config-diff-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { state.configDifficulty = this.dataset.diff; render(); });
  });
  document.querySelectorAll('.config-mode-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { state.configMode = this.dataset.mode; render(); });
  });
  document.querySelectorAll('.config-qty-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { state.configNumQuestions = parseInt(this.dataset.qty); render(); });
  });
  document.querySelectorAll('.config-time-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { state.configTimeDuration = parseInt(this.dataset.time); render(); });
  });
  var configClose = document.getElementById('config-close');
  if (configClose) configClose.addEventListener('click', function() { state.configModal = null; render(); });
  var configOverlay = document.getElementById('config-overlay');
  if (configOverlay) configOverlay.addEventListener('click', function(e) { if (e.target === configOverlay) { state.configModal = null; render(); } });
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
  var rating = report.performance_rating || (overall >= 90 ? 'Excellent' : overall >= 75 ? 'Good' : overall >= 60 ? 'Average' : overall >= 40 ? 'Needs Improvement' : 'Poor');

  var strengths = report.strengths || [];
  var weaknesses = report.weaknesses || [];
  var improvements = report.improvements || [];
  var recommendations = report.recommendations || [];
  var resources = report.resources || [];
  var questions = report.questions || [];
  var params = report.detailed_parameters || {};

  return `<div id="report-modal-overlay" class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style="background:rgba(0,0,0,0.75);backdrop-filter:blur(6px)">
    <div class="w-full max-w-4xl rounded-2xl border border-white/10 p-6 lg:p-8 space-y-6 max-h-[90vh] overflow-y-auto" style="background:#0d0f1e">
      <div class="flex items-start justify-between border-b border-white/8 pb-4">
        <div>
          <div class="flex items-center gap-3 mb-1">
            <h2 class="text-xl font-bold text-white" style="font-family:'Outfit',sans-serif">${report.interview_type ? report.interview_type.toUpperCase() : 'MOCK'} INTERVIEW REPORT</h2>
            ${renderRubricBadge(rating, overall)}
          </div>
          <p class="text-white/40 text-xs">${report.domain || 'General Domain'} &bull; Difficulty: ${report.difficulty || 'medium'} &bull; Completed: ${report.completed_at || report.created_at || 'Recently'}</p>
        </div>
        <button id="report-modal-close" class="text-white/40 hover:text-white text-2xl leading-none">&times;</button>
      </div>

      <!-- Executive Overview Card -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white/[0.02] border border-white/6 rounded-xl p-5">
        <div class="md:col-span-2 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/6 pb-4 md:pb-0 md:pr-4 text-center">
          <p class="text-white/40 text-xs uppercase tracking-wider font-semibold mb-1">Overall Assessment Score</p>
          <div class="text-4xl font-extrabold text-white my-1" style="font-family:'Outfit',sans-serif">${overall.toFixed(1)}%</div>
          <p class="text-xs text-white/50">Rating: <strong class="text-white">${rating}</strong></p>
        </div>
        <div class="md:col-span-3 space-y-3 pl-0 md:pl-2">
          ${[
            { label: 'Communication Score (30%)', val: comm, color: INDIGO },
            { label: 'Confidence Score (25%)', val: conf, color: CYAN },
            { label: 'Technical Relevance (30%)', val: tech, color: EMERALD },
            { label: 'Professionalism Score (15%)', val: prof, color: AMBER },
          ].map(function(m) {
            return `<div>
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-white/70 font-medium">${m.label}</span>
                <span class="text-white font-bold">${m.val.toFixed(1)}%</span>
              </div>
              <div class="w-full h-2 rounded-full bg-white/6 overflow-hidden">
                <div class="h-full rounded-full" style="width:${Math.min(100, Math.max(0, m.val))}%;background:${m.color}"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Parameters Grid -->
      <div>
        <h3 class="text-sm font-semibold text-white mb-3" style="font-family:'Outfit',sans-serif">Assessment Parameter Metrics</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${[
            { name: 'Speech Clarity', key: 'speech_clarity', category: 'Communication' },
            { name: 'Grammar Quality', key: 'grammar_quality', category: 'Communication' },
            { name: 'Eye Contact', key: 'eye_contact_consistency', category: 'Confidence' },
            { name: 'Speaking Confidence', key: 'speaking_confidence', category: 'Confidence' },
            { name: 'Technical Accuracy', key: 'technical_accuracy', category: 'Technical' },
            { name: 'Problem Solving', key: 'problem_solving_ability', category: 'Technical' },
            { name: 'Time Management', key: 'time_management', category: 'Professionalism' },
            { name: 'Etiquette', key: 'interview_etiquette', category: 'Professionalism' },
          ].map(function(p) {
            var scoreVal = params[p.key] || (p.category === 'Communication' ? comm : p.category === 'Confidence' ? conf : p.category === 'Technical' ? tech : prof);
            return `<div class="p-3 rounded-lg border border-white/6" style="background:#141627">
              <p class="text-white/40 text-[10px] uppercase font-semibold">${p.category}</p>
              <p class="text-white text-xs font-semibold mt-0.5">${p.name}</p>
              <p class="text-emerald-400 text-xs font-bold mt-1">${scoreVal.toFixed(0)}%</p>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Strengths & Weaknesses -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
          <div class="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">${icon('check', 14)} Strengths</div>
          <ul class="space-y-1.5 text-xs text-white/80 list-disc list-inside">
            ${strengths.length ? strengths.map(function(s) { return `<li>${s}</li>`; }).join('') : '<li>Good engagement throughout the interview.</li>'}
          </ul>
        </div>
        <div class="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
          <div class="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">${icon('alertTriangle', 14)} Weaknesses &amp; Gaps</div>
          <ul class="space-y-1.5 text-xs text-white/80 list-disc list-inside">
            ${weaknesses.length ? weaknesses.map(function(w) { return `<li>${w}</li>`; }).join('') : '<li>Consider elaborating on specific technical metrics.</li>'}
          </ul>
        </div>
      </div>

      <!-- Improvement & Practice Recommendations -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2">
          <div class="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">${icon('trendingUp', 14)} Actionable Improvement Suggestions</div>
          <ul class="space-y-1.5 text-xs text-white/80 list-disc list-inside">
            ${improvements.length ? improvements.map(function(imp) { return `<li>${imp}</li>`; }).join('') : '<li>Practice structured STAR method answers.</li>'}
          </ul>
        </div>
        <div class="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-2">
          <div class="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">${icon('target', 14)} Practice Recommendations</div>
          <ul class="space-y-1.5 text-xs text-white/80 list-disc list-inside">
            ${recommendations.length ? recommendations.map(function(r) { return `<li>${r}</li>`; }).join('') : '<li>Complete 2 more mock sessions in this domain.</li>'}
          </ul>
        </div>
      </div>

      <!-- Learning Resources -->
      ${resources.length ? `<div>
        <h3 class="text-sm font-semibold text-white mb-3" style="font-family:'Outfit',sans-serif">Recommended Learning Resources</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          ${resources.map(function(res) {
            return `<div class="p-3.5 rounded-lg border border-white/7 bg-white/[0.02] flex flex-col justify-between">
              <div>
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">${res.type || 'Resource'}</span>
                <p class="text-white text-xs font-semibold mt-2">${res.title}</p>
                <p class="text-white/40 text-[11px] mt-1 leading-relaxed">${res.description}</p>
              </div>
              ${res.link ? `<a href="${res.link}" target="_blank" rel="noopener noreferrer" class="mt-3 text-xs text-indigo-300 hover:underline flex items-center gap-1 font-medium">Explore Resource &rarr;</a>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- Questions Breakdown -->
      ${questions.length ? `<div>
        <h3 class="text-sm font-semibold text-white mb-3" style="font-family:'Outfit',sans-serif">Question-by-Question Analysis</h3>
        <div class="space-y-3">
          ${questions.map(function(q, idx) {
            return `<div class="p-4 rounded-xl border border-white/6 bg-white/[0.01]">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-white">Q${idx + 1}: ${q.category || 'General'}</span>
                <span class="text-xs font-bold text-indigo-300 px-2 py-0.5 rounded bg-indigo-500/20">Score: ${(q.score || 0).toFixed(0)}%</span>
              </div>
              <p class="text-white/80 text-xs font-medium mb-2">${q.question_text}</p>
              ${q.answer_text ? `<p class="text-white/50 text-xs italic bg-black/20 p-2.5 rounded border border-white/5 mb-2">"${q.answer_text}"</p>` : ''}
              ${q.feedback ? `<p class="text-emerald-300/90 text-xs"><strong>AI Feedback:</strong> ${q.feedback}</p>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

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

  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Interview History</h1>
    </div>
    <div class="rounded-xl border border-white/7 overflow-hidden" style="background:#0d0f1e">
      <table class="w-full text-xs"><thead><tr class="border-b border-white/6">
        ${['Session', 'Type', 'Date', 'Questions', 'Rating', 'Score', 'Report'].map(function(h) { return `<th class="px-5 py-3.5 text-left text-white/35 font-medium">${h}</th>`; }).join('')}
      </tr></thead><tbody>
      ${history.length ? history.map(function(i) {
        var score = i.overall_score || i.total_score || 0;
        return `<tr class="border-b border-white/4 hover:bg-white/[0.02]">
          <td class="px-5 py-4 font-semibold text-white">#${i.id} &bull; ${i.domain || 'General'}</td>
          <td class="px-5 py-4 text-white/70 uppercase">${i.interview_type}</td>
          <td class="px-5 py-4 text-white/40">${i.completed_at || i.created_at || '—'}</td>
          <td class="px-5 py-4 text-white/70">${i.questions_answered || 0} / ${i.total_questions || 0}</td>
          <td class="px-5 py-4">${renderRubricBadge(i.performance_rating, score)}</td>
          <td class="px-5 py-4 font-bold text-white">${score.toFixed(1)}%</td>
          <td class="px-5 py-4"><button class="btn-view-report text-indigo-300 hover:text-indigo-200 font-semibold" data-id="${i.id}">View AI Report</button></td>
        </tr>`;
      }).join('') : `<tr><td colspan="7" class="px-5 py-10 text-center text-white/30 text-sm">No interview history yet. Start a mock interview to begin tracking.</td></tr>`}
      </tbody></table>
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
