# SmartHire frontend

The login page uses the Python/FastAPI service in `backend-python/`. It supports email/password registration and login, JWT storage, Google OAuth redirect, profile lookup, and role-based dashboard routing.

## Start locally

1. Use Python 3.10 or newer. PostgreSQL stores the data; Python runs the API.
2. In pgAdmin, run [`backend-python/database/setup.sql`](backend-python/database/setup.sql) while connected to the `postgres` database.
3. Follow the commands in [`backend-python/README.md`](backend-python/README.md) to install dependencies and start the API on port 8000.
4. Start the React app with `npm.cmd run dev`.

The Python service creates the `users` table automatically on first startup. Configure PostgreSQL credentials and a strong JWT secret before running it; do not commit real credentials.
## to run backend
##: uvicorn app.main:app --reload --port 8000