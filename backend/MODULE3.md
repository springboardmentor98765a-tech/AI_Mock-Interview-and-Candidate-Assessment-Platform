# Module 3 — AI Interview Generation

Generates interview questions with an LLM (local Ollama or Google Gemini),
stores them in PostgreSQL, exposes REST APIs, and runs a **real-time voice
interview** over a WebSocket. Spoken answers are recorded and stored as audio,
then transcribed and analysed (Module 5). Questions are delivered as text —
there is no text-to-speech, so speech conversion runs one way only.

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
  answer_duration_seconds, analysis, analyzed_at,
  asked_at, answered_at, skipped_at, created_at
```

`interview_type`, `difficulty`, `status` and `source` are Postgres enums.
`answer_audio_path` / `answer_audio_mime` / `asked_at` / `answered_at` /
`skipped_at` are filled in by the voice interviewer. A question is **answered**
when it has a recording and **not attempted** when `skipped_at` is set — the two
are separate columns so a skip can never be counted as an answer. `answer_text`
holds the transcript, written **alongside** the recording rather than instead of
it — the audio stays the primary record, so the transcript can always be checked
against what was said. `answer_duration_seconds` is measured speaking time from
the browser, not the asked-to-answered interval, because that would include
thinking time and make words-per-minute meaningless. `analysis` is the Module 5
JSON for that answer.

If your database predates these columns, add them with
`python -m scripts.add_answer_audio_columns` then
`python -m scripts.add_session_analysis_columns`. Both are safe to re-run.
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
| `POST` | `/api/interviews/{id}/recording` | Upload the session webcam video (multipart) |
| `GET` | `/api/interviews/{id}/recording` | Play it back — **candidate only** |
| `GET` | `/api/interviews/{id}/session` | Full session record + live clock |
| `POST` | `/api/interviews/{id}/pause` | Stop the clock |
| `POST` | `/api/interviews/{id}/resume` | Pick it back up |
| `POST` | `/api/interviews/{id}/end` | Finish deliberately, answered or not |
| `GET` | `/api/interviews/{id}/analysis` | Per-answer communication analysis + session roll-up |

---

## Modules 4 and 5 — session timing and communication analysis

### Session lifecycle

```
CREATED ──start──> IN_PROGRESS ──end──> COMPLETED
                       │  ▲
                  pause│  │resume
                       ▼  │
                    PAUSED ──end──> COMPLETED
```

Every illegal transition is a 409 with a message naming the actual state, and
each guard earns its place:

- **Double pause is refused**, not ignored. A second pause would reset
  `paused_at` and silently discard the time already accumulated.
- **A paused interview cannot be restarted** — `start` would reset `started_at`
  and re-snapshot the countdown. Resume is the only way back.
- **`end` is idempotent** from COMPLETED, keeping the original `completed_at`,
  so a double-click or a client retry is not an error.
- **Ending early leaves questions unanswered** — not skipped, not back-filled.
  "Ran out of time on question 6" and "passed on question 6" are different facts
  about a candidate and ending must not merge them.

While paused, the socket refuses `next`, `answer` and `skip`: otherwise a
candidate could read ahead on a stopped clock. `end` still works, so someone who
steps away and decides not to come back need not resume just to stop.

`total_paused_seconds` accumulates on every resume. Without it, pausing would
be a way to buy unlimited thinking time while the countdown quietly kept
running, and the elapsed clock would report time the candidate did not spend
interviewing.

> **Fixed here:** the socket's `end` action used to send `{"type":"closed"}` and
> break the loop **without setting any terminal status**. A candidate who
> stopped early stayed `IN_PROGRESS` for ever — in their history, in the
> recruiter's live-sessions list and in every count. `end` now sets COMPLETED
> and stamps `completed_at`.

If your database predates the pause columns, run
`python -m scripts.add_session_pause_columns`. It adds `PAUSED` to the Postgres
enum (which needs `ALTER TYPE`, so it runs on an autocommit connection) and is
safe to re-run.

### Recordings

Two different artefacts, stored differently because they are used differently:

| | Where | Scope |
| :--- | :--- | :--- |
| Answer audio | `InterviewQuestion.answer_audio_path` | one per question — drives the per-answer analysis |
| Session video | `interview_recordings` | one per interview |

Both follow the same storage rules as résumés: a server-chosen `uuid4`
filename (never the client's, which could be `../../etc/passwd`), a size cap
enforced **while streaming** so an oversized upload is stopped mid-flight, and
a content check against the file's magic bytes rather than its `Content-Type`,
which is client-supplied and trivially spoofed.

Video goes over multipart HTTP rather than the interview WebSocket: a
ten-minute recording is tens of megabytes, and base64 over the socket would
inflate it by a third and stall the interview while it transferred.

Re-uploading **replaces** the previous recording and deletes its file. A
candidate who re-records should not silently accumulate copies of their own
face on disk.

#### Who can play a recording back

**Only the candidate who recorded it.** Recruiters and administrators get a
404 — the same response as for a recording that does not exist, so the endpoint
does not confirm one is there.

This is narrower than the module spec's *"allow authorized users to access
recordings"*, and the gap is deliberate: widening it means deciding who may
replay a candidate's face and voice, which is a policy decision rather than a
coding one. `TestPlayback.test_only_the_candidate_can_play_it_back` is the test
to change if that policy changes.

#### The access log

Every successful playback — audio or video — writes a row to
`recording_accesses`: who, which interview, which artefact, when. Two
properties that are easy to get wrong and are covered by tests:

- **A refused request is not an access.** The log is written after the bytes
  are known to exist and the caller is known to be allowed them, so a 404 never
  appears as though someone had listened.
- **Deleting an interview does not delete its access log.** The rows carry a
  plain `interview_id`, not a foreign key, precisely so that a cascade cannot
  erase the record of who had already viewed a recording. Deleting the evidence
  along with the thing it is evidence about would defeat the point of keeping it.

`user_id` is `ON DELETE SET NULL` for the same reason: deleting a user weakens
the record but must not erase it.

### The session record

`GET /interviews/{id}/session` returns the stored session in one payload:

| Field | Source |
| :--- | :--- |
| `candidate_id` · `interview_id` | stored |
| `session_id` | stored — an opaque UUID, not the row id |
| `started_at` · `ended_at` | stored |
| `duration_seconds` | **stored**, stamped at the moment the interview ends |
| `elapsed_seconds` · `remaining_seconds` · `overrun_seconds` | derived, live |
| `status` · `paused_seconds` | stored |
| `video_recording` · `audio_recordings` | stored references, with playback URLs |
| `questions_attempted` / `skipped` / `unanswered` | derived from the question rows |

**Why `session_id` is a UUID.** One interview is one session, so it identifies
the same run as `id` — but `id` is sequential, and a sequential identifier in a
URL or a log tells anyone who sees it roughly how many interviews the platform
has ever run and invites guessing at the neighbours. The UUID tells them
nothing.

**Why `duration_seconds` is stored rather than always derived.** It *is*
derived — `completed_at - started_at - total_paused_seconds` — but only once,
at the end. A finished interview's duration is a fact about the past, and a
stored fact does not move if the formula is later corrected or if the paused
total is adjusted. It stays null while the interview runs: there is no duration
until there is an end, and zero would claim otherwise.

**Three different "times" that are easy to confuse**, kept deliberately apart:

| | Means |
| :--- | :--- |
| `answer_duration_seconds` | how long the candidate **spoke** — pace is computed from this |
| `time_on_question_seconds` | asked → answered, **including reading and thinking** |
| `duration_seconds` | the whole session, **excluding** paused time |

Reporting any one as another would be wrong in a different direction each time.

`remaining_seconds` is computed server-side. The browser counts down for
responsiveness, but a countdown owned by the candidate's own machine is not a
measurement — this endpoint is the figure the server stands behind. It floors
at zero, with overrun reported separately, so no caller can accidentally treat
"over time" as negative time remaining.

### The timed workflow (Module 4)

`PlatformSettings.session_minutes` is a whole-interview budget. It is divided
across the questions at `POST /interviews/start` and **snapshotted** onto the
interview as `question_seconds`, which is what the candidate's countdown reads.
Snapshotting is the point: an administrator saving a new session length must not
change the time remaining for someone already answering. Connecting straight to
the WebSocket without calling `/start` sets it the same way, once.

Expiry is **soft**. The countdown runs to zero and then shows the overrun; the
recording is never cut off. Truncating someone mid-sentence measures their
reflexes rather than their answer.

Webcam capture is deliberately **browser-only**: previewed, optionally recorded
so the candidate can watch themselves back, never uploaded, and discarded when
the page is left. There is no server-side video storage and no endpoint that
would accept any — storing biometric footage of candidates is a decision with
consent and retention consequences, and it is not one this module makes quietly.

### What Module 5 reports

| | Kind | Source |
| :--- | :--- | :--- |
| Filler counts | **measured** | Word matching over the transcript |
| Speaking pace (wpm) | **measured** | Words ÷ measured speaking time |
| Grammar issues | assessed | AI, quoting the candidate's own words |
| Clarity / structure / conciseness | assessed | AI |
| Pronunciation | assessed | AI listening to the recording |

There is **no score anywhere**, and none is coming from this endpoint. Scoring a
candidate is a separate module with its own rubric.

Two honesty details worth knowing:

**Filler words are split in two.** `um`, `uh`, `er` and friends are counted —
there is no sentence in which "um" carries meaning. Words like *like*, *so*,
*actually* and *well* are reported **separately and never counted as fillers**,
because each is also an ordinary word: "I like Python" is not filler use, and a
naive counter would hand the candidate a number that is simply wrong.

**Pace needs a real duration or it is withheld.** Words-per-minute is computed
against `answer_duration_seconds` — measured speaking time — not the interval
between asking and answering, which also contains thinking time. No duration
means no pace, rather than a plausible invented one.

### The confabulation guard

The speech model **invents transcripts**. Handed a recording it cannot make out —
a short clip, silence, background noise — it returns a fluent, plausible
interview answer that nobody said. This was verified against a real 8 KB
recording: three runs produced three entirely different "answers", and it still
happened at `temperature=0` with a prompt explicitly offering a `NO_SPEECH`
escape.

Prompting does not fix this, so the guard is arithmetic the model cannot talk
its way around. `speech_analysis.transcript_is_plausible()` checks the word
count against the recording's measured length and discards anything implying
more than 300 words per minute — faster than anyone speaks. A transcript that
cannot be checked at all, because no duration was supplied, is also refused.

The recording is never affected. A discarded transcript costs you the transcript
and the analysis; the answer itself is on disk either way, which is exactly why
audio remains the primary record.

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
The transcript sits beside the recording rather than replacing it, so the
evidence kept is the candidate's own voice and the machine's reading of it can
always be checked against the original.

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
client → {"type":"answer","audio_b64":"<base64>","mime_type":"audio/webm",
          "duration_seconds":42.5}
server → {"type":"recorded","sequence_no":1,"bytes":48213,"analysis_pending":true,
          "mime_type":"audio/webm","answered":1,"skipped":0,"total":5}
server → {"type":"analysis","sequence_no":1,"transcript":"...","fillers":{...},
          "pace":{...},"communication":{...},"pronunciation":{...}}
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
analyse_communication(question=, transcript=) -> CommunicationAssessment
```

Those three are text and follow `AI_PROVIDER`. The two that read the recording
do not:

```python
speech_to_text(audio, mime_type=) -> str
assess_pronunciation(audio, mime_type=) -> PronunciationNotes
```

They always go to Gemini, because Ollama serves no speech models. Routing them
by `AI_PROVIDER` would mean transcription silently stopped working the moment
you switched to local text generation, so the facade sends them explicitly.
Everything else imports these and never touches the SDK. Swapping providers means editing that one file — the models, schemas, endpoints and fallback bank
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
