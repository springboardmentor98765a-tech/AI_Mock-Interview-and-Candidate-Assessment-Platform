# SmartHire Python authentication API

This FastAPI service provides the React application's registration, login, JWT-protected profile access, Google OAuth, and role-based authorization.

## Run it

1. Use Python 3.10 or newer. Your installed Python 3.10.11 is compatible.
2. In pgAdmin, create the database by running `database/setup.sql` while connected to `postgres`.
3. Create and activate a virtual environment, install the dependencies, then set the values from `.env.example` as environment variables.

```powershell
cd backend-python
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:DB_USERNAME = 'postgres'
$env:DB_PASSWORD = 'YOUR_PASSWORD'
$env:DB_NAME = 'smarthire1'
$env:JWT_SECRET = 'a-long-random-secret-with-at-least-32-characters'
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`, and the React frontend defaults to `http://localhost:8000/api`.

## Optional Google login

Create OAuth credentials in Google Cloud and add `http://localhost:8000/auth/google/callback` as the authorised redirect URI. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `SESSION_SECRET` before starting the service.
