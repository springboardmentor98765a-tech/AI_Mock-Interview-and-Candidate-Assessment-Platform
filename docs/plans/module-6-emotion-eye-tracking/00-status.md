# Status: Module 6 — Emotion Detection & Eye Tracking

**REVISION 2** — reopened 2026-08-25 after new requirements from the user
(live webcam ML tracking + live eye-contact alerts). See "What changed" below.

- Gate 1 — Product: APPROVED 2026-08-25 (revision 2)
- Gate 2 — Architecture: APPROVED 2026-08-25 (revision 2)
- Gate 3 — Program Design: APPROVED 2026-08-25 (revision 2)
- Gate 4 — Slice plan: APPROVED 2026-08-25 (revision 2)

## Slices (revision 2)
- [x] Slice 1 — rename cleanup (still valid, keep). Also fixed 13 pre-existing
      Module 5 bugs found by `test_analysis_robustness.py`. Full suite green.
- [x] Slice 2 — tracer bullet: `Interview.behavior_report` column, `"behavior"`
      key on the analysis endpoint, `BehaviorReport.jsx`. **All still valid** —
      revision 2 changes how the report is *produced*, not where it is stored
      or how it is displayed.
- [~] Slice 3 — Gemini post-hoc video analysis. **RETIRED by revision 2** (the
      user chose live tracking as the source of truth instead). Code to remove
      is listed in `02-architecture.md`. It worked — see the note below — but
      two systems measuring the same thing would disagree, so it goes.
- [ ] Slice 3b — remove the retired Gemini path. Code removed; full suite
      running to confirm.
- [~] Slice 4 — live in-browser tracking (MediaPipe). Tracker written and
      **calibrated against real footage** (see below). Live nudge + debug
      readout wired into LiveSession. Frontend builds; MediaPipe correctly
      code-splits into its own chunk, so a candidate who never turns the
      camera on never downloads it.
- [x] Slice 5 — `POST /interviews/{id}/behavior`, `behavior_analysis.aggregate()`
      (pure arithmetic, 24 unit tests), samples submitted on both end paths
      (explicit end *and* running out of questions), report shows gaze
      breakdown + provenance. 11 endpoint tests. Verified end to end against
      real face footage: 93% eye contact measured, stored, and read back —
      against the retired Gemini read of the same clip at 95%.
- [x] Slice 6 — debug readout removed; per-session threshold calibration (see
      below); hidden-tab clock bug fixed; false "no facial analysis happens"
      copy replaced with an accurate disclosure; README documents the feature;
      Module 6 kept out of every analytics/leaderboard shape on purpose.
      Full suite: 361 passed.

## Module 6 is complete. Not verified, and worth a human minute:

- The live nudge has never been seen firing on real footage. Its logic is
  verified (all six gaze cases classify correctly; the alert triggers after 16
  consecutive away-samples) but neither test recording contained an
  unambiguous sustained look-away.
- All calibration used two recordings of one person. A different face, room or
  webcam height is unproven.

## What changed in revision 2

The user supplied a more specific feature list:

- Emotion recognition explicitly via **an ML model doing live webcam tracking**
  (not a post-hoc video read).
- Eye-contact tracking that detects looking at **screen, keyboard or something
  external**, with **alerts**.
- The behaviour report at the end is now the **analysis of the above measured
  features**, not an independent AI impression.

Decisions taken at the reopened Gate 1:
1. **Live tracking feeds the report; the Gemini video call is dropped.** The
   report becomes measured data (counted samples) rather than a model's
   impression. Avoids two systems disagreeing about the same interview.
2. **Alerts are candidate-facing self-coaching, not recruiter proctoring.**
   Nothing is flagged to a recruiter as suspicion. This keeps SmartHire a
   practice tool and avoids acting on gaze estimates that are nowhere near
   accurate enough to accuse someone.

## Thresholds became per-session (Slice 6) — and why they had to

Slice 4 measured thresholds against one recording and hard-coded them. Slice 6
tested a **second** recording and found that cannot work:

                          recording A      recording B
      eyeLookDown min        0.217            0.031
      sideways median        0.154            0.327

MediaPipe's neutral is not zero, and where it sits depends on the person and
their setup — webcam height, how square they sit to it. Recording B's *resting*
sideways value sits inside recording A's *looking-away* range. No single
constant serves both: tuned for A it nags B constantly; tuned for B it never
fires for A.

So the tracker now spends its first ~5s learning that candidate's own resting
eye position (median, clamped so someone who calibrates while staring at their
keyboard cannot teach it that this is normal) and derives thresholds as an
offset above it. The offsets are what generalised across both recordings even
though the absolute levels did not.

Verified on both: A learns sideways=0.475 and reads 87% camera; B learns
sideways=0.674 — automatically compensating for sitting off-axis — and reads
100% camera, where a fixed threshold would have produced constant false
"looking away" alerts.

Known limitation, bounded rather than solved: a candidate who looks away
throughout the calibration window inflates their own baseline. The median and
the clamp bound how wrong this can get; nothing eliminates it short of an
explicit "look at the camera" calibration step, which was not worth the
interruption.

## Threshold calibration (Slice 4) — how, and what it overturned

The gaze/expression thresholds were **measured, not guessed**. Method, so it
can be repeated:

1. `~/Library/Caches/ms-playwright/ffmpeg-1011/ffmpeg-mac` extracts PNG frames
   from a real interview recording in `backend/uploads/recordings/`. (That
   ffmpeg is a stripped build: no `scale` filter, no y4m muxer, so resize
   happens in step 2 and the container is built by hand.)
2. A short Pillow script converts the frames to a `.y4m` (YCbCr, 4:2:0).
3. Chromium is launched with `--use-file-for-fake-video-capture=<file>.y4m`,
   which makes that recording *be* the webcam — so the tracker can be driven
   against a real face, headlessly and repeatably.
4. Dump the blendshape percentiles over ~120 frames of someone sitting still.

What it found, which the documentation does not tell you: **MediaPipe's
blendshape neutrals are not zero.** `eyeLookDown` never fell below 0.217 and
rested near 0.29 (a webcam sits above eye level, so looking at the screen
already reads as a lowered eye); `browDown` rested near 0.30. Thresholds
guessed at plausible-looking fractions (0.45, 0.40) sat *inside* those resting
bands and fired constantly on a motionless subject.

Result on the same clip, before → after: 75% → 87.5% "looking at camera", with
the false `down` and false `tense` classifications eliminated. An independent
cross-check exists: the retired Gemini analysis of this exact recording said
"95% eye contact, 0 look-aways, expression remained neutral", so the corrected
numbers move toward a second opinion rather than away from one.

Still one person, one camera, one room — a starting point, not a universal
calibration.

## Notes for a fresh session

- Module 5 (speech: transcription, grammar, fillers, pace, pronunciation,
  communication quality, weighted score, leaderboard) is DONE and shipped.
  Everything it owns is named "Module 5" in code as of Slice 1.
- Slice 3's Gemini work is proven-good but retired. If live tracking ever
  proves too inaccurate in practice, `git log` has a working implementation of
  the post-hoc approach to fall back to (`gemini.assess_behavior`).
- Gate-3-era finding worth keeping: the Gemini Developer API **rejects
  free-form maps** (`Dict[str, int]`) in a `response_schema`
  ("additionalProperties is only supported in ... Enterprise Agent Platform
  mode"). Any future structured-output work must use a list of objects.
- `ANALYSE_BEHAVIOR` setting (added Slice 3) is kept — it now gates the
  live-tracking ingest endpoint instead of the Gemini call.
