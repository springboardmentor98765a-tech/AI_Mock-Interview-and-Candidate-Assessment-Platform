# Deployment Guide

## Local / self-hosted (Docker Compose) — fully ready

1. `cp backend/.env.example backend/.env` and fill in real values
   (JWT_SECRET, Google OAuth credentials, AI provider keys — Ollama/
   Gemini/OpenAI/Grok, all optional except one).
2. `cp backend-python/.env.example backend-python/.env` — make sure
   `JWT_SECRET` is **identical** to the one in `backend/.env`.
3. `cp .env.example .env` (this root folder) and set `DB_PASSWORD` to
   something real. This is the ONLY file that controls the actual
   Postgres container's password under Docker — `docker-compose.yml`
   forces `backend` and `backend-python` to use these same values too,
   so the `DB_*` lines inside their own `.env` files are ignored when
   running via Docker (they only matter if you run those services
   directly on your machine instead, per the manual setup further
   down).
4. `docker compose up --build`
5. Visit http://localhost:5500

The database schema loads automatically on first run (Postgres runs
`backend/db/schema.sql` itself via its init-scripts mechanism), and the
default admin account (`admin@gmail.com` / `admin123`) seeds itself on
every backend startup — no manual `npm run seed` step needed under
Docker.

> **If you change `backend/db/schema.sql` later**: Postgres only runs
> init scripts the *first* time its data volume is created, so a schema
> change won't apply to an already-running stack. Run
> `docker compose down -v` (this deletes all data) then
> `docker compose up --build` again to pick it up.

This starts Postgres, the Node API (port 5000), the Python AI service
(port 8001), and the static frontend (port 80 -> host 5500) together.

> **Not yet validated in this environment**: I don't have a Docker
> daemon available where I built this, so the Dockerfiles/compose file
> are correct by inspection (standard, minimal patterns matching each
> service's actual entrypoint and port) but I have not run
> `docker compose up` myself end-to-end. Run it once locally before
> trusting it for anything important, and open an issue in your own
> notes if a base-image version needs bumping.

## Cloud deployment (AWS / Azure / Render / Vercel)

This is a genuine decision point I can't make for you — it needs your
cloud account and credentials, which I don't have access to. What I
can tell you concretely from the code:

- **Frontend** is a fully static site (plain HTML/CSS/JS, root-relative
  asset paths) — deployable as-is to Vercel, Netlify, or any static
  host / S3+CloudFront bucket. No build step required.
- **Node backend** (`backend/`) and **Python backend**
  (`backend-python/`) are two separate services that must both be
  reachable by the frontend and must share the same `JWT_SECRET` and
  the same Postgres database. Deploy them as two separate
  services/containers (e.g. two Render web services, two ECS tasks,
  or two Azure App Services) — not one.
- Before deploying anywhere other than localhost, update
  `frontend/js/script.js`'s hardcoded `API_BASE_URL` and
  `PY_API_BASE_URL` (currently `http://localhost:5000/api` and
  `http://localhost:8001/api`) to your real backend URLs, and update
  `FRONTEND_URL` in both backend `.env` files to your real frontend
  URL (it's used for CORS).
- A managed Postgres instance (RDS, Azure Database for PostgreSQL,
  Render Postgres, Supabase, etc.) works as-is — both services already
  read `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` from env.

### Railway: persist interview recordings

The Python service writes completed webcam recordings to its local filesystem.
Railway's normal service filesystem is ephemeral, so a deployment or restart
would otherwise remove every saved `.webm` file even though the interview row
remains in Postgres.

For the Python service (`aimock-interview-production`):

1. In **Railway → Service → Volumes**, create a volume and mount it at
   `/app/recordings`.
2. Add the service variable `RECORDINGS_DIR=/app/recordings`.
3. Redeploy the Python service.

New recordings will then survive restarts and deployments. Recordings that
were already removed from the ephemeral filesystem cannot be recovered from
the database, which stores only their filename.

## CI

`.github/workflows/ci.yml` runs the Jest suite (`backend/`), the
Pytest suite (`backend-python/`), and a Docker build check on every
push/PR to `main`. Push this repo to GitHub and it runs automatically
— no extra setup needed beyond having the repo on GitHub.
