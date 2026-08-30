# Architecture: Module 6 — Emotion Detection & Eye Tracking

**Revision 2** (2026-08-25). Live in-browser tracking replaces the post-hoc
Gemini video read from revision 1.

## What survives from revision 1

Slices 1 and 2 stand unchanged and nothing about them needs redoing:

- `Interview.behavior_report` (JSON, nullable) — same column, same purpose.
- `"behavior"` key on `GET /interviews/{id}/analysis` — same key, same shape.
- `BehaviorReport.jsx` inside `InterviewReview.jsx` — same component, already
  proven rendering a real report in the browser.
- `ANALYSE_BEHAVIOR` setting — repurposed to gate the new ingest endpoint.
- The Module 5 rename cleanup and the 13 pipeline bug fixes.

Only the *producer* changes.

## What gets removed

Slice 3's Gemini path, in full — leaving it in would mean two systems
disagreeing about the same interview:

- `gemini.assess_behavior()` and its `VIDEO_PROCESSING_TIMEOUT_SECONDS` /
  `VIDEO_POLL_SECONDS` / `_file_state` helpers.
- `ai_provider.assess_behavior()` and its `__all__` entry.
- `BEHAVIOR_SYSTEM_PROMPT`, `behavior_prompt()` in `providers/base.py`.
  `BehaviorAssessment` / `EmotionShare` also go — the new pipeline has no LLM
  call and therefore no response schema.
- The `background_tasks.add_task(...)` call in `upload_recording()`, and the
  `BackgroundTasks` parameter with it.
- `behavior_analysis.analyse_and_store()` is rewritten (same module, new job):
  it no longer calls a provider, it aggregates uploaded samples.

The `build_report` / `_emotions_to_map` shape logic and `METHOD_NOTE` are kept
— the stored payload is deliberately unchanged so the UI does not move.

## Fit

- **Tracking runs in `LiveSession.jsx`**, on the `MediaStream` the camera panel
  already creates. It does not open a second camera or touch the existing
  `MediaRecorder` — it reads frames off the same `<video>` element that is
  already on screen for the preview.
- **The ML model is MediaPipe Tasks Vision `FaceLandmarker`**
  (`@mediapipe/tasks-vision`, on npm, self-hosted WASM + model file — no CDN,
  no network call at runtime). Chosen over face-api.js because it gives both
  signals this feature needs from one pass:
  - **52 blendshapes** (facial action units) → expression inference, and,
    critically, `eyeLookDown/Up/In/Out` per eye → actual eye direction rather
    than head pose alone.
  - **A 4×4 facial transformation matrix** → head yaw/pitch, which
    distinguishes "turned away to a second screen" from "eyes flicked down".
  Both together are what makes "screen / keyboard / external" separable at all.
- **Sampling, not streaming.** ~4 samples a second, each reduced immediately to
  a small record (a gaze zone, an expression label, a face-present flag). Raw
  landmarks are never kept, never stored, never uploaded.
- **The server owns the arithmetic.** The browser uploads its samples; a pure
  Python module aggregates them into the report. Deliberate: the browser is not
  a trustworthy calculator, and putting the maths in Python makes it unit
  testable the way `scoring.py` already is.

## Endpoints

- `POST /interviews/{interview_id}/behavior` — **new**. Body: the sample array
  plus the tracked duration. Owned by the candidate (same `_owned` check as
  every other interview route). Aggregates, stores, returns the report.
  Idempotent-ish: a second POST replaces the report, matching how re-uploading
  a recording replaces the previous one.
- `GET /interviews/{interview_id}/analysis` — unchanged, still carries
  `"behavior"`.

## Data

- `Interview.behavior_report` — unchanged column, and the stored shape stays
  compatible with what `BehaviorReport.jsx` already renders. Revision 2 adds
  measured fields the AI version could not honestly provide:
  ```json
  {
    "available": true,
    "source": "live_tracking",
    "method_note": "...fixed disclosure...",
    "confidence": "Confident|Neutral|Nervous",
    "emotions": {"neutral": 61, "engaged": 24, "tense": 15},
    "eye_contact_percent": 68,
    "look_aways": 4,
    "engagement": "High|Medium|Low",
    "summary": "generated from the numbers, not by an LLM",
    "gaze_breakdown": {"camera": 68, "down": 20, "side": 9, "away": 3},
    "samples": 1240,
    "tracked_seconds": 310,
    "alerts_shown": 2
  }
  ```
- Individual samples are **not** stored. They are aggregated on arrival and
  discarded — a per-second log of where someone's eyes were is a surveillance
  record, and this feature has no use for one after the totals are computed.

## Flow

1. Candidate turns the camera on in `LiveSession.jsx` (unchanged UI).
2. The tracker lazily loads the MediaPipe WASM + model from the app's own
   `/models/` path, then starts a `requestAnimationFrame` loop throttled to
   ~4Hz against the existing preview `<video>`.
3. Each tick: `detectForVideo()` → blendshapes + transform matrix → one sample
   `{gaze, expression, facePresent}` pushed to an in-memory array.
4. A rolling window watches consecutive non-`camera` samples. Past the
   threshold (~4s continuous), the live nudge appears; it clears when the
   candidate looks back. Each firing increments `alerts_shown`.
5. Interview ends → `LiveSession.jsx` POSTs the samples to
   `/interviews/{id}/behavior`.
6. Server aggregates → stores on `Interview.behavior_report` → the existing
   report screen shows it, unchanged.

## External

- **`@mediapipe/tasks-vision`** (npm) — new frontend dependency, the only one.
- **`face_landmarker.task`** (~3.7MB) and the package's WASM bundle, both
  vendored into `frontend/public/models/` and served by the app itself. No
  runtime CDN dependency, no third party sees a candidate's face, and the app
  keeps working offline.
- No new backend dependency. No new env var.

## Consequences worth stating

- **Client-supplied data.** The samples come from the browser, so a determined
  candidate could forge a perfect report. Acceptable: this is a practice tool
  scoring nobody and ranking nobody (Gate 1, decision 2). It would not be
  acceptable if these numbers ever fed the leaderboard — and they must not.
- **Device-dependent accuracy.** A dim room, a low webcam angle, or glasses
  degrade landmark quality. The report carries `samples`/`tracked_seconds` so a
  thin sample count is visible rather than hidden behind a confident-looking
  percentage.
- **Runtime cost.** Inference at 4Hz on a downscaled frame is modest, but it is
  not free, and it runs alongside an active `MediaRecorder`. If it degrades the
  recording on weaker machines, the sample rate drops before anything else does
  — the recording is the primary artefact and Module 6 must never damage it.
