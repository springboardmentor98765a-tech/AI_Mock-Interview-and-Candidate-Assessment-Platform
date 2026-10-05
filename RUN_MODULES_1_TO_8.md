# Running SmartHire AI — Modules 1 to 8

## Option A — Docker Compose (recommended)

### Requirements
- Docker Desktop
- Docker Compose (included with current Docker Desktop)

### Steps

1. Open a terminal in this project folder.
2. Copy `.env.example` to `.env`.
   - Windows PowerShell: `Copy-Item .env.example .env`
   - CMD: `copy .env.example .env`
3. Open `.env` and add an AI provider key if you want real AI question generation/evaluation. Gemini is the primary provider configured by the project.
4. Run:

   `docker compose -f docker-compose.module8.yml up --build`

5. Open:
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:8000
   - Swagger API docs: http://localhost:8000/docs

6. To stop everything:

   `docker compose -f docker-compose.module8.yml down`

## Option B — Run without Docker

### Backend

1. Install Python 3.11+.
2. Open a terminal in `backend`.
3. Create and activate a virtual environment.
4. Install dependencies:

   `pip install -r requirements.txt`

5. From the project root, keep `.env` configured with `USE_SQLITE=true` for the simplest local database setup.
6. Start the backend from the `backend` folder:

   `uvicorn app.main:app --reload --port 8000`

7. Check http://localhost:8000/docs.

### Frontend

1. Open a second terminal in `frontend`.
2. Install packages:

   `npm install`

3. Start Vite:

   `npm run dev`

4. Open http://localhost:3001.

## First demo flow

1. Open the frontend.
2. Create a candidate account.
3. Sign in.
4. Open Resume Analyzer and upload a PDF resume.
5. Configure an AI interview.
6. Enter the interview lobby and allow camera/microphone access when prompted.
7. Complete the interview workflow.
8. Open Results/Reports/Analytics to view scoring and performance information.

## If AI generation does not work

The application can still start without an AI key, but AI-backed functions may return provider/configuration errors. Add a valid provider key to `.env` and restart the backend/container.

## Database

Docker Compose uses PostgreSQL and Redis. Local non-Docker development can use the project's SQLite fallback by leaving `USE_SQLITE=true`.
