# SmartHire — AI-Powered Interview Platform

SmartHire is a full-stack AI-powered interview platform.  
**Frontend**: React 19 + Vite | **Backend**: FastAPI (Python) | **Database**: PostgreSQL

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Recharts, Lucide React |
| Backend | FastAPI, Uvicorn, asyncpg, Python-Jose, Passlib |
| Database | PostgreSQL 15+ |

---

## ✅ Prerequisites

Install the following before you begin:

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | v18 or higher | [nodejs.org](https://nodejs.org/) |
| **Python** | v3.11 or higher | [python.org](https://python.org/) |
| **PostgreSQL** | v15 or higher | [postgresql.org](https://www.postgresql.org/download/) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

Verify your installations:

```bash
node -v
python --version
psql --version
git --version
```

---

## 🗄️ Step 1 — Database Setup

### 1.1 Start PostgreSQL

Make sure your PostgreSQL service is running. Open **pgAdmin** or use the command line.

### 1.2 Create the Database

Open a terminal and run:

```bash
psql -U postgres
```

Inside the PostgreSQL shell, run:

```sql
CREATE DATABASE smarthire;
\q
```

### 1.3 Apply the Schema

From the project root, run:

```bash
psql -U postgres -d smarthire -f Database/schema.sql
```

### 1.4 (Optional) Seed Sample Data

```bash
psql -U postgres -d smarthire -f Database/seed.sql
```

---

## ⚙️ Step 2 — Backend Setup

### 2.1 Navigate to the backend folder

```bash
cd backend
```

### 2.2 Create a Python virtual environment

```bash
python -m venv venv
```

Activate it:

- **Windows:**
  ```bash
  venv\Scripts\activate
  ```
- **macOS / Linux:**
  ```bash
  source venv/bin/activate
  ```

### 2.3 Install Python dependencies

```bash
pip install -r requirements.txt
```

### 2.4 Configure environment variables

The `.env` file is already present in the `backend/` folder. Open it and verify/update these values:

```env
PORT=5000
DATABASE_URL=postgresql://postgres@localhost:5432/smarthire
JWT_SECRET=smarthire_jwt_super_secret_key_2026_change_in_production
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
```

> ⚠️ Change `DATABASE_URL` if your PostgreSQL username or password differs.  
> Example with password: `postgresql://postgres:yourpassword@localhost:5432/smarthire`

### 2.5 Start the Backend Server

```bash
python main.py
```

You should see:

```
[SmartHire] API starting...
[SmartHire] PostgreSQL connected successfully
INFO:     Uvicorn running on http://0.0.0.0:5000
```

API docs available at:
- Swagger UI → `http://localhost:5000/api/docs`
- ReDoc → `http://localhost:5000/api/redoc`

---

## 🖥️ Step 3 — Frontend Setup

Open a **new terminal** (keep the backend running).

### 3.1 Navigate to the frontend folder

```bash
cd frontend
```

### 3.2 Install Node dependencies

```bash
npm install
```

### 3.3 Configure environment variables

The `.env` file is already present in the `frontend/` folder. Verify it points to your backend:

```env
VITE_API_URL=http://localhost:5000
```

> If the file does not exist, create `frontend/.env` and add the line above.

### 3.4 Start the Frontend Dev Server

```bash
npm run dev
```

You should see:

```
  VITE v8.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 🚀 Step 4 — Open the Application

Open your browser and go to:

```
http://localhost:5173
```

The SmartHire platform is ready to use. 🎉

---

## 📋 Running Order Summary

> Always start services in this order:

| # | Service | Command | URL |
|---|---------|---------|-----|
| 1 | PostgreSQL | Start via pgAdmin or system service | — |
| 2 | Backend | `uvicorn main:app --port 5000 --reload` (inside `backend/`) | `http://localhost:5000` |
| 3 | Frontend | `npm run dev` (inside `frontend/`) | `http://localhost:5173` |

---

## 🗂️ Project Structure

```
SmartHire/
├── Database/
│   ├── schema.sql          # Database tables and triggers
│   ├── seed.sql            # Sample seed data
│   └── migrations/         # Future migration scripts
├── backend/
│   ├── app/                # FastAPI application modules
│   ├── main.py             # Application entry point
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Backend environment variables
└── frontend/
    ├── src/
    │   ├── components/     # Reusable React components
    │   ├── assets/         # Images and media
    │   ├── styles/         # CSS files
    │   ├── App.jsx         # Root component
    │   └── main.jsx        # Entry point
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── .env                # Frontend environment variables
```

---

## 🔧 Troubleshooting

**PostgreSQL connection refused?**
- Make sure the PostgreSQL service is running.
- Check that `DATABASE_URL` in `backend/.env` has the correct username and password.

**Backend won't start?**
```bash
# Make sure venv is activated, then reinstall
pip install -r requirements.txt
```

**Frontend port already in use?**
```bash
npm run dev -- --port 3000
```

**npm install fails?**
```bash
npm cache clean --force
npm install
```

**Python not found on Windows?**
- Ensure Python is added to PATH during installation, or use `py` instead of `python`.

---

## 📦 Available Scripts

### Backend

| Command | Description |
|---------|-------------|
| `uvicorn main:app --port 5000 --reload` | Start backend with hot reload |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend dev server |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build |
| `npm run lint` | Run Oxlint code checks |
