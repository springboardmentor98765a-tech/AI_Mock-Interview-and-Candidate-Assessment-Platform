# Product: Module 6 — Emotion Detection & Eye Tracking

**Revision 2** (2026-08-25). Revision 1 is in git history; it scoped this as a
post-interview AI read of the recording. The user then asked for live webcam ML
tracking and live eye-contact alerts, which is a different product.

## Problem

A candidate finishes a mock interview knowing what they *said* (Module 5:
grammar, fillers, pace, pronunciation, a score) but nothing about how they
*presented*. Two specific gaps:

1. **Nobody tells them at the time.** If they spend four minutes reading their
   notes instead of looking at the camera, they find out never. The moment
   feedback is useful is while it is happening and still fixable — a real
   interviewer's raised eyebrow has no equivalent here.
2. **Nobody tells them afterwards either.** There is no record of how they came
   across, so there is nothing to improve against between practice sessions.

## Success metric

Median eye-contact percentage across a candidate's *repeat* interviews goes up
between their first tracked session and their third. That is the whole point of
a practice tool: the number should move because the candidate learned
something. Measured off the stored per-interview figure, so it needs no new
instrumentation.

Secondary (health, not success): % of completed interviews with a camera on
that produce a behaviour report — parity with Module 5's analysis rate.

## Announcement

SmartHire AI now watches how you present, not just what you say. Turn your
camera on and the app tracks your expression and where you are looking, live,
while you answer — entirely in your browser, with no video sent anywhere for
it. If you drift away from the camera for a while, you get a quiet nudge on
screen, the way a real interviewer's attention would tell you. Afterwards, your
report adds a Behaviour & Engagement section: how much of the session you held
eye contact, when you looked away and where, which expressions showed most, and
how engaged you came across. It is measured from your own session rather than
guessed, and it is there to practise against.

## Screens

- `mockups/interview-review-behavior-section.html` — the end-of-interview
  Behaviour & Engagement card (History → View). **Already built and working**
  (Slice 2). Revision 2 changes where its numbers come from, not its layout.
- Live nudge during the interview — a small, dismissible on-screen indicator in
  `LiveSession.jsx`, in the existing camera panel. Deliberately not a modal and
  not a sound: it must be noticeable without derailing the answer in progress.

## Decisions locked at this gate

1. **The report is built from measured samples, not an AI impression.** The
   browser samples gaze and expression through the session; the server
   aggregates those samples into the report. One source of truth.
2. **Alerts are for the candidate, as coaching.** Never surfaced to a recruiter
   as a suspicion flag. Module 6 does not accuse anyone of cheating.
3. **The tracking runs in the browser; no video leaves the machine for it.**
   Only a small numeric summary is uploaded. (The session *recording* is
   uploaded as it already was — that is Module 4 and unchanged.)
4. **Camera stays optional.** It is optional today and must remain so. No
   camera means no behaviour report, exactly as no microphone means no
   transcript — never a blocked interview.

## Honesty constraints (carried from Module 5's precedent)

Module 5 refuses to show a pronunciation *score* because real pronunciation
scoring needs phoneme-level alignment the platform does not do. The same rule
binds Module 6, and it matters more here because the words invite overclaiming:

- **"Emotion recognition" is expression inference.** What is actually measured
  is facial muscle activation (MediaPipe blendshapes). A smile is a measured
  fact; "happy" is an inference from it, and a person can be tense behind a
  smile. The UI must say expression, and must never claim to know what the
  candidate felt.
- **"Eye-contact tracking" is uncalibrated gaze estimation.** Without a
  calibration step it is an estimate from head pose and eye-landmark direction,
  good enough for "spent a lot of this session looking down", not good enough
  for a precise percentage presented as fact. Figures round to whole numbers
  and are labelled estimates.
- **No behaviour score, and no contribution to the Module 5 score.** Module 5's
  overall score and the leaderboard are untouched. Reducing someone's demeanour
  to a number that ranks them is not something this feature will do.
