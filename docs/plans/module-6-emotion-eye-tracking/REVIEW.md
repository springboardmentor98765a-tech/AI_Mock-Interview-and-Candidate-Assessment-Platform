# Module 6 — what happened, start to now

Temporary review document, last updated 2026-08-27. Written for you to catch up
on the whole arc. Not part of the plan docs; delete it when you have read it.

Parts are in the order they happened.

**Nothing is committed.** Everything below is in the working tree only. Last
commit is still `fd37783 Module 5`.

---

## The one-paragraph version

Module 6 is **built, tested and working**: eye tracking, attention, engagement,
the live nudge, the behaviour report, three expression states (confident /
nervous / fear), a confidence percentage, and a recruiter view carrying score
plus attention plus that percentage. A trained ML model for expression was
built, measured, integrated — and then removed by decision in favour of the
original rule-based method, which is what ships. The measurements from that
detour are kept below because they are the only honest yardstick for what
replaced them.

---

## Part 1 — Module 6 proper (done)

### How it was planned

Ran through the four approval gates. Gate 1 asked two product questions and
your answers shaped everything after:

- Video-based confidence is a **separate** signal from Module 5's
  transcript-based Confidence score — never merged.
- Alerts are **candidate-facing coaching**, never recruiter proctoring.

Then you added new requirements mid-build (live ML webcam tracking, alerts on
looking at screen/keyboard) which **invalidated the approved architecture**, so
all four gates were reopened and re-approved as revision 2. That is why the
plan docs read "REVISION 2".

### What was built

| Your requirement | How it works now |
|---|---|
| Emotion recognition (live ML) | MediaPipe face landmarker, in-browser, 4×/sec |
| Eye-contact tracking | `camera` / `down` / `side` / `away` from eye direction + head pose |
| Alerts on looking away | On-screen nudge after 4s sustained |
| Confidence analysis | Weighted toward measured eye contact over inferred expression |
| Attention monitoring | Look-aways counted as **runs**, not samples |
| Engagement measurement | From eye contact + face-in-frame |
| Interview behaviour analysis | Full section in History → View |

No video is uploaded for any of it. Only small per-frame labels, aggregated
server-side, raw samples discarded.

### Slices

| Slice | State |
|---|---|
| 1 — rename cleanup + 13 pre-existing bug fixes | done |
| 2 — tracer bullet (DB column, API key, UI) | done |
| 3 — Gemini post-hoc video analysis | **built, worked, then retired** |
| 3b — remove retired Gemini path | done |
| 4 — live MediaPipe tracker + calibration | done |
| 5 — ingest endpoint + measured report | done |
| 6 — polish, edge cases, honesty pass | done |

Slice 3 is worth a note: the Gemini approach *worked well* — it cited real
timestamps ("around 00:11 to 00:13 you briefly touched your chin"). It was
deleted anyway, because after revision 2 two systems would have measured the
same interview and disagreed. It is recoverable from git history.

### Things found and fixed along the way

**In old Module 5 code** (found because Slice 1 ran a test file that had been
committed but apparently never executed — 13 failures, all real):

- Silence was reported as "slow" speaking pace
- Digits dropped from word counts — broke APTITUDE interviews, which are mostly numbers
- "Fiji means" and "API means" counted as the filler phrase "i mean"
- A malformed stored row crashed the **entire** interview report with a TypeError
- A score marked *unavailable* was averaged into candidates' overall scores as a real zero

The last two were corrupting live data.

**In new Module 6 code:**

- **MediaPipe's blendshape neutrals are not zero.** `eyeLookDown` rests near
  0.29 because webcams sit above eye level. My first thresholds sat *inside*
  the resting band and would have nagged people sitting perfectly still.
- **A fixed threshold cannot work at all.** Testing a second recording:
  resting `eyeLookDown` was 0.217 for one person and 0.031 for another;
  resting sideways 0.154 vs 0.327. One person's *resting* position is inside
  another's *looking-away* range. Thresholds are now learned per session from
  the candidate's own first ~5 seconds.
- **Backgrounded tab kept counting time** while sampling had stopped, which
  deflated the sample rate and over-counted look-aways.
- **Reports lost for candidates who finished properly** — submission was wired
  only to the explicit "end" button, not to running out of questions.
- **Samples lost on camera toggle** — turning the camera off and on discarded
  everything before the gap.
- **Double JSON encoding** in the API call, caught only by driving the real
  app rather than mocking it.
- **A false promise to candidates.** Existing UI copy said *"no eye-contact or
  emotion analysis exists, so nothing here reads your expression."* Module 6
  makes that untrue. Replaced with an accurate disclosure.

### How the tracker was calibrated

Not by guessing. Playwright's bundled ffmpeg extracts frames from one of your
real interview recordings, a Pillow script builds a `.y4m`, and Chromium's
`--use-file-for-fake-video-capture` makes that recording *be* the webcam — so
the tracker can be driven against a real face, headlessly and repeatably.

Cross-check: the tracker measured 93% eye contact on a clip where the retired
Gemini analysis independently said 95%. Two unrelated methods, two points
apart.

### Not verified

- **The live nudge has never been seen firing on real footage.** Its logic is
  verified (all six gaze cases classify correctly; fires after 16 consecutive
  away-samples) but neither test recording contained an unambiguous sustained
  look-away.
- All calibration used two recordings of **one person**. A different face,
  room or webcam height is unproven. The per-session calibration exists
  precisely to handle that, but "should work" is doing real work in that
  sentence.

---

## Part 2 — an ML model was explored, then removed

A trained model (MobileNetV3 on FER2013, exported to ONNX, running in-browser)
briefly replaced the rule-based expression read. It measured well — 0.84
precision / 0.92 AUC on `confident` — but was removed by decision, along with
`onnxruntime-web`, the model files, the Vite workarounds and the whole `ml/`
training directory. **Nothing ML-trained remains in the project.**

The one measurement worth keeping from it: on the same real footage the
rule-based confidence scores **0.919** where that model scored **0.899**. Two
unrelated methods, two points apart — a reasonable sign the heuristic is not
wildly off, though not evidence either is right.

MediaPipe stays, and is not a trained-by-us model: it is the face landmark
library that provides gaze and the facial action units the rules read.

---

## Part 3 — recruiter visibility (added 2026-08-26, done)

You asked for the emotion analytics and interview score to be visible to
recruiters. That reversed the Gate 1 decision that this was candidate-only, so
two follow-up decisions were taken:

- **Reliable metrics only.** Recruiters see eye contact, look-aways,
  engagement and gaze breakdown. Expression, emotion and the written summary
  are filtered out server-side — they rest on unvalidated inference, and a
  recruiter remembers "seemed tense" long after any caveat beside it.
- **Context, never ranking.** The leaderboard still ranks on the interview
  score alone. Two tests assert no attention data reaches the leaderboard or
  the candidate directory, because these numbers come from the candidate's own
  browser and are forgeable.

`engagement` is included despite the name: it is computed purely from eye
contact and face presence, both measured, never from the expression
classifier. The unreliable "engagement" was the DAiSEE ML one, which is not in
the app.

**The candidate-facing promise was rewritten.** It previously said this data
was "never shown to a recruiter". That is now false, so the text says plainly
what recruiters see, that it does not affect score or leaderboard, and that
expression/emotion readings are not shared. People being assessed on something
should know.

The fairness caveat (eye-contact norms vary by culture and neurodivergence)
travels in the API response itself, not only the UI, with a test asserting it
cannot be quietly dropped.

Where: `GET /analytics/recruiter/candidates/{id}/interviews`,
`behavior_analysis.recruiter_view()`, `CandidateSessions.jsx`, and a
"Sessions" button on the recruiter Candidates table. 10 new tests;
**full suite 371 passed**.

---

## Part 3b — expression: what actually ships

Expression is read by rules over MediaPipe's facial action units. What ships:

- **Three states: confident / nervous / fear**, read from MediaPipe's facial
  action units by thresholds in `frontend/src/lib/faceTracker.js`.
- **A confidence percentage**, continuous per frame and averaged over the
  session.
- **Recruiters see the confidence percentage** alongside attention and score.
  Named emotion readings still do not reach them.
- `onnxruntime-web`, the ONNX model and the Vite workarounds are all gone. The
  frontend is back to one runtime (MediaPipe) and one model file.

### What this costs, stated plainly

The rule thresholds are **uncalibrated**. The gaze thresholds were measured
against real recordings and adapt per session; these encode a plausible
reading of well-known facial action units and nothing more. There is no
measurement behind them saying how often "nervous" is actually nervous.

Compare like for like — the removed model had measured numbers on a held-out
split (confident precision 0.84 / AUC 0.92, nervous 0.71 / 0.88, fear 0.66 /
0.84). The rules have none. That is the trade.

`fear` is the shakiest of the three: its facial signature (raised inner brow +
wide eyes + dropped jaw) overlaps heavily with plain surprise, and a webcam at
desk height sees brows poorly. The summary says so and weights it lightly.

One reassurance, and it is only that: on the same real footage the rule-based
confidence scored **0.919** where the ML model scored **0.899**. Two unrelated
methods two points apart is a decent sign the heuristic is not wildly off — it
is not evidence that either is right.

### A defect caught while building it

The first version of the confidence score only counted tension *above*
threshold, so any face below every threshold pinned at exactly **100%** — an
entire calm session scored a flat 1.0 on every frame. A percentage that reads
100% for most people carries no information. The score now has a small
always-on proportional term so ordinary facial movement registers and the
number has somewhere to move, with the threshold term still dominating once
tension is genuinely visible.

### On the recruiter change

Showing the confidence percentage to recruiters reverses the earlier filter,
and it is worth being clear about what changed: the figure now crossing that
line is *less* validated than the one previously withheld. It is the only
recruiter-visible number not derived from measured gaze.

Mitigations, all tested: the "uncalibrated" caveat travels in the API response
rather than living only in the UI; the recruiter modal shows it as a
non-collapsible note; named emotions are still filtered out, because a
percentage carries its uncertainty visibly while a word like "nervous" beside
someone's name does not; and nothing about it reaches the leaderboard.

The candidate-facing text was updated again to say recruiters see the
confidence percentage.

---

## Files

| Path | What |
|---|---|
| `frontend/src/lib/faceTracker.js` | Live tracker: gaze (calibrated per session) and expression (uncalibrated thresholds) |
| `frontend/src/components/CandidateSessions.jsx` | Recruiter view: score + attention + confidence % |
| `frontend/src/components/BehaviorReport.jsx` | The report card |
| `backend/app/services/behavior_analysis.py` | Aggregation (pure, unit-tested) |
| `backend/app/schemas/behavior.py` | Ingest schemas |
| `backend/tests/test_behavior_analysis.py` | 24 unit tests |
| `backend/tests/test_behavior_endpoint.py` | 11 HTTP tests |

The `ml/` training directory has been deleted — 3.3GB of PyTorch, datasets and
checkpoints. Nothing in the application referenced it.

---

## Outstanding

- **Nothing is committed.** 40+ modified files and a dozen new ones, covering
  the whole Module 6 arc. Last commit is still `fd37783 Module 5`.
- **Try the tracker on your own webcam.** This matters more now than it did
  with the model. Gaze calibration used two recordings of one person and
  adapts per session; the expression thresholds used one clip and do **not**
  adapt. You are a second face, and the only validation these thresholds will
  get without deliberate measurement.
- The expression thresholds could be calibrated the same way the gaze ones
  were — the harness exists (`--use-file-for-fake-video-capture` against real
  recordings). That would replace guesses with measurements without bringing
  back a model.
