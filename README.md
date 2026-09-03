<div align="center">

# SmartHire AI
### Enterprise AI-Powered Candidate Assessment & Multi-Modal Interview Platform

[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-0.10.14-007FFF?style=flat-square&logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Pytest-Passing-brightgreen?style=flat-square&logo=pytest&logoColor=white)](https://pytest.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

<p align="center">
  <b>SmartHire AI</b> delivers automated, unbiased, and multi-modal candidate evaluations for technical and behavioral interviews. By combining computer vision proctoring, real-time speech analytics, dynamic LLM-driven question generation, and ATS resume matching, SmartHire AI provides an end-to-end talent acquisition and assessment infrastructure.
</p>

[Quick Start](#-quick-start) •
[Architecture](#-system-architecture) •
[Core Capabilities](#-core-capabilities) •
[API Reference](#-api-specification) •
[Configuration](#-environment-configuration) •
[Testing](#-testing--quality-assurance) •
[Docker Deployment](#-containerized-deployment)

</div>

---

## 🌟 Executive Overview

Modern technical recruiting suffers from inconsistent interview quality, scheduling bottlenecks, unconscious interviewer bias, and high engineering cost spent on repetitive first-round screens.

**SmartHire AI** resolves these challenges by providing an autonomous, objective evaluation pipeline:
- **Comprehensive Evaluation**: Candidate answers are evaluated against four standardized pillars: **Communication (30%)**, **Technical Relevance (30%)**, **Confidence (25%)**, and **Professionalism (15%)**.
- **Real-Time Proctoring & Vision Telemetry**: Real-time facial landmark tracking (MediaPipe 478 points), head pose estimation, directional eye gaze tracking via MobileNetV2 CNN, and emotion state analysis (nervousness, confidence, fear, confusion).
- **Speech & Linguistics Analysis**: Measures articulation clarity, words per minute (WPM), hesitation pause ratio, and filler word frequency.
- **ATS Resume Intelligence**: Automatic parsing and semantic alignment scoring between candidate experience and job requirements.
- **Role-Based Workspaces**: Tailored workflows for **Candidates** (practice & interview rooms), **Recruiters** (candidate pipelines, scoring comparisons, and template designer), and **Administrators** (user provisioning and audit logs).

---

## 🏗️ System Architecture

SmartHire AI adopts a modular, decoupled full-stack architecture adhering to enterprise standards:

```
SmartHire AI/
├── frontend/                               # Client Application (Vanilla HTML5 / CSS / JS SPA)
│   ├── index.html                          # Single-page application entry point
│   ├── assets/                             # Static visual assets & branding
│   │   └── logo.svg                        # Indigenous vector brand identity
│   ├── css/                                # Global styling & design system
│   │   └── styles.css                      # Tailwind & glassmorphism design tokens
│   └── js/                                 # Modular client application code
│       ├── core/                           # Foundation modules
│       │   ├── api.js                      # Centralized async HTTP client for /api
│       │   ├── utils.js                    # Layouts, modal portals, and avatar tools
│       │   ├── icons.js                    # SVG icon component system
│       │   └── data.js                     # Benchmark thresholds & mock dataset
│       ├── modules/                        # Domain feature views
│       │   ├── login.js                    # Authentication, roles, and Google OAuth
│       │   ├── candidate.js                # Candidate portal, sessions, and reports
│       │   ├── recruiter.js                # Recruiter talent CRM & comparison matrix
│       │   ├── admin.js                    # System administration control plane
│       │   └── settings.js                 # 4-tab user preferences suite
│       ├── telemetry/                      # Hardware sensors & client telemetry
│       │   └── vision.js                   # Webcam & face mesh canvas HUD
│       └── app.js                          # Application router & event orchestrator
│
├── backend/                                # High-performance Python FastAPI service
│   ├── core/                               # Infrastructure foundation
│   │   ├── config.py                       # Central configuration & environment variables
│   │   ├── database.py                     # SQLite schema, WAL mode, & migrations
│   │   ├── auth.py                         # JWT token authentication & bcrypt security
│   │   └── models.py                       # Pydantic data schemas
│   ├── routes/                             # API controllers
│   │   ├── auth.py                         # Authentication & Google verification
│   │   ├── users.py                        # Profile management
│   │   ├── interviews.py                   # Live sessions, question banks, & recordings
│   │   ├── assessments.py                  # Coding assessments & practice MCQs
│   │   ├── recruiter.py                    # Candidate pipelines & template builder
│   │   ├── resume_analyzer.py              # ATS resume parsing & scoring
│   │   └── notifications.py                # Alerts & notification history
│   ├── services/                           # AI pipelines & business logic
│   │   ├── vision_monitor.py               # MediaPipe 478-point landmark & pose engine
│   │   ├── vision_scoring.py               # Pillar score calculation from vision telemetry
│   │   ├── attention_monitor.py            # Distraction detection & proctoring state machine
│   │   ├── behavior_analysis.py            # Timeline segmentation & qualitative feedback
│   │   ├── emotion_cnn.py                  # Facial emotion classification (4 states)
│   │   ├── gaze_cnn.py                     # Directional gaze inference (MobileNetV2)
│   │   ├── scoring_engine.py               # Multi-modal pillar scoring engine
│   │   └── llm.py                          # Multi-LLM provider abstraction
│   ├── storage/                            # Binary model weights & interview media
│   │   ├── models/                         # MediaPipe & CNN weights (face_landmarker.task)
│   │   └── recordings/                     # Candidate interview video files
│   ├── data/                               # Persistent SQLite database (smarthire.db)
│   ├── tools/                              # Offline CNN model training scripts
│   ├── main.py                             # FastAPI server entry point & static file mount
│   ├── requirements.txt                    # Python backend dependencies
│   ├── .env                                # Local secrets & LLM API keys
│   └── .env.example                        # Template environment configuration
│
├── tests/                                  # Automated Pytest suite
│   ├── conftest.py                         # Test fixtures & FastAPI TestClient setup
│   ├── test_health.py                      # API health & static serving verification
│   ├── test_auth.py                        # Password hashing & JWT token security tests
│   └── test_scoring.py                     # Multi-modal scoring & rubric unit tests
│
├── Dockerfile                              # Multi-stage containerization build file
├── docker-compose.yml                      # Container orchestration & persistent volume mapping
├── .dockerignore                           # Docker build exclusion rules
├── run.py                                  # Cross-platform root application launcher
├── package.json                            # Unified project scripts
├── .gitignore                              # Git ignore rules
└── README.md                               # Project documentation
```

---

## ⚡ Core Capabilities

### 1. Multi-Modal Pillar Scoring
Interviews are graded on an objective 0–100 scale categorized across five rubric tiers:
- **90–100%**: Excellent (Top Tier Benchmark)
- **75–89%**: Good (Meets Strong Professional Standard)
- **60–74%**: Average (Acceptable Baseline)
- **40–59%**: Needs Improvement
- **Below 40%**: Poor

$$\text{Overall Score} = (0.30 \times \text{Comm}) + (0.25 \times \text{Conf}) + (0.30 \times \text{Tech}) + (0.15 \times \text{Prof})$$

### 2. Real-Time Vision & Attention Proctoring
- **Face Landmarker (478 Points)**: Calculates 3D head pose (Yaw, Pitch, Roll) using MediaPipe Task Graph.
- **Attention Monitor**: Tracks distraction duration, multi-face presence, and gaze drift away from the primary display.
- **Emotion CNN Head**: Predicts continuous probabilities for *Nervousness*, *Confidence*, *Fear*, and *Confusion*.
- **Directional Gaze Model**: Custom MobileNetV2 architecture inferring screen fixation.

### 3. Speech & Linguistic Analysis
- Integration with high-accuracy speech-to-text engines (Groq Whisper, Gemini STT, Sarvam AI).
- Linguistic feature extraction: WPM tracking, pause duration detection, sentiment analysis, and filler word detection (*um, uh, like, basically*).

### 4. Recruiter Management & Comparison
- **Talent CRM**: Filter candidates by score, status, domain, and experience.
- **Side-by-Side Comparison**: Compare candidates across each parameter with overlay radar and bar charts.
- **Interview Template Designer**: Create customized assessment templates with targeted question sets.

---

## 🚀 Quick Start

### Prerequisites
- **Python**: `3.10` or higher (`3.11`/`3.12` recommended)
- **Node.js**: (Optional, for running npm scripts)
- **Docker**: (Optional, for containerized deployment)

### 1. Clone & Set Up Virtual Environment
```bash
git clone https://github.com/your-org/smarthire-ai.git
cd smarthire-ai

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `backend/.env` and supply your API credentials:
```bash
cp backend/.env.example backend/.env
```

### 4. Run the Application
You can start the platform using any of the following commands:

```bash
# Method A: Root Application Launcher (Recommended)
python run.py

# Method B: Directly from Backend
cd backend && python main.py

# Method C: Via npm
npm run dev
```

The application will be accessible at **[http://localhost:8080](http://localhost:8080)**.

---

## 🐳 Containerized Deployment

SmartHire AI is fully containerized with automated health checks and persistent storage volumes:

```bash
# Build and launch with Docker Compose
docker compose up -d --build

# Inspect container status
docker compose ps

# View real-time logs
docker compose logs -f

# Shut down service
docker compose down
```

---

## 🧪 Testing & Quality Assurance

SmartHire AI includes an automated Pytest test suite validating health endpoints, JWT security, password hashing, and scoring rubric calculations:

```bash
# Run test suite
pytest tests/ -v

# Or via npm
npm test
```

### Test Coverage Highlights:
- **`test_health.py`**: Validates `/api/health`, HTML/CSS/JS asset delivery, and ensures `.env` is inaccessible over HTTP.
- **`test_auth.py`**: Tests bcrypt one-way password hashing, validation, and JWT encoding/decoding.
- **`test_scoring.py`**: Tests weighted pillar scoring and rubric tier classification.

---

## 📖 API Specification

Interactive API documentation is generated automatically by FastAPI:
- **Swagger UI**: [http://localhost:8080/docs](http://localhost:8080/docs)
- **ReDoc**: [http://localhost:8080/redoc](http://localhost:8080/redoc)

### Key Endpoints

| Category | Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- | :--- |
| **System** | `GET` | `/api/health` | Service health status | Public |
| **Auth** | `POST` | `/api/auth/register` | User account registration | Public |
| **Auth** | `POST` | `/api/auth/login` | User login & JWT issuance | Public |
| **Auth** | `POST` | `/api/auth/google` | Google OAuth token exchange | Public |
| **Auth** | `GET` | `/api/auth/me` | Current authenticated session | Bearer |
| **Interviews** | `GET` | `/api/interviews/analytics/summary`| Aggregated candidate analytics | Bearer |
| **Interviews** | `POST` | `/api/interviews/start` | Initialize live interview session | Bearer |
| **Interviews** | `POST` | `/api/interviews/{id}/submit-answer`| Transcribe & score response | Bearer |
| **Assessments**| `POST` | `/api/assessments/generate` | Generate dynamic MCQ/code test | Bearer |
| **Recruiter** | `GET` | `/api/recruiter/candidates` | List candidate pipeline | Recruiter |
| **Recruiter** | `POST` | `/api/recruiter/templates` | Create custom interview template| Recruiter |
| **Resume** | `POST` | `/api/resume-analyzer/analyze` | AI ATS resume parsing & scoring| Bearer |

---

## ⚙️ Environment Configuration

All environment variables can be configured in `backend/.env`:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Integer | `8080` | Web server listening port |
| `JWT_SECRET` | String | `smarthire-default-secret` | Cryptographic key for JWT tokens |
| `JWT_ALGORITHM` | String | `HS256` | JWT signing algorithm |
| `JWT_EXPIRES_IN_MINUTES` | Integer | `1440` | Session lifetime (in minutes) |
| `DB_PATH` | Path | `data/smarthire.db` | SQLite database file location |
| `GROQ_API_KEY` | String | *None* | Groq cloud API key (LLaMA-3 & Whisper) |
| `GOOGLE_CLIENT_ID` | String | *None* | Google OAuth Client ID for SSO |
| `AICREDITS_API_KEY` | String | *None* | DeepSeek / Qwen API key |
| `RESEND_API_KEY` | String | *None* | Email notification delivery key |

---

## 🔐 Security & Privacy Posture

- **Static Directory Isolation**: Only the `frontend/` directory is mounted publicly. Backend source code, SQLite database files, and `.env` credentials are strictly isolated from HTTP file access.
- **Zero Raw Media Retention Option**: Raw camera telemetry frames are processed in-memory. Only optional, candidate-consented full session recordings are stored in secure storage.
- **Role-Based Access Control (RBAC)**: Fine-grained middleware enforces permissions for `candidate`, `recruiter`, and `admin` scopes.
- **Password Security**: Passwords are encrypted with bcrypt utilizing adaptive work factors.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.
