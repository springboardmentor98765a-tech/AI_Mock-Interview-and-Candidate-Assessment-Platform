# SmartHire AI — Final Module 6 Audit Report

Date: 2026-08-30
Scope: Module 6 emotion recognition, live monitoring, eye-tracking integration, proctoring wiring, and presentation-ready project structure.

## Verified in the development session
- Python 3.13.15 environment established.
- TensorFlow 2.21.0, OpenCV 4.12.0 and Pillow installed.
- 900 labelled face crops collected for Nervous, Scared and Confused.
- Dataset split: 630 train, 135 validation, 135 test.
- Custom CNN trained with the required Conv2D/ReLU/Pooling/Flatten/Dense/Softmax structure.
- Reported best validation accuracy: 100%.
- Reported held-out test accuracy: 94.07%.
- Saved model: `ai-services/emotion-cnn-service/model/emotion_cnn.keras`.
- Direct model loading verified.
- Direct API `/health` verified with `available=true` after local model-path correction.
- API `/analyze` verified for Nervous, Scared and Confused sample images.

## Source changes included in this build
- CNN service model path is resolved relative to `main.py` by default, while still allowing `EMOTION_CNN_MODEL` overrides.
- CNN service no longer double-normalizes images before passing them to the trained model.
- CNN requirements use GUI-capable `opencv-python` and include Pillow for image inference tooling.
- Live Interview now includes a dedicated Module 6 monitoring panel.
- Live monitoring renders emotion, emotion confidence, eye contact, attention, engagement, confidence, gaze, head stability, face count, provider and sample count.
- Monitoring separates provider availability so that a working CNN can remain visible even when eye tracking is degraded; no synthetic metrics are generated.
- Existing Spring Boot `/api/ai/emotion` and `/api/ai/eye-tracking` facade remains the frontend integration point.
- Existing server-side proctoring controller/service and three-strike enforcement remain part of the build.
- A single audit report is retained in the project.

## Required local runtime components
1. Spring Boot backend on port 8080.
2. Custom CNN service on port 8095.
3. MediaPipe service on the configured port if eye-tracking is to be ACTIVE.
4. Existing Gemini/Whisper/LanguageTool services as required by the rest of the application.
5. The trained `emotion_cnn.keras` binary must be present in `ai-services/emotion-cnn-service/model/` for the CNN service to report `available=true`.

## Model handling
The trained 29.5 MB Keras model is not embedded in this package because the model binary remains only on the user's local development machine at build time. Use `SYNC-MODULE6-MODEL.ps1 -SourceModel <path>` to copy the already-trained local model into the expected project location before running the CNN service.

## Known limitations
- Webcam object detection only covers objects visible to the camera.
- Emotion outputs are ML estimates, not definitive psychological measurements.
- Eye contact is an image/landmark approximation.
- Browser full-screen remains subject to browser gesture and permission rules.
- Real-world deployment should document privacy, consent, retention and security requirements.

## Build-fix note
The previous integration package exposed eight Java compilation errors in `InterviewService.java`: four missing proctoring fields on `InterviewHistoryDetailResponse` and four references to an out-of-scope `response` variable during evaluation. Those source errors have been corrected in this package.

A second runtime issue was found during live testing: the existing PostgreSQL `interview_sessions` table predates the Module 6 proctoring fields, so the API failed with `column "malpractice_terminated" ... does not exist` while creating a session. This package now includes an idempotent Module 6 schema-repair SQL script and configures Spring Boot to run that script at startup, so legacy local databases are aligned automatically without dropping existing interview data. The same repair script is also available at `smarthire-backend/db/repair_section6_schema.sql` for manual use.

The CNN component and the frontend monitoring bridge are implemented in this build. Full end-to-end status of the complete interview room still depends on the user's local AI services and the final manual interview run.
