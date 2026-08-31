# Module 6 Runtime Fixes — 2026-08-30

- Local Python runtimes are stored under `C:\SmartHireAI_Runtime` to avoid Windows MAX_PATH failures during package installation.
- The eye-tracking service prefers MediaPipe when available and uses a real OpenCV Haar-cascade eye/face tracker on Python 3.13 when MediaPipe wheels are unavailable.
- The frontend treats `opencv-eye-tracker-fallback` as real provider data and never fabricates monitoring scores.
- The trained CNN model is synced from the existing local training output by `SYNC-MODULE6-MODEL.ps1`.
- Object detection continues to use the isolated Ultralytics environment.
