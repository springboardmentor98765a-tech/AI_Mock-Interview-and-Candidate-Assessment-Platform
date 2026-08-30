# Slice plan: Module 6 — Emotion Detection & Eye Tracking

**Revision 2** (2026-08-25). Slices 1–2 are done and still valid. Slice 3
(Gemini post-hoc) is retired. Numbering continues rather than restarting, so
existing references stay meaningful.

- [x] **Slice 1** — rename cleanup + 13 pre-existing Module 5 bug fixes.
- [x] **Slice 2** — tracer bullet: `behavior_report` column, `"behavior"` key,
      `BehaviorReport.jsx`. Proven in the browser.
- [~] **Slice 3** — Gemini post-hoc analysis. Retired by revision 2.

- [ ] **Slice 3b — remove the retired path.** Delete the Gemini behaviour code
      listed in `02-architecture.md`. Nothing else changes. Proof: full backend
      suite green, `/health` no longer advertises a capability that is gone.

- [ ] **Slice 4 — live tracking, tuned against a real face.** Vendor MediaPipe
      + model into `public/models/`, write `faceTracker.js`, wire it into the
      camera panel with a **temporary on-screen debug readout** (live gaze zone,
      expression, blendshape magnitudes). Sit in front of it and tune the
      thresholds from decision 1/2/3 of Gate 3. Proof: the readout tracks
      reality — looking at the keyboard says `down`, turning to a second screen
      says `side`, facing the camera says `camera`. Ends with the debug readout
      still in place; it is removed in Slice 6.

- [ ] **Slice 5 — the alert, and the report from measured samples.** Rolling
      window → live nudge in `LiveSession.jsx`. New `POST .../behavior`
      endpoint, rewritten `behavior_analysis.aggregate()`, samples uploaded at
      the end of a session. Proof: run a real interview looking away
      deliberately, see the nudge fire, then open History → View and find the
      look-away reflected in the report.

- [ ] **Slice 6 — polish and verification.** Remove the debug readout; handle
      the edge cases (camera off, model fails to load, too few samples, tab
      backgrounded); the Gate 3 test suites; full backend suite; frontend
      build; end-to-end browser walkthrough; README note.

## Standing constraint for every slice

The camera is optional and the recording is the primary artefact. No slice may
make the interview depend on the tracker, and if inference load ever threatens
the `MediaRecorder`, the sample rate drops first.
