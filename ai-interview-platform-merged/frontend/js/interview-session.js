// ============================================================
// Live Proctored Interview Session
// Talks to the Python Module 3 service (apiFetchPy, from script.js)
// for questions / answers / violations / finishing the session.
// ============================================================

// Per-question time "weight" by category + difficulty — used only to
// build the overall session time budget below, not shown per-question.
// Categories aren't interchangeable: a quick HR/Aptitude question
// deserves far less of the budget than a Behavioral story or an
// open-ended Technical design question.
const CATEGORY_DIFFICULTY_SECONDS = {
  HR: { easy: 60, medium: 90, hard: 120 },
  Aptitude: { easy: 60, medium: 90, hard: 120 },
  Behavioral: { easy: 90, medium: 120, hard: 180 },
  Technical: { easy: 90, medium: 150, hard: 240 }, // hard tier is largely
  // open-ended system-design questions (see question_bank.py) — these
  // need real thinking + explaining time, not a quick-recall window.
};
const DEFAULT_DIFFICULTY_SECONDS = { easy: 90, medium: 120, hard: 150 }; // fallback for unknown categories
const LONG_QUESTION_BONUS_SECONDS = 20; // extra reading/thinking time for a longer prompt
const LONG_QUESTION_WORD_THRESHOLD = 22;

function getQuestionTimeWeight(question) {
  const byCategory = CATEGORY_DIFFICULTY_SECONDS[question.category];
  const table = byCategory || DEFAULT_DIFFICULTY_SECONDS;
  let seconds = table[question.difficulty] || table.medium || 120;

  const wordCount = (question.question_text || '').trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > LONG_QUESTION_WORD_THRESHOLD) {
    seconds += LONG_QUESTION_BONUS_SECONDS;
  }
  return seconds;
}

// The whole session gets ONE countdown, not one per question — its
// length is just each question's weight added up, so a 5-question set
// and a 30-question set each get a total that actually fits their mix
// of categories/difficulties (e.g. five easy HR questions total far
// less time than five hard Technical ones would).
function computeSessionTimeBudget(qs) {
  return qs.reduce((sum, q) => sum + getQuestionTimeWeight(q), 0);
}

const MAX_STRIKES = 5;
const VIOLATION_COOLDOWN_MS = 8000; // don't spam the same violation type more than once per 8s
const FACE_CHECK_INTERVAL_MS = 1500;
const NO_FACE_STRIKES_BEFORE_WARN = 3; // ~4.5s of no face before it counts as a violation
const FACE_MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

let interviewId = null;
let interview = null;
let questions = [];
let currentIndex = 0;
let localAnswers = {}; // questionId -> { text, inputMode }

let webcamStream = null;
let faceApiReady = false;
let faceExpressionsReady = false; // Milestone 3 — separate flag: expression model may fail to load even if detector loaded fine
let faceCheckTimer = null;
let noFaceStreak = 0;
let liveHudTimer = null; // Module 5/6 — refreshes the real-time analytics HUD

// Milestone 3 — Speech Analysis & AI Monitoring: per-question tally of
// on-camera samples (for eye_contact_percentage) and detected emotions
// (for dominant_emotion), reset every time a new question is shown and
// read once when that question's answer is saved.
let faceOnCameraSamples = 0;
let faceTotalSamples = 0;
let faceEmotionTally = {};

// Milestone 3 — pronunciation proxy: the Web Speech API returns a
// confidence (0-1) per final recognized phrase, reflecting how sure
// the recognizer was about what it heard — low confidence usually
// means unclear/mumbled speech. Averaged per question. This is a
// real browser-provided signal, not a fabricated score — but it's a
// rough proxy, not true phoneme-level pronunciation analysis, since
// no browser API exposes that.
let pronunciationConfidenceSamples = [];

function resetFaceSignalsForQuestion() {
  faceOnCameraSamples = 0;
  faceTotalSamples = 0;
  faceEmotionTally = {};
  pronunciationConfidenceSamples = [];
}

function getPronunciationConfidenceForAnswer() {
  if (pronunciationConfidenceSamples.length === 0) return null;
  const avg = pronunciationConfidenceSamples.reduce((a, b) => a + b, 0) / pronunciationConfidenceSamples.length;
  return Math.round(avg * 100);
}

function getFaceSignalsForAnswer() {
  const eyeContactPercentage =
    faceTotalSamples > 0 ? Math.round((faceOnCameraSamples / faceTotalSamples) * 100) : null;
  let dominantEmotion = null;
  let bestCount = 0;
  for (const [emotion, count] of Object.entries(faceEmotionTally)) {
    if (count > bestCount) {
      bestCount = count;
      dominantEmotion = emotion;
    }
  }
  return { dominantEmotion, eyeContactPercentage };
}

// ---------------------------------------------------------------
// Module 5 — Real-time Speech & Communication Analysis (client side).
// A lightweight mirror of backend-python/app/speech_analysis.py's
// filler-word list, used only to give the candidate live feedback as
// they type/speak — the authoritative, scored numbers are still
// computed server-side in submit_answer() when the answer is saved.
// ---------------------------------------------------------------
const LIVE_FILLER_PHRASES = [
  'you know what i mean', 'you know', 'i mean', 'sort of', 'kind of',
  'basically', 'actually', 'literally', 'honestly', 'so yeah',
  'um', 'umm', 'uh', 'uhh', 'er', 'erm', 'like', 'well',
];

function analyzeLiveText(text) {
  const trimmed = (text || '').trim();
  const words = trimmed.match(/[A-Za-z']+/g) || [];
  const wordCount = words.length;

  let lowered = ` ${trimmed.toLowerCase()} `;
  let fillerCount = 0;
  for (const phrase of LIVE_FILLER_PHRASES) {
    const pattern = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const matches = lowered.match(pattern);
    if (matches) {
      fillerCount += matches.length;
      lowered = lowered.replace(pattern, ' ');
    }
  }
  return { wordCount, fillerCount };
}

// Reads the current on-screen answer + this question's tallied face
// signals so far and refreshes the live HUD. Safe to call frequently —
// every branch degrades to "—" placeholders rather than throwing when
// a panel/question isn't in the expected state (e.g. MCQ/coding
// questions, which don't collect speech/emotion signals).
function updateLiveAnalyticsHud() {
  const hud = document.getElementById('liveAnalyticsHud');
  if (!hud) return;

  const q = questions[currentIndex];
  const isOpenQuestion = q && (q.question_type || 'open') === 'open';
  const textarea = document.getElementById('answerText');
  const text = isOpenQuestion && textarea ? textarea.value : '';
  const { wordCount, fillerCount } = analyzeLiveText(text);

  const elapsedSeconds = questionStartedAt ? Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000)) : null;
  const liveWpm = wordCount > 0 && elapsedSeconds ? Math.round(wordCount / (elapsedSeconds / 60)) : null;

  const eyeContactPercentage =
    faceTotalSamples > 0 ? Math.round((faceOnCameraSamples / faceTotalSamples) * 100) : null;
  let dominantEmotion = null;
  let bestCount = 0;
  for (const [emotion, count] of Object.entries(faceEmotionTally)) {
    if (count > bestCount) {
      bestCount = count;
      dominantEmotion = emotion;
    }
  }
  const avgPronunciation = getPronunciationConfidenceForAnswer();

  setText('hudWordCount', wordCount || '0');
  setText('hudFillerCount', fillerCount || '0');
  setText('hudWpm', liveWpm !== null ? `${liveWpm} wpm` : '—');
  setText('hudEyeContact', eyeContactPercentage !== null ? `${eyeContactPercentage}%` : '—');
  setText('hudEmotion', dominantEmotion ? capitalize(dominantEmotion) : '—');
  setText('hudPronunciation', avgPronunciation !== null ? `${avgPronunciation}%` : '—');

  const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;
  setBarWidth('hudFillerBar', Math.min(100, fillerRatio * 100 * 6)); // scaled so ~16% ratio = full bar
  setChipTone('hudFillerCount', fillerRatio > 0.08 ? 'bad' : fillerCount > 0 ? 'warn' : 'ok');
  setChipTone('hudWpm', liveWpm === null ? 'neutral' : liveWpm < 90 || liveWpm > 180 ? 'warn' : 'ok');
  setChipTone('hudEyeContact', eyeContactPercentage === null ? 'neutral' : eyeContactPercentage >= 70 ? 'ok' : eyeContactPercentage < 40 ? 'bad' : 'warn');
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setBarWidth(id, percent) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function setChipTone(id, tone) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hud-tone-ok', 'hud-tone-warn', 'hud-tone-bad', 'hud-tone-neutral');
  el.classList.add(`hud-tone-${tone}`);
}

function capitalize(word) {
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

// ---------------------------------------------------------------
// Recording — MediaRecorder captures the SAME webcamStream already
// used for proctoring/webcam preview (no second getUserMedia call).
// One recording per session: started once camera/mic access is
// granted, paused/resumed alongside the session itself, stopped and
// uploaded exactly once when the session ends (Finish, timeout
// auto-submit, or violation auto-submit all funnel through
// finishInterview() below).
// ---------------------------------------------------------------
let mediaRecorder = null;
let recordedChunks = [];
let recordingMimeType = '';
let recordingStartedAt = null;
let recordingSecondsRecorded = 0; // wall-clock seconds actually spent recording (excludes pauses)
let recordingSegmentStartedAt = null;

// Tried in order — the browser picks the first one it actually supports.
const RECORDING_MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

// Microphone level meter (Web Audio API) — proves the audio track is
// actually being captured, not just requested.
let micAudioCtx = null;
let micAnalyser = null;
let micLevelTimer = null;

// Pause/resume — sessionPaused is checked by the timers and by every
// proctoring listener so nothing ticks or fires warnings while paused.
let sessionPaused = false;
let pauseInProgress = false;

let overallTimerInterval = null;
let overallSecondsLeft = 0; // counts DOWN from the whole-session budget
let questionStartedAt = 0; // still tracked per-question for the answers' timeTakenSeconds field

let strikeCount = 0;
let lastViolationAt = {}; // type -> timestamp
let sessionActive = false;
let sessionFinished = false;
// True from the moment finishInterview() starts until its PATCH .../finish
// call actually settles (success or failure). Kept separate from
// sessionFinished so the beforeunload guard below stays armed for the
// full round trip — otherwise a stray click/refresh/reload right after
// clicking "Finish Interview" can silently cancel the in-flight request,
// and the interview is stuck "Scheduled" forever even though every
// answer was already saved.
let finishInProgress = false;

let recognition = null;
let micActive = false;
let baseTextBeforeVoice = '';

// ---------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------
async function initInterviewSession() {
  const params = new URLSearchParams(window.location.search);
  interviewId = params.get('id');

  // Fallback for static servers that strip the query string when
  // redirecting /interview-session.html -> /interview-session (e.g.
  // `serve`'s "clean URLs" behaviour) — script.js's goToInterviewSession()
  // stashes the id here right before navigating, just in case.
  if (!interviewId) {
    try {
      interviewId = sessionStorage.getItem('pendingInterviewId');
    } catch (e) {
      /* sessionStorage unavailable */
    }
  }
  try {
    sessionStorage.removeItem('pendingInterviewId');
  } catch (e) {
    /* no-op */
  }

  if (!interviewId) {
    showToast('No interview selected.', 'error');
    window.location.href = 'candidate.html';
    return;
  }

  try {
    const data = await apiFetchPy(`/interviews/${interviewId}`);
    interview = data.interview;
    questions = data.questions || [];
  } catch (err) {
    showToast(err.message || 'Could not load this interview.', 'error');
    window.location.href = 'candidate.html';
    return;
  }

  if (!questions.length) {
    showToast('This session has no AI-generated questions to answer.', 'info');
    window.location.href = 'candidate.html';
    return;
  }

  if (interview.status === 'completed') {
    document.getElementById('preStartOverlay').style.display = 'none';
    showCompletedAlready();
    return;
  }

  document.getElementById('sessionInterviewType').textContent = interview.interview_type;

  // Preload any answers already saved (e.g. candidate reloaded the page).
  try {
    const savedAnswers = await apiFetchPy(`/interviews/${interviewId}/answers`);
    (savedAnswers || []).forEach((a) => {
      localAnswers[a.question_id] = {
        text: a.answer_text || '',
        inputMode: a.input_mode || 'typed',
        selectedOption: a.selected_option || null,
        codeAnswer: a.code_answer || '',
        codeLanguage: a.code_language || 'python',
      };
    });
  } catch (err) {
    // Non-fatal — session just starts with blank answers.
    console.warn('Could not preload saved answers:', err);
  }
}

function showCompletedAlready() {
  const overlay = document.getElementById('finishOverlay');
  overlay.style.display = 'flex';
  document.getElementById('finishHeading').textContent = '✅ Already completed';
  document.getElementById('finishSubtext').textContent = 'You already finished this interview.';
  document.getElementById('finishScoreBox').style.display = 'block';
  document.getElementById('finishScoreCircle').textContent =
    interview.score !== null && interview.score !== undefined ? `${interview.score}%` : '—';
  document.getElementById('finishFeedbackText').textContent = interview.ai_feedback || '';
  loadAndRenderScoreSheet();
  loadAndRenderCommunicationReport();
}

// ---------------------------------------------------------------
// MCQ + Coding marks sheet (shown on the finish/results overlay)
// ---------------------------------------------------------------
async function loadAndRenderScoreSheet() {
  let sheet;
  try {
    sheet = await apiFetchPy(`/interviews/${interviewId}/scoresheet`);
  } catch (err) {
    console.warn('Could not load score sheet:', err);
    return;
  }

  if (!sheet || !sheet.rows || !sheet.rows.length) return;

  const rowsHtml = sheet.rows
    .map((row) => {
      let resultLabel;
      if (row.question_type === 'mcq') {
        resultLabel = row.is_correct
          ? '✅ Correct'
          : `❌ Wrong${row.selected_option ? ` (picked ${row.selected_option}` : ' (no answer'}${
              row.correct_option ? `, correct: ${row.correct_option})` : ')'
            }`;
      } else {
        resultLabel = `${row.test_cases_passed ?? 0} / ${row.test_cases_total ?? 0} test cases passed`;
      }
      const typeLabel = row.question_type === 'mcq' ? 'MCQ' : 'Coding';
      return `
        <tr style="border-bottom:1px solid rgba(0,0,0,0.08)">
          <td style="padding:4px">${row.sequence_no}</td>
          <td style="padding:4px">${typeLabel}</td>
          <td style="padding:4px;max-width:260px">${escapeHtmlSession(row.question_text)}</td>
          <td style="padding:4px">${resultLabel}</td>
          <td style="padding:4px">${row.marks_awarded} / ${row.marks}</td>
        </tr>`;
    })
    .join('');

  document.getElementById('scoreSheetBody').innerHTML = rowsHtml;
  document.getElementById('scoreSheetTotal').textContent =
    `Total: ${sheet.marks_awarded} / ${sheet.marks_total} marks`;
  document.getElementById('scoreSheetBox').style.display = 'block';
}

// ---------------------------------------------------------------
// Module 5 & 6 — Communication & Confidence report (shown on the
// finish overlay once scoring completes).
// ---------------------------------------------------------------
async function loadAndRenderCommunicationReport() {
  let report;
  try {
    report = await apiFetchPy(`/interviews/${interviewId}/communication-report`);
  } catch (err) {
    console.warn('Could not load communication report:', err);
    return;
  }

  if (!report || !report.questions_analyzed) return; // nothing to show for MCQ/coding-only or unanswered sessions

  setText('crWpm', report.avg_words_per_minute !== null ? `${report.avg_words_per_minute} wpm (${report.pace_label || '—'})` : '—');
  setText(
    'crFiller',
    report.total_filler_words !== null
      ? `${report.total_filler_words} total (${report.filler_label || '—'})`
      : '—'
  );
  setText('crGrammar', report.avg_grammar_issues !== null && report.avg_grammar_issues !== undefined ? report.avg_grammar_issues : '—');
  setText('crKeyword', report.avg_keyword_match_percentage !== null ? `${report.avg_keyword_match_percentage}%` : 'no keyword data');
  setText('crCompleteness', report.avg_response_completeness !== null ? `${report.avg_response_completeness} words/answer` : '—');

  setText(
    'crEyeContact',
    report.avg_eye_contact_percentage !== null ? `${report.avg_eye_contact_percentage}% (${report.confidence_label || '—'})` : 'not tracked'
  );
  setText('crEmotion', report.dominant_emotion_overall ? capitalize(report.dominant_emotion_overall) : 'not tracked');
  setText('crPronunciation', report.avg_pronunciation_confidence !== null ? `${report.avg_pronunciation_confidence}%` : 'typed answers only');
  setText('crVoiceRatio', report.voice_answer_ratio !== null ? `${Math.round(report.voice_answer_ratio * 100)}%` : '0%');
  setText('crViolations', `${report.proctoring_violations ?? 0}`);

  const breakdown = document.getElementById('crEmotionBreakdown');
  if (breakdown) {
    const entries = Object.entries(report.emotion_breakdown || {});
    breakdown.innerHTML = entries.length
      ? `Emotion mix across answers: ${entries.map(([e, c]) => `${capitalize(e)} (${c})`).join(', ')}`
      : '';
  }

  if (report.rows && report.rows.length) {
    const rowsHtml = report.rows
      .map(
        (r) => `
        <tr>
          <td>${r.sequence_no}</td>
          <td>${escapeHtmlSession(r.category)}</td>
          <td>${r.word_count}</td>
          <td>${r.filler_word_count ?? '—'}</td>
          <td>${r.words_per_minute !== null && r.words_per_minute !== undefined ? r.words_per_minute : '—'}</td>
          <td>${r.eye_contact_percentage !== null && r.eye_contact_percentage !== undefined ? `${r.eye_contact_percentage}%` : '—'}</td>
          <td>${r.dominant_emotion ? capitalize(r.dominant_emotion) : '—'}</td>
        </tr>`
      )
      .join('');
    document.getElementById('crTableBody').innerHTML = rowsHtml;
    document.getElementById('crTable').style.display = 'table';
  }

  document.getElementById('commReportBox').style.display = 'block';
}

// ---------------------------------------------------------------
// Pre-start: camera permission + fullscreen
// ---------------------------------------------------------------
async function beginProctoredSession() {
  const btn = document.getElementById('preStartBtn');
  const errBox = document.getElementById('preStartError');
  errBox.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Requesting camera & microphone…';

  // Best-effort pre-check so we can give a specific message ("no camera
  // found" vs "no microphone found") before even prompting for
  // permission — device labels aren't available pre-permission, but
  // kind/count are, which is enough to catch the "no such device" case.
  let missingCamera = false;
  let missingMic = false;
  try {
    if (navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      missingCamera = !devices.some((d) => d.kind === 'videoinput');
      missingMic = !devices.some((d) => d.kind === 'audioinput');
    }
  } catch (e) {
    /* enumeration isn't critical — fall through to getUserMedia */
  }

  if (missingCamera || missingMic) {
    const what = missingCamera && missingMic ? 'camera or microphone' : missingCamera ? 'camera' : 'microphone';
    errBox.textContent = `No ${what} was found on this device. Please connect one and try again.`;
    errBox.style.display = 'block';
    btn.disabled = false;
    btn.textContent = '▶ Enable Camera & Start';
    return;
  }

  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 480, height: 360 },
      audio: true,
    });
  } catch (err) {
    errBox.textContent = preStartErrorMessage(err);
    errBox.style.display = 'block';
    btn.disabled = false;
    btn.textContent = '▶ Enable Camera & Start';
    return;
  }

  const video = document.getElementById('webcamVideo');
  video.srcObject = webcamStream;
  startMicLevelMeter();
  startRecording();

  // Fullscreen is best-effort — some browsers/embedded contexts block it,
  // so a failure here doesn't stop the interview, it just skips that check.
  try {
    await (document.documentElement.requestFullscreen && document.documentElement.requestFullscreen());
  } catch (err) {
    console.warn('Fullscreen request failed/denied:', err);
  }

  try {
    const updated = await apiFetchPy(`/interviews/${interviewId}/begin`, { method: 'PATCH' });
    interview = updated;
  } catch (err) {
    // Non-fatal — the candidate already has camera/mic access, so let
    // them proceed locally even if the status update didn't stick;
    // /finish will still succeed at the end.
    console.warn('Could not mark interview as started:', err);
  }

  document.getElementById('preStartOverlay').style.display = 'none';
  document.getElementById('sessionShell').style.display = 'flex';
  sessionActive = true;
  sessionPaused = false;
  updateSessionStatusBadge();

  attachProctoringListeners();
  setupFaceDetection(); // async, non-blocking
  startOverallTimer(computeSessionTimeBudget(questions));
  renderQuestion(0);

  // Module 5/6 — real-time HUD: recompute live filler/pace/emotion/eye
  // contact roughly twice a second, independent of the face-detection
  // cadence, so typed answers get live speech-signal feedback too.
  clearInterval(liveHudTimer);
  liveHudTimer = setInterval(updateLiveAnalyticsHud, 700);
}

// Maps getUserMedia failures to a message that tells the candidate
// what actually went wrong and what to do about it.
function preStartErrorMessage(err) {
  switch (err && err.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera and microphone access were denied. Please allow both permissions in your browser and try again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera or microphone could be found on this device. Please connect one and try again.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Your camera or microphone is already in use by another application. Close it and try again.';
    default:
      return 'Camera and microphone access are required for this proctored assessment. Please allow both permissions and try again.';
  }
}

// ---------------------------------------------------------------
// Question rendering + navigation
// ---------------------------------------------------------------
function renderQuestion(index) {
  currentIndex = index;
  const q = questions[index];
  const qType = q.question_type || 'open';

  document.getElementById('sessionProgress').textContent = `Question ${index + 1} / ${questions.length}`;
  document.getElementById('qCategoryBadge').textContent = q.category;
  const marksLabel = q.marks === 1 ? '1 mark' : `${q.marks} marks`;
  document.getElementById('qDifficultyBadge').textContent =
    qType === 'coding' || qType === 'mcq' ? `${q.difficulty} · ${marksLabel}` : q.difficulty;
  document.getElementById('questionText').textContent = q.question_text;

  document.getElementById('openAnswerCard').style.display = qType === 'open' ? '' : 'none';
  document.getElementById('mcqAnswerCard').style.display = qType === 'mcq' ? '' : 'none';
  document.getElementById('codingAnswerCard').style.display = qType === 'coding' ? '' : 'none';

  const saved = localAnswers[q.id];

  if (qType === 'mcq') {
    renderMcqOptions(q, saved);
  } else if (qType === 'coding') {
    renderCodingQuestion(q, saved);
  } else {
    document.getElementById('answerText').value = saved ? saved.text : '';
  }

  document.getElementById('micStatus').textContent = '';
  stopVoiceInputIfActive();

  document.getElementById('nextBtn').textContent =
    index === questions.length - 1 ? 'Finish Interview ✔' : 'Save & Next ▶';

  questionStartedAt = Date.now(); // still used for the per-answer timeTakenSeconds field
  resetFaceSignalsForQuestion(); // Milestone 3 — fresh emotion/eye-contact tally per question
}

function renderMcqOptions(q, saved) {
  let options = [];
  try {
    options = q.options ? JSON.parse(q.options) : [];
  } catch (e) {
    options = [];
  }
  const list = document.getElementById('mcqOptionsList');
  const selected = saved ? saved.selectedOption : null;
  list.innerHTML = options
    .map((opt, i) => {
      const letter = String.fromCharCode(65 + i); // A, B, C, D...
      const checked = selected === letter ? 'checked' : '';
      return `
        <li style="margin-bottom:8px">
          <label style="display:flex;gap:8px;align-items:flex-start;cursor:pointer">
            <input type="radio" name="mcqOption" value="${letter}" ${checked} onchange="onMcqOptionChange('${letter}')" style="margin-top:3px">
            <span><strong>${letter}.</strong> ${escapeHtmlSession(opt)}</span>
          </label>
        </li>`;
    })
    .join('');
}

function onMcqOptionChange(letter) {
  const q = questions[currentIndex];
  localAnswers[q.id] = { ...(localAnswers[q.id] || {}), selectedOption: letter };
}

function renderCodingQuestion(q, saved) {
  let starterCode = {};
  try {
    starterCode = q.starter_code ? JSON.parse(q.starter_code) : {};
  } catch (e) {
    starterCode = {};
  }
  let testCases = [];
  try {
    testCases = q.test_cases ? JSON.parse(q.test_cases) : [];
  } catch (e) {
    testCases = [];
  }

  const language = (saved && saved.codeLanguage) || 'python';
  document.getElementById('codeLanguageSelect').value = language;
  document.getElementById('codeAnswerText').value =
    saved && saved.codeAnswer !== undefined && saved.codeAnswer !== ''
      ? saved.codeAnswer
      : starterCode[language] || '';
  document.getElementById('codeAnswerText').dataset.starterCode = JSON.stringify(starterCode);

  // Clear any stale "Run Code" output from a previous render of this
  // (or another) coding question.
  const resultsBox = document.getElementById('runCodeResultsBox');
  if (resultsBox) {
    resultsBox.style.display = 'none';
    resultsBox.innerHTML = '';
  }
  const runStatus = document.getElementById('runCodeStatus');
  if (runStatus) runStatus.textContent = '';

  document.getElementById('codingTestCasesBox').innerHTML =
    '<strong>Sample test cases (your code is graded against these):</strong>' +
    testCases
      .map(
        (tc, i) =>
          `<div style="margin-top:6px;padding:8px;background:rgba(0,0,0,0.04);border-radius:6px">
            <div>Input ${i + 1}: <code>${escapeHtmlSession(tc.input)}</code></div>
            <div>Expected Output: <code>${escapeHtmlSession(tc.output)}</code></div>
          </div>`
      )
      .join('');
}

function onCodeLanguageChange() {
  const q = questions[currentIndex];
  const language = document.getElementById('codeLanguageSelect').value;
  let starterCode = {};
  try {
    starterCode = JSON.parse(document.getElementById('codeAnswerText').dataset.starterCode || '{}');
  } catch (e) {
    starterCode = {};
  }
  const saved = localAnswers[q.id];
  // Only swap in the language's starter code if the candidate hasn't
  // typed anything of their own for this question yet.
  const currentText = document.getElementById('codeAnswerText').value;
  const hadCustomCode = saved && saved.codeAnswer && saved.codeAnswer.trim() && saved.codeAnswer !== currentText;
  if (!currentText.trim() || (saved && saved.codeAnswer === currentText && !hadCustomCode)) {
    document.getElementById('codeAnswerText').value = starterCode[language] || '';
  }
  localAnswers[q.id] = { ...(localAnswers[q.id] || {}), codeLanguage: language };
}

// ---------------------------------------------------------------
// Coding round — "Run Code" (test execution, not the final graded
// submission). Hits POST /{id}/questions/{qid}/run, which reuses the
// same judge as the real grading but never persists or scores
// anything, so the candidate can iterate freely before Save & Next.
// ---------------------------------------------------------------
async function runCandidateCode() {
  const q = questions[currentIndex];
  if (!q || q.question_type !== 'coding') return;

  const btn = document.getElementById('runCodeBtn');
  const statusEl = document.getElementById('runCodeStatus');
  const resultsBox = document.getElementById('runCodeResultsBox');
  const code = document.getElementById('codeAnswerText').value;
  const language = document.getElementById('codeLanguageSelect').value;

  if (!code.trim()) {
    statusEl.textContent = 'Write some code first.';
    return;
  }

  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = '⏳ Running…';
  statusEl.textContent = '';
  resultsBox.style.display = 'none';

  try {
    const result = await apiFetchPy(`/interviews/${interviewId}/questions/${q.id}/run`, {
      method: 'POST',
      body: JSON.stringify({ codeAnswer: code, codeLanguage: language }),
    });

    const allPassed = result.passed_count === result.total_count && result.total_count > 0;
    const summaryClass = allPassed ? 'run-code-pass' : 'run-code-fail';
    const summaryIcon = allPassed ? '✅' : '⚠️';
    const casesHtml = result.results
      .map(
        (r, i) => `
        <div class="run-code-case">
          <div>Test ${i + 1}: <span class="${r.passed ? 'run-code-case-pass' : 'run-code-case-fail'}">${
            r.passed ? 'PASSED' : 'FAILED'
          }</span></div>
          <div>Input: <code>${escapeHtmlSession(r.input)}</code></div>
          <div>Expected: <code>${escapeHtmlSession(r.expected)}</code></div>
          <div>Got: <code>${escapeHtmlSession(r.actual)}</code></div>
        </div>`
      )
      .join('');

    resultsBox.innerHTML = `
      <div class="run-code-summary ${summaryClass}">
        ${summaryIcon} ${result.passed_count} / ${result.total_count} test cases passed
      </div>
      ${casesHtml}`;
    resultsBox.style.display = 'block';
    statusEl.textContent = 'This is a test run only — it does not save or score your answer. Click "Save & Next" when ready.';
  } catch (err) {
    statusEl.textContent = err.message || 'Could not run your code — check your connection and try again.';
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

function escapeHtmlSession(str) {
  const div = document.createElement('div');
  div.textContent = str === undefined || str === null ? '' : String(str);
  return div.innerHTML;
}

// One countdown for the whole session — sized once at the start from
// computeSessionTimeBudget(questions), so it already scales with the
// question count and its mix of categories/difficulties (5 easy HR
// questions vs. 30 mixed questions each get an appropriately sized
// total instead of a per-question clock).
function startOverallTimer(seconds) {
  clearInterval(overallTimerInterval);
  if (typeof seconds === 'number') overallSecondsLeft = seconds;
  updateOverallTimerDisplay();
  overallTimerInterval = setInterval(() => {
    overallSecondsLeft -= 1;
    updateOverallTimerDisplay();
    if (overallSecondsLeft <= 0) {
      clearInterval(overallTimerInterval);
      showToast("Time's up for the interview — auto-submitting.", 'info');
      autoSubmitDueToTimeout();
    }
  }, 1000);
}

function updateOverallTimerDisplay() {
  const el = document.getElementById('overallTimer');
  const m = Math.floor(Math.max(0, overallSecondsLeft) / 60).toString().padStart(2, '0');
  const s = Math.max(0, overallSecondsLeft % 60).toString().padStart(2, '0');
  el.textContent = `Total ${m}:${s}`;
  el.classList.toggle('session-timer-low', overallSecondsLeft <= 30);
}

async function autoSubmitDueToTimeout() {
  if (finishInProgress || sessionFinished) return;
  await saveCurrentAnswer();
  finishInterview();
}

async function saveCurrentAnswer() {
  const q = questions[currentIndex];
  const qType = q.question_type || 'open';
  const timeTaken = Math.max(0, Math.round((Date.now() - questionStartedAt) / 1000));

  const body = { questionId: q.id, timeTakenSeconds: timeTaken };

  if (qType === 'mcq') {
    const selectedOption = localAnswers[q.id]?.selectedOption || null;
    localAnswers[q.id] = { ...(localAnswers[q.id] || {}), selectedOption };
    body.selectedOption = selectedOption;
    body.answerText = selectedOption || '';
  } else if (qType === 'coding') {
    const codeAnswer = document.getElementById('codeAnswerText').value;
    const codeLanguage = document.getElementById('codeLanguageSelect').value;
    localAnswers[q.id] = { ...(localAnswers[q.id] || {}), codeAnswer, codeLanguage };
    body.codeAnswer = codeAnswer;
    body.codeLanguage = codeLanguage;
    body.answerText = '';
  } else {
    const text = document.getElementById('answerText').value.trim();
    const inputMode = localAnswers[q.id]?.inputMode === 'voice' && !text ? 'typed' : localAnswers[q.id]?.usedVoice ? 'voice' : 'typed';
    localAnswers[q.id] = { text, inputMode, usedVoice: localAnswers[q.id]?.usedVoice };
    body.answerText = text;
    body.inputMode = inputMode;

    // Milestone 3 — pull this question's tallied face-api.js signals
    // (dominant emotion + % of samples where a face was on-camera) and
    // the average Web Speech API recognition confidence (a rough proxy
    // for pronunciation clarity — not true phoneme-level scoring, but a
    // real, non-fabricated signal the browser actually gives us).
    const { dominantEmotion, eyeContactPercentage } = getFaceSignalsForAnswer();
    const pronunciationConfidence = getPronunciationConfidenceForAnswer();
    body.dominantEmotion = dominantEmotion;
    body.eyeContactPercentage = eyeContactPercentage;
    body.pronunciationConfidence = pronunciationConfidence;
  }

  try {
    await apiFetchPy(`/interviews/${interviewId}/answers`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('Failed to save answer:', err);
    showToast('Could not save that answer — check your connection.', 'error');
  }
}

async function goToNextQuestion() {
  document.getElementById('nextBtn').disabled = true;
  await saveCurrentAnswer();
  document.getElementById('nextBtn').disabled = false;

  if (currentIndex === questions.length - 1) {
    finishInterview();
  } else {
    renderQuestion(currentIndex + 1);
  }
}

// ---------------------------------------------------------------
// Finish
// ---------------------------------------------------------------
async function finishInterview() {
  if (finishInProgress || sessionFinished) return;
  finishInProgress = true;
  sessionActive = false;

  clearInterval(overallTimerInterval);
  clearInterval(faceCheckTimer);
  clearInterval(liveHudTimer);
  stopVoiceInputIfActive();

  // Stop the recorder first (while the stream is still live) so its
  // final chunk flushes cleanly, then release the camera/mic.
  const recordingBlob = await stopRecordingAndGetBlob();
  stopWebcamTracks(); // turn the camera off right away — proctoring listeners (incl. the
                       // leave-page guard) stay armed until everything below settles
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  document.getElementById('sessionShell').style.display = 'none';
  const overlay = document.getElementById('finishOverlay');
  overlay.style.display = 'flex';
  document.getElementById('finishHeading').textContent = '⏳ Scoring your interview…';
  document.getElementById('finishSubtext').textContent = 'The AI is reviewing your answers. This takes a few seconds.';
  document.getElementById('finishScoreBox').style.display = 'none';
  document.getElementById('scoreSheetBox').style.display = 'none';

  try {
    const result = await apiFetchPy(`/interviews/${interviewId}/finish`, { method: 'PATCH' });
    document.getElementById('finishHeading').textContent = '✅ Interview complete';
    document.getElementById('finishSubtext').textContent = `"${result.interview_type}" — report ready.`;
    document.getElementById('finishScoreBox').style.display = 'block';
    document.getElementById('finishScoreCircle').textContent = `${result.score}%`;
    document.getElementById('finishFeedbackText').textContent = result.ai_feedback || '';

    await loadAndRenderScoreSheet();
    await loadAndRenderCommunicationReport();
  } catch (err) {
    document.getElementById('finishHeading').textContent = '⚠️ Could not score interview';
    document.getElementById('finishSubtext').textContent =
      err.message || 'Something went wrong while scoring. Your answers were saved — try again from the dashboard.';
  }

  // Uploading the recording never blocks or fails the score above —
  // it's a best-effort add-on, handled (and reported) entirely inside
  // uploadRecording() itself.
  await uploadRecording(recordingBlob);

  // Only now is it safe to let the candidate navigate away freely.
  sessionFinished = true;
  finishInProgress = false;
  removeProctoringListeners();
}

async function autoSubmitDueToViolations() {
  if (finishInProgress || sessionFinished) return;
  showToast('Too many proctoring warnings — auto-submitting your interview.', 'error');
  await saveCurrentAnswer();
  finishInterview();
}

// ---------------------------------------------------------------
// Question audio (reuses the same authenticated-blob approach as
// script.js's playQuestionAudio, scoped to the current question)
// ---------------------------------------------------------------
async function playCurrentQuestionAudio() {
  const q = questions[currentIndex];
  const btn = document.getElementById('playAudioBtn');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ Loading…';
  try {
    const token = getToken();
    const res = await fetch(`${PY_API_BASE_URL}/interviews/${interviewId}/questions/${q.id}/tts`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Could not generate audio for this question.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    btn.textContent = '🔊 Playing…';
    audio.addEventListener('ended', () => {
      btn.textContent = original;
      btn.disabled = false;
      URL.revokeObjectURL(url);
    });
    await audio.play();
  } catch (err) {
    showToast(err.message || 'Could not play question audio.', 'error');
    btn.textContent = original;
    btn.disabled = false;
  }
}

// ---------------------------------------------------------------
// Voice answer input (Web Speech API — Chrome/Edge). Falls back
// gracefully with a disabled button + note on unsupported browsers.
// ---------------------------------------------------------------
function toggleVoiceInput() {
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    document.getElementById('micStatus').textContent = 'Voice input is not supported in this browser — try Chrome.';
    return;
  }

  if (micActive) {
    stopVoiceInputIfActive();
    return;
  }

  recognition = new SpeechRecognitionCtor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  const textarea = document.getElementById('answerText');
  baseTextBeforeVoice = textarea.value ? `${textarea.value.trim()} ` : '';

  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
        // Milestone 3 — pronunciation proxy: confidence is only
        // meaningful on final results, not interim guesses.
        const confidence = event.results[i][0].confidence;
        if (typeof confidence === 'number' && confidence > 0) {
          pronunciationConfidenceSamples.push(confidence);
        }
      } else {
        interimTranscript += transcript;
      }
    }
    if (finalTranscript) baseTextBeforeVoice += `${finalTranscript} `;
    textarea.value = baseTextBeforeVoice + interimTranscript;
    const q = questions[currentIndex];
    localAnswers[q.id] = { ...(localAnswers[q.id] || {}), usedVoice: true };
  };

  recognition.onerror = (event) => {
    document.getElementById('micStatus').textContent = `Voice input error: ${event.error}`;
    stopVoiceInputIfActive();
  };

  recognition.onend = () => {
    if (micActive) {
      // Some browsers auto-stop after a pause — restart seamlessly
      // while the mic button is still toggled on.
      try {
        recognition.start();
      } catch (e) {
        micActive = false;
        updateMicButton();
      }
    }
  };

  try {
    recognition.start();
    micActive = true;
    updateMicButton();
    document.getElementById('micStatus').textContent = 'Listening…';
  } catch (err) {
    document.getElementById('micStatus').textContent = 'Could not start voice input.';
  }
}

function stopVoiceInputIfActive() {
  micActive = false;
  if (recognition) {
    try {
      recognition.onend = null;
      recognition.stop();
    } catch (e) {
      /* no-op */
    }
    recognition = null;
  }
  updateMicButton();
  const status = document.getElementById('micStatus');
  if (status && status.textContent === 'Listening…') status.textContent = '';
}

function updateMicButton() {
  const btn = document.getElementById('micBtn');
  if (!btn) return;
  btn.classList.toggle('session-mic-active', micActive);
  btn.textContent = micActive ? '⏹ Stop Voice Answer' : '🎙️ Start Voice Answer';
}

// ---------------------------------------------------------------
// Proctoring — violation logging (shared by all detectors below)
// ---------------------------------------------------------------
async function logViolation(type, message) {
  const now = Date.now();
  if (lastViolationAt[type] && now - lastViolationAt[type] < VIOLATION_COOLDOWN_MS) {
    return; // still cooling down — don't spam the same warning repeatedly
  }
  lastViolationAt[type] = now;

  strikeCount += 1;
  updateStrikeBadge();
  showWarningBanner(message);
  appendWarningLog(message);
  showToast(message, 'error');

  if (!sessionActive || sessionPaused) return;

  try {
    const result = await apiFetchPy(`/interviews/${interviewId}/violation`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
    if (result && (result.auto_submit || result.violations >= MAX_STRIKES)) {
      autoSubmitDueToViolations();
    }
  } catch (err) {
    console.error('Failed to log violation:', err);
  }
}

function updateStrikeBadge() {
  const el = document.getElementById('strikeBadge');
  el.textContent = `⚠ ${strikeCount}/${MAX_STRIKES} warnings`;
  el.classList.toggle('session-strikes-critical', strikeCount >= MAX_STRIKES - 1);
}

function showWarningBanner(message) {
  const banner = document.getElementById('warningBanner');
  banner.textContent = `⚠ ${message}`;
  banner.style.display = 'block';
  clearTimeout(showWarningBanner._t);
  showWarningBanner._t = setTimeout(() => {
    banner.style.display = 'none';
  }, 5000);
}

function appendWarningLog(message) {
  const list = document.getElementById('warningLog');
  const empty = list.querySelector('.session-warning-log-empty');
  if (empty) empty.remove();
  const li = document.createElement('li');
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  li.textContent = `${time} — ${message}`;
  list.prepend(li);
}

// ---------------------------------------------------------------
// Proctoring — tab focus / fullscreen / copy-paste
// ---------------------------------------------------------------
function attachProctoringListeners() {
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleWindowBlur);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('copy', handleCopyPasteBlock);
  document.addEventListener('paste', handleCopyPasteBlock);
  document.addEventListener('contextmenu', handleCopyPasteBlock);
  window.addEventListener('beforeunload', handleBeforeUnload);

  setChecklistState('chkTab', 'ok', 'Focused');
  setChecklistState('chkFullscreen', document.fullscreenElement ? 'ok' : 'warn', document.fullscreenElement ? 'Active' : 'Not active');
}

function handleVisibilityChange() {
  if (!sessionActive || sessionPaused) return;
  if (document.hidden) {
    setChecklistState('chkTab', 'bad', 'Switched away');
    logViolation('tab_switch', 'You switched away from the interview tab.');
  } else {
    setChecklistState('chkTab', 'ok', 'Focused');
  }
}

function handleWindowBlur() {
  if (!sessionActive || sessionPaused) return;
  setChecklistState('chkTab', 'bad', 'Lost focus');
  logViolation('tab_switch', 'The interview window lost focus.');
}

function handleFullscreenChange() {
  if (!sessionActive || sessionPaused) return;
  if (!document.fullscreenElement) {
    setChecklistState('chkFullscreen', 'bad', 'Exited');
    logViolation('fullscreen_exit', 'You exited fullscreen mode.');
  } else {
    setChecklistState('chkFullscreen', 'ok', 'Active');
  }
}

function handleCopyPasteBlock(e) {
  if (!sessionActive || sessionPaused) return;
  e.preventDefault();
  logViolation('copy_paste', 'Copy/paste/right-click is disabled during the assessment.');
}

function handleBeforeUnload(e) {
  if (!sessionFinished && (sessionActive || finishInProgress)) {
    e.preventDefault();
    e.returnValue = '';
  }
}

function setChecklistState(id, state, label) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('ok', 'warn', 'bad');
  el.classList.add(state);
  const span = el.querySelector('span');
  if (span) span.textContent = label;
}

function stopWebcamTracks() {
  stopMicLevelMeter();
  if (webcamStream) {
    webcamStream.getTracks().forEach((t) => t.stop());
    webcamStream = null;
  }
}

// ---------------------------------------------------------------
// Microphone level meter — small live bar showing the mic is
// actually picking up audio, driven by the same stream's audio track.
// ---------------------------------------------------------------
function startMicLevelMeter() {
  if (!webcamStream || webcamStream.getAudioTracks().length === 0) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  try {
    micAudioCtx = new AudioCtx();
    const source = micAudioCtx.createMediaStreamSource(webcamStream);
    micAnalyser = micAudioCtx.createAnalyser();
    micAnalyser.fftSize = 512;
    source.connect(micAnalyser);

    const data = new Uint8Array(micAnalyser.frequencyBinCount);
    const bar = document.getElementById('micLevelBar');

    micLevelTimer = setInterval(() => {
      if (!micAnalyser) return;
      micAnalyser.getByteFrequencyData(data);
      const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
      const pct = Math.min(100, Math.round((avg / 160) * 100));
      if (bar) bar.style.width = `${pct}%`;
    }, 150);
  } catch (err) {
    console.warn('Mic level meter unavailable:', err);
  }
}

function stopMicLevelMeter() {
  clearInterval(micLevelTimer);
  micLevelTimer = null;
  micAnalyser = null;
  if (micAudioCtx) {
    micAudioCtx.close().catch(() => {});
    micAudioCtx = null;
  }
}

// ---------------------------------------------------------------
// Recording — captures the session's webcam/mic stream to a single
// video file, uploaded once when the session ends. Pausing the
// session pauses the recorder too (MediaRecorder.pause()), so paused
// time isn't captured, matching the "no answers are being recorded"
// message already shown on the paused overlay.
// ---------------------------------------------------------------
function pickRecordingMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return RECORDING_MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

function startRecording() {
  if (typeof MediaRecorder === 'undefined') {
    console.warn('MediaRecorder is not supported in this browser — session will not be recorded.');
    return;
  }
  if (!webcamStream || webcamStream.getTracks().length === 0) return;

  recordingMimeType = pickRecordingMimeType();
  recordedChunks = [];

  try {
    mediaRecorder = recordingMimeType
      ? new MediaRecorder(webcamStream, { mimeType: recordingMimeType })
      : new MediaRecorder(webcamStream);
  } catch (err) {
    console.warn('Could not start session recording:', err);
    mediaRecorder = null;
    return;
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.onerror = (e) => {
    console.warn('Recording error:', e.error || e);
  };

  recordingMimeType = recordingMimeType || mediaRecorder.mimeType || 'video/webm';
  recordingStartedAt = new Date();
  recordingSegmentStartedAt = Date.now();
  recordingSecondsRecorded = 0;

  // 1s timeslices so ondataavailable fires incrementally rather than
  // only at stop() — keeps memory bounded for longer sessions and
  // means a crash/tab-close still leaves earlier chunks recoverable
  // in principle, even though today only the final upload uses them.
  mediaRecorder.start(1000);
  updateRecordingIndicator(true);
}

function pauseRecording() {
  if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
  try {
    mediaRecorder.pause();
  } catch (err) {
    console.warn('Could not pause recording:', err);
    return;
  }
  if (recordingSegmentStartedAt) {
    recordingSecondsRecorded += Math.round((Date.now() - recordingSegmentStartedAt) / 1000);
    recordingSegmentStartedAt = null;
  }
  updateRecordingIndicator(false);
}

function resumeRecording() {
  if (!mediaRecorder || mediaRecorder.state !== 'paused') return;
  try {
    mediaRecorder.resume();
  } catch (err) {
    console.warn('Could not resume recording:', err);
    return;
  }
  recordingSegmentStartedAt = Date.now();
  updateRecordingIndicator(true);
}

function updateRecordingIndicator(active) {
  const el = document.getElementById('recordingIndicator');
  if (!el) return;
  el.style.display = mediaRecorder ? 'inline-flex' : 'none';
  el.classList.toggle('session-recording-live', !!active);
  el.textContent = active ? '🔴 REC' : '⏸ REC paused';
}

// Stops the recorder (if any) and resolves with the finished Blob —
// or null if recording never started/isn't supported, so callers can
// treat "no recording" as a non-fatal, expected case.
function stopRecordingAndGetBlob() {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      resolve(null);
      return;
    }
    mediaRecorder.onstop = () => {
      if (recordingSegmentStartedAt) {
        recordingSecondsRecorded += Math.round((Date.now() - recordingSegmentStartedAt) / 1000);
        recordingSegmentStartedAt = null;
      }
      const blob = recordedChunks.length
        ? new Blob(recordedChunks, { type: recordingMimeType || 'video/webm' })
        : null;
      resolve(blob);
    };
    try {
      mediaRecorder.stop();
    } catch (err) {
      console.warn('Could not stop recording cleanly:', err);
      resolve(null);
    }
  });
}

// Uploads the recording blob. Failure here is logged and surfaced as
// a toast but never blocks scoring — the interview's answers/score
// are the part that matters most, and a recording upload issue
// shouldn't strand the candidate on the finish screen.
async function uploadRecording(blob) {
  if (!blob || blob.size === 0) return;
  const heading = document.getElementById('finishHeading');
  const previousHeading = heading ? heading.textContent : '';
  if (heading) heading.textContent = '💾 Saving your session recording…';

  try {
    const formData = new FormData();
    const ext = (recordingMimeType || 'video/webm').includes('mp4') ? 'mp4' : 'webm';
    formData.append('file', blob, `session.${ext}`);
    if (recordingStartedAt) formData.append('startedAt', recordingStartedAt.toISOString());
    formData.append('endedAt', new Date().toISOString());
    formData.append('durationSeconds', String(recordingSecondsRecorded));
    await apiUploadPy(`/interviews/${interviewId}/recording`, formData);
  } catch (err) {
    console.warn('Recording upload failed:', err);
    showToast('Your answers were saved, but the session recording could not be uploaded.', 'error');
  } finally {
    if (heading) heading.textContent = previousHeading;
  }
}

// ---------------------------------------------------------------
// Pause / resume — freezes both timers and suspends proctoring
// warnings until resumed. Webcam preview stays visible throughout.
// ---------------------------------------------------------------
async function togglePauseSession() {
  if (pauseInProgress || !sessionActive) return;
  if (sessionPaused) {
    await resumeSession();
  } else {
    await pauseSession();
  }
}

async function pauseSession() {
  pauseInProgress = true;
  const btn = document.getElementById('pauseBtn');
  if (btn) btn.disabled = true;

  try {
    await apiFetchPy(`/interviews/${interviewId}/pause`, { method: 'PATCH' });
  } catch (err) {
    console.error('Failed to pause interview:', err);
    showToast(err.message || 'Could not pause the interview — check your connection.', 'error');
    pauseInProgress = false;
    if (btn) btn.disabled = false;
    return;
  }

  sessionPaused = true;
  clearInterval(overallTimerInterval);
  clearInterval(faceCheckTimer);
  clearInterval(liveHudTimer);
  stopVoiceInputIfActive();
  pauseRecording();

  document.getElementById('nextBtn').disabled = true;
  document.getElementById('answerText').disabled = true;
  document.getElementById('micBtn').disabled = true;
  document.getElementById('pausedOverlay').style.display = 'flex';
  updateSessionStatusBadge();

  pauseInProgress = false;
  if (btn) {
    btn.disabled = false;
    btn.textContent = '▶ Resume';
  }
}

async function resumeSession() {
  pauseInProgress = true;
  const btn = document.getElementById('pauseBtn');
  if (btn) btn.disabled = true;

  try {
    await apiFetchPy(`/interviews/${interviewId}/resume`, { method: 'PATCH' });
  } catch (err) {
    console.error('Failed to resume interview:', err);
    showToast(err.message || 'Could not resume the interview — check your connection.', 'error');
    pauseInProgress = false;
    if (btn) btn.disabled = false;
    return;
  }

  sessionPaused = false;
  document.getElementById('pausedOverlay').style.display = 'none';
  document.getElementById('nextBtn').disabled = false;
  document.getElementById('answerText').disabled = false;
  document.getElementById('micBtn').disabled = false;
  updateSessionStatusBadge();

  // Resume the overall session countdown from wherever it was frozen,
  // and restart proctoring rather than re-rendering the question (which
  // would reset the candidate's in-progress answer text).
  startOverallTimer();
  setupFaceDetection();
  resumeRecording();
  clearInterval(liveHudTimer);
  liveHudTimer = setInterval(updateLiveAnalyticsHud, 700);

  pauseInProgress = false;
  if (btn) {
    btn.disabled = false;
    btn.textContent = '⏸ Pause';
  }
}

function updateSessionStatusBadge() {
  const el = document.getElementById('sessionStatusBadge');
  if (!el) return;
  const label = sessionPaused ? 'Paused' : sessionActive ? 'In Progress' : 'Scheduled';
  el.textContent = label;
  el.classList.toggle('session-status-paused', sessionPaused);
}

function removeProctoringListeners() {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('blur', handleWindowBlur);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('copy', handleCopyPasteBlock);
  document.removeEventListener('paste', handleCopyPasteBlock);
  document.removeEventListener('contextmenu', handleCopyPasteBlock);
  window.removeEventListener('beforeunload', handleBeforeUnload);
}

// ---------------------------------------------------------------
// Proctoring — webcam face detection (no face / multiple faces /
// looking away). Degrades gracefully if face-api.js can't load
// (offline, CDN blocked) — tab/fullscreen checks still run.
// ---------------------------------------------------------------
async function setupFaceDetection() {
  const label = document.getElementById('faceStatusLabel');
  const dot = document.getElementById('faceStatusDot');

  if (typeof faceapi === 'undefined') {
    label.textContent = 'Face detection unavailable (script failed to load) — tab & fullscreen checks still active.';
    setChecklistState('chkFace', 'warn', 'Unavailable');
    return;
  }

  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL);
  } catch (err) {
    console.warn('Face detection models failed to load:', err);
    label.textContent = 'Face detection unavailable (models failed to load) — tab & fullscreen checks still active.';
    setChecklistState('chkFace', 'warn', 'Unavailable');
    return;
  }

  // Milestone 3 — emotion recognition. Best-effort and separate from
  // the detector above: proctoring (no-face/multi-face/look-away)
  // must keep working even if this second, larger model fails to load
  // on a slow connection.
  try {
    await faceapi.nets.faceExpressionNet.loadFromUri(FACE_MODEL_URL);
    faceExpressionsReady = true;
  } catch (err) {
    console.warn('Face expression model failed to load — emotion tracking disabled:', err);
  }

  faceApiReady = true;
  setChecklistState('chkFace', 'ok', 'Active');
  label.textContent = 'Watching for face presence…';
  dot.className = 'session-face-dot session-face-dot-ok';

  const video = document.getElementById('webcamVideo');
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

  faceCheckTimer = setInterval(async () => {
    if (!sessionActive || sessionPaused || !faceApiReady) return;
    try {
      // Single call — chaining .withFaceExpressions() when the model
      // loaded, or plain detectAllFaces() otherwise — instead of two
      // separate calls per tick (which could theoretically disagree on
      // face count between the two frames sampled a moment apart).
      const detections = faceExpressionsReady
        ? await faceapi.detectAllFaces(video, options).withFaceExpressions()
        : await faceapi.detectAllFaces(video, options);
      handleFaceDetections(detections, video);
    } catch (err) {
      // A transient detection error shouldn't crash the loop.
      console.warn('Face detection frame error:', err);
    }
  }, FACE_CHECK_INTERVAL_MS);
}

function handleFaceDetections(detections, video) {
  const dot = document.getElementById('faceStatusDot');
  const label = document.getElementById('faceStatusLabel');

  // Module 6 — Emotion Detection & Eye Tracking: every detection tick
  // (whether or not it's a violation) is one "sample" for this
  // question's eye-contact percentage; a sample only counts as
  // "on-camera" when exactly one face is present and roughly centered
  // (i.e. not a proctoring violation below). Emotion is tallied the
  // same tick, from face-api.js's expression scores, whenever the
  // expression model loaded successfully.
  faceTotalSamples += 1;

  if (detections.length === 0) {
    noFaceStreak += 1;
    if (noFaceStreak >= NO_FACE_STRIKES_BEFORE_WARN) {
      dot.className = 'session-face-dot session-face-dot-bad';
      label.textContent = 'No face detected — make sure you are visible on camera.';
      logViolation('no_face', 'No face detected on camera.');
    } else {
      dot.className = 'session-face-dot session-face-dot-warn';
      label.textContent = 'Checking for your face…';
    }
    updateLiveAnalyticsHud();
    return;
  }

  noFaceStreak = 0;

  if (detections.length > 1) {
    dot.className = 'session-face-dot session-face-dot-bad';
    label.textContent = `${detections.length} faces detected — only the candidate should be visible.`;
    logViolation('multi_face', `${detections.length} faces detected in frame.`);
    updateLiveAnalyticsHud();
    return;
  }

  // Single face — rough "looking away" heuristic: is the face's
  // bounding-box center significantly off from the frame center?
  // NOTE: detectAllFaces() alone returns FaceDetection[] with `.box`
  // directly, but .withFaceExpressions() nests it under `.detection.box`
  // instead (`{ detection, expressions }`). Reading `.box` unconditionally
  // used to throw here whenever the expression model had loaded (the
  // normal case) — silently swallowed by the caller's try/catch — so
  // faceOnCameraSamples never incremented and eye-contact% was always 0.
  const det = detections[0];
  const box = det.detection ? det.detection.box : det.box;
  const faceCenterX = box.x + box.width / 2;
  const frameCenterX = video.videoWidth / 2 || 240;
  const offsetRatio = Math.abs(faceCenterX - frameCenterX) / (video.videoWidth || 480);

  // Emotion tally — read whichever expression face-api.js scored
  // highest for this frame (e.g. "neutral", "happy", "surprised").
  if (faceExpressionsReady && det.expressions) {
    const expressions = det.expressions;
    let topEmotion = null;
    let topScore = 0;
    for (const [emotion, score] of Object.entries(expressions)) {
      if (score > topScore) {
        topScore = score;
        topEmotion = emotion;
      }
    }
    if (topEmotion) {
      faceEmotionTally[topEmotion] = (faceEmotionTally[topEmotion] || 0) + 1;
    }
  }

  if (offsetRatio > 0.28) {
    dot.className = 'session-face-dot session-face-dot-warn';
    label.textContent = 'Please look at the screen.';
    logViolation('look_away', 'You appear to be looking away from the screen.');
  } else {
    dot.className = 'session-face-dot session-face-dot-ok';
    label.textContent = 'Face detected — you are good.';
    faceOnCameraSamples += 1; // only a clean, centered, single-face frame counts as "on camera"
  }
  updateLiveAnalyticsHud();
}
