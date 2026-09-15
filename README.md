# ⚡ Next-Gen AI Mock Interview, Speech & Vision Behavioral Assessment Platform

A full-stack, enterprise-grade AI Mock Interview, Speech Analysis, Computer Vision & ML Behavioral Intelligence Platform built with **FastAPI**, **PyTorch (CNN Emotion Detection)**, **OpenCV (Face & Landmark Tracking)**, **Google Gemini 2.5 Flash API**, **Vanilla JS / HTML5 / CSS3**, and modern **Web Audio & MediaRecorder APIs**.

---

## 🌟 Platform Overview & Core Architecture

```
                                  [ Browser Frontend / Client ]
                               /                |               \
                   [Candidate Portal]  [Recruiter Portal]  [Admin Portal]
                               \                |               /
                     [JWT Auth & RBAC Security Middleware (/api/auth)]
                                                |
               +--------------------------------+--------------------------------+
               |                                |                                |
     [Live Interview Engine]        [Speech & Audio Engine]           [Vision & ML Engine]
      • Adaptive Questions           • Real-time Transcription         • YuNet Face & Landmark Detect
      • Answer Evaluation            • Speaking Pace (WPM)             • PyTorch CNN Emotion Classifier
      • WebM Audio/Video Stream      • Filler-word Detection           • Gaze & Head Pose Estimation
      • Session State Lifecycle      • Grammar & Acoustic Clarity      • Eye Contact & Attention Math
               |                                |                                |
               +--------------------------------+--------------------------------+
                                                |
                                    [Scoring & Analytics Core]
                                     • Communication Score (30%)
                                     • Confidence Score (25%)
                                     • Technical Relevance (30%)
                                     • Professionalism (15%)
                                     • Dynamic Ranking & Shortlisting
                                                |
               +--------------------------------+--------------------------------+
               |                                |                                |
     [Storage & Persistence]        [Reports & Exports]            [Notifications Service]
      • InMemoryDB / SQL Model       • ReportLab PDF Summary           • Interview Reminders
      • Video Storage (/recordings)  • Telemetry CSV Export            • Session Completion Alerts
      • Real-time Telemetry Logs     • AI Strengths & Weaknesses       • SMTP / System Mailers
```

---

## ⚖️ Standardized Scoring Engine & Rubric

All candidate evaluations strictly adhere to the project's deterministic weighted scoring formula:

$$\text{Overall Score} = (0.30 \times \text{Communication}) + (0.25 \times \text{Confidence}) + (0.30 \times \text{Technical Relevance}) + (0.15 \times \text{Professionalism})$$

### Score Classification Rubric
* **90 – 100**: `Excellent`
* **75 – 89**: `Good`
* **60 – 74**: `Average`
* **40 – 59**: `Needs Improvement`
* **Below 40**: `Poor`

> **Real Data Commitment**: Every score is mathematically derived from actual question evaluations, linguistic grammar analyses, audio pacing, and facial tracking metrics. Zero hardcoded scores, zero mock numbers, and zero randomized metrics.

---

## 👥 Multi-Role Access & Features

### 1. 🎓 Candidate Portal
- **Profile & Resume Management**: Upload resumes, parse skills, and manage candidate profile data.
- **Adaptive Mock Interviews**: Select job roles, experience levels, and difficulty.
- **Live Video/Audio Room**: Synchronized camera/microphone permissions, real-time question display, WebM recording, and instant answer evaluations.
- **Dynamic Analytics Dashboard**: Skill radar charts, historical performance trends, weak-area algorithmic identification, and AI coaching suggestions.
- **Report Downloads**: Instant PDF assessment report generation and raw telemetry CSV downloads.

### 2. 💼 Recruiter Portal
- **Candidate Performance Overview**: Real-time listing of candidate submissions and interview scores.
- **Candidate Comparison**: Side-by-side multi-candidate benchmarking across communication, confidence, and technical mastery.
- **Algorithmic Ranking**: Deterministic sorting by overall performance and skill-weighted scores.
- **Configurable Shortlisting**: Dynamic status pipelines (`applied`, `reviewing`, `shortlisted`, `rejected`).
- **Batch Export**: Recruiter-level interview metrics exportable to CSV.

### 3. 🛡️ Admin Portal
- **User & Recruiter Management**: Role modifications, user activation/suspension, and audit logging.
- **System Activity & Telemetry Monitoring**: Real-time tracking of active sessions, CPU/RAM utilization, and API latency.
- **AI Performance & Ground Truth Transparency**: Model health monitoring with explicit ground truth dataset status reporting.

---

## 👁️ Computer Vision & Behavioral ML Features

### 1. 🎭 PyTorch CNN Facial Emotion Analysis
- **Classes**: `Nervous`, `Scared`, `Confused` (observable facial expression estimates).
- **Architecture**: 3-block 2D Convolutional Neural Network with Batch Normalization, Dropout (0.25/0.5), Max-Pooling, Dense Classifier layer, and Softmax probability distribution.
- **Preprocessing**: Grayscale conversion, `48x48` resizing, `[-1.0, 1.0]` pixel normalization.

### 2. 👁️ Eye Landmark Tracking & Gaze Estimation
- **Eye ROI & Iris Localization**: Detects eye regions, measures Eye Aspect Ratio (EAR), and computes pupil centroid horizontal/vertical gaze ratios.
- **Gaze States**: `Looking at camera`, `Looking left`, `Looking right`, `Looking down`, `Eyes closed`.

### 3. 🧭 Head Direction & 3D Pose Estimation
- Compares nose tip position against facial midline and eye plane.
- **States**: `Forward`, `Turning Left`, `Turning Right`, `Looking Up`, `Looking Down`.

### 4. ⚡ Mathematical Eye Contact & Engagement Scores
- **Eye Contact %**: `(camera_looking_frames / valid_tracking_frames) * 100`
- **Engagement Formula**: $0.35 \times \text{EyeContact} + 0.35 \times \text{Attention} + 0.15 \times \text{FacialActivity} + 0.15 \times \text{HeadStability}$

---

## 🛠️ Project Structure

```text
├── backend/
│   ├── main.py                          # FastAPI entry point, static mounts & router integration
│   ├── config.py                        # App configuration, weights, and environment variables
│   ├── database.py                      # InMemory database engine with pre-seeded demo accounts
│   ├── auth.py                          # JWT authentication & role-based access control (RBAC)
│   ├── models/
│   │   ├── emotion_cnn.py               # PyTorch EmotionCNN neural network definition
│   │   ├── emotion_cnn.pth              # Serialized trained model weights
│   │   ├── face_detection_yunet.onnx   # OpenCV YuNet Face & Landmark detector
│   │   ├── speech_models.py             # Pydantic schemas for speech telemetry
│   │   ├── interview_models.py          # Pydantic schemas for interview sessions
│   │   └── user_models.py               # User and credential schemas
│   ├── services/
│   │   ├── face_analyzer.py             # OpenCV face detection, gaze, head pose & facial activity
│   │   ├── behavior_tracker.py          # Session telemetry accumulator & final report generator
│   │   ├── scoring_service.py           # Weighted 4-pillar scoring engine & rubric classifier
│   │   ├── feedback_service.py          # Gemini AI evaluation & coaching feedback generator
│   │   ├── analytics_service.py         # Dynamic candidate, recruiter, and admin analytics
│   │   ├── report_service.py            # PDF report generator & CSV telemetry exporter
│   │   ├── notification_service.py      # Scheduled reminders & system notification alerts
│   │   ├── stt_service.py               # Speech-to-Text transcription engine
│   │   ├── grammar_service.py           # Linguistic syntax & grammar analyzer
│   │   ├── filler_service.py            # Filler-word detector & frequency calculator
│   │   └── pace_service.py              # WPM calculator & speaking pace categorizer
│   └── routers/
│       ├── auth_router.py               # /api/auth (Login, Register, Me)
│       ├── interview_router.py          # /api/interview (Create, Answer, Record, Finalize)
│       ├── interview_analysis_router.py # /api/interview-analysis (Video frame stream, Gaze, CNN)
│       ├── speech_router.py             # /api/speech (Audio analysis, STT, Grammatical checks)
│       ├── candidate_router.py          # /api/candidate (Candidate dashboard, trends, weak areas)
│       ├── recruiter_router.py          # /api/recruiter (Candidate lists, rankings, comparisons)
│       ├── admin_router.py              # /api/admin (User management, system health, telemetry)
│       ├── report_router.py             # /api/reports (PDF download, CSV export)
│       ├── notification_router.py       # /api/notifications (Reminders, email triggers)
│       ├── resume_router.py             # /api/resume (PDF upload & skill parsing)
│       └── analytics_router.py          # /api/analytics (Platform overview metrics)
├── tests/
│   ├── test_auth.py                     # RBAC & authentication unit tests
│   ├── test_interview.py                # Interview lifecycle & answer evaluation tests
│   ├── test_interview_analysis.py       # Computer vision, CNN, eye tracking & gaze tests
│   ├── test_scoring.py                  # Mathematical scoring & rubric validation tests
│   ├── test_notifications_reports.py    # PDF reports, CSV export & notification tests
│   └── test_dashboard_analytics.py      # Candidate, Recruiter & Admin analytics tests
├── index.html                           # Single Page Application HTML5 frontend
├── style.css                            # Glassmorphism dark/light design system
├── app.js                               # Modern Vanilla JS client & API interface
├── recordings/                          # Server-side interview video storage
├── reports/                             # Generated PDF/CSV download directory
├── requirements.txt                     # Production Python dependencies
├── .env.example                         # Environment configuration template
└── README.md                            # Comprehensive technical documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python 3.10+** (Tested on Python 3.10, 3.11, 3.12, 3.14)
- **Web Browser** (Google Chrome, Microsoft Edge, Firefox, Safari)

### 2. Installation
```bash
# Clone the repository
git clone <repository-url>
cd <repository-directory>

# Create virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment
Copy `.env.example` to `.env` and configure your keys:
```bash
cp .env.example .env
```
*(Optional: Provide `GEMINI_API_KEY` for live generative interview synthesis. If not provided, robust deterministic fallback evaluators operate automatically.)*

### 4. Start Development Server
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 5. Access Application
Open `http://127.0.0.1:8000` in your web browser.

### Default Demo Accounts (Pre-Seeded)
| Role | Email | Password |
| :--- | :--- | :--- |
| **Candidate** | `candidate@example.com` | `password123` |
| **Recruiter** | `recruiter@example.com` | `password123` |
| **Admin** | `admin@example.com` | `password123` |

---

## 🧪 Automated Testing Suite

The repository contains an exhaustive automated test suite with **86 tests** passing with 100% success rate:

```bash
python -m unittest discover -s tests -p "test_*.py"
```

### Test Coverage Areas:
1. **`test_auth.py`**: JWT token creation, registration, invalid credentials, RBAC route guards.
2. **`test_interview.py`**: Adaptive question creation, audio/video upload, answer submission, session finalization.
3. **`test_interview_analysis.py`**: Face detection, CNN model inference, gaze tracking, eye contact accumulation, attention scoring.
4. **`test_scoring.py`**: Exact formula compliance ($30\% + 25\% + 30\% + 15\%$), score bounds (0–100), rubric thresholds.
5. **`test_notifications_reports.py`**: PDF generation, CSV exports, interview reminder scheduling.
6. **`test_dashboard_analytics.py`**: Candidate history, Recruiter comparison/ranking, Admin system health probes, empty states.

---

## 🛡️ Scientific Transparency & Accuracy Disclosures

1. **Observable Facial Estimates**: CNN classifications (`Nervous`, `Scared`, `Confused`) are observable facial appearance estimates derived from facial landmark geometry and muscle tension indicators. They do not claim to scientifically diagnose internal psychological or medical conditions.
2. **Ground Truth Disclosure**: AI accuracy metrics are explicitly reported as:
   > *"Accuracy cannot be determined without a validated ground-truth dataset."*
   The system never fabricates or hallucinates accuracy percentages.
3. **Deterministic Persistence**: Every metric, ranking, chart, and report is computed dynamically from persisted session and evaluation data.
