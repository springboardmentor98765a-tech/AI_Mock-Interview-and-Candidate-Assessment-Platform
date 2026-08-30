# Program Design: Module 6 — Emotion Detection & Eye Tracking

**Revision 2** (2026-08-25). Revision 1 (Gemini post-hoc) is in git history,
including its verified finding that the Gemini Developer API rejects free-form
maps in a `response_schema`.

## Files

**Removed** (revision 1's producer — see `02-architecture.md`)
- `providers/base.py` — drop `BehaviorAssessment`, `EmotionShare`,
  `BEHAVIOR_SYSTEM_PROMPT`, `behavior_prompt`.
- `providers/gemini.py` — drop `assess_behavior`, `_file_state`, the two
  video-polling constants, and the now-unused `time` import.
- `ai_provider.py` — drop `assess_behavior` and its exports.
- `api/interviews.py` — drop the `BackgroundTasks` parameter and the
  `add_task` call in `upload_recording`.
- `tests/test_behavior_analysis.py` — rewritten for the new producer.

**Backend — new/changed**
- `app/services/behavior_analysis.py` — **rewritten**. Was "call Gemini and
  store"; becomes "aggregate uploaded samples and store". Keeps `METHOD_NOTE`
  and the stored-payload shape. Pure arithmetic, no I/O, no AI call — the
  same design as `scoring.py`, and testable the same way.
- `app/schemas/behavior.py` — **new**. Request schemas for the ingest
  endpoint. Separate file because `schemas/interview.py` is already long and
  these are only used by one route.
- `app/api/interviews.py` — **one new route**,
  `POST /{interview_id}/behavior`.

**Frontend — new/changed**
- `frontend/src/lib/faceTracker.js` — **new**. All MediaPipe contact lives
  here: model loading, the sampling loop, blendshapes → `{gaze, expression}`.
  A plain module, not a hook, so the classification functions can be reasoned
  about (and later tested) without React.
- `frontend/src/pages/candidate/LiveSession.jsx` — start/stop the tracker
  alongside the existing camera start/stop; render the live nudge; POST
  samples when the interview ends.
- `frontend/src/lib/api.js` — one method, `submitBehavior(interviewId, body)`.
- `frontend/src/index.css` — one class for the live nudge.
- `frontend/public/models/` — vendored `face_landmarker.task` + WASM.
- `frontend/src/components/BehaviorReport.jsx` — small additions only: show
  `gaze_breakdown` and the `samples`/`tracked_seconds` provenance line.

## Types & signatures

```js
// frontend/src/lib/faceTracker.js
export const GAZE = { CAMERA: 'camera', DOWN: 'down', SIDE: 'side', AWAY: 'away' };
export const EXPRESSION = { NEUTRAL:'neutral', ENGAGED:'engaged', TENSE:'tense', SURPRISED:'surprised' };

// Pure — a blendshape map + head pose in, a label out. No MediaPipe types,
// no DOM, so these are the parts worth testing directly.
export function classifyGaze(shapes, pose): string
export function classifyExpression(shapes): string

// The stateful part.
export function createFaceTracker({ onAlert, onClear }): {
  start(videoEl): Promise<void>,   // loads model lazily on first call
  stop(): void,
  samples(): Array<{ gaze: string, expression: string, facePresent: boolean }>,
  alertsShown(): number,
  trackedSeconds(): number,
}
```

```python
# app/schemas/behavior.py
class BehaviorSample(BaseModel):
    gaze: Literal["camera", "down", "side", "away"]
    expression: Literal["neutral", "engaged", "tense", "surprised"]
    face_present: bool

class BehaviorSubmission(BaseModel):
    samples: List[BehaviorSample] = Field(max_length=20_000)  # ~80 min at 4Hz
    tracked_seconds: float = Field(ge=0)
    alerts_shown: int = Field(ge=0, default=0)
```

```python
# app/services/behavior_analysis.py  (rewritten)
METHOD_NOTE: str                       # kept from revision 1

MIN_USEFUL_SAMPLES = 40                # ~10s at 4Hz; below this, no report

def aggregate(samples, tracked_seconds, alerts_shown) -> dict: ...
def _gaze_breakdown(samples) -> Dict[str, int]: ...
def _expression_breakdown(samples) -> Dict[str, int]: ...
def _count_look_aways(samples) -> int: ...     # runs of non-camera, not raw samples
def _confidence_label(eye_contact_pct, expressions) -> str: ...
def _engagement_label(eye_contact_pct, face_present_pct) -> str: ...
def _summarise(...) -> str:  ...               # templated from the numbers, no LLM
def store(db, interview, report) -> None: ...
```

```python
# app/api/interviews.py
@router.post("/{interview_id}/behavior")
def submit_behavior(
    interview_id: int,
    payload: BehaviorSubmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
): ...
```

## Call stack

**Live tracking**
1. `LiveSession.jsx::startCamera()` (existing) → `createFaceTracker().start(videoEl)`
2. rAF loop @4Hz → `FaceLandmarker.detectForVideo()` → `classifyGaze` +
   `classifyExpression` → push sample
3. run of non-`camera` samples ≥ threshold → `onAlert()` → nudge renders;
   a `camera` sample → `onClear()`

**Submission and report**
1. `LiveSession.jsx::endSession()` → `tracker.stop()` →
   `api.submitBehavior(id, {samples, tracked_seconds, alerts_shown})`
2. → `POST /interviews/{id}/behavior` → `_owned()` → `aggregate()` → store
3. Later: History → View → existing `GET .../analysis` → existing
   `BehaviorReport.jsx`

## Test plan

`tests/test_behavior_analysis.py` (rewritten — pure, no DB, no AI):
- `test_all_camera_samples_give_100_percent_eye_contact`
- `test_eye_contact_excludes_down_side_and_away`
- `test_look_aways_counts_runs_not_samples` — 10 consecutive `down` samples is
  **one** look-away, not ten. The distinction the whole metric rests on.
- `test_single_stray_sample_is_not_a_look_away` — one bad frame mid-answer
  must not register; below the run threshold it is noise.
- `test_too_few_samples_returns_unavailable` — a camera on for two seconds
  produces no report rather than a confident percentage from nothing.
- `test_no_samples_returns_unavailable_not_zero` — zero eye contact and *no
  data* are different facts (the `overall_score` precedent).
- `test_percentages_sum_to_about_100`
- `test_face_absent_samples_do_not_count_as_eye_contact`
- `test_summary_mentions_the_dominant_gaze_zone`
- `test_report_carries_method_note_and_provenance`

`tests/test_behavior_endpoint.py` (new — HTTP, real server):
- `test_requires_ownership` — another candidate's interview → 404
- `test_stores_and_returns_a_report`
- `test_report_appears_on_the_analysis_endpoint`
- `test_resubmission_replaces_the_previous_report`
- `test_rejects_absurd_sample_counts` — the `max_length` guard
- `test_rejects_unknown_gaze_label` — 422 from the `Literal`

Frontend: no component test infra exists in this repo; `classifyGaze` /
`classifyExpression` are written as pure functions so they *can* be tested if
that ever changes. Verified this round by browser walkthrough (Slice 6).

## Least confident decisions

1. **The gaze thresholds are guesses until tuned on a real face.** Which
   blendshape magnitudes and head angles mean "looking at the keyboard" versus
   "thinking with eyes lowered" cannot be settled from documentation. Plan:
   build a temporary on-screen debug readout in Slice 4, sit in front of it,
   and tune. Numbers picked now are placeholders.
2. **Distinguishing "screen" from "keyboard" may not survive contact.** Both
   are "looking down" to a webcam; the difference is a few degrees of pitch and
   varies with monitor height and desk setup. If it proves unreliable, the
   honest fallback is to report `down` as one zone ("looked down / away from
   camera") rather than invent a distinction the data cannot support.
3. **4Hz and a 4-second alert threshold are untested.** Too twitchy and it
   nags during normal thinking; too slow and it never fires. Needs tuning with
   the same debug pass.
4. **Expression → "confidence" is the weakest inference here.** A tense brow
   during a hard technical question is concentration, not nerves. Leaning on
   eye contact (measured) more than expression (inferred) for the confidence
   label, and keeping the label to three coarse buckets, is the mitigation.
5. **Client-supplied data is trusted.** Fine for a practice tool that ranks
   nobody (Gate 1); would not be fine if it ever fed the leaderboard.
