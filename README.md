 🎯 SmartHire AI — AI-Powered Mock Interview & Candidate Assessment Platform

An AI-powered mock interview platform with live webcam/eye-tracking proctoring, speech & communication analysis, and multi-dimensional AI scoring for candidates, recruiters, coaches, and admins.

🌐 Live Demo

* Frontend: [ai-interview-frontend-production-513a.up.railway.app](https://ai-interview-frontend-production-513a.up.railway.app/)

✨ Features

🎓 Candidate
* AI-generated mock interviews — HR, Technical, Behavioral, Aptitude, or Mixed, with selectable domain and difficulty
* Live webcam- and mic-based interview sessions, typed or voice (Web Speech API) answers
* Real-time proctoring — face detection, tab-switch/full-screen-exit/copy-paste violation flags
* Multi-dimensional AI scoring (Communication 30%, Confidence 25%, Technical Relevance 30%, Professionalism 15%)
* Resume upload with AI-based skill, experience, and education extraction
* Performance dashboard — score breakdown, skill-wise analytics, weak-area identification, trends
* AI feedback with strengths, weaknesses, and improvement suggestions
* Downloadable per-interview and summary PDF reports
* Standalone coding practice module, role-locked by language
* In-app + email notifications and interview reminders

👔 Recruiter
* Candidate performance overview and profiles & reports
* Side-by-side candidate comparison
* Skill-wise analytics and candidate ranking
* Shortlisting insights with score-bar filtering
* Interview template creation and session monitoring

🏛️ Admin
* User & recruiter management, role-based access control
* Live interview activity monitoring
* AI performance monitoring (real usage vs. simulator, per-provider accuracy)
* System health dashboard (DB connectivity, uptime, disk usage)
* Platform-wide usage analytics

🛠️ Tech Stack

Frontend: HTML, CSS, JavaScript, face-api.js, Web Speech API, served via nginx
Backend: Node.js, Express, PostgreSQL, JWT, Passport (Google OAuth)
AI Service: Python, FastAPI, SQLAlchemy, gTTS / pyttsx3, multi-provider AI (Ollama, Gemini, OpenAI, Grok)
Deployment: Docker & Docker Compose, Railway (frontend, backend, AI service, and Postgres each as a separate service)

📁 Project Structure

```
ai-interview-platform/
├── backend/                  # Node.js + Express API
│   ├── controllers/          # Auth, admin, interview, job, resume, notification logic
│   ├── routes/                # API endpoints
│   ├── middleware/            # JWT + role-based auth
│   ├── utils/                  # Resume parsing, activity log, notifications
│   └── db/                     # schema.sql, seed scripts
├── backend-python/            # Python + FastAPI AI service
│   ├── app/
│   │   ├── routers/             # interviews, analytics, coding, notifications, admin
│   │   ├── ai_providers.py       # multi-provider AI fallback chain
│   │   ├── scoring_engine.py      # weighted rubric scoring
│   │   ├── communication_analysis.py
│   │   └── coding_bank.py / judge.py
│   └── tests/
├── frontend/                   # Static HTML/CSS/JS UI
│   ├── admin.html / candidate.html / coach.html / recruiter.html
│   ├── interview-session.html / coding-practice.html
│   └── js/                       # script.js, interview-session.js, coding-practice.js
├── docker-compose.yml
└── README.md
```
