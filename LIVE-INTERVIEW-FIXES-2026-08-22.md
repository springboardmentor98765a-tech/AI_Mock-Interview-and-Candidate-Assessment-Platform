# SmartHire AI — Live Interview Final Fixes (2026-08-22)

- Fixed pinned camera overlap by reserving a dedicated right-side camera lane on desktop.
- Kept the camera visible while interview content scrolls.
- Synchronized Camera/Microphone/Recording status with actual MediaStream tracks and recorder state.
- Fixed Response Signals so voice transcripts contribute to answer length and live signal values.
- Added live Speech Pace, Filler Words and Communication metrics to Response Signals.
- Kept signal/status numbers visible with high-contrast styling in both themes.
- Preserved fullscreen exam-mode behavior and fixed bottom interview controls.
- Added the final CSS override after all other live-interview styles so the fixes win the cascade.
