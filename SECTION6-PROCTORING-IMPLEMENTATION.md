# Section 6 + Real-World Proctoring

Implemented: real DeepFace emotion adapter, MediaPipe eye tracking, session monitoring aggregation, confidence wiring, browser proctoring, server-side violation persistence, 3-warning auto-submission, fullscreen/tab/camera/mic violations, no-face/multiple-face signals, copy/paste/context-menu detection, final malpractice state, and report evidence.

## Real-world limitation
Browser applications cannot inspect physical devices outside the camera field of view. Prohibited electronic-device detection must use a camera-visible object detector. When no object detector is available, SmartHire reports monitoring as degraded rather than inventing a detection result.

## 3-strike policy
1. First violation -> Warning 1.
2. Second violation -> Warning 2.
3. Third violation -> interview is server-side terminated with `PROCTORING_TERMINATED`.
