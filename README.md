# HireAI - Role-Based AI Recruitment Platform

A modern, responsive AI-powered recruitment platform with role-based dashboards for Admin, Recruiter, and Candidate users. Built with React as an internship project demonstrating frontend capabilities.

## Features

### Core Features
- Landing page with platform overview
- Dummy login system with role selection
- 3 role-based dashboards (Admin, Recruiter, Candidate)
- Protected routes with role-based access control
- Responsive design for all screen sizes
- Settings page with profile, notifications, and theme options
- OAuth 2.0 and JWT research pages

### Admin Dashboard
- Platform analytics with interactive charts
- User management table with status badges
- System health monitoring (API, CPU, Storage, Server, Uptime)
- Platform settings configuration
- AI configuration panel
- Recent activity feed

### Recruiter Dashboard
- Candidate performance analytics with radar charts
- Applicant ranking system with AI recommendations
- Interview analytics with line charts
- Candidate reports with view/download options
- Quick actions panel
- Color-coded ranking badges (Highly Recommended, Recommended, Needs Review, Not Recommended)

### Candidate Dashboard
- Welcome banner with interview countdown
- Performance tracking with area charts
- Upcoming interviews list
- Resume analysis with skill matching
- AI feedback scores
- Mock interview access
- Quick actions panel

### AI Mock Interview
- Interview timer
- Question navigation with progress tracking
- Video preview placeholder
- Microphone and camera controls
- AI feedback with radar chart scoring
- Interview integrity analysis (using OpenAI Whisper concept)
- Risk assessment report

## Technologies Used

- React 18
- React Router v6
- Vite (build tool)
- Recharts (data visualization)
- Lucide React (icons)
- Framer Motion (animations)
- Plain CSS (no frameworks)

## Installation

1. Clone or download the project

2. Navigate to the project directory:
```bash
cd Role-Based Dashboard System
```

3. Install dependencies:
```bash
npm install
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and go to `http://localhost:5173`

## How to Run

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run preview` - Preview production build

## Folder Structure

```
src/
├── components/
│   ├── DashboardLayout.jsx
│   └── Sidebar.jsx
├── pages/
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── AdminDashboard.jsx
│   ├── StudentDashboard.jsx
│   ├── RecruiterDashboard.jsx
│   ├── MockInterview.jsx
│   ├── Settings.jsx
│   ├── OAuthInfo.jsx
│   ├── JWTInfo.jsx
│   └── NotFound.jsx
├── styles/
│   ├── global.css
│   ├── layout.css
│   ├── home.css
│   ├── login.css
│   ├── mock-interview.css
│   ├── settings.css
│   ├── infopage.css
│   └── notfound.css
├── App.jsx
└── main.jsx
```

## Login Credentials

This project uses dummy authentication. Any email and password will work as long as the fields are not empty. Select a role from the dropdown to access the corresponding dashboard.

- Roles available: Admin, Candidate, Recruiter
- Login data is stored in localStorage (isLoggedIn, role)

## AI Features (Frontend Simulation)

This project demonstrates AI recruitment concepts through frontend-only simulations:

- Candidate ranking with weighted scoring (Resume + Interview + AI Score)
- AI recommendation badges based on overall scores
- Mock interview with timed questions and feedback
- Interview integrity analysis concept (OpenAI Whisper integration placeholder)
- Resume skill matching and gap analysis
- Performance analytics and trend tracking

## Future Improvements

- Integrate real backend with Node.js/Express
- Implement OAuth 2.0 for social login (Google, GitHub)
- Add JWT-based authentication
- Connect to a database (MongoDB/PostgreSQL)
- Integrate actual OpenAI Whisper API for speech-to-text
- Add real-time notifications with WebSockets
- Implement actual AI scoring with ML models

## OAuth 2.0 Summary

OAuth 2.0 is an authorization framework that allows third-party apps to access user resources without sharing credentials. It uses tokens instead of passwords and supports flows like Authorization Code Flow. In a production version of this app, OAuth would enable social login functionality.

## JWT Summary

JWT (JSON Web Token) is a compact token format for securely transmitting information between parties. It consists of three parts: Header, Payload, and Signature. JWTs are stateless, self-contained, and widely used for API authentication. In a production version of this app, JWT would replace the localStorage-based dummy authentication.
