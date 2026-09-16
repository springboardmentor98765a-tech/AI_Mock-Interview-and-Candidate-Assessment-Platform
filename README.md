# 🎯 SmartHire AI — Mock Interview & Candidate Assessment Platform

An AI-powered mock interview platform with real-time behavioral analysis, voice recognition, and multi-dimensional scoring for candidates, recruiters, and admins.

## 🌐 Live Demo
- **Frontend:** [smarthire-ai-orcin.vercel.app](https://smarthire-ai-orcin.vercel.app)
- **Backend:** [smarthireai-mockinterview-platform.onrender.com](https://smarthireai-mockinterview-platform.onrender.com)
- **ML API:** [mock-interview-ml.onrender.com](https://mock-interview-ml.onrender.com)

## ✨ Features

### 🎓 Candidate
- Voice-based mock interviews with AI questions
- Live webcam recording + facial analysis
- Real-time ML confidence detection
- Multi-dimensional scoring (Communication, Confidence, Technical, Professionalism)
- Performance analytics & skill breakdowns
- AI feedback with strengths & improvements
- Downloadable reports (JSON/CSV)
- Email notifications

### 👔 Recruiter
- AI-ranked candidate list
- Side-by-side comparison (2-4 candidates)
- Skill-wise analytics & trends
- Shortlisting workflow
- Top performer identification

### 🏛️ Admin
- User & role management
- Live interview monitoring
- AI model performance tracking
- System health dashboard
- Platform usage analytics

## 🛠️ Tech Stack

**Frontend:** React 18, Bootstrap 5, Chart.js, face-api.js, Axios  
**Backend:** Node.js, Express, PostgreSQL, JWT, Passport (Google OAuth), Nodemailer  
**ML:** Python 3.11, Flask, scikit-learn (Random Forest), joblib  
**Deployment:** Vercel (frontend), Render (backend + ML + DB)

## 📁 Project Structure
AI_Mock_Interview_platform/
├── backend/ # Node.js API + Python ML API
│ ├── routes/ # API endpoints
│ ├── services/ # Business logic
│ ├── models/ # DB models
│ └── ml_models/ # ML API (Flask)
└── internflow-dashboard/ # React frontend
└── src/
├── components/ # React components
└── services/ # API clients
