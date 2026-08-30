/**
 * Module 6 — live on-camera tracking, entirely in the browser.
 *
 * Reads the camera preview that LiveSession already has on screen, runs
 * MediaPipe's face landmarker over it a few times a second, and reduces each
 * detection to one small sample: where the candidate was looking, and what
 * their face was doing. Nothing else is kept — the landmarks and blendshape
 * magnitudes are read, classified, and thrown away in the same tick.
 *
 * No video, no frame, and no landmark ever leaves the machine. The only thing
 * that reaches the server is the array of samples at the end of the session,
 * and the server turns those into totals.
 *
 * On honesty, because the vocabulary here invites overclaiming:
 *
 *   What is measured is facial muscle activation and eye direction. "Tense"
 *   is an inference from a lowered brow, not a claim about how the candidate
 *   felt — people concentrate with the same face they worry with. And this is
 *   uncalibrated: there is no per-user setup step, so "looking at the camera"
 *   is an estimate from eye direction and head pose, good for "you spent a lot
 *   of this session looking down" and not good enough for anything finer.
 */

export const GAZE = { CAMERA: 'camera', DOWN: 'down', SIDE: 'side', AWAY: 'away' };
// Expression is read from MediaPipe's facial action units by the thresholds
// below. NEUTRAL means "nothing read" — no face visible — and the sample's
// face_present flag distinguishes that from a measured reading.
export const EXPRESSION = {
  CONFIDENT: 'confident',
  NERVOUS: 'nervous',
  FEAR: 'fear',
  NEUTRAL: 'neutral',
};

/**
 * Thresholds for the three states, on MediaPipe's 0-1 blendshape scale.
 *
 * HONESTY NOTE, and it matters more here than anywhere else in this file:
 * unlike the gaze thresholds — which were measured against real recordings and
 * are calibrated per session — these are **not validated**. There is no
 * measurement behind them saying how often "nervous" is actually nervous.
 * They encode a plausible reading of well-known facial action units, nothing
 * stronger:
 *
 *   fear     raised inner brow + wide eyes + dropped jaw (AU 1+2+5+26)
 *   nervous  lowered/knitted brow, pressed or tightened lips (AU 4+24)
 *   confident  the absence of both, optionally with a slight smile
 *
 * "Fear" is the shakiest: its signature overlaps heavily with plain surprise,
 * and a webcam at desk height sees brows poorly. Everywhere these surface they
 * are labelled estimates, and nothing ranks on them.
 */
export const EXPRESSION_THRESHOLDS = {
  browInnerUp: 0.35,
  eyeWide: 0.3,
  jawOpen: 0.3,
  browDown: 0.45,
  mouthPress: 0.35,
  smile: 0.25,
  // Tension at or above this reads as nervous rather than confident.
  tension: 0.4,
};

const MODEL_PATH = '/models/face_landmarker.task';
const WASM_PATH = '/models/wasm';

// Sampling rate. Fast enough to catch a glance away, slow enough to leave the
// machine alone — this runs alongside an active MediaRecorder, and the
// recording matters more than the tracking does.
export const SAMPLE_HZ = 4;
const SAMPLE_INTERVAL_MS = 1000 / SAMPLE_HZ;

// How long a candidate must be looking away before the nudge appears. Long
// enough that thinking, or a glance at the question, does not trigger it.
export const ALERT_AFTER_MS = 4000;
const ALERT_AFTER_SAMPLES = Math.round(ALERT_AFTER_MS / SAMPLE_INTERVAL_MS);

/**
 * Thresholds, all on MediaPipe's 0-1 blendshape scale except the head angles,
 * which are radians.
 *
 * The eye ones are OFFSETS above each candidate's own measured resting level,
 * not absolute values, because measuring two real recordings showed an
 * absolute threshold cannot work:
 *
 *                       recording A      recording B
 *     eyeLookDown min       0.217            0.031
 *     sideways median       0.154            0.327
 *
 * MediaPipe's neutral is not zero, and worse, where it sits depends on the
 * person and their setup — how high the webcam is, how square they sit to it.
 * Recording B's *resting* sideways value is close to recording A's
 * *looking-away* range. One fixed number tuned on A either nags B constantly
 * or never fires for A; there is no value that serves both.
 *
 * So the tracker spends its first few seconds learning the candidate's own
 * neutral and sets its thresholds relative to that. The offsets below are the
 * gap between resting and genuine glances, which did hold across both
 * recordings even though the absolute levels did not.
 *
 * Expression thresholds stay absolute: they are coarse three-way buckets, and
 * a misread there costs a label, not a nagging on-screen alert.
 */
export const THRESHOLDS = {
  // Offsets above the measured per-session baseline.
  eyeDownOffset: 0.28,
  eyeSideOffset: 0.35,
  // Clamps, so a candidate who spends the calibration window looking at their
  // keyboard cannot teach the tracker that this is normal for them.
  eyeDownRange: [0.35, 0.7],
  eyeSideRange: [0.4, 0.72],
  // Head angles are absolute: they are geometry, not a per-face signal.
  headYaw: 0.35, // ~20°
  headPitchDown: 0.3, // ~17°
};

// How long to spend learning the candidate's neutral before classifying. At
// SAMPLE_HZ this is about five seconds — long enough to be representative,
// short enough that little of the interview goes unjudged.
const CALIBRATION_SAMPLES = 20;

const clamp = (value, [low, high]) => Math.min(high, Math.max(low, value));

const median = (values) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const shapeValue = (shapes, name) => shapes[name] ?? 0;
const avg = (a, b) => (a + b) / 2;

/**
 * Head yaw and pitch from MediaPipe's 4×4 facial transformation matrix.
 *
 * The matrix arrives column-major as a flat 16-element array. Yaw and pitch
 * are enough here — roll (a tilted head) says nothing about where someone is
 * looking, so it is not extracted.
 */
export function headPose(matrix) {
  if (!matrix || matrix.length < 16) return { yaw: 0, pitch: 0 };
  const m = matrix;
  // Column-major: m[0..2] is the first column, m[4..6] the second, etc.
  const yaw = Math.atan2(m[8], m[10]);
  const pitch = Math.atan2(-m[9], Math.hypot(m[8], m[10]));
  return { yaw, pitch };
}

/** The two eye-direction signals classifyGaze works from. */
export function gazeSignals(shapes) {
  // Looking left: the left eye rotates outward while the right rotates in.
  const lookingLeft = avg(
    shapeValue(shapes, 'eyeLookOutLeft'),
    shapeValue(shapes, 'eyeLookInRight')
  );
  const lookingRight = avg(
    shapeValue(shapes, 'eyeLookInLeft'),
    shapeValue(shapes, 'eyeLookOutRight')
  );
  return {
    sideways: Math.max(lookingLeft, lookingRight),
    down: avg(shapeValue(shapes, 'eyeLookDownLeft'), shapeValue(shapes, 'eyeLookDownRight')),
  };
}

/**
 * Turn a measured resting level into this session's thresholds.
 *
 * Clamped, so a candidate who happened to be looking at their notes through
 * the calibration window cannot push the threshold so high that nothing ever
 * registers — or, at the other end, so low that everything does.
 */
export function thresholdsFromBaseline(baseline) {
  return {
    down: clamp(baseline.down + THRESHOLDS.eyeDownOffset, THRESHOLDS.eyeDownRange),
    sideways: clamp(baseline.sideways + THRESHOLDS.eyeSideOffset, THRESHOLDS.eyeSideRange),
  };
}

/**
 * Which zone the candidate was looking at.
 *
 * Eye direction and head pose are both consulted because they fail in
 * different ways: eyes flick down to a keyboard without the head moving, and
 * a head turned to a second monitor can leave the eyes centred in their
 * sockets. Either signal alone misses one of those.
 *
 * `limits` comes from thresholdsFromBaseline — this session's learned levels,
 * not global constants. See THRESHOLDS for why that has to be per-session.
 */
export function classifyGaze(shapes, pose, limits) {
  if (!shapes) return GAZE.AWAY;

  const { yaw = 0, pitch = 0 } = pose || {};
  const { sideways, down } = gazeSignals(shapes);
  const bounds = limits || thresholdsFromBaseline({ down: 0.29, sideways: 0.15 });

  // Turned away is checked first: a head turned to a second screen is a
  // clearer signal than whatever the eyes are doing inside it.
  if (Math.abs(yaw) > THRESHOLDS.headYaw || sideways > bounds.sideways) {
    return GAZE.SIDE;
  }

  if (pitch < -THRESHOLDS.headPitchDown || down > bounds.down) {
    return GAZE.DOWN;
  }

  return GAZE.CAMERA;
}

/**
 * The two tension signals the expression read is built from.
 *
 * Exported so they can be reasoned about (and tested) without a camera.
 */
export function expressionSignals(shapes) {
  const browInnerUp = shapeValue(shapes, 'browInnerUp');
  const eyeWide = avg(shapeValue(shapes, 'eyeWideLeft'), shapeValue(shapes, 'eyeWideRight'));
  const jawOpen = shapeValue(shapes, 'jawOpen');
  const browDown = avg(shapeValue(shapes, 'browDownLeft'), shapeValue(shapes, 'browDownRight'));
  const mouthPress = avg(
    shapeValue(shapes, 'mouthPressLeft'),
    shapeValue(shapes, 'mouthPressRight')
  );
  const smile = avg(shapeValue(shapes, 'mouthSmileLeft'), shapeValue(shapes, 'mouthSmileRight'));

  return { browInnerUp, eyeWide, jawOpen, browDown, mouthPress, smile };
}

/**
 * Expression as one of confident / nervous / fear.
 *
 * Fear is checked first because its signature is the most specific — raised
 * inner brow AND wide eyes AND a dropped jaw together are unlike the other
 * two. Nervous is next: a lowered brow or pressed lips. Confident is what
 * remains, which is the honest ordering: it is the absence of visible tension
 * rather than a positive signal of its own.
 *
 * Uncalibrated. See EXPRESSION_THRESHOLDS.
 */
export function classifyExpression(shapes) {
  if (!shapes) return EXPRESSION.NEUTRAL;
  const t = EXPRESSION_THRESHOLDS;
  const s = expressionSignals(shapes);

  if (s.browInnerUp > t.browInnerUp && s.eyeWide > t.eyeWide && s.jawOpen > t.jawOpen) {
    return EXPRESSION.FEAR;
  }
  if (s.browDown > t.browDown || s.mouthPress > t.mouthPress) {
    return EXPRESSION.NERVOUS;
  }
  return EXPRESSION.CONFIDENT;
}

/**
 * A continuous 0-1 read of how composed the face looks, which becomes the
 * confidence percentage once averaged across a session.
 *
 * Built as "one minus the visible tension", with a small credit for a genuine
 * smile. Continuous rather than derived from the label so the percentage
 * moves smoothly instead of stepping between three values — a session that is
 * borderline throughout should read as borderline, not flip.
 *
 * This is an estimate from facial movement, not a measurement of how
 * confident anyone feels.
 */
export function confidenceScore(shapes) {
  if (!shapes) return null;
  const t = EXPRESSION_THRESHOLDS;
  const s = expressionSignals(shapes);

  // Two components, because one alone misbehaves.
  //
  // A purely threshold-based score pins at exactly 100% for anyone who is not
  // visibly tense — measured on real footage, an entire calm session scored a
  // flat 1.0 every frame, which tells the candidate nothing. So a small
  // proportional term always applies: ordinary facial movement registers, and
  // the percentage has somewhere to move.
  //
  // The threshold-based term then dominates once tension is actually visible,
  // so a genuinely tense face still drops sharply rather than drifting.
  const over = (value, threshold) => Math.max(0, (value - threshold) / (1 - threshold));

  // browDown rests near 0.30 on a relaxed face (measured — see THRESHOLDS),
  // so its weight here is deliberately small: it must not read a resting brow
  // as a quarter tense.
  const ambient = 0.25 * s.browDown + 0.15 * s.mouthPress + 0.1 * s.browInnerUp;

  const marked =
    over(s.browDown, t.browDown) +
    over(s.mouthPress, t.mouthPress) +
    0.5 * over(s.browInnerUp, t.browInnerUp) +
    0.5 * over(s.eyeWide, t.eyeWide);

  const tension = Math.min(1, ambient + marked);
  const smileCredit = s.smile > t.smile ? 0.1 : 0;
  return Math.min(1, Math.max(0, 1 - tension + smileCredit));
}

/** MediaPipe returns categories as a list; a lookup is easier to reason about. */
function shapesToMap(categories) {
  const map = {};
  for (const category of categories || []) {
    map[category.categoryName] = category.score;
  }
  return map;
}

/**
 * The stateful tracker.
 *
 * `onAlert`/`onClear` drive the live nudge; `onSample` exists for the debug
 * readout used while tuning the thresholds and is otherwise unused.
 */
export function createFaceTracker({ onAlert, onClear, onSample } = {}) {
  let landmarker = null;
  let running = false;
  let rafId = null;
  let lastSampleAt = 0;
  let startedAt = null;
  let lastVideoTime = -1;
  // Tracked time accumulates across start/stop cycles: a candidate who turns
  // the camera off and on again mid-interview has still been tracked for the
  // sum of both stretches, and resetting would undercount their session.
  let accumulatedMs = 0;

  const collected = [];
  let awayRun = 0;
  let alerting = false;
  let alertsShown = 0;

  // This session's learned neutral, and the thresholds derived from it.
  const baselineDown = [];
  const baselineSide = [];
  let limits = null;

  /**
   * A backgrounded tab stops requestAnimationFrame, so sampling stops — but
   * wall-clock time does not, and counting that gap as "tracked" would be a
   * lie with consequences: the server derives the sample rate from
   * samples ÷ tracked_seconds, and an artificially low rate shrinks the
   * minimum run length for a look-away, over-counting them. So the clock
   * pauses with the sampling.
   */
  function handleVisibility() {
    if (!running) return;

    if (document.hidden) {
      if (startedAt !== null) accumulatedMs += performance.now() - startedAt;
      startedAt = null;
      return;
    }

    startedAt = performance.now();
    lastSampleAt = 0;
    // Whatever they were doing before the gap, we cannot know it continued
    // across it — so a run in progress does not survive.
    awayRun = 0;
  }

  async function load() {
    if (landmarker) return landmarker;
    // Imported here, not at module scope, so a candidate who never turns the
    // camera on never downloads the runtime.
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
    landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });
    return landmarker;
  }

  function record(gaze, expression, facePresent, confidence) {
    collected.push({
      gaze,
      expression,
      face_present: facePresent,
      // P(composed) from the model for this frame, or null when the model has
      // not read this face. Null rather than 0: "not measured" and "measured
      // as not confident" are different facts and the server treats them so.
      confidence: confidence ?? null,
    });

    if (gaze === GAZE.CAMERA) {
      awayRun = 0;
      if (alerting) {
        alerting = false;
        onClear?.();
      }
      return;
    }

    awayRun += 1;
    if (!alerting && awayRun >= ALERT_AFTER_SAMPLES) {
      alerting = true;
      alertsShown += 1;
      onAlert?.(gaze);
    }
  }

  function tick(video) {
    if (!running) return;
    rafId = requestAnimationFrame(() => tick(video));

    const now = performance.now();
    if (now - lastSampleAt < SAMPLE_INTERVAL_MS) return;
    lastSampleAt = now;

    // A video that is not playing yet, or has gone away, has nothing to read.
    if (!video || video.readyState < 2 || video.videoWidth === 0) return;
    // detectForVideo rejects a timestamp it has already seen, which happens
    // whenever we sample faster than the camera produces frames.
    if (video.currentTime === lastVideoTime) return;
    lastVideoTime = video.currentTime;

    let result;
    try {
      result = landmarker.detectForVideo(video, now);
    } catch {
      // One bad frame must not kill the loop; the next tick tries again.
      return;
    }

    const categories = result?.faceBlendshapes?.[0]?.categories;
    if (!categories || categories.length === 0) {
      record(GAZE.AWAY, EXPRESSION.NEUTRAL, false, null);
      onSample?.({ gaze: GAZE.AWAY, expression: EXPRESSION.NEUTRAL, facePresent: false });
      return;
    }

    const shapes = shapesToMap(categories);
    const pose = headPose(result?.facialTransformationMatrixes?.[0]?.data);

    const expression = classifyExpression(shapes);
    const confidence = confidenceScore(shapes);

    // The opening seconds are spent learning this candidate's resting eye
    // position rather than judging it. They are recorded as "camera": an
    // interview starts with the candidate facing the screen, and guessing
    // anything else about time we deliberately did not classify would be
    // worse than this assumption.
    if (limits === null) {
      const signals = gazeSignals(shapes);
      baselineDown.push(signals.down);
      baselineSide.push(signals.sideways);

      if (baselineDown.length >= CALIBRATION_SAMPLES) {
        limits = thresholdsFromBaseline({
          down: median(baselineDown),
          sideways: median(baselineSide),
        });
      }

      record(GAZE.CAMERA, expression, true, confidence);
      onSample?.({ gaze: GAZE.CAMERA, expression, facePresent: true, pose, shapes, calibrating: true });
      return;
    }

    const gaze = classifyGaze(shapes, pose, limits);
    record(gaze, expression, true, confidence);
    onSample?.({ gaze, expression, facePresent: true, pose, shapes, limits });
  }

  return {
    async start(video) {
      if (running) return;
      await load();

      running = true;
      startedAt = performance.now();
      lastSampleAt = 0;
      lastVideoTime = -1;
      document.addEventListener('visibilitychange', handleVisibility);
      tick(video);
    },

    stop() {
      if (running && startedAt !== null) {
        accumulatedMs += performance.now() - startedAt;
      }
      startedAt = null;
      running = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      awayRun = 0;
      if (alerting) {
        alerting = false;
        onClear?.();
      }
    },

    samples: () => collected,
    alertsShown: () => alertsShown,
    trackedSeconds: () => {
      const live = running && startedAt !== null ? performance.now() - startedAt : 0;
      return (accumulatedMs + live) / 1000;
    },
  };
}
