# SmartHire AI – AI-Powered Mock Interview and Candidate Assessment Platform

## 📌 Project Overview

SmartHire AI is an AI-powered mock interview and candidate assessment platform designed to help candidates prepare for technical, HR, behavioral, and aptitude interviews.

The platform provides automated interview simulations, resume analysis, speech-to-text transcription, communication analysis, confidence evaluation, emotion detection, eye-contact monitoring, AI-based scoring, personalized feedback, and performance analytics.

It also provides dedicated dashboards for Candidates, Recruiters, and Administrators.

---

## 🎯 Objective

The main objective of SmartHire AI is to provide an intelligent and interactive interview preparation and assessment environment.

The platform helps candidates:

- Practice AI-driven mock interviews.
- Upload resumes and extract relevant skills.
- Improve communication and speaking skills.
- Monitor confidence, attention, emotion, and eye contact.
- Receive AI-generated interview feedback.
- Understand technical and communication performance.
- Track performance across multiple interviews.
- Identify strengths, weaknesses, and areas for improvement.

The system can support students, job seekers, training institutes, recruitment agencies, universities, and corporate hiring teams.

---

## 🚀 Key Features

### 👤 Candidate Features

- Secure registration and login
- Google OAuth login
- Role-based access
- Resume upload
- AI-based resume skill extraction
- AI-generated interview questions
- Technical and behavioral interview practice
- Webcam and microphone support
- Speech-to-text analysis
- Grammar and filler-word analysis
- Speech pace analysis
- Emotion detection
- Eye-contact tracking
- Attention monitoring
- Confidence evaluation
- Technical relevance evaluation
- Professionalism evaluation
- Overall interview scoring
- Personalized improvement suggestions
- Interview reports
- Interview history
- Performance trends
- Skill-wise analytics
- Interview reminders and alerts

---

### 👔 Recruiter Features

- Recruiter dashboard
- Candidate performance overview
- Candidate ranking
- Candidate comparison
- Skill-wise analytics
- Interview templates
- Interview session management
- Interview recordings
- Recruiter reports
- Interview reminders
- Email notifications

---

### 🛡️ Admin Features

- User management
- Recruiter management
- Interview activity monitoring
- AI performance monitoring
- System health monitoring
- Platform usage analytics
- Role-based administrative access

---

## 🤖 AI & ML Capabilities

SmartHire AI combines multiple AI and machine-learning based components:

- AI-powered interview question generation
- Resume skill extraction
- Speech-to-text transcription
- Communication analysis
- Grammar analysis
- Filler-word detection
- Speech pace analysis
- Emotion recognition
- Eye-contact monitoring
- Attention analysis
- Confidence evaluation
- Technical relevance evaluation
- AI-powered interview scoring
- Personalized feedback generation

---

## 📊 Interview Scoring

The platform uses a weighted scoring model:

| Assessment Area | Weight |
|---|---:|
| Communication | 30% |
| Confidence | 25% |
| Technical Relevance | 30% |
| Professionalism | 15% |
| **Overall Score** | **100%** |

Performance ratings include:

- Excellent
- Good
- Average
- Needs Improvement
- Poor

The assessment considers communication quality, confidence indicators, technical relevance, professionalism, eye contact, attention, engagement, and other interview behavior signals.

---

## 🏗️ System Architecture

The system consists of the following major layers:

### Frontend

Provides interfaces for:

- Candidates
- Recruiters
- Administrators
- Interview sessions
- Dashboards
- Reports
- Analytics

### Backend

The backend provides REST APIs for:

- Authentication
- User management
- Resume management
- AI services
- Interview sessions
- Interview analysis
- Reports
- Notifications
- Analytics

### AI / ML Services

Handles:

- Question generation
- Speech processing
- Emotion detection
- Eye-contact tracking
- Confidence analysis
- Interview assessment

### Database

PostgreSQL is used to store:

- User information
- Resumes
- Interview sessions
- Interview answers
- Communication analysis
- Interview behavior analysis
- Interview recordings
- Interview templates

---

## 🛠️ Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript
- MediaPipe Face Mesh
- Web Speech API

### Backend

- Node.js
- Express.js
- REST API
- JWT Authentication
- Google OAuth
- bcryptjs

### Database

- PostgreSQL

### AI / ML

- Gemini AI
- Python
- Flask
- CNN-based emotion recognition
- RAF-DB emotion dataset
- MediaPipe Face Mesh

### Email & Notifications

- Gmail / SMTP based email notifications

### Deployment

- GitHub
- Render
- Vercel

---

## 🔐 Security

SmartHire AI implements security mechanisms including:

- JWT-based authentication
- Role-based access control
- Password hashing using bcrypt
- Google OAuth authentication
- Protected API routes
- Admin-only operations
- Recruiter and candidate authorization

---

## 📈 Performance Metrics

The system can be evaluated using the following performance areas:

### Interview Analysis Performance

- Speech transcription accuracy
- Emotion recognition accuracy
- Eye-contact tracking accuracy
- Confidence assessment accuracy

### AI Scoring Performance

- Communication scoring accuracy
- Technical relevance evaluation accuracy
- Feedback quality consistency
- Candidate assessment reliability

### Analytics Performance

- Dashboard response time
- Report generation performance
- Data processing efficiency

### System Performance

- API response time
- Concurrent interview session handling
- Database query optimization

---

## 🎯 Example Quantitative Goals

### Interview Analysis

Achieve accurate speech transcription and interview behavior monitoring.

### AI Assessment

Generate reliable communication, confidence, and technical evaluation scores.

### Feedback Generation

Provide actionable and personalized interview improvement recommendations.

### Platform Performance

Support multiple concurrent interview sessions with stable performance and real-time analytics.

---

## 📂 Project Structure

```text
SmartHire-AI/
│
├── ml/
│   └── Emotion Detection ML Service
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── db.js
│   ├── server.js
│   └── .env
│
├── index.html
├── login.html
├── candidate.html
├── recruiter.html
├── admin.html
├── style.css
├── dashboard.css
├── script.js
│
├── package.json
├── package-lock.json
└── README.md
