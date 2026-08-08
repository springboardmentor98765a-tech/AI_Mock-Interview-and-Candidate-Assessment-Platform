# Module 3 — AI Interview Generation

Generates interview questions with an LLM (local Ollama or Google Gemini),
stores them in PostgreSQL, exposes REST APIs, and runs a **real-time voice
interview** over a WebSocket. Spoken answers are recorded and stored as audio —
the platform performs no speech-to-text or text-to-speech.

Stack: Python · FastAPI · PostgreSQL · SQLAlchemy · Pydantic · JWT · Postman.
No Docker, no cloud services.

---

## The nine features and where each lives

| # | Feature | Where |
|---|---------|-------|
| 1 | HR interview generation | `interview_type=HR` |
| 2 | Technical interview generation | `interview_type=TECHNICAL` |
| 3 | Behavioral generation (works for sales/HR/non-tech) | `interview_type=BEHAVIORAL` |
| 4 | Aptitude generation (MNC-style) | `interview_type=APTITUDE` |
| 5 | Difficulty selection | `difficulty=EASY\|MEDIUM\|HARD` — prompts and the fallback bank are separately written per level |
| 6 | Domain customisation, open/extensible | `domain` is a free-text column, not an enum. Any string works with no code change. `GET /interviews/domains` returns 35 suggestions for a dropdown. |
| 7 | Session creation and management | `status` on `interviews` (CREATED → IN_PROGRESS → COMPLETED / ABANDONED), plus `POST /interviews/start` and `GET /interviews/history` |
| 8 | REST APIs | [`app/api/interviews.py`](app/api/interviews.py) |
| 9 | Real-time voice interviewer | [`app/api/voice.py`](app/api/voice.py) — WebSocket, text questions + recorded answers |

---

## 1. Database setup

The module adds two tables to the existing `smarthire` database. They are created
automatically on startup — no migration step.

```
interviews
  id, user_id → users.id, interview_type, domain, difficulty,
  status, question_count, source, started_at, completed_at,
  created_at, updated_at

interview_questions
  id, interview_id → interviews.id (ON DELETE CASCADE),
  question_text, category, difficulty, sequence_no,
  answer_text, answer_audio_path, answer_audio_mime,
  asked_at, answered_at, skipped_at, created_at
```

`interview_type`, `difficulty`, `status` and `source` are Postgres enums.
`answer_audio_path` / `answer_audio_mime` / `asked_at` / `answered_at` /
`skipped_at` are filled in by the voice interviewer. A question is **answered**
when it has a recording and **not attempted** when `skipped_at` is set — the two
are separate columns so a skip can never be counted as an answer. `answer_text`
is unused for new rows; it still holds transcripts written before answers became
audio. If your database predates these columns, add them with
`python -m scripts.add_answer_audio_columns`.
Deleting an interview deletes its questions.

If you have not created the database yet:

```sql
CREATE DATABASE smarthire;
```

---

## 2. Environment variables

Copy `.env.example` to `.env` and fill in. The ones this module needs:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `postgresql+psycopg2://postgres:PASSWORD@localhost:5432/smarthire` |
| `JWT_SECRET_KEY` | Signs the JWTs. `openssl rand -hex 32` |
| `GEMINI_API_KEY` | **Free, no credit card** — get one at <https://aistudio.google.com/apikey> |
| `GEMINI_MODEL` | Default `gemini-3.1-flash-lite` |
| `AI_PROVIDER` | `ollama` (local, no key) or `gemini` (cloud) |
| `OLLAMA_MODEL` | Default `qwen2.5:7b` |
| `ANSWER_AUDIO_DIR` | Where recorded answers are written. Default `uploads/answers` |
| `MAX_ANSWER_AUDIO_MB` | Per-answer size cap. Default `8` |

**Never commit `.env`** — it is gitignored. `.env.example` holds placeholders only.

### Running without an API key

Leave `GEMINI_API_KEY` blank and every text endpoint still works: generation
falls back to a built-in bank of 96 questions (4 types × 3 difficulties × 8),
with `{domain}` substituted in. The response's `source` field tells you which
path ran — `AI` or `FALLBACK`.

The **voice interviewer needs no key at all** — it delivers questions as text
and stores the candidate's recording as a file. With `AI_PROVIDER=ollama` the
whole module runs with no cloud service of any kind.

---

## 3. Install and run

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

- API: <http://localhost:8000>
- Swagger UI: <http://localhost:8000/docs>
- Health: <http://localhost:8000/api/health>

---

## 4. The endpoints

Every one requires `Authorization: Bearer <JWT>` and only ever returns the
signed-in user's own interviews. Another user's id returns **404**, not 403, so
the response cannot be used to discover which ids exist.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/interviews/generate` | Generate + save questions, return the interview |
| `GET` | `/api/interviews` | List your interviews (filters: `interview_type`, `difficulty`, `status`, `limit`, `offset`) |
| `GET` | `/api/interviews/{id}` | One interview with its questions |
| `PUT` | `/api/interviews/{id}` | Update domain / difficulty / type / status |
| `DELETE` | `/api/interviews/{id}` | Delete it and its questions (204) |
| `POST` | `/api/interviews/start` | Start a session → `IN_PROGRESS` |
| `GET` | `/api/interviews/history` | Past interviews (anything already started) |
| `GET` | `/api/interviews/domains` | 35 suggested domains — the field accepts anything |
| `WS` | `/api/interviews/voice/{id}?token=JWT` | Real-time voice interview |
| `GET` | `/api/interviews/voice/demo` | Browser client for the voice interview |
| `GET` | `/api/interviews/{id}/answers/{seq}/audio` | Play back one recorded answer |

---

## 5. Testing question generation

Get a token, then generate:

```bash
TOKEN=$(curl -s -X POST localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"candidate.demo@smarthire.dev","password":"Candidate@123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -s -X POST localhost:8000/api/interviews/generate \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"interview_type":"TECHNICAL","domain":"backend developer","difficulty":"HARD","question_count":5}' \
  | python3 -m json.tool
```

Look for `"source": "AI"` — `"FALLBACK"` means the key is missing or the call failed
(the reason is logged to the server console).

**To prove feature 6**, pass a domain that appears nowhere in the codebase:

```bash
curl -s -X POST localhost:8000/api/interviews/generate \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"interview_type":"TECHNICAL","domain":"marine biology data analyst","difficulty":"HARD","question_count":3}'
```

Or use Swagger UI at `/docs` — click **Authorize**, paste the token, and use the
form.

---

## 6. Testing the voice interview

The candidate has to answer **out loud**, and what gets stored is the recording
itself — you cannot paste the question into a chatbot and read back an answer.
Nothing is transcribed, so the evidence kept is the candidate's own voice rather
than a machine's guess at it.

### Option A — headless script (no microphone needed)

```bash
python scripts/voice_client.py
```

It logs in, generates an interview, opens the WebSocket, and for each question:
prints the question text, sends a generated WAV tone back as the "recording",
and prints what the server stored. Use `--answer-file me.wav` to send a real
recording instead of the tone.

Useful flags: `--interview-id`, `--type`, `--domain`, `--difficulty`, `--count`,
`--seconds`. Run with `--help` for the full list.

Play a stored answer back:

```bash
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/interviews/7/answers/1/audio -o answer.wav
afplay answer.wav               # macOS
```

### Option B — browser, with a real microphone

Open <http://localhost:8000/api/interviews/voice/demo>

Log in → Generate → Connect → **Next question** (shown as text) → **Hold to
answer**, talk, then **Stop & send**. The log confirms how many bytes were
stored. This is the one to use for a live demonstration.

### The WebSocket protocol

Connect to `ws://HOST/api/interviews/voice/{interview_id}?token=<JWT>`. The token
goes in the query string because browsers cannot set headers on a WebSocket.

```
server → {"type":"ready","interview_id":1,"total":5,"answered":0,"skipped":0, ...}
client → {"type":"next"}
server → {"type":"question","sequence_no":1,"category":"...","text":"..."}
client → {"type":"answer","audio_b64":"<base64>","mime_type":"audio/webm"}
server → {"type":"recorded","sequence_no":1,"bytes":48213,
          "mime_type":"audio/webm","answered":1,"skipped":0,"total":5}
client → {"type":"skip"}          # pass on this one
server → {"type":"skipped","sequence_no":2,"attempted":false,
          "answered":1,"skipped":1,"total":5}
server → {"type":"question", ...}   # the next one, sent unprompted
client → {"type":"end"}           # hang up
server → {"type":"complete","answered":4,"skipped":1,"total":5}
server → {"type":"error","detail":"..."}
```

**Skipping advances the interview by itself** — the client does not send `next`
afterwards. A skipped question is recorded as *not attempted*: it never counts
towards `answered`, and it is not asked again. `next` always serves the
lowest-numbered question that has been neither answered nor skipped, so asking
for `next` while the current question is still open re-serves that same
question.

Close codes: `4401` bad or missing token, `4404` interview not found, `4409` no
questions. Disconnecting mid-interview leaves the session `IN_PROGRESS` —
reconnect and it resumes at the next unanswered question.

---

## 7. Postman

Import `postman/SmartHire_Module3.postman_collection.json`.

1. Run **Auth → Login** first. It saves the JWT into a collection variable, so
   every other request is authenticated automatically.
2. Run **Interviews → Generate**. It saves the new interview id, so the Get /
   Update / Delete / Start requests work without editing anything.

The collection covers all REST endpoints plus examples for each interview type
and a brand-new domain. The voice interviewer is a WebSocket, so it is not in
the collection — use section 6 above.

---

## 8. How the AI provider is wired

[`app/services/ai_provider.py`](app/services/ai_provider.py) is the **only file
that names the vendor**. It exposes two functions:

```python
generate_questions(interview_type=, domain=, difficulty=, count=) -> list[GeneratedQuestion]
extract_resume(resume_text) -> ExtractedResume
```

Both are text-only; there are no speech functions, because the platform stores
recordings rather than converting them. Everything else imports these and never
touches the SDK. Swapping providers means editing that one file — the models, schemas, endpoints and fallback bank
do not change. (This module was built on OpenAI first and moved to Gemini by
editing only this file.)

`generate_questions` uses Gemini's structured output (`response_schema`) so the
reply is schema-validated rather than parsed out of free text. On any failure it
raises `AIUnavailable`, and
[`interview_generator.py`](app/services/interview_generator.py) catches that and
falls back to the bank.

---

## 9. Files added by this module

```
app/models/interview.py              Interview + InterviewQuestion, 4 enums
app/schemas/interview.py             Pydantic request/response models
app/services/ai_provider.py          the only file naming the vendor
app/services/question_bank.py        96-question fallback bank
app/services/interview_generator.py  AI-first, bank-on-failure
app/api/interviews.py                8 REST endpoints
app/api/voice.py                     WebSocket + browser demo page
scripts/voice_client.py              headless voice test client
postman/SmartHire_Module3.postman_collection.json
```
