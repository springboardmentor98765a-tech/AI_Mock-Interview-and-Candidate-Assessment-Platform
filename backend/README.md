# SmartHire AI — Module 1: Authentication & RBAC

FastAPI + PostgreSQL + JWT + Google OAuth2.

## Endpoints

| Method | Path | Access | Purpose |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/register` | public | Validate, reject duplicate email, BCrypt-hash, save |
| POST | `/api/auth/login` | public | Verify credentials, return JWT |
| GET | `/api/auth/google/login` | public | Redirect to Google consent screen |
| GET | `/api/auth/google/callback` | public | Exchange code, upsert user, issue JWT |
| GET | `/api/users/me` | any logged-in | Read own profile |
| PUT | `/api/users/me` | any logged-in | Update name / password (never role) |
| GET | `/api/users` | **ADMIN** | List all users |
| PUT | `/api/users/{id}/role` | **ADMIN** | The only way a role can change |
| GET | `/api/health` | public | Status, DB dialect, whether Google is configured |

Interactive docs once running: <http://localhost:8000/docs>

## Setup

### 1. PostgreSQL

Install from <https://www.postgresql.org/download/> (the EDB installer bundles pgAdmin 4).
During install you set a password for the `postgres` superuser — that is the one you need
later. There is no way to recover it from the app, so write it down.

#### 1a. Know which server you are talking to

If you installed more than one major version, each one runs its **own** server on its
**own port** — 5432 for the first, 5433 for the next, and so on. Connecting to the wrong
port means your database "disappears".

Check which servers are running and on which ports:

```bash
ps aux | grep "[/]bin/postgres"
for p in 5432 5433 5434; do nc -z localhost $p && echo "$p open" || echo "$p closed"; done
```

To find out which version answers on a given port (prompts for the `postgres` password):

```bash
/Library/PostgreSQL/18/bin/psql -h localhost -p 5432 -U postgres -c "select version();"
```

Whichever port replies with the version you intend to use is the port for `DATABASE_URL`.

#### 1b. Create the database

**In pgAdmin 4:**

1. Left sidebar → expand **Servers**. If it asks for a password, that is the `postgres`
   password from installation.
2. If no server is listed: right-click **Servers → Register → Server…**
   - *General* tab → **Name**: anything, e.g. `local`
   - *Connection* tab → **Host**: `localhost`, **Port**: `5432`, **Username**: `postgres`,
     **Password**: yours → tick **Save password** → **Save**
3. Right-click your server → **Create → Database…**
4. **Database**: `smarthire` — leave Owner as `postgres` → **Save**
5. It now appears under *Servers → your server → Databases → smarthire*

**Or from the terminal** (no GUI needed):

```bash
/Library/PostgreSQL/18/bin/createdb -h localhost -p 5432 -U postgres smarthire
```

Verify it exists:

```bash
/Library/PostgreSQL/18/bin/psql -h localhost -p 5432 -U postgres -l | grep smarthire
```

### 2. Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL`:

```
DATABASE_URL="postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:1234/smarthire"
                                    └ user ┘ └ password ┘ └ host ┘ └port┘ └ database ┘
```

> **Check your port — it is probably not 5432.** This machine's PostgreSQL 18 is
> registered on port **1234**, not the default. Confirm with the version query in 1a
> before assuming. Whatever port answers as v18 is the one that belongs here.

> **If your password contains `@ : / # ? %` you must URL-encode it**, or the connection
> string parses wrongly. `P@ss:1` becomes `P%40ss%3A1`. Encodings:
> `@` → `%40`, `:` → `%3A`, `/` → `%2F`, `#` → `%23`, `?` → `%3F`, `%` → `%25`.
> Get it right with:
> `python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" 'YOUR_PASSWORD'`

Also set:

- `JWT_SECRET_KEY` — generate with `openssl rand -hex 32`
- Google keys — see below (optional; the rest of the API works without them)

If `DATABASE_URL` is left unset the app falls back to a local SQLite file, so you can run
everything before Postgres is ready.

### 2a. Confirm the app is really on Postgres

Start the server (step 3), then:

```bash
curl http://localhost:8000/api/health
```

- `"database":"postgresql"` → connected correctly
- `"database":"sqlite"` → `.env` was not picked up; you are still on the fallback

Tables are created on startup. Confirm in pgAdmin under
*smarthire → Schemas → public → Tables* — you should see **users**. Right-click it →
**View/Edit Data → All Rows**. Or:

```bash
/Library/PostgreSQL/18/bin/psql -h localhost -p 5432 -U postgres -d smarthire -c "\d users"
```

### 2b. When it will not connect

| Message | Cause | Fix |
| :--- | :--- | :--- |
| `Connection refused` | Server not running, or wrong port | Check the port with the `nc` loop in 1a |
| `password authentication failed` | Wrong password, or it needs URL-encoding | Re-encode as above |
| `database "smarthire" does not exist` | Created on a different server/port | Check you used the same port in 1b and `.env` |
| `ModuleNotFoundError: psycopg2` | Dependencies not installed in the venv | `source .venv/bin/activate && pip install -r requirements.txt` |
| Health still says `sqlite` | `.env` not in `backend/`, or app started elsewhere | Run `uvicorn` from `backend/` |

### 3. Install and run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Tables are created automatically on startup. For a real deployment, replace that with
Alembic migrations.

### 4. Google OAuth2 (optional)
 2. Add authorised redirect URI: `http://localhost:8000/api/auth/google/callback`
3. Copy the client ID and secret into `.env`

Flow: `/api/auth/google/login` → Google verifies → callback exchanges the code for the
profile → account created on first login (`provider = GOOGLE`, `password = NULL`) →
same JWT as local login → browser redirected back to the frontend.

## Try it

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Div Kumar","email":"div@gmail.com","password":"Password@123","role":"CANDIDATE"}'
```

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"div@gmail.com","password":"Password@123"}'
```

```bash
curl http://localhost:8000/api/users/me -H "Authorization: Bearer <token>"
```

## Design notes

- **Roles** are `CANDIDATE`, `RECRUITER`, `ADMIN` — matching the frontend, which already
  uses these names in its route guards.
- **`ADMIN` cannot be self-registered.** The spec's register payload accepts a role, so
  taking it literally would let anyone POST `"role":"ADMIN"`. Registration is limited to
  `CANDIDATE` and `RECRUITER`; promotion is admin-only via `PUT /api/users/{id}/role`.
- **Role cannot be changed through the profile endpoint** — `UserUpdate` has no role
  field at all, so a client cannot escalate even by sending one.
- **Password is nullable** because Google accounts never set one; `verify_password`
  returns `False` rather than crashing when it is `NULL`.
- **Login errors are deliberately vague** ("Invalid email or password") so the response
  cannot be used to discover which emails are registered.
- **Passwords are capped at 72 bytes**, the BCrypt limit, instead of being silently
  truncated.
- `bcrypt` is pinned to `4.0.1`: passlib 1.7.4 reads `bcrypt.__about__`, which 4.1+ removed.

## Not done yet

The frontend still uses its mocked `AuthContext` and has not been pointed at this API.
Wiring it means replacing `login()` there with a real `POST /api/auth/login` call and
storing the returned JWT.
