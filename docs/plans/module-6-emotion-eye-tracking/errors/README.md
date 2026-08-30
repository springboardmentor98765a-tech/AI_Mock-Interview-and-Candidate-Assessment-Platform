# Errors hit while building Module 6

Screenshots of the real defects found and fixed during Module 6 (eye tracking,
attention, expression, behaviour report). ML model training is deliberately
excluded — this is the application work.

Every figure below was **reproduced**, not illustrated. Where an error could be
triggered again it was: the bug was reintroduced, the failure captured, and the
fix restored.

| # | Error | How it was captured |
|---|---|---|
| 01 | `422` — behaviour submission rejected by the API | bug reintroduced, real request made, real `ApiError` captured |
| 02 | Gaze thresholds fired on candidates sitting still | blendshapes re-measured live against two real recordings |
| 03 | Five live-data bugs in existing Module 5 code | old and fixed logic run side by side on the same inputs |
| 04 | Backgrounded tab kept counting untracked time | code, with the measured consequence |
| 05 | Behaviour report lost when an interview ended normally | code, both exit paths |
| 06 | Confidence percentage pinned at exactly 100% | code, with the measured before/after |
| 07 | The app promised candidates something untrue | copy, before and after |

## All seven are fixed — re-verified 2026-08-27

| # | Verification |
|---|---|
| 08 | `08-VERIFIED-all-fixed.png` — every error, was vs now, in one table |
| 09 | `09-VERIFIED-backend-rerun.png` — the five live-data bugs re-run on their failing inputs |
| 10 | `10-VERIFIED-calibration-adapts.png` — per-session thresholds measured on both recordings |

Not asserted — re-executed. Each failing input was run again through the
current code:

| # | was | now |
|---|---|---|
| 01 | HTTP 422 | HTTP 200, confidence 80%, eye contact 100% |
| 02 | one fixed threshold for everyone | learned per session — A 0.497, B 0.720 |
| 03 | 5 of 9 words counted | 9 of 9 |
| 03 | "Fiji means" → filler `i mean` ×1 | no fillers; genuine ones still caught |
| 03 | silence → "0 wpm, slow" | `available=false`, no verdict |
| 03 | malformed row → `TypeError`, whole report lost | report renders, `filler_total=3` |
| 03 | failed score averaged in → candidate scored 0.0 | `None` — not scored |
| 04 | hidden tab kept counting | 0.00s accrued while hidden |
| 05 | one exit path covered | both paths submit (L818, L877) |
| 06 | 1.000 on all 87 frames | 0.924 across 40 distinct values |
| 07 | false claim shipped | string gone; accurate disclosure in place |

Backend suite **377 passed**, frontend build clean.

---

### 01 — `422 Unprocessable Entity` on every behaviour submission

`api.submitBehavior` called `JSON.stringify(body)` on a body that `request()`
already stringifies. The server received a JSON *string* where it expected an
object.

The failure was silent by design — behaviour submission is best-effort so a
failure cannot break an interview — so nothing surfaced to the candidate.
**Every behaviour report was being dropped.** Found only by driving the real
API module in a browser rather than mocking it.

### 02 — Thresholds fired on candidates who were not moving

Two things measured on **resting** faces:

| | recording A | recording B |
|---|---|---|
| `eyeLookDown` minimum | 0.205 | **0.032** |
| `eyeLookDown` median | 0.286 | 0.242 |
| sideways median | 0.158 | **0.329** |
| still frames flagged "looking away" | 9% | 13% |

MediaPipe's neutral is not zero, and where it sits depends on the person and
their setup — webcam height, how square they sit. Recording B's *resting*
sideways value is inside recording A's *looking-away* range, so no fixed number
serves both.

Fixed by learning each candidate's own neutral in the first ~5 seconds and
setting thresholds relative to it.

### 03 — Five bugs in already-shipped Module 5 code

Found because Slice 1 ran a committed test file that had apparently never been
executed. Two were corrupting live data:

- a malformed stored row crashed the **entire** interview report
- a score marked *unavailable* was averaged into candidates' scores as a real **zero**

The others: silence reported as "slow" speech, digits dropped from word counts
(breaking APTITUDE interviews, which are mostly numbers), and "Fiji means" /
"API means" counted as the filler phrase "i mean".

### 04 — A backgrounded tab kept counting time it was not tracking

`requestAnimationFrame` stops when a tab is hidden; the wall clock did not. The
server derives the sample rate from `samples ÷ tracked_seconds` and sizes a
look-away from it, so a deflated rate shrank the minimum run and ordinary
glances started being reported as look-aways.

### 05 — Reports lost for candidates who finished properly

Submission was wired only to the explicit "End interview" button. An interview
that ends by running out of questions never goes through there — so anyone who
answered every question got **no behaviour report at all**.

### 06 — Confidence percentage read exactly 100% for every calm face

The score only counted tension *above* threshold, so any face below every
threshold pinned at 1.0 — measured at exactly 1.000 on all 87 frames of a real
session. A percentage that reads 100% for most people carries no information.

After the fix the same footage reads 0.919, and the trained model that was
later removed scored 0.899 on that clip — two unrelated methods two points
apart.

### 07 — The app told candidates something Module 6 made untrue

Not a crash. Shipped copy said *"no eye-contact or emotion analysis exists, so
nothing here reads your expression"* while Module 6 was being built to do
exactly that. Replaced with an accurate disclosure, including who can see what.
