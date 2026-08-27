/* ── Module 6 · Task 1: Face Detection & Frame Processing (client sampler) ──
   Samples frames from the live interview webcam, ships them to the backend
   vision pipeline (~every 1.5s), and patches live status UI without a full
   re-render. */

var VisionMonitor = {
  SAMPLE_MS: 1500,
  MAX_WIDTH: 480,
  JPEG_QUALITY: 0.55,
  MAX_CONSECUTIVE_ERRORS: 4,

  _timer: null,
  _interviewId: null,
  _busy: false,
  _paused: false,
  _errors: 0,
  _terminatedHandled: false,
  onTerminate: null,

  start: function (interviewId) {
    if (!interviewId) return;
    this._interviewId = interviewId;
    this._paused = false;
    this._errors = 0;
    this._terminatedHandled = false;
    if (!this._timer) {
      var self = this;
      this._timer = setInterval(function () { self._tick(); }, this.SAMPLE_MS);
    }
    this._tick();
  },

  stop: function () {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this._busy = false;
    this._paused = false;
    this._errors = 0;
    this._interviewId = null;
  },

  pause: function () { this._paused = true; },
  resume: function () { this._paused = false; },

  isRunning: function () { return !!this._timer && !!this._interviewId; },

  _videoReady: function (video) {
    if (!video || video.readyState < 2 || !video.videoWidth) return false;
    var stream = state.interviewStream;
    if (!stream || !stream.active) return false;
    var tracks = stream.getVideoTracks();
    if (!tracks.length || tracks[0].readyState !== 'live') return false;
    if (tracks[0].muted === true || tracks[0].enabled === false) return false;
    return true;
  },

  _captureFrame: function (video) {
    if (!this._canvas) {
      this._canvas = document.createElement('canvas');
      this._ctx = this._canvas.getContext('2d');
    }
    var scale = Math.min(1, this.MAX_WIDTH / video.videoWidth);
    var w = Math.max(2, Math.round(video.videoWidth * scale));
    var h = Math.max(2, Math.round(video.videoHeight * scale));
    if (this._canvas.width !== w || this._canvas.height !== h) {
      this._canvas.width = w;
      this._canvas.height = h;
    }
    this._ctx.drawImage(video, 0, 0, w, h);
    return this._canvas.toDataURL('image/jpeg', this.JPEG_QUALITY);
  },

  _tick: function () {
    var self = this;
    if (this._paused || this._busy || !this._interviewId) return;
    if (document.visibilityState === 'hidden') return;

    var video = document.getElementById('candidate-camera');
    if (!this._videoReady(video)) {
      patchVisionUI({ status: 'camera_off', face_present: false, face_count: 0, quality: null, warnings: [] });
      return;
    }

    var dataUrl;
    try {
      dataUrl = this._captureFrame(video);
    } catch (e) {
      return;
    }

    this._busy = true;
    api.sendVisionFrame(this._interviewId, dataUrl).then(function (result) {
      self._busy = false;
      self._errors = 0;
      state.vision = result;
      state.vision.updatedAt = Date.now();
      patchEmotionUI(result.emotion);
      patchConfidenceUI(result.summary);
      if (result.attention) {
        var prevWarnings = (state.attention && typeof state.attention.warnings === 'number')
          ? state.attention.warnings : result.attention.warnings || 0;
        result.attention.warningFlash = (result.attention.warnings || 0) > prevWarnings;
        state.attention = result.attention;
        patchAttentionUI(result.attention);
        if (result.attention.warningFlash && typeof showToast === 'function') {
          var warnNo = result.attention.warnings || 1;
          var warnMax = result.attention.max_warnings || 5;
          var left = warnMax - warnNo;
          showToast(
            'Attention Warning ' + warnNo + ' / ' + warnMax +
            ' &mdash; please look back at the camera' +
            (left > 0 ? ' (' + left + ' more before the interview ends)' : ' &mdash; interview will now end'),
            'warning', 5000
          );
        }
      }
      patchVisionUI(result);
      if (
        result.attention && result.attention.should_terminate &&
        !self._terminatedHandled && typeof self.onTerminate === 'function'
      ) {
        self._terminatedHandled = true;
        self.onTerminate(result);
      }
    }).catch(function (err) {
      self._busy = false;
      self._errors += 1;
      if (self._errors >= self.MAX_CONSECUTIVE_ERRORS) {
        state.vision = { status: 'unavailable', error: err && err.message };
        patchVisionUI(state.vision);
        self.stop();
      }
    });
  },
};

function visionStatusMeta(vision) {
  var v = vision || {};
  switch (v.status) {
    case 'face_detected':
      return { label: 'Face Locked', color: '#10b981', textClass: 'text-emerald-400' };
    case 'multiple_faces':
      return { label: 'Multiple Faces!', color: '#f43f5e', textClass: 'text-rose-400' };
    case 'no_face':
      return { label: 'No Face Detected', color: '#f59e0b', textClass: 'text-amber-300' };
    case 'invalid_frame':
    case 'processing_error':
      return { label: 'Re-analyzing…', color: '#fbbf24', textClass: 'text-amber-300' };
    case 'unavailable':
      return { label: 'Vision Offline', color: '#64748b', textClass: 'text-white/40' };
    case 'camera_off':
      return { label: 'Camera Off', color: '#f43f5e', textClass: 'text-rose-400' };
    default:
      return { label: 'Initializing…', color: '#818cf8', textClass: 'text-indigo-300' };
  }
}

/* Subtle candidate-facing focus bucket — raw percentages stay in the report */
function visionFocusMeta(vision) {
  var label = vision && vision.summary && vision.summary.eye ? vision.summary.eye.focus_label : null;
  if (!label || label === 'No Data') return { label: 'Analyzing', color: '#818cf8' };
  if (label === 'Good') return { label: 'Good', color: '#10b981' };
  if (label === 'Fair') return { label: 'Fair', color: '#f59e0b' };
  return { label: 'Low', color: '#f43f5e' };
}

/* Task 5: friendly emotion label for the live telemetry tile (no raw numbers).
   Keys are the Emotion CNN states; legacy FER keys kept for old live sessions. */
function emotionFriendlyLabel(dominant) {
  switch (dominant) {
    case 'confidence': return 'Confident';
    case 'nervousness': return 'Nervous';
    case 'fear': return 'Fearful';
    case 'confused': return 'Confused';
    /* legacy */
    case 'happy': return 'Positive';
    case 'neutral': return 'Calm';
    default: return 'Tense';
  }
}

/* Task 5: emotion tile refreshes only on NEW scheduler analyses (every 2s max) */
var _lastEmotionAt = 0;

function patchEmotionUI(emotion) {
  var el = document.getElementById('telemetry-emo-val');
  if (!el) return;
  if (!emotion || !emotion.dominant) {
    if (emotion === null && Date.now() - _lastEmotionAt > 12000) {
      el.textContent = 'Composed';
      _lastEmotionAt = 0;
    }
    return;
  }
  var analyzedAt = emotion.analyzed_at || 0;
  if (analyzedAt <= _lastEmotionAt) {
    if (typeof emotion.age_s === 'number' && emotion.age_s > 12) {
      el.textContent = 'Composed';
    }
    return;
  }
  _lastEmotionAt = analyzedAt;
  el.textContent = emotionFriendlyLabel(emotion.dominant);
}

/* Task 6: subtle live Confidence Indicator in the telemetry sub-line */
function patchConfidenceUI(summary) {
  var sub = document.getElementById('telemetry-emo-sub');
  if (!sub || !summary || !summary.confidence_indicator) return;
  var ci = summary.confidence_indicator;
  if (ci.score === null || ci.score === undefined) return;
  sub.textContent = 'Indicator: ' + ci.score.toFixed(0) + ' · ' + (ci.band || '');
}

/* ── Task 4: attention state + warning counter UI (Task 4 spec) ── */
function attentionStateMeta(attention) {
  var a = attention || {};
  switch (a.state) {
    case 'ATTENTIVE':
      return { label: 'Attentive', color: '#10b981' };
    case 'PARTIALLY_ATTENTIVE':
      return { label: 'Partially Attentive', color: '#f59e0b' };
    case 'DISTRACTED':
      return { label: 'Distracted', color: '#f43f5e' };
    case 'NO_FACE':
      return { label: 'No Face', color: '#f43f5e' };
    default:
      return { label: 'Monitoring', color: '#818cf8' };
  }
}

function patchAttentionUI(attention) {
  var meta = attentionStateMeta(attention);
  var dot = document.getElementById('attention-state-dot');
  var label = document.getElementById('attention-state-label');
  if (dot) dot.style.background = meta.color;
  if (label) label.textContent = 'Attention: ' + meta.label;

  var count = document.getElementById('attention-warning-count');
  var chip = document.getElementById('attention-warning-chip');
  if (count) {
    count.textContent = (attention.warnings || 0) + ' / ' + (attention.max_warnings || 5);
  }
  if (chip) {
    var w = attention.warnings || 0;
    chip.classList.toggle('sh-attn-warn-active', w > 0);
    chip.classList.toggle('sh-attn-warn-critical', w >= (attention.max_warnings || 5) - 1);
    if (attention.warningFlash) {
      chip.classList.remove('sh-attn-flash');
      void chip.offsetWidth;
      chip.classList.add('sh-attn-flash');
    }
  }

  var awayEl = document.getElementById('attention-away-note');
  if (awayEl) {
    var sev = attention.severity || 'normal';
    var note = '';
    if (sev === 'significant') note = 'Please look back at the camera';
    else if (sev === 'attention_warning') note = 'Stay focused on the camera';
    awayEl.textContent = note;
    awayEl.classList.toggle('hidden', !note);
  }
}

/* Direct DOM patching so the live feed doesn't need a React-style re-render */
function patchVisionUI(vision) {
  var faceMeta = visionStatusMeta(vision);
  var focusMeta = visionFocusMeta(vision);

  var showFocus = !vision || vision.status === 'face_detected';
  var dot = document.getElementById('vision-gaze-dot');
  var label = document.getElementById('vision-gaze-label');
  if (dot) dot.style.background = showFocus ? focusMeta.color : faceMeta.color;
  if (label) label.textContent = showFocus ? ('Camera Focus: ' + focusMeta.label) : faceMeta.label;

  var badge = document.getElementById('vision-overlay-badge');
  if (badge) {
    var showBadge = vision && vision.status !== 'face_detected' && vision.status !== 'camera_off';
    badge.classList.toggle('hidden', !showBadge);
    badge.className = badge.className.replace(/vision-badge-\S+/g, '');
    badge.classList.add('vision-badge-' + (vision ? vision.status : 'init'));
    var badgeText = document.getElementById('vision-overlay-text');
    if (badgeText) badgeText.textContent = faceMeta.label;
  }
}
