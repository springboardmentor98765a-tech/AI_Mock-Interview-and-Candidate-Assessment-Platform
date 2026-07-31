# HireAI — AI Recruitment Platform

A role-based AI recruitment platform with full-stack authentication, mock interviews, candidate ranking, and analytics dashboards.

---

## Tech Stack

**Frontend:** React, React Router, Vite, Recharts, Framer Motion  
**Backend:** Node.js, Express.js  
**Database:** PostgreSQL (`ai_recruitment`)  
**Auth:** JWT, bcryptjs, Google OAuth 2.0 (Passport.js)  
**Security:** Helmet, CORS, Rate Limiting, express-validator

---

## Project Structure

```
Role-Based Dashboard System/
├── src/                        # React frontend
│   ├── context/
│   │   └── AuthContext.jsx     # Global auth state, JWT storage
│   ├── services/
│   │   └── api.js              # Centralized fetch with Bearer token
│   ├── pages/
│   │   ├── Login.jsx           # Login with Google OAuth button
│   │   ├── Register.jsx        # New user registration
│   │   ├── OAuthCallback.jsx   # Handles Google OAuth redirect
│   │   ├── Settings.jsx        # Profile, password, preferences
│   │   ├── AdminDashboard.jsx
│   │   ├── RecruiterDashboard.jsx
│   │   ├── StudentDashboard.jsx
│   │   └── MockInterview.jsx
│   └── components/
│       └── DashboardLayout.jsx
├── backend/                    # Express backend
│   ├── server.js               # Entry point
│   ├── .env                    # Environment variables (fill this in)
│   ├── config/
│   │   ├── database.js         # PostgreSQL pool + table init
│   │   └── passport.js         # Google OAuth strategy
│   ├── controllers/
│   │   └── authController.js   # Business logic
│   ├── routes/
│   │   └── authRoutes.js       # API route definitions
│   ├── middleware/
│   │   ├── auth.js             # JWT authenticate + authorize
│   │   ├── validate.js         # express-validator error handler
│   │   └── errorHandler.js     # Centralized error handler
│   ├── models/
│   │   └── userModel.js        # Parameterized DB queries
│   └── utils/
│       └── jwt.js              # generateToken / verifyToken
└── vite.config.js              # Proxies /api → localhost:5000
```

---

## Setup Instructions

### 1. PostgreSQL Database

Make sure PostgreSQL is running. The database must exist:

```sql
CREATE DATABASE ai_recruitment;
```

Tables are created automatically when the backend starts.

---

### 2. Backend Setup

```bash
cd backend
```

Edit `backend/.env` and fill in:

```env
DB_PASSWORD=your_actual_postgres_password

# Optional — only if using Google OAuth:
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

Install dependencies and start:

```bash
npm install
npm run dev       # development (nodemon)
# or
npm start         # production
```

Backend starts on: **http://localhost:5000**

---

### 3. Frontend Setup

```bash
# From the project root
npm install
npm run dev
```

Frontend starts on: **http://localhost:5173**

All `/api` requests proxy automatically to the backend.

---

### 4. Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Set **Authorized redirect URI**: `http://localhost:5000/api/auth/google/callback`
4. Copy Client ID and Secret into `backend/.env`

---

## API Reference

| Method | Endpoint                  | Auth Required | Description              |
|--------|---------------------------|---------------|--------------------------|
| POST   | `/api/auth/register`      | No            | Create new account       |
| POST   | `/api/auth/login`         | No            | Login, returns JWT       |
| GET    | `/api/auth/profile`       | Yes           | Get current user         |
| PUT    | `/api/auth/profile`       | Yes           | Update name/email        |
| PUT    | `/api/auth/password`      | Yes           | Change password          |
| POST   | `/api/auth/logout`        | Yes           | Invalidate session       |
| GET    | `/api/auth/google`        | No            | Start Google OAuth flow  |
| GET    | `/api/auth/google/callback` | No          | Google OAuth callback    |
| GET    | `/api/health`             | No            | Backend health check     |

---

## Roles

| Role       | Dashboard   | Route        |
|------------|-------------|--------------|
| `admin`    | Admin        | `/admin`     |
| `recruiter`| Recruiter    | `/recruiter` |
| `user`     | Candidate    | `/student`   |

---

## Security Features

- Passwords hashed with **bcryptjs** (12 salt rounds)
- JWT signed with secret from environment variable (7-day expiry)
- **Helmet** sets secure HTTP headers
- **Rate limiting**: 200 req/15min global, 20 req/15min on auth routes
- All DB queries use **parameterized statements** (no SQL injection)
- Secrets in `.env` — never hardcoded
- CORS restricted to frontend origin only
