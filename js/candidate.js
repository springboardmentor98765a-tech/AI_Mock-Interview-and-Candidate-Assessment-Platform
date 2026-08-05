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
  var isLast = state.currentQuestionIndex === total - 1;
  return `<div class="max-w-5xl mx-auto space-y-6">
    <div class="flex items-center justify-between"><div><p class="text-white/40 text-xs uppercase tracking-wider">Live ${session.interview.interview_type} interview</p><h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Question ${state.currentQuestionIndex + 1} of ${total}</h1></div><button id="btn-end-session" class="text-xs text-white/50 hover:text-white">End session</button></div>
    <div class="grid grid-cols-2 gap-5"><div class="rounded-xl border border-white/7 overflow-hidden" style="background:#0d0f1e"><video id="candidate-camera" autoplay muted playsinline class="w-full aspect-video object-cover" style="background:#141627"></video><p class="px-4 py-3 text-xs text-emerald-400">Camera and microphone connected</p></div><div class="rounded-xl border border-white/7 p-6 flex flex-col" style="background:#0d0f1e"><div class="flex items-center gap-2 mb-4">${badge(question.category || 'Interview', 'indigo')}${badge(question.difficulty || 'medium', 'amber')}</div><p class="text-white text-lg leading-relaxed flex-1">${question.question_text}</p><button id="btn-repeat-question" class="mt-5 text-xs text-indigo-300 hover:text-indigo-200 text-left">Replay interviewer question</button></div></div>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e"><p class="text-white/70 text-sm mb-2">Live voice response</p><p id="session-status" class="mb-2 text-xs text-white/40" role="status">${state.sessionMessage || 'The AI interviewer is speaking the question.'}</p><p class="text-xs text-white/35">Recording starts automatically when the interviewer finishes and submits after you stop speaking.</p></div>
  </div>`;
}

async function startCandidateInterview(button) {
  button.disabled = true;
  var original = button.innerHTML;
  button.textContent = 'Creating session...';
  try {
    await enableInterviewDevices();
    var payload = { interview_type: button.dataset.interviewType, domain: button.dataset.domain, difficulty: state.configDifficulty };
    if (state.configMode === 'time') {
      payload.time_duration = state.configTimeDuration;
    } else {
      payload.num_questions = state.configNumQuestions;
    }
    var generated = await api.generateInterview(payload);
    var started = await api.startInterview(generated.interview.id);
    state.currentInterview = started;
    state.currentQuestionIndex = 0;
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
  if (state.interviewerAudio) { state.interviewerAudio.pause(); state.interviewerAudio = null; }
  if (state.interviewStream) state.interviewStream.getTracks().forEach(function(track) { track.stop(); });
  state.interviewStream = null;
  state.voiceCapture = null;
}

function setSessionStatus(message, color) {
  var status = document.getElementById('session-status');
  if (!status) return;
  status.textContent = message;
  status.className = 'mb-4 text-xs ' + (color || 'text-white/40');
}

async function speakCurrentQuestion() {
  var session = state.currentInterview;
  if (!session) return;
  var question = session.questions[state.currentQuestionIndex];
  try {
    setSessionStatus('AI interviewer is speaking...', 'text-indigo-300');
    var data = await api.speakInterviewQuestion(session.interview.id, question.id);
    if (state.interviewerAudio) state.interviewerAudio.pause();
    var audio = new Audio('data:' + (data.mime_type || 'audio/wav') + ';base64,' + data.audio_base64);
    state.interviewerAudio = audio;
    audio.onended = function() {
      setSessionStatus('Listening. Answer naturally; your response submits after you stop speaking.', 'text-emerald-300');
      window.setTimeout(startVoiceCapture, 350);
    };
    await audio.play();
  } catch (error) {
    setSessionStatus('Voice interviewer unavailable: ' + error.message, 'text-amber-300');
  }
}

function startVoiceCapture() {
  if (state.voiceCapture) return;
  if (!state.interviewStream) { setSessionStatus('Camera and microphone are not connected.', 'text-rose-400'); return; }
  var context = new (window.AudioContext || window.webkitAudioContext)();
  var source = context.createMediaStreamSource(state.interviewStream);
  var processor = context.createScriptProcessor(4096, 1, 1);
  var chunks = [];
  var capture = { context: context, source: source, processor: processor, chunks: chunks, heardSpeech: false, silenceFrames: 0, startedAt: Date.now() };
  processor.onaudioprocess = function(event) {
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    var samples = event.inputBuffer.getChannelData(0);
    var sum = 0;
    for (var index = 0; index < samples.length; index++) sum += samples[index] * samples[index];
    var volume = Math.sqrt(sum / samples.length);
    if (volume > 0.015) { capture.heardSpeech = true; capture.silenceFrames = 0; }
    else if (capture.heardSpeech) capture.silenceFrames += 1;
    if (capture.heardSpeech && capture.silenceFrames >= 18) stopAndSubmitVoiceAnswer();
    else if (Date.now() - capture.startedAt >= 120000) stopAndSubmitVoiceAnswer();
  };
  source.connect(processor);
  processor.connect(context.destination);
  state.voiceCapture = capture;
  setSessionStatus('Listening now. Speak clearly; I will submit after a short pause.', 'text-rose-300');
}

function wavDataUrl(capture) {
  var totalLength = capture.chunks.reduce(function(total, chunk) { return total + chunk.length; }, 0);
  var samples = new Float32Array(totalLength);
  var offset = 0;
  capture.chunks.forEach(function(chunk) { samples.set(chunk, offset); offset += chunk.length; });
  var buffer = new ArrayBuffer(44 + samples.length * 2);
  var view = new DataView(buffer);
  function writeString(position, value) { for (var i = 0; i < value.length; i++) view.setUint8(position + i, value.charCodeAt(i)); }
  writeString(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); writeString(8, 'WAVE'); writeString(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, capture.context.sampleRate, true);
  view.setUint32(28, capture.context.sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeString(36, 'data'); view.setUint32(40, samples.length * 2, true);
  for (var index = 0; index < samples.length; index++) { var sample = Math.max(-1, Math.min(1, samples[index])); view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true); }
  var bytes = new Uint8Array(buffer); var binary = ''; for (var byteIndex = 0; byteIndex < bytes.length; byteIndex++) binary += String.fromCharCode(bytes[byteIndex]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

async function stopAndSubmitVoiceAnswer() {
  var capture = state.voiceCapture;
  if (!capture) return;
  state.voiceCapture = null;
  capture.processor.disconnect(); capture.source.disconnect(); await capture.context.close();
  setSessionStatus('Transcribing and evaluating your answer...', 'text-indigo-300');
  try {
    var question = state.currentInterview.questions[state.currentQuestionIndex];
    var result = await api.submitVoiceAnswer(state.currentInterview.interview.id, question.id, wavDataUrl(capture));
    state.currentInterview.interview = result.interview;
    state.currentInterview.questions[state.currentQuestionIndex] = result.question;
    if (state.currentQuestionIndex < state.currentInterview.questions.length - 1) {
      state.currentQuestionIndex += 1;
      state.sessionMessage = 'Transcript: "' + result.transcript + '"';
      render();
      return;
    }
    stopInterviewDevices();
    state.section = 'history';
    state.sessionMessage = 'Interview completed. AI score: ' + (result.interview.total_score || 0) + '%. ';
    render();
  } catch (error) {
    setSessionStatus(error.message, 'text-rose-400');
  }
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

async function submitCandidateAnswer() {
  var answer = document.getElementById('interview-answer').value.trim();
  var status = document.getElementById('session-status');
  var button = document.getElementById('btn-submit-answer');
  if (!answer) {
    status.textContent = 'Enter an answer before continuing.';
    status.className = 'mt-3 text-xs text-rose-400';
    return;
  }
  button.disabled = true;
  button.textContent = 'Saving...';
  try {
    var question = state.currentInterview.questions[state.currentQuestionIndex];
    var result = await api.submitInterviewAnswer(state.currentInterview.interview.id, question.id, answer);
    state.currentInterview.interview = result.interview;
    state.currentInterview.questions[state.currentQuestionIndex] = result.question;
    if (state.currentQuestionIndex < state.currentInterview.questions.length - 1) {
      state.currentQuestionIndex += 1;
      state.sessionMessage = 'Answer saved. Continue with the next question.';
      render();
      return;
    }
    state.sessionMessage = 'Interview complete. Your score is ' + (result.interview.total_score || 0) + '%. ';
    state.section = 'history';
    render();
  } catch (error) {
    status.textContent = error.message;
    status.className = 'mt-3 text-xs text-rose-400';
    button.disabled = false;
    button.textContent = state.currentQuestionIndex === state.currentInterview.questions.length - 1 ? 'Finish Interview' : 'Next Question';
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
  var submitAnswer = document.getElementById('btn-submit-answer');
  if (submitAnswer) submitAnswer.addEventListener('click', submitCandidateAnswer);
  var backToInterviews = document.getElementById('btn-back-to-interviews');
  if (backToInterviews) backToInterviews.addEventListener('click', function() { state.section = 'interviews'; render(); });
  var endSession = document.getElementById('btn-end-session');
  if (endSession) endSession.addEventListener('click', function() { stopInterviewDevices(); state.section = 'interviews'; render(); });
  var camera = document.getElementById('candidate-camera');
  if (camera && state.interviewStream) camera.srcObject = state.interviewStream;
  var repeatQuestion = document.getElementById('btn-repeat-question');
  if (repeatQuestion) repeatQuestion.addEventListener('click', speakCurrentQuestion);
  if (camera && state.interviewStream) speakCurrentQuestion();
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
