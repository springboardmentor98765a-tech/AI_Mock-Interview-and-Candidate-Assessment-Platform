# ⚡ Next-Gen AI Mock Interview & Candidate Assessment Platform

An AI-powered full-stack mock interview platform built with **FastAPI**, **Google Gemini 2.5 Flash API**, **Vanilla JS**, and modern **Web APIs**.

Features adaptive AI question generation, live camera & microphone studio, MediaRecorder video/audio capture, timer-based workflow engine, executive performance analytics, and session data storage.

---

## 🌟 Key Features

### 1. 🎯 Interview Sessions Management
- **Lifecycle Controls**: Start, Pause, Resume, and End interview sessions seamlessly.
- **Dynamic Question Sequence**: One-by-one question presentation with progress tracking and AI evaluation.
- **Session Timestamps**: Automatic ISO timestamping for start and end times.

### 2. 📹 Webcam & Microphone Studio
- **Browser Permission Request**: Camera and microphone stream access via `getUserMedia`.
- **Live Preview**: Real-time mirrored video preview player.
- **Fallback Handling**: Device error detection (denied/unavailable) with text-mode fallback.

### 3. 🎙️ MediaRecorder API Video & Audio Capture
- **Real-Time Capture**: Video and audio stream recording using browser `MediaRecorder`.
- **Server Storage**: Secure backend media storage in `recordings/`.
- **Authorized Access & Download**: Direct streaming and one-click `.webm` video downloading for Candidates, Recruiters, and Admins.

### 4. ⏱️ Timer-Based Workflow Engine
- **Live Header Dashboard**:
  - **Total Duration Timer** (`HH:MM:SS`)
  - **Current Question Timer** (`MM:SS`)
  - **Remaining Time Countdown** (with warning color indicators)
  - **Questions Completed Counter** (`X / Y`)

### 5. 📌 Session Storage & Performance Analytics
- Complete structured session metadata persistence: Candidate ID, Interview ID, Session ID, timestamps, total duration, session status, video/audio recording references, and question time breakdowns.
- Synthesized AI Executive Reports powered by Google Gemini 2.5 Flash.

---

## 🛠️ Project Structure

```text
Role Dashboard/
├── backend/
│   ├── main.py                # FastAPI application entry point & static file serving
│   ├── config.py              # Configuration settings & environment variables
│   ├── database.py            # InMemory DB model & pre-seeded data
│   ├── auth.py                # JWT Authentication & role security
│   ├── services/
│   │   ├── gemini_service.py  # Google Gemini 2.5 Flash API integration
│   │   └── resume_service.py  # PDF Resume parsing service
│   └── routers/
│       ├── auth_router.py      # Authentication API endpoints
│       ├── interview_router.py # Session lifecycle & recording upload/stream endpoints
│       ├── resume_router.py   # Resume upload & parsing endpoints
│       └── analytics_router.py# Recruiter & Admin analytics endpoints
├── index.html                 # Main frontend HTML5 layout
├── style.css                  # Modern Glassmorphism CSS design system
├── app.js                     # Frontend interactive JavaScript application
├── recordings/                # Server storage directory for recorded video/audio
├── requirements.txt           # Python dependencies list
├── .gitignore                 # Files excluded from Git repository
└── README.md                  # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Modern Web Browser (Chrome, Edge, Firefox, Safari)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Gemini API Key (Optional)
Set your Google Gemini API Key in environment variables or `backend/config.py`:
```bash
export GEMINI_API_KEY="your_api_key_here"
```
*(Note: If no API Key is provided, the platform automatically runs in smart fallback mode).*

### 3. Run Application Server
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 4. Access Platform
Open your browser and navigate to:
```text
http://127.0.0.1:8000/
```

---

## 👤 Quick Demo Accounts
- **Candidate Portal**: `candidate@example.com` / `password123`
- **Recruiter Portal**: `recruiter@example.com` / `password123`
- **Admin Workspace**: `admin@example.com` / `password123`

---

## 📜 License
MIT License - feel free to use and customize for your projects!
