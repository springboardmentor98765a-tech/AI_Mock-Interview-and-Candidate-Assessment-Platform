# ⚡ Next-Gen AI Mock Interview, Speech & Vision Behavioral Analysis Platform

A full-stack, production-ready AI Mock Interview, Speech Analysis, and Computer Vision & ML Behavioral Intelligence Platform built with **FastAPI**, **PyTorch (CNN Emotion Detection)**, **OpenCV (Face & Landmark Tracking)**, **Google Gemini 2.5 Flash API**, **Vanilla JS / HTML5 / CSS3**, and modern **Web Audio & MediaRecorder APIs**.

---

## 🌟 Key Features & Architecture

```
Candidate Webcam Stream (Browser)
   ↓ (sampled at 2.5 FPS during live interview)
Base64 JPEG Frame → POST /api/interview-analysis/frame
   ↓
[OpenCV Face Detection & Preprocessing]
   ├─ Face bounding box (primary candidate selection)
   ├─ Face ROI extraction & normalization (48x48)
   ↓
[CNN Emotion Analysis Pipeline]
   ├─ PyTorch CNN Architecture (Conv2D-ReLU-Pool x 3, FC x 2, Softmax)
   ├─ Classes: Nervous, Scared, Confused (Observable expression estimates)
   ├─ Training script, dataset guide, checkpoint loader & clear state reporting
   ↓
[Facial Geometry & Eye / Head Tracking]
   ├─ 5-Point facial landmarks & pupil intensity localization → Gaze Direction (Camera, Left, Right, Down, Eyes Closed)
   ├─ 3D head geometry & nose symmetry → Head Direction (Forward, Turning Left, Turning Right, Up, Down)
   ├─ Inter-frame landmark/optical displacement → Facial Activity Score (0-100)
   ↓
[Real-Time Session Telemetry & Accumulation]
   ├─ Eye Contact Time & Percentage (looking_time / valid_tracking_time * 100)
   ├─ Attention Score (0-100) & Level (High / Medium / Low)
   ├─ Engagement Score (0-100) & Level (High / Medium / Low) via documented weighted formula
   ├─ Confidence-related Indicators (Composite of Eye Contact, Head Stability, Facial Activity, Speech Fluency)
   ↓
[Live UI Dashboard & Final Behavioral Report]
   ├─ Live gauges and status telemetry in the active interview room
   ├─ Standalone AI Video & Behavioral Lab Studio
   ├─ Final Comprehensive Behavioral Report with distribution charts, metrics, and actionable recommendations
   └─ Seamless integration with existing speech & Gemini AI evaluation
```

---

## 👁️ Computer Vision & Behavioral ML Features

### 1. 🎭 PyTorch CNN Facial Emotion Analysis
- **Classes**:
  1. `Nervous`
  2. `Scared`
  3. `Confused`
- **Architecture**: 3-block 2D Convolutional Neural Network with Batch Normalization, Dropout (0.25/0.5), Max-Pooling, Dense Classifier layer, and Softmax probability distributions.
- **Preprocessing**: Grayscale conversion, `48x48` resizing, `[-1.0, 1.0]` pixel normalization, PyTorch Tensor shape `(1, 1, 48, 48)`.
- **Disclaimer**: Emotion predictions represent *observable facial expression estimates* and do not claim to scientifically diagnose internal psychological or mental states.

### 2. 👁️ Eye Landmark Tracking & Gaze Estimation
- **Eye ROI & Iris Localization**: Detects eye regions, measures Eye Aspect Ratio (EAR) for eye closure, and calculates pupil centroid horizontal & vertical ratios.
- **Gaze States**:
  - `Looking at camera` (pupil centered within 35%–65% bounds)
  - `Looking left`
  - `Looking right`
  - `Looking down`
  - `Eyes closed`
  - `Unknown / face not detected`

### 3. ⏱️ Mathematical Eye Contact Accumulation
- **Continuous Session Timer**: Accumulates valid face tracking time and camera-looking time.
- **Formula**: `Eye Contact % = (camera_looking_frames / valid_tracking_frames) * 100`.
- **Interpretations**: `High` (>=70%), `Moderate` (45%–69%), `Low` (<45%).

### 4. 🧭 Head Direction & 3D Pose Estimation
- **Landmark Geometry**: Compares nose tip position against eye midpoint and facial midline.
- **States**: `Forward`, `Turning Left`, `Turning Right`, `Looking Up`, `Looking Down`.

### 5. 🎯 Attention Monitoring Score
- **Formula**: Combination of face presence (+30), camera gaze (+40), forward head pose (+30), and penalties for prolonged looking away (-25) or closed eyes (-35).
- **Smoothed Score**: 0–100 score, categorized into `High` (>=75), `Medium` (50–74), `Low` (<50).

### 6. ⚡ Engagement Measurement
- **Documented Weighted Formula**:
  $$\text{Engagement Score} = 0.35 \times \text{EyeContact} + 0.35 \times \text{Attention} + 0.15 \times \text{FacialActivity} + 0.15 \times \text{HeadStability}$$
- **Configurable Weights**: Centralized in `InterviewSessionTracker`.

### 7. 📊 Observable Confidence-Related Indicators
- **Composite Indicator Score**: Integrates Eye Contact consistency (30–40%), Head Stability (30–35%), Facial Stability (20–25%), and Response Fluency (20% if speech metrics available).
- **Level**: `High`, `Moderate`, `Low`.

### 8. 🎙️ Integrated Speech & Communication Analysis
- **Speech-to-Text**: Real-time microphone capture & transcription.
- **Grammar & Fillers**: Deep syntactical analysis and filler word detection.
- **Speaking Pace (WPM)** & **Pause Timeline**.
- **Integrated Synthesis**: Combined with video behavior in the final performance report.

---

## 🛠️ Project Structure

```text
├── backend/
│   ├── main.py                          # FastAPI entry point & API route registration
│   ├── config.py                        # Configurable thresholds, weights, and API keys
│   ├── database.py                      # In-memory database & session records
│   ├── auth.py                          # JWT authentication & role security
│   ├── models/
│   │   ├── emotion_cnn.py               # PyTorch EmotionCNN model & inference pipeline
│   │   ├── emotion_cnn.pth              # Serialized trained model weights
│   │   ├── face_detection_yunet.onnx   # OpenCV YuNet Face & Landmark detector
│   │   ├── speech_models.py             # Pydantic models for speech analytics
│   │   ├── interview_models.py          # Interview data schemas
│   │   └── user_models.py               # User data schemas
│   ├── services/
│   │   ├── face_analyzer.py             # OpenCV face detection, gaze, head pose & facial activity
│   │   ├── behavior_tracker.py          # Session telemetry, scoring formulas & final report generator
│   │   ├── train_emotion_model.py       # CNN training script & dataset guidance
│   │   ├── stt_service.py               # Speech-to-Text engine (Gemini / Whisper / fallback)
│   │   ├── grammar_service.py           # Linguistic grammar analysis
│   │   ├── filler_service.py            # Configurable filler-word detector
│   │   ├── pace_service.py              # WPM calculation & category classifier
│   │   ├── audio_processor.py           # RMS energy & silence pause timeline
│   │   ├── pronunciation_service.py     # Phonetic syllable stress analyzer
│   │   ├── communication_service.py     # Composite score & AI coaching feedback
│   │   └── gemini_service.py            # Gemini 2.5 Flash interview generator
│   └── routers/
│       ├── interview_analysis_router.py # REST endpoints for vision & behavioral telemetry
│       ├── speech_router.py             # REST endpoints for speech analysis & STT
│       ├── interview_router.py          # Session lifecycle & video recording endpoints
│       ├── auth_router.py               # User authentication endpoints
│       ├── resume_router.py             # Resume PDF upload & parsing
│       └── analytics_router.py          # Recruiter & Admin performance analytics
├── tests/
│   ├── test_interview_analysis.py       # Unit & integration tests for vision, CNN, eye tracking & APIs
│   └── test_speech_analysis.py          # Unit & integration tests for speech analytics & STT
├── index.html                           # HTML5 interactive interface with Live HUD & Behavior Studio
├── style.css                            # Glassmorphism design system, telemetry cards & report styles
├── app.js                               # Frontend client logic & real-time video stream engine
├── recordings/                          # Server-side audio/video recording storage
├── requirements.txt                     # Python dependencies
└── README.md                            # Complete documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+** (Tested on Python 3.11, 3.12, 3.14)
- **Modern Web Browser** (Google Chrome, Microsoft Edge, Firefox, Safari)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. (Optional) Re-Train the Emotion CNN Model
A trained weights file `backend/models/emotion_cnn.pth` is included. To re-train or fine-tune with custom epochs:
```bash
python -m backend.services.train_emotion_model --epochs 10 --batch_size 32
```

### 3. Start the Backend Server
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 4. Access the Application
Open your browser and navigate to:
```text
http://127.0.0.1:8000/
```

- **Candidate Mock Interview**: Click **Candidate Portal** (or one-click demo login), configure domain, start the session, allow camera permissions, and observe real-time AI emotion, eye tracking, and attention metrics live during the assessment.
- **AI Video & Behavior Studio**: Click **👁️ Video Lab** in the navbar to test live camera landmark tracking, CNN emotion detection, gaze direction, and generate on-demand behavioral reports.
- **Speech Lab**: Click **🎙️ Speech Lab** to practice spoken response pacing, grammar verification, and filler word detection.

---

## 🧪 Running Automated Tests

Run the complete 31-test automated suite covering CNN emotion inference, face detection, gaze direction, eye contact math, attention scoring, engagement formulas, confidence indicators, final report generation, and speech analytics:

```bash
python -m unittest discover tests
```

---

## 📡 API Reference

### AI Vision & Behavioral Analysis Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/interview-analysis/model-status` | Returns CNN emotion model status (`trained_loaded`), classes, and disclaimer |
| `POST` | `/api/interview-analysis/start` | Initializes a new video behavior tracking session |
| `POST` | `/api/interview-analysis/frame` | Analyzes a video frame: detects face, infers emotion, tracks gaze/head, returns live telemetry |
| `POST` | `/api/interview-analysis/stop` | Stops analysis session and computes duration/totals |
| `GET` | `/api/interview-analysis/{session_id}` | Retrieves live telemetry metrics for active session |
| `GET` | `/api/interview-analysis/{session_id}/report` | Generates final behavior report with distribution charts and improvement areas |

### Speech & Mock Interview Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/interview/create` | Generates adaptive interview questions |
| `POST` | `/api/interview/{id}/answer` | Evaluates candidate answer |
| `POST` | `/api/interview/{id}/upload_recording` | Stores candidate video/audio stream |
| `POST` | `/api/interview/{id}/finalize` | Completes interview and synthesizes performance report |
| `POST` | `/api/speech/analyze` | Full audio speech analysis (STT, grammar, fillers, pace, pauses) |
| `POST` | `/api/speech/text-analyze` | Speech analysis on direct text input |

---

## 🛡️ Scientific & Technical Notice

1. **Observable Facial Expression Estimates**: CNN emotion classifications (`Nervous`, `Scared`, `Confused`) are observable facial appearance estimates derived from visible facial landmarks and tension patterns. They do not constitute psychological mind-reading or medical diagnostic assessments.
2. **Deterministic Tracking**: All eye-contact percentages, gaze distributions, attention levels, and engagement scores are mathematically calculated from continuous webcam video frames throughout the session, with zero hardcoding or simulated placeholder metrics.
